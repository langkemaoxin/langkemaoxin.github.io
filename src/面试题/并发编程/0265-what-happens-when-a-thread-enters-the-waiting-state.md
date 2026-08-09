---
title: "什么情况线程会进入 WAITING 状态"
sidebarGroup: "并发编程"
shortTitle: "什么情况线程会进入 WAITING 状态"
order: 265
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 什么情况下线程会进入 WAITING 状态？Fox版标准回答：“在 Java 中，线程进入 WAITING（无限期等待） 状态，通常是因为调用了以下三个方法之一。处于该状态的线程不会自动苏醒，必须"
article: false
---

> 来源：[什么情况线程会进入 WAITING 状态](https://www.yuque.com/tulingzhouyu/db22bv/nfaeqg2m5a0klggo)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 什么情况下线程会进入 WAITING 状态？

**Fox版标准回答：**

“在 Java 中，线程进入 **WAITING（无限期等待）** 状态，通常是因为调用了以下三个方法之一。处于该状态的线程**不会自动苏醒**，必须等待其他线程显式地唤醒或者中断。

1. `Object.wait()`（不带超时参数）：

- 调用此方法会释放持有的对象锁，并进入等待队列。
- **唤醒条件**：必须由其他线程在同一个锁对象上调用 `notify()` 或 `notifyAll()`。

1. `Thread.join()`（不带超时参数）：

- 当前线程等待另一个线程执行完毕。
- **唤醒条件**：被 Join 的那个线程运行结束（Terminated）。

1. `LockSupport.park()`：

- 这是 JUC（并发包）锁实现的底层机制。它会挂起当前线程，不涉及 Monitor 锁的释放（因为它不依赖 Monitor）。
- **唤醒条件**：其他线程调用 `LockSupport.unpark(thread)`。

**关键区别**：WAITING 是**主动**等待（为了业务逻辑），而 BLOCKED 是**被动**阻塞（为了抢 synchronized 锁）。”

### 二、 代码层面对比

这段代码演示了最常见的进入 WAITING 状态的场景，并验证了状态。

```java
import java.util.concurrent.locks.LockSupport;

public class WaitingStateDemo {
    private static final Object lock = new Object();

    public static void main(String[] args) throws InterruptedException {

        // 场景1：Object.wait()
        Thread t1 = new Thread(() -> {
            synchronized (lock) {
                try {
                    // 必须先拿到锁才能 wait，否则抛 IllegalMonitorStateException
                    lock.wait(); 
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }, "Thread-Wait");

        t1.start();
        Thread.sleep(100); // 稍微等一下让 t1 跑起来
        // 输出: WAITING
        System.out.println("t1 state: " + t1.getState());

        // 场景2：LockSupport.park() (JUC 锁的基石)
        Thread t2 = new Thread(() -> {
            // 直接挂起，不需要 synchronize
            LockSupport.park();
        }, "Thread-Park");

        t2.start();
        Thread.sleep(100);
        // 输出: WAITING
        System.out.println("t2 state: " + t2.getState());

        // 唤醒 t2
        LockSupport.unpark(t2); 
    }
}
```

### 三、 Fox的避坑指南（面试杀手锏）

面试官经常会搞混淆概念来忽悠你，你要学会反杀：

**1. 问：**`sleep()`** 会让线程进入 WAITING 吗？**

**Fox：不会！**`sleep()` 必须传入时间参数，所以它进入的是 **TIMED_WAITING**（超时等待）状态，而不是 WAITING。

**2. 问：线程在等待 **`synchronized`** 锁的时候，是 WAITING 吗？**

**Fox：不是！** 这种是被动争抢锁失败，进入的是 **BLOCKED** 状态。

- **BLOCKED**：在等锁（门口排队，没进去）。
- **WAITING**：已经进去了，但是因为条件不满足（比如 `wait`），又主动释放锁出来等信号。

**3. 问：JUC 的 **`ReentrantLock.lock()`** 拿不到锁时，线程是什么状态？**

**Fox：** 这是高阶坑！ 虽然 `synchronized` 拿不到锁是 BLOCKED，但 **JUC 的锁**底层用的是 `LockSupport.park()`。 所以，`ReentrantLock` 等待锁时，线程状态实际上是 **WAITING**（或者 TIMED_WAITING），而不是 BLOCKED！这一点能直接证明你看过 AQS 源码。
