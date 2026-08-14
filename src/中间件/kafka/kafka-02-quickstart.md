---
title: "Kafka 快速上手——单机、收发与消费者组"
sidebarGroup: "Kafka"
shortTitle: "02 单机上手与消费者组"
order: 2
date: 2026-09-06
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 2/11 篇**  
> 下一篇预告：[《Topic、Partition 与 Broker——Kafka 消息流转模型》](/中间件/kafka/kafka-03-topic-partition-broker)

---

## 开头：先跑起来，再谈架构

学 Kafka 最稳妥的第一步：在一台装了 JDK 的机器上把 Broker 拉起来，用控制台脚本发几条消息、收几条消息。跑通之后，消费者组、Offset、Partition 这些词才有落脚点。

---

## 一、快速搭建单机服务

![Kafka 单机部署：Zookeeper + Kafka Broker 启动流程示意](/中间件/kafka/25/p05-01.png)

环境要求很简单：**有 JVM 即可**。示例使用 JDK 1.8 + CentOS，版本以 `kafka_2.13-3.8.0` 为例（`2.13` 是 Scala 版本，`3.8.0` 是 Kafka 版本；运行时只需 JDK，调试源码才需匹配 Scala）。

1. 从 [Kafka 下载页](https://kafka.apache.org/downloads) 下载安装包。
2. 从 [Zookeeper 发布页](https://zookeeper.apache.org/releases.html) 下载 ZK（如 3.8.4）。生产环境通常**单独部署 ZK**，不用 Kafka 自带的。
3. 解压到 `/app/kafka`、`/app/zookeeper`，配置 `KAFKA_HOME` 和 `PATH`。

**启动顺序：先 ZK，后 Kafka。**

```bash
cd $KAFKA_HOME
nohup bin/zookeeper-server-start.sh config/zookeeper.properties &
nohup bin/kafka-server-start.sh config/server.properties &
```

- ZK 默认 **2181**，进程名 `QuorumPeerMain`
- Kafka 默认 **9092**，进程名 `kafka`

用 `jps` 确认两个进程都在。

---

## 二、简单收发消息

![Producer 写入 Topic、Consumer 从 Topic 拉取的基本模型](/中间件/kafka/25/p07-01.png)

Kafka 的基础模型：生产者往指定 **Topic** 写，消费者从指定 **Topic** 读。

```bash
# 创建 Topic
bin/kafka-topics.sh --create --topic test --bootstrap-server localhost:9092
bin/kafka-topics.sh --describe --topic test --bootstrap-server localhost:9092

# 生产者
bin/kafka-console-producer.sh --broker-list localhost:9092 --topic test

# 消费者
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic test
```

要点：

- 生产者和消费者**不必同时在线**，彼此解耦。
- 不提前建 Topic 也能发，但可能出现 `LEADER_NOT_AVAILABLE` 警告——Broker 建 Topic 后客户端会刷新元数据。
- 想从头消费：加 `--from-beginning`。
- 精确起点：`--partition 0 --offset 4`（Partition 与 Offset 后文详解）。

---

## 三、理解消费者组

![同一 Topic 下多个消费者组各自独立消费，组内一条消息只被一个实例消费](/中间件/kafka/25/p09-01.png)

每条消息**可被多个消费者组各自消费一次**；**同一组内**一条消息只被一个实例消费。

```bash
# 同组两个实例 —— 消息在组内分摊
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --consumer-property group.id=testGroup --topic test

# 不同组 —— 各自收到全量副本
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --consumer-property group.id=testGroup2 --topic test
```

查看组消费进度：

```bash
bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group testGroup
```

Kafka 以**消费者组**为单位记录每个 Partition 的 **Offset**。新增组不会动消息数据，只是多一条进度记录，复读效率很高。

---

## 四、消息传递机制概览

![Client、Topic、Partition、Broker 与 Consumer Group 的关系](/中间件/kafka/25/p10-01.png)

生产者与消费者通过 **Topic** 沟通；消息实际落在 Broker 的 **Partition** 队列里。

| 概念 | 含义 |
|------|------|
| **Client** | Producer / Consumer |
| **Consumer Group** | 逻辑消费者组，组内单条消息只消费一次 |
| **Broker** | 一台 Kafka 服务器 |
| **Topic** | 业务含义相同的一组消息（逻辑概念） |
| **Partition** | 实际存储单元，FIFO 队列 |

---

## 五、搭建 Kafka 集群（预览）

![Kafka 集群：多 Broker + Zookeeper，Partition 分散存储](/中间件/kafka/25/p11-01.png)

单机 TPS 可达百万级，但生产环境几乎必上集群：

- **数据太多** → 拆成多个 Partition 分布到多个 Broker。
- **单点故障** → 每个 Partition 配置副本，ZK 选举 Leader/Follower。
- **元数据** → Broker、Partition 选举信息存 ZK，个别 Broker 挂掉集群仍可工作。

三台 CentOS 示例：hosts 配 `worker1/2/3`，ZK 奇数节点（3 台），每台改 `zoo.cfg` 的 `server.N` 与 `myid`，再分发 Kafka 并改 `broker.id`、`listeners`、`zookeeper.connect`。

关键 `server.properties` 项：

| 配置 | 说明 |
|------|------|
| `broker.id` | 全局唯一 |
| `listeners` | 如 `PLAINTEXT://worker1:9092` |
| `log.dirs` | 数据目录 |
| `num.partitions` | 默认分区数 |
| `zookeeper.connect` | ZK 地址列表 |

集群细节与 Topic 分布见下一篇。

---

## 小结

- 单机：`ZK → Kafka → 建 Topic → console 生产/消费`。
- **消费者组**是 Kafka 消费模型的核心；Offset 按组 + Partition 记录。
- 集群用 Partition 分片 + 副本 + ZK 协调，下一篇展开 Topic/Partition/Broker 流转。
