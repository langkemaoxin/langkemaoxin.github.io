---
title: "内存泄漏和内存溢出的区别"
sidebarGroup: "JVM"
shortTitle: "内存泄漏和内存溢出的区别"
order: 300
date: 2026-06-08
category: "面试题"
tag:
  - "面试题"
description: "内存泄漏和内存溢出是两个常见的内存问题，它们的性质和原因不同，但都可能对应用程序的性能和稳定性产生严重影响。内存泄漏（Memory Leak）定义：内存泄漏指的是程序未能释放已不再使用的对象或者资源，从而导致内存的浪费。在Java中，内存泄"
article: false
---

> 来源：[内存泄漏和内存溢出的区别](https://www.yuque.com/tulingzhouyu/db22bv/umi779pu6e7pggq1)

内存泄漏和内存溢出是两个常见的内存问题，它们的性质和原因不同，但都可能对应用程序的性能和稳定性产生严重影响。

### 内存泄漏（Memory Leak）

**定义**：

- 内存泄漏指的是程序未能释放已不再使用的对象或者资源，从而导致内存的浪费。在Java中，内存泄漏通常是由于对象的引用没有被正确清除，使得垃圾回收无法回收这些对象所占用的内存。

**特点**：

- 不会立即导致程序崩溃，但会缓慢地消耗内存，最终可能导致内存不足。
- 在Java应用中，常常由于集合类中保留了不再使用的对象引用而产生。

#### 示例代码（Java）：

```java
import java.util.ArrayList;  
import java.util.List;  

public class MemoryLeakExample {  
    public static void main(String[] args) {  
        List&lt;Object&gt; list = new ArrayList<>();  

        while (true) {  
            Object obj = new Object();  
            list.add(obj); // 不断新增对象到列表中  

            // 其它代码操作  

            // 假设以后不再需要 list 中的对象，但未清理它们引用  
            // list.clear(); // 理想情况下应在不再需要时清除  

            try {  
                Thread.sleep(10); // 延时用于观察内存使用增长  
            } catch (InterruptedException e) {  
                e.printStackTrace();  
            }  
        }  
    }  
}
```

在这个例子中，对象不断被添加到列表中，但列表的内容没有被清理，导致一直占用内存。

### 内存溢出（Out of Memory）

**定义**：

- 内存溢出是指程序在申请内存时，没有足够的内存可用，导致无法正常分配，从而抛出`OutOfMemoryError`。这是由于程序已使用的内存超过了JVM为其分配的最大内存限制。

**特点**：

- 通常会导致程序崩溃或终止。
- 因为未能限制内存使用而直接超过JVM配置的内存上限。

#### 示例代码（Java）：

```java
public class MemoryOverflowExample {  
    public static void main(String[] args) {  
        int[] memoryFillIntVar = new int[Integer.MAX_VALUE]; // 尝试分配过大的数组  
    }  
}
```

在这个例子中，程序试图分配一个巨大的数组，这通常会导致`java.lang.OutOfMemoryError: Requested array size exceeds VM limit`错误。

### 区别总结

- **内存泄漏**是因为不再使用的对象无法被垃圾回收，持续消耗内存，引起资源浪费，但不一定马上导致程序崩溃。
- **内存溢出**是程序试图使用超过可用最大内存的资源，直接导致程序失败。

为避免这些问题，开发者应仔细管理对象的生命周期，适时释放不再需要的资源，并监测和调整应用程序的内存使用情况，确保其在预期范围内。
