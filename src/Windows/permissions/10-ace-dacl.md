---
title: "第 9 站：ACE 与 DACL——规则列表"
sidebarGroup: "权限"
shortTitle: "第 9 站：ACE 与 DACL"
order: 11
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

# 第 9 站：ACE 与 DACL——规则列表

### 麻烦

第 7 站有了「权限位」，第 8 站有了「组」。现实马上变成：

- 同一个文件要对很多人/很多组写规则；  
- 还会出现「财务组允许读，同时又有一条拒绝某人修改」这类冲突。

需要一张**挂在对象上的规则表**，而不是只在口头说「给 Alice 只读」。

### 这一站只发明：Permissions → ACE → DACL

Microsoft Learn（Appendix B）把 **Permissions（权限）** 说成：施加在**可保护对象（securable objects）**上的访问控制。可保护对象包括文件系统、注册表、服务、Active Directory 对象等。  
每个这样的对象都有关联的 **ACL（Access Control List）**，ACL 里是一条条 **ACE（Access Control Entry）**，用来对安全主体（用户、服务、计算机、组）**授予或拒绝**各种操作。  
来源：[Appendix B - Permissions](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)

本站重点是「谁能碰这个对象」那张表，也就是安全描述符里的 **DACL（Discretionary ACL）**。  
（审计用的 SACL 以后再讲；完整「安全描述符拼图」在第 11 站。）

### 9.1 先认清：规则挂在「对象」上，不是挂在人脑门上

| 概念 | 白话 |
|------|------|
| 可保护对象 | 文件、文件夹、注册表键、服务、AD 对象……凡是系统允许挂安全信息的东西 |
| Permissions | 「对这个对象，某身份能不能做某些操作」 |
| ACE | 规则表里的**一行** |
| DACL | 这些行组成的**整张「谁能碰」表** |

> 人带着令牌去敲门；门上贴的是 DACL。  
> 本站先把「门上的字」写清楚；下一站再讲系统怎么对照令牌读这些字。

### 9.2 DACL 保存在哪里？——跟对象走的元数据，不是文件正文

#### 先认一下：什么是 NTFS

后面会反复提到 **NTFS**，这里用一分钟对齐概念。

磁盘上的文件不是随便扔一堆字节：必须有一套规则，规定「文件怎么命名、怎么找到、属性存在哪」。这套规则就是 **文件系统（file system）**。

**NTFS（New Technology File System）** 是现代 Windows 的**默认文件系统**。除了存你的文档内容，它还支持更丰富的能力，其中包括 **security descriptors（安全描述符）**、加密、磁盘配额、丰富元数据等。  
来源：[NTFS overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/ntfs-overview)

和本篇的关系只要记一句：

> **正因为 NTFS 支持安全描述符，并用 ACL 做文件/文件夹级访问控制，DACL 才能作为「元数据」贴在每个文件旁边。**  
> 来源：同上（Increased security：NTFS provides granular access control through ACLs）

U 盘若格式化成 **FAT / exFAT** 等不支持这套 NTFS 安全描述符的文件系统，把文件拷过去时，**NTFS ACL 常常带不过去**——权限不是写在文件正文里，而是写在 NTFS 的元数据里。

（本站只需要「NTFS = Windows 默认文件系统，能挂安全描述符」。加密、集群卷等其它 NTFS 特性这里不展开。）

#### DACL 是写在文件内容里的吗？

常见疑问：**DACL 是写在文件内容里的吗？**

短答：对 **NTFS** 上的文件/文件夹，DACL 在该对象的 **安全描述符（Security Descriptor）** 里，由文件系统作为**安全元数据**保存，和对象绑在一起；**不是**塞进你用 Word/记事本打开的那种「文件正文」。

Learn 的表述是：安全描述符是与每个可保护对象**关联（associated）**的数据结构，其中可含 DACL（谁能碰）与 SACL（审计）等。  
来源：[Understand security principals - Security descriptors](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

可以这样对照：

| 东西 | 存哪 |
|------|------|
| 文件内容（报表文字、图片像素） | 数据流（你打开文件看到的） |
| Owner、DACL、SACL… | NTFS 为该文件维护的**安全描述符元数据** |

因此：

- ✅ 保存在「这个文件对象」旁边（由 NTFS 管理）  
- ❌ 不是写进 `.xlsx` / `.txt` 的用户数据字节里  
- 复制到**不支持这套安全描述符**的介质时，NTFS ACL 常常带不过去——也说明权限不在「内容」里，而在文件系统元数据里  

`icacls` 可以把目录下各文件的 DACL **导出成另一个文件做备份**，需要时再还原——进一步说明：平时 DACL 贴在对象上，可以另存成独立备份文件。  
官方文档示例风格如下（路径改成与本文一致的练习目录）：

```bat
:: 保存：把 D:\Share 下匹配项及其子目录的 DACL 写入备份文件（/t = 递归）
icacls D:\Share\* /save D:\Share-acl-backup.txt /t

:: 还原：按备份文件，把 DACL 写回 D:\Share\ 目录树
icacls D:\Share\ /restore D:\Share-acl-backup.txt
```

对照 Learn 原文例子：`icacls c:\windows\* /save aclfile /t` 与 `icacls c:\windows\ /restore aclfile`。  
来源：[icacls - Examples（save / restore）](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

换对象类型，**模型一样，载体不同**：

| 对象 | DACL 跟谁走 |
|------|-------------|
| NTFS 文件/文件夹 | 该文件的文件系统安全元数据 |
| 注册表键 | 跟那个注册表键 |
| AD 对象 | 跟目录里那个对象 |

都是「对象自带安全描述符」，不是 Windows 另外一张与文件无关的全局「权限总表」。

### 9.3 ACE 解剖：一行规则里有什么

一条 ACE，可以先记成三个格子：

```text
┌──────────────┬──────────┬────────────────────┐
│ 对谁（SID）    │ 允许/拒绝 │ 哪些权限位（操作）     │
│ 用户或组…      │ Allow/Deny│ 读 / 写 / 完全控制… │
└──────────────┴──────────┴────────────────────┘
```

- **对谁**：最终是 SID（账户名只是给人看的；写入前常先 `Translate`）。  
- **允许还是拒绝**：Allow 或 Deny。  
- **哪些操作**：第 7 站的那些权限位（可读可写等）。

多条 ACE 排在一起，就是该对象的 **DACL**。

### 9.4 用一张示意表走读

假设文件 `D:\Share\Q1.xlsx` 的 DACL 是：

```text
某文件的 DACL（示意）
├── Allow  CONTOSO\FinanceRO     读取
├── Allow  CONTOSO\Alice         修改
└── Deny   CONTOSO\TempVendor    修改
```

直觉（精确求值算法下一站展开）：

| 来访者令牌里有谁 | 想做什么 | 粗结果 |
|------------------|----------|--------|
| 只在 `FinanceRO` 组 | 读 | 通常可以（命中 Allow 读取） |
| `Alice` | 修改 | 通常可以 |
| `TempVendor`（即使也在某允许组里） | 修改 | **Deny 一般压过冲突的 Allow** |

Appendix B 原文要点：**若 ACL 里有一条 Deny，且其 SID 出现在访问者令牌中，该 Deny 通常覆盖冲突的 Allow。**  
来源：同上 [Appendix B - Permissions](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)

### 9.5 三条必须先建立的直觉

在进入第 10 站「完整对表」之前，先把 Appendix B 里的判定直觉立住：

**① 没有任何匹配的 ACE → 不能访问**

若对象上没有定义任何「其 SID 出现在你令牌里」的 ACE，则主体**不能**访问该对象。  
来源：同上 Appendix B（no ACEs matching token SIDs → can't access）

白话：门上没写你的名字（也没写你的组），默认不是「随便进」，而是**进不去**。

**② Deny 一般压过 Allow**

同一对象上，对你令牌里某个 SID 既有允许又有拒绝时，**拒绝通常说了算**。  
因此「随手 Deny」杀伤力很大——尤其以后学到继承，一条错误 Deny 可能铺整棵目录树。

**③ 令牌里的组 SID 也会命中 ACE**

ACE 常写给组，而不是写给每个人。你令牌里带着组 SID（第 5、8 站），就会命中「授给该组」的那一行。

Appendix B 还举了 AD 里的常见模式：许多对象的 ACL 含有允许 **Authenticated Users** 读取一般信息的 ACE，但不允许读敏感信息或修改对象。除内置 Guest 等例外外，在域中通过域控认证的主体，令牌里默认常带有 Authenticated Users 这个 SID——所以「已登录的普通人」往往能读到目录里大量一般属性。  
来源：同上 Appendix B

> 这说明：DACL 里经常有一条「很宽、但权限很浅」的 Allow；  
> 真正敏感的操作，要靠更细的 ACE（或不给 Allow）来收紧。

### 9.6 Permissions ≠ User rights（本站只点破，不展开）

Appendix B 特意区分：

| 词 | 管什么 |
|----|--------|
| **Permissions（本站）** | 某个**对象**上的 ACL/ACE：能不能读这个文件、改这个 AD 属性…… |
| **User rights / privileges** | 更偏**系统范围**的能力：如取得所有权、备份、改系统时间……常通过组策略等分配 |

原文还给出冲突例：即便某对象 ACL **拒绝** Administrators 读写，属于 Administrators 的用户仍可能凭借用户权利 **Take ownership of files or other objects** 取得所有权，再改写 ACL 给自己完全控制。因此文档建议：**不要用高权账户做日常操作**，而不是幻想「靠 ACL Deny 就能挡住决心用高权的人」。  
来源：同上 Appendix B

本站只要记住：

> **DACL 很重要，但不是宇宙尽头。**  
> 「权利压过权限 / 夺所有权」的细节 → **第 17 站**再讲透。

（Appendix B 后半关于 Enterprise Admins、Domain Admins 等内置高权组的大表，属于域与高权专题，**不在本站展开**。）

### 9.7 怎么看见、怎么改 DACL

**命令行（改的就是 ACE）：**

```bat
:: 查看
icacls D:\Share\Q1.xlsx

:: 允许：给组读取（写入一条 Allow ACE）
icacls D:\Share\Q1.xlsx /grant CONTOSO\FinanceRO:R

:: 拒绝：显式 Deny（会加入 Deny ACE；文档说明还会从显式授予中去掉相同权限）
icacls D:\Share\Q1.xlsx /deny CONTOSO\TempVendor:M

:: 备份 / 还原整个目录树的 DACL（与 9.2 节同思路）
icacls D:\Share\* /save D:\Share-acl-backup.txt /t
icacls D:\Share\ /restore D:\Share-acl-backup.txt
```

```bat
:: 查看文件的权限（真实共享样例；第 10 站会用这份 DACL 与 whoami /groups 对表）
icacls "\\jzfz18\协同设计平台-18\CD-2013388\XREF\A"
```

示例输出：

```text
\\jzfz18\协同设计平台-18\CD-2013388\XREF\A BUILTIN\Administrators:(I)(F)
                                     CREATOR OWNER:(I)(OI)(CI)(IO)(F)
                                     JZFZ\CD-2013388_项目组:(I)(OI)(CI)(RX,WD,WEA,WA)
                                     JZFZ\CD-2013388_设总:(I)(OI)(CI)(F)
                                     JZFZ\成都协同平台只读组:(I)(OI)(CI)(RX)
                                     NT AUTHORITY\SYSTEM:(I)(OI)(CI)(F)
                                     ...（另有若干个人账户的 (RX)/(F) 行，此处从略）
```



来源：[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)（`/grant`、`/deny`、`/save`、`/restore`；**完整标志与实测见第 12 站**）

**C#（构造一条 ACE 并加入）：**

```csharp
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

var file = new FileInfo(@"D:\Share\Q1.xlsx");
FileSecurity security = file.GetAccessControl();

// 一条 Allow ACE：对组 FinanceRO 授予读取
var allow = new FileSystemAccessRule(
    new NTAccount(@"CONTOSO\FinanceRO"),
    FileSystemRights.ReadAndExecute,
    AccessControlType.Allow);
security.AddAccessRule(allow);

// 一条 Deny ACE：拒绝 TempVendor 修改
var deny = new FileSystemAccessRule(
    new NTAccount(@"CONTOSO\TempVendor"),
    FileSystemRights.Modify,
    AccessControlType.Deny);
security.AddAccessRule(deny);

file.SetAccessControl(security);
```

（继承相关参数下一站之后的「继承专章」再加；这里先写「作用于当前对象」的最简 ACE。）

### 9.8 本站概念图

```text
可保护对象（文件 / 注册表 / AD 对象…）
        │
        │  NTFS 等以「安全元数据」形式保存（不是文件正文）
        ▼
   Security Descriptor（后文拼全）
        │
        └── DACL  ← 本站主角
              ├── ACE: Allow  FinanceRO   读取
              ├── ACE: Allow  Alice       修改
              └── ACE: Deny   TempVendor  修改
```

### 收束

**你现在会了：**

- Permissions 是对象上的访问控制；  
- **NTFS** 是 Windows 默认文件系统，能挂安全描述符；DACL 是跟对象走的安全元数据（不是文件正文）；  
- ACE 是一行（谁 × 允许/拒绝 × 操作）；DACL 是整张表；  
- 无匹配 ACE → 不能访问；Deny 通常压过 Allow；组 SID 可命中 ACE；  
- 权限与用户权利不是同一类设置（细节后置）。

**下一站才需要：** 打开文件时，系统如何拿你令牌里的 SID，去和这张 DACL **逐条对表**（Access Check）。

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 8 站：组](./09-groups.md)
· [回书稿索引](./00-index.md)
→ 下一章：[第 10 站：访问检查](./11-access-check.md)
<!-- chapter-nav:end -->
