---
title: 常用内置组件——先会查文档，再谈「原生组件」
sidebarGroup: 小程序基础
shortTitle: 09 内置组件
order: 9
date: 2026-08-26T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - 组件
  - scroll-view
  - 下拉刷新
  - 小程序入门系列
description: 小程序页面由官方内置组件搭成。本篇给一张常用组件地图，并用 scroll-view 下拉刷新的真实日志，说明「容器组件」怎么接事件；顺带提原生组件与同层渲染，避免踩 web-view / 地图类坑。
---

> **小程序开发系列 · 第 9/14 篇**  
> 上一篇：[《WXS》](/微信小程序/basics/mp-08-wxs)  
> 下一篇：[《自定义组件》](/微信小程序/basics/mp-10-custom-components)

---

## 开头：页面不是 HTML，标签是「组件」

WXML 里的 `view` / `text` / `button` 看起来像 HTML，其实是**官方内置组件**：有固定属性、事件和限制，行为以[组件文档](https://developers.weixin.qq.com/miniprogram/dev/component/)为准。本篇不背完整字典，目标是：

1. 脑中有一张「常用地图」；
2. 会查文档；
3. 亲手跑通一个容器组件：`scroll-view` 下拉刷新。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 常用组件分类地图 | 知道去哪查 |
| **2** | `scroll-view` + refresher | 下拉弹出新待办 |
| **3** | 原生组件提示 | 知道 `map`/`video`/`web-view` 特殊 |

## 一、常用组件地图（先混个脸熟）

| 类别 | 代表 | 典型用途 |
|------|------|----------|
| 视图 | `view` `text` `image` `rich-text` | 布局、文案、图片 |
| 滚动 | `scroll-view` `swiper` | 分区滚动、轮播 |
| 表单 | `input` `textarea` `switch` `picker` `form` | 录入与提交 |
| 导航 | `navigator` | 声明式跳转（对应 06 篇路由） |
| 媒体 | `video` `camera` `live-player` | 音视频（多为原生组件） |
| 开放 | `web-view` `official-account` | 内嵌 H5、关注公众号等 |
| 其他 | `canvas` `map` `progress` | 画布、地图、进度 |

查文档习惯：打开组件页 → 看**属性表**（类型 / 默认值）→ 看**事件**（`bindxxx`）→ 看**Bug & Tip**（坑最多的段落）。

## 二、实验：`scroll-view` 下拉刷新

首页 09 卡片（工具 Stable 2.02.2608040，基础库 3.17.1）：

```xml
<scroll-view
  class="todo-scroll"
  scroll-y
  refresher-enabled
  refresher-triggered="{{refreshing}}"
  bindrefresherrefresh="onScrollRefresh"
>
  <view wx:for="{{todos}}" wx:key="id" class="todo">
    <text>{{item.done ? '✓' : '○'}} {{item.text}}</text>
  </view>
</scroll-view>
```

```js
onScrollRefresh() {
  console.log('[09] scroll-view refresherrefresh 触发')
  this.setData({ refreshing: true })
  setTimeout(() => {
    const stamp = Date.now() % 100000
    const next = this.data.todos.concat({
      id: stamp,
      text: '下拉新增 #' + stamp,
      done: false
    })
    this.setData({ todos: next, refreshing: false })
    console.log('[09] 刷新完成，todos.length =', next.length)
  }, 800)
}
```

要点：

- **`scroll-y` + 固定高度**：没有高度，滚动容器撑不开，下拉手势也难触发；
- **`refresher-enabled`**：打开自定义下拉；
- **`refresher-triggered`**：受控开关——开始刷新时设 `true`，结束务必设回 `false`，否则转圈不收。

> ✅ **实测**（2026-08-20，基础库 3.17.1）：在灰色区域内下拉松开——

```text
[09] scroll-view refresherrefresh 触发
[09] 刷新完成，todos.length = 4
[11] setStorageSync 成功，条数 = 4
```

列表从 3 条变成 4 条（多了「下拉新增 #…」）。后面那行 Storage 是 11 篇的持久化钩子——刷新改了 `todos` 一并写入本地，下篇自定义组件改状态时也会走到同一条通路。

> 补充：页面级还有 `enablePullDownRefresh` + `onPullDownRefresh`（整页下拉）。分区列表用 `scroll-view` 的 refresher 更常见，整页刷新用页面配置。

## 三、原生组件与同层渲染（知道即可）

部分组件（经典如 `map`、`video`、`canvas` 旧实现、`web-view`）由客户端原生绘制，不走普通 WebView DOM，历史上会出现**层级覆盖**问题（原生组件盖住普通 `view`、fixed 失效等）。近年官方推**同层渲染**缓解，但仍建议：

- 复杂遮罩 / 弹层盖在视频、地图上时，先查该组件「原生组件」说明；
- `web-view` 几乎独占页面，和普通 WXML 混排限制很多——内嵌 H5 前先读文档。

Skyline / glass-easel（12 篇）会进一步改变渲染模型；本篇先建立「组件 ≠ HTML 标签」的直觉。

## 小结

- 内置组件有**属性 + 事件 + Tip**，以官方组件文档为源；
- `scroll-view` 下拉：`refresher-enabled` + 受控 `refresher-triggered` + 固定高度；
- 原生组件有层级特殊性，碰到再查，不必提前背；
- 「会查文档」比「背组件列表」更重要。

**思考题**：

1. 为什么给 `scroll-view` 设 `height: 280rpx` 而不是靠内容把页面撑多高？去掉高度后下拉还容易触发吗？
2. `refresher-triggered` 一直为 `true` 会怎样？谁负责把它打回 `false`？
3. 轮播图该用哪个内置组件？它和 `scroll-view` 横向滚动在交互上差在哪？

> **参考**：[组件概览](https://developers.weixin.qq.com/miniprogram/dev/component/)｜[scroll-view](https://developers.weixin.qq.com/miniprogram/dev/component/scroll-view.html)
