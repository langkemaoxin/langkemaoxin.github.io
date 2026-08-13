---
title: "第 5 讲：Access Token——登录成功后的通行证"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 5 讲：Access Token"
order: 6
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

# 第 5 讲：Access Token——登录成功后的通行证

### 麻烦

不能每打开一个程序就再输一次密码。系统需要一份「本次登录有效的身份摘要」，挂在你的进程上。

### 这一讲只发明：访问令牌（Access Token）

微软的定义直白：

> An access token is a protected object that contains information about the identity and user rights that are associated with a user account.
> （访问令牌是一个**受保护对象**，装着与某个用户账户关联的「身份 + 用户权利」信息。）
>
> 来源：[Understand security principals - Access tokens](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

「**受保护对象**」是关键词——令牌本身是个内核对象，进程没法随便改写它。它就是登录成功后系统发给你进程的「身份证 + 权限清单」。

#### 令牌究竟是怎么来的

按官方流程，一次交互式登录（在登录界面输密码）背后发生的事：

1. **输密码** —— `winlogon` 收集凭据，交给本地安全机构 **LSA（Local Security Authority）**。
2. **认证** —— LSA 调用认证包核对凭据（本地账户走 `MSV1_0`，域账户走 Kerberos，这部分是上一讲的事）。
3. **返回 SID** —— 认证成功，认证包返回**用户 SID** 和**用户所属组的 SID 列表**（外加一个标识「本次登录会话」的 logon SID）。
4. **LSA 打包成 primary token** —— LSA 拿这些 SID，再去**本机安全策略（local security policy）**里查出授予该用户/组的**用户权利（user rights / privileges）**，把它们一起打包，造出**主访问令牌（primary access token）**。

官方把第 3、4 步说得最准：

> If authentication is successful, the process returns a SID for the user and a list of SIDs for the user's security groups. The Local Security Authority (LSA) on the computer uses this information to create an access token (in this case, the primary access token). This includes the SIDs that are returned by the sign-in process and a list of user rights that are assigned by the local security policy to the user and to the user's security groups.
>
> 来源同上

这里有两个容易被忽略、却决定令牌长相的细节：

- **SID 来自认证，但 privileges 来自本机策略。** 也就是说，域账户登录后能不能关机、能不能备份文件，不是域里的总管服务器（叫**域控制器 DC**，后面专门讲）说了算，是**你这台机器**的安全策略授予的。同一个域账户换台机器登，特权可能就不一样。
- **每次登录都新造一个。** "Each time a user signs in, the system creates an access token for that user."（每次登录，系统都为你新建一个令牌。）所以同一个账户早上、下午各登一次，拿到的是两个不同的令牌——你中午被管理员加进某个组，得**重新登录**，新令牌才会带上那个组 SID。

#### primary token 里装了什么

主令牌里至少有这几样（本讲先认脸，后面几讲再展开）：

- 用户 **SID**（你是谁）
- **组 SID 列表**（你属于哪些组——组的机制要后面单独讲，这里先接受「令牌里能装一组 SID」）
- **privileges / 用户权利**（你被允许做哪些系统级动作，如关机、备份；`whoami /all` 的第三段「权限信息」就是它）
- **Owner**（默认所有者 SID）、**Primary Group**、**默认 DACL**（这些等 Owner 那讲细说）
- **Logon SID**（标识「本次登录会话」，注销即作废）

域用户登录时，相关的 SID（用户 SID、组 SID）会进入令牌；之后访问资源时，**令牌里的 SID 都可能参与允许或拒绝**。  
来源：[Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

#### 一张图：令牌造好之后，是怎么被拿去比对资源的

官方有一张「授权与访问控制流程」图，正好把令牌的**用武之地**画清楚了：

![Windows 授权与访问控制流程](/img/posts/windows-permission/authorization-and-access-control-process.png)
来源：[Understand security principals - Authorization and access control process](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

从左到右读这张图，三件事：

1. **左边是「主体（Subject）」——一个进程。** 它身上挂着的就是我们这讲的主角：**access token**。进程想访问一个对象（图里举的是共享文件夹），不是凭进程名，而是凭它**挂着的令牌**。
2. **右边是「对象（Object）」——一个受保护资源。** 它身上挂着的是**安全描述符（Security Descriptor）**，里面有一张 **DACL（自主访问控制列表）**，登记着「哪些 SID 被允许 / 被拒绝」。
3. **中间是「比对（Access Check）」——SRM 把两边对一对。** 系统取出进程令牌里的 SID 列表，逐条去比对对象 DACL 里的 **ACE（访问控制项）**：

   - 令牌里某个 SID，在 DACL 里命中一条**允许**项 → 放行对应操作；
   - 命中一条**拒绝**项 → 拒绝（拒绝优先于允许）；
   - 谁都没命中 → 默认拒绝（no access）。

一句话总结这张图：**左边发令牌，右边挂名单，中间对 SID**。令牌里装的是「我是谁、我在哪些组」，DACL 里装的是「谁被允许、谁被拒绝」，比对的就是 **SID**。

> ⚠️ 注意：图里这套比对发生在**每次访问**受保护对象时——文件、注册表、共享、Active Directory 对象都是这套机制。令牌里的 SID 是「钥匙串」，DACL 里的 ACE 是「锁芯清单」。后面几讲讲 Owner、DACL、ACE，就是在展开这张图的右半边。

#### 为什么叫「primary（主）」——它是相对 impersonation 说的

Windows 有两种令牌，所以 primary 这个定语才有意义：

> There are two kinds of access tokens: primary and impersonation. Every process has a primary token that describes the security context of the user account that's associated with the process... Impersonation tokens... enable a thread to run in a security context that differs from the security context of the process that owns the thread.
>
> 来源同上

- **primary token（主令牌）**：**每个进程都有一个**，代表「这个进程是谁启动的、默认安全上下文是什么」。进程要跑起来，必须先有主令牌。本讲讲的就是它。
- **impersonation token（模拟令牌）**：服务端场景才用，让某个**线程**临时「扮演」成客户端身份干活，跟它所在进程的主令牌不一样。别急，下面「实战」一节就给你看它的真身。

#### 最后一步：拷贝，挂到每个进程上

令牌造好后怎么生效：

> After the LSA creates the primary access token, a copy of the access token is attached to every thread and process that runs on the user's behalf.
> （LSA 造好主令牌后，它的**一份拷贝**会被挂到「代你执行」的每一个进程和线程上。）

关键词是「**拷贝**」——不是所有进程共享同一个令牌对象，而是每个进程各拿一份副本。所以你单独给某个进程提权（UAC「以管理员身份运行」）或降权，不影响别的进程的令牌。

#### 进阶：不重新登录，怎么拿到「最新」令牌

前面说过，令牌是登录时一次性铸好的，**铸好之后内容就焊死了**。问题来了：你正登着，管理员把你加进某个组——你已有进程访问资源时，认的还是**旧令牌**。能不能不注销、不重新登录就拿到带新组的令牌？

先说死理：**已经在跑的进程，它的令牌无法原地刷新，只能换个新进程。** Win32 里**没有**「给现有令牌追加一个组 SID」的 API——`AdjustTokenGroups` 只能在已有组里启用/禁用，`AdjustTokenPrivileges` 只能开关已有特权，`CreateRestrictedToken` 只能做删减。令牌的 SID 列表是铸造时就焊死的。  
来源：[Access Tokens - Win32 apps](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens)

所以要拿「最新」令牌，唯一的路是**再走一次登录、开一个新登录会话**，让 LSA 当场铸新令牌——但不用注销当前桌面。三种做法：

**① `runas` 用自己身份开个新进程**（最常用）

```bat
runas /user:jzfz\chengongyi cmd
```

`runas` 会拿你的凭据**重新认证一次**、开一个**新的登录会话**，于是 LSA 当场铸一个全新的 primary token 挂到这个 `cmd` 上——新组、新特权都在里面。在里面再敲 `whoami /groups`，就能看到刚加进去的组。

注意点：

- 要**再输一次密码**——它是一次全新认证，不是拿旧令牌（事先用过 `/savecred` 才能免输）；
- 新进程是独立登录会话，默认会加载你的用户配置文件（`/profile`），环境可能和当前窗口略有不同；
- 依赖 **Secondary Logon** 服务（Windows 默认开启），服务没起会报错。

来源：[runas](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc771525(v=ws.11))

**② PowerShell 等价写法**

```powershell
Start-Process cmd -Credential jzfz\chengongyi   # 会弹窗让你输密码
```

**③ 编程：`LogonUser` 造新令牌**（`runas`/`Start-Process -Credential` 的底层都是它）

```csharp
// 用凭据重新登录，拿到一个「刚铸造、带最新组与特权」的 primary token 句柄
Win32.LogonUser("chengongyi", "jzfz", password,
    LogonType.Interactive, LogonProvider.Default, out IntPtr hToken);
// 之后可用 CreateProcessAsUser 起进程，或 DuplicateTokenEx 后 Impersonate
```

`LogonUser` 返回的句柄就是一个全新的 primary token。前两条命令内部走的就是这条路。

**⚠️ 一个常见误区：`klist purge` 不能刷新令牌。**

很多人以为「清掉 Kerberos 票据就能刷新身份」——这是错的。先解释两个词：**Kerberos** 是域账户登录用的认证协议；**票据（ticket）** 是它发给你的一张"电子凭证"，最关键的一张叫 **TGT**（你可以先把它当成"登录时拿到的一张长期通行证"，后面第 2 关会详细讲）。`klist purge` 清的就是这堆票据，影响的是**访问网络服务时重新去拿票据**，但**完全碰不到本地 access token**。你已有进程的组 SID 和特权在令牌铸造时就定了，清票据改不了它们。

`klist purge` 能解决的，是「票据过期/拿错了导致连不上某个服务」这类**网络认证**问题；而「刚加的组没生效」属于**本地令牌**问题，只能靠上面三条——开一个新登录会话。  
来源：[klist](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist)

#### 顺带辟谣：重启网卡能刷新令牌吗？

有同事在程序里写了一段「禁用默认网卡，等 3 秒，再启用」的代码，注释写着「重启网络刷新域控缓存，解决加权限后要重启 Windows 才生效」。听起来有道理——网络都断了重连，身份信息该跟着更新了吧？

先给一句话结论，再拆机制：

> **重启网卡不直接刷新 access token、也不清 Kerberos 票据。** 但它**确实可能让权限生效**——不是因为它刷了令牌，而是它**间接促成了一次重新认证**。这是两件事，别混。

要把这件事讲透，得先认识「**管理员加完权限，为什么得过一段时间才生效**」背后的四道关。每一道都有自己的延迟，叠加起来就是那段「等待时间」。

##### 先认识两个词：DC 和 AD

四道关处处提到 **DC**，先把这个词讲明白：

- **AD（Active Directory，活动目录）**——整个域的**中央数据库**，装着所有用户、计算机、组、权限等对象。它是「**数据**」。
- **DC（Domain Controller，域控制器）**——运行 AD 的那台**服务器**。它是「**跑这个数据库的机器**」。一句话：**AD 是数据，DC 是装数据的服务器。**

DC 在域里干三件事：① **验证密码**（你登录时，密码交给 DC 核对）；② **签发 Kerberos 票据**（DC 在 Kerberos 协议里扮演的角色叫 **KDC**——Key Distribution Center，密钥分发中心，负责签票据）；③ **存账户/组数据**（管理员加组，就是往 DC 的数据库里写一条）。一个域通常有**多台 DC**（容错 + 就近），每台都存一份完整副本——这正是后面"第 1 关 AD 复制延迟"的由来。

> 别和第 4 讲的 **LSA/LSASS** 混：那是**每台机器本机**的"门卫"，而 DC 是**整个域**的"档案室"。你本机 LSA 拿着你的密码去找 DC 验，DC 说"对"，LSA 才放行、并在本机铸 access token。

##### 实操：怎么看自己电脑连的是哪台 DC？

讲了半天 DC，到底我这台机器现在连的是哪台？三个命令，从快到全：

**方法一：环境变量（最快，一行）**

```powershell
$env:LOGONSERVER
# 或 cmd 里：  echo %LOGONSERVER%
```

```
\\JZFZDC10
```

`LOGONSERVER` 记的是你**本次登录**实际验证密码的那台 DC。要看域名，顺手打 `$env:USERDOMAIN`（短域名 `JZFZ`，老式的 **NetBIOS 名**）和 `$env:USERDNSDOMAIN`（完整域名 `JZFZ.LOCAL`，新式的 **DNS 名**）——这俩是同一个域的两种写法，就像"JZFZ"是简称、"JZFZ.LOCAL"是全称。

**方法二：`nltest /dsgetdc:域名`（最全，含 IP 和站点）**

```powershell
nltest /dsgetdc:jzfz
```

```
           DC: \\JZFZDC10
      Address: \\192.168.0.50
     Dom Name: JZFZ
  Forest Name: jzfz.local
 Dc Site Name: chengdu
Our Site Name: chengdu
        Flags: GC DS LDAP KDC TIMESERV WRITABLE ...
```

逐行读：`DC` 是机器名、`Address` 是它的 IP、`Dc Site Name` / `Our Site Name` 是 DC 和你各自所在的 AD 站点（这俩一致说明你连到了**本站点最近**的 DC），`Flags` 里 `WRITABLE` 表示这台 DC 可写、`KDC` 表示它能签 Kerberos 票据。`nltest` 需要 RSAT 或域成员机器自带，没有就退回方法一。

**方法三：`nltest /sc_query:域名`（查「安全通道」连的 DC）**

```powershell
nltest /sc_query:jzfz
```

```
Flags: 30 HAS_IP  HAS_TIMESERV
Trusted DC Name \\jzfzdc5.jzfz.local
Trusted DC Connection Status Status = 0 0x0 NERR_Success
```

> **注意这里有个反直觉的现象**：方法一/二说你登录连的是 **JZFZDC10**，方法三却说安全通道连的是 **jzfzdc5**——**不是同一台！**
>
> 这正好印证了前面讲的：**登录认证走一台 DC，机器账户的安全通道（计算机跟域建立信任的那条通道）可能走另一台 DC。** 它们各自有缓存、各自被第 3 关的 DC 定位机制管理，所以并不保证一致。排查「权限没生效」时，要分清你问的是「**用户**登录连的 DC」还是「**机器**安全通道连的 DC」——这俩都可能各自卡住。

> 小贴士：想强制本机**重新发现** DC（对应第 3 关的 Force Rediscovery），用 `nltest /dsgetdc:jzfz /force`——这正是 `重启网卡` 想间接做到、却不如这条命令干净的事。

##### 四道关：从「管理员加权限」到「你能用上」

**第 1 关：AD 复制延迟——你连的 DC 可能还没有这条变更**

管理员通常是在**某一台 DC** 上把用户加进组的，但你登录/认证时连的可能是**另一台 DC**。组信息要在这两台之间**复制**才同步：

| 场景 | 默认延迟 |
| --- | --- |
| 同一站点内多台 DC（站内复制） | **15 秒**（变更通知触发） |
| **跨站点**（不同机房/城市，站间复制） | **180 分钟（3 小时）**，可调，最低 15 分钟 |
| 跨站点但开了变更通知 | 近乎实时 |

> 典型场景：管理员在 A 机房的 DC 上加了权限，你在 B 机房。默认情况下，要等**最多 3 小时**，B 机房那台 DC 才复制到这条变更。**在那之前，你无论怎么登录、怎么 `klist purge`，新组都不会出现**——因为源头（你连的那台 DC）压根还没这个数据。这不是 token 的问题，是 AD 还没把数据搬过来。

来源：[Force AD Replication: A Complete Manual (Cayosoft)](https://www.cayosoft.com/blog/force-ad-replication/)

**第 2 关：Kerberos TGT 里的 PAC——就算复制到了，也得重新签发 TGT**

这一关术语最密，先用一个比喻把三个词讲明白，再回到正题。

##### 先把三个术语搞懂：TGT / PAC / AS-REQ

把域认证想象成进一个**游乐场**：

- **TGT（Ticket-Granting Ticket，票据授予票据）**——相当于游乐场入口发的「**通票手环**」。你凭它**不能直接玩项目**，但能凭它在每个项目门口**换一张该项目的一次性票**（叫**服务票据 service ticket**）。TGT 是「换票的票」，由域控（KDC）在你登录时发给你，长期有效（默认约 10 小时）。
- **PAC（Privilege Attribute Certificate，特权属性证书）**——相当于**缝在手环里的一张身份标签**，上面印着「**你是谁（用户 SID）、你在哪些组（组 SID）、你有什么特权**」。每个项目（服务）验票时，不用回头问入口「这人到底在不在某组」，直接看手环上的标签就行。**PAC 就是票据里随身携带的「组 SID 快照」。**
- **AS-REQ（Authentication Service Request，认证服务请求）**——就是你**第一次伸手向入口要手环**这个动作。DC 收到 AS-REQ、核对完你的密码，才会**签发一张新的 TGT**，并在签发这一刻**把当时的组 SID 现场印进 PAC**。

一句话串起来：

> 你登录（**AS-REQ**）→ DC 发你一条手环（**TGT**），上面缝着此刻的身份标签（**PAC**，含组 SID）→ 之后访问任何服务，都凭这条手环去换票，服务看手环上的标签判权限。

##### 回到正题：为什么「续期」不等于「刷新组」

组 SID 装在 TGT 的 **PAC** 里，而 PAC 是**签发 TGT 那一刻的快照**——印上去之后就**不动了**。问题来了：手环（TGT）快过期时，系统会**自动续期**，但这只是把同一个手环的寿命延长，**不会重新印标签**。所以：

| 动作 | 比喻 | PAC（标签）刷新？ | 新组出现？ |
| --- | --- | --- | --- |
| TGT **续期**（renew，自动，默认 ~10 小时一次） | 旧手环盖个章续用 | ❌ 不刷新 | ❌ 不出现 |
| TGT **重新签发**（重新登录 / `klist purge` 后重认证） | 重新去入口换一条新手环 | ✅ 重新印 | ✅ 出现 |

> **最大的陷阱：TGT 自动续期 ≠ PAC 刷新。** 续期只是给旧手环盖章延期，上面缝的旧标签（PAC，含组 SID）原封不动。所以就算第 1 关已过、DC 里已有新组了，只要你还在用那条**旧手环**，新组照样进不来——必须**重新去入口办一条新手环**，也就是触发一次**全新的 AS-REQ**（注销重登 / `klist purge` 后重认证）。这也是本讲反复强调「**加组后要重新登录**」的根因：**只有重新签发 TGT，才会把新组重新印进 PAC。**

来源：[Refresh membership in AD groups without logoff or reboot (Samuraj.cz)](https://www.samuraj-cz.com/en/article/refresh-membership-in-ad-groups-without-logoff-or-reboot/)、[Strange behavior with NTFS, AD groups (Microsoft Learn Q&A)](https://learn.microsoft.com/en-us/answers/questions/357763/strange-unexpected-behavior-with-ntfs-ad-groups-an)

**第 3 关：DC 定位缓存——你可能一直连着同一台「没同步」的 DC**

你的机器会**缓存**它上次成功使用的 DC，不会每次认证都重新找。默认 **12 小时**（`ForceRediscoveryInterval`）才强制重新发现一台 DC。如果你缓存的那台恰好**还没复制到新组**，你会一直连它，拿到的 TGT 自然也不带新组——这时第 1 关的数据早就到了别的 DC，只是你没去连。

> 当缓存的 DC **不可达**（比如你把网卡禁用了），客户端不会干等 12 小时，而是**立即触发强制重发现（Force Rediscovery）**，去找另一台 DC。**这就是「重启网卡」能间接起作用的关键开关。**

来源：[Locating Domain Controllers in Windows (Microsoft Learn)](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/dc-locator)、[DC Locator Service – Force Rediscovery (ServerFault)](https://serverfault.com/questions/754468/dc-locator-service-server-2008r2-2012-what-triggers-switching-to-alternative)

**第 4 关：负缓存——上次找 DC 失败，会记仇一小会儿**

Windows 里有个叫 **Netlogon** 的系统服务（专门管"机器怎么找到 DC、怎么跟域通信"）。它除了前面说的 DC 定位缓存，还有一个**负缓存（Negative Cache）**机制：如果某次找 DC 失败了（DC 暂时不可达），客户端不会立刻重试，而是把这次失败**记一小段时间**（默认 45 秒，参数 `NegativeCachePeriod`），避免像没头苍蝇一样反复去查 **DNS**（域名系统，机器靠它把名字翻译成地址）——那会浪费资源。所以「断网后立刻重连」可能撞上负缓存窗口，要等它过期才会真正重新去找 DC——这也是那段代码里 `Start-Sleep -Seconds 3` 有时不够、得再等一会儿的原因。

##### 四道关汇总：为什么「过段时间才生效」

```
管理员在 DC_A 加组
        │
        ▼ ①AD复制（站内15s / 跨站默认180min）
   DC_B 也有了新组？  ──否──► 你连的就是DC_B，神仙也救不了，等复制
        │是
        ▼ ②TGT/PAC（续期不刷PAC，需重新签发）
   你的TGT带新组了？  ──否──► purge + 重新认证 / 注销重登
        │是
        ▼ ③DC定位缓存（默认粘同一台DC 12h）
   你连的DC有新组？   ──否──► 换一台DC：Force Rediscovery（断网可触发）
        │是
        ▼ ④负缓存（上次失败记仇45s）
   能正常连上DC？     ──否──► 等NegativeCachePeriod过期再试
        │是
        ▼
   新组进入PAC → 重新登录进token → 权限生效
```

任何一关卡住，表现都是「加完权限访问不了」。**重启网卡能解决的，主要是第 3 关**（触发换 DC）；对第 1、2 关它无能为力。

##### 回到开头：重启网卡到底刷了什么

把四道关摆开，就能把那段代码的作用讲准了：

- **它不直接刷 access token**（token 在进程内存，与网卡无关）——这点没错，前面已用文档原话 + 机制推断论证过；
- **它也不清 Kerberos 票据缓存**（票据在 LSASS，与网卡无关）——也没错；
- **但它会切断到当前 DC 的连接**，触发第 3 关的 **Force Rediscovery**，可能换到一台**已复制到新组**的 DC。在新的 DC 上重新拿的 TGT 带上了新组，进新进程时 token 也就带上了新组——**权限于是生效**。

所以那段注释「重启网络刷新域控缓存」**不算全错**：它确实「刷」了——刷的是「**DC 定位缓存**」（让你换一台 DC），不是「access token」。真实因果链是：

> **断网 → DC 重发现 → 换到已同步的 DC → 新认证拿带新组的 TGT → 进新进程时 token 带新组。**

它起作用不是靠「刷令牌」，而是靠**换了个数据源（DC）**，间接促成了一次新认证。但它**不可靠**：取决于你有没有「另一台已同步的 DC」可换——单 DC 环境下，重启网卡就是纯粹没用。

##### 「三种都叫缓存、却完全不同」对照表（补完）

| 层次 | 装的是什么 | 存在哪 | 默认寿命 / 刷新方式 | 重启网卡能刷吗 |
| --- | --- | --- | --- | --- |
| **access token**（本讲主角） | 用户 SID + 组 SID + 特权 | 进程内存 | 登录时铸好，会话内焊死；重新登录 / `runas` / `LogonUser` 换新 | ❌ 无关 |
| **Kerberos 票据缓存** | TGT（含 PAC 里的组 SID）、服务票据 | LSASS 内存 | TGT ~10h；`klist purge` + 重新认证 | ❌ 无关 |
| **DC 定位缓存** | 上次用的 DC、站点名 | Netlogon | **粘 12 小时**（`ForceRediscoveryInterval`）；DC 不可达立即重发现 | ✅ **触发重发现** |
| **DC 负缓存** | 「这个 DC 刚才连不上」的记录 | Netlogon | **默认 45 秒**（`NegativeCachePeriod`），过期前不重试 | ⚠️ 短暂受阻 |
| **AD 数据本身** | 组成员、属性 | 各 DC 的数据库 | 站内 15 秒 / 跨站默认 180 分钟 | ❌ 无关（要等复制） |

##### 两种「加权限没生效」，对号入座

**情况 A：DC 里还没这个组（第 1 关未过）。** 你无论重启网卡、`klist purge` 还是注销重登都没用——源头没数据。**只能等 AD 复制**，或让管理员在所有 DC 上 `repadmin /syncall` 强制同步。重启网卡在此场景纯属无用功。

**情况 B：DC 里已有新组，但你的 TGT/DC 缓存是旧的（第 2、3 关）。** 这才是「重启网卡偶尔管用」的舞台：断网触发 Force Rediscovery → 换台已同步的 DC → 重新认证拿带新组的 TGT。**但更干净的做法是 `klist purge` + 注销重登**——它直接命中第 2 关，不碰运气。

> **修订后的结论：**
> - 想刷新**身份**（token / 票据）→ 靠**重新认证**（`klist purge` + 重登 / `runas` / `LogonUser`）；
> - 想刷新**连接**（DC 定位 / SMB 会话）→ 靠**断网重连**（重启网卡可触发，但非正道）；
> - 想刷新**数据**（AD 里到底有没有这个组）→ 只能**等复制**，或管理员强制 `repadmin /syncall`。
>
> 三者井水不犯河水。**重启网卡治的是「连接」，对「身份」和「数据」无能为力。**

##### 补一刀：`repadmin /syncall` 之后，为什么权限可能还不生效？

很多人按结论去执行 `repadmin /syncall`（强制所有 DC 立刻同步），满心以为"数据都同步了，该生效了吧"——结果还是访问不了。原因：**`repadmin /syncall` 只解决第 1 关（DC 间的数据库同步），管不到你本机的 TGT 和 token。**

先看它到底干了什么。常用写法 `repadmin /syncall /AedP`（管理员在某台 DC 上执行）：

- `/A` 同步全部分区、`/e` 跨站点、`/d` 用 DN 标识服务器、`/P` 推出变更；
- 这台 DC 通知所有**复制伙伴**"有变更，现在就同步"，变更层层传到所有站点的所有 DC；
- 几秒到几十秒后，**所有 DC 的数据库都有了那条新组记录**——第 1 关搞定。

但**第 2 关、token 关都还没动**：你的旧 TGT 还在（PAC 里没新组），你的旧 token 还在（没新组）。所以 `syncall` 之后**仍然必须**做第 2 关（`klist purge` + 重新登录）+ token 刷新，权限才真正生效。

**完整操作链（管理员侧 + 用户侧，一步都不能少）：**

```
管理员：在某台 DC 加组  →  repadmin /syncall /AedP   ← 解决第1关：所有DC都有数据
                                  ↓
用户：    klist purge  →  注销重登（或 runas 开新进程）  ← 解决第2关+token：拿带新组的TGT和新token
                                  ↓
                            权限生效 ✅
```

> **常见坑**：只做了 `repadmin /syncall`、没做 `klist purge` + 重登 → "明明同步了还是不行"。因为数据进了 DC，但没进你的 TGT/PAC 和 token。

##### 再厘清一个易混点：「SID」到底归在哪一关？

读者常问：**"用户所属的 SID"难道不是数据吗，为什么单独说"组数据"要等复制？** 区分两个东西：

- **你自己的用户 SID**（像 `S-1-5-21-…-279405`）——这是你的**身份证号**，登录后就在 token 里，**基本不变**。"加权限"改动的不是它。
- **组数据**（"你被加进了 `某组`"）——这才是"加权限"真正改的东西。它体现在三层：
  - **AD 数据库**里：你账户的 `memberOf` 多一条 → 归**第 1 关**，靠复制/syncall；
  - **TGT 的 PAC** 里：多一个组 SID → 归**第 2 关**，靠重新签发 TGT；
  - **进程 token** 里：多一个组 SID → 靠重新登录/runas。

> 同一个**组 SID**，会出现在 AD 数据库、PAC、token 这**三个地方**，每一处都要各自刷新到位，权限才生效。本文说"刷新数据"时，专指 AD 数据库里的那条 `memberOf` 记录——不要和"用户 SID"混为一谈。

来源：[Force AD Replication (Cayosoft)](https://www.cayosoft.com/blog/force-ad-replication/)、[DC Locator (Microsoft Learn)](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/dc-locator)、[Refresh AD group membership without logoff (Samuraj.cz)](https://www.samuraj-cz.com/en/article/refresh-membership-in-ad-groups-without-logoff-or-reboot/)、[Strange behavior with NTFS, AD groups (Microsoft Learn Q&A)](https://learn.microsoft.com/en-us/answers/questions/357763/strange-unexpected-behavior-with-ntfs-ad-groups-an)、[DC Locator – Force Rediscovery (ServerFault)](https://serverfault.com/questions/754468/dc-locator-service-server-2008r2-2012-what-triggers-switching-to-alternative)、[Domain Controller Stickiness Prevention (dirteam.com)](https://dirteam.com/sander/2008/06/24/domain-controller-stickiness-prevention/)、[Why is log off/on required after adding a group (ServerFault)](https://serverfault.com/questions/558157/why-sometimes-is-required-to-log-off-and-log-on-back-again-adding-a-group-to-a-u)、[KLIST (SS64)](https://ss64.com/nt/klist.html)

##### 实操：用 `klist` 看你那条「手环」（TGT）

讲了第 2 关的 TGT/PAC/续期，到底在你机器上长什么样？一条命令：

```powershell
klist
```

```
Current LogonId is 0:0x65086
Cached Tickets: (6)

#0>	Client: chengongyi @ JZFZ.LOCAL
	Server: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL      ← 这条就是 TGT（手环）
	Ticket Flags 0x40e10000 -> forwardable renewable initial pre_authent ...
	Start Time: 8/13/2026 16:07:20 (local)       ← 手环签发时间
	End Time:   8/14/2026 2:07:20 (local)        ← 手环寿命约 10 小时
	Renew Time: 8/20/2026 16:07:20 (local)       ← 续期窗口（续期≠刷新PAC）
	Cache Flags: 0x1 -> PRIMARY
	Kdc Called: JZFZDC10.jzfz.local              ← 签发这条手环的 DC！

#1>	Client: chengongyi @ JZFZ.LOCAL
	Server: ldap/jzfzdc9.jzfz.local/...          ← 这条是服务票据（项目票）
	...
```

逐行对应第 2 关的理论，你会发现**全是活教材**：

- **`Server: krbtgt/...`** 就是 TGT——`krbtgt` 是个特殊名字（字面是"Kerberos ticket-granting"，即"发 Kerberos 票据的那个"），凡是发给它的票都是"换票用的主票"（TGT）。`#0` 是你的 TGT，`#1` 之后是拿 TGT 换来的**服务票据**（手环→项目票）。
- **`Start/End Time`** 印证"手环有寿命"：约 10 小时。过期前系统会自动续期——但注意，续期只更新这个时间，**不动 PAC**（这正是第 2 关那个坑）。
- **`Kdc Called: JZFZDC10`** 印证"手环由某台 DC 签发"——和前面 `LOGONSERVER=\\JZFZDC10` 完全对上。**这条 TGT 的 PAC 里装的组 SID，是 JZFZDC10 当时数据库里的快照**。如果新组还没复制到 JZFZDC10，这条手环里就没有它。

**关键验证：怎么知道你的 TGT 里到底有没有新组？**

```powershell
klist purge      # 清掉当前所有票据（含 TGT）
# 然后：注销重登 / 访问一个需要该组权限的资源 → 触发重新认证，DC 重新签发带新组的 TGT
klist            # 再看，新 TGT 的 Kdc Called 就是这次连的 DC
```

> 把 `klist purge` 和 `repadmin /syncall` 连起来看就完整了：
> - 管理员 `repadmin /syncall` → 让**所有 DC 都有新组**（第 1 关）；
> - 你 `klist purge` + 重登 → 让 **DC 重新签发带新组的 TGT**（第 2 关），新组这才进 PAC、进 token。
>
> 缺任何一步，权限都不生效。这俩命令是「加权限后立即生效」的标准组合拳。

来源：[klist (Microsoft Learn)](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist)、[KLIST (SS64)](https://ss64.com/nt/klist.html)

口诀：

> **登录 ≈ 认证 + 发令牌。**  
> 认证给 SID，本机策略给 privileges，LSA 打包成 primary token，拷一份挂到你的每个进程上。

### 怎么看见

```bat
whoami /all


PS C:\Users\chengongyi> whoami /all

用户信息
----------------

用户名          SID
=============== ================================================
jzfz\chengongyi S-1-5-21-3977539503-3587586693-2971573549-279405


组信息
-----------------

组名                                          类型   SID                                              属性
============================================= ====== ================================================ ==========================================
Everyone                                      已知组 S-1-1-0                                          必需的组, 启用于默认, 启用的组
BUILTIN\Administrators                        别名   S-1-5-32-544                                     必需的组, 启用于默认, 启用的组, 组的所有者
BUILTIN\Users                                 别名   S-1-5-32-545                                     必需的组, 启用于默认, 启用的组
NT AUTHORITY\INTERACTIVE                      已知组 S-1-5-4                                          必需的组, 启用于默认, 启用的组
CONSOLE LOGON                                 已知组 S-1-2-1                                          必需的组, 启用于默认, 启用的组
NT AUTHORITY\Authenticated Users              已知组 S-1-5-11                                         必需的组, 启用于默认, 启用的组
NT AUTHORITY\This Organization                已知组 S-1-5-15                                         必需的组, 启用于默认, 启用的组
LOCAL                                         已知组 S-1-2-0                                          必需的组, 启用于默认, 启用的组
JZFZ\CD-2013388_建筑                          组     S-1-5-21-3977539503-3587586693-2971573549-24272  必需的组, 启用于默认, 启用的组
JZFZ\节点入库-正式                            组     S-1-5-21-3977539503-3587586693-2971573549-472641 必需的组, 启用于默认, 启用的组
JZFZ\20260410-S001_设总                       组     S-1-5-21-3977539503-3587586693-2971573549-553488 必需的组, 启用于默认, 启用的组

JZFZ\CD-20260402-0001-S002_建筑               组     S-1-5-21-3977539503-3587586693-2971573549-551409 必需的组, 启用于默认, 启用的组
身份验证机构声明的标识                        已知组 S-1-18-1                                         必需的组, 启用于默认, 启用的组
Mandatory Label\High Mandatory Level          标签   S-1-16-12288


特权信息
----------------------

特权名                                    描述                               状态
========================================= ================================== ======
SeLockMemoryPrivilege                     锁定内存页                         已禁用
SeIncreaseQuotaPrivilege                  为进程调整内存配额                 已禁用
SeSecurityPrivilege                       管理审核和安全日志                 已禁用
```

> 上方输出省略了后面的「**权限信息（PRIVILEGES INFO）**」段——那一行列出的 `SeShutdownPrivilege`、`SeChangeNotifyPrivilege` 等，就是令牌里的 **privileges**，对应本讲讲的「来自本机策略」的那部分。

```csharp
var id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.Name);               // 域\用户名
Console.WriteLine(id.User);               // 用户 SID
Console.WriteLine(id.ImpersonationLevel); // 普通进程是 None：用的是进程的主令牌，没在模拟别人
Console.WriteLine(id.Token);              // 令牌句柄 hToken——primary token 的底层句柄
foreach (IdentityReference g in id.Groups!)
{
    Console.WriteLine(g);                 // 组 SID；有的能 Translate 成名字
}
```

来源：[whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami)、[WindowsIdentity 类](https://learn.microsoft.com/en-us/dotnet/api/system.security.principal.windowsidentity)

### 实战：用 C# 传账号密码，访问原本进不去的路径

回到那张授权流程图——**你能不能访问一个资源，全看你进程令牌里的 SID 命不命中资源的 DACL**。那如果当前进程的令牌命不中（比如那个共享文件夹只授权给了 `JZFZ\somegroup`，而你的令牌里没这个组），怎么办？

答案是：**临时换一个令牌**。拿另一组「能命中 DACL」的账号密码，登录出一个新令牌，让当前线程在接下来这段代码里**冒用**它干活——这就用上了前面铺垫的 **impersonation token**。

整套流程是图里那套机制的「换钥匙串」版：

1. `LogonUser(账号, 密码, ...)` —— 拿别人的凭据去登录，得到一个**新的 token 句柄**；
2. `WindowsIdentity.RunImpersonated(句柄, () => { ... })` —— 把它当成 **impersonation token** 挂到当前线程，回调里的代码就**以那个身份**执行；
3. 回调里访问网络/文件时，系统拿来做 access check 的，就是**新令牌里的 SID**，自然能命中那个原本进不去的 DACL。

#### 关键岔路：用哪种 `LogonUser` 登录类型

`LogonUser` 的 `logonType` 决定铸出什么样的令牌，这里只有两个值要记：

| logonType | 数值 | 铸出的令牌 | 适合做什么 |
| --- | --- | --- | --- |
| `LOGON32_LOGON_INTERACTIVE` | 2 | 完整的 **primary token**，本机身份也换成他 | 访问**本机**资源、跑需要本机权限的命令 |
| `LOGON32_LOGON_NEW_CREDENTIALS` | 9 | 本机身份**不变**，只换**出站网络凭据** | 专门访问 **UNC/网络共享/远程服务** |

> 上面说的 **UNC 路径**就是形如 `\\服务器名\共享名`（例如 `\\fileserver\project-share`）的地址——你在资源管理器地址栏敲的那种"网上邻居"路径。访问这种网络共享时，Windows 用 **SMB** 协议（一种文件共享协议）连过去；连过去用谁的账密，就是 NEW_CREDENTIALS 要换的东西。

**实战最常见的场景——「用别的账密去访问一个网络共享」——要用 `NEW_CREDENTIALS`，不是 `INTERACTIVE`。** 理由：

- 你只是想让「连那个 `\\server\share` 时的网络登录」带上别人的账密，并不想真把自己在本机的身份换成他；
- `NEW_CREDENTIALS` **不校验账密**（它把凭据留着、等真正连远程时才用），所以即使那台机器不在本域也能用；正因如此，它也无法用来做「凭据预校验」——密码错要等真连远程时才暴露；
- 若目标是**本机**路径（`C:\...`）且 ACL 卡的是本机组，那就得用 `INTERACTIVE`，因为它才会在本机真正换身份。

这正是 five impersonation levels 里「**Delegate**（委派）」那档的落地——只有身份被委派/网络凭据被换掉，才能**以该身份去访问远程资源**。

#### 版本一：最小可用版（`RunImpersonated`）

现代 .NET（.NET Core / .NET 5+）推荐用 `WindowsIdentity.RunImpersonated` + `SafeAccessTokenHandle`。它在底层封装的就是 `ImpersonateLoggedOnUser` / `RevertToSelf`，但**回调一退出就自动 revert，不会忘**，是最省心的写法。

读这段代码时，把它当成「**三步走 + 一个托管句柄**」：

```csharp
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Principal;
using Microsoft.Win32.SafeHandles;

const int LOGON32_LOGON_NEW_CREDENTIALS = 9;  // 访问网络资源用
const int LOGON32_PROVIDER_DEFAULT = 0;

// 1. 拿别人的账密登录，铸一个新令牌（句柄交给 SafeAccessTokenHandle 托管，不再手动 CloseHandle）
if (!LogonUser("someone", "JZFZ", "P@ssw0rd",
        LOGON32_LOGON_NEW_CREDENTIALS, LOGON32_PROVIDER_DEFAULT,
        out SafeAccessTokenHandle hToken))
{
    throw new Win32Exception(Marshal.GetLastWin32Error()); // 比如 1326：用户名或密码错
}

// 2. 把它当 impersonation token 挂到当前线程，回调里就以该身份执行
WindowsIdentity.RunImpersonated(hToken, () =>
{
    // —— 这里面的代码，系统拿去做 access check 的令牌，已经是「someone」的了 ——
    Console.WriteLine($"当前身份：{WindowsIdentity.GetCurrent().Name}");

    // 原本报「拒绝访问」的网络路径，现在能读了：
    foreach (var f in Directory.GetFiles(@"\\fileserver\project-share\机密"))
        Console.WriteLine(f);
});
// 3. 回调一退出，线程自动换回原来的主令牌——不用自己 revert

[DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
static extern bool LogonUser(string lpszUsername, string lpszDomain, string lpszPassword,
    int dwLogonType, int dwLogonProvider, out SafeAccessTokenHandle phToken);
```

逐行带读：

- **第 1 步 `LogonUser(...)`**：注意返回值是 `bool`——Win32 API 惯例是「失败返回 false，错误码另查」。所以紧跟 `Marshal.GetLastWin32Error()` 拿本次调用的 Win32 错误码，再用 `new Win32Exception(code)` 把它翻译成人话（1326 =「登录失败：用户名或密码错」）。这一步只**铸令牌**，还没改变任何线程身份。
- **第 2 步 `RunImpersonated(hToken, () => {...})`**：这里发生了三件事的编排——进入回调前挂令牌（`ImpersonateLoggedOnUser`）、执行回调、退出回调时摘令牌（`RevertToSelf`）。**三步被绑成一个原子单元**，所以你没法在中间忘掉 revert。回调里 `Directory.GetFiles` 这一刻，线程身份已经是 `someone`。
- **第 3 步「自动 revert」**：回调哪怕中途抛异常，`RunImpersonated` 也会先 revert 再把异常往上抛——这是它相对手写 `try/finally` 最大的安全红利：**不存在「异常打断后线程一直顶着别人的令牌跑」这种灾难**。

> **为什么 `out SafeAccessTokenHandle` 直接就能用？** Win32 `LogonUser` 本来吐的是裸 `HANDLE`（一个 `IntPtr`），.NET 的 `SafeAccessTokenHandle` 派生自 `SafeHandle`，P/Invoke 见到 `out SafeAccessTokenHandle` 会**自动把裸句柄包进去**，并在它被 GC 或 Dispose 时调用 `CloseHandle`。于是你**再也不用手写 `CloseHandle`**，也不会因为异常漏关句柄。这正是「现代写法」相对老式 `IntPtr` 的核心红利。
>
> **一个小验证**：如果你在回调里 `Console.WriteLine(WindowsIdentity.GetCurrent().Name)` 打出的是 `JZFZ\someone`，回调外打出的是你自己的账户——说明令牌确实只作用于回调那一段。这就是「临时、可逆」最直观的证据。

> ⚠️ 版本一的局限：它把账密**硬编码**在调用处、每次都要重新 `LogonUser`、也不支持异步回调。这些正是版本二、三要解决的。

#### 版本二：生产级封装（手写底层 + 显式 revert）

真实项目里，你常常需要在每一步打日志、精细控制 revert 时机、把「登录会话」做成一个可 `using` 的对象。这时不如**直接调底层 Win32**——下面这版来自一个实际项目，把「建立网络登录会话」封装成一个 `IDisposable`。

读之前先抓住它的**设计骨架**——这个类把工作劈成两个阶段，分由两个方法承担：

- **`Create(...)`：一次性「铸令牌」**。LogonUser 拿到 primary token → DuplicateToken 复制成 impersonation token → 关掉 primary → 把 impersonation token 存进实例。**全程不改任何线程身份**，纯粹是准备一份「可挂载的令牌」。
- **`RunImpersonated(action)`：每次「挂令牌」**。挂上 → 执行 action → 无论如何都摘下来。**真正改线程身份的只有这里**，而且用 `try/finally` 保证可逆。

为什么这么劈？因为**铸令牌（贵、只需一次）**和**挂令牌（轻、可反复）**是两种不同成本的操作——把它们分开，才能「登录一次、反复模拟」，这正是后面版本三「缓存句柄」要利用的特性。

```csharp
using System.ComponentModel;
using System.Runtime.InteropServices;

/// <summary>
/// 「网络通行证」：LogonUser(NEW_CREDENTIALS) + DuplicateToken。
/// using 它之后，里面的 File.*（SMB 读文件）与 LookupAccountSid（走 IPC$ 连域控）
/// 都用这份凭据，而不再用当前进程 User_PC 的身份。
/// </summary>
public sealed class NetworkLogonSession : IDisposable
{
    private readonly IntPtr _impersonationToken; // 模拟令牌（primary 复制成 impersonation 后的句柄）
    private readonly string _accountLabel;
    private bool _disposed;

    private NetworkLogonSession(IntPtr impersonationToken, string accountLabel)
    {
        _impersonationToken = impersonationToken;
        _accountLabel = accountLabel;
    }

    public string AccountLabel => _accountLabel;

    public static NetworkLogonSession Create(string username, string password)
    {
        // 1. 把 "域\用户" 拆成 LogonUser 要的 domain / user 两个参数
        SplitUsername(username, out var user, out var domain);
        var label = string.IsNullOrEmpty(domain) ? user : $"{domain}\\{user}";

        // 2. LogonUser 铸一个 primary token（NEW_CREDENTIALS：只换出站网络凭据）
        if (!LogonUser(user, domain, password ?? "",
                Logon32LogonNewCredentials, Logon32ProviderDefault, out var token))
        {
            var e = new Win32Exception(Marshal.GetLastWin32Error());
            throw new IOException($"无法用账户 {label} 登录: {e.Message} (0x{e.NativeErrorCode:X})");
        }

        try
        {
            // 3. primary token 不能直接拿去 impersonate，先 DuplicateToken 成 impersonation token
            //    SecurityImpersonation(2)：允许在同进程内模拟（够用于本线程的网络出站）
            if (!DuplicateToken(token, SecurityImpersonation, out var duplicate))
                throw new IOException($"无法复制令牌: {new Win32Exception(Marshal.GetLastWin32Error()).Message}");

            return new NetworkLogonSession(duplicate, label); // 原始 token 在下面关掉
        }
        finally
        {
            CloseHandle(token); // primary 句柄使命已达，关掉；duplicate 留给实例用
        }
    }

    /// <summary>在当前线程模拟已登录用户；退出时保证 RevertToSelf。</summary>
    public void RunImpersonated(Action action)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (!ImpersonateLoggedOnUser(_impersonationToken))
            throw new IOException($"无法模拟: {new Win32Exception(Marshal.GetLastWin32Error()).Message}");

        try { action(); }
        finally { RevertToSelf(); } // 无论 action 成功/抛异常，都把线程换回原身份
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        if (_impersonationToken != IntPtr.Zero) CloseHandle(_impersonationToken);
    }

    private static void SplitUsername(string username, out string user, out string domain)
    {
        var t = username.Trim();
        var i = t.IndexOf('\\');
        if (i > 0) { domain = t[..i]; user = t[(i + 1)..]; return; }
        domain = ""; user = t;
    }

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool LogonUser(string u, string d, string p, int type, int prov, out IntPtr tok);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool DuplicateToken(IntPtr existing, int level, out IntPtr dup);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool ImpersonateLoggedOnUser(IntPtr tok);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool RevertToSelf();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr h);

    private const int Logon32LogonNewCredentials = 9;
    private const int Logon32ProviderDefault = 0;
    private const int SecurityImpersonation = 2; // DuplicateToken 的 impersonationLevel
}
```

逐段带读：

**① `Create` 里的三步资源流转**（这是这版最容易看走眼的地方）：

- `LogonUser(..., out var token)` —— 得到 **primary token**（记作 `token`），这是「原始句柄」。
- `DuplicateToken(token, ..., out var duplicate)` —— 复制出 **impersonation token**（记作 `duplicate`）。注意它俩是**两个独立的内核对象**，关掉一个不影响另一个。
- `try { return new NetworkLogonSession(duplicate, ...); } finally { CloseHandle(token); }` —— 把 `duplicate` 存进实例长期持有，把临时的 `token` 在 `finally` 里关掉。

**为什么必须用 `try/finally` 而不是顺序写？** 因为 `DuplicateToken` 可能失败、`new NetworkLogonSession` 也可能抛异常。若不用 `finally`，一旦中间抛异常，`token` 就永远关不掉（句柄泄漏）。`finally` 保证「**无论成功失败，原始 primary 句柄一定被回收**，只有成功时复制出的 duplicate 句柄才交给实例」。

**② `RunImpersonated(Action)` 自管 revert**：

```csharp
if (!ImpersonateLoggedOnUser(_impersonationToken)) throw ...;
try { action(); }
finally { RevertToSelf(); }
```

注意它和版本一的区别——版本一靠 `RunImpersonated` 内部 revert，这里**手写**了 `try/finally + RevertToSelf`。等价，但换来两个自由度：① 失败时能打结构化日志、抛自定义异常；② revert 前后能插埋点。代价是**你必须自己保证 `finally` 写对**——漏了就是线程一直顶着别人令牌的安全漏洞。

**③ `ObjectDisposedException.ThrowIf(_disposed, this)`**：实例被 `Dispose` 后再调 `RunImpersonated`，里面 `_impersonationToken` 的句柄已经关了，挂一个失效句柄会得到诡异错误。这行在前置拦截，给出明确异常而非玄学行为。

**④ `Dispose` 的幂等 + 关句柄**：`if (_disposed) return;` 保证重复 Dispose 安全；`CloseHandle(_impersonationToken)` 释放 DuplicateToken 产出的那个内核对象。到这里你应该看出**整个类的句柄所有权是闭环的**：`token` 在 Create 的 finally 里关，`duplicate` 在 Dispose 里关，一一对应，没有漏网。

> **一句话总括版本二的工程价值**：它把「铸令牌」和「挂令牌」解耦，让令牌成了一个**可持有、可复用、可正确释放**的对象——这正是版本一做不到、而服务端必需的。

用法：

```csharp
using var session = NetworkLogonSession.Create(@"JZFZ\someone", password);
session.RunImpersonated(() =>
{
    // 这里 File.* / Directory.* 走 SMB，LookupAccountSid 走 IPC$，
    // 都用 someone 的凭据——进程本机身份 User_PC 不受影响
    foreach (var f in Directory.GetFiles(@"\\fileserver\project-share\机密"))
        Console.WriteLine(f);
});
```

三个版本**机制完全一样**（都是 impersonation token），区别只在工程取舍：

| | 版本一 `RunImpersonated` | 版本二 手写底层 | 版本三 库 + 缓存 + 异步 |
| --- | --- | --- | --- |
| 句柄生命周期 | `SafeAccessTokenHandle` 自动管 | 自己 `CloseHandle` + `IDisposable` | 库返回 `SafeAccessTokenHandle`，缓存复用 |
| revert 保证 | 回调退出自动 revert，**不会漏** | 自己 `try/finally` + `RevertToSelf` | `RunImpersonated(Async)` 自动 revert |
| 是否需要 `DuplicateToken` | 不需要（直接用 LogonUser 句柄） | 需要（把 primary 复制成 impersonation） | 不需要（库内部已处理） |
| 异步支持 | 需自己改 `RunImpersonatedAsync` | 需自己处理跨线程流转 | 原生 `RunImpersonatedAsync` |
| 适合场景 | 一次性、逻辑简单 | 需要日志、复用、封装成会话对象 | 服务端、高频复用、异步 |

来源：[Impersonating and Reverting](https://learn.microsoft.com/en-us/dotnet/standard/security/impersonating-and-reverting)、[LogonUser (win32)](https://learn.microsoft.com/en-us/windows/win32/secauthn/logonuser)、[SafeHandle / dispose 模式](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)

#### 版本三：服务端实战（库 + 句柄缓存 + 异步）

版本一二都假设「每次调用都重新 `LogonUser`」。但在 Web 服务里，**同一个用户的凭据会被高频反复使用**——每来一个请求就 LogonUser 一次既慢又无谓。真实生产里通常做两件事：① 用一个库省掉手写 P/Invoke；② **把登录得到的 token 句柄缓存起来复用**。

**先说为什么用库。** 手写 `advapi32!LogonUser` + `DuplicateToken` + `CloseHandle` 容易出错（上一版的几十行代码就是证明）。[`SimpleImpersonation`](https://github.com/mattjohnsonpint/SimpleImpersonation) 这个库把这些都包了，按它官方 README：

> You'll first want to import these namespaces... Then you can get a handle for the user using this library.
> ```csharp
> UserCredentials credentials = new UserCredentials(domain, username, password);
> using SafeAccessTokenHandle userHandle = credentials.LogonUser(LogonType.Interactive);  // or another LogonType
> ```
> You can then use that handle with built-in .NET functions such as `WindowsIdentity.RunImpersonated` or `WindowsIdentity.RunImpersonatedAsync`.

它返回的就是标准 `SafeAccessTokenHandle`，照样喂给 `RunImpersonated`——**库只帮你省下 P/Invoke，不换一套机制。** 它内部调的就是同一个 Win32 `LogonUser`，所以前面讲的 `LogonType` 选型对它完全适用。

**再说为什么要异步。** 服务端代码几乎都是 `async`，而 impersonation 是**线程级**状态。如果用同步版 `RunImpersonated(handle, () => { ... })` 包一个 `async` lambda，`await` 之后线程可能跑到别处去，impersonation 不一定跟着流——会埋下「身份丢失」的隐蔽 bug。.NET 专门提供了异步重载（`.NET 6+`）：

```csharp
// 同步版：回调返回普通值
public static T RunImpersonated<T>(SafeAccessTokenHandle, Func<T>);

// 异步版：回调返回 Task，框架保证 await 跨线程时身份跟着流
public static Task    RunImpersonatedAsync   (SafeAccessTokenHandle, Func<Task>);
public static Task<T> RunImpersonatedAsync<T>(SafeAccessTokenHandle, Func<Task<T>>);
```

来源：[WindowsIdentity.RunImpersonatedAsync](https://learn.microsoft.com/en-us/dotnet/api/system.security.principal.windowsidentity.runimpersonatedasync)（monikers 含 `net-6.0` 起）

**合起来：一个带缓存的服务端身份服务**（脱敏自一个真实项目）。

读之前先抓它的**三层结构**——这版比版本二多了一层「缓存」，分工是：

- **对外 API 层**（`RunAsUser` / `RunAsUserAsync`）：同步/异步各一套，对外只暴露「给账密 + 给委托」。它们先把账密换成**缓存的句柄**，再交给执行层。
- **缓存层**（`GetCachedHandle`）：核心增量。同一个 `(域, 用户, 密码)` 组合，只 `LogonUser` 一次，之后 8 小时内直接复用同一个 `SafeAccessTokenHandle`。
- **执行层**（`RunImpersonatedWrapperAsync`）：决定用同步还是异步版、要不要做平台守卫。这是「真正挂令牌」的地方。

注意它**不再自己 P/Invoke**——`LogonUser` 那一摊交给 `SimpleImpersonation` 库，自己只管「缓存策略」和「同步/异步选择」。这是和版本二最根本的分工差异。

```csharp
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Win32.SafeHandles;
using SimpleImpersonation;
using System.Runtime.Versioning;
using System.Security.Principal;

/// <summary>以指定 Windows 用户身份执行同步/异步操作，并缓存登录句柄。</summary>
public sealed class WindowsIdentityService
{
    private readonly IMemoryCache _cache;

    public WindowsIdentityService(IMemoryCache cache) => _cache = cache;

    public Task<T> RunAsUserAsync<T>(string user, string pwd, Func<Task<T>> func)
    {
        var handle = GetCachedHandle(user, pwd);          // 复用缓存句柄
        return RunImpersonatedWrapperAsync(handle, func); // 异步
    }

    public T RunAsUser<T>(string user, string pwd, Func<T> func)
    {
        var handle = GetCachedHandle(user, pwd);
        return WindowsIdentity.RunImpersonated(handle, func); // 同步
    }

    [SupportedOSPlatform("windows")]
    private SafeAccessTokenHandle GetCachedHandle(string user, string pwd)
    {
        // key 含域+用户+密码哈希：凭据一变就重新登录
        var key = $"WinToken_{DOMAIN}\\{user}_{Hash(pwd)}";

        var handle = _cache.GetOrCreate(key, entry =>
        {
            try
            {
                // SimpleImpersonation 包了 LogonUser；NewCredentials = LOGON32_LOGON_NEW_CREDENTIALS
                var h = new UserCredentials(DOMAIN, user, pwd).LogonUser(LogonType.NewCredentials);
                if (h is null || h.IsInvalid)
                {
                    entry.SetAbsoluteExpiration(TimeSpan.FromSeconds(1)); // 防无效凭据刷屏
                    return null;
                }
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(8); // 命中复用 8h
                entry.RegisterPostEvictionCallback((_, v, _, _) =>
                    (v as SafeAccessTokenHandle)?.Dispose());                  // 逐出时回收句柄！
                return h;
            }
            catch { entry.SetAbsoluteExpiration(TimeSpan.FromSeconds(5)); return null; }
        });

        if (handle is null || handle.IsInvalid)
            throw new UnauthorizedAccessException($"无法为 {user} 获取令牌，检查凭据或域连接");
        return handle;
    }

    private async Task<T> RunImpersonatedWrapperAsync<T>(SafeAccessTokenHandle h, Func<Task<T>> f)
    {
        // 非直接调 RunImpersonatedAsync：服务端要兼容非 Windows 容器部署
        if (OperatingSystem.IsWindows())
            return await WindowsIdentity.RunImpersonatedAsync(h, f);
        return await f();
    }

    private const string DOMAIN = "JZFZ";
}
```

这段相对版本二，把工程重心从「手写底层」移到了「**复用与并发**」上。逐个拆：

**① 缓存句柄，不缓存密码——为什么能这么干？**

```csharp
var key = $"WinToken_{DOMAIN}\\{user}_{Hash(pwd)}";
var handle = _cache.GetOrCreate(key, entry => { ... LogonUser ... });
```

很多人第一反应是「密码也能缓存？」。能，但这里**缓存的是 `LogonUser` 的产物（token 句柄），不是密码**——密码的哈希只用来**拼 cache key**（凭据一变，key 就变，自然触发重新登录）。为什么 token 句柄值得缓存？因为 **`SafeAccessTokenHandle` 是个值对象，可以反复拿去 impersonate**——你登录一次拿到 someone 的令牌，这一个令牌能挂在 A 线程、也能挂在 B 线程，互不干扰（每次 impersonate 都是「拷一份挂上去」）。所以「登录一次、8 小时内反复用」完全成立，省掉的是昂贵的系统调用 `LogonUser`，不是省安全性。

> 注意 key 里**不能直接放明文密码**——`MemoryCache` 的 key 会进日志、进诊断工具。放哈希既保证「凭据变了能感知」，又不会泄露密码。

**② 逐出回调里 `Dispose` 句柄——一个隐蔽的句柄泄漏坑**

```csharp
entry.RegisterPostEvictionCallback((_, v, _, _) =>
    (v as SafeAccessTokenHandle)?.Dispose());
```

这是整段最关键、也最容易被抄漏的一行。`SafeAccessTokenHandle` 包的是**内核对象**（一个 token），`MemoryCache` 在缓存过期/驱逐时**只把它从字典里删掉，绝不会帮你调 Dispose**——它根本不知道你存的是不是 `IDisposable`。如果不注册这个回调，缓存条目一过期，那个 token 句柄就**成了孤儿**：.NET 这边没了引用，但内核里它还开着。短时间看不出问题，跑几天句柄数就涨上去（任务管理器看进程「句柄」列），最终可能撞上句柄上限。

`RegisterPostEvictionCallback` 就是补这个缺口：**缓存把它驱逐时，回调里手动 Dispose，把内核对象也关掉**。逻辑闭环——缓存负责「要不要留」，回调负责「不留了就回收」。

**③ 无效凭据给 1 秒过期——防「坏凭据风暴」**

```csharp
if (h is null || h.IsInvalid)
{
    entry.SetAbsoluteExpiration(TimeSpan.FromSeconds(1)); // 防无效凭据刷屏
    return null;
}
```

回忆前面的关键事实：`NEW_CREDENTIALS` **不校验密码**。所以正常情况下 `h` 不会因为密码错而 `IsInvalid`——一旦走到这里，多半是**参数本身有问题**（用户名拼错、域不对）。这种「必然失败」的调用，如果不缓存一个短过期，每个请求都会重试一次 `LogonUser`，造成无谓的失败风暴。给它 1 秒过期，相当于「**记下这个组合最近试过、不行，1 秒内别再试**」，把坏凭据的冲击限流。同理 `catch` 里给 5 秒，是应对偶发网络抖动。

**④ `RunImpersonatedAsync` 而非同步版包 async——根治跨线程身份丢失**

```csharp
if (OperatingSystem.IsWindows())
    return await WindowsIdentity.RunImpersonatedAsync(h, f);  // ✅ 异步重载
return await f();
```

这是服务端最容易踩的坑，单独拎出来讲透。impersonation 是**线程级**状态——`ImpersonateLoggedOnUser` 把令牌挂到「当前线程」上。问题来了：

```csharp
// ❌ 危险写法：用同步版包 async lambda
WindowsIdentity.RunImpersonated(handle, async () =>
{
    await SomeIoAsync();   // await 之后，continuation 可能跑在另一个线程！
    DoWork();              // 这个 DoWork 还在 someone 身份下吗？不一定。
});
```

`await` 之后，continuation 可能被调度到**线程池里另一个线程**——那个线程没挂过令牌，`DoWork()` 这一刻就**顶着进程自己的身份**在跑，impersonation「断」了。这种 bug 极其隐蔽：本地测试（单线程、continuation 没换线程）一切正常，上了负载就偶发「权限不对」。

`RunImpersonatedAsync` 专门解决这个问题——它在 `ExecutionContext` 层面让身份**跟着异步流流转**，无论 continuation 跑到哪个线程，身份都跟着过去。所以规则很简单：**回调里有 `await`，就必须用 `RunImpersonatedAsync`，别用同步版**。

> 顺带注意 `OperatingSystem.IsWindows()` 这个守卫：impersonation 是 Windows 概念，Linux 容器里 `RunImpersonatedAsync` 直接调用会抛。服务端常要兼容跨平台部署，所以包一层「是 Windows 才模拟，否则原样执行」。这是版本二没有的「部署意识」。

> ⚠️ 两个生产级陷阱（SimpleImpersonation README 明确警告）：
> - **连接池不认 impersonation**：用 `NewCredentials` 去连 SQL Server 的「Windows 集成认证」时，SQL 连接池会复用旧凭据，导致**串号**。必须改连接串（如每个身份独立的连接池键），否则别用 impersonation 跑 SQL。
> - **它不做远程认证**：SimpleImpersonation 只在本机调 `LogonUser`，「连远程机器」的前提是本机和远程机**同域或有信任关系**；任一方是域外机器，连不上。它换的是出站凭据，不是凭空造认证。

来源：[SimpleImpersonation README](https://github.com/mattjohnsonpint/SimpleImpersonation)、[WindowsIdentity.RunImpersonatedAsync](https://learn.microsoft.com/en-us/dotnet/api/system.security.principal.windowsidentity.runimpersonatedasync)、[MemoryCache 逐出回调](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.memory.postevictiondelegate)

#### 为什么版本二多了一步 `DuplicateToken`？

这是很多人照抄代码时会困惑的点。`LogonUser(NEW_CREDENTIALS)` 返回的其实是 **primary token**，而 `ImpersonateLoggedOnUser` 要挂的是 **impersonation token**——两者的 token type 不同。`DuplicateToken` 的作用正是**把 primary token 复制成一个 impersonation level 的 impersonation token**，这一步在「拿 primary token 去模拟」的场景里是必需的。

> 版本一的 `RunImpersonated` 之所以不用你写 `DuplicateToken`，是因为它内部对句柄做了处理，对调用方透明。版本二手写底层，就得把这步显式补上——这也正是「封装帮你抹平」的细节。

#### 怎么理解它「为什么就访问得了了」

把三段拼起来：

- 登录前：你的进程挂着的是**自己的主令牌**，里面没有 `\\fileserver\project-share\机密` 的 DACL 所要求的那个 SID → access check 失败 → 「拒绝访问」。
- `LogonUser` + 模拟后：当前线程在回调期间挂上的是 **someone 的令牌**，里面有那个能命中的组 SID → access check 通过 → 能读。
- 退出回调：线程令牌**自动/显式 revert** 回你自己的主令牌，后续代码又访问不了了——这正是 impersonation token「临时、可逆」的特性。

一句话：**你只是借了别人的令牌用一小会儿，没改进程本身的主令牌，也没真改本机登录。**

> ⚠️ 两个易踩的坑：
> - **密码安全**：硬编码在代码里的明文密码是头号泄露源。生产里应放密钥库（Azure Key Vault、Windows 凭据管理器 DPAPI 等），别写源码里。
> - **`INTERACTIVE` 的代价**：如果误用 `INTERACTIVE` 去访问网络共享，本机身份也会被换，本地 ACL 判断会跟着变，可能反而访问不了本机原本能开的资源；反过来想动本机权限又误用 `NEW_CREDENTIALS`，则会发现「账密对了但本机还是拒绝」。**先想清楚目标是本机还是远程，再选 2 还是 9。**

### 收束

**你现在会了：**

- **令牌是什么**：登录成功后系统发给进程的"身份证 + 权限清单"（受保护对象），里面装用户 SID、组 SID、特权。
- **它怎么来的**：认证给 SID + 本机策略给 privileges → LSA 打包成 primary token，拷一份挂到你的每个进程上。
- **为什么叫 primary**：相对 impersonation token 而言——后者让线程临时"扮演"别人，本讲用三个递进的 C# 例子演示了它（`NEW_CREDENTIALS` 管网络访问、`INTERACTIVE` 管本机），从最小可用 `RunImpersonated`、到手写底层封装、再到服务端库 + 句柄缓存 + 异步 `RunImpersonatedAsync`。
- **访问资源的真相**：令牌里的 SID 去比对资源 DACL 里的名单（那张授权流程图）。
- **一个核心误区**：**重启网卡不直接刷 access token、也不清 Kerberos 票据**（它们在进程内存 / LSASS，与网卡无关），但能切断到 DC 的连接、触发重新发现 DC，间接促成重新认证——这就是它"偶尔管用"的真相。
- **加权限"过段时间才生效"的四道关**：AD 复制（站内 15s / 跨站默认 180min）→ TGT/PAC 重新签发 → DC 定位缓存（默认粘 12h）→ 负缓存（45s），分别对应"等数据 / 重认证 / 换 DC / 避退避"四种解法。标准组合拳是管理员 `repadmin /syncall` + 你 `klist purge` 重登。

**下一讲才需要：** 文件上如何登记「主人是谁」（Owner）——还不是完整权限表。

<!-- chapter-nav:start -->
← 上一章：[第 4 讲：登录与 LSA](./05-logon-lsa.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 6 讲：Owner](./07-owner.md)
<!-- chapter-nav:end -->
