---
title: "附录·常用安全事件 ID"
sidebarGroup: "附录"
shortTitle: "事件 ID"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 附录·常用安全事件 ID

上一章 SDDL 教你把权限写进 DACL；再往前 [SACL](../vol1-invent/15-sacl.md) 那一讲说——给对象挂一条 SACL，系统在有人访问它时就「记一笔」。可这一笔**记到哪、长什么样、靠什么编号区分**？答案就是「Windows 安全日志」，每条记录都带一个**事件 ID（Event ID）**。

这一章是一张速查表：把排障和取证时最常翻的几组安全事件 ID 集中起来，再配上「怎么开审核、怎么查日志」。

## 一、登录相关（Logon / Logoff）

| ID | 含义 | 什么时候出现 |
|----|------|-------------|
| **4624** | 账户成功登录 | 任何一次成功登录（本地、网络、RDP、服务） |
| **4625** | 账户登录失败 | 密码错、账号禁用、时间限制——口令排障第一站 |
| 4634 / 4647 | 注销 | 登出 / 网络会话结束 |
| **4672** | 分配了特殊权限的新登录 | 管理员登录（普通用户不产生这条） |
| 4648 | 显式凭据登录 | `runas /user`、计划任务带密码 |

来源：[4624（登录成功）](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624)、[4625（登录失败）](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4625)

**4624 最该看的一个字段是 Logon Type（登录类型）**，它告诉你「这次是哪种登录」：

| 值 | 名称 | 含义 |
|----|------|------|
| 2 | Interactive | 本地键盘登录 |
| 3 | Network | 网络登录（共享、RPC） |
| 4 | Batch | 批处理作业 |
| 5 | Service | 服务启动 |
| 7 | Unlock | 解锁屏幕 |
| 8 | NetworkCleartext | 明文密码网络登录（如 IIS 基本认证） |
| 9 | NewCredentials | `runas /netonly`（带新凭据） |
| 10 | RemoteInteractive | **RDP 登录** |

> 看到 4624 别急着说「有人登进来了」——先看 **Logon Type**。Type 3 可能只是某个程序读了个共享文件，Type 10 才是有人坐上了你的 RDP。

## 二、对象访问相关（Object Access）

| ID | 含义 |
|----|------|
| **4656** | 请求打开对象句柄（带 SACL 匹配到的权限位） |
| **4663** | 真正尝试访问对象（Read / Write / Delete 等具体操作） |
| 4658 | 关闭句柄 |
| 4660 | 对象被删除 |
| 4670 | 对象权限（SACL）被修改 |

来源：[4663（对象访问）](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4663)

关键前提：**这些事件只有当你先给对象挂了 SACL 才会产生**。SACL 是开关，事件日志是结果——没设 SACL，文件被人删了也查不到 4663。

来源：[Audit File System（文件系统审核子类）](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/audit-file-system)

## 三、账户管理 / Kerberos（域环境延伸）

域控上这几条几乎天天见：

| ID | 含义 |
|----|------|
| 4720 | 创建用户账户 |
| 4724 | 重置账户密码 |
| 4738 | 用户账户被修改 |
| **4740** | 账户被锁定（密码试错触发） |
| 4767 | 账户解除锁定 |
| 4768 | Kerberos TGT 请求（向 KDC 要票据） |
| 4769 | Kerberos 服务票据请求 |
| **4771** | Kerberos 预认证失败（口令错 / 黄金票据线索） |

来源：[4720（创建用户）](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4720)、[4768（Kerberos 票据）](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4768)

## 四、和审核策略的关系——先开，才有事件

光知道 ID 没用，系统默认**很多审核子类是关的**。要产生上面这些事件，得先开「高级审核策略」。

**界面**：`secpol.msc` → 安全设置 → 高级审核策略 → 各子类「配置成功 / 失败」。

**命令**——看当前开了哪些：

```bat
auditpol /get /category:*
```

输出片段：

```
登录/注销
    登录                         成功和失败
    注销                         成功
    特殊登录                     成功
对象访问
    文件系统                     无审核     ← 默认没开，4656/4663 出不来
    注册表                       无审核
    内核对象                     无审核
```

**给某个子类开「成功 + 失败」**（例：开文件系统审核）：

```bat
auditpol /set /subcategory:"File System" /success:enable /failure:enable
```

来源：[auditpol](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/auditpol)、[高级安全审核常见问题](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/advanced-security-auditing-frequently-asked-questions)

口诀：

> **审核策略是总闸，SACL 是分闸。**  
> 总闸不开，分闸挂了 SACL 也没事件；两个都开，4663 才会进日志。

### 怎么看见

**界面**：`eventvwr.msc` → Windows 日志 → 安全。

**PowerShell**——查最近 5 条对象访问（4663）：

```powershell
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4663} -MaxEvents 5 |
  Select-Object TimeCreated, Id, @{n='Target';e={$_.Properties[6].Value}}
```

**按对象名筛选**——4663 的 `ObjectName` 字段就是被访问的文件，配合 `Match` 能定位某份敏感文档：

```powershell
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4663} |
  Where-Object { $_.Message -match '薪资表' } |
  Select-Object TimeCreated, Message
```

来源：[Get-WinEvent](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent)

### 收束

**你现在会了：** 最常翻的几组安全事件 ID（登录 / 对象访问 / 账户管理 / Kerberos）、4624 的 Logon Type 怎么读、审核策略（`auditpol`）总闸与 SACL 分闸的关系，以及用 `Get-WinEvent` 按事件 ID + 对象名从日志里捞出记录。  
**下一讲才需要：** 把前面所有概念搬到一个能动手的实验里——给文件挂 DACL + SACL、触发访问、再回日志对上 4663。

---

---

<!-- chapter-nav:start -->
← 上一章：[SDDL](./02-sddl.md)
· [回书稿索引](../00-index.md)
→ 下一章：[实验室](./04-lab.md)
<!-- chapter-nav:end -->
