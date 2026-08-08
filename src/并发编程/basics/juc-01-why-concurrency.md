---
title: "为何学并发编程——线程与等待通知入门"
sidebarGroup: "并发基础"
shortTitle: "01 为何学并发"
order: 1
date: 2026-11-07
category: "并发编程"
tag:
  - "并发编程"
  - "Java"
---

> **并发基础 · 第 1/5 篇**  
> 下一篇：[《线程等待与通知机制深入》](/并发编程/basics/juc-02-wait-notify)

---

## 开头：为什么后端开发绕不开并发？

订单、库存、支付各自跑在不同线程里；网关要同时处理成千上万连接；报表任务和接口请求共享同一台机器——**并发不是「高级特性」，而是日常工作的默认背景**。不懂线程怎么创建、怎么协作，排查「偶发卡死」「数据不对」时会非常被动。

本篇从**为什么要学并发**出发，梳理进程与线程、上下文切换、并发与并行的区别，再到 Java 里如何创建线程、认识线程状态与常用 API，为后续 wait/notify 和 JMM 打底。

![并发编程学习路线概览](/并发编程/basics/01/p01-01.png)

---

## 一、为什么要学并发编程

并发编程与性能优化紧密相关，典型收益有三类：

1. **加快响应**：多线程并行处理 I/O 或计算，缩短用户等待时间（多线程下载、静态资源多域名并行加载等）。
2. **模块化与异步化**：如下单与发短信/邮件拆成独立任务，由不同线程执行，结构更清晰。
3. **充分利用 CPU**：多核环境下单线程无法吃满算力；合理设计多线程程序可在多个核心上同时推进任务。

单核 CPU 同样受益：以聊天程序为例，键盘输入、网络收发、界面刷新可交替进行；若不能并发处理，对话只能严格一问一答。

![并发编程的三类收益](/并发编程/basics/01/p04-page.png)

---

## 二、进程与线程

**进程**是程序运行时的实例：指令与数据从磁盘加载到内存，由操作系统分配资源（以内存为主）。**线程**是 CPU 调度的最小单位，依附于进程存在，共享进程资源，切换成本通常低于进程切换。

| 维度 | 进程 | 线程 |
|------|------|------|
| 隔离 | 基本相互独立 | 同进程内共享内存 |
| 通信 | IPC / 网络协议 | 共享变量、管道等 |
| 开销 | 创建与切换较重 | 更轻量 |

![进程与线程的关系](/并发编程/basics/01/p05-page.png)

### CPU 核心数与逻辑处理器

主流 CPU 为多核；Intel 超线程下可能出现「6 核 12 线程」——**逻辑处理器数**可能大于物理核心数。Java 中可用 `Runtime.getRuntime().availableProcessors()` 获取逻辑核心数，线程池大小等调优常与此相关。

![CPU 核心与逻辑处理器](/并发编程/basics/01/p06-page.png)

---

## 三、上下文切换、并发与并行

**上下文切换**：CPU 从一个线程切到另一个时，保存/恢复寄存器、程序计数器等状态。一次切换约数千到数万时钟周期，属于较高开销。

**并发（Concurrent）**：单核上多任务交替执行，微观串行、宏观并行。  
**并行（Parallel）**：多核上多任务真正同时执行。

![并发与并行的区别](/并发编程/basics/01/p07-page.png)

---

## 四、Java 天生是多线程程序

从 `main` 方法启动的也是一个名为 `main` 的线程。即使用户未显式创建线程，JVM 也会启动 Reference Handler、Finalizer、Signal Dispatcher 等系统线程。

```java
public class OnlyMain {
    public static void main(String[] args) {
        ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
        ThreadInfo[] threadInfos = threadMXBean.dumpAllThreads(false, false);
        for (ThreadInfo threadInfo : threadInfos) {
            System.out.println("[" + threadInfo.getThreadId() + "] "
                    + threadInfo.getThreadName());
        }
    }
}
```

![JVM 自带系统线程示例](/并发编程/basics/01/p08-page.png)

---

## 五、创建与启动线程

| 方式 | 说明 |
|------|------|
| 继承 `Thread` / 匿名 `Thread` | 线程与任务合在一处 |
| 实现 `Runnable` | 任务与线程分离，更灵活 |
| `FutureTask` + `Callable` | 可返回结果、可声明受检异常 |

```java
// Runnable + Lambda
Runnable task = () -> log.debug("hello");
Thread t = new Thread(task, "t2");
t.start();

// FutureTask
FutureTask<Integer> task3 = new FutureTask<>(() -> {
    log.debug("hello");
    return 100;
});
new Thread(task3, "t3").start();
Integer result = task3.get();
```

**面试常考点**：官方说法创建「用于执行的线程」有两种——派生 `Thread` 或实现 `Runnable`；`Callable` 经 `FutureTask` 包装后本质仍交给 `Thread`；线程池是资源复用而非新的创建方式。

- `start()`：让线程进入就绪队列，由 OS 调度执行 `run()`，**只能调用一次**。
- `run()`：普通方法，可重复调用，不会启动新线程。

![三种创建线程的方式对比](/并发编程/basics/01/p09-page.png)

---

## 六、线程状态与常用方法

JDK 中 `Thread.State` 共六种：**NEW → RUNNABLE → BLOCKED / WAITING / TIMED_WAITING → TERMINATED**。

![Java 线程六种状态](/并发编程/basics/01/p11-page.png)

常用方法摘要：

| 方法 | 作用 |
|------|------|
| `start()` / `run()` | 启动 vs 普通调用 |
| `join()` / `join(long)` | 等待线程结束 |
| `sleep(long)` | 进入 TIMED_WAITING，**不释放锁** |
| `yield()` | 提示让出 CPU，进入 RUNNABLE |
| `interrupt()` | 设置中断标志；阻塞方法可能抛 `InterruptedException` |
| `isInterrupted()` / `interrupted()` | 查询中断；后者会清除标志 |

![线程常用方法说明](/并发编程/basics/01/p12-page.png)

### sleep 与 yield

- `sleep`：阻塞，适合无需锁同步的等待。
- `yield`：不释放锁，仅让出时间片；`ConcurrentHashMap#initTable` 等处用 yield 减少阻塞带来的上下文切换。

避免 `while(true)` 空转浪费 CPU，可用 `sleep` 或 `yield` 让出使用权。

![sleep 与 yield 的使用场景](/并发编程/basics/01/p13-page.png)

### 线程优先级

`setPriority(1~10)` 仅作调度提示，**不同 JVM/OS 下效果不可靠**，不要依赖优先级保证正确性。

![线程优先级说明](/并发编程/basics/01/p14-page.png)

---

## 七、join：同步 vs 异步

主线程与 `t1` 并行时，若 `t1` 里 `count = 5` 尚未完成，主线程可能先打印 `count = 0`。  
`join()` 让调用方等待目标线程结束，属于**同步**；不等结果继续跑则是**异步**。

```java
Thread t1 = new Thread(() -> {
    SleepTools.second(1);
    count = 5;
}, "t1");
t1.start();
t1.join();
log.debug("结果为:{}", count); // 5
```

**经典面试**：T1、T2、T3 顺序执行——在 T2 中 `t1.join()`，在 T3 中 `t2.join()`。

![join 实现线程顺序执行](/并发编程/basics/01/p15-01.png)

---

## 八、守护线程

**守护线程（Daemon）**：所有非守护线程结束后，守护线程会被强制终止（如 GC 线程）。  
`setDaemon(true)` 须在 `start()` 之前调用。适合心跳、后台监听等「进程退出即可丢弃」的任务。

![守护线程示例](/并发编程/basics/01/p16-page.png)

---

## 小结

- 并发编程服务于**性能、结构与资源利用**，是多核与 I/O 密集场景的必备能力。
- 先弄清**进程/线程、并发/并行、上下文切换**，再掌握 Java **三种创建方式**与**六种状态**。
- `join`、守护线程、中断（下篇展开）是线程协作的入门工具。

下一篇进入**等待/通知、volatile 与 LockSupport**。

![本篇知识结构小结](/并发编程/basics/01/p17-page.png)

![join 同步语义示意图](/并发编程/basics/01/p18-01.png)

![线程创建方式面试要点](/并发编程/basics/01/p19-page.png)

![并发基础第一篇收束](/并发编程/basics/01/p20-page.png)
