---
title: "第 36 讲：VBS、HVCI 与内存完整性"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 36 讲：VBS 与内存完整性"
order: 3
date: 2026-08-11
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "书稿"
---

# 第 36 讲：VBS、HVCI 与内存完整性

### 麻烦

上一讲 Credential Guard 让 mimikatz 够不到域凭据了。但你停下来想：**凭什么？** 凭据明明就存在内存里、由内核管，攻击者要是拿到内核权限（一个有漏洞的签名驱动就够了），还有什么东西是他够不到的？

答案很残酷：在传统 Windows 里，**什么都是**。内核是系统的上帝——它能读写任意内存、关停任意进程、改写任意数据。一旦内核被攻破，杀软、凭据、日志、加密密钥，统统可以一边被攻陷一边假装正常工作。这就是所谓的「ring 0 被攻破 = 游戏结束」。这一讲要做的，是**把内核自己也关进笼子**。

### 这一讲只发明：把信任边界从「内核」上移到「Hypervisor」

#### 内核的全能性，与它的代价

x86/x64 CPU 有特权级（ring 0~3）。Windows 只用两个：ring 0 = 内核态，ring 3 = 用户态。你在 ring 3 写的程序要碰硬件、改页表，都得通过系统调用请 ring 0 代劳。

这套设计的前提是：**ring 0 是绝对可信的最高层**。问题在于，内核态里跑的代码太多了——几万个驱动，只要有几个带漏洞，攻击者写一段 shellcode 注进去，瞬间就拿到了「上帝权限」。BYOVD（Bring Your Own Vulnerable Driver）攻击就是这么干的：带一个合法签名但有漏洞的老驱动进去，借它拿到内核。

来源：[Kernel-mode and User-mode](https://learn.microsoft.com/windows/win32/sysinfo/kernel-mode-and-user-mode)

#### 发明 VBS：让内核也活在「虚拟机」里

思路朴素：**在内核之上再加一层更硬的边界**——Hypervisor（Hyper-V 虚拟化扩展，VT-x / AMD-V）。

VBS（Virtualization-Based Security，基于虚拟化的安全）做的事：

- 用 Hypervisor 划出两个**虚拟信任级（Virtual Trust Level, VTL）**：VTL0 和 VTL1；
- 你看到的那个普通 Windows 内核（NTOS）跑在 **VTL0**；
- 另外开一个极小的 **Secure Kernel（安全内核）** 跑在 **VTL1**。

VTL1 比 VTL0 能访问的资源更多。反过来，VTL0 的内核想碰 VTL1 的内存？Hypervisor 直接拒绝。

关键转变在这里：**NT 内核不再是最顶层了**。它还在 ring 0，但它头上多了个 Hypervisor，它的页表、它的内存访问，都得过 Hypervisor 这一关。攻击者就算攻破了 VTL0 的内核，也跨不进 VTL1。

来源：[Virtualization-based Security (VBS)](https://learn.microsoft.com/windows-hardware/design/device-experiences/oem-vbs)

#### HVCI：连「内核想执行新代码」都要验签名

有了 VBS 这层隔离，就能做一件以前做不到的事——**Hypervisor 接管内核代码页的执行权限**。

HVCI（Hypervisor-Protected Code Integrity，Hypervisor 保护的代码完整性）：

- 内核里所有「可执行代码页」被 Hypervisor 标记成**只读 + 可执行**；
- 内核自己想往代码页写东西？Hypervisor 拦截——内核已经改不了自己的执行权限了；
- 唯一能让内核执行新代码的途径，是经过**代码完整性（Code Integrity, CI）**验签，验过的代码才被放进「执行区」。

于是经典攻击全废了：

- 把 shellcode 写进内核某个数据页、再翻成可执行——**数据页写不进执行区**；
- 加载一个未签名 / 被篡改过的驱动——**CI 验不过**。

来源：[HVCI（内存完整性）](https://learn.microsoft.com/windows/security/threat-protection/device-guard/memory-integrity)

#### 内存完整性：HVCI 在设置界面里的名字

打开「Windows 安全中心 → 设备安全性 → 内核隔离」 → **内存完整性（Memory Integrity）**，这个开关背后就是 HVCI。

开启它有代价：

- **老驱动不兼容**：那些不守 HVCI 规矩的驱动（自己搞可写 + 可执行内存、修改核心代码页），开了之后会蓝屏或加载不上。Win11 升级前会跑一遍驱动兼容性扫描。
- **硬件要求**：64 位 CPU、支持虚拟化扩展（VT-x / AMD-V）和 SLAT（二级地址翻译）、TPM 2.0、UEFI 安全启动。现代机器基本都满足。

#### 和 Credential Guard 的关系：地与房子

把上一讲和这一讲连起来：

- **VBS 是地**——它提供了 VTL1 这块隔离的「安全土地」；
- **HVCI 是地基上的护墙**——保证内核执行的都是干净代码，防止内核被攻破；
- **Credential Guard 是盖在地上的房子**——把 LSASS 的凭据副本（Isolated LSA / LSAISO）搬进 VTL1，VTL0 的内核够不到。

所以上一讲说「Credential Guard 让内核恶意代码够不到凭据」，**前提就是这一讲的 VBS 已经把笼子搭好了**。没开 VBS，Credential Guard 根本装不进去。

来源：[Credential Guard 工作原理](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/credential-guard-how-it-works)

口诀：

> **VBS 把内核也关进笼子，信任边界从内核上移到 Hypervisor。**
> **HVCI 让内核只能执行验过签名的代码，Credential Guard 把凭据锁进 VTL1。**

### 怎么看见

**界面**：Win+R → `msinfo32` → 「系统摘要」，找这几行：

```
基于虚拟化的安全性               正在运行
基于虚拟化的安全性 - 服务        HVCI, Credential Guard
```

「正在运行」才算真正生效；「已启用但未运行」多半是 CPU 虚拟化没开或硬件不达标。

**命令**（更全的设备防护状态）：

```powershell
Get-CimInstance -ClassName Win32_DeviceGuard `
  -Namespace root\Microsoft\Windows\DeviceGuard |
  Select-Object VirtualizationBasedSecurityStatus,
                 SecurityServicesConfigured,
                 SecurityServicesRunning,
                 CodeIntegrityPolicyEnforcementStatus
```

输出：

```
VirtualizationBasedSecurityStatus     : 2
SecurityServicesConfigured            : {1, 2}
SecurityServicesRunning               : {1, 2}
CodeIntegrityPolicyEnforcementStatus  : 0
```

字段含义：

- `VirtualizationBasedSecurityStatus`：0=未启用，1=已启用未运行，**2=正在运行**；
- `SecurityServicesConfigured / Running`：**1=Credential Guard**，**2=HVCI**；两个都在 `{1,2}` 说明全开了；
- `CodeIntegrityPolicyEnforcementStatus`：0=关闭，1=审核，2=强制——这是 WDAC 的事，下一讲再讲。

### 收束

**你现在会了：** 为什么内核被攻破就全盘失守，VBS 怎么用 Hypervisor 在内核之上加一层信任边界，HVCI 怎么让内核只能执行验过签名的代码，以及它们和上一讲 Credential Guard 的「地基与房子」关系。

**下一讲才需要：** 既然内核执行的代码都验过签名了，那能不能更进一步——**白名单规定哪些程序能跑、哪些不能跑**？这就是应用控制（WDAC）。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 35 讲：Credential Guard](./02-credential-guard.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 37 讲：应用控制 WDAC](./04-app-control.md)
<!-- chapter-nav:end -->
