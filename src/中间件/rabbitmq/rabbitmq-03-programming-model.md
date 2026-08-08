---
title: "RabbitMQ 基础编程模型——从连接到消费"
sidebarGroup: "RabbitMQ"
shortTitle: "03 基础编程模型"
order: 3
date: 2026-08-28
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 3/10 篇**  
> 上一篇：[《RabbitMQ 安装与核心概念——Queue、Exchange、Channel》](/中间件/rabbitmq/rabbitmq-02-install-concepts)  
> 下一篇预告：[《RabbitMQ 常用消息场景——Work、Pub/Sub、Routing、Topic》](/中间件/rabbitmq/rabbitmq-04-messaging-patterns)

---

## 开头：控制台会点了，代码怎么写

上一篇用 Web 控制台完成了 Queue、Exchange 的创建与绑定。实际项目里，这些声明和消费逻辑都在 Java 客户端完成。

RabbitMQ 支持多种语言客户端，本篇以 Java 的 **amqp-client** 为主线，把「连接 → 声明 → 绑定 → 发送 → 消费 → 关闭」七步编程模型讲透，并补充 Quorum / Stream 队列声明、消息属性与回调扩展点。

---

## 一、回顾核心组件

![RabbitMQ 核心组件关系](/中间件/rabbitmq/13/p03-01.png)

Producer 经 Connection / Channel 把消息发到 Exchange，Exchange 按 Binding 规则路由到 Queue，Consumer 从 Queue 取消息并 Ack。这是后续所有业务场景的基础。

---

## 二、Maven 依赖

```xml
<dependency>
    <groupId>com.rabbitmq</groupId>
    <artifactId>amqp-client</artifactId>
    <version>5.21.0</version>
</dependency>
```

**AMQP** 是标准消息协议，RabbitMQ 是其具体实现。客户端版本通常不必与服务端完全一致，但大版本差异过大时建议对齐。

---

## 三、七步编程模型

### Step 1：创建 Connection，获取 Channel

```java
ConnectionFactory factory = new ConnectionFactory();
factory.setHost(HOST_NAME);
factory.setPort(HOST_PORT);
factory.setUsername(USER_NAME);
factory.setPassword(PASSWORD);
factory.setVirtualHost(VIRTUAL_HOST);

Connection connection = factory.newConnection();
Channel channel = connection.createChannel();
```

一般一个应用复用一个 Channel 即可。若需多个 Channel，可通过 `createChannel(int channelNumber)` 指定编号；若该编号已有 Channel 且未关闭，会返回 `null`，需注意冲突。

### Step 2：声明 Exchange

```java
channel.exchangeDeclare(String exchange, String type,
    boolean durable, boolean autoDelete, Map<String, Object> arguments);
```

| 参数 | 含义 |
|------|------|
| `exchange` | 交换机名称 |
| `type` | 类型：direct、fanout、topic、headers 等 |
| `durable` | 是否持久化（重启后仍存在） |
| `autoDelete` | 无绑定时是否自动删除 |
| `arguments` | 扩展参数（如 `alternate-exchange`） |

Broker 上不存在则自动创建；已存在则参数必须完全一致，否则报错。参数以管理控制台为准，不同版本可能有差异。

Exchange 有四种主要类型，对应不同路由逻辑，下文消息场景篇详述。

### Step 3：声明 Queue

```java
channel.queueDeclare(String queue, boolean durable, boolean exclusive,
    boolean autoDelete, Map<String, Object> arguments);
```

| 参数 | 含义 |
|------|------|
| `durable` | 持久化队列 |
| `exclusive` | 独占（仅当前 Connection 可用，断开即删） |
| `autoDelete` | 无消费者时自动删除 |

![Queue 声明参数与控制台对应关系](/中间件/rabbitmq/13/p05-01.png)

**Durability**：`Durable` 写磁盘，重启不丢；`Transient` 仅内存，读写更快但重启丢失。

控制台有 **Type** 字段（Classic / Quorum / Stream），API 默认声明 Classic。其他类型通过 `arguments` 指定：

**Quorum 队列：**

```java
Map<String, Object> params = new HashMap<>();
params.put("x-queue-type", "quorum");
channel.queueDeclare(QUEUE_NAME, true, false, false, params);
// durable 必须为 true，exclusive 必须为 false
```

**Stream 队列：**

```java
Map<String, Object> params = new HashMap<>();
params.put("x-queue-type", "stream");
params.put("x-max-length-bytes", 20_000_000_000L);       // 最大 20 GB
params.put("x-stream-max-segment-size-bytes", 100_000_000); // 分段 100 MB
channel.queueDeclare(QUEUE_NAME, true, false, false, params);
```

![Quorum 与 Stream 队列声明参数](/中间件/rabbitmq/13/p06-01.png)

Stream 队列不能像 Classic 那样在控制台随便发消息就能被普通 Consumer 收到，消费时需指定 offset，后续队列类型篇详述。

### Step 4：声明 Binding

```java
channel.queueBind(String queue, String exchange, String routingKey);
```

Binding 告诉 Exchange 消息该转发到哪些 Queue。Broker 上不存在则创建；已存在须一致。还可传入 `props` 等参数（Headers 路由等场景）。

### Step 5：Producer 发送消息

```java
channel.basicPublish(String exchange, String routingKey,
    BasicProperties props, message.getBytes("UTF-8"));
```

- `exchange` 不需要时可传空字符串 `""`（直接发到 Queue）
- `routingKey` 与 Exchange 类型相关
- 发到不存在的 Exchange 会触发 channel 级异常并关闭 Channel

![消息 Properties 与 Headers 配置项](/中间件/rabbitmq/13/p08-01.png)

用 Builder 构建属性：

```java
AMQP.BasicProperties.Builder builder = new AMQP.BasicProperties.Builder();
builder.deliveryMode(MessageProperties.PERSISTENT_TEXT_PLAIN.getDeliveryMode());
builder.priority(MessageProperties.PERSISTENT_TEXT_PLAIN.getPriority());
// builder.headers(headers);
AMQP.BasicProperties prop = builder.build();
```

**持久化**：消息是否落盘取决于 **消息 deliveryMode** 与 **Queue durable** 两者。生产环境通常都设为持久化。

### Step 6：Consumer 消费消息

两种模式：

| 模式 | API | 特点 |
|------|-----|------|
| **Push（推）** | `channel.basicConsume(queue, autoAck, callback)` | 服务端推送，实时性好，推荐 |
| **Pull（拉）** | `channel.basicGet(queue, autoAck)` | 客户端主动拉取 |

`autoAck`：`true` 表示投递即确认；`false` 需手动 `basicAck`，未 Ack 会重复投递（毒消息风险）。

消费后手动确认：

```java
channel.basicAck(deliveryTag, false);
```

### Step 7：关闭连接

```java
channel.close();
connection.close();
```

不主动关闭时 Broker Eventually 也会回收，但会额外占用资源。

---

## 四、消息监听与回调扩展

`basicConsume` 还有重载版本，支持多个回调：

```java
channel.basicConsume(queue,
    new DeliverCallback() { /* 收到消息 */ },
    new CancelCallback() { /* 队列被删等取消 */ },
    new ConsumerShutdownSignalCallback() { /* 消费者 shutdown */ }
);
```

完整示例（含 alternate-exchange）：

```java
Map<String, Object> params = new HashMap<>();
params.put("alternate-exchange", ALTER_EXCHANGE_NAME);
channel.exchangeDeclare(EXCHANGE_NAME, BuiltinExchangeType.DIRECT, true, false, params);
channel.exchangeDeclare(ALTER_EXCHANGE_NAME, BuiltinExchangeType.DIRECT, true, false, null);
channel.queueDeclare(QUEUE_NAME, true, false, false, null);
channel.queueBind(QUEUE_NAME, EXCHANGE_NAME, "key1");

channel.basicConsume(QUEUE_NAME,
    (consumerTag, message) -> {
        long deliveryTag = message.getEnvelope().getDeliveryTag();
        String correlationId = message.getProperties().getCorrelationId();
        System.out.println("received: " + new String(message.getBody())
            + "; deliveryTag: " + deliveryTag
            + "; correlationId: " + correlationId);
        channel.basicAck(deliveryTag, false);
    },
    consumerTag -> System.out.println("canceled: " + consumerTag),
    (consumerTag, sig) -> System.out.println("shutdown: " + consumerTag)
);
```

连续发送多条消息，输出类似：

```
received message ... deliveryTag: 1
received message ... deliveryTag: 2
...
```

- **consumerTag**：Consumer 会话标识（服务端分配）
- **deliveryTag**：当前 Channel 上消息序号（服务端分配）

做消息溯源时，可用 `consumerTag + deliveryTag` 作为业务侧追踪编号。

---

## 小结

| 步骤 | 关键 API |
|------|----------|
| 连接 | `ConnectionFactory` → `newConnection()` → `createChannel()` |
| 声明 | `exchangeDeclare` / `queueDeclare` / `queueBind` |
| 发送 | `basicPublish` |
| 消费 | `basicConsume`（Push）或 `basicGet`（Pull） |
| 确认 | `basicAck` / `basicReject` / `basicNack` |
| 释放 | `channel.close()` / `connection.close()` |

七种业务场景（Work Queue、Pub/Sub、Routing、Topic 等）都是在这七步之上换 Exchange 类型和 Binding 规则。下一篇逐一拆解。
