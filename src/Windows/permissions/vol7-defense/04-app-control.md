---
title: "第 37 讲：应用控制——WDAC、AppLocker 与 Smart App Control"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 37 讲：应用控制"
order: 4
date: 2026-08-11
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "防护"
  - "书稿"
---

# 第 37 讲：应用控制——WDAC、AppLocker 与 Smart App Control

### 麻烦

上一讲用 HVCI 把内核的代码完整性护住了——内核里再难塞进一段没签名的驱动。可麻烦没完：一个**用普通用户权限**运行的恶意 exe，从头到尾没进内核，照样把你 D 盘里的文档全加密了。它在用户态、用你的令牌、干你的活——ACL 检查一路放行，因为那就是「你自己」在访问你自己的文件。

病根在于：**ACL 管的是「能访问什么数据」，管不住「能跑什么代码」。**勒索软件根本不需要提权，它只要被双击起来就够了。

### 这一讲只发明：在代码跑之前，先问一句「这玩意可信吗」

我们需要一道新的闸门，加在「镜像加载（image load）」那一刻——文件还没执行、进程还没起来，内核先验：这代码（exe / dll / 脚本）从哪来、签名是谁、内容对不对得上。验不过，直接拒绝加载。

这套机制叫**代码完整性（Code Integrity, CI）**。从它出发，Windows 长出了三种应用控制方案，强度递增、用法互补。

来源：[App Control for Business / WDAC 概览](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/)

**1. WDAC——策略最全、内核强制**

WDAC（Windows Defender Application Control，官方现称 App Control for Business）是完整版的 CI 策略。它用一张策略表规定「谁能跑」，内核在镜像加载前查这张表，查不过就拒。规则可基于三种维度：

- **发布者（Publisher）**：信任某条证书链——比如「微软签的一律放行」；
- **哈希（Hash）**：逐文件登记指纹，内容动一个字节就失效——最严也最累；
- **路径（Path）**：只允许某目录下的程序——最宽松，得配文件夹 ACL 防绕过。

Win10 1903+ 起 WDAC 支持**多策略**，可同时叠「只跑微软签名的内核驱动」「只跑白名单内应用」等多条规则，互不干扰。

来源：[WDAC 设计指南](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/app-control-design-guide)

**2. AppLocker——好上手的老大哥**

WDAC 强，但策略 XML、签名证书一把抓，运维门槛高。AppLocker 是更早、更简化的版本：按**用户或组**配规则，维度同样是「发布者 / 路径 / 哈希」，但配在 GPO 里、点点勾就行。它特别适合「财务部除了 Office 和那几个内部系统，别的 exe 都不许跑」这类场景。

来源：[AppLocker overview](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/applocker/applocker-overview)

**3. Smart App Control——开箱即用的声誉过滤**

前两种都得有人写规则。Smart App Control（Win11 22H2+）干脆帮你写好了：它用微软云的**声誉数据**（这文件全网有多少人跑过、是不是新冒出来的可疑件）结合签名校验，自动判断一个新下载的 exe 该不该放行。它默认只在**全新安装**的 Win11 设备上提供，已用了一堆软件的老机器不开——避免突然把整个软件库卡死。注意它有个硬规矩：**一旦关掉就再也开不回来**，除非重装系统。

来源：[Smart App Control](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/)

### 一句话分清三者和 ACL

口诀：

> **ACL 管数据（能不能读），应用控制管代码（能不能跑）。**  
> **WDAC 内核强制、AppLocker 配着用、Smart App Control 开箱即用。**

两道门是**互补**的：WDAC 让坏 exe 根本起不来，ACL 让即便起来了的也碰不到没权限的文件；反过来，ACL 再严，放进一段能跑的坏代码也是白搭。

### 怎么看见

**命令**——看本机 WDAC 策略（Win11 内置 `citool.exe`，21H2+）：

```bat
citool -lp
```

输出片段：

```
PolicyID        : {a5e9b3c1-7f2d-4a8e-...}
FriendlyName    : AllowMicrosoft
Version         : 1.0.0.0
IsEnforced      : True        ← True = 强制拦截，False = 仅审计
IsAuthorized    : True
IsSigned        : True
```

来源：[Managing CI policies with CiTool](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/operations/citool-commands)

**事件查看器**——被拦了去哪找：

路径：`应用程序和服务日志 → Microsoft → Windows → CodeIntegrity → Operational`

关键事件 ID：

- **3076**：审计命中（**记日志、不真拦**）——策略在 audit 模式；
- **3077**：强制命中（**真的拦了**，进程起不来）。

```
日志名称:      Microsoft-Windows-CodeIntegrity/Operational
来源:          CodeIntegrity
事件 ID:       3077
级别:          错误
说明:          %SystemRoot%\Temp\evil.exe 不允许运行。
               文件违反了代码完整性策略的签名要求。
```

刚上策略时先开**审计模式**跑几天，盯着 3076 把漏网之鱼补全，再切强制——这是 WDAC 上线的标准打法。

来源：[Code Integrity 事件 ID](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/operations/)

**AppLocker 怎么配**：`secpol.msc`（或域 GPO）→ 应用程序控制策略 → AppLocker → 三条规则集（exe / 脚本 / Windows 安装程序）各启用「已配置」，再新建规则即可。

### 收束

**你现在会了：** 为什么普通用户权限挡不住勒索（ACL 管数据不管代码）、代码完整性这道闸门加在哪、WDAC / AppLocker / Smart App Control 三种方案的分工，以及怎么用 `citool -lp` 和 3076/3077 看拦截。

**下一讲才需要：** 万一应用控制没拦住、磁盘还是被加密了怎么办——这就轮到 BitLocker 上场：它管的是**整盘数据**，就算硬盘被人拔下来挂到别的机器上，看到的也是一团看不懂的密文。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 36 讲：VBS 与内存完整性](./03-vbs-hvci.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 38 讲：BitLocker 与数据保护](./05-bitlocker.md)
<!-- chapter-nav:end -->
