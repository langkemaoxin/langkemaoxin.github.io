---
title: 组件拆分——从一整页到积木块
sidebarGroup: React TodoList 实战
shortTitle: "07 组件拆分"
order: 7
date: 2026-08-21T06:00:00.000Z
category: 前端
tag:
  - React
  - 组件
  - Props
  - TodoList
description: 把 150 行的 App 拆成 TodoComposer、FilterBar、TodoList、TodoItem 四块积木：讲透 Props 与回调的父子通信、状态该住在哪，以及单向数据流的全景图。
---

> **Web · React TodoList · 第 7/10 篇**  
> 上一篇：[《样式》](/前端/react-todolist/web-td-06-styles) · 下一篇：[《运行与打包》](/前端/react-todolist/web-td-08-run-build)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[8e30a10](https://github.com/code-corey/web-todolist/commit/8e30a10) `Split App into TodoComposer, FilterBar, TodoList and TodoItem`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 四块积木 | components/ 下四个组件各司其职 |
| **2** | Props 心智 | 讲得清「数据怎么下去、事件怎么上来」 |
| **3** | App 瘦身 | App.tsx 只剩状态 + 布局，一眼看全 |

## 开头：150 行的 App 开始「发福」

一路写到上一篇，`App.tsx` 里堆着：三个 state、五个更新函数、六大块 JSX。功能没毛病，但三个信号说明该拆了：

1. **找一个 bug 要翻全文件**——勾选逻辑和输入框标记混在一起，改哪都得通读
2. **没法复用**——想让「输入区」出现在别的页面？没法搬，它和整页长在一起
3. **协作无从下口**——两个人同时改这个文件，冲突到怀疑人生

React 的答案从第 01 篇就埋好了：**组件**。组件就是「自带样式的自定义标签」——你已经用了两个月 `<input>`、`<button>` 而不觉得它们复杂，拆分就是把自己的页面块变成同等待遇的标签：`<TodoComposer />`、`<TodoItem />`。

## 一、Props：父组件的「传参」

拆开后的第一个问题：子组件要用的数据在父组件手里（比如某条 `todo`），怎么递过去？**Props**——调用处写在标签上，组件函数从参数里收：

```tsx
// 父组件调用：像给 HTML 属性赋值
<TodoItem todo={todo} onToggle={toggleTodo} onRemove={removeTodo} />

// 子组件接收：整个对象作为函数第一个参数
function TodoItem({ todo, onToggle, onRemove }: TodoItemProps) {
  ...
}
```

类型写在旁边，逐个声明：

```tsx
type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}
```

三条铁律：

- **只读**：props 是父组件递进来的，子组件只能用、不能改。`todo.title = 'x'` 直接红线
- **什么都能传**：数据（`todo`）、函数（`onToggle`）、回调（后面看它的大用场）
- **改不了，怎么办？** 通知父组件改——这正是传函数进来的原因：子组件**调用** `onToggle(todo.id)`，等于喊一嗓子「爸，这条该翻了，你来」；真正的 `setTodos` 仍然只发生在父组件

> **易混点：props 和 state 一字之差**  
> state 是组件**自己**的记忆，自己改（通过 set 函数）；props 是**别人**递进来的，只能读。判断归属的标准：「这个数据谁的 displayed 逻辑离不开它、且变化由谁触发」——谁家的事谁记 state。

## 二、动手拆：四个组件逐个来

新建 `src/components/`` 目录，四块积木自顶向下拆。

### TodoComposer：输入区（本次拆分最有戏的一块）

```tsx
import { useState } from 'react'

type TodoComposerProps = {
  onAdd: (title: string) => void
}

function TodoComposer({ onAdd }: TodoComposerProps) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const title = draft.trim()
    if (!title) return
    onAdd(title)
    setDraft('')
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
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
  )
}

export default TodoComposer
```

注意一个关键变化：**`draft` 状态从 App 搬进了 TodoComposer**。

为什么敢搬：草稿只有输入区在用——App 从不读它，只在 `addTodo` 里借道它拿标题。对 App 来说，重要的不是草稿，而是「**一条新待办诞生了，标题是这个**」。所以对外接口收敛成一个回调 `onAdd(title)`：子组件管好打字的细节，父组件只接收成品。

原则：**state 尽量住在离它最近的使用处**。能下沉就下沉，父组件的 state 越少，需要「同步」的面就越小。这也是为什么 `todos` 不下沉：四个组件都要用，只能住在共同的父组件 App。

### FilterBar：筛选栏

```tsx
import type { Filter } from '../types'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
]

type FilterBarProps = {
  filter: Filter
  remaining: number
  onChange: (filter: Filter) => void
}

function FilterBar({ filter, remaining, onChange }: FilterBarProps) {
  return (
    <div className="toolbar">
      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={filter === f.value ? 'active' : ''}
            onClick={() => onChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <span className="remaining">剩 {remaining} 项</span>
    </div>
  )
}

export default FilterBar
```

`FILTERS` 常量跟着搬——只有它用。props 三个：当前挡位 `filter`（要显示谁高亮）、剩余数 `remaining`（要显示数字）、`onChange`（点击时上报新挡位）。样式零改动：class 还是那些 class，CSS 不关心标签是谁在挂。

### TodoItem 与 TodoList：两层列表

最底层的 TodoItem（一条待办的展示），外面再包一层 TodoList（列表 + 空态）：

```tsx
// components/TodoItem.tsx
import type { Todo } from '../types'

type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

function TodoItem({ todo, onToggle, onRemove }: TodoItemProps) {
  return (
    <li className={todo.done ? 'item done' : 'item'}>
      <label>
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo.id)}
        />
        <span>{todo.title}</span>
      </label>
      <button type="button" className="remove" onClick={() => onRemove(todo.id)}>
        删除
      </button>
    </li>
  )
}

export default TodoItem
```

```tsx
// components/TodoList.tsx
import type { Todo } from '../types'
import TodoItem from './TodoItem'

type TodoListProps = {
  todos: Todo[]            // 注意：传进来的是 visible，父组件筛好的
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

function TodoList({ todos, onToggle, onRemove }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty">没有符合条件的待办</p>
  }

  return (
    <ul className="list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onRemove={onRemove} />
      ))}
    </ul>
  )
}

export default TodoList
```

TodoList 干两件事：空态短路（列表空就渲染提示，干净利落的早返回）、把 `todos.map` 铺开成 TodoItem。**筛选逻辑不在这里**——它收到的就是筛好的 `visible`，谁筛的？App。这叫各管一段。

### 拆分后的 App：只剩状态和布局

```tsx
import { useEffect, useState } from 'react'
import type { Filter, Todo } from './types'
import TodoComposer from './components/TodoComposer'
import FilterBar from './components/FilterBar'
import TodoList from './components/TodoList'
import './App.css'

const STORAGE_KEY = 'web-todolist'

function loadTodos(): Todo[] {
  /* 第 05 篇的容错加载，原样不动 */
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const remaining = todos.filter((t) => !t.done).length
  const completedCount = todos.length - remaining
  const visible = todos.filter((todo) => {
    if (filter === 'active') return !todo.done
    if (filter === 'completed') return todo.done
    return true
  })

  const addTodo = (title: string) => {
    setTodos((prev) => [
      { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
      ...prev,
    ])
  }
  const toggleTodo = (id: string) => { /* map 换副本，同第 04 篇 */ }
  const removeTodo = (id: string) => { /* filter 踢人，同第 04 篇 */ }
  const clearCompleted = () => { /* filter 留未完成，同第 04 篇 */ }

  return (
    <main className="app">
      <h1>TodoList</h1>
      <section className="board">
        <TodoComposer onAdd={addTodo} />
        <FilterBar filter={filter} remaining={remaining} onChange={setFilter} />
        <TodoList todos={visible} onToggle={toggleTodo} onRemove={removeTodo} />
        {completedCount > 0 && (
          <footer className="app-footer">
            <button type="button" onClick={clearCompleted}>
              清空已完成（{completedCount}）
            </button>
          </footer>
        )}
      </section>
    </main>
  )
}

export default App
```

（省略处与第 04、05 篇完全一致；完整代码看成品仓 [8e30a10](https://github.com/code-corey/web-todolist/commit/8e30a10)。）

读一读现在的 App：**它是唯一持有 `todos` 的人，是全部数据的源头**；四个子组件是无状态的「展示屏 + 按钮面板」。想找勾选逻辑？去 App 的 `toggleTodo`。想改输入区长相？去 `TodoComposer.tsx`。各回各家。

## 三、全景：单向数据流

拆分后整个应用的数据流是一张清晰的图：

```text
                ┌──────────── App（唯一数据源）────────────┐
                │  todos / filter + 全部 setTodos 逻辑      │
                └───────┬──────────────────┬──────────────┘
     数据沿 props 向下 ↓                  ↓ 事件沿回调向上
   ┌──────────────┐  ┌────────────┐  ┌───────────────────┐
   │ TodoComposer │  │ FilterBar  │  │ TodoList → TodoItem│
   │ (自留 draft)  │  │            │  │                   │
   └──────┬───────┘  └─────┬──────┘  └─────────┬─────────┘
          │ onAdd(title)   │ onChange(filter)  │ onToggle/onRemove(id)
          └────────────────┴───────────────────┘
```

- **数据只向下流**：App 把 `todos`、`filter` 通过 props 发给子组件
- **事件只向上报**：子组件不改数据，只调用回调把「发生了什么」（`onAdd`、`onToggle`）报给 App
- App 改 `todos` → 重渲染 → 新 props 下发 → 界面更新。一个方向，一个闭环

好处不是「时髦」，是**排障路径唯一**：界面上任何异常，要么顺 props 查下去（数据错了），要么顺回调查上来（事件没接对），没有第三条路。

## 自测

拆完照旧全功能过一遍（勾选/删除/筛选/清空/刷新恢复一样不能少——**重构的铁律是行为零变化**）：

```bash
npm run lint      # oxlint 过一遍
git add .
git commit -m "Split App into TodoComposer, FilterBar, TodoList and TodoItem"
```

本篇之后，代码就是「能见人」的工程结构了。剩下的两步都是「让它上路」：下一篇弄清 dev / build / preview 三个命令和 dist 产物，然后推 GitHub、部署上线。
