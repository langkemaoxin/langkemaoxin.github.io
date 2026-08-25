---
title: "线程模型：从 BIO 到 NIO，百万连接的地基"
sidebarGroup: "接入层扩展"
shortTitle: "04 线程模型"
order: 7
date: 2026-08-24
category: "亿级规模系统"
tag:
  - "亿级规模系统"
  - "负载均衡"
  - "网关"
description: "【占位待学】线程模型：从 BIO 到 NIO，百万连接的地基——对应总纲阶段 1 · 单元 1.4。学完本篇应能：能画出主从 Reactor 的线程分工图，说清 acceptor / worker / eventLoop / 业务线程池各干什么"
---

> **亿级规模系统系列 · 阶段 1 · 接入层扩展 · 第 7/49 篇 · 🚧 占位待学**
> 上一篇：[《API 网关：统一入口的得与失》](/亿级规模系统/access/access-03-gateway)
> 下一篇：[《压测入门：不压测，一切架构都是猜》](/亿级规模系统/access/access-05-benchmark-basics)
> 学习大纲：[《QPS 过万与亿级消息系统设计学习总纲》](/亿级规模系统/roadmap/scale-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 1 · 单元 1.4**

## 一、本文要解决的问题

一台机器怎么同时服务 1 万个连接？「一连接一线程」的朴素模型在第 1000 个连接就把内存吃光。NIO 多路复用是亿级消息系统接入层的地基——阶段 7 的推送系统、IM 接入层全部建在它上面。

## 二、知识点清单

- BIO 一连接一线程的死穴：线程内存开销与上下文切换成本
- IO 多路复用演进：select（1024 限制）→ poll → epoll（事件驱动，O(1)）
- Reactor 三种形态：单 Reactor 单线程 / 单 Reactor 多线程 / 主从 Reactor 多线程
- Netty 的线程模型：bossGroup / workerGroup / 业务线程池的分工与坑（别在 eventLoop 里写阻塞代码）
- Tomcat 的 NIO 模型对照：Acceptor / Poller / Executor，与 Netty 的异同
- C10K 问题与 C1000K 的条件（内存、fd 上限、端口）

## 三、动手实验（学习时必须真跑）

- 用 Java BIO 写一个 echo server，用脚本建立 1000 / 5000 / 10000 个连接，记录服务端线程数与内存占用
- 用 Netty 重写同样的 echo server（主从 Reactor），重复实验对比
- 用 ss -s 与 `/proc/<pid>/status` 观察两种模型的连接与线程数量

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能画出主从 Reactor 的线程分工图，说清 acceptor / worker / eventLoop / 业务线程池各干什么
- [ ] 能用数据说出 BIO 与 NIO 在万连接场景下的内存差距（数量级）
- [ ] 能解释为什么 eventLoop 里不能写阻塞代码、业务逻辑该扔给谁

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Spring Boot 3.x / MySQL 8.0 / Redis 8.x / RocketMQ 5.3.x / Kafka 4.3 / ShardingSphere 5.5.3）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
