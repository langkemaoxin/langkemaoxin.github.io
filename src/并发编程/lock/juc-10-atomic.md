---
title: "Atomic 原子操作类详解"
sidebarGroup: "锁与同步"
shortTitle: "02 Atomic 原子类"
order: 2
date: 2026-11-16
category: "并发编程"
tag:
  - "并发编程"
  - "Atomic"
---

> **锁与同步 · 第 2/7 篇**  
> 上一篇：[《深入理解 CAS 比较与交换》](/并发编程/lock/juc-09-cas)  
> 下一篇：[《深入理解 synchronized》](/并发编程/lock/juc-11-synchronized)

---

## 开头：计数器在高并发下成为瓶颈

网关限流、接口 QPS 统计都用共享计数器。`synchronized` 能保正确，但热点路径上锁竞争明显；JUC `atomic` 包基于 **CAS 乐观锁** 提供线程安全的原子更新，是更轻量的方案。

---

## 一、atomic 包概览

`synchronized` 是悲观锁；`java.util.concurrent.atomic` 下的类用 CAS 原子更新，典型分类：

| 类型 | 代表类 |
|------|--------|
| 基本类型 | `AtomicInteger`、`AtomicLong`、`AtomicBoolean` |
| 引用类型 | `AtomicReference`、`AtomicStampedReference`、`AtomicMarkableReference` |
| 数组 | `AtomicIntegerArray`、`AtomicLongArray`、`AtomicReferenceArray` |
| 对象字段 | `AtomicIntegerFieldUpdater` 等 |
| 累加器 (JDK8+) | `LongAdder`、`DoubleAdder`、`LongAccumulator` |

![p12 page](/并发编程/lock/04/p12-page.png)

---

## 二、AtomicInteger 常用 API

```java
// 自增并返回旧值
public final int getAndIncrement() { return unsafe.getAndAddInt(this, valueOffset, 1); }

// 自增并返回新值
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}

// CAS 更新
public final boolean compareAndSet(int expect, int update) { ... }
```

10 个线程各自增 10000 次，`incrementAndGet()` 最终应得到 100000。失败时 CAS 自旋重试——高竞争下会空转 CPU。

![p13 page](/并发编程/lock/04/p13-page.png)

![p14 page](/并发编程/lock/04/p14-page.png)

![p15 page](/并发编程/lock/04/p15-page.png)

---

## 三、数组与引用类型

**AtomicIntegerArray**：对数组索引做原子 `addAndGet`、`compareAndSet`，内部仍是 CAS。

**AtomicReference**：封装普通对象引用，保证引用替换的原子性（注意：只保证引用本身，不保证对象内部字段）。

![p16 page](/并发编程/lock/04/p16-page.png)

![p17 page](/并发编程/lock/04/p17-page.png)

![p18 page](/并发编程/lock/04/p18-page.png)

---

## 四、字段原子更新器

`AtomicIntegerFieldUpdater` 等可在不改类结构的前提下，对已有类的 `volatile int` 字段做原子更新，适合第三方类无法改源码的场景。

使用约束（节选）：

- 字段必须是 **volatile**
- 不能是 **static**、**final**
- 修饰符需满足反射访问规则
- 仅支持 int/long 原始类型字段

![p19 page](/并发编程/lock/04/p19-page.png)

![p20 page](/并发编程/lock/04/p20-page.png)

---

## 五、LongAdder：分散热点

`AtomicLong` 高并发下所有线程 CAS 同一 `value`，热点严重。`LongAdder` 思路：**分散热点**——

- 无竞争时累加到 `base`
- 有竞争时分配到 `Cell[]` 各槽，线程只 CAS 自己的 Cell
- `sum()` 遍历求和（非调用时刻的快照，统计场景通常可接受）

![p21 page](/并发编程/lock/04/p21-page.png)

![p22 page](/并发编程/lock/04/p22-page.png)

压测对比：线程数、每线程操作次数越大，`LongAdder` 相对 `AtomicLong` 优势越明显；低并发简单计数 `AtomicInteger/Long` 足够。

![p23 page](/并发编程/lock/04/p23-page.png)

![p24 page](/并发编程/lock/04/p24-page.png)

`Striped64#longAccumulate` 负责初始化 Cell 数组、扩容与累加；设计目标是**尽量推迟 CAS、减少冲突**。

![p25 page](/并发编程/lock/04/p25-page.png)

---

## 小结

- 读多写少、精确快照：优先 `AtomicInteger/Long`
- 高并发写多读少统计：`LongAdder/DoubleAdder`
- 带版本防 ABA：`AtomicStampedReference`

下一篇回到内置锁 **synchronized** 的竞态、Monitor 与锁升级。
