---
title: CGroups 限资源——防止一个容器吃光整台机器
sidebarGroup: Docker 系列
shortTitle: 16 CGroups 限资源
order: 16
date: 2026-08-23T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: CGroups 限资源——防止一个容器吃光整台机器
---

> **Docker 系列 · 第 16/23 篇**  
> 上一篇：[《Namespace 隔离》](/云原生/docker/docker-15-namespace/) · 下一篇：[《网络模式与实操》](/云原生/docker/docker-17-network/)

---

## 开头：一个失控的 Java 堆，拖垮整台宿主机

你在同一台 16C / 64G 的机器上跑了 8 个微服务容器。某个服务出现内存泄漏，**RSS 持续上涨**；因为没有限额，它会与宿主机和其他容器争抢内存，最终触发 OOM Killer——可能误杀关键进程，全线告警。

Namespaces 只能隔离**视图**，不能限制**物理资源**。多个「互不知情」的容器仍共享同一颗 CPU、同一块内存。**Control Groups（Cgroups）** 正是 Linux 提供的、对进程组进行资源统计与限制的内核机制。

---

## 一、Cgroups 是什么

**Cgroups（Control Groups）** 将一组进程纳入统一标准与参数管理，并可形成**层级结构**——子 cgroup 可继承父级的部分限制。

可分配与限制的资源包括：

- CPU
- 内存
- 磁盘 I/O（blkio）
- 网络带宽（部分场景）
- 设备访问（devices）

Docker 为每个容器创建对应 cgroup，把容器内进程 PID 写入 `tasks` 文件，从而实现**按容器维度的资源配额**。

---

## 二、Cgroups 与 Docker / LXC 的关系

```
Cgroup（内核） → LXC（封装） → Docker（再封装 + 镜像生态）
```

- **Cgroup** 在底层落实资源管理
- **LXC** 在 Cgroup 之上叠加 Namespace、Chroot 等，提供容器运行时
- **Docker** 进一步提供镜像、API、CLI

没有 Cgroup，就无法可靠地限制容器 CPU/内存，LXC 与 Docker 的「多租户同机」模型也不成立。

---

## 三、子系统（Subsystem）

Linux 通过**伪文件系统**暴露 Cgroup，可用 `lssubsys -m` 查看挂载点：

```bash
$ lssubsys -m
cpuset   /sys/fs/cgroup/cpuset
cpu      /sys/fs/cgroup/cpu
cpuacct  /sys/fs/cgroup/cpuacct
memory   /sys/fs/cgroup/memory
devices  /sys/fs/cgroup/devices
freezer  /sys/fs/cgroup/freezer
blkio    /sys/fs/cgroup/blkio
...
```

Docker 常用子系统：

| 子系统 | 作用 |
|--------|------|
| **cpu** | CPU 时间片、CFS 配额 |
| **memory** | 内存上限、swap 行为 |
| **blkio** | 块设备 I/O 权重与限速 |
| **devices** | 允许/拒绝访问的设备节点 |
| **freezer** | 暂停/恢复 cgroup 内进程 |
| **cpuset** | 绑定特定 CPU 核与内存节点 |

为何叫「子系统」：它们各自为所属 cgroup **分配并限制一类资源**。

---

## 四、层级结构与 Docker 目录

安装 Docker 后，各子系统下通常有 **`docker`** 目录：

```bash
$ ls cpu
cgroup.clone_children  cpu.stat  docker  notify_on_release  tasks ...

$ ls cpu/docker/
9c3057f1291b53fd54a3d12023d2644efe6a7db6ddf330436ae73ac92d401cf1
cpu.stat  tasks  ...
```

`9c3057f...` 即某运行中容器的 ID。层级关系大致为：

```text
/sys/fs/cgroup/cpu/docker/          ← 所有 Docker 容器
└── <container_id>/                 ← 单个容器
    └── tasks                       ← 容器内进程 PID 列表
```

**创建容器**：Docker 在 `docker` 下新建以容器 ID 命名的目录，写入 `tasks`。  
**删除容器**：对应目录被移除。

---

## 五、关键控制文件

### 5.1 tasks

列出属于该 cgroup 的所有进程 PID。容器内新 fork 的进程会自动加入同一 cgroup（取决于配置）。

### 5.2 cpu.cfs_quota_us / cpu.cfs_period_us

CFS（完全公平调度器）配额：

- `cpu.cfs_period_us`：周期，默认 often 100000（100ms）
- `cpu.cfs_quota_us`：该周期内允许使用的 CPU 时间（微秒）

若 `cpu.cfs_quota_us = 50000` 且 `period = 100000`，则 **CPU 上限约为 50%（0.5 核）**。

Docker CLI 对应：

```bash
docker run --cpus="0.5" ...
docker run --cpu-quota=50000 --cpu-period=100000 ...
```

### 5.3 memory.limit_in_bytes

内存硬上限。超出可能触发 OOM，内核按策略 kill  cgroup 内进程。

```bash
docker run -m 512m ...
```

### 5.4 blkio 权重

限制磁盘 I/O 竞争，避免某容器打满磁盘影响其他服务。

---

## 六、cgroup v2：你现在的系统其实是这套（本机实测）

上面第四、五节走的是 **cgroup v1** 的目录与文件——那是历史格局（也是大量老教程的基准）。但 2026 年主流发行版（Ubuntu 21.10+、Debian 11+、RHEL 9、Rocky/Alma 9）**默认都是 cgroup v2**，你在生产上摸到的会是另一套文件名。先验证本机：

```bash
$ stat -fc %T /sys/fs/cgroup
cgroup2fs                ← v2 的文件系统类型（v1 会显示 tmpfs）
```

### 6.1 v1 与 v2 的核心差异

| | v1（老） | v2（现在） |
|------|------|------|
| 层级结构 | **每个控制器一棵树**（/cpu、/memory 各自为政） | **统一层级**：一棵树，控制器文件平铺在每个目录 |
| 进程归属 | `tasks`（还能列线程） | `cgroup.procs`（线程归 cgroup.threads） |
| 与 systemd | 各自挂载，Docker 自建 `docker/` 目录 | systemd 统一管理，容器挂在 `system.slice/docker-<ID>.scope` |
| 内核态度 | 已标记 deprecated | 4.15+ 成熟，新特性只进 v2 |

### 6.2 实测：限额容器的 v2 目录与控制文件

```bash
$ docker run -d --name cg-demo --cpus 0.5 -m 100m busybox sleep 120

$ ls /sys/fs/cgroup/system.slice/ | grep docker
docker-364ab449e833...db11c.scope          ← 容器 = systemd scope 单元

$ CG=/sys/fs/cgroup/system.slice/docker-364ab449...scope
$ for f in cpu.max cpu.weight memory.max memory.swap.max memory.high pids.max; do
    echo "$f = $(cat $CG/$f)"; done
cpu.max = 50000 100000        ← --cpus 0.5：每 100ms 周期可用 50ms（v1 两个文件合成一个）
cpu.weight = 100              ← 相对权重（v1 的 cpu.shares 换了个名字和刻度）
memory.max = 104857600        ← -m 100m 的硬上限（v1 memory.limit_in_bytes）
memory.swap.max = 104857600   ← swap 限额：未显式指定时默认等于内存限额（总可甩 2×100m）
memory.high = max             ← 软限（触发回收/节流而非 OOM），未设
pids.max = 9519               ← 进程数上限（跟随系统默认，可用 --pids-limit 收紧）
```

文件名迁移对照表（看老教程/排查老系统时换算用）：

| v1 | v2 | Docker 参数 |
|------|------|------|
| `cpu.cfs_quota_us` + `cpu.cfs_period_us` | `cpu.max`（合成「quota period」一行） | `--cpus` |
| `cpu.shares` | `cpu.weight` | `--cpu-shares` |
| `memory.limit_in_bytes` | `memory.max` | `-m / --memory` |
| `memory.memsw.limit_in_bytes` | `memory.swap.max` | `--memory-swap`（**总额**语义） |
| `tasks` | `cgroup.procs` | — |
| （无） | `memory.high` / `pids.max` | `--memory-reservation` / `--pids-limit` |

### 6.3 限额是动真格的：OOM 与 fork 双实测

**内存超限**——限 100M、吃 300M：

```bash
$ docker run --name oom-demo -m 100m busybox \
    sh -c 'a=$(dd if=/dev/zero bs=1M count=300 2>/dev/null | base64); echo got ${#a}'
（无输出，进程被杀）

$ docker inspect oom-demo --format 'ExitCode={{.State.ExitCode}}  OOMKilled={{.State.OOMKilled}}'
ExitCode=137  OOMKilled=true          ← 137 = 128+9(SIGKILL)，OOM Killer 处决
```

**进程数超限**——`--pids-limit 5`，第 6 个进程 fork 失败：

```bash
$ docker run --rm --pids-limit 5 busybox sh -c 'for i in 1 2 3 4 5 6 7 8; do sleep 10 & done; echo ok'
sh: line 0: can't fork: Resource temporarily unavailable
```

这正是防「进程炸弹」的闸门（`docker stats` 的 PIDS 列就是它的用量）。

### 6.4 docker update：线上动态调限额

限额不是终身制，`docker update` 不停容器直接改 cgroup 文件：

```bash
$ docker update --memory 200m --memory-swap 400m --cpus 1 cg-demo
cg-demo

# 实测控制文件立刻变化：
cpu.max    = 100000 100000        ← 0.5 核 → 1 核
memory.max = 209715200            ← 100MB → 200MB
```

> 🔑 内存告警时的标准动作：`docker update --memory xxx --memory-swap xxx <容器>` 先止血，再排期重启改 compose/启动参数固化（update 的结果重启后丢失）。

---


## 七、Docker 如何使用 Cgroups

Docker **并未实现新的调度器**，主要做：

1. 在对应子系统下**创建目录**
2. 将容器进程 PID 写入 **`tasks`**
3. 按 `docker run` 参数**写入 quota、memory 等文件**

系统管理员也可直接在宿主机上修改 `/sys/fs/cgroup/.../docker/<id>/` 下的文件；生产环境更推荐通过 **`--cpus`、`-m`、`--memory-swap`** 等参数或 Compose / Swarm / K8s 的 resources 声明。

容器停止后，Docker 清理对应 cgroup 目录，避免泄漏。

---

## 八、与 Namespace 的分工

| 机制 | 回答的问题 | 典型场景 |
|------|------------|----------|
| **Namespace** | 能看见谁、能访问哪些视图 | 进程列表、网络栈、挂载点 |
| **Cgroup** | 能用多少物理资源 | CPU 50%、内存 1G、I/O 权重 |

二者正交、互补：**完整容器 = Namespace 隔离 + Cgroup 限额 + UnionFS 根文件系统**。

---

## 九、实操建议

```bash
# 限制 0.5 核、512MB 内存
docker run -d --name app \
  --cpus="0.5" \
  -m 512m \
  nginx:alpine

# 查看 cgroup 路径（v1 在 /sys/fs/cgroup/<子系统>/docker/<id>/，v2 见第六节 system.slice/docker-<id>.scope）
docker inspect app --format '{{.HostConfig.CpuQuota}}'
```

在 Compose 中（v3+）：

```yaml
services:
  web:
    image: nginx
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
```

---

## 本节小结

| 概念 | 一句话 |
|------|--------|
| **Cgroups** | 进程组的资源统计与限制 |
| **子系统** | cpu、memory、blkio 等分类控制 |
| **docker 目录** | 每容器一个 cgroup 子目录 |
| **tasks** | 归属该 cgroup 的 PID 列表 |
| **cfs_quota** | 限制 CPU 占用比例 |
| **cgroup v2** | 统一层级 + `cpu.max`/`memory.max`/`pids.max`，现代系统默认（第六节） |
| **OOMKilled** | 超内存硬限被内核处决，ExitCode 137 |
| **docker update** | 不停容器动态调限额（重启失效，需固化） |
| **与 Namespace** | 视图隔离 + 资源限额，缺一不可 |

---

## 下篇预告

**第 17 篇：《网络模式与实操》**

隔离与限额就绪后，服务如何对外暴露、容器之间如何互通？我们将系统梳理 bridge / host / none / container / overlay / macvlan，并实操 docker0、自定义 bridge 与常用 network 命令。

---

## 思考题

> 只设置 `-m 512m` 而不设置 `--memory-swap`，容器能否使用 swap？在不同 cgroup 版本下行为有何差异？

下一篇见 🐳
