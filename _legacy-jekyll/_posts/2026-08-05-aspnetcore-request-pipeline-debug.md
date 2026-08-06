---
layout: post
author:     "Corey"
header-img: "img/post-bg-circuit-board.jpg"
header-mask: 0.25
title: "一次 GET /api/demo：从浏览器到控制器返回 ok，中间经过什么、怎么调试"
subtitle: "用 aspnetcore 源码里的 MvcSandbox + DemoController，把请求链路和断点顺序串起来"
date: 2026-08-05
catalog: true
tags: [ASP.NET Core, .NET 10, 源码调试, Kestrel, 路由, MVC, Web API]
---

> 前面两篇分别讲了「怎么编译」和「仓库里有什么」。  
> 这篇落到一条具体请求：浏览器打开 `https://localhost:31620/api/demo`，页面显示 `ok`——中间究竟跑了哪些代码？该怎么打断点跟进去？

仓库仍以本机这份为准：

```text
E:\github项目源码\aspnetcore-10.0.10\aspnetcore-10.0.10
```

可运行入口：`src\Mvc\samples\MvcSandbox`。

---

## 一、这条 URL 对应哪段业务代码？

样例里有一个最小 Web API 控制器：

```csharp
// src/Mvc/samples/MvcSandbox/Controllers/DemoController.cs
[ApiController]
[Route("api/[controller]")]
public class DemoController : ControllerBase
{
    [HttpGet]
    public string Get() => "ok";
}
```

含义很直接：

| 注解 / 约定 | 效果 |
|-------------|------|
| `[Route("api/[controller]")]` | `[controller]` → 类名去掉 `Controller` → `Demo` |
| `[HttpGet]` 无额外模板 | 路径就是 `GET /api/demo`（大小写不敏感） |
| 返回 `string` | 框架写成 HTTP 响应正文，浏览器看到 `ok` |

所以：

```text
https://localhost:31620/api/demo
  ≈  对本机已启动的 MvcSandbox 发 GET /api/demo
  →  最终执行 DemoController.Get()
  →  响应体 "ok"
```

端口 `31620` 以你本机启动时控制台 / `launchSettings` 为准；换端口不影响下面这条链路。

---

## 二、先分清：启动一次 vs 每个请求

| 时机 | 干什么 | 会不会每次刷新都跑？ |
|------|--------|----------------------|
| **进程启动** | 听端口、扫控制器、`MapControllers`、组中间件 | 否，只一次 |
| **每次请求** | Kestrel 解析 → 中间件 → 路由匹配 → 调 `Get()` → 写响应 | 是 |

下面讲的「从浏览器到 ok」，全部是**每个请求**路径。  
`Main` / `ConfigureServices` 不会在你每次按 F5 刷新时重跑。

启动时和本链路相关的登记（`Startup`）：

```csharp
// ConfigureServices
services.AddControllersWithViews();

// Configure
app.UseDeveloperExceptionPage();
app.UseStaticFiles();
app.UseRouting();
app.UseEndpoints(builder =>
{
    endpoints.MapControllers();  // 关键 DemoController.Get 生成 Endpoint
    // ... 还有 MapGet、MapControllerRoute、MapRazorPages 等
});

// CreateHostBuilder
.UseKestrel()
.UseStartup<Startup>();
```

`MapControllers()` 最终会为每个 action 生成带 `RequestDelegate` 的 Endpoint；  
控制器的委托大致是：构造 `ControllerActionInvoker`，再 `InvokeAsync()`（见 `ControllerRequestDelegateFactory`）。

---

## 三、总览：一次请求经过什么？

```text
浏览器 HTTPS GET /api/demo
    │
    ▼
① Kestrel：TLS/TCP → 解析 HTTP → 填好 HttpContext
    │
    ▼
② Hosting：把请求交给整条中间件管道
    │
    ▼
③ Startup 里登记的中间件（按顺序）
    DeveloperExceptionPage → StaticFiles → Routing → …
    │
    ▼
④ EndpointRoutingMiddleware：匹配到 DemoController.Get 这个 Endpoint
    │
    ▼
⑤ 管道继续走到「执行 Endpoint」的中间件
    │
    ▼
⑥ EndpointMiddleware：调用该 Endpoint 的 RequestDelegate
    │
    ▼
⑦ MVC：ControllerActionInvoker
    （过滤器 / 模型绑定；本例几乎为空）
    → DemoController.Get() 返回 "ok"
    │
    ▼
⑧ 把 "ok" 写成 HTTP 响应 → Kestrel 发回浏览器
```

---

## 四、逐步对应到源码

### ① 浏览器 → Kestrel

浏览器对监听端口发 HTTPS 请求，核心是：

```http
GET /api/demo HTTP/1.1
Host: localhost:31620
```

Kestrel（`src\Servers\Kestrel\`）负责：

- 接受连接、完成 TLS
- 解析请求行与头
- 构造 / 填充 `HttpContext`（例如 `Request.Path = /api/demo`）

可跟入口：`src\Servers\Kestrel\Core\src\Internal\HttpConnection.cs` 的 `ProcessRequestsAsync`。

### ② Hosting 接入应用

Kestrel 通过 Hosting 的 `IHttpApplication` 进入你的应用。  
关键一句：执行整条中间件组成的 `RequestDelegate`。

```csharp
// src/Hosting/Hosting/src/Internal/HostingApplication.cs
public Task ProcessRequestAsync(Context context)
{
    return _application(context.HttpContext!);
}
```

`_application` 就是 `Configure` 里 `UseXxx` 串起来的管道。

### ③ 中间件管道（MvcSandbox 实际顺序）

对 `/api/demo` 来说：

| 中间件 | 这次请求大致做什么 |
|--------|--------------------|
| `UseDeveloperExceptionPage` | 正常则直接 `next`；出错才渲染开发者异常页 |
| `UseStaticFiles` | 不是 wwwroot 静态文件 → `next` |
| `UseRouting` | **匹配路由，选出 Endpoint**（尚未执行 action） |
| 其后的 Endpoint 执行中间件 | **真正调用**已选中的 Endpoint |

### ④ 路由匹配：为什么是 Demo.Get？

`UseRouting()` 对应 `EndpointRoutingMiddleware.Invoke`  
（`src\Http\Routing\src\EndpointRoutingMiddleware.cs`）：

- 用路径 `/api/demo` + 方法 `GET`
- 在启动时登记的 Endpoint 表里做匹配
- 命中 `DemoController.Get`，写入 `HttpContext`（`SetEndpoint`、route values）

**这一步只决定「该进谁」，还不会执行 `Get()`。**

### ⑤⑥ 执行 Endpoint

`EndpointMiddleware.Invoke`  
（`src\Http\Routing\src\EndpointMiddleware.cs`）：

- `httpContext.GetEndpoint()`
- 若存在 `endpoint.RequestDelegate`，则 `return endpoint.RequestDelegate(httpContext)`

对控制器 action，这个委托来自：

`src\Mvc\Mvc.Core\src\Routing\ControllerRequestDelegateFactory.cs`

逻辑大意：

```text
创建 ControllerContext
  → 从缓存取 invoker 相关信息与过滤器
  → new ControllerActionInvoker(...)
  → return invoker.InvokeAsync()
```

### ⑦ 进入控制器第一行

`ControllerActionInvoker`（继承资源调用管道）会：

1. 跑授权 / 资源 / action 等过滤器（本例几乎无额外逻辑）
2. 模型绑定（`Get` 无参数，很轻）
3. `InvokeActionMethodAsync`：通过 `ObjectMethodExecutor` **真正调用** `DemoController.Get`

此时你才到达：

```csharp
public string Get() => "ok";
```

### ⑧ `"ok"` 如何回到浏览器

返回的 `string` 会被 MVC 转成 `IActionResult`（通常经 `IActionResultTypeMapper`），再由 Result 执行器写入 `HttpContext.Response`：

- 状态码约 `200`
- Body：`ok`
- Content-Type 多为纯文本或按内容协商结果

然后：过滤器收尾 → invoker 结束 → 中间件返回 → Hosting 清理 → **Kestrel 把响应发出去** → 浏览器显示 `ok`。

---

## 五、如何调试：从打开解决方案到断点命中

目标：用**本仓库源码**跟完整调用栈，而不是只看自己项目里的 Controller。

### 步骤 1：只打开 MVC 子系统

不要硬开整个 `AspNetCore.slnx`。官方方式：

```powershell
cd E:\github项目源码\aspnetcore-10.0.10\aspnetcore-10.0.10\src\Mvc

# 若尚未还原/编译过该子树
.\build.cmd

# 用解决方案过滤器打开 Visual Studio
.\startvs.cmd
```

会打开 `Mvc.slnf`。

### 步骤 2：设置启动项目

1. 启动项目设为 **`MvcSandbox`**
2. 调试配置选 **项目名（Kestrel）**，**不要选 IIS Express**  
   - 仓库内跑 sample 用 IIS Express 容易遇到 ANCM 相关错误（官方 `BuildErrors.md` 也提醒过）

### 步骤 3：确认有 `DemoController`

路径：

```text
src\Mvc\samples\MvcSandbox\Controllers\DemoController.cs
```

若没有，按第四节代码补一个即可，保存后重新生成。

### 步骤 4：按「请求方向」下断点（推荐顺序）

第一次不必从 Kestrel 跟到死，先抓主干：

| 顺序 | 文件（仓库内） | 断在哪 | 你能看到什么 |
|------|----------------|--------|--------------|
| A | `src\Http\Routing\src\EndpointRoutingMiddleware.cs` | `Invoke` | 即将 / 正在匹配路由 |
| B | `src\Http\Routing\src\EndpointMiddleware.cs` | `Invoke` 里调用 `RequestDelegate` 处 | 已选中 Endpoint，准备执行 |
| C | `src\Mvc\Mvc.Core\src\Routing\ControllerRequestDelegateFactory.cs` | `invoker.InvokeAsync()` | 进入 MVC 调用器 |
| D | `src\Mvc\Mvc.Core\src\Infrastructure\ControllerActionInvoker.cs` | `InvokeActionMethodAsync` | 即将反射/执行 action 方法 |
| E | `DemoController.cs` | `Get()` 那一行 | **业务第一行** |

想再往「更底层」加两个（可选）：

| 顺序 | 文件 | 断在哪 |
|------|------|--------|
| 更早 | `src\Servers\Kestrel\Core\src\Internal\HttpConnection.cs` | `ProcessRequestsAsync` |
| Hosting | `src\Hosting\Hosting\src\Internal\HostingApplication.cs` | `ProcessRequestAsync` |

### 步骤 5：F5 启动，再发请求

1. 按 F5，等控制台出现监听地址（例如 `https://localhost:31620`）
2. 浏览器打开：`https://localhost:31620/api/demo`  
   （开发证书不信任时，按提示信任或先用 HTTP 端口）
3. 调试器应依次停在 A → B → C → D → E（若都下了断点）

### 步骤 6：用调用堆栈「反着读」

停在 `Get()` 时，打开 **Call Stack（调用堆栈）**：

```text
DemoController.Get
  ← ControllerActionInvoker.InvokeActionMethodAsync
  ← …过滤器管道 / ResourceInvoker…
  ← ControllerRequestDelegateFactory 生成的委托
  ← EndpointMiddleware.Invoke
  ← …中间件…
  ← EndpointRoutingMiddleware 之后的管道
  ← HostingApplication.ProcessRequestAsync
  ← Kestrel …
```

从下往上读 = 请求进来的路径；从上往下读 = 你平时写业务时「以为的顺序」的逆序。

### 步骤 7：几个实用调试技巧

1. **条件断点**  
   在 `EndpointRoutingMiddleware.Invoke` 上设条件，例如路径包含 `api/demo`，避免被静态文件等其它请求刷屏。

2. **监视窗口**  
   在路由匹配之后看：
   - `httpContext.Request.Path`
   - `httpContext.GetEndpoint()?.DisplayName`
   - `httpContext.Request.RouteValues`

3. **单步 vs 跳出**  
   - 进框架细节：F11  
   - 从框架回到下一层：Shift+F11  
   - 只想尽快到 `Get()`：可暂时只保留 E，或从 D 继续

4. **不要用 IIS Express 主机**  
   本仓库 sample 调试请用 Kestrel 项目配置。

5. **源码必须是当前解决方案编出来的**  
   用 `startvs.cmd` + 子目录 `build.cmd`，保证断点落在工作区 `.cs`，而不是只装了运行时的外部 DLL。

---

## 六、和「自己日常的 Web API 项目」怎么对照？

| 做法 | 适合什么 | 注意 |
|------|----------|------|
| **MvcSandbox + 本仓源码**（本文） | 搞清框架内部链路 | 样本不是你的业务仓 |
| 自己的 Web API + Source Link | 跟已发布符号对应的源码 | 不是你正在改的工作区副本 |
| 自己的项目 ProjectReference 到本仓工程 | 跟本地改动的框架 | 配置重，易和 Shared Framework 冲突 |

学习「请求到控制器第一行」，优先本文这条 **MvcSandbox** 路径。

---

## 七、收束

一次 `GET https://localhost:31620/api/demo` 的核心故事：

> **Kestrel** 收请求 → **Hosting** 进管道 → **Routing** 选中 `DemoController.Get` → **EndpointMiddleware** 执行 MVC 的 `RequestDelegate` → **ControllerActionInvoker** 调到 `Get()` 得到 `"ok"` → 写成响应 → 浏览器显示 **ok**。

调试时记住三件事：

1. `src\Mvc` 下 `build.cmd` + `startvs.cmd`  
2. 启动 **MvcSandbox + Kestrel**  
3. 断点顺序：**Routing → Endpoint → Invoker → DemoController.Get**，再用 Call Stack 串起来  

相关文章：

- [从源码包到成功编译：ASP.NET Core 10.0.10 完整构建复盘](/2026/08/05/aspnetcore-10-source-build-retrospective/)
- [ASP.NET Core 10.0.10 源码地图](/2026/08/05/aspnetcore-10-source-map/)
