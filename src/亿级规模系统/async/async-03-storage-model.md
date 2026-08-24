---
title: "亿级消息存储模型：CommitLog、零拷贝与页缓存"
sidebarGroup: "异步与消息"
shortTitle: "03 亿级存储模型"
order: 17
date: 2026-08-24
category: "亿级规模系统"
tag:
  - "亿级规模系统"
  - "消息队列"
  - "异步"
description: "【占位待学】亿级消息存储模型：CommitLog、零拷贝与页缓存——对应总纲阶段 3 · 单元 3.3。学完本篇应能：能画出一条消息从 producer 到盘、再到 consumer 读出的完整路径（CommitLog + ConsumeQueue）"
---

> **亿级规模系统系列 · 阶段 3 · 异步与消息 · 第 17/49 篇 · 🚧 占位待学**
> 上一篇：[《削峰填谷：MQ 的第一性原理》](/亿级规模系统/async/async-02-peak-shaving)
> 下一篇：[《顺序、重复与事务消息：消息三保难题》](/亿级规模系统/async/async-04-order-idempotent)
> 学习大纲：[《QPS 过万与亿级消息系统设计学习总纲》](/亿级规模系统/roadmap/scale-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.3**

## 一、本文要解决的问题

消息都要落盘，为什么 RocketMQ 单机还能扛十万 TPS？秘密只有三个词：顺序写、页缓存、零拷贝。这三个词是所有高性能存储（Kafka、LevelDB、WAL）的共同底座，吃透它们，你看任何存储系统的「为什么快」都会变成同构问题。

## 二、知识点清单

- 顺序写 vs 随机写：磁盘的物理原理，数量级差距（百倍以上），及它决定了什么设计
- RocketMQ CommitLog：所有队列的消息追加到同一批文件的妙处（把随机写变顺序写）与代价（读变随机）
- ConsumeQueue：CommitLog 的稀疏索引（offset + size），消费者为什么快
- 页缓存（page cache）：写缓冲 + 读缓存，mmap 与 sendfile 两种零拷贝路径
- 刷盘策略：同步刷盘 vs 异步刷盘的 RPO 与 TPS 取舍；Kafka 的 OS 页缓存依赖哲学对照
- Kafka 分区模型对照：每个分区独立文件，topic 多时随机写回归——两家的取舍差异

## 三、动手实验（学习时必须真跑）

- dd / fio 对比顺序写与随机写的吞吐（bs=4k 与 bs=1M 各测），记录数量级差距
- RocketMQ 分别配同步刷盘 / 异步刷盘，producer 压测对比 TPS 差异
- 观察 /proc/meminfo 的 cached 字段在压测前后的变化，验证页缓存的参与

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能画出一条消息从 producer 到盘、再到 consumer 读出的完整路径（CommitLog + ConsumeQueue）
- [ ] 能说清每一步为什么快（顺序写 / 页缓存 / 零拷贝各挡了什么）
- [ ] 能解释 RocketMQ 与 Kafka 存储模型的取舍差异及各自的适用面

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Spring Boot 3.x / MySQL 8.0 / Redis 8.x / RocketMQ 5.3.x / Kafka 4.3 / ShardingSphere 5.5.3）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
