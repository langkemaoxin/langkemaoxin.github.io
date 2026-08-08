---
title: "常用并发设计模式——两阶段终止等"
sidebarGroup: "并发基础"
shortTitle: "03 并发设计模式"
order: 3
date: 2026-11-09
category: "并发编程"
tag:
  - "并发编程"
  - "Java"
---

> **并发基础 · 第 3/5 篇**  
> 上一篇：[《线程等待与通知机制深入》](/并发编程/basics/juc-02-wait-notify) · 下一篇：[《原子性、可见性、有序性与 JMM》](/并发编程/basics/juc-04-jmm)

---

## 开头：模式比 API 清单更管用

「怎么优雅停线程？」「怎么让线程 A 等 B 的结果？」「读多写少怎么少加锁？」——反复出现的不是新 API，而是**固定协作结构**。把结构命名成模式，讨论和落地都会快很多。

本篇梳理：**两阶段终止**、避免共享（不可变 / COW / ThreadLocal）、**Guarded Suspension** 与 **Balking**、以及 **Thread-Per-Message / Worker Thread / 生产者-消费者** 三类分工模式。

![并发设计模式总览](/并发编程/basics/01b/p01-01.png)

---

## 一、优雅终止：两阶段终止（Two-phase Termination）

**问题**：在线程 T1 中如何优雅终止 T2？

**思路**：

1. **阶段一（发送终止请求）**：`interrupt()` 把休眠中的线程唤醒到 RUNNABLE。  
2. **阶段二（真正退出）**：线程检查 **volatile 终止标志** 或中断状态，完成清理后退出 `run()`。

终止指令 = **`interrupt()` + 终止标志位**。

![两阶段终止模式示意](/并发编程/basics/01b/p03-page.png)

### 1.1 监控线程示例

```java
public class MonitorThread extends Thread {
    private volatile boolean terminated = false;

    public void run() {
        while (!terminated) {
            // 监控逻辑
            try { Thread.sleep(1000); } catch (InterruptedException e) { /* ... */ }
        }
        releaseResources();
    }

    public void terminate() {
        terminated = true;
        try { join(5000); } catch (InterruptedException e) { /* ... */ }
    }
}
```

结合中断时循环条件可写：`while (!Thread.interrupted() && !terminated)`，在 `catch InterruptedException` 里 **`Thread.currentThread().interrupt()`** 恢复标志。

![带中断的两阶段终止](/并发编程/basics/01b/p04-page.png)

![MonitorThread 运行流程](/并发编程/basics/01b/p05-page.png)

### 1.2 优雅终止线程池

| 方法 | 行为 |
|------|------|
| `shutdown()` | 不再接新任务，等队列与执行中任务完成 |
| `shutdownNow()` | 尝试中断执行中线程，返回未执行任务列表 |

推荐：`shutdown()` + `awaitTermination(timeout)`，超时再 `shutdownNow()`，且任务内正确处理中断。

![线程池 shutdown 示例](/并发编程/basics/01b/p06-page.png)

**注意**：

- 仅检查标志位不够——线程可能处于休眠。  
- 仅检查中断不够——第三方库 catch 了 `InterruptedException` 却未恢复中断位。  
- **标志位 + interrupt** 双保险更可靠。

![两阶段终止注意事项](/并发编程/basics/01b/p07-page.png)

![terminate 与 interrupt 配合](/并发编程/basics/01b/p08-page.png)

---

## 二、避免共享的设计模式

核心：**没有共享，就没有竞争**（读多写少时可只读共享）。

### 2.1 不可变（Immutability）

对象创建后状态不变 → 天然线程安全。JDK 中 `String`、包装类等即如此。

注意边界：`final` 引用不变，**引用指向的对象内部仍可变**；不可变对象也需**正确发布**（安全初始化）。

![不可变模式要点](/并发编程/basics/01b/p10-page.png)

### 2.2 写时复制（Copy-on-Write）

写时复制整份结构再替换引用，读无锁。`CopyOnWriteArrayList`、Linux `fork()` 写时复制、`String` 部分语义均与此相关。

缺点：写开销与 GC 压力；适合**读极多、写极少**（路由表、配置快照等）。

![Copy-on-Write 原理](/并发编程/basics/01b/p12-page.png)

### 2.3 线程本地存储（Thread-Specific Storage）

每个线程一份副本 → **以空间换时间**。Java 即 `ThreadLocal`（下系列异步篇详述）。

在线程池中使用时务必 **`remove()`**，避免泄漏。

![ThreadLocal 模式示意](/并发编程/basics/01b/p13-page.png)

---

## 三、多线程版 if：Guarded Suspension 与 Balking

### 3.1 守护挂起（Guarded Suspension）

线程在**条件不满足时 wait**，满足后被 notify——多线程版 `if + wait`。  
`join`、`Future.get` 均属此类。

```java
public class GuardedObject<T> {
    private T obj;

    public synchronized T get() {
        while (obj == null) {
            this.wait();
        }
        return obj;
    }

    public synchronized void complete(T obj) {
        this.obj = obj;
        this.notifyAll();
    }
}
```

底层可对应：`synchronized + wait/notify`、`ReentrantLock + Condition`、`CAS + park/unpark`。

![GuardedObject 实现](/并发编程/basics/01b/p14-page.png)

![Guarded Suspension 应用场景](/并发编程/basics/01b/p15-page.png)

### 3.2 避免执行（Balking）

条件不满足则**直接返回**，不等待——与 Guarded Suspension 相对。  
典型：**自动存盘**（无修改则跳过）、**DCL 单例**外圈判断、synchronized 轻量锁膨胀前的退避。

```java
void autoSave() {
    synchronized (this) {
        if (!changed) return;
        changed = false;
    }
    execSave();
}
```

![Balking 自动存盘示例](/并发编程/basics/01b/p16-page.png)

![Balking 单次初始化](/并发编程/basics/01b/p17-page.png)

---

## 四、多线程分工模式

### 4.1 Thread-Per-Message

每个请求一个线程——实现简单，但 Java 线程重，高并发下易 OOM；Go 等轻量线程更适合纯 TPM。

![每请求一线程的服务端模型](/并发编程/basics/01b/p18-page.png)

### 4.2 Worker Thread（线程池）

固定工人池消化任务，避免频繁创建销毁。工程上**禁止随意 `new Thread()`、统一线程池**是常见规范。

![线程池版服务端](/并发编程/basics/01b/p19-page.png)

![Worker Thread 模式优点](/并发编程/basics/01b/p20-page.png)

### 4.3 生产者-消费者

**队列**解耦生产与消费，支持异步、削峰填谷。

**过饱问题**（生产峰值 > 消费速度）：

| 场景 | 对策 |
|------|------|
| 日产量 > 日消费 | 消费者加机器 |
| 峰值塞满但全天能消化 | 适当加大队列 |
| 队列不能很大 | 生产者限流 |

业务上只要在**容忍的最长响应时间**内消化堆积，就不算过饱。

![BlockingQueue 生产者消费者示例](/并发编程/basics/01b/p21-page.png)

![生产者-消费者优点与过饱方案](/并发编程/basics/01b/p22-page.png)

![三种分工模式对比](/并发编程/basics/01b/p23-page.png)

---

## 小结

- **终止**：两阶段 + 线程池 `shutdown/awaitTermination`。  
- **少共享**：不可变、COW、ThreadLocal。  
- **协作**：Guarded Suspension（等条件）vs Balking（条件不对就走）。  
- **分工**：TPM → 线程池 → 队列流水线。

下一篇从**原子性、可见性、有序性**进入 JMM 底层。

![本篇模式速查](/并发编程/basics/01b/p24-page.png)
