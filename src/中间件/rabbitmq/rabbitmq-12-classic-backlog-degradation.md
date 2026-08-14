---
title: "Classic 队列为什么一堆积就变慢——内存窗口、落盘与流控"
sidebarGroup: "RabbitMQ"
shortTitle: "12 堆积为什么变慢"
order: 12
date: 2026-09-05
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 12/22 篇**  
> 上一篇：[《RabbitMQ 集群与高可用》](/中间件/rabbitmq/rabbitmq-11-cluster-ha)
> 下一篇预告：[《AMQP 1.0 与多协议——MQTT、STOMP、Stream》](/中间件/rabbitmq/rabbitmq-13-amqp-and-protocols)

---

## 开头：第 06 篇那句「断崖式下跌」，到底什么在跌

第 06 篇讲队列类型时，开头提过老版本 RabbitMQ 的一个痛点：

> Queue 里消息一堆积，生产和消费性能断崖式下跌。

当时只给了结论。这篇把这个「断崖」拆开——**内存里只留约 2048 条**、**越过窗口就落盘**、**磁盘随机 I/O + 流控叠加**，一起把吞吐砸下去。理解了这个机制，你才能看清 Quorum / Stream 当年各自要解决的到底是什么。

---

## 一、Classic 队列的内存窗口：只缓存约 2048 条

官方文档（[docs/classic-queues](https://www.rabbitmq.com/docs/classic-queues)）原话：

> Classic queues can store up to 2048 messages in memory, influenced by the consume rate.

意思是：Classic 队列在内存里**只留一个很小的固定窗口**（约 2048 条，还会受消费速率影响），窗口之外的消息都走持久化层落盘。这决定了它有两种截然不同的工作状态：

- **消息少**：全部待在内存里，生产、消费都是内存操作，极快。
- **消息堆积**：超出窗口的部分被挤进**持久化层**，从此生产和消费都要走磁盘 I/O。

持久化层分两块（这是理解后面所有磁盘 I/O 的前提）：

- **`queue index`**：每个队列一份，只记消息的**位置**和**投递状态**，很小，相当于目录。
- **`message store`**：存消息**正文**本身——这才是大头。大消息（> 4096 字节）走**共享**存储，一个 vhost 内所有队列共用一份，所以一条大消息 fan-out 给多个队列时只存一份；小消息（≤ 4096 字节）则直接「内嵌」，省一次查找。

为了让这条分界线不「乱跳」，3.12 做了两件简单的事，目标只有一个：**别让内存被消息偷偷占满**。

**① 大消息，用到时再读。**

内存放不下的消息会被写到磁盘上；可消费者要用它时，又得把它从磁盘读回内存——问题就在「什么时候读」。

以前是提前读：先把一批消息搬回内存排着队等。坑在于，一条 1MB 的大消息搬回来就实打实占掉 1MB 内存，搬几十条就把那点本就不大的内存预算吃光了；内存一紧张，Broker 就会暂停生产者（这个机制叫「流控」，flow control），吞吐立刻断崖。

3.12 的改法：**小消息可以提前放着（便宜），大消息（> 4096 字节）先别动，等真要投递给消费者那一刻，才去磁盘取回来发。**

> 还是那个比方：内存窗口是一张**传菜台**，地方有限。小菜可以提前摞在台上待命；但整桌宴席那种大托盘别先端上来占地方，等服务员（消费者）真来取的那一下，再从冷库（磁盘）端出来——台面就不会被几个大托盘堵死。

**② 每个队列的磁盘缓存，封顶 1MB。**

消息写在磁盘上也要读写快，所以 RabbitMQ 会在内存里为 message store 留一小块「中转区」：写的时候攒一批再落盘、读过的先留着方便再读。

以前这块中转区没有明确大小，积压一多就可能越涨越大，把内存吃掉。3.12 给每个队列的中转区设了上限，大约 **1MB**——于是内存占用变得可算：1000 个队列，中转区加起来也就 ~1GB，不会失控。

> 想细调的话，这个上限用配置项 `classic_queue_store_v2_max_cache_size` 改：调大 → 中转区更厚、吞吐更高但更费内存；调小 → 省内存但磁盘读写更频繁。

**合起来**：这两件事把「内存里到底放多少」从「可能突然暴涨」变成「有上限、可预期」。内存不再动不动触到警戒线、触发流控，那条断崖也就被削平了——这正是后文 v1 vs v2 里「v2 在高内存压力下更稳」的具体体现。

---

## 二、越过窗口之后：四件事叠加成「断崖」

为什么是「断崖」而不是「慢慢变慢」？因为越过内存窗口后，下面四件事几乎是同时发生的：

```
吞吐量
  高 │  ══════════╗        ← 全内存，飞速
     │            ╲
     │             ╲       ← 越过内存窗口：落盘 + 随机 I/O + 流控
  低 │              ╲___________________   ← 磁盘 bound，低位运行
     └──────────────────────────────────→
              约 2048 条             消息积压量
```

**1. 访问主体从 RAM 降到磁盘。** 内存（ns 级）和磁盘（μs~ms 级）差了一到两个数量级。这不是「多 10% 慢一点」，是介质直接降级——吞吐量瞬间掉一档。

**2. 磁盘访问是随机的，且读写互相争用。** 持久化层分两部分：`queue index`（按队列记录每条消息的位置和投递状态）和共享的 `message store`（存消息体）。积压一大，消费端要把散落在 store 里的老消息按序捞回来，读位置很乱；同时生产端还在往同一块盘写新消息——**读写争用同一块磁盘**，互相拖慢。

**3. 触发内存告警，Broker 直接 block 生产者（流控）。** 内存用到 high watermark 时，RabbitMQ 会暂停 publisher（flow control）。这是「生产性能下跌」最直接的来源——不是慢，是被掐住了。

> 这一步有官方原文背书（[docs/memory](https://www.rabbitmq.com/docs/memory)、[docs/alarms](https://www.rabbitmq.com/docs/alarms)）：默认内存用到**约 60% 可用内存**即触发告警——"publishing connections are blocked when memory use exceeds its watermark"；而且**只掐发布、不掐消费**："Connections solely used for consuming messages are not affected and continue to receive deliveries"。官方称之为 "a throttling mechanism for publishers"，内存降下来后才 "normal service resumes"。

**4. 内存抖动 / 换页 / index 膨胀。** 内存压力下，操作系统换页、Broker 在 RAM 与磁盘之间反复搬消息、queue index 还在持续变大——CPU 和 I/O 一起被吃掉，延迟开始抖动。

四件事叠加，所以曲线不是平缓下滑，而是**越过阈值后陡降**，这就是「断崖」的来源。

---

## 三、v1 vs v2：老版本为什么尤其扛不住

Classic 队列的持久化层有两个版本：

| 版本 | 引入 | 官方说明（[docs/persistence-conf](https://www.rabbitmq.com/docs/persistence-conf)） |
|------|------|------|
| **v1** | 早期 | 老实现，**在高内存压力下稳定性差** |
| **v2** | 3.10+ | more efficient message storage and queue index implementations，**improved stability under high memory pressure** |

3.10+ 默认 `classic_queue.default_version = 2`。也就是说——**老版本（v1）恰恰是高内存压力下最容易崩性能的那个**。第 06 篇里那句「Version 1 整文件读写，积压大时服务端压力大」，说的就是 v1。换句话说，「老版本 RabbitMQ 一堆积就慢」这个印象，很大一部分来自 v1 这套旧实现。

**4.0 起 v1 彻底移除，启动自动迁移到 v2。** 升级到 4.0 的节点启动时，会把存量 v1 队列的磁盘结构**原地改写**成 v2——大队列会耗时、期间该队列不可用。官方基准（测试机）：1000 个队列各 1000 条 100 字节消息 ≈ **2 秒**；单队列 100 万条 100 字节 ≈ **9 秒**；单队列 100 万条 5000 字节（走共享 store、数据更少）≈ **3 秒**。结论：除非队列极多且消息极多，否则几秒内完成；想提前迁可在 3.13 上预先操作（见 3.13 文档）。

---

## 四、当年的解法：lazy-mode（现在已并入默认）

在那个还没有 Quorum / Stream 的年代，官方给的「省内存」方案是 Classic 的 **lazy-mode 懒队列**：让消息**尽早写盘、尽量少占内存**，用磁盘 I/O 换内存。代价也很明显——吞吐变成磁盘 bound。

但 lazy-mode 现在已经没了。官方（[docs/lazy-queues](https://www.rabbitmq.com/docs/lazy-queues)）原话：

> Until RabbitMQ 3.12, classic queues could be configured to write all messages to disk and not keep messages in memory. **RabbitMQ no longer supports the "lazy" mode for classic queues.**

注意两点（也是常被误解的地方）：

1. **弃用节点是 3.12**，不是 3.13 / 3.11。
2. **lazy 不是「被 Quorum 替代」**。它的能力在 3.12 之后**被并进了 Classic 的默认行为**：消息一般会延迟写盘、短暂缓存在内存、只留一小部分在内存里供快速投递。换句话说，现在的 Classic 默认就接近当年的懒队列，lazy-mode 这个开关本身退役了。

---

## 五、现在的解法：Quorum 与 Stream 各管一摊

搞清楚「堆积变慢」的根因后，再回头看 3.8 引入 Quorum、3.9 引入 Stream，会发现它们解决的不是同一个问题：

| 痛点 | 解法 | 引入 | 它解决的是 |
|------|------|------|-----------|
| v1 高内存压力不稳；Classic 单点、无强一致复制 | **Quorum** | 3.8 | **可靠性 / 一致性**（Raft 复制、过半确认、durable 默认） |
| 海量积压时吞吐崩、内存撑不住、还要能回溯 | **Stream** | 3.9 | **大积压吞吐**（append-only 日志、百万级积压仍低内存、可按 offset 回放） |

特别要分清一件事：**Quorum 并不擅长海量积压**——它自己积压严重时内存也会涨（第 06 篇里写的「严重积压 → 考虑 Stream」是对的）。真正把「堆积→断崖」这个问题从根上解决的，是 **Stream**：append-only 日志天然适合堆积，消费端只按 offset 读、不需要把消息反复搬进搬出内存，所以百万级积压仍能保持低内存和高吞吐。

---

## 六、资源占用：文件句柄与内存

理解了内存窗口，再看 Classic 队列占用的两类资源——文件句柄和内存（官方 [docs/classic-queues](https://www.rabbitmq.com/docs/classic-queues) 的 Resource Use 一节）：

**文件句柄：每个 Classic v2 队列最多 6 个。** v2 不再像 v1 那样迁就「文件描述符紧张」的环境，它假定服务器 FD 上限开得足够大、随时能开新句柄。具体：队列 index 常开最多 4 个，per-queue message store 常开 1 个、刷盘时可能再开 1 个——合计**每队列最多 6 个 FD**（忙队列才到上限，闲队列 3–4 个就够）。所以「队列数 × ~6 + 每个网络连接 1 个」是 FD 需求的粗算，生产环境务必把 OS 的 FD 上限拉高（几万起）。

**内存：中转区封顶 1MB（见第一节），还有两个易忽略的点。**

- **空闲队列会主动收缩内存**；但反过来，做「一次影响大量队列」的操作（比如定义一条新 policy）时，所有匹配队列要重新分配内存，会出现**内存尖峰**——队列越多，尖峰越大。
- **共享 message store 的索引**：每条进 store 的消息都要一小块内存记它的索引项（默认实现）。消息量极大时这笔开销也会累积；它可以通过插件换成原生实现的 message store index 来消除，但吞吐会变慢（这类插件用原生代码，故不随发行版发布）。

> 调优口诀：**FD 上限拉高、单队列别扛全量、积压严重上 Stream**——前两点管 Classic 的稳，第三点才是根治大积压。

---

## 七、资源红线：内存与磁盘告警（Resource Alarms）

流控是「**背压**」——让发布者慢下来；资源告警是「**踩刹车**」——资源越线后**直接阻塞发布连接**，是比流控更硬的自我保护：

| 告警 | 默认红线 | 触发后 |
|------|---------|--------|
| **内存告警** | 节点内存超过「检测到的 RAM」的 **60%**（`vm_memory_high_watermark`，默认 0.6） | **阻塞发布**（消费与 Ack 不受影响），降到线下自动恢复 |
| **磁盘告警** | 磁盘可用空间 < **50MB**（`disk_free_limit`） | 同上；这是最危险的告警——持久化可能写盘失败 |

三个必须知道的性质：

- **告警是集群级的**：任一节点越线，**所有节点**都阻断发布者——防的是集群整体资源耗尽。排查「全体生产者同时卡住」时别只盯本节点。
- **水位是「刹车线」不是「目标」**：0.6 的含义是「用到 60% 就停」，正常水位应远低于此。**容器/K8s 里必须配绝对值**——cgroup 限内存时节点探测到的 RAM 未必准，相对水位可能形同虚设：`vm_memory_high_watermark.absolute = 2GB`、`disk_free_limit.absolute = 1GB`。
- **客户端可感知**：监听了 blocked 通知的客户端会收到 `connection.blocked` 事件（[14 网络篇](/中间件/rabbitmq/rabbitmq-14-networking)），生产端应据此暂停发送而不是傻等超时。

```bash
# 运行时调整（重启失效；持久化写进 rabbitmq.conf，见 02 篇 1.3）
rabbitmqctl set_vm_memory_high_watermark absolute 2GB
rabbitmqctl set_disk_free_limit 1GB

# 查当前告警（退出码非 0 即有告警）
rabbitmq-diagnostics check_local_alarms
```

管理台 Overview 顶部红条、`rabbitmqctl status` 的 Alarms 段都能看到。一句话区分：**流控是队列/连接粒度的限速，告警是节点/集群粒度的熔断**——前者慢下来，后者直接停。告警反复出现 = 容量规划出了问题，靠调高水位「消音」只是把崩溃推迟（见 [22 生产清单](/中间件/rabbitmq/rabbitmq-22-production-checklist)）。

---

## 小结

| 问题 | 一句话答案 |
|------|-----------|
| 为什么堆积就慢 | Classic 内存只留约 2048 条，越线就落盘 + 随机 I/O + 流控，四件事叠加成断崖 |
| 老版本为什么更糟 | v1 在高内存压力下稳定性差；v2（3.10+）才改进；4.0 启动自动 v1→v2 |
| lazy-mode 去哪了 | 3.12 移除，行为已并入 Classic 默认实现，**不是**被 Quorum 替代 |
| 谁真正解决大积压 | Quorum 管可靠 / 一致，**Stream** 才管大积压吞吐 |
| 资源占用怎么估 | 每队列最多 6 个文件句柄；内存中转区 1MB/队列，空闲收缩、policy 变更会尖峰 |
| 内存/磁盘告警 | 集群级熔断：内存默认 60% 水位、磁盘 50MB 红线，越线阻塞**所有节点**的发布；容器里务必配绝对值 |

理解了内存窗口这道「悬崖」，再回头看 06 篇里的选型建议——「严重积压用 Stream」——就从经验之谈变成了有据可查的工程结论。
