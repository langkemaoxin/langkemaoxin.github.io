---
title: "第 14 站：SACL——审计"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 14 站：SACL"
order: 15
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

# 第 14 站：SACL——审计

**SACL（System ACL）** 管审计：成功/失败访问是否记安全日志。与 DACL 分槽，避免「权限」和「审计」缠死。  
来源：[Understand security principals - SACL](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

```text
Security Descriptor
├── Owner
├── DACL   → 能不能碰
└── SACL   → 碰了记不记
```

### 收束

**你现在会了：** 单机对象侧模型大致齐全。  
**下一站才需要：** 几十上百台机器时，账户与组如何不各自为政。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 13 站：有效权限](./14-effective-permissions.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 15 站：域与域控](../vol2-identity/01-domain-dc.md)
<!-- chapter-nav:end -->
