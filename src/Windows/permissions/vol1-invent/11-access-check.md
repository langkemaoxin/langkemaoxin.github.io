---
title: "第 10 站：访问检查——令牌如何对上规则（含网络共享两道门）"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 10 站：访问检查"
order: 11
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

# 第 10 站：访问检查——令牌如何对上规则（含网络共享两道门）

### 麻烦

令牌有了，DACL 有了，中间怎么判「能不能开」？  
真实协作里路径还常是 `\\服务器\共享\...`——本机对表之外，网络上还会多几步。用一个真实场景把抽象对表变成可操作的自查。

### 这一站只发明：访问检查（Access Check）

主体（你的进程）尝试访问客体（文件/文件夹）时，系统比较：

> **令牌里的 SID** ↔ **对象安全描述符里的 ACE**

据此做出允许或拒绝。  
来源：[Understand security principals - Authorization and access control](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

```text
[你的进程] 带着 Access Token（用户 SID + 组 SID + …）
        │
        ▼
   Access Check
        │
        ▼
[文件/文件夹] 带着 DACL（一条条 ACE）
```

要点（先立住）：

- **不是登录时算一次贴脑门**，而是**每次访问对象时现场对表**  
- 令牌里**任一相关 SID**（用户或组）都可能命中某条 ACE  
- 无匹配 ACE → 不能访问；Deny 通常压过 Allow（第 9 站）

对本机路径（如 `D:\Share\Q1.xlsx`），大体就是上面这一道 **NTFS Access Check**。  
对网络 UNC，还要先认清地址与协议，再补上「认身份」和「共享门」——下面按顺序发明。

### 10.0 先认两个词：UNC 与 SMB

例子会用到 `\\jzfz18\...`。动手对表之前，先把两个词立住。

#### 本机路径 vs 网络路径

| 写法 | 文件实际在哪 |
|------|----------------|
| `D:\Share\Q1.xlsx` | **本机**磁盘上的文件夹 |
| `\\jzfz18\协同设计平台-18\CD-2013388` | **另一台电脑**（`jzfz18`）上的文件夹 |

资源管理器里两者看起来都像「打开文件夹」，但第二种要**经网络**去别人机器上取目录列表。

#### UNC 是什么

**UNC（Universal Naming Convention，通用命名约定）** 是 Windows 里书写「网络上某个共享位置」的标准格式，常见形态：

```text
\\服务器名\共享名\后面的目录或文件...
```

对照本例：

```text
\\jzfz18\协同设计平台-18\CD-2013388
   │         │                │
   │         │                └─ 共享里面的子路径（项目文件夹）
   │         └─ 共享名（服务器上「挂出来」给别人用的入口名）
   └─ 服务器计算机名（或主机名）
```

所以：UNC **不是一种权限**，而是一种**地址写法**——告诉系统「去哪台机器、进哪个共享、再往下哪条路径」。

#### SMB 是什么

**SMB（Server Message Block）** 是 Windows 环境里做**文件共享与数据访问**的核心协议：让客户端像访问本地文件夹一样，去读写服务器上共享出来的文件。  
来源：[SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)

直觉分工：

| 概念 | 角色 |
|------|------|
| **共享（Share）** | 管理员在服务器上把某个本地文件夹「挂出去」，起一个共享名 |
| **SMB** | 本机与服务器之间，用来传「列目录、读文件」等请求的协议 |
| **UNC** | 你在地址栏里写的那个 `\\服务器\共享\...` 地址 |

串成一句：

> **UNC 是门牌号；SMB 是路上跑的协议；共享名是服务器上开给别人的入口。**

管理员在 `jzfz18` 上把某个目录共享为 `协同设计平台-18` 之后，你在本机用 UNC 访问，底层通常就是走 SMB。

### 10.1 例子：先对 NTFS 这道门——`\\jzfz18\协同设计平台-18\CD-2013388`

假设你在本机资源管理器地址栏输入（或双击）：

```text
\\jzfz18\协同设计平台-18\CD-2013388
```

问的是：**我究竟能不能打开这个文件夹？中间发生了什么？**

#### ① 这不是「只读本机硬盘」

由上一小节可知：这是 **UNC 地址**，目标在服务器 `jzfz18` 的共享 `协同设计平台-18` 下，访问时经 **SMB** 协议到达对方机器。  
因此比打开 `D:\某文件夹` 多几步：本机要向服务器证明「我是谁」，再过共享门，最后仍要对**该文件夹的 NTFS DACL** 做 Access Check。

本小节先把 **NTFS 对表**做透（你本机就能用 `whoami` + `icacls` 自查）。  
**网络登录**与**共享权限**紧接着在 10.2 / 10.3 补上——读完本站才算把 UNC 打开路径讲完整。

SMB 侧文档也写明：访问控制由 **NTFS permissions** 与 **share permissions** 共同管理。  
来源：[SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)

#### ② 时序（小白话，整站读完后应对得上）

```text
本机 explorer.exe（带着你的 Access Token）
        │
        ▼
 连接 \\jzfz18\协同设计平台-18\...
        │
        ├─（10.2）向 jzfz18 证明身份 → 服务器侧得到「你是 JZFZ\某人」
        ├─（10.3）过共享权限这一道门
        │
        ▼
 对本路径做 NTFS Access Check（10.1 详练）
        │  用「你的令牌里的 SID 集合」
        │  去对「该文件夹安全描述符里的 DACL」
        ▼
   允许列目录/进入  或  拒绝访问
```

#### ③ 先看门上贴了什么：`icacls` 读 DACL

对共享下某一级目录（示例曾用到 `...\CD-2013388\XREF\A`，根路径同理可查）执行：

```bat
icacls "\\jzfz18\协同设计平台-18\CD-2013388"
```

典型输出里会出现类似（节选，完整样例见第 9 站）：

```text
JZFZ\CD-2013388_项目组:(I)(OI)(CI)(RX,WD,WEA,WA)
JZFZ\CD-2013388_设总:(I)(OI)(CI)(F)
JZFZ\成都协同平台只读组:(I)(OI)(CI)(RX)
BUILTIN\Administrators:(I)(F)
NT AUTHORITY\SYSTEM:(I)(OI)(CI)(F)
... 以及若干个人账户的 (RX) ...
```

怎么读这些记号（完整表与实测见**第 12 站**；本处够用）：

| 记号 | 含义 |
|------|------|
| `(I)` | 继承来的 ACE |
| `(OI)(CI)` | 可继续向子文件/子文件夹继承（第 12 站细讲） |
| `(F)` | 完全控制 |
| `(RX)` | 读取和执行（通常够「打开文件夹、列目录、读文件」） |
| `(RX,WD,…)` | 在读执行之外还有写数据等（项目组比「只读组」更宽） |

#### ④ 再看你口袋里有什么：本机令牌

在**同一台已登录的电脑**上：

```bat
whoami
whoami /groups
```

以本机实测为例（作者环境）：

```text
用户：jzfz\chengongyi

令牌里与本路径相关的组（节选）：
  JZFZ\成都协同平台只读组
  JZFZ\CD-2013388_项目组
  JZFZ\CD-2013388_设总
  … 以及其它项目组 …
```

#### ⑤ 对表：NTFS 这道门我能不能过？

Access Check 的白话做法：

1. 取出令牌里的用户 SID + 所有组 SID；  
2. 看 DACL 里有没有 **Allow** 且 SID 命中的 ACE，权限是否覆盖「列目录 / 读取」；  
3. 再看有没有命中的 **Deny**（有则通常直接否决冲突的允许）。

对本例：

| 令牌里有的组 | DACL 上对应 ACE | 对「打开文件夹」的含义 |
|--------------|-----------------|------------------------|
| `成都协同平台只读组` | `(RX)` | 通常**可以**进入、列出、读取 |
| `CD-2013388_项目组` | `(RX,WD,…)` | 可读，且比只读组更多写相关能力 |
| `CD-2013388_设总` | `(F)` | **完全控制**（在 NTFS 这层很宽） |

结论（就 **NTFS Access Check** 而言）：  
当前令牌已命中多条 Allow，且未见针对你的显式 Deny → **NTFS 这道门可以过**。  
若最终仍打不开，优先怀疑 10.3 的**共享门**（或 10.2 身份未在服务器侧成立）。

若换一个**令牌里既不在项目组、也不在只读组、也不在设总**的域账户去开同一路径：DACL 上没有匹配 ACE → 按第 9 站直觉 → **不能访问**（表现为拒绝访问），除非共享/NTFS 上另有其它命中规则。

#### ⑥ 你自己以后怎么判 NTFS 门（复制即用）

```bat
:: 1) 我是谁、带着哪些组
whoami
whoami /groups

:: 2) 目标路径门上贴了谁
icacls "\\jzfz18\协同设计平台-18\CD-2013388"

:: 3) 肉眼对表：groups 输出里的 JZFZ\某组 是否出现在 icacls 的 Allow 行
::    - 有 (RX)/(R)/(F) 等且无针对你的 Deny → NTFS 门多半过
::    - 完全对不上 → 多半卡在 NTFS；对得上仍进不去 → 查共享门（10.3）
```

### 10.2 网络登录：向服务器证明「我是谁」

访问网络资源时，还会发生 **network logon（网络登录）**：用已有凭据向网络服务证明身份，通常不再弹框。机制可包括 Kerberos、NTLM 等。  
来源：[Windows logon scenarios - Network logon](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)

和本机交互式登录（第 4 站）的差别（直觉即可）：

| | 交互式登录（坐在电脑前） | 网络登录（访问 `\\服务器\...`） |
|--|--------------------------|----------------------------------|
| 何时 | 开机/切换用户时 | 连共享时 |
| 结果 | 本机得到 Access Token | 服务器侧认可「请求来自某账户」 |

SMB 更推荐用**主机名**走 Kerberos；用 IP 等容易落到 NTLM。  
来源：[SMB signing overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview)

域账户与「票据怎么换」放到第 15、16 站；此处先接受：**UNC 打开前，服务器必须先认清你是谁。**

### 10.3 两道门：共享权限 ∩ NTFS

SMB 访问控制由 **共享权限（share permissions）** 与 **NTFS 权限** 共同管理——两道门都要过，取更严的那一侧（直觉：任一门拒绝就不放行）。  
来源：[SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)

| 现象 | 常见直觉 |
|------|----------|
| 一个共享能进、另一个不能 | 共享权限或该共享根 NTFS 对你令牌里的 SID 不允许 |
| 共享能进、深层文件夹不能 | 共享门过了，子目录 NTFS ACE 拦住（正是 10.1 那种对表） |
| 在组里仍进不去 | 令牌未刷新、Deny、或只过了一道门 |

```text
\\server\share\path
  → 网络登录（10.2：向服务器证明你是谁）
  → 共享权限检查（10.3：第一道门）
  → 目标路径 NTFS DACL 检查（10.1：第二道门，令牌 SID 对 ACE）
  → 都过才打开
```

所以：

- 10.1 用 `whoami` + `icacls` 查的是 **第二道门（NTFS）**  
- 共享权限在服务器「共享属性 → 权限」里配置，**不一定**等于该文件夹的 NTFS DACL  
- 官方示例常同时：`ICACLS ... :(CI)(OI)F` 与 `New-SmbShare -FullAccess ...`  
  来源：[Storage Spaces Direct 示例](https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/deploy-storage-spaces-direct)

回扣开篇麻烦：本机令牌齐了，仍可能 `\\fileserver\财务` 能开、`\\fileserver\研发` 不能——往往是**共享门或该共享根上的 NTFS** 对你的 SID 放行情况不同。

### 收束

**你现在会了：**

- Access Check = 每次访问时用令牌 SID 对对象 DACL；  
- UNC = 网络路径写法；SMB = 文件共享协议；共享名 = 服务器入口；  
- 打开 UNC ≈ 网络登录 + **共享门 ∩ NTFS 门**；  
- 用 `whoami /groups` + `icacls` 自查 NTFS 门；对得上仍进不去时查共享门。

**下一站才需要：** Owner 与 DACL 在对象上如何放进同一份安全描述符结构里。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 9 站：ACE 与 DACL](./10-ace-dacl.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 11 站：安全描述符](./12-security-descriptor.md)
<!-- chapter-nav:end -->
