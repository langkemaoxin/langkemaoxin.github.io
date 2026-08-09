---
title: "频繁FullGC问题如何排查"
sidebarGroup: "线上问题排查"
shortTitle: "频繁FullGC问题如何排查"
order: 770
date: 2026-06-03
category: "面试题"
tag:
  - "面试题"
description: "频繁的Full GC（完全垃圾收集）通常表明应用程序在内存管理方面存在问题，可能导致性能下降。以下是排查步骤和一个详细的示例：排查步骤收集GC日志分析GC日志监控JVM内存使用情况分析堆内存"
article: false
---

> 来源：[频繁FullGC问题如何排查](https://www.yuque.com/tulingzhouyu/db22bv/itakbe1872na814s)

频繁的Full GC（完全垃圾收集）通常表明应用程序在内存管理方面存在问题，可能导致性能下降。以下是排查步骤和一个详细的示例：

### 排查步骤

1. **收集GC日志**
2. **分析GC日志**
3. **监控JVM内存使用情况**
4. **分析堆内存**
5. **检查代码中的内存使用**
6. **调整JVM参数**
7. **优化代码**
8. **验证改进**

### 详细示例

假设我们有一个大型电子商务网站，最近用户反馈系统响应变慢。运维团队发现服务器频繁出现Full GC，严重影响性能。

#### 1. 收集GC日志

首先，我们需要开启详细的GC日志。在JVM参数中添加：

```java
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:/path/to/gc.log
```

#### 2. 分析GC日志

使用工具（如GCViewer）分析GC日志，我们发现：

- Full GC频率：每10分钟一次
- 每次Full GC耗时：平均3秒
- Old Gen使用情况：每次GC后仍然保持在80%以上

GC日志片段示例：

```java
2023-05-15T14:30:45.123+0800: [Full GC (Ergonomics) [PSYoungGen: 20M->0M(60M)] [ParOldGen: 180M->175M(200M)] 200M->175M(260M), [Metaspace: 30M->30M(1024M)], 3.2345678 secs] [Times: user=10.23 sys=0.25, real=3.23 secs]
```

#### 3. 监控JVM内存使用情况

使用工具如VisualVM或JConsole实时监控JVM内存使用。我们观察到：

- Eden区：频繁被填满后触发Minor GC
- Survivor区：经常接近满载
- Old Gen：持续增长，即使在Full GC后也难以下降

#### 4. 分析堆内存

使用jmap生成堆转储文件：

```java
jmap -dump:format=b,file=heap_dump.hprof &lt;pid&gt;
```

使用MAT（Memory Analyzer Tool）分析堆转储，发现：

- 大量的`com.example.Order`对象占用了Old Gen的大部分空间
- 这些`Order`对象中包含了大量历史订单数据

#### 5. 检查代码中的内存使用

审查相关代码，发现问题：

```java
public class OrderService {  
    private static final List&lt;Order&gt; allOrders = new ArrayList<>();  

    public void processOrder(Order order) {  
        // 处理订单  
        allOrders.add(order);  // 问题所在：持续添加订单到静态列表  
    }  

    // 其他方法...  
}
```

#### 6. 调整JVM参数

临时调整JVM参数以缓解问题：

```java
-Xms4g -Xmx4g -XX:NewRatio=2 -XX:SurvivorRatio=8
```

#### 7. 优化代码

修改代码以解决根本问题：

```java
public class OrderService {  
    private static final int MAX_ORDERS = 10000;  
    private static final Queue&lt;Order&gt; recentOrders = new LinkedList<>();  

    public void processOrder(Order order) {  
        // 处理订单  
        recentOrders.offer(order);  
        if (recentOrders.size() > MAX_ORDERS) {  
            recentOrders.poll();  // 移除最旧的订单  
        }  
    }  

    // 其他方法...  
}
```

同时，实现一个定时任务将处理过的订单数据持久化到数据库，并从内存中清除。

#### 8. 验证改进

- 重新部署优化后的应用
- 监控GC活动和内存使用
- 进行负载测试

结果：

- Full GC频率降低到每小时1-2次
- 每次Full GC耗时减少到1秒以内
- Old Gen使用率稳定在60%左右

### 总结

通过这个详细的排查过程，我们：

1. 使用GC日志和监控工具识别了问题
2. 通过堆内存分析找到了内存泄漏的根源
3. 优化了代码中的内存使用模式
4. 调整了JVM参数以更好地适应应用特性
5. 验证了优化效果

这个例子展示了如何系统地排查和解决频繁Full GC问题，涵盖了从问题发现、原因分析到解决方案实施的完整过程。在实际工作中，具体的问题可能更加复杂，但这个方法论可以作为一个基础框架来处理各种GC相关的性能问题。
