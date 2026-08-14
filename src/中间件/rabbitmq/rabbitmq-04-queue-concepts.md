---
title: "RabbitMQ 队列核心概念——命名、顺序、优先级与策略"
sidebarGroup: "RabbitMQ"
shortTitle: "04 队列核心概念"
order: 4
date: 2026-08-28
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 4/22 篇**
> 上一篇：[《RabbitMQ 基础编程模型——从连接到消费》](/中间件/rabbitmq/rabbitmq-03-programming-model)
> 下一篇预告：[《RabbitMQ 常用消息场景——Work、Pub/Sub、Routing、Topic》](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)

---

## 开头：会 queueDeclare 了，但这些"潜规则"你未必知道

上一篇你已经写过 `queueDeclare(queue, durable, exclusive, autoDelete, arguments)`，能把队列建起来收发消息。但真到生产，一堆问题会冒出来：

- 队列名能随便起吗？为什么 `amq.` 开头会报错？
- 两个消费者抢一个队列，**消息顺序还保得住吗**？
- 想让紧急消息插队，怎么搞**优先级**？
- TTL、最大长度这些参数，写死在代码里还是用 **policy**？谁覆盖谁？
- 一个队列顶不住吞吐，为什么官方说"**单队列是反模式**"？

这些都不是某一种队列类型（Classic/Quorum/Stream，见 [06 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)）的事，而是**所有队列共有的核心概念**。本篇把它们一次讲清。`queueDeclare` 五参数与手动 ACK 已在 [03 编程模型](/中间件/rabbitmq/rabbitmq-03-programming-model) 讲过；持久化三条件本篇第七节展开，这里不重复，只在需要时链回去。

---

## 一、队列名：规则与"服务端命名"

队列名让应用能引用队列。规则不多但都是坑：

| 规则 | 说明 |
|------|------|
| **长度** | 最多 **255 字节** UTF-8 |
| **保留前缀** | `amq.` 开头是 Broker 内部保留的；强行声明会触发通道级异常，reply code **403 `ACCESS_REFUSED`** |
| **服务端命名** | 队列名传**空串 `""`**，由 Broker 生成唯一名 |

服务端命名有个容易忽略的细节：**同一个 Channel 会"记住"上一次服务端生成的队列名**，后续在该 Channel 里用空串当队列名，指的就是刚才那条。所以临时队列用完用同一个 Channel 操作即可，不必把名字传来传去。

> **建议**：`exclusive` 队列几乎总是应该用服务端命名（见第六节）——它本就是连接私有的，用固定名反而在重连时和 Broker 的删除操作产生竞态。

---

## 二、属性与"声明等价"

队列有 5 个属性（`name / durable / exclusive / autoDelete / arguments`），详见 [03 的 queueDeclare 参数详解](/中间件/rabbitmq/rabbitmq-03-programming-model)。这里只补一条贯穿所有属性的铁律——**声明等价（Declaration Equivalence）**：

> 用**相同名字**重复声明队列时，**所有属性必须一致**；不一致就触发通道级异常，reply code **406 `PRECONDITION_FAILED`**，Channel 随即关闭。

常见踩坑：先用 `durable=false` 建过队列，后来代码改成 `durable=true`，一声明就 `PRECONDITION_FAILED`。**解法只有一个：先在管理台把旧队列删掉**，再用新参数声明。

> **例外**：`queue type`（队列类型）这一项的等价检查可以**放宽**，或通过 Virtual Host 的 **默认队列类型（DQT）** 配置，避免类型不一致直接报错。

---

## 三、x-arguments 与 Policy：参数该写在哪

`arguments`（AMQP 里的 `x-arguments`）是个 key/value 字典，承载 TTL、最大长度、优先级、队列类型等。同一个参数有**三种**来源，优先级很关键：

```
operator policy  >  client x-arguments  >  (user) policy
        └─ 数值类取三者中的较小值（lower wins）
```

| 来源 | 谁配 | 特点 |
|------|------|------|
| **client x-arguments** | 应用代码里声明队列时传 | 改要重新发版；**有些参数只能这么设**（声明时确定、终身不可改） |
| **policy** | 运维在管理台 / `rabbitmqctl set_policy` | 不用改代码、可批量作用于一组队列，**推荐优先用** |
| **operator policy** | 管理员 | **保护性护栏**，覆盖前两者，防止应用配出离谱的值 |

两条要点：

- **能用 policy 就别写进代码**。TTL、最大长度这类，policy 更灵活、不侵入应用。
- **但有些参数只能声明时由客户端设**，policy 改不了——典型是 `x-queue-type`（队列类型）和 `x-max-priority`（最大优先级数），它们必须在 `queueDeclare` 那一刻就定死。
- **数值类（如最大长度、TTL）冲突时取较小值**：operator policy 是上限护栏，应用想用更小的值允许，更大的会被压回 operator 设的上限。

---

## 四、消息顺序：FIFO 不是万能保证

先确认一个前提：**消息的最终落脚点只能是队列**。Producer 发出的消息先到 Exchange，但 **Exchange 不存消息**——它只按 routing key + binding 把消息**路由**到队列，路由完就撒手。所以"消息排队"这件事全发生在**队列**里，本节讨论的"顺序"也都是**队列层面**的顺序。

那队列里是不是"一条接一条严格有序"？RabbitMQ **尽力**保序，但不是绝对。理解顺序要看两层：

**入队**：同一条 Channel 上发布的消息，按发布顺序进入每个被路由到的队列；**多条 Channel / 连接**并发发布时，各自序列会**交错**。

**出队**：默认按入队顺序投递给消费者——**除非**发生下面两种情况：

| 乱序诱因 | 说明 |
|----------|------|
| **消息优先级** | 高优先级消息会插到低优先级前面投递（见第五节） |
| **多消费者 + 重投** | Broker 仍是 FIFO 出队，但消费者 **nack 后 requeue**、或 Channel/连接带着未 ack 的消息断开，都会把消息塞回队列，打乱实际送达顺序。重投的消息会被打标记：AMQP 0-9-1 `redelivered=true`、AMQP 1.0 `first-acquirer=false` |

### 想严格保序怎么办

先记住根因：**顺序几乎都是被「多个消费者并发处理」或「失败消息被塞回队列插队」弄乱的**。所以保序的思路就两条——**同一时刻只让一个消费者处理**，且**失败的消息别插队**。下面的方案都围绕这两点。

**方案一：换 Stream（最省心）。**

Stream 是只追加、不可改的日志，每条消息发布时就分到一个**永远不变的 offset**——顺序天生「焊」在日志里。多个消费者各按自己的 offset 往前读，互不干扰。如果你能接受 Stream 的消费模型（读了不删、靠 retention 清理），这是保序最干净的方案。声明与消费见 [队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)。

理解 Stream 与普通队列在「取消息」上的根本差异，就明白为什么它的保序这么干净——**普通队列是「排队消费、取走即删」，Stream 是「按位置读、可重放」**：

| | Classic / Quorum | Stream |
|---|---|---|
| 内部结构 | FIFO 队列（先进先出） | 只追加日志（append-only log） |
| 消费一条后 | **删除**（ack 后出队，再也读不到） | **不删**，留在日志里，靠 retention 清理 |
| 怎么读 | 只能从队头往后、取一条少一条 | 按 **offset** 读，可从**任意位置**开始、能来回重放 |
| 一条消息能消费几次 | 一次（ack 后没了） | 多次（不同消费者、或同一消费者重跑） |

所以"顺序"在普通队列里是**入队顺序**、靠 FIFO 维持；在 Stream 里是**写入顺序**、靠 offset 焊死——后者不受多消费者并发、requeue 插队这些因素干扰，顺序自然更硬。这也正是 [08 死信/延迟](/中间件/rabbitmq/rabbitmq-08-dlx-delay) 里「懒检查只看队头」的前提——它依赖 Classic/Quorum 的 FIFO（队头永远是最老那条）；换成 Stream，"队头"这个概念就不成立了。

**方案二：还用队列，用「单一活跃消费者」收束成串行。**

不想换 Stream，就让队列**同一时刻只有一个消费者在干活**——这就是 **Single Active Consumer（SAC）**：声明时加 `x-single-active-consumer=true`，由集群保证同一时刻只有一个消费者收到消息，它挂了才换下一个（官方原话：SAC is "useful for preserving message order"）。最朴素的等价做法，就是干脆一个队列只挂一个消费者。

```java
Map<String, Object> args = Map.of("x-single-active-consumer", true);
channel.queueDeclare("ordered.queue", true, false, false, args);
```

SAC 解决了「多个消费者并发」这一半；要**严格**到逐条有序，再加两条：

- **prefetch 设成 1**：让这个消费者每次只拿一条、处理完（ack 或 nack）再拿下一条。这样即便某条失败被退回重投，也不会越过后续消息。代价是吞吐降低——这是严格保序的必然成本。
- **消费逻辑本身别开多线程**：SAC 只保证「broker 这一端」一次发一条；消费者内部又开线程池并行处理的话，完成顺序照样会乱。

还有两个运维上的坑：

- **别用 `basic.get`（拉模式）做有序消费**，用 `basicConsume`（推模式）；要停消费者时**关掉 Channel** 而不是 `basic.cancel`，未 ack 的消息才会按原顺序回到队列。
- **毒消息要兜底**：一条总失败的消息会被无限重投、堵住后续。Quorum 队列配 `x-delivery-limit`（4.0 起默认 20），超限丢弃或转死信，别让它一直占位。

**既想并发、又想按业务键保序？** 比如同一个订单 ID 必须有序、不同订单可以并行——用 **`x-modulus-hash` 交换机 + 每队列 SAC**：exchange 按路由键 hash 把消息**稳定地**分到多个队列（同一键永远进同一队列，重启也不变），每个队列各跑一个 SAC。于是「不同键并行、同键严格有序」兼得，这正是 [分片](/中间件/rabbitmq/rabbitmq-09-sharding) 的底子。

---

## 五、优先级队列

优先级是**可选特性**，默认不开。要开，声明队列时设 `x-max-priority`：

```java
Map<String, Object> args = Map.of("x-max-priority", 10);
channel.queueDeclare("priority.queue", true, false, false, args);
```

发布时在消息属性里带 `priority` 字段指定这条消息的优先级（0 ~ `x-max-priority`）。**高优先级先投**——这也是上一节"顺序会被打乱"的来源之一。

> **建议优先级数用 1~10**。当前实现里每个优先级会占更多 Erlang 进程资源，开几十级并不划算。

### 对照：消费者优先级（x-priority）——另一个维度的「优先」

消息优先级管的是**队列里谁先出队**；还有一个容易混淆的兄弟特性管**多个消费者谁先拿**——消费者优先级。声明消费者时在 `basicConsume` 的参数里带 `x-priority`：

```java
Map<String, Object> args = new HashMap<>();
args.put("x-priority", 10);   // 整数，可正可负；不设默认 0，数值越大越优先
channel.basicConsume("my-queue", false, args, consumer);
```

规则三条（官方 [docs/consumer-priority](https://www.rabbitmq.com/docs/consumer-priority)）：

- **高优先级消费者 active 时，消息全给它**；只有同优先级的多个消费者之间才是熟悉的轮询（round-robin）；
- 高优先级消费者**阻塞**（prefetch 用满未 Ack、网络拥塞）时，消息才流向下面的低优先级消费者；
- RabbitMQ **不会等**阻塞的高优先级消费者——只要有低优先级消费者空闲，消息立刻给它，不积压。active/blocked 每秒可切换多次，管理台和 rabbitmqctl 都不暴露这个状态，别试图监控它。

典型用途：机房 A 的消费者优先处理、机房 B 的只做兜底；或「新版消费者优先、旧版兜底」的灰度。注意它是**消费端参数**，与队列声明的 `x-max-priority`（消息优先级）互不相干。

---

## 六、临时队列与独占队列

有些队列只活一小会儿——比如一个 RPC 请求的临时回执队列，用完就该消失。让队列「自动消失」有三条**互相独立**的机制，可以单用、也能组合：

| 机制 | 什么时候删 |
|------|----------|
| **exclusive（独占）** | 声明它的**那条连接**一关，立刻删 |
| **auto-delete（自动删除）** | **曾经有过消费者**，且最后一个消费者取消 / 断开后删 |
| **TTL** | 队列或消息**到期**才删（按时间，不是按事件） |

三者的触发事件完全不同：exclusive 看连接、auto-delete 看消费者、TTL 看时间。**所谓「临时队列」通常是三者合一**——服务端起名 + exclusive + auto-delete，AMQP 客户端里就一句：

```java
// 不传名字 + exclusive + auto-delete，broker 返回一个随机名（形如 amq.gen-xxxx）
String queueName = channel.queueDeclare().getQueue();
```

连接一关或消费者一走，它就自动没了。

### exclusive：连接私有的「一次性」队列

exclusive 的本质是**把队列的生命周期绑死在一条连接上**，由此带来几条硬规则：

- **连接私有**：只有声明它的那条连接能消费 / 清空 / 删除它；别的连接一碰就报 `RESOURCE_LOCKED`（`cannot obtain exclusive access to locked queue`）。
- **连接关即删**：所以它只装客户端私有的瞬态数据；给 exclusive 队列再设 durable **毫无意义**——它活不过这条连接，谈不上持久化。
- **只能是 Classic**：Quorum / Stream 都要跨节点复制，生命周期却绑死在单连接（单节点）上，逻辑上不成立。
- 声明在**客户端所连的那个节点**（client-local），不受 `queue_leader_locator` 影响。
- 名字**建议让服务端起**（见第一节），避免多条连接抢同一个固定名。

一句话：**exclusive =「这条连接专属、断了就没了」**。

### auto-delete：没人消费了就删

auto-delete 的触发条件是「**有过消费者 + 最后一个消费者离开**」。这里有个经典坑：

> **从没有过消费者的 auto-delete 队列，永远不会被删。** 比如全程用 `basic.get` 轮询（不注册消费者）的队列，auto-delete 永远不触发——这种情况该用 exclusive 或队列 TTL。

也要分清它和 exclusive 的差别：**auto-delete 看的是「消费者」，exclusive 看的是「连接」**。一个 exclusive 队列哪怕还挂着消费者，连接一断也照样删；反过来，一个 auto-delete（非 exclusive）队列只要还有一个消费者挂着，连接断了它也不会删。

### 一个版本提醒（4.3）

> **transient（非持久）非独占的 Classic 队列已弃用**，从 RabbitMQ **4.3.0** 起默认不让声明了。替代方案：durable 队列、非持久 exclusive 队列、或带 TTL 的 durable 队列（接近 transient 的效果）。非要开启可在 `rabbitmq.conf` 加 `deprecated_features.permit.transient_nonexcl_queues = true`（后续版本会移除）。

---

## 七、持久化：三条件缺一不可

队列有 durable / transient（元数据），消息有 persistent / transient（`delivery_mode`）。但 **durable 队列 + persistent 消息**只是必要条件——一条消息想在 Broker 重启后还活着，得凑齐三件事：

| 条件 | 谁负责 | 没满足会怎样 |
|------|--------|--------------|
| **① 队列是 Durable** | 声明队列时 `durable=true` | Broker 重启后队列定义本身没了，里面的消息自然全没 |
| **② 消息 `delivery_mode = 2`** | 发布消息时选 Persistent / 代码设持久属性 | 即便队列还在，瞬态消息恢复时会被丢弃 |
| **③ 消息确实落盘并同步** | 队列类型决定（Classic / Quorum） | 见下方两种队列的差异 |

前两个是**必要条件**，少一个都不行；第三个是「持久」这个词真正的含义所在，分队列类型看：

**Classic 队列**：Persistent 消息会写入磁盘的消息存储（message store）。

- **优雅重启**（`systemctl restart` / `docker restart`）：①② 满足 → 消息都在。
- **异常退出**（`kill -9` / 掉电）：Broker 可能在「收到消息」与「写入磁盘」之间就挂了，这条消息就丢——单节点 Classic 无法靠自身消除这个窗口。

**Quorum Queue（生产环境持久首选）**：消息**天然全部持久**——发布时不管 `delivery_mode` 填什么，都按持久处理；基于 Raft，消息要先被**多数副本写盘**才算发布成功，再回 ack 给生产者，可靠性远高于 Classic 单节点。

代码里发持久消息（Java）：

```java
import com.rabbitmq.client.MessageProperties;

// 发布到默认交换机（""），routingKey = 队列名，即直接投到该队列
channel.basicPublish("", QUEUE_NAME,
        MessageProperties.PERSISTENT_TEXT_PLAIN,   // 持久化文本：delivery_mode=2
        "hello".getBytes("UTF-8"));

// 或自定义属性
AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .deliveryMode(2)          // 2 = Persistent
        .contentType("text/plain")
        .build();
channel.basicPublish("", QUEUE_NAME, props, body);
```

> 代价提醒：持久消息要写盘，吞吐比瞬态低，**别无脑全开 Persistent**。可丢、可重算的消息（日志、埋点）用瞬态；业务关键消息才上持久 + Quorum Queue。

> **光靠 ①②③ 还不够，还得让生产者「知道」消息落盘了**——这就是 **Publisher Confirms（发布确认）**。开启后，Broker 只有在持久消息真正写盘（Quorum 则是多数副本确认）后才回 `basic.ack`，没收到就重发；不开就是「发了就忘」，崩溃窗口里的消息会无声丢失。Confirms 的具体用法见 [05 消息场景篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)。

> 一个反直觉的点：**durable 与否基本不影响吞吐和延迟**，只有在极高队列/绑定 churn（每秒上百次删建）时，transient 才在绑定操作上略快。所以选 durable 主要看**语义**，不是性能。但 **Quorum 队列必须 durable**（复制协议要求）。

---

## 八、CPU 与并行：单队列是反模式

> ⚠️ **单个队列（单个副本）的热路径被限制在单核 CPU 上。** 这套设计假定生产实践里会**用多个队列**。

所以"把所有消息塞进一个队列顶吞吐"是**反模式**——不仅资源用不满，还是稳定性隐患。要把队列吞吐推到极限，考虑 **Stream / 分区 Stream + RabbitMQ Stream 协议客户端**（见 [06 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)）。

---

## 九、消费者与 ACK

- 两种取法：注册消费者（**push**，Broker 推）或 `basic.get`（**pull**，类似 HTTP GET）；
- 两种确认：**auto**（写入连接 socket 即算确认，吞吐高、保障弱）与 **manual**（显式 ack，**推荐先用**）；
- manual 下用 **prefetch（channel QoS）** 限制未 ack 的在途消息数，防消费者被打爆；prefetch 开太大（几千）又会让 Broker 内存涨；
- 消息两种状态：**Ready**（待投）与 **Unacked**（已投未确认），管理台可见。

顺带一提管理控制台的 **Get Message(s)**（队列详情页取消息调试）：它的 **Ack Mode** 决定取完之后消息是**还回队列**还是**从队列删除**（对应 HTTP API 的 `ackmode`）。3.13 管理台选项原文：

| UI 文案 | API `ackmode` | 取完后消息还在队列？ | 说明 |
|---------|---------------|----------------------|------|
| **Nack message requeue true**（默认） | `ack_requeue_true` | **是**（重新入队） | 适合「只看一眼内容」：消息还在，Ready 数通常很快恢复。UI 文案带 Nack，API 名带 ack，都表示**不删、再入队** |
| **Automatic ack** | `ack_requeue_false` | **否**（删除） | 名字像「自动确认」，实际是**确认并移除**——看完即消费掉。生产库上误选可能把消息弄没 |
| **Reject requeue true** | `reject_requeue_true` | **是**（拒绝后再入队） | 走拒绝（reject）并 requeue，调试「消费失败但还要重试」的路径 |
| **Reject requeue false** | `reject_requeue_false` | **否**（删除）；若配置了死信（DLX）可能进死信队列 | 拒绝且不重回原队列，适合模拟失败丢弃 / 死信（见 [08 死信篇](/中间件/rabbitmq/rabbitmq-08-dlx-delay)） |

怎么选（控制台调试）：

1. **只想看消息、不改队列积压** → 用默认 **Nack message requeue true**（或 Reject requeue true）。
2. **故意消费掉** → 选 **Automatic ack**。
3. **验证死信** → 队列已绑 DLX 时，用 **Reject requeue false**。

控制台 Get 不保证与客户端长连接消费同等可靠，官方也标注 HTTP get 仅适合诊断；业务消费请用客户端订阅（`basic.consume`）并按业务做手动 ACK / NACK。

---

## 十、怎么看队列长度

三种方式：

1. **AMQP 0-9-1**：`queue.declare` 的响应 `queue.declare-ok` 里有 `message_count` 字段（各客户端取法不同）；
2. **HTTP API**：管理台背后的接口；
3. **命令行**：`rabbitmqctl list_queues`。

> "队列长度"指 **Ready（待投递）** 的消息数，**不含 Unacked**。

---

## 十一、auto-delete + 固定名的隐藏竞态

一个真实坑：**auto-delete 队列用固定名 + 客户端带自动重连**。场景——

1. 唯一消费者用的 auto-delete 队列（固定名）；
2. 连接断了；
3. 客户端探测到并开始重连。

此时 Broker 要删这个 auto-delete 队列（没了消费者），删需要时间；客户端却可能已经恢复并在重声明。**时序不同**会导致：

- 客户端先重声明 → Broker 后删除：客户端在一个被并发删除的队列上重新注册消费者 → Channel 异常；
- Broker 先删 → 客户端后重声明：正常。

**两种解法**：

1. **引入连接恢复延迟**（不少客户端默认 5 秒）；
2. **用服务端命名**（新连接用新名字，彻底绕开竞态）。

---

## 十二、队列长度上限与溢出行为

03 篇的 arguments 表里出现过 `x-max-length`，这里把机制补全。队列可以按**条数**（`x-max-length`）或**字节数**（`x-max-length-bytes`，只算消息体）设上限，也可两个都设——**谁先到谁生效**。三个关键规则（官方 [docs/maxlength](https://www.rabbitmq.com/docs/maxlength)）：

- **只数 Ready 消息**：Unacked 的不计入——消费者把消息拉走不 Ack，队列照样能继续收；
- **policy 与 x-arguments 都能设**：同时设时**取两者的较小值**生效（推荐用 policy，改起来不用重建队列，见第三节）；
- **溢出行为由 `x-overflow` 决定**，这是最容易被忽视的一环：

| `x-overflow` 取值 | 行为 | 适用 |
|------|------|------|
| `drop-head`（默认） | **丢最老的**——从队头挤掉旧消息腾位置（可配 DLX 转走） | 日志、埋点等「新的比旧的重要」 |
| `reject-publish` | **拒最新的**——新消息进不来；开了 Confirms 的发布者收到 `basic.nack` 感知拒收 | 不允许静默丢老消息的业务 |
| `reject-publish-dlx` | 同上，且把被拒消息**转死信**（**仅 Classic**，Quorum 不支持） | 既要拒新又要留痕审计 |

```bash
# policy 方式：队列最多 2 条，满了拒新
rabbitmqctl set_policy limited "^two-messages$" \
  '{"max-length":2,"overflow":"reject-publish"}' --apply-to queues
```

> 🔑 默认 `drop-head` 意味着：**光设 `x-max-length` 防爆，代价是悄悄丢最老的消息**。要「新消息进不来」而不是「旧消息消失」，必须显式设 `x-overflow: reject-publish`，并配合 Publisher Confirms（[05 消息场景篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)）感知 `basic.nack`。把 overflow 死信用于「消费跟不上」告警的实践见 [08 死信篇](/中间件/rabbitmq/rabbitmq-08-dlx-delay)，队列类型对 overflow 的支持差异见 [07 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)。

---

## 小结

- 队列名 ≤255B、`amq.` 保留、空串走服务端命名；exclusive 强烈建议服务端命名。
- 重复声明必须**属性一致**，否则 `PRECONDITION_FAILED`（406）；queue type 等价可放宽。
- 参数优先 `policy` > 代码 x-args；`operator policy` 是护栏；**数值取较小值**；`x-queue-type` / `x-max-priority` 只能声明时设。
- FIFO 不绝对：**优先级**和**多消费者重投**会乱序；严格保序用 **Stream** 或**单一活跃消费者**（+ delivery limit、别用 basic.get）。
- 优先级可选，建议 1~10；exclusive 一定是 Classic、连接私有、连接关即删。
- **单队列单核**——单队列是反模式，极限吞吐上 Stream / 分区。

下一篇回到主线：[《常用消息场景——Work、Pub/Sub、Routing、Topic》](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)。
