---
title: "Fence 机制：一张表防三害"
sidebarGroup: "Seata TCC"
shortTitle: "03 Fence 机制"
order: 3
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "TCC"
  - "实战"
description: "【占位待学】Fence 机制：一张表防三害——对应总纲阶段 3C · 单元 3C.3。学完本篇应能：能说清 fence 的四个状态分别挡住哪个问题、在哪一步检查"
---

> **分布式事务系列 · 阶段 3C · Seata TCC · 第 25/49 篇 · 🚧 占位待学**
> 上一篇：[《空回滚、悬挂、幂等：三大问题的异常时序》](/分布式/seata-tcc/seata-tcc-02-three-issues)
> 下一篇：[《TCC 源码：切面拆解、分支注册与 Fence 实现》](/分布式/seata-tcc/seata-tcc-04-source)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3C · 单元 3C.3**

## 一、本文要解决的问题

开启 useTCCFence 之后，一张 tcc_fence_log 表怎么同时防住空回滚、悬挂、幂等三个问题？

## 二、知识点清单

- useTCCFence 配置与 tcc_fence_log 建表
- fence 记录状态：初始化 / 已提交 / 已回滚 / 悬挂
- prepare / commit / rollback 三步各自对 fence 的检查与更新逻辑
- fence 表与业务库的关系：为什么它可以和业务表同库

## 三、动手实验（学习时必须真跑）

- 开启 fence，重复上一篇的三个复现实验，观察全部被拦截
- 每个实验后查 tcc_fence_log 表，对照记录状态

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清 fence 的四个状态分别挡住哪个问题、在哪一步检查

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
