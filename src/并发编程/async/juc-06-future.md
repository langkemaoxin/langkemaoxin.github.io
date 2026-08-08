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

---

## 一、Runnable 与 Callable

直接继承 `Thread` 或实现 `Runnable` 都能创建线程，但**没有返回值，也不能抛出 checked Exception**。

Java 1.5 引入 `Callable<V>`：`call()` 可返回泛型结果，也可声明抛出异常。配合 **`Future`** 可取消任务、查询完成状态、**阻塞获取结果**。

```java
@FunctionalInterface
public interface Runnable {
    void run();
}

@FunctionalInterface
public interface Callable<V> {
    V call() throws Exception;
}
```

| 接口 | 返回值 | 受检异常 |
|------|--------|----------|
| `Runnable` | 无 | 不能声明 |
| `Callable<V>` | `V call()` | 可 `throws Exception` |

![Runnable 与 Callable 及 Future 关系](/并发编程/async/02/p03-01.png)

---

## 二、Future API

`Future` 表示异步计算的结果：取消、查询是否完成、获取结果（`get` 阻塞直到完成）。

| 方法 | 说明 |
|------|------|
| `cancel(mayInterruptIfRunning)` | 取消；运行中是否中断由参数决定 |
| `isCancelled()` / `isDone()` | 状态查询 |
| `get()` | 阻塞至完成；抛 `InterruptedException` / `ExecutionException` / `CancellationException` |
| `get(timeout, unit)` | 限时等待，超时 `TimeoutException` |

底层实现类通常是 **`FutureTask`**。

```java
FutureTask task = new FutureTask(new Callable() {
    @Override
    public Object call() throws Exception {
        System.out.println("通过Callable方式执行任务");
        Thread.sleep(3000);
        return "返回任务结果";
    }
});
new Thread(task).start();
System.out.println(task.get());
```

---

## 三、FutureTask

`FutureTask` 是生产者与消费者之间的桥梁：

- **生产者**（工作线程）执行 `Callable`，更新任务状态（未开始 / 运行中 / 已完成）。  
- **消费者**通过 `Future` 接口阻塞取结果或查询状态。

`FutureTask` 既可当作 `Runnable` 执行（`new Thread(futureTask).start()`），也可 `executor.submit(futureTask)`。

```java
public class FutureTaskDemo {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        FutureTask<Integer> futureTask = new FutureTask<>(new Task());
        new Thread(futureTask).start();
        System.out.println("task运行结果：" + futureTask.get());
    }

    static class Task implements Callable<Integer> {
        @Override
        public Integer call() throws Exception {
            System.out.println("子线程正在计算");
            int sum = 0;
            for (int i = 0; i < 100; i++) sum += i;
            return sum;
        }
    }
}
```

![FutureTask 桥接 Callable 与线程执行](/并发编程/async/02/p05-01.png)

---

## 四、实战：促销商品信息并行查询

维护促销活动需查询：基本信息、价格、库存、图片、销售状态等，分布在不同业务中心。

- **同步**：每个接口约 50ms，5 个接口串行 ≈ 250ms。  
- **异步**：5 个 `FutureTask` 提交线程池并行，总耗时 ≈ **max(50ms)**。

```java
public class FutureTaskDemo2 {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        FutureTask<String> ft1 = new FutureTask<>(new T1Task());
        FutureTask<String> ft2 = new FutureTask<>(new T2Task());
        FutureTask<String> ft3 = new FutureTask<>(new T3Task());
        FutureTask<String> ft4 = new FutureTask<>(new T4Task());
        FutureTask<String> ft5 = new FutureTask<>(new T5Task());

        ExecutorService executorService = Executors.newFixedThreadPool(5);
        executorService.submit(ft1);
        executorService.submit(ft2);
        executorService.submit(ft3);
        executorService.submit(ft4);
        executorService.submit(ft5);

        System.out.println(ft1.get());
        System.out.println(ft2.get());
        System.out.println(ft3.get());
        System.out.println(ft4.get());
        System.out.println(ft5.get());
        executorService.shutdown();
    }

    static class T1Task implements Callable<String> {
        public String call() throws Exception {
            System.out.println("T1:查询商品基本信息...");
            TimeUnit.MILLISECONDS.sleep(50);
            return "商品基本信息查询成功";
        }
    }
    // T2Task ~ T5Task：价格、库存、图片、销售状态，各 sleep 50ms
}
```

---

## 五、Future 的局限（为 CompletableFuture 铺垫）

`Future` 异步获取结果的设计很优秀，但存在明显限制：

1. **get 阻塞**——并发执行多任务时，除等待别无他法。  
2. **无链式回调**——任务完成后发邮件等动作需手写线程 + 等待。  
3. **无法优雅组合多任务**——10 个任务全部完成后再执行动作，Future 无能为力（需 `CountDownLatch` 等）。  
4. **异常处理分散**——须在 `ExecutionException` 中解析原因。

业务中任务常有**串行依赖、并行、聚合**关系，手写 Future 非常繁琐。

**CompletableFuture**（JDK 8）扩展 Future，提供**任务编排**能力——`thenApply`、`thenCombine`、`allOf` 等，下一篇详述。

---

## 小结

- 要返回值用 **Callable + FutureTask**（或线程池 `submit(Callable)` 直接得 `Future`）。  
- 并行独立 I/O 时，总耗时趋近最慢分支而非求和。  
- Future 够用但编排弱；复杂流水线交给 CompletableFuture。
