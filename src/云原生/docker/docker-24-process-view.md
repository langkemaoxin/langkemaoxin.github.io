---
title: 进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1
sidebarGroup: Docker 系列
shortTitle: 24 进程视角看容器
order: 24
date: 2026-08-18T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - PID Namespace
  - proc
description: 同一台机器、两种视角：容器里 ps 看自己是 PID 1，宿主机 docker top 却说是 10420。九个雪球滚出 PID namespace 双编号、/proc 证据、shim 父进程、杀 PID 1 的信号真相和 cgroup 归属。
---

> **Docker 系列 · 第 24/33 篇**
> 上一篇：[《Docker Daemon 与 runtime——一条 docker run 经过了谁的手》](/云原生/docker/docker-23-daemon-runtime) · 下一篇：[《容器安全——同一个容器，从 --privileged 全裸滚到最小权限》](/云原生/docker/docker-25-container-security)

---

## 开头：容器里说 nginx 是 1 号，宿主机说它是 10420

你在容器里敲 `ps`，nginx master 的 PID 是 **1**，一副「我是这台机器一号进程」的架势。换到宿主机用 `docker top` 一看，同一个 master 却是 **10420**。两套数字，谁对？难道起了两个 nginx？

这只是开头，顺着查下去还会撞上三个更实际的问题：

1. 这两套数字怎么对上？（雪球 2 揭晓）
2. `docker exec` 拉起的进程，父进程到底是谁？（雪球 6 揭晓）
3. 杀掉「容器里的 PID 1」会发生什么？（雪球 7 亲眼看到）

根因一句话：**容器不是虚拟机**——它是宿主机（Desktop 里则是那台 Linux VM）上的普通进程，只是套了 PID 命名空间，两边看到的编号不同。本篇不先背概念，就围着**同一个 nginx 容器**，用「同一台机器、两种视角」把雪球一路滚下去：

| 雪球 | 加上去的 | 当场能看见的效果 |
|------|----------|------------------|
| **1** | 容器内视角：`ps -ef` 看自己 | nginx master 是 PID 1，worker 挂它下面 |
| **2** | 宿主机视角：`docker top` + `State.Pid` | 同一个 master 变成 10420，两套号对上 |
| **3** | 解释模型：PID Namespace | 「两套编号、同一个进程」说得通了 |
| **4** | 内核证据：`/proc` | `cmdline`、`exe`、`ns/pid` 指向同一个 nginx |
| **5** | 父子关系：PPID | 两边进程树形状一样，只是换了号 |
| **6** | `docker exec` 再拉一个进程 | 它在宿主机上的爸爸是 shim，不是 PID 1 |
| **7** | 信号：杀掉容器内 PID 1 | 容器当场 `Exited (137)` |
| **8** | cgroup 归属 | `/proc/PID/cgroup` 路径里是完整容器 ID |
| **9** | 汇总：排障四步 | 一份可照抄的排查手册 |

**前置**：[第 19 篇](/云原生/docker/docker-19-tech-foundation) 的底座总览，以及上一篇 [Namespace 隔离](/云原生/docker/docker-20-namespace)。本篇不再补原理，只做**本机对照实验**。若只想选「怎么进容器」，见[第 7 篇](/云原生/docker/docker-07-enter-container)；shim / runtime 完整调用链见[第 23 篇](/云原生/docker/docker-23-daemon-runtime)。

> **实验环境**（文中输出均来自本机）：Docker Client / Server **29.1.2**（Docker Desktop）。示例容器：`lab-proc`（`nginx:alpine`）、`lab-kill`（`alpine:3.21 sleep infinity`）。  
> **Desktop 注意**：`docker top` / `inspect` 的 PID 属于 **Linux 引擎（VM）**，不是 Windows 任务管理器里的 PID。看 `/proc`、cgroup 时，用 `docker run --rm --pid=host …` 进入同一 PID 视图（下文有命令）。

官方入口：[docker top](https://docs.docker.com/reference/cli/docker/container/top/)、[docker run 的 `--pid` / `--init`](https://docs.docker.com/reference/cli/docker/container/run/)、[docker stop](https://docs.docker.com/reference/cli/docker/container/stop/)。

---

## 雪球 1：容器里看自己——nginx master 是 1 号进程

先把实验对象跑起来，确认它活着：

```bash
docker run -d --name lab-proc nginx:alpine
docker ps --filter name=lab-proc
```

本机：

```text
CONTAINER ID   IMAGE          STATUS         NAMES
b2e73a660658   nginx:alpine   Up …           lab-proc
```

`b2e73a660658` 是完整容器 ID 的前 12 位（雪球 8 还会再见到它）；`Up …` 表示刚起正在跑；名字就是指定的 `lab-proc`。后面所有对照都围着这一个实例转。

第一视角：**钻进容器里看自己**。

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

逐行读：容器里的 **1 号进程**是 `nginx: master process nginx -g daemon off;`——`daemon off` 是官方镜像故意带的参数，让 master 别 fork 完就躲到后台，老老实实当 1 号（1 号退了会怎样，雪球 7 见）。`30 nginx worker` 是它拉起来的工作进程，跑在 `nginx` 用户下；结尾的 `…` 是节选号，worker 还有好几个。

刚冒出来的「容器视角」，立刻钉成一张小图：

```text
容器视角（lab-proc 自己的 PID namespace）
PID 1      nginx: master process     ← 一号进程
└─ PID 30  nginx: worker process    ← master 的孩子（节选，还有兄弟）
```

在容器里看，这真像一台独立小机器：编号从 1 开始，master 是老大。一个小细节：alpine 的 busybox `ps` 没给 PPID 列——容器内的父子关系，雪球 5 拿宿主机的输出补上。

---

## 雪球 2：换到宿主机看——同一个 master，编号 10420

第二视角：**站在引擎（Desktop 的那台 Linux VM）上看**。

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

还是那个 master，`docker top` 说它 PID 是 **10420**。再看 worker 那行：UID 显示 `statd`，容器里明明是 `nginx`——UID 是拿**宿主机（VM）的用户库**查出来的名字，同一个 uid 数字，两边查到的名字不同，人还是那个人。worker 的 PID 是 10456，它的 PPID 正好是 10420（这条线索雪球 5 用）。

Docker 还给了官方换算口：`State.Pid`。

```bash
docker inspect -f '{{.State.Pid}}' lab-proc
```

本机：`10420`。

**验收**：`State.Pid` = `docker top` 里 master 那行的 PID = 容器内的 PID 1。对上了，同一个进程、两个号：

| 视角 | nginx master | 说明 |
|------|--------------|------|
| 容器内 `ps` | PID **1** | 容器 PID 命名空间里的「一号进程」 |
| `docker top` / `State.Pid` | **10420** | 引擎宿主机（VM）上的真实 PID |
| 宿主机 PPID | **10395** | 本机是 `containerd-shim-runc-v2`（雪球 6 揭晓身份） |

```text
同一个 nginx master，两边各有一个号：

容器 PID ns：PID 1                    ← docker exec lab-proc ps -ef
引擎 VM：    PID 10420（PPID 10395）  ← docker top / State.Pid
```

---

## 雪球 3：为什么两个号都对——PID Namespace

现象有了（1 对 10420），模型跟上：

**是什么**：Linux **PID Namespace** 让一组进程拥有**独立的 PID 编号空间**。

**为什么**：这样每个容器都可以有自己的「PID 1」，彼此不撞号；同时它们仍是宿主机上的真实进程。

**直观结论**：

- 容器内 PID 1 ≠ 宿主机（或 VM）的 PID 1
- 编号不同，**进程是同一个**（雪球 4 拿内核证据钉死它）
- 默认每个容器一个独立 PID namespace

**怎么做（两边对照）**：容器里 `ps -ef` 拿「内编号」，`docker top` / `State.Pid` 拿「外编号」，`inspect` 就是那张换算表。往后排障，永远先问一句「你说的是哪套号」。

更深的 `clone()` / 各类 Namespace，上一篇[第 20 篇](/云原生/docker/docker-20-namespace)已展开，本篇只要求你会「两边对照」。

---

## 雪球 4：拿 /proc 把「同一个进程」钉死

说「编号不同、进程同一个」，光嘴说不算，去内核里翻证据。Desktop 上不要去 Windows 里找 `/proc`——借 `--pid=host` 起个一次性容器，直接用**引擎的 PID 视图**：

```bash
PID=$(docker inspect -f '{{.State.Pid}}' lab-proc)   # 本机 10420

docker run --rm --pid=host --privileged alpine:3.21 sh -c "
  tr '\\0' ' ' < /proc/$PID/cmdline; echo
  ls -l /proc/$PID/exe /proc/$PID/ns/pid
"
```

命令拆开：先拿 `State.Pid` 存成 `$PID`（本机 10420）；`--pid=host` 让这个临时容器共用引擎的 PID namespace，里面才看得见 10420 号；`--privileged` 补上读别人 `/proc` 的权限；`tr` 那行把 `cmdline` 里分隔参数的 NUL 换成空格（双引号里写 `\\0`，宿主 shell 先折叠成 `\0`，正好是 `tr` 认的 NUL 转义）。

本机结果：

```text
nginx: master process nginx -g daemon off;
… /proc/10420/exe -> /usr/sbin/nginx
… /proc/10420/ns/pid -> pid:[4026533167]
```

三行三个证据：`cmdline` 和雪球 1 容器里看到的 COMMAND **一字不差**；`exe` 指向 `/usr/sbin/nginx`，二进制就这一个；`ns/pid` 给出 `pid:[4026533167]`，这个 inode 就是雪球 3 说的「独立编号空间」在内核里的实体——两个进程的 `ns/pid` inode 相同，才算同一个 namespace。

常用节点（按需查，不必背）：

| 路径 | 含义 |
|------|------|
| `cmdline` | 启动命令 |
| `exe` | 二进制 |
| `ns/pid` | 所属 PID 命名空间（inode 可判断「是否同一 ns」） |
| `cgroup` | 归属哪个 cgroup（雪球 8 用） |

---

## 雪球 5：把 worker 也对上——父子关系两边一个样

这一球不敲新命令，把雪球 1、2 的两份输出并排放，只加看一层新东西：**PPID（父子关系）**。

- 容器里：master 是 1，worker 是 30（busybox `ps` 没给 PPID 列）
- 宿主机上：master 10420（PPID 10395），worker 10456（PPID **10420**）

worker 的 PPID 正是 master 的宿主机 PID。也就是说：容器里 worker 挂在 1 号下面，宿主机上 10456 挂在 10420 下面——**父子关系不随视角变，变的只有编号**：

```text
容器视角                        宿主机（引擎 VM）视角
PID 1      master              PID 10420 master（PPID 10395）
└─ PID 30  worker             └─ PID 10456 worker（PPID 10420）
```

两棵树形状一模一样。还有个不对称值得记：容器里的 `ps` 只看得到自己 namespace 里的进程，引擎那边却看得到所有容器——`docker top` 看得见你，你看不见别人，隔离是单向的（原理见[第 20 篇](/云原生/docker/docker-20-namespace)）。

接下来自然要问：新来的进程会挂在这棵树的哪儿？这正是 `docker exec` 的问题，下一球揭晓。

---

## 雪球 6：`docker exec` 再拉一个进程——它爸爸是谁？

往 lab-proc 里用 `exec` 塞一个 `sleep`（`-d` 表示后台跑，不占终端；exec / attach / nsenter 怎么选，[第 7 篇](/云原生/docker/docker-07-enter-container) 讲过）：

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

容器视角：`sleep` 拿到了 PID **56**（编号随当时进程表变化，你机器上多半不是这个数）。

宿主机再看：

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

有意思的地方来了：`sleep` 的宿主机 PPID 是 **10395**，不是 10420——**它的爸爸不是容器里的 PID 1**。10395 是谁？本机查进程名：

```text
10395  …  containerd-shim-runc-v2 -namespace moby -id b2e73a660658… 
10420  10395  nginx: master …
10533  10395  sleep 2000
```

`containerd-shim-runc-v2`，参数里的 `-id b2e73a660658…` 正是 lab-proc 的容器 ID。master 和 exec 来的 sleep，在宿主机进程树上都挂在这个 shim 下面：

```text
引擎 VM 进程树（宿主机视角）
containerd-shim-runc-v2（PID 10395）
├─ nginx master（10420）   ← 容器内 PID 1
└─ sleep 2000（10533）     ← 容器内 PID 56，exec 拉起
```

**结论（怎么做层面）**：

- `exec` 出的进程进了**同一个容器的 PID namespace / cgroup**（所以 `docker top` 能看见，容器里 `ps` 也看得见）
- 但在宿主机进程树上，它们的父进程往往是 **shim**，不是容器内的 PID 1

shim 为什么存在、和 dockerd / containerd / runc 什么关系 → [第 23 篇](/云原生/docker/docker-23-daemon-runtime)（思考题也埋在这）。

---

## 雪球 7：杀掉容器里的 PID 1——容器当场没了

开头第三个问题：动 1 号会怎样？nginx master 不好单独摆弄，另起一个主进程就是 `sleep` 的容器，1 号看得明明白白：

```bash
docker run -d --name lab-kill alpine:3.21 sleep infinity
docker exec lab-kill ps -ef
# PID 1 = sleep infinity

PID=$(docker inspect -f '{{.State.Pid}}' lab-kill)
docker run --rm --pid=host --privileged alpine:3.21 kill -9 "$PID"
docker ps -a --filter name=lab-kill
```

照注释走：容器里 `ps -ef` 确认 PID 1 就是 `sleep infinity` 本人；`State.Pid` 换算出宿主机 PID；`kill -9` 杀的就是这一个人；再看容器状态：

```text
NAMES      STATUS
lab-kill   Exited (137) …
```

`Exited (137)`。137 = 128 + 9——「退出码 128 + 信号编号」是固定套路，9 号信号是 SIGKILL，和我们的 `kill -9` 正好对上。

顺带把「停止容器」的信号真相说全（依据官方 [docker stop 参考](https://docs.docker.com/reference/cli/docker/container/stop/)）：

| 动作 | 实际发生什么 |
|------|--------------|
| `docker stop` | 给**容器内 PID 1** 发 SIGTERM，默认等 10 秒，没退再 SIGKILL |
| `docker kill` | 直接 SIGKILL，没有商量 |
| 本球的 `kill -9 宿主机PID` | 效果同 SIGKILL，但绕过了 Docker 的管理面——仅实验用 |

**核心**：容器生命周期与**容器内 PID 1**绑定。PID 1 退出，这个容器就结束；同 namespace 里的其它进程会被内核一并清掉。日常请用 `docker stop` / `docker kill`，不要习惯性在宿主机乱杀 PID——这里只为讲清关系。

补一句背景知识：正因为 PID 1 的位置特殊（收信号、回收子进程都和普通进程不一样），有些镜像会让 init 程序（如 tini）来当 1 号，`docker run --init` 就是让 Docker 替你垫一个——转发信号、收僵尸，见 [run 参考](https://docs.docker.com/reference/cli/docker/container/run/)。

---

## 雪球 8：资源账单也挂着这个容器——cgroup 一眼

namespace 管「看得见谁」，cgroup 管「用得了多少」（这套分工[第 19 篇](/云原生/docker/docker-19-tech-foundation) 讲过）。看看这个 nginx 的资源账单挂在哪。本机引擎是 **cgroup v2**，还是借 `--pid=host` 的视角，对 `lab-proc` 的 master：

```bash
docker run --rm --pid=host --privileged alpine:3.21 \
  cat /proc/10420/cgroup
```

本机类似：

```text
0::/../b2e73a660658eed03b277755e5832542a63a2e5d86636ab67aa75cb08993e16e
```

开头 `0::` 是 cgroup v2 统一层级的写法；路径里那串长十六进制就是**完整容器 ID**——和雪球 1、2 里的 `b2e73a660658` 对上了。资源控制同样挂在「这个容器」名下。CPU/内存限额怎么配 → [第 21 篇](/云原生/docker/docker-21-cgroups)（下一篇）。

---

## 雪球 9：排障四步——收成一份照抄手册

九个雪球滚完，把主线收成四步，下次「容器里进程不对劲」直接照抄：

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

四步对应的正是前面几球：

1. **容器内看见什么**——雪球 1 的内视角
2. **宿主机 PID 对照**——雪球 2 的换算（`docker top` + `State.Pid`）
3. **/proc 核实**——雪球 4 的证据（Desktop 用 `--pid=host`）
4. **父进程是不是 shim**——雪球 6 的问题（`awk` 取 `docker top` 表头下一行的 PID、PPID，再 `ps` 一次看真身）

实验完清场：

```bash
docker rm -f lab-proc lab-kill
```

---

## 怎么记：每条命令在哪一球用过

| 动作 | 命令 | 哪一球用过 |
|------|------|-----------|
| 起实验容器 | `docker run -d --name lab-proc nginx:alpine` | 1 |
| 容器内看自己 | `docker exec <容器> ps -ef` | 1、6 |
| 宿主机对照 | `docker top <容器>` | 2、6 |
| 拿官方 PID | `docker inspect -f '{{.State.Pid}}' <容器>` | 2、7 |
| 进引擎 PID 视图 | `docker run --rm --pid=host --privileged …` | 4、8、9 |
| 内核证据 | `ls -l /proc/$PID/exe /proc/$PID/ns/pid` | 4、9 |
| 看资源归属 | `cat /proc/$PID/cgroup` | 8 |
| 亲手杀（仅实验） | `kill -9 "$PID"` | 7 |
| 清场 | `docker rm -f lab-proc lab-kill` | 9 |

记不住命令就记问题链：**容器里看到啥 → 引擎上是几号 → 内核里对不对得上 → 它爸爸是谁**。

---

## 历史包袱：两处老资料别照抄

1. **cgroup v1 老路径**。老教程常写 `/sys/fs/cgroup/memory/docker/<id>/`，那是 v1 布局（每个控制器一棵树）。本机雪球 8 的输出是 `0::` 开头的 v2 统一层级。判断方法就一条：`cat /proc/PID/cgroup`，以本机实际输出为准。
2. **「容器进程的父进程是 dockerd」**。Docker 1.11（2016）引入 containerd-shim 之前确实如此；如今本机实测父进程是 `containerd-shim-runc-v2`（雪球 6 的输出为证）。

---

## 和系列其它篇的分工

| 你想搞清楚的事 | 去哪篇 | 在这条路上出现的位置 |
|----------------|--------|----------------------|
| exec / attach / nsenter 怎么选 | [第 7 篇](/云原生/docker/docker-07-enter-container) | 雪球 6 的 `exec -d` |
| 容器内外 PID、exec 的 PPID、杀 PID 1（本篇） | 本文 | 全程九球 |
| dockerd → containerd → shim → runc | [第 23 篇](/云原生/docker/docker-23-daemon-runtime) | 雪球 6 的 10395、思考题 |
| Namespace 隔离原理 | [第 20 篇](/云原生/docker/docker-20-namespace)（上一篇） | 雪球 3、5 |
| Cgroups 限资源 | [第 21 篇](/云原生/docker/docker-21-cgroups)（下一篇） | 雪球 8 |
| 技术底座总览 | [第 19 篇](/云原生/docker/docker-19-tech-foundation) | 开头前置 |

---

## 小结

同一台机器、两种视角，九球滚完：

1. **容器内视角**：master 是 PID 1，worker 挂它下面——「独立小机器」的错觉就来自这。  
2. **宿主机视角**：`docker top` / `State.Pid` 说它是 10420；同一进程、两套编号。  
3. **PID Namespace**：每个容器独立编号空间；编号不同、进程同一个。  
4. **/proc 证据**：`cmdline`、`exe`、`ns/pid` 把「同一个进程」钉死；Desktop 用 `--pid=host`。  
5. **父子关系**：两边进程树形状一样（1→30 对 10420→10456）；容器看不见别人，引擎看得见全部。  
6. **exec 的爸爸**：进了同一 namespace / cgroup，宿主机上父进程却是 shim（10395），不是容器 PID 1。  
7. **杀 PID 1**：容器当场 `Exited (137)`；stop 是 SIGTERM→10 秒→SIGKILL；生命周期绑容器内 PID 1。  
8. **cgroup 归属**：`/proc/PID/cgroup` 路径里是完整容器 ID；v1 老路径别死抄。  
9. **排障四步**：容器内 → 引擎编号 → /proc → 父进程，照抄能用。

**思考题**：

1. 为什么 `containerd-shim` 在 runc 把容器拉起来之后可以退出「创建动作」，却仍留下一个 shim 进程陪着容器？若没有 shim，dockerd 升级时已运行的容器会怎样？（提示：垫片负责 IO/状态与生命周期解耦——展开见[第 23 篇](/云原生/docker/docker-23-daemon-runtime)。）
2. 两个容器里各有一个 PID 1，宿主机上会撞号吗？用雪球 3 的模型和雪球 5 的两棵树推一推。

下一篇：[《CGroups 限资源——给同一个容器逐项上枷锁》](/云原生/docker/docker-21-cgroups)。

---

## 参考资料

- [docker top（CLI 参考）](https://docs.docker.com/reference/cli/docker/container/top/)
- [docker container run（`--pid`、`--init`）](https://docs.docker.com/reference/cli/docker/container/run/)
- [docker container exec](https://docs.docker.com/reference/cli/docker/container/exec/)
- [docker container stop（SIGTERM / SIGKILL、默认 10 秒）](https://docs.docker.com/reference/cli/docker/container/stop/)
- [pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)、[proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)
- 本机：Docker Client / Server 29.1.2（Docker Desktop，Linux 引擎 VM）
