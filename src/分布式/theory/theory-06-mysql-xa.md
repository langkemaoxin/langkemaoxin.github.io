---
title: "MySQL XA 实操：亲手跑一遍两阶段"
sidebarGroup: "理论与协议"
shortTitle: "06 MySQL XA 实操"
order: 6
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "理论"
description: "【占位待学】MySQL XA 实操：亲手跑一遍两阶段——对应总纲阶段 2 · 单元 2.4。学完本篇应能：亲眼见过 in-flight 的 XA 事务"
---

> **分布式事务系列 · 阶段 2 · 理论与协议 · 第 11/49 篇 · 🚧 占位待学**
> 上一篇：[《3PC：缓解了什么，又引入了什么》](/分布式/theory/theory-05-3pc)
> 下一篇：[《XA 的工程代价：为什么互联网公司不用它》](/分布式/theory/theory-07-xa-cost)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 2 · 单元 2.4**

## 一、本文要解决的问题

XA 协议在 MySQL 里到底长什么样？PREPARE 之后连接断了，事务会怎样？亲手跑一遍，2PC 就从纸面图变成肌肉记忆——这也是对比 Seata AT 的实验基线。

## 二、知识点清单

- XA START / XA END / XA PREPARE / XA COMMIT 语法与 xid 的组成
- XA RECOVER：查看悬挂中的已 prepare 事务
- PREPARE 前后 kill 会话的行为差异
- MySQL XA 与 binlog / 主从复制的历史坑（了解即可）

## 三、动手实验（学习时必须真跑）

- 两个 mysql 客户端手工执行 XA 转账：一个库扣款 PREPARE，另一个库加款 PREPARE，再逐个 COMMIT
- 在 PREPARE 后 kill 会话，用 XA RECOVER 观察悬挂事务，再手工提交 / 回滚它

## 四、验收标准（全部通过才进入下一篇）

- [ ] 亲眼见过 in-flight 的 XA 事务
- [ ] 能说清 PREPARE 前与 PREPARE 后 kill 会话的差别及原因（锁与状态）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
