---
title: "Kafka 功能扩展——压测、监控、KRaft 与流式"
sidebarGroup: "Kafka"
shortTitle: "11 压测监控 KRaft 流式"
order: 11
date: 2026-09-15
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 11/11 篇**  
> 本系列完结。常见问题可参阅 [《MQ 如何保证消息不丢失》](/中间件/faq/mq-faq-01-no-loss)；下一产品系列：[RocketMQ](/中间件/rocketmq/rocketmq-01-quickstart)。

---

## 开头：上线前还要问的三件事

会发消息、懂集群原理之后，生产环境还要：**压测容量、看监控大盘、了解 KRaft 演进方向**，以及 Kafka 作为**流式计算数据源**的角色。本篇收束扩展话题；具体工具版本会变，思路比命令更重要。

---

## 一、Kafka 性能压测

![kafka-producer-perf-test 输出 records/sec、延迟分位](/中间件/kafka/29/p02-01.png)

Kafka 自带压测脚本，衡量集群写入能力：

```bash
bin/kafka-producer-perf-test.sh --topic test --num-records 1000000 \
  --record-size 1024 --throughput -1 \
  --producer-props bootstrap.servers=worker1:9092 acks=1
```

关注 **records/sec、MB/sec、avg/max latency、P50/P95/P99**。常作为调优 `batch.size`、`linger.ms`、磁盘与网络后的基准对比。

---

## 二、监控平台 EFAK

![EFAK（原 Kafka Eagle）Web 控制台总览](/中间件/kafka/29/p04-01.png)

生产环境常用 [EFAK](https://www.kafka-eagle.org/)（Eagle For Apache Kafka）监控集群。依赖 **Java + MySQL**（或 SQLite 做本地试用）。

简要步骤：

1. 下载 `efak-web-*-bin.tar.gz` 解压。
2. 修改 `conf/system-config.properties`：`efak.zk.cluster.alias`、`cluster1.zk.list`、MySQL `efak.url` 等。
3. 配置 `KE_HOME` 与 `PATH`，`bin/ke.sh start`。
4. 浏览器访问默认 **8048**，账号 `admin` / `123456`（以安装包说明为准）。

可查看 Broker、Topic、Consumer Group Lag 等；Offset 存储可选 kafka 或 zk（`cluster1.efak.offset.storage`）。

---

## 三、KRaft 集群

### 为什么要有 KRaft

![KRaft 模式下 Controller 由 Raft 共识，不再依赖外部 Zookeeper](/中间件/kafka/29/p05-01.png)

传统模式：元数据在 **Zookeeper**，Controller 由 ZK 选举；ZK 不适合海量元数据，运维与版本耦合也是云原生障碍。  
**KRaft**（Kafka Raft）从 2.8 起实验，**3.3.1** 起标记 Production Ready（KIP-833），企业大规模替换 ZK 仍在进行中。

好处概览：

- Kafka **可独立运行**，减少 ZK 抖动影响。
- Controller **配置固定**，便于与高可用工具配合。
- 元数据读写能力增强，**Partition 规模**上限提升。

`config/kraft/` 提供 `broker.properties`、`controller.properties`、`server.properties` 示例。

关键配置：

```properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@worker1:9093,2@worker2:9093,3@worker3:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
log.dirs=/app/kafka/kraft-log
```

首次启动需格式化存储：

```bash
bin/kafka-storage.sh random-uuid
bin/kafka-storage.sh format -t <UUID> -c config/kraft/server.properties
bin/kafka-server-start.sh -daemon config/kraft/server.properties
```

---

## 四、Kafka 与流式计算

### 批量 vs 流式

| 模式 | 数据特点 | 典型场景 |
|------|----------|----------|
| **批量** | 静态全集，一批批算 | SQL 离线、Consumer 每次 poll 一批 |
| **流式** | 动态到达，来一条算一条 | 实时 PV/UV、风控 |

Kafka 吞吐高，天然适合流式管道；生态有 **Kafka Streams**、Flink、Spark Streaming 等。

### Word Count 示例（Kafka Streams）

![High Level Streams API：KStream 分组计数 Topology](/中间件/kafka/29/p08-01.png)

依赖：

```xml
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-streams</artifactId>
    <version>3.8.0</version>
</dependency>
```

核心：`StreamsBuilder` 读 `inputTopic` → `flatMapValues` 分词 → `groupBy` → `count` → 写 `outputTopic`。  
概念：**KStream**（流）、**KTable**（ changelog 表状中间结果）。

### Low Level Topology

![Processor 链：Source → Process → Sink](/中间件/kafka/29/p10-01.png)

- **Source Processor**：读 Topic
- **Processor**：变换
- **Sink Processor**：写 Topic  

可用 `KeyValueStore` 做本地状态，配合 `Punctuation` 定时输出——类似工厂流水线。

更大规模、多 Source/Sink 选 **Flink / Spark**；思路与 Streams 一脉相承。

---

## 五、系列总结

1. **Kafka 的价值**不仅在 API，更在把消息驱动做到单机数十万 TPS 级，以及分区、副本、HW、顺序写、零拷贝等**三高设计思想**。
2. **生态**从 Java 业务通向大数据与 AI 管道；Streams/Flink 是常见下一站。
3. **运维**：压测定容量、EFAK 看 Lag 与集群健康、关注 KRaft 替代 ZK 的路线图。

---

## 小结

| 主题 | 要点 |
|------|------|
| 压测 | `kafka-producer-perf-test.sh` |
| 监控 | EFAK + ZK/MySQL |
| KRaft | 去 ZK、Raft 管元数据 |
| 流式 | Kafka Streams / Flink，KStream + Topology |

Kafka 系列 11 篇完结。Compare 选型与「消息不丢、重复、堆积」等问题，见 **MQ 常见问题** 与后续 **RocketMQ** 系列。
