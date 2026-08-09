---
title: "说说你对JMM内存模型的理解"
sidebarGroup: "并发编程"
shortTitle: "说说你对JMM内存模型的理解"
order: 272
date: 2026-01-22
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 说说你对 JMM（Java 内存模型）的理解。Fox版标准回答：“JMM (Java Memory Model) 是 Java 虚拟机规范中定义的一种抽象概念（注意：它不是物理存在的），用于屏蔽各"
article: false
---

> 来源：[说说你对JMM内存模型的理解](https://www.yuque.com/tulingzhouyu/db22bv/mif500gkwpd4hngq)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 说说你对 JMM（Java 内存模型）的理解。

**Fox版标准回答：**

“JMM (Java Memory Model) 是 Java 虚拟机规范中定义的一种**抽象概念**（注意：它不是物理存在的），用于屏蔽各种硬件和操作系统的内存访问差异，保证 Java 程序在各种平台下对内存的访问都能达到一致的效果。

它的核心理解包含三个维度：

1. **内存划分（物理架构的映射）：**

- **主内存（Main Memory）：** 所有变量都存在这里，所有线程共享（对应物理硬件的 RAM）。
- **工作内存（Working Memory）：** 每个线程私有的。线程不能直接读写主内存的变量，必须先把变量 **Copy** 到自己的工作内存中，操作完后再写回主内存（对应 CPU 的 Cache 和寄存器）。

1. **三大特性（并发编程的灵魂）：**

- **原子性 (Atomicity)：** 一个操作要么全部执行，要么全不执行。JMM 只能保证基本读取和赋值的原子性，复合操作需要 `synchronized` 或 `Atomic` 类。
- **可见性 (Visibility)：** 当一个线程修改了共享变量，其他线程能立刻看到。核心实现是 `volatile`、`synchronized` 和 `final`。
- **有序性 (Ordering)：** 防止编译器和处理器为了优化性能而进行的**指令重排序**。核心实现是 `volatile`（内存屏障）和 `synchronized`。

1. **Happens-Before 原则（先行发生原则）：**

- 这是 JMM 的**核心保底规则**。如果两个操作满足 Happens-Before 关系（比如 volatile 写先于读、锁释放先于锁获取），则 JVM 保证前一个操作的结果对后一个操作可见，且不进行重排序。这是判断线程安全与否的最主要依据。”

### 二、 图解 JMM 架构

面试时，脑海里一定要有这张图。

![image](/面试题/并发编程/0272-tell-me-about-your-understanding-of-the-jmm-memory-model/img-1192273d2487.png)

这也是 JMM 存在问题的根源：**工作内存的数据可能和主内存不一致**。

### 三、 代码实战：可见性问题的“照妖镜”

这段代码直接证明了：**如果没有 JMM 的可见性保证，线程会死循环。**

```java
public class JMMVisibilityDemo {

    // 场景：如果不加 volatile，run 线程永远停不下来！
    // 因为它一直在读自己工作内存里的旧值 (false)
    private static boolean flag = true; 

    // 正确做法：加上 volatile，保证可见性
    // private static volatile boolean flag = true; 

    public static void main(String[] args) throws InterruptedException {

        new Thread(() -> {
            System.out.println("子线程开始运行...");
            // 【死循环陷阱】
            // 这里的 flag，线程会从主内存拷一份到自己的工作内存（Cache）。
            // 如果主线程改了 flag，但没有通知子线程刷新的话，
            // 子线程会一直用缓存里的旧值，导致死循环。
            while (flag) {
                // do nothing
            }
            System.out.println("子线程检测到 flag 变为 false，停止运行！");
        }).start();

        Thread.sleep(1000); // 保证子线程先跑起来

        System.out.println("主线程把 flag 改为 false...");
        flag = false; // 修改共享变量
        // 此时，如果是 volatile 变量，会强制将新值刷回主内存，
        // 并让其他线程的工作内存缓存失效。
    }
}
```

---

### 四、 Fox的深度解析

如果面试官追问：**“JMM 和 JVM 运行时内存区域（堆、栈）是一回事吗？”**

**Fox版回答：**

“**完全不是一回事！** 这是初学者最容易混淆的点。

- **JVM 运行时数据区（Runtime Data Area）：** 讲的是 **Java 程序在内存中是怎么存放的**。比如对象在堆里，局部变量在栈里。这是**物理存储**维度的描述。
- **JMM（Java Memory Model）：** 讲的是 **多线程间怎么通过内存进行通信的**。它是一组**规则**和**协议**。

**对应关系**： JMM 中的**主内存**，大致对应 JVM 的**堆（Heap）中存放对象实例数据部分。 JMM 中的工作内存**，大致对应 **JVM 的虚拟机栈（Stack）**以及底层硬件的 **CPU 寄存器和高速缓存（Cache）**。

所以，一个是‘仓库怎么盖’（JVM内存结构），一个是‘货怎么运’（JMM模型），维度不同。”
