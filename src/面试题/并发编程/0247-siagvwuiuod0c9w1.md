---
title: "Synchronized与ReentrantLock的区别"
sidebarGroup: "并发编程"
shortTitle: "Synchronized与ReentrantLock的区别"
order: 247
date: 2026-06-07
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： Synchronized与ReentrantLock有什么区别？Fox版标准回答：“它们都是Java中实现线程同步的机制，都具有互斥性和可重入性。但它们的区别主要体现在层面、用法、功能和底层实现四"
article: false
---

> 来源：[Synchronized与ReentrantLock的区别](https://www.yuque.com/tulingzhouyu/db22bv/siagvwuiuod0c9w1)

### 一、 标准面试回答模版（建议背诵）

**面试官：** Synchronized与ReentrantLock有什么区别？

**Fox版标准回答：**

“它们都是Java中实现线程同步的机制，都具有**互斥性**和**可重入性**。但它们的区别主要体现在**层面、用法、功能和底层实现**四个维度：

1. **层面不同**：

- `synchronized` 是 **JVM 层面**的关键字，是内置的语言特性，由 JVM 负责实现。
- `ReentrantLock` 是 **JDK API 层面**的类（JUC包下），是基于 Java 代码实现的。

1. **用法不同（关键点）**：

- `synchronized` 是**自动挡**：进入同步块加锁，出了同步块（或异常）自动释放锁，开发者不需要手动操作。
- `ReentrantLock` 是**手动挡**：需要手动调用 `lock()` 加锁，且**必须**在 `finally` 块中调用 `unlock()` 释放锁，否则容易导致死锁。

1. **功能丰富度不同（核心加分项）**：

- `ReentrantLock` 比 `synchronized` 多了三个高级功能：

- **等待可中断**：`lockInterruptibly()` 可以响应中断，不想等了可以取消。
- **公平锁支持**：构造函数传 `true` 可实现公平锁（先来后到），`synchronized` 只能是非公平锁。
- **多条件绑定**：通过 `Condition` 可以实现分组唤醒（如 `notEmpty.signal()`），而 `synchronized` 只有一个 `wait/notify` 队列，要么全醒，要么随机醒一个。

1. **底层实现不同**：

- `synchronized` 底层基于对象头（Mark Word）和 **Monitor（监视器锁）**，JDK 1.6 后引入了偏向锁、轻量级锁的锁升级机制。
- `ReentrantLock` 底层基于 **AQS（抽象队列同步器）** 和 **CAS** 操作来实现。”

### 二、 代码层面对比（Talk is cheap, show me the code）

面试时，如果你能在白板上写出这两段代码的对比，尤其是 `ReentrantLock` 的 `finally` 块，非常加分。

#### 1. Synchronized（傻瓜式）

JVM 帮你搞定了一切（异常处理、锁释放）。

```java
// 方式一：修饰方法
public synchronized void syncMethod() {
    // 业务逻辑
}

// 方式二：修饰代码块
public void syncBlock() {
    Object lock = new Object();
    synchronized (lock) {
        // 自动加锁
        try {
            // 业务逻辑
        } catch (Exception e) {
            e.printStackTrace();
        }
        // 执行完或抛异常，JVM自动释放锁
    }
}
```

#### 2. ReentrantLock（精细控制）

**Look at me!** 这里有个巨大的坑：`unlock()`**必须**放在 `finally` 里，且 `lock()` 建议放在 `try` 之前。

```java
import java.util.concurrent.locks.ReentrantLock;

public class LockDemo {
    // 定义锁对象
    private final ReentrantLock lock = new ReentrantLock(); 
    // private final ReentrantLock fairLock = new ReentrantLock(true); // 公平锁

    public void doSomething() {
        // 1. 手动加锁
        lock.lock(); 
        try {
            // 2. 业务逻辑
            System.out.println("线程抢到了锁");

            // 高级功能示例：尝试获取锁，不等就走
            // if (lock.tryLock()) { ... }

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            // 3. 【绝对重点】必须手动释放锁，否则死锁！
            lock.unlock();
        }
    }
}
```

---

### 三、 底层原理深挖

如果面试官追问：“它们底层到底是怎么卡住线程的？”这时候你要抛出这两个核心概念。

#### 1. Synchronized 的底层：ObjectMonitor

- **依赖对象**：每个 Java 对象头里都有个 Mark Word，指向一个 C++ 实现的 `ObjectMonitor`。
- **核心结构**：

- `_owner`：指向持有锁的线程。
- `_EntryList`：阻塞队列（竞争锁失败的线程去这里排队）。
- `_WaitSet`：等待队列（调用 `wait()` 后线程去这里休息）。

- **机制**：依赖操作系统的 `Mutex Lock`（互斥量），这也是为什么 JDK 1.6 之前它比较重（涉及到用户态和内核态切换）的原因。

#### 2. ReentrantLock 的底层：AQS (AbstractQueuedSynchronizer)

- **依赖代码**：纯 Java 实现，不完全依赖操作系统。
- **核心结构**：

- `state`：一个 `volatile int` 变量。0 代表无锁，1 代表有锁，>1 代表重入次数。
- `CLH 队列`：一个双向链表，存着所有排队的线程。

- **机制**：

- 抢锁：用 **CAS** (Compare And Swap) 尝试把 `state` 从 0 改成 1。改成功了就拿到锁。
- 排队：改失败了，就自己封装成节点入队，然后调用 `LockSupport.park()` 挂起自己。

### 四、 总结（一句话定胜负）

**面试官：** 那我在项目中该怎么选？

**回答：**

“在并发竞争不激烈，且不需要高级功能（如公平锁、中断响应）时，**首选 **`synchronized`，因为它是 JVM 原生支持的，代码更简洁，且 JDK 1.6 之后引入了锁升级，性能和 `ReentrantLock` 差不多。

只有当我们需要**精细化控制**（比如尝试加锁 `tryLock`、需要公平锁、或者需要 `Condition` 实现复杂的生产消费模型）时，才使用 `ReentrantLock`。”
