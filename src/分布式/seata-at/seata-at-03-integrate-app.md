---
title: "应用接入：starter、@GlobalTransactional 与 undo_log 表"
sidebarGroup: "Seata AT"
shortTitle: "03 应用接入"
order: 3
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "AT"
  - "实战"
description: "【占位待学】应用接入：starter、@GlobalTransactional 与 undo_log 表——对应总纲阶段 3A · 单元 3A.3。学完本篇应能：能解释 undo_log 记录的内容、什么时候写入、什么时候删除"
---

> **分布式事务系列 · 阶段 3A · Seata AT · 第 15/49 篇 · 🚧 占位待学**
> 上一篇：[《部署 seata-server：db 存储、Nacos 注册与 console》](/分布式/seata-at/seata-at-02-deploy-tc)
> 下一篇：[《AT 两阶段拆解：一阶段四件事与异步二阶段》](/分布式/seata-at/seata-at-04-two-phase)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3A · 单元 3A.3**

## 一、本文要解决的问题

业务应用怎么接入 AT？每个业务库里的 undo_log 表是干嘛的？这是第一个完整实战：三库转账全局回滚成功。

## 二、知识点清单

- seata-spring-boot-starter 关键配置项（group、registry、proxy 数据源自动装配）
- @GlobalTransactional 开启全局事务、超时与回滚规则
- undo_log 表结构（branch_id、xid、context、rollback_info）与生命周期
- 常见接入报错排查：连不上 TC、undo_log 缺表、数据源未被代理

## 三、动手实验（学习时必须真跑）

- 搭「订单-库存-账户」三库（或三服务）项目接入 TC
- 下游抛异常，验证全局回滚后三库数据一致；观察 undo_log 表的出现与消失

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能解释 undo_log 记录的内容、什么时候写入、什么时候删除

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
