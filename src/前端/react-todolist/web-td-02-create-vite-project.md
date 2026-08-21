---
title: 从 0 新建 Vite + React + TypeScript 项目
sidebarGroup: React TodoList 实战
shortTitle: "02 新建项目"
order: 2
date: 2026-08-21T01:00:00.000Z
category: 前端
tag:
  - Vite
  - React
  - TypeScript
  - 脚手架
description: 用 npm create vite 创建 React TypeScript 模板，安装依赖并 npm run dev 跑起默认演示页，认清目录职责。
---

> **Web · React TodoList · 第 2/10 篇**  
> 上一篇：[《前端是什么》](/前端/react-todolist/web-td-01-what-is-frontend) · 下一篇：[《名词词典》](/前端/react-todolist/web-td-03-nouns)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 空项目 | `npm run dev` 能打开页面 |
| **2** | 认目录 | 说得出 `src/App.tsx` 是主页面 |
| **3** | 热更新 | 改一行字保存后浏览器自动变 |

## 一、创建项目

在终端进入你想放练习的父目录，例如：

```bash
cd E:\FrontHeadTranning
npm create vite@latest Test1 -- --template react-ts
cd Test1
npm install
npm run dev
```

说明：

- `create vite`：官方脚手架，按模板生成文件  
- `--template react-ts`：React + TypeScript  
- `npm install`：下载 `node_modules`（依赖包，体积大，不要手改）  
- `npm run dev`：启动开发服务器，默认一般是 `http://localhost:5173`

浏览器应看到 Vite/React 的「Get started / Count」演示页——这是空壳，还不是 TodoList。

## 二、目录长什么样

重点只记这些：

```text
Test1/
├── index.html          # 浏览器入口 HTML，里面有 <div id="root">
├── package.json        # 项目名、依赖、脚本（dev/build）
├── vite.config.ts      # Vite 配置
├── src/
│   ├── main.tsx        # 把 React 挂到 #root
│   ├── App.tsx         # 主界面（后面会整页重写）
│   ├── App.css         # 组件样式
│   └── index.css       # 全局样式
└── node_modules/       # 依赖（gitignore，不提交）
```

启动链路（心智模型）：

```text
index.html
  → 加载 /src/main.tsx
    → 渲染 <App />
      → 你在浏览器里看到的页面
```

## 三、试一下热更新（HMR）

打开 `src/App.tsx`，把标题「Get started」改成「Hello Todo」，保存。  
浏览器应**不用手动刷新**就变——这就是 Vite 的 HMR（热模块替换）。

## 四、和成品仓的关系

本系列后续代码以成品 [web-todolist](https://github.com/code-corey/web-todolist) 为准。你本地可以：

- 继续在空壳上跟着改；或  
- 直接 clone 成品对照阅读  

下一篇先把一路会撞上的名词讲清楚，再动手写业务代码。
