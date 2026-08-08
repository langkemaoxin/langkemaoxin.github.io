---
title: "RabbitMQ 常用消息场景——Work、Pub/Sub、Routing、Topic"
sidebarGroup: "RabbitMQ"
shortTitle: "04 七种消息场景"
order: 4
date: 2026-08-29
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 4/10 篇**  
> 上一篇：[《RabbitMQ 基础编程模型——从连接到消费》](/中间件/rabbitmq/rabbitmq-03-programming-model)  
> 下一篇预告：[《SpringBoot 集成 RabbitMQ》](/中间件/rabbitmq/rabbitmq-05-springboot)

---

## 开头：同一个 API，七种用法

RabbitMQ 客户端 API 本身不复杂，难的是把 Exchange 类型、Routing Key、Ack 策略组合到真实业务里。

官方教程（[https://www.rabbitmq.com/tutorials](https://www.rabbitmq.com/tutorials)）总结了七种典型场景。本篇覆盖其中六种常用模式（不含 RPC），并补充 **Headers** 路由。RPC 用 MQ 实现远程调用在实际项目中较少采用，此处略过。

![RabbitMQ 官方教程七种场景概览](/中间件/rabbitmq/13/p13-01.png)

---

## 一、Hello World——直连 Queue

最简单：Producer 发到指定 Queue，Consumer 从该 Queue 消费，不经 Exchange。

```java
// Producer
channel.queueDeclare(QUEUE_NAME, false, false, false, null);
channel.basicPublish("", QUEUE_NAME, null, message.getBytes("UTF-8"));

// Consumer
channel.queueDeclare(QUEUE_NAME, false, false, false, null);
channel.basicConsume(QUEUE_NAME, true, consumer);
```

`basicPublish` 第一个参数传空字符串，表示使用 **默认 Exchange**，routingKey 即为队列名。这就是第二篇控制台的 Demo。

![Hello World 模式：Producer 直连 Queue](/中间件/rabbitmq/13/p14-02.png)

---

## 二、Work Queues——工作队列

**场景**：一个任务队列，多个 Worker 竞争消费，每条消息只被一个 Worker 处理。

![Work Queues：多 Consumer 竞争同一 Queue](/中间件/rabbitmq/13/p14-03.png)

```java
// Producer
channel.queueDeclare(TASK_QUEUE_NAME, true, false, false, null);
channel.basicPublish("", TASK_QUEUE_NAME,
    MessageProperties.PERSISTENT_TEXT_PLAIN, message.getBytes("UTF-8"));

// Consumer
channel.queueDeclare(TASK_QUEUE_NAME, true, false, false, null);
channel.basicQos(1);  // prefetchCount
channel.basicConsume(TASK_QUEUE_NAME, false, consumer);
```

### 2.1 三个易错点

**① 必须 Ack**

Consumer 消费完须 `basicAck`（或设 `autoAck=true`）。未 Ack 时 Broker 会反复投递，形成 **Poison Message（毒消息）**，持续消耗资源。

**② 持久化不等于绝对不丢**

Queue 和消息都设 `durable` / `PERSISTENT` 时，消息先写入 **PageCache**，再按操作系统策略刷盘。异常断电仍可能丢未刷盘数据。RocketMQ 对此有专门设计；RabbitMQ 侧需配合 **Publisher Confirms**（下文）。

**③ 多 Consumer 分发策略**

默认 **fair dispatch / round-robin**：轮询分发，不考虑各 Worker 处理能力。

改进：`channel.basicQos(prefetchCount)` 限制未 Ack 消息数，Broker 超过 prefetch 则不再向该 Consumer 投递。但若所有 Consumer 都达到上限，消息会积压在服务端——需监控队列深度，扩容或加 Worker。

> If all the workers are busy, your queue can fill up. You will want to keep an eye on that, and maybe add more workers, or have some other strategy.

---

## 三、Publish / Subscribe——扇出广播

**场景**：一条消息广播给多个订阅者，各订阅者独立 Queue。

使用 **fanout** Exchange：忽略 routingKey，转发到所有绑定 Queue。

![Fanout：一条消息复制到多个 Queue](/中间件/rabbitmq/13/p16-01.png)

```java
// Producer
channel.exchangeDeclare(EXCHANGE_NAME, "fanout");
channel.basicPublish(EXCHANGE_NAME, "", null, message.getBytes("UTF-8"));

// Binding（每个 Consumer 各自声明临时 Queue 并绑定）
channel.exchangeDeclare(EXCHANGE_NAME, "fanout");
String queueName = channel.queueDeclare().getQueue();  // 服务端生成队列名
channel.queueBind(queueName, EXCHANGE_NAME, "");
```

Producer 只关心 Exchange；具体进哪些 Queue 由 Binding 决定，实现进一步解耦。

---

## 四、Routing——精确路由

**场景**：按消息类别投递到不同 Queue，如 `error` 日志进告警队列，`info` 进归档队列。

使用 **direct** Exchange：routingKey **完全匹配** Binding Key。

![Direct Exchange 按 routingKey 精确路由](/中间件/rabbitmq/13/p17-01.png)

```java
// Producer
channel.exchangeDeclare(EXCHANGE_NAME, "direct");
channel.basicPublish(EXCHANGE_NAME, routingKey, null, message.getBytes("UTF-8"));

// Binding
channel.queueBind(queueName, EXCHANGE_NAME, routingKey1);
channel.queueBind(queueName, EXCHANGE_NAME, routingKey2);
```

---

## 五、Topics——主题模糊匹配

**场景**：日志系统按级别与模块订阅，如 `*.error` 收所有 error，`order.#` 收 order 下所有子 topic。

使用 **topic** Exchange：routingKey 为点分单词，Binding 支持通配符：

| 符号 | 含义 |
|------|------|
| `*` | 匹配恰好一个单词 |
| `#` | 匹配零个或多个单词 |

![Topic Exchange 通配符匹配示意](/中间件/rabbitmq/13/p18-01.png)

```java
channel.exchangeDeclare(EXCHANGE_NAME, "topic");
channel.basicPublish(EXCHANGE_NAME, "order.payment.success", null, message.getBytes("UTF-8"));
channel.queueBind(queueName, EXCHANGE_NAME, "order.*");
channel.queueBind(queueName, EXCHANGE_NAME, "*.error");
```

---

## 六、Publisher Confirms——发送端确认

RabbitMQ 传统机制保证消息到 Broker 后可投递给消费者，但 `basicPublish` **无返回值**，Producer 不知道发送是否成功。

开启确认模式：

```java
channel.confirmSelect();
```

### 6.1 三种策略

**单条同步确认**

```java
for (int i = 0; i < MESSAGE_COUNT; i++) {
    channel.basicPublish("", queue, null, body.getBytes());
    channel.waitForConfirmsOrDie(5_000);
}
```

`waitForConfirmsOrDie` 阻塞 Channel 直至 Broker 确认或超时抛异常。吞吐最低，最安全感知单条。

**批量确认**

```java
int batchSize = 100;
int outstanding = 0;
for (int i = 0; i < MESSAGE_COUNT; i++) {
    ch.basicPublish("", queue, null, body.getBytes());
    if (++outstanding == batchSize) {
        ch.waitForConfirmsOrDie(5_000);
        outstanding = 0;
    }
}
if (outstanding > 0) ch.waitForConfirmsOrDie(5_000);
```

一批出问题时无法定位具体哪条，需配合序列号或异步回调。

**异步确认（推荐）**

```java
channel.addConfirmListener(
    (sequenceNumber, multiple) -> { /* ack */ },
    (sequenceNumber, multiple) -> { /* nack */ }
);
int seq = channel.getNextPublishSeqNo();
channel.basicPublish(...);
// 应用自行维护 seq 与消息体的映射
```

| 参数 | 含义 |
|------|------|
| `sequenceNumber` | 全局递增发布序号 |
| `multiple` | `true` 表示确认 seq 及之前所有消息 |

异步确认吞吐最好。还可加 **ReturnListener** 监控「已到 Exchange 但无法路由到 Queue」的消息；配合 Exchange 的 **`alternate-exchange`** 做兜底转发。

---

## 七、Headers——头部路由

direct / fanout / topic 都依赖 **routingKey 字符串**。Headers Exchange 忽略 routingKey，用 **消息 Headers 键值对** 与 Binding Headers 匹配。

匹配模式由 Binding 中 `x-match` 决定：

| x-match | 规则 |
|---------|------|
| `all` | 所有键值对都匹配 |
| `any` | 任一匹配即可 |

Consumer 绑定：

```java
Map<String, Object> headers = new HashMap<>();
headers.put("x-match", "any");
headers.put("loglevel", "info");
headers.put("buslevel", "product");
headers.put("syslevel", "admin");

channel.exchangeDeclare(EXCHANGE_NAME, BuiltinExchangeType.HEADERS);
String queueName = channel.queueDeclare("ReceiverHeader", true, false, false, null).getQueue();
channel.queueBind(queueName, EXCHANGE_NAME, routingKey, headers);
```

Producer 发送：

```java
Map<String, Object> headers = new HashMap<>();
headers.put("loglevel", "error");
headers.put("buslevel", "product");
headers.put("syslevel", "admin");

AMQP.BasicProperties.Builder builder = new AMQP.BasicProperties.Builder();
builder.deliveryMode(MessageProperties.PERSISTENT_TEXT_PLAIN.getDeliveryMode());
builder.headers(headers);
channel.basicPublish(EXCHANGE_NAME, routingKey, builder.build(), message.getBytes("UTF-8"));
```

Headers 模式性能较低，官方不建议大规模使用，但在多维度标签路由的特殊场景很实用。管理控制台预置 `amq.headers` 即此类型。

---

## 场景选型速查

| 场景 | Exchange 类型 | 典型用途 |
|------|---------------|----------|
| Hello World | 默认（direct to queue） | 入门、单队列 |
| Work Queue | 默认或 direct | 任务分发、削峰 |
| Pub/Sub | fanout | 广播通知 |
| Routing | direct | 按类型精确路由 |
| Topics | topic | 多级主题订阅 |
| Confirms | 任意 | 发送可靠性 |
| Headers | headers | 多维度 Header 匹配 |

---

## 小结

七种模式本质都是 **Exchange 类型 + Binding 规则 + Ack 策略** 的组合。Work Queue 注意 Ack 与 prefetch；可靠性链路需 Publisher Confirms；无法路由的消息用 alternate-exchange 兜底。

下一篇看 Spring Boot 如何把这套模型封装成 `RabbitTemplate` 与 `@RabbitListener`。
