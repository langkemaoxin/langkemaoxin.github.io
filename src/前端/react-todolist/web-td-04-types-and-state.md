---
title: 类型与状态——Todo 长什么样
sidebarGroup: React TodoList 实战
shortTitle: "04 类型与状态"
order: 4
date: 2026-08-21T03:00:00.000Z
category: 前端
tag:
  - TypeScript
  - useState
  - React
  - TodoList
description: 定义 Todo / Filter 类型，用 useState 管理列表、输入框草稿和筛选条件，理解「状态驱动界面」。
---

> **Web · React TodoList · 第 4/10 篇**  
> 上一篇：[《名词词典》](/前端/react-todolist/web-td-03-nouns) · 下一篇：[《搭出页面功能》](/前端/react-todolist/web-td-05-build-ui)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | `src/types.ts` | 有 `Todo`、`Filter` |
| **2** | 三个状态 | 列表 / 输入草稿 / 筛选 |
| **3** | 心智 | 改状态 → 界面变 |

## 一、先定数据形状

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

含义：

- `id`：唯一标识，方便勾选/删除时找对那一条  
- `title`：展示文字  
- `done`：是否完成  
- `createdAt`：创建时间（毫秒时间戳）  
- `Filter`：三种筛选枚举，避免写成随意字符串

## 二、状态驱动界面

在 `App.tsx` 里（概念代码）：

```tsx
const [todos, setTodos] = useState<Todo[]>([])
const [draft, setDraft] = useState('')
const [filter, setFilter] = useState<Filter>('all')
```

| 状态 | 谁在用 |
|------|--------|
| `todos` | 列表渲染、剩余数量 |
| `draft` | 输入框的受控值 |
| `filter` | 决定显示哪些条 |

**受控输入**：输入框的 `value={draft}`，`onChange` 里 `setDraft`。页面上的字来自状态，不是「输入框自己偷偷记」。

## 三、派生数据（不必再存一份）

```ts
const remaining = todos.filter((t) => !t.done).length

const visible = todos.filter((todo) => {
  if (filter === 'active') return !todo.done
  if (filter === 'completed') return todo.done
  return true
})
```

`visible` 是从 `todos + filter` **算出来的**，不要再搞一个「展示用数组」的独立 state，否则容易不同步。

## 四、改列表的惯用写法

React 里更新数组，推荐返回**新数组**，不要直接 `push` 原数组：

```ts
// 添加
setTodos((prev) => [
  { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
  ...prev,
])

// 切换完成
setTodos((prev) =>
  prev.map((todo) =>
    todo.id === id ? { ...todo, done: !todo.done } : todo,
  ),
)

// 删除
setTodos((prev) => prev.filter((todo) => todo.id !== id))
```

`setTodos((prev) => …)` 里的 `prev` 是「基于最新列表」计算，适合连续更新。

下一篇把这些操作接到按钮、勾选框和表格（列表）上。
