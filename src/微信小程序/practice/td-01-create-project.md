---
title: 从 0 创建 TodoList 项目——把基础篇的知识拼成一个产品
sidebarGroup: 小程序实战
shortTitle: "01 创建项目"
order: 1
date: 2026-09-01T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - TodoList
  - 实战
  - 入门
description: 实战篇开篇：基础篇的实验台是「一个知识点一张卡片」，真实开发却是「一个产品按需取用机制」。本篇用微信开发者工具从空白模板创建最简 TodoList 工程，逐段读懂 app.json 与两份 project 配置文件，讲清测试号 / 正式 AppID / touristappid 三种选法，最后用官方 automator 真跑一遍拿到第一行 Console 输出。
---

> **小程序实战 · TodoList · 第 1/5 篇**  
> 下一篇：[《画出列表页》](/微信小程序/practice/td-02-list-page)  
> 基础理论系列：[小程序基础 01–14](/微信小程序/basics/mp-01-what-is-miniprogram)  
> 成品仓库：[mp-todolist](https://github.com/code-corey/mp-todolist)

---

## 开头：实验台学不会的事

基础篇 14 篇走完，你手里有一个 `mp-demo-lab2`——首页堆满卡片，每张验证一个机制：`setData` 的代价、事件的冒泡、生命周期的顺序。但这是**实验台**的形状：知识点是主角，界面是为它服务的。

真实开发恰好相反：**产品是主角，机制按需取用**。你接到的是「做一个待办清单」，然后自己决定先画列表、再接交互、最后想持久化——在这个过程中，双线程、`setData`、事件、组件这些知识才会长在正确的位置上。

所以实战篇换一个仓库、换一种组织方式：从空白工程开始，五篇做出一个**能用的本地 TodoList**——输入添加、点选完成、删除、关掉再开数据还在。每一篇只加一层，每层的机制都能回到基础篇某一篇去查原理。

本篇是最薄的一层，回答三个问题：

| 雪球 | 这一球加上去的 | 验收标准 |
|------|----------------|----------|
| **1** | 空白小程序工程 | 模拟器编译通过、不报红 |
| **2** | 读得懂工程骨架 | 说得出每个文件归谁管 |
| **3** | AppID 会选 | 测试号 / 正式 AppID / `touristappid` 三种场景知道怎么挑 |

本系列所有实验环境：微信开发者工具 Stable 2.02.2608040（Windows 10），调试基础库 3.17.1，下同。

## 一、创建项目：五步走

1. 打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，扫码登录，点 **+** 新建；
2. **目录**选一个空文件夹，例如 `E:\MyGithub\mp-todolist`（建议新起一个，别在 lab2 上改——实验台和产品混在一起，两边都会变脏）；
3. **AppID** 怎么选见下一节；
4. **后端服务 / 云开发**：都不选。本地 TodoList 不发任何网络请求，纯前端；
5. **模板**：选空白（不使用模板），创建。

编译通过后模拟器会出现一个空首页。目录复习（细节见基础篇 [01](/微信小程序/basics/mp-01-what-is-miniprogram)「一个小程序由什么组成」）：

| 文件 | 层级 | 管什么 |
|------|------|--------|
| `app.js` | 全局 | 整个小程序唯一的 `App` 实例（生命周期挂钩子、`globalData`） |
| `app.json` | 全局 | 户口本：页面路径、窗口样式、分包等全局配置 |
| `app.wxss` | 全局 | 公共样式 |
| `project.config.json` | 工程 | 工具与 AppID 相关配置（写代码时不太动它） |
| `project.private.config.json` | 工程 | 个人本地配置（可被 .gitignore 忽略，见第四节） |
| `sitemap.json` | 全局 | 搜索收录规则，教程保持默认 `allow` 即可 |
| `pages/index/` 四件套 | 页面 | 唯一业务页：结构 / 数据 / 样式 / 配置 |

## 二、AppID 三选一：是什么、怎么选

创建项目时工具会问你要 AppID。它是什么？——小程序在微信体系里的**身份证号**，决定了代码上传到谁的名下、谁能预览、真机上以谁的身份运行。三种拿法各有适用场景：

| 方式 | 怎么获得 | 能干什么 | 适合谁 |
|------|----------|----------|--------|
| **测试号** | 工具创建页一键申请 | 开发调试全够用，不能发布 | 跟做本系列的读者（推荐） |
| **正式 AppID** | [公众平台](https://mp.weixin.qq.com/)注册小程序 | 开发 + 预览 + 上传 + 发布 | 要发布的产品 |
| **`touristappid`** | 填这串固定字符串 | 游客模式，功能受限 | 公开教程仓默认值，clone 即编译 |

一个实测现象提前打招呼：成品仓提交的 `project.config.json` 里写的是 `touristappid`；但用自己账号在工具里**导入**这个仓库后，工具会自动把它改写为你当前账号可用的 AppID——本机导入后 `git diff` 立刻能看到这处本地改动：

```diff
-  "appid": "touristappid",
+  "appid": "wx591e9dc9f810b78d",
```

所以教程类公开仓适合默认 `touristappid`（clone 即编译），跟做时也**不必把这处工具自动改动提交回去**——它属于你的个人环境（这正是 `.gitignore` 分层思想的又一处体现：环境差异留在本地）。

## 三、app.json 逐段拆解

创建完成后，把 `app.json` 改成本系列要用的样子（这也是成品仓的最终形态）：

```json
{
  "pages": [
    "pages/index/index"
  ],
  "window": {
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTitleText": "TodoList",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f5f5f5"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

逐段看：

| 段 | 含义 | 为什么这么写 |
|----|------|--------------|
| `pages` | 全小程序的户口本，**第一项就是首页** | TodoList 只有一个页面，所以只有一行 |
| `window` | 所有页面共享的窗口默认样式 | 标题改 `TodoList`——本篇「看得见」的验收点 |
| `style: "v2"` | 用新版组件默认样式 | 新项目一律 v2，老样式只为兼容存量 |
| `sitemapLocation` | 指向收录规则文件 | 默认不动 |
| `lazyCodeLoading` | **按需注入**：只注入当前页面用到的组件代码 | 官方推荐的启动优化，一行配置白拿（基础篇 [13](/微信小程序/basics/mp-13-subpackages-performance) 展开过启动性能） |

`lazyCodeLoading` 不是摆设，它真的会说话——本系列后面几篇用官方 automator 驱动这个项目时，Console 第一屏就有它的自我介绍：

```text
[info] Lazy code loading is enabled. Only injecting required components.
```

## 四、两份 project 文件：谁入库、谁不入

细看仓库根目录，工具配置有两份，分工是「团队共享 / 个人私有」：

- **`project.config.json`**——团队共享：AppID、编译选项、打包设置。**入库**。
- **`project.private.config.json`**——个人本地：调试基础库版本（`libVersion: "3.17.1"`）、热重载开关（`compileHotReLoad`）这类「我的习惯」。工具会提示它可被忽略，成品仓的 `.gitignore` 里也确实有一行：

```text
# WeChat DevTools local / private settings
project.private.config.json
```

这个分层解决的是协作场景的经典矛盾：A 喜欢热重载、B 喜欢手动编译，各写各的 private 文件，互不污染共享配置。

## 五、第一次真跑：拿一行属于自己的日志

工程跑没跑起来，最有说服力的证据是逻辑层的代码真的执行了。在 `app.js` 里加一行日志（成品仓原样）：

```js
// app.js
App({
  onLaunch() {
    console.log('[todo] App onLaunch')
  },
  globalData: {
    version: '1.0.0'
  }
})
```

用官方 [miniprogram-automator](https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/)（后面几篇的实验都靠它驱动模拟器，等于「程序化的手」）连上本项目，Console 输出：

```text
[log] [todo] App onLaunch
```

`onLaunch` 是小程序生命周期最早的钩子（时机细节见基础篇 [07](/微信小程序/basics/mp-07-lifecycle)）——这行日志打出来，意味着代码包已被装载、`App` 实例已构造、你的逻辑层线程正式开工。**这就是本篇的验收**。

手动路径等价操作：直接在工具里点「编译」，Console 面板里能看到同一行。

## 六、易混点：编译、预览、上传

| 操作 | 做什么 | 产物给谁看 |
|------|--------|-----------|
| **编译** | 在模拟器里重新构建运行 | 自己（改代码后随手点） |
| **预览** | 生成二维码，真机微信扫码运行开发版 | 自己 / 少数同事 |
| **上传** | 把代码传到微信后台成为「开发版本」 | 走审核链路，面向发布（第 5 篇收尾清单会用到） |

本篇及接下来三篇只需要「编译」。

## 小结

- 实战篇的目标是**一个产品**，不是一堆卡片：五篇做出可用的本地 TodoList；
- 空白工程 + 单页 `pages/index` + 标题改 `TodoList`，地基就打完了；
- AppID 三选一：跟作用**测试号**，发布用正式 AppID，公开教程仓用 `touristappid`；导入仓库后工具会自动把它改写成你的 AppID，这处本地改动不必提交；
- `app.json` 是户口本：`pages` 定首页、`window` 定全局样式、`lazyCodeLoading` 是一行白拿的启动优化；
- 工程配置分两层：`project.config.json` 入库共享，`project.private.config.json` 个人私有；
- 验收标准是 Console 里那行 `[todo] App onLaunch`。

**思考题**：

1. 为什么实战仓库只留 `pages/index` 一个页面，而不是一上来就搭「首页 / 我的」双 tabBar？——提示：产品最小闭环 vs 结构完备，哪个先来？
2. 把 `pages` 数组里的 `pages/index/index` 删掉再编译，会发生什么？为什么说「没登记的页面不存在」是户口本的硬规矩？
3. `lazyCodeLoading: "requiredComponents"` 对单页面的 TodoList 几乎没有收益，为什么还是建议写上？

> **参考**（2026-08 核验）：[起步 · 目录结构](https://developers.weixin.qq.com/miniprogram/dev/framework/structure.html)｜[小程序开发指南 · 创建项目](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/)｜[app.json 配置参考（含 lazyCodeLoading）](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html)｜成品：[mp-todolist](https://github.com/code-corey/mp-todolist)
