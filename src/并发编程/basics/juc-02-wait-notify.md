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

本篇覆盖：**如何正确终止线程**、线程调度与 Java 线程实现、管道通信、**volatile**、**wait/notify** 与 **LockSupport**。

---

## 一、如何正确终止线程

### 1.1 线程自然终止

线程 `run()` 执行完毕，或抛出未捕获异常提前结束，属于自然终止——这是唯一「正常」的结束路径。

### 1.2 不要用 stop()

`stop()` 已被 JDK 废弃。调用后无论 `run()` 是否执行完，都会**释放 CPU 与所有锁**，带来两类问题：

1. 可能在 `run()` 任意指令处抛出 `ThreadDeath`，行为不可控。
2. 锁被异常释放，破坏临界区一致性。

转账示例：线程 A 在「1 号账户减 100」之后被 `stop()`，2 号账户尚未加 100，锁却已释放——数据不一致且难以排查。

```java
public class ThreadStopDemo {
    private static final Object lock = new Object();
    private static int account1 = 1000;
    private static int account2 = 0;

    public static void main(String[] args) {
        Thread threadA = new Thread(new TransferTask(), "threadA");
        threadA.start();
        SleepTools.ms(50);
        threadA.stop(); // 危险：切勿使用
    }

    static class TransferTask implements Runnable {
        @Override
        public void run() {
            synchronized (lock) {
                System.out.println("开始转账...");
                account1 -= 100;
                SleepTools.ms(50); // 假设在此被 stop
                System.out.println("1号账户余额: " + account1);
                account2 += 100;
                System.out.println("2号账户余额: " + account2);
            }
        }
    }
}
```

### 1.3 中断机制

安全做法是调用目标线程的 **`interrupt()`**：相当于「打招呼式」的中断请求，线程是否响应由业务决定。

- **运行中的线程**：仅设置中断标志；需循环检查 `isInterrupted()` 或 `Thread.interrupted()`。
- **阻塞在 sleep / wait / join 上**：抛出 `InterruptedException`，且**清除中断标志**。

```java
Thread t1 = new Thread(() -> {
    while (true) {
        if (Thread.currentThread().isInterrupted()) {
            log.debug("中断状态: {}", true);
            break;
        }
    }
}, "t1");
t1.start();
t1.interrupt();
log.debug("中断状态：{}", t1.isInterrupted()); // true，标志未被清除
```

中断 `sleep` / `wait` / `join` 中的线程时，会抛异常并**清空中断状态**：

```java
Thread t1 = new Thread(() -> {
    while (true) {
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}, "t1");
t1.start();
Thread.sleep(100);
t1.interrupt();
log.debug("中断状态：{}", t1.isInterrupted()); // false，已被清除
```

**建议**：不要自定义 boolean 取消标志替代中断——阻塞 API 本身支持中断检查，且 `isInterrupted()` 与取消语义一致。**注意：死锁中的线程无法被中断。**

---

## 二、线程调度与 Java 线程实现

### 2.1 协同式 vs 抢占式

| 方式 | 特点 |
|------|------|
| **协同式** | 线程主动让出 CPU；实现简单，但一个线程阻塞可能拖死进程 |
| **抢占式** | 由 OS 决定时间片；单线程故障不会阻塞整个进程 |

Java 线程调度是**抢占式**——因为 HotSpot 采用 **1:1 内核线程模型**，调度权在操作系统。

`Thread.yield()` 仅提示让出 CPU；线程无法主动「多要时间片」，只能通过**优先级**（1～10，默认 5）影响调度提示——实际效果依赖 OS，不可依赖优先级保证正确性。

### 2.2 三种线程实现方式

| 模型 | 说明 | 典型 |
|------|------|------|
| **1:1 内核线程** | 每个 Java 线程映射 OS 线程 | HotSpot 主流 |
| **1:N 用户线程** | 多用户线程映射少量内核线程 | 早期 JVM、Go 等 |
| **N:M 混合** | 用户线程 + 内核线程混合 | 部分运行时 |

**内核线程**：由 OS 调度，阻塞不影响整进程；创建/切换需用户态↔内核态切换，单进程线程数有限。

**用户线程**：完全在用户态调度，切换快、可海量创建；阻塞与多核映射由运行时自己解决，实现复杂。Java 早期 Classic 虚拟机曾用用户线程，JDK 1.3 起主流改为 1:1。

Linux 上可通过 `getconf GNU_LIBPTHREAD_VERSION` 查看 pthread 实现（LinuxThreads / NPTL 等）。

### 2.3 Java 21 虚拟线程（简要）

**Virtual Thread** 是轻量级用户态线程，适合**阻塞 I/O** 高并发；**不适合 CPU 密集**——不会跑得更快，只是规模更大。用完即弃，**一般不需要池化**；Tomcat、Spring Boot 等已逐步支持。

```java
Thread.ofPlatform().start(() ->
    System.out.println(Thread.currentThread()));

Thread vt = Thread.ofVirtual().start(() ->
    System.out.println(Thread.currentThread()));
vt.join();
// 输出示例：VirtualThread[#23]/runnable@ForkJoinPool-1-worker-1
```

---

## 三、线程间通信

### 3.1 管道流

Java 提供内存媒介的管道机制：`PipedOutputStream` / `PipedInputStream`（字节）或 `PipedReader` / `PipedWriter`（字符）。

典型场景：生成文件后直接经管道上传云端，跳过「写磁盘再读磁盘」一步。

```java
PipedWriter out = new PipedWriter();
PipedReader in = new PipedReader();
out.connect(in); // 必须 connect，否则 IOException

Thread printThread = new Thread(new Print(in), "PrintThread");
printThread.start();

int receive;
while ((receive = System.in.read()) != -1) {
    out.write(receive);
}
out.close();
```

### 3.2 volatile：最轻量的可见性

`volatile` 保证：**一个线程修改后，其它线程立即可见**。但不保证复合操作的原子性。

典型场景：**一个线程写、多个线程读**（如停止标志）。

```java
private static volatile boolean stop = false;

// 子线程
while (!stop) { /* ... */ }

// 主线程
Thread.sleep(1000);
stop = true;
```

无 `volatile` 时，子线程可能永远看不到 `stop` 的变化（工作内存与主内存不一致，详见 JMM 篇）。

![volatile 保证可见性示例](/并发编程/basics/01/p28-01.png)

---

## 四、等待 / 通知机制

生产者改条件、消费者等待——用 `while` 轮询难以兼顾**及时性**与 **CPU 开销**（睡眠太短费 CPU，太长不及时）。**wait/notify** 基于对象监视器，是 Java 内置的等待唤醒原语。

JMM 规定：线程对共享变量的操作在本地内存进行，写回/读取主内存由模型保证可见性——这与「为何 wait 前必须持锁」一脉相承。

`Thread.join()` 本质是等待/通知：调用方阻塞直到被 join 线程结束，从调用方角度看是**同步**等待异步完成，但多个 join 串联时并行意义减弱。

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

**API 要点**：

| 方法 | 说明 |
|------|------|
| `wait()` | 进入 WAITING，**释放锁**；被唤醒后须重新竞争锁 |
| `wait(long ms)` | 限时等待 |
| `notify()` | 唤醒一个等待线程（无法指定是哪一个） |
| `notifyAll()` | 唤醒所有等待线程 |

![wait/notify 使用原则](/并发编程/basics/01/p30-01.png)

![wait/notify 协作流程](/并发编程/basics/01/p30-02.png)

### 4.2 示例

```java
Object locker = new Object();

Thread t1 = new Thread(() -> {
    try {
        System.out.println("wait开始");
        synchronized (locker) {
            locker.wait();
        }
        System.out.println("wait结束");
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
});
t1.start();
Thread.sleep(1000);

new Thread(() -> {
    synchronized (locker) {
        System.out.println("notify开始");
        locker.notifyAll();
        System.out.println("notify结束");
    }
}).start();
```

![JMM 与 wait 持锁关系](/并发编程/basics/01/p35-01.png)

---

## 五、LockSupport

`LockSupport.park()` / `unpark(Thread)` 提供**许可**语义，类似二元信号量：

- 无需在 `synchronized` 内调用  
- **可以先 unpark 再 park**（wait 则不行）  
- 多次 unpark 效果等同一次  

AQS 中线程阻塞/唤醒即基于 LockSupport。

```java
Thread parkThread = new Thread(() -> {
    System.out.println("ParkThread开始执行");
    LockSupport.park();
    System.out.println("ParkThread执行完成");
});
parkThread.start();
Thread.sleep(1000);
LockSupport.unpark(parkThread);
```

| 对比 | wait/notify | LockSupport |
|------|-------------|-------------|
| 持锁 | 必须在 synchronized 内 | 任意处调用 |
| 顺序 | 必须先 wait 再 notify | 可先 unpark 再 park |
| 唤醒范围 | 同一监视器上的等待线程 | 指定 Thread |

---

## 小结

| 机制 | 适用 |
|------|------|
| interrupt + 标志位 | 优雅终止、退出阻塞 |
| volatile | 单写多读可见性 |
| wait/notify | 条件协作、经典监视器 |
| LockSupport | 灵活阻塞/唤醒、AQS 基础 |

下一篇把这些模式沉淀为**可复用的并发设计模式**（两阶段终止、Guarded Suspension 等）。
