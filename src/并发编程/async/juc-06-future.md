---
title: "Callable、Future 与 FutureTask"
sidebarGroup: "异步编程"
shortTitle: "01 Future 与 Callable"
order: 1
date: 2026-11-12
category: "并发编程"
tag:
  - "并发编程"
  - "Future"
---

> **异步编程 · 第 1/3 篇**  
> 下一篇：[《CompletableFuture 异步编排实战》](/并发编程/async/juc-07-completable-future)

---

## 开头：子线程算完，主线程怎么拿结果？

接口要并行查商品信息、价格、库存、图片——若串行 4×50ms，页面就慢 200ms；提交 4 个异步任务后，只需等**最慢**的那一段。Java 1.5 起 **`Callable` + `Future`** 就是为「有返回值的异步任务」准备的。

本篇讲 **Runnable 的局限**、Future API、FutureTask 用法，以及促销查询实战。

![Callable Future FutureTask 关系](/并发编程/async/02/p02-page.png)

---

## 一、Runnable 与 Callable

| 接口 | 返回值 | 受检异常 |
|------|--------|----------|
| `Runnable` | 无 | 不能声明 |
| `Callable<V>` | `V call()` | 可 `throws Exception` |

`Future` 负责：取消任务、查询是否完成、**阻塞获取结果**（`get`）。

![Runnable 与 Callable 对比](/并发编程/async/02/p03-01.png)

---

## 二、Future API

| 方法 | 说明 |
|------|------|
| `cancel(mayInterruptIfRunning)` | 取消；运行中是否中断由参数决定 |
| `isCancelled()` / `isDone()` | 状态查询 |
| `get()` | 阻塞至完成，抛 `InterruptedException` / `ExecutionException` / `CancellationException` |
| `get(timeout, unit)` | 限时等待，超时 `TimeoutException` |

底层实现类通常是 **`FutureTask`**。

![Future 核心 API](/并发编程/async/02/p04-page.png)

---

## 三、FutureTask

- 构造时传入 `Callable`（或 `Runnable + result`）。  
- 既可 `new Thread(futureTask).start()`，也可 `executor.submit(futureTask)`。  
- 生产者线程执行计算并更新状态；消费者通过 Future 接口阻塞取结果。

```java
FutureTask<Integer> futureTask = new FutureTask<>(() -> {
    int sum = 0;
    for (int i = 0; i < 100; i++) sum += i;
    return sum;
});
new Thread(futureTask).start();
System.out.println(futureTask.get());
```

![FutureTask 桥接 Callable 与 Thread](/并发编程/async/02/p05-01.png)

![FutureTask 执行流程](/并发编程/async/02/p06-page.png)

---

## 四、实战：促销商品信息并行查询

同步：4 个远程接口各 50ms → 约 200ms。  
异步：5 个任务进线程池并行 → 接近 **max(50ms)**。

```java
ExecutorService es = Executors.newFixedThreadPool(5);
FutureTask<String> ft1 = new FutureTask<>(() -> { /* 基本信息 50ms */ });
// ... ft2 ~ ft5 同理
es.submit(ft1);
// ...
System.out.println(ft1.get());
es.shutdown();
```

![促销查询业务场景](/并发编程/async/02/p07-page.png)

![并行查询架构示意](/并发编程/async/02/p08-page.png)

![FutureTaskDemo2 类结构](/并发编程/async/02/p09-page.png)

![五个并行子任务](/并发编程/async/02/p10-page.png)

![线程池提交 FutureTask](/并发编程/async/02/p11-page.png)

![各任务 Callable 实现](/并发编程/async/02/p12-page.png)

![并行查询时序](/并发编程/async/02/p13-page.png)

![同步 vs 异步耗时对比](/并发编程/async/02/p14-page.png)

---

## 五、Future 的局限（为 CompletableFuture 铺垫）

1. **get 阻塞**，难以组合多个任务。  
2. **无链式回调**（完成后再发邮件等）。  
3. **多任务 allOf/anyOf 式编排** 需手写 `CountDownLatch` 等。  
4. **异常处理** 分散在 `ExecutionException` 解析里。

因此 JDK 8 引入 **CompletableFuture**——下一篇重点。

![Future 局限性总结](/并发编程/async/02/p15-page.png)

---

## 小结

- 要返回值用 **Callable + FutureTask**（或线程池 `submit(Callable)` 直接得 `Future`）。  
- 并行独立 I/O 时，总耗时趋近最慢分支而非求和。  
- Future 够用但编排弱；复杂流水线交给 CompletableFuture。
