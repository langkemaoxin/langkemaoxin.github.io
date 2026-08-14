---
title: "RabbitMQ 生产最佳实践——可靠性、容量与监控清单"
sidebarGroup: "RabbitMQ"
shortTitle: "22 生产实践"
order: 22
date: 2026-09-17
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 22/22 篇 · 收尾**  
> 上一篇：[《从 3.x 到 4.x——升级、迁移与 Feature Flags》](/中间件/rabbitmq/rabbitmq-21-migration-upgrade)

---

## 开头：前 21 篇学了零件，这一篇把它们装成一辆车

跟着本系列一路走下来，你已经能装好 RabbitMQ、声明队列与交换机、写出生产者消费者、挑队列类型、配集群、调网络、上 TLS、玩 Federation / Shovel、做迁移升级。零件齐了。

但真要把一套 RabbitMQ 推上生产，靠的不是「每个功能都会用」，而是 **把它们按正确的方式组合到一起**：消息不能丢、积压不能雪崩、节点不能悄悄掉线、磁盘不能写爆。这一篇（也是系列收尾篇）就把前 21 篇的知识点串成一张生产清单——照着勾，心里有底。

内容主线：可靠性全链路 → 容量规划 → 监控指标 → 告警阈值 → 生产 Checklist → 常见事故模式 → 系列知识地图。指标与阈值依据官方 [Production Deployment Guidelines](https://www.rabbitmq.com/docs/production-checklist)、[Reliability Guide](https://www.rabbitmq.com/docs/reliability)、[Monitoring](https://www.rabbitmq.com/docs/monitoring)，撰写时对应 **4.3.x**（当前稳定版）。

---

## 一、可靠性全链路：消息不丢的「四环」

官方 Reliability Guide 一句话点题：**数据安全是 RabbitMQ 节点、生产者、消费者三方的共同责任**。任何一方偷懒，消息就会在某个缝隙里漏掉。把这条链路拆成四环，每一环都对应本系列前面某篇的详细讨论：

```
生产者 ──①──> Broker ──②──> 队列存储 ──③──> 消费者 ──④──> 集群冗余
  Confirms     durable+persistent    手动 ACK     Quorum/多节点
```

### ① 生产者：Publisher Confirms（发布确认）

「我 `basicPublish` 了，消息就一定到了吧？」——不一定。默认发布是 **fire-and-forget**，Broker 还没落盘就崩溃，这条消息无声消失。开启 **Publisher Confirms** 后，Broker 只有在真正接管了这条消息（Classic 写盘、Quorum 多数副本写盘）之后才回 `basic.ack`，生产者没收到就重发。

- 原理与代码：见 [第 05 篇 · 消息场景](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) 的 confirms 小节
- Spring Boot 里的开启方式：见 [第 06 篇 · SpringBoot 集成](/中间件/rabbitmq/rabbitmq-06-springboot)

> 配合 `mandatory = true`：消息找不到任何队列时，Broker 会回 `basic.return`，避免「发出去就黑洞」。详见 Publishers 指南。

### ② Broker：durable 队列 + persistent 消息

这是 [第 04 篇第七节](/中间件/rabbitmq/rabbitmq-04-queue-concepts) 反复强调的三条件：队列 `durable=true`、消息 `delivery_mode=2`、消息确实落盘同步。三者缺一，重启就可能丢。

| 条件 | 谁负责 | 不满足的后果 |
|------|--------|-------------|
| 队列 Durable | 声明时 `durable=true` | 重启后队列定义没了，消息全没 |
| 消息 Persistent | 发布时 `delivery_mode=2` | 队列还在，瞬态消息被丢弃 |
| 落盘同步 | 队列类型决定（Classic / Quorum） | Classic 单节点在 `kill -9` / 掉电时仍有窗口 |

队列命名、Durable、排他、自动删除等参数的完整含义，见 [第 04 篇 · 队列核心概念](/中间件/rabbitmq/rabbitmq-04-queue-concepts)。

### ③ 消费者：手动 ACK

消费者拿到消息不等于处理完了。自动 ACK 模式下，消息一投递就从队列删除——消费者随后处理抛异常，消息就真的没了。生产环境一律 **手动 ACK**：处理完业务逻辑（写库、转发、落盘）之后再 `basicAck`。

- 基础用法：[第 03 篇 · 编程模型](/中间件/rabbitmq/rabbitmq-03-programming-model) 的消费者示例
- 场景与拒绝 / 重入队：[第 05 篇 · 消息场景](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)

> 官方明确：开启确认机制保证 **至少一次（at-least-once）** 投递；不开启则只保证 **至多一次（at-most-once）**，可能丢。代价是消息可能重复——消费者必须 **幂等**，别指望「精确一次」。

### ④ 集群与队列冗余

单节点 Classic 队列扛不住节点故障。生产关键业务上 **Quorum Queue**（Raft 多数副本）或 **Stream**，搭配 **3 节点以上奇数集群**，单节点挂了仍可用。

- 队列类型选型与 Quorum 原理：[第 07 篇 · 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)
- 集群拓扑、分区处理、HAProxy + Keepalived：[第 11 篇 · 集群与高可用](/中间件/rabbitmq/rabbitmq-11-cluster-ha)

四环凑齐，消息从「发出去」到「处理完」整条链路都有兜底。少任何一环，就在那里漏。

---

## 二、容量规划：别让一条队列拖垮一个节点

官方 Production Checklist 反复提醒：RabbitMQ 的瓶颈往往是 **单队列单核**——一条队列的主副本（leader）固定在某个节点上，所有读写都串行经过它，单核打满就是天花板。

### 2.1 单队列单核反模式

Classic 与 Quorum 队列的主副本都在单个节点上处理，**横向扩展靠增加队列、而非增加节点**。把全量消息压到一条队列，再加多少集群节点都帮不上忙——这条队列只跑在一个核上。

这个反模式在 [第 04 篇](/中间件/rabbitmq/rabbitmq-04-queue-concepts) 讨论过，而它引发的真实故障——积压后吞吐断崖式下跌——在 [第 12 篇 · Classic 队列积压退化](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation) 有完整拆解：内存窗口塞满后，消息被迫逐条落盘，吞吐从万级掉到百级。

### 2.2 多队列分流与 consistent-hash

高吞吐场景把消息按业务键分散到多条队列：

| 手段 | 做法 | 参考篇 |
|------|------|--------|
| 业务拆队列 | 按订单 / 用户 / 事件类型各建独立队列 | [第 05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) |
| 一致性哈希 | consistent-hash 交换机按 routingKey 哈希到 N 条队列 | [第 09 篇 · Sharding](/中间件/rabbitmq/rabbitmq-09-sharding) / [第 19 篇 · 插件](/中间件/rabbitmq/rabbitmq-19-plugins) |
| Stream 分区 | Superstream 把一条逻辑流切成多个分区，并行消费 | [第 07 篇](/中间件/rabbitmq/rabbitmq-07-queue-types) |

### 2.3 Stream 顶吞吐

日志、埋点、事件溯源这类 **高吞吐、可重放** 的场景，别用 Classic / Quorum 死磕——上 Stream。Stream 基于只追加日志（append-only log），吞吐比传统队列高一个量级，消费者还能按 offset 随机回放。详见 [第 07 篇 · 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types) 与 [第 13 篇 · 多协议](/中间件/rabbitmq/rabbitmq-13-amqp-and-protocols)。

### 2.4 硬件与资源底线

官方给出的 **生产单节点最低配置**：

| 资源 | 最低要求 | 说明 |
|------|----------|------|
| CPU | **4 核** | 单核环境官方明确「不为设计目标」；与其他 I/O 重型服务不要混部 |
| 内存 | **4 GiB** | 容量越大队列越多，内存需求越高 |
| 磁盘 | 越大越好（overprovision） | Quorum / Stream 占盘可观，宁多勿少；优先 **本地 SSD / NVMe**，慎用 NAS |
| 网络 | 按公式估算（见下） | 高消息率 + 大 payload 时带宽是硬约束 |

> **危险**：官方明确 RabbitMQ 不适合单 CPU 核心环境，也不适合和其他磁盘 / 网络 I/O 重型服务（如数据库）混部。

磁盘水位建议 **不低于内存高水位**：节点内存水位 4 GB，则 `disk_free_limit.absolute = 4G` 起步。磁盘写满是「非常严重的运维事故」，常导致停服甚至数据丢失——务必 overprovision。

最小带宽估算公式（经验值，bit/s）：

```
带宽 ≈ MR × MS × 110% × 8
```

其中 `MR` 为 95 分位消息速率（条/秒），`MS` 为 95 分位消息大小（字节）。例：2 万条/秒、6 KB/条 → `20000 × 6000 × 1.1 × 8 ≈ 1.056 Gbps`，链路至少千兆起步。

---

## 三、监控关键指标：看不见的东西管不了

官方 Monitoring 指南通篇一句话：**没有监控的分布式系统，等于蒙着眼在森林里走路**。Prometheus + Grafana 是官方首选组合，本系列 [第 10 篇 · 监控备份与联邦](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation) 已演示过管理台与 HTTP API 的对接。

### 3.1 Prometheus 插件

RabbitMQ 自带 `rabbitmq_prometheus` 插件，默认在 **15692** 端口暴露指标，开销低，官方强烈推荐生产使用：

```bash
rabbitmq-plugins enable rabbitmq_prometheus
curl {hostname}:15692/metrics
```

管理插件（15672）适合开发环境的交互式查看，**生产监控优先用 Prometheus**——它解耦了监控与被监控对象，支持长期存储、聚合更稳、开销更低。

### 3.2 关键指标清单

把官方推荐的指标分成四组，对照查：

**集群级（`GET /api/overview`）**

| 指标 | 字段 | 关注点 |
|------|------|--------|
| 连接总数 | `object_totals.connections` | 突增 = 连接泄漏或雪崩 |
| 信道总数 | `object_totals.channels` | 与连接比例失衡需排查 |
| 队列总数 | `object_totals.queues` | 异常增长可能是声明泄漏 |
| 消费者总数 | `object_totals.consumers` | 突降 = 消费者批量掉线 |
| 积压消息数 | `queue_totals.messages` | ready + unacked |
| ready 消息 | `queue_totals.messages_ready` | 待消费，持续涨 = 消费跟不上 |
| unacked 消息 | `queue_totals.messages_unacknowledged` | 处理中，持续涨 = 消费者卡住 |
| 发布速率 | `message_stats.publish_details.rate` | 入口流量 |
| 投递速率 | `message_stats.deliver_get_details.rate` | 出口流量 |

**节点级（`GET /api/nodes`）**

| 指征 | 字段 | 说明 |
|------|------|------|
| 内存使用 | `mem_used` / `mem_limit` | 接近水位会触发流控 |
| 内存告警 | `mem_alarm` | 布尔，命中时阻塞发布者 |
| 磁盘告警 | `disk_free_alarm` | 布尔，磁盘低于水位 |
| 文件句柄 | `fd_used` / `fd_total` | 用满会拒接连接 |
| Erlang 进程 | `proc_used` / `proc_total` | 接近上限需排查泄漏 |
| 运行队列 | `run_queue` | 持续高 = 调度器过载 |
| 集群链路 | `cluster_links` | 节点间流量 |

**队列级（`GET /api/queues/{vhost}/{qname}`）**

重点盯 **ready 持续增长**（消费跟不上）和 **unacked 堆积**（消费者卡死但没断）。单队列指标比集群汇总更能定位「哪条队列在拖后腿」。

**基础设施级（OS / 内核）**

CPU、内存、页缓存（Stream 场景尤其重要）、磁盘 I/O 延迟与分布、空闲磁盘空间、`beam.smp` 文件句柄、TCP 各状态连接数（`ESTABLISHED` / `CLOSE_WAIT` / `TIME_WAIT`）、节点间与客户端网络延迟——这些用 node_exporter / Datadog 等通用工具采集。

### 3.3 采集频率

官方推荐生产环境 **30 秒** 采集一次（30~60 区间均可）；开发环境可到 5 秒，但别更低。采集过频会显著推高 CPU——队列和信道多时尤其明显。

> **避坑**：某些监控工具为取一个队列的一个指标，会拉取整页队列列表，开销巨大。用 `rabbitmq_top` 插件或 `rabbitmq-diagnostics observer` 排查采集开销来源，常见元凶是名字带 `_metrics_collector` 的进程。

### 3.4 健康检查（Health Checks）

官方把节点健康检查分成 5 级，从最轻到最重，**级数高不等于更好**——越综合的检查误报率越高：

| 级别 | 命令 | 检查内容 | 误报率 |
|------|------|----------|--------|
| 1 | `rabbitmq-diagnostics ping` | 运行时存活 + CLI 鉴权 | 极低 |
| 2 | `rabbitmq-diagnostics status` | 基本系统信息 | 极低 |
| 3 | `rabbitmq-diagnostics check_running && check_local_alarms` | 应用运行 + 无资源告警 | 低 |
| 4 | 上述 + `check_port_connectivity` | 监听端口可连 | 低 |
| 5 | 上述 + `check_virtual_hosts` | 所有 vhost 正常 | 高负载下偏高 |

> **弃用提醒**：旧版 `rabbitmq-diagnostics node_health_check` 已废弃，现代版本里是空操作，务必换成上面分级命令。K8s 就绪探针官方推荐 **AMQP 端口 TCP 探活**，不设 livenessProbe——CLI 命令会加入 Erlang 分布有额外开销。

---

## 四、告警阈值建议

光采集不告警等于没监控。下面是基于官方建议和工程经验的一组起步阈值，按场景调校：

| 指标 | 建议告警阈值 | 说明 |
|------|-------------|------|
| ready 消息积压 | 单队列 > 阈值持续 N 分钟 | 视 SLA 定；核心交易可设百级，日志类可设万级 |
| unacked 消息 | 单队列持续增长不回落 | 消费者卡死（死循环 / 下游慢），比 ready 更危险 |
| 磁盘剩余 | 低于 `disk_free_limit` | 命中即触发磁盘告警，阻塞所有发布者 |
| 内存使用 | 接近 `vm_memory_high_watermark` | 默认 0.6，命中即流控 |
| 节点掉线 | 集群成员数 < 预期 | 网络分区或节点崩溃 |
| 文件句柄 | `fd_used / fd_total` > 80% | 连接泄漏或队列过多 |
| 发布 / 投递速率 | 突降为 0 或突增数倍 | 业务异常或下游故障 |
| 消费者数 | 突降 > 50% | 批量掉线，检查消费者健康 |
| 网络分区 | 出现 partition | 立即处理，见 [第 11 篇](/中间件/rabbitmq/rabbitmq-11-cluster-ha) 的分区策略 |

> **重点盯 unacked**：ready 高往往是「消费慢」，加机器 / 优化逻辑能救；unacked 涨通常是「消费者卡死」，消息堆在内存里，消费者一崩就回灌队列形成二次冲击。

---

## 五、生产 Checklist 清单

把前面散落各篇的实践点汇成一张清单，上线前逐项勾：

### 5.1 安全

| 项 | 要求 | 参考 |
|----|------|------|
| 删除默认 `guest` 用户 | 生产必须删，或至少限制本机 | [第 15 篇 · 安全](/中间件/rabbitmq/rabbitmq-15-security) |
| 一应用一账号 | 便于权限收口与凭据轮换 | [第 15 篇](/中间件/rabbitmq/rabbitmq-15-security) |
| 禁用匿名登录 | `anonymous_login_user = none` | 官方 Checklist |
| 启用 TLS | 至少加密，推荐双向认证 | [第 15 篇](/中间件/rabbitmq/rabbitmq-15-security) |
| 节点间通信加密 | inter-node TLS，CLI 同步配置 | [第 15 篇](/中间件/rabbitmq/rabbitmq-15-security) |
| Cookie 文件权限 | 仅限运行 RabbitMQ 的 OS 用户可读 | [第 11 篇 · 集群](/中间件/rabbitmq/rabbitmq-11-cluster-ha) |
| 防火墙分区 | 客户端端口与集群 / CLI 端口分层放行 | [第 14 篇 · 网络](/中间件/rabbitmq/rabbitmq-14-networking) |

禁用匿名登录的最小配置：

```ini
# rabbitmq.conf
auth_mechanisms.1 = PLAIN
auth_mechanisms.2 = AMQPLAIN
# 不列出 ANONYMOUS，即禁用匿名机制
anonymous_login_user = none
```

### 5.2 隔离与拓扑

| 项 | 要求 | 参考 |
|----|------|------|
| vhost 隔离 | 多租户每租户一 vhost | [第 16 篇 · Virtual Hosts](/中间件/rabbitmq/rabbitmq-16-virtual-hosts) |
| 定义导出备份 | 定期导出 definitions JSON | [第 10 篇 · 监控备份](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation) |
| 集群奇数节点 | 3 / 5 / 7，便于多数派判定 | [第 11 篇](/中间件/rabbitmq/rabbitmq-11-cluster-ha) |
| 分区策略先行 | 拿不准就用 `pause_minority` | [第 11 篇](/中间件/rabbitmq/rabbitmq-11-cluster-ha) |
| 自动发现 | K8s 用 Operator，物理机用 DNS / config-file | [第 20 篇 · Peer Discovery](/中间件/rabbitmq/rabbitmq-20-peer-discovery) |

### 5.3 应用侧

| 项 | 要求 | 参考 |
|----|------|------|
| 开启 Publisher Confirms | 业务关键消息必须开 | [第 05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) / [第 06 篇](/中间件/rabbitmq/rabbitmq-06-springboot) |
| 消费者手动 ACK | 处理完再 ack，别 autoAck | [第 03 篇](/中间件/rabbitmq/rabbitmq-03-programming-model) |
| 合理 prefetch | 别无界拉取，`basicQos` 设上限；取值依据见 05 篇 2.2 | [第 03 篇](/中间件/rabbitmq/rabbitmq-03-programming-model) · [第 05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) |
| 连接自动恢复 | 用客户端自带的重连，别自己造 | [第 14 篇 · 网络](/中间件/rabbitmq/rabbitmq-14-networking) |
| 生产 / 消费分连接 | 避免流控波及消费者 ACK | [第 14 篇](/中间件/rabbitmq/rabbitmq-14-networking) |
| 消费者幂等 | 至少一次投递必然有重复 | [第 05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) |
| 避免连接抖动 | 长连接 + 连接池，别每条消息开关连接 | [第 14 篇](/中间件/rabbitmq/rabbitmq-14-networking) |
| 死信兜底 | 关键队列配 DLX，失败消息有去处 | [第 08 篇 · 死信与延迟](/中间件/rabbitmq/rabbitmq-08-dlx-delay) |
| 限流 / 配额 | 用 configurable limits 防止「坏邻居」 | [第 16 篇](/中间件/rabbitmq/rabbitmq-16-virtual-hosts) |

> **生产 / 消费分连接**：官方明确建议发布者和消费者用不同连接。否则发布连接触发流控时，会拖慢同一连接上的消费者手动 ACK，形成连锁阻塞。

### 5.4 资源与系统

| 项 | 要求 |
|----|------|
| 内存水位 | `vm_memory_high_watermark.relative` 保持默认 0.6，推荐区间 0.4~0.7，超 0.7 须有扎实监控 |
| 磁盘水位 | `disk_free_limit` 不低于内存水位（如 4 GB 内存 → 4 GB 磁盘） |
| 文件句柄 | 至少 5 万，推荐按 `连接数 × 2 + 队列数` 估算，生产可达 50 万 |
| 存储类型 | 本地 SSD / NVMe 优先，慎用 NAS，禁用分布式文件系统 |
| 数据目录 | 节点间绝不共享，不与其他 I/O 重型服务混用 |
| NTP 时钟同步 | 节点间时钟漂移会影响管理台统计 |
| 日志聚合 | 所有节点 + 应用日志统一收集 |

文件句柄估算经验公式：

```
推荐句柄上限 ≈ (95 分位并发连接数 × 2) + 队列总数
```

按这个公式，几千连接 + 上千队列，50 万并不夸张——句柄上限设高了几乎不耗资源，设低了会拒接连接。

---

## 六、常见生产事故模式

前 21 篇埋了不少「坑」，这里集中复盘四个高频事故：

### 6.1 积压断崖（[第 12 篇](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation)）

**现象**：Classic 队列一积压，吞吐从万级掉到百级，像踩了刹车。

**根因**：Classic 队列有个内存窗口，消息先进内存再落盘。积压超过窗口，每条新消息都触发一次磁盘写，磁盘随机 I/O 成本把吞吐拉垮。

**处方**：关键业务迁移到 Quorum Queue；吞吐型业务上 Stream；必须用 Classic 时控制积压量、上 SSD。

### 6.2 消费者被打爆（无 prefetch）

**现象**：消费者 OOM 或处理越来越慢，最终假死。

**根因**：`autoAck = true` 或 `basicQos` 不设上限，Broker 把队列里所有消息一股脑推给消费者，本地缓冲撑爆。

**处方**：手动 ACK + 合理 `basicQos`（如 10~100），让消费者按处理能力拉取。详见 [第 03 篇](/中间件/rabbitmq/rabbitmq-03-programming-model) 与 [第 05 篇 · 2.2 prefetch 调优](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)。

### 6.3 消息重复（至少一次的代价）

**现象**：下游收到重复消息，数据被重复写入。

**根因**：开启 Confirms + 手动 ACK 后是 **至少一次** 投递——网络抖动会导致 Broker 已发但消费者没收到 ACK，消息被重投，`redelivered` 标志置位。

**处方**：消费者设计成 **幂等**（用业务唯一键去重 / 状态机），而不是试图精确去重。`redelivered` 为 false 时可确定首次投递，true 时才走去重路径以省成本。详见 [第 05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)。

### 6.4 连接泄漏（沉默的杀手）

**现象**：运行一段时间后新连接连不上，报文件句柄耗尽。

**根因**：应用每次操作开新连接却忘记关闭（或异常路径没关），连接 / 信道无限增长，最终吃光节点文件句柄。

**处方**：长连接 + 连接池、异常路径确保关闭、监控 `object_totals.connections` 和 `fd_used` 趋势。官方称之为「慢性病」——短期没感觉，爆发时已经晚了。排查手段见 [第 14 篇 · 网络](/中间件/rabbitmq/rabbitmq-14-networking)。

> 这四类事故的共同点：**都是应用侧或规划侧的问题，不是 RabbitMQ 本身的 bug**。监控到位 + 设计合规，绝大多数可以避免。

---

## 小结

| 主题 | 核心要点 |
|------|----------|
| 可靠性 | 四环缺一不可：Confirms + durable/persistent + 手动 ACK + 集群冗余 |
| 容量 | 单队列单核是天花板；多队列分流 / Stream 顶吞吐 / overprovision 磁盘 |
| 监控 | Prometheus + Grafana；盯 ready / unacked / 磁盘 / 内存 / 句柄 / 节点存活 |
| 告警 | 积压、磁盘不足、节点掉线、消费者突降、unacked 堆积 |
| 安全 | 删 guest、TLS、vhost 隔离、一应用一账号、限流配额 |
| 事故 | 积压断崖、无 prefetch、消息重复、连接泄漏——多在应用侧 |

一句话总结生产化的心法：**消息不丢靠四环，积压不崩靠分流，故障不慌靠监控，长期不乱靠清单**。

---

## 系列结语：22 篇串联的知识地图

写到这里，RabbitMQ 系列正式收尾。把 22 篇的脉络理一遍，方便你按需回查：

**入门与基础（01-04）**

- [01 · MQ 是什么](/中间件/rabbitmq/rabbitmq-01-what-is-mq)——从同步到异步，为什么需要 MQ
- [02 · 安装部署](/中间件/rabbitmq/rabbitmq-02-install-concepts)——Docker 安装、compose 与数据持久化
- [03 · 编程模型](/中间件/rabbitmq/rabbitmq-03-programming-model)——控制台收发与从连接到消费的七步骨架
- [04 · 队列核心概念](/中间件/rabbitmq/rabbitmq-04-queue-concepts)——命名、顺序、优先级、策略

**消息模式与集成（05-08）**

- [05 · 消息场景](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)——Work / Pub-Sub / Routing / Topic，Confirms 与 ACK
- [06 · SpringBoot 集成](/中间件/rabbitmq/rabbitmq-06-springboot)——生产级注解与配置
- [07 · 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)——Classic / Quorum / Stream 选型
- [08 · 死信与延迟](/中间件/rabbitmq/rabbitmq-08-dlx-delay)——DLX、TTL、延迟队列方案

**扩展与高可用（09-12）**

- [09 · Sharding 分片](/中间件/rabbitmq/rabbitmq-09-sharding)——consistent-hash 水平扩展
- [10 · 监控备份联邦](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation)——HTTP API、definitions 备份、Federation
- [11 · 集群与高可用](/中间件/rabbitmq/rabbitmq-11-cluster-ha)——集群拓扑、镜像、HAProxy + Keepalived
- [12 · Classic 积压退化](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation)——积压断崖的根因与处方

**协议与运维（13-16）**

- [13 · AMQP 与多协议](/中间件/rabbitmq/rabbitmq-13-amqp-and-protocols)——AMQP 1.0、MQTT、STOMP、Stream 协议
- [14 · 网络与连接](/中间件/rabbitmq/rabbitmq-14-networking)——心跳、连接恢复、排障
- [15 · 安全](/中间件/rabbitmq/rabbitmq-15-security)——认证、授权、TLS
- [16 · Virtual Hosts](/中间件/rabbitmq/rabbitmq-16-virtual-hosts)——隔离、权限、配额

**进阶与生态（17-22）**

- [17 · RPC 模式](/中间件/rabbitmq/rabbitmq-17-rpc)——用 RabbitMQ 实现远程调用
- [18 · Shovel](/中间件/rabbitmq/rabbitmq-18-shovel)——跨 Broker 可靠转发
- [19 · 常用插件](/中间件/rabbitmq/rabbitmq-19-plugins)——consistent-hash、delayed-message 等
- [20 · Peer Discovery](/中间件/rabbitmq/rabbitmq-20-peer-discovery)——自动发现与 K8s 集成
- [21 · 迁移升级](/中间件/rabbitmq/rabbitmq-21-migration-upgrade)——3.x 到 4.x、Feature Flags
- [22 · 生产实践](/中间件/rabbitmq/rabbitmq-22-production-checklist)——本篇，可靠性 / 容量 / 监控清单

22 篇走下来，从「MQ 是什么」到「怎么上生产」，一条主线是：**先理解模型，再选对工具，最后用监控和清单守住底线**。工具会迭代（3.x 到 4.x 的迁移就是例证），但这些底层逻辑不会过时。

感谢跟读到最后一篇。愿你的消息不丢、积压不崩、告警不谎。
