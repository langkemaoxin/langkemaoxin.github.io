---
title: "第 5 讲：Access Token——登录成功后的通行证"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 5 讲：Access Token"
order: 6
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：令牌怎么铸（认证给 SID、本机策略给特权、LSA 打包）、怎么看见（whoami /all）、怎么换新（runas/LogonUser）；「重启网卡刷新权限」的四道关辟谣全程实拍（三问三台 DC）；C# 模拟三连版，身份切换 inside/outside 当场演示。
---

# 第 5 讲：Access Token——登录成功后的通行证

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。官方锚点：[Understand security principals - Access tokens](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)。

---

## 开场

**🧑‍🏫 老师：**

上一讲的结尾，登录验对之后系统「发了一个 access token」。这一讲的主角就是它。先看麻烦：不能每打开一个程序就再输一次密码——系统需要一份「本次登录有效的身份摘要」，挂在你的进程上。

微软的定义直白：

> An access token is a protected object that contains information about the identity and user rights that are associated with a user account.
> （访问令牌是一个**受保护对象**，装着与某个用户账户关联的「身份 + 用户权利」。）

「**受保护对象**」是关键词——令牌本身是个内核对象，进程没法随便改写它。它就是登录成功后系统发给你进程的「身份证 + 权限清单」。

---

## 第 1 课：令牌是怎么铸出来的

**🧑‍🏫 老师：**

按官方流程，一次交互式登录背后：

1. **输密码**——winlogon 收集凭据，交给 LSA（上一讲的事）；
2. **认证**——LSA 调认证包核对凭据（本地账户走 MSV1_0，域账户走 Kerberos）；
3. **返回 SID**——认证成功，返回**用户 SID** 和**组 SID 列表**（外加一个标识本次登录会话的 logon SID）；
4. **LSA 打包成 primary token**——LSA 拿这些 SID，再去**本机安全策略**里查出授予该用户/组的**用户权利（privileges）**，一起打包造出**主访问令牌**。

两个容易被忽略、却决定令牌长相的细节：

- **SID 来自认证，但 privileges 来自本机策略。** 域账户登录后能不能关机、能不能备份文件，不是域控说了算，是**你这台机器**的安全策略授予的——同一个域账户换台机器登，特权可能不一样。
- **每次登录都新造一个。** 同一个账户早上、下午各登一次，拿到的是两个不同的令牌——你中午被管理员加进某个组，得**重新登录**，新令牌才带上那个组 SID（这是本讲后半「四道关」的伏笔）。

主令牌里至少装：用户 **SID**（你是谁）、**组 SID 列表**（你在哪些组）、**privileges**（能做哪些系统级动作）、**Owner / Primary Group / 默认 DACL**（第 6 讲细说）、**Logon SID**（本次登录会话的编号，注销即作废）。

**🧑‍🎓 学生：** 令牌造好之后，是怎么跟我的程序发生关系的？

**🧑‍🏫 老师：**

最后一步是「拷贝」：**LSA 造好主令牌后，它的一份拷贝被挂到「代你执行」的每一个进程和线程上。** 关键词是拷贝——不是所有进程共享同一个令牌对象，而是各拿一份副本。所以你单独给某个进程提权（UAC「以管理员身份运行」）或降权，不影响别的进程的令牌。

### 一张图：令牌怎么被拿去比对资源

官方的「授权与访问控制流程」图（[出处](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)）：

![Windows 授权与访问控制流程](/img/posts/windows-permission/authorization-and-access-control-process.png)

从左到右读，三件事：

1. **左边是「主体」——一个进程**，身上挂着 access token。进程想访问对象，不是凭进程名，是凭它挂着的令牌；
2. **右边是「对象」——一个受保护资源**，身上挂着**安全描述符**，里面有一张 **DACL**，登记「哪些 SID 被允许 / 被拒绝」；
3. **中间是「比对」——SRM 把两边对一对**：令牌里某个 SID 在 DACL 里命中**允许**项 → 放行；命中**拒绝**项 → 拒绝（拒绝优先）；谁都没命中 → 默认拒绝。

一句话：**左边发令牌，右边挂名单，中间对 SID。** 令牌里的 SID 是「钥匙串」，DACL 里的 ACE 是「锁芯清单」。后面几讲讲 Owner、DACL、ACE，就是展开这张图的右半边。

### 为什么叫「primary（主）」

Windows 有两种令牌：**primary token**——每个进程都有一个，代表「这个进程默认的安全上下文」；**impersonation token（模拟令牌）**——服务端场景，让某个**线程**临时「扮演」成客户端身份干活。本讲后半的实战会亲眼看到它。

---

## 插问 1：令牌怎么看见？

**🧑‍🎓 学生：** 你说了半天令牌挂在进程上——我在命令行里能看到它吗？

**🧑‍🏫 老师：**

`whoami /all` 打印的就是**当前进程令牌的内容**。本机实测节选：

```text
用户信息
----------------
用户名          SID
=============== ================================================
jzfz\chengongyi S-1-5-21-3977539503-3587586693-2971573549-279405

组信息
-----------------
组名                             类型           SID
Everyone                         Well-known group S-1-1-0
BUILTIN\Administrators           Alias           S-1-5-32-544   ← 组的所有者
BUILTIN\Users                    Alias           S-1-5-32-545
NT AUTHORITY\INTERACTIVE         Well-known group S-1-5-4      ← 坐在键盘前登录的证明
CONSOLE LOGON                    Well-known group S-1-2-1
NT AUTHORITY\Authenticated Users Well-known group S-1-5-11
LOCAL                            Well-known group S-1-2-0
JZFZ\CD-2013388_建筑             Group           S-1-5-21-...-24272   ← 域里的权限组
JZFZ\节点入库-正式                Group           S-1-5-21-...-472641
Mandatory Label\High Mandatory Level 标签        S-1-16-12288

特权信息
----------------------
SeShutdownPrivilege              关闭系统          已禁用
SeChangeNotifyPrivilege          跳过遍历检查      已启用
SeSecurityPrivilege              管理审核和安全日志 已禁用
```

三段对应令牌的三块内容：用户信息 = 用户 SID；组信息 = 组 SID 列表（一百多个，此处节选）；特权信息 = privileges——`Se*` 开头的那些。代码里用 `WindowsIdentity`：

```csharp
var id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.Name);               // jzfz\chengongyi
Console.WriteLine(id.User);               // 用户 SID
Console.WriteLine(id.ImpersonationLevel); // 普通进程是 None：用主令牌，没在模拟
Console.WriteLine(id.Token);              // 令牌句柄 hToken
```

---

## 第 2 课：不重新登录，怎么拿到「最新」令牌

**🧑‍🏫 老师：**

令牌是登录时一次性铸好的，**铸好之后 SID 列表就焊死了**。Win32 里**没有**「给现有令牌追加一个组 SID」的 API——`AdjustTokenGroups` 只能在已有组里启用/禁用，`AdjustTokenPrivileges` 只能开关已有特权，`CreateRestrictedToken` 只能做删减（[Access Tokens - Win32](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens)）。

所以要拿「最新」令牌，唯一的路是**再走一次登录、开一个新登录会话**，让 LSA 当场铸新的——但不用注销当前桌面。三种做法：

**① `runas` 用自己身份开个新进程**（最常用）：

```bat
runas /user:jzfz\chengongyi cmd
```

`runas` 拿你的凭据**重新认证一次**、开一个**新的登录会话**，LSA 当场铸全新 primary token 挂到这个 cmd 上——新组、新特权都在里面。注意三点：要**再输一次密码**（它是全新认证，不是拿旧令牌）；新进程是独立登录会话、默认加载用户配置文件；依赖 **Secondary Logon** 服务（默认开启）。

**② PowerShell 等价**：`Start-Process cmd -Credential jzfz\chengongyi`。

**③ 编程：`LogonUser` 造新令牌**（runas / Start-Process -Credential 的底层都是它）：

```csharp
Win32.LogonUser("chengongyi", "jzfz", password,
    LogonType.Interactive, LogonProvider.Default, out IntPtr hToken);
// hToken 就是刚铸造、带最新组与特权的 primary token
```

**⚠️ 一个常见误区：`klist purge` 不能刷新令牌。** `klist purge` 清的是 Kerberos 票据缓存，影响**访问网络服务时重新拿票据**，但**完全碰不到本地 access token**——你已有进程的组 SID 在令牌铸造时就定了。`klist purge` 治「票据过期/拿错了连不上服务」这类**网络认证**问题；「刚加的组没生效」是**本地令牌**问题，只能开新登录会话。

---

## 插问 2：「重启网卡刷新域控缓存」到底刷了什么？——四道关

**🧑‍🎓 学生：** 我们项目里有人写了段「禁用网卡 3 秒再启用」的代码，注释说「重启网络刷新域控缓存，解决加权限后要重启才生效」。这话对吗？

**🧑‍🏫 老师：**

一句话结论：**重启网卡不直接刷新 access token、也不清 Kerberos 票据——但它确实可能让权限生效**，不是因为它刷了令牌，而是它**间接促成了一次重新认证**。要把这事讲透，得先认识「管理员加完权限，为什么过段时间才生效」背后的四道关。

先认识两个词：**AD（Active Directory）**是整个域的中央数据库（数据）；**DC（域控制器）**是跑这个数据库的服务器（机器）。DC 干三件事：验证密码、签发 Kerberos 票据（此时叫 KDC）、存账户/组数据。一个域通常有**多台 DC**，每台存一份完整副本。

**怎么看你的机器连的是哪台 DC？三个命令，从快到全**——本机今天实测：

```text
PS> $env:LOGONSERVER          ← 本次登录实际验密码的 DC
\\JZFZDC5

PS> nltest /dsgetdc:jzfz      ← DC 定位（含 IP 和站点）
           DC: \\JZFZDC9
      Address: \\192.168.0.16
     Dom Name: JZFZ
  Forest Name: jzfz.local
 Dc Site Name: chengdu        ← 连到了本站点最近的 DC
Our Site Name: chengdu
        Flags: GC DS LDAP KDC TIMESERV WRITABLE ...

PS> nltest /sc_query:jzfz     ← 机器安全通道连的 DC（上一讲用过）
Trusted DC Name \\JZFZDC10.jzfz.local
```

**注意这个比「反直觉」还狠的现象：三问三台 DC**——登录验密码走 JZFZDC5、DC 定位找到 JZFZDC9、机器安全通道连着 JZFZDC10，**全不一样**。这正是多 DC 环境的常态：登录认证、DC 定位、机器通道各有各的缓存和选择，互不保证一致。排查「权限没生效」时要先分清问的是哪条连接。还想强制重新发现 DC：`nltest /dsgetdc:jzfz /force`——比重启网卡干净得多。

### 第 1 关：AD 复制延迟——你连的 DC 可能还没有这条变更

管理员通常在**某一台** DC 上把用户加进组，但你登录时连的可能是**另一台**——组信息要在两台之间复制才同步：

| 场景 | 默认延迟 |
| --- | --- |
| 同一站点内（站内复制） | **15 秒**（变更通知触发） |
| **跨站点**（不同机房/城市） | **180 分钟（3 小时）**，可调最低 15 分钟 |
| 跨站点但开了变更通知 | 近乎实时 |

典型场景：管理员在 A 机房 DC 加了权限，你在 B 机房——默认要等**最多 3 小时**。在那之前，无论你怎么登录、怎么 `klist purge`，新组都不会出现：源头（你连的那台 DC）压根没这个数据。

### 第 2 关：Kerberos TGT 里的 PAC——就算复制到了，也得重新签发

三个术语用游乐场比喻讲明白：

- **TGT（票据授予票据）**——入口发的「**通票手环**」：不能直接玩项目，但能凭它在每个项目门口换一次性票（服务票据）；
- **PAC（特权属性证书）**——**缝在手环里的身份标签**，印着「你是谁（用户 SID）、你在哪些组（组 SID）」。每个服务验票时不用回问入口，直接看标签——**PAC 就是票据随身携带的组 SID 快照**；
- **AS-REQ（认证服务请求）**——你第一次伸手向入口要手环的动作。DC 核对密码后才**签发新 TGT**，并在这一刻**把当时的组 SID 现场印进 PAC**。

陷阱在这：手环快过期时系统会**自动续期**，但那只是延长同一条手环的寿命，**不会重新印标签**：

| 动作 | 比喻 | PAC 刷新？ | 新组出现？ |
| --- | --- | --- | --- |
| TGT **续期**（renew，自动） | 旧手环盖章续用 | ❌ | ❌ |
| TGT **重新签发**（重登 / purge 后重认证） | 重新去入口换新手环 | ✅ | ✅ |

所以就算第 1 关已过、DC 里已有新组，只要你还在用旧手环，新组照样进不来——必须触发一次全新 AS-REQ（注销重登 / `klist purge` 后重认证）。

### 第 3 关：DC 定位缓存——你可能一直连着同一台「没同步」的 DC

机器会**缓存**上次成功使用的 DC，默认 **12 小时**（`ForceRediscoveryInterval`）才强制重发现。如果你缓存的那台恰好还没复制到新组，你会一直连它拿旧 TGT。**当缓存的 DC 不可达（比如网卡禁用了），客户端不会干等 12 小时，而是立即触发强制重发现**——这就是「重启网卡」能间接起作用的开关。

### 第 4 关：负缓存——上次找 DC 失败，记仇一小会儿

Netlogon 还有个**负缓存**：某次找 DC 失败后，把失败**记一小段时间**（默认 45 秒，`NegativeCachePeriod`）避免反复查 DNS。断网后立刻重连可能撞上这个窗口——这就是那段代码 `Start-Sleep 3` 有时不够的原因。

### 四关串起来 + 对照表

```text
管理员在 DC_A 加组
        ▼ ①AD复制（站内15s / 跨站默认180min）
   你连的DC有新组？ ──否──► 等复制 / repadmin /syncall
        ▼ ②TGT/PAC（续期不刷PAC）
   你的TGT带新组？ ──否──► klist purge + 重新认证
        ▼ ③DC定位缓存（粘同一台 12h）
   换台有新组的DC？ ──否──► Force Rediscovery（断网可触发）
        ▼ ④负缓存（45s）
   能正常连上？    ──否──► 等 NegativeCachePeriod 过期
        ▼
   新组进PAC → 重新登录进token → 权限生效
```

五种「都叫缓存、完全不同」：

| 层次 | 装什么 | 存在哪 | 寿命/刷新 | 重启网卡能刷吗 |
| --- | --- | --- | --- | --- |
| **access token** | 用户 SID + 组 SID + 特权 | 进程内存 | 登录铸好焊死；重登/runas 换新 | ❌ 无关 |
| **Kerberos 票据缓存** | TGT（含 PAC）、服务票据 | LSASS 内存 | TGT ~10h；purge + 重认证 | ❌ 无关 |
| **DC 定位缓存** | 上次用的 DC | Netlogon | 粘 12h；DC 不可达立即重发现 | ✅ 触发重发现 |
| **DC 负缓存** | 失败记录 | Netlogon | 45 秒 | ⚠️ 短暂受阻 |
| **AD 数据本身** | 组成员记录 | 各 DC 数据库 | 站内 15s / 跨站 180min | ❌ 要等复制 |

**所以那段「重启网卡」代码的真实因果链**：断网 → DC 重发现 → 换到已同步的 DC → 新认证拿带新组的 TGT → 进新进程时 token 带上组。它治的是第 3 关（连接），对第 1 关（数据）、第 2 关（票据）无能为力——单 DC 环境下纯粹没用。

**补一刀：`repadmin /syncall` 之后为什么可能还不生效？** 它只解决第 1 关（DC 间数据库同步），管不到你的 TGT 和 token。完整组合拳一步不能少：

```text
管理员：在某台 DC 加组 → repadmin /syncall /AedP    ← 第1关：所有DC都有数据
用户：  klist purge → 注销重登（或 runas）           ← 第2关+token：拿带新组的TGT和令牌
                        ▼
                    权限生效 ✅
```

**最后厘清「SID 归在哪一关」**：你自己的用户 SID 基本不变，不是「加权限」改的对象；「加权限」改的是组数据，它体现在**三个地方**——AD 数据库里的 `memberOf`（第 1 关）、TGT 的 PAC（第 2 关）、进程 token（重登）。同一个组 SID，三处各自刷新到位才生效。

顺手用 `klist` 看你那条「手环」：

```text
#0>     Client: chengongyi @ JZFZ.LOCAL
        Server: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL    ← TGT（发给 krbtgt 的都是换票用的主票）
        KerbTicket Encryption Type: AES-256-CTS-HMAC-SHA1-96
        Start Time: 8/26/2026 8:35:43 (local)      ← 签发时刻 = PAC 印刷时刻
        End Time:   8/26/2026 18:35:43 (local)     ← 寿命约 10 小时
        Kdc Called: jzfzdc5.jzfz.local             ← 签发它的 DC！和 LOGONSERVER 对上
```

`Kdc Called` 告诉你这条手环的 PAC 是 **JZFZDC5 当时数据库的快照**——如果新组还没复制到 JZFZDC5，这条手环里就没有它。三问三台 DC 在这又对上了一环。

---

## 第 3 课：实战——临时换令牌，访问进不去的路径

**🧑‍🏫 老师：**

回到那张授权流程图：你能不能访问资源，全看**进程令牌里的 SID 命不命中资源的 DACL**。如果当前令牌命不中，怎么办？答案是**临时换一个令牌**——拿另一组能命中的账号密码登录出新令牌，让当前线程在一段代码里**冒用**它。这就是 impersonation token 的用武之地。

先在我这台机器上**当场跑一遍**（PowerShell 里 Add-Type 现场编译，`LogonUser` 用 LabUser1 的账密铸令牌，`RunImpersonated` 挂上/摘下）：

```text
before  : JZFZ\chengongyi          ← 进程本来的身份（主令牌）
  inside : PC3507\LabUser1         ← RunImpersonated 回调里：线程换上了 LabUser1 的令牌
  outside: JZFZ\chengongyi         ← 回调一退出：自动换回主令牌
```

三行输出就是模拟的全部要义：**临时、线程级、自动可逆**——你只是借别人的令牌用一小会儿，没改进程的主令牌，也没真改本机登录。这段现场演示用的核心代码（PowerShell 完整版，可直接照抄）：

```powershell
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
using System.Security.Principal;using Microsoft.Win32.SafeHandles;
public class ImpDemo {
  [DllImport("advapi32.dll",SetLastError=true,CharSet=CharSet.Unicode)]
  static extern bool LogonUser(string u,string d,string p,int t,int pr,out SafeAccessTokenHandle tok);
  public static void Run(string u,string d,string p){
    SafeAccessTokenHandle h;
    if(!LogonUser(u,d,p,2,0,out h))                      // 2 = INTERACTIVE
      throw new Exception("LogonUser failed, Win32 error "+Marshal.GetLastWin32Error());
    WindowsIdentity.RunImpersonated(h,delegate(){
      Console.WriteLine("  inside : "+WindowsIdentity.GetCurrent().Name);});
    Console.WriteLine("  outside: "+WindowsIdentity.GetCurrent().Name);
  }
}
'@
[ImpDemo]::Run('LabUser1',$env:COMPUTERNAME,'P@ssw0rd1')
```

### 关键岔路：用哪种 LogonUser 登录类型

| logonType | 数值 | 铸出什么 | 适合做什么 |
| --- | --- | --- | --- |
| `LOGON32_LOGON_INTERACTIVE` | 2 | 完整 primary token，本机身份也换成他 | 访问**本机**资源（刚才的演示用的它） |
| `LOGON32_LOGON_NEW_CREDENTIALS` | 9 | 本机身份**不变**，只换**出站网络凭据** | 专门访问 **UNC/网络共享**（`\\server\share`） |

**「用别的账密访问网络共享」要用 9 不是 2**：你只想让连那个共享时的网络登录带上别人账密，不想真换本机身份；而且 `NEW_CREDENTIALS` **不校验账密**（留着等真连远程才用），目标机不在本域也能用——代价是密码错要等真连远程才暴露。目标是**本机**路径则用 2。**先想清楚目标是本机还是远程，再选 2 还是 9。**

### 版本二：生产级封装（铸令牌与挂令牌解耦）

刚才的最小版把账密硬编码、每次都重新 LogonUser。真实项目里常要打日志、控制 revert 时机、做成可 `using` 的会话——设计骨架是把**铸令牌（贵、一次）**和**挂令牌（轻、反复）**劈开：

```csharp
public sealed class NetworkLogonSession : IDisposable
{
    private readonly IntPtr _impersonationToken;
    private bool _disposed;

    public static NetworkLogonSession Create(string username, string password)
    {
        SplitUsername(username, out var user, out var domain);
        // 1. LogonUser 铸 primary token（NEW_CREDENTIALS：只换出站网络凭据）
        if (!LogonUser(user, domain, password ?? "",
                Logon32LogonNewCredentials, Logon32ProviderDefault, out var token))
            throw new IOException($"无法用账户 {username} 登录: " +
                new Win32Exception(Marshal.GetLastWin32Error()).Message);
        try
        {
            // 2. primary token 不能直接 impersonate，先 DuplicateToken 成 impersonation token
            if (!DuplicateToken(token, SecurityImpersonation, out var duplicate))
                throw new IOException("无法复制令牌: " +
                    new Win32Exception(Marshal.GetLastWin32Error()).Message);
            return new NetworkLogonSession(duplicate);
        }
        finally { CloseHandle(token); }   // 原始 primary 句柄使命已达；duplicate 留给实例
    }

    public void RunImpersonated(Action action)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (!ImpersonateLoggedOnUser(_impersonationToken))
            throw new IOException("无法模拟: " +
                new Win32Exception(Marshal.GetLastWin32Error()).Message);
        try { action(); }
        finally { RevertToSelf(); }       // 无论成败都换回原身份
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        if (_impersonationToken != IntPtr.Zero) CloseHandle(_impersonationToken);
    }
    // P/Invoke: LogonUser / DuplicateToken / ImpersonateLoggedOnUser / RevertToSelf / CloseHandle
}
```

用法：

```csharp
using var session = NetworkLogonSession.Create(@"JZFZ\someone", password);
session.RunImpersonated(() =>
{
    foreach (var f in Directory.GetFiles(@"\\fileserver\project-share\机密"))
        Console.WriteLine(f);          // 走 SMB，用 someone 的凭据；本机身份不变
});
```

三个读代码要点：**① 为什么多一步 `DuplicateToken`**——`LogonUser` 吐的是 primary token，`ImpersonateLoggedOnUser` 要挂的是 impersonation token，`DuplicateToken` 正是把前者复制成后者（最小版的 `RunImpersonated` 内部替你做了这步，手写底层就得补上）。**② `try/finally + RevertToSelf`**——漏了 finally 就是线程一直顶着别人令牌跑的安全漏洞；这是手写版换来的自由度（打日志、埋点）对应的代价。**③ 句柄所有权闭环**——`token` 在 Create 的 finally 里关、`duplicate` 在 Dispose 里关，一一对应不泄漏。

### 版本三：服务端（库 + 句柄缓存 + 异步）

Web 服务里同一用户的凭据高频反复用，每请求 LogonUser 一次既慢又无谓。两件事：① 用 [`SimpleImpersonation`](https://github.com/mattjohnsonpint/SimpleImpersonation) 库省掉手写 P/Invoke（内部还是同一个 Win32 LogonUser，机制不变）；② **缓存 token 句柄复用**——`SafeAccessTokenHandle` 可以反复拿去 impersonate（每次是「拷一份挂上去」），所以「登录一次、8 小时内反复用」成立：

```csharp
private SafeAccessTokenHandle GetCachedHandle(string user, string pwd)
{
    var key = $"WinToken_{DOMAIN}\\{user}_{Hash(pwd)}";   // 放密码哈希，不放明文
    return _cache.GetOrCreate(key, entry =>
    {
        var h = new UserCredentials(DOMAIN, user, pwd).LogonUser(LogonType.NewCredentials);
        if (h is null || h.IsInvalid)
        { entry.SetAbsoluteExpiration(TimeSpan.FromSeconds(1)); return null; }  // 防坏凭据风暴
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(8);
        entry.RegisterPostEvictionCallback((_, v, _, _) =>
            (v as SafeAccessTokenHandle)?.Dispose());     // 逐出时回收内核句柄！
        return h;
    });
}
```

三个最值钱的坑：**① 逐出回调里必须 Dispose**——MemoryCache 驱逐条目时只会删字典，不知道你存的是内核句柄；不注册回调，句柄成孤儿，跑几天句柄数就涨上去。**② 无效凭据给 1 秒过期**——`NEW_CREDENTIALS` 不校验密码，走到 IsInvalid 多半是参数必然失败；不短缓存就是失败风暴。**③ 有 `await` 就必须用 `RunImpersonatedAsync`**——impersonation 是**线程级**状态，同步版包 async lambda 时，`await` 之后 continuation 可能跑上另一个没挂令牌的线程，身份「断」了——本地测试正常、上负载偶发权限不对的隐蔽 bug。异步重载让身份在 `ExecutionContext` 层面跟着异步流走。

> ⚠️ 两个生产级陷阱（库 README 明确警告）：**SQL 连接池不认 impersonation**——`NewCredentials` 连 SQL Server Windows 集成认证会串号，必须改连接串做身份级连接池；**它不做远程认证**——前提是本机与远程机同域或有信任关系。
>
> 密码安全：硬编码明文密码是头号泄露源，生产放密钥库（DPAPI / Key Vault），别写源码里。

---

## 收束

**你现在会了：**

- **令牌是什么**：登录后系统发给进程的「身份证 + 权限清单」（受保护内核对象），装用户 SID、组 SID、特权、Owner、logon SID。
- **怎么来的**：认证给 SID + 本机策略给 privileges → LSA 打包成 primary token → 拷一份挂到每个进程。
- **怎么看见**：`whoami /all` 三段就是令牌三块；代码用 `WindowsIdentity`。
- **怎么换新**：令牌焊死，只能开新登录会话（runas / `Start-Process -Credential` / `LogonUser`）；`klist purge` 只治票据不治令牌。
- **「重启网卡刷新权限」的真相**：不刷 token 不清票据，只是触发 DC 重发现换数据源——四道关（AD 复制 → TGT/PAC → DC 定位缓存 → 负缓存）各卡各的；标准组合拳是管理员 `repadmin /syncall` + 你 `klist purge` 重登。
- **模拟三连版**：`RunImpersonated` 最小版（本机当场演了 inside/outside）→ 生产封装（DuplicateToken + finally revert）→ 服务端（库 + 句柄缓存 + `RunImpersonatedAsync`）；`NEW_CREDENTIALS(9)` 管网络、`INTERACTIVE(2)` 管本机。

**下一讲才需要：** 文件上如何登记「主人是谁」（Owner）——还不是完整权限表。

---

<!-- chapter-nav:start -->
← 上一章：[第 4 讲：登录与 LSA](./05-logon-lsa.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 6 讲：Owner](./07-owner.md)
<!-- chapter-nav:end -->
