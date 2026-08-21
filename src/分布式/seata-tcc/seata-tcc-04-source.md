---
title: "TCC 源码：切面拆解、分支注册与 Fence 实现"
sidebarGroup: "Seata TCC"
shortTitle: "04 TCC 源码"
order: 4
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "TCC"
  - "源码"
description: "【占位待学】TCC 源码：切面拆解、分支注册与 Fence 实现——对应总纲阶段 3C · 单元 3C.4。学完本篇应能：能对比 AT 与 TCC 分支注册与二阶段驱动的异同（类名级）"
---

> **分布式事务系列 · 阶段 3C · Seata TCC · 第 26/49 篇 · 🚧 占位待学**
> 上一篇：[《Fence 机制：一张表防三害》](/分布式/seata-tcc/seata-tcc-03-fence)
> 下一篇：[《Saga 理论：LLT 与补偿语义》](/分布式/saga/saga-01-theory)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3C · 单元 3C.4**

## 一、本文要解决的问题

一个业务接口怎么被切面拆成两阶段？fence 在源码层怎么实现？对照 AT 源码，看两种模式在「分支注册」这一步的分道扬镳。

## 二、知识点清单

- @TwoPhaseBusinessAction 注解的解析与元数据注册
- TccActionInterceptor 切面：Try 执行 + 分支注册
- 二阶段回调：TC 请求如何分发到 Confirm / Cancel 方法
- TransactionFenceManager 的 prepare / commit / rollback 实现（对照 03 篇的状态检查）
- AT 与 TCC 在 branchRegister 上的异同

## 三、动手实验（学习时必须真跑）

- 断点追 Try → 注册分支 → 二阶段回调 Confirm 的全链路

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能对比 AT 与 TCC 分支注册与二阶段驱动的异同（类名级）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
