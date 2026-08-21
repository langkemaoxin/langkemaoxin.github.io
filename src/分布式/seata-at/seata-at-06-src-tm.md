---
title: "源码·TM 侧：从注解拦截到全局事务开启"
sidebarGroup: "Seata AT"
shortTitle: "06 源码·TM 链路"
order: 6
date: 2026-08-22
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "AT"
  - "源码"
description: "【占位待学】源码·TM 侧：从注解拦截到全局事务开启——对应总纲阶段 3B · 单元 3B.1。学完本篇应能：脱稿写出 TM 侧类名级调用链（注解 → 切面 → 模板 → 事务对象 → 网络）"
---

> **分布式事务系列 · 阶段 3B · Seata AT 源码 · 第 18/49 篇 · 🚧 占位待学**
> 上一篇：[《AT 隔离性：全局锁防脏写与读隔离》](/分布式/seata-at/seata-at-05-isolation)
> 下一篇：[《源码·XID 传播：跨 RPC 的事务上下文》](/分布式/seata-at/seata-at-07-src-xid)
> 学习大纲：[《分布式事务学习总纲》](/分布式/roadmap/distributed-tx-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3B · 单元 3B.1**

## 一、本文要解决的问题

@GlobalTransactional 是谁拦截的？begin / commit 怎么一路走到 TC？源码篇第一章，先搭源码调试环境，再追第一条链路。

## 二、知识点清单

- 源码环境：拉取 apache/incubator-seata 源码、版本对齐 2.6.0、与实战项目联调
- GlobalTransactionalInterceptor：注解切面入口与方法解析
- TransactionalTemplate：begin → 业务 → commit/rollback 的模板流程与异常传播
- DefaultGlobalTransaction 状态机与 TM 向 TC 发送 GlobalBeginRequest

## 三、动手实验（学习时必须真跑）

- 在 TransactionalTemplate 打断点，完整追一遍开启 → 业务 → 提交 / 回滚链路

## 四、验收标准（全部通过才进入下一篇）

- [ ] 脱稿写出 TM 侧类名级调用链（注解 → 切面 → 模板 → 事务对象 → 网络）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
