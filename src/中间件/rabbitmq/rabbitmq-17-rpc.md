---
title: "RPC 模式——用 RabbitMQ 实现远程调用"
sidebarGroup: "RabbitMQ"
shortTitle: "17 RPC"
order: 17
date: 2026-09-12
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 17/22 篇**  
> 上一篇：[《Virtual Hosts——隔离、权限与配额》](/中间件/rabbitmq/rabbitmq-16-virtual-hosts)  
> 下一篇预告：[《Shovel——跨 Broker 的可靠消息转发》](/中间件/rabbitmq/rabbitmq-18-shovel)

---

## 开头：05 篇跳过的 RPC，这次补上

回头翻 [05 消息场景](/中间件/rabbitmq/rabbitmq-05-messaging-patterns)，最后有句备注：「RPC 用 MQ 实现远程调用在实际项目中较少采用，此处略过」。这篇就是来填坑的。它是七种官方场景里**唯一一个"既要发、又要等回复"**的模式，机制和前面六种单向模式都不一样；而且 RabbitMQ 有个叫 **direct reply-to** 的"伪队列"机制，很多人没听过，能省掉临时队列、显著降低开销。

先把结论摆前面：

> RPC over MQ **能用、也有适用场景**（海量客户端的短请求 / 应答），但**别滥用**。它在"异步消息"上硬塞回"同步等待"，和消息中间件的设计初衷有点拧着。微服务间调用优先考虑 gRPC / Dubbo 或异步事件，把 MQ 当 RPC 通道是**特定场景下的妥协**。

---

## 一、RPC 是什么：请求 / 应答的"伪同步"

**RPC（Remote Procedure Call，远程过程调用）** 说白了就是：调用方（client）发一条请求消息，**阻塞等着**收一条应答消息，拿到结果才继续往下走。对调用方而言，看起来就像调了个本地方法。

这跟 [05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) 那六种模式最大的区别在于——前面那些都是**单向（one-way）**：

| 维度 | 单向模式（Work / Pub-Sub / Routing / Topic） | RPC 模式 |
|------|----------------------------------------------|----------|
| **方向** | 单向：Producer → Queue → Consumer | 双向：请求 → 处理 → **应答原路返回** |
| **调用方是否等待** | 发完即走（fire-and-forget） | **阻塞等应答**（或异步回调） |
| **需要几个队列** | 一个请求队列即可 | 请求队列 **+ 每个调用方一个回复队列** |
| **消息关联** | 不关心谁发的 | 必须用 **`correlationId`** 把应答和请求对上 |
| **典型用途** | 削峰、广播、事件驱动 | 查询、计算、需要立即拿结果的任务 |

一句话：单向模式是"喊一嗓子就走"，RPC 是"喊一嗓子、还非得等到对方回话"。

### 关键的两个 AMQP 属性

RPC 靠消息的两个内建属性串起来：

| 属性 | 谁设置 | 干什么用 |
|------|--------|----------|
| **`replyTo`** | 请求方（client） | 告诉服务端："处理完把结果发到这个队列名" |
| **`correlationId`** | 请求方生成、服务端原样回填 | 应答消息的唯一"回执号"，client 靠它把应答匹配到对应的请求 |

有了这两样，"请求 / 应答"这趟来回就能跑通。

---

## 二、经典 RPC 实现：临时 reply 队列 + correlationId

最朴素、也是官方教程（tutorial 6）演示的玩法。流程是这样：

```
        请求队列            回复队列
client ────────► server ────────► client
  请求消息        处理           应答消息
(replyTo=回复队列名,
 correlationId=唯一ID)        (correlationId=同一个ID)
```

### 2.1 五步走

1. **client 声明一个临时回复队列**（exclusive、autodelete，断开连接自动销毁），拿到队列名。
2. **client 生成一个唯一 `correlationId`**（通常用 UUID），发布请求消息到请求队列，带上 `replyTo`（回复队列名）和 `correlationId`。
3. **server 消费请求队列**，取出消息，处理业务逻辑。
4. **server 发布应答**：投到 `replyTo` 指定的队列，路由键就填这个队列名（走默认交换机），`correlationId` **原样回填**。
5. **client 从回复队列消费应答**，按 `correlationId` 匹配到自己发出去的那次请求，把结果交给等待的调用方。

### 2.2 为什么要 correlationId

因为 client **可能并发发多个请求，共用同一个回复队列**。回复队列里会陆续收到多条应答，到底哪条对应哪次请求？就靠 `correlationId` 一一对应。少了它，并发场景就乱套。

> **一个常见的偷懒错误**：每次请求都新建一个回复队列。这非常浪费——建/删一个队列（尤其集群里）要写元数据、走全节点共识，开销远大于收一条应答。正确做法是**每个 client 复用一个回复队列**，靠 `correlationId` 区分。RabbitMQ 官方文档原话也强调了这一点。

---

## 三、完整 Java 示例

下面用 `amqp-client`（AMQP 0-9-1）写一对最简的 RPC client / server。业务很简单：client 发一个数字字符串，server 算它的斐波那契值返回。当前稳定版约 **4.3.x**，API 照官方。

### 3.1 RPC 服务端

```java
public class RPCServer {

    private static final String RPC_QUEUE_NAME = "rpc_queue";

    public static void main(String[] argv) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("localhost");

        try (Connection connection = factory.newConnection();
             Channel channel = connection.createChannel()) {

            // 声明请求队列（durable=false 仅 demo 用，生产看 07 队列类型按需选）
            channel.queueDeclare(RPC_QUEUE_NAME, false, false, false, null);
            channel.basicQos(1);   // 一次只分一条，公平分发，见 05 篇 Work Queue

            System.out.println(" [x] Awaiting RPC requests");

            // 消费请求：autoAck=false，处理完再 ack，避免处理失败丢任务
            channel.basicConsume(RPC_QUEUE_NAME, false, (consumerTag, delivery) -> {
                AMQP.BasicProperties props = delivery.getProperties();

                // 应答属性：correlationId 原样回填，replyTo 决定发到哪
                AMQP.BasicProperties replyProps = new AMQP.BasicProperties
                        .Builder()
                        .correlationId(props.getCorrelationId())
                        .build();

                String response = "";
                try {
                    String message = new String(delivery.getBody(), StandardCharsets.UTF_8);
                    int n = Integer.parseInt(message);
                    System.out.println(" [.] fib(" + message + ")");
                    response = String.valueOf(fib(n));
                } catch (RuntimeException e) {
                    System.out.println(" [.] " + e);
                    // 业务异常：把错误信息作为应答体回传，而不是吞掉
                    response = "ERROR: " + e.getMessage();
                } finally {
                    // 回复到 replyTo 指定的队列（默认交换机 + 队列名作路由键）
                    channel.basicPublish("", props.getReplyTo(), replyProps,
                            response.getBytes(StandardCharsets.UTF_8));
                    // 最后再 ack 请求，保证"应答已发出"先于"请求已处理"
                    channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                }
            }, consumerTag -> { });

            // 阻塞主线程
            Thread.sleep(Long.MAX_VALUE);
        }
    }

    /** 笨办法算斐波那契，只为模拟"耗时计算"。 */
    private static int fib(int n) {
        if (n == 0) return 0;
        if (n == 1) return 1;
        return fib(n - 1) + fib(n - 2);
    }
}
```

几个要点：

- **`basicQos(1)`**：和 [05 Work Queue](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) 一样的公平分发，server 没处理完就不投下一条。
- **先发应答、后 ack 请求**：这个顺序很重要。若先 ack 再发应答，中间宕机就丢了应答，client 干等。详见第六节错误处理。
- **异常不丢、回传给 client**：服务端别把异常吞了不回，否则 client 会一直等到超时。

### 3.2 RPC 客户端（经典版，带回复队列）

```java
public class RPCClient implements AutoCloseable {

    private final Connection connection;
    private final Channel channel;
    private final String requestQueueName = "rpc_queue";
    private final String replyQueueName;          // 复用的回复队列
    private final Map<String, BlockingQueue<String>> pending = new ConcurrentHashMap<>();

    public RPCClient() throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("localhost");
        connection = factory.newConnection();
        channel = connection.createChannel();

        // 声明一个临时的、断开即删的回复队列，全生命周期复用
        replyQueueName = channel.queueDeclare().getQueue();

        // 唯一一个回复消费者：收到的应答按 correlationId 分发到对应的等待队列
        channel.basicConsume(replyQueueName, true, (consumerTag, delivery) -> {
            String corrId = delivery.getProperties().getCorrelationId();
            BlockingQueue<String> q = pending.get(corrId);
            if (q != null) {
                q.offer(new String(delivery.getBody(), StandardCharsets.UTF_8));
            }
        }, consumerTag -> { });
    }

    public String call(String message) throws Exception {
        final String corrId = UUID.randomUUID().toString();
        // 每次请求注册一个"信箱"，等待对应应答
        BlockingQueue<String> responseQ = new LinkedBlockingQueue<>(1);
        pending.put(corrId, responseQ);

        AMQP.BasicProperties props = new AMQP.BasicProperties
                .Builder()
                .correlationId(corrId)
                .replyTo(replyQueueName)      // 关键：告诉 server 往哪回
                .build();

        channel.basicPublish("", requestQueueName, props, message.getBytes(StandardCharsets.UTF_8));

        // 阻塞等待应答（生产请加超时，见第六节）
        String result = responseQ.poll(10, TimeUnit.SECONDS);
        pending.remove(corrId);
        if (result == null) {
            throw new RuntimeException("RPC 超时，未收到应答");
        }
        return result;
    }

    @Override
    public void close() throws IOException {
        connection.close();
    }
}
```

关键设计：

- **回复队列只声明一次、复用到连接关闭**，每次请求只是新建一个 `correlationId`。
- **`pending` 这个 Map** 就是"应答分发台"：并发多个请求时，每个 `correlationId` 对应一个独立的等待队列（`BlockingQueue`），收到应答按 ID 派发。调用方 `client.call("10")` 即阻塞拿结果。

---

## 四、direct reply-to：干掉那个临时回复队列

第二节那套经典实现有个固有开销：**每个 client 都要建回复队列**。看似临时、断开即删，在 Broker 侧却并不便宜——建/删队列要写元数据存储（Khepri）、集群里全节点达成共识、回复消息进队列缓冲、还要为它起独立 Erlang 进程。客户端一多，开销就堆起来了。

RabbitMQ 给了个专用优化：**direct reply-to（直接回复）**——**干脆不要这个队列**。

### 4.1 它是什么：一个"伪队列"

用 direct reply-to，client 不再声明回复队列，而是直接从一个**固定的伪队列名**消费：

```
amq.rabbitmq.reply-to
```

这名字长得像队列、用起来像队列，但 **Broker 内部根本没有这个队列实体**。机制是这样：

| 步骤 | 谁 | 做什么 |
|------|-----|--------|
| 1 | client | 在**自动 ack（no-ack）模式**下 `basicConsume("amq.rabbitmq.reply-to", true, ...)` |
| 2 | client | 发布请求时把 `replyTo` 也设成 `amq.rabbitmq.reply-to` |
| 3 | Broker | 转发请求时**透明改写** `replyTo` 成 `amq.rabbitmq.reply-to.<不透明后缀>`，每个 client 连接一个唯一后缀 |
| 4 | server | 处理完，往**默认交换机（`""`）**发布应答，路由键就是改写后的那个后缀名 |
| 5 | Broker | 直接把应答**送到 client 的连接 / 通道进程**，不经过任何队列缓冲 |

> "直接"（direct）这个词容易误解。它**仍然经过 Broker**，client 和 server 之间**没有**点对点的网络直连。区别只在于 Broker 内部省掉了队列这一层——应答从服务端的通道进程直接递到 client 的通道进程手里。

### 4.2 省掉了什么、带来了什么

| 指标 | 经典 reply 队列 | direct reply-to |
|------|----------------|-----------------|
| 元数据存储（建/删队列） | 有 | **无** |
| 回复消息缓冲 | 有 | **无（零缓冲）** |
| 独立 Erlang 进程 | 有 | **无** |
| 管理界面 / `list_queues` 能看到 | 能 | **不能**（伪队列不暴露） |
| 应答投递语义 | 至少一次（队列兜底） | **至多一次**（client 断了就丢） |

所以 direct reply-to 在海量 client 场景特别值：管理界面不会被几万个回复队列刷屏，Prometheus 指标更干净，Broker 负担更轻。它在内部用一个叫 `rabbit_volatile_queue` 的类型实现——non-durable、零缓冲、至多一次、不进元数据存储。

### 4.3 client 改用 direct reply-to

经典版的 client（3.2）几乎不用动，**只改两处**：回复队列名换成伪队列常量、消费时不再 `queueDeclare`。其余（`pending` 映射、`BlockingQueue`、超时等待、并发安全）完全一致。

```java
// direct reply-to 的伪队列名，固定值
private static final String DIRECT_REPLY_TO = "amq.rabbitmq.reply-to";

// 构造方法里——关键改动 1：消费这个伪队列，必须 no-ack，且无需 declare
channel.basicConsume(DIRECT_REPLY_TO, true, (consumerTag, delivery) -> {
    String corrId = delivery.getProperties().getCorrelationId();
    BlockingQueue<String> q = pending.get(corrId);
    if (q != null) {
        q.offer(new String(delivery.getBody(), StandardCharsets.UTF_8));
    }
}, consumerTag -> { });

// call() 方法里——关键改动 2：replyTo 直接写伪队列名，Broker 自动改写后缀
AMQP.BasicProperties props = new AMQP.BasicProperties
        .Builder()
        .correlationId(corrId)
        .replyTo(DIRECT_REPLY_TO)
        .build();
```

> **服务端代码完全不用改**。server 只是把应答发到 `replyTo` 指定的"名字"（走默认交换机），它根本不知道、也不关心那个名字是真队列还是伪队列。

### 4.4 direct reply-to 的几条硬规矩

官方文档列的限制，务必记牢：

- **必须是 no-ack 模式**消费 `amq.rabbitmq.reply-to`。没有队列给你退回消息，client 断开就丢。
- **发布请求和消费应答必须用同一个连接、同一个通道**。不能分两条连接。
- **每条通道最多一个** direct reply-to 消费者。
- 应答**不是容错的**：client 一断开，正在路上的应答直接被 Broker 丢弃。client 重连后要自己重发请求。
- `amq.rabbitmq.reply-to` **不是真队列**——不能删、不在管理界面出现、`rabbitmqctl list_queues` 也看不到。
- 如果 server 发布时带 `mandatory` 标志，这个伪名字会被**当作"已路由"**对待，**不会**触发 `basic.return`，即便 client 已经不在了。

> 官方明确：direct reply-to 是 **at-most-once（至多一次）** 语义。丢了应答可接受、client 能超时重试的场景，才适合用它。对照 [15 安全](/中间件/rabbitmq/rabbitmq-15-security) / [07 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types) 里对可靠性的强调，这是个明确的取舍。

---

## 五、何时该用 / 何时别用 RPC over MQ

把 MQ 当 RPC 通道，本质是在异步基础设施上硬开一条"同步等结果"的旁路。能跑，但要清楚代价。

### 5.1 适合的场景

| 场景 | 为啥合适 |
|------|---------|
| **海量短请求 / 应答**（数万 client） | direct reply-to 的省队列优势最明显，管理面 / 元数据负担低 |
| **高连接抖动**（来一次 RPC 就断） | 免去建/删临时队列，显著降低延迟和集群共识开销 |
| **请求本就走 MQ、想顺手拿个结果** | 已经在用 RabbitMQ 做任务派发，少数调用要回执，不值得再引一套 RPC 框架 |
| **可接受"丢了就重试"** | direct reply-to 的 at-most-once 语义正合适 |

### 5.2 不该用的场景

| 场景 | 问题 / 替代方案 |
|------|----------------|
| **微服务间常规同步调用** | 用 gRPC / Dubbo / HTTP。它们在服务发现、负载均衡、超时熔断上是专业的，MQ 不擅长 |
| **应答不能丢** | direct reply-to 不够，连经典 reply 队列也面临"处理完还没 ack 就宕机"的问题。要严格不丢，得换事件驱动 + 幂等 |
| **要强一致的事务性调用** | 消息中间件不保证即时性、不保证唯一消费，强一致请走真正的分布式事务 / Saga |
| **高吞吐打到同一个 client** | 队列的意义就是"消费者跟不上时缓冲"。direct reply-to 零缓冲，扛不住；用经典 reply 队列反而更稳 |
| **长耗时任务**（几十秒以上） | 阻塞等结果会占着连接和资源。改成"提交任务发事件、完成再发事件通知"的异步模式更合理 |

> 经验法则：**如果你写完发现整个系统最核心的调用都是 RPC over MQ，那架构大概率出问题了**。它该是少数派，是"顺手补一刀"的用法，不是主调用通道。

---

## 六、注意点：超时、并发匹配、错误处理

### 6.1 一定要有应答超时

永远别让 client 无限等下去。server 可能宕机、请求可能没被路由到、应答可能被丢（direct reply-to 尤甚）。3.2 的 `responseQ.poll(10, TimeUnit.SECONDS)` 就是超时保护——超时返回 `null` 后要**清理 `pending` 里的信箱**，否则内存会慢慢漏。生产环境配合重试或熔断。

### 6.2 并发请求的 correlationId 匹配

如第三节代码所示，一个 client 复用一个回复队列时，必须维护"**`correlationId` → 等待句柄**"的映射。要点：

- **`correlationId` 要全局唯一**，用 `UUID.randomUUID()`，别用自增 ID（多实例会撞）。
- 收到应答后**及时移除映射项**，防止内存泄漏。
- 映射要用**并发安全容器**（`ConcurrentHashMap`），回复消费者和业务线程会并发读写。

### 6.3 服务端异常也要回个应答

server 处理出错时，最常见的坑是"抛异常、什么都不回"。client 干等到超时、无从知道是失败了还是只是慢。

正确姿势是把异常信息作为应答体回传（3.1 的 `catch` 块就是这么写的）：在 `catch` 里把 `response` 赋成 `"ERROR:" + 异常信息`，然后 `finally` 里**无论成功失败都发应答、再 ack 请求**。client 侧检查应答体有没有 `ERROR:` 前缀，有就当业务异常处理。这样"通信层失败"和"业务层失败"就区分开了。

### 6.4 ack 顺序：先发应答、后 ack 请求

服务端手动 ack 时，**先把应答发出去、再 ack 请求**。这个顺序保证"应答已到达 Broker"这件事先发生——万一 server 这时宕机，请求消息会因没 ack 被重新投递给另一个 server 实例重算（幂等前提下），而不至于让 client 干等一条永远不会来的应答。

### 6.5 幂等性

请求可能因为各种原因被重复处理（server ack 前宕机、网络抖动重试、direct reply-to 丢应答后 client 重发）。server 端的业务逻辑**尽量设计成幂等**，或者在请求里带上业务级幂等键做去重。这是把 RPC over MQ 用稳的底层保障。

---

## 小结

- **RPC = 请求 / 应答的"伪同步"**：调用方发请求、阻塞等应答。与 [05 篇](/中间件/rabbitmq/rabbitmq-05-messaging-patterns) 的单向模式对比如同一张表——它多了回复队列和 `correlationId` 这两件事。
- **两条命脉属性**：`replyTo`（告诉 server 往哪回）、`correlationId`（应答和请求对上号）。并发请求共用回复队列时，`correlationId` 是唯一识别。
- **经典实现**：client 声明一个复用的临时回复队列，server 处理完把应答发回 `replyTo`、`correlationId` 原样回填。要点是**复用别每次新建**队列。
- **direct reply-to（`amq.rabbitmq.reply-to`）**：RabbitMQ 专属优化，**彻底干掉回复队列**——无元数据、无缓冲、无独立进程；Broker 把应答直接从 server 通道递到 client 通道。海量 client、高连接抖动场景收益最大。代价是 **at-most-once** 语义、应答不容错、client 断了就丢。
- **direct reply-to 硬规矩**：no-ack 消费、同连接同通道、每通道一个消费者、`replyTo` 直接写伪队列名（Broker 自动改写后缀）、不可见不可删。
- **慎用**：微服务常规调用首选 gRPC / Dubbo；应答不能丢、强一致、长耗时任务都不适合 RPC over MQ。它是"少数派补刀"，不是主调用通道。
- **注意点**：client 必加**应答超时**并清理等待映射；server 异常也要回应答（`ERROR:` 前缀）；**先发应答、后 ack 请求**；业务尽量**幂等**，扛住重投和重试。

下一篇转向集群间消息搬运：[《Shovel——跨 Broker 的可靠消息转发》](/中间件/rabbitmq/rabbitmq-18-shovel)。
