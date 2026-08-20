---
title: WXS——渲染层里那点「不能调 wx」的小脚本
sidebarGroup: 小程序基础
shortTitle: 08 WXS
order: 8
date: 2026-08-25T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - WXS
  - 渲染层
  - setData
  - 小程序入门系列
description: WXS 跑在渲染层，适合做格式化、过滤这类「改展示、不碰业务」的运算。本篇用同一时间戳的两条刷新路径对照：只 setData 数字交给 WXS，vs 逻辑层拼好字符串再 setData——用真实 Console 说明跨线程传什么更便宜。
---

> **小程序开发系列 · 第 8/14 篇**  
> 上一篇：[《生命周期》](/微信小程序/basics/mp-07-lifecycle)  
> 下一篇：[《常用内置组件》](/微信小程序/basics/mp-09-builtin-components)

---

## 开头：为什么又要一门「半吊子 JS」？

04 篇讲过：逻辑层改展示必须 `setData`，数据要过 Native 桥。若每帧都把「已经格式化好的长字符串」推过去，桥上就会塞满重复文本。理想情况是：**逻辑层只传原始值（数字、时间戳），展示形态在渲染层本地算完**——这就是 WXS（WeiXin Script）存在的理由。

它长得像 JS，但不是完整 JS：语法接近 ES5，**不能调 `wx.*`、不能碰页面实例**，`Date` 要用 `getDate()`。别拿它写业务，只拿它写「纯展示变换」。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | WXS 模块怎么挂到 WXML | `{{fmt.datetime(nowTs)}}` 出可读时间 |
| **2** | 与逻辑层格式化对照 | 两条 tick 路径，跨线程载荷不同 |
| **3** | 能力边界 | 什么该 WXS、什么必须回逻辑层 |

## 一、挂载：一个 `.wxs` 文件

实验项目里 `utils/format.wxs`（基础库 3.17.1）：

```js
function pad(n) {
  n = n + ''
  return n.length >= 2 ? n : '0' + n
}

function datetime(ts) {
  if (ts === undefined || ts === null || ts === '') {
    return '—'
  }
  var d = getDate(+ts)   // 注意：不是 new Date
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

module.exports = {
  datetime: datetime
}
```

页面顶部引入，模板里当「本地函数」用：

```xml
<wxs src="../../utils/format.wxs" module="fmt" />
...
<view>WXS 显示：{{fmt.datetime(nowTs)}}</view>
<view>JS 显示：{{jsFormatted}}</view>
```

`module="fmt"` 决定了模板里的命名空间；`nowTs` 仍是逻辑层 `data` 里的数字——**WXS 读到的是渲染层那份已经同步过来的值**。

## 二、对照实验：传数字 vs 传字符串

两条按钮，各跑 50 次、间隔 100ms：

| 路径 | 每 tick 做什么 | 桥上主要传什么 |
|------|----------------|----------------|
| A · WXS | `setData({ nowTs: Date.now() })` | 一个数字 |
| B · JS | 逻辑层 `formatDatetimeJs` 后 `setData({ jsFormatted })` | 一整段日期字符串 |

> ✅ **实测**（2026-08-20，基础库 3.17.1）：

```text
[08] 开始 WXS 路径：每 100ms 只 setData({ nowTs })，格式化在渲染层 WXS 完成
[08] WXS 路径已 tick 10 次，跨线程只传了数字 nowTs
…（20/30/40）…
[08] WXS 路径已 tick 50 次，跨线程只传了数字 nowTs
[08] WXS 路径结束（50 次）

[08] 开始 JS 路径：每 100ms 在逻辑层 format 再 setData({ jsFormatted })
[08] JS 路径已 tick 10 次，跨线程传了完整字符串： 2026-08-20 22:46:30
…（20～40 秒在跳）…
[08] JS 路径已 tick 50 次，跨线程传了完整字符串： 2026-08-20 22:46:34
[08] JS 路径结束（50 次）
```

界面上两行时间都会动；差别在**通信载荷**：A 每次只推时间戳，字符串在渲染层拼；B 每次把 `2026-08-20 22:46:xx` 整段推过桥。列表里几百行「价格 / 时间 / 状态文案」若都在逻辑层拼好再 `setData`，就容易踩 04 篇说的体积与频率问题——WXS 是官方给的「展示侧计算器」。

## 三、能力边界（别误用）

| 能做 | 不能做 |
|------|--------|
| 格式化、简单过滤、样式相关计算 | 调 `wx.request` / `wx.navigateTo` 等任何 API |
| 在 WXML 里被 `{{}}` 调用 | `async/await`、多数 ES6+ 语法 |
| 减少「纯展示」类 setData 体积 | 替代 Page 里的业务状态机 |

高频手势（跟手拖动）也可以把一部分计算放 WXS 事件里，进一步少打桥——本系列点到为止，真要做复杂手势再查官方「WXS 响应事件」。

## 小结

- WXS = **渲染层小脚本**，服务展示变换，不是第二套业务语言；
- 典型收益：逻辑层只 `setData` 原始值，**格式化留在渲染层**；
- 语法克制：`getDate`、偏 ES5、**禁止 `wx.*`**；
- 和 04 篇同一条军规：跨线程传的越少越好。

**思考题**：

1. 把「待办是否完成」显示成「已完成 / 未完成」文案，用 WXS 还是逻辑层 `setData` 更合适？为什么？
2. WXS 里能写 `wx.setStorageSync` 吗？若不能，状态持久化应该放在哪一层？
3. 列表 200 条，每条都要显示相对时间（「3 分钟前」），每分钟刷新一次——你更倾向 WXS 还是整表 `setData`？代价各是什么？

> **参考**：[WXS 语法参考](https://developers.weixin.qq.com/miniprogram/dev/reference/wxs/)｜[WXS 事件](https://developers.weixin.qq.com/miniprogram/dev/framework/view/interactive-animation.html)
