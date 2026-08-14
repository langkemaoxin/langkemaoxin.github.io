---
title: "第 25 讲：注册表上的 ACL"
sidebarGroup: "卷四·不只是文件"
shortTitle: "第 25 讲：注册表 ACL"
order: 1
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 25 讲：注册表上的 ACL

### 麻烦

你装完某软件，想改它写在 `HKEY_LOCAL_MACHINE\SOFTWARE\…` 下的一个启动项。regedit 一编辑，弹「无法编辑 xxx：写值时出错」；右键看权限，你是 Administrators、却只有「读取」。前 24 讲你都在跟文件打交道（外加上一讲 AdminSDHolder 那个 AD 特例），可一碰注册表，熟悉的「拒绝访问」又冒出来——它到底是不是同一套规矩？

是。注册表键也是一种**可保护对象**，门上贴的同样是安全描述符。这一讲只做一件事：把卷一在文件上发明的 DACL 模型，原样搬到注册表这棵树上，看清「哪里一样、哪里换了件衣服」。

### 这一讲只发明：注册表键上的 DACL（同一模型，换了权限位）

可保护对象不只文件。Learn 列举的清单里：文件、文件夹、**注册表键**、服务、AD 对象……每个都自带安全描述符，里面含 Owner、DACL、SACL。  
来源：[Registry Key Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights)

所以你令牌里那组 SID（第 5 讲）去敲注册表键时，逐条对表的流程和第 9、10 讲分毫不差。变的只是「权限位」的名字。

#### 25.1 对照文件 ACE：换件马甲

把第 9 讲的概念平移过来：

| 文件世界 | 注册表世界 | 说明 |
|----------|------------|------|
| 文件夹 | 键（key） | 容器，能挂 SD |
| 子文件夹 | 子键（subkey） | 也是容器，能继续套娃 |
| 文件 | 值（value） | 叶子数据，**不挂自己的 SD**，靠所在键保护 |
| 读 / 写 / 执行 | 查值 / 写值 / 建子键 | 同一组三格 ACE，权限位换了名 |

关键差别就一条：**值没有独立的安全描述符**。一个键下的所有值，共用键这一层的 DACL。所以注册表的继承，实质上只有「键 → 子键」这一条线——文件里 `(OI)` 朝值方向的那一档，这里没有对应物。

ACE 还是那三格（对谁 SID × 允许/拒绝 × 操作），用的也是同一套 ACE 结构。  
来源：[ACE（访问控制项）](https://learn.microsoft.com/en-us/windows/win32/secauthz/ace)

#### 25.2 权限位换了名字：`KEY_*` 那一组

注册表专属的权限位，文档叫 key access rights。常用的几个：

| 权限位 | 含义 |
|--------|------|
| `KEY_QUERY_VALUE` | 读取某个值的数据 |
| `KEY_SET_VALUE` | 写入 / 修改某个值 |
| `KEY_CREATE_SUB_KEY` | 在本键下创建子键 |
| `KEY_ENUMERATE_SUB_KEYS` | 列出子键名字 |
| `KEY_NOTIFY` | 接收键变更通知 |
| `KEY_CREATE_LINK` | 创建符号链接（很少用） |

另外还有所有对象通用的「标准权利」（`DELETE`、`READ_CONTROL`、`WRITE_DAC`、`WRITE_OWNER`）和组合好的 `KEY_READ` / `KEY_WRITE` / `KEY_EXECUTE` / `KEY_ALL_ACCESS`——和文件的 `GenericRead` 是一个套路。  
来源：同上 [Registry Key Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights)

口诀：

> **模型没换，只换了权限位的名字。**  
> 文件是读 / 写 / 执行；注册表是查值 / 写值 / 建子键。

#### 25.3 继承在注册表上的直觉：只有「键→子键」

第 12 讲你在文件上「发明」了五个括号。搬到注册表，因为值不挂 SD，`(OI)`（朝文件 / 值方向）基本用不上，剩下就清爽了：

| 文件里 | 注册表里 | 还在吗 |
|--------|----------|--------|
| `(I)` | 继承来的标记 | 在 |
| `(OI)` 朝文件 | （值没 SD） | **无对应** |
| `(CI)` 朝子文件夹 | 朝子键 | **主战场** |
| `(IO)` / `(NP)` | 当前键不吃 / 只传一层 | 机制一样 |

直觉一句：注册表授权，默认都是「此键及子键」——键天然是容器，传播方向只有往下生子键这一条。

还有一类键是**显式「不继承」**的，最典型 `HKLM\SAM`、`HKLM\SECURITY`——由 SYSTEM 独占，连 Administrators 默认都「读不到」。在这儿，第 6 讲的 Owner 就很关键了（下一节马上碰到）。

#### 25.4 regedit 的权限页：和文件长得一模一样

在 regedit 里右键任意键 →「权限(P)…」，弹出的对话框、按钮、Advanced 里那几个继承勾选项，跟你在文件夹「属性 → 安全」里看到的是**同一套 UI**。这不是巧合——两者背后调用的都是同一批安全描述符 API。所以卷一在文件权限页练出来的直觉（显式 vs 继承、禁用继承时复制 vs 移除、Deny 压 Allow），注册表这边直接照搬。

### 怎么看见

**界面**：`Win+R` → `regedit` → 右键某键 → 权限。

**命令**——用 PowerShell 看一个键的 DACL（注意用 `HKLM:` 这个 PSDrive）：

```powershell
Get-Acl "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" | Format-List
```

典型输出（重点看 Owner 和 Access）：

```text
Path   : Microsoft.PowerShell.Core\Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
Owner  : NT SERVICE\TrustedInstaller
Group  : NT SERVICE\TrustedInstaller
Access : NT AUTHORITY\SYSTEM Allow  FullControl
        NT SERVICE\TrustedInstaller Allow  FullControl
        BUILTIN\Administrators Allow  ReadKey
        BUILTIN\Users Allow  ReadKey
```

开头那个麻烦从哪来，一眼就看穿了：Owner 是 `TrustedInstaller`，Administrators 只有 `ReadKey`。要改这个键，普通管理员连 UAC 提权都不够，得先**取得所有权**（第 6 讲的 Owner），再给自己 `WRITE_DAC` 写一条 Allow FullControl，最后才能动值。这正是 ACL 自己设的一道坎——和卷三的 UAC 是两条独立的门。  
来源：[Get-Acl](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl)

**最小实验**——在一个无害的自建键上完整走一遍「写 ACE → 验证」（需管理员）：

```powershell
# 1. 建一个练习键
New-Item -Path "HKLM:\SOFTWARE\MyLabKey" -Force

# 2. 给当前用户授「只读」一条 Allow ACE
$acl  = Get-Acl "HKLM:\SOFTWARE\MyLabKey"
$rule = New-Object System.Security.AccessControl.RegistryAccessRule(
    "$env:USERDOMAIN\$env:USERNAME",
    [System.Security.AccessControl.RegistryRights]::ReadKey,
    "ContainerInherit",   # 朝子键继承（注册表里的默认味道）
    "None",               # 无 Propagation
    "Allow")
$acl.AddAccessRule($rule)
Set-Acl -Path "HKLM:\SOFTWARE\MyLabKey" -AclObject $acl

# 3. 验证
Get-Acl "HKLM:\SOFTWARE\MyLabKey" | Format-List Owner, Access
```

输出里能看到你那条 `Allow …ReadKey`，带 `ContainerInherit`——和第 12 讲实验 3 的 `(CI)` 是同一个东西，只不过现在落在注册表键上。

### 收束

**你现在会了：** 注册表键也是可保护对象，挂的是同一套安全描述符；DACL / ACE / 继承模型从文件原样搬过来，只是权限位换成 `KEY_QUERY_VALUE` / `KEY_SET_VALUE` / `KEY_CREATE_SUB_KEY` 这一组；值没有独立 SD，继承实质只有「键→子键」一条线；TrustedInstaller 持有的键要先夺所有权再改。

**下一讲才需要：** 把「可保护对象」的目光转向另一种系统资源——**服务（service）**。服务也有自己的安全描述符，启动 / 停止 / 配置服务，门上贴的同样是 DACL，只是权限位又要换一组名字。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 24 讲：AdminSDHolder](../vol3-rights-uac/05-adminsdholder.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 26 讲：服务权限](./02-services.md)
<!-- chapter-nav:end -->
