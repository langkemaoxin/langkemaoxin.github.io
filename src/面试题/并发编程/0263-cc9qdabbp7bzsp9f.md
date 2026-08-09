---
title: "JAVA 中用到的线程调度算法是什么"
sidebarGroup: "并发编程"
shortTitle: "JAVA 中用到的线程调度算法是什么"
order: 263
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： Java 中用到的线程调度算法是什么？Fox版标准回答：“Java 虚拟机本身并不直接实现复杂的线程调度算法，而是委托给底层的操作系统来处理。核心模式：抢占式调度 (Preemptive Sche"
article: false
---

> 来源：[JAVA 中用到的线程调度算法是什么](https://www.yuque.com/tulingzhouyu/db22bv/cc9qdabbp7bzsp9f)

### 一、 标准面试回答模版（建议背诵）

**面试官：** Java 中用到的线程调度算法是什么？

**Fox版标准回答：**

“Java 虚拟机本身**并不直接实现**复杂的线程调度算法，而是**委托给底层的操作系统**来处理。

1. **核心模式：抢占式调度 (Preemptive Scheduling)**

- Java 的线程（Platform Thread）是**1:1 映射**到操作系统的内核级线程（KLT）上的。
- 因此，Java 采用的是**抢占式优先级调度**算法。
- **机制**：每个线程都有机会获得 CPU 时间片。当一个线程的时间片用完，或者有一个更高优先级的线程就绪，操作系统会强制剥夺当前线程的 CPU 使用权，切换给下一个线程。这也避免了单线程独占 CPU 导致系统假死。

1. **辅助机制：优先级 (Priority)**

- Java 提供了 `Thread.setPriority(1~10)` 方法，但这只是给操作系统的一个**‘建议’（Hint）**。
- 操作系统不一定采纳。因为不同 OS 的优先级等级不一样（比如 Linux 的 nice 值），Java 的 1-10 无法完美映射，甚至在某些场景下会被 OS 忽略。

1. **特例（JDK 21+ 虚拟线程）：**

- 如果是 JDK 21 引入的**虚拟线程（Virtual Thread）**，则由 JVM 内部的调度器（基于 `ForkJoinPool`）进行**协作式调度**，不再完全依赖 OS。”

### 二、 代码层面对比

面试时，写这段代码证明“**Java 的优先级是不靠谱的**”，能直接证明你懂底层实现。

```java
public class PriorityDemo {
    public static void main(String[] args) {

        // 线程1：最高优先级
        Thread high = new Thread(() -> {
            while(true) { System.out.println("--- High Priority Running"); }
        });
        high.setPriority(Thread.MAX_PRIORITY); // 设置为10

        // 线程2：最低优先级
        Thread low = new Thread(() -> {
            while(true) { System.out.println("Low Priority Running"); }
        });
        low.setPriority(Thread.MIN_PRIORITY); // 设置为1

        // 【Look at me】
        // 理论上 High 应该比 Low 抢到更多 CPU。
        // 但在实际运行中，你会发现 Low 依然会频繁打印！
        // 这证明了：Java 无法强制控制调度，控制权在操作系统手里。
        low.start();
        high.start();
    }
}
```

### 三、 深度解析（Fox 杀手锏：时间片与协同式）

如果面试官追问：“除了抢占式，还有什么调度方式？Java 为什么不用？”

**回答：**

“除了抢占式，还有**协同式调度 (Cooperative Scheduling)**。

- **协同式**：线程执行时间由线程自己控制，线程不主动让出 CPU（比如调用 `yield`），别的线程就永远没机会执行。
- **Java 不用的原因**：太危险！如果一个线程写了死循环或者阻塞了，整个 JVM 甚至整个系统都会卡死（参考 Windows 3.x 时代）。
- **抢占式的好处**：系统拥有最高控制权，通过**时间片轮转（Time Slicing）**，保证所有线程雨露均沾，任何一个线程挂了都不会拖垮整个系统。”

### 四、 避坑指南（关于 Yield）

面试中经常会问到 `Thread.yield()`。

**Fox 提醒：**

“`Thread.yield()` 本质上也是一种基于抢占式调度的‘礼让’**行为。 它告诉 CPU：‘我现在不急，可以把时间片让给**同优先级**或**更高优先级的线程’。

但是！这依然只是个**建议**。CPU 可能完全无视这个建议，刚让出去，下一毫秒又调度回你了。所以在生产业务逻辑中，**千万不要依赖 yield 来控制执行顺序！**”
