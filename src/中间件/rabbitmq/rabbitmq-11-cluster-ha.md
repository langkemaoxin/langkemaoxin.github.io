---
title: "RabbitMQ 集群与高可用"
sidebarGroup: "RabbitMQ"
shortTitle: "11 集群与高可用"
order: 11
date: 2026-09-04
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 11/22 篇**  
> 上一篇：[《RabbitMQ 监控、备份与联邦同步》](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation)  
> 下一篇预告：[《Classic 队列为什么一堆积就变慢——内存窗口、落盘与流控》](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation)

---

## 开头：单机磁盘坏了，消息全没

单机 RabbitMQ 宕机可以重启；磁盘损坏则 Queue 上的消息可能永久丢失——生产环境不可接受。RabbitMQ 从设计之初就支持 **集群**：多个节点组成一个逻辑 Broker 共享元数据，再用 **Quorum 队列**让消息跨节点冗余，最后用 **HAProxy + Keepalived** 对客户端隐藏节点故障。

> ⚠️ **先纠一个常见误区**：老教程里「集群 + 镜像队列（`ha-mode`）= 生产高可用」的说法，在 **RabbitMQ 4.0（2024）删除 Classic 镜像队列后已经作废**。现在的高可用正解是 **普通集群 + Quorum 队列**，镜像队列只作为历史背景了解。

本篇不讲一堆理论，**上来先动手**：用 Docker Compose 在本机真实搭一个三节点集群（**RabbitMQ 4.3.4 / Erlang 27.3.4.16**），所有命令输出都是实跑结果，搭完再回头看机制，讲透 **消息冗余、网络分区、集群运维、前端高可用** 四块。

---

## 一、先把集群搭起来：Docker Compose 三节点（实测）

> 📖 完整机制可参考官方 [Clustering Guide](https://www.rabbitmq.com/docs/clustering)，本节直接动手。

环境：WSL2 Ubuntu-22.04 + Docker（Server 29.1.3），镜像 `rabbitmq:4.3-management`。

### 1.1 docker-compose.yml（实测用的就是这份）

这份 compose 想干一件事：**在一台机器上用 3 个容器模拟 3 台独立的服务器，组成一个 RabbitMQ 集群**。它模拟了真实多机部署的全部要素——每个容器有自己固定的主机名（对应真实机器的 hostname）、自己的数据卷（对应真实机器的本地磁盘）、宿主机上互不冲突的端口映射；唯一「共享」的是 `RABBITMQ_ERLANG_COOKIE`，它就是真实部署时需要逐台分发的节点间互信密钥。

| 模拟的真实机器 | 容器 | 宿主机端口（AMQP / 管理台） |
|------|------|------|
| 服务器 1 | `rabbit1`（节点名 `rabbit@rabbit1`） | 5672 / 15672 |
| 服务器 2 | `rabbit2`（节点名 `rabbit@rabbit2`） | 5673 / 15673 |
| 服务器 3 | `rabbit3`（节点名 `rabbit@rabbit3`） | 5674 / 15674 |

```yaml
services:
  rabbit1:
    image: rabbitmq:4.3-management
    container_name: rabbit1
    hostname: rabbit1                      # 固定 hostname → 节点名 rabbit@rabbit1
    restart: unless-stopped                # WSL 空闲关闭后能自动拉起
    environment:
      RABBITMQ_ERLANG_COOKIE: "rmq-cluster-cookie-2026"   # 三节点必须一致
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbit1-data:/var/lib/rabbitmq

  rabbit2:
    image: rabbitmq:4.3-management
    container_name: rabbit2
    hostname: rabbit2
    restart: unless-stopped
    environment:
      RABBITMQ_ERLANG_COOKIE: "rmq-cluster-cookie-2026"
    ports:
      - "5673:5672"
      - "15673:15672"
    volumes:
      - rabbit2-data:/var/lib/rabbitmq

  rabbit3:
    image: rabbitmq:4.3-management
    container_name: rabbit3
    hostname: rabbit3
    restart: unless-stopped
    environment:
      RABBITMQ_ERLANG_COOKIE: "rmq-cluster-cookie-2026"
    ports:
      - "5674:5672"
      - "15674:15672"
    volumes:
      - rabbit3-data:/var/lib/rabbitmq

volumes:
  rabbit1-data:
  rabbit2-data:
  rabbit3-data:
```

**`restart: unless-stopped` 是什么意思**：这是 Docker 的**重启策略**——容器意外退出（崩溃、被杀）或 Docker 守护进程重启时，自动把容器拉起来；唯一的例外是「你手动 `docker stop` 过它」（这种情况下你显然是有意让它停着，重启后也不会自动拉起）。对比一下其它取值：

| 策略 | 容器退出后 | 守护进程/Docker 重启后 | 说明 |
|------|:---:|:---:|------|
| `no`（默认） | 不重启 | 不重启 | 挂了就挂了 |
| `on-failure` | 非正常退出才重启 | 视情况 | 适合任务型容器 |
| `always` | 总是重启 | **连手动 stop 的也会拉起** | 太激进 |
| **`unless-stopped`** | 总是重启 | 手动 stop 过的除外 | ✅ 长跑服务的常用选择 |

对集群来说这条配置很关键：节点挂了自动拉起，且因为数据卷里持久化了集群成员关系，重新起来的节点会**自动重新加入集群、不用再手动 join**（本机 WSL 环境的实测坑见 1.3 末尾）。

### 1.2 启动并组成集群（实测输出）

```bash
$ docker compose up -d            # 拉起三个独立节点
$ docker exec rabbit2 rabbitmqctl join_cluster rabbit@rabbit1
Clustering node rabbit@rabbit2 with rabbit@rabbit1
$ docker exec rabbit3 rabbitmqctl join_cluster rabbit@rabbit1
Clustering node rabbit@rabbit3 with rabbit@rabbit1
```

就这么简单——**4.3 起 join 前不再需要 `stop_app` / `reset` / `start_app` 三板斧**，一行 `join_cluster` 直接成团（4.1.0 的简化，见 [Clustering Guide](https://www.rabbitmq.com/docs/clustering)）。但 join 是**破坏性操作**：节点不能既加入别的集群又保留原有数据，别拿存了数据的节点去 join。

### 1.3 验证集群状态（实测输出）

```bash
$ docker exec rabbit1 rabbitmq-diagnostics cluster_status
```

```
Cluster status of node rabbit@rabbit1 ...
Basics

Cluster name: rabbit@rabbit1
Total CPU cores available cluster-wide: 18

Disk Nodes

rabbit@rabbit1
rabbit@rabbit2
rabbit@rabbit3

Running Nodes

rabbit@rabbit1
rabbit@rabbit2
rabbit@rabbit3

Versions

rabbit@rabbit1: RabbitMQ 4.3.4 on Erlang 27.3.4.16
rabbit@rabbit2: RabbitMQ 4.3.4 on Erlang 27.3.4.16
rabbit@rabbit3: RabbitMQ 4.3.4 on Erlang 27.3.4.16

CPU Cores

Node: rabbit@rabbit1, available CPU cores: 6
Node: rabbit@rabbit2, available CPU cores: 6
Node: rabbit@rabbit3, available CPU cores: 6

Maintenance status

Node: rabbit@rabbit1, status: not under maintenance
Node: rabbit@rabbit2, status: not under maintenance
Node: rabbit@rabbit3, status: not under maintenance

Alarms

(none)

Network Partitions

(none)

Listeners

Node: rabbit@rabbit1, interface: [::], port: 15672, protocol: http, purpose: HTTP API
Node: rabbit@rabbit1, interface: [::], port: 15692, protocol: http/prometheus, purpose: Prometheus exporter API over HTTP
Node: rabbit@rabbit1, interface: [::], port: 25672, protocol: clustering, purpose: inter-node and CLI tool communication
Node: rabbit@rabbit1, interface: [::], port: 5672, protocol: amqp, purpose: AMQP 0-9-1 and AMQP 1.0
（rabbit2、rabbit3 的 listener 同构，只是映射到宿主机的端口是 5673/15673、5674/15674）

Feature flags

Flag: khepri_db, state: enabled
（另有 30+ 个特性 flag，全部 enabled，完整列表见原生命令输出）
```

三个节点都出现在 **Running Nodes**，集群成了。浏览器打开 `http://localhost:15672`（默认 `guest/guest`），Overview 页底部的 **Nodes** 列表能看到三个节点全绿：

![管理控制台 Overview 页：三节点集群](/中间件/rabbitmq/15/p11-02.png)

> 🔑 看截图右上角：管理台顶部显示 **RabbitMQ 4.3.4 / Erlang 27.3.4.16**，集群名 `rabbit@rabbit1`；**Nodes** 区块列出 `rabbit@rabbit1/2/3` 及各自的文件描述符、Erlang 进程数、内存、磁盘等运行指标——这就是「一个逻辑 Broker」的样子。

> ⚠️ **本机实测踩的坑**：最初没加 `restart` 策略，三节点启动约 1 分半后全部收到 SIGTERM 退出（exit 0）——不是 OOM（内存充足），而是 **WSL2 在命令间隙空闲关闭了 VM**，把 dockerd 和容器一起优雅停了（同机其它 compose 项目也跟着重启）。**解法就是上面 compose 里的 `restart: unless-stopped`**：节点随卷里的集群成员关系自动重组，不用重新 join；再开一个常驻 WSL 会话（如 `wsl ... sleep 1800`）保活即可。

### 1.4 回头看：compose 里那三处关键配置为什么这么写

集群搭起来了，现在解释为什么。不论怎么部署，组成集群都绕不开三件事——Docker 把它们都简化了（原理详见 [Clustering Guide](https://www.rabbitmq.com/docs/clustering)）：

**① 节点名要唯一且固定**。节点名 = `前缀@hostname`（前缀默认 `rabbit`），集群节点用它互相寻址，所以 **hostname 部分必须能被所有节点解析**。手动部署得改 hostname；Docker 用 `hostname:` 字段固定。这里还有个隐蔽的坑：RabbitMQ 默认**用当前 hostname 命名数据目录**，hostname 一变就会创建一个新的空数据库——表现为「消息凭空消失」。所以固定 hostname 不只是寻址需要，更是数据安全需要。

**② Erlang Cookie 必须一致**。它是节点间互信的共享密钥——集群里每个节点的 Erlang 运行时靠它完成握手认证，口令对不上直接拒绝通信。手动部署要拷 `/var/lib/rabbitmq/.erlang.cookie` 到每台机器并 `chmod 600`（还容易踩「挂卷后属主变 root、rabbitmq 用户读不到」的坑）；Docker 镜像提供了 `RABBITMQ_ERLANG_COOKIE` 环境变量——**集群里每个节点容器设同一个值即可**，本篇 compose 正是这么做的。

> 📖 Cookie 的完整机制——它为什么是「节点口令」、challenge-response 握手逐步拆解（含泳道时序图）、口令对不上时双侧日志长什么样、文件与环境变量的优先级、生产安全清单——见番外篇[《Erlang Cookie——RabbitMQ 节点之间的「口令」》](/中间件/rabbitmq/rabbitmq-11a-erlang-cookie)。

**③ 节点间能互相解析 hostname、端口可达**。Compose 默认网络里容器能用 service 名（`rabbit1`/`rabbit2`/`rabbit3`）互相解析。集群通信相关端口：

| 端口 | 用途 |
|------|------|
| 4369 | epmd，节点与 CLI 的发现服务 |
| 25672 | 节点间通信（Erlang distribution） |
| 5672 | AMQP（客户端） |
| 15672 | 管理控制台 |

> 🔑 三要点：① `hostname` 固定（否则容器重建数据目录对不上）；② `RABBITMQ_ERLANG_COOKIE` 三节点一致；③ 三者在同一 Compose 网络（默认就是），才能用 service 名互访。

### 1.5 磁盘节点（disc）vs 内存节点（ram）

`join_cluster` 有个 `--ram` 参数，决定节点的**类型**。先讲清概念，再说为什么 4.3 基本用不上。

**① 节点类型只管「元数据」怎么存，不管「消息」怎么存**——这是最容易混的点。节点是 disc 还是 ram，影响的只是 vhost、user、Exchange、Queue **定义**这些元数据放哪；**队列里的消息该落盘照样落盘，跟节点类型无关**（[`rabbitmqctl` 手册](https://www.rabbitmq.com/docs/man/rabbitmqctl.8)）。

| 节点类型 | 元数据存哪 | 当年的意义 | 4.3 现状 |
|------|------|------|------|
| **disc（磁盘，默认）** | 写硬盘 | 元数据安全，重启不丢 | ✅ 唯一推荐 |
| **ram（内存）** | 只放内存、不写盘 | 超大集群里频繁建/删队列、绑定时的元数据操作略快 | ⚠️ 已废弃，4.x 移除 |

**② RAM 节点的几条老规矩**（Mnesia 时代，了解即可，4.3 用不上）：集群至少要有一个 disc 节点（全 ram 集群整体重启元数据全丢、起不来）；不能把最后一个 disc 节点转成 ram。

**③ 实测验证**：本集群三个节点 join 时**都没加 `--ram`**（默认 disc），上面 1.3 的 `cluster_status` 输出里三者全部列在 **Disk Nodes**：

```
Disk Nodes

rabbit@rabbit1
rabbit@rabbit2
rabbit@rabbit3
```

4.3 起 Khepri 成为唯一元数据存储，Raft 复制、每个节点都落盘（[Production Checklist](https://www.rabbitmq.com/docs/production-checklist) 也明确 RAM 节点支持在 4.x 移除），模型上根本没有「只放内存的元数据节点」，所有节点实质都是 disc。新集群直接忽略 `--ram`。

> 大规模、动态伸缩的集群（云上、K8s）不必一台台手动 join，用 **Peer Discovery** 让节点自动发现彼此——见 [第 20 篇](/中间件/rabbitmq/rabbitmq-20-peer-discovery)。

---

## 二、回看机制：集群到底是什么

集群跑起来了，现在把概念补齐。

### 什么是集群

**集群（cluster）就是把多个 RabbitMQ 节点组成一个逻辑 Broker**：客户端连任意一个节点，都能看到相同的 vhost、user、Exchange、Queue **定义**，就像连的是同一台机器。单机其实也是一个「单节点集群」（管理控制台 Admin → Cluster 可查看集群名，默认 `rabbit@hostname`，效果同上文 Overview 截图）。

### 最容易误解的一点：集群 ≠ 消息自动冗余

很多人以为「组了集群，消息就会自动存多份」——**这是 RabbitMQ 最大的认知误区**。官方 [Clustering Guide](https://www.rabbitmq.com/docs/clustering) 说得很直白：运行 broker 所需的数据/状态会复制到所有节点，**但消息队列是例外——默认只驻留在一个节点上**，尽管所有节点都能看到并访问它；要让队列跨节点复制，得用支持复制的队列类型。

把它拆成两条，就是理解 RabbitMQ 集群的**核心心智模型**：

| 被复制的东西 | 默认跨节点复制？ | 由谁决定 |
|------|:---:|------|
| **元数据**（vhost、user、Exchange、Queue 的**定义**） | ✅ 所有节点都有一份 | 集群本身（Khepri / Raft） |
| **消息**（队列里实际存的数据） | ❌ 默认只在一个节点 | **队列类型** |

也就是说：「集群」只保证**元数据**到处一致；**消息**要不要冗余，是你声明队列时选的**队列类型**决定的，跟集群是两码事。所以同样一个三节点集群，往里放不同队列，结果完全不同：

- 放 **Classic** 队列 → 消息只存一份，持有它的节点挂了，这些消息就暂时消费不了（老资料管这叫「普通集群」）；
- 放 **Quorum** 队列 → 消息按 Raft 复制成多份，挂一个节点不影响，这才是生产要的高可用；
- ~~放 Classic 镜像队列（`ha-mode`）~~ → 4.0 已删除，别再用。

**实测对比最直观**——往本集群里声明两个队列各发几条消息，在管理台 Queues 页同屏看：

```bash
$ docker exec rabbit1 rabbitmqadmin declare queue --name orders --type quorum --durable true
$ docker exec rabbit1 rabbitmqadmin declare queue --name orders-classic --type classic --durable true
```

![同一集群：quorum 队列 Node 列显示 rabbit@rabbit1 +2（三副本），classic 队列只有 rabbit@rabbit1（零副本）](/中间件/rabbitmq/15/p11-05.png)

> 🔑 差别全在 **Node 列**：quorum 的 `orders` 显示 `rabbit@rabbit1 +2`——leader 在 rabbit1，**另有两个 follower 副本**；classic 的 `orders-classic` 只有孤零零的 `rabbit@rabbit1`——消息就这一份，节点挂了消息跟着不可用。同一个集群、同屏的两条队列，复制与否一目了然。

> 🔑 **一句话纠偏**：老教程爱讲「普通集群 / 镜像集群」两种模式，那其实是把**集群**和**消息复制**两个正交的概念搅在一起说了。真相是——**集群就一种**，差别只在你往里放什么队列。本篇讲的「高可用」，本质就是「集群 + Quorum 这种会复制的队列」。

### 心智模型表里的那个词：Khepri / Raft 是什么

上面表格里「元数据由**集群本身（Khepri / Raft）**负责复制」——这两个词值得单独讲清楚，它们是理解 4.x 集群行为的钥匙。

**Raft：一种分布式共识算法**。它回答的问题是：「几台机器各存一份数据，怎么保证任何时刻大家对数据内容**达成一致**，且节点挂掉/网络断开也不会出现两个脑袋各说各话？」Raft 的答案是把复制做成一个有明确分工的小团体：

| 机制 | 做法 | 换来的保证 |
|------|------|------|
| **选主** | 任何时候最多一个 leader，其余是 follower；leader 失联，多数派自动选出新 leader | 不会出现两个「权威」互相矛盾（不脑裂） |
| **日志复制** | 所有写请求进 leader 的日志，复制到**过半**节点确认后才算「已提交」 | 已提交的数据不会丢，且所有副本以相同顺序应用 |
| **多数派（quorum）** | 任何决定都要 ⌊N/2⌋+1 个节点同意 | 容忍少数派失联；两边都凑不够半数时，少数一侧自动停服而不是抢着干活 |

Raft 并非 RabbitMQ 专属——etcd、Consul、Kafka（KRaft）用的都是它，原始论文是 2014 年的 [*In Search of an Understandable Consensus Algorithm*](https://raft.github.io/raft.pdf)（可交互演示见 [thesecretlivesofdata.com/raft](http://thesecretlivesofdata.com/raft/)）。

**Khepri：RabbitMQ 用 Raft 实现的元数据存储**。vhost、用户、Exchange/Queue 的定义、绑定、策略这些元数据，过去（3.x 时代）存在 Mnesia——一个**没有共识机制**的 Erlang 数据库，网络分区时各节点可能各改各的，这才需要本篇 4.3 节那四种「分区处理策略」来事后补救。Khepri 是它的接班人：元数据的每次变更都作为一条 Raft 日志，经多数派确认后提交——共识内建，分区补救自然就退役了。演进时间线：**4.0 引入（可选）→ 4.2 默认 → 4.3 唯一**（本集群 `cluster_status` 里 `khepri_db: enabled` 即此；升级视角的细节见[第 21 篇](/中间件/rabbitmq/rabbitmq-21-migration-upgrade)）。

**一个集群里其实跑着多个 Raft 组**——这是最容易被忽略的架构事实：

| Raft 组 | 成员 | 管什么 |
|------|------|------|
| Khepri 组 | **全体集群节点**（一个） | 所有元数据 |
| 每条 Quorum 队列各一组 | 声明时的副本节点（默认全体） | 该队列的消息日志 |
| 每条 Stream 各一组 | 同上 | 该流的消息与协调 |

各组**独立选主、独立复制**。本机集群实测：

```bash
$ docker exec rabbit1 rabbitmq-diagnostics metadata_store_status
```

| Node Name | Raft State | Membership | Last Log Index | Commit Index | Term |
|-----------|:---:|:---:|:---:|:---:|:---:|
| rabbit@rabbit1 | follower | voter | 241 | 241 | 7 |
| rabbit@rabbit2 | follower | voter | 241 | 241 | 7 |
| **rabbit@rabbit3** | **leader** | voter | 241 | 241 | 7 |

> 🔑 对照 3.2 节 `orders` 队列的 `quorum_status`：**Khepri 组的 leader 是 rabbit3，orders 队列组的 leader 是 rabbit1——不是同一个**。两组各自选举、互不干涉，leader 还会尽量分散到不同节点（这正是后面 leader 均衡要管的事）。所以「RabbitMQ 集群没有主节点」这句话对也不对：**集群层面人人平等，但每一个 Raft 组内部都有且仅有一个 leader**。

另外，生产集群建议 **奇数节点**（3、5、7）：偶数节点（如 4、6）的可用性和少一台的奇数集群完全一样，却多花一台机器；两节点集群则强烈不推荐——网络一旦断开，两边都凑不出多数派、无法形成共识（[Clustering Guide](https://www.rabbitmq.com/docs/clustering)）。

---

## 三、消息冗余：从镜像到 Quorum（实测）

集群搭好了，但 Classic 队列的消息**只在一个节点上**。要真正的高可用，消息得跨节点冗余。

### 3.1 镜像队列（Classic Mirrored）——历史方案

在 Quorum 出现前（3.x 时代），让 Classic 队列具备冗余能力靠 **镜像策略**：在普通集群基础上配一条 policy：

```bash
rabbitmqctl add_vhost /mirror
rabbitmqctl set_policy ha-all --vhost "/mirror" "^" '{"ha-mode":"all"}'
```

![镜像策略 ha-mode all 配置](/中间件/rabbitmq/15/p11-01.png)

`ha-mode` 三种取值：`all`（镜像到所有节点）、`exactly`（指定数量）、`nodes`（指定节点）。配置后向任一节点发消息会同步到所有镜像：

![镜像集群多节点消息同步验证](/中间件/rabbitmq/15/p12-01.png)

**但镜像队列有两个硬伤**：新 mirror 上线要**全量同步**（同步期间 master 一挂就丢消息）；网络分区恢复时易**脑裂**。所以：

> ⚠️ **镜像队列已于 2021 弃用、2024 年随 4.0 彻底移除。** 新集群不要再配 `ha-mode`，需要消息冗余用 Quorum。

### 3.2 Quorum 队列——现代高可用的正解（实测）

> 📖 官方文档：[Quorum Queues](https://www.rabbitmq.com/docs/quorum-queues)

Quorum 基于 **Raft 共识协议**：一条消息被**过半副本**确认才算写入成功，Publisher Confirm 也只在复制到 quorum 后才发出——「已确认 = 已在多数节点落盘」。leader 挂了自动选举，follower 重连**只补差额日志**，正好治了镜像队列两个硬伤。

**实测：声明一个 Quorum 队列 `orders`，发 3 条消息，看副本分布。**

```bash
# 声明 quorum 队列（默认副本数 = 集群节点数 = 3）
$ docker exec rabbit1 rabbitmqadmin declare queue --name orders --type quorum --durable true

# 用默认交换机按 routing key=orders 投递 3 条
$ for i in 1 2 3; do docker exec rabbit1 rabbitmqadmin publish message --routing-key orders --payload "order-$i"; done
Message published and routed successfully
Message published and routed successfully
Message published and routed successfully

# 队列状态
$ docker exec rabbit1 rabbitmqctl list_queues name type messages messages_ready messages_unacknowledged
Timeout: 60.0 seconds ...
Listing queues for vhost / ...
name    type     messages  messages_ready  messages_unacknowledged
orders  quorum   3         3               0
```

**关键证据——Raft 成员状态**（一条队列在 3 个节点上各有一个副本，明确分出 leader / follower）：

```bash
$ docker exec rabbit1 rabbitmq-queues quorum_status orders
```

| Node Name | Raft State | Membership | Last Log Index | Commit Index | Term |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **rabbit@rabbit1** | **leader** | voter | 11 | 11 | 2 |
| rabbit@rabbit2 | follower | voter | 11 | 11 | 2 |
| rabbit@rabbit3 | follower | voter | 11 | 11 | 2 |

> 🔑 三个副本的 **Last Log Index / Commit Index 完全一致（都是 11）**，说明 3 条消息已成功复制到所有副本；`rabbit@rabbit1` 是 leader，另外两个是 follower。这就是 Quorum 队列的「消息冗余」——和 Classic「只存一份」形成鲜明对比。
>
> 注：`list_queues` 偶尔会短暂显示 `messages=0`，是 quorum 队列统计的延迟，稍等重查即为真实值（实测 3 条）。

管理台 Queues 页看到的就是同一件事——`orders` 的 Node 列显示 `rabbit@rabbit1 +2`（leader + 2 个 follower 副本）：

![管理控制台 Queues 页：orders 队列，Node 列 rabbit@rabbit1 +2](/中间件/rabbitmq/15/p11-03.png)

| 维度 | Classic 镜像（已移除） | Quorum（推荐） |
|------|------|------|
| 复制方式 | master/mirror 主从 | Raft leader/follower 共识 |
| 新副本上线 | 全量同步，期间易丢 | 增量补日志，安全 |
| 分区恢复 | 易脑裂 | 多数派决定，无脑裂 |
| 容错 | 取决于镜像数 | N 节点容忍 ⌊(N-1)/2⌋ 故障 |

声明 Quorum 队列的 Java 写法（无需任何 policy）：

```java
Map<String, Object> args = new HashMap<>();
args.put("x-queue-type", "quorum");             // 队列类型设为 quorum
args.put("x-quorum-initial-group-size", 3);     // Raft 组初始副本数，建议奇数
channel.queueDeclare("orders", true, false, false, args);
```

> 队列类型的完整对比（Classic/Quorum/Stream 特性矩阵、毒消息、参数细节）见 [第 7 篇](/中间件/rabbitmq/rabbitmq-07-queue-types)。

### 3.3 队列 leader 分布

Quorum / Stream 队列都有一个 **leader 节点**，其余是 follower。可用 `x-queue-leader-locator` 控制 leader 落点（详见 [Clustering Guide](https://www.rabbitmq.com/docs/clustering)）：

| 取值 | 含义 |
|------|------|
| `client-local`（默认） | leader 落在客户端所连节点；客户端分布均匀时天然平衡 |
| `balanced` | 综合各节点已有 leader 数，选最少的；客户端集中连一个节点时用它 |

点进 `orders` 的详情页，**Leader** 字段明明白白写着 `rabbit@rabbit1`：

![管理控制台 orders 队列详情页：Leader = rabbit@rabbit1](/中间件/rabbitmq/15/p11-04.png)

> 本实测里 `orders` 的 leader 落在了 `rabbit@rabbit1`（声明命令是在 rabbit1 上发的，即 `client-local` 默认行为）。生产建议全局设 `queue_leader_locator = balanced`，避免新队列挤在一个节点上。

---

## 四、网络分区处理（Partition Handling）

> 📖 官方文档：[Clustering and Network Partitions](https://www.rabbitmq.com/docs/partitions)（**4.3 起该文档大幅重写**）

消息冗余解决了「节点永久挂」的数据安全，但 **网络分区（network partition）** 才是集群高可用真正的头号大敌。

### 4.1 为什么分区这么危险

网络分区 = 节点之间网络断了，互相以为对方挂了。如果没有共识机制保护，两边可能各自处理请求——**脑裂（split-brain）**：同一个队列出现两个「主」，恢复后数据无法对账。所以分区处理的本质是：**分区期间只允许一边服务，另一边必须停下**。

### 4.2 4.3 起：Khepri + Raft 接管，分区策略被移除

> 🔑 **这是本篇最重要的一段更新。**

从 **4.3** 起，元数据存储彻底切到 Khepri（Raft），Mnesia 移除；**3.x ~ 4.2 的四种分区策略（`ignore` / `pause_minority` / `pause_if_all_down` / `autoheal`）全部删除**——官方 [Partitions 文档](https://www.rabbitmq.com/docs/partitions) 明确说这些是 Mnesia 时代的产物，Raft 内建了分区安全保证，不再需要配置策略：

| Raft 的天然行为 | 效果 |
|------|------|
| 写入需要**多数副本**确认 | 分区时少数派凑不齐 quorum，天然无法服务 |
| leader 断连，多数派**自动选新 leader** | master 不会脑裂 |
| 恢复时落后节点**只补差额日志** | 不会两套数据冲突 |

旧配置项虽能写进 `rabbitmq.conf` 但已**完全失效**：`cluster_partition_handling` 及其子键被接受但不起任何作用，官方建议尽早从配置文件里删掉。

容错能力取决于节点/副本数：

| 节点 / 副本数 | 可容忍故障数 | 抗网络分区 |
|:---:|:---:|------|
| 1 | 0 | 不适用 |
| 2 | 0 | ❌ |
| 3 | 1 | ✅ |
| 4 | 1 | ✅（多数派在一侧） |
| 5 | 2 | ✅ |
| 7 | 3 | ✅ |

> 不只是元数据——**Quorum 队列、Stream 协调器也都基于 Raft**。本集群的 `cluster_status` 里 `Network Partitions (none)`、Feature flags 里 `khepri_db` enabled，正是这个机制的体现。
>
> ⚠️ Classic 队列本身**不复制**：它所在节点被分区隔离时，这些消息仍不可用——Raft 保护的是元数据和 Quorum/Stream，不是 Classic 消息体。**要 HA，用 Quorum。**

### 4.3 历史：4.3 之前的四种策略（Mnesia 时代）

> 老集群（3.x ~ 4.2）还在用 Mnesia，分区靠 `cluster_partition_handling` 决定。了解这些主要为了看懂老配置：

| 策略 | 何时反应 | 行为 | 评价 |
|------|---------|------|------|
| **`ignore`**（默认） | 不反应 | 两边各自继续，恢复后合并 | ❌ 易脑裂 |
| **`pause_minority`** | 检测到分区时 | 少数派自动暂停，多数派继续 | ✅ 奇数节点首选 |
| **`pause_if_all_down`** | 检测到分区时 | 联系不上任何配置节点才暂停 | ✅ 适合偶数节点 |
| **`autoheal`** | 分区恢复时 | 选赢家，输家重启丢状态 | ⚠️ 输家侧可能丢数据 |

升到 4.3 后删掉这些配置（写了也无效）。升级流程见 [第 21 篇](/中间件/rabbitmq/rabbitmq-21-migration-upgrade)。

### 4.4 怎么发现分区

```bash
docker exec rabbit1 rabbitmq-diagnostics cluster_status     # Network Partitions 一节
docker exec rabbit1 rabbitmq-queues quorum_status orders     # 某条 Quorum 队列的 leader/follower
docker exec rabbit1 rabbitmq-diagnostics check_if_node_is_quorum_critical   # 关掉某节点会不会丢 quorum
```

实测第三条（对 rabbit3 执行，`orders` 有 3 副本时关掉它不影响 quorum）：

```
$ docker exec rabbit3 rabbitmq-diagnostics check_if_node_is_quorum_critical
Checking if node rabbit@rabbit3 is critical for quorum of any queues/streams ...
Node rabbit@rabbit3 reported no queues/streams with minimum quorum
```

---

## 五、集群运维：扩缩容与维护模式

> 📖 官方文档：[Clustering · Remove a Node](https://www.rabbitmq.com/docs/clustering)、[Upgrading · Maintenance Mode](https://www.rabbitmq.com/docs/upgrade)

### 5.1 加节点 / 加副本

新节点 join 的流程同 1.2。但 join 后，**已存在的 Quorum 队列默认不会自动把副本扩到新节点**，需手动加：

```bash
docker exec rabbit1 rabbitmq-queues add_member --vhost "/" orders rabbit@rabbit3   # 给单条队列加副本
docker exec rabbit1 rabbitmq-queues grow "rabbit@rabbit3" "all"                    # 批量给所有 quorum 队列加
```

> Quorum 副本数**不必等于节点数**。3 副本跑在 5 节点集群上很常见。

### 5.2 删节点

```bash
docker exec rabbit3 rabbitmqctl stop_app
docker exec rabbit1 rabbitmqctl forget_cluster_node rabbit@rabbit3   # 在别的节点上剔除
docker exec rabbit3 rabbitmqctl reset                                # 若要复用，重置成空白节点
docker exec rabbit3 rabbitmqctl start_app
```

> 该节点上的所有 quorum 队列 / stream 副本会一起被删——即使这意味着队列副本数暂时变成偶数（如 2 个）。所以下线前务必确认剩余副本**还有 quorum**（用 4.4 的 `check_if_node_is_quorum_critical`）。

### 5.3 维护模式：滚动重启不丢 quorum

滚动升级时，Quorum 队列要求多数副本在线，否则会临时丢 quorum。**维护模式（maintenance mode）** 为此而生：

```bash
docker exec rabbit3 rabbitmq-diagnostics check_if_node_is_quorum_critical   # 先确认：关掉会不会丢 quorum
docker exec rabbit3 rabbitmq-upgrade drain                                 # 进入维护：挂起监听、断连、迁走主副本
# 重启 / 升级节点（重启自动退出维护模式；若不重启，手动 revive）
docker exec rabbit3 rabbitmq-upgrade revive
docker exec rabbit3 rabbitmq-upgrade await_online_quorum_plus_one          # 自动化时阻塞到 quorum+1 在线
```

节点进入维护模式后**不再服务客户端流量**，并尽可能安全地把身上的职责迁走：暂停监听、关闭连接、迁移 quorum 队列主副本并退出 Raft 选举、标记维护下线。

> 🔑 **滚动重启标准动作**（每节点依次）：`check_if_node_is_quorum_critical` → `rabbitmq-upgrade drain` → 重启（自动 revive）。任何时刻集群都保有多数副本。升级后用 `rabbitmq-queues rebalance all` 重均衡 leader。

---

## 六、前端入口高可用：HAProxy + Keepalived

> 📖 官方文档：[Networking · Proxies and Load Balancers](https://www.rabbitmq.com/docs/networking)

集群解决了数据冗余，但客户端仍可能**连到已宕节点**——它不知道该换到哪个地址。解决办法是在集群前加一层负载均衡，让客户端只认**一个固定地址**（这也是生产环境的常规做法）。

本机单机 Docker 环境下，客户端可直接连映射端口（`localhost:5672/5673/5674`）或多地址；**生产（多机/裸机）**则用 HAProxy + Keepalived 做统一 VIP。拓扑：

```
                 生产者 / 消费者（应用）
                          │
                    连 VIP:5672 ── 一个固定地址
                          │
            ┌─────────────┴─────────────┐
      HAProxy-1（主）              HAProxy-2（备）
            │                             │
            └──────── Keepalived ─────────┘   VRRP 心跳 + VIP 漂移
                          │
            ┌─────────────┼─────────────┐
         rabbit1       rabbit2       rabbit3
```

### 6.1 HAProxy（两台配置相同）

`/etc/haproxy/haproxy.cfg`（AMQP 走 4 层 TCP 模式，三节点轮询 + 健康检查）：

```haproxy
listen rabbitmq_amqp
    bind *:5672
    mode tcp                       # AMQP 是二进制协议，必须 4 层 TCP
    balance roundrobin
    option tcp-check
    tcp-check connect              # TCP 能连上即视为健康
    server rabbit1 10.0.0.11:5672 check inter 5s rise 2 fall 3
    server rabbit2 10.0.0.12:5672 check inter 5s rise 2 fall 3
    server rabbit3 10.0.0.13:5672 check inter 5s rise 2 fall 3

listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /
```

一个容易踩的细节：代理/负载均衡器常会掐掉「空闲」TCP 长连接，而 **AMQP 心跳（10–30s）恰好会产生周期性网络流量**，让大多数代理默认配置满意、不至于误杀（[Networking](https://www.rabbitmq.com/docs/networking)）——所以客户端务必开启心跳，既防误杀又更快发现死连接。

### 6.2 Keepalived（VIP 漂移）

`/etc/keepalived/keepalived.conf`（主）；备机只改 `state BACKUP` + `priority 100`：

```keepalived
vrrp_script check_haproxy {
    script "/etc/keepalived/check_haproxy.sh"   # pidof haproxy 探活
    interval 2
    fall 2
    rise 2
}
vrrp_instance VI_1 {
    state MASTER                # 备机改 BACKUP
    interface eth0
    virtual_router_id 51        # 主备必须相同
    priority 101                # 备机改 100
    advert_int 1
    authentication { auth_type PASS; auth_pass MyVRRPSecret }
    virtual_ipaddress { 10.0.0.200/24 }     # ← VIP，客户端连它
    track_script { check_haproxy }          # VIP 归属绑定 HAProxy 健康
}
```

| 故障 | 谁发现 | 客户端感知 |
|------|--------|-----------|
| 一个 RabbitMQ 节点挂 | HAProxy 健康检查剔除它 | 新连接无感；旧连接断开靠客户端自动重连 |
| 主 HAProxy 挂 | Keepalived track_script | 秒级中断，VIP 漂到备机，客户端重连同一 VIP |

> ⚠️ 防火墙要放行 VRRP（IP 协议号 112），否则主备同时抢 VIP 脑裂。**务必配客户端自动重连**：VIP 漂移瞬间旧连接会断，HAProxy+Keepalived 解决「连哪个地址」，不保证单条连接不断。K8s / 公有云通常换成平台 LB（Service + Cluster Operator / 云厂商 SLB），不必自建 Keepalived。

---

## 七、客户端侧的高可用

不引入 HAProxy 时，客户端自己也能容灾——**连一组地址，断了自动重连**。主流客户端库都支持把一组 endpoint（主机名/IP 列表）作为连接参数，初次连接和故障恢复（若客户端支持恢复机制）时都会用到这份列表（[Upgrading RabbitMQ](https://www.rabbitmq.com/docs/upgrade)）。

本集群实测：客户端连映射端口多地址即可（Spring AMQP / amqp-client 的 `AutomaticRecovery` 4.0 起默认开启）：

```java
ConnectionFactory factory = new ConnectionFactory();
factory.setAutomaticRecoveryEnabled(true);    // 自动重连，默认 true
factory.setTopologyRecoveryEnabled(true);     // 重连后自动恢复拓扑，默认 true
Connection conn = factory.newConnection(new Address[]{
    new Address("localhost", 5672),   // rabbit1
    new Address("localhost", 5673),   // rabbit2
    new Address("localhost", 5674),   // rabbit3
});
```

> 配合 **Publisher Confirms** + **手动 Ack** + **Quorum 队列**，才是完整可靠性链路——见 [第 4 篇](/中间件/rabbitmq/rabbitmq-04-queue-concepts)、[第 5 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)、[第 7 篇](/中间件/rabbitmq/rabbitmq-07-queue-types)。

---

## 参考资料

官方文档（本篇依据，版本均为 4.3）：

- [Clustering Guide](https://www.rabbitmq.com/docs/clustering) — 节点名、Erlang Cookie、端口、节点数与 quorum、加/删节点、leader 分布
- [Metadata Store](https://www.rabbitmq.com/docs/metadata-store) — Khepri 架构、Mnesia → Khepri 演进
- [Raft 论文](https://raft.github.io/raft.pdf) / [可视化演示](http://thesecretlivesofdata.com/raft/) — 共识算法原理
- [Clustering and Network Partitions](https://www.rabbitmq.com/docs/partitions) — 4.3 Khepri 接管、分区策略移除、容错表
- [Quorum Queues](https://www.rabbitmq.com/docs/quorum-queues) — Raft 复制、副本管理
- [Upgrading RabbitMQ](https://www.rabbitmq.com/docs/upgrade) — 维护模式（drain / revive）、`check_if_node_is_quorum_critical`、`rebalance`、客户端多地址
- [`rabbitmqctl` 手册](https://www.rabbitmq.com/docs/man/rabbitmqctl.8) / [`rabbitmq-queues` 手册](https://www.rabbitmq.com/docs/man/rabbitmq-queues.8) — `join_cluster --ram`、`add_member` / `grow`
- [Networking and RabbitMQ](https://www.rabbitmq.com/docs/networking) — 代理与负载均衡、PROXY protocol
- [Production Checklist](https://www.rabbitmq.com/docs/production-checklist) — RAM 节点 4.x 移除、奇数节点

本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.1.3，`rabbitmq:4.3-management`（RabbitMQ 4.3.4 / Erlang 27.3.4.16），compose 在 `/root/rabbitmq-cluster/`。

---

## 小结

- **集群就一种**，差别在队列类型：放 Classic 是「普通集群」（消息不冗余），放 Quorum 是「复制型集群」（消息冗余）。
- **本机实测**：Docker Compose 起三节点 `rabbit@rabbit1/2/3`（4.3.4），`RABBITMQ_ERLANG_COOKIE` 统一 + 固定 `hostname`，4.3 一行 `join_cluster` 成团；`cluster_status` 显示三者全是 **Disk Nodes**、`khepri_db` 已启用。
- **Quorum 实测**：队列 `orders` 的 `quorum_status` 显示 `rabbit@rabbit1` 为 leader、`rabbit2/3` 为 follower，三副本日志索引完全一致——这就是消息冗余。
- **镜像队列（`ha-mode`）已随 4.0 移除**；**网络分区** 4.3 起由 Khepri/Raft 接管，四种分区策略删除，重要队列用 Quorum 即天然抗分区。
- **运维**：加副本 `rabbitmq-queues add_member`/`grow`；下线 `forget_cluster_node`；滚动重启走 `check_if_node_is_quorum_critical` → `rabbitmq-upgrade drain` 维护模式。
- **入口高可用**：HAProxy + Keepalived 做统一 VIP，或客户端连多地址 + 自动重连。
- 完整可靠性 = Quorum 队列 + Publisher Confirms + 手动 Ack + 入口/客户端容灾 + 消费幂等。

下一篇：[《Classic 队列为什么一堆积就变慢——内存窗口、落盘与流控》](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation)。
