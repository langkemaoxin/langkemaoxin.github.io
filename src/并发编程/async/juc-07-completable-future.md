---
title: "CompletableFuture 异步编排实战"
sidebarGroup: "异步编程"
shortTitle: "02 CompletableFuture"
order: 2
date: 2026-11-13
category: "并发编程"
tag:
  - "并发编程"
  - "CompletableFuture"
---

> **异步编程 · 第 2/3 篇**  
> 上一篇：[《Callable、Future 与 FutureTask》](/并发编程/async/juc-06-future) · 下一篇：[《ThreadLocal 原理与内存泄漏》](/并发编程/async/juc-08-threadlocal)

---

## 开头：Future 够拿结果，不够「编排剧情」

查完用户信息还要调积分、调风控、发通知——任务之间有 **then**、**and**、**or** 关系。用 Future 手写线程 + 回调 + 闭锁，代码很快变成面条。**CompletableFuture** 把编排做成链式 API，并补齐异常与线程池隔离。

---

## 一、应用场景速查

| 关系 | 典型 API |
|------|----------|
| 依赖（串行） | `thenApply` / `thenCompose` |
| AND 聚合 | `thenCombine` / `thenAcceptBoth` / `runAfterBoth` |
| OR 竞速 | `applyToEither` / `acceptEither` / `runAfterEither` |
| 多路并行 | `allOf` / `anyOf` |

**Future 局限回顾**：仅 `get` 阻塞、无链式回调、难组合多任务、异常处理弱——CompletableFuture 逐一补齐。

---

## 二、创建异步任务

```java
CompletableFuture.runAsync(runnable);                    // 无返回值
CompletableFuture.runAsync(runnable, executor);
CompletableFuture.supplyAsync(supplier);                // 有返回值
CompletableFuture.supplyAsync(supplier, executor);
```

| 区别 | 说明 |
|------|------|
| `runAsync` | 参数为 `Runnable`，无结果 |
| `supplyAsync` | 参数为 `Supplier`，有结果；`get()` 会阻塞 |

未指定 `Executor` 时使用 **`ForkJoinPool.commonPool()`**（并行度 ≈ CPU 核数，可通过 `-Djava.util.concurrent.ForkJoinPool.common.parallelism` 调整）。

**强烈建议**：I/O 密集任务勿全部使用公共池——慢 I/O 会占满公共池线程，导致全局饥饿。**按业务类型创建独立线程池**。

```java
Runnable runnable = () -> System.out.println("执行无返回结果的异步任务");
CompletableFuture.runAsync(runnable);

CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    Thread.sleep(5000);
    return "Hello World";
});
String result = future.get();
```

---

## 三、获取结果

- **`get()`**：受检异常（`ExecutionException`、`InterruptedException`），阻塞。  
- **`join()`**：非受检异常，适合 Stream/链式里传播异常。

---

## 四、结果处理：whenComplete / exceptionally

任务正常完成或抛异常时执行 Action：

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    if (new Random().nextInt(10) % 2 == 0) {
        int i = 12 / 0;
    }
    return "test";
});

future.whenComplete((t, action) -> System.out.println(t + " 执行完成！"));
future.exceptionally(t -> {
    System.out.println("执行失败：" + t.getMessage());
    return "异常xxxx";
}).join();
```

- 不以 `Async` 结尾：Action 与上游**同线程**执行。  
- `Async` 后缀：可能在**其它线程**执行（同池也可能同线程）。  
- 均返回 `CompletableFuture`，可继续链式调用。

---

## 五、结果转换

### thenApply

上一阶段结果作为参数，**在同一 CompletableFuture 链上**转换类型：

```java
CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
    int result = 100;
    System.out.println("一阶段：" + result);
    return result;
}).thenApply(number -> {
    int result = number * 3;
    System.out.println("二阶段：" + result);
    return result;
});
System.out.println("最终结果：" + future.get()); // 300
```

### thenCompose

上一阶段结果用于**展开新的 CompletableFuture**（扁平化嵌套异步）：

```java
CompletableFuture<Integer> future = CompletableFuture
    .supplyAsync(() -> {
        int number = new Random().nextInt(30);
        System.out.println("第一阶段：" + number);
        return number;
    })
    .thenCompose(param -> CompletableFuture.supplyAsync(() -> {
        int number = param * 2;
        System.out.println("第二阶段：" + number);
        return number;
    }));
```

### thenApply vs thenCompose

| | thenApply | thenCompose |
|---|-----------|-------------|
| 返回 | 同一 CF 上改泛型 | **新的** CompletableFuture |
| 用途 | 同步式映射结果 | 依赖下游异步 Stage |

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> "Hello");
CompletableFuture<String> result1 = future.thenApply(param -> param + " World");
CompletableFuture<String> result2 = future
    .thenCompose(param -> CompletableFuture.supplyAsync(() -> param + " World"));
// 两者输出均为 "Hello World"，但 result2 多一层异步 Stage
```

---

## 六、结果消费（无返回值 Stage）

只对结果执行 Action，**不返回新计算值**（Consumer 只有输入）：

| 系列 | 说明 |
|------|------|
| `thenAccept` | 消费单个结果 |
| `thenAcceptBoth` | 两个 Stage 都完成再 BiConsume |
| `thenRun` | 不关心结果，只跑 Runnable |

```java
CompletableFuture<Void> future = CompletableFuture
    .supplyAsync(() -> {
        int number = new Random().nextInt(10);
        System.out.println("第一阶段：" + number);
        return number;
    }).thenAccept(number -> System.out.println("第二阶段：" + number * 5));
// get() 返回 null
```

---

## 七、结果组合与竞速

### thenCombine

两路都完成，`BiFunction` 合并**有返回值**：

```java
CompletableFuture<Integer> result = future1.thenCombine(future2, (x, y) -> x + y);
```

### applyToEither / acceptEither / runAfterEither

**谁先完成用谁**：

- `applyToEither`：Function，有返回值  
- `acceptEither`：Consumer，无返回值  
- `runAfterEither`：Runnable，不关心结果  

![applyToEither 最快分支处理示意](/并发编程/async/02/p30-01.png)

### runAfterBoth

两路**都**完成再执行 Runnable，不关心结果。

---

## 八、allOf 与 anyOf

```java
CompletableFuture<Object> any = CompletableFuture.anyOf(future1, future2);
System.out.println(any.get()); // 任一完成即返回

CompletableFuture<Void> all = CompletableFuture.allOf(future1, future2);
all.get(); // 等都完成；返回 Void，各任务结果仍从原 future get()
```

---

## 九、案例：最优「烧水泡茶」

华罗庚《统筹方法》中的经典例子：洗水壶→烧水→泡茶；洗茶壶→洗茶杯→拿茶叶。**泡茶前需要茶叶**。

**Future 版**：T2 的 `FutureTask` 传给 T1，T1 烧水后 `ft2.get()` 取茶叶再泡。

```java
FutureTask<String> ft2 = new FutureTask<>(new T2Task());
FutureTask<String> ft1 = new FutureTask<>(new T1Task(ft2));
new Thread(ft2).start();
new Thread(ft1).start();
System.out.println(ft1.get());

class T1Task implements Callable<String> {
    FutureTask<String> ft2;
    T1Task(FutureTask<String> ft2) { this.ft2 = ft2; }
    public String call() throws Exception {
        System.out.println("T1:洗水壶..."); TimeUnit.SECONDS.sleep(1);
        System.out.println("T1:烧开水..."); TimeUnit.SECONDS.sleep(15);
        String tf = ft2.get();
        System.out.println("T1:拿到茶叶:" + tf);
        System.out.println("T1:泡茶...");
        return "上茶:" + tf;
    }
}
```

**CompletableFuture 版**：声明式组合，代码更短：

```java
CompletableFuture<Void> f1 = CompletableFuture.runAsync(() -> {
    System.out.println("T1:洗水壶..."); sleep(1, SECONDS);
    System.out.println("T1:烧开水..."); sleep(15, SECONDS);
});

CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> {
    System.out.println("T2:洗茶壶..."); sleep(1, SECONDS);
    System.out.println("T2:洗茶杯..."); sleep(2, SECONDS);
    System.out.println("T2:拿茶叶..."); sleep(1, SECONDS);
    return "龙井";
});

CompletableFuture<String> f3 = f1.thenCombine(f2, (__, tf) -> {
    System.out.println("T1:拿到茶叶:" + tf);
    System.out.println("T1:泡茶...");
    return "上茶:" + tf;
});

System.out.println(f3.join());
```

---

## 小结

- **supply/run Async + 自有线程池** 是生产基线。  
- 串行用 **thenApply/Compose**，并行合并用 **combine/allOf**，竞速用 **either/anyOf**。  
- 异常用 **whenComplete + exceptionally**；阻塞慎用公共 FJP。

下一篇：**ThreadLocal**——异步链路上的「线程内上下文」与泄漏陷阱。
