---
title: "原子性、可见性、有序性与 JMM"
sidebarGroup: "并发基础"
shortTitle: "04 JMM 三特性"
order: 4
date: 2026-11-10
category: "并发编程"
tag:
  - "并发编程"
  - "JMM"
---

> **并发基础 · 第 4/5 篇**  
> 上一篇：[《常用并发设计模式》](/并发编程/basics/juc-03-design-patterns) · 下一篇：[《CPU 缓存架构与多核可见性问题》](/并发编程/basics/juc-05-cpu-cache)

---

## 开头：并发 Bug 从哪来？

十个线程各加一万次，`counter` 却不到十万——不是「运气不好」，是**原子性**丢了。一个线程改了 `flag`，另一个死循环读不到——**可见性**丢了。双重检查单例偶发 NPE——**有序性**（重排序）在作怪。

本篇讲清 Java 并发三大特性，并深入 **JMM 抽象结构**、锁与 volatile 的内存语义、DCL 与 **happens-before**。

![并发三大特性概览](/并发编程/basics/16/p02-page.png)

---

## 一、原子性（Atomicity）

**定义**：一组操作要么全部完成且不被打断，要么全部不做。

`i++` 非原子（读-改-写三步）；基本类型读写通常是原子的（**long/double 在 32 位 JVM 上写入可能非原子**，见 JLS 17.7）。

```java
// 10 线程 × 10000 次 counter++，结果常小于 100000
for (int j = 0; j < 10000; j++) {
    counter++;
}
```

**保证手段**：`synchronized`、`Lock`、**CAS / 原子类**。

![原子性 counter 实验](/并发编程/basics/16/p03-page.png)

![保证原子性的方式](/并发编程/basics/16/p04-page.png)

---

## 二、可见性（Visibility）

线程修改共享变量后，其它线程能否**立刻看到**新值。

```java
// threadA: while (flag) { /* 加载数据 */ }
// threadB: flag = false;  —— 可能 threadA 永远看不到 false
```

原因：各线程有**工作内存（本地内存）**副本，与主内存同步时机由 JMM 规定。

**保证手段**：`volatile`、内存屏障、`synchronized`、`Lock`。

![可见性案例分析](/并发编程/basics/16/p05-page.png)

![可见性失效原因示意](/并发编程/basics/16/p06-page.png)

---

## 三、有序性（Ordering）

编译器与 CPU 可能**指令重排序**以提升性能，单线程下 as-if-serial 不变，多线程下可能踩坑。

经典实验：两线程分别执行 `a=1; x=b;` 与 `b=1; y=a;`，可能出现 **x=0, y=0**。

**保证手段**：`volatile`、`synchronized`、`Lock`、内存屏障。

![有序性重排序实验](/并发编程/basics/16/p07-page.png)

![保证有序性的方式](/并发编程/basics/16/p08-page.png)

---

## 四、Java 内存模型（JMM）

> 注意：JMM ≠ JVM 内存结构（堆/栈/GC）。面试问 JMM 通常指**并发可见性与重排序**。

### 4.1 抽象结构

- **主内存**：共享变量所在。  
- **工作内存**：线程私有副本（涵盖缓存、写缓冲、寄存器等抽象）。

线程对共享变量的 read/load/use/assign/store/write 须通过主内存与工作内存交互。

![JMM 主内存与工作内存](/并发编程/basics/16/p09-page.png)

### 4.2 八种原子操作（了解）

lock、unlock、read、load、use、assign、store、write——及其顺序规则（如 unlock 前须 store+write 回主内存等）。

### 4.3 可见性案例与内存屏障

底层可见性实现包括：**内存屏障**（如 `lock addl` 伪共享场景）、**上下文切换**带来的可见性副作用等。  
结合可见性案例理解：threadB 写 `flag` 后，threadA 的工作内存何时失效、何时从主内存重新 load。

![可见性案例深入分析](/并发编程/basics/16/p11-page.png)

---

## 五、锁的内存语义

- **加锁**：清空工作内存中相关共享变量，从主内存重新加载。  
- **解锁**：把工作内存中修改 flush 到主内存。

因此 `synchronized` 同时保证**互斥 + 可见性**（在正确使用的前提下）。

![synchronized 内存语义](/并发编程/basics/16/p12-page.png)

---

## 六、volatile 内存语义

- **写 volatile**：刷新到主内存。  
- **读 volatile**：使本地内存中该变量副本失效，从主内存读。

**禁止重排序规则**（简记）：

- 第二个操作是 volatile **写** → 其前不重排  
- 第一个操作是 volatile **读** → 其后不重排  
- volatile 写 + volatile 读 → 中间不重排  

实现：编译器插入 **StoreStore / StoreLoad / LoadLoad / LoadStore** 等屏障；x86 上部分屏障可省略。

### 双重检查锁定（DCL）

错误写法：`singleton = new Singleton()` 可能被重排序为「先赋引用、后初始化」，其它线程看到非 null 但未构造完成的对象。

**修复**：`private volatile static Singleton singleton;`

![DCL 与 volatile](/并发编程/basics/16/p13-page.png)

---

## 七、happens-before

JMM 给程序员的**可见性承诺**（不要求物理执行顺序一致）：

| 规则 | 含义 |
|------|------|
| 程序顺序 | 同线程内，前操作 hb 后操作 |
| 锁 | unlock hb 后续 lock |
| volatile | 写 hb 后续读 |
| 传递 | A hb B，B hb C → A hb C |
| 线程启动/终止/join 等 | start、interrupt、join、finalize 等 |

**总结**：`volatile` 保可见 + 禁部分重排；`synchronized` 还保互斥与原子性块；底层靠内存屏障；happens-before 是更易用的抽象。

---

## 小结

- Bug 源头：**原子性、可见性、有序性**。  
- JMM 管的是**主内存 ↔ 工作内存**交互，不是堆栈布局。  
- **DCL 必须 volatile**；理解 hb 规则比背八种操作更实用。

下一篇从 **CPU 缓存与 MESI** 解释「为什么工作内存会不一致」。
