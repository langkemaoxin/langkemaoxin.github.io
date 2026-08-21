---
title: "InnoDB 日志体系：redo、undo 与内部两阶段提交"
sidebarGroup: "事务地基"
shortTitle: "03 InnoDB 日志体系"
order: 3
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "事务基础"
description: "【占位待学】InnoDB 日志体系：redo、undo 与内部两阶段提交——对应总纲阶段 0 · 单元 0.3。学完本篇应能：脱稿画出一条 UPDATE 的完整路径：SQL 解析 → 加行锁 → 写 undo → 写 redo → 写 binlog"
---

> **分布式事务系列 · 阶段 0 · 事务地基 · 第 3/49 篇 · 🚧 占位待学**
> 上一篇：[《隔离级别与 MVCC：ReadView 与版本链》](/分布式/tx-basics/tx-basics-02-isolation-mvcc)
> 下一篇：[《Spring 事务：传播行为与失效场景》](/分布式/tx-basics/tx-basics-04-spring-transaction)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 0 · 单元 0.3**

## 一、本文要解决的问题

redo log、undo log、binlog 各管什么？一条 UPDATE 从执行到落盘走什么路径？数据库崩溃后靠谁恢复？这篇是阶段 0 的枢纽——Seata AT 的 undo_log 设计思想就是从这里偷师的。

## 二、知识点清单

- redo log：WAL 思想、崩溃恢复、循环写与 checkpoint
- undo log：回滚滚 + MVCC 双职责
- binlog：复制与归档，与 redo log 的分工
- 内部两阶段提交：redo prepare → 写 binlog → redo commit，以及三种崩溃点的恢复行为

## 三、动手实验（学习时必须真跑）

- 纸面推演三种崩溃点（写 redo 前 / redo prepare 后 binlog 前 / binlog 写完后）各自的恢复逻辑
- 用 show engine innodb status 与 general log 观察一次 UPDATE 的痕迹

## 四、验收标准（全部通过才进入下一篇）

- [ ] 脱稿画出一条 UPDATE 的完整路径：SQL 解析 → 加行锁 → 写 undo → 写 redo → 写 binlog
- [ ] 能说出 undo log 将来在 Seata AT 里扮演什么角色（为阶段 3 埋钩子）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
