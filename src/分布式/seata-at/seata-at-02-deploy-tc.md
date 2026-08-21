---
title: "部署 seata-server：db 存储、Nacos 注册与 console"
sidebarGroup: "Seata AT"
shortTitle: "02 部署 TC"
order: 2
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "AT"
  - "实战"
  - "部署"
description: "【占位待学】部署 seata-server：db 存储、Nacos 注册与 console——对应总纲阶段 3A · 单元 3A.2。学完本篇应能：能在 console 里定位一次回滚事务，并解释三张存储表里各自新增了什么"
---

> **分布式事务系列 · 阶段 3A · Seata AT · 第 14/49 篇 · 🚧 占位待学**
> 上一篇：[《三角色与全局事务生命周期》](/分布式/seata-at/seata-at-01-roles-lifecycle)
> 下一篇：[《应用接入：starter、@GlobalTransactional 与 undo_log 表》](/分布式/seata-at/seata-at-03-integrate-app)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3A · 单元 3A.2**

## 一、本文要解决的问题

TC 协调器怎么跑起来？file 与 db 存储模式的本质差别是什么？把 TC 部署成后续所有实战的公共基础设施。

## 二、知识点清单

- seata-server 启动方式与关键配置（registry / store / console）
- db 存储模式建表：global_table、branch_table、lock_table 三张表的结构与作用
- 接入 Nacos 注册中心与配置中心
- console 控制台：查全局事务、分支事务、全局锁

## 三、动手实验（学习时必须真跑）

- 用 db 存储 + Nacos 注册部署单机 TC（Apache Seata 2.6.0，坐标 org.apache.seata）
- 制造一次全局回滚，到 console 里找到这条事务记录与它的分支

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能在 console 里定位一次回滚事务，并解释三张存储表里各自新增了什么

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
