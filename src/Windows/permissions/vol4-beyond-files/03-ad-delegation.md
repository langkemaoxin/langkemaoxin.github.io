---
title: "第 27 讲：AD 对象权限与委派"
sidebarGroup: "卷四·不只是文件"
shortTitle: "第 27 讲：AD 委派"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "Active Directory"
  - "ACL"
  - "权限"
  - "对话实录"
description: 师生对话实录课：AD 对象 ≠ 文件但用同一套 SD 模型——委派向导只是往 OU 的 DACL 写 ACE 的填表器。本机 LDAP 实查扩展权注册表：Reset Password 的真实 GUID 是 00299570-246d-11d0-a768-00aa006e0529（顺手纠正一个流传的错版 GUID），属性级 ACE 让「只改密码」成为可能。
---

# 第 27 讲：AD 对象权限与委派

> **卷四·不只是文件（共 3 讲，本卷收官）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[Delegating Administration of Account OUs](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/delegating-administration-of-account-ous-and-resource-ous)。

---

## 开场：只想让他改密码

**🧑‍🏫 老师：**

公司的桌面支持组每天都在处理一件小事：用户忘了密码，打电话要重置。按第 15 讲的模型，能改别人密码的默认只有**域管理员**。可你总不能把整组桌面人员塞进 Domain Admins——那等于把整片域交出去。你想要的是一种**精确到「只能在某个 OU 里重置密码」**的权限：别的什么都干不了。

**🧑‍🎓 学生：** 第 15 讲说过 AD 的每个对象都挂在账本树上……它们的权限是怎么记的？

**🧑‍🏫 老师：**

**AD 对象 ≠ 文件，但用的是同一套 SD 模型**：每个用户、计算机、组、OU 都自带安全描述符，存在它的 `nTSecurityDescriptor` 属性里——Owner + DACL + SACL，继承/显式拒绝规则原样照搬。但 AD 的 ACE 比文件**多两样本事**，正是这两样让「只改密码」变得可行：

1. **能缩到「某个属性」上**。文件只能管「整个对象能不能读/写」；AD 的 ACE 可以写「只允许写 `pwdLastSet`（密码相关）、`lockoutTime`（锁定状态），其它字段一概不许动」——**property-specific ACE**，权限细到字段；
2. **能引用「扩展权限」**。AD 把若干属性写权限**打包成一个权利**、起个名字——比如 Reset Password，一个名字背后是「重置密码 + 强制下次登录改密 + 解锁」的组合拳。

> 这就是为什么「只能改密码、不能删账户」在 AD 里能做、在文件上做不到。

---

## 第 1 课：扩展权长在哪——账本的「权利注册表」

**🧑‍🏫 老师：**

「打包好的权利」不是凭空约定的——它们登记在域账本的 **Configuration 分区**的 `CN=Extended-Rights` 容器里，每个是一条 `controlAccessRight` 对象，带一个 **rightsGuid**。本机 LDAP 直查（零依赖）：

```powershell
$root=[ADSI]'LDAP://RootDSE'
$cfg=[string]$root.configurationNamingContext[0]      # CN=Configuration,DC=jzfz,DC=local
$s=New-Object System.DirectoryServices.DirectorySearcher([ADSI]"LDAP://CN=Extended-Rights,$cfg")
$s.Filter='(displayName=Reset Password)'
$r=$s.FindOne()
```

```text
found      : User-Force-Change-Password      ← 对象的系统名
rightsGuid : 00299570-246d-11d0-a768-00aa006e0529   ← 「Reset Password」这条扩展权的 GUID
```

> ⚠️ **顺手纠正一个流传的错误**：不少资料（含本讲旧版）把 Reset Password 的 GUID 写成 `00299570-246d-11d0-a7fe-00aa006039a4`——前半段对、后半段错。以真实域账本为准：`00299570-246d-11d0-a768-00aa006e0529`。写脚本按 GUID 找扩展权时抄错这串，委派审计就会静默漏掉那条 ACE——**GUID 要查注册表，不要背**。

---

## 第 2 课：委派向导 = 替你填 ACE 的填表器

**🧑‍🏫 老师：**

打开 AD 用户和计算机（ADUC），右键某 OU → **委派控制（Delegate Control）**，向导走三步：选委派给谁 → 选任务（"Reset user passwords and force password change at next logon"）→ 完成。向导干了什么？**就是往这个 OU 的 DACL 上写几条 ACE**：

- 给 `CORP\HelpDesk` 授予 **Reset Password 扩展权**（对 OU 下所有 User 类对象）；
- 外加对 `pwdLastSet`、`lockoutTime` 几个属性的**写权限**。

所以「委派」不是新机制——**它是 ADUC 替你写 ACE 的填表器**，和文件上「安全 → 编辑 → 添加 → 允许写入」同一件事，换了层向导皮。OU 上写的 ACE 默认**继承**到子对象——委派一次，OU 里所有用户都能被重置，不必逐个改。

看已委派的内容：ADUC → 查看 → 高级功能 → OU 属性 → 安全 → 高级；命令行用 `dsacls`（需 RSAT）：

```text
Allow CORP\HelpDesk  RESET PASSWORD   on User objects   (Control Access)
Allow CORP\HelpDesk  WRITE PwdLastSet on User objects
Allow CORP\HelpDesk  WRITE LockoutTime on User objects
```

PowerShell 视角（装了 AD 模块的机器）这条 ACE 长这样——**GUID 对上第 1 课查到的**：

```text
ActiveDirectoryRights : ExtendedRight
InheritanceType       : Descendents        ← 不作用在 OU 本身、只作用在子对象（「OU 上委派、用户上生效」的由来）
ObjectType            : 00299570-246d-11d0-a768-00aa006e0529   ← Reset Password 的 rightsGuid
InheritedObjectType   : bf967aba-0de6-11d0-a285-00aa003049e2  ← 只对 User 类对象生效
IdentityReference     : CORP\HelpDesk
AccessControlType     : Allow
```

三格还是那三格（对谁 × Allow × 什么），只是「什么」这一格在 AD 里可以是**一个 GUID 指向的属性或扩展权**——比文件的权限位又细了一层。

---

## 插问：委派最容易授错的三件事？

**🧑‍🎓 学生：** 向导这么方便，有没有坑？

**🧑‍🏫 老师：**

三个最该警惕的：

- **给了「完全控制」而非 scoped 权限**——本来只想让他改密码，手一滑 Full Control：他能改任何属性甚至删账户，等于半个域管；
- **在域根委派**——ACE 继承向下扩散，域根写一条全域受影响。正确做法是在**最低层 OU** 上委派（本机所在的 `OU=pc,OU=员工用电脑,…` 就是「员工电脑」这一片的最小合适范围）；
- **委派「创建/删除用户对象」不限范围**——他能在 OU 里建账号、设密码，远超「重置密码」，要想清楚给不给。

---

## 收束

**你现在会了：** AD 对象也带 SD、也用 DACL/ACE；委派向导只是往 OU 的 DACL 写 ACE 的填表器；AD 的 ACE 能细到属性、能引用扩展权（Reset Password 的真实 GUID 本机实查：`00299570-…-a768-…`，纠正了流传的错版）；别给 Full Control、别在域根委派。

**下一卷才需要：** 从 AD 回到现实中最常打交道的——**共享盘**：一堆人往一个文件夹里读写，共享权限和 NTFS 权限怎么设计才不打架；排障案例怎么用这套模型定位。

---

<!-- chapter-nav:start -->
← 上一章：[第 26 讲：服务权限](./02-services.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 28 讲：共享设计](../vol5-ops/01-share-design.md)
<!-- chapter-nav:end -->
