---
title: "Kafka如何保证消息可靠？"
sidebarGroup: "Kafka"
shortTitle: "Kafka如何保证消息可靠？"
order: 657
date: 2026-01-20
category: "面试题"
tag:
  - "面试题"
description: "1. 什么是消息可靠性？为什么Kafka需要它？消息可靠性是指消息在整个生命周期中能够被正确传递和处理的保障。在Kafka中，这通常意味着：消息不丢失 (At-least-once)：生产者发送的消息，至少会被成功投递一次。消息不重复 (A"
article: false
---

> 来源：[Kafka如何保证消息可靠？](https://www.yuque.com/tulingzhouyu/db22bv/fyuce7d7zglkpwp5)

## 1. 什么是消息可靠性？为什么Kafka需要它？

消息可靠性是指消息在整个生命周期中能够被正确传递和处理的保障。在Kafka中，这通常意味着：

- **消息不丢失 (At-least-once)**：生产者发送的消息，至少会被成功投递一次。
- **消息不重复 (At-most-once)**：生产者发送的消息，至多会被成功投递一次。
- **消息精确一次 (Exactly-once)**：生产者发送的消息，恰好会被成功投递一次（不丢不重）。
- **消息有序性 (Ordering)**：同一个分区内的消息，按照发送顺序进行存储和消费。

在分布式系统中，网络延迟、服务器故障、进程崩溃等问题随时可能发生，如果没有可靠性保障，消息可能会丢失或重复，导致业务数据不一致甚至严重错误。Kafka通过多方面机制来应对这些挑战。

## 2. 生产者如何保证消息不丢失与不重复

生产者是消息的起点，Kafka提供了多种配置和机制来保证消息从这里可靠地发送到Broker。

### 2.1 `acks` 参数：消息持久化的保证

`acks` 是生产者最重要的配置之一，它决定了生产者发送消息的确认机制，直接影响消息的持久性保证和性能。

- `acks=0`** (不等待确认)**：

- **含义**：生产者发送消息后，不等待Broker的任何确认，直接发送下一条。
- **可靠性**：最低。消息可能会因网络问题、Broker崩溃等原因丢失。
- **性能**：最高。
- **适用场景**：对消息丢失不敏感的场景，如日志收集（可以接受少量日志丢失）。

- `acks=1`** (等待Leader确认)**：

- **含义**：生产者发送消息后，只要Leader副本成功写入消息，就认为消息发送成功。
- **可靠性**：中等。如果Leader在消息同步到Follower之前崩溃，消息会丢失。
- **性能**：中等。
- **适用场景**：对消息丢失有一定容忍度，但希望比`acks=0`更可靠的场景。

- `acks=all`** 或 **`acks=-1`** (等待所有ISR副本确认)**：

- **含义**：生产者发送消息后，不仅Leader副本要成功写入，还要等待所有ISR（In-Sync Replicas，同步副本）中的Follower副本也成功同步消息后，才认为消息发送成功。
- **可靠性**：最高。只要ISR中至少有一个副本存活，消息就不会丢失。
- **性能**：最低（相对于`acks=0`和`acks=1`）。
- **适用场景**：对消息丢失零容忍的场景，如金融交易、订单系统。

#### 代码示例：设置 `acks`

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class ReliableProducer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // 设置acks为all，提供最高可靠性
        props.put(ProducerConfig.ACKS_CONFIG, "all"); 
        // 建议配合重试机制使用
        props.put(ProducerConfig.RETRIES_CONFIG, 3); // 允许重试3次

        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        try {
            for (int i = 0; i < 10; i++) {
                String key = "key-" + i;
                String value = "message-" + i;
                ProducerRecord<String, String> record = new ProducerRecord<>("my_topic", key, value);
                producer.send(record, (metadata, exception) -> {
                    if (exception == null) {
                        System.out.printf("消息发送成功！主题: %s, 分区: %d, 偏移量: %d%n",
                                metadata.topic(), metadata.partition(), metadata.offset());
                    } else {
                        System.err.printf("消息发送失败！异常: %s%n", exception.getMessage());
                    }
                }).get(); // 使用get()同步发送，等待确认
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            producer.close();
        }
    }
}
```

### 2.2 `retries` 参数：应对瞬时故障

当生产者发送消息失败时（例如，网络瞬时抖动，Leader切换等），可以通过重试机制来重新发送消息。

- `retries`：配置重试的次数。设置为一个大于0的值，可以在瞬时故障时有效防止消息丢失。
- **注意**：在不开启幂等性（`enable.idempotence=false`）的情况下，重试可能导致消息重复。例如，消息已成功写入Broker但Producer接收ACK超时，Producer会再次发送。

### 2.3 幂等生产者 (Idempotent Producer)：保证消息不重复

Kafka 0.11.0 引入了幂等性，保证生产者在重试发送时，消息不会重复，从而实现**At-least-once to Exactly-once within a single session for a single partition**。

- **原理**：

- Kafka为每个幂等生产者分配一个**Producer ID (PID)**。
- 每个PID发送消息时，会携带一个单调递增的**Sequence Number**。
- Broker会为每个PID和分区维护一个已接收的最大Sequence Number。如果收到的Sequence Number小于或等于已接收的最大Sequence Number，Broker就会丢弃该重复消息。
- **Epoch**：在Producer重启后，会获得新的PID和Epoch，以防止旧的Sequence Number冲突。

- **开启方式**：设置 `enable.idempotence=true`。

- 当开启幂等性后，`acks` 会自动被设置为 `all`，`retries` 会被设置为 `Integer.MAX_VALUE`，`max.in.flight.requests.for.connection` 会被设置为 5。

#### 代码示例：开启幂等性

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class IdempotentProducer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // 开启幂等性
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true"); 

        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        try {
            for (int i = 0; i < 10; i++) {
                String key = "key-" + i;
                String value = "idempotent-message-" + i;
                ProducerRecord<String, String> record = new ProducerRecord<>("my_topic", key, value);
                producer.send(record, (metadata, exception) -> {
                    if (exception == null) {
                        System.out.printf("幂等消息发送成功！主题: %s, 分区: %d, 偏移量: %d%n",
                                metadata.topic(), metadata.partition(), metadata.offset());
                    } else {
                        System.err.printf("幂等消息发送失败！异常: %s%n", exception.getMessage());
                    }
                }).get();
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            producer.close();
        }
    }
}
```

### 图示描述：生产者发送消息与确认机制

- `acks=0`: Producer -> Broker (单向箭头)
- `acks=1`: Producer -> Broker (Leader) -> ACK (Leader) -> Producer (双向箭头，Leader确认)
- `acks=all`: Producer -> Broker (Leader) -> Leader 写入 -> Leader 同步到 Follower (ISR) -> 所有ISR确认 -> ACK (Leader) -> Producer (复杂双向箭头，涉及多个Broker)
- **重试**: Producer -> Broker (发送失败) -> Producer (重试) -> Broker (发送成功) -> ACK -> Producer
- **幂等性**: Producer (PID, SeqNum) -> Broker (存储) -> ACK -> Producer。若重试：Producer (PID, SeqNum) -> Broker (判断SeqNum已存在，丢弃) -> ACK -> Producer。

## 3. Broker端如何存储和复制消息

Broker是消息的存储中心，Kafka通过副本机制和ISR来保证消息的持久性和高可用性。

### 3.1 副本机制 (`replication.factor`)

- **含义**：Kafka将每个分区的数据复制多份，存储在不同的Broker上。这些副本包括一个Leader副本和若干个Follower副本。
- `replication.factor`：每个分区的副本数量。建议设置为3，即一个Leader和两个Follower。
- **作用**：当某个Broker（包括Leader或Follower）发生故障时，其他副本仍然可以提供服务，避免数据丢失和服务中断。

### 3.2 ISR (In-Sync Replicas)：同步副本集合

- **含义**：ISR是一个动态集合，包含与Leader副本保持同步的所有副本（包括Leader本身）。只有ISR中的副本才具备被选举为新Leader的资格。
- **同步判断**：Follower副本如果在一定时间内没有向Leader发送拉取请求，或者拉取消息的滞后量超过`replica.lag.time.max.ms`配置，就会被Leader踢出ISR。
- **重要性**：`acks=all`机制就是依赖ISR来保证消息的持久性。只有当ISR中所有副本都确认写入后，Leader才会向生产者发送确认。

### 3.3 Leader选举

- **何时发生**：当Leader副本所在的Broker发生故障时，Kafka会从ISR中选举一个新的Leader。
- **机制**：由ZooKeeper（或KRaft）协调完成，保证只有一个Leader。
- **数据一致性**：新Leader一定是ISR中的副本，因此它拥有所有已提交的消息，保证了数据不丢失。
- `unclean.leader.election.enable`：

- `false`** (默认)**：只允许ISR中的副本成为Leader。即使所有ISR副本都故障了，也不会从非ISR副本中选举，保证了数据一致性，但可用性可能受损。
- `true`：允许非ISR副本成为Leader。在极端情况下（所有ISR副本都故障），可以牺牲一定的数据一致性来保证可用性。通常不建议在生产环境开启。

### 3.4 消息持久化 (磁盘刷写)

- **内存写入**：Kafka Broker收到消息后，首先写入操作系统的页缓存（Page Cache），这是一种内存缓存，性能很高。
- **异步刷盘**：操作系统会在后台将页缓存中的数据异步刷写到磁盘。
- **刷盘策略**：

- `log.flush.interval.messages`：达到消息数量阈值后刷盘。
- `log.flush.interval.ms`：达到时间间隔后刷盘。

- **可靠性**：即使Kafka Broker发生崩溃，由于数据在页缓存中，操作系统也会尽力将其刷盘。Kafka通过追加写入日志文件（Log Segment），保证了即使崩溃重启，也能恢复到崩溃前的状态。

### 图示描述：副本机制与ISR

- **主题分区**: 一个主题被分成多个分区。
- **分区副本**: 每个分区有多个副本 (Leader, Follower1, Follower2) 分布在不同的Broker上。
- **ISR**: Leader和Follower1都在ISR中，Follower2因滞后不在ISR中。
- **消息写入**: Producer发送消息到Leader，Leader写入后同步到ISR中的Follower。所有ISR确认后，Leader返回ACK给Producer。

## 4. 消费者如何确保消息被正确处理

消费者是消息的终点，需要确保消息被正确地拉取和处理，避免重复消费或漏消费。

### 4.1 Offset管理：消费进度的记录

- **Offset**：消息在分区中的唯一标识，消费者通过提交Offset来记录自己的消费进度。
- **提交位置**：Offset存储在Kafka内部的一个特殊主题 `__consumer_offsets` 中。
- **消费语义**：

- **At-most-once (至多一次)**：消费者拉取消息后立即提交Offset，然后处理消息。如果在处理过程中崩溃，消息可能未被处理但Offset已提交，导致消息丢失。
- **At-least-once (至少一次)**：消费者处理完消息后再提交Offset。如果在处理完消息但未提交Offset时崩溃，重启后会从上次提交的Offset开始重新消费，导致消息重复处理。Kafka默认倾向于这种模式。
- **Exactly-once (精确一次)**：结合了幂等生产者和事务型生产者，以及消费者对事务的支持，从端到端实现不丢不重。

#### 代码示例：手动提交Offset (At-least-once)

```java
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class ManualOffsetConsumer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "my_consumer_group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        // 禁用自动提交Offset
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        // 自动提交间隔（如果enable.auto.commit为true才有效）
        // props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList("my_topic"));

        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("接收到消息！主题: %s, 分区: %d, 偏移量: %d, 键: %s, 值: %s%n",
                            record.topic(), record.partition(), record.offset(), record.key(), record.value());
                    // 业务处理逻辑...
                    // 模拟处理失败
                    // if (record.offset() % 5 == 0) {
                    //     throw new RuntimeException("模拟处理失败");
                    // }
                }
                // 在所有消息处理完毕后手动提交Offset
                if (!records.isEmpty()) {
                    consumer.commitSync(); // 同步提交，保证提交成功
                    // consumer.commitAsync(); // 异步提交，性能更高，但可能重复提交
                    System.out.println("Offset已提交！");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            consumer.close();
        }
    }
}
```

### 4.2 消费组 (Consumer Group)

- **含义**：多个消费者可以组成一个消费组，共同消费一个或多个主题。
- **负载均衡**：Kafka会将主题的分区分配给消费组内的不同消费者。每个分区只能由消费组内的一个消费者消费。
- **高可用性**：当消费组内某个消费者宕机时，其负责的分区会自动重新分配给组内其他存活的消费者。
- **确保消息不重复消费**：通过消费组机制，保证了同一条消息不会被同一个消费组内的多个消费者重复消费。

### 4.3 消费会话与心跳 (`max.poll.interval.ms`, `session.timeout.ms`)

- `max.poll.interval.ms`：消费者在两次调用`poll()`方法之间允许的最长间隔。如果超过这个时间，Kafka会认为该消费者处理消息过慢或已死亡，将该消费者踢出消费组，并触发Rebalance。
- `session.timeout.ms`：消费者与Broker之间会话的最大允许时间。如果消费者在此时间内未能向Broker发送心跳，会被认为已死亡，触发Rebalance。
- `heartbeat.interval.ms`：消费者发送心跳的间隔。

这些参数共同确保了消费者活性检测和Rebalance的及时性，避免了分区长期无人消费的情况。

### 图示描述：消费组与Offset提交

- **主题与分区**: 一个主题 (Topic) 有多个分区 (Partition 0, Partition 1, Partition 2)。
- **消费组**: 一个消费组 (Consumer Group) 内有多个消费者 (Consumer A, Consumer B)。
- **分区分配**: Consumer A 消费 Partition 0 和 Partition 1，Consumer B 消费 Partition 2。
- **Offset提交**: 每个消费者独立提交其所消费分区的Offset。
- **Rebalance**: 如果 Consumer B 宕机，Partition 2 会被重新分配给 Consumer A。

## 5. 端到端（End-to-End）的Exactly-Once语义

虽然幂等生产者保证了单分区内的消息不重复，但如果涉及到生产者在发送消息的同时，还要向其他系统（如数据库）写入数据，或者消费者在处理消息后，还要向其他系统写入数据，仅仅依靠幂等生产者是不足以保证“端到端”的精确一次语义的。这时就需要Kafka的事务机制。

### 5.1 为什么需要事务？

考虑一个场景：生产者从一个主题A读取消息，处理后向主题B发送新消息，并更新一个数据库。
如果没有事务，可能出现以下问题：

1. 消息已发送到主题B，但数据库更新失败 -> 导致数据不一致。
2. 数据库更新成功，但消息发送到主题B失败 -> 导致数据不一致。
3. 消费者处理完消息，更新了数据库，并向主题B发送消息，但提交Offset失败 -> 消费者重启后会重复消费，导致主题B消息重复，数据库重复更新。

Kafka的事务机制旨在解决这种跨多个分区、跨多个主题甚至跨Kafka内部与外部系统操作的原子性问题，从而实现端到端的Exactly-Once语义。

### 5.2 事务型生产者 (Transactional Producer)

- `transactional.id`：开启事务的生产者需要配置一个唯一的`transactional.id`。Kafka通过这个ID来恢复任何失败的事务，确保事务状态的正确性。
- **两阶段提交原理**：Kafka事务机制基于两阶段提交（2PC）的变种。

1. `initTransactions()`：初始化事务。
2. `beginTransaction()`：开始事务。
3. `send()`：发送消息。这些消息被标记为事务性消息，对消费者不可见（除非消费者设置`isolation.level=read_uncommitted`）。
4. `sendOffsetsToTransaction()`：如果消费者需要参与事务（比如在消费消息后提交Offset），可以通过这个方法将Offset提交到事务中。
5. `commitTransaction()` 或 `abortTransaction()`：提交或中止事务。

- **提交**：当所有消息和Offset都写入成功后，事务协调器向所有涉及的分区发送一个“COMMIT”标记。此时这些事务性消息对消费者可见。
- **中止**：如果过程中发生任何错误，事务协调器向所有涉及的分区发送一个“ABORT”标记。此时这些事务性消息对消费者不可见。

#### 代码示例：事务型生产者

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.KafkaException;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class TransactionalProducer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // 开启幂等性 (事务的前提)
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true"); 
        // 设置事务ID
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "my_transactional_id");

        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        // 1. 初始化事务
        producer.initTransactions();

        try {
            // 2. 开始事务
            producer.beginTransaction();

            // 3. 发送消息
            for (int i = 0; i < 5; i++) {
                String key = "txn-key-" + i;
                String value = "transactional-message-" + i;
                ProducerRecord<String, String> record = new ProducerRecord<>("my_topic", key, value);
                producer.send(record);
                // 模拟一个发送到另一个主题的消息
                ProducerRecord<String, String> anotherRecord = new ProducerRecord<>("another_topic", key, "second-txn-message-" + i);
                producer.send(anotherRecord);
            }

            // 模拟一个异常来测试事务中止
            // if (System.currentTimeMillis() % 2 == 0) {
            //     throw new RuntimeException("Simulating an error to abort transaction");
            // }

            // 4. 提交事务
            producer.commitTransaction();
            System.out.println("事务已提交！");

        } catch (KafkaException e) {
            // 捕获Kafka相关异常，中止事务
            producer.abortTransaction();
            System.err.println("事务已中止！异常: " + e.getMessage());
        } catch (Exception e) {
            // 捕获其他异常，也中止事务
            producer.abortTransaction();
            System.err.println("非Kafka异常，事务已中止！异常: " + e.getMessage());
        } finally {
            producer.close();
        }
    }
}
```

### 5.3 消费者对事务的支持 (`isolation.level`)

为了配合事务型生产者实现Exactly-Once，消费者也需要进行配置：

- `isolation.level=read_uncommitted`** (默认)**：消费者会读取所有消息，包括未提交的事务消息。这可能导致消费者看到“脏数据”（后续被中止的事务消息）。适用于对消息精确一次处理要求不高的场景。
- `isolation.level=read_committed`：消费者只会读取已提交的事务消息。未提交的事务消息（包括正在进行中的和已中止的）会被过滤掉。这是实现端到端Exactly-Once语义的关键配置。

#### 代码示例：消费者配置 `isolation.level`

```java
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class TransactionalConsumer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "my_transactional_consumer_group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        // 禁用自动提交Offset，因为要结合事务来提交
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        // 设置隔离级别为read_committed，只读取已提交的事务消息
        props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList("my_topic")); // 订阅生产事务消息的主题

        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("事务消费者接收到消息！主题: %s, 分区: %d, 偏移量: %d, 键: %s, 值: %s%n",
                            record.topic(), record.partition(), record.offset(), record.key(), record.value());
                    // 业务处理逻辑...
                    // 在这里，通常会和producer.sendOffsetsToTransaction()结合使用，
                    // 即在消费-处理-生产新消息的原子操作中，将消费到的offset也加入到当前事务中。
                }
                // 在read_committed模式下，即使没有消费到任何记录，也应该周期性地提交偏移量，
                // 确保消费者在没有消息的情况下也能保持活跃并更新其状态。
                // 注意：在更复杂的事务场景中，offset提交会与生产者事务绑定。
                if (!records.isEmpty()) {
                     consumer.commitSync(); // 单独消费者，处理后提交
                     System.out.println("事务消费者 Offset已提交！");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            consumer.close();
        }
    }
}
```

### 图示描述：事务型生产者消息发送流程

- **生产者 (Transactional Producer)** -> `initTransactions()` -> **Kafka Transaction Coordinator**
- **生产者** -> `beginTransaction()`
- **生产者** -> `send(Message1)` -> **Broker (Partition A)** (消息暂不可见)
- **生产者** -> `send(Message2)` -> **Broker (Partition B)** (消息暂不可见)
- **生产者** -> `sendOffsetsToTransaction()` (如果消费者参与) -> **Kafka Transaction Coordinator**
- **生产者** -> `commitTransaction()`
- **Kafka Transaction Coordinator** -> 向 **Broker (Partition A, Partition B)** 发送 COMMIT 标记
- **Broker (Partition A, Partition B)** -> 标记消息为已提交
- **消费者 (read_committed)** -> 从 **Broker** 拉取消息，过滤掉未提交的，只看到已提交的 Message1, Message2。

## 6. 总结

Kafka通过以下核心机制共同协作，提供了强大的消息可靠性保障：

- **生产者端**：

- `acks` 配置：控制消息的持久化级别。
- `retries` 配置：处理瞬时故障。
- 幂等生产者 (`enable.idempotence=true`)：确保单分区内重试不重复。
- 事务型生产者 (`transactional.id`)：实现跨多个分区/主题的原子操作，是端到端Exactly-Once的基础。

- **Broker端**：

- 副本机制 (`replication.factor`)：数据冗余，高可用。
- ISR (In-Sync Replicas)：保证数据同步的副本集合。
- Leader选举：故障恢复。
- 消息持久化 (异步刷盘)：确保数据不丢失。

- **消费者端**：

- Offset管理 (手动提交)：控制消费进度，实现At-least-once语义。
- 消费组机制：负载均衡和高可用，避免重复消费。
- `isolation.level=read_committed`：配合事务型生产者实现端到端Exactly-Once语义，只读取已提交的消息。

在实际应用中，我们需要根据业务对可靠性和性能的要求，权衡选择合适的配置。对于大多数核心业务场景，推荐使用 `acks=all`、开启幂等性、手动提交Offset，并在需要时采用事务机制，以实现最高的可靠性。
