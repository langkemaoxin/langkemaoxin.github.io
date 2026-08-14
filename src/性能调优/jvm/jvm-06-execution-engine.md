---
title: "深入理解 JVM 执行引擎"
sidebarGroup: "JVM"
shortTitle: "06 执行引擎"
order: 6
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
  - "执行引擎"
  - "JIT"
description: "HotSpot 混合执行、热点探测、C1/C2 分层编译，以及方法内联、逃逸分析与锁消除等后端优化。"
---

> **JVM 系列 · 第 6/12 篇**  
> 上一篇：[《JVM 字节码与 Class 文件结构》](/性能调优/jvm/jvm-05-classfile-bytecode)  
> 下一篇：[《垃圾收集器 ParNew、CMS 与三色标记》](/性能调优/jvm/jvm-07-parnew-cms)

---

## 开头：Class 文件确定「做什么」，执行引擎决定「跑多快」

[上一篇](/性能调优/jvm/jvm-05-classfile-bytecode) 已经弄清 Class 文件里每行 Java 代码对应的字节码指令；本文聚焦 **执行引擎如何把字节码翻译成机器码并持续优化**——这是 Java 长期被 C/C++ 吐槽「慢」、又能在服务端后来居上的核心战场。

---

## 一、前端编译与后端编译

Java 程序的编译分两段：

| 阶段 | 发生位置 | 输入 → 输出 | 与 JVM 关系 |
|------|----------|-------------|-------------|
| **前端编译** | JVM 之外（`javac` 等） | `.java` → `.class` | 只要产出符合规范的 Class 即可被任意 JVM 加载 |
| **后端编译** | JVM 内部（执行引擎） | 字节码 → 本地机器码 | HotSpot 在此做解释、JIT、分层编译与各类优化 |

前端编译与具体 JVM 实现关系不大；**性能调优更关注后端**：解释执行 vs 编译执行、热点识别、Code Cache 与 C1/C2 协作。

![前端编译与后端编译](/性能调优/jvm-06-execution-engine/p002-01.png)

---

## 二、字节码如何执行：解释 vs 编译

Class 文件已保留每行 Java 代码对应的字节码；执行引擎的任务就是 **把字节码翻译成操作系统机器码**。

### 2.1 解释执行

来一个指令翻译一次——早期 JVM 的做法。上层语言 → 字节码 → 机器码多一层转换，纯解释模式下吞吐通常不如直接编译到本地码的 C/C++。

### 2.2 编译执行与 Code Cache

基本思路：维护 **Code Cache**，把字节码 **提前编译** 成机器码，执行时直接查缓存。但无法预知全部代码路径，于是退而求其次——只编译 **运行频率最高的热点代码**，由 **JIT（Just In Time Compiler）** 完成。

### 2.3 混合执行（HotSpot 默认）

`java -version` 可看到当前执行模式。HotSpot **默认混合执行**，而非纯解释或纯编译：

| 模式 | 参数 | 说明 |
|------|------|------|
| 纯解释 | `-Xint` | 仅解释器 |
| 纯编译 | `-Xcomp` | 启动时即编译（预热成本高） |
| 混合 | 默认 | 解释 + JIT，平衡启动与峰值 |

![混合执行模式](/性能调优/jvm-06-execution-engine/p003-01.png)

**为何不默认全编译？**

1. **内存**：编译结果占 Code Cache，嵌入式/客户端更宜解释以省内存。
2. **预热**：识别热点、填充 Code Cache 前，编译模式额外开销更大；识别过程还需解释器提供运行时信息。
3. **取舍**：在启动响应与长期吞吐之间，混合模式往往更均衡。

---

## 三、热点代码识别

JIT 的前提是 **热点探测（Hot Spot Code Detection）**。HotSpot 采用 **基于计数器** 的方案，为每个方法准备两类计数器：

### 3.1 方法调用计数器（Invocation Counter）

统计方法被调用次数。超过阈值则视为热点，向 JIT 提交编译请求。

- 默认阈值：**10000**（`-XX:CompileThreshold`）
- 执行流程：若已有编译版本则直接用本地码；否则计数 +1，当 **方法调用计数 + 回边计数 ≥ 阈值** 时触发编译

![方法调用计数器流程](/性能调优/jvm-06-execution-engine/p004-01.png)

可用 `java -XX:+PrintFlagsInitial -version` 查询默认阈值。

### 3.2 回边计数器（Back Edge Counter）

统计方法内 **循环体** 执行次数。字节码中 **向后跳转** 的指令称为「回边（Back Edge）」。

- 服务端模式默认阈值约 **10700**
- 公式：`回边阈值 = CompileThreshold × (OnStackReplacePercentage - InterpreterProfilePercentage) / 100`
- 默认：`10000 × (140 - 33) = 107000`？原文为 10700，按 `(140-33)=107` 即 `10000×107/100` 量级理解即可

遇到回边时：有编译版本则优先执行；否则回边计数 +1，总和超阈值则提交编译并 **略降计数**，继续在解释器中跑循环等待编译结果。

![回边计数器流程](/性能调优/jvm-06-execution-engine/p006-01.png)

---

## 四、C1 与 C2：客户端与服务端编译器

HotSpot 内置两个 JIT：**C1（Client）** 与 **C2（Server / Opto）**。二者 **协作而非互替**。

| 编译层次 | 描述 | 性能 |
|----------|------|------|
| 0 | 纯解释，无 Profiling | — |
| 1 | C1，简单稳定优化，无 Profiling | 启动快、占内存小 |
| 2 | C1 + 有限 Profiling（调用/回边统计） | — |
| 3 | C1 + 全量 Profiling（分支、虚调用等） | 为 C2 收集数据 |
| 4 | C2，激进优化 + 基于监控的优化 | 峰值性能高 |

- **C1**：快速编译、占用小，适合桌面/小应用。
- **C2**：耗时更长、优化更激进，适合资源充足的服务端。

JDK 8 可用 `-XX:TieredStopAtLevel=1` 指定最高编译层次（1 即停在 C1）。

![分层编译与 C1/C2 协作](/性能调优/jvm-06-execution-engine/p008-01.png)

**实践对比**：对下面循环调用 `add` 的小案例，分别试 `-Xint`、`-Xcomp`、`-XX:TieredStopAtLevel=1`、`-XX:TieredStopAtLevel=5`，可直观感受启动与耗时差异。

```java
public class JitDemo {
    private int add(int x) { return x + 1; }
    public static void main(String[] args) {
        int a = 0;
        JitDemo demo = new JitDemo();
        long l = System.currentTimeMillis();
        for (int i = 0; i < 10_000_000; i++) {
            a = demo.add(a);
        }
        System.out.println("a= " + a);
        System.out.println(">>>>>>>>" + (System.currentTimeMillis() - l));
    }
}
```

C2 效果虽好，也不能一上来就用——往往需 C1 先收集数据，且特定场景 C2 可能不如 C1，需重新编译。

---

## 五、后端编译优化技术

JIT 在把字节码变成本地码时会做大量优化；细节多在汇编层，但机制本身不难理解。OpenJDK 有 [Performance Tactic Index](https://wiki.openjdk.java.net/display/HotSpot/PerformanceTacticIndex) 可查完整列表。下文介绍三个常见且易验证的优化。

### 5.1 方法内联（Inline）

把 **目标方法体复制到调用方**，避免真实调用与频繁建栈帧。

```java
public class CompDemo {
    private int add1(int x1, int x2, int x3, int x4) {
        return add2(x1, x2) + add2(x3, x4);
    }
    private int add2(int x1, int x2) { return x1 + x2; }
    // 内联优化后等价于：return x1+x2+x3+x4;
}
```

**前提**：循环足够多，方法成为热点（默认调用计数 10000 量级）。

诊断参数：

```text
-XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining
```

**相关 tunable**：

| 参数 | 含义 | 默认 |
|------|------|------|
| `-XX:+Inline` | 启用内联 | 开 |
| `-XX:InlineSmallCode` | 超过此大小的方法不参与内联 | 1000 bytes |
| `-XX:MaxInlineSize` | 内联方法最大字节数 | 35 bytes |
| `-XX:FreqInlineSize` | 热点方法内联上限 | 325 bytes |
| `-XX:MaxTrivialSize` | 琐碎方法（如 `return 42`）上限 | 6 bytes |

**提高内联概率**：多写小方法；内存允许时调低热点阈值或提高方法体阈值；多用 `final` / `private` / `static`，减少 `invokevirtual` 在编译期无法确定目标的情况。

内联常是 **死代码消除** 的基础——例如 `testInline` 内联 `foo` 后，`obj` 恒为 `null`，`if (obj != null)` 整块可被抹除。

### 5.2 逃逸分析（Escape Analysis）

对象在方法内创建后：

- **不逃逸**：仅本方法使用
- **方法逃逸**：作为参数传到其他方法
- **线程逃逸**：赋给可被其他线程访问的字段

JDK 8 **默认开启**（`-XX:-DoEscapeAnalysis` 可关）。

证明对象 **不逃逸出方法/线程** 后，JIT 可进一步：

| 优化 | 说明 |
|------|------|
| **标量替换** | 把对象拆成标量字段，可能 **不分配对象**；要求不能逃逸出方法；`-XX:-EliminateAllocations` 可关 |
| **栈上分配** | 对象在栈上分配，随栈帧销毁，减轻 GC；支持方法逃逸，不支持线程逃逸 |

![逃逸分析、标量替换与栈上分配关系](/性能调优/jvm-06-execution-engine/p012-01.png)

**关系**：逃逸分析是基础；线程逃逸时无法把堆对象挪到某一栈；栈空间小，需标量替换「瘦身」后才能栈上分配。

验证示例：

```java
public class EscapeAnalysisTest {
    static void allocate() {
        MyObject myObject = new MyObject(2024, 2024.6);
    }
    static class MyObject {
        int a; double b;
        MyObject(int a, double b) { this.a = a; this.b = b; }
    }
    public static void main(String[] args) throws InterruptedException {
        long start = System.currentTimeMillis();
        for (int i = 0; i < 10_000_000; i++) allocate();
        System.out.println("运行耗时：" + (System.currentTimeMillis() - start));
        Thread.sleep(6_000_000);
    }
}
```

典型现象：默认约 **2ms**；关闭逃逸分析或标量替换后可达 **40ms+** 量级。

### 5.3 锁消除（Lock Elision）

经逃逸分析，若 **synchronized 不存在多线程竞争**（例如仅在单线程 `main` 中使用的 `StringBuffer`），JIT 可在编译期 **消除无用锁**。

```java
public class LockElisionDemo {
    public static String bufferString(String s1, String s2) {
        StringBuffer sb = new StringBuffer(); // append/toString 带 synchronized
        sb.append(s1); sb.append(s2);
        return sb.toString();
    }
    public static String builderString(String s1, String s2) {
        StringBuilder sb = new StringBuilder();
        sb.append(s1); sb.append(s2);
        return sb.toString();
    }
}
```

JIT 后两者耗时接近；`-XX:-EliminateLocks` 关闭锁消除后，`StringBuffer` 路径会明显变慢。

---

## 六、小结

| 主题 | 要点 |
|------|------|
| 执行模式 | 默认混合执行；`-Xint` / `-Xcomp` / 分层编译 |
| 热点 | 方法调用计数 + 回边计数，阈值可调 |
| C1 / C2 | 分层编译，Profiling 喂给 C2 |
| 内联 | 小方法、private/final/static 更易内联 |
| 逃逸分析 | 标量替换、栈上分配、锁消除的基础 |

执行引擎与 [Class 字节码](/性能调优/jvm/jvm-05-classfile-bytecode)、[内存与 GC](/性能调优/jvm/jvm-07-parnew-cms) 共同决定线上延迟与吞吐；调优时结合 `-XX:+PrintCompilation`、`-XX:+PrintInlining` 与 JFR/async-profiler 观察热点与编译行为。
