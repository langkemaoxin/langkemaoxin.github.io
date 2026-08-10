---
title: "总图：把各讲串回一条线"
sidebarGroup: "附录"
shortTitle: "总图"
order: 1
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

# 总图：把各讲串回一条线

回 [索引](../00-index.md) 可按讲跳转。下面是整条发明链：

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
  → NTLM 与协商（盖章走不通时的另一条路）
  → 登录类型 / SPN（待写）
  → 用户权利 ≠ 对象权限；UAC
```

| 链上节点 | 对应章 |
|----------|--------|
| 无权限 | [第 0 讲](../vol1-invent/01-no-permission.md) |
| 账户 | [第 1 讲](../vol1-invent/02-account.md) |
| SID | [第 2 讲](../vol1-invent/03-sid.md) |
| 名字↔SID | [第 3 讲](../vol1-invent/04-name-sid-lsa.md) |
| 登录认证 | [第 4 讲](../vol1-invent/05-logon-lsa.md) |
| Access Token | [第 5 讲](../vol1-invent/06-access-token.md) |
| Owner | [第 6 讲](../vol1-invent/07-owner.md) |
| 权限位 | [第 7 讲](../vol1-invent/08-permission-bits.md) |
| 组 | [第 8 讲](../vol1-invent/09-groups.md) |
| ACE / DACL | [第 9 讲](../vol1-invent/10-ace-dacl.md) |
| 访问检查 | [第 10 讲](../vol1-invent/11-access-check.md) |
| 安全描述符 | [第 11 讲](../vol1-invent/12-security-descriptor.md) |
| 继承 | [第 12 讲](../vol1-invent/13-inheritance.md) |
| 有效权限 | [第 13 讲](../vol1-invent/14-effective-permissions.md) |
| SACL | [第 14 讲](../vol1-invent/15-sacl.md) |
| 域与域控 | [第 15 讲](../vol2-identity/01-domain-dc.md) |
| Kerberos | [第 16 讲](../vol2-identity/02-kerberos.md) |
| NTLM 与协商 | [第 17 讲](../vol2-identity/03-ntlm.md) |
| 登录类型 | [第 18 讲](../vol2-identity/04-logon-types.md) |
| SPN | [第 19 讲](../vol2-identity/05-spn.md) |
| 权利与 UAC | [第 20 讲](../vol3-rights-uac/01-rights-uac.md) |

三句总收束：

1. **认证发令牌；网上常用票据证明身份；授权是令牌 SID 对对象 ACE（共享还多一道门）。**  
2. **名字给人看，SID 给机器用；翻译与验密都经 LSA。**  
3. **继承有两套标志：传给谁（CI/OI），当前吃不吃、传几层（IO/NP）。**

出处与建议实验顺序见 [参考](./05-references.md)。

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 33 讲：.NET 模拟](../vol6-dotnet/03-impersonation.md)
· [回书稿索引](../00-index.md)
→ 下一章：[SDDL](./02-sddl.md)
<!-- chapter-nav:end -->
