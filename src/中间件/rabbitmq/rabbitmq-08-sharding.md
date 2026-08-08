---
title: "消息分片存储插件 Sharding"
sidebarGroup: "RabbitMQ"
shortTitle: "08 Sharding 分片"
order: 8
date: 2026-09-02
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 8/10 篇**  
> 上一篇：[《死信队列与延迟队列》](/中间件/rabbitmq/rabbitmq-07-dlx-delay)  
> 下一篇预告：[《RabbitMQ 监控、备份与联邦同步》](/中间件/rabbitmq/rabbitmq-09-monitor-backup-federation)

---

## 开头：Consumer 加不动了，队列还能怎么提速

增加 Consumer 数量、提升单条处理速度是最直接的办法，但往往意味着更多机器与人力。RabbitMQ 的 **Sharding 插件** 提供另一条路：把单个逻辑队列的消息 **分散到集群多个节点的物理队列**，通过 **伪队列（pseudo queue）** 统一消费，在 Consumer 处理能力有限时尽量推进消费进度。

思路类似数据库分库分表——分库减 IO 压力，分表解决单表过大；RabbitMQ Sharding 针对 **单队列吞吐** 做水平拆分。

---

## 一、插件作用

- 将一条逻辑 Exchange 上的消息 **轮询分散** 到多个分片 Queue（分布在不同节点）
- 提供 **负载均衡** 读写
- Consumer 通过 **与 Exchange 同名的伪队列** 消费，无需逐个绑定分片 Queue

![Sharding 插件整体架构](/中间件/rabbitmq/14/p12-01.png)

适用：**对延迟要求不严格、对顺序无要求** 的场景。分片过程 **不考虑消息顺序**，会进一步削弱 RabbitMQ 本就不强的顺序保证。

---

## 二、使用步骤

### 2.1 启用插件

3.13 运行包已内置，直接启用：

```bash
rabbitmq-plugins enable rabbitmq_sharding
```

### 2.2 配置 Sharding 策略

在管理控制台 **Admin → Policies** 添加策略，匹配 `sharding_` 前缀的 Exchange 与 Queue。

![配置 Sharding 策略匹配规则](/中间件/rabbitmq/14/p12-02.png)

![Sharding 策略 Definition 示例](/中间件/rabbitmq/14/p13-01.png)

### 2.3 创建 x-modulus-hash Exchange

安装插件后，Exchange 类型多出一种 **`x-modulus-hash`**。

![创建 x-modulus-hash 类型 Exchange](/中间件/rabbitmq/14/p14-01.png)

### 2.4 发送消息

```java
public class ShardingProducer {
    private static final String EXCHANGE_NAME = "sharding_exchange";

    public static void main(String[] args) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("192.168.65.112");
        factory.setPort(5672);
        factory.setUsername("admin");
        factory.setPassword("admin");
        factory.setVirtualHost("/mirror");

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        channel.exchangeDeclare(EXCHANGE_NAME, "x-modulus-hash");

        for (int i = 0; i < 3000; i++) {
            String message = "Sharding message " + i;
            channel.basicPublish(EXCHANGE_NAME, String.valueOf(i), null, message.getBytes());
        }

        channel.close();
        connection.close();
    }
}
```

`x-modulus-hash` **忽略 routingKey 语义**，以轮询方式平均分配到绑定的所有分片 Queue。

![分片 Exchange 绑定多个碎片队列](/中间件/rabbitmq/14/p14-02.png)

3000 条消息会大致均分到三个分片 Queue（具体命名格式：`sharding:{exchangename}-{node}-{shardingindex}`）。

---

## 三、消费分片消息

分片 Queue 名字有规律，但 **不应** 逐个 Queue 声明 Consumer——那样拿到的是零散分片，不符合「逻辑上一整队列」的语义。

Sharding 提供 **伪队列**：声明与 Exchange **同名** 的 Queue 名，像普通队列一样 `basicConsume`。

> 名为 `sharding_exchange` 的 Queue **实际不存在**，插件在内部把消费请求路由到连接数最少的分片。

```java
public class ShardingConsumer {
    public static final String QUEUENAME = "sharding_exchange";

    public static void main(String[] args) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("192.168.65.112");
        factory.setPort(5672);
        factory.setUsername("admin");
        factory.setPassword("admin");
        factory.setVirtualHost("/mirror");

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        channel.queueDeclare(QUEUENAME, false, false, false, null);

        Consumer myconsumer = new DefaultConsumer(channel) {
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope,
                                       AMQP.BasicProperties properties, byte[] body)
                    throws IOException {
                System.out.println("routingKey > " + envelope.getRoutingKey());
                System.out.println("content: " + new String(body, "UTF-8"));
                channel.basicAck(envelope.getDeliveryTag(), false);
            }
        };

        // 分片数为 N 时，通常需要 N 次 basicConsume 伪队列
        String flag1 = channel.basicConsume(QUEUENAME, true, myconsumer);
        String flag2 = channel.basicConsume(QUEUENAME, true, myconsumer);
        String flag3 = channel.basicConsume(QUEUENAME, true, myconsumer);
        System.out.println("c1:" + flag1 + " c2:" + flag2 + " c3:" + flag3);
    }
}
```

插件原理：`basicConsume(伪队列名)` 会绑定到 **当前连接数最少** 的分片 Queue。

---

## 四、注意事项

| 注意点 | 说明 |
|--------|------|
| **顺序** | 分片不考虑顺序，不适合强顺序业务 |
| **均匀性** | 轮询尽量均匀，但不保证绝对均匀 |
| **伪队列与分片 Queue 勿混用** | 分片 Queue 若已有大量其他消息，再消费伪队列会受不均匀数据影响 |
| **Producer 视角** | 只发虚拟 Exchange，无法预知具体分片 |
| **Ack** | 未 Ack 的消息会持续重投，须正常 `basicAck` |

---

## 小结

Sharding 在 **Consumer 扩容困难** 时用空间换吞吐：多节点分散存储 + 伪队列统一消费。代价是顺序与精确路由。与 Stream（大日志、多订阅）和 Quorum（高可靠）解决的是不同维度的问题。

下一篇：监控 API、备份恢复与 Federation 跨机房同步。
