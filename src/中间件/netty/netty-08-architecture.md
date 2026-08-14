---
title: "Netty 高并发架构设计精髓"
sidebarGroup: "Netty"
shortTitle: "08 高性能架构精髓"
order: 8
date: 2026-11-06
category: "中间件"
tag:
  - "Netty"
  - "中间件"
---

> **Netty 系列 · 第 8/8 篇**  
> 上一篇：[《Netty 核心线程模型源码要点》](/中间件/netty/netty-07-thread-model)

---

## 开头：Netty 为什么能扛高并发？

线程模型上一篇已讲：主从 Reactor、EventLoop 串行。本篇收束 **架构层面的性能设计**——Reactor 本质、直接内存与零拷贝、ByteBuf 内存池、TCP 参数、扩容机制与百万连接调优，形成 Netty 系列的性能闭环。

![Netty 高并发高性能架构设计精髓](/中间件/netty/38/p01-01.png)

---

## 一、Reactor 与 NIO 多路复用

**Reactor**（反应器）：IO 就绪时回调 Handler，本质是**同步非阻塞 + 事件驱动**，并非 OS 异步 IO。

- **NIO 多路复用**：一个线程 `select/epoll` 多个 Channel，就绪再读写
- **主从 Reactor**：accept 与 read/write 分离，水平扩展 worker 线程数

与**观察者模式**区别：Reactor 关联**多个事件源**（多个 Channel），观察者常是一对一通知。

![主从 Reactor 线程模型](/中间件/netty/38/p02-01.png)

![NIO 多路复用非阻塞](/中间件/netty/38/p03-01.png)

---

## 二、无锁串行化（性能视角）

减少锁竞争的手段：**同一 Channel 在单 EventLoop 内完成 I/O 与 Pipeline 调用**。多个 EventLoop 并行 → 局部无锁，整体吞吐高于「单队列 + 多工作线程」模型。

注意：串行指 **I/O 路径**；耗时业务仍应 offload 到业务线程池，否则 CPU 利用率假高、延迟爆炸。

同一 EventLoop 内，`fireChannelRead` 沿 Pipeline 从头向尾传播，每个 InboundHandler 在同一线程顺序执行；Outbound 写操作从尾向头传播。这种「单 Channel 单线程」设计避免了 Channel 级别的锁竞争，是 Netty 高并发的基础。

---

## 三、直接内存（Direct Memory）

**DirectByteBuffer** 在堆外分配，本地 IO 可走 **直接内存 → 系统调用 → 网卡**，堆内 Buffer 往往多一次拷贝到直接内存。

| 对比 | 堆内存 | 直接内存 |
|------|--------|----------|
| 分配 | 快 | 慢 |
| 读写 | 需拷贝到直接内存再 IO | IO 路径短 |
| GC | 受 GC 影响 | 主要 Full GC 时回收 |
| 风险 | 相对安全 | 需 `-XX:MaxDirectMemorySize`，防泄漏 |

`DirectByteBuffer` 通过 `Unsafe.allocateMemory` 分配，Cleaner 在对象 GC 时释放堆外内存。

![直接内存与堆内存性能对比](/中间件/netty/38/p06-01.png)

![DirectByteBuffer 分配源码要点](/中间件/netty/38/p07-01.png)

![Unsafe.allocateMemory](/中间件/netty/38/p07-02.png)

![直接内存优缺点](/中间件/netty/38/p07-03.png)

---

## 四、Netty 零拷贝

Netty 零拷贝包括：

1. **CompositeByteBuf**：逻辑组合多个 Buffer，避免合并拷贝
2. **Direct ByteBuf**：Socket 读写用堆外内存
3. **FileRegion**：`transferTo` 发送文件
4. **Duplicate/Slice**：共享底层存储的视图

`NioByteUnsafe.read()` 从 Channel 读到 Direct ByteBuf，写出时同样优先 Direct，减少 JVM 堆与内核间拷贝。

![Netty 零拷贝 read 路径](/中间件/netty/38/p08-01.png)

---

## 五、ByteBuf 内存池

频繁 `allocate/release` ByteBuf 在百万连接下 GC 压力巨大。**PooledByteBufAllocator** 按 **PoolArena** 管理堆外/堆内池；每个 EventLoop 串行处理链路，Buffer 可在链路间复用。

读路径：`PooledByteBufAllocator.newDirectBuffer` → Arena.allocate → `PooledUnsafeDirectByteBuf`；**Recycler** 复用 ByteBuf 对象本身。

![ByteBuf 内存池结构](/中间件/netty/38/p09-01.png)

![PooledByteBufAllocator](/中间件/netty/38/p09-02.png)

![PoolArena allocate](/中间件/netty/38/p09-03.png)

![DirectArena 分配](/中间件/netty/38/p09-04.png)

![Recycler 复用 ByteBuf](/中间件/netty/38/p09-05.png)

![Netty 4.1 默认 Pooled 分配器](/中间件/netty/38/p09-06.png)

![read 使用内存池](/中间件/netty/38/p09-07.png)

---

## 六、ByteBuf 动态扩容

`write` 时若容量不足，`calculateNewCapacity` 规则：

- 需要容量 **≤ 4MB 阈值**：按 **64 字节倍增**（64→128→256…）
- **> 阈值**：按 **4MB 步进** 扩容
- 不超过 **maxCapacity**（默认 Integer.MAX_VALUE）

避免一次过大分配，也避免小消息频繁 realloc。

![ByteBuf 扩容 calculateNewCapacity](/中间件/netty/38/p10-01.png)

![扩容步进策略总结](/中间件/netty/38/p10-02.png)

---

## 七、TCP 参数与并发优化

**ChannelOption** 生产常用：

- `SO_RCVBUF` / `SO_SNDBUF`：128K～256K
- `TCP_NODELAY`：禁用 Nagle，低延迟
- `SO_BACKLOG`：配合 `tcp_max_syn_backlog`、`somaxconn`
- Linux 可用 **EpollEventLoopGroup** + `SO_REUSEPORT` 多端口/多实例负载

**并发手段**：正确使用 volatile、CAS/原子类、线程安全容器、读写锁；Netty 自身在任务队列、内存池上已大量无锁设计。

![ChannelOption TCP 参数配置](/中间件/netty/38/p11-01.png)

![并发优化 volatile/CAS](/中间件/netty/38/p11-02.png)

![线程安全容器与锁](/中间件/netty/38/p11-03.png)

---

## 八、百万长连接实践摘要

| 层面 | 要点 |
|------|------|
| OS | `ulimit -n`、`fs.file-max`、soft/hard nofile |
| 线程 | 主从 Reactor，worker 数 ≈ CPU×2 起测，看热点在 read 还是 Handler |
| 心跳 | Netty IdleStateHandler，周期不宜过长；及时剔除失效连接 |
| 缓冲 | 调小 idle 连接 TCP 缓冲；Direct + **内存池** |
| 流控 | 连接数上限 FlowControlHandler |
| JVM | 减少 STW；G1/ZGC；监控 DirectMemory |

**水平触发(LT) vs 边缘触发(ET)**：JDK Selector 为 LT；Netty Epoll 模式为 **ET**，减少就绪 fd 重复通知，但需一次 read 到 EAGAIN。

百万连接调优清单：① OS：`ulimit -n`、`fs.file-max`、`net.core.somaxconn`；② 线程：boss=1、worker≈CPU×2 起测；③ 心跳：IdleStateHandler 周期 30s–60s；④ 内存：PooledByteBufAllocator + 监控 DirectMemory；⑤ 流控：连接数达阈值拒绝新连接；⑥ JVM：G1/ZGC，避免 Full GC 停顿过长。

---

## 系列收束

| 篇 | 主题 |
|----|------|
| 01 | TCP/IP、握手挥手 |
| 02 | BIO/NIO、Reactor、零拷贝 |
| 03 | epoll 原理 |
| 04～05 | 组件、Pipeline、编解码 |
| 06 | 手写通信框架 |
| 07 | 线程模型源码 |
| 08 | 高性能架构精髓 |

Netty 的价值在于：把 **epoll + Reactor + 池化 ByteBuf + Pipeline** 封装成稳定 API，让 Dubbo、RocketMQ、Elasticsearch 等中间件专注协议与业务。掌握本篇要点，读这些项目的 **Network 层** 源码会顺畅很多。

---

## 小结

- **性能三板斧**：主从 Reactor、Direct+池化 ByteBuf、合理 TCP/JVM 参数
- **零拷贝** 贯穿 OS（sendfile）与 Netty（Composite、FileRegion、Direct）
- **百万连接** 是系统工程：OS 句柄、心跳、内存池、流控、GC 需一起调

Netty 系列完结。
