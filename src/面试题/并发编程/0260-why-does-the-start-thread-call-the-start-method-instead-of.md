---
title: "启动线程为何调用start而不是run方法"
sidebarGroup: "并发编程"
shortTitle: "启动线程为何调用start而不是run方法"
order: 260
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 启动线程为何调用 start() 而不是 run()？Fox版标准回答：“这不仅是方法名的区别，更是资源调度和方法调用的区别。run() 只是普通方法调用"
article: false
---

> 来源：[启动线程为何调用start而不是run方法](https://www.yuque.com/tulingzhouyu/db22bv/cb2gdq7s7dydefer)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 启动线程为何调用 `start()` 而不是 `run()`？

**Fox版标准回答：**

“这不仅是方法名的区别，更是**资源调度**和**方法调用**的区别。

1. `run()`** 只是普通方法调用**： 如果直接调用 `run()`，它仅仅是在**当前线程**（比如 main 线程）中调用了一个普通的 Java 方法。代码会**顺序执行**，不会创建新的调用栈，也就无法实现并发。
2. `start()`** 才是启动线程**： 调用 `start()` 方法时，JVM 会执行一系列复杂的底层操作：

- 首先检查线程状态（确保未被启动过）。
- 然后调用 `private native void start0()` 本地方法。
- **关键点**：`start0()` 会请求操作系统分配系统级资源，创建一个新的**原生线程（Native Thread）**，并分配新的**程序计数器**和**虚拟机栈**。
- 最后，这个新诞生的线程会自动回调 `run()` 方法。

**一句话总结：调用 **`run()`** 是在‘原来的路’上跑，调用 **`start()`** 是修了一条‘新的路’去跑。**”

### 二、 代码层面对比（Talk is cheap）

这段代码直接打印出执行线程的名字，真相一目了然。

```java
public class StartVsRunDemo {
    public static void main(String[] args) {

        Thread thread = new Thread(() -> {
            // 打印当前执行任务的线程名字
            System.out.println("当前执行线程: " + Thread.currentThread().getName());
        });

        // 场景1：直接调用 run()
        System.out.println("--- 调用 run() ---");
        thread.run(); 
        // 结果：打印 "main"。
        // 说明：依然是主线程在干活，根本没有多线程并发。

        // 场景2：调用 start()
        System.out.println("--- 调用 start() ---");
        thread.start();
        // 结果：打印 "Thread-0"。
        // 说明：JVM 开启了一个全新的线程来执行任务。
    }
}
```

---

### 三、 源码级解析（Fox 杀手锏）

如果面试官想深挖，你要能把 JDK 里的 `start()` 方法逻辑说出来，这才是 **P7 级别的回答**。

打开 `java.lang.Thread` 源码：

```java
public synchronized void start() {
    // 1. 【状态检查】
    // 线程的状态必须是 0 (NEW)。
    // 这也是为什么同一个线程不能调用两次 start() 的原因，会抛 IllegalThreadStateException。
    if (threadStatus != 0)
        throw new IllegalThreadStateException();

    // 2. 加入线程组
    group.add(this);

    boolean started = false;
    try {
        // 3. 【核心调用】
        // 调用本地方法 start0()
        start0(); 
        started = true;
    } finally {
        if (!started) {
            group.threadStartFailed(this);
        }
    }
}

// 这是底层 C++ 实现的入口，它负责与操作系统交互
private native void start0();
```

**解析：**

- `synchronized`：`start` 方法是加锁的，保证了状态检查和启动过程的原子性。
- `start0()`：这是一个 `native` 方法。在 JVM (Hotspot) 的 C++ 源码中，它最终会调用操作系统的 API（如 Linux 的 `pthread_create`）来真正创建一个内核级线程。
- 只有当这个内核线程创建成功后，JVM 才会回调 Java 层面的 `run()` 方法。

### 四、 Fox的避坑指南

如果面试官追问：**“如果我非要调用两次 **`start()`** 会怎么样？”**

**回答：**

“会抛出 `IllegalThreadStateException` 异常。 因为 `start()` 方法第一行就在检查 `threadStatus`。 一旦线程启动，状态就变了（不再是 NEW），即使线程执行完变成了 TERMINATED 状态，也不能再次复用 `start()` 重新启动。 **线程是属于一次性消耗品，想复用任务，请用线程池！**”

**附录**：start的jvm源码分析
