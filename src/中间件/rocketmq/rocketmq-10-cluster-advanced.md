---
title: "DLedger、主从切换与 BrokerContainer"
sidebarGroup: "RocketMQ"
shortTitle: "10 DLedger 与集群高级"
order: 10
date: 2026-09-25
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 10/10 篇**  
> 上一篇：[《零拷贝与顺序写》](/中间件/rocketmq/rocketmq-09-zerocopy)

---

## 开头：Master 宕机，Slave 为何不能立刻顶上？

主从集群里 Slave 有全量数据，但 **角色固定**，无法自动升 Master——消费会中断到 Master 重启。DLedger 用 **Raft** 选 Leader 并同步日志；5.x 又拆出 **Controller**（只要选举）、**BrokerContainer**（一进程多 Broker）、**Proxy**（多语言）。本篇收束集群架构，便于对照部署文档与源码。

---

## 一、分布式一致性与 Raft

DLedger 集群要在多节点间对 **CommitLog 写入顺序** 达成一致，属于典型的 **分布式数据一致性** 问题：

- 节点宕机、网络抖动、复制延迟、仍要 **尽快响应客户端**  

算法谱系：弱一致（Gossip）；强一致（Paxos、**Raft**、ZAB）。RocketMQ DLedger 基于 **Raft**（OpenMessaging 的 dledger 框架嵌入 store）。

![DLedger 一致性问题背景](/中间件/rocketmq/43/p03-01.png)

### Raft 两阶段

1. **Election**：选 Leader  
2. **Log Replication**：复制 Entry  

Entry 顺序一致 ≠ Entry 不丢；多数派持久化 Entry 后提交到 **State Machine**（RocketMQ 里即 CommitLog 应用）。

角色：**Leader**（唯一写）、**Follower**（同步+投票）、**Candidate**（竞选）。  
**Term** 任期防止脑裂；随机化选举超时（约 150–300ms）避免分裂投票。

![Raft 动画式流程概览](/中间件/rocketmq/43/p04-01.png)

![Leader / Follower / Candidate 职责](/中间件/rocketmq/43/p05-01.png)

![节点状态转换](/中间件/rocketmq/43/p05-02.png)

![Term 与选举](/中间件/rocketmq/43/p06-01.png)

CAP：Raft 偏 **CP**，牺牲部分可用性（需过半在线）。

---

## 二、Raft 数据结构与 RPC（论文 → 源码）

节点状态：`currentTerm`、`votedFor`、`log[]`（command/term/index）、`commitIndex`、`lastApplied`；Leader 另有 `nextIndex[]`、`matchIndex[]`。

核心 RPC：**RequestVote**、**AppendEntries**（心跳/复制合一）。

![Raft 节点数据结构](/中间件/rocketmq/43/p07-01.png)

![Vote / AppendEntries 参数](/中间件/rocketmq/43/p08-01.png)

---

## 三、RocketMQ 中的 DLedger 实现

包：`io.openmessaging.storage.dledger`

| 组件 | 对应 |
|------|------|
| `MemberState` | selfId、role、leaderId、currentTerm、ledgerEndIndex/Term |
| `DLedgerEntryPusher` | dispatcherMap≈nextIndex，pendingMap≈matchIndex |
| `DLedgerEntry` | body 常为 **DLedgerCommitLog**（非主从 CommitLog 格式） |
| `StateMachine` / `StateMachineCaller` | lastApplied、committedIndex、onCommitted |
| `protocol.*Request/Response` | RPC 载体 |

**重要**：DLedger 下 CommitLog 类型不同，**主从集群日志不能直接迁到 DLedger 集群**（路径可复用目录，但格式与两阶段复制不兼容）。

![MemberState 与 EntryPusher](/中间件/rocketmq/43/p09-01.png)

![DLedgerEntry 与 CommitLog](/中间件/rocketmq/43/p10-01.png)

![StateMachine 提交](/中间件/rocketmq/43/p11-01.png)

![protocol RPC 类](/中间件/rocketmq/43/p12-02.png)

DLedger 同时承担 **选举 + 日志强一致写**，IO 比主从重；企业里采用率有限，5.0 **Controller 模式** 可只用 Raft 选举。

---

## 四、Controller 主从切换（5.x）

**Dledger Controller**：Raft 选主 + **RocketMQ 原生 CommitLog 写入** —— 高可用 + 性能折中。

部署见官方：[自动故障转移](https://rocketmq.apache.org/zh/docs/deploymentOperations/03autofailover)

Broker 源码里已有主从切换相关分支（读 Broker 启动与 `registerBrokerAll` 时可对照）。建议带问题跳读：`changeSpecialServiceStatus`、`ControllerManager` 等。

![Controller 架构概念](/中间件/rocketmq/43/p13-01.png)

---

## 五、BrokerContainer

4.x：**一进程一 Broker**，Slave 资源利用率低。  
5.x **`BrokerContainer`**：单 JVM 多 Broker（Master/Slave/DLedger 组合），提高单机利用率、支持交叉部署。

```bash
bin/mqbrokercontainer -c broker-container.conf
```

核心配置 `brokerConfigPaths`，用 `:` 分隔多个 broker.properties；`listenPort=10811` 接收 mqadmin。

![BrokerContainer 部署示意](/中间件/rocketmq/43/p14-01.png)

示例配置目录：`conf/container/`。

---

## 六、5.x 集群架构全景

| 组件 | 作用 |
|------|------|
| NameServer | 轻量路由 |
| Broker 主从 | 冷/热备，无自动切主 |
| DLedger | Raft 选主 + 一致 CommitLog |
| Controller | Raft 选主 + 原生 CommitLog |
| BrokerContainer | 进程级资源整合 |
| Proxy | 多语言客户端、gRPC 等（Java 客户端可不启） |

Proxy 部署：[QuickStart Proxy](https://rocketmq.apache.org/zh/docs/quickStart/01quickstart)

---

## 七、系列回顾

| 篇 | 主题 |
|----|------|
| 01–02 | 部署、架构、消息模型 |
| 03–04 | 客户端 API、SpringBoot、幂等死信 |
| 05–06 | 源码环境、RPC、收发与 Rebalance |
| 07–09 | CommitLog、延迟、长轮询、零拷贝 |
| 10 | DLedger/Raft、Controller、Container |

建议与 [RabbitMQ](/中间件/rabbitmq/)、[Kafka](/中间件/kafka/) 系列及 [MQ 常见问题](/中间件/faq/) 对照，从 **模型、存储、一致性** 三个维度建立选型直觉。

---

## 八、本章小结

- **主从**：备数据，不备角色  
- **DLedger**：Raft CP，日志格式独立  
- **Controller**：5.x 推荐的 HA 演进方向之一  
- **BrokerContainer / Proxy**：云原生与多语言方向  

RocketMQ 5.x 自 2022 年 9 月起持续演进；读懂核心源码 + 集群组件，即可覆盖绝大多数生产排障与架构讨论。
