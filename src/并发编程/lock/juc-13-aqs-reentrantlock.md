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

**管程**：管理共享变量及对其操作，支持**互斥**与**同步**。

| 概念 | 说明 |
|------|------|
| 互斥 | 同一时刻只允许一个线程访问共享资源 |
| 同步 | 协调线程执行先后、通信协作 |

Java 两条管程实现路线：

- `synchronized` + `wait/notify`（Monitor，MESA 精简版）
- AQS + `Lock/Condition`（JUC 显式锁）

![管程两种实现路线](/并发编程/lock/08/p01-01.png)

`Condition.await()` / `signalAll()` 必须在持有对应 Lock 时调用——与 `Object.wait/notify` 必须在 synchronized 块内类似。

---

## 二、AQS 核心结构

JUC 大多数同步器通过内部类 `Sync extends AQS` 实现，将 API 映射到 AQS 模板方法。

| 要素 | 说明 |
|------|------|
| `state` | volatile，表示同步状态（锁重入次数 / 许可数等） |
| CLH 同步队列 | 获取失败线程的 FIFO 等待队列 |
| 条件队列 | `Condition` 的单向等待队列，与 Lock 绑定 |

访问 state 的三种方式：`getState()`、`setState()`、`compareAndSetState()`。

子类需实现：

- **独占**：`tryAcquire` / `tryRelease`
- **共享**：`tryAcquireShared` / `tryReleaseShared`

### Node 状态

```java
static final class Node {
    static final int CANCELLED =  1;   // 取消
    static final int SIGNAL    = -1;  // 后继需要唤醒
    static final int CONDITION = -2;  // 在 Condition 队列
    static final int PROPAGATE = -3;  // 共享锁传播
}
```

### 两种队列

| 队列 | 用途 |
|------|------|
| **同步等待队列（CLH）** | 获取锁失败的线程入队；释放锁时唤醒 head 后继 |
| **条件等待队列** | `await()` 释放锁并加入；`signal()` 将节点转移到同步队列 |

CLH 是 Craig、Landin、Hagersten 发明的 FIFO 双向链表变种；Java 中自旋改为阻塞（`park`）。

---

## 三、手写独占锁 TulingLock

```java
public class TulingLock extends AbstractQueuedSynchronizer {
    @Override
    protected boolean tryAcquire(int unused) {
        if (compareAndSetState(0, 1)) {
            setExclusiveOwnerThread(Thread.currentThread());
            return true;
        }
        return false;
    }

    @Override
    protected boolean tryRelease(int unused) {
        setExclusiveOwnerThread(null);
        setState(0);
        return true;
    }

    public void lock() { acquire(1); }
    public void unlock() { release(1); }
    public boolean isLocked() { return getState() != 0; }
}
```

`acquire(1)` 模板：先 `tryAcquire`，失败则 `addWaiter` + `acquireQueued` 挂起。

---

## 四、ReentrantLock 加锁流程

默认**非公平** `NonfairSync.lock()`：

```java
final void lock() {
    if (compareAndSetState(0, 1))
        setExclusiveOwnerThread(Thread.currentThread());
    else
        acquire(1);
}
```

1. CAS 尝试 `state: 0→1`，成功则设置 owner
2. 失败则 `acquire(1)` → `tryAcquire` → 入队 → 自旋/挂起

**公平** `FairSync`：无线程排队时才 CAS 抢锁（`hasQueuedPredecessors()`）。

### acquire 模板

```java
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
        selfInterrupt();
}
```

### tryAcquire：公平 vs 非公平

**公平锁** `FairSync#tryAcquire`：

```java
protected final boolean tryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        if (!hasQueuedPredecessors() &&
            compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    } else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0) throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;  // 重入
    }
    return false;
}
```

**非公平锁** `NonfairSync#tryAcquire` → `nonfairTryAcquire`：state 为 0 时**不检查**等待队列，直接 CAS 抢锁。差异仅此一处。

### addWaiter 与 enq

```java
private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode);
    Node pred = tail;
    if (pred != null) {
        node.prev = pred;
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;
        }
    }
    enq(node);  // 队列为空或 CAS 失败，自旋初始化
    return node;
}
```

`enq` 自旋：队列为空则初始化 head/tail 哨兵，再将 node 挂到 tail。

### acquireQueued

```java
final boolean acquireQueued(final Node node, int arg) {
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {
            final Node p = node.predecessor();
            if (p == head && tryAcquire(arg)) {
                setHead(node);
                p.next = null;
                failed = false;
                return interrupted;
            }
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                interrupted = true;
        }
    } finally {
        if (failed) cancelAcquire(node);
    }
}
```

前驱为 head 时再 `tryAcquire`；否则 `shouldParkAfterFailedAcquire` 将前驱 ws 置 `SIGNAL` 后 `park`。

`shouldParkAfterFailedAcquire` 逻辑：

- 前驱 ws 为 `SIGNAL(-1)` → 可以 park
- 前驱 ws 为 `CANCELLED(1)` → 跳过取消节点
- 否则 CAS 将前驱 ws 改为 `SIGNAL`，**暂不 park**（再给一次机会）

---

## 五、unlock 释放

```java
public void unlock() { sync.release(1); }

public final boolean release(int arg) {
    if (tryRelease(arg)) {
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);  // 唤醒后继
        return true;
    }
    return false;
}
```

`tryRelease`：

```java
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;
    if (Thread.currentThread() != getExclusiveOwnerThread())
        throw new IllegalMonitorStateException();
    boolean free = false;
    if (c == 0) {
        free = true;
        setExclusiveOwnerThread(null);
    }
    setState(c);
    return free;  // free=true 表示完全释放，才唤醒后继
}
```

`state--` 到 0 时清空 owner 并 `unparkSuccessor` 唤醒队列中下一个线程。

---

## 小结

ReentrantLock = **AQS 独占模式 + CAS + CLH 队列**。

| 要点 | 说明 |
|------|------|
| 非公平 | state=0 时新线程可与队列头竞争 |
| 公平 | 有排队线程时不允许插队 |
| 重入 | owner 是当前线程则 state++ |
| 释放 | state 到 0 才 unpark 后继 |

下一篇看 AQS **共享模式** 下的 Semaphore。
