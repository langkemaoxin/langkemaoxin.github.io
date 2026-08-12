---
title: "第 35 讲：Credential Guard 凭据保护"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 35 讲：Credential Guard"
order: 2
date: 2026-08-11
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "书稿"
---

# 第 35 讲：Credential Guard 凭据保护

### 麻烦

上一讲我们把密码换成了 Windows Hello 的密钥，可 LSASS 这个保险箱里**还躺着一大堆没换掉的旧凭据**：

- 你用密码登录时算出的 **NTLM hash**；
- 一堆 **Kerberos 票据**（TGT、各服务的 ST）；
- 域账号**缓存的凭据**（笔记本断网也能登公司，就靠它）。

这些东西在 LSASS 里是「**明文或可逆形态**」——因为系统自己随时要用，没法只存 hash。于是 mimikatz 一条 `sekurlsa::logonpasswords`，把整台机器当前登录的凭据全倒出来，横向移动就此开始。

### 这一讲只发明：Credential Guard——把凭据搬出攻击者够得到的地方

**先看为什么前面那一套权限模型管不住。** 第 5 讲的令牌 + DACL 访问检查，默认对 **SYSTEM / Administrator** 这类本地最高权限是放行的——这正是设计意图，否则系统自己都跑不起来。而 LSASS 本身就跑在 SYSTEM 身份下。换句话说，一个拿到内核态或 SYSTEM 权限的恶意程序，能直接读 LSASS 的内存。**DACL 是为「不同用户互相隔离」设计的，它没防「同一个最高权限身份」。**

来源：[How Credential Guard works](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/how-it-works)

**那就换地基。** Credential Guard（凭据保护）借助**基于虚拟化的安全（VBS）**——下一讲会专门讲——在 Hyper-V 虚拟层之上另起一个隔离的执行环境，内部代号叫 **LSAIso**（LSA Isolated）。它干的事就一句：

> **真正的凭据搬进 LSAIso，原来的 LSASS 退化成「前台代理」。**

原本 LSASS 既验凭据又存凭据；开了 Guard 之后，LSASS 只负责转发协议消息，**真正的 NTLM hash、Kerberos 密钥都封在 LSAIso 那块内存里**。攻击者就算把 LSASS 的内存翻个底朝天，看到的也只是代理传过来的请求，看不到真凭据——因为这两块内存根本不在同一个「世界」，中间隔着一道虚拟化硬件边界。

来源：[Credential Guard overview](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/)

口诀：

> **Guard 把凭据从「同一个内核里的抽屉」搬到了「另一个房间」。**
> **LSASS 还在那儿，但里面是空的。**

**保护范围与盲区，必须分清。** Guard 护的是「LSASS 管的那批」：

- ✅ NTLM hash、NetNTLM 凭据；
- ✅ Kerberos 票据与密钥（TGT / ST）；
- ✅ 域账号的缓存凭据、凭据管理器里的**域类**凭据。

**不管**的是「应用自己存的」——浏览器保存的网站密码、第三方软件自己加密塞在注册表或配置文件里的密钥、应用层 DPAPI 之外的自留地。这些压根不进 LSASS，Guard 自然够不着。所以开 Guard **不等于**「这台机器再也偷不到密码」。

来源：[Credential Guard](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/)

**对第 17 讲 NTLM 的影响**值得单独点一句：开了 Guard 后，LSAIso 只接受**签名过的 NTLMv2**。某些老旧的服务器还停在 NTLMv1 或不做签名协商，开了 Guard 后它们会**认证失败**——这不是 bug，是 Guard 在主动拒绝降级。这也是企业部署前必须排摸兼容性的原因。

**启用代价。** Guard 不是开关一拨就行，它要求机器先把 VBS 跑起来：

- 64 位 Windows 企业版 / 教育版 / 专业工作站版（家庭版不支持）；
- UEFI + Secure Boot；
- TPM 2.0（推荐）；
- 启用 Hyper-V 虚拟化平台。

某些驱动 / 老主板因为不兼容虚拟化会被挡在门外，所以部署前通常先跑一遍硬件就绪检查。

来源：[Credential Guard requirements](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/requirements)

### 怎么看见

**命令**——看本机 VBS / Guard 的配置与运行状态：

```powershell
Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
    Select-Object VirtualizationBasedSecurityStatus,
                  SecurityServicesConfigured, SecurityServicesRunning
```

真实输出（已启用且正在运行）：

```
VirtualizationBasedSecurityStatus : 2          # 0=关, 1=启用未运行, 2=正在运行
SecurityServicesConfigured        : {1, 2}      # 1=CredentialGuard, 2=HVCI
SecurityServicesRunning           : {1, 2}      # 实际跑起来的
```

`SecurityServicesRunning` 里有**没有 `1`**，就是 Credential Guard 到底开没开的最硬证据（光配了没跑起来不算数）。

**进程层印证**——开了 Guard 之后，系统里会多出一个 `LSAIso.exe`（挂在 System 下，普通任务管理器不一定列）。原来的 `lsass.exe` 还在，但它只是前台代理：

```powershell
Get-Process lsass, LSAIso -ErrorAction SilentlyContinue |
    Select-Object Name, Id, @{n='Mem(MB)';e={[int]($_.WS/1MB)}}
```

```
Name       Id  Mem(MB)
----       --  -------
lsass     712        8
LSAIso    944        6     # 多出这一行，说明凭据住在这里面
```

来源：[Credential Guard（验证方式）](https://learn.microsoft.com/windows/security/identity-protection/credential-guard/)

### 收束

**你现在会了：** 为什么令牌 + DACL 防不住「SYSTEM 读 LSASS」，Credential Guard 怎么用 VBS 把真凭据搬进 LSAIso、让 LSASS 退化成空壳，它护哪些凭据、不护哪些，以及对老 NTLM 的副作用。

**下一讲才需要：** Guard 全程赖以存在的「那个隔离环境」本身——VBS 和内存完整性（HVCI）到底是怎么用虚拟化、在内核之上再撑起一层边界的。地基在它身上，下一讲去拆。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 34 讲：Windows Hello](./01-windows-hello.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 36 讲：VBS 与内存完整性](./03-vbs-hvci.md)
<!-- chapter-nav:end -->
