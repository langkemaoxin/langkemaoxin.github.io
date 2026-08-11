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

## 开头：订单 30 分钟未支付，怎么自动关单

RabbitMQ 没有内置「延迟队列」类型，但可以用 **TTL + 死信交换机（DLX）** 实现：消息在普通队列里等到过期，变成死信进入 DLX，再路由到死信队列，由消费者执行关单、释放库存等补偿逻辑。

死信队列（Dead Letter Queue）是对 **未能正常消费** 消息的补救机制——本质仍是普通 Queue，可继续声明 Consumer 处理。

---

## 一、核心参数

| 参数 | 说明 |
|------|------|
| `x-dead-letter-exchange` | 死信交换机名称 |
| `x-dead-letter-routing-key` | 转发到死信交换机时使用的 routing key（可选，会覆盖原 key） |
| `x-message-ttl` | 消息 TTL（毫秒） |
| `durable` | 建议 `true` |

流程：业务 Queue 上配置 DLX → 消息成为死信 → DLX 按 routing key 转发 → 死信 Queue → Consumer 消费。

![死信队列与 TTL 参数关系示意](/中间件/rabbitmq/14/p08-01.png)

**注意**：Classic 与 Quorum 支持死信；**Stream 不支持**。

---

## 二、何时产生死信

以下三种情况，RabbitMQ 将消息转为死信：

| 原因 | 说明 |
|------|------|
| **消费者拒绝** | `basicReject` / `basicNack`，且 `requeue=false` |
| **TTL 过期** | 消息在队列中超过 `x-message-ttl` 仍未被消费 |
| **队列超长** | 达到 `x-max-length` 等限制，新消息挤掉旧消息或拒绝入队 |

### 2.1 设置 TTL

**策略方式**（作用于匹配的所有队列）：

```bash
rabbitmqctl set_policy TTL ".*" '{"message-ttl":60000}' --apply-to queues
```

**声明队列时指定**：

```java
Map<String, Object> args = new HashMap<>();
args.put("x-message-ttl", 60000);
channel.queueDeclare("myqueue", false, false, false, args);
```

也可在 Web 控制台配置。

---

## 三、死信队列配置

### 3.1 策略批量配置

```bash
rabbitmqctl set_policy DLX ".*" '{"dead-letter-exchange":"my-dlx"}' --apply-to queues
```

### 3.2 单队列配置

```java
channel.exchangeDeclare("some.exchange.name", "direct");

Map<String, Object> args = new HashMap<>();
args.put("x-dead-letter-exchange", "some.exchange.name");
channel.queueDeclare("myqueue", false, false, false, args);
```

![Web 控制台配置死信策略](/中间件/rabbitmq/14/p10-01.png)

### 3.3 x-dead-letter-routing-key

死信转移时默认 **保留原 routing key**；若配置了 `x-dead-letter-routing-key`，则 **替换** 为该值。

死信转移 **不经过发送端 Confirm**，无法保证与 Producer 侧同等安全级别。

---

## 四、如何识别死信

消息进入死信队列后，Header 会增加诊断信息，包括：

- 时间、原因（`rejected` / `expired` / `maxlen`）、来源队列

首次成为死信时会写入三个 **不可变** 属性（后续传递不再更改）：

| Header | 含义 |
|--------|------|
| `x-first-death-reason` | 首次死信原因 |
| `x-first-death-queue` | 首次死信来源队列 |
| `x-first-death-exchange` | 首次死信来源交换机 |

业务侧可根据这些 Header 做审计、告警或差异化补偿。

---

## 五、TTL + DLX 实现延迟队列

RabbitMQ **没有** 原生延迟队列。常用模式：

```
Producer → 延迟 Queue（设 TTL + DLX，无 Consumer）
         → TTL 到期 → DLX → 实际消费 Queue → Consumer
```

**示例架构**：

1. 声明 `delay.exchange`（direct）与 `process.exchange`（direct）
2. `delay.queue`：绑定 `delay.exchange`，设置 `x-message-ttl=1800000`（30 分钟）、`x-dead-letter-exchange=process.exchange`
3. Producer 发到 `delay.exchange`，消息在 `delay.queue` 等待
4. 过期后进入 `process.exchange` → `process.queue` → Consumer 执行关单

![TTL + 死信实现延迟队列流程](/中间件/rabbitmq/14/p12-01.png)

死信 Queue 仍具 FIFO 特性，消费逻辑通常是对失效消息做 **业务补偿**（关单、释放库存、发送提醒）。

![延迟队列与普通死信队列对比](/中间件/rabbitmq/14/p12-02.png)

### 5.1 插件方案（了解）

社区插件 **`rabbitmq_delayed_message_exchange`** 可在 Exchange 层实现延迟，需单独下载安装，未随官方发行版捆绑。生产环境若对延迟精度、运维复杂度有更高要求，可评估该插件或改用 RocketMQ 等原生支持延迟的产品。

---

## 六、与 Quorum 毒消息的配合

Quorum 队列通过 `x-delivery-count` 与 **Delivery limit** 自动删除反复投递失败的毒消息。若同时配置 DLX，超阈消息可 **进入死信队列** 人工排查，而不是无限重投。

---

## 小结

| 要点 | 内容 |
|------|------|
| 死信触发 | 拒绝且不 requeue、TTL 过期、队列满 |
| 配置 | `x-dead-letter-exchange` + 可选 routing key |
| 延迟队列 | TTL 暂存 + DLX 转发（无原生 delay queue） |
| 限制 | Stream 不支持 DLX |

下一篇：Sharding 插件——单队列吞吐不够时如何分片存储。
