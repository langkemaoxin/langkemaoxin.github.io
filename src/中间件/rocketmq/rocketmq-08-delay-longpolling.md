---
title: "延迟消息与长轮询机制"
sidebarGroup: "RocketMQ"
shortTitle: "08 延迟与长轮询"
order: 8
date: 2026-09-23
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 8/10 篇**  
> 上一篇：[《持久化与刷盘》](/中间件/rocketmq/rocketmq-07-persistence) · 下一篇：[《零拷贝与顺序写》](/中间件/rocketmq/rocketmq-09-zerocopy)

---

## 开头：订单 30 分钟未支付自动取消，Broker 怎么做到？

客户端篇讲过 `setDelayTimeLevel` 与 `setDeliverTimeMs`；Broker 侧并非简单 sleep，而是 **系统 Topic + 后台扫描 +（可选）时间轮**。同时，Push 消费在「队列暂空」时靠 **长轮询** 挂起 Pull 请求，避免空轮询浪费带宽。本篇读 `ScheduleMessageService`、`TimerMessageStore` 与 `PullRequestHoldService` 源码。

---

## 一、延迟消息两种机制

| 类型 | 客户端 | Broker 存储 |
|------|--------|-------------|
| 固定级别 | `setDelayTimeLevel(n)`，18 级 | `SCHEDULE_TOPIC_XXXX`，queueId=级别 |
| 指定时间 | `setDeliverTimeMs(ts)` | `rmq_sys_wheel_timer`，queueId=0 |

入口钩子：`HookUtils.handleScheduleMessage` → `transformDelayLevelMessage` / `transformTimerMessage`。

固定级别会 **保留真实 Topic/QueueId** 到 properties（`PROPERTY_REAL_TOPIC` 等），再改写为系统 Topic。

![延迟消息 Hook 入口](/中间件/rocketmq/42/p31-01.png)

![transformDelayLevelMessage](/中间件/rocketmq/42/p32-01.png)

---

## 二、固定级别：ScheduleMessageService

- 仅 **Master** 运行（Slave 关闭）；主从切换时 `changeScheduleServiceStatus` + CAS 保证幂等启动  
- `DeliverDelayedMessageTimerTask` 约 **1s** 执行 `executeOnTimeup`  
- 扫描 `SCHEDULE_TOPIC_XXXX` 对应 **ConsumeQueue**（理解 20B 索引结构后这段代码才可读）  
- 未到点：更新 offset，调度下次扫描  
- 到点：`lookMessageByOffset` 取 CommitLog 正文 → `messageTimeUp` → `syncDeliver` / `asyncDeliver` 投回 **真实 Topic**  

![ScheduleMessageService 扫描流程](/中间件/rocketmq/42/p33-01.png)

![executeOnTimeup 核心逻辑](/中间件/rocketmq/42/p34-01.png)

![延迟消息整体数据流](/中间件/rocketmq/42/p34-02.png)

本质：Broker **像消费者一样** 读系统 Queue，到期再 **作为生产者** 写回业务 Topic——扩展自定义定时能力的范本。

---

## 三、指定时间：TimerMessageStore + 时间轮

`timerWheelEnable=true` 时加载 `timerMessageStore`，`initService` 启动多组线程：

- `TimerEnqueueGet/PutService`  
- `TimerDequeueWarm/Get/PutMessageService`  
- `TimerFlushService`  

配合 `enqueuePutQueue`、`dequeueGetQueue`、`dequeuePutQueue` 与 **TimerWheel**、**TimerLog**。

### 时间轮要点

1. **Slot 数组** = 时钟刻度；消息索引进 slot，正文在 buffer  
2. **currReadTimeMs / currWriteTimeMs** 像指针扫 slot  
3. 默认约 **7 天 × 86400 slot**，精度 **1s**（API 可设毫秒，执行粒度秒级）  
4. 超轮次消息用 **round** 字段区分  

可独立抽成定时组件（类 Quartz/XXL-JOB 思想）。

![TimerMessageStore 线程与队列](/中间件/rocketmq/42/p35-01.png)

![时间轮结构示意](/中间件/rocketmq/42/p35-02.png)

---

## 四、长轮询（Long Polling）

问题：Push 模式底层是 pull；若 Broker 无消息，频繁空 pull 浪费资源，且新消息不能及时触达。

机制：

1. Consumer Pull 无消息 → **不立即空响应**，请求进入 `PullRequestHoldService` 缓存  
2. Producer 写入 / 后台线程扫描 → 匹配挂起请求，立即返回数据  

入口：`PullMessageProcessor#processRequest`；新版本将检查逻辑更多放到 **PullRequestHoldService 后台线程**（相对「仅在写入时检查」的优化）。

![长轮询请求挂起](/中间件/rocketmq/42/p36-01.png)

（流程图见源码笔记：Producer doReput → HoldService 唤醒 waiting pull）

---

## 五、本章小结

- **固定延迟**：18 队列 + ConsumeQueue 扫描 + 回写真实 Topic  
- **定时投递**：时间轮 + 多线程流水线  
- **长轮询**：用挂起 Pull 换实时性与带宽  

理解延迟实现 **强依赖 ConsumeQueue 20B 索引**——读 store 模块前先回顾第 7 篇。下一篇从 **mmap / sendfile** 理解 CommitLog 高性能写读。
