---
title: "第 21 讲：用户权利（Privileges）"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 21 讲：用户权利"
order: 2
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 21 讲：用户权利（Privileges）

### 麻烦

第 20 讲里小王踩过一个坑：给自己加了 `Deny 读取`，夜间备份却照样把文件读走了。他当时的困惑——「门上的字我没写错，怎么不灵了？」这一讲专门把那件事讲透：令牌里那份**特权名单**到底从哪来、怎么进令牌、跟门上的 ACE 究竟是什么关系。

### 这一讲只发明：用户权利（Privileges）

先用一句话把位置定死：

> **对象权限**贴在对象上，回答「这个文件夹、注册表项，你能不能动」；  
> **用户权利**贴在账户上，回答「你这个账户，有没有某类系统能力」。

备份、关机、改系统时间、当服务登录、调试别的进程——这些都是**跟具体对象无关**的能力，写在安全策略里，不是某条 ACE。

来源：[User Rights Assignment](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/user-rights-assignment)

#### Deny 为什么没挡住备份：走的是另一套规矩

回到小王那条 `icacls /deny`。资源管理器双击打开文件夹，走的是**对象权限**那条路——门上写着 Deny，自然进不去。

备份程序不是「双击打开」。它用专门的备份 API 访问文件，并依赖账户令牌里的一项特权：**`SeBackupPrivilege`**（备份文件和目录）。这项特权一旦启用，访问检查会**绕过常规 DACL 判断**——不是 ACE 失效了，而是备份另有通道。

来源：[Privilege Constants（SeBackupPrivilege）](https://learn.microsoft.com/en-us/windows/win32/secauthz/privilege-constants)

> 门上的 Deny 没坏；小王只是看错了「备份走的是哪套规矩」。

#### 这套规矩从哪来：策略 → 登录 → 令牌

[第 5 讲](../vol1-invent/06-access-token.md)讲过，令牌是登录时 LSA 造的。那份特权名单不是凭空出现，路径是这样的：

1. 管理员在「本地安全策略」（`secpol.msc`）或组策略里，把某项权利**分配**给某个账户/组——例如「备份文件和目录」→ 某备份服务账户。
2. 这些分配记录在 **LSA 的安全策略数据库**里（域里通过 GPO 下发）。
3. 你**登录**时，LSA 查这条数据库：「这个账户（含它所属的组）被授予了哪些权利？」把结果写进令牌的**特权列表**。
4. 之后令牌挂在每个进程上，特权跟着进程走——直到注销。

来源：[Privileges（概述）](https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges)

口诀：

> **权利是策略授的，登录时进令牌，之后跟着进程走。**  
> 改了策略不会立刻生效——要等**下次登录**才重新装进令牌。

这里有个常被忽略的坑：你在 `secpol.msc` 里给某账户加了「备份」权利，他**当前**会话不会马上多出这项特权；得注销重登才看得到。

#### 启用与禁用：令牌里有，不等于「正在用」

`whoami /priv` 里那列「状态」很关键：

- **已禁用（Disabled）**：特权在令牌里，但默认不参与——程序要用时得先**启用**（`AdjustTokenPrivileges`）；
- **已启用（Enabled）**：当前可直接使用。

`SeBackupPrivilege` 通常「已禁用」地躺在管理员令牌里；备份工具启动时才把它启用，用完再禁回去。所以**列表里看见 ≠ 已经生效**——这是 `whoami /priv` 的正确读法。

来源：[AdjustTokenPrivileges](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-adjusttokenprivileges)

#### ACE 和权利：一张表分清

| | 对象权限（Permissions / ACE） | 用户权利（User Rights / Privileges） |
|--|-------------------------------|--------------------------------------|
| 贴在哪 | **每个对象**上（文件夹、注册表项、打印机…） | **账户**上（经策略分配） |
| 看在哪 | `icacls`、属性→安全 | `secpol.msc`、`whoami /priv` |
| 进令牌吗 | 不进；访问检查时拿令牌去比对 ACL | **进**；登录时写入令牌特权列表 |
| 典型例子 | 读、写、执行、删除 | 备份、还原、关机、当服务登录、调试进程 |
| 谁配的 | 资源所有者 / 管理员 | 本地安全策略 / 组策略 |

> 改一条 ACE，只影响那一个对象；  
> 改一项权利，影响该账户**未来所有登录会话**的整体能力。

来源：[Appendix B - Privileged accounts and groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)

#### 一条红线：这里不教「怎么用特权去绕 Deny」

既然备份特权能绕过常规 DACL，那「手动启用 `SeBackupPrivilege` 去读一个 Deny 目录」显然是个现成的攻击技巧。**本讲不讲这一步的操作**——只建立地图：知道门上有 ACE、令牌里有特权、两者各走哪条路。真正的利用留给专门的渗透课程；学权限模型，先把「为什么会这样」想清楚。

### 怎么看见

**GUI**：`secpol.msc` → 本地策略 → **用户权限分配**——右边是一整张「权利 → 被授予的账户/组」清单。

**命令**——看当前令牌里的特权：

```bat
whoami /priv
```

精简输出（管理员会话，名称随语言略变）：

```text
特权名称                    描述                              状态
SeBackupPrivilege           备份文件和目录                     已禁用
SeRestorePrivilege          还原文件和目录                     已禁用
SeDebugPrivilege            调试程序                           已启用
SeShutdownPrivilege         关闭系统                           已禁用
SeTakeOwnershipPrivilege    取得文件或其他对象的所有权         已禁用
SeChangeNotifyPrivilege     绕过遍历检查                       已启用
SeImpersonatePrivilege      身份验证后模拟客户端               已启用
```

读法：列表里有 `SeBackupPrivilege` → 策略授过这项权利；「已禁用」→ 要用得先启用，不代表没有。

**查某项权利授予了谁**（以「备份文件和目录」为例）：

```powershell
secedit /export /cfg policy.cfg /quiet
Select-String "SeBackupPrivilege" policy.cfg
```

输出会列出拥有该项权利的账户——和 `secpol.msc` 里看到的一致。

来源：[secedit](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/secedit)、[whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami)

### 收束

**你现在会了：** 对象权限贴在对象上、用户权利贴在账户上；权利由策略分配，登录时进令牌，跟着进程走；`whoami /priv` 那列「已禁用/已启用」才是正确读法；备份能绕开 Deny，不是因为 ACE 坏了，而是走了特权那条路。

**下一讲才需要：** 既然令牌这么关键，那管理员登录时为什么还要被「先降权」拦一下——这就是 UAC 要做的事。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 20 讲：权利与 UAC](./01-rights-uac.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 22 讲：UAC](./03-uac.md)
<!-- chapter-nav:end -->
