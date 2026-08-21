---
title: 分布式
index: false
icon: network-wired
article: false
---

# 分布式

本专栏聚焦分布式系统中的一致性与事务协作，以 [**分布式事务学习总纲**](./roadmap/distributed-tx-roadmap.md)（西蒙学习法 · 六大阶段 · 14 周）为主线，系列文章按大纲逐步展开。

## 学习路线

- [分布式事务学习总纲：零基础到资深专家的完整教学大纲](./roadmap/distributed-tx-roadmap.md)

## 系列文章（按学习顺序，占位待学）

### 阶段 0 · 事务地基（5 篇）

1. [ACID 与并发异常：亲手复现脏读、不可重复读、幻读](./tx-basics/tx-basics-01-acid-anomalies.md)
2. [隔离级别与 MVCC：ReadView 与版本链](./tx-basics/tx-basics-02-isolation-mvcc.md)
3. [InnoDB 日志体系：redo、undo 与内部两阶段提交](./tx-basics/tx-basics-03-innodb-logs.md)
4. [Spring 事务：传播行为与失效场景](./tx-basics/tx-basics-04-spring-transaction.md)
5. [本地事务的天花板：跨库跨服务为什么失灵](./tx-basics/tx-basics-05-local-tx-limit.md)

### 阶段 1~2 · 理论与协议（7 篇）

1. [分布式的物理现实：分区、部分失败与时钟](./theory/theory-01-distributed-reality.md)
2. [CAP 定理：为什么是三选二](./theory/theory-02-cap.md)
3. [BASE 定理与一致性谱系](./theory/theory-03-base-spectrum.md)
4. [X/Open DTP 模型与 2PC 协议：原型机与三大缺陷](./theory/theory-04-dtp-2pc.md)
5. [3PC：缓解了什么，又引入了什么](./theory/theory-05-3pc.md)
6. [MySQL XA 实操：亲手跑一遍两阶段](./theory/theory-06-mysql-xa.md)
7. [XA 的工程代价：为什么互联网公司不用它](./theory/theory-07-xa-cost.md)

### 阶段 3 · Seata 三部曲（18 篇）

**AT 实战 + 源码（10 篇）**

1. [三角色与全局事务生命周期](./seata-at/seata-at-01-roles-lifecycle.md)
2. [部署 seata-server：db 存储、Nacos 注册与 console](./seata-at/seata-at-02-deploy-tc.md)
3. [应用接入：starter、@GlobalTransactional 与 undo_log 表](./seata-at/seata-at-03-integrate-app.md)
4. [AT 两阶段拆解：一阶段四件事与异步二阶段](./seata-at/seata-at-04-two-phase.md)
5. [AT 隔离性：全局锁防脏写与读隔离](./seata-at/seata-at-05-isolation.md)
6. [源码·TM 侧：从注解拦截到全局事务开启](./seata-at/seata-at-06-src-tm.md)
7. [源码·XID 传播：跨 RPC 的事务上下文](./seata-at/seata-at-07-src-xid.md)
8. [源码·RM 一阶段：数据源代理、镜像生成与全局锁](./seata-at/seata-at-08-src-rm.md)
9. [源码·TC 侧：会话管理与四种存储](./seata-at/seata-at-09-src-tc.md)
10. [源码·二阶段：异步提交、反向补偿与超时检测](./seata-at/seata-at-10-src-phase2.md)

**TCC 实战 + 源码（4 篇）**

1. [TCC 三段语义：Try / Confirm / Cancel 业务怎么写](./seata-tcc/seata-tcc-01-try-confirm-cancel.md)
2. [空回滚、悬挂、幂等：三大问题的异常时序](./seata-tcc/seata-tcc-02-three-issues.md)
3. [Fence 机制：一张表防三害](./seata-tcc/seata-tcc-03-fence.md)
4. [TCC 源码：切面拆解、分支注册与 Fence 实现](./seata-tcc/seata-tcc-04-source.md)

**Saga（4 篇）**

1. [Saga 理论：LLT 与补偿语义](./saga/saga-01-theory.md)
2. [编排 vs 协同：两种协调风格](./saga/saga-02-orchestration-choreography.md)
3. [Seata Saga 状态机：DSL、补偿与重试](./saga/saga-03-statemachine.md)
4. [Saga 选型：什么时候非它不可](./saga/saga-04-selection.md)

### 阶段 4 · 消息一致性（6 篇）

1. [两种不一致：问题定义与风险地图](./message/message-01-two-inconsistencies.md)
2. [本地消息表：同库同事务是灵魂](./message/message-02-local-message-table.md)
3. [RocketMQ 事务消息：half、回查与全时序](./message/message-03-rocketmq-tx.md)
4. [消费端幂等：至少一次 + 去重 = 恰好一次](./message/message-04-idempotent-consume.md)
5. [最大努力通知：衰减重试与查证兜底](./message/message-05-best-effort.md)
6. [可靠消息 vs 最大努力通知：一张表定分野](./message/message-06-compare.md)

### 阶段 5 · 共识算法（10 篇）

1. [复制与 Quorum：NWR 基础](./consensus/consensus-01-replication-quorum.md)
2. [Basic Paxos：两阶段与多数派](./consensus/consensus-02-basic-paxos.md)
3. [Multi-Paxos：从单值到日志（附 ZAB 对照）](./consensus/consensus-03-multi-paxos.md)
4. [Raft 分解思想与 Leader 选举](./consensus/consensus-04-raft-election.md)
5. [Raft 日志复制与提交规则](./consensus/consensus-05-raft-log.md)
6. [Raft 安全性与成员变更](./consensus/consensus-06-raft-safety.md)
7. [工程锚点 etcd：亲眼看一次选主](./consensus/consensus-07-etcd-lab.md)
8. [工程锚点 Seata TC：Raft 存储模式实操](./consensus/consensus-08-seata-raft.md)
9. [Gossip：反熵与谣言传播](./consensus/consensus-09-gossip-model.md)
10. [SWIM 故障检测与 Redis Cluster 实操](./consensus/consensus-10-swim-redis.md)

### 阶段 6 · 毕业实战（3 篇）

1. [选型决策树：六方案一张图](./capstone/capstone-01-decision-tree.md)
2. [毕业设计：五方案混搭电商交易链路](./capstone/capstone-02-final-project.md)
3. [资深自检 20 问](./capstone/capstone-03-self-check.md)

## Seata 早期系列（8 篇）

按旧大纲整理的 Seata 入门与实战，与上面按总纲展开的新系列内容有重叠，作为补充读物：

1. [分布式事务场景与 Seata 总览](./seata/seata-01-distributed-tx-overview.md)
2. [Seata AT 模式：角色、两阶段与 XA 对比](./seata/seata-02-at-mode.md)
3. [搭建 Seata TC：file/db 存储与 Nacos 集群](./seata/seata-03-tc-server.md)
4. [AT 模式 TM/RM 接入与秒杀实战](./seata/seata-04-at-tm-rm.md)
5. [Seata TCC 模式实战：库存、订单与秒杀](./seata/seata-05-tcc-practice.md)
6. [TCC 三大优势与空回滚、悬挂、幂等](./seata/seata-06-tcc-issues.md)
7. [Seata TCC 核心源码：切面、Fence、XID 传递](./seata/seata-07-tcc-source.md)
8. [隔离性、脏读写防护与 Seata 面试题](./seata/seata-08-isolation-interview.md)
