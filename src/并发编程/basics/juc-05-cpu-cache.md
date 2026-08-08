---
title: "CPU 缓存架构与多核可见性问题"
sidebarGroup: "并发基础"
shortTitle: "05 CPU 缓存与可见性"
order: 5
date: 2026-11-11
category: "并发编程"
tag:
  - "并发编程"
  - "CPU"
---

> **并发基础 · 第 5/5 篇**  
> 上一篇：[《原子性、可见性、有序性与 JMM》](/并发编程/basics/juc-04-jmm) · 下一系列：[《Callable、Future 与 FutureTask》](/并发编程/async/juc-06-future)

---

## 开头：JMM 的「工作内存」在硬件上是什么？

上一篇说线程各有工作内存副本——在真实机器上，这 largely 对应 **CPU 多级缓存** 与写缓冲。多核各有一份缓存，若不同步，就会出现 JMM 层面的可见性问题；若同一缓存行被无关变量共享，还会出现 **伪共享** 拖垮性能。

本篇串联：**高速缓存 → 多核一致性 → MESI → 伪共享与规避**，并简要说明这与高性能队列设计的关系。

![CPU 缓存与并发系列定位](/并发编程/performance/17/p01-01.png)

---

## 一、CPU 高速缓存

Cache 位于 CPU 与主存之间，容量小、速度快。常见 **L1 / L2 / L3**；读 miss 时逐级下探直至主存，写时按**缓存一致性协议**写回。

**局部性原理**：

- **时间局部性**：刚访问的数据很可能再访问（循环、递归）。  
- **空间局部性**：相邻地址很可能接着访问（数组、顺序代码）。

![局部性原理与多级缓存](/并发编程/performance/17/p02-page.png)

### 多核下的两个问题

- **场景一**：核 A 修改了某行，核 B 仍用旧副本 → 可见性/一致性问题。  
- **场景二**：两线程改同一缓存行内**不同字段** → 频繁失效，**伪共享**。

![多核缓存架构示意](/并发编程/performance/17/p03-page.png)

---

## 二、缓存一致性的硬件手段

IA-32 文档描述三类机制：

1. **保证的原子操作**（如 `CMPXCHG`）  
2. **总线锁定**（`LOCK#` 前缀）  
3. **缓存锁定 / 一致性协议**（现代主流）

数据**不能缓存**或**跨多个缓存行**时，可能退化为总线锁，开销更大。

![缓存一致性三种机制](/并发编程/performance/17/p05-page.png)

---

## 三、总线窥探与 MESI

**Bus Snooping**：各缓存监视总线事务，发现共享块被改则 **invalidate** 或 **update** 本地副本。

协议分 **写失效（Write-invalidate）** 与 **写更新（Write-update）**；x86 常用 **MESI**（Modified / Exclusive / Shared / Invalid）：

| 状态 | 含义 |
|------|------|
| M | 已修改，与主存不一致 |
| E | 独占且干净 |
| S | 多核共享且干净 |
| I | 无效 |

**Cache-to-cache** 复制可在命中 Shared 时减少访存，但须配合状态转换保证一致。

![MESI 状态与总线窥探](/并发编程/performance/17/p06-page.png)

![写失效协议工作流程](/并发编程/performance/17/p07-page.png)

---

## 四、伪共享（False Sharing）

两线程更新**同一 64 字节 Cache Line** 内的不同变量 → 行在核间来回失效，性能骤降。

例：`ArrayBlockingQueue` 的 `takeIndex`、`putIndex`、`count` 易落在同一行，生产者 put 与消费者 take 互相使对方缓存失效。

查看 Cache Line 大小（Linux）：`getconf LEVEL1_DCACHE_LINESIZE` 或 `/proc/cpuinfo`（通常 **64 字节**）。

![伪共享示意](/并发编程/performance/17/p08-page.png)

### 规避方案

1. **缓存行填充**：在 hot 字段间插入 `long p1..p7` 等 padding。  
2. **`@sun.misc.Contended`**（JDK 8+，常配合 `-XX:-RestrictContended`）。  
3. **ThreadLocal**：变量不跨线程共享。

![伪共享 benchmark 与填充](/并发编程/performance/17/p09-page.png)

![Contended 注解避免伪共享](/并发编程/performance/17/p10-page.png)

---

## 五、从缓存问题到高性能队列（延伸）

JUC 有界队列多用 **ReentrantLock**，高稳定场景下锁竞争 + **数组伪共享** 会成为瓶颈。LMAX **Disruptor** 等设计通过：

- **环形数组** + 2^n 长度位运算定位  
- **CAS** 无锁（或极少锁）  
- **缓存行填充** 隔离序列号与数据  

解决「内存队列延迟接近 I/O」类问题。Disruptor 细节见专栏 **性能扩展** 篇；此处只需建立联系：**懂 CPU 缓存，才理解为何要 padding、为何无锁队列要关心 Cache Line**。

![Disruptor 高性能队列预览](/并发编程/performance/17/p09-page.png)

![Disruptor RingBuffer 设计要点](/并发编程/performance/17/p10-page.png)

---

## 小结

- **JMM 工作内存** 在硬件上映射为 per-core 缓存与缓冲。  
- **MESI + 窥探** 保证多核一致；**伪共享** 是性能杀手。  
- 工程上：`Contended`、填充、布局拆分、ThreadLocal 按场景选用。

**并发基础**系列至此收束；下一系列进入 **异步编程：Future → CompletableFuture → ThreadLocal**。
