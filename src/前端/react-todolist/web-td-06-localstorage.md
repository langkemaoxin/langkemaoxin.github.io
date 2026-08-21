---
title: 刷新不丢——localStorage 持久化
sidebarGroup: React TodoList 实战
shortTitle: "06 localStorage"
order: 6
date: 2026-08-21T05:00:00.000Z
category: 前端
tag:
  - localStorage
  - useEffect
  - React
  - TodoList
description: 用 localStorage 读写 todos；useState 惰性初始化加载，useEffect 在列表变化时写回；带上 JSON 解析容错。
---

> **Web · React TodoList · 第 6/10 篇**  
> 上一篇：[《搭建 UI》](/前端/react-todolist/web-td-05-build-ui) · 下一篇：[《样式》](/前端/react-todolist/web-td-07-styles)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 写入 | 每次 todos 变化写入 Storage |
| **2** | 读取 | 首次打开从 Storage 恢复 |
| **3** | 容错 | 坏数据不会把页面弄崩 |

## 一、约定 key

成品使用：

```ts
const STORAGE_KEY = 'test1-todolist'
```

同域名下 key 唯一即可；换项目时记得换 key，避免串数据。

## 二、读：惰性初始化

```ts
function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Todo =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as Todo).id === 'string' &&
        typeof (item as Todo).title === 'string' &&
        typeof (item as Todo).done === 'boolean',
    )
  } catch {
    return []
  }
}

const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
```

`useState(() => loadTodos())` 只在**第一次挂载**跑加载函数，避免每次渲染都读盘。

过滤字段是为了：以前存过脏数据时，丢掉不合法项而不是整站白屏。

## 三、写：todos 一变就存

```ts
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}, [todos])
```

`useEffect` 的依赖是 `[todos]`：列表变了才执行。  
`JSON.stringify` 把数组变成字符串——Storage 只能存字符串。

## 四、自测

1. 添加几条 → 关掉标签页 → 再打开同一地址 → 列表仍在  
2. 开发者工具 → Application → Local Storage → 能看到 `test1-todolist`  
3. 故意改成非法 JSON → 刷新应回到空列表而不是报错白屏  

## 五、边界（知道即可）

- 仅限**本机本浏览器本域名**；换电脑不同步  
- 隐私模式可能有限制  
- 不要存密码等敏感信息  

下一篇把演示页默认紫风样式换成 TodoList 自己的视觉。
