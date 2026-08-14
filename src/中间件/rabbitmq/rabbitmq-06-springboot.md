---
title: "SpringBoot 集成 RabbitMQ"
sidebarGroup: "RabbitMQ"
shortTitle: "06 SpringBoot 集成"
order: 6
date: 2026-08-30
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 6/22 篇**  
> 上一篇：[《RabbitMQ 常用消息场景——Work、Pub/Sub、Routing、Topic》](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)  
> 下一篇预告：[《Classic、Quorum、Stream——如何选择队列类型》](/中间件/rabbitmq/rabbitmq-07-queue-types)

---

## 开头：原生 API 会了，Spring 里怎么写

手写 `ConnectionFactory`、`channel.basicPublish` 适合理解原理，日常 Spring 项目更常用 **Spring AMQP** 封装：配置进 `application.yml`，发送用 `RabbitTemplate`，监听用 `@RabbitListener`。

需要注意的是：Spring 的 Message、Exchange、Queue 等对象与 RabbitMQ 原生组件 **一一对应但做了抽象转换**。只有理解原生 API，才能在 Spring 里避开声明冲突、Ack 模式、Stream 消费等坑。

---

## 一、引入依赖

> 📦 **配套示例项目**：本篇代码可在 GitHub 运行 → [rabbitmq-blog-demo](https://github.com/code-corey/rabbitmq-blog-demo) 的 `ch05-springboot` 模块

Spring Boot 官方集成，核心依赖一个：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

**版本要对齐**：不同 Spring Boot 版本配置项与行为可能有差异，以当前项目 BOM 为准。

---

## 二、配置关键参数

所有配置以 `spring.rabbitmq` 为前缀，写入 `application.yml` 或 `application.properties`：

```yaml
spring:
  rabbitmq:
    host: 192.168.65.112
    port: 5672
    username: admin
    password: admin
    virtual-host: /mirror
    # 生产者确认（可选）
    publisher-confirm-type: correlated
    publisher-returns: true
    template:
      mandatory: true
```

字段说明见源码 **`RabbitProperties`**。更完整文档：[https://github.com/spring-projects/spring-amqp](https://github.com/spring-projects/spring-amqp)

| 配置项 | 作用 |
|--------|------|
| `host` / `port` | Broker 地址 |
| `virtual-host` | 虚拟主机 |
| `publisher-confirm-type` | 发送确认（none / simple / correlated） |
| `publisher-returns` | 不可路由消息回调 |
| `template.mandatory` | 不可路由时触发 return 回调 |

---

## 三、声明 Exchange、Queue、Binding

Spring 中通过 **Bean 声明** 业务对象，启动时自动在 Broker 创建（也可配置为仅绑定已有资源）。

```java
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "demo.exchange";
    public static final String QUEUE = "demo.queue";
    public static final String ROUTING_KEY = "demo.key";

    @Bean
    public DirectExchange demoExchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue demoQueue() {
        return QueueBuilder.durable(QUEUE).build();
    }

    @Bean
    public Binding demoBinding(Queue demoQueue, DirectExchange demoExchange) {
        return BindingBuilder.bind(demoQueue).to(demoExchange).with(ROUTING_KEY);
    }
}
```

Quorum 队列示例：

```java
@Bean
public Queue quorumQueue() {
    return QueueBuilder.durable("quorum.queue")
        .withArgument("x-queue-type", "quorum")
        .build();
}
```

详细属性声明参见 spring-amqp 官方示例与 `QueueBuilder` / `ExchangeBuilder` API。

---

## 四、发送消息：RabbitTemplate

启动后容器自动注入 **`RabbitTemplate`**，封装了 Channel 操作：

```java
@Service
public class DemoProducer {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void send(String message) {
        rabbitTemplate.convertAndSend(
            RabbitConfig.EXCHANGE,
            RabbitConfig.ROUTING_KEY,
            message
        );
    }
}
```

配置 `publisher-confirm-type` 后，可注册回调：

```java
@PostConstruct
public void init() {
    rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
        if (!ack) {
            log.error("消息未确认: {}", cause);
        }
    });
    rabbitTemplate.setReturnsCallback(returned -> {
        log.warn("消息不可路由: {}", returned.getMessage());
    });
}
```

Spring 的 **`CorrelationData`** 可携带业务 id，对应原生 API 里 `getNextPublishSeqNo()` 与消息体的映射。

---

## 五、消费消息：@RabbitListener

```java
@Component
public class DemoConsumer {

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onMessage(String payload, Channel channel,
                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        System.out.println("收到: " + payload);
        channel.basicAck(deliveryTag, false);
    }
}
```

`@RabbitListener` 支持大量定制属性：

| 属性 | 说明 |
|------|------|
| `queues` / `bindings` | 监听的队列或绑定 |
| `ackMode` | 确认模式（默认 AUTO） |
| `concurrency` | 消费者并发数 |
| `prefetch` | 对应 basicQos |

默认 `ackMode` 为自动 Ack，生产环境处理失败场景时建议改为 **MANUAL** 并显式 Ack/Nack。

方法参数可注入：

- 消息体（自动反序列化）
- `Channel`（手动 Ack、Stream offset 等）
- `@Header` 取 deliveryTag、routingKey 等

---

## 六、Spring 模型与原生 API 对照

| Spring 概念 | RabbitMQ 原生 |
|-------------|---------------|
| `RabbitTemplate` | Channel + basicPublish |
| `org.springframework.amqp.core.Message` | AMQP BasicProperties + body |
| `@RabbitListener` | basicConsume + Consumer |
| `DirectExchange` / `Queue` / `Binding` | exchangeDeclare / queueDeclare / queueBind |
| `RabbitProperties` | ConnectionFactory 参数 |

Spring 简化了开发，但以下场景仍需回归原生 API 或扩展 Spring：

- **Stream 队列**：须传 `x-stream-offset`，当前 `@RabbitListener` 无法直接消费 Stream
- **Publisher Confirms 精细控制**：异步 confirm 与 seq 映射（原生 API 的 `ConcurrentSkipListMap` 实现见 [第 05 篇 · Publisher Confirms](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)，Spring 侧用 `CorrelationData` 封装）
- **alternate-exchange、死信**：arguments 在 Bean 声明中配置

---

## 七、与前面章节的衔接

| 原生模式 | Spring 实现要点 |
|----------|-----------------|
| Work Queue | `@RabbitListener` + `prefetch` + 手动 Ack |
| Fanout / Direct / Topic | 声明对应 Exchange 类型 + Binding |
| Publisher Confirms | `publisher-confirm-type: correlated` |
| Headers | `HeadersExchange` + Binding headers |

面试常问的「如何保证消息不丢失」，在 RabbitMQ 侧需串联：**Producer Confirms → 持久化 Queue + 持久化消息 → Consumer 手动 Ack → 镜像/Quorum 集群**。Spring 只是把每层封装成配置与注解，原理不变。

---

## 小结

- 依赖 `spring-boot-starter-amqp`，配置 `spring.rabbitmq.*`
- Bean 声明 Exchange / Queue / Binding，启动自动创建
- 发送 `RabbitTemplate`，消费 `@RabbitListener`
- 深入理解仍需对照原生 AMQP API

下一篇进入高级特性：Classic、Quorum、Stream 三种队列类型如何选型与声明。
