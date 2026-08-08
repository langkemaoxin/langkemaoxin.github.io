---
title: "SpringBoot 整合 RocketMQ 与客户端注意点"
sidebarGroup: "RocketMQ"
shortTitle: "04 SpringBoot 与注意点"
order: 4
date: 2026-09-19
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 4/10 篇**  
> 上一篇：[《客户端消息模型》](/中间件/rocketmq/rocketmq-03-client-model) · 下一篇：[《源码环境与启动》](/中间件/rocketmq/rocketmq-05-source-setup)

---

## 开头：Spring 项目里还要手写 DefaultMQProducer 吗？

业务团队更习惯 `@Autowired RocketMQTemplate` 发消息、`@RocketMQMessageListener` 收消息。`rocketmq-spring-boot-starter` 在 Spring 生命周期里封装了原生 Client，但 **版本对齐、消息类型、幂等与死信** 仍是线上坑点。本篇覆盖集成方式、实现原理与注意事项。

---

## 一、SpringBoot 快速集成

### 1. 依赖（注意版本）

```xml
<dependency>
  <groupId>org.apache.rocketmq</groupId>
  <artifactId>rocketmq-spring-boot-starter</artifactId>
  <version>2.3.1</version>
  <exclusions>
    <exclusion>
      <groupId>org.apache.rocketmq</groupId>
      <artifactId>rocketmq-client</artifactId>
    </exclusion>
  </exclusions>
</dependency>
<dependency>
  <groupId>org.apache.rocketmq</groupId>
  <artifactId>rocketmq-client</artifactId>
  <version>5.3.0</version>
</dependency>
```

Spring Boot 3.x 需 **JDK 17+**。starter 内置 client 版本可能偏旧，建议 **排除后显式指定 5.3.0**。

### 2. 配置

```properties
rocketmq.name-server=192.168.65.112:9876
rocketmq.producer.group=springBootGroup
rocketmq.consumer.group=testGroup
server.port=9000
```

### 3. 生产者与消费者

```java
@Component
public class SpringProducer {
    @Resource
    private RocketMQTemplate rocketMQTemplate;
    public void sendMessage(String topic, String msg) {
        rocketMQTemplate.convertAndSend(topic, msg);
    }
}

@Component
@RocketMQMessageListener(
    consumerGroup = "MyConsumerGroup",
    topic = "TestTopic",
    consumeMode = ConsumeMode.CONCURRENTLY,
    messageModel = MessageModel.BROADCASTING)
public class SpringConsumer implements RocketMQListener<String> {
    @Override
    public void onMessage(String message) {
        System.out.println("Received: " + message);
    }
}
```

Spring 封装的消息类型与原生 `Message`/`MessageExt` 不同，复杂场景参考 `com.roy.rocketmq.SpringRocketTest`。

![SpringBoot 依赖与配置](/中间件/rocketmq/41/p15-01.png)

![Spring 生产者与消费者](/中间件/rocketmq/41/p15-02.png)

### 4. 其他消息类型

- 一个 `RocketMQTemplate` 对应一个 Producer/Topic 方向；多 Topic 用 `@ExtRocketMQTemplateConfiguration` 声明子类  
- 事务消息：`@RocketMQTransactionListener` + `rocketMQTemplateBeanName`  

![多类型消息与扩展 Template](/中间件/rocketmq/41/p16-01.png)

---

## 二、实现原理（读源码的入口）

### 1. RocketMQTemplate

自动配置：`org.apache.rocketmq.spring.autoconfigure.RocketMQAutoConfiguration`

### 2. Push 消费者

- `ListenerContainerConfiguration` 注册 `RocketMQMessageListenerContainerRegistrar`  
- `RocketMQMessageListenerBeanPostProcessor`（`SmartLifecycle`）在容器启动后调用 `startContainer()`  
- 每个 `@RocketMQMessageListener` → `DefaultRocketMQListenerContainer` → 内部 `DefaultMQPushConsumer`  

`initRocketMQPushConsumer()` 里设置集群/广播、顺序/并发监听（`DefaultMessageListenerOrderly` / `Concurrently`），再 `consumer.start()`。

![Listener 容器启动链路](/中间件/rocketmq/41/p24-01.png)

### 3. Pull 模式

`RocketMQAutoConfiguration` 在配置 `rocketmq.consumer.topic` 等条件下注入 `DefaultLitePullConsumer`，通过 `RocketMQTemplate.receive()` → `poll()` 拉取。

---

## 三、客户端注意事项

### 1. msgId、Key、Tag

| 字段 | 说明 |
|------|------|
| **msgId** | Broker 分配；批量/事务有特殊规则，不宜作全局业务主键 |
| **Key** | `message.setKeys()`，写入 properties，支持溯源与索引 |
| **Tag** | 过滤用，hash 写入 ConsumeQueue，**过滤性能极高** |

![msgId / Key / Tag 关系](/中间件/rocketmq/41/p25-01.png)

### 2. 最佳实践

- 一应用一 Topic，子类型用 **Tag**  
- Tag 过滤优于复杂 SQL  
- Topic 过多会增加元数据维护成本（虽不影响转发吞吐）

### 3. 幂等：at least once

RocketMQ 保证 **至少一次**，无法保证 **exactly once**。重复来源：发送超时重试、消费 ACK 前网络闪断、Rebalance。

**建议用业务 Key（订单号）做幂等**，而非单独依赖 msgId。

### 4. 重试与死信

- 重试队列：`%RETRY%<ConsumerGroup>`，默认 16 次，间隔对应延迟级别后 16 档（10s … 2h）  
- 可 `consumer.setMaxReconsumeTimes(20)`，超过 16 次后间隔均为 2h  
- 死信队列：`%DLQ%<ConsumerGroup>`，默认 **perm=2 禁读**，需改为 6 才能消费排查  
- 死信保留时间与正常消息相同（默认 3 天，`fileReservedTime`）

监控 **重试队列堆积** 是发现消费故障的有效手段。

---

## 四、本章小结

Spring 集成本质是 **在容器生命周期里托管 DefaultMQProducer / DefaultMQPushConsumer**；搞清 `DefaultRocketMQListenerContainer` 就搞清了 `@RocketMQMessageListener` 的行为。生产环境务必：**版本对齐、Tag 过滤、业务幂等、死信治理**。

下一篇进入 **服务端源码**：本地编译、NameServer/Broker 启动与 Netty RPC 框架。
