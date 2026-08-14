---
title: "BIO、NIO、直接内存与零拷贝"
sidebarGroup: "Netty"
shortTitle: "02 BIO/NIO 与零拷贝"
order: 2
date: 2026-10-31
category: "中间件"
tag:
  - "Netty"
  - "中间件"
  - "网络"
---

> **Netty 系列 · 第 2/8 篇**  
> 上一篇：[《网络通信与 TCP/IP 协议基础》](/中间件/netty/netty-01-tcpip) · 下一篇：[《深入 Linux epoll 事件轮询》](/中间件/netty/netty-03-epoll)

---

## 开头：从「一个连接一个线程」到 Reactor

微服务拆分后，单机要扛成千上万长连接。传统 **BIO**「来一个连接开一个线程」在并发上来后线程数爆炸、CPU 上下文切换拖垮性能；**NIO + Reactor** 用少量线程 multiplex 多个 Channel，才是 Netty 选型的根源。

本篇覆盖 Socket 常识、BIO/NIO 对比、Reactor 模式、Buffer/直接内存，以及**一次 Web 请求的完整网络旅程**（补充阅读），并引出零拷贝。

![Socket 是应用层与 TCP/IP 之间的抽象](/中间件/netty/32a/p01-01.png)

---

## 一、Socket 与长短连接

- **Socket**：操作系统提供的网络编程门面，隐藏 TCP/IP 细节。
- **ServerSocket**：绑定 IP/端口、监听；具体读写由 accept 后产生的 **Socket** 完成。
- **短连接**：HTTP/1.0 常见，一次请求结束即断连。
- **长连接**：连接保持复用，数据库、HTTP/1.1+、HTTP/2/3 倾向长连接；选型看频率与资源。

![网络编程通用常识：连接、读、写](/中间件/netty/32a/p02-01.png)

---

## 二、BIO：阻塞 I/O 与线程池

BIO 中 `ServerSocket.accept()` 和 `socket.read()` 都会**阻塞**当前线程。

![BIO 阻塞体现在 accept 与 read](/中间件/netty/32a/p03-01.png)

典型模型：独立 Acceptor 线程 + 每连接一线程（或线程池伪异步）。连接数与线程数近似 1:1，线程是宝贵资源，连接上千后性能急剧下降。

![BIO 一请求一线程模型](/中间件/netty/32a/p04-01.png)

用 `FixedThreadPool` 可限制线程上限（N:M），但读慢时其他连接仍要排队等待——**伪异步**。

![线程池改进 BIO](/中间件/netty/32a/p05-01.png)

**RPC 背景**：业务拆分到多机后，本地方法调用变成远程调用。RPC 封装序列化、网络传输、代理，对现有代码侵入小；Dubbo 基于 TCP，gRPC 基于 HTTP/2——RPC 与 HTTP 是不同层次的概念。

RPC 解决的是「像调本地方法一样调远程服务」：客户端 Stub 序列化参数 → 网络传输 → 服务端 Skeleton 反序列化并执行 → 结果原路返回。相比 REST，RPC 通常二进制协议、长连接、性能更高，适合内部服务间高频调用。

---

## 三、NIO 三大件与 Reactor

NIO（New/Non-blocking IO）核心差异：

| 维度 | BIO | NIO |
|------|-----|-----|
| 数据访问 | 面向流 | 面向 Buffer |
| 阻塞 | 读写阻塞线程 | 非阻塞，就绪再处理 |
| 线程模型 | 一连接一线程 | Selector 多路复用 |

三大组件：**Selector**（选择器）、**Channel**（通道）、**Buffer**（缓冲区）。

![NIO Reactor 生活类比](/中间件/netty/32a/p08-01.png)

![Selector、Channel、Buffer 关系](/中间件/netty/32a/p09-01.png)

![Channel 注册与 interest 集合](/中间件/netty/32a/p09-02.png)

Channel 必须**非阻塞**才能注册 Selector；interest 用位掩码：`OP_READ | OP_WRITE`。

`selector.select()` 阻塞直到至少一个 Channel 就绪；返回后遍历 `selectedKeys`，对每个 key 检查 `isAcceptable()`/`isReadable()`/`isWritable()` 并处理。**SelectionKey** 绑定 Channel 与 interest 集合，处理完毕需 `keyIterator.remove()` 避免重复处理。

服务端 Channel 注册 `OP_ACCEPT`，已 accept 的 SocketChannel 注册 `OP_READ`（写就绪通常由读触发）；客户端连接后注册 `OP_CONNECT` 或 `OP_READ`。

### Reactor 演进

1. **单线程 Reactor**：accept/read/write 全在一个线程——简单，业务重时会拖慢 I/O。
2. **单 Reactor + 线程池**：I/O 在 Reactor，业务丢线程池。
3. **主从 Reactor**：main 只 accept，sub 池处理 read/write——高并发标配，Netty `boss`/`worker` 即此模型。

单线程 Reactor 中，accept、read、decode、业务、encode、write 全在一个线程——实现简单，但任一连接业务阻塞会拖慢所有连接 I/O。

![多线程 Reactor 线程池](/中间件/netty/32a/p17-01.png)

![主从 Reactor 模式](/中间件/netty/32a/p18-01.png)

---

## 四、Buffer 与直接内存

Buffer 关键属性：`capacity`、`position`、`limit`；写→`flip()`→读→`clear()`/`compact()`。

- **HeapByteBuffer**：堆内，分配快，发网络时往往还要拷到直接内存。
- **DirectByteBuffer**：堆外，分配贵，IO 少一次拷贝，高吞吐网络更合适。

Buffer 典型流程：写数据时 `put()` 移动 position；写完后 `flip()` 切换为读模式（limit=position, position=0）；读完后 `clear()` 或 `compact()` 准备下一轮。Heap 适合小对象与短生命周期；Direct 适合网络 IO 主路径，Netty ByteBuf 默认优先 Direct。

直接内存不受 Young GC 管理，需关注 `-XX:MaxDirectMemorySize`，避免堆外泄漏。

![直接内存深入辨析](/中间件/netty/32a/p21-01.png)

---

## 五、零拷贝

传统 read+send 四次拷贝：磁盘→内核→用户→socket 缓冲→网卡。Linux 提供 **mmap**、**sendfile**、**splice** 等减少 CPU 拷贝；Kafka、Netty、RocketMQ、Nginx 均受益。

Netty 零拷贝包括：Direct ByteBuf、CompositeByteBuf 组合缓冲、FileRegion 等。

![传统数据传送四次拷贝](/中间件/netty/32a/p22-01.png)

![零拷贝 mmap/sendfile 示意](/中间件/netty/32a/p22-02.png)

![Java NIO transferTo 与 Kafka 应用](/中间件/netty/32a/p23-01.png)

![Netty 零拷贝三个方面](/中间件/netty/32a/p24-01.png)

---

## 六、补充：一次 Web 请求的完整历程

下面用「新电脑打开 www.baidu.com」串起 **DHCP → DNS → ARP → NAT → TCP 三次握手 → HTTP**，把本篇 TCP/IP 与 Socket 知识落到真实拓扑。

![Web 请求场景与网络拓扑](/中间件/netty/32b/p01-01.png)

![交换机与路由器分工](/中间件/netty/32b/p02-01.png)

![DHCP 获取 IP 与 DNS 解析准备](/中间件/netty/32b/p02-02.png)

**DHCP** 广播获取 IP、网关、DNS；**ARP** 解析网关 MAC；**NAT** 把私网地址换成公网地址；**DNS** 递归查询拿到目标 IP；最后 **TCP 建连 + HTTP GET**，响应沿原路返回。

---

## 小结

- **BIO** 简单但扩展差；**NIO + Reactor** 用少量线程服务大量连接，是 Netty 的基础。
- **Buffer/直接内存/零拷贝** 决定网络 IO 的上限，后面 ByteBuf 池会在此基础上再优化。
- 理解 **Web 全链路** 有助于排查「能 ping 通但访问不了」类问题。

下一篇深入 Linux **epoll**，看 JDK Selector 底下究竟怎么高效监视百万 fd。
