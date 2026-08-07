---
title: "总图：把各站串回一条线"
sidebarGroup: "权限"
shortTitle: "总图"
order: 19
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

# 总图：把各站串回一条线

回 [索引](./00-index.md) 可按站跳转。下面是整条发明链：

```text
无权限
  → 账户（人）
  → SID（稳定 ID）
  → 名字↔SID（LSA 查找：SAM / 域控 / 缓存）
  → 登录认证（Winlogon → Provider → LSA → SAM 或域控）
  → Access Token（挂到进程）
  → Owner
  → 权限位
  → 组（令牌带组 SID）
  → ACE / DACL
  → 访问检查（令牌对 DACL；UNC 时再加网络登录 + 共享∩NTFS）
  → 安全描述符（Owner + DACL + 稍后 SACL）
  → 继承（最小实验发明 OI/CI/IO/NP，再对接两套标志）
  → 有效权限
  → SACL
  → 域与域控（公共账→搭 DC→加域→树与新建组）
  → Kerberos 票据（TGT → 服务票；网上认证）
  → 用户权利 ≠ 对象权限；UAC
```

| 链上节点 | 对应章 |
|----------|--------|
| 无权限 | [第 0 站](./01-no-permission.md) |
| 账户 | [第 1 站](./02-account.md) |
| SID | [第 2 站](./03-sid.md) |
| 名字↔SID | [第 3 站](./04-name-sid-lsa.md) |
| 登录认证 | [第 4 站](./05-logon-lsa.md) |
| Access Token | [第 5 站](./06-access-token.md) |
| Owner | [第 6 站](./07-owner.md) |
| 权限位 | [第 7 站](./08-permission-bits.md) |
| 组 | [第 8 站](./09-groups.md) |
| ACE / DACL | [第 9 站](./10-ace-dacl.md) |
| 访问检查 | [第 10 站](./11-access-check.md) |
| 安全描述符 | [第 11 站](./12-security-descriptor.md) |
| 继承 | [第 12 站](./13-inheritance.md) |
| 有效权限 | [第 13 站](./14-effective-permissions.md) |
| SACL | [第 14 站](./15-sacl.md) |
| 域与域控 | [第 15 站](./16-domain-dc.md) |
| Kerberos | [第 16 站](./17-kerberos.md) |
| 权利与 UAC | [第 17 站](./18-rights-uac.md) |

三句总收束：

1. **认证发令牌；网上常用票据证明身份；授权是令牌 SID 对对象 ACE（共享还多一道门）。**  
2. **名字给人看，SID 给机器用；翻译与验密都经 LSA。**  
3. **继承有两套标志：传给谁（CI/OI），当前吃不吃、传几层（IO/NP）。**

出处与建议实验顺序见 [参考](./20-references.md)。

---

<!-- chapter-nav:start -->
← 上一章：[第 17 站：权利与 UAC](./18-rights-uac.md)
· [回索引](./00-index.md)
→ 下一章：[参考](./20-references.md)
<!-- chapter-nav:end -->
