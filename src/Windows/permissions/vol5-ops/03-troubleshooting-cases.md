---
title: "第 30 讲：排障案例集"
sidebarGroup: "卷五·排障与设计模式"
shortTitle: "第 30 讲：排障案例集"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 30 讲：排障案例集

### 麻烦

前面几卷把权限模型一层层搭起来了：令牌、SID、DACL、继承、共享、有效访问。可真到了现场，用户只甩给你一句「打不开」。到底哪一层在拦？上一讲的「有效访问」本该回答这个问题，偏偏它自己有时候也会骗人。这一讲不讲新机制，讲**怎么把症状对到那一层**。

### 这一讲只发明：一张「访问被拒」的分层排查表

一次资源访问，要穿过四道关，被任何一道挡下都会「拒绝访问」：

1. **令牌层**——你这次登录带了哪些 SID？刚加的组生效了吗？是不是被 UAC 滤掉了？
2. **共享层**——只有 UNC 路径才走，看的是共享权限。
3. **DACL 层**——文件/文件夹的 ACL，有没有对应的 Allow，有没有 Deny。
4. **继承层**——这层 ACL 是哪来的？新建文件为什么拿到了奇怪的权限？

来源：[How DACLs Control Access to an Object](https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacl-controls-access-to-an-object)

口诀：

> **被拒先问三件事：令牌带了啥、哪条 ACE 拦的、共享有没有又设了一道。**

下面五个真实案例，每个都对应上面某一层的典型翻车。

### 案例一：本机能开，UNC 打不开

**现象**：在服务器上 `D:\share\report.xlsx` 双击就开；客户端跑 `\\server\share\report.xlsx` 提示拒绝访问。

**先查什么**：网络访问要同时满足**共享权限**和 **NTFS 权限**，取交集。本机不走共享那一道，所以本地能开不代表共享侧放行。

```bat
net share share
```

```
共享名   资源        备注
-----------------------------
share    D:\share

该共享的权限:
Everyone 读取          ← 共享侧只给了读
```

共享给「读取」、NTFS 给「修改」，最终只能读——交集。先到属性 → **共享** 选项卡把共享权限补齐，再看 **安全** 选项卡的 NTFS。

> **本机 ≠ 网络。UNC 多一道共享权限，二者取交集。**

**关联**：卷三共享那一章。

### 案例二：进组了，还是进不去

**现象**：早上 9 点把你加进「财务系统用户」域组，你立刻去开系统，提示拒绝。

**先查什么**：组 SID 是**登录时**写进令牌的。第 5 讲说过，令牌挂在进程上，登录期间不变。你现在的进程还是早上 8 点那份旧令牌，里头没有新组的 SID。

```bat
whoami /groups | findstr 财务
```

没输出 = 令牌里没这条。**注销重登**（域账户尤其要连上域控重新登）后再查，就有了。

来源：[Access Tokens](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens)

> **令牌是登录时的快照。改组成员，得换一份新令牌。**

**关联**：第 5 讲（Access Token）。

### 案例三：有效访问说「允许」，实际还是被拒

**现象**：上一讲教的「有效访问」面板明明算出来「允许」，用户就是打不开。两个命令行窗口、`whoami` 显示同一个账号，一个能改 `C:\` 一个不能。

**先查什么**：这是 UAC 的滤令牌在作怪。同一个号，普通窗口里 Administrators 组被标成 `仅拒绝的组 (deny only)`；「以管理员身份运行」的窗口里才是「启用的组」。

```bat
:: 普通窗口
whoami /groups | findstr Administrators
:: 右键以管理员身份运行的窗口
whoami /groups | findstr Administrators
```

```
普通窗口：  BUILTIN\Administrators  ... 仅拒绝的组 (deny only)
管理员窗口：BUILTIN\Administrators  ... 启用的组
```

`whoami`（不带参数）两窗完全相同——它只打印账号名；差别藏在 `/groups`、`/priv` 里。有效访问面板常在管理员上下文算，相当于用了提升后的令牌，自然和用户的受限令牌对不上。

来源：[Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)

**关联**：上一讲（有效访问）+ 第 5 讲（令牌）。

### 案例四：继承断了，新建文件权限「飞了」

**现象**：某项目文件夹被前任管理员关了继承、手工设过 ACL。之后新建的文件，权限要么是空的、要么继承到奇怪的东西。

**先查什么**：看这条 ACE 是不是**可继承的**，继承标志 `CI`/`OI` 对不对。

```bat
icacls "D:\project"
```

```
D:\project NT AUTHORITY\SYSTEM:(OI)(CI)(F)
           DOMAIN\project-rw:(OI)(CI)(M)
           DOMAIN\project-admin:(CI)(F)        ← 只有 CI，没有 OI
```

第三行只有 `(CI)`（容器继承，往子文件夹传）没有 `(OI)`（对象继承，往子文件传）——新建的 `.xlsx` 拿不到这条，于是 project-admin 在新文件上「消失」了。修法：补上 `(OI)`，或重开继承。

来源：[ACE Inheritance](https://learn.microsoft.com/en-us/windows/win32/secauthz/ace-inheritance)

> **断继承的手工 ACL 不会自动往下传。改之前先看 OI/CI。**

**关联**：卷二继承那一章。

### 案例五：迁移后新账号莫名被拒（sIDHistory 漏了）

**现象**：域迁移后，新账号访问老资源莫名被拒，老账号倒能开。

**先查什么**：迁移常用 `sIDHistory` 把老 SID 带进新令牌。如果某条 ACE 写的是**老域的 SID**，而新账号的 `sIDHistory` 没配全，令牌里就没这个 SID，匹配不上。对比两边：

```bat
whoami /groups /fo list | findstr SID     :: 自己令牌里的 SID
icacls "D:\legacy"                        :: 资源 ACE 里的 SID
```

对不上，就是 history 漏了——去迁移工具或 AD 那侧补。

来源：[Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

**关联**：卷一 SID 那一章。

### 怎么看见（通用三步法）

不管哪个案例，排查都走这三步：

```bat
:: 一键把三者都打出来：a.bat <路径> [共享名]
@echo off
echo === 1. 令牌 ===
whoami /all
echo === 2. ACL ===
icacls "%~1"
echo === 3. 共享（UNC 才需要）===
net share %~2 2>nul
```

- **令牌**：`whoami /all`——SID、组、权利；重点对比「你以为是」和「实际是」。
- **ACL**：`icacls <路径>`——看 Allow 还是 Deny，继承标志对不对。
- **共享**：`net share` 或 属性 → 共享 选项卡。

来源：[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

### 收束

**你现在会了：** 把「打不开」拆成令牌、共享、DACL、继承四层来查；五个常见症状各对应哪一层；以及为什么有效访问会骗人、为什么进组不生效、为什么同号两窗权限不同。

**下一讲才需要：** 这些排障都还在命令行手动做。真到 .NET 程序里，这套身份（WindowsIdentity、令牌）是怎么被代码表达和使用的——下一卷开讲 .NET 身份。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 29 讲：有效权限实战](./02-effective-access-practice.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 31 讲：.NET 身份](../vol6-dotnet/01-identity.md)
<!-- chapter-nav:end -->
