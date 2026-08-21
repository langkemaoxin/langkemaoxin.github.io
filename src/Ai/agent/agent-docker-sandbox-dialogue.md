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

---

## 对话 15

**🧑‍🎓 学生：** 看不懂你在说什么，你可以参考现有的代码是如何实现的，但是你在和我讲解的时候，不要认为我读过这些代码。

这个章节再给我解释一遍

**🧑‍🏫 老师：**

你说得对，这章我讲砸了——满嘴"接口""协议""抽象方法"，默认你知道一堆框架概念。重讲，这次从一个非常具体的困境出发，一行代码一行代码地说。

---

## 第 6 课（重讲版）：主程序怎么"看"到沙箱里的文件

### 困境

接前面的设定：agent（主程序，在主容器里）在干活，沙箱容器在宿主机上跑着。现在它遇到一个再普通不过的需求：

> 用户上传了 `data.csv`，agent 想看看里面写了什么，才能决定下一步怎么分析。

问题来了：**文件在沙箱容器里，主程序在主容器里——两个隔离的箱子，主程序根本"看不见"沙箱里的文件系统。**

摆在你面前两条路：

**路 A：专门修一条"取文件"的通道。** Docker 确实有拷贝文件的命令（`docker cp`），把文件从沙箱拷到主容器，读完再删。听着直接，但 agent 的需求不止"读"——还要写、列目录、搜索……每种都修一条专用通道？每条通道还各有各的坑。通道越修越多，系统越养越肥。

**路 B：用你唯一已有的通道——递纸条。** 从第 3 课起我们就有一条万能通道：`docker exec`（往沙箱递一条命令，命令的输出会传回来）。那么——

> **"读文件"能不能改写成一条命令？能：让它执行一段小程序——"打开 xx 文件，把内容打印出来"。** 打印出来的文本，会沿着你早已熟悉的回程路（容器 → dockerd → sock → docker 进程 → 主程序）送到主程序手上。

这就是全部秘密：**"看文件" = 递一张写着"帮我把文件内容打出来"的纸条。**

### 回顾刚才的实验，这次一行行拆

```
echo '{"path":"/tmp/demo.txt","offset":0,"limit":2}' | base64 -w0 | docker exec -i lesson-file python3 -c "<脚本>"
```

竖线 `|` 的意思是"把左边的输出，塞进右边的输入"。所以这是**三节管道**：

| 节 | 干什么 |
|---|---|
| `echo '{"path":...,"limit":2}'` | 写参数纸条：读哪个文件、跳过前几行、读几行（JSON 格式，键值一目了然） |
| `base64 -w0` | 把纸条转成"安全字母"（为什么？下面单讲） |
| `docker exec -i 容器 python3 -c "<脚本>"` | 纸条从管道流进容器（`-i` 就是"把 stdin 接进容器"），容器里的 python3 执行脚本 |

### 纸条上的脚本，逐行读

这段不是我编的——**真实项目源码里就是几乎一字不差的这一段**。每行都配了人话：

```python
import base64, json, sys

# ① 从 stdin 读入那张 base64 纸条 → 解码成 JSON 文本 → 解析成字典
d = json.loads(base64.b64decode(sys.stdin.read()))

# ② 打开参数指定的文件，读全文，按行切开
lines = open(d['path'], encoding='utf-8').read().splitlines()

# ③ 按 offset/limit 切片：跳过前 offset 行，取 limit 行
for i, line in enumerate(lines[d['offset']:d['offset']+d['limit']]):
    n = d['offset'] + i + 1        # 行号从 1 开始数
    print(f'{n:6d}\t{line}')        # 打印：行号 + tab + 内容
```

真实输出（文件一共 3 行，但 `limit:2`，所以只出 2 行——**连分页都顺便有了**）：

```
     1	line one: hello
     2	line two: world
```

这个输出打印到哪去了？沿着回程路，最终出现在主程序的 `r.stdout` 里。**主程序"看"到了文件——从头到尾它没碰过沙箱的文件系统，只是收到一段文本。**

### 举一反三：所有文件操作都是纸条

| agent 想做的 | 纸条上写什么 |
|---|---|
| 读文件 | "打开文件，打印内容"（上面这段） |
| 写文件 | "从 stdin 读内容，写进 xx 文件" |
| 列目录 | "遍历目录，打印每个名字" |
| 搜内容 | "逐行找包含 xx 的行，打印出来" |

所以主程序只需要会一件事：**递纸条**。所有文件操作，不过是换一张纸条的措辞。

### 补讲：参数为什么要先 base64 再进管道

直觉做法是直接拼进命令：`python3 xxx "/tmp/demo.txt"`。两个坑：

**坑 1：转义。** 假设文件名叫 `it's my "file".txt`（带引号、空格），拼进命令行后 shell 会把引号当成自己的语法符号，命令当场碎掉；恶意构造的内容甚至能拼出一条你没打算执行的命令（这就是"注入"）。base64 之后，任何内容都变成一串无害字母（`aXQncyBteSAiZmlsZS50eHQ=`），拼到哪都不会碎。

**坑 2：长度。** 操作系统规定一条命令的参数总长有上限（叫 ARG_MAX，约 2MB）。写大文件时内容拼在命令里直接超限报错；而走管道（stdin）**没有这个限制**。

### 对照真实项目（这次不装你读过代码）

项目用的 DeepAgents 框架里有个类，干的正是"把读/写/列/搜全都做成纸条模板"这件事。它定了一条规矩：**你想接一种新沙箱（比如 SSH 到远程机器、某个云沙箱），只需要实现"递纸条"这一个函数，所有纸条模板白送。**

项目里的 `DockerSandbox` 类，就是那个"会递纸条的实现"——递纸条的具体动作，就是你前几课学的 `docker exec`。

这也终于彻底回答了插问 1：**兜底镜像为什么必须是 python 镜像？** 因为所有纸条都是 Python 写的——容器里没有 python3，读文件写文件全瘫。python3 是沙箱自己的命根子，跟用户写不写 Python 无关。

---

重讲版检查题（换了个问法，就考这课的核心转变）：

> **主程序想看沙箱里的一个文件，它自己是"看不见"的（隔离）。可它最后还是拿到了文件内容——用你自己的话说说，这份内容是怎么到达它手上的？**

把重讲版记进博客（第一版留作对照，这个"讲砸又重讲"的过程本身就是实录的一部分）：

🔧 **老师操作**：博客重排（重讲版入正文、第一版降级为"附：留作对照"），更新长期记忆。

博客已更新：重讲版放在正文位置，第一版降级为"附：留作对照"——并且我在记忆里给自己记了一笔：**后面所有课直接用重讲版这种"具体困境 → 逐行拆"的风格，不再犯第 6 课的错**。

检查题等你（用自己的话，一两句就行）：

> **主程序想看沙箱里的一个文件，它自己是"看不见"的（隔离）。可它最后还是拿到了文件内容——这份内容是怎么到达它手上的？**

---

## 对话 16

**🧑‍🎓 学生：** 如果要想实现这个功能，总共需要几个文件，几个脚本？给我一个完整的代码】

**🧑‍🏫 老师：**

问得太好了——这是检验前六课有没有真懂的最佳方式。答案先给你：

> **2 个文件、0 个预装脚本。**（sandbox.py + demo.py；而"递进容器的那些纸条"不是文件，是嵌在代码里的字符串——这正是第 6 课的意义）

我们现在就把它写出来、跑起来。先创建文件：

🔧 **老师操作**：写入 `F:\code\Python\sandbox-lab\sandbox.py`（完整内容如下）：

```python
"""最小可用沙箱：把第 1-6 课的知识点拼成能跑的代码。

用法见 demo.py。依赖：本机能执行 docker 命令，本地有 python:3.12-slim 镜像。
"""
import base64
import json
import subprocess

IMAGE = "python:3.12-slim"   # 兜底镜像必须是 python（第 6 课：所有纸条都是 Python 写的）
WORKDIR = "/tmp"             # 真实项目是 /workspace，由挂载的宿主机目录自动产生（第 8 课）
CPU = "1"                    # 资源"信用卡额度"（插问 2）
MEM = "512m"
EXEC_TIMEOUT = 30            # 递进去的命令最多跑 30 秒，防死循环

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
        if rs.returncode != 0:                      # start 都失败 = 容器没了 → 重建
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

🔧 **老师操作**：写入 `F:\code\Python\sandbox-lab\demo.py`（完整内容如下）：

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

# 2. 第 6 课：读文件 = 递一张"读文件"纸条（limit=2 只取前 2 行）
out, code = sb.read_file("/tmp/analyze.py", limit=2)
print("[2] 读回前 2 行:")
print(out)

# 3. 第 3 课：执行命令 = 递纸条
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

两个文件写好了，现在真刀真枪跑一遍：

🔧 **老师操作**：WSL 里运行 `python3 demo.py`，真实输出：

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

**一次跑通，五个功能全部验证成功。**现在把整个东西给你讲清楚。

---

## 你问的答案：2 个文件，0 个脚本

```
F:\code\Python\sandbox-lab\
 ├─ sandbox.py   ← 沙箱本体（一个类，约 100 行）
 └─ demo.py      ← 演示：像 agent 一样用它（约 30 行）
```

**"0 个脚本"是重点**：递进容器执行的那些"纸条"（读文件脚本、写文件脚本）**不是磁盘上的文件**，是嵌在 sandbox.py 顶部的两个字符串常量（`_READ_SCRIPT`、`_WRITE_SCRIPT`）——用的时候拼进命令递进去，用完即弃。这就是第 6 课"纸条"的实体形态。

## 自己跑一遍（WSL + Docker）

```bash
cd /mnt/f/code/Python/sandbox-lab
python3 demo.py
```

## 刚才的真实输出，逐行对应知识点

```
[1] 写文件: OK | 退出码: 0                          ← 第 6 课：写文件 = 递"写文件纸条"
[2] 读回前 2 行:
     1	data = [3, 1, 4, 1, 5, 9, 2, 6]             ← 第 6 课：读文件纸条，limit=2 分页生效
     2	print('sum =', sum(data))
[3] 执行结果:
sum = 31                                            ← 第 3 课：exec 递纸条，真 Python 算的
avg = 3.875
[4] 容器已被手动停止，再次执行:
revived                                             ← 第 5 课：体检发现停了 → start 拉起 → 照常执行
analyze.py                                          ← 而且文件还在（容器只是停，没删）
[5] 容器已删除，演示结束                             ← destroy 清理现场
```

## sandbox.py 的代码地图（每个方法 = 你学过的一课）

| 代码位置 | 干什么 | 来自哪课 |
|---|---|---|
| `_run()` | subprocess 启动 docker CLI（短命跑腿进程） | 第 4 课【叫人】 |
| `_create()` | `docker create ... sleep infinity` + `start` | 第 3 课（睡觉保活）+ 第 4 课（备料/开机两步） |
| `_ensure_alive()` | inspect 体检 → 活着就过；停了就 start；没了就重建 | 第 5 课（自愈三分支） |
| `execute()` | `docker exec sh -lc 命令`，stdout+stderr 合并 | 第 3 课（递纸条） |
| `_READ_SCRIPT` / `_WRITE_SCRIPT` | 两段纸条脚本（字符串！） | 第 6 课 |
| `_pipe_script()` | JSON → base64 → stdin → 容器 python3 | 第 6 课（避转义/避 ARG_MAX） |
| `IMAGE = python:3.12-slim` | 兜底镜像必须是 python | 插问 1 |
| `--cpus 1 --memory 512m` | 资源"信用卡额度" | 插问 2 |
| `WORKDIR = "/tmp"` | 真实项目是 /workspace，由挂载目录自动产生 | 第 8 课（还没讲） |

## 和真实项目的差距（= 剩下的课程表）

这个 100 行的玩具离生产级还差的东西，**恰好就是接下来几课**：

| 缺什么 | 后果断 | 讲在哪 |
|---|---|---|
| 没挂载宿主机目录 | 容器一删文件就没了（demo 里 destroy 后 analyze.py 就消失了） | 第 8 课 |
| 没有清理程序 | 容器会无限堆积 | 第 9 课 |
| 没有锁 | 并发下体检/重建会打架 | 第 5 课提过 |
| 没有 token 注入、没有按用户分目录 | 多用户场景没法用 | 第 7、8 课 |
| 镜像是现成的 python，不是瑞士军刀 | 干不了文档/浏览器/检索的活 | 插问 1 |

也就是说：**你已经拥有了一个概念完整的沙箱，剩下的课都是在往这个骨架上钉零件。**

---

把实战记录追加进博客（完整代码 + 真实输出 + 代码地图）：

🔧 **老师操作**：博客追加实战记录，更新记忆。

博客已追加完整的实战记录（两个文件的完整代码 + 真实输出 + 代码地图）。

你电脑上现在有了一个自己拥有的沙箱：`F:\code\Python\sandbox-lab\`，随时可以改它、玩它、拆它。而且说实话——你刚才没答检查题，但直接要了完整代码还能看懂结构，这比答题更能证明第 6 课通了。

一个小实验留给你自己（5 分钟，选做）：

> 把 demo.py 第 4 步的 `docker stop` 改成 `docker rm -f`（模拟"容器被删"），再跑一遍，观察 `[4]` 的输出有什么不同——为什么这次 `analyze.py` 不见了？（提示：工作台 vs 仓库，第 5 课）

没问题说继续，进 **第 7 课：会话怎么对应容器**——现在的 `Sandbox(session_id="demo001")` 里那个 session_id 是我们手动传的，真实系统里"谁在传、什么时候传、传了之后怎么避免重复建容器"，就是下一课的全部内容。

---

---

## 对话 17

**🧑‍🎓 学生：** 不是，你写完了代码后，也想要我解释下都需要什么啊，另外，我们之间的对话，特别是我主动说的东西，都要记录下来

**🧑‍🏫 老师：**

两件事都对，我一件件补。先审计一下博客里你的发言记录情况：

🔧 **老师操作**：grep 博客中所有学生发言标记，结果：13 条 🧑‍🎓 发言（镜像、休眠、"因为主要是执行 python 文件"、subprocess、sock 细节、HTTP、create 全过程、"不要直接用现有代码"、90 分复述、满分答案、"看不懂"、完整代码……）。

审计结果：你的 13 条主动发言**都在**（上面 grep 的每一行）。真正漏记的是三类小东西：两句"没问题"、你说"保留真实名称"那条博客指令、以及你**正在说的这条反馈本身**。这暴露了一个真问题——我的记录标准是"记录有教学价值的发言"，而你要的是**完整对话实录**。标准从现在起改：你的每一句话都原文入册。

先补第一件事——**跑通这套代码到底需要什么**（这是我上次确实欠的账）：

---

## 插问 7：跑通这套代码，都需要准备什么？

### 需要的清单（就 4 样）

| # | 需要什么 | 为什么需要 | 我们机器上的情况 |
|---|---|---|---|
| 1 | **Docker**（能执行 docker 命令的环境） | sandbox.py 的每个动作，最终都是 subprocess 去调 docker CLI。没有它，一切免谈 | WSL 里有 |
| 2 | **Python 3.7+** 解释器 | 跑 sandbox.py / demo.py 本身 | WSL 里的 python3 |
| 3 | **python:3.12-slim 镜像** | 沙箱容器的"安装盘"。本地没有也行——docker create 会自动去 Docker Hub 拉（那一刻才需要网络） | 本地已有 |
| 4 | **那两个 .py 文件** | 沙箱本体 + 演示 | `F:\code\Python\sandbox-lab\` |

**一个容易忽略的零**：代码只用了 Python 标准库（`base64`、`json`、`subprocess`）——**零第三方依赖，不需要 pip install 任何东西**。这也是"纸条方案"的好处之一：主程序侧薄到几乎没有依赖。

### 关键选择：代码在哪跑？

`demo.py` 扮演的是**主程序**（真实项目里主容器的角色）。它自己不需要任何特权，**只需要能连上 docker**。所以有两种跑法：

- **WSL 里跑**（我们用的方式，因为 docker 在 WSL）：`python3 demo.py`
- **Windows 上跑也行**（前提是 Docker Desktop）：`python demo.py` 一样通——subprocess 会找到 `docker.exe`，命令完全相同

### 三层角色对照（和真实系统的对应关系）

```
跑 demo.py 的 python3     ←→  真实系统的主容器（指挥）
WSL 的 dockerd            ←→  宿主机管家
python:3.12-slim 容器     ←→  沙箱
```

### 复刻步骤（给别人/给未来的你）

```bash
docker version                 # ① 确认 docker 可用
docker pull python:3.12-slim   # ② （可选）提前拉镜像，避免首跑等待
cd sandbox-lab && python3 demo.py   # ③ 跑
```

---

现在把三处补记 + 本节写进博客，并把我该改的记录规则记进长期记忆：

🔧 **老师操作**：博客补记两句"没问题"与"保留真实名称"指令、追加插问 7；更新长期记忆（完整实录规则）。

全部补齐了。总结一下这次修正的三件事：

1. **环境清单**（上面正文 + 博客"插问 7"）：Docker、Python 3.7+、镜像、两个文件——外加"零第三方依赖"和"在哪跑"的说明。
2. **补记**：两句"没问题"、"保留真实名称"指令，都已按原文入册。
3. **规则固化**：博客定位从"有教学价值的摘录"升级为**完整对话实录**——你每一句话（包括打断、纠正、甚至"没问题"）都原文记录。这条规则也写进了我的长期记忆，以后每次开口前都会照此执行。

---

现在状态：随时可以进 **第 7 课：会话怎么对应容器**（从 `Sandbox(session_id="demo001")` 这个手动传参出发，讲真实系统里"谁在传、怎么缓存复用、怎么注入用户身份"）。

另外上次留的选做实验还挂着：把 demo.py 第 4 步的 `docker stop` 改成 `docker rm -f` 再跑，观察 `analyze.py` 为什么不见了。做了告诉我结果，没做也没关系，不阻塞下一课。

---

## 对话 18

**🧑‍🎓 学生：** 讲解一下这两个python文件代码

**🧑‍🏫 老师：**

好，这就是最好的复习——**逐段拆解，每段说清"是什么、为什么这么写、对应哪一课"**。你写过 Java，我会随手给 Java 对照。

---

## 插问 8：逐段讲解 sandbox.py 和 demo.py

### 两个文件的关系

```
sandbox.py = 工具库（一个类）
demo.py    = 使用者（像 Java 里的 main 测试类）
```

demo.py 第一行 `from sandbox import Sandbox`，等价于 Java 的 `import`。

---

# 一、sandbox.py

## ① 文件头：三个 import

```python
import base64      # 编码/解码（纸条"安全字母"化）
import json        # 参数打包/解析
import subprocess  # 第 4 课【叫人】：启动 docker CLI
```

全是 Python **自带**标准库——这就是"零第三方依赖"的实体：整个沙箱的主动作只靠这三样。

## ② 常量区（配置）

```python
IMAGE = "python:3.12-slim"   # 沙箱安装盘（插问 1：必须带 python3）
WORKDIR = "/tmp"             # 容器内工作目录（真实项目是 /workspace，第 8 课）
CPU = "1"                    # 信用卡额度（插问 2）
MEM = "512m"
EXEC_TIMEOUT = 30            # 命令最多跑 30 秒——agent 写出死循环时保命
```

相当于 Java 的 `static final` 常量。集中放顶部的好处：换镜像、改配额只动一行。

## ③ 两段"纸条脚本"（本文件最特殊的部分）

```python
_READ_SCRIPT = """
import base64, json, sys
d = json.loads(base64.b64decode(sys.stdin.read()))
...
"""
```

先建立一个**最重要的认知**：这段代码**不在你的机器上运行**。它是三引号字符串（Python 的多行字符串），作为**数据**被递进容器、由**容器里的 python3** 执行——第 6 课"纸条"的实体就是它。

`_READ_SCRIPT` 逐行（在容器里执行时）：

| 行 | 在干什么 |
|---|---|
| `d = json.loads(base64.b64decode(sys.stdin.read()))` | 三连：读管道喂进来的纸条 → base64 解码 → JSON 解析。得到的 `d` 是个字典（Java 的 Map），`d['path']` 取值 |
| `lines = open(d['path'], ...).read().splitlines()` | 打开目标文件，读全文，切成一行一行的列表 |
| `for i, line in enumerate(lines[切片])` | 按参数切片（跳过 offset 行、取 limit 行）遍历，同时拿到序号 |
| `print(f"{行号:6d}\t{行}")` | f-string 格式化（Java 的 `String.format`）：行号占 6 格右对齐 + tab + 内容。**print 出来的东西就是回程的"货物"** |
| `except FileNotFoundError: sys.exit(1)` | 文件不存在 → 打印错误 + 退出码 1（退出码是给主程序看的信号灯） |

`_WRITE_SCRIPT` 同理，多了一个 `os.makedirs(..., exist_ok=True)`（父目录不存在就顺手创建），最后 `print('OK')` 当回执。

## ④ Sandbox 类：字段和构造器

```python
def __init__(self, session_id: str):        # __init__ = Java 构造器
    self.session_id = session_id            # self = Java 的 this（Python 必须显式写）
    self.name = f"mylab-sandbox-{session_id}"   # 容器名 = 会话 ID（第 5 课：按名找回）
    self.container_id = None                # 关键！
```

`self.container_id = None` 是**懒加载的开关**：构造时**什么都不发生**——不建容器、不连 docker。第一次真正用到时才创建（第 5 课精修①）。`demo.py` 里 `sb = Sandbox("demo001")` 这行执行完，系统毫无动静。

顺带：方法名前的 `_`（如 `_run`、`_create`）是 Python 的**约定**——"这是内部方法，外部别调用"（Python 没有真正的 private，全靠自觉）。

## ⑤ `_run()`：所有 docker 命令的唯一出口

```python
def _run(self, cmd, input_bytes=None, timeout=None):
    return subprocess.run(
        cmd,                    # 注意：是列表，不是字符串！
        input=input_bytes,      # 往子进程 stdin 喂数据——纸条的入口
        capture_output=True,    # 把子进程的输出收进结果对象（不然直接打到屏幕）
        timeout=timeout,        # 超时掐掉
        check=False,            # 命令失败不抛异常，让我们自己看 returncode
    )
```

三个要点：

1. **cmd 是列表** `["docker", "create", "--name", ...]` 而不是拼好的长字符串——列表形式天然避免空格、引号歧义（Java 的 `ProcessBuilder` 也是传 List，同一个道理）；
2. **返回的 CompletedProcess** 里有 `.stdout` / `.stderr`（**bytes 类型**，所以后面到处要 `.decode()`）和 `.returncode`；
3. 所有 docker 调用都走这一个函数——以后想加日志、重试、计时，改这一处就够。

## ⑥ `_ensure_alive()`：体检 + 自愈（第 5 课三分支的代码化）

```python
if self.container_id is None:                # 分支 0：从没建过
    self._create()
    return

r = self._run(["docker", "inspect", "-f",
               "{{.State.Running}}", self.container_id])
if r.returncode == 0 and r.stdout.decode().strip() == "true":
    return                                   # 99% 的日常：活着，直接走

rs = self._run(["docker", "start", self.container_id])
if rs.returncode != 0:                       # start 都失败 = 容器没了
    self.container_id = None                 # 把 ID 清空
    self._create()                           # → 走"从没建过"的逻辑重建
```

两处细节：

- `docker inspect -f "{{.State.Running}}"`：`-f` 是格式化模板，让 inspect 只回答一个词：`true` 或 `false`（那个 `{{}}` 是 Docker 内置的 Go 模板语法，背下来即可）；
- `r.stdout.decode().strip() == "true"`：stdout 是 `b"true\n"` 这样的 bytes——decode 成字符串、strip 掉换行，才能比较；
- 最后那个"清空 ID → 重新 create"是个小巧劲：**复用分支 0 的现成逻辑**，不写重复代码。

## ⑦ `_create()`：备料 + 开机（第 3/4 课）

```python
r = self._run([
    "docker", "create",
    "--name", self.name,
    "-w", WORKDIR,              # 工作目录
    "--cpus", CPU, "--memory", MEM,
    IMAGE,
    "sleep", "infinity",        # 主进程：睡觉保活（第 3 课）
])
if r.returncode != 0:
    raise RuntimeError(f"docker create 失败: {r.stderr.decode()}")
self.container_id = r.stdout.decode().strip()    # stdout 里就是容器 ID
self._run(["docker", "start", self.container_id])
```

- 为什么这里 `raise`（Java 的 throw）而 `_run` 里 check=False？——**create 失败就没法继续了**，必须让上层立刻知道；而 exec 失败可能只是命令本身报错，输出对调用方还有用；
- `r.stdout.decode().strip()`：docker create 成功时唯一输出就是那 64 位十六进制 ID，去掉换行直接存。

## ⑧ `execute()`：递纸条（第 3 课）

```python
def execute(self, command: str, timeout=None):
    self._ensure_alive()                     # 先体检
    r = self._run(
        ["docker", "exec", "-w", WORKDIR,
         self.container_id, "sh", "-lc", command],
        timeout=timeout or EXEC_TIMEOUT,     # 没传就用默认（or 的巧用）
    )
    output = (r.stdout or b"") + (r.stderr or b"")   # 输出+报错合并
    return output.decode(errors="replace"), r.returncode
```

- `sh -lc`：`-c` = 后面字符串当命令执行；`-l` = login shell（加载环境配置，PATH 完整）；
- stdout + stderr 拼接：像真终端一样混排（第 3 课讲过为什么）；
- `errors="replace"`：遇到解不开的字节（agent 可能输出二进制）用替代符而不是整个崩掉。

## ⑨ 文件三兄弟：`read_file` / `write_file` / `_pipe_script`（第 6 课）

```python
def read_file(self, path, offset=0, limit=2000):
    payload = json.dumps({"path": path, "offset": offset, "limit": limit})
    return self._pipe_script(_READ_SCRIPT, payload)

def _pipe_script(self, script, payload_json):
    self._ensure_alive()
    b64 = base64.b64encode(payload_json.encode()).decode()
    r = self._run(
        ["docker", "exec", "-i", self.container_id,   # -i 是关键！
         "python3", "-c", script],
        input_bytes=b64.encode(),
    )
    return (r.stdout or b"").decode(errors="replace"), r.returncode
```

- 前两个方法只做"翻译"：Python 参数 → JSON 字符串；
- `_pipe_script` 做递送：JSON → base64 → 从 stdin 喂给容器里的 `python3 -c 脚本`；
- **`-i` 是命门**：它把 stdin 接进容器。没有它，管道里的纸条根本进不去（真实项目里 read() 重写，根子就是这个坑）；
- `python3 -c 脚本`：`-c` 表示"把后面这段字符串当程序执行"——纸条的正确打开方式。

## ⑩ `destroy()`：收尾

```python
self._run(["docker", "rm", "-f", self.name])
```

`-f` = force（运行中也直接删）。注意用的是 `self.name` 而不是 container_id——**容器重建后 ID 会变，但名字不变**，按名删更稳。

---

# 二、demo.py：五步演示的真相

```python
sb = Sandbox(session_id="demo001")     # 此刻什么都没发生！（懒加载）
```

| 步 | 代码 | 背后发生的完整链 |
|---|---|---|
| [1] | `sb.write_file(...)` | 打包 JSON → 体检（首次：create + start）→ base64 → exec -i 递纸条 → 容器里 python3 写文件 → "OK" 回程 |
| [2] | `sb.read_file(..., limit=2)` | 同上（容器已活，体检一问即过）→ 读文件纸条 → 行号化内容回程 |
| [3] | `sb.execute("python3 analyze.py")` | 体检 → exec 递命令 → 真正的 Python 算出 sum=31 |
| [4] | 手动 `docker stop` 后再 execute | **有人绕过类直接动了容器**——体检发现 Running=false → start 拉起 → 照常执行（这就是"自愈"的现场） |
| [5] | `sb.destroy()` | rm -f，现场清理 |

第 [4] 步特别值得品：demo 用自己的 subprocess 直接 `docker stop`（模拟"外部世界杀了容器"），Sandbox 类毫不知情，但下一次操作前的体检让它扛住了——**类不需要预防所有意外，只需要每次动手前看一眼**。

---

## 检查题

> **`_run()` 的 cmd 为什么用列表 `["docker", "create", ...]`，而不拼成一个长字符串？**（提示：想想文件名里有空格会怎样）

记录进博客：

🔧 **老师操作**：博客追加插问 8，更新记忆。

讲解完毕，已入册博客（插问 8）。

如果哪个段落还是模糊，指出来我单独再拆。没问题就答检查题：

> **`_run()` 的 cmd 为什么用列表，而不拼成一个长字符串？**

答完进第 7 课。

---

---

## 对话 19

**🧑‍🎓 学生：** 讲解代码的时候，先贴出代码片段，然后进行讲解，然后再贴出代码，再次讲解

**🧑‍🏫 老师：**

明白，这个格式确实更好——**代码先行，讲解殿后，一段一停**。以后讲代码都用这个节奏（已记入规则）。重新来：

---

# sandbox.py 逐段讲解

## 段 1：文件头（说明书 + 三个 import）

```python
"""最小可用沙箱：把第 1-6 课的知识点拼成能跑的代码。

用法见 demo.py。依赖：本机能执行 docker 命令，本地有 python:3.12-slim 镜像。
"""
import base64
import json
import subprocess
```

**讲解**：开头三引号字符串是 docstring（模块说明书，`sb.__doc__` 能取到）。三个 import 全是 Python 自带标准库：`base64` 负责纸条"安全字母化"，`json` 负责参数打包，`subprocess` 负责第 4 课的【叫人】——启动 docker CLI。零第三方依赖就是指这里：**不需要 pip install 任何东西**。

## 段 2：常量区（配置）

```python
IMAGE = "python:3.12-slim"   # 兜底镜像必须是 python（第 6 课：所有纸条都是 Python 写的）
WORKDIR = "/tmp"             # 真实项目是 /workspace，由挂载的宿主机目录自动产生（第 8 课）
CPU = "1"                    # 资源"信用卡额度"（插问 2）
MEM = "512m"
EXEC_TIMEOUT = 30            # 递进去的命令最多跑 30 秒，防死循环
```

**讲解**：相当于 Java 的 `static final`。集中放顶部的好处：换镜像、改配额只动一行。注意每个值都背着前面的课——IMAGE 是插问 1 的结论，CPU/MEM 是插问 2 的"额度不是预存款"，`EXEC_TIMEOUT` 是保命阀：agent 写出死循环时 30 秒后被掐掉。

## 段 3：纸条之一 `_READ_SCRIPT`

```python
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
```

**讲解**：最重要的认知——**这段代码不在你的机器上跑**。三引号 = 多行字符串，它的身份是**数据**，会被递进容器、由容器里的 python3 执行。以容器视角逐行：

- 第 2 行三连招：`sys.stdin.read()` 读入管道喂来的 base64 纸条 → `b64decode` 解码 → `json.loads` 解析成字典 `d`（Java 的 Map，`d['path']` 取值）；
- 第 3-7 行：打开目标文件读全文、切成行列表；文件不存在就打印错误、`sys.exit(1)`——**退出码 1 是给主程序的信号灯**；
- 第 8-10 行：`enumerate` 遍历时同时拿序号；切片 `lines[offset:offset+limit]` 实现分页；`f"{n:6d}\t"` 是格式化（行号占 6 格右对齐 + tab）。**print 出来的内容就是回程的货物**。

## 段 4：纸条之二 `_WRITE_SCRIPT`

```python
_WRITE_SCRIPT = """
import base64, json, os, sys
d = json.loads(base64.b64decode(sys.stdin.read()))
os.makedirs(os.path.dirname(d['path']) or '.', exist_ok=True)
with open(d['path'], 'w', encoding='utf-8') as f:
    f.write(d['content'])
print('OK')
"""
```

**讲解**：结构同上，三个新面孔：

- `os.makedirs(..., exist_ok=True)`：目标文件的父目录不存在就顺手创建（写 `/workspace/a/b/c.txt` 时不用先建目录）；
- `with open(...) as f`：Java 的 try-with-resources——块结束时自动关文件；
- `print('OK')`：回执。主程序看到 "OK" 就知道写成功了。

## 段 5：类头 + 构造器

```python
class Sandbox:
    """一场对话（会话）对应一个容器。"""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.name = f"mylab-sandbox-{session_id}"   # 容器名 = 会话 ID（第 5 课：按名找回）
        self.container_id = None                     # None = 还没创建 → 懒加载
```

**讲解**：`__init__` 就是 Java 的构造器；`self` 就是 `this`（Python 必须显式写在参数里）。三个字段：会话 ID 原样存着；容器名用它拼出来（名字含会话 ID，第 5 课"按名找回"的根基）；**`container_id = None` 是懒加载开关**——执行完 `Sandbox("demo001")`，系统毫无动静，容器还不存在。

## 段 6：`_run`——所有 docker 命令的唯一出口

```python
    def _run(self, cmd, input_bytes=None, timeout=None):
        return subprocess.run(
            cmd, input=input_bytes, capture_output=True,
            timeout=timeout, check=False,
        )
```

**讲解**：整个类对 docker 的所有调用都挤过这个漏斗——以后想加日志、重试、计时，改这一处就够。四个参数：`cmd` 是**列表**不是字符串（避免空格引号歧义，Java 的 ProcessBuilder 同理）；`input=input_bytes` 往子进程 stdin 喂数据——**纸条的入口**；`capture_output=True` 把输出收进结果对象（不然直接打到屏幕）；`check=False` 失败不抛异常，让我们自己看 returncode。返回的 CompletedProcess 带 `.stdout/.stderr`（**bytes**，所以后面到处 `.decode()`）和 `.returncode`。

## 段 7：`_ensure_alive`——体检 + 自愈

```python
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
```

**讲解**：第 5 课三分支的代码化。第一分支：ID 是 None 说明从没建过，直接建。第二分支：`docker inspect -f "{{.State.Running}}"` 是问管家一句话（`{{}}` 是 Docker 内置的 Go 模板语法），只答 true/false——stdout 是 `b"true\n"`，所以 `decode().strip()` 后才能比较。第三分支的小巧劲：start 失败说明容器整个没了，把 ID 置回 `None`，**复用第一分支的现成逻辑**重建，不写重复代码。

## 段 8：`_create`——备料 + 开机

```python
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
```

**讲解**：create 参数前面课全讲过：名字、工作目录、额度、镜像、睡觉主进程。两个新细节：①这里 `raise`（Java 的 throw）而 `_run` 里 check=False——因为 **create 失败就没法继续**，必须立刻通知上层，并把 stderr 带在异常消息里；②`docker create` 成功时 stdout 里**唯一的内容**就是那 64 位十六进制容器 ID，`strip()` 去换行直接存。最后一行 start：开机。

## 段 9：`execute`——递纸条

```python
    def execute(self, command: str, timeout=None):
        self._ensure_alive()
        r = self._run(
            ["docker", "exec", "-w", WORKDIR,
             self.container_id, "sh", "-lc", command],
            timeout=timeout or EXEC_TIMEOUT,
        )
        output = (r.stdout or b"") + (r.stderr or b"")   # 输出+报错合并，像真终端
        return output.decode(errors="replace"), r.returncode
```

**讲解**：第一行先体检（每次动手前看一眼）。`sh -lc`：`-c` = 后面的字符串当命令执行，`-l` = login shell（加载环境配置，PATH 完整）。stdout + stderr 拼接：像真终端按时间序混排（第 3 课）。`errors="replace"`：agent 可能输出二进制，解不开的字节用替代符，不崩。`timeout or EXEC_TIMEOUT`：调用方没传就用默认值。返回两个值（输出，退出码）——Python 函数可以返回多个值，Java 得封装成对象。

## 段 10：文件三兄弟

```python
    def read_file(self, path, offset=0, limit=2000):
        payload = json.dumps({"path": path, "offset": offset, "limit": limit})
        return self._pipe_script(_READ_SCRIPT, payload)

    def write_file(self, path, content):
        payload = json.dumps({"path": path, "content": content})
        return self._pipe_script(_WRITE_SCRIPT, payload)

    def _pipe_script(self, script, payload_json):
        self._ensure_alive()
        b64 = base64.b64encode(payload_json.encode()).decode()
        r = self._run(
            ["docker", "exec", "-i", self.container_id,
             "python3", "-c", script],
            input_bytes=b64.encode(),
        )
        return (r.stdout or b"").decode(errors="replace"), r.returncode
```

**讲解**：前两个方法只做"翻译"——把 Python 参数打包成 JSON 字符串，配上各自的纸条，交给 `_pipe_script`。`_pipe_script` 做递送：JSON → base64 → 从 stdin 喂给容器里的 `python3 -c 脚本`（`-c` = 把字符串当程序执行）。**`-i` 是命门**：把 stdin 接进容器，没有它管道里的纸条根本进不去——真实项目里 read() 被重写，根子就是这个坑。

## 段 11：`destroy`——收尾

```python
    def destroy(self):
        self._run(["docker", "rm", "-f", self.name])
        self.container_id = None
```

**讲解**：`-f` = force，运行中也直接删。注意删的是 `self.name` 不是 container_id——**容器重建后 ID 会变，名字永远不变**，按名删更稳。删完把 ID 置回 None，这个对象就回到了"从没建过"的状态。

---

# demo.py 逐段讲解

## 段 1：开场

```python
"""演示：像 agent 一样使用沙箱——完整走一遍第 1-6 课的知识点。"""
import subprocess

from sandbox import Sandbox

sb = Sandbox(session_id="demo001")          # 一场对话开始
```

**讲解**：`from sandbox import Sandbox` 等价 Java 的 import。最后一行执行完**什么都没发生**——没有容器、没有 docker 调用（懒加载）。这个对象此刻只是一张"空头支票"：记着名字，等第一次使用时才兑现。

## 段 2：三步正常操作

```python
# 1. 第 6 课：写文件 = 递一张"写文件"纸条
out, code = sb.write_file("/tmp/analyze.py",
    "data = [3, 1, 4, 1, 5, 9, 2, 6]\n"
    "print('sum =', sum(data))\n"
    "print('avg =', sum(data)/len(data))\n")
print("[1] 写文件:", out.strip(), "| 退出码:", code)

# 2. 第 6 课：读文件 = 递一张"读文件"纸条（limit=2 只取前 2 行）
out, code = sb.read_file("/tmp/analyze.py", limit=2)
print("[2] 读回前 2 行:")
print(out)

# 3. 第 3 课：执行命令 = 递纸条
out, code = sb.execute("python3 analyze.py")
print("[3] 执行结果:")
print(out, "| 退出码:", code)
```

**讲解**：相邻的两个字符串 `"data = ...\n" "print(...)\n"` 会自动拼接（Python 特性，写长文本不用加号）。三步各自的完整链：[1] 是全程序**第一次动手**——write_file → 体检（发现 ID 是 None）→ create + start → 递写文件纸条 → "OK" 回程；[2] 体检一问即过（容器活着），递读文件纸条，`limit=2` 生效；[3] 递命令纸条，容器里**真正的 Python** 算出 `sum = 31`。注意 `out, code = ...` 接住了方法返回的两个值。

## 段 3：自愈演示 + 收尾

```python
# 4. 第 5 课：自愈——手动停掉容器，再执行，依然成功
subprocess.run(["docker", "stop", sb.name], capture_output=True)
print("[4] 容器已被手动停止，再次执行:")
out, code = sb.execute("echo revived && ls")
print(out, "| 退出码:", code)

# 5. 清理
sb.destroy()
print("[5] 容器已删除，演示结束")
```

**讲解**：第 4 步是全 demo 的戏眼：demo **绕过 Sandbox 类**、用自己的 subprocess 直接 `docker stop`——模拟"外部世界杀了容器"，类毫不知情。下一次 `execute` 前的体检发现 `Running=false`，自动 `docker start` 拉起，命令照常执行（输出里 `revived` 和 `analyze.py` 都在——文件没丢，因为容器只是停了没删）。这就是第 5 课那句话的代码形态：**类不需要预防所有意外，只需要每次动手前看一眼**。第 5 步 destroy 清理现场。

---

新检查题（这道题直接通向第 7 课）：

> **假设同时建两个对象：`Sandbox("aaa")` 和 `Sandbox("bbb")`，各自 write_file、execute。它们会互相干扰吗？为什么？**（提示：看容器名和容器隔离）

记录进博客：

🔧 **老师操作**：博客追加格式重讲版，更新长期记忆（"先贴代码再讲解"固化为标准节奏）。

重讲完毕，格式规则已固化（博客 + 我的长期记忆都记了：以后讲代码一律"贴片段 → 讲解 → 贴片段 → 讲解"）。

检查题等你——这道题答完，第 7 课等于已经开了一半：

> **同时建 `Sandbox("aaa")` 和 `Sandbox("bbb")`，各自 write_file、execute——它们会互相干扰吗？为什么？**

---

（逐字实录重建中：对话 20 起待回填。）







