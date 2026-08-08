---
title: "JUC 显式锁与大厂应用实战"
sidebarGroup: "锁与同步"
shortTitle: "04 JUC 锁实战"
order: 4
date: 2026-11-18
category: "并发编程"
tag:
  - "并发编程"
  - "Lock"
---

> **锁与同步 · 第 4/7 篇**  
> 上一篇：[《深入理解 synchronized》](/并发编程/lock/juc-11-synchronized)  
> 下一篇：[《AQS 与 ReentrantLock 源码要点》](/并发编程/lock/juc-13-aqs-reentrantlock)

---

## 开头：抢票超卖与「先付后查」的线程协作

8 张票 10 人抢会**超卖**；生产者-消费者又要**精确唤醒**而非全体 `notifyAll`。JDK 在 `synchronized` 之外提供 `ReentrantLock`、`ReadWriteLock`、`StampedLock` 及 `Condition` 等显式工具。

---

## 一、ReentrantLock 基础

可重入独占锁，相对 `synchronized` 支持：**可中断**、**超时 tryLock**、**公平/非公平**、**多个 Condition**。

```java
private final Lock lock = new ReentrantLock();

public void foo() {
    lock.lock();
    try {
        // 临界区
    } finally {
        lock.unlock();  // 必须在 finally
    }
}
```

注意：加锁次数与 unlock 次数一致；加锁在 try 之前，避免未锁先释。

![p01 01](/并发编程/lock/07/p01-01.png)

![p02 page](/并发编程/lock/07/p02-page.png)

![p03 page](/并发编程/lock/07/p03-page.png)

![p04 page](/并发编程/lock/07/p04-page.png)

### 抢票：超卖 vs 加锁

8 票 10 线程：`tickets--` 非原子，不加锁会超卖；`ReentrantLock` 保护检查后递减则正常。

![p05 page](/并发编程/lock/07/p05-page.png)

![p06 page](/并发编程/lock/07/p06-page.png)

**公平锁** `new ReentrantLock(true)`：按 FIFO 唤醒；默认**非公平**允许插队，吞吐通常更高。

**可重入**：同线程外层 `lock` 后内层再 `lock` 不会死锁，`state` 计数重入。

![p07 page](/并发编程/lock/07/p07-page.png)

![p08 page](/并发编程/lock/07/p08-page.png)

---

## 二、Condition：多条件队列

一个 Lock 可配多个 `Condition`，比单 `waitSet` 更灵活——典型**生产者-消费者**：`notFull` / `notEmpty` 分开唤醒。

```java
while (size == items.length) notFull.await();   // 满则等
// ... put ...
notEmpty.signal();

while (size == 0) notEmpty.await();           // 空则等
// ... take ...
notFull.signal();
```

`await/signal` 必须在持有 lock 时调用。

![p09 page](/并发编程/lock/07/p09-page.png)

![p10 page](/并发编程/lock/07/p10-page.png)

![p11 page](/并发编程/lock/07/p11-page.png)

![p12 page](/并发编程/lock/07/p12-page.png)

---

## 三、ReentrantLock 应用场景

- 多线程写同一资源（如 DB 写入串行化）
- 顺序执行任务链
- 自定义 wait/notify 语义的多条件协调

![p13 page](/并发编程/lock/07/p13-page.png)

---

## 四、Semaphore 快速上手

维护 **permits** 许可证：`acquire` 取、`release` 还。用于连接池、限流、控制并行度。

![p14 page](/并发编程/lock/07/p14-page.png)

![p15 page](/并发编程/lock/07/p15-page.png)

![p16 page](/并发编程/lock/07/p16-page.png)

![p17 page](/并发编程/lock/07/p17-page.png)

![p18 page](/并发编程/lock/07/p18-page.png)

---

## 五、CountDownLatch 与 CyclicBarrier 实战

**CountDownLatch**：主线程 `await`，Worker `countDown`，适合「等服务分片都就绪」。

**CyclicBarrier**：N 线程 `await` 到齐再进入下一阶段，可带 `barrierAction`，可 **reset** 循环使用。

![p19 page](/并发编程/lock/07/p19-page.png)

![p20 page](/并发编程/lock/07/p20-page.png)

![p21 page](/并发编程/lock/07/p21-page.png)

![p22 page](/并发编程/lock/07/p22-page.png)

![p23 page](/并发编程/lock/07/p23-page.png)

![p24 page](/并发编程/lock/07/p24-page.png)

![p25 page](/并发编程/lock/07/p25-page.png)

![p26 page](/并发编程/lock/07/p26-page.png)

---

## 六、ReadWriteLock 读写锁

读多写少：`ReadWriteLock` 允许多读单写。`ReentrantReadWriteLock` 读锁共享、写锁独占；支持公平策略；写锁可降级为读锁（需在同线程内）。

![p27 page](/并发编程/lock/07/p27-page.png)

![p28 page](/并发编程/lock/07/p28-page.png)

![p29 page](/并发编程/lock/07/p29-page.png)

![p30 page](/并发编程/lock/07/p30-page.png)

![p31 page](/并发编程/lock/07/p31-page.png)

![p32 page](/并发编程/lock/07/p32-page.png)

![p33 page](/并发编程/lock/07/p33-page.png)

![p34 page](/并发编程/lock/07/p34-page.png)

---

## 七、StampedLock（JDK8）

三种模式：**写锁**、**悲观读锁**、**乐观读**（`tryOptimisticRead` + 校验 stamp）。乐观读无阻塞，适合读极多、写很少；写锁不可重入，不可与 Interruptible/Condition 混用需谨慎。

![p35 page](/并发编程/lock/07/p35-page.png)

![p36 page](/并发编程/lock/07/p36-page.png)

![p37 page](/并发编程/lock/07/p37-page.png)

![p38 page](/并发编程/lock/07/p38-page.png)

![p39 page](/并发编程/lock/07/p39-page.png)

![p40 page](/并发编程/lock/07/p40-page.png)

---

## 八、选型与实战要点

| 场景 | 建议 |
|------|------|
| 简单互斥、代码块短 | `synchronized` |
| 可中断、超时、公平、多 Condition | `ReentrantLock` |
| 读多写少 | `ReadWriteLock` / `StampedLock` 乐观读 |
| 限流、池化 | `Semaphore` |
| 等多任务完成 | `CountDownLatch` |
| 多阶段到齐汇合 | `CyclicBarrier` |

业务中常见组合：线程池 + `CountDownLatch` 等批处理完成；缓存刷新用读写锁；接口限流用 Semaphore。

![p41 page](/并发编程/lock/07/p41-page.png)

![p42 page](/并发编程/lock/07/p42-page.png)

![p43 page](/并发编程/lock/07/p43-page.png)

![p44 page](/并发编程/lock/07/p44-page.png)

![p45 page](/并发编程/lock/07/p45-page.png)

![p46 page](/并发编程/lock/07/p46-page.png)

![p47 page](/并发编程/lock/07/p47-page.png)

![p48 page](/并发编程/lock/07/p48-page.png)

---

## 小结

显式锁把同步策略从 JVM 内置 Monitor 扩展到可配置、可组合的工具箱。掌握 API 边界后，下一篇深入 **AQS + ReentrantLock 源码**。
