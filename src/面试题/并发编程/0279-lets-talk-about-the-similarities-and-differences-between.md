---
title: "说下ConcurrentHashMap和Hashtable的异同点"
sidebarGroup: "并发编程"
shortTitle: "说下ConcurrentHashMap和Hashtable的异同点"
order: 279
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 请说一下 ConcurrentHashMap 和 Hashtable 的区别？Fox版标准回答：“这两者虽然都是线程安全的 Map，但在实现原理、性能和迭代机制上有本质区别：核心区别：锁的粒度（L"
article: false
---

> 来源：[说下ConcurrentHashMap和Hashtable的异同点](https://www.yuque.com/tulingzhouyu/db22bv/cazo0ro75gxuh49k)

## 一、 标准面试回答模版（建议背诵）

**面试官：** 请说一下 ConcurrentHashMap 和 Hashtable 的区别？

**Fox版标准回答：**

“这两者虽然都是线程安全的 Map，但在**实现原理**、**性能**和**迭代机制**上有本质区别：

1. **核心区别：锁的粒度（Lock Granularity）**

- **Hashtable：** 是一把‘全局大锁’。它在 `put`、`get` 等所有核心方法上直接加了 `synchronized`。这意味着不管你操作哪个 Key，全表都被锁死，并发度几乎为 0。
- **ConcurrentHashMap：** 是‘分段锁’**（JDK 1.7）或**‘节点锁’（JDK 1.8）。

- **JDK 1.8 中：** 它使用 `CAS` + `synchronized` 锁住哈希桶的**头节点**。只有两个线程同时操作**同一个桶（Hash冲突）**时才会竞争，大大提高了并发吞吐量。

1. **性能差距：**

- 在高并发环境下，`Hashtable` 的性能会急剧下降（因为所有线程都在争夺同一把锁）。
- `ConcurrentHashMap` 的读操作（`get`）通常是**无锁**的，写操作锁粒度极细，性能接近 `HashMap`。

1. **迭代机制：**

- **Hashtable：** 使用 **Fail-Fast** 迭代器。如果遍历时有其他线程修改了数据，会直接抛出 `ConcurrentModificationException` 异常。
- **ConcurrentHashMap：** 使用 **Weakly Consistent（弱一致性）** 迭代器。它允许在遍历时并发修改，**不会抛出异常**，但迭代器可能看不到最新的修改（比如遍历开始后新插入的数据）。

1. **共同点：**

- 它们都**不允许 Key 或 Value 为 null**（这一点与 HashMap 不同）。”

## 二、 源码级对比（Talk is cheap）

面试时，直接指出源码中锁的位置，胜过千言万语。

### 1. Hashtable (全局锁)

**Look at me!** 注意看这个 `synchronized` 是加在方法上的，简单粗暴。

```java
public class Hashtable<K,V> extends Dictionary<K,V> implements Map<K,V> {
    // 整个方法被锁住，其他线程想 get 都得排队！
    public synchronized V put(K key, V value) {
        // ...
    }

    public synchronized V get(Object key) {
        // ...
    }
}
```

### 2. ConcurrentHashMap JDK 1.8 (细粒度锁)

**Look at me!** 只有在发生 Hash 冲突，且 CAS 失败时，才锁住那个**特定的 Node**（头节点）。

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    // ... 前面有一堆 CAS 的尝试 ...

    // 只有当这个桶（Bucket）不为空，且 CAS 失败时
    synchronized (f) { // f 就是这个桶的头节点 (Node)
        if (tabAt(tab, i) == f) {
            // 操作链表或红黑树...
        }
    }
    // ...
}
```

## 三、 Fox的深度解析（面试杀手锏）

如果面试官追问：“**为什么它们都不允许 null 键和 null 值？而 HashMap 却允许？**” 这是一个非常刁钻但高频的问题，必须用**二义性（Ambiguity）**来解释。

**Fox版解析：**

“这主要是为了解决并发环境下的**‘二义性’**问题。

- **在 HashMap（非并发）中：** 如果 `map.get(key)` 返回 `null`，我有两种情况：

1. 这个 key 不存在。
2. 这个 key 存在，但值就是 `null`。 **解决办法：** 我可以调用 `map.containsKey(key)` 再确认一下。因为是单线程，这两步操作之间 Map 不会变。

- **在 ConcurrentHashMap（并发）中：** 假如允许 null。 线程 A 调用 `map.get(key)` 得到 `null`。 线程 A 想去检查 `containsKey(key)`。 **Bug 来了：** 在这两行代码之间，线程 B 可能**刚好把这个 key 删除了**，或者**刚好把这个 key 设为了 null**。 这就导致线程 A 根本无法判断刚才那个 `null` 到底代表什么意思（是‘没有’还是‘值为null’）。 为了避免这种无法自证的逻辑死局，并发 Map 干脆直接禁止 `null`。”
