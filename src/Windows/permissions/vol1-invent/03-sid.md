---
title: "第 2 讲：SID——机器真正认的身份证号"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 2 讲：SID"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：SID 三性质（唯一、稳定、永不复用）在本机逐条实证——同机同前缀不同 RID（Administrator 永远 500）、改名 SID 不变、删了重建换新号；SID 字符串逐段拆解、Well-Known 通用 SID 认脸，以及 sIDHistory 这个「迁移后门」的攻与防。
---

# 第 2 讲：SID——机器真正认的身份证号

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)。

---

## 开场：权限规则该锚在什么上？

**🧑‍🏫 老师：**

第 1 讲的收尾留了个问题：账户可以改显示名、改登录名。若权限规则写死「名字叫 Alice 的人能读」，改名后规则全乱。更隐蔽的是：**删了 Alice、再建一个同名 Alice，系统并不认为她是「同一个人」**——否则旧 Alice 的权限会意外继承给新来的人，这是个安全漏洞。

所以权限规则必须锚定一个**改名不改、删了不回收、永不复用**的东西。这一讲就发明它。

**SID（Security Identifier，安全标识符）** 是操作系统用来标识安全主体（账户、组、计算机）的唯一值，账户或组创建时由权威（本地 SAM 或 Active Directory）分配（[Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)）。三个不可撼动的性质：

| 性质 | 含义 | 为什么要它 |
|------|------|-----------|
| **唯一** | 在其作用域（域或本机）内不重复 | 权限规则能精确指向"这一个主体" |
| **稳定** | 不随账户改名、改显示名而变 | 改名不破坏已有权限 |
| **不复用** | 删除账户后 SID 永久作废，**重建同名账户拿到全新 SID** | 杜绝"借尸还魂"式权限继承漏洞 |

类比：账户名 `CONTOSO\Alice` 是给人看的工牌，SID `S-1-5-21-…-1103` 是给机器用的身份证号——换工牌不换身份证。

这三条不是背的，本机逐条验证。先看本机的「SID 全家福」：

```powershell
PS> Get-LocalUser Administrator,Guest,LabUser1,LabUser2 | Format-Table Name,SID -AutoSize

Name          SID
----          ---
Administrator S-1-5-21-3515524382-1810956650-2183447911-500
Guest         S-1-5-21-3515524382-1810956650-2183447911-501
LabUser1      S-1-5-21-3515524382-1810956650-2183447911-1009
LabUser2      S-1-5-21-3515524382-1810956650-2183447911-1010
```

一眼能看到三件事：四个账户**共享同一个前缀** `S-1-5-21-3515524382-1810956650-2183447911`（这台机器的「机器 SID」）；**末尾 RID 各不相同**；而 **Administrator 永远是 500、Guest 永远是 501**——全 Windows 统一，改名也防不住「它还是 500」（第 1 讲的伏笔在这收掉）。

还有个对照值得盯：我自己（域账户）的 SID 是 `S-1-5-21-3977539503-3587586693-2971573549-279405`——**前缀和本机账户的前缀完全不同**。因为域账户的前缀是**域 SID**，本地账户的前缀是**机器 SID**：机器 SID ≠ 域 SID，这就是「本地账户和域账户在机器眼里天生是两拨人」的 SID 层解释。

---

## 第 1 课：会读这一串就够了

**🧑‍🏫 老师：**

SID 的标准字符串格式：

```
S-R-I-A-B-C-...
│ │ │ └──────────────┬───────────────┘
│ │ │     一串"子授权值"(Subauthorities)
│ │ │
│ │ └─ 标识符授权(Identifier Authority)：谁签发的
│ └─── 修订号(Revision)：始终是 1
└───── S 表示这是一个 SID
```

拿 LabUser2 的 `S-1-5-21-3515524382-1810956650-2183447911-1010` 逐段拆：

| 段 | 值 | 含义 |
|----|----|------|
| `S` | S | 这是一个 SID |
| `1` | 1 | 修订号（SID 规范版本，恒为 1） |
| `5` | 5 | 标识符授权 = **NT Authority**（Windows NT 安全体系） |
| `21` | 21 | 子授权之首：表示这是"域/机器账户"（而非内置通用主体） |
| `3515524382-1810956650-2183447911` | 三段 | **机器/域标识**：唯一定位一台机器或一个域 |
| `1010` | 1010 | **RID（Relative Identifier）**：在这台机器里你是第几号 |

> 🔑 **一句话拆解法**：`S-1-5-21-<域或机器的号>-<主体的号>`。前面一长串 = "你是哪个域/哪台机器的"，最后一段 RID = "在里面你是第几号"。

**🧑‍🎓 学生：** 那标识符授权除了 5 还有什么取值？我见过 `S-1-1-0` 这种短得多 的。

**🧑‍🏫 老师：**

第三段是微软预定义的**签发机构枚举**，认得就行：

| 取值 | 授权名称 | 代表谁 | 典型 SID |
|------|----------|--------|----------|
| **0** | Null Authority | "空"——SID 未知时的占位 | `S-1-0-0` |
| **1** | World Authority | **全员**，不问来路 | `S-1-1-0`（Everyone） |
| **2** | Local Authority | 本地登录的用户（物理控制台） | `S-1-2-0`、`S-1-2-1` |
| **3** | Creator Authority | 对象的**创建者**（ACL 占位） | `S-1-3-0`（Creator Owner） |
| **5** | **NT Authority** | **Windows NT 安全体系——日常主战场** | `S-1-5-*`（绝大多数） |
| **18** | Authentication Authority | 认证声明（较新） | `S-1-18-1` 等 |

口诀：**0 空、1 全员、2 本地、3 创建者、5 是 NT、18 是认证声明**。日常只关心 1 和 5。

辨析 `S-1-3-0`（Creator Owner）：它不是某个具体账户，而是 ACL 里的**占位 SID**——"谁创建的这个对象"。子项继承父权限时它会被**替换成实际创建者的 SID**（第 12 讲继承的伏笔）。

### Well-Known SIDs 认脸

有些 SID 不分配给具体账户，是 Windows **内置、所有机器都一样**的通用标识，后面写 ACL 会反复遇到：

| SID | 是谁 | 用途 |
|-----|------|------|
| `S-1-1-0` | **Everyone** | 所有人（含匿名）——`whoami /groups` 第一行就是它 |
| `S-1-5-11` | **Authenticated Users** | 所有通过认证的用户（比 Everyone 稍窄） |
| `S-1-5-18` | **Local System**（SYSTEM） | 操作系统自身，权限极高 |
| `S-1-5-32-544` | **Administrators** | 内置管理员组（`32` = Builtin 域，`544` = 组的 RID） |
| `S-1-5-21domain-512` | **Domain Admins** | 域管理员组 |

> 规律：**看到 `S-1-5-32-` 想到"内置通用组"，看到 `S-1-5-21-` 想到"具体某台机器/某个域的账户"**。

---

## 插问：三性质说「稳定、不复用」——真试过吗？

**🧑‍🎓 学生：** 你开场说改名 SID 不变、删了重建换新号——这两条能当场做实验吗？尤其第二条，听起来是最防「借尸还魂」的一条。

**🧑‍🏫 老师：**

都能，拿 LabUser2 和一个临时账号做。**实验一：改名**——把 LabUser2 改名再改回来，SID 前后对比：

```powershell
PS> Rename-LocalUser -Name LabUser2 -NewName LabUser2R
PS> (Get-LocalUser LabUser2R).SID.Value
S-1-5-21-3515524382-1810956650-2183447911-1010     # 改名后
PS> Rename-LocalUser -Name LabUser2R -NewName LabUser2
# 改回。前后 SID：
before: S-1-5-21-3515524382-1810956650-2183447911-1010
after : S-1-5-21-3515524382-1810956650-2183447911-1010
SAME —— 改名不改 SID
```

**实验二：删了重建**——建临时账号 LabTemp、记 SID、删掉、再建同名、再记、再删：

```text
first : S-1-5-21-3515524382-1810956650-2183447911-1012
second: S-1-5-21-3515524382-1810956650-2183447911-1013
DIFFERENT —— 同名重建，拿到的是全新 SID
```

名字一模一样，机器眼里是**两个人**：1012 已经作废，新来的是 1013。旧账号名下挂的所有权限不会、也不可能跟过来——「删号重建白拿权限」这条路被设计死了。（顺带一个细节：第一次实验里 RID 跳过了 1011——因为中间建 LabReaders 组时，**组也占了一个 RID**，账户和组在同一个发号器里排队。）

怎么看 SID：`whoami /user`（当前用户）；代码里 `WindowsIdentity.GetCurrent().User`。

---

## 第 2 课：sIDHistory——为迁移开的「多 SID 后门」

**🧑‍🏫 老师：**

SID「稳定、不复用」是好设计，但带来一个现实问题：**跨域迁移**怎么办？把用户从旧域 `OLD\Alice` 迁到新域 `NEW\Alice`，新账户拿的是新域前缀的全新 SID，而旧域里成千上万个文件的 ACL 上挂的全是旧 SID——两个 SID 在机器眼里毫无关系，Alice 一夜之间访问不了自己原来的任何文件。

AD 的解法是 **sIDHistory（SID 历史）**：迁移时把旧 SID **追加**到新账户的 `sIDHistory` 多值属性里，一个账户**同时持有新旧两个 SID**；登录时两个都进 access token——访问旧资源认旧 SID、新资源认新 SID，平滑过渡：

```text
   OLD 域                       NEW 域
   Alice                        Alice
   SID: S-1-5-21-OLD-5000       主 SID: S-1-5-21-NEW-1001   ← 新发的
                                sIDHistory:
                                  - S-1-5-21-OLD-5000       ← 旧 SID 追加

   旧文件 ACL: (S-1-5-21-OLD-5000, 允许读)    ← 没动
   Alice 登录 token: 含 NEW-1001 + OLD-5000   ← 两个都在 → 命中允许读 ✓
```

迁移的标准工具是微软 **ADMT**（Active Directory Migration Tool，3.2 是最后版本，跑在 Server 2019 上）。要点四条，缺一不可：

1. **两个硬前提**（[DsAddSidHistory API 的强制要求](https://learn.microsoft.com/en-us/windows/win32/ad/using-dsaddsidhistory)）：源/目标域都开**账户管理审计**；域间信任上**临时关闭 SID Filtering**（默认跨信任会剥掉外部域 SID——不过滤，迁移就白做）；
2. 迁移命令必须带 **`/MIGRATESSIDS:YES`** 才触发旧 SID 写入；
3. 验证：`Get-ADUser Alice -Properties sIDHistory` 应输出旧 SID，空 = 没迁上；
4. **用完即清**：迁移后逐步把资源 ACL 从旧 SID 换成新 SID，然后清空 sIDHistory、重开 SID Filtering。

**🧑‍🎓 学生：** 等等——「往账户里塞 SID 就能拿到那个 SID 的权限」？这不是权限提升的金矿吗？

**🧑‍🏫 老师：**

正是。**sIDHistory 注入攻击**：拿到域管权限的攻击者往普通用户的 `sIDHistory` 里塞进 `Domain Admins`（…-512）甚至 `Enterprise Admins` 的 SID——该用户下次登录，token 里就带着域管 SID，悄无声息拿到全域权限，而且账户名、主 SID 看起来全正常。微软[官方问答](https://learn.microsoft.com/en-us/answers/questions/1603745/why-migrating-user-sid-history-is-not-secure)直言 sIDHistory 本质上不安全，AD 安全社区把它列为重点审计项。

防御对号入座：

| 防御 | 怎么做 | 挡什么 |
|------|--------|--------|
| 审计 sIDHistory 异常 | 定期扫所有账户，含特权 SID（512/519/520）即告警 | 注入攻击 |
| 迁移后及时清理 | 资源重 ACL 后清空 sIDHistory | 残留后门 |
| 保持 SID Filtering 开启 | 非迁移期间一律默认开 | 跨域 SID 伪造 |
| 监控 `DsAddSidHistory` 调用 | 账户管理事件日志 | 任何 sIDHistory 写入 |

> 一句话收束：**SID「稳定、不复用」是 Windows 身份模型的根基；sIDHistory 是为迁移在这根基上开的一扇「多 SID」后门——好用，但必须用完即清、全程审计。**

---

## 收束

**你现在会了：**

- 稳定身份是 SID——唯一、稳定、**永不复用**（本机实证：改名 SAME、重建 1012→1013）。
- 会读 SID 字符串：`S-1-5-21-<域或机器的号>-<主体的号 RID>`；本机全家福里 500/501/1009/1010 就是活标本。
- 机器 SID ≠ 域 SID——本地账户与域账户前缀不同的根源。
- 认得通用 SID：Everyone / Authenticated Users / SYSTEM / Administrators（`32` 内置组、`21` 具体域/机）。
- 知道 `sIDHistory` 是迁移兼容的后门，也是安全审计点。

**下一讲才需要：** 代码或规则里写了账户名时，系统如何查出对应 SID——「名字 ↔ SID」的解析（LSA）。

---

<!-- chapter-nav:start -->
← 上一章：[第 1 讲：账户](./02-account.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 3 讲：名字 ↔ SID](./04-name-sid-lsa.md)
<!-- chapter-nav:end -->
