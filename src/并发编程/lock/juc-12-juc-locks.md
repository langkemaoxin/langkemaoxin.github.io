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

![JUC 同步工具类关系概览](/并发编程/lock/07/p01-01.png)

---

## 一、ReentrantLock 基础

可重入独占锁，相对 `synchronized` 支持：**可中断**、**超时 tryLock**、**公平/非公平**、**多个 Condition**。

### 常用 API

| 方法 | 说明 |
|------|------|
| `lock()` | 获取锁，阻塞直到成功 |
| `lockInterruptibly()` | 可中断获取 |
| `tryLock()` | 非阻塞尝试，立即返回 |
| `tryLock(time, unit)` | 超时获取 |
| `unlock()` | 释放锁 |
| `newCondition()` | 获取与锁绑定的条件变量 |

### 基本写法

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

// 带超时
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try { /* ... */ } finally { lock.unlock(); }
} else { /* 备选逻辑 */ }
```

**四点注意**：

1. 默认**非公平**锁；`new ReentrantLock(true)` 为公平锁
2. 加锁与 unlock 次数必须一致（可重入）
3. `lock()` 放在 try **之前**，避免未锁先释
4. `unlock()` 必须在 **finally** 中

工作原理：线程 `lock()` 时 CAS 将 AQS `state` 设为 1 即获锁；失败则入 CLH 阻塞队列。公平锁释放后优先唤醒 `head.next`；非公平锁允许新线程与队列头竞争。

### 抢票：超卖 vs 加锁

8 票 10 线程，`tickets--` 非原子，不加锁会超卖：

```java
public class ReentrantLockDemo {
    private final ReentrantLock lock = new ReentrantLock();
    private static int tickets = 8;

    public void buyTicket() {
        lock.lock();
        try {
            if (tickets > 0) {
                Thread.sleep(10);  // 模拟并发
                System.out.println(Thread.currentThread().getName()
                        + "购买了第" + tickets-- + "张票");
            } else {
                System.out.println("票已卖完");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            lock.unlock();
        }
    }
}
```

加锁后剩余票数为 0，2 人抢票失败。

### 公平锁 vs 非公平锁

- **公平锁**：按 FIFO 唤醒等待队列
- **非公平锁**（默认）：允许插队，吞吐通常更高

```java
ReentrantLock lock = new ReentrantLock();       // 非公平
ReentrantLock fairLock = new ReentrantLock(true); // 公平
```

### 可重入

同线程外层 `lock` 后内层再 `lock` 不会死锁，AQS `state` 计数重入：

```java
public void recursiveCall(int num) {
    lock.lock();
    try {
        if (num == 0) return;
        recursiveCall(num - 1);
    } finally {
        lock.unlock();
    }
}
```

---

## 二、Condition：多条件队列

一个 Lock 可配多个 `Condition`，比单 `waitSet` 更灵活——典型**生产者-消费者**：`notFull` / `notEmpty` 分开唤醒。

| 方法 | 说明 |
|------|------|
| `await()` | 释放锁并等待 signal |
| `await(time, unit)` | 限时等待 |
| `signal()` | 唤醒一个等待线程 |
| `signalAll()` | 唤醒所有等待线程 |

`await/signal` **必须在持有 lock 时调用**。

```java
class Queue {
    private Object[] items;
    int size, putIndex, takeIndex;
    private ReentrantLock lock;
    public Condition notEmpty, notFull;

    public Queue(int capacity) {
        items = new Object[capacity];
        lock = new ReentrantLock();
        notEmpty = lock.newCondition();
        notFull = lock.newCondition();
    }

    public void put(Object value) throws Exception {
        lock.lock();
        try {
            while (size == items.length)
                notFull.await();  // 满则等
            items[putIndex] = value;
            if (++putIndex == items.length) putIndex = 0;
            size++;
            notEmpty.signal();    // 唤醒消费者
        } finally {
            lock.unlock();
        }
    }

    public Object take() throws Exception {
        lock.lock();
        try {
            while (size == 0)
                notEmpty.await();  // 空则等
            Object value = items[takeIndex];
            items[takeIndex] = null;
            if (++takeIndex == items.length) takeIndex = 0;
            size--;
            notFull.signal();     // 唤醒生产者
            return value;
        } finally {
            lock.unlock();
        }
    }
}
```

---

## 三、ReentrantLock 应用场景

- 多线程写同一资源（DB 写入串行化）
- 顺序执行任务链
- 自定义 wait/notify 语义的多条件协调

---

## 四、Semaphore 快速上手

维护 **permits** 许可证：`acquire` 取、`release` 还。用于连接池、限流、控制并行度。

```java
Semaphore sem = new Semaphore(3);           // 默认非公平
sem.acquire();   // 取 1 个，不足则阻塞
sem.release();   // 归还

// 非阻塞
if (!sem.tryAcquire()) {
    return "请求被流控";
}
```

### 限流示例

```java
private static Semaphore semaphore = new Semaphore(2);

public static String getProductInfo() {
    try {
        semaphore.acquire();
        log.info("请求服务");
        Thread.sleep(2000);
    } finally {
        semaphore.release();
    }
    return "返回商品详情";
}
```

### release 的正确用法

官方文档：**不要求 release 的线程必须 acquire 过**。但若在 `finally` 中无条件 `release`，线程被中断时可能释放「不属于自己」的许可，导致计数器虚增。正确做法：只有确认 acquire 成功后才在 finally 中 release；中断/失败则直接 return。

### 同时在线用户数

```java
final Semaphore semaphore = new Semaphore(10, true);

public boolean login() {
    if (semaphore.tryAcquire()) {
        System.out.println("login success");
        return true;
    }
    return false;  // 超过最大在线数
}

public void logout() {
    semaphore.release();
}
```

---

## 五、CountDownLatch 与 CyclicBarrier 实战

### CountDownLatch

主线程 `await`，Worker `countDown`，适合「等服务分片都就绪」：

```java
CountDownLatch latch = new CountDownLatch(5);
for (int i = 0; i < 5; i++) {
    new Thread(() -> {
        // 子任务...
        latch.countDown();
    }).start();
}
latch.await();  // 等 count 到 0
System.out.println("汇总结果");
```

**一次性**：count 到 0 后不能重置。适合并行任务完成后合并、多任务汇总、资源初始化等待。

### 电商并行划价

10 件商品各自线程划价，主线程 `await` 后汇总——串行耗时 T = M + 10×N，并行后 T = M + Max(N)。

### CyclicBarrier

N 线程 `await` 到齐再进入下一阶段，可带 `barrierAction`，可 **reset** 循环使用：

```java
CyclicBarrier barrier = new CyclicBarrier(10, () -> {
    System.out.println("所有线程到齐，执行汇总");
});
// 每个工作线程完成任务后 barrier.await()
```

| 对比 | CountDownLatch | CyclicBarrier |
|------|----------------|---------------|
| 重用 | 不可 | 可 reset |
| 等待方 | 一个或多个线程 await | 参与方互相 await |
| 到齐动作 | 无内置 | 可选 barrierAction |

适合多玩家到齐开局、分阶段并行计算每阶段结束汇合。旅游大巴示例：11 人（含导游）两次 `await`——上车到齐、下车到齐。

---

## 六、ReadWriteLock 读写锁

读多写少：`ReadWriteLock` 允许多读单写。

```java
ReadWriteLock rwLock = new ReentrantReadWriteLock();
Lock readLock = rwLock.readLock();
Lock writeLock = rwLock.writeLock();

// 读
readLock.lock();
try { /* 读共享数据 */ } finally { readLock.unlock(); }

// 写
writeLock.lock();
try { /* 写共享数据 */ } finally { writeLock.unlock(); }
```

`ReentrantReadWriteLock` 特点：

- 读锁共享、写锁独占
- 支持公平/非公平策略
- **写锁可降级为读锁**（须在同线程内：先获写锁，再获读锁，再释写锁）

注意：读锁不能升级为写锁（会导致死锁）。

---

## 七、StampedLock（JDK8）

三种模式：**写锁**、**悲观读锁**、**乐观读**。

```java
StampedLock sl = new StampedLock();

// 乐观读
long stamp = sl.tryOptimisticRead();
// 读数据...
if (!sl.validate(stamp)) {
    stamp = sl.readLock();
    try { /* 重新读 */ } finally { sl.unlockRead(stamp); }
}

// 写
long writeStamp = sl.writeLock();
try { /* 写 */ } finally { sl.unlockWrite(writeStamp); }
```

乐观读无阻塞，适合读极多、写很少。注意：写锁**不可重入**；不可与 `Condition` 混用；使用不当可能活锁。

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

业务常见组合：线程池 + `CountDownLatch` 等批处理完成；缓存刷新用读写锁；接口限流用 Semaphore。

---

## 小结

显式锁把同步策略从 JVM 内置 Monitor 扩展到可配置、可组合的工具箱。掌握 API 边界后，下一篇深入 **AQS + ReentrantLock 源码**。
