---
title: "第 32 讲：用 .NET 读写文件 ACL"
sidebarGroup: "卷六·用代码改权限"
shortTitle: "第 32 讲：.NET 改 ACL"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - ".NET"
  - "ACL"
  - "权限"
  - "对话实录"
description: 师生对话实录课：把 ACL 当对象——FileSecurity 与 FileSystemAccessRule。本机实跑全套：读出第 28 讲配的 ProjLib DACL 逐条、代码加一条 ACE 后 icacls 立刻现身——「代码改权限、icacls 验权限」的互证闭环。
---

# 第 32 讲：用 .NET 读写文件 ACL

> **卷六·用代码改权限（共 3 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[DirectorySecurity](https://learn.microsoft.com/dotnet/api/system.security.accesscontrol.directorysecurity)、[InheritanceFlags](https://learn.microsoft.com/dotnet/api/system.security.accesscontrol.inheritanceflags)。

---

## 开场：拼 icacls 字符串是笑话

**🧑‍🏫 老师：**

上一讲你能在代码里拿到「我是谁」。可你要做的是**给某个文件夹加一条「项目组只读」**——命令行 `icacls` 能干，可要嵌进 C# 程序、在几千个目录上按业务逻辑动态授权，`Process.Start("icacls …")` 拼字符串就成了笑话。我们需要一套**能把 ACL 当对象操作**的 API。

`.NET`（`System.Security.AccessControl`）把第 9 讲的「DACL = 一串 ACE」映射成对象：**`DirectorySecurity`/`FileSecurity`** = 整张 DACL；**`FileSystemAccessRule`** = 一条 ACE——谁（IdentityReference）、能做什么（FileSystemRights）、Allow 还是 Deny、怎么往下传（InheritanceFlags/PropagationFlags）。

---

## 第 1 课：读 ACL + 加 ACE——本机全流程实跑

**🧑‍🏫 老师：**

**读**：拿第 28 讲亲手配的 ProjLib 来读（PowerShell 实跑）：

```csharp
var di = new DirectoryInfo(@"C:\Lab\share\proj");
DirectorySecurity sec = di.GetAccessControl();
foreach (FileSystemAccessRule rule in
         sec.GetAccessRules(true, true, typeof(NTAccount)))
    Console.WriteLine($"{rule.AccessControlType,-6} {rule.IdentityReference,-38} {rule.FileSystemRights}");
```

```text
Allow  NT AUTHORITY\Authenticated Users   ReadAndExecute, Synchronize
Allow  NT AUTHORITY\SYSTEM                FullControl
Allow  BUILTIN\Administrators             FullControl
Allow  PC3507\LabReaders                  Modify, Synchronize
```

——第 28 讲用 icacls 配的四条，代码读出来**一字不差**。`GetAccessRules` 第三个参数传 `typeof(NTAccount)` 显示成名字、传 `typeof(SecurityIdentifier)` 给 SID。

**加**：构造规则、加进 DACL、写回磁盘——三步缺一不可（实跑）：

```csharp
var rule = new FileSystemAccessRule(
    new NTAccount(@"PC3507\LabUser2"),
    FileSystemRights.Read, AccessControlType.Allow);
sec.AddAccessRule(rule);     // 只改内存里的对象
di.SetAccessControl(sec);    // 关键：写回磁盘才生效
```

```text
PS> icacls C:\Lab\share\proj
… PC3507\LabUser2:(OI)(CI)(R)     ← 代码加的 ACE，icacls 立刻看得见
```

> **AddAccessRule 只改内存，SetAccessControl 才落盘。** 忘了最后一行，程序不报错、权限也没动——最阴的 bug。**代码改权限，icacls 验权限，两边对得上才敢收工**（刚跑的互证闭环）。

---

## 第 2 课：继承标志怎么传

**🧑‍🎓 学生：** 给目录加规则时，怎么让它像 icacls 那样 `(OI)(CI)` 往下传？

**🧑‍🏫 老师：**

默认只影响目录本身；下传要显式传 `InheritanceFlags`——和第 12 讲的 Win32 标志、icacls 字母一一对应：

| GUI「应用于」 | `InheritanceFlags` | `PropagationFlags` | icacls 标记 |
|---|---|---|---|
| 仅此文件夹 | `None` | `None` | （无） |
| 此文件夹、子文件夹和文件 | `ContainerInherit \| ObjectInherit` | `None` | `(OI)(CI)` |
| 此文件夹和文件 | `ObjectInherit` | `None` | `(OI)` |
| 此文件夹和子文件夹 | `ContainerInherit` | `None` | `(CI)` |
| 仅子文件夹和文件（不含本目录） | `ContainerInherit \| ObjectInherit` | `InheritOnly` | `(OI)(CI)(IO)` |

名字别记反：「容器」装目录（`ContainerInherit` = 子目录继承），「对象」是叶子文件（`ObjectInherit` = 子文件继承）。`FileSystemRights` 是位标志能 `|` 组合（`Read | ExecuteFile` = GUI 的「读取和执行」）。

---

## 收束

**你现在会了：** `DirectorySecurity`/`FileSecurity` 读 DACL（本机读出 ProjLib 四条一字不差）、`FileSystemAccessRule` 加 ACE（代码加、icacls 见——互证闭环）、`InheritanceFlags`/`PropagationFlags` 控继承（五档对照表）。

**下一讲才需要：** 改别人目录的 ACL 要有相应权限，可你的程序此刻跑在**你自己**的令牌下。要让程序以**另一个用户**的身份操作——模拟（Impersonation）。

---

<!-- chapter-nav:start -->
← 上一章：[第 31 讲：.NET 身份](./01-identity.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 33 讲：.NET 模拟](./03-impersonation.md)
<!-- chapter-nav:end -->
