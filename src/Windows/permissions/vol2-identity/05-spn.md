---
title: "第 19 讲：SPN 与计算机账户"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 19 讲：SPN"
order: 5
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "Active Directory"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：服务在域里的「挂号名」——SPN 挂在账户上、全域唯一。本机实测：计算机账户 PC3507$ 的真实挂号清单（HOST/TERMSRV/WSMAN/CmRcService）、setspn -Q 查归属、cifs 查无此名却共享照用的 HOST 别族解释。
---

# 第 19 讲：SPN 与计算机账户

> **卷二·网上的身份（共 5 讲，本卷收官）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[Service Principal Names](https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names)、[Setspn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setspn)。

---

## 开场：共享能用、应用不能用

**🧑‍🏫 老师：**

第 16 讲刚把 Kerberos 铺好：拿 TGT 去换某服务的专用票。可现实常出怪事——双击 `\\fileserver\share` 一切正常，但同一个域账户去连 SQL Server、连某个内网网站，弹一句「目标主体名称不正确」或「无法生成 SSPI 上下文」，然后默默落回 NTLM（上一讲的退路），甚至直接失败。

**🧑‍🎓 学生：** 共享能用、应用不能用——区别在哪？

**🧑‍🏫 老师：**

在于「**这个服务的名字，KDC 找不找得到**」。第 16 讲换服务票时，本机告诉 KDC「我要一张去 **X** 的票」——域里有成千上万台机器、无数个服务，KDC 凭什么知道「X 对应哪个账户、该用哪个账户的密钥来加密这张票」？

需要一个**挂号本**：每个服务实例先在域里登记一个唯一的名字，KDC 凭名字反查出账户。这个挂号名就是 **SPN（Service Principal Name，服务主体名称）**。

SPN 的长相你在第 16 讲的 `klist` 里已经见过：

```text
Server: cifs/jzfz15 @ JZFZ.LOCAL              ← cifs/jzfz15 就是一个 SPN
Server: LDAP/JZFZDC10.jzfz.local @ JZFZ.LOCAL ← LDAP/... 也是
```

通用格式（用不上的部分可省）：

```text
服务类 / 主机 [: 端口] [/ 服务名]
cifs     / jzfz15
MSSQLSvc / db.jzfz.local : 1433
HTTP     / web.jzfz.local
```

**服务类**是服务的「种类」：`cifs`（SMB 共享）、`MSSQLSvc`（SQL）、`HTTP`（网站）、`HOST`（一堆杂项服务的总称）；主机是跑在哪台机器上；端口/服务名可选，区分同机多实例。

---

## 第 1 课：两条铁律

**🧑‍🏫 老师：**

SPN 不是孤立登记的——它**注册在某个域账户的 `servicePrincipalName` 属性里**。KDC 拿 SPN 去 AD 查，查到哪个账户，就用那个账户的密钥加密服务票。于是两条铁律：

1. **必须注册在「跑这个服务」的那个账户上**——否则 KDC 用别人的密钥加密，服务端解不开票；
2. **同一个 SPN 全域只能注册一次**——注册两次，KDC 不知道该用哪个账户，干脆不发，Kerberos 直接失败。

这就是「共享能用、SQL 连不上」的根：**共享的 `cifs/主机名` 由系统自动挂号好了；而 SQL 的 `MSSQLSvc/...` 没人注册、或注册在了错误的账户上**。

> **SPN 是服务的挂号名。挂错账户，或挂了两次，Kerberos 就罢工。**

---

## 第 2 课：计算机账户——自动挂号的那位

**🧑‍🏫 老师：**

每台加域机器在域里都有一个**计算机账户**，名字是「主机名 + `$`」。它和人一样是安全主体——有自己的 SID、自己的密码（机器本地自动保管、约 30 天换一次）。关键在：**机器加域（及每次启动）时，会自动把自己常用的 SPN 登记在自己的计算机账户上**。本机实测（真实输出）：

```text
PS> setspn -L PC3507$
Registered ServicePrincipalNames for
  CN=PC3507,OU=pc,OU=员工用电脑,OU=成都本部,OU=基准方中,DC=jzfz,DC=local:
    WSMAN/pc3507                    ← WinRM 远程管理
    WSMAN/pc3507.jzfz.local
    CmRcService/PC3507              ← SCCM 客户端服务
    CmRcService/pc3507.jzfz.local
    TERMSRV/PC3507                  ← 远程桌面！
    TERMSRV/pc3507.jzfz.local
    RestrictedKrbHost/PC3507
    HOST/PC3507                     ← 杂项总称
    HOST/pc3507.jzfz.local
```

三个看点：① 每个名字常登记**两份**（短名 + FQDN——两种写法都得能换到票）；② `TERMSRV` 在，说明有人 RDP 这台机器时能拿到 Kerberos 票（上一卷 4624 统计里那两条 LogonType 10 的后勤）；③ 这份清单**同时能用 LDAP 查到**（`servicePrincipalName` 属性就在账本里，DirectorySearcher 一查同款）——GUI 等价物是 `dsa.msc` → 账户属性 → 属性编辑器 → `servicePrincipalName`。

**🧑‍🎓 学生：** 等等——清单里没有 `cifs/pc3507`！但共享明明能用（第 16 讲 klist 里还见过 cifs 的票）。铁律不是说要挂号吗？

**🧑‍🏫 老师：**

好眼力，这正是 HOST 的门道：**`HOST` 是一族服务的总称**，KDC 认账时 `cifs`、`http` 等一批服务类可以**落在 HOST 挂号之下**（别名族）。实测验证：`setspn -Q cifs/pc3507` 明确回「**No such SPN found**」——但共享照用，因为 KDC 解析时把它归到了 `HOST/PC3507` 这族。所以「共享开箱即用」的完整解释是：**系统自动挂了 HOST 族，cifs 靠别名沾光**；而 SQL 的 `MSSQLSvc` **不在** HOST 别名族里、也不是系统自动挂的——服务跑在域服务账户上时，SPN 就得**手工注册**到那个账户上，这正是出事高发区。

三个排障命令收口：

```bat
setspn -L 账户名        :: 列：这账户挂了哪些号（计算机账户记得带 $）
setspn -Q SPN           :: 查：这个号在全域挂在谁头上
setspn -X               :: 揪重复：同一个号挂了两次的（Kerberos 必挂的元凶）
```

**事件线索**：域控的事件查看器 → `应用程序和服务日志\Kerberos-Key-Distribution-Center\Operational`，**事件 ID 11** 提示「SPN 找不到或重复」——「票发不出去」的现场口供。

---

## 收束

**你现在会了：** SPN 是服务的挂号名，注册在某个账户的 `servicePrincipalName` 属性里；**计算机账户自动挂号**（本机 HOST/TERMSRV/WSMAN/CmRcService 实测），**服务账户要手工注册**（MSSQLSvc 高发区）；`setspn -L/-Q/-X` 三连应付大多数「应用连不上」的现场；HOST 别名族解释了「cifs 查无此名、共享照常能用」。

**下一卷才需要：** 本卷讲的都是「认到这个人是谁」。但「管理员账户登录后为什么还弹 UAC」「能备份整盘这种能力属于哪一类设置」——不再归登录管，而是**权利（Right）**与 UAC 的范畴：卷三见。

---

<!-- chapter-nav:start -->
← 上一章：[第 18 讲：登录类型](./04-logon-types.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 20 讲：权利与 UAC](../vol3-rights-uac/01-rights-uac.md)
<!-- chapter-nav:end -->
