---
title: "第 4 讲：登录——谁验密码，过程怎样（LSA）"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 4 讲：登录与 LSA"
order: 5
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：一次登录的完整解剖——SAS、Winlogon、LSA、SSP、Netlogon 到域控的接力；NTLM 代验与 Kerberos 票据的分野；凭据落到哪决定扩散风险。本机实拍：五种登录类型的 4624 统计、Session 0 隔离、nltest 安全通道、klist 里的 TGT。
---

# 第 4 讲：登录——谁验密码，过程怎样（LSA）

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本讲融合两篇官方文档：[Credentials processes in Windows authentication](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)、[Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)。

---

## 开场

**🧑‍🏫 老师：**

第 3 讲的「名字↔SID 翻译」是平时随时发生的轻量查询。本讲讲更重的事——**登录**：你开机输密码那一刻，谁来验这个密码、过程经过哪些组件、验完之后系统又干了什么。主角还是 **LSA**，但这次它不只翻译，而是要**执法**。

先分清两个词，本讲只讲前者：

| 词 | 白话 | 本讲 |
|----|------|------|
| **认证 Authentication** | 你是不是你声称的那个人？（验密码） | ✅ 讲透 |
| **授权 Authorization** | 验过之后，某个文件/共享能不能碰？ | ❌ 后面才讲 |

---

## 第 1 课：Windows 有哪几种「登录」

**🧑‍🏫 老师：**

「登录」不只有开机输密码一种。Windows 按场景分了几种，每种**走的路径、留不留凭证**都不一样——事件日志里能看到登录类型编号：

| 登录类型 | 编号 | 什么时候发生 | 例子 |
|----------|------|-------------|------|
| **交互式 Interactive** | 2 | 你**坐在键盘前**输密码登录 | 开机进桌面、RunAs |
| **网络 Network** | 3 | 你**从另一台机器**连过来 | 访问共享文件夹、SMB/RPC |
| **服务 Service** | 5 | 一个 **Windows 服务**启动时以某账户身份跑 | SQL Server、IIS |
| **批处理 Batch** | 4 | **计划任务**以某账户身份跑 | 凌晨自动跑的定时脚本 |
| **解锁 Unlock** | 7 | 锁屏后重新输密码解锁 | 离开工位锁屏，回来解锁 |
| **远程交互 RemoteInteractive** | 10 | RDP 远程桌面登进来 | mstsc 连服务器（第 8 课细讲） |

这不是纸面分类——**拿本机 Security 日志里最近的 300 条 4624（登录成功）事件统计登录类型**：

```text
Count Name
----- ------
   97 LogonType 5      ← 服务登录最多（后台服务一直在起）
   29 LogonType 3      ← 网络登录（访问共享/远程连接）
    5 LogonType 2      ← 交互式（人坐在机器前）
    2 LogonType 10     ← 远程交互（有人 RDP 进来过）
    1 LogonType 7      ← 解锁（锁屏后回来）
```

五种类型全部现身——排障时翻 4624 事件的 LogonType 字段，就能知道「这次访问是哪种姿势进来的」。本讲主线讲**交互式**（最常见、最完整），其它是它的变体。

---

## 第 2 课：全景图——登录要经过哪些组件

**🧑‍🏫 老师：**

先看微软官方那张客户端 LSA 架构图（[出处](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)）：

![Windows 客户端 LSA 架构图](/img/posts/windows-permission/authn_lsa_architecture_client.png)

图里东西很多，分成三层就清楚了：

```text
┌──────────────── 用户态（User Mode，受限）────────────────┐
│  ① 入口层：User Mode App / CredUI / Winlogon / Kernel App │
│       │  （经 secur32.dll 把凭据交下去）                  │
│       ▼                                                   │
│  ② LSA 大框（lsass.exe 进程里）：                         │
│       • lsasrv.dll  —— LSA 调度核心 + Negotiate 函数      │
│       • 一排 SSP   —— NTLM / Kerberos / Schannel / …      │
│       • samsrv.dll —— SAM（本机账户库）                   │
│       • netlogon.dll —— 通域控的安全通道                  │
└───────────────────────────────────────────────────────────┘
                       │
┌──────────────── 内核态（Kernel Mode，最高权限）────────────┐
│  ③ Security Reference Monitor（SRM）                      │
│       —— 定义访问令牌、做访问检查                          │
└───────────────────────────────────────────────────────────┘
                  出口：本机 SAM（注册表）或 域控（DC / KDC）
```

一张图的全部信息就是三句话：**上面**是「想登录的入口」；**中间**的 LSA 大框是「总装车」——本机的查 SAM、域的去问域控；**下面**的内核态 SRM 才是「真正决定你能不能访问」的裁判，它发访问令牌。

---

## 第 3 课：主角 LSA——LSA / LSASS / lsasrv.dll 三词辨析

**🧑‍🏫 老师：**

中间那个 LSA 大框是本讲主角。**LSA（Local Security Authority，本地安全机构）** 是 Windows 里专门管「安全和身份」的子系统，拆开名字看：**Local**——每台 Windows 都有自己的 LSA；**Security**——管安全这摊；**Authority**——本机「谁是谁」的最终裁决者。它的职责五条：

| 职责 | 白话 |
|------|------|
| 认证登录 | 你输密码，它验对不对 |
| 维护本地安全策略 | 谁能登、密码策略、审核策略 |
| 名字 ↔ SID 翻译 | 第 3 讲那个翻译 |
| 生成访问令牌 | 配合内核发 access token |
| 存凭证 | 登录后凭证存在它管的进程内存里（单点登录） |

**🧑‍🎓 学生：** 人们嘴里的「LSA」有时候好像指的不是同一个东西？

**🧑‍🏫 老师：**

敏锐。三个易混的词：

| 名词 | 是什么 | 比喻 |
|------|--------|------|
| **LSA** | 一个**概念/职能**——管安全认证这件事 | 公安局（机构） |
| **LSASS**（`lsass.exe`） | **跑这个机构的进程**，任务管理器里能看到 | 公安局那栋办公楼 |
| **`lsasrv.dll`** | LSA 的核心 DLL，真正干活的代码 | 楼里办公的科室 |

LSASS 全名 **Local Security Authority Subsystem Service**——名字本身就写着「实现 LSA 的那个子系统服务」。**LSA 是要干的事，LSASS 是干这件事的进程。**

> 🔑 **最关键也最容易混的一条**：说「LSA 存了凭证」是不精确的——**凭证实际存在 LSASS 进程的内存里**。所以「mimikatz 抠凭证」= 抠 LSASS 进程内存；「Credential Guard」= 把凭证从 LSASS 挪进虚拟飞地（LSAIso）；「LSASS 崩了」= 系统强制重启。这几句里的 LSASS 都不能换成 LSA——说的是**进程**。

LSA 还有个关键性质：**跑在用户态，却是受保护的系统进程**。在用户态 → 拿到管理员权限的进程理论上够得着它的内存（mimikatz 的根）；受保护 → Win 8.1 起「额外 LSA 保护」禁止非保护进程读它/注入，Credential Guard 更进一步虚拟化隔离（第 1 讲讲过）。

---

## 插问 1：LSASS 到底跑在哪个会话里？「Session 0」是什么？

**🧑‍🎓 学生：** 你说 Winlogon 把密码「递给」LSA——它俩是两个进程，那它们跑在同一个地方吗？我听说过 Session 0，一直没搞懂。

**🧑‍🏫 老师：**

本机直接拍给你看：

```powershell
PS> Get-Process lsass,winlogon | Format-Table Name,Id,SessionId -AutoSize

Name        Id SessionId
----        ---- ---------
lsass       488         0     ← LSA 在 Session 0
winlogon   1232         1     ← 给我桌面用的 Winlogon 在 Session 1
winlogon  33596         3     ← 另一个交互会话的
```

Windows 把进程按 **Session（会话）** 分隔：**Session 0** 是系统服务的专属后台区（LSA/LSASS 在这，非交互、无桌面）；**Session 1、2、3…** 每个交互登录分一个，有自己的桌面。登录时 LPC 通道跨的就是「用户 session → Session 0」这条边界。

**为什么要隔**：Vista 之前服务和第一个登录用户共享 session——服务权限高（常以 SYSTEM 跑），用户态程序能给它们发窗口消息搞提权（**shatter attack**）。Vista 起强制 Session 0 非交互，服务和用户**永远不在一个桌面**；Win10 1803 起连「有服务想弹界面」的提示服务都移除了——Session 0 彻底禁止 GUI（[Session 0 Isolation](https://techcommunity.microsoft.com/blog/askperf/application-compatibility---session-0-isolation/372361)）。

---

## 第 4 课：图里那些组件——SSP 是可插拔的锁匠

**🧑‍🏫 老师：**

组件说明书（对应官方组件表）：

| 组件 | 是什么 / 干什么 |
|------|----------------|
| **Winlogon** | 管安全交互的执行体，在「安全桌面」上收集凭据。**SAS（Ctrl+Alt+Del）就是它接的**——保证登录界面是系统真画的，不是恶意程序伪造的 |
| **CredUI / Credential Provider** | 登录界面那些磁贴；采集并序列化凭据 |
| **`secur32.dll`** | 认证提供者的基础接口层（SSPI） |
| **`lsasrv.dll`** | LSA 调度核心；**里面的 Negotiate 函数决定这次走 NTLM 还是 Kerberos** |
| **SSP** | 一排认证协议的实现包：NTLM、Kerberos、Schannel、Negotiate、Digest… |
| **`netlogon.dll`** | 维护**到域控的安全通道**（下一课主角） |
| **`samsrv.dll`** | 本机账户库 SAM |
| **Registry（`HKLM\SECURITY`）** | 存 SAM 副本与本地安全策略——只 SYSTEM 能访问 |

重点展开 **SSP（Security Support Provider）**：**把某种认证协议做成一个可插拔的模块**。把协议想成锁匠手艺，SSP 就是锁匠本人——NTLM 协议由 NTLM SSP 实现、Kerberos 由 Kerberos SSP 实现、TLS/SSL 由 Schannel SSP 实现。精髓在**可插拔**：所有 SSP 遵守同一接口规范 **SSPI**——SSPI 是标准电源插座，每个 SSP 是一个符合标准的插头，`secur32.dll` 就是插座实现（SSPI 是 GSSAPI 的 Windows 实现，对应 RFC 2743/2744，不是微软拍脑袋）。

官方的 8 个默认 SSP：

| SSP | DLL | 管什么 | 什么时候用 |
|-----|-----|--------|-----------|
| **Kerberos** | `kerberos.dll` | Kerberos v5 | 域账户认证（默认主力） |
| **NTLM** | `msv1_0.dll` | NTLM / NTLMv2 | 本地账户、老网络认证（在弃用） |
| **Negotiate** | `lsasrv.dll` | 不是协议，是**选择器** | 先试 Kerberos，不行退 NTLM（SPNEGO，RFC 2478） |
| **Schannel** | `schannel.dll` | TLS/SSL/DTLS | HTTPS、加密通道 |
| **Digest** | `wdigest.dll` | Digest（MD5） | ⚠️ Win8/2012 R2 起默认禁用（内存留明文） |
| **CredSSP** | `credssp.dll` | 凭据委托 | RDP 的 NLA |
| **NegoExts** | `negoexts.dll` | Negotiate 扩展 | 联邦场景，失败不回退 |
| **PKU2U** | `pku2u.dll` | 对等认证（无域） | HomeGroup（已废弃） |

> ⚠️ 修正一个常见误解：很多人以为 Negotiate 的 DLL 是 `secur32.dll`——不是。官方明确 Negotiate 的位置在 **`lsasrv.dll`**（和 LSA 调度核心同一个 DLL）；`secur32.dll` 是 **SSPI 接口本身**。另有一个同义词：**SSP 和「认证包（Authentication Package）」常指同一个东西**——站在协议实现叫 SSP，站在 LSA 登录时调用叫认证包。

两边怎么商定用哪个 SSP：①**单协议**——服务器指定只能用某协议，客户端不支持直接失败；②**Negotiate 协商**——基于 SPNEGO，服务器列出可选协议发首选响应，客户端挑双方都支持的。Windows 偏好 Kerberos。

---

## 第 5 课：Netlogon——本机到域控的专属隧道

**🧑‍🏫 老师：**

**Netlogon（`netlogon.dll`，也是一个系统服务）** 是本机和域控之间那条「专属安全通道」的维护者和使用者。为什么需要它：域账户（如 `jzfz\chengongyi`）的密码不在本机、在域控的 AD 里，登录时必须把请求送到域控验——但网络上不可信，不能明文发密码，得有一条**加密的、互验过身份的专属通道**。四项职责：

| 职责 | 白话 |
|------|------|
| ① 维护到域控的安全通道 | 加密、互验身份的本机↔DC 通道 |
| ② 经通道传凭据、拿回 SID 和权利 | 认证请求送 DC，域 SID 和用户权利传回 |
| ③ 在 DNS 里登记和找域控 | 把域名解析成域控 IP——知道「域控在哪」 |
| ④ 管域控之间的复制 | RPC 复制协议（NT 时代 PDC/BDC 说法；现代 AD 是多主复制，每台 DC 平等，"PDC"只是模拟器角色） |

本机验证这条通道真实存在——`nltest /sc_query:` 查机器到自己域控的安全通道：

```text
PS> nltest /sc_query:jzfz

Flags: 30 HAS_IP  HAS_TIMESERV
Trusted DC Name \\JZFZDC10.jzfz.local          ← 本机的域控是这台
Trusted DC Connection Status Status = 0 0x0 NERR_Success   ← 通道正常
The command completed successfully.
```

`Netlogon` 服务 Running，通道指向 `JZFZDC10.jzfz.local` 且状态成功——第 3 讲「翻译要问域控」走的、本讲「验密码要送域控」走的，都是这条隧道。

**🧑‍🎓 学生：** Schannel 也叫「安全通道」，跟 Netlogon 什么关系？

**🧑‍🏫 老师：**

官方特意标了 "not to be confused with Schannel"。两者都带 secure channel 字样，管的通道性质完全不同：

| | **Netlogon** | **Schannel（SSP）** |
|---|---|---|
| 是什么 | 系统服务 | 一个 SSP |
| 管什么通道 | 本机 ↔ **自己域的域控**，固定、专属 | 任意两端的 **TLS 会话**，临时、通用 |
| 认证什么 | 域账户 / 机器账户 | **服务器的证书**（你连的是真网站吗） |
| 典型场景 | 登录域账户、域内机器通信 | 浏览器访问 `https://` |

类比：Netlogon 是「公司内部固定加密专线」，Schannel 是「公共加密通话服务」。反直觉的一点：**Schannel 是唯一不验「用户密码」的主流 SSP**——它验服务器证书，用户身份交给上层协议，所以它几乎不搭 Netlogon 的车。两者会同场出现但各管各的：域账户登录（Netlogon 送验）后打开公司 HTTPS 网站（Schannel 做 TLS 握手）——一个管「我是谁」，一个管「传输加密」。

层次关系钉死（最容易混的点）——**Netlogon 不是 SSP 之一，是被 SSP 调用的服务**：

```text
       SSP（会某种手艺的锁匠）
       ┌──────────┬──────────┬──────────┐
      NTLM    Kerberos   CredSSP   Schannel ...
       └──────────┴────┬─────┘
                      │  （认证要在域控上验域账户时，调用它）
                      ▼
                  Netlogon          ← 快递员：被发货人「叫」去送货
                      ▼
                   域控（DC）
```

任何 SSP，只要认证最终要在域控上验域账户，都搭 Netlogon 这趟车；本地账户不用——NTLM 直接查本机 SAM。顺带一句真实背景：Netlogon 是域环境枢纽，一直被攻击者盯上——最出名的 **CVE-2020-1472（Zerologon）** 利用其加密协议缺陷不改密码拿下域控，这也是微软后来强制 Netlogon 用更强加密的原因。

---

## 第 6 课：NTLM 和 Kerberos 到底怎么验的

**🧑‍🏫 老师：**

两个主力 SSP 验密码时，客户端、服务器、域控三方怎么互动——**流程根本不同**（基于官方 [NTLM 三方架构](https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm)）。

**NTLM：挑战-响应，服务器验不了、转手给域控代验（pass-through）**：

```text
客户端(Client)            服务器(Server)            域控(DC)
   ① 要访问服务
        │ ── Windows Sockets（普通 TCP）──►
   ② 服务器发个随机数(challenge)
        │ ◄──────────────────
   ③ 客户端用密码哈希加密 challenge，返回响应
        │ ──►
   ④ 服务器收到响应，但验不了（域账户的哈希在域控 AD 里）
        │   服务器上的 LSA 判断 "if not local logon"
        ▼
   ⑤ 经 Netlogon 把请求 Pass-thru（直通）给域控
        │ ── RPC to ADDS on DC ──►
   ⑥ 域控查 AD 验响应，结果返回
   ⑦ 服务器据此放行/拒绝
```

**Kerberos：靠票据，服务器自己就能验**：

```text
客户端(Client)             域控(KDC)              服务器(Server)
  ① 登录时，客户端用密码向 KDC 换一张 TGT（票据授予票据）
  ② 要访问服务器时，拿 TGT 向 KDC 换「服务票据」
  ③ 把服务票据直接交给服务器
                                          ④ 服务器用共享密钥自己验票据，
                                             不必找域控
```

本机验证票据这套真实存在——`klist` 看我当前的 Kerberos 票据缓存：

```text
PS> klist
Current LogonId is 0:0x96b49
Cached Tickets: (3)

#0>     Client: chengongyi @ JZFZ.LOCAL
        Server: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL      ← 这就是 TGT（找 KDC 换票的凭证）
        KerbTicket Encryption Type: AES-256-CTS-HMAC-SHA1-96
        Start Time: 8/26/2026 8:35:43 (local)
        End Time:   8/26/2026 18:35:43 (local)       ← 10 小时有效
        Renew Time: 9/2/2026 8:35:43 (local)         ← 可续期 7 天
```

一张真实的 TGT 躺在缓存里：AES-256 加密、10 小时寿命、可续期——「登录一次换张票、白天随便用」的 Kerberos 模型就是它。

一张表收本质差别：

| | **NTLM** | **Kerberos** |
|---|---|---|
| 凭证形态 | 密码哈希算出的 challenge 响应 | **票据**（TGT + 服务票据） |
| 谁验客户端身份 | 服务器验不了 → pass-through 给域控代验 | **服务器自己验**（共享密钥验票据） |
| 域控的角色 | 每次认证都参与 | 只在事先发票据时参与，验时不参与 |
| 域控断连 | 认证失败（除非有缓存） | 已拿到票据的话服务器照样验 |
| 地位 | 老、在弃用 | **域认证默认主力** |

---

## 第 7 课：交互式登录——一步步走完整条链

**🧑‍🏫 老师：**

组件和协议都认识了，串起来。例子就用你自己：`jzfz\chengongyi` 输密码登录 `PC3507`（已加域）。

**① SAS → Winlogon 接手。** 你按 `Ctrl+Alt+Del`（**SAS，Secure Attention Sequence**）——这个组合键的意义是**保证登录界面是系统真画的**：恶意程序拦截不了 SAS，伪造不了假登录框。接 SAS 的是 Winlogon。

**② Logon UI + Credential Provider 采集凭据。** Winlogon 拉起登录界面（磁贴），你输密码——采集并打包的是 **Credential Provider**（一个 DLL）。官方反复强调：**Credential Provider 只负责「采集 + 序列化」，不是执法机关**——换 PIN / 指纹 / Windows Hello 登录，本质是换了不同的 Provider 采集，**验密码的还是同一套 LSA**。

**③ 凭据交给 LSA（经 LPC 调 `LsaLogonUser`）。** Winlogon 和 LSA 是两个进程，怎么安全地递密码？**`LsaLogonUser`（递什么：用户名、密码、认证包、登录类型打包成一个 API 调用）+ LPC（怎么递：同机进程间的高速通信，类比「同一栋楼的内线电话」，跨的就是插问 1 那条 Session 1 → Session 0 的边界）**。LPC 由内核中介，只有合法调用方能把凭据递进 LSA。**到这一步，你的明文密码才第一次离开登录界面、进入 LSASS 的地盘。**

**④ LSA 选认证包、去对答案。** `lsasrv.dll` 的 Negotiate 函数决定走哪条路：

| 账户类型 | Negotiate 选的 SSP | 去哪对答案 |
|---------|-------------------|-----------|
| 本地账户（`PC3507\LabUser1`） | NTLM（Msv1_0） | 本机 SAM |
| 域账户（`jzfz\chengongyi`） | Kerberos | 域控的 AD（经 Netlogon 通道，第 5 课那条 `nltest` 看到的隧道） |

**⑤ 验对：建 logon session + 发 access token。** 认证包创建一个 **logon session**；LSA 让内核的 **SRM** 生成 **access token**——装着你的 SID、组 SID 的「身份快照」。之后你启动的每个程序都**继承这份 token**——登录一次、开任何程序不再输密码（单点登录）。

**⑥ 验错：回登录界面。** 密码错、账户禁用、登录时段限制、域控连不上且无缓存 → 失败重来。

```text
你按 Ctrl+Alt+Del（SAS）
   ▼
Winlogon 接手，拉起 Logon UI
   ▼
Credential Provider 采集凭据（只采集，不放行）
   ▼
Winlogon ──secur32.dll──► LSA（lsass.exe，Session 0）
   ▼
lsasrv.dll 的 Negotiate 选 SSP：
   ├─ 本地账户 → NTLM/Msv1_0 → 查本机 SAM
   └─ 域账户   → Kerberos → 经 netlogon.dll 问域控的 AD
   ▼
验对 → 建 logon session + 内核 SRM 发 access token → 进桌面
验错 → 回登录界面
```

---

## 插问 2：「凭据」到底是什么？落到哪决定风险

**🧑‍🎓 学生：** 这讲反复出现「凭据」——远程登录的凭据，和登录自己电脑的凭据，是一个东西吗？

**🧑‍🏫 老师：**

**凭据 = 任何能证明「我是某个身份」的东西**——伞形词，不是单样东西：

| 凭据形态 | 是什么 | 什么时候出现 |
|---------|--------|-------------|
| 明文密码 | 你敲的那串字符 | 登录框、RDP 输入框 |
| NT hash | 密码的 MD4 哈希 | 本地登录后存进 LSASS；NTLM 用它 |
| Kerberos TGT | KDC 发的加密票据 | 域账户登录后拿到（第 6 课 klist 里那张） |
| Kerberos 服务票据 | 访问具体服务的票据 | 访问共享、SQL 时用 |
| 证书 / 智能卡 | X.509 + PIN | 高安全场景 |

**源头一样，但落到哪不同——这决定扩散风险**：

| 场景 | 登录类型 | 凭据落到哪 | 被攻破后风险 |
|------|---------|-----------|-------------|
| 登录自己电脑 | 交互式(2) | 本机 LSASS | 本机被攻破 → 凭据泄露 |
| RDP 远程登录 | 远程交互(10) | **远程主机** LSASS（全套 NT hash + TGT） | 远程主机被攻破 → 凭据泄露（横向移动高价值目标） |
| 访问共享(SMB) | 网络(3) | **基本不留**（只递交票据/响应） | 扩散风险小 |

而 **LSASS 内存里到底存了什么**（这关系到 mimikatz）？官方说得很清楚，四种形态：**可逆加密的明文密码、Kerberos 票据、NT hash、LM hash**。两个关键细节：智能卡登录时不存明文密码（但仍存 NT hash + PIN）；**明文密码的存储没法关掉**——这就是 mimikatz 抠内存能拿到明文的根。现代补救是 Credential Guard（把凭证挪进 LSAIso 虚拟飞地）。

这些凭证在**内存**里，关机就没了。两类补充：必须**跨重启**保留的（服务账户密码、计划任务密码、IIS 应用池密码、机器的 AD 账户密码）以 **LSA secrets** 形式加密存在硬盘（只 SYSTEM 能读）；**域控连不上时**，LSA 退用注册表 security hive 里缓存的凭据验登录（带笔记本出差还能用域账户的原因）——本机 `CachedLogonsCount = 10`，即最多缓存 10 次域登录的哈希。缓存的是哈希，所以也是 mimikatz 的目标之一。

服务/驱动的登录两个变体：**服务**由服务控制器用配置的账户登录（跑 SYSTEM 的不用出示凭证）；**内核态的东西**（驱动）走 `ksecdd.sys`——内核态 SSP，经 LPC 进 LSA。**网络登录**（类型 3）不是输密码，而是两个程序之间用 SSPI 握手（`InitializeSecurityContext` / `AcceptSecurityContext` 反复几轮），成功后服务端 LSA 建安全上下文、把 token 挂到模拟线程上（第 33 讲模拟的伏笔）。

---

## 第 8 课：实战——RDP 远程登录的完整流程

**🧑‍🏫 老师：**

实际工作更常见的场景：你在 `PC3507` 上用 mstsc 连到域里服务器，输域账户密码进去了。RDP 登录是**远程交互登录（类型 10）**——还记得第 1 课的统计里那两条 `LogonType 10` 吗，就是这种姿势。

老的 RDP 有个毛病：**先建会话占资源、再让你输密码**——密码错了服务器白忙，还容易被拿来 DoS。现代 RDP 用 **NLA（Network Level Authentication）**：**建会话之前先认证**，靠的是 CredSSP（SSP 表里那个「凭据委托」）：

```text
① mstsc 向目标机 3389 发起连接
② 双方先建 TLS 加密通道（Schannel 干的）          ← 传输层先加密
③ 在 TLS 隧道里跑 CredSSP：你的电脑向 KDC 为目标机
   申请一个 Kerberos 服务票据                      ← 这步可能联系域控
④ 凭据（密码 / 票据）经 CredSSP 送到目标机
⑤ 目标机的 LSA 验：本地验不了域账户 → 经 Netlogon 问域控确认
⑥ 验过 → 目标机建一个远程交互会话，在它自己的
   LSASS 里存下你的 NT hash + TGT，给你完整桌面
```

关键在第 ④⑥ 步：**CredSSP 做的是「凭据委托」**——你的凭据被送到远程主机，让你 RDP 进去后还能以你的身份访问第三方资源（接着打开文件服务器）。代价就是插问 2 表里那行：**你的凭据落在了远程主机的 LSASS 里**，远程主机被攻破你的凭据就泄露——RDP 一直是横向移动的高价值目标。两种模式：

| 模式 | 怎么做 | 密码落到远程主机吗 |
|------|--------|------------------|
| 普通 RDP（默认） | 经 CredSSP 把凭据/票据委托过去 | **会**（落到对方 LSASS） |
| **Restricted Admin**（Win8.1+） | 只做 NTLM 响应或用服务票据，不送密码 | **不送**——对方只拿到机器账户身份，攻击面小 |

---

## 插问 3：我自己写的程序怎么接域账户？LDAP 验证那套

**🧑‍🎓 学生：** 前面都是 Windows 系统级的认证。如果我写个 Web 服务、或者配 Jenkins/GitLab，想让用户拿域账号登录——程序怎么验？

**🧑‍🏫 老师：**

这条路不走 LSA，**直接用 LDAP 协议查域控上的 AD**——域控同时是 LDAP 服务器。LDAP 验密码的本质是 **bind（绑定）**。两种主流做法：**A. 直接 bind**——拿用户输的「用户名+密码」直接去连域控 bind，对就成功；缺点是可能要知道用户的 DN（`CN=程工乙,OU=研发,DC=jzfz,DC=com`），用户不记得。**B. 服务账号搜索（更常用）**——先用一个有搜索权限的服务账号 bind 进去、按用户名搜出 DN，再解绑、用「用户的 DN + 用户输的密码」bind 一次确认。

C# 三种 API 按推荐度：**`PrincipalContext`**（最现代，一行）＞ `DirectoryEntry`（经典 ADSI）＞ `LdapConnection`（底层跨平台）。推荐写法：

```csharp
using System.DirectoryServices.AccountManagement;

using var ctx = new PrincipalContext(ContextType.Domain, "jzfz.com");
return ctx.ValidateCredentials(username, password);   // 内部就是 LDAP bind
```

⚠️ 两个安全要点：明文 LDAP 走 389 端口**必须换成 LDAPS（636）**，否则密码网上裸奔；密码错误多次会触发 AD 账户锁定，验证逻辑小心别把用户试锁了。和系统登录的区别一句话：**系统登录拿到的是身份 + 后续权限（token）；LDAP 验账户只是查一次密码对不对（一个 bool），验完程序自己决定给什么权限**。

---

## 第 9 课：Schannel 那一侧——打开 HTTPS 网站时发生了什么

**🧑‍🏫 老师：**

第 5 课说「Schannel 管 TLS 握手、验证书」——把这句话拆到底。你在浏览器输 `https://www.baidu.com` 回车后（现代浏览器多自带 TLS 栈，但很多 .NET 应用和系统组件走的就是 Schannel，握手机制一致）：

目标两件事：**在不安全的网络上协商出只有双方知道的会话密钥**（之后全加密）+ **确认对面真的是百度**（防中间人）。先打两块地基。

**地基一：会话密钥怎么算（ECDHE）。** 双方各自临时生成一对公私钥，把公钥（key share）发给对方，各自「用自己私钥 + 对方公钥」算出**同一个共享秘密 S**——**S 从没在网上传过**，两边算出来一模一样：

```text
客户端                                  服务器
  临时私钥 a、公钥 A                      临时私钥 b、公钥 B
  ────── A 发出去 ──────►               ◄────── B 发出去 ──────
  用 a + B 算出：S                       用 b + A 算出：S
```

中间人凑不出 S：从公开的 A、B 反推 a、b 是椭圆曲线离散对数难题。a、b 是**临时的**（名字里的 E，Ephemeral）——每次连接现生成、用完就扔，所以**就算服务器私钥哪天泄露，也解不出以前抓到的流量**（前向保密，TLS 1.3 因此删了老式 RSA 密钥交换）。最终会话密钥 = S + 双方各出的一个随机数，喂进 KDF——每条连接的密钥都不同，防重放。

**地基二：证书校验查什么（客户端这侧）。** 服务器发来证书，五道关卡哪项不过都报警：

| 检查项 | 查什么 |
|--------|--------|
| ① 证书链可信 | 百度证书 → 中间 CA → 根 CA 逐级验签，接到信任库里的根 |
| ② 有效期 | 当前时间在 notBefore ~ notAfter 之间 |
| ③ 域名匹配 | 证书 SAN 和你访问的域名一致 |
| ④ 是否被吊销 | CRL / OCSP（现代多用 OCSP Stapling） |
| ⑤ 持有者证明 | CertificateVerify：服务器用私钥签名握手数据——真持有私钥 |

**TLS 1.2 握手（2-RTT）**：

```text
   ① ClientHello ──►（支持的套件、版本、随机数 A）
   ② ServerHello ◄──（选定套件、随机数 B）
   ③ Certificate ◄──（证书链）
   ④ ServerKeyExchange ◄──（ECDHE 公钥）
   ⑤ ServerHelloDone ◄──
   ⑥ 客户端验证书（五道关卡）
   ⑦ ClientKeyExchange ──►（客户端的 ECDHE 公钥）
   ⑧ ChangeCipherSpec + Finished ──►（"从现在起用密钥了"）
   ⑨ ChangeCipherSpec + Finished ◄──
   ⑩ 双方已算出会话密钥，之后全加密
```

**TLS 1.3 砍了什么**（现在默认主力）：**2-RTT → 1-RTT**——客户端在第一个 ClientHello 里就直接带上 key share，服务器回包也带，共享秘密当场算出（恢复会话还能 0-RTT）；**ServerHello 之后全加密**——连证书都加密发，中间人看不清你连的是谁；**删掉 RSA 密钥交换只留 ECDHE**——强制前向保密；**新增 CertificateVerify**——服务器用私钥对整段握手记录签名，防降级篡改；套件只留 AEAD（AES-GCM / ChaCha20-Poly1305）。

收束到 Schannel：这整套握手在 Windows 上对走系统 TLS 栈的程序而言**就是 Schannel SSP 干的**——它实现 TLS 1.2/1.3/DTLS，调 Windows 证书库和 CryptoAPI 做那五项校验。现在彻底明白「Schannel 是唯一不验用户密码的主流 SSP」：它验的是服务器证书，走的是独立的认证通道。

---

## 收束

**你现在会了：**

- 登录分**交互式(2)/网络(3)/批处理(4)/服务(5)/解锁(7)/远程交互(10)**——本机 4624 统计五型全见；排障翻 LogonType 就知道「怎么进来的」。
- 交互式登录 6 步：**SAS → Winlogon → Credential Provider 采集（只采集不放行）→ 经 LPC 递给 LSA → Negotiate 选 SSP（本地走 NTLM/SAM，域走 Kerberos/域控）→ 建 logon session + SRM 发 access token**。
- **LSA 是职能、LSASS 是进程、lsasrv.dll 是代码**；凭证物理上存在 LSASS 内存里；LSASS 跑在 Session 0（本机实拍 Id 488 / Session 0）。
- **SSP 是可插拔的协议锁匠**（SSPI 插座/插头），8 个默认 SSP 认脸；**Netlogon 是被 SSP 调用的「快递员」**（`nltest /sc_query` 实拍通道到 JZFZDC10）。
- **NTLM 靠 pass-through 拉域控代验、Kerberos 靠票据服务器自己验**（klist 实拍 TGT：AES-256、10 小时、可续期）。
- **凭据是伞形词**，落到哪决定扩散风险：RDP 全套落远程 LSASS、网络登录基本不留；LSASS 存四种形态，明文没法关——根治靠 Credential Guard。
- RDP 的 NLA 与凭据委托、LDAP bind 验账户（`ValidateCredentials`）、TLS 握手（ECDHE + 证书五查 + 1.3 的砍法）。

**下一讲才需要：** 第 ⑤ 步的 **access token（访问令牌）** 到底装了什么、程序怎么继承它、它怎么决定「你能不能访问某个文件」——从「认证」跨到「授权」的桥梁。

---

<!-- chapter-nav:start -->
← 上一章：[第 3 讲：名字 ↔ SID](./04-name-sid-lsa.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 5 讲：Access Token](./06-access-token.md)
<!-- chapter-nav:end -->
