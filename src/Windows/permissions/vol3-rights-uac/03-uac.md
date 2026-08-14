---
title: "第 22 讲：UAC"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 22 讲：UAC"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 22 讲：UAC

### 麻烦

小王是这台机器的本地管理员——`net localgroup administrators` 里有他。可他用记事本打开 `C:\Windows\System32\drivers\etc\hosts`，改完一保存，弹窗「拒绝访问」。他顺手开了两个 cmd：一个普通、一个右键「以管理员身份运行」，各自敲 `whoami /user`，输出**一模一样**。小王糊涂了：同一个我，凭啥这个窗口改不动 hosts、那个窗口能改？

上一讲讲了**用户权利**（SeBackupPrivilege 之类），那是登记在账户名下的。但权利登记了，不代表你**此刻**拿得到——中间还隔着一道 UAC。

### 这一讲只发明：UAC 的双令牌

UAC（User Account Control，用户帐户控制）的精髓不是「弹个窗让你点确认」，那只是表象。真正的设计是这一句：

> **管理员登录后，系统默认给他一把"降权令牌"干活；只有点了「以管理员身份运行」并通过确认，才临时换回"完整令牌"。**

降权令牌叫 **filtered token（筛选令牌 / 标准令牌）**，完整令牌叫 **full / elevated token（提升令牌 / 管理员令牌）**。Vista 起引入，沿用至今。

来源：[How User Account Control works](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works)

#### 定位与能力边界

先把 UAC 管什么、不管什么划清楚，免得账算错：

- UAC **只**对「本地 **Administrators** 组成员」做令牌过滤。普通用户本来就只有一把标准令牌，UAC 对他没影响——他要装软件，照样得输管理员密码。
- UAC 改的是**令牌里组的属性和特权**，**不是**文件上的权限（ACL）。文件该给谁读还给谁读，UAC 一个字节都不碰。
- 弹窗只是触发「换令牌」的仪式；真正的安全收益来自「**默认拿着降权令牌上网、看邮件**」——恶意软件一启动就继承降权令牌，碰不动系统目录。

来源：[User Account Control Overview](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/)

#### 标准令牌 vs 管理员令牌

两把令牌的**用户 SID 完全相同**（都是小王）。区别全在三处：

| | 标准令牌（默认） | 管理员令牌（提升后） |
|---|---|---|
| Administrators 组 | **只用于拒绝**（deny only） | 启用（enabled） |
| 管理员特权（SeBackup 等） | 被剥离，根本不在令牌里 | 完整保留（多数默认禁用，用时再开） |
| 完整性级别（Mandatory Label） | Medium（S-1-16-8192） | High（S-1-16-12288） |

第一行最关键。标准令牌里 `Administrators` 这个组 SID **还在**，但被打上「只用于拒绝」标记——意思是它**只能用来匹配 Deny ACE，不能用来匹配 Allow ACE**。于是磁盘上那些「授予 Administrators 完全控制」的规则，对小王此刻的令牌**全部失效**。

第三行是另一道闸：**完整性级别**（Mandatory Integrity Control，MIC）。每个进程带一个级别（Low/Medium/High/System），每个受保护对象也带。规则很粗暴——**低级别不能写高级别**，这条先于 DACL 检查。这就是浏览器沙箱（Low）即便 DACL 允许也写不进 Program Files（Medium）的原因。

来源：[Mandatory Integrity Control](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)

口诀：

> **UAC 不改 SID，只把 Administrators 组和特权"断电"。**  
> **同一个你，标准令牌里只是个"名誉管理员"。**

#### 两窗 whoami 相同的排障故事

回到小王。他看到的「`whoami /user` 一样」是对的——用户 SID 本来就不会变。他错在**只看了 `/user`**。让他换两条命令：

- `whoami /groups` —— 看组的**属性**和完整性标签
- `whoami /priv` —— 看管理员特权还在不在

两个窗口一对照，差别立刻现形。hosts 之所以改不动，就是上表那几道闸一起作用。诊断流程一句话：**别看 `/user`，看 `/groups` 里 Administrators 的属性、看 `/priv` 里 SeBackup 们在不在。**

### 怎么看见

开两个 cmd——一个从开始菜单直接开（标准），一个右键「以管理员身份运行」（提升），标题栏会多个「管理员:」字样。

**对照两窗令牌差异**：

```bat
whoami /groups | findstr /i "Administrators Mandatory"
whoami /priv
```

标准窗口（节选）：

```
BUILTIN\Administrators              别名  S-1-5-32-544   只用于拒绝的组, 启用于默认, 启用的组
Mandatory Label\Medium Mandatory Level 标签 S-1-16-8192

（whoami /priv：管理员特权一栏全空，只剩 SeChangeNotifyPrivilege 这种普通用户也有的）
```

管理员窗口（节选，本机实测）：

```
BUILTIN\Administrators              别名  S-1-5-32-544   必需的组, 启用于默认, 启用的组, 组的所有者
Mandatory Label\High Mandatory Level 标签 S-1-16-12288

SeSecurityPrivilege          管理审核和安全日志        已禁用
SeTakeOwnershipPrivilege     取得文件或其他对象的所有权 已禁用
SeBackupPrivilege            备份文件和目录            已启用
SeRestorePrivilege           还原文件和目录            已启用
SeDebugPrivilege             调试程序                  已启用
```

注意：提升令牌里的特权多数是「已禁用」——**在不在令牌里**是 UAC 决定的，**开不开**是程序用时自己 `AdjustTokenPrivileges` 决定的。对 UAC 诊断，只看「在不在」。

**最小实验**——亲眼看 hosts 那道闸：

```bat
:: 标准窗口：失败
echo 127.0.0.1 test >> C:\Windows\System32\drivers\etc\hosts
:: 拒绝访问。

:: 管理员窗口：成功
echo 127.0.0.1 test >> C:\Windows\System32\drivers\etc\hosts
```

**看 hosts 的保护来源**（注意它没有 Mandatory Label，靠的是纯 DACL）：

```bat
icacls C:\Windows\System32\drivers\etc\hosts
```

```
  NT AUTHORITY\SYSTEM:(I)(F)            ← 完全控制
  BUILTIN\Administrators:(I)(F)         ← 完全控制，但标准令牌里这组是 deny-only，用不上
  BUILTIN\Users:(I)(RX)                 ← 只读+执行，标准令牌退到这一行
```

所以标准窗口的小王，令牌里的 Administrators「断电」→ 退回 Users 的只读 → 写失败。提权后 Administrators 通电 → 命中 (F) → 写成功。

来源：[whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami) ｜ [icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

### 收束

**你现在会了：** UAC 是管理员的「双令牌」机制——标准令牌（filtered，Administrators deny-only、管理员特权剥离、Medium）和提升令牌（full，Administrators enabled、特权齐全、High）；为什么 `whoami /user` 看不出区别，得看 `whoami /groups` 和 `/priv`；以及 hosts 那类「拒绝访问」是 DACL 叠加 deny-only 的结果。

**下一讲才需要：** 单机 UAC 默认是开的，但域里成百上千台机器，弹窗强度、谁能提权、哪些管理员被强制只拿标准令牌——这些得**集中下发**，这就是 GPO 要干的事。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 21 讲：用户权利](./02-user-rights.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 23 讲：GPO 权利分配](./04-gpo-rights.md)
<!-- chapter-nav:end -->
