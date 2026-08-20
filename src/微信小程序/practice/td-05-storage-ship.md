---
title: 持久化与收尾——Storage 与上线检查
sidebarGroup: 小程序实战
shortTitle: "05 持久化收尾"
order: 5
date: 2026-09-05T00:00:00.000Z
category: 小程序
tag:
  - 微信小程序
  - TodoList
  - Storage
  - 实战收官
description: 用 wx.setStorageSync / getStorageSync 持久化 todos；补充 pendingCount 统计；给出真机与上传检查清单，并链回基础系列。TodoList 实战篇收官。
---

> **小程序实战 · TodoList · 第 5/5 篇**  
> 上一篇：[《删除与组件化》](/微信小程序/practice/td-04-delete-component)  
> 成品仓库：[mp-todolist](https://github.com/code-corey/mp-todolist)  
> 基础理论：[小程序基础系列](/微信小程序/basics/mp-01-what-is-miniprogram)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | Storage 读写 | 杀掉进程再进，列表还在 |
| **2** | 未完成计数 | 顶栏显示 pending |
| **3** | 收尾清单 | 知道如何预览 / 上传 |

理论复习：[11 API 与 Storage](/微信小程序/basics/mp-11-api-permissions)｜[14 发布](/微信小程序/basics/mp-14-publish)。

## 一、持久化

约定 key：`todolist_items`。

```js
const STORAGE_KEY = 'todolist_items'

persist(todos) {
  try {
    wx.setStorageSync(STORAGE_KEY, todos)
  } catch (e) {
    console.log('setStorageSync fail', e)
  }
},

loadTodos() {
  try {
    const cached = wx.getStorageSync(STORAGE_KEY)
    const todos = Array.isArray(cached) ? cached : []
    this.setData({
      todos,
      pendingCount: todos.filter((t) => !t.done).length
    })
  } catch (e) {
    console.log('getStorageSync fail', e)
  }
},

onLoad() {
  this.loadTodos()
}
```

在每次 `setData` 改 `todos` 之后调用 `this.persist(todos)`（添加 / 勾选 / 删除三处）。

验收：添加几条 → 工具里点编译或清后台重进 → 列表仍在。

> 教程用 Sync API 足够；数据很大时再改异步 `wx.setStorage`。

## 二、未完成计数（可选但友好）

```js
computePending(todos) {
  return todos.filter((t) => !t.done).length
}
```

```xml
<view class="stats">
  <text>共 {{todos.length}} 项</text>
  <text>未完成 {{pendingCount}}</text>
</view>
```

每次改列表时一并 `setData({ pendingCount: … })`。

## 三、成品对照

完整项目：[github.com/code-corey/mp-todolist](https://github.com/code-corey/mp-todolist)

| 路径 | 职责 |
|------|------|
| `pages/index/*` | 输入、列表状态、Storage |
| `components/todo-item/*` | 单行展示与 toggle/remove 事件 |
| `app.json` | 单页、窗口标题 TodoList |
| `project.config.json` | 默认 `touristappid`，可换成你的 AppID |

## 四、上线前小清单

- [ ] 换成自己的 AppID（若要传体验版 / 正式版）  
- [ ] 真机预览：添加 / 勾选 / 删除 / 杀进程再开  
- [ ] 本实战**无网络请求**，一般不必配服务器域名  
- [ ] 上传备注写清版本（如 `1.0.0`）  
- [ ] 若只给自己用：开发版预览即可，不必强求审核

更完整的四态说明见基础篇 [14 发布上线](/微信小程序/basics/mp-14-publish)。

## 五、你已经走完的路径

1. 建项目 → 2. 静态列表 → 3. 添加与勾选 → 4. 删除与组件 → **5. 持久化**  

若还想加料（自行练习，本系列不展开）：

- 编辑文案、清空已完成、拖拽排序；  
- 云开发多人同步；  
- 拆「已完成」二级页（练习路由与页面栈）。

需要机制时，回到[基础篇目录](/微信小程序/)按主题查阅。

## 小结

- `setStorageSync` / `getStorageSync` 让本地 Todo 跨会话存活；  
- 组件负责交互意图，页面负责状态与落盘；  
- 实战篇完结——去基础篇查原理，用本仓库继续改功能。

**思考题**：

1. 用户清除微信缓存后，Storage 里的待办会怎样？若要「云端备份」缺哪一层？  
2. 为什么 `onLoad` 读 Storage 比写在 `data: { todos: [...] }` 初始值更合适？  
3. 同一台手机两个小程序 AppID，Storage 会互相覆盖吗？

> **参考**：[本地缓存](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html)｜成品：[mp-todolist](https://github.com/code-corey/mp-todolist)
