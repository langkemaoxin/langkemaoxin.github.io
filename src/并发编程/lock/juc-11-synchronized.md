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

`i++` 字节码大致为：`getstatic` → `iconst_1` → `iadd` → `putstatic`。多线程下四步可交错，出现**竞态条件**。

**临界区**：含共享资源读写的代码段；**互斥**保证同一时刻只有一个线程执行临界区。

阻塞式：`synchronized`、`Lock`；非阻塞式：原子变量。

![p02 page](/并发编程/lock/06/p02-page.png)

![p03 page](/并发编程/lock/06/p03-page.png)

![p04 01](/并发编程/lock/06/p04-01.png)

---

## 二、synchronized 用法

```java
// 方式一：静态同步方法，锁 Class 对象
public static synchronized void increment() { counter++; }

// 方式二：同步块，锁指定对象
private static final Object lock = new Object();
public static void increment() {
    synchronized (lock) { counter++; }
}
```

`synchronized` 保证临界区**原子性**；内置锁也称**监视器锁（Monitor）**。

![p05 page](/并发编程/lock/06/p05-page.png)

![p06 page](/并发编程/lock/06/p06-page.png)

---

## 三、字节码与 Monitor

- 同步方法：`ACC_SYNCHRONIZED` 标志
- 同步块：`monitorenter` / `monitorexit`

Monitor（管程）管理共享变量访问。Java 内置管程参考 **MESA 模型**（条件变量 + 等待队列），相对 Hoare/Hasen 更常用。

![p07 01](/并发编程/lock/06/p07-01.png)

![p08 page](/并发编程/lock/06/p08-page.png)

`wait/notify` 依赖 **ObjectMonitor**（HotSpot C++）：`_owner`、`_EntryList`、`_WaitSet`、`_cxq` 等。未抢到锁的线程进等待队列；`wait` 进条件队列；用户态/内核态切换使早期 synchronized 被称为**重量级锁**。

![p09 page](/并发编程/lock/06/p09-page.png)

![p10 page](/并发编程/lock/06/p10-page.png)

![p11 01](/并发编程/lock/06/p11-01.png)

![p12 page](/并发编程/lock/06/p12-page.png)

---

## 四、JVM 锁优化

JDK 6 起引入：**锁粗化、锁消除、轻量级锁、偏向锁、自适应自旋**。

- **锁粗化**：相邻同对象 synchronized 合并
- **锁消除**：逃逸分析发现对象未逃逸则去掉锁（如局部 StringBuffer）
- **自旋**：竞争时先 CAS 空转，减少挂起（重量级锁失败路径）

![p14 page](/并发编程/lock/06/p14-page.png)

![p15 page](/并发编程/lock/06/p15-page.png)

![p16 01](/并发编程/lock/06/p16-01.png)

---

## 五、锁升级与 Mark Word

锁状态记录在对象头 **Mark Word**（32/64 位布局不同）。典型 lock 两位：

| lock | 状态 |
|------|------|
| 01 | 无锁 / 偏向锁 |
| 00 | 轻量级锁 |
| 10 | 重量级锁 |
| 11 | GC 标记 |

对象布局：对象头 + 实例数据 + 对齐填充。可用 **JOL** 查看：

```xml
<dependency>
  <groupId>org.openjdk.jol</groupId>
  <artifactId>jol-core</artifactId>
  <version>0.10</version>
</dependency>
```

![p17 01](/并发编程/lock/06/p17-01.png)

![p17 02](/并发编程/lock/06/p17-02.png)

![p18 01](/并发编程/lock/06/p18-01.png)

![p19 01](/并发编程/lock/06/p19-01.png)

![p20 page](/并发编程/lock/06/p20-page.png)

![p21 page](/并发编程/lock/06/p21-page.png)

![p22 page](/并发编程/lock/06/p22-page.png)

![p23 page](/并发编程/lock/06/p23-page.png)

![p24 page](/并发编程/lock/06/p24-page.png)

**偏向锁**：同一线程反复进入，Mark Word 记录线程 ID，避免 CAS。**轻量级锁**：线程交替执行，Copy Mark Word 到栈 LockRecord，CAS 替换指针。**重量级**：多线程激烈竞争，膨胀为 Monitor。

JVM 默认启动约 **4s** 后才开启偏向（`-XX:BiasedLockingStartupDelay=0` 可改）。调用 `identityHashCode` 会撤销偏向。

![p25 page](/并发编程/lock/06/p25-page.png)

![p26 page](/并发编程/lock/06/p26-page.png)

![p27 page](/并发编程/lock/06/p27-page.png)

![p28 page](/并发编程/lock/06/p28-page.png)

![p29 page](/并发编程/lock/06/p29-page.png)

![p30 page](/并发编程/lock/06/p30-page.png)

![p31 page](/并发编程/lock/06/p31-page.png)

![p32 page](/并发编程/lock/06/p32-page.png)

![p33 page](/并发编程/lock/06/p33-page.png)

![p34 page](/并发编程/lock/06/p34-page.png)

---

## 小结

`synchronized` 从 Monitor 重量级锁演进为**偏向 → 轻量 → 重量** 的升级路径，在低开销场景接近无锁性能。理解 Mark Word 与升级条件，有助于解释「为什么有时 synchronized 也不慢」。下一篇对比 JUC **显式锁** 的能力与场景。
