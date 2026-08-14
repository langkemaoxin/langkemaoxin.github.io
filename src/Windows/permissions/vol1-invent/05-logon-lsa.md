---
title: "第 4 讲：登录——谁验密码，过程怎样（LSA）"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 4 讲：登录与 LSA"
order: 5
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

# 第 4 讲：登录——谁验密码，过程怎样（LSA）

第 3 讲讲了「名字↔SID 怎么翻译」，那是平时随时发生的轻量查询。本讲讲更重的事——**登录**：你开机输密码那一刻，**谁来验这个密码、过程经过哪些组件、验完之后系统又干了什么**。主角还是 **LSA**，但这次它不只翻译，而是要**执法**。

> 本讲融合自两篇微软官方文档：
> - [Credentials processes in Windows authentication](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)（凭据怎么处理、LSA/认证包的活）——本讲主体
> - [Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)（有哪些登录场景）

---

### 一、先分清两个词（本讲只讲「认证」）

| 词 | 白话 | 本讲 |
|----|------|------|
| **认证 Authentication** | 你是不是你声称的那个人？（验密码） | ✅ 讲透 |
| **授权 Authorization** | 验过之后，某个文件/共享能不能碰？ | ❌ 后面才讲 |

---

### 二、Windows 有哪几种「登录」

「登录」不只有开机输密码一种。Windows 按场景分了几种，每种**走的路径、留不留凭证**都不一样（事件日志里能看到登录类型编号）：

| 登录类型 | 编号 | 什么时候发生 | 例子 |
|----------|------|-------------|------|
| **交互式 Interactive** | 2 | 你**坐在键盘前**输密码登录 | 开机进桌面、RunAs |
| **网络 Network** | 3 | 你**从另一台机器**连过来 | 访问共享文件夹、映射网络驱动器、SMB/RPC |
| **服务 Service** | 5 | 一个 **Windows 服务**启动时以某账户身份跑 | SQL Server、IIS 服务启动 |
| **批处理 Batch** | 4 | **计划任务**以某账户身份跑 | 凌晨自动跑的定时脚本 |
| **解锁 Unlock** | 7 | 锁屏后重新输密码解锁 | 离开工位锁屏，回来解锁 |

本讲主要讲**交互式登录**（最常见、也最完整），它讲透了，别的类型是它的变体。来源：[Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)、[logon types reference](https://learn.microsoft.com/en-us/windows-server/identity/securing-privileged-access/reference-tools-logon-types)

---

### 三、登录经过哪些组件：先看一张全景图

下面这张图来自 Microsoft Learn《Credentials processes in Windows authentication》，画的是**一台 Windows 客户端上**登录认证的完整架构——凭据怎么从你的手指，一路流到本机 SAM 或域控。

![Windows 客户端 LSA 架构图：应用经 secur32.dll 进入 LSA，再经 SAM/Netlogon 等到本机注册表或域控](/img/posts/windows-permission/authn_lsa_architecture_client.png)

> 图片来源：[Credentials processes（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

图里东西很多，但分成三层就清楚了：

```
┌──────────────── 用户态（User Mode，受限）────────────────┐
│                                                          │
│  ① 入口层：User Mode App / CredUI / Winlogon / Kernel App │
│       │  （经 secur32.dll 把凭据交下去）                 │
│       ▼                                                  │
│  ② LSA 大框（lsass.exe 进程里）：                        │
│       • lsasrv.dll  —— LSA 调度核心 + Negotiate 函数     │
│       • 一排 SSP   —— NTLM / Kerberos / Schannel / …     │
│       • samsrv.dll —— SAM（本机账户库）                  │
│       • netlogon.dll —— 通域控的安全通道                 │
└──────────────────────────────────────────────────────────┘
                       │
┌──────────────── 内核态（Kernel Mode，最高权限）────────────┐
│  ③ Security Reference Monitor（SRM）                      │
│       —— 定义访问令牌、做访问检查                          │
│  （+ ksecdd.sys：内核态 SSP，给驱动/服务用）              │
└──────────────────────────────────────────────────────────┘
                       │
                  右侧/下方出口：
            本机 SAM（注册表）或 域控（DC / KDC）
```

**一张图的全部信息就是三句话**：
- **上面**是「想登录的入口」（你的程序、登录界面、服务）；
- **中间**的 LSA 大框是「总装车」，凭据进来后被它调度，本机的查 SAM、域的去问域控；
- **下面**的内核态 SRM 才是「真正决定你能不能访问」的裁判，它发访问令牌。

---

### 四、主角 LSA 是什么

中间那个 LSA 大框是本讲主角，先认清楚它。

**LSA（Local Security Authority，本地安全机构）** 是 Windows 里专门管「安全和身份」的子系统——所有跟「你是谁、能不能进、能干什么」相关的事，最终都归它管或经它手。它是 Windows 安全体系的**总调度台**。

拆开名字看：

- **Local（本地）**：它跑在**每一台机器上**——个人电脑、服务器、域控制器，每台 Windows 都有自己的 LSA。
- **Security（安全）**：管的就是安全这一摊。
- **Authority（机构/权威）**：**本机「谁是谁」的最终裁决者**。一个账户合不合法、密码对不对，它说了算。

**它干什么**（官方职责）：

| 职责 | 白话 |
|------|------|
| 认证登录 | 你输密码，它验对不对 |
| 维护本地安全策略 | 本机的安全规则（谁能登、密码策略、审核策略）归它管 |
| 名字 ↔ SID 翻译 | 第 3 讲那个翻译，就是它干的 |
| 生成访问令牌 | 验过身份后，配合内核给你发 access token |
| 存凭证 | 登录后凭证存在它管的进程内存里，方便单点登录 |

所以第 3 讲的翻译名字、本讲的验密码、下一讲的发令牌——**全都是 LSA 在干**。它是贯穿这一系列的主线。来源：[Credentials processes 的 LSA 章节](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)。

#### 三个易混的词：LSA / LSASS / lsasrv.dll

人们嘴里说「LSA」时，有时指不同层次的东西，得分辨清：

| 名词 | 是什么 | 比喻 |
|------|--------|------|
| **LSA** | 一个**概念/职能**——「管安全认证这件事」的逻辑机构 | 公安局（机构） |
| **LSASS**（`lsass.exe`） | **跑这个机构的那个进程**，任务管理器里能看到 | 公安局那栋办公楼（实体的） |
| **`lsasrv.dll`** | LSA 的**核心 DLL**，真正干活的代码（含 Negotiate 函数等） | 办公楼里办公的科室 |

**为什么会有两个名字（LSA 和 LSASS）？** 因为它们描述的是**不同层次**，同一件事换个角度问，答案就不同：

- 「谁在验密码、管安全策略？」→ **LSA**（从**职责**角度）
- 「任务管理器里 `lsass.exe` 是什么？凭证存在哪？」→ **LSASS**（从**进程**角度）

注意 LSASS 的全名——**Local Security Authority Subsystem Service（本地安全机构子系统服务）**——字面里就含「Local Security Authority」，**LSASS 这个名字本身就是"实现 LSA 的那个子系统服务"**。换句话说：**LSA 是要干的事，LSASS 是干这件事的进程。** 没 LSASS 在跑，LSA 就只是纸上的概念。

> 🔑 **最关键的一条**（也是最容易混的）：说「LSA 存了凭证」是**不精确的**——**凭证实际存在 LSASS 进程的内存里**。因为 LSA 只是职能概念，凭证必须有地方物理存放，那就是 LSASS 这个进程。所以：
> - **「mimikatz 抠凭证」** = 抠 LSASS 进程内存
> - **「Credential Guard 保护凭证」** = 把凭证从 LSASS 内存挪进虚拟飞地（LSAIso）
> - **「LSASS 进程崩了」** = 系统强制重启（LSASS 是关键系统进程，不能挂）
>
> 这几句话里的 LSASS **都不能换成 LSA**——因为说的是**进程**，不是职能。

三者合起来：**LSA（机构）→ 由 LSASS（进程）跑着 → 进程里干活的代码是 `lsasrv.dll`（科室）。**

#### LSA 的关键性质：在用户态，却受保护

还有一个关键性质：**LSA 跑在用户态，却是个受保护的系统进程，权限极高、持有所有凭证。**

- 它在**用户态** → 一个拿到**管理员权限**的进程，理论上够得着它的内存 → 这是 mimikatz 能抠凭证的根；
- 但它是**受保护的系统进程** → Windows 8.1 起加了「额外 LSA 保护」禁止非保护进程读它内存/注入；Credential Guard 更进一步把它隔离进虚拟飞地（见 [第 1 讲账户安全](./02-account) 的 Credential Guard 一节）。

> 一句话收束：**LSA 是「总调度台」——上面的入口（你、程序、服务）都来找它，下面的库（SAM / 域控 / 内核 SRM）都由它调度。**

---

### 五、图里那些组件分别干什么

图里那些英文框名，对应到微软官方的组件说明（下表就是图的「说明书」，原文见 [Credentials processes 组件表](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)）：

| 组件 | 是什么 / 干什么 |
|------|----------------|
| **Winlogon（`winlogon.exe`）** | 管理安全交互的执行体。它在「安全桌面」上收集用户凭据，经 `secur32.dll` 交给 LSA。**SAS（Ctrl+Alt+Del）就是它接的**，保证登录界面是系统真画的、不是恶意程序伪造的 |
| **User Mode App / CredUI** | 用户态程序 / 凭据输入界面（就是登录界面那些磁贴）。CredUI 负责展示、采集 |
| **`secur32.dll`** | 多个认证提供者的**基础接口层**（SSPI）。用户态程序要认证，都经它进 LSA |
| **`lsasrv.dll`（LSA Server）** | LSA 的调度核心， enforcing 安全策略 + 当「安全包管理器」。**关键：它里面有 Negotiate 函数**——决定这次认证走 NTLM 还是 Kerberos |
| **SSP（Security Support Providers）** | 一排认证协议的「实现包」：**NTLM、Kerberos、Schannel、Negotiate、Digest** 等。不同场景 LSA 调不同的 SSP |
| **`netlogon.dll`** | 维护**到域控的安全通道**；把凭据经通道送给域控，拿回域 SID 和用户权利；在 DNS 里登记/解析域控；还管 PDC/BDC 的 RPC 复制 |
| **`samsrv.dll`（SAM）** | 本机账户库，存本地用户/组，强制本地策略 |
| **Registry（注册表）** | 存 SAM 副本、本地安全策略、默认安全值、账户信息——**只 SYSTEM 能访问**。位置 `HKLM\SECURITY` |

> 🔑 两个最该记住的角色分工：
> - **`lsasrv.dll` 里的 Negotiate 函数** = 「这次走 NTLM 还是 Kerberos」的**路由器**。
> - **`netlogon.dll`** = 本机到域控的**那条隧道**，域账户的验密码请求从这走。

其中 SSP 和 Netlogon 这两个最该展开（最容易混），下面单说。

#### SSP 是什么

**SSP = Security Support Provider（安全支持提供程序）**。一句话：**SSP 就是「把某种认证协议做成一个可插拔模块」的那个东西。**

把认证协议（NTLM、Kerberos、Schannel）想成不同的**锁匠手艺**，SSP 就是**锁匠本人**——你不用懂他手艺内部怎么操作，喊一声「我要 NTLM 那位」，对应的 SSP 就被叫出来干活。所以：

- NTLM 协议 → 由 **NTLM SSP** 实现
- Kerberos 协议 → 由 **Kerberos SSP** 实现
- TLS/SSL → 由 **Schannel SSP** 实现

设计的精髓在于**可插拔**：所有 SSP 都遵守同一个接口规范 **SSPI（Security Support Provider Interface）**——SSPI 是**标准电源插座**，每个 SSP 是**一个符合这标准的插头**。上层（LSA、程序）只对着 SSPI 这个标准插座编程，不用为每种协议写一套代码；`secur32.dll` 就是 SSPI 这个「插座」的实现。

> 来源：[SSPI Architecture（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/security-support-provider-interface-architecture)、[Security Support Providers (SSPs) - Win32](https://learn.microsoft.com/en-us/windows/win32/rpc/security-support-providers-ssps-)

##### 官方 SSPI 架构图（看看这套接口长什么样）

下面这张是微软官方的 SSPI 架构图，画的是**认证请求怎么从应用程序、经 SSPI、落到具体 SSP、再走传输层**的完整层次：

![SSPI 架构图：上层 Application 经 SSPI 接口调用下层一排 SSP（NTLM/Kerberos/Schannel/Negotiate 等），SSP 之下是传输层](/img/posts/windows-permission/authn_securitysupportproviderinterfacearchitecture.jpg)

> 图片来源：[SSPI Architecture（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/security-support-provider-interface-architecture)

图分**四层**（从上到下）：

| 层 | 装什么 | 白话 |
|----|--------|------|
| **Application（应用层）** | Client / Server 两端的程序 | 你的程序，要认证了 |
| **SSPI（接口层）** | `InitializeSecurityContext`、`AcceptSecurityContext`、`EncryptMessage` 等一套 API | **标准电源插座**——程序只对着它调，不关心底下是哪个 SSP |
| **SSP（协议层）** | 一排：NTLM / Kerberos / Schannel / Negotiate / … | **插头**——每种认证协议一个 |
| **Transport（传输层）** | TCP / UDP / RPC / HTTP 等 | 认证消息最终走网络传 |

> 🔑 **图里最该看懂的一点（也是 SSPI 的核心机制）**：官方原文说——**「SSPI returns transparent binary large objects」**。意思是 SSPI 只负责生成一个个**「透明的二进制大对象」**（就是认证 token），**它不关心这些 token 怎么传**——程序拿到 token，自己用底下的传输层（TCP/RPC/HTTP…）发给对方。**所以 SSPI 和网络协议是解耦的**：同一套 SSPI，能跑在各种传输层上。

> 📌 **SSPI 的标准血统**：SSPI 是 **GSSAPI（Generic Security Service API）** 在 Windows 里的实现，对应 IETF 的 RFC 2743 / 2744。所以它不是微软自己拍脑袋发明的，而是遵循业界标准的认证服务接口。

##### Windows 里的 8 个默认 SSP

官方列出 **8 个**默认 SSP（来源同上）：

| SSP | DLL | 管什么 | 什么时候用 |
|-----|-----|--------|-----------|
| **Kerberos** | `kerberos.dll` | Kerberos v5 协议 | 域账户认证（默认主力，自 Win2000 起） |
| **NTLM** | `msv1_0.dll` | NTLM / NTLMv2 | 本地账户认证、老的网络认证（在弃用） |
| **Negotiate** | `lsasrv.dll` | 不是协议，是「选择器」 | **先试 Kerberos，不行退 NTLM**（详见下面 SPNEGO） |
| **Schannel** | `schannel.dll` | TLS / SSL / DTLS / PCT | 访问 HTTPS、加密通道（协议选型见下） |
| **Digest** | `wdigest.dll` | Digest 认证（用 **MD5**） | LDAP / Web 认证——⚠️ **自 Win8/2012 R2 起默认禁用** |
| **CredSSP** | `credssp.dll` | 凭据委托 | RDP 的 NLA、SSO 凭据转发 |
| **NegoExts** | `negoexts.dll` | Negotiate 扩展 | 联邦场景（SharePoint/Office 在线服务、托管 Exchange）——**不是独立 SSP，是 Negotiate 的扩展，失败不回退** |
| **PKU2U** | `pku2u.dll` | 对等认证（无域） | Win7 起的 **HomeGroup**（已废弃）等非域机器间认证 |

> ⚠️ **修正一个常见误解**：很多人以为 Negotiate SSP 的 DLL 是 `secur32.dll`——**不是**。官方明确 Negotiate 的 Location 是 **`lsasrv.dll`**（和 LSA 调度核心同处一个 DLL）；`secur32.dll` 是 **SSPI 接口本身**（那套 API），不是某个 SSP。

📅 **时效提醒**（这些 SSP 的状态在变）：
- **NTLM**：微软正在逐步**弃用**（Windows 11 起默认限制，推荐转 Kerberos）。
- **Digest（wdigest）**：**自 Win8/Server 2012 R2 起默认禁用**——因为它会在内存里留明文凭证。老系统上才需要警惕。
- **CredSSP**：仍是 RDP NLA 的主力，但 2018 年的 CVE-2018-0886 后强制更严的策略。
- **Schannel 协议选型优先级**（官方明确）：TLS 1.0 → 1.1 → 1.2 → SSL 2.0 → SSL 3.0 → PCT（**PCT 默认禁用**）。**TLS 1.2 自 Win7/2008 R2 起支持，DTLS 自 Win8/2012 起**。

##### Negotiate 怎么选 SSP：SPNEGO

前面反复说「Negotiate 先试 Kerberos，不行退 NTLM」——具体机制叫 **SPNEGO**（Simple and Protected GSS-API Negotiation，RFC 2478）。

- **默认优先 Kerberos**：除非某一方不支持 Kerberos、或调用程序没给够 Kerberos 所需信息，才退回 NTLM。
- **Negotiate SSP 就建立在 SPNEGO 之上**——它的活就是分析请求、按策略选合适的 SSP。

##### SSP 选择机制：单协议 vs Negotiate

官方还讲了**两边怎么商定用哪个 SSP**（两种方式）：

| 方式 | 怎么做 | 例子 |
|------|--------|------|
| **① 单协议** | 服务器指定**只能用某个协议**，客户端不支持就**直接失败** | 服务器强制要 Kerberos，老客户端不支持→连不上 |
| **② Negotiate（协商）** | 基于 SPNEGO，服务器列出一串可选协议 + 发首选的响应，客户端从中挑双方都支持的 | 服务器列 [Kerberos, NTLM] 发 Kerberos 响应；客户端不支持 Kerberos 就改用 NTLM |

服务器用 `EnumerateSecurityPackages` 这个函数查本机装了哪些 SSP、各自能力是什么，再决定怎么协商。**Windows 偏好 Kerberos**，但不支持 Kerberos 的老客户端也允许用别的方式认证。

最后分清一个易混点：**SSP 和「认证包（Authentication Package）」常指同一个东西**，只是角度不同——站在「协议实现」叫 SSP，站在「LSA 登录时调用」叫认证包。后面说「LSA 选认证包验密码」和这里「一排 SSP」，是同一组东西。

#### Netlogon 是什么

**Netlogon（`netlogon.dll`）是一个系统服务**，是**本机和域控制器（DC）之间那条「专属安全通道」的维护者和使用者**。只要机器加了域，它就在后台一直跑，负责本机↔域控的所有加密通信。名字直白：**Net（网络）+ logon（登录）**= 跨网络做登录认证那摊事。

**为什么需要它**：域账户（如 `jzfz\chengongyi`）的密码不在本机、在域控的 AD 里，登录时必须把请求送到域控验。但网络上不可信，不能明文发密码——所以得有一条**加密的、互验过身份的专属通道**，Netlogon 就是建立并维护它的。

**官方给它列了四项活**（组件表里只提了第一项）：

| 职责 | 白话 |
|------|------|
| ① 维护到域控的安全通道 | 建立并保持一条**加密、互验身份**的本机↔DC 通道（注意：跟 Schannel 那个 SSP **不是一回事**） |
| ② 经通道传凭据、拿回 SID 和权利 | 把认证请求送到域控；域控验过后，经通道把**域 SID、用户权利**传回本机 |
| ③ 在 DNS 里登记和找域控 | 发布 DC 的 DNS 服务记录，并用 DNS 把域名**解析成域控 IP**——这样才知道「域控在哪」 |
| ④ 管域控之间的复制 | 基于 RPC 的复制协议，同步 PDC 和 BDC（这项主要是**域控制器之间**用） |

📌 **上面第④项提到的 PDC / BDC 是什么**

- **PDC（Primary Domain Controller，主域控制器）**：域的**权威老大**，账户/密码修改先在它这生效，是"真理源头"。
- **BDC（Backup Domain Controller，备份域控制器）**：PDC 的**只读副本**，从 PDC 复制数据，负责**分担认证请求 + 容错**，但不能直接改（改要找 PDC）。

类比：PDC 是总店的"总账本"（改动只在这登记），BDC 是各分店的"账本复印件"（查得快，改要回总店）。

⚠️ **重要提醒**：PDC/BDC 是 **Windows NT 时代（2000 年前）** 的主备设计。现代 Active Directory（2000 起）用**多主复制**——**每台 DC 都能读写、地位平等**，已没有老意义的 PDC/BDC。现在看到的"PDC"其实是 **PDC 模拟器**操作主机（模拟老 PDC 的部分职能，如密码修改、时间同步），可转移到任何一台 DC，不是唯一主。Netlogon 第④项沿用了 NT 时代的说法。

对本机登录来说，**第④项基本不涉及**——本机的 Netlogon 主要用第①②③项。PDC/BDC 是**域控制器自己之间**的事。

**它在登录流程里的位置**：登录 6 步的第 ④ 步，LSA 选 Kerberos 后，**Kerberos 怎么把请求送到域控？就是经 `netlogon.dll` 维护的这条安全通道**。所以 Netlogon **不是「验密码的」，是「运密码的」**——管怎么把请求安全送到域控、把结果安全带回来；验密码本身是域控的 AD 干的。

⚠️ **别和 Schannel 混**：官方特意标了 "not to be confused with Schannel"。两者都带 "secure channel" 字样，但管的是**完全不同性质**的通道：

| | **Netlogon（`netlogon.dll`）** | **Schannel（SSP）** |
|---|---|---|
| 是什么 | 一个**系统服务** | 一个 **SSP**（认证协议模块） |
| 管什么通道 | **本机 ↔ 自己域的域控**，固定、专属 | 任意两端的 **TLS/SSL 会话**，临时、通用 |
| 通信对象 | **只能是域控** | **任何支持 TLS 的服务器**（网站、API…） |
| 认证什么 | 域账户 / 机器账户 | **服务器的证书**（你连的是真网站吗） |
| 典型场景 | 登录域账户、域内机器通信 | 浏览器访问 `https://` 网站 |

类比：**Netlogon 像「公司内部的固定加密专线」**——只连自己域控、只有域内能用、专办身份认证；**Schannel 像「公共加密通话服务」**——跟任何网站临时建立加密线路、用完就拆、通用。

**会不会一起出现？会，但各管各的。** 比如你用域账户登录后浏览器访问公司 HTTPS 网站：① **Netlogon** 先把你密码/票据送域控验、建立域身份；② 打开 `https://...` 时 **Schannel** 接手，和网站做 TLS 握手、验证书、加密传输。**Netlogon 管「我是谁」（身份），Schannel 管「传输加密」（通道）**——同一操作里两个各司其职。

🔑 **一个反直觉的点**：Schannel 是**唯一不验「用户密码」的主流 SSP**——它验的是**服务器证书**，用户身份交给上层协议。所以 **Schannel 几乎不和 Netlogon 打交道**：它验的根本不是域账户密码，自然不需要 Netlogon 去跑域控那一趟。

🔒 **真实背景**：Netlogon 是域环境枢纽，一直被攻击者盯上。最出名的是 **CVE-2020-1472（Zerologon）**——利用 Netlogon 加密协议的设计缺陷，能不改密码就拿下域控。这也是微软后来强制 Netlogon 用更强加密（RPC sealing）的原因。

#### SSP 和 Netlogon 的关系（最容易混的点）

一个常见误解：把 NTLM、CredSSP 和 Netlogon 当成三个**对等的组件**在互相通信——**这个画面是错的**。正确的层次是：

```text
       SSP（认证协议的实现，"会某种手艺的锁匠"）
       ┌──────────┬──────────┬──────────┐
      NTLM    Kerberos   CredSSP   Schannel ...
       │          │          │
       └──────────┴────┬─────┘
                      │  （需要联系域控时，调用它）
                      ▼
                  Netlogon          ← 它是 SSP "用到的服务"，不是 SSP 之一
                      │
                      ▼
                   域控（DC）
```

**Netlogon 不和 SSP「交互」，而是被 SSP「调用」**——就像快递员（Netlogon）不是在和发货人（SSP）聊天，而是发货人**叫快递员**去送货。各 SSP 怎么用到它：

| SSP | 怎么用到 Netlogon |
|-----|------------------|
| **NTLM** | 验**域账户**时，本机 SAM 查不到（域账户密码在域控 AD 里），于是把 challenge-response 经 Netlogon 送域控验；还管跨域 passthrough 转发 |
| **Kerberos** | 联系域控上的 KDC 拿票据（细节后讲），通道常经 Netlogon |
| **CredSSP** | 「凭据委托」（如 RDP 把你的凭据送到远程主机）；送到后远程主机验**域账户**，仍经 Netlogon 问域控 |

一句话：**任何 SSP，只要它的认证最终要在域控上验域账户，都搭 Netlogon 这趟车。** 本地账户则不用——NTLM 直接查本机 SAM 即可，不麻烦 Netlogon。

⚠️ 最绕的地方：Netlogon 其实有**两层身份**——①作为**服务**维护那条通道（主业）；②它自己也能当认证提供者用（机器账户认证等，这时它像个 SSP）。但理解登录流程，记住主业（那条通道）就够了。

---

### 六、NTLM 和 Kerberos 到底怎么验的

认识了 NTLM / Kerberos 这两个 SSP，再看**它们验密码时，客户端、服务器、域控三方是怎么互动的**——这是理解整个认证体系的关键。两者流程**根本不同**。

> 下面讲的流程基于微软官方 [Microsoft NTLM（Win32）](https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm) 的三方架构图。

#### NTLM：服务器验不了，转手给域控代验（Pass-through）

NTLM 是**挑战-响应（challenge-response）**机制，涉及三方：

```text
客户端(Client)            服务器(Server)            域控(DC)
   ① 要访问服务
        │ ── Windows Sockets ──►              （客户端↔服务器：走普通网络 TCP）
        │
   ② 服务器发个随机数(challenge)
        │ ◄──────────────────
   ③ 客户端用密码哈希加密 challenge，返回响应
        │ ── Windows Sockets ──►
   ④ 服务器收到响应，但验不了
        │   （域账户的哈希在域控 AD 里，不在服务器上）
        │
        │   服务器上的 LSA 判断："if not local logon"
        │   → "RPC to LSA on server"：启动转手
        ▼
   ⑤ 经 Netlogon 把请求 Pass-thru（直通）给域控
        │ ── RPC to ADDS on DC ──►          （服务器↔域控：走 RPC，查 AD）
   ⑥ 域控查 AD 验响应，结果经 RPC 返回
        │ ◄──────────────────
   ⑦ 服务器据此放行/拒绝
```

**那张官方图里的标签，就是上图中这些箭头的标注**：

| 标签 | 意思 |
|------|------|
| **Windows Sockets（Winsock）** | 客户端↔服务器之间走**普通网络通道**（TCP），NTLM 握手消息经它传 |
| **RPC to ADDS on DC** | 服务器↔域控之间走 **RPC**，目标是域控上的 **ADDS（Active Directory 域服务）** |
| **Pass-thru（直通认证）** | 服务器**自己验不了**域账户，把认证请求**转手递给域控代验**——这正是前面说的「Netlogon 当快递员」的官方叫法 |
| **if not local logon, RPC to LSA on server** | 服务器上的 LSA 判断「这用户不是本机本地的」后，用 RPC 去联系域控（启动 pass-through）。注意是**服务器上的 LSA**，不是客户端的 |

> 🔑 **NTLM 的核心特征**：服务器**没本事验**域账户的响应 → 必须把域控拉进来代验（pass-through）。所以 NTLM 流程里，**每次认证都要域控在线参与**——这也是 NTLM 慢、且域控一断就歇菜的原因之一。

#### Kerberos：靠票据，服务器自己就能验

Kerberos 走的是**票据（ticket）**机制，流程完全不同：

```text
客户端(Client)             域控(KDC)              服务器(Server)

  ① 登录时，客户端用密码向 KDC 换一张 TGT（票据授予票据）
        │ ── 向 KDC 请求 ──►
        │ ◄── 返回 TGT ────        （TGT 存在客户端票据缓存）

  ② 要访问服务器时，客户端拿 TGT 向 KDC 换「服务票据」
        │ ── TGT + 要访问的服务 ──►
        │ ◄── 返回该服务的票据 ────

  ③ 客户端把服务票据直接交给服务器
        │ ── Windows Sockets ──────────────►
                                          ④ 服务器用和服务共享的密钥，
                                             自己就能验这张票据，不必找域控
```

> 🔑 **Kerberos 的核心特征**：客户端**先从域控拿到服务票据**，直接交给服务器，**服务器自己能验**——**验的过程中域控不参与**。所以 Kerberos 没有 pass-through、没有"服务器 RPC 去找域控代验"那套。

#### 一张表对比（这才是两者的本质差别）

| | **NTLM** | **Kerberos** |
|---|---|---|
| 凭证形态 | 密码哈希算出的 challenge 响应 | **票据**（TGT + 服务票据） |
| 谁验客户端身份 | **服务器验不了 → pass-through 给域控代验** | **服务器自己验**（用共享密钥验票据） |
| 域控的角色 | 被服务器 RPC 叫去"代验"，**每次都参与** | 只在**事先发票据**时参与，验时**不参与** |
| 域控断连 | NTLM 认证失败（除非有缓存） | 已拿到票据的话，**服务器照样能验** |
| 性能 | 每次认证都打域控，慢 | 域控只在换票据时被打，日常认证轻量 |
| 地位 | 老、在弃用 | **域认证默认主力** |

> 💡 **回到前面"Netlogon 给 NTLM/Kerberos 跑腿"**：两者**机制不同、但都要联系域控**——NTLM 是每次认证 pass-through 拉域控代验，Kerberos 是事先找域控（KDC）拿票据。Netlogon 维护的那条安全通道，两种情况都用得上。

---

### 七、交互式登录：一步步走完整条链

组件和认证协议都认识了，现在把它们串起来——**一次交互式登录到底怎么走**。

> 例子用你自己机器：`jzfz\chengongyi` 输密码登录 `PC3507`（已加域 `JZFZ`）。

#### ① SAS → Winlogon 接手

你按 `Ctrl+Alt+Del`（**SAS，Secure Attention Sequence**）。这个组合键的意义是**保证接下来弹出的登录界面是系统真画的**——恶意程序拦截不了 SAS，所以没法用它伪造个假登录框骗你输密码。接 SAS 的是 **Winlogon**。

#### ② Logon UI + Credential Provider 采集凭据

Winlogon 拉起 **Logon UI**（登录界面、账户磁贴）。你点磁贴、输密码——**采集并打包这些凭据的是 Credential Provider（凭据提供程序）**，它是个 DLL。

> ⚠️ **官方反复强调的一条**：**Credential Provider 只负责「采集 + 序列化」凭据，不是执法机关**。它不判断密码对不对——执法的是后面的 LSA 和认证包。所以换 PIN / 指纹 / Windows Hello 登录，本质是换了不同的 Credential Provider 采集，**验密码的还是同一套 LSA**。这也是为什么各种登录方式最后都汇到同一个安全结论。

来源：[Credential provider architecture](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

#### ③ 凭据交给 LSA（经 LPC 调 `LsaLogonUser`）

Winlogon 拿到密码后，自己不能去翻 SAM、不能去连域控——这些只有 LSA 能干。所以它得**把密码「递」给 LSA**。但 Winlogon 和 LSA 是**两个不同的进程**，怎么安全地递？

靠两样东西：**`LsaLogonUser`**（递什么）+ **LPC**（怎么递）。

> #### LPC 和 `LsaLogonUser` 是什么
>
> **LPC（Local Procedure Call，本地过程调用）** 是 Windows 提供的**「同一台机器上两个进程间的高速通信」机制**。类比：RPC 是「跨网络打电话叫人帮忙」，LPC 是「**同一栋楼里的内线电话**」——不走网络、只在本地进程间传消息，比 RPC 快得多，专为同机进程通信优化（现代版本叫 **ALPC**，Advanced LPC）。**LPC 就是 Login Layer 和 LSA 之间那条「内线电话线」——传递凭据的运输管道。**
>
> **`LsaLogonUser`** 是一个 Win32 API 函数——如果 LPC 是内线电话线，它就是**这条线上拨的那个「特定号码」**。Winlogon 调用它，把用户名、密码、用哪个认证包、登录类型等打包传给 LSA，正式发起「请帮我登录这个用户」的请求。LSA 收到这个调用，才真正开始验密码、建 logon session、发 token。来源：[LSA_AP_LOGON_USER](https://learn.microsoft.com/en-us/windows/win32/api/ntsecpkg/nc-ntsecpkg-lsa_ap_logon_user)
>
> 一「递」的完整过程：
> ```text
> Winlogon（Login Layer）拿到密码
>    │
>    │  调 LsaLogonUser(用户名、密码、认证包、登录类型…)   ← 拨号：递什么
>    │  这个调用经 LPC（内线电话线）传进 lsass.exe 里的 LSA   ← 管道：怎么传
>    ▼
> LSA 接到 → 选认证包验密码 → 建 logon session → 返回结果
> ```
>
> 为什么这一步是**安全边界**：LPC 由内核中介，保证只有**合法的调用方**能把凭据递进 LSA——恶意程序不能随便塞个假登录请求。这也再次印证「Credential Provider / Winlogon 只采集、不放行」：验密码发生在 LSA 进程**里面**，不是登录界面那侧。

**到这一步，你的明文密码才第一次离开登录界面、进入 LSA 的地盘（`lsass.exe` 进程）。**

> #### 这里的「Session 0 / Session 1」是什么
>
> 上面说 Winlogon 把凭据「递给 LSA」——它们其实**不在同一个 session 里**。Windows 把进程按 **Session（会话）** 分隔：
>
> | Session | 装什么 | 能交互吗 |
> |--------|--------|---------|
> | **Session 0** | 系统服务、用户态驱动、**LSA/LSASS**、Winlogon 的系统实例 | ❌ **非交互**（纯后台） |
> | **Session 1、2、3…** | 每个交互登录（本机登录、RDP）分一个，从 1 开始 | ✅ 有自己的桌面、窗口 |
>
> 所以登录时，**你的 Winlogon 跑在你的用户 session（如 Session 1），而 LSA/LSASS 跑在 Session 0**——上面说的 LPC 通道，跨的就是"用户 session → Session 0"这条边界。来源：[AskPerf - Session 0 Isolation（Microsoft）](https://techcommunity.microsoft.com/blog/askperf/application-compatibility---session-0-isolation/372361)。
>
> **为什么非要分 Session 0**：Vista 之前，服务和第一个登录用户共享同一个 session。服务权限高（常以 SYSTEM 跑），用户态程序能给它发窗口消息搞提权（叫 **shatter attack**）。Vista/Server 2008 起强制 **Session 0 非交互**——服务和用户**永远不在一个桌面**，堵掉这个攻击面。Win10 1803 起，连"有服务想弹界面"的提示服务（Interactive Services Detection）都移除了，**Session 0 现在彻底禁止任何 GUI**。
>
> 一句话：**Session 0 是系统和服务的专属后台区（LSA 在这），Session 1+ 是你看得见桌面的用户区——LPC 把登录请求从用户区安全递进 Session 0 的 LSA。**

#### ④ LSA 选认证包、去对答案

LSA 的 `lsasrv.dll` 里有个 **Negotiate 函数**，它决定**这次该走哪个 SSP（认证协议）**：

| 账户类型 | Negotiate 选的 SSP | 去哪对答案 |
|---------|-------------------|-----------|
| **本地账户**（如 `PC3507\user`） | **NTLM**（走 Msv1_0） | **本机 SAM** |
| **域账户**（如 `jzfz\chengongyi`） | **Kerberos** | **域控（DC）的 AD** |

以 `jzfz\chengongyi` 走一遍：LSA 判定这是域账户 → Negotiate 选 Kerberos → Kerberos 通过 `netlogon.dll` 维护的安全通道去问 `JZFZ` 域控 → 域控查 AD 里的密码哈希比对。

> 这里就是第 3 讲预告的「SSP 真正登场」——**NTLM / Kerberos / Schannel 就是认证包（也叫 SSP）**，平时翻译名字用不到它们，但验密码时它们是主角。

#### ⑤ 验对：建 logon session + 发 access token

密码验对后，认证包**创建一个 logon session（登录会话）**；LSA 再让内核的 **SRM（Security Reference Monitor）** 为你生成一个 **access token（访问令牌）**——里面装着你的 SID、所属组 SID 等「身份快照」。

之后你启动的每个程序（浏览器、Word…）都**继承这份 token** 跑——所以**登录一次**，之后开任何程序都不用再输密码（单点登录 SSO，靠的就是 token 里带着凭证）。

#### ⑥ 验错：回登录界面

密码错、账户禁用、登录时段限制（域策略可限定几点能登录）、域控连不上且无缓存 → 失败，回登录界面重来。

把 6 步串起来：

```text
你按 Ctrl+Alt+Del（SAS）
   ▼
Winlogon 接手，拉起 Logon UI
   ▼
Credential Provider 采集凭据（只采集，不放行）
   ▼
Winlogon ──secur32.dll──► LSA（lsass.exe）
   ▼
lsasrv.dll 的 Negotiate 函数选 SSP：
   ├─ 本地账户 → NTLM/Msv1_0 → 查本机 SAM
   └─ 域账户   → Kerberos → 经 netlogon.dll 问域控的 AD
   ▼
验对 → 建 logon session + 内核 SRM 发 access token → 进桌面
验错 → 回登录界面
```

---

### 八、「凭据」到底是什么

这一讲反复出现「凭据（credential）」这个词，现在该正面说清——**远程登录的凭据，和登录自己电脑的凭据，是一个东西吗？**

#### 「凭据」是个伞形词，不是单样东西

**凭据 = 任何能证明「我是某个身份」的东西。** 它**不是某一种固定形态**，在不同场景下指的是不同的东西：

| 凭据形态 | 是什么 | 什么时候出现 |
|---------|--------|-------------|
| **明文密码** | 你敲的那串字符（如 `P@ssw0rd`） | 登录框、RDP 输入框；之后被转成别的形态 |
| **NT hash** | 密码的 MD4 哈希（不可逆） | 本地登录后存进 LSASS；NTLM 认证用它 |
| **Kerberos TGT**（票据授予票据） | 域控 KDC 发的加密票据 | 域账户登录后拿到，存进票据缓存 |
| **Kerberos 服务票据** | 访问某个具体服务的票据 | 访问文件共享、SQL 等时用 |
| **证书 / 智能卡** | X.509 证书 + PIN | 高安全场景、智能卡登录 |

所以当有人说「把凭据送过去」，他可能指送的是**密码**、也可能是**NT hash**、也可能是 **Kerberos 票据**——**要看场景**。

#### 三种场景的凭据落到哪

**源头一样，但送到对方那里时的「形态」和「落到哪」不同。**

**A. 登录自己电脑（交互式登录，类型 2）**：

```
你输密码（明文）
   → 本机 LSA 算出 NT hash、申请 TGT
   → 这些都存在【本机】LSASS 里
```

凭据的"全套"（NT hash + TGT）**留你本机**。

**B. RDP 远程登录（类型 10，后文细讲）**：

```
你在 mstsc 输密码
   → 经 CredSSP 送过去
   → 【远程主机】的 LSA 拿到，算 NT hash、申请它自己的 TGT
   → 这些存在【远程主机】LSASS 里
```

凭据"全套"落在了**远程主机**——所以远程主机被攻破，你的凭证就泄露。

**C. 网络登录（如访问共享文件夹，类型 3）**：

```
你访问 \\server\share
   → 系统拿你的身份，做个 NTLM 响应 / 或 Kerberos 服务票据送过去
   → 对方验身份
   → 但【不把你的 hash/密码留在对方】
```

对方只拿到"身份证明"，**不留存你的完整凭据**——所以网络登录的扩散风险比 RDP 小。

| 场景 | 登录类型 | 凭据落到哪 | 被攻破后风险 |
|------|---------|-----------|-------------|
| **登录自己电脑** | 交互式(2) | 本机 LSASS | 本机被攻破→你的凭据泄露 |
| **RDP 远程登录** | 远程交互(10) | **远程主机** LSASS（全套：NT hash + TGT） | 远程主机被攻破→你的凭据泄露 |
| **访问共享(SMB)** | 网络(3) | **基本不留**（只递交通明/票据） | 扩散风险小 |

来源：[Microsoft NTLM（Win32）](https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm)——「NTLM 凭据 = 域名 + 用户名 + 密码的单向哈希」；[Credentials processes](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)。

---

### 九、LSASS 内存里到底存了什么（这关系到 mimikatz）

第 1 讲提过「mimikatz 能从 LSASS 内存抠凭证」——但**到底抠到的是什么**？官方说得很清楚：**LSASS（`lsass.exe`）为每个活动会话在内存里存凭证，形态有四种**：

| 形态 | 说明 |
|------|------|
| **可逆加密的明文密码** | 真正的明文，加了层可逆加密（能解回来） |
| **Kerberos 票据** | TGT（票据授予票据）+ 服务票据 |
| **NT hash** | 密码的 NTLM 哈希 |
| **LM hash** | 老掉牙的 LM 哈希（弱、早该淘汰） |

> ⚠️ 两个关键细节：
> - **用智能卡登录时，LSASS 不存明文密码**——但仍存该账户的 NT hash + 智能卡的明文 PIN。
> - **明文密码的存储没法关掉**（即使禁用需要它的 Credential Provider 也关不掉）——这就是为什么 mimikatz 抠内存能拿到明文。
>
> 📅 **现代 Windows 的补救**：开启了 **Credential Guard**（见 [第 1 讲](./02-account)）的机器上，明文凭证和哈希会被移进 **LSAIso**（基于虚拟化的隔离环境），普通 LSASS 进程里的恶意代码够不着——等于绕过了"没法关掉"这个老毛病。来源：[How Credential Guard works（Microsoft Learn）](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/how-it-works)。所以现在防 mimikatz 抠明文，靠的就是这道虚拟化隔离，而不是禁用某个开关。

这些凭证存在**内存**里，关机/重启就没了。但有些**必须跨重启保留**的凭证（服务账户密码、计划任务密码、IIS 应用池密码、微软账户密码、计算机的 AD 账户密码），会以 **LSA secrets** 形式**加密存在硬盘**上（只 SYSTEM 能读）。

来源：[Credentials processes - LSA](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)。接 [第 1 讲的 mimikatz 补节](./02-account#补mimikatz-为什么是-credential-guard-的假想敌)——现在你应该明白它为什么能抠到不同形态的东西了。

---

### 十、其它登录方式：服务、网络、缓存

交互式登录是主线，其它几种是它的变体，简单过一下。

#### 服务/驱动怎么登录：`ksecdd.sys`

**服务**（如 SQL Server 启动）：服务控制器先用服务配置的账户登录，再把凭据交给 LSA 验。本机服务跑 **SYSTEM** 的话，不用出示凭证（SYSTEM 是系统自己的）。

**跑在内核态的东西**（驱动等）：它们不走用户态的 `secur32.dll`，而是用 **`ksecdd.sys`**——**内核态的 SSP**，通过本地过程调用（LPC）进 LSA，**FIPS 140-2 Level 1 认证**（自 Windows Server 2008 起）。来源：[Services and kernel mode（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)。

#### 网络登录的握手：SSPI

**网络登录**（登录类型 3，访问共享文件夹那种）不是输密码，而是**两个程序之间用 SSPI 握手**：

```text
客户端程序                    服务端程序
    │                             │
    │── InitializeSecurityContext ─►   （带上凭据）
    │◄── AcceptSecurityContext ────    （服务端验）
    │   （反复几轮，直到成功/失败）
    │                             │
    │                     成功后：服务端 LSA 用客户端信息
    │                     建安全上下文（含 access token），
    │                     再 ImpersonateSecurityContext 把
    │                     token 挂到服务的模拟线程上。
```

来源：[Credential input for application and service logon](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

#### 缓存登录：域控连不上怎么办

带笔记本出差，连不上公司域控，但仍能用域账户 `jzfz\chengongyi` 登录——为什么？

因为每次用域账户登录成功，Windows 都把这次凭据**缓存到注册表的 security hive**（`HKLM\SECURITY` 下）。域控连不上时，LSA 退而用这份缓存验。这是为「离线也能用域账户」，代价是**缓存的是哈希**——所以才有 mimikatz 抠缓存凭证那套。

来源：[Cached credentials and validation](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

---

### 十一、实战：RDP 远程登录的完整流程

前面讲的都是「在本机键盘前登录」。实际工作中更常见的场景是：**你在自己电脑上，用远程桌面（mstsc）连到另一台域里的机器，输入域账户名和密码，进去了**。这条链路比本机登录复杂——它串起了本讲几乎所有组件。

> 场景：你在 `PC3507` 上，用 mstsc 连到域里的服务器 `SRV-APP01`，输入 `jzfz\chengongyi` + 密码。

先明确一点：**RDP 登录是「远程交互登录」(RemoteInteractive，登录类型 10)**——不是交互式(2)、也不是网络(3)，是单独一类（编号 10）。它跟交互式一样会给你完整桌面，但发生在远程机器上。

#### 为什么 RDP 要先认证再建会话（NLA）

老的 RDP 协议有个毛病：**先给你建好会话、占着服务器资源，再让你输密码**——密码错了服务器白忙一场，还容易被用来 DoS（狂建空会话拖垮服务器）。

现代 RDP 用 **NLA（Network Level Authentication，网络级认证）** 解决：**在建立会话之前，先把你认证了**。靠的就是前面 SSP 表里那个 **CredSSP**——它把认证过程嵌进 RDP 连接的最前面，确认你是合法用户后，服务器才分配桌面会话资源。

#### 完整流程（一步步）

```text
① 你的电脑（mstsc）向 SRV-APP01:3389 发起连接
       │
       ▼
② 双方先建 TLS 加密通道（Schannel 干的）        ← 传输层先加密
       │
       ▼
③ 在 TLS 隧道里，跑 CredSSP：
     你的电脑向 KDC（域控）为 SRV-APP01 申请
     一个 Kerberos 服务票据          ← 这步可能要联系域控
       │
       ▼
④ 凭据（密码 / 票据）经 CredSSP 送到 SRV-APP01
       │
       ▼
⑤ SRV-APP01 的 LSA 验这个票据：
     本地验不了域账户 → 经 Netlogon 问域控确认
       │
       ▼
⑥ 验过 → SRV-APP01 建一个「远程交互登录」会话，
     在它自己的 LSASS 里存下你的 NT hash + TGT，
     给你一个完整桌面
```

#### 关键细节：凭据会被「委托」过去

注意第 ④、⑥ 步——这是 RDP（和网络登录）最大的不同。**CredSSP 做的是「凭据委托（credential delegation）」**：你的凭据（或可用的 Kerberos 票据）会被**送到远程主机**，让远程主机**能以你的身份**去访问第三方资源（比如你 RDP 进去后，在里面还能用你的身份打开文件服务器）。

> 这就是为什么 RDP 进去后你能「接着用域身份干各种事」——远程主机拿到了你的可委托凭据。代价是：**你的凭据落在了远程主机的 LSASS 里**。如果那台远程主机被攻破，攻击者就能从它里面抠到你的凭据——所以 RDP 一直是横向移动的高价值目标。

来源：[Credential input for application and service logon（CredSSP）](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)、[Remote logon credential processes（Restricted Admin）](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

#### 两种「凭据怎么过去」的模式

RDP 送凭据有两种粒度，安全级别不同：

| 模式 | 怎么做 | 你的密码落到远程主机吗 |
|------|--------|----------------------|
| **普通 RDP（默认）** | 经 CredSSP 把凭据/票据委托过去 | **会**（落到对方 LSASS） |
| **Restricted Admin 模式** | 只做 NTLM 响应或用 Kerberos 服务票据，**不送你的密码** | **不送**——对方只拿到机器账户身份，攻击面小 |

> Restricted Admin（Win 8.1/Server 2012 R2 起）是为减少凭据扩散设计的：远程主机拿不到你的明文/hash，自然也就没法被抠。代价是你进去后只能以机器账户身份访问资源，功能受限。

来源：[Restricted Admin mode](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

---

### 十二、应用程序用 LDAP 查 AD 验账户（C# 实战）

前面讲的认证（LSA、Kerberos、NTLM、RDP）都是 **Windows 系统级**的。但还有个常见场景：**你自己写的应用程序**（一个 Web 服务、Jenkins、GitLab…）想接公司域账户——用户输入域账号密码，你的程序去**查 AD 验证对不对**。这条路不走 LSA，而是**直接用 LDAP 协议查域控上的 AD**。

> 这正是本系列前面反复出现的 **AD（Active Directory）** 真面目之一：**它不光是个账户库，还能通过 LDAP 协议被应用程序查询**。域控同时是 LDAP 服务器。

#### 工作流：应用怎么用 LDAP 验账户

LDAP 验密码的本质是 **bind（绑定）**——LDAP 协议里"用账号密码登录"这个动作就叫 bind。有两种主流做法：

**做法 A：直接 bind（最简单）**

把用户输的用户名+密码，直接当 LDAP bind 凭证去连域控：

```text
① 应用连域控的 LDAP 端口（389 明文 / 636 LDAPS 加密）
        │
        ▼
② 用「用户名 + 密码」尝试 LDAP bind
        │
        ▼
③ 域控查 AD：
     密码对 → bind 成功 → 用户有效
     密码错/用户不存在 → bind 失败 → 拒绝登录
```

优点：简单。缺点：你得知道用户的 **DN（可分辨名，如 `CN=程工乙,OU=研发,DC=jzfz,DC=com`）** 或用 `域\用户` 格式——用户不会记自己的 DN。

**做法 B：服务账号搜索（更常用）**

先用一个专门的**服务账号** bind 进去（有搜索权限），按用户名搜到他的 DN，**再用用户的密码 bind 一次**确认：

```text
① 应用用【服务账号】bind 进 AD（这个账号有搜索权限）
        │
        ▼
② 按 username 搜索，拿到用户的 DN
   （如 CN=程工乙,OU=研发,DC=jzfz,DC=com）
        │
        ▼
③ 解绑服务账号，用【用户的 DN + 用户输的密码】再 bind
        │
        ▼
④ bind 成功 = 密码对；bind 失败 = 密码错
```

优点：用户只需输用户名，不用记 DN。这是生产里最常用的模式。

> ⚠️ **安全要点**：LDAP 明文传密码走 389 端口，**必须用 LDAPS（636 端口，LDAP over SSL）**，否则密码在网络上裸奔。域控要配好证书。另外，密码错误时 AD 会**锁定账户**（多次失败触发策略），做验证时小心别把用户账号试锁了。

#### C# 三种 API（从简到繁）

.NET 连 AD 验账户有三种主流 API，按推荐度排：

| API | 命名空间 | 特点 |
|-----|---------|------|
| **`PrincipalContext`** | `System.DirectoryServices.AccountManagement` | **最现代、最简单**，一行 `ValidateCredentials`。推荐 |
| `DirectoryEntry` | `System.DirectoryServices` | 经典 ADSI 包装，构造函数传用户名密码 |
| `LdapConnection` | `System.DirectoryServices.Protocols` | 底层 LDAP，跨平台、最灵活 |

来源：[Validate a username and password against Active Directory（SO 高票总结）](https://stackoverflow.com/questions/290548/validate-a-username-and-password-against-active-directory)

##### 方式一：PrincipalContext（推荐，最简洁）

```csharp
// 需安装包：System.DirectoryServices.AccountManagement
// （.NET Core/5+ 用 Microsoft.Windows.Compatibility 提供 Windows 支持）
using System.DirectoryServices.AccountManagement;

public bool ValidateAdUser(string username, string password)
{
    // PrincipalContext：连到指定域（这里 jzfz）
    //   contextType: Domain → 连 AD 域；Machine → 连本机
    //   name: 域名，如 "jzfz" 或 "jzfz.com"
    //   container: 搜索起点（可选，如 "DC=jzfz,DC=com"；null=整个域）
    using var ctx = new PrincipalContext(ContextType.Domain, "jzfz.com");

    // ValidateCredentials：内部就是 LDAP bind，返回 bool
    //   对 = true；密码错/用户不存在 = false
    return ctx.ValidateCredentials(username, password);
}
```

> 🔑 **就这一行 `ValidateCredentials`**——它内部走的就是上面"做法 A"的 LDAP bind。`PrincipalContext` 把连域控、bind、判错全包了。来源：[PrincipalContext.ValidateCredentials（Microsoft Learn）](https://learn.microsoft.com/en-us/dotnet/api/system.directoryservices.accountmanagement.principalcontext.validatecredentials)

##### 方式二：DirectoryEntry（经典 ADSI）

```csharp
using System.DirectoryServices;

public bool ValidateAdUser(string username, string password, string domain = "jzfz.com")
{
    try
    {
        // LDAP 路径 + 用户名 + 密码 → 构造时就尝试 bind
        // 用 using 确保 NativeObject 访问后释放连接
        using var entry = new DirectoryEntry(
            $"LDAP://{domain}",
            username,      // 可用 域\用户 或 user@domain
            password,
            AuthenticationTypes.Secure);  // Secure=NTLM/Kerberos 加密认证

        // 触发实际 bind：访问一个属性就会真的连一次
        _ = entry.NativeObject;
        return true;   // 没抛异常 = bind 成功 = 密码对
    }
    catch (COMException)
    {
        return false;  // bind 失败 = 密码错/连不上
    }
}
```

> `AuthenticationTypes.Secure` 指定用 NTLM/Kerberos（不是明文），比 LDAP bind 更安全——但注意这其实走的又是 LSA 那套了（见前面 NTLM/Kerberos 流程），不是纯 LDAP bind。

##### 方式三：LdapConnection（底层，跨平台）

```csharp
using System.DirectoryServices.Protocols;
using System.Net;

public bool ValidateAdUser(string username, string password, string ldapHost = "dc01.jzfz.com")
{
    // 连域控的 LDAPS（636）端口；证书有效才安全
    using var conn = new LdapConnection(
        new LdapDirectoryIdentifier(ldapHost, 636),
        new NetworkCredential(username, password),
        AuthType.Negotiate);   // Negotiate: 先试 Kerberos，不行退 NTLM

    try
    {
        conn.Bind();   // 显式发起 LDAP bind → 验密码
        return true;   // bind 成功 = 密码对
    }
    catch (LdapException)
    {
        return false;  // 密码错/用户无效
    }
}
```

> 这是最接近 LDAP 协议本源的写法，跨平台（Linux 上跑 .NET 也能用）、能精细控制超时/重试。`AuthType.Negotiate` 同样会让它走 Kerberos/NTLM，而非明文密码 bind。

#### 和前面 LSA 登录的区别（收束一下）

| | **Windows 系统登录（LSA/Kerberos/NTLM）** | **应用程序用 LDAP 验账户** |
|---|---|---|
| 谁发起 | Winlogon / 系统组件 | **你写的应用程序** |
| 怎么验 | LSA 调 SSP（Kerberos/NTLM） | 程序直接 LDAP bind 到域控 |
| 验完得到什么 | logon session + access token（能进桌面、访问资源） | **只有一个"对/不对"的 bool**（验完就完了，不建立系统会话） |
| 典型场景 | 开机、RDP、访问共享 | 自研系统登录页、Jenkins/GitLab 接域 |

> 🔑 **一句话**：系统登录拿到的是**身份 + 后续权限**（token）；LDAP 验账户只是**查一次密码对不对**，验完程序自己决定接下来给你什么权限。两者都查同一个 AD，但姿势和拿到的东西完全不同。

---

### 十三、打开百度时 Schannel 怎么验证书（TLS 握手详解）

前面 Schannel 反复出现："访问 `https://...` 时 Schannel 接手，和网站做 TLS 握手、验证书、加密传输"。这里把这句话**拆到底**——你在浏览器输入 `https://www.baidu.com` 回车后，Schannel（或浏览器自己的 TLS 栈，原理相同）到底干了什么。

> 注意一个事实：**现代浏览器（Chrome/Edge/Firefox）大多自带 TLS 栈**（BoringSSL/NSS），不一定走 Windows 的 Schannel；但**非浏览器程序（很多 .NET 应用、系统组件）走的就是 Schannel**。两者握手机制一致，下面讲的是 TLS 协议本身。

#### 整体：TLS 握手在干什么

目标：**在不安全的网络上，客户端和服务器协商出一个只有他俩知道的"会话密钥"，之后用这个密钥加密所有数据**。同时，**客户端要确认对面真的是百度，不是中间人**。前者靠密钥交换，后者靠证书验证——这两件事就是握手的全部。

下面先把这两块**地基**（密钥怎么算、证书怎么验）各打一节，再看后面的完整流程图就不会卡在"双方算出会话密钥"这句上。

#### 地基一：会话密钥是怎么算出来的

握手图里反复出现一句"双方算出会话密钥"——它到底怎么算的？看懂这一节，后面的图才读得下去。现在主流是 **ECDHE**（椭圆曲线 Diffie-Hellman 临时密钥交换），先讲它。

**戏法在这里**：双方各自临时生成一对公私钥，**把公钥（叫 key share）发给对方**，然后各自"用自己的私钥 + 对方的公钥"算出**同一个共享秘密 S**——神奇的地方在于，**S 从没在网上传过**，但两边算出来一模一样。

```text
客户端                                  服务器
  临时私钥 a、公钥 A                      临时私钥 b、公钥 B
  ────── A 发出去 ──────►               ◄────── B 发出去 ──────

  用 a + B 算出：S                       用 b + A 算出：S
          ↑ 网上只传过 A 和 B，S 从未现身 ↑
```

**为什么中间人凑不出 S？** 因为从公开的 A、B 反推出 a、b 是**椭圆曲线离散对数难题**——以现在的算力做不动。中间人哪怕全程监听，也只能看到 A 和 B，算不出 S，自然算不出会话密钥。

> **前向保密（Forward Secrecy）**：a、b 是**临时**的——每次连接现生成、用完就扔，这就是名字里那个 **E（Ephemeral，临时的）** 的意思。所以**就算百度哪天服务器私钥泄露，也解不出以前抓到的流量**：那些流量用的临时 a/b 早没了。这就是 TLS 1.3 强制 ECDHE、删掉老式 RSA 密钥交换的原因。

最后，**会话密钥 = 共享秘密 S + 两个随机数**。握手时客户端出一个随机数、服务器出一个随机数，三者一起喂进 KDF（密钥派生函数）算出最终密钥。两个随机数的作用是**让每次连接的密钥都不一样**，防重放。

> 💡 老式的 **RSA 密钥交换**是另一条路：客户端直接生成会话密钥，**用服务器证书里的公钥加密**发给对方。简单，但**没有前向保密**（私钥一泄露，历史流量全裸）——所以 TLS 1.3 把它删了。

#### 地基二：证书校验到底查了什么（客户端这一侧）

会话密钥谈拢了还不够——**客户端得先确认对面真是百度**，否则把密钥交给中间人就全完了。握手时服务器发来它的证书，Schannel/浏览器要验它真不真，做这几项检查（哪项不过都报警）：

| 检查项 | 查什么 | 不过会怎样 |
|--------|--------|-----------|
| **① 证书链可信** | 从百度证书 → 中间 CA → 根 CA，逐级**用上级公钥验下级签名**，最终接到**客户端信任的根 CA**（系统/浏览器自带信任库） | "不受信任的证书" |
| **② 有效期** | 当前时间在证书的 `notBefore` ~ `notAfter` 之间 | "证书已过期/未生效" |
| **③ 域名匹配** | 证书里的 **SAN**（Subject Alternative Name，如 `www.baidu.com`）要和你访问的域名一致（老证书看 CN） | "证书域名不匹配" |
| **④ 是否被吊销** | 证书可能被 CA 提前吊销（私钥泄露等）。查法：**CRL**（下载吊销名单）或 **OCSP**（实时问 CA）；现代多用 **OCSP Stapling**（服务器把 OCSP 结果预先带在握手里） | "证书已吊销" |
| **⑤ 持有者证明** | **CertificateVerify**：服务器用证书对应的**私钥**签名一段握手数据——能签对，说明它真持有私钥（不只是拿到了证书文件） | "服务器无法证明身份" |

> 🔑 **一句话**：证书校验 = **这串证书可信吗（链）→ 还有效吗（期）→ 是给这个域名的吗（名）→ 没被吊销吗（销）→ 你真是证书主人吗（私钥签名）**。五道关卡全过，才算"对面真是百度"。

#### TLS 1.2 握手（经典流程，2-RTT）

两块地基打好，再看完整流程就顺了——图里的 ③④⑥⑦ 这些步骤，对应的就是上面讲的"证书校验"和"密钥交换"。

来源：[The Illustrated TLS Connection](https://tls12.xargs.org/)、[Auth0 - TLS Handshake Explained](https://auth0.com/blog/the-tls-handshake-explained/)。

```text
客户端（你）                              服务器（百度）
   ① ClientHello ──────────────────►
     "我支持这些加密套件、TLS 版本，
      这是我的随机数 A"
                                       ② ServerHello ◄──────────────────
                                          "我们用这个套件、这个版本，
                                           这是我的随机数 B"
                                       ③ Certificate ◄──────────────────
                                          服务器证书链（百度证书→中间CA→根CA）
                                       ④ ServerKeyExchange ◄────────────
                                          密钥交换参数（如 ECDHE 的公钥）
                                       ⑤ ServerHelloDone ◄──────────────
                                          "我说完了"
   ⑥ 验证证书（见下面"证书校验"）
   ⑦ ClientKeyExchange ──────────────►
     客户端的密钥交换参数
   ⑧ ChangeCipherSpec + Finished ───►
     "从现在起我用密钥了，发个验证"
                                       ⑨ ChangeCipherSpec + Finished ◄─────
   ───────── 双方算出会话密钥，之后全加密 ─────────
   ⑩ 加密的 HTTP 数据来回传
```

双方各出一个随机数 + 密钥交换参数，**共同算出会话密钥**（谁都不能单独决定，防一方偷懒——原理见上面的"地基一"）。注意 ⑥ 证书校验和 ⑦ 密钥交换参数在客户端这边是**交叉**做的：边发 ClientKeyExchange，边验刚才收到的证书。1.2 要 **2 个来回（2-RTT）**才握手完。

#### TLS 1.3 握手：把 1.2 砍成了什么样

TLS 1.3 不是另起炉灶，而是**对着 1.2 这张图动刀**——合并步骤、提前猜测、全程加密。它现在是默认主力。下面逐条对着 1.2 看"砍了哪、为什么能砍"。来源：[LogicMonitor - TLS 1.2 vs 1.3](https://www.logicmonitor.com/deep-dive/http3-vs-http2/tls1-2-vs-1-3)、[Cloudflare](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/)。

```text
客户端                                    服务器
   ① ClientHello ──────────────────►
     （直接带上 key share——猜测服务器要的密钥参数，
      省掉来回猜）
                                       ② ServerHello ◄──────────────────
                                          （也带 key share，选定参数）
                                       ③ ── 从这一刻起，后续全加密 ──
                                       ④ Certificate（加密发送）
                                       ⑤ CertificateVerify ◄────────────
                                          用私钥签名整个握手记录，
                                          证明"我是证书主人"
                                       ⑥ Finished
   ⑦ Finished ──────────────────────►
   ───────── 已经能传加密数据了 ─────────
```

对着 1.2 看，改了这几点：

- **2-RTT → 1-RTT**：1.2 客户端要等服务器 ③④⑤ 三步全说完才发自己的密钥参数（⑦），一来一回就两个 RTT。1.3 让客户端**在第一个 ClientHello 里就带上 key share**（①），服务器回 ServerHello 也带上（②），双方的共享秘密当场就算出来了——少等一整轮。恢复会话还能 **0-RTT**（第一个包就捎数据）。
- **ServerHello 之后全加密**：1.2 的 Certificate（③）是**明文**发的，中间人能看到你连的是谁；1.3 在 ② 之后就进入加密（③），连证书都加密发（④），中间人更难看清。
- **删掉 RSA 密钥交换，只留 ECDHE**：这就强制了**前向保密**（地基一讲过的那个 E）——服务器私钥以后泄露，也解不出历史流量。
- **新增 CertificateVerify（⑤）**：1.2 里"持有私钥"的证明和密钥交换混在一起（靠 RSA/签名隐含），1.3 把它**单拎出来**——服务器用私钥**对整段握手记录签名**，等于把"前面所有明文握手"都钉死，防降级篡改。
- **套件只留 AEAD**（AES-GCM / ChaCha20-Poly1305），把加密和完整性合一，堵掉 CBC 那些老毛病。

> 🔑 对着看就一句话：**1.3 = 把 1.2 的"先发参数后发证书、明文传、RSA 也能用"翻转成"客户端先猜参数、服务器选完就加密、强制 ECDHE"**——少一轮、全程加密、前向保密。

#### 和 Schannel 的关系（收束）

这整套 TLS 握手，在 Windows 上**就是由 Schannel SSP 干的**（对走系统 TLS 栈的程序而言）：

- Schannel 实现 TLS 1.2/1.3、SSL、DTLS、PCT 这几个协议（选型优先级见前面的 SSP 表）；
- 上面那 5 项证书校验，Schannel 调 Windows 的**证书库（Certificate Store）**和**CryptoAPI** 完成；
- 校验结果回到 LSA/应用，决定连接是否建立。

> 所以前面说"Schannel 是**唯一不验用户密码**的主流 SSP"——现在你应该明白：**它验的是服务器证书，不碰域账户密码**，自然用不上 Netlogon 那条路。它走的是"证书 + TLS"这条独立的认证通道。

---

### 收束

**你现在会了：**

- 登录分**交互式 / 网络 / 服务 / 批处理**等几种，编号不同、路径不同。
- 交互式登录 6 步：**SAS → Winlogon → Credential Provider 采集 → LSA → Negotiate 选 SSP 验钞（本地走 NTLM/SAM，域走 Kerberos/域控）→ 建 logon session + 发 access token**。
- **图里那些组件**：`secur32.dll`（接口）、`lsasrv.dll`（调度 + Negotiate）、SSP（NTLM/Kerberos/Schannel）、`samsrv.dll`（SAM）、`netlogon.dll`（通域控）、SRM（内核判官）。
- **Credential Provider 只采集不放行**；执法的是 LSA + 认证包。
- **NTLM 靠 pass-through 拉域控代验、Kerberos 靠票据服务器自己验**——两者都要联系域控，Netlogon 是那条通道。
- **凭据是伞形词**（明文/NT hash/TGT/服务票据/证书），不同场景指不同形态；落到哪决定扩散风险（RDP 落远程、网络登录基本不留）。
- **LSASS 存 4 种凭证形态**（明文/票据/NT hash/LM hash），关机清空；跨重启的存成 LSA secrets。
- 服务/驱动用 `ksecdd.sys`（内核态 SSP）；网络登录走 SSPI 握手；域控离线用缓存登录。

**下一讲才需要：** 第 ⑤ 步的 **access token（访问令牌）** 到底装了什么、程序怎么继承它、它怎么决定「你能不能访问某个文件」——这是从「认证」跨到「授权」的桥梁。

---

<!-- chapter-nav:start -->
← 上一章：[第 3 讲：名字 ↔ SID](./04-name-sid-lsa.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 5 讲：Access Token](./06-access-token.md)
<!-- chapter-nav:end -->
