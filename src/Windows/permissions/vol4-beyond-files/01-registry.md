---
title: "第 25 讲：注册表上的 ACL"
sidebarGroup: "卷四·不只是文件"
shortTitle: "第 25 讲：注册表 ACL"
order: 1
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：注册表键也是可保护对象，门上贴同一套安全描述符——模型原样搬，只换权限位名字（KEY_QUERY_VALUE/SET_VALUE/CREATE_SUB_KEY）。本机实拍 Run 键 DACL、自建键写 ACE 全程；值没有独立 SD，继承只剩键→子键一条线。
---

# 第 25 讲：注册表上的 ACL

> **卷四·不只是文件（共 3 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[Registry Key Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights)。

---

## 开场

**🧑‍🏫 老师：**

你装完某软件，想改它写在 `HKLM\SOFTWARE\…` 下的一个启动项。regedit 一编辑，弹「无法编辑 xxx：写值时出错」；右键看权限——你是管理员却只有「读取」。前 24 讲都在跟文件打交道，一碰注册表，熟悉的「拒绝访问」又冒出来——它到底是不是同一套规矩？

**🧑‍🎓 学生：** 我猜是——第 11 讲说过可保护对象不止文件！

**🧑‍🏫 老师：**

正是。注册表键也是一种**可保护对象**，门上贴的同样是安全描述符（Owner/DACL/SACL 五格）。令牌里那组 SID（第 5 讲）去敲注册表键时，逐条对表的流程和第 9、10 讲分毫不差——**变的只是权限位的名字**。本讲只做一件事：把卷一在文件上发明的模型原样搬过来，看清哪里一样、哪里换了件衣服。

---

## 第 1 课：对照文件 ACE——换件马甲

| 文件世界 | 注册表世界 | 说明 |
|----------|------------|------|
| 文件夹 | 键（key） | 容器，能挂 SD |
| 子文件夹 | 子键（subkey） | 也是容器，能继续套娃 |
| 文件 | 值（value） | 叶子数据，**不挂自己的 SD**，靠所在键保护 |
| 读 / 写 / 执行 | 查值 / 写值 / 建子键 | 同一组三格 ACE，权限位换了名 |

**关键差别就一条**：值没有独立的安全描述符——一个键下的所有值共用键这层的 DACL。所以注册表的继承实质只有「键 → 子键」一条线（第 12 讲的五个括号：`(I)` 在；`(OI)` 朝值方向**无对应**——值没 SD；`(CI)` 朝子键是**主战场**；`(IO)/(NP)` 机制一样）。

注册表专属的权限位（key access rights）：

| 权限位 | 含义 |
|--------|------|
| `KEY_QUERY_VALUE` | 读某个值的数据 |
| `KEY_SET_VALUE` | 写/改某个值 |
| `KEY_CREATE_SUB_KEY` | 建子键 |
| `KEY_ENUMERATE_SUB_KEYS` | 列子键名字 |
| `KEY_NOTIFY` | 接收键变更通知 |
| `KEY_CREATE_LINK` | 建符号链接（很少用） |

外加所有对象通用的标准权利（DELETE/READ_CONTROL/WRITE_DAC/WRITE_OWNER）和组合好的 `KEY_READ`/`KEY_WRITE`/`KEY_ALL_ACCESS`——和文件的 `GenericRead` 一个套路。

> **模型没换，只换了权限位的名字。** 文件是读/写/执行；注册表是查值/写值/建子键。regedit 右键「权限」弹的对话框和文件夹「属性→安全」是**同一套 UI**——背后是同一批安全描述符 API，卷一练出的直觉（显式 vs 继承、Deny 压 Allow）直接照搬。

---

## 第 2 课：实验——Run 键的 DACL 与自建键写 ACE

**🧑‍🏫 老师：**

本机实拍开机自启动键的 DACL（真实输出）：

```powershell
PS> (Get-Acl 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run') |
       Format-List Owner,AccessToString

Owner : NT AUTHORITY\SYSTEM
BUILTIN\Users Allow  ReadKey                       ← 普通用户：只读
BUILTIN\Administrators Allow  FullControl          ← 管理员：全控
NT AUTHORITY\SYSTEM Allow  FullControl
CREATOR OWNER Allow  (继承标志)
APPLICATION PACKAGE AUTHORITY\ALL APPLICATION PACKAGES Allow ReadKey
```

开头的麻烦一眼看穿：普通用户令牌里 `Users` 只命中 `ReadKey` → 写值时 `KEY_SET_VALUE` 位不齐 → 「写值时出错」。（这台 Win10 LTSC 上该键 Owner 是 SYSTEM、管理员有 FullControl；Win11 的部分键 Owner 会是 TrustedInstaller、管理员只剩 ReadKey——那时普通提权都不够，得先按第 6 讲**夺所有权**再给自己 WRITE_DAC。同一个模型，出厂配置不同。）

再在无害的自建键上完整走一遍「写 ACE → 验证」（本机实测）：

```powershell
New-Item -Path "HKLM:\SOFTWARE\MyLabKey" -Force
$acl  = Get-Acl "HKLM:\SOFTWARE\MyLabKey"
$rule = New-Object System.Security.AccessControl.RegistryAccessRule(
    "PC3507\LabUser2",
    [System.Security.AccessControl.RegistryRights]::ReadKey,
    "ContainerInherit",    # 朝子键继承——注册表里的默认味道（= 第 12 讲的 (CI)）
    "None", "Allow")
$acl.AddAccessRule($rule)
Set-Acl -Path "HKLM:\SOFTWARE\MyLabKey" -AclObject $acl

PS> (Get-Acl 'HKLM:\SOFTWARE\MyLabKey').Access | Where IdentityReference -like '*LabUser2*'
PC3507\LabUser2 | ReadKey | ...       ← 你的 ACE 落上了
```

三格还是那三格：主体（LabUser2）× Allow × 权限位（ReadKey）——`RegistryAccessRule` 就是 `FileSystemAccessRule` 的注册表版。

**🧑‍🎓 学生：** 有没有「显式不继承」的特殊键？

**🧑‍🏫 老师：**

有，最典型 `HKLM\SAM`、`HKLM\SECURITY`——存放账户哈希和本地安全策略的蜂巢，惯例由 SYSTEM 独占、连管理员默认都读不到**内容**。本机实测一个有意思的现象：我这个会话居然能读出 SAM 键的安全描述符——原因又是卷三那条线：我的令牌里 **SeBackupPrivilege 是 Enabled** 的（备份语义绕过读取限制）。特权和对象 ACL 在注册表上照样是两套并行的规矩——卷一第 9 讲那句「DACL 不是宇宙尽头」的第 N 次回响。

---

## 收束

**你现在会了：** 注册表键也是可保护对象，挂同一套安全描述符；DACL/ACE/继承模型从文件原样搬，权限位换成 `KEY_QUERY_VALUE/SET_VALUE/CREATE_SUB_KEY` 一组；**值没有独立 SD**，继承实质只有「键→子键」；Run 键这类要写值得看令牌命中哪行 ACE（本机实拍），TrustedInstaller 持有的键要先夺所有权。

**下一讲才需要：** 把「可保护对象」的目光转向另一种系统资源——**服务**。启动/停止/配置服务，门上贴的同样是 DACL，权限位又要换一组名字。

---

<!-- chapter-nav:start -->
← 上一章：[第 24 讲：AdminSDHolder](../vol3-rights-uac/05-adminsdholder.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 26 讲：服务权限](./02-services.md)
<!-- chapter-nav:end -->
