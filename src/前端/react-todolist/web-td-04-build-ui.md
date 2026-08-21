---
title: 一步步搭出完整页面——勾选、删除、筛选
sidebarGroup: React TodoList 实战
shortTitle: "04 搭出页面"
order: 4
date: 2026-08-21T03:00:00.000Z
category: 前端
tag:
  - React
  - JSX
  - TodoList
  - 实战
description: 在最小版之上补齐勾选、删除、三挡筛选与清空已完成；重点讲透列表渲染、key 的作用与受控勾选框，形成功能完整的交互闭环。
---

> **Web · React TodoList · 第 4/10 篇**  
> 上一篇：[《类型与状态》](/前端/react-todolist/web-td-03-types-and-state) · 下一篇：[《localStorage 持久化》](/前端/react-todolist/web-td-05-localstorage)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[08afb84](https://github.com/code-corey/web-todolist/commit/08afb84) `Add toggle, delete, filter and clear-completed UI`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 勾选 / 删除 | 单条待办的状态与增删正确 |
| **2** | 筛选 | 全部 / 未完成 / 已完成三挡切换正确 |
| **3** | 清空已完成 | 一键清掉所有已完成项 |

## 开头：会添加了，然后呢

上一篇的版本只能「往里加」。对着一个真正好用的 TodoList 使用三分钟，你会发现还缺四件事：做完的事想划掉（勾选）、加错的事想移走（删除）、事情多了想只看没做的（筛选）、收工时想一键打扫（清空已完成）。

四件事在数据侧全部有现成答案——第 03 篇的三个惯用更新已经写好了两个。本篇真正的新知识只有一个：**React 怎么把数组和 JSX 接起来**，也就是列表渲染和 key。

## 一、先看整页长什么样

结构先于代码。目标页面四个区块，自上而下：

```text
main.app
├── h1            标题
└── board         交互区
    ├── composer  输入框 + 添加按钮（上篇已有）
    ├── toolbar   筛选按钮组 + 剩余计数
    ├── list      待办列表 / 空态提示
    └── footer    清空已完成
```

## 二、第三个 state 与「派生数据」

筛选需要一个新 state——当前选中的挡位：

```tsx
const [filter, setFilter] = useState<Filter>('all')
```

但**列表显示哪些条**不需要 state，它是「算出来」的：

```tsx
const remaining = todos.filter((t) => !t.done).length      // 剩余几条
const completedCount = todos.length - remaining            // 完成几条

const visible = todos.filter((todo) => {
  if (filter === 'active') return !todo.done
  if (filter === 'completed') return todo.done
  return true
})
```

`visible` 是**派生数据**：由 `todos` 和 `filter` 现算。如果偷懒再建一个 `const [visible, setVisible] = useState(...)`，你就有了两份需要手工保持同步的「事实」——添加时忘了同步、勾选时忘了重算，页面立刻精神分裂。

> **易混点：什么进 state，什么现场算**  
> 判断标准一句话：**能在渲染函数里用现有 state 无副作用地算出来的，一律现场算**。`remaining`、`completedCount`、`visible` 全部如此。

## 三、列表渲染与 key：本篇的主角

```tsx
<ul>
  {visible.map((todo) => (
    <li key={todo.id} className={todo.done ? 'done' : ''}>
      ...
    </li>
  ))}
</ul>
```

`{数组.map(项 => JSX)}` 是 React 渲染列表的标准姿势：花括号里可以放任何 JS 表达式，`map` 把每条数据变成一个 `<li>`，React 负责铺开。

`key` 是夹在里面的一个特殊属性，专门回答 React 的一个难题：

> 数据变了，列表要重新画。React 需要知道**新列表的哪一项对应旧列表的哪一项**——哪条是新增的、哪条消失了、哪条只是挪了位置。逐项全量对比太蠢，React 的方案是：你给每项一个**在这份列表里稳定不变的身份牌**，它只对比 key。

**用数组下标 `key={index}` 是经典错误**。看一个具体翻车现场：三条待办 A、B、C，你勾选了 A，然后删除 A。如果 key 是下标——

| | 删除前 | 删除后 |
|--|-------|--------|
| 列表 | A(done) B C | B C |
| key=0 的项 | A，勾选框 ✓ | B，**勾选框还是 ✓** |

B、C 各自前移一位，但「key=0 勾选着」这条 UI 状态没动——B 莫名其妙变成了已完成。数据没错，界面错了，这种 bug 最气人。用 `key={todo.id}` 则身份牌跟着数据走，删 A 就是删 A 的牌，B 的牌和勾选状态原封不动。

> **key 的三条纪律**：用稳定唯一的 ID（我们的 `todo.id` 正合适）；不用下标（数据会增删排序时必错）；不用 `title`（会重复）。key 只在兄弟列表内要求唯一，不同列表互不影响。

## 四、勾选与删除：把第 03 篇的更新函数接上

```tsx
<label>
  <input
    type="checkbox"
    checked={todo.done}
    onChange={() => toggleTodo(todo.id)}
  />
  <span>{todo.title}</span>
</label>

<button type="button" onClick={() => removeTodo(todo.id)}>
  删除
</button>
```

勾选框就是第 03 篇**受控输入**的翻版：`checked={todo.done}`——勾没勾不归 DOM 管，数据说了算；点击触发 `onChange` → `toggleTodo(id)` → `setTodos` 换新数组 → 重渲染 → 勾选框对齐新数据。数据到界面，又是那个单向的圈。

配套的两个函数第 03 篇已写过原封不动搬来：`toggleTodo` 用 `map` 换命中项的副本，`removeTodo` 用 `filter` 踢掉命中项。

完成态的划线效果，一条 CSS 搞定（搭进本篇的基础样式里）：

```css
li.done span {
  text-decoration: line-through;
  color: #999;
}
```

## 五、筛选按钮组：数据驱动 UI 的小示范

三个按钮长得很像，只有标签和值不同——那就把它们做成**数据**：

```tsx
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
]
```

渲染时 `map` 出三个按钮，当前挡位高亮：

```tsx
<div className="filters">
  {FILTERS.map((f) => (
    <button
      key={f.value}
      type="button"
      className={filter === f.value ? 'active' : ''}
      onClick={() => setFilter(f.value)}
    >
      {f.label}
    </button>
  ))}
</div>
<span className="remaining">剩 {remaining} 项</span>
```

想加第四挡「今天」？往 `FILTERS` 里添一行、`Filter` 类型加一个字面量，按钮自动出现——**界面跟着数据长**，这是 React 思路最甜的地方。

## 六、空态与清空已完成

列表为空时渲染提示而不是空 `<ul>`（条件渲染三目运算符）：

```tsx
{visible.length > 0 ? (
  <ul>...</ul>
) : (
  <p className="empty">没有符合条件的待办</p>
)}
```

清空已完成按钮只在**有东西可清**时出现：

```tsx
const clearCompleted = () => {
  setTodos((prev) => prev.filter((todo) => !todo.done))
}

{completedCount > 0 && (
  <footer>
    <button type="button" onClick={clearCompleted}>
      清空已完成（{completedCount}）
    </button>
  </footer>
)}
```

`条件 && <JSX/>` 是三目之外另一种条件渲染：条件真则渲染，假则什么都不出。没东西可清时干脆不显示按钮，比显示一个点了没反应的按钮体面。

## 七、完整代码

`src/App.tsx` 整页（本篇版，可直接照抄）：

```tsx
import { useState } from 'react'
import type { Filter, Todo } from './types'
import './App.css'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
]

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const remaining = todos.filter((t) => !t.done).length
  const completedCount = todos.length - remaining

  const visible = todos.filter((todo) => {
    if (filter === 'active') return !todo.done
    if (filter === 'completed') return todo.done
    return true
  })

  const addTodo = () => {
    const title = draft.trim()
    if (!title) return
    setTodos((prev) => [
      { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
      ...prev,
    ])
    setDraft('')
  }

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    )
  }

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.done))
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

      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={filter === f.value ? 'active' : ''}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="remaining">剩 {remaining} 项</span>
      </div>

      {visible.length > 0 ? (
        <ul>
          {visible.map((todo) => (
            <li key={todo.id} className={todo.done ? 'done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span>{todo.title}</span>
              </label>
              <button type="button" onClick={() => removeTodo(todo.id)}>
                删除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">没有符合条件的待办</p>
      )}

      {completedCount > 0 && (
        <footer>
          <button type="button" onClick={clearCompleted}>
            清空已完成（{completedCount}）
          </button>
        </footer>
      )}
    </main>
  )
}

export default App
```

`src/App.css` 在上篇基础上补齐新元素（整份替换）：

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

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0 8px;
}

.filters {
  display: flex;
  gap: 4px;
}

.remaining {
  color: #666;
  font-size: 14px;
}

ul {
  padding: 0;
  margin: 0;
}

li {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

li.done span {
  text-decoration: line-through;
  color: #999;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty {
  color: #999;
  text-align: center;
  padding: 24px 0;
}

footer {
  margin-top: 16px;
  text-align: right;
}
```

## 自测

按顺序走一遍，每步都对再往下：

1. 添加三条 → 头部依次出现，剩余计数 3
2. 勾选第一条 → 划线变灰，剩余计数 2
3. 切到「未完成」→ 只剩 2 条；切「已完成」→ 只剩 1 条；切「全部」→ 3 条都在
4. 删掉一条 → 列表和计数同步减一
5. 点「清空已完成（1）」→ 已完成清空，按钮消失
6. **刷新 → 全没了**

第 6 步还是那个老问题：内存不留人。下一篇 localStorage 正式登场，把它变成历史。

```bash
git add .
git commit -m "Add toggle, delete, filter and clear-completed UI"
```
