---
title: "第 31 讲：.NET 里的 Windows 身份"
sidebarGroup: "卷六·用代码改权限"
shortTitle: "第 31 讲：.NET 身份"
order: 1
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - ".NET"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：代码里的 whoami——WindowsIdentity 读令牌、WindowsPrincipal 问「在不在组里」。本机 PowerShell 实跑全套 API：Groups 164 个的真实令牌、IsInRole 双 True（UAC 关闭机器的必然结果）、组 SID Translate。
---

# 第 31 讲：.NET 里的 Windows 身份

> **卷六·用代码改权限（共 3 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26（`System.Security.Principal` 内置，PowerShell 直接跑）。官方锚点：[WindowsIdentity](https://learn.microsoft.com/dotnet/api/system.security.principal.windowsidentity)、[WindowsPrincipal.IsInRole](https://learn.microsoft.com/dotnet/api/system.security.principal.windowsprincipal.isinrole)。

---

## 开场：代码里的 whoami

**🧑‍🏫 老师：**

前五卷你都在用 `whoami`、`icacls`、属性页这些手工具。现在你写了个 .NET 程序——一个安装器、一个跑在服务账户上的后台服务——它得在动手之前回答：**「我（这个进程）是谁？我在哪个组？」** 命令行有 `whoami /all` 一把梭，代码里对应的 API 在哪？

第 5 讲讲过：登录成功后 LSA 发一张访问令牌挂在进程上。.NET 把「当前进程/线程的令牌」包成两个类：**`WindowsIdentity`**——令牌本身（用户是谁、SID、组）；**`WindowsPrincipal`**——在令牌之上多问一句「我在不在某个角色（组）里」。

---

## 第 1 课：读当前身份——GetCurrent()

**🧑‍🏫 老师：**

本机实跑（PowerShell 就是 .NET，一行即验）：

```csharp
WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine($"Name   : {id.Name}");
Console.WriteLine($"User   : {id.User?.Value}");
Console.WriteLine($"Level  : {id.ImpersonationLevel}");
Console.WriteLine($"Groups : {id.Groups.Count} 个");
```

```text
Name   : JZFZ\chengongyi
User   : S-1-5-21-3977539503-3587586693-2971573549-279405
Level  : None
Groups : 164 个        ← 本机真实数字（域账户 + 大量域组）
```

`ImpersonationLevel` 是 `None`——「用的是进程自己的令牌，没在假装别人」（模拟是第 33 讲的事，先认名字）。`id.Groups` 是一组 `IdentityReference`（实为 `SecurityIdentifier`），`Translate` 成可读名（实测节选）：

```text
JZFZ\Domain Users         S-1-5-21-…-513        ← 域用户主组（RID 513）
Everyone                  S-1-1-0
BUILTIN\Administrators    S-1-5-32-544
BUILTIN\Users             S-1-5-32-545
```

---

## 第 2 课：IsInRole——我在不在某个组里

**🧑‍🎓 学生：** `WindowsIdentity` 只告诉我令牌里有什么；要判断「我属不属于 Administrators」呢？

**🧑‍🏫 老师：**

套一层 `WindowsPrincipal`：

```csharp
WindowsPrincipal p = new(id);
p.IsInRole(WindowsBuiltInRole.Administrators);   // 枚举
p.IsInRole(@"JZFZ\节点入库-正式");                 // 组名字符串
p.IsInRole(new SecurityIdentifier("S-1-5-32-544")); // SID——最稳
```

本机实测：`Administrators? True`、`Users? True`——**两种入参三种形态里 SID 最稳**（不依赖显示语言、不依赖域名拼写，迁移后照样认得出）。

**一个会咬人的坑：UAC 把 Administrators 藏起来。** 账户明明在 Administrators 组里，**非提升**的进程跑 `IsInRole(Administrators)` 却返回 **False**——不是 bug，是 UAC 的过滤令牌：标准令牌里 Admin 组 SID 被标成「仅用于拒绝（deny-only）」，`IsInRole` 看不见它（[官方 Remarks](https://learn.microsoft.com/dotnet/api/system.security.principal.windowsprincipal.isinrole#remarks)）。本机返回 True 恰恰因为 UAC 被关了（第 22 讲的活标本）——在 UAC 正常的机器上，同一段代码在普通窗口就是 False。**查权限前先想清楚你要问「属于不属于」还是「此刻能不能」。**

---

## 第 3 课：和 whoami 对照——同一张令牌，两种看法

**🧑‍🏫 老师：**

`WindowsIdentity` 拿到的和 `whoami /all` 打出来的是**同一张令牌**——都读当前进程的令牌，没有第二份真相。差异只在呈现：`whoami /user` ↔ `id.Name/id.User`；`whoami /groups` ↔ 遍历 `id.Groups`（164 对 164）；`whoami /priv` ↔ 特权（`WindowsIdentity` 不直接暴露，要 LSA 那套，超纲）。

> **代码看到的身份，就是你登录时拿到的那张通行证。**

---

## 收束

**你现在会了：** `WindowsIdentity.GetCurrent()` 读当前进程身份（本机：Name/SID/None/164 组实测）、`WindowsPrincipal.IsInRole` 判组归属（SID 重载最稳）、UAC 让非提升进程的 Administrators「隐身」（本机 UAC 关 → True 的因果链）。

**下一讲才需要：** 拿到文件后用 .NET 读写它上面的 ACL——把令牌里的 SID 和资源上的「允许/拒绝」对应起来。

---

<!-- chapter-nav:start -->
← 上一章：[第 30 讲：排障案例集](../vol5-ops/03-troubleshooting-cases.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 32 讲：.NET 改 ACL](./02-acl.md)
<!-- chapter-nav:end -->
