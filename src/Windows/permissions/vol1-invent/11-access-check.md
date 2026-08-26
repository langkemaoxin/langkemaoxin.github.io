---
title: "第 10 讲：访问检查——令牌如何对上规则（含网络共享两道门）"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 10 讲：访问检查"
order: 11
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：Access Check = 每次访问时拿令牌里的 SID 对 DACL 逐条查。以 LabUser1/2 真实身份跑六连裁决——组命中放行、无匹配拒绝、Deny 按位交集否决（deny W 连读都咬、deny WD 只咬写的对照实验）；UNC/SMB 与共享两道门认脸。
---

# 第 10 讲：访问检查——令牌如何对上规则（含网络共享两道门）

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)——第 9 讲造好的那张 DACL，这一讲拿来真刀真枪对表。

---

## 开场

**🧑‍🏫 老师：**

令牌有了（第 5 讲），DACL 有了（第 9 讲），中间怎么判「能不能开」？这就是**访问检查（Access Check）**：主体（你的进程）尝试访问客体时，系统比较——

> **令牌里的 SID ↔ 对象 DACL 里的 ACE**

```text
[你的进程] 带着 Access Token（用户 SID + 组 SID + …）
        │
        ▼
   Access Check（每次访问时现场发生）
        │
        ▼
[文件/文件夹] 带着 DACL（一条条 ACE）
```

三个要点先立住：

- **不是登录时算一次贴脑门**，而是**每次访问对象时现场对表**；
- 令牌里**任一 SID**（用户的或组的）都可能命中某条 ACE；
- 无匹配 ACE → 不能访问；Deny 压过 Allow（第 9 讲的三条直觉，这讲全部实测）。

---

## 第 1 课：本机这道门——六连裁决

**🧑‍🏫 老师：**

第 9 讲的 Q1.txt 上贴着这张表（后来精简过 Deny）：

```text
C:\Lab\acetest\Q1.txt PC3507\LabUser2:(DENY)(S,WD)     ← 拒绝 LabUser2 写数据
                      JZFZ\chengongyi:(F)
                      PC3507\LabReaders:(RX)            ← 允许组读执行
                      PC3507\LabUser2:(R)               ← 允许 LabUser2 读
```

现在把「来访者」换真人：以 LabUser1（在 LabReaders 组）和 LabUser2（组外、表上有自己的条目）的凭证各起进程，真实跑一遍。**先看令牌**——LabUser1 的口袋里有什么：

```text
PS>（以 LabUser1 身份）whoami /groups | findstr LabReaders
PC3507\LabReaders    别名   S-1-5-21-...-1011   必需的组,启用于默认,启用的组
```

组 SID 在令牌里 ✓。然后逐个裁决（全部本机实测）：

| # | 来访者 | 操作 | 结果 | 命中了哪条 |
|---|--------|------|------|-----------|
| ① | LabUser1 | `type Q1.txt` | **`hello`** ✓ | 令牌里的**组 SID** 命中 `LabReaders:(RX)` |
| ② | LabUser2 | `type Q1.txt` | **`hello`** ✓ | 自己的 `LabUser2:(R)` |
| ③ | LabUser2 | `echo XMARK>>Q1.txt` | **拒绝访问** ✗ | `(DENY)(WD)` 咬住写数据位——Deny 压过它自己的 `(R)` |
| ④ | LabUser2 | `echo YMARK>>public.txt` | **YMARK 落盘** ✓ | Q1 拒它、public 收它——**对表是对单个对象的**（public 的继承 ACL 给 Authenticated Users 修改权） |
| ⑤ | LabUser2 | `type nobody.txt` | **拒绝访问** ✗ | nobody.txt 的表上只有 SYSTEM 和我——**无匹配 ACE → 默认拒绝** |

五连裁决把第 9 讲的三条直觉全部变成了实测：**组 SID 命中放行（①）；无匹配拒绝（⑤）；Deny 压过 Allow（③）；而且每张表各管各的对象（③④对照）**。验证 ③ 之后我还回读了 Q1 内容——还是 `hello`，XMARK 根本没进去，「拒绝」是真拒绝。

**🧑‍🎓 学生：** 这个我能自己复用吗？

**🧑‍🏫 老师：**

对表工作流三步，复制即用：

```bat
whoami /groups          :: 1) 我口袋里有哪些 SID
icacls <目标路径>        :: 2) 门上贴了谁、给了什么
                        :: 3) 肉眼对表：groups 里的组名出现在 Allow 行吗？有针对你的 Deny 吗？
```

---

## 插问 1：等一下——我之前用 `(W)` 做 Deny 时，LabUser2 连「读」都被拒了？

**🧑‍🎓 学生：** 有个细节吓到我：最初那张表上是 `(DENY)(W)`（拒绝「写入」套餐），LabUser2 执行 `type` 读文件居然也报拒绝访问。Deny 一个「写」，怎么把「读」也咬死了？

**🧑‍🏫 老师：**

好眼力——这正是 Access Check 最反直觉的一层：**Deny 不是「按套餐对套餐」，是按位交集**。裁决的真实规则是：

> **你这次打开文件所请求的访问（一组位）∩ Deny ACE 的掩码（一组位）≠ 空 → 直接否决。**

关键在两点：一，字母 `W` 只是给人看的别名，它展开的掩码**比直觉宽**——含写数据、追加、写属性等一整组位；二，**程序打开文件时请求的访问也常常比直觉宽**——很多读操作顺带请求一些附加位。两边一交集，「deny 写」就误伤了「读」。我把 Deny 从 `(W)` 换成精确的 `(WD)`（只咬「写数据」一个位）后重测，对照鲜明：

| DACL 上的 Deny | LabUser2 读 | LabUser2 追加写 |
|---|---|---|
| `(DENY)(W)`（宽掩码） | **拒绝**（误伤） | 拒绝 |
| `(DENY)(S,WD)`（精确位） | **`hello` ✓** | 拒绝 |

结论两条：**① Deny 越窄越安全**——要拒绝什么就精确拒绝那一位，别随手 Deny 整个套餐；**② 排障时别信字母，信掩码**——`icacls` 里那个字母背后的位集（SDDL 里的十六进制，第 9 讲见过）才是裁决的真相。

---

## 第 2 课：网络那半边——UNC、SMB 与两道门

**🧑‍🏫 老师：**

真实协作里路径常是 `\\服务器\共享\...`——比本机多几步。先立三个词：

| 概念 | 角色 |
|------|------|
| **共享（Share）** | 管理员在服务器上把某本地文件夹「挂出去」、起个入口名 |
| **SMB** | 本机与服务器之间传「列目录、读文件」等请求的协议 |
| **UNC** | 你在地址栏写的 `\\服务器\共享\...` **地址写法**（不是权限） |

> **UNC 是门牌号；SMB 是路上跑的协议；共享名是服务器开给别人的入口。**

`D:\Share\Q1.xlsx` 是本机磁盘，打开只过 NTFS 一道对表；`\\jzfz18\协同设计平台-18\...` 是 UNC——访问时序多出两步：

```text
本机 explorer.exe（带着你的 Access Token）
        ├─（2）网络登录：向服务器证明你是谁（Kerberos/NTLM——第 4 讲的网络类型 3，
        │      本机 4624 日志里那 29 条 LogonType 3 就是这类）
        ├─（3）共享权限这道门（第一道）
        ▼
 对该路径做 NTFS Access Check（第二道，就是第 1 课那套对表）
        ▼
   都过才打开
```

**两道门取更严**（[SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)）：共享门在服务器「共享属性 → 权限」里配，**不一定**等于文件夹的 NTFS DACL。经典踩坑：NTFS 给了完全控制、共享权限还是默认「读取」——对方通过网络只能读；改半天 NTFS 没反应，因为被共享门卡住。老运维的省心做法：**共享权限一律 Everyone 完全控制，所有限制交给 NTFS**——只维护一套。

本机把共享这道门真开了一次（实测输出）：

```powershell
PS> New-SmbShare -Name LabShare -Path C:\Lab -ReadAccess Everyone
PS> Get-SmbShareAccess -Name LabShare

Name     AccountName          AccessControlType     AccessRight
----     -----------          -----------------     -----------
LabShare Everyone             Allow                  Read
```

想完整演示「同一用户、本地路径能写、UNC 路径被共享门拦」的对照，需要真的从 SMB 客户端连进来——我这台机器上用凭据进程走回环 UNC（`\\PC3507\...`、`\\localhost\...`）都报「系统找不到指定的路径」（此环境的回环限制），**这个对照实验留给有第二台机器或虚机的读者**：`New-SmbShare -ReadAccess Everyone` 后让对方走 UNC 写一下，再把 `-ReadAccess` 换 `-ChangeAccess` 对比。本地侧的部件（建共享、查共享权限、两道门模型）都已实测如上。

排障速查：

| 现象 | 优先怀疑 |
|------|----------|
| 一个共享能进、另一个不能 | 共享门或该共享根 NTFS 对你的 SID 不放行 |
| 共享能进、深层文件夹不能 | 共享门过了，子目录 NTFS ACE 拦住（第 1 课的对表） |
| 明明在组里仍进不去 | 令牌未刷新（要重登，第 8 讲）、Deny 误伤（插问 1）、或只过了一道门 |

---

## 收束

**你现在会了：**

- **Access Check = 每次访问时用令牌 SID 对 DACL 现场查**；无匹配 → 拒绝；Deny 压过 Allow——五连裁决全部实测。
- **Deny 按位交集否决，不是按套餐**——`deny (W)` 误伤读、`deny (WD)` 精确咬写的对照实验；排障信掩码不信字母。
- 对表是**对单个对象**的——Q1 拒 LabUser2 的同时 public.txt 收它。
- 自查三步：`whoami /groups` → `icacls` → 肉眼对表。
- UNC = 地址写法、SMB = 协议、共享名 = 入口；UNC 打开 ≈ 网络登录 + **共享门 ∩ NTFS 门**，取更严。

**下一讲才需要：** Owner 与 DACL 在对象上如何放进同一份结构里——安全描述符。

---

<!-- chapter-nav:start -->
← 上一章：[第 9 讲：ACE 与 DACL](./10-ace-dacl.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 11 讲：安全描述符](./12-security-descriptor.md)
<!-- chapter-nav:end -->
