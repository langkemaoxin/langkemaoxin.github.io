---
title: "第 11 讲：安全描述符——Owner + DACL 放进同一份档案"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 11 讲：安全描述符"
order: 12
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "NTFS"
  - "Active Directory"
  - "权限"
  - "安全"
---

# 第 11 讲：安全描述符——Owner + DACL 放进同一份档案

### 麻烦

前面几讲，你认识了 **Owner**（第 6 讲，谁拥有这个文件）和 **DACL**（第 9 讲，谁能访问、能做什么）。它们是两样不同的东西——但都是**挂在同一个文件上**的。问题是：

> 这堆"谁拥有""谁能访问""要不要审计"的信息，到底以什么形式、存在哪里？

总不能东一块西一块散着放。Windows 的答案是：把它们**打包成一份完整档案**，贴在每个受保护对象身上。这份档案，就叫**安全描述符（Security Descriptor，SD）**。

### 这一讲只发明：安全描述符（Security Descriptor）

#### 先打个比方：文件身上的"一张安全卡"

想象每个文件、每个文件夹、每个注册表项、每台打印机……都随身带着**一张安全卡**。任何人想动它，系统先抽出这张卡看一下：

- 这卡上写着**谁是主人**（Owner）；
- 写着**谁能进来、能做什么**（DACL，一张名单）；
- 写着**哪些动作要被监控记录**（SACL，一张审计名单）；
- 还盖了几个**印章**（控制位），说明这卡本身的一些状态。

这张卡，就是安全描述符。微软定义：

> A security descriptor includes the security information associated with a securable object.（安全描述符包含与某个受保护对象相关联的全部安全信息。）

来源：[Security Descriptors (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors)

#### 这张卡上到底有几格

很多人以为安全卡只有"Owner + DACL"两格。其实它有**五格**。微软原文列得很清楚，一张安全描述符包含：

| 格 | 装什么 | 对应哪讲 |
|---|---|---|
| **Owner** | 对象所有者的 SID（谁能改它的权限） | 第 6 讲 |
| **Group** | **主组**的 SID（主要用于 POSIX 兼容，Windows 权限检查基本不用） | 本讲补充 |
| **DACL** | 谁能访问、能做什么（允许/拒绝名单） | 第 9 讲 |
| **SACL** | 哪些访问动作要被审计记录（审计名单） | 第 14 讲（先留位） |
| **控制位（Control flags）** | 描述这份卡本身的状态（DACL 是否被保护、是否继承等） | 本讲 |

```text
Security Descriptor（安全描述符）
├── Owner            ← 所有者 SID（第 6 讲）
├── Group            ← 主组 SID（POSIX 用，Windows 权限基本不用）
├── DACL             ← 谁能访问（第 9 讲，本卷主角）
├── SACL             ← 审计谁（第 14 讲再填）
└── Control flags    ← 卡本身的状态位
```

逐格说明：

- **Owner / Group**：各存一个 SID。Owner 你已经熟；**Group** 这个格子大多数 Windows 用户用不到——它是为了兼容 POSIX 子系统（Unix 风格的"文件主组"概念），NTFS 权限检查基本不参考它。看到它别紧张，留个格而已。
- **DACL**：本卷的主角，那张允许/拒绝名单。
- **SACL**：审计用的，**第 14 讲细讲**，本讲只认个脸。
- **控制位**：一组开关，描述这份安全描述符**本身**的状态。最重要的一个是 **`SE_DACL_PROTECTED`**——它表示"DACL 被保护，不从父级继承"。这正是下一讲（继承）的关键开关：勾上它，父文件夹的权限就传不下来了。继承那讲会详谈。

> 一句话：**前面几讲讲的 Owner、DACL，都是这张卡上的格子；本讲只是把它们收进同一份档案，让你看清"全貌"。**

#### 一个要命的反直觉点：空 DACL ≠ 无 DACL

这是安全描述符最经典、也最危险的一个陷阱，必须单独讲。

DACL 这一格，有**三种状态**，差别天壤：

| DACL 状态 | 含义 | 结果 |
|---|---|---|
| **有 DACL**（正常，里面有 ACE） | 按名单判 | 名单说了算 |
| **空 DACL**（DACL 存在，但一条 ACE 都没有） | 名单是空的，**没人被允许** | **全员拒绝**（连 Owner 都进不去） |
| **无 DACL**（安全描述符里根本没这一格） | 系统当作"没上锁" | **全员允许**（谁都能完全控制） |

看出危险了吗？**"空名单"和"没名单"是反义词**：

- 空 DACL = 门上挂着锁，但钥匙串里一把能开的钥匙都没有 → 谁都进不去；
- 无 DACL = 门上根本没挂锁 → 谁都能进。

微软原文强调这个区别：

> It is important to distinguish between an empty DACL and the absence of a DACL. ... An empty DACL denies all access to the object. **A null DACL grants full access to everyone.**

（务必区分"空 DACL"和"没有 DACL"……空 DACL 拒绝一切访问；**null DACL 则给所有人完全访问权**。）

> ⚠️ 这是安全漏洞的高发地。很多程序创建对象时没正确设置 DACL，结果"没名单"→ 全员可写，被攻击者利用。所以创建文件/对象时，系统通常会给一个从父级继承来的默认 DACL，而不是让它"无 DACL"裸奔。

来源：[Security Descriptors (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors)、[Access Control Lists (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists)

### 怎么看见：三个角度看安全描述符

#### 角度一：`icacls`（人话版）

拿一个系统文件实测：

```bat
icacls C:\Windows\explorer.exe
```

```
C:\Windows\explorer.exe NT SERVICE\TrustedInstaller:(F)
                        BUILTIN\Administrators:(RX)
                        NT AUTHORITY\SYSTEM:(RX)
                        BUILTIN\Users:(RX)
                        APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES:(RX)
                        APPLICATION PACKAGE AUTHORITY\所有受限制的应用程序包:(RX)
```

`icacls` 把安全描述符里的 **DACL** 那格，翻译成人能读的格式（谁有什么权限）。注意第一行——**explorer.exe 的"完全控制"给了 `TrustedInstaller`，不是管理员**。这就是为什么你以管理员身份也删不掉系统文件：DACL 里管理员只有 `RX`（读+执行），没有写/删。`icacls` 只显示 DACL，想看 Owner 得加 `/ownership`。

#### 角度二：`Get-Acl`（PowerShell，结构化）

实测一个你新建的文件（在临时目录建一个测试文件再看）：

```powershell
PS> Set-Content $env:TEMP\sd_demo.txt 'demo'
PS> Get-Acl $env:TEMP\sd_demo.txt | Format-List Path, Owner, Group, AccessToString

Path           : ...\sd_demo.txt
Owner          : JZFZ\chengongyi          ← Owner 格：建文件的人
Group          : JZFZ\Domain Users         ← Group 格：主组（域用户）
AccessToString : BUILTIN\Administrators Allow  FullControl
                NT AUTHORITY\SYSTEM Allow  FullControl
                NT AUTHORITY\Authenticated Users Allow  Modify
                BUILTIN\Users Allow  ReadAndExecute, Synchronize  ← DACL 格：继承来的默认权限
```

注意它一次把 **Owner、Group、Access（DACL）** 三格都列出来了——这就是安全描述符的结构。**Owner 是你自己**（因为你建的文件）、**Group 是域用户组**、**DACL 那四条全是继承来的默认权限**（下一讲细讲继承）。`Get-Acl` 返回的对象，对应的就是整张安全卡。

> 顺带印证第 6 讲：**新建对象的 Owner 默认就是创建者**。你建 `sd_demo.txt`，Owner 自动是 `JZFZ\chengongyi`。

#### 角度三：SDDL（原始文本形态）

如果想看安全描述符**最原始的、一整串的文本形态**，那就是 **SDDL（Security Descriptor Definition Language，安全描述符定义语言）**。对上面那个 `sd_demo.txt` 实测：

```powershell
PS> (Get-Acl $env:TEMP\sd_demo.txt).Sddl
O:S-1-5-21-3977539503-3587586693-2971573549-279405G:DUD:(A;ID;FA;;;BA)(A;ID;FA;;;SY)(A;ID;0x1301bf;;;AU)(A;ID;0x1200a9;;;BU)
```

这串乱码看着吓人，其实有固定结构。**冒号 `:` 把它分成几段，每段对应安全描述符的一格**。逐段拆（这是上面那条真实输出的拆解）：

| 段 | 内容 | 含义 |
|---|---|---|
| `O:` 段 | `S-1-5-21-...-279405` | **Owner**——你的 SID（`JZFZ\chengongyi`），这里用完整 SID 形态 |
| `G:` 段 | `DU` | **Group**——`DU` = Domain Users（域用户组），这里用缩写 |
| `D:` 段 | `D:` 开头 | **DACL**（后面每个括号是一条 ACE） |
| ACE 1 | `(A;ID;FA;;;BA)` | 允许 `BA`（Built-in Admin）`FA`（Full Access），`ID`=继承来的 |
| ACE 2 | `(A;ID;FA;;;SY)` | 允许 `SY`（SYSTEM）完全访问 |
| ACE 3 | `(A;ID;0x1301bf;;;AU)` | 允许 `AU`（Authenticated Users）`0x1301bf`（= 修改的权限位掩码） |
| ACE 4 | `(A;ID;0x1200a9;;;BU)` | 允许 `BU`（Built-in Users）`0x1200a9`（= 读+执行的掩码） |

几个看点：

- **同一条 SDDL 里，SID 既可能写全（`S-1-5-21-...`）也可能写缩写（`BA`/`SY`/`AU`/`BU`）**——内置主体有约定俗成的两字母缩写，自建的只能写全。
- **每条 ACE 里的 `ID` 标志**，说明这条权限是**继承来的**（不是在这层显式设的）。这和 `icacls` 输出里的 `(I)` 是一回事——下讲细讲。
- 第 4 段的 `0x1200a9` 是一串**权限位的十六进制掩码**（第 7 讲说的 access mask）——SDDL 有时直接用数字、有时用 `FA`/`RX` 这种缩写，两种都合法。

> 你不用背 SDDL 语法（那是给程序和网管深查时用的）。**只要记住：SDDL 就是把这张安全卡"序列化"成一行文本**——`O:` 段是 Owner、`G:` 段是 Group、`D:` 段是 DACL、括号里一条条是 ACE。很多工具（netsh、注册表导出、WMI）底层都用 SDDL 存权限。

来源：[icacls (Microsoft Learn)](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)、[Security Descriptor Definition Language (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptor-definition-language)

#### 用 C# 读写安全描述符

.NET 里，`FileSecurity`（或 `DirectorySecurity`）对象就是一份安全描述符的托管封装：

```csharp
// 读出整张安全卡
FileSecurity sd = File.GetAccessControl(@"C:\Temp\test.txt");

Console.WriteLine(sd.GetOwner(typeof(NTAccount)));     // Owner 格
Console.WriteLine(sd.GetGroup(typeof(NTAccount)));     // Group 格

// 在 DACL 那格加一条 ACE（第 9 讲的规则）
sd.AddAccessRule(new FileSystemAccessRule(
    "Everyone", FileSystemRights.ReadData, AccessControlType.Allow));

// 写回
File.SetAccessControl(@"C:\Temp\test.txt", sd);
```

`GetAccessControl` 拿到的就是完整的 `FileSecurity`（安全描述符），你可以在它上面动任何一格，再 `SetAccessControl` 写回。这和上一段 `Get-Acl` 是同一套东西的两种接口。

来源：[How to add or remove ACL entries (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/io/how-to-add-or-remove-access-control-list-entries)

### 这张卡挂在哪些对象身上

一个关键认知：**不只是文件有安全描述符**。微软原文说，安全描述符挂在"securable object"（受保护对象）身上——文件、文件夹只是最常见的，其实还有：

- 文件、文件夹、**命名管道**、**打印机**；
- **注册表项**（每个键都有自己的 SD）；
- **Active Directory 对象**（每个用户/组/计算机对象都有 SD）；
- **进程、线程、服务**、**共享**……

**只要是"受保护对象"，身上就贴着一张这种结构的安全卡。** 所以你学会读文件的安全描述符，等于学会了读所有 Windows 受保护对象的权限——格式是通用的。这也是为什么 `Get-Acl` 既能对文件用、也能对注册表键用、还能对 AD 对象用：它们底层都是同一份安全描述符。

### 收束

**你现在会了：**
- **安全描述符（SD）是把前面所有对象侧的东西收进的一份完整档案**——贴在每个受保护对象身上。它有五格：**Owner、Group（POSIX 用）、DACL、SACL（第 14 讲）、控制位**。
- 想看它：`icacls`（看 DACL）、`Get-Acl`（看 Owner+Group+DACL）、**SDDL**（一行文本的原始形态，`O:`/`G:`/`D:` 段 + 括号 ACE）。
- 用 C# 的 `FileSecurity` 读写整张卡。
- **一个要命的坑**：**空 DACL（全拒）≠ 无 DACL（全开）**——"没名单"反而等于"全员可进"，是安全漏洞高发地。
- 安全描述符是**通用结构**——文件、注册表、AD 对象、打印机……所有受保护对象都用同一种格式的安全卡。

**下一讲才需要：** 文件夹下有成千上万文件时，如何避免逐个写 DACL——继承（Inheritance）。

<!-- chapter-nav:start -->
← 上一章：[第 10 讲：访问检查](./11-access-check.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 12 讲：继承](./13-inheritance.md)
<!-- chapter-nav:end -->
