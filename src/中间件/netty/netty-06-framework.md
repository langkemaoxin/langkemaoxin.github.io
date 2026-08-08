---
title: "Netty 实战——手写通信框架"
sidebarGroup: "Netty"
shortTitle: "06 手写通信框架"
order: 6
date: 2026-11-04
category: "中间件"
tag:
  - "Netty"
  - "中间件"
---

> **Netty 系列 · 第 6/8 篇**  
> 上一篇：[《Netty Pipeline、Handler 与编解码》](/中间件/netty/netty-05-pipeline) · 下一篇：[《Netty 核心线程模型源码要点》](/中间件/netty/netty-07-thread-model)

---

## 开头：从 Demo 到「可上线的通信层」

Echo 程序证明 Netty 能跑；真实分布式系统还需要：**登录鉴权、心跳保活、断线重连、防篡改、粘包处理、监控指标**。本篇按功能设计一条完整链路，并给出 Handler 安装顺序与增强点。

![通信框架功能设计总览](/中间件/netty/37/p01-01.png)

---

## 一、功能清单

基于 Netty NIO 的通信框架应提供：

1. 高性能异步 NIO 通信
2. 消息编解码（POJO 序列化/反序列化）
3. 防篡改（如 MD5 摘要）
4. IP 白名单接入认证
5. 链路有效性校验（心跳）
6. 断连重连

**典型时序**：

1. TCP 建连 → 客户端发**握手/登录**请求（带节点 ID 等）
2. 服务端校验 IP、重复登录 → 返回握手应答
3. 双向业务消息 + **Ping/Pong 心跳**
4. 空闲或异常 → 关闭连接，客户端间隔 **INTERVAL** 重连

支持 **TWO_WAY**（需应答）与 **ONE_WAY**（单向通知）。消息类型通过 Header 的 `type` 字段区分：0 业务请求、1 业务响应、2 单向、3/4 握手、5/6 心跳。

---

## 二、消息协议设计

消息 = **Header + Body**（同步模式 Header 可只含 msgID；异步建议请求/应答头分开）。

| Header 字段 | 说明 |
|-------------|------|
| md5 | 消息体摘要 |
| msgID | 消息 ID |
| type | 0 业务请求 / 1 业务响应 / 2 one-way / 3 握手请求 / 4 握手应答 / 5~6 心跳 |
| priority | 0～255 |
| attachment | 扩展 |

Body 为 Java 对象，序列化可用 **Kryo**（需配套 KryoEncoder/Decoder）。

完整消息结构：`RemotingCommand` = Header（md5、msgID、type、priority、attachment）+ Body（Kryo 序列化的 Java 对象）。md5 用于防篡改校验；msgID 用于请求-响应配对；priority 支持 0–255 优先级队列（扩展点）。

---

## 三、可靠性机制

### 3.1 链路建立与重复登录

客户端主动连服务端；服务端 **IP 白名单**校验。握手成功后，服务端缓存登录态；**同一节点重复登录**应拒绝并关闭连接，客户端等待 INTERVAL 后重连。

### 3.2 心跳

业务低谷网络闪断时，无业务流量难以发现死链。采用 **Ping-Pong**：客户端连续 N 次 Ping 无 Pong 则判定链路失效，关闭并重连。

实现：

- **IdleStateHandler** / **ReadTimeoutHandler** 检测空闲与读超时
- 写空闲发 Ping（`CheckWriteIdleHandler` + `HeartBeatReqHandler`）

### 3.3 重连

断连后等待 **INTERVAL** 再连，失败则周期性重试；客户端须释放 SocketChannel 等资源。服务端清除半包与登录缓存。

![心跳与空闲检测 Handler](/中间件/netty/37/p05-01.png)

---

## 四、Pipeline 组装

**服务端**（顺序示意）：

```
LengthFieldBasedFrameDecoder → LengthFieldPrepender
→ KryoDecoder → KryoEncoder
→ LoginAuthRespHandler → HeartBeatRespHandler → ServerBusiHandler
→ ReadTimeoutHandler → MetricsHandler
```

**客户端**：

```
LengthFieldBasedFrameDecoder → LengthFieldPrepender
→ KryoDecoder → KryoEncoder
→ LoginAuthReqHandler（认证成功后移除）
→ CheckWriteIdleHandler → HeartBeatReqHandler
→ ReadTimeoutHandler
```

认证类 Handler 完成后可从 Pipeline **remove**，减少后续开销。

![Handler 安装示意图](/中间件/netty/37/p07-01.png)

---

## 五、增强与面试点

| 增强 | 说明 |
|------|------|
| MetricsHandler | 在线 Channel 数、读写速率、积压队列 |
| SSL / 加密传输 | SslHandler |
| IO 与业务线程分离 | 业务 Handler 丢到业务线程池 |
| 流控 | 连接数达阈值拒绝 `channelActive` |

**Selector 空轮询 BUG**：Linux epoll 偶发 wake 但无事件，JDK Selector 空转 CPU 100%。Netty 在 `NioEventLoop.select` 中统计空轮询次数，达阈值**重建 Selector** 并迁移 Channel。

**百万连接**：调大 `ulimit -n`、`fs.file-max`、主从 Reactor、心跳周期、DirectBuffer 内存池、TCP 缓冲与 JVM GC——下两篇从线程模型与架构精髓展开。

---

## 小结

- 通信框架 = **帧解码 + 序列化 + 鉴权 + 心跳 + 重连 + 监控**。
- Handler **可动态移除**（登录完成后去掉 AuthHandler）。
- 生产必须处理 **半包、泄漏、重复登录、假死连接**。

下一篇从源码角度拆解 **Netty 线程模型**。
