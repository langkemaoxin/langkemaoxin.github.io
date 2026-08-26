---
title: "第 23 讲：用 GPO 分配用户权利"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 23 讲：GPO 权利分配"
order: 4
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "权限"
  - "安全"
  - "GPO"
  - "对话实录"
description: 师生对话实录课：「能备份一切」的能力不在文件夹安全页上配——权利来自策略。secpol 与域 GPO 是同一个抽屉的两扇门；本机 gpresult 实拍正吃着 5 条真实域 GPO（EDRSetup/显示器策略等），secedit 账本对照。
---

# 第 23 讲：用 GPO 分配用户权利

> **卷三·权利与 UAC（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[User Rights Assignment](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/user-rights-assignment)。

---

## 开场：翻遍安全页也找不到「备份」那个勾

**🧑‍🏫 老师：**

上一讲 UAC 讲「管理员令牌平时藏起来、要用时才提」。但运维里更常见的场景：小王建了个 `backup` 账户专门跑夜间备份，得读全公司所有人的文件。他去某个文件夹 → 属性 → 安全，准备把 backup 加进去——翻半天，**没有一个叫「备份」的勾**。就算挨个文件夹加一遍，新建的文件照样漏。他卡住了：到底该在哪给这个账户「能备份一切」的能力？

**🧑‍🎓 学生：** 我知道上一讲的答案——这是**系统级能力**，不在文件上配！

**🧑‍🏫 老师：**

对。文件夹安全页只能给「**对这个对象**」的访问权限（DACL）；「能备份任意文件」是一种凌驾在所有对象 DACL 之上的**特权**，在**安全策略**里授予，登录时写进 Access Token，从此跟着进程走：

| | DACL 访问权限 | 用户权利（特权） |
|---|---|---|
| 配在哪 | 每个对象的安全页 | 安全策略（一处配，全局生效） |
| 粒度 | 单个对象 | 系统级，横扫所有对象 |
| 进令牌吗 | 不进（每次访问现查 ACL） | 进（登录时写死在令牌里） |

常见的几条特权（`Se` 前缀 = privilege）：**SeBackupPrivilege**（绕 DACL 读）、**SeRestorePrivilege**（绕 DACL 写）、**SeTakeOwnershipPrivilege**（夺任意对象所有权——第 6 讲 takeown）、**SeDebugPrivilege**（开别人内存，极敏感）、**SeImpersonatePrivilege**（第 5 讲模拟的门票）。

> **访问权限配在对象上，权利配在策略里。策略授予的权利，登录时写进令牌，跟着你走。**

---

## 第 1 课：secpol 与域 GPO——同一个抽屉，两扇门

**🧑‍🏫 老师：**

权利分配的界面只有一套，打开它的「门」有两扇：**单机**用 `secpol.msc`（本地安全策略——本质是「本机自己的 GPO」的视图）；**域**用 `gpmc.msc` 建一个 GPO（计算机配置 → 策略 → Windows 设置 → 安全设置 → 本地策略 → 用户权限分配）。域里和单机看到**同一组策略项**，区别只在：域 GPO 下发后成百上千台机器一起生效；单机改 secpol 只影响这一台。

**这台加域机器正吃着哪些域策略**——`gpresult` 实拍：

```text
PS> gpresult /r /scope:computer
Applied Group Policy Objects
-----------------------------
    vray禁用               ← 公司禁 vray 渲染软件的策略
    显示器15分钟关闭        ← 统一节能
    CDPC-GPO               ← 公司主策略
    EDRSetup               ← 终端安全探针部署
    AD RMS Config for computer   ← 文档权限管理
```

五条真实 GPO 正应用在这台机器上——第 15 讲对照表里那句「公司统一策略可从域下发」的兑现现场。而本地侧的权利账本（上一讲的 secedit 导出）里，那些 S-1-5-32 域组的默认授权 + 两个域账户的特别授权，就是「本地策略 + 域策略叠加」后的结果。

**小王要做的事**收口：在「备份文件和目录」这条里加上 backup 账户——单机在 secpol 里加；全公司则在域 GPO 里加，一处配置、处处生效。

---

## 第 2 课：生效与重新登录的关系

**🧑‍🎓 学生：** 改完策略，backup 的备份脚本马上就能跑了吗？

**🧑‍🏫 老师：**

不能——这是和第 5 讲最关键的衔接：**特权在登录那一刻被写进令牌**。改完策略，已登录会话的令牌是登录时定型的，不会中途刷新。正确流程：

1. 策略里把 backup 加进 SeBackupPrivilege；
2. **注销 backup、重新登录**；
3. 新会话拿到带 SeBackupPrivilege 的新令牌，脚本才用得上。

> **权利在策略里给，在令牌里带；改完策略不重新登录，等于没给。**（和加组要重登同根：令牌定型——本卷第三次撞见这条铁律。）

排障三件套收口：看令牌 `whoami /priv`（「已禁用」≠ 没授到，是授到但没启用——程序用时 `AdjustTokenPrivileges` 再开，第 21 讲）；导出账本 `secedit /export /cfg rights.cfg`（`[Privilege Rights]` 段每条权利授给了谁）；看域侧 `gpresult /r`。

---

## 收束

**你现在会了：** 用户权利（特权）和 DACL 访问权限的区别（配在哪、粒度、进不进令牌）；secpol 单机 / GPO 域是同一个抽屉的两扇门（本机实拍 5 条真实 GPO 生效中）；为什么改完必须重新登录。

**下一讲才需要：** 你高高兴兴给某个账户授了特权、加进了域管理员组——但有个叫 AdminSDHolder 的机制会**定时把这些特权账户的 ACL 复位**回受保护模板。它为什么存在、怎么躲，下一讲见。

---

<!-- chapter-nav:start -->
← 上一章：[第 22 讲：UAC](./03-uac.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 24 讲：AdminSDHolder](./05-adminsdholder.md)
<!-- chapter-nav:end -->
