---
title: 一步步搭出 TodoList 页面
sidebarGroup: React TodoList 实战
shortTitle: "05 搭建 UI"
order: 5
date: 2026-08-21T04:00:00.000Z
category: 前端
tag:
  - React
  - JSX
  - TodoList
  - 实战
description: 把添加、勾选、删除、筛选、清空已完成接到 App.tsx 的表单与列表上，形成可用的交互闭环。
---

> **Web · React TodoList · 第 5/10 篇**  
> 上一篇：[《类型与状态》](/前端/react-todolist/web-td-04-types-and-state) · 下一篇：[《localStorage》](/前端/react-todolist/web-td-06-localstorage)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 添加 | 输入后列表多一条 |
| **2** | 勾选 / 删除 | 状态与条目正确变化 |
| **3** | 筛选 + 清空已完成 | 三种筛选与底部清理可用 |

完整实现见成品仓 `src/App.tsx`。下面按区块拆解。

## 一、页面结构

```text
header（品牌 + 标题）
  └── board（交互区）
        ├── composer（输入 + 添加）
        ├── toolbar（筛选 + 剩余数）
        ├── list / empty
        └── footer（清空已完成）
```

## 二、添加（表单）

用 `<form onSubmit>`，回车也能提交：

```tsx
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
```

`addTodo`：`trim` 后为空则返回；否则往 `todos` 头部插入新项并清空 `draft`。

## 三、列表：勾选与删除

```tsx
<ul>
  {visible.map((todo) => (
    <li key={todo.id}>
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
```

要点：

- `key={todo.id}`：帮助 React 高效对比列表  
- 完成态可给 `li` 加 `className="done"`，用 CSS 划掉文字  

## 四、筛选按钮

三个按钮改 `filter`：`all` / `active` / `completed`。当前项加 `active` 样式。列表只渲染 `visible`。

## 五、清空已完成

```ts
const clearCompleted = () => {
  setTodos((prev) => prev.filter((todo) => !todo.done))
}
```

仅当 `completedCount > 0` 时显示按钮，避免空操作干扰。

## 六、自测清单

1. 添加两条 → 剩 2 项  
2. 勾选一条 → 未完成筛选只剩 1  
3. 删除一条 → 条数减少  
4. 清空已完成 → 已完成筛选为空  

此时刷新页面列表会丢——下一篇用 `localStorage` 接上。
