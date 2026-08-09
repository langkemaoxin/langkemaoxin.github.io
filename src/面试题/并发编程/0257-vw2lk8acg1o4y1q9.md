---
title: "说说并发和并行的区别"
sidebarGroup: "并发编程"
shortTitle: "说说并发和并行的区别"
order: 257
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "面试官： 说说并发（Concurrency）和并行（Parallelism）的区别。Fox版标准回答：“并发和并行虽然经常一起出现，但它们描述的维度完全不同。核心定义的区别：并发（Concurrency）是逻辑上的同时处理。它指的是系统具有"
article: false
---

> 来源：[说说并发和并行的区别](https://www.yuque.com/tulingzhouyu/db22bv/vw2lk8acg1o4y1q9)

**面试官：** 说说并发（Concurrency）和并行（Parallelism）的区别。

**Fox版标准回答：**

“并发和并行虽然经常一起出现，但它们描述的维度完全不同。

1. **核心定义的区别**：

- **并发（Concurrency）是逻辑上的同时处理**。它指的是系统具有**处理**多个任务的能力。在单核 CPU 上，通过时间片轮转（Context Switch），让多个任务交替执行，给人一种‘同时在做’的错觉。
- **并行（Parallelism）是物理上的同时执行**。它指的是系统具有**同时执行**多个任务的能力。这必须依赖**多核 CPU**，多个任务在不同的核心上，在同一时刻真正地一起跑。

1. **关键差异（一句话总结）**：

- **并发**是关于**结构**的，它解决的是‘怎么利用等待时间’的问题（比如 IO 阻塞时切换去做别的事）。
- **并行**是关于**执行**的，它解决的是‘怎么利用多核算力’的问题（提高吞吐量）。

1. **存在关系**：

- 你可以有并发但没有并行（例如：单核 CPU 跑多线程）。
- 并行往往建立在并发的设计基础之上（你需要先把任务拆分并发，才能丢给多核去并行）。”

### 二、 图解与类比（Fox 独家记忆法）

如果面试官皱眉，立刻甩出这个类比，让他秒懂：

- **并发（Concurrency）**： 你是一个人（单核），你要**一边吃面，一边回微信**。 你不能同时把面塞嘴里又打字。你是吃一口面，放下筷子，回一条信息，再拿起筷子吃面。 *宏观上看，你在做两件事；微观上看，你在快速切换。*
- **并行（Parallelism）**： 你和你朋友两个人（双核），坐在饭桌上。 **你在吃面，你朋友在回微信**。 *同一时刻，两件事都在发生，互不干扰。*

### 三、 代码层面的体现（Java视角的真相）

在 Java 代码中，我们写的 `Thread` 只是定义了**并发的结构**。至于它到底是不是**并行**，Java 说了不算，**操作系统和硬件说了算**。

```java
public class ConcurrencyVsParallelism {

    public static void main(String[] args) {
        // 模拟任务
        Runnable task = () -> {
            String threadName = Thread.currentThread().getName();
            System.out.println(threadName + " 正在运行...");
            // 模拟CPU计算
            long sum = 0;
            for (int i = 0; i < 1000000; i++) { sum += i; }
        };

        // 【场景一：并发 (单核环境模拟)】
        // 假设我们将程序限制在单核CPU上运行（通过taskset等命令）
        // 即使启动两个线程，CPU也只能在一个核心上切来切去。
        // T1执行 -> 挂起 -> T2执行 -> 挂起 -> T1执行...

        // 【场景二：并行 (多核环境)】
        // 现代电脑通常都是多核。
        // 当我们启动两个线程时，操作系统会发现有两个空闲核心。
        // 于是把 T1 扔给 Core-0，把 T2 扔给 Core-1。
        // 这时候，才是真正的并行。

        Thread t1 = new Thread(task, "Thread-1");
        Thread t2 = new Thread(task, "Thread-2");

        t1.start();
        t2.start();
    }
}
```

---

### 四、 Fox的降维打击（引用大神语录）

如果想让回答更有逼格，最后加上这一句 Go 语言之父 **Rob Pike** 的名言：

**“Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once.”**

（并发是关于**应对**很多事情，并行是关于**做**很多事情。）

视频： [串行、并发、并行的区别与联系你知道多少？](https://open.douyin.com/player/video?vid=7566181848020192558&autoplay=0)
