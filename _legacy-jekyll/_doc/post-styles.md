# 每篇文章单独切换样式

你的博客现在支持在文章头部通过 `post_style` 指定单篇样式。

## 1. 文章里怎么写

```yaml
---
layout: post
title: "文章标题"
date: 2026-04-07
tags: [示例]
post_style: clean-notes
---
```

可用的内置样式：

- `clean-notes`
- `blogbox`
- `magazine`
- `paper`

如果你想继续使用已经存在的演示型布局，也可以直接写：

```yaml
layout: keynote
```

## 2. 样式文件放哪里

把每套样式放到：

```text
css/post-styles/<样式名>.css
```

例如：

```text
css/post-styles/magazine.css
```

然后在文章头部写：

```yaml
post_style: magazine
```

## 3. 推荐找样式的地方

适合整站 Jekyll 主题参考：

- GitHub Pages Themes: <https://pages.github.com/themes/>
- Jekyll Themes: <https://jekyllthemes.io/>
- Jamstack Themes / Jekyll: <https://jamstackthemes.dev/ssg/jekyll/>

适合下载 HTML/CSS 视觉样式，再抽出文章区样式：

- HTML5 UP: <https://html5up.net/>

## 4. 最实用的做法

不要给每篇文章下载一整套完整博客主题。完整主题通常会同时改导航、首页、分页、归档和组件结构，直接按文章切换会很重，也容易互相冲突。

更适合你的方式是：

1. 在上面的主题站里挑视觉方向。
2. 只提取“文章正文区域”的 CSS。
3. 存成 `css/post-styles/<名字>.css`。
4. 在对应文章头部写 `post_style: <名字>`。

## 5. 新增一套样式的最小步骤

1. 复制一份现有文件，比如 `css/post-styles/clean-notes.css`
2. 改颜色、边框、标题、引用块、代码块、图片样式
3. 新文章头部写 `post_style: 你的样式名`
4. 本地预览确认效果

## 6. BlogBox 风格

如果你喜欢这个主题：

- <https://jamstackthemes.dev/theme/blogbox-jekyll-theme/>

现在可以直接在文章头部这样写：

```yaml
post_style: blogbox
```

这套样式是根据 BlogBox 的视觉方向做的适配版，保留了它的几个核心特点：

- 深灰背景
- 白色正文卡片
- 绿色强调色
- `PT Serif` 正文字体
- `Open Sans` 标题字体

原主题仓库：

- <https://github.com/JustGoodThemes/BlogBox-Jekyll-Theme>
