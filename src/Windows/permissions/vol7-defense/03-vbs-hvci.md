---
title: "第 36 讲：VBS、HVCI 与内存完整性"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 36 讲：VBS 与 HVCI"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "VBS"
  - "对话实录"
description: 师生对话实录课：把信任边界从内核上移到 Hypervisor——VBS 划出 VTL0/VTL1 两个虚拟信任级，HVCI 让内核只能执行验过签名的代码。本机实测：VBS 正在运行而 HVCI 未配置、CodeIntegrityPolicyEnforcementStatus=2（WDAC 强制中）的完整判读。
---

# 第 36 讲：VBS、HVCI 与内存完整性

> **卷七·安全防护（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[VBS](https://learn.microsoft.com/windows-hardware/design/device-experiences/oem-vbs)、[HVCI 内存完整性](https://learn.microsoft.com/windows/security/threat-protection/device-guard/memory-integrity)。

---

## 开场：内核被攻破 = 游戏结束？

**🧑‍🏫 老师：**

上一讲 Credential Guard 让 mimikatz 够不到域凭据了。但你停下来想：**凭什么？** 凭据明明在内存里、由内核管；攻击者拿到内核权限（一个有漏洞的签名驱动就够了），还有什么够不到？

答案很残酷：在传统 Windows 里**什么都是**。内核是系统的上帝——读写任意内存、关停任意进程、改写任意数据。内核一旦被攻破，杀软、凭据、日志、密钥统统可以一边被攻陷一边假装正常。这就是「ring 0 被攻破 = 游戏结束」。这一讲要做的是**把内核自己也关进笼子**。

**🧑‍🎓 学生：** 内核怎么会破？

**🧑‍🏫 老师：**

x64 CPU 有特权级（ring 0~3），Windows 用两个：ring 0 内核态、ring 3 用户态。设计前提是 **ring 0 绝对可信**——但内核态跑的代码太多了，几万个驱动，几个带漏洞就够攻击者注入 shellcode 拿到「上帝权限」。**BYOVD**（Bring Your Own Vulnerable Driver）攻击就这么干：带一个合法签名但有漏洞的老驱动进去借道登天。

---

## 第 1 课：发明 VBS——让内核也活在「虚拟机」里

**🧑‍🏫 老师：**

思路朴素：**在内核之上再加一层更硬的边界**——Hypervisor（VT-x/AMD-V 虚拟化扩展）。VBS 做三件事：

- 用 Hypervisor 划出两个**虚拟信任级（VTL）**：VTL0 和 VTL1；
- 你看到的普通 Windows 内核（NTOS）跑在 **VTL0**；
- 另开一个极小的 **Secure Kernel** 跑在 **VTL1**。

VTL1 比 VTL0 能访问的**更多**；反过来 VTL0 的内核想碰 VTL1 的内存，Hypervisor 直接拒绝。关键转变：**NT 内核不再是最顶层**——它还在 ring 0，但头上多了 Hypervisor，页表和内存访问都得过它这关。攻击者攻破 VTL0 的内核，也跨不进 VTL1。

**HVCI**（Hypervisor-Protected Code Integrity）在这层隔离上再加一道：内核所有「可执行代码页」被 Hypervisor 标成**只读 + 可执行**；内核自己想往代码页写东西？Hypervisor 拦截——**内核已经改不了自己的执行权限**。唯一能让内核执行新代码的途径是**代码完整性（CI）验签**。于是经典攻击全废：把 shellcode 写进数据页再翻成可执行——数据页进不了执行区；加载未签名/被篡改的驱动——CI 验不过。

**内存完整性**就是 HVCI 在设置界面里的名字（Windows 安全中心 → 设备安全性 → 内核隔离）。代价：不守规矩的老驱动（自建可写+可执行内存、改核心代码页）会蓝屏或加载不上；硬件要 64 位 + 虚拟化扩展 + SLAT + TPM 2.0 + UEFI 安全启动。

**与 Credential Guard 的关系——地与房子**：VBS 是地（VTL1 这块隔离土地）；HVCI 是护墙（内核执行的都验过签）；**Credential Guard 是盖在地上的房子**（凭据搬进 VTL1）。上一讲「内核够不到凭据」的前提就是这讲的笼子搭好了——本机的实测正好印证了这个依赖链：**VBS 在跑（地有了）、HVCI 和 CG 都没配置（墙和房都没盖）**。

> **VBS 把内核也关进笼子，信任边界从内核上移到 Hypervisor。HVCI 让内核只执行验过签的代码，Credential Guard 把凭据锁进 VTL1。**

---

## 第 2 课：本机实测判读

**🧑‍🎓 学生：** 那三个字段到底怎么读？

**🧑‍🏫 老师：**

本机完整输出与逐字段判读：

```text
VirtualizationBasedSecurityStatus    : 2    # 0=未启用 1=启用未运行 2=正在运行 ← VBS 活着
SecurityServicesConfigured           : {0}  # 没配置 CG(1)/HVCI(2) 中的任何一个
SecurityServicesRunning              : {0}  # 自然也没跑
CodeIntegrityPolicyEnforcementStatus : 2    # ← 意外之喜：WDAC 代码完整性策略在【强制】！
```

第四个字段是给下一讲的钩子：**这台机器有一套代码完整性策略在强制执行**——结合第 23 讲 gpresult 里那条 `EDRSetup` GPO，多半是终端安全探针带来的（EDR 常自带 WDAC 策略锁死自家组件）。也就是说这台机器的安全画像很「偏科」：**地基（VBS）打了、应用控制（WDAC）开着、但 HVCI 护墙和 CG 房子没盖**——同一台机器上三道防线处于三种状态，正说明「查实际状态、别假设默认」不是一句空话。

GUI 对照：`msinfo32` → 系统摘要 → 「基于虚拟化的安全性」几行——「正在运行」才算生效，「已启用但未运行」多半是 CPU 虚拟化没开或硬件不达标。

---

## 收束

**你现在会了：** 为什么内核被攻破就全盘失守；VBS 怎么用 Hypervisor 加信任边界（VTL0/VTL1）；HVCI 怎么让内核只执行验签代码（内存完整性开关）；与 Credential Guard 的「地基-护墙-房子」关系；本机三字段实测（VBS 跑着、HVCI/CG 未配、WDAC 强制中）。

**下一讲才需要：** 既然内核执行的代码都验过签名了，能不能更进一步——**白名单规定哪些程序能跑**？应用控制（WDAC/AppLocker）。

---

<!-- chapter-nav:start -->
← 上一章：[第 35 讲：Credential Guard](./02-credential-guard.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 37 讲：应用控制](./04-app-control.md)
<!-- chapter-nav:end -->
