---
title: "第 26 讲：服务与服务账户权限"
sidebarGroup: "卷四·不只是文件"
shortTitle: "第 26 讲：服务权限"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：服务身份的两道关卡——「能不能作为服务登录」是权利（发令牌之前）、「能不能读文件」是 ACL（发令牌之后）。本机实拍 309 个服务的身份分布（195 个 LocalSystem）、Dhcp 服务的 SDDL 原文逐段解码、「作为服务登录」权利的虚拟账户账本。
---

# 第 26 讲：服务与服务账户权限

> **卷四·不只是文件（共 3 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[Service Logon Types](https://learn.microsoft.com/en-us/windows/win32/services/service-logon-types)、[Service Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights)。

---

## 开场

**🧑‍🏫 老师：**

新人小李照文档把业务服务配成用域账户 `DOMAIN\svc_app` 启动，服务一启动就报「拒绝访问日志目录」「拒绝访问注册表」。他盯着属性页发呆：账户明明填对了、密码没改过、文件夹安全选项卡里也确实列着 svc_app——为什么还是读不了？

**🧑‍🎓 学生：** 他是不是把两件事搅成了一件？

**🧑‍🏫 老师：**

对：「**这个账户能不能作为服务跑起来**」和「**这个账户能不能读那个文件**」，是两道完全不同的关卡。一个 Windows 服务本质是**服务控制管理器（SCM，services.exe）**拉起来的进程；SCM 启动它之前先回答：**这个进程用谁的身份跑？**——服务的**登录身份（Log On As）**。答案定下后有两道关卡：一道在登录时，一道在每次访问资源时。

---

## 第 1 课：第一关——服务身份从哪来

**🧑‍🏫 老师：**

配置里选的账户，决定 SCM 启动进程后挂上去的**访问令牌**——第 5 讲那个令牌原样搬来。四种选择：

| 登录身份 | 实际 SID | 说明 |
|---|---|---|
| **本地系统**（Local System） | `NT AUTHORITY\SYSTEM` | 本机权限最高；域里以**本机计算机账户**身份对外 |
| **本地服务**（Local Service） | `NT AUTHORITY\LOCAL SERVICE` | 权限极低；网络上相当于匿名 |
| **网络服务**（Network Service） | `NT AUTHORITY\NETWORK SERVICE` | 本机低权限；网络上以**本机计算机账户**身份 |
| **此账户**（某用户） | 该用户 SID | 要填密码，还要额外授一项权利（第二关） |

前三者是内置伪账户、密码系统管；只有「此账户」要你提供账密。**这台机器上 309 个服务的身份分布**（实测统计）：

```text
195  LocalSystem                    ← 绝大多数系统服务：本机最高权
 71  NT AUTHORITY\LocalService      ← 低权限 + 网络匿名
 23  NT AUTHORITY\NetworkService    ← 低权限 + 以机器身份出网
 20  （驱动/特殊，StartName 为空）
   0  普通域账户                     ← 一个都没有——「此账户」在这台机器上无人使用
```

单看一个服务（本机实拍）：

```text
PS> sc qc Dhcp
SERVICE_NAME: Dhcp
        TYPE               : 20  WIN32_SHARE_PROCESS
        START_TYPE         : 2   AUTO_START
        BINARY_PATH_NAME   : C:\windows\system32\svchost.exe -k LocalServiceNetworkRestricted -p
        SERVICE_START_NAME : NT Authority\LocalService      ← 它的身份
```

> **服务跑起来 = SCM 选账户 → LSA 登录 → 发令牌挂进程。**（第 18 讲的 LogonType 5——本机 4624 统计里那 97 条服务登录的实物。）

---

## 第 2 课：第二关——「作为服务登录」是权利，不是权限

**🧑‍🏫 老师：**

小李踩的第一个坑在这：把服务配成 `DOMAIN\svc_app` 启动时，这个账户必须拥有**「作为服务登录」（SeServiceLogonRight）这项用户权利**，否则 SCM 一启动就报**错误 1069**（登录失败）。这是**卷三的权利**，不是 ACL——LSA 在登录阶段检查，跟任何对象的安全选项卡无关。装某些软件时安装包会顺手加上这项权利，所以平时没感觉；一换账户立刻露馅。

本机权利账本实拍（secedit 导出的那行）：

```text
SeServiceLogonRight = *S-1-5-80-0, *S-1-5-82-1036420768-…（8 个 S-1-5-82-*）, *S-1-5-83-0
```

没有普通用户——全是**虚拟账户 SID**：`S-1-5-80`（NT SERVICE 一族）、`S-1-5-82`（IIS 应用池虚拟账户）、`S-1-5-83`（计划任务）。现代 Windows 的默认：真实账户想当服务跑，得有人**显式**把它的 SID 加进这行——这正是「虚拟账户/托管服务账户（MSA/gMSA）」被推崇的原因：它们自带服务登录资格，密码还系统管。

---

## 第 3 课：第三关——读不读得了文件，看的还是对象 ACL

**🧑‍🏫 老师：**

服务过了第二关、令牌挂上后，它读目录写注册表做的访问检查，和你手动双击文件**一模一样**——令牌 SID 对 DACL。小李看到的「安全选项卡里有 svc_app」，若只是名字列在那、没勾「读取和执行」，照样读不了。卷一的模型在这里没有任何特殊化。

> **「能不能作为服务登录」是权利，在发令牌之前定生死；「能不能读文件」是 ACL，在令牌发出来之后才检查。一个是买票，一个是验票——两道关，别混。**

排障口诀：**先看报错是 1069（登录失败→查权利）还是「访问被拒」（→查 ACL）**；三步联查 `sc qc MyService`（身份是谁）→ 该身份令牌里有什么 → `icacls` 那个目录的实际授权。

---

## 插问：服务自己也是个对象？

**🧑‍🎓 学生：** 有没有反过来——谁能启动/停止/改配置某个服务，由什么决定？

**🧑‍🏫 老师：**

好问题——**服务本身就是可保护对象**：SCM 数据库里每条服务记录都有自己的安全描述符（SDDL），决定「谁能启动、停止、查询、改配置」。这就是为什么普通用户能停某些服务、停不了系统服务——不是账户不够格，是那条服务记录的 DACL 只授了管理员和 SYSTEM。本机实拍 Dhcp 服务的 SDDL 原文：

```text
PS> sc sdshow Dhcp
D:(A;;CCLCSWLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;NO)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)
 (A;;CCLCSWRPLOCRRC;;;S-1-2-1)(A;;CCLCSWRPWPDTLOCRRC;;;SY)
S:(AU;FA;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;WD)
```

用卷一第 9 讲的 SDDL 眼光逐段读：`D:` 段里 `AU`（Authenticated Users）拿到 `CC…RC`（连接/查询/读状态一串位）、`NO`（Network Operators）更多些、`BA`（Administrators）那一长串 `…SDRCWDWO` 含改配置和改所有者、`S-1-2-1`（**CONSOLE LOGON**——第 18 讲的门第组！坐在这台机器前的人可以启动/停止它）、`SY`（SYSTEM）；`S:` 段是 SACL（WD=Everyone 的失败审计）——**一张 SDDL 同时解码出五格里的 DACL 和 SACL**，卷一的知识在这全部接上了。

---

## 收束

**你现在会了：** 服务身份从哪来（SCM 选账户 → LSA 发令牌挂进程；本机 195/71/23 的身份分布实测）；「作为服务登录」是**权利**（账本里全是虚拟账户）；访问文件/注册表走**对象 ACL**；服务对象本身也有一层 DACL（Dhcp 的 SDDL 逐段解码）。排障先分 1069 还是访问被拒。

**下一讲才需要：** 域里的服务账户越积越多，谁有资格去改它们的配置？怎么把管理权**委派**给某个运维组、而不发完整域管账号——AD 委派。

---

<!-- chapter-nav:start -->
← 上一章：[第 25 讲：注册表 ACL](./01-registry.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 27 讲：AD 委派](./03-ad-delegation.md)
<!-- chapter-nav:end -->
