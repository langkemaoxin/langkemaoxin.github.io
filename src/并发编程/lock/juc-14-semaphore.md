---
title: "Semaphore 源码与限流场景"
sidebarGroup: "锁与同步"
shortTitle: "06 Semaphore"
order: 6
date: 2026-11-20
category: "并发编程"
tag:
  - "并发编程"
  - "Semaphore"
---

> **锁与同步 · 第 6/7 篇**  
> 上一篇：[《AQS 与 ReentrantLock 源码要点》](/并发编程/lock/juc-13-aqs-reentrantlock)  
> 下一篇：[《CountDownLatch 与 CyclicBarrier》](/并发编程/lock/juc-15-latch-barrier)

---

## 开头：数据库连接池最多 20 条，第 21 个请求怎么办？

Semaphore（信号量）维护一组**许可证（permits）**：线程 `acquire()` 取走许可，`release()` 归还。许可耗尽时新线程阻塞——天然适合连接池、限流、资源池化。

![Semaphore 许可证模型](/并发编程/lock/09a/p01-01.png)

---

## 一、API 与使用注意

```java
Semaphore sem = new Semaphore(3);           // 默认非公平
Semaphore fair = new Semaphore(3, true);    // 公平

sem.acquire();              // 取 1 个许可，不足则阻塞
sem.acquire(2);             // 取多个
sem.tryAcquire();           // 非阻塞
sem.tryAcquire(3, TimeUnit.SECONDS);  // 限时
sem.release();              // 归还 1 个
sem.release(2);             // 归还多个
```

典型场景：限制同时访问文件的线程数、控制 RPC 并发度、接口限流、登录系统限制同时在线人数等。

**release 注意**：官方不要求 release 的线程必须 acquire 过，但业务上应保证只有成功 acquire 后才 release，避免 `finally` 无条件 release 导致许可计数虚增。

---

## 二、基于 AQS 的实现

Semaphore 内部 `Sync extends AQS`，**state 表示剩余许可数**。

```java
public Semaphore(int permits) {
    sync = new NonfairSync(permits);  // state = permits
}
public Semaphore(int permits, boolean fair) {
    sync = fair ? new FairSync(permits) : new NonfairSync(permits);
}
```

### 公平 vs 非公平 tryAcquireShared

**非公平** `nonfairTryAcquireShared`：

```java
final int nonfairTryAcquireShared(int acquires) {
    for (;;) {
        int available = getState();
        int remaining = available - acquires;
        if (remaining < 0 || compareAndSetState(available, remaining))
            return remaining;
    }
}
```

- `remaining >= 0` 且 CAS 成功 → 获取成功
- `remaining < 0` → 许可不足，返回负值

**公平** `FairSync.tryAcquireShared`：

```java
protected int tryAcquireShared(int acquires) {
    for (;;) {
        if (hasQueuedPredecessors())
            return -1;  // 队列有等待者，禁止插队
        int available = getState();
        int remaining = available - acquires;
        if (remaining < 0 || compareAndSetState(available, remaining))
            return remaining;
    }
}
```

| 类型 | 行为 |
|------|------|
| 公平 | 等待队列有线程时，当前线程直接入队 |
| 非公平 | 不管队列，优先 CAS 抢许可 |

---

## 三、acquire 流程

```java
public void acquire() throws InterruptedException {
    sync.acquireSharedInterruptibly(1);
}
```

`acquireSharedInterruptibly`：

```java
public final void acquireSharedInterruptibly(int arg) throws InterruptedException {
    if (Thread.interrupted()) throw new InterruptedException();
    if (tryAcquireShared(arg) < 0)
        doAcquireSharedInterruptibly(arg);
}
```

`tryAcquireShared` 返回 `< 0` 表示失败，进入 `doAcquireSharedInterruptibly`：

```java
private void doAcquireSharedInterruptibly(int arg) throws InterruptedException {
    final Node node = addWaiter(Node.SHARED);  // 共享模式节点
    boolean failed = true;
    try {
        for (;;) {
            final Node p = node.predecessor();
            if (p == head) {
                int r = tryAcquireShared(arg);
                if (r >= 0) {
                    setHeadAndPropagate(node, r);  // 唤醒传播
                    p.next = null;
                    failed = false;
                    return;
                }
            }
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                throw new InterruptedException();
        }
    } finally {
        if (failed) cancelAcquire(node);
    }
}
```

获取成功后 `setHeadAndPropagate` 可能**连锁唤醒**后续共享节点——与独占锁只唤醒一个后继不同。

```java
private void setHeadAndPropagate(Node node, int propagate) {
    setHead(node);
    if (propagate > 0 || h == null || h.waitStatus < 0 || ...)
        if (s == null || s.isShared())
            doReleaseShared();
}
```

---

## 四、release 流程

```java
public void release() {
    sync.releaseShared(1);
}
```

```java
public final boolean releaseShared(int arg) {
    if (tryReleaseShared(arg)) {
        doReleaseShared();  // 唤醒等待队列
        return true;
    }
    return false;
}
```

`tryReleaseShared`：

```java
protected final boolean tryReleaseShared(int releases) {
    for (;;) {
        int current = getState();
        int next = current + releases;
        if (next < current) throw new Error("Maximum permit count exceeded");
        if (compareAndSetState(current, next))
            return true;
    }
}
```

`doReleaseShared` 自旋检查 head 节点 ws，为 `SIGNAL` 则 `unparkSuccessor`；为 0 则 CAS 改为 `PROPAGATE`（解决 JDK1.5 共享锁唤醒 bug）。

---

## 小结

| 对比 | ReentrantLock | Semaphore |
|------|---------------|-----------|
| AQS 模式 | 独占 EXCLUSIVE | 共享 SHARED |
| state 含义 | 重入次数 | 剩余许可 |
| 唤醒策略 | unpark 一个后继 | setHeadAndPropagate 连锁唤醒 |
| 典型用途 | 互斥临界区 | 限流、池化 |

下一篇介绍 **CountDownLatch** 与 **CyclicBarrier**——一类「等别人跑完」，一类「到齐再一起走」。
