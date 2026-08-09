---
title: "为什么 wait 和 notify 方法要在同步块中调用"
sidebarGroup: "并发编程"
shortTitle: "为什么 wait 和 notify 方法要在同步块中调用"
order: 266
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 为什么 wait 和 notify 方法要在同步块（synchronized）中调用？Fox版标准回答：“这主要有两个原因：一个是强制语法约束，一个是底层逻辑保护。语法层面（直接后果）："
article: false
---

> 来源：[为什么 wait 和 notify 方法要在同步块中调用](https://www.yuque.com/tulingzhouyu/db22bv/mw8d3os8ky6qlml8)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 为什么 `wait` 和 `notify` 方法要在同步块（synchronized）中调用？

**Fox版标准回答：**

“这主要有两个原因：一个是**强制语法约束**，一个是**底层逻辑保护**。

1. **语法层面（直接后果）**：

- Java 强制规定，调用 `wait()` 或 `notify()` 的线程必须先持有该对象的**Monitor（监视器锁）**。
- 如果在没有加锁的情况下调用，JVM 会直接抛出 `IllegalMonitorStateException` 异常。

1. **逻辑层面（核心原因 - 满分关键）**：

- 是为了防止**‘丢失唤醒问题’（Lost Wake-up Problem）**。
- `wait()` 往往是伴随着**条件检查**（如 `while(!condition)`）使用的。如果没有同步块，线程在‘检查条件’和‘执行 wait’之间可能会发生**上下文切换**。
- 如果在切换期间，另一个线程修改了条件并调用了 `notify()`，而挂起的线程还没来得及 `wait`，它就会**错过这次唤醒信号**，导致后续无故死等。
- 同步块保证了‘检查条件 + 进入等待’这两个动作是**原子**的，不可被打断。”

### 二、 代码层面对比

#### 1. 错误示范（如果 Java 不强制报错，逻辑会死在哪里？）

假设 Java 允许不加锁调用（仅做逻辑演示），会发生什么？

```java
class Buffer {
    boolean isEmpty = true;

    // 消费者线程
    void consume() {
        // 【Step 1】检查条件：发现是空的
        while (isEmpty) {
            // ---> 假设线程在这里被切走了！Context Switch <---

            // 【Step 4】回来执行 wait，但刚才的 notify 信号已经发过了！
            // 结果：线程永远在这里死等，尽管现在 isEmpty 其实是 false。
            wait(); 
        }
    }

    // 生产者线程
    void produce() {
        isEmpty = false;
        // 【Step 2】修改条件
        // 【Step 3】发出通知
        notify(); 
    }
}
```

#### 2. 正确示范（加锁保证原子性）

```java
public class WaitNotifyDemo {
    private final Object lock = new Object();
    private boolean condition = false;

    public void doWait() {
        // 1. 必须先拿锁！
        synchronized (lock) {
            // 2. 检查条件（必须用 while）
            while (!condition) {
                try {
                    System.out.println("条件不满足，我先睡了...");
                    // 3. 释放锁并进入等待（原子操作，不会被打断）
                    lock.wait(); 
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            System.out.println("被唤醒了，开始干活！");
        }
    }

    public void doNotify() {
        synchronized (lock) {
            System.out.println("我来通知你了！");
            condition = true;
            // 4. 发出通知
            lock.notify(); 
        }
    }
}
```

---

### 三、 Fox的深度解析（降维打击）

如果面试官问：“能具体讲讲什么是**丢失唤醒（Lost Wake-up）**吗？”

你需要用这个生活案例让他秒懂：

**Fox版解析：**

“想象一下‘查房’的场景。

1. **没有锁的情况（竞态条件）：** 我（消费者）看了一眼房间，没人（条件满足）。 **就在我准备关灯睡觉等待（执行 wait）的前一秒**，你（生产者）突然冲进来带了个人进来，并且大喊一声‘人来了！’（执行 notify）。 但我那时候还没睡着，没听到你的喊声。 等我真正睡着（wait）的时候，信号已经丢了。我就再也醒不来了。
2. **有锁的情况（原子性）：** 我进房间把门反锁（synchronized）。 我看一眼没人才去睡觉。 在我睡觉之前，你根本进不来，也就没法修改状态或发信号。 只有我完全进入睡眠状态并释放锁，你才能进来叫醒我。 **这就保证了：只要我睡了，我就一定能收到你的唤醒。**”

视频：[wait()为什么要写在while循环里？写在if里不行吗?](https://open.douyin.com/player/video?vid=7582884572786969908&autoplay=0)
