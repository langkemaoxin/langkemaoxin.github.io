---
title: "Classic、Quorum、Stream——如何选择队列类型"
sidebarGroup: "RabbitMQ"
shortTitle: "07 队列类型"
order: 7
date: 2026-08-31
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 7/22 篇**  
> 上一篇：[《SpringBoot 集成 RabbitMQ》](/中间件/rabbitmq/rabbitmq-06-springboot)  
> 下一篇预告：[《死信队列与延迟队列》](/中间件/rabbitmq/rabbitmq-08-dlx-delay)

---

## 开头：Classic 队列积压了，为什么变慢

老版本 RabbitMQ 有个痛点：Queue 里消息一堆积，生产和消费性能断崖式下跌。3.8 起引入 **Quorum Queue**，3.9 引入 **Stream Queue**，分别解决分布式可靠性与大日志堆积吞吐问题。

创建队列时控制台可选三种类型：**Classic**、**Quorum**、**Stream**——这也是 RabbitMQ 全部的三种队列类型（类型下拉菜单只有这三个）。本篇对照官方最新文档（截至 RabbitMQ 4.3）对比特性、适用场景与声明方式，并说明为什么 **lazy-mode 已被移除**、**Classic 镜像队列也在 4.0 删除**。

### 队列类型总览

RabbitMQ 一共就 **3 种队列类型**，先来一张全景图有个整体印象，后面再逐一展开：

| 类型 | 一句话 | 引入版本 | 核心场景 |
|------|--------|:---:|------|
| **Classic 经典队列** | 最传统的 FIFO 队列，消息消费即删除 | 最初 | 轻量、临时、内部系统调用 |
| **Quorum 仲裁队列** | 基于 Raft 协议复制的分布式队列，官方主推 | 3.8 | 高可靠、数据安全优先（订单、支付） |
| **Stream 流式队列** | append-only 日志，消费不删除、可回溯重读 | 3.9 | 大堆积、多订阅、高吞吐、事件回放 |

> **三者互补而非替代**：Classic 是「老牌轻量型」，Quorum 是「可靠的复制型」（替代已移除的 Classic 镜像队列），Stream 是「日志型」（弥补队列在大堆积与多订阅上的短板）。选型时按场景搭配使用。

> **扩展概念（不算独立类型）**：**Super Stream**（3.11+）是 Stream 的分区版本，用于横向扩容；**lazy-mode 懒队列**与 **Classic 镜像队列**均已被移除。

下面逐一展开。

---

## 一、Classic 经典队列

RabbitMQ 最传统的队列类型，FIFO 存取，Consumer 取走并 Ack 后消息从队列删除；需重投则再次入队。

![Classic 队列创建选项：Durability 与 Auto delete](/中间件/rabbitmq/14/p03-01.png)

| 选项 | 说明 |
|------|------|
| **Durability: Durable** | 消息写磁盘，重启不丢（推荐） |
| ~~**Durability: Transient**~~ | 仅内存、重启丢失——**4.0 起移除**，别再选 |
| **Auto delete** | 所有 Consumer 断开后自动删除队列 |

控制台「Arguments」栏是声明队列时最关键的扩展项（每个参数旁都有问号可查），里面就是各种 `x-` 开头的参数。先看 Classic 支持的常用 Arguments：

![Classic 队列 Arguments 参数列表](/中间件/rabbitmq/14/p03-02.png)

| 界面英文（官方术语） | 参数名 | 作用 / 取值 |
|------|------|------|
| Queue type | `x-queue-type` | `classic` / `quorum` / `stream`（默认 classic） |
| Message TTL | `x-message-ttl` | 消息存活时长（毫秒），超时未消费自动删除 |
| Queue TTL / expiry | `x-expires` | 队列空闲（无消费者）多久后自动删除（毫秒） |
| Max length | `x-max-length` | 队列最大消息条数，超出按 overflow 处理 |
| Max length bytes | `x-max-length-bytes` | 队列最大字节数 |
| Overflow behaviour | `x-overflow` | 超限处理：`drop-head`（默认）/ `reject-publish` |
| Dead letter exchange | `x-dead-letter-exchange` | 消息被拒绝 / 过期 / 超长时转投的 DLX |
| Dead letter routing key | `x-dead-letter-routing-key` | 转投死信时使用的路由键 |
| Maximum priority | `x-max-priority` | 开启消息优先级，0–255（建议 ≤10），仅 Classic 需显式设 |
| Single active consumer | `x-single-active-consumer` | 同组多消费者只激活一个，保证顺序（true/false） |
| Classic queue version | `x-queue-version` | 存储实现版本，4.0 起仅 `2` |
| Queue leader locator | `x-queue-leader-locator` | leader 所在节点：`client-local`（默认）/ `balanced` |

> 上面这些参数里，TTL、长度限制、DLX、leader-locator 等 Quorum/Stream 也大多支持；优先级（`x-max-priority`）、存储版本号等是 Classic 特有，差异在下两节说明。

**持久化与内存**：Classic 的消息默认会写盘，但不会把所有消息都留在内存里——它只在内存中最多缓存约 **2048 条**最近的消息，用于快速派发给消费者，其余按需从磁盘读取；小于 **4096 字节**的小消息会「内嵌」进索引存储；若一条消息生产后立刻被消费并 Ack，就根本不会落盘。这样既保持低延迟，又不会因积压把内存撑爆。

Classic 由单个 Broker 管理（**不跨节点复制**），不适合长期大量堆积。注意：**Classic 镜像队列（mirrored classic queues）已于 2024 年随 RabbitMQ 4.0 移除**，需要跨节点复制请用 Quorum。

> **什么是 Classic 镜像队列？为什么移除？**
> 镜像队列是 Quorum 出现前（3.x）让 Classic 队列具备高可用的老方案：通过 policy 配置 `ha-mode`，把队列复制成 **1 个 master + N 个 mirror**，主从复制。它有两个硬伤——新加入的 mirror 需要**全量同步**（同步期间 master 一挂就丢消息），网络分区恢复时还易脑裂。Quorum 基于 Raft 强一致，follower 只补差额、leader 选举更快，官方称相比镜像队列 "superior in every way"，于是 **2021 年弃用、2024 年随 4.0 彻底移除**。结论：**需要复制 / 高可用，现在直接选 Quorum。**

适合：

- 数据量小
- 生产消费速度稳定
- 内部系统间调用
- 临时队列（transient / exclusive / 高频增删，Classic 是这类场景的最优解）

---

## 二、Quorum 仲裁队列

### 2.1 一句话定位

3.8.0 引入、基于 **Raft 一致性协议** 的**可复制** FIFO 队列——官方目前主推的队列类型，定位是**已移除的 Classic 镜像队列的继任者**（新集群要高可用，默认就选它）。

> 文档：[https://www.rabbitmq.com/docs/quorum-queues](https://www.rabbitmq.com/docs/quorum-queues)

### 2.2 核心机制：Raft 复制

- **quorum = (N/2) + 1**：一条消息必须被**过半副本**确认，才算写入成功。
- **Publisher Confirm 只在复制到 quorum 后才发出**——所以「已确认 = 已在多数节点落盘」，只要多数节点不永久丢失，消息就不丢。
- **默认 3 副本**（每个节点 1 个），组大小建议**奇数**；至少 3 节点才有容错意义。
- 副本分 **leader / follower**：leader 挂自动选举新 leader，follower 重新上线**只补差额日志**、无需全量同步（这是它相对镜像队列的关键优势）。

容错能力：

| 集群节点数 | 可容忍故障节点数 | 抗网络分区 |
|:---:|:---:|:---:|
| 1 | 0 | — |
| 2 | 0 | ❌ |
| 3 | 1 | ✅ |
| 5 | 2 | ✅ |

### 2.3 相对 Classic 的差异与新增

| 对比项 | 说明 |
|--------|------|
| 持久化 | 必须 durable，**无 Transient**，消息从不只放内存 |
| 独占 | **不支持 Exclusive**，不能做临时队列 |
| 毒消息 | 跟踪 `x-delivery-count`；**4.0 起 `delivery-limit` 默认 20**，超限丢弃或进死信 |
| 死信 | 支持 DLX，且支持更安全的 **at-least-once 死信**（需 `overflow=reject-publish`） |
| **4.3 新增** | 严格优先级（0–31，无需 `x-max-priority`）、Consumer Timeout、Delayed Retry 线性退避 |
| 数据安全 | 已确认消息在多数节点存活时安全；**未确认消息不保证**（可能丢在传输 / 缓冲中） |

![Quorum 队列 Delivery limit 与毒消息处理](/中间件/rabbitmq/14/p04-02.png)

> 毒消息（Poison Message）关系到队列会不会被一条「消费不掉」的消息卡死，是 RabbitMQ 的重点概念——**完整机制在本文第七章单独详解**。

### 2.4 常用 Arguments

Quorum 复用 Classic 大部分 Arguments，但**默认值不同、并新增了几组特有参数**：

| 界面英文（官方术语） | 参数名 | 作用 / Quorum 取值 |
|------|------|------|
| Queue type | `x-queue-type` | 必须为 `quorum` |
| Quorum initial group size | `x-quorum-initial-group-size` | Raft 组初始成员数（副本数），默认 3，建议奇数，≤集群节点数 |
| Delivery limit | `x-delivery-limit` | 毒消息投递次数上限，**4.0 起默认 20**；`-1` 关闭（不推荐） |
| Dead letter strategy | `x-dead-letter-strategy` | 死信投递可靠性：`at-most-once`（默认）/ `at-least-once` |
| Overflow behaviour | `x-overflow` | **不支持 `reject-publish-dlx`**；`drop-head` / `reject-publish` |
| Delayed retry type | `x-delayed-retry-type` | 延迟重试（4.3，线性退避）：`disabled`（默认）/ `all` / `failed` / `returned` |
| Delayed retry min/max | `x-delayed-retry-min` / `x-delayed-retry-max` | 延迟重试最小 / 最大延迟（毫秒） |
| Consumer timeout | `x-consumer-timeout` | 消费者超时（4.3），超时未 Ack 则重投（毫秒） |
| Message TTL | `x-message-ttl` | 消息 TTL（毫秒），设置后每条额外 +16 字节内存 |

> 注意：Quorum **没有 `x-max-priority`**——默认就提供 0–31 严格优先级，设了也忽略；也**没有 Transient / Exclusive**（强制 durable、非独占）。

### 2.5 资源占用：纠正一个常见误解

Quorum **并不把消息体常驻内存**，所有数据都落盘；它只维护一个**内存索引**，每条消息至少 32 字节（约每 3 万条 1MB）。所以它真正怕的不是「内存撑爆」，而是**超长积压**（官方建议 500 万条以上改用 Stream）。

性能上：因所有数据先落盘再处理，**吞吐随消息增大、副本数增多而下降**——建议用最快的磁盘、给消费者设较高的 prefetch。

### 2.6 适用场景

**适合**：队列长期存在、容错与数据安全优先于低延迟的场景，如订单、支付通知、投票。

**不适合**（官方明确列出）：

1. 临时队列（transient / exclusive / 高频增删）
2. 对延迟极敏感（Raft 共识本身有开销）
3. 不想手动 Ack / Confirm、对数据安全要求不高
4. **超长积压（5M+ 消息）** 或 **大扇出（large fan-out）** → 用 Stream
5. 单集群超过 ~5000 个 Quorum 队列需重新评估拓扑

---

## 三、Stream 流式队列

3.9.0 引入，消息以 **append-only 日志** 持久化到磁盘并分布式备份，采用 **非破坏性读取（non-destructive）** 语义：消息被消费后不从日志删除，可被多个订阅者反复读，直到过期。适合 **读多、Consumer 多、堆积大** 的场景。

> **官方原文**（[Streams — RabbitMQ](https://www.rabbitmq.com/docs/streams)）：
> Streams model an append-only log of messages that can be repeatedly read until they expire. Streams are always persistent and replicated. A more technical description of this stream behavior is "non-destructive consumer semantics".

![Stream 队列创建与日志分段参数](/中间件/rabbitmq/14/p05-01.png)

> 文档：[https://www.rabbitmq.com/docs/streams](https://www.rabbitmq.com/docs/streams)

### 3.1 四大特点

| 特点 | 说明 |
|------|------|
| **Large fan-outs** | 多订阅者共享同一 Stream，不必每人绑专用 Queue |
| **Replay / Time-travelling** | 按 offset / 时间戳 / 区间从任意位置重新读取已消费消息 |
| **Throughput** | 为高吞吐设计（推荐用 Stream 二进制协议客户端，吞吐最佳） |
| **Large logs** | 百万级消息堆积仍保持较低内存开销（仅未落盘数据在内存） |

### 3.2 Stream 的能力边界

因为是「非破坏性读取 + 日志型」，许多传统队列特性 **Stream 永远不会支持**（官方功能矩阵明确）：

- ❌ 消息优先级 / Consumer 优先级
- ❌ 死信交换机（DLX）
- ❌ 毒消息处理
- ❌ 消息 TTL / 队列长度限制 → **改用 Retention 策略**（`max-age`、`max-length-bytes`）
- ❌ Transient 非持久化（永远 durable）
- ❌ Exclusive 独占
- ❌ 对内存告警作出反应（Stream 本身内存占用极小）

### 3.3 常用 Arguments

Stream 没有 TTL、长度限制这些传统概念，取而代之的是**保留策略（Retention）**，参数也比 Classic/Quorum 少：

| 界面英文（官方术语） | 参数名 | 作用 / 取值 |
|------|------|------|
| Queue type | `x-queue-type` | 必须为 `stream` |
| Max length bytes | `x-max-length-bytes` | Stream 最大容量，超出按保留策略丢弃最旧段（默认无上限） |
| Max age | `x-max-age` | 最旧数据保留时长：`Y`/`M`/`D`/`h`/`m`/`s`，如 `7D`（默认无） |
| Stream max segment size bytes | `x-stream-max-segment-size-bytes` | 段文件大小（保留按段计算，至少留 1 段），默认 500000000（500MB） |
| Stream filter size bytes | `x-stream-filter-size-bytes` | 过滤用的布隆过滤器大小，16–255，默认 16 |
| Initial cluster size | `x-initial-cluster-size` | 初始副本数（每节点 1 副本），默认 = 集群节点数 |
| Queue leader locator | `x-queue-leader-locator` | leader 定位：`client-local`（默认）/ `balanced` |

> 两个保留参数可组合使用；保留是**按段（segment）**生效的，所以至少保留 1 个含消息的完整段。`x-stream-offset` 是**消费时**的参数（见第五章），不是声明参数。

### 3.4 适用场景

**适合**（官方定位的 4 个用例）：

- **大扇出（Large fan-outs）**：同一条消息推给大量订阅者，如广播通知、多服务订阅同一事件——不必再为每个消费者绑专用队列
- **回溯 / 重放（Replay）**：按 offset 或时间点重新读取历史消息，如事件溯源、数据回放、故障后补偿
- **高吞吐（Throughput）**：日志型系统追求极致吞吐（配合 Stream 二进制协议客户端最佳）
- **超大堆积（Large logs）**：百万~千万级消息长期堆积，内存占用仍很低

**不适合**：

- 需要「消费即删除」的**传统工作队列**语义 → 用 Classic / Quorum
- 需要 **DLX / 优先级 / 毒消息 / TTL** → 用 Quorum
- 对数据安全要求极高（Stream 不主动 fsync，异常断电可能丢）→ 用 Quorum
- **临时 / 独占**队列（Stream 永远 durable、非独占）

---

## 四、三种队列横向对比

把官方两张 Feature Matrix 合并成一张表，选型时直接对照（✅ 支持 / ❌ 不支持）：

| 特性 | Classic | Quorum | Stream |
|------|:---:|:---:|:---:|
| **引入版本** | 最早 | 3.8 | 3.9 |
| **底层机制** | 单节点 FIFO | Raft 复制 FIFO | append-only 日志 |
| **跨节点复制 / 高可用** | ❌（4.0 移除镜像） | ✅ 默认 3 副本 | ✅ 默认每节点副本 |
| **Transient 非持久化** | ✅（4.0 起移除） | ❌ 必须 durable | ❌ 必须 durable |
| **Exclusive 独占** | ✅ | ❌ | ❌ |
| **消息落盘** | 可选 per-message | 总是 | 总是（不主动 fsync） |
| **消息体驻留内存** | 部分 | 从不 | 从不（内存极小） |
| **消息优先级** | ✅ | ✅（4.3 严格 0-31） | ❌ |
| **Consumer 优先级** | ✅ | ✅ | ❌ |
| **消息 TTL** | ✅ | ✅ | ❌（用 Retention） |
| **队列长度限制** | ✅ | ✅ | ❌（用 Retention） |
| **死信交换机 DLX** | ✅ | ✅（支持 at-least-once） | ❌ |
| **毒消息处理** | ❌ | ✅（limit 默认 20） | ❌ |
| **回溯重读 replay** | ❌ 消费即删 | ❌ 消费即删 | ✅ 任意 offset |
| **大扇出 fan-out** | 一般 | 一般 | ✅ 原生支持 |
| **超大积压（5M+）** | 差 | 内存索引压力大 | ✅ 低内存 |
| **临时 / 高频增删** | ✅ 最优 | ❌ | ❌ |
| **全局 QoS prefetch** | ✅（4.0 起移除） | ❌ | ❌ |

> **一句话选型**：**Classic** = 轻量 / 临时 / 内部调用；**Quorum** = 高可靠复制（新集群默认）；**Stream** = 大日志、多订阅、可回溯、高吞吐。

---

## 五、如何声明与消费

### 5.1 Quorum

```java
Map<String, Object> params = new HashMap<>();
params.put("x-queue-type", "quorum");
channel.queueDeclare(QUEUE_NAME, true, false, false, params);
```

`durable=true`、`exclusive=false` 为强制要求，Producer 与 Consumer 声明须一致。`x-queue-type` 只能在声明时指定，不能用 policy 修改。

### 5.2 Stream

```java
Map<String, Object> params = new HashMap<>();
params.put("x-queue-type", "stream");
params.put("x-max-length-bytes", 20_000_000_000L);          // 日志最大 20GB
params.put("x-stream-max-segment-size-bytes", 100_000_000); // 单段 100MB（默认 500MB）
channel.queueDeclare(QUEUE_NAME, true, false, false, params);
```

消费 Stream 三步：

1. **`basicQos` 必须设置**（Ack 在此充当推进 offset 的「信用」机制）
2. 正确声明 Stream 参数
3. 消费时指定 **`x-stream-offset`**

```java
Map<String, Object> consumeParam = new HashMap<>();
consumeParam.put("x-stream-offset", "last");
channel.basicConsume(QUEUE_NAME, false, consumeParam, myconsumer);
```

| offset 值 | 含义 |
|-----------|------|
| `first` | 从日志中第一条可用消息开始 |
| `last` | 从最后写入的一个 **chunk**（消息批次）开始 |
| `next` | 同不指定 offset：从消费者启动后的下一条新消息开始（读不到历史消息） |
| 数字 | 具体偏移量，越界则钳到首 / 尾 |
| Timestamp | 按消息到达时间定位（POSIX 秒），钳到最近的 chunk 边界 |
| Interval 字符串 | 相对当前时间，如 `"1h"`、`"7D"`（与 `x-max-age` 同格式） |

**Spring Boot 限制**：Spring AMQP 可以声明 Stream、可以发送，但用 `@RabbitListener` 消费 Stream 时，对 offset 的传递支持取决于 Spring AMQP 版本（较老版本无法直接传 offset）。变通方案：

- 注入原生 `Channel` 用 AMQP 0.9.1 API（如上）
- 使用 RabbitMQ **Stream 插件 + 独立 Stream 客户端**（官方推荐的二进制协议，吞吐最佳，但对应用侵入较大，企业采用较少）

### 5.3 行业采用现状

> 怎么选型见第四章末尾「一句话选型」，这里只讲三类队列在**实际生产中的采用情况**：

| 类型 | 现状 |
|------|------|
| Classic | 企业存量用得最多，简单场景够用；镜像已弃，无 HA |
| Quorum | 官方主推，**新集群默认的复制型队列** |
| Stream | 仍在完善，大日志、多订阅场景可试点；3.11+ 还有 Super Stream 分区 |

---

## 六、关于 lazy-mode：已被移除

> 官方原文：**"RabbitMQ no longer supports the 'lazy' mode."**（[lazy-queues](https://www.rabbitmq.com/docs/lazy-queues) 页面仅作历史参考）

**历史背景**：3.6 ~ 3.12 的 Classic 支持 **lazy-mode 懒队列**——尽早把消息写硬盘、几乎不留内存，适合长期堆积换内存。旧版要在「低延迟（非懒）」与「低内存（懒）」之间二选一。

**现状**（3.12 起）：

- **lazy-mode 设置已被忽略**，Classic 队列的当前行为本身就接近当年懒队列：默认写盘（有延迟缓冲）+ 少量消息留内存加速消费，**低延迟与低内存兼得**。
- 因此旧资料「3.13 用 Quorum 替代 lazy-mode」的说法已过时——**lazy-mode 已不存在，谈不上替代**；若当年的诉求是「复制 / 高可靠」就选 Quorum，是「超大堆积」就选 Stream（完整对比见第四章）。

---

## 七、深入：毒消息（Poison Message）

毒消息是 RabbitMQ（乃至所有消息中间件）绕不开的坑。前面反复提到「Classic 不支持毒消息处理、Quorum 支持」，这一节把它彻底讲透。

### 7.1 什么是毒消息

一条**内容本身有问题**的消息，消费者每次处理都失败，于是被反复「重新入队 → 再次投递 → 再次失败」，陷入死循环，永远消费不掉：

```
消费者收到消息 → 处理失败（异常）→ nack(requeue=true)
      ↑                                          ↓
      └────── 消息回队列，又被派发下来 ←──────────┘
```

典型例子：

- 消息体是坏的 JSON，`JSON.parse` 必然抛异常
- 消息引用了已下线的服务 / 不存在的用户 ID，业务校验永远不通过
- 消息格式对，但语义永远无法满足（如金额为负）

### 7.2 关键洞察：先分清两种失败

判断是不是毒消息，看失败是**瞬时**的还是**永久**的：

| 类型 | 例子 | 重试有用吗 |
|------|------|:---:|
| **瞬时故障（Transient）** | 下游数据库抖动、网络超时、第三方限流 | ✅ 过会儿就好 |
| **永久故障（Poison）** | JSON 坏了、数据不存在、业务规则不允许 | ❌ 再试一万次也一样 |

**毒消息 = 永久故障**——重试治不好它，必须靠「重试上限 + 死信」来终结。

### 7.3 危害

1. **堵塞队列**：毒消息反复占用消费位，后面的正常消息被拖延甚至饿死
2. **浪费资源**：消费者不停重试、Broker 不停重投，CPU / IO / 网络白耗
3. **日志膨胀**：Quorum 里这条消息的 `x-delivery-count` 无限增长

### 7.4 三种队列的处理方式

| 队列 | 原生处理 | 做法 |
|------|:---:|------|
| **Classic** | ❌ | 不跟踪投递次数，可无限重投；只能靠应用层计数或 `requeue=false` |
| **Quorum** | ✅ | 跟踪 `x-delivery-count`，超过 `delivery-limit`（4.0 默认 **20**）就**丢弃或转死信** |
| **Stream** | — | offset 只进不退，消费失败**不重投**，模型上天然免疫 |

### 7.5 Quorum 的毒消息机制详解

**两个计数器**（4.3 起）：

- `x-delivery-count`：**失败的投递次数**（真正的「重试了几次」）
- `x-acquired-count`：被消费者**获取**的次数（含成功 + 失败，4.3 新增，官方推荐用它观察消费者接触次数）

**4.3 判定标准变了**：`delivery-limit` 改为基于 `delivery-count`（而非旧的 `acquired-count`）。也就是说，只有「真正的失败」才计数：

| 消费者动作 | `delivery-count` 是否 +1 |
|------|:---:|
| `basic.reject`（拒绝） | ✅ |
| 客户端崩溃 / 连接断开（有待确认消息） | ✅ |
| AMQP 1.0 `modified` + `delivery-failed=true` | ✅ |
| `basic.nack`（未设失败标记） | ❌ |
| 消费者超时（未 Ack） | ❌ |
| 网络分区（消费者节点被怀疑下线） | ❌ |

**超限后的去向**：消息被 **丢弃（drop）**；若配了 DLX，则**转投死信队列**。官方强烈建议**每个 Quorum 队列都配 DLX**，别让消息被静默丢掉——可以用一个 Stream 当低成本的死信暂存，保留一段时间供排查。

**配合 delayed-retry（4.3）更优雅**：光靠 `delivery-limit` 硬截断有点粗暴——配上 `x-delayed-retry-*` 做**线性退避**（首次 1s、二次 2s…封顶 max），先给瞬时故障留恢复时间，真到上限再进死信，兼顾「重试治瞬时」和「终结毒消息」。

### 7.6 Classic 没有原生机制，怎么办

Classic 不计投递次数，毒消息能无限重投。常见应对：

1. **应用层计数**：在消息 header 或外部存储（如 Redis）累计重试次数，超限就 `requeue=false`
2. **失败直接转死信**：`basicReject(deliveryTag, false)`（不 requeue）+ 队列配 DLX，让坏消息直接进死信队列
3. **借助 DLX 的 `x-death` header**：消息被死信时会携带历史投递信息，可用于排查

### 7.7 防范毒消息的通用清单

- ✅ **务必设重试上限**（Quorum 用 `delivery-limit`；Classic 应用层计数）
- ✅ **配死信队列（DLX）兜底**，别让消息被静默丢弃
- ✅ **区分瞬时 vs 永久故障**：永久故障 `requeue=false`，直接走死信
- ✅ **用 delayed-retry 退避**（Quorum 4.3），避免快速重试风暴
- ✅ **死信队列有人盯**：定期排查、修代码 / 补数据后重放

> 一句话：**毒消息 = 「消费不掉又赶不走」的死循环消息**；Quorum 用 `delivery-limit` 自动终结，Classic 要自己造轮子，Stream 因模型不同天然免疫。

---

## 小结

| 队列 | 一句话 |
|------|--------|
| Classic | 传统 FIFO，轻量 / 临时 / 内部调用；4.0 起无镜像 |
| Quorum | Raft 复制，高可靠，官方推荐的新集群默认 |
| Stream | 日志型，大堆积、可回溯、多订阅、高吞吐；不支持 DLX / 优先级 / 毒消息 |

下一篇：死信队列（DLX）与 TTL + DLX 实现延迟队列。
