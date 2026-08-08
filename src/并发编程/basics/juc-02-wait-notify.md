---
title: "线程等待与通知机制深入"
sidebarGroup: "并发基础"
shortTitle: "02 等待通知机制"
order: 2
date: 2026-11-08
category: "并发编程"
tag:
  - "并发编程"
  - "Java"
---

> **并发基础 · 第 2/5 篇**  
> 上一篇：[《为何学并发编程》](/并发编程/basics/juc-01-why-concurrency) · 下一篇：[《常用并发设计模式》](/并发编程/basics/juc-03-design-patterns)

---

## 开头：线程怎么「安全停下」、怎么「互相叫醒」？

后台监控线程要优雅退出；主线程要等子线程算完再读结果；两个线程要按条件协作——这些都离不开**终止机制**与**等待/通知**。粗暴 `stop()` 会丢锁、破坏一致性；轮询 `while` 又费 CPU 且不及时。

本篇覆盖：**两阶段终止思路**、中断机制、Java 线程模型与调度、管道通信、**volatile**、**wait/notify** 与 **LockSupport**。

![线程协作与通信主题](/并发编程/basics/01/p20-page.png)

---

## 一、如何正确终止线程

### 1.1 不要用 stop()

`stop()` 已废弃：可能在线程任意指令处抛出 `ThreadDeath`，并**不可控地释放所有锁**。转账示例中若在扣款后、加款前被 stop，会导致账户不一致且锁被异常释放。

![stop 方法的危险性](/并发编程/basics/01/p21-page.png)

### 1.2 中断机制

安全做法是调用目标线程的 **`interrupt()`**：

- 运行中的线程：仅设置中断标志，是否响应由业务决定。
- 阻塞在 `sleep` / `wait` / `join` 上：抛出 `InterruptedException`，且**清除中断标志**。

```java
Thread t1 = new Thread(() -> {
    while (true) {
        if (Thread.currentThread().isInterrupted()) {
            break;
        }
    }
}, "t1");
t1.start();
t1.interrupt();
```

相比自定义 boolean 标志，中断与阻塞 API 配合更好；注意**死锁中的线程无法被中断**。

![中断正常运行的线程](/并发编程/basics/01/p22-page.png)

![中断 sleep/wait/join 中的线程](/并发编程/basics/01/p23-page.png)

---

## 二、线程调度与 Java 线程实现

调度方式：**协同式**（线程主动让出）vs **抢占式**（OS 决定时间片）。HotSpot 采用 **1:1 内核线程模型**，Java 线程直接映射 OS 线程，调度交给操作系统，故为**抢占式**。

| 实现方式 | 说明 |
|----------|------|
| 1:1 内核线程 | 当前 HotSpot 主流 |
| 1:N 用户线程 | Go 等语言常见 |
| N:M 混合 | 用户线程 + 内核线程 |

Linux 上可通过 `getconf GNU_LIBPTHREAD_VERSION` 查看 pthread 实现（NPTL 等）。

![Linux NPTL 与用户线程实现](/并发编程/basics/01/p29-page.png)

![Java 线程 1:1 映射模型](/并发编程/basics/01/p32-page.png)

![Java 抢占式调度原因](/并发编程/basics/01/p24-page.png)

![内核线程与用户态/内核态](/并发编程/basics/01/p25-page.png)

### Java 21 虚拟线程（简要）

**Virtual Thread** 是轻量级用户态线程，适合**阻塞 I/O** 高并发；不适合 CPU 密集计算。用完即弃，**一般不需要池化**；Tomcat、Spring Boot 等已逐步支持。

```java
Thread.ofVirtual().start(() ->
    System.out.println(Thread.currentThread()));
```

![虚拟线程示例输出](/并发编程/basics/01/p26-page.png)

---

## 三、线程间通信

### 3.1 管道流

`PipedReader` / `PipedWriter`（字符）或字节管道，适合同 JVM 内线程传数据，媒介为内存。

![管道输入输出流示例](/并发编程/basics/01/p27-page.png)

### 3.2 volatile：最轻量的可见性

`volatile` 保证**写后对其它线程立即可见**，但不保证复合操作的原子性。典型场景：**一个线程写、多个线程读**（如停止标志）。

```java
private static volatile boolean stop = false;
// 子线程 while (!stop) ... 主线程 stop = true 后可退出
```

无 volatile 时，子线程可能永远看不到 `stop` 的变化（工作内存与主内存不一致，详见 JMM 篇）。

![volatile 保证可见性示例](/并发编程/basics/01/p28-01.png)

---

## 四、等待 / 通知机制

生产者改条件、消费者等待——用 `while` 轮询难以兼顾**及时性**与**CPU 开销**。  
**wait/notify** 基于对象监视器，是 Java 内置的等待唤醒原语。

### 4.1 等待方与通知方原则

**等待方**：

1. 获取锁  
2. 条件不满足则 `wait()`（释放锁，进入 WAITING）  
3. 被唤醒后**再次检查条件**（防止虚假唤醒）  
4. 执行业务  

**通知方**：

1. 获取锁  
2. 改变条件  
3. `notifyAll()`（优先于 `notify()`，避免唤醒错线程）

```java
synchronized (locker) {
    while (条件不满足) {
        locker.wait();
    }
    // 业务逻辑
}

synchronized (locker) {
    // 改变条件
    locker.notifyAll();
}
```

JMM 规定：线程对共享变量的操作在本地内存进行，写回/读取主内存由模型保证可见性——这与「为何 wait 前必须持锁」一脉相承。

![wait/notify 使用原则](/并发编程/basics/01/p30-01.png)

![wait/notify 协作流程](/并发编程/basics/01/p30-02.png)

### 4.2 示例

```java
Object locker = new Object();
Thread t1 = new Thread(() -> {
    synchronized (locker) {
        locker.wait();
    }
});
t1.start();
Thread.sleep(1000);
new Thread(() -> {
    synchronized (locker) {
        locker.notifyAll();
    }
}).start();
```

![WaitDemo 运行流程](/并发编程/basics/01/p31-page.png)

`join` 底层也依赖等待/通知：调用方阻塞直到被 join 线程结束。

![JMM 与 wait 持锁关系](/并发编程/basics/01/p35-01.png)

![join 与 wait/notify 的关系](/并发编程/basics/01/p33-page.png)

---

## 五、LockSupport

`LockSupport.park()` / `unpark(Thread)` 提供**许可**语义，类似二元信号量：

- 无需在 `synchronized` 内调用  
- **可以先 unpark 再 park**（wait 则不行）  
- 多次 unpark 效果等同一次  

AQS 中线程阻塞/唤醒即基于 LockSupport。

```java
LockSupport.park();           // 无许可则阻塞
LockSupport.unpark(thread);   // 发放许可
```

![LockSupport 与 wait/notify 对比](/并发编程/basics/01/p34-page.png)

---

## 小结

| 机制 | 适用 |
|------|------|
| interrupt + 标志位 | 优雅终止、退出阻塞 |
| volatile | 单写多读可见性 |
| wait/notify | 条件协作、经典监视器 |
| LockSupport | 灵活阻塞/唤醒、AQS 基础 |

下一篇把这些模式沉淀为**可复用的并发设计模式**（两阶段终止、Guarded Suspension 等）。

![本篇要点回顾](/并发编程/basics/01/p36-page.png)

![线程通信机制选型](/并发编程/basics/01/p37-page.png)

![等待通知与 LockSupport 对比表](/并发编程/basics/01/p38-page.png)

![并发基础第二篇收束](/并发编程/basics/01/p39-page.png)

![下篇设计模式预告](/并发编程/basics/01/p40-page.png)
