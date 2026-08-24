---
title: 进入 Docker 容器的四种方式——exec、attach、SSH 与 nsenter
sidebarGroup: Docker 系列
shortTitle: 07 进入容器四法
order: 7
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - docker exec
  - nsenter
description: 进入 Docker 容器的四种方式——exec、attach、SSH 与 nsenter
---

> **Docker 系列 · 第 7/33 篇**
> 上一篇：[《容器日常命令——run、ps、stop、exec 与常用运维》](/云原生/docker/docker-06-container-commands) · 下一篇：[《Docker 本地镜像载入与载出——离线环境的镜像搬运术》](/云原生/docker/docker-08-image-transfer)

---

## 开头：容器跑起来了，怎么进去排障？

凌晨 2 点，告警说某个微服务容器「连不上数据库」。你 `docker ps` 看到容器还在跑，但健康检查失败。

接下来常见三种动作：

1. **进到容器里** —— 看进程、看配置、跑一条探测命令
2. **只借网络视图** —— 容器镜像太瘦，没有 `ping`/`tcpdump`，想用宿主机工具看容器网络
3. **搞清别用错入口** —— `attach`、SSH、`exec`、`nsenter` 适用场景完全不同

第 6 篇已点过 `docker exec`；本篇把**进入容器的四种方式**讲清、讲对比。Namespace 原理见[第 20 篇](/云原生/docker/docker-20-namespace)；容器内外 PID / shim 对照见[第 24 篇](/云原生/docker/docker-24-process-view)。

> **实验环境**：Docker Client / Server **29.1.2**（Docker Desktop）。日常 `exec`/`attach` 用 `nginx:alpine` 即可。`nsenter` 需能访问 **Linux 内核命名空间**（本机 WSL2 / Linux 宿主机；纯 Windows 引擎里通常不可用）——前置概念见 [Linux · nsenter 前置知识](/Linux/basics/linux-01-nsenter-prerequisites)。

---

## 一、方式 1：`docker exec`（推荐）

在**已运行**的容器里再起一个进程。日常运维首选。

```bash
docker run -d --name demo-nginx -p 8080:80 nginx:alpine

# 执行单条命令（不必 -it）
docker exec demo-nginx nginx -v

# 交互式 shell（alpine 多为 sh，不一定有 bash）
docker exec -it demo-nginx sh
```

要点：

| 点 | 说明 |
|----|------|
| 与主进程关系 | 每次 `exec` 是**新进程**，不抢主进程的 stdin/stdout |
| 多人同时用 | 可以；各开各的 shell，互不「抢键盘」 |
| `-i` / `-t` | 交互 shell 用 `-it`；跑完即退的单条命令通常不需要 |
| 镜像过瘦 | 没有 `bash`/`ping` 时换 `sh`，或改用下文 `nsenter -n` 借宿主机工具 |

第 6 篇生命周期线里的「进容器执行」就是这一招；本篇只补场景取舍。

退出 shell：`exit` 或 `Ctrl+D`——**只结束本次 exec 进程，不会停掉容器**。

---

## 二、方式 2：`docker attach`

`attach` 把当前终端挂到容器**主进程**的标准输入/输出/错误流上——附着的是「已经在跑的那个进程」，不是新开一个。

```bash
# 演示：前台式主进程用 bash，方便感受 attach
docker run -itd --name demo-attach alpine:3.21 sh

docker attach demo-attach
# 此时你的键盘输入会进到容器里那个 sh
```

### 局限性（为什么生产少用）

- **多窗口同步**：多个终端同时 `attach` 同一容器时，输出往往一起刷；一个窗口卡住，体验会互相干扰
- **容易误伤主进程**：在 attach 会话里乱按退出键，可能直接影响主进程（容器随之退出）——交互调试要格外小心
- **更适合本地**：快速看一眼前台进程 IO；排障开 shell 优先用 `exec`

脱离会话且尽量不杀主进程：常见是 `Ctrl+P` 再 `Ctrl+Q`（取决于 TTY/`-t` 是否启用）。拿不准时，优先改用 `exec`，少用 `attach` 当「进 shell」的手段。

清理演示：`docker rm -f demo-attach`。

---

## 三、方式 3：SSH 进入容器（不推荐）

传统 VM 思维：镜像里装 `sshd`，多人 SSH 登录。

**Docker 场景一般不要这么干：**

- 容器理念是「一个主进程 / 一组紧密相关进程」，再挂一个 SSH 守护进程增加复杂度
- 镜像变大、密钥与端口暴露面变大
- 官方与社区惯例：用 `docker exec`（或必要时 `nsenter`）

若你「只是想进去敲命令」——直接 `exec`，别为排障专门做带 SSH 的业务镜像。

---

## 四、方式 4：`nsenter`——按命名空间精准进入

`nsenter`（`util-linux`）可以在**指定进程所属的命名空间**里跑程序。典型价值：

> 精简镜像没有 `ip` / `ping` / `ss` / `tcpdump`，你又只想看**容器的网络视图**，不想把调试工具打进业务镜像。

### 4.1 常用选项

| 选项 | 含义 |
|------|------|
| `-t, --target pid` | 目标进程在**宿主机**上的 PID |
| `-m` / `-u` / `-i` / `-n` / `-p` / `-U` | 分别进入 mount / uts / ipc / **net** / pid / user 命名空间 |

宿主机没有命令时，用发行版包装上即可（例如 `apt install util-linux`），不必从古早源码编译。选项与内核概念的系统学习见 [linux-01](/Linux/basics/linux-01-nsenter-prerequisites)；六大 Namespace 原理见[第 20 篇](/云原生/docker/docker-20-namespace)。

### 4.2 拿到容器「PID 1」在宿主机上的 PID

```bash
docker run -d --name ns-demo alpine:3.21 sleep infinity
docker inspect -f '{{.State.Pid}}' ns-demo
```

得到的数字是宿主机（或 Desktop 里 Linux VM）上的 PID，供 `nsenter -t` 使用。PID 对照与进程树细节见[第 24 篇](/云原生/docker/docker-24-process-view)。

### 4.3 进入完整命名空间（近似「进容器」）

```bash
PID=$(docker inspect -f '{{.State.Pid}}' ns-demo)
sudo nsenter --target "$PID" --mount --uts --ipc --net --pid
```

效果接近「站在该容器的隔离视图里」；日常开 shell 仍优先 `docker exec`，这条留给需要精细控制进哪些 ns 的场景。

### 4.4 只进入网络命名空间（高频排障）

```bash
PID=$(docker inspect -f '{{.State.Pid}}' ns-demo)
# 在容器的 net ns 里跑宿主机的工具
sudo nsenter -t "$PID" -n ip addr
sudo nsenter -t "$PID" -n ss -tln
```

容器里的 ESTABLISHED 连接，默认**不会**混在宿主机默认 net ns 的 `ss`/`netstat` 列表里；要看容器连接，就进它的 net ns。

清理：`docker rm -f ns-demo`。

---

## 五、四种方式对比

| 方式 | 适用场景 | 生产推荐 |
|------|----------|----------|
| `docker exec` | 日常运维、开 shell、跑探测命令 | ✅ 首选 |
| `docker attach` | 附着主进程 IO，本地快速看输出 | ❌ 少当「进 shell」用 |
| SSH | 传统 VM 思维 | ❌ |
| `nsenter` | 按 ns 进入；尤其 **只进 net** 借宿主机网络工具 | ⚠️ 高级 / Linux 宿主机 |

一句话：**能 `exec` 就 `exec`；镜像太瘦要查网再用 `nsenter -n`；别为进容器装 SSH；少用 `attach` 当登录手段。**

---

## 六、和系列其它篇的分工

| 你想搞清楚的事 | 去哪篇 |
|----------------|--------|
| `run` / `ps` / `logs` / `top` / `stop` / `rm` | [第 6 篇](/云原生/docker/docker-06-container-commands) |
| 进容器四法怎么选（本篇） | 本文 |
| 容器内外 PID、`docker top`、shim 进程树 | [第 24 篇](/云原生/docker/docker-24-process-view) |
| Namespace 隔离原理（pid/net/mnt…） | [第 20 篇](/云原生/docker/docker-20-namespace) |
| `nsenter` 的 Linux 前置（`/proc`、setns、权限） | [linux-01](/Linux/basics/linux-01-nsenter-prerequisites) |

---

## 命令速查

| 目的 | 命令 |
|------|------|
| 推荐：交互 shell | `docker exec -it CONTAINER sh` |
| 推荐：跑一条命令 | `docker exec CONTAINER CMD` |
| 附着主进程 IO | `docker attach CONTAINER` |
| 查宿主机 PID | `docker inspect -f '{{.State.Pid}}' CONTAINER` |
| 只进网络命名空间 | `sudo nsenter -t PID -n …` |

---

## 小结

- **首选 `docker exec`**：新进程、可多人、不碰主进程 IO。
- **`attach` 挂的是主进程**；本地偶用，生产排障别当登录方式。
- **别在业务镜像里靠 SSH 进容器**。
- **`nsenter`**：按命名空间进入；容器没有网络工具时，`-n` + 宿主机 `ip`/`ss`/`tcpdump` 很有用。
- 原理与进程对照不在本篇展开 → 第 15 / 11 篇。

---

## 思考题

> 容器里没有 `ping` 命令，你如何测试它能否访问外网？（提示：`nsenter -n`，或临时 `docker run --net container:<名>` 挂一个带工具的 sidecar 容器。）

下一篇见 🐳
