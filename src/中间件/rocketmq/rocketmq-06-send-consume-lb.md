---
title: "发送、拉取与负载均衡——源码主线"
sidebarGroup: "RocketMQ"
shortTitle: "06 收发与负载均衡源码"
order: 6
date: 2026-09-21
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 6/10 篇**  
> 上一篇：[《源码环境与启动》](/中间件/rocketmq/rocketmq-05-source-setup) · 下一篇：[《持久化与刷盘》](/中间件/rocketmq/rocketmq-07-persistence)

---

## 开头：消息到底发到哪个 Queue？谁消费哪个 Queue？

顺序消息要求同一订单进同一 MessageQueue；集群消费要求 **一个 Queue 在同一 Consumer Group 内只被一个实例消费**。这些规则在客户端 `TopicPublishInfo`、`RebalanceImpl`、`AllocateMessageQueueStrategy` 里落地。本篇从源码串起 **发送 → 路由缓存 → 拉取 → 负载均衡**。

---

## 一、Producer 发送流程

入口：`DefaultMQProducerImpl#start` → `MQClientFactory` 统一启动各 Client。

### 1. 路由缓存 topicPublishInfoTable

发送前 `tryToFindTopicPublishInfo(topic)` 更新本地路由。**NameServer 挂掉后**，若缓存仍在，Producer **仍可发到 Broker**（实验：start 后停 NameServer 再 send）。

### 2. 默认轮询选 Queue

`TopicPublishInfo.selectOneMessageQueue`：对 MessageQueue 列表递增取模轮询；若某 Broker 上次发送失败，下次通过 `QueueFilter` **尽量跳过该 Broker**。

可 `setSendLatencyFaultEnable(true)` 在弱网环境提高成功率。

### 3. MessageQueueSelector

顺序消息走 `sendSelectImpl` → `selector.select(mqs, msg, arg)`，** bypass 默认轮询**。

![Producer 发送核心流程](/中间件/rocketmq/42/p10-01.png)

![顺序消息 select 实现](/中间件/rocketmq/42/p11-01.png)

![TopicPublishInfo 与 Queue 选择](/中间件/rocketmq/42/p12-01.png)

---

## 二、Consumer 拉取流程（推 = 拉 + 回调）

`DefaultMQPushConsumerImpl#start` 同样经 `MQClientFactory`。

### 1. 广播 vs 集群 Offset

```java
switch (messageModel) {
    case BROADCASTING:
        offsetStore = new LocalFileOffsetStore(...);
        break;
    case CLUSTERING:
        offsetStore = new RemoteBrokerOffsetStore(...);
        break;
}
offsetStore.load();
```

### 2. Rebalance 与 AllocateMessageQueueStrategy

`rebalanceImpl.setAllocateMessageQueueStrategy(...)` 决定 **Consumer 实例 ↔ MessageQueue** 绑定。  
原因：Broker 按 **Consumer Group + Queue** 维护 Offset，若同组多实例抢同一 Queue，进度会乱。

内置策略（`AllocateMessageQueueStrategy` 实现类）：

| 策略 | 行为 |
|------|------|
| `AllocateMessageQueueAveragely` | 平均分配（**默认**） |
| `AllocateMessageQueueAveragelyByCircle` | 轮询逐个分 |
| `AllocateMessageQueueConsistentHash` | 一致性哈希 |
| `AllocateMessageQueueByMachineRoom` / `Nearby` | 机房亲和 |
| `AllocateMessageQueueByConfig` | 指定列表（类似广播全量） |

实例数或 Queue 数变化会触发 **Rebalance**。

![Consumer 启动与 Rebalance](/中间件/rocketmq/42/p14-01.png)

![平均分配示意](/中间件/rocketmq/42/p15-01.png)

### 3. 并发 vs 顺序消费

注册 `MessageListenerConcurrently` → `ConsumeMessageConcurrentlyService`：按批提交线程池，**多线程并发**处理同一 Queue 的不同批。

注册 `MessageListenerOrderly` → `ConsumeMessageOrderlyService`：对 **MessageQueue 加锁**（`messageQueueLock`），同一队列串行处理，保证顺序。

![顺序消费队列锁](/中间件/rocketmq/42/p17-01.png)

![并发消费线程池](/中间件/rocketmq/42/p18-01.png)

### 4. PullMessageService：推模式的真相

`PullMessageService.run()` 从队列取 `PullRequest`，调用 `DefaultMQPushConsumerImpl.pullMessage`。

拉成功后 `pullCallback.onSuccess` → `consumeMessageService.submitConsumeRequest(...)`，并在回调里 **发起下一次 pull**——所以是 **长链路的 pull，表现像 push**。

顺序消费依赖这条 pull 回调链；**同步 pull 模式** 不走同一套 callback，顺序能力受限。

![PullMessageService 调用链](/中间件/rocketmq/42/p19-01.png)

![pullCallback 与再次 pull](/中间件/rocketmq/42/p19-02.png)

![推模式本质仍是 pull](/中间件/rocketmq/42/p20-01.png)

---

## 三、负载均衡总结

### Producer

- 默认轮询 Topic 下所有 MessageQueue → 消息分散到多 Broker  
- 失败 Broker 暂避；可选延迟容错  
- `MessageQueueSelector` 实现局部有序  

### Consumer（集群）

- 以 MessageQueue 为单位分配；每 Queue 仅组内一实例消费  
- Rebalance 在成员/Queue 变化时重新分配  
- 广播：每实例持有全部 Queue，Offset 本地维护  

![Producer 与 Consumer 负载均衡模型](/中间件/rocketmq/42/p22-01.png)

---

## 四、本章小结

读 Client 源码抓住三点：**MQClientFactory 统一生命周期**、**topicPublishInfoTable / Rebalance 分配 Queue**、**PullMessageService + Listener 封装推模式**。下一篇进入 Broker **CommitLog 持久化、刷盘与主从复制**。
