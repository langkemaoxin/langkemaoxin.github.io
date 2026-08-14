---
title: "AMQP 1.0 与多协议——MQTT、STOMP、Stream"
sidebarGroup: "RabbitMQ"
shortTitle: "13 多协议"
order: 13
date: 2026-09-08
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 13/22 篇**  
> 上一篇：[《Classic 队列为什么一堆积就变慢——内存窗口、落盘与流控》](/中间件/rabbitmq/rabbitmq-12-classic-backlog-degradation)  
> 下一篇预告：[《网络与连接——心跳、连接恢复与排障》](/中间件/rabbitmq/rabbitmq-14-networking)

---

## 开头：一个 Broker，多种协议

本系列前 12 篇里，我们写代码、配队列、聊积压，用的全是 **AMQP 0-9-1**——它是 RabbitMQ 的「母语」，RabbitMQ 内部的 exchange / queue / binding 模型本身就是按 AMQP 0-9-1 设计的。

但 RabbitMQ 不止会一种话。事实上，**同时讲多种协议**是它区别于纯 AMQP broker 的核心卖点之一：同一套集群、同一份数据，AMQP、MQTT、STOMP、Stream 客户端可以各讲各的、还能互相收发消息。物联网设备用 MQTT 推传感器数据，后端 Java 服务用 AMQP 消费，浏览器前端用 STOMP over WebSocket 订阅通知——这在 RabbitMQ 里是同一件事。

从 4.0 起，RabbitMQ 又把 **AMQP 1.0 提升为核心协议**（原生支持、无需插件），协议层的故事更完整了。本篇就来理清这几套协议的区别、选型与互操作。

---

## 一、AMQP：从 0-9-1 到 1.0

### 1.1 两个版本，一个端口

先纠正一个常见误解：**AMQP 1.0 不是 AMQP 0-9-1 的升级补丁，而是一套几乎重新设计的协议**——两者名字像、实则差别巨大，甚至可以说 1.0 才是「真正的标准」（ISO/IEC 19464、OASIS 标准），0-9-1 反而从未成为正式标准。

从 4.0 起，RabbitMQ **原生同时支持两个版本**，不需要任何插件：

| 对比项 | AMQP 0-9-1 | AMQP 1.0 |
|--------|:---:|:---:|
| **RabbitMQ 支持** | 一直支持（母语） | 4.0 起原生支持 |
| **是否需要插件** | 否 | 否 |
| **默认端口** | 5672 | 5672（同一个） |
| **是否正式标准** | 否 | 是（ISO/IEC 19464、OASIS） |
| **跨 broker 互通** | 基本只有 RabbitMQ 用 | 多家 broker 支持 |
| **模型** | exchange / queue / binding（中间件模型） | 统一的「link + terminus」核心 |
| **连接复用** | channel 虚拟通道 | 单连接可同时收发，互不阻塞 |

> **同一个 5672 端口怎么区分？** 客户端建立 TCP / TLS 连接后、发送任何 AMQP 帧之前，先发一个**协议头（protocol header）**声明自己要用 0-9-1 还是 1.0，Broker 据此走对应协议栈。这种「先谈判再用」的机制叫 **Version Negotiation**。

### 1.2 为什么要推 1.0

RabbitMQ 团队主推 AMQP 1.0 的理由，集中在 0-9-1 做不到的几件事上：

| AMQP 1.0 独有能力 | 说明 |
|--------|------|
| **细粒度流控** | 消费者可动态调节「我要收多少」；单个连接上某条队列堵了，不影响同连接其他队列的高速收发 |
| **AMQP 过滤表达式** | 消费 Stream 时服务端过滤（SQL 表达式 + 布隆过滤器），减少无谓的网络传输 |
| **队列本地性（Queue Locality）** | Broker 把 leader / 副本拓扑告诉客户端，客户端可「就近」发布到 leader、从副本消费，降低集群内流量 |
| **Modified 结局** | 消费失败重投时，可修改消息注解（Quorum 队列支持），比 0-9-1 的 nack 更细 |
| **更完整的消息完整性** | bare message 不可变，可对 body、properties、application-properties 整体做哈希 / 校验 / 数字签名 |
| **Stream 存储零损耗** | Stream 内部以 AMQP 1.0 编码存储消息，用 1.0 消费无 header 保真度损失 |

反过来，0-9-1 也有几个 1.0 目前还没有的东西：**管理 UI 里的消息速率展示**（1.0 连接看不到）、**channel 拦截器插件**（如 Sharding Plugin）、**事务**（两者都弱，但 1.0 完全不支持）。

> **客户端生态**：目前 0-9-1 的客户端库更多（Java、Python、Go、PHP、Ruby…），RabbitMQ 官方维护的 1.0 客户端只有 **Java** 和 **.NET** 两款。选协议前先确认你的语言有没有趁手的 1.0 客户端。

### 1.3 AMQP 1.0 的寻址

AMQP 1.0 规范本身没规定「地址怎么解析」，RabbitMQ 自己定义了一套 **v2 地址格式**（4.0 引入，v1 已弃用）：

| 目标地址（发送） | 含义 |
|--------|------|
| `/exchanges/:exchange/:routing-key` | 发到指定 exchange + routing key |
| `/exchanges/:exchange` | 发到指定 exchange，routing key 为空（适合 fanout / headers） |
| `/queues/:queue` | 直接发到指定队列（队列须已存在） |
| `null`（AMQP 空值） | 每条消息在 `to` 字段里各自指定地址，适合多目标 |

消费侧只有一个源地址格式：`/queues/:queue`，从指定队列消费。

> 地址里的 exchange 名、routing key、queue 名都要做 **percent-encoding**（RFC 3986）。例如 routing key 是 `my-key/123`，地址里要写成 `my-key%2F123`。

小结一句：**新项目、新集群、客户端语言允许的前提下，优先用 AMQP 1.0**——它是官方未来方向，能力更强；老项目或客户端生态受限，0-9-1 仍是稳妥选择。

---

## 二、多协议一览

把 RabbitMQ 支持的协议放一张表，先有个全局印象，下面再逐个展开：

| 协议 | 插件 | 默认端口（明文 / TLS） | 典型场景 | 4.x 状态 |
|------|------|:---:|------|------|
| **AMQP 0-9-1** | 内置 | 5672 / 5671 | 后端服务间通信（本系列默认） | 原生 |
| **AMQP 1.0** | 内置 | 5672 / 5671 | 跨 broker 互通、新项目 | 4.0 起原生 |
| **MQTT** | `rabbitmq_mqtt` | 1883 / 8883 | 物联网、海量设备、低带宽 | 内置插件 |
| **STOMP** | `rabbitmq_stomp` | 61613 / 61614 | 简单文本、浏览器 / 多语言 | 内置插件 |
| **Stream** | `rabbitmq_stream` | 5552 / 5551 | 高吞吐日志消费、Stream 原生访问 | 内置插件 |
| 管理 HTTP API | `rabbitmq_management` | 15672 / 15671 | 运维、监控 | 内置插件 |

> **AMQP 不需要启用插件**（0-9-1 和 1.0 都是开箱即用）；MQTT、STOMP、Stream 三者需要 `rabbitmq-plugins enable`。所有插件都随发行版附带，不需要额外下载。

---

## 三、MQTT：为物联网而生

### 3.1 一句话定位

**MQTT** 是物联网（IoT）事实标准：轻量、低带宽、支持不稳定网络，专门为「海量设备 + 偶尔断线」设计。RabbitMQ 通过 `rabbitmq_mqtt` 插件支持 **MQTT 3.1 / 3.1.1 / 5.0** 三个版本。

启用：

```bash
rabbitmq-plugins enable rabbitmq_mqtt
```

默认监听 **1883**（明文）/ **8883**（TLS），默认账号 `guest / guest`（仅 localhost）。

### 3.2 核心概念速览

| 概念 | 说明 |
|------|------|
| **Topic** | 消息主题，用 `/` 分层，如 `cities/london/weather`；支持 `+`（单层）和 `#`（多层）通配符 |
| **QoS 0** | 最多一次（fire and forget），不保证到达，性能最高 |
| **QoS 1** | 至少一次，需要 PUBACK 确认，可能重复 |
| **QoS 2** | 恰好一次——**RabbitMQ 不支持**，3.1.1 客户端会被降级到 QoS 1，5.0 客户端直接断开 |
| **Retained** | 保留消息：新订阅者一上线就能收到最后一条保留消息 |
| **Clean Session** | true=连接断开就清空会话（临时）；false=会话保留，重连后继续收 |
| **Will Message** | 客户端异常断开时，Broker 自动代发的「遗嘱」消息 |

> **QoS 2 不支持是 RabbitMQ MQTT 的最大限制之一**。如果你的设备必须用 QoS 2，要么改设计，要么换专用 MQTT broker。另外 **共享订阅（Shared Subscriptions）也不支持**。

### 3.3 MQTT 在 RabbitMQ 里怎么落地

RabbitMQ 内核是 AMQP 0-9-1 模型，MQTT 插件在底层做了一层映射：

- MQTT 的 topic 消息统一路由到一个 **topic exchange**（默认 `amq.topic`，可用 `mqtt.exchange` 配置）
- **每个 MQTT 订阅者**会被创建一个专属队列，绑定到这个 topic exchange
- 队列命名规则：`mqtt-subscription-<客户端ID>qos[0|1]`

这里有个**分隔符翻译**的坑：MQTT 用 `/` 分层，AMQP 用 `.` 分层，插件会自动转换：

| MQTT | AMQP 0-9-1 | 含义 |
|:---:|:---:|------|
| `/` | `.` | 分层符 |
| `+` | `*` | 单层通配 |
| `#` | `#` | 多层通配 |

> **因此**：MQTT topic 里**别带点号 `.`**，AMQP routing key 里**别带斜杠 `/`**，否则跨协议消费时对不上。例如 MQTT topic `cities/london` 会变成 AMQP routing key `cities.london`，AMQP 消费者要按 `cities.london` 绑定。

### 3.4 队列类型选择

MQTT 订阅者背后的队列，默认是 **Classic 队列**。但根据订阅模式不同，可能是不同类型：

| 场景 | 队列类型 | 说明 |
|------|------|------|
| QoS 0 + Clean Session=true | **MQTT QoS 0 队列**（伪队列） | 消息直接塞进连接进程邮箱，不落盘、不复制——专为大规模 fan-out 优化 |
| QoS 1 + 会话持久 | Classic（默认）或 Quorum | 用 `mqtt.durable_queue_type = quorum` 切换为 Quorum，提升数据安全 |
| 任意 QoS + 向 Stream 发布 | Stream | MQTT 客户端可向 Stream 发消息（只要 Stream 绑定到 topic exchange），但不能直接从 Stream 消费 |

> **`mqtt.durable_queue_type = quorum` 只能用于全新集群**，在已有集群上切换会导致队列类型不匹配、订阅失败。Quorum 适合「几百个长期在线、数据安全敏感」的设备；如果是「几十万设备高频上下线」，Quorum 的声明 / 删除开销会成为瓶颈，老老实实用 Classic 或 QoS 0 队列。

### 3.5 关键配置速查

```ini
# rabbitmq.conf
mqtt.listeners.tcp.default = 1883
mqtt.listeners.ssl.default = 8883     # TLS 端口
mqtt.vhost            = /             # 默认 vhost
mqtt.exchange         = amq.topic     # MQTT topic 路由到的 exchange
mqtt.prefetch         = 10            # QoS 1 未确认消息上限
mqtt.max_session_expiry_interval_seconds = 86400   # 会话最长保留 1 天
mqtt.allow_anonymous  = false         # 生产环境关掉匿名
```

### 3.6 何时选 MQTT

- ✅ 海量物联网设备（传感器、嵌入式）上报数据
- ✅ 设备网络不稳定、带宽小、需要 Will / Retained 机制
- ✅ 需要 MQTT 生态的工具链（如 Sparkplug B）
- ❌ 后端服务间的高吞吐通信 → 用 AMQP
- ❌ 需要 QoS 2 / 共享订阅 → 换专用 MQTT broker

> 大规模 IoT 部署的调优清单：关掉管理插件的 metrics 采集（`management_agent.disable_metrics_collector = true`）、尽量用 QoS 0、调小 TCP buffer、topic 层级尽量浅（`city/name` 好过 `continent/country/city/name`）。

---

## 四、STOMP：最简单的文本协议

### 4.1 一句话定位

**STOMP**（Simple Text Oriented Messaging Protocol）是一个**纯文本**协议，帧（frame）就是一行行可读文本，命令只有 `CONNECT`、`SEND`、`SUBSCRIBE`、`UNSUBSCRIBE`、`ACK`、`NACK` 等几个。它的卖点就是「简单」——任何能发文本的客户端都能讲，调试时甚至能直接用 telnet 手敲。

RabbitMQ 通过 `rabbitmq_stomp` 插件支持 **STOMP 1.0 / 1.1 / 1.2**。

启用：

```bash
rabbitmq-plugins enable rabbitmq_stomp
```

默认监听 **61613**（明文）/ **61614**（TLS）。

### 4.2 目的地（Destination）

STOMP 没有exchange / queue 的概念，用 `destination` 头来寻址。RabbitMQ 的 STOMP 插件定义了五种目的地前缀：

| 前缀 | 含义 | 典型用法 |
|------|------|------|
| `/topic/<name>` | 发布订阅到 `amq.topic`（默认） | 最常用：一写多读，无订阅者时消息丢弃 |
| `/queue/<name>` | 共享队列（首次 SEND 时自动创建） | 点对点：负载分发给多个订阅者之一 |
| `/amq/queue/<name>` | 操作已存在的队列（不自动创建） | 消费事先声明好的队列（如 Quorum / Stream） |
| `/exchange/<name>[/<key>]` | 发到任意 exchange / 用任意 binding 订阅 | 灵活路由 |
| `/temp-queue/<x>` | 临时队列（只能用在 `reply-to` 头里） | RPC 应答 |

### 4.3 发送与订阅示例

一个典型的 SEND 帧：

```text
SEND
destination:/queue/orders
content-type:application/json
persistent:true

{"orderId": "A123", "amount": 99.5}
```

订阅（带持久化）：

```text
SUBSCRIBE
destination:/topic/alarms
id:1234
durable:true
auto-delete:false
ack:client
prefetch-count:10
```

> STOMP 插件把大量 AMQP 0-9-1 的队列参数暴露成了头：`durable`、`auto-delete`、`x-message-ttl`、`x-max-length`、`x-dead-letter-exchange`、`x-queue-type`（可声明 Quorum / Stream）等，含义与 AMQP 声明时一致。详见[第 07 篇：队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types)。

### 4.4 持久订阅

STOMP 的 topic 默认是「无订阅者即丢弃」。要做成持久订阅（断线重连后补收），加 `durable:true` + `auto-delete:false` + 唯一的 `id`：

```text
SUBSCRIBE
destination:/topic/my-durable
id:sub-001
durable:true
auto-delete:false
```

取消时用同样的 `id` 和 `durable` / `auto-delete` 头发 `UNSUBSCRIBE`。

### 4.5 何时用 STOMP

- ✅ 浏览器前端（STOMP over WebSocket，配 `rabbitmq_web_stomp`）
- ✅ 想要极简客户端、跨语言、无 AMQP 库的环境
- ✅ 快速原型、调试（文本协议一目了然）
- ❌ 追求高性能吞吐 → 用 AMQP 1.0 或 Stream 协议
- ❌ 需要细粒度流控、复杂路由 → 用 AMQP

> **帧大小限制**：默认单帧上限 **4 MB**（`stomp.max_frame_size`），超大消息要改配置或分片。

---

## 五、Stream 协议：原生二进制的高吞吐通道

### 5.1 先分清两个概念

[第 07 篇](/中间件/rabbitmq/rabbitmq-07-queue-types)讲过 **Stream 队列类型**（append-only 日志、可回溯、大堆积）。那是「队列类型」层面的概念——你可以用 AMQP 0-9.1 / 1.0 / STOMP 去声明和消费它。

本节讲的是 **Stream 协议**：一套专门为 Stream 设计的**原生二进制协议**，由 `rabbitmq_stream` 插件提供。两者的关系：

| 概念 | 是什么 | 怎么访问 |
|------|------|------|
| **Stream（队列类型）** | append-only 日志数据结构 | 任意协议（AMQP / STOMP / Stream 协议） |
| **Stream 协议** | 原生二进制协议 | 只用于访问 Stream |

> **为什么要有单独的协议？** 用 AMQP 消费 Stream 能用，但每条消息要经过 AMQP 编解码层，有开销。Stream 协议直接操作 chunk（消息批次），是 RabbitMQ 里吞吐最高的访问方式，适合日志型、事件溯源、大数据管道等极限吞吐场景。

### 5.2 启用与端口

```bash
rabbitmq-plugins enable rabbitmq_stream
```

默认监听 **5552**（明文）/ **5551**（TLS），默认账号 `guest / guest`。

```ini
# rabbitmq.conf
stream.listeners.tcp.1 = 5552
stream.listeners.ssl.1 = 5551        # TLS
stream.heartbeat = 60                # 心跳，默认 60s
stream.frame_max = 1048576           # 单帧上限，默认 1 MiB
```

### 5.3 流控与 chunk

Stream 协议的流控有两个层面：

| 流控 | 对象 | 机制 |
|------|------|------|
| **Publisher 流控** | 生产者 | 每连接允许 `initial_credits`（默认 50000）条未确认消息，超过就阻塞；确认 `credits_required_for_unblocking`（默认 12500）条后解除 |
| **Consumer 信用流** | 消费者 | 消费者用「信用」控制 Broker 投递速度；一个信用 = 一个 chunk（消息批次） |

> **chunk 是 Stream 的存储与传输单元**：消息在 Stream 里是连续存成一个个 chunk 的，一个 chunk 可能含一到数千条消息。消费时按 chunk 投递，所以「给一个信用」=「给我一个 chunk」。推荐订阅时至少给 2 个信用，每收到一个 chunk 就补一个，让消息持续流动。

### 5.4 拓扑发现与就近访问

Stream 协议支持**拓扑发现**：客户端询问某 Stream 的 leader 和副本分别在哪，然后**发布连 leader、消费连副本**，减少集群内转发。容器 / 代理环境下，用 `advertised_host` / `advertised_port` 告诉客户端「对外怎么连我」：

```ini
stream.advertised_host = rabbitmq-1
stream.advertised_port = 5552
```

### 5.5 客户端库

官方支持的 Stream 客户端：**Java、Go、.NET、Rust、Python（rstream）**；社区还有 Node.js、C++、C、Elixir、Erlang 等。

### 5.6 何时用 Stream 协议

- ✅ 追求极致吞吐（日志、事件、metrics 管道）
- ✅ 需要按 offset / 时间戳回溯消费
- ✅ 大量订阅者读同一份日志（fan-out）
- ❌ 已有 AMQP / Spring AMQP 应用、吞吐够用 → 不必为换协议重构，AMQP 消费 Stream 也行（详见[第 07 篇](/中间件/rabbitmq/rabbitmq-07-queue-types)的 5.2 节）

---

## 六、跨协议互操作

多协议的真正价值，是**同一个集群里不同协议的客户端能互相收发消息**。RabbitMQ 内核是 AMQP 0-9-1 模型，所有协议在底层都映射到 exchange / queue / binding，所以互操作天然可行——但有几个注意点。

### 6.1 互操作的底层逻辑

| 协议 | 发布时映射到 | 消费时映射到 |
|------|------|------|
| **AMQP 0-9-1** | exchange（原生） | queue（原生） |
| **AMQP 1.0** | exchange（v2 地址解析） | queue（v2 地址解析） |
| **MQTT** | topic exchange（`mqtt.exchange`，默认 `amq.topic`） | 每订阅者一个专属队列 |
| **STOMP** | 按 destination 前缀映射到 exchange / queue | 按 destination 前缀映射 |
| **Stream 协议** | 直接写 Stream 日志 | 直接读 Stream 日志 |

> **关键**：只要消息最终路由到「同一个 exchange + 同一个 queue」，谁生产、谁消费就无所谓协议。比如 MQTT 设备发到 `devices/temp`，AMQP 消费者只要把队列绑定到 `amq.topic` 且 binding key = `devices.temp`（注意 `/` → `.` 翻译）就能收到。

### 6.2 AMQP 1.0 的存储优势

从 4.0 起，用 AMQP 1.0 发布的消息，在 Classic / Quorum / Stream 里都**以原始 AMQP 1.0 格式存储**——再用 AMQP 1.0 消费时无需协议转换，且 bare message 不可变，可保证哈希 / 签名的完整性。这是 1.0 在跨协议场景下独有的优势。

### 6.3 常见互操作组合与坑

| 组合 | 能否互通 | 注意点 |
|------|:---:|------|
| MQTT 发 → AMQP 收 | ✅ | AMQP 队列绑定到 `amq.topic`，binding key 把 MQTT 的 `/` 换成 `.` |
| AMQP 发 → MQTT 收 | ✅ | AMQP 发到 `amq.topic`，routing key 把 `.` 换成 `/` 当 MQTT topic |
| STOMP 发 → AMQP 收 | ✅ | STOMP 用 `/exchange` 或 `/amq/queue` 目的地 |
| 任意协议 → Stream 消费 | ⚠️ | Stream 用 AMQP / STOMP 可消费（设 `x-stream-offset`），但 Stream 协议吞吐最佳 |
| MQTT 客户端 → Stream | ⚠️ | MQTT 可向 Stream 发（Stream 绑到 topic exchange），但**不能直接从 Stream 消费** |
| QoS 2 跨协议 | ❌ | RabbitMQ 根本不支持 QoS 2 |

> **消息注解的来源**：AMQP 1.0 消费时会带 `x-exchange` 和 `x-routing-key` 注解，标识消息原始来源（不管它最初是用哪个协议发的）。但反过来，AMQP 1.0 客户端**不要**自己设置这两个注解——RabbitMQ 不会解读它们。

---

## 七、怎么选协议

给一个实用的选型决策表：

| 你的场景 | 推荐协议 | 理由 |
|------|------|------|
| 后端 Java / .NET 服务间通信 | **AMQP 1.0** | 官方未来方向，能力最强；客户端成熟 |
| 后端多语言服务、存量系统 | **AMQP 0-9-1** | 客户端生态最丰富，稳定可靠 |
| 物联网、海量设备、低带宽 | **MQTT** | IoT 事实标准，轻量、Will / Retained |
| 浏览器前端实时通知 | **STOMP over WebSocket** | 文本协议，JS 原生友好 |
| 极致吞吐、日志 / 事件管道 | **Stream 协议** | 原生二进制，吞吐最高 |
| 快速原型、脚本调试 | **STOMP** | 文本帧，telnet 都能玩 |
| 跨 broker 迁移 / 互通 | **AMQP 1.0** | 行业标准，多家 broker 支持 |

> **一句话**：默认 AMQP，IoT 选 MQTT，求简用 STOMP，拼吞吐上 Stream 协议。多协议并存、互操作收发，是 RabbitMQ 区别于单一协议 broker 的看家本领。

---

## 小结

| 协议 | 一句话 | 端口 |
|------|--------|:---:|
| AMQP 0-9-1 | RabbitMQ 母语，生态最全 | 5672 |
| AMQP 1.0 | 4.0 起核心协议，标准、能力更强 | 5672 |
| MQTT | 物联网专用，轻量、QoS / Will / Retained | 1883 |
| STOMP | 纯文本、极简，浏览器与脚本友好 | 61613 |
| Stream | 原生二进制，Stream 队列的最高吞吐访问方式 | 5552 |

下一篇：网络与连接——心跳、连接恢复与排障。
