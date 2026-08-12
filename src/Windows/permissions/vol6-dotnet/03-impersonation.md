---
title: "第 33 讲：模拟（Impersonation）入门"
sidebarGroup: "卷六·用代码改权限"
shortTitle: "第 33 讲：.NET 模拟"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 33 讲：模拟（Impersonation）入门

### 麻烦

第 32 讲你学会了用 .NET 改 ACL——但有种场景改 ACL 救不了你。假设你写了个文件预览服务，进程以 `LocalSystem` 跑（最高权限）。用户 A 连上来要读他自己的文件，你 `File.ReadAllText(path)` 一调，读出来了——因为 `LocalSystem` 啥都能读。可这个文件的 DACL 里其实有一条把 A 拒之门外的 Deny，正常 A 根本读不了。你的服务用**自己的**令牌去读，等于帮 A 越过了他自己的权限边界。

你要的是：**这一段代码，临时用 A 的身份去碰文件**，让 Windows 拿 A 的令牌做访问检查——A 能读就读出来，不能读就老老实实报「拒绝访问」。这就叫模拟（Impersonation）。

### 这一讲只发明：模拟（Impersonation）

模拟的本质：**让一根线程，临时挂上另一个人的令牌去干活**。

回忆第 5 讲——令牌挂在**进程**上。但 Windows 其实允许令牌更细粒度：**线程**可以额外带一张「模拟令牌（impersonation token）」。线程一旦挂上模拟令牌，它执行时的访问检查，用的就是这张模拟令牌，而不是进程自己的主令牌（primary token）。

```
进程（主令牌：LocalSystem）
 ├─ 线程 1（无模拟令牌）→ 访问检查用 LocalSystem
 └─ 线程 2（模拟令牌：用户A）→ 访问检查用 用户A
```

来源：[Impersonation（客户端/服务端安全）](https://learn.microsoft.com/en-us/windows/win32/secauthz/client-impersonation)

关键区分：**主令牌 vs 模拟令牌**。

- 主令牌：可以拿来**启动新进程**（`CreateProcessAsUser`）；
- 模拟令牌：只能**挂在当前线程**上用，不能拿去 fork 新进程。

所以模拟是「临时借用」而不是「彻底变身」——借来的令牌在你自己线程上用完还回去，进程的整体身份并没变。

口诀：

> **进程有主令牌，线程能借模拟令牌。**
> **借了就在你这根线程上用，用完还回去。**

### 令牌从哪来

模拟得先有一张现成的令牌。最常见的两个来源：

1. **`LogonUser`**：你手上**有用户名和密码**，调 `advapi32!LogonUser` 验一遍，拿到令牌。适合「我知道对方凭据、想以他身份跑一段」的本地工具或自托管服务。

2. **SSPI / RPC / SMB**：客户端通过网络连上来时，协议层（Kerberos / NTLM）会把客户端的令牌**委派给你的服务进程**。你根本不用知道密码——这是服务端模拟的标准姿势，IIS、SQL Server 的「集成 Windows 认证」背后全是这套。

来源：[SSPI 与模拟](https://learn.microsoft.com/en-us/windows/win32/secauthz/sspi)

### 模拟级别：对方能借到什么程度

客户端把令牌交给服务端时，可以指定**借多少**——这就是 `SECURITY_IMPERSONATION_LEVEL`（.NET 里对应 `TokenImpersonationLevel`）：

| 级别 | 服务端能做什么 |
|---|---|
| `Anonymous` | 啥都拿不到 |
| `Identification` | 只能查「你是谁」（拿到 SID），不能真去访问资源 |
| `Impersonation` | 能以你的身份访问**本机**资源 |
| `Delegation` | 能以你的身份**再去访问别的机器**（最强，域里要单独授权） |

绝大多数场景停在 `Impersonation`。`Delegation` 是个深坑：要在 AD 里给服务账号标「受信任委派」、配约束委派、Kerberos 得转发票据——这一讲只点一句「它存在、威力大、门也多」，真要用再查。

来源：[SECURITY_IMPERSONATION_LEVEL 枚举](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ne-winnt-security_impersonation_level)

### 怎么看见

**最小代码**——用 `LogonUser` 拿令牌，用 `WindowsIdentity.RunImpersonated` 跑一段：

```csharp
using System.Runtime.InteropServices;
using System.Security.Principal;
using Microsoft.Win32.SafeHandles;

[DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
static extern bool LogonUser(string user, string domain, string password,
    int logonType, int logonProvider, out IntPtr token);

const int LOGON32_LOGON_INTERACTIVE = 2;
const int LOGON32_PROVIDER_DEFAULT = 0;

// 1. 拿令牌
if (!LogonUser("alice", ".", "P@ssw0rd!",
        LOGON32_LOGON_INTERACTIVE, LOGON32_PROVIDER_DEFAULT, out IntPtr token))
    throw new System.ComponentModel.Win32Exception();

using var safe = new SafeAccessTokenHandle(token);

// 2. 看当前身份
Console.WriteLine($"外层：{WindowsIdentity.GetCurrent().Name}");

// 3. 用 alice 身份跑一段
WindowsIdentity.RunImpersonated(safe, () =>
{
    Console.WriteLine($"内层：{WindowsIdentity.GetCurrent().Name}");
    // 这里读文件、连数据库，访问检查全用 alice 的令牌
});

// 4. 出了 lambda 自动还原
Console.WriteLine($"外层：{WindowsIdentity.GetCurrent().Name}");
```

输出：

```
外层：DESKTOP-DEV\myservice
内层：DESKTOP-DEV\alice
外层：DESKTOP-DEV\myservice
```

`RunImpersonated` 是 .NET 现在推荐的写法——出了 lambda 自动还原，不用手动 Dispose。老代码里的 `WindowsIdentity.Impersonate(token)` 也能用，但你要自己 `using` 或调 `Undo`，忘了还原就是 bug。

**命令行对照**：模拟是线程级的，而 `whoami` 看的就是「当前线程当前身份」。所以在上面的内层里跑 `whoami` 会显示 alice——这正是「借了令牌」的效果。想直观看到线程的令牌，用 **Process Explorer**：双击进程 → Threads 标签 → 选中某根线程 → 看 `Token` 一栏，会显示它挂的模拟令牌（若有）。

来源：[WindowsIdentity.RunImpersonated](https://learn.microsoft.com/en-us/dotnet/api/system.security.principal.windowsidentity.runimpersonated)

### 收束

**你现在会了：** 模拟是什么（线程临时借别人的令牌）、主令牌和模拟令牌的区别、令牌从哪来（`LogonUser` 或 SSPI）、四个模拟级别，以及最小代码路径（`LogonUser` + `RunImpersonated`）。

**下一讲才需要：** 你刚把代码改得能以用户身份干活——可用户登录时那串密码、那张令牌，还藏在系统里。怎么让这堆凭据不被 mimikatz 一锅端？这就是卷七第一讲，Windows Hello。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 32 讲：.NET 改 ACL](./02-acl.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 34 讲：Windows Hello](../vol7-defense/01-windows-hello.md)
<!-- chapter-nav:end -->
