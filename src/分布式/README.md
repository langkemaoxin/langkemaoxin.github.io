---
title: 分布式
index: false
icon: network-wired
article: false
---

# 分布式

本专栏聚焦分布式系统中的一致性与事务协作。建议从**学习总纲**进入：它以西蒙学习法把整个领域拆成六大阶段 50+ 知识单元（本地事务 → CAP/BASE → 2PC/XA → Seata AT/TCC/Saga → 可靠消息与最大努力通知 → Paxos/Raft/Gossip），后续文章按该大纲逐步展开。

## 学习路线

- [分布式事务学习总纲：零基础到资深专家的完整教学大纲](./roadmap/distributed-tx-roadmap.md)

当前已展开 **Seata 系列（8 篇）**：从分布式事务场景、AT/TCC 实战，到 TCC 核心源码与隔离性面试题。

Seata **内核源码深化**另见微服务专栏：[Seata 内核源码深化](/微服务/seata/seata-kernel-01-source)。

## Seata 系列（8 篇）

1. [分布式事务场景与 Seata 总览](./seata/seata-01-distributed-tx-overview.md)
2. [Seata AT 模式：角色、两阶段与 XA 对比](./seata/seata-02-at-mode.md)
3. [搭建 Seata TC：file/db 存储与 Nacos 集群](./seata/seata-03-tc-server.md)
4. [AT 模式 TM/RM 接入与秒杀实战](./seata/seata-04-at-tm-rm.md)
5. [Seata TCC 模式实战：库存、订单与秒杀](./seata/seata-05-tcc-practice.md)
6. [TCC 三大优势与空回滚、悬挂、幂等](./seata/seata-06-tcc-issues.md)
7. [Seata TCC 核心源码：切面、Fence、XID 传递](./seata/seata-07-tcc-source.md)
8. [隔离性、脏读写防护与 Seata 面试题](./seata/seata-08-isolation-interview.md)
