---
title: "强引用、软引用、弱引用、虚引用的区别"
sidebarGroup: "JVM"
shortTitle: "强引用、软引用、弱引用、虚引用的区别"
order: 319
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在 Java 中，对象的引用类型分为强引用、软引用、弱引用和虚引用，这些引用类型主要用于测定垃圾回收（GC）何时可以收集对象。这些引用与 GC 的关联以及对象的生命周期有不同的性质和用法。1. 强引用（Strong Reference）特性"
article: false
---

> 来源：[强引用、软引用、弱引用、虚引用的区别](https://www.yuque.com/tulingzhouyu/db22bv/rdtkqt8fwkx2umg6)

在 Java 中，对象的引用类型分为强引用、软引用、弱引用和虚引用，这些引用类型主要用于测定垃圾回收（GC）何时可以收集对象。这些引用与 GC 的关联以及对象的生命周期有不同的性质和用法。

### 1. 强引用（Strong Reference）

**特性**：默认使用的引用类型。只要强引用存在，垃圾收集器绝对不会回收被引用的对象。

**用法**：普通的对象引用就是强引用。例如：

```java
Object strongReference = new Object();
```

**示例**：只要 `strongReference` 还在使用中，对象就不会被回收。

### 2. 软引用（Soft Reference）

**特性**：软引用对象在内存不够用时才会被垃圾回收。如果 JVM 内存充足，软引用对象可能延续存在，这使得软引用适合于实现一些缓存机制。

**用法**：通过 `SoftReference` 类来定义软引用。

```java
import java.lang.ref.SoftReference;  

Object strongRef = new Object();  
SoftReference&lt;Object&gt; softRef = new SoftReference<>(strongRef);  
strongRef = null; // 志愿性删除创建的强引用
```

**示例**：如果对象只通过软引用可达，JVM 会在内存不足的情况下回收它。

### 3. 弱引用（Weak Reference）

**特性**：弱引用对象只要被垃圾收集器检测到即可回收。弱引用对象非常适合于实现 Map 的缓存，当对象只通过弱引用可达时，可以快速释放内存。

**用法**：通过 `WeakReference` 类来定义弱引用。

```java
import java.lang.ref.WeakReference;  

Object strongRef = new Object();  
WeakReference&lt;Object&gt; weakRef = new WeakReference<>(strongRef);  
strongRef = null; // 删除强引用
```

**示例**：弱引用主要用于 WeakHashMap，它允许在不需要强保留对象的情况下维护对象到键的映射。

### 4. 虚引用（Phantom Reference）

**特性**：虚引用并不决定对象的生命周期。当对象只持有虚引用时，垃圾收集时总是会回收。虚引用主要用于对象被垃圾收集器回收时的一些清理工作。

**用法**：通过 `PhantomReference` 类实现，必须和引用队列（`ReferenceQueue`）一起使用。

```java
import java.lang.ref.PhantomReference;  
import java.lang.ref.ReferenceQueue;  

Object obj = new Object();  
ReferenceQueue&lt;Object&gt; queue = new ReferenceQueue<>();  
PhantomReference&lt;Object&gt; phantomRef = new PhantomReference<>(obj, queue);  
obj = null; // 删除强引用
```

**示例**：虚引用常用于跟踪对象何时被从内存中删除，通常用于实现堆外内存回收，通知应用程序对象即将垃圾回收，允许执行回收前的必要清理步骤。

### 总结

- **强引用**：最常见的引用类型，所引用对象不会被垃圾回收。（除非置为`null`）
- **软引用**：当内存不足时会被回收。（适合缓存）
- **弱引用**：适合实现不需要确保其引用对象强可达的缓存，GC 检测到即可回收。（如`WeakHashMap`）
- **虚引用**：不支持访问引用对象，用于监测对象被回收前的清除。（需配合ReferenceQueue）

这些引用类型根据对象的生命周期管理和内存回收需求被巧妙设计，适用于不同情境的资源管理策略。
