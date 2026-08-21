---
title: 让页面好看一点——CSS 变量、布局与响应式
sidebarGroup: React TodoList 实战
shortTitle: "06 样式"
order: 6
date: 2026-08-21T05:00:00.000Z
category: 前端
tag:
  - CSS
  - 布局
  - 设计
  - TodoList
description: 区分全局样式与组件样式的分工，用 CSS 变量统一主题，逐层拆解居中限宽、卡片容器、行内布局与状态样式，兼顾键盘焦点与窄屏适配。
---

> **Web · React TodoList · 第 6/10 篇**  
> 上一篇：[《localStorage》](/前端/react-todolist/web-td-05-localstorage) · 下一篇：[《组件拆分》](/前端/react-todolist/web-td-07-components)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[53b132c](https://github.com/code-corey/web-todolist/commit/53b132c) `Add visual design with CSS variables and responsive layout`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 主题变量 | 颜色字体集中在 `:root`，改一处全站变 |
| **2** | 布局 | 卡片式交互区、行两端对齐、划线态 |
| **3** | 适配 | 键盘焦点可见；手机宽度不裂版 |

## 开头：功能齐了，为什么还要单独谈样式

现在的页面功能完整，但视觉是「浏览器默认款」：白底、默认字体、按钮和输入框各长各的。更深层的问题——**为什么样式要写成独立的 CSS，而不是给每个标签塞属性**？

- **结构与表现分离**：HTML 说「这是按钮」，CSS 说「按钮长什么样」。改风格只动 CSS，不碰逻辑
- **一处定义处处生效**：「所有按钮都是圆角 8px」写在 CSS 里是一行，散落在几十个标签属性里是几十处
- React 也一脉相承：JSX 里写 `className="item"`，样式去 CSS 里找 `.item`——名字对上，职责分开

本篇目标是一个克制的浅色主题：渐变浅底、白色卡片、墨绿强调色。不追花哨，追「像一个产品」。

## 一、两个样式文件怎么分工

| 文件 | 职责 | 谁引入 |
|------|------|--------|
| `src/index.css` | **全局**：CSS 变量、页面背景、默认字体 | `main.tsx`（模板已引好） |
| `src/App.css` | **本组件**：`.app` `.board` `.item` 等业务样式 | `App.tsx` |

分工逻辑：换一个项目，`index.css` 里的「主题」能整体搬走；`App.css` 则跟页面长相死磕。

## 二、CSS 变量：主题的「控制台」

```css
:root {
  --ink: #1a2b24;          /* 正文墨色 */
  --muted: #5d6f67;        /* 次要文字灰绿 */
  --accent: #1f6f5b;       /* 强调色：按钮、高亮、下划线 */
  --accent-soft: #e3efea;  /* 强调色的浅底：选中态背景 */
  --danger: #b3372f;       /* 危险动作：删除悬停 */
  --surface: #ffffff;      /* 卡片表面 */
  --line: #dfe7e2;         /* 分隔线、边框 */
}
```

`:root` 是「文档根上的变量仓库」。取用时 `color: var(--ink)`，**换主题只改这八行**，300 行组件样式一行不动——这就是变量集中在全局文件的理由。颜色策略：正文深、次要浅、强调墨绿、危险红，一个色系四种角色，不贪多。

## 三、布局逐层拆解

先把 `App.tsx` 的结构对齐到上一篇画的图——交互区包进 `.board` 卡片，各区块挂上语义化 class：

```tsx
<main className="app">
  <h1>TodoList</h1>
  <section className="board">
    <form className="composer">…</form>
    <div className="toolbar">…</div>
    <ul className="list">…</ul>
    <footer className="app-footer">…</footer>
  </section>
</main>
```

样式自外向内四层：

**第 1 层：页面骨架**——`.app` 限宽居中，保证 27 寸显示器上不至于一行待办拉半米宽：

```css
.app {
  max-width: 560px;
  margin: 48px auto;      /* 上下留白，左右 auto = 水平居中 */
  padding: 0 16px;        /* 手机上贴边留口气 */
}
```

**第 2 层：卡片容器**——`.board` 把交互区拢成一张「纸」：

```css
.board {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 6px 24px rgba(26, 43, 36, 0.06);
}
```

**第 3 层：行内排布**——`.composer` 输入框占满剩余宽度；`.item` 一行两端对齐：

```css
.composer {
  display: flex;
  gap: 8px;
}

.composer input {
  flex: 1;                /* 输入框吃掉按钮剩下的全部空间 */
}

.item {
  display: flex;
  justify-content: space-between;  /* 标签靠左，删除按钮靠右 */
  align-items: center;             /* 垂直居中 */
  gap: 8px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--line);
}
```

**第 4 层：状态样式**——同一份 DOM，不同状态不同皮肤：

```css
.item.done span {                 /* 已完成：划线褪色 */
  text-decoration: line-through;
  color: var(--muted);
}

.filters button.active {          /* 当前筛选挡：浅绿底 + 描边 */
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.item .remove:hover {             /* 删除：悬停变红，暗示危险 */
  color: var(--danger);
}
```

注意这些选择器都不用 JS 参与——**状态早已反映在 class 上**（`done`、`active`），CSS 只认 class 画脸。数据 → class → 样式，链路清晰。

## 四、两个容易被忽略的细节

**键盘可达性**：鼠标用户点输入框有光标，键盘用户 Tab 进来凭什么知道焦点在哪？给焦点一个明确轮廓：

```css
.composer input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
```

`:focus-visible` 只在**键盘导航**时生效，鼠标点击不会多出一个框——两全。

**悬停过渡**：按钮 hover 变色加一句 `transition: background 0.15s ease`，变化就有了「呼吸感」。成本一行，观感差一档。

## 五、响应式：窄屏不裂版

手机宽度（≤480px）下，输入+按钮横排会挤成一条，筛选栏和计数也会打架：

```css
@media (max-width: 480px) {
  .app {
    margin: 24px auto;           /* 小屏收紧留白 */
  }

  .composer {
    flex-direction: column;      /* 输入框和按钮上下摞 */
  }

  .toolbar {
    flex-direction: column;
    gap: 8px;
  }
}
```

验证方式不用掏手机：DevTools 按 `Ctrl+Shift+M` 切设备模拟，拖宽度过 480px 那一刻布局会切换。

## 六、完整代码

两份 CSS 完整版较长（`index.css` 约 25 行、`App.css` 约 150 行），直接看成品仓库 [53b132c](https://github.com/code-corey/web-todolist/commit/53b132c) 当次提交的 `src/index.css` 与 `src/App.css`——本篇所有片段都在其中，拼图即全文。顺手把 `index.html` 的 `<title>` 改成 `TodoList`、`lang` 改成 `zh-CN`，浏览器标签页立刻体面。

```bash
git add .
git commit -m "Add visual design with CSS variables and responsive layout"
```

## 自测

1. 划过一条待办 → 划线 + 变灰；切筛选挡 → 当前按钮浅绿高亮
2. 鼠标悬停「删除」→ 变红；主按钮悬停 → 深一号的绿
3. Tab 键聚焦输入框 → 出现绿色轮廓
4. 设备模拟拖到 375px 宽 → 输入区上下排布，无横向滚动条

页面至此「能看」了。但 `App.tsx` 也悄悄长到了 150 行：状态、更新函数、六大块 JSX 全挤在一个函数里。下一篇做工程化的一步——拆组件，让它变回一目了然的积木结构。
