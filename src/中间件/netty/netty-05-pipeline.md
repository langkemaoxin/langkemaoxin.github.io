---
title: "Netty Pipeline、Handler 与编解码"
sidebarGroup: "Netty"
shortTitle: "05 Pipeline 与编解码"
order: 5
date: 2026-11-03
category: "中间件"
tag:
  - "Netty"
  - "中间件"
---

> **Netty 系列 · 第 5/8 篇**  
> 上一篇：[《Netty 使用与常用组件（上）》](/中间件/netty/netty-04-components) · 下一篇：[《Netty 实战——手写通信框架》](/中间件/netty/netty-06-framework)

---

## 开头：粘包半包是 Netty 新手的第一道坎

写 Echo 很顺，一换成「自定义二进制协议」就收到半包、粘包，或者 `channelReadComplete` 触发次数对不上——问题通常不在业务，而在 **Pipeline 里缺了帧解码器** 或对 Handler 生命周期理解有误。

本篇聚焦 **Handler 细节、ByteBuf 释放、TCP 粘包半包、编解码器框架**，以及 HTTP/SSL 开箱即用组件。

![ChannelInboundHandler 生命周期](/中间件/netty/34/p21-01.png)

---

## 一、ChannelHandler 适配器与共享

- **ChannelInboundHandlerAdapter / ChannelOutboundHandlerAdapter**：空实现，按需重写。
- **ChannelDuplexHandler**：同时处理入站出站。
- **@Sharable**：同一 Handler 实例可挂到多个 Channel（如全连接计数器），必须保证**线程安全**（Atomic 等）。

**OutboundHandler.read()** 不是读网络，而是业务**发起读请求**的出站事件。

![OutboundHandler read 方法](/中间件/netty/34/p22-01.png)

---

## 二、资源释放与 SimpleChannelInboundHandler

读数据时 Netty 分配 ByteBuf；正常情况下 **Tail** 释放入站 Buf，**Head** 释放出站 Buf。

若 Handler **消费数据但不 fireChannelRead 也不 release**，会内存泄漏。  
**SimpleChannelInboundHandler** 在 `channelRead0` 后自动释放，适合「读到完整消息即处理」的场景。

![Pipeline 中 Head/Tail 与释放责任](/中间件/netty/34/p26-01.png)

![SimpleChannelInboundHandler 示意](/中间件/netty/34/p26-02.png)

---

## 三、TCP 粘包与半包

TCP 是**字节流**，无消息边界。常见现象：

1. 两包独立到达（理想）
2. **粘包**：一次 read 读到 D1+D2
3. **半包**：D1 分两次 read
4. 混合拆粘

原因：Nagle 合并小包、接收缓冲未及时取走、MSS 分段、应用写入大于发送缓冲等。

| 现象 | 说明 |
|------|------|
| 独立两包 | 理想情况，一次 read 一条消息 |
| 粘包 | 一次 read 读到多条消息拼接 |
| 半包 | 一条消息分多次 read |
| 混合 | 粘包与半包同时出现 |

**业界方案**：

| 方案 | 实现 |
|------|------|
| 分隔符 | 换行、自定义 Delimiter |
| 定长 | FixedLengthFrameDecoder |
| 长度字段 | LengthFieldBasedFrameDecoder（最常用） |

### channelRead vs channelReadComplete

- **channelRead**：每解析出**一条完整业务报文**调用一次（Netty 帧解码后）。
- **channelReadComplete**：每次从 Socket **成功 read 到数据**就调用，次数可能与报文条数无关。

![channelRead 与 channelReadComplete 辨析](/中间件/netty/34/p34-01.png)

---

## 四、编解码器框架

**解码器**（入站）：字节 → 消息  
**编码器**（出站）：消息 → 字节

| 类型 | 基类 | 典型用途 |
|------|------|----------|
| 一次解码 | ByteToMessageDecoder | 字节流 → String/POJO |
| 二次解码 | MessageToMessageDecoder | String JSON → Java 对象 |
| 一次编码 | MessageToByteEncoder | 对象 → 字节 |
| 二次编码 | MessageToMessageEncoder | 对象 → JSON 字符串 |
| 复合 | ByteToMessageCodec 等 | 编解码合一 |

`ByteToMessageDecoder` 会缓存半包直到可读完整帧；超长帧抛 **TooLongFrameException**，需 `exceptionCaught` 处理。

![编解码器分类](/中间件/netty/34/p35-01.png)

![ByteToMessageDecoder decode 流程](/中间件/netty/34/p36-01.png)

![MessageToMessageDecoder](/中间件/netty/34/p37-01.png)

![编码器 MessageToByteEncoder](/中间件/netty/34/p38-01.png)

![TooLongFrameException 与复合编解码器](/中间件/netty/34/p38-02.png)

---

## 五、HTTP 与 SSL

Netty 内置 **HttpRequestDecoder/Encoder**、**HttpObjectAggregator**（聚合成 FullHttpRequest/Response）、**HttpContentCompressor**（gzip/deflate）。

HTTPS：在 Pipeline **最前面**加 **SslHandler**（内部 SSLEngine），也可根据客户端用 OptionalSslHandler 动态决定是否 SSL。

HTTP 服务端 Pipeline 典型顺序：`SslHandler`（可选）→ `HttpServerCodec`（请求解码+响应编码）→ `HttpObjectAggregator(maxContentLength)` 聚合成 `FullHttpRequest`/`FullHttpResponse` → `HttpContentCompressor` 压缩 → 业务 Handler。客户端顺序类似，Codec 方向相反。

---

## 六、序列化选型

JDK 序列化：**不能跨语言**、码流大、性能差，RPC 中很少用。生产更常见 **Protobuf、Kryo、Hessian** 等；手写通信框架篇会用 Kryo。

---

## 小结

- Pipeline 里**帧解码器**必须在业务 Handler 之前；长度字段协议用 **LengthFieldBasedFrameDecoder**。
- 理解 **channelRead** 与 **channelReadComplete** 语义，避免误用后者做「批处理完成」判断。
- 用好 **SimpleChannelInboundHandler** 和 **引用计数**，防止 ByteBuf 泄漏。

下一篇把这些组件串成一套可运行的**企业通信框架**。
