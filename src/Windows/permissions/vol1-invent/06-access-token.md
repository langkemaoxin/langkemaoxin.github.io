---
title: "第 5 讲：Access Token——登录成功后的通行证"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 5 讲：Access Token"
order: 6
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

# 第 5 讲：Access Token——登录成功后的通行证

### 麻烦

不能每打开一个程序就再输一次密码。系统需要一份「本次登录有效的身份摘要」，挂在你的进程上。

### 这一讲只发明：访问令牌（Access Token）

认证成功后，**LSA 创建主访问令牌（primary access token）**，其中包含：

- 用户 **SID**  
- **组 SID**（你属于哪些组——组的细节下一讲才展开，这里先接受「令牌里可以有一组 SID 列表」）  
- 分配的 **用户权利（user rights）**  

令牌会附着到你名下的进程与线程。  
来源：[Understand security principals - Access tokens](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

域用户登录时，相关 SID（含组 SID、可能的 `SIDHistory`）会进入令牌；之后访问资源时，**令牌里的 SID 都可能参与允许或拒绝**。  
来源：[Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

口诀：

> **登录 ≈ 认证 + 发令牌。**  
> 之后本机操作主要看令牌，而不是反复问密码。

### 怎么看见

```bat
whoami /all


PS C:\Users\chengongyi> whoami /all

用户信息
----------------

用户名          SID
=============== ================================================
jzfz\chengongyi S-1-5-21-3977539503-3587586693-2971573549-279405


组信息
-----------------

组名                                          类型   SID                                              属性
============================================= ====== ================================================ ==========================================
Everyone                                      已知组 S-1-1-0                                          必需的组, 启用于默认, 启用的组
BUILTIN\Administrators                        别名   S-1-5-32-544                                     必需的组, 启用于默认, 启用的组, 组的所有者
BUILTIN\Users                                 别名   S-1-5-32-545                                     必需的组, 启用于默认, 启用的组
NT AUTHORITY\INTERACTIVE                      已知组 S-1-5-4                                          必需的组, 启用于默认, 启用的组
CONSOLE LOGON                                 已知组 S-1-2-1                                          必需的组, 启用于默认, 启用的组
NT AUTHORITY\Authenticated Users              已知组 S-1-5-11                                         必需的组, 启用于默认, 启用的组
NT AUTHORITY\This Organization                已知组 S-1-5-15                                         必需的组, 启用于默认, 启用的组
LOCAL                                         已知组 S-1-2-0                                          必需的组, 启用于默认, 启用的组
JZFZ\CD-2013388_建筑                          组     S-1-5-21-3977539503-3587586693-2971573549-24272  必需的组, 启用于默认, 启用的组
JZFZ\节点入库-正式                            组     S-1-5-21-3977539503-3587586693-2971573549-472641 必需的组, 启用于默认, 启用的组
JZFZ\20260410-S001_设总                       组     S-1-5-21-3977539503-3587586693-2971573549-553488 必需的组, 启用于默认, 启用的组

```

来源：[whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami)

```csharp
var id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.User);
foreach (IdentityReference g in id.Groups!)
{
    Console.WriteLine(g); // 组 SID；有的能 Translate 成名字
}
```

### 收束

**你现在会了：** 令牌是什么、里面有用户 SID（以及一组组 SID 槽位）、挂在进程上。  
**下一讲才需要：** 文件上如何登记「主人是谁」（还不是完整权限表）。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 4 讲：登录与 LSA](./05-logon-lsa.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 6 讲：Owner](./07-owner.md)
<!-- chapter-nav:end -->
