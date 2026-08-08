---
title: "AQS 与 ReentrantLock 源码要点"
sidebarGroup: "锁与同步"
shortTitle: "05 AQS 与 ReentrantLock"
order: 5
date: 2026-11-19
category: "并发编程"
tag:
  - "并发编程"
  - "AQS"
---

> **锁与同步 · 第 5/7 篇**  
> 上一篇：[《JUC 显式锁与大厂应用实战》](/并发编程/lock/juc-12-juc-locks)  
> 下一篇：[《Semaphore 源码与限流场景》](/并发编程/lock/juc-14-semaphore)

---

## 开头：读 ReentrantLock 源码像读天书？

Lock、Latch、Semaphore、Barrier 等 JUC 同步器大多围绕 **AQS（AbstractQueuedSynchronizer）** 展开。搞懂 **state、CLH 队列、tryAcquire/tryRelease**，ReentrantLock 的加锁/释放就清晰了。

---

## 一、管程与 AQS 定位

**管程**：管理共享变量及对其操作，支持互斥与同步。Java 两条路线：

- `synchronized` + `wait/notify`（Monitor，MESA 模型精简版）
- AQS + `Lock/Condition`（JUC 显式锁）

![p01 01](/并发编程/lock/08/p01-01.png)

`Condition.await()` / `signalAll()` 必须在持有对应 Lock 时调用——与 `Object.wait/notify` 必须在 synchronized 块内类似。

![p02 page](/并发编程/lock/08/p02-page.png)

![p03 page](/并发编程/lock/08/p03-page.png)

---

## 二、AQS 核心结构

| 要素 | 说明 |
|------|------|
| `state` | volatile，表示同步状态（锁重入次数 / 许可数等） |
| CLH 同步队列 | 获取失败线程的 FIFO 等待队列 |
| 条件队列 | `Condition` 的单向等待队列，与 Lock 绑定 |

访问 state 的三种方式：`getState()`、`setState()`、`compareAndSetState()`。

子类需实现：

- **独占**：`tryAcquire` / `tryRelease`
- **共享**：`tryAcquireShared` / `tryReleaseShared`

![p04 page](/并发编程/lock/08/p04-page.png)

![p05 page](/并发编程/lock/08/p05-page.png)

Node 状态：`CANCELLED(1)`、`SIGNAL(-1)`、`CONDITION(-2)`、`PROPAGATE(-3)`。

![p06 page](/并发编程/lock/08/p06-page.png)

---

## 三、手写独占锁 TulingLock

```java
public class TulingLock extends AbstractQueuedSynchronizer {
    protected boolean tryAcquire(int unused) {
        if (compareAndSetState(0, 1)) {
            setExclusiveOwnerThread(Thread.currentThread());
            return true;
        }
        return false;
    }
    protected boolean tryRelease(int unused) {
        setExclusiveOwnerThread(null);
        setState(0);
        return true;
    }
    public void lock() { acquire(1); }
    public void unlock() { release(1); }
}
```

`acquire(1)` 模板：先 `tryAcquire`，失败则 `addWaiter` + `acquireQueued` 挂起。

![p07 page](/并发编程/lock/08/p07-page.png)

![p08 page](/并发编程/lock/08/p08-page.png)

---

## 四、ReentrantLock 加锁流程

默认**非公平** `NonfairSync.lock()`：

1. CAS 尝试 `state: 0→1`，成功则设置 owner
2. 失败则 `acquire(1)` → `tryAcquire` → 入队 → 自旋/挂起

**公平** `FairSync`：无线程排队时才 CAS 抢锁（`hasQueuedPredecessors()`）。

**重入**：owner 已是当前线程则 `state++`。

![p09 page](/并发编程/lock/08/p09-page.png)

![p10 page](/并发编程/lock/08/p10-page.png)

![p11 page](/并发编程/lock/08/p11-page.png)

![p12 page](/并发编程/lock/08/p12-page.png)

`addWaiter`：封装 Node 入 CLH 尾；队列为空则 `enq` 初始化头尾哨兵。

![p13 page](/并发编程/lock/08/p13-page.png)

![p14 page](/并发编程/lock/08/p14-page.png)

`acquireQueued`：前驱为 head 时再 `tryAcquire`；否则 `shouldParkAfterFailedAcquire` 将前驱 ws 置 `SIGNAL` 后 `park`。

![p15 page](/并发编程/lock/08/p15-page.png)

![p16 page](/并发编程/lock/08/p16-page.png)

---

## 五、unlock 释放

```java
public void unlock() { sync.release(1); }
```

`tryRelease`：`state--`，为 0 时清空 owner 并返回 `free=true`；`release` 成功后 `unparkSuccessor` 唤醒后继。

![p17 page](/并发编程/lock/08/p17-page.png)

![p18 page](/并发编程/lock/08/p18-page.png)

---

## 小结

ReentrantLock = **AQS 独占模式 + CAS + CLH 队列**。公平/非公平差异在「新线程是否可与队列头竞争」。下一篇看 AQS **共享模式** 下的 Semaphore。
