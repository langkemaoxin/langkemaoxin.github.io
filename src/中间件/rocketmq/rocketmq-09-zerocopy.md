---
title: "零拷贝与顺序写——高性能存储直觉"
sidebarGroup: "RocketMQ"
shortTitle: "09 零拷贝与顺序写"
order: 9
date: 2026-09-24
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 9/10 篇**  
> 上一篇：[《延迟与长轮询》](/中间件/rocketmq/rocketmq-08-delay-longpolling) · 下一篇：[《DLedger 与集群高级》](/中间件/rocketmq/rocketmq-10-cluster-advanced)

---

## 开头：面试常问零拷贝，CommitLog 里真的用了吗？

`DefaultMappedFile`、`FileChannel.map`、`transferTo` 不是背八股——它们对应操作系统 **PageCache、顺序写、mmap、sendfile**。RocketMQ 大量用 **mmap 写 CommitLog**；Kafka 更偏 **sendfile 发网卡**。理解差异，就理解「功能丰富 vs 极致吞吐」的产品取舍。

---

## 一、顺序写为何快

普通写文件：磁盘碎片 → 随机寻址 → 慢。  
顺序写：**预分配连续空间**，每次在尾部 append（`MappedFile.appendMessage`），减少磁头/FTL 寻址。

Kafka 官方测过：顺序写可接近内存带宽；SSD 上甚至可能超过堆内存写。RocketMQ CommitLog **单文件 1G** 也便于映射与管理。

![顺序写 vs 随机写](/中间件/rocketmq/42/p35-01.png)

---

## 二、PageCache 与刷盘

应用 `write` → 先进 **PageCache**（通常 4K 页），断电丢失。  
Linux 在脏页比例或关机时刷盘；应用可 `fsync` 强制落盘。

RocketMQ：

- 写入经 `MappedFile` / `fileChannel` 进 PageCache  
- **同步/异步刷盘**（第 7 篇）控制何时 `commit`/fsync  

查看 PageCache：`cat /proc/meminfo`（Cached、Dirty、Writeback 等）。

![PageCache 与刷盘关系](/中间件/rocketmq/42/p36-01.png)

---

## 三、CPU 拷贝 vs DMA

早期 IO 由 CPU 拷贝数据；**DMA** 接管内存↔设备拷贝，释放 CPU。  
高 IO 下 DMA 仍占 **总线** → **Channel** 处理器专责 IO（Java NIO 的 Channel 概念来源之一）。

**零拷贝**：减少 **CPU 参与的内核↔用户态拷贝次数**，不是绝对零次物理拷贝。

![传统四次拷贝](/中间件/rocketmq/42/p37-01.png)

![DMA 与 Channel](/中间件/rocketmq/42/p37-02.png)

---

## 四、mmap（内存映射）

`FileChannel.map()` → 用户态只保留 **映射元数据**，数据在内核 PageCache，读写经 `DirectByteBuffer` + `Unsafe` 直达内核。

对比 JDK：

- `HeapByteBuffer`：`byte[]` 在用户堆，**非**零拷贝路径  
- `DirectByteBuffer`：堆外地址，**mmap 路径**  

任意 Java 进程启动后 `lsof -p <pid>` 可见大量 **mem** 映射；CommitLog 单文件 **≤1G** 也利于 mmap（建议映射不超过约 2G）。

![mmap 拷贝路径](/中间件/rocketmq/42/p38-01.png)

![HeapByteBuffer vs DirectByteBuffer](/中间件/rocketmq/42/p39-01.png)

![lsof 查看映射文件](/中间件/rocketmq/42/p39-02.png)

---

## 五、sendfile

`FileChannel.transferTo()` → 内核态把 PageCache 数据送到 socket（现代内核常 **只传 fd + 长度**，数据由 DMA 打包，减少 CPU 拷贝）。

Linux `man 2 sendfile`：老内核 out_fd 限 socket，故网卡发送成经典例子；新版本更通用。

特点：**不需用户态参与数据面**，适合大块转发；灵活性不如 mmap。

![sendfile 数据路径](/中间件/rocketmq/42/p40-01.png)

![Kafka sendfile 发网卡示意](/中间件/rocketmq/42/p40-02.png)

---

## 六、mmap vs sendfile 怎么选

| | mmap | sendfile |
|---|------|----------|
| 用户态能否改数据 | 可以，较灵活 | 基本不能 |
| 典型场景 | 本地 CommitLog 读写、索引 | 磁盘 → 网络 bulk 发送 |
| RocketMQ / Kafka | RocketMQ 重 mmap | Kafka 重 sendfile |

→ RocketMQ 功能面更广（索引、过滤、延迟等多路径 touch 文件）；Kafka 消费链路更「日志管道化」，sendfile 收益大。

---

## 七、本章小结

读 store 模块时把三层叠在一起：**顺序 append CommitLog** → **PageCache + 刷盘策略** → **mmap 加速本地 IO**。下一篇收尾 **DLedger/Raft、Controller、BrokerContainer** 等 5.x 集群高级特性。
