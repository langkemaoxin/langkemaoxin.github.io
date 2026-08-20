---
title: setData 的代价——双线程之间没有免费的快递
sidebarGroup: 小程序基础
shortTitle: 04 setData 的代价
order: 4
date: 2026-08-21T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - setData
  - 双线程
  - 性能
  - 小程序入门系列
description: 为什么改 this.data 必须 setData？本篇用两个计数器按钮做对照实验：只改 data 的那个按 5 次界面纹丝不动，补一次 setData 数字直接跳变——用真实 Console 输出证明「账本」和「界面」是两份数据，setData 是唯一摆渡船。再给出最小路径 setData、调用频率、数据体积三条性能军规。
---

> **小程序开发系列 · 第 4/14 篇**  
> 上一篇：[《页面四件套与数据绑定》](/微信小程序/basics/mp-03-page-files-databinding)  
> 下一篇：[《事件系统》](/微信小程序/basics/mp-05-events)

---

## 开头：一个按了五次都不动的按钮

03 篇结尾留了个钩子：数据世界的 `showDone` 翻转，界面立刻跟着翻，摆渡船是 `setData`。本篇开头先做一个「反例」实验——把摆渡船抽掉，看界面还动不动。

实验页面上有两个计数器（微信开发者工具 Stable 2.02.2608040，调试基础库 3.17.1）：

```xml
<view class="line">A（每次走 setData）：{{countA}}</view>
<view class="line">B（只改 data 不 setData）：{{countB}}</view>
<button size="mini" type="primary" bindtap="incWithSetData">A：setData +1</button>
<button size="mini" bindtap="incWithoutSetData">B：只改 data +1</button>
<button size="mini" type="warn" bindtap="flushB">B：补一次 setData</button>
```

```js
incWithSetData() {
  this.setData({ countA: this.data.countA + 1 })
  console.log('[04] A：setData +1 → countA =', this.data.countA)
},
incWithoutSetData() {
  this.data.countB = this.data.countB + 1   // 只改数据，不调 setData
  console.log('[04] B：只改 this.data，没 setData → countB =', this.data.countB, '（界面应该没动）')
},
flushB() {
  this.setData({ countB: this.data.countB })  // 补一刀
  console.log('[04] B：补一次 setData({countB}) → 界面跳到', this.data.countB)
}
```

操作与结果（Console 原样，重复行已折叠）：A 组连点若干次，数字步步跟涨；B 组连点 **5 次**，`countB` 在日志里 4→8 一路涨，**屏幕上的 B 纹丝不动**；最后点一下「补一次 setData」，B 直接**跳到 8**。

这个「不动→跳变」的现象，就是理解小程序性能模型的原点。本篇回答三个问题：为什么不动？`setData` 到底干了什么？以及——写代码时要遵守哪几条军规，才不把这条跨线程通道堵死。

| 雪球 | 这一球加上去的 | 能解释什么 |
|------|----------------|-----------|
| **1** | 两份数据的真相 | 为什么改 data 界面不动 |
| **2** | setData 的快递流程 | 「同步」到底同步了什么、经过哪里 |
| **3** | 三条性能军规 | 写页面不踩通信坑 |
| **4** | WAService 彩蛋 | Console 文件名里藏的运行时秘密 |

## 一、真相：数据从来就有两份

直觉上，「`this.data.countB = 8` 之后界面上还是 3」像个 bug。但放在 01 篇的双线程图上，它其实是**必然**：

- **逻辑层**（JSCore/V8 线程）里有一份 `this.data`——这是你的**账本**，JS 想怎么改怎么改，改完它就是 8；
- **渲染层**（WebView 线程）里有另一份——渲染层根据 `Page()` 构造时收到的初始 `data`，把 `{{countB}}` 渲染成了 3，然后**它谁也不认识，只等消息**。

两个线程不共享内存（这是双线程模型的物理隔离），所以「改账本」这个动作的影响范围天然止步于逻辑层。渲染层那份数据要更新，必须有人**把新值送过去**——这个送货员就是 `setData`。

补一刀实验则证明了账本一直在变：`flushB` 执行 `setData({ countB: this.data.countB })`，界面直接跳到 8——因为 `this.data.countB` 早就是 8 了，只是「照片」一直没重拍。

## 二、setData 的快递流程：同步的是什么、经过哪里

`this.setData(obj)` 表面一行代码，实际跑了一条跨线程流水线：

```mermaid
flowchart LR
    A["逻辑层<br/>this.data.countB = 8"] -->|"① 把 obj 里要改的字段<br/>合并进逻辑层 data"| B
    B["② 序列化"] --> C["Native（微信客户端）<br/>③ 中转"]
    C -->|"④ 送到渲染层"| D["渲染层 WebView<br/>⑤ 与旧数据 diff，<br/>重渲染受影响的节点"]
```

逐站看清代价在哪：

1. **①合并**：便宜，纯 JS 对象操作；
2. **②序列化**：`obj` 要变成能跨线程传输的格式（结构化克隆/JSON 化一类的手法）——**数据越大越贵**，函数、`undefined` 这类序列化不了的东西送不过去；
3. **③④跨线程中转**：经 Native 层排队转发——**调用越频繁越贵**，两次 `setData` 就是两次快递，没有自动合单；
4. **⑤diff 重渲染**：渲染层对比新旧数据，只更新变化的节点——`wx:key`（03 篇）在这里发挥作用。

所以官方性能文档里「[合理使用 setData](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_setData.html)」整页讲的就是：**这趟快递，少发、发小、别往看不见的地址发**。

## 三、三条性能军规

**军规一：只发变化的字段，用「数据路径」直达**。`setData` 的 key 支持路径语法，可以精确到数组某一项的某个属性：

```js
// 差：整个数组重新发货（哪怕只改了一个勾）
this.setData({ todos: this.data.todos })

// 好：只发一个布尔值
this.setData({ 'todos[2].done': true })
```

列表越长、条目结构越复杂，两种写法的差距越大。

**军规二：合并高频调用**。滚动、拖拽、输入这类一秒触发几十次的场景，先把要发的字段攒一攒，一帧发一次，别让快递通道排队：

```js
// 差：连续 setData 十次
// 好：攒批
this.setData({ x: newX, y: newY, angle: a })   // 一次发三个字段
```

**军规三：后台页面不发货**。页面切入后台（onHide 之后，07 篇）还持续 `setData`，纯属给通道添堵——用户根本看不见。官方同样明确建议避免。

还有一条隐藏军规，就是 03 篇的 `wx:key`：快递到了渲染层，diff 靠身份证号认人，没有 `wx:key` 就退化成整列表重渲染。

## 四、彩蛋：Console 里的 WAService 是谁

回头看实验的 Console 输出，每行日志前面都有一串来源文件名：

```text
WAServiceMainContext.js?t=wechat&v=3.17.1:1 [04] B：只改 this.data，没 setData → countB = 4 （界面应该没动）
WAServiceMainContext.js?t=wechat&v=3.17.1:1 [04] B：只改 this.data，没 setData → countB = 5 （界面应该没动）
WAServiceMainContext.js?t=wechat&v=3.17.1:1 [04] B：补一次 setData({countB}) → 界面跳到 8
WAServiceMainContext.js?t=wechat&v=3.17.1:1 [05] 内层 catchtap 触发：target = inner ，currentTarget = inner
```

**WAServiceMainContext**——逻辑层的运行时真名就叫 **WAService**（WeChat App Service，小程序基础库注入逻辑层的那套基础设施；对应渲染层那套叫 WAWebview，08 篇还会遇到）。`v=3.17.1` 是本次调试用的**基础库版本**：基础库是微信预置在小程序运行环境里的「标准库」，你写的 `Page`/`setData`/`wx.request` 都由它提供，版本号决定哪些新特性可用（12 篇的 glass-easel 要 ≥3.8.12，本环境 3.17.1 满足）。

顺手记两个排障常识：开发者工具右上角「详情 → 本地设置」可以切调试基础库版本；真机上用户微信版本决定基础库上限，老微信拿不到新特性（14 篇发布前要考虑兼容下限）。

## 五、实验复盘：完整时序

把 B 组实验的关键帧连成一条时间线（真实操作顺序）：

| 步骤 | 动作 | this.data.countB（账本） | 屏幕显示（界面） | 说明 |
|------|------|------------------------|------------------|------|
| 1~5 | 点「只改 data +1」×5 | 4 → 5 → 6 → 7 → 8 | 始终 3 | 账本在涨，没发货 |
| 6 | 点「补一次 setData」 | 8 | **跳到 8** | 一次快递把 5 次积压全送到位 |

对照 A 组（每次都 `setData`）：账本与界面始终同步，代价是 5 次快递。两种模式没有绝对优劣——**一致性与通信成本的取舍**。实践中 99% 的场景照 A 组写（正确性优先），B 组揭示的「数据 ≠ 界面」认知用于排障：**「data 明明是对的，界面为什么不更新」——先检查是不是忘了 setData**，这是新手 Top 级 bug，现在你已经亲手制造并修复过它了。

最后留一个伏笔：这条「序列化 → 中转 → 跨线程」的快递通道，是 WebView 渲染的宿命；12 篇的 Skyline 把渲染和逻辑收回同一线程，`setData` 的通信开销直接归零——但今天写的军规依然是好习惯，因为 diff 和渲染本身还是花钱的。

## 小结

- **`this.data` 是账本，界面是照片**：改账本不重拍照片；`setData` 是唯一摆渡船；
- `setData` 流水线：**合并 → 序列化 → Native 中转 → 渲染层 diff 重渲染**——大数据贵在序列化，高频调用贵在排队；
- 三条军规：**数据路径直达（`'todos[2].done'`）、高频合并、后台不发**，外加列表给 `wx:key`；
- Console 里的 **WAServiceMainContext** 是逻辑层运行时（WAService），`v=3.17.1` 是基础库版本——工具可切，真机受用户微信版本约束；
- 「data 对界面不动」= 忘了 setData，此 bug 你已亲手治愈。

**思考题**：

1. `this.setData({ 'todos[2].done': true })` 发货的 payload 有多大？如果列表有 1000 项，这个写法比 `setData({ todos: this.data.todos })` 省的是流水线哪几站？
2. 每秒 60 次的触摸移动事件里各调一次 `setData`，和攒满 100ms 发一次，用户看到的动画会有差别吗？差在「排队」还是「渲染」？
3. 为什么 `setData({ fn: () => {} })` 不会让渲染层拿到这个函数？（提示：序列化站发生了什么。）

> **参考**：[合理使用 setData（官方性能文档）](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/runtime_setData.html)｜[渲染层和逻辑层](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/framework.html)｜[基础库更新日志](https://developers.weixin.qq.com/miniprogram/dev/framework/release/)
