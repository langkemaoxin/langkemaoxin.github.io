---
title: 画出列表页——数组是怎么长成一排卡片的
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
description: 首页还空着，本篇让它第一次「看起来像个应用」：在 data 里设计 todos 数组的三个字段，用 wx:for / wx:key 把数组渲染成卡片列表，配 rpx 样式与空态占位。全程以「界面 = f(数据)」为主线，最后用 automator 注入数据实录证明改数组界面就变。
---

> **小程序实战 · TodoList · 第 2/5 篇**  
> 上一篇：[《创建项目》](/微信小程序/practice/td-01-create-project)  
> 下一篇：[《新增与完成》](/微信小程序/practice/td-03-add-toggle)

---

## 开头：屏幕上还什么都没有

工程跑起来了，`App onLaunch` 的日志也打了，但首页依然是一块空白。TodoList 的第一屏是什么？——**一排待办行**：左边一个勾选符号，右边一段文字，完成的那几条划着删除线。

现在的难题是：待办的条数用户说了算，可能 0 条可能 100 条，WXML 是写死的模板，怎么画出「不确定条数」的列表？

如果你读过基础篇 [03](/微信小程序/basics/mp-03-page-files-databinding)，答案已经在手里：**界面 = f(数据)**。WXML 是模板，`data` 是自变量——模板只写「一行长什么样」，行数由数组长度决定。本篇就把这个心智模型第一次落到真实产品上，顺便做三个决定：

| 雪球 | 这一球加上去的 | 验收标准 |
|------|----------------|----------|
| **1** | `data.todos` 数据结构 | 三个字段各司其职，说得出为什么 |
| **2** | `wx:for` 列表渲染 | 数组变成屏幕上的卡片行 |
| **3** | 样式与空态 | 卡片 + rpx + 「还没有待办」占位 |

先说清本篇的一个教学约定：**数据先写死**。真实产品里待办来自用户输入（第 3 篇）并存在 Storage 里（第 5 篇），本篇在 `data` 里放三条假数据，是为了先把「渲染」这一层单独跑通——一次只验证一件事。

## 一、先定数据：三个字段的取舍

```js
// pages/index/index.js
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

为什么是这三个字段，而不是随便一个字符串数组 `['aaa', 'bbb']`？

| 字段 | 类型 | 用在哪 | 没有它会怎样 |
|------|------|--------|--------------|
| `id` | Number | `wx:key` 的身份证；第 3、4 篇里事件的定位目标 | 列表一增删就状态错乱 |
| `text` | String | 模板展示 | —— |
| `done` | Boolean | 控制勾选符号与删除线样式 | 完成态无从谈起 |

字段设计是数据层的产品决策：**渲染要用的、交互要用的，一个不多一个不少**。教程里常见的 `status: 0/1` 数字状态、`createTime` 时间戳，对这个最小产品暂时用不上，等用到再加（第 5 篇会加一个派生统计）。

## 二、再写模板：wx:for 四个关键位

```xml
<!-- pages/index/index.wxml -->
<view class="page">
  <view wx:if="{{todos.length === 0}}" class="empty">还没有待办，在上面添加一条吧</view>

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

逐个拆：

| 写法 | 是什么 | 易错点 |
|------|--------|--------|
| `wx:for="{{todos}}"` | 遍历数组，循环体内 `item` 是当前项 | 别忘了 `{{}}`，写 `wx:for="todos"` 是纯字符串 |
| `wx:key="id"` | 告诉框架每项的身份证字段，diff 时复用未变节点 | 用 `index` 等于身份证天天换，插入删除会抖（基础篇 03 有实验） |
| `class="item {{item.done ? ...}}"` | 三元拼 class，完成态换样式 | 三元里引号嵌套容易写崩，照抄这个形状 |
| `wx:if="{{todos.length === 0}}"` | 空态占位 | 条件和 `wx:for` 是**并列**的两个节点，不是 else 关系 |

注意空态文案「还没有待办，在上面添加一条吧」——「上面」指的是第 3 篇才加的输入区。跟做到本篇时可以先写短一点，没关系。

## 三、补样式：白卡片与 rpx

`pages/index/index.wxss`：

```css
.item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
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
  font-size: 28rpx;
}
```

全局 `app.wxss` 顺带铺个底色：

```css
page {
  background-color: #f5f5f5;
  font-size: 28rpx;
  color: #333;
}
```

两个复述（细节在基础篇 03）：**rpx = 屏宽恒等于 750**，所以间距、圆角、字号这类「跟着屏幕等比走」的值用 rpx；`.is-done .text` 是后代选择器——完成态的**文字**变灰划线，勾选符号本身不变。

## 四、实录：改数组，界面跟着变

点编译，模拟器里应出现三条白卡片，前两条灰字带删除线。光「看到」不算数，用 automator 给这条因果链留个证据——往页面注入同一份假数据（对渲染层而言，与写在 `data` 初始值里等价），再清空（输出为实测，环境见第 1 篇）：

```text
注入 3 条 todos 后：
  .stats 文案        = "共 3 项未完成 2"
  第一行文案         = "读完小程序基础篇"
  第一行勾选符号      = "✓"

把 todos 置回 [] 后：
  .empty 文案        = "还没有待办，在上面添加一条吧"
```

（`.stats` 是成品仓第 5 篇才加的统计行，这里借它偷看了一眼数组长度。）

细看这组输出能读出三件事：

1. **数组长度 → 节点个数**：3 条数据 3 行卡片，0 条时空态节点顶上来——`wx:if` 的条件 `todos.length === 0` 由数据计算而来；
2. **字段 → 外观**：`done: true` 的第一条渲染出 `✓`，靠的正是模板里的两个三元；
3. **方向**：全程没有一行代码「去操作界面」，只改了数据——这就是「界面 = f(数据)」的实战体感。第 3 篇要做的，无非是让**用户的键盘和手指**也能改这份数据。

## 五、易混点：wx:if 还是 hidden？

空态这种「几乎不出现、出现了也不频繁切换」的节点，`wx:if` 合适。反例是高频开关（比如展开 / 收起动画）：`wx:if` 每次翻转都要创建 / 销毁节点，`hidden` 只是把渲染好的节点 `display: none` 藏起来。口诀：**频繁切换用 hidden，条件基本不变用 wx:if**（基础篇 03 有对照）。

## 小结

- 列表页 = **数据结构 + 模板 + 样式**三件事，先定字段（`id / text / done` 各有用处），再写循环体；
- `wx:for` + `wx:key="id"` 负责把数组铺成节点；空态用并列的 `wx:if` 兜底；
- 本篇数据写死在 `data` 里，是为了单独验证渲染层——第 3 篇接上输入与点击，第 5 篇换成 Storage 装载；
- 实测注入 / 清空数组，界面随之增减——「改数据不改界面」第一次成为肌肉记忆。

**思考题**：

1. 把 `wx:key` 改成 `*this`（数组项本身作 key）对这个 `todos` 数组适用吗？什么形状的数组才适合 `*this`？
2. 空态文案里写了「在上面添加一条吧」，但本篇还没有输入框。这算不算「指向了不存在的东西」？产品文案和开发进度怎么协调？
3. 如果待办要支持「置顶」，数据结构要加什么字段？模板要加什么？

> **参考**：[列表渲染 wx:for / wx:key](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/list.html)｜[条件渲染](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/conditional.html)｜[WXSS 与 rpx](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html)
