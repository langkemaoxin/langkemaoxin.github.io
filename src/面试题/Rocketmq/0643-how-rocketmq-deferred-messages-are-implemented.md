---
title: "RocketMQ延迟消息是如何实现的"
sidebarGroup: "Rocketmq"
shortTitle: "RocketMQ延迟消息是如何实现的"
order: 643
date: 2026-05-27
category: "面试题"
tag:
  - "面试题"
description: "想象一下这个场景：用户下了订单，如果 30 分钟内没付款，系统需要自动关闭订单。如果用 Timer 或 ScheduledExecutorService，服务器重启数据就没了；如果用数据库轮询，数据量大时数据库会挂。RocketMQ 的延迟"
article: false
---

> 来源：[RocketMQ延迟消息是如何实现的](https://www.yuque.com/tulingzhouyu/db22bv/ottm7mn0vgxy7qua)

想象一下这个场景：**用户下了订单，如果 30 分钟内没付款，系统需要自动关闭订单。**
如果用 `Timer` 或 `ScheduledExecutorService`，服务器重启数据就没了；如果用数据库轮询，数据量大时数据库会挂。

RocketMQ 的延迟消息就是为了解决这类问题。它允许你发送一条消息，但指定**“现在别发，过段时间再发给消费者”**。

今天我们同样用**由浅入深**的方式，通过代码、原理、图解，彻底搞懂它。

---

### 第一层：怎么用？（代码实战）

RocketMQ 的延迟消息**不支持任意时间**（RocketMQ 5.0 之前），而是采用了**“预设等级”**的机制。

默认支持 **18 个等级**：
`1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h`

**代码实现：**

```plain
import org.apache.rocketmq.client.producer.DefaultMQProducer;
import org.apache.rocketmq.common.message.Message;
public class DelayProducer {
    public static void main(String[] args) throws Exception {
      DefaultMQProducer producer = new DefaultMQProducer("delay_group");
      producer.setNamesrvAddr("127.0.0.1:9876");
      producer.start();
      Message msg = new Message("TopicOrder", "TagA", "订单号123".getBytes());

    // 【关键点】设置延迟等级
    // level=1 -> 1s
    // level=2 -> 5s
    // level=3 -> 10s
    // ...
    // level=16 -> 30m (对应 30分钟未支付关闭订单)
    msg.setDelayTimeLevel(3); 

    // 发送消息
    producer.send(msg);
    
    System.out.println("消息已发送，但在 10秒 后消费者才能收到");
    producer.shutdown();
  }
}
```

---

### 第二层：核心原理——“偷梁换柱”

你可能会好奇：**Broker 收到消息后，怎么做到“暂存”起来，等时间到了再给消费者的？**

其实，RocketMQ 再次使用了**Topic 替换**（偷梁换柱）的大法，这点和事务消息非常像。

#### 1. 偷梁换柱（Ingress）

当 Broker 收到一条消息，如果发现 `msg.getDelayTimeLevel() > 0`：

- **备份原信息**：把原来的 Topic (`TopicOrder`) 和 QueueId 存到消息属性（Properties）里。
- **篡改 Topic**：把 Topic 改成系统内置的 `SCHEDULE_TOPIC_XXXX`。
- **篡改 QueueId**：根据延迟等级计算 QueueId。

- 公式：`queueId = delayLevel - 1`。
- 也就是说，**所有 1s 延迟的消息都在 Queue-0，所有 5s 的都在 Queue-1**，以此类推。这样做的好处是，同一个队列里的消息，延迟时间是相同的，保证了先进先出（FIFO），处理起来极其高效。

- **落盘**：写入 CommitLog。此时消费者订阅的是 `TopicOrder`，所以根本看不见这条消息。

#### 2. 倒计时（Polling）

Broker 内部有一个核心服务类 `ScheduleMessageService`。

- 它会启动 **18 个定时任务**（对应 18 个延迟等级）。
- 每个定时任务只扫描自己对应的那个 Queue。
- **逻辑**：它会读取 `SCHEDULE_TOPIC_XXXX` 队列里的消息，判断：`现在时间 >= 消息存储时间 + 延迟时间` 吗？

- **没到时间**：停止扫描，等一会再来（因为队列是有序的，头部的没到时间，后面的肯定也没到）。
- **到时间了**：执行下一步“还原”。

#### 3. 还原真相（Restoration）

一旦时间到了：

- Broker 把消息取出来。
- 从属性里读取出**原来的 Topic** (`TopicOrder`) 和 **原来的 QueueId**。
- **清除延迟属性**：防止被再次处理。
- **重新写入**：把恢复后的消息再次写入 CommitLog。
- **结果**：现在这条消息变成了普通消息，消费者立马就能拉取到了！

---

### 第三层：图解全流程

为了让你更直观地理解这个“存储-等待-投递”的过程，我为你生成了一张架构图。

这张图清晰地展示了消息如何在 Broker 内部经历“整容”和“恢复”的过程。

![image](/面试题/Rocketmq/0643-how-rocketmq-deferred-messages-are-implemented/img-d1091a5a8b5a.png)

这就是 RocketMQ 延迟消息的完整生命周期。

**看图重点**：

1. **中间的橙色区域**：这是消息“隐身”的阶段。它被存在了 `SCHEDULE_TOPIC_XXXX` 的特定队列里。
2. **Queue 的隔离**：注意看，Level 3 的消息专门放在 Queue 2 里。这种设计非常巧妙，避免了对所有消息进行复杂的排序（比如像 PriorityQueue 那样），极大地提升了写入和扫描的性能。

### 总结与思考

RocketMQ 延迟消息的设计哲学是 **“简单即高效”**。

- **为什么不支持任意时间？**（指 4.x 版本） 如果要支持任意时间（比如 3分17秒），Broker 就需要对所有消息按时间排序。这在大数据量下会消耗巨大的 CPU 和内存。 通过**固定等级**，RocketMQ 把“排序问题”转化为了“队列归类问题”，每个队列内部天然有序，扫描效率极高。
- **如果我非要用任意时间怎么办？**

- **方案 A**：使用 RocketMQ 5.0。5.0 版本引入了 **时间轮 (TimingWheel)** 算法，终于支持任意精度的定时消息了。
- **方案 B**（老版本 Hacker 做法）：自己写个服务，把消息存 MySQL，用 Netty 时间轮或者 Quartz 扫表，到了时间再发给 MQ。
