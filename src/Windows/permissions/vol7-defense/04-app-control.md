---
title: "第 37 讲：应用控制——WDAC、AppLocker 与 Smart App Control"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 37 讲：应用控制"
order: 4
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "应用控制"
  - "对话实录"
description: 师生对话实录课：ACL 管数据、应用控制管代码——在镜像加载那一刻先问「这玩意可信吗」。WDAC/AppLocker/Smart App Control 三档分工。本机实测：WDAC 强制中且 CodeIntegrity 日志活跃（3033×21）、AppLocker 五类规则全零且 AppIDSvc 停着、citool 需 Win11。
---

# 第 37 讲：应用控制——WDAC、AppLocker 与 Smart App Control

> **卷七·安全防护（共 5 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。本机实测 2026-08-26。官方锚点：[App Control for Business](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/)。

---

## 开场：ACL 管不住「能跑什么代码」

**🧑‍🏫 老师：**

上一讲用 HVCI 把**内核**的代码完整性护住了——内核里再难塞进没签名的驱动。可麻烦没完：一个**普通用户权限**的恶意 exe，从头到尾不进内核，照样把你 D 盘的文档全加密了。它在用户态、用**你的令牌**、干你的活——ACL 检查一路放行，因为那就是「你自己」在访问你自己的文件。

**🧑‍🎓 学生：** 病根是——**ACL 管的是「能访问什么数据」，管不住「能跑什么代码」**。勒索软件不需要提权，被双击起来就够了。

**🧑‍🏫 老师：**

对。所以需要一道新闸门，加在**镜像加载（image load）那一刻**——文件还没执行、进程还没起来，内核先验：这代码（exe/dll/脚本）从哪来、签名是谁、内容对不对。验不过，拒绝加载。这套机制叫**代码完整性（Code Integrity, CI）**，Windows 在它之上长出三种方案，强度递增、用法互补。

---

## 第 1 课：三档方案

**🧑‍🏫 老师：**

**① WDAC（Windows Defender Application Control，现称 App Control for Business）——策略最全、内核强制**。一张策略表规定「谁能跑」，内核在镜像加载前查表。三个规则维度：**发布者**（信任某条证书链——「微软签的一律放行」）；**哈希**（逐文件登记指纹，动一个字节就失效——最严也最累）；**路径**（只允许某目录——最宽松，得配文件夹 ACL 防绕过）。Win10 1903+ 支持多策略叠加。

**② AppLocker——好上手的老大哥**。按**用户或组**配规则（维度同样发布者/路径/哈希），配在 GPO 里点点勾就行，适合「财务部除了 Office 和内部系统别的 exe 都不许跑」。**关键依赖：执行要靠 AppIDSvc 服务**——待会儿实测它。

**③ Smart App Control——开箱即用的声誉过滤**（Win11 22H2+）。微软云的声誉数据 + 签名校验自动判断新下载的 exe 放不放行；只在全新安装的 Win11 上提供；**一旦关掉就开不回来**（除非重装）。

> **ACL 管数据（能不能读），应用控制管代码（能不能跑）。** 两道门互补：WDAC 让坏 exe 起不来，ACL 让起来了的碰不到没权限的文件。

---

## 第 2 课：本机实测——三种状态一台机

**🧑‍🎓 学生：** 咱这台机器上，应用控制是什么状态？

**🧑‍🏫 老师：**

四连查、四连答（全部真实输出）：

```text
=== AppIDSvc（AppLocker 的执行服务）===
Stopped                                    ← 服务停着：就算配了规则也不执行

=== AppLocker 生效策略 ===
Appx : 0 rules / Dll : 0 rules / Exe : 0 rules / Msi : 0 rules / Script : 0 rules
                                           ← 五类规则集存在但全空：没人配过

=== citool（查 WDAC 策略的新工具）===
citool not present (Win10)                 ← 需要 Win11；Win10 用事件日志和
                                             第 36 讲的 Win32_DeviceGuard 看

=== CodeIntegrity 事件日志（最近 300 条）===
 87 x EventID 3085 / 68 x EventID 3116 / 68 x EventID 3099 / 21 x EventID 3033
                                           ← 日志活跃：有 CI 策略在记录/拦截
```

判读串起来：这台机器的应用控制走的是 **WDAC 路线**（第 36 讲实测 `CodeIntegrityPolicyEnforcementStatus=2` 强制中——大概率来自 EDRSetup 那条 GPO 的终端探针），**AppLocker 路线完全没启用**（规则全空 + 执行服务停着）。日志里 21 条 3033（驱动相关事件）说明策略**不是摆设、真在管事**。

经典的事件 ID 对照（排障用）：**3076 = 审计命中**（记日志不真拦——audit 模式）；**3077 = 强制命中**（真拦了，进程起不来），事件正文会写「xxx 不允许运行，文件违反了代码完整性策略的签名要求」。**WDAC 上线的标准打法**：先审计模式跑几天、盯 3076 补全白名单、再切强制——一上来就强制，业务软件全被拦。

AppLocker 要配的话：`secpol.msc`（或域 GPO）→ 应用程序控制策略 → AppLocker → 三条规则集（exe/脚本/Windows 安装程序）各启用「已配置」再建规则——**并确认 AppIDSvc 在跑**。

---

## 收束

**你现在会了：** 为什么普通用户权限挡不住勒索（ACL 管数据不管代码）；CI 闸门加在镜像加载那一刻；WDAC/AppLocker/Smart App Control 三档分工；本机实测「WDAC 强制中 + AppLocker 空置 + citool 需 Win11」的一图流；3076/3077 事件与「先审计后强制」的上线打法。

**下一讲才需要：** 万一应用控制没拦住、磁盘还是被加密了怎么办——BitLocker 管**整盘数据**：硬盘被人拔下来挂到别的机器上，看到的也是一团密文。

---

<!-- chapter-nav:start -->
← 上一章：[第 36 讲：VBS 与内存完整性](./03-vbs-hvci.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 38 讲：BitLocker 与数据保护](./05-bitlocker.md)
<!-- chapter-nav:end -->
