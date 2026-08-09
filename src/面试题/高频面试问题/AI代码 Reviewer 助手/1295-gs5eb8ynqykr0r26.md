---
title: "第 3 课 · Vue 前端界面与审查结果呈现"
sidebarGroup: "AI代码 Reviewer 助手"
shortTitle: "第 3 课 · Vue 前端界面与审查结果呈现"
order: 1295
date: 2026-05-20
category: "面试题"
tag:
  - "面试题"
description: "课程目标： 看懂前端页面的整体布局和交互流程； 理解前端如何调用后端审查接口，并管理 loading / 错误状态； 理解“原始代码 + 优化后代码 + 问题列表”三块区域是如何协同工作的。一、本课整体视图从“用户打开浏览器”到“看到审查结"
article: false
---

> 来源：[第 3 课 · Vue 前端界面与审查结果呈现](https://www.yuque.com/tulingzhouyu/db22bv/gs5eb8ynqykr0r26)

# **课程目标：**

- 看懂前端页面的整体布局和交互流程；

- 理解前端如何调用后端审查接口，并管理 loading / 错误状态；

- 理解“原始代码 + 优化后代码 + 问题列表”三块区域是如何协同工作的。

---

## 一、本课整体视图

从“用户打开浏览器”到“看到审查结果”，前端主要做了几件事：

1. 使用 Vue 3 `setup` 写一个单页界面 `App.vue`；

1. 左侧输入 Java 代码，点击“开始审查”按钮；

1. 通过 `src/api/review.ts` 调用后端 `/api/review/quick` 接口；

1. 把返回的 `score`、`summary`、`issues`、`optimizedCode` 显示在不同区域；

1. 处理 loading 状态和错误提示，让体验更平滑。

可以简单理解为：

> 前端负责“输入 + 展示 + 体验”，后端负责“逻辑 + AI + 落库”。

---

## 二、前端项目结构快速看一眼

路径：`frontend/`

- **入口文件**：`src/main.ts`

- 创建 Vue 应用实例，挂载到 `#app`；

- 引入全局样式 `src/assets/style.css`。

- **根组件**：`src/App.vue`

- 左侧：代码输入区 + 开始审查按钮；

- 右侧：审查结果（评分、总结、问题列表）；

- 左下：优化后的代码展示区域。

- **API 封装**：`src/api/review.ts`

- 封装 `quickReview` 函数，统一调用 `/api/review/quick`。

- **样式文件**：`src/assets/style.css`

- 页面整体布局（左右两栏、卡片风格）；

- `card-header-row` 让“输入 Java 代码 + 开始审查按钮”同一行显示；

- 优化后代码区域的样式。

> **知识点：** 前端同样遵循“页面组件 + API 层 + 样式层”的分层思路，方便以后重构或迁移。

---

## 三、API 调用层：review.ts

文件：`frontend/src/api/review.ts`

关键点：

- 使用 Axios 创建基础实例（如果有）；

- 暴露一个 `quickReview` 函数，负责：

- 接收 `code` 和 `language`；

- 发起 `POST /api/review/quick` 请求；

- 返回一个包含 `score`、`summary`、`issues`、`optimizedCode` 的 Promise。

示意代码结构（伪代码）：

```typescript
export interface ReviewIssue {
  lineStart: number;
  lineEnd: number;
  severity: string;
  category: string;
  message: string;
  suggestion: string;
}

export interface ReviewResponse {
  id: number;
  language: string;
  code: string;
  score: number;
  summary: string;
  issues: ReviewIssue[];
  optimizedCode: string;
  status: string;
  createdAt: string;
  completedAt: string;
}

export async function quickReview(code: string, language = 'Java'): Promise&lt;ReviewResponse&gt; {
  const response = await axios.post&lt;ReviewResponse&gt;('/api/review/quick', { code, language });
  return response.data;
}
```

> **知识点：** 用 TypeScript 定义好 `ReviewResponse` / `ReviewIssue`，可以在模板中获得类型提示，避免字段写错。

---

## 四、核心界面：App.vue 的三个区域

文件：`frontend/src/App.vue`

### 1. 左侧：输入 Java 代码 + 按钮区域

- 使用一个大的 `` 或代码输入框，双向绑定到 `code` 变量；

- 标题“输入 Java 代码”和“开始审查”按钮放在同一行：

- 使用一个 `div.card-header-row`；

- 左边是 `h2` 标题，右边是按钮；

- 按钮禁用条件：`loading === true` 或 `code` 为空。

交互细节：

- 点击按钮时：

- 设置 `loading = true`；

- 清空上一次的错误信息；

- 调用 `quickReview`，拿到结果赋值到 `result`。

### 2. 右侧：审查结果区域

主要展示：

- 代码质量评分（一个大号数字或者进度条）；

- 一句话总结 `summary`；

- 问题统计和问题列表：

- 按 `issues` 数组渲染每一条；

- 显示行号范围、严重程度、分类、问题描述和建议。

状态处理：

- 如果还没发起审查：展示一段“请先在左侧输入代码并点击开始审查”的空状态；

- 审查中：展示“AI 正在分析，请稍候...” 的加载提示；

- 审查完成：展示实际数据；

- 如果接口报错：展示错误信息（如“后端服务不可用，请稍后重试”）。

### 3. 左下：优化后的代码区域

- 标题始终显示“优化后的代码”；

- 内容根据状态切换：

- 初始状态：提示“审查完成后，将在此展示优化后的完整代码”；

- 如果 `result` 存在且 `optimizedCode` 有值：用 `` 显示完整代码；

- 如果 `result` 存在但 `optimizedCode` 为空：提示“当前没有可用的优化代码，请检查 AI 返回结果”。

> **知识点：** 通过始终显示标题 + 根据状态切换内容，让用户一眼就知道“这里将来会出现优化后代码”，减少界面惊喜/困惑。

---

## 五、本课技术亮点与爆点

### 亮点 1：前端也在“工程化 AI”——类型安全的 API 封装

- 我们没有在组件里直接写 `axios.post(...)`，而是：

- 用 TypeScript 定义好 `ReviewResponse` / `ReviewIssue`；

- 在 `review.ts` 中统一封装 `quickReview`；

- 组件只关心“调用函数 + 拿到强类型的数据”。

- **爆点：** 这让前端在使用 AI 返回结果时，跟调用一个普通的后端服务没有区别，**错误会在编译期暴露而不是线上出 bug**。

---

### 亮点 2：原始代码 + 优化代码 + 问题列表的“三屏联动”体验

- 左上：原始代码输入；

- 右侧：结构化的审查结果；

- 左下：完整的优化后代码。

- 学员可以在一个屏幕里同时看到：

- “问题是怎么说的”；

- “优化版本长什么样”；

- “原始代码在哪里有问题”。

- **爆点：** 这种“三屏联动”的设计，比单纯给一个 JSON 或一段文字建议，更像一个**可视化的 AI 代码教练界面**。

---

### 亮点 3：用 loading / disabled / 空状态，照顾用户体验

- 按钮在审查中会禁用，避免学员无意中连点导致重复请求；

- 审查中有明显的“正在分析”提示，而不是空白一片；

- 在没有数据时，各个区域有“空状态文案”，告诉用户下一步要做什么。

- **爆点：** 这节课不仅能学 Vue + API 调用，更能学到一套**面向 AI 能力的交互细节设计**，直接可以带回你自己的产品里用。

---

## 六、本课课后练习

1. **练习 1：调整布局** 尝试修改 `style.css`，把页面左右宽度比例稍微调整一下（比如左侧更宽一点，方便写代码），体会 CSS Grid / Flex 的组合使用。

1. **练习 2：增加错误提示** 在 `App.vue` 中增加一个 `errorMessage` 状态：

- 当接口调用失败时显示一条醒目的错误提示；

- 当下一次调用成功时清空错误提示。

1. **练习 3：给优化后代码加复制按钮（进阶）** 在“优化后的代码”区域右上角加一个“复制代码”按钮，点击后把 `optimizedCode` 复制到剪贴板，方便学员直接粘贴到 IDE 中对比。
