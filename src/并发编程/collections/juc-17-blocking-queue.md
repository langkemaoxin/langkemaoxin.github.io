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

![BlockingQueue 接口与场景](/并发编程/collections/12/p02-page.png)

典型场景：线程池任务队列、生产者-消费者、消息队列、缓存刷新、并发任务分发。

---

## 二、JUC 阻塞队列一览

![JUC 包下的阻塞队列](/并发编程/collections/12/p03-page.png)

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

![ArrayBlockingQueue 使用](/并发编程/collections/12/p04-page.png)

### 3.2 原理：环形数组 + 双 Condition

![ArrayBlockingQueue 数据结构](/并发编程/collections/12/p05-page.png)

核心字段：`items[]`、`takeIndex`、`putIndex`、`count`、一把 `ReentrantLock`、`notEmpty` / `notFull` 两个 Condition。

![入队 put 方法](/并发编程/collections/12/p06-page.png)

**双指针环形数组**：插入/删除 O(1)，无需搬移元素。`while` 而非 `if` 防止虚假唤醒。

![出队 take 方法](/并发编程/collections/12/p07-page.png)

**局限**：入队出队共用一把锁，生产消费无法并行，高并发下可能成为瓶颈。

---

## 四、LinkedBlockingQueue：读写锁分离

默认容量 `Integer.MAX_VALUE`，实质无界，任务堆积过快可能 OOM；生产环境建议显式指定容量。

![LinkedBlockingQueue 数据结构](/并发编程/collections/12/p08-page.png)

- **putLock + takeLock** 分离，入队出队可并行
- 单链表，head 不存元素，tail 追加
- `count` 用 `AtomicInteger`，跨锁可见元素个数

![LinkedBlockingQueue 入队](/并发编程/collections/12/p09-page.png)

![LinkedBlockingQueue 出队](/并发编程/collections/12/p10-page.png)

![LinkedBlockingQueue 与 ArrayBlockingQueue 对比](/并发编程/collections/12/p11-page.png)

| 维度 | ArrayBlockingQueue | LinkedBlockingQueue |
|------|--------------------|---------------------|
| 容量 | 创建时固定 | 可指定有界，默认无界 |
| 结构 | 数组，无额外 Node | 链表，每元素一个 Node |
| 锁 | 单锁 | 读写双锁，吞吐更高 |

---

## 五、SynchronousQueue：零容量直接传递

容量为 **0**：`put` 必须等待 `take` 配对，不缓冲元素，适合「来一个处理一个」。

![SynchronousQueue 原理](/并发编程/collections/12/p12-page.png)

`Executors.newCachedThreadPool()` 用它作任务队列——任务到达即分配或新建线程，60 秒空闲后回收。

![SynchronousQueue 使用](/并发编程/collections/12/p13-page.png)

**注意**：生产消费必须配对，设计不当容易死锁。

![SynchronousQueue 死锁示例](/并发编程/collections/12/p14-page.png)

![SynchronousQueue 死锁代码续](/并发编程/collections/12/p15-page.png)

![PriorityBlockingQueue 引入](/并发编程/collections/12/p16-page.png)

![PriorityBlockingQueue 使用示例](/并发编程/collections/12/p17-page.png)

![优先级队列构造方式对比](/并发编程/collections/12/p18-01.png)

---

## 小结

- **有界、内存紧凑** → ArrayBlockingQueue
- **高并发读写、需指定上限** → LinkedBlockingQueue(capacity)
- **直接传递、CachedThreadPool** → SynchronousQueue
- 下一篇对比 PriorityBlockingQueue、DelayQueue，并从功能/容量/扩容/内存/性能五维做选型。
