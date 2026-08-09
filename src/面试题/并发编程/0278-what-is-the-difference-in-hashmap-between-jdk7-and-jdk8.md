---
title: "JDK7与JDK8之间HashMap的区别？"
sidebarGroup: "并发编程"
shortTitle: "JDK7与JDK8之间HashMap的区别？"
order: 278
date: 2026-06-04
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： JDK 1.7 和 JDK 1.8 中的 HashMap 有什么区别？Fox版标准回答：“HashMap 在 JDK 1.8 做了一次彻底的重构，核心区别主要体现在底层数据结构、插入方式和扩容机制"
article: false
---

> 来源：[JDK7与JDK8之间HashMap的区别？](https://www.yuque.com/tulingzhouyu/db22bv/oi62527xx01nta0g)

## 一、 标准面试回答模版（建议背诵）

**面试官：** JDK 1.7 和 JDK 1.8 中的 HashMap 有什么区别？

**Fox版标准回答：**

“HashMap 在 JDK 1.8 做了一次彻底的重构，核心区别主要体现在**底层数据结构**、**插入方式**和**扩容机制**三个方面：

1. **底层数据结构：**

- **JDK 1.7：**`数组 + 链表`。无论链表多长，都一直遍历，极端情况下查询性能退化为 $O(n)$。
- **JDK 1.8：**`数组 + 链表 + 红黑树`。当链表长度超过 8（且数组长度大于 64）时，链表会强制转为红黑树，将查询性能从 $O(n)$ 提升到 $O(\log n)$，解决哈希冲突导致的性能衰减问题。

1. **插入数据的操作：**

- **JDK 1.7：** 采用**头插法**（Head Insertion）。新来的节点插在链表头部。
- **JDK 1.8：** 采用**尾插法**（Tail Insertion）。新来的节点插在链表尾部。
- **原因：** 1.7 的头插法在多线程扩容时会导致**‘死循环’**（环形链表）问题，1.8 改为尾插法解决了这个问题（但仍不保证线程安全）。

1. **扩容（Resize）时的计算：**

- **JDK 1.7：** 需要对每个元素**重新计算哈希值**，再取模算出新下标，效率较低。
- **JDK 1.8：** 采用**高低位算法**。不需要重新算哈希值，只需要判断 Hash 值新增的那一位是 0 还是 1，要么索引不变，要么索引 = 原索引 + 原数组长度。效率极大提升。”

## 二、 结构与源码对比（Talk is cheap）

面试时，建议脑子里要有这两张图的画面感，最好能给面试官画出来。

### 1. 数据结构对比

- JDK 1.7 (Entry)

就是一个纯粹的 Entry 数组。链表单纯是为了解决 Hash 冲突。

```java
static class Entry<K,V> implements Map.Entry<K,V> {
    final K key;
    V value;
    Entry<K,V> next; // 只有 next，典型的单向链表
    int hash;
}
```

- JDK 1.8 (Node / TreeNode)

Look at me! 这里多了一个复杂的 TreeNode。

```java
// 普通节点
static class Node<K,V> implements Map.Entry<K,V> { ... }

// 红黑树节点（继承自 LinkedHashMap.Entry）
static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
    TreeNode<K,V> parent;  // 红黑树需要的父节点
    TreeNode<K,V> left;
    TreeNode<K,V> right;
    boolean red; // 颜色属性
    // ...
}
```

- **关键阈值：**`TREEIFY_THRESHOLD = 8` (链表转树), `UNTREEIFY_THRESHOLD = 6` (树退化回链表)。

### 2. 扩容逻辑对比（核心优化）

- **JDK 1.7 逻辑：**

```java
// 伪代码
newIndex = hash(key) & (newCapacity - 1); // 必须重新计算位置
```

- JDK 1.8 逻辑（Fox高光点）：

不需要重新取模，直接看 hash & oldCap 的结果。

```java
// 伪代码逻辑
if ((e.hash & oldCap) == 0) {
    // 放在原位置
    newTab[j] = e;
} else {
    // 放在“原位置 + 原数组长度”的位置
    newTab[j + oldCap] = e;
}
```

**解析：** 这种位运算设计非常巧妙，直接利用了二进制的高位特性，省去了大量的哈希计算。

## 三、 Fox的深度解析

如果面试官问：“为什么 JDK 1.7 会出现死循环？JDK 1.8 改成尾插法就线程安全了吗？”

这是区分 P6 和 P7 的关键点。

**Fox版解析：**

1. 关于死循环（JDK 1.7）：

“核心原因是头插法在扩容时会改变链表元素的顺序。

假设线程 A 和线程 B 同时进行 transfer（扩容转移）。

- 原链表：A -> B -> C
- 线程 A 挂起，线程 B 完成扩容。因为是头插法，新数组里顺序变成了 C -> B -> A（**倒序**）。
- 线程 A 恢复执行，它还持有旧的引用关系。
- **结果：** 线程 A 试图把 B 接在 A 后面，但内存中 B 的 next 已经被线程 B 改成了 A。这就形成了 **A -> B -> A** 的环形链表。
- 一旦后续有查询操作 `get()` 命中这个环，CPU 直接飙升 100%。”

1. 关于 JDK 1.8 的安全性：

“JDK 1.8 改用尾插法，扩容时保持了链表元素的引用顺序（A 还是在 B 前面），所以解决了环形链表死循环的问题。

但是！Look at me!

JDK 1.8 的 HashMap 依然不是线程安全的！

在多线程并发插入时，可能会出现**数据覆盖（Data Overwrite）**的情况。

（例如：两个线程同时判断 slot 为空，同时写入，后一个会把前一个覆盖掉）。

所以，高并发场景下，请出门左转找 ConcurrentHashMap。”
