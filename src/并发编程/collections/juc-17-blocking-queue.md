---
title: "BlockingQueue 阻塞队列体系"
sidebarGroup: "并发容器"
shortTitle: "02 BlockingQueue"
order: 2
date: 2026-11-23
category: "并发编程"
tag:
  - "并发编程"
  - "BlockingQueue"
---

> **并发容器 · 第 2/3 篇**  
> 上一篇：[《并发容器 Map、List、Set 实战与原理》](/并发编程/collections/juc-16-concurrent-collections) · 下一篇：[《阻塞队列选型与应用场景》](/并发编程/collections/juc-18-queue-selection)

---

## 开头：线程池里的任务往哪放

线程池收到任务后，核心线程忙不过来就要排队。这个「队」必须是线程安全的，还要能在满/空时阻塞生产者或消费者——这就是 **BlockingQueue**。JUC 里 Semaphore、线程池、生产者-消费者模型都建立在它之上。

![阻塞队列介绍](/并发编程/collections/12/p01-01.png)

---

## 一、Queue 与 BlockingQueue

普通 `Queue` 在满/空时抛异常或返回 null；**BlockingQueue** 在满时阻塞生产者、空时阻塞消费者，提供四组方法：

| 操作 | 抛异常 | 返回特殊值 | 阻塞 | 超时阻塞 |
|------|--------|------------|------|----------|
| 入队 | add | offer | put | offer(e, time, unit) |
| 出队 | remove | poll | take | poll(time, unit) |

典型场景：线程池任务队列、生产者-消费者、消息队列、缓存刷新、并发任务分发。

---

## 二、JUC 阻塞队列一览

| 队列 | 特点 |
|------|------|
| ArrayBlockingQueue | 有界数组，一把锁 |
| LinkedBlockingQueue | 链表，默认无界，读写锁分离 |
| PriorityBlockingQueue | 优先级无界 |
| DelayQueue | 延迟到期才能取 |
| SynchronousQueue | 容量 0，直接移交 |
| LinkedTransferQueue | 无界，支持 transfer |
| LinkedBlockingDeque | 双端阻塞 |

---

## 三、ArrayBlockingQueue：有界数组 + 一把锁

### 3.1 使用

```java
BlockingQueue<String> queue = new ArrayBlockingQueue<>(1024);
queue.put("1");           // 满则阻塞
String item = queue.take(); // 空则阻塞
```

独占锁 `ReentrantLock`，入队出队共用一把锁，生产消费无法并行，高并发下可能成为瓶颈。

### 3.2 原理：环形数组 + 双 Condition

核心字段：

```java
final Object[] items;
int takeIndex, putIndex, count;
final ReentrantLock lock;
private final Condition notEmpty, notFull;
```

**双指针环形数组**：插入/删除 O(1)，无需搬移元素。

```java
public void put(E e) throws InterruptedException {
    lock.lockInterruptibly();
    try {
        while (count == items.length)
            notFull.await();  // while 防虚假唤醒
        enqueue(e);
    } finally {
        lock.unlock();
    }
}

private void enqueue(E x) {
    items[putIndex] = x;
    if (++putIndex == items.length) putIndex = 0;
    count++;
    notEmpty.signal();
}
```

`take()` 对称：`count == 0` 时 `notEmpty.await()`，出队后 `notFull.signal()`。

**局限**：入队出队共用一把锁，生产消费无法并行。

---

## 四、LinkedBlockingQueue：读写锁分离

默认容量 `Integer.MAX_VALUE`，实质无界，任务堆积过快可能 OOM；生产环境建议显式指定容量。

- **putLock + takeLock** 分离，入队出队可并行
- 单链表，head 不存元素，tail 追加
- `count` 用 `AtomicInteger`，跨锁可见元素个数

入队时若 `c == 0`（原队列为空）则 `signalNotEmpty()` 唤醒消费者；出队时若 `c == capacity`（原队列满）则 `signalNotFull()` 唤醒生产者——这是锁分离带来的额外唤醒逻辑。

| 维度 | ArrayBlockingQueue | LinkedBlockingQueue |
|------|--------------------|---------------------|
| 容量 | 创建时固定 | 可指定有界，默认无界 |
| 结构 | 数组，无额外 Node | 链表，每元素一个 Node |
| 锁 | 单锁 | 读写双锁，吞吐更高 |

---

## 五、SynchronousQueue：零容量直接传递

容量为 **0**：`put` 必须等待 `take` 配对，不缓冲元素，适合「来一个处理一个」。

`Executors.newCachedThreadPool()` 用它作任务队列——任务到达即分配或新建线程，60 秒空闲后回收。

**注意**：生产消费必须配对，设计不当容易死锁。典型死锁：两个线程各自 `put` 再 `take`，都在等对方先取。

---

## 六、PriorityBlockingQueue 预览

基于数组的**无界**优先级阻塞队列，默认自然序升序，可自定义 `Comparator`。出队总是优先级最高（或最低）的元素，**同优先级元素顺序不保证**。

![优先级队列构造方式对比](/并发编程/collections/12/p18-01.png)

三种实现对比：无序数组取最高 O(n)；有序数组插入 O(n)；**二叉堆**插入/删除 O(log n)——PriorityBlockingQueue 底层思路。下一篇展开 PriorityBlockingQueue 与 DelayQueue 选型。

---

## 小结

- **有界、内存紧凑** → ArrayBlockingQueue
- **高并发读写、需指定上限** → LinkedBlockingQueue(capacity)
- **直接传递、CachedThreadPool** → SynchronousQueue
- 下一篇对比 PriorityBlockingQueue、DelayQueue，并从功能/容量/扩容/内存/性能五维做选型。
