---
title: 名词词典——读懂项目里的黑话
sidebarGroup: React TodoList 实战
shortTitle: "03 名词词典"
order: 3
date: 2026-08-21T02:00:00.000Z
category: 前端
tag:
  - 名词
  - React
  - Vite
  - TypeScript
description: 用白话解释 Node、npm、Vite、React、组件、JSX、TypeScript、状态、hooks、构建、Git 等本系列会反复出现的概念。
---

> **Web · React TodoList · 第 3/10 篇**  
> 上一篇：[《新建项目》](/前端/react-todolist/web-td-02-create-vite-project) · 下一篇：[《类型与状态》](/前端/react-todolist/web-td-04-types-and-state)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

读完能把下面表格里的词用「自己的话」复述一遍。后面遇到不懂的，先回本篇。

## 工具链

| 名词 | 白话 |
|------|------|
| **Node.js** | 让电脑能跑 JavaScript 的运行环境（不只在浏览器里） |
| **npm** | Node 的包管理器：安装依赖、执行 `package.json` 里的脚本 |
| **依赖 / node_modules** | 别人写好的库；装在本机 `node_modules`，一般不进 Git |
| **Vite** | 开发时起本地服务器、打包发布的工具 |
| **脚手架** | 一键生成项目骨架（`npm create vite`） |
| **HMR** | 改代码后页面局部热更新，不用整页刷新 |

## React 相关

| 名词 | 白话 |
|------|------|
| **React** | 用「组件」拼界面的库 |
| **组件（Component）** | 一段可复用的 UI + 逻辑，本项目主组件是 `App` |
| **JSX** | 在 JS/TS 里写「长得像 HTML」的语法，编译后变成真实 DOM 操作 |
| **Props** | 父组件传给子组件的参数（本系列最小版几乎没用到拆分） |
| **State（状态）** | 组件自己记得的数据；一变，界面跟着变 |
| **Hooks** | 在函数组件里用状态/副作用的钩子，如 `useState`、`useEffect` |

## TypeScript / 工程

| 名词 | 白话 |
|------|------|
| **TypeScript (TS)** | JavaScript + 类型；写错字段名编辑器会报警 |
| **类型 / interface** | 描述「一个对象有哪些字段」 |
| **构建（build）** | 把 TS/JSX 编译成浏览器能直接跑的静态文件（`dist/`） |
| **dev / prod** | 开发模式（方便调试）vs 生产模式（给用户访问） |

## 浏览器与数据

| 名词 | 白话 |
|------|------|
| **DOM** | 页面上的元素树 |
| **localStorage** | 浏览器本地键值存储，刷新不丢，关标签页也还在（同域名下） |
| **JSON** | 文本格式的数据交换；`JSON.stringify` / `JSON.parse` 常与 Storage 搭配 |

## Git / GitHub（第 09、10 篇）

| 名词 | 白话 |
|------|------|
| **Git** | 本地版本管理：记住每次提交 |
| **GitHub** | 托管 Git 仓库的网站 |
| **仓库（repository）** | 一个项目的 Git 家 |
| **commit** | 一次有说明的快照 |
| **push** | 把本地提交推到远程 |
| **GitHub Pages** | 用仓库内容当静态网站托管（本博客站即此类用法的增强版） |

下一篇开始写业务：先定义「一条待办长什么样」，再用 `useState` 管起来。
