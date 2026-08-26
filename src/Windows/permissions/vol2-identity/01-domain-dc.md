---
title: "第 15 讲：域与域控——集中身份"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 15 讲：域与域控"
order: 1
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "Active Directory"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：卷一的模型在多机世界缺一本公共账——发明域与域控、加域挂靠、OU/CN/DN 分层账本。本机 LDAP 直查域账本实测：我的对象一行里 DN（真实 OU 树）、sAMAccountName、objectSid 四名一体；账本里数出四台域控，呼应卷一「三问三台 DC」。
---

# 第 15 讲：域与域控——集中身份

> **卷二·网上的身份（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。卷一在单机上跑通了全套模型；本卷把它带上网络。实验场：本机就是加域机器（`jzfz.local`），LDAP 直查域账本实测 2026-08-26。

---

## 开场：公司里不止一台电脑

**🧑‍🏫 老师：**

卷一的模型——账户 → SID → 令牌 → 组 → ACE——在一台机器上完整成立。但公司里不止一台电脑：

- 小王在 PC-A 上有账户，换到 PC-B 又要再建一遍；
- 第 8 讲的「设计组」若建在 PC-A 本地，PC-B 根本不认这个组；
- 共享盘上的 ACE 写了 `某台机器\某人`，人一换机就对不上。

缺的不是新权限机制，是：**让很多台机器共用同一本「人/组账本」**，而不是每台各写一本。本讲严格按西蒙节奏：先发明「公共账本 / 答账的服务器 / 电脑挂上账本」，再发明「账本里怎么分层」——**专有缩写一律后出现**。

---

## 第 1 课：发明一本公共账 + 一台答账的服务器

**🧑‍🏫 老师：**

**想做什么**：小王在任何挂上这本账的电脑上都是同一个人（同一个 SID）；「设计组」只建一次，一百台机器授权时都能引用。

**推导**（还不用官方名）：① 账本必须放在**大家都能问到的地方**——通常是一台常开的服务器；② 别人问「小王的 SID？」「密码对不对？」「他在不在设计组？」时，由这台机器**权威作答**；③ 普通办公电脑变成：本地仍可有自己的小账本，但「公司员工」这类问题改问公共账。

**现在才贴官方标签**：

| 刚才发明的东西 | 常见叫法 |
|----------------|----------|
| 这本公共账 + 围绕它的身份范围 | **域（Domain）**；微软产品名常叫 **Active Directory 域** |
| 放账本、负责答认证/查询的服务器 | **域控制器（Domain Controller，DC）** |
| 本机自己的小账本 | 卷一已会的 **SAM** |

回扣卷一第 3、4 讲：`Translate("公司\小王")` → 本机 LSA 去问这台答账服务器；用公司账户登录 → 验密也问它。

**🧑‍🎓 学生：** 这台机器不就是这样吗？能验证吗？

**🧑‍🏫 老师：**

三件套验证（本机实测）：

```text
PS> systeminfo | findstr Domain
Domain:  jzfz.local                ← 不是 WORKGROUP：这台机器挂着公共账

PS> nltest /dsgetdc:jzfz           （卷一第 5 讲跑过）
           DC: \\JZFZDC9 … Flags: GC DS LDAP KDC TIMESERV WRITABLE
```

`Flags` 里那串字母就是「答账服务器」的职能清单：GC（全局编录）、DS（目录服务）、LDAP（查询协议）、KDC（发票据）、TIMESERV（对时）、WRITABLE（可写）。

---

## 第 2 课：世界上第一台答账服务器怎么来

**🧑‍🏫 老师：**

实验室/小环境里两步（在一台 Windows Server 上，管理员 PowerShell）：

```powershell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools   # 装「能管目录身份」的角色
Install-ADDSForest -DomainName "lab.local"     # 创建第一本公共账（新林根域），重启生效
```

（[Install AD DS](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services--level-100-)；默认常一并装 DNS——别人要找到答账服务器，网络上靠 DNS 解析域名。）重启后这台机器就「背上了账本」：登录选项出现域账户体系。**搭域控 ≠ 搭文件共享**——本步只解决「身份权威在哪」。生产环境还有第二台 DC、备份、时间同步，不展开。

这一步**本机不能重演**（这台机器是成员机不是 Server、账本属于整个公司）——要动手请按[实验室附录](../appendix/04-lab.md)搭虚机。

---

## 第 3 课：新电脑挂上这本账（加域）

**🧑‍🏫 老师：**

新电脑出厂是**单机/工作组**，只认自己的 SAM。要挂靠：能连通答账服务器、**DNS 指向能解析域名的服务器**（常常就是 DC 自己——否则连「域在哪」都找不到）、你有本机管理员权限和一个允许加机的域账户。然后：

```powershell
Add-Computer -DomainName "jzfz.local"     # 按提示输域账密，重启
```

**挂靠成功时，账本上多了什么？** 不是「电脑里装了个 AD」，而是：① 公共账本里多了一条**这台电脑的记录**（计算机账户——机器也是主体，也有 SID）；② 电脑与域控之间建立可互相认证的关系（卷一第 4 讲那条 `nltest /sc_query` 看到的**安全通道**）；③ 重启后登录界面可选 `域\用户`。

> **加域 = 这台电脑在公共账上登记自己，并同意身份问题去问答账服务器。**

对照表（用卷一已会的词）：

| 问题 | 单机（工作组） | 已加入域 |
|------|----------------|----------|
| 「小王」存在哪？ | 只在本机 SAM；换机重建 | 在公共账；各成员机共用 |
| `whoami` 常见样子 | `电脑名\用户` | 常为 `域名\用户`（本机：`jzfz\chengongyi`） |
| 第 8 讲的组建在哪？ | 本地组，别的电脑不认 | 可建**域组**，多机 ACE 共用 |
| 文件 ACE 写谁？ | `电脑名\用户` 或本机组 | 还可写 `域名\用户` / `域名\组` |
| 本机管理员还在吗？ | 就是日常最高权 | **还在**；另多了域管理员等身份 |
| 公司统一策略？ | 每台手调 | 可从域下发（**组策略**，卷三展开） |

---

## 第 4 课：公共账不能是一锅粥——发明「文件夹」

**🧑‍🏫 老师：**

账本里人一多：研发、行政、外包挤在一个平面列表里，授权和委派都会糊。需要**像资源管理器一样用文件夹归类**。打开「Active Directory 用户和计算机」你会看到左边像树——有的节点像文件夹，下面挂用户、组、电脑。推导后再贴标签：

| 先理解成 | 官方常叫 |
|----------|----------|
| 人为建的「文件夹」，归类、方便委派 | **组织单位（OU）** |
| 树里某个叶子在这一层的名字 | **CN**（Common Name） |
| 域名拆开写进路径 | **DC**（Domain Component）——⚠️ 和「域控制器」缩写撞车，不是一回事 |
| 整条住址拼起来 | **DN**（可分辨名称） |

**🧑‍🎓 学生：** 账本里的「文件夹」能亲眼看看吗？

**🧑‍🏫 老师：**

这台机器就能——不用装任何工具，PowerShell 内置的 .NET 目录类直查（LDAP）：

```powershell
PS> $de=[ADSI]'LDAP://RootDSE'
PS> $de.defaultNamingContext
DC=jzfz,DC=local                                   ← 整本账的根住址

PS> $s=New-Object System.DirectoryServices.DirectorySearcher([ADSI]"LDAP://DC=jzfz,DC=local")
PS> $s.Filter='(&(objectClass=user)(sAMAccountName=chengongyi))'
PS> $r=$s.FindOne()
PS> $r.Properties.distinguishedname[0]
CN=陈共义(BIT),OU=BIT,OU=账户,OU=成都本部,OU=基准方中,DC=jzfz,DC=local
```

**这就是我在公共账上的一行**，住址从右往左读：域名两段（`DC=jzfz,DC=local`）→ 公司（`OU=基准方中`）→ 分部（`OU=成都本部`）→ 账户类（`OU=账户`）→ 部门（`OU=BIT`）→ 叶子（`CN=陈共义(BIT)`）。**四层文件夹叠出来的真实组织树**——GUI 里拖用户进 OU、PowerShell 建组，本质都是在改这棵树上的节点；工具、脚本、卷一第 3 讲的查找，背后都走 **LDAP** 这套约定去读写它。

---

## 插问：同一个人，为什么有好几个「名字」？

**🧑‍🎓 学生：** 我在这一行里看到的 `CN=陈共义(BIT)`、`sAMAccountName=chengongyi`、还有对象里的 SID——到底哪个「是」我？

**🧑‍🏫 老师：**

都是，但用途不同（[Object names and identities](https://learn.microsoft.com/en-us/windows/win32/ad/object-names-and-identities)）：

| 用途 | 对应什么 |
|------|----------|
| 在树里找到他、看他在哪个文件夹 | 完整住址 **DN**（搬家/改名会变） |
| 程序长期引用「就是他」 | **objectGUID**（创建后不变） |
| ACE / 令牌真正比对 | **objectSid**（卷一第 2 讲的 SID） |
| 人口头说的 `域名\小王` | **sAMAccountName** 那一侧 |

LDAP 查出来的同一行，四个名字对上（本机实测补齐后两个）：

```text
dn             : CN=陈共义(BIT),OU=BIT,OU=账户,OU=成都本部,OU=基准方中,DC=jzfz,DC=local
sAMAccountName : chengongyi
objectSid      : S-1-5-21-3977539503-3587586693-2971573549-279405   ← 和卷一 whoami 看到的一字不差
```

> **住址（DN）给人/工具找位置；SID 给权限系统对表。** 别混成一个概念。（`Get-ADUser` 需要 RSAT，本机没装——DirectorySearcher 是零依赖的等价物。）

---

## 第 5 课：新建一个「设计组」——账本上多了什么？

**🧑‍🏫 老师：**

场景还是第 8 讲的：共享盘不想对 30 个人各写一条 ACE → 建组。在域里建：

```powershell
New-ADGroup -Name "CD-平台-设计" -SamAccountName "CD-平台-设计" `
    -GroupCategory Security -GroupScope Global `
    -Path "OU=项目组,DC=jzfz,DC=local"
Add-ADGroupMember -Identity "CD-平台-设计" -Members "chengongyi"
```

创建瞬间账本上发生的事，用已会的概念推导：

```text
1) 公共树上多了一个「组」节点（挂在你选的文件夹下）
2) 它有显示名 / 相对名（CN）→ 拼出完整住址（DN）
3) 分到一个新的 SID                ← 以后进令牌、进 ACE
4) 人们口头说的 域名\CD-平台-设计 对上这个节点
5) 组员列表一开始是空的 → 加人只是改「谁属于组」
```

**关键认知**：`Add-ADGroupMember` 改的是账本里的成员关系，**共享盘 DACL 一行都还没动**。权限真正放开仍是老两步：① 文件/共享 ACE 授给 `域名\CD-平台-设计`；② 用户重新登录（令牌带上组 SID——卷一第 8 讲「名册有我、令牌查无此组」）。

> **域控上新建组 ≠ 自动打开某个文件夹。它只是多造了一个可被 ACE 引用的主体。**

建组向导还会问「安全组还是通讯组」：写进文件 ACE 选**安全组**；只为发邮件打包选**通讯组**（不能当 ACL 主体）。「作用域」（全局/本地域/通用）影响能嵌套/授权到哪——第 8 讲的 AGDLP 口诀在域里正式生效。最后点到为止：**Domain Admins（域管理员）**默认能量极大——几乎相当于「域里很多机器上的本地管理员血统」（卷一第 8 讲那行 `JZFZ\Domain Admins` 躺在每台成员机的本地管理员组里），日常办公账户**不要**长期放在里面（[Securing Domain Admins](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-f--securing-domain-admins-groups-in-active-directory)）。

---

## 收束

**你现在会了：** 多机要共用身份 → 发明公共账与答账服务器（域 / DC）→ 新电脑挂靠（加域 = 在账上登记自己 + 身份问题改问 DC）→ 账本用文件夹分层（OU/CN/DN，本机 LDAP 实测四层真实组织树）→ 同一个人的四个名字（DN / GUID / SID / sAMAccountName）→ 新建组只是账本里多一个带 SID 的主体，权限仍走 ACE + 令牌。

**下一讲才需要：** 访问 `\\服务器\共享` 时，对方如何在**不拿到你密码**的前提下相信「你是谁」——域里常用的「盖章 / 票据」机制：Kerberos。

---

<!-- chapter-nav:start -->
← 上一章：[第 14 讲：SACL](../vol1-invent/15-sacl.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 16 讲：Kerberos](./02-kerberos.md)
<!-- chapter-nav:end -->
