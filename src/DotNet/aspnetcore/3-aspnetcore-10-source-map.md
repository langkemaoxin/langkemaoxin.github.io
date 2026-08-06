---
title: "ASP.NET Core 10.0.10 源码地图：这个仓库究竟是什么、里面有哪些项目"
sidebarGroup: "ASP.NET Core"
shortTitle: "ASP.NET Core 源码地图"
order: 3
date: 2026-08-05
category: ".NET"
tag:
  - "ASP.NET Core"
  - ".NET 10"
  - "源码阅读"
  - "架构"
  - "Shared Framework"
  - "Kestrel"
  - "Blazor"
---

> 上一篇讲「怎么把这份源码编译出来」。  
> 这篇讲另一半问题：**编译的对象到底是什么？`src` 里那几十个目录各自干什么？**

仓库路径仍是：

```text
E:\github项目源码\aspnetcore-10.0.10\aspnetcore-10.0.10
```

粗略体量：`src` 下约 **42** 个一级目录、近 **700** 个 `.csproj`。  
下面不会逐个 `.csproj` 报账（那会变成电话簿），而是 **按一级领域逐一介绍**，重点领域再往下拆一层。

---

## 一、先定性：你手里不是业务网站

很多人打开目录后第一反应是：「这是哪个公司的 Web 项目吗？」

不是。

| 你以为它是 | 它实际是 |
|------------|----------|
| 一个可上线的业务网站 | **ASP.NET Core 框架本身的源码** |
| 几个 Controller + 页面 | **一整套可复用的库、服务器、模板、工具、安装包材料** |
| 用 NuGet 装进来的黑盒 | NuGet / Shared Framework 里那些 DLL **从这里编出来** |

更准确的一句话：

> 这是微软维护的 **ASP.NET Core monorepo**（多项目大仓库）。  
> 你平时写的 `Web API` / `MVC` / `Blazor`，底层大量 API 都来自这里编进 **`Microsoft.AspNetCore.App`** 共享框架的那些程序集。

它和「隔壁仓库」的关系也很重要（本仓**不包含**它们的完整源码）：

| 相关仓库 | 干什么 |
|----------|--------|
| [dotnet/runtime](https://github.com/dotnet/runtime) | .NET 运行时、BCL、部分底层扩展 |
| [dotnet/efcore](https://github.com/dotnet/efcore) | EF Core 数据访问 |
| [dotnet/razor](https://github.com/dotnet/razor) | Razor 编译器与 IDE 工具链的重要部分 |
| [aspnet/Docs](https://github.com/aspnet/Docs) | 文档站原文 |

所以：读本仓，是在读 **Web 框架层**；不是在读整个 .NET。

---

## 二、仓库顶层：先认门口，再进 `src`

打开根目录，真正要认的主要是这些：

| 路径 | 是什么 |
|------|--------|
| `src/` | **几乎全部产品源码**（本篇重点） |
| `eng/` | 构建脚本、Arcade 工程化（`build.cmd` 等） |
| `docs/` | 从源码构建、贡献流程等内部文档 |
| `artifacts/` | 本地构建产物（编过之后才有） |
| `.dotnet/` | 仓库脚本拉下来的锁定版 SDK（有 `global.json`） |
| `AspNetCore.slnx` | 超大解决方案；日常更常用各子目录的 `.slnf` |
| `.gitmodules` | Git 子模块声明（如 googletest） |
| `.vsconfig` | 建议安装的 Visual Studio 组件清单 |

记住分工：

```text
docs / eng     → 告诉你怎么编、怎么贡献
src            → 框架真正实现
artifacts      → 编出来的结果
```

---

## 三、一张总图：请求在框架里大概怎么走

读 `src` 之前，先有一张「公路图」。浏览器打到一个典型 ASP.NET Core 站点时，概念上经过：

```text
浏览器
  → 服务器（Kestrel / IIS+ANCM / HttpSys）     src/Servers
  → 主机与应用启动（Host / WebApplication）   src/Hosting, DefaultBuilder
  → HTTP 抽象与路由                           src/Http
  → 中间件管道                                 src/Middleware, Security…
  → 应用模型（MVC / Minimal API / Razor / Blazor / SignalR）
  → 你的业务代码
```

`Framework` 目录则像「打包车间」：把上面编好的许多程序集，收成你安装 SDK 时看到的 **Shared Framework / Targeting Pack**。

下面按组 **逐一介绍** `src` 一级目录。

---

## 四、请求主干：Hosting / Http / Servers

### 1. `Hosting` —— 应用怎么被「托起来」

**干什么：**  
主机模型、WebHost、与通用 Host 的衔接、测试宿主（`TestHost`）、Windows 服务托管等。  
没有 Hosting，你的中间件和终端点没有「进程级生命周期」可挂。

**你平时碰到的：**  
`IWebHostBuilder`、老式 `Startup`、集成测试里的 `TestServer` 等，根都在这附近。

**建议：** 想搞懂「应用从 Main 到第一个请求」必读。

### 2. `Http` —— HTTP 与路由的核心抽象

**干什么：**  
`HttpContext`、Request/Response、Features、Headers、Results，以及 **Routing**（路由匹配、端点路由）。  
这是几乎所有上层功能的地基。

**子目录直觉：**

| 子区域 | 含义 |
|--------|------|
| `Http.Abstractions` / `Http` / `Http.Features` | 上下文与特性模型 |
| `Routing` / `Routing.Abstractions` | 路由与 Endpoint |
| `Http.Results` | Minimal API 风格的结果类型 |
| `WebUtilities` 等 | 解析、编码等工具 |

**你平时碰到的：**  
`app.MapGet`、`HttpContext`、`IEndpointRouteBuilder`、自定义中间件签名里的 `RequestDelegate`。

### 3. `HttpClientFactory` —— 出站 HTTP 客户端工厂

**干什么：**  
`IHttpClientFactory`、命名/类型化 HttpClient、处理程序管道。  
解决「到处 `new HttpClient`」的生命周期与配置问题。

**你平时碰到的：**  
`builder.Services.AddHttpClient(...)`。

### 4. `Servers` —— 真正听端口的服务器

**干什么：**  
把「HTTP 抽象」接到操作系统/进程模型上。

主要子树：

| 子目录 | 角色 |
|--------|------|
| `Kestrel` | 跨平台默认 Web 服务器（最常读） |
| `IIS` | Windows 上 IIS 集成；含 **ANCM（C++）** |
| `HttpSys` | 基于 Windows HTTP Server API 的服务器 |
| `Connections.Abstractions` | 连接层抽象 |

**你平时碰到的：**  
`UseKestrel`、`launchSettings` 里的 Kestrel、IIS / IIS Express 部署、Hosting Bundle。

**建议：**  
- 学性能 / HTTP/2 / 传输层 → `Kestrel`  
- 学 Windows 生产部署 → `IIS`（可对照上一篇 ANCM 说明）

---

## 五、应用模型：Mvc / Razor / Components / SignalR / Grpc

### 5. `Mvc` —— MVC / API 控制器体系

**干什么：**  
控制器、过滤器、模型绑定/校验、格式化器、ApiExplorer、Tag Helpers、Razor Pages 与 MVC 的接合、MVC 测试宿主等。  
体积大，是「传统 ASP.NET Core Web」的主阵地之一。

**你平时碰到的：**  
`ControllerBase`、`[ApiController]`、`IActionResult`、Razor Pages 的 PageModel。

### 6. `Razor` —— Razor 视图引擎相关（框架侧）

**干什么：**  
与 Razor 视图编译、运行时能力相关的框架部分。  
注意：更偏编译器/工具链的大量代码在 **dotnet/razor** 仓库；这里是 ASP.NET Core 侧集成与运行时拼图。

**你平时碰到的：**  
`.cshtml`、视图编译、部分 Tag Helper 基础设施。

### 7. `Components` —— Blazor（组件模型）

**干什么：**  
Blazor 组件模型、服务端/WebAssembly/WebView、表单、QuickGrid、JS 互操作相关前端资源等。  
目录里既有 C#，也有大量 JS（`Web.JS`、`Shared.JS`）。

**子树直觉：**

| 区域 | 含义 |
|------|------|
| `Components` / `Endpoints` | 组件与端点宿主 |
| `Server` | Blazor Server |
| `WebAssembly` | Blazor WASM |
| `Web` / `Web.JS` | 浏览器侧 |
| `WebView` | 桌面/混合宿主 |
| `Forms` / `QuickGrid` | 表单与网格等组件 |

**你平时碰到的：**  
`.razor`、`RenderFragment`、`NavigationManager`、Blazor Server/WASM 模板。

### 8. `SignalR` —— 实时通信

**干什么：**  
Hub、协议、传输（WebSockets 等）、客户端（含多语言客户端目录）、服务器实现与样例。

**你平时碰到的：**  
`MapHub<T>`、JS / .NET 客户端、实时推送。

### 9. `Grpc` —— gRPC on ASP.NET Core

**干什么：**  
在 ASP.NET Core 上承载 gRPC 服务的集成层（与 grpc 生态配合）。

**你平时碰到的：**  
`MapGrpcService<T>`、HTTP/2 上的 gRPC 服务。

---

## 六、横切能力：中间件、安全、身份、防伪等

### 10. `Middleware` —— 官方中间件大礼包

**干什么：**  
一组可插拔中间件实现，几乎每个子目录对应一类横切能力。

常见例子：

| 子目录 | 日常对应 |
|--------|----------|
| `StaticFiles` | 静态文件 |
| `Session` | Session |
| `ResponseCaching` / `OutputCaching` | 缓存响应 |
| `ResponseCompression` | 压缩 |
| `Rewrite` | URL 重写 |
| `CORS` | 跨域 |
| `RateLimiting` | 限流 |
| `HttpLogging` / `HttpOverrides` | 日志与代理头 |
| `HealthChecks*` | 健康检查中间件侧 |
| `WebSockets` | WebSocket 中间件 |
| `Spa` | SPA 回退等历史能力 |

**建议：** 不必通读；按你正在用的中间件进对应子目录即可。

### 11. `Security` —— 认证 / 授权 / Cookie 策略

**干什么：**

- `Authentication`：认证处理器、方案、Cookie/JwtBearer/OpenIdConnect 等大量包  
- `Authorization`：策略、要求、处理器  
- `CookiePolicy`：Cookie 策略中间件  

**你平时碰到的：**  
`AddAuthentication`、`[Authorize]`、`LoginPath`、JWT Bearer。

### 12. `Identity` —— ASP.NET Core Identity

**干什么：**  
会员体系：用户/角色存储抽象、EF Core 存储、UI（Identity UI）、扩展点。

**你平时碰到的：**  
`AddIdentity`、`IdentityUser`、脚手架出来的 Login/Register 页。

### 13. `Antiforgery` —— 防 CSRF

**干什么：**  
防伪令牌生成与校验，和表单、header 配合。

**你平时碰到的：**  
`ValidateAntiForgeryToken`、自动 antiforgery 过滤器。

### 14. `Analyzers` —— Roslyn 分析器（仓库级）

**干什么：**  
编译期诊断/代码修复，帮你在写 ASP.NET Core 应用时尽早发现问题。  
（MVC 等目录下往往还有更局部的 Analyzers。）

---

## 七、基础设施与横向库

这些目录不一定出现在「请求公路」正中间，但几乎处处被依赖。

### 15. `Caching`

内存缓存、分布式缓存抽象与实现相关程序集。  
日常：`IMemoryCache`、`IDistributedCache`。

### 16. `DataProtection`

数据保护（密钥环、保护/解保护 API）。  
Cookie 认证、 antiforgery 等许多安全功能依赖它。

### 17. `HealthChecks`

健康检查核心抽象与部分实现（EF 相关在 Middleware 或并列包中也有）。  
日常：`AddHealthChecks`、`/health`。

### 18. `Localization` / `Logging.AzureAppServices` / `Configuration.KeyPerFile`

- **Localization**：本地化/全球化支撑  
- **Logging.AzureAppServices**：在 Azure App Service 上的日志集成  
- **Configuration.KeyPerFile**：按文件名当 key 的配置源（容器场景常见）

### 19. `FileProviders` / `StaticAssets` / `Assets`

- **FileProviders**：文件提供程序相关扩展  
- **StaticAssets / Assets**：静态 Web 资产、构建期资源处理（与 SDK/静态文件故事相关）

### 20. `ObjectPool` / `WebEncoders` / `Html.Abstractions` / `JSInterop`

底层或跨切小库：对象池、Web 编码、HTML 抽象、JS 互操作抽象等。  
Blazor / MVC 都会用到其中一部分。

### 21. `OpenApi` / `Validation`

- **OpenApi**：OpenAPI 文档生成相关（与 `dotnet-openapi`、ApiExplorer 生态配合）  
- **Validation**：校验相关基础设施（和最小 API / 模型校验演进有关）

### 22. `Features` / `Extensions`

- **Features**：例如 JsonPatch 等「特性级」库  
- **Extensions**：对扩展特性的归类承载（本树里可见 Features 等）

体量相对主干较小，属于「用到再进」。

### 23. `Azure` / `SiteExtensions`

Azure 相关集成、站点扩展（Site Extension）安装/承载材料。  
更偏产品与运维交付，不是每天写业务必读。

---

## 八、产品打包、模板与工具

### 24. `Framework` —— Shared Framework 的打包心脏

**干什么（官方 README 大意）：**  
把 ASP.NET Core 的实现/引用程序集，打成共享框架与 targeting pack 相关资产。

| 子目录 | 含义 |
|--------|------|
| `App.Runtime` | 运行时共享框架：`Microsoft.AspNetCore.App` 那一套实现 |
| `App.Ref` | 编译期引用程序集、文档等设计时资产 |
| `App.Ref.Internal` | 内部版本标记，不对外发货 |

**为什么重要：**  
你本机 `dotnet --list-runtimes` 里看到的 `Microsoft.AspNetCore.App`，和这里的打包故事直接相关。  
完整构建时，这里是「收口」而不是「从零实现 HttpContext」的地方。

### 25. `DefaultBuilder` —— `WebApplication` 现代化入口

**干什么：**  
`WebApplication`、`WebApplicationBuilder` 等。  
也就是现在模板里常见的：

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
```

背后把 Host、配置、日志、默认中间件习惯用法收成更短的 API。

**建议：** 想从「现代模板」反推框架，这里是极好的入口。

### 26. `ProjectTemplates` —— `dotnet new` 模板

**干什么：**  
Web API / MVC / Blazor 等项目模板源码。  
你执行 `dotnet new webapi` 生成出来的那一坨，源头在这里维护。

### 27. `Installers` —— 安装包相关

**干什么：**  
Windows Hosting Bundle 等安装/打包侧工程与资源。  
和「服务器上装 Hosting Bundle」那条产品线对应。

### 28. `Tools` —— 命令行工具

例如：

| 工具 | 用途直觉 |
|------|----------|
| `dotnet-user-secrets` | 用户机密 |
| `dotnet-user-jwts` | 开发用 JWT |
| `dotnet-dev-certs` | 开发证书 |
| `dotnet-sql-cache` | SQL 分布式缓存库表 |
| `Microsoft.dotnet-openapi` / getdocument 系列 | OpenAPI 文档生成辅助 |

### 29. `Testing`

测试基础设施、辅助库，供框架自身和外部测试复用。  
（各业务目录下通常还有自己的 `test`。）

---

## 九、支撑目录：Shared、submodules、工程边角

### 30. `Shared`

**干什么：**  
跨多个项目共享的内部代码（通过链接/共享工程等方式复用），不是一个对外「产品包」目录。  
里面能看到路由、HTTP/2（Hpack）、测试证书、E2E 辅助、Razor 共享视图生成等大量「内部零件」。

**读源码时：**  
经常会从某个公开项目「跳」进 Shared；不要意外。

### 31. `submodules`

Git 子模块挂载点（如 googletest、MessagePack-CSharp）。  
完整构建原生测试等会用到；空目录就会炸（上一篇写过）。

### 32. `BuildAfterTargetingPack`

构建图里的特殊阶段工程：和 targeting pack 构建顺序相关。  
一般业务阅读可跳过，做完整构建/安装包时才会注意到。

### 33. 其他一级目录速查

| 目录 | 一句话 |
|------|--------|
| `Html.Abstractions` | HTML 相关抽象 |
| `FileProviders` | 文件提供程序扩展 |
| `Configuration.KeyPerFile` | 按文件配置源 |
| `Logging.AzureAppServices` | Azure 日志集成 |
| `ObjectPool` | 对象池 |
| `WebEncoders` | Web 编码工具 |
| `JSInterop` | JS 互操作 |
| `StaticAssets` / `Assets` | 静态资源/资产管线 |
| `OpenApi` | OpenAPI 集成 |
| `Validation` | 校验 |
| `Features` | JsonPatch 等特性 |
| `Extensions` | 扩展特性归类 |
| `Azure` / `SiteExtensions` | Azure / 站点扩展 |
| `Installers` | 安装包 |
| `ProjectTemplates` | 项目模板 |
| `Tools` | CLI 工具 |
| `Testing` | 测试基础设施 |
| `Analyzers` | 分析器 |
| `DefaultBuilder` | WebApplication 入口 |
| `Framework` | 共享框架打包 |

（上表与前文分组有重叠，方便检索。）

---

## 十、和「你日常安装的东西」怎么对应？

读源码地图时，用这张表对齐产品名：

| 你安装/引用的 | 大致从本仓哪些故事来 |
|---------------|----------------------|
| `Microsoft.AspNetCore.App` 共享框架 | 各功能目录实现 + `Framework/App.Runtime` 打包 |
| SDK 里的引用程序集 / targeting pack | `Framework/App.Ref` 等 |
| Hosting Bundle（IIS） | `Servers/IIS`（ANCM）+ `Installers` |
| `dotnet new` 网站模板 | `ProjectTemplates` |
| `WebApplication.CreateBuilder` | `DefaultBuilder` |
| NuGet 上单独的包（部分） | 对应 `src` 子项目（有的已并进共享框架） |

---

## 十一、想读源码时，怎么选入口？

按目标选目录，比「从根目录从头点到尾」有效得多：

| 你想搞懂… | 优先打开 |
|-----------|----------|
| 现代模板如何启动 | `DefaultBuilder` → `Hosting` |
| `HttpContext` / 路由 / Minimal API | `Http` |
| Kestrel 性能与协议 | `Servers/Kestrel` |
| IIS 部署与 ANCM | `Servers/IIS` |
| Controller / 过滤器 | `Mvc` |
| Blazor | `Components` |
| 登录授权 | `Security` + `Identity` + `DataProtection` |
| SignalR | `SignalR` |
| 某个中间件行为 | `Middleware/<名字>` |
| 共享框架里到底塞了啥 | `Framework` |

局部编译（上一篇的方法）也可以按目录：

```powershell
cd src\Http
.\build.cmd
```

---

## 十二、收束

这份 `aspnetcore-10.0.10` 源码，本质是：

> **ASP.NET Core 框架的生产车间**：  
> 服务器 + HTTP 管道 + 应用模型 + 安全身份 + 一堆中间件与工具，  
> 最后在 `Framework` 收成你机器上的 Shared Framework / 安装包资产。

`src` 一级目录可以记成四层：

1. **主干**：`Hosting`、`Http`、`Servers`  
2. **应用模型**：`Mvc`、`Razor`、`Components`、`SignalR`、`Grpc`  
3. **横切与基础设施**：`Middleware`、`Security`、`Identity`、缓存/数据保护/健康检查…  
4. **产品与工程**：`Framework`、`DefaultBuilder`、`ProjectTemplates`、`Tools`、`Installers`、`Shared`

下一篇若继续深挖，比较自然的选择是：单开一篇走读 `DefaultBuilder` + `Hosting`（从 `WebApplication.CreateBuilder` 跟到第一个中间件），或单开一篇走读 `Servers/Kestrel`。

相关文章：[从源码包到成功编译：ASP.NET Core 10.0.10 完整构建复盘](/2026/08/05/aspnetcore-10-source-build-retrospective/)
