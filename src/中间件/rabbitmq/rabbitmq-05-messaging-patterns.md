---
title: "RabbitMQ 常用消息场景——Work、Pub/Sub、Routing、Topic"
sidebarGroup: "RabbitMQ"
shortTitle: "05 七种消息场景"
order: 5
date: 2026-08-29
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 5/22 篇**  
> 上一篇：[《RabbitMQ 队列核心概念——命名、顺序、优先级与策略》](/中间件/rabbitmq/rabbitmq-04-queue-concepts)  
> 下一篇预告：[《SpringBoot 集成 RabbitMQ》](/中间件/rabbitmq/rabbitmq-06-springboot)

---

## 开头：同一个 API，七种用法

RabbitMQ 客户端 API 本身不复杂，难的是把 Exchange 类型、Routing Key、Ack 策略组合到真实业务里。

官方教程（[https://www.rabbitmq.com/tutorials](https://www.rabbitmq.com/tutorials)）总结了七种典型场景。本篇覆盖其中六种常用模式（不含 RPC），并补充 **Headers** 路由。RPC 用 MQ 实现远程调用在实际项目中较少采用，此处略过。

![RabbitMQ 官方教程七种场景概览](/中间件/rabbitmq/13/p13-01.png)

---

## Exchange 类型一览：先有一张总表

七种场景看着多，其实只有**四种 Exchange 类型**在变（外加一个「默认 Exchange」），区别全在**怎么把消息从 Exchange 路由到 Queue**：

| Exchange 类型 | 路由依据 | Binding Key | 典型场景 | 内置实例 |
|---------------|----------|-------------|----------|----------|
| **默认 Exchange**（名字为空 `""`）| routingKey **= 队列名** | 每个 Queue 自动以自己名字绑定 | 直连单队列（Hello World、Work Queue）| `""`（本质是 direct 型，Broker 自动建）|
| **direct** | routingKey **完全相等** | 一个 Queue 可绑多个 key | 按类别精确路由（error / info 分流）| `amq.direct` |
| **fanout** | **忽略 routingKey**，广播到所有绑定 Queue | 绑定时 key 无意义 | 发布 / 订阅、广播通知 | `amq.fanout` |
| **topic** | routingKey **点分单词 + 通配符**（`*` 一个词、`#` 零或多个词）| Binding Key 带通配符 | 多级主题订阅（`order.*`、`*.error`）| `amq.topic` |
| **headers** | **忽略 routingKey**，按消息 headers 键值对 + `x-match`（all / any）| Binding 时传 headers map | 多维度标签路由 | `amq.headers` |

> **先分清两个 Key**：表里反复出现的 **routingKey** 是**生产者发布消息时随消息携带的标签**（`basicPublish(exchange, routingKey, ...)` 第二参），回答「这条消息属于哪一类」；**Binding Key** 是**绑定时设定的订阅规则**（`queueBind(queue, exchange, bindingKey, ...)` 第三参），回答「这个队列想收什么样的 routingKey」。Exchange 拿这俩按自己的类型做匹配，决定投不投给队列。
>
> 两者最容易混的地方是 **direct**：routingKey 必须**完全等于** Binding Key 才路由，形式一模一样，所以很多人把术语当同义词混用——真正能看出「订阅规则」味道的是 **topic**，那里的 Binding Key 才带 `*` / `#` 通配符（`order.*`），而 routingKey 是实打实的点分标签（`order.payment.success`）。fanout 与 headers 则干脆忽略 routingKey。

三点先记住：

- **Producer 永远只往 Exchange 发**（routingKey 随消息走），**Consumer 只从 Queue 收**；中间靠 **Binding** 把 Exchange 和 Queue 连起来，**路由规则由 Exchange 类型决定**。
- 默认 Exchange `""` 本质是个 **direct** 型，且每个队列一声明就自动以自己名字绑上去，所以 `basicPublish("", 队列名, ...)` 看起来像「直连队列」——Hello World、Work Queue 都靠它。
- 除这四种核心类型，还有**插件提供的 Exchange 类型**：`x-modulus-hash`（[09 分片](/中间件/rabbitmq/rabbitmq-09-sharding)）、`x-consistent-hash` / `x-delayed-message` / `x-recent-history`（[19 插件巡览](/中间件/rabbitmq/rabbitmq-19-plugins)），按需启用插件即可。

下面的六种场景，就是这张表里几种类型的实战组合：Hello / Work 用默认 Exchange、Pub/Sub 用 fanout、Routing 用 direct、Topics 用 topic，再补一个 Headers。

---

## 一、Hello World——直连 Queue

> 🔗 完整可运行示例：[PatternsDemoRunner.demoHello()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)（`mvn -pl ch05-messaging-patterns -am spring-boot:run`）

最简单：Producer 发到指定 Queue，Consumer 从该 Queue 消费，不经 Exchange。

```java
// 非持久化队列：queueDeclare(name, durable, exclusive, autoDelete, args)
ch.queueDeclare("pattern.hello", false, false, false, null);

// autoAck=true：Broker 投递即视为确认，consumer 内无需 basicAck
ch.basicConsume("pattern.hello", true, new DefaultConsumer(ch) {
    @Override
    public void handleDelivery(String consumerTag, Envelope envelope,
                               AMQP.BasicProperties properties, byte[] body) {
        log.info("[Hello 收到] {}", new String(body, StandardCharsets.UTF_8));
    }
});

// 默认交换机 ""：routingKey 即队列名，消息直连该队列
ch.basicPublish("", "pattern.hello", null, "Hello World!".getBytes(StandardCharsets.UTF_8));
```

`basicPublish` 第一个参数传空字符串，表示使用 **默认 Exchange**，routingKey 即为队列名。这就是第二篇控制台的 Demo。

![Hello World 模式：Producer 直连 Queue](/中间件/rabbitmq/13/p14-02.png)

---

## 二、Work Queues——工作队列

> 🔗 完整可运行示例：[PatternsDemoRunner.demoWork()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)

**场景**：一个任务队列，多个 Worker 竞争消费，每条消息只被一个 Worker 处理。

![Work Queues：多 Consumer 竞争同一 Queue](/中间件/rabbitmq/13/p14-03.png)

```java
// 易错点①：durable=true，队列持久化（重启不丢队列定义）
ch.queueDeclare("pattern.task_queue", true, false, false, null);

// 两个 Worker 各开 Channel 竞争消费（demoWork 起 2 个）
Channel w1 = conn.createChannel();
w1.basicQos(1);                       // 易错点③：prefetch=1（详见 2.2）
w1.basicConsume("pattern.task_queue", false, new DefaultConsumer(w1) {  // 易错点②：autoAck=false
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body)
            throws IOException {
        log.info("[W1 处理] {}", new String(body, StandardCharsets.UTF_8));
        w1.basicAck(env.getDeliveryTag(), false);   // 手动 ack，否则形成毒消息
    }
});
// Worker-2 同上……

// 发布持久化任务：PERSISTENT_TEXT_PLAIN（delivery_mode=2）
for (int i = 1; i <= 6; i++) {
    ch.basicPublish("", "pattern.task_queue", MessageProperties.PERSISTENT_TEXT_PLAIN,
            ("task-" + i).getBytes(StandardCharsets.UTF_8));
}
```

### 2.1 三个易错点

**① 必须 Ack**

手动 ack 模式（`basicConsume(queue, false, ...)`）下，Consumer 处理完一条要主动告诉 Broker「这条我处理完了，可以丢了」——否则 Broker 会反复投递，形成 **Poison Message（毒消息）**。这个动作就是：

```java
workerChannel.basicAck(envelope.getDeliveryTag(), false);
```

- `envelope.getDeliveryTag()`：这条消息的**投递标签**。Broker 每投递一条，就给它发一个 **Channel 内单调递增的编号**（从 1 开始，Channel 一关就作废），`basicAck` 靠它精确指代「就是这一条」。
- `false`（`multiple`）：**只 ack 这一条**。若传 `true`，则一口气把「这条 + 它之前所有还没 ack 的」全 ack 掉（批量 ack，用得少）。

**② 持久化不等于绝对不丢**

Queue 和消息都设 `durable` / `PERSISTENT` 时，消息先写入 **PageCache**，再按操作系统策略刷盘。异常断电仍可能丢未刷盘数据。RocketMQ 对此有专门设计；RabbitMQ 侧需配合 **Publisher Confirms**（下文）。

**③ 多 Consumer 分发策略**

默认 **fair dispatch / round-robin**：轮询分发，不考虑各 Worker 处理能力。

改进：`channel.basicQos(prefetchCount)` 限制未 Ack 消息数，Broker 超过 prefetch 则不再向该 Consumer 投递。但若所有 Consumer 都达到上限，消息会积压在服务端——需监控队列深度，扩容或加 Worker。

> If all the workers are busy, your queue can fill up. You will want to keep an eye on that, and maybe add more workers, or have some other strategy.

### 2.2 prefetch 调优

先把 prefetch 到底是怎么回事讲透。

**Broker 默认会"拼命推"。** push 模式（`basicConsume`）下，Broker 一拿到消息就往消费者推，根本不等它处理完上一条。这有两个坏处：① 消息全挤在消费者那边排队等处理，**内存可能被压垮**；② 多个 Worker 时，Broker 不管谁快谁慢，**平均往各人手里塞一堆**——快的早干完闲死、慢的堆一堆，分配不公平。

**prefetch 就是给 Broker 划一条线**：「我这个消费者**手上还没 ack 的消息，最多同时这么多条**；超过就别推了，等我 ack 一条、腾出一个名额，你再推一条。」用代码设就是 `channel.basicQos(prefetchCount)`——这个数就是 prefetch。

**prefetch = 1 时具体怎么跑**（demoWork 的写法）：

```
Broker 推 1 条 ──▶ 你手上 1 条没 ack（到上限了）
                 │  Broker：你手上已有一条没 ack，先不推了
                 ▼
            处理完 → basicAck（名额空出来）
                 │
                 ▼
Broker 再推 1 条 ──▶ ……循环
```

一句话：**「一次只给我一条，ack 了再给下一条。」** 只对 push 模式有效；`basic.get` 拉模式是你主动去取，无所谓 prefetch。

> ⚠️ **前提：必须配手动 ack**。prefetch 限的是「未 ACK 的在途数」，只有手动 ack（`basicConsume(queue, false, ...)`，处理完才 `basicAck`）才会让在途数累积、才触得到上限；若用 `autoAck=true`（投递瞬间即 acked），在途数永远是 0，prefetch 永远限不住——等于没设。

**为什么 Work Queue 偏偏设 1（fair dispatch）**：以 demoWork 的 **2 个 Worker × 6 个任务**为例——

| | 默认（不设 prefetch） | `basicQos(1)` |
|---|---|---|
| 投递方式 | round-robin 一股脑倾倒：task-1/3/5→W1、task-2/4/6→W2 | 各发 1 条，**谁先 ack 谁领下一条** |
| 任务重量不均时 | 快 Worker 干完干等、慢 Worker 堆三条，**不公平** | 快的多领、慢的少领，**按能力分配** |

「能者多劳」靠的就是 prefetch=1 这一下。

易错点③ 提到用 `basicQos(prefetchCount)` 限流，但**取多少**才是真正的工程问题。核心是一组权衡：

| prefetch | 行为 | 适用 |
|----------|------|------|
| `0` | 不限流，Broker 尽量推 | 极少用，近乎 `autoAck` 全量灌 |
| `1` | 严格公平，一次一条 | 处理重、需严格按能力分配；吞吐低 |
| 适中（10~几百）| 允许一定在途数，吞吐与公平兼顾 | 多数业务场景 |

**调优原则**：

- **太小**（长期卡在 1）→ 每条消息都要一次网络往返 + 等 ack 才能拿下一条，CPU 与带宽闲置，吞吐上不去。
- **太大** → 快 Worker 一次性囤积大量消息，慢 Worker 反而闲置，公平性倒退；同时客户端本地缓冲与 Broker 的 unacked 都会膨胀，内存压力上升。
- **经验值**：小而快的消息（通知、埋点）给几十到几百；大消息或单条处理耗时的给个位数。没有银弹，靠压测。

**`global` 参数：上限是「每人一份」还是「大家共享一份」**

`basicQos(prefetchCount, global)` 的第二个参数 `global` 决定 prefetch 上限按谁算。设 prefetch=10、同一个 Channel 上有 3 个消费者（C1/C2/C3）：

| `global` | 上限怎么算 | 这条 Channel 上最多多少条未 ack |
|---|---|---|
| `false`（默认）| **每个消费者各 10 条**（各算各的）| 最多 10 + 10 + 10 = **30** |
| `true` | **三个消费者共享一个 10 的池** | 合计最多 **10** |

- `global=false`：各自独立，谁先 ack 谁腾自己的名额，互不影响——**绝大多数场景用这个**（包括本篇的 fair dispatch）。
- `global=true`：三个消费者抢同一个总额度，给谁多给谁少由 Broker 决定；只有想给整条 Channel 封顶时才用，**很少见**。

**举个具体例子**（一条 Channel 上 C1/C2/C3 三个消费者，prefetch=10，队列里消息管够）：

- `global=false`（默认）：Broker **各给三人推满 10 条**——C1 手上 10、C2 手上 10、C3 手上 10，这条 Channel 共 **30 条**在途；三人都满额，Broker 暂停推。接着 C1 处理完 1 条、ack → 只腾出 **C1 自己**的 1 个名额 → Broker 又给 C1 推 1 条（C2/C3 不受影响）。三人**各按各的节奏领、互不干扰**。
- `global=true`：三人**共享一个 10 的池**。Broker 可能先把 10 条一股脑给了 C1（池满了），C2/C3 **一条都拿不到**，Broker 停推；等 C1 ack 1 条、池腾 1 → Broker 再推 1 条（给谁由 Broker 定，可能还是 C1）。**可能一人独占、另两人饿着**——所以 global=true 只在「我就要给整条 Channel 封顶、不在乎谁多吃」时才用。

> ⚠️ 一个坑：AMQP 规范写的 `global=true` 是「整个连接（per-connection）」，但 **RabbitMQ 实际只做到「整个 Channel」**，没实现 per-connection。所以看规范或别的客户端资料说 `global=true` 管「整条连接」时别照搬——在 RabbitMQ 里它只到 Channel 这一层。

**副作用闭环**：所有 Consumer 都打满 prefetch 后，消息会停在服务端 Queue 里堆积——堆积后 Classic 队列为何断崖式变慢，见 [第 12 篇 · 积压退化](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation)；监控侧盯 `unacked` 与 `messages_ready`，见 [第 22 篇 · 生产实践](/中间件/rabbitmq/rabbitmq-22-production-checklist)。

> Spring 侧由 `spring.rabbitmq.listener.simple.prefetch` 配置，原理同 `basicQos`，封装见 [第 06 篇](/中间件/rabbitmq/rabbitmq-06-springboot)。

---

## 三、Publish / Subscribe——扇出广播

> 🔗 完整可运行示例：[PatternsDemoRunner.demoFanout()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)

**场景**：一条消息广播给多个订阅者，各订阅者独立 Queue。

使用 **fanout** Exchange：忽略 routingKey，转发到所有绑定 Queue。

![Fanout：一条消息复制到多个 Queue](/中间件/rabbitmq/13/p16-01.png)

```java
ch.exchangeDeclare("pattern.logs", "fanout");

// 每个订阅者各自声明服务端命名临时队列并绑定（demoFanout 起 3 个这样的订阅者）
String q = ch.queueDeclare().getQueue();   // 服务端生成队列名（非持久、独占、自动删除）
ch.queueBind(q, "pattern.logs", "");        // fanout 忽略 routingKey
ch.basicConsume(q, true, new DefaultConsumer(ch) {  // autoAck=true
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body) {
        log.info("[Sub 收到] {}", new String(body, StandardCharsets.UTF_8));
    }
});

// fanout 忽略 routingKey，转发到所有绑定队列
ch.basicPublish("pattern.logs", "", null, "fanout broadcast".getBytes(StandardCharsets.UTF_8));
```

Producer 只关心 Exchange；具体进哪些 Queue 由 Binding 决定，实现进一步解耦。

---

## 四、Routing——精确路由

> 🔗 完整可运行示例：[PatternsDemoRunner.demoDirect()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)

**场景**：按消息类别投递到不同 Queue，如 `error` 日志进告警队列，`info` 进归档队列。

使用 **direct** Exchange：routingKey **完全匹配** Binding Key。

![Direct Exchange 按 routingKey 精确路由](/中间件/rabbitmq/13/p17-01.png)

```java
ch.exchangeDeclare("pattern.direct_logs", "direct");

String alertQueue = ch.queueDeclare().getQueue();
ch.queueBind(alertQueue, "pattern.direct_logs", "error");   // Alert 只收 error

String archiveQueue = ch.queueDeclare().getQueue();
ch.queueBind(archiveQueue, "pattern.direct_logs", "info");   // Archive 收 info
ch.queueBind(archiveQueue, "pattern.direct_logs", "error");  // …和 error（一个队列绑多个 key）

// routingKey 完全匹配：error→Alert+Archive，info→Archive
ch.basicPublish("pattern.direct_logs", "error", null, "[error] broke".getBytes(StandardCharsets.UTF_8));
ch.basicPublish("pattern.direct_logs", "info",  null, "[info] good".getBytes(StandardCharsets.UTF_8));
```

---

## 五、Topics——主题模糊匹配

> 🔗 完整可运行示例：[PatternsDemoRunner.demoTopic()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)

**场景**：日志系统按级别与模块订阅，如 `*.error` 收所有 error，`order.#` 收 order 下所有子 topic。

使用 **topic** Exchange：routingKey 为点分单词，Binding 支持通配符：

| 符号 | 含义 |
|------|------|
| `*` | 匹配恰好一个单词 |
| `#` | 匹配零个或多个单词 |

![Topic Exchange 通配符匹配示意](/中间件/rabbitmq/13/p18-01.png)

```java
ch.exchangeDeclare("pattern.topic_logs", "topic");

String orderQueue    = ch.queueDeclare().getQueue();
ch.queueBind(orderQueue,    "pattern.topic_logs", "order.*"); // order 下恰好两层
String errorQueue    = ch.queueDeclare().getQueue();
ch.queueBind(errorQueue,    "pattern.topic_logs", "*.error"); // 所有 error
String allOrderQueue = ch.queueDeclare().getQueue();
ch.queueBind(allOrderQueue, "pattern.topic_logs", "order.#"); // order 下全部层级

// 4 条 routingKey 共命中 5 次（'*' 一个词、'#' 零或多个词）
for (String rk : new String[]{"order.payment.success", "order.shipped", "payment.error", "order.refund.error"}) {
    ch.basicPublish("pattern.topic_logs", rk, null, ("topic-msg:" + rk).getBytes(StandardCharsets.UTF_8));
}
```

---

## 六、Publisher Confirms——发送端确认

> 🔗 完整可运行示例：[PatternsDemoRunner.demoConfirms()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)

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

**先说 `addConfirmListener` 收什么参数**：它接收**两个回调**——第一个是 **ack 回调**（Broker 确认收到时触发），第二个是 **nack 回调**（Broker 没收到时触发）。两个回调签名一样：`(long sequenceNumber, boolean multiple)`，含义是：

- `sequenceNumber`（简称 `seq`，**发布序号**）：开了 confirms 后，Channel 给你发的每条消息都按顺序编号（1、2、3…）。Broker 回调时**带回这个 seq**，告诉你「我确认的是哪一条」——你靠它把回调和你发出去的那条消息对上。
- `multiple`（**是否批量**）：`false` = 只确认 seq 这一条；`true` = 确认 seq **及它之前所有还没确认的**（一把清）。

**整体流程**：发布前先用 `getNextPublishSeqNo()` 占号、把 `seq → 消息体` 存进一张表（`outstanding`）；Broker 回 ack 就从表里删掉那条（说明收到了），回 nack 就得重发。用 `ConcurrentSkipListMap` 是因为它**并发安全**（发布线程和回调线程同时访问）且**有序**——`multiple=true` 时能 `headMap` 一把清掉 seq 及之前全部。

**整个流程跑起来长这样**（左：你的发布线程；右：`outstanding` 表的实时状态；中间：Broker 的异步回调）：

```
   发布线程                          Broker                  outstanding 表
   ────────                          ──────                  ──────────────
   ① seq=getNextPublishSeqNo()      （占号，下一条=1）          {}
   ② outstanding.put(seq, body1)     （入表）                   {1:body1}
   ③ basicPublish(body1) ──────────▶ 收到 1
        │  不等 ack，继续发下一条（非阻塞，所以吞吐高）
   ① seq=getNextPublishSeqNo()      （占号=2）                 {1:body1}
   ② outstanding.put(seq, body2)                               {1:body1, 2:body2}
   ③ basicPublish(body2) ──────────▶ 收到 2
                                     ……Broker 异步逐条确认……

   ◀──────── ack(seq=1, multiple=false) ────   回调：1 收到了
   ④ ack 回调：outstanding.remove(1)                           {2:body2}   ← 1 删掉=已确认 ✓

   ◀──────── nack(seq=2, multiple=false) ────  回调：2 没收到
   ⑤ nack 回调：重发 body2（生产级，拿新 seq）                 ……
```

一句话：**发布线程只管「占号 → 入表 → 发」一股脑往前冲，不阻塞；Broker 的 ack/nack 回调异步回来，靠 seq 在表里对账——ack 删、nack 重发。**

```java
ConcurrentSkipListMap<Long, String> outstanding = new ConcurrentSkipListMap<>();

// 两个回调：ack（Broker 收到）+ nack（Broker 没收到），签名都是 (seq, multiple)
channel.addConfirmListener(
    (seq, multiple) -> {                       // ack：从表里删掉已确认的
        if (multiple) outstanding.headMap(seq, true).clear();   // 批量：清 seq 及之前
        else         outstanding.remove(seq);                    // 单条：只删这一条
    },
    (seq, multiple) -> log.warn("nack seq={} multiple={} —— 需重发", seq, multiple)
);

// 发布三步：占号 → 入表 → 发送
long seq = channel.getNextPublishSeqNo();      // 拿"下一条"的号
outstanding.put(seq, body);                     // 记住"这个号 = 这条消息"，等回调来对
channel.basicPublish(EXCHANGE, ROUTING_KEY, null, body);
```

> 上面 nack 只打了日志。**生产级**要在 nack（以及 Channel 异常断开）时把 `outstanding` 里受影响的消息**重发**，两个细节：
> - **重发要拿新 seq**——重发对 Broker 是一条新消息，必须重新 `getNextPublishSeqNo()` 再入表，不能复用旧号。
> - **Channel 异常断开怎么办**：假设你发了 5 条、`outstanding` 里还剩 2 条没收到 ack，这时网线断了 / Broker 重启、Channel 挂了。这 2 条 Broker 到底收到没？**你判断不了**——可能收到了但 ack 还没回、可能收到了还没落盘就崩了、也可能压根没到。既然判断不了，**稳妥起见一律重发**：在 `addShutdownListener`（Channel 异常关闭时触发的回调）里把 `outstanding` 剩下的全发一遍。
> - **代价：消费者必须幂等**。因为 Broker 可能其实已经收到了那条，你一重发 = 它收到两次 = 下游处理两次。所以消费者要能去重（按业务唯一键），处理两次的效果等于一次——这就是「**至少一次投递（at-least-once）**」：消息不会丢，但可能重复。

异步确认吞吐最好。还可加 **ReturnListener** 监控「已到 Exchange 但无法路由到 Queue」的消息；配合 Exchange 的 **`alternate-exchange`** 做兜底转发。

---

## 七、Headers——头部路由

> 🔗 完整可运行示例：[PatternsDemoRunner.demoHeaders()](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch05-messaging-patterns/src/main/java/io/github/codecorey/patterns/PatternsDemoRunner.java)

direct / fanout / topic 都依赖 **routingKey 字符串**。Headers Exchange 忽略 routingKey，用 **消息 Headers 键值对** 与 Binding Headers 匹配。

匹配模式由 Binding 中 `x-match` 决定：

| x-match | 规则 |
|---------|------|
| `all` | 所有键值对都匹配 |
| `any` | 任一匹配即可 |

Consumer 绑定：

```java
ch.exchangeDeclare("pattern.header_logs", BuiltinExchangeType.HEADERS);

// 绑定①：x-match=any（任一 header 命中即转发）
String anyQueue = ch.queueDeclare().getQueue();
Map<String, Object> anyHeaders = new HashMap<>();
anyHeaders.put("x-match", "any");
anyHeaders.put("loglevel", "info");
anyHeaders.put("buslevel", "product");
anyHeaders.put("syslevel", "admin");
ch.queueBind(anyQueue, "pattern.header_logs", "", anyHeaders);

// 绑定②：x-match=all（所有 header 必须全部命中）
String allQueue = ch.queueDeclare().getQueue();
Map<String, Object> allHeaders = new HashMap<>();
allHeaders.put("x-match", "all");
allHeaders.put("loglevel", "error");
allHeaders.put("buslevel", "product");
allHeaders.put("syslevel", "admin");
ch.queueBind(allQueue, "pattern.header_logs", "", allHeaders);
```

Producer 发送：

```java
// 发送：headers = {loglevel=error, buslevel=product, syslevel=admin}
//   → any 命中（buslevel/syslevel 命中）+ all 命中（三项全中）= 投两条
Map<String, Object> messageHeaders = new HashMap<>();
messageHeaders.put("loglevel", "error");
messageHeaders.put("buslevel", "product");
messageHeaders.put("syslevel", "admin");

AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .deliveryMode(MessageProperties.PERSISTENT_TEXT_PLAIN.getDeliveryMode())
        .headers(messageHeaders)
        .build();

// headers 忽略 routingKey，传空串即可
ch.basicPublish("pattern.header_logs", "", props, "header-msg".getBytes(StandardCharsets.UTF_8));
```

Headers 模式性能较低，官方不建议大规模使用，但在多维度标签路由的特殊场景很实用。管理控制台预置 `amq.headers` 即此类型。

---

## 八、一消息多路由：CC / BCC（Sender-Selected）

direct/topic 一条消息只有一个 routing key。但像邮件一样「抄送」多个收件人是合法需求——AMQP 0-9-1 允许在**消息头**里塞额外的 routing key（官方叫 Sender-selected Distribution）：

```java
Map<String, Object> headers = new HashMap<>();
// CC/BCC 的值是字符串列表：每个元素都是一条额外的 routing key
headers.put("CC", List.of("audit.log", "billing"));
headers.put("BCC", List.of("secret.archive"));

AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .headers(headers)
        .build();

// 消息会按 basicPublish 的 routingKey + CC + BCC 全部路由一遍
ch.basicPublish("pattern.topic_logs", "order.created", props, body);
```

| Header | 行为 |
|--------|------|
| `CC` | 追加路由 key，**保留**在最终消息里，消费者可见 |
| `BCC` | 追加路由 key，但**投递前被 Broker 删除**——收件方互相看不见，类似邮件密送 |

两个语义细节：

- **只要有一个 key 路由成功即算 accepted**——不会因为某个 CC 的 key 没有匹配绑定而整体失败（开了 Confirms 时仍回 `basic.ack`）；
- 发给默认交换机时，每个 key 就是队列名（一条消息直投多个队列）；发给 topic 交换机时，每个 key 各自走一遍模式匹配。

适合「同一事件要进多个子系统、又不想为每种组合建绑定」的场景。注意它是**一条消息多路由**，不是复制多条——Exchange 把它分别投到所有匹配队列，每队列各得一份。AMQP 1.0 客户端的等价物是消息注解 `x-cc`（无 BCC 等价物），见 [13 协议篇](/中间件/rabbitmq/rabbitmq-13-amqp-and-protocols)。

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
| 一条消息投多个目标 | CC/BCC 头（任意类型） | 抄送审计、密送归档 |

---

## 小结

七种模式本质都是 **Exchange 类型 + Binding 规则 + Ack 策略** 的组合。Work Queue 注意 Ack 与 prefetch；可靠性链路需 Publisher Confirms；无法路由的消息用 alternate-exchange 兜底。

下一篇看 Spring Boot 如何把这套模型封装成 `RabbitTemplate` 与 `@RabbitListener`。
