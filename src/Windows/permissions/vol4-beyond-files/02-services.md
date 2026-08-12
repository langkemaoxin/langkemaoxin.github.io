---
title: "第 26 讲：服务与服务账户权限"
sidebarGroup: "卷四·不只是文件"
shortTitle: "第 26 讲：服务权限"
order: 2
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 26 讲：服务与服务账户权限

### 麻烦

新人小李照着文档把业务服务配成用域账户 `DOMAIN\svc_app` 启动，结果服务一启动就报「拒绝访问日志目录」「拒绝访问注册表」。他盯着服务的属性页发呆：账户明明填对了，密码也没改过，那个文件夹的「安全」选项卡里也确实列着 `svc_app` 这个名字——为什么还是读不了？

毛病出在他把两件事搅成了一件：「**这个账户能不能作为服务跑起来**」和「**这个账户能不能读那个文件**」，是两道完全不同的关卡。

### 这一讲只发明：服务身份的两道关卡

一个 Windows 服务，本质是 **服务控制管理器（SCM，`services.exe`）** 拉起来的一个进程。SCM 启动它之前，先得回答一个问题：**这个进程用谁的身份跑？**——这就是服务的**登录身份（Log On As）**。

这个答案一旦定下来，后面就有两道关卡要过：一道在登录时，一道在每次访问资源时。

### 第一关：服务身份从哪来

配置服务时选的那个账户，决定了 SCM 启动进程后挂上去的**访问令牌**——就是第 5 讲发明的那个令牌，原样搬过来用。常见四种选择：

| 登录身份 | 实际 SID | 说明 |
|---|---|---|
| **本地系统**（Local System） | `NT AUTHORITY\SYSTEM` | 本机权限最高；在域里以**本机计算机账户**身份对外 |
| **本地服务**（Local Service） | `NT AUTHORITY\LOCAL SERVICE` | 权限极低；网络上相当于匿名 |
| **网络服务**（Network Service） | `NT AUTHORITY\NETWORK SERVICE` | 本机低权限；网络上以**本机计算机账户**身份 |
| **此账户**（某用户） | 该用户 SID | 要填密码，还要额外授一项权利（见下一关） |

来源：[Service Logon Types](https://learn.microsoft.com/en-us/windows/win32/services/service-logon-types)

要点：**前三者是内置的伪账户，密码由系统管，你不用填**；只有选「此账户」时，你才要提供用户名密码，SCM 拿它创建登录会话、发令牌。

> 口诀：**服务跑起来 = SCM 选账户 → LSA 登录 → 发令牌挂进程。**  
> 令牌里的 SID、组、权利，和这个账户交互登录得到的基本一致。

### 第二关：「作为服务登录」是一项权利，不是权限

这是小李踩的第一个坑。当你把服务配成用 `DOMAIN\svc_app` 启动时，**这个账户必须拥有「作为服务登录」（SeServiceLogonRight）这项用户权利**，否则 SCM 一启动就报 **错误 1069**（登录失败），服务直接趴下。

注意：这是**卷三讲过的「权利（Right）」**，不是 ACL——它是 LSA 在登录阶段做的检查，跟任何对象的「安全」选项卡都没关系。装某些软件时，安装包会顺手给账户加上这项权利，所以平时你没感觉；一旦手动换账户，这一关立刻露出来。

来源：[Log on as a service（用户权利分配）](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/log-on-as-a-service)

### 第三关：读不读得了文件，看的还是对象 ACL

服务过了第二关、令牌挂上去之后，它读目录、写注册表时做的访问检查，和你手动双击打开一个文件**一模一样**——拿令牌里的 SID，去比对象的 DACL。

所以小李看到的「文件夹安全选项卡里有 `svc_app`」，如果只是名字列在那儿、却没勾上「读取和执行」「读取」，照样读不了。这就是**卷一、卷二、卷四一路在讲的 DACL**，和服务这件事没有任何特殊关系。

> 口诀：**「能不能作为服务登录」是权利，在发令牌之前定生死；「能不能读文件」是 ACL，在令牌发出来之后才检查。**  
> 一个是买票，一个是验票——两道关，别混。

### 服务自己也是个对象（点到为止）

容易忽略的一点：**服务本身也是一个可保护对象**。SCM 数据库里每条服务记录都有自己的安全描述符（SDDL），决定「谁能启动、停止、查询、改这个服务的配置」。这就是为什么普通用户能停某些服务、却停不了系统服务——不是账户不够格，是那条服务记录的 DACL 只授了管理员和 SYSTEM。

来源：[Service Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights)

这层一般不用日常摆弄，知道有这么一道就行。

### 怎么看见

**1. 看服务的登录身份**——`SERVICE_START_NAME` 那一行就是：

```bat
sc qc WinDefend
```

```
SERVICE_NAME: WinDefend
        BINARY_PATH_NAME   : "C:\ProgramData\Microsoft\Windows Defender\MsMpEng.exe"
        SERVICE_TYPE       : 10  WIN32_OWN_PROCESS
        START_TYPE         : 2   AUTO_START
        ...
        SERVICE_START_NAME : LocalSystem
```

取值会是 `LocalSystem` / `NT AUTHORITY\NetworkService` / `NT AUTHORITY\LocalService`，或某个 `域\用户`。

来源：[sc qc](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-qc)

**2. 看服务对象本身的 ACL（SDDL）**：

```bat
sc sdshow WinDefend
```

```
D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)...
```

`SY`=SYSTEM、`BA`=Built-in Administrators，SDDL 完整语法见卷二附录。

**3. 查「作为服务登录」权利授予了谁**（管理员 PowerShell）：

```powershell
secedit /export /cfg policy.cfg /areas USER_RIGHTS
notepad policy.cfg     # 定位 SeServiceLogonRight 那一行
del policy.cfg
```

**4. 服务读不了文件——三步联查**：

```bat
:: (a) 服务的登录身份是谁
sc qc MyService

:: (b) 这个身份的令牌里有什么（用 PsExec -s 以 SYSTEM 开 cmd，或 -u 域\账户 模拟登录）
whoami /all

:: (c) 文件夹对这个账户的实际授权
icacls D:\AppLogs
```

来源：[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

### 收束

**你现在会了：** 服务身份从哪来（SCM 选账户 → LSA 发令牌挂进程），「作为服务登录」是一项**权利**（卷三）而非权限，访问文件/注册表走的是**对象 ACL**（卷一/二/四），以及服务对象本身也有一层 DACL。下次遇到「服务读不了目录」，先看是 **1069 登录失败**、还是**访问被拒**——前者查权利，后者查 ACL。

**下一讲才需要：** 域里的服务账户越积越多，谁有资格去改它们的配置？怎么把这种管理权**委派**给某个运维组，而不发完整域管账号？这就是 **AD 委派**（第 27 讲）。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 25 讲：注册表 ACL](./01-registry.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 27 讲：AD 委派](./03-ad-delegation.md)
<!-- chapter-nav:end -->
