---
title: "第 18 讲：登录类型（Logon Type）"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 18 讲：登录类型"
order: 4
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 18 讲：登录类型（Logon Type）

### 麻烦

文件服务器上有个共享 `\\fs1\data`。你拿域账号 `appsvc` 在自己电脑上演示，`net use` 一挂就通，文件随便读。可当你把**同一个账号**配进 Windows 服务里、让服务去访问同一个共享，它偏偏报「拒绝访问」。

反过来的怪事更常见：某个 IIS 应用池账号能登进网页、连上后端数据库，但你直接拿这个账号远程登那台 Web 服务器，它连本机桌面都进不去。

密码没错，账号没错，ACL 也没错。错的是——**这两次登录的「类型」不一样**，LSA 给它盖的令牌就不是同一份。上一讲讲 NTLM / Kerberos 协商，解决的是「**能不能进门**」；这一讲要补的是：「**从哪条门进来，决定门后能干啥**」。

### 这一讲只发明：登录类型（Logon Type）

第 4 讲我们说过「认证成功，LSA 就发令牌」。但 LSA 不是无差别发——它会在令牌上**盖一个戳**，记录你是从哪条门进来的：

- 你坐在键盘前敲进 Windows → **Interactive**（交互登录）；
- 你通过 SMB 访问共享、RPC 调远端服务 → **Network**（网络登录）；
- 你被计划任务拉起来跑批 → **Batch**；
- 你被服务控制管理器（SCM）当服务启动 → **Service**；
- 你走 RDP 远程桌面进来 → **RemoteInteractive**。

这个戳就是 **Logon Type**。它不只是事后记录——它**决定令牌里装了什么**。

来源：[LogonUser 函数的 dwLogonType 取值](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-logonusera)

### 为什么这一个戳能决定能干啥

LSA 根据登录类型，往令牌里塞**不同的「已知组」SID**：

- Interactive → 额外加 `NT AUTHORITY\INTERACTIVE`（`S-1-5-4`）；
- Network → 额外加 `NT AUTHORITY\NETWORK`（`S-1-5-2`）；
- Batch → `S-1-5-3`；Service → `S-1-5-6`。

这一组 SID 的差异，直接改写 ACL 与权利的结果：

1. **ACL 按组匹配**。一条 NTFS 权限要是给了 `INTERACTIVE`，那共享走 Network 登录的连接**不会命中**——它令牌里压根没这个组。开篇那个服务失败，多半就是栽在这里。
2. **用户权利按登录类型分配**。本地策略里「作为服务登录」（`SeServiceLogonRight`）、「作为批处理作业登录」（`SeBatchLogonRight`）——没把账号列进去，它**根本没资格**做那类登录，连戳都盖不上。
3. **会话隔离**。Service 登录跑在 Session 0，没有桌面、弹不出对话框；想弹窗给用户看？它没有 INTERACTIVE 那套东西。

来源：[Well-known security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

口诀：

> **令牌不只看「你是谁」，还要看「你从哪条门进来」。**  
> **门不同 → 组不同 → ACL 的结果就不同。**

### 双跳（Double Hop）：Network 登录最著名的坑

Web 服务器 A 用 Kerberos 认证了用户，再想拿用户身份去访问数据库服务器 B——报错。这是 Windows 老字号问题，叫**双跳**。根子同样在登录类型：

- A 收到的令牌是 **Network 登录**产出的，只装着「能代表你访问 A 本身」的票；
- A **没有**用户的 TGT，自然无法再去 B 申请一张新票；
- 而用户本地交互登录（Interactive）时，令牌带着完整凭据，A→B 的跳转就可行（再配合委派）。

所以 Kerberos 约束委派、协议过渡这些机制，本质上都是在「**补一张 Network 令牌缺掉的票**」。

来源：[Kerberos 约束委派概述](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview)

### 常见登录类型对照表

安全事件 4624 里的 `Logon Type` 字段就是这个戳。最常打交道的几种：

| Logon Type | 名字 | 典型场景 | 令牌标志组 | 能否委派 |
|---|---|---|---|---|
| 2 | Interactive | 键盘登录到本机（控制台） | INTERACTIVE | 是 |
| 3 | Network | 共享、RPC、IIS 集成认证 | NETWORK | **否**（双跳坑） |
| 4 | Batch | 计划任务 | BATCH | 否 |
| 5 | Service | SCM 启动的服务 | SERVICE | 否 |
| 7 | Unlock | 解锁屏幕 | 沿用原令牌 | 沿用 |
| 8 | NetworkCleartext | Basic 认证 / 明文凭据 | NETWORK | 否 |
| 9 | NewCredentials | `runas /netonly` | 本地不变，出网换 | 仅出网 |
| 10 | RemoteInteractive | RDP / 终端服务 | INTERACTIVE | 是 |
| 11 | CachedInteractive | 域不通时用缓存凭据 | （带缓存标记） | 否 |

注意 2 和 10：本地键盘是 2，RDP 是 10。两者**都有 INTERACTIVE 组、都能委派**，从令牌能力看几乎等价；之所以分开，是为了审计与远程会话管理。

来源：[安全事件 4624 说明](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624)

### 怎么看见

**看令牌里的「门第戳」**——`whoami /groups` 会把 INTERACTIVE / NETWORK / BATCH / SERVICE 直接印出来：

```bat
whoami /groups | findstr /i "INTERACTIVE NETWORK BATCH SERVICE"
```

控制台登录时的输出（有 INTERACTIVE，没有 NETWORK）：

```
NT AUTHORITY\INTERACTIVE                      已知组 S-1-5-4
NT AUTHORITY\Authenticated Users              已知组 S-1-5-11
```

**看登录事件**——任何一次登录都会在安全日志里写一条 4624。用 PowerShell 把关心的字段挑出来：

```powershell
Get-WinEvent -LogName Security -MaxEvents 6 `
  -FilterXPath "*[System[EventID=4624]]" |
  ForEach-Object {
    [PSCustomObject]@{
      Time      = $_.TimeCreated
      User      = $_.Properties[5].Value   # TargetUserName
      LogonType = $_.Properties[8].Value   # LogonType
      Src       = $_.Properties[18].Value  # IpAddress
    }
  } | Format-Table -AutoSize
```

典型输出（一眼看出每次登录走的哪条门）：

```
Time                  User                 LogonType Src
----                  ----                 --------- ---
2026-08-11 09:12:07   JZFZ\chengongyi      10        192.168.1.23   ← RDP 进来
2026-08-11 09:11:55   JZFZ\chengongyi      3         127.0.0.1      ← 本机访问共享
2026-08-11 09:10:42   JZFZ\appsvc          5         -              ← 服务启动
2026-08-11 09:08:30   JZFZ\chengongyi      2         -              ← 控制台登录
```

来源：[Get-WinEvent](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent)

**验证双跳**——在 Web 服务器 A 上 `klist`，如果只看到「给 A 自己的票」，没有给数据库 B 的票，那双跳必然失败：

```
#2>     Client: chengongyi @ JZFZ
        Server: HTTP/webA.jzfz.com        ← 只有这一张，没给 B 的票
```

### 收束

**你现在会了：** 同一个账号从键盘、共享、计划任务、服务四条门进来，LSA 给的令牌是不一样的——登录类型决定了令牌里的「门第组」、决定能用的权利、决定能否委派（双跳的根因）。  
**下一讲才需要：** 服务靠什么让别人**按名字**找到它、再和它的登录身份对上号——也就是 SPN（服务主体名称）。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 17 讲：NTLM 与协商](./03-ntlm.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 19 讲：SPN](./05-spn.md)
<!-- chapter-nav:end -->
