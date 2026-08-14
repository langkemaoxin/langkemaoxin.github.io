---
title: "第 27 讲：AD 对象权限与委派"
sidebarGroup: "卷四·不只是文件"
shortTitle: "第 27 讲：AD 委派"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 27 讲：AD 对象权限与委派

### 麻烦

公司的桌面支持组每天都在处理一件小事：用户忘了密码，打电话来要重置。

按第 15 讲的模型，能改别人密码的默认只有**域管理员**。可你总不能把整组桌面人员塞进 Domain Admins——那等于把整片域交出去。你想要的是一种**精确到"只能在某个 OU 里重置密码"**的权限：别的什么都干不了。

### 这一讲只发明：把"能管哪些 AD 对象"写成 ACE（AD 委派）

**AD 对象 ≠ 文件，但用的是同一套 SD 模型。**

第 1～8 讲讲文件时，每个文件都挂着一个**安全描述符（SD）**：Owner + DACL + SACL，DACL 里一条条 ACE 写着「谁可以做什么」。域里也一模一样——每个用户、计算机、组、OU，都是一个对象，各自带一个 SD，存在它的 `nTSecurityDescriptor` 属性里。文件 ACE 那套「继承 / 显式拒绝」规则，AD 对象原样照搬。

来源：[Delegating Administration of Account OUs and Resource OUs](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/delegating-administration-of-account-ous-and-resource-ous)

但 AD 的 ACE 比文件多两样本事，正是这两样让"只改密码"变得可行：

1. **能缩到「某个属性」上。** 文件只能管「整个对象能不能读 / 写」；AD 的 ACE 可以写「只允许写 `pwdLastSet`（密码相关）、`lockoutTime`（锁定状态），其它字段一概不许动」。这种 ACE 叫 **property-specific ACE**，权限细到字段。
2. **能引用「扩展权限」。** AD 把若干个属性写权限**打包成一个权利**，起个名字——比如 Reset Password，一个名字背后是「能重置密码 + 强制下次登录改密 + 解锁账户」的组合拳。

> 这就是为什么「只能改密码、不能删账户」在 AD 里能做，在文件上做不到。

### 委派向导：替你填 ACE 的填表器

打开 AD 用户和计算机（ADUC），右键某个 OU → **委派控制（Delegate Control）**，跟着向导走：选要委派给谁 → 选任务（"Reset user passwords and force password change at next logon"）→ 完成。

向导干了什么？**就是往这个 OU 的 DACL 上写几条 ACE。** 你勾的"重置密码"任务，底下被翻译成：

- 给 `CORP\HelpDesk` 授予 **Reset Password 扩展权**（对 OU 下所有 User 类对象）；
- 外加对 `pwdLastSet`、`lockoutTime` 几个属性的**写权限**。

所以"委派"不是一种新的权限机制。它是 **ADUC 替你写 ACE 的填表器**——和你在文件上「安全 → 编辑 → 添加 → 允许写入」是同一件事，只是换了层向导皮。

来源：[Delegation of Control in AD DS](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/delegation-control-wizard)

OU 上写的 ACE 默认会**继承**到下面的子对象。所以你在 OU 上委派一次，这个 OU 里所有用户就都能被重置密码，不必一个个去改。

口诀：

> **委派 = 在 AD 对象的 DACL 上写 ACE，向导只是填表器。**
> **AD 的 ACE 能细到字段，所以"只改密码"才做得到。**

### 三个最该警惕的误授

委派好用，但常踩三种坑：

- **给了「完全控制」而非 scoped 权限。** 本来只想让他改密码，手一滑选了 Full Control——他能改任何属性、甚至删账户，等于半个域管。
- **在域根委派。** ACE 继承向下扩散，域根写一条，全域对象都受影响。正确做法是在**最低层 OU** 上委派，让权限只影响这一片。
- **委派"创建/删除用户对象"时不限制范围。** 一旦他能在 OU 里建用户，就能建账号、设密码——这已经远超"重置密码"，要想清楚到底给不给。

### 怎么看见

**界面**：ADUC → 右键 OU → 委派控制（向导写 ACE）。  
要看已委派了什么：ADUC → 查看 → 高级功能 → 右键 OU → 属性 → 安全 → 高级。

**命令**——读某个 OU 的 DACL，只看桌面组的几条：

```bat
dsacls "OU=Sales,DC=corp,DC=local" | findstr /i "HelpDesk"
```

输出（关键几行）：

```
Allow CORP\HelpDesk  RESET PASSWORD          on User objects    (Control Access)
Allow CORP\HelpDesk  WRITE PwdLastSet        on User objects
Allow CORP\HelpDesk  WRITE LockoutTime       on User objects
```

这三行，就是委派向导刚才替你写下的 ACE。

来源：[Dsacls](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc771151(v=ws.11))

**PowerShell**——看同一条 Reset Password 扩展权（注意 `ObjectType` 是它的固定 GUID）：

```powershell
Import-Module ActiveDirectory
(Get-Acl "AD:\OU=Sales,DC=corp,DC=local").Access |
  Where-Object IdentityReference -like "*HelpDesk"
```

```
ActiveDirectoryRights : ExtendedRight
InheritanceType       : Descendents
ObjectType            : 00299570-246d-11d0-a7fe-00aa006039a4   ← Reset Password 的 GUID
InheritedObjectType   : bf967aba-0de6-11d0-a285-00aa003049e2   ← 只对 User 类生效
IdentityReference     : CORP\HelpDesk
AccessControlType     : Allow
```

`InheritanceType = Descendents` 说明这条权限**不作用在 OU 本身、只作用在下面的子对象**——这正是"OU 上委派、用户上生效"的由来。

### 收束

**你现在会了：** AD 对象也带 SD、也用 DACL/ACE；委派向导只是往 OU 的 DACL 上写 ACE 的填表器；AD 的 ACE 能细到属性、还能引用扩展权，所以"只让桌面组改密码"才做得到——千万别给 Full Control、别在域根委派。  
**下一讲才需要：** 从 AD 里的对象，回到现实中最常打交道的——**共享盘**。一堆人往一个文件夹里读写，共享权限和 NTFS 权限该怎么设计才不互相打架。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 26 讲：服务权限](./02-services.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 28 讲：共享设计](../vol5-ops/01-share-design.md)
<!-- chapter-nav:end -->
