---
title: "工程锚点 etcd：亲眼看一次选主"
sidebarGroup: "共识算法"
shortTitle: "07 etcd 实操"
order: 7
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "共识算法"
  - "实战"
description: "【占位待学】工程锚点 etcd：亲眼看一次选主——对应总纲阶段 5.2 · 单元 5.2.5。学完本篇应能：亲手见过一次选主，并能用论文术语复述时间线"
---

> **分布式事务系列 · 阶段 5 · 共识算法 · 第 43/49 篇 · 🚧 占位待学**
> 上一篇：[《Raft 安全性与成员变更》](/分布式/consensus/consensus-06-raft-safety)
> 下一篇：[《工程锚点 Seata TC：Raft 存储模式实操》](/分布式/consensus/consensus-08-seata-raft)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5.2 · 单元 5.2.5**

## 一、本文要解决的问题

生产级 Raft 长什么样？本地起一个 3 节点 etcd，亲手 kill 一次 leader，把论文里的选举看进日志里。

## 二、知识点清单

- etcd 架构：raft 库 + WAL + 存储 + gRPC API
- 集群部署与 etcdctl endpoint status / endpoint health
- WAL 与快照的作用
- 观察指标：任期跳变、选举耗时、写入恢复

## 三、动手实验（学习时必须真跑）

- 本地 3 节点 etcd 集群：endpoint status 看 leader 分布
- kill leader，观察自动选举时间线与新 leader 上的写入恢复

## 四、验收标准（全部通过才进入下一篇）

- [ ] 亲手见过一次选主，并能用论文术语复述时间线

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
