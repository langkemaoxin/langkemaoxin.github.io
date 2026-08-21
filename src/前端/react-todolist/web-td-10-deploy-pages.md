---
title: 部署上线——GitHub Pages 自动发布
sidebarGroup: React TodoList 实战
shortTitle: "10 部署上线"
order: 10
date: 2026-08-21T09:00:00.000Z
category: 前端
tag:
  - GitHub Actions
  - GitHub Pages
  - CI/CD
  - TodoList
description: 配好 vite base 与部署 workflow，启用 Pages 的 Actions 模式，真跑一次自动部署，拿到公网可访问的网址；push 即上线，为系列收官。
---

> **Web · React TodoList · 第 10/10 篇**  
> 上一篇：[《推上 GitHub》](/前端/react-todolist/web-td-09-push-github)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[58bb086](https://github.com/code-corey/web-todolist/commit/58bb086) `Deploy to GitHub Pages via Actions`  
> **线上成品：[www.code-corey.com/web-todolist](https://www.code-corey.com/web-todolist/)**

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 线上地址 | 任何人打开网址就能用 TodoList |
| **2** | 自动化 | 以后 push 代码，线上自动更新 |
| **3** | 收官 | 十个雪球滚完，从 0 到上线 |

## 开头：dist 躺在硬盘上，怎么变成「一个网址」

第 08 篇产出的 `dist/` 是一撮静态文件，静静躺在你的硬盘里。要让别人用，得有人干两件事：把它放到一台**公网可达的服务器**上，配一个**域名**。这类服务叫静态托管，选择一箩筐（Cloudflare Pages、Vercel、Netlify……）。

本篇选 **GitHub Pages**：GitHub 自带的静态托管，免费、零新账号、和刚推上去的仓库天然一家——从此**推代码就是发版**。

## 一、Pages 的两种玩法与一个关键坑

项目仓库开 Pages 后，页面挂在 `https://<用户名>.github.io/<仓库名>/` 这个**子路径**下。这个事实直接命中一个坑：

`dist/index.html` 里引用资源写的是 `/assets/xxx.js`——**以根路径开头**。挂在子路径下时浏览器会去 `https://用户名.github.io/assets/xxx.js` 找，404，页面白屏。

解法是告诉 Vite「我住在子路径里」，`vite.config.ts`：

```ts
export default defineConfig({
  // 部署在 https://<用户名>.github.io/web-todolist/ 子路径下，
  // 资源引用要带 /web-todolist/ 前缀，否则线上 404
  base: '/web-todolist/',
  plugins: [react()],
})
```

一行配置，效果立竿见影（本机构建产物真实对比）：

```text
改前：<script ... src="/assets/index-CvHI4nQW.js"></script>
改后：<script ... src="/web-todolist/assets/index-CvHI4nQW.js"></script>
```

> **易混点：什么时候需要 base**  
> 本地 dev / preview（根路径 `/`）不需要；部署到「仓库页」（子路径）**必须**配；如果你有自己的域名挂在根上，则不用。判断标准就一条：线上 URL 里页面是不是住在子目录里。

## 二、部署流水线：GitHub Actions

Pages 只会「托管」，构建还得有人干——手动每次 `npm run build` 再上传？违背「推代码即发版」。**GitHub Actions** 是 GitHub 内置的 CI/CD：仓库里放一个 workflow 文件，声明「什么时机、在什么环境、按什么步骤跑」，GitHub 的服务器替你执行。

新建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:        # 允许手动触发

permissions:
  contents: read            # 读代码
  pages: write              # 写 Pages
  id-token: write           # 部署凭证

concurrency:
  group: pages
  cancel-in-progress: true  # 新部署开始时，取消还在跑的旧部署

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7        # 拉代码

      - uses: actions/setup-node@v7      # 装 Node
        with:
          node-version: 24               # LTS 版本，CI 求稳不求新
          cache: npm

      - run: npm ci                      # 按锁定文件精确安装（比 install 更严）
      - run: npm run build               # 构建（含 tsc 类型检查）

      - uses: actions/configure-pages@v6 # 准备 Pages 环境
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist                     # 把 dist 打包成待部署产物

  deploy:
    needs: build                         # 等 build 成功
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}   # 部署完把网址写进运行记录
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5    # 正式发布
```

三段式结构：`on`（push 到 master 就触发）→ `build` job（_checkout → 装 Node → 装依赖 → 构建 → 打包产物_）→ `deploy` job（发布到 Pages）。`permissions` 三行是**最小权限原则**：整个流水线只被授予「读代码、写 Pages、拿部署凭证」，泄露了也祸害不到别处。（actions 版本为 2026-08 最新大版本。）

## 三、启用 Pages 并首跑

workflow 就位后还差最后一步授权——告诉 GitHub「这个仓库的 Pages 用 Actions 构建」：

**网页方式**：仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。

**CLI 方式**（一条 API，本机所用）：

```bash
gh api -X POST repos/code-corey/web-todolist/pages -f build_type=workflow
```

然后推上这两个改动：

```bash
git add .
git commit -m "Deploy to GitHub Pages via Actions"
git push
```

push 落地的瞬间 workflow 自动开跑。盯进度：

```bash
gh run watch    # 或 gh run list 看列表
```

本机首跑的结果：`deploy` 绿灯，全程十几秒——build job 里 npm ci + build 在 GitHub 的服务器上从头来过，和第 08 篇本机构建产物一致（哈希同名，这正是可复现构建的样子）。

## 四、验收：线上真的活了

```text
$ curl -sL -o /dev/null -w 'final=%{url_effective} code=%{http_code}\n' \
    https://www.code-corey.com/web-todolist/
final=https://www.code-corey.com/web-todolist/ code=200
```

打开这个网址：样式、交互、localStorage 持久化全部在线上工作。你还可以观察到一个「意外惊喜」：访问 `https://code-corey.github.io/web-todolist/` 会得到 `301` 跳转到 `www.code-corey.com`——因为这套 GitHub 账号在用户页上绑定了自定义域名，GitHub 会把项目页一并重定向过去。没绑域号的账号，线上地址就是 `https://<用户名>.github.io/web-todolist/`，一切照常。

最后把 README 里的「线上体验」链接补成真实地址：

```bash
git add README.md
git commit -m "Fix live URL in README (custom domain)"
git push      # ← 这次 push 会自动触发一次重新部署，亲眼看着「推代码即发版」转起来
```

## 五、系列回顾：十个雪球滚完

| 篇 | 雪球 | 你得到了什么 |
|----|------|--------------|
| 01 | 心智模型 | 浏览器/三件套/前后端分界 |
| 02 | 项目与仓库 | Vite 脚手架 + git + HMR 原理 |
| 03 | 数据与状态 | types.ts + useState + 不可变更新 |
| 04 | 完整交互 | 勾选/删除/筛选/清空 + key |
| 05 | 持久化 | localStorage + useEffect + 容错 |
| 06 | 视觉 | CSS 变量 + 布局 + 响应式 |
| 07 | 工程化 | 组件拆分 + props + 单向数据流 |
| 08 | 构建 | dev/build/preview + dist + 类型关卡 |
| 09 | 代码之家 | GitHub 仓库 + README |
| 10 | 上线 | Pages 自动部署，push 即发版 |

回头看第 01 篇那张功能表：全勾了。更重要的是沿途攒下的通用本事——**状态驱动界面的思路、不可变数据、组件化、单向数据流、构建部署的链路**——换任何一个前端项目都直接带走。

想继续加料，几个方向难度递增：双击编辑待办标题（受控输入进阶）、拖拽排序（事件与状态联动）、对接真实后端 API（替换 localStorage，fetch + 异步 state）、换成 Cloudflare Pages/Vercel 对比部署体验。另外，本站「微信小程序」板块有一个同款 TodoList 的小程序版——同一个产品需求换一个运行时，正好对照着看平台差异。

恭喜完结。🍾
