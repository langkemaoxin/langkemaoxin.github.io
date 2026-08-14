---
title: "SpringBoot 集成 Kafka"
sidebarGroup: "Kafka"
shortTitle: "06 SpringBoot 集成"
order: 6
date: 2026-09-10
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 6/11 篇**  
> 下一篇预告：[《Zookeeper 元数据与 Controller Broker 选举》](/中间件/kafka/kafka-07-zk-controller)

---

## 开头：会原生客户端，Spring 只是薄封装

Spring Boot 集成 Kafka 本质仍是创建 **Producer / Consumer**，只是把 `Properties` 换成 `application.properties` 前缀，把发送逻辑换成 `KafkaTemplate`、消费换成 `@KafkaListener`。上一篇的机制搞懂后，这里的配置项会「眼熟」很多。

---

## 一、引入依赖

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

---

## 二、application.properties 配置

![Spring 配置项与 Kafka 原生 ProducerConfig/ConsumerConfig 一一对应](/中间件/kafka/26/p16-01.png)

```properties
########### Kafka 集群 ###########
spring.kafka.bootstrap-servers=worker1:9092,worker2:9092,worker3:9092

########### Producer ###########
spring.kafka.producer.retries=0
spring.kafka.producer.acks=1
spring.kafka.producer.batch-size=16384
spring.kafka.producer.properties.linger.ms=0
spring.kafka.producer.buffer-memory=33554432
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.apache.kafka.common.serialization.StringSerializer

########### Consumer ###########
spring.kafka.consumer.properties.group.id=defaultConsumerGroup
spring.kafka.consumer.enable-auto-commit=true
spring.kafka.consumer.auto-commit-interval=1000
spring.kafka.consumer.auto-offset-reset=latest
spring.kafka.consumer.properties.session.timeout.ms=120000
spring.kafka.consumer.properties.request.timeout.ms=180000
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.apache.kafka.common.serialization.StringDeserializer
```

| Spring 属性 | 对应原生 |
|-------------|----------|
| `spring.kafka.producer.acks` | `acks` |
| `spring.kafka.producer.batch-size` | `batch.size` |
| `spring.kafka.producer.properties.linger.ms` | `linger.ms` |
| `spring.kafka.consumer.enable-auto-commit` | `enable.auto.commit` |
| `spring.kafka.consumer.auto-offset-reset` | `auto.offset.reset` |

不必背清单；需要时对照 [Spring Kafka 文档](https://docs.spring.io/spring-kafka/reference/) 与 `ProducerConfig` 常量名即可。

---

## 三、发送消息

```java
@RestController
public class KafkaProducer {
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @GetMapping("/kafka/normal/{message}")
    public void sendMessage(@PathVariable("message") String message) {
        kafkaTemplate.send("topic1", message);
    }
}
```

需要事务时，可配置 `spring.kafka.producer.transaction-id-prefix` 并使用 `@Transactional` 或 `KafkaTransactionManager`（与原生 `transactional.id` 同理）。

---

## 四、消费消息

![@KafkaListener 声明消费者，框架内部仍是 KafkaConsumer.poll](/中间件/kafka/26/p18-01.png)

```java
@Component
public class KafkaConsumer {
    @KafkaListener(topics = {"topic1"})
    public void onMessage(ConsumerRecord<?, ?> record) {
        System.out.println("topic=" + record.topic()
            + ", partition=" + record.partition()
            + ", value=" + record.value());
    }
}
```

可配置 `concurrency` 控制同 Topic 监听线程数（仍受 Partition 数量上限约束）、`groupId` 覆盖默认组等。

---

## 小结

Spring Boot 集成 Kafka = **依赖 + 属性映射 + Template/Listener**。价值在于与 Spring 事务、监控、配置中心整合；核心语义仍来自上一篇的客户端模型。下一篇转向服务端：**Zookeeper 元数据与 Controller 选举**。
