---
title: "附录·SDDL 速查"
sidebarGroup: "附录"
shortTitle: "SDDL"
order: 2
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 附录·SDDL 速查

### 麻烦

前面讲安全描述符时，把它拆成了四块：Owner、Group、DACL、SACL。在内存里它是个结构体，搬不动。可现实里你常会撞见它的一串字符串长相——

```
D:PAI(A;OICI;GA;;;BA)(A;OICI;GR;;;WD)
```

注册表导出、组策略的安全设置、`icacls /save` 的产物、PowerShell 脚本里赋权，到处都是这副模样。看不懂就只能照抄，改一个字母就怕改错。这一章只认这一件事：**把这串字母读成一句话**。

### 一段 SDDL 拆开看

挑一句最干净的：

```
D:PAI(A;OICI;GA;;;BA)(A;OICI;GR;;;WD)
```

从左往右切成三段：

| 片段 | 叫什么 | 说人话 |
|---|---|---|
| `D:` | DACL 头 | 这是「谁能访问」清单；`S:` 开头则是审计清单（SACL） |
| `PAI` | 控制位 | `P`=Protected 不继承父级，`AI`=Auto-Inherited 自动继承标记 |
| `(...)(...)` | 一条条 ACE | 每对括号就是一条权限条目 |

`P`（Protected）这个位最常被忽略——它一出现，父文件夹的权限就不往下灌了。这正是你在「高级安全设置」里勾掉「包括可从该对象的父项继承的权限」时发生的事。

来源：[Security Descriptor String Format](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptor-string-format)

### 一条 ACE 的六个分号

随便抽一条出来：

```
(A;OICI;GA;;;BA)
```

分号把它切成六格：

| 格 | 值 | 含义 |
|---|---|---|
| 1 | `A` | 类型：`A`=允许（Allow），`D`=拒绝（Deny） |
| 2 | `OICI` | 继承：`OI`=对象继承，`CI`=容器继承（两个一起就是「子文件 + 子文件夹都继承」） |
| 3 | `GA` | 权限（access mask），见下表 |
| 4 | 空 | 继承自谁（一般是空） |
| 5 | 空 | 只对哪类子对象生效（一般是空） |
| 6 | `BA` | 主体，见下表 |

口诀：

> **六格分号，一到三是动作，六是给谁。**  
> 第 1 格管「允许还是拒绝」，第 3 格管「能干啥」，第 6 格管「是谁」。

来源：[ACE Strings](https://learn.microsoft.com/en-us/windows/win32/secauthz/ace-strings)

**常见权限字母（access mask）**

| 字母 | 全称 | 大白话 |
|---|---|---|
| `GA` | Generic All | 全部权限 |
| `GR` | Generic Read | 读 |
| `GW` | Generic Write | 写 |
| `GX` | Generic Execute | 执行 |
| `FA` / `FR` | File All / File Read | 文件场景下的「全部」/「读」 |
| `CC` / `DC` | AD 专用 | 读子对象 / 删子对象（目录服务场景） |

前缀 `G`（Generic）是跨场景通用，`F`（File）专门给文件。

**常见主体字母（well-known SID）**

| 字母 | 指谁 | 对应 SID |
|---|---|---|
| `BA` | Builtin Administrators | S-1-5-32-544 |
| `BU` | Builtin Users | S-1-5-32-545 |
| `SY` | Local System | S-1-5-18 |
| `WD` | World / Everyone | S-1-1-0 |
| `AU` | Authenticated Users | S-1-5-11 |
| `NO` | Network | S-1-5-2 |

来源：[Well-known SIDs](https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids)

回头读开头那句，就能翻成人话了：

> 「不继承父级（`D:PAI`）；允许 Administrators 完全控制；允许 Everyone 只读。」

### 何时需要它——以及何时别碰

需要手读 SDDL 的场景：

- `icacls C:\xxx /save` 导出的 ACL 文件（纯 SDDL）；
- 注册表导出 `.reg`、GPO 的 Security 部分；
- PowerShell `Set-Acl` 批量赋权，对象来自别处、要用字符串构造；
- `sc sdshow <服务名>` 看服务的 ACL。

口诀：

> **GUI 和 icacls 能干的事，别手写 SDDL。**  
> 手写只在「拿到一串、必须读懂」时用。

来源：[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

### 怎么看见

**GUI**：文件右键 → 属性 → 安全 → 高级。每一条 ACE 对应一个括号，勾选状态对应 `OI/CI`。

**命令——icacls 已经翻译过的人话版**：

```bat
icacls C:\Windows
```

```
C:\Windows NT SERVICE\TrustedInstaller:(F)
         NT SERVICE\TrustedInstaller:(CI)(IO)(F)
         BUILTIN\Administrators:(M)
         NT AUTHORITY\SYSTEM:(M)
         BUILTIN\Users:(RX)
         NT AUTHORITY\Authenticated Users:(RX)
```

`(F)` 就是「完全控制」，`(RX)` 就是「读 + 执行」——icacls 帮你把 SDDL 翻成词了。要看原始 SDDL，加 `/save`：

```bat
icacls C:\Windows /save AclFile.txt
```

**PowerShell——SDDL ↔ 可读对象互转**：

```powershell
# 把一串 SDDL 翻译成人话
ConvertFrom-SddlString 'D:PAI(A;OICI;GA;;;BA)(A;OICI;GR;;;WD)'
```

```
Owner    Group    DiscretionaryAcl                                          SystemAcl
-----    -----    ---------------                                          ---------
S-1-5-32-544 S-1-... {System.Security.AccessControl.CommonAce, ...}         
```

反向——把现有对象的 ACL 导成 SDDL：

```powershell
(Get-Acl C:\).Sddl
```

```
O:BAG:BAD:PAI(A;OICI;FA;;;BA)(A;OICI;FA;;;SY)(A;OICI;0x1200a9;;;BU)(A;OICI;0x1200a9;;;AU)...
```

这里你看到的是**十六进制 access mask**（`0x1200a9`），不是缩写字母——两种写法等价，区别只在「泛型字母」更易读、「十六进制」更精确。`O:BA G:BA` 那两段，就是前面没单独展开的 Owner 和 Group。

来源：[ConvertFrom-SddlString](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertfrom-sddlstring)、[Get-Acl](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl)

### 收束

**你现在会了：** 把一串 SDDL 拆成「DACL 头 + 控制位 + 一堆 ACE」，每条 ACE 再按六个分号读懂「谁、能干啥、怎么继承」。  
**下一章才需要：** SDDL 只描述「这个对象允不允许访问」。要排查「到底是谁来访问、结果被拦了」——那得看安全事件日志里的**事件 ID**。

---

---

<!-- chapter-nav:start -->
← 上一章：[总图](./01-map.md)
· [回书稿索引](../00-index.md)
→ 下一章：[事件 ID](./03-event-ids.md)
<!-- chapter-nav:end -->
