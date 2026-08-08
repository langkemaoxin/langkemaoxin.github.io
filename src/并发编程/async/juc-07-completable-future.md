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

![CompletableFuture 与 Future 能力对比](/并发编程/async/02/p15-page.png)

---

## 一、应用场景速查

| 关系 | 典型 API |
|------|----------|
| 依赖（串行） | `thenApply` / `thenCompose` |
| AND 聚合 | `thenCombine` / `thenAcceptBoth` / `runAfterBoth` |
| OR 竞速 | `applyToEither` / `acceptEither` / `runAfterEither` |
| 多路并行 | `allOf` / `anyOf` |

![CompletableFuture 编排关系分类](/并发编程/async/02/p16-page.png)

---

## 二、创建异步任务

```java
CompletableFuture.runAsync(runnable);           // 无返回值
CompletableFuture.supplyAsync(supplier);        // 有返回值
// 重载可指定 Executor
```

未指定线程池时默认 **`ForkJoinPool.commonPool()`**（并行度 ≈ CPU 核数）。**I/O 密集任务勿全扔公共池**，否则慢任务拖死全局——按业务建独立线程池。

![runAsync 与 supplyAsync](/并发编程/async/02/p17-page.png)

![创建异步任务 API 详解](/并发编程/async/02/p18-page.png)

![线程池选型建议](/并发编程/async/02/p19-page.png)

---

## 三、获取结果

- **`get()`**：受检异常，阻塞。  
- **`join()`**：非受检，适合 Stream/链式里传播异常。

![join 与 get 区别](/并发编程/async/02/p20-page.png)

---

## 四、结果处理：whenComplete / exceptionally

```java
future.whenComplete((t, ex) -> { /* 成功或失败都进 */ });
future.exceptionally(ex -> "降级值");
```

Async 后缀可能在**其它线程**执行（同池也可能同线程）。

![whenComplete 与 exceptionally 示例](/并发编程/async/02/p21-page.png)

![异常分支输出示例](/并发编程/async/02/p22-page.png)

---

## 五、结果转换

### thenApply vs thenCompose

- **`thenApply(fn)`**：上一步结果 → 新值，**同一 CompletableFuture 链上改类型**。  
- **`thenCompose(fn)`**：上一步结果 → **新的 CompletableFuture**，用于**扁平化**嵌套异步。

```java
supplyAsync(() -> 100)
    .thenApply(n -> n * 3);                    // 300

supplyAsync(() -> 10)
    .thenCompose(n -> supplyAsync(() -> n * 2)); // 新 Stage
```

![thenApply 两阶段计算](/并发编程/async/02/p23-page.png)

![thenCompose 依赖异步](/并发编程/async/02/p24-page.png)

![thenApply 与 thenCompose 对比](/并发编程/async/02/p25-page.png)

---

## 六、结果消费（无返回值 Stage）

- **`thenAccept`**：消费单个结果  
- **`thenAcceptBoth`**：两个 Stage 都完成再 BiConsume  
- **`thenRun`**：不关心结果，只跑 Runnable  

![thenAccept 消费示例](/并发编程/async/02/p26-page.png)

![thenAcceptBoth 双路消费](/并发编程/async/02/p27-page.png)

![thenRun 示例](/并发编程/async/02/p28-page.png)

---

## 七、结果组合与竞速

- **`thenCombine`**：两路都完成，BiFunction 合并**有返回值**。  
- **`applyToEither`**：谁先完成用谁，再 Function。  
- **`acceptEither`** / **`runAfterEither`**：消费或跑动作，不关心或弱关心结果。  
- **`runAfterBoth`**：两路都完成再 Runnable。

![thenCombine 求和示例](/并发编程/async/02/p29-page.png)

![applyToEither 最快分支](/并发编程/async/02/p30-01.png)

![acceptEither 与 runAfterEither](/并发编程/async/02/p31-page.png)

![runAfterBoth 示例](/并发编程/async/02/p32-page.png)

---

## 八、allOf 与 anyOf

```java
CompletableFuture.allOf(f1, f2).join();  // 等都完成
Object first = CompletableFuture.anyOf(f1, f2).get(); // 任一完成
```

`allOf` 返回 `Void`，各任务结果仍从原 future `get()`。

![anyOf 竞速返回](/并发编程/async/02/p33-page.png)

![allOf 等待全部完成](/并发编程/async/02/p34-page.png)

---

## 九、案例：最优「烧水泡茶」

工序：T1 洗壶→烧水→泡茶；T2 洗壶→洗杯→拿茶叶；**泡茶前需茶叶**。

**Future 版**：T2 的 `FutureTask` 传给 T1，T1 在泡茶前 `ft2.get()`。  
**CompletableFuture 版**：`thenCombine` / `thenCompose` 声明依赖，代码更短。

```java
// T2 拿茶叶
CompletableFuture<String> tea = CompletableFuture.supplyAsync(() -> { /* 龙井 */ });
// T1 烧水后 thenCombine 茶叶
CompletableFuture<String> serve = CompletableFuture
    .supplyAsync(() -> { /* 洗壶烧水 */ })
    .thenCombine(tea, (water, leaf) -> "上茶:" + leaf);
```

![Future 版烧水泡茶](/并发编程/async/02/p30-01.png)

![FutureTaskDemo3 类结构](/并发编程/async/02/p31-page.png)

![CompletableFuture 实现烧水泡茶](/并发编程/async/02/p34-page.png)

---

## 小结

- **supply/run Async + 自有线程池** 是生产基线。  
- 串行用 **thenApply/Compose**，并行合并用 **combine/allOf**，竞速用 **either/anyOf**。  
- 异常用 **whenComplete + exceptionally**；阻塞慎用公共 FJP。

下一篇：**ThreadLocal**——异步链路上的「线程内上下文」与泄漏陷阱。
