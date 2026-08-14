---
title: "JVM 对象创建与内存分配机制"
sidebarGroup: "JVM"
shortTitle: "04 对象与分配"
order: 4
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
description: "从 new 指令到 Eden、栈上分配与晋升老年代，并梳理可达性分析与引用类型。"
---

> **JVM 系列 · 第 4/12 篇**  
> 上一篇：[《JVM 内存模型深度剖析与优化》](/性能调优/jvm/jvm-03-memory-model) · 下一篇：[《JVM 字节码与 Class 文件结构》](/性能调优/jvm/jvm-05-classfile-bytecode)

---

## 开头：每一行 `new` 背后发生了什么

对象不是「往堆里一扔」这么简单：类是否已加载、内存从哪划、头里写什么、何时进 Survivor、何时进老年代、何时被 GC 判定死亡——都影响性能与 OOM。本篇按 **创建流程 → 对象布局 → 分配策略 → 回收判定** 展开。

---

## 一、对象创建的五步

![对象创建主要流程](/性能调优/jvm-04-object-allocation/p001-01.png)

### 1. 类加载检查

遇到 `new`、克隆、反序列化等，先查常量池符号引用，确认类已**加载、链接、初始化**；否则先走类加载（第 2 篇）。

### 2. 分配内存

类大小在加载后确定。在堆上划出一块，需解决：

**如何划分？**

| 方式 | 条件 |
|------|------|
| **指针碰撞**（Bump the Pointer） | 堆规整：已用/空闲分界清晰，移动指针即可（**默认**） |
| **空闲列表**（Free List） | 堆碎片化，维护可用块列表 |

**并发安全？**

- **CAS + 重试** 保证分配原子性
- **TLAB**（Thread Local Allocation Buffer）：线程在 Eden 预占一小片，**`-XX:+UseTLAB` 默认开启**，`-XX:TLABSize` 可调

### 3. 初始化零值

分配到的内存**清零**（不含对象头）。因此实例字段未显式赋值也可读到 `0` / `null`——与 `<init>` 里程序员赋值不同。

### 4. 设置对象头

HotSpot 对象布局：**对象头 + 实例数据 + 对齐填充**。

对象头含 **Mark Word**（hash、锁、GC 年龄等）与 **Klass Pointer**（指向 Metaspace 类元数据）。

HotSpot C++ 注释中的 Mark Word 位布局（32/64 位）：

![对象头 Mark Word 位格式](/性能调优/jvm-04-object-allocation/p002-01.png)

### 5. 执行 `<init>`

按构造方法与字段赋值完成**真正初始化**。

---

## 二、对象大小与指针压缩

### 2.1 用 JOL 查看

```xml
<dependency>
  <groupId>org.openjdk.jol</groupId>
  <artifactId>jol-core</artifactId>
  <version>0.17</version>
</dependency>
```

```java
public class JOLSample {
    public static void main(String[] args) {
        System.out.println(ClassLayout.parseInstance(new Object()).toPrintable());
        System.out.println(ClassLayout.parseInstance(new int[0]).toPrintable());
        System.out.println(ClassLayout.parseInstance(new A()).toPrintable());
    }

    public static class A {
        int id;
        String name;
        byte b;
        Object o;
    }
}
```

典型结果（开启压缩指针）：

- 空 `Object`：**16 字节**（12 头 + 4 对齐）
- `int[]`：16 字节头（数组长度占头内字段）
- 类 `A`：**32 字节**（字段 + 对齐 padding）

### 2.2 指针压缩（Compressed Oops）

| 参数 | 说明 |
|------|------|
| `-XX:+UseCompressedOops` | 默认开，压缩普通对象指针 |
| `-XX:+UseCompressedClassPointers` | 默认开，压缩 Klass 指针 |
| `-XX:-UseCompressedOops` | 关闭后引用/指针占 8 字节 |

**为何压缩？** 64 位 JVM 用 32 位指针可显著省堆带宽与 GC 压力。

**注意**：

- 堆 **≤ 32G** 时压缩有效；**> 32G** 压缩失效，对象寻址变 8 字节，相当于内存「变贵」
- 堆 **< 4G** 时 JVM 可直接用低 32 位地址，不必依赖压缩也能省空间

---

## 三、内存分配策略

![对象内存分配策略总览](/性能调优/jvm-04-object-allocation/p004-01.png)

### 3.1 栈上分配（逃逸分析）

默认认为对象在**堆**上分配。若**逃逸分析**（`-XX:+DoEscapeAnalysis`，JDK 7+ 默认开）证明对象未逃出方法，可 **标量替换**（`-XX:+EliminateAllocations`）在栈/寄存器分配，随栈帧销毁，减轻 GC。

```java
public User test1() {
    User user = new User();
    user.setId(1);
    return user;  // 逃逸：返回给外部
}

public void test2() {
    User user = new User();
    user.setId(1);
    // 不逃逸：方法结束即可回收
}
```

**栈上分配实验**（1 亿次 `alloc`，堆仅 15M）：

```java
/**
 * -Xmx15m -Xms15m -XX:+DoEscapeAnalysis -XX:+PrintGC -XX:+EliminateAllocations  → 几乎无 GC
 * 关闭 DoEscapeAnalysis 或 EliminateAllocations → 大量 GC
 */
public class AllotOnStack {
    public static void main(String[] args) {
        long start = System.currentTimeMillis();
        for (int i = 0; i < 100_000_000; i++) {
            alloc();
        }
        System.out.println(System.currentTimeMillis() - start);
    }

    private static void alloc() {
        User user = new User();
        user.setId(1);
        user.setName("zhuge");
    }
}
```

**标量 vs 聚合**：`int`、`reference` 等不可再分为**标量**；对象、数组是**聚合量**——可被拆成多个标量代替整个对象。

### 3.2 Eden 分配与 Minor GC

绝大多数对象在 **Eden** 出生。Eden 满 → **Minor GC / Young GC**（频繁、较快）。

Eden : Survivor0 : Survivor1 默认 **8:1:1**（`-XX:SurvivorRatio=8`）。  
`-XX:+UseAdaptiveSizePolicy`（默认开）会**自动调整**比例；要固定 8:1:1 可 `-XX:-UseAdaptiveSizePolicy`。

```java
// -XX:+PrintGCDetails
public class GCTest {
    public static void main(String[] args) {
        byte[] allocation1 = new byte[60000 * 1024]; // ~60MB
        byte[] allocation2 = new byte[8000 * 1024];   // 触发 Minor GC
    }
}
```

仅 allocation1 时 Eden 几乎占满；再加 allocation2 时 Eden 不够 → **Minor GC**，存活对象进 Survivor，后续小对象仍优先 **Eden**。

若 Survivor 放不下存活对象，会**提前晋升老年代**（见日志 `ParOldGen` 占用上升）。

### 3.3 大对象直接进入老年代

`-XX:PretenureSizeThreshold`（**Serial / ParNew** 有效）：超过阈值的对象**不进年轻代**，避免 Eden 间大量复制。需配合 `-XX:+UseSerialGC` 等验证。

### 3.4 长期存活与动态年龄

- 对象在 Survivor 间每熬过一次 Minor GC，**年龄 +1**
- 默认 `-XX:MaxTenuringThreshold=15`（CMS 默认 6 等因收集器而异）
- **动态年龄判定**：Survivor 中**同年龄对象大小总和 > Survivor 的 50%**（`-XX:TargetSurvivorRatio`）时，≥ 该年龄的对象可直接进老年代

### 3.5 老年代分配担保

Minor GC 前，JVM 检查老年代**连续空闲**是否大于年轻代所有对象（或历史晋升平均值，视 `-XX:HandlePromotionFailure` 等版本细节而定）。担保失败则先 **Full GC**；仍不够则 **OOM**。

---

## 四、对象何时「死亡」

### 4.1 引用计数（HotSpot 未采用）

循环引用会导致计数永不为 0：

```java
public class ReferenceCountingGc {
    Object instance = null;

    public static void main(String[] args) {
        ReferenceCountingGc objA = new ReferenceCountingGc();
        ReferenceCountingGc objB = new ReferenceCountingGc();
        objA.instance = objB;
        objB.instance = objA;
        objA = null;
        objB = null;
    }
}
```

### 4.2 可达性分析（实际使用）

从 **GC Roots** 出发，不可达即为可回收对象。

![可达性分析示意](/性能调优/jvm-04-object-allocation/p009-01.png)

**GC Roots 常见来源**：线程栈局部变量、静态变量、JNI 引用、同步锁持有对象、JVM 内部常量等。

### 4.3 四种引用

| 类型 | 示例 | 回收行为 |
|------|------|----------|
| **强引用** | `User u = new User()` | 不回收直到不可达 |
| **软引用** | `SoftReference<User>` | 内存紧张时回收，适合缓存 |
| **弱引用** | `WeakReference<User>` | 下次 GC 即回收 |
| **虚引用** | `PhantomReference` | 跟踪对象回收，几乎不用 |

软引用典型场景：浏览器「后退」页从内存缓存还是重新请求——需在内存与体验间权衡。

### 4.4 finalize 的「最后一次机会」

可达性分析后**第一次标记**时，若类覆盖了 `finalize()` 且未执行过，会入 F-Queue 低优先级线程执行。对象可在 `finalize()` 里**重新关联**到 GC Roots 逃脱回收——但 **`finalize()` 只会被 JVM 调用一次**，实战应依赖 `try-with-resources` / `Cleaner`，不要依赖 finalize。

### 4.5 类卸载（方法区 / Metaspace）

类需同时满足才算「无用类」（卸载很难）：

1. 该类所有实例已回收  
2. 加载该类的 **ClassLoader** 已回收  
3. 该类 `Class` 对象无任何引用  

自定义 ClassLoader + 热加载场景才可能触发；普通 AppClassLoader 加载的类几乎不会卸载。

---

## 本章小结

| 主题 | 要点 |
|------|------|
| 创建 | 检查 → 分配 → 零值 → 对象头 → `<init>` |
| 布局 | Mark Word + Klass + 字段 + padding；JOL 可测 |
| 压缩 | 堆宜 ≤32G 以享受 Compressed Oops |
| 分配 | TLAB、Eden、大对象进老年代、逃逸标量替换 |
| 晋升 | 年龄、动态年龄、担保与 Full GC |
| 死亡 | 可达性分析 + 引用强度 + 慎用 finalize |

理解分配路径后，第 7～8 篇各 **GC 收集器** 的行为差异才有落脚点——同一种 `new`，在 CMS、G1、ZGC 下的停顿与移动策略各不相同。
