---
title: "阻塞队列选型与应用场景"
sidebarGroup: "并发容器"
shortTitle: "03 队列选型"
order: 3
date: 2026-11-24
category: "并发编程"
tag:
  - "并发编程"
  - "BlockingQueue"
---

> **并发容器 · 第 3/3 篇**  
> 上一篇：[《BlockingQueue 阻塞队列体系》](/并发编程/collections/juc-17-blocking-queue) · 下一篇：[《ThreadPoolExecutor 参数与执行流程》](/并发编程/pool/juc-19-thread-pool)

---

## 开头：同一种业务，队列选错后果不同

订单超时取消用 DelayQueue；VIP 插队用 PriorityBlockingQueue；线程池削峰用有界 ArrayBlockingQueue。队列不是「能装就行」，功能、容量、内存结构都会直接影响延迟和稳定性。

![PriorityBlockingQueue 介绍](/并发编程/collections/12/p18-01.png)

---

## 一、PriorityBlockingQueue：优先级出队

基于数组实现的**无界**优先级阻塞队列，默认自然序升序，可自定义 `Comparator`。出队总是优先级最高（或最低）的元素，**同优先级元素顺序不保证**。

- 电商抢购：会员等级高的优先
- 银行柜台：VIP 客户优先办理

```java
PriorityBlockingQueue<Integer> queue = new PriorityBlockingQueue<>(5);
// 降序
PriorityBlockingQueue<Integer> desc = new PriorityBlockingQueue<>(5, (a, b) -> b - a);
```

### 如何构造优先级队列

| 实现方式 | 插入 | 取最高优先级 | 删除最高 |
|----------|------|--------------|----------|
| 无序数组 | O(1) | O(n) | O(n) |
| 有序数组 | O(n) | O(1) | O(1) |
| **二叉堆** | O(log n) | O(1) | O(log n) |

大顶堆：父 ≥ 子；小顶堆：父 ≤ 子。完全二叉树 + 数组存储，是 PriorityBlockingQueue 的底层思路。

---

## 二、DelayQueue：延迟到期才出队

元素必须实现 `Delayed` 接口（继承 `Comparable`），按剩余延迟时间排序，队头是最早到期的任务。

```java
public interface Delayed extends Comparable<Delayed> {
    long getDelay(TimeUnit unit); // ≤0 表示已到期
}
```

### 实战：延迟订单处理

```java
DelayQueue<Order> delayQueue = new DelayQueue<>();
delayQueue.put(new Order("order1", System.currentTimeMillis(), 5000));
delayQueue.put(new Order("order2", System.currentTimeMillis(), 2000));
while (!delayQueue.isEmpty()) {
    Order order = delayQueue.take();
    System.out.println("处理订单：" + order.getOrderId());
}
```

订单按到期时间自动排序，`take()` 阻塞直到最近订单到期。典型用于：订单超时取消、缓存过期、定时重试。

**内部结构**：`ReentrantLock` + `PriorityQueue` + `leader` 线程优化——只有一个 leader 线程按剩余时间 timed wait，避免多个消费者同时空转。

`take()` 逻辑：取堆顶元素 → 若 `getDelay() <= 0` 则弹出 → 否则设 leader 并 `awaitNanos(delay)` → 到期后唤醒下一个等待者。

---

## 三、五维选型策略

| 维度 | 要点 |
|------|------|
| **功能** | 需排序 → PriorityBlockingQueue；需延迟 → DelayQueue |
| **容量** | 有界 ArrayBlockingQueue；无界 LinkedBlockingQueue；零容量 SynchronousQueue |
| **扩容** | ArrayBlockingQueue 固定；PriorityBlockingQueue 可自动扩容 |
| **内存** | 数组无 Node 开销；链表每元素一个 Node |
| **性能** | LinkedBlockingQueue 双锁；SynchronousQueue 直接传递最快 |

---

## 四、线程池与队列的默认搭配

| 线程池 | 默认队列 |
|--------|----------|
| FixedThreadPool / SingleThreadExecutor | LinkedBlockingQueue |
| CachedThreadPool | SynchronousQueue |
| ScheduledThreadPool | DelayedWorkQueue（延迟队列） |

**实践建议**：生产环境自定义 `ThreadPoolExecutor`，显式选有界队列，避免 `Executors` 默认无界队列在流量尖峰时 OOM。

---

## 小结

- 优先级 → **PriorityBlockingQueue**；定时/延迟 → **DelayQueue**
- 选型看功能、容量、扩容、内存、性能五个角度
- 并发容器系列收束；下一组进入 **线程池**——参数、执行流程与拒绝策略
