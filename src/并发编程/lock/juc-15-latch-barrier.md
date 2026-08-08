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

- 构造时指定 `count`
- 工作线程完成一段任务后 `countDown()`，`count--`
- 等待方 `await()`：仅当 `count==0` 才继续
- **一次性**：计数到 0 后不能重置（与 CyclicBarrier 最大区别）

典型场景：主线程等待多个 Worker 初始化完成；并行测试里等所有用例线程结束。

![p01 01](/并发编程/lock/09b/p01-01.png)

![p01 02](/并发编程/lock/09b/p01-02.png)

---

## 二、源码：基于 AQS 共享模式

```java
public CountDownLatch(int count) {
    if (count < 0) throw new IllegalArgumentException("count < 0");
    this.sync = new Sync(count);  // setState(count)
}
```

内部 `Sync`：

```java
protected int tryAcquireShared(int acquires) {
    return (getState() == 0) ? 1 : -1;  // state==0 才放行
}
protected boolean tryReleaseShared(int releases) {
    for (;;) {
        int c = getState();
        if (c == 0) return false;
        int nextc = c - 1;
        if (compareAndSetState(c, nextc))
            return nextc == 0;  // 最后一个 countDown 返回 true，触发唤醒
    }
}
```

![p02 page](/并发编程/lock/09b/p02-page.png)

![p03 page](/并发编程/lock/09b/p03-page.png)

**await**：`state>0` 则入共享等待队列挂起；最后一个 `countDown` 使 `state=0` 并 `doReleaseShared` 唤醒。

![p04 page](/并发编程/lock/09b/p04-page.png)

![p05 page](/并发编程/lock/09b/p05-page.png)

![p06 page](/并发编程/lock/09b/p06-page.png)

![p07 page](/并发编程/lock/09b/p07-page.png)

![p08 page](/并发编程/lock/09b/p08-page.png)

![p09 page](/并发编程/lock/09b/p09-page.png)

---

# 第二部分：CyclicBarrier

## 三、语义与 CountDownLatch 对比

| | CountDownLatch | CyclicBarrier |
|--|----------------|---------------|
| 实现 | 直接 AQS | ReentrantLock + Condition |
| 计数方向 | countDown 递减 | await 递减 |
| 等待方 | 一个或多个线程 await | 参与方互相 await |
| 重用 | 不可 | 可 reset，循环栅栏 |
| 到齐后动作 | 无内置 | 可选 `barrierAction` Runnable |

场景：多玩家到齐再开局；分阶段并行计算，每阶段结束在栅栏汇合。

![p01 01](/并发编程/lock/09c/p01-01.png)

---

## 四、内部结构

- `parties`：初始参与线程数
- `count`：还剩多少线程未 await
- `Generation`：代际标记，`broken` 表示异常/中断/reset
- `ReentrantLock lock` + `Condition trip`

![p02 page](/并发编程/lock/09c/p02-page.png)

```java
public CyclicBarrier(int parties, Runnable barrierAction) {
    this.parties = parties;
    this.count = parties;
    this.barrierCommand = barrierAction;
}
```

![p03 page](/并发编程/lock/09c/p03-page.png)

---

## 五、await / dowait 核心

`await()` → `dowait(false, 0)`：

1. 加锁，`--count`
2. 若 `index == 0`（最后一个到达）：可选执行 `barrierAction`，再 `nextGeneration()` 重置 count、换新 Generation、signalAll
3. 否则在 `trip` 上 await 等待
4. 中断、超时、broken 走 `breakBarrier()`：置 broken、恢复 count、signalAll 后抛异常

![p04 page](/并发编程/lock/09c/p04-page.png)

![p05 page](/并发编程/lock/09c/p05-page.png)

![p06 page](/并发编程/lock/09c/p06-page.png)

`reset()`：加锁 → `breakBarrier()` → `nextGeneration()`，强制新一轮。

![p07 page](/并发编程/lock/09c/p07-page.png)

![p08 page](/并发编程/lock/09c/p08-page.png)

---

## 小结

- **CountDownLatch**：一个（或多个）线程等 N 个任务完成，AQS state 作倒计时。
- **CyclicBarrier**：N 个线程互相等，到齐后可选集体任务，可循环使用。

锁与同步系列至此收束；下一系列进入 **并发容器**。
