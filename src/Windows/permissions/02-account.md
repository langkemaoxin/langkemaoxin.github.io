---
title: "第 1 站：账户——系统眼里的「人」"
sidebarGroup: "权限"
shortTitle: "第 1 站：账户"
order: 3
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

# 第 1 站：账户——系统眼里的「人」

### 麻烦

同事登录同一台机器，打开你的报表，改了两行，或删了。

系统若连「现在是谁」都分不清，后面谈不上保护。

### 这一站只发明：账户（用户）

Microsoft Learn 把能被 Windows **认证**的实体叫做 **Security Principal（安全主体）**。常见形态包括用户、组、计算机等；**这一站我们先只盯住「用户账户」**，组和计算机以后再开。  
来源：[Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

白话：

> 账户 = 系统里登记过的一个「人」。  
> 登录时你证明「我是这个账户」，系统才认你。

本机可以有本地用户（存在本机账户库里）；公司环境里还会有「域账户」——那是后文的集中身份，现在只要知道：**都是「账户」这一种东西的不同存放位置。**

### 怎么看见

登录后打开命令行：

```bat
whoami

PS C:\Users\chengongyi> whoami /user

用户信息
----------------

用户名          SID
=============== ================================================
jzfz\chengongyi S-1-5-21-3977539503-3587586693-2971573549-279405
```

会打印类似 `PC01\Alice` 或 `CONTOSO\Alice` 的账户名。

C#：

```csharp
using System.Security.Principal;

WindowsIdentity id = WindowsIdentity.GetCurrent();
Console.WriteLine(id.Name);              // 账户名
Console.WriteLine(id.IsAuthenticated);   // 是否已认证
```

来源：[Create a WindowsPrincipal](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)

### 收束

**你现在会了：** 系统用「账户」区分不同的人。  
**下一站才需要：** 为什么系统内部更爱用一串 `S-1-5-21-...`，而不是只记名字。

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 0 站：没有权限](./01-no-permission.md)
· [回书稿索引](./00-index.md)
→ 下一章：[第 2 站：SID](./03-sid.md)
<!-- chapter-nav:end -->
