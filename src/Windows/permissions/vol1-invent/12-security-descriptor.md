---
title: "第 11 站：安全描述符——Owner + DACL 放进同一份档案"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 11 站：安全描述符"
order: 12
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

# 第 11 站：安全描述符——Owner + DACL 放进同一份档案

### 这一站只发明：Security Descriptor 的骨架

把前面两样收进同一份数据结构：

```text
Security Descriptor
├── Owner          ← 第 6 站
├── DACL           ← 第 9 站（谁能碰）
└── （另有一格以后放审计规则）
```

来源：[Understand security principals - security descriptors](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

> 审计那一格叫 SACL，**先留空位**，第 14 站再填。

### 收束

**你现在会了：** 对象侧档案长什么样。  
**下一站才需要：** 文件夹下有成千上万文件时，如何避免逐个写 DACL。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 10 站：访问检查](./11-access-check.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 12 站：继承](./13-inheritance.md)
<!-- chapter-nav:end -->
