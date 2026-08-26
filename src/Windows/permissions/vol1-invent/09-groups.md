---
title: "第 8 讲：组——对人打包"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 8 讲：组"
order: 9
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：组是把人拢成的安全主体——授一次权、包里的人凭令牌里的组 SID 全带走。三类「组」辨析（内置/特殊身份/域组）、组里套组、加组要重登才生效的令牌级实证（名册有我、令牌查无此组），外加 AGDLP 认脸。
---

# 第 8 讲：组——对人打包

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)——LabUser1（在 LabReaders 组里）、LabUser2（组外）就是为这讲准备的。

---

## 开场：30 个人的权限表

**🧑‍🏫 老师：**

前几讲的家当——令牌、Owner、权限位——够你把**某一个人**的权限拿捏得很细。可现实里等着用权限的常常是一群人：财务部 30 个人都要读公司那个共享目录。最直白的法子是挂 30 条「允许某某读取」——能跑，但日子一长：新来一个挨个目录添，走掉一个挨个删，**少删一条就是一个已离职的人仍握着权限**——安全上最怕的残留。

想要的其实是一件事：把「财务部这 30 个人」拢成一个整体，权限只对整体授一次；往后谁进谁出只动成员名册，不碰目录权限。这个「整体」就是**组**。

微软的定义只有一句：

> Security groups are a way to collect user accounts, computer accounts, and other groups into manageable units.

把用户、计算机、**甚至别的组**收拢成可管理的单元——**把人打包，授给这个包，包里的人便都带着包的身份去访问**。「和其它组」三个字值得多看一眼：**组里还能装组**，后面反复用到。

---

## 第 1 课：组也有自己的 SID

**🧑‍🏫 老师：**

组和用户一样是**安全主体**——系统认得它、能对它授权。既然是主体，自然也有 **SID**。DACL 里的规则、令牌里的身份，归根到底都是 SID，「给组授权」「身为组成员」底层全是 SID 与 SID 的比对。本机实地看（LabReaders 是我们实验场建的组）：

```powershell
PS> (New-Object Security.Principal.NTAccount('BUILTIN\Administrators')).Translate(
      [Security.Principal.SecurityIdentifier]).Value
S-1-5-32-544                          ← 内置组的 SID

PS> (Get-LocalGroup LabReaders).SID.Value
S-1-5-21-3515524382-1810956650-2183447911-1011    ← 自建组的 SID
```

自建组的 SID 是 `S-1-5-21-<本机标识>-1011`，和本机用户**同一个前缀**、只差末尾 RID——第 2 讲那个「RID 跳过 1011」的伏笔在这收口：**账户和组在同一个发号器里排队**（那天的流水账：LabUser1=1009、LabUser2=1010、LabReaders=1011）。到这里可以下个结论：**系统根本不在乎一个 SID 背后是人还是组，它只认 SID**。

## 授权怎么传到成员身上

把前几讲串起来：你在目录权限表里写「允许 财务组 读取」——这条规则挂的是组的 SID。张三来读目录时，他手里那张**令牌**（第 5 讲）不只装着自己的 SID，还**把所属所有组的 SID 一并带在身上**。系统拿这串 SID 和权限表逐条比对，对上「财务组」那条，放行。

> 微软：**"The permissions are assigned once to the group instead of multiple times to each individual user."** 授一次给组，而不是授 N 次给每个人——组化解麻烦的方式。逐条比对和冲突裁决是下一讲 ACE/DACL 的事。

---

## 第 2 课：三种常被混为一谈的「组」

**🧑‍🏫 老师：**

`whoami /groups` 一跑，令牌里携带的身份全摊开（本机节选）：

```text
组名                              类型     SID
Everyone                          已知组   S-1-1-0
BUILTIN\Administrators            别名     S-1-5-32-544
BUILTIN\Users                     别名     S-1-5-32-545
NT AUTHORITY\INTERACTIVE          已知组   S-1-5-4
NT AUTHORITY\Authenticated Users  已知组   S-1-5-11
JZFZ\CD-2013388_建筑              组       S-1-5-21-...
```

仔细看是**三类东西**：

**第一类：内置组**，SID 一律 `S-1-5-32-` 开头（whoami 标「别名」）：

| 内置组 | RID | 干什么的 |
|---|---|---|
| `Administrators` | 544 | 本机管理员，几乎全能 |
| `Users` | 545 | 普通用户，几乎所有账户默认在里头 |
| `Guests` | 546 | 来宾，权限极低 |
| `Backup Operators` | 551 | 靠特权绕过文件权限做备份/还原（第 6 讲见过 SeBackupPrivilege） |
| `Remote Desktop Users` | 555 | 允许 RDP 登录 |

本机 `Get-LocalGroup` 数一数：**21 个**本地组——20 个内置，外加我们实验场建的 `LabReaders`。

**第二类：特殊身份（special identity）——最容易栽跟头的一类。** `Everyone`、`Authenticated Users`、`INTERACTIVE`、`NETWORK`、`ANONYMOUS LOGON`……它们**不是你能往里加人的组**，而是系统看当时情况、临时把你算进去的身份：

> Special identity groups don't have specific memberships that you can modify, but they can represent different users at different times depending on the circumstances.

你没法往 `Everyone` 里加人：坐在键盘前登录你就是 `INTERACTIVE`；从网络连过来你就是 `NETWORK`；验过身份就是 `Authenticated Users`；任何人（含匿名，视配置）都算 `Everyone`。老坑：`Everyone` 和 `Authenticated Users` 长得像却**不等价**——授权别随手写 `Everyone`。

**第三类：域组**，`S-1-5-21-<域标识>-*`，域控集中定义（`JZFZ\CD-2013388_建筑` 那些个）。

| | SID 样式 | 谁管成员 |
|---|---|---|
| 内置组 | `S-1-5-32-*` | 本机管理员 |
| 特殊身份 | `S-1-5-*`（各种） | 没人管，系统按场景自动算 |
| 域组 | `S-1-5-21-<域>-*` | 域管理员 |

---

## 第 3 课：实地看——本地管理员组里装着什么

**🧑‍🏫 老师：**

看某个组里到底有谁，`Get-LocalGroupMember`。本机 Administrators 的名册（真实输出）：

```powershell
PS> Get-LocalGroupMember -Group Administrators

Name                 PrincipalSource
----                 ---------------
JZFZ\chengongyi      ActiveDirectory    ← 域用户（我）
JZFZ\Domain Admins   ActiveDirectory    ← 域组——组里套组的实证！
PC3507\Administrator Local              ← 本机用户
PC3507\user          Local
```

一个**本地**组里同时装着域用户、域组、本机用户——`PrincipalSource` 列告诉你每个成员来自本地 SAM 还是域 AD。`Domain Admins` 为什么躺在每台加域机器的本地管理员组里？加域时的默认行为：**「By default, the Domain Admins group is a member of the Administrators group on all computers that join a domain」**——于是域管在任何成员机上都是本地管理员。「对人打包、还能包里套组」在现实里的样子。

---

## 第 4 课：实验——进了组，为什么常常要重新登录才生效

**🧑‍🏫 老师：**

几乎人人会踩的坑：刚把张三加进「财务组」，他转头去读只授给财务组的目录——进不去。为什么？**令牌是登录那一刻铸好的，铸好之后不再变**（第 5 讲）。你改的是「组的成员名册」；张三手里的令牌是今早铸的，里面没有「财务组」的 SID。名册变了，旧令牌不知道。

**🧑‍🎓 学生：** 这个能当场验证吗？

**🧑‍🏫 老师：**

能，拿我自己当张三（本机实测，做完即清理）：

```powershell
PS> New-LocalGroup -Name grp26demo
PS> (Get-LocalGroup grp26demo).SID.Value
S-1-5-21-3515524382-1810956650-2183447911-1014    # 新组领到 RID 1014

PS> Add-LocalGroupMember -Group grp26demo -Member 'JZFZ\chengongyi'
PS> Get-LocalGroupMember -Group grp26demo
JZFZ\chengongyi                                     # 名册里确实有我了

PS> whoami /groups | Select-String grp26demo
（空）                            # 但当前令牌里查无此组！
```

**名册有我、令牌查无此组**——「令牌在登录时定型」的实物证据。要让新组生效，得注销重登，让系统重铸带新组的令牌（或者第 5 讲的 runas 开新登录会话）。

反过来也一样：把人从组里删掉，他已发出去的旧令牌仍带着那个组、在重新登录前还享受那份权限——**所以离职即时回收权限，光删组成员不够，还得强制断开他已建立的会话**。

---

## 插问：域里的组还有什么不一样？

**🧑‍🎓 学生：** 我令牌里那一大把 `JZFZ\...` 域组，和本地组比还有什么讲究？

**🧑‍🏫 老师：**

多两个维度，先认脸、细节留给 Active Directory 部分。

**维度一：组的类型——安全组 vs 通讯组。** 安全组能进 DACL 用来授权；通讯组只用来群发邮件，**不能进 DACL**（"Distribution groups aren't security enabled, so you can't include them in DACLs"）。本讲谈的授权统统是安全组。

**维度二：作用域——全局 / 本地域 / 通用。** 它决定这个组能从哪里收成员、能到哪里被授权：

| 作用域 | 能装谁 | 能在哪被授权 | 定位 |
|---|---|---|---|
| **全局组 Global** | 只有本域的账户/全局组 | 任何域（含信任域） | **装人**——按部门/角色打包 |
| **本地域组 Domain Local** | 任何域的账户/组 | 只在创建它的域内 | **装权限**——代表某个资源的访问权 |
| **通用组 Universal** | 任何域的账户/全局/通用组 | 任何域（森林级） | 跨域汇总，多域森林才用 |

口诀：**全局组装人、本地域组装权限、通用组跨域汇总**。域运维的经典套路 **AGDLP** 就是按这个分工搭的：

```text
张三 ──┐
李四 ──┼─► GG_财务部(全局组·装人) ─► DL_财务共享只读(本地域组·装权限) ─► 财务共享目录[只读]
王五 ──┘
```

为什么要绕这一圈？**职责分离**：人事只管「谁在 GG_财务部」（加人减人），IT 资源管理员只管「DL_财务共享只读有什么权限」（改权限），两边互不干扰。

---

## 几个容易踩的坑

- **`Everyone` ≠ `Authenticated Users` ≠ `Users`**：第一个最宽（老配置含匿名）、第二个要求验过身份、第三个是实打实的内置组（默认成员就是 Authenticated Users、Domain Users、Interactive——本质是把那几个特殊身份又打包了一遍）。
- **删了用户，组里的身影不自动消失**——变成「失效 SID」：名册里那条引用还在，权限表上冒出个解析不出名字的 `S-1-5-21-...`，得单独清。
- **通讯组不能授权**；**改了组成员要重登才生效**（令牌定型是根因——第 4 课刚证）。

---

## 收束

**你现在会了：**

- 组是和用户平级的安全主体、有自己的 SID（内置 `S-1-5-32-*`、自建/域组 `S-1-5-21-*`）；**授一次权给组，成员凭令牌里的组 SID 全带走**。
- 嘴里的「组」分三类：内置组、系统按上下文自动算的**特殊身份**、域控集中定义的域组。
- 本地组里可以装域用户、域组（Administrators 名册实证）；域管组默认躺在每台加域机器的管理员组里。
- **进组/出组都要重登才在令牌上生效**——名册有我、令牌查无此组的实证。
- 域组多两个维度：安全组 vs 通讯组；全局/本地域/通用三种作用域（AGDLP 认脸）。

**下一讲才需要：** 把「某个账户或组 + 允许还是拒绝 + 哪些权限位」落实成对象上一行行的规则——ACE，以及这些规则凑成的整张表 DACL。

---

<!-- chapter-nav:start -->
← 上一章：[第 7 讲：权限位](./08-permission-bits.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 9 讲：ACE 与 DACL](./10-ace-dacl.md)
<!-- chapter-nav:end -->
