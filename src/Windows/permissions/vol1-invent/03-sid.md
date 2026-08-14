---
title: "第 2 讲：SID——机器真正认的身份证号"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 2 讲：SID"
order: 3
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

# 第 2 讲：SID——机器真正认的身份证号

### 麻烦

账户可以改显示名、改登录名。若权限规则写死「名字叫 Alice 的人能读」，改名后规则全乱。
更隐蔽的是：删了 Alice、再建一个同名 Alice，系统并不认为她是「同一个人」——否则旧 Alice 的权限会**意外继承**给新来的人，这是个安全漏洞。

所以权限规则必须锚定一个**改名不改、删了不回收、永不复用**的东西。这个东西就是 SID。

### 这一讲只发明：SID

**SID（Security Identifier，安全标识符）** 是操作系统用来标识安全主体（账户、组、计算机）的唯一值。账户或组在创建时由权威（本地 SAM 或 Active Directory）分配 SID。

三个不可撼动的性质（来自 [Microsoft Learn · Security Identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)）：

| 性质 | 含义 | 为什么要它 |
|------|------|-----------|
| **唯一** | 在其作用域（域或本机）内不重复 | 让权限规则能精确指向"这一个主体" |
| **稳定** | 不随账户改名、改显示名而变 | 改名不破坏已有权限 |
| **不复用** | 删除账户后 SID 永久作废，**重建同名账户会拿到全新 SID** | 杜绝"借尸还魂"式权限继承漏洞 |

类比：

| 给人看 | 给机器用 |
|--------|----------|
| 账户名 `CONTOSO\Alice` | SID `S-1-5-21-…-1103` |

> 改名像换工牌打印字；SID 像身份证号，不跟着换。删了账户再建同名账户，相当于"注销旧身份证、发一张全新号码的身份证"——尽管名字一样，机器眼里是两个人。

### SID 长什么样：会读这一串就够了

SID 的标准字符串格式（[官方文档](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)）：

```
S-R-I-A-B-C-...
│ │ │ └──────────────┬───────────────┘
│ │ │     一串"子授权值"(Subauthorities)
│ │ │
│ │ └─ 标识符授权(Identifier Authority)：谁签发的
│ └─── 修订号(Revision)：始终是 1
└───── S 表示这是一个 SID
```

以本机用户 Alice 的 SID `S-1-5-21-1001-2002-1103` 为例，拆开看：

| 段 | 值 | 含义 |
|----|----|------|
| `S` | S | 这是一个 SID |
| `1` | 1 | 修订号（SID 规范版本，目前恒为 1） |
| `5` | 5 | 标识符授权 = **NT Authority**（5 = Windows NT 安全体系；1 = World Authority，全员） |
| `21` | 21 | 子授权之首：**表示这是"域/机器账户"**（而非内置通用主体） |
| `1001-2002` | 1001、2002 | **域标识**（domain identifier）：唯一定位一个域或一台机器——本例即 Alice 所在机器/域的"身份证号" |
| `1103` | 1103 | **RID（Relative Identifier，相对标识符）**：在该域/机器内唯一定位"哪个主体"——1103 就是 Alice |

> 🔑 **一句话拆解法**：`S-1-5-21-<域或机器的号>-<主体的号>`。前面一长串（到倒数第二段）= "你是哪个域/哪台机器的"；最后一段 RID = "在该域/机器里你是第几号"。
>
> 同一台机器上所有本地账户、组、计算机**共享同一套域标识前缀**，只是末尾 RID 不同；不同机器/域则前缀不同。这就是为什么"看末尾 RID 就知道是不是同一主体、看前面就知道是不是同一域"。

> **一组机器共用一个"域前缀"**：加入 Active Directory 后，域里所有用户、组、计算机账户的 SID 前缀（`S-1-5-21-<域标识>-`）都一样，只靠末尾 RID 区分。本机账户则是机器装系统时生成的"机器 SID"做前缀——所以**机器 SID ≠ 域 SID**，本地账户和域账户的 SID 前缀不同。

#### 标识符授权的完整取值（认得就行）

第三段那个"标识符授权"（I）取值不止 5 一种，是微软预定义的**签发机构枚举**（[Well-known SIDs](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)）：

| 取值 | 授权名称 | 代表谁 | 典型 SID |
|------|----------|--------|----------|
| **0** | Null Authority | "空"——无成员，SID 未知时的占位 | `S-1-0-0` |
| **1** | World Authority | **全员**——所有用户，不问来路 | `S-1-1-0`(Everyone) |
| **2** | Local Authority | 本地登录的用户（物理终端/控制台） | `S-1-2-0`、`S-1-2-1` |
| **3** | Creator Authority | 对象的**创建者**（ACL 里做占位，继承用） | `S-1-3-0`(Creator Owner) |
| **5** | **NT Authority** | **Windows NT 安全体系**——日常账户/组的主战场 | `S-1-5-*`(绝大多数) |
| **18** | Authentication Authority | 认证声明（较新，绑定身份提供方信息） | `S-1-18-1` 等 |

> 记忆口诀：**0 空、1 全员、2 本地、3 创建者、5 是 NT（绝大多数）、18 是认证声明**。日常只关心 **1(Everyone)和 5(NT 体系)**，其余遇到再查。
>
> 辨析一下 `S-1-3-0`(Creator Owner)：它不是某个具体账户，而是 ACL 里的**占位 SID**——意思是"谁创建的这个对象"。子文件夹继承父权限时，Creator Owner 会**替换成实际创建者**的 SID。所以"创建者"是个授权范畴，不是固定的某个人。

### 几个要认得的"通用 SID"（Well-Known SIDs）

有些 SID 不是分配给具体账户的，而是 Windows **内置、所有机器都一样**的通用标识——后面写 ACL 会反复遇到，先认个脸熟：

| SID | 是谁 | 用途 |
|-----|------|------|
| `S-1-1-0` | **Everyone** | 所有人（含匿名） |
| `S-1-5-11` | **Authenticated Users** | 所有通过认证的用户（比 Everyone 稍窄） |
| `S-1-5-18` | **Local System**（SYSTEM） | 操作系统自身，权限极高 |
| `S-1-5-32-544` | **Administrators**（内置管理员组） | `32` = Builtin 域，`544` = 管理员组的 RID |
| `S-1-5-21domain-512` | **Domain Admins**（域管理员） | 域管组，域里的"超级管理员" |

> 注意规律：内置主体的 SID 以 `S-1-5-32-` 开头（`32` = Builtin 域），后接 RID；而某台机器/某个域的账户则以 `S-1-5-21-<机器或域的标识>-<RID>` 开头。**看到 `21` 想到"具体的域/机器"，看到 `32` 想到"内置通用组"。**

### 怎么看见

```bat
whoami /user
```

C#：

```csharp
WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.User);   // 当前用户的 SID
```

### 一个安全视角：sIDHistory（SID 历史）

SID"稳定、不复用"是好设计，但带来一个现实问题：**跨域迁移**时怎么办？

把用户从旧域 `OLD\Alice` 迁到新域 `NEW\Alice`，新账户拿的是**新域前缀的全新 SID**（如 `S-1-5-21-<新域>-1001`），而旧域里成千上万个文件、共享、数据库的 ACL 上挂的全是**旧 SID**（`S-1-5-21-<旧域>-5000`）。新 SID 和旧 SID 在机器眼里是**两个毫无关系的主体**——Alice 一夜之间访问不了自己原来的任何文件。

Active Directory 的解法是 **sIDHistory（SID 历史）** 属性：迁移时把旧 SID **追加**到新账户的 `sIDHistory` 多值属性里，让一个账户**同时持有新旧两个 SID**。用户登录时，KDC 把新旧 SID **都**塞进 access token，访问旧资源时系统认旧 SID、访问新资源认新 SID，**平滑过渡**。

```
   OLD 域                       NEW 域
   ──────                       ──────
   Alice                        Alice
   SID: S-1-5-21-OLD-5000       主 SID: S-1-5-21-NEW-1001  ← 新发的
                                sIDHistory:                  ← 历史区
                                  - S-1-5-21-OLD-5000        ← 旧 SID 追加进来
                                  （可有多个旧域的 SID）

   旧文件 ACL: (S-1-5-21-OLD-5000, 允许读)   ← 没动
   Alice 登录 token: 含 NEW-1001 + OLD-5000  ← 两个都在
   访问旧文件 → 系统 token 里找得到 OLD-5000 → 命中允许读 ✓
```

> 🔑 **一句话**：sIDHistory 是迁移期间的"身份软链接"——不改任何旧资源上的 ACL，靠在新账户上挂旧 SID，让旧权限继续生效。本质上是为兼容性开的"一个账户、多个 SID"的特例。

#### 怎么迁移：ADMT + sIDHistory 的完整步骤

迁移的标准工具是微软的 **ADMT（Active Directory Migration Tool）**。注意一个现实：**ADMT 3.2 是微软最后发布的版本**，官方支持运行在 Windows Server 2019 上（2024–2025 没有更新版本，仍是它）。下面是带 sIDHistory 的用户迁移全流程。

**前提：两个域（源域 = OLD，目标域 = NEW）之间要有信任关系**，且是跨林迁移（intra-forest 不支持 sIDHistory，必须是 inter-forest）。

**第一步 —— 满足两个硬性前提（缺一不可，否则 ADMT 直接拒绝迁移）**

这两个是 `DsAddSidHistory` API 的强制要求（[微软官方文档](https://learn.microsoft.com/en-us/windows/win32/ad/using-dsaddsidhistory)）：

| 前提 | 在哪做 | 怎么做 |
|------|--------|--------|
| **① 开启"账户管理审计"** | 源域 **和** 目标域都要 | 域控上设审计策略：`审核账户管理 → 成功`（ADMT 启动时会校验，没开就报"Could not verify auditing"） |
| **② 关闭 SID Filtering（SID 过滤）** | 域间信任上 | `netdom trust NEW /domain:OLD /enablesidhistory:Yes`（或设信任为 quarantine + 选择性放行） |

> **为什么这两个前提非开不可？**
> - **审计**：往别人账户里塞 SID 是敏感操作，微软要求全程留痕——`DsAddSidHistory` 会校验审计策略，没开就拒绝执行。
> - **关 SID Filtering**：默认情况下，跨信任传递 access token 时，**目标域会过滤掉"来自外部域的 SID"**（防伪造）。如果不过滤，sIDHistory 里的旧 SID 在跨域访问时会被剥离，迁移就白做了。所以**迁移期间必须临时关掉 SID Filtering**——这正是攻击面的根源（见后面安全视角）。

**第二步 —— 装好 PES（密码迁移，可选但常见）**

如果要连**密码**一起迁过来（让用户无感迁移，不改密码），需在**源域的某台域控**上安装 **PES（Password Export Server）** 服务，并用 ADMT 生成一个加密密钥对（公钥给 PES、私钥给 ADMT）。

**第三步 —— 用 ADMT 执行用户迁移**

ADMT 控制台 → User Account Migration Wizard，或在 ADMT 服务器上命令行（[关键坑](https://www.reddit.com/r/activedirectory/comments/1gv5ksy/)：命令行/脚本迁移时必须用**正确的运行上下文**，否则 sIDHistory 不写入）：

```bat
ADMT USER /OPTION:MIGRATE /SD:"OLD.local" /TD:"NEW.local" ^
        /PROG:Y /ENPASSWORD:Y /MIGRATESSIDS:YES
::                                  ↑ 这一行是关键：带上 sIDHistory
```

> `MIGRATESSIDS:YES` 才会触发 `DsAddSidHistory`，把旧 SID 写进新账户的 `sIDHistory`。漏了这个参数，账户迁过去了但旧权限全断。

**第四步 —— 验证迁移成功**

在目标域控上查任意一个迁过来的账户，看 `sIDHistory` 是否真的写进去了：

```powershell
# PowerShell：查 Alice 的 sIDHistory
Get-ADUser Alice -Properties sIDHistory | Select-Object -ExpandProperty sIDHistory
# 应输出旧域的 SID（如 S-1-5-21-OLD-5000）；空 = 没迁成功
```

或用 `dsa.msc`（AD 用户和计算机）→ 属性 → 对象 → 属性编辑器 → 查 `sIDHistory`。

**第五步 —— 迁移完成后的关键动作**

| 动作 | 为什么 |
|------|--------|
| **重新 ACL 资源**（把旧 SID 替换成新 SID） | 最终目标：让新 SID 直接拥有权限，不再依赖 sIDHistory |
| **清理 sIDHistory** | sIDHistory 是为迁移开的"后门"，**不应长期残留**（见下） |
| **重新开启 SID Filtering** | 迁移结束恢复信任的安全默认值 |

> 整套流程的核心心智：**sIDHistory 是迁移期间的临时桥梁，不是永久身份**。正确的迁移是"先靠 sIDHistory 平滑过渡 → 逐步把 ACL 从旧 SID 换成新 SID → 最后清掉 sIDHistory"。

#### 安全视角：为什么 sIDHistory 是攻击面

前面那个"迁移期间临时关闭 SID Filtering + 新账户挂旧 SID"的组合，在攻击者眼里就是个**权限提升的金矿**：

- **sIDHistory 注入攻击**：攻击者（已拿到域管或高权限）往一个普通用户的 `sIDHistory` 里**塞进 `Domain Admins`（`S-1-5-21domain-512`）甚至 `Enterprise Admins` 的 SID**。该用户下次登录时，token 里就带上了域管 SID，**悄无声息拿到全域/全林管理员权限**——而且账户名、主 SID 看起来都正常，极难发现。
- 这就是为什么微软 [官方问答](https://learn.microsoft.com/en-us/answers/questions/1603745/why-migrating-user-sid-history-is-not-secure) 直言"sIDHistory 本质上不安全"，以及 AD 安全社区（如 ADSecurity.org）把它列为**重点审计项 + 攻击者持久化手段**。

**防御动作（每条都对应一个攻击路径）**：

| 防御 | 怎么做 | 挡的是什么 |
|------|--------|-----------|
| **审计 sIDHistory 异常** | 定期扫所有账户的 `sIDHistory`，凡含特权 SID（512/519/520 等）立即告警 | 注入攻击 |
| **迁移后及时清理** | 迁移完成、资源重 ACL 后，清空 `sIDHistory` | 残留后门 |
| **保持 SID Filtering 开启** | 非迁移期间，信任一律保持 SID Filtering 默认开启 | 跨域 SID 伪造 |
| **监控 `DsAddSidHistory` 调用** | 源/目标域审计策略开着，关注"账户管理"事件日志 | 任何 sIDHistory 写入 |

> 一句话收束：**SID"稳定、不复用"是 Windows 身份模型的根基；sIDHistory 是为迁移在这根基上开的一扇"多 SID"后门——好用，但必须用完即清、全程审计。** 这条线放这儿，是为了让你第一讲就知道：身份越"硬"的设计，越要警惕为兼容性而开的口子。


### 收束

**你现在会了：**
- 稳定身份是 SID——唯一、稳定、**永不复用**（删了重建同名，SID 不同）。
- 会读 SID 字符串：`S-1-5-21-<域或机器的号>-<主体的号 RID>`。
- 认得几个通用 SID：Everyone / Authenticated Users / SYSTEM / Administrators。
- 知道 `sIDHistory` 是迁移兼容的后门，也是安全审计点。

**下一讲才需要：** 代码或规则里写了账户名时，系统如何查出对应 SID——即"名字 ↔ SID"的解析（LSA）。

<!-- chapter-nav:start -->
← 上一章：[第 1 讲：账户](./02-account.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 3 讲：名字 ↔ SID](./04-name-sid-lsa.md)
<!-- chapter-nav:end -->
