---
title: "Leader Partition、故障恢复与 HW/Epoch"
sidebarGroup: "Kafka"
shortTitle: "08 Leader 与 HW"
order: 8
date: 2026-09-12
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 8/11 篇**  
> 下一篇预告：[《Kafka 日志与索引——log、index、timeindex》](/中间件/kafka/kafka-09-log-index)

---

## 开头：Leader 挂了，消息会不会丢？

Partition 有 Leader/Follower，Broker 会宕机，网络会抽风。Kafka 用 **ISR + LEO/HW + Epoch** 在性能与一致性之间取舍。搞懂这套机制，才算真正理解「Kafka 能不能保证不丢消息」。

---

## 一、Leader Partition 选举

![创建 replication-factor=3 的 Topic，观察 Leader 与 ISR 变化](/中间件/kafka/27/p07-01.png)

实验要点：

```bash
bin/kafka-topics.sh --bootstrap-server worker1:9092 --create \
  --replication-factor 3 --partitions 4 --topic secondTopic
```

- 初始 **Leader 通常是 AR（Replicas）列表第一个** Broker。
- 某 Broker 宕机 → 从 **ISR** 中剔除；若原 Leader 在该 Broker，则在 ISR 内按 AR 顺序选下一个存活副本为新 Leader。
- 选举结果写入 ZK，例如 `/brokers/topics/secondTopic` 的分区映射 JSON。

规则：**在 ISR 内、按 AR 顺序优先** —— 简单高效。

---

## 二、Leader 自动平衡

![preferred election：AR 第一个副本为「理想 Leader」](/中间件/kafka/27/p09-01.png)

Leader 承担读写与同步，默认尽量分散到不同 Broker。故障选举后可能扎堆，Kafka 提供 **Leader 自平衡**：

- **理想 Leader（Preferred Leader）**：AR 第一个副本。
- Controller 定期检测；某 Broker 上「非理想 Leader」比例超过 `leader.imbalance.per.broker.percentage`（默认 10%）则触发 rebalance。

相关配置（`server.properties`，改完需重启全集群）：

| 参数 | 默认 | 说明 |
|------|------|------|
| `auto.leader.rebalance.enable` | true | 自平衡开关 |
| `leader.imbalance.check.interval.seconds` | 300 | 扫描间隔 |
| `leader.imbalance.per.broker.percentage` | 10 | 触发阈值 |

也可手动：

```bash
bin/kafka-leader-election.sh --bootstrap-server worker1:9092 \
  --election-type preferred --topic secondTopic --partition 1
```

**自平衡会触发大量数据迁移，高负载线上常关闭自动平衡，在低峰手动执行。**

---

## 三、LEO 与 HW

![Leader 写入后 Follower 同步；LEO 为各副本日志末端偏移，HW 为 ISR 最小 LEO](/中间件/kafka/27/p12-01.png)

| 概念 | 含义 |
|------|------|
| **LEO**（Log End Offset） | 副本已写入的最后一条 Offset + 1 |
| **HW**（High Watermark） | ISR 中所有副本 LEO 的最小值 |

Leader 认为 **HW 之前的消息已同步完成，对消费者可见**；HW 之后对消费者不可见（与 Producer `acks` 是不同层面）。

**Follower 故障恢复：**

1. 暂时移出 ISR，其余副本正常服务。
2. 恢复后按本地 HW **截断高于 HW 的日志**，从 HW 起重新同步 Leader。
3. LEO ≥ 全 Partition HW 后重新加入 ISR。

**Leader 故障：**

1. 从 ISR 选新 Leader（新 Leader LEO 可能低于旧 Leader）。
2. 其他 Follower **截断高于 HW 的数据**，向新 Leader 同步。
3. 旧 Leader 恢复后降为 Follower。

![Follower 故障：移出 ISR，恢复后按 HW 截断再同步](/中间件/kafka/27/p13-01.png)

![Leader 故障：新 Leader 选举，Follower 截断并同步](/中间件/kafka/27/p13-02.png)

极端情况下，**HW 推进前的消息可能丢失**（例如旧 Leader 上 4–7 号消息）。Kafka 优先保证副本间一致与高性能，而非绝对零丢失——提升安全需客户端 `acks=all` 并自行确认。

![Leader 切换可能导致 HW 之前未同步消息丢失示意](/中间件/kafka/27/p14-01.png)

---

## 四、Epoch 与 HW 一致性

Follower 拉取后才上报 LEO，Leader 再算 HW 并下发——存在时间差，各副本 HW 可能短暂不一致。Leader 切换时若各 Follower 按**各自 HW** 截断，会数据错乱。

**Epoch 机制：**

1. **Epoch** 单调递增，Leader 变更时 +1。
2. 新 Leader 上任写入 `leader-epoch-checkpoint`（内存 + 磁盘），记录 `(epoch, offset)`——该 Leader 第一条消息的 Offset。
3. Follower 同步 checkpoint；拉取时用**最新 Epoch 条目**决定起点，而非各自 HW。

![Epoch 版本与 offset 记录在 leader-epoch-checkpoint 文件中](/中间件/kafka/27/p15-01.png)

文件示例（`secondTopic-1/leader-epoch-checkpoint`）：

```
0
1
2 0
```

第三行起：`epoch offset`，表示该 epoch 下可消费的最早 offset。

---

## 小结

- **Leader 选举**：ISR 内、AR 顺序；**Preferred rebalance** 恢复理想分布（有成本）。
- **LEO/HW** 控制副本同步与消费者可见边界；故障恢复以 **HW/Epoch** 截断对齐。
- Kafka 集群机制的核心是 **Partition 内数据一致性**；绝对安全需 Producer/Consumer 配合，后续 RocketMQ 对比会更清晰。
