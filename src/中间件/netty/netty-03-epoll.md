---
title: "深入 Linux epoll 事件轮询"
sidebarGroup: "Netty"
shortTitle: "03 epoll 机制"
order: 3
date: 2026-11-01
category: "中间件"
tag:
  - "Netty"
  - "中间件"
  - "网络"
---

> **Netty 系列 · 第 3/8 篇**  
> 上一篇：[《BIO、NIO、直接内存与零拷贝》](/中间件/netty/netty-02-bio-nio) · 下一篇：[《Netty 使用与常用组件（上）》](/中间件/netty/netty-04-components)

---

## 开头：为什么 Netty 在 Linux 上选 epoll？

上一篇知道 NIO 靠 **Selector** 多路复用；在 Linux 上，JDK 底层最终落到 **epoll**。搞懂 epoll 的「就绪列表 + 回调」，才能理解 Netty 为何在 Linux 用 `EpollEventLoopGroup`、以及空轮询 BUG 从何而来。

![同步/异步与阻塞/非阻塞组合](/中间件/netty/33/p02-01.png)

![Linux 五种 I/O 模型对比](/中间件/netty/33/p02-02.png)

![阻塞 IO 与 IO 复用模型](/中间件/netty/33/p02-03.png)

---

## 一、Linux 网络 I/O 模型速览

| 模型 | 特点 | Java 对应 |
|------|------|-----------|
| 阻塞 IO | 线程挂起等数据 | BIO |
| 非阻塞 IO | 轮询，CPU 空转 | 不推荐 |
| IO 复用 | select/poll/epoll | NIO Selector |
| 信号驱动 | 边缘通知 | 少用 |
| 异步 IO | Linux AIO 基于 epoll，收益有限 | AIO |

**结论**：高并发下 **IO 复用（epoll）** 是主流；Netty 4 在 Linux 也优先 epoll 而非 AIO。

---

## 二、从内核视角看一次 read

应用 `read()` 时，数据路径：网卡 DMA → 内核缓冲区 → 拷贝到用户 Buffer。  
**中断 + 软中断（ksoftirqd）** 通知内核有数据；为避免中断处理过重，分上半部/下半部。

![Linux 内核网络协议栈结构](/中间件/netty/33/p03-01.png)

![数据从网卡到应用的流向](/中间件/netty/33/p03-02.png)

Socket 创建：`socket()` → `bind()` → `listen()` → `accept()` → `send()/recv()`，内核层与之对应。

![应用层 Socket 与内核协议栈](/中间件/netty/33/p04-01.png)

---

## 三、select / poll / epoll 对比

三者都是 **IO 多路复用**：一个进程监视多个 fd，就绪再读写（仍是同步 I/O，就绪后自己读写）。

**文件描述符（FD）** 是内核给每个打开资源（文件、Socket）分配的非负整数；`select/poll/epoll` 监视的就是 fd 集合。Linux 默认单进程 fd 上限可通过 `ulimit -n` 调整，百万连接调优的基础。

| 维度 | select | poll | epoll |
|------|--------|------|-------|
| 最大连接 | 通常 1024（可改） | 无硬限 | 受内存限制 |
| 就绪检测 | 线性遍历 fd 集合 | 线性遍历 | 回调维护就绪链表 |
| 数据拷贝 | 每次拷贝 fd 集合到内核 | 同左 | 共享内存 mmap |
| 适用 | fd 少 | fd 较多 | 高并发 |

**select** 用 `fd_set` 位图，每次调用需把 fd 集合从用户态拷贝到内核，返回后再遍历全部 fd 检查就绪位；`FD_SETSIZE` 默认 1024 是硬限制。**poll** 用 `pollfd` 数组，无 1024 上限但仍需 O(n) 遍历。

![poll 与 epoll 创建/ctl/wait](/中间件/netty/33/p07-01.png)

![epoll 三大系统调用类比 JDK](/中间件/netty/33/p08-01.png)

![select/poll/epoll 性能对比表](/中间件/netty/33/p09-01.png)

---

## 四、epoll 高效原理

### 4.1 功能分离

`epoll_create` 创建 epoll 实例 → `epoll_ctl` 维护监视队列 → `epoll_wait` 阻塞等待。监视 fd 相对固定时，不必每次重建集合。

![epoll_wait 使用流程](/中间件/netty/33/p10-01.png)

![功能分离示意](/中间件/netty/33/p10-02.png)

### 4.2 就绪列表 rdlist

内核为每个 epoll 实例维护 **红黑树**（索引 socket）+ **双向链表 rdlist**（就绪 socket）。数据到达时，**ep_poll_callback** 把 socket 挂到 rdlist，唤醒 `epoll_wait`，无需遍历全部 fd。

![select 同时监视多 socket](/中间件/netty/33/p11-01.png)

![进程阻塞在 epoll_wait](/中间件/netty/33/p12-01.png)

![中断更新 rdlist 并唤醒进程](/中间件/netty/33/p13-01.png)

![rdlist 引用就绪 socket](/中间件/netty/33/p13-02.png)

![epoll 内核数据结构](/中间件/netty/33/p14-01.png)

![红黑树 + 就绪链表总结](/中间件/netty/33/p14-02.png)

![百万并发 epoll 处理流程](/中间件/netty/33/p15-01.png)

---

## 五、阻塞与唤醒：进程为何不占 CPU？

`recv` 阻塞时，进程从运行队列移到 **socket 等待队列**，不占 CPU；数据到达后中断把进程加回工作队列，`recv` 返回。

![recv 阻塞原理](/中间件/netty/33/p04-01.png)

---

## 小结

- **epoll** 用红黑树管理 fd、rdlist 记录就绪事件，避免 select 的全量遍历。
- JDK NIO 的 Selector 在 Linux 上封装 epoll；Netty 可进一步用 **EpollEventLoop** 开启 `SO_REUSEPORT` 等特性。
- 理解 epoll 后，下一篇看 Netty 如何把 epoll 包装成 **EventLoop + ChannelPipeline**。
