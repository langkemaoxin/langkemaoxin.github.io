---
title: CGroups 限资源——防止一个容器吃光整台机器
sidebarGroup: Docker 系列
shortTitle: 20 CGroups 限资源
order: 20
date: 2026-08-23T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: CGroups 限资源——防止一个容器吃光整台机器
---

> **Docker 系列 · 第 20/24 篇**
> 上一篇：[《进程视角看容器——容器内外 PID 对照与生命周期》](/云原生/docker/docker-19-process-view) · 下一篇：[《Docker Daemon 与 runtime——从 dockerd 到 runc 的调用链》](/云原生/docker/docker-21-daemon-runtime)

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

## 六、Docker 如何使用 Cgroups

Docker **并未实现新的调度器**，主要做：

1. 在对应子系统下**创建目录**
2. 将容器进程 PID 写入 **`tasks`**
3. 按 `docker run` 参数**写入 quota、memory 等文件**

系统管理员也可直接在宿主机上修改 `/sys/fs/cgroup/.../docker/<id>/` 下的文件；生产环境更推荐通过 **`--cpus`、`-m`、`--memory-swap`** 等参数或 Compose / Swarm / K8s 的 resources 声明。

容器停止后，Docker 清理对应 cgroup 目录，避免泄漏。

---

## 七、与 Namespace 的分工

| 机制 | 回答的问题 | 典型场景 |
|------|------------|----------|
| **Namespace** | 能看见谁、能访问哪些视图 | 进程列表、网络栈、挂载点 |
| **Cgroup** | 能用多少物理资源 | CPU 50%、内存 1G、I/O 权重 |

二者正交、互补：**完整容器 = Namespace 隔离 + Cgroup 限额 + UnionFS 根文件系统**。

---

## 八、实操建议

```bash
# 限制 0.5 核、512MB 内存
docker run -d --name app \
  --cpus="0.5" \
  -m 512m \
  nginx:alpine

# 查看 cgroup 路径（ cgroup v2 路径可能不同，以系统为准）
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
| **与 Namespace** | 视图隔离 + 资源限额，缺一不可 |

---

## 下篇预告

**第 21 篇：《Docker Daemon 与 runtime》**

视图隔离（Namespace）与资源限额（Cgroups）都齐了，下一篇把调用链补全：`dockerd → containerd → shim → runc` 如何把这些内核能力串成一次 `docker run`。

---

## 思考题

> 只设置 `-m 512m` 而不设置 `--memory-swap`，容器能否使用 swap？在不同 cgroup 版本下行为有何差异？

下一篇见 🐳
