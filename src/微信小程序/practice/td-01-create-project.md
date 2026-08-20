---
title: 从 0 创建 TodoList 项目
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
description: 实战篇开篇：用微信开发者工具从空白模板创建最简 TodoList 小程序，认清 app 与 pages 目录，配置 AppID（可用测试号或 touristappid），为后面四篇的列表、交互、组件、持久化打底。
---

> **小程序实战 · TodoList · 第 1/5 篇**  
> 下一篇：[《画出列表页》](/微信小程序/practice/td-02-list-page)  
> 基础理论系列：[小程序基础 01–14](/微信小程序/basics/mp-01-what-is-miniprogram)  
> 成品仓库：[mp-todolist](https://github.com/code-corey/mp-todolist)

---

## 这一球要做成什么

五篇之后，你会得到一个能用的本地 TodoList：输入添加、点选完成、删除、关掉小程序再开数据还在。本篇只做地基——**项目在工具里跑起来**。

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 空白小程序工程 | 模拟器能编译，不报红 |
| **2** | 认目录 | 说得出 `app.*` 与 `pages/index` 各管什么 |
| **3** | AppID 策略 | 测试号 / 正式 AppID / `touristappid` 知道怎么选 |

## 一、你需要准备什么

1. 一台能装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)的电脑  
2. 一个微信（扫码登录工具）  
3. （推荐）在[公众平台](https://mp.weixin.qq.com/)注册小程序，或使用工具里的**测试号**

理论复习：基础篇 [02 第一个小程序](/微信小程序/basics/mp-02-first-miniprogram)。

## 二、创建项目

1. 打开微信开发者工具 → **+** 新建  
2. 目录选一个空文件夹，例如 `E:\MyGithub\mp-todolist`  
3. AppID：选测试号，或填自己的；本仓库默认写的是 `touristappid`（游客模式，方便公开教程）  
4. 后端服务 / 云开发：**都不选**（纯前端本地 Todo）  
5. 模板选**空白**（或「不使用模板」），创建  

编译成功后，模拟器里应能看到默认首页（可能是「hello world」一类占位）。

## 三、目录长什么样

最终成品结构（后面几篇会逐步填满）：

```text
mp-todolist/
├── app.js / app.json / app.wxss   # 全局
├── project.config.json           # 工具与 AppID
├── sitemap.json
├── pages/index/                  # 唯一业务页
│   ├── index.js
│   ├── index.json
│   ├── index.wxml
│   └── index.wxss
└── components/todo-item/         # 第 4 篇再抽
```

本篇你只要保证：`app.json` 的 `pages` 数组第一项是首页路径（一般是 `pages/index/index`）。

最小 `app.json` 示例：

```json
{
  "pages": ["pages/index/index"],
  "window": {
    "navigationBarTitleText": "TodoList",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f5f5f5"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

把导航栏标题改成 `TodoList`，点编译——标题栏应变过来。这就是本篇的「看得见」的验收。

## 四、和基础系列 demo 的关系

| 仓库 | 用途 |
|------|------|
| [mp-demo-lab2](https://github.com/code-corey/mp-demo-lab2) | 基础篇实验台（卡片很多） |
| [mp-todolist](https://github.com/code-corey/mp-todolist) | **本实战成品**（只做一件事） |

跟做时建议**单独建** `mp-todolist`，不要在 lab2 上改——心智更干净。也可以直接 clone 成品对照，但建议前三篇自己敲。

## 小结

- 空白项目 + 唯一首页路径，就是 TodoList 的起点；  
- AppID 用测试号即可跟做；公开仓库可用 `touristappid`；  
- 下一篇开始往首页塞「假数据列表」。

**思考题**：为什么实战仓库只留一个 `pages/index`，而不是一上来就做「我的」tabBar？

> **参考**：[起步](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/)｜成品：[mp-todolist](https://github.com/code-corey/mp-todolist)
