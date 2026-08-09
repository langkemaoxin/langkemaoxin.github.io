---
title: "锁的优化机制了解吗"
sidebarGroup: "并发编程"
shortTitle: "锁的优化机制了解吗"
order: 270
date: 2026-06-06
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 了解锁的优化机制吗？（或者问：JDK 1.6 对 synchronized 做了哪些优化？）Fox版标准回答：“JDK 1.6 之后，为了彻底解决 synchronized 重量级锁性能低下的问题"
article: false
---

> 来源：[锁的优化机制了解吗](https://www.yuque.com/tulingzhouyu/db22bv/zo7ggsr0o0xg9ghk)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 了解锁的优化机制吗？（或者问：JDK 1.6 对 synchronized 做了哪些优化？）

**Fox版标准回答：**

“JDK 1.6 之后，为了彻底解决 `synchronized` 重量级锁性能低下的问题，引入了大量的优化技术。

它的核心机制可以归纳为‘**运行时锁升级’和‘编译时锁优化**’两个层面：

1. **运行时锁升级（核心）：**

锁的状态不再是一成不变的，而是根据竞争情况，遵循由轻到重、不可降级的流转过程：

**无锁 ——> 偏向锁 ——> 轻量级锁 ——> 自适应自旋（膨胀过渡） ——> 重量级锁**。

1. **编译时优化（JIT）：**

编译器在编译过程中，通过静态分析，会智能地进行锁消除（Lock Elimination）和锁粗化（Lock Coarsening），进一步减少不必要的加锁开销。”

### 第二部分：底层流转逻辑

“接下来我详细拆解一下锁的升级流程，这里有一个关键的**自旋时机**经常被人搞错：

1. **偏向锁 (Biased Lock)**：

- **场景**：只有一个线程访问。
- **原理**：修改 Mark Word，记录当前线程 ID。下次该线程再来，对比 ID 成功直接放行。**全程无锁，无 CAS，性能最高。**

1. **轻量级锁 (Lightweight Lock)**：

- **场景**：线程交替执行，无强竞争。
- **原理**：偏向锁失效后升级。线程在栈帧中创建 `Lock Record`，通过 **CAS** 将 Mark Word 指向该记录。
- **关键点**：轻量级锁本身**只依靠 CAS**，**不涉及自旋**。

1. **自适应自旋 (Adaptive Spinning) —— 锁膨胀的缓冲防线**：

- **场景**：轻量级锁 CAS 失败（意味着有竞争），但在彻底挂起线程之前。
- **原理**：JVM 赌持有锁的线程很快会释放，于是让当前线程‘空转’（自旋）一会儿。

- 如果自旋期间拿到了锁，避免了内核态切换，大赚。
- 如果自旋超时，赌输了，才会进入下一步。

- **自适应**：自旋次数不固定，由前一次在同一个锁上的自旋结果动态决定。

1. **重量级锁 (Heavyweight Lock)**：

- **场景**：自旋也失败了，彻底放弃治疗。
- **原理**：Mark Word 指向堆中的 **Monitor** 对象。线程进入 **BLOCKED** 状态，调用操作系统 Mutex Lock 挂起等待。”

### 第三部分：代码证据

“除了理论，我在研究底层时，还关注到了 JIT 编译器的优化以及如何验证锁状态，以下是我的代码实践。”

#### 1. JIT 编译器优化（锁消除与锁粗化）

```java
public class JITOptimizationDemo {

    /**
     * 场景A：锁消除 (Lock Elimination)
     * 原理：JIT 通过逃逸分析发现 sb 是局部变量，属于“栈封闭”，
     * 根本不可能被其他线程访问。所以这里的 synchronized 会被 JIT 直接擦除。
     */
    public void lockElimination() {
        StringBuffer sb = new StringBuffer();
        sb.append("Hello"); // synchronized 方法
        sb.append("Fox");
    }

    /**
     * 场景B：锁粗化 (Lock Coarsening)
     * 原理：JIT 发现循环内频繁加锁解锁，性能损耗大。
     * 优化后：将锁的范围扩大到循环体外部，只加一次锁。
     */
    public void lockCoarsening() {
        StringBuffer sb = new StringBuffer();
        // 优化前：100次加锁解锁
        // 优化后：synchronized(sb) { for... } 1次加锁
        for (int i = 0; i < 100; i++) {
            sb.append(i);
        }
    }
}
```

#### 2. 验证锁升级（使用 JOL 工具）

“为了亲眼看到锁升级，我们可以使用 `openjdk.jol` 工具打印对象头：”

```java
import org.openjdk.jol.info.ClassLayout;

public class LockUpgradeVerify {
    public static void main(String[] args) {
        Object obj = new Object();

        // 1. 打印无锁状态 (Mark Word最后三位 001)
        System.out.println(ClassLayout.parseInstance(obj).toPrintable());

        new Thread(() -> {
            synchronized (obj) {
                // 2. 打印轻量级锁状态 (Mark Word最后两位 00)
                // 指向栈帧 Lock Record
                System.out.println(ClassLayout.parseInstance(obj).toPrintable());
            }
        }).start();

        // ... 通过制造竞争，可以看到最后两位变为 10 (Monitor) ...
    }
}
```

### 第四部分：Fox的面试压箱底（降维打击）

“最后，我想补充两个**反直觉**的生产环境细节：

1. **偏向锁的‘死刑’：**

虽然教科书上都讲偏向锁，但在高并发实战中，它往往弊大于利（撤销成本高）。所以 JDK 15 默认禁用偏向锁，JDK 18 彻底废弃。面试时提到这一点，说明我们紧跟技术前沿。

1. **对象头位图 (Mark Word Bitmask)：**

锁的本质就是修改对象头最后两位的 tag：

- **01**：无锁/偏向
- **00**：轻量级锁（Ptr to Stack）
- 10：重量级锁（Ptr to Monitor）

这也是我看 Hotspot 源码学到的。”

![image](/面试题/并发编程/0270-do-you-understand-the-optimization-mechanism-of-the-lock/img-6b0dbd4a61c6.png)

## 拓展：

### 锁升级的流程分析

![image](/面试题/并发编程/0270-do-you-understand-the-optimization-mechanism-of-the-lock/img-0b47244f6547.png)

### synchronized源码分析

**偏向锁源码分析**

[https://www.processon.com/view/link/6188c6c95653bb1471107283](https://www.processon.com/view/link/6188c6c95653bb1471107283)

**轻量级锁源码分析**

[https://www.processon.com/view/link/618e7dd61e0853689b0c0df0](https://www.processon.com/view/link/618e7dd61e0853689b0c0df0)

**重量级锁源码分析**

[https://www.processon.com/view/link/618e7e1b7d9c08562aec6638](https://www.processon.com/view/link/618e7e1b7d9c08562aec6638)

拓展视频：

[轻量级锁会自旋吗？它和重量级锁的区别是什么？](https://open.douyin.com/player/video?vid=7442300142285294888&autoplay=0)
