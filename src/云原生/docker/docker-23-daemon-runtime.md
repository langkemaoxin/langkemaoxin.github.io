---
title: Docker Daemon 与 runtime——一条 docker run 经过了谁的手
sidebarGroup: Docker 系列
shortTitle: 23 Daemon 与 runtime
order: 23
date: 2026-08-19T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - OCI
  - containerd
  - runc
  - CRI
description: 从 CLI 到 runc 逐层拆开一条 docker run 的五级接力：dockerd 管什么、containerd/shim/runc 各干什么，OCI 与 CRI 又是什么。
---

> **Docker 系列 · 第 23/33 篇**
> 上一篇：[《从零理解 Docker 镜像分层——两个目录叠出一个文件系统（师生对话实录）》](/云原生/docker/docker-22-unionfs) · 下一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-24-process-view)

---

## 开头：dockerd 重启，线上容器会不会全体阵亡？

两个你早晚会碰到的场景：

1. 机器要升级 Docker 版本，`systemctl restart docker` 敲下去之前你犹豫了：上面 30 个正在跑的容器，会不会跟着全没？
2. 在宿主机 `ps -ef`，看到一排 `containerd-shim-runc-v2` 进程，不知道是谁起的、占多少资源、能不能杀。

答不上来，是因为不清楚 `docker run` 背后不是一个人在干活，而是 **CLI → dockerd → containerd → containerd-shim → runc** 五级调用在接力。根因一句话：**容器不是 dockerd 的附属品**——它是 runc 按 OCI 规范创建出来的普通进程，dockerd 只是流水线中间一环。谁攥着容器的「命」，决定了 daemon 重启时容器死不死。

本篇不先背概念。你在终端输入：

```bash
docker run -d nginx
```

几秒内容器就起来了。本篇从头到尾只用这一条命令当线索：**它在背后经过了谁的手**。每一节只解开一层，解开一层就多回答一个开头的问题。

| 节 | 这一节解开的 | 读完能回答的 |
|----|------------|--------------|
| **1** | 宿主机进程树 | `docker run` 之后多了哪些进程，谁陪容器到最后 |
| **2** | daemon 的三段演进 | 为什么装个 Docker，`/usr/bin` 里多出「一家人」 |
| **3** | Docker CLI | CLI 不建容器，它到底做了什么 |
| **4** | dockerd 的职责边界 | 镜像、网络、卷归谁管；起容器进程的为什么不是它 |
| **5** | OCI 标准与 bundle | 为什么 runtime 说换就能换 |
| **6** | image-spec | 一份镜像里到底装了哪些东西 |
| **7** | runtime-spec | 容器的状态机和 runtime 必须会做的动作 |
| **8** | containerd | dockerd 挂了，containerd 和容器为什么还活着 |
| **9** | containerd-shim | 升级 dockerd 为什么不打断正在跑的容器 |
| **10** | runc | Namespace 和 Cgroup 是谁替你设置的 |
| **11** | 全景拼图 | 五级链路串讲，与第 24 篇进程实验互相印证 |
| **12** 🧗 | CRI | K8s 为什么弃用 dockershim；Docker 镜像在 K8s 上还能不能跑 |

前置：[第 3 篇](/云原生/docker/docker-03-engine-platform) 已画过组件地图，[第 24 篇](/云原生/docker/docker-24-process-view) 在进程树上见过 shim——本篇把这条链**按职责拆开**。更高/低层 runtime 分类、containerd 单独安装与 `ctr` 实操在附篇 [a01](/云原生/docker/docker-a01-container-runtime-docker)、[a02](/云原生/docker/docker-a02-containerd)，比本篇更深，这里只回链。

文中进程树、命令输出均来自一套真实 Docker 实验机（Linux 宿主机，容器里跑的是 RocketMQ broker）。官方入口：[OCI](https://opencontainers.org/)、[containerd](https://containerd.io/)、[Docker Engine 文档](https://docs.docker.com/engine/)。

---

## 第 1 节：先看结果——docker run 之后，宿主机上多了谁

先不谈架构，直接动手看。启动一个容器后，在宿主机观察：

```bash
docker top <容器名>
ps -ef | grep containerd-shim
pstree -l -a -A <shim_pid> -p
```

三条命令各干什么：`docker top <容器名>` 列出容器内进程在宿主机上的 PID（[第 24 篇](/云原生/docker/docker-24-process-view)用过）；`ps -ef` 配合 `grep` 过滤，找名叫 containerd-shim 的进程；`pstree -l -a -A <shim_pid> -p` 以某个 PID 为根把子树画出来，`-p` 连 PID 一起显示，`-A` 表示用 ASCII 字符画树（终端不乱码）。

实验机上的一棵典型进程树：

```text
dockerd (PID 3197)
└── containerd (PID xxxx)
    └── containerd-shim-runc-v2 (PID 3401)  ← 参数含 -id <容器完整ID>
        └── sh mqbroker ... (PID 3473)       ← 容器内 PID 1
```

一行一行读：

- 最上面两层 `dockerd`、`containerd`：Docker 启动后**一直存在**的常驻进程，整台机器就一套
- 中间 `containerd-shim-runc-v2`（PID 3401）：**每创建一个容器，就多一个 shim**，命令行参数里带着这个容器的完整 ID
- 最底下 `sh mqbroker ...`（PID 3473）：**容器里真正跑的应用**（这台实验机上是个 RocketMQ broker 启动脚本），它就是容器内的 PID 1——第 24 篇讲过的「同一个进程两套 PID」

原文三条结论，直接抄在这儿当锚点：

- dockerd 和 containerd 在 Docker 启动后**一直存在**
- 每创建一个容器，多一个 shim 进程
- shim 的子进程才是容器内实际运行的应用

把冒出来的名字先钉成一张小图（这是调用关系，不是父子关系——注意 docker CLI 不在这棵树里，第 3 节解释）：

```text
docker（CLI）──> dockerd ────> containerd ──> shim ──> runc ──> 容器进程
   发请求         管全局         管生命周期     每容器一个  动手创建  容器内 PID 1
```

> 先记一个悬念：dockerd 重启时，最底下那个 PID 3473 会不会死？现象第 1 节看到了（它挂在 shim 下面，不挂在 dockerd 下面），完整答案第 9 节解开。

---

## 第 2 节：装一个 Docker，来了一家人——daemon 的三段演进

第 1 节树上的几个名字，来历是一段拆分史。Docker 守护进程从早期集成在 `docker` 命令中，逐步拆分为独立二进制：

| 版本 | 启动命令 | 形态 |
|------|----------|------|
| Docker 1.8 之前 | `docker -d` | 守护进程是 client 的一个选项 |
| Docker 1.8 | `docker daemon` | 守护进程是 docker 命令的模块 |
| Docker 1.11+ | `dockerd` | **独立二进制**，与 client 分离 |

读表：1.8 之前，守护进程只是 client 的一个选项；1.8 变成一条子命令；1.11 之后干脆分家成独立二进制 `dockerd`。也是在 1.11 这版，容器执行链被拆出了 containerd 和 runc（第 8、10 节的主角）——**「五级接力」的格局就是这时定型的**。

Linux 上 dockerd 由 systemd 拉起。systemd 服务配置（`/usr/lib/systemd/system/docker.service`）：

```ini
[Service]
Type=notify
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
```

三行都要能读懂：`ExecStart=/usr/bin/dockerd` 是开机启动的那条命令；`Type=notify` 表示 dockerd 就绪后会主动通知 systemd，所以 `systemctl start docker` 会等到真正可用才返回；`ExecReload` 定义了重载配置时执行的动作。

形态变了，功能定位没变：**CS 架构的服务端**，接收 Docker CLI 请求，管理镜像与容器生命周期。

再看这家人现在的名单，相关二进制：

```bash
/usr/bin/docker              # CLI 客户端
/usr/bin/dockerd             # 守护进程
/usr/bin/containerd          # 容器运行时（中间层）
/usr/bin/containerd-shim-runc-v2   # 容器垫片
/usr/bin/runc                # OCI 运行时实现
```

五行正好对上第 1 节那棵进程树——装一个 Docker 引擎，来的其实是一家人，各有各的岗位。接下来每节拜访一位。

> 历史包袱先记现象：老教程里的 `docker -d`、`docker daemon` 两种写法早已废弃，现在统一是 `dockerd`。别照抄老命令（章末「历史包袱」再汇总）。

---

## 第 3 节：第一只手 CLI——只发请求，不建容器

用户入口，通过 REST/gRPC 与 dockerd API 通信：

```bash
docker build ...
docker run ...
docker ps ...
```

CLI 本身不创建容器，只发请求。

白话拆开：你在终端敲 `docker run -d nginx`，`docker` 这个程序只做三件事——解析参数、组一个 API 请求、发给 dockerd 监听的 socket（默认 `/var/run/docker.sock`，[第 3 篇](/云原生/docker/docker-03-engine-platform)讲过这个 Unix 域套接字）。在这条链上，CLI → dockerd 走的是 REST API；再往下一层 dockerd → containerd 才换 gRPC（第 8 节）。

于是有几个能直接看见的后果：

- 第 1 节进程树里**没有 docker CLI**——它不是常驻进程，请求发完就退出了
- 关掉终端、CLI 崩掉，容器照跑
- 把客户端装在另一台机器上、指到这台的 daemon，一样能管容器（`DOCKER_HOST` / `docker context`，远程管理见[第 28 篇](/云原生/docker/docker-28-daemon-ops)）

一句话：**CLI 是发令的，不是干活的**。活谁干？往下看。

---

## 第 4 节：第二只手 dockerd——接单、记账、派活

CLI 的请求打到 dockerd。它的职责四条：

- 接收 CLI 请求
- 管理镜像、网络、卷、容器
- 调用 containerd 执行容器操作
- 向上屏蔽底层 runtime 变化，保持 API 兼容

四条翻成白话，就是「接单、记账、派活、挡变化」：

1. **接单**：开着 API 服务等请求（第 3 节那个 socket 的另一头）
2. **记账**：镜像、网络（[第 15 篇](/云原生/docker/docker-15-network)的 bridge）、卷（[第 14 篇](/云原生/docker/docker-14-data-persistence)）这些「资产」都归它管——`docker ps`、`docker images` 的答案从这来
3. **派活**：真正去创建容器进程这一步**不亲自干**，转交下一层 containerd
4. **挡变化**：底层 runtime 换版本、甚至换实现，对外 API 不变——你手里的 docker 命令不用跟着改

管的事多，daemon 就重。查看 dockerd 资源占用：

```bash
pidof dockerd
lsof -p $(pidof dockerd) | wc -l
```

`pidof dockerd` 拿到它的 PID；`$(...)` 把结果填进下一条命令，`lsof -p` 列出这个进程打开的所有文件，`| wc -l` 数行数——镜像层、日志、网络、卷的元数据都在它手里，打开的句柄自然不少。daemon 越重，重启的代价越大——**第 1 节那个「daemon 重启容器死不死」的悬念在这里更扎手了**，第 9 节给答案。

---

## 第 5 节：先签合同——OCI 与 filesystem bundle

dockerd 派活、containerd 接活、runc 干活，三层来自不同的项目，凭什么能互相配合？因为动手之前先签了份合同。

设想没有标准的世界：每家容器引擎的镜像格式、启动方式都是私有的——A 家构建的镜像 B 家跑不了，K8s 想换 runtime 就得整套重写。所以 2015 年 Docker、CoreOS 等公司共同发起 [OCI](https://opencontainers.org/)（Open Container Initiative，开放容器倡议），由 Linux 基金会管理，制定容器**镜像格式**与**运行时**的开放标准，并维护参考实现（reference implementation）**runc**。这段公司与基金会的历史，附篇 [a01](/云原生/docker/docker-a01-container-runtime-docker) 展开讲过。

官方的一句自我介绍：

> An open governance structure for the express purpose of creating open industry standards around container formats and runtime.

翻译成白话：一个开放治理的组织，专门给「容器格式和运行时」定行业标准。

**Container Runtime（容器运行时）** 负责容器生命周期管理。OCI 用 **filesystem bundle**（文件系统包）这个标准格式把两份规范接起来：OCI 镜像可转换为 bundle，runtime 识别 bundle 后启动容器。

钉成小模型：

```text
image-spec（镜像长什么样）
        │  解包（unpack）：镜像 → bundle
        ▼
bundle = 一个目录：rootfs + config.json
        │  runtime 读懂 bundle
        ▼
runtime-spec（容器怎么跑：状态 + 操作）
```

合同分上下两页，本篇也分两节签：第 6 节看上半页（镜像规范），第 7 节看下半页（运行时规范）。

---

## 第 6 节：合同上半页——image-spec 里装了什么

OCI 容器镜像包含：

| 组件 | 说明 |
|------|------|
| **文件系统 layers** | 每层保存相对上层的变化；层有 hash，可共享 |
| **config** | 层历史 hash、环境变量、工作目录、CMD、mount 列表等（类似 `docker inspect <image>`） |
| **manifest** | config 索引、layer 列表、平台相关 annotation |
| **index**（可选） | 跨平台 manifest 索引，支持 multi-arch 镜像 |

逐行解读：

- **文件系统 layers**：每层只存「相对上一层改了什么」，层带 hash，所以不同镜像能共享同一层——[第 22 篇](/云原生/docker/docker-22-unionfs)把一层层叠出 rootfs 的过程做成了实验
- **config**：环境变量、工作目录、CMD、挂载列表——就是 `docker inspect <image>` 打出来的那份
- **manifest**：指明这个镜像用哪份 config、要拉哪些层，是「提货单」
- **index**（可选）：跨平台清单——`nginx` 一个 tag 里同时装着 amd64/arm64 多份 manifest，所以 x86 服务器和 arm 机器 pull 同一个 tag 都能跑（multi-arch）

读完这节，`docker pull nginx` 时刷出来的「一串 hash 层 + 一份清单」各是什么角色，你都能对号入座了。

---

## 第 7 节：合同下半页——runtime-spec 的状态机

镜像说清楚了，合同下半页规定「容器怎么跑」。**Runtime Spec（运行时规范）** 定义：

- 容器**状态**（creating / created / running / stopped）
- runtime 必须提供的操作：create、start、delete、state 查询等

状态转换简图：

```text
creating → created → running → stopped
                ↘         ↗
                  paused
```

读图：

- `create` 只把容器**造**出来（到达 created）：namespace、cgroup、rootfs 都就位，但用户进程还没跑——这是个**检查点**，配置有问题此时就拦下
- `start` 才把容器 init 进程拉起来（running）
- `paused` 是运行中的冻结态（用的正是[第 21 篇](/云原生/docker/docker-21-cgroups)子系统表里的 freezer 思路）
- `stopped` 之后再 delete 清场

为什么要认识这套状态机：`docker ps` 里的 Created / Up / Exited，底层说的就是这套语言；更重要的是 **create 和 start 分成两步**——这个设计会直接体现在第 9 节 runc 的两条命令上。

bundle 在这节再点一次：runtime-spec 规定 bundle 目录 = rootfs + `config.json`，是容器跑起来所需的**完整静态描述**。谁负责把第 6 节的镜像变成 bundle？下一节的 containerd。

---

## 第 8 节：第三只手 containerd——独立的大管家

Docker 1.11 后为兼容 OCI，将容器运行时从 dockerd **剥离**，这位就是 containerd。职责：

- **镜像管理**：pull/push、unpack、snapshot
- **容器执行**：调用 shim + runc
- 即使 dockerd 不运行，理论上也可直接管理容器（需相应 CLI）

containerd 特点：

- 通过 **gRPC over Unix socket** 暴露 API（`/run/containerd/containerd.sock`）
- 完全遵循 OCI image-spec 与 runtime-spec
- 使用 runc 按 OCI 规范运行容器

dockerd 通过 gRPC 调用 containerd，确保原有 Docker API 向下兼容。

三条解读：

- **「剥离」= dockerd 降级成 containerd 的客户**。第 1 节进程树里 containerd 是 dockerd 的子进程，但它是**独立进程**——dockerd 重启，containerd 不必陪葬，这正是「dockerd 挂了 containerd 还活着」的结构原因
- **镜像管理也下沉了**：pull 下来的层、解包成 snapshot——第 5 节模型里「镜像 → bundle」那一步就是它干的
- **「需相应 CLI」**：containerd 自带 `ctr`，K8s 场景用 `crictl`。单独安装 containerd、用 `ctr` 从 pull 跑到 exec 的完整实操在附篇 [a02](/云原生/docker/docker-a02-containerd)，本篇不展开

前后印证一下：第 9 节会看到 shim 的参数里有 `-address /run/containerd/containerd.sock`——垫片就是连到这个 socket 汇报工作的。

读完这节能回答开头问题的一半：dockerd 挂了，containerd 还在（独立进程），容器进程是 shim 的孩子、不是 dockerd 的孩子。但容器的日志和 IO 为什么也不断？第 9 节。

---

## 第 9 节：第四只手 shim——每个容器一个垫片

每启动**一个容器**，就启动**一个** shim 进程（如 `containerd-shim-runc-v2`）。

启动参数核心三项：

1. **容器 ID**
2. **bundle 目录**（如 `/run/containerd/.../<容器ID>/`）
3. **runtime 二进制**（默认 runc）

不用背，实验机上抓出来看。回到第 1 节那棵树，查 PID 3401 的完整命令行：

```bash
ps -ef | grep 3401
# /usr/bin/containerd-shim-runc-v2 -namespace moby -id e9eaef999da9... \
#   -address /run/containerd/containerd.sock
```

三个参数逐一对应：

- `-namespace moby`：Docker 在 containerd 里占的命名空间叫 **moby**（Docker 的上游项目名，[第 3 篇](/云原生/docker/docker-03-engine-platform)提过 Moby）；K8s 走的是 `k8s.io` 命名空间，两边互不打架（附篇 [a02](/云原生/docker/docker-a02-containerd) 专门演示过）
- `-id e9eaef999da9...`：容器的完整 ID——第 1 节「参数含 -id <容器完整ID>」就是它
- `-address /run/containerd/containerd.sock`：连到 containerd 的 gRPC socket，第 8 节那条印证上了

shim 调用 runc API，最终拼装类似：

```bash
runc create <容器ID> --bundle <bundle路径>
runc start <容器ID>
```

两条命令正好踩在第 7 节状态机的两个节点上：`create` 走到 created，`start` 才进 running。

### shim 存在的三大意义

1. **runc 可退出**：不必为每个容器常驻一个 runc 进程；创建完容器 runc 即可退出
2. **IO 保活**：即使 dockerd、containerd 挂掉，容器的 stdin/stdout/stderr 仍可用
3. **上报退出状态**：向 containerd 报告容器 exit code

> 第 1、2 点尤其重要：**dockerd 升级或重启时，已运行容器不会中断**——这是生产环境的关键设计。

现在把第 1、4 节的悬念解开：容器进程的父进程是 shim，不是 dockerd；shim 只认 containerd 的 socket，根本不知道 dockerd 的死活；runc 更是容器一起来就退场了。所以 daemon 重启，shim 带着容器原地不动，`docker logs` 也不会断流。生产上更稳的官方开关 `live-restore` 见[第 28 篇](/云原生/docker/docker-28-daemon-ops)。

bundle 目录内容示例：

```bash
ls /var/run/docker/containerd/e9eaef999da9183b9be0b3239881bc6b9c2070f13057c322dfed3d072820e962
# config.json  stdin  stdout  stderr  ...
```

解读这份清单：目录名就是容器完整 ID（和 `-id` 参数对上）；`config.json` 是第 7 节说的那份 runtime-spec 配置；stdin/stdout/stderr 是给容器准备的三根 IO 管道——三大意义里「IO 保活」保的实体就在这个目录里。

把 shim 的角色钉成小模型——一个陪跑的保姆：

```text
containerd ──spawn──> shim（每容器一个）
                        ├─ 拼 runc create / start（runc 干完活就走）
                        ├─ 扛住容器的 stdin / stdout / stderr
                        └─ 容器退出时，把 exit code 报给 containerd
```

---

## 第 10 节：第五只手 runc——真正动手的人

链路走到底，才轮到真正碰内核的这位。runc 从 Docker 的 **libcontainer** 迁移而来，实现：

- 容器创建/启动/停止/删除
- Namespace 隔离（pid/net/mnt/uts/ipc/user）
- Cgroup 资源限制

前面四只手都没碰过内核；到了 runc，才真正执行那些系统调用。往回挂靠前面几篇：

- [第 20 篇](/云原生/docker/docker-20-namespace)的 **Namespace**（pid/net/mnt/uts/ipc/user）——是 runc 设置的
- [第 21 篇](/云原生/docker/docker-21-cgroups)的 **Cgroup** 限额——是 runc 创建 cgroup 并把容器 PID 写进去的
- [第 24 篇](/云原生/docker/docker-24-process-view)「kill 容器内 PID 1 → 容器退出」——signal 发送与 namespace 清理也是 runc 的活

那两篇的实验结论，在架构上的落点全是这一层。也顺便把[第 2 篇](/云原生/docker/docker-02-container-vs-vm)的结论钉死：**容器 = runc 创建的隔离进程组**，不是虚拟硬件。

Docker 默认使用内置 runc，也可指定自定义 runtime：

```bash
dockerd --add-runtime "custom=/usr/local/bin/my-runc-replacement"
```

`--add-runtime` 给 dockerd 注册一个名叫 `custom` 的 runtime，指向替代实现的二进制。敢让你换的前提，正是第 5 节那份合同——只要按 OCI runtime-spec 实现了 create/start/state 这些动作，就能顶上 runc 的位置。安全沙箱类 runtime（gVisor、Kata 这类低层 runtime 三兄弟）走的就是这条路，分类见附篇 [a01](/云原生/docker/docker-a01-container-runtime-docker)。

---

## 第 11 节：拼回全景——一条 docker run 的五级接力

十节攒下的名字，按调用顺序摆进一张图（原文组件关系图）：

```text
┌─────────────┐
│  docker     │  CLI：用户命令
│  (client)   │
└──────┬──────┘
       │ REST API
       ▼
┌─────────────┐
│  dockerd    │  镜像/网络/卷/容器管理
└──────┬──────┘
       │ gRPC
       ▼
┌─────────────┐
│ containerd  │  镜像存储 + 容器生命周期
└──────┬──────┘
       │ 每个容器一个 shim
       ▼
┌─────────────────────┐
│ containerd-shim     │  IO 转发、状态上报、垫片
└──────┬──────────────┘
       │ runc create/start
       ▼
┌─────────────┐
│    runc     │  OCI runtime：namespace + cgroup
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 容器内进程   │  nginx / redis / your-app
└─────────────┘
```

顺着图把那条 `docker run -d nginx` 完整走一遍：

1. **docker（CLI）**把命令翻成 REST 请求，发给 dockerd（第 3 节）
2. **dockerd** 记账（镜像在不在、网络卷怎么配），把「起容器」经 gRPC 派给 containerd（第 4 节）
3. **containerd** 准备 bundle（镜像 → rootfs + config.json），再为这个容器 spawn 一个 shim（第 8 节）
4. **shim** 拼 `runc create` / `runc start` 两条命令（第 9 节）
5. **runc** 设置 namespace + cgroup，创建出容器 init 进程，然后**退出**（第 10 节）
6. 此后陪着容器的只有 shim；nginx 在容器里当它的 PID 1（第 1 节的树）

再拿[第 24 篇](/云原生/docker/docker-24-process-view)的进程实验来互相印证——两篇看的是同一个东西，一个从进程看，一个从架构看：

| [第 24 篇](/云原生/docker/docker-24-process-view)（进程视角） | 本篇（runtime 链） |
|-------------------|-------------------|
| 容器内 PID 1 | shim 启动的第一个进程 |
| 宿主机 PPID = shim | shim 由 containerd 创建 |
| kill PID 1 → 容器退出 | runc 负责 signal 与 namespace 清理 |
| cgroup 路径 | runc 创建 cgroup 并写入 PID |

表里每一行左右都能对上：第 24 篇实测容器内外进程的宿主机 PPID 都是 shim，本篇解释了为什么——runc 干完就退，shim 才是那个留下的爹。

一句话收束：**dockerd 已瘦身**——只做 API 与编排，实际跑容器交给 containerd + runc。

---

## 第 12 节 🧗：换个老板——CRI 与 Kubernetes

主线故事讲完了（一条 docker run 从 CLI 到 runc）。最后扩一步：如果这台机器不是你手工敲 `docker run`，而是 **Kubernetes** 在管，这条链会变吗？

Kubernetes 早期直接调用 Docker API 管理容器（kubelet 内的 docker manager）——runtime 想换就得改 kubelet 源码。**K8s 1.5+** 推出 **CRI（Container Runtime Interface）**——统一的容器运行时接口：

- 隔离各引擎差异（Docker、containerd、CRI-O 等）
- 与 OCI 不同：CRI 紧密绑定 **Kubernetes Pod** 概念
- 定义 Pod 生命周期管理；Pod 的运行环境称为 **PodSandbox**

演进路径：

```text
早期 K8s
  kubelet → docker manager → Docker API → dockerd

Docker 拆分 containerd 后
  kubelet → CRI → dockershim → dockerd → containerd → shim → runc

K8s 1.24+ 移除 dockershim
  kubelet → CRI → containerd（cri-containerd）→ shim → runc
  或
  kubelet → CRI → CRI-O → runc（OCI 直连）
```

三段逐一读：

- **第一段（早期）**：对接 Docker 的代码写死在 kubelet 里，Docker 一改 kubelet 就得跟着改
- **第二段（Docker 拆分后）**：kubelet 只对接 CRI，由 **dockershim** 把 CRI 调用翻译成 Docker API——多一层翻译，还得 Kubernetes 社区替它维护
- **第三段（K8s 1.24+ 移除 dockershim）**：**cri-containerd** 把 containerd 直接接入 CRI 标准，翻译层没了；另一条路是 **CRI-O**——架设在 CRI 与 OCI 之间的桥梁，让更多符合 OCI 的 runtime 接入 Kubernetes

趋势：Kubernetes 与 Docker 解耦，**containerd / CRI-O + runc** 成为主流栈；但 **OCI 标准不变**，Docker 生态构建的镜像仍可在 K8s 中运行。

所以「K8s 抛弃了 Docker」这话只对了一半：抛弃的是 dockerd 这层翻译，不是你的镜像——第 6 节 image-spec 那份合同还在生效。

最后把 OCI 和 CRI 放一起，别再混：

| 名字 | 是什么 | 给谁用 |
|------|--------|--------|
| **OCI** | 镜像格式 + 运行时行为的标准（image-spec / runtime-spec） | 所有容器工具的「普通话」 |
| **CRI** | kubelet 与 runtime 之间的接口，带 Pod / PodSandbox 语义 | Kubernetes 的「方言」 |

---

## 怎么记：按接力顺序记这条链

口诀一句：**CLI 发令、daemon 记账、containerd 管家、shim 陪跑、runc 动手。**

| 想看什么 | 命令 | 在哪节用过 |
|----------|------|-----------|
| 容器进程在宿主机上的样子 | `docker top <容器名>` | 第 1 节 |
| 找到垫片进程 | `ps -ef \| grep containerd-shim` | 第 1 节 |
| 画出某容器的进程子树 | `pstree -l -a -A <shim_pid> -p` | 第 1 节 |
| shim 的三个参数 | `ps -ef \| grep <shim_pid>` | 第 9 节 |
| daemon 是谁拉起来的 | `systemctl cat docker`（`ExecStart=/usr/bin/dockerd`） | 第 2 节 |
| daemon 有多重 | `pidof dockerd`、`lsof -p $(pidof dockerd) \| wc -l` | 第 4 节 |
| 容器两步创建 | `runc create` → `runc start`（由 shim 拼装） | 第 9 节 |
| 换一个 runtime | `dockerd --add-runtime …` | 第 10 节 |

---

## 历史包袱

- **启动写法三代**：`docker -d` → `docker daemon` → `dockerd`（第 2 节的表）。前两种在老教程里随处可见，如今早已废弃，看到别照抄。
- **runc 的出身**：它不是为 Docker 新写的项目，而是 Docker 把自家 libcontainer 捐给 OCI 后的参考实现（第 10 节）；再往前数，血脉是 LXC 那套「Namespace + Cgroup 封装」路线——[第 19 篇](/云原生/docker/docker-19-tech-foundation)的「Docker ≈ LXC + AUFS」、[第 21 篇](/云原生/docker/docker-21-cgroups)的「Cgroup → LXC → Docker」链条讲的就是这段。这也是 runc 子命令风格和 docker 相近的原因（[第 3 篇](/云原生/docker/docker-03-engine-platform)提过）。
- **dockershim 已移除**：K8s 1.24 起不再内置（第 12 节）。老资料里「kubelet → dockershim → dockerd」的链路现在是历史语境，新集群别再按它排障。

---

## 和系列其它篇

| 相关篇 | 在这条链上的位置 |
|--------|----------------|
| [第 3 篇](/云原生/docker/docker-03-engine-platform) Engine 地图 | 本篇把那张地图逐层拆开讲 |
| [第 19 篇](/云原生/docker/docker-19-tech-foundation) 技术底座 | Namespace / Cgroup / UnionFS 三大件总览 |
| [第 22 篇](/云原生/docker/docker-22-unionfs) UnionFS | 第 6 节镜像 layers 的叠法 |
| [第 20 篇](/云原生/docker/docker-20-namespace) Namespace | 第 10 节：隔离是 runc 设置的 |
| [第 24 篇](/云原生/docker/docker-24-process-view) 进程视角 | 第 1、11 节互相印证 |
| [第 21 篇](/云原生/docker/docker-21-cgroups) Cgroups | 第 10 节：限额是 runc 写入的 |
| [第 25 篇](/云原生/docker/docker-25-container-security) 容器安全 | 下一篇：这条链上的权限怎么降 |
| [第 28 篇](/云原生/docker/docker-28-daemon-ops) Daemon 运维 | daemon.json / live-restore 的落地 |
| [附篇 a01](/云原生/docker/docker-a01-container-runtime-docker) | 高层/低层 runtime 分类、OCI 历史 |
| [附篇 a02](/云原生/docker/docker-a02-containerd) | 单独用 containerd + ctr 的完整实操 |

---

## 小结

同一条 `docker run -d nginx`，十二节各解开一层：

1. **进程树（第 1 节）**：dockerd / containerd 常驻，每容器一个 shim，shim 的子进程才是容器应用。
2. **daemon 演进（第 2 节）**：`docker -d` → `docker daemon` → `dockerd`；装 Docker 送一家人。
3. **CLI（第 3 节）**：只解析参数、发 REST 请求，非常驻进程。
4. **dockerd（第 4 节）**：接单、记账（镜像/网络/卷）、派活、挡变化；不亲自起容器进程。
5. **OCI（第 5 节）**：先签合同；bundle 把 image-spec 与 runtime-spec 接起来。
6. **image-spec（第 6 节）**：镜像 = layers + config + manifest（可选 index，multi-arch）。
7. **runtime-spec（第 7 节）**：状态机 creating → created → running → stopped，create 与 start 分两步。
8. **containerd（第 8 节）**：独立进程，管镜像 unpack/snapshot 与容器执行，gRPC over Unix socket。
9. **shim（第 9 节）**：每容器一个；runc 可退出、IO 保活、上报 exit code——**daemon 重启容器不中断**就靠它。
10. **runc（第 10 节）**：libcontainer 出身，设置 Namespace/Cgroup；只要守 OCI 合同就可被替换。
11. **全景（第 11 节）**：五级接力串成一张图，与第 24 篇进程实验一一对应；dockerd 已瘦身。
12. **CRI（第 12 节）**🧗：K8s 方言；dockershim 移除后 containerd / CRI-O 直连，OCI 镜像不受影响。

**思考题**

> 生产环境升级 dockerd 时，为什么已运行的容器通常不会中断？是哪一层设计保证了这一点？
>
> K8s 节点上根本没装 dockerd，你用 Docker 构建的镜像为什么照跑不误？用第 6 节和第 12 节的说法回答。

欢迎在评论区留下你的分析。下一篇：[《容器安全——同一个容器，从 --privileged 全裸滚到最小权限》](/云原生/docker/docker-25-container-security)。

---

## 参考资料

- [OCI 官网与规范索引](https://opencontainers.org/)
- [image-spec](https://github.com/opencontainers/image-spec) / [runtime-spec](https://github.com/opencontainers/runtime-spec)
- [runc（OCI 参考实现）](https://github.com/opencontainers/runc)
- [containerd 官网](https://containerd.io/)
- [Docker Engine 文档](https://docs.docker.com/engine/)
- [Kubernetes Container Runtimes（CRI）](https://kubernetes.io/docs/concepts/architecture/cri/)
- 本篇进程树与命令输出：一套真实 Docker 实验机的观察（Linux 宿主机，容器内为 RocketMQ broker）
