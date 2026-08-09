---
title: "RocketMQ事务消息是如何实现的"
sidebarGroup: "Rocketmq"
shortTitle: "RocketMQ事务消息是如何实现的"
order: 642
date: 2026-07-08
category: "面试题"
tag:
  - "面试题"
description: "第一层：核心痛点——“鱼和熊掌如何兼得？”在微服务架构中，我们经常遇到这样的场景：“转账”。A 账户扣钱（DB 操作）。给 B 账户发通知加钱（MQ 消息）。死局：先扣钱，再发 MQ？ -&gt; 万一 MQ 发送失败，钱扣了，对方没收到，"
article: false
---

> 来源：[RocketMQ事务消息是如何实现的](https://www.yuque.com/tulingzhouyu/db22bv/lplcgplbp8gkekgl)

### 第一层：核心痛点——“鱼和熊掌如何兼得？”

在微服务架构中，我们经常遇到这样的场景：**“转账”**。

- A 账户扣钱（DB 操作）。
- 给 B 账户发通知加钱（MQ 消息）。

**死局**：

- 先扣钱，再发 MQ？ -> 万一 MQ 发送失败，钱扣了，对方没收到，资金不平。
- 先发 MQ，再扣钱？ -> 万一 MQ 发出去了，本地扣钱报错回滚了，对方收到钱了，公司亏空。

RocketMQ 的事务消息，本质上是把 **MQ 消息变成了“两阶段提交”的协调者**，保证**本地事务**和**消息发送**最终要么都成功，要么都失败。

---

### 第二层：全链路可视化（图解）

为了让你彻底看清内部的流转，我为你生成了一张包含 **Topic 内部视角** 的架构图。

注意看图中的 **"Real Topic"** 和 **"Half Topic"** 的区别，这是理解的钥匙。

![image](/面试题/Rocketmq/0642-how-rocketmq-transactional-messages-are-implemented/img-41cb68855d17.png)

这张图展示了消息在 Broker 内部的“隐身”与“现身”过程。

---

### 第三层：Java 代码实战（状态机视角）

在 Java 代码层面，RocketMQ 的事务消息其实是一个**状态机**。你需要重点关注 `LocalTransactionState` 的三个状态：

1. `COMMIT_MESSAGE`：提交。
2. `ROLLBACK_MESSAGE`：回滚。
3. `UNKNOW`：未知（等待回查）。

#### 核心代码实现

我们来看一段生产环境级别的代码结构：

import org.apache.rocketmq.client.producer.LocalTransactionState;
import org.apache.rocketmq.client.producer.TransactionListener;
import org.apache.rocketmq.client.producer.TransactionMQProducer;
import org.apache.rocketmq.common.message.Message;
import org.apache.rocketmq.common.message.MessageExt;

import java.util.concurrent.ConcurrentHashMap;

public class TransactionService {

```plain
private TransactionMQProducer producer;
// 模拟本地事务存储（实际业务中通常是数据库）
private ConcurrentHashMap<String, Integer> localTransStore = new ConcurrentHashMap<>();

public void start() throws Exception {
    producer = new TransactionMQProducer("tx_group");
    producer.setNamesrvAddr("localhost:9876");
    
    // 关键：注册事务监听器
    producer.setTransactionListener(new TransactionListenerImpl());
    producer.start();
}

public void sendOrder(String orderId) throws Exception {
    Message msg = new Message("OrderTopic", "TagA", orderId, ("Order: " + orderId).getBytes());
    
    // 1. 发送 Half 消息 (此时 Consumer 绝对收不到)
    // 第三个参数 arg 可以传递给 executeLocalTransaction 方法
    producer.sendMessageInTransaction(msg, orderId);
    System.out.println("Half 消息发送成功，开始执行本地逻辑...");
}

/**
 * 内部类：事务核心逻辑
 */
class TransactionListenerImpl implements TransactionListener {

    // 【阶段一】：执行本地事务
    // 当 Half 消息发送成功后，RocketMQ 自动回调此方法
    @Override
    public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        String orderId = (String) arg;
        System.out.println("执行本地事务 for Order: " + orderId);

        try {
            // --- 核心业务开始 ---
            // 1. 开启数据库事务
            // 2. insert order...
            // 3. 提交数据库事务
            boolean success = saveOrderToDB(orderId);
            // --- 核心业务结束 ---

            if (success) {
                // 本地成功 -> 告诉 Broker 可以投递消息了
                localTransStore.put(orderId, 1); // 标记成功
                return LocalTransactionState.COMMIT_MESSAGE;
            } else {
                // 本地失败 -> 告诉 Broker 删除消息
                return LocalTransactionState.ROLLBACK_MESSAGE;
            }
        } catch (Exception e) {
            System.err.println("本地事务异常");
            // 异常情况下，建议返回 UNKNOW，利用回查机制兜底
            return LocalTransactionState.UNKNOW;
        }
    }

    // 【阶段二】：回查 (补偿机制)
    // 场景：executeLocalTransaction 返回 UNKNOW，或者网络断了 Broker 没收到结果
    @Override
    public LocalTransactionState checkLocalTransaction(MessageExt msg) {
        String orderId = msg.getKeys();
        System.out.println("触发回查 checkLocalTransaction for Order: " + orderId);

        // 去数据库查一下，这个订单到底存在不？
        Integer status = localTransStore.get(orderId);
        
        if (status != null && status == 1) {
            // 查到了，说明之前本地事务成功了，补交 Commit
            return LocalTransactionState.COMMIT_MESSAGE;
        } else {
            // 没查到，说明之前本地事务回滚了或没做，补交 Rollback
            return LocalTransactionState.ROLLBACK_MESSAGE;
        }
    }
}

private boolean saveOrderToDB(String orderId) {
    // 模拟 DB 操作
    return true;
}
```

}

---

### 第四层：底层源码揭秘（消息去哪了？）

这一层是专家与普通开发者的分水岭。
你会发现，发完 Half 消息后，Consumer 明明订阅了 `OrderTopic`，为什么死活收不到？

**RocketMQ 在 Broker 端做了“偷梁换柱”：**

1. **篡改 Topic**：

- Broker 接收到事务消息（Half 消息）时，并不会直接写入 `OrderTopic`。
- 它会将 Topic 修改为系统内置的 `RMQ_SYS_TRANS_HALF_TOPIC`。
- 它会将 `QueueId` 修改为 `0`。
- 它会把 **原始的 Topic 和 QueueId** 存放在消息的 `Properties` 属性中（key 为 `REAL_TOPIC` 和 `REAL_QUEUE_ID`）。

1. **落盘**：

- 修改后的消息被写入 CommitLog。因为 Topic 变了，Consumer 根本订阅不到这个系统 Topic，所以对消费者“隐身”。

1. **提交（Commit）**：

- 当 Broker 收到 `COMMIT` 请求。
- 它从 `RMQ_SYS_TRANS_HALF_TOPIC` 中读取出那条半消息。
- 从 `Properties` 中**恢复**出原始的 `OrderTopic`。
- 重新构建一条新消息，写入 CommitLog。
- **此时，消费者终于能看到这条消息了！**

1. **删除（Op 标记）**：

- 无论是 Commit 还是 Rollback，Broker 都会向另一个系统 Topic —— `RMQ_SYS_TRANS_OP_HALF_TOPIC` 写入一条标记消息。
- 这个标记消息的内容，就是之前半消息在 Half Topic 里的物理偏移量（Offset）。
- **作用**：告诉后台线程，“这条半消息已经处理过了，不要再回查它了”。

---

### 第五层：回查线程的“守夜人”机制

Broker 有一个后台线程 `TransactionalMessageCheckService`，每隔一段时间（默认 1 分钟）运行一次：

1. 它遍历 `RMQ_SYS_TRANS_HALF_TOPIC` 里的消息。
2. 它对比 `RMQ_SYS_TRANS_OP_HALF_TOPIC` 里的标记。
3. **如果发现一条消息在 Half Topic 里，但在 OP Topic 里没有标记**，说明它处于“悬而未决”状态。
4. 如果这条消息的时间超过了 `transactionTimeOut`（默认 6 秒），Broker 就会主动向 Producer 发起 **RPC 回查请求**。

### 总结

RocketMQ 事务消息的实现，其实是一场精密的**“欺骗游戏”**：

- **对消费者欺骗**：先把消息藏在 `HALF_TOPIC` 里，不让你看见。
- **对存储层欺骗**：虽然是同一条消息内容，但其实在 CommitLog 里写了两遍（一次是 Half，一次是 Real）。

通过这种机制，RocketMQ 完美解决了分布式事务中的**原子性**问题，且没有引入类似 XA 事务那样繁重的锁机制，性能非常高。
