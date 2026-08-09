---
title: "说下对AQS的理解"
sidebarGroup: "并发编程"
shortTitle: "说下对AQS的理解"
order: 237
date: 2026-07-19
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 说下对 AQS 的理解。Fox版标准回答：“AQS（抽象队列同步器）是 JUC 包下的核心组件，它是构建锁和其他同步组件（如 ReentrantLock、CountDownLatch）的基础框架。"
article: false
---

> 来源：[说下对AQS的理解](https://www.yuque.com/tulingzhouyu/db22bv/wgnennwlwmgpen55)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 说下对 AQS 的理解。

**Fox版标准回答：**

“AQS（抽象队列同步器）是 JUC 包下的核心组件，它是构建锁和其他同步组件（如 ReentrantLock、CountDownLatch）的**基础框架**。

它的核心思想可以概括为：**‘一个状态，一个队列，两个动作’**。

1. **核心数据结构**：

- **State（资源状态）**：内部维护了一个 `volatile int state` 变量。

- 比如 ReentrantLock 中，state=0 代表无锁，state>0 代表有锁及重入次数。
- 比如 Semaphore 中，state 代表剩余信号量的数量。

- **CLH 队列（等待队列）**：当线程抢不到资源（State）时，AQS 会把该线程封装成一个 **Node 节点**，扔到一个 **FIFO 的双向链表**中排队挂起。

1. **核心工作流程**：

- **加锁（Acquire）**：尝试用 **CAS** 操作修改 state。

- 如果成功，拿锁走人。
- 如果失败，封装成 Node 入队，并调用 `LockSupport.park()` 让线程阻塞。

- **解锁（Release）**：修改 state（通常是减 1）。

- 如果 state 归零，表示锁彻底释放，AQS 会唤醒（unpark）队列头部的线程去抢锁。

1. **设计模式**：

- AQS 使用了**模板方法模式 (Template Method Pattern)**。它封装了排队、阻塞、唤醒等复杂的底层逻辑，子类（如 ReentrantLock）只需要实现 `tryAcquire` 和 `tryRelease` 等简单的方法来定义‘什么是获取成功，什么是释放成功’即可。”

### 二、 图解 AQS 架构

面试时，脑子里必须有这张图。这是 AQS 的灵魂。

- **State**：资源的交通灯。
- **ExclusiveOwnerThread**：记录当前谁拿着锁。
- **CLH Queue**：没抢到锁的倒霉蛋们在这里排队。

![image](/面试题/并发编程/0237-lets-talk-about-understanding-aqs/img-14547f466509.png)

### 三、 代码实战：手写一个简单的锁

光说不练假把式。面试时如果你能说：“我可以用 AQS 几行代码写一个独占锁”，那杀伤力是核弹级的。

```java
import java.util.concurrent.locks.AbstractQueuedSynchronizer;

// 自定义一个简单的独占锁（不可重入）
public class MySimpleLock {

    // 静态内部类继承 AQS
    private static class Sync extends AbstractQueuedSynchronizer {

        // 1. 尝试获取锁
        @Override
        protected boolean tryAcquire(int arg) {
            // 利用 CAS 从 0 修改为 1
            if (compareAndSetState(0, 1)) {
                setExclusiveOwnerThread(Thread.currentThread()); // 记录霸占锁的线程
                return true;
            }
            return false;
        }

        // 2. 尝试释放锁
        @Override
        protected boolean tryRelease(int arg) {
            if (getState() == 0) throw new IllegalMonitorStateException();
            setExclusiveOwnerThread(null);
            setState(0); // 释放锁，state 归零
            return true;
        }

        // 提供 Condition
        Condition newCondition() { return new ConditionObject(); }
    }

    private final Sync sync = new Sync();

    public void lock() {
        sync.acquire(1); // 模板方法：会调用我们写的 tryAcquire，失败则自动入队阻塞
    }

    public void unlock() {
        sync.release(1); // 模板方法：会调用 tryRelease，成功则自动唤醒后续线程
    }
}
```

### 四、 深度解析

如果面试官追问：**“为什么 AQS 的队列是双向链表？单向不行吗？”**

**Fox版标准回答：**

“**不行！必须是双向的。**

1. **取消节点的移除**：当一个线程在排队时被中断（Interrupt）或超时，它需要把自己从队列中移除。双向链表通过 `prev` 指针可以快速找到前驱节点，方便修改指针关系，时间复杂度是 O(1)。如果是单向链表，还得从头遍历，是 O(N)。
2. **唤醒机制的健壮性**： 在 AQS 的 `unparkSuccessor`（唤醒后继）方法中，如果当前节点的后继节点是 null 或者是取消状态，AQS 会**从 tail 节点向前遍历**，找到最靠近头部的一个有效节点来唤醒。这必须依赖指向前驱的 `prev` 指针。 *(这里能提到‘从尾部向前遍历找有效节点’，面试官就知道你绝对看过源码。)*”
