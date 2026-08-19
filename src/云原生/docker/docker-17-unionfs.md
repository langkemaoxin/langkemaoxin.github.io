---
title: UnionFS 与镜像分层——从两个目录滚出一个容器文件系统
sidebarGroup: Docker 系列
shortTitle: 17 UnionFS 与分层
order: 17
date: 2026-08-21T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 不先背定义：从 company/home 两个目录的联合挂载滚起，只读层、可写层、写时复制、whiteout、镜像层堆叠与 build 缓存一层层解开。
---

> **Docker 系列 · 第 17/24 篇**
> 上一篇：[《Docker 技术底座——沿着「又轻又像一台机器」逐层解开 Namespace、Cgroups 与 UnionFS》](/云原生/docker/docker-16-tech-foundation) · 下一篇：[《Namespace 隔离——从一个容器里的怪现象滚穿六大命名空间》](/云原生/docker/docker-18-namespace)

---

## 开头：同一个镜像，为什么十台机器 pull 一次就够？

你在 CI 里构建 Java 应用镜像：`FROM eclipse-temurin:17` 加上 COPY、RUN，镜像体积 400 MB。

- 10 台 Node 都要跑同一版本：若每次全量拷贝 400 MB，带宽和时间都浪费
- 改一行业务代码重新 build：若整镜像重算，流水线要几分钟

[第 5 篇](/云原生/docker/docker-05-container-and-image)给过你心智模型：镜像是只读模板，容器多一层可写层；[第 9 篇](/云原生/docker/docker-09-dockerfile)你用 `docker history` 亲眼数过层。但两篇都把「层」当黑盒在用——层到底是个什么东西？凭什么没改过的层就能复用？

Docker 的答案藏在 **UnionFS（联合文件系统）** 里：**镜像由多层只读 Layer 组成，未改动的层可以复用；运行时只在最上面加一层可写层。**

本篇不先背概念，全程只追一个问题：**同一份镜像，怎么一层层叠出一个容器文件系统？** 前半程用 AUFS 时代的经典 company/home 小实验，把「联合挂载 → 栈顶可写 → 写时复制 → 删除遮挡」一个个滚出来；后半程把这套模型对号入座到 Docker 的 Layer、build 缓存和存储驱动上。

| 节 | 这一节解开的 | 读完能回答的 |
|----|--------------|--------------|
| **1** | 镜像对外是个「整体」 | 这个整体到底是什么——一个 mount 点 |
| **2** | Union Mount | 两个目录怎么长成同一棵目录树 |
| **3** | Stack 与 branch 顺序 | 层叠起来后，谁可写、谁只读 |
| **4** | 写时复制（CoW） | 改下层的文件，下层到底动没动 |
| **5** | whiteout | 容器里删镜像的文件，删到哪儿去了 |
| **6** | 镜像的 Layer | Dockerfile 指令和层怎么一一对应 |
| **7** | `Step n/m` 与层 ID | build 输出里那串 ID 是什么 |
| **8** | 构建缓存 | 改一行 Dockerfile，哪些层要重来 |
| **9** 🧗 | 存储驱动演进 | 本机没有 AUFS，Docker 还怎么分层 |
| **10** | 分层的账单 | 磁盘、pull、CI、回滚各自省在哪 |

实验说明：AUFS 那几个实验是早期 Docker 年代的经典演示，现代内核多半已跑不了——本机 WSL2 内核 6.6.87.2-microsoft-standard-WSL2 的 `/proc/filesystems` 里已经没有 aufs（第 9 节当面核对）；但它仍是理解 UnionFS 最省事的模型，Docker 现在的 OverlayFS 只是换了实现，语义一模一样。官方入口：[Storage drivers](https://docs.docker.com/engine/storage/drivers/)。

---

## 第 1 节：镜像是「一个整体」——这个整体是个挂载点

没有操作系统，怎么在容器里跑程序？

可以在 Docker 里做一个 CentOS 镜像，把发行版根文件系统打包进去，容器内运行的就是该环境下的二进制与库。

**Image 是 Docker 部署的基本单位**：包含程序文件及其依赖的运行环境。对外表现为一个「整体」，更准确地说是一个 **mount 点**——联合挂载后的统一目录视图。

「mount 点」三个字是本篇的伏笔：你在容器里 `ls /` 看到的根目录，不是哪块硬盘上的真实目录，而是**挂载出来的一个视图**。怎么挂出来的，第 2 节当场做一遍。

（镜像=只读模板、容器=实例这套心智模型第 5 篇已经建立，这里不重讲；本篇补的是「模板」内部长什么样。）

球滚到这里：镜像 = 一摞文件目录 + 一个把它们挂成整体的挂载点。那「一摞目录」怎么变成「一棵树」？

---

## 第 2 节：Union Mount——两个目录，长成一棵树

**UnionFS** 是为 Linux 设计的、把多个文件系统**联合（Union）到同一挂载点**的文件系统服务。

**AUFS（Advanced UnionFS）** 是 UnionFS 的升级版，性能与效率更好。它把参与联合的每个目录称作 **branch（分支）**，联合挂载这个过程叫 **Union Mount**。

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

拆开看那条挂载命令：

- `-t aufs`：用 aufs 这种文件系统类型来挂
- `-o dirs=./home:./company`：列出要联合的 branch，冒号分隔，**顺序后面有大讲究**
- `none`：设备名——没有真实磁盘设备参与，所以填 none
- `./mnt`：挂载点，也就是第 1 节说的那个「整体」的落点

对照 Docker：**镜像的每一层就是一个 branch，容器根目录就是 mnt**。名字对上了，行为还没对上——现在这棵树能不能写？写了会落到谁头上？接着滚。

---

## 第 3 节：Stack——层叠起来，只有栈顶可写

AUFS 按 branch 的联合顺序形成一个 **Stack（栈）**。默认情况下，若未指定 branch 权限，**从左到右第一个 branch 可读写，其余只读**：

```bash
mount -t aufs -o dirs=./home:./company none ./mnt
# 最左侧 home 在栈顶，可写；company 在下，只读
```

刚冒出来的「栈」立刻钉成小模型：

```text
Stack（栈）——按 dirs= 从左到右、从上往下压：

可写 ← home      （dirs= 第 1 个，栈顶，可读写）
只读 ← company   （其余 branch，全部只读）
          │
          │ Union Mount（联合挂载）
          ▼
        ./mnt      （你 ls 到的那棵树）
```

「越往上越新、只有顶可写」这条规矩，就是镜像分层全部设计的原型：**只读层在下面垫底，可写层永远在最顶上接活**。把顺序换成 `dirs=./company:./home`，可写的就换成 company——谁在栈顶，谁挨写。

写入具体怎么个「接」法？下一节当场看。

---

## 第 4 节：写时复制——apple 落在了哪一层

向 `./mnt/code` 写入 `apple` 时：

```bash
echo apple > ./mnt/code
cat company/code   # 空——只读层未被修改
cat home/code      # apple——写入落在可写层
```

三行输出信息量很大：

- `./mnt/code` 原本来自只读层 `company`，但**写入成功了**——视图上没人拦你
- 回头看 `company/code`：**空**——只读层一个字节没被动过
- 再看 `home/code`：**apple**——写入被悄悄接进了栈顶可写层

这正是 UnionFS 的核心行为：

- 联合多个目录，部分只读、部分可写
- **对只读层文件的修改，不会污染只读 branch**，而是在可写 branch 创建新文件或覆盖视图

这个「要写下层时不真写，把内容先挪进可写层再改」的套路有名字：**写时复制（Copy-on-Write，CoW）**——平时不动它，真写到才复制。

类比：源代码目录只读，补丁目录可写——改代码只影响补丁目录，原始代码保持干净。Docker 镜像层与容器可写层的关系与此同构：**镜像层=原始代码，容器可写层=补丁目录**。

第 5 篇那句「改容器 ≠ 改镜像」，现在你能从机制层面说出为什么了：动的只是栈顶那张「补丁」。

---

## 第 5 节：whiteout——删文件是「盖住」，不是「擦掉」

CoW 管住了「改」和「写新」，还剩「删」。

在 `mnt` 里 `rm` 一个来自只读层的文件，只读层删得动吗？删不动——它是只读的。UnionFS 的做法很聪明：**在可写层放一个「挡板」标记，声明这个路径被删了**。这个标记就叫 **whiteout（遮挡标记）**（overlay2 里是上层目录里的一个特殊节点，AUFS 里是 `.wh.` 前缀的文件——实现细节不同，语义一致）。

```text
可写层 home（容器自己的层）  ← rm code 在这里放一块「挡板」：whiteout
只读层 company（镜像层）     ← code 原文件一个字节没动
────────────────────────────────────────────
联合视图 ./mnt              ← code 消失了；换一个容器重新挂，code 又在
```

于是两件事同时成立：

- 这个容器里 `ls` 不到它——**视图上**它没了
- 镜像层原封不动——**下一个**从同一镜像起的容器，照样看得见它

顺手回收系列前面埋的两句话：第 5 篇说「删容器后未提交的可写层数据默认丢失」——补丁和挡板一起丢，视图回到镜像原样；真想固化改动，用 `commit` 把可写层提交成新层（第 5 篇 4.7 的 history 顶部那条 `lab note` 新层就是 commit 出来的），或者改 Dockerfile 重新 build。重要数据别放可写层，[第 12 篇](/云原生/docker/docker-12-data-persistence)的卷才是归宿。

滚到这里，「叠出一个容器文件系统」的四块机制齐了：**只读层垫底、可写层在顶、改靠 CoW、删靠 whiteout**。下面把镜头切回 Docker。

---

## 第 6 节：Docker 镜像的层——每条指令叠一块

Docker Image 有层级结构：

1. **最底层**：Base Image（常为操作系统基础层，如 `debian:bookworm-slim`）
2. **向上**：Dockerfile 每条指令生成一层
3. **入栈顺序**：后执行的指令在上层

直观理解：

```text
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

把前 5 节的模型原样平移过来，一词一换就懂：

| AUFS 实验（前 5 节） | Docker 镜像（本节起） |
|----------------------|----------------------|
| branch | Layer（层） |
| 只读 branch `company` | 镜像只读层：Base + 各指令层 |
| 可写 branch `home`（栈顶） | 容器可写层：CoW 补丁 + whiteout 挡板 |
| Union Mount 到 `./mnt` | 联合挂载到容器根目录（第 1 节的 mount 点） |

`docker history` 数层这件事第 9 篇雪球 3 干过，不重演；本篇要看的是这些层在 build 时**怎么一层层长出来**。

---

## 第 7 节：`Step 1/7`——亲眼看层长出来

镜像从哪来：Dockerfile + `docker build`。（Dockerfile 语法第 9 篇教过，这里只盯「层」这一面。）

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

逐行读这份输出：

- **`Step 1/7` … `Step 7/7`**：7 条指令从上往下执行，一步叠一层——和第 6 节那张栈图从底往上完全对应
- **`---> 804b0a01ea83` / `---> 6d93c5b91703`**：每步做完拿到的层 ID——第 5 篇 `history` 表里那些 ID 就是这么来的
- **`Successfully built a5ccd4e1b15d`**：最终镜像 ID——「整个栈叠完」后的整体指代
- **无变更的步骤显示 `Using cache`**——复用已有 Layer，一个字节不重算

注意 `WORKDIR` 只是设个工作目录，也照样产生了新层 ID：层不等于「大」，`EXPOSE`/`CMD` 这类只改元数据的层甚至是 0B（第 9 篇 history 里见过）。但层多了，缓存判断的单位就多了——怎么利用这一点，就是下一节的主角。

---

## 第 8 节：构建缓存——为什么把不常变的指令放前面

把上一节的 `Using cache` 展开成规则：

| 情况 | 行为 |
|------|------|
| Dockerfile 某行及之前均未变 | 该层及以下全部复用缓存 |
| 仅中间某行变更 | 从变更层开始重新 build，其下仍复用 |
| 仅顶层变更 | 只重建最后一层 |

因此：**把变动少的指令放前面、变动多的放后面**，是 Dockerfile 优化的基本原则。

拿第 9 篇雪球 5 的 FastAPI 配方对账：`requirements.txt`（几乎不变）在前、`main.py`（天天变）在后——改代码重建时前 4 层全部命中缓存、秒过，从第 5 步才开始重跑。当时说「为这一刻埋的」，现在你知道「这一刻」背后就是本节这张表。

反过来也就懂了开头的 CI 痛点：若 `COPY . /app` 写在最前面，改一行业务码=从那一层起整栈 miss、重算几分钟；放后面，只重打顶上最薄的一两层。多阶段构建、BuildKit 缓存挂载这些深水区，[第 23 篇](/云原生/docker/docker-23-build-advanced)再滚。

---

## 第 9 节 🧗：本机没有 AUFS——驱动换了，语义没换

前面拿 AUFS 讲模型，但你机器上八成没有 AUFS：**AUFS 未能进入 Linux 主线内核**，发行版兼容性促使 Docker 支持多种存储驱动：

| 驱动 | 说明 | 现状（2026） |
|------|------|--------------|
| **overlay2** | 现代 Linux 默认推荐，基于 OverlayFS | 现行默认；containerd 镜像存储下显示为 `overlayfs` |
| **aufs** | 早期常用，部分老环境仍可见 | 已随 Docker Engine 24.0（2023）移除，只剩老环境 |
| **devicemapper** | 块设备映射，用户态 dmsetup + 内核 dm 驱动协同 | 官方不推荐，新环境勿选 |

无论驱动名如何，**「只读镜像层 + 可写容器层 + 写时复制」**的语义不变。当面核对当前驱动：

```bash
docker info | grep Storage
```

本机（WSL2 原生 Docker Engine 29.1.3）：

```text
 Storage Driver: overlayfs
```

传统 Docker Engine 直装 Linux 时这里多显示 `overlay2`；官方 Storage drivers 文档注明 Docker Engine 29 起新装默认启用 containerd 镜像存储，此时就显示 `overlayfs`——同一个 OverlayFS 内核机制，两种叫法。再核对「为什么 AUFS 跑不了」：

```bash
grep aufs /proc/filesystems
```

本机（WSL2 内核 6.6.87.2-microsoft-standard-WSL2）：**没有任何输出**——内核里压根没编译 aufs，`/proc/filesystems` 里躺着的是 overlay。命令没输出，本身就是答案。

顺带回收一个伏笔：第 5 篇 `docker inspect` 里那个 `"Driver": "overlayfs"` 字段，说的就是它。

---

## 第 10 节：分层的账单——工程价值逐条对回去

分层不是炫技，每一项价值都能在前面的节里找到出处：

| 价值 | 说明 | 在哪见过 |
|------|------|----------|
| **存储 dedup** | 多容器共享相同 Base Layer，磁盘占用小 | 第 3、4 节：只读层共用，写入才各留一份；第 5 篇 tag 两个名字一个 ID，也不复制层 |
| **分发加速** | `docker pull` 只拉缺失层 | 第 5 篇 pull 输出 `Status: Image is up to date`——层没变就不重拉 |
| **构建加速** | 缓存未变 Layer，CI 更快 | 第 7、8 节的 `Using cache`；第 9 篇「先清单后代码」 |
| **回滚清晰** | 每层对应一条 Dockerfile 指令，便于审计 | 第 7 节 Step n/m 一步一层；第 5 篇 history 一行一层 |

回到开头收账：10 台 Node 拉同一镜像=层只拉一遍、磁盘只存一份；改一行业务码=只重建顶上一两层。400 MB 的焦虑，就是被「层」这么拆没的。

---

## 怎么记：一张概念对照表

| 概念 / 命令 | 一句话 | 在哪一节出现 |
|-------------|--------|--------------|
| mount 点 | 镜像对外是一个挂载出来的视图 | 第 1 节 |
| Union Mount | 多个目录联合挂成一棵树 | 第 2 节 |
| branch / Stack | 参与联合的目录；栈顶可写、其余只读 | 第 2、3 节 |
| 写时复制（CoW） | 写下层时先复制到可写层 | 第 4 节 |
| whiteout | 可写层放挡板遮住下层文件 | 第 5 节 |
| Layer | Dockerfile 每条指令一层 | 第 6 节 |
| `---> 层ID` / `Using cache` | build 一层层往上长；未变的层直接复用 | 第 7、8 节 |
| `docker info \| grep Storage` | 看当前存储驱动 | 第 9 节 |

---

## 历史包袱：AUFS 的退场

- **AUFS 没进主线内核**（第 9 节本机 `/proc/filesystems` 已当面核对），aufs 存储驱动也已在 Docker Engine 24.0（2023 年）被移除；`devicemapper` 同样早已列为不推荐。新装环境一律 OverlayFS 系（`overlay2` / containerd 存储下的 `overlayfs`）。出处：[Docker Engine 24.0 release notes](https://docs.docker.com/engine/release-notes/24.0/)、[deprecated features](https://docs.docker.com/engine/deprecated/)。
- 本文 build 演示用的 `python:2.7-slim`——**Python 2.7 已于 2020 年 1 月 EOL**，这是历史教学配方：语法照学，镜像别再用于生产。
- `Step 1/7` 这种输出格式来自**传统构建器**；新版 BuildKit 显示的是 `[2/2] COPY …`（第 9 篇 lab-web 的 build 见过）。层与缓存的行为一致，只是输出长相不同。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|--------|----------------------|
| [第 5 篇 容器与镜像](/云原生/docker/docker-05-container-and-image) | 第 1、4、5 节：可写层、commit 新层、`Driver` 字段 |
| [第 9 篇 Dockerfile](/云原生/docker/docker-09-dockerfile) | 第 6～8 节：history、先清单后代码 |
| [第 12 篇 数据持久化](/云原生/docker/docker-12-data-persistence) | 第 5 节：可写层会丢，卷才是归宿 |
| [第 16 篇 技术底座总览](/云原生/docker/docker-16-tech-foundation) | 上一篇：三大支柱里的 UnionFS |
| [第 23 篇 构建进阶](/云原生/docker/docker-23-build-advanced) | 第 8 节缓存的深水区 |
| [第 18 篇 Namespace 隔离](/云原生/docker/docker-18-namespace) | 下一篇 |

---

## 小结

从两个目录一棵树开始，每次只解开一层：

1. **镜像=mount 点**：对外一个整体，内部是一摞目录挂出来的视图。
2. **Union Mount**：多个 branch 联合成一棵树；Docker 里 branch 换了个名字叫 Layer。
3. **Stack**：栈顶可写、其余只读——可写层永远在顶上。
4. **CoW**：改下层先复制到可写层，下层零污染（apple 实验）。
5. **whiteout**：删=盖挡板，镜像层原封不动。
6. **Layer 堆叠**：FROM 打底，每条指令一层，后执行的在上。
7. **build 输出**：Step n/m 一步一层，`--->` 是层 ID，`Using cache` 是复用。
8. **缓存规则**：变一行，从那一层起重算，其下全复用——少变的写前面。
9. **驱动演进**：AUFS → overlay2/overlayfs，换了实现没换语义。
10. **账单**：磁盘去重、增量 pull、CI 加速、层可审计。

**思考题**：

1. 若 `COPY . /app` 放在 Dockerfile 第一行（在 `FROM` 之后立刻 COPY），对构建缓存有何影响？如何调整顺序更合理？（提示：第 8 节那张表）
2. 在容器里 `rm` 掉镜像自带的一个文件后 `docker commit` 成新镜像：新镜像里这个文件还「在」吗？磁盘空间省下来了吗？（提示：第 5 节的挡板）

---

## 下篇预告

**第 18 篇：《Namespace 隔离》**

文件系统分层解决「装什么」；Namespace 解决「看见什么」。我们将深入 PID 隔离、`clone()`  flags，以及 Libnetwork 与 Chroot 如何补齐网络与根目录隔离。

---

## 参考资料

- [Storage drivers](https://docs.docker.com/engine/storage/drivers/)
- [OverlayFS storage driver](https://docs.docker.com/engine/storage/drivers/overlayfs-driver/)
- [Select a storage driver](https://docs.docker.com/engine/storage/drivers/select-storage-driver/)
- [Docker Engine 24.0 release notes（移除 aufs 驱动）](https://docs.docker.com/engine/release-notes/24.0/)
- 本机核对：WSL2 内核 6.6.87.2-microsoft-standard-WSL2（无 aufs、有 overlay）+ WSL2 原生 Docker Engine（`docker info`：overlayfs）；AUFS company/home 为早期经典教学实验

下一篇见 🐳
