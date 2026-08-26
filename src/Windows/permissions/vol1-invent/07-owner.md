---
title: "第 6 讲：Owner——对象上的主人字段"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 6 讲：Owner"
order: 7
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：Owner 的灵魂是「隐式 WRITE_DAC——主人永远能改自己对象的权限表，哪怕那张表拒绝了你」。两组五步/四步实验本机全重跑：DACL 只剩 SYSTEM 时仅凭 owner 身份改表；owner 不是你时 takeown 凭特权夺权 + grant 授权的两连击。
---

# 第 6 讲：Owner——对象上的主人字段

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)，本讲实测全部重跑于 2026-08-26。

---

## 开场

**🧑‍🏫 老师：**

上一讲令牌解决了「操作者是谁」。这一讲问对象那一侧的第一个问题：每个文件还要回答「这算谁的」。

更麻烦的是——**你自己的文件，会不会反过来把你锁在外面？** 你手滑把某个文件夹的权限表改成了「谁都不许读」，结果连你自己也打不开了。如果没有补救机制，这文件就成了永久死局。

Windows 给的补救就藏在本讲这个字段里。可保护对象带有一份安全信息（**安全描述符**，第 11 讲主角），其中有个 **Owner（所有者）** 字段，记录主人对应的 SID。直觉上：创建文件时把创建者记为 Owner；「谁能读谁能写」的细规则是后面的 DACL。但「主人」到底比普通用户多什么？这正是 Owner 真正值钱的地方——**它不是摆设，是带特权的**。

---

## 第 1 课：Owner 的灵魂——主人总能改自己对象的权限表

**🧑‍🏫 老师：**

先记住一句反直觉的话：

> **对象的主人，永远能在自己对象上读、改权限表（DACL）——哪怕那张表上明确拒绝了你。**

官方原文（[Owner of a New Object](https://learn.microsoft.com/en-us/windows/win32/secauthz/owner-of-a-new-object)）写得很直白：

> An object's owner implicitly has WRITE_DAC access to the object. This means that the owner can modify the object's discretionary access control list (DACL).

`WRITE_DAC` 是「改权限表」的权限位。此外 owner 还隐式拿到 `READ_CONTROL`（读安全描述符）。**这两项是「隐式」给 owner 的——不走 DACL 比对**，所以哪怕你把 DACL 改成「连我自己都 Deny」，owner 这两项仍然在。

**🧑‍🎓 学生：** 为什么这么设计？

**🧑‍🏫 老师：**

就是开场那个麻烦的答案：**保证你永远不会被自己的文件反锁在外**——手滑锁出去，owner 身份还在、`WRITE_DAC` 隐式在手，你能改回 DACL 把自己放进去。

一个细节：这个默认行为从远古延续至今，但 Server 2008 起引入了 **Owner Rights** 特殊主体，可以**限制** owner 的隐式权限（封印开关）。日常 99% 场景用不到，知道存在即可。

---

## 第 2 课：默认 Owner 从哪来——token 里早埋好了

**🧑‍🏫 老师：**

那「主人」最初怎么定？接上一讲的伏笔——primary token 里有一项「默认 Owner」字段：**你新建文件时，它的 Owner 默认就是当前进程 token 里的这个字段**（`GetTokenInformation(TokenOwner)` 可查）。这个默认值是谁，有常见情况、但**别当铁律**：

- **常见情况**：完整 admin token（「以管理员身份运行」开出来的）默认 Owner 常是 **Administrators 组**——设计意图是组里任何管理员都能凭 owner 身份改 DACL，不绑死某个人；
- **但以实查为准**：我当前会话是提权状态（Administrators 在组里且是「组的所有者」），可 `whoami /groups` 是一回事、token 默认 owner 是另一回事——本机实测见下面测试一第 1 步：**新建文件的 owner 落到个人 `JZFZ\chengongyi`，不是组**。别假设「我登的是管理员，owner 一定是组」——建个文件查一下最准。

> 🔑 **一句话**：owner 不是文件自己「想」出来的，是**从你登录铸好的 token 里抄来的**——「这个文件算谁的」，早在登录那一刻就定了大半。

---

## 插问 1：怎么看见 owner？

**🧑‍🎓 学生：** 命令行里怎么看这个字段？

**🧑‍🏫 老师：**

`icacls` 默认列的是 DACL 里的 ACE，**不显示 owner 行**。看 owner 用 `Get-Acl` 最干脆：

```powershell
PS> (Get-Acl C:\Lab\public.txt).Owner
JZFZ\chengongyi
```

要连 SID 一起（用于代码比对），把名字 Translate 成 SecurityIdentifier：

```powershell
PS> ([Security.Principal.NTAccount]$o).Translate(
      [Security.Principal.SecurityIdentifier]).Value
S-1-5-21-3977539503-3587586693-2971573549-279405
```

（注意 `(Get-Acl ...).Owner` 返回**字符串**，得先强转回 `NTAccount` 再 Translate。GUI 看全：属性 → 安全 → 高级 → 所有者。）

---

## 第 3 课：实验一——DACL 里彻底没我，仅凭 owner 能改表吗

**🧑‍🏫 老师：**

「Owner 的灵魂」那句要实证。思路：**先把 ACL 里关于我的条目全清掉、继承也关掉，让 DACL 只剩 SYSTEM——这时我唯一的凭据就是 owner 身份**。若这种情况下还能改 DACL，就纯粹是 owner 的功劳。本机实测（沙盒 `C:\Lab\ownertest\`）：

**第 1 步：建文件，看出厂状态。**

```powershell
PS> New-Item C:\Lab\ownertest\pure_owner.txt -Value 'pure owner test' -Force
PS> (Get-Acl C:\Lab\ownertest\pure_owner.txt).Owner
JZFZ\chengongyi                       ← owner 是我（个人，不是组——「以实查为准」）
PS> icacls C:\Lab\ownertest\pure_owner.txt
C:\Lab\ownertest\pure_owner.txt BUILTIN\Administrators:(I)(F)
                                NT AUTHORITY\SYSTEM:(I)(F)
                                BUILTIN\Users:(I)(RX)
                                NT AUTHORITY\Authenticated Users:(I)(M)
```

每行 `(I)` = inherited（继承自父目录）。注意这四条里**没有一条显式写我**——我能动它靠的是 Administrators 组那条（我在组里）。这条组授权就是要清掉的干扰：留着它，后面能改 DACL 就说不清靠谁。

**第 2 步：清空 ACL——关继承、只留 SYSTEM。**

```powershell
PS> icacls C:\Lab\ownertest\pure_owner.txt /inheritance:r /grant:r 'SYSTEM:(F)'
processed file: C:\Lab\ownertest\pure_owner.txt
PS> icacls C:\Lab\ownertest\pure_owner.txt
C:\Lab\ownertest\pure_owner.txt NT AUTHORITY\SYSTEM:(F)     ← 只剩这一条
PS> (Get-Acl C:\Lab\ownertest\pure_owner.txt).Owner
JZFZ\chengongyi                       ← owner 仍是我
```

两个 `r` 意思不同：`/inheritance:r` 的 r = remove（关继承并**丢弃**继承项）；`/grant:r` 的 r = replace（ACL **重置**成只含指定条目）。执行完：**DACL 不认我，owner 认我**——两个机制独立。

**第 3 步：基线——确认我现在确实写不了。**

```powershell
PS> Set-Content C:\Lab\ownertest\pure_owner.txt -Value 'try'
Set-Content : 对路径"C:\Lab\ownertest\pure_owner.txt"的访问被拒绝。
```

DACL 里没有我，按「谁都没命中就默认拒绝」，被挡。符合预期。

**第 4 步：判决时刻——仅凭 owner 改 DACL。**

```powershell
PS> icacls C:\Lab\ownertest\pure_owner.txt /grant 'jzfz\chengongyi:(W)'
processed file: C:\Lab\ownertest\pure_owner.txt        ← 成功！
```

（这里的 `/grant` 不带 `:r`，是**追加**一条授权，SYSTEM 条目保留。）我在这个文件上没有任何授权，却改动了它的 DACL——能成功的唯一解释，就是 owner 身份自带的隐式 `WRITE_DAC`。**实锤。**

**第 5 步：改完 DACL，真的能写了吗？——一个意外的真实发现。**

```powershell
PS> Set-Content C:\Lab\ownertest\pure_owner.txt -Value 'recovered'
Set-Content : 对路径"…"的访问被拒绝。      ← ACL 明明已经有我:(W) 了！
```

**居然还被拒**。这不是出错，是个真实细节：`Set-Content` 写文件前要以**读写模式打开**文件，光有「写数据」权限 `(W)` 不够，还得能读/打开。补成完全控制再试：

```powershell
PS> icacls … /grant 'jzfz\chengongyi:(F)'
PS> Set-Content … -Value 'recovered'; Get-Content …
recovered                                    ← 通了
```

五步对账：

| 步 | 动作 | 真实结果 | 证明了什么 |
|---|---|---|---|
| 1 | 建文件 | owner=我；ACL 全是继承项 | 出厂状态；找到要清的干扰 |
| 2 | 清空只留 SYSTEM | ACL 剩 SYSTEM；owner 仍是我 | **DACL 不认我，owner 认我** |
| 3 | 尝试写 | 被拒 | 基线：我确实进不去 |
| 4 | 仅凭 owner 改 DACL | **成功** | **owner 隐式 `WRITE_DAC` 实锤** |
| 5 | grant W 后写 / grant F 后写 | W 仍拒、F 通 | owner 能改**规则**，但**权限位给对才能真正操作**（下一讲的钩子） |

> 一句话收口：**owner 身份让你永远握着「改规则」的钥匙；但改完规则、给对权限位，你才真正进得去。** 注意这里没用到 `takeown`——我本来就是 owner。`takeown` 是「owner 都不是你」的场景准备的，见实验二。

---

## 第 4 课：takeown 凭什么夺别人的东西——靠特权，不靠文件权限

**🧑‍🏫 老师：**

自然的问题：`takeown` 凭什么能把**别人**文件的 owner 改成自己？你在那文件上没有「改 owner」的权限（`WRITE_OWNER`）。

答案是**特权（privilege）**——比 DACL 更高、由系统策略授予的全局权利：**`SeTakeOwnershipPrivilege`（取得文件或其它对象的所有权）**。官方：默认 **Administrators 组**被授予这条用户权利。三个关键点：

- **它是特权，绕过 DACL**——让持有者对几乎任何对象执行「取得所有权」，**不需要 DACL 里被授予 `WRITE_OWNER`**。特权不走「令牌 SID 命中 DACL」那套比对；
- **默认在 token 里是 disabled**——`takeown` 内部帮你 enable → 夺取；自己写代码得记得 `AdjustTokenPrivileges` 打开；
- 类似的还有 **`SeRestorePrivilege`**（恢复），也能改 owner 且限制更少。

> 🔒 这也是 `SeTakeOwnershipPrivilege` 是**提权常见跳板**的原因：拿到带这条特权的进程，enable 后能夺走系统敏感文件的 owner 换成自己的后门。别随便把它授给普通账户（卷三「用户权利」专讲特权）。

`takeown` 参数表：

| 参数 | 作用 |
|------|------|
| `/f <名称>` | 指定文件/目录（支持通配） |
| `/a` | owner 交给 **Administrators 组**而非当前用户 |
| `/r` | **递归**整个目录树 |
| `/d {Y\|N}` | 配合 `/r`：无「列出文件夹」权限时的默认答复 |

官方特意提醒：**夺回 owner 后往往还得再给自己授访问权限才能真正读/删**——`takeown` 只改 owner 没改 DACL。下一节实证。

---

## 第 5 课：实验二——owner 不是你：takeown 夺权 + grant 授权两连击

**🧑‍🏫 老师：**

真实运维最常见的场景：前任员工建的文件，人走了账户删了，owner 成了失效 SID，DACL 里也没你。要演示它，得先造一个「owner 是别人、ACL 也没有我」的文件——我用自己身份建文件 owner 就是我自己，测不出。办法：**借 SYSTEM 身份建文件**（SYSTEM 建的 owner 是 `NT AUTHORITY\SYSTEM`）。普通账户没法直接切 SYSTEM，最简单的通道是**计划任务**：把任务主体设成 SYSTEM，让它替我们建文件、清 ACL（注册 SYSTEM 计划任务需要管理员，依赖 Task Scheduler 服务）：

```powershell
$p = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount
# 任务1：SYSTEM 身份建文件
$a1 = New-ScheduledTaskAction -Execute cmd.exe -Argument "/c echo system-only-content > C:\Lab\ownertest\systemonly.txt"
Register-ScheduledTask -TaskName own_t1 -Action $a1 -Principal $p -Force
Start-ScheduledTask -TaskName own_t1; Sleep 2; Unregister-ScheduledTask -TaskName own_t1 -Confirm:$false
# 任务2：SYSTEM 身份清成只剩 SYSTEM
$a2 = New-ScheduledTaskAction -Execute icacls.exe -Argument "… /inheritance:r /grant:r SYSTEM:(F)"
（同上三连）
```

**准备步核对**（本机实测）：

```text
owner: NT AUTHORITY\SYSTEM            ← owner 确实不是我了
icacls : Access is denied.            ← 连 ACL 都读不了（读 ACL 要 READ_CONTROL）
Get-Acl access: NT AUTHORITY\SYSTEM Allow FullControl   ← 只剩这一条，没有我
```

> 🤔 **为什么 icacls 被拒、Get-Acl 却读得到？** 同一文件看似矛盾。真机对照：普通方式打开文件 → 句柄无效、error 5；加 `FILE_FLAG_BACKUP_SEMANTICS` 打开 → 读出内容。差别在当前提权 token 里 **`SeBackupPrivilege`（备份）** 是启用的——这条特权能绕过 DACL 读对象，**但只有程序主动用 backup 语义开文件时才生效**。.NET 的 `Get-Acl` 吃到了它，`icacls`/`Get-Content` 用普通方式开文件、DACL 照拦。一句话：**`SeBackupPrivilege` 是把「管你 DACL 写啥我都能读」的钥匙，得程序主动去拧**——特权又露了一脸。

**第 A 步：基线——我读不了。**

```powershell
PS> Get-Content C:\Lab\ownertest\systemonly.txt
Get-Content : 对路径"…"的访问被拒绝。
```

**第 B 步：takeown 夺权——凭特权。**

```powershell
PS> takeown /f C:\Lab\ownertest\systemonly.txt
成功: 此文件(或文件夹): "…" 现在由用户 "JZFZ\chengongyi" 所有。
PS> (Get-Acl …).Owner
JZFZ\chengongyi                       ← owner 从 SYSTEM 换成了我
```

DACL 上我没有任何权限，特权让我绕过它直接改了 owner——**夺 owner 靠特权，不靠文件权限**。

**第 C 步：夺了 owner，再读——还是被拒。**

```powershell
PS> Get-Content C:\Lab\ownertest\systemonly.txt
Get-Content : 对路径"…"的访问被拒绝。      ← owner 是我了，照样读不了！
```

因为 `takeown` 只改 owner、**没动 DACL**，DACL 里依然只有 SYSTEM。**夺 owner ≠ 有数据权限**——takeown 最容易让人栽跟头的地方。

**第 D 步：凭夺到的 owner（隐式 `WRITE_DAC`），给自己授权，终于读到。**

```powershell
PS> icacls C:\Lab\ownertest\systemonly.txt /grant 'jzfz\chengongyi:(R)'
PS> Get-Content C:\Lab\ownertest\systemonly.txt
system-only-content                   ← 读到了
```

四步串成夺回失控文件的标准链路：

```text
A 读不了（owner 不是我、DACL 也没我）
   │ takeown /f    ← 凭 SeTakeOwnershipPrivilege 夺 owner（特权，绕过 DACL）
   ▼
B owner 变成我
   │ Get-Content   ← 再读
   ▼
C 仍读不了（takeown 没动 DACL）
   │ icacls /grant ← 凭夺到 owner 后的隐式 WRITE_DAC，给自己授权
   ▼
D 读到了 ✅
```

> **`takeown` 改 owner + `icacls` 改权限 = 夺回失控文件的标准两连击，缺一不可。** takeown 管「这文件算谁的」，icacls /grant 管「我能对它做什么」——两件事。

---

## 插问 2：C# 里怎么读 / 改 Owner？

**🧑‍🎓 学生：** 代码里操作 owner 怎么写？

**🧑‍🏫 老师：**

```csharp
var file = new FileInfo(@"C:\Lab\public.txt");
FileSecurity security = file.GetAccessControl();

IdentityReference owner = security.GetOwner(typeof(NTAccount))!;
Console.WriteLine(owner);                                        // JZFZ\chengongyi
Console.WriteLine(owner.Translate(typeof(SecurityIdentifier))); // S-1-5-21-...-279405

security.SetOwner(new NTAccount(@"JZFZ\someone"));   // 改 owner 成别人
file.SetAccessControl(security);
```

一个**几乎人人会踩的坑**：这段 `SetOwner` 去改一个「owner 不是你的文件」，很可能直接抛 `UnauthorizedAccessException`——因为**改 owner（`WRITE_OWNER`）需要要么你是该对象 owner、要么持有 `SeTakeOwnershipPrivilege`**。改「别人」对象的 owner，代码里得先 `AdjustTokenPrivileges` 启用那条特权。自己只是 owner 时把 owner 转交别人，隐式的 owner 权利就够。和 `takeown` 同一个道理。

---

## 第 6 课：常见误区——Owner 就等于「完全控制」吗？

**🧑‍🏫 老师：**

**不等于**，这是最容易混的点：

| | 含义 | 能干嘛 |
|---|---|---|
| **Owner（主人）** | 「这文件算谁的」 | 隐式能**改 DACL**（`WRITE_DAC`）、读安全描述符；**不自动拥有读/写/删等数据权限** |
| **完全控制（Full Control / `F`）** | DACL 里授的一组**权限位** | 读、写、删、改权限、改 owner——全开 |

两个关键区分：① **Owner 不自带数据权限**——新 owner 但 DACL 没给你读权限，你读不了内容，只是能改 DACL 给自己加上（实验二 C→D 步就是它）；② **「完全控制」倒是能改 owner**（含 `WRITE_OWNER` 位）——所以「谁能改 owner」有两条路：你是 owner（隐式），或 DACL 授了你 `WRITE_OWNER`/完全控制。

> 🔑 **记法**：Owner = **能改规则**的钥匙；完全控制 = **规则全开**的通行证。`takeown` 拿到的是前者，所以还得自己再 grant。

---

## 收束

**你现在会了：**

- **Owner 是什么**——安全描述符里「主人」字段（SID）；默认从**当前 token 的默认 Owner** 抄来（本机实测落到个人而非组——以实查为准）。
- **Owner 的灵魂**——隐式 `WRITE_DAC` + `READ_CONTROL`，永远能改自己对象的权限表（实验一第 4 步实锤）；Server 2008 起有 Owner Rights 可封印。
- **夺回失控对象**——`takeown` 改 owner 凭 `SeTakeOwnershipPrivilege`（默认授 Administrators、绕过 DACL、token 里默认禁用）；夺完还得 `icacls /grant`（实验二 A→D 全链）。
- **误区**——Owner ≠ 完全控制；改规则的钥匙 ≠ 规则全开的通行证。
- 代码 `GetOwner`/`SetOwner`；改别人对象的 owner 先启用特权。

**下一讲才需要：** 主人之外，如何表达「同事能读不能改」——把「能做什么」拆成可勾选的**权限位**。

---

<!-- chapter-nav:start -->
← 上一章：[第 5 讲：Access Token](./06-access-token.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 7 讲：权限位](./08-permission-bits.md)
<!-- chapter-nav:end -->
