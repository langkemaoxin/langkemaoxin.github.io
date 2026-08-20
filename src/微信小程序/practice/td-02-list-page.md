---
title: 画出列表页——四件套渲染待办
sidebarGroup: 小程序实战
shortTitle: "02 画出列表页"
order: 2
date: 2026-09-02T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - TodoList
  - 数据绑定
  - wx:for
description: 在首页用 Page data 放下静态 todos，用 WXML 的 wx:for / wx:key 画出列表；配合简单样式，让 TodoList 第一次「看起来像个应用」。
---

> **小程序实战 · TodoList · 第 2/5 篇**  
> 上一篇：[《创建项目》](/微信小程序/practice/td-01-create-project)  
> 下一篇：[《新增与完成》](/微信小程序/practice/td-03-add-toggle)

---

## 这一球要做成什么

还不能添加、不能勾选——只要求：**打开首页能看到几条待办文案**。数据先写死在 `data` 里。

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | `data.todos` | JS 里有数组 |
| **2** | `wx:for` 列表 | 模拟器出现多行 |
| **3** | 基础样式 | 白卡片 + 间距，不像裸 HTML |

理论复习：[03 页面四件套与数据绑定](/微信小程序/basics/mp-03-page-files-databinding)。

## 一、index.js：先放假数据

```js
Page({
  data: {
    todos: [
      { id: 1, text: '读完小程序基础篇', done: true },
      { id: 2, text: '搭好 TodoList 项目', done: true },
      { id: 3, text: '实现添加与勾选', done: false }
    ]
  }
})
```

每条至少三个字段：`id`（列表 key）、`text`（展示）、`done`（完成态，下一篇才交互）。

## 二、index.wxml：绑上去

```xml
<view class="page">
  <view wx:if="{{todos.length === 0}}" class="empty">还没有待办</view>

  <view
    wx:for="{{todos}}"
    wx:key="id"
    class="item {{item.done ? 'is-done' : ''}}"
  >
    <text class="mark">{{item.done ? '✓' : '○'}}</text>
    <text class="text">{{item.text}}</text>
  </view>
</view>
```

注意：

- **`wx:key="id"`** 用稳定唯一字段，不要用 index（后面插入删除会抖）；  
- `item.done ? '✓' : '○'` 是模板里的三元，只做展示分支。

## 三、index.wxss：一点点样子

```css
.page {
  padding: 24rpx;
}

.item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.is-done .text {
  color: #999;
  text-decoration: line-through;
}

.empty {
  text-align: center;
  color: #aaa;
  padding: 80rpx 0;
}
```

单位用 **`rpx`**（基础篇讲过）：不同宽度手机按 750 设计稿缩放。

全局 `app.wxss` 可设：

```css
page {
  background-color: #f5f5f5;
  font-size: 28rpx;
  color: #333;
}
```

## 四、编译验收

点编译后应看到三条卡片，前两条带删除线（`done: true`）。改 `data` 里某一条的 `text`，再编译——界面跟着变。这证明：**账本在逻辑层，`{{}}` 在渲染层读到了同步后的数据**（详见 [04 setData](/微信小程序/basics/mp-04-dual-thread-setdata)）。

本篇还没写 `setData`：静态初始数据在 `Page` 创建时就会交给渲染层。

## 小结

- 列表 = `data` 数组 + `wx:for` + `wx:key`；  
- `done` 先只影响样式与符号；  
- 下一篇接上输入框与点击，让数组真正「动」起来。

**思考题**：如果把 `wx:key="id"` 改成 `wx:key="index"`，删除中间一项时，可能出现什么视觉或状态错乱？

> **参考**：[列表渲染](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/list.html)
