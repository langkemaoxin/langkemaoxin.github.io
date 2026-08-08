---
title: "ZooKeeper ZAB 协议——广播与崩溃恢复"
sidebarGroup: "ZooKeeper"
shortTitle: "05 ZAB 协议要点"
order: 5
date: 2026-10-12
category: "中间件"
tag:
  - "ZooKeeper"
  - "中间件"
---

> **ZooKeeper 系列 · 第 5/5 篇**  
> 上一篇：[《ZooKeeper Leader 选举源码要点》](/中间件/zookeeper/zk-04-leader-election)

---

## 开头：一致性的「引擎」——ZAB

ZooKeeper 集群对外保证顺序一致，底层协议是 **ZAB（ZooKeeper Atomic Broadcast）**，可看作 Paxos 的简化实现。集群在两种模式间切换：**Leader 正常 → 消息广播**；**Leader 失效 → 崩溃恢复**（与 [第 4 篇](/中间件/zookeeper/zk-04-leader-election) 选举衔接）。

![ZAB 协议总览](/中间件/zookeeper/22/p01-01.png)

![主备架构与写路径](/中间件/zookeeper/22/p01-02.png)

---

## 一、ZAB 是什么

- **全称**：Zookeeper Atomic Broadcast（原子广播）
- **目标**：崩溃恢复 + 原子广播，维持副本间数据一致
- **架构**：**主备**——客户端**写**只由 **Leader** 处理；Follower 收到写请求会**转发**给 Leader；Follower 可读

所有写进入 Leader，再复制到 Follower；复制类似 **2PC**，但提交条件放宽为 **过半 ACK（含 Leader 自己）** 即可 commit，降低阻塞、提高可用性。

---

## 二、消息广播（正常阶段）

流程概要：

1. Leader 将写请求封装为 **Proposal（事务）**，分配全局递增 **ZXID**
2. 广播给所有 Follower
3. 过半 Follower ACK 后，Leader 发起 **commit**，各节点执行

![消息广播两阶段示意](/中间件/zookeeper/22/p02-01.png)

**细节**：

| 点 | 说明 |
|----|------|
| ZXID 顺序 | 事务按 ZXID 排序处理，常借队列保证顺序 |
| 解耦队列 | Leader 与 Follower 间消息队列，减轻同步阻塞 |
| 写收敛 | 仅 Leader 接受写；Follower 写也会转发 |
| 已 commit 可见 | 某节点上已 commit 的事务，应在所有节点最终 commit（故障恢复保证） |

ZXID 64 位：**高 32 位 epoch**（Leader 轮次，选举后 +1）+ **低 32 位 counter**（该 epoch 内递增）。便于 Follower 识别 Leader 代际与恢复时对账。

![ZXID 与事务顺序](/中间件/zookeeper/22/p02-01.png)

---

## 三、崩溃恢复

Leader 崩溃进入**崩溃恢复模式**（失去与过半 Follower 联系）。

典型难题：

- Leader 已复制但未收齐 ACK 就宕机？
- 部分 Follower 已 commit、部分未 commit？

**ZAB 两条原则**：

1. **丢弃**只在 Leader 提出/复制、**未提交**的事务  
2. **保证**已在 Leader **提交**的事务，最终在所有服务器 **提交**

选举算法要求：新 Leader 拥有集群中**最大 ZXID 的已提交事务**集合 → 可省略逐一检查提交/丢弃的步骤（见 [zk-04](/中间件/zookeeper/zk-04-leader-election) 的 zxid 比较）。

![崩溃恢复场景](/中间件/zookeeper/22/p03-01.png)

### 数据同步

新 Leader 上任后、接受客户端请求前，确认过半 Follower 已同步到**已提交**状态；Follower 与 Leader 按 **ZXID 对账**——落后则同步，冲突则回滚到 Leader 视图。

---

## 四、与源码阅读的关系

写路径源码涉及：`ProposalRequestProcessor`、`CommitProcessor`、`SyncRequestProcessor` 等与 **ZXID 分配、ACK、commit** 相关的处理器链。材料中仅给出流程图索引，跟读时建议：

1. 从 Leader 收到 `create/setData/delete` 跟到 Proposal
2. 跟 quorum ACK 与 commit
3. 对照崩溃恢复时 `DataTree` 与 txn log 回放

![ZAB 写数据源码流程索引](/中间件/zookeeper/22/p03-01.png)

---

## 系列收束

| 篇 | 主题 |
|----|------|
| 01 | 节点、Watcher、集群角色 |
| 02 | Curator、命名/ID/队列 |
| 03 | 分布式锁、注册中心 |
| 04 | Leader 选举机制 |
| 05 | ZAB 广播与恢复 |

ZooKeeper 适合**协调、元数据、锁、选主**；大数据体存储请选专用存储。与 ShardingSphere 治理中心、Dubbo 注册中心等组合时，理解 ZAB + 选举能帮你更快定位「脑裂、旧 Leader、会话过期」类问题。

---

## 小结

- ZAB = **原子广播 + 崩溃恢复**；写经 Leader，**过半 ACK** 提交。
- ZXID 的 **epoch + counter** 贯穿选举、同步与恢复。
- 应用层临时节点语义 + 集群层 ZAB，共同构成 ZK 的可靠性基础。
