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

> **RabbitMQ 系列 · 第 3/22 篇**  
> 上一篇：[《RabbitMQ 安装部署——Docker 快速上手与数据持久化》](/中间件/rabbitmq/rabbitmq-02-install-concepts)  
> 下一篇预告：[《RabbitMQ 队列核心概念——命名、顺序、优先级与策略》](/中间件/rabbitmq/rabbitmq-04-queue-concepts)

---

## 开头：从控制台到代码

上一篇把环境装好了。本篇先用 Web 控制台完成 Queue、Exchange 的创建与第一次收发，把「谁存消息、谁路由」看在眼里；再进入 Java 客户端，把同一件事代码化——实际项目里，这些声明和消费逻辑都在客户端完成。

RabbitMQ 支持多种语言客户端，本篇以 Java 的 **amqp-client** 为主线，把「连接 → 声明 → 绑定 → 发送 → 消费 → 关闭」七步编程模型讲透，并补充 Quorum / Stream 队列声明、消息属性与回调扩展点。

---

## 一、回顾核心组件

![RabbitMQ 核心组件关系](/中间件/rabbitmq/13/p03-01.png)

Producer 经 Connection / Channel 把消息发到 Exchange，Exchange 按 Binding 规则路由到 Queue，Consumer 从 Queue 取消息并 Ack。这是后续所有业务场景的基础。

| 概念 | 说明 |
|------|------|
| **Queue** | 实际存消息的最小单元，FIFO；消息最终必须进入 Queue 才能被消费 |
| **Exchange** | 路由组件，不存消息；与 Queue 绑定后转发消息；多数业务场景需要 Exchange |
| **Virtual Host** | 逻辑隔离单元，权限与资源独立；不同 vhost 无法互通信 |
| **Connection** | 客户端与 Broker 的 TCP 连接，用完应关闭 |
| **Channel** | AMQP 信道，绝大多数 API 在 Channel 上执行；多 Channel 共享 Connection |

---

## 二、先用控制台收发第一条消息

### 2.1 创建队列并直接收发

在 **Queues** 菜单创建名为 `test1` 的经典队列（Classic Queue）。创建时可勾选 **Durable**：表示队列元数据会落盘，Broker 重启后队列定义仍在。

![创建 Classic 队列 test1](/中间件/rabbitmq/12/p08-01.png)

进入 `test1` 详情页（例如 `/#/queues/%2F/test1`），可展开 **Publish message** 发消息、**Get messages** 取消息。这是管理台基于 `basic.publish` / `basic.get` 的调试能力，适合跟练与排障，**不是**生产消费方式。发消息时的 Delivery mode（瞬态/持久）与取消息时的 Ack Mode（取完是否重回队列）语义较深，统一整理在 [04 的持久化与 ACK 两节](/中间件/rabbitmq/rabbitmq-04-queue-concepts)，此处先按下不表。

![在 Queue 详情页发送与消费消息](/中间件/rabbitmq/12/p08-02.png)

### 2.2 用 Exchange 路由

Queue 能收发消息，那 **Exchange（交换机）** 做什么？

Exchange 不存储消息，它与 Queue 建立 **Binding（绑定）** 关系，Producer 把消息发到 Exchange，Exchange 再按规则转发到绑定的 Queue。

进入 **Exchanges**，每个 vhost 预置多种 Exchange（如 `amq.direct`）。

![预置 Exchange 列表](/中间件/rabbitmq/12/p09-01.png)

选择 `amq.direct`，在 **Bindings** 中将 `test1` 绑定到该交换机（注意选择正确的 vhost，如 `/mirror`）。

![将 test1 绑定到 amq.direct](/中间件/rabbitmq/12/p09-02.png)

绑定完成后，Exchange 与 Queue 详情页均可见绑定关系。

![Exchange 与 Queue 双向可见的绑定结果](/中间件/rabbitmq/12/p10-01.png)

在 Exchange 详情页发送消息，`test1` 队列即可消费到。

![经 Exchange 发送后在 Queue 消费](/中间件/rabbitmq/12/p10-02.png)

要点：

- Exchange **不存消息**，只负责路由
- 通常 **Producer 对接 Exchange**，**Consumer 只消费 Queue**
- 一个 Exchange 可绑定多个 Queue；Routing Key、Headers、Properties 决定分发策略

---

## 三、Maven 依赖

> 📦 **配套示例项目**：本系列代码可在 GitHub 运行 → [rabbitmq-blog-demo](https://github.com/code-corey/rabbitmq-blog-demo)

```xml
<dependency>
    <groupId>com.rabbitmq</groupId>
    <artifactId>amqp-client</artifactId>
    <version>5.21.0</version>
</dependency>
```

**AMQP** 是标准消息协议，RabbitMQ 是其具体实现。客户端版本通常不必与服务端完全一致，但大版本差异过大时建议对齐。

---

## 四、七步编程模型

### Step 1：创建 Connection，获取 Channel

**Connection** 对应一个客户端 TCP 连接；**Channel** 是 Connection 上的 AMQP 信道，实际 API 操作在 Channel 层完成。一个 Connection 可创建多个 Channel，复用 TCP 以减轻开销。

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

也可以用一个 **AMQP URI 连接串**替代一串 setter（连接参数可整体存进配置中心）：

```java
ConnectionFactory factory = new ConnectionFactory();
factory.setUri("amqp://admin:admin@192.168.65.112:5672/%2Fmirror");
// 格式：amqp://用户:密码@主机:端口/vhost
// vhost 名要 URL 编码：根 vhost "/" 是 %2F，"/mirror" 是 %2Fmirror
// 还支持查询参数，如 ?connection_timeout=10000&heartbeat=30
Connection connection = factory.newConnection();
```

> 💡 完整的查询参数清单（连接超时、心跳、Channel 上限等）见官方 [URI query parameters](https://www.rabbitmq.com/docs/uri-query-parameters)。

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

五个参数逐个看（以 `queueDeclare("test2", true, false, false, null)` 为例）：

| # | 参数 | 本例取值 | 含义 |
|---|------|----------|------|
| 1 | `queue` | `"test2"` | 队列名。填空串 `""` 则由 Broker 自动生成唯一名（临时队列常用） |
| 2 | `durable` | `true` | 队列是否**持久化**。`true` → 队列元数据落盘，Broker 重启后队列还在（即控制台的 Durable 勾选项） |
| 3 | `exclusive` | `false` | 是否**独占**。`true` → 该队列只能被**声明它的这条 Connection** 使用，连接一断队列即删；常用于「一条连接私有的临时队列」（如 RPC 的应答队列） |
| 4 | `autoDelete` | `false` | 是否**自动删除**。`true` → 当**最后一个消费者**取消订阅 / 断开后队列被删 |
| 5 | `arguments` | `null` | 可选参数 `Map`，承载扩展特性（常用键见下文） |

![Queue 声明参数与控制台对应关系](/中间件/rabbitmq/13/p05-01.png)

三个最容易记混的点：

- **`autoDelete` 不是「没消息就删」**：只有**曾经有过消费者**、且最后一个消费者走后才会触发删除；**从没来过消费者的队列不会被自动删**。想「没人消费就清掉」要用队列级 `x-expires`（TTL）。
- **`exclusive=true` 会忽略 `durable`**：RabbitMQ 把独占队列当**瞬态**处理——它的生命周期绑在连接上，谈持久化没意义。
- **`durable` 管队列、不管消息**：`durable=true` 只保证**队列定义**活过重启；消息能不能活过重启，看 `delivery_mode` + 队列类型（三条件详解见 [04 的持久化一节](/中间件/rabbitmq/rabbitmq-04-queue-concepts)）。

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

`arguments` 常用键（不需要时传 `null`）：

| 键 | 作用 |
|----|------|
| `x-message-ttl` | 消息在队列里的存活时长（毫秒），过期作死信或丢弃 |
| `x-dead-letter-exchange` | 死信交换机（DLX），消息被拒 / 过期 / 超长时转投它处（见 [08 死信篇](/中间件/rabbitmq/rabbitmq-08-dlx-delay)） |
| `x-max-priority` | 开启优先级队列，设最大优先级数 |
| `x-queue-type` | 队列类型：`classic` / `quorum` / `stream` |
| `x-max-length` | 队列消息条数上限，超出的按策略丢弃或转死信 |

最后一句提醒：`queueDeclare` 是**幂等**的——多次声明同名队列时，参数必须**完全一致**，否则 Broker 报 `PRECONDITION_FAILED` 并关闭 Channel（比如先用 `durable=true` 建过，再拿 `false` 声明会失败）。改参数前要先把旧队列删掉。

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

**持久化**：消息是否落盘取决于 **消息 deliveryMode** 与 **Queue durable** 两者，完整的「重启不丢」三条件见 [04 的持久化一节](/中间件/rabbitmq/rabbitmq-04-queue-concepts)。生产环境通常都设为持久化。

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

跑起来之后回控制台看一眼：往队列发几条消息，消费者即可收到——

![控制台发消息、Java 消费者接收](/中间件/rabbitmq/12/p12-01.png)

同时在 **Connections** 和 **Channels** 页可看到一条 Connection（running）和一条 Channel（有数据交互时为 running，空闲为 idle）——这就是 Step 1 说的两个层次的具象：

![Connections 与 Channels 状态](/中间件/rabbitmq/12/p12-02.png)

### Step 7：关闭连接

```java
channel.close();
connection.close();
```

不主动关闭时 Broker Eventually 也会回收，但会额外占用资源。

---

## 五、消息监听与回调扩展

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
