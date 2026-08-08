---
title: "Kafka 日志与索引——log、index、timeindex"
sidebarGroup: "Kafka"
shortTitle: "09 日志与索引"
order: 9
date: 2026-09-13
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 9/11 篇**  
> 下一篇预告：[《顺序写、零拷贝与消费进度管理》](/中间件/kafka/kafka-10-io-offset)

---

## 开头：高性能的秘密在磁盘上的几个文件

上一篇保证 Partition 内一致；本篇看每个 Broker **如何存、如何查**。Kafka 的高吞吐很大程度来自 **append-only log + 稀疏索引 + 分段文件**。从 `log.dirs` 目录里的文件名就能读出大半存储设计。

---

## 一、目录与文件类型

![log.dirs 下 Topic-Partition 目录及 .log、.index、.timeindex 等文件](/中间件/kafka/28/p03-01.png)

`server.properties` 中 `log.dirs` 指定数据根目录。每个 **Partition** 一个子目录，核心文件：

| 文件 | 作用 |
|------|------|
| **`*.log`** | 消息主体，追加写，单段默认 1GB（`log.segment.bytes`） |
| **`*.index`** | 以 **Offset** 为键的稀疏索引 |
| **`*.timeindex`** | 以 **时间戳** 为键的索引 |
| `partition.metadata` | Partition 所属 cluster/Topic |
| `leader-epoch-checkpoint` | Epoch 机制（见上篇） |

文件名前缀为**该段第一条消息的 Offset**。段写满开新文件，便于 mmap 映射。

查看工具：

```bash
./kafka-dump-log.sh --files /app/kafka/logs/disTopic-0/00000000000000000000.timeindex
./kafka-dump-log.sh --files /app/kafka/logs/disTopic-0/00000000000000000000.index
./kafka-dump-log.sh --files /app/kafka/logs/disTopic-0/00000000000000000000.log
```

---

## 二、log 追加写

- 只允许**追加**，不支持原地改删。
- **最大段文件**正在写入，历史段只读。
- 段大小固定，便于文件映射与顺序读。

---

## 三、index 与 timeindex

![稀疏索引：相对 Offset + 物理 position 指向 log 段内位置](/中间件/kafka/28/p05-01.png)

- 索引记录**相对 Offset**（段内从 0 起）；**绝对 Offset = 文件名前缀 + 相对 Offset**。
- 每写入约 **40KB**（`log.index.interval.bytes`，默认 4096）建一条 index 项——类似跳表，加速定位。
- **timeindex** 支持按时间清理、按 timestamp 消费。

Consumer 指定 `--offset` 或按时间点消费，依赖这套索引。

---

## 四、文件清理

| 参数 | 说明 |
|------|------|
| `log.retention.check.interval.ms` | 过期检查间隔（默认 5 分钟） |
| `log.retention.hours` / `minutes` / `ms` | 保留时长（默认 168 小时） |
| `log.cleanup.policy` | `delete` 删段；`compact` 按 Key 压缩保留最新 |
| `log.retention.bytes` | 总大小上限（-1 不限） |

过期判断以 **timeindex 中最大时间戳** 为准。compact 会丢同 Key 旧版本。

---

## 五、消费进度：__consumer_offsets

![内置 Topic __consumer_offsets 默认 50 个 Partition，存各 Group 的 Offset](/中间件/kafka/28/p07-01.png)

Kafka 用内置 Topic **`__consumer_offsets`**（默认 50 分区）存消费进度；早期也写 ZK，现已迁到 Broker——减轻 ZK 压力，也为 KRaft 铺路。

![Offset 等信息也曾同步记录在 Zookeeper（旧版本/辅助视图）](/中间件/kafka/28/p08-01.png)

可读系统 Topic 验证：

```bash
bin/kafka-console-consumer.sh --topic __consumer_offsets \
  --bootstrap-server worker1:9092 \
  --formatter "kafka.coordinator.group.GroupMetadataManager\$OffsetsMessageFormatter" \
  --from-beginning
```

输出形如：`[group,topic,partition]::OffsetAndMetadata(offset=6, ...)`  
Key = `groupId + topic + partition`，Value = offset 等元数据。消费者指定 `--offset` 消费时，Broker 会更新对应记录。

`exclude.internal.topics` 默认 true，避免业务误订阅内部 Topic。

---

## 小结

- 存储模型：**分段 log + 双索引 + Epoch 文件**。
- 清理策略：**时间/大小 delete** 或 **compact**。
- 消费进度：**__consumer_offsets**（主）+ 客户端 commit 驱动。

下一篇讲 **顺序写、零拷贝、刷盘** 如何把这些文件跑得更快。
