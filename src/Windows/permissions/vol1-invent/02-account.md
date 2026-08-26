---
title: "第 1 讲：账户——系统眼里的「人」"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 1 讲：账户"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：账户存在哪（SAM 与 AD 两种库）、系统自带的内置账户一家人（RID 500/501/503/504）、怎么看见怎么管，以及护住账户的三道现代防线（LAPS/UAC/Credential Guard）——本机 net user、Get-LocalUser、注册表、BitLocker 现状全部实拍。
---

# 第 1 讲：账户——系统眼里的「人」

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)：LabUser1 / LabUser2 已就位。

---

## 开场

**🧑‍🏫 老师：**

接着第 0 讲的麻烦：同事登录同一台机器，打开你的报表，改了两行，或删了。系统若连「现在是谁」都分不清，后面谈不上任何保护。所以整个 Windows 权限体系的**第一块砖**，是先把「人」抽象成系统认识的东西。

Microsoft Learn 把能被 Windows **认证**的实体叫 **Security Principal（安全主体）**——用户、组、计算机都算（[官方文档](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)）。这一讲我们只把**用户账户**讲透：

> 账户 = 系统里登记过的一个「人」。登录时你证明「我是这个账户」，系统才认你。

但「账户」远不止一个名字。往下分三层：它**存哪**、它有**哪几种**、系统**怎么管它**。

---

## 第 1 课：账户存在哪——两种账户库

**🧑‍🏫 老师：**

第 0 讲的实验里出现过两个前缀：`jzfz\chengongyi`（我）和 `pc3507\labuser2`（实验账号）。先看我的档案：

```bat
C:\> whoami /user

用户信息
----------------

用户名          SID
=============== ================================================
jzfz\chengongyi S-1-5-21-3977539503-3587586693-2971573549-279405
```

（那串 `S-1-5-21-...` 是 SID，下一讲的主角，今天只当它是「账户的编号」。）关键是最前面的前缀——同一个「账户」，**登记在哪个库里，性质完全不同**：

| | 本地账户（Local Account） | 域账户（Domain Account） |
|---|---|---|
| **存在哪** | 本机的 **SAM** 数据库（`C:\Windows\System32\config\SAM`） | 域控制器上的 **Active Directory（AD）** |
| **谁能认证** | 只有**这台机器**认它 | 整个域里**任何加入域的机器**都认它 |
| **典型场景** | 个人电脑、家用机、没加域的服务器 | 公司环境，一个账号登录所有公司电脑 |
| **账户名形态** | `机器名\用户名`，如 `PC3507\LabUser1` | `域名\用户名`，如本机登录的 `jzfz\chengongyi` |
| **密码改在哪** | 本机（`net user` 或设置） | 域控制器（一次性，全域生效） |

**🧑‍🎓 学生：** 所以 `jzfz\chengongyi` 是域账户、`pc3507\labuser2` 是本地账户——同一台机器上混着两种人？

**🧑‍🏫 老师：**

对，而且这台机器正是观察两者的活标本：它**加域了**（`jzfz.local`，计算机名 `PC3507`），我日常登录用的是域账户；实验场里 `net user /add` 建的 LabUser1/2 是本地账户，躺在 SAM 里。

**SAM（Security Accounts Manager，安全账户管理器）** 就是本机那张「账户登记表」：存本机所有本地用户/组、以及密码的**哈希**（不是明文）。Windows 运行时会**锁定**这个文件——你打不开、复制不走（离线抓哈希为什么要关机拿镜像，本讲末尾的插问专门拆）。域账户不走 SAM：本机登录时把认证请求**转发给 DC** 验证，DC 背书了才放行。

> 🔑 **一句话**：都是「账户」，区别只在**身份登记在哪个库**——本机库（SAM）就是本地账户，集中库（AD）就是域账户。

顺带一个现代变化：近两年装 Win11 会发现 OOBE（首次开机引导）默认逼你登录微软账户（MSA）不让直接建本地账户——家用机按 `Shift+F10` 敲 `start ms-cxh:localonly` 可以跳出本地账户窗口。**企业域环境不受影响**：加域的机器走 AD 认证，本来就不碰 MSA。

---

## 第 2 课：系统自带的一家人——内置账户

**🧑‍🏫 老师：**

哪怕全新装好的 Windows，里面也已经躺着好几个账户——不是你建的，叫**默认本地账户**（[Local accounts，Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/identity-protection/access-control/local-accounts)）。本机实测（注意：我们建实验场之后，名单里多了 LabUser1/LabUser2）：

```bat
C:\> net user

User accounts for \\PC3507

-------------------------------------------------------------------------------
Administrator            CodexSandboxOffline      CodexSandboxOnline
DefaultAccount           Guest                    LabUser1
LabUser2                 user                     user1
WDAGUtilityAccount
The command completed successfully.
```

对照下表认人——**内置用户账户**（绝大多数默认禁用，删不掉也不该删）：

| 账户 | RID | 默认状态 | 干什么用的 |
|------|-----|---------|-----------|
| **Administrator** | `500` | 禁用 | 内置超级管理员，对本机一切资源有完全控制。安装时另建普通管理员账户进 Administrators 组，真正的 Administrator 反而被禁。**不能删、不能锁定**，可改名/禁用 |
| **Guest** | `501` | 禁用 | 临时访客低权限账户，默认空密码。能**匿名访问**，是安全风险，保持禁用 |
| **DefaultAccount（DSMA）** | `503` | 禁用 | Win10 1607 引入，给「多用户感知」类应用（如 Xbox shell）用 |
| **WDAGUtilityAccount** | `504` | 禁用 | 给 Windows Defender Application Guard（应用防护隔离）用 |
| **WSIAccount** | `1001` | — | **Win11 新增**，锁屏/登录页跑 Web 活动用（密码重置网页等），本机没出现——它是 Win11 才有 |

> 这里的 **RID** 是账户 SID 的最后一段——现在只需知道：**每个内置账户都有固定的、全 Windows 统一的 RID**（Administrator 永远 500、Guest 永远 501），所以攻击者不用猜就知道它们存在。这也是「改名 Administrator 防不住它还是 500」的伏笔，下一讲收。

**🧑‍🎓 学生：** 表里说 Administrator「默认禁用」——那这台机器实际上呢？

**🧑‍🏫 老师：**

问得好，这正是要当场验证的（⚠️ 表里的「默认状态」是出厂值，**不等于你这台机器的实际状态**）：

```powershell
PS> Get-LocalUser | Format-Table Name,Enabled -AutoSize

Name                Enabled
----                -------
Administrator          True      ← 本机被启用了（非默认）
CodexSandboxOffline    True      ← Claude Code 沙箱账户
CodexSandboxOnline     True      ← Claude Code 沙箱账户
DefaultAccount        False
Guest                 False      ← 符合默认（禁用）
LabUser1               True      ← 实验场建的
LabUser2               True      ← 实验场建的
user                  False
user1                 False
WDAGUtilityAccount    False
```

本机的 `Administrator` 是 **Enabled = True**——公司 IT 统一配置把内置管理员启用了。**书本上的「默认」和真实环境的「现状」经常不一致，`Get-LocalUser` 一跑就知道实际状态**——这也是安全巡检要从「查实际状态」入手的原因。

还有一类**默认本地「系统」账户**——不是给人用的，是给进程/服务用的，先混个脸熟：

| 账户 | SID | 干什么用的 |
|------|-----|-----------|
| **SYSTEM** | `S-1-5-18` | 操作系统和 Windows 服务内部登录用，权限极高（NTFS 卷上默认对一切文件完全控制），不在用户管理器出现，不能加进任何组 |
| **NETWORK SERVICE** | `S-1-5-20` | 服务控制管理器（SCM）用，以**本机计算机身份**向远程出示凭证 |
| **LOCAL SERVICE** | `S-1-5-19` | SCM 用，本机最低权限，网络上以**匿名**出现 |

---

## 第 3 课：怎么看见、怎么管

**🧑‍🏫 老师：**

看见当前登录的是谁，`whoami` 三连：

```bat
whoami              :: 当前账户名 → jzfz\chengongyi
whoami /user        :: 连 SID 一起 → 上面那串 S-1-5-21-...-279405
whoami /groups      :: 当前账户所属的所有组（本机实测一百多个，节选）
```

组清单里几行要认得：`Everyone (S-1-1-0)`、`NT AUTHORITY\Authenticated Users`（所有登录过的人）、`BUILTIN\Administrators (S-1-5-32-544)`（出现 = 本机管理员）、一串 `JZFZ\…项目组`（域里按项目分的权限组）、`Mandatory Label\高强制级别`（UAC 的完整性标签，卷三讲）。**账户「能干什么」由它属于哪些组决定**——组是第 8 讲的主角。

管理本机账户，三选一：

```bat
:: 1) 老牌命令行
net user                            :: 列出所有本地用户
net user LabUser1                   :: 看单个账户详情
net user 新用户名 密码 /add          :: 新建
net localgroup LabReaders LabUser1 /add   :: 加进组

:: 2) 现代 PowerShell（Microsoft.PowerShell.LocalAccounts 模块）
Get-LocalUser / New-LocalUser / Disable-LocalUser …

:: 3) 图形界面：compmgmt.msc → 系统工具 → 本地用户和组
```

看单个账户的完整档案（拿实验账号练手）：

```bat
C:\> net user LabUser1
User name                    LabUser1
Account active               Yes
Account expires              Never
Password last set            2026/8/26 8:38:41
Password expires             2026/11/26 8:38:41
Password required            Yes
Last logon                   Never
Local Group Memberships      *LabReaders           *Users
Global Group memberships     *None
The command completed successfully.
```

两行组隶属清清楚楚：`*LabReaders`（实验场建的组）和 `*Users`（所有本地用户默认进）。这就是实验场「组里的人」的档案。

写代码的话，.NET 一行读到当前身份（卷六展开）：

```csharp
WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.Name);            // jzfz\chengongyi
Console.WriteLine(id.IsAuthenticated); // True
```

---

## 第 4 课：护住账户——三道现代防线

**🧑‍🏫 老师：**

账户是身份的根，护住账户就是护住一切。微软给了三条针对**本地账户凭证**的现代防线，各管一段。本机现状一次查齐（先看结果再解释）：

```powershell
PS> Get-ItemProperty 'HKLM:\SOFTWARE\Policies\LAPS' -ErrorAction SilentlyContinue
（无输出——当前未查到 LAPS 策略键）

PS> Get-ItemProperty 'HKLM:\...\Policies\System' | Select EnableLUA,ConsentPromptBehaviorAdmin
EnableLUA                  : 0
ConsentPromptBehaviorAdmin : 0

PS> Get-CimInstance Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard
VirtualizationBasedSecurityStatus : 2      ← VBS 在跑
SecurityServicesRunning           : {0}    ← 列表里没有 2 → Credential Guard 没跑

PS> Get-BitLockerVolume C: | Select VolumeStatus,ProtectionStatus,EncryptionPercentage
VolumeStatus         : FullyDecrypted
ProtectionStatus     : Off
EncryptionPercentage : 0
```

逐道讲：

**防线一：LAPS——本地管理员密码不重复使用。** 要防的攻击：一批机器用同一个本地管理员密码（运维图省事常这么干），攻破一台拿到哈希就能横向打所有机器（Pass-the-Hash，插问 2 细讲）。**Windows LAPS** 给每台机器的本地管理员自动设**不同的随机密码**、定期轮换、加密备份到 AD——新版从 2023-04-11 起**内置进 Windows**（[官方文档](https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview)），旧 MSI 版已弃用。本机此刻查不到策略键——策略随公司 GPO 走，「查实际状态」原则同样适用。

**防线二：UAC——让管理员平时当普通人**（[卷三专讲](/Windows/permissions/vol3-rights-uac/03-uac)）。核心是**过滤令牌**：哪怕登录的是管理员账户，默认也只发普通权限的令牌跑日常程序；真要提权时弹窗确认，才临时给完整管理员令牌。打比方：警察平时枪套锁着，拔枪要先按确认键。注册表 `EnableLUA=1` 开启。**本机实测 `EnableLUA = 0`、`ConsentPromptBehaviorAdmin = 0`——UAC 被整个关掉了**：管理员程序不弹窗直接拿全权。很多公司 IT 为「少弹窗」统一关它，等于拆掉枪套锁——能做主的话建议设回 1。（这也解释了为什么我这个终端不弹任何窗就是管理员权限。）

**防线三：Credential Guard——把凭证关进虚拟保险柜**（[卷七专讲](/Windows/permissions/vol7-defense/02-credential-guard)）。登录后 Windows 把你的凭证（NTLM 哈希、Kerberos 票据）放在内存的 [LSASS](./05-logon-lsa.md) 进程里备着做单点登录；拿到管理员权限的攻击者能直接读它的内存把凭证抠走（mimikatz）。Credential Guard 用 **VBS** 在内存里划出一个与正常 OS 隔离的「飞地」，精简版 LSASS（LSAIso）住进去——**正常 OS 的管理员权限够不着那块内存**。本机实测：**「地基打了，保险柜没装」**——VBS 已在跑（=2），但 Credential Guard 没在运行（SecurityServicesRunning 里没有 2）。

| 防线 | 在哪个环节设防 | 一句话 |
|------|---------------|--------|
| **LAPS** | 密码**存在硬盘上**时 | 每台机器独立随机密码，防 SAM 哈希横向复用 |
| **UAC** | 管理员**日常跑程序**时 | 默认只给普通权限，提权才弹窗 |
| **Credential Guard** | 凭证**进了内存**后 | 虚拟化隔离飞地，防 mimikatz 从内存抠凭证 |

---

## 插问 1：mimikatz 为什么是 Credential Guard 的「假想敌」？

**🧑‍🎓 学生：** 你说 Credential Guard 防 mimikatz——这工具凭什么那么厉害，值得动用虚拟化来防？

**🧑‍🏫 老师：**

讲原理不讲操作——这是认识威胁，不是教攻击。mimikatz 是法国研究员 Benjamin Delpy 写的概念验证工具，最出名的能力：**从 LSASS 进程内存里把活动用户的凭证抠出来**（NTLM 哈希、Kerberos 票据，有时是明文密码）。MITRE ATT&CK 正式编号 **T1003.001**（[LSASS Memory](https://attack.mitre.org/techniques/T1003/001/)）。

**为什么能成（关键）**：单点登录要求凭证常驻 LSASS 内存；而管理员权限的进程**有权读本机几乎任何进程的内存**——包括 LSASS。两个设计叠加，是**结构性风险**，不是 bug，打补丁堵不死，只能靠「把凭证搬进管理员也够不着的隔离内存」根治——这就是 Credential Guard 存在的理由。

抠到之后：NTLM 哈希 → **Pass-the-Hash** 直接冒充登录；Kerberos 票据 → **Pass-the-Ticket** 向整个域要服务。对应防御除了 Credential Guard，还有 LSA Protection（RunAsPPL，禁止未签名进程碰 LSASS）和 Defender ASR 规则（直接拦「读取 lsass 内存」行为）。

---

## 插问 2：「离线抓哈希」是怎么回事？

**🧑‍🎓 学生：** 第 1 课说 SAM 运行时被锁、离线抓哈希要「关机拿镜像」——这句里塞了五个概念，拆一下？

**🧑‍🏫 老师：**

一步步来。**① 哈希**：Windows 不存密码明文。密码先经单向哈希（MD4，对 UTF-16LE 编码），变成 32 位十六进制——`P@ssw0rd` → `E19CCF29EE745F90BA3D5BAAE2C45D9A`——存进 SAM 的就是这串。不可逆。

**② 但哈希等同密码**：NTLM 认证协议的设计缺陷——**它认哈希不认密码**。验证「我是我」用的是哈希本身，所以攻击者拿到哈希就能直接认证，根本不用破解原密码。这叫 **Pass-the-Hash**：哈希 = 一张能直接刷门的卡。

**③ 护法一：SAM 文件锁**。机器开着时，`C:\Windows\System32\config\SAM` 看得见、打不开、复制不走——被系统锁死。（例外：SYSTEM 权限进程能在线读——mimikatz 走的路，前提是攻击者已拿到极高权限。）

**④ 绕过：关机 + 拿镜像**。锁是 Windows 加的，Windows 不跑锁就没了：

```text
1. 关机 → U 盘启动到另一个系统（WinPE / Linux Live）
        ↑ Windows 没启动 = SAM 文件锁不存在
2. 整块磁盘逐字节克隆成镜像拷走 → 自己电脑上慢慢提取 SAM
```

**⑤ 护法二：BitLocker 全盘加密**。把整个卷（连 SAM、系统文件、空闲空间）加密成密文；解密密钥由 TPM 在验证启动环境后自动释放。于是拿走镜像也全是密文：

| 攻击者拿到 | 没有 BitLocker | 有 BitLocker |
|-----------|---------------|--------------|
| 关机后的磁盘镜像 | ✅ 能提取 SAM 哈希 | ❌ 全是密文 |

本机实测：`Get-BitLockerVolume C:` → **`FullyDecrypted / Off / 0%`**——这条反制在这台机器上目前是缺的。整条攻防链一图收：

```text
密码 → (MD4 哈希) → 存进 SAM
                        │  护①：运行时文件锁
                        ▼
                 攻击者绕过 → 关机 + 拿镜像
                                    │  护②：BitLocker 全盘加密
                                    ▼
                          拿到哈希 → Pass-the-Hash 冒充登录
                                    │  护③：Credential Guard / LAPS（第 4 课）
```

每一道护法堵一个环节，缺一环就可能在那一环被突破。

---

## 收束

**你现在会了：**

- 账户 = 系统登记过的一个「人」，是整个权限体系的第一块砖。
- 按**登记位置**分本地账户（本机 SAM）和域账户（AD 集中库）——本机正好两种都有（`jzfz\chengongyi` vs `pc3507\LabUser1`）。
- 系统自带**内置账户**：Administrator（RID 500）、Guest（501）、DefaultAccount（503）、WDAGUtilityAccount（504）、Win11 的 WSIAccount（1001），外加 SYSTEM / NETWORK SERVICE / LOCAL SERVICE 三个系统账户。
- 看见用 `whoami`，管理用 `net user` / `Get-LocalUser` / MMC。
- 护账户三道防线：**LAPS**（密码怎么存）、**UAC**（权限怎么用）、**Credential Guard**（凭证怎么护）——每环都要**查实际状态**，本机实测就是 UAC 关、CG 未跑、BitLocker 未开的活教材。
- 点到的 [NTLM](/Windows/permissions/vol2-identity/03-ntlm) / [Kerberos](/Windows/permissions/vol2-identity/02-kerberos) / [LSASS](./05-logon-lsa.md) / [UAC](/Windows/permissions/vol3-rights-uac/03-uac) / [Credential Guard](/Windows/permissions/vol7-defense/02-credential-guard) 都只是先认脸，后面各有专讲。

**下一讲才需要：** 为什么系统内部更爱用那串 `S-1-5-21-...`（SID）而不是只记名字——以及为什么改名 Administrator 也防不住「它还是 500」。

---

<!-- chapter-nav:start -->
← 上一章：[第 0 讲：没有权限](./01-no-permission.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 2 讲：SID](./03-sid.md)
<!-- chapter-nav:end -->
