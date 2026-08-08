---
title: "并发编程专栏收束——从 JMM 到队列与线程池"
sidebarGroup: "性能扩展"
shortTitle: "02 系列收束"
order: 2
date: 2026-11-30
category: "并发编程"
tag:
  - "并发编程"
---

> **性能扩展 · 第 2/2 篇**  
> 本系列完结。建议按侧栏顺序回顾：[并发基础](/并发编程/basics/juc-01-why-concurrency) → [异步编程](/并发编程/async/juc-06-future) → [锁与同步](/并发编程/lock/juc-09-cas) → [并发容器](/并发编程/collections/juc-16-concurrent-collections) → [线程池](/并发编程/pool/juc-19-thread-pool)

---

## 开头：把碎片拼成一张地图

24 篇文章走下来，并发编程不是「会开线程」就够——要从 **硬件缓存** 理解可见性，从 **JMM 三特性** 理解 bug 根源，再选 **锁 / CAS / 容器 / 队列 / 线程池** 解决问题。本篇不重复每节课细节，只串主线、指回原文。

![CPU 高速缓存概念](/并发编程/performance/17/p01-01.png)

---

## 一、硬件层 → JMM

多核各自缓存，读主存慢 → 局部性原理。缓存一致性靠 **MESI** 等协议；CAS 走缓存锁定。**伪共享**：不同变量挤在同一 Cache Line，一线程写导致他核缓存失效——对策是缓存行填充、`@Contended`、ThreadLocal。

→ [《CPU 缓存架构与多核可见性问题》](/并发编程/basics/juc-05-cpu-cache)

并发 Bug 源头是 JMM 三大特性被打破：

| 特性 | 典型问题 | 手段 |
|------|----------|------|
| **原子性** | `i++` 丢更新 | synchronized、Lock、CAS |
| **可见性** | 一线程改 flag 另一线程看不见 | volatile、synchronized |
| **有序性** | 指令重排导致诡异结果 | volatile、happens-before |

→ [《原子性、可见性、有序性与 JMM》](/并发编程/basics/juc-04-jmm)

---

## 二、线程协作与异步

- [为何学并发](/并发编程/basics/juc-01-why-concurrency)：线程、等待/通知
- [wait/notify](/并发编程/basics/juc-02-wait-notify)：管程、虚假唤醒
- [设计模式](/并发编程/basics/juc-03-design-patterns)：两阶段终止、保护性暂停
- [Future / Callable](/并发编程/async/juc-06-future)：异步结果
- [CompletableFuture](/并发编程/async/juc-07-completable-future)：编排多路异步
- [ThreadLocal](/并发编程/async/juc-08-threadlocal)：线程内隔离，注意内存泄漏

这些是理解 BlockingQueue 的 Condition、线程池 worker 阻塞的前置知识。

---

## 三、锁与同步体系

| 层次 | 文章 | 要点 |
|------|------|------|
| 无锁 | [CAS](/并发编程/lock/juc-09-cas)、[Atomic](/并发编程/lock/juc-10-atomic) | ABA、自旋开销 |
| 内置锁 | [synchronized](/并发编程/lock/juc-11-synchronized) | 偏向/轻量/重量、锁升级 |
| 显式锁 | [JUC 锁实战](/并发编程/lock/juc-12-juc-locks) | ReentrantLock、读写锁 |
| 框架 | [AQS](/并发编程/lock/juc-13-aqs-reentrantlock) | 模板方法、CLH 队列 |
| 工具 | [Semaphore](/并发编程/lock/juc-14-semaphore)、[CDL/Barrier](/并发编程/lock/juc-15-latch-barrier) | 限流、栅栏 |

**选型**：竞争低、短临界区 → CAS/Atomic；需条件队列 → Lock；资源计数 → Semaphore；等多方完成 → CountDownLatch / CyclicBarrier。

---

## 四、并发容器与阻塞队列

- [并发容器](/并发编程/collections/juc-16-concurrent-collections)：`ConcurrentHashMap`、`CopyOnWriteArrayList`
- [BlockingQueue 体系](/并发编程/collections/juc-17-blocking-queue)：`ArrayBlockingQueue`、`LinkedBlockingQueue`、`SynchronousQueue`
- [队列选型](/并发编程/collections/juc-18-queue-selection)：`PriorityBlockingQueue`、`DelayQueue`、五维选型

容器解决 **共享数据结构**；队列解决 **生产消费解耦**——线程池的 `workQueue` 就是后者。

---

## 五、线程池

- [参数与流程](/并发编程/pool/juc-19-thread-pool)：core/max/queue、execute 四步、ctl 状态
- [拒绝与故障](/并发编程/pool/juc-20-reject-pitfalls)：四种策略、shutdown、线上 Case
- [动态参数](/并发编程/pool/juc-21-dynamic-params)：setter、Nacos、DynamicTp
- [ForkJoinPool](/并发编程/pool/juc-22-forkjoin)：分治、工作窃取

**口诀**：显式 ThreadPoolExecutor + 有界队列 + 监控拒绝；IO 用普通池，CPU 分治用 ForkJoin。

---

## 六、性能扩展：Disruptor

当 BlockingQueue 的锁与伪共享成为瓶颈，考虑 Disruptor：环形数组 + 序号 + CAS + 等待策略，Log4j2 全异步日志已验证其吞吐优势。

→ [《Disruptor 高性能内存队列实战》](/并发编程/performance/juc-23-disruptor)

---

## 七、心智模型总览

```
硬件缓存/MESI → JMM(原子/可见/有序)
       ↓
  线程 + wait/notify + 设计模式
       ↓
  锁层次: CAS → synchronized → AQS → 工具类
       ↓
  数据结构: 并发容器 + BlockingQueue
       ↓
  调度: ThreadPoolExecutor / ForkJoinPool
       ↓
  极致性能: 伪共享优化 / Disruptor
```

---

## 结语

写业务时先在 JMM 层判断要不要 volatile 或锁；共享 Map 用 ConcurrentHashMap；任务调度用线程池并配好有界队列；延迟敏感队列考虑 Disruptor。按侧栏 24 篇顺序查漏补缺，结合自己项目里的线程池配置、共享变量和队列选型做一轮体检，比死记 API 更有价值。

感谢阅读本专栏。
