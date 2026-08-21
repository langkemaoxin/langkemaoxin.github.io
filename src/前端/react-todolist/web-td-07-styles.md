---
title: 让页面好看一点——CSS 与布局
sidebarGroup: React TodoList 实战
shortTitle: "07 样式"
order: 7
date: 2026-08-21T06:00:00.000Z
category: 前端
tag:
  - CSS
  - 布局
  - 设计
  - TodoList
description: 用 CSS 变量统一颜色与字体，区分全局样式与组件样式，完成居中布局、输入区与列表行，并兼顾窄屏。
---

> **Web · React TodoList · 第 7/10 篇**  
> 上一篇：[《localStorage》](/前端/react-todolist/web-td-06-localstorage) · 下一篇：[《运行与打包》](/前端/react-todolist/web-td-08-run-build)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 全局主题 | `index.css` 有颜色/字体变量 |
| **2** | 组件样式 | `App.css` 管布局与交互区 |
| **3** | 窄屏 | 手机宽度下输入区不错位 |

## 一、两个样式文件怎么分工

| 文件 | 职责 |
|------|------|
| `src/index.css` | 页面背景、默认字体、颜色变量 |
| `src/App.css` | Todo 页的 `.page` / `.board` / `.list` 等 |

在 `main.tsx` 引入全局，在 `App.tsx` 引入组件样式——成品仓已按此组织。

## 二、CSS 变量（主题一处改）

```css
:root {
  --ink: #1a2b24;
  --muted: #5d6f67;
  --accent: #1f6f5b;
  --surface: rgba(255, 255, 255, 0.86);
  --display: 'Fraunces', Georgia, serif;
  --sans: 'Source Sans 3', 'Segoe UI', sans-serif;
}
```

组件里写 `color: var(--ink)`，以后换主题只改 `:root`。

成品用墨绿强调色 + 浅色渐变背景，避免「默认紫渐变模板感」。

## 三、布局要点

1. `.page`：`max-width` + 水平居中，阅读宽度友好  
2. `.board`：包住输入与列表的交互容器（允许一点圆角与边框）  
3. `.composer`：桌面两列（输入 | 按钮），窄屏改一列  
4. `.item`：左文右「删除」；完成态文字划线  

示例（窄屏）：

```css
@media (max-width: 520px) {
  .composer {
    grid-template-columns: 1fr;
  }
}
```

## 四、一点动效即可

列表项可用很短的 `opacity` / `translateY` 入场动画；不要堆发光阴影。  
焦点态给输入框一个清晰的 `outline`/`box-shadow`，键盘用户也能看清。

## 五、对照阅读

打开成品：

- `src/index.css`  
- `src/App.css`  

对照 class 名与 `App.tsx` 里的 `className`，比背属性表更快。

下一篇确认 `dev` / `build` 命令，为推 GitHub 做准备。
