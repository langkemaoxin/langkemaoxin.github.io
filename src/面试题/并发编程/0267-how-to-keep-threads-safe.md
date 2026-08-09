---
title: "如何确保线程安全"
sidebarGroup: "并发编程"
shortTitle: "如何确保线程安全"
order: 267
date: 2026-07-07
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 在 Java 中如何确保线程安全？Fox版标准回答：“确保线程安全的核心思路只有三条：不共享、共享不可变、共享可变（同步控制）。具体落地为以下 4 种方案：互斥同步（阻塞锁 - 悲观策略）：使用 "
article: false
---

> 来源：[如何确保线程安全](https://www.yuque.com/tulingzhouyu/db22bv/souuu0lez7inc14r)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 在 Java 中如何确保线程安全？

**Fox版标准回答：**

“确保线程安全的核心思路只有三条：**不共享、共享不可变、共享可变（同步控制）**。具体落地为以下 4 种方案：

1. **互斥同步（阻塞锁 - 悲观策略）：**

- 使用 `synchronized` 关键字（JVM 层面）或 `ReentrantLock`（API 层面）。
- 通过加锁，保证同一时刻只有一个线程能修改共享变量，确保**原子性**和**可见性**。

1. **非阻塞同步（CAS - 乐观策略）：**

- 利用 CPU 指令集的 **CAS (Compare-And-Swap)** 原子指令。
- 典型实现是 JUC 包下的原子类（如 `AtomicInteger`）。适用于竞争不激烈的场景，避免了线程切换的开销。

1. **线程隔离（无同步）：**

- **栈封闭**：变量定义在方法内（局部变量），线程私有，天生安全。
- **ThreadLocal**：为每个线程提供一份独立的变量副本，互不干扰，以空间换时间。

1. **不可变对象（Immutable）：**

- 一旦创建，状态就不能被修改的对象。如 `String`、`Integer` 以及用 `final` 关键字修饰的属性。
- 这种对象天生线程安全，不需要任何同步手段。”

### 二、 代码层面对比

这里展示三种最主流的处理方式：**Synchronized** vs **Lock** vs **Atomic**。

```java
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.atomic.AtomicInteger;

public class ThreadSafetyDemo {

    // 共享变量
    private int count = 0;

    // 方案1：Atomic 原子类 (最推荐 - 性能好，代码少)
    private AtomicInteger atomicCount = new AtomicInteger(0);

    // 方案2：Lock 显式锁 (灵活)
    private final Lock lock = new ReentrantLock();

    // --- 方法对比 ---

    // 1. 使用 Atomic (CAS机制)
    public void incrementAtomic() {
        atomicCount.getAndIncrement(); 
    }

    // 2. 使用 Synchronized (JVM内置锁)
    public synchronized void incrementSync() {
        count++;
    }

    // 3. 使用 ReentrantLock (手动锁)
    public void incrementLock() {
        lock.lock(); // 手动加锁
        try {
            count++;
        } finally {
            lock.unlock(); // 【关键】必须在 finally 释放
        }
    }
}
```

### 三、 Fox的深度解析（降维打击）

如果面试官问：**“使用了 **`ConcurrentHashMap`** 或者 **`Vector`** 这种线程安全的集合，代码就一定线程安全了吗？”**

**Look at me!** 这是 P7 面试的必杀技。

**Fox版回答：**

“**不一定！** 虽然这些集合的**单个方法**（如 `put`、`get`、`add`）是原子的、线程安全的。 但是，**复合操作（Compound Operations）** 依然是不安全的！

**举个例子：**`if (!map.containsKey(key)) { map.put(key, value); }` 这是一个典型的 **Check-Then-Act（先检查后执行）** 模式。

就算 `containsKey` 和 `put` 都是线程安全的，但这两个操作之间**没有加锁**。 线程 A 刚检查完不存在，还没来得及 put，线程 B 抢先 put 进去了。线程 A 恢复执行后再 put，就会**覆盖** B 的数据。

**解决方案：** 必须使用 `ConcurrentHashMap` 提供的原子复合方法，比如 `putIfAbsent()`，或者在业务层面加锁。”
