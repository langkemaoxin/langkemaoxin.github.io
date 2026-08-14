---
title: "CountDownLatch 与 CyclicBarrier"
sidebarGroup: "锁与同步"
shortTitle: "07 CDL 与 CyclicBarrier"
order: 7
date: 2026-11-21
category: "并发编程"
tag:
  - "并发编程"
  - "CountDownLatch"
---

> **锁与同步 · 第 7/7 篇**  
> 上一篇：[《Semaphore 源码与限流场景》](/并发编程/lock/juc-14-semaphore)  
> 下一篇：[《并发容器 Map、List、Set 实战与原理》](/并发编程/collections/juc-16-concurrent-collections)

---

## 开头：主线程要等 5 个分片都跑完再汇总

MapReduce 式任务、并行单元测试、服务启动检查——「等 N 个线程完成」用 **CountDownLatch**；「N 个线程到齐再一起走下一波」用 **CyclicBarrier**。

---

# 第一部分：CountDownLatch

## 一、语义与使用

CountDownLatch 让一个或多个线程等待其他线程执行完成后再继续。构造时指定 `count`；每完成一个子任务 `countDown()` 一次；`count` 到 0 时 `await()` 的线程被唤醒。

| API | 说明 |
|-----|------|
| `CountDownLatch(int count)` | 初始化计数，不可重置 |
| `await()` | 阻塞直到 count=0 |
| `await(timeout, unit)` | 限时等待 |
| `countDown()` | count--，到 0 唤醒 await 线程 |
| `getCount()` | 当前计数 |

**一次性**：计数到 0 后不能重置——与 CyclicBarrier 最大区别。

典型场景：主线程等待 Worker 初始化完成；并行测试等所有用例结束；多任务完成后合并汇总。

![CountDownLatch 工作流程](/并发编程/lock/09b/p01-01.png)

![CountDownLatch 时序示意](/并发编程/lock/09b/p01-02.png)

### 示例

```java
CountDownLatch latch = new CountDownLatch(5);
for (int i = 0; i < 5; i++) {
    final int index = i;
    new Thread(() -> {
        try {
            Thread.sleep(1000 + ThreadLocalRandom.current().nextInt(2000));
            System.out.println("任务" + index + "完成");
            latch.countDown();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }).start();
}
latch.await();
System.out.println("主线程：所有任务完成后汇总");
```

### 电商并行划价

10 件商品各开线程划价，主线程 `await` 后统一返回——将串行 T = M + 10×N 优化为 T = M + Max(N)：

```java
final int[] products = IntStream.rangeClosed(1, 10).toArray();
List<ProductPrice> list = Arrays.stream(products)
        .mapToObj(ProductPrice::new).collect(toList());
final CountDownLatch latch = new CountDownLatch(products.length);

list.forEach(pp -> new Thread(() -> {
    try {
        // 模拟耗时划价...
        pp.setPrice(calculate(pp.prodID));
    } finally {
        latch.countDown();
    }
}).start());

latch.await();
list.forEach(System.out::println);
```

---

## 二、源码：基于 AQS 共享模式

```java
public CountDownLatch(int count) {
    if (count < 0) throw new IllegalArgumentException("count < 0");
    this.sync = new Sync(count);
}
```

内部 `Sync extends AQS`：

```java
Sync(int count) { setState(count); }

protected int tryAcquireShared(int acquires) {
    return (getState() == 0) ? 1 : -1;  // state==0 才放行
}

protected boolean tryReleaseShared(int releases) {
    for (;;) {
        int c = getState();
        if (c == 0) return false;       // 已为 0，重复 countDown 无效
        int nextc = c - 1;
        if (compareAndSetState(c, nextc))
            return nextc == 0;          // 最后一个 countDown 返回 true
    }
}
```

### await 流程

```java
public void await() throws InterruptedException {
    sync.acquireSharedInterruptibly(1);
}
```

1. `tryAcquireShared`：state>0 返回 -1，线程入 CLH 共享等待队列并 park
2. 某线程 `countDown` 使 state=0
3. `tryReleaseShared` 返回 true → `doReleaseShared` 唤醒 await 线程
4. 被唤醒线程再次 `tryAcquireShared` 成功（state==0 返回 1），继续执行

### countDown 流程

```java
public void countDown() {
    sync.releaseShared(1);
}
```

`releaseShared` → `tryReleaseShared` CAS 减 state → 若 nextc==0 则 `doReleaseShared` 唤醒队列。

---

# 第二部分：CyclicBarrier

## 三、语义与 CountDownLatch 对比

CyclicBarrier 让一组线程等待至**屏障点（barrier point）**再同时继续；所有线程释放后可**重用**（回环栅栏）。

| | CountDownLatch | CyclicBarrier |
|--|----------------|---------------|
| 底层 | 直接 AQS | ReentrantLock + Condition |
| 计数方向 | countDown 递减 | await 递减 |
| 等待方 | 一个或多个线程 await | 参与方互相 await |
| 重用 | 不可 | 可 reset，循环栅栏 |
| 到齐后动作 | 无内置 | 可选 `barrierAction` Runnable |

场景：多玩家到齐再开局；分阶段并行计算每阶段结束在栅栏汇合；跟团旅游——上车到齐、下车到齐。

![CyclicBarrier 与 CountDownLatch 对比](/并发编程/lock/09c/p01-01.png)

---

## 四、内部结构

与 CountDownLatch 不同，CyclicBarrier **不直接继承 AQS**，而是：

```java
private final ReentrantLock lock = new ReentrantLock();
private final Condition trip = lock.newCondition();
private final int parties;          // 初始参与线程数
private int count;                  // 还剩多少线程未 await
private Generation generation;      // 代际标记
private final Runnable barrierCommand;  // 到齐后执行的任务
```

`Generation` 持有 `boolean broken`：异常、中断、reset 时置 true，后续 await 抛 `BrokenBarrierException`。

```java
public CyclicBarrier(int parties, Runnable barrierAction) {
    if (parties <= 0) throw new IllegalArgumentException();
    this.parties = parties;
    this.count = parties;
    this.barrierCommand = barrierAction;
}
```

---

## 五、await / dowait 核心

```java
public int await() throws InterruptedException, BrokenBarrierException {
    try {
        return dowait(false, 0L);
    } catch (TimeoutException toe) {
        throw new Error(toe);
    }
}
```

`dowait(boolean timed, long nanos)` 核心逻辑：

1. **加锁**，获取当前 `Generation g`
2. 若 `g.broken` → 抛 `BrokenBarrierException`
3. 若当前线程被中断 → `breakBarrier()` → 抛 `InterruptedException`
4. `index = --count`
5. **若 index == 0**（最后一个到达）：
   - 执行 `barrierCommand`（若有）
   - `nextGeneration()`：重置 count、换新 Generation、`trip.signalAll()`
   - 返回 0
6. **否则**：在 `trip` 上 `await` / `awaitNanos` 等待
7. 被唤醒后检查：broken → 异常；generation 已换 → 返回 index；超时 → `breakBarrier` + `TimeoutException`
8. **finally 释放锁**

```java
private void breakBarrier() {
    generation.broken = true;
    count = parties;       // 恢复计数
    trip.signalAll();      // 唤醒所有等待线程
}

private void nextGeneration() {
    trip.signalAll();
    count = parties;
    generation = new Generation();
}
```

### reset

```java
public void reset() {
    lock.lock();
    try {
        breakBarrier();
        nextGeneration();
    } finally {
        lock.unlock();
    }
}
```

强制新一轮：当前代 broken，等待线程抛异常；count 与 generation 归位。

### 旅游大巴示例

```java
final CyclicBarrier barrier = new CyclicBarrier(11);  // 10 游客 + 导游
// 游客线程：上车 → barrier.await() → 游玩 → 下车 → barrier.await()
// 导游（主线程）：barrier.await() × 2
```

CyclicBarrier 的 parties 包含所有参与者（含主线程），CountDownLatch 则是「N 个工作者 + 1 个等待者」角色分离。

---

## 六、三者选型速查

| 工具 | 一句话 | 能否重用 |
|------|--------|----------|
| CountDownLatch | 等 N 个任务完成 | 否 |
| CyclicBarrier | N 个线程互相等到齐 | 是 |
| Semaphore | 控制同时访问资源的数量 | 是（release 归还） |

---

## 小结

- **CountDownLatch**：AQS state 作倒计时，一个（或多个）线程等 N 个任务完成，一次性。
- **CyclicBarrier**：Lock + Condition，N 个线程互相等，到齐后可选集体任务，可循环使用。

锁与同步系列至此收束；下一系列进入 **并发容器**。
