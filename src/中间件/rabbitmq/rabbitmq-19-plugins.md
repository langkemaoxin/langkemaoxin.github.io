---
title: "常用插件巡览——consistent-hash、delayed-message 等"
sidebarGroup: "RabbitMQ"
shortTitle: "19 常用插件"
order: 19
date: 2026-09-14
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 19/22 篇**  
> 上一篇：[《Shovel——跨 Broker 的可靠消息转发》](/中间件/rabbitmq/rabbitmq-18-shovel)  
> 下一篇预告：[《集群 Peer Discovery——自动发现与 K8s 集成》](/中间件/rabbitmq/rabbitmq-20-peer-discovery)

---

## 开头：核心功能之外的「外挂」

前面十几篇讲的都是 RabbitMQ 的核心能力——队列类型、死信、分片、联邦、Shovel。但有些场景官方用 **插件** 来补位：按 hash 分流、延迟投递、抓全量消息调试、监听内部事件、给晚到的消费者补历史。

这一篇把这些常用插件过一遍，每个说清楚 **用途、启用方式、关键用法、什么时候选它**。它们大多随 RabbitMQ 一起发布，`enable` 一下就能用。

---

## 一、插件机制：先搞懂 enable / list / 版本对齐

RabbitMQ 用 Erlang 的插件体系，所有功能（包括 `rabbitmq_management`）都以 `.ez` 包形式存在。三类命令够日常用：

```bash
# 列出所有可用插件（带 [E] 的是已启用）
rabbitmq-plugins list

# 启用插件（会自动带上依赖）
rabbitmq-plugins enable rabbitmq_consistent_hash_exchange

# 禁用插件
rabbitmq-plugins disable rabbitmq_consistent_hash_exchange

# 查插件目录在哪（社区插件要拷到这里）
rabbitmq-plugins directories -s
```

### 内置 vs 社区

| 类别 | 说明 | 例子 |
|------|------|------|
| **内置（tier 1）** | 随 RabbitMQ 发行版捆绑，`enable` 即用，版本天然对齐 | `rabbitmq_consistent_hash_exchange`、`rabbitmq_event_exchange`、`rabbitmq_management` |
| **社区/第三方** | 需自行下载 `.ez`，拷到插件目录，版本要和 Broker 严格匹配 | `rabbitmq_delayed_message_exchange`、`rabbitmq_sharding`（旧版独立包） |

> **版本对齐是铁律**：每个插件都绑定特定 RabbitMQ 版本系列。跨大版本升级 Broker 时，插件必须换对应版本，否则启动报 `{badmatch, ...}` 一类 Erlang 错误。生产环境强烈建议只随大版本一起升级插件。

启用后是否要重启？**绝大多数插件 `enable` 后即时生效**，无需重启节点；少数改动较深的可能需要滚动重启。集群环境下，**每个节点都要执行相同的 `enable`**，否则会出现「这个节点认识该 Exchange 类型、那个节点不认识」的不一致。

---

## 二、Consistent Hash Exchange：一致性哈希分流

### 用途

把消息按 **routing key（或消息头/属性）的一致性哈希** 分发到绑定的多个队列。核心价值：**队列数量变化时，只有少量消息迁移到新队列**，而不是像取模哈希那样几乎全量洗牌。

### 启用

内置插件，直接 enable：

```bash
rabbitmq-plugins enable rabbitmq_consistent_hash_exchange
```

Exchange 类型多出一种 **`x-consistent-hash`**。

### 关键用法

**声明交换机**（默认按 routing key 哈希）：

```java
channel.exchangeDeclare("chx", "x-consistent-hash", true, false, null);
```

**绑定队列时，「绑定键」是一个数字字符串，代表权重**——也就是该队列在哈希环上占几个桶：

```java
// q1、q2 权重为 1，q3、q4 权重为 2 —— q3/q4 会拿到约 2 倍的消息
channel.queueBind("q1", "chx", "1");
channel.queueBind("q2", "chx", "1");
channel.queueBind("q3", "chx", "2");
channel.queueBind("q4", "chx", "2");
```

**按消息头哈希**（routing key 另有用途时）：声明时加 `hash-header` 参数。

```java
Map<String, Object> args = new HashMap<>();
args.put("hash-header", "user-id");
channel.exchangeDeclare("chx2", "x-consistent-hash", true, false, args);
```

**按消息属性哈希**（`message_id` / `correlation_id` / `timestamp`）：用 `hash-property` 参数，与 `hash-header` 互斥。

### 三条要点

| 要点 | 说明 |
|------|------|
| **同一 routing key 必落同一队列** | 哈希的是 key 不是 body，相同 key 的消息永远进同一个队列——可做「按 key 分片」 |
| **每条消息只进一个队列** | 不是广播，是分流 |
| **重启后分布不变、但归属可能变** | 哈希环存在内存，重启按绑定重建；各队列收到的总量仍均匀，但某 routing key 可能换到另一个队列 |

> **权重建议统一为 `1`**。官方明确：高权重值在绑定频繁变动时会 **降低交换机吞吐**。绝大多数场景等权 1 就够均匀。

### 与 [09 Sharding 的 x-modulus-hash](/中间件/rabbitmq/rabbitmq-09-sharding) 对比

| 维度 | `x-modulus-hash`（Sharding） | `x-consistent-hash`（本插件） |
|------|------------------------------|-------------------------------|
| 哈希方式 | `hash(key) mod N`，N=队列数 | 一致性哈希环 |
| 增删队列时 | **几乎全部重新映射** | **仅少量迁移** |
| 消费方式 | 伪队列统一消费 | 各队列各自消费 |
| 典型场景 | 固定分片数、纯提速 | 会动态扩缩容、需要最小迁移 |

一句话：**队列数稳定选 Sharding，队列数会变选 Consistent Hash**。

---

## 三、Delayed Message Exchange：任意延迟投递

### 用途

在 Exchange 层实现「消息延迟 N 毫秒后再投递」。比 [08 TTL + DLX](/中间件/rabbitmq/rabbitmq-08-dlx-delay) 的延迟方案更直接——不用搭两条队列，发消息时塞个 header 就行。

### 一个必须说清的前提：官方已停止维护

这个插件 **不在内置列表里**，要单独下载 `.ez`。更重要的是，它的 README 现在挂着一条醒目声明：

> **This Project is No Longer Maintained.**

原因：插件基于 **Mnesia**（RabbitMQ 老的元数据存储），而 Mnesia 在 **4.3.0 开发周期已被彻底移除**。官方把分布式延迟队列做成了商业版（VMware Tanzu RabbitMQ 的「delayed queues」，基于 Raft 复制，能扛上亿条积压）。

| 你的版本 | 状态 |
|----------|------|
| **3.13.x**（Mnesia） | 插件按原样工作 |
| **4.0–4.2**（可选 Khepri） | 插件会自启一个节点级 Mnesia 副本，能用 |
| **4.3.x**（Mnesia 已移除） | 需下对应版本 `.ez`，仍靠插件自带 Mnesia 运行；**官方不再维护，慎用于生产** |

### 启用（如确实要用）

```bash
# 1. 从 GitHub Releases 下载对应版本的 .ez，拷到插件目录
rabbitmq-plugins directories -s   # 看目录在哪

# 2. 启用
rabbitmq-plugins enable rabbitmq_delayed_message_exchange
```

### 关键用法

声明时用 **`x-delayed-message`** 类型，并用 **`x-delayed-type`**（必填）指定底层路由方式：

```java
Map<String, Object> args = new HashMap<>();
args.put("x-delayed-type", "direct");   // 也可以 topic / fanout / headers
channel.exchangeDeclare("delay.ex", "x-delayed-message", true, false, args);
```

发布时用 **`x-delay` 头**（毫秒）控制延迟：

```java
Map<String, Object> headers = new HashMap<>();
headers.put("x-delay", 5000);  // 5 秒后投递
AMQP.BasicProperties props = new AMQP.BasicProperties.Builder().headers(headers).build();
channel.basicPublish("delay.ex", "order.close", props, body.getBytes(StandardCharsets.UTF_8));
```

> **没带 `x-delay` 头的消息会立即投递，不延迟**——所以这个交换机可以混用。

### 已知限制（影响选型）

| 限制 | 说明 |
|------|------|
| **单节点、单磁盘副本** | 延迟消息存在 Mnesia 一份，节点宕或禁用插件 → 消息丢失 |
| **不适合大体量** | 几十万、上百万级积压会出问题，设计本就不支持 |
| **不支持 mandatory 标志** | 未来投递时刻有没有队列、连接还在不在，无法保证 |
| **比原生交换机慢** | 每条消息都要判断延迟范围、写 Mnesia、维护定时器 |
| **设计目标仅「秒/分/小时」级** | 最多一两天，不是长期调度方案 |

### 何时用它 vs [08 TTL+DLX](/中间件/rabbitmq/rabbitmq-08-dlx-delay)

| 场景 | 推荐 |
|------|------|
| 延迟精度要求高、每条消息延迟不同 | 插件（4.3.x 前提是接受单节点风险） |
| 要可观测、可清队列、要用 Quorum 持久化 | TTL + DLX |
| 4.3.x 生产、要长期稳定 | **优先 TTL+DLX**，或评估 Tanzu 商业延迟队列 |

> **务实建议**：4.3.x 生产环境，把延迟需求落到 **TTL + DLX**（见 [第 8 篇](/中间件/rabbitmq/rabbitmq-08-dlx-delay)）更稳妥；插件留给开发/演示或低量级场景。

---

## 四、Firehose 与 Tracing：抓全量消息做调试

### 用途

调试时想看 **每一条发布、每一条投递** 的消息长什么样——Firehose 把这些消息「抄送」一份到一个内置 topic 交换机，你绑个队列消费就能逐条翻。

### 启用

Firehose 是 **内置功能**，用 `rabbitmqctl` 按 vhost 开关：

```bash
# 开启（指定 vhost，默认 /）
rabbitmqctl trace_on -p /

# 关闭
rabbitmqctl trace_off -p /
```

开启后，消息会被抄送到 topic 交换机 **`amq.rabbitmq.trace`**。声明一个队列绑定上去就能消费：

- `publish.{交换机名}` —— 进入 Broker 的消息
- `deliver.{队列名}` —— 投递给消费者的消息

被抄送的消息带这些头：`exchange_name`、`routing_keys`、`properties`、`node`、`redelivered`，body 就是原消息体。

### Tracing 插件：给 Firehose 加个 GUI

如果嫌写消费代码麻烦，再装个 **`rabbitmq_tracing`** 插件，它在管理界面里加一个 Tracing 页，直接把抓到的消息写进 **文本或 JSON 日志文件**：

```bash
rabbitmq-plugins enable rabbitmq_tracing
```

| 要点 | 说明 |
|------|------|
| **状态不持久** | Firehose 默认关闭，节点重启后回到关闭状态 |
| **关着零开销，开着有损耗** | 关闭时无性能影响；开启后因额外生成、路由消息，性能会下降 |
| **按节点、按 vhost** | `-n` 指定节点，`-p` 指定 vhost，可精确控制范围 |
| **用完即关** | 调试结束记得 `trace_off` 并清理临时队列 |

> **只用于排障**。生产常态开着 Firehose 等于让每条消息多走一跳，毫无必要。

---

## 五、Event Exchange：把 Broker 内部事件发出来

### 用途

连接建立/关闭、队列创建/删除、用户登录失败……这些 **Broker 内部事件** 默认只在日志里。Event Exchange 插件把它们转发到一个 topic 交换机，应用可以像消费普通消息一样 **订阅、审计、做监控**。

### 启用

内置插件，零配置：

```bash
rabbitmq-plugins enable rabbitmq_event_exchange
```

它会声明 topic 交换机 **`amq.rabbitmq.event`**（默认 vhost `/`）。事件按主题发布，例如：

- `connection.created` / `connection.closed`
- `queue.created` / `queue.deleted`
- `exchange.created` / `binding.deleted`
- `user.created` / `user.authentication.failure`

### 关键用法

声明队列、按主题模式绑定，只收关心的事件：

```java
channel.queueDeclare("audit-q", true, false, false, null);
// 只订阅所有用户相关事件
channel.queueBind("audit-q", "amq.rabbitmq.event", "user.#");
// 或订阅全部
channel.queueBind("audit-q", "amq.rabbitmq.event", "#");
```

> **事件消息 body 永远为空**，所有事件属性放在 **消息头** 里（如 `name`、`user`、`vhost`、`node`）。

### 配置项（rabbitmq.conf）

```bash
event_exchange.vhost = /                 # 交换机所在 vhost
event_exchange.protocol = amqp_0_9_1     # 或 amqp_1_0，事件属性走 AMQP 1.0 message-annotations
```

### 何时用

| 场景 | 价值 |
|------|------|
| **安全审计** | 谁、何时建了连接/队列/用户，落库存档 |
| **监控告警** | 认证失败激增、连接频繁抖动（connection churn）实时发现 |
| **资源治理** | 自动发现孤儿队列、异常绑定 |

> **务必给消费队列设 `x-max-length`**（几千即可）。连接/通道抖动会产生海量事件，消费者长期缺席会让队列堆积爆掉。另外，`amq.rabbitmq.event` 是全员可读的，不要给不可信用户 `read` 权限。

---

## 六、Recent History Exchange：给晚到的消费者补历史

### 用途

像聊天室：新用户一进来，先看到最近几条消息。这个插件在 fanout 交换机基础上加了个 **环形缓冲**，**每次有新队列绑上来，就把缓冲里的最近 N 条补发给它**。

### 启用

内置（3.6.0 起随发行版）：

```bash
rabbitmq-plugins enable rabbitmq_recent_history_exchange
```

Exchange 类型 **`x-recent-history`**。

### 关键用法

声明即可，默认缓存 **最近 20 条**：

```java
channel.exchangeDeclare("chat.logs", "x-recent-history");
```

想改缓存条数，用 **`x-recent-history-length`** 参数：

```java
Map<String, Object> args = new HashMap<>();
args.put("x-recent-history-length", 60);
channel.exchangeDeclare("chat.logs", "x-recent-history", true, false, args);
```

某条消息不想被缓存？给它加头 **`x-recent-history-no-store = true`**。

| 要点 | 说明 |
|------|------|
| **只补「绑定时刻」的快照** | 之后新产生的消息按 fanout 正常推，不会再「补」 |
| **缓存只在内存** | 节点重启后清空；禁用插件会删掉所有缓存消息 |
| **不是持久化方案** | 想要大容量历史回放，看 Stream 的 time-travel（见 [07 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)） |

> **新需求优先考虑 Stream**。Stream 原生支持按 offset/time 回放、容量大、可持久化，比这个插件更适合生产级历史回放。Recent History Exchange 胜在简单——零配置、轻量补几条。

---

## 七、Message Interceptors（4.2+）：服务端消息拦截器

严格说这不是插件，而是 **4.2 引入的核心机制**（官方 [docs/message-interceptors](https://www.rabbitmq.com/docs/message-interceptors)）：在 Broker 上对**流入/流出**的消息统一做加工——审计打点、溯源标注、元数据校验。两个拦截点：

| 拦截点 | 时机 |
|--------|------|
| **incoming** | 消息进入 Broker、路由到队列**之前** |
| **outgoing** | 消息投递给客户端**之前**（转换为目标协议前） |

内置拦截器都在 `rabbitmq.conf` 配置（改完重启生效）：

```ini
# 入站：给每条消息盖「接收时间戳」——0.9.1 客户端拿到 timestamp_in_ms 头，
#       1.0/Stream 客户端拿到注解 x-opt-rabbitmq-received-time
message_interceptors.incoming.set_header_timestamp.overwrite = true

# 入站：标注消息被哪个节点接收路由（x-routed-by），多节点排障利器
message_interceptors.incoming.set_header_routing_node.overwrite = true

# 出站：盖「发送时间戳」（x-opt-rabbitmq-sent-time）
message_interceptors.outgoing.timestamp.enabled = true
```

| 边界 | 说明 |
|------|------|
| 协议覆盖 | AMQP 1.0 / 0.9.1 / MQTT 的消息会被拦截；**Stream 协议不拦截** |
| 自定义 | 拦截器是实现 `rabbit_msg_interceptor` behaviour 的 Erlang 模块，要自己写得走插件开发 |
| 典型用法 | 全链路时间戳：received-time 与 sent-time 一减，就是消息在 Broker 内的停留耗时 |

## 八、Local Random Exchange（4.0+）：本地优先的随机路由

为 **RPC（request-reply）** 场景设计的新交换机类型 **`x-local-random`**（官方 [docs/local-random-exchange](https://www.rabbitmq.com/docs/local-random-exchange)）：消息**只投给发布者所连节点上的本地队列**，多个本地队列则随机挑一个——省掉跨节点一跳，把请求延迟压到最低。官方推荐与 **exclusive 队列**搭配：消费者在每个节点各起一条私有队列绑上去，发布与消费全程不跨节点。

| 要点 | 说明 |
|------|------|
| 硬性前提 | **每个节点至少有一个在线消费者**，否则该节点上发布的消息**直接丢弃**——官方明确要求消费者实例数 ≥ 节点数 |
| 感知丢弃 | 发布时带 `mandatory` 标记，无法路由会 basic.return 回发布者，据此发现「本节点没有消费者」 |
| 组网约束 | **前面挂负载均衡器基本没法用**——无法保证消费者均匀分布到各节点；要求客户端**直连具体节点** |
| 与同类对比 | `x-consistent-hash` / `x-modulus-hash`（上文与 [09 Sharding](/中间件/rabbitmq/rabbitmq-09-sharding)）是跨节点哈希分流，它是「本地随机」，目标完全不同 |

它和 [17 RPC 篇](/中间件/rabbitmq/rabbitmq-17-rpc)的 direct reply-to 是互补关系：direct reply-to 优化「回复」链路，`x-local-random` 优化「请求」链路，两个一起用就是最低延迟的 RPC 组合。

---

## 九、Management：一句带过

Web 管理控制台 + HTTP API，端口 **15672**，`rabbitmq-plugins enable rabbitmq_management` 即可。安装与登录见 [02 安装部署](/中间件/rabbitmq/rabbitmq-02-install-concepts)，控制台收发见 [03 编程模型](/中间件/rabbitmq/rabbitmq-03-programming-model)，监控与备份用法见 [10 监控、备份与联邦](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation)。本篇不重复。

---

## 十、插件选型小结表

| 插件 | 解决的问题 | 内置 | 选用时机 |
|------|-----------|------|---------|
| **Consistent Hash Exchange** | 按 key 分流、扩缩容最小迁移 | 是 | 队列数会变、需按 routing key 稳定分片 |
| **Delayed Message Exchange** | 任意毫秒级延迟投递 | 否（社区，**已停维护**） | 量小、秒/分级、接受单节点风险；4.3.x 生产优先 TTL+DLX |
| **Firehose / Tracing** | 抓全量发布/投递消息排障 | 是（功能内置 + tracing 插件） | 临时调试，用完即关 |
| **Event Exchange** | 订阅 Broker 内部事件做审计/监控 | 是 | 安全审计、资源治理、churn 告警 |
| **Recent History Exchange** | 给新消费者补最近 N 条 | 是 | 轻量历史回放（聊天室）；大体量用 Stream |
| **Message Interceptors**（4.2+，核心机制） | 服务端进出站消息统一打点/标注 | 是 | 全链路时间戳、路由节点溯源 |
| **Local Random Exchange**（4.0+，核心类型） | RPC 请求本地直投、免跨节点 | 是 | 每节点都有消费者的直连集群 |
| **Management** | Web 控制台 + HTTP API | 是 | 必装，运维标配 |

---

## 小结

插件是 RabbitMQ 的「补丁包」：核心给不了的能力，靠插件补位。挑插件时记住三条：

1. **内置优先**——版本对齐、`enable` 即用、官方维护。
2. **社区插件看清状态**——`delayed_message_exchange` 已停维护，4.3.x 别盲目上生产。
3. **能用核心功能解决就别上插件**——延迟用 TTL+DLX、历史回放用 Stream、分流用一致性哈希，都是「先想清场景再选工具」。

下一篇：集群 Peer Discovery——节点怎么自动发现彼此，K8s 里又怎么集成。

---

> **参考资料**
> - [Consistent Hash Exchange](https://www.rabbitmq.com/docs/consistent-hash-exchange)
> - [Delayed Message Exchange](https://www.rabbitmq.com/docs/delayed-message-exchange) ｜ [插件 README（已停维护声明）](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange)
> - [Firehose Tracer](https://www.rabbitmq.com/docs/firehose)
> - [Message Interceptors](https://www.rabbitmq.com/docs/message-interceptors) ｜ [Local Random Exchange](https://www.rabbitmq.com/docs/local-random-exchange)
> - [Event Exchange](https://www.rabbitmq.com/docs/event-exchange)
> - [Recent History Exchange](https://www.rabbitmq.com/docs/recent-history-exchange)
> - [Management Plugin](https://www.rabbitmq.com/docs/management)
