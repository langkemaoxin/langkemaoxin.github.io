---
title: 新增与完成——让待办真正可交互
sidebarGroup: 小程序实战
shortTitle: "03 新增与完成"
order: 3
date: 2026-09-03T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - TodoList
  - setData
  - input
description: 为 TodoList 加上输入框与添加按钮，用 setData 追加条目；点击条目切换 done。讲清 draft 受控输入、空内容校验，以及为什么必须 setData 而不能只改 this.data。
---

> **小程序实战 · TodoList · 第 3/5 篇**  
> 上一篇：[《画出列表页》](/微信小程序/practice/td-02-list-page)  
> 下一篇：[《删除与组件化》](/微信小程序/practice/td-04-delete-component)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 输入框 + 添加 | 能往列表末尾加一条 |
| **2** | 点击切换完成 | ○ / ✓ 与删除线互换 |
| **3** | 空串拦截 | 空白添加会 toast，不插入 |

理论复习：[04 setData](/微信小程序/basics/mp-04-dual-thread-setdata)｜[05 事件](/微信小程序/basics/mp-05-events)。

## 一、草稿字段与输入

`data` 增加 `draft`：

```js
data: {
  draft: '',
  todos: [ /* … */ ]
},
onDraftInput(e) {
  this.setData({ draft: e.detail.value })
},
```

```xml
<input
  value="{{draft}}"
  placeholder="写下一件小事…"
  confirm-type="done"
  bindinput="onDraftInput"
  bindconfirm="onAdd"
/>
<button size="mini" type="primary" bindtap="onAdd">添加</button>
```

`value="{{draft}}"` + `bindinput` 里 `setData`，形成**受控输入**：逻辑层始终握有当前字符串。键盘「完成」走 `bindconfirm`，与按钮共用 `onAdd`。

## 二、添加：concat + setData

```js
onAdd() {
  const text = (this.data.draft || '').trim()
  if (!text) {
    wx.showToast({ title: '先写点内容', icon: 'none' })
    return
  }
  const todos = this.data.todos.concat({
    id: Date.now(),
    text,
    done: false
  })
  this.setData({ todos, draft: '' })
}
```

要点：

- **`trim()`** 拒绝纯空格；  
- **新数组**再 `setData`，别只 `push` 而不 `setData`（界面不会更新）；  
- `id` 用 `Date.now()` 足够教程用（并发极低）；成品里可再加随机后缀防极端碰撞。

## 三、勾选：map 出新数组

先给每一行加点击（下一篇会改成组件事件）：

```xml
<view
  wx:for="{{todos}}"
  wx:key="id"
  class="item {{item.done ? 'is-done' : ''}}"
  data-id="{{item.id}}"
  bindtap="onToggle"
>
  …
</view>
```

```js
onToggle(e) {
  const id = e.currentTarget.dataset.id
  const todos = this.data.todos.map((t) =>
    t.id === id ? { id: t.id, text: t.text, done: !t.done } : t
  )
  this.setData({ todos })
}
```

`data-id` → `dataset.id`（中划线转驼峰规则见基础篇 05）。用 `map` 返回新数组，保持「一次 setData 换整表」的简单模型。

## 四、常见坑

| 现象 | 原因 | 处理 |
|------|------|------|
| 点了添加没变化 | 只改了 `this.data` | 必须 `setData` |
| 输入框不同步 | 只绑了 `value` 没 `bindinput` | 补 `onDraftInput` |
| 点了没反应 | handler 名拼错 | Console 会有警告 |
| id 全是 undefined | `data-id` 写成了 `id` | 自定义数据用 `data-*` |

## 小结

- 添加 = 校验 → 新数组 → `setData({ todos, draft: '' })`；  
- 勾选 = `dataset.id` → `map` 翻转 `done` → `setData`；  
- 下一篇把「删」补上，并把一行抽成自定义组件。

**思考题**：为什么推荐 `concat` / `map` 出新数组，而不是 `this.data.todos.push(...)` 再 `setData({ todos: this.data.todos })`？（两问：可读性；以及引用是否变化。）

> **参考**：[input](https://developers.weixin.qq.com/miniprogram/dev/component/input.html)｜[事件](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxml/event.html)
