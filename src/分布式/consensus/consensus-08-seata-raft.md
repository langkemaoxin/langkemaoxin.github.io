---
title: "工程锚点 Seata TC：Raft 存储模式实操"
sidebarGroup: "共识算法"
shortTitle: "08 Seata TC Raft"
order: 8
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "共识算法"
  - "实战"
  - "Seata"
description: "【占位待学】工程锚点 Seata TC：Raft 存储模式实操——对应总纲阶段 5.2 · 单元 5.2.6。学完本篇应能：能讲清「TC 为什么用 Raft 而不是主从复制 / Gossip」（主线回扣）"
---

> **分布式事务系列 · 阶段 5 · 共识算法 · 第 44/49 篇 · 🚧 占位待学**
> 上一篇：[《工程锚点 etcd：亲眼看一次选主》](/分布式/consensus/consensus-07-etcd-lab)
> 下一篇：[《Gossip：反熵与谣言传播》](/分布式/consensus/consensus-09-gossip-model)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5.2 · 单元 5.2.6**

## 一、本文要解决的问题

Seata TC 自己的高可用为什么用 Raft？3 节点 raft 存储模式的 TC，kill leader 后全局事务能被新 leader 接管吗？主线回扣：理论落到自己天天用的框架上。

## 二、知识点清单

- seata-server 的 raft 存储模式（2.0+ 引入）：配置与部署
- TC 会话与全局锁的复制方式
- leader 切换时未完成全局事务的接管
- raft / db / redis 三种存储模式的对比与选型

## 三、动手实验（学习时必须真跑）

- 部署 3 节点 raft 模式 seata-server
- 全局事务进行中 kill TC leader，验证事务被新 leader 接管并完成

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能讲清「TC 为什么用 Raft 而不是主从复制 / Gossip」（主线回扣）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
