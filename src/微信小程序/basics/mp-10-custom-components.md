---
title: 自定义组件——把待办项收成一块积木
sidebarGroup: 小程序基础
shortTitle: 10 自定义组件
order: 10
date: 2026-08-27T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - 自定义组件
  - properties
  - triggerEvent
  - 小程序入门系列
description: 用 Component 构造器把待办条目抽成 todo-item：properties 向下传参，triggerEvent 向上冒泡意图。本篇用真实 Console 验证「组件点一下 → 页面改列表」的闭环，并提醒不要用 id 当属性名。
---

> **小程序开发系列 · 第 10/14 篇**  
> 上一篇：[《常用内置组件》](/微信小程序/basics/mp-09-builtin-components)  
> 下一篇：[《API 与权限》](/微信小程序/basics/mp-11-api-permissions)

---

## 开头：页面不能永远平铺所有 UI

03 篇在页面里 `wx:for` 画待办；条目一多、交互一复杂（勾选、删除、滑动），WXML/JS 会膨胀。官方解法是**自定义组件**：四件套（`json/wxml/wxss/js`）+ `Component()` 构造器，对外暴露属性与事件，对内管自己的展示。

本篇把「一条待办」收成 `todo-item`，页面只负责数组状态。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 声明组件 + `usingComponents` | 页面能写 `<todo-item />` |
| **2** | `properties` 向下 | 文案、完成态由页面传入 |
| **3** | `triggerEvent` 向上 | 勾选/删除由页面改 `todos` |

## 一、组件四件套

`components/todo-item/todo-item.json`：

```json
{
  "component": true,
  "usingComponents": {}
}
```

`todo-item.js`（基础库 3.17.1 实验版）：

```js
Component({
  properties: {
    todoId: { type: Number, value: 0 },
    text: { type: String, value: '' },
    done: { type: Boolean, value: false }
  },
  methods: {
    onToggle() {
      console.log('[10] todo-item triggerEvent toggle，todoId =', this.data.todoId)
      this.triggerEvent('toggle', { id: this.data.todoId })
    },
    onRemove() {
      console.log('[10] todo-item triggerEvent remove，todoId =', this.data.todoId)
      this.triggerEvent('remove', { id: this.data.todoId })
    }
  }
})
```

```xml
<view class="item {{done ? 'done' : ''}}">
  <view class="main" bindtap="onToggle">
    <text class="mark">{{done ? '✓' : '○'}}</text>
    <text class="text">{{text}}</text>
  </view>
  <button class="del" size="mini" catchtap="onRemove">删</button>
</view>
```

删除用 **`catchtap`**：避免点「删」时事件冒泡到条目的 `bindtap` 又触发一次 toggle（05 篇的连坐问题，组件里照样成立）。

> ⚠️ **不要用 `id` 当 properties 名**：`id` 是节点保留属性，传到自定义组件时容易和组件实例 id 打架。本实验用 `todoId`，WXML 侧写 `todo-id="{{item.id}}"`（中划线转驼峰）。

## 二、页面登记与接线

`pages/index/index.json`：

```json
{
  "usingComponents": {
    "todo-item": "/components/todo-item/todo-item"
  }
}
```

```xml
<todo-item
  wx:for="{{todos}}"
  wx:key="id"
  todo-id="{{item.id}}"
  text="{{item.text}}"
  done="{{item.done}}"
  bind:toggle="onTodoToggle"
  bind:remove="onTodoRemove"
/>
```

```js
onTodoToggle(e) {
  const id = e.detail.id
  console.log('[10] 页面收到 toggle，id =', id)
  const todos = this.data.todos.map((t) => (
    t.id === id ? { id: t.id, text: t.text, done: !t.done } : t
  ))
  this.setData({ todos })
},
onTodoRemove(e) {
  const id = e.detail.id
  const todos = this.data.todos.filter((t) => t.id !== id)
  this.setData({ todos })
}
```

数据流一口说清：**属性向下、事件向上**——组件不直接改页面的 `todos`，只报告「用户想 toggle/remove 谁」；数组仍是页面的单一数据源（和 03/04 的 `setData` 模型一致）。

## 三、实测：toggle 闭环

> ✅ **实测**（2026-08-20，基础库 3.17.1）：在 10 卡片点条目切换完成态——

```text
[10] todo-item triggerEvent toggle，todoId = 3
[10] 页面收到 toggle，id = 3
[11] setStorageSync 成功，条数 = 4

[10] todo-item triggerEvent toggle，todoId = 7323
[10] 页面收到 toggle，id = 7323
[11] setStorageSync 成功，条数 = 4
```

两行 `[10]` 成对出现：先组件 `triggerEvent`，再页面 handler。`7323` 是 09 篇下拉新增那条的 id——组件对「后来才进数组」的项同样生效。`[11]` 是页面在 `setData` 后顺手持久化（下篇展开）。

## 四、再往下的能力（地图）

| 概念 | 一句话 | 何时查 |
|------|--------|--------|
| `observers` | 监听 properties/data 变化做派生 | 属性一变就要重算展示 |
| 样式隔离 | 默认组件样式不影响页面，反之亦然 | 主题/穿透失败时 |
| `slot` | 父级往组件里塞结构 | 卡片壳、布局容器 |
| `behaviors` | 多组件复用一段逻辑 | 列表项混入埋点等 |
| `selectComponent` | 页面拿到组件实例调方法 | 少数命令式场景 |

本系列先把 **properties + triggerEvent** 用熟；其余按需进官方「自定义组件」章。

## 小结

- 自定义组件 = 带边界的四件套 + `Component()`；
- **properties 向下，`triggerEvent` 向上**；页面仍是状态主人；
- 属性名避开保留字，`id` 改用 `todoId`；
- 组件内删除按钮继续用 `catchtap`，防止冒泡误触。

**思考题**：

1. 若组件内部自己 `setData` 改 `done`，不同步页面 `todos`，刷新或下拉后会发生什么？
2. `bind:toggle` 和 `bindtoggle` 写法有差别吗？（提示：自定义事件常用冒号形式）
3. 为什么删除要用 `catchtap` 而不是 `bindtap`？结合 05 篇答。

> **参考**：[自定义组件](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/)｜[Component 构造器](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Component.html)
