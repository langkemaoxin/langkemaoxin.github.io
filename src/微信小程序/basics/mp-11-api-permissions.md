---
title: API 与权限——request、域名白名单和 Storage
sidebarGroup: 小程序基础
shortTitle: 11 API 与权限
order: 11
date: 2026-08-28T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - wx.request
  - 合法域名
  - Storage
  - 小程序入门系列
description: 小程序能力通过 wx.* API 暴露。本篇用 Storage 持久化待办，并用 JSONPlaceholder 请求打出真实报错 request:fail url not in domain list，讲清开发期「不校验合法域名」与正式环境白名单的差别。
---

> **小程序开发系列 · 第 11/14 篇**  
> 上一篇：[《自定义组件》](/微信小程序/basics/mp-10-custom-components)  
> 下一篇：[《Skyline》](/微信小程序/basics/mp-12-skyline-glass-easel)

---

## 开头：逻辑层的手伸向系统

前面几篇几乎都在「页面自己的数据」里打转。真要联网、存盘、读相册，必须走 **`wx.*` API**：逻辑层发请求 → 客户端 / 基础库执行 → 回调或 Promise 回逻辑层。本篇抓住两条最常用的线：

1. **Storage**：本地键值存储（待办持久化）；
2. **`wx.request`**：HTTPS 请求 + **合法域名白名单**（真机/正式环境必过）。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | Storage 读写 | 刷新列表后重启仍在 |
| **2** | `wx.request` 失败原文 | `url not in domain list` |
| **3** | 权限与开发开关 | 「不校验合法域名」是什么 |

## 一、API 地图（知道分类即可）

| 类别 | 例子 | 备注 |
|------|------|------|
| 网络 | `wx.request` `wx.uploadFile` | 正式环境要配合法域名 |
| 存储 | `wx.setStorage` / `Sync` | 上限约 10MB（截至 2026-08 官方口径） |
| 路由 | `wx.navigateTo` 等 | 06 篇已讲 |
| 界面 | `wx.showToast` `wx.showModal` | 反馈与弹窗 |
| 媒体 / 位置 / 设备 | 选图、定位、蓝牙… | 多数要**用户授权** scope |
| 开放接口 | 登录、分享、支付 | 依赖 AppID 与后台配置 |

回调风格与 `wx.promisify` / 基础库 Promise 化并存；本实验用经典 `success` / `fail`，读日志最直观。

## 二、Storage：待办落盘

实验里每次改 `todos`（下拉新增、组件 toggle/删除）都会：

```js
wx.setStorageSync('mp_demo_todos', todos)
```

启动 `onLoad` 时再 `getStorageSync` 读回。09/10 实测连带打出：

```text
[11] setStorageSync 成功，条数 = 4
```

清除按钮走 `removeStorageSync`——你日志里的：

```text
[11] removeStorageSync 已清 mp_demo_todos
```

同步 API 写起来短，但大数据量会卡住逻辑层；正式项目大 JSON 更倾向异步 `wx.setStorage`。单用户待办演示用 Sync 足够。

## 三、实验：撞上合法域名墙

```js
wx.request({
  url: 'https://jsonplaceholder.typicode.com/todos?_limit=3',
  success(res) { /* ... */ },
  fail(err) {
    console.log('[11] request fail，errMsg =', err.errMsg)
  }
})
```

开发者工具里：**详情 → 本地设置 →「不校验合法域名…」**：

| 开关 | 含义 |
|------|------|
| **勾选** | 开发期放行，未配白名单也能请求（仅工具） |
| **不勾选** | 按正式规则校验，域名不在列表就失败 |

> ✅ **实测**（2026-08-20，基础库 3.17.1，**关闭**「不校验合法域名」后请求）：

```text
[11] wx.request → https://jsonplaceholder.typicode.com/todos?_limit=3
request 合法域名校验出错
https://jsonplaceholder.typicode.com 不在以下 request 合法域名列表中，请参考文档：…
[11] request fail，errMsg = request:fail url not in domain list
```

这就是正式环境会遇到的墙。工具还提示：白名单在微信公众平台配置，改完后要在「详情 - 域名信息」刷新。列表里若只看到 `https://tcb-api.tencentcloudapi.com` 之类，是当前 AppID 已配的域名——**没有** `jsonplaceholder.typicode.com`。

正式上线路径：

1. 服务器 **HTTPS**（且通常要备案，按平台当期规则）；
2. 公众平台 → 开发 → 开发管理 → 服务器域名 → request 合法域名；
3. 真机预览 / 正式版**没有**「不校验」开关，漏配必挂。

> ⏳ **待实测（可选）**：重新勾选「不校验合法域名」后再点请求，应走 `success`，`statusCode` 为 200，界面列出 3 条 title。通了把日志贴回可替换本段。

## 四、权限 scope（预告）

读相册、定位、摄像头等会弹系统授权框，对应 `scope.*`；用户拒绝后要引导去设置页。本系列 demo 未申请这类权限；记住：**能力越敏感，越要有失败分支与文案**，不要假设 `success` 总会来。

## 小结

- `wx.*` 是逻辑层调用客户端能力的唯一正门；
- Storage 适合本地草稿 / 缓存；同步 API 简单，重活用异步；
- **`request:fail url not in domain list`** = 域名白名单未配置（或开发期关掉了「不校验」）；
- 「不校验合法域名」**只骗得了开发者工具**，骗不了真机正式版。

**思考题**：

1. 为什么教程里常说「先勾选不校验，本地调通；上线前关掉并配好域名」？
2. `setStorageSync` 把整个 `todos` 数组塞进去，和只存「脏标记 + 上次同步时间」相比，各适合什么场景？
3. 若接口是 HTTP 而不是 HTTPS，正式环境通常会怎样？（结合平台网络规范答）

> **参考**：[网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)｜[wx.request](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)｜[存储](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html)
