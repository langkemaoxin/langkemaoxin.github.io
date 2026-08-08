---
title: "深入理解 synchronized"
sidebarGroup: "锁与同步"
shortTitle: "03 synchronized"
order: 3
date: 2026-11-17
category: "并发编程"
tag:
  - "并发编程"
  - "synchronized"
---

> **锁与同步 · 第 3/7 篇**  
> 上一篇：[《Atomic 原子操作类详解》](/并发编程/lock/juc-10-atomic)  
> 下一篇：[《JUC 显式锁与大厂应用实战》](/并发编程/lock/juc-12-juc-locks)

---

## 开头：两个线程各做 5000 次自增/自减，结果却不是 0

静态变量 `counter` 上，一个线程 `increment`、一个 `decrement` 各 5000 次，理论应为 0，实际可能是正数、负数或零——因为 `counter++` / `--` 在 JVM 里不是一条原子指令。

---

## 一、竞态与临界区

`i++` 字节码大致为：

```
getstatic i    // 取静态变量压栈
iconst_1       // 常量 1 压栈
iadd           // 相加
putstatic i    // 写回
```

多线程下四步可交错，出现**竞态条件**。

**临界区**：含共享资源读写的代码段；**临界资源**即被保护的共享数据。多个线程在临界区内因执行序列不同导致结果不可预测，即发生竞态。

| 概念 | 说明 |
|------|------|
| 多线程本身 | 没问题 |
| 多线程读共享资源 | 通常也没问题 |
| 多线程读写交错 | 出问题 |

**解决方案**：阻塞式 `synchronized`、`Lock`；非阻塞式原子变量。

互斥与同步在 Java 中都可通过 `synchronized` 实现，但有区别：

- **互斥**：保证临界区同一时刻只有一个线程执行
- **同步**：协调线程执行先后，一个线程需等待另一个到达某点

![竞态条件字节码交错示意](/并发编程/lock/06/p04-01.png)

---

## 二、synchronized 用法

`synchronized` 是 Java 提供的原子性内置锁；每个对象都可作锁，这类使用者不可见的锁叫**内置锁**或**监视器锁（Monitor）**。

```java
// 方式一：静态同步方法，锁 Class 对象
public static synchronized void increment() { counter++; }

// 方式二：同步块，锁指定对象
private static final Object lock = new Object();
public static void increment() {
    synchronized (lock) { counter++; }
}
```

完整示例：

```java
public class SyncDemo {
    private static int counter = 0;

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 5000; i++) increment();
        }, "t1");
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 5000; i++) decrement();
        }, "t2");
        t1.start(); t2.start();
        t1.join(); t2.join();
        log.info("{}", counter);  // 加锁后稳定为 0
    }
}
```

`synchronized` 保证临界区**原子性**。

---

## 三、字节码与 Monitor

- **同步方法**：方法 access_flags 中 `ACC_SYNCHRONIZED` 标志
- **同步块**：`monitorenter` / `monitorexit`

`synchronized` 是 JVM 内置锁，基于 Monitor 机制，依赖底层互斥原语 Mutex，早期被称为**重量级锁**。

### 管程与 MESA 模型

Monitor（管程）管理共享变量及对其操作，支持并发。Java 1.5 前唯一并发机制就是管程；JUC 也以管程为基础。

历史上出现过 Hasen、Hoare、MESA 三种管程模型，**MESA 最常用**。MESA 引入**条件变量**及对应等待队列，解决线程同步。Java 内置管程参考 MESA 但做了精简：**只有一个条件变量**（`waitSet`），而 MESA 可有多个。

![MESA 管程模型示意](/并发编程/lock/06/p07-01.png)

### ObjectMonitor 数据结构

`wait()`、`notify()`、`notifyAll()` 依赖 HotSpot C++ 实现的 **ObjectMonitor**（`ObjectMonitor.hpp`）：

```cpp
ObjectMonitor() {
    _header       = NULL;  // markOop 对象头
    _count        = 0;
    _waiters      = 0;
    _recursions   = 0;     // 锁重入次数
    _object       = NULL;  // 锁对象
    _owner        = NULL;  // 当前持锁线程
    _WaitSet      = NULL;  // wait 线程双向链表
    _cxq          = NULL;  // 竞争锁线程单向链表（FILO）
    _EntryList    = NULL;  // blocked 线程
    // ...
}
```

![ObjectMonitor 队列结构示意](/并发编程/lock/06/p11-01.png)

`synchronized` 底层用 monitor + CAS + mutex：未抢到锁的线程进等待队列；`wait` 进条件队列；`unlock`/`notify` 唤醒队列中线程争抢锁。阻塞/唤醒涉及用户态与内核态切换，开销较高，故称重量级锁。

**`_cxq` 与 `_EntryList` 为何分开？** 多线程同时竞争锁时，`_cxq` 用 CAS 暂存并发竞争者；`_EntryList` 在唤醒时搬迁节点，降低尾部竞争。默认释放策略（QMode=0）：EntryList 为空时，将 cxq 按原序插入 EntryList 并唤醒第一个——**EntryList 为空时，后到的线程可能先获锁**。

---

## 四、JVM 锁优化（JDK 6+）

| 优化 | 说明 |
|------|------|
| **锁粗化** | 相邻同对象 synchronized 合并为更大范围 |
| **锁消除** | 逃逸分析发现对象未逃逸则去掉锁 |
| **轻量级锁** | 交替执行场景，CAS 代替 OS 互斥 |
| **偏向锁** | 同一线程反复进入，Mark Word 记录线程 ID |
| **自适应自旋** | 竞争时先 CAS 空转，减少挂起 |

### 锁粗化示例

```java
// JVM 可能合并为一个大同步块
synchronized (lock) {
    // 代码块 1
    // 无关代码
    // 代码块 2
}

// StringBuffer.append 链式调用同理
buffer.append("aaa").append(" bbb").append(" ccc");
```

### 锁消除

局部 `StringBuffer` 不会逃逸，JIT 可消除 append 中的锁：

```java
public void append(String str1, String str2) {
    StringBuffer sb = new StringBuffer();  // 局部变量，不逃逸
    sb.append(str1).append(str2);
}
```

`-XX:+EliminateLocks` 开启（JDK8 默认）；压测对比：关闭约 4688 ms，开启约 2601 ms。

### 自旋

重量级锁竞争失败时，先 CAS 自旋再挂起。`-XX:+UseSpinning`、`-XX:PreBlockSpin` 可调（JDK7 后自旋由 VM 自适应）。

**常见误解**：轻量级锁失败会自旋 → 膨胀为重量级。**正确理解**：轻量级锁**不自旋**；只有重量级锁加锁失败才自旋，多次 CAS 仍失败才 `park` 阻塞。轻量级锁面向**线程交替**而非激烈竞争；偏向锁面向**同一线程反复进入**。

![锁优化策略总览](/并发编程/lock/06/p16-01.png)

---

## 五、锁升级与 Mark Word

锁状态记录在对象头 **Mark Word**（32/64 位布局不同）。典型 lock 两位：

| lock | 状态 |
|------|------|
| 01 | 无锁 / 偏向锁 |
| 00 | 轻量级锁 |
| 10 | 重量级锁 |
| 11 | GC 标记 |

对象布局：**对象头 + 实例数据 + 对齐填充**（8 字节对齐）。

### 用 JOL 查看布局

```xml
<dependency>
  <groupId>org.openjdk.jol</groupId>
  <artifactId>jol-core</artifactId>
  <version>0.10</version>
</dependency>
```

```java
Object obj = new Object();
System.out.println(ClassLayout.parseInstance(obj).toPrintable());
```

64 位默认开启指针压缩：空对象 16 字节，前 12 字节为对象头；`-XX:-UseCompressedOops` 关闭后对象头 16 字节。

![64 位 Mark Word 布局](/并发编程/lock/06/p17-01.png)

![Mark Word 各状态字段](/并发编程/lock/06/p17-02.png)

Mark Word 字段含义：

| 字段 | 说明 |
|------|------|
| hash | 延迟计算的 identityHashCode |
| age | GC 分代年龄 |
| biased_lock | 偏向锁标识（与无锁同为 01，靠此位区分） |
| lock | 锁状态 |
| JavaThread* | 偏向锁记录的线程 ID |
| epoch | 偏向撤销计数，用于批量重偏向/撤销 |
| ptr_to_lock_record | 轻量级锁，指向栈 LockRecord |
| ptr_to_heavyweight_monitor | 重量级锁，指向 Monitor |

![锁升级路径示意](/并发编程/lock/06/p18-01.png)

**升级路径**（历史演进：先有重量级，再优化出偏向/轻量）：

1. **偏向锁**：同一线程反复进入，Mark Word 记录线程 ID，避免 CAS
2. **轻量级锁**：线程交替执行，Copy Mark Word 到栈 LockRecord，CAS 替换指针
3. **重量级锁**：多线程激烈竞争，膨胀为 Monitor

![偏向锁与轻量级锁 Mark Word 变化](/并发编程/lock/06/p19-01.png)

### 锁升级实验要点

- JVM 默认启动约 **4s** 后才开启偏向（`-XX:BiasedLockingStartupDelay=0` 可改）
- 同一线程重入：偏向锁
- 另一线程竞争：撤销偏向 → 轻量级锁
- 多线程同时竞争：轻量级锁膨胀 → 重量级锁
- 重量级锁释放后变无锁；新线程竞争获**轻量级锁**（非偏向）
- **轻量级锁不能降级为偏向锁**

### 偏向锁撤销场景

| 操作 | 影响 |
|------|------|
| `identityHashCode()` / `hashCode()` | 偏向锁无位置存 hash，撤销偏向 |
| 可偏向时调用 hashCode | 变无锁，只能升轻量级 |
| 已偏向时调用 hashCode | 强制升重量级 |
| `notify()` | 升轻量级锁 |
| `wait(timeout)` | 升重量级锁 |

### 批量重偏向与批量撤销

以 class 为单位维护撤销计数器，达到阈值（默认 **20**）触发**批量重偏向**——将该 class 对象重偏向到新线程。继续增长到 **40** 触发**批量撤销**，标记 class **不可偏向**，之后直接走轻量级锁。

```
-XX:BiasedLockingBulkRebiasThreshold=20
-XX:BiasedLockingBulkRevokeThreshold=40
```

批量重偏向解决「线程 A 创建大量对象，线程 B 后续使用」的撤销开销；批量撤销解决「明显多线程竞争仍用偏向锁」的性能下降。

---

## 小结

1. `i++` 非原子，临界区需互斥保护。  
2. `synchronized` 通过 Monitor + 字节码 monitorenter/exit 实现。  
3. JDK6+ 锁粗化、消除、偏向、轻量、自旋使内置锁性能接近显式锁。  
4. 锁状态存于 Mark Word，理解升级路径有助于解释「为什么 synchronized 有时也不慢」。

下一篇对比 JUC **显式锁** 的能力与场景。
