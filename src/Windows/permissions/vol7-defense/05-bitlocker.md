---
title: "第 38 讲：BitLocker 与数据保护"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 38 讲：BitLocker"
order: 5
date: 2026-08-11
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "书稿"
---

# 第 38 讲：BitLocker 与数据保护

### 麻烦

上一讲刚把应用控制（WDAC）配好——只有签了名的程序能跑，看上去天衣无缝。可第二天有人顺手牵羊把你的笔记本塞进背包，回家把硬盘拆下来、挂到他自己机器上当从盘。这下你那套 ACL、WDAC、令牌全部失灵——**它们都得系统活着才管用，而此刻你的系统根本没在跑**。攻击者插个 Linux Live USB，或者直接挂载 NTFS，文件明明白白摊在那儿。

更阴险的是：哪怕你从没被偷过，**休眠文件 `hiberfil.sys`、页面文件 `pagefile.sys`、还有你删进回收站没清空的那堆文档**，都可能把密钥、聊天记录留在盘上。运行时权限管不到这些「尸体」。

### 这一讲只发明：把整块硬盘变成密文（BitLocker）

BitLocker 要堵的就是这一个洞——**硬盘离开这台机器，就读不出原文**。思路分两层。

**第一层：全盘加密（Full Disk Encryption）。** 加密的不是「某个文件」，而是「整个卷」。一把扇区级的对称密钥（FVEK，全卷加密密钥）把盘上所有数据搅成密文。Windows 启动时在内存里解密给你看，关机拔走盘，又变回密文。

来源：[BitLocker 概述](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/)

**第二层：TPM 绑定（Measured Boot）。** 光加密还不够——密钥总得有个地方存，存在硬盘上等于锁和钥匙放一块。BitLocker 把「解开 FVEK 的那把主密钥（VMK）」**封进主板上的 TPM 芯片**：

- TPM 是焊在主板上的密码学芯片，私钥**物理上取不出来**；
- 开机时，TPM 先校验「这台机器的启动环境」有没有被篡改——PCR 寄存器记下了从固件到启动加载器每一环的测量值；
- 一切正常，TPM 才放出 VMK，系统继续启动；
- 有人把盘拆走挂到别的机器上？**那个 TPM 不在这**，VMK 解不开，FVEK 解不开，整块盘就是一堆乱码。

来源：[受信任的平台模块概述](https://learn.microsoft.com/en-us/windows/security/information-protection/tpm/trusted-platform-module-overview)

口诀：

> **权限管「系统在跑时谁能读」，BitLocker 管「硬盘被偷走后读不出」。**  
> **锁是加密，钥匙焊死在 TPM 里。**

### 恢复密钥：TPM 也不是万无一失

TPM 会在这些时候**拒绝放密钥**：

- 主板换了、TPM 被清空；
- 某些启动配置被改（比如开了「启动前必须输 PIN」，猜错次数太多）；
- 固件更新动了 PCR 测量值。

这时你需要 **恢复密钥（Recovery Key）**——一条 48 位数字，能绕过 TPM 直接解 VMK。它**必须提前备份**，否则合法的你自己也进不去盘。三种托管方式：

- **Active Directory**：域里通过组策略自动把恢复密钥上传到计算机对象；
- **Microsoft Entra ID / 个人账户**：云加入的设备自动备份到云端；
- **文件 / 打印 / U 盘**：工作组机器最常用，存成 txt 或打印锁进保险柜。

来源：[BitLocker 恢复](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/)

### 和权限的分工：一动一静

| | 运行时权限（ACL / 令牌） | BitLocker |
|---|---|---|
| 管什么时候 | 系统在跑时 | 关机 / 拆盘后 |
| 管什么威胁 | 越权访问 | 物理盗取 |
| 失效场景 | 硬盘被挂到别处 | 系统已启动、攻击者已登录 |

两者是**纵深**，不是替代——你登录后想读同事的文件，ACL 照样拦你；小偷偷走硬盘，BitLocker 照样让他读不出。少了哪一层都漏。

### BitLocker To Go：U 盘也加密

同一套机制搬到可移动设备上叫 **BitLocker To Go**——给 U 盘、移动硬盘加全盘加密。区别在于没有固定的 TPM：插入时输密码（或智能卡）解锁，拔下后是密文。适合在 U 盘里塞合同、图纸、人事表的场景。

来源：[BitLocker To Go](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/)

### 怎么看见

**命令**——查状态（管理员命令提示符）：

```bat
manage-bde -status C:
```

输出关键字段：

```
卷 C: [OS]
    转换状态:    已完全加密
    加密百分比:  100%
    加密方法:    XTS-AES 128
    保护状态:    保护已启用
    锁定状态:    已解锁
    密钥保护程序:
        TPM
```

- **保护已启用** + **密钥保护程序: TPM** = 正常工作状态；
- 保护程序还可能是 `TPM And PIN`、`TPM And Startup Key`、`Recovery Password` 等组合。

来源：[manage-bde](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/manage-bde)

**界面**：控制面板 → 系统和安全 → BitLocker 驱动器加密——能看到每个盘的加密状态、备份恢复密钥、开关 BitLocker。

**TPM 管理器**：`tpm.msc`——看本机 TPM 是否就绪、版本、厂商；命令行用 PowerShell：

```powershell
Get-Tpm
```

```
TpmPresent      : True
TpmReady        : True
TpmEnabled      : True
TpmActivated    : True
```

来源：[Get-Tpm](https://learn.microsoft.com/en-us/powershell/module/trustedplatformmodule/get-tpm)

### 收束

**你现在会了：** 为什么 ACL 管不住「拆盘挂机」，BitLocker 怎么用全盘加密 + TPM 绑定把这层补上，恢复密钥为什么必须有、怎么托管，以及它和运行时权限一静一动的分工。卷七到这里收束——从「你是谁」（Hello）到「内存里的凭据」（Credential Guard），到「能跑什么」（WDAC），最后到「盘上的密文」（BitLocker），一条纵深防御链补全。

**下一讲才需要：** 这条链上的零件都讲完了。下一站去「总图」——把卷一到卷七所有概念拼成一张完整地图，看看它们彼此怎么咬合。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 37 讲：应用控制 WDAC](./04-app-control.md)
· [回书稿索引](../00-index.md)
→ 下一章：[总图](../appendix/01-map.md)
<!-- chapter-nav:end -->
