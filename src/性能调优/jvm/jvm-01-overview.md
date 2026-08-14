---
title: "全面理解 JVM 虚拟机"
sidebarGroup: "JVM"
shortTitle: "01 JVM 总览"
order: 1
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
description: "从 Class 文件、类加载、执行引擎到 GC 与调参，建立 JVM 全景认知，为后续深入打底。"
---

> **JVM 系列 · 第 1/12 篇**  
> 下一篇：[《Java 类加载机制》](/性能调优/jvm/jvm-02-classloader)

---

## 开头：熟悉又陌生的中间层

JVM 夹在 Java 代码与操作系统之间——你每天都在用，却未必说得清 `.java` 如何变成机器指令、内存如何划分、线上 OOM 该从哪查起。

本篇按**实战脉络**串一遍 JVM 核心模块：Class 文件规范、字节码、类加载、执行引擎、垃圾回收与 GC 日志分析。细节会在后续 11 篇里展开；这里的目标是**建立地图**，让你知道「问题该往哪一类知识里找」。

---

## 一、为什么要学 JVM

常见动机有三：

1. **面试**：题量大，靠背八股不如理解底层逻辑，举一反三。
2. **写代码**：不知道对象在哪分配、锁怎么升级，排查「偶发错误」会很被动。
3. **线上运维**：服务要配多少内存？4G 够不够？Full GC 频繁、进程崩溃，如何快速定位？

JVM 是性能调优的底座。会调参与不会调参，往往对应「能独立解决问题」与「只会 CRUD」的分水岭——不是说你必须成为 JVM 专家，而是**关键故障不能永远等别人来救**。

---

## 二、JVM 全景：后面要学什么

Java 早已不只是语言，更是一套**规范**：只要能产出符合规范的 `.class`，就能交给 JVM 执行。JVM 屏蔽上层语言差异，也屏蔽下层操作系统差异——**一次编写，多次执行**。同一项目里混用 Java 与 Scala 就是典型例子。

主流实现是 Oracle **HotSpot**（本系列默认以 JDK 8 为主讲解，并会在后文点到 JDK 17+ 变化）。

一个 `.java` 文件的大致执行路径：

![Java 源码到执行的完整路径](/性能调优/jvm-01-overview/p002-01.png)

```bash
java -version
# java version "1.8.0_391"
# Java(TM) SE Runtime Environment (build 1.8.0_391-b13)
# Java HotSpot(TM) 64-Bit Server VM (build 25.391-b13, mixed mode)
```

后续系列会按模块深入：

| 模块 | 要点 |
|------|------|
| Class 文件 | 结构、字节码指令、try-catch-finally |
| 类加载 | JDK 8 体系、双亲委派、沙箱 |
| 执行引擎 | 解释/编译、JIT、分层编译 |
| GC | 分代模型、收集器组合、调参 |
| 实战 | GC 日志、分析工具 |

---

## 三、Class 文件规范

Oracle 只定义 **JVM 执行规范**——即 Class 文件如何组织。`.class` 从哪来（Java、Kotlin、Scala…）JVM 并不关心，这也是**多语言共存**的基础。

规范全文：[Java SE 8 VM Specification](https://docs.oracle.com/javase/specs/jvms/se8/html/index.html)

### 3.1 二进制与魔数

Class 文件本质是二进制。用 UltraEdit 等工具打开，可见十六进制内容；**所有 Class 文件必须以 `CAFEBABE` 开头**——Java 与咖啡梗由此而来。

### 3.2 用工具查看结构

- **javap**：`javap -v YourClass.class`
- **IDEA ByteCode Viewer 插件**：更直观

![Class 文件整体布局](/性能调优/jvm-01-overview/p006-01.png)

要点速记：

- `u4 magic`：魔数 `CAFEBABE`
- 两个 `u2`：minor / major 版本。JDK 8 编译的 class 常见 major=52；JDK 17 为 61——**低版本 JVM 无法运行高版本 class**（Spring Boot 3 / Spring 6 要求 JDK 17 即此原因）
- **常量池**：最复杂，存类名、方法名等符号；索引从 **1** 开始，0 表示「不引用任何常量池项」
- 方法、字段等多为对常量池的引用

数十年来 Class **结构与字节码语义基本稳定**，扩展多在方法标志、属性表等可扩展结构里完成。

### 3.3 字节码指令

方法体在 Class 里是一串**操作码 + 操作数**。操作码 1 字节（0～255），总数不超过 256 条。

![字节码执行循环](/性能调优/jvm-01-overview/p008-01.png)

逻辑上等价于：

```text
do {
  PC++;
  读取操作码;
  if (有操作数) 读取操作数;
  执行操作;
} while (还有字节码);
```

**LineNumberTable** 把 PC 与源码行号对应——异常堆栈里的行号就靠它。

#### Integer 缓存与 `==`

```java
Integer i1 = 10;
Integer i2 = 10;
System.out.println(i1 == i2); // true

Integer i3 = 128;
Integer i4 = 128;
System.out.println(i3 == i4); // false
```

对应字节码会先 `invokestatic Integer.valueOf` 再 `astore`。`valueOf` 对 **[-128, 127]** 走缓存，同值同地址；128 不在缓存内则各 new，**`==` 比的是引用**。不必背题——看字节码就能自证。

#### 方法调用指令

| 指令 | 用途 |
|------|------|
| `invokevirtual` | 实例方法，虚分派 |
| `invokeinterface` | 接口方法 |
| `invokespecial` | 构造方法、private、父类方法 |
| `invokestatic` | static 方法 |
| `invokedynamic` | 动态分派（Lambda 等，JDK 7+） |

**面试点**：静态方法能被「重写」吗？不能——静态走 `invokestatic`，实例虚方法走 `invokevirtual`，机制不同。

### 3.4 try-catch-finally 与异常表

```java
public int inc() {
    int x;
    try {
        x = 1;
        return x;
    } catch (Exception e) {
        x = 2;
        return x;
    } finally {
        x = 3;
    }
}
```

![try-catch-finally 字节码与异常表](/性能调优/jvm-01-overview/p011-01.png)

**异常表**每行一条分支：当 PC 在 [起始, 结束) 内抛出指定类型（或其子类）异常时，跳转到 handler PC。finally 往往通过复制/额外分支实现，而非仅靠 Java 语法糖。

### 3.5 栈帧：局部变量表与操作数栈

每个方法对应一个**栈帧**，含：

- **局部变量表**（Slot 为单位，非 static 方法 slot 0 为 `this`）
- **操作数栈**（计算中间结果）
- **动态链接**（指向运行时常量池的方法引用）
- **返回地址**

`k = k++` 为何得到 1？`iinc` 在局部变量表自增，但 `=` 右侧先 `iload` 压栈的是旧值 1，再 `istore` 写回——自增被覆盖。

```java
public int mathTest() {
    int k = 1;
    k = k++;  // 结果 1
    return k;
}
```

方法需要的 **max_stack** 与 **max_locals** 写在 Class 里，启动前即可校验资源，不够直接失败。

---

## 四、类加载（概要）

Class 定义好执行逻辑后，需**类加载器**载入内存。JDK 8 要点（详见下一篇）：

1. 每个加载器对加载过的类**缓存**
2. **双亲委派**：向上查，向下加载
3. **沙箱**：禁止应用覆盖 `java.*` 等核心类

**类 vs 对象**：Class 是创建对象的模板，元数据在 **Metaspace**（JDK 8 前 PermGen）；对象是堆上主角，对象头含 **Klass 指针** 指向类元数据。可用 JOL 观察：

```xml
<dependency>
  <groupId>org.openjdk.jol</groupId>
  <artifactId>jol-core</artifactId>
  <version>0.17</version>
</dependency>
```

```java
System.out.println(ClassLayout.parseInstance(o).toPrintable());
```

对象头 Mark Word 记录 hash、**锁状态**（无锁/轻量/重量等）、GC 分代年龄等——后续并发与 GC 都会再遇到。

Metaspace 参数：`-XX:MetaspaceSize`、`-XX:MaxMetaspaceSize`；类卸载效率低，一般不必严控，内存极紧时再设上限。

---

## 五、执行引擎

执行引擎把字节码变为机器码。与 OS 打交道多，应用开发不必钻太深，但几个概念面试常问。

### 5.1 解释执行 vs 编译执行

- **解释执行**：来一条译一条，像同声传译
- **编译执行（JIT）**：热点代码编译成 native，放进 **Code Cache**（元空间相关区域），再执行更快

HotSpot 默认**混合模式**：热点 JIT，冷代码解释。预热阶段可能偏慢。

**AOT**（GraalVM 等）可跳过 JVM 直接出本地可执行文件，Spring Boot 3 有落地，但**跨平台与成熟防护**仍不如久经沙场的 HotSpot；目前远非「一统天下」。

### 5.2 C1、C2 与分层编译

| 编译器 | 特点 |
|--------|------|
| C1（Client） | 优化少、编译快，适合桌面 |
| C2（Server） | 优化多、编译慢，服务端默认 |
| Graal（JDK 10+） | Java 实现，长期目标之一 |

分层编译（Tiered Compilation）0～4 层，在启动速度与峰值性能间平衡。`-XX:TieredStopAtLevel=1` 可干预，**生产一般不要动**。

### 5.3 静态分派 vs 动态分派

编译期能确定调用哪个方法为**静态**；运行期按实际类型选择为**动态**（多态、`invokedynamic`）。

---

## 六、垃圾回收（GC）

### 6.1 内存布局与 Arthas

推荐线上诊断工具 **[Arthas](https://arthas.aliyun.com/)**。简单示例：

```java
public class GCTest {
    public static void main(String[] args) throws InterruptedException {
        List l = new ArrayList<>();
        for (int i = 0; i < 1_000_000; i++) {
            l.add(new String("dddddddddddd"));
            Thread.sleep(100);
        }
    }
}
```

`dashboard` 中 **Memory**：heap（eden、survivor、old）与 non-heap（metaspace、code_cache 等）。栈不在此列出。

![JVM 整体内存布局](/性能调优/jvm-01-overview/p022-01.png)

堆大小：`-Xms`（初始）、`-Xmx`（最大）。**生产建议 `-Xms` 与 `-Xmx` 相同**，避免扩容抖动；顶到 `-Xmx` 仍不够则 OOM。

### 6.2 分代收集

![Parallel Scavenge 分代示意](/性能调优/jvm-01-overview/p023-01.png)

经验：**约 80% 对象朝生夕死**。年轻代（Eden + 两个 Survivor，默认 **8:1:1**）频繁 **Young GC**；长寿对象进**老年代**（默认年轻:老 ≈ **1:2**），**Old GC** 较少。

对象路径：Eden → Survivor 拷贝 → 年龄达阈值（默认 15，`-XX:MaxTenuringThreshold`）→ 老年代。

优化机制：

- **TLAB**：线程私有 Eden 片，减少分配竞争（见第 4 篇）
- **大对象**：可能直接进老年代

JDK 8 默认 **Parallel Scavenge + Parallel Old**（日志里常见 `ps` 前缀）。

### 6.3 常见收集器

JDK 8～21 演进中出现 Serial、ParNew、CMS、Parallel、G1、ZGC、Shenandoah、Epsilon 等。左侧多为**分代**，右侧 **G1 / ZGC** 等弱化分代；JDK 9 起默认 **G1**。细节见第 7～8、12 篇。

---

## 七、GC 参数与日志

### 7.1 三类 JVM 参数

| 类型 | 前缀 | 示例 |
|------|------|------|
| 标准 | `-` | `java -version`；`java -help` |
| 非标准 | `-X` | `-Xms200M -Xmx200M`；`java -X` |
| 不稳定 | `-XX` | 调优主力，随版本变；JDK 8 可用 `-XX:+PrintFlagsFinal` 等 |

### 7.2 打印 GC 日志（JDK 8）

```text
-XX:+PrintGCDetails
-XX:+PrintGCTimeStamps
-XX:PrintHeapAtGC
-Xloggc:./gc.log
```

JDK 9+ 可统一：`-Xlog:gc*`

示例：

```java
public class GcLogTest {
    public static void main(String[] args) {
        ArrayList<byte[]> list = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            byte[] arr = new byte[1024 * 100];
            list.add(arr);
            try { Thread.sleep(10); } catch (InterruptedException e) { e.printStackTrace(); }
        }
    }
}
```

参数示例：`-Xms60m -Xmx60m -XX:SurvivorRatio=8 -XX:+PrintGCDetails`

### 7.3 分析 GC 日志

可把 `-Xloggc` 产出上传到 [GCeasy](https://www.gceasy.io/) 等工具，查看 Minor/Full GC 频率、堆趋势与改进建议——**调优入门**往往从「能读日志、能对比改参前后」开始。

---

## 本章小结

- JVM 规范核心是 **Class 文件**；读懂字节码能解很多「语言陷阱」。
- **类加载**负责把 Class 变成运行时可用的类型；**Metaspace** 存类元数据，**堆**存对象。
- **执行引擎**混合解释与 JIT；别轻易改 Tiered 编译。
- **GC** 以分代为基础；会设堆、会打日志、会看报告，是线上必备技能。

带着疑问往下读——第 2 篇类加载、第 3 篇内存模型、第 4 篇对象分配，会把本篇地图上的每一块填实。
