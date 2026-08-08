---
title: "JVM 内存模型深度剖析与优化"
sidebarGroup: "JVM"
shortTitle: "03 内存模型"
order: 3
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
description: "JDK 体系、运行时数据区、常用 -X/-XX 参数与栈溢出实战，并附 Visual GC 与字节码指令速查。"
---

> **JVM 系列 · 第 3/12 篇**  
> 上一篇：[《Java 类加载机制》](/性能调优/jvm/jvm-02-classloader) · 下一篇：[《JVM 对象创建与内存分配机制》](/性能调优/jvm/jvm-04-object-allocation)

---

## 开头：调参之前，先看清「地图」

线上 `-Xmx` 设多少、Metaspace 要不要管、线程栈 `-Xss` 与 OOM 啥关系——都建立在**运行时数据区**模型上。本篇从 JDK 体系与跨平台讲起，梳理 JVM 内存布局、关键参数与栈溢出实验，并附 **Visual GC** 安装与**字节码指令速查**（查阅用，不必背诵）。

---

## 一、JDK 体系与跨平台

### 1.1 JDK、JRE、JVM

![JDK 体系结构](/性能调优/jvm-03-memory-model/p001-01.png)

| 组件 | 职责 |
|------|------|
| **JVM** | 加载 class、执行字节码、内存管理与 GC |
| **JRE** | JVM + 核心类库，运行 Java 程序 |
| **JDK** | JRE + 编译/调试等开发工具（`javac`、`javadoc` 等） |

开发装 **JDK**；纯运行环境只需 **JRE**（现代 Oracle/OpenJDK 发行版多合一）。

### 1.2 一次编译，到处运行

![Java 跨平台原理](/性能调优/jvm-03-memory-model/p001-02.png)

`.java` → `javac` → **与平台无关的字节码** → 各平台 **HotSpot** 等 JVM 解释/JIT 为本地码。差异由 JVM 吸收，而非重新编译源码。

### 1.3 运行时数据区（内存模型）

HotSpot 把 JVM 管理的内存划分为（逻辑上）：

| 区域 | 线程 | 说明 |
|------|------|------|
| **程序计数器** | 私有 | 当前线程字节码行号 |
| **虚拟机栈** | 私有 | 栈帧：局部变量表、操作数栈、动态链接、返回地址 |
| **本地方法栈** | 私有 | Native 方法 |
| **堆** | 共享 | 对象实例、数组；**GC 主战场** |
| **Metaspace** | 共享 | 类元数据（JDK 8+，取代 PermGen） |
| **直接内存** | — | NIO DirectBuffer 等，不占堆但仍受 `-XX:MaxDirectMemorySize` 约束 |

**Code Cache**：JIT 编译后的本地代码，属 non-heap，Arthas `dashboard` 里可见。

与第 1 篇呼应：对象在**堆**；类模板在 **Metaspace**；方法执行在**栈**。

---

## 二、JVM 内存参数设置

### 2.1 典型 Spring Boot 启动行

Tomcat 可写在 `catalina.sh`；Spring Boot 常见：

```bash
java -Xms2048M -Xmx2048M -Xmn1024M -Xss512K \
  -XX:MetaspaceSize=256M -XX:MaxMetaspaceSize=256M \
  -jar microservice-eureka-server.jar
```

| 参数 | 含义 |
|------|------|
| `-Xms` / `-Xmx` | 堆初始 / 最大；**生产建议相等** |
| `-Xmn` | 年轻代大小（或用 `-XX:NewRatio` 间接控制） |
| `-Xss` | 每个线程栈大小 |
| `-XX:MetaspaceSize` | 触发 Metaspace **FGC** 的初始阈值（非「初始容量」） |
| `-XX:MaxMetaspaceSize` | Metaspace 上限，默认 -1 表示仅受本地内存限制 |

**Metaspace 注意点**：

- 调整 Metaspace 触发 **Full GC** 代价高；启动期大量 FGC 常因 Metaspace 阈值不断被抬高。
- 建议 **`MetaspaceSize` 与 `MaxMetaspaceSize` 设成相同且略大**（8G 物理机常见 **256M**），减少运行期扩缩带来的 FGC。
- 与 JDK 7 的 `-XX:PermSize`（永久代**初始**容量）语义不同，勿混用。

### 2.2 StackOverflowError 与 `-Xss`

```java
// JVM: -Xss128k（默认约 1M）
public class StackOverflowTest {
    static int count = 0;

    static void redo() {
        count++;
        redo();
    }

    public static void main(String[] args) {
        try {
            redo();
        } catch (Throwable t) {
            t.printStackTrace();
            System.out.println(count);
        }
    }
}
```

![栈溢出与 -Xss 关系示意](/性能调优/jvm-03-memory-model/p002-02.png)

**结论**：`-Xss` **越小**，单线程栈帧越少、`count` 越小就溢出；但对整个 JVM，栈占内存少，**可创建的线程数反而更多**。Deep 递归服务要在「单栈深度」与「线程数」间权衡。

### 2.3 参数有没有「标准答案」？

没有。需结合 **QPS、对象生命周期、峰值内存、Full GC 频率** 压测与监控（Arthas、Visual GC、GC 日志）迭代。

#### 案例：日均百万级订单系统（思路）

![高并发订单系统 JVM 参数思路](/性能调优/jvm-03-memory-model/p002-01.png)

典型取向（需以压测为准）：

1. **堆充足且 `-Xms=-Xmx`**，避免扩容；老年代不宜过小，防止晋升失败引发 FGC。
2. **年轻代足够大**，让短生命周期订单对象在 **Young GC** 内回收，减少进老年代。
3. **`-XX:MaxTenuringThreshold`**、Survivor 比例与 **TLAB** 配合，控制晋升（第 4 篇详述）。
4. **Metaspace 固定 256M 左右**，避免启动期 Metaspace FGC。
5. **线程池大小**与 `-Xss` 一起估算：线程数 × 栈 + 堆 + Metaspace + Direct ≤ 物理内存留余量。

**优化总原则**（与课件一致）：

> 尽量在**新生代**完成分配与回收；避免大量对象**过早进老年代**导致频繁 **Old GC / Full GC**；同时给足堆空间，避免新生代因空间不足而 **Young GC 过于频繁**。

---

## 三、Visual GC 插件（jvisualvm）

JDK 自带 **jvisualvm**；旧版插件源 `java.net` 已关闭，需改用新地址。

1. 打开 [https://visualvm.github.io](https://visualvm.github.io/index.html) → **Plugins**，复制对应 JDK 版本的 update center URL。
2. jvisualvm：**工具 → 插件 → 设置**，填入 URL，刷新后安装 **Visual GC**。
3. 重启 jvisualvm，连接进程即可见实时堆分代曲线。

![Visual GC 界面概览](/性能调优/jvm-03-memory-model__jvisualvm安装Visual GC插件/p003-01.png)

界面三块：

| 区域 | 内容 |
|------|------|
| **Spaces** | Perm/Metaspace、Old、Eden、S0、S1 占用 |
| **Graphs** | 编译耗时、类加载、各代 GC 次数与耗时 |
| **Histogram** | 晋升阈值 Tenuring Threshold、Survivor 目标比例等 |

常用 VM Args 示例（JDK 8 时代截图仍写 Perm，请对应改为 Metaspace）：

```bash
-Xms512m -Xmx512m -Xmn100m -XX:SurvivorRatio=8
-XX:+HeapDumpOnOutOfMemoryError
```

**Tenuring Threshold**：动态算出的「进入老年代最小年龄」，与 `-XX:MaxTenuringThreshold`（上限）配合；Survivor 中同年龄对象总和超过 Survivor 的 50%（`-XX:TargetSurvivorRatio`）时，≥ 该年龄的对象可提前晋升。

---

## 附录 A：字节码指令速查（节选）

完整列表见 [JVMS §6](https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-6.html)。以下为调试时常查类别。

### 栈与局部变量

| 类别 | 代表指令 |
|------|----------|
| 常量入栈 | `iconst_*`, `lconst_*`, `bipush`, `sipush`, `ldc` |
| 局部变量 → 栈 | `iload`, `aload`, `iload_0`… |
| 栈 → 局部变量 | `istore`, `astore`, `istore_1`… |
| 数组 | `iaload`, `aastore`, `arraylength` |

### 运算与类型转换

`iadd/isub/imul`, `ladd`, `iinc`；`i2l`, `i2f`, `l2i`, `f2d` 等。

### 对象与字段

`new`, `instanceof`, `checkcast`, `getfield`, `putfield`, `getstatic`, `putstatic`。

### 控制流

条件分支：`ifeq`, `if_icmplt`, `if_acmpeq`, `ifnull`…  
比较：`lcmp`, `fcmpg`, `dcmpl`  
跳转：`goto`, `tableswitch`, `lookupswitch`  
异常：`athrow`（`try/finally` 在旧版可见 `jsr`/`ret`，JDK 7+ 多改为表结构）

### 方法调用与返回

| 调用 | 返回 |
|------|------|
| `invokevirtual`, `invokespecial`, `invokestatic`, `invokeinterface`, `invokedynamic` | `ireturn`, `lreturn`, `areturn`, `return` |

### 同步

`monitorenter`, `monitorexit`（对应 `synchronized`）。

### 助记分组（背调试用）

```text
加载: iload/aload/ldc…  存储: istore/astore…
算术: iadd/isub/imul/idiv  转换: i2l/l2i…
对象: new/getfield/putfield  调用: invokevirtual/invokestatic…
返回: ireturn/return  同步: monitorenter/monitorexit
```

第 1、5 篇会结合具体 Class 再解读指令；此处作**手册索引**即可。

---

## 本章小结

- 先建立 **JDK / 跨平台 / 数据区** 三层认知，再动 `-X`、`-XX`。
- **堆**管对象，**Metaspace** 管类，**栈**管方法；Direct 内存别忘算进总账。
- **MetaspaceSize=MaxMetaspaceSize** 是减少启动 FGC 的实用技巧。
- **Visual GC** 适合直观看各代分配与 GC 脉冲；深度分析仍靠 GC 日志与 heap dump。

下一篇聚焦 **对象怎么创建、在 Eden/栈上/老年代如何分配**——把内存模型落到每一行 `new` 上。
