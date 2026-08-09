---
title: "什么是可重入锁"
sidebarGroup: "并发编程"
shortTitle: "什么是可重入锁"
order: 268
date: 2026-06-06
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 什么是可重入锁？Fox版标准回答：“可重入锁（Reentrant Lock），也叫做递归锁。它的核心定义只有一句话： 同一个线程，在已经持有某把锁的前提下，可以再次获取这把锁，而不会被阻塞。它的工"
article: false
---

> 来源：[什么是可重入锁](https://www.yuque.com/tulingzhouyu/db22bv/gfgf63i7ox8ocvov)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 什么是可重入锁？

**Fox版标准回答：**

“可重入锁（Reentrant Lock），也叫做**递归锁**。它的核心定义只有一句话： **同一个线程，在已经持有某把锁的前提下，可以再次获取这把锁，而不会被阻塞。**

它的工作原理基于两个核心要素：**线程持有者标识** 和 **计数器**。

1. **识别身份**：锁会记录当前是谁拿着锁。如果新来的线程就是当前持有者，直接放行。
2. **计数器机制**：每重入一次，计数器 `state + 1`；每释放一次，计数器 `state - 1`。只有当计数器归零时，锁才会被真正释放，别的线程才有机会抢。

**Java 中的典型实现**：

- `synchronized`（隐式可重入）。
- `ReentrantLock`（显式可重入）。

**核心作用**：避免**死锁**。如果没有可重入性，一个同步方法调用另一个使用同一把锁的同步方法时，线程就会自己把自己锁死（Self Deadlock）。”

### 二、 代码层面对比

面试时，手写这个简单的**递归调用**例子，胜过千言万语。

```java
public class ReentrantDemo {

    // 演示 synchronized 的可重入性
    public synchronized void methodA() {
        System.out.println("进入 methodA，当前线程持有锁");
        // 【关键点】：methodA 已经拿了锁，这里调用 methodB 也需要同一把锁。
        // 如果不可重入，线程会在这里死锁，等待自己释放锁。
        methodB(); 
    }

    public synchronized void methodB() {
        System.out.println("进入 methodB，证明锁是可重入的");
    }

    public static void main(String[] args) {
        new ReentrantDemo().methodA();
    }
}
```

**运行结果：**

```plain
进入 methodA，当前线程持有锁
进入 methodB，证明锁是可重入的
```

（顺利执行，证明没有死锁。）

### 三、 深度解析

如果面试官追问：**“它是怎么记录重入次数的？”**

**Fox版解析：**

“以 **ReentrantLock** 为例，它底层基于 **AQS (AbstractQueuedSynchronizer)**。

AQS 里有一个核心变量 `volatile int state`。

- **初始状态**：`state = 0`，表示无锁。
- **第一次加锁**：线程 A 抢到锁，把 `state` 改为 1，并记录 `exclusiveOwnerThread = ThreadA`。
- **重入加锁**：线程 A 再次 lock，发现 owner 是自己，于是只做一件事：`state++`（比如变成 2）。
- **释放锁**：线程 A unlock，`state--`。
- **完全释放**：只有当 `state` 减回到 0 时，AQS 才会把 `exclusiveOwnerThread` 置空，并唤醒后面排队的线程。

所以，`lock()` 了几次，就必须 `unlock()` 几次，少一次都会导致锁无法释放，这就叫‘配对原则’。”
