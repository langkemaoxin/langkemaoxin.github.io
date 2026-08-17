---
title: UnionFS 与镜像分层——Docker 镜像为什么是一层一层叠出来的
sidebarGroup: Docker 系列
shortTitle: 17 UnionFS 与分层
order: 17
date: 2026-08-21T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: UnionFS 与镜像分层——Docker 镜像为什么是一层一层叠出来的
---

> **Docker 系列 · 第 17/24 篇**
> 上一篇：[《Docker 技术底座总览——Namespace、CGroup 与 UnionFS 如何拼出容器》](/云原生/docker/docker-13-tech-foundation) · 下一篇：[《Namespace 隔离——容器如何「假装」自己是一台独立机器》](/云原生/docker/docker-15-namespace)

---

## 开头：同一个镜像，为什么十台机器 pull 一次就够？

你在 CI 里构建 Java 应用镜像：`FROM eclipse-temurin:17` 加上 COPY、RUN，镜像体积 400 MB。

- 10 台 Node 都要跑同一版本：若每次全量拷贝 400 MB，带宽和时间都浪费
- 改一行业务代码重新 build：若整镜像重算，流水线要几分钟

Docker 的答案藏在 **UnionFS（联合文件系统）** 里：**镜像由多层只读 Layer 组成，未改动的层可以复用；运行时只在最上面加一层可写层。**

---

## 一、什么是镜像

没有操作系统，怎么在容器里跑程序？

可以在 Docker 里做一个 CentOS 镜像，把发行版根文件系统打包进去，容器内运行的就是该环境下的二进制与库。

**Image 是 Docker 部署的基本单位**：包含程序文件及其依赖的运行环境。对外表现为一个「整体」，更准确地说是一个 **mount 点**——联合挂载后的统一目录视图。

---

## 二、UnionFS 与 AUFS

### 2.1 UnionFS 是什么

**UnionFS** 是为 Linux 设计的、把多个文件系统**联合（Union）到同一挂载点**的文件系统服务。

**AUFS（Advanced UnionFS）** 是 UnionFS 的升级版，性能与效率更好。它把不同目录称作 **branch（分支）**，联合挂载过程叫 **Union Mount**。

### 2.2 动手实验：company 与 home

先建两个目录并各放文件：

```bash
# tree .
.
|-- company
|   |-- code
|   `-- meeting
`-- home
    |-- eat
    `-- sleep
```

联合挂载到 `mnt`：

```bash
mkdir mnt
mount -t aufs -o dirs=./home:./company none ./mnt
tree ./mnt/
# ./mnt/
# |-- code
# |-- eat
# |-- meeting
# `-- sleep
```

`company` 与 `home` 的内容出现在同一棵目录树下。

### 2.3 只读层与写时复制（Copy-on-Write）

默认情况下，若未指定 branch 权限，**从左到右第一个 branch 可读写，其余只读**。

向 `./mnt/code` 写入 `apple` 时：

```bash
echo apple > ./mnt/code
cat company/code   # 空——只读层未被修改
cat home/code      # apple——写入落在可写层
```

这正是 UnionFS 的核心行为：

- 联合多个目录，部分只读、部分可写
- **对只读层文件的修改，不会污染只读 branch**，而是在可写 branch 创建新文件或覆盖视图

类比：源代码目录只读，补丁目录可写——改代码只影响补丁目录，原始代码保持干净。Docker 镜像层与容器可写层的关系与此同构。

### 2.4 Stack 与 branch 顺序

AUFS 按 branch 联合顺序形成 **Stack**：**最上层（命令里 dirs= 最左侧）可读写，下面各层只读**。

```bash
mount -t aufs -o dirs=./home:./company none ./mnt
# 最左侧 home 在栈顶，可写；company 在下，只读
```

---

## 三、Docker 镜像分层机制

### 3.1 Layer 如何堆叠

Docker Image 有层级结构：

1. **最底层**：Base Image（常为操作系统基础层，如 `debian:bookworm-slim`）
2. **向上**：Dockerfile 每条指令生成一层
3. **入栈顺序**：后执行的指令在上层

直观理解：

```
┌─────────────────────┐
│  CMD / 应用层        │  ← 最上层
├─────────────────────┤
│  RUN pip install ... │
├─────────────────────┤
│  COPY . /app         │
├─────────────────────┤
│  WORKDIR /app        │
├─────────────────────┤
│  Base: python:2.7   │  ← 最底层
└─────────────────────┘
```

每一层都是一个可被联合的目录；整体 Image 是联合挂载后的视图。

### 3.2 镜像从哪来：Dockerfile + docker build

```dockerfile
FROM python:2.7-slim
WORKDIR /app
COPY . /app
RUN pip install --trusted-host pypi.python.org -r requirements.txt
EXPOSE 80
ENV NAME World
CMD ["python", "app.py"]
```

构建过程：

```text
Step 1/7 : FROM python:2.7-slim
 ---> 804b0a01ea83
Step 2/7 : WORKDIR /app
 ---> 6d93c5b91703
...
Successfully built a5ccd4e1b15d
```

- 每一步对应一层，生成随机 Layer ID
- 最终镜像 ID 为 `a5ccd4e1b15d`
- **无变更的步骤显示 `Using cache`**——复用已有 Layer

### 3.3 构建缓存策略

| 情况 | 行为 |
|------|------|
| Dockerfile 某行及之前均未变 | 该层及以下全部复用缓存 |
| 仅中间某行变更 | 从变更层开始重新 build，其下仍复用 |
| 仅顶层变更 | 只重建最后一层 |

因此：**把变动少的指令放前面、变动多的放后面**，是 Dockerfile 优化的基本原则。

Layer 与 Image 的关系，与 AUFS 中「联合目录 + 挂载点」的关系高度相似；**Docker 早期在 Linux 上通过 AUFS 管理镜像层**（现网常见 OverlayFS，概念一致）。

---

## 四、OverlayFS 与 Device Mapper（演进）

AUFS 未能进入 Linux 主线内核，发行版兼容性促使 Docker 支持多种存储驱动：

| 驱动 | 说明 |
|------|------|
| **overlay2** | 现代 Linux 默认推荐，基于 OverlayFS |
| **aufs** | 早期常用，部分老环境仍可见 |
| **devicemapper** | 块设备映射，用户态 dmsetup + 内核 dm 驱动协同 |

无论驱动名如何，**「只读镜像层 + 可写容器层 + 写时复制」** 的语义不变。可用 `docker info | grep Storage` 查看当前驱动。

---

## 五、分层带来的工程价值

| 价值 | 说明 |
|------|------|
| **存储 dedup** | 多容器共享相同 Base Layer，磁盘占用小 |
| **分发加速** | `docker pull` 只拉缺失层 |
| **构建加速** | 缓存未变 Layer，CI 更快 |
| **回滚清晰** | 每层对应一条 Dockerfile 指令，便于审计 |

---

## 本节小结

| 概念 | 一句话 |
|------|--------|
| **UnionFS** | 多目录联合到同一挂载点 |
| **AUFS branch** | 联合的各层目录；栈顶可写 |
| **写时复制** | 改只读层时写入可写层，不污染下层 |
| **Image Layer** | Dockerfile 每条指令一层 |
| **build 缓存** | 未变 Layer 复用，加速构建 |

---

## 下篇预告

**第 18 篇：《Namespace 隔离》**

文件系统分层解决「装什么」；Namespace 解决「看见什么」。我们将深入 PID 隔离、`clone()`  flags，以及 Libnetwork 与 Chroot 如何补齐网络与根目录隔离。

---

## 思考题

> 若 `COPY . /app` 放在 Dockerfile 第一行（在 `FROM` 之后立刻 COPY），对构建缓存有何影响？如何调整顺序更合理？

下一篇见 🐳
