---
title: "SWIM 故障检测与 Redis Cluster 实操"
sidebarGroup: "共识算法"
shortTitle: "10 SWIM 与 Redis"
order: 10
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "共识算法"
  - "实战"
description: "【占位待学】SWIM 故障检测与 Redis Cluster 实操——对应总纲阶段 5.3 · 单元 5.3.2 + 5.3.3。学完本篇应能：能说清「元数据系统用 Gossip（AP）、事务存储用 Raft（CP）」各自的合理性"
---

> **分布式事务系列 · 阶段 5 · 共识算法 · 第 46/49 篇 · 🚧 占位待学**
> 上一篇：[《Gossip：反熵与谣言传播》](/分布式/consensus/consensus-09-gossip-model)
> 下一篇：[《选型决策树：六方案一张图》](/分布式/capstone/capstone-01-decision-tree)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5.3 · 单元 5.3.2 + 5.3.3**

## 一、本文要解决的问题

Gossip 怎么发现节点挂了又不误杀？Redis Cluster 用它管槽位与故障转移——最后一个工程锚点，阶段收官。

## 二、知识点清单

- SWIM：直接探测失败 → 间接探测确认 → 怀疑 → 摘除
- 成员信息 piggyback 在心跳里传播
- Redis Cluster：节点发现、16384 槽位、槽迁移、主从故障转移

## 三、动手实验（学习时必须真跑）

- 6 节点（3 主 3 从）Redis Cluster：CLUSTER MEET 后观察节点表收敛
- kill 一个主节点，记录故障转移时间线（谁先怀疑、谁 promoted）

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清「元数据系统用 Gossip（AP）、事务存储用 Raft（CP）」各自的合理性

## 五、阶段验收（本篇是阶段 5收尾篇）

- [ ] 口述题一：Basic Paxos 两阶段各防住什么
- [ ] 口述题二：Raft 一个日志条目从客户端到提交的完整旅程
- [ ] 口述题三：为什么 Seata TC 用 Raft、Redis Cluster 用 Gossip，而两者都是对的

## 六、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
