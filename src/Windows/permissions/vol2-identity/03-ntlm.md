---
title: "第 17 讲：NTLM 与协商（Negotiate）"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 17 讲：NTLM 与协商"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
  - "NTLM"
  - "Negotiate"
---

# 第 17 讲：NTLM 与协商（Negotiate）

上一章小王刚学会：[Kerberos](./02-kerberos.md) 用域控盖章，网上证明「我是谁」，不必把密码交给每台文件服务器。  
本讲只发明一件事——**为什么现实里并不总是走盖章换票**。

---

### 小王以为会了，现场却对不上

他用域账户登录，`klist` 里能看到 TGT，访问 `\\文件服务器主机名\共享` 也顺利。  
领导临时让他连另一台机器上的目录，地址写成了 **IP**：

```text
\\192.168.10.88\交换
```

目录能打开。小王习惯性再敲一次 `klist`，却找不到「专门发给这台 192.168.10.88 的服务票」——至少不像上次看主机名共享时那么干净。

同事随口说：安全日志里这次认证包写的是 **NTLM**。

小王卡住了：

> 不是说网上都用 Kerberos 票据吗？怎么又冒出个 NTLM？  
> 那我上一章学的还算数吗？

他的错觉是：

> 「域里 = 永远只有 Kerberos 一种证明方式。」

---

### 其实系统手里不止一张牌

回想一下要解决的问题：**对方机器怎么相信你是小王**，同时尽量少把密码交给对方。

盖章换票（Kerberos）是很漂亮的一种答法——但前提够多：找得到盖章处、对方服务有正确的名字可被认到、网络与信任关系允许走这条路，等等。  
现场并不总满足这些前提。IP 访问、某些老路径、工作组机器、协商失败后的退路……系统还需要**另一套证明办法**，否则共享会直接全军覆没。

于是历史上留下了另一条路：**挑战—应答**。

用人话讲：

1. 服务器出一道「题」（挑战）；  
2. 你的机器用能证明「我知道密码」的方式算出「答案」（应答），**不把密码明文交出去**；  
3. 服务器（或它背后的域）核对答案，认不认你。

这条路不依赖「先向 KDC 换一张只给这台服务的票」那种节奏，所以在 Kerberos 走不通时，常常还能干活。

微软文档把它叫做 **NTLM**：一种 Windows 认证协议，本质是挑战—应答；并写明它是较老的协议，新部署更推荐 Kerberos。  
来源：[NTLM Overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview)

和上一章对照，只记差别，不背报文：

| | Kerberos（上一章） | NTLM（本讲） |
|--|-------------------|--------------|
| 怎么证明 | 向盖章处换票，给服务器看票 | 挑战—应答 |
| 典型依赖 | 域、KDC、服务名等 | 不靠「先换服务票」那条完整链路 |
| 文档态度 | 现代域环境的主力 | 遗留 / 兼容；新部署不优先 |

所以：上一章没学错——**能走盖章时，优先盖章**；本讲补的是：**走不通时，系统还可能改用 NTLM**。

---

### 那谁决定用哪一张牌？——协商

小王又问：每次连共享，是人手工选 Kerberos 还是 NTLM 吗？

不是。客户端和服务器前面往往还有一层「先商量用哪种」的机制。  
Windows 认证架构里，LSA 一侧有 **Negotiate（协商）**：在合适的安全包之间做选择，常见就是在 **Kerberos 与 NTLM** 之间判断走哪条。  
来源：[Credentials processes in Windows authentication](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)（LSA / Negotiate）

贴学名可以先收成三句：

| 白话 | 常见叫法 |
|------|----------|
| 盖章换票那一套 | **Kerberos** |
| 挑战—应答那一套 | **NTLM** |
| 先商量、再选用其中一种 | **Negotiate（协商）** |

直觉（够用即可）：

> **Negotiate 常尽量优先 Kerberos；条件不够时，才落到 NTLM。**  
> 你看到「这次是 NTLM」，多半不是「域坏了」，而是**这一次连接没走成盖章换票**。

官方也写明：Negotiate 默认倾向 Kerberos；只有 Kerberos 用不上、或信息不够时，才会落到 NTLM。  
NTLM 仍留着，是因为兼容路径：老系统、简单场景、以及 Kerberos 前提一时凑不齐时，还得有一条退路。  
来源：[SSPI architecture · Negotiate SSP](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/security-support-provider-interface-architecture)、[NTLM Overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview)

---

### 程序并不直接「说协议」——SSPI 与办事员

小王又听见同事甩两个词：**SSPI**、**安全支持提供程序（SSP）**。  
他以为又要背一整套新协议。其实只是把上一节的「协商」再往下拆一层：程序到底找谁办事。

先发明，不贴英文：

1. 文件共享客户端、浏览器、某段 C# 代码，通常**不想**自己拼 Kerberos / NTLM 报文；  
2. 它们只走到操作系统门口，说：「帮我跟对面证明我是谁」；  
3. 门后有一个**统一柜台**；柜台里坐着好几位**办事员**——有人擅长盖章换票，有人擅长挑战—应答，还有人管 TLS 一类事；  
4. 有时你点名找某位办事员；更常见的是找一位**会挑人**的接待员——他先看条件，再决定派谁上场。

现在才贴学名（来源同上 [SSPI architecture](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/security-support-provider-interface-architecture)）：

| 刚才发明的东西 | 常见叫法 |
|----------------|----------|
| 统一柜台（应用调用的那套 API） | **SSPI**（Security Support Provider Interface） |
| 柜台里的一位办事员 | **SSP**（Security Support Provider，安全支持提供程序） |
| 会挑人的接待员 | **Negotiate SSP**（基于 SPNEGO；在 Windows 上常在 Kerberos 与 NTLM 之间选） |
| 挑战—应答那位办事员 | **NTLM SSP**（实现落在 `%Windir%\System32\msv1_0.dll`） |

回扣 [第 3 讲](../vol1-invent/04-name-sid-lsa.md) 那张 LSA 客户端架构图：黄框里排着 NTLM / Kerberos / Schannel…——那一排就是「办事员」。  
第 3 讲只让你记住「本地路径常跟 NTLM↔SAM 有关、域路径常跟 Kerberos / 域控有关」；本讲补的是：**网上认人时，应用经 SSPI 找办事员；Negotiate 负责挑；挑中 NTLM 时，就是挑战—应答那条路。**

文档还写明：NTLM SSP 不只服务「你以为的登录对话框」，**SMB 文件共享、HTTP Negotiate、RPC** 等场景都会用到它。  
所以小王在共享路径上撞见 NTLM，和网页认证里出现 NTLM，往往是**同一套办事员**，不是两套互不相干的世界观。

#### 在 HTTP / IIS 上怎么「看见」同一思想

装站步骤不展开。只看一张菜单：很多 IIS 站点的 **Windows 身份验证** 提供者列表里，会同时挂着 **Negotiate** 与 **NTLM**——和本讲桌子上的「接待员 + 挑战—应答办事员」是同一幅地图。  
配置形态大致是（示意，不是让你照抄去生产环境乱改）：

```xml
<windowsAuthentication enabled="true">
  <providers>
    <add value="Negotiate" />
    <add value="NTLM" />
  </providers>
</windowsAuthentication>
```

来源：[IIS on Nano Server · Windows authentication providers](https://learn.microsoft.com/en-us/windows-server/get-started/iis-on-nano-server)（`windowsAuthentication` / `providers`）

读法只记一句：

> 列表里的 **Negotiate** = 先商量（常优先 Kerberos）；**NTLM** = 允许直接或退到挑战—应答。  
> 浏览器 / 反向代理最终谈成哪一种，仍取决于这一次的名字、信任与策略——和共享用 IP 掉到 NTLM 是同一类故事。

---

### 小王怎么「看见」自己掉到了哪条路

不必会拆协议。现场用现象对齐地图就行：

**1. 先问：我是不是在用「主机名」走域内共享？**  
`\\服务器主机名\共享` 且双方都在能聊到域控的环境里，更常看到 Kerberos 服务票。  
改成纯 IP、或对方根本不在这条信任/命名路径上，协商失败后出现 NTLM 并不稀奇。

**2. 再看口袋里的票。**  

```bat
klist
```

若这次访问按理该有对应服务的 Kerberos 票，却怎么也对不上，而资源又确实打开了——就要怀疑：**认证可能走了 NTLM，不是「没有认证」。**

**3. 安全日志里的认证包名称。**  
在域控或相关机器的安全审核里，登录成功/失败事件常会写明用的是哪种程序包（界面语言不同，可能直接出现 Kerberos / NTLM 字样）。  
小王的用法是：对照「同一次访问」的时间，看写的是哪一个——用来验证同事那句「这次是 NTLM」，而不是用来背事件 ID 表（事件 ID 留给附录）。

**4. 和权限别缠死。**  
NTLM 还是 Kerberos，解决的是**认人**；认完之后仍是令牌对 DACL、共享∩NTFS（卷一、[第 10 讲](../vol1-invent/11-access-check.md)）。  
能打开共享，只说明认证+授权都过了；`klist` 空，只说明**可能不是靠那张服务票过的认证**。

---

### 收束

**你现在会了：**  
网上证明身份不只 Kerberos 一种；**NTLM** 是挑战—应答的另一条路；**Negotiate** 负责在合适时选用（常优先 Kerberos，否则可能落到 NTLM）。  
应用通常经 **SSPI** 找「办事员（SSP）」；Negotiate 是会挑人的接待员；NTLM SSP 会出现在 SMB / HTTP Negotiate / RPC 等场景——和 IIS 提供者列表里同时挂 Negotiate、NTLM，是同一幅地图。  
看到 NTLM，先问「这一次为什么盖章换票没走成」，不要推翻上一章。

**下一章才需要：** 同一个人，「坐在屏幕前 / 访问共享 / 跑服务」——登录类型不同，令牌与可用能力也会不同。

不写：如何故意逼出 NTLM、中继或哈希相关攻击步骤；也不展开 IIS 装站细则。运维上应减少对 NTLM 的依赖，那是策略与架构题，本讲只建立地图。

---

<!-- chapter-nav:start -->
← 上一章：[第 16 讲：Kerberos](./02-kerberos.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 18 讲：登录类型](./04-logon-types.md)
<!-- chapter-nav:end -->
