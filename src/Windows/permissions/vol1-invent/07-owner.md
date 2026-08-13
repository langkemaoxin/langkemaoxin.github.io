---
title: "第 6 讲：Owner——对象上的主人字段"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 6 讲：Owner"
order: 7
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

# 第 6 讲：Owner——对象上的主人字段

### 麻烦

只有「当前操作者」不够：每个文件还要回答「这算谁的」。

更麻烦的是——**你自己的文件，会不会反过来把你锁在外面？** 你手滑把某个文件夹的权限表（DACL）改成了「谁都不许读」，结果连你自己也打不开了。如果没有补救机制，这文件就成了永久死局。

Windows 给的补救，就藏在本讲这个字段里：**Owner**。

### 这一讲只发明：Owner

可保护对象（文件、文件夹等）带有一份安全信息（**安全描述符**，Security Descriptor）；其中有一个 **Owner（所有者）** 字段，记录主人对应的主体（最终仍是 SID）。
Learn 的安全描述符示例里可以看到 `Owner: ... [S-1-5-21-...]` 这种形态。
来源：[AD domain-join permissions 示例中的 Security Descriptor](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/active-directory-domain-join-permissions)

直觉：

- 创建文件时，常把创建者记为 Owner
- Owner 提供「这是谁的文件」的默认锚点；**更细的「谁能读谁能写」是后面的规则表（DACL）**，本讲先不展开

但「主人」到底比普通用户多什么？这正是 Owner 这个字段真正值钱的地方——它不是个摆设，而是带**特权**的。

### Owner 的灵魂：主人总能改自己对象的权限

先记住一句反直觉的话：

> **对象的主人，永远能在自己对象上读、改权限表（DACL）——哪怕那张表上明确拒绝了你。**

官方原文（Owner of a New Object）写得很直白：

> An object's owner implicitly has WRITE_DAC access to the object. This means that the owner can modify the object's discretionary access control list (DACL).
> （对象的 owner **隐式拥有** `WRITE_DAC`——改 DACL 的能力。这意味着 owner 能修改对象的 DACL。）
>
> 来源：[Owner of a New Object（Win32）](https://learn.microsoft.com/en-us/windows/win32/secauthz/owner-of-a-new-object)

`WRITE_DAC` 是「改权限表」的权限位（DACL 里的「谁能读谁能写」就装在这里）。此外 owner 还隐式拿到 `READ_CONTROL`（读安全描述符）。**这两项是「隐式」给 owner 的——不走 DACL 比对**，所以哪怕你把 DACL 改成「连我自己都 Deny」，owner 这两项仍然在。

> 为什么这么设计？这就是前面那个麻烦的答案：**保证你永远不会被自己的文件「反锁在外」。** 你手滑把自己锁出去，没关系——你 owner 的身份还在，`WRITE_DAC` 隐式在手，你还能改回 DACL 把自己放进去。

这一节是 Owner 的全部意义所在。剩下两件事——「主人默认是谁」「怎么把主人改成别人」——都是围绕着这句展开的。

> ⚠️ **一个细节**：这个「owner 隐式有 `WRITE_DAC`」是 **Windows Server 2008 之前**的默认行为，**到现在默认仍然如此**。但 2008 起引入了一个叫 **「Owner Rights」** 的特殊主体，可以用来**限制** owner 的隐式权限（让 owner 也得乖乖按 DACL 走）。日常 99% 的场景用不到它，知道有这么个「封印开关」即可。
> 来源：[MS-ADTS - Blocking Implicit Owner Rights](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/fb7c101d-ec8b-4fbf-bca8-7d7c2d747d0c)

### 默认 Owner 从哪来：token 里早埋好了

那「主人」最初是怎么定下来的？答案接上一讲（Access Token）埋的伏笔——**创建对象时，owner 默认取当前进程令牌里的「默认 Owner」字段**。

回忆上一讲列的 primary token 内容，有这么一项：

- **Owner（默认所有者 SID）**、Primary Group、默认 DACL（这些等 Owner 那讲细说）

现在补上「细说」：**你新建一个文件，它的 Owner 字段，默认就是当前进程 token 里的「默认 Owner」字段**（token 里真有这么一项，可以用 `GetTokenInformation(TokenOwner)` 查到）。而这个默认 Owner 是谁，有常见情况、却**别当成铁律**：

- **常见情况**：完整 admin token（如「以管理员身份运行」开出来的）默认 Owner 常是 **Administrators 组**；受限 / 非提权 token 默认 Owner 常是个人自己。
- **设计意图**：管理员建的对象 owner 落在「组」上，组里**任何管理员**都能凭 owner 身份改它的 DACL，不绑死在某一个人身上。
- **但以实查为准**：下面真机印证——本会话其实是**提权状态**（High 完整性、Administrators 在组里且启用），`GetTokenInformation(TokenOwner)` 查出来，token 默认 owner 却是个人 `JZFZ\chengongyi`（SID `S-1-5-21-3977539503-3587586693-2971573549-279405`），于是新建文件 owner 落到个人、而非组。可见「提权就一定是组」不成立；换一个「以管理员身份运行」的窗口建文件，owner 又可能落到 `BUILTIN\Administrators`。**所以别假设"我登的是管理员，owner 一定是组"——建个文件查一下最准。**

下面是真机印证（本机 `C:\Users\chengongyi` 下新建一个文件，立刻看它的 owner）：

```powershell
PS> New-Item C:\Users\chengongyi\probe.txt -Value x
PS> (Get-Acl C:\Users\chengongyi\probe.txt).Owner
JZFZ\chengongyi
```

实测当前账户虽属 `BUILTIN\Administrators`（且该组在 token 里是「启用的组、组的所有者」），但**新建文件 owner 仍是个人 `JZFZ\chengongyi`**——印证了上面那条「以实查为准」：提权了，默认 owner 也未必是组。`whoami /groups` 里那行：

```
BUILTIN\Administrators | 必需的组, 启用于默认, 启用的组, 组的所有者
```

> 🔑 **一句话**：owner 不是文件自己「想」出来的，是**从你登录铸好的 token 里抄来的**。所以「这个文件算谁的」，早在你登录那一刻、token 铸好时就定了大半。而 token 的默认 Owner 是「组」还是「个人」，取决于 token 的成色（完整 admin token vs 受限 token）和本机策略——**别背口诀，建一个文件查一下最准**。要改 token 的默认 Owner，是另一码事，本讲不展开。

### 怎么看见：icacls 查 owner、takeown 改 owner

既然 owner 能改 DACL，那「夺回失控对象」就有了抓手。命令行两个工具：

**① 看 owner——`Get-Acl`（最直接）**

`icacls` 默认列出的是 **DACL 里的 ACE**（哪些主体有什么权限），**并不直接显示 owner 那一行**。要看 owner 字段本身，PowerShell 的 `Get-Acl` 最干脆：

```powershell
PS> (Get-Acl 'Z:\Test\1.txt').Owner
JZFZ\chengongyi
```

这是真机实测：`1.txt` 在那个共享里，owner 就是当前账户 `JZFZ\chengongyi`。要连 SID 一起拿（用于代码里比对），把名字转成 `SecurityIdentifier`：

```powershell
PS> $o = (Get-Acl 'Z:\Test\1.txt').Owner          # 是 NTAccount 名字（字符串）
PS> ([Security.Principal.NTAccount]$o).Translate([Security.Principal.SecurityIdentifier]).Value
S-1-5-21-3977539503-3587586693-2971573549-279405
```

> 注意 `(Get-Acl ...).Owner` 返回的是**字符串（NTAccount 名）**，不是 `IdentityReference` 对象——所以不能直接 `.Translate`，得先强转回 `NTAccount` 再转。文章后面 C# 例子同此。

如果想用 GUI 看全：资源管理器「属性 → 安全 → 高级 → 所有者」，那一栏就是 owner。

**② 看权限表（DACL）——`icacls`**

`icacls` 强项是列/改 DACL。同一文件的真实输出（节选）：

```text
Z:\Test\1.txt JZFZ\CD-2013388_设总:(I)(F)
              JZFZ\CD-2013388_项目组:(I)(F)
              ...
              JZFZ\Administrator:(I)(F)
              BUILTIN\Administrators:(I)(F)

已成功处理 1 个文件; 处理 0 个文件时失败
```

每行一个 ACE：主体 + `(I)`（inherited，继承来的）+ `(F)`（Full，完全控制）/`(RX)`（读执行）等权限位。这些 ACE 是「谁能读谁能写」——**下一讲的权限位、后续 ACE/DACL 才展开**，本讲只先认脸。

**③ 夺回 owner——`takeown`**

运维夺回失控对象时，可用 `takeown` 取得所有权。
来源：[takeown](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/takeown)

```bat
takeown /f lostfile
```

`takeown` 的完整参数（取自官方）：

| 参数 | 作用 |
|------|------|
| `/f <名称>` | 指定文件/目录（支持 `*` 通配） |
| `/a` | **把 owner 交给 Administrators 组**，而不是当前登录的用户（不加 `/a` 就是给当前用户） |
| `/r` | **递归**：对该目录及所有子目录/文件操作 |
| `/d {Y\|N}` | 配合 `/r` 用：当前用户没「列出文件夹/读取」权限时的默认答复（`Y`=夺、`N`=跳过），免得每个文件都弹确认 |
| `/s /u /p` | 对远程机器、用指定账户执行 |

> 📎 takeown 官方还特意提了一句：**夺回 owner 之后，你往往还得再给自己授访问权限（如完全控制）才能真正读/删文件**——因为 `takeown` 只改了 owner，没改 DACL。这点下面「实机演示」会印证，也是「常见误区」里的高频坑。

### takeown 凭什么能夺别人的东西：靠特权，不靠文件权限

到这里有个自然的疑问：`takeown` 凭什么能把**别人**文件的 owner 改成自己？你在那个文件上又没有「改 owner」的权限（`WRITE_OWNER`）。

答案是：它靠的不是**文件权限**，而是**特权（privilege）**——一个比 DACL 更高、由系统策略授予的全局权利：**`SeTakeOwnershipPrivilege`（取得文件或其它对象的所有权）**。

> By default, the Administrators group is given the *Take ownership of files or other objects* user right.
> （默认情况下，**Administrators 组**被授予「取得文件或其它对象所有权」这一用户权利。）
>
> 来源：[Take ownership of files or other objects（安全策略设置）](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/take-ownership-of-files-or-other-objects)

关键点：

- **它是特权，绕过 DACL。** `SeTakeOwnershipPrivilege` 让持有者能对**几乎任何对象**执行「取得所有权」操作，**不需要在 DACL 里被授予 `WRITE_OWNER`**。特权是系统级的，不走「令牌 SID 命中 DACL」那套比对（那套是上一讲的图）。
- **默认只给 Administrators 组**，而且**在 token 里默认是 disabled（禁用）状态**——要真正用，得先 enable。`takeown` 内部帮你做了 enable → 取得所有权 → 的过程，所以你直接敲就行；自己写代码就得记得 `AdjustTokenPrivileges` 把它打开。
- 类似的还有个 **`SeRestorePrivilege`**（恢复），也能改 owner 且限制更少。这俩是夺权的两把钥匙。

> 🔒 这也是为什么 **`SeTakeOwnershipPrivilege` 是提权的常见跳板**：拿到一个带这条特权（哪怕 disabled）的进程，enable 它，就能夺走系统敏感文件（如 `utilman.exe`）的 owner、再换成自己的后门——权限就从「能改某个文件」跳到了「能控制系统」。所以别随便把这条特权授给普通账户。

### 实机演示：真机跑一遍，印证上面三条

卷一的规矩——真机跑一遍，不写假设的输出。下面两组测试都在**本机沙盒**里做（公司共享 `Z:\Test` 有自动恢复机制，一改 ACL 文件就被重置，不适合做破坏性测试；只读查 owner 用它没问题）。

**先建沙盒目录。** 两条测试都用到一个工作目录 `owner_sandbox`。它默认不存在，得先建出来——否则第一步 `New-Item` 建文件就会报「未能找到路径的一部分」。在自己的用户目录下建一个：

```powershell
PS> $sb = "$HOME\owner_sandbox"          # 比如 C:\Users\你的用户名\owner_sandbox
PS> New-Item -ItemType Directory -Path $sb -Force | Out-Null
PS> Test-Path $sb
True
```

> 下面所有命令里的路径，我都写成 `C:\Users\chengongyi\owner_sandbox\...`——那是**作者机器上的真实路径**。你照着敲时，把 `chengongyi` 换成你自己的用户名（或直接用 `$HOME\owner_sandbox\...`）。命令后面的输出是作者真跑出来的，原样贴在这里。

#### 测试一：ACL 里彻底没我，仅凭 owner 身份能否改 DACL

要印证的是「Owner 的灵魂」那句——**owner 不靠 DACL 授权，本身就能改 DACL**。

但要干净地证明它，得先排掉一个干扰：默认情况下，我新建的文件 ACL 里**继承**了一条 `JZFZ\chengongyi:(I)(F)`（给我的完全控制）。如果留着它，后面我能改 DACL 就说不清是"靠继承的权限"还是"靠 owner 身份"了。所以测试思路是——**先把 ACL 里关于我的条目全清掉、继承也关掉，让 DACL 只剩 SYSTEM；这时我唯一的凭据就是 owner 身份**。若这种情况下我还能改 DACL，那就纯粹是 owner 的功劳。

**第 1 步：建文件，看它的初始 owner 和 ACL。**

先得有个测试对象，并记下它的"出厂状态"。三条命令各管一件事：

- `New-Item -Path <文件> -Value <内容> -Force` —— 建文件（`-Force` 保证父目录不存在时连目录一起建出来，省得先手动 `mkdir`）。
- `(Get-Acl <文件>).Owner` —— 读出 owner 字段（`.Owner` 取的就是主人那一栏）。
- `icacls <文件>` —— 不带任何开关时，它**只列出当前的 ACL**（哪些主体、什么权限、是否继承）。

```powershell
PS> New-Item -Path C:\Users\chengongyi\owner_sandbox\pure_owner.txt -Value 'pure owner test' -Force
PS> (Get-Acl C:\Users\chengongyi\owner_sandbox\pure_owner.txt).Owner
JZFZ\chengongyi
PS> icacls C:\Users\chengongyi\owner_sandbox\pure_owner.txt
pure_owner.txt NT AUTHORITY\SYSTEM:(I)(F)
               BUILTIN\Administrators:(I)(F)
               JZFZ\chengongyi:(I)(F)

已成功处理 1 个文件; 处理 0 个文件时失败
```

owner 是我（`JZFZ\chengongyi`）；ACL 里每行 `(I)` 表示 inherited（继承自父目录），`(F)` 是 Full（完全控制）。注意有一条**给我的 `JZFZ\chengongyi:(I)(F)`**——这条继承项就是待会儿要清掉的干扰。

> 🔎 **如果你跑出来 owner 是 `BUILTIN\Administrators`（组）而非个人，别以为我写错了**——那是你在「以管理员身份运行」的窗口里建的，那种完整 admin token 默认 owner 是组。本文这些输出，是在「默认 owner = 个人」的会话里真跑出来的（见上面「默认 Owner 从哪来」）。两种情况下面的测试逻辑都一样成立，只是 owner 字段的值不同。

**第 2 步：清空 ACL——关掉继承，只留 SYSTEM。**

这一步是整个测试的关键准备：要制造"DACL 里完全没有我"的极端情形，把"靠继承权限改 DACL"这条路堵死，逼得我只能靠 owner 身份。用的是 icacls 两个参数的组合：

- `/inheritance:r` —— **r = remove**：关掉这个文件的继承，并且**丢弃**所有从父目录继承来的条目（不转成显式项，直接删）。执行后，第 1 步那三条 `(I)` 继承项就全没了。
- `/grant:r 'SYSTEM:(F)'` —— **r = replace（reset）**：把 ACL **重置**成只含这里指定的条目。和它对比的是不带 `:r` 的 `/grant`（追加，下面第 4 步用）。所以 `/grant:r SYSTEM:(F)` = "ACL 清空，只留 SYSTEM 一个完全控制"。

两个 `r` 意思不同（一个管继承、一个管授权列表），别混。合起来这一句就是：**关继承、丢弃继承项，然后 ACL 只保留 SYSTEM 的完全控制**。

```powershell
PS> icacls C:\Users\chengongyi\owner_sandbox\pure_owner.txt /inheritance:r /grant:r 'SYSTEM:(F)'
已处理的文件: C:\Users\chengongyi\owner_sandbox\pure_owner.txt
已成功处理 1 个文件; 处理 0 个文件时失败
```

再查一次确认结果：

```powershell
PS> icacls C:\Users\chengongyi\owner_sandbox\pure_owner.txt
pure_owner.txt NT AUTHORITY\SYSTEM:(F)

已成功处理 1 个文件; 处理 0 个文件时失败

PS> (Get-Acl C:\Users\chengongyi\owner_sandbox\pure_owner.txt).Owner
JZFZ\chengongyi
```

ACL 现在只剩 `NT AUTHORITY\SYSTEM:(F)` 一条——**关于我的条目全没了**。但 owner **仍然是我**（`JZFZ\chengongyi`）。这一步的关键就在这：**DACL 不认我，owner 认我**。

**第 3 步：先确认我现在确实写不了（DACL 没我）。**

先建立"基线"——证明清空 ACL 后我是真的被挡在门外，免得后面"能改"显得理所当然。用 `Set-Content <文件> -Value <内容>` 覆盖写文件内容：

```powershell
PS> Set-Content C:\Users\chengongyi\owner_sandbox\pure_owner.txt -Value 'try'
Set-Content : 对路径“C:\Users\chengongyi\owner_sandbox\pure_owner.txt”的访问被拒绝。
```

写被拒。符合预期——DACL 里没有我，按"谁都没命中就默认拒绝"的规则，我被挡了。

**第 4 步：关键验证——仅凭 owner 身份，尝试改 DACL。**

这是整个测试的"判决时刻"。此刻我**没有任何显式权限**（DACL 只剩 SYSTEM），唯一能让我动 DACL 的依据就是"我是 owner"。如果这条 grant 能成功，就实锤了 owner 隐式拥有 `WRITE_DAC`。

这里用的是**不带 `:r` 的 `/grant`**——和第 2 步的 `/grant:r` 区别开：

- `/grant 'jzfz\chengongyi:(W)'` —— **追加**一条授权：给我（`jzfz\chengongyi`）加一个写权限 `(W)`，ACL 里已有的 SYSTEM 条目保留不动。

```powershell
PS> icacls C:\Users\chengongyi\owner_sandbox\pure_owner.txt /grant 'jzfz\chengongyi:(W)'
已处理的文件: C:\Users\chengongyi\owner_sandbox\pure_owner.txt
已成功处理 1 个文件; 处理 0 个文件时失败
```

**成功了**。我在这个文件上没有任何授权，却改动了它的 DACL——能成功的唯一解释，就是我 owner 身份自带的隐式 `WRITE_DAC`。这就是「Owner 的灵魂」的实证：**owner 改 DACL 不走 DACL 比对，是身份自带的**。

**第 5 步：改完 DACL，真的能写了吗？——一个意外的真实发现。**

grant 成功了，按理我现在有 `(W)` 写权限，该能写了吧？再用 `Set-Content` 验证一下：

```powershell
PS> Set-Content C:\Users\chengongyi\owner_sandbox\pure_owner.txt -Value 'recovered'
Set-Content : 对路径“C:\Users\chengongyi\owner_sandbox\pure_owner.txt”的访问被拒绝。
```

**居然还被拒**！ACL 明明已经有 `JZFZ\chengongyi:(W)` 了。这不是测试出错，而是踩到了一个真实细节：`Set-Content` 写文件前要先以**读写模式打开**文件，光有"写数据"权限 `(W)` 不够，还得有"读/打开"的权限。换句话说——**owner 能改规则（这点第 4 步已证），但规则里给哪个权限位、才能让某个具体操作通过，是另一回事**。

补 grant 成完全控制 `(F)` 再试（`/grant` 追加，这次给的是 `(F)` 而非 `(W)`），这次就通了：

```powershell
PS> icacls C:\Users\chengongyi\owner_sandbox\pure_owner.txt /grant 'jzfz\chengongyi:(F)'
已成功处理 1 个文件; 处理 0 个文件时失败

PS> Set-Content C:\Users\chengongyi\owner_sandbox\pure_owner.txt -Value 'recovered'
PS> Get-Content C:\Users\chengongyi\owner_sandbox\pure_owner.txt
recovered
```

**测试一小结（每步对应证明了什么）：**

| 步 | 动作 | 真实结果 | 证明了什么 |
|---|---|---|---|
| 1 | 建文件 | owner=我，ACL 含给我的继承 `(F)` | 记下出厂状态；找到要清的干扰项 |
| 2 | 清空 ACL 只留 SYSTEM | ACL 只剩 SYSTEM，owner 仍是我 | **DACL 不认我，但 owner 认我**——两个机制独立 |
| 3 | 尝试写 | 被拒 | 基线：DACL 没我，我确实进不去 |
| 4 | 仅凭 owner 改 DACL | **成功** | **owner 隐式 `WRITE_DAC` 实锤**——无任何授权也能改规则 |
| 5 | grant `(W)` 后写 | 仍被拒；改 `(F)` 后通 | owner 能改规则，但**权限位给对才能真正操作**（呼应下一讲"权限位"）|

> 一句话收口：**owner 身份让你永远握着"改规则"的钥匙（哪怕规则把你关在门外）；但改完规则、给了对的权限位，你才真正进得去。** 这也是为什么本讲的标题叫「Owner」，而把"具体哪些权限位"留给下一讲——两件事要分开理解。
>
> 注意这里**没用到 `takeown`**——因为我本来就是 owner，用隐式的 owner 权利改 DACL 就够了。`takeown` 是给「owner 都不是你」的场景准备的，见测试二。

#### 测试二：owner 不是我，靠 takeown 夺权 + 再 grant

测试一里我始终是 owner，靠"owner 的隐式权利"就能改 DACL。那如果**我连 owner 都不是**呢？这正是真实运维里最常见的情况——前任员工建的文件，他人走了、账户删了，owner 成了失效 SID，DACL 里也没我。这时测试一那套（靠 owner 身份）行不通，得用 `takeown` 凭**特权**硬夺。

要演示这个场景，得先造一个"owner 是别人、ACL 也没有我"的文件。

**准备步：构造测试文件（owner=SYSTEM、ACL 只剩 SYSTEM）。**

难点在于：我用自己身份建文件，owner 就是我自己——测不出"owner 不是我"。解决办法是**借 `SYSTEM` 身份建文件**：SYSTEM 建的文件 owner 是 `NT AUTHORITY\SYSTEM`，正好"不是我"。普通账户没法直接切到 SYSTEM，最简单的办法是用**计划任务**（Task Scheduler）——把任务主体设成 SYSTEM，让计划任务以 SYSTEM 身份去执行建文件、改 ACL 的命令。

下面这段**是测试道具的搭法，理解思路即可，不必逐行背**。它做两件事：① 注册一个以 SYSTEM 身份运行的计划任务，让它 `echo ... > systemonly.txt` 建文件；② 再注册一个 SYSTEM 任务，让它 `icacls ... /inheritance:r /grant:r SYSTEM:(F)` 把这个文件清成只剩 SYSTEM（这两个开关和测试一第 2 步一模一样）。每个任务跑完立刻删掉。

```powershell
PS> $f = "$HOME\owner_sandbox\systemonly.txt"
PS> $p = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount
# 第一个 SYSTEM 任务：建文件
PS> $a1 = New-ScheduledTaskAction -Execute cmd.exe -Argument "/c echo system-only-content > `"$f`""
PS> Register-ScheduledTask -TaskName owner_test1 -Action $a1 -Principal $p -Force | Out-Null
PS> Start-ScheduledTask -TaskName owner_test1; Sleep 1; Unregister-ScheduledTask -TaskName owner_test1 -Confirm:$false
# 第二个 SYSTEM 任务：清成只剩 SYSTEM
PS> $a2 = New-ScheduledTaskAction -Execute icacls.exe -Argument "`"$f`" /inheritance:r /grant:r SYSTEM:(F)"
PS> Register-ScheduledTask -TaskName owner_test2 -Action $a2 -Principal $p -Force | Out-Null
PS> Start-ScheduledTask -TaskName owner_test2; Sleep 1; Unregister-ScheduledTask -TaskName owner_test2 -Confirm:$false
```

> 这一步**需要管理员权限**（注册/运行 SYSTEM 计划任务要管理员），且依赖 Task Scheduler 服务（默认开启）。建完后查一下，确认道具就位：

```powershell
PS> (Get-Acl C:\Users\chengongyi\owner_sandbox\systemonly.txt).Owner
NT AUTHORITY\SYSTEM
PS> icacls C:\Users\chengongyi\owner_sandbox\systemonly.txt
C:\Users\chengongyi\owner_sandbox\systemonly.txt: 拒绝访问。
已成功处理 0 个文件; 处理 1 个文件时失败
PS> (Get-Acl C:\Users\chengongyi\owner_sandbox\systemonly.txt).Access
NT AUTHORITY\SYSTEM Allow  FullControl
```

owner 确实是 `NT AUTHORITY\SYSTEM`。但注意 `icacls` **直接拒绝访问**了——读不到 ACL。原因：读一个文件的 ACL（安全描述符）需要 `READ_CONTROL` 权限，而你现在既不是这个文件的 owner、DACL 里也没有你，所以 `icacls` 读不了。那 ACL 到底剩什么？换 `Get-Acl` 看（它能读，原因见下面那个框）：只剩 `NT AUTHORITY\SYSTEM Allow FullControl` 一条——**关于我的条目一条都没有**。测试道具就绪：一个"跟我毫无关系"的文件。

> 🤔 **为什么 `icacls` 拒绝、`Get-Acl` 却读得到？** 同一个文件，`icacls` 读不了 ACL、`(Get-Acl).Access` 却读得出，看着矛盾。真机实测对照：用 `CreateFile` **普通方式**打开这个文件 → 返回句柄 -1、Win32 error 5（拒绝访问）；**加 `FILE_FLAG_BACKUP_SEMANTICS`** 打开 → 拿到有效句柄、能读出内容 `system-only-content`。差别在当前这个**提权 token** 里 `SeBackupPrivilege`（备份权限）是启用的——这条特权能绕过 DACL 读对象，**但只有程序主动用 backup 语义开文件时才生效**。.NET 的 `Get-Acl` 读安全描述符时能吃到这条特权，于是"看穿"了 DACL；而 `icacls`、`Get-Content` 用普通方式开文件，DACL 照拦不误。一句话：**`SeBackupPrivilege` 是把"管你 DACL 写啥我都能读"的钥匙，得程序主动去拧。** 这也预告了下面第 A 步——你连文件内容都读不出来，因为读内容同样得过 DACL。

**第 A 步：先确认我读不了（建立基线）。**

跟测试一第 3 步一样，先证明"我被关在门外"，后面"夺权"才有意义。用 `Get-Content <文件>` 读内容：

```powershell
PS> Get-Content C:\Users\chengongyi\owner_sandbox\systemonly.txt
Get-Content : 对路径“C:\Users\chengongyi\owner_sandbox\systemonly.txt”的访问被拒绝。
```

读被拒。owner 不是我、DACL 没我，按"谁都没命中就默认拒绝"，我被挡了。

**第 B 步：`takeown` 夺权——靠特权，不靠文件权限。**

现在我在这文件上**既不是 owner、DACL 也不认我**，普通操作全无解。唯一能动的依据是 **`SeTakeOwnershipPrivilege`** 这条特权（上一节讲过，默认授 Administrators 组、绕过 DACL）。这一步就是验证"特权能让我在毫无文件权限的情况下改 owner"。

用的命令是 `takeown /f <文件>`：

- `/f <文件>` —— 指定要夺哪个文件（f = file）。它会把 owner 改成**当前登录用户**（你要交给 Administrators 组就加 `/a`）。

```powershell
PS> takeown /f C:\Users\chengongyi\owner_sandbox\systemonly.txt

成功: 此文件(或文件夹): "C:\Users\chengongyi\owner_sandbox\systemonly.txt" 现在由用户 "JZFZ\chengongyi" 所有。
PS> (Get-Acl C:\Users\chengongyi\owner_sandbox\systemonly.txt).Owner
JZFZ\chengongyi
```

owner 从 `NT AUTHORITY\SYSTEM` 变成了 `JZFZ\chengongyi`，还附带 takeown 那句中文成功提示。**这条能成功，凭的就是 `SeTakeOwnershipPrivilege`**——我在该文件的 DACL 上没有任何权限，特权却让我绕过它直接改了 owner。这是测试二的第一条实证：**夺 owner 靠特权，不靠文件权限。**

**第 C 步：夺了 owner，但 DACL 仍没我——再读，还是被拒。**

很多人以为"夺了 owner 就能用了"。验证一下到底能不能——这才是 takeown 最容易让人栽跟头的地方。再 `Get-Content` 一次：

```powershell
PS> Get-Content C:\Users\chengongyi\owner_sandbox\systemonly.txt
Get-Content : 对路径“C:\Users\chengongyi\owner_sandbox\systemonly.txt”的访问被拒绝。
```

**owner 已经是我了，却照样读不了**。因为 `takeown` 只改了 owner，**没动 DACL**，DACL 里依然只有 SYSTEM、没有我。这是测试二的第二条实证：**夺 owner ≠ 有数据权限**。读不读得了，看的还是 DACL，不是 owner。

**第 D 步：凭夺到的 owner 身份（隐式 `WRITE_DAC`），给自己 grant 读权限，终于读到。**

现在我是 owner 了（第 B 步夺来的），按测试一证过的"owner 隐式 `WRITE_DAC`"，我应该能改这个文件的 DACL——给自己加个读权限。这一步把测试一和测试二串起来：**特权夺来 owner（测试二 B）→ owner 身份带来改 DACL 的能力（测试一已证）→ 改 DACL 给自己授权 → 才真正读得到**。

用的是测试一第 4 步见过的 `/grant`（追加授权），这次给读权限 `(R)`：

```powershell
PS> icacls C:\Users\chengongyi\owner_sandbox\systemonly.txt /grant 'jzfz\chengongyi:(R)'
已处理的文件: C:\Users\chengongyi\owner_sandbox\systemonly.txt
已成功处理 1 个文件; 处理 0 个文件时失败

PS> Get-Content C:\Users\chengongyi\owner_sandbox\systemonly.txt
system-only-content
```

grant 成功，再读——**读到内容了**（`system-only-content`）。这条 `/grant` 能成功，正是第 B 步夺到 owner 后、隐式 `WRITE_DAC` 在手；否则我在这个 ACL 上没写权限，改不了它。

#### 小结：夺回失控文件的完整链路

把测试二的四步串起来，就是「前任员工离职、文件 owner 失效、DACL 没你」这类真实场景的标准解法：

```text
A 读不了（owner 不是我、DACL 也没我）
   │  takeown /f   ← 凭 SeTakeOwnershipPrivilege 夺 owner（特权，绕过 DACL）
   ▼
B owner 变成我
   │  Get-Content  ← 再读
   ▼
C 仍读不了（owner 是我了，但 takeown 没动 DACL，DACL 还没我）
   │  icacls /grant  ← 凭夺到 owner 后的隐式 WRITE_DAC，给自己授权
   ▼
D 读到了 ✅
```

一句话：**「takeown 改 owner + icacls 改权限」是夺回失控文件的标准两连击，缺一不可**。`takeown` 管的是「这文件算谁的」（owner），`icacls /grant` 管的是「我能对它做什么」（DACL）——两件事，Owner 这一讲的核心就是讲清它俩的区别。

### C#：读 / 改 Owner

```csharp
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

var file = new FileInfo(@"Z:\Test\1.txt");
FileSecurity security = file.GetAccessControl();

// 读 owner：GetOwner(typeof(NTAccount)) 返回 IdentityReference，可继续 Translate 成 SID
IdentityReference owner = security.GetOwner(typeof(NTAccount))!;
Console.WriteLine(owner);                                            // JZFZ\chengongyi
Console.WriteLine(owner.Translate(typeof(SecurityIdentifier)));     // S-1-5-21-...-279405

// 改 owner：把 owner 改成别人
security.SetOwner(new NTAccount(@"JZFZ\someone"));
file.SetAccessControl(security);
```

上面 `GetOwner` 那两行的输出，和真机 `(Get-Acl 'Z:\Test\1.txt').Owner` 看到的完全一致——`1.txt` 的 owner 就是 `JZFZ\chengongyi`。注意 C# 里 `GetOwner(typeof(NTAccount))` 返回的是 `IdentityReference`（不是 PowerShell 那个字符串），所以能直接 `.Translate`，不用强转。

（现代 .NET 经 `FileSystemAclExtensions` 的 `GetAccessControl` / `SetAccessControl`。）
来源：[FileSystemAclExtensions](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.setaccesscontrol)

一个**几乎人人会踩的坑**：上面这段 `SetOwner` 真去跑（改一个 owner 不是你的文件），很可能直接抛 `UnauthorizedAccessException`。为什么？因为**改 owner（`WRITE_OWNER`）需要要么你是该对象的 owner、要么持有 `SeTakeOwnershipPrivilege`**。要成功改「别人」对象的 owner，代码里得先 `AdjustTokenPrivileges` 启用 `SeTakeOwnershipPrivilege`（且你的账户得被授予了它）——这正好印证了「靠特权不靠文件权限」。自己只是 owner 的情况下，改自己对象的 owner（转交给别人）则不需要特权，隐式的 owner 权利就够。这条和命令行的 `takeown` 是同一个道理：能成，靠的都是那条特权。

### 常见误区：Owner 就等于「完全控制」吗？

**不等于。** 这是最容易混的一个点，拎清楚：

| | 含义 | 能干嘛 |
|---|---|---|
| **Owner（主人）** | 「这文件算谁的」 | 隐式能 **改 DACL**（`WRITE_DAC`）、读安全描述符（`READ_CONTROL`）；**不自动拥有读/写/删等数据权限** |
| **完全控制（Full Control / `F`）** | DACL 里授的一组**权限位** | 读、写、删、**改权限（含改 owner）**——所有权限位全开 |

两个关键区分：

1. **Owner 不自带数据权限。** 你是新 owner，但 DACL 里没给你读权限——你**读不了文件内容**，只是能**改 DACL 给自己加上读权限**。这就是为什么 `takeown` 之后还得 `icacls /grant`。
2. **「完全控制」倒是能改 owner**（因为它含 `WRITE_OWNER` 位）。所以「谁能改 owner」有两条路：① 你是 owner（隐式）；② DACL 授了你 `WRITE_OWNER` 或完全控制。

> 🔑 **记法**：Owner = **能改规则**的钥匙；完全控制 = **规则全开**的通行证。前者让你能去「改规则把自己放进去」，后者是「规则本来就让你进」。`takeown` 拿到的是前者，所以还得自己再 `grant` 一下。

### 收束

**你现在会了：**

- **Owner 是什么**——对象安全描述符里「主人」这个字段（最终是 SID）；默认从**当前 token 的默认 Owner**抄来。理论上管理员组的 token 默认 Owner 是 Administrators 组，但**真机实测常常落到个人**（取决于 token 成色与本机策略），别背口诀、建文件查一下最准。
- **Owner 的灵魂**——主人**隐式拥有 `WRITE_DAC` + `READ_CONTROL`**，**永远能改自己对象的权限表、即便 DACL 拒绝了你**；这是防止「被自己的文件锁死」的安全阀（Server 2008 起有「Owner Rights」可封印）。
- **怎么夺回失控对象**——`takeown` 改 owner，凭的是特权 **`SeTakeOwnershipPrivilege`**（默认授 Administrators 组、绕过 DACL）；夺完 owner **还得 `icacls /grant`** 给自己授权，因为 owner 不自带数据权限。
- **常见误区**——Owner ≠ 完全控制；Owner 给的是「改规则的钥匙」，不是「规则全开的通行证」。
- 代码里 `GetOwner` / `SetOwner`；改别人对象的 owner 需先启用 `SeTakeOwnershipPrivilege`。

**下一讲才需要：** 主人之外，如何表达「同事能读不能改」——把「能做什么」拆成可勾选的**权限位**。

---

<!-- chapter-nav:start -->
← 上一章：[第 5 讲：Access Token](./06-access-token.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 7 讲：权限位](./08-permission-bits.md)
<!-- chapter-nav:end -->
