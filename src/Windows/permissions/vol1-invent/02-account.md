---
title: "第 1 讲：账户——系统眼里的「人」"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 1 讲：账户"
order: 2
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

# 第 1 讲：账户——系统眼里的「人」

### 麻烦

同事登录同一台机器，打开你的报表，改了两行，或删了。

系统若连「现在是谁」都分不清，后面谈不上保护。整个 Windows 权限体系的**第一块砖**，就是先把「人」抽象成一个系统认识的东西——**账户**。

### 这一讲讲透：账户

Microsoft Learn 把能被 Windows **认证**的实体叫做 **Security Principal（安全主体）**。常见形态包括用户、组、计算机等；**这一讲我们先把「用户账户」彻底讲透**，组和计算机以后再开。
来源：[Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

白话：

> 账户 = 系统里登记过的一个「人」。
> 登录时你证明「我是这个账户」，系统才认你。

但「账户」这东西远不止一个名字那么简单。往下分三层：它**存哪**、它有**哪几种**、系统**怎么管它**。

---

### 一、账户存在哪：两种账户库

这是最容易被忽略、却最关键的一个区分。同一个「账户」，根据它登记在哪个库里，性质完全不同：

| | 本地账户（Local Account） | 域账户（Domain Account） |
|---|---|---|
| **存在哪** | 本机的 **SAM** 数据库（`C:\Windows\System32\config\SAM`） | 域控制器上的 **Active Directory（AD）** |
| **谁能认证** | 只有**这台机器**认它 | 整个域里**任何加入域的机器**都认它 |
| **典型场景** | 个人电脑、家用机、没加域的服务器 | 公司环境，一个账号登录所有公司电脑 |
| **账户名形态** | `机器名\用户名`，如本机的 `PC3507\user` | `域名\用户名`，如本机登录的 `jzfz\chengongyi` |
| **密码改在哪** | 本机（`net user` 或设置） | 域控制器（一次性，全域生效） |

**SAM（Security Accounts Manager，安全账户管理器）** 是本机那张「账户登记表」：存的是本机所有本地用户/组、以及它们的密码**哈希**（不是明文）。Windows 运行时会**锁定**这个文件，你没法直接复制读它——这也是为什么离线抓哈希攻击要关机拿镜像（这句每个词什么意思，[见文末专节](#补离线抓哈希是怎么回事)）。来源：[Security Account Manager（维基）](https://en.wikipedia.org/wiki/Security_Account_Manager)

域账户不走 SAM，它存在域控制器（DC）的 Active Directory 里。一台机器加域后，登录时本机会把认证请求**转发给 DC** 验证，DC 说「对，这是 `jzfz\chengongyi`」本机才放行。**所以域账户的本质是：身份由一个集中权威（DC）背书，本机只是借用。**

> 🔑 **一句话**：都是「账户」，区别只在**身份登记在哪个库**——本机库（SAM）就是本地账户，集中库（AD）就是域账户。后文讲到域时还会回来展开。

---

### 二、账户有哪几种：内置账户一览

哪怕一台全新装好的 Windows，里面也已经躺着好几个账户——不是你建的，是系统自带的，叫**默认本地账户（default local accounts）**。`net user` 一看就知道：

这些内置账户各有用途，**绝大多数默认禁用**，也不该删（删也删不掉）。来源：[Local accounts（Microsoft Learn，2026-04 更新）](https://learn.microsoft.com/en-us/windows/security/identity-protection/access-control/local-accounts)

> 🖥️ **实机演示**（在本机 `PC3507` 上跑 `net user` 的真实输出）：
>
> ```bat
> C:\Users\chengongyi> net user
>
> \\PC3507 的用户账户
>
> -------------------------------------------------------------------------------
> Administrator            CodexSandboxOffline      CodexSandboxOnline
> DefaultAccount           Guest                    user
> user1                    WDAGUtilityAccount
> 命令成功完成。
> ```
>
> 对照上面的表：`Administrator`（RID 500）、`Guest`（501）、`DefaultAccount`（503）、`WDAGUtilityAccount`（504）四个内置账户都在；`user` / `user1` 是本机自己建的本地账户；`CodexSandboxOffline` / `CodexSandboxOnline` 是开发沙箱（如 Claude Code 的运行沙箱）自动建的。这台机器上没出现 `WSIAccount`——它是 Win11 才有、且仅在用到锁屏 Web 功能时才可见，没有不代表不存在。

**默认本地「用户」账户：**

| 账户 | RID | 默认状态 | 干什么用的 |
|------|-----|---------|-----------|
| **Administrator** | `500` | 禁用 | 内置超级管理员，对本机一切资源有完全控制。安装时还会另建一个普通管理员账户放进 Administrators 组，真正的 Administrator 反而被禁。**不能删、不能锁定**，但可改名/禁用 |
| **Guest** | `501` | 禁用 | 给临时、一次性用户用的低权限账户，默认空密码。因为能**匿名访问**，是安全风险，强烈建议保持禁用 |
| **DefaultAccount（DSMA）** | `503` | 禁用 | Default System Managed Account，Win10 1607 引入。给「多用户感知」类应用用（如 Xbox shell），桌面版默认禁 |
| **WDAGUtilityAccount** | `504` | 禁用 | 给 **Windows Defender Application Guard**（应用防护隔离）用的预定义账户 |
| **WSIAccount** | `1001` | — | **Win11 新增**。锁屏/登录页上跑 Web 活动用（比如密码重置网页、网页认证） |

> 这里的 **RID（Relative Identifier，相对标识符）** 是账户 SID 的最后一段——SID 是下一讲的主角，现在只要知道：**每个内置账户都有一个固定的、全 Windows 统一的 RID**（Administrator 永远是 500、Guest 永远是 501），所以攻击者不用猜就知道它们存在。

> ⚠️ **表里的「默认状态」是出厂值，不等于你这台机器的实际状态。** 比如下一节本机实测就显示：这台机器的 `Administrator` 是**启用**的、而 `user`/`user1` 是**禁用**的——和上表的「默认」并不一致。想知道真实状态，跑 `Get-LocalUser`（下一节有实测输出），别假设默认。

**默认本地「系统」账户（不是给人用的，是给进程/服务用的）：**

| 账户 | SID | 干什么用的 |
|------|-----|-----------|
| **SYSTEM** | `S-1-5-18` | 操作系统和 Windows 服务内部登录用，权限极高（NTFS 卷上默认对一切文件有完全控制），不在用户管理器里出现，也不能加进任何组 |
| **NETWORK SERVICE** | `S-1-5-20` | 服务控制管理器（SCM）用的预定义账户，以**本机计算机身份**向远程服务器出示凭证 |
| **LOCAL SERVICE** | `S-1-5-19` | SCM 用的预定义账户，本机最低权限，网络上以**匿名**身份出现 |

系统账户这一类你平时看不到、也不用碰，但它们是「服务以谁的身份跑」的答案——以后讲服务权限时会用到。**这一讲先记住它存在即可。**

---

### 三、怎么看见、怎么管

**看见当前登录的是谁：**

```bat
whoami                       :: 打印当前账户名
whoami /user                 :: 连 SID 一起打印（SID 下一讲细讲）
whoami /groups               :: 列出当前账户所属的所有组
```

> 🖥️ **实机演示**（本机真实输出）：
>
> ```bat
> C:\Users\chengongyi> whoami
> jzfz\chengongyi
>
> C:\Users\chengongyi> whoami /user
>
> 用户信息
> ----------------
>
> 用户名          SID
> =============== ================================================
> jzfz\chengongyi S-1-5-21-3977539503-3587586693-2971573549-279405
> ```
>
> `jzfz` 是这台机器加入的**域**（或 NetBIOS 计算机名），`chengongyi` 是账户名，后面那串 `S-1-5-21-...-279405` 就是 SID——**末尾的 `279405` 是 RID**。注意它远大于 1000，且账户前缀是域（`jzfz\`）而不是机器名，说明 `chengongyi` 是个**域账户**，不是本机自己建的（本机建的是 `user`/`user1` 那种）。
>
> `whoami /groups` 会列出一长串组（本机实测有 160+ 个），节选几行：
>
> ```bat
> C:\Users\chengongyi> whoami /groups
>
> 组名                                         类型             SID
> ============================================= ================ ================================================
> Everyone                                      已知组          S-1-1-0
> BUILTIN\Administrators                        别名            S-1-5-32-544      ← 当前账户是管理员
> BUILTIN\Users                                 别名            S-1-5-32-545
> NT AUTHORITY\经过身份验证的用户               已知组          S-1-5-11
> JZFZ\CD-20260402-0001-S001_项目组             组              S-1-5-21-...-551401   ← 域里的项目权限组
> JZFZ\节点入库                                 组              S-1-5-21-...-474474
> Mandatory Label\高强制级别                    标签            S-1-16-12288
> ...
> ```
>
> `BUILTIN\Administrators` 出现 = 这个账户在本机有管理员权限；后面一堆 `JZFZ\...项目组` 是域里按项目/专业（建筑、结构、暖通…）分的权限组——**账户「能干什么」就是由它属于哪些组决定的**，组是下一卷的主角。

**列出 / 管理本机所有账户**，三选一：

```bat
:: 1) 老牌命令行：net user / net localgroup
net user                          :: 列出所有本地用户
net user Administrator            :: 看单个账户的详情
net user 新用户名 密码 /add        :: 新建用户并设密码（举例，不会自动执行）
net localgroup Administrators 新用户名 /add   :: 把某用户加进管理员组

:: 2) 现代 PowerShell：Microsoft.PowerShell.LocalAccounts 模块
Get-LocalUser                     :: 列出所有本地用户（含 Enabled 状态）
New-LocalUser -Name 新用户名 -Description "说明"   :: 新建
Disable-LocalUser -Name Guest     :: 禁用 Guest

:: 3) 图形界面：计算机管理 MMC（compmgmt.msc）
::    系统工具 → 本地用户和组 → 用户
```

来源：[net user 命令参考（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/net-user)（PowerShell 的 `Get-LocalUser` 等见 [LocalAccounts 模块](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.localaccounts/)）

> 🖥️ **实机演示**（本机真实输出）：
>
> 看**单个账户详情**（`net user Administrator`）：
> ```bat
> User name                    Administrator
> Account active               Yes          ← 注意：本机这个账户是「启用」的
> Account expires              Never
> Password last set            2026/7/24 11:05:01
> Password required            Yes
> Last logon                   Never
> Local Group Memberships      *Administrators
> The command completed successfully.
> ```
>
> 看**所有账户的启用状态**（PowerShell `Get-LocalUser`）：
> ```bat
> Name                Enabled Description
> ----                ------- -----------
> Administrator          True                      ← 本机被启用了（非默认）
> CodexSandboxOffline    True                      ← Claude Code 沙箱账户
> CodexSandboxOnline     True                      ← Claude Code 沙箱账户
> DefaultAccount        False  系统管理的用户帐户。
> Guest                 False                      ← 符合默认（禁用）
> user                  False
> user1                 False
> WDAGUtilityAccount    False  系统为 Windows Defender 应用程序防护…使用的用户帐户。
> ```
>
> ⚠️ **这里有个反教材的点**：上面表说 Administrator「默认禁用」，但本机实测它是 **Enabled = True**——说明这台机器（很可能是公司 IT 统一配置）把内置管理员启用了。**书本上的「默认」和真实环境的「现状」经常不一致，`Get-LocalUser` 一跑就知道实际状态。** 这也是为什么安全巡检要从「查实际状态」入手，而不是假设默认值。

**C# 里读当前账户：**

```csharp
using System.Security.Principal;

WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.Name);              // 账户名，本机实测输出：jzfz\chengongyi
Console.WriteLine(id.IsAuthenticated);   // 是否已认证
```

来源：[Create a WindowsPrincipal（Microsoft Learn）](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)

---

### 四、一个绕不开的现代变化：Win11 的本地账户

如果你近两年装过 Windows 11，会发现一件麻烦事：**OOBE（首次开机引导）默认逼你登录微软账户（MSA），不让直接建本地账户。** 这是微软从 Win11 22H2 起强推的策略。

绕过的方法社区里已经成熟（按 `Shift+F10` 开命令行，输入）：

```bat
start ms-cxh:localonly    :: 直接弹出「建本地账户」窗口，跳过 MSA
:: 或
OOBE\BYPASSNRO            :: 重启 OOBE 并去掉联网要求
```

> ⚠️ 这里点一下、不教滥用：微软强推 MSA 是为了让 BitLocker 密钥自动上云备份、跨设备同步。**企业域环境不受影响**——加域的机器走 AD 认证，本来就不碰 MSA。这个变化影响的主要是**家用、没加域的个人机**。

---

### 五、账户安全：三道现代防线

既然账户是身份的根，护住账户就是护住一切。前面讲了密码哈希存在 SAM 里、能被 Pass-the-Hash 冒用——那系统到底怎么防？微软给了三条针对**本地账户凭证**的现代防线，各管一段，下面一个个讲透。

#### 防线一：LAPS —— 给本地管理员换「不重复的随机密码」

**要防的攻击**：前面说过，本地管理员的密码哈希存在每台机器的 SAM 里。如果一批机器用了**同一个本地管理员密码**（运维图省事常这么干），那么攻击者只要攻破一台、拿到哈希，就能**横向移动**到所有同密码的机器——这叫 Pass-the-Hash。

**LAPS 怎么防**：**Local Administrator Password Solution** 给每台机器的本地管理员账户**自动设一个不同的随机密码**，定期轮换，并把密码**加密备份到 AD（或 Entra ID）**。这样：

- 每台机器密码独立 → 攻破一台不影响别的；
- 密码定期变 → 哈希过一段时间就失效；
- 密码存 AD → 运维要用时去 AD 取，不用人手记、也不用满世界贴。

**一个重要的版本更新（很多人不知道）**：旧版 LAPS 是微软早年单独下载的 MSI 工具（叫 Microsoft LAPS），已经**弃用**。**新版 Windows LAPS 从 2023-04-11 起内置进 Windows**（Win11 22H2 / Win10 22H2 / Server 2019+ 打了那天的补丁就有），不用再装任何东西。来源：[Windows LAPS overview（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview)

> 🖥️ **本机实测**（`HKLM\...\Policies\LAPS` 注册表）：
> ```bat
> PasswordLength           = 14          ← 密码长度 14 位
> PasswordComplexity       = 3           ← 复杂度最高（字母/数字/符号混）
> PasswordAgeDays          = 30          ← 每 30 天轮换一次
> BackupDirectory          = 2           ← 备份到 AD
> ADPasswordEncryptionEnabled = 1        ← 密码加密后存 AD
> ```
> 这台机器（公司统一配的）**确实启用了 Windows LAPS**——本地管理员密码由 AD 集中随机化管理。这就是 LAPS 该有的样子。

#### 防线二：UAC —— 让管理员「平时当普通人」（详见 [卷三·UAC](/Windows/permissions/vol3-rights-uac/03-uac)）

**要防的攻击**：管理员账户权限极大，如果它**一登录就以最高权限跑所有程序**，那么你随手打开的任何东西（一封邮件附件、一个网页弹窗、一个 U 盘里的程序）都带着管理员权限——一旦那个程序是恶意的，整台机器直接沦陷。

**UAC 怎么防**：**User Account Control（用户账户控制）** 的核心机制叫**过滤令牌（filtered token）**——

> 哪怕你登录的是管理员账户，系统默认也只给你一个**普通用户权限的令牌**去跑日常程序。只有当某个操作**真的需要管理员权限**时，系统才弹窗问你（「是否允许此应用对你的设备进行更改？」），你点「是」，才**临时**给那个程序一个完整的管理员令牌。

打比方：管理员像带了枪的警察，但**平时枪套是锁着的**；要拔枪（提权）必须先按一下确认键（弹窗）。这样大多数恶意程序即使骗你运行了，也拿不到管理员权限，破坏力被限制在普通用户范围内。

**怎么配**：UAC 的开关在注册表 `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System`：

| 注册表值 | 含义 |
|----------|------|
| `EnableLUA = 1` | **UAC 开启**（关掉它 = `0`，等于管理员直接裸奔，强烈不建议） |
| `ConsentPromptBehaviorAdmin = 5` | 管理员操作时，切到**安全桌面**弹窗（默认、最安全） |
| `ConsentPromptBehaviorAdmin = 0` | 不弹窗、直接静默提权（方便但危险） |

> 🖥️ **本机实测**：`EnableLUA = 0`、`ConsentPromptBehaviorAdmin = 0`——**这台机器的 UAC 被整个关掉了！**
>
> ⚠️ 这是个**实实在在的安全风险**：UAC 关闭后，任何以管理员身份运行的程序（包括被诱导运行的恶意程序）都会**直接拿到完整管理员权限、不弹任何窗**。很多公司 IT 为了「少弹窗烦人」会统一关掉 UAC，但这等于把上面「枪套锁着」那道防线拆了。**如果你能做主，建议把 `EnableLUA` 设回 `1`。**

#### 防线三：Credential Guard —— 把凭证关进「虚拟保险柜」（详见 [卷七·Credential Guard](/Windows/permissions/vol7-defense/02-credential-guard)）

**要防的攻击**：这是最狠的一道。前面讲的 SAM 是**静止在硬盘上**的哈希；但当你**登录之后**，Windows 会把你的凭证（[NTLM 哈希](/Windows/permissions/vol2-identity/03-ntlm)、[Kerberos 票据](/Windows/permissions/vol2-identity/02-kerberos)）**放到内存里的 [LSASS](/Windows/permissions/vol1-invent/05-logon-lsa) 进程**中，方便你访问网络资源时反复用。攻击者用 **mimikatz** 这类工具，只要拿到管理员权限，就能**直接从 LSASS 内存里把凭证抠出来**——包括域账户的！抠出来就能 Pass-the-Hash 横向打整个域。

> 📎 这里提到的 NTLM、Kerberos、LSASS、Pass-the-Hash 都是**后文要展开**的大主题（分别在卷二、卷一、卷七），本讲只先点一下「Credential Guard 防的是它们」。

**Credential Guard 怎么防**：它用 **VBS（Virtualization-Based Security，基于虚拟化的安全）**——借助 Hyper-V 虚拟化，在内存里**单独划出一个与正常操作系统隔离的「安全飞地」**。然后把一个精简版的 LSASS（叫 **LSAIso**）放进这个飞地里，**所有凭证只存在飞地内**。

> 关键在于「隔离」二字：**正常操作系统里的 LSASS 不再持有真凭证**（只留一个指向飞地的引用）。于是即便攻击者拿到管理员权限、用 mimikatz 去抠 LSASS，抠到的也只是空壳——真凭证在虚拟化隔离的飞地里，正常操作系统的管理员权限**够不着那个内存区域**。

它防住的攻击：**Pass-the-Hash、Pass-the-Ticket、LSASS 内存转储、mimikatz 凭证窃取**。Win11 上 Credential Guard **默认开启**（需硬件支持：64 位 + 虚拟化扩展 + 推荐 TPM 2.0）。来源：[Credential Guard overview（Microsoft Learn）](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/)

> 🖥️ **本机实测**（`Win32_DeviceGuard`）：
> ```bat
> VirtualizationBasedSecurityStatus = 2    ← VBS「地基」已启用并在跑 ✓
> SecurityServicesRunning = 0              ← 但 Credential Guard 没在跑（列表里没有 2）✗
> ```
> ⚠️ 这台机器的状态是「**地基打了，保险柜没装**」——VBS（虚拟化安全）已经跑起来了，但**没在它上面启用 Credential Guard**。也就是说 LSASS 里的凭证仍然暴露在常规内存中、可被 mimikatz 类工具抠走。硬件支持的话，建议启用 Credential Guard 把这道防线补上。

#### 三道防线各管一段（一句话回顾）

| 防线 | 在哪个环节设防 | 一句话 |
|------|---------------|--------|
| **LAPS** | 密码**存在硬盘上**时 | 每台机器独立随机密码，防 SAM 哈希横向复用 |
| **UAC** | 管理员**日常跑程序**时 | 默认只给普通权限，提权才弹窗，防恶意程序直接拿管理员权限 |
| **Credential Guard** | 凭证**进了内存**后 | 用虚拟化隔离把凭证关进飞地，防 mimikatz 从内存抠凭证 |

这三条后文都会单开讲，**现在只需建立印象**：账户安全不是设个强密码就完了，而是沿着「密码怎么存（LAPS）→ 权限怎么用（UAC）→ 凭证怎么护（Credential Guard）」三个环节层层设防——而且每一环都要**查实际状态**，别假设默认开着（本机实测就显示 UAC 被关、Credential Guard 没跑）。

---

### 补：mimikatz 为什么是 Credential Guard 的「假想敌」

上面三道防线里反复出现一个名字——**mimikatz**。理解它「为什么能成」，你才真正理解 Credential Guard「为什么必须存在」。下面只讲**原理**（它干了什么、为什么能成），不讲操作步骤——这是认识威胁，不是教攻击。

**mimikatz 是什么**：法国研究员 Benjamin Delpy 写的概念验证工具，最初就是为了**证明微软认证协议的设计缺陷**。它最出名的能力是：**从 [LSASS](/Windows/permissions/vol1-invent/05-logon-lsa) 进程的内存里，把活动用户的凭证抠出来**——NTLM 哈希、Kerberos 票据，有时甚至是明文密码。这套手法在攻击知识库 MITRE ATT&CK 里有正式编号：**T1003.001（OS Credential Dumping: LSASS Memory）**。来源：[MITRE T1003.001](https://attack.mitre.org/techniques/T1003/001/)、[Microsoft 安全博客](https://www.microsoft.com/en-us/security/blog/2022/10/05/detecting-and-preventing-lsass-credential-dumping-attacks/)

**为什么能成（关键）**：前面说过，你登录后，Windows 为了让你「登录一次就能访问各种网络资源」（单点登录 SSO），会**把凭证放在 LSASS 进程的内存里**备用。而一个**拿到管理员权限**的进程，有权读取本机上几乎任何进程的内存——**包括 LSASS**。于是 mimikatz 以管理员身份去读 LSASS 的内存，凭证就到手了。

> 一句话：**这不是 Windows 的 bug，是「单点登录要常驻凭证」+「管理员能读任意进程内存」两个设计叠加出来的结构性风险。** 所以靠「打补丁」堵不死，只能靠 Credential Guard 这种「把凭证搬进管理员也够不着的隔离内存」来根治。

**它抠到凭证后能干什么**（这就是前面反复提的攻击）：

| 抠到的 | 能干什么 | 攻击名 |
|--------|---------|--------|
| NTLM 哈希 | 拿哈希直接冒充登录，不用破解密码 | **Pass-the-Hash** |
| Kerberos 票据（TGT） | 冒充该用户向整个域要服务 | **Pass-the-Ticket** / 黄金票据 |
| 明文密码 | 直接登录、横向到同密码机器 | 凭证复用 |

**所以防御怎么对上**（回到三道防线）：

- **Credential Guard**：把凭证挪进 VBS 隔离飞地，LSASS 内存里只剩空壳 → mimikatz 抠不到了；
- **LSA Protection（RunAsPPL）**：禁止非微软签名的进程注入/读取 LSASS → mimikatz 这类未签名工具连门都进不来；
- **Defender ASR 规则**：「阻止从 LSASS 窃取凭证」→ 直接拦「非授权进程读取 lsass.exe 内存」这个行为。

> ⚠️ 本节只讲原理。mimikatz 的**下载、执行、绕过杀软**等具体操作不在本博客范围内——在你**自己拥有**的测试机上做安全研究是正当的，但请在授权环境内进行。理解它的目的是**看懂威胁、配好防御**（比如验证 Credential Guard 开启后它是否还能抠到），而不是拿去碰别人的机器。

---

### 补：离线抓哈希是怎么回事

第一节提到 SAM「运行时锁定，所以要离线抓哈希得关机拿镜像」——这句话塞了五个概念（哈希、Pass-the-Hash、SAM 锁、离线、BitLocker），当时一笔带过。这里拆开讲透。

#### 一、先认清「哈希」：密码不存明文，存的是它的「指纹」

Windows **不存你的密码明文**。你设的密码在写进 SAM 之前，先经一次**单向哈希运算**，变成一串固定长度的乱码——NTLM 哈希。以 `P@ssw0rd` 为例：

```
密码明文：P@ssw0rd
   │  先转成 UTF-16LE 编码（Windows 内部用 Unicode）
   ▼
NTLM 哈希：E19CCF29EE745F90BA3D5BAAE2C45D9A   ← 存进 SAM 的就是这串
```

两个关键性质：

- **算法是 MD4**（对 UTF-16LE 编码的密码做 MD4，输出 128 位、显示成 32 位十六进制）。来源：[NTLM（维基）](https://en.wikipedia.org/wiki/NT_LAN_Manager)
- **单向、不可逆**：从哈希 `E19CCF29...` 算不回 `P@ssw0rd`。所以即便 SAM 泄露，攻击者拿到的也是哈希，不是密码本身。

> 那「不可逆」为什么还会出事？因为 NTLM 认证协议有个设计缺陷——**它认哈希不认密码**。下一节解释。

#### 二、为什么哈希等同密码：Pass-the-Hash

Windows 网络认证（[NTLM](/Windows/permissions/vol2-identity/03-ntlm)）验证身份时，**真正用来证明「我是我」的，是哈希，不是密码**。打个比方：密码是你家的钥匙，哈希是门禁系统发给你的「通行码」——而这套门禁**只看通行码对不对，不关心你是用钥匙换来的、还是捡到通行码**。

于是攻击者**只要拿到哈希，就能直接拿哈希去认证登录**，根本不用破解出原密码。这套手法叫 **Pass-the-Hash（哈希传递，PtH）**。所以一句话：**密码哈希 = 一张能直接刷开门禁的卡，谁拿到谁能进。** 这正是要死死护住 SAM 的根本原因。

#### 三、护的办法（一）：SAM 文件锁——运行时打不开

Windows 知道哈希金贵，所以给了第一道保护：**运行时独占锁定 SAM 文件**。机器开着机的时候，`C:\Windows\System32\config\SAM` 这个文件你能看到、但**打不开、复制不走、读不了**——被系统进程锁死了。

> ⚠️ 有个例外：**拥有 SYSTEM 权限**（系统最高权限）的进程能在线读 SAM，或从 LSASS 内存里捞哈希——但这要求攻击者已经拿到极高权限（mimikatz 走的就是这条路，见上一节）。对**还没拿到高权限**的攻击者，在线读 SAM 这条路是堵死的。

#### 四、护的办法被绕过：为什么要「关机 + 拿镜像」

既然在线读不到，攻击者就走「**离线**」——**不在你的 Windows 里读，而是把数据搬走、到他自己不受限的环境里读**。但 SAM 文件锁是 Windows 加的，只要 Windows 不在跑，锁就没了。所以前置动作是两步：

```
1. 关机 → 用 U 盘/光盘启动到另一个系统（WinPE、Linux Live USB）
        ↑ Windows 没启动 = 它加的 SAM 文件锁不存在了
2. 把整块磁盘「逐字节复制」成一个镜像文件（.img / .vhd）拷走
        ↑ 然后在自己电脑上慢慢从镜像里提取 SAM、解出哈希
```

这就是「**关机拿镜像**」的字面意思：**趁 Windows 没在跑（文件锁解除），把磁盘原样克隆带走，离线提取哈希**。打个比方——Windows 运行时读 SAM，像在一家开着门、有保安盯着的银行里搬保险柜，搬不动；关机拿镜像，是趁银行关门没保安，把整座银行原样克隆走，回家慢慢撬。

#### 五、护的办法（二）：BitLocker 全盘加密——让镜像也白搭

关机拿镜像这条路，靠的是「磁盘上的 SAM 是明文数据结构」。**BitLocker 全盘加密**就是堵这一点：它把**整个磁盘卷**加密成密文（不是加密单个文件，是连 SAM、连系统文件、连空闲空间一起加密成密文）。来源：[BitLocker FAQ（Microsoft Learn）](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/faq)

于是即便攻击者关机拿走了镜像，里面**全是密文**，没有解密密钥就提取不出 SAM。而 BitLocker 的解密密钥用 **TPM 芯片**密封（正常开机时由 TPM 在验证启动环境后自动释放），还配一个 **48 位恢复密钥**做兜底。所以：

| 攻击者拿到 | 没有 BitLocker | 有 BitLocker |
|-----------|---------------|--------------|
| 关机后的磁盘镜像 | ✅ 能提取 SAM 哈希 | ❌ 全是密文，提取不出 |
| 正常开机后的机器 | （回到在线读 SAM 的限制） | TPM 正常释放密钥 → 你自己能用 |

> 🖥️ **本机实测**（PowerShell `Get-BitLockerVolume`）：
> ```bat
> MountPoint   VolumeStatus     ProtectionStatus  EncryptionPercentage
> ----------   ------------     ----------------  --------------------
> C:           FullyDecrypted   Off               0%
> ```
> ⚠️ 这台机器的 C 盘 **BitLocker 完全没开**（`FullyDecrypted` / `Off` / 0%）——也就是说「关机拿镜像」这条路在它身上**目前是通的**，一旦物理失窃或被恶意启动，磁盘里的 SAM 哈希就能被离线提取。如果你能做主（且机器有 TPM），建议开启 BitLocker 把这道反制补上。

#### 小结：一条完整的攻防链

把五步串起来，就是开头那句话的全貌：

```
密码 → (MD4 哈希) → 存进 SAM
                        │  护①：运行时文件锁（在线读不到）
                        ▼
                 攻击者绕过 → 关机 + 拿镜像（离线读到了）
                                    │  护②：BitLocker 全盘加密（镜像也是密文）
                                    ▼
                          拿到哈希 → Pass-the-Hash 冒充登录
                                    │  护③：Credential Guard / LAPS（见第五节）
```

每一道护法堵一个环节，缺一环就可能在那一环被突破——这也是为什么账户安全要「层层设防、且查实际状态」，而不是指望某一个开关搞定一切。

---

### 收束

**你现在会了：**

- 账户 = 系统登记过的一个「人」，是整个权限体系的第一块砖。
- 按登记位置分**本地账户**（本机 SAM）和**域账户**（AD 集中库）——身份存在哪、谁认它，是两者的根本区别。
- 系统自带一堆**内置账户**：管理员（RID 500）、Guest（501）、DefaultAccount（503）、WDAGUtilityAccount（504）、Win11 的 WSIAccount（1001），外加 SYSTEM/NETWORK SERVICE/LOCAL SERVICE 三个系统账户。
- 看见用 `whoami`，管理用 `net user` / PowerShell `LocalAccounts` / MMC。
- 护账户有三道现代防线：**LAPS**（密码怎么存）、**UAC**（权限怎么用）、**Credential Guard**（凭证怎么护）——而且每一环都得**查实际状态**，别假设默认开着。
- 本讲点到的 [NTLM](/Windows/permissions/vol2-identity/03-ntlm) / [Kerberos](/Windows/permissions/vol2-identity/02-kerberos) / [LSASS](/Windows/permissions/vol1-invent/05-logon-lsa) / [UAC](/Windows/permissions/vol3-rights-uac/03-uac) / [Credential Guard](/Windows/permissions/vol7-defense/02-credential-guard) 都只是「先认个脸」，后面各有专门一卷展开。

**下一讲才需要：** 为什么系统内部更爱用那串 `S-1-5-21-...`（SID），而不是只记名字——以及为什么改名 Administrator 也防不住「它还是 500」这件事。

---

<!-- chapter-nav:start -->
← 上一章：[第 0 讲：没有权限](./01-no-permission.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 2 讲：SID](./03-sid.md)
<!-- chapter-nav:end -->
