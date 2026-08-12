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

4.2 是在**Java 代码里**写 `args.put("x-dead-letter-exchange", ...)`，改 DLX 要改代码 + 重新发版。RabbitMQ 还提供了另一种方式——**策略（Policy）**：不写代码，用命令行或管理台直接给队列挂 DLX，**立即生效**：

```bash
rabbitmqctl set_policy DLX "^order\." '{"dead-letter-exchange":"my-dlx"}' --apply-to queues
#                        ↑    ↑           ↑                                    ↑
#                     策略名  正则匹配   设什么参数                           作用于谁
```

- `DLX` = 策略名（随便起，管理台 Policies 页面能看到）
- `"^order\."` = 正则 → 匹配**队列名以 `order.` 开头**的所有队列
- `'{"dead-letter-exchange":"my-dlx"}'` = 给匹配的队列设 DLX
- `--apply-to queues` = 只作用于队列

效果：**所有 `order.` 开头的队列自动挂上 DLX**——不管 Java 代码里写没写。

TTL 也能用策略设（同理）：

```bash
rabbitmqctl set_policy TTL "^order\." '{"message-ttl":60000}' --apply-to queues
```

| | 4.2 代码侧 | 4.3 策略侧 |
|---|---|---|
| 怎么设 | Java `queueDeclare(..., args)` | `rabbitmqctl set_policy` 或管理台 |
| 改 DLX | 改代码 + 重新发版 | 改策略，**零代码、立即生效** |
| 谁来做 | 开发 | 运维 |
| 批量 | ❌ 每个队列声明都要写 | ✅ 一条策略匹配一批队列 |

> 两者都设了 DLX 时谁优先？**客户端 x-args > policy**（见 [04 队列核心概念](/中间件/rabbitmq/rabbitmq-04-queue-concepts) 的 policy 优先级详解）。所以策略是"兜底默认"，代码里的参数能覆盖它。

### 4.4 `x-dead-letter-routing-key`

死信转移时**默认保留原 routing key**；若配了 `x-dead-letter-routing-key`，就**替换**成它。

> ⚠️ **Classic 与 Quorum 支持死信；Stream 不支持。**

### 4.5 普通死信队列：完整代码

上面四.二只有半截声明代码。这里给出**完整的"业务消费失败 → 死信 → DLQ 排查"链路**，和第六节的延迟队列代码区分开：

```java
// === 普通死信队列：业务消费失败(reject requeue=false) → 死信 → DLQ 排查 ===

// 1) 先建好 DLX（普通交换机）和死信队列（普通队列），并绑定
channel.exchangeDeclare("biz.dlx", "direct");
channel.queueDeclare("biz.dlq", true, false, false, null);
channel.queueBind("biz.dlq", "biz.dlx", "dead");

// 2) 业务队列：挂 x-dead-letter-exchange → 消息被拒绝(requeue=false)时自动转发到 biz.dlx
Map<String, Object> args = new HashMap<>();
args.put("x-dead-letter-exchange", "biz.dlx");
args.put("x-dead-letter-routing-key", "dead");  // 死信时用固定 key（否则保留原 key）
channel.queueDeclare("biz.queue", true, false, false, args);

// 3) 业务消费者：处理失败 → basicNack(requeue=false) → 触发死信
channel.basicConsume("biz.queue", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body)
            throws IOException {
        try {
            throw new RuntimeException("模拟处理失败");   // 业务逻辑出错
        } catch (Exception e) {
            // requeue=false → 不重投回原队列，而是触发死信 → 进 biz.dlx → biz.dlq
            channel.basicNack(env.getDeliveryTag(), false, false);
        }
    }
});

// 4) 死信消费者：接住死信，打印"案底"（见第五节）
channel.basicConsume("biz.dlq", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body)
            throws IOException {
        String reason = "" + p.getHeaders().get("x-first-death-reason");   // rejected
        String fromQ  = "" + p.getHeaders().get("x-first-death-queue");    // biz.queue
        log.info("[死信排查] body={}, reason={}, from={}", new String(body), reason, fromQ);
        channel.basicAck(env.getDeliveryTag(), false);
    }
});

// 5) 发一条消息 → 业务消费者处理失败 → nack(requeue=false) → 死信 → DLQ 消费者接住
channel.basicPublish("", "biz.queue", null, "test message".getBytes());
```

消息流转示意图：
```
配置：
biz.queue 配置 死信（x-dead-letter-exchange = biz.dlx）

流转：
消息 -> biz.queue -> 进行处理报错 -> 转发死信到 biz.dlx  -> 消息转发到 biz.dlq

```

运行后日志：

```
[死信排查] body=test message, reason=rejected, from=biz.queue
```

> **注意和延迟队列（第六节）的区别**：
> - **这里**：业务队列**挂了 Consumer**，正常消费；处理**失败时** `basicNack(requeue=false)` 才触发死信 → DLQ 做**排查/补偿**。消息进 DLQ 是**异常**路径。
> - **延迟队列**：延迟队列**不挂 Consumer**，消息的唯一出路就是等 TTL **过期** → 死信 → DLQ 做**定时任务**。消息进 DLQ 是**预期**路径。
>
> 两种用法的**拓扑参数不同**（普通 DLQ 不配 TTL；延迟队列必须配），但底层都是同一个 `x-dead-letter-exchange`。

---

## 五、如何识别死信：它带了"案底"

消息成为死信进 DLQ 时，Broker **自动给它打上诊断 Header**——你不用自己记"这条是从哪来的、为什么死的"，Broker 全给你写在消息头里了：

| Header | 含义 |
|--------|------|
| `x-first-death-reason` | 首次死信原因（`rejected` / `expired` / `maxlen`） |
| `x-first-death-queue` | 首次死信的来源队列 |
| `x-first-death-exchange` | 首次死信的来源交换机 |

这三个是**首次成死信时写入、之后不可变**的；另有 `x-death` 数组记录每次死信的完整历史（一条消息可能被死信多次）。业务可据此做审计、告警、差异化补偿。

**代码里怎么读到这些 Header？** 在 DLQ 的 Consumer 里，从 `AMQP.BasicProperties.getHeaders()` 取出来即可：

```java
// 死信消费者：接住死信后，读出 Broker 打上的诊断 Header
channel.basicConsume("biz.dlq", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String consumerTag, Envelope envelope,
                               AMQP.BasicProperties properties, byte[] body)
            throws IOException {
        Map<String, Object> headers = properties.getHeaders();

        // —— 三个不可变的"首次死信"属性 ——
        String reason = headerStr(headers, "x-first-death-reason");    // rejected / expired / maxlen
        String fromQ  = headerStr(headers, "x-first-death-queue");     // 来源队列（如 biz.queue）
        String fromEx = headerStr(headers, "x-first-death-exchange");  // 来源交换机

        // —— x-death 数组：完整的死信历史（一条消息可能被多次死信）——
        // 每条记录含：queue、exchange、reason、time、routing-keys 等
        // 用法：((List<?>) headers.get("x-death")).forEach(...)

        log.info("[死信排查] body={} | reason={} | from queue={} exchange={}",
                new String(body, StandardCharsets.UTF_8), reason, fromQ, fromEx);

        // 按 reason 做差异化处理
        switch (reason) {
            case "rejected": /* 消费者拒绝 → 记录告警 */ break;
            case "expired":  /* TTL 过期 → 执行延迟任务（关单/提醒） */ break;
            case "maxlen":   /* 队列超长被挤掉 → 告警扩容 */ break;
        }

        channel.basicAck(envelope.getDeliveryTag(), false);
    }
});

/** 安全读取 Header（LongString → toString），缺失返回 "(无)"。 */
private static String headerStr(Map<String, Object> headers, String key) {
    Object v = headers == null ? null : headers.get(key);
    return v == null ? "(无)" : v.toString();
}
```

> **注意**：Header 里的值类型是 RabbitMQ 的 `LongString`（不是 Java `String`），直接 `"" + value` 或 `.toString()` 能拿到文本；但如果想强转 `(String) headers.get(key)` 会 `ClassCastException`——用 `.toString()` 或上面的 `headerStr` 工具方法最安全。

---

## 六、TTL + DLX = 延迟队列

上面讲的死信队列是"出了问题接住消息"——但同一套 DLX 机制还能做一件完全不同的事：**让消息故意等一段时间再被处理**。这就是延迟队列。

RabbitMQ **没有原生延迟队列**，但可以用 **TTL（让消息在队列里干等到过期）+ DLX（过期成死信后自动转发到消费队列）** 实现：

```
Producer → 延迟 Queue(设 TTL + DLX，无 Consumer) → TTL 到期成死信 → DLX → 消费 Queue → Consumer
```

> **延迟队列的三条铁律（先记住，后面逐一展开）：**
> 1. **延迟队列不挂 Consumer**——消息的唯一出路就是等 TTL 过期，没有消费者取走它。
> 2. **用队列级 `x-message-ttl`**（所有消息同一个 TTL）——**不要用单消息 `expiration`**，后者各条 TTL 不同会导致"队头阻塞"、延迟严重不准（详见 6.4）。
> 3. **延迟队列挂 `x-dead-letter-exchange`** 指向消费队列的交换机——消息过期成死信后自动转发过去执行任务。

### 6.1 先分清：延迟队列 vs 普通死信队列

延迟队列和普通死信队列**用的是同一套 DLX 机制**（都是 `x-dead-letter-exchange`），很多人搞混。区别在于**怎么用**：

| | 普通死信队列（DLQ） | 延迟队列 |
|---|---|---|
| **目的** | 接住"处理不了"的消息（**补救/兜底**） | 让消息"等一段时间"再被处理（**定时投递**） |
| **业务队列挂 Consumer 吗** | ✅ **挂**（正常消费，死信是**异常路径**） | ❌ **不挂**（消息的唯一出路就是等 TTL 过期） |
| **消息成死信的原因** | `rejected`（拒绝 requeue=false）/ `maxlen`（超长） | `expired`（TTL 过期） |
| **业务队列配 `x-message-ttl`？** | 不一定（通常不配） | ✅ **必须配**（这是延迟的核心） |
| **Consumer 干什么** | 排查、补偿、告警（**善后失败的**） | 执行定时任务：关单、提醒（**该干活了**） |
| **消息进 DLQ 是正常的还是异常的** | **异常**（出问题了才走到这一步） | **正常**（延迟到了，该执行了） |

拓扑对比：

```
普通死信队列（兜底补救）：
  Producer → 业务Queue(挂DLX + 有Consumer)
               ├─ 正常：Consumer 消费 ✓
               └─ 异常：reject/maxlen → 死信 → DLX → DLQ → 排查/补偿

延迟队列（定时投递）：
  Producer → 延迟Queue(挂TTL+DLX + 无Consumer)
               └─ TTL 到期 → 死信 → DLX → 消费Queue → Consumer 执行任务(关单/提醒)
               （延迟队列里消息的唯一出路就是等 TTL 过期——没有 Consumer 消费它）
```

> 一句话：**同一个 DLX 机制，普通 DLQ 是"出错了走岔路"（异常路径），延迟队列是"故意等到点再走"（预期路径）。** 核心区别就是那个"业务队列"挂不挂 Consumer——挂了 = 正常消费 + 异常兜底；不挂 + 配 TTL = 延迟投递。

下面用一个经典场景（订单关单）把延迟队列做出来，再深入原理。

### 6.2 怎么做：订单 30 分钟关单

**架构**：两个交换机、两个队列，串成一条延迟链路。

1. 建好 `delay.exchange`、`process.exchange`（都 direct）。
2. `delay.queue`：绑 `delay.exchange`，设 `x-message-ttl=1800000`（30 分钟）、`x-dead-letter-exchange=process.exchange`，**不挂消费者**。
3. 下单时 Producer 发到 `delay.exchange` → 消息在 `delay.queue` 里干等 30 分钟。
4. 30 分钟到期 → 成死信 → 进 `process.exchange` → `process.queue` → Consumer 执行关单。

> **为什么需要两个交换机？能省成一个吗？**
>
> 能理解这个问题就真懂 DLX 了。拆开看每个交换机的作用：
>
> | 交换机 | 作用 | 能不能省 |
> |--------|------|----------|
> | `delay.exchange` | Producer 发消息的入口 → 路由到 `delay.queue` | 可以**省掉**——直接发到默认交换机 `""`，routingKey=`delay.queue`，或用 policy 给队列挂 DLX 后发到任意交换机 |
> | `process.exchange` | `delay.queue` 的**死信目标**（`x-dead-letter-exchange` 指向它）→ 路由到 `process.queue` | **不能省**——DLX 必须是个已存在的交换机，`delay.queue` 声明时如果找不到它就报 `PRECONDITION_FAILED`。可以是**默认交换机 `""`**（但要确保 routing-key 对得上），也可以是 fanout/topic（看死信要路由到几个队列） |
>
> **最简方案**（只用默认交换机）：
> ```
> Producer → ""(默认交换机) → delay.queue(TTL + DLX="")
>           → TTL 到期死信 → ""(默认交换机) → process.queue（routing-key = x-dead-letter-routing-key）
> ```
> 两个自定义交换机都不建，全用 `""`。**但**生产环境一般还是建独立的 `process.exchange`——因为死信可能要按 routing-key 分流到不同消费队列（比如"30 分钟关单"和"2 小时退款提醒"走同一个 delay.queue、但 DLX 按 routing-key 分流到不同 process.queue）。
>
> **为什么示例里两个都用 direct？** 因为延迟队列的投递场景通常是"一对一"（发到 delay.queue、死信后到 process.queue），direct 足够。如果死信要**广播**给多个排查队列，`process.exchange` 换成 fanout；如果要**按 key 分流**，换 topic。交换机类型取决于**死信的路由需求**，DLX 机制本身不限制类型。

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

这个"延迟队列"的 Consumer 通常做**业务补偿**：关单、释放库存、发提醒。

### 6.3 底层原理：Broker 怎么知道消息到期了

看完代码，你可能会问：**消息在 delay.queue 里干等，Broker 怎么知道它什么时候该过期？是不是有条线程一直在倒计时？** 不是。Broker 用的是**打戳 + 懒检查**。

> **什么是"队头"？**
> RabbitMQ 队列是 **FIFO（先进先出）**：先入队的排前面、先被消费/检查。"队头" = 队列里**最老的那条消息**（最先入队的）。后面的消息排成一列，新来的排队尾。
> 懒检查**只看队头这一条**——它过期了就死信掉、下一条顶上；没过期就不管后面的。这是整个机制的效率核心：百万条消息，每次只查 1 条。

> **设定**：`delay.queue` 设了 `x-message-ttl = 10000`（10 秒），无 Consumer。你在 `t=0` 一次性发了 3 条消息 A、B、C。

**第一步——入队时打戳**（`t=0`）

Broker 不给每条消息倒计时，而是在**入队的那一刻**算好"它应该什么时候死"：

| 消息 | 入队时刻 | TTL | 过期时刻（打在消息上） | 队列位置 |
|------|----------|-----|------------------------|----------|
| A | t=0 | 10s | **t=10s** | 队头（最先入队、最老） |
| B | t=0 | 10s | **t=10s** | 第 2 |
| C | t=0 | 10s | **t=10s** | 第 3（最后入队、最新） |

到这里就结束了——**没有任何线程在"等"**，这三条消息只是安静地排着队，各自的元数据里写着"我 t=10s 过期"。

**第二步——懒检查（只在队头查）**（`t=10s` 之后）

从 t=0 到 t=10s 这段时间，Broker **完全不碰这三条消息**。到了 **t≈10s**（或周期扫到时），Broker 来看**队头**：

| 时刻 | 发生了什么 | 队列状态 |
|------|-----------|----------|
| t=0～t<10s | **什么都没发生**——没有定时器在跑，三条消息排队等着 | `[A(→10s), B(→10s), C(→10s)]` |
| t≈10s | Broker 周期性扫到队头 → **查 A：过期了吗？** 算一下 `now ≥ A 的过期时刻` → 10s ≥ 10s → **是的** → **A 死信！** | `[B(→10s), C(→10s)]` |
| **紧接着** | B 冒上来当**新队头** → Broker **立刻再查**：10s ≥ 10s → **过期** → **B 死信！** | `[C(→10s)]` |
| **紧接着** | C 冒上来 → 同上 → **C 死信！** | `[]` |

> **关键**：A 被死信后，B 立刻冒上来被查、也被死信；C 同理——三条消息**连续**被收割，几乎在同一时刻成为死信。这就是为什么"同时到期的消息会一连串死信"。

**第三步——Broker 会周期性地主动扫**

上面说的"t≈10s Broker 来看队头"——是谁触发的？是一个**周期性定时器**（整个队列级别只有一个，不是每条消息一个）。它每隔一小段时间扫一次队头：如果队头过期就死信掉、再查新的队头；如果没过期就等下一轮。所以**延迟队列没有消费者，消息也会正常到期**。

> **"周期扫描"具体多久扫一次？跟 TTL 设多少有关吗？**
> 不是固定"10 秒扫一次"——上面的 10s 是**示例里的 TTL 值**，不是扫描间隔。实际扫描频率由 Broker 内部决定，通常很短（毫秒到秒级）。而且 Broker **不只靠周期扫**——还有两个额外触发点：① **新消息入队时**顺便查一下队头（万一队头已过期呢）；② **消费者尝试取消息时**也查。三个触发叠加，确保消息不会过很久才被发现。

> **那如果 TTL 设的是 30 分钟呢？** 一样——消息入队时打过戳（t=0 入队、过期时刻 t=30min），Broker 周期性地扫队头。到了 t≈30min 时，队头消息的戳表明它过期了 → 死信。**TTL 的长短不影响扫描频率**，扫描是 Broker 的常规动作（不管 TTL 是 5 秒还是 30 分钟），只是检查的时候**比对一下时间戳**就知道了。

**后果——延迟不精确**

理论过期是 `t=10s`，但 Broker 可能 `t=10.2s` 才扫到（周期扫描的间隔）→ 消息**晚 0.2s** 才被死信。所以 **TTL + DLX 延迟是秒级精度**（通常误差在 1s 以内），不是毫秒精确。

### 6.4 队列级 TTL vs 单消息 TTL：延迟队列必须用前者

TTL 有两种设法，做延迟队列**只有一种能用**：

| | 队列级 `x-message-ttl` | 单消息 `expiration` |
|---|---|---|
| 怎么设 | 队列参数：`queueDeclare(..., {x-message-ttl: 5000})` | 发消息时逐条带：`props.expiration = "5000"` |
| 适用 | ✅ **延迟队列用这个** | ❌ 延迟队列别用 |
| 为什么 | 所有消息**同一个 TTL**，FIFO 入队 → **队头最老、也最先过期** → 懒检查按 FIFO 顺序正常收割，没毛病 | 各条 TTL 可以不同 → **乱序** |

**单消息 TTL 为什么会"队头阻塞"？** 举个具体例子——你在同一秒发了 3 条消息到 delay.queue，TTL 各不同：

| 队列顺序 | 消息 | TTL | 理论过期时刻（入队时刻 t=0） |
|----------|------|-----|------|
| 队头 | A | 30 秒 | t = 30s |
| 第 2 | B | 5 秒 | t = 5s |
| 第 3 | C | 5 秒 | t = 5s |

- **B 和 C 在 t=5s 就该过期了**。但它们排在 A 后面，而 A 还没过期（TTL=30s）。
- 懒检查只看**队头**——队头是 A，A 没过期 → Broker 不往下查 B 和 C。
- **B 和 C 被挡住了**，直到 t=30s 时 A 终于过期被死信、B 冒上来当新队头 → B 才被发现 → 但它其实早在 25 秒前就该死了。
- 结果：B 和 C 的延迟从 5 秒被拖成了 30 秒，**严重不准**。

> 一句话：**懒检查只查队头；队头是"最长 TTL"的消息时，后面短 TTL 的全被它挡住，这叫"队头阻塞"（head-of-line blocking）。** 用队列级 TTL（所有消息同一个 TTL）就没有这个问题——入队顺序 = 过期顺序，队头永远是最先过期的。

> **那单消息 `expiration` 到底有什么用？** 它不适合做延迟队列，但有两个正当用途：
> 1. **给个别消息设独立的"保质期"**——比如同一个队列里，普通订单消息不需要过期、但限时优惠的订单设 `expiration=300000`（5 分钟过期）。这种场景消息 TTL 各不同但**不在乎过期顺序精确性**，只需要"过期了别留着"。
> 2. **配合队列级 TTL 做"双上限"**——队列设 `x-message-ttl=60000`（所有消息最多 60 秒），某条临时消息再叠加 `expiration=5000`（这条只活 5 秒）。两者取**较小值**，即 `min(队列 TTL, 消息 TTL)` = 5 秒。队列级 TTL 兜底，消息级 TTL 更细。
>
> 一句话：**单消息 TTL 不是用来做延迟队列的（会队头阻塞），而是给单条消息设"个别保质期"或"双上限"用的。**

### 6.5 需要毫秒级精确延迟怎么办

TTL + DLX 这套方案做不到毫秒精确（扫描间隔 + 网络 + Broker 调度都有抖动）。如果业务**真的要求毫秒级**，几种替代方案：

| 方案 | 精度 | 原理 | 适用 |
|------|------|------|------|
| **Redis ZSet + 轮询** | 毫秒级（取决于轮询间隔） | 用 score 存过期时间戳，后台线程按间隔轮询取出 score ≤ now 的 | 短延迟、高精度、分布式 |
| **RocketMQ 延迟消息** | 秒级（固定级别）/ 毫秒级（5.x 任意延迟） | Broker 内置延迟级别（1s/5s/10s/…），5.x 支持任意毫秒 | 已用 RocketMQ 的项目 |
| **Java DelayQueue** | 毫秒级（单机） | `java.util.concurrent.DelayQueue`——每条元素自带到期时间，`take()` 阻塞到最近一条到期 | 进程内延迟、单机 |
| **ScheduledExecutorService** | 毫秒级（单机） | `schedule(task, delay, TimeUnit)` 精确调度一次性任务 | 进程内、不需要 MQ |
| **定时任务扫表** | 分钟级 | 数据库存 `expire_at` 字段，定时任务扫到期记录执行 | 量不大、精度要求低 |
| **时间轮（Netty HashedWheelTimer）** | 毫秒级 | 把时间分成 tick 格，每个 tick 对应一批到期任务，一轮 O(1) 添加 | 大量短延迟任务、进程内 |

> **怎么选？**
> - **已经用了 RabbitMQ、精度秒级够**（订单关单、提醒推送）→ **TTL + DLX**，不用引入新中间件。
> - **已经用了 RocketMQ** → 直接用它内置的延迟消息，精度更好。
> - **分布式 + 毫秒级** → **Redis ZSet**（score=过期时间戳 + 后台轮询）。
> - **单机进程内**（限流、超时控制、重试间隔）→ **DelayQueue / ScheduledExecutor / 时间轮**，不走 MQ。
> - **数据库里已有到期字段、量不大** → **定时任务扫表**，最简单。

下面给每种方案一段**最小核心代码**，点出各自的"延迟落点"在哪。各方案依赖的库版本（截至 2026-08，均已按官方文档核对 API）：

| 方案 | 依赖 | 核对版本 |
|------|------|---------|
| Redis ZSet | `redis.clients:jedis` | **5.2.0**（生产推荐用 `JedisPooled`，单连接 `Jedis` 非线程安全） |
| RocketMQ | `org.apache.rocketmq:rocketmq-client` | **5.5.0**（remoting 客户端；gRPC 客户端 `rocketmq-client-java` API 不同） |
| DelayQueue / ScheduledExecutor | JDK 标准库 | Java 8+（API 自 1.5 起，Java 21 LTS 仍稳定） |
| 定时扫表 | `com.baomidou:mybatis-plus` + Spring | **3.5.17** + Spring 5.3+/6.x |
| 时间轮 | `io.netty:netty-common` | **4.1.x**（Netty 5 已废弃，用 4.1） |

#### 方案一：Redis ZSet + 轮询

核心思路：**用 score 存过期时间戳**，后台线程按间隔扫 `score ≤ now` 的成员。

```java
// === 投递延迟任务 ===
long fireAt = System.currentTimeMillis() + 30_000;   // 30 秒后执行
jedis.zadd("delay:tasks", fireAt, "ORDER-001");      // member=任务ID（或 JSON 体）

// === 后台轮询线程：扫到期的任务 ===
while (!Thread.currentThread().isInterrupted()) {
    long now = System.currentTimeMillis();
    // 取出所有 score <= now 的（即已到期）
    // 注意：Jedis 4.x/5.x 起返回类型从 Set<Tuple> 改为 List<Tuple>
    List<Tuple> due = jedis.zrangeByScoreWithScores("delay:tasks", 0, now);
    for (Tuple t : due) {
        // ZREM 返回 1 才代表"我抢到了"——多实例部署时用 ZREM 做分布式抢锁
        if (jedis.zrem("delay:tasks", t.getElement()) == 1L) {
            execute(t.getElement());                  // 执行任务（关单/提醒）
        }
    }
    Thread.sleep(100);   // 轮询间隔=精度上限；要 10ms 精度就 sleep(10)
}
```

> 关键：**score 是过期时间戳、`zrangeByScore` 圈出到期范围、`zrem` 抢锁防多实例重复执行**。精度 = 轮询间隔。

#### 方案二：RocketMQ 延迟消息

核心思路：**发消息时指定延迟级别/时间，Broker 到点才把消息投给消费者**。

```java
// === 4.x：固定延迟级别（Level 1~18 = 1s/5s/10s/30s/1m/2m/3m/4m/5m/6m/7m/8m/9m/10m/20m/30m/1h/2h）===
Message msg = new Message("OrderTopic", "close", "ORDER-001".getBytes());
msg.setDelayTimeLevel(3);          // Level 3 = 10s 后投递
producer.send(msg);

// === 5.x：任意毫秒延迟（两种写法二选一）===
msg.setDelayTimeMs(30_000L);                                   // 相对延迟 30 秒
// 或绝对时刻：
// msg.setDeliverTimeMs(System.currentTimeMillis() + 30_000);
producer.send(msg);

// === 消费者照常写，Broker 到点才会把消息推给它 ===
// MessageListenerConcurrently 是双参数接口，lambda 必须带 context 形参
consumer.registerMessageListener((msgs, context) -> {
    for (MessageExt m : msgs) {
        System.out.println("执行关单: " + new String(m.getBody()));
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
});
```

> 关键：**延迟逻辑在 Broker 侧**，生产端发、消费端收，都不用自己写"等"。4.x 受 18 级限制（秒级），5.x 任意毫秒。

#### 方案三：Java DelayQueue（单机进程内）

核心思路：**每个元素自带"到期时刻"，`take()` 阻塞到最近一条到期**——JDK 自带，零依赖。

```java
// === 1. 任务实现 Delayed 接口 ===
class DelayTask implements Delayed {
    private final String orderId;
    private final long fireAt;        // 到期时刻
    DelayTask(String orderId, long delayMs) {
        this.orderId = orderId;
        this.fireAt = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delayMs);
    }
    // 剩余延迟：≤0 表示到期，DelayQueue 才允许 take() 出来
    @Override public long getDelay(TimeUnit unit) {
        return unit.convert(fireAt - System.nanoTime(), TimeUnit.NANOSECONDS);
    }
    // 队列内排序：到期早的排前
    @Override public int compareTo(Delayed o) {
        return Long.compare(this.fireAt, ((DelayTask) o).fireAt);
    }
}

// === 2. 投递 + 消费 ===
DelayQueue<DelayTask> dq = new DelayQueue<>();
dq.offer(new DelayTask("ORDER-001", 30_000));   // 30 秒后到期

while (true) {
    DelayTask t = dq.take();     // 阻塞，直到最近一条到期才返回（毫秒级精度）
    closeOrder(t.orderId);
}
```

> 关键：**`getDelay` 决定"何时能取"、`compareTo` 决定"谁先取"**。内部基于优先队列 + Leader-Follower，到期前不空轮询。

#### 方案四：ScheduledExecutorService（单机，一次性定时）

核心思路：**`schedule(task, delay, unit)` 直接调度一次性任务**，最简单的"X 秒后干 Y"。

```java
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

// 30 秒后执行关单（一次性）
scheduler.schedule(() -> closeOrder("ORDER-001"), 30, TimeUnit.SECONDS);

// 若要固定延迟重复执行（限流/心跳），换 scheduleAtFixedRate
// scheduler.scheduleAtFixedRate(() -> heartbeat(), 0, 5, TimeUnit.SECONDS);

scheduler.shutdown();   // 应用关闭时记得关，否则 JVM 不退出
```

> 关键：**比 DelayQueue 更轻——不用实现 Delayed 接口**。但进程重启任务就丢了，**不适合持久化的订单关单**（那得走 MQ 或 DB）。

#### 方案五：定时任务扫表（分钟级，最朴素）

核心思路：**业务表里存 `expire_at`，定时任务定期扫"已到期未处理"的记录**。

```java
// === 定时任务（Spring @Scheduled 为例，每分钟跑一次）===
@Scheduled(cron = "0 * * * * ?")
public void scanExpiredOrders() {
    // 扫所有"创建已超 30 分钟、且状态仍为待支付"的订单
    List<Order> due = orderMapper.selectList(
        new QueryWrapper<Order>()
            .eq("status", "UNPAID")
            .lt("expire_at", LocalDateTime.now())   // expire_at < now
    );
    for (Order o : due) {
        closeOrder(o.getId());
        o.setStatus("CLOSED");        // 改状态，避免下次重复扫
        orderMapper.updateById(o);
    }
}
```

```sql
-- 建表时就把过期时间算好存上（创建时刻 + 30 分钟）
expire_at DATETIME   -- 建索引：CREATE INDEX idx_expire ON orders(status, expire_at)
```

> 关键：**`expire_at` + `status` 联合索引**，扫表走索引而非全表。精度=扫表间隔（分钟级），但**最可靠、重启不丢**。

#### 方案六：时间轮（Netty HashedWheelTimer，大量短延迟）

核心思路：**把时间分成一个个 tick 格（像钟表表盘），落进同一格的任务一起到期触发**，添加任务 O(1)——适合**海量短延迟**（如连接超时控制）。

```java
// === 创建时间轮：512 个格子，每格 100ms ===
HashedWheelTimer timer = new HashedWheelTimer(
    Executors.defaultThreadFactory(),   // 线程工厂
    100, TimeUnit.MILLISECONDS,         // tickDuration：每格时长=精度
    512                                 // ticksPerWheel：格子数
);

// === 投递延迟任务（30 秒后执行）===
TimerTask task = timeout -> closeOrder("ORDER-001");
timer.newTimeout(task, 30, TimeUnit.SECONDS);   // 返回 Timeout，可 cancel()

// ⚠️ 不要紧跟 newTimeout 之后立即 stop()——
// 时间轮靠内部 worker 线程在 tick 推进时触发任务，立即 stop() 会让任务来不及执行就被取消。
// 正确做法：把 timer 作为长生命周期组件（如 @Bean），在应用关闭时才 stop()。
// stop() 返回 Set<Timeout>，是"已注册但未触发"的任务，需要的话可遍历补执行。
```

> 关键：**`tickDuration` 决定精度、`ticksPerWheel` 决定一轮多长**。任务到点由时间轮线程触发，海量任务下比 DelayQueue（堆，O(log n) 入队）更省内存、添加更快。

### 6.6 插件方案（了解）

`rabbitmq_delayed_message_exchange` 插件在 Exchange 层实现延迟，但**已停止维护**（它依赖的 Mnesia 在 4.3 被移除）。生产慎用，可评估改用 RocketMQ 等原生支持延迟的产品。

---

## 七、与 Quorum 毒消息的配合

第四节讲的普通死信队列,核心动作是**消费者自己 `basicNack(requeue=false)`**——"我知道这条处理不了,主动放弃它,你帮我转去 DLX"。那是 Classic 时代的标准做法:Broker 是个"甩手掌柜",你不说放弃,它就一直帮你重投。

问题是:**消费者崩溃、断连、或者代码有 bug 一直抛异常**时,根本走不到你写的那句 `nack(requeue=false)`——Broker 看到的只是"这条没 ack",于是默认 `requeue` 重投,再失败、再重投……**无限循环**,把消费者和队列一起拖垮。这就是经典的**毒消息(Poison Message)**问题。

Quorum 队列对此的解法是:把"重试几次后放弃"这套逻辑**下沉到 Broker**——叫 **Poison Message Handling**(毒消息处理)。不用消费者自己数第几次了,Broker 替你数,超限自动死信。

> 🔑 **一句话区分两种"放弃"**:
> - 第四节(普通 DLQ)= **消费者主动放弃**:"我处理不了,`requeue=false`,转走吧。"——**消费者判断**。
> - 第七节(Quorum 毒消息)= **Broker 强制放弃**:"你都失败 N 次了,我替你转走。"——**Broker 判断**。
>
> 前者是"我认输",后者是"裁判判你输"。生产环境两者常**配合用**:消费者该主动放弃时还主动放弃(快速失败),但就算消费者忘了或崩了,Quorum 的 delivery-limit 也会兜底。

### 7.1 两个参数:`x-delivery-limit` 和 `x-delivery-count`

| 参数 | 谁来设 / 在哪 | 作用 |
|------|--------------|------|
| `x-delivery-limit` | **队列参数**(声明时)或策略 `delivery-limit` | 设"最多投递几次"的阈值,如 `3` |
| `x-delivery-count` | **Broker 自动维护**,在消息 Header 里 | 这条消息已经被投递了几次(只读,你不用写) |

**`x-delivery-count` 从 0 开始数**——这是最容易踩的坑。具体语义:`count` 表示"这是第几次投递",**首次投递时 `count=0`**;每次消费失败(没 ack / nack requeue / 断连)导致重新入队,`count` 加 1,再投递;当 `count` **即将超过** `delivery-limit` 时,Broker 不再投递,直接把消息死信掉。

> **为什么是"limit+1"次投递?** 设 `x-delivery-limit=3`,实际投递发生在 `count=0,1,2,3`——**共 4 次**;当 `count` 涨到 4 时,`4 > 3`,Broker 判定超限,死信。所以"投递上限 = limit + 1"。记住 `count` 从 0 起,就不会算错。

| 投递序号 | `x-delivery-count` | 与 limit(=3) 比 | 发生了什么 |
|----------|---------------------|------------------|------------|
| 第 1 次 | 0 | 0 ≤ 3 | 正常投递,消费者失败 → requeue |
| 第 2 次 | 1 | 1 ≤ 3 | 正常投递,失败 → requeue |
| 第 3 次 | 2 | 2 ≤ 3 | 正常投递,失败 → requeue |
| 第 4 次 | 3 | 3 ≤ 3 | 正常投递,失败 → requeue(**这是最后一次正常投递**) |
| 第 5 次 | — | 4 > 3 | **判定超限 → 死信**(不会再投递给消费者了) |

> ⚠️ **只在 Quorum 队列上有**。`x-delivery-limit` 是 Quorum 的特性,Classic 队列声明这个参数会被忽略(Classic 没有内置计数器,毒消息只能靠消费者自己 `nack(requeue=false)`,即第四节的做法)。Stream 则连 DLX 都不支持。

### 7.2 必须同时配 DLX,否则超限消息"直接丢弃"

这是和第二节三种死信触发**最大的区别**,务必记住:

| 死信触发 | 不配 DLX 时会怎样 |
|----------|-------------------|
| 第二节① 拒绝(`requeue=false`) | 消息被丢弃 |
| 第二节② TTL 过期 | 消息被丢弃 |
| 第二节③ 队列超长 | 消息被丢弃 |
| **本节 Quorum 超过 delivery-limit** | **消息被丢弃** |

**四者本质一样**:死信机制 = "Broker 决定不再正常处理这条消息";**配了 `x-dead-letter-exchange`,它就被 republish 到 DLX(进 DLQ 供排查);没配,就静默 drop**。所以用 Quorum 毒消息处理,**`x-delivery-limit` 几乎总要和 `x-dead-letter-exchange` 一起挂**——否则超限消息消失得无影无踪,排查都没得查。

> 🔑 **记忆口诀**:`x-delivery-limit` 管"什么时候放弃",`x-dead-letter-exchange` 管"放弃后去哪"。**两个一起挂**,才是完整的毒消息兜底链路;只挂前者 = 光判刑不放逐(直接杀掉),只挂后者 = 没有判刑标准(消费者不主动放弃就永远不进 DLQ)。

### 7.3 完整示例:Quorum + DLX 自动处理毒消息

沿用第四节的拓扑风格(业务队列 + DLX + DLQ),区别只在于业务队列**改成 Quorum 类型**、多挂一个 `x-delivery-limit`,**消费者不再写 `requeue=false`**——让它自然失败、自然 requeue,Broker 自己数:

```java
// === Quorum 队列 + DLX:Broker 自动毒消息处理 ===

// 1) DLX + DLQ（和第四节一样，都是普通的 exchange / queue）
channel.exchangeDeclare("pay.dlx", BuiltinExchangeType.DIRECT, true);
channel.queueDeclare("pay.dlq", true, false, false, null);
channel.queueBind("pay.dlq", "pay.dlx", "dead");

// 2) 业务队列：Quorum 类型，挂 x-delivery-limit + x-dead-letter-exchange
Map<String, Object> args = new HashMap<>();
args.put("x-queue-type", "quorum");              // ← 关键：声明为 Quorum 队列
args.put("x-delivery-limit", 3);                 // 投递上限 = 4 次（count 0~3），超限死信
args.put("x-dead-letter-exchange", "pay.dlx");   // ← 必须配！否则超限消息直接丢弃
args.put("x-dead-letter-routing-key", "dead");
channel.queueDeclare("pay.queue", true, false, false, args);

// 3) 业务消费者：故意一直失败。注意 requeue=true（或不 nack）——
//    不用像第四节那样手动 requeue=false，让 Broker 自己数投递次数
channel.basicQos(1);
channel.basicConsume("pay.queue", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body)
            throws IOException {
        Object cnt = p.getHeaders().get("x-delivery-count");   // 0,1,2,3…（首次为 0）
        log.info("[消费] body={}, deliveryCount={}", new String(body), cnt);
        // 模拟毒消息：处理永远失败 → requeue=true 让它重新入队
        // Broker 每次 requeue 都递增 delivery-count，到 4 就自动死信
        channel.basicNack(env.getDeliveryTag(), false, true);  // requeue=true
    }
});

// 4) 死信消费者：接住超限毒消息，打印"案底"（见第五节）
channel.basicConsume("pay.dlq", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body)
            throws IOException {
        // Quorum 毒消息的 reason 是 delivery_limit_exceeded（区别于第二节的 rejected/expired/maxlen）
        String reason = "" + p.getHeaders().get("x-first-death-reason");
        log.info("[毒消息排查] body={}, reason={}", new String(body), reason);
        channel.basicAck(env.getDeliveryTag(), false);
    }
});

// 5) 发一条 → 消费者连续失败 4 次 → 第 5 次投递时 Broker 判定超限 → 死信进 pay.dlq
channel.basicPublish("", "pay.queue", MessageProperties.PERSISTENT_TEXT_PLAIN,
        "订单 PAY-001 支付回调".getBytes(StandardCharsets.UTF_8));
```

运行日志(消费者每次都失败):

```
[消费] body=订单 PAY-001 支付回调, deliveryCount=0   ← 第 1 次投递
[消费] body=订单 PAY-001 支付回调, deliveryCount=1   ← 第 2 次（requeue 后）
[消费] body=订单 PAY-001 支付回调, deliveryCount=2   ← 第 3 次
[消费] body=订单 PAY-001 支付回调, deliveryCount=3   ← 第 4 次（最后一次正常投递）
# 第 5 次：count=4 > limit=3，Broker 不再投递，直接死信
[毒消息排查] body=订单 PAY-001 支付回调, reason=delivery_limit_exceeded
```

> 注意 `reason=delivery_limit_exceeded`——这是**第四种**死信原因,只出现在 Quorum 的毒消息场景。前三种(`rejected`/`expired`/`maxlen`)是第二节那套,通用;这一种是 Quorum 独有。

### 7.4 四种死信原因,一张表收齐

第二节讲了三种,本节补上 Quorum 的第四种,合起来就是 RabbitMQ 死信原因的全集:

| `x-first-death-reason` | 含义 | 触发场景 | 是否通用 |
|------------------------|------|----------|----------|
| `rejected` | 消费者拒绝且不重投 | `basicReject`/`basicNack` 设 `requeue=false` | ✅ 所有支持 DLX 的队列 |
| `expired` | TTL 过期 | 消息在队列里超过 `x-message-ttl` | ✅ 所有支持 DLX 的队列(延迟队列靠它) |
| `maxlen` | 队列超长被挤掉 | 队列达到 `x-max-length` | ✅ 所有支持 DLX 的队列 |
| **`delivery_limit_exceeded`** | **投递次数超限** | **Quorum 队列 `x-delivery-limit` 超限** | ⚠️ **仅 Quorum** |

DLQ 的消费者可以按 `reason` 做差异化处理(第五节已示例):`rejected`/`delivery_limit_exceeded` 多半是毒消息,要看代码 bug;`expired` 是正常的延迟任务到期;`maxlen` 该告警扩容。

### 7.5 Classic vs Quorum:毒消息处理对比

| | Classic 队列 | Quorum 队列 |
|---|---|---|
| **谁来数重试次数** | 消费者自己数(或干脆不数) | **Broker 自动数**(`x-delivery-count`) |
| **超限后怎么办** | 消费者手动 `nack(requeue=false)` 触发死信 | **Broker 自动死信**(`delivery_limit_exceeded`) |
| **没主动放弃会怎样** | 默认 `requeue` → **无限重投**(毒消息陷阱) | 投递到 limit+1 次后自动停止 → 死信 |
| **要不要写计数逻辑** | ✅ 要(每个消费者都写一遍) | ❌ 不用,声明队列时挂个参数就行 |
| **可靠性兜底** | 靠开发者自觉,容易漏 | Broker 兜底,漏不了 |
| **适用** | 老项目、轻量场景 | **生产推荐**(消息持久化 + 自动毒消息处理) |

> 一句话:**Classic 时代,防毒消息是消费者自己的事(第四节那套手动 nack);Quorum 时代,这事 Broker 包了——你只管挂 `x-delivery-limit`,剩下的它兜底。** 但注意 Quorum 消费者仍可以主动 `nack(requeue=false)` 快速放弃(不用耗满 limit 次),两种机制是**叠加**的,不是二选一。

### 7.6 一个短板:重试之间没有延迟

Quorum 的 delivery-limit 只管"**限制次数**",不管"**间隔**"——每次 requeue 后 Broker **立刻**重新投递,中间没有退避(backoff)。这意味着:

- 如果失败是因为**下游服务短暂不可用**(比如数据库抖动、第三方接口 5 秒后恢复),立刻重试 4 次大概率全失败,消息白白进 DLQ。
- 想要"**延迟重试 / 指数退避**"(第 1 次失败等 1s、第 2 次等 5s、第 3 次等 30s 再重试),Quorum 原生不支持,得自己搭。

**怎么补?** 正好用上第六节的延迟队列——搭一条"重试队列"链路:

```
消费失败(requeue=false) → DLX → 重试Queue(挂 TTL，如 5s + 再挂 DLX 指回业务队列)
                                └─ TTL 到期成死信 → 转回业务队列(实现"延迟 N 秒后重试")
```

多级重试就多挂几条不同 TTL 的重试队列(1s / 5s / 30s),靠 `x-death` 里的重试次数决定走哪一级。这套"**TTL + DLX 做延迟重试**"是 RabbitMQ 实现退避的常见模式,本质就是第六节延迟队列的复用——**延迟队列不止能做定时任务,还能做"慢一点的重试"**。

> 对比一下其他 MQ:RocketMQ 的消费重试**内置指数退避**(默认 1s/5s/10s/30s/…/2h,共 16 次),Kafka 没有内置重试但常配 retry topic 实现。RabbitMQ 这块需要自己用 TTL+DLX 拼,是它消息处理上相对"原始"的地方——也是为什么第六节把延迟队列讲得那么细。

---

## 八、多级死信与死信链

第七节 7.6 留了个引子:RabbitMQ 的退避重试要用"TTL + DLX 自己拼"。但拼着拼着自然会冒出一个问题——**死信进了 DLQ 之后,DLQ 里的消息要是又"处理不了",还能不能再死信一次?DLQ 能不能再挂 DLX,往下再套一层?**

答案是:**能**。这一节就把"多级死信"讲透——它怎么搭、怎么用,以及一个会让队列原地爆炸的致命陷阱。

### 8.1 为什么能套娃:DLQ 就是普通队列

回到第一节的那个关键认知:**DLX 和 DLQ 都是普通的 exchange / queue,没有任何"死信专用"的特殊性**。普通队列能挂 `x-dead-letter-exchange`,DLQ 自然也能挂。于是死信可以一级一级往下传:

```
  Q1 ──(DLX1)──▶ DLQ1 ──(DLX2)──▶ DLQ2 ──(DLX3)──▶ DLQ3（终点，不再挂 DLX）
 业务队列        一级死信队列       二级死信队列        终坑（停车场）
```

每死信一次,消息就在 `x-death` Header 数组里**追加一条记录**(第五节讲过的"案底"),所以一条消息的"死亡履历"会越来越长——你随时能从 Header 里读出它"死过几次、分别死在哪些队列"。

> 🔑 **一句话:多级死信不是什么高级特性,就是"普通队列反复挂 DLX"的自然结果。** 能套几层没有硬限制,但——套错了会出大事(见 8.5)。

### 8.2 两个典型场景

**场景 A:分层延迟重试(逐级加大延迟)**

承接 7.6——消费者失败后,不要立刻重试,而是按"第几次失败"投到不同 TTL 的重试队列,到期再投回业务队列:

```
                    ┌─ retry.queue.5s  （TTL=5s，  DLX=back→业务队列）
业务 pay.queue ───▶ retry.exchange（topic）
                    └─ retry.queue.30s （TTL=30s， DLX=back→业务队列）
                                                          │
                        TTL 到期死信 ◀── 无消费者，干等到点 ─┘
                                          │
                                          ▼
                                     业务队列（带着更长的 x-death 履历重新投递）
                                          │
                                 失败次数超上限 ──▶ 终坑 dlq（不再挂 DLX）
```

第 1 次失败 → 进 `retry.queue.5s`(等 5 秒重试);第 2 次失败 → 进 `retry.queue.30s`(等 30 秒重试);超过上限 → 进终坑。这就是 RabbitMQ 版的"指数退避"。

**场景 B:按死因分流(一个 DLX 接多个 DLQ)**

一个业务队列的 DLX 用 `topic`/`headers` 类型,把**不同死因**的死信路由到不同 DLQ,各自走不同处理:

```
业务队列（挂 DLX=pay.dlx，类型=topic）
   ├─ key=order.expired   ──▶ DLQ-expired  （TTL 过期 → 执行关单，预期路径）
   ├─ key=order.rejected  ──▶ DLQ-rejected （消费拒绝 → 排查 bug）
   └─ key=order.overflow  ──▶ DLQ-overflow （超长挤掉 → 告警扩容）
```

> ⚠️ **一个硬限制:死信那一刻的 routing-key 是固定的**(由原消息 key 或 `x-dead-letter-routing-key` 决定),**不能动态按"死过几次"改路由**。所以"按死因分流"可行(死因能反映到 key 上),但"按次数分流"做不到——想做按次数分流,得靠**消费者主动 publish**(见 8.4),而不是靠 nack 触发的自动死信。

### 8.3 怎么知道"死过几次":读 `x-death` 数组(注意 count 去重)

第五节讲过 `x-first-death-*` 三个 Header(只记首次死信,不可变)。多级死信场景下,真正有用的是 **`x-death` 数组**——它记录**每一次**死信事件,是完整的死亡履历。但这里有个 RabbitMQ 的去重机制,踩坑率极高:

> **`x-death` 数组的去重规则**:消息每死信一次,Broker 先看"这次死信的 `(队列, 原因)` 组合,数组里有没有记过":
> - **没记过** → **新增一条**记录 `{queue, reason, time, count: 1, ...}`;
> - **记过** → **不新增**,只把那条记录的 `count` 字段 **+1**。
>
> 也就是说:**数组长度 = 经过的不同"(队列,原因)"组合数,不等于总死信次数**。一条消息在同一个队列因同一种原因被死信 100 次,`x-death` 数组里仍然只有 **1 条**记录,只是它的 `count=100`。

所以判断"这条消息总共死过几次",**不能数数组长度**,要**累加每条记录的 `count`**:

```java
/** 累加 x-death 数组里所有 count，得到"总死信次数"。 */
@SuppressWarnings("unchecked")
private static int totalDeaths(Map<String, Object> headers) {
    if (headers == null) return 0;
    Object xDeath = headers.get("x-death");
    if (!(xDeath instanceof List)) return 0;          // 没死过信
    int sum = 0;
    for (Object entry : (List<?>) xDeath) {
        if (entry instanceof Map) {
            Object count = ((Map<String, Object>) entry).get("count");
            if (count instanceof Number) {
                sum += ((Number) count).intValue();   // 各条记录的 count 累加
            }
        }
    }
    return sum;
}
```

> **什么时候数组长度刚好等于死信次数?** 只有"链式多级死信、且每级队列只死一次"的场景——比如场景 A 里消息依次经过 `pay.queue → retry.5s → pay.queue → retry.30s → ...`,每级是不同队列,不会触发去重。但**只要某个队列上消息被反复死信**(比如业务队列连续失败),`count` 就会 >1,这时数组长度的算法就失灵了。**永远累加 `count`,最稳。**

### 8.4 完整代码:分层延迟重试链

下面是场景 A 的完整实现。注意核心技巧:**消费者失败后不靠 `nack` 触发死信,而是主动 `basicPublish` 到对应 TTL 的重试队列,再 `ack` 掉当前消息**——这样 routing-key 完全由代码控制,能按次数动态分流(绕开 8.2 那个 routing-key 固定的限制)。

```java
// === 分层延迟重试：失败 → 按"第几次"投到不同 TTL 队列 → 到期投回业务队列 → 超上限进终坑 ===
// 拓扑：
//   pay.queue（业务）──失败──▶ 消费者按次数 publish ──▶ retry.exchange（topic）
//                                                          ├─ retry.5s  (TTL=5s,  DLX=back→pay.queue)
//                                                          └─ retry.30s (TTL=30s, DLX=back→pay.queue)
//   retry 队列无消费者，TTL 到期死信 → back.exchange → pay.queue（带着更长的 x-death 回来）
//   次数超上限 → publish 到 dlx → dlq（终坑）

// 1) 业务队列及其 DLX（终坑用）
channel.exchangeDeclare("pay.dlx",  BuiltinExchangeType.DIRECT, true);
channel.queueDeclare("pay.dlq", true, false, false, null);        // 终坑，不挂 DLX
channel.queueBind("pay.dlq", "pay.dlx", "dead");

// 2) 两条重试队列：各自 TTL + 都把 DLX 指向 back.exchange（到期投回业务队列）
channel.exchangeDeclare("back.exchange", BuiltinExchangeType.DIRECT, true);
channel.queueBind("pay.queue", "back.exchange", "pay");           // 业务队列绑到 back.exchange

channel.exchangeDeclare("retry.exchange", BuiltinExchangeType.TOPIC, true);

Map<String, Object> r5 = new HashMap<>();
r5.put("x-message-ttl", 5_000);                                   // 第 1 级：等 5 秒
r5.put("x-dead-letter-exchange", "back.exchange");
r5.put("x-dead-letter-routing-key", "pay");
channel.queueDeclare("retry.5s", true, false, false, r5);
channel.queueBind("retry.5s", "retry.exchange", "retry.1");

Map<String, Object> r30 = new HashMap<>();
r30.put("x-message-ttl", 30_000);                                 // 第 2 级：等 30 秒
r30.put("x-dead-letter-exchange", "back.exchange");
r30.put("x-dead-letter-routing-key", "pay");
channel.queueDeclare("retry.30s", true, false, false, r30);
channel.queueBind("retry.30s", "retry.exchange", "retry.2");

// 3) 业务消费者：失败后按"已死次数"决定去哪一级，或进终坑
channel.basicQos(1);
channel.basicConsume("pay.queue", false, new DefaultConsumer(channel) {
    @Override
    public void handleDelivery(String c, Envelope env, AMQP.BasicProperties p, byte[] body)
            throws IOException {
        try {
            doBusiness(body);                                     // 业务逻辑
            channel.basicAck(env.getDeliveryTag(), false);
        } catch (Exception e) {
            int deaths = totalDeaths(p.getHeaders());             // 累计死过几次（含本次之前的）
            if (deaths >= 2) {
                // 已经重试过 2 级还失败 → 进终坑
                channel.basicPublish("pay.dlx", "dead",
                        MessageProperties.PERSISTENT_TEXT_PLAIN, body);
                log.warn("[终坑] 已死 {} 次，丢弃到 dlq", deaths);
            } else {
                // 第 1 次失败 → retry.1(5s)；第 2 次 → retry.2(30s)
                String level = (deaths == 0) ? "retry.1" : "retry.2";
                channel.basicPublish("retry.exchange", level,
                        MessageProperties.PERSISTENT_TEXT_PLAIN, body);
                log.info("[重试] 第 {} 次失败，投到 {}", deaths + 1, level);
            }
            channel.basicAck(env.getDeliveryTag(), false);        // 当前消息处理完毕（已转走），ack 掉
        }
    }
});
```

流转示意(一条永远失败的消息):

```
发到 pay.queue → 消费失败(deaths=0) → publish 到 retry.1 → ack
  retry.5s 干等 5s → TTL 到期死信 → back.exchange → pay.queue（x-death 多一条）
    → 消费失败(deaths=1) → publish 到 retry.2 → ack
      retry.30s 干等 30s → TTL 到期死信 → back.exchange → pay.queue（x-death 再多一条）
        → 消费失败(deaths=2 ≥ 上限) → publish 到 pay.dlx → pay.dlq（终坑，停止）
```

> 这个"消费者主动 publish 转投"的模式,就是 Spring AMQP `RepublishMessageRecoverer` 的底层原理——框架帮你封装了"读次数 + 选目标 + 转发 + ack"这套动作。理解了上面这段裸 Java 代码,再用框架就知其所以然。

### 8.5 致命陷阱:Broker 不防死信环路

这是多级死信最容易翻车的地方,务必记住:**RabbitMQ 没有任何死信循环检测**。

如果你让 `pay.queue` 的 DLX 指向 `q.a`、又让 `q.a` 的 DLX 指回 `pay.queue`(或经过一串队列绕回起点),Broker **不会报错、不会拦截**,消息会**无限循环死信**:

```
  pay.queue ──(DLX)──▶ q.a ──(DLX)──▶ q.b ──(DLX)──▶ pay.queue   ← 环路！
                                                                     Broker 全程静默
```

后果是连锁的、且**没有任何告警**:

| 后果 | 怎么发生 |
|------|----------|
| **CPU / IO 飙满** | 消息被无限 republish,Broker 一直在写 Raft 日志(Quorum)或刷盘 |
| **磁盘打爆** | 每次死信都往 `x-death` 追加(或 count+1),**消息体只增不减**,越循环越胖 |
| **监控无感** | Broker 觉得自己"正常工作",队列流量看起来就是"一直在闪",不报错 |

防环路,两条铁律:

1. **链式拓扑必须有明确的终点**——最后一级 DLQ(终坑)**不要挂 DLX**,作为停车场,消息到了就永久停留等人工处理。像 8.4 的 `pay.dlq`、两级链里的末级队列。
2. **应用层用 `x-death` 的 count 累加值做断路**——消费者读到总死信次数 ≥ 上限时,走"转终坑 / 归档 / 丢弃"分支,**绝不再触发新的死信**(8.4 代码里 `deaths >= 2` 那个分支就是断路器)。

> 🔑 **一句话:Broker 只管"你让我转我就转",转去哪、会不会绕回起点,它一概不管。** 防环路的全部责任在应用层——给链路设终点 + 按 `x-death` 次数断路,缺一不可。

### 8.6 多级死信 vs Quorum 毒消息:别混了

初学者容易把"多级死信"和第七节的"Quorum 毒消息处理"搞混,这里点清区别:

| | Quorum 毒消息(第七节) | 多级死信(本节) |
|---|---|---|
| **解决什么** | 同一队列内"反复投递失败"的次数限制 | 跨队列"逐级处理失败"的分层兜底 |
| **谁数次数** | Broker(`x-delivery-count`) | 应用层(读 `x-death` 累加 count) |
| **重试有延迟吗** | ❌ 没有(立刻 requeue) | ✅ 有(TTL 队列做延迟) |
| **典型用法** | 兜底防毒消息拖垮队列 | 分层退避重试 / 按死因分流 |
| **触发动作** | Broker 自动死信 | 消费者主动 publish 转投 |

两者**配合**而非互斥:Quorum 队列挂 `x-delivery-limit` 做"同一队列内的次数兜底",消费者再用多级死信链做"跨队列的延迟重试"——双保险。第七节 7.6 留的"退避怎么补"问题,答案就是本节这套分层重试链。

### 8.7 应用场景:多级死信/死信链都用在哪

上面几节偏原理,这一节落到**真实业务**——多级死信和死信链到底解决什么问题。按"分层重试"和"按死因分流"两条主线,各举几个典型场景。

#### 场景一:分层退避重试——下游抖动时的"慢重试"

这是 8.4 代码实现的那套,核心是**逐级加大延迟**,给下游恢复时间。典型业务:

| 业务 | 第 1 次失败 | 第 2 次 | 第 3 次 | 终坑 |
|------|------------|---------|---------|------|
| **支付回调** → 调银行接口 | 等 5s 重试 | 等 30s | 等 2min | 人工对账 |
| **发短信/邮件** → 调第三方 | 等 10s | 等 1min | 等 5min | 记录后放弃(非核心) |
| **同步数据到 ES** → 写索引失败 | 等 5s | 等 30s | 等 5min | 转离线补偿任务 |

为什么非要"慢重试"而不是立刻重投?因为**下游故障通常是瞬时的**(数据库抖动 3 秒、第三方限流 1 分钟)。立刻重试 N 次大概率全失败,消息白进 DLQ;而延迟重试能给下游恢复窗口,**大量消息在第 2、3 次重试时成功**,真正进终坑的极少。RabbitMQ 没有原生退避,所以这套链路是高频面试题也是高频生产实践。

#### 场景二:按死因分流——一个队列的多种"善后"

业务队列的 DLX 用 topic/headers,**按死信原因路由到不同 DLQ,各自走不同处理路径**:

```
订单业务队列（挂 DLX，topic）
   ├─ expired  → DLQ-执行关单    （TTL 过期 = 30 分钟未支付 → 这是预期，自动关单）
   ├─ rejected → DLQ-排查 bug    （消费者拒绝 = 代码/数据问题 → 告警人工介入）
   └─ overflow → DLQ-告警扩容    （队列超长 = 消费跟不上 → 触发扩容/限流）
```

关键洞察:**同样是死信,"正常"和"异常"要分开处理**。`expired` 是业务设计好的(订单超时关单、验证码过期),进 DLQ 是**预期路径**,消费者该主动干活(关单、清理);而 `rejected`/`overflow` 是**异常路径**,进 DLQ 是为了排查告警。混在一个 DLQ 里,要么漏处理、要么误处理——分流后各司其职。

#### 场景三:多级兜底——金融/支付的高可靠链路

金融场景对"消息绝对不能丢"要求极高,常搭**多级 DLQ** 做"逐级降级",每丢一级、可靠性手段就更重:

```
支付队列 → DLQ1(5s 后重试)
              ├─ 仍失败 → DLQ2(30s 后重试 + 通知值班)
              ├─ 仍失败 → DLQ3(转人工对账队列 + 电话告警)
              └─ DLQ3 也处理不了 → 冷备归档(DB 落库，永久留存)
```

每一级的语义:**先尝试自动恢复(重试)→ 再升级通知(告警)→ 最后人工兜底(对账)→ 终极归档(不丢数据)**。`x-death` 履历让任何一级的消费者都能知道"这条消息已经挣扎过几级",决定是继续转还是彻底归档。银行、支付、对账系统常见这种拓扑。

#### 场景四:延迟任务的"多档定时"——复用死信链做定时器

第六节讲过 TTL+DLX 做延迟队列(订单 30 分钟关单)。多级死信能把**不同时长的定时任务**塞进同一套链路,按 routing-key 分流:

```
定时 DLX（topic）
   ├─ delay.5min   → queue(挂 TTL=5min,  DLX→执行队列)   ← 验证码 5 分钟过期
   ├─ delay.30min  → queue(挂 TTL=30min, DLX→执行队列)   ← 订单 30 分钟关单
   └─ delay.24h    → queue(挂 TTL=24h,  DLX→执行队列)   ← 会员到期 24 小时提醒
```

发消息时带不同 routing-key(`delay.5min` / `delay.30min`),各自进对应 TTL 队列,到期后都汇到同一个执行队列。**一套死信链搞定多个定时时长**,比每个时长单独搭一套清爽。本质是第六节延迟队列的"多档版",用的还是同一个 DLX 机制。

#### 场景五:跨系统补偿——死信链对接异构系统

微服务架构里,消息最终消费失败往往要**回退到另一个系统做补偿**,死信链正好当"跨系统转接器":

```
订单服务队列 → 消费失败 → DLQ
                              ├─ 死因=库存不足  → 转发到「库存服务」的补偿队列（释放预占库存）
                              ├─ 死因=优惠券失效 → 转发到「营销服务」的通知队列（通知用户重选）
                              └─ 死因=系统异常  → 转发到「工单系统」（生成排查工单）
```

DLQ 的消费者读 `x-first-death-reason` 或业务错误码,**主动 publish 到对应系统的队列**,完成跨服务补偿。这里 DLQ 已经不只是"垃圾桶",而是**补偿路由中枢**——不同失败原因路由到不同下游系统善后。

> **一句话总结这五个场景**:多级死信/死信链的本质是**给"失败"分级处理**——
> - **分层重试**(场景一):按"第几次失败"给延迟,应对下游抖动;
> - **按死因分流**(场景二、五):按"为什么失败"走不同善后路径;
> - **多级兜底**(场景三):按"可靠性等级"逐级升级,确保不丢数据;
> - **多档定时**(场景四):复用 TTL 队列,一套链路支持多个定时时长。
>
> 逃不出"**给失败分类、分级、分流**"这几个维度。想清楚你的业务属于哪一类,就知道该搭几级、每级配什么 TTL、终坑放哪。

---

## 小结

| 要点 | 内容 |
|------|------|
| 死信是什么 | 消息在队列里"没法正常消费"了：拒绝(requeue=false) / TTL 过期 / 队列超长（Quorum 还有第四种：投递超限） |
| DLX / DLQ | **都是普通的 exchange / queue**，靠业务队列上的 `x-dead-letter-exchange` 参数串起来 |
| 流转 | 业务队列 →（成死信，Broker 自动 republish）→ DLX → 死信队列 → 消费者 |
| 配置 | 业务队列挂 `x-dead-letter-exchange`（可选 routing-key）；可用策略批量 |
| 延迟队列 | TTL 暂存（无消费者）+ DLX 转发；用队列级 `x-message-ttl`（非单消息 `expiration`） |
| 延迟 vs 普通 DLQ | 同一套 DLX 机制——延迟是"故意等到点"（预期），DLQ 是"出错了接住"（异常） |
| TTL 过期原理 | 打戳（入队时算过期时刻）+ 懒检查（只查队头）；秒级精度 |
| Quorum 毒消息 | `x-delivery-limit`(投递上限=limit+1 次)+ 必配 `x-dead-letter-exchange`,超限 reason=`delivery_limit_exceeded`;仅 Quorum,无退避延迟(靠 TTL+DLX 自拼) |
| 多级死信 | DLQ 是普通队列,可再挂 DLX 套娃;按 `x-death` 累加 count 判次数(同队同因会去重);**Broker 不防环路**——需设终坑 + 应用层断路 |
| 限制 | Stream 不支持 DLX |

下一篇：Sharding 插件——单队列吞吐不够时如何分片存储。
