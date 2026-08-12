---
title: "附录·实验室搭建清单"
sidebarGroup: "附录"
shortTitle: "实验室"
order: 4
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 附录·实验室搭建清单

> 这是给全书的「实验场」一次性搭好。后面每讲到 DACL、令牌、UAC、委派……都直接在这个沙箱里动手，不再每次重建。

整本书的「怎么看见」几乎都靠命令 + 真实输出。但很多命令（建账号、改 ACL、提权、改组策略）会在机器上留下痕迹——你在自己的工作机上随手跑一遍 `net user hacker /add`，登录界面就多出一个用户，同事一看就紧张。所以这一章把**实验沙箱怎么搭**一次说清：本机目录约定、测试账号、可选的最小域、以及几条不能碰的安全红线。

## 一、本机 Lab 目录约定

### 一句话约定

> **所有动手操作都在 `C:\Lab` 下做，绝不在 `C:\Users` 或系统目录里乱建文件。**

`C:\Lab` 是全书的实验根。它不属于任何用户的个人目录，方便统一备份和清理，也方便对照书里的路径——后面看到 `C:\Lab\secret.txt`，你就知道这是我们约定的样例。

### 建目录 + 三个样例对象

以管理员身份打开 PowerShell：

```powershell
New-Item -ItemType Directory -Path C:\Lab -Force | Out-Null
'公开资料，谁都能看'   | Set-Content C:\Lab\public.txt
'只有老板能看'         | Set-Content C:\Lab\boss-only.txt
'演示继承的子文件夹'   | New-Item -ItemType Directory C:\Lab\sub | Out-Null
```

这三个对象后面会反复用来演示「允许 / 拒绝 / 继承」。

来源：[New-Item](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item)

### 建两个测试账号 + 一个本地组

```bat
net user LabUser1 "P@ssw0rd1" /add
net user LabUser2 "P@ssw0rd2" /add
net localgroup LabReaders /add
net localgroup LabReaders LabUser1 /add
```

- `LabUser1` 属于 `LabReaders` 组——后面演示「组授权」时用它；
- `LabUser2` 不在任何组里——演示「默认拒绝」时用它。

来源：[net user](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/net-user) · [net localgroup](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/net-localgroup)

> 口诀：**一个组里的人、一个组外的人。** 后面 90% 的「允许 / 拒绝」实验都用这两人对照。

## 二、可选：最小域实验（DC 一台）

讲到第 8 讲「组策略」、第 12 讲「委派」、第 18 讲「Kerberos」时，光有本机账号不够，得有一台域控。**但这是可选的**——本机实验足以覆盖卷一、卷二的全部内容；要不要搭域，等你读到那几讲再决定。

### 准备一台虚机

去微软评估中心下 Windows Server 评估版（180 天免费，足够学完这本书），在 Hyper-V 里建一台虚机。

来源：[Windows Server 评估版](https://www.microsoft.com/evalcenter/evaluate-windows-server)

### 一行命令提升为域控

在虚机里以管理员跑：

```powershell
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
$sm = Read-Host -AsSecureString   # 输入一个目录服务还原模式密码
Install-ADDSForest -DomainName lab.local -InstallDNS -SafeModeAdministratorPassword $sm
```

重启后这台就是 `lab.local` 的域控。再建两个域用户：

```powershell
New-ADUser -Name Alice -AccountPassword (Read-Host -AsSecureString) -Enabled $true
New-ADUser -Name Bob   -AccountPassword (Read-Host -AsSecureString) -Enabled $true
```

来源：[Install-ADDSForest](https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsforest) · [New-ADUser](https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-aduser)

### 立刻拍一个「干净」检查点

域装好后**马上拍 Hyper-V 检查点**，命名 `lab-clean`。后面把组策略、委派、Kerberos 玩坏了，一条命令回滚：

```powershell
Restore-VMSnapshot -VMName DC -Name lab-clean
```

来源：[Restore-VMSnapshot](https://learn.microsoft.com/en-us/powershell/module/hyper-v/restore-vmsnapshot)

## 三、安全红线（请认真读）

| 红线 | 为什么 |
|---|---|
| **绝不在生产机上做实验** | `net user /add`、`icacls /deny`、`gpupdate` 都改真机器状态，回滚困难 |
| **绝不用真实域账号练委派** | 第 12 讲会动 `msDS-AllowedToDelegateTo`，写错可能影响生产登录 |
| **域实验虚机断开外网** | `lab.local` 是假域名，放公网会被真 DNS 抢答，也可能被扫描 |
| **拍检查点再动手** | 这是 Hyper-V 的「后悔药」，比任何脚本还原都快 |

> 口诀：**虚机 + 检查点 + 假账号。** 三件套齐了，再大胆动手。

## 清单汇总（照抄即可）

```text
[ ] C:\Lab 建好，含 public.txt / boss-only.txt / sub\
[ ] 本地账号 LabUser1、LabUser2 建好
[ ] 本地组 LabReaders 建好，且只含 LabUser1
[ ] （可选）域控虚机 lab.local，已拍 lab-clean 检查点
[ ] （可选）域用户 Alice、Bob 建好
```

照这张清单一项项勾完，全书实验的「场地」就齐了。实验中途卡壳、想查某个命令的完整参数或某条微软文档，翻下一章「参考」。

---

---

<!-- chapter-nav:start -->
← 上一章：[事件 ID](./03-event-ids.md)
· [回书稿索引](../00-index.md)
→ 下一章：[参考](./05-references.md)
<!-- chapter-nav:end -->
