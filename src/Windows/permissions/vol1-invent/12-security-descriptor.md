---
title: "第 11 讲：安全描述符——Owner + DACL 放进同一份档案"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 11 讲：安全描述符"
order: 12
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：把前面几讲散装的安全信息收进一张「安全卡」——五格结构（Owner/Group/DACL/SACL/控制位）。三个角度实拍这张卡（icacls 人话、Get-Acl 结构化、SDDL 原文），外加「空 DACL 全员拒绝」的活演示——连 owner 都读不了，靠隐式 WRITE_DAC 才自救回来。
---

# 第 11 讲：安全描述符——Owner + DACL 放进同一份档案

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)，实测 2026-08-26。

---

## 开场

**🧑‍🏫 老师：**

前面几讲你认识了 **Owner**（第 6 讲，谁拥有）和 **DACL**（第 9 讲，谁能访问）。它们是两样不同的东西，但都**挂在同一个文件上**。问题来了：这堆「谁拥有」「谁能访问」「要不要审计」的信息，到底以什么形式、存在哪里？总不能东一块西一块散着放。

Windows 的答案是：打包成一份完整档案，贴在每个受保护对象身上——**安全描述符（Security Descriptor，SD）**。

打个比方：每个文件、文件夹、注册表项、打印机……都随身带着**一张安全卡**。谁想动它，系统先抽卡看：谁是主人（Owner）、谁能进来做什么（DACL）、哪些动作要被监控记录（SACL）、还有几个印章（控制位）说明卡本身的状态。微软定义：

> A security descriptor includes the security information associated with a securable object.

---

## 第 1 课：这张卡上有几格

**🧑‍🏫 老师：**

很多人以为安全卡只有「Owner + DACL」两格，其实有**五格**：

```text
Security Descriptor（安全描述符）
├── Owner            ← 所有者 SID（第 6 讲）
├── Group            ← 主组 SID（POSIX 兼容用，Windows 权限检查基本不看）
├── DACL             ← 谁能访问（第 9 讲，本卷主角）
├── SACL             ← 审计谁（第 14 讲再填）
└── Control flags    ← 卡本身的状态位（如 DACL 是否被保护、是否继承）
```

逐格：**Group** 是给 POSIX 子系统（Unix 的「文件主组」概念）留的格，NTFS 权限检查基本不参考，看到别紧张；**控制位**里最重要的一个是 **`SE_DACL_PROTECTED`**——「DACL 被保护、不从父级继承」，正是下一讲（继承）的关键开关。

> 一句话：**前面几讲的 Owner、DACL，都是这张卡上的格子；本讲把它们收进同一份档案，看清全貌。**

---

## 第 2 课：三个角度实拍这张卡

**🧑‍🏫 老师：**

**角度一：`icacls`（人话版，看 DACL 格）。** 拿系统文件实测：

```text
PS> icacls C:\Windows\explorer.exe
C:\Windows\explorer.exe NT SERVICE\TrustedInstaller:(F)
                        BUILTIN\Administrators:(RX)
                        NT AUTHORITY\SYSTEM:(RX)
                        BUILTIN\Users:(RX)
                        APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES:(RX)
                        APPLICATION PACKAGE AUTHORITY\所有受限制的应用程序包:(RX)
```

注意第一行——**explorer.exe 的「完全控制」给了 `TrustedInstaller`，不是管理员**：管理员只有 `RX`。这就是为什么你以管理员身份也删不掉系统文件——DACL 里没给你写/删（想动它得先 takeown，第 6 讲那套）。

**角度二：`Get-Acl`（结构化，一次看三格）。** 本机新建一个文件再看：

```powershell
PS> Set-Content C:\Lab\sd_demo.txt 'demo'
PS> Get-Acl C:\Lab\sd_demo.txt | Format-List Path,Owner,Group

Path  : …C:\Lab\sd_demo.txt
Owner : JZFZ\chengongyi          ← Owner 格：建文件的人（第 6 讲的印证）
Group : JZFZ\Domain Users        ← Group 格：主组（域用户）

PS> (Get-Acl C:\Lab\sd_demo.txt).AccessToString
BUILTIN\Administrators Allow  FullControl
NT AUTHORITY\SYSTEM Allow  FullControl
BUILTIN\Users Allow  ReadAndExecute, Synchronize
NT AUTHORITY\Authenticated Users Allow  Modify, Synchronize   ← DACL 格：继承来的默认权限
```

`Get-Acl` 返回的对象就是整张安全卡的托管封装——Owner、Group、Access（DACL）三格一次列出。

**角度三：SDDL（一行文本的原始形态）。** 同一个文件：

```powershell
PS> (Get-Acl C:\Lab\sd_demo.txt).Sddl
O:S-1-5-21-3977539503-3587586693-2971573549-279405G:DUD:AI(A;ID;FA;;;BA)(A;ID;FA;;;SY)(A;ID;0x1200a9;;;BU)(A;ID;0x1301bf;;;AU)
```

**冒号把整串切成几段，每段对应一格**。逐段拆（本机真实输出）：

| 段 | 内容 | 含义 |
|---|---|---|
| `O:` | `S-1-5-21-…-279405` | **Owner**——我的 SID（完整形态） |
| `G:` | `DU` | **Group**——Domain Users（内置主体用两字母缩写） |
| `D:` | `D:AI(…)(…)` | **DACL**——`AI` 是控制位（自动继承），后面每个括号一条 ACE |
| ACE | `(A;ID;FA;;;BA)` | 允许 `BA`（Built-in Admins）`FA`（Full Access），`ID` = 继承来的 |
| ACE | `(A;ID;FA;;;SY)` | 允许 `SY`（SYSTEM）完全访问 |
| ACE | `(A;ID;0x1200a9;;;BU)` | 允许 `BU`（Built-in Users）`0x1200a9`（读+执行的位掩码） |
| ACE | `(A;ID;0x1301bf;;;AU)` | 允许 `AU`（Authenticated Users）`0x1301bf`（修改的位掩码） |

三个看点：**SID 两种写法并存**——内置主体缩写（`BA`/`SY`/`AU`/`BU`/`DU`）、自建的写全；**ACE 里的 `ID` 标志**对应 `icacls` 的 `(I)`（继承来的，下讲主角）；**掩码两种写法并存**——`FA` 缩写或 `0x1301bf` 十六进制（第 7 讲的 access mask 现原形）。

你不用背 SDDL 语法——只要记住它是**把安全卡序列化成一行文本**：`O:` Owner、`G:` Group、`D:` DACL、括号里一条条 ACE。很多工具（netsh、注册表导出、WMI）底层都用它存权限；完整语法查[附录·SDDL](../appendix/02-sddl.md)。

**C# 读写整张卡**（`FileSecurity` 就是 SD 的托管封装）：

```csharp
FileSecurity sd = File.GetAccessControl(@"C:\Lab\sd_demo.txt");
Console.WriteLine(sd.GetOwner(typeof(NTAccount)));   // Owner 格
Console.WriteLine(sd.GetGroup(typeof(NTAccount)));   // Group 格
sd.AddAccessRule(new FileSystemAccessRule(           // DACL 格加一条 ACE
    "Everyone", FileSystemRights.ReadData, AccessControlType.Allow));
File.SetAccessControl(@"C:\Lab\sd_demo.txt", sd);    // 写回整张卡
```

---

## 插问：一个要命的反直觉点——空 DACL ≠ 无 DACL？

**🧑‍🎓 学生：** 听说这里有个经典安全陷阱？

**🧑‍🏫 老师：**

对，DACL 这格有**三种状态**，差别天壤：

| DACL 状态 | 含义 | 结果 |
|---|---|---|
| **有 DACL**（有 ACE） | 按名单判 | 名单说了算 |
| **空 DACL**（存在但零条 ACE） | 名单是空的，**没人被允许** | **全员拒绝**（连 owner 都进不去） |
| **无 DACL**（根本没这格） | 系统当作「没上锁」 | **全员允许**（谁都能完全控制） |

微软原文：**"An empty DACL denies all access to the object. A null DACL grants full access to everyone."** ——「空名单」和「没名单」是反义词：空 DACL = 挂着锁但没人有钥匙；无 DACL = 门上根本没挂锁。后者是安全漏洞高发地——很多程序创建对象时没正确设 DACL，结果全员可写被攻击者利用；所以系统创建文件时通常给一个从父级继承的默认 DACL，不让它裸奔。

**空 DACL 这半边可以当场做**（本机实测）——把一个文件清成零条 ACE：

```powershell
PS> Set-Content C:\Lab\sd_empty.txt 'x'
PS> icacls C:\Lab\sd_empty.txt /inheritance:r     # 关继承且不加任何授权
PS> icacls C:\Lab\sd_empty.txt
C:\Lab\sd_empty.txt                                ← 名单空空如也（零条 ACE）

PS> Get-Content C:\Lab\sd_empty.txt
Get-Content : 对路径"…"的访问被拒绝。              ← 连 owner（我）都读不了！
```

全员拒绝实锤——owner 的隐式权利只有「改 DACL」，没有读数据（第 6 讲）。自救也验证了：`icacls /grant 'jzfz\chengongyi:(F)'`（凭隐式 WRITE_DAC），读回 `x`。至于「无 DACL 全员允许」那半边——创建 null DACL 需要绕过 .NET 的保护直接调底层 API，且本身就是危险操作，不在这台机器上演示，记住官方那句原话即可。

---

## 第 3 课：这张卡挂在哪些对象身上

**🧑‍🏫 老师：**

**不只是文件有安全描述符**。微软说它挂在一切「securable object」（受保护对象）身上：

- 文件、文件夹、命名管道、打印机；
- **注册表项**（每个键一张卡——卷四）；
- **Active Directory 对象**（每个用户/组/计算机对象——卷二）；
- **进程、线程、服务**、共享……

格式通用——学会读文件的安全卡，等于学会读所有受保护对象的权限。这也是 `Get-Acl` 既能对文件用、也能对注册表键用、还能对 AD 对象用的原因：底层都是同一份安全描述符。

---

## 收束

**你现在会了：**

- **安全描述符 = 收纳前面所有对象侧安全信息的一份档案**，五格：Owner、Group（POSIX 用）、DACL、SACL（第 14 讲）、控制位（含 `SE_DACL_PROTECTED`，下讲继承的开关）。
- 三个角度看它：`icacls`（DACL 人话版——explorer.exe 的 F 在 TrustedInstaller 手里）、`Get-Acl`（三格一次看）、**SDDL**（`O:`/`G:`/`D:` 段 + 括号 ACE + 十六进制掩码）。
- **空 DACL（全拒，连 owner 都读不了——实测）≠ 无 DACL（全开）**——后者是漏洞高发地。
- 结构通用：文件、注册表、AD、打印机……所有受保护对象同一种卡。

**下一讲才需要：** 文件夹下有成千上万文件时，如何避免逐个写 DACL——继承（Inheritance）。

---

<!-- chapter-nav:start -->
← 上一章：[第 10 讲：访问检查](./11-access-check.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 12 讲：继承](./13-inheritance.md)
<!-- chapter-nav:end -->
