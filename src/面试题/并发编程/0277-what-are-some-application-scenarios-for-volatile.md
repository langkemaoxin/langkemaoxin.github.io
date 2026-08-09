---
title: "volatile有哪些应用场景？"
sidebarGroup: "并发编程"
shortTitle: "volatile有哪些应用场景？"
order: 277
date: 2026-07-13
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官：volatile 关键字主要用在哪些场景？Fox版标准回答：“volatile 的核心作用是保证**‘可见性’和‘禁止指令重排序’，但它不保证原子性**。基于这两个特性，它最经典的应用场景主要有两个"
article: false
---

> 来源：[volatile有哪些应用场景？](https://www.yuque.com/tulingzhouyu/db22bv/mxa0qbe0utm8m6kf)

## 一、 标准面试回答模版（建议背诵）

**面试官：**`volatile` 关键字主要用在哪些场景？

**Fox版标准回答：**

“`volatile` 的核心作用是保证**‘可见性’**和**‘禁止指令重排序’**，但它**不保证原子性**。基于这两个特性，它最经典的应用场景主要有两个：

1. **作为状态标志（Status Flag）：** 用于多线程之间的信号通知。比如控制线程的停止（shutdown）、或者某个服务的初始化完成状态。

- **逻辑：** 一个线程修改了标志位，其他线程能立刻‘看’到，从而停止循环或执行后续逻辑。
- **关键点：** 这里利用了 `volatile` 的**可见性**，且对该变量的写操作不依赖于当前值（即没有原子性问题）。

1. **双重检查锁定（DCL）的单例模式：** 这是 `volatile` 最“教科书”级的应用。

- **逻辑：** 在 `Double-Checked Locking` 实现单例时，`instance` 引用必须修饰为 `volatile`。
- **关键点：** 这里主要利用了 `volatile` 的**禁止指令重排序**特性，防止对象‘半初始化’导致其他线程拿到一个还没构造完成的空壳对象。”

## 二、 经典场景代码解析（Talk is cheap）

面试时，不要只说概念，直接把这两个场景的代码逻辑写出来（或口述出来），效果最好。

### 场景 1：状态标记量 (Status Flag)

**Look at me!** 这是最简单也最常用的场景。通常用来让一个线程通知另一个线程“该停了”。

```java
public class ShutdownTask implements Runnable {
    // 【关键】：必须用 volatile 修饰，保证主线程修改后，子线程能立刻感知
    private volatile boolean shutdown = false;

    public void shutdown() {
        this.shutdown = true;
    }

    @Override
    public void run() {
        // 只要 shutdown 为 false，就一直跑
        while (!shutdown) {
            // 执行业务逻辑...
            doWork();
        }
        System.out.println("任务收到停止信号，优雅退出...");
    }
}
```

### 场景 2：双重检查锁单例 (DCL - Double Checked Locking)

**Look at me!** 这段代码是面试重灾区。很多人知道要写 `volatile`，但不知道为什么。

```java
public class Singleton {
    // 【关键】：如果没有 volatile，这里可能会发生指令重排！
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        // 第一次检查：如果已经初始化了，就别抢锁了，提高性能
        if (instance == null) {
            synchronized (Singleton.class) {
                // 第二次检查：防止两个线程同时过了第一层检查
                if (instance == null) {
                    // 【核心爆发点】：这一行代码不是原子的！
                    instance = new Singleton(); 
                }
            }
        }
        return instance;
    }
}
```

---

## 三、 Fox的深度解析

如果面试官追问：“**为什么 DCL 单例中一定要加 **`volatile`**？不加会怎么样？**” 这时候你要展示你对底层（字节码/汇编）的理解。

**Fox版解析：**

“这主要是为了防止**‘对象半初始化’**问题。

`instance = new Singleton();` 这一行 Java 代码，在字节码层面其实分成了**三步**：

1. **memory = allocate();** // 1. 分配内存空间
2. **ctorInstance(memory);** // 2. 初始化对象（执行构造方法）
3. **instance = memory;** // 3. 将 instance 引用指向刚分配的内存地址

**问题在于：** 如果不加 `volatile`，编译器或 CPU 可能会进行**指令重排序**。 步骤可能会变成 **1 -> 3 -> 2**。

**后果：**

1. 线程 A 执行了步骤 1 和 3（引用指过去了），但步骤 2 （初始化）还没执行。
2. 此时 `instance` 已经不为 `null` 了（指向了一块还没初始化的内存）。
3. 线程 B 进来了，在第一次检查 `if (instance == null)` 时发现不为空。
4. 线程 B 直接拿走了这个**‘半成品’**对象去使用。
5. **结果：** 线程 B 访问该对象属性时，可能会报错或读到错误的数据（空指针或默认值）。

**结论：** 加上 `volatile` 后，会插入**内存屏障（Memory Barrier）**，强制禁止步骤 2 和 3 的重排序，保证了‘先初始化好，再把引用指过去’，从而保证了线程安全。”
