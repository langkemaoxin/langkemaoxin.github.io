---
title: 跑起来与打包——dev 和 build
sidebarGroup: React TodoList 实战
shortTitle: "08 运行打包"
order: 8
date: 2026-08-21T07:00:00.000Z
category: 前端
tag:
  - Vite
  - npm
  - build
  - TodoList
description: 讲清 npm run dev 与 npm run build 的区别，检查 TypeScript 与产物 dist，并为提交 Git 理清不该入库的文件。
---

> **Web · React TodoList · 第 8/10 篇**  
> 上一篇：[《样式》](/前端/react-todolist/web-td-07-styles) · 下一篇：[《推到 GitHub》](/前端/react-todolist/web-td-09-push-todolist-github)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 开发启动 | `npm run dev` 功能全可用 |
| **2** | 生产构建 | `npm run build` 成功 |
| **3** | 知道别提交啥 | 理解 `.gitignore` |

## 一、两个命令

`package.json` 里常见：

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

| 命令 | 干什么 | 给谁用 |
|------|--------|--------|
| `npm run dev` | 开发服务器 + 热更新 | 你自己写代码时 |
| `npm run build` | 类型检查 + 打包进 `dist/` | 准备上线 / 验证能编译 |
| `npm run preview` | 本地预览 `dist` | 模拟生产静态站 |

开发时改的是 `src/`；用户访问的是构建后的静态文件。

## 二、构建成功长什么样

在项目根目录：

```bash
npm run build
```

成功后出现 `dist/`（HTML/CSS/JS）。  
若 TypeScript 报错，`tsc -b` 会先失败——修好类型再构建。

## 三、提交前检查清单

1. 添加 / 勾选 / 删除 / 筛选 / 刷新仍在  
2. `npm run build` 退出码 0  
3. 确认 `.gitignore` 含：

```gitignore
node_modules
dist
*.local
```

**不要**把 `node_modules` 推进 GitHub（又大又可用 `npm install` 还原）。

## 四、标题与入口（可选打磨）

`index.html` 的 `<title>` 可改成 `TodoList · Test1`，浏览器标签更清晰。

下一篇：初始化 Git，创建 GitHub 仓库并 push。
