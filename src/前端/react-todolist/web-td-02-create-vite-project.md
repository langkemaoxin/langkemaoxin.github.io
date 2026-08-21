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
description: 用 npm create vite 生成 react-ts 模板项目，逐个讲清目录职责与启动链路，实测 HMR 背后的真实机制，最后 git init 完成第一个 commit——从本篇起边写边建仓库。
---

> **Web · React TodoList · 第 2/10 篇**  
> 上一篇：[《前端是什么》](/前端/react-todolist/web-td-01-what-is-frontend) · 下一篇：[《类型与状态》](/前端/react-todolist/web-td-03-types-and-state)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[8a4014f](https://github.com/code-corey/web-todolist/commit/8a4014f) `Scaffold Vite + React + TypeScript project`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 空项目 | `npm run dev` 能打开演示页 |
| **2** | 认目录 | 说得出每个文件管什么、页面从哪开始渲染 |
| **3** | 仓库 | `git log` 里有第一个 commit |

## 开头：为什么不能像以前那样，新建一个 html 直接写

用 HTML 写网页的祖传流程：新建 `index.html`，双击，浏览器打开，写一行刷新一次。这套流程在第 01 篇的三件套世界里完全够用，但一旦引入 React 和 TypeScript 就会立刻翻车：

- 浏览器不认识 `.tsx` 里的 JSX 语法（`<h1>` 长在 JS 代码里），得有工具**实时翻译**
- React、TypeScript 这些库是别人写的，装在哪、怎么管版本，得有工具**统一收发**
- 开发时要「保存即生效」，发布时要压缩打包，得有工具**两种模式切换**

这三件事就是「前端工程化」要解决的。**Vite 就是干这个的工具**，而「脚手架」是 Vite 官方提供的命令，一键生成一个各就各位的项目骨架，让你跳过全部配置。

## 一、创建项目（真实输出）

在终端进入放练习的父目录（我本机是 `E:\MyGithub`，你可以换成自己的），执行：

```bash
npm create vite@latest web-todolist -- --template react-ts
```

逐段拆解这条命令：

| 片段 | 含义 |
|------|------|
| `npm create` | `npm` 的快捷方式，等价于 `npm init`，实际动作是 `npx create-vite` |
| `vite@latest` | 临时下载最新版 create-vite 脚手架来执行，**不装进**你的项目 |
| `web-todolist` | 项目目录名，也是 `package.json` 里的项目名 |
| `--` | 分隔线：后面的参数传给脚手架而不是 npm |
| `--template react-ts` | 指定 React + TypeScript 模板；指定后不再交互式提问 |

我本机的真实输出（2026-08，Node v25.7.0）：

```text
> npx
> create-vite web-todolist --template react-ts

│
◇  Scaffolding project in E:\MyGithub\web-todolist...
│
└  Done. Now run:

  cd web-todolist
  npm install
  npm run dev
```

它已经把话说明白了，照做：

```bash
cd web-todolist
npm install
```

`npm install` 读 `package.json` 里登记的依赖清单，把它们下载进本地的 `node_modules/` 目录（28 个包，几百 MB 属正常）。装完接着：

```bash
npm run dev
```

真实输出：

```text
> web-todolist@0.0.0 dev
> vite

  VITE v8.2.2  ready in 449 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

浏览器打开 `http://localhost:5173/`，能看到 Vite 8 模板的演示页（大标题 Get started、一个计数按钮、文档链接）。此刻它还是「别人家的页面」，但**项目已经活了**。

## 二、目录职责逐个认

```text
web-todolist/
├── index.html          # 浏览器入口：唯一的一份 HTML，里面有个 <div id="root">
├── package.json        # 项目名片：名字、依赖清单、三条命令
├── package-lock.json   # 依赖的精确版本锁定，保证别处安装结果一致
├── vite.config.ts      # Vite 的配置文件（第 10 篇会动它）
├── tsconfig.json       # TypeScript 配置的总入口
├── tsconfig.app.json   # 给 src/ 里「应用代码」的 TS 配置
├── tsconfig.node.json  # 给 vite.config.ts 这类「Node 侧代码」的 TS 配置
├── public/             # 原样拷贝进产物的静态资源（图标等）
├── src/                # ★ 你的主战场
│   ├── main.tsx        # JS 侧的入口：把 <App /> 挂到 index.html 的 #root 上
│   ├── App.tsx         # 页面主组件（后面会整页重写成我们的 TodoList）
│   ├── App.css         # App 组件的样式
│   ├── index.css       # 全局样式
│   └── assets/         # 被 import 引用的图片等资源
└── node_modules/       # 依赖本体，体积巨大，永远不手改、不提交
```

三个 tsconfig 为什么有三个？因为「浏览器里跑的业务代码」和「命令行里跑的构建配置」是两套运行环境，TypeScript 对它们启用不同的规则，拆开写互不干扰。现在只需要知道有这回事。

**启动链路**是这一篇最重要的心智模型：

```text
浏览器请求 /
  → 服务器返回 index.html（只有 <div id="root"> 一个空壳）
    → index.html 末尾引入 /src/main.tsx
      → main.tsx 把 <App /> 组件渲染进 #root
        → App.tsx 返回的 JSX 变成你看到的页面
```

所以改页面 = 改 `App.tsx`，其他文件几乎不用动。

## 三、实测 HMR：改一行字，页面自己变

打开 `src/App.tsx`，找到 `Get started`，改成 `Hello Todo`，保存。浏览器**不刷新**，标题原地变化——这就是 HMR（Hot Module Replacement，热模块替换）。

眼见为实之外，再往下一层看它背后的机制。开发服务器其实是把 `App.tsx` 现场翻译后发给浏览器的，用 curl 就能看到翻译结果（截取自本机真实返回）：

```js
import { createHotContext as __vite__createHotContext } from "/@vite/client";
import.meta.hot = __vite__createHotContext("/src/App.tsx");
...
/* @__PURE__ */ _jsxDEV("h1", { children: "Hello Todo" }, ...)
```

两行信息量很大：

1. 每个模块都被注入了 `createHotContext`——这是 Vite 客户端和这个模块之间的**热线电话**。文件一保存，Vite 通过这条线告诉浏览器「这个模块变了，换新的」，不用整页重载
2. JSX 的真面目：`<h1>...</h1>` 被翻译成了 `_jsxDEV("h1", ...)` 函数调用。**JSX 不是 HTML，是函数调用的糖**——这个认知第 04 篇渲染列表时会再用到

## 四、建仓：第一个 commit

从这一篇起，我们**边写边建仓库**：每篇结束把当时的代码提交一次，十篇走完正好十个 commit，和成品仓库一一对应。好处是任何一步跟丢了，都能 `git checkout` 到那一篇的现场。

```bash
git init
git add .
git commit -m "Scaffold Vite + React + TypeScript project"
```

提交前值得看一眼 `git status`：你会看到 `node_modules` 没有出现在待提交列表里——模板自带的 `.gitignore` 已经把它排除了（第 08 篇细讲为什么）。真实结果：

```text
8a4014f Scaffold Vite + React + TypeScript project
```

## 小结

- 脚手架一条命令生成骨架：`npm create vite@latest <目录> -- --template react-ts`
- 页面从 `index.html` 的 `#root` 开始，链路是 main.tsx 挂载 App.tsx
- HMR 的本质：模块级热替换，靠 `createHotContext` 这条热线；JSX 本质是函数调用
- 每篇一个 commit，文章与成品仓库同步演进

演示页还是模板的。下一篇开始写「我们的」代码：先回答「一条待办在程序里长什么样」，再让 React 替我们记住它。
