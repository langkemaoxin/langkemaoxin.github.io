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

**收益**：优雅退出、可执行清理、灵活设置终止条件。适用于服务器应用、大规模并发系统、定时任务、数据处理、消息订阅等需要正确释放资源的场景。

### 1.1 监控线程示例

```java
public class MonitorThread extends Thread {
    private volatile boolean terminated = false;

    public void run() {
        while (!terminated) {
            System.out.println("监控线程正在执行监控操作...");
            try { Thread.sleep(1000); } catch (InterruptedException e) { e.printStackTrace(); }
        }
        System.out.println("监控线程正在执行清理操作...");
        releaseResources();
    }

    public void terminate() {
        terminated = true;
        try { join(5000); } catch (InterruptedException e) { e.printStackTrace(); }
    }

    private void releaseResources() {
        System.out.println("监控线程正在释放资源和进行必要的清理工作...");
    }
}
```

结合中断时循环条件可写：`while (!Thread.interrupted() && !terminated)`，在 `catch InterruptedException` 里 **`Thread.currentThread().interrupt()`** 恢复标志：

```java
public void run() {
    while (!Thread.interrupted() && !terminated) {
        try { Thread.sleep(1000); }
        catch (InterruptedException e) {
            System.out.println("监控线程被中断，准备退出...");
            Thread.currentThread().interrupt();
        }
    }
    releaseResources();
}
// terminate() 中可改为 thread.interrupt() 而非仅设标志
```

### 1.2 优雅终止线程池

| 方法 | 行为 |
|------|------|
| `shutdown()` | 不再接新任务，等队列与执行中任务完成 |
| `shutdownNow()` | 尝试中断执行中线程，返回未执行任务列表 |

推荐：`shutdown()` + `awaitTermination(timeout)`，超时再 `shutdownNow()`，且任务内正确处理中断：

```java
ExecutorService executorService = Executors.newFixedThreadPool(5);
for (int i = 0; i < 10; i++) {
    executorService.submit(() -> {
        try {
            System.out.println(Thread.currentThread().getName() + "正在执行任务...");
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            System.out.println(Thread.currentThread().getName() + "任务执行完毕");
        }
    });
}
executorService.shutdown();
boolean terminated = executorService.awaitTermination(8, TimeUnit.SECONDS);
if (!terminated) {
    List<Runnable> tasks = executorService.shutdownNow();
    System.out.println("剩余未执行的任务数：" + tasks.size());
}
```

**注意**：

- 仅检查标志位不够——线程可能处于休眠。  
- 仅检查中断不够——第三方库 catch 了 `InterruptedException` 却未恢复中断位。  
- **标志位 + interrupt** 双保险更可靠。

---

## 二、避免共享的设计模式

核心：**没有共享，就没有竞争**（读多写少时可只读共享）。

### 2.1 不可变（Immutability）

对象创建后状态不变 → 天然线程安全。JDK 中 `String`、包装类等即如此。

**实现要点**：类与字段 `final`、只提供读方法、正确发布对象。

**注意边界**：

- `final` 引用不变，**引用指向的对象内部仍可变**。  
- 不可变对象也需**正确发布**；持有不可变对象的容器本身仍可能线程不安全。

```java
final class Foo {
    final int age = 0;
    final String name = "abc";
}
// Bar 线程不安全：foo 引用可被 setFoo 替换
class Bar {
    Foo foo;
    void setFoo(Foo f) { this.foo = f; }
}
```

**适用**：缓存快照、值对象、配置信息等读多写少场景。频繁修改状态时不适合。

### 2.2 写时复制（Copy-on-Write）

写时复制整份结构再替换引用，读无锁。`CopyOnWriteArrayList`、Linux `fork()` 写时复制、`String` 部分语义均与此相关。

**优点**：读操作无锁，性能高。**缺点**：写开销与 GC 压力；适合**读极多、写极少**（路由表、配置快照、RPC 服务路由表等）。

函数式编程中不可变数据结构的修改也依赖 COW。Copy-on-Write 是最简单却常被忽视的并发方案之一。

### 2.3 线程本地存储（Thread-Specific Storage）

每个线程一份副本 → **以空间换时间**。Java 即 `ThreadLocal`（异步系列详述）。

在线程池中使用时务必 **`remove()`**，避免泄漏：

```java
ExecutorService es;
ThreadLocal<Object> tl;
es.execute(() -> {
    tl.set(obj);
    try {
        // 业务逻辑
    } finally {
        tl.remove();
    }
});
```

---

## 三、多线程版 if：Guarded Suspension 与 Balking

### 3.1 守护挂起（Guarded Suspension）

线程在**条件不满足时 wait**，满足后被 notify——多线程版 `if + wait`。  
`join`、`Future.get` 均属此类。底层可对应：`synchronized + wait/notify`、`ReentrantLock + Condition`、`CAS + park/unpark`。

```java
public class GuardedObject<T> {
    private T obj;

    public synchronized T get() {
        while (obj == null) {
            this.wait(); // 防止虚假唤醒
        }
        return obj;
    }

    public synchronized void complete(T obj) {
        this.obj = obj;
        this.notifyAll();
    }
}
```

**场景**：一个线程产出结果、另一个线程等待结果；持续传递可用消息队列；JDK 中 `join`、Future 均基于此模式。

### 3.2 避免执行（Balking）

条件不满足则**直接返回**，不等待——与 Guarded Suspension 相对。

**典型场景**：

- **自动存盘**：无修改则跳过  
- **DCL 单例**外圈判断  
- synchronized 轻量锁膨胀前的退避  
- 单次初始化

```java
boolean changed = false;

void autoSave() {
    synchronized (this) {
        if (!changed) return;
        changed = false;
    }
    execSave();
}

void change() {
    synchronized (this) {
        changed = true;
    }
}
```

单次初始化 Balking：

```java
boolean inited = false;
synchronized void init() {
    if (inited) return;
    doInit();
    inited = true;
}
```

**实现手段**：锁（synchronized / ReentrantLock）、CAS；共享变量不要求原子性时可用 `volatile`。

---

## 四、多线程分工模式

### 4.1 Thread-Per-Message

每个请求一个线程——实现简单，但 Java 线程重，高并发下易 OOM；Go 等轻量线程更适合纯 TPM。

```java
final ServerSocketChannel ssc =
    ServerSocketChannel.open().bind(new InetSocketAddress(8080));
while (true) {
    SocketChannel sc = ssc.accept();
    new Thread(() -> {
        ByteBuffer rb = ByteBuffer.allocateDirect(1024);
        sc.read(rb);
        Thread.sleep(2000); // 模拟处理
        sc.write((ByteBuffer) rb.flip());
        sc.close();
    }).start();
}
```

并发度不高的定时任务等场景仍可用 TPM。

### 4.2 Worker Thread（线程池）

固定工人池消化任务，避免频繁创建销毁。工程上**禁止随意 `new Thread()`、统一线程池**是常见规范。

```java
ExecutorService es = Executors.newFixedThreadPool(200);
while (true) {
    SocketChannel sc = ssc.accept();
    es.execute(() -> { /* 读-处理-写-关 */ });
}
```

**注意**：提交的任务之间不要有依赖，避免死锁。

### 4.3 生产者-消费者

**队列**解耦生产与消费，支持异步、削峰填谷。

```java
BlockingQueue<String> queue = new ArrayBlockingQueue<>(5);
// 生产者 queue.put(...)
// 消费者 queue.take(...)
```

**优点**：异步处理、解耦、消除生产消费速度差异。

**过饱问题**（生产峰值 > 消费速度）：

| 场景 | 对策 |
|------|------|
| 日产量 > 日消费 | 消费者加机器 |
| 峰值塞满但全天能消化 | 适当加大队列 |
| 队列不能很大 | 生产者限流 |

业务上只要在**容忍的最长响应时间**内消化堆积，就不算过饱。例如埋点报表要求 24 小时内处理完前一天数据，则消费者日处理能力须高于生产者。

**典型业务**：用户注册后发邮件/短信（消息队列异步）；下单后通知库存扣减（削峰填谷）。适量线程 + 队列，比无限创建线程更可控。

---

## 小结

- **终止**：两阶段 + 线程池 `shutdown/awaitTermination`。  
- **少共享**：不可变、COW、ThreadLocal。  
- **协作**：Guarded Suspension（等条件）vs Balking（条件不对就走）。  
- **分工**：TPM → 线程池 → 队列流水线。

下一篇从**原子性、可见性、有序性**进入 JMM 底层。
