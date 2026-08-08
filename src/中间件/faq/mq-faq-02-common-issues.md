---
title: "重复消费、堆积、顺序与选型对照"
sidebarGroup: "MQ 常见问题"
shortTitle: "02 重复堆积顺序等"
order: 2
date: 2026-09-27
category: "中间件"
tag:
  - "消息队列"
  - "中间件"
  - "FAQ"
---

> **MQ 常见问题 · 第 2/2 篇**  
> 上一篇：[《MQ 如何保证消息不丢失》](/中间件/faq/mq-faq-01-no-loss)

---

## 开头：不丢之后，还有三个「必考题」

消息不丢只是可靠性的一半。生产环境更常遇到：**同一条消息被消费两次**（重复下单）、**队列越积越多**（大促后 Consumer 追不上）、**局部顺序乱了**（同一用户的消息乱序处理）。这些问题 RabbitMQ、Kafka、RocketMQ 的机制不同，但排查思路相通。

本篇承接上一篇 Broker 与消费者确认机制，展开**幂等、顺序、积压**三类问题，并补充**MQ 全挂降级**与**选型经验**——对应原文档第五部分「课程总结」里的跨产品视角。

---

## 一、消费者消费：不丢的反面是重复与异步丢处理

上一篇在 Broker 主从环节对比了 RocketMQ DLedger 与 Kafka Leader 切换；进入消费端后，三套 MQ 都依赖**消费确认**推进进度——确认机制既是「不丢」的保障，也是「重复投递」的来源。

![DLedger 主从复制与消费确认——Broker 侧安全与 Consumer ACK 衔接](/中间件/faq/44/p08-01.png)

### 1.1 正常机制：没 ACK 就重投

Consumer 从 Broker 拉取消息后，处理完毕需 ACK。Broker 未收到 ACK（网络失败、Consumer 崩溃、处理超时）会认为失败，**再次投递**：

| 产品 | 重投方式 |
|------|----------|
| RocketMQ / Kafka | 依据 **Offset** 重新消费 |
| RabbitMQ Classic | 消息**重新入队** |

因此消费路径**通常不会丢消息**，设计重点应转向**幂等**（下文第三节）。

### 1.2 危险写法：异步处理 + 提前 ACK

```java
consumer.registerMessageListener(new MessageListenerConcurrently() {
    @Override
    public ConsumeConcurrentlyStatus consumeMessage(
            List<MessageExt> msgs, ConsumeConcurrentlyContext context) {
        new Thread() {
            public void run() {
                // 业务逻辑在子线程
            }
        }.start();
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS; // 主线程立刻成功
    }
});
```

监听器已返回 `CONSUME_SUCCESS`，Broker 不会重投；子线程若失败，**等价于丢处理**。业务里很少这么写，但部分框架内部可能多线程异步，需确认 ACK 时机。

![消费者异步处理导致「逻辑丢失」的典型代码](/中间件/faq/44/p09-01.png)

---

## 二、MQ 全挂：降级缓存

小概率极端情况：**整套 MQ 集群不可用**。常见降级：

1. Producer 发送失败时，写入**本地/Redis 降级队列**；
2. 业务主流程继续（或同步降级为写库 + 定时补偿）；
3. 后台线程轮询，MQ 恢复后**批量补发**。

这样 MQ 恢复后消息仍能进入下游，避免长时间静默丢失。代价是降级存储容量、顺序与幂等要在补偿链路里再次保证。

---

## 三、消息零丢失方案总结：没有最优解

上一篇各层加固（同步发送、同步刷盘、主从、ACK）叠加后，吞吐会明显下降。**不存在放之四海而皆准的最优解**——若存在，各 MQ 也不会保留多种配置与队列类型。

![消息零丢失各层方案与代价示意](/中间件/faq/44/p10-01.png)

业务上应明确：**可接受丢失窗口、可接受重复、可接受延迟**，再选组合。面试八股强调标准答案；线上强调**场景裁剪**。

---

## 四、如何保证消息顺序性（局部有序）

### 4.1 全局有序 vs 局部有序

业务上几乎只需要**局部有序**：同一聊天窗口、同一订单 ID、同一用户的消息按序处理；不同窗口之间顺序错乱通常无影响。

强行把 Topic 分区数设为 1 可做到全局有序，代价是吞吐瓶颈，多数场景属于「思维体操」。

![局部有序 vs 全局有序——业务上关注前者](/中间件/faq/44/p11-01.png)

### 4.2 实现要点：同一队列 + 单消费者线程

**生产端**：一组有序消息写入**同一队列/分区**。

| 产品 | 做法 |
|------|------|
| RocketMQ | 相同 sharding key → 同一 **MessageQueue** |
| Kafka | 自定义 Partitioner，相关消息进同一 **Partition** |
| RabbitMQ | 绑定关系把有序消息路由到**同一 Queue** |

**消费端**：从该队列**串行**取消息。

![RocketMQ 顺序消费：同一 MessageQueue + 消费端并发控制](/中间件/faq/44/p12-01.png)

- **RocketMQ**：顺序消息监听器 + 对消费线程的并发控制（源码里对 MessageQueue 加锁式消费）。
- **Kafka**：对单个 Partition 的拉取在 Consumer 内**天生单线程**，天然适合局部有序。
- **RabbitMQ Classic**：一个 Queue 对应**一个** Consumer 时顺序自然保证；**多个 Consumer 抢同一 Queue** 则无法保证顺序。

---

## 五、如何保证消息幂等性

### 5.1 生产端：重试导致重复发送

Producer 未收到 Broker 响应时会重试，但 Broker 可能已写入成功——只是响应包丢了。于是同一条业务消息可能被写两次。

**RocketMQ**：发送时为消息设置唯一 ID（`MessageClientIDSetter.setUniqID`），Broker 可据此去重。

```java
// org.apache.rocketmq.client.impl.producer.DefaultMQProducerImpl#sendKernelImpl
if (!(msg instanceof MessageBatch)) {
    MessageClientIDSetter.setUniqID(msg);
}
```

![RocketMQ 为每条消息分配唯一客户端 ID](/中间件/faq/44/p13-01.png)

**Kafka**：开启 **`enable.idempotence`**（默认 true，与其他配置冲突时可能关闭）。Broker 为每个 `<PID, Partition>` 维护序列号 SN，仅当 `SequenceNumber == SN + 1` 才接受，过小视为重复，过大抛 `OutOfOrderSequenceException`。

**RabbitMQ**：依赖 **Publisher Confirms + 业务侧 dedup**；Classic 无内置生产幂等序列号，需在消息头或业务 ID 上自建。

### 5.2 消费端：网络波动与重投

RocketMQ 官方说明：**绝大多数情况不必单独考虑重复消费**——但网络波动时，Consumer 已处理完却**ACK 丢失**，Broker 会再次投递，形成重复消费。

防重复的核心：**业务唯一键**。

| 来源 | 说明 |
|------|------|
| `messageId` | 简单场景够用 |
| 业务键 | 订单 ID、支付流水号等；可通过 Message **Key** 传递 |
| 批量/事务消息 | `messageId` 可控性变差，更应用业务键 |

Consumer 侧用 Redis / DB 唯一索引记录「已处理的 key」，处理前查重即可。

![消费端幂等：唯一键 + 已处理记录](/中间件/faq/44/p14-01.png)

### 5.3 别只防重复：还要防「永远消费不成功」

RocketMQ 重试多次仍失败 → **重试队列** → 最终进**死信队列（DLQ）**。出现 DLQ 通常意味着一批消息的业务逻辑系统性错误，需单独消费者修复数据。**注意**：DLQ 默认无消费权限，需手动调整。

RabbitMQ 可配置 **Dead Letter Exchange**；Kafka 需应用层死信 Topic 或重试主题。

---

## 六、如何快速处理消息积压

### 6.1 积压会带来什么

| 产品 | 短时积压 | 长期积压风险 |
|------|----------|--------------|
| RocketMQ / Kafka | 日志型存储，短时抗压强 | 日志过期**删除**，未消费消息随文件一起没 |
| RabbitMQ Classic / Quorum | 大量堆积**拖垮 Broker** | 需优先处理 |
| RabbitMQ Stream | 机制接近日志型 MQ | 同样有日志过期丢失风险 |

### 6.2 根因与扩容上限

根因几乎都是 **Consumer 处理太慢**。直接手段：增加 Consumer 实例——但**有上限**。

**RabbitMQ Classic（Work Queue）**  
同一 Queue 多 Consumer **轮询**分担，一般可线性加实例（注意 `basicQos`  prefetch，避免慢消费者拖后腿）。

**RocketMQ**  
同一 Consumer Group 内，**一个 MessageQueue 最多被一个 Consumer 消费**。Consumer 数量 **≤ MessageQueue 数量**；再多则有空闲实例。

**Kafka**  
同一 Group 内 Consumer 数量 **≤ Partition 数**，逻辑与 RocketMQ 类似。

### 6.3 紧急泄洪：新 Topic 转储（RocketMQ / Kafka 通用思路）

当 MessageQueue / Partition 数量不足、无法继续水平扩展 Consumer 时：

1. 新建 **Topic B**，配置足够多的 Queue/Partition；
2. 现有 Consumer **改订 Topic B**（或新业务走 B）；
3. 紧急上线**转储消费者**：只从旧 Topic A **快速拉取 → 写入 Topic B**，不做重业务逻辑；
4. 在 Topic B 上按 Queue 数量加 Consumer，并行消化；
5. 积压清完后，视情况合并回常规 Topic 或保留双 Topic。

RocketMQ 固定级别延迟消息等内部机制，也是「先转到系统 Topic 再转回」的同类思路。

![RocketMQ 积压紧急处理：扩容 Queue + 转储 Topic](/中间件/faq/44/p15-01.png)

**Kafka** 可同样采用：增加 Partition、临时消费组转写到新 Topic，或使用独立工具（如 MirrorMaker、自研转发）加速搬运。

---

## 七、选型对照：为什么有这么多 MQ

互联网上有几十种 MQ，功能表面相似，差异来自**业务场景的深度**：

| 维度 | RabbitMQ | Kafka | RocketMQ |
|------|----------|-------|----------|
| 设计原点 | AMQP、灵活路由、低延迟 | 分布式日志、超高吞吐 | 金融级消息、事务与顺序 |
| 路由模型 | Exchange + Binding 丰富 | Topic + Partition 简单 | Topic + Tag + MessageQueue |
| 持久化保证 | Classic 弱 fsync；Stream 交 OS | 可配 flush；Leader 切换语义 | 同步刷盘 + Master-Slave / DLedger |
| 顺序 | 单 Queue 单 Consumer | 单 Partition 有序 | MessageQueue + 顺序监听 |
| 积压 | Classic 怕堆；Stream 改善 | 强 | 强，注意过期 |
| 典型场景 | 复杂路由、RPC 异步、中小吞吐 | 日志、流式、大数据管道 | 电商订单、支付、事务消息 |

理解这些取舍，比背「Kafka 比 RabbitMQ 快」更有用：**没有绝对最好的 MQ，只有与场景匹配的选择**；资深价值在于问题发生时，能切换方案或组合使用（例如 Kafka 做日志管道 + RocketMQ 做交易链路）。

---

## 八、两篇串联：常见问题检查清单

| 问题 | 关键动作 |
|------|----------|
| 不丢失 | 生产确认、刷盘/主从策略、消费后再 ACK、降级缓存 |
| 顺序 | 同 key → 同队列/分区；消费端串行 |
| 幂等 | 生产端序列号/唯一 ID；消费端业务唯一键 + 去重表 |
| 积压 | 加 Consumer（受 Queue/Partition 限制）、转储 Topic、RabbitMQ 注意 Classic 性能 |
| 选型 | 按路由复杂度、吞吐、事务、顺序、运维模型选产品 |

上一篇：[《MQ 如何保证消息不丢失》](/中间件/faq/mq-faq-01-no-loss) —— 生产确认、PageCache 刷盘、Kafka Leader 与 RocketMQ DLedger 的对照。
