---
layout: post
author:     "Corey"
header-img: "img/post-bg-circuit-board.jpg"
header-mask: 0.25
title: "Kestrel 如何监听端口：从浏览器到 Socket，再到 Windows bind/listen"
subtitle: "最小 Socket 案例 → SocketConnectionListener → .NET SocketPal → Winsock API → 内核"
date: 2026-08-06
catalog: true
tags: [ASP.NET Core, .NET 10, Kestrel, Socket, Winsock, 网络, 源码阅读]
---

> 在浏览器输入 `https://localhost:31620/api/demo` 之后，程序到底是怎么「知道」的？  
> 是在监听端口吗？Kestrel 的 `SocketConnectionListener` 做了什么？  
> C# 的 `Bind` / `Listen` 再往下，Windows API 又是什么？

本文按**同一条故事线由外到内**往下挖，建议按这个顺序读：

```text
① 自己写最小 Socket 服务器（建立直觉）
② 浏览器输入地址时发生了什么
③ Kestrel 如何用 SocketConnectionListener 做同样的事
④ C# Bind/Listen 如何落到 Windows 的 bind/listen（Ws2_32.dll）
⑤ 和 HttpProtocol / 控制器的边界，以及怎么调试
```

源码以本机 ASP.NET Core 10.0.10 与公开的 dotnet/runtime 为准，关键文件：

```text
# Kestrel（aspnetcore）
src\Servers\Kestrel\Transport.Sockets\src\SocketConnectionListener.cs
src\Servers\Kestrel\Transport.Sockets\src\SocketTransportFactory.cs
src\Servers\Kestrel\Transport.Sockets\src\SocketTransportOptions.cs
src\Servers\Kestrel\Core\src\Internal\ConnectionDispatcher.cs

# .NET / Windows 互操作（dotnet/runtime）
System.Net.Sockets\...\Socket.cs
System.Net.Sockets\...\SocketPal.Windows.cs
Common\...\WinSock\Interop.bind.cs
Common\...\WinSock\Interop.listen.cs
```

样例端口来自 `MvcSandbox` 的 `launchSettings.json`：

```json
"applicationUrl": "https://localhost:31620;http://localhost:31621"
```

---

## 一、最小案例：不用 Kestrel，自己用 Socket 接连接

目标：在本机 `5055` 端口听着，有客户端连上来就 Accept，读一行文本，回一句 `OK`。  
**不涉及 HTTP 框架**，只证明「监听端口 + 接受连接」长什么样。

新建一个控制台项目，例如 `SocketListenDemo`，`Program.cs` 可以写成：

```csharp
using System.Net;
using System.Net.Sockets;
using System.Text;

// 1) 创建「听门」用的 TCP Socket
using var listenSocket = new Socket(
    AddressFamily.InterNetwork,  // IPv4
    SocketType.Stream,           // 流式（TCP）
    ProtocolType.Tcp);

// 2) Bind：向操作系统申请占用 127.0.0.1:5055
var endPoint = new IPEndPoint(IPAddress.Loopback, 5055);
listenSocket.Bind(endPoint);

// 3) Listen：开始监听；128 表示内核里大约允许多少个「已连上但还未 Accept」的连接排队
listenSocket.Listen(backlog: 128);

Console.WriteLine("Listening on http://127.0.0.1:5055/ （其实只是 TCP，还不是完整 Web 服务器）");
Console.WriteLine("用浏览器打开该地址，或另开终端: curl http://127.0.0.1:5055/");

while (true)
{
    // 4) Accept：阻塞/异步等待下一个客户端连上来
    //    返回的是「和这位客户端通话」的新 Socket；listenSocket 继续看门
    using Socket client = await listenSocket.AcceptAsync();

    Console.WriteLine($"Accepted: {client.RemoteEndPoint}");

    // 5) 在「客户端 Socket」上读写字节（这里只做最小演示）
    var buffer = new byte[1024];
    int n = await client.ReceiveAsync(buffer);
    string requestText = Encoding.ASCII.GetString(buffer, 0, n);
    Console.WriteLine("--- received ---");
    Console.WriteLine(requestText);

    // 若用浏览器访问，你会在 requestText 里看到类似：
    // GET / HTTP/1.1
    // Host: 127.0.0.1:5055
    // ...
    // 说明：浏览器发的是 HTTP 文本；我们还没做路由/控制器，只是把连接接住并读了字节。

    // 6) 随便回一点 HTTP，让浏览器别一直转圈（可选）
    byte[] response = Encoding.ASCII.GetBytes(
        "HTTP/1.1 200 OK\r\n" +
        "Content-Type: text/plain; charset=utf-8\r\n" +
        "Content-Length: 2\r\n" +
        "Connection: close\r\n" +
        "\r\n" +
        "OK");
    await client.SendAsync(response);
    client.Shutdown(SocketShutdown.Both);
}
```

### 构造函数三个参数：有哪些选项？为什么要这样选？

```csharp
new Socket(
    AddressFamily.InterNetwork,  // 第 1 个：地址族
    SocketType.Stream,           // 第 2 个：套接字类型
    ProtocolType.Tcp);           // 第 3 个：协议
```

创建 Socket 时，等于在跟操作系统说三件事：**用哪类地址、要什么传输形态、具体哪个协议**。  
三者必须匹配；乱搭配常会在构造或后续 `Bind` 时直接失败。

#### 第 1 个参数：`AddressFamily`（地址族）

决定 socket 工作在哪套「地址命名空间」里，后面 `Bind` 的 `EndPoint` 必须同属这一族。

| 常见取值 | 含义 | 典型用途 |
|----------|------|----------|
| **`InterNetwork`** | IPv4（`127.0.0.1`、`192.168.x.x` 等） | 本例；最常见的入门/兼容选择 |
| **`InterNetworkV6`** | IPv6（`::1`、`2001:...` 等） | 只听 IPv6；或配合 DualMode 兼听 IPv4 |
| `Unix` | Unix Domain Socket（路径名，不是 IP:端口） | 本机进程间通信（Linux/macOS 等更常见） |
| `Unspecified` | 未指定 | 少直接用于「我要听某个明确地址」的场景 |
| 其它（如 `Irda`、`Packet` 等） | 特殊/遗留链路 | 一般 Web 服务器用不到 |

**本例为什么选 `InterNetwork`？**

- 后面绑的是 `IPAddress.Loopback`（`127.0.0.1`），属于 **IPv4**  
- 浏览器访问 `http://127.0.0.1:5055/` 走的就是 IPv4 回环  
- 若改成只创建 `InterNetworkV6`，却去 `Bind` IPv4 的 `IPEndPoint`，会对不上  

若你想「一个 socket 尽量覆盖 IPv6+IPv4」，常见写法是：`AddressFamily.InterNetworkV6` + 绑 `IPAddress.IPv6Any`，并设置 `DualMode = true`（Kestrel 在 `IPv6Any` 时也会这么做）。本最小案例为直观，只用 IPv4。

#### 第 2 个参数：`SocketType`（套接字类型）

决定「数据怎么交付」的语义（面向连接的字节流，还是数据报，等）。

| 常见取值 | 含义 | 和协议的关系 |
|----------|------|----------------|
| **`Stream`** | 可靠、双向、面向连接的**字节流**（没有「消息边界」保证） | 通常配 **TCP** |
| **`Dgram`** | **数据报**：一包一包发，不保证到达/顺序 | 通常配 **UDP** |
| `Raw` | 原始套接字，可碰更底层报文 | 常配 ICMP 等；往往要高权限 |
| `Rdm` / `Seqpacket` | 少见的面向消息/有序报文类型 | 一般业务 Web 不用 |
| `Unknown` | 未知 | 不用于主动创建监听服务器 |

**本例为什么选 `Stream`？**

- HTTP（浏览器那套）跑在 **TCP** 上，TCP 提供的就是**连续字节流**  
- 服务器要 `Listen` / `Accept` 的，也是面向连接的流式 socket  
- 若写成 `Dgram`，那是 UDP 语义：没有 `Listen`/`Accept` 那套「接电话」模型，也和浏览器默认 HTTP/TCP 对不上  

#### 第 3 个参数：`ProtocolType`（协议）

在地址族 + 套接字类型之下，再指定具体协议。

| 常见取值 | 含义 | 常搭配 |
|----------|------|--------|
| **`Tcp`** | 传输控制协议 | `SocketType.Stream` |
| **`Udp`** | 用户数据报协议 | `SocketType.Dgram` |
| `IP` / `IPv4` / `IPv6` | IP 层相关 | 多见于 Raw 等场景 |
| `Icmp` / `IcmpV6` | 控制报文 | Raw / 诊断 |
| `Unspecified`（`0`） | 让系统按前两项选默认协议 | 有时可省略式写法，但显式写更清晰 |
| 其它 | 特殊协议 | 本例不需要 |

**本例为什么选 `Tcp`？**

- 浏览器 `http://...` 默认就是 **TCP 上的 HTTP**  
- 与 `SocketType.Stream` 是标准搭档：`Stream + Tcp`  
- 若写成 `Udp`，和 `Stream` 冲突，创建阶段就可能失败或毫无意义  

#### 三者合在一起：在说什么？

```text
AddressFamily.InterNetwork  →  我用 IPv4 地址
SocketType.Stream           →  我要面向连接的字节流
ProtocolType.Tcp            →  具体协议是 TCP
```

翻译成大白话：

> 请操作系统给我一个 **IPv4 的 TCP 流式套接字**，用来当网站那种「听端口、Accept、再收发字节」的听门人。

这和 Windows 原生创建方式是对齐的：

```cpp
socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
//      ↑IPv4   ↑流式        ↑TCP
```

也和 Kestrel 里 `CreateDefaultBoundListenSocket` 对 `IPEndPoint` 的创建方式一致：同样是按地址族建 **`SocketType.Stream` + `ProtocolType.Tcp`**。

#### 错误搭配会怎样？（帮助记忆）

| 写法 | 结果直觉 |
|------|----------|
| `InterNetwork` + `Stream` + `Tcp` | 正确：本例 / 典型 HTTP 服务器 |
| `InterNetwork` + `Dgram` + `Udp` | 正确：但那是 UDP，不是浏览器默认 HTTP |
| `InterNetwork` + `Stream` + `Udp` | 错误/无意义：流式与 UDP 不匹配 |
| `InterNetworkV6` 的 socket去 `Bind(127.0.0.1)` | 地址族与 EndPoint 不一致，易失败 |

记住口诀：

> **做网页这种 TCP 服务：IPv4 → `InterNetwork` + `Stream` + `Tcp`；IPv6 → `InterNetworkV6` + `Stream` + `Tcp`。**

### 怎么跑、怎么验证

```powershell
dotnet new console -n SocketListenDemo -o SocketListenDemo
# 把上面代码贴进 Program.cs
cd SocketListenDemo
dotnet run
```

另开浏览器访问 `http://127.0.0.1:5055/`，或：

```powershell
curl http://127.0.0.1:5055/
```

控制台应打印 `Accepted: ...`，并能看到浏览器发来的 `GET / HTTP/1.1` 原文；页面或 curl 得到 `OK`。

### 三步务必记住

| 步骤 | API | 白话 |
|------|-----|------|
| Bind | `listenSocket.Bind(endPoint)` | 占住 IP:端口 |
| Listen | `listenSocket.Listen(backlog)` | 开始在这个端口接客排队 |
| Accept | `await listenSocket.AcceptAsync()` | 来一个客人，取出一个**新** Socket 跟他说话 |

两个 Socket 不要混：

```text
listenSocket   → 只负责看门（Listen / Accept）
client Socket  → 负责和某一个客户端收发数据
```

### 和 Kestrel 的对应关系（先看一眼）

| 最小案例 | Kestrel `SocketConnectionListener` |
|----------|-------------------------------------|
| `new Socket` + `Bind` | `CreateBoundListenSocket`（内部同样 `new Socket` + `Bind`） |
| `Listen(backlog)` | `listenSocket.Listen(_options.Backlog)`（默认 512） |
| `AcceptAsync` 循环 | `AcceptAsync` + 外层 `ConnectionDispatcher` 的 `while` |
| `Receive` / 自己拼 HTTP | 交给 `HttpProtocol`、中间件、MVC… |

所以后面整篇文章可以概括成一句话：

> **Kestrel 最底层就是在做你上面写的这件事；`SocketConnectionListener` 是对 Bind/Listen/Accept 的工程化封装，HTTP 和 Web API 都是接在 Accept 之后的上层。**

---

## 二、先给结论（带分层地图）

1. **是的，程序在监听端口**（例如 `31620`）。  
2. 浏览器输入地址，**不是**框架去读地址栏，而是：向该端口发起 **TCP 连接**（`https` 再加 TLS），连上之后再发 HTTP。  
3. 无论自己写 Socket，还是 Kestrel，核心都是三步：**Bind → Listen → Accept**。  
4. Kestrel 里这三步主要落在 **`SocketConnectionListener`**（对 `System.Net.Sockets.Socket` 的封装）。  
5. C# 的 `Socket.Bind` / `Listen` **并不自己实现网络协议**，最终在 Windows 上调用 **`Ws2_32.dll` 的 `bind` / `listen`**，再进入内核 TCP 栈。  
6. `SocketConnectionListener` 只负责 **「接上 TCP 连接」**；**不解析** `GET /api/demo`。那是更后面的 `HttpProtocol` / MVC。

整栈分层（后文按此展开）：

```text
浏览器 / curl
    ↓ TCP connect
操作系统 TCP 栈（LISTEN 队列）
    ↑ bind / listen / accept     ← Windows API（Ws2_32.dll）
.NET SocketPal + Interop.Winsock ← P/Invoke 声明（dotnet/runtime 开源）
System.Net.Sockets.Socket.Bind/Listen/AcceptAsync
SocketConnectionListener         ← Kestrel 运输层
HttpProtocol → 中间件 → MVC → DemoController.Get
```

---

## 三、你在浏览器输入地址时，发生了什么？

地址：`https://localhost:31620/api/demo`

| 部分 | 含义 |
|------|------|
| `https` | 先 TLS 加密，再在上面跑 HTTP |
| `localhost` | 本机（常见为 `127.0.0.1` / `::1`） |
| `31620` | **目标端口** |
| `/api/demo` | 连上之后，放在 HTTP 请求行里的路径 |

浏览器侧顺序：

```text
1. 解析主机 → 本机
2. TCP connect 到 本机:31620     ← 此时必须已有进程在 Listen，否则「无法连接」
3. HTTPS → TLS 握手
4. 发送：
   GET /api/demo HTTP/1.1
   Host: localhost:31620
   ...
```

因此：**「捕获请求」的第一道关，是端口上已经有人 Listen，并且 Accept 到了这条 TCP 连接。**

---

## 四、`SocketConnectionListener` 在整体链路里站哪？

启动到接客：

```text
Host / Kestrel 启动（UseKestrel，地址来自 launchSettings 等）
  → KestrelServerImpl.StartAsync
  → TransportManager.BindAsync
    → SocketTransportFactory.BindAsync
      → new SocketConnectionListener(endpoint, options, logger)
      → transport.Bind()                    ← 占端口并 Listen
  → ConnectionDispatcher.StartAcceptingConnections
      → while (true) await listener.AcceptAsync()   ← 等浏览器连上来
        → 得到 ConnectionContext
          → 再往后：TLS（若 https）→ HttpConnection / HttpProtocol
            → Hosting 中间件管道 → 路由 → DemoController
```

记住：  
**`SocketConnectionListener` = 运输层接客；`HttpProtocol` = 应用层看懂 HTTP。**  
调试时若先停在 `HttpProtocol`，说明连接早已被 Accept 成功了。

---

## 五、类结构：它手里有什么？

```csharp
// SocketConnectionListener.cs（结构示意）
internal sealed class SocketConnectionListener : IConnectionListener
{
    private readonly SocketConnectionContextFactory _factory;
    private readonly ILogger _logger;
    private Socket? _listenSocket;          // 监听用 Socket（听门的）
    private readonly SocketTransportOptions _options;

    public EndPoint EndPoint { get; private set; }  // 如 127.0.0.1:31620
}
```

| 成员 | 作用 |
|------|------|
| `EndPoint` | 要监听的地址+端口 |
| `_listenSocket` | **只负责接客**的监听 Socket，一般不在这上面读完整 HTTP 正文 |
| `_options` | `Backlog`、`NoDelay`、如何创建监听 Socket 等 |
| `_factory` | 把「已接通的客户端 Socket」包装成 Kestrel 的 `ConnectionContext` |

构造函数**只保存参数，不监听**。真正开张是 `Bind()`。

工厂侧创建方式：

```csharp
// SocketTransportFactory.BindAsync
var transport = new SocketConnectionListener(endpoint, _options, _logger);
transport.Bind();
return transport;
```

---

## 六、`Bind()`：如何实现「监听端口」？

`Bind()` 对应操作系统里的 **创建 Socket → Bind → Listen**，源码逻辑非常直：

```csharp
internal void Bind()
{
    if (_listenSocket != null)
        throw new InvalidOperationException(...); // 不能绑两次

    Socket listenSocket;
    try
    {
        listenSocket = _options.CreateBoundListenSocket(EndPoint);
    }
    catch (SocketException e) when (e.SocketErrorCode == SocketError.AddressAlreadyInUse)
    {
        throw new AddressInUseException(e.Message, e); // 端口被占用
    }

    EndPoint = listenSocket.LocalEndPoint;   // 若端口是 0，这里变成真实端口
    listenSocket.Listen(_options.Backlog); // 默认 Backlog = 512
    _listenSocket = listenSocket;
}
```

### 6.1 创建并绑定：`CreateDefaultBoundListenSocket`

默认实现在 `SocketTransportOptions`：

对常见的 `IPEndPoint`（本机 HTTP/HTTPS 端口）：

1. `new Socket(addressFamily, SocketType.Stream, ProtocolType.Tcp)`  
   → 要一个 **TCP 流式套接字**  
2. 若是 `IPv6Any`，设 `DualMode = true`（IPv6 监听同时接 IPv4）  
3. `listenSocket.Bind(endpoint)`  
   → 向操作系统申请：**这个 IP:端口归本进程**  

若端口已被占用，就会在这里失败，最后变成你熟悉的「address already in use」。

另外还支持：

- Unix Domain Socket  
- 已有文件句柄上的 Socket（`FileHandleEndPoint`，此时不再 `Bind`）

对学习「浏览器访问 localhost:端口」，盯住 **`IPEndPoint` + `Bind` + `Listen`** 即可。

### 6.2 `Listen(Backlog)`：开始接客排队

```csharp
listenSocket.Listen(_options.Backlog); // 默认 512
```

含义：

> 该 Socket 进入**监听状态**；  
> 大约最多 512 个「TCP 已连上、但应用还没 Accept」的连接可以在内核队列里排队。

到这里，日志里才会出现类似：

```text
Now listening on: https://localhost:31620
```

此时程序已经在听端口，但 **`DemoController.Get` 还不会执行**——因为还没有客户端连上来，更没有 HTTP 被解析。

> 这里的 `listenSocket.Bind` / `Listen`，就是第一节最小案例里那两行。  
> **它们底下如何变成 Windows API？** 先把 Accept 看完，到**第九节**整段下挖。

---

## 七、`AcceptAsync()`：如何「捕获」浏览器连上来？

```csharp
public async ValueTask<ConnectionContext?> AcceptAsync(CancellationToken cancellationToken = default)
{
    while (true)
    {
        try
        {
            var acceptSocket = await _listenSocket.AcceptAsync(cancellationToken);

            if (acceptSocket.LocalEndPoint is IPEndPoint)
                acceptSocket.NoDelay = _options.NoDelay; // 默认 true，关闭 Nagle，降低延迟

            return _factory.Create(acceptSocket);
        }
        catch (ObjectDisposedException) { return null; }           // 正在关闭监听
        catch (SocketException e) when (e.SocketErrorCode == SocketError.OperationAborted)
        {
            return null;
        }
        catch (SocketException)
        {
            // 队列里连接被重置等，打日志后继续 while 再 Accept
        }
    }
}
```

### 7.1 核心调用

```csharp
var acceptSocket = await _listenSocket.AcceptAsync(...);
```

| 情况 | 行为 |
|------|------|
| 还没人连 | 异步等待（不空转占满 CPU） |
| 浏览器 TCP connect 成功 | 从监听队列取出一条连接，返回**新的** `acceptSocket` |

两个 Socket 分工：

- `_listenSocket`：继续看门，接下一个客人  
- `acceptSocket`：专门和**这一位**浏览器通信（后续 TLS/HTTP 读写都在它上面）

### 7.2 包装成 ConnectionContext

```csharp
return _factory.Create(acceptSocket);
```

把裸 `Socket` 变成 Kestrel 连接抽象（带管道读写等），交给上层。  
**到这一步仍没有解析 `GET /api/demo`。**

### 7.3 谁在循环调用 Accept？

`ConnectionDispatcher` 在线程池上跑接收循环：

```csharp
while (true)
{
    var connection = await listener.AcceptAsync();
    if (connection == null) break; // Unbind/Dispose 后结束
    // 把 connection 交给连接处理管道
}
```

因此：

```text
你回车访问页面
  → TCP 连上 31620
  → 某次 AcceptAsync 返回
  → 这条连接进入 TLS / HttpProtocol / 中间件 / 控制器
```

---

## 八、关闭时如何停止监听？

```csharp
public ValueTask UnbindAsync(...)
{
    _listenSocket?.Dispose();
    return default;
}
```

Dispose 监听 Socket → 正在进行的 `AcceptAsync` 失败或结束并返回 `null` → 接收循环退出 → 端口释放。

---

## 九、再往下挖：C# 的 Bind/Listen 如何变成 Windows API？

第一节和第六节写的都是：

```csharp
listenSocket.Bind(endPoint);
listenSocket.Listen(backlog);
```

问题：这两行**底下的源码**是什么？在 Windows 上，答案分三层——**你能打开的开源**，和**系统闭源实现**要分开看。

### 9.1 调用链总览

```text
C#: socket.Bind / Listen
  → Socket.DoBind / Socket.Listen          （dotnet/runtime 托管代码）
  → SocketPal.Bind / Listen                （SocketPal.Windows.cs）
  → Interop.Winsock.bind / listen          （P/Invoke 声明）
  → Ws2_32.dll!bind / listen               （Windows Winsock API）
  → TCP/IP 协议栈（tcpip.sys 等，闭源）
```

Kestrel 并没有另写一套「监听协议」；它只是调用了 `System.Net.Sockets`，而后者在 Windows 上最终进 **`Ws2_32.dll`**。

### 9.2 托管层：`Socket.Bind` / `Listen`（dotnet/runtime）

源码：[`Socket.cs`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Net.Sockets/src/System/Net/Sockets/Socket.cs)

**Bind** 大意：

```csharp
public void Bind(EndPoint localEP)
{
    SocketAddress socketAddress = Serialize(ref localEP); // IPEndPoint → 原生 sockaddr 缓冲区
    DoBind(localEP, socketAddress);
}

private void DoBind(EndPoint endPointSnapshot, SocketAddress socketAddress)
{
    SocketError errorCode = SocketPal.Bind(
        _handle,
        _protocolType,
        socketAddress.Buffer.Span.Slice(0, socketAddress.Size));

    if (errorCode != SocketError.Success)
        UpdateStatusAfterSocketErrorAndThrowException(errorCode);

    _rightEndPoint = endPointSnapshot;
}
```

**Listen** 大意：

```csharp
public void Listen(int backlog)
{
    SocketError errorCode = SocketPal.Listen(_handle, backlog);
    if (errorCode != SocketError.Success)
        UpdateStatusAfterSocketErrorAndThrowException(errorCode);
    _isListening = true;
}
```

这一层：参数检查、地址序列化、错误转成 `SocketException`。  
**真正 bind/listen 不在这里实现。**

### 9.3 平台层：`SocketPal.Windows`

[`SocketPal.Windows.cs`](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Net.Sockets/src/System/Net/Sockets/SocketPal.Windows.cs)：

```csharp
public static SocketError Bind(SafeSocketHandle handle, ProtocolType _, ReadOnlySpan<byte> buffer)
{
    SocketError errorCode = Interop.Winsock.bind(handle, buffer);
    return errorCode == SocketError.SocketError ? GetLastSocketError() : SocketError.Success;
}

public static SocketError Listen(SafeSocketHandle handle, int backlog)
{
    SocketError errorCode = Interop.Winsock.listen(handle, backlog);
    return errorCode == SocketError.SocketError ? GetLastSocketError() : SocketError.Success;
}
```

### 9.4 Windows API 声明：P/Invoke 到 `Ws2_32.dll`

这是 .NET 仓库里**最接近 Windows API 的一层开源**：

**bind** — [`Interop.bind.cs`](https://github.com/dotnet/runtime/blob/main/src/libraries/Common/src/Interop/Windows/WinSock/Interop.bind.cs)：

```csharp
[LibraryImport(Interop.Libraries.Ws2_32, SetLastError = true)]
private static partial SocketError bind(
    SafeSocketHandle socketHandle,
    ReadOnlySpan /*byte*/ socketAddress,
    int socketAddressSize);
```

**listen** — [`Interop.listen.cs`](https://github.com/dotnet/runtime/blob/main/src/libraries/Common/src/Interop/Windows/WinSock/Interop.listen.cs)：

```csharp
[LibraryImport(Interop.Libraries.Ws2_32, SetLastError = true)]
internal static partial SocketError listen(
    SafeSocketHandle socketHandle,
    int backlog);
```

| 标记 | 含义 |
|------|------|
| `LibraryImport(... Ws2_32 ...)` | 从 **`C:\Windows\System32\Ws2_32.dll`** 导出函数 |
| 函数名 `bind` / `listen` | 就是 Winsock 导出名 |
| `SafeSocketHandle` | 对应原生 `SOCKET` 句柄 |

本机可自证导出存在：

```powershell
dumpbin /EXPORTS C:\Windows\System32\Ws2_32.dll | findstr /i " bind listen accept"
```

### 9.5 Windows 官方 API 合同（头文件级）

文档：

- [bind function](https://learn.microsoft.com/windows/win32/api/winsock/nf-winsock-bind)  
- [listen function](https://learn.microsoft.com/windows/win32/api/winsock2/nf-winsock2-listen)

**C 签名：**

```cpp
// winsock.h / Winsock2.h，实现于 Ws2_32.dll
int bind(
  SOCKET         s,
  const sockaddr *addr,
  int            namelen
);

int WSAAPI listen(
  SOCKET s,
  int    backlog
);
```

| API | 作用（官方语义） |
|-----|------------------|
| `bind` | 把本地地址（地址族 + IP + 端口）赋给未命名的 socket；占坑 |
| `listen` | 把已 bind 的面向连接 socket 置为被动监听；`backlog` 为挂起连接队列长度 |

原生最小顺序（与第一节 C# 一一对应）：

```cpp
WSAStartup(MAKEWORD(2, 2), &wsaData);
SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);

sockaddr_in service{};
service.sin_family = AF_INET;
service.sin_addr.s_addr = inet_addr("127.0.0.1");
service.sin_port = htons(5055);

bind(s, (SOCKADDR*)&service, sizeof(service));
listen(s, SOMAXCONN);
// 再循环 accept(s, ...)
```

### 9.6 操作系统里 bind/listen「究竟在干什么」（行为模型）

不必有 Windows 内核源码，也能用行为模型理解：

| 调用 | 内核侧白话 |
|------|------------|
| `bind` | 在协议栈登记：「TCP + 此 IP:端口 → 这个 socket/进程」；端口冲突则失败 |
| `listen` | 将该 socket 标为 **LISTEN**；为「握手中 / 已完成待 accept」的连接准备队列（与 backlog 相关） |
| （之后）客户端 SYN | 内核完成三次握手，连接进入队列 |
| `accept` | 从队列取出一条连接，返回**新** socket；监听 socket 继续 LISTEN |

可用本机观察 LISTEN 状态：

```powershell
netstat -ano | findstr :31620
# 或
Get-NetTCPConnection -LocalPort 31620 -State Listen -ErrorAction SilentlyContinue
```

### 9.7 开源边界：哪些看得到，哪些看不到？

| 层级 | 能否看源码 |
|------|------------|
| Kestrel `SocketConnectionListener` | 能（aspnetcore 仓库） |
| `System.Net.Sockets` + `Interop.Winsock.*` | 能（[dotnet/runtime](https://github.com/dotnet/runtime)） |
| `winsock2.h` + MSDN 行为说明 | 能（API 合同） |
| `Ws2_32.dll` / `tcpip.sys` 内部实现 | **不能**（Windows 闭源） |

想对照「类似实现」，可参考 ReactOS 等开源 OS 的 Winsock/TCP 代码——那是仿制参考，不是微软原版。

### 9.8 一张表串回 Kestrel

| 你的最小案例 / Kestrel | .NET | Windows API | DLL |
|------------------------|------|-------------|-----|
| `new Socket` | `SocketPal.CreateSocket` | `WSASocketW` / `socket` | `Ws2_32.dll` |
| `Bind` | `Interop.Winsock.bind` | `bind` | `Ws2_32.dll` |
| `Listen` | `Interop.Winsock.listen` | `listen` | `Ws2_32.dll` |
| `AcceptAsync` | `SocketPal.Accept` 等 | `accept` / 异步扩展 | `Ws2_32.dll` 等 |

到这里，「监听端口」的故事在 Windows 上就闭环了：  
**应用层封装 → P/Invoke → Winsock → 内核 LISTEN。**


## 十、时间线：对照你自己的操作

| 时刻 | SocketConnectionListener | 你的体感 |
|------|--------------------------|----------|
| F5 启动 | `Bind()`：`Socket` + `Bind` + `Listen` | 看到 Now listening on … |
| 启动后空闲 | 某处在 `await AcceptAsync()` | 进程在，控制器没跑 |
| 浏览器打开 URL | `AcceptAsync` 返回新 Socket | 连接被接住 |
| 随后（其他类型） | —— | TLS → HttpProtocol → 路由 → `Get()` → `ok` |
| 停止调试 | `Unbind` / `Dispose` | 端口空出来 |

---

## 十一、和 `HttpProtocol` 的关系（之前容易混的点）

调试请求时，很多人第一个断到的是：

```text
...\Kestrel\Core\src\Internal\Http\HttpProtocol.cs
```

这**没有错**，但层次不同：

| 组件 | 入口含义 |
|------|----------|
| **SocketConnectionListener** | **端口级**：Bind/Listen/Accept，捕获 TCP 连接 |
| **HttpProtocol** | **请求级**：在已接通的连接上解析并处理 HTTP，再 `application.ProcessRequestAsync` 进中间件 |

更完整的从外到内：

```text
1. SocketConnectionListener.AcceptAsync     ← 接上连接（本文重点）
2. （https 时）TLS 握手
3. HttpProtocol.ProcessRequests*            ← 解析 GET /api/demo
4. Hosting → 中间件 → 路由 → MVC
5. DemoController.Get() → "ok"
```

所以：

- 问「程序怎么监听、怎么接到浏览器？」→ 看 **`SocketConnectionListener`**  
- 问「接到之后怎么变成一次 HTTP 并进控制器？」→ 看 **`HttpProtocol` 及之后**

---

## 十二、如何调试本节？

建议断点：

| 断点位置 | 何时命中 |
|----------|----------|
| `SocketConnectionListener.Bind` | 启动时一次 |
| `CreateDefaultBoundListenSocket` 内的 `Bind(endpoint)` | 启动时，向 OS 要端口 |
| `listenSocket.Listen(...)` | 启动时，进入监听 |
| `AcceptAsync` 里 `AcceptAsync` 返回之后 | **每次新 TCP 连接**（浏览器打开/刷新若新建连接会进） |
| `_factory.Create` | 连接已接住，交给 Kestrel 上层 |
| （可选）`Socket.DoBind` / `Socket.Listen` | 若加载了 runtime 符号，可看到进入 SocketPal 前 |

想从托管跨到原生：在 `Socket.Bind` 上下断点后，用混合模式调试单步，可观察到转入 `Ws2_32!bind`（需启用原生调试）。日常把第九节的调用链理解清楚通常已足够。

操作建议：

1. 在 `Bind` 和 `AcceptAsync` 返回后各下一个断点  
2. F5 启动 → 应先停在 `Bind`  
3. 继续运行，再在浏览器访问 `https://localhost:31620/api/demo` → 停在 `Accept`  
4. 再 F5，后面才可能进到 `HttpProtocol` / 控制器  

若使用 HTTP/1.1 长连接，同连接上的第二次请求**不一定**再次 Accept（只再走 HTTP 解析）。要反复看到 Accept，可关浏览器标签重开，或看是否新建了连接。

---

## 十三、收束

把全文收成一条链：

```text
浏览器输入 URL
  → TCP 连到已 LISTEN 的端口
  →（Windows）Ws2_32 bind/listen/accept 与内核队列
  →（.NET）Socket / SocketPal / Interop.Winsock
  →（Kestrel）SocketConnectionListener
  → HttpProtocol → 中间件 → DemoController
```

对应本文结构：

1. **第一节**：自己用 Socket 把 Bind/Listen/Accept 跑通  
2. **第二～三节**：结论与浏览器侧行为  
3. **第四～八节**：Kestrel `SocketConnectionListener` 源码  
4. **第九节**：再挖到 Windows `bind` / `listen`（`Ws2_32.dll`）与内核行为模型  
5. **第十～十二节**：时间线、和 `HttpProtocol` 的边界、调试断点  

记住边界：

- **接电话** = Socket / Winsock / `SocketConnectionListener`  
- **听懂 HTTP、进控制器** = `HttpProtocol` 及之后  

浏览器能被「捕获」，是因为端口已 `listen`，连接被 `accept`——不是框架在监视地址栏。

相关阅读：

- [一次 GET /api/demo：从浏览器到控制器返回 ok，中间经过什么、怎么调试](/2026/08/05/aspnetcore-request-pipeline-debug/)
- [ASP.NET Core 10.0.10 源码地图](/2026/08/05/aspnetcore-10-source-map/)
- [从源码包到成功编译](/2026/08/05/aspnetcore-10-source-build-retrospective/)
