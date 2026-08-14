---
title: 进入 Docker 容器的四种方式——以及六大命名空间
sidebarGroup: Docker 系列
shortTitle: 07 进入容器四法
order: 7
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Namespace
  - nsenter
description: 进入 Docker 容器的四种方式——以及六大命名空间
---

> **Docker 系列 · 第 7/23 篇**  
> 上一篇：[《容器日常命令》](/云原生/docker/docker-06-container-commands)  
> 下一篇：[《Docker 本地镜像载入与载出》](/云原生/docker/docker-08-image-transfer)

---

## 开头：容器跑起来了，怎么进去排障？

凌晨 2 点，告警说某个微服务容器「连不上数据库」。你 `docker ps` 看到容器还在跑，但 `curl` 健康检查失败。

接下来你要做三件事：

1. **进到容器里** —— 看进程、看配置、看日志
2. **在宿主机上对照** —— 容器里的 PID 1 在宿主机上是几号进程？
3. **必要时只进网络命名空间** —— 用宿主机的 `ping`、`tcpdump` 调试容器网络

Docker 提供了多种「进入容器」的手段，适用场景各不相同。本文按 PDF 原文梳理四种方式，并深入讲解 Docker 隔离依赖的 **六大 Linux 命名空间**。

---

## 一、方式 1：`docker attach`

`docker attach` 可以附加到**已在运行的容器**的标准输入/输出/错误流上。

```bash
# 先启动一个守护态容器
docker run -itd ubuntu:14.04 /bin/bash

# 查看容器 ID
docker ps

# 附加到容器
docker attach <容器ID>
```

### 局限性

- **多窗口同步**：多个终端同时 `attach` 同一容器时，所有窗口输出同步；一个窗口阻塞，其他窗口也无法操作
- **不适合生产**：更适合本地开发调试

---

## 二、方式 2：SSH 进入容器

传统做法是在镜像里安装 SSH Server，多人通过 SSH 登录，互不干扰。

**不推荐在 Docker 场景使用**：

- 容器设计理念是「一个进程/一组紧密相关进程」，SSH 守护进程增加复杂度
- 镜像体积变大，攻击面扩大
- 官方推荐用 `docker exec` 或 `nsenter`

---

## 三、方式 3：`nsenter`——按命名空间精准进入

### 3.1 什么是 nsenter？

`nsenter` 来自 `util-linux` 包，可以在**指定进程的命名空间**下运行程序。

典型场景：很多精简镜像没有 `ip`、`ping`、`ss`、`tcpdump` 等网络工具。此时可以只进入容器的 **net 命名空间**，在宿主机上用完整工具集调试网络。

```bash
nsenter --help
```

常用选项：

| 选项 | 含义 |
|------|------|
| `-t, --target pid` | 目标进程的 PID |
| `-m, --mount` | 进入 mount 命名空间（文件系统视图） |
| `-u, --uts` | 进入 UTS 命名空间（主机名/域名） |
| `-i, --ipc` | 进入 IPC 命名空间（信号量、消息队列、共享内存） |
| `-n, --net` | 进入 network 命名空间 |
| `-p, --pid` | 进入 PID 命名空间 |
| `-U, --user` | 进入 user 命名空间 |

### 3.2 安装 nsenter（宿主机）

若系统未预装，可从源码编译：

```bash
wget https://www.kernel.org/pub/linux/utils/util-linux/v2.24/util-linux-2.24.tar.gz
tar -xzvf util-linux-2.24.tar.gz
cd util-linux-2.24/
./configure --without-ncurses
make nsenter
sudo cp nsenter /usr/local/bin
```

### 3.3 获取容器首个进程的 PID

```bash
docker inspect -f '{{.State.Pid}}' <容器ID>
```

### 3.4 进入容器的完整命名空间

```bash
# 假设 PID 为 22299
sudo nsenter --target 22299 --mount --uts --ipc --net --pid
```

参数含义：

- `--mount`：文件系统视图
- `--uts`：独立 hostname
- `--ipc`：进程间通信隔离
- `--net`：独立网络栈
- `--pid`：独立进程 ID 空间

### 3.5 只进入网络命名空间

```bash
sudo nsenter -t 3473 -n netstat | grep ESTABLISHED
```

在容器 net 命名空间内执行 `netstat`，看到的 IP 地址与宿主机不同——这就是网络隔离的效果。

### 3.6 查看 Docker 容器 ESTABLISHED 连接

Docker 容器的 ESTABLISHED 连接不会出现在宿主机的 `netstat` 里。需要进入容器 net 命名空间：

```bash
PID=$(docker inspect -f '{{.State.Pid}}' <容器ID>)
sudo nsenter -t $PID -n netstat | grep ESTABLISHED
```

---

## 四、Docker 隔离的六大命名空间

Linux Namespace 是容器隔离的基石。Docker 默认使用以下六种：

### 4.1 PID 命名空间（进程 ID）

- 不同 PID 命名空间中的进程 ID **相互独立**，不同空间可以有相同 PID
- 容器内所有进程的「父进程」在宿主机视角下是 Docker 相关进程
- 支持**嵌套**：可以在容器里再跑 Docker（Docker in Docker）

### 4.2 NET 命名空间（网络）

- 每个 net 命名空间有独立的：网络设备、IP 地址、路由表、`/proc/net`
- Docker 默认用 **veth pair** 将容器虚拟网卡连接到宿主机 **docker0 网桥**

### 4.3 IPC 命名空间（进程间通信）

- 容器内进程间通信仍使用 Linux IPC：信号量、消息队列、共享内存
- 与 VM 不同，容器 IPC 实际发生在 host 上同一 PID 命名空间的进程之间
- 每个 IPC 资源有唯一 32 位 ID，申请时需带上命名空间信息

### 4.4 MNT 命名空间（挂载/文件系统）

- 类似 `chroot`，让进程看到不同的文件目录树
- 与 chroot 不同：每个命名空间在 `/proc/mounts` 中只显示**本空间**的 mount point

### 4.5 UTS 命名空间（主机名/域名）

- UTS = UNIX Time-sharing System
- 每个容器可有独立 `hostname` 和 `domainname`
- 在网络上可被视作**独立节点**，而非宿主机上的一个进程

### 4.6 USER 命名空间（用户）

- 容器内可以有与宿主机不同的 UID/GID
- 可在容器内用「容器用户」执行程序，而非宿主机用户

---

## 五、方式 4：`docker exec`（推荐）

Docker 1.3+ 提供 `exec`，是**生产环境最常用**的进入方式：

```bash
docker exec --help

# 进入交互式 shell
docker exec -it <容器ID> /bin/bash

# 在容器内执行单条命令
docker exec -it rmqbroker-ha-b /bin/bash -c "ps -ef"
```

优点：

- 不依赖 attach 的 IO 共享问题
- 每次 exec 启动新进程，多人可同时操作
- 可指定进入容器的 PID 命名空间执行应用

---

## 六、容器内外进程对照

### 6.1 容器内看进程

```bash
docker exec -it rmqbroker-ha-b /bin/bash
ps -ef
```

容器内 PID 1 通常是启动命令（如 `sh mqbroker -c /opt/rocketmq.../broker.conf`），具有特殊意义——容器生命周期与 PID 1 绑定。

### 6.2 宿主机看同一批进程

```bash
docker top rmqbroker-ha-b
```

示例输出：容器内 PID 1 的 `mqbroker` 进程，在宿主机上可能是 PID 3473。

### 6.3 三个关键命令

```bash
docker top rmqbroker-ha-b    # 从宿主机看容器进程
ps -ef | grep 3401           # 查看父进程 containerd-shim
ps aux | grep 3473           # 查看子进程（容器内应用）
```

### 6.4 进程树关系

`docker run` 启动容器时，Docker 会为每个容器启动 **containerd-shim-runc-v2** 作为父进程：

```
containerd-shim-runc-v2  (宿主机 PID 3401)
  └── sh mqbroker ...     (宿主机 PID 3473，容器内 PID 1)
```

- `namespace` 参数：命名空间隔离
- `cgroup` 参数：资源限制

**容器的本质是进程**——shim 跑在特定 namespace 和 cgroup 下，以为自己在一台独立机器上。

---

## 七、四种方式对比

| 方式 | 适用场景 | 生产推荐 |
|------|----------|----------|
| `docker attach` | 本地快速调试 | ❌ |
| SSH | 传统 VM 思维 | ❌ |
| `nsenter` | 网络/命名空间级调试 | ⚠️ 高级场景 |
| `docker exec` | 日常运维、排障 | ✅ |

---

## 下篇预告

**第 8 篇：《Docker 本地镜像载入与载出》**

- `docker save` / `docker load` 与 `docker export` / `docker import` 的区别
- 离线搬运镜像、`docker tag` 重命名

---

## 思考题

> 容器里没有 `ping` 命令，你如何测试它能否访问外网？（提示：`nsenter -n`）

欢迎在评论区留下你的做法。下一篇见 🐳
