---
title: "第 2 站：SID——机器真正认的身份证号"
sidebarGroup: "权限"
shortTitle: "第 2 站：SID"
order: 4
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

# 第 2 站：SID——机器真正认的身份证号

### 麻烦

账户可以改显示名、改登录名。若权限规则写死「名字叫 Alice 的人能读」，改名后规则全乱。

### 这一站只发明：SID

**SID（Security Identifier）** 是唯一值，用来标识一个安全主体。账户或组在创建时由权威分配 SID，**不会再分配给别的主体复用**。  
来源：[Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

类比：

| 给人看 | 给机器用 |
|--------|----------|
| 账户名 `CONTOSO\Alice` | SID `S-1-5-21-...-1103` |

> 改名像换工牌打印字；SID 像身份证号，不跟着换。

### 怎么看见

```bat
whoami /user
```

C#：

```csharp
WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.User);   // 当前用户的 SID
```

### 收束

**你现在会了：** 稳定身份是 SID；名字是给人看的标签。  
**下一站才需要：** 代码里写了账户名时，系统如何查出对应 SID。

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 1 站：账户](./02-account.md)
· [回书稿索引](./00-index.md)
→ 下一章：[第 3 站：名字 ↔ SID](./04-name-sid-lsa.md)
<!-- chapter-nav:end -->
