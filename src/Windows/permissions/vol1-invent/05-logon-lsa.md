---
title: "第 4 站：登录——谁验密码，过程怎样（LSA）"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 4 站：登录与 LSA"
order: 5
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

# 第 4 站：登录——谁验密码，过程怎样（LSA）

### 先分清两个词（本站只用到「认证」）

| 词 | 白话 | 本站是否展开 |
|----|------|--------------|
| **认证 Authentication** | 你是不是你声称的那个人？ | ✅ 本站讲透 |
| **授权 Authorization** | 验过之后，某个文件/共享能不能碰？ | ❌ 后面才讲 |

来源：[Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)

### 例子：Alice 在 PC01 上登录

> 电脑 `PC01` 已加入域 `CONTOSO`。  
> Alice 输入 `CONTOSO\Alice` + 密码，点登录。

#### ① 唤起登录界面

**Winlogon** 管理安全交互，拉起安全桌面上的 **Logon UI**。  
来源：[Credentials processes - Winlogon](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

#### ② 选磁贴、输入账号密码

**Credential Provider** 负责采集、打包凭据（密码 / PIN / Hello…）。  
文档强调：Provider **不做最终放行**；执法的是 **LSA 与认证包**。  
来源：[Credential provider architecture](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

#### ③ 凭据交给本机 LSA

Winlogon 把凭据经 **`secur32.dll`** 交给 **LSA**（常在 LSASS 进程中）。  
来源：同上 Winlogon 说明。

#### ④ 去哪里对答案？

默认对照 **本机 SAM** 或（域加入机器上的）**Active Directory**。  
来源：[Credentials processes overview](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

```text
CONTOSO\Alice → LSA 判定为域账户 → 问 CONTOSO 域控
PC01\Bob      → LSA 查本机 SAM
```

#### ⑤ 成功或失败

认证包在初始登录成功时会**创建 logon session**，并返回后续构建安全上下文所需信息。  
来源：[LSA_AP_LOGON_USER](https://learn.microsoft.com/en-us/windows/win32/api/ntsecpkg/nc-ntsecpkg-lsa_ap_logon_user)

失败则回到登录界面（密码错、账户禁用、登录时段限制等）。

#### ⑥ 域控暂时连不上

若以前在这台机器成功用域账户登录过，可能使用**缓存的域登录凭据**仍进入桌面。  
来源：[Cached credentials and validation](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)

```text
Alice 输入密码
  → Logon UI + Credential Provider（采集）
  → Winlogon ──secur32──► LSA
  → 域账户？→ 问域控（或缓存）
  → 成功：建立 logon session → 下一站「发通行证」
```

### 收束

**你现在会了：** 登录框只收凭据；LSA 是验钞机；域/本机对答案的地方不同。  
**下一站才需要：** 验过之后，系统发给你什么，好让之后不用反复问密码。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 3 站：名字 ↔ SID](./04-name-sid-lsa.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 5 站：Access Token](./06-access-token.md)
<!-- chapter-nav:end -->
