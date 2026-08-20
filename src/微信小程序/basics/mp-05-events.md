---
title: 事件系统——用户的手指怎么敲到逻辑层的门
sidebarGroup: 小程序基础
shortTitle: 05 事件系统
order: 5
date: 2026-08-22T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - 事件
  - bindtap
  - catchtap
  - 冒泡
  - 小程序入门系列
description: 渲染层收到点击、逻辑层管着数据，两个线程之间事件是反向快递：bind 冒泡、catch 阻断、dataset 传参。本篇用黄块套红块的嵌套实验，以真实 Console 输出验证 catch 如何掐断冒泡，并拆开事件对象里 target 与 currentTarget 的区别。
---

> **小程序开发系列 · 第 5/14 篇**  
> 上一篇：[《setData 的代价》](/微信小程序/basics/mp-04-dual-thread-setdata)  
> 下一篇：[《路由与页面栈》](/微信小程序/basics/mp-06-routing-page-stack)

---

## 开头：事件是反向快递

04 篇讲的是**逻辑层 → 渲染层**方向的数据快递（`setData`）。但页面不是单向海报：用户会点按钮、滑列表、输文字——这些动作发生在**渲染层**（手指戳的是 WebView 里的元素），而处理它们的函数住在**逻辑层**。所以必然存在一条反向通道：**渲染层 → 逻辑层**的事件快递。

前几篇你其实一直在用它的收货端：WXML 里写 `bindtap="toggleShowDone"`，点击时逻辑层的 `toggleShowDone` 被调用——「点按钮跑函数」这件事，背后就是事件从渲染层打包、经 Native 中转、送进逻辑层派发给对应页面实例的过程。本篇把这条通道拆开：绑定语法、冒泡规则、事件对象、传参方式。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | bind 与 catch 的区别 | 点内层，外层「不再连坐」 |
| **2** | 事件对象 e | 函数收到的那个参数里有什么 |
| **3** | target vs currentTarget | 「谁被点」和「谁在监听」不是一回事 |
| **4** | dataset 传参 | 一个 handler 服务 N 个条目 |

## 一、绑定语法：前缀决定冒不冒泡

事件绑定的写法是「**前缀 + 事件名**」当属性名，值是逻辑层函数名：

```xml
<view bindtap="onOuterTap">...</view>
<view catchtap="onInnerTap">...</view>
```

和网页一样，小程序的事件也会**冒泡**：点内层元素，事件从内层出发、沿祖先链向上传递，每一层只要绑了同类事件都会触发——「连坐」。四个官方前缀，先掌握最常用的两个：

| 前缀 | 冒泡行为 | 典型用途 |
|------|----------|----------|
| `bind` | **不阻断**，事件继续向上冒 | 默认选择，普通监听 |
| `catch` | **触发后阻断**，不再向上冒 | 「这层处理完就别烦上层了」 |
| `capture-bind` | 捕获阶段监听，不阻断 | 拦截时机敏感的高级场景 |
| `capture-catch` | 捕获阶段监听并阻断 | 同上，更少见 |
| `mut-bind` | 互斥绑定：同一事件多个 mut-bind 只触发一个 | 配合自定义组件，09/10 篇后再看 |

另外还有 `mut-bind` 之外的老朋友 `bind:tap` 写法（冒号分隔，等价于 `bindtap`），两种拼写都合法，见仁见智。

## 二、实验：黄块套红块

实验项目首页的事件区（微信开发者工具 Stable 2.02.2608040，调试基础库 3.17.1）：

```xml
<view class="outer" bindtap="onOuterTap" data-name="outer">
  外层（bindtap，点我）
  <view class="inner" catchtap="onInnerTap" data-name="inner">内层（catchtap，点我）</view>
</view>
```

```js
onOuterTap(e) {
  console.log('[05] 外层 bindtap 触发：target =', e.target.dataset.name, '，currentTarget =', e.currentTarget.dataset.name)
  this.setData({ lastTap: '外层 outer（bindtap）' })
},
onInnerTap(e) {
  console.log('[05] 内层 catchtap 触发：target =', e.target.dataset.name, '，currentTarget =', e.currentTarget.dataset.name)
  this.setData({ lastTap: '内层 inner（catchtap，阻断冒泡）' })
}
```

黄色大块（outer）用 `bindtap`，里面嵌了个红色小块（inner）用 `catchtap`。操作两轮，Console 原样输出：

**第一轮：点黄色空白处（不在红块上）**

```text
[05] 外层 bindtap 触发：target = outer ，currentTarget = outer
```

**第二轮：点红色内层**

```text
[05] 内层 catchtap 触发：target = inner ，currentTarget = inner
```

注意第二轮：**只有内层的日志，外层的日志没有出现**。如果事件无阻断地冒泡，点内层应该先触发 `onInnerTap` 再触发 `onOuterTap`（两行日志）——`catch` 把向上冒的火苗掐灭在了内层，外层根本不知道发生过点击。这就是「catch 阻断冒泡」的实锤：列表条目里的删除按钮用 `catchtap`，就是为了点删除时**不**顺带触发条目本身的 `bindtap`（进详情）——两个意图互不干扰。

## 三、事件对象：函数收到的 e 是什么

两个 handler 都收了参数 `e`——事件对象，渲染层打包、快递到逻辑层的「事件详情包裹」。常用字段：

| 字段 | 内容 | 本实验中的值 |
|------|------|--------------|
| `e.type` | 事件名 | `'tap'` |
| `e.timeStamp` | 距页面打开的毫秒数 | 数字 |
| `e.target` | **动作发生的位置**（被点的那个元素） | 点红块时是 inner |
| `e.currentTarget` | **监听者本人**（绑了这个 handler 的元素） | 在 inner 的 handler 里是 inner |
| `e.detail` | 事件特有信息（tap 是坐标 x/y；input 是输入值） | 对象 |
| `e.touches` / `e.changedTouches` | 触摸点信息 | tap 时为空数组或单点 |

### target vs currentTarget：本实验里为什么相同？

定义拆开看：**`target` 永远指向「手指落点」的那个组件；`currentTarget` 指向「当前正在执行 handler 的这个组件」**。两者在两种场景下会分开：

1. **冒泡经过外层时**：点内层（假设内层是 `bindtap` 不阻断），外层 handler 也会触发——那次触发里 `target` 还是 inner（落点没变），`currentTarget` 却是 outer（这次是外层在监听）。**一个说「点了谁」，一个说「谁在问」**。
2. **区域监听**：大块 `bindtap` 里放了个无事件的装饰性小图标，点图标时 `target` 是图标、`currentTarget` 是大块。

本实验两轮日志里两者恰好相同（点谁谁监听），因为 `catch` 把冒泡掐断了、外层 handler 根本没机会执行，「分歧场景」没出现。要亲眼看到分歧，做个 30 秒补充实验：把内层的 `catchtap` 改成 `bindtap`，再点红块——预期 Console 会出现两行：内层日志（target=inner, currentTarget=inner）和外层日志（**target=inner, currentTarget=outer**）。

> ✅ **实测**（2026-08-22，基础库 3.17.1）：把内层换成 `bindtap`（实验页上的蓝色块）后点击，Console 一次打出**两行**——
>
> ```text
> [05] 内层 bindtap 触发：target = inner2 ，currentTarget = inner2
> [05] 外层 bindtap 触发：target = inner2 ，currentTarget = outer
> ```
>
> 第二行就是分歧现场：手指落点没变（`target` 还是 inner2），但这次执行的是**外层**的 handler（`currentTarget` = outer）——事件从内层冒泡到了外层。对照红色块（`catchtap`）点击时永远只有内层一行日志，bind/catch 的区别就此实锤。

## 四、dataset：WXML 里塞参数给 handler

注意 WXML 里的 `data-name="outer"`——**`data-` 前缀的属性会被打包进事件对象的 `dataset`**，渲染层快递事件时一并捎给逻辑层，取用时中划线转驼峰（`data-user-name` → `e.currentTarget.dataset.userName`）。

为什么需要它？网页里写 `onclick="del(3)"` 直接把参数写进字符串；小程序的 WXML 是模板、handler 名只是个引用，**不能带括号传参**（`bindtap="del(3)"` 非法）。于是 dataset 成了标准传参通道：

```xml
<view wx:for="{{todos}}" wx:key="id">
  <button catchtap="removeTodo" data-id="{{item.id}}">删</button>
</view>
```

```js
removeTodo(e) {
  const id = e.currentTarget.dataset.id   // 拿到这一条的 id
  // ...按 id 过滤数组，setData 回去
}
```

一个 `removeTodo` 服务整个列表的 N 个删除按钮——这就是 06 篇之前，列表交互的标准姿势。

## 五、常用事件速查

| 事件 | 触发时机 | 常用绑定 |
|------|----------|----------|
| `tap` | 点按（手指按下并抬起，未拖动） | `bindtap` |
| `longpress` | 长按 350ms 以上（会阻断 tap） | `bindlongpress` |
| `touchstart/move/end/cancel` | 触摸全生命周期 | 手势类场景 |
| `input` | 输入框内容变化 | `bindinput`（09 篇表单） |
| `confirm` | 输入框回车/完成 | `bindconfirm` |
| `scroll` | 滚动容器滚动 | scroll-view 上（09 篇） |
| `submit` | 表单提交 | form 上 `bindsubmit`（09 篇） |

排障小抄：handler 名写错（WXML 里 `bindtap="onTap"` 而 js 里没有 `onTap`）不报编译错误，点击时 Console 才警告——**「点了没反应」先查函数名拼写**，这是新手第二常见的 bug（第一常见是 04 篇的忘 setData）。

## 小结

- 事件是**反向快递**：渲染层打包（含 target/dataset）→ Native 中转 → 逻辑层派发给页面实例；
- 前缀即策略：**bind 放行冒泡、catch 触发即阻断**（另有 capture 阶段与 mut-bind，用到再查）；
- `e.target` 是**落点**，`e.currentTarget` 是**监听者**——冒泡经过外层时两者分歧（蓝块 bind 实验已实锤）；
- **`data-*` 进 `e.currentTarget.dataset`**（中划线转驼峰），列表里一个 handler + dataset 打天下；
- 「点了没反应」两板斧：查 handler 拼写 → 查是不是 catch 错杀了冒泡。

**思考题**：

1. 列表条目整体 `bindtap` 进详情、条目内删除按钮 `catchtap` 删条目——如果把删除按钮也写成 `bindtap`，用户点删除会发生什么（两件事的执行顺序）？
2. `e.detail.x/y`（tap 的坐标）和 `e.touches[0].pageX/pageY` 有什么时候会不一样？（提示：tap 的 detail 取自**手指抬起时**的位置。）
3. 04 篇说「`{{}}` 里不能调函数」，本篇 handler 里却能随便写 JS——为什么模板不行、事件处理函数行？（两段代码各跑在哪一层？）

> **参考**：[事件系统](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxml/event.html)｜[WXML 事件绑定](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/event.html)
