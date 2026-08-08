---
title: "Classic、Quorum、Stream——如何选择队列类型"
sidebarGroup: "RabbitMQ"
shortTitle: "06 队列类型"
order: 6
date: 2026-08-31
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 6/10 篇**  
> 上一篇：[《SpringBoot 集成 RabbitMQ》](/中间件/rabbitmq/rabbitmq-05-springboot)  
> 下一篇预告：[《死信队列与延迟队列》](/中间件/rabbitmq/rabbitmq-07-dlx-delay)

---

## 开头：Classic 队列积压了，为什么变慢

老版本 RabbitMQ 有个痛点：Queue 里消息一堆积，生产和消费性能断崖式下跌。3.8 起引入 **Quorum Queue**，3.9 引入 **Stream Queue**，分别解决分布式可靠性与大日志堆积吞吐问题。

创建队列时控制台可选三种类型：**Classic**、**Quorum**、**Stream**。本篇对比特性、适用场景与声明方式，并说明 3.13 为何建议用 Quorum 替代懒队列（lazy-mode）。

---

## 一、Classic 经典队列

RabbitMQ 最传统的队列类型，FIFO 存取，Consumer 取走后消息从队列删除；需重投则再次入队。

![Classic 队列创建选项：Durability 与 Auto delete](/中间件/rabbitmq/14/p03-01.png)

| 选项 | 说明 |
|------|------|
| **Durability: Durable** | 消息写磁盘，重启不丢，IO 开销较大 |
| **Durability: Transient** | 仅内存，性能高，重启丢失 |
| **Auto delete** | 所有 Consumer 断开后自动删除队列 |

Arguments 中还有大量扩展参数，可在控制台点击问号查看。

![Classic 队列 Arguments 参数列表](/中间件/rabbitmq/14/p03-02.png)

**持久化实现**：Version 1 整文件读写，积压大时服务端压力大；另一实现只读部分索引、按需加载（旧版 **lazy-mode 懒队列**），积压时内存压力较小。

Classic 由单个 Broker 管理，分布式效率一般，**不适合长期大量堆积**。适合：

- 数据量小
- 生产消费速度稳定
- 内部系统间调用

---

## 二、Quorum 仲裁队列

3.8.0 引入，基于 **Raft 一致性协议** 的分布式 FIFO 队列，官方目前主推类型，未来可能逐步替代 Classic。

![Quorum 队列控制台选项](/中间件/rabbitmq/14/p04-01.png)

文档：[https://www.rabbitmq.com/docs/quorum-queues](https://www.rabbitmq.com/docs/quorum-queues)

核心机制：消息需集群内 **过半节点确认** 才写入，保证分布式环境下不丢。代价是牺牲部分高级队列特性（相对 Classic 做「减法」）。

| 对比项 | 说明 |
|--------|------|
| 持久化 | 默认必须持久化，无 Transient |
| 独占 | Exclusive 队列，Connection 断开后自动删 |
| 毒消息 | 跟踪 `x-delivery-count`，超 **Delivery limit** 阈值删除或进死信 |
| 安全 | 配合 Publisher Confirms，已确认消息在集群内安全；未确认不保证 |

![Quorum 队列 Delivery limit 与毒消息处理](/中间件/rabbitmq/14/p04-02.png)

**适合**：队列长期存在、容错与数据安全优先于低延迟的场景，如订单、支付通知。

**不适合**：

1. 临时队列（transient / exclusive / 频繁删改）
2. 对延迟极敏感
3. 对安全要求不高、不想手动 Ack/Confirm
4. **严重积压**（Quorum 当前消息常驻内存至达上限）→ 考虑 Stream

---

## 三、Stream 流式队列

3.9.0 引入，消息以 **append-only 日志** 持久化到磁盘并分布式备份，适合 **读多、Consumer 多** 的场景。

![Stream 队列创建与日志分段参数](/中间件/rabbitmq/14/p05-01.png)

文档：[https://www.rabbitmq.com/docs/streams](https://www.rabbitmq.com/docs/streams)

### 3.1 四大特点

| 特点 | 说明 |
|------|------|
| **Large fan-outs** | 多订阅者共享同一 Stream，不必每人绑专用 Queue |
| **Replay / Time-travelling** | 按 offset 或时间戳重新读取已消费消息 |
| **Throughput** | 为高吞吐设计 |
| **Large logs** | 百万级消息堆积仍保持较低内存开销 |

![Stream 与 Classic 功能对比](/中间件/rabbitmq/14/p06-01.png)

Stream **不支持死信交换机**，**不支持毒消息处理**。

---

## 四、如何声明与消费

### 4.1 Quorum

```java
Map<String, Object> params = new HashMap<>();
params.put("x-queue-type", "quorum");
channel.queueDeclare(QUEUE_NAME, true, false, false, params);
```

`durable=true`、`exclusive=false` 为强制要求，Producer 与 Consumer 声明须一致。

### 4.2 Stream

```java
Map<String, Object> params = new HashMap<>();
params.put("x-queue-type", "stream");
params.put("x-max-length-bytes", 20_000_000_000L);
params.put("x-stream-max-segment-size-bytes", 100_000_000);
channel.queueDeclare(QUEUE_NAME, true, false, false, params);
```

消费 Stream 三步：

1. **`basicQos` 必须设置**
2. 正确声明 Stream 参数
3. 消费时指定 **`x-stream-offset`**

```java
Map<String, Object> consumeParam = new HashMap<>();
consumeParam.put("x-stream-offset", "last");
channel.basicConsume(QUEUE_NAME, false, consumeParam, myconsumer);
```

| offset 值 | 含义 |
|-----------|------|
| `first` | 从第一条可消费消息开始 |
| `last` | 从最后一条开始 |
| `next` | 不指定 offset，消费不到 |
| 数字 | 具体偏移量 |
| Timestamp | 从某时间点开始 |

![Stream 消费 offset 配置示意](/中间件/rabbitmq/14/p08-01.png)

**Spring Boot 限制**：可声明 Stream、可发送，但 `@RabbitListener` 目前无法直接传 offset 消费 Stream。变通方案：

- 在 Spring 中注入 `Channel` 用原生 API
- 使用 RabbitMQ **Stream 插件** + 独立 Stream 客户端（对应用侵入大，企业采用少）

### 4.3 选型建议

| 类型 | 现状 |
|------|------|
| Classic | 企业用得最多，简单场景够用 |
| Quorum | 官方主推，新集群优先 |
| Stream | 仍在完善，大日志、多订阅场景可试点 |

---

## 五、Quorum 替代懒队列（lazy-mode）

3.6 ~ 3.12 提供 Classic 的 **lazy-mode**：尽早把消息写硬盘，请求时再加载到 RAM，适合长期堆积、减内存。

3.13 官方明确建议：**3.11 及以后用 Quorum 替代 lazy-mode**。懒队列以磁盘 IO 换内存，Quorum 则在一致性与安全上更完整。

---

## 小结

| 队列 | 一句话 |
|------|--------|
| Classic | 传统 FIFO，轻量内部调用 |
| Quorum | Raft 复制，高可靠，官方推荐 |
| Stream | 日志型，大堆积、可回溯、高吞吐 |

下一篇：死信队列（DLX）与 TTL + DLX 实现延迟队列。
