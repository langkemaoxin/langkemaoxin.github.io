---
title: "第 15 站：域与域控——集中身份"
sidebarGroup: "权限"
shortTitle: "第 15 站：域与域控"
order: 21
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "NTFS"
  - "Active Directory"
  - "权限"
  - "安全"
---

# 第 15 站：域与域控——集中身份

### 麻烦

公司里不止一台电脑。

- 小王在 PC-A 上有账户，换到 PC-B 又要再建一遍；  
- 第 8 站的「设计组」若建在 PC-A 本地，PC-B 根本不认这个组；  
- 共享盘上的 ACE 写了 `某台机器\某人`，人一换机就对不上。

第 1～8 站的模型（账户 → SID → 令牌 → 组 → ACE）仍然成立。  
缺的是：**让很多台机器共用同一本「人/组账本」**，而不是每台各写一本。

> 本站严格按西蒙节奏：先发明「公共账本 / 答账的服务器 / 电脑挂上账本」，  
> 再发明「账本里怎么分层、新建一个组时多了什么」。  
> **专有缩写一律后出现。**

---

### 15.1 先发明：一本公共账 + 一台答账的服务器

#### 想做什么

希望：小王在任何已挂上这本账的电脑上，都是同一个人（同一个 SID）；  
「设计组」只建一次，一百台机器授权时都能引用。

#### 推导（还不用官方名）

1. 账本必须放在**大家都能问到的地方**——通常是一台常开的服务器。  
2. 别人问「小王的 SID？」「密码对不对？」「他在不在设计组？」时，由这台机器**权威作答**。  
3. 普通办公电脑变成：**本地仍可有自己的小账本**，但「公司员工」这类问题改问公共账。

#### 给发明贴官方标签（此刻才出现）

| 刚才发明的东西 | 常见叫法 |
|----------------|----------|
| 这本公共账 + 围绕它的身份范围 | **域（Domain）**；微软产品名常叫 **Active Directory 域** |
| 放账本、常负责答认证/查询的那台服务器 | **域控制器（Domain Controller，DC）** |
| 本机自己的小账本 | 前几站已会的 **SAM**（本地用户/组） |

回扣第 3、4 站（不重讲过程）：

- `Translate("公司\\小王")` → 本机 LSA 常去问这台答账服务器；  
- 用公司账户登录 → 验密也常问它。

来源（身份存在哪）：[Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)  
（域里的账户/组是目录对象；本机本地账户/组由该机 SAM 管，只约束本机资源。）

来源（加域后 SAM 与域的分工）：[Credentials processes - SAM](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)  
（每台 Windows 仍有 SAM；计算机加入域后，**域账户**由 Active Directory 管；客户机用域账户参与网络时会与域控交互。）

---

### 15.2 想做什么：世界上出现第一台「答账服务器」

实验室/小环境：先有一台 Windows Server，再让它背上公共账本。

#### 标记预告（两步就够建立直觉）

**第一步：装上「能管目录身份」的服务器角色**

```powershell
# 在准备当答账服务器的 Windows Server 上，管理员 PowerShell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
```

来源：[Core Network Guide](https://learn.microsoft.com/en-us/windows-server/networking/core-network-guide/core-network-guide)

**第二步：创建「第一本」公共账（新林的根域）**

```powershell
# 域名换成你的环境，例如 jzfz.local；过程会要「目录服务还原模式」密码，完成后重启
Install-ADDSForest -DomainName "jzfz.local"
```

来源：[Install AD DS](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services--level-100-)  
（`Install-ADDSForest` 安装新林；默认常一并安装 DNS。）  
另见：[Install a new Windows Server Active Directory forest](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-)

#### 现象 → 推导

重启之后你会感到：

- 这台机器**不再只是「普通文件服务器」**，而变成了「账本所在地」；  
- 登录选项里开始出现**域账户**体系；  
- 别人要找到这台答账服务器，网络上常靠 **DNS**（所以新林安装默认爱带上 DNS）。

> **搭域控 ≠ 搭文件共享。**  
> 共享盘可以稍后另做；本步只解决「身份权威在哪」。

（生产环境还有第二台域控、备份、时间同步等——本站不展开，以免抢走「公共账」这一条主线。）

---

### 15.3 想做什么：新买的电脑如何挂上这本账

新电脑出厂时是**单机/工作组**：只认自己的 SAM。  
要让它问公共账，需要一次「挂靠」。

#### 前置（用已经会的网络直觉）

1. 电脑能 ping 通答账服务器；  
2. **DNS 指向能解析域名的那台**（常常就是域控自己）——否则它连「域叫什么、服务器在哪」都找不到；  
3. 你有**本机管理员**权限，以及域里一个允许加电脑的账户。

#### 命令（官方路径之一）

```powershell
# 在新电脑上：本机管理员身份运行；按提示输入域用户名密码；然后重启
Add-Computer -DomainName "jzfz.local"
```

或命令行：`netdom join %COMPUTERNAME% /domain:jzfz.local /userd:域名\用户 /passwordd:*`  
来源：[Join a computer to a domain](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/join-computer-to-domain)、[Core Network Guide - joining](https://learn.microsoft.com/en-us/windows-server/networking/core-network-guide/core-network-guide)

GUI 等价：系统设置 → 关于 → 重命名此电脑（高级）→ 加入域。

#### 推导：挂靠成功时，账本上多了什么？

不是「电脑里多装了一个 AD」，而是：

1. **公共账本里多了一条「这台电脑」的记录**（计算机账户）；  
2. 电脑与域控之间建立起可互相认证的关系（后文运维常说安全通道）；  
3. 重启后，登录界面可以选 **域\用户**，而不只是本机用户。

> **加域 = 这台电脑在公共账上登记自己，并同意身份问题去问答账服务器。**

---

### 15.4 对照：单机 vs 已挂上公共账的电脑

用前几站已会的词对比——仍尽量少堆新名词：

| 问题 | 单机（工作组） | 已加入域 |
|------|----------------|----------|
| 「小王」存在哪？ | 只在本机 SAM；换机要重建 | 在公共账；各成员机共用 |
| `whoami` 常见样子 | `电脑名\用户` | 常为 `域名\用户` |
| `Translate("域名\小王")` | 往往失败或与域无关 | 本机 LSA 可去问域控 |
| 第 8 站的组建在哪？ | 本地组，别的电脑不认 | 可建**域组**，多机 ACE 共用 |
| 文件 ACE 写谁？ | `电脑名\用户` 或本机组 | 还可写 `域名\用户` / `域名\组` |
| 本机管理员还在吗？ | 就是日常最高权 | **还在**；另多了域管理员等身份 |
| 公司统一锁屏/软件策略？ | 每台手调 | 可从域下发（**组策略**；本站只点到「能统一管」，不展开） |

最小自检（加域后的电脑）：

```bat
whoami
whoami /groups
systeminfo | findstr /i "Domain"
```

若 `Domain` 一行已是域名（不是 `WORKGROUP`），说明挂靠成功。

---

### 15.5 想做什么：公共账不能是一锅粥 → 发明「文件夹」

账本里人一多：研发、行政、外包挤在一个平面列表里，授权和委派都会糊。  
需要：**像资源管理器一样，用文件夹把对象归类**。

#### 现象预告

打开「Active Directory 用户和计算机」这类工具，你会看到左边像树：  
有的节点像**文件夹**，下面挂用户、组、电脑。

#### 推导后再贴标签

| 先理解成 | 官方常叫 |
|----------|----------|
| 人为建的「文件夹」，用来归类、方便委派 | **组织单位（OU）** |
| 树里某个叶子（用户/组/电脑）在这一层的名字 | 常用属性叫 **CN**（Common Name，通用名） |
| 域名拆开写进路径（`jzfz` + `local`） | **DC**（Domain Component，域分量）——注意：这里的 DC **不是**「域控制器」缩写撞车 |

整条「住址」拼起来，目录术语叫 **DN（可分辨名称）**，例如：

```text
CN=设计组,OU=项目组,DC=jzfz,DC=local
   ↑叶子名   ↑文件夹   ↑域名拆段
```

来源：[Object names and identities](https://learn.microsoft.com/en-us/windows/win32/ad/object-names-and-identities)  
（相对名 RDN、完整 DN；多数对象类用 **cn** 作命名属性；DN 随移动/改名会变。）

#### 查改这棵树的「电话协议」（一句就够）

工具、脚本、甚至第 3 站的查找，背后常常通过一套叫 **LDAP** 的约定去读写目录树。  
本站不背报文；你只要知道：

> **GUI 里拖用户进 OU、PowerShell 建组，本质都是在改这棵公共树上的节点。**

---

### 15.6 最小观察：同一个人，为什么有好几个「名字」？

挂上域之后，小王在账本里不是只有一个字符串：

| 你关心的用途 | 对应什么（后贴名） |
|--------------|-------------------|
| 在树里找到他、看他在哪个文件夹 | 完整住址 **DN**（搬家会变） |
| 程序长期引用「就是他」 | **objectGUID**（创建后一般不变） |
| ACE / 令牌真正比对 | **objectSid**（第 2 站的 SID） |
| 人口头说的 `域名\小王` | 常靠 **sAMAccountName** 那一侧 |

来源：同上 [Object names and identities](https://learn.microsoft.com/en-us/windows/win32/ad/object-names-and-identities)

只读自检（需 RSAT / ActiveDirectory 模块）：

```powershell
Get-ADUser -Identity $env:USERNAME -Properties DistinguishedName,ObjectSID,SamAccountName |
  Format-List DistinguishedName, ObjectSID, SamAccountName
```

> **住址（DN）给人/工具找位置；SID 给权限系统对表。** 别混成一个概念。

---

### 15.7 想做什么：新建一个「设计组」——账本上多了什么？

场景：共享盘不想对 30 个人各写一条 ACE → 建组，人进组，ACE 只写组（第 8、9 站）。

#### 操作（示意）

在某个「文件夹」（OU）上：新建 → 组。  
或：

```powershell
New-ADGroup `
  -Name "CD-平台-设计" `
  -SamAccountName "CD-平台-设计" `
  -GroupCategory Security `
  -GroupScope Global `
  -Path "OU=项目组,DC=jzfz,DC=local"
```

来源：[New-ADGroup](https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adgroup)

#### 用已经会的概念逐步推导（创建瞬间）

```text
1) 公共树上多了一个「组」节点（挂在你选的文件夹下）
2) 它有一层显示名 / 相对名
3) 拼出完整住址（DN）
4) 分到一个新的 SID ← 以后进令牌、进 ACE
5) 人们口头说的 域名\CD-平台-设计 对上这个节点
6) 「组员列表」一开始是空的
```

把人加进去：

```powershell
Add-ADGroupMember -Identity "CD-平台-设计" -Members "chengongyi"
```

现象：**改的是账本里组的成员关系**；共享盘 DACL **一行都还没动**。

要权限真正放开，还是老两步：

1. 文件/共享 ACE 授给 `域名\CD-平台-设计`；  
2. 用户重新登录（令牌带上组 SID）。

```text
新建组 → 账本多一个带 SID 的组
加人   → 只改「谁属于组」
写 ACE → 门上才贴规则
登录   → 令牌带组 SID → 第 10 站对表才认账
```

> **域控上新建组 ≠ 自动打开某个文件夹。**  
> 它只是多造了一个可被 ACE 引用的主体。

建组向导里还会问「安全组还是通讯组」：

| 你想… | 选… |
|-------|-----|
| 把组写进文件 ACE | **安全组** |
| 只为发邮件打包 | **通讯组**（不能当 ACL 授权主体） |

「作用域」影响能嵌套/授权到哪——选错会出现「人进了组却套不上某资源」；细表见官方，本站不背。  
来源：[Understand security groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups)

---

### 15.8 高特权组点到为止

有一种组默认能量极大（常译 **Domain Admins / 域管理员**）：  
几乎相当于「域里很多机器上的本地管理员血统」。日常办公账户**不要**长期放在里面。

来源：[Securing Domain Admins](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-f--securing-domain-admins-groups-in-active-directory)  
（讲如何收权与审计；**不是**讲目录树命名。）

两个文档分工：

- *Understand security groups* → 组怎么分类、怎么用在授权；  
- *Securing Domain Admins* → 域管理员组为何要锁。

---

### 收束

**你现在会了：**  
多机要共用身份 → 发明公共账与答账服务器（域 / 域控）→ 新电脑挂靠（加域）→ 单机与加域后差别 → 账本用文件夹分层（再认 OU/CN/路径）→ 新建组只是多一个带 SID 的主体，权限仍走 ACE + 令牌。  

**下一站才需要：** 访问 `\\服务器\共享` 时，对方如何在**不拿到你密码**的前提下相信「你是谁」——域里常用的「盖章 / 票据」机制。

---

---

---

<!-- chapter-nav:start -->
← 上一章：[卷二导读](./v2-00-overview.md)
· [回书稿索引](./00-index.md)
→ 下一章：[第 16 站：Kerberos](./17-kerberos.md)
<!-- chapter-nav:end -->
