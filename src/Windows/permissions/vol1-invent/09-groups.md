---
title: "第 8 讲：组——对人打包"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 8 讲：组"
order: 9
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

# 第 8 讲：组——对人打包

### 麻烦

前几讲攒下的家当——令牌、所有者、权限位——已经够你把**某一个人**的权限拿捏得很细。可现实里等着用权限的，常常不是一个人，而是一群人。

财务部 30 个人，都要能读公司那个共享目录。最直白的法子，是给目录挂上 30 条「允许某某读取」。这法子能跑，只是日子一长就难以为继：新来一个，得挨个目录去添；走掉一个，又得挨个去删，少删一条，便是一个已经离开的人仍握着读权限——这恰恰是安全上最怕的残留。目录再多些，人进人出，光守着这张权限表就够专人全职。

想要的其实只是一件事：把「财务部这 30 个人」拢成一个整体，权限只对这个整体授一次；往后谁进谁出，只动这个整体的成员，再不去碰目录上的权限。这个「整体」，就是 Windows 里的**组**。

### 组：把人拢成一个主体

组这件事，说来也简单——它和用户一样，是一个**安全主体**。换言之，系统认得它、能对它授权，方式和对待张三李四没有任何分别。微软给它的定义只有一句：

> Security groups are a way to collect user accounts, computer accounts, and other groups into manageable units.

把用户、计算机、甚至别的组，收拢成一个个「可管理的单元」。说白了就是：**把人打包，授给这个包，包里的人便都带着包的身份去访问**。开头那个财务的麻烦，到这里就化解了——建一个「财务组」，把 30 个人放进去，目录只对「财务组」授一次读权限；往后入职加人、离职删人，目录上的权限纹丝不动。

定义里「**和其它组**」三个字值得多看一眼：**组里还能装组**。这件事后面会反复用到，先记下。

### 组也有自己的 SID

既然组是主体，它自然也有一个 **SID**。这点和用户毫无二致——第六讲里说过，DACL 里的规则、令牌里的身份，归根到底都是 SID。所以「给组授权」也好，「身为组成员」也好，底层全是 SID 与 SID 的比对。口说无凭，实地看一眼：

```powershell
PS> (New-Object Security.Principal.NTAccount('BUILTIN\Administrators')).Translate(
      [Security.Principal.SecurityIdentifier]).Value
S-1-5-32-544
```

`Administrators` 这个组的 SID 是 `S-1-5-32-544`。更有意思的是你自己建的组——它同样会拿到一个 SID。本机就有个自建的本地组 `CodexSandboxUsers`：

```powershell
PS> (Get-LocalGroup CodexSandboxUsers).SID.Value
S-1-5-21-3515524382-1810956650-2183447911-1005
```

它的样子是 `S-1-5-21-<本机标识>-1005`，和本机用户的 SID 用着**同一个前缀**，只是末尾那个 RID（1005）不同。微软的话：

> Each default security group has a unique identifier that consists of multiple components. Among those components is a relative ID (RID), which is unique within the group's domain.

到这里可以下个结论：**系统根本不在乎一个 SID 背后是人还是组，它只认 SID**。

### 授权是怎么传到成员身上的

那把权限授给组，组里的人为什么就能用了？把前几讲串起来看，逻辑其实很顺。

你先在目录的权限表里写下一句「允许 财务组 读取」，这条规则挂的主体，是「财务组」的 SID。等财务部的张三来读目录时，他手里那张令牌——第五讲里的那张令牌——并不只装着他自己的 SID，还把他所属的所有组的 SID 一并带在身上。系统就拿这串 SID 去和目录的权限表逐条比对，对上「财务组」那一条，便放行。

妙就妙在：你只授了一次权，组里的每个人却都「自带」了这份授权，凭的正是令牌里那串组 SID。微软的表述是：

> Security groups are listed in discretionary access control lists (DACLs) that define permissions on resources and objects. When administrators assign permissions for resources like file shares or printers, they should assign those permissions to a security group instead of to individual users. **The permissions are assigned once to the group instead of multiple times to each individual user.** Each account that's added to a group receives the rights that are assigned to that group.

「授一次给组，而不是授 N 次给每个人」——这正是组化解麻烦的方式。

至于令牌拿着这些 SID 怎么和规则表逐条比对、撞上冲突又怎么判，那是下一讲 ACE 与 DACL 的事，这里先不展开。

### 三种常被混为一谈的「组」

说起组，有个很容易绊人的地方：好些东西都被笼统地叫作「组」，其实它们来路不同，SID 的长相也不同。把 `whoami /groups` 跑一下，当前令牌里携带的身份便一次性全摊开了（本机实测，节选）：

```
组名                            类型   SID            属性
Everyone                        已知组 S-1-1-0       必需的组, 启用于默认, 启用的组
BUILTIN\Administrators          别名   S-1-5-32-544   ..., 组的所有者
BUILTIN\Users                   别名   S-1-5-32-545   ...
NT AUTHORITY\INTERACTIVE        已知组 S-1-5-4        ...
NT AUTHORITY\Authenticated Users 已知组 S-1-5-11      ...
JZFZ\CD-2013388_建筑            组     S-1-5-21-...   ...
```

仔细看，里头其实是三类东西。

第一类是**系统自带的内置组**，SID 一律写成 `S-1-5-32-` 开头。常见的几个：

| 内置组 | RID | 干什么的 |
|---|---|---|
| `Administrators` | 544 | 本机管理员，几乎全能（能改任何本机权限、装软件、改系统） |
| `Users` | 545 | 普通用户，几乎所有账户默认就在里头 |
| `Guests` | 546 | 来宾，权限极低 |
| `Backup Operators` | 551 | 备份操作员，能绕过文件权限做备份/还原（靠特权，不是靠权限位） |
| `Remote Desktop Users` | 555 | 允许远程桌面登录的用户 |

`whoami` 把它们的类型标成「别名」。这台机上 `Get-LocalGroup` 能把本地组列全，一共 20 个：其中 19 个是这样的内置组，另外那个 `CodexSandboxUsers` 是本机自建的。

第二类要特别当心，它最容易让人栽跟头，叫**特殊身份**（special identity）。`Everyone`(S-1-1-0)、`Authenticated Users`(S-1-5-11)、`INTERACTIVE`(S-1-5-4)、`NETWORK`(S-1-5-2)、`ANONYMOUS LOGON`(S-1-5-7)——这些 SID 本机都核验过，能正确翻成对应的名字。但它们并不是你能往里「加人」的组，而是系统看当时的情况、临时把你算进去的身份。微软说得很明白：

> A special identity group is where certain special identities are grouped together. Special identity groups don't have specific memberships that you can modify, but they can represent different users at different times depending on the circumstances.

你没法往 `Everyone` 里加人，也删不掉它。你是谁，它自动定：坐在键盘前登录，你就是 `INTERACTIVE`；从网络连过来，你就是 `NETWORK`；只要身份验过，就是 `Authenticated Users`；而任何人，都算 `Everyone`。`whoami` 把它们标成「已知组」。（这几句定义出自上引文章的「Special identity groups」一节；各特殊身份的逐条说明，可看 [Understand special identities（Microsoft Learn）](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-special-identities)。）

这里头还埋着个老坑：`Everyone` 和 `Authenticated Users` 长得像，却**不等价**。`Everyone` 在较早的配置下可能连匿名访客也算进去，而 `Authenticated Users` 严格要求验过身份。所以给人授权时，别随手就写 `Everyone`。

第三类是**域组**，SID 是 `S-1-5-21-` 开头接上域标识，像本机令牌里的 `JZFZ\CD-2013388_建筑`、`JZFZ\Domain Users`。它们和本机自建组是同一个 `S-1-5-21-` 家族，只是前缀换成了域的标识，由域控集中定义。域组怎么集中管理、怎么嵌套，留到讲 Active Directory 时再细说。

把这三类拢一拢：

| | 形态 | SID 样式 | 谁管成员 |
|---|---|---|---|
| 内置组 | 系统自带 | `S-1-5-32-*` | 本机管理员 |
| 特殊身份 | 上下文相关 | `S-1-5-*`（各种） | 没人管，系统按场景自动算 |
| 域组 | 域控集中定义 | `S-1-5-21-<域>-*` | 域管理员 |

### 实地看一眼：令牌里的组、本机的组、组里的人

光说概念不踏实，跑几条命令看看。

想看自己当前令牌都带着哪些组身份，`whoami /groups`——就是上面那段——列的正是第五讲说的「令牌里的组 SID 列表」。想看这台机有哪些本地组、各自什么 SID，`Get-LocalGroup` 一览无余，凭 SID 前缀就能分清哪些是内置、哪个是自建。想看某个组里到底有谁，用 `Get-LocalGroupMember`，拿本机的 `Administrators` 看看：

```powershell
PS> Get-LocalGroupMember -Group Administrators

Name                 PrincipalSource  ObjectClass
JZFZ\chengongyi      ActiveDirectory  用户
JZFZ\Domain Admins   ActiveDirectory  组
PC3507\Administrator Local            用户
PC3507\user          Local            用户
```

这一组的成员有意思：一个**本地**组里，同时装着域用户（`JZFZ\chengongyi`）、域组（`JZFZ\Domain Admins`——这便是组里套组的实证）、还有本机用户（`PC3507\...`）。`PrincipalSource` 那一列，告诉你每个成员是从本地 SAM 来的、还是从域 AD 来的。

其中 `JZFZ\Domain Admins` 为什么会躺在每台加域机器的本地 `Administrators` 里？这是加域时的默认行为，微软原话：「By default, the Domain Admins group is a member of the Administrators group on all computers that join a domain」——加域时系统自动把域管理员组塞进本机管理员组，于是域管在任何成员机上都是本地管理员。这便是「组对人打包、还能包里套组」在现实里的样子。

### 进了组，为什么常常要重新登录才生效

有个几乎人人会踩的坑，值得单独说说。你刚把张三加进「财务组」，他转头就去读那个只授给财务组的目录，结果却进不去。为什么？

因为令牌是登录那一刻铸好的，铸好之后便不再变（第五讲）。你把张三加进组，改的是「组的成员名册」；可张三手里那张令牌，是他今早登录时铸的，里头并没有「财务组」的 SID。名册变了，旧令牌并不知道。

这事可以实地印证，做完了顺手清理掉：

```powershell
PS> New-LocalGroup -Name tmp_demo_grp_09                      # 新建一个组
PS> (Get-LocalGroup tmp_demo_grp_09).SID.Value
S-1-5-21-3515524382-1810956650-2183447911-1008                # 自建组拿到一个 S-1-5-21-* SID
PS> Add-LocalGroupMember -Group tmp_demo_grp_09 -Member 'JZFZ\chengongyi'   # 把我加进去
PS> Get-LocalGroupMember -Group tmp_demo_grp_09
JZFZ\chengongyi   用户                                         # 名册里确实有我了
PS> whoami /groups | Select-String tmp_demo_grp_09
（空）                                                          # 但当前令牌里没有这个组！
```

名册里已经有我了，当前令牌里却查不到这个组——这就是「令牌在登录时定型」的意思。要让新加的组真正生效，得注销、重新登录，让系统重铸一张带着新组的令牌。

反过来也一样：把人从组里删掉，他手上已经发出去的旧令牌仍带着那个组，在重新登录前还享受着那份权限。所以离职要即时回收权限，光删组成员不够，还得强制断开他已建立的会话。

（演示用完已 `Remove-LocalGroup -Name tmp_demo_grp_09` 清理。顺带一提：`Remove-LocalGroup` 用的是 `-Name`，不像 `Get-LocalGroupMember`、`Add-LocalGroupMember` 用 `-Group`——这套 cmdlet 的参数名不统一，容易踩。）

### 域里的组：先认个脸

本机已经加域（`JZFZ`），所以令牌里除了内置组，还有一大把域组。域组比本地组多两个维度，这里先认个脸，细节留到 Active Directory 那部分再讲。

头一个维度是**组的类型**：分**安全组**和**通讯组**。安全组能进 DACL、用来授权；通讯组只用来群发邮件，不能进 DACL。微软的话：

> - **Security groups**: Used to assign permissions to shared resources.
> - **Distribution groups**: Used to create email distribution lists.
>
> Distribution groups aren't security enabled, so you can't include them in DACLs.

本讲谈的授权，涉及的统统是安全组。

第二个维度是**组的作用域**：全局组（Global）、本地域组（Domain Local）、通用组（Universal）。它决定两件事——这个组能从哪里收成员、能到哪里去被授权。微软原话："Each group has a scope that identifies the extent to which the group is applied in the domain tree or forest."；而 `Builtin` 容器里那些内置组，作用域是「Builtin Local」，改不了。

这三种作用域各司其职，一张表看清（细节后讲）：

| 作用域 | 能装谁（成员来自） | 能在哪被授予权限 | 定位 |
|---|---|---|---|
| **全局组 Global** | **只有本域**的账户 / 全局组 | 任何域（含信任域） | **装人**——按部门/角色打包，跟着人走 |
| **本地域组 Domain Local** | 任何域的账户/组 + 本域本地域组 | **只在创建它的那个域内** | **装权限**——代表某个资源的访问权，贴在资源上 |
| **通用组 Universal** | 任何域的账户/全局组/通用组 | 任何域（森林级） | **跨域汇总**，多域森林才用 |

记一句口诀：**全局组装人、本地域组装权限、通用组跨域汇总**——这恰恰是下面 AGDLP 的分工依据。

域运维里有个经典套路叫 **AGDLP**：账号（Account）先进全局组（Global），全局组再进本地域组（Domain Local），最后把权限授给本地域组（Permission）。先把人按部门打成全局组，再把全局组按资源聚成本地域组，最后才授权——层级清楚，好维护。画成链路就是这样：

```
张三 ──┐
李四 ──┼─► GG_财务部(全局组·装人) ──► DL_财务共享只读(本地域组·装权限) ──► 财务共享目录[只读]
王五 ──┘
```

为什么不直接给全局组授权、非要绕这一圈？为的是**职责分离**：人事只管「谁在 GG_财务部」（加人减人），IT 资源管理员只管「DL_财务共享只读 有什么权限」（改权限），两边互不干扰。这些等讲 Active Directory 时再细说，本讲只要知道「域里的组还能分作用域」就够了。

### 几个容易踩的坑

行文至此，几个常出错的点一并收一下。

`Everyone`、`Authenticated Users`、`Users` 这三个，都「像所有人」，却不是一回事。`Everyone` 最宽（老配置下可能含匿名），`Authenticated Users` 要求验过身份，`Users` 则是个实打实的内置组——微软给 `Users` 列的默认成员就是「Authenticated Users、Domain Users、Interactive」，换句话说，`Users` 本质上把那几个特殊身份又打包了一遍。授权之前，先想清楚到底要哪个。

删了用户，他在组里的身影不会自动消失，会变成一个「失效 SID」：账户删了，SID 不复存在，可组成员名册里那条引用还在，于是权限表上冒出个 `S-1-5-21-...` 解析不出名字的条目。这种孤儿 SID 就是历史遗留，得单独清。

通讯组不能拿来授权——它不是安全组，进不了 DACL，授权写了也不生效。还有前面那个老问题：改了组成员，要重新登录才生效，令牌缓存是根因。

### 收束

走完这一讲，组这件事可以收个尾了。

组是和用户平级的安全主体，有自己的 SID——内置组是 `S-1-5-32-*`，自建组和域组是 `S-1-5-21-*`。把人打包进组、权限授给组，成员便凭着令牌里携带的组 SID，自动拥有这份授权。

日常嘴里的「组」其实有三类，要分清：系统自带的内置组；`Everyone`、`Authenticated Users`、`INTERACTIVE` 那类由系统按上下文自动算、没法手动管的特殊身份；以及域控集中定义的域组。

还有一条务必要记住：进了组、出了组，都得重新登录才在令牌上生效，因为令牌在登录时就定了型。至于域组还分安全组与通讯组、全局/本地域/通用三种作用域，细节后文再展开。

下一讲，要把「某个账户或组，加上允许还是拒绝，加上哪些权限位」落实成对象上一行行的规则——那就是 ACE，以及这些规则凑成的整张表，DACL。

---

<!-- chapter-nav:start -->
← 上一章：[第 7 讲：权限位](./08-permission-bits.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 9 讲：ACE 与 DACL](./10-ace-dacl.md)
<!-- chapter-nav:end -->
