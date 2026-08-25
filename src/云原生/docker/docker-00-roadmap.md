---
title: Docker 学习总纲：零基础到资深专家的完整教学大纲
sidebarGroup: Docker 系列
shortTitle: 00 学习总纲
order: 0
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - 学习路线
  - Docker系列
description: 以西蒙学习法拆碎 Docker 官方知识域：起步跑通 → 镜像与容器日常 → Dockerfile 与构建体系 → 数据持久化 → 网络 → Compose 编排 → 原理内幕（Namespace/CGroups/UnionFS/OCI）→ 生产化（安全/日志/Daemon 运维）→ 深水区与毕业（Swarm/供应链/2026 AI 表面）。九大阶段、40+ 知识单元，每单元带动手实验与验收标准，总周期约 16 周，基准 Docker Engine 29.x（2026-08 核验）。
---

> **Docker 系列 · 总纲第 0 篇**
> 本文的目标只有一个：**让一个 Docker 零基础的学生，沿这条线走完，成为能独立交付、排障、讲清原理、并通向云原生深水区的资深专家**。本篇是「路线」——先看清整张地图，再决定每一步往哪走；具体知识点的「教材」按本大纲逐篇展开。

---

## 开头：为什么学 Docker 之前，要先写一份大纲？

因为 Docker 的知识点是一张**网**，不是一条线：

- 你想学「容器之间怎么互访」→ 讲网络的资料说「前提是懂 docker0 网桥」→ 网桥又牵出 veth、iptables、netns；
- 你想学「镜像为什么这么大」→ 讲分层的资料说「前提是懂 UnionFS」→ UnionFS 又牵出写时复制、whiteout、存储驱动；
- 你想直接背命令应付工作 → 背到 `--privileged` 时发现不懂 Linux capabilities 根本记不住它到底放开了什么。

没有路线图的学习是这样的：看镜像 → 卡在分层 → 回去补内核 → 被「六大命名空间」劝退 → 又跳去学 Compose → Compose 的网络配置又把你拽回网络……**每个知识点背后都站着三个前置知识点，学到哪都是黑洞**。

而 2026 年的 Docker 早已不只是「一个运行容器的东西」：构建体系（BuildKit/Bake）、供应链安全（Scout/签名/加固镜像）、本地大模型（Model Runner）、AI 沙箱（Sandboxes）全都挂在这个名字下面——**不先画地图，更容易在生态里迷路**。

这份大纲要做的事就一件：**把这张互锁的知识网，压平成一条单向的线**——每个单元只依赖前面的单元，学完一个，就解锁一片区域。这是西蒙学习法在容器领域的落地方式。

---

## 一、Docker 到底在解决什么问题：一张知识底图

先回答「这个技术为什么存在」。Docker 的一句话本质：**把应用和它的全部依赖打包成一个可搬运的标准化单元，在任何 Linux 机器上一致地运行**——「我本地没问题」从此不再是借口。

但这个「打包+隔离」不是魔法，它是三层结构的组合，也是本大纲的骨架：

| 层 | 解决什么问题 | 不懂这层会怎样 |
|----|--------------|----------------|
| ① 交付层：镜像 | 环境不一致——依赖、配置、OS 版本全打包 | 镜像对你只是个黑盒 tar 包，Dockerfile 写得一团糟 |
| ② 隔离层：容器 | 进程互相打架——用内核机制隔出「独立机器」的错觉 | 容器对你就是魔法；`--privileged`、OOM、文件系统怪象全靠猜 |
| ③ 编排层：单机到多机 | 一个应用是一组容器——Compose 管单机，Swarm/K8s 管多机 | 只会单容器，真实应用（Web+DB+缓存）就玩不转 |

注意两个常被忽略的事实：

1. **Docker 没有发明容器**——namespace、cgroups、联合文件系统全是 Linux 内核老技术；Docker 的贡献是把它们**产品化**：镜像格式、Dockerfile、注册中心这套「人人会用」的工作流。
2. **Docker 没有实现运行时**——真正创建容器的是 runc（OCI 参考实现），Docker daemon 通过 containerd 管着它。理解了这条链，你才能听懂「K8s 弃用 Docker」到底弃用了什么（阶段 6 解剖）。

### 官方文档版图（大纲的取材来源）

以下结构核验自 [docs.docker.com](https://docs.docker.com/)，2026-08-24。官方手册按产品分四大类，**这张版图决定了本大纲的广度**：

| 手册 | 覆盖什么 | 在大纲中的位置 |
|------|----------|---------------|
| **Docker Engine** | 安装、存储、网络、容器管理、daemon、日志、安全、Swarm | 阶段 0~4、6~8 主体 |
| **Docker Build** | Dockerfile、多阶段、多平台、缓存、Bake、CI、attestations | 阶段 2 主体 |
| **Docker Compose** | 服务编排、环境变量、profiles、watch、生产实践 | 阶段 5 主体 |
| **供应链安全**（Hub/Scout/Hardened Images） | 镜像分发、漏洞扫描、签名、加固镜像 | 阶段 2 末 + 阶段 8 |
| **AI 与智能体**（Model Runner/Sandboxes/MCP） | 2026 年新表面：本地跑模型、AI 沙箱 | 阶段 8 认脸 |

### 版本现状（2026-08 核验）

本大纲基准 **Docker Engine 29.x**（官方最新 29.7.2，发布注记 2026-08-05）。对照老教程时注意三个分水岭：

| 版本节点 | 变化 | 对学习的影响 |
|----------|------|-------------|
| 29.0（2025-11） | **新装默认启用 containerd image store**；cgroup v1 弃用（支持至 2029-05）；Content Trust 从 CLI 移除（方向转向 cosign 签名） | 老教程 `docker info` 里 Storage Driver 显示 `overlay2`，29.x 显示 `overlayfs`，是同一件事的新叫法 |
| 28.0（2025-02） | iptables 规则大改（DOCKER-USER 链、安全加固）、`--mount type=image` 引入（29.7 转正） | 讲网络的旧文截图与 28+ 实际规则对不上 |
| 23.0（2023-02） | BuildKit 成为默认构建器 | 更老的「Step 1/10」经典构建器输出已非默认 |

> 换句话说：**网上 2023 年前的 Docker 教程，网络与存储章节要带着「版本差异」的眼镜看**。

---

## 二、学成什么样，才算「资深专家」？

先立靶子。「资深」不是「背得出所有旗标」，它有四档验收，逐级递进：

| # | 档位 | 具体表现 |
|---|------|----------|
| 1 | **会交付** | 给任何中间件或语言应用，5 分钟内容器化跑起来；写出小而分层合理、缓存友好、不带秘钥的生产级 Dockerfile，能推企业仓库、能离线搬运 |
| 2 | **会排障** | 容器网络不通、卷丢数据、日志爆磁盘、进程被 OOM 杀——能顺着机制定位根因，而不是重启大法 |
| 3 | **会讲原理** | 能白板画出 `docker run` 从 CLI 到 runc 的完整链路；讲清 Namespace/CGroups/UnionFS 各自隔离了什么、共享了什么 |
| 4 | **会通生态** | 面向 2026：懂镜像供应链安全（扫描/签名），认得清 AI 时代的新表面，并以 Docker 为跳板顺利进入 K8s |

注意「资深」的定义里**没有**：背 CLI 全部旗标（有 `--help`）、读 Docker/Moby 源码、手写容器运行时（那是最后一步，不是第一步）。**机制直觉 + 排障路径 + 取舍判断力**才是分水岭——这三样都要靠动手实验喂出来，这正是西蒙学习法强调「及时反馈」的原因。

**认证锚点的 2026 年现状**（核验于 2026-08-24）：

- Docker 官方认证 **DCA（Docker Certified Associate）已停办**——Docker 官方论坛确认不再提供，企业业务 2019 年卖给 Mirantis 后由其维持了一段时间，目前市场已不认这张证；
- **市场现行锚点是 CNCF 的 CKA/CKAD**——容器技能的考核已经上移到编排层。所以本大纲的毕业锚点设计为「**毕业设计 + 架构决策记录**」，认证冲刺放在走完 [K8s 学习总纲](/云原生/k8s/k8s-00-roadmap)时进行，两份大纲无缝衔接。

---

## 三、西蒙学习法在本领域的四个落法

西蒙学习法的核心：**把领域拆碎成小单元，连续地、单点聚焦地逐个吃掉，每个单元立刻获得反馈**。对应到本大纲：

1. **拆碎**：每个知识单元控制在 0.5 ~ 2 天内可完成。绝不出现「学容器网络」这种大块头，只有「用 iptables-save 找到 -p 发布端口的那条 DNAT 规则」这种小块。
2. **单点聚焦**：一次只学一个单元。学数据卷的时候不要顺手去翻 Dockerfile 优化——忍住，它排在阶段 2；Swarm 排在阶段 8，主线学完前一眼都不要看。
3. **及时反馈**：每个单元都配**动手实验**和**吃透的标准**。实验跑不通 = 没学会，不进入下一单元。Docker 是「实验环境最便宜」的技术之一——一台笔记本就是真生产同款环境，没有理由不做实验。
4. **连续推进**：每天 1.5 ~ 2 小时，每周 5 ~ 6 天，连续推进约 16 周。可以慢，**顺序不要乱**：每个阶段的验收没过，不进下一阶段。

### 学习环境清单（开工前一次备齐）

| 工具 | 版本建议 | 用途 |
|------|----------|------|
| WSL2（Ubuntu）或一台 Linux 虚机 | Ubuntu 22.04+，内存 4G+ | 全程主实验场；Windows 用户用 WSL2 所见即生产 |
| Docker Engine | 29.x（apt 官方源 `docker-ce`） | 同装 `docker-compose-plugin`；不依赖 Docker Desktop 也能走完全程 |
| 镜像加速 | daemon.json 配 registry-mirrors | 国内网络拉镜像必需（装法在阶段 0） |
| 基础工具 | curl / jq / tree / iptables | 排障与验证输出用，缺什么 `apt install` 什么 |
| 浏览器 | 任意 | [Play with Docker](https://labs.play-with-docker.com/) 免费云端实验场，本机坏了的备用方案 |

> 可选伴读：[Linux 基础 6 篇](/Linux/basics/linux-01-nsenter-prerequisites)（nsenter/IP/tcpdump/netns/bind mount）与阶段 4、6 高度互补——先学 Docker 再回看，或反过来，都成立。

### 已有弹药与缺口

本板块现有 **35 篇**文章（33 篇主线 + 2 篇课程笔记附录），主线已按新大纲重排编号：旧 24 篇归位为各阶段的「弹药」——学到对应单元时回看，能省下近一半时间（各阶段末尾标注）；7 个缺口已建占位篇（编号 11/18/26/29/30/31/32，篇内有计划大纲），按本大纲逐篇补齐正文：

| 缺口 | 为什么要补 |
|------|-----------|
| 缺口（已占位） | 占位篇 | 为什么要补 |
|------|------|-----------|
| ✅ Compose 现代特性专篇 | [第 18 篇](./docker-18-compose-modern.md) | `compose watch` 热更、profiles、init 容器、provider services——已按新大纲成文（2026-08-25） |
| 🈳 buildx 多平台与 Bake 实操 | [第 11 篇](./docker-11-buildx-bake.md) | ARM 服务器 + Apple Silicon 时代，多平台构建已是交付标配；Bake 是官方编排式构建答案 |
| 🈳 供应链安全篇 | [第 30 篇](./docker-30-supply-chain.md) | Scout 漏洞治理、镜像签名、Hardened Images——2026 年企业刚需，29.x 已把 DCT 移除、方向转向 cosign |
| 🈳 rootless 模式实操 | [第 26 篇](./docker-26-rootless.md) | 多租户与公共 CI 场景的安全地基，官方 Security 板块主体之一 |
| 🈳 Swarm 前传 | [第 29 篇](./docker-29-swarm.md) | 单机到多机的最平滑跳板，也是理解「K8s 赢在哪」的对照组 |
| 🈳 2026 AI 表面 | [第 32 篇](./docker-32-ai-surface.md) | Model Runner 本地跑模型、Sandboxes 跑 AI 智能体——认脸级，但 2026 年面试已开始问 |
| 🈳 Engine API 与插件机制 | [第 31 篇](./docker-31-engine-api.md) | 写自己的容器平台/CI 工具的入场券 |

---

## 四、知识全景图

九大阶段，总周期约 **16 周**：

| 阶段 | 主题 | 回答的核心问题 | 周期 |
|------|------|----------------|------|
| 0 | 起步：把 Docker 跑起来再说 | Docker 到底解决了什么？怎么装？ | 1 周 |
| 1 | 会用：镜像与容器的日常 | 怎么把容器当日常工具？ | 2 周 |
| 2 | 交付：Dockerfile 与构建体系 | 怎么把「我的应用」变成镜像？ | 2 周 |
| 3 | 数据：数据怎么活过容器的死亡 | 容器一删，数据去哪了？ | 1 周 |
| 4 | 网络：容器不是孤岛 | 流量怎么进出容器？容器怎么互访？ | 2 周 |
| 5 | 编排：Compose 单机组队 | 一套应用怎么一键起停？ | 1 周 |
| 6 | 内幕：容器为什么是容器 | 隔离和轻量到底是谁实现的？ | 3 周 |
| 7 | 生产化：安全、日志、Daemon 运维 | 怎么敢把容器带上生产？ | 2 周 |
| 8 | 深水区与毕业：Swarm、供应链、AI 表面 | 资深之后往哪走？怎么证明自己？ | 2 周 |

**顺序设计的三个关键决定**，先说透，免得学到一半怀疑路线：

1. **第一天就把容器跑起来，原理后置**。阶段 0 的第一件事是装好、跑通、访问到页面——用体感兜住概念。内核三件套的解剖放在阶段 6。被 Docker 劝退的人，九成死在第一天就去背架构图和 namespace 清单。
2. **网络与数据各占完整篇幅**。生产事故里这两块占大头，但多数教程把它们压缩成「进阶篇」带过——尤其网络，`-p` 背后的整条链路是排障的命根子。驱动细节（ipvlan/macvlan、卷驱动）只求认脸，不陷进去。
3. **阶段 6 是「会用」与「资深」的分水岭**。namespace/cgroups/UnionFS/OCI 这层「机制膜」捅破之前，你学的都是「背命令」；捅破之后，排障有了依据（知道去哪看）、安全有了章法（知道在锁什么）。宁可多花两周，不要跳。

---

## 五、阶段 0：起步——把 Docker 跑起来再说（第 1 周）

**为什么有这个阶段**：先建立「我能驾驭它」的体感，并说清它解决什么问题——否则后面一切命令都是无本之木。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 0.1 环境地狱与容器解法 | 「我本地没问题」为什么是世纪难题？ | 对照一次真实部署清单（装 JDK/Redis/改配置），再用容器一条命令替代它 | 能用自己的话说出 Docker 打包的到底是什么 |
| 0.2 容器是什么 | 容器和虚拟机差在哪？ | 同一个 nginx 分别用 VM 思路和容器起一遍，对比启动秒级 vs 分钟级 | 说清「容器 = 被内核限制了视角的普通进程」「共享内核，不虚拟化硬件」 |
| 0.3 平台版图认脸 | Engine/CLI/daemon/BuildKit/Compose/Hub/Desktop 各是什么？ | `docker version` 看清 Client 与 Server 两段；浏览 docs 四大手册目录 | 拿到任何一个 Docker 名词能归位到平台图的某一格；**只求认脸，不求解剖** |
| 0.4 安装与跑通 | 生产、离线、个人机各怎么装？ | WSL2/Linux 上 apt 安装 29.x、配镜像加速、`docker run hello-world` 全程走通 | 换一台新机器，不看笔记 30 分钟内装好并跑通第一个容器 |

**阶段验收**：给一个没接触过容器的同事讲 10 分钟「Docker 是什么、不是什么」，全程不许说「轻量级虚拟机」这种糊涂话。

---

## 六、阶段 1：会用——镜像与容器的日常（第 2 ~ 3 周）

**为什么有这个阶段**：让容器进入日常——起中间件、查状态、进现场、搬镜像。这个阶段结束，Docker 对你不再是「别人嘴里的词」，而是手边的工具。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 1.1 镜像与容器的关系 | 类与实例、只读层与读写层是怎么回事？ | 起两个同镜像容器，改其中一个的文件，另一个不受影响 | 能画出「镜像（只读层叠）+ 读写层 = 容器」的层次图 |
| 1.2 容器生命周期 | run/ps/stop/start/rm/logs 每天用的命令都是什么语义？ | 不看资料起一个带端口映射、环境变量、名字、自清理的 nginx 并访问到它 | 说清 stop 与 kill、rm 与 `--rm`、暂停与停止的区别 |
| 1.3 进容器看现场 | 容器里出事了怎么进去？ | `exec -it` 进容器查文件、看进程；对比 attach 与 exec 的本质差异 | 说清「exec 是新开进程，attach 是接管主进程」——用错 attach 会连坐杀容器 |
| 1.4 镜像分发 | 镜像名里的 `library/`、tag、digest 各是什么？registry 怎么交互？ | pull 一个 Official Image；`tag` + `push` 推到自己的仓库；save/load 与 export/import 各做一次离线搬运 | 说清 save/load（带元数据）与 export/import（丢元数据）的适用场景各是什么 |
| 1.5 磁盘账单 | 镜像越拉越多，磁盘去哪了？ | `docker system df` 看家底；prune 各对象一遍，观察悬空镜像与悬空卷的命运 | 知道 `--rm` 容器退出时匿名卷会不会跟着删（实测坑），清理前知道什么不能删 |

**阶段验收**：用容器起一套 MySQL + Redis，从宿主机连上写入数据，全程零文档；然后整环境清理到「像没来过」。

**弹药**：[Docker 是什么](./docker-01-what-is-docker.md)、[容器 vs 虚拟机](./docker-02-container-vs-vm.md)、[Engine 与平台](./docker-03-engine-platform.md)、[安装三种方式](./docker-04-install.md)、[容器与镜像](./docker-05-container-and-image.md)、[容器日常命令](./docker-06-container-commands.md)、[进入容器四法](./docker-07-enter-container.md)、[镜像搬运](./docker-08-image-transfer.md)。

---

## 七、阶段 2：交付——Dockerfile 与构建体系（第 4 ~ 5 周）

**为什么有这个阶段**：会用别人的镜像只是起点，你的应用要变成镜像交付出去——这是「使用者」和「交付者」的分界，也是 CI/CD 的第一块砖。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 2.1 Dockerfile 基本功 | 一份「可复现的构建脚本」怎么写？ | 从 `FROM alpine + echo` 写到能 curl 通的服务镜像；说清 CMD 与 ENTRYPOINT 的分工 | 说清「构建上下文」是什么——为什么 `COPY ../xxx` 必然失败 |
| 2.2 分层与缓存 | 为什么 Dockerfile 的指令顺序就是构建速度？ | 故意把 COPY 源码放在依赖安装之前，观察缓存全失效；再调整顺序对比 | 说清「哪条指令变、哪些层重建」的判断规则，会写 `.dockerignore` |
| 2.3 多阶段构建 | 工具链为什么不该进镜像？ | 同一 Java/Go 应用单阶段 vs 多阶段各打一遍，对比体积（如 1.44GB → 20MB 量级） | 说清丢掉的是什么（编译器）、留下的是什么（产物 + 运行时） |
| 2.4 BuildKit 时代 | 默认构建器早已换人，新体系怎么用？ | 用 buildx 建多平台 builder；`--secret` 挂构建期密钥；对比经典构建器输出差异 | 知道 BuildKit/buildx/bake 三者关系；多平台构建（amd64+arm64）跑通一次 |
| 2.5 镜像分发与信任内容 | 镜像往哪推、怎么选基础镜像？ | 部署私有仓库（Harbor），推拉全流程；对比 `:latest` 与 digest 固定的差异 | 知道 Official Images / Verified Publisher / Hardened Images 三档信任内容的区别 |
| 2.6 构建元数据 | 镜像里能附「出生证明」吗？ | 构建一次带 SBOM + provenance 的镜像，用 `docker buildx imagetools inspect` 看到 attestations | 认脸级：知道 SBOM/SLSA 是供应链安全的地基（阶段 8 深挖） |

**阶段验收**：把自己写的一个真实应用（任意语言）打成 <100MB 的生产级镜像，推到私有仓库；在另一台离线机器上 load 后跑通。

**弹药**：[Dockerfile 自制镜像](./docker-09-dockerfile.md)（含三语言打包实战）、[构建进阶](./docker-10-build-advanced.md)、[buildx 与 Bake](./docker-11-buildx-bake.md)（🈳 占位）、[Harbor 安装](./docker-12-harbor.md) + [Harbor 使用](./docker-13-harbor-usage.md)。

---

## 八、阶段 3：数据——数据怎么活过容器的死亡（第 6 周）

**为什么有这个阶段**：容器天然「用完即弃」，数据必须住在外面。存储选型错了，删容器就是删库——这是新手最贵的一类事故。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 3.1 五种挂载全景 | volume/bind/tmpfs/image mount 各是什么？ | 同一个目标路径分别用三种方式挂载，容器内外对照看文件 | 能画出「容器层之上叠什么」的示意图，说清 Docker 管不管宿主路径 |
| 3.2 卷深入 | 匿名卷和命名卷命运差在哪？ | 起带 `-v` 的 mysql，删容器重建挂同卷，验证数据复活；`--volumes-from` 继承一次 | 说清「空卷垫底 copy-on-first-use」、备份恢复的完整套路 |
| 3.3 bind mount 的坑 | 挂宿主目录为什么时灵时不灵？ | 实测：挂到镜像已有内容的路径会发生什么（遮蔽）；`-v` 源路径写错会怎样（静默建空目录） | 知道「开发热更新用 bind、生产数据用 volume」背后的机制原因 |
| 3.4 tmpfs 与 image mount | 不落盘和「以镜像为卷」是什么场景？ | tmpfs 挂敏感目录验证只在内存；`--mount type=image` 只读挂一个工具镜像进去 | 知道 tmpfs「可能换出到 swap」这个官方口径；image mount 在 29.7 已转正 |

**阶段验收**：mysql 容器写入数据 → 删容器 → 重建挂同一个卷 → 数据还在；全程能解释每一层发生了什么，并说清三种挂载的选型决策树。

**弹药**：[数据持久化](./docker-14-data-persistence.md)（十节版，官方 Storage 全板块对表）。

---

## 九、阶段 4：网络——容器不是孤岛（第 7 ~ 8 周）

**为什么有这个阶段**：生产事故一半在网络。「容器怎么互访、外部流量怎么进来」背后是一条完整的 Linux 网络链路——这条链路看不清，排障只能靠重启；看得清，你顺手就懂了一半的 K8s 网络。

| 单元 | 回答的核心问题 | 动手实验 | 吃通的标准 |
|------|----------------|----------|------------|
| 4.1 docker0 与网桥模型 | 容器的 IP 从哪来？ | `ip addr` 看 docker0；起两个容器互 ping；宿主机数 veth 设备 | 说清「bridge = 宿主机里的虚拟交换机」和 veth 一端在容器一端在网桥 |
| 4.2 自定义网络与内置 DNS | 为什么默认 bridge 不能按名字互访？ | 同一应用分别放默认 bridge 和自定义网络，用容器名互 ping 对照 | 说清内置 DNS（127.0.0.11）、网络别名、多网络 attach 的行为 |
| 4.3 端口发布全景 | `-p 8080:80` 之后流量怎么进容器？ | `iptables-save`（或 nftables）找到那条 DNAT 规则；`ss -tlnp` 抓到 docker-proxy 进程 | 脱稿画出「浏览器 → 宿主端口 → NAT/代理 → 容器端口」全链路，标出每跳的排查命令 |
| 4.4 防火墙与边界 | 容器把端口暴露给谁了？DOCKER-USER 是什么？ | 在 DOCKER-USER 链加一条拒绝规则验证生效；了解 28.0 起 iptables 大改与 nftables 可选后端 | 知道「`-p` 默认对全网开放、回环要显式绑定」这类安全边界 |
| 4.5 其他网络驱动 | host/none/container/ipvlan/macvlan/overlay 什么时候用？ | host 模式对比端口发布；none 模式验证真隔离；ipvlan/macvlan 各建一个（认脸） | 给「容器直接用宿主网络」「物理网络里当独立主机」「跨主机组网」三类场景做出选型 |

**阶段验收**：画出「curl localhost:8080 → 到容器内 nginx」的完整流量路径图，标出每一跳可能断掉的位置和对应排查命令。

**弹药**：[Docker 网络](./docker-15-network.md)（师生对话课，含 docker0/DNAT/DNS 全链路实验）；overlay 与跨主机组网在[第 29 篇 Swarm](./docker-29-swarm.md)（🈳 占位）。

---

## 十、阶段 5：编排——Compose 单机组队（第 9 周）

**为什么有这个阶段**：真实应用从不是单个容器。Web + API + DB + 缓存用 `docker run` 逐个起是灾难——Compose 把「一套环境」写成一个文件，这是声明式运维的第一课（也是 K8s YAML 的思维预科）。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 5.1 最小工程到多服务 | services/networks/volumes 三段怎么组织？服务怎么互访？ | 一个 compose.yaml 起三个服务，用服务名互 ping/curl，观察专属网络和 DNS | 说清「Compose 会为工程建专属网络」——和阶段 4 的知识接上了 |
| 5.2 工程化配置 | 环境变量、依赖顺序、健康检查怎么管？ | `.env` 与 `environment` 优先级实验；`depends_on` + `healthcheck` 让 DB 就绪再起 App；profiles 按需分组启停 | 说清「配置和代码分离」在 compose 里的完整做法；知道 `version:` 字段已废弃 |
| 5.3 开发闭环与生产 | 代码一改容器就更新？Compose 能上生产吗？ | `compose watch` 文件同步热更实验；`deploy.resources` 单机限额验证；`--scale` 扩缩容踩一次端口撞车 | 说清 build/watch/scale 各自适合的阶段；知道官方「生产用 Compose」的定位与边界 |

**阶段验收**：写一个含构建、健康检查、依赖顺序、数据卷的 compose.yaml，`docker compose up -d` 一键起一套 HTTPS 反代的 Web+DB 栈，重启宿主机后整套自愈。

**弹药**：[Compose 编排](./docker-16-compose.md)、[HTTPS Nginx 实战](./docker-17-https-nginx.md)、[Compose 现代特性](./docker-18-compose-modern.md)（✅ 已成文，watch/profiles/include/pre_start 全实测）。

---

## 十一、阶段 6：内幕——容器为什么是容器（第 10 ~ 12 周）★分水岭

**为什么有这个阶段**：到这里之前，你学的都是 Docker「暴露给你的面」；这个阶段拆开它的「芯」。**「会用」和「资深」的分界线就在这里**——过了这关，前面五个阶段的所有「怪现象」（文件删了镜像没小、容器里 PID 1、OOM 被杀、exec 为什么能进容器）全部串起来。宁可多花两周，不要跳。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 6.1 三大基石总览 | namespace/cgroups/UnionFS 各回答一个什么问题？ | 用 `unshare` 手跑一个「裸容器」，容器内外对比 ps/ip/hostname | 说清「隔离视角、限额资源、叠层文件」三件事各自的职责边界 |
| 6.2 Namespace 六大件 | 每种命名空间隔离了什么资源？ | 逐个实验：容器内外 PID 对比（pid）、hostname（uts）、网卡（net）、挂载点（mnt）、用户映射（user）、IPC | 给「容器里看到的 ≠ 宿主机的」每类现象标出是哪个 namespace 干的 |
| 6.3 CGroups v2 | `--cpus/--memory` 到底是谁在执行？限额超了会怎样？ | cgroupfs 里找到容器目录，读 cpu.max/memory.max；压内存触发 OOM，看 ExitCode=137 与 OOMKilled 标记 | 说清限额、内存超卖、OOM 击杀的完整因果链；会 `docker update` 动态调整 |
| 6.4 UnionFS/OverlayFS | 两个目录怎么叠出一个文件系统？镜像分层怎么落地？ | `mount -t overlay` 手工叠两层目录；在容器里删一个镜像里有的文件，到 upperdir 找 whiteout | 说清「为什么删了文件镜像不一定变小」；知道 29.x 的 containerd image store 换了什么 |
| 6.5 架构链路与 OCI | `docker run` 到底经过了谁的手？ | `ps aux` 找到 dockerd/containerd/containerd-shim/runc 四级进程；`ctr` 直接操作 containerd 认脸 | 脱稿画出 CLI → daemon → containerd → shim → runc 链路；说清 OCI 镜像规范与运行时规范卡在哪两层之间 |
| 6.6 宿主机视角排障 | 容器卡死了，从外面怎么救？ | 宿主机找到容器进程的真实 PID；`nsenter` 进入容器命名空间排查；亲手杀掉容器的 PID 1 看结局 | 说清「容器就是进程」——排障视角从此两边切换自如 |

**阶段验收**：拿一张白纸，从 `docker run` 敲下回车画到进程启动，标出每一环用了哪个 namespace/cgroup/文件系统特性、经过了哪个组件。这一张图值一场面试。

**弹药**：[技术底座总览](./docker-19-tech-foundation.md)、[UnionFS 与分层](./docker-22-unionfs.md)、[Namespace 隔离](./docker-20-namespace.md)、[进程视角看容器](./docker-24-process-view.md)、[CGroups 限资源](./docker-21-cgroups.md)、[Daemon 与 runtime](./docker-23-daemon-runtime.md)、附录[容器运行时](./docker-a01-container-runtime-docker.md)/[Containerd](./docker-a02-containerd.md)。

---

## 十二、阶段 7：生产化——安全、日志、Daemon 运维（第 13 ~ 14 周）

**为什么有这个阶段**：开发机能跑不算完。生产的入场券是三件事：**出不了安全事故、磁盘不会被日志吃爆、升级不用停业务**——对应安全、可观测、daemon 运维三块。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 7.1 安全模型 | `--privileged` 到底裸奔了多少？不用它怎么干活？ | 对比 CapEff 差异；`--cap-add` 精准给权限；`--user` 降权运行；seccomp/AppArmor 认脸 | 给「容器要绑定低端口/要 mount/要 ping」各开出最小权限处方 |
| 7.2 隔离加固 | root 都不给他行不行？ | rootless 模式装一次跑通；user namespace remap 让容器内 root ≠ 宿主 root | 说清 rootless 的取舍（性能/功能边界）和适用场景 |
| 7.3 日志体系 | 容器日志去哪了？不配上限会怎样？ | json-file 驱动解剖 + 配轮转（10m×3）实测日志体积封顶；local 驱动与远程驱动（fluentd/syslog）认脸 | 知道默认不配轮转=磁盘定时炸弹；会给生产集群定日志基线 |
| 7.4 可观测 | 出事了，眼睛看哪？ | `stats/events/system df` 三件套盯同一容器；daemon 开 9323 metrics 接 Prometheus | 说清「一个容器的资源、事件、磁盘账单」分别从哪拿 |
| 7.5 Daemon 运维 | 升级 Docker 要停业务吗？ | 配 `live-restore` 实测 daemon 重启容器存活（注意首次启用的坑）；daemon.json 常用项过一遍；socket 暴露的风险与 TLS 远程访问 | 说清 daemon、containerd、容器三层谁死谁不死；知道 `docker.sock` 挂进容器等于给 root |
| 7.6 资源与 GPU | 容器怎么吃 GPU？ | `--gpus` 跑一次；了解 CDI 设备注入（2026 现行方案） | 说清 GPU 进容器的链路（驱动/工具包/运行时）与 CPU/内存限额的不同 |

**阶段验收**：给阶段 5 的那套栈做一次「生产体检」：非 root 运行 + 最小权限 + 资源限额 + 日志轮转 + metrics 暴露，五项全过。

**弹药**：[容器安全](./docker-25-container-security.md)、[Rootless 模式](./docker-26-rootless.md)（🈳 占位）、[日志与监控](./docker-27-logging-monitoring.md)、[Daemon 运维](./docker-28-daemon-ops.md)。

---

## 十三、阶段 8：深水区与毕业——Swarm、供应链、AI 表面（第 15 ~ 16 周）

**为什么有这个阶段**：前七个阶段让你「会交付、会排障、会讲原理」；最后一段补齐「会通生态」的纵深，并用毕业设计把能力钉死。深水区只求每个方向打一口浅井、认全地图，不求面面俱到。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 8.1 Swarm 多机组队 | 单机到多机，官方自带的答案是什么？ | 三节点 swarm：部署服务、扩缩、滚动更新、路由网格访问（overlay 网络接阶段 4） | 说清 Swarm 与 K8s 的取舍——为什么市场选了后者，以及「概念都同构」（服务/副本/滚动更新） |
| 8.2 供应链安全 | 你 pull 下来的镜像可信吗？ | 用 Scout 扫一个自有镜像看漏洞清单；了解镜像签名与验证（29 起 DCT 移除、cosign 方向）；Hardened Images 认脸 | 能给企业定一条「基础镜像三档信任 + 扫描门禁 + 签名验证」的流水线规矩 |
| 8.3 生态工具箱 | 官方全家桶还有什么？ | Testcontainers 写一个集成测试；Build Cloud/Offload/Desktop 企业治理（SSO/镜像访问管控）认脸 | 说清哪些是开源免费、哪些是商业订阅——给团队选型不当冤大头 |
| 8.4 2026 AI 表面 | Docker 在 AI 时代干什么？ | Model Runner 本地跑一个小模型并 curl 推理接口；Sandboxes/MCP 认脸 | 知道「容器技术是 AI 工程的地基」——这是本系列与 [AI 板块](/Ai/roadmap/aicon-2026-roadmap)的接口 |
| 8.5 毕业设计 | 综合大考 | 把一个**真实的**多服务系统（含网关、无状态服务、中间件）完整容器化：构建流水线（多阶段+CI 缓存）→ 私仓 → Compose 上生产配置（安全+限额+日志+健康检查）→ 一次故障演练排障 | 产出一份《架构决策记录》：每个决策写清「问题、候选方案、取舍理由」——这份文档比任何证书都能证明「资深」 |

**阶段验收**：毕业设计 + 《架构决策记录》落地，Docker 这张地图你就走完了主干——下一站 [K8s 学习总纲](/云原生/k8s/k8s-00-roadmap)，那边阶段 0 的容器地基你已经打完了。

**弹药**：[Swarm 多机编排](./docker-29-swarm.md)、[供应链安全](./docker-30-supply-chain.md)、[Engine API 与插件](./docker-31-engine-api.md)、[AI 表面](./docker-32-ai-surface.md)（均 🈳 占位）、[TruFor 镜像打包复盘](./docker-33-trufor-image-packaging.md)（真实交付翻车链）。

---

## 十四、资深自检 10 问

1. 容器和虚拟机的本质区别是什么？namespace 隔离了什么、**没**隔离什么？
2. 镜像为什么能秒级启动？「分层只读 + 读写层」在磁盘上是怎么落地的？
3. `docker run -p 8080:80` 之后，`curl localhost:8080` 的流量经过哪几跳？哪一跳可能静默断掉？
4. volume/bind/tmpfs 三种挂载怎么选？`--rm` 容器退出时，匿名卷到底删不删？
5. 多阶段构建为什么能把镜像从 GB 级瘦到 MB 级？丢掉的是什么、留下的怎么保证能跑？
6. 容器里的 PID 1 在宿主机是谁？怎么从宿主机找到它、进入它的命名空间？
7. 容器被 OOM 杀掉（ExitCode=137）是谁干的？证据去哪查？怎么预防？
8. `--privileged` 到底放开了什么？不开它，怎么给容器「绑定低端口」和「挂载文件系统」的权限？
9. daemon 重启时容器会不会死？`live-restore` 改变了什么、没改变什么？
10. dockerd/containerd/shim/runc 四级各干什么？OCI 规范卡在哪两层之间？

（答不出哪个，回对应阶段补哪个。）

---

## 十五、总时间线

| 周 | 内容 |
|----|------|
| 1 | 阶段 0：起步（问题/概念认脸/安装跑通） |
| 2 ~ 3 | 阶段 1：镜像与容器日常（生命周期/进现场/分发/磁盘账单） |
| 4 ~ 5 | 阶段 2：Dockerfile 与构建体系（分层缓存/多阶段/BuildKit/私仓） |
| 6 | 阶段 3：数据持久化（五种挂载/卷生命周期/备份恢复） |
| 7 ~ 8 | 阶段 4：网络（docker0/DNS/端口发布链路/防火墙/驱动选型） |
| 9 | 阶段 5：Compose（工程化配置/watch/生产定位） |
| 10 ~ 12 | 阶段 6：原理内幕（Namespace/CGroups/OverlayFS/OCI 链路）★分水岭 |
| 13 ~ 14 | 阶段 7：生产化（安全/日志/可观测/daemon 运维/GPU） |
| 15 ~ 16 | 阶段 8：深水区与毕业（Swarm/供应链/AI 表面/毕业设计） |

每天 1.5 ~ 2 小时。进度可以慢，**顺序不要乱**：每个阶段的验收没过，不进下一阶段。中断两周以上，回来先重做当前阶段最后一个实验再续。

---

## 十六、参考资料（均已核验为当前状态，核验时间 2026-08-24）

### 官方一手资料

- [Docker 官方文档](https://docs.docker.com/)——**全程主教材**，Get started（入门）/ Guides（场景）/ Manuals（Engine、Build、Compose 三大手册）/ Reference（CLI、Dockerfile、Engine API 字典）四区按需取用
- [Engine 29 发行注记](https://docs.docker.com/engine/release-notes/29/)——本大纲版本基准；29.0 起的新装默认 containerd image store、cgroup v1 弃用（至 2029-05）、DCT 移除均出自此处
- [Docker 安全板块](https://docs.docker.com/engine/security/)——阶段 7 的主教材（rootless/seccomp/AppArmor/socket 保护）
- [Play with Docker](https://labs.play-with-docker.com/)——浏览器里免费玩真 Docker，等公交也能做实验

### 衔接资料（本博客内）

- [K8s 学习总纲](/云原生/k8s/k8s-00-roadmap)——本大纲的下一站；其阶段 0（容器地基）与本大纲阶段 1~6 重合，走完本篇可跳读
- [Linux 基础 6 篇](/Linux/basics/linux-01-nsenter-prerequisites)——阶段 4/6 的伴读（tcpdump/netns/bind mount）
- [AICon 2026 学习总纲](/Ai/roadmap/aicon-2026-roadmap)——阶段 8.4 AI 表面的延伸地图

### 认证现状

- Docker 官方已停办 DCA（Docker Certified Associate）认证——Docker 官方论坛确认不再提供；容器技能的现行市场锚点是 CNCF 的 **CKA/CKAD**，认证冲刺放在 K8s 总纲末段进行

---

## 结语：一条线，走到底

这份大纲的本质，是把三层结构（交付/隔离/编排）织成的知识网**压平成一条链**：

> 起步跑通 → 镜像与容器日常 → Dockerfile 构建 → 数据 → 网络 → Compose → 原理内幕 → 生产化 → 深水毕业

每个环节只有一个入口——前一个环节。从阶段 0 第一次 `docker run hello-world` 开始，走完这条线，Docker 对你不再是命令行的海洋和生态的乱麻，而是一张你能指出哪里扎实、哪里在偷懒的施工图。

**本板块 33 篇主线已按新大纲重排完毕**：旧 24 篇教材归位为各阶段弹药，7 篇缺口已建占位（第 11/18/26/29/30/31/32 篇），其中**第 18 篇 Compose 现代特性已成文**，其余 6 篇将按本大纲逐篇补齐正文（buildx 多平台与 Bake / 供应链安全 / rootless / Swarm 前传 / AI 表面 / Engine API）。

下一步，从阶段 0 的第一个实验开始：[《Docker 是什么——从 jar 包部署到镜像一键上线》](./docker-01-what-is-docker.md)。
