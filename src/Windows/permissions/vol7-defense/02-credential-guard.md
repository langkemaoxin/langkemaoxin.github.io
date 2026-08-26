---
title: "第 35 讲：Credential Guard 凭据保护"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 35 讲：Credential Guard"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "Credential Guard"
  - "对话实录"
description: 师生对话实录课：为什么令牌+DACL 防不住「SYSTEM 读 LSASS」——DACL 为用户隔离设计，不防同一个最高权限身份。Credential Guard 用 VBS 把真凭据搬进 LSAIso、LSASS 退化成前台代理。本机实测：VBS 在跑、SecurityServicesRunning={0}——保险柜没装。
---

# 第 35 讲：Credential Guard 凭据保护

> **卷七·安全防护（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[How Credential Guard works](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/how-it-works)。

---

## 开场：LSASS 里还躺着一堆没换掉的旧凭据

**🧑‍🏫 老师：**

上一讲把密码换成了 Hello 的密钥——可 LSASS 这个保险箱里**还躺着一大堆没换掉的旧凭据**：密码登录算出的 **NTLM hash**、一堆 **Kerberos 票据**（第 16 讲 klist 里那 8 张）、域账号**缓存凭据**（断网也能登公司靠它）。这些东西在 LSASS 里是「**明文或可逆形态**」——系统自己随时要用，没法只存 hash。于是 mimikatz 一条命令，整台机器当前登录的凭据全倒出来，横向移动就此开始（第 1 讲的假想敌、第 4 讲的结构性风险）。

**🧑‍🎓 学生：** 卷一那套权限模型为什么管不住？

**🧑‍🏫 老师：**

问到了根上：第 5 讲的令牌 + DACL 访问检查，默认对 **SYSTEM/Administrator** 这类本地最高权限放行——这是设计意图，否则系统自己跑不起来；而 LSASS 就跑在 SYSTEM 身份下（第 4 讲实拍：lsass PID 488、Session 0）。换句话说，拿到 SYSTEM/内核权限的恶意程序能直接读 LSASS 内存。**DACL 是为「不同用户互相隔离」设计的，它不防「同一个最高权限身份」。**

---

## 第 1 课：换地基——把凭据搬出攻击者够得到的地方

**🧑‍🏫 老师：**

Credential Guard 借助**基于虚拟化的安全（VBS，下一讲拆）**，在 Hyper-V 虚拟层之上另起一个隔离执行环境，内部代号 **LSAIso**（LSA Isolated）。它干的事就一句：

> **真正的凭据搬进 LSAIso，原来的 LSASS 退化成「前台代理」。**

开了 Guard 后 LSASS 只转发协议消息，**真正的 NTLM hash、Kerberos 密钥封在 LSAIso 那块内存里**。攻击者把 LSASS 内存翻个底朝天，看到的也只是代理请求——两块内存不在同一个「世界」，中间隔着虚拟化硬件边界。

> **Guard 把凭据从「同一个内核里的抽屉」搬到了「另一个房间」。LSASS 还在那儿，但里面是空的。**

**保护范围与盲区必须分清**——护的是「LSASS 管的那批」：✅ NTLM hash、NetNTLM 凭据；✅ Kerberos 票据与密钥；✅ 域缓存凭据、凭据管理器里的域类凭据。**不管**「应用自己存的」——浏览器保存的网站密码、第三方软件自己加密的密钥（这些压根不进 LSASS）。所以开 Guard **不等于**「这台机器再也偷不到密码」。

**对 NTLM 的副作用**点一句：开了 Guard 后 LSAIso 只接受**签名过的 NTLMv2**——老旧服务器停在 NTLMv1 会认证失败，这不是 bug，是 Guard 主动拒绝降级（企业部署前必须排摸兼容性的原因，呼应第 17 讲）。

**启用代价**：要求先把 VBS 跑起来——64 位企业版/教育版、UEFI + Secure Boot、TPM 2.0（推荐）、Hyper-V 虚拟化平台（[requirements](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/requirements)）。

---

## 第 2 课：本机现状——保险柜装了吗？

**🧑‍🎓 学生：** 咱们这台机器呢？

**🧑‍🏫 老师：**

标准查法与真实输出：

```powershell
Get-CimInstance Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
    Select VirtualizationBasedSecurityStatus, SecurityServicesConfigured, SecurityServicesRunning
```

```text
VirtualizationBasedSecurityStatus : 2        # 2 = VBS 正在运行（地基有了！）
SecurityServicesConfigured        : {0}      # 没配置任何服务
SecurityServicesRunning           : {0}      # 1=Credential Guard, 2=HVCI——都没有
```

判读：**VBS 在跑（=2），但 Guard 没配置没运行**——「地打了、房子没盖」。进程层印证一致：系统里**没有 LSAIso.exe**（开了 Guard 才会出现这个挂在 System 下的进程），只有第 4 讲见过的 lsass（PID 488）孤零零当着全职保险箱。

**`SecurityServicesRunning` 里有没有 `1`，就是 Guard 开没开的最硬证据**（光配了没跑不算数）。结合上一讲的 TPM 缺失：这台机器连 Guard 的硬件门槛都未过——卷一第 1 讲「三道防线」检查的完整续集：LAPS 键无、UAC 关、CG 未跑、BitLocker 未开、无 TPM——**巡检就该这么一条条对**。

---

## 收束

**你现在会了：** 为什么令牌 + DACL 防不住「SYSTEM 读 LSASS」（不防同一最高权限身份）；Guard 怎么用 VBS 把真凭据搬进 LSAIso、LSASS 退化成空壳；护哪些、不护哪些；对老 NTLM 的副作用；本机现状「VBS 在跑、Guard 未装」的实测判读。

**下一讲才需要：** Guard 全程赖以存在的「那个隔离环境」本身——VBS 和 HVCI 怎么用虚拟化在内核之上再撑起一层边界。地基的事，下一讲拆。

---

<!-- chapter-nav:start -->
← 上一章：[第 34 讲：Windows Hello](./01-windows-hello.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 36 讲：VBS 与内存完整性](./03-vbs-hvci.md)
<!-- chapter-nav:end -->
