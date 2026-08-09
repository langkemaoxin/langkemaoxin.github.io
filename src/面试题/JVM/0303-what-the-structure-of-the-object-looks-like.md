---
title: "对象的结构是什么样的"
sidebarGroup: "JVM"
shortTitle: "对象的结构是什么样的"
order: 303
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在Java中对象的结构是在Java对象模型（Java Object Model）的基础上设计和实现的。一个Java对象在JVM中的基本结构包括以下几个组成部分：对象头（Object Header）：Mark Word：用于存储对象自身的运行"
article: false
---

> 来源：[对象的结构是什么样的](https://www.yuque.com/tulingzhouyu/db22bv/yt8wuyycgc97yva1)

在Java中对象的结构是在Java对象模型（Java Object Model）的基础上设计和实现的。一个Java对象在JVM中的基本结构包括以下几个组成部分：

1. **对象头（Object Header）**：

- **Mark Word**：

- 用于存储对象自身的运行时数据，如哈希码（HashCode）、GC分代年龄、锁状态标志、线程持有的锁、偏向线程ID等。
- Mark Word是动态定义的，随着对象状态的变化而改变。

- **Class Pointer（类型指针）**：

- 指向对象的类元数据（Class Metadata），JVM通过它来确定该对象是哪个类的实例，并据此找到该类的方法区。

- **数组长度（仅数组对象）**：

- 如果对象是数组，还需要一个额外的空间来存储数组的长度。

1. **实例数据（Instance Data）**：

- 存储实体类的实例字段内容，包括从父类继承下来的字段和自身定义的字段。
- 数据存储的顺序受字段声明顺序、字段类型、虚拟机分配策略（如内存对齐）影响。

1. **对齐填充（Padding）**：

- JVM要求对象的起始地址是8字节的整数倍（对齐），因此可能在对象结尾填充对齐字节。
- 对齐填充对于64位虚拟机（如HotSpot JVM）是在开启压缩指针（Compressed Oops）时对未对齐的对象添加的。

### 内存布局示例

假设一个简单的Java类：

```java
public class Example {  
    int id;  
    boolean isActive;  
    Object reference;  
}
```

这个对象在Java中的内存布局大概如下：

- **对象头**

- Mark Word
- Class Pointer

- **实例数据**

- int id
- boolean isActive
- Object reference

- **对齐填充**

- 根据需要进行对齐填充

### 64 位 JVM 中的优化

- 在64位JVM中，为了减少内存占用，Java会启用指针压缩（Compressed Oops），从而使用32位的指针来指向堆内存，减少指针的大小。

### 总结

Java对象的结构设计旨在高效地支持内存管理、垃圾回收和对象操作。对象头包含运行时数据和类信息指针，而实际的实例数据则存储对象的成员变量值。对齐填充则保证内存访问的效率。整体设计兼顾了灵活性和高效性，以适应Java的跨平台和多线程需求。
