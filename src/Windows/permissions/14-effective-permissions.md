---
title: "第 13 站：有效权限"
sidebarGroup: "权限"
shortTitle: "第 13 站：有效权限"
order: 14
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

# 第 13 站：有效权限

继承、组、显式/继承混合、Deny……人脑难算。

资源管理器高级安全设置里的 **有效访问（Effective Access）** 是求值结果的可视化，不是新的权限类型。

建议：改完继承后，对深层文件跑一次有效访问；也可用命令直接查看该路径上的 ACE 列表：

```bat
icacls E:\WindowsTest\Lab04\Sub\file-sub.txt
```

或在 PowerShell 中：`Get-Acl E:\WindowsTest\Lab04\Sub\file-sub.txt | Format-List`

### 收束

**你现在会了：** 有效权限 = 对表结果，不是第三种 ACL。  
**下一站才需要：** 如何记录「谁碰过」，而不只是「能不能碰」。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 12 站：继承](./13-inheritance.md)
· [回索引](./00-index.md)
→ 下一章：[第 14 站：SACL](./15-sacl.md)
<!-- chapter-nav:end -->
