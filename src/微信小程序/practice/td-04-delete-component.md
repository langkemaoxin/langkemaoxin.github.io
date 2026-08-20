---
title: 删除与组件化——把一行收成 todo-item
sidebarGroup: 小程序实战
shortTitle: "04 删除与组件"
order: 4
date: 2026-09-04T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - TodoList
  - 自定义组件
  - triggerEvent
description: 为 TodoList 增加删除，并把单条待办抽成 todo-item 自定义组件：properties 向下传参，triggerEvent 向上通知；删除按钮用 catchtap 避免误触 toggle。
---

> **小程序实战 · TodoList · 第 4/5 篇**  
> 上一篇：[《新增与完成》](/微信小程序/practice/td-03-add-toggle)  
> 下一篇：[《持久化与收尾》](/微信小程序/practice/td-05-storage-ship)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 删除 | 点「删」少一条 |
| **2** | `todo-item` 组件 | 列表改用 `<todo-item />` |
| **3** | `catchtap` | 点删不会顺带 toggle |

理论复习：[10 自定义组件](/微信小程序/basics/mp-10-custom-components)｜[05 catch](/微信小程序/basics/mp-05-events)。

## 一、先能删（仍在页面里）

```js
onRemove(e) {
  const id = e.currentTarget.dataset.id
  const todos = this.data.todos.filter((t) => t.id !== id)
  this.setData({ todos })
}
```

按钮必须用 **`catchtap`**，否则点击会冒泡到行的 `bindtap`，先删再 toggle 或顺序错乱：

```xml
<button size="mini" catchtap="onRemove" data-id="{{item.id}}">删</button>
```

## 二、抽组件：四件套

新建 `components/todo-item/`：

**todo-item.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

**todo-item.js**

```js
Component({
  properties: {
    todoId: { type: Number, value: 0 },
    text: { type: String, value: '' },
    done: { type: Boolean, value: false }
  },
  methods: {
    onToggle() {
      this.triggerEvent('toggle', { id: this.data.todoId })
    },
    onRemove() {
      this.triggerEvent('remove', { id: this.data.todoId })
    }
  }
})
```

**不要用属性名 `id`**——易与节点 id 冲突，用 `todoId`；WXML 传参写 `todo-id="{{item.id}}"`。

**todo-item.wxml**

```xml
<view class="item {{done ? 'is-done' : ''}}">
  <view class="main" bindtap="onToggle">
    <text class="mark">{{done ? '✓' : '○'}}</text>
    <text class="text">{{text}}</text>
  </view>
  <button class="del" size="mini" catchtap="onRemove">删</button>
</view>
```

样式从页面迁入 `todo-item.wxss` 即可。

## 三、页面登记与接线

`pages/index/index.json`：

```json
{
  "usingComponents": {
    "todo-item": "/components/todo-item/todo-item"
  }
}
```

`index.wxml` 列表区改为：

```xml
<todo-item
  wx:for="{{todos}}"
  wx:key="id"
  todo-id="{{item.id}}"
  text="{{item.text}}"
  done="{{item.done}}"
  bind:toggle="onToggle"
  bind:remove="onRemove"
/>
```

页面 handler 改为读 **`e.detail.id`**（组件 `triggerEvent` 的载荷）：

```js
onToggle(e) {
  const id = e.detail.id
  const todos = this.data.todos.map((t) =>
    t.id === id ? { id: t.id, text: t.text, done: !t.done } : t
  )
  this.setData({ todos })
},
onRemove(e) {
  const id = e.detail.id
  this.setData({
    todos: this.data.todos.filter((t) => t.id !== id)
  })
}
```

数据流：**属性向下，事件向上**——组件不直接改 `todos`，页面仍是唯一数据源。

## 四、验收

1. 点条目：完成态切换；  
2. 点「删」：该行消失，且**不会**先闪一下完成态；  
3. 添加新项后，新项同样能勾能删。

成品代码见仓库 [`components/todo-item`](https://github.com/code-corey/mp-todolist/tree/master/components/todo-item)。

## 小结

- 删除用 `filter` + `setData`；按钮用 `catchtap`；  
- 自定义组件：`properties` + `triggerEvent`；  
- 下一篇把 `todos` 写入 Storage，关进程再开还在。

**思考题**：若组件内部自己 `setData({ done: true })` 而不 `triggerEvent`，刷新或重新进入页面后状态为什么会丢？（结合下一篇 Storage 想。）

> **参考**：[自定义组件](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/)
