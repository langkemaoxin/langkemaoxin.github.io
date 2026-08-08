---
title: "MQ 如何保证消息不丢失"
sidebarGroup: "MQ 常见问题"
shortTitle: "01 消息不丢失"
order: 1
date: 2026-09-26
category: "中间件"
tag:
  - "消息队列"
  - "中间件"
  - "FAQ"
---

> **MQ 常见问题 · 第 1/2 篇**  
> 下一篇：[《重复消费、堆积、顺序与选型对照》](/中间件/faq/mq-faq-02-common-issues)

---

## 开头：消息丢了，谁背锅？

线上订单系统凌晨告警：支付成功，但下游履约没收到消息。排查一圈，发现 Broker 非正常断电，PageCache 里还没刷盘的数据没了。这类问题在面试里常被简化为「三问：生产端、Broker、消费端怎么保证不丢」，但真正落地时，RabbitMQ、Kafka、RocketMQ 给出的答案并不相同——取舍也不同。

本篇从**整条消息链路**出发，对照三套主流 MQ，梳理「消息不丢失」在每个环节的可行方案与代价。读完应能回答：哪些环节天然有风险、各产品默认行为是什么、以及业务上如何按场景取舍。

![MQ 常见问题梳理——消息不丢失是跨产品共性话题](/中间件/faq/44/p02-01.png)

---

## 一、哪些环节可能会丢消息

一条消息从 Producer 到 Consumer，大致经过四个阶段：

| 阶段 | 说明 | 丢消息风险 |
|------|------|------------|
| 1. 生产者 → Broker | 跨网络发送 | 网络抖动、超时未确认 |
| 2. Broker 接收 | 写入内存/磁盘 | PageCache 未刷盘、断电 |
| 3. Broker 主从同步 | Master → Slave / Leader → Follower | 同步延迟、Leader 切换 |
| 4. Broker → 消费者 | 跨网络拉取/推送 | 拉取失败、消费确认异常 |

其中 **1、2、4** 都涉及跨网络；**3** 的 PageCache 机制则是 Broker 本地持久化的经典坑：消息先进入操作系统页缓存，再由 OS 异步落盘。若服务异常退出，缓存中尚未写入磁盘的数据就会丢失。

理解这四个环节，是后面逐层加固的基础。

---

## 二、生产者发送：确认机制是统一思路

### 2.1 场景

生产者发出消息后，若无法确认 Broker 是否写入成功，就只能猜测——网络不通时尤其如此。统一思路是**生产者确认（Producer Ack / Confirm）**：Broker 写入完成后给 Producer 明确响应；失败则重试或抛错，由业务决定补救。

### 2.2 RocketMQ

RocketMQ 提供三种发送方式，安全与效率的权衡一目了然：

```java
// 单向发送：不等待 Broker 确认，吞吐高，可能丢消息
producer.sendOneway(msg);

// 同步发送：阻塞等待 SendResult，最安全，延迟最高
SendResult sendResult = producer.send(msg, 20 * 1000);

// 异步发送：另起线程等确认，通过回调处理成功/失败，均衡之选
producer.send(msg, new SendCallback() {
    @Override
    public void onSuccess(SendResult sendResult) { /* ... */ }

    @Override
    public void onException(Throwable e) { /* 重试或告警 */ }
});
```

金融、订单等对可靠性敏感的场景，应优先**同步或异步 + 失败重试**，避免 `sendOneway`。

### 2.3 Kafka

Kafka 的 `producer.send(record)` 返回 `Future<RecordMetadata>`，本质是异步；调用 `.get()` 才变成同步等待结果：

```java
Future<RecordMetadata> future = producer.send(record);
RecordMetadata recordMetadata = producer.send(record).get();
```

配合 `acks=all`、重试、`enable.idempotence=true`（幂等，见第二篇），可显著降低生产端丢消息与重复投递风险。

### 2.4 RabbitMQ

RabbitMQ 提供 **Publisher Confirms**：Publisher 收到 Broker 的 `ack`/`nack` 后再执行回调。

```java
Channel ch = ...;
ch.addConfirmListener(ConfirmCallback ackCallback, ConfirmCallback nackCallback);
```

Classic 队列即便声明为持久化，服务端也**不会**对每条消息实时 `fsync`（见下文 Broker 刷盘）。因此对 RabbitMQ，**Publisher Confirms 往往是生产端可靠性的关键一环**，与 Kafka、RocketMQ 的「等 Broker 响应」思路一致。

### 2.5 RocketMQ 事务消息：确认机制的延伸

RocketMQ 的事务消息在「生产者确认」之上，把**本地事务**与**消息是否下发**绑在一起：先发半消息，本地事务提交后再 Commit，否则 Rollback。本质是**多次确认 + 业务反悔窗口**。

![RocketMQ 事务消息基本流程](/中间件/faq/44/p04-01.png)

![事务消息与本地事务、下游投递的关系](/中间件/faq/44/p04-02.png)

典型场景：用户下单后、支付完成前，用事务消息保证「本地订单状态」与「是否向履约 Topic 发消息」一致——要么都成功，要么都不发。

---

## 三、Broker 写入：PageCache 与刷盘策略

### 3.1 操作系统层面

应用写磁盘只能调用 `write`；数据经 **PageCache** 再落盘的过程在内核态完成，应用无法干预每一步。唯一能主动推动落盘的是 `fsync` / `fdatasync` 类系统调用。

![Linux write 与 fsync 的关系——应用能主动刷盘的入口](/中间件/faq/44/p05-01.png)

MQ 的「同步刷盘 / 异步刷盘」，最终都落在这层语义上。

### 3.2 RocketMQ：`flushDiskType`

RocketMQ Broker 配置项 `flushDiskType`：

| 模式 | 行为 | 特点 |
|------|------|------|
| `SYNC_FLUSH` | 同步刷盘 | 更安全，IO 压力大 |
| `ASYNC_FLUSH` | 定时刷盘 | 性能稳，断电可能丢未刷盘数据 |

注意：即便 `SYNC_FLUSH`，源码实现也是**约 10ms 间隔**批量刷盘，而非每条消息一次 `fsync`——海量消息下 OS 扛不住逐条刷盘。极端断电仍可能有毫秒级窗口内的丢失，但已通过绝大多数业务验证。

![RocketMQ 同步刷盘与异步刷盘配置示意](/中间件/faq/44/p06-01.png)

### 3.3 Kafka：刷盘参数组合

Kafka 没有显式的「同步/异步刷盘」开关，但通过参数控制刷盘频率：

- `flush.ms`：强制刷盘间隔
- `log.flush.interval.messages`：同一 Partition 消息条数达到阈值则刷盘（默认极大，相当于很少触发）
- `log.flush.interval.ms`：消息在内存保留时长
- `log.flush.scheduler.interval.ms`：检查是否需要刷盘的调度间隔

若将 `log.flush.interval.messages` 设为 `1`，等价于「每写一条就申请刷盘」，接近同步刷盘语义——代价是吞吐骤降。

### 3.4 RabbitMQ：Classic vs Stream

RabbitMQ 官方说明：

- **Classic 队列**：即使持久化队列，服务端也**不会**实时 `fsync`，**无法保证**断电不丢。
- **Stream 队列**：**不会**主动 `fsync`，交给操作系统自行刷盘。

对策同样是：**Publisher Confirms + 业务层重试**；对 RabbitMQ 而言，这比指望 Broker 逐条落盘更现实。

---

## 四、Broker 主从同步：产品哲学差异最大处

### 4.1 RocketMQ 普通集群（Master / Slave）

可固定节点角色为 Master 或 Slave。Master 崩溃时，已写入 Master 但**尚未同步到 Slave** 的数据，会留在 Master 磁盘上；Master 恢复后继续同步。Slave **不会**自动升 Master，因此不会出现「新 Leader 丢弃旧数据」的冲突。

在这种模型下，只要 **Master 磁盘完好**，主从同步延迟通常**不会**导致永久丢失——未同步部分可事后补同步。

### 4.2 Kafka：Leader 切换与 HW

Kafka Partition 的 **Leader** 宕机后，Follower 选举新 Leader；**一切以新 Leader 为准**。旧 Leader 重启后作为 Follower，会**删除 High Watermark 之后的数据**，从新 Leader 重新同步——尚未复制到新 Leader 的消息可能**永久丢失**。

![RocketMQ 普通集群与 Kafka Leader 切换——对「未同步数据」的处理不同](/中间件/faq/44/p07-01.png)

差异根源：RocketMQ 出身阿里金融场景，**消息安全**权重高；Kafka 出身 LinkedIn 日志管道，**可用性**权重高。这不是谁对谁错，而是产品对业务的取舍。

### 4.3 RocketMQ DLedger 高可用集群

DLedger 基于 **Raft**，CommitLog 通过多数派复制：

![DLedger Raft 复制——多数派确认后提交](/中间件/faq/44/p08-01.png)

Raft 优先保证**集群内一致性**，极端网络分区下仍可能丢失未获多数派确认的 Entry；但在 RocketMQ 典型部署里概率极低。结合**生产者确认**，DLedger 集群的主从同步安全性通常可认为**接近不丢**。

---

## 五、消费者：确认机制与异步陷阱（预告）

Broker 侧：若 Consumer 处理完未 ACK，Broker 会**重投**（RocketMQ/Kafka 靠 Offset，RabbitMQ Classic 重新入队）——正常路径下**消费环节不会丢消息**，反而要防**重复消费**（第二篇详述）。

真正会在消费端「丢」的典型写法：**监听器里另起线程处理业务，主线程立刻返回 SUCCESS**——Broker 认为已消费，异步线程若失败则消息不会被重投。使用第三方框架时也要确认是否存在类似异步 ACK。

---

## 六、小结：没有银弹，只有权衡

| 环节 | 通用原则 | RabbitMQ | Kafka | RocketMQ |
|------|----------|----------|-------|----------|
| 生产端 | 等 Broker 确认，失败重试 | Publisher Confirms | `acks` + `.get()` / 回调 | 同步/异步 send，避免 oneway |
| Broker 落盘 | 接受 PageCache 窗口或同步刷盘 | Classic/Stream 不保证实时 fsync | 调 flush 参数 | `SYNC_FLUSH`（约 10ms 批量） |
| 主从 | 理解 Leader 切换语义 | 镜像/Quorum 队列另论 | Leader 切换可能丢未同步段 | Master-Slave 可恢复；DLedger + Raft |
| 消费端 | 处理完再 ACK，避免异步提前 ACK | manual ack | 提交 offset 时机 | 同步消费或顺序监听 |

所有「零丢失」方案都以**更高延迟、更低吞吐、更大集群压力**为代价。面试里的标准三板斧在真实业务里往往需要按 SLA 裁剪：日志采集可容忍少量丢失，支付链路则必须同步发送 + 同步刷盘 + 生产者确认 + 消费幂等。

下一篇继续：**重复消费与幂等、顺序性、消息堆积处理**，以及三套 MQ 在这些维度上的对照。
