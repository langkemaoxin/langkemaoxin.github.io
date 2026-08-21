---
title: 类型与状态——先定数据，再谈界面
sidebarGroup: React TodoList 实战
shortTitle: "03 类型与状态"
order: 3
date: 2026-08-21T02:00:00.000Z
category: 前端
tag:
  - TypeScript
  - useState
  - React
  - TodoList
description: 先用 TypeScript 定义「一条待办长什么样」，再讲透 useState 的记忆机制、受控输入、派生数据与不可变更新，最后落地一个能添加待办的最小可用版。
---

> **Web · React TodoList · 第 3/10 篇**  
> 上一篇：[《新建项目》](/前端/react-todolist/web-td-02-create-vite-project) · 下一篇：[《搭出完整页面》](/前端/react-todolist/web-td-04-build-ui)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[ab830a2](https://github.com/code-corey/web-todolist/commit/ab830a2) `Add Todo type and minimal add-only list`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 数据模型 | `src/types.ts` 定义好 Todo 与 Filter |
| **2** | 状态心智 | 讲得清「为什么界面上加了一条，是 state 变了」 |
| **3** | 最小可用 | 能输入文字添加待办，列表实时显示 |

## 开头：写界面前，先回答「一条待办是什么」

上一篇结束时，页面还是 Vite 模板的演示页。现在要把它变成我们的 TodoList。动手写界面的冲动人人都有，但正确的第一步是退后一步问一个数据问题：

> 「一条待办」，在程序里用什么表示？它有哪些字段？

为什么先干这个：TodoList 的**一切功能都是围绕这条数据的变换**——添加是往数组里塞一条、勾选是把 `done` 翻转、删除是按 `id` 剔除、筛选是按 `done` 过滤。数据形状定错了，后面每一步都在歪地基上盖楼。

## 一、TypeScript：给数据发「身份证」

JS 的变量没有类型约束，`{ id: 1, titel: '买牛奶' }` 这种拼错字段名的对象，JS 毫无怨言地接受，直到某行代码读 `todo.title` 拿到 `undefined`、页面悄悄出 bug，你才可能在控制台看到点蛛丝马迹。

TypeScript 的解法：**把「数据长什么样」写成代码，让工具在写代码时（编辑器红线）和构建时（tsc 检查）替你盯着**。第 08 篇会亲眼看到 tsc 拦下一个拼写错误的全过程。

新建 `src/types.ts`：

```ts
export type Todo = {
  id: string
  title: string
  done: boolean
  createdAt: number
}

export type Filter = 'all' | 'active' | 'completed'
```

字段逐个拆解，每个都有存在的理由：

| 字段 | 类型 | 为什么需要它 |
|------|------|--------------|
| `id` | string | 唯一标识。勾选/删除时要「找对那一条」，靠内容匹配不可靠（两条待办可以同名） |
| `title` | string | 待办的文字内容 |
| `done` | boolean | 是否完成。筛选、划线、剩余计数全看它 |
| `createdAt` | number | 创建时间戳（毫秒）。现在不用，将来做排序/展示时有据可查 |

`Filter` 这个类型值得单独看一眼：`'all' | 'active' | 'completed'` 是**字面量联合类型**——值只允许是这三个字符串之一。写 `setFilter('don')` 编辑器立刻报错，而 JS 里它会安静地存进去，直到筛选按钮点了没反应。

> **易混点：`type` 和运行时无关**  
> `types.ts` 里全是类型声明，编译后**一行都不剩**，浏览器里跑的代码不含任何类型信息。它是给开发工具看的「图纸」，不是运行时的检查器。

## 二、useState：函数组件的「记忆」

看 React 组件的本质：`App()` 就是一个**函数**，返回一段 JSX。函数每次执行，里面声明的变量都是新的——那界面上明明没消失的数据，是谁在记住它？

答案是 `useState`：React 在组件**外部**替你保管一份值，组件每次渲染时找它取。用法：

```ts
const [todos, setTodos] = useState<Todo[]>([])
```

| 片段 | 含义 |
|------|------|
| `todos` | 当前值，本次渲染里读到的就是它 |
| `setTodos` | 修改它的唯一合法入口 |
| `useState<Todo[]>([])` | 泛型标注「这是个 Todo 数组」，初始值空数组 |

**状态驱动界面**是 React 的第一性原理，读三遍：

> 不存在「修改界面」这种操作。你只修改 state，React 发现 state 变了，重新执行函数组件，用新的返回值把界面对齐。

对比一下两种世界观：原生 JS 是「命令式」（找到那个元素，把它的文字改掉），React 是「声明式」（数据是什么样，页面就该是什么样——你改数据，页面自己跟上）。

TodoList 需要**三份**记忆，先认识其中两份（第三份 filter 第 04 篇接上）：

```tsx
const [todos, setTodos] = useState<Todo[]>([])   // 待办列表本体
const [draft, setDraft] = useState('')           // 输入框里正在打的草稿
```

### 受控输入：输入框的字从哪来

```tsx
<input
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
/>
```

这五行是 React 的标志性写法，叫**受控组件**：输入框显示什么，不归 DOM 自己管，而是来自 `draft`；每敲一个键，`onChange` 触发 → `setDraft` 更新 → 重渲染 → 输入框显示新值。字在 state 里绕了一圈再回到页面上。

多这一圈不是脱裤子放屁：**输入框的内容因此和其他状态平起平坐**，可以被校验、被提交、被一键清空——「添加后清空输入」就是提交后 `setDraft('')` 一句话的事。

> **易混点：state 放哪、不放哪**  
> 不是所有会变的东西都该进 state。能从现有 state **算出来**的，就别存（下一节）；只有「用户/系统产生的原始事实」才配当 state。

## 三、改数组的正确姿势：换新的，不改旧的

往列表加一条，直觉写法是 `todos.push(newTodo)`——**在 React 里这行是坏的**。原因回到上一节：React 靠「发现 state 变了」来触发更新，而它的判断方式是最朴素的**比较是不是同一个对象**。`push` 改的是原数组的内容，`todos` 还是那个 `todos`，React 一看引用没变：「没变？那我不动」。页面纹丝不动。

正确姿势是**造一个新数组交给 setTodos**：

```ts
// 添加：新数组 = 新项 + 展开旧项
setTodos((prev) => [
  { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
  ...prev,
])

// 切换完成：map 遍历，命中 id 的那条换成副本，其余原样返回
setTodos((prev) =>
  prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
)

// 删除：filter 留下 id 不匹配的
setTodos((prev) => prev.filter((todo) => todo.id !== id))
```

三个片段的共同点：`map` / `filter` / 展开运算符都**返回新数组**，原数组一个字没动。这就是「不可变更新（immutable update）」。

两处细节：

- `setTodos((prev) => ...)` 传函数而不是直接传值：`prev` 保证是**最新一次**的 state。连续快速多次更新时，直接传值可能拿到过期的旧值，函数式更新永远基于最新
- `crypto.randomUUID()`：浏览器内置的 UUID 生成器，恰好满足 `id` 唯一且不用自己造轮子（注意它只在 `https://` 或 `http://localhost` 这类安全上下文可用，部署到正规网址没问题）

## 四、动手：最小可用版 App.tsx

把 `src/App.tsx` 整页替换（同时清掉模板的演示样式：`src/assets/` 删除，两个 css 换成下面的最小版）：

```tsx
import { useState } from 'react'
import type { Todo } from './types'
import './App.css'

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [draft, setDraft] = useState('')

  const addTodo = () => {
    const title = draft.trim()
    if (!title) return
    setTodos((prev) => [
      { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
      ...prev,
    ])
    setDraft('')
  }

  return (
    <main className="app">
      <h1>TodoList</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          addTodo()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="写下一件要做的事…"
        />
        <button type="submit" disabled={!draft.trim()}>
          添加
        </button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </main>
  )
}

export default App
```

逐段过一遍这段代码在干什么：

| 代码段 | 职责 |
|--------|------|
| `addTodo` 开头的 `trim()` + 判空 | 空内容（含纯空格）直接 return，不加「空气待办」 |
| `setTodos((prev) => [新项, ...prev])` | 新待办插在列表**头部**，最新的排最前 |
| `setDraft('')` | 提交完清空输入框——受控输入的福利 |
| `e.preventDefault()` | 阻止表单默认的「提交并刷新页面」行为 |
| `todos.map((todo) => <li ...>)` | 数组 → JSX 列表：`map` 把每条数据变成一个 `<li>` |
| `key={todo.id}` | 给 React 的列表对比线索，第 04 篇展开讲（本篇先照抄） |
| `disabled={!draft.trim()}` | 没内容时禁用添加按钮，双保险 |

配套的最小样式——`src/index.css`（全局）：

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}
```

`src/App.css`（本组件）：

```css
.app {
  max-width: 560px;
  margin: 48px auto;
  padding: 0 16px;
}

form {
  display: flex;
  gap: 8px;
}

input {
  flex: 1;
  padding: 8px 12px;
}

li {
  list-style: none;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
```

`npm run dev` 打开页面，输入「买牛奶」回车——列表多一条。再输入「写周报」回车——又一条。

```bash
git add .
git commit -m "Add Todo type and minimal add-only list"
```

## 自测

1. 输入几个空格，按钮是灰的点不动；输入文字后变亮
2. 添加三条，最新的一条在最上面
3. **按 F5 刷新——列表空了**

第三条不是 bug，是本篇埋的钩子：state 活在内存里，页面一刷新全部归零。「怎么让数据活过刷新」是第 05 篇的主角 localStorage 要解决的问题。在那之前，下一篇先把剩下的一半功能补齐：勾选、删除、筛选。
