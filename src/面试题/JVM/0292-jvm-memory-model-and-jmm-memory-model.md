---
title: "JVM 内存模型与 JMM 内存模型"
sidebarGroup: "JVM"
shortTitle: "JVM 内存模型与 JMM 内存模型"
order: 292
date: 2026-07-30
category: "面试题"
tag:
  - "面试题"
description: "在 Java 开发中，JVM 内存模型和 JMM（Java Memory Model） 是两个容易混淆但完全不同的概念。以下是它们的核心区别和联系：1. JVM 内存模型（运行时数据区）定义：JVM 内存模型描述的是 JVM 物理内存的划分"
article: false
---

> 来源：[JVM 内存模型与 JMM 内存模型](https://www.yuque.com/tulingzhouyu/db22bv/dzstdlvg7yh2q87z)

在 Java 开发中，**JVM 内存模型**和 **JMM（Java Memory Model）** 是两个容易混淆但完全不同的概念。以下是它们的核心区别和联系：

---

### **1. JVM 内存模型（运行时数据区）**

**定义**：JVM 内存模型描述的是 JVM **物理内存的划分**，即程序运行时的内存区域。

![image](/面试题/JVM/0292-jvm-memory-model-and-jmm-memory-model/img-5cc6bc4470d5.jpg)

**核心区域**：

******内存区域**
**作用**
**线程隔离性**
**溢出错误**

**程序计数器**
记录当前线程执行的字节码位置（线程私有）
私有
无溢出

**虚拟机栈**
存储方法调用的栈帧（局部变量、操作数栈等）
私有
`StackOverflowError`

**本地方法栈**
支持 Native 方法（如 C/C++ 代码）
私有
`StackOverflowError`

**堆**
存储对象实例和数组（GC 主战场）
共享
`OutOfMemoryError`

**元空间**
存储类信息、常量、静态变量（JDK8 以前称为方法区，使用本地内存）
共享
`OutOfMemoryError`

**关键点**：

- 堆是对象分配和垃圾回收的主要区域。
- 虚拟机栈的每个栈帧对应一个方法调用（局部变量、操作数栈、动态链接、返回地址）。

---

### **2. JMM（Java 内存模型）**

**定义**：JMM 是 **多线程环境下共享数据访问的规范**，屏蔽了各种硬件和操作系统的访问差异的，解决了线程间的**可见性**、**原子性**和**有序性**问题。

![image](/面试题/JVM/0292-jvm-memory-model-and-jmm-memory-model/img-169913c4d638.png)

**核心机制**：

**机制**
**作用**

**主内存与工作内存**
每个线程有私有工作内存，共享变量存储在主内存中。

**内存交互操作**
`read`/`load`（读取到工作内存）、`use`/`assign`（使用和赋值）、`store`/`write`（写回主内存）。

**happens-before**
定义操作之间的顺序规则（如锁释放先于获取、`volatile`写先于读等）。

**volatile**
保证变量的可见性和禁止指令重排序，但不保证原子性。

**synchronized**
通过锁机制保证原子性、可见性和有序性。

**关键点**：

- **可见性**：一个线程修改共享变量后，其他线程能立即看到最新值。
- **原子性**：一个操作不可被中断（例如 `synchronized` 代码块）。
- **有序性**：禁止指令重排序优化（例如 `volatile` 和 `happens-before` 规则）。

---

### **3. 核心区别**

**维度**
**JVM 内存模型**
**JMM（Java 内存模型）**

**定位**
描述物理内存的划分（运行时数据区）
定义多线程共享数据访问的规则

**关注点**
内存分配、垃圾回收、方法调用栈
线程间共享数据的可见性、原子性、有序性

**线程共享性**
堆和元空间是共享的，栈是私有的
主内存是共享的，工作内存是私有的

**典型问题**
内存溢出（OOM）、栈溢出（SOF）
竞态条件、死锁、内存可见性问题

**解决方案**
调整堆大小（`-Xmx`）、优化代码逻辑
`volatile`、`synchronized`、`Lock` 等

---

### **4. 实际场景示例**

#### **场景 1：JVM 内存溢出（堆）**

```java
// 不断创建大对象导致堆内存溢出
List<byte[]> list = new ArrayList<>();
while (true) {
    list.add(new byte[1024 * 1024]); // 每次分配 1MB
}
```

**解决**：

- 增大堆内存（`-Xmx4G`）。
- 检查代码是否存在内存泄漏。

#### **场景 2：JMM 可见性问题**

```java
public class VisibilityIssue {
    private boolean flag = false; // 未使用 volatile

    public void start() {
        new Thread(() -> {
            while (!flag) {} // 可能永远无法退出循环
            System.out.println("Flag is true");
        }).start();

        new Thread(() -> {
            try { Thread.sleep(1000); } 
            catch (InterruptedException e) {}
            flag = true; // 修改 flag，但其他线程可能看不到
        }).start();
    }
}
```

**解决**：

- 将 `flag` 声明为 `volatile`：`private volatile boolean flag = false;`。

---

### **5. 二者的联系**

- **底层实现依赖**：JMM 的规则（如 `volatile` 和 `synchronized`）需要 JVM 在内存操作层面支持。
- **协同工作**：

- JVM 的堆存储共享对象，JMM 确保多线程正确访问这些对象。
- JVM 的栈存储方法调用，JMM 解决栈中局部变量在多线程环境下的可见性问题（如果变量被共享）。

---

### **6. 总结**

**JVM 内存模型**
**JMM（Java 内存模型）**

物理内存如何划分
逻辑上如何安全访问共享数据

关注内存分配和回收
关注线程间通信和数据同步

解决内存溢出、栈溢出问题
解决竞态条件、内存可见性问题

**一句话总结**：

- **JVM 内存模型**是“内存怎么用”，**JMM**是“多线程怎么安全地用内存”。

### 7. 补充

#### 7.1. JMM 操作指令含义

![image](/面试题/JVM/0292-jvm-memory-model-and-jmm-memory-model/img-489baca872aa.png)

#### 7.2. JVM 三大特性

![image](/面试题/JVM/0292-jvm-memory-model-and-jmm-memory-model/img-48f7c5f6430b.png)
