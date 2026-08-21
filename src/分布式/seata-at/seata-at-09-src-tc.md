---
title: "源码·TC 侧：会话管理与四种存储"
sidebarGroup: "Seata AT"
shortTitle: "09 源码·TC 会话"
order: 9
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "AT"
  - "源码"
description: "【占位待学】源码·TC 侧：会话管理与四种存储——对应总纲阶段 3B · 单元 3B.4。学完本篇应能：能说清 TC 重启后事务不丢的条件（存储模式 + 恢复流程）"
---

> **分布式事务系列 · 阶段 3B · Seata AT 源码 · 第 21/49 篇 · 🚧 占位待学**
> 上一篇：[《源码·RM 一阶段：数据源代理、镜像生成与全局锁》](/分布式/seata-at/seata-at-08-src-rm)
> 下一篇：[《源码·二阶段：异步提交、反向补偿与超时检测》](/分布式/seata-at/seata-at-10-src-phase2)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3B · 单元 3B.4**

## 一、本文要解决的问题

TC 怎么维护全局会话与分支会话？重启之后未完成的事务为什么能恢复（或为什么会丢）？四种存储模式各拿什么换什么？

## 二、知识点清单

- DefaultCoordinator 与 DefaultCore：begin / branchRegister / globalCommit / globalRollback
- GlobalSession / BranchSession 的状态机与流转
- SessionHolder 四种存储：file / db / redis / raft 的取舍
- LockManager：lock_table 的键设计（资源 + 行主键）与获取 / 释放

## 三、动手实验（学习时必须真跑）

- 断点看 branchRegister 全过程（含全局锁写入 lock_table）
- TC 重启后观察未完成事务的恢复（db 存储模式）

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清 TC 重启后事务不丢的条件（存储模式 + 恢复流程）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
