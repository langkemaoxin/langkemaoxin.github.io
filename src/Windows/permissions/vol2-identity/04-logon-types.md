---
title: "第 18 讲：登录类型（Logon Type）"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 18 讲：登录类型"
order: 4
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：LSA 发令牌前先盖一个「从哪条门进来」的戳——门不同→组不同→ACL 结果就不同。本机 4624 统计五种登录类型全现身、whoami 里的 INTERACTIVE 戳、Network 登录双跳坑的票证根源。
---

# 第 18 讲：登录类型（Logon Type）

> **卷二·网上的身份（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[LogonUser 的 dwLogonType 取值](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-logonusera)、[事件 4624](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624)。

---

## 开场：密码没错、账号没错、ACL 也没错——错在「门」

**🧑‍🏫 老师：**

文件服务器上有个共享 `\\fs1\data`。你拿域账号 `appsvc` 在自己电脑上演示，`net use` 一挂就通；可把**同一个账号**配进 Windows 服务里让它访问同一个共享，偏偏报「拒绝访问」。反过来更常见：某 IIS 应用池账号能登网页、连数据库，但你直接拿它远程登那台 Web 服务器，连桌面都进不去。

**🧑‍🎓 学生：** 密码对、账号对、ACL 对——那错在哪？

**🧑‍🏫 老师：**

错在**这两次登录的「类型」不一样**，LSA 给它盖的令牌就不是同一份。上一讲 NTLM/Kerberos 协商解决「**能不能进门**」；这一讲补的是「**从哪条门进来，决定门后能干啥**」。第 4 讲说过「认证成功，LSA 就发令牌」——但 LSA 不是无差别发，它在令牌上**盖一个戳**，记录你从哪条门进来。这个戳就是 **Logon Type（登录类型）**，它不只是事后记录——**它决定令牌里装了什么**。

---

## 第 1 课：一个戳怎么决定能干啥

**🧑‍🏫 老师：**

LSA 根据登录类型，往令牌里塞**不同的「门第组」SID**（[Well-known SIDs](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)）：

- Interactive → 额外加 `NT AUTHORITY\INTERACTIVE`（S-1-5-4）；
- Network → 额外加 `NT AUTHORITY\NETWORK`（S-1-5-2）；
- Batch → S-1-5-3；Service → S-1-5-6。

这组差异直接改写 ACL 与权利的结果，三条路：

1. **ACL 按组匹配**。一条 NTFS 权限若给了 `INTERACTIVE`，共享走 Network 登录的连接**不会命中**——它令牌里压根没这个组。开篇那个服务失败的案子，多半栽在这；
2. **用户权利按登录类型分配**。本地策略里「作为服务登录」（SeServiceLogonRight）、「作为批处理作业登录」（SeBatchLogonRight）——没把账号列进去，它**根本没资格**做那类登录，连戳都盖不上（卷三专讲）；
3. **会话隔离**。Service 登录跑在 Session 0，没有桌面、弹不出对话框（第 4 讲插问 1 的实测：lsass 在 Session 0、winlogon 在 Session 1）。

> 口诀：**令牌不只看「你是谁」，还要看「你从哪条门进来」。门不同 → 组不同 → ACL 的结果就不同。**

---

## 第 2 课：对照表 + 本机实测

**🧑‍🏫 老师：**

安全事件 4624 里的 `Logon Type` 字段就是这个戳：

| Logon Type | 名字 | 典型场景 | 令牌标志组 | 能否委派 |
|---|---|---|---|---|
| 2 | Interactive | 键盘登录到本机 | INTERACTIVE | 是 |
| 3 | Network | 共享、RPC、IIS 集成认证 | NETWORK | **否**（双跳坑） |
| 4 | Batch | 计划任务 | BATCH | 否 |
| 5 | Service | SCM 启动的服务 | SERVICE | 否 |
| 7 | Unlock | 解锁屏幕 | 沿用原令牌 | 沿用 |
| 8 | NetworkCleartext | Basic 认证 | NETWORK | 否 |
| 9 | NewCredentials | `runas /netonly` | 本地不变，出网换 | 仅出网 |
| 10 | RemoteInteractive | RDP | INTERACTIVE | 是 |
| 11 | CachedInteractive | 域不通时用缓存 | 带缓存标记 | 否 |

注意 2 和 10：本地键盘是 2、RDP 是 10，两者**都有 INTERACTIVE 组、都能委派**，从令牌能力看几乎等价；分开编号是为了审计与远程会话管理。

**这张表在本机是活的**——第 4 讲统计过最近 300 条 4624：

```text
   97 LogonType 5      ← 服务登录最多（后台服务一直在起）
   29 LogonType 3      ← 网络登录
    5 LogonType 2      ← 交互式（人坐在机器前）
    2 LogonType 10     ← 远程交互（有人 RDP 过）
    1 LogonType 7      ← 解锁
```

五种门全现身。**令牌侧的「门第戳」也能直接看**——我当前令牌里（控制台登录出身）：

```text
PS> whoami /groups | findstr /i "INTERACTIVE NETWORK"
NT AUTHORITY\INTERACTIVE     已知组  S-1-5-4      ← 有：我是从交互门进来的
CONSOLE LOGON                已知组  S-1-2-1
（没有 NETWORK —— 我不是从网络门进来的）
```

要看每次登录走的哪条门，把 4624 的关键字段挑出来：

```powershell
Get-WinEvent -LogName Security -MaxEvents 6 -FilterXPath "*[System[EventID=4624]]" |
  ForEach-Object { [PSCustomObject]@{
      Time=$_.TimeCreated; User=$_.Properties[5].Value
      LogonType=$_.Properties[8].Value; Src=$_.Properties[18].Value } } |
  Format-Table -AutoSize
```

---

## 插问：双跳（Double Hop）为什么是 Network 登录最著名的坑？

**🧑‍🎓 学生：** 听说 Web 服务器拿用户身份去连数据库会失败——「双跳」？

**🧑‍🏫 老师：**

对，根子就在登录类型。Web 服务器 A 用 Kerberos 认证了用户，再想拿用户身份访问数据库 B——报错。拆开看：

- A 收到的令牌是 **Network 登录**产出的，只装着「能代表你访问 A 本身」的票（你给 A 的那张服务票）；
- A **没有**用户的 TGT，自然无法再去 B 申请一张新票；
- 而用户本地交互登录（Interactive）时令牌带着完整凭据，A→B 的跳转就可行（再配合委派）。

验证方法就是看票：在 A 上 `klist`，若只看到「给 A 自己的票」、没有给 B 的票，双跳必然失败。所以 **Kerberos 约束委派、协议过渡这些机制，本质都是在「补一张 Network 令牌缺掉的票」**（[约束委派概述](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview)）——上一讲 klist 快照二里那张 `forwarded + DELEGATION` 的票，就是委派机制在干活的痕迹。

---

## 收束

**你现在会了：** 同一个账号从键盘、共享、计划任务、服务四条门进来，LSA 给的令牌不一样——登录类型决定令牌里的「门第组」（本机：我有 INTERACTIVE 没有 NETWORK）、决定可用的权利、决定能否委派（双跳的根因）；4624 的 LogonType 字段是排障第一落点（本机五型全见）。

**下一讲才需要：** 服务靠什么让别人**按名字**找到它、再和它的登录身份对上号——SPN（服务主体名称）。

---

<!-- chapter-nav:start -->
← 上一章：[第 17 讲：NTLM 与协商](./03-ntlm.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 19 讲：SPN](./05-spn.md)
<!-- chapter-nav:end -->
