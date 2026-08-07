---
title: "第 8 讲：组——对人打包"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 8 讲：组"
order: 9
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

# 第 8 讲：组——对人打包

### 麻烦

财务 30 人都要对某目录只读；入职离职时改 30 条个人规则会疯。

### 这一讲只发明：组（Group）

组也是安全主体，有自己的 SID。把人放进组，权限授给组，成员自动带着组的身份去访问。  
来源：[Understand security groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups)

回扣第 5 讲：登录后令牌里的 **组 SID 列表**，就是「你当前带着哪些组身份」。进组/出组后，通常需重新登录（或刷新令牌）才完整反映到令牌上。

本机有 `Users`、`Administrators` 等；域里还有更多——域的集中管理后文再讲。

### 收束

**你现在会了：** 组把人打包；令牌可携带组 SID。  
**下一讲才需要：** 如何把「某个账户/组 + 允许或拒绝 + 哪些权限位」写成对象上的规则。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 7 讲：权限位](./08-permission-bits.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 9 讲：ACE 与 DACL](./10-ace-dacl.md)
<!-- chapter-nav:end -->
