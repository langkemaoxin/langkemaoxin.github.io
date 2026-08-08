---
title: "垃圾收集器 ParNew、CMS 与三色标记"
sidebarGroup: "JVM"
shortTitle: "07 ParNew 与 CMS"
order: 7
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
  - "GC"
  - "CMS"
  - "ParNew"
description: "分代收集、ParNew+CMS 工作流程与参数，三色标记、写屏障及亿级流量 JVM 调优案例。"
---

> **JVM 系列 · 第 7/12 篇**  
> 上一篇：[《深入理解 JVM 执行引擎》](/性能调优/jvm/jvm-06-execution-engine)  
> 下一篇：[《垃圾收集器 G1 与 ZGC》](/性能调优/jvm/jvm-08-g1-zgc)

---

## 开头：算法是方法论，收集器是落地实现

[内存模型](/性能调优/jvm/jvm-03-memory-model) 与 [对象分配](/性能调优/jvm/jvm-04-object-allocation) 讲清了堆怎么分；本文从 **三种经典收集算法** 出发，重点剖析 **ParNew + CMS** 组合、**三色标记** 与 **写屏障**，并以电商订单系统为例给出可落地的 JVM 参数思路。

---

## 一、分代收集理论

当前商用 JVM 普遍采用 **分代收集**：按对象存活周期把堆划分为 **新生代** 与 **老年代**，再按各代特点选算法。

| 区域 | 对象特征 | 常用算法 |
|------|----------|----------|
| 新生代 | 大量朝生夕死（约 99%） | **复制算法** |
| 老年代 | 存活率高 | **标记-清除** 或 **标记-整理** |

老年代纯标记类算法往往比复制慢一个数量级以上，因此要让 **短期对象尽量在 Minor GC 于 Survivor 内消化**，减少晋升老年代与 Full GC 频率。

---

## 二、三种基础收集算法

### 2.1 标记-复制（Copying）

把内存分成两块，每次只用一块；存活对象复制到另一块，再清空当前块。新生代默认策略，代价是 **只使用一半空间**（Eden + Survivor 是变体）。

![标记-复制算法示意](/性能调优/jvm-07-parnew-cms/p001-02.png)

### 2.2 标记-清除（Mark-Sweep）

先标记存活对象，再统一回收未标记对象。问题：**效率**（标记对象多时慢）与 **碎片**（产生大量不连续空闲）。

![标记-清除算法示意](/性能调优/jvm-07-parnew-cms/p002-02.png)

### 2.3 标记-整理（Mark-Compact）

标记过程同标记-清除，但后续让存活对象 **向一端移动**，再清理边界外内存。无碎片，但需移动对象，停顿通常更长。老年代 Serial Old、Parallel Old 等采用。

---

## 三、常见垃圾收集器概览

没有「万能」收集器，只有 **场景匹配**。HotSpot 部分收集器对比如下（节选）：

| 收集器 | 区域 | 线程 | 算法 | 关注 |
|--------|------|------|------|------|
| **Serial** | 新生代 | 单 | 复制 | 简单高效，STW |
| **Serial Old** | 老年代 | 单 | 标记-整理 | CMS 失败时的后备 |
| **Parallel Scavenge** | 新生代 | 多 | 复制 | **吞吐量** |
| **Parallel Old** | 老年代 | 多 | 标记-整理 | JDK 8 默认老年代 |
| **ParNew** | 新生代 | 多 | 复制 | **与 CMS 搭配** |
| **CMS** | 老年代 | 并发 | 标记-清除 | **低停顿** |

![垃圾收集器关系](/性能调优/jvm-07-parnew-cms/p003-01.png)

### 3.1 Serial / Serial Old

单线程收集，工作时 **Stop The World**。简单、无线程交互开销，在单核或客户端仍有价值。Serial Old 在 JDK 5 及以前与 Parallel Scavenge 搭配，或作为 **CMS 的 Concurrent Mode Failure 后备**。

### 3.2 Parallel Scavenge + Parallel Old

Parallel Scavenge 是 Serial 的多线程版，关注 **吞吐量** = 运行用户代码时间 / CPU 总时间。Parallel Old 为其老年代版。**JDK 8 默认** 新生代 `-XX:+UseParallelGC`、老年代 `-XX:+UseParallelOldGC`。

### 3.3 ParNew

与 Parallel Scavenge 类似的多线程复制收集器，但 **能与 CMS 配合**——Server 模式下除 Serial 外，它是 CMS 新生代的首选搭档。

参数：`-XX:+UseParNewGC`

---

## 四、CMS 收集器详解

**CMS（Concurrent Mark Sweep）** 以 **最短回收停顿** 为目标，是 HotSpot 第一款 **与用户线程并发** 的老年代收集器（`-XX:+UseConcMarkSweepGC`）。

基于 **标记-清除**，过程比 Serial / Parallel 复杂，分 **四步 + 重置**：

| 阶段 | STW | 说明 |
|------|-----|------|
| **初始标记** | 是 | 标记 GC Roots 直接关联对象，速度快 |
| **并发标记** | 否 | 从 GC Roots 遍历对象图，耗时长但与用户线程并发 |
| **重新标记** | 是 | 修正并发标记期间因用户线程运行导致的标记变动（**漏标**），用 **增量更新** |
| **并发清理** | 否 | 清理未标记区域；此阶段新对象视为黑色不处理 |
| **并发重置** | — | 重置本次标记数据 |

![CMS 工作流程](/性能调优/jvm-07-parnew-cms/p005-01.png)

### 4.1 优点与缺点

**优点**：并发收集、停顿短，适合注重体验的 Web 应用。

**缺点**：

1. **CPU 敏感**：并发阶段占用 CPU，与服务抢资源
2. **浮动垃圾**：并发标记/清理期间产生的新垃圾只能下次 GC 处理
3. **碎片**：标记-清除留下碎片；可 `-XX:+UseCMSCompactAtFullCollection` Full GC 后整理
4. **Concurrent Mode Failure**：上次 CMS 未完成又触发 GC，退化为 **Serial Old** 的 STW Full GC

### 4.2 CMS 常用参数

| 参数 | 说明 |
|------|------|
| `-XX:+UseConcMarkSweepGC` | 启用 CMS（老年代） |
| `-XX:ConcGCThreads` | 并发 GC 线程数 |
| `-XX:+UseCMSCompactAtFullCollection` | Full GC 后压缩整理 |
| `-XX:CMSFullGCsBeforeCompaction` | 多少次 Full GC 后压缩（0=每次） |
| `-XX:CMSInitiatingOccupancyFraction` | 老年代占用达此比例触发 CMS（默认 92%） |
| `-XX:+UseCMSInitiatingOccupancyOnly` | 仅用设定阈值，不让 JVM 自动调高 |
| `-XX:+CMSScavengeBeforeRemark` | Remark 前做一次 Minor GC，减标记开销 |
| `-XX:+CMSParallelInitialMarkEnabled` | 初始标记多线程 |
| `-XX:+CMSParallelRemarkEnabled` | 重新标记多线程 |

---

## 五、实战：亿级流量电商 ParNew + CMS 参数

大型电商后端多拆分为商品、库存、订单、促销等子系统。以 **8G 机器、JVM 约 3G 堆** 的 **订单系统** 为例。

### 5.1 初始配置的问题

```text
-Xms3072M -Xmx3072M -Xss1M -XX:MetaspaceSize=256M -XX:MaxMetaspaceSize=256M -XX:SurvivorRatio=8
```

未显式 `-Xmn` 时，**动态年龄判定** 可能导致对象过早进老年代、**频繁 Full GC**。

### 5.2 显式新生代

```text
-Xms3072M -Xmx3072M -Xmn2048M -Xss1M -XX:MetaspaceSize=256M -XX:MaxMetaspaceSize=256M -XX:SurvivorRatio=8
```

让短期对象尽量留在 Survivor，Minor GC 回收，少进老年代。

### 5.3 年龄与大对象

- Minor GC 间隔约 **20–30 秒**，多数对象几秒内变垃圾 → `-XX:MaxTenuringThreshold=5`（默认 15 偏大）
- `-XX:PretenureSizeThreshold=1M`：大对象（大 List/Map 缓存等）直接进老年代

### 5.4 选用 ParNew + CMS

内存 **>4G** 且对停顿敏感时，用 ParNew + CMS 替代 Parallel：

```text
-XX:+UseParNewGC -XX:+UseConcMarkSweepGC
```

### 5.5 老年代 CMS 参数思路

长期存活对象：Spring Bean、线程池、初始化缓存等，通常 **几十 MB** 量级。促销高峰可能 **瞬间大量订单** 导致一批对象晋升老年代；估算 **约半小时到一小时** 一次 Full GC 可接受（高峰过后）。

碎片：Full GC 间隔长，可每次或两三次后整理：

```text
-XX:CMSInitiatingOccupancyFraction=92 -XX:+UseCMSCompactAtFullCollection -XX:CMSFullGCsBeforeCompaction=3
```

### 5.6 推荐组合示例

```text
-Xms3072M -Xmx3072M -Xmn2048M -Xss1M
-XX:MetaspaceSize=256M -XX:MaxMetaspaceSize=256M
-XX:SurvivorRatio=8 -XX:MaxTenuringThreshold=5 -XX:PretenureSizeThreshold=1M
-XX:+UseParNewGC -XX:+UseConcMarkSweepGC
-XX:CMSInitiatingOccupancyFraction=92
-XX:+UseCMSCompactAtFullCollection -XX:CMSFullGCsBeforeCompaction=3
```

![订单系统 JVM 调优思路](/性能调优/jvm-07-parnew-cms/p006-01.png)

---

## 六、三色标记算法

并发标记时应用线程仍在运行，引用可能变化，会出现 **多标** 与 **漏标**。漏标会把仍存活对象当垃圾删除，必须解决。

### 6.1 三色含义

| 颜色 | 含义 |
|------|------|
| **白** | 尚未被 GC 访问；结束时仍为白则不可达 |
| **灰** | 已访问，但至少有一个引用未扫描 |
| **黑** | 已访问且所有引用已扫描；黑不可能直接指向白（不经灰） |

### 6.2 漏标示例

```java
public class ThreeColorRemark {
    public static void main(String[] args) {
        A a = new A();
        // 并发标记开始
        D d = a.b.d;   // 1. 读
        a.b.d = null;  // 2. 写
        a.d = d;       // 3. 写
    }
}
class A { B b = new B(); D d = null; }
class B { C c = new C(); D d = new D(); }
class C { }
class D { }
```

并发过程中 **灰对象删除对白的引用、黑对象新增对白的引用** 可能导致漏标。

### 6.3 两种修复思路

| 方案 | 思路 | 使用 |
|------|------|------|
| **增量更新** | 黑插入指向白的引用时记录，Remark 时以这些黑为根再扫 | **CMS** |
| **SATB（原始快照）** | 灰删除指向白的引用时记录，结束时以灰为根再扫，白标黑以保活 | **G1、Shenandoah** |

记录插入/删除通过 **写屏障** 实现。

### 6.4 写屏障与读屏障

赋值底层类似 `*field = new_value`。写屏障在赋值前后插入逻辑：

```c
void oop_field_store(oop* field, oop new_value) {
    pre_write_barrier(field);           // 写前（SATB 记旧值）
    *field = new_value;
    post_write_barrier(field, new_value); // 写后（增量更新记新引用）
}
```

- **SATB**：`pre_write_barrier` 记录被覆盖的旧引用
- **增量更新**：`post_write_barrier` 记录新引用

**读屏障**（如 ZGC）：在 `D d = a.b.d` 读字段前记录读到的对象；G1 用 SATB、CMS 用增量更新， partly 因 G1 Region 分散、深度重扫成本高。

### 6.5 多标：浮动垃圾

并发标记结束后，局部变量等 GC Root 销毁，已标记对象本轮不回收，称 **浮动垃圾**，不影响正确性。并发阶段 **新对象直接标黑**，本轮不清理，也算浮动垃圾。

---

## 七、记忆集与卡表

Minor GC 做可达性分析时，若 **整段老年代** 都作为 Root 扫描，代价过高。**记忆集（Remember Set）** 记录 **非收集区 → 收集区** 的跨代引用；HotSpot 用 **卡表（Card Table）** 实现——字节数组，每卡页默认 **512 字节**（2^9），卡内任一字段有跨代指针则对应卡表项置 **脏（1）**。

GC 时只把 **本代脏卡** 加入 GC Roots。卡表由 **写屏障** 在跨代引用赋值时维护。

![卡表与记忆集](/性能调优/jvm-07-parnew-cms/p011-01.png)

G1、ZGC 等 **部分区域收集** 同样面临跨 Region 引用，记忆集思想一致。

---

## 八、小结

| 主题 | 要点 |
|------|------|
| ParNew | 多线程复制，专配 CMS |
| CMS | 并发标记-清除，低停顿；注意碎片与 CMF |
| 三色标记 | 解决并发标记漏标/多标 |
| 写屏障 | CMS 增量更新；G1 SATB |
| 调优 | 大堆 + 低延迟：`-Xmn`、年龄、ParNew+CMS、CMS 触发比例 |

下一篇 [G1 与 ZGC](/性能调优/jvm/jvm-08-g1-zgc) 将介绍 Region 化、可预测停顿与 ZGC 读屏障/colored pointers。
