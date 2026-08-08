---
title: "Kafka 客户端机制——分区、幂等、事务与压缩"
sidebarGroup: "Kafka"
shortTitle: "05 客户端核心机制"
order: 5
date: 2026-09-09
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 5/11 篇**  
> 下一篇预告：[《SpringBoot 集成 Kafka》](/中间件/kafka/kafka-06-springboot)

---

## 开头：网络不稳、服务会挂，客户端怎么扛？

Kafka 的精髓不在「会调 API」，而在**复杂环境下仍保高并发、高吞吐**。下面按机制梳理 High Level 客户端的核心设计；不必死记参数名，需要时查 `ProducerConfig` / `ConsumerConfig` 的 DOC 字符串即可。

---

## 一、消费者分组消费

![生产者均匀写入各 Partition；每个 Consumer Group 只消费一份副本，不同组重复消费](/中间件/kafka/26/p05-01.png)

- 消息会尽量均匀写到 Topic 各 Partition。
- **同一 Consumer Group** 内，一条消息只被一个实例消费；**不同 Group** 各自完整消费。
- **Offset** 按 `Group + Partition` 记录；消费者处理完需 **commit**（同步/异步/自动提交 `enable.auto.commit`）。

两个关键推论：

1. **一个 Partition 同一时刻最多一个 Consumer 实例** —— 否则同一 Partition 会乱提交 Offset。4 个 Partition 的 Topic，同组最多 4 个有效消费者。
2. **Offset 由消费者推进，不够「稳」** —— 服务端有 `auto.offset.reset`（`earliest` / `latest` / `none`）兜底；也可把 Offset 存 Redis 等第三方，用业务进度驱动。

同步提交：处理完再提交，可能重复但不会因提前提交而丢进度。异步提交：吞吐高，业务失败但 Offset 已提交会**丢消息**。处理慢还会触发 rebalance，造成**重复消费**。

`group.instance.id` 可减少不必要的 rebalance。

![查看消费者组各 Partition 的 CURRENT-OFFSET、LOG-END-OFFSET 等](/中间件/kafka/26/p05-02.png)

---

## 二、生产者拦截器

`interceptor.classes` 实现 `ProducerInterceptor`：`onSend`（发前）、`onAcknowledgement`（应答后）、`close`。常用于统一加时间戳、TraceId 等；传 POJO 时配合序列化使用。

---

## 三、消息序列化

![Key 参与分区；Key/Value 都需 Serializer，Consumer 端对应 Deserializer](/中间件/kafka/26/p07-01.png)

- **Key**：可选；有 Key 则 hash 选 Partition，相同 Key 进同一 Partition。
- **Value**：业务 payload，序列化为 `byte[]` 再网络传输与落盘。
- 自定义 POJO：定长字段直接写；变长字段先写长度再写内容。

高效序列化是高并发系统的通用优化（MapReduce、Netty 同理）。

---

## 四、分区路由

![Producer 的 Partitioner 决定消息进哪个 Partition](/中间件/kafka/26/p08-01.png)

**Producer 侧** `partitioner.class`：

- 默认 **Sticky**：尽量粘在同一 Partition，直到 `batch.size` 满或 `linger.ms` 到期。
- **RoundRobinPartitioner**：轮询（较少用）。
- 可自定义 `Partitioner.partition()`，用 `cluster.partitionsForTopic(topic)` 获取分区列表。

**Consumer 侧** `partition.assignment.strategy`：

| 策略 | 行为 |
|------|------|
| **Range** | 按 Topic 把连续 Partition 分给各 Consumer |
| **RoundRobin** | 轮询分配 |
| **Sticky / CooperativeSticky** | 尽量均匀且 rebalance 时少搬家 |

机器性能不均时可自定义分配，让强机器多消费。

---

## 五、生产者消息缓存

![RecordAccumulator 按 Partition  deque 缓存 ProducerBatch；Sender 线程批量发送](/中间件/kafka/26/p10-01.png)

核心组件：

- **RecordAccumulator**：按 Partition 双端队列攒批。
- **Sender 线程**：达到 `batch.size`（默认 16KB）或等待 `linger.ms`（默认 0）后发送。

关键参数：

| 参数 | 作用 |
|------|------|
| `buffer.memory` | 生产者总缓冲 |
| `batch.size` | 单批上限 |
| `linger.ms` | 未满批时的等待时间 |
| `max.in.flight.requests.per.connection` | 单连接未 ack 请求数（默认 5） |

批内消息**无严格顺序保证**；调大 batch / buffer / in-flight 可换吞吐。

![Sender、InflightRequest 与 Broker 的网络交互](/中间件/kafka/26/p11-01.png)

---

## 六、发送应答（acks）

`acks` 控制 Producer 等 Leader/副本写到什么程度再返回：

| 值 | 行为 | 吞吐 | 安全 |
|----|------|------|------|
| **0** | 不等 Broker 确认 | 最高 | 最低 |
| **1** | Leader 本地写完即返回 | 中 | 中（Leader 挂可能丢） |
| **all / -1** | ISR 全部确认（受 `min.insync.replicas` 约束） | 最低 | 最高 |

生产常见：`acks=1` 日志类；`acks=all` 敏感数据。**acks 只保证 Broker 侧响应可靠，Producer 收到响应后的业务处理 Kafka 不参与。**

---

## 七、生产者幂等性

![Producer 重试可能导致重复写入；幂等靠 PID + Sequence Number](/中间件/kafka/26/p14-01.png)

开启 `enable.idempotence`（默认在无冲突配置时开启）需：`acks=all`、`retries>0`、`max.in.flight.requests.per.connection ≤ 5`。

Broker 对每个 `<PID, Partition>` 维护序列号 SN：仅当 `SequenceNumber == SN+1` 才接受；过小视为重复，过大抛 `OutOfOrderSequenceException`。

---

## 八、三种数据语义

![at-least-once、at-most-once、exactly-once 的对比](/中间件/kafka/26/p15-01.png)

| 语义 | 含义 |
|------|------|
| **at-most-once** | 最多一次（可能丢） |
| **at-least-once** | 至少一次（可能重复） |
| **exactly-once** | 恰好一次（需精密设计） |

`acks=0` → at-most-once；`acks=1/-1` + 幂等 → 单 Partition 单 Producer 的 exactly-once 写入。跨 Partition 还需事务。

---

## 九、数据压缩

`compression.type`：`none`、`gzip`、`snappy`、`lz4`、`zstd`（压缩比高但 CPU 重；`lz4` 吞吐友好）。按**整批**压缩；Consumer 自动解压。Broker `compression.type=producer` 保持与 Producer 一致，否则易出异常。

---

## 十、生产者事务

跨多个 Partition / Broker 的一批消息需要 **事务 API**：

```java
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "业务唯一事务ID");
producer.initTransactions();
producer.beginTransaction();
try {
    producer.send(record);
    producer.commitTransaction();
} catch (ProducerFencedException e) {
    producer.abortTransaction();
} finally {
    producer.close();
}
```

- 同一 `transactional.id` 同时只有一个活跃 Producer（旧实例 fenced）。
- 新实例会对未完成事务做补齐（提交或终止）。
- **事务保证 Producer 发送的原子性，不保证所有 Consumer 一定已读到。**

![事务 Producer 安全发送模式示意](/中间件/kafka/26/p16-01.png)

---

## 小结

建立「**属性驱动**」的心智模型：分组与 Offset、序列化与分区、攒批与 acks、幂等与事务、压缩。下一篇看 SpringBoot 如何把这些参数装配进 `KafkaTemplate` 与 `@KafkaListener`。
