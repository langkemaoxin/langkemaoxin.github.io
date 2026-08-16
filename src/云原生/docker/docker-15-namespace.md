---
title: Namespace 隔离——容器如何「假装」自己是一台独立机器
sidebarGroup: Docker 系列
shortTitle: 15 Namespace 隔离
order: 15
date: 2026-08-22T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: Namespace 隔离——容器如何「假装」自己是一台独立机器
---

> **Docker 系列 · 第 15/18 篇**  
> 上一篇：[《UnionFS 与镜像分层》](/云原生/docker/docker-14-unionfs/) · 下一篇：[《CGroups 限资源》](/云原生/docker/docker-16-cgroups/)  
> 第 7 篇讲 [如何进入容器](/云原生/docker/docker-07-enter-container)（含 `nsenter`）；本篇从内核与 Docker 实现展开 Namespace 隔离。

---

## 开头：两个容器里都有 PID=1，这合理吗？

你在宿主机上 `ps -ef` 能看到几百个进程；进入容器 A，`ps` 只有寥寥几个，且业务进程 PID 往往是 **1**。

再进容器 B，同样有一个 PID=1。宿主机上 PID 全局唯一，**Docker 又不是虚拟机**，怎么做到两个「1 号进程」并存？

答案在 **Linux Namespaces**：创建进程时通过 `clone()` 的 flags 把各类系统资源放进独立命名空间，每个容器拥有**自己的 PID 表、网络栈、挂载视图**。

---

## 一、Namespace 是什么

在 Linux 中，**Namespace 在内核级抽象并封装系统资源**。资源被放入不同 Namespace 后，该 Namespace 内的进程拥有**独立的一份视图**，彼此不可见（除非特意共享）。

命名空间用于分离：

- 进程树（PID）
- 网络接口（NET）
- 挂载点（MNT）
- 进程间通信（IPC）
- 主机名/域名（UTS）
- 用户与用户组（USER）
- Cgroup 根目录（CGROUP）
- 时间（TIME，较新）

---

## 二、七种 Namespace 对照表

| Namespace | Flag | 隔离内容 |
|-----------|------|----------|
| **Cgroup** | `CLONE_NEWCGROUP` | Cgroup 根目录 |
| **IPC** | `CLONE_NEWIPC` | System V IPC、POSIX 消息队列 |
| **Network** | `CLONE_NEWNET` | 网络设备、协议栈、端口等 |
| **Mount** | `CLONE_NEWNS` | 文件系统挂载点 |
| **PID** | `CLONE_NEWPID` | 进程 ID |
| **Time** | `CLONE_NEWTIME` | Boot 与 monotonic 时钟 |
| **User** | `CLONE_NEWUSER` | UID/GID |
| **UTS** | `CLONE_NEWUTS` | 主机名、NIS 域名 |

Docker 默认启用其中大部分（视 `--pid`、`--network` 等模式而定）。日常容器隔离的主干是 **pid / net / ipc / mnt / uts / user** 六类（下文逐项展开）。

---

## 三、进程隔离（PID Namespace）

### 3.1 宿主机上的进程树

在 Linux 上，`ps -ef` 可见大量进程。其中 **PID 1** 通常是 `/sbin/init`（或 systemd），**PID 2** 常为 `kthreadd`，由 idle 进程创建，负责内核线程调度。

### 3.2 容器内「干净」的进程列表

进入运行中的容器执行 `ps -ef`，往往只有极少数进程——当前 shell、`ps` 自身，以及容器主进程（在容器内显示为 **PID 1**）。

宿主机上仍能看到 `dockerd`、`containerd-shim` 等；**容器内进程对宿主机其他进程一无所知**，反之，在容器 PID namespace 外仍能通过 `/proc` 或 `docker top` 看到容器内真实 PID。

### 3.3 clone() 与 Docker 源码路径

Linux 创建进程的系统调用是 `clone()`：

```c
int clone(int (*fn)(void *), void *child_stack,
          int flags, void *arg, ...);
```

传入 `CLONE_NEWPID` 时，新进程获得**独立 PID 空间**，其内 PID 可从 1 重新编号。

Docker 在 `docker run` / `docker start` 时创建 OCI Spec，经 `setNamespaces` 设置各类 namespace，再交给 `containerd` → `runc` 创建容器进程。简化调用链：

```text
containerRouter.postContainersStart
└── daemon.ContainerStart
    └── daemon.createSpec
        └── setNamespaces
            └── setNamespace (pid / net / ipc / uts / user / ...)
```

`PidMode` 还支持：

- **默认**：新建 PID namespace
- **`--pid=host`**：与宿主机共享 PID namespace（`oci.RemoveNamespace`）
- **`--pid=container:<name>`**：与指定容器共享 PID namespace

---

## 四、网络隔离与默认 bridge

Namespace 让容器网络栈与宿主机及其他容器隔离，但服务通常仍需**访问外网或被外部访问**。

每个 `docker run` 的容器默认拥有**独立 Network Namespace**。Docker 提供 **Host、Container、None、Bridge** 等模式（第 17 篇详述）；默认 **Bridge** 模式下还会：

1. 创建 **docker0** 虚拟网桥
2. 为容器分配 IP，默认网关指向 docker0
3. 创建 **veth pair**：一端在容器内为 `eth0`，一端接入 docker0

端口映射（`-p 6379:6379`）时，Docker 向 **iptables NAT** 追加规则，将宿主机端口 DNAT 到容器 IP:端口。例如：

```text
DNAT tcp -- anywhere anywhere tcp dpt:6379 to:192.168.0.4:6379
```

外部访问 `127.0.0.1:6379` 经 PREROUTING → FILTER → POSTROUTING，最终到达容器内 Redis。**隔离靠 Network Namespace，连通靠 veth + 网桥 + iptables**。

---

## 五、Libnetwork 与容器网络模型

Docker 将网络功能拆到 **libnetwork**，目标是为应用提供一致的编程接口与网络抽象（Container Network Model）。

三个核心概念：

| 组件 | 含义 |
|------|------|
| **Sandbox** | 容器网络栈（接口、路由、DNS）；Linux 上即 Network Namespace |
| **Endpoint** | 接入网络的端点，常为 veth 一端 |
| **Network** | 逻辑网络（bridge、overlay、macvlan 等） |

Sandbox 通过 Endpoint 加入 Network；bridge 模式下 Network 对应 docker0 或用户自定义 bridge。

---

## 六、挂载点隔离（MNT Namespace）与 rootfs

进程与网络隔离后，容器进程仍可能读写**宿主机目录**。MNT Namespace 解决「能挂载、能看哪些路径」。

创建新挂载 namespace 需在 `clone()` 中传入 **`CLONE_NEWNS`**，子进程获得父进程挂载点的拷贝；若不传入，子进程对文件系统的变更会反映到宿主机。

容器启动需要 **rootfs**（根文件系统）：所有二进制必须在 rootfs 内执行。典型需挂载：

- `/proc`、`/sys`、`/dev`
- 必要的符号链接，保证 IO 正常

### pivot_root 与 chroot

为禁止访问宿主机其他路径，libcontainer 使用 **pivot_root** 或 **chroot** 改变进程可见的根目录：

```c
// pivot_root 思路
put_old = mkdir(...);
pivot_root(rootfs, put_old);
chdir("/");
unmount(put_old, MS_DETACH);
rmdir(put_old);

// chroot 思路
mount(rootfs, "/", NULL, MS_MOVE, NULL);
chroot(".");
chdir("/");
```

**Chroot（change root）** 把进程的根目录从 `/` 换到指定目录，新根下无法访问旧系统路径，形成与原系统隔离的目录树——这是文件系统隔离的经典手段，常与 MNT Namespace 配合使用。

---

## 七、与第 7 篇的关系

| [第 7 篇](/云原生/docker/docker-07-enter-container)（运维） | 本篇（原理） |
|----------------------------------------------------------|--------------|
| `exec` / `attach` / SSH / `nsenter` 怎么选 | `clone()` flags 与各类 Namespace 做什么 |
| `nsenter -n` 借宿主机工具查容器网络 | Network Namespace、veth、docker0、Libnetwork |
| 进容器开 shell、跑探测命令 | MNT + chroot / pivot_root；为何「看不见」宿主机路径 |

两篇合读：第 7 篇负责动手进得去，本篇解释「为什么进得去、为什么看不见宿主机进程」。进程在宿主机上的真实 PID 对照另见[第 11 篇](/云原生/docker/docker-11-process-view)。

---

## 本节小结

| 概念 | 一句话 |
|------|--------|
| **Namespace** | 内核级资源视图隔离 |
| **PID namespace** | 容器内 PID 1 独立于宿主机 |
| **NET namespace** | 独立网卡、路由、端口 |
| **MNT namespace** | 独立挂载点；配合 chroot/pivot_root |
| **Libnetwork** | Sandbox / Endpoint / Network 模型 |
| **clone()** | 创建容器进程时设置隔离 flags |

---

## 下篇预告

**第 16 篇：《CGroups 限资源》**

Namespace 管「看见什么」，Cgroups 管「能用多少 CPU、内存、磁盘 I/O」。我们将查看 `/sys/fs/cgroup` 下的 docker 目录，理解 `cpu.cfs_quota_us` 等参数如何限制容器。

---

## 思考题

> 使用 `--network=host` 时，容器还会创建独立的 Network Namespace 吗？这对端口冲突和安全边界有何影响？

下一篇见 🐳
