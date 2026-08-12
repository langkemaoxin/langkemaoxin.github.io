---
title: "第 19 讲：SPN 与计算机账户"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 19 讲：SPN"
order: 5
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 19 讲：SPN 与计算机账户

### 麻烦

第 16 讲刚把 Kerberos 铺好：你拿 TGT 去换某服务的专用票。可现实里常出一种怪事——双击 `\\fileserver\share` 一切正常，但同一个域账户去连 SQL Server、连某个内网网站，弹一句 `目标主体名称不正确` 或 `无法生成 SSPI 上下文`，然后默默落回 NTLM，甚至直接失败。

共享能用、应用不能用——区别在哪？在于「**这个服务的名字，KDC 找不找得到**」。

### 这一讲只发明：服务在域里的「挂号名」——SPN

第 16 讲你换服务票时，本机会告诉 KDC「我要一张去 **X** 的票」，这个 X 就是服务的名字。问题是：域里有成千上万台机器、无数个服务，KDC 凭什么知道「X 对应哪个账户、该用哪个账户的密钥来加密这张票」？

需要一个**挂号本**：每个服务实例先在域里登记一个唯一的名字，KDC 凭这个名字反查出对应的账户。

这个「挂号名」，就是 **SPN（Service Principal Name，服务主体名称）**。

来源：[Service Principal Names](https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names)

SPN 的长相，你在第 16 讲的 `klist` 输出里其实已经见过：

```
服务器: cifs/jzfz15 @ JZFZ.LOCAL              ← cifs/jzfz15 就是一个 SPN
服务器: LDAP/JZFZDC10.jzfz.local @ JZFZ.LOCAL  ← LDAP/... 也是一个 SPN
```

通用格式（用不上的部分可省）：

```
服务类 / 主机 : 端口 / 服务名
cifs     / jzfz15
MSSQLSvc / db.jzfz.local : 1433
HTTP     / web.jzfz.local
```

- **服务类（ServiceClass）**：服务的「种类」，如 `cifs`（SMB 共享）、`MSSQLSvc`（SQL Server）、`HTTP`（网站）、`HOST`（一堆杂项服务的总称）；
- **主机**：服务跑在哪台机器上；
- 端口 / 服务名可选，用来区分同一台机上的多个实例。

#### SPN 的铁律：挂在一个账户上，且只能挂一个

SPN 不是孤立登记的——它**注册在某个域账户的 `servicePrincipalName` 属性里**。KDC 拿着 SPN 去 AD 查，查到哪个账户，就用那个账户的密钥加密服务票。于是有两条铁律：

1. **必须注册在「跑这个服务」的那个账户上**——否则 KDC 用别人的密钥加密，服务端解不开；
2. **同一个 SPN 全域只能注册一次**——注册两次，KDC 不知道该用哪个账户，干脆不发，Kerberos 直接失败。

这就是「共享能用、SQL 连不上」的根：**共享的 `cifs/主机名` 系统自动注册好了；而 SQL 的 `MSSQLSvc/...` 没人注册，或注册在了错误的账户上。**

口诀：

> **SPN 是服务的挂号名。挂错账户，或挂了两次，Kerberos 就罢工。**

### 计算机账户：自动挂号的那位

每台域加入的机器，在域里都有一个**计算机账户**，名字是「主机名 + `$`」，比如 `JZFZ15$`。它和人一样是安全主体，有自己的 SID、自己的密码（机器本地自动保管，约 30 天换一次）。

关键在：**机器加入域（以及每次启动）时，会自动把自己常用的 SPN 登记在自己的计算机账户上**——`HOST/主机名`、`cifs/主机名`、域控还会登记 `LDAP/...`、`GC/...`。

所以共享之所以「开箱即用」，是因为 `cifs/fileserver` 早被系统注册在了 `FILESERVER$` 这个计算机账户上，KDC 一查就到。

那 SQL Server、IIS 网站呢？如果它们以一个**域服务账户**（普通域用户账户）运行，SPN 就**得手工注册**到那个服务账户上——这正是出事的高发区。

来源：[Setspn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setspn)

### 怎么看见

**列出一个账户上挂了哪些 SPN**（计算机账户记得带 `$`）：

```bat
setspn -L jzfz15$
setspn -L JZFZ\sqlsvc
```

输出节选：

```
注册的 SPN:
    cifs/jzfz15
    cifs/jzfz15.jzfz.local
    HOST/jzfz15
    HOST/jzfz15.jzfz.local
    RestrictedKrbHost/jzfz15
    WSMAN/jzfz15
```

**反过来，查某个 SPN 在全域里挂在谁头上**：

```bat
setspn -Q MSSQLSvc/db.jzfz.local:1433
```

```
正在检查域 DC=jzfz,DC=local...
CN=SQL Service Account,CN=Users,DC=jzfz,DC=local
    MSSQLSvc/db.jzfz.local:1433

存在的现有 SPN 找到!
```

**揪出重复注册的 SPN（出事时第一个该跑的命令）**：

```bat
setspn -X
```

```
正在检查域 DC=jzfz,DC=local...
重复的 SPN 在 JZFZ\svc_sql 上找到:
    MSSQLSvc/db.jzfz.local:1433
重复的 SPN 在 JZFZ\JZFZ15$ 上找到:
    MSSQLSvc/db.jzfz.local:1433
找到 1 组重复的 SPN
```

同一个 SPN 挂在两个账户上，KDC 选不出来，Kerberos 必失败。

**界面路径**：`dsa.msc`（Active Directory 用户和计算机）→ 找到账户 → 右键属性 → **属性编辑器** 选项卡 → 找 `servicePrincipalName` 属性，能看到（也能编辑）全部挂号值。

**事件线索**（在域控上看 KDC 日志）：事件查看器 → `应用程序和服务日志\Kerberos-Key-Distribution-Center\Operational`，其中**事件 ID 11** 提示「SPN 找不到或重复」——这是「票发不出去」的现场口供。

来源：[Kerberos 身份验证概述](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)

### 收束

**你现在会了：** SPN 是服务的挂号名，注册在某个账户的 `servicePrincipalName` 属性里；计算机账户会自动挂号，服务账户要手工注册；`setspn -L`（列）、`-Q`（查归属）、`-X`（查重复）三个命令足以应付大多数「应用连不上」的现场。  
**下一讲才需要：** 上面讲的都是「认到这个人是谁」。但「管理员账户登录后，为什么还弹 UAC」「能备份整盘这种能力属于哪一类设置」——这些不再归登录管，而是**权利（Right）**与 UAC 的范畴，第 20 讲见。

---

<!-- chapter-nav:start -->
← 上一章：[第 18 讲：登录类型](./04-logon-types.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 20 讲：权利与 UAC](../vol3-rights-uac/01-rights-uac.md)
<!-- chapter-nav:end -->
