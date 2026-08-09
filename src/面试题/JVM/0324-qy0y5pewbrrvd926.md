---
title: "说下JVM中一次完整的 GC 流程"
sidebarGroup: "JVM"
shortTitle: "说下JVM中一次完整的 GC 流程"
order: 324
date: 2026-04-09
category: "面试题"
tag:
  - "面试题"
description: "Java Virtual Machine (JVM) 中的垃圾回收（GC）机制是自动内存管理的一部分，负责回收不再被引用的对象所占用的内存空间。理解完整的 GC 流程有助于优化 Java 程序的性能。以下是 JVM 中一次完整的 GC 流程"
article: false
---

> 来源：[说下JVM中一次完整的 GC 流程](https://www.yuque.com/tulingzhouyu/db22bv/qy0y5pewbrrvd926)

Java Virtual Machine (JVM) 中的垃圾回收（GC）机制是自动内存管理的一部分，负责回收不再被引用的对象所占用的内存空间。理解完整的 GC 流程有助于优化 Java 程序的性能。以下是 JVM 中一次完整的 GC 流程：

### JVM 中的内存区域

JVM 的内存区域主要分为以下几块：

- **堆（Heap）**：存放对象实例，GC 的主要工作区域。
- **栈（Stack）**：存放方法参数和局部变量，方法执行时创建销毁。
- **方法区（Method Area）**：存放类信息、常量、静态变量等。
- **程序计数器（PC Register）**：线程执行的字节码行号指示器。

### 垃圾回收的区域

垃圾回收主要在堆中进行，堆又分为年轻代（Young Generation）、老年代（Old Generation）和永久代（JDK 8 及以后的 Metaspace 取代了永久代）。

### 垃圾回收的步骤

1. **标记（Marking）**：找到所有活动对象。
2. **清除（Sweeping）**：清理未被标记的对象，从而释放内存。
3. **压缩（Compaction）**：对内存进行整理，使得活跃对象移动到一起，避免碎片化（这一步并不是所有垃圾回收算法的必须步骤，如标记-清除算法就不需要此步骤）。

### 垃圾回收算法

1. **标记-清除**：首先标记存活对象，然后清除未被标记的对象。
2. **标记-复制**：将存活对象复制到新的内存区域，适合于年轻代。
3. **标记-压缩**：标记后，将活跃对象压缩到一起，清除后续无用区。

### 垃圾回收器示例

下面是使用 Java 的 `System.gc()` 进行垃圾回收的一个简单代码示例：

```java
public class GCDemo {  

    public static void main(String[] args) throws InterruptedException {  
        System.out.println("Starting GC Demo...");  

        // Allocate a lot of memory  
        for (int i = 0; i < 1000; i++) {  
            byte[] array = new byte[1024 * 1024]; // 1 MB  
            System.out.println("Allocated 1MB, index: " + i);  
            Thread.sleep(10); // Slow down allocation  
        }  

        System.out.println("Requesting GC...");  
        // Requesting Garbage Collection  
        System.gc(); // Suggests the JVM to perform GC  

        // Waiting for a short while to visualize GC activity  
        Thread.sleep(5000);  

        System.out.println("Finished GC Demo...");  
    }  
}
```

### 分析

- **对象分配**：在 `main` 方法中，大量地分配内存给一个 `byte[]` 数组。
- **触发 GC**：通过 `System.gc()` 请求垃圾回收，这不是强制的，但 JVM 会尽量去执行垃圾回收。
- **垃圾回收过程**：

- JVM 可能会先尝试进行 Minor GC，回收年轻代对象。
- 如果内存不足，可能触发 Major GC 或 Full GC，回收年轻代 + 老年代对象。

- **观察垃圾回收**：建议在 JVM 参数中增加 `-verbose:gc` 或者使用更详细的 GC 日志选项如 `-XX:+PrintGCDetails`，以更好地观察垃圾回收过程：

```java
java -verbose:gc -XX:+PrintGCDetails GCDemo
```

### 总结

- **年轻代和老年代的区别**：年轻代是短生命周期对象的汇聚地，常被 Minor GC；老年代保存生命周期较长的对象，发生 Major 或 Full GC。
- **分代回收算法**：JVM 的分代回收策略最大化性能，年轻代使用复制收集算法，高效清理短命对象；老年代使用标记-整理算法，处理长命对象。
- **优化 GC 性能**：通常通过调整堆大小和代大小，以及选择适合的垃圾收集器（如 G1、CMS、Parallel GC 等）来优化 GC 的性能。
