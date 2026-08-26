---
title: "第 28 讲：共享权限设计模式"
sidebarGroup: "卷五·排障与设计"
shortTitle: "第 28 讲：共享设计"
order: 1
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：两道门怎么分工——「共享门放宽、NTFS 门收紧」。本机真建一个项目库：共享 Everyone 完全控制 + NTFS 精确分级（LabReaders 修改 / AuthUsers 只读），双测试账号实跑验证「设计组改、全院看」精确落地。
---

# 第 28 讲：共享权限设计模式

> **卷五·排障与设计（共 3 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)。

---

## 开场：会查了，轮到你建

**🧑‍🏫 老师：**

第 10 讲讲完两道门，你**会查**了。可真轮到你**建**一个共享，问题反过来：领导说「建个项目库，全院能看，只有设计组能改」，你盯着文件夹属性的两个选项卡（共享/安全）犯难——权限到底往哪道门配？两边都配行不行？最常见的两种翻车：图省事两道门都挂 Everyone 完全控制——第二天文件夹被删空；或走向反面两道门都一条条加组——改一次权限动两处，三个月后两边对不上。

回忆第 10 讲：网络共享过两道门，**有效权限取更严的那一侧**：

| 门 | 在哪配 | 粒度 |
|---|---|---|
| 共享权限（第一道门） | 属性 → 共享 → 高级共享 → 权限 | 只有三档：读取 / 更改 / 完全控制 |
| NTFS 权限（第二道门） | 属性 → 安全 | 细到「只能读、不能删、不能改权限」 |

设计原则一句话：**粗的那道门放开，细的那道门收紧。**

---

## 第 1 课：实验——真建一个「全院看、设计组改」的项目库

**🧑‍🏫 老师：**

不空谈，本机真建一个（沙盒 `C:\Lab\share\proj`，共享名 ProjLib）：

```powershell
# 第一道门：放宽
New-SmbShare -Name ProjLib -Path C:\Lab\share -FullAccess Everyone
# 第二道门：收紧（关继承重排）
icacls C:\Lab\share\proj /inheritance:r /grant:r 'SYSTEM:(OI)(CI)(F)' `
       'BUILTIN\Administrators:(OI)(CI)(F)' 'Authenticated Users:(OI)(CI)(RX)'
icacls C:\Lab\share\proj /grant 'LabReaders:(OI)(CI)(M)'    # 「设计组」= 我们的 LabReaders
```

两道门的实拍（真实输出）：

```text
=== 共享门 ===
AccountName        AccessRight
-----------        -----------
Everyone           Full          ← 门开大

=== NTFS 门 ===
C:\Lab\share\proj PC3507\LabReaders:(OI)(CI)(M)          ← 设计组：修改（读+写+删）
                  NT AUTHORITY\Authenticated Users:(OI)(CI)(RX)   ← 全院：只读
                  BUILTIN\Administrators:(OI)(CI)(F)
                  NT AUTHORITY\SYSTEM:(OI)(CI)(F)
```

然后拿两个测试账号真跑（本地路径侧）：

| 测试账号 | 令牌命中 | 读 | 写 |
|---|---|---|---|
| LabUser1（在 LabReaders） | `(M)` | `v1` ✓ | **追加成功**，文件变 `v2` |
| LabUser2（只有 Authenticated Users） | `(RX)` | `v2` ✓ | **拒绝访问**，内容没变 |

领导的需求精确落地——「设计组改、全院看」，全程**共享门没插手**：它把 Everyone 放进来，NTFS 那道门逐个精确卡。（UNC 路径的对照在这台机器有回环限制——第 10 讲验过、已如实记录；共享门本身的真实配置如上。）

> **共享门放宽、NTFS 门收紧。两道门取最严，精细活只在一处做。** 为什么共享门敢开大？因为第二道门会再卡一次——NTFS 上没给权限的，照样打不开。

---

## 第 2 课：三类反模式

**🧑‍🎓 学生：** 那常见的错配长什么样？

**🧑‍🏫 老师：**

排障反复遇到三种：

1. **两道门都给 Everyone 完全控制**——图省事，谁都能删，需求形同虚设；
2. **两道门都精细配**——共享门加一个组、NTFS 又加同一个组，改一处忘另一处，迟早对不上；
3. **共享门设读取、NTFS 设完全控制**——你以为给了项目组全权，其实卡在共享门那道「读取」上，谁都改不了。第三种最坑：用户投诉「改不了」，你盯着 NTFS 的 `(F)` 看半天没毛病，根因却在共享门——记住**取更严的那一侧**。

验收清单（配完自检）：

- [ ] 共享门只有 `Everyone`/`Authenticated Users` 一两条宽规则，没有逐个组加；
- [ ] 「谁读谁改」的所有精细控制都落在 NTFS；
- [ ] `SYSTEM`、`Administrators` 的默认项没被误删（删了备份、杀毒软件出事）；
- [ ] 拿一个只读账号、一个编辑账号**实际试过**（刚做的双账号验证；系统化流程下一讲）。

---

## 收束

**你现在会了：** 共享两道门、有效权限取更严；正确配法「共享门放宽、NTFS 门收紧」（本机 ProjLib 实建 + 双账号验证）；三类反模式怎么避；`Get-SmbShareAccess` + `icacls` 分别看两道门自检。

**下一讲才需要：** 怎么把「实际试过」变成**可重复的验收流水线**——改 → 算 → 试 → UNC 验，四步各堵一类坑。

---

<!-- chapter-nav:start -->
← 上一章：[第 27 讲：AD 委派](../vol4-beyond-files/03-ad-delegation.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 29 讲：有效权限实战](./02-effective-access-practice.md)
<!-- chapter-nav:end -->
