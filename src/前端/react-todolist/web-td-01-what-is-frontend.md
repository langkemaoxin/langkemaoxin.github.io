---
title: 前端是什么，我们要做什么
sidebarGroup: React TodoList 实战
shortTitle: "01 前端是什么"
order: 1
date: 2026-08-21T00:00:00.000Z
category: 前端
tag:
  - React
  - TodoList
  - 入门
  - Vite
description: 用最直白的话讲清浏览器、网页、前端与后端；明确本系列要做出一个本地可用的 TodoList，并最终推到 GitHub。
---

> **Web · React TodoList · 第 1/10 篇**  
> 下一篇：[《从 0 新建 Vite 项目》](/前端/react-todolist/web-td-02-create-vite-project)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 心智模型 | 说得出「前端」管什么 |
| **2** | 产品目标 | 知道最终页面有哪些按钮 |
| **3** | 系列地图 | 知道后面 9 篇各自干什么 |

## 一、浏览器里发生了什么

你打开一个网址时，大致是：

1. **浏览器**向服务器要一份「说明书」（HTML）和配套的样式、脚本  
2. 浏览器按说明书画出按钮、输入框、列表  
3. 你点击、输入时，**JavaScript** 决定页面怎么变  

写这些「说明书 + 样式 + 脚本」、让用户看得见摸得着的部分，就叫 **前端（Frontend）**。

相对地，存数据、算业务、管账号的服务器程序叫 **后端（Backend）**。本系列的 TodoList **不接后端**，数据存在浏览器本地，降低入门门槛。

## 二、我们要做的产品

一个单页 **TodoList**：

| 能力 | 说明 |
|------|------|
| 添加 | 输入文字，回车或点「添加」 |
| 勾选 | 标记完成 / 取消完成 |
| 删除 | 删掉一条 |
| 筛选 | 全部 / 未完成 / 已完成 |
| 持久化 | 刷新浏览器，列表还在 |
| 收尾 | 清空已完成；把代码与教程推到 GitHub |

技术选型（行业常见入门组合）：

- **Vite**：本地开发服务器，改代码立刻刷新  
- **React**：用组件拼页面  
- **TypeScript**：给数据加「形状」说明，少写错字段  

成品代码对照仓库：[web-todolist](https://github.com/code-corey/web-todolist)（本地练习目录也可以是 `E:\FrontHeadTranning\Test1`）。

## 三、系列地图（10 篇）

| 篇 | 主题 |
|----|------|
| 01 | 前端是什么（本篇） |
| 02 | 用脚手架新建项目 |
| 03 | 名词词典 |
| 04 | 类型与状态 |
| 05 | 搭出增删改查 UI |
| 06 | localStorage 持久化 |
| 07 | 样式 |
| 08 | 运行与打包 |
| 09 | 推 TodoList 到 GitHub |
| 10 | 把本系列写进博客站并推送 |

## 四、你需要准备什么

1. 安装 [Node.js](https://nodejs.org/)（建议 LTS，自带 `npm`）  
2. 一个编辑器（推荐 [Cursor](https://cursor.com/) / VS Code）  
3. 一个 GitHub 账号（第 09、10 篇用）  
4. （可选）本机已装 [Git](https://git-scm.com/) 与 [GitHub CLI `gh`](https://cli.github.com/)

下一篇我们真正动手：在空文件夹里创建 Vite + React + TypeScript 项目。
