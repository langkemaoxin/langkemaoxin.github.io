---
title: "ZooKeeper Leader 选举源码要点"
sidebarGroup: "ZooKeeper"
shortTitle: "04 Leader 选举要点"
order: 4
date: 2026-10-11
category: "中间件"
tag:
  - "ZooKeeper"
  - "中间件"
---

> **ZooKeeper 系列 · 第 4/5 篇**  
> 上一篇：[《ZooKeeper 分布式锁实战》](/中间件/zookeeper/zk-03-distributed-lock) · 下一篇：[《ZooKeeper ZAB 协议——广播与崩溃恢复》](/中间件/zookeeper/zk-05-zab)

---

## 开头：读选举源码，是为了搞懂「谁当 Leader、凭什么」

应用层用 ZK 做选主，底层 ZK 集群自己也要选 Leader。源码材料较短，本篇不做逐行贴码，而是把**启动入口、多层队列架构、投票比较规则**说清楚，便于你对照官方/调试版本自行跟读。

![Leader 选举学习动机](/中间件/zookeeper/20/p01-01.png)

---

## 一、为什么要读 ZK 源码

- 理解**设计取舍**（队列解耦、epoch/zxid 比较）而非死记 API
- 集群故障、脑裂、选主卡住时，能根据日志与状态**缩小范围**
- 与 [第 1 篇](/中间件/zookeeper/zk-01-intro) 的 `FastLeaderElection` 规则、[第 5 篇](/中间件/zookeeper/zk-05-zab) 的 ZAB 形成闭环

建议方法：先会用 → 抓**启动主流程**画时序图 → 再抠细节；避免一上来陷入分支。

![读源码的方法论](/中间件/zookeeper/20/p02-01.png)

![源码阅读步骤示意](/中间件/zookeeper/20/p02-02.png)

![避免陷入细枝末节](/中间件/zookeeper/20/p02-03.png)

---

## 二、从哪启动、怎么调试

- 仓库：[apache/zookeeper](https://github.com/apache/zookeeper)（示例分支 3.5.8）
- 入口：`bin/zkServer.sh` → 主类 **`org.apache.zookeeper.server.quorum.QuorumPeerMain`**
- 本地调试：复制 `zoo_sample.cfg` 为 `zoo.cfg`；`mvn clean install -DskipTests`；`Version` 类报错时补全 `org.apache.zookeeper.version.Info` 占位接口

![ZK 源码下载与编译](/中间件/zookeeper/20/p01-01.png)

![QuorumPeerMain 启动入口](/中间件/zookeeper/20/p02-01.png)

客户端连源码进程：`bin/zkCli.sh -server host:2181`；IDE 运行 `ZooKeeperMain` 并配置连接参数。

![源码启动 Server 与 Client](/中间件/zookeeper/20/p03-01.png)

**伪集群**：复制多份 `zoo.cfg`，改 `clientPort`/`electionPort`，各 `dataDir/myid` 不同，分别启动三个 `QuorumPeerMain`。

![三节点源码集群配置示意](/中间件/zookeeper/20/p03-02.png)

---

## 三、Leader 选举流程（概念）

触发时机：**集群首次启动**、**Leader 宕机或失去过半 Follower**。

整体分为两层：

1. **应用层队列**：统一收发选票（proposal）
2. **传输层队列**：按目标机器分队列发送，避免某节点发送阻塞拖垮全局

![Leader 选举多层队列架构](/中间件/zookeeper/20/p03-01.png)

![应用层与传输层解耦](/中间件/zookeeper/20/p03-02.png)

每个参与者维护当前**选票**（建议的 Leader + 该 Leader 见过的最大 zxid/epoch）。多轮交换后，按规则收敛到同一 Leader。

---

## 四、投票比较规则（核心）

`FastLeaderElection.totalOrderPredicate` 逻辑（与 [zk-01](/中间件/zookeeper/zk-01-intro) 一致）：

1. **epoch 大**者优先（新一轮选举）
2. epoch 相同 → **zxid 大**者优先（数据更新）
3. 仍相同 → **myid（server id）大**者优先

![选举比较规则流程图](/中间件/zookeeper/20/p04-01.png)

![totalOrderPredicate 三条规则](/中间件/zookeeper/20/p04-02.png)

**与业务选主的区别**：这是 **Quorum 内部**选「写请求调度者」，不是你在 `/election` 下建的临时顺序节点；但「比编号、比版本」的思想相通。

---

## 五、跟读时看什么

| 关注点 | 说明 |
|--------|------|
| 状态机 | LOOKING → FOLLOWING / LEADING |
| 选票内容 | (sid, zxid, epoch) |
| 过半 | 同一提案得**过半**投票才结束 LOOKING |
| 日志 | `Notification`、`ack`、epoch 变更 |

不必背诵类名清单；跟一张**时序图**（启动 → LOOKING → 广播选票 → LEADING）即可。

![Leader 选举源码流程图（跟读用）](/中间件/zookeeper/20/p04-01.png)

---

## 小结

- 入口 **`QuorumPeerMain`**；选举 = **多层队列 + 多轮投票**。
- 比较顺序：**epoch → zxid → myid**。
- 下一篇讲写入路径上的 **ZAB**（广播 + 崩溃恢复），与选举选出的 Leader 如何配合。
