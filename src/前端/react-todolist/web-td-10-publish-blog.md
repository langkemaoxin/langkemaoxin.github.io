---
title: 把教程写进博客站并推送到 GitHub
sidebarGroup: React TodoList 实战
shortTitle: "10 推送博客"
order: 10
date: 2026-08-21T09:00:00.000Z
category: 前端
tag:
  - VuePress
  - GitHub
  - 博客
  - TodoList
description: 在 code-corey 的 VuePress 知识库中新增「前端」板块与十篇实战文，注册导航与侧栏，提交并 push；作为本系列收官。
---

> **Web · React TodoList · 第 10/10 篇**  
> 上一篇：[《推到 GitHub》](/前端/react-todolist/web-td-09-push-todolist-github)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 博客站：[code-corey.com](https://www.code-corey.com)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 文章进站 | `src/前端/react-todolist/` 下有系列 Markdown |
| **2** | 导航侧栏 | 顶栏有「前端」，侧栏能点开 01–10 |
| **3** | 远程更新 | push 后线上能打开本系列 |

## 一、本站是什么结构

本地常见路径：`E:\MyGithub\langkemaoxin.github.io`  
远程示例：`https://github.com/code-corey/code-corey.github.io`  
技术：**VuePress Theme Hope**，文档在 `src/`。

本系列目录约定：

```text
src/前端/
  README.md
  react-todolist/
    web-td-01-….md
    …
    web-td-10-….md
```

每篇需带 frontmatter（`title`、`sidebarGroup`、`shortTitle`、`order`、`tag`、`description` 等），风格对齐站内其他专栏。

## 二、注册模块（让侧栏生成器认识你）

1. 新增 `scripts/sidebar/前端.mjs`，配置子目录 `react-todolist` 的标题与图标  
2. 在 `scripts/sidebar.config.mjs` 的 `modules` / `folders` 里加入「前端」  
3. 在 `src/.vuepress/navbar.ts` 增加导航项指向 `/前端/`

本地预览：

```bash
pnpm install
pnpm docs:dev
```

（`docs:dev` 会先跑 `sidebar:gen` 再启动。）

## 三、提交并推送博客仓

```bash
cd E:\MyGithub\langkemaoxin.github.io
git status
git add src/前端 scripts/sidebar/前端.mjs scripts/sidebar.config.mjs src/.vuepress/navbar.ts
git commit -m "Add frontend React TodoList zero-to-github series"
git push origin master
```

分支名以你仓库实际为准（本站当前为 `master`）。

## 四、上线后怎么找

- 板块首页：`/前端/`  
- 第一篇：`/前端/react-todolist/web-td-01-what-is-frontend`  
- 顶栏点「前端」  

若开启了站点构建 CI，push 后等 Action 跑完再看；本地也可用 `pnpm docs:build` 先验构建。

## 五、系列回顾（10 球滚完）

| 篇 | 你得到了什么 |
|----|----------------|
| 01–03 | 目标与名词 |
| 04–07 | 可运行的 TodoList |
| 08 | 构建信心 |
| 09 | 代码在 GitHub |
| 10 | 教程在博客站 |

对照仓库：[web-todolist](https://github.com/code-corey/web-todolist)

若还想加料（本系列不展开）：编辑单条标题、拖拽排序、对接真实后端 API、部署到 Cloudflare Pages / Vercel。

恭喜完结。下一站可以去本站「微信小程序 · TodoList」对照同一产品在不同端的实现差异。
