---
title: "房小团运行时取数复盘：WMPFDebugger + CDP 如何读到明文，以及 Python 搜索 API"
sidebarGroup: "项目与工作流"
shortTitle: "房小团 CDP 取数"
order: 24
date: 2026-08-19
category: "笔记"
tag:
  - "微信小程序"
  - "WMPFDebugger"
  - "CDP"
  - "房小团"
  - "FastAPI"
  - "Runtime.evaluate"
description: 在 mitm 解不开 mmtls / 业务包仍加密之后，改走 WMPFDebugger 打开 CDP，在小程序逻辑层调用 keywordSearch、读取 searchProjectList 明文；并封装成 Python / FastAPI 搜索接口的真实复盘。
---

> **相关阅读**
> - [《PC 微信小程序抓包复盘：为什么「成都房小团」解不出小区单价》](/Notes/projects/wechat-miniprogram-fangxiaotuan-mitm-retrospective)（路径 A：mitm 失败）
> - [《WMPFDebugger——让 PC 微信小程序也能用 Chrome DevTools》](/Notes/tools/wmpfdebugger)（工具安装与启动顺序）
> - [《微信 MMTLS——抓包工具看不见的那条 80 端口连接》](/Notes/tools/wechat-mmtls)

> **一句话结论**  
> 不要去解微信通道或业务 AES。让小程序自己请求、自己解密，再用 **CDP `Runtime.evaluate`** 从逻辑层 **`vm` / `searchProjectList` / `infoSections`** 把已经是明文的数据抄出来。  
> Python 侧封装成 `GET /search?q=小区名`，底层连的是 `ws://127.0.0.1:62000`。

---

## 一、问题从哪里来

业务目标没变：从 PC 微信「成都房小团」拿到**小区名 + 参考单价**（细节页还有**拿地价格**等）。

路径 A（mitm + Proxifier）已经复盘过：外层几乎全是 **mmtls**，装 CA 也解不出业务 JSON。

路径 B 上 WMPFDebugger 后，又踩过两类坑：

1. **Chrome `devtools://...?ws=127.0.0.1:62000`**：常显示 *The tab is inactive*，且和脚本抢 CDP 连接。
2. **只看 Network / 壳页面 DOM**：即便看见 `fxt-api.huanjutang.com/...`，响应仍可能是**业务层加密**；`page-frame.html` 壳上也几乎没有业务字段。

真正打通的路径是参考文档那条原则：

> **不解密网络包；在 appservice（逻辑层）里调用小程序自己的方法，读内存里的明文。**

---

## 二、架构心智模型（为什么 CDP 能读到明文）

可以把 PC 微信小程序理解成两层车间：

| 层 | 角色 | 你平时看见什么 |
|---|---|---|
| 渲染层 | 画 UI（webview / page-frame） | DevTools Elements 里那层壳 |
| **逻辑层（appservice）** | 跑 JS、发请求、解密、填 `data` / Vue `vm` | **明文业务对象住在这里** |

WMPFDebugger 做的事：

1. 用 Frida 等手段，按本机 **WMPF 版本偏移**，强制打开小程序远程调试；
2. 把调试通道翻译成标准 **Chrome DevTools Protocol**；
3. 在本机暴露类似：`ws://127.0.0.1:62000`。

你的脚本（Node / Python）作为 **CDP 客户端**连上去，对指定 **`contextId`（execution context）** 执行：

```text
Runtime.evaluate({
  expression: "...一段小程序逻辑层 JS...",
  contextId: <appservice 的 id>,
  returnByValue: true
})
```

关键点：

- 表达式跑在**小程序自己的 JS 环境**里，能用 `getCurrentPages`、`wx`、页面上的 `keywordSearch` / `reload`；
- 小程序内部请求后端时，**加密与解密都由它完成**；
- 你只读它放进 `vm._data` 的结果——此时已是明文。

所以这不是「破解 AES」，而是「让收银员自己算账，你只抄小票」。

```text
浏览器 / 脚本
    │  CDP WebSocket
    ▼
WMPFDebugger (:62000)
    │  调试通道
    ▼
微信 WMPF 小程序
  ├─ 渲染层（壳 DOM，业务字段少）
  └─ 逻辑层 appservice  ← Runtime.evaluate 落在这里
         ├─ keywordSearch / searchSubmit / reload
         ├─ searchProjectList（搜索明文列表）
         └─ projectInfo / infoSections（详情明文，含拿地价等）
```

---

## 三、真实打通步骤（这次怎么做成的）

### 3.1 环境前提

| 项 | 要求 |
|---|---|
| WMPFDebugger | 本机可跑，偏移匹配当前微信 WMPF（实测曾见 25297） |
| 系统代理 | **关掉 Clash 等**（否则污染 62000） |
| Chrome DevTools | **不要**同时占 `devtools://...62000` |
| 小程序 | 房小团已打开，调试器日志出现 `miniapp client connected` |

启动顺序（易错）：先开 WMPFDebugger → 再开/重开小程序 → 再连 CDP。

### 3.2 找到逻辑层 `contextId`

CDP 里有多个 execution context。只有带 `wx` + `getApp` + `getCurrentPages` 的才是 appservice。

做法：从 `contextId=1..N` 轮询一段探测表达式，挑 `ok && pages > 0` 的那个，写入 `config.local.json`。  
这次冒烟结果是 **`contextId=3`**（冷启动后会变，要重新 probe）。

### 3.3 先看「现在站在哪一页」

逻辑层：

```js
getCurrentPages()  // 页面栈
pages[i].route     // 如 subpackages/project-info/pages/index
page.$vm           // Vue 实例
```

实测详情态页面栈示例：

1. `subpackages/project/pages/index`（楼盘主页）
2. `subpackages/project-info/pages/index`（详细信息，栈顶）

全站路由表可从 `__wxConfig.pages` 读出（数百条）；**页面栈**才是当前打开了谁。

抓搜索必须尽量停在：

```text
subpackages/search/pages/result
```

也可用 `wx.navigateTo({ url: '/subpackages/search/pages/result' })` 从 CDP 切过去（本次启动 API 联调时用过）。

### 3.4 详情页：明文在 `vm` 里长什么样

在详情栈顶对 `$vm` dump，关键字段包括：

| 字段 | 含义 |
|---|---|
| `projectId` | 如 `42605` |
| `projectInfo` | 名称、tags、sections |
| **`infoSections`** | 基本信息 / 销售 / 建筑 / 物业 分行明文 |
| 方法 `reload` | 改 `projectId` 后可刷新详情 |

「城西金茂晓棠」实测 `flat` 摘录：

- 参考单价：`住宅22189-25782元/㎡`
- 拿地时间：`2025-11-20`
- 拿地价格：`13200.00元/㎡（成交楼面地价）`

这证明：**单价 / 拿地价根本不必解包，详情页内存里已有。**

### 3.5 搜索页：最大的坑——读错了列表

搜索结果页组件上同时存在：

| 字段 | 实际是什么 |
|---|---|
| `projectList` | 默认「附近/最新」流，**不是**关键词结果 |
| **`searchProjectList`** | **关键词搜索明文列表**（名字常带 HTML 高亮） |
| `showSearchProjectList` | 是否展示搜索结果 |
| `keywordSearch` | **真正触发关键词搜索**（带 debounce） |
| `searchSubmit` / `onSubmit` | 容易误触；曾把列表清空 |

错误路径（我们踩过）：

1. 只调 `searchSubmit` → `inputVal` 变了，但一直读 `projectList` → 返回一堆无关「天元府 / 土拍地块」；
2. 误调 `onSubmit` / `loadSearchData` → `searchProjectList` 被清空。

正确路径：

1. 设置 `inputVal`（以及 `params.search_data.keyword`）；
2. 调用 **`keywordSearch(关键词)`**；
3. 等待 debounce + 网络返回；
4. 采集 **`searchProjectList`**，并对 `name` 做 `stripHtml`。

「城西金茂晓棠」修复后首条即为：

| id | name | avg_price | area |
|---|---|---|---|
| 42605 | 城西金茂晓棠 | 22189-25782元/㎡ | 武侯区 |

---

## 四、Python 网站 / 接口：怎么封装的

代码已独立成仓库（见文末链接）。核心模块：

```text
fxt_api/
  config.py      # 读 config.default.json / config.local.json
  cdp.py         # WebSocket CDP 客户端（send / evaluate）
  exprs.py       # 注入逻辑层的 JS 字符串
  probe.py       # 扫描 contextId
  search.py      # search_by_name / search_by_name_async
  api_server.py  # FastAPI：/health /probe /search
  __main__.py    # CLI：python -m fxt_api 小区名
```

### 4.1 HTTP 入口

```text
uvicorn fxt_api.api_server:app --host 127.0.0.1 --port 8787
```

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/health` | 探活 |
| POST | `/probe` | 重探并保存 `contextId` |
| GET | `/search?q=小区名&max_items=50` | 返回搜索列表 JSON |

示例（URL 编码后的「锦江城市花园三期」）：

```text
http://127.0.0.1:8787/search?q=%E9%94%A6%E6%B1%9F%E5%9F%8E%E5%B8%82%E8%8A%B1%E5%9B%AD%E4%B8%89%E6%9C%9F
```

### 4.2 一次 `/search` 的完整执行流

```text
浏览器
  → FastAPI GET /search
  → load_config()（cdpUrl、contextId；缺则 auto_probe）
  → websockets.connect(ws://127.0.0.1:62000)
  → Runtime.enable
  → Runtime.evaluate(PAGE_INFO, contextId)     # 当前路由 / 是否搜索页
  → Runtime.evaluate(keywordSearch(q), ...)    # 触发小程序自己搜
  → 轮询 COLLECT_SEARCH_LIST                   # 读 searchProjectList
  → 规整为 {id,name,price,district,extra,...}
  → 关闭 CDP
  → JSON 响应
```

响应形状示意：

```json
{
  "keyword": "城西金茂晓棠",
  "route": "subpackages/search/pages/result",
  "count": 20,
  "warning": null,
  "items": [
    {
      "id": "42605",
      "name": "城西金茂晓棠",
      "price": ["22189-25782元/㎡"],
      "district": "武侯区",
      "extra": { "avg_price": ["22189-25782元/㎡"], "area": "武侯区" }
    }
  ]
}
```

### 4.3 库调用（不启 HTTP 也行）

```python
from fxt_api import search_by_name

result = search_by_name("城西金茂晓棠", max_items=50)
for item in result.items:
    print(item.id, item.name, item.extra.get("avg_price"))
```

### 4.4 和 Node 脚手架的关系

本地还有完整运行时爬虫工程 `fxt-runtime-scraper`（probe / search / fetch-detail / export-csv）。  
Python 仓库是把其中**「按名搜索列表」**抽成可独立安装、可 HTTP 调用的薄层；详情 `reload` + `infoSections` 仍可按同一 CDP 模式继续加接口。

---

## 五、失败对照表（方便以后排障）

| 现象 | 常见原因 | 处理 |
|---|---|---|
| CDP 连不上 / 超时 | 调试器没起、Clash 开着、Chrome 占 62000 | 关代理、关 DevTools、重启调试器 |
| `Cannot find context` | 冷启动后 contextId 变了 | `POST /probe` 或 `python -m fxt_api --probe` |
| 搜出来全是附近盘 / 土拍地 | 读了 `projectList`，或没调 `keywordSearch` | 读 `searchProjectList` |
| `未找到搜索组件` | 不在搜索结果页 | 打开 `search/pages/result` 或 CDP `navigateTo` |
| 详情没有拿地价 | 不在 `project-info` 或未 `reload` | 进详情页再读 `infoSections` |

---

## 六、合规与边界

- 仅用于本机已登录账号、正常浏览可见的业务信息整理。
- 依赖用户已授权运行的调试器与前台小程序，不是对公网的无登录爬虫。
- 控制频率；微信 / WMPF 升级后 Frida 偏移可能失效，需跟 WMPFDebugger 适配。
- **不要**把 `config.local.json`、账号 Cookie、抓包原文里的隐私字段推上公开仓库。

---

## 七、可复用经验（跨小程序）

1. **外层 mitm 失败 ≠ 做不了**：先问「明文落在渲染层还是逻辑层」。
2. **DevTools UI 不是唯一客户端**：任何语言实现 CDP `Runtime.evaluate` 即可。
3. **先 dump `vm` 字段名，再写采集**：这次若一开始就看到 `searchProjectList` / `keywordSearch`，能少走半天弯路。
4. **页面栈比路由表更重要**：接口行为往往绑定「当前栈顶是哪一页」。
5. **封装 API 时把前置条件写进 503 文案**：调试器、contextId、搜索页，比返回空列表更好排查。

---

## 八、产物与链接

| 产物 | 位置 |
|---|---|
| 本复盘 | `src/Notes/projects/wechat-miniprogram-fangxiaotuan-wmpfdebugger-cdp-runtime.md` |
| 工具说明 | [WMPFDebugger 笔记](/Notes/tools/wmpfdebugger) |
| mitm 失败复盘 | [房小团抓包复盘](/Notes/projects/wechat-miniprogram-fangxiaotuan-mitm-retrospective) |
| Python 搜索 API 仓库 | https://github.com/code-corey/fxt-miniprogram-search-api |

本地联调备忘：

```powershell
# 终端 A：WMPFDebugger
# 终端 B：
cd <repo>
python -m pip install -r requirements.txt
python -m fxt_api --probe
uvicorn fxt_api.api_server:app --host 127.0.0.1 --port 8787
# 浏览器：/search?q=城西金茂晓棠
```
