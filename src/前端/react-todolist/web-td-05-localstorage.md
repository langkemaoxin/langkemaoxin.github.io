---
title: 刷新不丢——localStorage 持久化
sidebarGroup: React TodoList 实战
shortTitle: "05 localStorage"
order: 5
date: 2026-08-21T04:00:00.000Z
category: 前端
tag:
  - localStorage
  - useEffect
  - React
  - TodoList
description: 用 useState 惰性初始化在启动时读 localStorage、useEffect 在列表变化时写回，带 JSON 解析容错；含真实报错与真实存储值演示。
---

> **Web · React TodoList · 第 5/10 篇**  
> 上一篇：[《搭出完整页面》](/前端/react-todolist/web-td-04-build-ui) · 下一篇：[《样式》](/前端/react-todolist/web-td-06-styles)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist) · 本篇对应 commit：[945df46](https://github.com/code-corey/web-todolist/commit/945df46) `Persist todos to localStorage`

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 写入 | todos 一变就存进 localStorage |
| **2** | 读取 | 页面刷新后列表原样回来 |
| **3** | 容错 | 存储里的坏数据不会白屏 |

## 开头：内存不留人

前两篇每次自测的最后一步都是「刷新 → 全没了」。现在正面回答它。

`useState` 的值活在**页面这个标签页的内存**里，刷新 = 旧的页面实例销毁、新的从零启动，内存里的东西自然全丢。想让数据活过刷新，就得在内存之外找地方——浏览器恰好给每个网站留了一个：**localStorage**。

需求就两句话：

1. 页面启动时，从 localStorage **读**出上次的列表，当作初始值
2. 列表每次变化，**写**回 localStorage

## 一、localStorage 是什么

浏览器提供的本地键值存储，三个特性决定它适合这里：

| 特性 | 含义 |
|------|------|
| 持久 | 刷新、关标签页、重启浏览器都在（不主动删就一直在） |
| 同源隔离 | 按「协议+域名+端口」分开存放，别的网站读不到你的 |
| **只存字符串** | 塞对象进去会变成 `[object Object]`，必须先 `JSON.stringify` |

两个必会的 API：

```ts
localStorage.getItem('key')          // 读，不存在返回 null（不是 undefined）
localStorage.setItem('key', '文本')   // 写，同名覆盖
```

> **易混点：三种浏览器存储怎么选**  
> `localStorage`：持久、容量约 5MB，适合「用户的本地偏好和轻量数据」——正是我们。`sessionStorage`：刷新还在、关标签页就没，适合「只在本标签页有意义的临时状态」。Cookie：每次请求自动带上、容量约 4KB，本质是给**服务器**用的，前端存东西别用它。另外 localStorage 是**本机本浏览器**的：换电脑、换浏览器、无痕模式都各是各的，别指望它当数据库。

## 二、写：列表一变就存——useEffect 登场

React 组件的渲染函数应该「纯」：只管把 state 变成 JSX，**不该在渲染过程中顺手干别的事**（比如写 storage）。可是「todos 变了要写盘」偏偏是个副作用，什么时候执行？

`useEffect` 就是副作用的正规入口：

```tsx
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}, [todos])
```

逐段拆解：

| 片段 | 含义 |
|------|------|
| 第一个参数 | 副作用函数：要做的事 |
| `[todos]` 依赖数组 | 名单上只有 `todos`——它变了才重新执行；别的 state（比如 filter）变，不关这里的事 |
| 执行时机 | 渲染**完成后**异步执行，不阻塞画面 |

于是数据流闭环了：任何途径改了 `todos`（添加、勾选、删除、清空）→ 重渲染 → effect 发现 `todos` 变了 → 写盘。

存进去长什么样？`JSON.stringify` 的输出就是 storage 里躺着的那行字符串。以两条真实待办为例（本机实际生成）：

```json
[{"id":"3f8e2c1a-9b4d-4e6a-8f2b-1c7d9e0a5b3f","title":"买牛奶","done":false,"createdAt":1766630000000},{"id":"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d","title":"复习 React useState","done":true,"createdAt":1766620000000}]
```

一眼看懂：数组序列化成了文本。读回来自然要反序列化——坑就在那一步。

## 三、读：初始值从哪来——惰性初始化

最直觉的写法有个隐藏 bug：

```tsx
// ❌ 错误示范
const [todos, setTodos] = useState<Todo[]>(loadTodos())
```

`useState(loadTodos())` 里的括号是**当场执行**：组件每次渲染都会跑一遍 `loadTodos()`，读盘+解析 99 次浪费 98 次。正确姿势是**传函数不传值**：

```tsx
// ✅ 惰性初始化
const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
```

传函数时 React 只在**第一次挂载**调用它一次，拿返回值当初始值，之后的渲染直接跳过——这就是「惰性初始化」。一字之差，语义完全不同。

## 四、容错：把「信不过的世界」挡在门外

`loadTodos` 读的是**自己上上次存的字符串**，看起来可信，但至少三种情况会出幺蛾子：手贱在 DevTools 里改坏了、别的实验代码用了同一个 key 存了别的东西、旧版本格式不一样。先看事故现场——`JSON.parse` 遇到非 JSON 文本直接抛异常（本机真实输出）：

```text
$ node -e "JSON.parse('oops')"
<anonymous_script>:1
oops
^

SyntaxError: Unexpected token 'o', "oops" is not valid JSON
    at JSON.parse (<anonymous>)
    ...
Node.js v25.7.0
```

这段异常若发生在组件初始化里，整个页面白屏。防御分三层：

```tsx
const STORAGE_KEY = 'web-todolist'

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)   // ① 没存过：null
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown       // ② 坏 JSON：抛异常，被 catch 兜住
    if (!Array.isArray(parsed)) return []           // ③ 存过但不是数组（比如被存成了对象）

    return parsed.filter(                           // ④ 是数组但里面混了不合法的项
      (item): item is Todo =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as Todo).id === 'string' &&
        typeof (item as Todo).title === 'string' &&
        typeof (item as Todo).done === 'boolean',
    )
  } catch {
    return []                                       // 任何一步炸了，都从空列表重来
  }
}
```

四个关卡对应四种坏法，任何一种的结局都是「回到空列表」，页面照常可用。两个 TS 语法点：

- `as unknown`：先声明「parse 出来的东西类型未知」，不给它任何假身份
- `(item): item is Todo =>`：类型谓词——这个 filter 的返回值同时告诉 TS「通过的项都是 Todo」，后面用起来才有类型

原则值得记住：**边界处的输入永远不可信，宁可丢数据也不能白屏**。换项目时记得换 `STORAGE_KEY`，不同项目共用一个 key 会互相踩。

## 五、动手 + 验证

在 `App.tsx` 顶部加上 `loadTodos` 与 `STORAGE_KEY`（完整代码见成品仓 [945df46](https://github.com/code-corey/web-todolist/commit/945df46)），state 改成惰性初始化，`useEffect` 放进组件里。验证三连：

1. 添加两三条待办 → 按 F5 → 列表原样回来 ✓
2. 打开 DevTools → Application → Local Storage → `http://localhost:5173` → 能看到 key 为 `web-todolist`、value 为一长串 JSON（就是第二节那行的样子）✓
3. 把 value 改成 `oops` 保存 → 刷新 → 页面正常打开，列表为空，没有白屏 ✓

第三步就是容错代码的现场验收。

```bash
git add .
git commit -m "Persist todos to localStorage"
```

## 小结

- 副作用（读写 storage）放 `useEffect`，依赖数组圈定「谁变了才执行」
- 初始 state 要读盘时用惰性初始化：`useState(() => loadTodos())`
- 存储边界按「不可信输入」处理：try/catch + 逐项校验，坏数据降级不白屏
- localStorage 只存字符串，对象进出靠 `JSON.stringify` / `JSON.parse`

功能与持久化都齐了，但页面还是灰头土脸的「毛坯」。下一篇上 CSS：变量主题、卡片布局、划线高亮，让它像个正经产品。
