---
title: 页面四件套与数据绑定——一个页面是怎么拼出来的
sidebarGroup: 小程序基础
shortTitle: 03 四件套与数据绑定
order: 3
date: 2026-08-20T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - WXML
  - WXSS
  - 数据绑定
  - 小程序入门系列
description: 一个页面 = wxml/wxss/js/json 四个同名文件：结构、样式、数据、配置各管一摊。本篇把 02 篇建好的骨架页面改造成真正的数据驱动页面——{{}} 绑定、wx:for 列表渲染、wx:key 为什么必填、wx:if 条件渲染、rpx 单位，全部在真实项目里跑过，Console 输出原样贴出。
---

> **小程序开发系列 · 第 3/14 篇**  
> 上一篇：[《跑起来第一个小程序》](/微信小程序/basics/mp-02-first-miniprogram)  
> 下一篇：[《setData 的代价》](/微信小程序/basics/mp-04-dual-thread-setdata)

---

## 开头：屏幕上那行字，是数据还是界面

02 篇结束时，你的模拟器里有一行「小事记 · 第一个页面」。现在追问一句：**这行字到底住在哪里？**

如果是网页，答案很直接：它就是 DOM 树里的一个文本节点，你随时 `innerText` 改掉它。但 01 篇说过，小程序逻辑层**没有 DOM**——你的 JS 世界里根本不存在「这行字」这个对象。它只存在于 `index.js` 的 `data.motto` 里，而屏幕上那份，是渲染层照着 `index.wxml` 的模板**渲染出来的照片**。

这就引出本篇要建立的核心心智模型：**界面 = f(数据)**。WXML 是函数模板，data 是自变量，屏幕是因变量。开发者永远只改数据（下一章讲怎么改），不碰界面。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 四件套各自分工 | 知道一段代码该写进哪个文件 |
| **2** | `{{}}` 数据绑定 | motto 出现在屏幕上 |
| **3** | `wx:for` 列表渲染 + `wx:key` | 三条待办从数组里长出来 |
| **4** | `wx:if` 条件渲染 | 一行界面按开关显隐 |
| **5** | rpx 单位 | 样式在不同屏宽上等比缩放 |

本篇所有代码都在实验项目 `mp-demo-lab2` 的首页上跑（微信开发者工具 Stable 2.02.2608040，调试基础库 3.17.1，下同），Console 输出全部真实。

## 一、四件套：同名四兄弟，各管一摊

先把 02 篇的结论细化成操作级的分工表：

| 文件 | 管什么 | 类比网页 | 不写会怎样 |
|------|--------|----------|-----------|
| `index.wxml` | 页面**结构**：有哪些元素、怎么嵌套 | HTML | 页面空白 |
| `index.wxss` | 页面**样式**：颜色、布局、尺寸 | CSS | 元素裸奔（默认样式） |
| `index.js` | 页面**数据与行为**：data、事件函数 | JS | 页面无数据无交互 |
| `index.json` | 页面**配置**：导航栏标题等 | （无对应） | 用 app.json 的全局默认 |

加载顺序呼应 01 篇官方描述：**json 先生成界面骨架（导航栏等）→ wxml 结构 + wxss 样式装载 → js 里 `Page()` 把 `data` 和模板一起渲染**。所以 `index.json` 里能覆盖 `app.json` 的全局 `window` 配置——比如某个页面想要黑色导航栏、单独的标题，写在自己的 json 里就行，别的页面不受影响。

## 二、`{{}}`：数据的占位符

WXML 不是 HTML 的改名，它是**模板**。模板里 `{{表达式}}` 的位置，渲染时会被 `data` 里对应的值填上。实验项目的首页：

```xml
<!-- index.wxml -->
<view class="container">
  <text class="title">{{motto}}</text>
</view>
```

```js
// index.js
Page({
  data: {
    motto: '小事记 · 第一个页面'
  }
})
```

`data.motto` 的值，填进 `{{motto}}` 的坑——屏幕上那行字就是这么来的。

`{{}}` 里能放的不止变量，是**表达式**：三元、算术、字符串拼接、逻辑判断都行：

```xml
<text>{{item.done ? '✓' : '○'}}</text>          <!-- 三元 -->
<text>{{countA + countB}}</text>                  <!-- 算术 -->
<text>{{user.name + '，欢迎回来'}}</text>          <!-- 拼接 -->
```

但有一条铁律先钉死：**`{{}}` 里不能调用 JS 函数**。`{{formatTime(item.ts)}}` 是不合法的（渲染层根本跑不了你逻辑层的函数——两个线程！）。「那我想在模板里格式化时间怎么办」这个坑留到 08 篇 WXS 专门填，先记住规则本身。

## 三、`wx:for`：让数组长成列表

待办清单的灵魂是把数组渲染成一排条目。实验项目在 `data` 里放了 `todos` 数组，WXML 用 `wx:for` 循环：

```xml
<view wx:for="{{todos}}" wx:key="id" class="todo">
  <text>{{item.done ? '✓' : '○'}} {{item.text}}</text>
</view>
```

```js
data: {
  todos: [
    { id: 1, text: '读双线程模型', done: true },
    { id: 2, text: '跑通第一个小程序', done: true },
    { id: 3, text: '搞懂 setData', done: false }
  ]
}
```

编译后屏幕上出现三行：`✓ 读双线程模型`、`✓ 跑通第一个小程序`、`○ 搞懂 setData`。`wx:for` 默认把当前项暴露为 `item`、下标暴露为 `index`（需要下标时直接 `{{index}}`）。

**`wx:key` 为什么建议必填**：它告诉框架「数组里每项的身份证号是哪个字段」。没有它，数组变化（插入、删除、重排）后框架只能「推倒重渲染」整个列表；有了它，框架做 diff——身份没变的条目复用，只挪动/更新变化的部分。列表一长、条目一复杂（含输入框、图片），不填 `wx:key` 的代价就是肉眼可见的闪烁和状态错乱，而且工具会在 Console 警告你。身份证要选**稳定且唯一**的字段（数据库 id、业务编号），千万别用数组下标——下标会随重排变化，等于身份证天天换。

## 四、`wx:if`：条件渲染

界面经常要「看数据办事」：空列表显示占位提示、开关控制一段区域显隐。实验项目两处用到：

```xml
<view wx:if="{{todos.length === 0}}" class="empty">（todos 为空时才显示这句）</view>

<button size="mini" bindtap="toggleShowDone">{{showDone ? '隐藏下面那行' : '显示下面那行'}}</button>
<view wx:if="{{showDone}}" class="line">wx:if 条件渲染：showDone 为 true 时能看到</view>
```

注意两个细节：

1. `{{}}` 里可以写 `todos.length === 0` 这样的判断表达式，真假决定这个节点**存不存在**（不是显不显示）；
2. 按钮文案也绑定了 `showDone` 的三元——同一份数据，同时驱动两处界面。

`wx:if` 还有个常见搭档 `hidden`，区别一句话：**`wx:if` 是「不存在」（条件假时节点不渲染，条件翻转有创建/销毁开销），`hidden` 是「藏着」（节点始终渲染，只是 `display: none`）**。频繁切换用 `hidden`，条件几乎不变用 `wx:if`。另有 `wx:elif` / `wx:else` 可用。

## 五、rpx：为「屏幕不一样宽」而生

WXSS 基本就是 CSS，但多了一个自创单位 **rpx**（responsive pixel）：**规定屏幕宽度恒等于 750rpx**。iPhone 6 屏宽 375px，1rpx = 0.5px；更宽的屏幕 1rpx 对应更多物理像素——效果是**同一份样式，在所有手机上等比缩放**。

实验项目的卡片样式：

```css
.card {
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
```

什么时候用 rpx、什么时候用 px？经验法则：**跟着屏幕等比走的布局尺寸（边距、字号基准、卡片宽）用 rpx；需要物理精确的 1px 分割线、边框用 px**（1rpx 在窄屏上会小于一个物理像素，细线可能时有时无）。写 px 也完全合法，只是不缩放。

## 六、实验复盘：Console 里的真实输出

页面绑了个开关按钮（`bindtap` 是什么、为什么点它能跑函数——下一章的事件还没讲，这里先当黑盒用），连点六次，Console 原样输出：

```text
[03] toggleShowDone → showDone = false
[03] toggleShowDone → showDone = true
[03] toggleShowDone → showDone = false
[03] toggleShowDone → showDone = true
[03] toggleShowDone → showDone = false
[03] toggleShowDone → showDone = true
```

屏幕上「wx:if 条件渲染」那行随之三次消失又出现。值得盯住的是：**每次点击，数据翻一次（false/true 交替），界面立刻跟着翻**——`toggleShowDone` 里改 `showDone` 用的那个 `this.setData({...})`，就是数据世界和界面世界之间唯一的摆渡船。它凭什么这么特殊、坐船要付什么代价，正是下一篇的全部内容。

## 小结

- 一个页面 = 四件套：**wxml 结构 / wxss 样式 / js 数据与行为 / json 配置**，页面 json 可覆盖全局配置；
- 核心心智模型：**界面 = f(数据)**，WXML 是模板，`{{}}` 填坑；表达式可用，**函数不可调用**（双线程所限，08 篇 WXS 补这个洞）；
- `wx:for` + `wx:key`（稳定唯一字段，忌用下标）做列表；`wx:if`/`hidden` 一个「不存在」一个「藏着」；
- **rpx：750rpx = 屏宽**，等比缩放；物理精确用 px；
- 数据变界面变，靠的是 `this.setData()`——下一篇拆它。

**思考题**：

1. 把 `todos` 数组删成 `[]`，编译后屏幕会显示什么？（对照 `wx:if="{{todos.length === 0}}"` 那行。）
2. `wx:key` 填 `index`（下标）和不填，工具的警告一样吗？猜猜为什么官方「明知故纵」地允许不填。
3. `{{}}` 里写 `{{motto}}` 渲染出文字；那写 `{{countA + 1}}` 时，`data` 里的 `countA` 变了吗？（提示：表达式是「取值时计算」，不是「赋值」。）

> **参考**：[WXML 模板](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/code/#wxml-模板)｜[WXSS 样式](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/code/#wxss-样式)｜[列表渲染 wx:for/wx:key](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/list.html)｜[条件渲染](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/conditional.html)
