---
title: "Topic、Partition 与 Broker——Kafka 消息流转模型"
sidebarGroup: "Kafka"
shortTitle: "03 Topic Partition Broker"
order: 3
date: 2026-09-07
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 3/11 篇**  
> 下一篇预告：[《Kafka 客户端主流程——Producer 与 Consumer》](/中间件/kafka/kafka-04-client-flow)

---

## 开头：Topic 是名字，Partition 才是硬盘

很多人第一次看 `kafka-topics.sh --describe` 输出会懵：`Leader`、`Replicas`、`ISR` 分别是什么？其实先把 **Topic → Partition → Broker 目录** 这条链理清，后面的客户端与集群机制都会好懂很多。

---

## 一、创建分布式 Topic

```bash
./kafka-topics.sh --bootstrap-server worker1:9092 --create \
  --replication-factor 2 --partitions 4 --topic disTopic

./kafka-topics.sh --bootstrap-server worker1:9092 --describe --topic disTopic
```

示例输出要点：

- **`partitions 4`**：消息拆成 4 份，尽量均匀落到不同 Broker。
- **`replication-factor 2`**：每个 Partition 有 2 个副本。
- **`Leader`**：该 Partition 负责读写的主节点。
- **`Replicas`（AR）**：副本分配在哪些 `broker.id` 上（逻辑分配）。
- **`ISR`**：当前存活且与 Leader 同步的副本子集。

---

## 二、Broker 上的物理存储

![Broker 日志目录下每个 Partition 对应一个子目录](/中间件/kafka/25/p15-01.png)

`log.dirs` 指向的目录里，**一个 Partition 对应一个文件夹**，该 Partition 的全部消息保存在其中。

![Partition 目录内的 log 段文件结构](/中间件/kafka/25/p16-01.png)

---

## 三、Offset 与整体设计

![Topic 逻辑单元、Partition 物理单元、Broker 承载 Partition 的关系](/中间件/kafka/25/p17-01.png)

- **Topic**：逻辑集合，Producer/Consumer 绑定的名字。
- **Partition**：物理存储 + FIFO 顺序；**Offset** 是 Partition 内消息序号。
- **Broker**：Partition 的载体，Partition 尽量均匀分布。

这样设计解决三件事：

1. **海量数据** —— 单 Broker 存不下，拆 Partition 横向扩展吞吐。
2. **数据安全** —— Follower 备份，避免单点；多副本也提升读并发。
3. **负载分散** —— 每组 Partition 有 Leader 响应客户端，请求分散到不同 Broker。

---

## 四、集群消息流转模型（总结）

![Kafka 集群整体消息流转：Producer → Partition → Consumer Group](/中间件/kafka/25/p17-01.png)

1. **Topic** 是逻辑概念，Producer 与 Consumer 通过 Topic 沟通。
2. Topic 本身不存数据；数据在 **Partition** 中，含 1 个 Leader + 若干 Follower（**replica factor** = 副本数）。
3. Producer 写入 Partition；Consumer 用 **Group + Offset** 记录消费进度。
4. 同一 Topic 的消息会推给**所有订阅的消费者组**；**组内**仅一个实例处理一条消息。
5. Broker 集群依赖 **Zookeeper**（或后续 KRaft）选举 **Controller**，负责 Topic 分配等管理工作。

下一篇进入 Java 客户端：Producer / Consumer 的三步主流程。

---

## 小结

- 运维视角：`--describe` 看 Leader/AR/ISR；文件系统视角：`log.dirs` 下看 Partition 目录。
- **Leader 负责读写，Follower 同步**；ISR 是「真正跟得上」的副本集合。
- 整体模型：**逻辑 Topic + 物理 Partition + 分布式 Broker + 组消费 Offset**。
