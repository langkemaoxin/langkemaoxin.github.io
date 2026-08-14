---
layout: post
header-img: "img/post-bg-unix-linux.jpg"
header-mask: 0.25
title:      "修好这台机器的 Jekyll 构建环境：从缺 Ruby 到 build 成功"
subtitle:   "一次 Windows 上 Ruby、Bundler、Jekyll 与 YAML 配置错误的完整排障记录"
date:       2026-03-29
author:     "Corey"
catalog: true
tags:
    - Jekyll
    - Ruby
    - Bundler
    - Windows
    - Blog
---

> 这次修的表面问题是“这台机器没有 Ruby / Bundler，因此跑不了 `jekyll build`”；但真正把链路打通以后，暴露出来的其实是两个问题：**机器缺运行环境**，以及**仓库里本来还藏着一个 YAML 配置错误**。

上一篇文章里，我提到自己的博客仓库 `D:\Github\langkemaoxin.github.io` 当时没法做构建级校验，因为这台机器没有 Ruby / Bundler。后面我决定不再停留在“记录问题”的层面，而是直接把这条链路彻底修好。

这篇文章，就是这次修复过程的完整记录。

---

## 一、问题最初长什么样

最开始的报错其实非常直接。

当时我想在博客仓库里执行 `jekyll build`，结果发现这台机器根本没有：

- `ruby`
- `gem`
- `bundle`

也就是说，Jekyll 所依赖的整条 Ruby 运行链路在这台机器上都是缺失的。

从现象上看，问题很简单：**机器没装环境**。

但真正做工程排障时，不能只停在“缺环境”这个结论上，还要继续确认：

1. 仓库到底依赖哪些 Ruby gem？
2. 应该装哪个 Ruby 版本最稳？
3. Windows 上要不要带 DevKit？
4. 环境装完以后，仓库本身会不会还藏着别的错误？

---

## 二、先看仓库，不要先盲装

我第一步不是马上安装 Ruby，而是先读仓库里的 `Gemfile`。

这个仓库的依赖非常明确：

```ruby
source 'https://rubygems.org'
gem 'jekyll-paginate'

gem "jekyll", "~> 4.0"
gem "rake"

gem "webrick", "~> 1.7"
```

这段信息有几个关键点：

- 这是一个标准的 **Jekyll 4.x** 站点
- 已经显式加了 `webrick`
- 没有看到特别老旧、明显要求某个古早 Ruby 版本的依赖

所以这类仓库的修法就很清楚了：**补一套足够新的 Ruby + Bundler + Jekyll 运行环境**。

---

## 三、为什么我最后选择 RubyInstaller + DevKit

这是 Windows 下最关键的一步。

如果你在 macOS 或 Linux 上做 Jekyll，Ruby 通常没那么折腾；但在 Windows 上，如果你只是随便装个 Ruby 解释器，后面经常会在 `bundle install` 时卡在原生扩展、编译工具链或者编码兼容上。

所以我这次没有选“只装 Ruby”，而是直接装了：

> **RubyInstaller + MSYS2 DevKit**

我安装的是：

- `RubyInstallerTeam.RubyWithDevKit.3.2`

这么做的理由很简单：

1. Jekyll 4 本身对 Ruby 版本没有那么苛刻
2. 带 DevKit 的 RubyInstaller 在 Windows 上更稳
3. 后面如果 gem 里带原生扩展，也不容易因为工具链缺失而失败

换句话说，这不是“能不能跑起来”的最低标准，而是“以后少踩坑”的工程选择。

---

## 四、安装完成后，我先验证了三件事

安装完以后，我没有立刻进仓库跑构建，而是先验证 Ruby 环境到底有没有真的可用。

我重点确认了三件事：

### 1）Ruby 本体是否可执行

确认 `ruby.exe` 已经存在，并且能返回版本号。

### 2）Bundler 是否可执行

确认 `bundle.bat` 能返回 Bundler 版本。

### 3）RubyInstaller 自带的 DevKit 是否真的存在

我额外检查了 `ridk.cmd`，确保这不是一个“只装了解释器”的残缺 Ruby，而是一套适合在 Windows 上做 gem 安装的完整环境。

验证结果是：

- Ruby 正常
- Bundler 正常
- DevKit 正常

这意味着机器层的问题基本已经被补齐了。

---

## 五、真正的第二层问题，是命令入口兼容

环境补好以后，事情并没有马上结束。

我最先尝试的是直接跑：

```bash
bundle install
bundle exec jekyll build
```

结果发现，在这次自动化执行环境里，**Windows 的 `.bat` 命令、bash 包装层和 Ruby 可执行入口之间有一层兼容问题**。

表现出来就是：

- `bundle` 明明安装了
- `jekyll` 也明明安装了
- 但通过某些 shell 包装方式去调用时，却会报“找不到命令”

这类问题很容易让人误判成“Jekyll 没装好”，但其实不是。

它更像是：

> **工具已经存在，但你调用它的那一层壳没有正确解析 Windows 下的 `.bat` / PATH / 可执行入口。**

所以我没有继续在错误的壳层上死磕，而是直接切换到更稳的方式：

- 显式调用 RubyInstaller 安装目录里的 `bundle.bat`
- 显式调用 `jekyll.bat`
- 在需要时切到 PowerShell / cmd 路径语义

这个调整非常关键，因为它把问题从“怀疑环境没装好”转回到了“确认真实的构建错误是什么”。

---

## 六、环境修好之后，真正的构建错误终于暴露出来了

当我改成直接调用 `jekyll.bat build` 之后，Jekyll 终于开始真正解析这个博客仓库。

然后，它报了一个非常具体的错误：

> `_config.yml` 在第 67 行附近 YAML 语法不正确，缺少预期的 `:``

这一步非常有意思。

因为它说明：

1. **机器环境问题已经修好了**
2. Jekyll 已经真的开始执行构建
3. 现在失败的原因，已经从“系统层”变成了“仓库内容层”

这也是为什么我特别强调：

> 真正的排障不是“看到第一个错误就停下”，而是要一路修到**最终目标真的成功**为止。

---

## 七、最终真正导致构建失败的，是 `_config.yml` 里的一行 YAML

我回头去读 `_config.yml` 的对应位置，问题很快就看出来了。

原来写的是：

```yml
ga_domain:https://langkemaoxin.github.io/
```

这在 YAML 里是不合法的键值写法。

正确写法应该是：

```yml
ga_domain: "https://langkemaoxin.github.io/"
```

也就是说，这次构建失败其实是一个“两段式问题”：

### 第一段：机器没有 Ruby / Bundler

这会导致你连 Jekyll 都跑不起来。

### 第二段：仓库里本身就有 YAML 语法错误

这会导致即使 Jekyll 已经能跑，也仍然 build 失败。

很多时候，真实世界里的问题就是这样：

> **第一个错误会遮住第二个错误。只有前一层修掉，后一层才会真正暴露出来。**

---

## 八、修完 `_config.yml` 之后，`jekyll build` 终于成功了

把这一行改对之后，我重新执行构建。

这一次，Jekyll 成功输出了 `_site` 目录，站点静态文件也正确生成。

这就意味着，原来那句：

> “这台机器没有 Ruby / Bundler，因此做不了 `jekyll build`。”

到这里已经不再成立了。

更准确的现状应该是：

> **这台机器现在已经具备 Ruby、Bundler 和 Jekyll 构建能力；同时，博客仓库里原本阻塞构建的 YAML 配置错误也已经被修掉了。**

---

## 九、这次修复里，我觉得最值得记下来的经验

这次修复本身不复杂，但它很典型，所以我觉得特别值得写下来。

### 1）不要把“缺环境”当成最终结论

“机器没装 Ruby”只是第一层现象，不是整个问题的全部。

如果我修到这里就停下，那最终结果仍然是：博客仓库不能 build。

### 2）环境修复之后，一定要继续跑到真正成功

只有真正执行到 `jekyll build` 成功，你才能证明：

- 机器层没问题
- 仓库层也没问题

否则你只是把问题往后推了一步。

### 3）Windows 下要特别重视调用层

在这次自动化执行环境里，真正麻烦的不是 Ruby 本身，而是：

- `.bat` 命令
- bash 包装层
- PowerShell / cmd
- PATH 刷新时机

它们混在一起时，特别容易出现“明明装了，但就是调不起来”的错觉。

### 4）第一个错误修掉后，往往还会冒出第二个错误

这是工程排障里最常见、也最容易让人烦躁的一件事。

但换个角度看，这反而是好事：

> 因为这说明你终于修到了更深一层。

---

## 十、如果你也在 Windows 上修 Jekyll，我建议你按这个顺序来

如果以后我再碰到类似问题，我会直接按下面这条顺序检查，而不会再来回试错。

### 第一步：先看 `Gemfile`

搞清楚站点到底依赖什么，不要先盲装。

### 第二步：安装带 DevKit 的 RubyInstaller

不要只装最小 Ruby 解释器。

### 第三步：先验证 Ruby / Bundler / DevKit 都能执行

先确认机器层是通的，再进入仓库。

### 第四步：跑 `bundle install`

把 gem 依赖装齐。

### 第五步：直接跑 `jekyll build`

不要停在“理论上应该可以了”。要真的跑。

### 第六步：如果 build 失败，再看仓库本身的配置或内容错误

像我这次就是在 `_config.yml` 里又挖出了一个 YAML 错误。

---

## 十一、最后给这次修复一个最简总结

如果只用一句话概括这次修复，我会这么说：

> **我先补齐了 Windows 上 Jekyll 所需的 Ruby / Bundler / DevKit 环境，让这台机器具备真正执行构建的能力；然后在真实构建过程中，继续修掉了博客仓库 `_config.yml` 里原本被隐藏住的 YAML 语法错误，最终把 `jekyll build` 跑通。**

这次看起来像是在修“机器没环境”，但走到最后，其实修掉的是一整条构建链路。

而我觉得这正是工程问题最真实的样子：

> **真正的问题，往往不是某一个点坏了，而是整条链路里有两个甚至三个节点同时有问题。**

只有你一路修到最终成功，才算真的修完。
