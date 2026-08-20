---
title: Skyline 与 glass-easel——下一任渲染引擎长什么样
sidebarGroup: 小程序基础
shortTitle: 12 Skyline
order: 12
date: 2026-08-29T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - Skyline
  - glass-easel
  - 渲染引擎
  - 小程序入门系列
description: WebView 双线程模型有天花板，官方主推 Skyline + glass-easel。本篇在页面级开启 Skyline，用 getSkylineInfoSync 实锤 isSupported 与引擎版本，并记下 navigationStyle=custom、双端兼容与无效配置项等踩坑。
---

> **小程序开发系列 · 第 12/14 篇**  
> 上一篇：[《API 与权限》](/微信小程序/basics/mp-11-api-permissions)  
> 下一篇：[《分包与性能》](/微信小程序/basics/mp-13-subpackages-performance)

---

## 开头：WebView 不是终点

01 / 04 篇的双线程模型建立在 **WebView 渲染层**上：逻辑层 JsCore、渲染层浏览器内核，靠 `setData` 过桥。官方下一代方案是 **Skyline**（自研渲染引擎）+ **glass-easel**（配套组件框架）——目标是更接近原生的布局与动画表现，并收紧样式/组件约束。

本篇不做全量迁移手册，只做一件事：在 demo 里**单独开一页**跑通 Skyline，留下真实探测结果与配置坑。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 页面级 `renderer: skyline` | 能打开实验页 |
| **2** | `getSkylineInfoSync` | `isSupported` + 引擎 version |
| **3** | 迁移坑 | `navigationStyle=custom`、双模式兼容 |

## 一、怎么开：页面级，而不是一口吃成胖子

实验页在分包里：`packageLab/pages/skyline/skyline.json`（基础库 3.17.1）：

```json
{
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "navigationStyle": "custom",
  "usingComponents": {}
}
```

`app.json` 侧补充 `lazyCodeLoading`（本系列早就开了）和精简后的 `rendererOptions.skyline`（如 `defaultDisplayBlock` / `disableABTest` + sdk 版本窗）。**工具不认识的字段会被直接报「无效」**——我们曾写入的 `tagNameStyleIsolation` 等三项就被 3.17.1 打回，已删掉。配置以[官方起步文档](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/migration/)当期示例为准，不要从旧教程整段粘贴。

开发者工具：**详情 → 本地设置 → 勾选「开启 Skyline 渲染调试」**。

## 二、实测：引擎版本 1.4.21

进入实验页后探测：

```js
const info = wx.getSkylineInfoSync()
console.log('[12] getSkylineInfoSync =', info)
```

> ✅ **实测**（2026-08-20，基础库 3.17.1，工具 Stable 2.02.2608040）：

```text
[12] skyline 页 onLoad，route = packageLab/pages/skyline/skyline
[12] getSkylineInfoSync = {isSupported: true, reason: "<Undefined>", version: "1.4.21"}
```

`isSupported: true` 说明当前调试环境能跑 Skyline；`version: "1.4.21"` 是**渲染引擎自己的版本号**，和基础库 `3.17.1` 不是同一个号。

工具同时弹出重要提示（原文大意）：

> Skyline 渲染模式在 **2.29.2 及以上基础库**支持。当前若未设置线上最低基础库，低版本客户端会退回 **WebView**——**同一页面必须在两种渲染模式下都能正常显示**。

这就是迁移的核心纪律：**Skyline 不是「开了就全员 Skyline」**，低版本与未命中实验的用户仍可能走 WebView。页面级开启时尤其要双端自测。

## 三、踩坑清单（本实验亲历）

| 坑 | 现象 | 处理 |
|----|------|------|
| 未设 `navigationStyle: custom` | 编译报错：Skyline 页必须 custom | 页面 json 加上，并自己画顶栏 |
| 仍用默认导航栏字段 | 提示 app.json 的 `navigationBar*` 对 Skyline 页不生效 | custom 下自己管标题/返回 |
| 过时的 `rendererOptions` 键 | 「无效的 app.json rendererOptions.skyline[...]」 | 删掉工具不认的键 |
| 没开调试开关 | 表现怪异或仍像 WebView | 本地设置勾选 Skyline 渲染调试 |
| 全量迁移过猛 | 样式/组件差异一大片 | 先单页试点，再按官方差异表适配 |

glass-easel：Skyline **只认**这套组件框架；WebView 下从基础库 **3.8.12** 起也可选用 glass-easel（可与 `glassEaselWebview` 等选项配合，细节见官方「迁移到 glass-easel」）。本实验页同时写了 `componentFramework: "glass-easel"`。

## 四、适不适合迁？

| 更值得试 | 先观望 |
|----------|--------|
| 强动画、复杂滚动、要极致跟手 | 大量依赖尚未适配的组件/写法 |
| 能接受提高最低基础库 | 必须死磕极老机型 WebView |
| 有精力做双模式回归 | 只想「改一个字段就上线」 |

本系列 demo 只保留**一页** Skyline，主路径仍是 WebView——这是稳健策略：能力验证与文档对齐即可，业务全量迁移另开专项。

## 小结

- Skyline = 新渲染引擎；glass-easel = 其组件框架搭档；
- 页面级开启：`renderer` + `componentFramework` + **`navigationStyle: custom`**；
- 用 `getSkylineInfoSync` 看 `isSupported` / `version`（本环境 **1.4.21**）；
- **必须按双模式兼容**来设计；配置项以当期官方文档为准，无效键直接删。

**思考题**：

1. 为什么官方强调「同一页面要在 Skyline 和 WebView 下都能显示」，而不是强制所有用户升基础库？
2. `navigationStyle: custom` 之后，06 篇里靠系统导航栏「返回」的心智还成立吗？要自己补什么？
3. 把整个小程序 `app.json` 全局 `renderer: skyline`，和只给一页开，风险差在哪？

> **参考**：[Skyline 起步](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/migration/)｜[glass-easel 迁移](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/glass-easel/migration.html)｜[getSkylineInfoSync](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSkylineInfoSync.html)
