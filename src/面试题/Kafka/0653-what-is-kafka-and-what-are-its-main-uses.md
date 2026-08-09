---
title: "什么是Kafka？有什么主要用途？"
sidebarGroup: "Kafka"
shortTitle: "什么是Kafka？有什么主要用途？"
order: 653
date: 2026-03-20
category: "面试题"
tag:
  - "面试题"
description: "1) 什么是 Kafka？Kafka 是一个分布式的高吞吐、可扩展的日志系统和流处理平台。核心不是一个简单的消息队列，而是一个持久化的、可分区的提交日志（commit log），并提供对日志的高吞吐、可并行消费和流式处理能力。主要角色：主题"
article: false
---

> 来源：[什么是Kafka？有什么主要用途？](https://www.yuque.com/tulingzhouyu/db22bv/eoew281vevvklpuv)

# 1) 什么是 Kafka？

- Kafka 是一个分布式的高吞吐、可扩展的日志系统和流处理平台。核心不是一个简单的消息队列，而是一个持久化的、可分区的提交日志（commit log），并提供对日志的高吞吐、可并行消费和流式处理能力。
- 主要角色：

- 主题（Topic）：消息的类别/通道。一个主题可以分为若干分区（Partition）。
- 分区（Partition）：Kafka 的并行度单位。每个分区中的消息有序且只在该分区内有序。分区跨 Broker 分布，提供水平扩展能力。
- Broker：Kafka 服务器实例。一个集群由多个 Broker 组成，负责存储分区日志、处理生产者/消费者请求。
- 生产者（Producer）：向一个或多个 Topic 的分区写入消息。
- 消费者（Consumer）：从 Topic 的分区读取消息。消费者可以组（Consumer Group）来实现并行消费。
- Offset：每条消息在分区中的序号，用来定位和提交消费进度。

- 发展路线：早期依赖 Zookeeper 管理元数据，现今版本逐步支持 KRaft（Kafka 自己的共识层，未来趋向独立于 Zookeeper），提升简化和稳定性。

核心特性包括高吞吐、水平扩展、可持久化、可恰当的“再平衡”以实现并行消费，以及强大的生态系统（Kafka Streams、Connect、Schema Registry、ksqldb 等）。

---

## 2) Kafka 的核心概念（与 Java 开发者直接相关）

- 主题与分区

- 一个 Topic 可以有一个或多个分区。
- 写入会根据分区策略落到不同分区（简单轮询、分区器自定义等）。
- 消费端的并行度由分区数量决定：一个 Consumer Group 中的消费者数量不能超过分区数量。

- 偏移量（Offset）

- 记录了每条消息在对应分区中的位置。
- consumer 可以选择自动提交偏移量（enable.auto.commit=true）或手动提交，以实现更严格的消费语义。

- 持久性与副本

- 分区的日志被持久化到磁盘，Broker 之间可以复制（副本）以提高可靠性和容错性。

- Exactly-Once（端到端的“恰好一次”语义）

- 通过自带的幂等性生产者（idempotent producer）和事务（transactions）来实现。
- 适用于事件源、金融事件等对重复性敏感的场景。

- Kafka Streams 与 Kafka Connect

- Kafka Streams：在 Java 应用中对 Kafka 的流处理 API，便于实现聚合、转换、窗口化等。
- Kafka Connect：现成的连接器生态，便于与数据库、日志系统、文件等外部系统对接。

---

## 3) Kafka 的典型用途（Java 场景优先）

- 实时日志与事件聚合：将应用日志、事件、指标等流式写入 Kafka，后续进行实时分析或存储到数据仓库。
- 数据集成（CDC）和缓存更新：通过 Debezium、Confluent Replicator 等，将数据库变更流同步到各个目标系统（另一个 Kafka、Elasticsearch、HDFS、BigQuery 等）。
- 事件驱动架构（EDA）：服务通过 Kafka 发布事件，其他服务订阅并消费事件实现解耦、弹性扩展。
- 实时分析与流处理：使用 Kafka Streams 或 ksqlDB 对数据流进行聚合、过滤、连接等操作，输出到新的主题。
- 指标与度量管线：将系统与应用指标写入 Kafka，形成统一的观测管线，便于后续分析与告警。
- 日志聚合与持续存档：将分布在多服务的日志集中到一个或多个主题，方便检索与归档。

---

## 4) 使用前的快速架构感知（高层图解）

- 生产者把消息写入指定 Topic 的分区中，通常分区数量确定了并行写入和读取的潜在并行度。
- broker 组成 Kafka 集群，负责存储日志、管理偏移量、提供查询接口。
- 消费者组中的每个消费者负责消费某些分区的消息，组内消费者之间通过分区来实现负载均衡。
- 你还可以引入 Kafka Connect 进行无代码的数据接入或导出，使用 Kafka Streams 做实时处理，使用 ksqlDB 做 SQL 风格的流处理。

嵌入式示意图（SVG，见下方）将帮助你快速把握架构要点。

---

## 5) 简易 Java 示例（生产者、消费者、事务、Streams）

以下示例聚焦最常见的场景，均为最小可运行版本，建议在本地或集群环境中逐步尝试。

注：请将下面的 Java 代码放入各自的文件中，并在 Pom.xml/Gradle 中引入 Kafka 客户端依赖，例如 org.apache.kafka:kafka-clients:3.x.x。

1. 生产者（简单发送）

```java
// SimpleProducer.java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class SimpleProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        try (Producer<String, String> producer = new KafkaProducer<>(props)) {
            for (int i = 0; i < 10; i++) {
                String key = "k" + i;
                String value = "message-" + i;
                ProducerRecord<String, String> record = new ProducerRecord<>("my-topic", key, value);
                producer.send(record, (metadata, exception) -> {
                    if (exception != null) {
                        exception.printStackTrace();
                    } else {
                        System.out.printf("Sent offset=%d to partition=%d%n",
                                metadata.offset(), metadata.partition());
                    }
                });
            }
            producer.flush();
        }
    }
}
```

1. 消费者（简单轮询式消费）

```java
// SimpleConsumer.java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class SimpleConsumer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "demo-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(Collections.singletonList("my-topic"));
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
                for (ConsumerRecord<String, String> rec : records) {
                    System.out.printf("partition=%d, offset=%d, key=%s, value=%s%n",
                            rec.partition(), rec.offset(), rec.key(), rec.value());
                }
            }
        }
    }
}
```

1. Exactly-Once 与事务（幂等性生产+事务提交）

```java
// TransactionalProducer.java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class TransactionalProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // 幂等性与事务
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true");
        props.put(ProducerConfig.TRANSACTIONS_CONFIG, "true");
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "txn-id-1");

        try (Producer<String, String> producer = new KafkaProducer<>(props)) {
            producer.initTransactions();
            try {
                producer.beginTransaction();
                producer.send(new ProducerRecord<>("my-topic", "k1", "v1"));
                producer.send(new ProducerRecord<>("my-topic", "k2", "v2"));
                // 可追加更多写入
                producer.commitTransaction();
            } catch (Exception e) {
                producer.abortTransaction();
            }
        }
    }
}
```

1. Kafka Streams（最小 WordCount 示例）

```java
// Build with: org.apache.kafka:kafka-streams:3.x.x
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.*;

import java.util.Properties;

public class WordCountApp {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "wordcount-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        StreamsBuilder builder = new StreamsBuilder();
        KStream<String, String> text = builder.stream("input-topic");
        KTable<String, Long> counts = text
                .flatMapValues(value -> java.util.Arrays.asList(value.toLowerCase().split("\\W+")))
                .groupBy((key, word) -> word)
                .count();

        counts.toStream().to("counts-topic", Produced.with(Serdes.String(), Serdes.Long()));

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();

        // 生产者/消费者退出时，优雅关闭
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

> 注：以上代码仅为演示用途，实际生产请考虑错误处理、幂等性、幂等分区、序列化/反序列化的安全性、幂等性幂等性等更完整的设计。

---

## 6) 基本部署与运行要点（简要）

- 集群搭建

- 本地开发：单机启动一个 Broker 即可测试，但生产环境通常 3 个以上 Broker 以实现容错和数据副本。
- 副本因子（replication factor）建议至少与集群规模成比，常见为 3。
- 主题分区数要基于并发处理需求设定（生产者/消费者数量对性能的影响）。

- 安全性

- 开放端口前建议放在私有网络，启用 TLS、SASL/SCRAM、ACL 权限控制。

- 监控与运维

- 指标：吞吐量（RecordsPerSec）、延迟、未处理偏移量、日志大小、ISR 健康状态等。
- 日志与指标可以通过 JMX、Prometheus、Grafana 等方式观测。

- 数据管理

- 日志轮转（Segments）、保留策略（retention.ms、retention.bytes）以及日志压缩/清理（log.cleanup.policy=compact 或 log.retention.*）。

- 架构演进

- 关注 Zookeeper 依赖的渐进淘汰与 KRaft 的落地（Kafka 版本 2.x/3.x 的演进路线）。

---

## 7) 实践建议与常见陷阱

- 设计阶段

- 先确定并行度：分区数量决定了并行吞吐，过少会成为瓶颈，过多又可能导致管理复杂性增加。
- 统一的序列化格式：推荐使用 Avro/Protobuf + Schema Registry，便于向后兼容性和结构化数据管理。

- 开发阶段

- 建议使用幂等性生产者和事务来避免重复消息。
- 注意正确处理偏移提交：自动提交简单，但往往不适合严格“至少一次/恰好一次”语义场景。

- 生产阶段

- 监控往往是最容易被忽视的一环；确保不仅看到吞吐量，还能看到延迟、滞后、日志增长和错误率。

- 设计演进

- 当需要丰富的连接器或流处理能力时，考虑使用 Kafka Connect、Kafka Streams、ksqlDB 等组件的组合来实现端到端的数据管线。

---

## 8) 结语

Kafka 作为“持续可变的日志”和“实时数据流平台”的组合体，为现代分布式系统提供了强大的解耦、伸缩和实时处理能力。对 Java 开发者而言，掌握生产者/消费者模型、理解分区与偏移、熟悉幂等性与事务，以及会使用 Streams/Connect 等生态工具，是进入高性能数据驱动场景的关键。

如果你愿意，我可以把这份笔记扩展成一个可下载的演示文件（如 Markdown → Word/PDF、或幻灯片）。也可以按你的业务场景，给出更贴近你项目的示例，如与 Debezium 的 CDC 集成、Kafka Streams 的窗口聚合、或 ksqlDB 的 SQL 流处理。
