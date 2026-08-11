---
title: "死信队列与延迟队列"
sidebarGroup: "RabbitMQ"
shortTitle: "08 死信与延迟队列"
order: 8
date: 2026-09-01
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 8/22 篇**  
> 上一篇：[《Classic、Quorum、Stream——如何选择队列类型》](/中间件/rabbitmq/rabbitmq-07-queue-types)  
> 下一篇预告：[《消息分片存储插件 Sharding》](/中间件/rabbitmq/rabbitmq-09-sharding)

---

## 开头：消息"处理不了"怎么办

订单 30 分钟未支付要自动关单、消费者处理一条消息反复失败（毒消息）、队列积压太久要丢掉旧的——这些场景有个共同点：**消息没法被正常消费了，但又不能就这么无声无息地丢掉**。

RabbitMQ 的答案是 **死信（Dead Letter）+ 死信交换机（DLX）**：给这些消息一个"回收站"，接住后供重试、排查或业务补偿。很多教程一上来就讲 `x-dead-letter-exchange` 参数，却没讲清死信到底怎么回事——这篇先把概念讲透，再上配置。

---

## 一、先把概念讲透：什么是死信、死信队列、DLX

**死信（Dead Letter）**：一条消息在队列里"没法被正常消费"了，就成了死信。三种情况会触发（第二节详述）：被消费者拒绝且不重投、TTL 过期、队列超长被挤掉。

**死信队列（Dead Letter Queue，DLQ）**：接住死信的那个队列。**它就是一条普通队列**，没有什么"死信类型"——照样声明、照样挂消费者消费，只不过它收的是"从别的队列转过来的死信"。

**死信交换机（Dead Letter Exchange，DLX）**：把死信送进 DLQ 的那个交换机。**它也是一个普通交换机**（direct / fanout / topic 随便），不是什么特殊类型。

> 🔑 **一个关键认知**：DLX 和 DLQ 都不是特殊的东西，全是普通的 exchange 和 queue。整个死信机制，就是靠**业务队列上的一个参数 `x-dead-letter-exchange`** 串起来的——你告诉 Broker："我这个队列里的消息一旦成了死信，就帮我重新投到这个交换机去。"Broker 照办，剩下按正常的 exchange → binding → queue 规则路由。没有"死信交换机类型"这种东西。

---

## 二、死信是怎么产生的：三种触发

| 触发条件 | 到底什么意思 |
|----------|--------------|
| **① 消费者拒绝且不重投** | 消费者 `basicReject` / `basicNack` 时把 `requeue=false`，明确说"这条我处理不了、也别再投给我"→ Broker 把它转成死信 |
| **② TTL 过期** | 消息在队列里待的时间超过 `x-message-ttl`，还没被消费 → 过期成死信 |
| **③ 队列超长** | 队列达到 `x-max-length` 上限，新消息进来时把旧的挤掉（按策略），被挤掉的那条成死信 |

> ⚠️ **常被搞混的点**：消费者 ack 失败 / 抛异常 / 断连时，**默认是 requeue（重投回原队列继续重试），不是死信**。只有你**显式 `requeue=false`** 才会进死信。换句话说，死信是"我主动放弃这条"的明确信号，不是"处理出错了"的自动结果。

---

## 三、整个流转：业务队列 → 死信 → DLX → 死信队列

关键在于：**消息成死信的那一刻，Broker 会自动把它重新投递（republish）到你配的 DLX**，无需你写一行代码。然后按正常规则路由到死信队列：

```
  Producer
     │ basicPublish（正常发）
     ▼
  ┌────────────────┐  消息成了死信           ┌─────┐  binding    ┌────────────────┐
  │  业务 Queue    │ ───(Broker 自动 ─────▶ │ DLX │ ──────────▶│  死信 Queue    │ ──▶ Consumer
  │ 挂 x-dead-     │     republish)         │(普通)│             │ (DLQ，普通)    │     （重试/排查/
  │  letter-       │                        └─────┘             └────────────────┘      业务补偿）
  │  exchange=DLX  │
  └────────────────┘
   触发死信的 3 种情况：① 拒绝 requeue=false   ② TTL 过期   ③ 队列超长
```

三个要点：

- 业务队列上**只需挂一个参数** `x-dead-letter-exchange`，剩下的 Broker 全包——你不用写"转发"代码。
- DLX → 死信队列之间，**按正常 exchange→binding→routing-key 规则路由**。所以 DLX 可以是 fanout（一份死信广播给多个排查队列），也可以是 direct/topic（按 key 精确/模糊分流）。
- 死信转移是 **Broker 内部动作，不经发送端 Confirm**，安全级别低于 Producer 侧发消息。

🔗 完整可运行示例：[`ch08-dlx-delay`](https://github.com/code-corey/rabbitmq-blog-demo/tree/main/ch08-dlx-delay) 的 `DelayQueueRunner`（TTL 5 秒 + DLX 的订单关单链路）。

---

## 四、配置死信

### 4.1 核心参数

| 参数 | 说明 |
|------|------|
| `x-dead-letter-exchange` | 死信交换机名（**挂在业务队列上**） |
| `x-dead-letter-routing-key` | 转发到 DLX 时用的 routing key（可选；不设则保留原 key） |
| `x-message-ttl` | 消息 TTL（毫秒），可与 DLX 配合做延迟队列 |
| `durable` | 建议 `true` |

### 4.2 单队列配置（声明时挂参数）

```java
// 1) 先建好 DLX（普通交换机）和死信队列（普通队列），并绑定
channel.exchangeDeclare("my-dlx", "direct");
channel.queueDeclare("my-dlx-queue", true, false, false, null);
channel.queueBind("my-dlx-queue", "my-dlx", "dead");

// 2) 业务队列：挂 x-dead-letter-exchange 指向 DLX
Map<String, Object> args = new HashMap<>();
args.put("x-dead-letter-exchange", "my-dlx");
channel.queueDeclare("myqueue", true, false, false, args);
```

![Web 控制台配置死信策略](/中间件/rabbitmq/14/p10-01.png)

### 4.3 策略批量配置（运维侧，不改代码）

```bash
# 给一批队列挂 DLX
rabbitmqctl set_policy DLX ".*" '{"dead-letter-exchange":"my-dlx"}' --apply-to queues

# TTL 也能用策略
rabbitmqctl set_policy TTL ".*" '{"message-ttl":60000}' --apply-to queues
```

### 4.4 `x-dead-letter-routing-key`

死信转移时**默认保留原 routing key**；若配了 `x-dead-letter-routing-key`，就**替换**成它。

> ⚠️ **Classic 与 Quorum 支持死信；Stream 不支持。**

---

## 五、如何识别死信：它带了"案底"

消息成为死信进 DLQ 时，Broker 给它打上诊断 Header：

| Header | 含义 |
|--------|------|
| `x-first-death-reason` | 首次死信原因（`rejected` / `expired` / `maxlen`） |
| `x-first-death-queue` | 首次死信的来源队列 |
| `x-first-death-exchange` | 首次死信的来源交换机 |

这三个是**首次成死信时写入、之后不可变**的；另有 `x-death` 数组记录每次死信的完整历史（一条消息可能被死信多次）。业务可据此做审计、告警、差异化补偿。

---

## 六、TTL + DLX = 延迟队列

RabbitMQ **没有原生延迟队列**，但 TTL + DLX 是经典做法：消息进一个**没有消费者**的延迟队列，干等到 TTL 过期成死信 → 经 DLX → 进真正消费队列。

```
Producer → 延迟 Queue(设 TTL + DLX，无 Consumer) → TTL 到期成死信 → DLX → 消费 Queue → Consumer
```

**订单 30 分钟关单**示例：

1. 建好 `delay.exchange`、`process.exchange`（都 direct）。
2. `delay.queue`：绑 `delay.exchange`，设 `x-message-ttl=1800000`（30 分钟）、`x-dead-letter-exchange=process.exchange`，**不挂消费者**。
3. 下单时 Producer 发到 `delay.exchange` → 消息在 `delay.queue` 里干等 30 分钟。
4. 30 分钟到期 → 成死信 → 进 `process.exchange` → `process.queue` → Consumer 执行关单。

**完整代码**（截取自 [`ch08-dlx-delay/DelayQueueRunner`](https://github.com/code-corey/rabbitmq-blog-demo/blob/main/ch08-dlx-delay/src/main/java/io/github/codecorey/dlxdelay/runner/DelayQueueRunner.java)，演示用 TTL=5 秒）：

```java
// === 1. 先声明 process.exchange（死信交换机）——必须先存在，否则 delay.queue
//         声明 x-dead-letter-exchange 时会因找不到交换机而失败（PRECONDITION_FAILED）===
channel.exchangeDeclare("process.exchange", BuiltinExchangeType.DIRECT, true);
channel.queueDeclare("process.queue", true, false, false, null);  // 普通队列，Consumer 执行关单
channel.queueBind("process.queue", "process.exchange", "process.order");

// === 2. 声明 delay.exchange（Producer 投递目标）===
channel.exchangeDeclare("delay.exchange", BuiltinExchangeType.DIRECT, true);

// === 3. delay.queue：核心参数 x-message-ttl + x-dead-letter-exchange ===
Map<String, Object> queueArgs = new HashMap<>();
queueArgs.put("x-message-ttl", 5000);              // TTL（演示 5 秒；生产 30 分钟=1800000）
queueArgs.put("x-dead-letter-exchange", "process.exchange");
queueArgs.put("x-dead-letter-routing-key", "process.order");  // 死信转移时用此 key（覆盖原 key）
channel.queueDeclare("delay.queue", true, false, false, queueArgs);
channel.queueBind("delay.queue", "delay.exchange", "delay.order");

// === 4. 注册 process.queue 的 Consumer（TTL 到期后死信到达此处执行关单）===
channel.basicQos(1);
channel.basicConsume("process.queue", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties props, byte[] body)
            throws IOException {
        // 死信带了"案底"——打印诊断 header（见第五节）
        String reason = "" + props.getHeaders().get("x-first-death-reason");    // expired
        String fromQ  = "" + props.getHeaders().get("x-first-death-queue");     // delay.queue
        log.info("[关单] {} | reason={} from={} time={}", new String(body), reason, fromQ, LocalTime.now());
        channel.basicAck(env.getDeliveryTag(), false);
    }
});

// === 5. 向 delay.exchange 发送订单关单任务 ===
//        delay.queue 没有消费者，消息只能干等到 TTL 到期成死信
for (int i = 1; i <= 3; i++) {
    channel.basicPublish("delay.exchange", "delay.order",
            MessageProperties.PERSISTENT_TEXT_PLAIN,
            ("订单 ORDER-00" + i + " 关单任务").getBytes(StandardCharsets.UTF_8));
    log.info("[下单] ORDER-00{} 已发送到 delay.exchange, time={}", i, LocalTime.now());
    Thread.sleep(1000);  // 间隔 1 秒，便于观察错峰到期
}
```

运行效果（`mvn -pl ch08-dlx-delay -am spring-boot:run`）：

```
14:30:01 [下单] ORDER-001 已发送到 delay.exchange, time=14:30:01.123
14:30:02 [下单] ORDER-002 已发送到 delay.exchange, time=14:30:02.124
14:30:03 [下单] ORDER-003 已发送到 delay.exchange, time=14:30:03.125

# 5 秒后（消息排队到期）：
14:30:06 [关单] 订单 ORDER-001 关单任务 | reason=expired from=delay.queue time=14:30:06.126
14:30:07 [关单] 订单 ORDER-002 关单任务 | reason=expired from=delay.queue time=14:30:07.127
14:30:08 [关单] 订单 ORDER-003 关单任务 | reason=expired from=delay.queue time=14:30:08.128
```

> 每条消息入队间隔 1 秒 → 各自过期时间也差 1 秒 → 错峰到期，Consumer 按 FIFO 逐条收到死信。注意 `x-first-death-reason=expired`、`x-first-death-queue=delay.queue`——死信带的"案底"（见第五节）。

![TTL + 死信实现延迟队列流程](/中间件/rabbitmq/14/p12-01.png)

> 这个"延迟队列"的 Consumer 通常做**业务补偿**：关单、释放库存、发提醒。

> **那 RabbitMQ 怎么知道消息到期了？不是每条消息一个定时器。** 百万消息就百万定时器，根本扛不住。实际做法：消息入队时打个**过期时间戳**（入队时刻 + TTL），检测是**懒的**——主要在消息排到**队头**（最老的位置）时才查它有没有过期，过期就死信、再查下一个；也会周期性地收割过期的队头消息，所以**延迟队列没有消费者也能正常到期**。后果：**TTL 过期不是毫秒精确**，消息可能在理论到期后一小会儿才被死信（得冒泡到队头才被查），延迟是**秒级**精度。
>
> 因此延迟队列要用**队列级 `x-message-ttl`**（所有消息同 TTL、按 FIFO 过期，队头先到期）；**别用单消息 `expiration`**——各条 TTL 不同会**队头阻塞**（一条短 TTL 的消息排在长 TTL 后面，得等前面的排到队头才会被查），延迟严重不准。

![延迟队列与普通死信队列对比](/中间件/rabbitmq/14/p12-02.png)

### 6.1 插件方案（了解）

`rabbitmq_delayed_message_exchange` 插件在 Exchange 层实现延迟，但**已停止维护**（它依赖的 Mnesia 在 4.3 被移除）。生产慎用，可评估改用 RocketMQ 等原生支持延迟的产品。

---

## 七、与 Quorum 毒消息的配合

Quorum 队列用 `x-delivery-count` + **Delivery limit** 自动处理反复投递失败的毒消息。若同时配了 DLX，超阈消息会**进死信队列**供人工排查，而不是无限重投把队列拖垮。

---

## 小结

| 要点 | 内容 |
|------|------|
| 死信是什么 | 消息在队列里"没法正常消费"了：拒绝(requeue=false) / TTL 过期 / 队列超长 |
| DLX / DLQ | **都是普通的 exchange / queue**，靠业务队列上的 `x-dead-letter-exchange` 参数串起来 |
| 流转 | 业务队列 →（成死信，Broker 自动 republish）→ DLX → 死信队列 → 消费者 |
| 配置 | 业务队列挂 `x-dead-letter-exchange`（可选 routing-key）；可用策略批量 |
| 延迟队列 | TTL 暂存（无消费者）+ DLX 转发；RabbitMQ 无原生 delay queue |
| 限制 | Stream 不支持 DLX |

下一篇：Sharding 插件——单队列吞吐不够时如何分片存储。
