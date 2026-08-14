---
layout: post
author:     "Corey"
header-img: "img/post-bg-web.jpg"
header-mask: 0.25
title: "手把手15练：从零学会Playwright CLI浏览器自动化"
date: 2026-04-25 20:46
tags: [Playwright CLI]
description: "手把手15练：从零学会Playwright CLI浏览器自动化"
---


---

# 手把手15练：从零学会Playwright CLI浏览器自动化

> 全文只有命令和结果，没有废话。打开终端，跟我敲。

**作者**：Corey
**阅读时间**：40分钟（含动手时间）
**前置要求**：电脑能上网，能打开终端

---

## 准备工作：5分钟装好环境

在开始任何操作之前，我们需要先把工具装好。跟着下面三步走，不会出错。

**第1步：检查Node.js**

打开终端（Mac用户找"终端.app"，Windows用户找"PowerShell"），输入：

```bash
node --version
```

- 如果显示 `v18.x.x` 或更高版本 → 恭喜，继续下一步
- 如果显示"command not found"或版本低于18 → 去 https://nodejs.org 下载安装LTS版本，装完重启终端

**第2步：安装Playwright CLI**

在终端输入：

```bash
npm install -g @playwright/cli@latest
```

你会看到一堆进度条在跑。等它跑完（大概1-2分钟），输入下面命令验证安装成功：

```bash
playwright-cli --version
```

如果显示类似 `0.1.8` 的版本号 → 安装成功！

**第3步：安装浏览器（这一步会自动发生）**

当你第一次运行`open`命令时，Playwright会自动下载所需的浏览器。不用担心，这是正常的。

---

环境装好了？很好。接下来我们用**8个基础练习**打牢根基，再用**7个综合实战**真正上手。

---

## 第一部分：8个基础练习——先学会走路

这8个练习是后面所有操作的基础。**每个练习不超过2分钟**，请一定亲手敲一遍。

---

### 练习1：打开浏览器（有头模式 vs 无头模式）

这是你最需要记住的命令。`--headed`的意思是"有头"——你会看到一个真实的浏览器窗口弹出来。

**输入**：

```bash
playwright-cli open https://www.baidu.com --headed
```

**你会看到**：
- 一个Chrome浏览器窗口自动打开
- 浏览器自动跳转到百度首页
- 终端里会输出类似这样的内容：

```
### Page
- Page URL: https://www.baidu.com/
- Page Title: 百度一下，你就知道
### Snapshot
[Snapshot](.playwright-cli/page-xxx.yml)
```

**这个练习教会你什么？**
- `open`是最常用的命令
- 记住`--headed`，否则浏览器会在后台偷偷运行，你看不到过程
- 每次操作后，CLI都会返回当前页面的快照（Snapshot）——这是后面所有交互的关键

**如果不加--headed会怎样？** 试试看：

```bash
playwright-cli open https://www.baidu.com
```

浏览器确实打开了，但你是看不见的。这在自动化脚本中有用，但学习和调试时一定要加`--headed`。

---

### 练习2：获取页面快照——看懂"元素身份证"

这是Playwright CLI最核心的概念：**每个可交互的元素都有一个唯一的编号（ref）**，比如`e15`、`e23`。这就像每个元素都有了一张"身份证"。

**先打开一个页面**：

```bash
playwright-cli open https://demo.playwright.dev/todomvc --headed
```

**然后获取快照**：

```bash
playwright-cli snapshot
```

**你会看到**（输出会很长，我只截取关键部分）：

```yaml
- main [ref=e1]:
  - heading "todos" [ref=e2]
  - textbox "What needs to be done?" [ref=e3]
  - listbox [ref=e5]:
    - option "Active" [ref=e6]
    - option "Completed" [ref=e7]
    - option "All" [ref=e8]
```

**这个练习教会你什么？**
- `snapshot`命令输出的是**无障碍树（Accessibility Tree）**，不是HTML源码
- 每个元素后面的`[ref=eX]`就是它的"身份证号"
- 比如文本框的ref是`e3`，你想在里面打字，就要用这个`e3`

**为什么这比传统自动化强大？** 传统方式你要写`document.querySelector('#input')`这种又臭又长的选择器，现在只需要记住`e3`。

---

### 练习3：在输入框里打字（type vs fill）

有两种方式可以在输入框里打字：`type`（模拟真人逐个字母敲击）和`fill`（瞬间填满）。我们先用`type`，因为它更像人。

**前提**：确保浏览器还在`todomvc`页面上（如果关了，重新运行练习2的第一条命令）

**输入**：

```bash
playwright-cli type "买牛奶"
```

**你会看到**：
- 浏览器里的文本框出现了"买牛奶"三个字
- 终端输出新的快照，注意那个文本框的内容变了

**用fill试试**（效果看起来一样，但背后的机制不同）：

```bash
playwright-cli fill e3 "买面包"
```

**`type`和`fill`的区别**：
- `type`：模拟键盘敲击，会触发每个按键的事件（适合需要实时校验的场景）
- `fill`：直接设置值，一步到位（更快，适合大多数情况）

**注意**：`type`命令不需要ref参数（它会自动找到当前聚焦的输入框），而`fill`需要明确指定ref。

---

### 练习4：按回车键提交

输入完内容后，怎么提交？按回车。

**输入**：

```bash
playwright-cli press Enter
```

**你会看到**：
- "买牛奶"变成了一条待办事项，出现在列表里
- 文本框被清空（准备好接收下一条待办）
- 终端输出更新后的快照，你会看到新出现的待办项

**补充一个技巧**：你也可以用`fill --submit`一步完成"填内容+按回车"：

```bash
playwright-cli fill e3 "买鸡蛋" --submit
```

效果和分开执行`fill`+`press Enter`是一样的，但更简洁。

---

### 练习5：勾选复选框（check/uncheck）

现在列表里已经有待办事项了，我们来把它标记为"已完成"。

**先获取快照，找到复选框的ref**：

```bash
playwright-cli snapshot
```

你会看到类似这样的输出：

```yaml
- list [ref=e12]:
  - listitem [ref=e13]:
    - checkbox [ref=e14]  # 第一项的复选框，ref=e14
    - text "买牛奶" [ref=e15]
  - listitem [ref=e16]:
    - checkbox [ref=e17]  # 第二项的复选框，ref=e17
    - text "买鸡蛋" [ref=e18]
```

**勾选第一项**（假设ref是e14）：

```bash
playwright-cli check e14
```

**你会看到**：
- "买牛奶"前面出现了一条删除线（表示已完成）
- 终端输出快照，复选框的状态变成了`[checked]`

**取消勾选**（如果后悔了）：

```bash
playwright-cli uncheck e14
```

---

### 练习6：点击按钮

除了按回车，很多时候你需要点击明确的按钮。

**先打开一个带按钮的页面**：

```bash
playwright-cli open https://www.sogou.com --headed
```

**获取快照，找搜索按钮**：

```bash
playwright-cli snapshot
```

你会看到搜索按钮的ref，比如`e24`。

**点击它**：

```bash
playwright-cli click e24
```

**还可以指定鼠标按键**：

```bash
playwright-cli click e24 right   # 右键点击
playwright-cli click e24 middle  # 中键点击
```

**对于不想记ref的人**：你也可以直接用CSS选择器或文本定位：

```bash
playwright-cli click "button:has-text('搜索')"
```

---

### 练习7：截图和保存PDF

这是最直观的功能——把网页"拍下来"。

**先打开一个页面**：

```bash
playwright-cli open https://www.baidu.com --headed
```

**截全屏**：

```bash
playwright-cli screenshot
```

截图会保存在当前目录，文件名类似`screenshot-2026-04-25T10-30-00.png`。

**指定文件名**：

```bash
playwright-cli screenshot --filename=baidu-homepage.png
```

**只截某个元素**（比如截取百度Logo）：

先获取快照找到Logo的ref，然后：

```bash
playwright-cli screenshot e5 --filename=logo.png
```

**如果你需要PDF格式**：

```bash
playwright-cli pdf --filename=page.pdf
```

> 这个功能在做网页存档、竞品监控、测试报告时非常实用。

---

### 练习8：标签页管理

很多网站会弹出新标签页，这时候你需要学会在标签页之间切换。

**打开一个会开新标签页的网站**：

```bash
playwright-cli open https://www.bing.com --headed
```

**查看当前有哪些标签页**：

```bash
playwright-cli tab-list
```

你会看到类似：

```
0: https://www.bing.com/ (Bing)
```

**新建一个标签页**：

```bash
playwright-cli tab-new https://www.baidu.com
```

**再次查看标签页列表**：

```bash
playwright-cli tab-list
```

现在应该有两个：

```
0: https://www.bing.com/ (Bing)
1: https://www.baidu.com/ (百度一下，你就知道)
```

**切换到标签页0**：

```bash
playwright-cli tab-select 0
```

后续的操作（`type`、`click`、`screenshot`）都会在选中的标签页上执行。

**关闭当前标签页**：

```bash
playwright-cli tab-close
```

---

8个基础练习做完了。你现在已经掌握了Playwright CLI的核心操作：打开、快照、输入、点击、截图、标签页管理。

接下来，我们用**7个综合实战**把这些技能组合起来，解决真实问题。

---

## 第二部分：7个综合实战——从会用到会用得更溜

实战部分不再是一行命令打天下，而是**多步骤组合**。请确保你有耐心跟着做，每完成一个，你的自动化能力就上了一个台阶。

---

### 实战1：完整的待办事项工作流

把TodoMVC这个Demo网站的所有核心操作串起来：添加→标记完成→删除。

**第1步：打开页面**：

```bash
playwright-cli open https://demo.playwright.dev/todomvc --headed
```

**第2步：连续添加3条待办**：

```bash
playwright-cli type "写周报"
playwright-cli press Enter

playwright-cli type "回复邮件"
playwright-cli press Enter

playwright-cli type "买咖啡豆"
playwright-cli press Enter
```

**第3步：查看当前快照，找到复选框ref**：

```bash
playwright-cli snapshot
```

记下第一条待办复选框的ref（比如e14）。

**第4步：标记第一条为完成**：

```bash
playwright-cli check e14
```

**第5步：删除已完成项**（需要找到"Clear completed"按钮）：

```bash
playwright-cli snapshot
# 找到Clear completed按钮的ref，假设是e25

playwright-cli click e25
```

**第6步：截图保存结果**：

```bash
playwright-cli screenshot --filename=todo-final.png
```

**完成！** 你刚刚完成了一个完整的自动化流程。这6条命令如果写成传统脚本，至少需要20行代码，而现在你只用了自然语言式的命令。

---

### 实战2：搜索结果自动化——搜关键词+截图

这个实战模拟了一个常见场景：在搜索引擎里搜索某个关键词，然后保存结果截图。

我们用Bing作为例子（兼容性好，不会频繁弹验证码）。

**第1步：打开Bing**：

```bash
playwright-cli open https://www.bing.com --headed
```

**第2步：获取快照，找到搜索框的ref**：

```bash
playwright-cli snapshot
```

搜索框通常是第一个`textbox`，记住它的ref（比如e3）。

**第3步：输入关键词**：

```bash
playwright-cli fill e3 "Playwright 自动化教程"
```

**第4步：按回车搜索**：

```bash
playwright-cli press Enter
```

**第5步：等待结果加载（很重要！）**：

搜索结果加载需要时间。简单的方法是用`screenshot`作为"等待点"：

```bash
playwright-cli screenshot --filename=search-loading.png
```

**第6步：滚动页面，加载更多结果**：

```bash
playwright-cli mousewheel 0 500   # 向下滚动500像素
```

**第7步：截取最终结果**：

```bash
playwright-cli screenshot --filename=search-results.png
```

**第8步：点击第二页**（如果存在"下一页"按钮）：

```bash
playwright-cli snapshot
# 找到"下一页"按钮的ref，比如e42

playwright-cli click e42
```

**延伸思考**：这个流程可以包装成一个Shell脚本，每天早上自动搜索"今日热点"，把结果截图发到你的邮箱。

---

### 实战3：表单填写与提交——模拟用户注册

很多网站都有表单，填写、勾选同意、提交。我们用GitHub注册页面作为例子（不需要真的提交，练到"提交"那一步就可以停了）。

**第1步：打开注册页面**：

```bash
playwright-cli open https://github.com/join --headed
```

**第2步：获取快照，识别各输入框**：

```bash
playwright-cli snapshot
```

输出中会包含：`textbox "Username"`、`textbox "Email address"`、`textbox "Password"`，每个都有ref。

**第3步：依次填写**（假设ref分别是e5、e7、e9）：

```bash
playwright-cli fill e5 "testuser123"
playwright-cli fill e7 "test@example.com"
playwright-cli fill e9 "Password123!"
```

**第4步：勾选同意条款**（可能是checkbox或"Accept"按钮）：

```bash
playwright-cli snapshot
# 找到同意条款的checkbox，假设ref=e15

playwright-cli check e15
```

**第5步：点击提交按钮**：

```bash
playwright-cli snapshot
# 找到"Create account"按钮

playwright-cli click e20
```

**你的收获**：这个流程展示了处理复杂表单的完整思路：snapshot定位→fill填内容→check勾选→click提交。

---

### 实战4：持久化会话——再也不用重复登录了

这是开发者最爱的功能。一次登录，永久有效。

**第1步：用--persistent参数打开浏览器**：

```bash
playwright-cli open https://github.com/login --headed --persistent
```

**注意**：这个命令会创建一个持久化的用户数据目录。以后再打开，登录状态还在。

**第2步：手动登录**（只需这一次）：

在浏览器窗口里输入账号密码，完成登录。可能会遇到验证码，手动过就行。

**第3步：关闭浏览器**：

```bash
playwright-cli close
```

**第4步：重新打开，见证奇迹**：

```bash
playwright-cli open https://github.com --headed --persistent
```

你会发现自己**仍然是登录状态**！cookie被保存在磁盘上了。

**如果你想彻底清除数据**（比如切换账号）：

```bash
playwright-cli delete-data
```

**如果是命名会话（更高级的做法）**：

```bash
playwright-cli -s=mywork open https://github.com --persistent
```

这样不同项目可以用不同的会话，互相隔离。

---

### 实战5：监控控制台和网络请求（调试利器）

当自动化脚本不按预期工作时，你需要看浏览器在"想什么"。控制台日志和网络请求是最好的线索。

**第1步：打开一个页面**：

```bash
playwright-cli open https://www.baidu.com --headed
```

**第2步：查看控制台消息**：

```bash
playwright-cli console
```

你会看到类似JavaScript错误、警告等信息。如果脚本莫名其妙的失败，往往能从console里找到原因。

**第3步：查看网络请求**：

```bash
playwright-cli network
```

这个命令会列出页面加载以来的所有网络请求：HTML、CSS、JS、图片、API调用等。输出格式类似：

```
GET 200 https://www.baidu.com/
GET 200 https://www.baidu.com/style.css
GET 404 https://www.baidu.com/missing.png
```

**你的收获**：`console`和`network`是调试的"照妖镜"。当你说"AI操作失败了"，用这两个命令一看，可能是某个API挂了，或者某个资源404了。

---

### 实战6：执行JavaScript（Eval）——解锁无限可能

有时候内置命令不够用，你可以直接执行任意JavaScript代码，就像在浏览器控制台里写代码一样。

**第1步：打开页面**：

```bash
playwright-cli open https://www.baidu.com --headed
```

**第2步：执行JS获取页面标题**：

```bash
playwright-cli eval "document.title"
```

输出：`"百度一下，你就知道"`

**第3步：滚动到页面底部**：

```bash
playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"
```

**第4步：修改页面内容**（仅用于演示）：

```bash
playwright-cli eval "document.querySelector('#su').value = '按钮文字被我改了'"
```

**第5步：获取特定元素的属性**：

```bash
playwright-cli eval "document.querySelector('input').getAttribute('placeholder')"
```

**第6步：更复杂的数据提取**——获取所有链接：

```bash
playwright-cli eval "Array.from(document.querySelectorAll('a')).map(a => ({text: a.innerText, href: a.href}))"
```

输出是一个JSON数组，包含页面上所有链接的文本和URL。

**你的收获**：当你想提取数据、修改页面、执行复杂逻辑时，`eval`是你的万能钥匙。再也不用写独立的爬虫脚本了。

---

### 实战7：完整的爬虫脚本——抓取Hacker News首页

这是本篇文章的"期末考试"。我们把学到的所有技能串起来，写一个完整的自动化脚本，抓取Hacker News（全球最火的技术新闻网站）首页的10条新闻。

**注意**：这不是一行命令，而是一个完整的思维流程。你可以逐条输入，也可以把它们写成一个`.sh`或`.ps1`脚本批量执行。

**第1步：打开页面**：

```bash
playwright-cli open https://news.ycombinator.com --headed
```

**第2步：获取快照，找到新闻列表结构**：

```bash
playwright-cli snapshot
```

观察输出，你会发现每条新闻的标题和链接都有对应的ref。

**第3步：用eval提取所有新闻**：

```bash
playwright-cli eval "Array.from(document.querySelectorAll('.titleline > a')).slice(0, 10).map(a => ({title: a.innerText, url: a.href}))"
```

你会看到一个漂亮的JSON输出，包含10条新闻的标题和链接。

**第4步：保存快照以供后续分析**：

```bash
playwright-cli snapshot --filename=hackernews-snapshot.yml
```

**第5步：截图留档**：

```bash
playwright-cli screenshot --filename=hackernews-homepage.png
```

**第6步：如果需要，把eval结果保存到文件**（在终端里用重定向）：

```bash
playwright-cli eval "JSON.stringify(Array.from(document.querySelectorAll('.titleline > a')).slice(0, 10).map(a => ({title: a.innerText, url: a.href})))" > news.json
```

**完成！** 你现在手里有了一份新闻数据、一份页面快照、一份截图。如果需要每天定时抓取，把这个流程写进`crontab`（Mac/Linux）或任务计划程序（Windows），就能实现完全自动化。

---

## 写在最后：你已经打败了80%的人

恭喜你完成了全部15个练习。现在回头看看，你掌握了：

✅ 基础：`open`、`snapshot`、`type`/`fill`、`press`、`click`、`check`、`screenshot`、`pdf`
✅ 进阶：标签页管理、持久化会话、控制台/网络调试、JavaScript执行
✅ 实战：待办事项自动化、搜索截图、表单填写、数据爬取

**你现在能解决哪些真实问题？**
- 每天早上自动打开邮箱，截图未读邮件
- 定时监控竞品网站的价格变动
- 自动填写周报系统并提交
- 抓取论坛热帖，生成摘要

**最后一句真心话**：这些命令一开始会觉得多，但当你用过两三次之后，它们就会变成肌肉记忆。以后你再遇到重复的浏览器操作，第一反应不会是"烦死了"，而是"开个CLI自动搞"。

动手试一试，你会发现：**以前要用半天写的脚本，现在5分钟就搞定了。**

---

*关于Skill和AI Agent集成——那是下一个段位的玩法。先把这15个练熟，我们再聊更高阶的玩法。*

**有什么问题？欢迎评论区交流。**