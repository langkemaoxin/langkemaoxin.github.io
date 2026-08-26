---
title: "第 20 讲：用户权利 ≠ 对象权限；UAC 双令牌"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 20 讲：权利与 UAC"
order: 1
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "权限"
  - "安全"
  - "UAC"
  - "对话实录"
description: 师生对话实录课：两则故事拆开两类规矩——门上没写的「用户权利」（本机 whoami /priv 实拍：SeBackupPrivilege 竟是 Enabled，坐实第 6 讲的备份之谜）和「我是管理员为何还点同意」的 UAC 双令牌；本机恰好是 UAC 关闭的「翻车 B」活标本。
---

# 第 20 讲：用户权利 ≠ 对象权限；UAC 双令牌

> **卷三·权利与 UAC（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[Appendix B](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)、[How UAC works](https://learn.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works)。

---

## 开场

**🧑‍🏫 老师：**

卷一第 9~10 讲教会你一件事：想知道能不能打开某个文件夹，就看**门上贴的规矩**（ACE/DACL）。本讲用**两则小故事**告诉你：世界上还有**门上没写的规矩**；以及「我是管理员」为什么还要点同意。

---

## 第 1 课：故事一——门上写着「禁止」，备份却成功了

**🧑‍🏫 老师：**

小王在文件服务器上维护项目目录，为防误删给自己加了条 Deny 读取（第 9 讲的办法）：

```bat
icacls E:\财务季报 /deny JZFZ\chengongyi:(OI)(CI)(R)
```

资源管理器双击——果然「拒绝访问」，连他自己都进不去。第二天夜间备份跑完，管理员问「季报备份了吗」——监控显示：**备份成功，文件都在备份盘里**。

**🧑‍🎓 学生：** 门上明明禁止他读，备份怎么还能读走？

**🧑‍🏫 老师：**

错误直觉是「所有能不能读，都只看 icacls 那张表」。一起推导：① 门上的规则管**这个文件夹**的 Access Check；② 备份程序不是「普通双击打开」那条路——它需要一种**和某个文件夹无关**的能力：被允许做备份；③ 这种能力写在**安全策略/账户权利**里，登录后出现在令牌的**特权名单**中——不是又一条 ACE。门上的 Deny 没坏，小王只是看错了「备份走的是哪套规矩」。

| 故事里的东西 | 官方常叫 |
|--------------|----------|
| 门上贴的规矩（按文件夹） | **对象权限（Permissions）** → ACE / DACL |
| 「准不准你备份/关机/当服务登录」 | **用户权利（User rights）/ 特权（privileges）** |

**特权名单亲眼可见**——本机 `whoami /priv` 实拍（节选，真实输出）：

```text
PRIVILEGES INFORMATION
Privilege Name                     Description                          State
SeSecurityPrivilege                Manage auditing and security log     Disabled
SeTakeOwnershipPrivilege           Take ownership of files or other…    Disabled
SeBackupPrivilege                  Back up files and directories        Enabled   ←！
SeRestorePrivilege                 Restore files and directories        Enabled   ←！
SeShutdownPrivilege                Shut down the system                 Disabled
SeDebugPrivilege                   Debug programs                       Enabled
SeChangeNotifyPrivilege            Bypass traverse checking             Enabled
SeImpersonatePrivilege             Impersonate a client after auth…     Enabled
SeCreateGlobalPrivilege            Create global objects                Enabled
```

三个读法：**列表里有「备份…」→ 策略上授过这项权利**（这台机器上它还是 Enabled——第 6 讲那个「icacls 读不了 ACL、Get-Acl 却能读」的谜，谜底就是它：.NET 的 Get-Acl 用 backup 语义开文件，吃到了这条特权）；**「已禁用」≠ 没有**——许多特权默认禁用、程序用时再启用（takeown 对 SeTakeOwnershipPrivilege 就是这么干的，第 6 讲）；**SeSecurityPrivilege 在名单里但 Disabled**——第 14 讲「读不回 SACL」的原因。这些特权怎么来的、怎么管，下一讲专讲；本讲**不要**练习「用备份权利读 Deny 目录」——那是攻击细节，只建地图。

> **对象权限**回答：「这个对象，你能不能怎样。」**用户权利**回答：「你的账户在这台机器上，有没有某类系统能力。」两套规矩同时存在，并不矛盾。

---

## 第 2 课：故事二——我明明是管理员，为何还要点「是」？

**🧑‍🏫 老师：**

小王的域账户进了本机 **Administrators** 组。下载开发工具双击 `setup.exe`——弹窗「是否允许此应用对设备进行更改？」；点「是」才能装。再用记事本改 `C:\Windows\System32\drivers\etc\hosts`：普通打开的记事本保存失败，右键「以管理员身份运行」再保存就成功。同一人、同一账户，半天「像管理员」，半天「像路人」。

**🧑‍🎓 学生：** 错误直觉应该是「账户在管理员组 = 我打开的每个程序都是管理员」？

**🧑‍🏫 老师：**

对。推导：若管理员一登录，浏览器、聊天软件、邮件附件**全部**带完整管理员能力，木马一点就「全权」。系统于是规定：管理员登录时先备**两张通行证**——桌面、资源管理器、普通双击的程序默认拿**权力较小**的日常票；只有你明确同意（弹窗点「是」或「以管理员身份运行」），**新进程**才拿完整管理员那张。

| 故事里的东西 | 官方常叫 |
|--------------|----------|
| 这套「默认先降权，要干重活再抬头」 | **UAC（User Account Control）** |
| 日常那张 | 标准用户令牌 / **filtered admin token**（过滤后的管理员令牌） |
| 点「是」后那张 | 管理员令牌 |

两张票差在哪（接着第 5 讲「令牌挂进程上」往下讲）：

| | 日常票 | 管理员票 |
|--|---------------------------|---------------------------|
| 谁在用 | 桌面、普通双击开的程序 | 点了「是」后的**新进程** |
| 组身份 | Administrators 常标「仅用于拒绝」 | 完整成员使用 |
| 特权名单 | 危险特权被拿掉或禁用 | 更齐、更可用 |
| 完整性级别 | **Medium** | **High** |
| 改系统目录/装软件 | 常失败 | 往往能过（仍要过对象 ACL） |

票怎么传给下一个程序：**子进程默认继承父进程的票**——explorer 挂日常票，你双击的记事本也拿日常票；「以管理员身份运行」是开了个挂管理员票的**新**进程，原来那个未提升的窗口不会自动变强。三个易误会点：① 同意提升换的是**新进程**的令牌，不是整个会话永久提权；② 「点过一次是」≠「以后所有窗口都是管理员」；③ 真正的标准用户（不在 Administrators）只有一张票，提权要输管理员密码——另一条路，先抓住「管理员双令牌」。

**UAC 能做/不做什么**：能做的是**默认降权 + 要干重活问一声 + 只给同意过的新进程管理员票**；不负责「这个文件夹谁能读」（ACE 的事）、不负责「准不准备份整盘」（用户权利的事，故事一）、不负责网上认人（票据的事）——它管的是「**本机进程什么时候许用管理员票**」，不是又一张写在文件夹上的 ACE。

---

## 第 3 课：案例——小王两窗 whoami 一模一样，hosts 也能改（本机实况）

**🧑‍🎓 学生：** 我做了对照实验：一个普通 CMD、一个「以管理员运行」的 CMD，`whoami /groups` 和 `whoami /priv` **几乎一字不差**，而且不点管理员也能改 hosts——双令牌是骗人的？

**🧑‍🏫 老师：**

多半不是理论坏了。先学会**看这扇窗揣的是哪张票**——`whoami /groups` 找两个标记：

| 找什么 | ≈ 日常票 | ≈ 管理员票 |
|--------|-------------------|---------------------|
| 强制标签（Mandatory Label） | 中（Medium，S-1-16-8192） | **高（High，S-1-16-12288）** |
| Administrators 那行的用法 | 「仅用于拒绝」 | 「已启用」 |

再看窗口标题：已提升的窗口前常带「管理员:」。

> 账户在不在 Administrators 组，回答「**有没有资格**拿管理员票」；强制标签 High 还是 Medium，回答「**眼前这个进程**实际揣的是哪张」。

**本机实测**——我这个会话的强制标签：

```text
Mandatory Label\High Mandatory Level    标签   S-1-16-12288     ← High
BUILTIN\Administrators                  别名   S-1-5-32-544     …启用的组, 组的所有者
```

**而「两窗一模一样」在本机是必然的**，因为这台机器正是文中「翻车 B」的活标本——第 1 讲查过：`EnableLUA = 0`、`ConsentPromptBehaviorAdmin = 0`，**UAC 被整个关掉了**。三种常见翻车按概率排：

- **翻车 A：两窗其实都是管理员票**——从已提升窗口里开的「普通」标签会继承管理员票（标题两边都有「管理员:」、标签两边都 High）；
- **翻车 B：UAC 被关/策略让管理员不再先降权**——日常进程也直接揣接近完整的管理员能力，对照实验的前提没了（**本机现况**：公司 IT 统一关闭了 UAC，所以我这个未点过「是」的会话就是 High + 特权 Enabled）；
- **翻车 C：其实两个都是日常票**——第二个窗口没真正弹 UAC 点「是」。

**hosts 谜题**：能改 hosts ≠ 最高权限——只说明这次写通过了「当前进程令牌 vs 该文件 ACL」的检查。常见三种故事：进程已是管理员票；UAC 关着日常就接近管理员票；或**有人改过 hosts 的 ACL**（给 Users 写权限——门上的字的事，不能反推「我整机最牛」）。

对照实验**重做版**（在 UAC 正常的机器上）：普通点开 CMD 确认标题无「管理员:」、标签「中」→ 右键以管理员运行另一个、确认标签「高」→ 再比 `/priv`、再试改 hosts。若第 2 步**根本不弹 UAC** 且普通窗口已是 High——优先怀疑终端默认提升或 UAC 已关（本机这类），而不是怀疑第 5 讲的令牌模型。

一张表收三问：

| 问题 | 怎么答 |
|------|--------|
| 我现在是什么权限？ | 看当前窗口：标题 + 强制标签中/高 + Administrators 用法 |
| 我是最高权限了么？ | 标签 High 且 Administrators 完整启用 → **当前进程**是管理员票（更高还有 SYSTEM，另讲） |
| 如何开启？ | 对新工具「以管理员身份运行」并同意 UAC；用强制标签验证提升成功 |

---

## 收束

**你现在会了：**（故事一）门上的对象权限 ≠ 账户的用户权利——本机 `whoami /priv` 里 Enabled 的 SeBackupPrivilege 坐实了第 6 讲的备份之谜；（故事二）UAC 负责「默认日常票、同意后再给新进程管理员票」，管理员组资格 ≠ 当前进程已是管理员票；（案例）用标题 + 强制标签判断当前进程的票——本机恰是 UAC 关闭（翻车 B）的活标本，两窗一致是必然而非理论失效。

**下一讲才需要：** 把故事一的「用户权利」讲透——那几十个 Se* 特权和登录权利到底怎么分配、怎么管。

---

<!-- chapter-nav:start -->
← 上一章：[第 19 讲：SPN](../vol2-identity/05-spn.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 21 讲：用户权利](./02-user-rights.md)
<!-- chapter-nav:end -->
