---
title: "第 14 讲：SACL——审计"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 14 讲：SACL"
order: 15
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "审计"
  - "对话实录"
description: 师生对话实录课：DACL 管「能不能碰」，SACL 管「碰了记不记」。本机全链路实测——挂审计规则、以 LabUser2 真实身份触发访问、Security 日志里捞出 4663 事件原文（SID、进程、访问掩码逐字段读）；顺带踩到「读 SACL 也要 SeSecurityPrivilege」的坑。
---

# 第 14 讲：SACL——审计

> **卷一 · 发明权限（共 15 讲，本讲收官）**
> 师生对话实录课：AI 当老师、我当 0 基础学生。实验场 [C:\Lab](../appendix/04-lab.md)，实测 2026-08-26。

---

## 开场

**🧑‍🏫 老师：**

卷一到目前为止，你问的都是「**能不能碰**」。安全还有另一半问题：**「碰了，记不记？」**——小李昨晚十一点有没有读过总平图？被拒绝的尝试有没有人留意？这不是加权限能回答的，是**审计（auditing）**的事。

回看第 11 讲那张安全卡，五格里有一格一直空着：

```text
Security Descriptor
├── Owner      → 这算谁的（第 6 讲）
├── DACL       → 能不能碰（第 9~13 讲）
├── SACL       → 碰了记不记（本讲）
├── Group      / 控制位
```

**SACL（System ACL，系统访问控制列表）** 管审计：当某主体对对象做了（或试图做）某类访问，成功/失败要不要记进安全日志（[Understand security principals - SACL](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)）。它和 DACL **分格存放**——「权限」和「审计」是两件事，不缠死：DACL 一条不写也不影响 SACL 记录，反之亦然。

SACL 里的一条规则叫 **ACE 的审计版（System ACE）**——三个格子和 DACL 版神似，只是第三格含义变了：

```text
DACL 的 ACE：  对谁（SID） × 允许/拒绝   × 哪些权限位
SACL 的 ACE：  对谁（SID） × 成功/失败   × 哪些权限位要记
```

---

## 第 1 课：审计要「两个开关」同时开

**🧑‍🏫 老师：**

很多人在对象上配了审计却不出日志——因为审计是**两级开关**：

1. **系统级**：审核策略里「对象访问」类别的 File System 子类别要开（成功/失败）。不开这个，对象上的 SACL 写得再细也不记——类比：SACL 是「这间房装了摄像头」，审核策略是「监控室的录像机开没开机」；
2. **对象级**：对象的安全描述符里要有 SACL，说明「记谁、记什么访问、记成功还是失败」。

查/设系统级用 `auditpol`（[官方](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/auditpol)）。本机实测（GUID 形式，避开本地化名字）：

```text
PS> auditpol /get /subcategory:{0CCE921D-69AE-11D9-BED3-505054503030}
System audit policy
Category/Subcategory     Setting
                         Success and Failure      ← 这台机器文件审计已开（公司统一配的）
```

顺手交个**真实踩坑记录**：在 PowerShell 里跑 `auditpol /get /subcategory:"File System"` 反复报「参数错误」——这是 PS 给原生程序传带空格参数的经典坑，`--%` 停止解析符也不总灵；**换用子类别的 GUID** 一发入魂。排障时记这招。

---

## 第 2 课：实验——从挂 SACL 到日志里捞出事件

**🧑‍🏫 老师：**

两级开关就位，做全链路。**对象级**：给 `C:\Lab\eff.txt` 挂一条审计规则——「LabUser2 的读访问，成功就记」：

```powershell
$acl = Get-Acl C:\Lab\eff.txt
$rule = New-Object System.Security.AccessControl.FileSystemAuditRule(
    [System.Security.Principal.NTAccount]'PC3507\LabUser2',     # 记谁
    [System.Security.AccessControl.FileSystemRights]::Read,     # 记什么访问
    [System.Security.AccessControl.AuditFlags]::Success)        # 记成功（也可 Failure/两者）
$acl.SetAuditRule($rule)
Set-Acl C:\Lab\eff.txt $acl
```

（又一个诚实踩坑：`FileSystemAuditRule` 在 PowerShell 里**带继承参数的五参重载**总被绑错序报「必须至少设置一个标志」——对文件用**三参重载**最稳。）

**触发**：以 LabUser2 真实身份读一次 eff.txt（它对这文件有 `(R)`，读得成——成功事件该记）：

```text
PS>（LabUser2 身份）type C:\Lab\eff.txt
total-drawing
```

**收日志**——到 Security 日志里捞 **4663**（「试图访问对象」）事件，条件过滤文件名：

```powershell
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4663} -MaxEvents 120 |
    Where-Object { $_.Message -match 'eff\.txt' }
```

捞到了。事件原文（本机真实输出，逐段读）：

```text
An attempt was made to access an object.

Subject:                                                ← 谁干的
    Security ID:  S-1-5-21-3515524382-1810956650-2183447911-1010
    Account Name: LabUser2
    Account Domain: PC3507
    Logon ID:     0x192AFA49

Object:                                                 ← 干到了什么
    Object Server:  Security
    Object Type:    File
    Object Name:    C:\Lab\eff.txt

Process Information:                                   ← 用哪个程序干的
    Process ID:   0x3b04
    Process Name: C:\Windows\System32\cmd.exe

Access Request Information:                             ← 干了什么动作
    Accesses:     ReadData (or ListDirectory)
    Access Mask:  0x1                                   ← 又见 access mask（第 7 讲）！

TimeCreated: 08/26/2026 09:22:27
```

**🧑‍🎓 学生：** 证据链完整得像口供——谁（SID + 账户 + 登录会话）、对哪个对象、用哪个进程、做了什么（访问类型 + 掩码）、几点。

**🧑‍🏫 老师：**

这就是 SACL 的产出。注意 `Access Mask: 0x1`——第 7 讲的权限位在日志里又现了原形：审计记录的粒度就是**位**。

---

## 插问：为什么我读不回刚挂的审计规则？

**🧑‍🎓 学生：** 奇怪——`(Get-Acl).Sddl` 里只看到 `O:`/`G:`/`D:` 段，没有 `S:` 段；`GetAuditRules` 也读出来是空的。可事件明明记了——规则到底在不在？

**🧑‍🏫 老师：**

规则在（事件就是它干的活的证据），**读不回来是权限问题**：**读取（和写入）SACL 需要 `SeSecurityPrivilege`（管理审核和安全日志）这条特权**——它在你令牌里默认是禁用的，`Get-Acl` 拿不到 SACL 段就静默省略。想读回来得先 `AdjustTokenPrivileges` 启用特权（第 5 讲 `whoami /all` 特权信息里那行 `SeSecurityPrivilege 已禁用` 的现形时刻）。这呼应本卷反复出现的主题：**特权压过权限**——审计这条线上，连「看规则」本身都是特权。

---

## 第 3 课：事件 ID 认脸 + 审计的定位

**🧑‍🏫 老师：**

Security 日志里和本卷相关的高频事件（[附录·事件 ID](../appendix/03-event-ids.md) 有全表）：

| 事件 ID | 含义 | 本卷哪讲见过 |
|---------|------|-------------|
| **4624 / 4625** | 登录成功 / 失败（含 LogonType） | 第 4 讲统计过五种登录类型 |
| **4663** | 试图访问对象（本讲主角） | SACL 记的「干了什么」 |
| 4656 | 打开了对象句柄（请求了哪些权限） | 4663 的前奏 |
| 4670 | 权限被修改 | 改 DACL 时会记 |
| 4720 / 4728 等 | 用户创建 / 加入组 | 第 1、8 讲那些操作的留痕 |

审计的**定位**要说准：它是**事后追责与检测**的眼睛，不是门锁——SACL 不拦任何访问（拦是 DACL 的事），它只让你「回看发生了什么」。所以典型搭配是：**DACL 拒绝 + SACL 记失败**——门关死，同时谁撞门都留影。运维上常见的对象级审计目标：敏感目录（谁读过财务表）、权限修改本身（谁动了 DACL）、失败尝试密集的路径（爆破探测的信号）。

最后一条务实提醒：审计有成本（日志量），**别对全盘开 Success 审计**——只对真正敏感的路径挂 SACL、只记关心的访问类型，日志才不会被噪音淹掉。

---

## 收束

**你现在会了：**

- **SACL 管「碰了记不记」**，与 DACL 分格；SACL 的 ACE 三格 = 对谁 × 成功/失败 × 记哪些位。
- 审计要**两级开关**：auditpol 的 File System 子类别（系统级）+ 对象上的 SACL（对象级）——本机全链路实测：挂规则 → LabUser2 真实触发 → 捞出 4663 事件（SID/进程/访问掩码逐字段）。
- **读/写 SACL 需要 `SeSecurityPrivilege`**（读不回规则但事件在记——本机踩到的实证）。
- 4663 是「干了什么」、4624/4625 是「谁怎么进来的」；审计是眼睛不是门锁，搭配「DACL 拒绝 + SACL 记失败」最香。

**卷一到这就收满了**：从第 0 讲「第二个人坐到电脑前」出发，你已经有了一整套单机模型——账户与 SID 认人（0~3 讲）、登录铸令牌（4~5 讲）、对象上挂 Owner 与安全卡（6、9、11 讲）、权限位与组表达精细规则（7~8 讲）、访问检查现场裁决（10、13 讲）、继承让规则成片传播（12 讲）、SACL 留下眼睛（14 讲）。

**下一卷才需要：** 几十上百台机器时，账户与组如何不各自为政——域与域控（卷二）。

---

<!-- chapter-nav:start -->
← 上一章：[第 13 讲：有效权限](./14-effective-permissions.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 15 讲：域与域控](../vol2-identity/01-domain-dc.md)
<!-- chapter-nav:end -->
