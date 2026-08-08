---
title: "并发容器 Map、List、Set 实战与原理"
sidebarGroup: "并发容器"
shortTitle: "01 并发容器"
order: 1
date: 2026-11-22
category: "并发编程"
tag:
  - "并发编程"
  - "ConcurrentHashMap"
---

> **并发容器 · 第 1/3 篇**  
> 下一篇：[《BlockingQueue 阻塞队列体系》](/并发编程/collections/juc-17-blocking-queue)

---

## 开头：HashMap 在多线程下为什么不够

你的网关服务维护一份 IP 黑名单，读请求每秒上万次，运维偶尔追加几条规则。用 `ArrayList` + `synchronized` 可以工作，但所有读线程都要抢同一把锁，吞吐量立刻掉下来。Java 在 `java.util.concurrent` 里提供了专门的并发容器，在「线程安全」和「性能」之间做了更精细的权衡。

![JUC 包下的并发容器概览](/并发编程/collections/11/p01-01.png)

---

## 一、JUC 并发容器家族

| 并发容器 | 替代的非并发容器 | 核心思路 |
|----------|------------------|----------|
| CopyOnWriteArrayList | Vector、synchronizedList | 读无锁，写时复制 |
| CopyOnWriteArraySet | synchronizedSet | 基于 COW List |
| ConcurrentHashMap | Hashtable、synchronizedMap | 分段/细粒度锁 + CAS |
| ConcurrentSkipListMap | TreeMap | 跳表 + 并发读写 |

同步容器（Vector、Hashtable）靠容器级 `synchronized`，多线程竞争同一把锁时吞吐会明显下降。并发容器针对「读多写少」「高并发读写 Map」等典型场景单独优化。

---

## 二、CopyOnWriteArrayList：读多写少的黑名单

### 2.1 适用场景

- **读多写少**：读不加锁，写时复制整份数组
- **允许短暂不一致**：如日志缓冲、配置快照、IP 黑名单——读者拿到的是某一时刻的快照，不必实时看到最新写入

![CopyOnWriteArrayList 应用场景](/并发编程/collections/11/p03-01.png)

### 2.2 实战：IP 黑名单判定

![IP 黑名单判定示例](/并发编程/collections/11/p04-page.png)

多个请求线程并发 `contains` 检查 IP；运维线程偶尔 `add` 新黑名单。读线程无锁遍历，写线程在副本上修改后一次性替换引用。

![CopyOnWriteArrayList 多线程演示](/并发编程/collections/11/p05-page.png)

### 2.3 原理：锁 + 数组拷贝 + volatile

![CopyOnWriteArrayList 原理四步](/并发编程/collections/11/p06-page.png)

写操作四步：加锁 → 复制数组 → 在新数组上修改 → 赋值给 `array` 并解锁。底层 `private transient volatile Object[] array` 保证替换后其他线程立即可见。

![CopyOnWriteArrayList 数据结构](/并发编程/collections/11/p07-page.png)

**优点**：读性能高；迭代器 Fail-Safe，遍历中不会因其他线程修改而抛 `ConcurrentModificationException`。

**缺点**：每次写都复制数组，内存与 GC 压力较大；无法保证读到最新数据。

### 2.4 fail-fast 与 fail-safe

![fail-fast 与 fail-safe 对比](/并发编程/collections/11/p09-page.png)

- **fail-fast**（ArrayList）：并发修改时抛异常
- **fail-safe**（CopyOnWriteArrayList）：在副本上迭代，不抛异常，但可能读到旧数据

---

## 三、ConcurrentHashMap：高并发共享 Map

### 3.1 演进

- **JDK 7**：Segment 分段锁，减小锁粒度
- **JDK 8+**：数组 + 链表 + 红黑树，CAS + synchronized 锁定桶头节点，内存更省、粒度更细

![ConcurrentHashMap 应用场景](/并发编程/collections/11/p10-page.png)

常用 API：`putIfAbsent`、`computeIfAbsent`、`merge` 等复合操作，适合缓存与计数。

### 3.2 实战：多线程词频统计

26 个文件、26 个线程各自读文件并写入共享 Map。普通 `HashMap` + `get/put` 会丢计数；正确做法：

```java
// 方案一：LongAdder 累加
deal(() -> new ConcurrentHashMap<String, LongAdder>(), (map, list) -> {
    list.forEach(str -> map.computeIfAbsent(str, k -> new LongAdder()).increment());
});

// 方案二：merge 原子合并
deal(() -> new ConcurrentHashMap<String, Integer>(), (map, list) -> {
    list.forEach(str -> map.merge(str, 1, Integer::sum));
});
```

![词频统计测试流程](/并发编程/collections/11/p11-page.png)

![生成测试文件](/并发编程/collections/11/p12-page.png)

![多线程读文件](/并发编程/collections/11/p13-page.png)

![正确结果每个字母 200 次](/并发编程/collections/11/p14-page.png)

### 3.3 数据结构对比

![Hashtable 与 JDK7 ConcurrentHashMap](/并发编程/collections/11/p15-page.png)

![JDK8 ConcurrentHashMap 结构](/并发编程/collections/11/p16-page.png)

树化条件：链表长度 ≥ 8 且数组长度 ≥ 64。

---

## 四、ConcurrentSkipListMap：有序并发 Map

基于跳表（Skip List），支持 O(log n) 插入/删除/查找，key 默认升序。适合需要 **有序遍历** 或 **区间查询** 的并发场景，如按商品 ID 维护销量排行榜。

跳表多层有序链表，高层是「快速通道」，底层包含全部元素。`ConcurrentSkipListMap` 在跳表基础上保证线程安全，替代 `synchronizedSortedMap(TreeMap)`。

---

## 小结

- 读多写少、允许快照一致 → **CopyOnWriteArrayList**
- 高并发 KV 读写、计数、缓存 → **ConcurrentHashMap**（配合 `merge` / `LongAdder`）
- 需要有序并发 Map → **ConcurrentSkipListMap**
- 下一篇进入 **BlockingQueue** 体系——线程池与生产者-消费者模型的基础设施。
