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

24 篇文章走下来，并发编程不是「会开线程」就够——要从 **硬件缓存** 理解可见性，从 **JMM 三特性** 理解 bug 根源，再选 **锁 / CAS / 容器 / 队列 / 线程池** 解决问题。本篇不重复每节课细节，只串主线、指回原文，并收束性能篇剩余图示。

---

## 一、硬件层：CPU 缓存与一致性

![CPU 高速缓存概念](/并发编程/performance/17/p01-01.png)

多核各自缓存，读主存慢 → 局部性原理（时间/空间）。缓存一致性靠 **MESI** 等协议 + 总线窥探；CAS 走缓存锁定而非总线锁。

![CPU 多核缓存架构](/并发编程/performance/17/p02-page.png)

![缓存一致性与 MESI](/并发编程/performance/17/p03-page.png)

**伪共享**：不同变量挤在同一 Cache Line，一线程写导致他核缓存失效。对策：缓存行填充、`@Contended`、ThreadLocal。

![伪共享与 ArrayBlockingQueue](/并发编程/performance/17/p05-page.png)

![避免伪共享方案](/并发编程/performance/17/p06-page.png)

→ 详见 [《CPU 缓存架构与多核可见性问题》](/并发编程/basics/juc-05-cpu-cache)

---

## 二、JMM：原子性、可见性、有序性

并发 Bug 源头是三大特性被打破：

![并发三大特性](/并发编程/basics/16/p02-page.png)

| 特性 | 典型问题 | 手段 |
|------|----------|------|
| **原子性** | `i++` 丢更新 | synchronized、Lock、CAS |
| **可见性** | 一线程改 flag 另一线程看不见 | volatile、synchronized |
| **有序性** | 指令重排导致诡异结果 | volatile、happens-before |

![原子性案例分析](/并发编程/basics/16/p03-page.png)

![可见性案例分析](/并发编程/basics/16/p04-page.png)

![volatile 保证可见性](/并发编程/basics/16/p05-page.png)

![有序性与 happens-before](/并发编程/basics/16/p06-page.png)

![JMM 内存模型](/并发编程/basics/16/p07-page.png)

![synchronized 与 happens-before](/并发编程/basics/16/p08-page.png)

![final 域重排序规则](/并发编程/basics/16/p09-page.png)

![双重检查锁定](/并发编程/basics/16/p11-page.png)

![volatile 禁止重排序](/并发编程/basics/16/p12-page.png)

![JMM 小结](/并发编程/basics/16/p13-page.png)

→ 详见 [《原子性、可见性、有序性与 JMM》](/并发编程/basics/juc-04-jmm)

---

## 三、线程与协作（并发基础）

- [为何学并发](/并发编程/basics/juc-01-why-concurrency)：线程、等待/通知
- [wait/notify](/并发编程/basics/juc-02-wait-notify)：管程、虚假唤醒
- [设计模式](/并发编程/basics/juc-03-design-patterns)：两阶段终止、保护性暂停

这些是理解 **BlockingQueue 的 Condition**、**线程池 worker 阻塞** 的前置知识。

---

## 四、异步与线程封闭

- [Future / Callable](/并发编程/async/juc-06-future)：异步结果
- [CompletableFuture](/并发编程/async/juc-07-completable-future)：编排多路异步
- [ThreadLocal](/并发编程/async/juc-08-threadlocal)：线程内隔离，注意内存泄漏

异步解决「等 I/O」；ThreadLocal 解决「同线程上下文传递」，与线程池联用时需 `TransmittableThreadLocal` 等增强。

---

## 五、锁与同步体系

![总线锁定与缓存锁定](/并发编程/performance/17/p07-page.png)

![MESI 状态转换](/并发编程/performance/17/p08-page.png)

| 层次 | 文章 | 要点 |
|------|------|------|
| 无锁 | [CAS](/并发编程/lock/juc-09-cas)、[Atomic](/并发编程/lock/juc-10-atomic) | ABA、自旋开销 |
| 内置锁 | [synchronized](/并发编程/lock/juc-11-synchronized) | 偏向/轻量/重量、锁升级 |
| 显式锁 | [JUC 锁实战](/并发编程/lock/juc-12-juc-locks) | ReentrantLock、读写锁 |
| 框架 | [AQS](/并发编程/lock/juc-13-aqs-reentrantlock) | 模板方法、CLH 队列 |
| 工具 | [Semaphore](/并发编程/lock/juc-14-semaphore)、[CDL/Barrier](/并发编程/lock/juc-15-latch-barrier) | 限流、栅栏 |

**选型**：竞争低、短临界区 → CAS/Atomic；需条件队列 → Lock；资源计数 → Semaphore；等多方完成 → CountDownLatch / CyclicBarrier。

---

## 六、并发容器与阻塞队列

![并发容器与队列在架构中的位置](/并发编程/performance/17/p09-page.png)

- [并发容器](/并发编程/collections/juc-16-concurrent-collections)：`ConcurrentHashMap`、`CopyOnWriteArrayList`
- [BlockingQueue 体系](/并发编程/collections/juc-17-blocking-queue)：`ArrayBlockingQueue`、`LinkedBlockingQueue`、`SynchronousQueue`
- [队列选型](/并发编程/collections/juc-18-queue-selection)：`PriorityBlockingQueue`、`DelayQueue`、五维选型

容器解决 **共享数据结构**；队列解决 **生产消费解耦**——线程池的 `workQueue` 就是后者。

---

## 七、线程池

- [参数与流程](/并发编程/pool/juc-19-thread-pool)：core/max/queue、execute 四步、ctl 状态
- [拒绝与故障](/并发编程/pool/juc-20-reject-pitfalls)：四种策略、shutdown、线上 Case
- [动态参数](/并发编程/pool/juc-21-dynamic-params)：setter、Nacos、DynamicTp
- [ForkJoinPool](/并发编程/pool/juc-22-forkjoin)：分治、工作窃取

**口诀**：显式 ThreadPoolExecutor + 有界队列 + 监控拒绝；IO 用普通池，CPU 分治用 ForkJoin。

---

## 八、性能扩展：Disruptor

当 BlockingQueue 的锁与伪共享成为瓶颈，考虑 Disruptor：

![Disruptor 设计总览](/并发编程/performance/17/p10-page.png)

![RingBuffer 与等待策略](/并发编程/performance/17/p11-page.png)

![Log4j2 异步日志](/并发编程/performance/17/p12-page.png)

![Disruptor 构造器参数](/并发编程/performance/17/p13-page.png)

![Disruptor 单生产者单消费者流程](/并发编程/performance/17/p14-page.png)

![Disruptor Demo 主程序](/并发编程/performance/17/p15-page.png)

![多消费者 handleEventsWith](/并发编程/performance/17/p16-page.png)

![多生产者多消费者模式](/并发编程/performance/17/p17-page.png)

![DisruptorDemo2 多生产者示例](/并发编程/performance/17/p18-page.png)

→ 详见 [《Disruptor 高性能内存队列实战》](/并发编程/performance/juc-23-disruptor)

---

## 九、一张总览图（心智模型）

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

并发编程的学习曲线在于 **层次多**：写业务时先在 JMM 层判断要不要 volatile 或锁；共享 Map 用 ConcurrentHashMap；任务调度用线程池并配好有界队列；延迟敏感队列考虑 Disruptor。按侧栏 24 篇顺序查漏补缺，结合自己项目里的线程池配置、共享变量和队列选型做一轮体检，比死记 API 更有价值。

感谢阅读本专栏。
