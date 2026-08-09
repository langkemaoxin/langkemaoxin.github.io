---
title: "OOM问题如何排查"
sidebarGroup: "线上问题排查"
shortTitle: "OOM问题如何排查"
order: 771
date: 2026-03-06
category: "面试题"
tag:
  - "面试题"
description: "当Java应用程序遇到OOM（OutOfMemoryError）错误时，通常意味着程序超出了可用的内存容量。这可能由于内存泄漏或配置不足导致。以下是详细的排查过程和示例，帮助诊断和解决这种问题。排查步骤1. 确认OOM错误类型首先，需要明确"
article: false
---

> 来源：[OOM问题如何排查](https://www.yuque.com/tulingzhouyu/db22bv/bgpy80cw6x7fntek)

当Java应用程序遇到OOM（OutOfMemoryError）错误时，通常意味着程序超出了可用的内存容量。这可能由于内存泄漏或配置不足导致。以下是详细的排查过程和示例，帮助诊断和解决这种问题。

### 排查步骤

#### 1. 确认OOM错误类型

首先，需要明确是哪种OOM：

- **java.lang.OutOfMemoryError: Java heap space**：堆内存不足。
- **java.lang.OutOfMemoryError: Metaspace**：元空间不足（JDK 8及以上）。
- **java.lang.OutOfMemoryError: GC overhead limit exceeded**：GC时间过长。

#### 2. 收集诊断信息

收集以下信息：

- **Error日志**：找到OOM发生时的日志片段。
- **Heap dump**：获取堆转储文件（可以使用-XX:+HeapDumpOnOutOfMemoryError来自动生成）。
- **GC日志**：启用GC日志以分析垃圾回收活动。

**示例JVM参数**：

```java
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/path/to/dump -Xlog:gc*:file=gc.log:time
```

#### 3. 分析Heap Dump

使用工具分析堆转储文件，找出内存泄漏的来源或占用最多空间的对象。

**工具**：Eclipse Memory Analyzer (MAT)

**分析步骤**：

1. **加载Heap Dump**：使用MAT打开生成的堆转储文件。
2. **查找大对象**：使用MAT的“Histogram”视图查看占用内存最大的对象类型。
3. **查找泄漏疑点**：使用“Leak Suspects Report”功能自动分析可能的内存泄漏点。

**示例分析**：
通过MAT发现`java.util.ArrayList`实例占用了大量的内存，并继续深入查看引用路径。

#### 4. 分析和识别问题代码

检查代码中可能导致OOM的地方。

- **大对象集合**：导致内存占用过大的大型集合（如List, Map等）。
- **长生命周期对象**：一些不必要的对象拥有比预期更长的生命周期。

**常见问题场景**：

- **缓存未清理**：使用自定义缓存，没有合适的过期或清理机制。
- **无限增长的数据结构**：例如，把无限的请求数据储存在集合中。

#### 5. 优化代码和配置

**解决方法**：

1. **优化数据结构**：使用合适的数据结构和集合类。
2. **清理长生命周期对象**：确保不再需要的对象能够被GC及时回收。
3. **调整JVM参数**：如果应用确实需要更多内存，适当调整堆大小。

**示例代码修复**：
假设原代码存在问题：

```java
List&lt;String&gt; largeList = new ArrayList<>();  

public void processData(List&lt;String&gt; data) {  
    largeList.addAll(data); // 增长无限制  
}
```

修复后：

```java
private static final int MAX_SIZE = 10000;  

public void processData(List&lt;String&gt; data) {  
    if (largeList.size() + data.size() > MAX_SIZE) {  
        largeList.clear(); // 清理或采取措施避免无限增长  
    }  
    largeList.addAll(data);  
}
```

**配置调优**：
增加堆大小以适应应用的需要（如果合理）。

```java
-Xmx4g -Xms2g
```

#### 6. 验证和监控

- 运行负载测试验证修改后的程序性能和内存使用。
- 持续进行内存使用监控，避免再次出现OOM。

### 示例全面讲解

**场景**：一个Java Web应用程序在高负载测试中抛出`java.lang.OutOfMemoryError: Java heap space`。

**步骤回顾**：

1. **配置JVM参数**以捕捉OOM：

```java
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/path/to/dump -Xlog:gc*:file=gc.log:time
```

1. **收集Heap Dump**在OOM发生时的转储文件。
2. **使用MAT分析**：

- 打开堆转储，查看`Histogram`，发现`Session`对象占用了大量内存。
- 通过`Dominator Tree`分析，发现`Session`没有及时失效。

1. **问题识别**：

- 应用存在一个自定义`Session`管理模块，未能正确地释放过期的Session。
- 永不过期的Session导致内存耗尽。

1. **代码优化**：

- 实现Session超时机制。
- 在每次请求后或固定的时间间隔清理过期的Session。

```java
public void cleanupSessions() {  
    sessions.entrySet().removeIf(entry -> entry.getValue().isExpired());  
}
```

1. **配置调整与测试**：

- 增加堆内存配置（如从`-Xmx512m`增加到`-Xmx1g`）。
- 执行负载测试，验证修复效果。

1. **监控和告警**：

- 配置实时监控内存使用情况的工具。
- 设置内存使用率告警，防止问题重现。

通过系统化地分析和优化内存管理，应用程序在高负载下运行稳定，未再出现内存溢出错误。此例展示了如何排查OOM问题，结合工具和编程实践，有效解决实际中的复杂问题。
