---
title: "如何确保Kafka集群的高可用？"
sidebarGroup: "Kafka"
shortTitle: "如何确保Kafka集群的高可用？"
order: 658
date: 2026-01-22
category: "面试题"
tag:
  - "面试题"
description: "在构建现代分布式系统时，高可用性（High Availability, HA）是一个核心且非功能性需求。对于 Apache Kafka 这样的核心消息基础设施，确保其高可用性至关重要，因为它直接关系到消息的可靠存储、传递以及整个系统的稳定运"
article: false
---

> 来源：[如何确保Kafka集群的高可用？](https://www.yuque.com/tulingzhouyu/db22bv/ik54ff6igqgl984f)

在构建现代分布式系统时，高可用性（High Availability, HA）是一个核心且非功能性需求。对于 Apache Kafka 这样的核心消息基础设施，确保其高可用性至关重要，因为它直接关系到消息的可靠存储、传递以及整个系统的稳定运行。本篇将深入探讨 Kafka 实现高可用的机制。

---

## 1) 理解高可用性：Kafka 的设计目标

高可用性意味着系统在面对各种故障（如服务器宕机、网络分区、磁盘损坏等）时，仍能持续提供服务的能力。Kafka 从设计之初就考虑了分布式环境下的高可用性，其核心目标是：

- **数据持久性**：确保已提交（committed）的消息不会丢失。
- **服务连续性**：即使部分节点失效，生产者和消费者也能继续正常工作。
- **弹性伸缩**：支持动态地添加或移除 Broker，不影响服务。

---

## 2) Kafka 高可用的核心基石：副本与分区

Kafka 实现高可用性主要依赖于 **分区（Partition）** 的 **副本机制（Replication）**。

### 2.1) Topic、Partition 与 Broker

- **Topic (主题)**：消息的逻辑分类。
- **Partition (分区)**：每个 Topic 包含一个或多个 Partition。Partition 是 Kafka 消息存储的最小单元，也是实现并行处理和高可用的关键。分区内部消息严格有序。
- **Broker (代理)**：Kafka 服务器实例。一个 Kafka 集群由多个 Broker 组成。每个 Broker 存储一个或多个 Topic 的 Partition。

### 2.2) 副本因子（Replication Factor）

- **定义**：一个 Topic 的每个 Partition 都可以在多个 Broker 上拥有副本。副本因子（`replication-factor`）定义了每个 Partition 拥有的副本数量。例如，`replication-factor = 3` 意味着每个 Partition 会有 1 个 Leader 副本和 2 个 Follower 副本。
- **作用**：提供数据冗余和故障转移能力。如果某个 Broker 宕机，只要还有其他副本存活，该 Partition 的数据就不会丢失，且服务可以继续。

### 2.3) Leader 和 Follower

- **Leader 副本**：每个 Partition 都有一个 Leader 副本。所有生产者对该 Partition 的写入操作和消费者对该 Partition 的读取操作都必须通过 Leader 副本进行。
- **Follower 副本**：除 Leader 外，其他副本都是 Follower。Follower 的职责是定期从 Leader 副本拉取数据，并与 Leader 保持同步，充当热备。

**Mermaid 图：Kafka 分区副本结构**

> 嵌入图板：[打开](https://cdn.nlark.com/yuque/__mermaid_v3/cdd56839afa6e6109e5d439a7d31609c.svg)

**图表解读**：

- 主题 `OrderEvents` 有两个分区（分区 0 和 分区 1）。
- 分区 0 有 3 个副本，其中 Broker 1 上的副本是 Leader，Broker 2 和 Broker 3 上的副本是 Follower。
- 分区 1 有 2 个副本，其中 Broker 2 上的副本是 Leader，Broker 1 上的副本是 Follower。
- 副本分布在不同的 Broker 上，确保了即使某个 Broker 故障，分区的数据仍然可用。

### 2.4) ISR（In-Sync Replicas）

- **定义**：ISR 是指所有与 Leader 副本保持同步的 Follower 副本集合（包括 Leader 自身）。当 Follower 副本成功复制了 Leader 副本的所有消息，并且没有“落后太多”（落后量由 `replica.lag.time.max.ms` 配置），它就被认为是 ISR 的一员。
- **作用**：ISR 是判断消息提交成功与否、以及进行 Leader 选举的关键。

---

## 3) Kafka 高可用机制详解

### 3.1) 故障转移：Leader 选举

当 Leader 副本所在的 Broker 发生故障时，Kafka 会从该 Partition 的 ISR 集合中选举一个新的 Leader。

**Mermaid 图：Leader 选举流程**

> [嵌入内容: diagram]

**图表解读**：

- Controller Broker 负责监控所有 Broker 的状态并协调 Leader 选举。
- 当发现某个 Leader 副本所在的 Broker 故障时，Controller 会从该 Partition 的 ISR 中选择一个 Follower 作为新的 Leader。
- 新的 Leader 会立即接管所有读写请求，从而实现快速故障转移。

### 3.2) 生产者高可用：`acks` 配置

生产者通过 `acks` 参数控制消息的可靠性级别。这是确保消息不丢失的关键配置。

- `acks=0`：生产者发送消息后，不等待 Broker 的任何确认。

- **特点**：吞吐量最高，但可靠性最低，可能丢失消息。

- `acks=1`：生产者发送消息后，等待 Leader 副本成功接收消息的确认。

- **特点**：可靠性适中，即使 Leader 宕机，只要 Follower 成功复制，消息也不会丢失。

- `acks=all` （或 `-1`）：生产者发送消息后，等待所有 ISR 中的副本都成功接收消息的确认。

- **特点**：可靠性最高，吞吐量相对最低。这是生产环境中确保消息不丢失的推荐设置。结合 `min.insync.replicas` 参数使用，可进一步增强可靠性。

**Mermaid 图：生产者 **`acks`** 对可靠性的影响**

> [嵌入内容: diagram]

### 3.3) 消费者高可用：消费者组与重平衡

消费者组是 Kafka 消费者实现高可用和负载均衡的关键机制。

- **负载均衡**：一个 Topic 的多个 Partition 会被消费者组中的多个消费者实例均摊。
- **故障转移**：当消费者组中的某个消费者实例宕机或加入新的消费者时，会触发 **重平衡（Rebalance）**。Kafka 会自动重新分配 Partition 给组内其他活跃的消费者实例，确保所有 Partition 都能被消费，且每个 Partition 最多被一个消费者消费。

### 3.4) Broker 高可用：控制器（Controller）

- **作用**：Controller 是 Kafka 集群中的一个 Broker，负责管理和协调整个集群。它负责：

- Leader 选举。
- 管理 Topic 结构（创建、删除 Topic）。
- 处理 Broker 故障。

- **选举**：Controller 是通过 Zookeeper（或 Kafka 自身的 KRaft 模式）选举出来的。集群中只有一个 Controller 处于活跃状态，其他 Broker 处于待命状态。如果当前 Controller 宕机，Zookeeper/KRaft 会迅速选举新的 Controller。

---

## 4) 确保高可用的关键配置

在实际部署和使用 Kafka 时，以下配置对于实现高可用至关重要：

### 4.1) Topic 级别配置

- `replication.factor`：**核心参数**。建议至少设置为 3，这意味着每个 Partition 会有 3 个副本。

- **示例**：

```bash
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic my-ha-topic --partitions 3 --replication-factor 3
```

- `min.insync.replicas`：**与 **`acks=all`** 配合使用**。定义了生产者发送消息时，至少需要有多少个 ISR 中的副本成功接收消息才算成功。

- **建议**：设置为 `replication.factor / 2 + 1`，例如 `replication.factor=3` 时，`min.insync.replicas=2`。
- **作用**：当 ISR 数量少于 `min.insync.replicas` 时，即使 `acks=all`，生产者也会收到一个 `NotEnoughReplicasException` 异常，从而阻止消息写入可能导致数据丢失的情况。

### 4.2) Producer 级别配置

- `acks`：如前所述，**必须设置为 **`all` 来确保最高可靠性。

- **Java 代码示例**：见下文。

- `retries`：消息发送失败时的重试次数。

- **建议**：设置为一个合理的数值（例如 3-5 次）。

- `retry.backoff.ms`：两次重试之间的时间间隔。

### 4.3) Consumer 级别配置

- `group.id`：确保消费者属于一个消费者组，以利用 Kafka 的负载均衡和故障转移机制。
- `enable.auto.commit=false`：**推荐**。禁用自动提交 Offset，采用手动提交来精确控制消息处理和 Offset 记录，避免消息丢失或重复。
- `auto.offset.reset`：当消费者组首次启动或 Kafka 中没有该组的 Offset 时，从哪里开始消费。

- `earliest`：从最开始的 Offset 消费。
- `latest`：从最新的 Offset 消费。

### 4.4) Broker 级别配置

- `num.replica.fetchers`：每个 Broker 用于从 Leader 副本同步数据的线程数。
- `replica.lag.time.max.ms`：Follower 副本与 Leader 副本之间允许的最大延迟时间。超过此时间，Follower 将被踢出 ISR。
- 确保 Broker 部署在不同的物理机、不同的机架或不同的可用区，以分散故障风险。

---

## 5) Java 代码示例：配置生产者高可用

以下代码演示了如何在 Java 生产者中配置 `acks=all` 和 `min.insync.replicas`（通过 Topic 创建时指定）。

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.concurrent.ExecutionException;

public class HighAvailabilityProducer {

    private static final String BOOTSTRAP_SERVERS = "localhost:9092"; // Kafka集群地址
    private static final String TOPIC_NAME = "my-ha-topic"; // 用于高可用的Topic

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // 核心配置：确保消息高可靠性
        props.put(ProducerConfig.ACKS_CONFIG, "all"); // 等待所有ISR副本确认
        props.put(ProducerConfig.RETRIES_CONFIG, 3); // 消息发送失败时重试3次
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100); // 重试间隔100ms
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true); // 开启幂等性，防止消息重复

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            for (int i = 0; i < 5; i++) {
                String key = "message-key-" + i;
                String value = "High-Availability Message " + i;
                ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, key, value);

                try {
                    RecordMetadata metadata = producer.send(record).get(); // 同步发送并等待结果
                    System.out.printf("消息发送成功！Topic: %s, Partition: %d, Offset: %d, Key: %s, Value: %s%n",
                            metadata.topic(), metadata.partition(), metadata.offset(), record.key(), record.value());
                } catch (ExecutionException e) {
                    System.err.println("消息发送失败，可能是由于ISR不足或其他问题：" + e.getCause().getMessage());
                    // 在这里可以处理 NotEnoughReplicasException 等异常
                }
            }
        } catch (Exception e) {
            System.err.println("生产者初始化或发送过程中发生异常: " + e.getMessage());
            e.printStackTrace();
        }
        System.out.println("所有消息发送完毕。");
    }
}
```

**运行前准备**：

1. 确保 Kafka 集群至少有 3 个 Broker 运行。
2. 创建一个 Topic，`replication-factor` 至少为 3，`min.insync.replicas` 至少为 2：

```bash
# kafka-topics.sh --bootstrap-server localhost:9092 --create --topic my-ha-topic --partitions 3 --replication-factor 3 --config min.insync.replicas=2
```

（请根据实际 Broker 数量调整 `replication-factor`）

---

## 6) 总结与最佳实践

Kafka 实现高可用性是一个多层面、多组件协作的结果。其核心在于通过**分区副本机制**提供数据冗余和故障转移能力。

- **Topic 配置**：通过 `replication.factor` 和 `min.insync.replicas` 确保数据副本的健壮性。
- **生产者配置**：通过 `acks=all` 和 `enable.idempotence=true` 确保消息的可靠性发送。
- **消费者设计**：利用消费者组实现负载均衡和故障转移。
- **集群部署**：将 Broker 分散部署在不同的故障域（物理机、机架、可用区），以应对更大范围的故障。

理解并正确配置这些参数，以及合理设计应用，是构建一个高可用、高可靠的 Kafka 消息系统的关键。
