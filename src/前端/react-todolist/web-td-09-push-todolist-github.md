---
title: 把 TodoList 推送到 GitHub
sidebarGroup: React TodoList 实战
shortTitle: "09 推代码仓"
order: 9
date: 2026-08-21T08:00:00.000Z
category: 前端
tag:
  - Git
  - GitHub
  - gh
  - TodoList
description: 为 TodoList 初始化 Git、写首 commit，用 GitHub CLI 创建公开仓库 web-todolist 并 push；说明常见坑。
---

> **Web · React TodoList · 第 9/10 篇**  
> 上一篇：[《运行与打包》](/前端/react-todolist/web-td-08-run-build) · 下一篇：[《推送博客》](/前端/react-todolist/web-td-10-publish-blog)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 本地 Git | 至少 1 个 commit |
| **2** | 远程仓库 | GitHub 上能打开代码 |
| **3** | README | 别人知道如何 `npm run dev` |

本系列成品示例账号为 **code-corey**，仓库名 **web-todolist**。你可换成自己的用户名。

## 一、写好 README（给路人看）

项目根目录 `README.md` 建议包含：

- 这是什么（Vite + React TodoList）  
- 如何安装与启动  
- 功能列表  

## 二、初始化并提交

在项目根目录（例如 `E:\FrontHeadTranning\Test1`）：

```bash
git init
git add .
git status
git commit -m "Add Vite React TodoList with localStorage"
```

确认 `git status` 里**没有** `node_modules`。

## 三、用 GitHub CLI 创建并推送

先登录并切换到目标账号（若本机有多账号）：

```bash
gh auth status
gh auth switch
```

然后：

```bash
gh repo create web-todolist --public --source=. --remote=origin --push
```

含义：

- 在当前 GitHub 用户下创建公开仓 `web-todolist`  
- 把本地目录设为 `origin`  
- 直接 `push`

也可网页新建空仓库，再：

```bash
git branch -M main
git remote add origin https://github.com/<你的用户名>/web-todolist.git
git push -u origin main
```

## 四、验收

浏览器打开：`https://github.com/code-corey/web-todolist`（或你的地址）  
应能看到 `src/App.tsx` 等源码，而不是只有 `node_modules`。

## 五、常见坑

| 现象 | 处理 |
|------|------|
| push 被拒、账号不对 | `gh auth switch` 到正确用户 |
| 误提交 node_modules | 从 `.gitignore` 排除后删缓存再提交（慎用强推） |
| 默认分支叫 master | 与远程约定一致即可，或统一改 `main` |

下一篇：把这套教程写进 `langkemaoxin.github.io`（VuePress 站）并推送上线。
