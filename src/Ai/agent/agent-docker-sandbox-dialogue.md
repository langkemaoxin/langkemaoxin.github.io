---
title: "从零理解企业级 Agent 的 Docker 沙箱设计（师生对话完整实录）"
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

# 从零理解企业级 Agent 的 Docker 沙箱设计（师生对话完整实录）

## 关于本文件的格式

> 学生要求："我需要的是完整的对话内容，不经过任何加工的，你现在控制台怎么展示的，就在文件里面怎么展示。"

因此本文件是**逐字实录**：🧑‍🎓 = 学生在控制台输入的原文；🧑‍🏫 = 老师在控制台输出的原文（markdown 原样保留）；🔧 = 老师在控制台执行的操作（建文件、跑实验、改记忆，控制台中以折叠块显示，此处用标记转写，实验的原始输出一并附上）。按时间顺序编号，不删减、不重排、不润色。

---

## 对话 1（开场）

**🧑‍🎓 学生：**

> 6. 沙箱执行层（很有意思的设计）
>
> - Docker SDK + docker.sock 挂载：主容器内再起沙箱容器（DinD 变体）
> - 按 user/graph/thread 三级隔离工作区，宿主机目录挂载进容器 /workspace（src/jzfz/backend.py、common/sandbox/docker_sandbox.py）
> - 沙箱镜像是个"瑞士军刀"（Dockerfile.sandbox）：Node 24 + Playwright + Chromium（浏览器自动化）+ Python 数据栈（pandas/numpy）+ 文档处理（pymupdf/python-pptx/python-docx/openpyxl）+ pymilvus（Milvus 向量库客户端！说明 skill 里会做向量检索）
> - 资源限制（CPU/内存/exec 超时）、自动清理（sandbox/cleanup.py）
>
> F:\code\Python\jzfz-ai-agent
>
> 从0和我讲解一下，这里的沙盒设计是怎么回事

🔧 **老师操作**：读取项目源码（docker_sandbox.py、constants.py、spec.md、backend.py、cleanup.py、docker_utils.py、Dockerfile.sandbox、config.py、graph.py、docker-compose.yml、deepagents 的 sandbox.py 等）。

**🧑‍🏫 老师：**

代码都读完了。下面从零讲这套沙箱设计——先纠正你笔记里的两个小误差，再按"为什么 → 全景 → 分层拆解 → 时序 → 边界"推进。

---

# 一、它解决什么问题

DeepAgents 这类框架的 agent 有一套虚拟文件系统工具（read_file / write_file / edit / grep / glob / shell）。这些工具总得有个地方**真的**执行：

- 在主容器（跑 LangGraph 应用的那个容器）里直接执行？一条 `rm -rf` 或死循环就把服务打挂了，多用户的文件还会互相踩。
- 每次调用起一个全新容器？太慢，且会话中间状态（装的包、临时文件）全丢。

所以目标是：**每个会话（thread）一个常驻、互相隔离、带资源上限、可自愈、能自动回收的执行环境**。这就是沙箱层。

---

# 二、全景：三个角色，一条 socket

```
┌─────────────────────────────────────┐
│ 宿主机（Linux）                      │
│                                     │
│  Docker Daemon  ◄──┐                │
│    ▲    ▲          │ docker.sock    │
│    │    │          │ (挂载进主容器)  │
│  ┌─┴────┴──────────┴─────────┐      │
│  │ 主容器（aegra 应用）        │      │
│  │ LangGraph + DeepAgents    │      │
│  │ 挂载: /d/workspaces→/workspaces │
│  └───────────┬───────────────┘      │
│              │ docker create/exec   │
│  ┌───────────▼───────────────┐      │
│  │ 沙箱容器 × N（每 thread 一个）│      │
│  │ -v thread目录 → /workspace │      │
│  │ sleep infinity，等 exec    │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

三个要点：

**1. 这是 DooD，不是严格意义的 DinD。** 你笔记里写"DinD 变体"，准确说法是 **Docker-out-of-Docker**：主容器里**没有**第二个 Docker Daemon，而是把宿主机的 `/var/run/docker.sock` 挂进来（`docker-compose.yml:47`），通过它命令**宿主机的** Daemon。真 DinD 是容器里跑完整 Daemon（要 `--privileged`，重且险）。DooD 的直接推论：**主容器和沙箱容器是同一 Daemon 下的"兄弟"，不是"父子"**——后面路径映射的坑就源于此。

**2. 不是 Docker SDK，是直接调 docker CLI。** 你笔记里写"Docker SDK + docker.sock"，实际代码是 `subprocess.run(["docker", ...])` 拼 CLI 命令（`docker_utils.py:58` 的 `run_raw`），没有用 docker-py。CLI 本身默认连 `/var/run/docker.sock`，所以 socket 挂载仍然是前提。选 CLI 而不是 SDK 的好处：零依赖、和手工排障命令完全一致、超时语义自己控制。

**3. 开关是环境变量。** `SANDBOX_BACKEND=docker` 才启用（`backend.py:32`），否则 `build_backend()` 返回 None，agent 退化成没有执行环境纯对话模式。

---

# 三、协议层：整个沙箱其实只有一个原语——execute()

这是理解全案设计最关键的一层。看 DeepAgents 的 `BaseSandbox`（`.venv/.../deepagents/backends/sandbox.py:204`）：

```python
class BaseSandbox(SandboxBackendProtocol, ABC):
    @abstractmethod
    def execute(self, command: str, *, timeout=None) -> ExecuteResponse: ...

    # read / write / edit / grep / glob / ls_info 全都有默认实现！
```

**只有 `execute()` 是抽象方法**，其余文件操作全是默认实现，而默认实现的套路是：拼一条 `python3 -c "..."` 命令，把参数 base64 编码后通过 **stdin（heredoc）** 送进去，再 `execute()` 它。比如 `glob_info` 就是往沙箱里 exec 一段做 `glob.glob()` 的 Python。

这个设计的含义：

- **任何能跑 shell 的东西都能当沙箱后端**——SSH 到远端机器、K8s Pod、本地子进程，只要实现 `execute()`，整套文件工具立刻可用。
- 数据传输走 stdin 而不是拼进命令行，是为了绕开 **ARG_MAX 限制**（参数总长上限，大文件会炸）和 **shell 转义注入**。base64 + JSON 是"让任意二进制安全过 shell"的标准手法。
- 沙箱镜像里必须有 `python3`——这不是巧合，是**协议的隐含依赖**（这也是 `DEFAULT_IMAGE = "python:3.11-slim"` 的原因，`constants.py:3`）。

---

# 四、实现层：DockerSandbox 把协议翻译成 docker CLI

`src/common/sandbox/docker_sandbox.py`。核心状态就一个：`_container_id`，外加一把 RLock。

## 容器的形态：`sleep infinity`

首次使用时（`_ensure_container`，docker_sandbox.py:238）：

```
docker create --name aegra-sandbox-{thread_id} \
  -w /workspace --cpus 1 --memory 512m \
  -e JZFZ_TOKEN=... --label aegra.thread_id=... \
  -v {宿主机thread目录}:/workspace \
  --dns 192.168.0.50 ... \
  {镜像} sleep infinity
docker start {容器}
```

`sleep infinity` 是精髓：容器**没有业务主进程**，它只是个"活的 Linux 环境"站在那儿，所有工作都通过 `docker exec` 进去做。这比"把命令当容器入口跑"的模式（run-per-command）慢启动换来了**会话状态持续**——装过的包、/tmp 里的中间文件，下一条命令还在。

## execute()

```python
exec_cmd = ["docker", "exec", 容器, "sh", "-lc", command]
completed = self._run(exec_cmd, timeout=...)
output = stdout + stderr   # 合并
```

`sh -lc` 里的 `-l` 是 login shell（加载 /etc/profile，PATH 完整）。stdout/stderr 合并是因为对 LLM 来说，报错信息和正常输出混在一起按时间序出现，比分开更接近真实终端体验。超时统一返回 exit_code=124（docker_utils.py:102，模仿 GNU timeout 的惯例）。

## read() 为何要 override

`BaseSandbox.read()` 的默认实现用 heredoc 传参，但 heredoc 要求 stdin 可读——`docker exec` 不加 `-i` 时 stdin 是 /dev/null，heredoc 直接读空。所以 `DockerSandbox.read()`（docker_sandbox.py:102）重写成 `-i` + `input_data` 显式喂 stdin 的方式，还顺手增强了：BOM 检测（utf-8-sig / utf-16 等）、按行偏移分页、`%6d\t` 行号格式。**这是"默认实现 80 分、覆盖点补 20 分"的典型协议扩展模式。**

## 上传/下载：exit code 当信号

- 上传（`_upload_single`）：JSON `{path, content}` 从 stdin 喂给容器内一个写文件的 Python 脚本。
- 下载（`_download_single`）：`printf '%s' '路径' | python3 -c "..."`，退出码有语义——**2 = 是目录，1 = 找不到**（docker_sandbox.py:373），宿主侧据此 raise `IsADirectoryError`/`FileNotFoundError`，映射回协议的错误类型。用 exit code 而不是 stdout 传错误，是为了让 stdout 干干净净地承载文件内容本身（二进制安全，走 `run_raw_binary`）。

## 自愈：`_ensure_container_alive()`

每次操作前都先走它（docker_sandbox.py:288）：

```
没容器 → 创建
docker inspect State.Running == true → 直接用
不在运行 → docker start
start 都失败（容器被删了）→ 置 None，重建
```

也就是说清理线程把容器 stop 掉之后，用户下次提问会**无感地**把容器重新 start——文件在宿主机上没丢，会话无缝续上。RLock 防的是并发请求同时触发"发现容器没了→重建"的竞态。

---

# 五、工厂层：backend.py 把"会话身份"变成"容器配置"

`src/jzfz/backend.py` 的 `build_backend()` 返回一个 **factory(runtime)**，由 `graph.py:250` 传给 `create_deep_agent(backend=...)`。DeepAgents 需要沙箱时就调这个 factory。

factory 做的事，本质是**从 LangGraph runtime 里挖出"我是谁"，再翻译成容器属性**：

| runtime 里的身份 | 变成容器的什么 |
|---|---|
| `thread_id`（会话） | 容器名 `aegra-sandbox-{thread_id}` + label `aegra.thread_id` |
| `graph_id`（哪个 agent） | label + skill 视图挂载点 `/data/skills/{graph_id}` |
| `user_id`（谁在用） | label + 环境变量 `JZFZ_USER_ID` |

三个值得注意的设计：

**1. 进程内缓存按 thread_id 复用**（backend.py:71）：`cache: dict[thread_id → DockerSandbox]`，同一会话的多次工具调用拿到同一个实例、同一个容器，不会每次都 inspect。

**2. token 注入**（backend.py:122）：`fetch_token(user_id)` 换来该用户的企业 token，塞进容器的 `JZFZ_TOKEN` 环境变量。含义是——**沙箱里跑的任何代码 = 该用户的身份**。skill 里的脚本可以直接调内部 API，天然带着主人权限。这是有意为之（不然 skill 干不了活），但也意味着沙箱隔离挡不住"以该用户身份做事"，只挡得住"碰别人的文件"。

**3. DNS 指向内网**（backend.py:38）：默认 `192.168.0.50, 192.168.0.22`，搜索域 `jzfz.local`——沙箱里的代码要能解析企业内网域名去调内部服务。

---

# 六、工作区三级路径映射（最"有意思"的部分）

```
宿主机:      {WORKSPACE_HOST_ROOT}/{user_id}/{graph_id}/{thread_id}/
                       │ docker-compose 挂载              ╲ docker create -v
                       ▼                                    ╲
主容器:      /workspaces/{user_id}/{graph_id}/{thread_id}/    ╲
                                                            ▼
沙箱容器:                                              /workspace/
```

为什么一个目录要有三个名字？**因为 `-v` 参数是宿主机 Daemon 解析的，而发出命令的进程在主容器里**。主容器眼里的 `/workspaces/...`，Daemon 根本不认识——它只认自己文件系统上的真实路径。所以 `get_workspace_host_path()`（config.py:1122）专门算宿主机路径给 `-v` 用，代码里那段大注释（backend.py:152-155）就是踩过这个坑的墓碑。

两级消费者各取所需：

- **沙箱容器**把 thread 目录挂成 `/workspace`（也是 workdir）——agent 的 shell 里 `ls` 看到的就是自己会话的目录。
- **主容器**通过 compose 的 `/d/workspaces/:/workspaces/` 挂载**看到同一批文件**——所以 `SandboxFileAssetMiddleware`（graph.py:203）可以在沙箱外直接把 agent 生成的文件读出来上传成 Asset 给前端展示，不用走 docker exec 搬运。

隔离粒度是 **user / graph / thread 三级目录**：不同用户、不同 agent、不同会话彼此不可见。而**数据的生命周期与容器解耦**——容器被清理掉了，宿主机上的目录还在，下次同 thread 重建容器，文件原样回来。

除工作区外还有第二个挂载：**skill 视图**。`/data/skills_views/{user}/{graph}` 是按该用户权限**过滤后**的 skill 目录快照，挂进沙箱的 `/data/skills/{graph_id}`；assistant 模式还有绕过用户权限的独立视图变体（backend.py:171-196）。加上镜像里预装的 `pymilvus`，可以推断 skill 的典型形态是：在沙箱里跑 Python，检索 Milvus 向量库、处理文档、调内部 API。

---

# 七、生命周期：不建库，直接读 Docker 元数据；双 TTL

`cleanup.py` 的聪明之处是**零额外存储**——不记"哪个容器最后什么时候用过"，直接用 Docker inspect 自带的两个时间戳：

- `Created`：创建时间，永不变
- `State.StartedAt`：最近一次启动时间

后台 daemon 线程每 12 小时扫一遍**带 `aegra.thread_id` label 的容器**（只扫自己的，不误伤宿主机上其他容器），执行两条规则（docker_sandbox.py:49-52）：

| 规则 | 阈值 | 动作 | 语义 |
|---|---|---|---|
| `max_created_age` | 7 天 | `docker rm -f` 硬删 | 会话一周没动静，彻底回收 |
| `max_running_age` | 24 小时 | `docker stop` 只停 | 一天没用，省资源，但保留现场 |

**"停"和"删"分开**是对资源与体验的精细权衡：停掉的容器不占 CPU/内存，但配合 `_ensure_container_alive()` 的自愈，用户第二天回来继续聊，容器悄悄 start，一切如旧。删才是终局，而删掉的也只是容器——工作区文件在宿主机目录里，不在此列。

另外 `LABEL_LAST_USED`（constants.py:8）虽然定义了，但当前清理逻辑用的是 Docker 原生时间戳，这个 label 是预留。

---

# 八、镜像：一把预装好的瑞士军刀

`Dockerfile.sandbox`，基座 `python:3.12-slim-bookworm`：

- **Node 24 + corepack**（NodeSource 源）：跑前端构建/npm 工具链
- **Playwright + Chromium**：浏览器自动化/网页抓取——agent 能真开浏览器干活
- **数据栈**：numpy/pandas
- **文档处理全家桶**：pymupdf(PDF)/python-pptx/python-docx/openpyxl——对应投标、公文类 skill
- **pymilvus**：Milvus 客户端，向量检索
- 全部走阿里云镜像源（内网环境拉包快）

注意两层镜像的关系：`constants.py` 的 `DEFAULT_IMAGE=python:3.11-slim` 只是**协议兜底**（保证有 python3 能跑 BaseSandbox 的默认实现）；生产实际用 `SANDBOX_DOCKER_IMAGE` 指向这个自建镜像（`build-sandbox.ps1` 负责构建推送）。

---

# 九、串起来：一次会话的完整时序

```
用户发消息
 → graph.py get_graph(config) → create_deep_agent(backend=factory)
 → agent 决定用 shell 工具
 → factory(runtime)：从 configurable 挖出 thread/user/graph_id
     命中 cache？→ 复用 DockerSandbox
     未命中 → ensure_workspace_dir 建目录、算宿主机路径、注入 token、
              构造带 labels/volumes 的 DockerSandbox，入 cache
 → execute("python3 analyze.py")
 → _ensure_container_alive：
     首次 → docker create(...sleep infinity) + start
     之后 → inspect，不活着就 start
 → docker exec sh -lc "python3 analyze.py"（默认超时 300s）
 → stdout+stderr 返回给 LLM，LLM 继续推理
 → 产出文件落在 /workspace = 宿主机 thread 目录
 → SandboxFileAssetMiddleware 从主容器 /workspaces/... 直接读文件 → 传 Asset → 前端展示
 → 会话冷却：24h 后被 stop（下次自愈），7 天后 rm（终局）
```

---

# 十、安全边界：它挡什么，不挡什么

这套设计定位是**企业内网的多租户"防误伤"隔离，不是对抗恶意代码的强隔离**。

挡住了：
- 文件互踩（bind mount 限定到 thread 目录）
- 资源失控（`--cpus 1 --memory 512m`、exec 超时 300s）
- 环境污染（依赖全在镜像里，会话级容器）
- 僵尸容器堆积（label 过滤 + 双 TTL）

没挡住（也值得知道）：
- **docker.sock 本身 = 宿主机 root**。主容器能命令 Daemon，被攻破即宿主机被攻破；沙箱容器理论上也可通过挂载点逃逸（本方案的 sock 只挂给了主容器和 traefik，没挂给沙箱，这点是对的）。
- 沙箱容器**以 root 跑**（镜像 `ENV PATH=/root/.local/bin`），没有 `--cap-drop`、`--read-only` rootfs、`--network none`、pids 限制；网络是默认 bridge，能出外网。
- `JZFZ_TOKEN` 注入后，沙箱内代码 = 用户身份，防不了"以自己身份"调用内部 API。

在内网 + 用户登录 + 内部服务自带鉴权的前提下，这个取舍是合理的——用最小的运维复杂度（一个 sock 挂载 + CLI 调用，没有 K8s、没有 gVisor/Firecracker）换到了够用的隔离强度。

---

## 回顾你原笔记需要修正的两处

1. ❌"Docker SDK + docker.sock 挂载" → ✅ subprocess 调 **docker CLI**（`docker_utils.run_raw`），sock 只是 CLI 的通道；
2. ❌"DinD 变体" → ✅ **DooD**（兄弟容器共用宿主 Daemon），DinD 是容器内再跑一个 Daemon。

一个可以继续深挖的点：`SandboxFileAssetMiddleware` 和 skill 视图同步（`skills_sync.py`）是这条链路上两个还没展开的配套件，想看哪个说一声。

---

## 对话 2（切换教学模式）

**🧑‍🎓 学生：** 你这样说我看不懂，你从0开始讲解，我把当做小白，每次只讲解一个概念，如果我有问题我会问你，如果没有问题则继续讲解，你是老师，我是学生，你要教会我这些

**🧑‍🏫 老师：**

好，我们重新来。这次我当老师，你当学生，每次只讲**一个概念**，讲完停下来，你有问题就问，没问题我就继续下一个。

先给你整个课程的路线图，让你知道我们要走哪几步（现在不用看懂，走到哪步算哪步）：

> **课程路线**：① 为什么要沙箱 → ② 最笨的办法为什么不行 → ③ 用容器当沙箱 → ④ 三个角色的关系（docker.sock）→ ⑤ 容器怎么"活着" → ⑥ 一个接口撑起一切 → ⑦ 会话怎么对应容器 → ⑧ 文件放在哪 → ⑨ 容器的生老病死 → ⑩ 镜像里装了什么

---

## 第 1 课：为什么需要沙箱

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

> 沙箱 = agent 动手干活的地方，隔离、 disposable（用完可扔）、伤不到外面。

---

有问题吗？没问题的话，下一课我们讲：**最直接的办法是"直接在 AI 服务自己的电脑上执行命令"，为什么这条路走不通**——走不通的过程会帮你理解后面每一步设计。

---

## 对话 3

**🧑‍🎓 学生：** 没问题

**🧑‍🏫 老师：**

## 第 2 课：最笨的办法为什么不行

最直接的想法：AI 服务（这个项目里叫 aegra，主程序跑在一个容器里）收到"执行命令"的请求后，就直接在自己家里执行，比如用 Python 调 `subprocess.run("python3 分析脚本.py")`。

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

什么东西能一键提供这种环境？——容器。这就是下一课的内容：**怎么用容器当这个小房间**。

---

## 对话 4

**🧑‍🎓 学生：** 没问题

**🧑‍🏫 老师：**

## 第 3 课：用 Docker 容器当沙箱

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

这个项目用了一个经典小技巧，创建容器时的命令长这样（真实代码在 `docker_sandbox.py:263`，我简化了）：

```
docker create --name aegra-sandbox-会话ID ... 镜像名 sleep infinity
docker start 容器
```

注意最后那个 **`sleep infinity`**——它就是容器的主进程：一个"永远睡觉"的进程。它什么都不做，只负责**让房间保持通电**。

那活谁干？**`docker exec`**——每次 agent 要执行命令，就往这个活着的容器里"递一张纸条"：

```
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

没问题的话，下一课是个理解上的关键坎：**AI 服务自己也是跑在容器里的，那它怎么能"创建别的容器"？** 这就要讲 docker.sock 和三个角色的关系——这个搞懂了，后面路径映射的坑你就能秒懂。

---

## 对话 5

**🧑‍🎓 学生：** 那我这个容器用的是什么镜像呢？

**🧑‍🏫 老师：**

问得好，这个问题正好戳到一个设计点。答案分两层：**代码里的兜底默认值** 和 **实际生产用的镜像**。

## 1. 镜像是可配置的，代码里只留了个兜底

创建容器时用哪个镜像，来自环境变量 `SANDBOX_DOCKER_IMAGE`（`backend.py:49`）。运维不配的话，兜底是（`constants.py:3`）：

```python
DEFAULT_IMAGE = "python:3.11-slim"
```

为什么兜底偏偏是个 Python 镜像，不是 Ubuntu、Alpine？先埋个伏笔：**这套沙箱的文件操作（读文件、写文件、搜索）全都是靠往容器里递 Python 脚本执行的**（第 6 课展开），所以"容器里必须有 python3"是硬性依赖。python:3.11-slim 是满足这个依赖的最小选择。

## 2. 实际生产用的是自建的"瑞士军刀"镜像

光有 python3 只能跑跑脚本，干不了企业场景的活。所以项目根目录有个 `Dockerfile.sandbox`，专门构建生产镜像（`build-sandbox.ps1` 负责构建推送）。里面装的东西很能说明"他们想让 agent 干什么活"：

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

一个小检查，看你有没有抓住重点：**兜底镜像是 python:3.11-slim 而不是 ubuntu，这个"不是随便选的"背后的原因，你能复述个大概吗？**（就一句话的事）

答完或者直接说"继续"，我们就回到主线，讲第 4 课：**AI 服务自己也在容器里，它凭什么能创建别的容器？**

---

## 对话 6

**🧑‍🎓 学生：** 那这样的镜像岂不是很大？每个用户一对话，就创建这么一个大的容器，然后就在那里休眠是吧？

**🧑‍🏫 老师：**

这个问题问到点子上了——它包含一个**一半对一半错**的判断，拆开看特别有价值。

## 你说对的部分

镜像确实大。带 Chromium + Python 全家桶，这个镜像得有好几个 GB。

## 但有个关键误会：镜像大 ≠ 每个容器占几个 GB

Docker 的核心机制之一：**镜像在磁盘上只存一份，所有容器共享**。

打个比方：

> 镜像 = 教材（印一次，全校共用）
> 容器 = 每个学生自己的草稿本

100 个会话开 100 个容器，磁盘上**不是** 100 × 3GB，而是：**1 份共享镜像 + 100 个薄薄的"可写层"**。

什么是可写层？镜像是**只读**的（教材不许涂改），容器启动时 Docker 在镜像顶上垫一层可读写的薄层（overlay 文件系统）。agent 在容器里改文件、装包时，**copy-on-write** 生效：改到哪一层文件，就把那个文件从镜像复制到自己的可写层再改——没碰到的部分永远共用那份镜像。

所以真实的占用是：

| 你以为的成本 | 实际的成本 |
|---|---|
| 每容器 3GB 磁盘 | 一份共享镜像 + 每容器几 MB 级可写层 |
| 休眠也占着 512MB 内存 | **几乎不占** |

## "休眠"到底花多少钱

这里还有第二个误会，关于 `--memory 512m` 这个参数：它是**信用卡额度，不是预存款**。意思是"这个容器**最多**能用 512MB"，不是"启动就划走 512MB"。

一个 `sleep infinity` 的容器，运行时是什么？就是**一个睡觉的进程**。不占 CPU，内存几 MB，仅此而已。开 100 个休眠容器，宿主机压力大概相当于开了 100 个 `notepad`——完全无感。

（顺带说一句：agent 干活产生的主要文件其实也不堆在可写层里，而是放在宿主机一个专门目录、挂载进容器的——这是第 8 课的内容，到时候你会看到为什么这么设计。）

## 但你的直觉里有个真问题

"一直休眠"确实**不能不管**：

- 可写层会慢慢积累（临时装的包、改的配置）；
- 容器数量会无限增长（每天几百场对话，一年十几万个）；
- 就算单个容器开销小，Docker Daemon 管理一堆僵尸对象也是负担。

所以这个项目给容器设计了"生老病死"的规则——**超过 24 小时没人用就停掉，超过 7 天就删除**。这正是第 9 课的内容，你的直觉已经提前摸到那节课的门口了。

也正因为有这套回收机制兜底，"每场对话一个容器"这个有点奢侈的设计才敢用。

---

现在两件事确认一下：

1. 上节课留的检查题还没答：**兜底镜像为什么是 python:3.11-slim 而不是 ubuntu？**（一句话）
2. 答完我们进第 4 课：**AI 服务自己也在容器里，它凭什么能创建别的容器？**

---

---

## 对话 7

**🧑‍🎓 学生：** 保留真实名称，我们继续

因为主要是执行python文件

**🧑‍🏫 老师：**

先点评你的答案，再处理博客，然后继续上课。

**你的答案：对了一半。**"主要执行 python 文件"确实是结果，但不是因果链上锁死的那一环。真正的原因是：**沙箱自己的文件工具（读文件、写文件、搜索）全都是靠往容器里递 python 脚本来实现的**——就算某场对话用户只想跑 shell 命令、一行 Python 都不写，这些工具照样需要容器里有 `python3`。所以 python3 是沙箱**基础设施自身的硬依赖**，而 `python:3.11-slim` 是满足这个依赖的最小镜像。这个伏笔在第 6 课（execute() 协议）会完全展开。

先把博客改回真实名称，并把这节课追加进去：

🔧 **老师操作**：编辑博客三处恢复真实名称（jzfz-ai-agent、aegra-sandbox、源码路径），更新长期记忆。

博客已更新：真实名称恢复（jzfz-ai-agent、aegra-sandbox、源码路径），第 4 课已追加进去。上课——

---

## 第 4 课：docker.sock——主容器凭什么能创建别的容器

新问题来了。这个项目的主程序（aegra 应用）**自己也活在容器里**（docker-compose 部署，蓝绿两组容器）。而容器是什么？隔离的箱子——容器里默认看不到宿主机、看不到别的容器，更没有能力"生"出新容器。

那它凭什么创建沙箱？

### 背景知识：`docker` 命令的真相

很多人以为敲 `docker run` 是"docker 在干活"。其实 docker 是**客户端-服务端架构**，一次命令里有三个角色：

```
你敲的 docker CLI  ──►  /var/run/docker.sock  ──►  dockerd（Daemon）
     （传话筒）            （Unix socket 文件）      （真正的管家）
```

- **dockerd（Daemon，管家）**：真正干活的常驻进程，管理所有容器、镜像、网络、卷，跑在**宿主机**上；
- **docker CLI（传话筒）**：你敲的 `docker ps`、`docker run`，CLI 自己不创建任何东西，只是把请求**转发**给 daemon；
- **docker.sock**：两者之间的通信通道，宿主机上一个特殊文件。**谁能读写这个文件，谁就能对管家发号施令。**

### 怎么做：把 sock 挂进主容器

项目的 `docker-compose.yml` 里有一行关键挂载：

```yaml
volumes:
  - //var/run/docker.sock:/var/run/docker.sock   # 双斜杠是 Windows Docker 的写法
```

于是主容器里也出现了一个 `/var/run/docker.sock`，**通向宿主机的管家**。主程序用 subprocess 调 docker CLI（`docker_utils.py` 的 `run_raw`），CLI 默认连这个 sock——命令就到了宿主机 daemon 手里，由 daemon 在宿主机上创建沙箱容器。

### 本课核心：兄弟，不是父子

主容器"创建"沙箱容器，**不是容器里套容器**，而是"给管家写纸条，请管家在隔壁再开一间房"：

```
宿主机
 └─ Docker Daemon（管家）
     ├─ 主容器 jzfz-agent-blue（aegra 应用）◄── 握着 sock
     ├─ 沙箱容器 aegra-sandbox-会话A
     └─ 沙箱容器 aegra-sandbox-会话B
```

在 daemon 眼里，主容器和沙箱容器是**平级的兄弟**，谁也不包含谁。

**验证心智实验**：在主容器里执行 `docker ps`，你会看到宿主机上所有容器——**包括主容器自己**。这恰好证明它眼中的 docker 世界是宿主机的，不是它自己的。

术语一句话：业界管这叫 **DooD（Docker-out-of-Docker）**，区别于 **DinD**（在容器里再跑一个完整 daemon，需要 `--privileged`，又重又险）。

### 顺手澄清一个你可能正在犯嘀咕的点

第 2 课说"直接在主容器里 subprocess 执行命令会死得很惨"——那这个项目不也在 subprocess 吗？

是，但它 subprocess 的是 `docker exec ...`。这条命令走 **CLI → sock → daemon**，**最终在沙箱容器里执行**，不在主容器自己家。传话筒递纸条，纸条在别的房间被打开。

（再埋一粒种子：正因为沙箱容器是 daemon **在宿主机上**创建的，给它挂载目录时 `-v` 的路径必须是**宿主机路径**，不是主容器内路径——这就是你之前笔记里那个"路径映射坑"的根源，第 8 课展开。）

安全预告一句话：握着 docker.sock ≈ 宿主机 root。本方案只把 sock 给了主容器和 traefik（只读），没给沙箱——方向是对的，后面讲安全边界时展开。

---

检查题（比上节课的活一点）：

> **在主容器里执行 `docker ps`，能看到主容器自己。这个"反直觉"的现象，恰恰证明了什么？**

答完或直接说"继续"，下一课讲：**容器自愈**——管家把沙箱容器停了、甚至删了之后，用户毫无感知，对话接着聊。这是怎么做到的？看 `_ensure_container_alive()` 是怎么在每次执行前悄悄做体检的（这里还会顺带遇到一个真实的并发 bug 和它的修法）。

---

## 对话 8

**🧑‍🎓 学生：** subprocess 是什么

**🧑‍🏫 老师：**

好问题，这个词确实一直出现，值得停下来讲清楚。

## 插问 3：subprocess 是什么

**是什么**：Python 标准库里的一个模块，作用就一句话——**让 Python 程序去启动另一个程序（命令），等它跑完，把结果收回来**。

如果你熟悉 Java，它就等价于：

```java
Runtime.getRuntime().exec("docker ps")   // 或 ProcessBuilder
```

Python 里长这样：

```python
import subprocess

result = subprocess.run(["docker", "ps"], capture_output=True, text=True)

result.stdout      # 命令打印的内容（字符串）
result.stderr      # 报错内容
result.returncode  # 退出码：0 = 成功，非 0 = 失败
```

打个比方：你的 Python 程序是前台接待，`subprocess.run(...)` 就是"帮我叫个外面的师傅进来干活"——师傅（子进程）在系统里真刀真枪执行那条命令，干完了把**输出**和**退出码**交回给你，你的 Python 代码继续往下走。

**为什么这个词在这套沙箱里反复出现**，现在可以把前面几课串起来了：

- 第 2 课的"最笨办法"：aegra 用 `subprocess.run("python3 分析脚本.py")`，**在自己家**干活 → 三个死法；
- 实际做法：aegra 用 `subprocess.run(["docker", "exec", 容器, "sh", "-lc", 命令])` —— 还是 subprocess 叫人干活，但叫的是 **docker CLI 这个传话筒**，纸条经 sock 传给管家，最终在**沙箱容器**里打开。

同一个工具，**区别只在"命令最终落在哪执行"**。这就是为什么第 4 课结尾我要专门澄清那个"嘀咕点"。

项目里对 subprocess 还包了一层：`docker_utils.py` 的 `run_raw()`，干两件额外的事——**超时控制**（命令卡死就掐掉，返回退出码 124，模仿 Linux `timeout` 命令的惯例）和 **docker 路径查找**（某些线程环境里 PATH 不全，找不到 docker 命令，就去常见安装路径硬找）。

---

回到挂着的检查题：

> **在主容器里执行 `docker ps`，能看到主容器自己。这个"反直觉"的现象，恰恰证明了什么？**

---

## 对话 9

**🧑‍🎓 学生：** 恰恰说明了，所谓的沙箱，其实就是另起一个同级别的容器而已。

但是我有一点不明白，就是这个 yml文件，为什么配置了 这个sock，python 代码就能创建容器了呢？具体细节是什么

**🧑‍🏫 老师：**

先给检查题判分：**完全正确**。"沙箱就是另起一个同级容器"——`docker ps` 能看到自己，正是"我眼中的 docker 世界 = 宿主机管家眼中的世界"的铁证。这个心智模型你已经立住了。

你追问的这个点非常好——"挂了个文件就能创建容器"听起来确实像魔法。魔法背后是两层机制，我先在本机（WSL 里恰好有个真 Docker）做个实验让你眼见为实：

🔧 **老师操作**：在 WSL 里执行 `curl -s --unix-socket /var/run/docker.sock http://localhost/version | head -c 400`，真实输出：

```json
{"Platform":{"Name":""},"Version":"29.1.3","ApiVersion":"1.52","MinAPIVersion":"1.44","Os":"linux","Arch":"amd64","Components":[{"Name":"Engine","Version":"29.1.3","Details":{"ApiVersion":"1.52","Arch":"amd64","BuildTime":"2026-04-29T22:18:59.000000000+00:00","Experimental":"false","GitCommit":"29.1.3-0ubuntu3~22.04.2","GoVersion":"go1.24.4","KernelVersion":"6.6.87.2-microsoft-standard-WSL2","MinA
```

实验成功了——注意看这件事有多离谱：**我用的工具是 `curl`，它根本不认识 docker**，只是对着一个叫 `/var/run/docker.sock` 的文件说了句 HTTP，daemon 就把版本信息（Docker 29.1.3）老老实实吐回来了。

这个实验就是你要的"具体细节"的钥匙。往下讲。

---

## 插问 4：挂了个 sock 文件，Python 为什么就能创建容器？

魔法分三层拆开。

### 第一层：sock 文件根本不是"文件"，是门牌号

普通文件：内容存在磁盘上，你读它就是取数据。

socket 文件：**它没有内容**。它是文件系统里注册的一个"地址"，真正的通信端点活在**内核**里。有个进程（这里是 dockerd）对这个地址说"我在此监听"（listen），之后任何进程连接（connect）这个路径，内核就把双方接通，让他们对话：

```
普通文件   = 一张写满字的纸
socket 文件 = 墙上的门铃按钮（按钮本身是空的，按下去内核会接通屋里的人）
```

所以"读写这个文件"的真实含义是"和 daemon 通话"。

### 第二层：挂载做的事——把门牌号钉到容器墙上

docker-compose 里那行 `-v /var/run/docker.sock:/var/run/docker.sock` 是 bind mount：把宿主机这个文件**原样**映射进容器。

关键在于：socket 的本体（daemon 的监听端点）在宿主机内核里，文件路径只是地址。**挂载不需要把 daemon 搬进容器，只需要让容器里的进程"看得见这个地址"**。容器里的进程 connect 这个路径时，内核解析到的是同一个监听端点——门开在两堵墙上（宿主机一堵、容器一堵），背后是同一个房间（daemon）。

> 类比：管家办公室在宿主机，sock 是门上的收件口。挂载 = 在容器那面墙上也开一个口，**连的是同一个办公室**。

### 第三层：连上之后说什么？说的是 HTTP

这是最反直觉也最优雅的一层：**docker CLI 本质是个 HTTP 客户端，daemon 本质是个 HTTP 服务器**。只不过普通网站走 TCP 网络（`http://localhost:8080`），docker 默认走 Unix socket（`unix:///var/run/docker.sock`）。

你敲的每条命令都被 CLI 翻译成一个 HTTP 请求：

| 你敲的 | 实际发出的 |
|---|---|
| `docker ps` | `GET /containers/json` |
| `docker create ...` | `POST /containers/create`（JSON 参数） |
| `docker exec ...` | `POST /containers/{id}/exec` |

刚才的实验就是铁证：curl 只会 HTTP，照样能查 docker 版本。

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

所以你的问题"为什么 yml 配了 sock，Python 就能创建容器"的答案分三句话：

1. daemon 一直在宿主机监听这个 socket（这是它天生的行为）；
2. yml 的挂载让容器里这个路径**指向同一个内核端点**（这是内核机制）；
3. docker CLI 的默认配置就是连这个路径，连上后创建容器只是**发一个 HTTP 请求**。

一个补充小知识：CLI 连哪里是可配置的，环境变量 `DOCKER_HOST`（比如 `tcp://192.168.1.10:2375` 可以连远程 daemon）——sock 只是默认值。这也再次印证了第 4 课的安全提醒：**摸到 sock = 成为 daemon 的主人 = 宿主机 root**，因为 API 里什么都能干（比如创建一个挂载宿主机根目录的容器）。

---

博客已追加这一问（含 WSL 真实实验输出）：

🔧 **老师操作**：博客追加插问 4。

博客已追加（含 WSL 实测输出，环境已注明）。

---

到这里，你已经把整套沙箱最难的两块地基打完了：

- **沙箱 = 兄弟容器**（第 4 课）
- **sock = 门牌号，通信说的是 HTTP**（本问）

没问题的话，下一课进 **第 5 课：容器自愈**。场景是：清理程序半夜把一个 24 小时没人用的沙箱容器停了，第二天用户回来继续聊，agent 要执行命令——代码里既没报错、用户也没等半天，容器就"自己活了"。看 `_ensure_container_alive()` 是怎么在每次执行前悄悄做体检的（这里还会顺带遇到一个真实的并发 bug 和它的修法）。

---

## 对话 10

**🧑‍🎓 学生：** 你把我搞蒙了， 发 HTTP POST /containers/create（JSON），怎么又扯到HTTP去了？我有点乱了

**🧑‍🏫 老师：**

蒙是正常的，这里我得先认个错：**上一课我一句话里同时塞了"线路"和"语言"两个概念**，是我没讲干净。现在把它拆开，你马上就顺了。

## 关键澄清：HTTP 不是"上网"的专利

你对 HTTP 的印象来自唯一场景：浏览器访问网站。于是大脑里 HTTP = 网页、网站、浏览器。

但 HTTP 的本质只是一句话：**一种"说话的格式"（协议），规定了消息怎么写**。它长这样：

```
请求：  GET /xxx HTTP/1.1        ← 要干什么（方法 + 路径）
响应：  HTTP/1.1 200 OK          ← 成没成功（状态码）
        {"Version":"29.1.3"...}  ← 正文（数据）
```

这是一份**公文格式**：第一行写事由，中间写抬头，正文放数据。**至于这份公文走什么渠道递送——网线、WiFi、还是一根内部管道——HTTP 本身根本不管。**

## 把"说什么话"和"走什么线"分开

| 场景 | 说什么语言 | 走什么线路 |
|---|---|---|
| 浏览器访问网站 | HTTP | TCP 网络 |
| 手机 App 调后端接口 | HTTP | 4G / WiFi |
| **docker CLI ↔ dockerd** | **HTTP** | **Unix socket（那根内部管道）** |

docker 就是最后一行：**语言还是 HTTP，只是不走高架桥（网络），改走地下室管道（sock）**。格式一点没变。

## 为什么 docker 偏要说 HTTP

回想第 4 课：CLI 和 daemon 是**两个独立的程序、两个进程**。两个程序要对话，就必须事先约定一门共同语言。

- 自己发明一套格式？行，但解析、错误处理全要自己造轮子；
- 用现成的 HTTP？它天生适合"一问一答"（我问 `GET /containers/json`，你答一段 JSON），工具链遍地都是，还自带状态码。

所以 dockerd **内置了一个 HTTP 服务器**（只是不监听网络端口，只监听 sock），CLI 就是个 HTTP 客户端。`docker create` 翻译成 `POST /containers/create`，本质和你 in 浏览器填表单点"提交"是一模一样的事。

这也让那个 curl 实验彻底说通了：**curl 是个只会说 HTTP 的哑巴程序**，它连上管道说了一句 `GET /version`，daemon 立刻听懂——因为 daemon 蹲在管道那头等的就是 HTTP。

## 重新捋链条，这次每层标注身份

```
Python 代码
  └─ subprocess.run(["docker",...])   ← 【叫人】启动 CLI 这个程序
       └─ docker CLI                  ← 身份：HTTP 客户端
            └─ connect(sock)          ← 【线路】内部管道
                 └─ "POST /containers/create"  ← 【语言】HTTP 公文
                      └─ dockerd      ← 身份：HTTP 服务器
                                        听懂公文 → 创建容器 → 回一份公文
```

三层各司其职：**subprocess 管"叫人"，sock 管"线路"，HTTP 管"语言"**。你乱，就是因为上次我把线路和语言混在一句话里说了。

---

检查题（一句话答完）：

> **docker CLI 和 dockerd 之间，说的是什么话？走的是什么线？**

我同时把漏记的上一问（subprocess）和这一问补进博客：

🔧 **老师操作**：博客补记插问 3（subprocess）与插问 5（HTTP 疑惑）。

博客已补齐：插问 3（subprocess）和插问 5（HTTP 疑惑）都追加好了，对话实录现在是完整的。

等你一句话回答检查题：

> **docker CLI 和 dockerd 之间，说的是什么话？走的是什么线？**

---

---

## 对话 11

**🧑‍🎓 学生：** 那你给我一个例子，，比如需要创建一个容器了，究竟是是一个怎样完整的过程，给我每个细节都要说清楚，另外，cli是客户单，dockerd，docker docker daemon 又是什么关系，好懵逼

**🧑‍🏫 老师：**

这个要求提得太对了——名词先捋清，然后我带你看一次**真实发生**的完整过程（我在这台机器的 WSL Docker 上现场演示，不是纸上谈兵）。

先看本地有什么镜像可用：

🔧 **老师操作**：`docker images`，真实输出（节选）：

```
lab-ep:1.0
lab-web:1.0
...
python:3.12-slim
...
nginx:latest
rabbitmq:4.3-management
...
alpine:latest
busybox:latest
alpine:3.20
alpine:3.21
rabbitmq:3.13-management
```

`alpine:latest` 在。现在做两个实验：**实验 A** 用纯 HTTP（curl）创建一个容器；**实验 B** 走正常 `docker` 命令的完整流程。

🔧 **实验 A**（curl 通过 sock 直接创建容器）真实输出：

```
{"Id":"e459d9017e9893a03afb4ce1036497f58153cbe7a6d5d8be6cce0d382516404e","Warnings":[]}
--- 用 docker ps 验证它真的存在了 ---
NAMES              IMAGE     STATUS
lesson-http-demo   alpine    Created
```

🔧 **实验 B**（正常 CLI 流程）真实输出：

```
0e6392d1afcd47b156e2924b51a2c31c7bf74367c077e9807a3961aaf5e70086
--- 刚 create 完，状态是 Created（还没启动）---
NAMES             STATUS
lesson-cli-demo   Created
lesson-cli-demo
--- start 之后，状态变 Up，休眠中 ---
NAMES             STATUS
lesson-cli-demo   Up Less than a second
--- 往里面递纸条（exec）---
我在容器里，主机名是 0e6392d1afcd
```

两个实验都成功了，而且实验 A 就是你上一个困惑的终极证据：**curl 这个"只会 HTTP 的哑巴"发了一个 POST，容器就真的创建出来了**（`docker ps` 里躺着呢）。清理现场，然后开始正式讲解：

🔧 **老师操作**：`docker rm -f lesson-http-demo lesson-cli-demo`。

现场已清理。下面是完整的一课。

---

## 插问 6：创建一个容器的完整过程（每个细节）

### 先做大扫除：把你懵住的名词一次捋清

你的懵点核心在这里：**dockerd 和 Docker daemon 根本是同一个东西**，我换着叫，你以为有两个角色。

| 名字 | 是什么 |
|---|---|
| `dockerd` | 进程/程序的本名（**d** = daemon），跑在宿主机上的常驻进程 |
| **Docker daemon** | 上面这个进程的**职称**。"dockerd 是它的名字，daemon 是它的岗位" |
| `docker`（你敲的命令） | CLI 客户端程序，只负责传话 |
| Docker（广义） | 整套技术的统称，泛指时用 |

餐厅类比最终版，之后所有角色都对号入座：

```
顾客（你 / Python 代码）
   │ "来一份 容器"
   ▼
点餐前台（docker CLI）── 把人话翻译成标准订单
   │ 订单从窗口塞进去
   ▼
递菜窗口（/var/run/docker.sock）
   │
   ▼
后厨（dockerd = Docker daemon）── 真正做菜
   └─ 菜（容器）做好放在出菜口
```

**订单的格式 = HTTP。窗口 = sock。** 你上一问的疑惑在这里彻底解开：HTTP 不是"上网"，它只是订单单据的格式。

### 刚才两个实验说明了什么

**实验 A（curl 创建容器）**：curl 发了一段 JSON 出去，收到 `{"Id":"e459d9...","Warnings":[]}`，然后 `docker ps` 证明容器真存在了。**创建容器 = 发一个 HTTP 请求，没有魔法。**

**实验 B（正常流程）**：注意状态的变化——`docker create` 之后是 **Created**（料备好了、但没开机）；`docker start` 之后才是 **Up**（`sleep infinity` 进程跑起来了）；`docker exec` 递纸条进去，`hostname` 返回的正是容器 ID（容器的默认主机名就是自己 ID 的前 12 位，趣味冷知识）。

**create 和 start 是两步**——这是本课细节的地基，记住它。

### 正片：一次完整的"创建沙箱"过程

场景：用户对 aegra 说"帮我分析这个 Excel"。这是该会话**第一次**需要执行命令，沙箱还不存在。

---

**第 0 步（背景，早已发生）**
宿主机开机时，dockerd 被系统拉起，蹲在 `/var/run/docker.sock` 后面监听。aegra 主容器带着挂载进来的 sock 在跑。

**第 1 步：LLM 决定动手**
用户消息流经 LangGraph 图，LLM 思考后发出工具调用：`execute("python3 分析脚本.py")`。

**第 2 步：代码发现自己没有容器**
`DockerSandbox.execute()` 第一件事是 `_ensure_container_alive()` → 发现 `self._container_id` 是 `None`（这会话从没建过容器）→ 进入 `_ensure_container()`。

**第 3 步：拼 docker create 命令**
代码把配置拼成真实命令（概念全是学过的，此处落地）：

```bash
docker create --name aegra-sandbox-会话ID \
  -w /workspace \                          # 工作目录
  --cpus 1 --memory 512m \                 # 资源"信用卡额度"（插问2）
  -e JZFZ_TOKEN=eyJhbGci... \              # 该用户的身份令牌（第7课细讲）
  --label aegra.thread_id=会话ID \          # 贴标签，清理程序认领用（第9课）
  -v /mnt/windows-workspaces/用户/agent/会话:/workspace \   # 注意是宿主机路径！（第8课）
  --dns 192.168.0.50 \
  自建瑞士军刀镜像 \
  sleep infinity                           # 主进程：睡觉保活（第3课）
```

**第 4 步：【叫人】subprocess 启动 CLI**
主容器里的 Python 进程 `subprocess.run([...])` fork 出一个子进程，执行 `docker` 这个程序（CLI 是个 Go 编译的二进制，主容器镜像里预装了它）。

**第 5 步：CLI 找线路**
CLI 启动后读配置：`DOCKER_HOST` 没设 → 默认 `unix:///var/run/docker.sock`。这个路径在主容器里存在（compose 挂的），指向宿主机内核里 dockerd 的监听端点（插问 4 的"两堵墙一个房间"）。

**第 6 步：CLI connect()**
CLI 进程对那个路径发起 connect，内核发现是 socket 文件，把线接通到 dockerd。**线路建立完毕。**

**第 7 步：【语言】CLI 说 HTTP**
CLI 把第 3 步那一长串命令行参数**翻译成一个大 JSON**，发出公文（就是实验 A 里我们亲手发的那种）：

```
POST /v1.52/containers/create HTTP/1.1
Content-Type: application/json

{"Image":"自建镜像","Cmd":["sleep","infinity"],"WorkingDir":"/workspace",
 "HostConfig":{"Memory":536870912,"NanoCpus":1000000000,"Binds":["/mnt/...:/workspace"],...}}
```

**第 8 步：dockerd（后厨）干活**
收到公文：检查镜像本地有没有 → 准备 rootfs（只读镜像层 + 薄可写层，插问 2 的 overlay）→ 登记隔离配置（namespace：独立的进程/网络/文件系统视野；cgroup：CPU/内存限额）。**注意：此时只是"备料 + 登记"，一个进程都还没跑**——对应实验 B 里看到的 `Created` 状态。

**第 9 步：容器 ID 沿原路返回**
dockerd 回公文：`{"Id":"e459d9..."}` → CLI 把它打印到 stdout → `subprocess` 把 stdout 装进 `CompletedProcess` 交回 Python → `DockerSandbox` 把它存进 `self._container_id`。

**第 10 步：start——真正开机**
Python 紧接着发 `docker start 容器ID`。**同样的第 4~7 步再来一遍**（subprocess → CLI → sock → HTTP `POST /containers/{id}/start`）。这次 dockerd 真正启动容器：fork 出主进程 `sleep infinity`，把它塞进第 8 步备好的隔离环境里。状态变 **Up**，房间通电。

**第 11 步：exec——递纸条，用户命令终于执行**
Python 发 `docker exec 容器 sh -lc "python3 分析脚本.py"`（又是一遍完整链条，`POST /containers/{id}/exec`）。dockerd 在容器的隔离环境里再 fork 一个 `sh` 进程跑这条命令，输出沿原路返回：

```
容器里的进程 → daemon → sock → CLI 的 stdout → Python 的 CompletedProcess → 交给 LLM → LLM 继续推理
```

---

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

---

检查题（一句话）：

> **`docker create` 和 `docker start` 各自干了什么？为什么这套设计里要拆成两步？**（提示：回想实验 B 里 Created 和 Up 的区别，以及第 3 课"房间通电"的比喻）

---

---

## 对话 12

**🧑‍🎓 学生：** 不是，你不要直接使用现有代码里面怎么做，你就当做我什么都不知道，你不能使用任何的代码，你可以把整个流程串起来完整，必要的时候，补充一些代码片段就行

**🧑‍🏫 老师：**

收到，这个批评很对——我一直在用项目里的类名和参数当主语，等于默认你 already know 那些东西。推倒重来：**忘掉项目、忘掉类名，从一张白纸开始**，讲一个纯粹的、任何人都能听懂的完整故事。

先把博客结构也调整一下（你的这个反馈本身就是宝贵的教学记录）：

🔧 **老师操作**：调整博客结构（通用版入正文、第一版降级为对照），更新长期记忆。

现在正式重讲。深呼吸，忘掉之前所有项目名词——我们从一个空白的世界开始。

---

# 一个容器是怎么诞生的（通用版，从零讲起）

## 你手上有什么

设定很简单：你自己要写一个程序，这个程序需要在**一个隔离的小环境**里执行一条命令。你听说 Docker 能干这事。

一台"装了 Docker"的机器，本质上是这三个东西：

1. **dockerd**——一个在后台**一直**运行的总管家进程（开机自启），机器上所有和容器有关的事都归它管；
2. **docker 命令**——一个传话工具。注意：它自己不管任何容器，纯粹是"帮你把话递给管家"的；
3. **/var/run/docker.sock**——管家留的服务窗口，一根"电话线"。

就这三个。下面所有故事都是它们之间的互动。

## 第 1 步：你的程序得先能"敲命令"

你的程序是个进程，它不能伸手去敲键盘。但任何语言都有"启动另一个程序"的能力，Python 里叫 subprocess：

```python
import subprocess

r = subprocess.run(["docker", "--version"], capture_output=True, text=True)
print(r.stdout)       # Docker version 29.1.3 ...
print(r.returncode)   # 0，表示成功
```

跑通这一行，你的程序就会"敲命令"了。

## 第 2 步：决定敲什么——create

想要一个容器，命令是：

```bash
docker create --name mybox --memory 512m alpine sleep infinity
```

人话翻译：**帮我登记一个名叫 mybox 的容器，用 alpine 镜像，内存上限 512MB，将来开机后跑的程序是 `sleep infinity`（一个永远睡觉的进程，作用只是让容器活着）。**

你敲下回车。**真正的故事从这一刻开始。**

## 第 3 步：docker 进程的一生（大约 0.1 秒）

1. 系统把 docker 这个程序文件加载成内存里的一个**进程**。这是个短命鬼——它活着的目的只有一个：把这条命令送进后厨、拿到回执、然后去死。
2. 它出生后先解决一个问题：**管家在哪？** 读环境变量 `DOCKER_HOST`——没设，那就用默认地址：本机的 `/var/run/docker.sock`。
3. 它去"打开"这个路径。内核一看：这不是普通文件，是**电话线**（Unix socket），另一头接着 dockerd。接通。
4. 它把你敲的参数打包成一份**公文**发过去，长这样：

```
POST /v1.44/containers/create HTTP/1.1
Content-Type: application/json

{
  "Image": "alpine",
  "Cmd": ["sleep", "infinity"],
  "HostConfig": { "Memory": 536870912 }
}
```

对，这个公文格式就是 HTTP——**它只是公文的标准写法，跟"上网"没有必然关系**（前面的 curl 实验证明过：只会 HTTP 的 curl 照样能发这种公文）。

## 第 4 步：管家收到公文，开始备料（核心）

dockerd 展开公文，做四件事：

**a. 找镜像。** 公文点名要 alpine。本地没有？去 Docker Hub（公共仓库，类似应用商店）下载一份。**镜像是啥？一个打包好的、只读的完整目录**——里面装着 alpine Linux 的全部系统文件。你可以把它理解成一张"安装盘"。只下载一次，之后所有容器共用这张盘。

**b. 叠出容器的"硬盘"。** 管家用 overlay 技术：把**只读的镜像层垫底**，上面**盖一个空的可写层**。两层叠在一起，就是容器将来眼里的"硬盘"——读文件读到的是底下的镜像内容，写文件写进上面那层。（这就是插问 2 讲的"教材 + 草稿本"。）

**c. 登记。** 在本子上记三笔：
- 给容器编个 64 位十六进制的唯一编号（`e459d9017e98...`，实验里见过它）；
- 内存最多 512MB——将来用 **cgroup** 这套内核机制强制执行；
- 它要有独立视野——将来用 **namespace** 这套内核机制实现：独立的进程表、独立的网络、独立的一切视野，在里面看不见宿主机、也看不见别的容器。

**d. 到此打住！** 注意这一刻的状态：硬盘备好了、本子登记好了，但**一个进程都还没跑**。容器处于 **Created** 状态——一个备好家具、但**没通电**的房间。

然后管家回一封公文：`{"Id": "e459d9017e98...", "Warnings": []}`。

## 第 5 步：回执到你手上

docker 进程把回执里的 Id 打印到屏幕（stdout），然后**退出**——传话任务完成，它死了，总共活了 0.1 秒。

你的 Python 这边，subprocess 把 stdout 收进 `r.stdout`。你的程序现在知道容器号了。

> **一个很多人从没意识到的事实**：你每敲一条 docker 命令，都是一个全新的短命进程在替你跑腿。机器上长期活着的只有两位——**dockerd（一直在）和容器里的进程（开机之后）**。

## 第 6 步：开机——start

Created 只是备了料的房间，还没通电。于是第二条命令：

```python
r = subprocess.run(["docker", "start", "mybox"], capture_output=True, text=True)
```

老规矩，又一轮跑腿：docker 进程出生 → 接电话线 → 发公文（`POST /containers/{id}/start`）→ 死。

管家这次干的活：**创建一个真正的进程，让它跑 `sleep infinity`，并把它塞进第 4 步备好的隔离环境里**——这个进程看到的"硬盘"就是叠好的那两层，能吃的内存受 512MB 管着，视野里只有它自己。

从此这个进程在后台睡觉。容器状态变 **Up**。

> **容器 = 一个被隔离措施包裹着的、正在运行的进程（外加它的配套）**。剥到最里面，没有更神秘的东西了。

## 第 7 步：干活——exec，闭环完成

房间通电了，现在递纸条：

```python
r = subprocess.run(
    ["docker", "exec", "mybox", "sh", "-lc", "python3 分析脚本.py"],
    capture_output=True, text=True,
)
print(r.stdout)   # 命令的输出！
```

还是同一套跑腿（公文是 `POST /containers/{id}/exec`）。管家收到后：**在 mybox 的隔离环境里再创建一个 sh 进程**，让它执行你的命令。

命令打印的东西沿原路返回：

```
sh 进程的输出 → dockerd 收 → 电话线写回 → docker 进程打到 stdout → subprocess 捕获 → 你的程序拿到字符串
```

**闭环完成：你的程序在隔离环境里执行了一条命令，拿到了输出。**

## 全程时间线

```
你的程序         docker进程(短命)      sock(线)       dockerd(常驻)         容器
   │  subprocess      │                   │                │                   │
   ├────────────────► │ 出生               │                │                   │
   │                  ├──────────────────►│───────────────►│ POST create       │
   │                  │                   │                │ 找镜像/叠硬盘/登记 │
   │                  │◄──────────────────┼────────────────┤ 回执 {Id}         │
   │  r.stdout = Id   │ 死                 │                │                   │
   │                                                                          │
   │  subprocess(start) ……同样一轮……          │                │ fork sleep infinity ─► Up
   │                                                                          │
   │  subprocess(exec)  ……同样一轮……          │                │ fork sh ────────────► 跑命令
   │  r.stdout = 输出                                            输出回流 ◄─────┘
```

## 和真实项目的关系（一句话衔接）

真实项目做的事，**就是把上面这套通用流程"参数化"**：create 时换成自己的镜像、自己的内存限额、挂上宿主机目录（第 8 课伏笔）、主进程用 sleep infinity（第 3 课）；并且在每次 exec 之前加一步"体检"——容器还活着吗？不活着就先救活。这个"体检"就是下一课的内容。**骨架和你刚读的完全一样。**

---

检查题（考的就是这节课最容易被忽略的细节）：

> **docker 命令这个进程，在一条命令执行完之后还活着吗？机器上长期活着的都有谁？**

---

## 对话 13

**🧑‍🎓 学生：** 所以我的理解是，每次开启一个对话，都会根据这个会话创建一个Id，然后开启一个独有的容器，这个容器就原地待命，睡眠，后续需要操作的时候，就启动这个容器重新做一点事情？

**🧑‍🏫 老师：**

先补上一题的答案（两行）：**docker 命令那个进程，命令一执行完就退出了**（它只是跑腿的）；机器上长期活着的只有两位——**dockerd** 和**容器里的进程**。

再来判你的复述——**90 分，主干全对**。逐条看：

- ✅ 每场对话一个专属容器
- ✅ 容器原地待命、睡觉（sleep infinity）
- ⚠️ 但有两处要精修：

**精修 ①（小误差）：不是"开启对话就创建容器"。** 对话开始时不创建，**第一次需要执行命令时才创建**（懒加载）。如果用户只是纯聊天、从不用到代码执行，沙箱根本不会开——省资源。

**精修 ②（关键误差）："后续需要操作的时候，就启动这个容器"——不对。** 容器从创建那一刻起就一直是**运行中（Up）**的状态，后续操作**直接 exec 递纸条就行，不需要任何"启动"动作**。

那"重新启动"什么时候才会发生？——只有当容器**被停过**的时候。谁会停它？你自己在插问 2 里的直觉已经回答了：**清理程序会停掉 24 小时没动静的容器**。于是真正的问题变成了：

> 清理程序半夜把容器停了，第二天用户回来说"接着昨天的分析"——怎么让这一切**对用户完全无感**？

这就是第 5 课。上课——

---

## 第 5 课：容器自愈

### 现实会给你三记耳光

你的沙箱系统跑起来几个月后，必然遇到：

1. **容器停了**——机器重启过、进程崩过、或清理程序把 24 小时没动的容器停了；
2. **容器没了**——更狠的清理规则：7 天没动的直接删；
3. **你自己的程序重启了**——内存里"我建过哪些容器"的记录清零了，可容器还在宿主机上跑着。

用户不管这些，他只会说"接着昨天的"。你的代码必须自己扛住。

### 通用解法：每次干活前，先体检

思路朴素到不能再朴素——**递纸条（exec）之前，先问管家一句：这容器还好吗？**

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

换成你已经熟悉的命令视角，体检就是 `docker inspect 容器`（问管家：它什么状态？），自愈就是再发一次 `docker start`、或把第 6 步的 create+start 重走一遍。

### 凭什么"重建"也不可怕？——文件根本不住在容器里

这是本课的隐藏主角。回想 create 时挂的那个参数：

```
-v 宿主机的某个目录 : 容器内的 /workspace
```

bind mount 的含义：**容器里往 `/workspace` 写的每个文件，实际落在了宿主机的那个目录里**。

> 容器 = 工作台（可以扔、可以换）
> 宿主机目录 = 仓库（东西真正存放的地方）

所以容器被删了、重建了，只是**换了张工作台**——新工作台开机时把仓库再挂一遍，所有文件原样回来。用户看到的景象：接着昨天的聊，文件都在，毫无异样。（会丢的只有容器里临时装的包这类"工作台上的划痕"，通常可接受。）

**体检 + 文件外置 = 用户无感的全部秘密。**前者保证"总有容器可用"，后者保证"容器换了东西也在"。

### 对照真实项目

项目里这个函数叫 `_ensure_container_alive()`（`docker_sandbox.py:288`），每次 execute/read/upload/download 前都先走它——就是上面那三分支。另外两个工程细节，知道有这回事即可：

- **加锁**：两条消息同时到达、同时发现"容器没了"、同时去重建，会打架（一个真实修过的 bug：并发下容器 ID 被清空，另一个线程拿着空值去 start 直接报错）。解法是一把锁，同一时刻只许一个线程做"体检+重建"；
- **按名找回**：主程序重启后内存记录清零，但容器名是用会话 ID 拼的（`aegra-sandbox-{会话ID}`），按名字 inspect 就能找回来接着用，还能顺便校验标签防止拿错别人的。

---

检查题：

> **容器被整个删除后重建，用户却感觉"文件都还在"。请用本课的两个角色（工作台/仓库）+ 一个机制（bind mount）说出原因。**

博客追加：

🔧 **老师操作**：博客追加第 5 课，更新记忆。

第 5 课已追加进博客（含你那段 90 分复述的判分记录——这种"理解的修正过程"是实录里最值钱的部分）。

检查题等你：

> **容器被整个删除后重建，用户却感觉"文件都还在"。用本课的两个角色（工作台/仓库）+ 一个机制（bind mount）说出原因。**

---

---

## 对话 14

**🧑‍🎓 学生：** 因为我们在容器中的工作台，其实是和宿主机的一个目录进行绑定在一起了（bind）
所以我们在容器中的所有操作的文件，其实都是存放在宿主机上面的一个目录，所以，即使容器被移除了，主要数据还在，那么内容都在

**🧑‍🏫 老师：**

**满分。**三个要素全齐：bind mount 机制（"绑定在一起"）、数据真实落点（"实际存放在宿主机目录"）、结论（容器可扔、数据还在）。这道题你答得比我预期的还干净。

顺带说：你刚才这段话已经把**第 8 课（路径映射）的一半**提前学会了——剩下的一半只是"宿主机那个目录到底怎么组织"，水到渠成的事。

上课前先做个现场实验（这课必须眼见为实）。我用本地的 `python:3.12-slim` 镜像起一个容器，往里写个文件，然后**不用任何 docker 的文件拷贝命令**，纯用"递脚本"的方式把文件读出来：

🔧 **老师操作**：起容器 lesson-file、写入三行文件、用"递 Python 脚本 + stdin 传参"读它。真实输出：

```
=== 文件已写入容器，现在用 递Python脚本+stdin 的方式读它 ===
     1	line one: hello
     2	line two: world
```

实验成功。注意看：我没用任何"docker 拷文件"的命令——**读文件这件事，被我用"递一段脚本进去执行"完成了**。这就是第 6 课的全部秘密，现在正式讲。

---

## 第 6 课：一个接口撑起一切

### 问题驱动：agent 要的远不止"执行命令"

回想第 1 课：agent 的工具箱里有一大堆文件工具——read_file（读）、write_file（写）、ls（列目录）、grep（搜内容）、edit（改文件）。

如果每个工具都单独修一条"主程序 → 容器"的通道（拷贝文件的通道、列目录的通道、搜索的通道……），就得维护 N 套机制，每套都有自己的坑。**能不能偷个懒？**

### 关键洞察：文件操作，本质上都是"执行一条命令"

停下来想 5 秒钟：

- "读文件" = 执行一段**把文件内容打印出来的脚本**
- "写文件" = 执行一段**把内容写进文件的脚本**
- "列目录" = 执行一段**遍历目录打印名字的脚本**
- "搜内容" = 执行一段**逐行找匹配的脚本**

而"在容器里执行一段脚本"——就是你从第 3 课学到现在的 **exec**！一个通道都不用多修。

刚才的实验就是这个洞察的实物证明：`读文件` 被我翻译成了 `exec python3 -c "一段读文件脚本"`，输出就是带行号的文件内容（还支持了 offset/limit 分页——传 `limit:2` 就只出了 2 行）。

### 接口瘦身到极致

于是设计沙箱后端时，要求可以压到最低：

> **你只要会"执行命令"（execute），我就把整套文件工具全送给你。**

这就是 DeepAgents 框架 `BaseSandbox` 的设计：**`execute()` 是唯一必须实现的方法**；read/write/edit/grep/glob/ls 全部是建立在它之上的默认实现——每个实现就是一段写好的 Python 脚本模板，用时拼一条 `docker exec python3 -c "..."` 递进去。

两个漂亮的副产品：

1. **换后端零成本**：SSH 到远程机器？本地子进程？云上的沙箱？只要那个环境能执行命令，实现一个 `execute()`，整套文件工具立刻能用；
2. **回收伏笔 ①**（插问 1 留的）：为什么兜底镜像必须是 python 镜像？——因为 read/write/grep 的默认实现全是 **Python 脚本**，容器里没有 python3 这些工具就全瘫。python3 是沙箱**基础设施自身的硬依赖**，跟用户跑不跑 Python 无关。

### 但有个新问题：参数怎么递进去？

脚本要知道"读哪个文件、从第几行读"。最直觉的做法是拼进命令字符串：

```bash
docker exec 容器 python3 read.py "/tmp/demo.txt"   # ← 看起来可行？
```

两个坑：

1. **转义地狱**：路径里带引号/空格/特殊字符怎么办？用户写的内容里什么都有，拼进命令行就是给 shell 注入开大门；
2. **长度上限**：操作系统对一条命令的参数总长有上限（ARG_MAX，一般 2MB 左右），写大文件时直接炸。

解法就是实验里那套：**内容不走命令行，走 stdin**：

```
参数打包成 JSON → base64 编码 → 从 stdin 喂给容器里的脚本 → 脚本从 stdin 读、解码、拿参数
```

为什么要 base64 那一下？JSON 里可能有引号、换行、任何字符，base64 把它们全部变成**安全字母**（A-Za-z0-9+/），传输途中谁也搞不坏它。这是"让任意内容安全穿过 shell"的标准手法。

stdin 这条路：**不经过 shell 解析（没有转义问题）、没有长度限制、内容原样到达**——三个坑一次全解。

### 对照真实项目

- `deepagents/backends/sandbox.py` 里的 `BaseSandbox`：execute() 唯一抽象方法 + 一堆脚本模板（和我实验里那段几乎是亲兄弟，连 `{行号:6d}\t{内容}` 的输出格式都一样）；
- 项目的 `DockerSandbox` 核心就实现了 execute()（外加 override 了 read() 修一个 heredoc 的坑，细节不展开，知道有这回事即可）。

### 伏笔回收清单

至此，前面埋的两粒种子都开花了：

| 伏笔 | 埋在哪 | 现在明白了吗 |
|---|---|---|
| 兜底镜像为什么是 python:3.11-slim | 插问 1 | ✅ 文件工具 = Python 脚本，python3 是硬依赖 |
| agent 的 read_file/write_file 工具是什么 | 第 1 课 | ✅ 底层全是 exec 递脚本 |

---

检查题（这题值得想一想再答）：

> **为什么脚本参数要走"stdin + base64"，而不是直接拼进命令行字符串？**（说出两个理由即可）

清理实验现场 + 追加博客：

🔧 **老师操作**：删除实验容器 lesson-file，博客追加第 6 课，更新记忆。

博客已追加第 6 课（含实验命令和真实输出），实验容器已清理。

等你答检查题：

> **为什么脚本参数要走"stdin + base64"，而不是直接拼进命令行字符串？**（两个理由即可）

答完进 **第 7 课：会话怎么对应容器**——第一个真正的"拼图课"：前面六颗珠子（容器、sock、exec、自愈、协议、镜像）将在这一课串成一条完整的项链。你会看到"用户张三打开了对话 A"这件小事，是怎么一步步变成一个带着正确名字、正确标签、正确目录、正确身份令牌的容器的。

---

（逐字实录重建中：对话 15 起待回填。）




