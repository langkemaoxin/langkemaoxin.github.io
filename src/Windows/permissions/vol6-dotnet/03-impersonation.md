---
title: "第 33 讲：模拟（Impersonation）入门"
sidebarGroup: "卷六·用代码改权限"
shortTitle: "第 33 讲：.NET 模拟"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - ".NET"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：让一根线程临时挂上别人的令牌干活——主令牌 vs 模拟令牌、四个模拟级别、LogonUser 与 SSPI 两个令牌来源。本系列卷一已现场演示 inside/outside 身份切换，本讲补上「为什么服务端必须模拟」的权限边界逻辑。
---

# 第 33 讲：模拟（Impersonation）入门

> **卷六·用代码改权限（共 3 讲，本卷收官）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测（卷一第 5 讲已现场跑过完整演示）。官方锚点：[Client Impersonation](https://learn.microsoft.com/en-us/windows/win32/secauthz/client-impersonation)、[WindowsIdentity.RunImpersonated](https://learn.microsoft.com/dotnet/api/system.security.principal.windowsidentity.runimpersonated)。

---

## 开场：LocalSystem 啥都能读，反而是问题

**🧑‍🏫 老师：**

第 32 讲你学会用 .NET 改 ACL——但有种场景改 ACL 救不了你。假设你写了个文件预览服务，进程以 `LocalSystem` 跑（最高权限）。用户 A 连上来要读他自己的文件，你 `File.ReadAllText(path)` 一调，读出来了——因为 LocalSystem 啥都能读。可这文件的 DACL 里其实有一条把 A 拒之门外的 Deny，正常 A 根本读不了。你的服务用**自己的**令牌去读，等于**帮 A 越过了他自己的权限边界**。

**🧑‍🎓 学生：** 那要的是——这一段代码**临时用 A 的身份**去碰文件，让 Windows 拿 A 的令牌做访问检查：A 能读就读出来，不能读就老老实实报拒绝。

**🧑‍🏫 老师：**

这就是**模拟（Impersonation）**。本质：**让一根线程，临时挂上另一个人的令牌去干活**。回忆第 5 讲——令牌挂在**进程**上；但 Windows 允许更细粒度：**线程**可以额外带一张「模拟令牌」。线程一旦挂上它，访问检查用的就是模拟令牌而非进程的主令牌：

```text
进程（主令牌：LocalSystem）
 ├─ 线程 1（无模拟令牌）→ 访问检查用 LocalSystem
 └─ 线程 2（模拟令牌：用户A）→ 访问检查用 用户A
```

关键区分：**主令牌**可以拿来启动新进程（`CreateProcessAsUser`）；**模拟令牌**只能挂在当前线程上用、不能 fork 新进程。模拟是「临时借用」不是「彻底变身」——借来的令牌在自己线程上用完还回去，进程整体身份不变。

> **进程有主令牌，线程能借模拟令牌。借了就在你这根线程上用，用完还回去。**

---

## 第 1 课：令牌从哪来 + 现场回放

**🧑‍🏫 老师：**

两个最常见的来源：

1. **`LogonUser`**——你手上有用户名密码，调 `advapi32!LogonUser` 验一遍拿令牌。适合「我知道对方凭据、想以他身份跑一段」的本地工具；
2. **SSPI / RPC / SMB**——客户端通过网络连上来时，协议层（Kerberos/NTLM）把客户端的令牌**委派给你的服务进程**，你根本不用知道密码。这是服务端模拟的标准姿势——IIS、SQL Server 的「集成 Windows 认证」背后全是这套（第 16 讲 klist 里那张 `DELEGATION` 票就是它的痕迹）。

最小代码路径（`.NET` 推荐写法）：

```csharp
LogonUser("LabUser1", "PC3507", "P@ssw0rd1", 2, 0, out IntPtr token);   // 拿令牌
using var safe = new SafeAccessTokenHandle(token);
WindowsIdentity.RunImpersonated(safe, () =>
{
    // 这里的读文件/连库，访问检查全用 LabUser1 的令牌
});
// 出了 lambda 自动还原——不用手动 Undo
```

**本系列的现场回放**（卷一第 5 讲，本机真跑）：

```text
before  : JZFZ\chengongyi          ← 进程主令牌
  inside : PC3507\LabUser1          ← RunImpersonated 回调里：线程换上了 LabUser1 的令牌
  outside: JZFZ\chengongyi          ← 回调退出：自动换回主令牌
```

三行输出就是模拟的全部要义：**临时、线程级、自动可逆**。老代码里的 `WindowsIdentity.Impersonate(token)` 也能用，但要自己 `using`/`Undo`，忘了还原就是 bug——`RunImpersonated` 把「挂上→干活→摘下」绑成一个原子单元。

---

## 第 2 课：模拟级别——对方能借到什么程度

**🧑‍🎓 学生：** 客户端把令牌交给服务端，能限制借多少吗？

**🧑‍🏫 老师：**

能——`SECURITY_IMPERSONATION_LEVEL`（.NET 里 `TokenImpersonationLevel`）四档：

| 级别 | 服务端能做什么 |
|---|---|
| `Anonymous` | 啥都拿不到 |
| `Identification` | 只能查「你是谁」（拿 SID），不能访问资源 |
| `Impersonation` | 以你的身份访问**本机**资源 |
| `Delegation` | 以你的身份**再去访问别的机器**（最强，域里要单独授权） |

绝大多数场景停在 `Impersonation`。`Delegation` 是深坑：AD 里给服务账号标「受信任委派」、约束委派、Kerberos 转发票据（第 18 讲双跳的那套解药）——本讲只点「它存在、威力大、门也多」。

**把卷一的拼图接上**：`WindowsIdentity.GetCurrent().ImpersonationLevel` 就是这四档之一——第 31 讲实测它是 `None`（用主令牌、没在模拟）；第 5 讲 inside 那一刻它就是 `Impersonation`。而「模拟中读 Q1 被拒」的场景我们早见过——第 10 讲以 LabUser2 身份撞 `(DENY)(WD)` 的那声「拒绝访问」，就是模拟令牌被 DACL 正确拦截的现场：**模拟不绕权限，恰恰是让权限按真人算**。

---

## 收束

**你现在会了：** 模拟是什么（线程临时借别人的令牌——本系列 inside/outside 现场演示）、主令牌 vs 模拟令牌、令牌两个来源（LogonUser / SSPI）、四个模拟级别；以及最重要的边界认知：**模拟不是提权，是让访问检查回到「那个人本来的权限」**。

**下一卷才需要：** 你刚让代码能以用户身份干活——可用户登录时那串密码、那张令牌还藏在系统里。怎么让这堆凭据不被 mimikatz 一锅端？卷七开讲。

---

<!-- chapter-nav:start -->
← 上一章：[第 32 讲：.NET 改 ACL](./02-acl.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 34 讲：Windows Hello](../vol7-defense/01-windows-hello.md)
<!-- chapter-nav:end -->
