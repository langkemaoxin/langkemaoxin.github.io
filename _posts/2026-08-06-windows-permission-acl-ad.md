---
layout: post
author:     "Corey"
header-img: "img/post-bg-circuit-board.jpg"
header-mask: 0.25
title: "如果没有权限系统：一步步「发明」Windows ACL、继承标志与域控"
subtitle: "从单机无保护到 ACL / InheritanceFlags·PropagationFlags / AD 安全组"
date: 2026-08-06
catalog: true
tags: [Windows, ACL, NTFS, Active Directory, 权限, InheritanceFlags, PropagationFlags, 安全]
---

> 假设世界上本来没有「权限」这回事。  
> 文件就躺在磁盘上，谁开机谁就能改。  
> 然后事故一件件发生——每出一次事故，我们就被迫多发明一层机制。  
> 一路发明下去，会发现：今天的 Windows ACL、继承标志、域控与权限组，几乎都是被问题逼出来的。

本文按**设计演进**往下走，建议按这个顺序读：

```text
① 多用户同机 → Security Principal / SID / Owner（含 C#）
② 登录之后 → LSA / 访问令牌 / 访问检查 / 为何有的共享能开有的不能（小白向）
③ 粗粒度不够 → 权限位（读/写/改）
④ 人太多 → 组
⑤ 规则冲突 → ACL（Allow/Deny 列表）
⑥ 目录太深 → 继承；两套旋钮 InheritanceFlags / PropagationFlags（重点）
⑦ 看不清结果 → 有效权限；还要审计 → SACL
⑧ 机器太多 → 域控与安全组
⑨ 两道门与分权 → 共享权限 ∩ NTFS、特权 vs 权限、UAC
```

概念与命令对照以 Microsoft Learn（Windows Server / 登录与认证 / SMB / UAC）及 Context7 查询结果为准；文中关键论断旁标注资料来源。

---

## 0. 起点：没有权限的世界

一台电脑、一个使用者。文件就是文件，没有「谁能碰」的概念。

这在单人单机时代完全够用。麻烦从**第二个人**开始。

---

## 1. 事故一：别人改了我的文件 → 发明「身份」和「所有者」

同事登录同一台机器，打开你的报表，随手改了两行，或者直接删了。

系统若要阻止这种事，第一步不是画权限表，而是先回答两个更基础的问题：

1. **现在动手的是谁？** → 需要可认证的身份：**Security Principal**  
2. **这个文件算谁的？** → 需要对象上的主人字段：**Owner**

Microsoft Learn 的定义很干脆：Security Principal 是能被 Windows 认证的实体（用户、组、计算机等）；每个主体创建时拿到一个**唯一且永不复用**的 **SID（Security Identifier）**。操作系统认的是 SID，不是你屏幕上看到的 `DOMAIN\Alice` 字符串。

### 1.1 Security Principal：系统眼里的「人」

可以把 Principal 想成「安全世界里的主语」：

| 形态 | 例子 | 说明 |
|------|------|------|
| 用户账户 | `PC01\Bob`、`CONTOSO\Alice` | 本机 SAM 或域账户 |
| 安全组 | `Administrators`、`Domain Users` | 也是 Principal；权限常授给组 |
| 计算机账户 | `CONTOSO\FILESVR01$` | 机器本身也有身份 |
| 特殊身份 | `Everyone`、`SYSTEM`、`Owner Rights` | 预定义 SID，不全是「真人」 |

用户登录成功后，进程会拿到一份 **访问令牌（Access Token）**：里面有用户 SID，以及他所属各组的 SID 列表。之后「打不打得开某个文件」，比的是令牌里的 SID 集合，去对对象上的 ACL——账户名只是给人看的标签。

这也解释了一个常见现象：**改用户显示名 / 登录名，旧 ACL 往往还有效**——因为 ACL 里存的是 SID。

### 1.2 C#：当前进程「我是谁」

.NET 用 `WindowsIdentity` 读当前 Windows 身份（官方文档：[Create a WindowsPrincipal](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)）：

```csharp
using System.Security.Principal;

WindowsIdentity identity = WindowsIdentity.GetCurrent();

Console.WriteLine($"账户名: {identity.Name}");          // 如 CONTOSO\Alice
Console.WriteLine($"用户 SID: {identity.User}");        // 如 S-1-5-21-...-1103
Console.WriteLine($"是否认证: {identity.IsAuthenticated}");
Console.WriteLine($"令牌类型: {identity.ImpersonationLevel}");

// 令牌里带着哪些组 SID（权限求值会用到）
foreach (IdentityReference group in identity.Groups!)
{
    try
    {
        var name = group.Translate(typeof(NTAccount));
        Console.WriteLine($"  组: {name}  ({group})");
    }
    catch (IdentityNotMappedException)
    {
        Console.WriteLine($"  组 SID(无法翻译): {group}");
    }
}

// 需要按角色判断时，再包一层 WindowsPrincipal
var principal = new WindowsPrincipal(identity);
bool isAdmin = principal.IsInRole(WindowsBuiltInRole.Administrator);
Console.WriteLine($"当前是否管理员角色: {isAdmin}");
```

命令行对照：`whoami /user`、`whoami /groups`。

### 1.3 C#：账户名 ↔ SID（IdentityReference）

ACL、Owner 字段在系统底层都偏向 SID。`.NET` 里用 `NTAccount`（可读名）和 `SecurityIdentifier`（SID）互转——二者都是 `IdentityReference`：

```csharp
using System.Security.Principal;

// 名字 → SID（写入 ACL / Owner 前常用）
var account = new NTAccount(@"CONTOSO\Alice");
var sid = (SecurityIdentifier)account.Translate(typeof(SecurityIdentifier));
Console.WriteLine(sid.Value);   // S-1-5-21-...-xxxx

// SID → 名字（展示、排障）
var back = (NTAccount)sid.Translate(typeof(NTAccount));
Console.WriteLine(back.Value);  // CONTOSO\Alice

// 也可用「人人皆知」的 SID 字面量（示例：Everyone = S-1-1-0）
var everyone = new SecurityIdentifier("S-1-1-0");
Console.WriteLine(everyone.Translate(typeof(NTAccount))); // Everyone
```

域恢复文档里也有同样模式：用 `SecurityIdentifier` 拼出 RID 500，再 `Translate` 成 `NTAccount` 找出内置 Administrator。要点只有一句：**稳定身份是 SID；名字是视图。**

### 1.4 Owner：安全描述符上的「主人」槽位

光有「谁在操作」还不够——每个可保护对象（文件、文件夹、注册表键、AD 对象……）还要挂一份 **安全描述符（Security Descriptor）**。Learn 示例里可以看到典型字段：

```text
Security Descriptor
├── Owner:  MyDomain\Admin1  [S-1-5-21-...-1103]
├── Group:  MyDomain\Domain Users  [S-1-5-21-...-513]   ← Primary Group
├── DACL   → 谁能碰（后面章节）
└── SACL   → 审计（后面章节）
```

**Owner 解决的是「默认控制权从哪来」**，而不是完整权限模型：

- 对象创建时，通常把创建者（或其管理员上下文）记为 Owner。  
- Owner 默认往往隐含能读控制信息、改 DACL 的能力（即「我是主人，至少能把自己锁门外的惨剧救回来」这一类钩子）。  
- 若要对「主人」本身再收紧，Windows 还有特殊身份 **Owner Rights**（SID `S-1-3-4`）：在 ACE 里针对它授权时，可覆盖 Owner 那套隐含的 `READ_CONTROL` / `WRITE_DAC` 行为。  

注意区分：

| 概念 | 回答的问题 |
|------|------------|
| 当前 Principal（令牌） | 现在是谁在访问？ |
| 对象 Owner | 这个对象登记的主人是谁？ |
| DACL 里的 ACE | 明确允许/拒绝了哪些人做哪些事？ |

Owner ≠「DACL 里有一条 Full Control」。很多对象 Owner 是某用户，真正业务权限却授给了组；反过来，管理员也可以 `takeown` 夺所有权，再改 DACL——这是运维「救回失控权限」的标准路径之一。

```bat
takeown /f lostfile
```

### 1.5 C#：读取与修改文件 Owner

现代 .NET 通过 `System.IO.FileSystemAclExtensions`（`GetAccessControl` / `SetAccessControl`）读写文件安全描述符：

```csharp
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

var path = @"D:\Share\report.xlsx";
var file = new FileInfo(path);

// 读出安全描述符，再取 Owner（可指定翻译成 NTAccount 或 SecurityIdentifier）
FileSecurity security = file.GetAccessControl();
IdentityReference owner = security.GetOwner(typeof(NTAccount))!;
Console.WriteLine($"当前所有者: {owner}");

var ownerSid = security.GetOwner(typeof(SecurityIdentifier))!;
Console.WriteLine($"所有者 SID: {ownerSid}");

// 修改所有者（通常需要足够特权；否则会 UnauthorizedAccessException）
security.SetOwner(new NTAccount(@"CONTOSO\Alice"));
file.SetAccessControl(security);

Console.WriteLine($"新所有者: {file.GetAccessControl().GetOwner(typeof(NTAccount))}");
```

若在较老的 .NET Framework 上，常见写法是 `File.GetAccessControl(path)` / `File.SetAccessControl(path, security)`，语义相同：拿到 `FileSecurity`，对其 `GetOwner` / `SetOwner`。

文件夹同理，类型换成 `DirectoryInfo` + `DirectorySecurity`。

### 1.6 这一步发明了什么，还缺什么

到这里，世界已经不再「匿名可写」：

- 有 **Principal + SID + 令牌**，系统知道操作者；  
- 有 **Owner + Security Descriptor**，对象知道主人；  
- 用 C# 可以查询身份、翻译 SID、读写 Owner。

但模型仍然太粗：**只有「主人 / 非主人」远远不够协作。**  
在发明更细的权限位之前，先把一个更「日常」的问题说清楚——**你点了登录之后，操作系统到底做了什么，才让你能打开某些共享、打不开另一些？**

---

## 2. 登录之后：操作系统如何带着「你是谁」去访问资源（小白向）

上一章发明了身份（Principal / SID）和 Owner。可是日常体验是这样的：

1. 你输入账号密码（或刷卡、Windows Hello），进入桌面；  
2. 双击打开 `\\fileserver\财务` 成功；  
3. 再打开 `\\fileserver\研发` 却提示拒绝访问。

中间没有人再问你一遍「你是谁」。那系统是怎么一路记得你的？权限又是从哪张「表」里拿出来比对的？

下面按**登录之后实际发生的顺序**，把概念一个个拆开。每个概念只回答一个小问题。

### 2.1 先分清两件事：认证 vs 授权

Windows 文档把登录相关流程拆成两段（见 [Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)）：

| 词 | 白话 | 回答的问题 |
|----|------|------------|
| **认证（Authentication）** | 验明正身 | 你是不是你声称的那个人？密码/密钥对不对？ |
| **授权（Authorization）** | 决定能不能碰 | 验明正身之后，你**被允许**访问这个资源吗？ |

所以：登录成功 ≠ 所有共享都能开。  
登录成功只说明**认证过了**；每个文件夹、每个共享还要再做一次**授权检查**。

### 2.2 谁在验你的身份？——LSA（本地安全机构）

验身份不是资源管理器自己干的，而是一个受保护的系统组件：**LSA（Local Security Authority）**。它通常跑在受保护的 **LSASS** 进程里，负责认证用户、维护本地安全策略、提供「名字 ↔ SID」翻译等。  
来源：[Windows Authentication Architecture - LSA](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-architecture)、[Credentials Protection - LSA](https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/credentials-protection-and-management)

下面用一个**完整小例子**，把「点登录之后到验完身份」走一遍。

#### 例子设定

> 电脑 `PC01` 已加入域 `CONTOSO`。  
> 员工 **Alice** 在登录界面输入：`CONTOSO\Alice` + 密码，点击登录。

目标：弄清 **谁收密码、谁判真假、去哪对答案**。

#### 过程（按时间顺序）

**① 唤起登录界面**

你按下安全注意序列（常见是 Ctrl+Alt+Del）或机器开机进入登录桌面。  
**Winlogon** 负责安全交互，并拉起安全桌面上的 **Logon UI**。  
来源：[Credentials processes - Winlogon](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

**② 选登录方式并输入账号密码**

Logon UI 会询问各个已注册的 **Credential Provider（凭据提供程序）**：密码、PIN、Windows Hello、智能卡……各出一块「磁贴」。  
Alice 点「密码」磁贴，输入 `CONTOSO\Alice` 和密码。

这里有个关键分工（很多人误会）：

| 角色 | 干什么 | 不干什么 |
|------|--------|----------|
| Credential Provider | 采集、打包凭据，告诉界面「需要哪些字段」 | **不做最终放行** |
| LSA + 认证包（authentication packages） | **真正验真假、执法** | — |

来源：[Credential provider architecture](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)  
原文要点：提交认证后，安全执法由 LSA 与认证包处理，**不是** Credential Provider。

**③ 凭据交给本机 LSA**

Winlogon 把安全桌面上收集到的凭据，通过 **`secur32.dll`** 交给 **LSA**。  
来源：同上文 Winlogon 组件说明。

到这一步，密码已经离开「你看见的登录框」，进入本机安全子系统；后面判对错的是 LSA，不是资源管理器，也不是你要打开的那个共享文件夹。

**④ LSA 决定「去哪里对答案」**

Windows 默认会对照：

- **本机 SAM 数据库**（本地账户），或  
- **Active Directory**（已加入域的机器上的域账户）

来源：[Credentials processes - overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

对 Alice 这个例子：

```text
账户写成 CONTOSO\Alice
        │
        ▼
本机 LSA：「这是域账户，不是 PC01 本地用户」
        │
        ▼
联系域 CONTOSO 的安全权威（域控制器）核验密码/账户状态
        │
        ├─ 成功 → 认证通过
        └─ 失败 → 密码错、账户禁用、登录时段/工作站限制等
```

若 Alice 输入的是 **`PC01\Bob`（本机账户）**，同一套 LSA 会改去查 **本机 SAM**，而不是问域控。  
LSA 查本机 SAM、或联系域的安全权威，正是官方对 LSA 职责的描述。  
来源：[Credentials processes - LSA](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

**⑤ 认证成功之后 LSA 还会做什么（先看到门槛）**

认证包在初始登录成功时，会**创建 logon session（登录会话）**，并返回后续用来构造「你的安全上下文 / 令牌」所需的信息。  
来源：[LSA_AP_LOGON_USER](https://learn.microsoft.com/en-us/windows/win32/api/ntsecpkg/nc-ntsecpkg-lsa_ap_logon_user)（成功则创建 logon session，并返回构建 token 的信息）

下一节会专门讲那张「通行证」（Access Token）。本节先记住：

> **LSA 验过了 = 认证通过；还没到「每个文件夹能不能开」的授权检查。**

**⑥ 分支：域控暂时连不上怎么办？**

若 `PC01` 一时联系不到域控，但 Alice **以前在这台机器上成功用域账户登录过**，Windows 可能使用**缓存的域登录凭据**做校验，让你在离线/断网时仍能进桌面。  
每次成功的域登录后，相关信息会缓存在本机安全相关存储里，供断连时使用。  
来源：[Cached credentials and validation](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

注意：缓存能让你「进本机桌面」，并不等于此时一定能访问所有网络共享（共享还要能连上服务器并再做认证/授权）。

#### 一张图看 Alice 这次登录

```text
Alice 输入 CONTOSO\Alice + 密码
        │
        ▼
 Logon UI + Credential Provider   （采集、打包）
        │
        ▼
 Winlogon ──(secur32.dll)──► 本机 LSA（LSASS）
        │
        ▼
 认证包：这是域账户？
        │
        ├─ 能连域控 → 问 CONTOSO 域控：密码对不对？账户是否可用？
        │                 ├─ 对 → 创建 logon session →（下一节）发 Access Token
        │                 └─ 错 → 登录失败，回到登录界面
        │
        └─ 暂时连不上域控 → 尝试本机「缓存的域登录凭据」
                              ├─ 命中且校验过 → 仍可进桌面（离线登录）
                              └─ 没有缓存/校验失败 → 登录失败
```

#### 对照：本机账户 vs 域账户（同一套 LSA）

| Alice 输入 | LSA 主要去哪对答案 |
|------------|-------------------|
| `PC01\Bob` | 本机 **SAM** |
| `CONTOSO\Alice` | **域控（AD）**；必要时用**本机缓存凭据** |
| 密码磁贴 vs Hello | 都是 Provider 采集；**最终仍由 LSA 执法** |

小白收束：

> **登录框只负责收齐「你声称是谁 + 证明」；LSA 才是验钞机。**  
> 域账户的「标准答案」在域控；本机账户的「标准答案」在本机 SAM。

### 2.3 登录成功后发什么？——访问令牌（Access Token）

认证通过后，LSA 会创建一份受保护的对象，叫 **主访问令牌（primary access token）**。

令牌里至少装着（来源：[Understand security principals - Access tokens](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)）：

| 令牌里有什么 | 白话 |
|--------------|------|
| 你的用户 **SID** | 「你是谁」的机器可读 ID |
| 你所属各组的 **组 SID** | 「你还算哪个部门/角色的人」 |
| 分配给你的 **用户权利（user rights）** | 如能否关机、能否备份——偏系统能力，不是某个文件上的勾选 |

文档还强调：这份令牌会**挂到你名下启动的每个进程、每个线程上**。  
也就是说：你开的 Word、资源管理器、命令行，默认都带着同一张（或同源继承的）「通行证」。

域用户登录时，认证服务还会把相关 SID 都收进令牌，包括当前 SID、组 SID，以及可能存在的历史 SID（`SIDHistory`）。访问资源时，**令牌里任何一个 SID** 都可能用来允许或拒绝访问。  
来源：[Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

小白口诀：

> **登录 = 验身份 + 发令牌。**  
> 之后你在这台电脑上做的事，系统主要看令牌，而不是反复问密码。

### 2.4 令牌长什么样？——自己看一眼

不必先读内核文档，先看自己的令牌内容：

```bat
whoami /all
```

该命令会显示当前访问令牌里的用户名、SID、特权、组成员等。  
来源：[whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami)

C# 侧对应上一章的 `WindowsIdentity.GetCurrent()`：读的就是当前进程令牌所代表的 Windows 身份。

```csharp
using System.Security.Principal;

var id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.Name);   // 账户名
Console.WriteLine(id.User);   // 用户 SID
// id.Groups → 组 SID 列表（与 whoami /groups 同一类信息）
```

来源：[How to: Create a WindowsPrincipal Object](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)

### 2.5 打开文件时底层比什么？——主体 vs 客体的「对表」

现在你双击一个文件。系统并不是「凭感觉」放行，而是做一次标准的访问控制判断：

> **主体（你的进程）** 拿着令牌里的 SID，去和 **客体（文件）** 安全描述符里的 ACE 一条条比对，决定允不允许。

来源原文要点（[Understand security principals - Authorization and access control](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)）：

- 主体：用户发起的进程  
- 系统比较：访问令牌中的 SID ↔ 对象安全描述符中的 ACE  
- 据此做出访问决定  

画成一张极简图：

```text
[你的进程]
   带着 Access Token
   （用户 SID + 组 SID + 权利）
           │
           ▼
   系统做 Access Check（访问检查）
           │
           ▼
[文件 / 文件夹 / 共享]
   带着 Security Descriptor
   （Owner + DACL 里一堆 ACE）
```

所以「有没有权限」不是登录时一次性算完贴在脑门上的，而是**每次访问对象时，用令牌对那张对象上的规则表再算一遍**。

### 2.6 为什么有的共享能开、有的不能？——网络登录 + 两道门

访问 `\\fileserver\财务` 比打开本机 `D:\a.txt` 多了几步。

**（1）这是一次「网络登录（network logon）」**

交互式坐在屏幕前登录，叫 interactive logon；去访问网络资源时，还会发生 **network logon**：用已建立的凭据（或其它机制）向网络服务证明「我是谁」，通常不再弹密码框。  
支持的机制包括 Kerberos、证书、SSL/TLS、Digest，以及兼容用的 NTLM 等。  
来源：[Windows logon scenarios - Network logon](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)

小白理解：

```text
本机登录成功 → 你有了本机会话和令牌
访问 \\服务器\共享 → 还要对「那台服务器」再证明一次身份（网络登录）
服务器认可后 → 在服务器侧用「你的身份」做授权检查
```

SMB 场景下，官方更推荐用主机名走 Kerberos；用 IP / 某些 CNAME 容易落到 NTLM。  
来源：[SMB signing overview - security considerations](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview)

**（2）共享路径要过两道门**

对文件服务器上的共享，访问控制由 **共享权限（share permissions）** 和 **NTFS 权限** 共同管理；只有授权用户才能访问对应文件/文件夹。  
来源：[SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)

白话对照你的体验：

| 现象 | 常见原因（直觉） |
|------|------------------|
| `\\server\财务` 能进，`\\server\研发` 不能 | 共享权限或该共享目录的 NTFS ACL，对你令牌里的 SID/组 SID 不允许 |
| 共享能列出来，深层某个文件夹打不开 | 共享门过了，某个子文件夹的 NTFS ACE 把你拦了 |
| 明明在「财务组」，仍进不去 | 令牌里没有那个组 SID（没刷新登录）、或还有一条 Deny、或只过了共享没过 NTFS |

两道门的细讲后文「事故十」还会展开；这里先记住结论：

> **能访问某个共享路径 ≈ 网络侧认证成功，并且共享权限与 NTFS ACL 都允许你令牌里的身份。**

### 2.7 管理员登录为什么还要弹 UAC？——其实发了两张令牌

若账户在 Administrators 组里，登录时系统会创建**两份**访问令牌：标准用户令牌 + 管理员令牌。日常桌面（`explorer.exe`）用标准令牌启动，子进程默认继承它，所以多数程序以标准用户上下文运行；需要管理员能力时再提示提升。  
来源：[How User Account Control works - Sign in process](https://learn.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works)

这对小白的意义是：

- 「我是管理员」不等于「我打开的每个程序都带着管理员令牌」；  
- 拒绝访问有时不是共享 ACL 错了，而是**当前进程用的是被过滤后的那张令牌**。

### 2.8 把整条链路串起来（登录 → 共享）

```text
① 输入凭据
② LSA 认证（本机 SAM 或域控）
③ LSA 创建 Access Token（用户 SID + 组 SID + 用户权利）
④ 令牌附着到你的进程/线程（桌面、资源管理器等）
⑤ 访问 \\server\share
      → 网络登录（Kerberos / NTLM 等）向服务器证明身份
⑥ 服务器上做授权：
      → 先看共享权限
      → 再看目标文件/文件夹的 NTFS DACL
      → 用令牌里的 SID 去对 ACE（Allow/Deny）
⑦ 通过则打开；否则拒绝访问
```

你「拥有」的权限，并不是登录时复印在身上的一张万能通行证清单，而是：

- **令牌告诉系统：你是谁、属于哪些组、有哪些系统权利；**  
- **每个对象自己的安全描述符告诉系统：这些身份分别能做什么；**  
- **每次访问时现场对表。**

于是回到设计演进：有了「登录后带着令牌访问」这套机制，下一步才需要把对象上的规则从「主人/非主人」细化成可读可写的**权限位**——这就是下一事故。

---

## 3. 事故二：要协作又不能乱改 → 发明「权限位」

给每个人、每个文件记一组能力开关，例如：

| 常见说法 | 大致含义 |
|----------|----------|
| 读取 | 打开看内容、列目录 |
| 写入 / 修改 | 改内容、改属性 |
| 读取和执行 | 读 + 跑程序/脚本 |
| 修改 | 读写下删（通常不含改权限本身） |
| 完全控制 | 一切，含改权限、夺所有权 |

NTFS 把这些能力落到更细的 **高级权限**（删、读属性、写扩展属性、改权限……）。资源管理器里的「只读 / 修改 / 完全控制」大多是高级位的打包。

这一步解决了「粒度」。新问题：  
**人一多，每个文件对每个人单独记账，行政成本爆炸。**

---

## 4. 事故三：人来人走管不过来 → 发明「组」

财务部 30 人，都要对 `F:\报表` 只读。人入职离职时，你不想改 30 条文件规则。

做法：对人打包成 **组（Group）**，权限授给组。人进组就有权，出组就丢掉。

Microsoft Learn 对安全组的表述很直接：权限授给安全组而不是个人，管理更简单；成员自动继承组上的权限。

本机有 `Users`、`Administrators` 等；进域之后还有 `Domain Users`、`Domain Admins` 等——后文再展开。

新问题：规则变成一张**列表**，而且会出现「既允许又拒绝」。

---

## 5. 事故四：规则打架 → 发明 ACL（DACL）与 ACE

现在每个对象上不再是「一个主人开关」，而是一张表：

> 对谁（用户/组）× 允许还是拒绝 × 哪些权限位

这张表就是 **DACL（Discretionary Access Control List）**，每一行是一条 **ACE（Access Control Entry）**。

安全描述符里大致是：

```text
Security Descriptor
├── Owner
├── DACL  → 谁能碰（Allow / Deny）
└── SACL  → 谁碰了要记日志（后文）
```

求值时常见直觉（简化版）：

- 显式 **Deny** 通常压过冲突的 Allow（Learn 文档亦强调 deny 一般覆盖冲突的 allow）。
- 多条 Allow 可以合并出更大的权限并集。
- 「列表里完全没提到你」≈ 没权限（再叠加继承、组嵌套等细节）。

命令行侧，`icacls` 用 `/grant`、`/deny` 往 DACL 里加 ACE；权限掩码里 `F` 完全控制、`RX` 读执行、`N` 无访问等。

新问题来了，而且是大问题：  
**一个共享根目录下面几千个子文件夹和文件，总不能逐个点权限。**

---

## 6. 事故五：目录太深设不过来 → 发明「继承」

直觉解法：在父文件夹上写一条规则，**自动流到子级**。

这就是 ACE 上的继承标志。`icacls` / 旧版 `cacls` 输出里常见：

| 标志 | 含义（直觉） |
|------|----------------|
| `(OI)` | Object Inherit：可向**子文件**方向继承 |
| `(CI)` | Container Inherit：可向**子文件夹**方向继承 |
| `(IO)` | Inherit Only：**不**作用在当前对象，只给子孙「当种子」 |
| `(NP)` | No Propagate：只传到**直接子级**，不再往下传 |
| `(I)` | 这条 ACE 是从上级**继承来的**（结果标记，不是你配置时勾的「适用范围」） |

在 .NET 里，同一套东西拆成两个枚举，正交组合：

- **`InheritanceFlags`**：传给**哪类孩子**（文件夹？文件？）
- **`PropagationFlags`**：传的时候**当前对象吃不吃**、**传几层**

下面这一节是全文重点。

---

## 7. 重点：`InheritanceFlags` × `PropagationFlags` 到底在控制什么

先固定一棵目录树，后面所有例子都对着它想：

```text
Root\                 ← 你在这一层「写」ACE
├── file-root.txt
├── SubA\
│   ├── file-a.txt
│   └── SubA1\
│       └── file-a1.txt
└── SubB\
    └── file-b.txt
```

对「写在 Root 上的那条 ACE」，你其实在回答四个问题：

1. **Root 自己**要不要受这条规则约束？  
2. **子文件夹**（`SubA`、`SubB`、`SubA1`…）要不要继承？  
3. **子文件**要不要继承？  
4. 继承是**一路传到底**，还是**只传一层**？

前三个问题主要看 `InheritanceFlags` + 是否 `InheritOnly`；第四个看 `NoPropagateInherit`。

### 6.1 两个枚举分别管什么

**`InheritanceFlags`（往下传给谁）**

| 值 | ACE 侧 | 作用 |
|----|--------|------|
| `None` | 无 OI/CI | 不向子级继承 |
| `ContainerInherit` | `(CI)` | 子**容器**（文件夹）可继承 |
| `ObjectInherit` | `(OI)` | 子**对象**（文件）可继承 |
| `ContainerInherit \| ObjectInherit` | `(CI)(OI)` | 文件夹和文件方向都传 |

**`PropagationFlags`（怎么传、当前吃不吃）**

| 值 | ACE 侧 | 作用 |
|----|--------|------|
| `None` | 无 IO/NP | 正常传播；且这条 ACE **作用于当前对象**（除非另有 InheritOnly） |
| `InheritOnly` | `(IO)` | **不**作用于当前对象，只作为给子级的模板 |
| `NoPropagateInherit` | `(NP)` | 子级继承后**清掉继承标志**，孙子不再继续传 |
| 两者按位或 | `(IO)(NP)` | 「当前不吃」+「只传一层」 |

记住一句口诀：

> **Inheritance = 传给谁；Propagation = 当前吃不吃、传多深。**

### 6.2 和资源管理器「适用于」一一对应

资源管理器 → 高级安全设置 → 编辑权限 → **适用于**，几乎就是下面这张表：

| 适用于（GUI） | InheritanceFlags | PropagationFlags | Root 自己 | 子文件夹 | 子文件 | 更深层级 |
|---------------|------------------|------------------|-----------|----------|--------|----------|
| 只有该文件夹 | `None` | `None` | ✓ | ✗ | ✗ | ✗ |
| 该文件夹、子文件夹和文件 | `ContainerInherit \| ObjectInherit` | `None` | ✓ | ✓ | ✓ | ✓ 继续传 |
| 该文件夹和子文件夹 | `ContainerInherit` | `None` | ✓ | ✓ | ✗ | 仅文件夹链 |
| 该文件夹和文件 | `ObjectInherit` | `None` | ✓ | 见下※ | ✓ | 见下※ |
| 只有子文件夹和文件 | `ContainerInherit \| ObjectInherit` | `InheritOnly` | ✗ | ✓ | ✓ | ✓ |
| 只有子文件夹 | `ContainerInherit` | `InheritOnly` | ✗ | ✓ | ✗ | 文件夹链 |
| 只有文件 | `ObjectInherit` | `InheritOnly` | ✗ | 见下※ | ✓ | 见下※ |

※ **`ObjectInherit` 的「隔代」行为**（很多人踩坑的地方）：

Windows 对 `OI` 的设计是：

- **非容器子对象（文件）**：继承后变成**生效**的 ACE。  
- **子容器（子文件夹）**：通常继承到一条带 `(IO)(OI)` 的 ACE——**子文件夹自己不一定拿这条当访问权**，但会继续把「文件向」规则传给更深层的文件。

因此「该文件夹和文件 / 只有文件」**并不等于**「只有 Root 正下方的文件」；更深层 `SubA\file-a.txt`、`SubA1\file-a1.txt` 仍可能吃到，除非你再加上 `NoPropagateInherit`。

### 6.3 加上 `NoPropagateInherit`：只影响「直接孩子」

在上一表任意「会继承」的组合上，再或上 `NoPropagateInherit`：

| 意图 | InheritanceFlags | PropagationFlags | 效果直觉 |
|------|------------------|------------------|----------|
| Root + 直接子文件夹 + 直接子文件，到此为止 | `CI \| OI` | `NoPropagateInherit` | `SubA`、`file-root.txt` 能拿到；`SubA1`、`file-a.txt` **不再**继续传 |
| 只约束直接子文件夹一层 | `ContainerInherit` | `NoPropagateInherit`（± `InheritOnly`） | 停在 `SubA`/`SubB`，不进 `SubA1` |
| 只约束直接子文件一层 | `ObjectInherit` | `NoPropagateInherit`（± `InheritOnly`） | 主要影响 `file-root.txt`；不会经由子文件夹继续给深层文件「续命」 |

`NP` 的实现含义是：孩子继承到 ACE 之后，**继承相关标志被清掉**，所以孙子看不到这条可再传播的模板。

### 6.4 用同一棵树「跑」几组组合

约定：在 `Root` 上给组 `CONTOSO\FinanceRO` 一条 **Allow 读取**。

#### A. `CI|OI` + `None`（最常见：整棵树）

```text
Root              ← 生效
file-root.txt     ← 生效（继承）
SubA              ← 生效
file-a.txt        ← 生效
SubA1 / file-a1   ← 生效
```

`icacls` 在 Root 上常看到类似：`(OI)(CI)`；子对象上常带 `(I)`。

#### B. `CI|OI` + `InheritOnly`（根目录自己不吃）

```text
Root              ← 不生效（IO）
下面整棵树        ← 与 A 类似地生效
```

适用：Root 只是挂载点/入口，权限策略只想约束「下面的内容」。

#### C. `ContainerInherit` + `None`（只管文件夹链）

```text
Root / SubA / SubA1   ← 生效
所有 .txt             ← 不因这条而获得权限
```

适用：统一「目录可遍历 / 可创建子目录」，文件权限另写一条 `OI`。

#### D. `ObjectInherit` + `None`（文件向，含隔代）

```text
Root              ← 生效
file-root.txt     ← 生效
SubA              ← 通常拿到 inherit-only 的 OI 模板（自身访问权未必等同）
file-a.txt 等     ← 仍可能生效
```

若你以为「只影响 Root 下的文件」，这里就会误解——请改用带 `NP` 的组合。

#### E. `CI|OI` + `InheritOnly|NoPropagateInherit`（当前不吃 + 只一层）

```text
Root              ← 不生效
SubA, SubB, file-root.txt  ← 生效后停止传播
SubA1, file-a.txt …        ← 不因这条继续获得
```

适用：临时项目目录、外包目录「只包一层，别污染更深业务树」。

### 6.5 怎么用（按意图选组合，而不是背枚举）

1. **部门共享根目录，整树只读**  
   → `ContainerInherit | ObjectInherit`，`PropagationFlags.None`  
   → GUI：该文件夹、子文件夹和文件  

2. **根是入口，规则从下一级开始**  
   → 同上 Inheritance，加上 `InheritOnly`  
   → GUI：只有子文件夹和文件  

3. **目录可进、文件权限另议**  
   → 一条 `ContainerInherit`；另条 `ObjectInherit`（权限位可以不同）  

4. **千万别让规则顺着深树爬**  
   → 加上 `NoPropagateInherit`；改完立刻在 `SubA1` 上 `icacls` 确认没有多余 `(I)`  

5. **改完验收**  
   - 资源管理器 → 有效访问  
   - `icacls Root /T` 看 `(OI)(CI)(IO)(NP)(I)`  
   - PowerShell：`Get-Acl` 看 `InheritanceFlags` / `PropagationFlags`  

### 6.6 .NET 怎么写

```csharp
using System.Security.AccessControl;
using System.Security.Principal;

var rule = new FileSystemAccessRule(
    identity: new NTAccount(@"CONTOSO\FinanceRO"),
    fileSystemRights: FileSystemRights.ReadAndExecute,
    inheritanceFlags: InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
    propagationFlags: PropagationFlags.None,   // 改成 InheritOnly / NoPropagateInherit 做实验
    type: AccessControlType.Allow);

var acl = Directory.GetAccessControl(@"D:\Share\Root");
acl.AddAccessRule(rule);
Directory.SetAccessControl(@"D:\Share\Root", acl);
```

只传一层且根自己不吃：

```csharp
inheritanceFlags: InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
propagationFlags: PropagationFlags.InheritOnly | PropagationFlags.NoPropagateInherit,
```

### 6.7 `icacls` 对照

```bat
:: 整树：等价 CI+OI，作用于当前并下传
icacls D:\Share\Root /grant CONTOSO\FinanceRO:(OI)(CI)RX

:: 去掉继承后再自己控（示例：先断开继承）
icacls D:\Share\Root /inheritance:d
```

Learn 文档中 `icacls` 的 `<perm>` 可带继承权利：`(OI)`、`(CI)`、`(IO)`、`(NP)` 等；`/inheritance:e|d|r` 则是开/关继承（启用、禁用并复制、禁用并移除已继承 ACE）。

官方示例里给共享目录授完全控制时，也常见 `:(CI)(OI)F` 这种写法——正是「容器 + 对象都继承」。

### 6.8 继承相关的实操坑

- **禁用继承**：复制 vs 移除（`/inheritance:d` vs `r`）后果完全不同——一个留下显式副本，一个可能把人锁在门外。  
- **显式 ACE + 继承 ACE 并存**：子项上看到两条并不奇怪；有效权限是合并/拒绝规则求值后的结果。  
- **Deny + 继承**：一条错误的「拒绝」挂在根上并 `CI|OI`，杀伤面是整棵树。  
- **只改 GUI「适用于」却不理解 IO/NP**：最容易出现「我给文件夹加了权限，深层文件没有 / 或反过来到处都有」。

---

## 8. 事故六：表面有权实际打不开 → 「有效权限」

继承、组嵌套、显式/继承混合、共享权限（下一节）、Deny……叠在一起后，人脑算不过来。

系统需要一个答案：**这个安全主体，对这个对象，最终到底能不能做 X？**

资源管理器高级安全设置里的 **有效访问（Effective Access）** 就是为此存在的。它不是新权限类型，而是**求值结果的可视化**。

运维建议：改完继承组合，不要只看 Root 上的 ACE 字面，打开一个深层文件跑一次有效访问。

---

## 9. 事故七：出了事要追责 → 发明 SACL

DACL 回答「能不能碰」。还有另一个需求：「谁碰过要记下来」。

安全描述符里的 **SACL（System ACL）** 管审计：成功/失败访问是否写入安全日志。它和 DACL 分开，避免「权限」和「审计」缠成一团。

---

## 10. 事故八：几百台机器账户不一致 → 发明域与域控

每台机器本地建用户、本地建组：入职要跑几十台，密码策略不统一，人走了残留账号。

集中身份的答案是 **Active Directory 域**：

- **域控制器（DC）** 保存账户、组、策略等目录数据，并应答认证/查询。  
- 人用**域账户**登录加入域的机器；权限可以授给 `域\用户` 或 `域\安全组`。  
- 文件服务器上的 ACL，主体从「本机用户」升级为「目录里的安全主体」。

安全描述符、DACL、ACE 这套模型不变，变的是**主体从哪来、在多少台机器间是否一致**。

---

## 11. 事故九：职能不同、高权不能滥用 → 安全组与最小权限

域里不要把业务权限直接授给个人，继续用组，而且分层更清楚，例如：

| 类型直觉 | 例子 | 用法 |
|----------|------|------|
| 业务安全组 | `G-Finance-RO`、`G-Dev-Modify` | 挂在文件/共享的 DACL 上 |
| 高特权组 | `Domain Admins` | 极度敏感；成员几乎等于域级管理员 |

Learn 对 **Domain Admins** 的提醒很明确：成员对域内计算机有广泛管理能力，必须严格保护。  
日常运维更常见的做法是：业务权限用专用安全组；高特权组保持空或极少人，并与日常账号分离。

再强调一次文档里的区分：

- **Permissions（权限）**：对某个对象（文件、共享、AD 对象）的 ACL 控制。  
- **User rights / privileges（用户权利/特权）**：如「作为服务登录」「备份文件」——偏**系统能力**，不是某一文件上的 ACE。

两者都要管，但不是同一旋钮。

---

## 12. 事故十：能连上共享却打不开文件 → 两道门

局域网场景常有第二道门：**共享权限（Share Permissions）** 与 **NTFS ACL**。

最终能否访问 ≈ **两道门都允许**（再叠加身份、组、Deny 等）。  
常见实践：共享权限放宽到「经过身份验证的用户 / 合适组：更改或完全控制」，细粒度放到 NTFS ACL——这样移动文件夹、备份还原时，真正细的规则仍跟着 NTFS 走。

官方脚本示例里也能看到同一思路：先 `ICACLS ... :(CI)(OI)F` 设 NTFS，再 `New-SmbShare -FullAccess ...` 设共享权限，两边主体对齐。

---

## 13. 事故十一：管理员日常挂高权 → 分权与 UAC（收束）

域管账号用来逛网页、开邮件，一旦中马，DACL 再完美也难救。

因此还有一层使用习惯上的设计：**高权与日常账号分离**，本机再用 UAC 把「提权」变成显式动作。它不是 ACL 的替身，而是降低「高权会话长期暴露」的配套。

---

## 14. 把整套设计串回一张图

```text
没有权限
  → 身份 + Owner
  → 登录：LSA 认证 → Access Token → 每次访问对表（共享还需网络登录 + 共享权限 ∩ NTFS）
  → 权限位（读/写/完全控制…）
  → 组（对人打包）
  → ACL = ACE 列表（Allow/Deny）→ DACL
  → 继承（OI/CI）+ 传播（IO/NP）← InheritanceFlags × PropagationFlags
  → 有效权限（求值可视化）
  → SACL（审计）
  → 域控 / AD（集中身份）
  → 安全组与最小权限（Privileges ≠ Permissions）
  → 共享权限 ∩ NTFS
  → 分权使用 / UAC
```

若只能记住「登录章」的三句话：

1. **登录成功是认证；能不能开共享是授权（令牌 SID 对对象 ACE）。**  
2. **LSA 发 Access Token（用户 SID + 组 SID + 用户权利），挂到你的进程上。**  
3. **访问 `\\server\share` 还要网络登录，并且共享权限与 NTFS 都放行。**

若只能记住继承专章的三句话：

1. **`InheritanceFlags` 决定传给文件夹还是文件（CI/OI）。**  
2. **`PropagationFlags` 决定当前吃不吃（IO）、传几层（NP）。**  
3. **`ObjectInherit` 会经由子文件夹把「文件向」规则送进更深层级——要截断就加 `NoPropagateInherit`。**

---

## 参考

### 登录 / 令牌 / 访问检查（第 2 章）

- [Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)（认证 vs 授权；interactive / network logon）  
- [Windows Authentication Architecture - LSA](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-architecture)  
- [Credentials processes in Windows authentication - LSA](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)  
- [Understand security principals - Access tokens / access control](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)  
- [Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)（令牌中的 SID / SIDHistory / 组 SID）  
- [whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami)（`whoami /all` 查看令牌）  
- [SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)（共享权限 + NTFS）  
- [SMB signing overview - Kerberos vs NTLM](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview)  
- [How User Account Control works](https://learn.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works)（管理员双令牌）  
- [Create a WindowsPrincipal](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)

### 身份 / Owner / ACL / 继承

- [Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)（Principal / SID / 安全描述符）  
- [Security identifiers (SID)](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)  
- [Owner Rights 特殊身份](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-special-identities-groups)  
- [takeown](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/takeown)  
- [FileSystemAclExtensions.SetAccessControl](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.setaccesscontrol)  
- [Privileged accounts and groups：Permissions 与 Deny](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)  
- [Active Directory security groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups)  
- [icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)（含 `(OI)/(CI)/(IO)/(I)` 等）  
- [cacls 输出中的 OI/CI/IO 说明](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cacls)  
- .NET：`NTAccount` / `SecurityIdentifier` / `FileSecurity.GetOwner|SetOwner`；`InheritanceFlags` / `PropagationFlags` / `FileSystemAccessRule`

---

下一步若要动手实验：在测试盘建与上文相同的 `Root\SubA\SubA1` 树，用六组标志各授一条唯一组，然后对每个节点 `icacls` 对照——比只看文档更快建立肌肉记忆。
