---
title: "第 32 讲：用 .NET 读写文件 ACL"
sidebarGroup: "卷六·用代码改权限"
shortTitle: "第 32 讲：.NET 改 ACL"
order: 2
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 32 讲：用 .NET 读写文件 ACL

### 麻烦

上一讲你学会用 `WindowsIdentity.GetCurrent()` 在代码里拿到当前进程是谁、在哪些组。可光有身份不够——你要做的事是**给某个文件夹加一条「项目组只读」规则**。命令行 `icacls` 能干，可一旦要嵌进 C# 程序、在几千个目录上按业务逻辑动态授权，`Process.Start("icacls ...")` 拼字符串就成了笑话。我们需要一套**能把 ACL 当对象操作**的 API。

### 这一讲只发明：把 ACL 当对象——FileSecurity 与 FileSystemAccessRule

.NET（`System.Security.AccessControl` 命名空间）把第 9 讲那套「DACL = 一串 ACE」映射成对象：

- **`DirectorySecurity` / `FileSecurity`**：一个目录/文件的整张 DACL；
- **`FileSystemAccessRule`**：一条 ACE——谁（`IdentityReference`）、能做什么（`FileSystemRights`）、允许还是拒绝（`AccessControlType`）、怎么往下传（`InheritanceFlags` / `PropagationFlags`）。

来源：[DirectorySecurity 类](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.accesscontrol.directorysecurity)

#### 1. 读 ACL

读出来，遍历每一条规则：

```csharp
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

var di = new DirectoryInfo(@"D:\Archive\项目A");
DirectorySecurity sec = di.GetAccessControl();   // .NET 6+ Windows

foreach (FileSystemAccessRule rule in
         sec.GetAccessRules(includeExplicit: true,
                            includeInherited: true,
                            typeof(NTAccount)))
{
    Console.WriteLine($"{rule.AccessControlType,-6}" +
        $" {rule.IdentityReference,-30} {rule.FileSystemRights}");
}
```

输出大致这样：

```
Allow JZFZ\项目A-成员                  Modify, Synchronize
Allow NT AUTHORITY\SYSTEM              FullControl
Allow BUILTIN\Administrators           FullControl
Deny  JZFZ\离职账号                      FullControl
```

`GetAccessRules` 第三个参数 `typeof(NTAccount)` 表示「给我显示成 域\账号 名」；传 `typeof(SecurityIdentifier)` 则给 SID，正是第 5 讲令牌里那一串。  
来源：[FileSystemSecurity.GetAccessRules](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.accesscontrol.filesystemsecurity.getaccessrules)

#### 2. 加一条 ACE

构造规则、加进 DACL、再写回磁盘——**三步缺一不可**：

```csharp
var account = new NTAccount(@"JZFZ\项目A-审计");
var rule = new FileSystemAccessRule(
    account,
    FileSystemRights.Read | FileSystemRights.ExecuteFile,
    AccessControlType.Allow);

sec.AddAccessRule(rule);     // 只改内存里的对象
di.SetAccessControl(sec);    // 关键：写回磁盘才生效
```

口诀：

> **AddAccessRule 只改内存，SetAccessControl 才落盘。**
> 忘了最后那行，程序不报错、权限也没动——最阴的 bug。

`FileSystemRights` 是位标志，能 `|` 组合：`Read | ExecuteFile` 就等于 GUI 里的「读取和执行」。  
来源：[FileSystemRights 枚举](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.accesscontrol.filesystemrights)

#### 3. 继承标志怎么传

给**目录**加规则时，默认只影响这个目录本身，子项不继承。要让规则下传，得显式传 `InheritanceFlags`——它和第 12 讲的 Win32 标志、`icacls` 字母一一对应：

| GUI「应用于」 | `InheritanceFlags` | `PropagationFlags` | icacls 标记 |
|---|---|---|---|
| 仅此文件夹 | `None` | `None` | （无） |
| 此文件夹、子文件夹和文件 | `ContainerInherit \| ObjectInherit` | `None` | `(OI)(CI)` |
| 此文件夹和文件 | `ObjectInherit` | `None` | `(OI)` |
| 此文件夹和子文件夹 | `ContainerInherit` | `None` | `(CI)` |
| 仅子文件夹和文件（不含本目录） | `ContainerInherit \| ObjectInherit` | `InheritOnly` | `(OI)(CI)(IO)` |

构造时多带两个参数：

```csharp
var rule = new FileSystemAccessRule(
    account,
    FileSystemRights.Read,
    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
    PropagationFlags.None,
    AccessControlType.Allow);
```

名字别记反：「容器」装的是目录（`ContainerInherit` = 子目录继承），「对象」是叶子文件（`ObjectInherit` = 子文件继承）。  
来源：[InheritanceFlags 枚举](https://learn.microsoft.com/zh-cn/dotnet/api/system.security.accesscontrol.inheritanceflags)

#### 4. 和 icacls 互证

代码改完，永远拿 `icacls` 对一遍，别「自己骗自己」：

```bat
icacls "D:\Archive\项目A"
```

```
D:\Archive\项目A JZFZ\项目A-成员:(OI)(CI)(RX,W)
                  JZFZ\项目A-审计:(OI)(CI)(RX)
                  NT AUTHORITY\SYSTEM:(OI)(CI)(F)
```

`(OI)(CI)` 正对应代码里的 `ContainerInherit | ObjectInherit`，`(RX)` 是读取执行、`(F)` 是完全控制。能对上，说明那几行 C# 真的写对了。  
来源：[icacls](https://learn.microsoft.com/zh-cn/windows-server/administration/windows-commands/icacls)

口诀：

> **代码改权限，icacls 验权限。** 两边对得上，才敢收工。

### 怎么看见

把上面几段拼成最小脚本跑一次，再用 GUI 复核：右键文件夹 → 属性 → 安全 → 高级。每条 ACE 后面的「应用于」列，就是第 3 节那张表的图形版——你写 `(OI)(CI)`，它就显示「此文件夹、子文件夹和文件」。

### 收束

**你现在会了：** 用 `DirectorySecurity` / `FileSecurity` 读 DACL，用 `FileSystemAccessRule` 加 ACE，用 `InheritanceFlags` / `PropagationFlags` 控继承，并用 `icacls` 互证。  
**下一讲才需要：** 改别人目录的 ACL 要有相应权限，可你的程序此刻跑在**你自己**的令牌下。要让程序以**另一个用户**的身份去操作——就得模拟（Impersonation）。

---

<!-- chapter-nav:start -->
← 上一章：[第 31 讲：.NET 身份](./01-identity.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 33 讲：.NET 模拟](./03-impersonation.md)
<!-- chapter-nav:end -->
