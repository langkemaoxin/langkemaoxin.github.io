---
title: "Zookeeper 元数据与 Controller Broker 选举"
sidebarGroup: "Kafka"
shortTitle: "07 ZK 与 Controller"
order: 7
date: 2026-09-11
category: "中间件"
tag:
  - "Kafka"
  - "中间件"
  - "消息队列"
---

> **Kafka 系列 · 第 7/11 篇**  
> 下一篇预告：[《Leader Partition、故障恢复与 HW/Epoch》](/中间件/kafka/kafka-08-leader-hw)

---

## 开头：状态在 ZK，日志在 Broker

Kafka 为「三高」做了大量设计。理解集群有两条主线：**Zookeeper 里的状态元数据**，以及 **Broker 本地日志文件**。本篇从 ZK 入手：哪些信息必须集群共识，Controller 如何产生。

Kafka 把**各 Broker 的差异状态**放 ZK，**无状态的消息数据**放本地 log——状态分离带来良好的水平扩展性。

---

## 一、Zookeeper 存什么

![Kafka 集群结构：Controller、Leader Partition 等状态信息](/中间件/kafka/27/p03-01.png)

两大核心状态：

1. **Controller Broker** —— 管理集群分区与副本状态。
2. **Leader Partition** —— 每个 Partition 副本组中负责客户端 IO 的主副本。

![Zookeeper 上 Kafka 相关 znode 树：/brokers、/controller、/topics 等](/中间件/kafka/27/p04-01.png)

常见路径：

| 路径 | 内容 |
|------|------|
| `/brokers/ids/{id}` | 存活 Broker 注册（临时节点） |
| `/brokers/topics/{topic}` | Topic 分区分配 |
| `/controller` | 当前 Controller 的 brokerId |

Broker 启动时在 `/brokers/ids` 注册**临时节点**；进程停则节点消失。可用 IDEA Zookeeper 插件或 `zkCli.sh` 查看。

ZK 基于 **CP**，保证强一致；**Watcher** 减少 Broker 轮询。

---

## 二、Controller 选举机制

集群工作前需选举 **Controller**：

1. Broker 启动时尝试在 ZK 创建 **`/controller` 临时节点**，写入自身 `brokerId`（含 version、timestamp 等 JSON）。
2. **只有一个** Broker 能创建成功 → 成为 Controller。
3. 失败者监听 `/controller`；节点删除（心跳超时）后重新抢占。
4. 新 Controller 的 **version** 递增。

Controller 职责包括：

- 监听 `/brokers/ids` —— Broker 上下线
- 监听 `/brokers/topics` —— Topic/Partition 变更
- 监听 `/admin/delete_topics` —— 删 Topic
- 将元数据推送给其他 Broker

---

## 三、Leader Partition 概念铺垫

创建 Topic 时指定 `--partitions` 与 `--replication-factor`。每组副本需选举 **Leader Partition** 对接客户端并优先写入，Follower 再同步。

基础术语：

| 术语 | 含义 |
|------|------|
| **AR** | Assigned Replicas，全部分配副本 |
| **ISR** | 与 Leader 保持同步的存活 Follower 子集 |
| **OSR** | 从 ISR 踢出的滞后副本 |

Follower 超时（`replica.lag.time.max.ms`，默认 30s）会移出 ISR。`kafka-topics.sh --describe` 中的 Replicas 列即 AR，Isr 列即 ISR。

Leader 选举、故障恢复、HW/Epoch 见下一篇。

---

## 小结

- **ZK = 集群大脑**：Broker 注册、Controller 锁、Topic 元数据。
- **Controller = 抢 `/controller` 临时节点**，单点职责由 ZK 协调 failover。
- **Partition Leader** 在副本组内选举，与 Controller 是两层不同角色。
