---
title: "第 6 讲：Owner——对象上的主人字段"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 6 讲：Owner"
order: 7
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

# 第 6 讲：Owner——对象上的主人字段

### 麻烦

只有「当前操作者」不够：每个文件还要回答「这算谁的」。

### 这一讲只发明：Owner

可保护对象（文件、文件夹等）带有一份安全信息；其中有一个 **Owner（所有者）** 字段，记录主人对应的主体（最终仍是 SID）。  
Learn 的安全描述符示例里可以看到 `Owner: ... [S-1-5-21-...]` 这种形态。  
来源：[AD domain-join permissions 示例中的 Security Descriptor](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/active-directory-domain-join-permissions)

直觉：

- 创建文件时，常把创建者记为 Owner  
- Owner 提供「这是谁的文件」的默认锚点；**更细的「谁能读谁能写」是后面的规则表**，本讲先不展开  

运维夺回失控对象时，可用 `takeown` 取得所有权。  
来源：[takeown](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/takeown)

```bat
takeown /f lostfile
```

### C#：读 / 改 Owner

```csharp
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

var file = new FileInfo(@"D:\Share\report.xlsx");
FileSecurity security = file.GetAccessControl();

IdentityReference owner = security.GetOwner(typeof(NTAccount))!;
Console.WriteLine(owner);

security.SetOwner(new NTAccount(@"CONTOSO\Alice"));
file.SetAccessControl(security);
```

（现代 .NET 经 `FileSystemAclExtensions` 的 `GetAccessControl` / `SetAccessControl`。）  
来源：[FileSystemAclExtensions](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.setaccesscontrol)

### 收束

**你现在会了：** Owner 是对象上的主人槽位；可用 API / `takeown` 查看或变更。  
**下一讲才需要：** 主人之外，如何表达「同事能读不能改」。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 5 讲：Access Token](./06-access-token.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 7 讲：权限位](./08-permission-bits.md)
<!-- chapter-nav:end -->
