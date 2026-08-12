---
title: "第 31 讲：.NET 里的 Windows 身份"
sidebarGroup: "卷六·用代码改权限"
shortTitle: "第 31 讲：.NET 身份"
order: 1
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 31 讲：.NET 里的 Windows 身份

### 麻烦

前五卷你都在用 `whoami`、`icacls`、属性页这些手工具查权限、改权限。现在你写了个 .NET 程序——一个装文件的安装器、一个跑在服务账户上的后台服务——它得在动手之前先回答一个问题：**「我（这个进程）是谁？我在哪个组？」** 命令行里有 `whoami /all` 一把梭，代码里对应的 API 在哪？

### 这一讲只发明：在托管代码里读出令牌（WindowsIdentity / WindowsPrincipal）

第 5 讲讲过，登录成功后 LSA 发一张访问令牌，挂在进程上。.NET 把「当前进程/线程的令牌」包成了两个类：

- **`WindowsIdentity`** —— 令牌本身：用户是谁、SID 是什么、属于哪些组；
- **`WindowsPrincipal`** —— 在令牌之上多问一句「我在不在某个角色（组）里」。

来源：[WindowsIdentity 类](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.principal.windowsidentity)

#### 1. 读当前身份：`GetCurrent()`

最常见的一行——拿到当前线程附着的令牌：

```csharp
using System.Security.Principal;

WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine($"Name   : {id.Name}");
Console.WriteLine($"User   : {id.User?.Value}");      // 用户 SID
Console.WriteLine($"Level  : {id.ImpersonationLevel}");
Console.WriteLine($"Groups : {id.Groups.Count} 个");
```

典型输出（域用户 `jzfz\chengongyi`）：

```
Name   : JZFZ\chengongyi
User   : S-1-5-21-3977539503-3587586693-2971573549-279405
Level  : None
Groups : 23 个
```

> `ImpersonationLevel` 多半是 `None`——意思是「用的是进程自己的令牌，没在假装别人」。模拟（Impersonation）是第 33 讲的事，这里先认得这个名字。

`id.Groups` 是一组 `IdentityReference`（实际就是 `SecurityIdentifier`），`Translate` 一下能拿到可读组名：

```csharp
foreach (IdentityReference g in id.Groups)
{
    string name = g.Translate(typeof(NTAccount)).Value;
    Console.WriteLine($"  {name,-40} {g.Value}");
}
```

来源：[WindowsIdentity.GetCurrent](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.principal.windowsidentity.getcurrent)

#### 2. `IsInRole`：我在不在某个组里

`WindowsIdentity` 只告诉你「令牌里有什么」；要判断「我属不属于 Administrators」，得再套一层 `WindowsPrincipal`：

```csharp
WindowsPrincipal p = new(id);
Console.WriteLine($"Administrators? {p.IsInRole(WindowsBuiltInRole.Administrators)}");
Console.WriteLine($"Users?          {p.IsInRole(WindowsBuiltInRole.User)}");
```

`IsInRole` 最常用的三种入参：**内置枚举**（`WindowsBuiltInRole`）、**组名字符串**（`"JZFZ\\节点入库-正式"`）、**SID**（`SecurityIdentifier`）。SID 重载最稳——不依赖显示语言、不依赖域名拼写，迁移到英文系统或改域后照样认得出。

来源：[WindowsPrincipal.IsInRole](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.principal.windowsprincipal.isinrole)

#### 一个会咬人的坑：UAC 把 Administrators 藏起来

账户明明在 Administrators 组里，非提升的进程跑 `IsInRole(Administrators)` 却返回 **`False`**。这不是 bug，是 UAC 的**过滤令牌（filtered token）**：标准用户令牌里，Admin 组的 SID 被标成「仅用于拒绝（deny-only）」，`IsInRole` 看不见它。只有**以管理员身份运行**时这个 SID 才被启用，`IsInRole` 才返回 `True`。

来源：[IsInRole 文档中的 UAC 说明](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.principal.windowsprincipal.isinrole#remarks)

口诀：

> **`WindowsIdentity` 是令牌，`WindowsPrincipal` 多问一句「在不在组里」。**
> **非提升进程里 Admin 组是隐身的——查权限前先想清楚你要「属于不属于」还是「能不能」。**

#### 3. 和 `whoami` 对照：同一张令牌，两种看法

`WindowsIdentity` 拿到的，和 `whoami /all` 打出来的，是**同一张令牌**——因为两者都读当前进程的令牌，没有第二份真相。差异只在呈现：

- `whoami /user`   ↔ `id.Name` / `id.User`
- `whoami /groups` ↔ 遍历 `id.Groups`
- `whoami /priv`   ↔ 令牌里的特权（`WindowsIdentity` 不直接暴露，要查特权得走 LSA 那套，超出本讲范围）

```bat
whoami /user
whoami /groups | findstr /i Administrators
```

把这两条的输出，和上面 C# 的输出并排放，SID 一模一样。**代码看到的身份，就是你登录时拿到的那张通行证。**

### 收束

**你现在会了：** 在 .NET 里用 `WindowsIdentity.GetCurrent()` 读出当前进程的身份（用户、SID、组），用 `WindowsPrincipal.IsInRole` 判断组归属，并且知道 UAC 会让非提升进程的 Administrators 组「隐身」。

**下一讲才需要：** 拿到一个文件之后，怎么用 .NET 读写它上面的 ACL——也就是把令牌里这些 SID，跟资源上的「允许 / 拒绝」登记对应起来。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 30 讲：排障案例集](../vol5-ops/03-troubleshooting-cases.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 32 讲：.NET 改 ACL](./02-acl.md)
<!-- chapter-nav:end -->
