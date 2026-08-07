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

本页是**整本书的导航**。已有正文直接读；标「待写」的是占位章，只说明计划写什么。

## 分卷一览

| 卷 | 导读 | 内容 |
|----|------|------|
| 卷一·发明权限 | [导读](./v1-00-overview.md) | 现第 0～14 站（部分待加厚） |
| 卷二·网上的身份 | [导读](./v2-00-overview.md) | 现第 15～16 站 + NTLM / 登录类型 / SPN（待写） |
| 卷三·权利、UAC、特权账户 | [导读](./v3-00-overview.md) | 现合章待拆 + GPO 权利 / AdminSDHolder（待写） |
| 卷四·不只是文件 | [导读](./v4-00-overview.md) | 注册表 / 服务 / AD 委派（待写） |
| 卷五·排障与设计模式 | [导读](./v5-00-overview.md) | 共享设计 / 有效权限实战 / 案例集（待写） |
| 卷六·用代码改权限 | [导读](./v6-00-overview.md) | .NET 身份 / ACL / 模拟（待写） |
| 附录 | [导读](./a-00-overview.md) | 总图 / SDDL / 事件 ID / 实验室 / 参考 |

## 卷一·发明权限

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [第 0 站](./01-no-permission.md) | 已有 | 为什么需要后面这些发明 |
| [第 1 站](./02-account.md) | 已有 | 系统如何认出「人」 |
| [第 2 站](./03-sid.md) | 已有 | 机器真正认的稳定身份证号 |
| [第 3 站](./04-name-sid-lsa.md) | 已有 | LSA 去哪里查、怎么翻译 |
| [第 4 站](./05-logon-lsa.md) | 已有 | 谁验密码、登录过程怎样 |
| [第 5 站](./06-access-token.md) | 已有 | 登录成功后挂到进程上的通行证 |
| [第 6 站](./07-owner.md) | 已有 | 对象上的「主人」字段 |
| [第 7 站](./08-permission-bits.md) | 已有·待加厚 | 读 / 写 / 完全控制等操作粒度 |
| [第 8 站](./09-groups.md) | 已有·待加厚 | 人太多时如何打包身份 |
| [第 9 站](./10-ace-dacl.md) | 已有 | 门上的规则列表怎么写 |
| [第 10 站](./11-access-check.md) | 已有 | 令牌如何对上规则；共享∩NTFS |
| [第 11 站](./12-security-descriptor.md) | 已有·待加厚 | Owner + DACL（及 SACL 槽位） |
| [第 12 站](./13-inheritance.md) | 已有 | 从最小实验发明 OI/CI/IO/NP |
| [第 13 站](./14-effective-permissions.md) | 已有 | 用有效访问验收「某人最终怎样」 |
| [第 14 站](./15-sacl.md) | 已有·待加厚 | 审计：碰了记不记 |

## 卷二·网上的身份

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [第 15 站](./16-domain-dc.md) | 已有 | 域与域控 |
| [第 16 站](./17-kerberos.md) | 已有 | Kerberos 票据 |
| [NTLM 与协商](./v2-ntlm.md) | 待写 | 非纯 Kerberos 时发生了什么 |
| [登录类型](./v2-logon-types.md) | 待写 | Interactive / Network / Batch / Service… |
| [SPN](./v2-spn.md) | 待写 | 服务如何被票认到 |

## 卷三·权利、UAC、特权账户

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [权利与 UAC（合章）](./18-rights-uac.md) | 已有·待拆 | 当前合订；将拆成下列专章 |
| [用户权利专章](./v3-user-rights.md) | 待写 | 对象权限 ≠ 用户权利 |
| [UAC 专章](./v3-uac.md) | 待写 | 双令牌与诊断 |
| [GPO 权利分配](./v3-gpo-rights.md) | 待写 | 权利从哪配置 |
| [AdminSDHolder](./v3-adminsdholder.md) | 待写 | 保护组 ACL 为何被还原 |

## 卷四·不只是文件

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [注册表 ACL](./v4-registry.md) | 待写 | 同一套 SD，换到注册表 |
| [服务权限](./v4-services.md) | 待写 | 服务账户与对象 ACL |
| [AD 委派](./v4-ad-delegation.md) | 待写 | OU 上谁能改用户 |

## 卷五·排障与设计模式

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [共享设计](./v5-share-design.md) | 待写 | 两道门如何配 |
| [有效权限实战](./v5-effective-access-practice.md) | 待写 | 可重复验收流程 |
| [排障案例集](./v5-troubleshooting-cases.md) | 待写 | 按症状找原因 |

## 卷六·用代码改权限

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [.NET 身份](./v6-dotnet-identity.md) | 待写 | WindowsIdentity / Principal |
| [.NET 改 ACL](./v6-dotnet-acl.md) | 待写 | FileSystemAccessRule 与继承标志 |
| [.NET 模拟](./v6-dotnet-impersonation.md) | 待写 | Impersonation 入门 |

## 附录

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [总图](./19-map.md) | 已有·待升级 | 串回全链路（将纳入新卷节点） |
| [SDDL](./a-sddl.md) | 待写 | 字串形式的安全描述符 |
| [事件 ID](./a-event-ids.md) | 待写 | 登录与对象访问速查 |
| [实验室](./a-lab.md) | 待写 | 最小实验环境清单 |
| [参考](./20-references.md) | 已有·待升级 | Learn 链接与实验顺序 |

## 建议阅读顺序

1. 卷一按站读完（薄章可先跳过加厚，但 ACE / 继承 / 有效权限建议精读）  
2. 卷二域 + Kerberos；其余待写章有需要再盯  
3. 卷三先读合章，再等拆章 / GPO / AdminSDHolder  
4. 卷四～六、附录按职责选读  

下一章从 [卷一导读](./v1-00-overview.md) 或 [第 0 站](./01-no-permission.md) 开始。

---

<!-- chapter-nav:start -->
· [回书稿索引](./00-index.md)
→ 下一章：[卷一导读](./v1-00-overview.md)
<!-- chapter-nav:end -->
