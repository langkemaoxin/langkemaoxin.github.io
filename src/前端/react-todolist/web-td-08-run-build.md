---
title: 跑起来与打包——dev、build、preview
sidebarGroup: React TodoList 实战
shortTitle: "08 运行打包"
order: 8
date: 2026-08-21T07:00:00.000Z
category: 前端
tag:
  - Vite
  - npm
  - build
  - TodoList
description: 讲清 npm run dev / build / preview 三个命令各给谁用；亲手制造一个类型错误看 tsc 真实拦截，再看构建成功的真实产物清单与哈希文件名。
---

> **Web · React TodoList · 第 8/10 篇**  
> 上一篇：[《组件拆分》](/前端/react-todolist/web-td-07-components) · 下一篇：[《推上 GitHub》](/前端/react-todolist/web-td-09-push-github)  
> 成品仓库：[web-todolist](https://github.com/code-corey/web-todolist)

---

## 这一球要做成什么

| 雪球 | 加上去的 | 验收标准 |
|------|----------|----------|
| **1** | 三命令 | 说得出 dev / build / preview 各给谁用 |
| **2** | 挡板实验 | 亲眼见过 tsc 拦下类型错误 |
| **3** | 产物 | 认识 dist/ 里的每类文件 |

## 开头：开发跑得好好的，为什么还要「打包」

`npm run dev` 一直很爽，但那个页面**只有你自己能打开**——它跑在你机器的 5173 端口上，而且底层是 Vite 在「现场翻译」：浏览器要一个模块，它现编译一个。这个模式对开发完美，对上线有三个致命伤：

1. **源码是 TSX**——第 02 篇看过，`<h1>` 在代码里是 `_jsxDEV("h1",...)` 函数调用，浏览器根本不认识 `.tsx` 文件
2. **模块是散装的**——十几个文件十几次请求，还有 `import.meta.hot` 这些只该活在开发期的热更新接线
3. **没瘦身**——React 全量原样下发，注释空白齐全

「打包」就是把开发态的散装源码，变成**任何浏览器都能直接跑、且尽量小**的一撮静态文件。这正是 `package.json` 里三条命令的分工：

| 命令 | 干什么 | 给谁用 |
|------|--------|--------|
| `npm run dev` | 起开发服务器 + HMR，现场翻译 | 开发中的你 |
| `npm run build` | 类型检查 + 打包，产出 `dist/` | 准备上线 / 验证「真的能编译」 |
| `npm run preview` | 本地起服务器伺候 `dist/` | 上线前的最后检查 |

## 一、挡板实验：先看 build 怎么拦下一个 bug

`build` 脚本长这样：`"build": "tsc -b && vite build"`——**先类型检查，后打包**，类型有错打包根本不会开始。眼见为实，亲手造一个：把 `TodoItem.tsx` 里的 `checked={todo.done}` 改成 `checked={todo.doen}`（就拼错一个字母），然后：

```bash
npm run build
```

真实输出（本机，2026-08）：

```text
> web-todolist@0.0.0 build
> tsc -b && vite build

src/components/TodoItem.tsx(15,25): error TS2339: Property 'doen' does not exist on type 'Todo'.
```

进程退出码 `2`，构建失败。读读这行报错给的信息：文件、第 15 行第 25 列、错误编号 TS2339（属性不存在）、错误内容——**一个字母的拼写错误，被拦在上线之前**。这就是第 03 篇说的「TS 在构建期盯着」的兑现时刻：编辑器红线是提示，这里是关卡。

把 `doen` 改回 `done`，再跑：

```text
> web-todolist@0.0.0 build
> tsc -b && vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 21 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DC58i7tR.css    2.56 kB │ gzip:  1.04 kB
dist/assets/index-CvHI4nQW.js   192.85 kB │ gzip: 60.99 kB

✓ built in 150ms
```

退出码 0。三个数字值得看：21 个模块被合并；JS 产物 192.85 kB、gzip 后 60.99 kB（React 本体占了绝对大头，TodoList 自己的逻辑只占零头）；150ms 是「翻译+打包」的全过程耗时——对比 dev 模式的「每次访问现场翻译」，这就是预计算的收益。

## 二、dist 里有什么

```text
dist/
├── index.html              # 入口，一个 HTML
├── assets/
│   ├── index-CvHI4nQW.js   # 全部 JS（你的代码 + React）合成的单文件
│   └── index-DC58i7tR.css  # 全部 CSS 合成的单文件
├── favicon.svg             # public/ 里的东西原样拷贝
└── icons.svg
```

打开 `dist/index.html` 看引用（真实内容）：

```html
<script type="module" crossorigin src="/assets/index-CvHI4nQW.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-DC58i7tR.css">
```

文件名里那串 `CvHI4nQW` 是**内容哈希**：内容变一个字，哈希就变，文件名跟着变。这不是强迫症，是缓存策略——服务器可以放心让浏览器把静态文件**缓存一年**，因为发版后文件名变了，旧缓存自动失效，用户永远拿到新版。名字不变才是缓存地狱。

## 三、preview：上线前的最后彩排

`dist/` 是纯静态文件，理论上双击 `index.html` 都……不行（模块加载受 CORS 限制），得走 HTTP。Vite 自带彩排命令：

```bash
npm run preview
```

真实输出：

```text
> web-todolist@0.0.0 preview
> vite preview

  ➜  Local:   http://localhost:4173/
```

打开 4173——**这就是用户将来看到的东西**：和 dev 版功能一样，但走的是打包产物。改代码试试：改 `App.tsx` 保存，4173 **纹丝不动**（它伺候的是 dist，不认识源码），5173 立刻变。两副面孔，一次看清。

顺手验证一下产物真的在工作（用 curl 看标题）：

```text
$ curl -s http://localhost:4173/ | grep -o '<title>[^<]*</title>'
<title>TodoList</title>
```

## 四、什么不该进 Git：.gitignore

构建产物和依赖都能随时再生成——`npm install` 还原 node_modules，`npm run build` 还原 dist。可再生的东西进 Git 只会撑爆仓库。模板自带的 `.gitignore` 已经写好了：

```gitignore
node_modules
dist
dist-ssr
*.local
...（日志、编辑器目录等）
```

上一篇之前每次 `git add .` 都「恰好」没带上这两个目录，就是它在背后默默排除。第 09 篇推 GitHub 时，`.gitignore` 保证推上去的 20 来个源文件就是项目的全部真相。

## 自测

1. 故意改错一个字段名 → `npm run build` 失败并给出精确行列 → 改回 → 成功
2. `npm run preview` 打开 4173，全功能过一遍（持久化也在——localStorage 按 5173/4173 端口各存一份，同源规则连端口号也算）
3. 再跑一次 `npm run build`，观察 JS 文件名的哈希**没变**（内容没动哈希就不动）；随便改行代码再 build，哈希变了

代码、结构、构建三关都过了。下一篇把它推上 GitHub——给代码一个公网的家，也给第 10 篇的部署准备载体。
