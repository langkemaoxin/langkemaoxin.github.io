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
| 对象字段 | `AtomicIntegerFieldUpdater`、`AtomicLongFieldUpdater`、`AtomicReferenceFieldUpdater` |
| 累加器 (JDK8+) | `LongAdder`、`DoubleAdder`、`LongAccumulator`、`Striped64` |

并发编程中多线程更新变量 `i` 并执行 `i++` 可能得不到正确值；`atomic` 包提供操作简单、性能较高、保证线程安全的类，采用乐观锁 + CAS 实现。

---

## 二、AtomicInteger 常用 API

```java
// 自增并返回旧值
public final int getAndIncrement() {
    return unsafe.getAndAddInt(this, valueOffset, 1);
}

// 自增并返回新值
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}

// 以原子方式将值加 delta 并返回结果
public final int addAndGet(int delta) {
    return unsafe.getAndAddInt(this, valueOffset, delta) + delta;
}

// CAS 更新
public final boolean compareAndSet(int expect, int update) { ... }
```

### 并发自增测试

```java
public class AtomicIntegerTest {
    static AtomicInteger sum = new AtomicInteger(0);

    public static void main(String[] args) throws InterruptedException {
        for (int i = 0; i < 10; i++) {
            new Thread(() -> {
                for (int j = 0; j < 10000; j++) {
                    sum.incrementAndGet();  // CAS 自旋
                }
            }).start();
        }
        Thread.sleep(3000);
        System.out.println(sum.get());  // 100000
    }
}
```

`incrementAndGet()` 通过 CAS 自增，失败则自旋直到成功。**高竞争下大量线程 CAS 同一变量会空转 CPU**——这是后续引入 `LongAdder` 的动机。

---

## 三、数组与引用类型

### AtomicIntegerArray

对数组索引做原子 `addAndGet`、`compareAndSet`：

```java
static int[] value = { 1, 2, 3, 4, 5 };
static AtomicIntegerArray arr = new AtomicIntegerArray(value);

arr.set(0, 100);
arr.getAndAdd(1, 5);  // 索引 1 的元素原子 +5
```

注意：`AtomicIntegerArray` 内部复制传入数组，对外部数组后续修改不可见。

### AtomicReference

封装普通对象引用，保证引用替换的原子性（**只保证引用本身**，不保证对象内部字段）：

```java
AtomicReference<User> ref = new AtomicReference<>();
ref.set(user1);
ref.compareAndSet(user1, user2);  // 成功，引用变为 user2
ref.compareAndSet(user1, user3);  // 失败，当前已是 user2
```

---

## 四、字段原子更新器

`AtomicIntegerFieldUpdater` 等可在不改类结构的前提下，对已有类的 `volatile int` 字段做原子更新，适合第三方类无法改源码的场景。

```java
public static final AtomicIntegerFieldUpdater<Candidate> scoreUpdater =
        AtomicIntegerFieldUpdater.newUpdater(Candidate.class, "score");

public static class Candidate {
    volatile int score = 0;
}
```

使用约束：

| 约束 | 说明 |
|------|------|
| 字段必须是 **volatile** | 保证可见性 |
| 不能是 **static**、**final** | final 语义与 volatile 冲突 |
| 修饰符需满足反射访问规则 | 调用者能直接访问字段 |
| 仅支持 int/long 原始类型 | 包装类型用 `AtomicReferenceFieldUpdater` |

10000 个线程随机 `incrementAndGet`，`AtomicIntegerFieldUpdater` 与 `AtomicInteger` 结果一致。

---

## 五、LongAdder：分散热点

`AtomicLong` 高并发下所有线程 CAS 同一 `value`，热点严重。`LongAdder` 思路：**分散热点**——

- 无竞争时累加到 `base`
- 有竞争时分配到 `Cell[]` 各槽，线程只 CAS 自己的 Cell
- `sum()` 遍历求和（非调用时刻的快照，统计场景通常可接受）

### 性能对比

```java
// 线程数越多、每线程操作次数越大，LongAdder 优势越明显
testAtomicLongVSLongAdder(10, 10000);
testAtomicLongVSLongAdder(10, 200000);
testAtomicLongVSLongAdder(100, 200000);
```

低并发简单计数 `AtomicInteger/Long` 足够；高并发写多读少统计优先 `LongAdder/DoubleAdder`。

### 内部结构

```java
static final int NCPU = Runtime.getRuntime().availableProcessors();
transient volatile Cell[] cells;   // 2 的次幂大小
transient volatile long base;      // 无竞争时使用
transient volatile int cellsBusy;  // 扩容时的自旋锁
```

`Cell` 是内部槽，每个 Cell 存一个 `value`，通过 Unsafe CAS 更新。

### add 与 longAccumulate

`LongAdder#add` 逻辑：

1. 无竞争 → 直接 CAS 更新 `base`
2. 有竞争 → 初始化或写入 `Cell[]` 中对应槽
3. 冲突发生在 Cell 内 → 调用父类 `Striped64#longAccumulate`（初始化数组、扩容、累加）

设计精妙之处：**尽量推迟 CAS、减少冲突**——只有从未出现并发冲突时才用 `base`；一旦出现冲突，后续操作都针对 Cell 数组。

### sum 的语义

```java
/**
 * 返回累加的和，即「当前时刻」的计数值。
 * 高并发时，除非全局加锁，否则得不到绝对准确的快照——
 * 调用时刻与其他线程累加可能交错，返回值只是近似值。
 */
public long sum() {
    Cell[] as = cells; Cell a;
    long sum = base;
    if (as != null) {
        for (int i = 0; i < as.length; ++i) {
            if ((a = as[i]) != null)
                sum += a.value;
        }
    }
    return sum;
}
```

---

## 小结

| 场景 | 建议 |
|------|------|
| 读多写少、需要精确快照 | `AtomicInteger` / `AtomicLong` |
| 高并发写多读少统计 | `LongAdder` / `DoubleAdder` |
| 带版本防 ABA | `AtomicStampedReference` |
| 不改类结构更新字段 | `AtomicIntegerFieldUpdater` |

下一篇回到内置锁 **synchronized** 的竞态、Monitor 与锁升级。
