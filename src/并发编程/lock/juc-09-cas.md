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

CAS 是 CPU 硬件层面的一条指令，在**单条指令**内完成：比较内存值 V 与预期值 E，相等则写入新值 N，否则不更新；无论是否更新，都返回操作前的旧值。整个过程对 CPU 是原子的。

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

![CAS 比较与交换示意](/并发编程/lock/04/p01-01.png)

CAS 是一种**无锁**同步思路：没有线程被阻塞在锁上，通过不断重试（自旋）完成变量更新，可看作**乐观锁**（相对数据库悲观锁而言）。Java 原子类中的自增等操作底层就是 CAS 自旋。

---

## 二、Java 中的 CAS：Unsafe

`java.util.concurrent.atomic`、AQS、ConcurrentHashMap 等大量依赖 CAS。Java 侧由 `sun.misc.Unsafe`（JDK 9+ 模块限制后需反射或内部 API）暴露 native 方法：

- `compareAndSwapInt`
- `compareAndSwapLong`
- `compareAndSwapObject`

参数含义：**对象实例、字段偏移量、期望值、新值**。JVM 根据偏移量定位字段内存地址，再执行 CAS。

![Unsafe CAS 方法示意](/并发编程/lock/04/p03-01.png)

Unsafe 位于 `sun.misc` 包，能直接操作内存，能力接近 C 指针，使用不当风险高；业务代码应优先用封装好的原子类。

### 示例：三次 CAS 操作

```java
public class CASTest {
    public static void main(String[] args) {
        Entity entity = new Entity();
        Unsafe unsafe = UnsafeFactory.getUnsafe();
        long offset = UnsafeFactory.getFieldOffset(unsafe, Entity.class, "x");

        boolean successful;
        // 参数：对象实例、字段偏移量、期望值、新值
        successful = unsafe.compareAndSwapInt(entity, offset, 0, 3);
        System.out.println(successful + "\t" + entity.x);  // true, x=3

        successful = unsafe.compareAndSwapInt(entity, offset, 3, 5);
        System.out.println(successful + "\t" + entity.x);  // true, x=5

        successful = unsafe.compareAndSwapInt(entity, offset, 3, 8);
        System.out.println(successful + "\t" + entity.x);  // false, x 仍为 5
    }
}
```

`UnsafeFactory` 通过反射获取 `theUnsafe` 单例，并用 `objectFieldOffset` 计算字段偏移。

### CAS 在原子类中的应用

`AtomicInteger` 中静态字段 `valueOffset` 即 `value` 的内存偏移，在静态块中初始化。线程安全方法通过 `valueOffset` 定位 `value` 的内存地址，再 CAS 更新：

![AtomicInteger 自增前后内存示意](/并发编程/lock/04/p06-01.png)

对象的基地址 `baseAddress` 加上 `valueOffset` 得到 `value` 的内存地址；CAS 原子更新，成功则返回，否则自旋重试。

---

## 三、HotSpot 源码：从 compareAndSwapInt 到 cmpxchg

HotSpot 中 `Unsafe_CompareAndSwapInt` 核心逻辑：

```cpp
UNSAFE_ENTRY(jboolean, Unsafe_CompareAndSwapInt(..., jobject obj, jlong offset, jint e, jint x))
  oop p = JNIHandles::resolve(obj);
  jint* addr = (jint *) index_oop_from_field_offset_long(p, offset);
  return (jint)(Atomic::cmpxchg(x, addr, e)) == e;
UNSAFE_END
```

x86 上 `Atomic::cmpxchg` 使用 `cmpxchgl` 指令；多核下通过 `lock` 前缀保证可见性与原子性：

```cpp
inline jint Atomic::cmpxchg(jint exchange_value, volatile jint* dest, jint compare_value) {
  int mp = os::is_MP();
  __asm__ volatile (LOCK_IF_MP(%4) "cmpxchgl %1,(%3)"
                    : "=a" (exchange_value)
                    : "r" (exchange_value), "a" (compare_value), "r" (dest), "r" (mp)
                    : "cc", "memory");
  return exchange_value;
}
```

![cmpxchg 汇编与寄存器示意](/并发编程/lock/04/p06-02.png)

`cmpxchgl` 隐含操作数 eax：先比较 eax（compare_value）与 dest 指向的内存值，相等则交换；返回值写入 exchange_value。CAS 成功时 `(Atomic::cmpxchg(x, addr, e)) == e` 为 true。

现代处理器（x86 的 `cmpxchgl`/`comxchgq`、sparc 的 `cas` 等）都提供 CAS 指令；HotSpot 与 Java API 本质上都是对平台 CAS 的一层封装。

---

## 四、CAS 的三类缺陷

| 问题 | 说明 |
|------|------|
| **ABA** | 值从 A→B→A，其他线程仍认为未变，CAS 成功但中间状态已丢失 |
| **自旋开销** | 长时间 CAS 失败会空转 CPU |
| **单变量** | 一条 CAS 只能保证一个共享变量的原子性，多变量需加锁或封装 |

### ABA 问题

多个线程操作同一原子变量时，线程 1 读到 value=1 后休眠；线程 2 把 1→2→1；线程 1 醒来用 CAS(1→3) 仍成功，但中间曾变为 2。

![ABA 问题时序示意](/并发编程/lock/04/p09-01.png)

测试代码：

```java
@Slf4j
public class ABATest {
    public static void main(String[] args) {
        AtomicInteger atomicInteger = new AtomicInteger(1);

        new Thread(() -> {
            int value = atomicInteger.get();
            log.debug("Thread1 read value: " + value);
            LockSupport.parkNanos(1_000_000_000L);
            if (atomicInteger.compareAndSet(value, 3)) {
                log.debug("Thread1 update from " + value + " to 3");
            } else {
                log.debug("Thread1 update fail!");
            }
        }, "Thread1").start();

        new Thread(() -> {
            int value = atomicInteger.get();
            log.debug("Thread2 read value: " + value);
            if (atomicInteger.compareAndSet(value, 2)) {
                log.debug("Thread2 update from " + value + " to 2");
                value = atomicInteger.get();
                if (atomicInteger.compareAndSet(value, 1)) {
                    log.debug("Thread2 update from " + value + " to 1");
                }
            }
        }, "Thread2").start();
    }
}
```

Thread1 并不感知 Thread2 的中间修改，误以为 value 从未变化。

### 解决方案：AtomicStampedReference

类似数据库乐观锁的版本号：每次修改 stamp 递增。`AtomicStampedReference<V>` 同时比较 reference 与 stamp；`AtomicMarkableReference` 只关心是否被改过（boolean mark）。

```java
AtomicStampedReference<Integer> ref = new AtomicStampedReference<>(1, 1);
int[] stampHolder = new int[1];
int value = ref.get(stampHolder);
int stamp = stampHolder[0];
// CAS 时需同时匹配 value 与 stamp
ref.compareAndSet(value, 3, stamp, stamp + 1);
```

带 stamp 后，Thread2 的 1→2→1 会使 stamp 变化，Thread1 的 CAS 将失败。

---

## 小结

- CAS 是硬件原语，Java 通过 Unsafe / 原子类暴露给开发者。
- 适合竞争不激烈、更新粒度小的计数、状态位场景。
- 需警惕 ABA、自旋成本；复合逻辑仍可能需要锁或更高层抽象。

下一篇介绍 JUC **Atomic 原子类**如何基于 CAS 封装常用操作。
