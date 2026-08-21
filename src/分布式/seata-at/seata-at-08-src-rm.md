---
title: "源码·RM 一阶段：数据源代理、镜像生成与全局锁"
sidebarGroup: "Seata AT"
shortTitle: "08 源码·RM 一阶段"
order: 8
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "AT"
  - "源码"
description: "【占位待学】源码·RM 一阶段：数据源代理、镜像生成与全局锁——对应总纲阶段 3B · 单元 3B.3。学完本篇应能：能讲出「业务 SQL 与 undo_log 同本地事务提交」的原理，及其对原子性的意义"
---

> **分布式事务系列 · 阶段 3B · Seata AT 源码 · 第 20/49 篇 · 🚧 占位待学**
> 上一篇：[《源码·XID 传播：跨 RPC 的事务上下文》](/分布式/seata-at/seata-at-07-src-xid)
> 下一篇：[《源码·TC 侧：会话管理与四种存储》](/分布式/seata-at/seata-at-09-src-tc)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3B · 单元 3B.3**

## 一、本文要解决的问题

业务 SQL 是怎么被拦下来解析、生成镜像、写 undo_log、申请全局锁的？这是 AT 源码最厚的一篇，也是「无侵入」三个字的全部实现。

## 二、知识点清单

- DataSourceProxy / ConnectionProxy / PreparedStatementProxy 代理体系
- ExecuteTemplate 按语句类型路由执行器（UpdateExecutor / SelectForUpdateExecutor 等）
- SQL 解析：Select / Update / Insert / Delete 识别器与 where 条件提取
- before / after 镜像构建（主键查询回填）与 UndoLogManager 写 undo_log
- branchRegister + 全局锁申请的时序：为什么本地提交前必须拿到全局锁

## 三、动手实验（学习时必须真跑）

- 断点追一阶段全链路：代理 → 解析 → 镜像 → undo_log → 注册 → 本地提交
- 观察联合主键 / 无主键表的镜像构建行为

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能讲出「业务 SQL 与 undo_log 同本地事务提交」的原理，及其对原子性的意义

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
