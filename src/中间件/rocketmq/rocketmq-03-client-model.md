---
title: "RocketMQ 客户端模型——确认、顺序、延迟、事务"
sidebarGroup: "RocketMQ"
shortTitle: "03 客户端消息模型"
order: 3
date: 2026-09-18
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 3/10 篇**  
> 上一篇：[《运行架构与消息模型》](/中间件/rocketmq/rocketmq-02-architecture) · 下一篇：[《SpringBoot 整合与注意点》](/中间件/rocketmq/rocketmq-04-springboot-tips)

---

## 开头：下单链路既要快，又不能丢单

支付成功后的库存扣减、积分、物流通知——有的要求 **毫秒级返回**，有的允许 **最终一致**，还有 **同一订单步骤必须有序**。RocketMQ 在统一 Topic/MessageQueue 模型之上，用客户端 API 封装了确认机制、过滤、顺序、延迟、批量、事务与 ACL。本篇按「场景 → 用法 → 原理 → 注意点」梳理。

---

## 一、客户端固定步骤

![架构回顾与客户端定位](/中间件/rocketmq/41/p02-01.png)

依赖 `rocketmq-client 5.3.0`，生产者与消费者步骤高度固定：

**生产者：** 创建 Producer（组名）→ 指定 NameServer → **`start()`** → 构造 Message(Topic, Tag, body) → send → shutdown  

**消费者：** 创建 Consumer（组名）→ NameServer → subscribe(Topic, Tag/SQL) → 注册 Listener → **`start()`**  

Client **只需 NameServer 地址**，不必知道 Broker 列表（`setNamesrvAddr` 优先于环境变量 `NAMESRV_ADDR`）。

![Producer / Consumer 基本代码结构](/中间件/rocketmq/41/p03-01.png)

---

## 二、消息确认机制

### 1. 生产端：三种发送方式

| 方式 | API | 特点 | 适用 |
|------|-----|------|------|
| 单向 | `sendOneway` | 无返回值，可能丢 | 日志等可丢场景 |
| 同步 | `send` → `SendResult` | 阻塞等 Broker 反馈 | 订单等强可靠 |
| 异步 | `send(msg, SendCallback)` | 回调 onSuccess/onException | 高并发 + 需补救 |

`SendStatus` 非 `SEND_OK` 并不绝对表示消费者收不到——只表示 Broker 端处理未完全成功；重发时需带 **业务唯一键** 做幂等。

异步注意：**shutdown 前** 要等回调执行完，否则主线程退出会带走回调线程。

![三种发送方式对比](/中间件/rocketmq/41/p08-01.png)

### 2. 消费端：状态回传

```java
return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;  // 成功
return ConsumeConcurrentlyStatus.RECONSUME_LATER;    // 稍后重试
```

Broker 默认最多重试 **16 次**，超限进 **死信队列** `%DLQ%<ConsumerGroup>`。重试消息会进入 `%RETRY%<ConsumerGroup>`，避免阻塞原队列 FIFO。

**ConsumerFromWhere** 可指定新组从哪开始消费：

- `CONSUME_FROM_LAST_OFFSET`  
- `CONSUME_FROM_FIRST_OFFSET`  
- `CONSUME_FROM_TIMESTAMP`（配合 `setConsumerTimestamp`）

---

## 三、广播消息

```java
consumer.setMessageModel(MessageModel.BROADCASTING);
```

- **集群模式**：Broker 维护组级 Offset，一条消息组内只消费一次  
- **广播模式**：Offset 存 **客户端本地**（`LocalFileOffsetStore`），每个实例都收全量  

广播 **不支持 Broker 侧重试**；Offset 丢失则重启后只能消费新消息。

![广播与集群模式差异](/中间件/rocketmq/41/p10-01.png)

---

## 四、过滤消息

**Tag 过滤**（推荐，索引在 ConsumeQueue，性能高）：

```java
// 生产
new Message("TagFilterTest", "TagA", body);
// 消费
consumer.subscribe("TagFilterTest", "TagA");
// 多 Tag： "TagA || TagB"，全匹配： "*"
```

**SQL92 过滤**（需 Broker `enablePropertyFilter=true`）：

```java
consumer.subscribe("SqlFilterTest",
    MessageSelector.bySql("(TAGS in ('TagA','TagB')) and (a between 0 and 3)"));
```

过滤在 **Broker 端** 完成，减少无效网络 IO，但增加服务端压力；简单场景优先 Tag。

![Tag 与 SQL 过滤示例](/中间件/rocketmq/41/p12-01.png)

---

## 五、顺序消息

**局部有序**（常见）：同一 `orderId` 进同一 MessageQueue + 消费者用 `MessageListenerOrderly`。

```java
producer.send(msg, new MessageQueueSelector() {
    public MessageQueue select(List<MessageQueue> mqs, Message msg, Object arg) {
        int id = (Integer) arg;
        return mqs.get(id % mqs.size());
    }
}, orderId);

consumer.registerMessageListener(new MessageListenerOrderly() { ... });
```

Broker 对队列加锁，同一队列同时只有一个消费线程在处理。**全局有序** 只能单 Queue，性能差。

注意：顺序消费失败重试超限后会 **跳过** 该条继续后面消息，可能乱序；可返回 `SUSPEND_CURRENT_QUEUE_A_MOMENT` 而非抛异常。

![顺序消息生产与消费](/中间件/rocketmq/41/p13-01.png)

---

## 六、延迟消息

RocketMQ 特色能力（RabbitMQ 需插件/死信变通，Kafka 原生弱）。

**固定级别**（18 级，如 1s/5s/10s…）：

```java
message.setDelayTimeLevel(3);
```

**指定时间点**：

```java
message.setDeliverTimeMs(System.currentTimeMillis() + 10_000L);
```

固定级别：Broker 转入系统 Topic `SCHEDULE_TOPIC_XXXX`，18 个队列对应 18 级；到期再投回原 Topic。指定时间：时间轮 `rmq_sys_wheel_timer`（源码篇详述）。

![延迟级别与时间轮概念](/中间件/rocketmq/41/p14-01.png)

![延迟消息实现思路](/中间件/rocketmq/41/p14-02.png)

---

## 七、批量与事务消息

**批量**：`producer.send(List<Message>)`，同批 Topic 须相同，不支持延迟，单批 < 1M，过大用 `ListSplitter` 拆分。

**事务消息**（两阶段）：

1. 发半消息（对消费者不可见，存 `RMQ_SYS_TRANS_HALF_TOPIC`）  
2. 执行本地事务  
3. Commit → 可投递；Rollback → 丢弃  
4. 未知状态 → Broker **回查** 本地事务（默认最多 15 次，间隔 60s）  

适合「支付 + 多下游最终一致」：MQ 解耦 + 重试保证 Branch2.x，本地事务与半消息 Commit 保证 Main Branch 一致。

![事务消息流程](/中间件/rocketmq/41/p15-01.png)

![事务消息与分布式场景](/中间件/rocketmq/41/p15-02.png)

---

## 八、ACL 权限

跨部门/跨公司协作时可开启 `aclEnable=true`，`plain_acl.yml` 热加载：

- Topic / Group 维度 `PUB|SUB|DENY`  
- 客户端引入 `rocketmq-acl`，构造时传入 `AclClientRPCHook`  

---

## 九、本章小结

客户端 API 围绕 **NameServer 路由 + Topic/Tag + 确认/重试** 展开；高级特性（顺序、延迟、事务）大多依赖 Broker 系统 Topic 与后台服务配合。下一篇讲 **SpringBoot 集成** 与生产 **最佳实践、幂等、死信**。
