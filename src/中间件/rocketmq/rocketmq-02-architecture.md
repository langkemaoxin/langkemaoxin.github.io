---
title: "RocketMQ 运行架构与消息模型"
sidebarGroup: "RocketMQ"
shortTitle: "02 架构与消息模型"
order: 2
date: 2026-09-17
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 2/10 篇**  
> 上一篇：[《RocketMQ 快速实战》](/中间件/rocketmq/rocketmq-01-quickstart) · 下一篇：[《RocketMQ 客户端模型》](/中间件/rocketmq/rocketmq-03-client-model)

---

## 开头：SendResult 里那一串字段到底是什么？

上一篇用 `Producer` 往 `TopicTest` 发了 1000 条消息，控制台刷出类似：

```
SendResult [sendStatus=SEND_OK, msgId=..., messageQueue=MessageQueue [topic=TopicTest, brokerName=broker-a, queueId=2], queueOffset=124]
```

`topic`、`brokerName`、`queueId`、`queueOffset` 分别对应存储层的哪一块？消费者又从哪读、进度记在哪？要回答这些问题，需要先把 **运行架构** 和 **消息模型** 对齐。

---

## 一、运行架构：三块角色

![RocketMQ 整体运行架构](/中间件/rocketmq/40/p19-01.png)

### 1. NameServer —— 路由协调

- 独立启动，不依赖其他组件  
- Broker 与 Client 都必须配置 NameServer 地址  
- 类比：**CPU**，协调键盘（Client）与硬盘（Broker）之间的数据流  

NameServer **节点间不同步**，靠 Broker 向所有 NameServer 注册；任意一个 NameServer 存活，集群路由即可用（以牺牲强一致换取轻量）。

### 2. Broker —— 存储与转发核心

- 消息持久化、投递、查询都在 Broker  
- 配置项最多、保护机制最全（主从、刷盘、DLedger 等）  
- 类比：**硬盘、显卡** 等核心硬件  

### 3. Client —— 生产者与消费者

- 不能直接写 Broker，需经 NameServer 拿路由  
- 类比：**键盘、显示器**  

`mqadmin` 与 Dashboard 是运维入口；DLedger 集群通过 Raft 选主，Dashboard 可观察 Leader 切换。

![DLedger 集群结构](/中间件/rocketmq/40/p20-01.png)

![mqadmin 与 Dashboard 集群视图](/中间件/rocketmq/40/p23-01.png)

---

## 二、DLedger 与 Raft 补充

DLedger 来自 OpenMessaging，做两件事：**集群内选 Master**、**保证 CommitLog 强一致**。

Raft 核心：

- **多数派** 才能形成决议，天然抑制脑裂  
- **Term（任期）** 保证旧 Leader 不会「复活」  
- Kafka 后来的 KRaft 也走类似路线  

5.0 的 **Dledger Controller** 可只用 Raft 选举、仍用 RocketMQ 原生 CommitLog 写盘，兼顾高可用与性能。

![Raft 防脑裂机制说明](/中间件/rocketmq/40/p25-01.png)

---

## 三、消息模型：从实验到抽象

### 1. 发送侧

```bash
tools.sh org.apache.rocketmq.example.quickstart.Producer
```

Broker 返回 `SendResult`，表示消息已持久化；其中 `messageQueue` 指出落在哪个队列，`queueOffset` 是该队列内的逻辑偏移。

### 2. Dashboard 上的 Topic

打开 Dashboard **主题** 页，可见 `TopicTest` 下通常有 **8 个 MessageQueue**，分布在多个 Broker 上。每个队列有 **minOffset / maxOffset**（下一条消息会分配在 maxOffset 之后）。

![TopicTest 主题与 MessageQueue 分布](/中间件/rocketmq/40/p27-01.png)

![MessageQueue 位点与消息条数](/中间件/rocketmq/40/p27-02.png)

![八个队列均匀分布在 Broker 上](/中间件/rocketmq/40/p27-03.png)

1000 条消息会被 **轮询写入** 这些队列——这就是生产端默认负载均衡的效果。

### 3. 消费侧

```bash
tools.sh org.apache.rocketmq.example.quickstart.Consumer
```

日志里同样有 `brokerName`、`queueId`、`queueOffset`。Dashboard **CONSUMER 管理** 可看到消费者组 `please_rename_unique_group_name_4` 在每个队列上的 **代理者位点**（队列最大 offset）与 **消费者位点**（该组已消费到的 offset），差值即堆积量。

![消费者组在各队列上的消费进度](/中间件/rocketmq/40/p28-01.png)

### 4. 模型抽象

![RocketMQ 消息模型](/中间件/rocketmq/40/p29-01.png)

| 概念 | 含义 |
|------|------|
| **Topic** | 逻辑分类；客户端表示业务类型，Broker 表示存储资源 |
| **MessageQueue** | Topic 下的 FIFO 子队列，可分布在多个 Broker |
| **Message** | 实际数据，落在某个 MessageQueue |
| **Consumer Group** | 消费进度以 **组** 为单位；组内集群模式下一条消息只被消费一次 |
| **Offset** | Broker 为每个 Consumer Group 在每个 Queue 上记录的进度 |

**Topic 管理**：生产环境应由运维预先创建 Topic；`autoCreateTopicEnable=true` 仅适合测试。

与 Kafka 模型相似（RocketMQ 早期借鉴 Kafka），但 RocketMQ 对 **多 Topic** 的性能优化、Leader 切换时的消息安全策略等已有大量独立演进——后续源码篇会展开 CommitLog 与 DLedger 的差异。

---

## 四、与 Kafka / RabbitMQ 的对照思考

- Kafka：Topic 过多 → Partition 文件多 → 索引 IO 压力大  
- RocketMQ：统一 CommitLog 顺序写，Topic 几乎不影响整体吞吐  
- RabbitMQ：功能丰富、可靠性高，但 Erlang 栈定制与吞吐是短板  

建议带着「**为什么 RocketMQ 敢强调金融场景**」这个问题，对照 RabbitMQ、Kafka 系列一起读。

---

## 五、本章小结

- **NameServer**：轻量路由，Broker 全量注册  
- **Broker**：存储 + 投递，集群形态决定高可用级别  
- **Client**：只连 NameServer，由路由找 Broker  
- **Topic / MessageQueue / Offset**：理解 SendResult 与 Dashboard 的关键  

下一篇进入 **客户端编程模型**：同步/异步发送、消费确认、顺序/延迟/事务消息与 SpringBoot 集成。
