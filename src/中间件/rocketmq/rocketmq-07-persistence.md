---
title: "消息持久化——CommitLog、刷盘与主从复制"
sidebarGroup: "RocketMQ"
shortTitle: "07 持久化与刷盘"
order: 7
date: 2026-09-22
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 7/10 篇**  
> 上一篇：[《收发与负载均衡源码》](/中间件/rocketmq/rocketmq-06-send-consume-lb) · 下一篇：[《延迟与长轮询》](/中间件/rocketmq/rocketmq-08-delay-longpolling)

---

## 开头：Broker 磁盘上到底有哪些文件？

Producer 的 `SendResult` 只表示 Broker 接受了消息；真正决定 **不丢、可查、可过期** 的是 `store` 模块。RocketMQ 用 **CommitLog 统一顺序写 + ConsumeQueue/IndexFile 索引**，这是相对 Kafka「按 Partition 分文件」在多 Topic 场景下的核心优势。本篇梳理落盘结构、写入锁、刷盘、主从复制与文件清理。

---

## 一、持久化文件结构

默认 `${user_home}/store`（`broker.conf` 可改）：

| 路径/文件 | 作用 |
|-----------|------|
| **commitlog/** | 所有 Topic 消息顺序追加，单文件 1G，名=首条消息 offset |
| **consumequeue/** | 每 MessageQueue 一个目录，20B/条索引：物理 offset + size + tagHash |
| **index/** | 按 Key/时间检索（控制台轨迹等） |
| **checkpoint/** | 各文件最后刷盘时间 |
| **config/*.json** | Topic、消费进度等元数据 |
| **abort** | 正常关闭删除；异常宕机残留 → 触发恢复 |

![store 目录结构](/中间件/rocketmq/42/p22-01.png)

设计要点：**不先找 Partition 文件，直接 append CommitLog** → 多 Topic 下寻址开销小（对比 Kafka）。

![CommitLog / ConsumeQueue / Index 关系](/中间件/rocketmq/42/p24-01.png)

---

## 二、CommitLog 写入

入口：`DefaultMessageStore.asyncPutMessage` ← `SendMessageProcessor`。

### 1. 加锁

- `topicQueueLock`：按 MessageQueue 顺序写  
- `putMessageLock`：全局同时仅一线程写入；可选 **自旋锁**（竞争少用）或 **ReentrantLock**（高竞争）  

### 2. 顺序写

```java
result = mappedFile.appendMessage(msg, appendMessageCallback, putMessageContext);
```

`DefaultMappedFile.appendMessage` 从文件尾追加，`doAppend` 定义单条消息二进制 layout（`CommitLog.calMsgLength` 计算变长结构）。

### 3. 刷盘与 HA

写入后：`handleDiskFlushAndHA(putMessageResult, msg, ...)` —— **diskFlush** + **主从复制**。

![CommitLog 写入与 mappedFile](/中间件/rocketmq/42/p25-01.png)

---

## 三、同步刷盘 vs 异步刷盘

配置 `flushDiskType`：`SYNC_FLUSH` / `ASYNC_FLUSH`（默认异步）。

`CommitLog.handleDiskFlush`：

**同步**：`GroupCommitService` + `GroupCommitRequest`，`waitStoreMsgOK` 时 future 等待刷盘完成（默认超时 5s）。并非「每条消息立刻 fsync」，后台仍有 batch 与休眠——但比纯异步更安全。

**异步**：`CommitRealTimeService` 按 `commitIntervalCommitLog`（默认 200ms）周期 `mappedFileQueue.commit()`，再 `wakeUpFlush()`。

思考：同步刷盘仍可能有 PageCache 窗口期断电风险；刷盘频率需在 **安全 vs IO 压力** 间权衡（对比 Kafka `log.flush.interval.ms` 能否设为 1）。

![同步刷盘 GroupCommit 双缓冲](/中间件/rocketmq/42/p29-01.png)

RocketMQ 用自研 `CountDownLatch2`（可 reset）协调后台刷盘线程，值得 JUC 学习者一看。

---

## 四、CommitLog 主从复制

`DefaultHAService.start()`：

- `acceptSocketService` —— Master/Slave TCP  
- `groupTransferService` —— 同步复制（读写双 Buffer）  
- `haClient` —— Slave 侧  

高性能场景甚至用 **Java NIO** 而非完整 Netty 栈做 HA 传输。5.x 还扩展了 Controller 选主相关逻辑。

---

## 五、ConsumeQueue 与 IndexFile 分发

`DefaultMessageStore.start()` 启动 `ReputMessageService`，约 **1ms** 扫描 CommitLog 新增，`doDispatch` →  

- `CommitLogDispatcherBuildConsumeQueue`  
- `CommitLogDispatcherBuildIndex`  

异常宕机可能导致 CommitLog 与索引不一致；`DefaultMessageStore.load()` 有恢复逻辑。

**ConsumeQueue 单元**（`CQ_STORE_UNIT_SIZE=20`）：

```
msgPhyOffset(8) + msgSize(4) + msgTagCode(8)
```

Tag hash 与索引同存 → **Tag 过滤极快**。

**IndexFile**：header + slot + index，支持 Key/时间查询；单文件固定大小。

---

## 六、过期文件删除

定时任务（约 60s）：

- `CleanCommitLogService` / `CleanConsumeQueueService`  
- 默认保留 **72 小时**（`fileReservedTime`，常见配置 3 天）  
- `deleteWhen` 触发时刻 + 磁盘使用率阈值（默认 72%，范围 10–95%）  
- 删 ConsumeQueue/Index 时与 CommitLog **最小 offset 对齐**  

**未消费消息也可能被删**——长期堆积需业务侧处理，不能假设 Broker 会等消费者。

---

## 七、本章小结

RocketMQ 持久化的「三高」抓手：

1. **CommitLog 顺序写 + mmap**（下篇零拷贝）  
2. **异步/同步刷盘** 平衡安全与吞吐  
3. **Reput 异步建索引** 不阻塞主写入路径  

下一篇：**延迟消息**（ScheduleTopic + 时间轮）与 **长轮询**（Pull 请求挂起）。
