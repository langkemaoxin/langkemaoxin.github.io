---
title: "第 21 讲：用户权利（Privileges）"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 21 讲：用户权利"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：把第 20 讲故事一的「特权名单」讲透——权利是策略授的、登录时进令牌、跟着进程走。本机 secedit 导出策略账本实拍：备份权挂在 Administrators + Backup Operators(551)，审计权还单独授了两个域账户。
---

# 第 21 讲：用户权利（Privileges）

> **卷三·权利与 UAC（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[User Rights Assignment](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/user-rights-assignment)、[Privileges](https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges)。

---

## 开场

**🧑‍🏫 老师：**

第 20 讲故事一里小王踩过坑：给自己加了 Deny 读取，夜间备份照样读走。他困惑「门上的字我没写错，怎么不灵了」。这一讲专门讲透：令牌里那份**特权名单**到底从哪来、怎么进令牌、跟门上的 ACE 是什么关系。先定位：

> **对象权限**贴在对象上，回答「这个文件夹、注册表项，你能不能动」；**用户权利**贴在账户上，回答「你这个账户，有没有某类系统能力」。

备份、关机、改系统时间、当服务登录、调试别的进程——都是**跟具体对象无关**的能力，写在安全策略里，不是某条 ACE。

---

## 第 1 课：Deny 为什么没挡住备份——走的是另一套规矩

**🧑‍🏫 老师：**

回到小王那条 `icacls /deny`。资源管理器双击打开文件夹走**对象权限**那条路——门上 Deny，自然进不去。备份程序不是「双击打开」：它用专门的备份 API 访问文件，依赖令牌里的 **`SeBackupPrivilege`**（[Privilege Constants](https://learn.microsoft.com/en-us/windows/win32/secauthz/privilege-constants)）——这项特权一旦启用，访问检查**绕过常规 DACL 判断**。不是 ACE 失效了，是备份另有通道。

**这套规矩从哪来**：策略 → 登录 → 令牌，四步（接第 5 讲「LSA 造令牌」）：

1. 管理员在「本地安全策略」（`secpol.msc`）或组策略里，把某项权利**分配**给账户/组；
2. 分配记录在 **LSA 的安全策略数据库**里（域里通过 GPO 下发——下一讲）；
3. 你**登录**时，LSA 查库：「这个账户（含所属组）被授予了哪些权利？」把结果写进令牌的特权列表；
4. 令牌挂到每个进程上，特权跟着进程走——直到注销。

> **权利是策略授的，登录时进令牌，之后跟着进程走。改了策略不会立刻生效——要等下次登录才重新装进令牌**（又一个「注销重登」的实例，和加组不刷新同根：令牌定型）。

**🧑‍🎓 学生：** 这台机器的「策略账本」能看吗？

**🧑‍🏫 老师：**

`secedit` 导出实拍（本机真实输出，SID 形态）：

```text
PS> secedit /export /cfg C:\Lab\policy.cfg /quiet
PS> Select-String 'SeBackupPrivilege|SeTakeOwnership|SeDebug|SeSecurity' C:\Lab\policy.cfg

SeBackupPrivilege       = *S-1-5-32-544, *S-1-5-32-551
                          ↑ Administrators   ↑ Backup Operators——第 8 讲 RID 表里
                                            「靠特权绕过文件权限做备份」的那位，账本对上了
SeDebugPrivilege        = *S-1-5-32-544
SeTakeOwnershipPrivilege= *S-1-5-32-544      ← takeown 凭的就是它（第 6 讲）
SeSecurityPrivilege     = *S-1-5-21-…-285243, *S-1-5-21-…-286637,
                          *S-1-5-21-…-500,   ← 域侧 RID 500（域 Administrator）
                          *S-1-5-32-544
```

两个看点：**备份权默认挂在 Administrators 和 Backup Operators 两组上**——所以管理员令牌里躺着 SeBackupPrivilege 是常态；**审计权（SeSecurity）被单独授给了两个域账户**——公司里有人专门管审计策略，第 14 讲「读 SACL 要特权」里那道门的钥匙就在这几个人手里。

---

## 第 2 课：启用与禁用——令牌里有 ≠ 正在用

**🧑‍🏫 老师：**

`whoami /priv` 那列「状态」很关键：**已禁用**——特权在令牌里但默认不参与，程序要用得先启用（`AdjustTokenPrivileges`）；**已启用**——当前可直接用。本机实测的状态（第 20 讲拍过）：`SeBackupPrivilege` **Enabled**（这台机器的会话直接开了）、`SeTakeOwnershipPrivilege` Disabled（takeown 内部才启用）、`SeSecurityPrivilege` Disabled。

所以**列表里看见 ≠ 已经生效**——这是 `whoami /priv` 的正确读法。谁启用？**程序自己**：备份工具启动时把 SeBackupPrivilege 打开、用完禁回去。

---

## 插问：ACE 和权利到底怎么分？

**🧑‍🎓 学生：** 两套规矩容易搅，有没有一张速查表？

**🧑‍🏫 老师：**

| | 对象权限（Permissions / ACE） | 用户权利（User Rights / Privileges） |
|--|-------------------------------|--------------------------------------|
| 贴在哪 | **每个对象**上（文件夹、注册表项、打印机…） | **账户**上（经策略分配） |
| 看在哪 | `icacls`、属性→安全 | `secpol.msc`、`whoami /priv`、`secedit /export` |
| 进令牌吗 | 不进；访问检查时拿令牌去比对 ACL | **进**；登录时写入令牌特权列表 |
| 典型例子 | 读、写、执行、删除 | 备份、还原、关机、当服务登录、调试进程 |
| 谁配的 | 资源所有者 / 管理员 | 本地安全策略 / 组策略 |

> **改一条 ACE，只影响那一个对象；改一项权利，影响该账户未来所有登录会话的整体能力。**

一条红线：既然备份特权限能绕过 DACL，「手动启用 SeBackupPrivilege 去读 Deny 目录」就是现成的攻击技巧——本讲不讲操作，只建地图（知道门上有 ACE、令牌里有特权、各走哪条路）；真正的利用留给专门的渗透课程。

---

## 收束

**你现在会了：** 对象权限贴对象、用户权利贴账户；权利由策略分配（本机 secedit 账本实拍：备份权在 Administrators + Backup Operators）、登录时进令牌、跟着进程走；`whoami /priv` 的「已禁用/已启用」才是正确读法；备份能绕开 Deny 不是 ACE 坏了，是走了特权那条路。

**下一讲才需要：** 权利登记在账户名下，不代表你**此刻**拿得到——中间还隔着一道 UAC 的双令牌。

---

<!-- chapter-nav:start -->
← 上一章：[第 20 讲：权利与 UAC](./01-rights-uac.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 22 讲：UAC](./03-uac.md)
<!-- chapter-nav:end -->
