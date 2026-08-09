---
title: "Java线程之间是如何通信的"
sidebarGroup: "并发编程"
shortTitle: "Java线程之间是如何通信的"
order: 261
date: 2026-06-04
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： Java 线程之间是如何进行通信的？Fox版标准回答：“Java 线程通信本质上是基于 共享内存（Shared Memory） 模型实现的。我们可以把它分为三个层次：最基础的通信（基于 volat"
article: false
---

> 来源：[Java线程之间是如何通信的](https://www.yuque.com/tulingzhouyu/db22bv/rmghkxavpbo58igi)

### 一、 标准面试回答模版（建议背诵）

**面试官：** Java 线程之间是如何进行通信的？

**Fox版标准回答：**

“Java 线程通信本质上是基于 **共享内存（Shared Memory）** 模型实现的。我们可以把它分为三个层次：

1. **最基础的通信（基于 volatile/synchronized）：**

- 通过读写同一个**共享变量**来交换信息。
- 必须配合 `volatile` 关键字保证**可见性**，或使用 `synchronized` 保证**原子性**和**可见性**，确保一个线程修改了数据，另一个线程能立马看到。

1. **等待/通知机制（基于 Object 或 Condition）：**

- **经典版**：使用 `Object` 类的 `wait()` 和 `notify()/notifyAll()`。这是基于 Monitor 实现的，必须在 `synchronized` 块内使用。
- **进阶版**：使用 `ReentrantLock` 结合 `Condition` 的 `await()` 和 `signal()`。它能实现更精准的线程唤醒（比如指定唤醒某个等待队列）。

1. **高级并发工具（基于 JUC）：**

- **管道通信**：`BlockingQueue`（生产者-消费者模型），利用队列作为缓冲区，实现线程间的数据传输和解耦。
- **协作工具**：`CountDownLatch`（倒计时）、`CyclicBarrier`（循环栅栏）、`Semaphore`（信号量），用于控制线程的执行顺序和并发数量。
- **结果回传**：`Future` 和 `CompletableFuture`，用于主线程获取子线程的执行结果。”

---

### 二、 代码层面对比

面试时，手写一个“**两个线程交替打印 A 和 B**”的例子，是最能体现“通信”逻辑的。

#### 1. 经典方案：Object wait/notify

这是 JDK 1.0 就有的老祖宗方法，必须掌握。

```java
public class WaitNotifyDemo {
    private static final Object lock = new Object();
    private static boolean flag = true; // true 打印 A，false 打印 B

    public static void main(String[] args) {

        // 线程A
        new Thread(() -> {
            while (true) {
                synchronized (lock) {
                    // 【Look at me】坑点：必须用 while 判断，防止虚假唤醒
                    while (!flag) { 
                        try { lock.wait(); } catch (InterruptedException e) {}
                    }
                    System.out.println("A");
                    flag = false; // 修改信号
                    lock.notify(); // 唤醒别人
                }
            }
        }).start();

        // 线程B
        new Thread(() -> {
            while (true) {
                synchronized (lock) {
                    while (flag) {
                        try { lock.wait(); } catch (InterruptedException e) {}
                    }
                    System.out.println("B");
                    flag = true; // 修改信号
                    lock.notify(); // 唤醒别人
                }
            }
        }).start();
    }
}
```

#### 2. 进阶方案：BlockingQueue (最推荐)

在实际生产中，我们很少直接写 wait/notify，而是用队列。这才是**P7架构师**的思维。

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class QueueDemo {
    public static void main(String[] args) {
        // 创建一个容量为1的队列，充当“传声筒”
        BlockingQueue&lt;String&gt; queue = new ArrayBlockingQueue<>(1);

        // 生产者线程
        new Thread(() -> {
            try {
                System.out.println("生产者：我把消息放进去了...");
                queue.put("Hello, Fox!"); // 满了会自动阻塞
            } catch (InterruptedException e) { e.printStackTrace(); }
        }).start();

        // 消费者线程
        new Thread(() -> {
            try {
                String msg = queue.take(); // 空了会自动阻塞
                System.out.println("消费者：我收到消息了 -> " + msg);
            } catch (InterruptedException e) { e.printStackTrace(); }
        }).start();
    }
}
```

---

### 三、 Fox的避坑指南（面试杀手锏）

如果面试官让你写 wait/notify，一定要注意那个“死坑”——**虚假唤醒 (Spurious Wakeup)**。

**面试官：** 为什么你的代码里用 `while (flag)` 而不是 `if (flag)`？

**Fox版回答：**

“**Look at me!** 这是多线程编程的**第一铁律**！ 在 Java 的 `Object.wait()` javadoc 中明确写了，线程有可能在没有被 `notify` 的情况下莫名其妙地醒来，这叫**虚假唤醒**。

如果用 `if`，线程醒来后不会再次检查条件，直接往下执行，就会导致逻辑错误（比如队列空了还去取数据，报错）。 使用 `while`，线程醒来后会**再次检查**条件是否满足，如果不满足继续睡。这才是健壮的代码！”
