---
title: "第 16 站：Kerberos 票据——网上如何证明「我是谁」"
sidebarGroup: "卷二·网上的身份"
shortTitle: "第 16 站：Kerberos"
order: 2
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

# 第 16 站：Kerberos 票据——网上如何证明「我是谁」

### 麻烦

第 4、5 站：坐在电脑前登录 → 本机得到 **Access Token**。  
第 10 站：打开 `\\jzfz18\协同设计平台-18\...` 时，还要做**网络登录**——服务器也得认清你。

若每次连共享都把**密码**交给文件服务器：

- 烦（反复输入）；  
- 险（每台服务器都可能学到你的密码）。

需要发明另一种证明方式：**给服务器看一张「章」**，而不是把密码交出去。

> 本站严格西蒙节奏：先发明「盖章处 / 总通行证 / 专用票」，再贴 Kerberos 官方名。  
> **不展开**黄金票据、委派、加密套件考试表。

---

### 16.1 想做什么：密码只交给「盖章处」一次

域里已经有第 15 站的**答账服务器（域控）**。再给它一个额外职责：当**可信的第三方盖章处**。

推导：

1. 你登录域账户时，只向盖章处证明「我是小王、密码对」；  
2. 盖章处发给你一张**当天有效的总通行证**（先别记英文）；  
3. 以后要访问某台文件服务器，用总通行证去换一张**只针对该服务的专用票**；  
4. 文件服务器验的是专用票（相信盖章处签过），**不必**也不该拿到你的域密码。

#### 现在才贴官方标签

| 刚才发明的东西 | 常见叫法 |
|----------------|----------|
| 这套「盖章换票」协议 | **Kerberos** |
| 盖章处（常跑在域控上） | **KDC（Key Distribution Center，密钥分发中心）** |
| 登录后拿到的总通行证 | **TGT（Ticket-Granting Ticket，票据授予票据）** |
| 访问某服务时换到的专用票 | **Service Ticket（服务票据）** / 会话票 |

来源：[Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)  
（KDC = AS + TGS；先发 TGT，再用 TGT 向 TGS 要服务票。）

第 3 站 LSA 图里的 **KDC** 箭头，指的就是这条路上的盖章处。

---

### 16.2 两条时间线：登录发总票，访问换专用票

```text
【坐在电脑前登录域账户】
  输入域名\账户 + 密码
    → LSA 联系域（第 4 站）
    → KDC 认可后：本机得到 Access Token（第 5 站）
                   并且常缓存一张 TGT（总通行证）

【稍后打开 \\fileserver\share】
  本机用 TGT 向 KDC 申请「访问 fileserver 上 SMB」的专用票
    → 带着专用票去做网络登录（第 10.2 站）
    → 服务器认可你是谁之后
    → 再走共享门 ∩ NTFS 门（令牌 SID 对 ACE，第 10 站）
```

收成一句：

> **票据解决「网上如何认证」；令牌 + DACL 解决「认证之后能否读写」。**  
> 两件事前后衔接，不要混成一个名词。

---

### 16.3 最小观察：用 `klist` 看见口袋里的票

在**已加入域且已用域账户登录**的电脑上：

`klist` ：<u>看当前登录会话缓存了哪些 Kerberos 票（含 TGT 与服务票）</u>

`klist tgt`:<u>只盯总通行证（TGT）</u>


```bat
PS C:\Users\chengongyi> klist tgt

当前登录 ID 是 0:0x13d0ec

缓存的 TGT:

服务名        : krbtgt
目标名(SPN)   : krbtgt
客户端名         : chengongyi
域名         : JZFZ.LOCAL
目标域名   : JZFZ.LOCAL
替换目标域名: JZFZ.LOCAL
票证标志       : 0x40e10000 -> forwardable renewable initial pre_authent name_canonicalize
会话密钥        : 密钥类型 0x12 - AES-256-CTS-HMAC-SHA1-96
                   : 密钥长度 32 - 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
开始时间          : 8/7/2026 10:02:54 (本地)
结束时间            : 8/7/2026 20:02:54 (本地)
在以下时间之前续订         : 8/14/2026 10:02:54 (本地)
TimeSkew           :  + 0:00 分钟
编号票证      : (大小: 2423)
0000  61 82 09 73 30 82 09 6f:a0 03 02 01 05 a1 0c 1b  a..s0..o........
0010  0a 4a 5a 46 5a 2e 4c 4f:43 41 4c a2 1f 30 1d a0  .JZFZ.LOCAL..0..
0020  03 02 01 02 a1 16 30 14:1b 06 6b 72 62 74 67 74  ......0...krbtgt
0030  1b 0a 4a 5a 46 5a 2e 4c:4f 43 41 4c a3 82 09 37  ..JZFZ.LOCAL...7
0040  30 82 09 33 a0 03 02 01:12 a1 03 02 01 03 a2 82  0..3............
0050  09 25 04 82 09 21 d6 0a:db f0 83 f6 f9 58 7f 82  .%...!.......X..
```

系统刚登陆的时候
``` bat
PS C:\Users\chengongyi> klist

当前登录 ID 是 0:0x13d0ec

缓存的票证: (1)

#0>     客户端: chengongyi @ JZFZ.LOCAL
        服务器: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL
        Kerberos 票证加密类型: AES-256-CTS-HMAC-SHA1-96
        票证标志 0x40e10000 -> forwardable renewable initial pre_authent name_canonicalize
        开始时间: 8/7/2026 10:02:54 (本地)
        结束时间:   8/7/2026 20:02:54 (本地)
        续订时间: 8/14/2026 10:02:54 (本地)
        会话密钥类型: AES-256-CTS-HMAC-SHA1-96
        缓存标志: 0x1 -> PRIMARY
        调用的 KDC: jzfzdc9.jzfz.local
```

访问过共享目录之后，发现了缓存了共享路径的票据
``` bat
PS C:\Users\chengongyi> klist

当前登录 ID 是 0:0x13d0ec

缓存的票证: (3)

#0>     客户端: chengongyi @ JZFZ.LOCAL
        服务器: krbtgt/JZFZ.LOCAL @ JZFZ.LOCAL
        Kerberos 票证加密类型: AES-256-CTS-HMAC-SHA1-96
        票证标志 0x40e10000 -> forwardable renewable initial pre_authent name_canonicalize
        开始时间: 8/7/2026 10:02:54 (本地)
        结束时间:   8/7/2026 20:02:54 (本地)
        续订时间: 8/14/2026 10:02:54 (本地)
        会话密钥类型: AES-256-CTS-HMAC-SHA1-96
        缓存标志: 0x1 -> PRIMARY
        调用的 KDC: jzfzdc9.jzfz.local

#1>     客户端: chengongyi @ JZFZ.LOCAL
        服务器: cifs/jzfz15 @ JZFZ.LOCAL
        Kerberos 票证加密类型: AES-256-CTS-HMAC-SHA1-96
        票证标志 0x40a10000 -> forwardable renewable pre_authent name_canonicalize
        开始时间: 8/7/2026 10:23:08 (本地)
        结束时间:   8/7/2026 20:02:54 (本地)
        续订时间: 8/14/2026 10:02:54 (本地)
        会话密钥类型: AES-256-CTS-HMAC-SHA1-96
        缓存标志: 0
        调用的 KDC: jzfzdc9.jzfz.local

#2>     客户端: chengongyi @ JZFZ.LOCAL
        服务器: LDAP/JZFZDC10.jzfz.local/jzfz.local @ JZFZ.LOCAL
        Kerberos 票证加密类型: AES-256-CTS-HMAC-SHA1-96
        票证标志 0x40a50000 -> forwardable renewable pre_authent ok_as_delegate name_canonicalize
        开始时间: 8/7/2026 10:23:06 (本地)
        结束时间:   8/7/2026 20:02:54 (本地)
        续订时间: 8/14/2026 10:02:54 (本地)
        会话密钥类型: AES-256-CTS-HMAC-SHA1-96
        缓存标志: 0
        调用的 KDC: jzfzdc9.jzfz.local
```





来源：[klist](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist)

现象直觉（具体输出因环境而异）：

- 刚登录后，往往已有与 `krbtgt` 相关的总票痕迹；  
- 访问过 `\\某主机名\...` 之后，列表里常多出针对该主机/服务的票；  
- 票有**过期时间**——过期后要续或重登，不是「一张票用到退休」。

> 若 `klist` 几乎为空：可能未走域登录、票已清、或当前会话不是域会话。  
> 用 **IP** 访问共享时，常更容易落到 NTLM 而不是 Kerberos（第 10.2 已提醒：尽量用主机名）。

---

### 16.4 和前几站怎么对齐（防混淆）

| 概念 | 主要回答的问题 | 你已经会的站 |
|------|----------------|--------------|
| 密码 / 登录 | 人是不是本人 | 第 4 站 |
| Access Token | 本机进程「带着哪些 SID」 | 第 5、8 站 |
| Kerberos 票据 | 网上服务如何在不收密码的情况下认你 | **本站** |
| ACE / Access Check | 认清人之后，这个文件能不能碰 | 第 9、10 站 |
| 域控 / 目录 | 账户组存在哪、KDC 常跑在哪 | 第 15 站 |

运维里还会听到 KRBTGT 账户等——那是 KDC 签总票时用的特殊账户，本站只需知道：**票的信用绑在域的盖章体系上，不绑在某一台文件服务器的良心上。**  
来源：[Default accounts - KRBTGT](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-default-user-accounts)

---

### 收束

**你现在会了：**  
域网上证明身份，常用 Kerberos：先 TGT，再换服务票；服务器验票不收你的域密码；验完之后权限仍按令牌对 DACL（外加共享门）。  

**下一站才需要：** 「能备份整盘」这类能力，和「某个文件 ACE」不是同一类设置；以及管理员为何还弹 UAC。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 15 站：域与域控](./01-domain-dc.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 17 站：NTLM 与协商](./03-ntlm.md)
<!-- chapter-nav:end -->
