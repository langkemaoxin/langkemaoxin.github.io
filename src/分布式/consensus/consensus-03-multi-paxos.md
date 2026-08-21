---
title: "Multi-Paxos：从单值到日志（附 ZAB 对照）"
sidebarGroup: "共识算法"
shortTitle: "03 Multi-Paxos"
order: 3
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "共识算法"
  - "理论"
description: "【占位待学】Multi-Paxos：从单值到日志（附 ZAB 对照）——对应总纲阶段 5.1 · 单元 5.1.2（附 5.2.7 ZAB）。学完本篇应能：能说清 Basic Paxos 到 Multi-Paxos 的鸿沟是怎么填的"
---

> **分布式事务系列 · 阶段 5 · 共识算法 · 第 39/49 篇 · 🚧 占位待学**
> 上一篇：[《Basic Paxos：两阶段与多数派》](/分布式/consensus/consensus-02-basic-paxos)
> 下一篇：[《Raft 分解思想与 Leader 选举》](/分布式/consensus/consensus-04-raft-election)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5.1 · 单元 5.1.2（附 5.2.7 ZAB）**

## 一、本文要解决的问题

Paxos 一次只定一个值，工程上要定一串日志怎么办？leader 优化省掉了什么？顺带把 ZooKeeper 的 ZAB 对照看完。

## 二、知识点清单

- instance 与日志：每个槽位跑一次 Paxos
- leader 选出后为什么可以省掉 prepare（提案号垄断）
- 日志空洞与恢复
- ZAB 对照：崩溃恢复 vs 日志复制，一段话说清与 Raft/Paxos 的异同
- 为什么工程实现都「不等于」论文（实现补了大量工程细节）

## 三、动手实验（学习时必须真跑）

- 对照 ZooKeeper ZAB 资料，写一页差异笔记

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清 Basic Paxos 到 Multi-Paxos 的鸿沟是怎么填的

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
