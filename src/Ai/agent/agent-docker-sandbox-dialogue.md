---
title: "从零理解企业级 Agent 的 Docker 沙箱设计（师生对话实录）"
sidebarGroup: "Agent / 方法论"
shortTitle: "Agent 沙箱设计对话实录"
order: 33
date: 2026-08-21
category: "AI"
tag:
  - "agent"
  - "sandbox"
  - "docker"
  - "对话实录"
---

# 从零理解企业级 Agent 的 Docker 沙箱设计（师生对话实录）

## 写在前面

最近在研究公司内部项目 jzfz-ai-agent 的源码（企业级 Agent 平台，技术栈：LangGraph + DeepAgents，主服务本身就部署在 Docker 里）。里面有一块"沙箱执行层"的设计很有意思——agent 执行代码、读写文件，全都发生在一个个隔离的容器里。

直接看架构图和源码容易懵，所以我换了个办法：**让 AI 当老师，我当学生，每次只讲一个概念，我有问题就打断，没问题就继续**。本文就是这场教学的完整对话实录，个人感觉比任何一篇架构文档都好懂。

课程路线图（走到哪算哪）：

> ① 为什么要沙箱 → ② 最笨的办法为什么不行 → ③ 用容器当沙箱 → ④ 三个角色的关系（docker.sock）→ ⑤ 容器怎么"活着" → ⑥ 一个接口撑起一切 → ⑦ 会话怎么对应容器 → ⑧ 文件放在哪 → ⑨ 容器的生老病死 → ⑩ 镜像里装了什么

---

## 第 1 课：为什么需要沙箱

**🧑‍🏫 老师：**

先看一个具体场景。你在网页上对 AI 助手说：

> "帮我分析这个 Excel，算出每个月的销量汇总"

关键认知：**大模型（LLM）本身只会"生成文字"，它没有手**。

它不能打开文件、不能运行程序、不能上网。你让它"算销量汇总"，它其实只是靠训练时见过的数据**猜**一个答案——数字可能还是错的。

所以要做一个真正能干活的 AI（我们叫它 **agent**），就得给它配"手"，也就是**工具**。其中一个最万能的工具就是：**执行一条命令**。比如让它在某台电脑上运行 `python3 分析脚本.py`，用真正的 Python 去算，结果就准了。

但是命令总得在**某个地方**运行吧？这个地方要满足几个条件：

- agent 跑的代码不可控，不能把它和 AI 服务本身放一起（一条删库命令就把服务干掉了）
- 不同用户的文件不能混在一起
- 不能让它把机器的 CPU、内存吃光

**给每场对话单独准备的一个"隔离的小房间"，agent 在里面随便折腾也伤不到别人——这个小房间就是"沙箱"（sandbox）**。名字就是这么来的：小孩在沙坑里玩沙子，怎么折腾都只折腾沙坑。

一句话总结本课：

> 沙箱 = agent 动手干活的地方，隔离、disposable（用完可扔）、伤不到外面。

**🧑‍🎓 学生：** 没问题。

---

## 第 2 课：最笨的办法为什么不行

**🧑‍🏫 老师：**

最直接的想法：AI 服务收到"执行命令"的请求后，就直接在自己家里执行，比如用 Python 调 `subprocess.run("python3 分析脚本.py")`。

听起来能跑，实际上会死得很惨。三个死法：

**死法一：agent 会误伤服务本身。**
agent 是让 LLM 写命令的，它写的代码不可控。它一不留神来一条 `rm -rf /`，或者写了个死循环把 CPU 吃满，或者 `pip install` 装了一堆东西把磁盘塞爆——**炸的不是别人，正是 AI 服务自己**。服务一挂，所有用户的对话全部中断。相当于让顾客在你家厨房自己做菜，他把煤气灶点了。

**死法二：用户的文件混在一起。**
张三的会话生成了 `报告.docx`，李四的会话也生成了 `报告.docx`，都放在同一个目录里——互相覆盖、互相看见。张三让 agent "列出当前目录所有文件"，结果看到了李四的投标报价。这在企业场景里是事故。

**死法三：环境互相污染。**
张三的任务需要 `pandas 1.x`，李四的任务需要 `pandas 2.x`，装在同一个 Python 环境里必然打架。而且上一个人留下的垃圾文件、改过的配置，下一个人全要继承。

你会发现三个死法指向同一个根源：**大家共用同一个环境，没有边界**。

所以要的不是"找个地方执行命令"，而是：

> 每次执行命令时，都在一个**全新的、只有我自己用的、资源有上限的**环境里。

什么东西能一键提供这种环境？——容器。这就是下一课的内容。

**🧑‍🎓 学生：** 没问题。

---

## 第 3 课：用 Docker 容器当沙箱

**🧑‍🏫 老师：**

上一课的三个死法，容器正好一一化解：

| 死法 | 容器怎么救 |
|---|---|
| 误伤服务 | agent 在容器里 `rm -rf /`，最多删掉容器自己，主服务毫发无伤 |
| 文件混淆 | 每个会话一个容器，文件系统天生分开 |
| 环境污染 | 环境就是镜像，每次都是干净的一套 |

但真正有意思的是接下来的一个**选择题**：容器什么时候开、什么时候关？

**方案 A：每执行一条命令，开一个全新容器，跑完就扔。**
绝对干净，但有两个大问题：

1. 慢——每次都有容器启动开销，agent 一场对话要执行几十条命令，用户等不起；
2. **中间状态丢了**——agent 第 1 步生成了 `中间结果.csv`，第 2 步想接着处理它，结果新容器里啥都没有。相当于每写一行代码就换一台新电脑。

**方案 B：每场对话（thread）开一个容器，整场对话期间一直活着，对话冷了再回收。**
这个项目选的是 B。一个容器 = 一间酒店客房：客人（一场对话）入住期间房间归他，东西随便放，退房后再打扫给下一位。

那问题来了：容器要"活着"，就必须有个前台进程在跑（没有进程 = 容器退出）。可我们的容器**没有正经工作要干**，它只是站在那里等命令。怎么办？

这个项目用了一个经典小技巧，创建容器时的命令长这样（简化自 `src/common/sandbox/docker_sandbox.py`）：

```bash
docker create --name aegra-sandbox-会话ID ... 镜像名 sleep infinity
docker start 容器
```

注意最后那个 **`sleep infinity`**——它就是容器的主进程：一个"永远睡觉"的进程。它什么都不做，只负责**让房间保持通电**。

那活谁干？**`docker exec`**——每次 agent 要执行命令，就往这个活着的容器里"递一张纸条"：

```bash
docker exec 容器 sh -lc "python3 分析脚本.py"
```

总结成一张图：

```
容器（酒店房间）
 ├─ 主进程：sleep infinity     ← 只管活着，不干活（保持房间通电）
 └─ docker exec 递进来的命令    ← 真正的活，一条一条递进来执行
```

一句话总结本课：

> 沙箱 = 每场对话一个常驻容器；`sleep infinity` 让它保持活着，所有工作通过 `docker exec` 递进去做。环境持续（文件、装的包都在），又和外界隔离。

---

## 插问 1：这个容器用的是什么镜像？

**🧑‍🎓 学生：** 那我这个容器用的是什么镜像呢？

**🧑‍🏫 老师：**

问得好，这个问题正好戳到一个设计点。答案分两层：**代码里的兜底默认值** 和 **实际生产用的镜像**。

### 1. 镜像是可配置的，代码里只留了个兜底

创建容器时用哪个镜像，来自环境变量 `SANDBOX_DOCKER_IMAGE`（`src/jzfz/backend.py`）。运维不配的话，兜底是（`src/common/sandbox/constants.py`）：

```python
DEFAULT_IMAGE = "python:3.11-slim"
```

为什么兜底偏偏是个 Python 镜像，不是 Ubuntu、Alpine？先埋个伏笔：**这套沙箱的文件操作（读文件、写文件、搜索）全都是靠往容器里递 Python 脚本执行的**（后面讲协议层时展开），所以"容器里必须有 python3"是硬性依赖。`python:3.11-slim` 是满足这个依赖的最小选择。

### 2. 实际生产用的是自建的"瑞士军刀"镜像

光有 python3 只能跑跑脚本，干不了企业场景的活。所以项目里有个专门的 `Dockerfile.sandbox`，构建生产镜像。里面装的东西很能说明"他们想让 agent 干什么活"：

| 装了什么 | 用来干什么 |
|---|---|
| Python 3.12 + requests/httpx/pydantic | 基座：写脚本、调 HTTP 接口 |
| numpy / pandas | 数据分析（第 1 课那个 Excel 场景） |
| pymupdf / python-pptx / python-docx / openpyxl | 处理 PDF / PPT / Word / Excel —— 企业里最多的就是文档 |
| Node.js 24 + corepack | 跑 npm 生态的工具、前端构建 |
| **Playwright + Chromium** | **真的开一个浏览器**：自动化操作网页、抓取需要登录/渲染的页面 |
| pymilvus | 连 Milvus 向量数据库——说明有些技能要做向量检索（RAG） |
| curl / ca-certificates | 基本网络工具 |

为什么叫"瑞士军刀"？因为**开容器的时候不知道这场对话要干什么活**——可能分析 Excel，可能抓网页，可能检索文档。没法按需现装（内网装包慢、还可能失败），索性把常用工具全预装进去，拿来就能用。

代价是镜像很大（光 Chromium 就不小），但换来了"容器一启动，十八般兵器都在"。

另外一个小细节：Dockerfile 里把 apt 和 pip 的源全换成了阿里云镜像——内网环境访问官方源慢或不通，构建时就得走国内源。

---

## 插问 2：镜像这么大，一个会话一个容器，还在那里休眠？

**🧑‍🎓 学生：** 那这样的镜像岂不是很大？每个用户一对话，就创建这么一个大的容器，然后就在那里休眠是吧？

**🧑‍🏫 老师：**

这个问题问到点子上了——它包含一个**一半对一半错**的判断，拆开看特别有价值。

### 你说对的部分

镜像确实大。带 Chromium + Python 全家桶，这个镜像得有好几个 GB。

### 但有个关键误会：镜像大 ≠ 每个容器占几个 GB

Docker 的核心机制之一：**镜像在磁盘上只存一份，所有容器共享**。

打个比方：

> 镜像 = 教材（印一次，全校共用）
> 容器 = 每个学生自己的草稿本

100 个会话开 100 个容器，磁盘上**不是** 100 × 3GB，而是：**1 份共享镜像 + 100 个薄薄的"可写层"**。

什么是可写层？镜像是**只读**的（教材不许涂改），容器启动时 Docker 在镜像顶上垫一层可读写的薄层（overlay 文件系统）。agent 在容器里改文件、装包时，**copy-on-write** 生效：改到哪个文件，就把那个文件从镜像复制到自己的可写层再改——没碰到的部分永远共用那份镜像。

所以真实的占用是：

| 你以为的成本 | 实际的成本 |
|---|---|
| 每容器 3GB 磁盘 | 一份共享镜像 + 每容器几 MB 级可写层 |
| 休眠也占着 512MB 内存 | **几乎不占** |

### "休眠"到底花多少钱

这里还有第二个误会，关于 `--memory 512m` 这个参数：它是**信用卡额度，不是预存款**。意思是"这个容器**最多**能用 512MB"，不是"启动就划走 512MB"。

一个 `sleep infinity` 的容器，运行时是什么？就是**一个睡觉的进程**。不占 CPU，内存几 MB，仅此而已。开 100 个休眠容器，宿主机压力大概相当于开了 100 个记事本——完全无感。

（顺带说一句：agent 干活产生的主要文件其实也不堆在可写层里，而是放在宿主机一个专门目录、挂载进容器的——这是后面"文件放在哪"那课的内容，到时候你会看到为什么这么设计。）

### 但你的直觉里有个真问题

"一直休眠"确实**不能不管**：

- 可写层会慢慢积累（临时装的包、改的配置）；
- 容器数量会无限增长（每天几百场对话，一年十几万个）；
- 就算单个容器开销小，Docker Daemon 管理一堆僵尸对象也是负担。

所以这个项目给容器设计了"生老病死"的规则——**超过 24 小时没人用就停掉，超过 7 天就删除**。你的直觉已经提前摸到那节课的门口了。

也正因为有这套回收机制兜底，"每场对话一个容器"这个有点奢侈的设计才敢用。

---

## 第 4 课：docker.sock——主容器凭什么能创建别的容器

> **课堂检查回放**（上节课留的题：兜底镜像为什么是 `python:3.11-slim` 而不是 ubuntu？）
>
> 🧑‍🎓 学生答："因为主要是执行 python 文件。"
>
> 🧑‍🏫 老师点评：对了一半。"主要跑 Python"是结果，但真正锁死的是：**沙箱自己的文件工具（读/写/搜索）全靠往容器里递 python 脚本实现**——就算用户一行 Python 都不写，这些工具也需要容器里有 `python3`。所以 python3 是沙箱**基础设施自身的硬依赖**，`python:3.11-slim` 是满足这个依赖的最小镜像。（伏笔在第 6 课展开）

**🧑‍🏫 老师：**

新问题来了：AI 服务（这个项目主程序跑的容器）**自己也活在容器里**（docker-compose 部署，蓝绿两组容器）。而容器是什么？隔离的箱子。容器里默认看不到宿主机、看不到别的容器，更没有能力"生"出新容器。那它凭什么创建沙箱？

### 背景知识：`docker` 命令的真相

很多人以为敲 `docker run` 是"docker 在干活"，其实 docker 是**客户端-服务端架构**，敲命令的角色分三个：

```
你敲的 docker CLI  ──►  /var/run/docker.sock  ──►  dockerd（Daemon）
     （传话筒）            （Unix socket 文件）      （真正的管家）
```

- **dockerd（Daemon，管家）**：真正干活的常驻进程，管理所有容器、镜像、网络、卷，跑在**宿主机**上；
- **docker CLI（传话筒）**：你敲的 `docker ps`、`docker run`，CLI 自己不创建任何东西，只是把请求**转发**给 daemon；
- **docker.sock**：两者之间的通信通道，宿主机上的一个特殊文件（Unix socket）。**谁能读写这个文件，谁就能对管家发号施令。**

### 怎么做：把 sock 挂进主容器

项目的 `docker-compose.yml` 里有一行关键挂载：

```yaml
volumes:
  - //var/run/docker.sock:/var/run/docker.sock   # 双斜杠是 Windows Docker 的写法
```

于是主容器里也出现了一个 `/var/run/docker.sock`，**通向宿主机的管家**。主程序用 subprocess 调 docker CLI（`src/common/sandbox/docker_utils.py` 的 `run_raw`），CLI 默认连这个 sock——命令就到了宿主机 daemon 手里，由 daemon 在宿主机上创建沙箱容器。

### 本课核心：兄弟，不是父子

主容器"创建"沙箱容器，**不是容器里套容器**，而是"给管家写纸条，请管家在隔壁再开一间房"。

```
宿主机
 └─ Docker Daemon（管家）
     ├─ 主容器 jzfz-agent-blue（aegra 应用）◄── 握着 sock
     ├─ 沙箱容器 aegra-sandbox-会话A
     └─ 沙箱容器 aegra-sandbox-会话B
```

在 daemon 眼里，主容器和沙箱容器是**平级的兄弟**，谁也不包含谁。

**验证心智实验**：在主容器里执行 `docker ps`，你会看到宿主机上所有容器——**包括主容器自己**！这恰好证明：它眼中的 docker 世界是宿主机的，不是它自己的。

术语一句话：业界管这叫 **DooD（Docker-out-of-Docker）**，区别于 **DinD**（在容器里再跑一个完整 daemon，需要 `--privileged`，又重又险）。

### 顺手澄清一个容易混的点

第 2 课说"直接在主容器里 subprocess 执行命令会死得很惨"，那这个项目不也在 subprocess 吗？

——是，但它 subprocess 的是 `docker exec ...`。这条命令走 CLI → sock → daemon，**最终在沙箱容器里执行**，不在主容器自己家。传话筒递纸条，纸条在别的房间被打开。

（再埋一粒种子：正因为沙箱容器是 daemon **在宿主机上**创建的，给它挂载目录时 `-v` 的路径必须是**宿主机路径**，不是主容器内路径——这是第 8 课路径映射那道坎的根源。）

安全预告一句话：握着 docker.sock ≈ 宿主机 root。本方案只把 sock 给了主容器和 traefik（只读），没给沙箱，方向是对的——后面讲安全边界时展开。

---

## 插问 3：subprocess 是什么

**🧑‍🎓 学生：** subprocess 是什么？

**🧑‍🏫 老师：**

Python 标准库里的一个模块，作用一句话：**让 Python 程序去启动另一个程序（命令），等它跑完，把结果收回来**。熟悉 Java 的话，它等价于 `Runtime.getRuntime().exec(...)` / `ProcessBuilder`。

```python
import subprocess

result = subprocess.run(["docker", "ps"], capture_output=True, text=True)

result.stdout      # 命令打印的内容（字符串）
result.stderr      # 报错内容
result.returncode  # 退出码：0 = 成功，非 0 = 失败
```

比方：你的 Python 程序是前台接待，`subprocess.run(...)` 就是"帮我叫个外面的师傅进来干活"——师傅（子进程）真刀真枪执行那条命令，干完把**输出**和**退出码**交回来。

**为什么这个词在沙箱里反复出现**：

- 第 2 课的"最笨办法"：`subprocess.run("python3 分析脚本.py")` —— 在自己家干活 → 三个死法；
- 实际做法：`subprocess.run(["docker", "exec", 容器, "sh", "-lc", 命令])` —— 还是 subprocess，但叫的是 **docker CLI 这个传话筒**，纸条最终在**沙箱容器**里打开。

同一个工具，**区别只在"命令最终落在哪执行"**。

项目里还包了一层 `docker_utils.py` 的 `run_raw()`，额外干两件事：**超时控制**（卡死就掐掉，退出码 124，模仿 Linux `timeout` 的惯例）和 **docker 路径查找**（某些线程环境 PATH 不全，去常见安装路径硬找）。

---

## 插问 4：挂了个 sock 文件，Python 为什么就能创建容器？

> **课堂检查回放**（第 4 课留的题：主容器里 `docker ps` 能看到主容器自己，证明了什么？）
>
> 🧑‍🎓 学生答："恰恰说明了，所谓的沙箱，其实就是另起一个同级别的容器而已。"
>
> 🧑‍🏫 老师点评：完全正确。`docker ps` 能看到自己，正是"我眼中的 docker 世界 = 宿主机管家眼中的世界"的铁证。

**🧑‍🎓 学生：** 但是我有一点不明白：yml 文件里为什么配置了这个 sock，Python 代码就能创建容器了呢？具体细节是什么？

**🧑‍🏫 老师：**

先做个实验（WSL + Docker 环境实测）。用 `curl` 直接对着 socket 文件说 HTTP——注意 curl 根本不认识 docker：

```bash
curl -s --unix-socket /var/run/docker.sock http://localhost/version
```

真实输出（节选）：

```json
{"Platform":{"Name":""},"Version":"29.1.3","ApiVersion":"1.52",
 "MinAPIVersion":"1.44","Os":"linux","Arch":"amd64",...}
```

daemon 老老实实把版本信息吐回来了。这就是"具体细节"的钥匙，魔法分三层拆开。

### 第一层：sock 文件根本不是"文件"，是门牌号

普通文件的内容存在磁盘上；socket 文件**没有内容**——它是文件系统里注册的一个"地址"，真正的通信端点活在**内核**里。dockerd 对这个地址"监听"（listen），任何进程连接（connect）这个路径，内核就把双方接通：

```
普通文件   = 一张写满字的纸
socket 文件 = 墙上的门铃按钮（按钮本身是空的，按下去内核接通屋里的人）
```

### 第二层：挂载做的事——把门牌号钉到容器墙上

`-v /var/run/docker.sock:/var/run/docker.sock` 是 bind mount，把宿主机这个文件原样映射进容器。关键在于：**socket 的本体（daemon 的监听端点）在宿主机内核里，文件路径只是地址**。挂载不需要把 daemon 搬进容器，只需要让容器里的进程"看得见这个地址"——容器里 connect 这个路径，内核解析到的是同一个监听端点。门开在两堵墙上（宿主机一堵、容器一堵），背后是同一个房间（daemon）。

### 第三层：连上之后说的是 HTTP

**docker CLI 本质是 HTTP 客户端，daemon 本质是 HTTP 服务器**。只不过普通网站走 TCP 网络，docker 默认走 Unix socket。每条命令都被 CLI 翻译成 HTTP 请求：

| 你敲的 | 实际发出的 |
|---|---|
| `docker ps` | `GET /containers/json` |
| `docker create ...` | `POST /containers/create`（JSON 参数） |
| `docker exec ...` | `POST /containers/{id}/exec` |

上面的 curl 实验就是铁证：curl 只会 HTTP，照样查到了 docker 版本。

### 串成完整因果链

```
Python 代码
  └─ subprocess.run(["docker", "create", ...])        ← 只是启动 CLI 这个程序
       └─ docker CLI 读默认配置：连 unix:///var/run/docker.sock
            └─ connect() 那个路径
                 └─ 内核：这是 daemon 的监听端点，接通
                      └─ 发 HTTP POST /containers/create（JSON）
                           └─ daemon：在宿主机上创建容器，返回 JSON
```

答案三句话：①daemon 一直在宿主机监听这个 socket；②挂载让容器里这个路径指向同一个内核端点；③CLI 默认连这个路径，创建容器只是发一个 HTTP 请求。

补充小知识：CLI 连哪里可由环境变量 `DOCKER_HOST` 配置（如 `tcp://远程IP:2375`），sock 只是默认值。这也再次印证：**摸到 sock = 成为 daemon 的主人 = 宿主机 root**——API 里什么都能干，比如创建一个挂载宿主机根目录的容器。

---

## 插问 5：怎么又扯到 HTTP 去了？

**🧑‍🎓 学生：** 你把我搞蒙了，`POST /containers/create` 怎么又扯到 HTTP 去了？我有点乱了。

**🧑‍🏫 老师：**

蒙是正常的——上一问我一句话里同时塞了"线路"和"语言"两个概念，是我没讲干净。拆开就顺了。

### 关键澄清：HTTP 不是"上网"的专利

多数人对 HTTP 的印象来自唯一场景：浏览器访问网站。于是大脑把 HTTP 和网页绑死了。但 HTTP 的本质只是一句话：**一种"说话的格式"（协议），规定了消息怎么写**：

```
请求：  GET /xxx HTTP/1.1        ← 要干什么（方法 + 路径）
响应：  HTTP/1.1 200 OK          ← 成没成功（状态码）
        {"Version":"29.1.3"...}  ← 正文（数据）
```

这是一份**公文格式**：第一行写事由，中间写抬头，正文放数据。**至于这份公文走什么渠道递送——网线、WiFi、还是一根内部管道——HTTP 根本不管。**

### 把"说什么话"和"走什么线"分开

| 场景 | 说什么语言 | 走什么线路 |
|---|---|---|
| 浏览器访问网站 | HTTP | TCP 网络 |
| 手机 App 调后端接口 | HTTP | 4G / WiFi |
| **docker CLI ↔ dockerd** | **HTTP** | **Unix socket（内部管道）** |

docker 就是最后一行：**语言还是 HTTP，只是不走高架桥（网络），改走地下室管道（sock）**，格式一点没变。

### 为什么 docker 偏要说 HTTP

CLI 和 daemon 是**两个独立的程序**，要对话就必须约定一门共同语言。自己发明格式？解析、错误处理全要造轮子。用现成的 HTTP？天生适合"一问一答"（问 `GET /containers/json`，答一段 JSON），工具链遍地都是，还自带状态码。

所以 dockerd **内置了一个 HTTP 服务器**（不监听网络端口，只监听 sock），CLI 就是个 HTTP 客户端。`docker create` 翻译成 `POST /containers/create`，本质和在浏览器填表单点"提交"是一模一样的事。

这也让前文的 curl 实验彻底说通：**curl 是个只会说 HTTP 的哑巴程序**，连上管道说了句 `GET /version`，daemon 立刻听懂——因为它蹲在管道那头等的就是 HTTP。

### 重新捋链条，每层标注身份

```
Python 代码
  └─ subprocess.run(["docker",...])   ← 【叫人】启动 CLI 这个程序
       └─ docker CLI                  ← 身份：HTTP 客户端
            └─ connect(sock)          ← 【线路】内部管道
                 └─ "POST /containers/create"  ← 【语言】HTTP 公文
                      └─ dockerd      ← 身份：HTTP 服务器
                                        听懂公文 → 创建容器 → 回一份公文
```

三层各司其职：**subprocess 管"叫人"，sock 管"线路"，HTTP 管"语言"**。

---

## 插问 6：创建一个容器的完整过程（每个细节）

**🧑‍🎓 学生：** 给我一个例子，比如需要创建一个容器了，究竟是一个怎样完整的过程？每个细节都要说清楚。另外 CLI 是客户端，dockerd、Docker daemon 又是什么关系？好懵。

**🧑‍🏫 老师：**

### 先做大扫除：名词捋清

懵点核心：**dockerd 和 Docker daemon 是同一个东西**。

| 名字 | 是什么 |
|---|---|
| `dockerd` | 进程本名（**d** = daemon），跑在宿主机上的常驻进程 |
| **Docker daemon** | 上面这个进程的**职称**。"dockerd 是名字，daemon 是岗位" |
| `docker`（命令） | CLI 客户端程序，只负责传话 |
| Docker（广义） | 整套技术的统称 |

餐厅类比最终版：

```
顾客（你 / Python 代码）
   │ "来一份 容器"
   ▼
点餐前台（docker CLI）── 把人话翻译成标准订单
   │ 订单从窗口塞进去
   ▼
递菜窗口（/var/run/docker.sock）
   ▼
后厨（dockerd = Docker daemon）── 真正做菜
```

订单的格式 = HTTP；窗口 = sock。

### 两个现场实验（WSL + Docker 29.1.3 实测）

**实验 A：用 curl（只会 HTTP）直接创建容器：**

```bash
curl -s --unix-socket /var/run/docker.sock \
  -X POST "http://localhost/v1.44/containers/create?name=lesson-http-demo" \
  -H "Content-Type: application/json" \
  -d '{"Image":"alpine","Cmd":["sleep","infinity"]}'
```

返回：

```json
{"Id":"e459d9017e9893a03afb4ce1036497f58153cbe7a6d5d8be6cce0d382516404e","Warnings":[]}
```

再 `docker ps -a --filter name=lesson-http-demo` 验证——容器真的存在了（状态 Created）。**创建容器 = 发一个 HTTP 请求，没有魔法。**

**实验 B：正常 CLI 流程，注意状态变化：**

```bash
$ docker create --name lesson-cli-demo alpine sleep infinity
0e6392d1afcd47b156e2924b51a2c31c7bf74367c077e9807a3961aaf5e70086   # 返回容器 ID

$ docker ps -a --filter name=lesson-cli-demo
lesson-cli-demo   Created      # 料备好了，但没开机

$ docker start lesson-cli-demo
$ docker ps --filter name=lesson-cli-demo
lesson-cli-demo   Up Less than a second   # sleep infinity 跑起来了

$ docker exec lesson-cli-demo sh -c "echo 我在容器里，主机名是 $(hostname)"
我在容器里，主机名是 0e6392d1afcd    # 容器默认主机名 = 容器 ID 前 12 位
```

**create 和 start 是两步**——create 只是备料登记（rootfs + 隔离配置），一个进程都没跑；start 才真正启动主进程。

**🧑‍🎓 学生：** 不是，你不要直接用现有代码里怎么做的，就当我什么都不知道。不能使用任何的代码，把整个流程串起来讲完整，必要的时候补充一些代码片段就行。

**🧑‍🏫 老师：** 好，接受批评，全部推倒重来。忘掉项目、忘掉类名，从一张白纸开始讲**通用版**。

### 通用版：一个容器是怎么诞生的（从零讲起）

设定：你自己要写一个程序，它需要在"一个隔离的小环境"里执行一条命令。你听说 Docker 能干这事。

一台"装了 Docker"的机器上其实常驻着三样东西：

1. **dockerd**：后台一直运行的总管家进程，所有和容器有关的事都归它管；
2. **docker 命令**：一个传话工具，自己不管任何容器；
3. **/var/run/docker.sock**：dockerd 留的"服务窗口"（电话线）。

**第 1 步：你的程序要能"敲命令"。** 程序不能伸手敲键盘，但任何语言都能"启动另一个程序"，Python 里是 subprocess：

```python
import subprocess
r = subprocess.run(["docker", "--version"], capture_output=True, text=True)
print(r.stdout)       # Docker version 29.1.3 ...
print(r.returncode)   # 0
```

**第 2 步：决定敲什么——docker create：**

```bash
docker create --name mybox --memory 512m alpine sleep infinity
```

人话：帮我登记一个叫 mybox 的容器，用 alpine 镜像，内存上限 512MB，开机后跑 `sleep infinity`（永远睡觉的进程）。

**第 3 步：docker 进程的一生（约 0.1 秒）。** 敲下回车的瞬间：

1. 系统把 docker 这个程序加载成一个**进程**——一个短命进程，活着的目的只有一个：把命令送进后厨、拿到回执、然后死掉；
2. 它先解决"管家在哪"：读环境变量 `DOCKER_HOST`，没设就用默认地址——本机的 sock；
3. 它去"打开"那个路径，内核一看是电话线（Unix socket），接通另一头的 dockerd；
4. 它把你的参数打包成一份**公文**发过去（就是实验 A 里 curl 发的那种）：

```
POST /v1.44/containers/create HTTP/1.1
Content-Type: application/json

{ "Image": "alpine",
  "Cmd": ["sleep", "infinity"],
  "HostConfig": { "Memory": 536870912 } }
```

**第 4 步：dockerd 收到公文，备料。**

- **找镜像**：本地没有 alpine 就从 Docker Hub（公共仓库）下载。镜像 = 一个打包好的**只读**完整目录（alpine 的全部系统文件），类似一张安装盘，只下载一次、所有容器共用；
- **叠出容器的"硬盘"**：overlay 技术——只读镜像层垫底，上面盖一个空的可写层，两层叠起来就是容器将来看到的硬盘；
- **登记**：编一个 64 位十六进制的唯一 ID；记下内存上限 512MB（将来用 cgroup 强制执行）；记下它要有独立视野（namespace：独立进程表、独立网络……在里面看不见宿主机和别的容器）；
- **到此打住**：硬盘备好、本子登记好，但**一个进程都还没跑**——Created 状态，一个没开机的房间；
- **回执**：`{"Id":"e459d9017e98...","Warnings":[]}`。

**第 5 步：回执到手。** docker 进程把 Id 打到 stdout，然后**退出**（传话任务完成，生命结束）。你的 Python 从 `r.stdout` 拿到容器号。

> 很多人不知道的事实：**每敲一条 docker 命令，都是一个全新的短命进程在跑腿。长命的只有 dockerd（一直在）和容器里的进程（开机后）。**

**第 6 步：开机——docker start。** 又一轮同样的跑腿（subprocess → docker 进程 → sock → `POST /containers/{id}/start`）。dockerd 这次：**创建一个真进程跑 `sleep infinity`，塞进备好的隔离环境**——它看到的硬盘是叠好的两层、内存受 512MB 管、视野里只有自己。状态变 **Up**。

> 容器 = 一个被隔离措施包裹的、正在运行的进程（外加配套）。没有更神秘的东西了。

**第 7 步：干活——docker exec。**

```python
r = subprocess.run(
    ["docker", "exec", "mybox", "sh", "-lc", "python3 分析脚本.py"],
    capture_output=True, text=True,
)
print(r.stdout)   # 命令的输出！
```

公文 `POST /containers/{id}/exec` → dockerd 在 mybox 的隔离环境里再创建一个 sh 进程执行你的命令 → 输出沿原路返回：sh → dockerd → 电话线 → docker 进程 stdout → subprocess → 你的程序。**闭环完成。**

```
你的程序        docker进程(短命)     sock(线)      dockerd(常驻)          容器
   │ subprocess     │                 │               │                   │
   ├───────────────►│ 出生             │               │                   │
   │                ├────────────────►│──────────────►│ POST create       │
   │                │                 │               │ 找镜像/叠硬盘/登记 │
   │                │◄────────────────┼───────────────┤ 回执{Id}          │
   │  r.stdout=Id   │ 死               │               │                   │
   │ subprocess(start)…同样一轮…        │               │ fork sleep infinity─► Up
   │ subprocess(exec) …同样一轮…        │               │ fork sh ──────────► 跑命令
   │  r.stdout=输出                                             输出回流
```

### 对照：把通用流程套到真实项目上

场景：用户对 aegra 说"帮我分析这个 Excel"，该会话**第一次**需要执行命令。

1. **LLM 决定动手**：发出工具调用 `execute("python3 分析脚本.py")`。
2. **代码发现自己没有容器**：`_ensure_container_alive()` → `_container_id` 是 None → 进入创建流程。
3. **拼 docker create 命令**（概念全是前面课学过的）：

```bash
docker create --name aegra-sandbox-会话ID \
  -w /workspace \
  --cpus 1 --memory 512m \        # 资源"信用卡额度"（插问2）
  -e JZFZ_TOKEN=eyJhbGci... \     # 用户身份令牌
  --label aegra.thread_id=会话ID \ # 清理程序认领用（第9课）
  -v /mnt/windows-workspaces/用户/agent/会话:/workspace \  # 宿主机路径！（第8课）
  自建瑞士军刀镜像 \
  sleep infinity                  # 主进程：睡觉保活（第3课）
```

4. **【叫人】subprocess 启动 CLI**：主容器里的 Python fork 出子进程执行 `docker` 程序。
5. **CLI 找线路**：`DOCKER_HOST` 未设 → 默认 `unix:///var/run/docker.sock`（容器里有，compose 挂的）。
6. **CLI connect()**：内核发现是 socket 文件，接通到 dockerd。
7. **【语言】CLI 说 HTTP**：把命令行参数翻译成大 JSON 发 `POST /containers/create`（就是实验 A 里那种请求）。
8. **dockerd 干活**：查镜像 → 准备 rootfs（只读镜像层 + 薄可写层）→ 登记隔离配置（namespace 隔离视野、cgroup 限资源）。**只是备料，没跑进程** → 对应 `Created` 状态。
9. **容器 ID 返回**：dockerd 回 `{"Id":...}` → CLI 打到 stdout → subprocess 装进 CompletedProcess → Python 存为 `_container_id`。
10. **start 开机**：同样的 4~7 步再来一遍，`POST /containers/{id}/start` → dockerd fork 出 `sleep infinity` 塞进隔离环境 → 状态 Up。
11. **exec 递纸条**：`docker exec 容器 sh -lc "python3 分析脚本.py"` → dockerd 在容器隔离环境里再 fork 一个 sh 进程 → 输出原路返回：容器 → daemon → sock → CLI stdout → Python → LLM → 继续推理。

### 全景一张图

```
用户："分析这个 Excel"
 │
 ▼
┌──────────── 主容器 jzfz-agent-blue ────────────┐
│ LLM："我要调 execute 工具"                       │
│ DockerSandbox.execute("python3 分析脚本.py")    │
│   │ subprocess.run(["docker","create",...])【叫人】
│   ▼                                             │
│ docker CLI（HTTP 客户端 / 点餐前台）             │
│   │ connect(sock)                     【线路】   │
└───┼─────────────────────────────────────────────┘
    ▼
/var/run/docker.sock（两堵墙上同一个窗口）
    ▼
┌──────────── 宿主机 ────────────────────────────┐
│ dockerd = Docker daemon（HTTP 服务器 / 后厨）    │
│   POST /containers/create       → 备料登记     │
│   POST /containers/{id}/start   → 开机（Up）   │
│   POST /containers/{id}/exec    → 隔离环境里跑命令│
│      └─ 沙箱容器（兄弟）：aegra-sandbox-会话ID  │
└─────────────────────────────────────────────────┘
```

**三层职责终版：subprocess 叫人，sock 铺线路，HTTP 说话。每条 docker 命令都要走完这三层。**

（实验容器已清理：`docker rm -f lesson-http-demo lesson-cli-demo`。）

---

## 第 5 课：容器自愈——用户永远不需要知道容器死过

> **课堂检查回放**（插问 6 留的题：docker 命令进程执行完还活着吗？机器上长期活着的都有谁？）
>
> 学生没有直接作答，而是复述了整体理解：
>
> 🧑‍🎓 "每次开启一个对话，都会根据这个会话创建一个 Id，然后开启一个独有的容器，这个容器就原地待命、睡眠，后续需要操作的时候就启动这个容器重新做一点事情？"
>
> 🧑‍🏫 判分：**90 分，主干全对**。两个精修点：
> ① 不是"开启对话就创建容器"，而是**第一次需要执行命令时才创建**（懒加载——纯聊天不开沙箱，省资源）；
> ② "后续需要操作时就启动容器"——不对。容器从创建起就一直**运行中（Up）**，后续操作**直接 exec 递纸条**即可，不需要再"启动"。"重新启动"只发生在容器**被停过/删过**时——这正是本课的主题。
>
> （上题答案：docker 命令进程执行完就退出；长期活着的只有 dockerd 和容器内进程。）

**🧑‍🏫 老师：**

### 现实会给你三记耳光

沙箱系统跑几个月后必然遇到：①**容器停了**（机器重启、进程崩溃、或清理程序停掉 24 小时没动的容器）；②**容器没了**（更狠的清理规则：7 天没动的直接删）；③**你自己的程序重启了**（内存里"我建过哪些容器"的记录清零，可容器还在宿主机上）。

用户不管这些，他只会说"接着昨天的"。代码必须自己扛住。

### 通用解法：每次干活前，先体检

**递纸条（exec）之前，先问管家一句：这容器还好吗？**

```
function 确保容器可用():
    if 我手上还没有容器:
        创建 + 启动                    # 第一次（懒加载也在这里触发）
        return

    状态 = 问管家(docker inspect)       # 体检

    if 状态 == 运行中:
        return                         # 99% 的日常：什么都不做，直接去 exec

    if 容器存在但停着:
        启动它(docker start)            # 自愈①：被清理程序停掉的

    else:  # 容器整个没了
        重新创建 + 启动                 # 自愈②：被删掉的
```

体检 = `docker inspect`；自愈 = 再发一次 `docker start`，或把 create+start 重走一遍。

### 凭什么"重建"也不可怕？——文件根本不住在容器里

回想 create 时挂的参数 `-v 宿主机目录:容器内/workspace`：**容器里往 /workspace 写的每个文件，实际落在了宿主机那个目录里**。

> 容器 = 工作台（可以扔、可以换）
> 宿主机目录 = 仓库（东西真正存放的地方）

容器被删、被重建，只是换了张工作台——新工作台开机时把仓库再挂一遍，文件原样回来。用户毫无异样。（会丢的只有容器里临时装的包这类"工作台上的划痕"。）

**体检 + 文件外置 = 用户无感的全部秘密。**前者保证"总有容器可用"，后者保证"容器换了东西也在"。

### 对照真实项目

项目里这个函数叫 `_ensure_container_alive()`（`docker_sandbox.py:288`），每次 execute/read/upload/download 前都先走它——就是上面那三分支。另外两个工程细节：

- **加锁**：两条消息同时发现"容器没了"、同时重建会打架（真实修过的 bug：并发下容器 ID 被清空，另一线程拿着空值去 start 直接报错）。解法：一把锁，同一时刻只许一个线程做"体检+重建"；
- **按名找回**：主程序重启后内存记录清零，但容器名用会话 ID 拼成（`aegra-sandbox-{会话ID}`），按名字 inspect 就能找回接着用，还能校验标签防止拿错。

---

## 第 6 课：一个接口撑起一切——execute() 协议

> **课堂检查回放**（第 5 课留的题：容器删除重建后用户为何感觉文件都在？）
>
> 🧑‍🎓 学生答："因为我们在容器中的工作台，其实是和宿主机的一个目录绑定在一起了（bind）。我们在容器中操作的所有文件，实际都存放在宿主机的一个目录上。所以即使容器被移除了，主要数据还在，内容都在。"
>
> 🧑‍🏫 老师判分：**满分**。bind mount 机制、数据真实落点、结论三要素全齐。

**🧑‍🎓 学生：** 看不懂你在说什么。你可以参考现有代码是怎么实现的，但讲解时不要认为我读过这些代码。这个章节再给我解释一遍。

**🧑‍🏫 老师：** 你说得对，第一版讲砸了——满嘴"接口""协议""抽象方法"，默认你知道一堆框架概念。重讲，从具体困境出发，一行代码一行代码地说。

### 重讲版：主程序怎么"看"到沙箱里的文件

**困境**：agent（主程序，在主容器里）想看看用户上传的 `data.csv` 里写了什么。可文件在沙箱容器里——两个隔离的箱子，主程序"看不见"沙箱的文件系统。两条路：

- **路 A：专门修一条"取文件"的通道**（如 docker cp）。但读、写、列目录、搜索……每种需求修一条通道？通道越修越多，坑越攒越多。
- **路 B：用唯一已有的通道——递纸条**。"读文件"可以改写成一条命令：**执行一段小程序"打开 xx 文件，把内容打印出来"**。打印的文本沿着回程路（容器 → dockerd → sock → docker 进程 → 主程序）送到主程序手上。

> **"看文件" = 递一张写着"帮我把文件内容打出来"的纸条。**

**回顾实验，三节管道逐节拆**：

```
echo '{"path":"/tmp/demo.txt","offset":0,"limit":2}' | base64 -w0 | docker exec -i lesson-file python3 -c "<脚本>"
```

| 节 | 干什么 |
|---|---|
| `echo '{...}'` | 写参数纸条：读哪个文件、跳过前几行、读几行（JSON） |
| `base64 -w0` | 把纸条转成"安全字母" |
| `docker exec -i ... python3 -c` | 纸条从 stdin 流进容器，python3 执行脚本 |

**纸条上的脚本逐行读**（真实项目源码里几乎一字不差）：

```python
import base64, json, sys

# ① 从 stdin 读 base64 纸条 → 解码 → 解析成字典
d = json.loads(base64.b64decode(sys.stdin.read()))

# ② 打开参数指定的文件，读全文按行切开
lines = open(d['path'], encoding='utf-8').read().splitlines()

# ③ 按 offset/limit 切片
for i, line in enumerate(lines[d['offset']:d['offset']+d['limit']]):
    n = d['offset'] + i + 1
    print(f'{n:6d}\t{line}')     # 打印：行号 + tab + 内容
```

输出（文件 3 行，`limit:2` 只出 2 行——分页顺便有了）：

```
     1	line one: hello
     2	line two: world
```

**主程序"看"到了文件——从头到尾没碰过沙箱的文件系统，只是收到一段文本。**

**举一反三，所有文件操作都是纸条**：

| agent 想做的 | 纸条上写什么 |
|---|---|
| 读文件 | "打开文件，打印内容" |
| 写文件 | "从 stdin 读内容，写进 xx 文件" |
| 列目录 | "遍历目录，打印名字" |
| 搜内容 | "逐行找匹配，打印出来" |

主程序只需要会一件事：递纸条。所有文件操作，不过是换一张纸条的措辞。

**参数为什么先 base64 再进管道**：①转义——文件名带引号/空格，拼进命令行当场碎，还可能被注入；base64 后全变成无害字母；②长度——命令行参数有上限（ARG_MAX 约 2MB），写大文件直接炸，stdin 没有限制。

**对照真实项目**：DeepAgents 框架里有个类，干的正是"把读/写/列/搜全做成纸条模板"，它规定：接新沙箱只需实现"递纸条"这一个函数，所有纸条模板白送。项目的 `DockerSandbox` 就是那个"会递纸条的实现"。这也彻底回答了插问 1：**兜底镜像为什么是 python 镜像——所有纸条都是 Python 写的，没有 python3 文件操作全瘫。**

### 附：第一版讲法（重讲后回看就不难了）

第一版的切入角度是"接口设计"：

agent 的工具箱里有一大堆文件工具——read_file、write_file、ls、grep、edit。如果每个工具都单独修一条"主程序 → 容器"的通道，就得维护 N 套机制。

### 关键洞察：文件操作，本质上都是"执行一条命令"

- "读文件" = 执行一段**把文件内容打印出来的脚本**
- "写文件" = 执行一段**把内容写进文件的脚本**
- "列目录"/"搜内容"/"改文件" = 同理

而"在容器里执行一段脚本"就是 **exec**——一个通道都不用多修。

**现场实验**（WSL + python:3.12-slim 实测）：起一个容器，写入三行文件，然后不用任何 docker 文件拷贝命令，纯用"递脚本"读它：

```bash
# 1. 容器 + 写文件
docker create --name lesson-file python:3.12-slim sleep infinity
docker start lesson-file
docker exec lesson-file sh -c \
  "printf 'line one: hello\nline two: world\nline three: sandbox\n' > /tmp/demo.txt"

# 2. "read_file" = 递一段 python 脚本，参数走 stdin（JSON→base64）
echo '{"path":"/tmp/demo.txt","offset":0,"limit":2}' | base64 -w0 | \
docker exec -i lesson-file python3 -c "
import base64, json, sys
d = json.loads(base64.b64decode(sys.stdin.read()))
lines = open(d['path'], encoding='utf-8').read().splitlines()
for i, line in enumerate(lines[d['offset']:d['offset']+d['limit']]):
    n = d['offset'] + i + 1
    print(f'{n:6d}\t{line}')
"
```

真实输出：

```
     1	line one: hello
     2	line two: world
```

读文件被翻译成了一条 `exec python3 -c "脚本"`，还支持 offset/limit 分页（传 `limit:2` 就只出 2 行）。

### 接口瘦身到极致

> **沙箱后端只要会"执行命令"（execute），整套文件工具就全送给你。**

这就是 DeepAgents 框架 `BaseSandbox` 的设计：**`execute()` 是唯一必须实现的方法**；read/write/edit/grep/glob/ls 全是建立在它之上的默认实现——每个实现就是一段 Python 脚本模板，用时拼一条 `docker exec python3 -c "..."` 递进去。

两个漂亮的副产品：

1. **换后端零成本**：SSH、本地子进程、云沙箱……只要能执行命令，实现一个 execute()，整套文件工具立刻能用；
2. **回收伏笔 ①**：兜底镜像为什么必须是 python:3.11-slim——read/write/grep 的默认实现全是 Python 脚本，容器里没有 python3 这些工具全瘫。python3 是沙箱**基础设施自身的硬依赖**。

### 参数怎么递进去？——stdin + base64 + JSON

直觉做法是拼进命令行：`python3 read.py "/tmp/demo.txt"`。两个坑：

1. **转义地狱**：路径/内容里带引号、空格、特殊字符就完蛋，还给 shell 注入开大门；
2. **长度上限**：操作系统对单条命令参数总长有上限（ARG_MAX，约 2MB），写大文件直接炸。

解法：**内容不走命令行，走 stdin**——参数打包成 JSON → base64 编码 → 从 stdin 喂给脚本。base64 把一切字符变成安全字母（A-Za-z0-9+/），传输途中谁也搞不坏。

stdin 这条路：**不经过 shell 解析（无转义问题）、没有长度限制、内容原样到达**——三个坑一次全解。

### 对照真实项目

- `deepagents/backends/sandbox.py` 的 `BaseSandbox`：execute() 唯一抽象方法 + 一堆脚本模板（和实验那段几乎是亲兄弟，连 `{行号:6d}\t{内容}` 的输出格式都一样）；
- 项目的 `DockerSandbox` 核心就是实现 execute()（外加 override 了 read() 修一个 heredoc 的坑）。

### 伏笔回收清单

| 伏笔 | 埋在哪 | 回收了吗 |
|---|---|---|
| 兜底镜像为什么是 python:3.11-slim | 插问 1 | ✅ 文件工具 = Python 脚本 |
| agent 的 read_file/write_file 是什么 | 第 1 课 | ✅ 底层全是 exec 递脚本 |

---

## 实战：亲手写一个最小沙箱（2 个文件，0 个脚本）

**🧑‍🎓 学生：** 如果要实现这个功能，总共需要几个文件、几个脚本？给我一份完整的代码。

**🧑‍🏫 老师：**

答案：**2 个文件、0 个预装脚本**（`sandbox.py` 沙箱本体 + `demo.py` 演示）。递进容器的"纸条"不是文件，是嵌在代码里的字符串常量——用完即弃，这正是"纸条"的实体形态。

以下代码在 WSL + Docker + python:3.12-slim 环境实测跑通（2026-08）。

### sandbox.py（约 100 行，每个方法对应一课）

```python
"""最小可用沙箱：把第 1-6 课的知识点拼成能跑的代码。"""
import base64
import json
import subprocess

IMAGE = "python:3.12-slim"   # 兜底镜像必须是 python（第 6 课：纸条都是 Python 写的）
WORKDIR = "/tmp"             # 真实项目是 /workspace，由挂载目录自动产生（第 8 课）
CPU = "1"                    # 资源"信用卡额度"
MEM = "512m"
EXEC_TIMEOUT = 30            # 命令超时，防死循环

# ---- 两段"纸条脚本"：不是文件，是字符串，用完即弃（第 6 课核心） ----
_READ_SCRIPT = """
import base64, json, sys
d = json.loads(base64.b64decode(sys.stdin.read()))
try:
    lines = open(d['path'], encoding='utf-8').read().splitlines()
except FileNotFoundError:
    print('ERROR: file not found'); sys.exit(1)
for i, line in enumerate(lines[d['offset']:d['offset']+d['limit']]):
    print(f"{d['offset']+i+1:6d}\t{line}")
"""

_WRITE_SCRIPT = """
import base64, json, os, sys
d = json.loads(base64.b64decode(sys.stdin.read()))
os.makedirs(os.path.dirname(d['path']) or '.', exist_ok=True)
with open(d['path'], 'w', encoding='utf-8') as f:
    f.write(d['content'])
print('OK')
"""


class Sandbox:
    """一场对话（会话）对应一个容器。"""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.name = f"mylab-sandbox-{session_id}"   # 容器名 = 会话 ID（第 5 课：按名找回）
        self.container_id = None                     # None = 还没创建 → 懒加载

    # ---------- 第 4 课【叫人】：启动 docker CLI 这个短命进程 ----------
    def _run(self, cmd, input_bytes=None, timeout=None):
        return subprocess.run(
            cmd, input=input_bytes, capture_output=True,
            timeout=timeout, check=False,
        )

    # ---------- 第 5 课：体检 + 自愈 ----------
    def _ensure_alive(self):
        if self.container_id is None:
            self._create()                          # 第一次（懒加载）
            return
        r = self._run(["docker", "inspect", "-f",
                       "{{.State.Running}}", self.container_id])
        if r.returncode == 0 and r.stdout.decode().strip() == "true":
            return                                  # 99% 的日常：活着，直接走
        rs = self._run(["docker", "start", self.container_id])
        if rs.returncode != 0:                      # start 失败 = 容器没了 → 重建
            self.container_id = None
            self._create()

    # ---------- 第 3/4 课：create（备料登记）+ start（开机） ----------
    def _create(self):
        r = self._run([
            "docker", "create",
            "--name", self.name,
            "-w", WORKDIR,
            "--cpus", CPU, "--memory", MEM,
            IMAGE,
            "sleep", "infinity",                    # 主进程：睡觉保活
        ])
        if r.returncode != 0:
            raise RuntimeError(f"docker create 失败: {r.stderr.decode()}")
        self.container_id = r.stdout.decode().strip()
        self._run(["docker", "start", self.container_id])

    # ---------- 第 3 课：递纸条 ----------
    def execute(self, command: str, timeout=None):
        self._ensure_alive()
        r = self._run(
            ["docker", "exec", "-w", WORKDIR,
             self.container_id, "sh", "-lc", command],
            timeout=timeout or EXEC_TIMEOUT,
        )
        output = (r.stdout or b"") + (r.stderr or b"")   # 输出+报错合并，像真终端
        return output.decode(errors="replace"), r.returncode

    # ---------- 第 6 课：文件操作 = 换一张纸条的措辞 ----------
    def read_file(self, path, offset=0, limit=2000):
        payload = json.dumps({"path": path, "offset": offset, "limit": limit})
        return self._pipe_script(_READ_SCRIPT, payload)

    def write_file(self, path, content):
        payload = json.dumps({"path": path, "content": content})
        return self._pipe_script(_WRITE_SCRIPT, payload)

    def _pipe_script(self, script, payload_json):
        """JSON → base64 → stdin → 容器里的 python3（避转义、避 ARG_MAX）。"""
        self._ensure_alive()
        b64 = base64.b64encode(payload_json.encode()).decode()
        r = self._run(
            ["docker", "exec", "-i", self.container_id,
             "python3", "-c", script],
            input_bytes=b64.encode(),
        )
        return (r.stdout or b"").decode(errors="replace"), r.returncode

    # ---------- 收尾 ----------
    def destroy(self):
        self._run(["docker", "rm", "-f", self.name])
        self.container_id = None
```

### demo.py（像 agent 一样使用沙箱）

```python
"""演示：像 agent 一样使用沙箱——完整走一遍第 1-6 课的知识点。"""
import subprocess

from sandbox import Sandbox

sb = Sandbox(session_id="demo001")          # 一场对话开始

# 1. 第 6 课：写文件 = 递一张"写文件"纸条
out, code = sb.write_file("/tmp/analyze.py",
    "data = [3, 1, 4, 1, 5, 9, 2, 6]\n"
    "print('sum =', sum(data))\n"
    "print('avg =', sum(data)/len(data))\n")
print("[1] 写文件:", out.strip(), "| 退出码:", code)

# 2. 第 6 课：读文件（limit=2 只取前 2 行）
out, code = sb.read_file("/tmp/analyze.py", limit=2)
print("[2] 读回前 2 行:")
print(out)

# 3. 第 3 课：执行命令
out, code = sb.execute("python3 analyze.py")
print("[3] 执行结果:")
print(out, "| 退出码:", code)

# 4. 第 5 课：自愈——手动停掉容器，再执行，依然成功
subprocess.run(["docker", "stop", sb.name], capture_output=True)
print("[4] 容器已被手动停止，再次执行:")
out, code = sb.execute("echo revived && ls")
print(out, "| 退出码:", code)

# 5. 清理
sb.destroy()
print("[5] 容器已删除，演示结束")
```

### 真实运行输出（WSL 实测）

```
[1] 写文件: OK | 退出码: 0
[2] 读回前 2 行:
     1	data = [3, 1, 4, 1, 5, 9, 2, 6]
     2	print('sum =', sum(data))

[3] 执行结果:
sum = 31
avg = 3.875
 | 退出码: 0
[4] 容器已被手动停止，再次执行:
revived
analyze.py
 | 退出码: 0
[5] 容器已删除，演示结束
```

每一步对应的知识点：[1][2] 文件操作=递纸条（第 6 课）；[3] exec 执行（第 3 课）；[4] 体检自愈、且停掉的容器文件还在（第 5 课）；退出码 0 = 成功。

### 和真实项目的差距（= 剩下的课程表）

| 缺什么 | 后果断 | 讲在哪 |
|---|---|---|
| 没挂载宿主机目录 | 容器一删文件就没了 | 第 8 课 |
| 没有清理程序 | 容器无限堆积 | 第 9 课 |
| 没有锁 | 并发下体检/重建会打架 | 第 5 课提过 |
| 没有 token 注入、按用户分目录 | 多用户场景没法用 | 第 7、8 课 |
| 镜像是现成 python，非瑞士军刀 | 干不了文档/浏览器/检索的活 | 插问 1 |

换句话说：**这 100 行已经是一个概念完整的沙箱，剩下的课都是往这个骨架上钉零件。**

---

## 插问 7：跑通这套代码，都需要准备什么？

**🧑‍🎓 学生：** 你写完了代码后，也要解释下都需要什么啊。另外，我们之间的对话——特别是我主动说的东西——都要记录下来。

**🧑‍🏫 老师：** 两件事都对。第二件从现在起严格执行：此前本实录按"有教学价值"筛选学生发言，标准改为**完整对话实录、学生每句话原文入册**（本次已补记此前省略的确认语；另有一条博客编辑指令——"保留真实名称，不脱敏"——也补记于此）。

### 需要的清单（就 4 样）

| # | 需要什么 | 为什么需要 | 本机情况 |
|---|---|---|---|
| 1 | **Docker**（能执行 docker 命令的环境） | sandbox.py 的每个动作，最终都是 subprocess 调 docker CLI | WSL 里有 |
| 2 | **Python 3.7+** 解释器 | 跑 sandbox.py / demo.py 本身 | WSL 里的 python3 |
| 3 | **python:3.12-slim 镜像** | 沙箱的"安装盘"。本地没有也行——docker create 会自动从 Docker Hub 拉（那时才需要网络） | 本地已有 |
| 4 | **两个 .py 文件** | 沙箱本体 + 演示 | `F:\code\Python\sandbox-lab\` |

**一个容易忽略的零**：代码只用 Python 标准库（base64、json、subprocess）——**零第三方依赖，不用 pip install 任何东西**。这也是"纸条方案"的好处之一：主程序侧薄到几乎没有依赖。

### 关键选择：代码在哪跑？

demo.py 扮演**主程序**（真实项目里主容器的角色）。它自己不需要任何特权，**只需要能连上 docker**。两种跑法：

- **WSL 里跑**（本文方式，docker 在 WSL）：`python3 demo.py`
- **Windows 上跑也行**（前提 Docker Desktop）：`python demo.py` 一样通——subprocess 会找到 docker.exe，命令完全相同

### 三层角色对照

```
跑 demo.py 的 python3     ←→  真实系统的主容器（指挥）
WSL 的 dockerd            ←→  宿主机管家
python:3.12-slim 容器     ←→  沙箱
```

### 复刻步骤

```bash
docker version                       # ① 确认 docker 可用
docker pull python:3.12-slim         # ② （可选）提前拉镜像
cd sandbox-lab && python3 demo.py    # ③ 跑
```

---

## 待续

课程进行中，后面的内容（容器自愈、execute() 协议、会话与容器的对应、路径映射、双 TTL 回收……）讲完会持续追加到本文。
