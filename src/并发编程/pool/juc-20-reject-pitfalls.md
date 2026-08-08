---
title: "线程池拒绝策略与常见故障"
sidebarGroup: "线程池"
shortTitle: "02 拒绝策略与坑"
order: 2
date: 2026-11-26
category: "并发编程"
tag:
  - "并发编程"
  - "线程池"
---

> **线程池 · 第 2/4 篇**  
> 上一篇：[《ThreadPoolExecutor 参数与执行流程》](/并发编程/pool/juc-19-thread-pool) · 下一篇：[《线程池参数动态化实践》](/并发编程/pool/juc-21-dynamic-params)

---

## 开头：页面接口大面积降级，往往是线程池满了

某展示接口内部用线程池并行聚合商品信息，`maximumPoolSize` 设太小，流量上来后大量 `RejectedExecutionException`，触发降级。另一类故障相反：队列设太长、最大线程数形同虚设，任务在队列里排队数秒，上游整体超时。拒绝策略和参数配置，直接决定系统是「快失败」还是「慢拖死」。

![拒绝策略触发时机](/并发编程/pool/13a/p25-page.png)

---

## 一、四种内置拒绝策略

当 `workQueue` 已满且 `workerCount >= maximumPoolSize`，触发 `handler.rejectedExecution`：

| 策略 | 行为 |
|------|------|
| **AbortPolicy**（默认） | 抛 `RejectedExecutionException` |
| **CallerRunsPolicy** | 由提交任务的线程自己执行 |
| **DiscardOldestPolicy** | 丢弃队列最旧任务，再提交新任务 |
| **DiscardPolicy** | 静默丢弃，无通知 |

也可实现 `RejectedExecutionHandler` 自定义（如打点告警、写入死信队列）。

![四种拒绝策略对比](/并发编程/pool/13a/p26-page.png)

**选型建议**：

- 需要感知失败 → AbortPolicy + 监控告警
- 允许调用方减速 → CallerRunsPolicy（注意会阻塞 Tomcat 工作线程）
- 允许丢旧保新 → DiscardOldestPolicy（实时性场景）
- 静默丢弃 → 仅用于可丢失的辅助任务

---

## 二、runWorker 与线程回收

![runWorker 执行循环](/并发编程/pool/13a/p27-page.png)

Worker 从 `firstTask` 或 `getTask()` 取任务执行。`getTask()` 中：

- 核心线程：`workQueue.take()` 无限阻塞
- 非核心线程：`poll(keepAliveTime)` 超时返回 null → 线程退出

![getTask 超时回收](/并发编程/pool/13a/p28-page.png)

**allowCoreThreadTimeOut(true)** 时核心线程也可超时回收——全部 worker 被回收后，队列来了任务会触发 addWorker 特例（SHUTDOWN 且队列非空时仍可建线程）。

![allowCoreThreadTimeOut 特例](/并发编程/pool/13a/p29-page.png)

任务执行抛未捕获异常 → `processWorkerExit` 移除 worker，但会 **补一个新 worker** 维持核心数。

![processWorkerExit 补线程](/并发编程/pool/13a/p30-page.png)

---

## 三、shutdown 与 shutdownNow

![shutdown 方法逻辑](/并发编程/pool/13a/p31-page.png)

**shutdown**：状态 → SHUTDOWN → `interruptIdleWorkers()` 只中断**已释放锁、在等任务**的线程 → 正在执行的任务跑完 → 队列剩余任务继续执行。

![interruptIdleWorkers 原理](/并发编程/pool/13a/p32-page.png)

Worker 执行任务时持有锁；只有 idle（在 getTask 阻塞或刚释放锁）时 `tryLock` 成功才会被中断。

若所有 worker 都在跑任务，shutdown 后它们跑完当前任务会继续从队列取任务——不会丢队里任务。若 worker 被中断退出，`processWorkerExit` 在 SHUTDOWN 且队列非空时会 **新建 worker** 保证队列清空。

![SHUTDOWN 下补 worker 保证队列执行完](/并发编程/pool/13a/p33-page.png)

**shutdownNow**：状态 → STOP → 中断**所有** worker → `drainQueue()` 返回未执行任务列表。执行中的任务能否停取决于任务是否响应中断。

![shutdownNow 方法](/并发编程/pool/13a/p34-page.png)

**重要**：Java 中断只改标志位，不强制杀线程。只有调用 `shutdown`/`shutdownNow` 才能真正推动线程池退出；任务内部应正确处理 `InterruptedException`。

![中断与 getTask 循环](/并发编程/pool/13a/p35-page.png)

---

## 四、常见线上故障

### Case 1：最大线程数过小 → 大量拒绝 → 接口降级

并行聚合接口流量超预期，`maximumPoolSize` 不足，AbortPolicy 抛异常触发熔断。

**修复**：按峰值 QPS 重算 core/max；或 CallerRunsPolicy 让调用线程兜底（需评估阻塞风险）。

![Case1 拒绝导致降级示意](/并发编程/pool/13a/p36-page.png)

### Case 2：队列过长 → 最大线程数失效 → 上游超时

队列设几千，任务全堆在队列里，线程数始终到不了 max，单任务排队数秒，Feign/Dubbo 上游超时。

**修复**：缩短有界队列，让任务尽早触发扩容或拒绝，而不是无限排队。

![Case2 队列堆积导致超时示意](/并发编程/pool/13a/p37-page.png)

### Case 3：Executors.newFixedThreadPool 无界队列 OOM

固定 10 线程 + 无界 LinkedBlockingQueue，生产速度持续大于消费，堆内存涨满。

**修复**：改用 ThreadPoolExecutor + 有界队列 + 合理拒绝策略。

![Executors 陷阱总结](/并发编程/pool/13a/p38-page.png)

---

## 小结

- 拒绝策略决定「满了怎么办」——默认 Abort 抛异常，生产需显式选择并监控
- shutdown 优雅收尾队列；shutdownNow 强制中断
- 队列不是越大越好：过长 = 隐藏过载，过短 = 过早拒绝
- 下一篇：**不重启服务动态调整** corePoolSize、maximumPoolSize 与队列容量
