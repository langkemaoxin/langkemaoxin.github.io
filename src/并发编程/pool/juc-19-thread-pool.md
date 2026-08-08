---
title: "ThreadPoolExecutor 参数与执行流程"
sidebarGroup: "线程池"
shortTitle: "01 ThreadPoolExecutor"
order: 1
date: 2026-11-25
category: "并发编程"
tag:
  - "并发编程"
  - "线程池"
---

> **线程池 · 第 1/4 篇**  
> 下一篇：[《线程池拒绝策略与常见故障》](/并发编程/pool/juc-20-reject-pitfalls)

---

## 开头：为什么 Tomcat 要管线程而不是随手 new

每来一个 HTTP 请求就 `new Thread`，创建销毁和调度开销会拖垮系统。线程池把线程复用起来：任务到达立刻有工人处理，峰值时排队或扩容，低谷时回收多余线程——Tomcat、异步网关、批处理框架都依赖这套机制。

![线程池简介](/并发编程/pool/13a/p01-01.png)

---

## 一、线程池的优势

- **降低资源消耗**：复用线程，减少创建销毁
- **提高响应速度**：任务到达即可执行
- **提高可管理性**：统一分配、调优、监控
- **扩展能力**：ScheduledThreadPoolExecutor 支持定时/周期任务

![线程池核心优势](/并发编程/pool/13a/p02-01.png)

---

## 二、创建线程池：推荐 ThreadPoolExecutor

![ThreadPoolExecutor 构造参数](/并发编程/pool/13a/p03-01.png)

| 参数 | 含义 |
|------|------|
| corePoolSize | 核心线程数，默认 0 线程，来任务才创建 |
| maximumPoolSize | 队列满后最多扩到的线程数 |
| keepAliveTime + unit | 非核心线程空闲超时回收 |
| workQueue | 任务队列（有界/无界/同步） |
| threadFactory | 创建线程的工厂 |
| handler | 拒绝策略 |

**队列选型**：

- `ArrayBlockingQueue`：有界，满则开非核心线程
- `LinkedBlockingQueue`：默认无界，易 OOM
- `SynchronousQueue`：不缓冲，直接移交

![队列类型对比](/并发编程/pool/13a/p04-page.png)

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    5, 10, 60L, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(100),
    new ThreadPoolExecutor.AbortPolicy()
);
```

![ThreadPoolExecutor 创建示例](/并发编程/pool/13a/p05-01.png)

### 为什么不推荐 Executors

阿里巴巴开发手册要求显式使用 `ThreadPoolExecutor`：`newFixedThreadPool` 用无界 `LinkedBlockingQueue`；`newCachedThreadPool` 最大线程数无限——流量异常时风险很大。

![Executors 不推荐使用](/并发编程/pool/13a/p06-page.png)

---

## 三、提交与关闭

- **execute(Runnable)**：无返回值
- **submit**：返回 `Future`
- **invokeAll / invokeAny**：批量任务

![提交任务与 invokeAll](/并发编程/pool/13a/p07-01.png)

![invokeAll 示例](/并发编程/pool/13a/p08-page.png)

![定时延时任务 ScheduledThreadPoolExecutor](/并发编程/pool/13a/p09-page.png)

**关闭**：

- `shutdown()`：不接新任务，队列任务执行完
- `shutdownNow()`：中断工作线程，返回队列剩余任务
- `awaitTermination()`：等待终止

![shutdown 与 shutdownNow 对比](/并发编程/pool/13a/p10-page.png)

---

## 四、参数设计思路

![核心线程数设计](/并发编程/pool/13a/p11-page.png)

**核心线程数**：按任务耗时与 QPS 估算。例：单任务 0.1s，每秒 100 任务 → 约需 10 核心线程（二八原则留余量）。

**队列长度**：`核心线程数 / 单任务耗时 × 2`，上例约 200。

**最大线程数**：`(最大任务数 - 队列长度) × 单任务耗时`，上例 `(1000-200)×0.1=80`。

![任务队列与最大线程数](/并发编程/pool/13a/p12-01.png)

---

## 五、execute 执行流程

![execute 三步流程概览](/并发编程/pool/13a/p13-01.png)

1. 工作线程数 < corePoolSize → 创建核心线程执行
2. 否则尝试入队；入队成功且 worker=0 → 补一个非核心线程
3. 入队失败 → 创建非核心线程；仍失败 → **拒绝策略**

![execute 源码流程图](/并发编程/pool/13a/p14-page.png)

**要点**：

- 只要线程数 < corePoolSize，**即使有空闲核心线程也会新建**（非公平）
- 线程池必须配阻塞队列：worker 从队列取任务，空队列时阻塞等待

![线程池为何必须阻塞队列](/并发编程/pool/13a/p15-01.png)

---

## 六、五种状态与 ctl

`AtomicInteger ctl` 高 3 位表状态，低 29 位表工作线程数：

| 状态 | 含义 |
|------|------|
| RUNNING | 接任务并处理队列 |
| SHUTDOWN | 不接新任务，处理队列 |
| STOP | 不接新任务，不处理队列，中断执行中任务 |
| TIDYING | 线程清空，调 terminated() |
| TERMINATED | terminated() 执行完毕 |

![ctl 状态与工作线程数](/并发编程/pool/13a/p16-page.png)

![五种状态二进制表示](/并发编程/pool/13a/p17-page.png)

![runStateOf 与 workerCountOf](/并发编程/pool/13a/p18-page.png)

![状态比较与 CAS 方法](/并发编程/pool/13a/p19-page.png)

![五种状态语义](/并发编程/pool/13a/p20-page.png)

---

## 七、execute 源码与 addWorker

![execute 方法源码](/并发编程/pool/13a/p21-page.png)

![addWorker 核心逻辑](/并发编程/pool/13a/p23-page.png)

addWorker 四步：判断线程数上限 → ctl+1 → 构造 Worker 加入 workers → `thread.start()`。

![Worker 构造与 runWorker](/并发编程/pool/13a/p24-page.png)

worker 循环：`getTask()` 从队列取任务 → 加锁执行 → 异常时 `processWorkerExit` 并可能补新 worker 维持核心数。

![runWorker 与 getTask](/并发编程/pool/13a/p25-page.png)

---

## 小结

- 用 **ThreadPoolExecutor** 显式指定有界队列和拒绝策略
- 执行顺序：核心线程 → 队列 → 非核心线程 → 拒绝
- 下一篇聚焦 **拒绝策略**、Executors 陷阱与线上故障案例
