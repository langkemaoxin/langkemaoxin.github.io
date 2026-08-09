---
title: "ReentrantLock中的公平锁和非公平锁的底层实现"
sidebarGroup: "并发编程"
shortTitle: "ReentrantLock中的公平锁和非公平锁的底层实现"
order: 273
date: 2026-06-26
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： ReentrantLock 中的公平锁和非公平锁有什么区别？底层是怎么实现的？Fox版标准回答：“它们的核心区别在于抢锁的逻辑（TryAcquire）不同，也就是‘是否允许插队’。非公平锁（Non"
article: false
---

> 来源：[ReentrantLock中的公平锁和非公平锁的底层实现](https://www.yuque.com/tulingzhouyu/db22bv/fcis5n11xyl33696)

### 一、 标准面试回答模版（建议背诵）

**面试官：** ReentrantLock 中的公平锁和非公平锁有什么区别？底层是怎么实现的？

**Fox版标准回答：**

“它们的核心区别在于**抢锁的逻辑（TryAcquire）不同，也就是‘是否允许插队’**。

1. **非公平锁（Non-Fair Lock，默认）：**

- **逻辑**：不管队列里有没有人排队，新来的线程都会先**尝试直接抢锁（CAS）**。
- **结果**：如果抢到了，就直接插队执行，不用排队；如果没抢到，再老老实实去 AQS 队列尾部排队。
- **优势**：性能更高。因为它利用了‘线程唤醒的延迟时间’，减少了线程挂起和恢复的上下文切换开销。

1. **公平锁（Fair Lock）：**

- **逻辑**：新来的线程在抢锁前，**必须先判断 AQS 队列里有没有人排队**（调用 `hasQueuedPredecessors`）。
- **结果**：只要队列里有人，它就不能抢，必须去队尾排队。严格遵守‘先来后到’。
- **优势**：避免‘线程饥饿’问题，但吞吐量比非公平锁低很多。”

### 二、 源码级对比

面试时，直接指出源码中**相差的那一行代码**，是最有说服力的。

`ReentrantLock` 内部有两个静态内部类：`NonfairSync` 和 `FairSync`。

#### 1. 非公平锁 (NonfairSync)

**Look at me!** 它的特点是：**上来就抢，抢不到再进正常的流程。**

```java
static final class NonfairSync extends Sync {
    // 加锁入口
    final void lock() {
        // 【第一步插队】：不管三七二十一，先 CAS 试一下能不能把 State 从 0 变 1
        if (compareAndSetState(0, 1))
            setExclusiveOwnerThread(Thread.currentThread());
        else
            acquire(1); // 失败了才走正常的 AQS 流程
    }

    // AQS 回调的尝试获取锁逻辑
    protected final boolean tryAcquire(int acquires) {
        return nonfairTryAcquire(acquires);
    }
}

final boolean nonfairTryAcquire(int acquires) {
// ... 省略部分代码 ...
int c = getState();
if (c == 0) {
    // 【第二步插队】：发现锁是空的，直接 CAS 抢，根本不看队列！
    if (compareAndSetState(0, acquires)) {
        setExclusiveOwnerThread(Thread.currentThread());
        return true;
    }
}
// ...
}
```

#### 2. 公平锁 (FairSync)

**Look at me!** 注意看它多出的那一行判断：`!hasQueuedPredecessors()`。

```java
static final class FairSync extends Sync {
    final void lock() {
        acquire(1); // 直接走 AQS 流程，不进行“上来就抢”的骚操作
    }

    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        if (c == 0) {
            // 【关键区别】：就算现在锁是空的（c==0），我也不能直接抢！
            // 必须先问问：队列里前面有没有人？(hasQueuedPredecessors)
            // 如果没人排队，我才能 CAS。
            if (!hasQueuedPredecessors() && compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        // ...
        return false;
    }
}
```

---

### 三、 Fox的深度解析

如果面试官问：**“为什么非公平锁性能比公平锁高那么多？”**

你要画出这个“时间差”逻辑：

**Fox版解析：**

“这利用了**线程调度的延迟**。

1. 假设线程 A 释放锁，它需要去唤醒队列头部的线程 B。
2. **关键点：** 唤醒线程 B 是需要时间的（从内核态切换回用户态，调度器分配时间片）。
3. 在这段**‘B 还没完全醒过来’**的空档期，如果正好来了一个线程 C。
4. **非公平模式下**：C 发现锁是空的（State=0），直接 CAS 抢走了，执行代码，然后迅速释放。
5. 等 B 真正醒过来时，发现锁又空了，或者 C 刚释放完，B 也能拿到锁。

**结论：** 非公平锁利用了这个空档期，让 C 线程‘白嫖’了一次执行机会，大大提升了系统的整体吞吐量。而在公平模式下，C 只能干瞪眼等着，浪费了这段 CPU 时间。”

拓展视频：

[限流场景下，改选公平锁还是非公平锁？怎么解决长时间饥饿问题？](https://open.douyin.com/player/video?vid=7463001607484083468&autoplay=0)
