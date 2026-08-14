---
layout: post
author:     "Corey"
header-img: "img/post-bg-circuit-board.jpg"
header-mask: 0.25
title: "从源码包到成功编译：ASP.NET Core 10.0.10 完整构建复盘"
subtitle: "子模块、VS C++、npm 源、原生代码分析、Gradle、Selenium 与无 Git 仓库的连环踩坑"
date: 2026-08-05
catalog: true
tags: [ASP.NET Core, .NET 10, 源码编译, Arcade, npm, Gradle, Visual Studio, 问题解决]
---

> 拿到一份陌生源码，第一反应往往是「怎么编译？」  
> 这篇先讲清楚「一般项目从源码到编成功」的通用步骤和常见仓库类型，再落到 ASP.NET Core 10.0.10 的真实排错过程。

---

## 开头：这次手里有什么、想干什么

手里有一份源码，路径类似：

```text
E:\github项目源码\aspnetcore-10.0.10\aspnetcore-10.0.10
```

目标：

> 在本机把它编译出来；缺什么环境就补什么。

如果你是第一次面对这种大型仓库，**不要一上来就乱敲 `dotnet build`**。  
下一节先把「任意项目」的通用落地步骤、常见仓库类型讲清楚；再往后，才是这份 ASP.NET Core 怎么套这套方法、真实踩了哪些坑。

---

## 一、从源码到编译成功：通用步骤与仓库类型

这一节不绑定 ASP.NET Core，讲的是**大多数开源/内部项目**都能套用的心智模型。  
后面碰到具体仓库，只是在这个模型上「对号入座」。

### 1. 从源码到编成功，通常要过几关？

可以记成一条主链路（顺序很重要）：

```text
① 拿到源码
    ↓
② 判断仓库类型（决定你该找什么入口、装什么工具）
    ↓
③ 读官方构建说明（README / docs / 脚本）
    ↓
④ 准备环境（SDK、JDK、Node、VS 组件、Git…）
    ↓
⑤ 还原依赖（restore / npm install / 下载工具链）
    ↓
⑥ 按选定范围编译（先小后大）
    ↓
⑦ 确认产物（dll、exe、jar、nupkg、artifacts 目录…）
    ↓
⑧ 失败则修环境或按日志修第一处错误，再回到 ⑤ 或 ⑥
```

每一关用大白话说：

| 关卡 | 你在回答什么问题 | 常见动作 |
|------|------------------|----------|
| ① 拿到源码 | 我拿到的是完整 Git 仓库，还是 zip 源码包？ | `git clone` / 解压；有 submodule 要考虑 `--recursive` |
| ② 判断类型 | 这是小 Demo，还是多语言大仓库？ | 看根目录文件「长相」 |
| ③ 读文档 | 作者希望我用哪条命令编？ | README → Build docs → `build.*` 脚本 |
| ④ 准备环境 | 本机缺什么？ | 装对版本的 SDK/工具；别只看「装过同名软件」 |
| ⑤ 还原依赖 | 第三方包、工具链下齐了吗？ | restore / npm ci / gradle 包装器下载 |
| ⑥ 编译 | 编整棵树，还是先编一块？ | `build` / `dotnet build` / `mvn` / 仓库脚本 |
| ⑦ 确认产物 | 到底有没有产出可用来跑/引用的文件？ | 看 `bin`、`artifacts`、`target`、`dist` |
| ⑧ 排错迭代 | 失败是环境问题，还是代码/依赖问题？ | 先读第一条根因，一次只改一类问题 |

两条容易踩的坑：

1. **跳过 ②③，直接用自己习惯的命令**  
   小项目可能碰巧成功；大项目几乎必翻车。
2. **把 ⑤ 和 ⑥ 混成一步**  
   「缺包」和「编译错误」缠在一起，日志会非常难读。

### 2. 常见仓库大概有哪些类型？

没有唯一标准分类。实践里按「打开根目录看到什么、编译时要准备什么」来分，最有用。  
下面按**从简单到复杂**排列——类型越靠后，环境成本通常越高。

#### 类型 A：单语言、单项目（最小）

**长相：**

- 一个主工程文件：如 `xxx.csproj`、`pom.xml`、`package.json`、`go.mod`
- 可能有一个很小的 README

**典型编译：**

```text
dotnet build
# 或
mvn package
# 或
npm install && npm run build
```

**特点：** 入口单一，环境要求少。新手最常遇到的就是这种。

#### 类型 B：单语言、多项目 / 有解决方案

**长相：**

- .NET：`.sln` + 多个 `.csproj`
- Java：多 module 的 Maven/Gradle
- 前端：monorepo 工具（如 pnpm workspace）但仍主要是 JS/TS

**典型编译：**

```text
dotnet build Xxx.sln
# 或按文档先 restore 再 build
```

**特点：** 还是同一种语言为主；要分清「编整个解决方案」还是「只编其中一个项目」。

#### 类型 C：有锁定工具版本的仓库

**长相：**

- `global.json`（锁 .NET SDK）
- `.nvmrc` / `package.json` 的 `engines`（锁 Node）
- `pom.xml` / toolchain 锁 JDK
- `.python-version`、`rust-toolchain` 等

**特点：**

> 本机「已经装了 .NET / Node」≠ 版本就是仓库要的那个。

编译前要先对齐版本，或让仓库脚本自己下载锁定版本（很多 .NET 大仓会把 SDK 拉到仓库内目录）。

#### 类型 D：带自定义构建脚本 / 工程脚手架的仓库

**长相：**

- 根目录或 `eng/`、`build/`、`scripts/` 下有 `build.cmd`、`build.sh`、`restore.cmd`、`Makefile`、`invoke` 等
- 文档写「请运行 xxx 脚本」，而不是「请对 sln 执行 dotnet build」

**特点：**

> 真正的门卫是脚本，不是你习惯的那条语言命令。

.NET 生态里常见 Arcade；其他生态也有类似「统一入口」。  
**ASP.NET Core 就属于这一类（同时还更复杂）。**

#### 类型 E：带 Git submodule / 多仓库拼装

**长相：**

- 有 `.gitmodules`
- 某些目录一开始是空的，或 clone 后还要 `--recursive`

**特点：** 父仓库只存「指针」；子仓库源码没拉下来，相关部分必然编不过。  
源码若是 zip 且没有 `.git`，官方 submodule 命令可能直接失效，得按 `.gitmodules` 手动补。

#### 类型 F：多语言仓库（一种语言为主，夹杂别的）

**长相：** 同时出现多组「语言身份证」，例如：

| 看到这些 | 往往意味着 |
|----------|------------|
| `*.csproj` / `*.sln` | C# / .NET |
| `*.vcxproj` / `CMakeLists.txt` | C/C++ 原生 |
| `package.json` | Node / 前端 |
| `build.gradle` / `pom.xml` | Java |
| `requirements.txt` / `pyproject.toml` | Python |

**特点：** 完整构建要准备**多条工具链**。只装了其中一种，全量构建常会在「你以为无关」的角落失败。

#### 类型 G：含原生代码 / 强依赖本机 IDE 组件

**长相：**

- C/C++ 工程、需要 MSVC、Windows SDK、Android NDK 等
- 文档要求安装 Visual Studio 某工作负载、Xcode、特定 SDK

**特点：** 「装了 VS」不够，还要勾对工作负载。  
ASP.NET Core 里的 ANCM（IIS 模块）就是这类。

#### 类型 H：超大型 monorepo（上面多种类型叠在一起）

**长相：**

- 目录极多：`src/` 下几十上百个子领域
- 有统一构建系统 + 多语言 + 可能有 submodule + 可能有原生代码
- 官方常写：**不建议动辄全量构建，先编你关心的子树**

**特点：**

```text
日常正确姿势：restore → 进子目录 → 局部 build
验证/发版/学习全貌：才考虑顶层全量 build（最慢、最脆）
```

**本次的 ASP.NET Core 源码，基本就是类型 H**：  
脚本脚手架（D）+ 锁 SDK（C）+ submodule（E）+ C#/C++/Node/Java（F/G）叠在一起。

### 3. 一张总表：类型不同，起步动作不同

| 类型 | 先看什么 | 常见正确入口 | 最容易踩的坑 |
|------|----------|--------------|--------------|
| A 单项目 | 唯一工程文件 | 语言默认命令 | 版本不对 |
| B 多项目同语言 | `.sln` / 多 module | 编 sln 或指定 module | 编错项目、依赖顺序 |
| C 锁版本 | `global.json` 等 | 换 SDK 或用仓库自带 SDK | 本机全局工具「看起来能用」其实版本不对 |
| D 脚本入口 | `build.cmd` / `eng/` | 跑文档指定的脚本 | 跳过脚本直接 `dotnet build` |
| E submodule | `.gitmodules` | `clone --recursive` | 空目录当源码 |
| F 多语言 | 多种清单文件 | 按文档依次准备工具 | 只准备了主语言 |
| G 原生/本机组件 | `.vcxproj` / `.vsconfig` | 装齐 VS/SDK 组件 | 有 IDE 无编译器 |
| H 大型 monorepo | BuildFromSource 类文档 | 先局部、后全量 | 一上来全量，环境债一起爆 |

### 4. 实操时怎么快速「认类型」？

打开根目录，按这个 2 分钟扫描即可：

```text
1. 有 README / docs 吗？ → 先收藏构建章节
2. 有 .gitmodules 吗？ → 类型 E，先处理子模块
3. 有 global.json / .nvmrc 吗？ → 类型 C，先对版本
4. 有 eng/build、restore、Makefile 吗？ → 类型 D，优先跑脚本
5. 同时看到 csproj + vcxproj + package.json + gradle 吗？ → 类型 F/G/H
6. 只有一个 csproj / package.json？ → 多半是类型 A，简单路径
```

认完类型，再回到本节开头那条主链路 ③→⑧，就不会盲打。

### 5. 套回本次：ASP.NET Core 落在哪、第一步怎么走？

对号入座：

| 判断 | 结论 |
|------|------|
| 仓库类型 | 主要是 **H（大型 monorepo）**，并叠加 D/C/E/F/G |
| 官方入口 | `docs/BuildFromSource.md`；命令行先 `restore.cmd` |
| 日常推荐 | 进 `src\Xxx` 跑局部 `build.cmd` |
| 本次目标 | **全量**：`eng\build.cmd -all`（最重路径） |
| SDK | `global.json` 锁定 **10.0.109** |

起步对照：

| 通用关卡 | 这次具体动作 |
|----------|--------------|
| 认类型 / 认仓库 | 看到 `eng\`、`src\`、`docs\`、`global.json`、`restore.cmd` |
| 读文档 | README → `BuildFromSource.md` |
| 定范围 | 明确要全量，而不是只编一个子目录 |
| 环境体检 | Git/子模块、Node、VS 是否带 C++、磁盘、网络 |
| restore → build → 排错 | 后文时间线按失败点逐个修 |

后面会变「脏」，不是因为步骤模型错了，而是类型 H 的环境面太宽：子模块、C++、npm、SourceLink、Gradle、Selenium… 会轮流出场。

下一节先把这份仓库的结构、官方原本怎么编讲清楚；再进入真实时间线。

---

## 二、先看清这份 ASP.NET Core 仓库长什么样

上一节说：编译前先认类型、认仓库。那这份 ASP.NET Core 源码，打开根目录时会看到什么？

如果只做过「新建一个 ASP.NET Web 应用 → F5 运行」，很容易以为它也只是一堆 `.csproj`，然后随手：

```powershell
dotnet build Xxx.sln
```

就完事了。这个仓库不是那样工作的。

### 仓库里都有什么

它更像一个**多语言、多产物的大工地**：

| 部分 | 语言 / 工具 | 大致干什么 |
|------|-------------|------------|
| 大部分框架代码 | C# + .NET SDK | Kestrel、MVC、SignalR、Blazor… |
| IIS 集成模块（ANCM） | **C++** + Visual Studio 工具链 | 让 IIS 能把请求转给 ASP.NET Core |
| 前端相关 | Node / npm | SignalR TS 客户端、Blazor JS 等 |
| SignalR Java 客户端 | Java + Gradle | 给 Java 用的客户端 |

另外还有：

- 顶层 `AspNetCore.slnx` + 很多 `.slnf`：主要给 Visual Studio / IDE「一次只打开一部分项目」用  
- `global.json`：锁定本仓库要用的 **.NET SDK 版本**（这次是 10.0.109）  
- 根目录和 `eng\` 下的脚本：才是命令行构建的正门

### 官方文档原本让你怎么编？

入口在 `docs/BuildFromSource.md`。把它翻译成小白能照做的步骤，大致是：

**1. 先准备环境（Windows）**

- 按文档装好 Visual Studio 及所需组件（为了 C++ 等原生工具）  
- 需要 Node.js（有 JavaScript 依赖）  
- 用 `git clone --recursive` 拉源码（带上 submodule）

**2. 先 restore，不要急着全量编译**

在仓库根目录执行：

```powershell
./restore.cmd
```

官方原话大意：打开 Visual Studio / VS Code 之前，先跑 restore，把依赖装好、把仓库需要的 .NET SDK 准备好。

**3. 日常开发：编你关心的那一块，而不是整棵树**

文档明确写了（警告语气）：

> We do _not_ recommend running the top-level build script for the repo.  
> You'll rarely need to build the entire repo; building a sub-project is usually sufficient.

也就是说，官方更推荐的日常姿势是：

```powershell
cd src\Http          # 举例：你只改 Http 相关
./build.cmd          # 编当前子目录
./startvs.cmd        # 需要的话再开 VS
```

每个子目录自己的 `build.cmd`，才是平常开发主路径。

**4. 什么时候才用 `eng\build.cmd`？**

当你真的要动「整棵仓库」时，才用 `eng\` 目录下的顶层脚本。文档举例包括：

```powershell
# 给可发布项目打开发包（示例）
.\eng\build.cmd -all -pack -arch x64

# 只跑某个测试项目（示例）
.\eng\build.cmd -test -projects .\src\Framework\test\Microsoft.AspNetCore.App.UnitTests.csproj
```

本次目标是「完整构建整棵树」，所以才走到了：

```powershell
.\restore.cmd
.\eng\build.cmd -all
```

这和官方「日常别全量编」的建议不冲突——**日常不推荐全量；你明确要求全量时，才用顶层 `-all`。**

### 那 Arcade 是什么？`restore.cmd` / `build.cmd` 背后在干什么？

可以把 **Arcade** 理解成：

> 微软 .NET 多个大仓库共用的一套「工地管理系统」：统一下载 SDK、还原依赖、按统一规则调用 MSBuild、产出到约定好的 `artifacts` 目录等。

它不是你业务代码里的一个库，而是**构建脚手架**。在这个仓库里，你很少直接敲 `arcade` 这个词；你敲的是脚本，脚本再去用 Arcade SDK。

根目录的 `restore.cmd` 其实很短，核心等价于调用：

```text
eng\build.ps1 -all -nobuild -restore
```

拆开看参数：

| 参数 | 含义 |
|------|------|
| `-restore` | 做还原：下 NuGet、准备工具、按 `global.json` 装仓库锁定的 SDK（进 `.dotnet`）等 |
| `-nobuild` | 这次**不要编译**项目代码 |
| `-all` | 按「全仓库」范围去准备/处理，而不是只盯某一个子目录 |

所以：

```powershell
./restore.cmd
```

≈「把整棵树编译前该准备的东西准备好，但先别开始编」。

而：

```powershell
.\eng\build.cmd -all
```

≈ 「对整棵树执行构建」（默认还会走还原+编译等流程；我们后来加 `-NoRestore` 是因为 restore 已经做过了）。

再往下一层，这些脚本最终还是会调到 MSBuild / 仓库内的 `.dotnet\dotnet.exe`。差别在于：门卫是 Arcade 脚本，不是你随手对某个 `.sln` 执行 `dotnet build`。

一句话串起来：

```text
官方日常推荐：
  restore.cmd  →  进入某个 src\Xxx  →  该目录 build.cmd

本次完整构建：
  restore.cmd  →  eng\build.cmd -all
```

### 本机一开始的状态（用大白话说）

- 装着 VS 2022 Community，但**只装了写 C# 常用的东西**，没有 C++ 编译器那一套  
- 有 Node、JDK  
- 本机 `dotnet` 版本和仓库锁定的不一致（后面发现 restore 脚本会自己下对的 SDK）  
- 目录不像 `git clone` 出来的完整仓库：没有 `.git`，子模块目录是空的  

后面几乎所有坑，都来自「仓库实际需要的工具」和「本机以为已经装好的工具」对不齐。

---

## 三、真实时间线：从检查环境到 ExitCode=0

下面按真实发生顺序写，不美化失败。尽量先讲概念，再讲操作。

### 1. 背景知识：Git submodule 是什么

在讲「为什么一上来就查 submodule」之前，先用一个**从 0 建仓**的小例子把概念钉死。

#### 先讲清楚要解决什么问题

假设你有一个自己的项目 `my-app`，想用 Google 的 `googletest` 做 C++ 单测。  
`googletest` 自己也是一个完整的 Git 仓库。你怎么把它「挂」进 `my-app`？

| 做法 | 含义 | 代价 |
|------|------|------|
| 把对方源码直接拷进本仓库 | 简单 | 版本难追踪，上游更新难合并 |
| NuGet / npm 只引二进制包 | 构建省事 | 改不了对方源码，也编不出依赖对方源码的本地目标 |
| **Git submodule** | 本仓库只记录「对方仓库的地址 + 锁定到哪一次 commit」 | clone 时必须额外把子仓库拉下来 |

**submodule 做的事可以概括成一句话：**

> 父仓库不保存子项目的全部文件内容，只保存一份「指针」；真正的文件在子仓库自己的历史里。

#### 从 0 演示：自己创建一个带 submodule 的仓库

下面用 Windows / PowerShell 也能照做的命令，把「维护者第一次挂子模块」走一遍。

**第 1 步：建一个空的父仓库**

```powershell
mkdir my-app
cd my-app
git init
echo "# my-app" > README.md
git add README.md
git commit -m "初始提交"
```

此时 `my-app` 还是普通仓库，没有任何子模块。

**第 2 步：把别人的仓库挂进来（核心命令）**

```powershell
# 语法：git submodule add <对方仓库url> <本地放在哪>
git submodule add https://github.com/google/googletest src/third_party/googletest
```

这条命令会同时做几件事：

1. 把 `googletest` clone 到 `src/third_party/googletest`
2. 在父仓库根目录生成 / 更新 **`.gitmodules`**（记录 path + url）
3. 在父仓库里记下一笔特殊条目：这个 path **锁定到对方仓库的某次 commit**（不是把对方全部文件永久拷进父仓库历史）

看一眼 `.gitmodules`，大概长这样：

```ini
[submodule "src/third_party/googletest"]
	path = src/third_party/googletest
	url = https://github.com/google/googletest
```

**第 3 步：提交「指针」，不是提交 googletest 全文**

```powershell
git status
# 通常会看到：
#   new file:   .gitmodules
#   new file:   src/third_party/googletest   ← 这是 gitlink（指针），不是普通文件夹里的每个源文件

git commit -m "添加 googletest 子模块"
```

到这里，**维护者侧**就完成了：别人以后 clone 你的 `my-app`，Git 就知道「这里还挂着 googletest」。

**第 4 步：别人怎么拿到完整代码？重点讲 `git clone --recursive`**

同事 A 如果只敲普通 clone：

```powershell
git clone https://github.com/you/my-app.git
```

会得到父仓库，但 `src/third_party/googletest` 往往是**空目录**——指针在，文件还没拉。  
因为默认的 `git clone` **只克隆父仓库本身**，不会自动去拉 submodule。

这时就要用：

```powershell
git clone --recursive https://github.com/you/my-app.git
```

把它拆开理解：

| 部分 | 含义 |
|------|------|
| `git clone <url>` | 先把父仓库（`my-app`）完整拉下来，包括 `.gitmodules` 和子模块「指针」 |
| `--recursive` | clone 完父仓库后，**继续把声明过的子模块也拉下来并检出到锁定 commit** |

所以这条命令≈下面两步合在一起：

```powershell
git clone https://github.com/you/my-app.git
cd my-app
git submodule update --init --recursive
```

再拆一下后面那串参数，免得 `--recursive` 只剩个印象：

| 参数 | 白话 |
|------|------|
| `--init` | 按 `.gitmodules` 初始化子模块配置（第一次才需要） |
| `--recursive` | 如果子模块里面**还有**子模块，也一并拉（嵌套也覆盖） |

也就是说：

```text
git clone --recursive
  = 拉父仓库
  + 读 .gitmodules
  + 按 url 拉每个子模块
  + 检出父仓库锁定的那次 commit
  + 若子模块还有子模块，继续往下拉
```

几个实用写法：

```powershell
# 最常见：克隆到默认目录名（仓库名）
git clone --recursive https://github.com/you/my-app.git

# 指定本地目录名
git clone --recursive https://github.com/you/my-app.git my-app-local

# 新版 Git 更推荐的同义写法（和 --recursive 效果同类）
git clone --recurse-submodules https://github.com/you/my-app.git
```

> 备注：`--recursive` 是较早的写法；较新文档常写 `--recurse-submodules`。日常把它们当成「clone 时把子模块一起带上」即可。ASP.NET Core 官方文档写的是 `--recursive`。

如果已经用普通 `git clone` 拉过了，不必删掉重来，事后用这条补拉：

```powershell
cd my-app
git submodule update --init --recursive
```

这条是 submodule 场景里最常用的「补救命令」，建议按单词拆开记：

| 片段 | 白话 |
|------|------|
| `git submodule` | 进入「管理子模块」这一组命令 |
| `update` | 按**父仓库当前锁定的 commit**，把子模块工作区对齐到那个版本（检出正确文件） |
| `--init` | 如果子模块还没初始化过：先读 `.gitmodules`，登记 url/path，必要时先 clone 子仓库 |
| `--recursive` | 子模块里面若还有子模块，也一并 init + update |

串成一句：

> 先把子模块配置初始化好（`--init`），再按父仓库指针把文件检出到正确版本（`update`），嵌套的也一起处理（`--recursive`）。

它实际大致会做这些事：

```text
1. 读父仓库的 .gitmodules（知道有哪些子模块、url、path）
2. --init：尚未登记的子模块，先 clone 到对应 path
3. update：把每个子模块 checkout 到父仓库记录的那次 commit
4. --recursive：若子模块自己也有 .gitmodules，对下一层重复上述过程
```

注意几个容易误会的点：

1. **`update` 不是「把子模块更新到上游最新」**  
   默认是对齐到**父仓库已经钉死的那次 commit**。  
   想追上游新版本，那是另一回事（例如进子模块目录拉新提交，再回父仓库提交新的指针）。

2. **必须在「有 `.git` 的父仓库」里跑**  
   没有父仓库元数据时，这条命令会直接失败——本次 ASP.NET Core 源码包就是这种情况。

3. **和 `clone --recursive` 的关系**  
   `git clone --recursive` 内部本质就是：先 clone 父仓库，再自动执行类似 `submodule update --init --recursive` 的步骤。

对比一下两种起点：

```text
一开始就用 clone --recursive
  → 一次到位，目录里立刻有 googletest 源码

先普通 clone，再 submodule update --init --recursive
  → 结果一样，只是拆成两步；适合「已经 clone 完才发现缺子模块」
```

少写参数时会发生什么（帮助记忆）：

```powershell
# 只 update、不加 --init：子模块若从未初始化，常常什么也拉不下来
git submodule update

# 加了 --init、不加 --recursive：第一层子模块会好，嵌套的子模块可能仍空
git submodule update --init

# 完整补拉（日常推荐）
git submodule update --init --recursive
```

**第 5 步：怎么确认子模块是否真的有了？**

```powershell
git submodule status
# 正常时类似：
#  <一串commit> src/third_party/googletest (某标签或分支信息)

# 目录里也应该能看到真实文件，而不再是空壳
dir src\third_party\googletest
```

#### 三种「看起来有目录、其实不能用」的状态

把上面例子对照现实，就会出现三种常见坑：

```text
只下了源码 zip / 没带 .git
  → 可能残留空的 path 目录；没有父仓库元数据，submodule 命令也跑不动

git clone 时忘了 --recursive
  → path 往往是空目录；但父仓库的 .git 还在，可用 submodule update 补拉

完整 recursive clone / submodule update 成功
  → path 下才有真实源码，才能拿去编译
```

落地时记住三类东西即可：

1. **`.gitmodules`**：子模块叫什么、放哪、从哪拉  
2. **父仓库里的 gitlink**：锁定到对方哪一次 commit  
3. **工作区目录**：只有 `update --init` / `--recursive` 成功后，才有真实文件  

#### 和本次 ASP.NET Core 的对应关系

ASP.NET Core 做的事，和上面 `my-app` 例子完全同构，只是子模块换成了：

- `src/submodules/googletest`
- `src/submodules/MessagePack-CSharp`

后面原生测试、部分依赖编译会直接吃这些目录里的源码——**空壳目录等于缺依赖**。

理解了「从 0 挂 submodule → 别人必须 recursive clone」这条链，再看下面的排查就顺了：不是随便执行一条神秘命令，而是先确认「这个仓库是否声明了 submodule」，再确认「工作区里有没有把指针兑现成文件」。

### 2. 为什么一上来就想到 submodule？

并不是「猜大型仓库都有子模块」。顺序其实是：**先读官方构建说明，再看到仓库里的证据文件，最后才跑命令验证。**

第一步，README 把构建入口指到 `docs/BuildFromSource.md`。文档开头就写明：

```bash
git clone --recursive https://github.com/YOUR_USERNAME/aspnetcore
```

以及已经 clone 过但漏了子模块时：

```bash
git submodule update --init --recursive
```

这直接回答了「为什么会想到 submodule 命令」——**因为官方构建文档把递归拉取子模块写成了前置步骤**，不是可选优化。结合上一节：`--recursive` / `submodule update --init` 做的就是「把 `.gitmodules` 里的指针变成真实文件」。

第二步，回到仓库根目录核对「文档说的东西，这个目录里有没有」。结果看到了 `.gitmodules`，内容大致是：

```ini
[submodule "src/submodules/googletest"]
	path = src/submodules/googletest
	url = https://github.com/google/googletest
[submodule "src/submodules/MessagePack-CSharp"]
	path = src/submodules/MessagePack-CSharp
	url = https://github.com/aspnet/MessagePack-CSharp.git
```

有 `.gitmodules`，就说明这个树**设计上依赖 Git submodule**；接下来才值得去跑 `git submodule status` / 看目录是否空壳。

第三步才是命令验证：

```powershell
git submodule status
# fatal: not a git repository (or any of the parent directories): .git

Test-Path .git   # False
# 目录存在，但文件数为 0
(Get-ChildItem src\submodules\googletest).Count      # 0
(Get-ChildItem src\submodules\MessagePack-CSharp).Count  # 0
```

这里的失败信息要拆开读：

- `git submodule *` **依赖父目录是 Git 仓库**（需要 `.git`）
- 本次拿到的更像源码包：有 `.gitmodules` 和空 path，但没有 `.git`
- 所以不是「submodule 功能坏了」，而是 **没有 Git 元数据，官方推荐的 submodule 补拉路径根本走不通**

完整推理链是：

> 文档要求 recursive clone → 仓库里有 `.gitmodules`（声明了子模块） → 尝试用 submodule 体检 → 发现没有 `.git`，命令失败 → 再看 path 目录是空壳（指针没兑现成文件） → 只能按 `.gitmodules` 里的 url **手动 `git clone` 填进去**。

如果一上来不读 `BuildFromSource.md`、也不看 `.gitmodules`，确实没有理由无故去跑 submodule。这次是「概念 → 文档 → 仓库证据 → 命令验证」，不是玄学。

同一轮体检还顺带确认了：

1. googletest / MessagePack 文件数为 0（空壳）  
2. `vswhere -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64` 无结果  
3. C 盘大约只剩 **16GB**，后面会被 VS 组件吃掉大半  
4. Node / JDK 已有，PowerShell 策略可用  

结论：先修环境，再谈编译。

### 3. 补子模块、补 yarn

没有 `.git` 时，`git submodule update` 走不通；但 `.gitmodules` 已经把 path / url / branch 写死了，等价操作就是按同样地址 clone 到同样路径——相当于人工完成「把指针兑现成文件」这一步：

```powershell
git clone --depth 1 -b main https://github.com/google/googletest.git src\submodules\googletest
git clone --depth 1 -b master https://github.com/aspnet/MessagePack-CSharp.git src\submodules\MessagePack-CSharp
npm install -g yarn
```

注意：手动 clone 得到的是「目录里有源码」，但**不会**自动恢复父仓库里的 gitlink 记录；对本机只求能编译来说通常够用。若以后要跟官方一样做 submodule 版本锁定与更新，仍建议重新 `git clone --recursive` 一份完整仓库。

子模块补齐后，原生测试与 MessagePack 相关依赖才有源码可编。

### 4. 背景知识：ANCM 到底是啥？为什么害我装 C++？

先说结论，后面再展开：

> ASP.NET Core 源码里，大部分是 C#。  
> 但有一块叫 **ANCM** 的东西是用 **C++** 写的。  
> 你要「完整编译整个仓库」，就得把这块也编出来 → 所以必须装 VS 的 C++ 工具。

如果你暂时只关心「为什么卡在装 C++」，记住上面三句就够。  
下面用更生活的说法，把 ANCM 是什么讲清楚。

#### 用饭店比喻：IIS、ANCM、你的网站

假设用户打开浏览器访问你的网站，在 Windows 服务器上常见是这样分工：

| 角色 | 像什么 | 干什么 |
|------|--------|--------|
| **IIS** | 饭店大门 + 前台 | 对外听 80/443 端口，管网站、证书这些 |
| **你的 ASP.NET Core 网站** | 后厨 | 真正处理业务：登录、下单、返回 JSON/页面 |
| **ANCM** | 传菜员 | 前台不会炒菜；后厨也不直接对外开门。中间需要人把客人点的菜单传到后厨 |

所以：

- **IIS 不会写 C# 业务**
- **你的网站也不会自己去当 Windows 上的「站点入口」**（很多公司规定必须挂在 IIS 后面）
- 中间这个传菜员，就是 **ANCM**

ANCM 全称很长：ASP.NET Core Module。  
不必死记，把它想成：**装在 IIS 里的一个插件（本质是几个 `.dll` 文件）**。

#### 平时你为什么感觉不到它？先搞清 Hosting Bundle

因为平常部署时，微软已经帮你装好了。装的那个东西，就叫 **.NET Hosting Bundle**（常译「托管包」）。

可以把它理解成：**给 Windows 服务器准备的「ASP.NET Core 运行套装」**，不是给你开发机写代码用的 SDK。

一张表分清三个容易混的安装包：

| 安装包 | 主要给谁用 | 里面大致有什么 |
|--------|------------|----------------|
| **.NET SDK** | 开发者本机 | 能 `dotnet build` / `dotnet run`，写代码、编译 |
| **.NET Runtime** | 只跑 .NET 程序的机器 | 能运行 `dotnet MyApp.dll`，但不含完整开发工具 |
| **.NET Hosting Bundle** | 要在 **IIS 上托管** ASP.NET Core 网站的 Windows 服务器 | Runtime + **ANCM（传菜员）** + 让 IIS 认识 ASP.NET Core 所需的组件 |

所以 Hosting Bundle 的作用，白话就是：

> 服务器上已经有 IIS 了；  
> 再装一个 Hosting Bundle，  
> IIS 才知道怎么接待 ASP.NET Core 网站（因为 Bundle 里带了 ANCM 等部件）。

部署时常见流程是：

```text
1. Windows 服务器装好 IIS
2. 再装对应版本的 .NET Hosting Bundle
3. 把你发布好的网站放到 IIS 站点下
4. 网站就能跑 —— ANCM 已经随 Bundle 装好了
```

注意几点小白向区别：

1. **Hosting Bundle ≠ 你的网站**  
   Bundle 是「服务器底座」；你的业务网站还要自己发布、自己部署。

2. **Hosting Bundle ≠ 这次编译源码需要的东西**  
   Bundle 提供的是**已经编译好的** ANCM。  
   我们这次是在编译 aspnetcore **源码**，等于要自己生产出 Bundle 里那种 DLL，所以还得装 C++。

3. **版本要对上**  
   网站用 .NET 8 / 10，服务器通常也要装对应大版本的 Hosting Bundle。

类比回到饭店：

```text
平时做业务开发 / 部署：
  饭店已经通过 Hosting Bundle「雇好了传菜员」（现成的 ANCM）
  你只负责后厨菜谱（写 C#、发布网站）

这次编译 aspnetcore 源码：
  你要自己把「传菜员」从源码造出来
  而传菜员这份代码是 C++ 写的
  → 本机就得有 C++ 编译器
```

#### 请求大概怎么传？（知道大意即可）

浏览器访问网站时，简化成一条线：

```text
浏览器  →  IIS（大门）  →  ANCM（传菜）  →  你的 ASP.NET Core 应用（后厨）
```

ANCM 中间会干这些实事（仍然用大白话）：

1. 帮 IIS 把你的网站进程拉起来（或在 IIS 进程里加载你的应用）
2. 把 HTTP 请求交给应用
3. 把应用的响应送回去
4. 应用挂了时，配合回收 / 重启这类托管事情

它还有两种工作方式（现在先有个印象，细节可后查官方文档）：

- **进程外**：IIS 和一个独立的网站进程，ANCM 在中间转发（像两个房间传菜）
- **进程内**：网站跑在 IIS 同一个进程里（少一次来回，通常更快）

对这次编译来说，**不必先搞懂两种模式的全部细节**。  
只要知道：仓库里这份 C++ 代码，就是在实现这个「传菜员」。

#### 它在源码的哪里？长什么样？

路径：

```text
src\Servers\IIS\AspNetCoreModuleV2\
```

这里的工程文件后缀是 `.vcxproj`，意思是 **Visual C++ 工程**。  
不是你熟悉的 `.csproj`（C# 工程）。

编出来的结果，是给 IIS 加载的原生 DLL，例如：

- `aspnetcorev2.dll`
- `aspnetcorev2_inprocess.dll`

缺 C++ 工具时，构建常会报类似：

```text
找不到 Microsoft.Cpp.Default.props
```

翻译成人话就是：

> 我想编 C++ 工程，但本机没有 C++ 那套编译配置 / 编译器。

#### 所以：完整构建为什么要装 VS 的 C++？

Visual Studio 不是「装了就能编一切」。  
安装器里勾什么，决定你有没有对应编译器：

```text
只勾「ASP.NET 和 Web 开发」
  → 适合编 C#
  → 编不了 ANCM

再勾「使用 C++ 的桌面开发」
  → 才有 C++ 编译器（cl.exe）等工具
  → 才能编 ANCM
```

官方文档也写了大意：Windows 上就算你不用 VS 写代码，也要装 VS，主要是为了拿 **C++ 原生工具**。

仓库根目录的 **`.vsconfig`**，就是一份「要勾哪些组件」的购物清单，里面有：

- Native Desktop（C++ 桌面开发）
- VC Tools x86/x64（C++ 编译工具）
- 以及 ATL、Windows SDK 等

怎么确认本机有没有装上？别看开始菜单有没有 VS 图标，直接查：

```powershell
vswhere -latest -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath

Test-Path 'C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC'
```

这次检查结果：VS 在，但上面两项没有 —— **有编辑器，没有 C++ 编译器**。

最后做一个选择对照：

| 你的目标 | 要不要编 ANCM | 要不要装 C++ |
|----------|---------------|--------------|
| 只学某块 C# 源码 | 可不编 | 可不装；或加 `-noBuildNative` |
| 网站部署到 IIS | 不用自己编（用安装包里的） | 一般不用 |
| **本次：完整构建整个仓库** | **要编** | **要装** |

后面还会遇到：C++ 已经能编了，但「代码分析」又报错。  
那是另一件事，不要和「没装 C++」混在一起（见后文）。

### 5. 安装 VS C++ / Native 工作负载（真实踩坑）

上一节的结论很简单：完整构建要编 ANCM，ANCM 是 C++，所以要装 C++ 工具。下面是真实安装过程里踩过的坑。

做法：用根目录 `.vsconfig`，对已安装的 VS 2022 Community 执行安装器的 `modify`（修改现有安装，而不是重装整个 VS）。

第一次失败：PowerShell 里 `Start-Process` 传参时，把带空格的路径

```text
C:\Program Files\Microsoft Visual Studio\2022\Community
```

拆成了 `C:\Program`，安装器报「找不到已安装产品」。  
（小白向提示：Windows 路径里有空格时，参数必须当成**一个整体**加引号，否则会被切成两截。）

第二次：路径正确加引号，并用管理员权限（`runas`）启动安装。安装过程中 C 盘一度掉到约 **1GB**，临时清理 Temp / NuGet 缓存后才把空间抬回约 8GB，最终 `ExitCode=0`，`VC\Tools\MSVC` 目录出现。

怎么确认装好了？再跑一遍前面的检查：`vswhere -requires ...VC.Tools...` 能返回安装路径，`VC\Tools\MSVC` 为 True。

经验：

> 「装了 Visual Studio」≠「装了编这个仓库需要的组件」。  
> 完整构建 ANCM 时，缺的是 C++ 工具链；装的时候还要同时盯着：路径空格、管理员权限、C 盘剩余空间。

### 6. 第一次 restore：NuGet 大致过关，npm 翻车

把缓存指到 E 盘，避免继续压垮 C：

```powershell
$env:NUGET_PACKAGES = 'E:\build-cache\nuget-packages'
$env:npm_config_cache = 'E:\build-cache\npm-cache'
.\restore.cmd
```

Arcade 会自动下载锁定的 **SDK 10.0.109** 到仓库内 `.dotnet\`，这点很重要：本机装了别的 SDK 也不影响仓库构建。

restore 后期失败在：

```text
npm error invalid json response body at
https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet-public-npm/...
@typescript-eslint%2ftypescript-estree
reason: Unterminated string in JSON at position ~29MB
```

仓库默认 `.npmrc`：

```text
registry=https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet-public-npm/npm/registry/
always-auth=true
```

Azure Artifacts 对超大 package metadata 的响应在本机被截断。改用官方 npm：

```text
registry=https://registry.npmjs.org/
```

再配合清理半残的 `node_modules` 后：

```text
npm ci  ExitCode=0   # added 1387 packages
restore ExitCode=0
```

### 7. 第一次全量构建：死在「代码分析」，不是死在「没装 C++」

C++ 工具装好后，终于可以开编：

```powershell
.\eng\build.cmd -all
```

结果很快失败。日志里又能看到 ANCM（那份 C++ 工程）相关的错误号，比如 `C6800`、`C26467`。

这一节最容易让人晕：刚装完 C++，怎么又报 C 开头的错？是不是还没装好？

**先说结论：编译器已经有了。失败的是多出来的一层「自动挑刺」。**

#### 先分清两件事

编 C++ 时，机器上其实可能在干两件事：

| 步骤 | 在干什么 | 失败时通常意味着 |
|------|----------|------------------|
| **真正编译** | 把 `.cpp` 翻译成 `.dll` / `.exe` | 语法错了、缺头文件、找不到链接库…… |
| **代码分析**（可选） | 编译的同时，再用另一套规则「扫描代码写得规不规范」 | 规则文件坏了，或某条规范检查没通过 |

打个比方：

> 真正编译像「把菜做熟」；  
> 代码分析像「旁边还有个检查员，按检查表扣分」。  
> 检查表读不出来，或检查员特别严，整桌菜也会被判不合格——尽管锅本身是好的。

上一节解决的是「有没有锅」（有没有 `cl.exe` / MSVC）。  
这一节卡的是「检查员太严 / 检查表坏了」。

#### 仓库为什么要开代码分析？

微软在 CI 里希望 ANCM 这份原生代码更「干净」，所以在构建配置里默认打开了类似这样的开关（概念上，不必死记文件名）：

1. **打开分析**：编译时顺便跑静态检查  
2. **指定规则表**：哪些问题要管、哪些可以不管（仓库里有一份规则表文件）  
3. **警告当错误**：检查没过，构建直接失败，不允许「带病通过」

对官方流水线这很合理。对本机「先把源码编出来学习」来说，这层检查却经常变成额外噪音。

#### 这次具体怎么坏的？

日志里大致是这个连锁反应：

1. 构建去读「规则表」  
2. 规则表**没读成功**（于是出现 `C6800` 一类提示）  
3. 读失败后，分析器可能退回**更严的默认规则**  
4. 一些本来在仓库规则表里可以忽略的问题，被默认规则抓出来  
5. 又因为「警告当错误」，这些提示全部变成构建失败（于是看到 `C26467`、`C26859` 等）

至于规则表为什么读失败，本机有几处加重因素（不必深挖也能继续编）：

- 仓库路径里有中文  
- 机器上除了 VS 2022，还有更新的 VS Insiders，工具版本更容易和规则表「对不齐」

对小白最重要的认知是：

> **这不等于 C++ 又装坏了。**  
> 也**不等于** ANCM 源码在本机绝对编不过。  
> 它首先意味着：多出来的那层静态检查，在本机环境里先把自己搞崩了。

#### 怎么处理？关检查，不关编译

本地完整构建时，可以明确告诉构建系统：**还是编 ANCM，但不要跑那套代码分析。**

```powershell
.\eng\build.cmd -all -NoRestore /p:RunCodeAnalysis=false /p:EnablePREfast=false
```

参数含义用大白话说：

- `RunCodeAnalysis=false`：关掉「编译时顺便静态分析」  
- `EnablePREfast=false`：关掉相关的分析引擎开关（和上一行是一路的）  
- **没有**写 `-noBuildNative`：所以原生工程仍会编，只是少了检查员

对比一下，避免再混：

| 做法 | 结果 |
|------|------|
| 不装 C++ / 使用 `-noBuildNative` | ANCM 这份 C++ **不编** |
| `/p:RunCodeAnalysis=false` | ANCM **照样编**，只是不做那套静态挑刺 |

加了这两个参数后，原生 ANCM 能编过，后面大量 C# 项目也开始顺利产出。

### 8. 第二次全量构建还剩三类问题：各自是什么、怎么修

关掉代码分析再编，大约跑了将近一小时。这一次已经不是「环境完全没准备好」，而是**大部分都编过了，末尾还卡着三类彼此无关的问题**（日志里合计 5 条错误，归并后是下面三件事）。

下面按「背景 → 报错在说什么 → 怎么解决」把它们拆开，避免只丢一张修复对照表。

#### 问题 A：`RepositoryCommit must be specified`（没有 Git 历史，却要写进包信息）

**先补知识点：SourceLink、提交号、`/p:` 参数分别是什么**

完整构建不只生成 `.dll`，有些项目还要打成 **NuGet 包**（可以理解成「把编译结果 + 说明信息打成一个可分发的压缩包」）。  
包里除了程序集，往往还要写一段「说明书」：这段代码从哪个仓库来、对应哪一次提交。这样别人拿到包出了 bug，还能对照源码定位。

这里会出现三个容易混在一起的词：

| 名词 | 大白话 |
|------|--------|
| **Git commit / 提交号** | 给仓库每一次改动拍的「快照身份证」，一长串 40 位十六进制（SHA） |
| **`RepositoryCommit`** | 构建/打包时要用的那个「提交号」字段；准备写进包的元数据里 |
| **`SourceRevisionId`** | 同一类信息的另一个常用属性名，很多脚本里和提交号一起填；可以先把它理解成「源码版本号」的姐妹字段 |

那 **SourceLink** 又是什么？

正常有 `.git` 的仓库里，构建系统可以自动问 Git：

> 「你现在检出的是哪次 commit？仓库远程地址是什么？」

问到之后，自动填进 `RepositoryCommit` 等字段。这套「自动从 Git 挖版本信息、方便调试时跳回源码」的能力，常被统称为 **SourceLink** 相关机制。

所以理想路径是：

```text
有 .git
  → SourceLink / 构建脚本自动查出 commit
  → 填进 RepositoryCommit
  → 打包校验通过
```

本次是源码包，没有 `.git`，理想路径走不通。

最后解释一下命令里的 **`/p:名字=值`**：

- `eng\build.cmd` 底层会调到 MSBuild
- `/p:` 是在给这次构建**临时塞属性**（property），不必改仓库文件
- 例如 `/p:DisableSourceLink=true` 的意思就是：「这次构建请关掉 SourceLink 自动查询」

懂了这些，再看报错和修复就不会像空降缩写。

**报错在说什么**

类似：

```text
error : RepositoryCommit must be specified
```

出现在 `Microsoft.AspNetCore.App.Runtime`、`App.Ref` 这类项目的打包阶段。

翻译成大白话：

> 「我要往包里写『源码提交号』（`RepositoryCommit`），但你这边是空的，校验不让过。」

**为什么这次是空的**

- 有 `.git` 时：构建可以问 Git「当前是哪次 commit」  
- 没有 `.git` 时：问无可问，自动填充失败  
- 打包规则又要求这个字段**必须有值**，所以直接报错

这不是业务代码写错，而是**源码包形态（无 Git）+ 打包元数据校验**撞车。

**怎么解决**

本地学习型完整构建，可以用 `/p:` 把意图讲清楚：

1. `DisableSourceLink=true`：别再自动去查 Git 了（反正也没有 `.git`）  
2. `RepositoryCommit=0000…0000`：我手动给你一个占位提交号，表示「我知道没有真实 commit，但字段不能空」  
3. `SourceRevisionId=...`：同类版本字段一并填上，避免后续步骤还读另一个空属性

```powershell
/p:DisableSourceLink=true `
/p:RepositoryCommit=0000000000000000000000000000000000000000 `
/p:SourceRevisionId=0000000000000000000000000000000000000000
```

全 0 的 SHA 在这里只是**占位符**，不是某次真实历史。它能让本机编过、打出包；但**不是**官方 CI 那种带真实提交信息的产物。若要严格对齐上游，应重新 `git clone --recursive` 带 `.git` 的仓库，让 SourceLink 自动填真值。

---

#### 问题 B：SignalR Java 的 `gradlew compileJava` 失败（Java 小工程也要下载构建器）

**背景**

ASP.NET Core 仓库里不只有 C#。`src\SignalR\clients\java\` 是给 Java 开发者用的 SignalR 客户端，构建工具是 **Gradle**（可以粗暴理解成「Java 世界里有点像 Maven / 也像 npm 脚本」的那套）。

项目里通常不直接要求你本机预装好 Gradle，而是带一个 **`gradlew`（Gradle Wrapper）**：

> 第一次运行时，脚本会按配置去下载指定版本的 Gradle（这次是 9.2.1，压缩包大约一百多 MB），再执行 `compileJava`。

**报错在说什么**

```text
error MSB3073: 命令“../gradlew compileJava”已退出，代码为 1
```

这是外层 MSBuild 在说：我调用 Java 那边的脚本，脚本自己失败了。真正原因要看 Gradle / 网络，而不是 C# 编译器。

**这次为什么失败**

两层叠加：

1. **超时太短**：wrapper 配置里曾是 `networkTimeout=10000`（10 秒）。百兆级安装包，10 秒根本下不完。  
2. **官方源太慢**：本机访问 `services.gradle.org` 只有大约几十 KB/s，即使用更长超时也要很久。

所以表面是「Java 编译失败」，实质是「**连 Gradle 自己都还没下载成功**」。

**怎么解决**

1. 把超时调大（例如 600000 毫秒）  
2. 用国内镜像把 `gradle-9.2.1-bin.zip` 先下到本地（本次腾讯云镜像很快）  
3. 先在 Java 目录单独验证：

```powershell
cd src\SignalR\clients\java\signalr
.\gradlew.bat --version
.\gradlew.bat compileJava -PpackageVersion=10.0.10
```

看到类似：

```text
Welcome to Gradle 9.2.1!
BUILD SUCCESSFUL in 3m 29s
```

再回去跑全量构建，这条错误就不会再挡路。

---

#### 问题 C：E2E 测试里 `OpenQA.Selenium.BiDi.Communication` 不存在（依赖升级把命名空间改没了）

**先补知识点：Selenium 是什么？E2E 又是什么？**

做网站时，光有单元测试（测某一个类/方法）往往不够。还想模拟真人：

> 打开浏览器 → 点按钮 → 看页面有没有按预期变化。

这类「从用户入口一路测到结果」的测试，常叫 **E2E（End-to-End，端到端）测试**。

**Selenium** 就是做浏览器自动化最常见的开源工具之一。你可以把它理解成：

> 用代码遥控 Chrome / Edge 等浏览器：打开网址、点击、输入、读页面内容。

在 .NET 里，一般通过 NuGet 引用 `Selenium.WebDriver` 等包，C# 代码里会出现 `OpenQA.Selenium...` 这样的命名空间（`OpenQA` 是 Selenium 项目里沿用已久的前缀，看到它基本就知道在跟 Selenium 打交道）。

ASP.NET Core 源码仓库里有一批 Blazor / Components 相关的 E2E 测试，就是靠 Selenium 去驱动真实浏览器，验证交互是否正确。版本写在 `eng\Versions.props`，这次锁定的是 **Selenium 4.44.0**。

再补一个会出现在报错里的词：**BiDi**。  
可以先粗懂为「浏览器和自动化工具之间的一种较新的双向通信能力」；Selenium 为此提供了一组 API。你暂时不必搞懂 BiDi 协议细节——这次翻车只是因为 **API 所在的命名空间改名/搬走了**。

还有一点很关键：

> 完整构建（`eng\build.cmd -all`）默认也会**编译**这些测试项目，  
> 哪怕你这次并不打算真的打开浏览器去跑测试。

所以 Selenium 相关的编译错误，一样能挡住「完整构建成功」。

**报错在说什么**

```text
error CS0234: 命名空间“OpenQA.Selenium.BiDi”中不存在类型或命名空间名“Communication”
```

出现在两个测试文件里的：

```csharp
using OpenQA.Selenium.BiDi.Communication;
```

翻译成大白话：

> 「你写了 `using` 要引入这个命名空间，但当前引用的 Selenium 程序集里，已经没有这个命名空间了。」

**为什么会这样**

Selenium 4.44 做了 BiDi API 整理，把原来的 `BiDi.Communication` 扁平化/挪走了。  
仓库测试代码里这两处 `using` 还留着旧名字；而且细查下来，**文件里其实没有真正用到这个命名空间里的类型**——只剩一行过期的 `using`。

这是典型的「上游包 breaking change（破坏性变更），下游测试清理不及时」。

**怎么解决**

最小改动：删掉那两处无效 `using` 即可。不需要降级 Selenium，也不需要改测试逻辑。

---

#### 三类问题修完后，第三次构建成功

把前面所有有效开关合在一起（代码分析关、SourceLink/占位 commit、Java/Gradle 已就绪、Selenium using 已删）：

```powershell
.\eng\build.cmd -all -NoRestore `
  /p:RunCodeAnalysis=false `
  /p:EnablePREfast=false `
  /p:DisableSourceLink=true `
  /p:RepositoryCommit=0000000000000000000000000000000000000000 `
  /p:SourceRevisionId=0000000000000000000000000000000000000000
```

结果：

```text
已成功生成。
    0 个警告
    0 个错误
已用时间 00:50:38.19
build ExitCode=0
```

产物抽查：

- `artifacts\bin\Microsoft.AspNetCore\...`
- `artifacts\bin\Microsoft.AspNetCore.Server.Kestrel\...`
- ANCM：`aspnetcorev2_inprocess.dll`
- E2ETests DLL（说明 Selenium 那处 using 已修好）
- 部分 Shipping nupkg  
- `artifacts\bin` 下 DLL 数量约 **5 万** 量级

到这里，「完整构建」这个目标才真正闭环：不是某一条命令运气好，而是三类末尾问题各自按背景对症处理后，才得到 `ExitCode=0`。

## 四、这些坑分别在讲什么

把上面时间线再抽象一层，方便以后「对号入座」。细节仍以第二节为准。

### 1. Arcade 不是普通 `dotnet build`

Arcade 是微软多个 .NET 大仓库共用的构建脚手架：统一下 SDK、还原、按约定调用 MSBuild、产物进 `artifacts`。  
你直接接触的是 `restore.cmd` / `eng\build.cmd`；它们背后才用到 Arcade。  

官方日常更推荐：`restore.cmd` 后进入某个 `src\Xxx` 跑该目录的 `build.cmd`。  
`eng\build.cmd -all` 是「整棵树都要」时才用的顶层路径——本次目标如此，所以走了全量。

### 2. 无 Git 元数据的源码包有额外税

没有 `.git` 时，常见连锁是：submodule 空壳 + 打包阶段要 `RepositoryCommit`。  
本地学习可用占位 commit / 关 SourceLink；要跟官方一致，就重新 recursive clone。

### 3. npm 镜像与「大 metadata」

内部 Azure npm feed 对超大包元数据更容易截断。公开源码学习场景，切 `registry.npmjs.org` 通常更稳。

### 4. 「没装 C++」和「代码分析太严」是两件事

前者补 VS Native / MSVC；后者在已能编 ANCM 时关 `RunCodeAnalysis`。不要用 `-noBuildNative` 去掩盖分析问题，除非你本来就不想编原生。

### 5. 依赖升级会撕开测试里的旧 using

Selenium 4.44 去掉 `BiDi.Communication` 后，过期 `using` 就能让整个完整构建失败——哪怕测试逻辑没用到它。

### 6. Wrapper 下载失败，看起来像「语言编译失败」

`gradlew compileJava` 退出码 1，先查 Gradle 发行包有没有下下来、超时和镜像是否合理，再怀疑 Java 代码本身。

---

## 五、可复用的检查清单

以后再编 ASP.NET Core 这类大型源码树，可以按这个顺序自检：

1. **仓库形态**：有没有 `.git`？submodule 是否非空？  
2. **磁盘**：C 盘是否撑得住 VS 组件 + SDK；缓存能否迁到大盘  
3. **VS 装了 ≠ C++ 齐了**：有没有 `VC\Tools\MSVC`？`.vsconfig` 里的 NativeDesktop / VC.Tools 装了没？完整构建 ANCM 才需要；只学 C# 可用 `-noBuildNative`  
4. **SDK**：不要迷信本机 `dotnet --list-sdks`，以 `global.json` + 仓库内 `.dotnet` 为准  
5. **npm**：默认 feed 拉大包失败时，换公开 registry 并清半残 `node_modules`  
6. **原生分析**：C++ 工具已齐但仍报 C26xxx / C6800 时，先试 `/p:RunCodeAnalysis=false`（关分析，不是关原生编译）  
7. **无 Git pack**：准备 `DisableSourceLink` 与 `RepositoryCommit`  
8. **Java**：先 `gradlew --version` / `compileJava`，确认发行包与 JDK  
9. **测试工程**：锁定依赖发生 breaking 时，对照实际 DLL 导出类型，而不是只看文档记忆  

---

## 六、最终结果与边界说明

这次任务最终达到的是：

> 在 Windows 上对 ASP.NET Core **10.0.10** 源码包完成 `eng\build.cmd -all` 级别的完整构建，`ExitCode=0`。

它**不是**：

- 官方 CI 的逐 bit 复刻  
- 已跑通全量测试（本次目标是编译，不是 ` -test`）  
- 对 SourceLink / 真实 commit 元数据的生产级打包  

本地为打通构建做的调整包括：npm registry、Gradle 镜像与超时、关闭原生代码分析、关闭 SourceLink、以及两处无效 Selenium using。这些都是「让本机完整编过」的工程手段；若要给上游提 PR，应另开干净 clone，并按官方贡献流程验证。

---

## 七、一句话收束

编译大型框架源码，难点很少是「语法错了」，而往往是：

> **子模块、磁盘、IDE 工具链、包源、分析器、Git 元数据、跨语言构建器**——这些边界没有同时对齐。

这次从空子模块走到 `0 错误`，每一步失败都在提醒：先把边界对齐，再谈 `build.cmd`。
