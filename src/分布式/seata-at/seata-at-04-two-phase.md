---
title: "AT 两阶段拆解：一阶段四件事与异步二阶段"
sidebarGroup: "Seata AT"
shortTitle: "04 AT 两阶段拆解"
order: 4
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "AT"
  - "实战"
description: "【占位待学】AT 两阶段拆解：一阶段四件事与异步二阶段——对应总纲阶段 3A · 单元 3A.4。学完本篇应能：能手写一条 undo_log 镜像 JSON 的结构（两张镜像 + where 条件）"
---

> **分布式事务系列 · 阶段 3A · Seata AT · 第 16/49 篇 · 🚧 占位待学**
> 上一篇：[《应用接入：starter、@GlobalTransactional 与 undo_log 表》](/分布式/seata-at/seata-at-03-integrate-app)
> 下一篇：[《AT 隔离性：全局锁防脏写与读隔离》](/分布式/seata-at/seata-at-05-isolation)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3A · 单元 3A.4**

## 一、本文要解决的问题

AT 的「一阶段直接提交本地事务」凭什么敢？二阶段提交为什么只是删日志、回滚又靠什么？这是 AT 模式的灵魂一篇，也是源码篇（06-10）的总纲。

## 二、知识点清单

- 一阶段四件事：业务 SQL → 查 before/after 镜像 → undo_log 与业务同本地事务提交 → 注册分支 + 申请全局锁后释放本地锁
- 二阶段提交：异步批量删除 undo_log 即完成
- 二阶段回滚：用 before 镜像反向补偿，校验 after 镜像防脏写
- 与 XA 的锁持有时间对比（阶段 2 验收问题的工程落地）

## 三、动手实验（学习时必须真跑）

- 回滚场景下逐步观察 undo_log 表变化与最终数据
- 手工解码一条 undo_log 的 rollback_info JSON（before / after 镜像）

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能手写一条 undo_log 镜像 JSON 的结构（两张镜像 + where 条件）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
