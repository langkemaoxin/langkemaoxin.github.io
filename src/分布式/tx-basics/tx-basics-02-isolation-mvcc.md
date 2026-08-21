---
title: "隔离级别与 MVCC：ReadView 与版本链"
sidebarGroup: "事务地基"
shortTitle: "02 隔离级别与 MVCC"
order: 2
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "事务基础"
description: "【占位待学】隔离级别与 MVCC：ReadView 与版本链——对应总纲阶段 0 · 单元 0.2。学完本篇应能：能画出一条记录的版本链，并对任意一次读，推出它落在哪个版本上"
---

> **分布式事务系列 · 阶段 0 · 事务地基 · 第 2/49 篇 · 🚧 占位待学**
> 上一篇：[《ACID 与并发异常：亲手复现脏读、不可重复读、幻读》](/分布式/tx-basics/tx-basics-01-acid-anomalies)
> 下一篇：[《InnoDB 日志体系：redo、undo 与内部两阶段提交》](/分布式/tx-basics/tx-basics-03-innodb-logs)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 0 · 单元 0.2**

## 一、本文要解决的问题

快照读为什么不加锁也能保证可重复读？ReadView 和版本链怎么配合决定"我能看见哪个版本"？不搞懂 MVCC，后面 Seata AT 的 before/after 镜像、全局锁与本地锁的分工都读不懂。

## 二、知识点清单

- 隐藏列 trx_id、roll_pointer 与 undo log 版本链的构成
- ReadView 的四要素（m_ids / min_trx_id / max_trx_id / creator_trx_id）与可见性判断规则
- RC 与 RR 生成 ReadView 时机差异：一次一条 vs 整个事务一条
- 当前读（select for update / update）与快照读的区别

## 三、动手实验（学习时必须真跑）

- 建表插数据，两个事务交错执行，观察同一 SELECT 在 RR 下的两次结果
- 查 information_schema.innodb_trx，找到长事务并解释它的危害

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能画出一条记录的版本链，并对任意一次读，推出它落在哪个版本上

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
