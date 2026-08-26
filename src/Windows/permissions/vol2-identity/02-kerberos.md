---
title: "第 16 讲：Kerberos 票据——网上如何证明「我是谁」"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 16 讲：Kerberos"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "Active Directory"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：密码只交给盖章处一次——发明 TGT 总通行证与服务票据专用票。本机 klist 实拍票据缓存从登录时的 3 张涨到干活后的 8 张，逐字段读一张真 TGT（AES-256、10 小时寿命、Kdc Called），并看 LDAP 查询如何让口袋里多出服务票。
---

# 第 16 讲：Kerberos 票据——网上如何证明「我是谁」

> **卷二·网上的身份（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26（加域机器 + 域账户会话）。官方锚点：[Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)。

---

## 开场

**🧑‍🏫 老师：**

卷一第 4、5 讲：坐在电脑前登录 → 本机得到 **Access Token**。第 10 讲：打开 `\\jzfz18\协同设计平台-18\...` 还要做**网络登录**——服务器也得认清你。若每次连共享都把**密码**交给文件服务器：烦（反复输入）、险（每台服务器都可能学到你的密码）。

需要发明另一种证明方式：**给服务器看一张「章」，而不是把密码交出去。** 本讲严格西蒙节奏：先发明「盖章处 / 总通行证 / 专用票」，再贴 Kerberos 官方名；不展开黄金票据、委派、加密套件考试表。

---

## 第 1 课：密码只交给「盖章处」一次

**🧑‍🏫 老师：**

域里已有第 15 讲的**答账服务器（域控）**。再给它一个额外职责：当**可信的第三方盖章处**。推导：

1. 你登录域账户时，只向盖章处证明「我是小王、密码对」；
2. 盖章处发给你一张**当天有效的总通行证**；
3. 以后访问某台文件服务器，用总通行证去换一张**只针对该服务的专用票**；
4. 文件服务器验的是专用票（相信盖章处签过），**不必**也不该拿到你的域密码。

**现在才贴官方标签**：

| 刚才发明的东西 | 常见叫法 |
|----------------|----------|
| 这套「盖章换票」协议 | **Kerberos** |
| 盖章处（常跑在域控上） | **KDC（Key Distribution Center，密钥分发中心）** |
| 登录后拿到的总通行证 | **TGT（Ticket-Granting Ticket）** |
| 访问某服务时换到的专用票 | **Service Ticket（服务票据）** |

（官方细节：KDC = AS + TGS 两半——先用密码向 AS 要 TGT，再用 TGT 向 TGS 要服务票；第 4 讲 LSA 图里那个 KDC 箭头，指的就是这条路上的盖章处。）

两条时间线对齐（全用已会的词）：

```text
【坐在电脑前登录域账户】
  输入域名\账户 + 密码
    → LSA 联系域（第 4 讲）→ KDC 认可
    → 本机得到 Access Token（第 5 讲），并且缓存一张 TGT

【稍后打开 \\fileserver\share】
  本机用 TGT 向 KDC 申请「访问 fileserver 的 SMB」专用票
    → 带着专用票做网络登录（第 10 讲）
    → 服务器认可你是谁之后
    → 再走 共享门 ∩ NTFS 门（令牌 SID 对 ACE）
```

> **票据解决「网上如何认证」；令牌 + DACL 解决「认证之后能否读写」。** 两件事前后衔接，不要混成一个名词。

---

## 第 2 课：实验——口袋里的票，亲眼数一遍

**🧑‍🎓 学生：** 这些票我能看见吗？

**🧑‍🏫 老师：**

`klist` 就是看你口袋里票的命令（[官方](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist)）。这台机器今天的三次快照，正好演出「票是怎么涨起来的」：

**快照一：刚登录不久**（上午 8:35 登录后）——3 张：

```text
Current LogonId is 0:0x96b49
Cached Tickets: (3)

#0>     Client: chengongyi @ JZFZ.LOCAL
        Server: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL          ← TGT（总通行证）
        KerbTicket Encryption Type: AES-256-CTS-HMAC-SHA1-96
        Start Time: 8/26/2026 8:35:43 (local)
        End Time:   8/26/2026 18:35:43 (local)           ← 寿命 10 小时
        Renew Time: 9/2/2026 8:35:43 (local)              ← 可续期 7 天
        Kdc Called: jzfzdc5.jzfz.local                    ← 哪台 DC 盖的章
（#1、#2：LDAP 相关的服务票据——开机过程自动问账本留下的）
```

**快照二：干了一上午活之后**（做了 LDAP 直查、跑了些实验）——**8 张**：

```text
Cached Tickets: (8)

#0>     Client: chengongyi @ JZFZ.LOCAL
        Server: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL
        Ticket Flags 0x60a10000 -> forwardable forwarded renewable pre_authent …
        Start Time: 8/26/2026 10:17:26 (local)
        Cache Flags: 0x2 -> DELEGATION                    ← 一张被「转交」过的新 TGT
        Kdc Called: jzfzdc5.jzfz.local

#1>     Server: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL            ← 原 TGT 还在
（……共 8 张：多出来的全是干活时换的服务票）
```

**🧑‍🎓 学生：** 两个快照差出五张票——这正是第 15 讲 LDAP 查询的代价！每次向域账本提问，口袋里就多一张「问过账」的票。

**🧑‍🏫 老师：**

对，而且快照二里那张带 `forwarded + DELEGATION` 的新 TGT 值得看一眼——**票是可以被转交的**（凭据委托，卷一第 4 讲 RDP 的 CredSSP 提过），这里先认脸。逐字段读一张真 TGT，每个字段都对得上本卷已讲的机制：

| 字段 | 本机值 | 对应什么 |
|------|--------|----------|
| `Server: krbtgt/…` | krbtgt/JZFZ.LOCAL | 发给 krbtgt 的都是「换票用的主票」（TGT） |
| `Encryption Type` | AES-256-CTS-HMAC-SHA1-96 | 票的加密强度 |
| `Start / End Time` | 8:35 → 18:35 | **10 小时寿命**——票不是用到退休的 |
| `Renew Time` | 9/2 | 续期窗口（注意：续期≠刷新 PAC，卷一第 5 讲那个坑） |
| `Ticket Flags` | forwardable renewable … | 票的属性开关 |
| `Kdc Called` | jzfzdc5.jzfz.local | **哪台 DC 盖的章**——和 `$env:LOGONSERVER` 对上 |

> 若 `klist` 几乎为空：可能未走域登录、票已清（`klist purge`）、或当前会话不是域会话。另一个高频提醒（第 10 讲埋过）：**用 IP 访问共享常落到 NTLM 而不是 Kerberos**（下一讲的主角），尽量用主机名。

---

## 插问：这套票的「信用」绑在哪？

**🧑‍🎓 学生：** 文件服务器凭什么信这张票？万一有人自己刻一张呢？

**🧑‍🏫 老师：**

票是**KDC 用只有它自己有的密钥签的**，服务器验票靠的是它和 KDC 之间的约定（服务的密钥存在域账本里，SPN 登记——第 19 讲的主角）。所以：**票的信用绑在域的盖章体系上，不绑在某一台文件服务器的良心上**，你也没把密码交给任何一台服务器。运维里还会听到 **KRBTGT 账户**——那是 KDC 签总票时用的特殊账户（[Default accounts](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-default-user-accounts)），它的密码哈希等于「造假总通行证」的模子——这就是「黄金票据」攻击的名字来源，本讲点到为止（防御视角在卷七 Credential Guard 与巡检）。

---

## 第 3 课：和前几讲怎么对齐（防混淆表）

| 概念 | 主要回答的问题 | 你已经会的讲 |
|------|----------------|--------------|
| 密码 / 登录 | 人是不是本人 | 第 4 讲 |
| Access Token | 本机进程「带着哪些 SID」 | 第 5、8 讲 |
| Kerberos 票据 | 网上服务如何在不收密码的情况下认你 | **本讲** |
| ACE / Access Check | 认清人之后，这个文件能不能碰 | 第 9、10 讲 |
| 域控 / 目录 | 账户组存在哪、KDC 常跑在哪 | 第 15 讲 |

一句话串起整条链：**登录换 TGT → 访问服务换专用票 → 服务器验票认人 → 令牌对 DACL 定权限。**

---

## 收束

**你现在会了：** 域网上证明身份常用 Kerberos：先 TGT、再换服务票；服务器验票不收你的域密码（本机实拍：票从 3 张涨到 8 张、TGT 逐字段可读）；验完之后权限仍按令牌对 DACL（外加共享门）。

**下一讲才需要：** Kerberos 不是唯一的网络认证协议——那套老的、没有票的 NTLM 长什么样，什么时候会退到它。

---

<!-- chapter-nav:start -->
← 上一章：[第 15 讲：域与域控](./01-domain-dc.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 17 讲：NTLM 与协商](./03-ntlm.md)
<!-- chapter-nav:end -->
