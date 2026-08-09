---
title: "线程池中线程复用原理"
sidebarGroup: "并发编程"
shortTitle: "线程池中线程复用原理"
order: 281
date: 2026-06-06
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 线程池里的线程执行完一个任务后，为什么不会销毁？它是怎么实现复用的？Fox版标准回答：“线程池的线程复用机制，核心在于 Worker 类的内部死循环 和 阻塞队列的阻塞等待。包装机制：线程池将底层"
article: false
---

> 来源：[线程池中线程复用原理](https://www.yuque.com/tulingzhouyu/db22bv/gxouhkcgzcdhw5hg)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 线程池里的线程执行完一个任务后，为什么不会销毁？它是怎么实现复用的？

**Fox版标准回答：**

“线程池的线程复用机制，核心在于 `Worker`** 类的内部死循环** 和 **阻塞队列的阻塞等待**。

1. **包装机制**：线程池将底层的 `Thread` 包装成了一个内部类 `Worker`。`Worker` 实现了 `Runnable` 接口。
2. **循环执行（核心）**：`Worker` 启动后，执行的是 `runWorker` 方法。这个方法内部是一个 `while`** 死循环**。它会不断地调用 `getTask()` 方法从阻塞队列中获取任务。
3. **直接调用 run()**：拿到任务后，`Worker` 是直接调用 `task.run()` 来执行业务逻辑，而不是调用 `task.start()`。这意味着任务是在**当前 Worker 线程**中同步执行的，没有创建新线程，从而实现了复用。
4. **阻塞保活**：当队列为空时，`getTask()` 方法会调用阻塞队列的 `take()` 方法，利用 `LockSupport.park()` 让当前线程**挂起（阻塞）**。线程此时处于 WAITING 状态，不占用 CPU 也不销毁，直到有新任务提交将其唤醒。”

### 二、 源码级解析（带代码证据）

口说无凭，面试时如果你能手写出这两段核心伪代码，直接杀光比赛。

#### 1. 复用的核心：`runWorker` 的死循环

这是 `ThreadPoolExecutor` 里最关键的代码片段。

```java
final void runWorker(Worker w) {
Runnable task = w.firstTask;
w.firstTask = null;

// 【Look at me】这就是复用的真相：while循环！
// 只要 task 不为空，或者 getTask() 能拿出来任务，线程就不死！
while (task != null || (task = getTask()) != null) { 
    try {
        // 钩子方法
        beforeExecute(wt, task);
        try {
            // 【高能预警】：
            // 这里直接调用 run()，把 task 当成普通对象的方法执行！
            // 绝对不是 start()，否则就变成新线程了！
            task.run(); 
        } finally {
            afterExecute(task, null);
        }
    } finally {
        // 做完一个任务，置空，准备下次循环去 getTask() 拿新任务
        task = null; 
    }
}
// 只有跳出循环（getTask返回null），线程才会真正销毁
processWorkerExit(w, completedAbruptly);
}
```

#### 2. 存活的关键：`getTask` 的阻塞机制

为什么线程执行完任务不退出？因为它卡在 `getTask` 里了。

```java
private Runnable getTask() {
    boolean timedOut = false; 

    for (;;) {
        // ... 省略状态检查 ...

        try {
            // workQueue 是阻塞队列（BlockingQueue）

            // 核心线程：调用 take()。
            // 如果队列空了，take() 会利用 LockSupport.park() 把线程挂起。
            // 线程就停在这里不动了，也不会销毁，直到有新任务入队把它唤醒。
            Runnable r = timed ? 
            workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
            workQueue.take();

            if (r != null) return r;

            // 如果是 poll 超时了还没拿到任务，这就意味着非核心线程该销毁了
            timedOut = true; 
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}
```

### 三、 这一题的杀手锏

如果想让面试官觉得你“精通”，一定要补上这句总结：

**“所以，简单来说： **`Thread.start()`** 只是开启了一个可以执行代码的载体（Worker）。 而真正的业务任务（Runnable），只是这个载体上不断被替换、不断被执行的‘数据’而已。 载体是不变的，变的是载体上跑的数据。”**
