---
title: "WMPFDebugger——让 PC 微信小程序也能用 Chrome DevTools"
sidebarGroup: "工具"
shortTitle: "WMPFDebugger"
order: 5
date: 2026-08-19
category: "笔记"
tag:
  - "WMPFDebugger"
  - "微信小程序"
  - "Chrome DevTools"
  - "Frida"
  - "CDP"
description: 从「mitm 只能看到 mmtls 密文」说起，讲清 WMPFDebugger 是什么、如何安装、如何按正确顺序启动，以及怎样用 DevTools Network 看小程序业务接口。
---

> **相关阅读**
> - [《微信 MMTLS——抓包工具看不见的那条 80 端口连接》](/Notes/tools/wechat-mmtls)
> - [《PC 微信小程序抓包复盘：为什么「成都房小团」解不出小区单价》](/Notes/projects/wechat-miniprogram-fangxiaotuan-mitm-retrospective)
> - [《房小团运行时取数复盘：WMPFDebugger + CDP 如何读到明文，以及 Python 搜索 API》](/Notes/projects/wechat-miniprogram-fangxiaotuan-wmpfdebugger-cdp-runtime)

---

## 开头：为什么还需要这个工具？

如果你已经试过 Proxifier + mitmproxy / mitmweb 去抓 PC 微信小程序，很可能会碰到这种结果：

- 代理是通的，流量也有；
- 但请求几乎全是 `…/mmtls/…`；
- Response 里看不到小区名、单价这类业务 JSON。

根因一句话：**外层抓包拦的是微信通道；小程序业务数据往往在运行时内部才是明文。**

[WMPFDebugger](https://github.com/evi0s/WMPFDebugger) 走另一条路：在本机 **强制打开小程序远程调试**，再翻译成标准 **Chrome DevTools Protocol（CDP）**，让你用浏览器自带的开发者工具，从**程序内部**看 Network / Console。

可以把它记成：

> **WMPFDebugger = 给 PC 微信小程序开「F12」的开关 + 协议翻译器**  
> 它本身不是爬虫；看见接口之后，再谈导出、扫全。

---

## 一、它是什么（先建立正确心智模型）

| 它是 | 它不是 |
|---|---|
| Windows 上调试微信小程序（WMPF）的工具 | 房小团 / 微信官方软件 |
| 注入运行时、打通 DevTools | Proxifier / mitm 那种网络中间人 |
| 让你**看见**业务请求与响应 | 一键扫全市楼盘的爬虫 |

### 和 mitm 的差别（一张表）

| | Proxifier + mitmweb | WMPFDebugger |
|---|---|---|
| 切入点 | 进程出网流量 | 小程序运行时调试通道 |
| 典型结果 | 常见 `/mmtls/...` 密文 | 可见 `fxt-api...` 等业务 HTTPS（视小程序而定） |
| 要不要装 mitm CA | 要 | 一般不要 |
| 类比 | 在高速口拦密封货车 | 进到卸货台看已经拆开的货单 |

### 原理极简版

```text
Frida 注入 WeChatAppEx
  → 绕过「禁止外部调试」等限制
  → 微信私有远程调试协议（protobuf + WebSocket，默认 9421）
  → 翻译成标准 CDP（默认 62000）
  → 浏览器打开 inspector.html?ws=127.0.0.1:62000
```

项目 README 大意：利用开发者工具远程调试能力，patch 若干限制，使小程序支持较完整的 CDP，从而用 Chromium 系浏览器内置 DevTools 调试。

---

## 二、环境准备

### 2.1 必备

- **Windows** PC 微信（新版主程序常见为 `Weixin.exe`）
- **Node.js**：官方要求至少 **LTS v22+**（本机实战用过 v25 也可）
- **yarn**
- **Chrome 或 Edge**

检查：

```powershell
node -v
yarn -v
```

### 2.2 确认本机 WMPF 版本（很重要）

工具按 **WMPF 版本**适配，版本不对会注入失败或连不上。

1. 打开任务管理器  
2. 找到 **WeChatAppEx**  
3. 右键 → 打开文件所在的位置  
4. 看路径里这一段数字：

```text
...\RadiumWMPF\<版本号>\extracted\...
```

例如：`25297`。到 [WMPFDebugger README](https://github.com/evi0s/WMPFDebugger) 的 Support Status 里确认是否在支持列表中。

> 实战记录：`25297` 在支持列表内，且仓库主线曾有对应适配提交。

### 2.3 启动前建议关掉的东西

调试时尽量关闭，避免端口或流量干扰：

- Proxifier  
- mitmdump / mitmweb  

---

## 三、安装

### 3.1 克隆仓库

```powershell
cd C:\Users\<你的用户名>\Projects
git clone https://github.com/evi0s/WMPFDebugger.git
cd WMPFDebugger
```

### 3.2 安装依赖

```powershell
yarn
```

说明：

- 依赖里有 **frida**，首次安装可能较慢（下载/编译原生模块，十几分钟都正常）  
- `src/third-party` 中有从微信开发者工具提取的协议相关代码，版权说明见项目 README  

装完后目录里应有 `node_modules`、`src/index.ts`、`package.json` 等。

---

## 四、启动

在项目根目录执行：

```powershell
cd C:\Users\<你的用户名>\Projects\WMPFDebugger
npx ts-node src/index.ts
```

成功时终端大致会出现：

```text
[server] debug server running on ws://localhost:9421
[server] debug server waiting for miniapp to connect...
[server] proxy server running on ws://localhost:62000
[server] link: devtools://devtools/bundled/inspector.html?ws=127.0.0.1:62000
[frida] script loaded, WMPF version: 25297, pid: xxxxx
[frida] you can now open any miniapps
```

含义：

| 端口 | 作用 |
|---|---|
| **9421** | 与小程序运行时通信的调试服务（私有协议） |
| **62000** | 给浏览器用的 CDP 代理（你要连这个） |

**这个 PowerShell 窗口不要关。**

可选参数（见 `src/cli.ts`）：

```powershell
npx ts-node src/index.ts --help
# --debug-port   默认 9421
# --cdp-port     默认 62000
# --debug-main / --debug-frida  打开更详细日志
```

---

## 五、调试（标准四步，顺序不能反）

官方和实战都强调顺序：

```text
① 先启动 WMPFDebugger
② 再打开小程序
③ 最后打开浏览器 DevTools
```

反了很容易 DevTools 空白，需要重开小程序或重启第 ① 步。

### 步骤 1：确认工具已在跑

终端里已有 `you can now open any miniapps`。

### 步骤 2：打开目标小程序

1. 打开 PC 微信  
2. 打开要调试的小程序（例如「成都房小团」）  
3. 进入列表/详情页，**多操作几下、翻几页**，让网络请求产生出来  

成功连接时，工具日志里可能出现类似：

```text
[miniapp] miniapp client connected
```

### 步骤 3：打开 Chrome / Edge DevTools

地址栏**整行粘贴**回车：

```text
devtools://devtools/bundled/inspector.html?ws=127.0.0.1:62000
```

若改过 `--cdp-port`，把 `62000` 换成你的端口。

### 步骤 4：在 Network 里看业务数据

1. 打开顶部 **Network**  
2. 若列表为空：回到小程序再翻页 / 进详情刷新  
3. 过滤业务域名或路径（房小团实战中见过）：

```text
fxt-api.huanjutang.com
```

4. 点开一条请求 → **Preview / Response**  
5. 用 Ctrl+F 搜业务关键字（如小区名、单价、拿地、楼面价）

#### 看响应时注意

- 优先看 **Preview**（树状展开），不要只看乱码感的 Raw  
- 若顶层是 JSON，但 `data` 是超长无意义字符串，可能是**应用层业务加密**（工具已能抓到请求，但字段仍被小程序自己加密）——这和微信 mmtls 不是同一层  

---

## 六、实战中见过的接口形态（示例）

调试「房小团」楼盘详情时，CDP 侧曾观察到例如：

```text
GET https://fxt-api.huanjutang.com/project/home/project-basic-info?project_id=...
GET https://fxt-api.huanjutang.com/project/batch/sale-info?project_id=...
GET https://fxt-api.huanjutang.com/project/price/get-price-buckets?project_id=...
```

经验：

- **列表页接口**：适合扫「小区名 + 参考单价」  
- **详情页接口**：才更可能出现「拿地价 / 楼面价」等字段  
- 埋点域名（如 `kylin.huanjutang.com/sa`）、图片 CDN、顾问接口，一般与业务价字段无关  

具体「哪一条含拿地价」必须以你当前页面 Network 里 **Response 能搜到字段** 为准。

---

## 七、常见问题

| 现象 | 处理 |
|---|---|
| DevTools 空白 / 连不上 | 确认 `ts-node` 仍在跑；先关小程序再开；检查顺序是否反了 |
| Frida / 版本报错 | 核对 `RadiumWMPF\<版本>` 是否在支持列表；微信升级后可能要等仓库适配 |
| Network 没有请求 | 在小程序里继续操作；确认连的是小程序页而不是普通聊天 WebView |
| `yarn` 卡在 frida 很久 | 多半在拉预编译包，等即可；网络差时更明显 |
| 微信登录异常 | `Ctrl+C` 停掉调试进程，重启微信；调试期少开代理工具 |
| 换端口 | `--cdp-port` 与浏览器地址里的端口保持一致 |

检查端口是否在听：

```powershell
netstat -ano | findstr ":62000"
netstat -ano | findstr ":9421"
```

---

## 八、如何停止

1. 关掉浏览器调试页  
2. 跑着 `npx ts-node src/index.ts` 的窗口按 **Ctrl + C**  
3. 如有残留 node，可在任务管理器结束对应进程  

不需要卸载微信；Frida 注入是**运行时**行为，停掉调试进程即可结束本次会话。

---

## 九、合规与定位（写进笔记的提醒）

- 项目 README 写明偏**学习 / 研究**用途，并附免责声明  
- 仅建议在你自己有权使用的账号、本机环境上做调试观察  
- 批量拉取、绕过访问控制、破解业务加密等，不在本文范围  
- 微信升级频繁，这套方案**脆弱**，适合「摸清接口」，不适合当唯一生产数据管道  

---

## 十、最小备忘清单

```powershell
# 安装（一次）
git clone https://github.com/evi0s/WMPFDebugger.git
cd WMPFDebugger
yarn

# 每次调试
npx ts-node src/index.ts
# → 打开小程序并操作
# → 浏览器打开：
#    devtools://devtools/bundled/inspector.html?ws=127.0.0.1:62000
# → Network 里找业务 JSON
# → Ctrl+C 结束
```

---

## 结尾

WMPFDebugger 解决的是一句话问题：

> **让 PC 微信小程序变得「可被标准 DevTools 调试」。**

安装靠 Node + yarn + 版本匹配；启动靠 `npx ts-node src/index.ts`；调试靠「先工具、再小程序、最后 inspector 链接」。  
当你在 Network 里已经能稳定看到业务 JSON，下一步才是字段映射与分页导出——那是爬虫/脚本的事，不是本工具的职责。
