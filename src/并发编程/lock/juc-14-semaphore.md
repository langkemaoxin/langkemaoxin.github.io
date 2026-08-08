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

---

## 一、API 与使用注意

```java
Semaphore sem = new Semaphore(3);           // 默认非公平
Semaphore fair = new Semaphore(3, true);    // 公平

sem.acquire();   // 取 1 个许可，不足则阻塞
sem.release();   // 归还 1 个许可
```

典型场景：限制同时访问文件的线程数、控制 RPC 并发度、线程池配合外部限流等。

![p01 01](/并发编程/lock/09a/p01-01.png)

---

## 二、基于 AQS 的实现

Semaphore 内部 `Sync extends AQS`，**state 表示剩余许可数**。

构造函数：

```java
public Semaphore(int permits) {
    sync = new NonfairSync(permits);  // state = permits
}
public Semaphore(int permits, boolean fair) {
    sync = fair ? new FairSync(permits) : new NonfairSync(permits);
}
```

![p02 page](/并发编程/lock/09a/p02-page.png)

### 公平 vs 非公平 tryAcquireShared

**非公平** `nonfairTryAcquireShared`：自旋 CAS 将 `state` 减 `acquires`，`remaining < 0` 表示许可不足。

**公平** `FairSync.tryAcquireShared`：若等待队列已有前驱线程，直接返回 -1；否则与非公平相同逻辑。

![p03 page](/并发编程/lock/09a/p03-page.png)

![p04 page](/并发编程/lock/09a/p04-page.png)

---

## 三、acquire 流程

```java
public void acquire() throws InterruptedException {
    sync.acquireSharedInterruptibly(1);
}
```

1. `tryAcquireShared(1)`：CAS 扣减许可，成功则返回剩余数 ≥ 0
2. 失败则 `doAcquireSharedInterruptibly`：封装 **SHARED** 节点入 CLH 队列，挂起自旋等待

获取成功后 `setHeadAndPropagate` 可能**连锁唤醒**后续共享节点（与独占锁不同）。

![p05 page](/并发编程/lock/09a/p05-page.png)

![p06 page](/并发编程/lock/09a/p06-page.png)

---

## 四、release 流程

```java
public void release() {
    sync.releaseShared(1);
}
```

`tryReleaseShared`：CAS 将 `state + releases`，成功后 `doReleaseShared()` 唤醒等待队列中节点。

![p07 page](/并发编程/lock/09a/p07-page.png)

![p08 page](/并发编程/lock/09a/p08-page.png)

---

## 小结

| 对比 | ReentrantLock | Semaphore |
|------|---------------|-----------|
| AQS 模式 | 独占 EXCLUSIVE | 共享 SHARED |
| state 含义 | 重入次数 | 剩余许可 |
| 典型用途 | 互斥临界区 | 限流、池化 |

下一篇介绍 **CountDownLatch** 与 **CyclicBarrier**——一类「等别人跑完」，一类「到齐再一起走」。
