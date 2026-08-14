---
title: "Netty 使用与常用组件（上）"
sidebarGroup: "Netty"
shortTitle: "04 Netty 组件"
order: 4
date: 2026-11-02
category: "中间件"
tag:
  - "Netty"
  - "中间件"
---

> **Netty 系列 · 第 4/8 篇**  
> 上一篇：[《深入 Linux epoll 事件轮询》](/中间件/netty/netty-03-epoll) · 下一篇：[《Netty Pipeline、Handler 与编解码》](/中间件/netty/netty-05-pipeline)

---

## 开头：第一个 Netty 程序该认识哪些组件？

你已经理解 epoll；现在要用 **Netty 4.1.x** 写 Echo 或 HTTP 服务，绕不开 Bootstrap、EventLoop、Channel、Pipeline 几个名字。本篇把「Hello Netty」里的核心组件讲清楚，并介绍 ByteBuf、引导类与 TCP 参数。

依赖示例：

```xml
<dependency>
  <groupId>io.netty</groupId>
  <artifactId>netty-all</artifactId>
  <version>4.1.42.Final</version>
</dependency>
```

![Netty 优势概览](/中间件/netty/34/p03-01.png)

---

## 一、为什么选择 Netty 4 而非 5 / AIO / Mina

- API 简单、内置多种协议编解码、易扩展 Handler。
- 修复大量 JDK NIO BUG，商业级验证。
- **Netty 5 已停更**；Linux 上 **AIO 底层仍是 epoll**，且需预分配缓冲，Netty 选用 NIO/epoll 更合适。
- **Mina** 更新停滞，Netty 为其改进版。

![Netty 与 NIO/AIO 选型](/中间件/netty/34/p04-01.png)

![为什么不用 Mina](/中间件/netty/34/p04-02.png)

---

## 二、核心组件一览

| 组件 | 作用 |
|------|------|
| **Bootstrap / ServerBootstrap** | 客户端/服务端启动入口 |
| **EventLoop(Group)** | 单线程事件循环，处理 I/O |
| **Channel** | 连接抽象，读写入口 |
| **ChannelPipeline** | Handler 双向链表 |
| **ChannelHandler** | 入站/出站业务逻辑 |
| **ChannelFuture** | 异步结果占位符 |

Netty **所有 I/O 异步**：`write` 返回 Future，通过回调或 `sync()` 获取结果。

![Bootstrap 与 EventLoop 关系](/中间件/netty/34/p05-01.png)

![Channel 与 EventLoop 绑定](/中间件/netty/34/p06-01.png)

![Channel 生命周期状态](/中间件/netty/34/p07-01.png)

![Channel 重要方法 write/flush](/中间件/netty/34/p07-02.png)

![ChannelPipeline 结构](/中间件/netty/34/p07-03.png)

---

## 三、EventLoop 与线程分配

- 一个 **EventLoop** 绑定一个 Thread，终身不变。
- **EventLoopGroup** 用 round-robin 给新 Channel 分配 EventLoop；同一 Channel 生命周期内 EventLoop 不变。
- 多 Channel 共享 EventLoop → **ThreadLocal 不适合跨 Channel 状态**，但可共享昂贵对象。

同线程提交任务立即执行；否则入队异步调度。

![EventLoop 线程分配](/中间件/netty/34/p09-01.png)

---

## 四、ChannelPipeline 与 Handler 方向

Pipeline 是 **入站 + 出站** 的双向链表。示例：加密(出)→压缩(出)→解密(入)→解压(入)→授权(入)。

- **入站**数据从 Head 流向 Tail，只经过 InboundHandler。
- **出站**从 Tail 流向 Head，只经过 OutboundHandler。
- 同方向 Handler 有顺序；出站与入站之间顺序可灵活，但入站链内部顺序不能乱。

![入站出站 Handler 链](/中间件/netty/34/p13-01.png)

Pipeline API：`addLast`、`remove`、`replace`；**ChannelHandlerContext** 类似 LinkedList 的 Node，且 `ctx.write` 只传播到下一个 OutboundHandler，比 `channel.write` 路径更短。

![ChannelHandlerContext 事件传播](/中间件/netty/34/p14-02.png)

![ctx.write 与 channel.write 区别](/中间件/netty/34/p15-01.png)

---

## 五、Bootstrap 与 ChannelInitializer

- **Bootstrap**：连远程主机；1 个 EventLoopGroup。
- **ServerBootstrap**：绑定本地端口；通常 **2 个 EventLoopGroup**（boss accept + worker I/O）。

**ChannelInitializer**：Channel 注册后调用 `initChannel()` 安装 Handler，完成后自动移除——适合一次性 Handler（如鉴权）。

| 对比项 | Bootstrap（客户端） | ServerBootstrap（服务端） |
|--------|---------------------|---------------------------|
| EventLoopGroup | 通常 1 个 | 通常 2 个（boss + worker） |
| 绑定方式 | `connect(host, port)` | `bind(port)` |
| 典型用途 | 连远程服务 | 监听本地端口 |
| Handler 安装 | `handler()` | `childHandler()` 给 accepted Channel |

---

## 六、传输模式与 TCP 参数

| 传输 | 说明 |
|------|------|
| NIO | JDK Selector，跨平台 |
| Epoll | Linux JNI epoll，更快 |
| OIO | 阻塞流，旧项目 |
| Local / Embedded | 进程内通信、单测 |

常用 **ChannelOption**：

- **SO_BACKLOG**：未完成/已完成连接队列长度，高并发要调大。
- **SO_REUSEADDR**：重启后快速复用端口。
- **SO_KEEPALIVE / TCP_NODELAY**：保活与禁用 Nagle。
- **SO_SNDBUF / SO_RCVBUF**：发送/接收缓冲，常设 128K～256K。

---

## 七、ByteBuf 入门

相对 `ByteBuffer` 的优势：读写索引分离、无需 flip、池化、引用计数、复合缓冲。

- **堆缓冲**：分配快，适合小对象。
- **直接缓冲**：IO 高性能。
- **CompositeByteBuf**：组合头+体，零拷贝拼接 HTTP 报文。

分配：`ctx.alloc().buffer()`；4.1 默认 **PooledByteBufAllocator**。

![ByteBuf 使用模式](/中间件/netty/34/p03-01.png)

---

## 小结

- **ServerBootstrap + boss/worker EventLoopGroup** 是服务端标配。
- **Channel 绑定 EventLoop**；**Pipeline** 组织 Handler；**ChannelFuture** 处理异步。
- **ByteBuf** 与 **ChannelOption** 是性能调优的前置概念。

下一篇深入 **Pipeline 编解码、粘包半包与 HTTP/SSL**。
