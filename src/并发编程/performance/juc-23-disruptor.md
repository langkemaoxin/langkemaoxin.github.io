---
title: "Disruptor 高性能内存队列实战"
sidebarGroup: "性能扩展"
shortTitle: "01 Disruptor"
order: 1
date: 2026-11-29
category: "并发编程"
tag:
  - "并发编程"
  - "Disruptor"
---

> **性能扩展 · 第 1/2 篇**  
> 下一篇：[《并发编程专栏收束——从 JMM 到队列与线程池》](/并发编程/performance/juc-24-summary)

---

## 开头：日志框架为什么用 Disruptor 而不是 BlockingQueue

高稳定系统里，生产者过快必须用**有界队列**防 OOM；JUC 阻塞队列普遍 `ReentrantLock`，竞争时线程挂起唤醒开销大；有界数组队列还容易 **伪共享**（false sharing）——`ArrayBlockingQueue` 的 `takeIndex`、`putIndex`、`count` 常挤在同一 Cache Line，生产者改 `putIndex` 会让消费者缓存行失效。LMAX Disruptor 用环形数组 + CAS + 缓存行填充，单线程每秒处理数百万订单级消息，Log4j2 异步日志、Storm 等都在用。

---

## 一、Disruptor 是什么

英国 LMAX 开发的高性能**有界**内存队列，解决传统队列延迟与 I/O 同量级的问题。GitHub：[LMAX-Exchange/disruptor](https://github.com/LMAX-Exchange/disruptor)

---

## 二、高性能设计

| 设计 | 作用 |
|------|------|
| **环形数组** | 预分配、少 GC；缓存友好 |
| **序号定位** | 长度 2^n，下标 `sequence & (length-1)`，O(1) |
| **CAS 无锁** | 生产者/消费者各自申请序号，减少锁竞争 |
| **缓存行填充** | 避免伪共享 |
| **等待策略** | 平衡 CPU 与延迟 |

### RingBuffer

可自定义大小的环形数组 + **sequence** 序列号。生产者与消费者通过序号申请槽位，写入/读取后 publish。

**覆盖问题**：槽位被覆盖前，消费者必须已处理——通过背压与容量规划保证。

### 等待策略

| 策略 | 特点 |
|------|------|
| BlockingWaitStrategy | 加锁，CPU 紧缺场景 |
| BusySpinWaitStrategy | 自旋，绑核低延迟 |
| YieldingWaitStrategy | 自旋+yield，均衡 |
| SleepingWaitStrategy | 加 sleep，延迟不均 |
| TimeoutBlockingWaitStrategy | 加锁+超时 |

---

## 三、Log4j2 中的应用

Log4j2 全异步模式（loggers all async）用 Disruptor；Async Appender 用 ArrayBlockingQueue。64 线程压测下，Disruptor 吞吐可达 Async Appender 的 12 倍、Sync 的 68 倍。

---

## 四、实战：单生产者单消费者

### 1. 依赖

```xml
<dependency>
    <groupId>com.lmax</groupId>
    <artifactId>disruptor</artifactId>
    <version>3.3.4</version>
</dependency>
```

### 2. 事件与工厂

```java
@Data
public class OrderEvent {
    private long value;
    private String name;
}

public class OrderEventFactory implements EventFactory<OrderEvent> {
    @Override
    public OrderEvent newInstance() { return new OrderEvent(); }
}
```

### 3. 生产者

```java
public void onData(long value, String name) {
    long sequence = ringBuffer.next();
    try {
        OrderEvent event = ringBuffer.get(sequence);
        event.setValue(value);
        event.setName(name);
    } finally {
        ringBuffer.publish(sequence);
    }
}
```

### 4. 消费者与启动

```java
Disruptor<OrderEvent> disruptor = new Disruptor<>(
    new OrderEventFactory(),
    1024 * 1024,
    Executors.defaultThreadFactory(),
    ProducerType.SINGLE,
    new YieldingWaitStrategy()
);
disruptor.handleEventsWith(new OrderEventHandler());
disruptor.start();
```

`EventHandler` 实现 `onEvent(OrderEvent event, long sequence, boolean endOfBatch)`。

---

## 五、多消费者模式

- **handleEventsWith(h1, h2)**：每个消费者**都处理**每条消息（广播）
- **handleEventsWithWorkerPool(h1, h2)**：每条消息只被一个消费者处理（竞争消费），需实现 `WorkHandler`

多生产者将 `ProducerType.MULTI`，多个线程各自 `ringBuffer.next()` + `publish`。

---

## 小结

- Disruptor 适合**极低延迟、高吞吐**的有界队列场景
- 环形数组 + 序号 + CAS + 等待策略是核心
- 与 BlockingQueue 相比无通用锁，但 API 更重，需预分配容量
- 下一篇：**专栏收束**——串联 JMM、锁、容器、线程池与性能优化
