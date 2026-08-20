---
title: 分包与性能——主包瘦身，按需再下载
sidebarGroup: 小程序基础
shortTitle: 13 分包与性能
order: 13
date: 2026-08-30T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - 分包
  - subPackages
  - preloadRule
  - 性能
  - 小程序入门系列
description: 主包有 2MB 上限，实验页应放进分包。本篇把 detail/stack/skyline 拆进 packageLab，用真实日志验证 preloadSubpackages success 与分包 route，并用代码依赖分析对比主包 23k / 分包 6k。
---

> **小程序开发系列 · 第 13/14 篇**  
> 上一篇：[《Skyline》](/微信小程序/basics/mp-12-skyline-glass-easel)  
> 下一篇：[《发布上线》](/微信小程序/basics/mp-14-publish)

---

## 开头：启动时不必背走全部行李

小程序首次打开先下**主包**。主包越大，冷启动越慢；且**单个主包/分包不能超过 2MB**（截至 2026-08 官方口径），总包另有上限（普通小程序全部分包合计约 **30MB**，服务商代开发约 20MB——以[分包文档](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)为准）。

解法是 **subPackages**：主包只留启动链路与 tabBar；次要页面放进分包，用到再下载。本篇 demo 已把实验页迁入 `packageLab`。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | `subPackages` 配置 | 系统日志 `No. of subpackages: 1` |
| **2** | 分包内路由 | route 带 `packageLab/...` |
| **3** | `preloadRule` | `preloadSubpackages: success` |
| **4** | 体积对比 | 主包 23k / packageLab 6k |

## 一、怎么拆：tabBar 必须留在主包

```json
{
  "pages": [
    "pages/index/index",
    "pages/me/me"
  ],
  "subPackages": [
    {
      "root": "packageLab",
      "name": "lab",
      "pages": [
        "pages/detail/detail",
        "pages/stack/stack",
        "pages/skyline/skyline"
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["lab"]
    }
  },
  "lazyCodeLoading": "requiredComponents"
}
```

规矩：

- **tabBar 页面路径必须在主包**（本 demo：清单 / 我的）；
- 跳转分包页时 url 要带 root：`/packageLab/pages/detail/detail`；
- `name: "lab"` 供预下载与日志引用；
- `lazyCodeLoading: requiredComponents`：按需注入组件（07 篇冷启动日志里已见 `LazyCodeLoading: true`）。

## 二、实测：分包路由与预下载

> ✅ **实测**（2026-08-20，基础库 3.17.1）：

冷启动系统信息：

```text
[system] No. of subpackages: 1
[system] LazyCodeLoading: true
preloadSubpackages: lab
preloadSubpackages: success
```

进入压栈页 / 详情页：

```text
[13] wx.navigateTo 分包页 → /packageLab/pages/stack/stack
[06][13] stack 页入栈后 getCurrentPages().length = 2 ，栈顶 route = packageLab/pages/stack/stack

[06] detail onLoad（分包 packageLab），options = {id: "42", from: "index"}
```

要点：

1. 拆包前系统日志曾是 `Subpackages: N/A`；拆后变成 **`No. of subpackages: 1`**——配置生效的实锤。  
2. `getCurrentPages()` 的 `route` 带上 **`packageLab/`** 前缀。  
3. 首页的 `preloadRule` 触发 **`preloadSubpackages: lab` → success**：用户还在逛清单时，lab 分包已在后台预下载，点进详情更不容易转圈。

## 三、体积：代码依赖分析

工具入口：目录树顶部「代码依赖分析」，或详情 → 本地代码。

> ✅ **实测**（同一 demo）：

| 包 | 体积 |
|----|------|
| 主包 | **23k** |
| packageLab | **6k** |

教程项目本身很小，数字只说明**拆分关系可见**；真实业务里常见的是：主包从 1.8MB 压到 800KB，把详情、活动、设置整包挪走。优化清单（与 04 篇呼应）：

1. **分包**：低频页、大组件、图表页外置；  
2. **按需注入** `lazyCodeLoading`；  
3. **图片进 CDN**，别塞进代码包；  
4. **砍掉无依赖文件**（依赖分析里一层层标红的那些）；  
5. **setData 少传、低频**——包体积是下载问题，setData 是运行时问题，两手都要抓。

独立分包、分包异步化是进阶能力：活动落地页、插件外置等场景再查文档，本系列点到为止。

## 小结

- 主包瘦、分包按需，是启动性能最直接的一刀；
- tabBar / 启动页留主包；实验与次要页进 `subPackages`；
- `preloadRule` 可在空闲时预下载常用分包；
- 用「代码依赖分析」看清谁占体积，而不是凭感觉删文件。

**思考题**：

1. 若把 `pages/me/me`（tabBar）写进分包，工具或运行时会怎样？  
2. 没有 `preloadRule` 时，用户第一次点进详情，多了哪一步耗时？  
3. 主包已经 1.9MB，再加一张 200KB 的 png 做 tab 图标，上传阶段最可能踩哪条限制？

> **参考**：[分包加载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)｜[代码包体积优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/start_optimizeA.html)｜[代码依赖分析](https://developers.weixin.qq.com/miniprogram/dev/devtools/codeanalyse.html)
