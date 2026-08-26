---
title: "第 22 讲：UAC"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 22 讲：UAC"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "权限"
  - "安全"
  - "UAC"
  - "对话实录"
description: 师生对话实录课：UAC 的精髓不是弹窗，是双令牌——标准令牌里 Administrators 被「断电」（deny-only）、特权剥离、Medium 级。本机实拍 hosts 的 DACL（Administrators F / Users RX）推演那道闸；本机 UAC 关闭的现况如实对照。
---

# 第 22 讲：UAC

> **卷三·权利与 UAC（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[How UAC works](https://learn.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works)、[Mandatory Integrity Control](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)。

---

## 开场

**🧑‍🏫 老师：**

小王是这台机器的本地管理员——`net localgroup administrators` 里有他。可他用记事本改 `C:\Windows\System32\drivers\etc\hosts`，保存时「拒绝访问」。他顺手开两个 cmd——一个普通、一个「以管理员身份运行」——各敲 `whoami /user`，输出**一模一样**。

**🧑‍🎓 学生：** 同一个我，凭啥这个窗口改不动 hosts、那个能改？而且 `/user` 还看不出区别？

**🧑‍🏫 老师：**

上一讲的**用户权利**登记在账户名下；但登记了不代表你**此刻**拿得到——中间隔着一道 UAC。它的精髓不是「弹个窗让你点确认」，那只是表象，真正的设计是：

> **管理员登录后，系统默认发一把「降权令牌」干活；只有点「以管理员身份运行」并通过确认，才临时换回「完整令牌」。**

降权的叫 **filtered token（过滤令牌）**，完整的叫 **elevated token（提升令牌）**。Vista 起引入，沿用至今。

---

## 第 1 课：两把令牌差在哪——「断电」的三处

**🧑‍🏫 老师：**

两把令牌的**用户 SID 完全相同**（都是小王）——所以 `whoami /user` 看不出区别，他错在只看了 `/user`。区别全在三处：

| | 标准令牌（默认） | 提升令牌（提升后） |
|---|---|---|
| Administrators 组 | **只用于拒绝（deny only）** | 启用（enabled） |
| 管理员特权（SeBackup 等） | **被剥离，根本不在令牌里** | 完整保留（多数默认禁用，用时再开） |
| 完整性级别（Mandatory Label） | Medium（S-1-16-8192） | High（S-1-16-12288） |

第一行最关键：标准令牌里 `Administrators` 这个组 SID **还在**，但被打上「只用于拒绝」——**只能匹配 Deny ACE，不能匹配 Allow ACE**。于是磁盘上那些「授予 Administrators 完全控制」的规则，对此刻的令牌**全部失效**。

第三行是另一道闸：**完整性级别（MIC）**——每个进程带一个级别（Low/Medium/High/System），受保护对象也带，规则粗暴：**低级别不能写高级别，且先于 DACL 检查**。这就是浏览器沙箱（Low）即便 DACL 允许也写不进 Program Files（Medium）的原因。

> **UAC 不改 SID，只把 Administrators 组和特权「断电」。同一个你，标准令牌里只是个「名誉管理员」。**

UAC 的能力边界也要划清：**只**对本地 Administrators 组成员做令牌过滤（普通用户本来就一把标准令牌，提权要输管理员密码）；改的是**令牌里组的属性和特权**，**不是文件上的 ACL**——文件该给谁读还给谁读，UAC 一个字节不碰。弹窗只是「换令牌」的仪式；安全收益来自「默认拿降权令牌上网、看邮件」——恶意软件一启动就继承降权令牌，碰不动系统目录。

---

## 第 2 课：实验——hosts 那道闸逐层拆开

**🧑‍🏫 老师：**

先看 hosts 的 DACL（本机实拍）：

```text
PS> icacls C:\Windows\System32\drivers\etc\hosts
C:\Windows\System32\drivers\etc\hosts NT AUTHORITY\SYSTEM:(I)(F)
                                      BUILTIN\Administrators:(I)(F)    ← 管理员完全控制
                                      BUILTIN\Users:(I)(RX)            ← 普通用户只读
```

推演标准窗口写 hosts 失败的完整链：令牌里 Administrators「断电」（deny-only）→ `Administrators:(F)` 那行 Allow **匹配不上** → 退到 `Users:(RX)` 只读 → 写被拒。提升后 Administrators「通电」→ 命中 `(F)` → 写成功。（hosts 没有单独的 Mandatory Label，靠的是纯 DACL + deny-only 的叠加。）

诊断口诀：**别看 `/user`，看 `/groups` 里 Administrators 的属性、看 `/priv` 里 SeBackup 们在不在**：

```bat
whoami /groups | findstr /i "Administrators Mandatory"
whoami /priv
```

标准窗口应看到 `只用于拒绝的组` + `Medium`；提升窗口看到 `启用的组` + `High` + 特权齐全。提升令牌里特权多数「已禁用」——**在不在令牌里**是 UAC 决定的，**开不开**是程序用时 `AdjustTokenPrivileges` 决定的；UAC 诊断只看「在不在」。

**🧑‍🎓 学生：** 那这台机器呢？我现在的会话是什么状态？

**🧑‍🏫 老师：**

本机实测（第 20 讲拍过）：我的会话 `Mandatory Label\High`、Administrators「启用的组、组的所有者」、SeBackupPrivilege **Enabled**——也就是说**我这个没点过任何「是」的普通会话，就是完整管理员令牌**。原因第 1 讲就查过：`EnableLUA = 0`——**这台机器的 UAC 被整个关了**，正是上一讲「翻车 B」的活标本。UAC 关闭时：双令牌合并成一张、弹窗消失、任何管理员进程直接拿全权——方便，但第 20 讲说的「枪套锁」整个拆了。对照实验要在 UAC 正常的机器上才能做出 Medium/High 之差。

---

## 收束

**你现在会了：** UAC 是管理员的「双令牌」机制——标准令牌（Administrators deny-only、特权剥离、Medium）和提升令牌（enabled、特权齐全、High）；`whoami /user` 看不出区别，要看 `/groups` 的组属性和 `/priv`；hosts 那类「拒绝访问」是 DACL 叠加 deny-only 的结果（本机 hosts ACL 实拍推演）；本机 UAC 关闭 = 双票合一的活标本。

**下一讲才需要：** 单机 UAC 默认是开的，但域里成百上千台机器，弹窗强度、谁能提权——这些得**集中下发**：GPO。

---

<!-- chapter-nav:start -->
← 上一章：[第 21 讲：用户权利](./02-user-rights.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 23 讲：GPO 权利分配](./04-gpo-rights.md)
<!-- chapter-nav:end -->
