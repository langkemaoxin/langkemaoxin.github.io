---
title: "垃圾收集器 G1 与 ZGC"
sidebarGroup: "JVM"
shortTitle: "08 G1 与 ZGC"
order: 8
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
  - "GC"
  - "G1"
  - "ZGC"
description: "G1 Region 与 Mixed GC、Kafka 大堆场景调优，以及 ZGC 颜色指针、读屏障与收集器选型。"
---

> **JVM 系列 · 第 8/12 篇**  
> 上一篇：[《垃圾收集器 ParNew、CMS 与三色标记》](/性能调优/jvm/jvm-07-parnew-cms)  
> 下一篇：[《JVM 调优工具详解及调优实战》](/性能调优/jvm/jvm-09-tuning-tools)

---

## 开头：从固定分代到 Region，再到亚毫秒级停顿

[ParNew + CMS](/性能调优/jvm/jvm-07-parnew-cms) 适合许多 4–8G 堆的低延迟 Web 场景；当堆 **更大**、停顿要求 **更严** 时，**G1** 与 **ZGC** 成为 JDK 9+ 的主流选择。本文讲清二者原理、参数与典型场景。

---

## 一、G1 收集器（-XX:+UseG1GC）

**G1（Garbage-First）** 面向 **多核 + 大内存** 服务端：在极高概率满足 **停顿时间目标** 的同时保持高吞吐。

### 1.1 Region 化堆布局

- 堆划分为多个大小相等的 **Region**（最多 **2048** 个）
- 默认 Region 大小 = 堆大小 / 2048（如 4096M 堆 → 约 2M/Region），可用 `-XX:G1HeapRegionSize` 指定（1–32MB，2 的幂）
- **逻辑上** 仍有年轻代/老年代，但 **物理上** 都是 Region 集合，可 **不连续**，角色可 **动态变化**

![G1 Region 布局](/性能调优/jvm-08-g1-zgc/p001-02.png)

**年轻代**：默认约占堆 **5%**（`-XX:G1NewSizePercent`），运行中可扩至 `-XX:G1MaxNewSizePercent`（默认 60%）。Eden : Survivor 仍约 **8:1:1**。

**Humongous**：超过 Region **50%** 的对象进 **Humongous Region**（可跨多个 Region），避免直接进老年代占满导致 GC；Full GC 时一并回收。

### 1.2 一次 G1 GC 的主要阶段

| 阶段 | STW | 说明 |
|------|-----|------|
| **初始标记** | 是 | 标记 GC Roots 直接关联对象 |
| **并发标记** | 否 | 同 CMS |
| **最终标记（Remark）** | 是 | 同 CMS 重新标记，SATB |
| **筛选回收（Cleanup）** | 是 | 按 **回收价值/成本** 排序，在 `-XX:MaxGCPauseMillis` 预算内选 Region 集合（CSet）回收；复制算法，碎片少 |

G1 维护 **优先级列表**，优先回收 **单位时间收益最大** 的 Region（Garbage-First 得名）。筛选阶段暂 **未** 与用户线程并发回收（Shenandoah 进一步并发）。

![G1 收集过程](/性能调优/jvm-08-g1-zgc/p002-01.png)

### 1.3 G1 特点（小结）

- **并行与并发**：多 CPU 缩短 STW；部分阶段并发
- **分代概念保留**：独立管理整堆
- **空间整合**：整体标记-整理，局部复制
- **可预测停顿**：`-XX:MaxGCPauseMillis`（默认 **200ms**）——需 realistic，设过低（如 20ms）可能导致 CSet 过小、回收跟不上分配、最终 **Full GC**

### 1.4 G1 垃圾收集分类

| 类型 | 触发 | 说明 |
|------|------|------|
| **Young GC** | Eden 将满且预估回收时间接近 `MaxGCPauseMillis` | 并非 Eden 一满就 GC，可能先扩年轻代 Region |
| **Mixed GC** | 老年代达 `-XX:InitiatingHeapOccupancyPercent`（默认 45%） | 回收全部 Young + 部分 Old + Humongous |
| **Full GC** | Mixed 复制时无足够空 Region 等 | 单线程标记-整理-压缩，耗时长 |

### 1.5 G1 常用参数

| 参数 | 说明 |
|------|------|
| `-XX:+UseG1GC` | 启用 G1 |
| `-XX:G1HeapRegionSize` | Region 大小 |
| `-XX:MaxGCPauseMillis` | 目标停顿（默认 200ms） |
| `-XX:G1NewSizePercent` / `G1MaxNewSizePercent` | 新生代占比上下限 |
| `-XX:InitiatingHeapOccupancyPercent` | Mixed GC 触发阈值（默认 45%） |
| `-XX:G1MixedGCLiveThresholdPercent` | Region 存活低于此才回收（默认 85%） |
| `-XX:G1MixedGCCountTarget` | 一次 Mixed 分几次筛选回收（默认 8） |
| `-XX:G1HeapWastePercent` | 空 Region 达堆 5% 则结束本次 Mixed |

### 1.6 调优建议

若 `MaxGCPauseMillis` 过大，年轻代可能占到堆 60% 才 Young GC → Survivor 放不下 → 快速进老年代 → 频繁 Mixed GC。

**核心**：在「别太频繁 Young GC」与「单次 GC 后存活对象别太多」之间平衡 `MaxGCPauseMillis`。

![G1 调优关注点](/性能调优/jvm-08-g1-zgc/p004-01.png)

### 1.7 适用场景

1. 存活对象占堆 **50%+**
2. 分配/晋升速率变化大
3. GC 停顿 **>1s** 不可接受
4. 堆 **≥8G**（经验值）
5. 目标停顿 **500ms 内**

### 1.8 案例：Kafka 级高并发与大 Eden

Kafka 等消息系统常部署 **64G** 机器，年轻代可达 **三四十 G**。Eden 极大时，一次 Young GC 也要 **数秒**；若 **1–2 分钟** 就满 Eden，系统会周期性卡顿。

**思路**：G1 + `-XX:MaxGCPauseMillis=50`——若 50ms 能回收 **3–4G**，用户几乎无感，边处理消息边收集。

G1 **天生适合大内存**、可控停顿，是此类场景的首选之一。

---

## 二、ZGC 收集器（-XX:+UseZGC）

**ZGC** 在 **JDK 11** 引入（实验性），源于 Azul **C4**，面向 **超低延迟**。

### 2.1 设计目标

![ZGC 设计目标](/性能调优/jvm-08-g1-zgc/p005-01.png)

| 目标 | 说明 |
|------|------|
| 支持 **TB 级** 堆 | 满足未来超大堆需求 |
| 最大停顿 **<10ms** | 停顿与 Root 扫描相关，与堆大小 **几乎无关** |
| 吞吐量损失 | 最坏约 **15%**（读屏障等开销） |
| 停顿不随堆增大而增长 | 几十 G 与几百 G 均可亚 10ms 级 |

### 2.2 暂不分代

ZGC 当前 **单代** 设计——分代实现复杂，作者先做单代可用版；「朝生夕死」假设下，全堆扫描对短生命周期对象不够友好，带来 **浮动垃圾** 问题（后述）。

### 2.3 Region 与 NUMA

基于 Region，容量分三类：

| 类型 | 容量 | 对象 |
|------|------|------|
| Small | 2MB | <256KB |
| Medium | 32MB | 256KB–4MB |
| Large | 2MB 整数倍，动态 | ≥4MB，每 Region 一个大对象，不重分配 |

![ZGC Region 与 NUMA](/性能调优/jvm-08-g1-zgc/p006-01.png)

**NUMA-aware**：各 CPU 优先访问本地内存，ZGC 可感知 NUMA，降低跨节点访问延迟。

### 2.4  colored pointers（颜色指针）

GC 信息存在 **指针** 而非对象头。64 位指针划分（概念上）：

- 18 位：预留
- 4 位：Finalizable / Remapped / Marked1 / Marked0
- 42 位：对象地址（支持 **4T**；JDK 13+ 扩至 **16T**，受 48 位地址总线限制）

每轮 GC **交换 Mark 位**，使上轮标记失效。ZGC 需 **64 位**、**不支持压缩指针（CompressedOops）**。

![颜色指针](/性能调优/jvm-08-g1-zgc/p006-03.png)

**优势**：Region 移走存活对象后可 **立即释放**；读屏障少；可扩展记录重定位等元数据。

### 2.5 读屏障（Load Barrier）

以往 GC 多用 **写屏障**；ZGC 在 **从堆读引用** 时加 **读屏障**：若对象已被移动，则 **自愈（Self-Healing）**——通过转发表更新指针到新地址。类似 CAS 自旋发现值失效需重读。

```java
Object o = obj.fieldA;  // 可能触发读屏障
Object p = o;           // 非堆读，无屏障
o.doSomething();        // 非读引用
int x = obj.fieldB;     // 基本类型，无屏障
```

官方测试读屏障约 **+4%** 吞吐开销。

![读屏障与 Good/Bad Color](/性能调优/jvm-08-g1-zgc/p008-01.png)

### 2.6 ZGC 运作阶段

1. **并发标记**：在指针上标记 Marked0/1（有短暂初始/最终标记 STW）
2. **并发预备重分配**：统计待清理 Region，组成 **重分配集（Relocation Set）**——全堆扫描 Region，换省去 G1 式记忆集维护
3. **并发重分配**：复制存活对象，维护 **转发表**；用户经读屏障访问旧地址时转发并修正引用
4. **并发重映射**：修正全堆指向旧对象的引用；因 **自愈**，可合并到 **下一轮并发标记**，省一次遍历

### 2.7 浮动垃圾与局限

ZGC 全程可能 **10 分钟** 级，期间大量新对象只能下次 GC 回收 → **浮动垃圾**。无分代时短生命周期对象不能及时清理。

**缓解**：增大堆换喘息时间；根本方案是引入 **分代 ZGC**（JDK 后续版本演进方向）。

![ZGC 参数与触发](/性能调优/jvm-08-g1-zgc/p009-01.png)

### 2.8 启用与触发

```text
-XX:+UnlockExperimentalVMOptions -XX:+UseZGC   # JDK 11–15 等需 experimental
```

调参项少，主要靠 JVM 自适应。触发机制包括：定时、预热（10%/20%/30% 堆）、分配速率、主动（距上次 GC 堆增 10% 或超 5 分钟等）。

---

## 三、如何选择垃圾收集器

经验法则（需结合压测）：

| 场景 | 建议 |
|------|------|
| 优先让 JVM 自选 | 小堆、无特殊 SLA |
| 堆 <100M | Serial |
| 单核、可 STW | Serial 或默认 |
| 停顿可 >1s | Parallel |
| 响应优先、停顿 <1s | 并发收集器 |
| **4G 以下** | Parallel |
| **4–8G** | ParNew + CMS |
| **8G 以上** | **G1** |
| **数百 G** | **ZGC** |

![收集器搭配关系](/性能调优/jvm-08-g1-zgc/p010-01.png)

- **JDK 8 默认**：Parallel Scavenge + Parallel Old  
- **JDK 9+ 默认**：G1  

---

## 四、安全点与安全区域

GC 等操作需线程处于 **确定状态**，不能随意暂停。线程运行到 **安全点（Safepoint）** 时状态确定，JVM 可安全 STW。常见位置：方法返回/调用后、异常抛出处、**循环末尾** 等。实现上设置标志位，线程 **主动轮询** 并在安全点挂起。

若线程 **Sleep 或 blocked**，无法跑到 Safepoint → 引入 **安全区域（Safe Region）**：一段代码内引用关系不变，在此区域内任意位置开始 GC 都安全。

---

## 五、小结

| 收集器 | 核心 | 适用 |
|--------|------|------|
| **G1** | Region、可预测停顿、Mixed GC、SATB | 8G+、停顿敏感服务端 |
| **ZGC** | 颜色指针、读屏障、并发重分配 | 超大堆、亚 10ms 停顿 |

与 [CMS 三色标记](/性能调优/jvm/jvm-07-parnew-cms)、[调优工具篇](/性能调优/jvm/jvm-09-tuning-tools) 配合，可完成从理论到线上指标闭环。
