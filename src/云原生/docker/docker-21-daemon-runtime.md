---
title: Docker Daemon 与 runtime——从 dockerd 到 runc 的调用链
sidebarGroup: Docker 系列
shortTitle: 21 Daemon 与 runtime
order: 21
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
description: Docker Daemon 与 runtime——从 dockerd 到 runc 的调用链
---

> **Docker 系列 · 第 21/24 篇**
> 上一篇：[《CGroups 限资源——防止一个容器吃光整台机器》](/云原生/docker/docker-20-cgroups) · 下一篇：[《容器安全——Capabilities 降权、Seccomp 与不该用的 --privileged》](/云原生/docker/docker-22-container-security)

---

## 开头：敲下 docker run 之后，背后发生了什么？

你在终端输入：

```bash
docker run -d nginx
```

几秒内容器就起来了。但这条命令经历了 **CLI → dockerd → containerd → containerd-shim → runc** 五级调用，每一层职责不同。

[第 3 篇](/云原生/docker/docker-03-engine-platform) 已画过组件地图；[第 19 篇](/云原生/docker/docker-19-process-view) 也在进程树上见过 shim。本篇把这条链路**按职责拆开**：谁管 API、谁管生命周期、谁真正 `clone()` 出隔离进程——这是读懂 Kubernetes CRI、排查「dockerd 挂了容器还在不在」的基础。

---

## 一、Docker Daemon 的演进

Docker 守护进程从早期集成在 `docker` 命令中，逐步拆分为独立二进制：

| 版本 | 启动命令 | 形态 |
|------|----------|------|
| Docker 1.8 之前 | `docker -d` | 守护进程是 client 的一个选项 |
| Docker 1.8 | `docker daemon` | 守护进程是 docker 命令的模块 |
| Docker 1.11+ | `dockerd` | **独立二进制**，与 client 分离 |

systemd 服务配置（`/usr/lib/systemd/system/docker.service`）：

```ini
[Service]
Type=notify
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
```

功能定位不变：**CS 架构的服务端**，接收 Docker CLI 请求，管理镜像与容器生命周期。

相关二进制：

```bash
/usr/bin/docker              # CLI 客户端
/usr/bin/dockerd             # 守护进程
/usr/bin/containerd          # 容器运行时（中间层）
/usr/bin/containerd-shim-runc-v2   # 容器垫片
/usr/bin/runc                # OCI 运行时实现
```

---

## 二、OCI（Open Container Initiative）

[OCI](https://opencontainers.org/) 由多家公司共建、Linux 基金会管理，制定容器**镜像格式**与**运行时**开放标准，并维护 reference implementation **runc**。

> An open governance structure for the express purpose of creating open industry standards around container formats and runtime.

**Container Runtime** 负责容器生命周期管理。OCI 通过 **filesystem bundle** 标准格式连接镜像规范与运行时规范：OCI 镜像可转换为 bundle，runtime 识别 bundle 后启动容器。

### 2.1 Image Spec（镜像规范）

OCI 容器镜像包含：

| 组件 | 说明 |
|------|------|
| **文件系统 layers** | 每层保存相对上层的变化；层有 hash，可共享 |
| **config** | 层历史 hash、环境变量、工作目录、CMD、mount 列表等（类似 `docker inspect <image>`） |
| **manifest** | config 索引、layer 列表、平台相关 annotation |
| **index**（可选） | 跨平台 manifest 索引，支持 multi-arch 镜像 |

### 2.2 Runtime Spec（运行时规范）

定义：

- 容器**状态**（creating / created / running / stopped）
- runtime 必须提供的操作：create、start、delete、state 查询等

状态转换简图：

```
creating → created → running → stopped
                ↘         ↗
                  paused
```

---

## 三、各组件职责

### 3.1 Docker CLI

用户入口，通过 REST/gRPC 与 dockerd API 通信：

```bash
docker build ...
docker run ...
docker ps ...
```

CLI 本身不创建容器，只发请求。

### 3.2 Docker Daemon（dockerd）

- 接收 CLI 请求
- 管理镜像、网络、卷、容器
- 调用 containerd 执行容器操作
- 向上屏蔽底层 runtime 变化，保持 API 兼容

### 3.3 Containerd

Docker 1.11 后为兼容 OCI，将容器运行时从 dockerd **剥离**。

职责：

- **镜像管理**：pull/push、unpack、snapshot
- **容器执行**：调用 shim + runc
- 即使 dockerd 不运行，理论上也可直接管理容器（需相应 CLI）

containerd 特点：

- 通过 **gRPC over Unix socket** 暴露 API（`/run/containerd/containerd.sock`）
- 完全遵循 OCI image-spec 与 runtime-spec
- 使用 runc 按 OCI 规范运行容器

dockerd 通过 gRPC 调用 containerd，确保原有 Docker API 向下兼容。

### 3.4 containerd-shim（docker-shim）

每启动**一个容器**，就启动**一个** shim 进程（如 `containerd-shim-runc-v2`）。

启动参数核心三项：

1. **容器 ID**
2. **bundle 目录**（如 `/run/containerd/.../<容器ID>/`）
3. **runtime 二进制**（默认 runc）

shim 调用 runc API，最终拼装类似：

```bash
runc create <容器ID> --bundle <bundle路径>
runc start <容器ID>
```

#### shim 存在的三大意义

1. **runc 可退出**：不必为每个容器常驻一个 runc 进程；创建完容器 runc 即可退出
2. **IO 保活**：即使 dockerd、containerd 挂掉，容器的 stdin/stdout/stderr 仍可用
3. **上报退出状态**：向 containerd 报告容器 exit code

> 第 1、2 点尤其重要：**dockerd 升级或重启时，已运行容器不会中断**——这是生产环境的关键设计。

bundle 目录内容示例：

```bash
ls /var/run/docker/containerd/e9eaef999da9183b9be0b3239881bc6b9c2070f13057c322dfed3d072820e962
# config.json  stdin  stdout  stderr  ...
```

### 3.5 runc（OCI Reference Implementation）

runc 从 Docker 的 **libcontainer** 迁移而来，实现：

- 容器创建/启动/停止/删除
- Namespace 隔离（pid/net/mnt/uts/ipc/user）
- Cgroup 资源限制

Docker 默认使用内置 runc，也可指定自定义 runtime：

```bash
dockerd --add-runtime "custom=/usr/local/bin/my-runc-replacement"
```

---

## 四、组件关系图

```
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

---

## 五、通过 runc 启动容器的进程树

启动一个容器后，在宿主机观察：

```bash
docker top <容器名>
ps -ef | grep containerd-shim
pstree -l -a -A <shim_pid> -p
```

典型进程树：

```
dockerd (PID 3197)
└── containerd (PID xxxx)
    └── containerd-shim-runc-v2 (PID 3401)  ← 参数含 -id <容器完整ID>
        └── sh mqbroker ... (PID 3473)       ← 容器内 PID 1
```

- dockerd 和 containerd 在 Docker 启动后**一直存在**
- 每创建一个容器，多一个 shim 进程
- shim 的子进程才是容器内实际运行的应用

验证 shim 参数：

```bash
ps -ef | grep 3401
# /usr/bin/containerd-shim-runc-v2 -namespace moby -id e9eaef999da9... \
#   -address /run/containerd/containerd.sock
```

查看 dockerd 资源占用：

```bash
pidof dockerd
lsof -p $(pidof dockerd) | wc -l
```

---

## 六、CRI（Container Runtime Interface）

Kubernetes 早期直接调用 Docker API 管理容器（kubelet 内的 docker manager）。

**K8s 1.5+** 推出 **CRI**——统一的容器运行时接口：

- 隔离各引擎差异（Docker、containerd、CRI-O 等）
- 与 OCI 不同：CRI 紧密绑定 **Kubernetes Pod** 概念
- 定义 Pod 生命周期管理；Pod 的运行环境称为 **PodSandbox**

演进路径：

```
早期 K8s
  kubelet → docker manager → Docker API → dockerd

Docker 拆分 containerd 后
  kubelet → CRI → dockershim → dockerd → containerd → shim → runc

K8s 1.24+ 移除 dockershim
  kubelet → CRI → containerd（cri-containerd）→ shim → runc
  或
  kubelet → CRI → CRI-O → runc（OCI 直连）
```

**cri-containerd**：将 containerd 接入 CRI 标准。

**CRI-O**：架设在 CRI 与 OCI 之间的桥梁，让更多符合 OCI 的 runtime 接入 Kubernetes。

趋势：Kubernetes 与 Docker 解耦，**containerd / CRI-O + runc** 成为主流栈；但 OCI 标准不变，Docker 生态构建的镜像仍可在 K8s 中运行。

---

## 七、与进程视角篇的串联

| [第 19 篇](/云原生/docker/docker-19-process-view)（进程视角） | 本篇（runtime 链） |
|-------------------|-------------------|
| 容器内 PID 1 | shim 启动的第一个进程 |
| 宿主机 PPID = shim | shim 由 containerd 创建 |
| kill PID 1 → 容器退出 | runc 负责 signal 与 namespace 清理 |
| cgroup 路径 | runc 创建 cgroup 并写入 PID |

---

## 八、核心要点回顾

1. **dockerd 已瘦身**：只做 API 与编排，实际跑容器交给 containerd + runc
2. **shim 是关键垫片**：让 runtime 可退出、IO 不断、daemon 可升级
3. **OCI 是通用语言**：image-spec + runtime-spec，Docker 与 K8s 都遵循
4. **CRI 是 K8s 方言**：在 OCI 之上引入 Pod/Sandbox 语义
5. **容器 = runc 创建的隔离进程组**，不是虚拟硬件

---

## 下篇预告

**第 22 篇：[《容器安全》](/云原生/docker/docker-22-container-security)**

- Capabilities 降权、Seccomp，以及为什么不该随手 `--privileged`

---

## 思考题

> 生产环境升级 dockerd 时，为什么已运行的容器通常不会中断？是哪一层设计保证了这一点？

欢迎在评论区留下你的分析。下一篇见 🐳
