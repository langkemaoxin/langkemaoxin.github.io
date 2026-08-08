---
title: "Netty 核心线程模型源码要点"
sidebarGroup: "Netty"
shortTitle: "07 线程模型源码"
order: 7
date: 2026-11-05
category: "中间件"
tag:
  - "Netty"
  - "中间件"
---

> **Netty 系列 · 第 7/8 篇**  
> 上一篇：[《Netty 实战——手写通信框架》](/中间件/netty/netty-06-framework) · 下一篇：[《Netty 高并发架构设计精髓》](/中间件/netty/netty-08-architecture)

---

## 开头：读 Netty 源码，先抓「线程模型」这条主线

API 会用不等于懂 Netty。线上排查「业务 Handler 阻塞导致全网卡顿」「boss 线程能不能做业务」时，需要清楚 **EventLoop 与 Channel 的绑定关系**、**主从 Reactor 在源码里的落点**。本篇专注**线程模型与源码阅读路径**；零拷贝、ByteBuf 池等性能细节见下一篇。

![为什么要看源码](/中间件/netty/38/p01-01.png)

---

## 一、读源码的方法

1. **先使用**：官方文档 + Demo 跑通 Echo/HTTP
2. **抓主线**：跟一次 `bind → accept → read → pipeline` 静态调用链，画主流程图
3. **画图做笔记**：按功能点深入，勿一开始就陷进细节
4. **整合**：回到总图把 EventLoop、Pipeline、Future 串起来

![看源码四步法](/中间件/netty/38/p02-01.png)

---

## 二、Netty 线程模型总览

Netty 采用 **Reactor 主从模式**（与 Redis 6.0 前单线程处理命令 + 多 IO 线程有相似「串行化」思想）：

| 角色 | 组件 | 职责 |
|------|------|------|
| Boss | `NioEventLoopGroup(1)` 或少量线程 | `accept` 新连接 |
| Worker | `NioEventLoopGroup(N)` | 已连接 Channel 的 read/write |
| 业务（可选） | 自定义线程池 | 耗时逻辑从 IO 线程剥离 |

![Netty 线程模型图](/中间件/netty/38/p03-01.png)

**无锁串行化（线程模型层面）**：同一 Channel 的 I/O 与 Pipeline 事件默认在**绑定的一个 EventLoop 线程**内顺序执行，避免多线程抢 Channel 锁。用户若不 `executor().execute()` 切换线程，从 `fireChannelRead` 到业务 Handler 全在 IO 线程——这是线程模型设计的核心，下一篇再从性能角度展开。

源码阅读时可对照：`NioEventLoop.run()` → `processSelectedKeys()` → `NioSocketChannel.doReadBytes()` → `pipeline.fireChannelRead()`，整条链路在同一线程内串行完成。

---

## 三、从 Bootstrap 到 EventLoop 绑定

### 3.1 ServerBootstrap 初始化

`ServerBootstrap.group(bossGroup, workerGroup)` 创建两组 EventLoop。  
`bind(port)` 时：

1. Boss EventLoop 注册 **ServerChannel** 的 `OP_ACCEPT`
2. `accept` 得到 **SocketChannel** 后，**workerGroup.register(childChannel)** 分配给某个 worker EventLoop
3. Child Channel 生命周期内 EventLoop **不变**

对应类：`MultithreadEventLoopGroup` → `NioEventLoop` → `Selector` + `run()` 循环。

Boss 线程只负责 `accept`，新连接通过 `register(childChannel, workerEventLoop)` 分配给 worker 池中某个 EventLoop；此后该 Channel 的所有 I/O 与 Pipeline 事件都在这个 worker 线程内串行处理，实现「一 Channel 一线程」的无锁模型。

### 3.2 NioEventLoop 一次 loop

简化逻辑：

```
while (!confirmShutdown) {
    select(timeout);
    processSelectedKeys();  // accept/read/write
    runAllTasks();          // 提交到 EventLoop 的异步任务
}
```

- **select**：epoll_wait（Linux 上 EpollEventLoop 用 JNI epoll）
- **空轮询检测**：连续 N 次空 select 则重建 Selector（修复 JDK epoll bug）
- **processSelectedKeys**：触发 Channel 读，数据沿 Pipeline 传播

![NIO 多路复用与非阻塞](/中间件/netty/38/p06-01.png)

---

## 四、Channel 与 Pipeline 在线程模型中的位置

- 每个 Channel 唯一对应一个 **EventLoop** 和一个 **ChannelPipeline**
- **ChannelHandlerContext** 绑定 Channel 与 Handler；`ctx.executor()` 即 Channel 的 EventLoop
- **Outbound 写**：可在 EventLoop 线程 `write`，也可其他线程 `eventLoop.execute(() -> ctx.write(msg))` 切回 IO 线程

**线程安全规则**：

- 默认 Handler **不要**跨 Channel 共享可变状态；需要共享用 `@Sharable` + 线程安全结构
- 阻塞操作（DB、RPC 同步调用）应放到**业务线程池**，否则阻塞整个 EventLoop 上所有 Channel

![无锁串行化设计思想](/中间件/netty/38/p07-01.png)

![EventLoop 处理 read 到 Handler](/中间件/netty/38/p07-02.png)

![多 Channel 共享 EventLoop 示意](/中间件/netty/38/p07-03.png)

---

## 五、源码阅读推荐路径

按调用链阅读（Netty 4.1.x）：

1. `ServerBootstrap.bind` → `initAndRegister` → `NioEventLoop.register`
2. `NioEventLoop.run` → `processSelectedKey` → `NioByteUnsafe.read`
3. `AbstractNioByteChannel` → `pipeline.fireChannelRead`
4. `DefaultChannelPipeline` → 双向链表传播 Inbound/Outbound

并发相关类可对照看：

- `io.netty.channel.nio.NioEventLoop`
- `io.netty.channel.SingleThreadEventLoop`
- `io.netty.util.concurrent.SingleThreadEventExecutor`

![并发优化相关设计入口](/中间件/netty/38/p08-01.png)

---

## 六、Handler 生命周期与线程模型

Handler 回调顺序（便于在正确线程打日志）：

```
handlerAdded → channelRegistered → channelActive
→ channelRead → channelReadComplete
→ channelInactive → channelUnregistered → handlerRemoved
```

**均在 Channel 绑定的 EventLoop 线程**（除非自行切换到业务线程池）。

![Handler 生命周期回调顺序](/中间件/netty/38/p09-01.png)

![channelRegistered 与 EventLoop 绑定](/中间件/netty/38/p09-02.png)

![channelActive 就绪](/中间件/netty/38/p09-03.png)

![channelRead 触发线程](/中间件/netty/38/p09-04.png)

![channelReadComplete](/中间件/netty/38/p09-05.png)

![channelInactive 关闭](/中间件/netty/38/p09-06.png)

![handlerAdded/Removed](/中间件/netty/38/p09-07.png)

---

## 七、与 Dubbo、Redis 的类比

- **Redis**：单线程处理命令避免锁；Netty 是**每 Channel 串行、多 Channel 并行**（多 EventLoop）
- **Dubbo**：Netty Server 同样 boss/worker；业务线程池处理 RPC 反序列化后的调用

理解「**谁在该线程做什么**」后，再读 Dubbo 的 `HeaderExchangeHandler`、线程派发策略会轻松很多。

![Reactor 与线程池协作](/中间件/netty/38/p10-01.png)

![业务线程与 IO 线程分离](/中间件/netty/38/p10-02.png)

---

## 八、与性能设计的衔接（预告）

线程模型解决「谁在哪个线程执行」；**volatile/CAS、TCP 参数、ByteBuf 池** 等则在同样模型下进一步榨取吞吐。下列图解与下一篇呼应，此处仅标注在线程模型中的落点：

- **ChannelOption**：在 Bootstrap 绑定阶段配置，影响 accept 队列与读写缓冲
- **内存池**：分配发生在 EventLoop 读路径的 `ByteBufAllocator`
- **百万连接**：worker EventLoop 数量 + 每连接串行处理，配合 OS 句柄上限

![ChannelOption 与 Bootstrap 配置](/中间件/netty/38/p11-01.png)

![并发原语在 Netty 中的使用场景](/中间件/netty/38/p11-02.png)

![线程安全容器与业务线程池](/中间件/netty/38/p11-03.png)

百万连接实践要点：OS 层调大 `ulimit -n` 与 `fs.file-max`；Netty 层用主从 Reactor + 合理 worker 线程数；连接层配置 IdleStateHandler 及时清理假死连接；内存层 Direct Buffer + PooledByteBufAllocator；JVM 层选 G1/ZGC 并监控 DirectMemory 使用。

---

## 小结

- Netty 线程模型 = **主从 Reactor + 每 Channel 固定 EventLoop 串行处理**
- 读源码跟 **`NioEventLoop.run` → fireChannelRead** 主线即可，勿一开始就啃 ByteBuf 池
- **阻塞 Handler = 阻塞整条 EventLoop**，生产必须 IO/业务分离

下一篇从**架构与性能**角度总结 Reactor、零拷贝、ByteBuf 池、TCP 调参与百万连接实践。
