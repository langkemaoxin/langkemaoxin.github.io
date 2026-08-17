---
title: 进程视角看容器——容器内外 PID 对照与生命周期
sidebarGroup: Docker 系列
shortTitle: 19 进程视角看容器
order: 19
date: 2026-08-18T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - PID Namespace
  - proc
description: 进程视角看容器——容器内外 PID 对照与生命周期
---

> **Docker 系列 · 第 19/24 篇**
> 上一篇：[《Namespace 隔离——容器如何「假装」自己是一台独立机器》](/云原生/docker/docker-15-namespace) · 下一篇：[《CGroups 限资源——防止一个容器吃光整台机器》](/云原生/docker/docker-16-cgroups)

---

## 开头：容器里 PID 是 1，宿主机上是几号？

你在容器里 `ps` 看到 nginx 的 PID 是 **1**，以为它是「整台机器的一号进程」。换到宿主机用 `docker top` 一看，同一个 master 却是 **10420**。

要回答的问题很具体：

1. 这两套数字怎么对上？  
2. `docker exec` 拉起的进程，父进程到底是谁？  
3. 杀掉「容器里的 PID 1」会发生什么？

**容器不是虚拟机**——它是宿主机（或 Desktop 里那台 Linux VM）上的普通进程，只是套了 PID 命名空间，看到的编号不同。

**前置**：[第 16 篇](/云原生/docker/docker-13-tech-foundation) 的底座总览，以及上一篇 [Namespace 隔离](/云原生/docker/docker-15-namespace)。本篇不再补原理，只做**本机对照实验**。若只想选「怎么进容器」，见[第 7 篇](/云原生/docker/docker-07-enter-container)；shim / runtime 完整调用链见[第 21 篇](/云原生/docker/docker-12-daemon-runtime)。

> **实验环境**（文中输出均来自本机）：Docker Client / Server **29.1.2**（Docker Desktop）。示例容器：`lab-proc`（`nginx:alpine`）、`lab-kill`（`alpine:3.21 sleep infinity`）。  
> **Desktop 注意**：`docker top` / `inspect` 的 PID 属于 **Linux 引擎（VM）**，不是 Windows 任务管理器里的 PID。看 `/proc`、cgroup 时，用 `docker run --rm --pid=host …` 进入同一 PID 视图（下文有命令）。

---

## 一、先跑起来

```bash
docker run -d --name lab-proc nginx:alpine
docker ps --filter name=lab-proc
```

本机：

```text
CONTAINER ID   IMAGE          STATUS         NAMES
b2e73a660658   nginx:alpine   Up …           lab-proc
```

后面所有对照都围着这一个实例转。

---

## 二、两边看进程：对上同一条 nginx

### 2.1 容器内

```bash
docker exec lab-proc ps -ef
```

本机（节选）：

```text
PID   USER     TIME  COMMAND
    1 root      0:00 nginx: master process nginx -g daemon off;
   30 nginx     0:00 nginx: worker process
  …
```

容器视角：master 是 **PID 1**。

### 2.2 宿主机视角：`docker top`

```bash
docker top lab-proc
```

本机（节选）：

```text
UID     PID    PPID   CMD
root    10420  10395  nginx: master process nginx -g daemon off;
statd   10456  10420  nginx: worker process
…
```

### 2.3 官方字段：`State.Pid`

```bash
docker inspect -f '{{.State.Pid}}' lab-proc
```

本机：`10420`。

| 视角 | nginx master | 说明 |
|------|--------------|------|
| 容器内 `ps` | PID **1** | 容器 PID 命名空间里的「一号进程」 |
| `docker top` / `State.Pid` | **10420** | 引擎宿主机（VM）上的真实 PID |
| 宿主机 PPID | **10395** | 本机是 `containerd-shim-runc-v2`（见第五节） |

**验收**：`State.Pid` 与 `docker top` 里 master 那一行的 PID 一致，且对应容器内的 PID 1。

---

## 三、为什么会这样？（PID Namespace，点到为止）

**是什么**：Linux **PID Namespace** 让一组进程拥有**独立的 PID 编号空间**。

**为什么**：这样每个容器都可以有自己的「PID 1」，彼此不撞号；同时它们仍是宿主机上的真实进程。

**直观结论**：

- 容器内 PID 1 ≠ 宿主机（或 VM）的 PID 1  
- 编号不同，**进程是同一个**  
- 默认每个容器一个独立 PID namespace  

更深的 `clone()` / 各类 Namespace，上一篇[第 18 篇](/云原生/docker/docker-15-namespace)已展开。本篇只要求你会「两边对照」。

---

## 四、用 `/proc` 核实：还是那个 nginx

在 Desktop 上不要去 Windows 里找 `/proc`；进引擎的 PID 命名空间即可：

```bash
PID=$(docker inspect -f '{{.State.Pid}}' lab-proc)   # 本机 10420

docker run --rm --pid=host --privileged alpine:3.21 sh -c "
  tr '\\0' ' ' < /proc/$PID/cmdline; echo
  ls -l /proc/$PID/exe /proc/$PID/ns/pid
"
```

本机结果：

```text
nginx: master process nginx -g daemon off;
… /proc/10420/exe -> /usr/sbin/nginx
… /proc/10420/ns/pid -> pid:[4026533167]
```

常用节点（按需查，不必背）：

| 路径 | 含义 |
|------|------|
| `cmdline` | 启动命令 |
| `exe` | 二进制 |
| `ns/pid` | 所属 PID 命名空间（inode 可判断「是否同一 ns」） |
| `cgroup` | 归属哪个 cgroup（见第七节） |

---

## 五、`docker exec` 再拉一个进程：PPID 是谁？

### 5.1 容器里起 `sleep`

```bash
docker exec -d lab-proc sleep 2000
docker exec lab-proc ps -ef
```

本机（节选）：

```text
PID   USER     TIME  COMMAND
    1 root      0:00 nginx: master process …
   56 root      0:00 sleep 2000
```

容器内：`sleep` 是 PID **56**（编号随当时进程表变化）。

### 5.2 宿主机再看

```bash
docker top lab-proc
```

本机与 sleep 相关的一行：

```text
UID    PID    PPID   CMD
root   10533  10395  sleep 2000
```

对照：

| | nginx master | sleep（exec 拉起） |
|--|--------------|-------------------|
| 容器内 PID | 1 | 56（本机当次） |
| 宿主机 PID | 10420 | 10533 |
| 宿主机 PPID | **10395** | **10395** |

两边 PPID 都是 **10395**，不是「容器里的 PID 1」。本机查进程名：

```text
10395  …  containerd-shim-runc-v2 -namespace moby -id b2e73a660658… 
10420  10395  nginx: master …
10533  10395  sleep 2000
```

**结论（怎么做层面）**：

- `exec` 出的进程进了**同一个容器的 PID namespace / cgroup**（所以 `docker top` 能看见）  
- 在宿主机进程树上，它们的父进程往往是 **shim**，不是容器内的 PID 1  

shim 为什么存在、和 dockerd/containerd/runc 的关系 → [第 21 篇](/云原生/docker/docker-12-daemon-runtime)。

---

## 六、杀掉「PID 1」：容器就结束了

另起一个简单容器（主进程就是 `sleep`，方便对照）：

```bash
docker run -d --name lab-kill alpine:3.21 sleep infinity
docker exec lab-kill ps -ef
# PID 1 = sleep infinity

PID=$(docker inspect -f '{{.State.Pid}}' lab-kill)
docker run --rm --pid=host --privileged alpine:3.21 kill -9 "$PID"
docker ps -a --filter name=lab-kill
```

本机：

```text
NAMES      STATUS
lab-kill   Exited (137) …
```

（137 常见于被 SIGKILL。）

**核心**：容器生命周期与**容器内 PID 1**绑定。PID 1 退出，这个容器就结束；里面其它进程一般也会随之清理。日常请用 `docker stop` / `docker kill`，不要习惯性在宿主机乱杀 PID——这里只为讲清关系。

---

## 七、cgroup：点到为止

本机引擎是 **cgroup v2**。对 `lab-proc` 的 master：

```bash
docker run --rm --pid=host --privileged alpine:3.21 \
  cat /proc/10420/cgroup
```

本机类似：

```text
0::/../b2e73a660658eed03b277755e5832542a63a2e5d86636ab67aa75cb08993e16e
```

路径里带着**完整容器 ID**——说明资源控制也挂在「这个容器」名下。老资料里的  

`/sys/fs/cgroup/memory/docker/<id>/`  

多为 **cgroup v1** 布局；你机器若是 v2，不要死抄旧路径。CPU/内存限额怎么配 → [第 20 篇](/云原生/docker/docker-16-cgroups)。

---

## 八、排障四步（可照抄）

```bash
# 1. 容器内看见什么
docker exec lab-proc ps -ef

# 2. 宿主机（引擎）PID 对照
docker top lab-proc
docker inspect -f '{{.State.Pid}}' lab-proc

# 3. /proc 核实（Desktop 用 --pid=host）
PID=$(docker inspect -f '{{.State.Pid}}' lab-proc)
docker run --rm --pid=host --privileged alpine:3.21 \
  ls -l /proc/$PID/exe /proc/$PID/ns/pid

# 4. 父进程是不是 shim
docker run --rm --pid=host --privileged alpine:3.21 \
  ps -o pid,ppid,args -p $(docker top lab-proc | awk 'NR==2{print $2","$3}')
```

清理实验：

```bash
docker rm -f lab-proc lab-kill
```

---

## 九、和系列其它篇的分工

| 你想搞清楚的事 | 去哪篇 |
|----------------|--------|
| exec / attach / nsenter 怎么选 | [第 7 篇](/云原生/docker/docker-07-enter-container) |
| 容器内外 PID、exec 的 PPID、杀 PID 1（本篇） | 本文 |
| dockerd → containerd → shim → runc | [第 21 篇](/云原生/docker/docker-12-daemon-runtime) |
| Namespace 隔离原理（上一篇） | [第 18 篇](/云原生/docker/docker-15-namespace) |
| Cgroups 限资源 | [第 20 篇](/云原生/docker/docker-16-cgroups) |

---

## 小结

- 容器 = 带 namespace（和 cgroup）的**进程组**，不是微型虚拟机。  
- **同一进程两套 PID**：容器内常见 1；`State.Pid` / `docker top` 是引擎宿主机上的号。  
- `docker exec` 进同一 namespace，但宿主机树上父进程常常是 **shim**。  
- **PID 1 退出 → 容器退出**。  
- Desktop 看 `/proc` 用 `--pid=host`；cgroup 以本机 v1/v2 实际路径为准。

---

## 思考题

> 为什么 `containerd-shim` 在 runc 把容器拉起来之后可以退出「创建动作」，却仍留下一个 shim 进程陪着容器？若没有 shim，dockerd 升级时已运行的容器会怎样？

提示：垫片负责 IO/状态与生命周期解耦——展开见第 21 篇。

下一篇见 🐳
