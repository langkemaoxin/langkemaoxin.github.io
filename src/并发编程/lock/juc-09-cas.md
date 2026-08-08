---
title: "深入理解 CAS 比较与交换"
sidebarGroup: "锁与同步"
shortTitle: "01 CAS 原理"
order: 1
date: 2026-11-15
category: "并发编程"
tag:
  - "并发编程"
  - "CAS"
---

> **锁与同步 · 第 1/7 篇**  
> 上一篇：[《CompletableFuture 与 ThreadLocal》](/并发编程/async/juc-08-threadlocal)  
> 下一篇：[《Atomic 原子操作类详解》](/并发编程/lock/juc-10-atomic)

---

## 开头：线上库存扣减接口偶发「少卖」

秒杀模块用 `i++` 做库存递减，压测时偶发剩余库存与订单数对不上。排查发现多线程下「读—改—写」不是原子操作——这正是 **CAS（Compare-And-Swap，比较与交换）** 要解决的典型场景。

---

## 一、CAS 是什么

CAS 是 CPU 硬件层面的一条指令，在单条指令内完成「比较内存值 V 与预期值 E，相等则写入新值 N，否则不更新」，并返回操作前的旧值。整个过程对 CPU 而言是原子的。

用 Java 伪代码理解其语义：

```java
// 内存中当前的值
private volatile int ramAddress;

public synchronized int compareAndSwap(int expectedValue, int newValue) {
    int oldValue = ramAddress;
    if (oldValue == expectedValue) {
        ramAddress = newValue;
    }
    return oldValue;
}
```

以上「比较 + 赋值」在 CAS 指令里合并为不可分割的一步，原子性由硬件保证。

![p01 01](/并发编程/lock/04/p01-01.png)

CAS 是一种**无锁**同步思路：没有线程被阻塞在锁上，通过不断重试（自旋）完成变量更新，可看作**乐观锁**（相对数据库悲观锁而言）。Java 原子类中的自增等操作底层就是 CAS 自旋。

![p02 page](/并发编程/lock/04/p02-page.png)

---

## 二、Java 中的 CAS：Unsafe

`java.util.concurrent.atomic` 及 AQS、ConcurrentHashMap 等大量依赖 CAS。Java 侧由 `sun.misc.Unsafe`（JDK 9+ 模块限制后需反射或内部 API）暴露 native 方法，例如：

- `compareAndSwapInt`
- `compareAndSwapLong`
- `compareAndSwapObject`

参数含义：**对象实例、字段偏移量、期望值、新值**。JVM 根据偏移量定位字段内存地址，再执行 CAS。

![p03 01](/并发编程/lock/04/p03-01.png)

示例：对 `Entity.x` 连续三次 CAS——0→3 成功，3→5 成功，仍期望 3 则 3→8 失败：

```java
Unsafe unsafe = UnsafeFactory.getUnsafe();
long offset = UnsafeFactory.getFieldOffset(unsafe, Entity.class, "x");

successful = unsafe.compareAndSwapInt(entity, offset, 0, 3);  // true, x=3
successful = unsafe.compareAndSwapInt(entity, offset, 3, 5);  // true, x=5
successful = unsafe.compareAndSwapInt(entity, offset, 3, 8);  // false, x 仍为 5
```

![p04 page](/并发编程/lock/04/p04-page.png)

![p05 page](/并发编程/lock/04/p05-page.png)

Unsafe 能直接操作内存，能力接近 C 指针，使用不当风险高，业务代码应优先用封装好的原子类。

---

## 三、HotSpot 源码：从 compareAndSwapInt 到 cmpxchg

`AtomicInteger` 等类通过 `valueOffset` 定位字段，再调用 Unsafe CAS。HotSpot 中 `Unsafe_CompareAndSwapInt` 核心逻辑：

```cpp
jint* addr = (jint *) index_oop_from_field_offset_long(p, offset);
return (jint)(Atomic::cmpxchg(x, addr, e)) == e;
```

x86 上 `Atomic::cmpxchg` 使用 `cmpxchgl` 指令；多核下通过 `lock` 前缀保证可见性与原子性。无论 HotSpot 还是 Java API，本质都是对**平台 CAS 指令的一层封装**。

![p06 01](/并发编程/lock/04/p06-01.png)

![p06 02](/并发编程/lock/04/p06-02.png)

![p07 page](/并发编程/lock/04/p07-page.png)

![p08 page](/并发编程/lock/04/p08-page.png)

---

## 四、CAS 的三类缺陷

| 问题 | 说明 |
|------|------|
| **ABA** | 值从 A→B→A，其他线程仍认为未变，CAS 成功但中间状态已丢失 |
| **自旋开销** | 长时间 CAS 失败会空转 CPU |
| **单变量** | 一条 CAS 只能保证一个共享变量的原子性，多变量需加锁或封装 |

### ABA 问题与 AtomicStampedReference

线程 1 读到 value=1 后休眠；线程 2 把 1→2→1；线程 1 醒来用 CAS(1→3) 仍成功，但中间曾变为 2。

解决思路：带**版本号**（类似数据库乐观锁）。`AtomicStampedReference<V>` 同时比较 reference 与 stamp；`AtomicMarkableReference` 只关心是否被改过（boolean mark）。

![p09 01](/并发编程/lock/04/p09-01.png)

![p10 page](/并发编程/lock/04/p10-page.png)

![p11 page](/并发编程/lock/04/p11-page.png)

![p12 page](/并发编程/lock/04/p12-page.png)

---

## 小结

- CAS 是硬件原语，Java 通过 Unsafe / 原子类暴露给开发者。
- 适合竞争不激烈、更新粒度小的计数、状态位场景。
- 需警惕 ABA、自旋成本；复合逻辑仍可能需要锁或更高层抽象。

下一篇介绍 JUC **Atomic 原子类**如何基于 CAS 封装常用操作。
