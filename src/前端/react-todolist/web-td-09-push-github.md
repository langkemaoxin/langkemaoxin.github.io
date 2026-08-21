---
title: 把代码推上 GitHub
sidebarGroup: React TodoList 实战
shortTitle: "09 推上 GitHub"
order: 9
date: 2026-08-21T08:00:00.000Z
category: 前端
tag:
  - Git
  - GitHub
  - gh
  - TodoList
description: 先写一份给路人看的 README，再用最小集的 Git 命令完成提交，最后用 GitHub CLI 一条命令建远程仓并推送；含双账号切换与常见坑。
---

> **Web · React TodoList · 第 9/10 篇**  
> 上一篇：[《运行与打包》](/前端/react-todolist/web-td-08-run-build) · 下一篇：[《部署 GitHub Pages》](/前端/react-todolist/web-td-10-deploy-pages)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[49378ef](https://github.com/code-corey/web-todolist/commit/49378ef) `Add project README`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | README | 打开仓库首页 30 秒看懂这是什么 |
| **2** | 远程仓 | GitHub 上能浏览全部源码 |
| **3** | 干净 | node_modules / dist 一个字节都没上去 |

## 开头：代码为什么要离开你的电脑

本地仓库（第 02 篇 `git init` 建的那个）已经记住了每一步历史，但它有三个天然缺陷：硬盘坏了全没了、别人看不到、没有公网地址。**GitHub 一并解决**：云端的仓库副本 + 浏览代码的页面 + 一个 URL——而且这个 URL 是下一篇部署的入场券：GitHub Pages 只服务 GitHub 上的仓库。

## 一、先写 README：仓库的门面

路人（包括三个月后的你）打开仓库，第一眼看的就是首页的 `README.md`。它要回答三个问题：这是什么、长什么样、怎么跑起来。替换模板自带的英文 README，核心结构：

```markdown
# web-todolist

一个用 Vite + React + TypeScript 从零写成的 TodoList，
配合同名博客系列《React TodoList 实战》食用。

线上体验：<部署地址，下一篇补上>

## 功能
- 添加 / 勾选 / 删除 / 筛选 / 清空已完成
- localStorage 持久化

## 开发
npm install
npm run dev

## 构建
npm run build && npm run preview
```

完整版（含技术栈版本表和目录结构）见成品仓 [README.md](https://github.com/code-corey/web-todolist/blob/master/README.md)。写 README 的心法：**写给不知道上下文的陌生人**，不要写给今天的自己。

```bash
git add README.md
git commit -m "Add project README"
```

## 二、推送前的检查

```bash
git status          # 确认没有意外文件
git log --oneline   # 应该能看到从第 02 篇以来的 8 个 commit
```

`git status` 里不应出现 `node_modules/` 和 `dist/`——第 08 篇的 `.gitignore` 在岗。如果看到它们，先回头补 `.gitignore` 再继续。

## 三、建远程仓并推送

### 方式 A：GitHub CLI 一条命令（本机所用）

前置：安装 [GitHub CLI](https://cli.github.com/) 并 `gh auth login` 登录。一条命令建仓 + 关联 + 推送：

```bash
gh repo create web-todolist --public --source=. --remote=origin --push
```

逐段拆解：

| 片段 | 含义 |
|------|------|
| `web-todolist` | 远程仓库名（跟本地目录同名，纯约定，也可以不同） |
| `--public` | 公开仓——Pages 部署需要；想先私有可以换 `--private`，部署前再改 |
| `--source=.` | 用当前目录这个本地仓库作为来源 |
| `--remote=origin` | 给远程地址起个别名叫 `origin`（惯例名） |
| `--push` | 立即推送当前分支 |

**双账号注意**：一台机器登多个 GitHub 账号时（本机就有两个），先确认当前激活的是哪个：

```bash
gh auth status      # 看 Active account
gh auth switch      # 不对就切
```

推错了账号不致命——`gh repo delete` 删掉重来（需要 `delete_repo` 权限）。

### 方式 B：网页 + 三条命令

不装 CLI 的话：网页上 New repository 建一个**空**仓（不要勾任何初始化选项），然后：

```bash
git remote add origin https://github.com/<你的用户名>/web-todolist.git
git branch -M main          # 如需把 master 统一改名 main
git push -u origin main
```

`-u` 把本地分支和远程分支「绑定」，之后 `git push` 三个字母就够。

## 四、验收

浏览器打开 `https://github.com/code-corey/web-todolist`（换成你的用户名）：

- 首页显示 README 渲染后的门面
- `src/components/` 四个组件、`types.ts`、8 个 commit 都在
- 仓库里**没有** `node_modules`（有就说明 `.gitignore` 失守，见下表）

## 常见坑

| 现象 | 原因与处理 |
|------|-----------|
| push 报 403 / 认证失败 | 凭证登的是另一个账号；`gh auth switch` 后重推 |
| 远程比我多东西，push 被拒 | 远程建仓时勾了 README/.gitignore 初始化；`git pull --rebase origin main` 合并后再推 |
| 误把 node_modules 推上去了 | 先补 `.gitignore`，再 `git rm -r --cached node_modules` + commit |
| 本地分支叫 master，远程叫 main | 无碍，`git branch -M main` 统一后推；不统一也行，绑定好即可 |

## 小结

- README 写给陌生人：是什么、怎么跑
- `gh repo create --source=. --push` 一条龙；双账号先 `gh auth status`
- `.gitignore` 保证推上去的只有源码——「源码即全部真相，其余皆可再生」

代码已经有了公网的家。最后一篇：让 TodoList 变成一个发给别人就能用的**网址**——GitHub Pages 自动部署，push 即上线。
