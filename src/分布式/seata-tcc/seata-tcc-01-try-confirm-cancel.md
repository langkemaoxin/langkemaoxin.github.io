---
title: "TCC 三段语义：Try / Confirm / Cancel 业务怎么写"
sidebarGroup: "Seata TCC"
shortTitle: "01 TCC 三段语义"
order: 1
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "TCC"
  - "实战"
description: "【占位待学】TCC 三段语义：Try / Confirm / Cancel 业务怎么写——对应总纲阶段 3C · 单元 3C.1。学完本篇应能：画出三个方法对应的数据表设计，并解释为什么 Confirm/Cancel 不允许失败"
---

> **分布式事务系列 · 阶段 3C · Seata TCC · 第 23/49 篇 · 🚧 占位待学**
> 上一篇：[《源码·二阶段：异步提交、反向补偿与超时检测》](/分布式/seata-at/seata-at-10-src-phase2)
> 下一篇：[《空回滚、悬挂、幂等：三大问题的异常时序》](/分布式/seata-tcc/seata-tcc-02-three-issues)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3C · 单元 3C.1**

## 一、本文要解决的问题

Try 预留、Confirm 确认、Cancel 释放——三段在业务和数据表上怎么落地？和 AT 比，拿开发量换来了什么？

## 二、知识点清单

- 资源预留模式：冻结字段 / 预留表的通用设计
- Try / Confirm / Cancel 的业务语义边界与数据表设计（同一张表加冻结字段 vs 独立预留表）
- Confirm / Cancel 必须幂等、必须成功的设计约束
- AT vs TCC：侵入性、性能、开发量的三角交换

## 三、动手实验（学习时必须真跑）

- 实现库存 TCC：try 冻结库存、confirm 扣减冻结、cancel 解冻
- 正常与回滚两条路径各跑一遍，观察三段执行顺序与数据变化

## 四、验收标准（全部通过才进入下一篇）

- [ ] 画出三个方法对应的数据表设计，并解释为什么 Confirm/Cancel 不允许失败

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
