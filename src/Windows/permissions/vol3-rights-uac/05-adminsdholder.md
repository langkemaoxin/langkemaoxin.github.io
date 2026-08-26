---
title: "第 24 讲：AdminSDHolder 与保护组"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 24 讲：AdminSDHolder"
order: 5
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "Active Directory"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：有些对象的 ACL 你改了也不算数——AdminSDHolder 是特权组的权限模板，SDProp 每 60 分钟抄一遍、覆盖改动、关掉继承。本机 LDAP 实查真实域的保护名单（adminCount=1）：十个保护组原样在列，用户侧连 krbtgt 都被保护着。
---

# 第 24 讲：AdminSDHolder 与保护组

> **卷三·权利与 UAC（共 5 讲，本卷收官）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[Appendix C - Protected Accounts and Groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-c--protected-accounts-and-groups-in-active-directory)。

---

## 开场：改了又消失的权限

**🧑‍🏫 老师：**

小王刚接手域运维，遇到怪事：他给 `Domain Admins` 加了一条委托，让审计账号能读它的成员列表。改完 `dsacls` 一看，权限在；过一小时喝杯茶回来，**没了**。再改，又没。他以为是 AD 复制冲突，折腾半天——其实是另一套机制在「修正」他。前几讲讲「谁能做什么」；这一讲讲一个反过来的东西：**有些对象的 ACL，你改了也不算数。**

---

## 第 1 课：特权组的「权限模板」

**🧑‍🏫 老师：**

为什么要发明它：在 AD 里，`Domain Admins`、`Enterprise Admins` 这些特权组是整个域的钥匙。要是它们的 ACL 能被随便改、能靠继承从上级 OU 流下来——任何能动 OU 的人都能给特权组塞权限，这就是横向提权。所以 AD 给这些组上了专门的锁，三个零件：

- 域里有个固定对象 `CN=AdminSDHolder,CN=System,DC=...`——一张**特权组权限模板**；
- 有个后台进程 **SDProp**（Security Descriptor Propagator），**默认每 60 分钟**在 PDC 模拟器上跑一次；
- 它把模板 ACL **抄写**到一批受保护的组和账户上——**覆盖**你手动加的任何东西，同时把这些对象的**继承关掉**。

这就是小王碰到的怪事：他改的 Domain Admins 是受保护组，SDProp 一跑就把改动「还原」成模板样。

> **AdminSDHolder 是模板，SDProp 每小时抄一遍。受保护组的 ACL 不归你管，也不继承父 OU。**

**谁会被保护**：一份固定的内置名单（protected accounts and groups）——Domain Admins / Enterprise Admins / Schema Admins / Administrators / Account Operators / Server Operators / Print Operators / Backup Operators 等。两个连带效应：① **名单是递归的**——你只要**是**这些组的成员，**你这个账户本身**也被保护（ACL 被重写、继承被关）；② SDProp 划对象进名单时顺手把 `adminCount` 属性设为 **1**——所以反过来找受保护对象就一条 LDAP 过滤 `(admincount=1)`（移出组后 adminCount 不自动清零，留 1 是历史痕迹）。

---

## 第 2 课：实验——真实域的保护名单

**🧑‍🎓 学生：** 这份名单能在咱们域里查到吗？

**🧑‍🏫 老师：**

零依赖 LDAP 直查（本机实测，`(admincount=1)`）：

```powershell
$s=New-Object System.DirectoryServices.DirectorySearcher([ADSI]'LDAP://DC=jzfz,DC=local')
$s.Filter='(&(objectClass=group)(admincount=1))'
$s.FindAll() | ForEach-Object { $_.Properties.samaccountname[0] }
```

```text
=== 被保护的组（前 10） ===
Enterprise Admins          ← 教科书名单，一个不少
Account Operators
Replicator
Print Operators
Server Operators
Read-only Domain Controllers
Domain Admins
Administrators
Domain Controllers
Schema Admins

=== 被保护的用户（前 6） ===
Administrator              ← 域管账户
tongjin                    ← 某位真人域管（递归效应：他是 Domain Admins 成员，
                              所以他的账户本身也被保护）
SQLuser / SQLServer2005DTSUser
krbtgt                     ← 第 16 讲那个「签总票」的特殊账户——它也在保护名单里！
rmsadmin
```

三个看点：**教科书名单在真实域里原样在列**；**递归效应可见**（tongjin 这类真人域管的账户被连带保护）；**krbtgt 被保护**——黄金票据攻击的核心目标，AD 给它上了同款锁（呼应第 16 讲的点到为止）。

---

## 插问：那正确的改法是什么？

**🧑‍🎓 学生：** 确实要让运维账号管理特权组，该怎么办？

**🧑‍🏫 老师：**

和日常文件 ACL 的规矩在这变了：

| | 普通对象（文件/普通 OU） | 受保护组 |
|---|---|---|
| 改的 ACL 会留吗 | 会 | **不会**（60 分钟内被抄回模板） |
| 继承父级吗 | 看配置 | **强制不继承** |
| 想加权限改哪 | 改对象本身 | 改 **AdminSDHolder 模板**（所有受保护组一起变） |

正确姿势：确实要统一授权——去改 **AdminSDHolder 模板**（`dsacls` 或 ADSI Edit：`CN=System` → `CN=AdminSDHolder` → 属性 → 安全），等下一轮 SDProp，所有受保护组都带上。只想动一个组——这条路被设计成走不通，**这正是它的目的**，别硬刚。改完模板想立刻验证（不等 60 分钟）：临时调小 PDCE 上的 `AdminSDProtectFrequency`（默认 3600 秒，改完重启 NTDS 才生效，**验证完务必改回**）。

把模板当后门（改模板塞权限）属于攻击利用范畴，不在运维视角展开——和卷一 sIDHistory、SeBackup 那几条红线一样：**认得地图，不递钥匙**。

---

## 收束

**你现在会了：** 域里有张「特权组权限模板」AdminSDHolder，SDProp 每 60 分钟把它抄到受保护组和账户上——覆盖改动、关掉继承；标志是 `adminCount=1`（本机 LDAP 实查：十个保护组在列、krbtgt 也在名单）；统一加权限要改模板而不是改单个组。

**下一卷才需要：** 视线从 AD 回到本机——注册表里那些键，ACL 又是怎么记的、跟文件 ACL 有什么不同。

---

<!-- chapter-nav:start -->
← 上一章：[第 23 讲：GPO 权利分配](./04-gpo-rights.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 25 讲：注册表 ACL](../vol4-beyond-files/01-registry.md)
<!-- chapter-nav:end -->
