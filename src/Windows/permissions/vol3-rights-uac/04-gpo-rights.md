---
title: "第 23 讲：用 GPO 分配用户权利"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 23 讲：GPO 权利分配"
order: 4
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 23 讲：用 GPO 分配用户权利

### 麻烦

上一讲 UAC 讲的是「管理员令牌平时藏起来、要用时才提」。但运维里更常见的场景是这样：小王建了个 `backup` 账户，专门跑夜间备份，得读全公司所有人的文件。他去某个文件夹 → 右键 → 属性 → **安全**，准备把 `backup` 加进去——翻半天，**没有一个叫「备份」的勾**。

就算他挨个文件夹加一遍，新建的文件照样漏。他卡住了：到底该在哪给这个账户「能备份一切」的能力？

### 这一讲只发明：权利来自策略，不是来自文件夹安全页

文件夹的安全页只能给「**对这个对象**」的访问权限（第 6 讲的 DACL allow/deny）。但「能备份任意文件」是一种**系统级能力**——它凌驾在所有对象的 DACL 之上，能在你毫无授权时把文件读走。

这种能力 Windows 叫**特权（privilege）**，是**用户权利（user rights）**的一类。它不在文件上配，而在**安全策略**里授予某个账户；授予后，这条特权会在你登录时**写进 Access Token**（第 5 讲那张通行证），从此跟着你的进程走。

| | DACL 访问权限 | 用户权利（特权） |
|---|---|---|
| 配在哪 | 每个对象（文件/注册表项…）的安全页 | 安全策略（一处配，全局生效） |
| 粒度 | 针对单个对象 | 系统级，横扫所有对象 |
| 例子 | 「读这个文件夹」「改这个键」 | `SeBackupPrivilege` 备份任意文件 |
| 进令牌吗 | 不进（每次访问现查 ACL） | 进（登录时写死在令牌里） |

来源：[User Rights Assignment（用户权利分配）](https://learn.microsoft.com/zh-cn/windows/security/threat-protection/security-policy-settings/user-rights-assignment)

常见的几条特权（记住 `Se` 前缀 = privilege）：

- **SeBackupPrivilege** — 备份文件和目录（绕过 DACL 读）
- **SeRestorePrivilege** — 还原文件和目录（绕过 DACL 写）
- **SeTakeOwnershipPrivilege** — 取得任意对象的所有权
- **SeDebugPrivilege** — 调试任意进程（能打开别人的内存，极敏感）
- **SeImpersonatePrivilege** — 模拟客户端（第 6 讲模拟那张令牌的门票）

来源：[Privilege Constants（特权常量）](https://learn.microsoft.com/zh-cn/windows/win32/secauthz/privilege-constants)

口诀：

> **访问权限配在对象上，权利配在策略里。**  
> **策略授予的权利，登录时写进令牌，跟着你走。**

### 本机 secpol vs 域 GPO：同一个抽屉，两扇门

权利分配的界面只有一套，打开它的「门」却有两扇：

- **单机**：`secpol.msc`（本地安全策略）。它本质上是「本机这台机器自己的那个 GPO」的视图，路径是 **本地策略 → 用户权限分配**。
- **域**：用 `gpmc.msc`（组策略管理控制台）建一个 GPO，路径是 **计算机配置 → 策略 → Windows 设置 → 安全设置 → 本地策略 → 用户权限分配**。

域里和单机看到的是**同一组策略项**，区别只在：域 GPO 下发后，成百上千台机器一起生效；单机改 secpol 只影响这一台。

来源：[Configure Security Policy Settings](https://learn.microsoft.com/zh-cn/windows/security/threat-protection/security-policy-settings/configure-security-policy-settings)

> 小王要做的，就是在「备份文件和目录」这一条里加上 `backup` 账户——一处配置，全公司文件他都能读。

### 生效与重新登录的关系

这是和第 5 讲最关键的衔接，也是新手最容易踩的坑：

**特权在登录的那一刻被写进令牌。** 你改完策略、点确定，已经登录的会话**不会**立刻拿到新特权——它的令牌是登录时定型的，不会中途刷新。

所以正确流程是：

1. 策略里把 `backup` 加进 `SeBackupPrivilege`；
2. **注销 `backup`，重新登录**；
3. 新会话拿到带 `SeBackupPrivilege` 的新令牌，备份脚本才用得上。

来源：[Access Tokens（令牌里的特权）](https://learn.microsoft.com/zh-cn/windows/win32/secauthz/access-tokens)

口诀：

> **权利在策略里给，在令牌里带；改完策略不重新登录，等于没给。**

### 怎么看见

**界面**（单机）：`Win+R` → `secpol.msc` → 本地策略 → 用户权限分配 → 双击「备份文件和目录」→ 看到当前被授予的账户列表。

**命令**——看当前令牌里到底带了哪些特权：

```bat
whoami /priv
```

真实输出（管理员会话）：

```
特权信息
-----------------

特权名称                        描述                          状态
=============================== ============================= ========
SeIncreaseQuotaPrivilege        为进程调整内存配额            已禁用
SeSecurityPrivilege             管理审核和安全日志            已禁用
SeTakeOwnershipPrivilege        取得文件或其他对象的所有权    已禁用
SeBackupPrivilege               备份文件和目录                已禁用
SeRestorePrivilege              还原文件和目录                已禁用
SeDebugPrivilege                调试程序                      已启用
SeChangeNotifyPrivilege         绕过遍历检查                  已启用
SeImpersonatePrivilege          身份验证后模拟客户端          已启用
SeCreateGlobalPrivilege         创建全局对象                  已启用
```

注意「状态」列：**`已禁用` 不是没授到，而是授到了但当前没启用**。令牌里有这条特权，程序要用时还得先 `AdjustTokenPrivileges` 把它「启用」——这是另一道防护，即使授了 `SeBackupPrivilege`，普通程序也不会自动就能备份，得主动开。

来源：[whoami](https://learn.microsoft.com/zh-cn/windows-server/administration/windows-commands/whoami)

**导出本机全部权利分配**（留档/比对用）：

```bat
secedit /export /cfg rights.cfg
```

打开 `rights.cfg`，`[Privilege Rights]` 段就是每条权利授给了哪些账户（SDDL 形式）。

### 收束

**你现在会了：** 用户权利（特权）和 DACL 访问权限的区别，在哪配（`secpol.msc` 单机 / GPO 域），以及为什么改完必须重新登录才生效。

**下一讲才需要：** 你高高兴兴给某个账户授了特权、加进了域管理员组——但有个叫 AdminSDHolder 的机制会**定时把这些特权账户的 ACL 复位**回一个受保护的模板。下一讲讲它为什么存在、怎么躲。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 22 讲：UAC](./03-uac.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 24 讲：AdminSDHolder](./05-adminsdholder.md)
<!-- chapter-nav:end -->
