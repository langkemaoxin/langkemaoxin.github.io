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

![TTL + 死信实现延迟队列流程](/中间件/rabbitmq/14/p12-01.png)

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

### 6.6 插件方案（了解）

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
| 延迟队列 | TTL 暂存（无消费者）+ DLX 转发；用队列级 `x-message-ttl`（非单消息 `expiration`） |
| 延迟 vs 普通 DLQ | 同一套 DLX 机制——延迟是"故意等到点"（预期），DLQ 是"出错了接住"（异常） |
| TTL 过期原理 | 打戳（入队时算过期时刻）+ 懒检查（只查队头）；秒级精度 |
| 限制 | Stream 不支持 DLX |

下一篇：Sharding 插件——单队列吞吐不够时如何分片存储。
