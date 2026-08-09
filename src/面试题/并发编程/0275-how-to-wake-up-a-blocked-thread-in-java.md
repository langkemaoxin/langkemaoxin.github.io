---
title: "JAVA 中怎样唤醒一个阻塞的线程"
sidebarGroup: "并发编程"
shortTitle: "JAVA 中怎样唤醒一个阻塞的线程"
order: 275
date: 2026-07-31
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： Java 中怎样唤醒一个阻塞的线程？Fox版标准回答：“唤醒一个阻塞的线程，必须先看它是怎么被阻塞的。主要有三种场景，对应三种不同的唤醒方式：因 Object.wait() 而阻塞（WAITING"
article: false
---

> 来源：[JAVA 中怎样唤醒一个阻塞的线程](https://www.yuque.com/tulingzhouyu/db22bv/tanyoblbtrbxy9gx)

### 一、 标准面试回答模版（建议背诵）

**面试官：** Java 中怎样唤醒一个阻塞的线程？

**Fox版标准回答：**

“唤醒一个阻塞的线程，必须先看它是**怎么被阻塞的**。主要有三种场景，对应三种不同的唤醒方式：

1. **因 **`Object.wait()`** 而阻塞（WAITING）：**

- **手段**：必须由另一个线程在**同一个对象锁**上调用 `notify()` 或 `notifyAll()` 方法。
- **结果**：线程会从等待队列（Wait Set）移动到同步队列（Entry List），也就是从 WAITING 变为 BLOCKED 状态，准备抢锁。

1. **因 **`LockSupport.park()`** 而阻塞（WAITING/TIMED_WAITING）：**

- **手段**：这是 JUC 锁（如 ReentrantLock）底层的机制。需要调用 `LockSupport.unpark(thread)`。
- **结果**：线程会直接从挂起状态恢复运行，**不需要**持有 Monitor 锁。

1. **因 **`sleep()`**, **`join()`** 或 **`wait()`** 而阻塞（中断唤醒）：**

- **手段**：调用该线程对象的 `interrupt()` 方法。
- **结果**：目标线程会抛出 `InterruptedException` 异常，从而‘被迫’醒来（结束阻塞状态）。

**避坑补充**：如果是因争抢 `synchronized` 锁失败而进入 **BLOCKED** 状态的线程，是**无法**被显式唤醒的（连 `interrupt` 都没用）。它只能被动等待持有锁的线程释放锁。”

### 二、 代码层面对比（Talk is cheap）

面试时，展示这三种最典型的唤醒方式。

#### 1. 经典方式：wait / notify

这是基于 JVM 内置 Monitor 机制的。

```java
public class WaitNotifyDemo {
    private static final Object lock = new Object();

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            synchronized (lock) {
                try {
                    System.out.println("T1: 我先睡了 (wait)...");
                    lock.wait(); // 释放锁，进入 WAITING
                } catch (InterruptedException e) { e.printStackTrace(); }
                System.out.println("T1: 谁叫醒了我？(Resumed)");
            }
        });
        t1.start();

        Thread.sleep(100); // 保证 T1 先 wait

        new Thread(() -> {
            synchronized (lock) {
                System.out.println("T2: 我来叫醒你 (notify)...");
                lock.notify(); // 唤醒 T1
            }
        }).start();
    }
}
```

#### 2. JUC 方式：LockSupport (park / unpark)

这是 Java 并发包（AQS）的基石，更灵活，**不需要在同步块中调用**。

```java
import java.util.concurrent.locks.LockSupport;

public class ParkUnparkDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            System.out.println("T1: 我被挂起了 (park)...");
            LockSupport.park(); // 阻塞当前线程
            System.out.println("T1: 我被放行了 (unpark)!");
        });
        t1.start();

        Thread.sleep(100);

        System.out.println("Main: 发放通行证 (unpark)...");
        // 【优势】直接指定唤醒某个线程，不需要拿锁
        LockSupport.unpark(t1); 
    }
}
```

#### 3. 暴力方式：Interrupt (中断异常)

适用于想要**终止**或**打断**长时间等待的场景。

```java
public class InterruptDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            try {
                System.out.println("T1: 准备睡 10 秒...");
                Thread.sleep(10000); 
            } catch (InterruptedException e) {
                System.out.println("T1: 哎呀！被中断异常叫醒了！");
            }
        });
        t1.start();

        Thread.sleep(100);
        System.out.println("Main: 别睡了，起来嗨！(interrupt)");
        t1.interrupt(); // 抛出异常唤醒
    }
}
```

### 三、 Fox的深度解析

如果面试官追问：**“为什么不推荐使用 **`Thread.stop()`** 来强行唤醒/停止线程？”**

**Fox版回答：**

“`stop()` 是被**废弃（Deprecated）的方法，它太暴力了。 就像电脑直接拔电源一样，它会立即释放**线程持有的所有锁，导致数据可能只写了一半，破坏了**数据的一致性**。

现在的标准做法是利用 **中断机制（Interrupt）**。 `interrupt()` 只是给线程打个招呼（设置标志位），至于线程是想立马停下，还是处理完手头工作再停下，控制权在**线程自己**手里（通过 catch 异常或检查 `isInterrupted`）。这叫‘**优雅停机**’。”
