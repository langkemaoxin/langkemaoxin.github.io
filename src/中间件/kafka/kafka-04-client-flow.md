---
title: "Kafka 客户端主流程——Producer 与 Consumer"
sidebarGroup: "Kafka"
shortTitle: "04 生产消费主流程"
order: 4
date: 2026-09-08
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 4/11 篇**  
> 下一篇预告：[《Kafka 客户端机制——分区、幂等、事务与压缩》](/中间件/kafka/kafka-05-client-mechanisms)

---

## 开头：改配置之前，先记住「三步走」

企业开发几乎都用 **High Level API**（`kafka-clients`）；Low Level API 要自己管 Partition/Offset，极少使用。无论 Producer 还是 Consumer，主流程都可以收成三步：**配属性 → 组消息/订阅 → 发送或拉取 + 提交位点**。

Maven 依赖：

```xml
<dependency>
  <groupId>org.apache.kafka</groupId>
  <artifactId>kafka_2.13</artifactId>
  <version>3.8.0</version>
</dependency>
```

发送前建议提前建 Topic，例如：

```bash
bin/kafka-topics.sh --bootstrap-server worker1:9092 --create \
  --topic disTopic --partitions 3 --replication-factor 2
```

---

## 一、Producer 主流程

### 三步结构

1. **设置 Producer 属性** —— `ProducerConfig`，必选 `bootstrap.servers`。
2. **构建消息** —— `ProducerRecord`，Key-Value；Key 常用于分区，业务更关心 Value。
3. **发送** —— 单向 / 同步 / 异步三种。

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "worker1:9092,worker2:9092,worker3:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
    "org.apache.kafka.common.serialization.StringSerializer");
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
    "org.apache.kafka.common.serialization.StringSerializer");

Producer<String, String> producer = new KafkaProducer<>(props);
ProducerRecord<String, String> record =
    new ProducerRecord<>("disTopic", Integer.toString(i), "MyProducer" + i);

// 单向
producer.send(record);
// 同步
RecordMetadata meta = producer.send(record).get();
// 异步 + 回调
producer.send(record, (metadata, ex) -> { /* ... */ });

producer.close();
```

---

## 二、Consumer 主流程

### 三步结构

1. **设置 Consumer 属性** —— 必选 `bootstrap.servers`；订阅模式必选 `group.id`。
2. **拉取消息** —— Pull 模型，`poll()` 一批。
3. **处理 + 提交 Offset** —— 不提交则 Broker 认为未消费完，会重推。

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "worker1:9092,worker2:9092,worker3:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "test");
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
    "org.apache.kafka.common.serialization.StringDeserializer");
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
    "org.apache.kafka.common.serialization.StringDeserializer");

Consumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("disTopic"));

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        System.out.println("offset=" + record.offset() + ", value=" + record.value());
    }
    consumer.commitSync();   // 或 commitAsync()
}
```

---

## 三、为什么「改配置 = 学 Kafka」

客户端最大的变数在**属性**：分组、分区、缓存、acks、幂等、事务……都通过 `ProducerConfig` / `ConsumerConfig` / `CommonClientConfig` 控制，官方文档极长：[Kafka Configuration](https://kafka.apache.org/documentation/#configuration)。

下一篇按机制拆开讲这些参数背后的设计；本篇只需建立**固定三步主流程**的心智模型。

---

## 小结

| 角色 | 三步 |
|------|------|
| **Producer** | 属性 → Record → send（单向/同步/异步） |
| **Consumer** | 属性 → subscribe + poll → 业务处理 + commit Offset |

- Consumer 是 **Pull**；Offset 提交决定「消费进度」是否推进。
- 高可用、高并发细节都在配置里，下一篇逐一梳理。
