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
② 粗粒度不够 → 权限位（读/写/改）
③ 人太多 → 组
④ 规则冲突 → ACL（Allow/Deny 列表）
⑤ 目录太深 → 继承；两套旋钮 InheritanceFlags / PropagationFlags（重点）
⑥ 看不清结果 → 有效权限；还要审计 → SACL
⑦ 机器太多 → 域控与安全组
⑧ 两道门与分权 → 共享权限 ∩ NTFS、特权 vs 权限、UAC
```

概念与命令对照以 Microsoft Learn（Windows Server / `icacls` / AD 安全主体与安全组）为准；.NET 侧用 `System.Security.AccessControl` 的 `InheritanceFlags` / `PropagationFlags` 描述同一套 ACE 标志。

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

但模型仍然太粗：**只有「主人 / 非主人」远远不够协作。** 同事需要能读不能改——于是下一事故逼我们发明权限位。

---


## 2. 事故二：要协作又不能乱改 → 发明「权限位」

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

## 3. 事故三：人来人走管不过来 → 发明「组」

财务部 30 人，都要对 `F:\报表` 只读。人入职离职时，你不想改 30 条文件规则。

做法：对人打包成 **组（Group）**，权限授给组。人进组就有权，出组就丢掉。

Microsoft Learn 对安全组的表述很直接：权限授给安全组而不是个人，管理更简单；成员自动继承组上的权限。

本机有 `Users`、`Administrators` 等；进域之后还有 `Domain Users`、`Domain Admins` 等——后文再展开。

新问题：规则变成一张**列表**，而且会出现「既允许又拒绝」。

---

## 4. 事故四：规则打架 → 发明 ACL（DACL）与 ACE

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

## 5. 事故五：目录太深设不过来 → 发明「继承」

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

## 6. 重点：`InheritanceFlags` × `PropagationFlags` 到底在控制什么

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

## 7. 事故六：表面有权实际打不开 → 「有效权限」

继承、组嵌套、显式/继承混合、共享权限（下一节）、Deny……叠在一起后，人脑算不过来。

系统需要一个答案：**这个安全主体，对这个对象，最终到底能不能做 X？**

资源管理器高级安全设置里的 **有效访问（Effective Access）** 就是为此存在的。它不是新权限类型，而是**求值结果的可视化**。

运维建议：改完继承组合，不要只看 Root 上的 ACE 字面，打开一个深层文件跑一次有效访问。

---

## 8. 事故七：出了事要追责 → 发明 SACL

DACL 回答「能不能碰」。还有另一个需求：「谁碰过要记下来」。

安全描述符里的 **SACL（System ACL）** 管审计：成功/失败访问是否写入安全日志。它和 DACL 分开，避免「权限」和「审计」缠成一团。

---

## 9. 事故八：几百台机器账户不一致 → 发明域与域控

每台机器本地建用户、本地建组：入职要跑几十台，密码策略不统一，人走了残留账号。

集中身份的答案是 **Active Directory 域**：

- **域控制器（DC）** 保存账户、组、策略等目录数据，并应答认证/查询。  
- 人用**域账户**登录加入域的机器；权限可以授给 `域\用户` 或 `域\安全组`。  
- 文件服务器上的 ACL，主体从「本机用户」升级为「目录里的安全主体」。

安全描述符、DACL、ACE 这套模型不变，变的是**主体从哪来、在多少台机器间是否一致**。

---

## 10. 事故九：职能不同、高权不能滥用 → 安全组与最小权限

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

## 11. 事故十：能连上共享却打不开文件 → 两道门

局域网场景常有第二道门：**共享权限（Share Permissions）** 与 **NTFS ACL**。

最终能否访问 ≈ **两道门都允许**（再叠加身份、组、Deny 等）。  
常见实践：共享权限放宽到「经过身份验证的用户 / 合适组：更改或完全控制」，细粒度放到 NTFS ACL——这样移动文件夹、备份还原时，真正细的规则仍跟着 NTFS 走。

官方脚本示例里也能看到同一思路：先 `ICACLS ... :(CI)(OI)F` 设 NTFS，再 `New-SmbShare -FullAccess ...` 设共享权限，两边主体对齐。

---

## 12. 事故十一：管理员日常挂高权 → 分权与 UAC（收束）

域管账号用来逛网页、开邮件，一旦中马，DACL 再完美也难救。

因此还有一层使用习惯上的设计：**高权与日常账号分离**，本机再用 UAC 把「提权」变成显式动作。它不是 ACL 的替身，而是降低「高权会话长期暴露」的配套。

---

## 13. 把整套设计串回一张图

```text
没有权限
  → 身份 + Owner
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

若只能记住继承专章的三句话：

1. **`InheritanceFlags` 决定传给文件夹还是文件（CI/OI）。**  
2. **`PropagationFlags` 决定当前吃不吃（IO）、传几层（NP）。**  
3. **`ObjectInherit` 会经由子文件夹把「文件向」规则送进更深层级——要截断就加 `NoPropagateInherit`。**

---

## 参考

- [Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)（Principal / SID / 安全描述符）  
- [Security identifiers (SID)](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)  
- [Owner Rights 特殊身份](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-special-identities-groups)  
- [takeown](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/takeown)  
- [Create a WindowsPrincipal（WindowsIdentity.GetCurrent）](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)  
- [FileSystemAclExtensions.SetAccessControl](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.setaccesscontrol)  
- [Privileged accounts and groups：Permissions 与 Deny](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)  
- [Active Directory security groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups)  
- [icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)（含 `(OI)/(CI)/(IO)/(I)` 等）  
- [cacls 输出中的 OI/CI/IO 说明](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cacls)  
- .NET：`NTAccount` / `SecurityIdentifier` / `FileSecurity.GetOwner|SetOwner`；`InheritanceFlags` / `PropagationFlags` / `FileSystemAccessRule`

---

下一步若要动手实验：在测试盘建与上文相同的 `Root\SubA\SubA1` 树，用六组标志各授一条唯一组，然后对每个节点 `icacls` 对照——比只看文档更快建立肌肉记忆。
