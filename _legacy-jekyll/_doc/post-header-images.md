# 博客文章头图选用指南

文章 front matter 中通过 `header-img` 指定头图，例如：

```yaml
header-img: "img/post-bg-data-center.jpg"
```

头图会作为 `intro-header` 的全宽背景显示，建议选用**横向大图**（约 1920×1080），且画面不宜过于杂乱，以便标题文字清晰可读。

可选配合 `header-mask` 加深遮罩（0.0～1.0）：

```yaml
header-img: "img/post-bg-night-city.jpg"
header-mask: 0.3
```

---

## 新增头图（2026-06 下载）

| 文件名 | 风格 | 适合文章类型 |
| :--- | :--- | :--- |
| `img/post-bg-data-center.jpg` | 数据中心 / 服务器机柜 | 大数据、Lambda/Kappa、架构、后端 |
| `img/post-bg-night-city.jpg` | 城市夜景 | 工程实践、复盘、综合技术文 |
| `img/post-bg-mountain-lake.jpg` | 山湖风景 | 学习笔记、方法论、长文 |
| `img/post-bg-abstract-gradient.jpg` | 抽象渐变 | 概念梳理、清单类、轻量文章 |
| `img/post-bg-circuit-board.jpg` | 电路板特写 | 硬件、嵌入式、底层技术 |
| `img/post-bg-misty-forest.jpg` | 雾中森林 | 随笔、方法论、沉静风格 |
| `img/post-bg-forest-path.jpg` | 森林小径 | 教程、入门、成长类 |
| `img/post-bg-galaxy-stars.jpg` | 星空银河 | AI、前沿技术、探索类 |
| `img/post-bg-earth-space.jpg` | 地球太空 | 架构视野、系统设计 |
| `img/post-bg-desk-coding.jpg` | 编程桌面 | 开发工具、实战、Coding |
| `img/post-bg-ai-chips.jpg` | AI / 科技抽象 | LLM、Agent、智能化 |

---

## 主题自带头图（Hux 主题原有，可直接复用）

| 文件名 | 风格 | 适合文章类型 |
| :--- | :--- | :--- |
| `img/post-bg-universe.jpg` | 宇宙 | 架构、系统设计 |
| `img/post-bg-web.jpg` | Web 主题 | 前端、全栈 |
| `img/post-bg-css.jpg` | CSS | 前端样式 |
| `img/post-bg-android.jpg` | Android | 移动端 |
| `img/post-bg-unix-linux.jpg` | Unix/Linux | 运维、Linux |
| `img/post-bg-dreamer.jpg` | 梦幻 | 随笔 |
| `img/post-bg-infinity.jpg` | 无限符号感 | 哲学/方法论 |
| `img/post-bg-digital-native.jpg` | 数字化 | 产品、数字化 |
| `img/post-bg-alitrip.jpg` | 旅行风 | 轻松话题 |
| `img/post-bg-2015.jpg` | 默认雪景 | 通用（目前用得最多） |

---

## 使用示例

**大数据架构笔记：**

```yaml
header-img: "img/post-bg-data-center.jpg"
header-mask: 0.25
```

**AI / Agent 文章：**

```yaml
header-img: "img/post-bg-ai-chips.jpg"
```

**开发复盘：**

```yaml
header-img: "img/post-bg-desk-coding.jpg"
```

---

## 图片来源说明

新增图片来源于 [Unsplash](https://unsplash.com)，遵循其免费使用许可。如需标注作者，可在 front matter 中添加：

```yaml
header-img-credit: "Author Name on Unsplash"
header-img-credit-href: "unsplash.com/@username"
```
