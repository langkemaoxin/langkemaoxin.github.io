---
title: "RocketMQ如何保证消息不丢失"
sidebarGroup: "Rocketmq"
shortTitle: "RocketMQ如何保证消息不丢失"
order: 641
date: 2026-07-08
category: "面试题"
tag:
  - "面试题"
description: "要保证 RocketMQ 消息不丢失，我们必须像“特工押运”一样，确保消息在 发送端（Producer）、存储端（Broker）、消费端（Consumer） 这三个环节都万无一失。任何一个环节掉链子，消息就丢了。我为你总结了一个**“防丢铁"
article: false
---

> 来源：[RocketMQ如何保证消息不丢失](https://www.yuque.com/tulingzhouyu/db22bv/vg1tvfm5z3u9cggv)

要保证 RocketMQ 消息不丢失，我们必须像“特工押运”一样，确保消息在 **发送端（Producer）**、**存储端（Broker）**、**消费端（Consumer）** 这三个环节都万无一失。任何一个环节掉链子，消息就丢了。

我为你总结了一个**“防丢铁三角”**模型，我们逐层拆解。

---

### 第一层：生产端（Producer）—— “不拿到回执绝不松手”

很多消息丢失发生在发送阶段：比如网络抖动，或者 Broker 刚收到请求还没处理就挂了。

**策略：使用同步发送 + 重试机制**

不要用 `sendOneway`（只管发，不问结果），那个快但是不可靠。要用 `send` 同步方法，并检查发送结果。

import org.apache.rocketmq.client.producer.DefaultMQProducer;
import org.apache.rocketmq.client.producer.SendResult;
import org.apache.rocketmq.client.producer.SendStatus;
import org.apache.rocketmq.common.message.Message;
import org.apache.rocketmq.client.consumer.DefaultMQPushConsumer;
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyStatus;
import org.apache.rocketmq.client.consumer.listener.MessageListenerConcurrently;

public class ZeroLossDemo {

```plain
/**
 * 1. 生产端：同步发送 + 检查回执
 */
public void producer() throws Exception {
    DefaultMQProducer producer = new DefaultMQProducer("reliable_group");
    producer.setNamesrvAddr("127.0.0.1:9876");
    // 关键点：设置重试次数 (默认2次)
    producer.setRetryTimesWhenSendFailed(3); 
    producer.start();

    Message msg = new Message("TopicTest", "TagA", "Hello".getBytes());

    try {
        // 同步发送，等待 Broker 响应
        SendResult sendResult = producer.send(msg);

        // 关键点：必须判断发送状态
        if (sendResult.getSendStatus() != SendStatus.SEND_OK) {
            // 如果不是 OK，比如是 FLUSH_DISK_TIMEOUT，需要记录日志或人工介入
            System.err.println("发送由于 Broker 问题可能丢失，状态: " + sendResult.getSendStatus());
            // todo: 存入本地数据库，后续定时任务重试
        }
    } catch (Exception e) {
        // 捕获异常（网络断了等），进行本地补偿
        System.err.println("发送异常，执行本地降级策略");
        // todo: 存入本地数据库
    }
}

/**
 * 3. 消费端：先干活，后签字 (ACK)
 */
public void consumer() throws Exception {
    DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("reliable_consumer");
    consumer.setNamesrvAddr("127.0.0.1:9876");
    consumer.subscribe("TopicTest", "*");

    consumer.registerMessageListener((MessageListenerConcurrently) (msgs, context) -> {
        try {
            for (Message msg : msgs) {
                // 1. 执行核心业务逻辑 (比如扣减库存)
                doBusinessLogic(msg);
            }
            // 2. 只有业务不报错，才返回 SUCCESS (相当于告诉 Broker：消息我吃掉了)
            return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
        } catch (Exception e) {
            // 3. 如果业务报错，返回 RECONSUME (告诉 Broker：我处理失败了，一会再发给我)
            // RocketMQ 会自动进行指数退避重试 (1s, 5s, 10s...)
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    });
    consumer.start();
}

private void doBusinessLogic(Message msg) {
    // 模拟业务
}
```

}

---

### 第二层：Broker 端（存储端）—— “落袋为安，双重保险”

这是最关键的环节。如果 Broker 收到消息，还没来得及写硬盘，或者硬盘坏了，怎么办？

RocketMQ 提供了两个核心配置，**用性能换安全**。

#### 1. 刷盘机制：SYNC_FLUSH (同步刷盘)

- **默认 (ASYNC_FLUSH)**：Broker 收到消息放在内存（PageCache）就返回成功。如果此时断电，内存数据丢失。
- **零丢失配置 (SYNC_FLUSH)**：Broker 必须把数据**真正写入物理磁盘**后，才给 Producer 返回成功。

- 配置：`flushDiskType = SYNC_FLUSH`

#### 2. 主从复制：SYNC_MASTER (同步复制)

就算你同步刷盘了，如果这台机器硬盘物理损坏了呢？数据还是丢。
所以我们需要 Master-Slave 架构。

- **默认 (ASYNC_MASTER)**：Master 收到消息就返回成功，然后异步传给 Slave。如果 Master 挂了，Slave 可能还没同步到最新消息。
- **零丢失配置 (SYNC_MASTER)**：Master 收到消息后，必须**等 Slave 也写成功了**，才给 Producer 返回成功。

- 配置：`brokerRole = SYNC_MASTER`

**专家建议**：为了达到由内而外的“铁桶阵”，真正的金融级配置必须是 **SYNC_FLUSH + SYNC_MASTER**。

---

### 第三层：消费端（Consumer）—— “吃完再擦嘴”

Broker 把消息给到了 Consumer，如果 Consumer 代码写得有问题，或者刚拿到消息还没处理机器就重启了，怎么保证不丢？

**策略：手动 ACK (At-Least-Once)**

请看上面代码中的 `consumer` 部分。

- **错误做法**：拿到消息先 `return success`，然后再异步处理业务。这样一旦业务报错，Broker 以为你处理完了，消息就丢了。
- **正确做法**：**同步处理业务**。只有业务逻辑（如写库）完全成功，才返回 `CONSUME_SUCCESS`。如果抛出异常，返回 `RECONSUME_LATER`，Broker 会稍后重试。

---

### 图解：全链路防丢失流程

为了让你一眼看清这三个关卡，我为你生成一张架构图。这张图展示了同步刷盘和同步复制是如何像两道闸门一样拦截数据丢失的。

![image](/面试题/Rocketmq/0641-how-rocketmq-ensures-messages-are-not-lost/img-267bf603fe79.png)

这张图清晰地展示了“最严格”的路径：

1. **发送**：Producer 等待响应。
2. **存储**：注意中间那个绿色的回执箭头，它必须等待 **Master 刷盘完成** 且 **Slave 复制完成** 这两个动作都结束后，才会发给 Producer。这就是 `SYNC_FLUSH + SYNC_MASTER` 的威力。
3. **消费**：Consumer 执行完业务逻辑，才返回状态。

### 总结

RocketMQ 保证消息不丢失的**终极公式**：

![](/面试题/Rocketmq/0641-how-rocketmq-ensures-messages-are-not-lost/img-a2279e67076e.svg)
