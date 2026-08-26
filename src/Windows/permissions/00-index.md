---
title: "书稿索引：Windows 权限（分卷）"
sidebarGroup: "权限"
shortTitle: "书稿索引"
order: 0
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 书稿索引：Windows 权限（分卷）

> 假设世界上本来没有「权限」这回事。  
> **案例引入 → 西蒙式一次发明一个概念 → 专有名词后置。**

正文按**物理卷目录**存放；本页是总导航。标「已有」的是占位章。讲号连续：**第 0～38 讲**（附录不占讲号）。

## 分卷一览

| 卷 | 目录 | 讲号 | 入口 |
|----|------|------|------|
| 卷一·发明权限 | `vol1-invent/` | 0～14 | [第 0 讲](./vol1-invent/01-no-permission.md) |
| 卷二·网上的身份 | `vol2-identity/` | 15～19 | [第 15 讲](./vol2-identity/01-domain-dc.md) |
| 卷三·权利与 UAC | `vol3-rights-uac/` | 20～24 | [第 20 讲](./vol3-rights-uac/01-rights-uac.md) |
| 卷四·不只是文件 | `vol4-beyond-files/` | 25～27 | [第 25 讲](./vol4-beyond-files/01-registry.md) |
| 卷五·排障与设计 | `vol5-ops/` | 28～30 | [第 28 讲](./vol5-ops/01-share-design.md) |
| 卷六·用代码改权限 | `vol6-dotnet/` | 31～33 | [第 31 讲](./vol6-dotnet/01-identity.md) |
| 卷七·安全防护 | `vol7-defense/` | 34～38 | [第 34 讲](./vol7-defense/01-windows-hello.md) |
| 附录 | `appendix/` | — | [总图](./appendix/01-map.md) |

## 卷一·发明权限（第 0～14 讲）

> ✅ 2026-08-26：卷一 15 讲已全部转为**师生对话实录课**（实验全部本机 C:\Lab 实跑，「待加厚」三讲已完成加厚）。

| 章 | 状态 | 说明 |
|----|------|------|
| [第 0 讲](./vol1-invent/01-no-permission.md) | 已有·对话实录 | 为何需要权限 |
| [第 1 讲](./vol1-invent/02-account.md) | 已有·对话实录 | 账户 |
| [第 2 讲](./vol1-invent/03-sid.md) | 已有·对话实录 | SID |
| [第 3 讲](./vol1-invent/04-name-sid-lsa.md) | 已有·对话实录 | 名字 ↔ SID |
| [第 4 讲](./vol1-invent/05-logon-lsa.md) | 已有·对话实录 | 登录与 LSA |
| [第 5 讲](./vol1-invent/06-access-token.md) | 已有·对话实录 | Access Token |
| [第 6 讲](./vol1-invent/07-owner.md) | 已有·对话实录 | Owner |
| [第 7 讲](./vol1-invent/08-permission-bits.md) | 已有·对话实录 | 权限位 |
| [第 8 讲](./vol1-invent/09-groups.md) | 已有·对话实录（已加厚） | 组 |
| [第 9 讲](./vol1-invent/10-ace-dacl.md) | 已有·对话实录 | ACE / DACL |
| [第 10 讲](./vol1-invent/11-access-check.md) | 已有·对话实录 | 访问检查与共享两道门 |
| [第 11 讲](./vol1-invent/12-security-descriptor.md) | 已有·对话实录（已加厚） | 安全描述符 |
| [第 12 讲](./vol1-invent/13-inheritance.md) | 已有·对话实录 | 继承 |
| [第 13 讲](./vol1-invent/14-effective-permissions.md) | 已有·对话实录 | 有效权限 |
| [第 14 讲](./vol1-invent/15-sacl.md) | 已有·对话实录（已加厚） | SACL |

> ✅ 2026-08-26：卷二~卷七共 24 讲已全部转为**师生对话实录课**（实验全部本机实拍：LDAP 直查域账本、klist 票据、secedit 权利账本、DeviceGuard/BitLocker 现状等；域控侧不可实测处均如实标注）。

## 卷二·网上的身份（第 15～19 讲）

| 章 | 状态 | 说明 |
|----|------|------|
| [第 15 讲](./vol2-identity/01-domain-dc.md) | 已有·对话实录 | 域与域控 |
| [第 16 讲](./vol2-identity/02-kerberos.md) | 已有·对话实录 | Kerberos |
| [第 17 讲](./vol2-identity/03-ntlm.md) | 已有·对话实录 | NTLM 与协商 |
| [第 18 讲](./vol2-identity/04-logon-types.md) | 已有·对话实录 | 登录类型 |
| [第 19 讲](./vol2-identity/05-spn.md) | 已有·对话实录 | SPN |

## 卷三·权利与 UAC（第 20～24 讲）

| 章 | 状态 | 说明 |
|----|------|------|
| [第 20 讲](./vol3-rights-uac/01-rights-uac.md) | 已有·对话实录 | 权利与 UAC（合章） |
| [第 21 讲](./vol3-rights-uac/02-user-rights.md) | 已有·对话实录 | 用户权利专章 |
| [第 22 讲](./vol3-rights-uac/03-uac.md) | 已有·对话实录 | UAC 专章 |
| [第 23 讲](./vol3-rights-uac/04-gpo-rights.md) | 已有·对话实录 | GPO 权利分配 |
| [第 24 讲](./vol3-rights-uac/05-adminsdholder.md) | 已有·对话实录 | AdminSDHolder |

## 卷四·不只是文件（第 25～27 讲）

| 章 | 状态 | 说明 |
|----|------|------|
| [第 25 讲](./vol4-beyond-files/01-registry.md) | 已有·对话实录 | 注册表 ACL |
| [第 26 讲](./vol4-beyond-files/02-services.md) | 已有·对话实录 | 服务权限 |
| [第 27 讲](./vol4-beyond-files/03-ad-delegation.md) | 已有·对话实录 | AD 委派 |

## 卷五·排障与设计（第 28～30 讲）

| 章 | 状态 | 说明 |
|----|------|------|
| [第 28 讲](./vol5-ops/01-share-design.md) | 已有·对话实录 | 共享设计 |
| [第 29 讲](./vol5-ops/02-effective-access-practice.md) | 已有·对话实录 | 有效权限实战 |
| [第 30 讲](./vol5-ops/03-troubleshooting-cases.md) | 已有·对话实录 | 排障案例集 |

## 卷六·用代码改权限（第 31～33 讲）

| 章 | 状态 | 说明 |
|----|------|------|
| [第 31 讲](./vol6-dotnet/01-identity.md) | 已有·对话实录 | .NET 身份 |
| [第 32 讲](./vol6-dotnet/02-acl.md) | 已有·对话实录 | .NET 改 ACL |
| [第 33 讲](./vol6-dotnet/03-impersonation.md) | 已有·对话实录 | .NET 模拟 |

## 卷七·安全防护（第 34～38 讲）

> 对标微软《Windows 11 Security Book》的「身份保护 / OS 安全 / 应用安全」章——补上前面六卷只讲「权限机制」、没讲「产品防护」的那半边。

| 章 | 状态 | 说明 |
|----|------|------|
| [第 34 讲](./vol7-defense/01-windows-hello.md) | 已有·对话实录 | Windows Hello 与无密码登录 |
| [第 35 讲](./vol7-defense/02-credential-guard.md) | 已有·对话实录 | Credential Guard |
| [第 36 讲](./vol7-defense/03-vbs-hvci.md) | 已有·对话实录 | VBS / HVCI / 内存完整性 |
| [第 37 讲](./vol7-defense/04-app-control.md) | 已有·对话实录 | 应用控制 WDAC / AppLocker |
| [第 38 讲](./vol7-defense/05-bitlocker.md) | 已有·对话实录 | BitLocker 与数据保护 |

## 附录

| 章 | 状态 | 说明 |
|----|------|------|
| [总图](./appendix/01-map.md) | 已有·待升级 | |
| [SDDL](./appendix/02-sddl.md) | 已有 | |
| [事件 ID](./appendix/03-event-ids.md) | 已有 | |
| [实验室](./appendix/04-lab.md) | 已有 | |
| [参考](./appendix/05-references.md) | 已有·待升级 | |

建议从 [第 0 讲](./vol1-invent/01-no-permission.md) 开始。

---

<!-- chapter-nav:start -->
· [回书稿索引](./00-index.md)
→ 下一章：[第 0 讲：没有权限](./vol1-invent/01-no-permission.md)
<!-- chapter-nav:end -->
