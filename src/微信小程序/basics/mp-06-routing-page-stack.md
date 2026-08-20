---
title: 路由与页面栈——小程序里的「浏览器历史」其实是个栈
sidebarGroup: 小程序基础
shortTitle: 06 路由与页面栈
order: 6
date: 2026-08-23T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - 路由
  - 页面栈
  - navigateTo
  - switchTab
  - EventChannel
  - 小程序入门系列
description: 小程序没有浏览器地址栏，页面靠「页面栈」管理：navigateTo 压栈、navigateBack 弹栈、上限 10 层。本篇用真实 Console 输出实锤 webview count limit exceed、tabBar 页不能 navigateTo，并讲清 query 传参与 EventChannel 回传。
---

> **小程序开发系列 · 第 6/14 篇**  
> 上一篇：[《事件系统》](/微信小程序/basics/mp-05-events)  
> 下一篇：[《生命周期》](/微信小程序/basics/mp-07-lifecycle)

---

## 开头：没有地址栏，靠什么「前进 / 后退」？

网页里你有 URL、有浏览器历史；小程序没有地址栏，用户却依然能「进详情再返回」。支撑这件事的，是一套叫**页面栈**的机制——后进先出（LIFO），和数据结构课上的栈一模一样。

本篇是系列重点篇：把五个路由 API、10 层上限、tabBar 特殊性、页面间传参一次讲透。实验环境不变（微信开发者工具 Stable 2.02.2608040，调试基础库 3.17.1），所有报错原文来自 `mp-demo-lab2` 真跑。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 页面栈 + `getCurrentPages` | Console 打出 length 一路涨 |
| **2** | 五个路由 API 各干什么 | 压栈 / 换页 / 清空 / 切 tab |
| **3** | 10 层上限 | 真实 errMsg：`webview count limit exceed` |
| **4** | tabBar 页的规矩 | `can not navigateTo a tabbar page` |
| **5** | 传参：query + EventChannel | 详情页收到 `id=42`，返回带回「回礼」 |

## 一、页面栈：后进先出的纸牌堆

框架把当前打开的页面排成一摞：

- **栈底**：通常是首页（或某个 tabBar 页）
- **栈顶**：用户正在看的页
- **`wx.navigateTo`**：新页压到栈顶，旧页还在（被藏起来）
- **`wx.navigateBack`**：栈顶弹出，露出下面那张

随时可用全局 API 偷看这摞牌：

```js
const pages = getCurrentPages()
console.log(pages.length)                 // 栈深
console.log(pages[pages.length - 1].route) // 栈顶路由，如 pages/index/index
```

> 截至 2026-08，官方口径：**页面栈最多 10 层**。再 `navigateTo` 就会失败——下面用实验实锤。

## 二、五个路由 API：对栈各自做什么

| API | 对栈的动作 | 能不能开 tabBar 页 | 典型场景 |
|-----|------------|-------------------|----------|
| `wx.navigateTo` | **压栈**（保留当前页） | ❌ | 列表 → 详情（还要返回） |
| `wx.redirectTo` | **换栈顶**（关当前、开目标，深度不变） | ❌ | 登录成功后不想让用户「返回登录页」 |
| `wx.navigateBack` | **弹栈**（`delta` 控制弹几层） | — | 详情返回、多级返回 |
| `wx.switchTab` | **切到 tabBar 页**（非 tab 页会被清掉） | ✅（只能开 tab） | 底栏「清单 / 我的」 |
| `wx.reLaunch` | **清空再开**（关掉所有页） | ✅ | 退出登录、重置到首页 |

记口诀：**要返回用 navigateTo；不要返回用 redirectTo；回首页级重置用 reLaunch；底栏用 switchTab。**

WXML 里还有声明式写法——`<navigator>` 组件，`open-type` 对应上面几种（默认等价 `navigateTo`）。逻辑层用 API、模板里用组件，效果同一套栈规则。

## 三、实验 A：带参进详情 + EventChannel 回传

首页按钮：

```js
goDetail() {
  console.log('[06] wx.navigateTo → /pages/detail/detail?id=42&from=index')
  wx.navigateTo({
    url: '/pages/detail/detail?id=42&from=index',
    events: {
      backFromDetail(data) {
        console.log('[06] index 收到详情页带回的数据：', data)
      }
    }
  })
}
```

详情页接收与回传：

```js
onLoad(options) {
  console.log('[06] detail onLoad，options =', options)
  this.setData({ query: JSON.stringify(options) })
},
backWithData() {
  const ec = this.getOpenerEventChannel()
  ec.emit('backFromDetail', { picked: '来自详情页的回礼' })
  wx.navigateBack({ delta: 1 })
}
```

> ✅ **实测**（基础库 3.17.1）：

```text
[06] wx.navigateTo → /pages/detail/detail?id=42&from=index
[07] index onHide
[06] detail onLoad，options = {id: "42", from: "index"}
[06] index 收到详情页带回的数据： {picked: "来自详情页的回礼"}
[07] index onShow
```

两件事一次看清：

1. **query 传参**：URL 里 `?id=42&from=index` → 目标页 `onLoad(options)` 收到对象（值都是**字符串**）。
2. **EventChannel 回传**：打开方在 `events` 里登记频道名；被打开方 `getOpenerEventChannel().emit(...)` 发回数据——适合「选完一项带回列表」这类场景。普通 `navigateBack` 不带 payload。

顺手注意生命周期连动：`navigateTo` 时旧页先 `onHide`，新页再 `onLoad`；`navigateBack` 后旧页再 `onShow`（不重新 `onLoad`）。下一篇 07 会把整张联动表摊开。

## 四、实验 B：压满 10 层——金子报错

自跳页每次 `navigateTo` 自己，栈深 +1：

```js
onLoad() {
  const stack = getCurrentPages()
  console.log('[06] stack 页入栈后 getCurrentPages().length =', stack.length,
    '，栈顶 route =', stack[stack.length - 1].route)
},
pushSelf() {
  wx.navigateTo({
    url: '/pages/stack/stack',
    fail: (err) => console.log('[06] navigateTo 失败，errMsg =', err.errMsg)
  })
}
```

操作要点：**慢点**。上一次转场动画没落地就连点，可能先撞上 `navigateTo:fail timeout`（转场超时），那不是上限报错。等 Console 打出 length 再点下一次。

> ✅ **实测**（基础库 3.17.1）：从首页进自跳页后 length 从 2 涨到 10，再压一层失败——

```text
[06] stack 页入栈后 getCurrentPages().length = 2 ，栈顶 route = pages/stack/stack
[06] stack 页入栈后 getCurrentPages().length = 3 ，栈顶 route = pages/stack/stack
…（4～9 省略）…
[06] stack 页入栈后 getCurrentPages().length = 10 ，栈顶 route = pages/stack/stack
[06] navigateTo 失败，errMsg = navigateTo:fail webview count limit exceed
```

报错原文就是官方 10 层上限的实锤。工程上常见防呆：

```js
if (getCurrentPages().length >= 10) {
  wx.redirectTo({ url: '/pages/foo/foo' })  // 深度不再增加
} else {
  wx.navigateTo({ url: '/pages/foo/foo' })
}
```

深链路（详情 → 确认 → 支付 → …）中间某几步改用 `redirectTo`，比事后救火干净。

## 五、实验 C：tabBar 页只能 switchTab

`app.json` 里登记了两个底栏页：

```json
"tabBar": {
  "list": [
    { "pagePath": "pages/index/index", "text": "清单" },
    { "pagePath": "pages/me/me", "text": "我的" }
  ]
}
```

故意用错 API：

```js
goMeByNavigateTo() {
  console.log('[06] 尝试 wx.navigateTo 打开 tabBar 页（预期失败）')
  wx.navigateTo({
    url: '/pages/me/me',
    fail: (err) => console.log('[06] navigateTo 失败，errMsg =', err.errMsg)
  })
},
goMeBySwitchTab() {
  wx.switchTab({ url: '/pages/me/me' })
}
```

> ✅ **实测**（基础库 3.17.1）：

```text
[06] 尝试 wx.navigateTo 打开 tabBar 页（预期失败）
[06] navigateTo 失败，errMsg = navigateTo:fail can not navigateTo a tabbar page
```

改用 `switchTab` 后成功切到「我的」：

```text
[07] index onHide
[07] me onLoad（tabBar 页，冷启动切过来才触发）
[07] me onShow
```

三条规矩记牢：

1. **tabBar 页不能用 `navigateTo` / `redirectTo` 打开**——必须 `switchTab`（或 `reLaunch`）。
2. **`switchTab` 会清掉非 tab 的页面栈**——从详情深链路直接切底栏，中间那些页回不来了。
3. **tab 页第一次被切到才 `onLoad`**；之后再切回来通常只有 `onShow`（实例还在）。这点 07 篇还会用到。

## 六、传参手段对照

| 手段 | 方向 | 容量 / 形态 | 适用 |
|------|------|-------------|------|
| URL query | A → B | 短字符串；`onLoad(options)` 收到 | id、from、简单标志 |
| `EventChannel` | A ↔ B（打开时建频道） | 任意可序列化对象 | 回传选中项、回调式交互 |
| 全局 `App.globalData` / 存储 | 任意页共享 | 持久或会话级 | 登录态、跨多页共享（11 篇再深讲 Storage） |
| 事件总线（自建） | 任意 | — | 复杂项目，本系列不展开 |

query 的坑：一切皆字符串——`options.id === 42` 是 `false`，要 `Number(options.id)` 或比较 `'42'`。

## 小结

- 小程序路由的本质是**页面栈**：`navigateTo` 压、`navigateBack` 弹、`redirectTo` 换顶、`reLaunch` 清空、`switchTab` 切 tab；
- **上限 10 层**，超限原文：`navigateTo:fail webview count limit exceed`；
- **tabBar 页**只能 `switchTab`，`navigateTo` 会报 `can not navigateTo a tabbar page`；
- 去程用 **query → onLoad(options)**，回程用 **EventChannel**；
- 连点太快可能先撞 `timeout`，测上限时等 length 日志再点。

**思考题**：

1. 从首页 `navigateTo` 详情，再 `navigateTo` 确认页，此时栈深是几？用户点左上角返回两次，会经过哪些生命周期（只答页级：Hide / Show / Unload）？
2. 为什么登录成功后常用 `redirectTo` 或 `reLaunch`，而不是 `navigateTo`？
3. 某个按钮要「打开底栏『我的』页」，你写了 `wx.navigateTo({ url: '/pages/me/me' })`，用户反馈点了没反应——Console 里最可能看到哪句 errMsg？该怎么改？

> **参考**：[页面路由](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html)｜[wx.navigateTo](https://developers.weixin.qq.com/miniprogram/dev/api/route/wx.navigateTo.html)｜[EventChannel](https://developers.weixin.qq.com/miniprogram/dev/api/route/wx.navigateTo.html)
