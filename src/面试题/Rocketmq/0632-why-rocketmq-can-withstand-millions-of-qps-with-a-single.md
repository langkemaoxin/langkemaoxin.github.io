---
title: "为什么 RocketMQ 一个 CommitLog文件就能抗住百万QPS"
sidebarGroup: "Rocketmq"
shortTitle: "为什么 RocketMQ 一个 CommitLog文件就能抗住百万QPS"
order: 632
date: 2026-03-04
category: "面试题"
tag:
  - "面试题"
description: "很多初学者觉得不可思议：磁盘 IO 那么慢，数据库插入几万条都费劲，RocketMQ 凭什么往一个文件里写数据能抗住百万 QPS？秘密在于它把 \"磁盘\" 当 \"内存\" 用。RocketMQ 的核心设计哲学是：顺序写盘（Sequential "
article: false
---

> 来源：[为什么 RocketMQ 一个 CommitLog文件就能抗住百万QPS](https://www.yuque.com/tulingzhouyu/db22bv/wp0sptu2ox10kgwl)

很多初学者觉得不可思议：**磁盘 IO 那么慢，数据库插入几万条都费劲，RocketMQ 凭什么往一个文件里写数据能抗住百万 QPS？**

秘密在于它把 "磁盘" 当 "内存" 用。

RocketMQ 的核心设计哲学是：**顺序写盘（Sequential Write） + 零拷贝（Zero Copy） + 内存映射（mmap）。**

我们分四个层级，像剥洋葱一样为你揭秘。

---

### 第一层：架构设计——“一种文件存所有”

RocketMQ 与 Kafka 最大的不同在于：

- **Kafka**：每个 Topic 的每个 Partition 一个文件。如果有 1000 个 Topic，写磁盘就是 1000 个文件的随机 IO。
- **RocketMQ**：无论你有多少 Topic，所有消息全部写入**同一个**逻辑文件，叫做 **CommitLog**。

**为什么要这么做？**
为了把**随机 IO** 强制转换为 **顺序 IO**。

- **随机 IO (Random I/O)**：磁头在盘面上疯狂跳动，寻道时间极长（最慢）。
- **顺序 IO (Sequential I/O)**：磁头几乎不动，一直往后写。

**性能数据对比**：
在机械硬盘（HDD）上，顺序写的速度可以达到 **600MB/s**，这甚至比**随机写内存**还要快！

我为你生成了一张架构图，直观对比这两种模式：

![image](/面试题/Rocketmq/0632-why-rocketmq-can-withstand-millions-of-qps-with-a-single/img-7663cd06da4f.png)

这图左边是普通 MQ 的噩梦，右边是 RocketMQ 的“单行道”策略。所有消息不分 Topic，全部排队进入 CommitLog，这就保证了极致的写性能。

---

### 第二层：底层实现—— MappedFile 与 mmap

即使是顺序写，如果每次写都要发生 `用户态  内核态` 的切换，性能也会崩。

RocketMQ 使用了 JDK 的 `MappedByteBuffer`，也就是操作系统的 **mmap (Memory Mapped Files)** 技术。

#### 1. 什么是 mmap？

它将磁盘文件直接映射到内存（PageCache）。

- **写数据**：直接写入内存映射区，操作系统会在后台异步刷盘到磁盘。
- **读数据**：直接从内存读，如果内存没有，操作系统利用缺页中断加载。

#### 2. Java 代码实现原理

在 RocketMQ 源码中，`MappedFile` 类是核心。每个 `MappedFile` 固定大小 **1GB**。

import java.io.File;
import java.io.RandomAccessFile;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;

public class MappedFileDemo {

```plain
// 1G 大小
public static final int FILE_SIZE = 1024 * 1024 * 1024; 

public static void main(String[] args) throws Exception {
    File file = new File("00000000000000000000"); // 文件名通常是偏移量
    
    // 1. 获取 FileChannel
    FileChannel fileChannel = new RandomAccessFile(file, "rw").getChannel();
    
    // 2. 关键：执行 mmap 映射
    // MapMode.READ_WRITE: 读写模式
    // 0: 映射起始位置
    // FILE_SIZE: 映射大小
    MappedByteBuffer mappedByteBuffer = fileChannel.map(FileChannel.MapMode.READ_WRITE, 0, FILE_SIZE);
    
    // 3. 写入数据 (这一步就像写内存 byte[] 一样快，完全没有磁盘 IO 阻塞)
    String msg = "Hello RocketMQ High Performance!";
    mappedByteBuffer.put(msg.getBytes());
    
    // 4. 刷盘 (由后台线程定期执行，不阻塞写入主线程)
    // mappedByteBuffer.force(); 
}
```

}

**代码深度解析**：

- `fileChannel.map` 是系统调用。它返回的 `MappedByteBuffer` 对象，让你操作文件就像操作内存里的 `byte[]` 数组一样。
- **零拷贝 (Zero Copy)**：

- **传统写**：磁盘 -> 内核 Buffer -> 用户 Buffer -> Socket Buffer -> 网卡。
- **mmap 写**：用户 Buffer 直接映射到内核 PageCache。数据少拷贝了一次。

---

### 第三层：文件预热与文件组 (MappedFileQueue)

如果每次写到 1GB 边界，都要创建一个新文件，那那一瞬间性能会卡顿。RocketMQ 做了极致优化：**文件预热**。

1. **预分配**：Broker 启动或文件快满时，后台线程提前创建好下一个 1GB 文件。
2. **预热 (Warm up)**：

- 创建完文件后，RocketMQ 会在这个 1GB 的空间里，每隔 4KB（一个内存页）写入一个 `0`。
- **为什么？** 为了强制操作系统分配物理内存页。防止第一次写入时触发大量的“缺页中断”导致卡顿。
- 源码中使用了 `mlock` 系统调用，锁定内存，防止被 SWAP 交换出去。

---

### 第四层：锁的艺术——如何抗住并发写入？

百万 QPS 意味着每秒有百万个线程（或者大量的并发请求）想往同一个 `MappedByteBuffer` 里写数据。
如果不加锁，数据就乱了；如果加锁，性能就崩了。

RocketMQ 采用了 **自旋锁 (SpinLock)** 和 **ReentrantLock** 双重策略，并配合 **TransientStorePool**（堆外内存池）。

#### 关键优化：TransientStorePool (读写分离)

为了进一步榨干性能，RocketMQ 开启 `transientStorePoolEnable=true` 后，架构变成了这样：

1. **写入**：数据先写入 **堆外内存 (DirectByteBuffer)**。这个操作极快，因为完全纯内存，无锁或轻量级锁。
2. **提交**：后台线程异步将 堆外内存 `commit` 到 `PageCache` (MappedByteBuffer)。
3. **刷盘**：操作系统或后台线程将 `PageCache` `flush` 到磁盘。

**图解数据流向：**

> Producer -> DirectMemory (堆外内存) -> PageCache (内核缓存) -> Disk (磁盘)

这种**读写分离**的设计，让 Producer 的写入线程几乎不碰磁盘，甚至不碰 PageCache 的锁竞争，从而实现了极致的吞吐量。

---

### 总结：为什么能抗百万 QPS？

结合上面的层层递进，RocketMQ 的性能秘籍总结如下：

1. **顺序写 (Sequential Write)**：不管多少 Topic，统统写入一个 CommitLog，消灭磁盘寻道时间。
2. **内存映射 (mmap)**：利用 `MappedByteBuffer`，像写内存一样写文件，利用操作系统的 PageCache 做天然缓存。
3. **零拷贝 (Zero Copy)**：减少 CPU 上下文切换和内存拷贝次数。
4. **文件预热 (Pre-allocation)**：利用 `fallocate` 和 `mlock` 提前占坑，避免运行时分配内存的抖动。
5. **堆外内存池 (TransientStorePool)**：实现写入与刷盘的彻底解耦。

**一句话总结**：RocketMQ 并不是真的在“写磁盘”，它其实是在**并发写内存（PageCache/堆外内存）**，然后由操作系统在后台偷偷把数据落盘。这就是它快的本质！
