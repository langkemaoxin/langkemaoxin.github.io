---
title: "对象的大小如何计算"
sidebarGroup: "JVM"
shortTitle: "对象的大小如何计算"
order: 315
date: 2026-04-15
category: "面试题"
tag:
  - "面试题"
description: "在Java中，对象的大小通常是由对象头，对象的实例数据、和对齐填充组成的。对象的大小计算方法可以简化为以下几个步骤：对象头(Object Header)大小：在32位JVM上：8字节在64位JVM上：未开启指针压缩：16字节开启指针压缩：1"
article: false
---

> 来源：[对象的大小如何计算](https://www.yuque.com/tulingzhouyu/db22bv/mrn3lhegmd3glv8m)

在Java中，对象的大小通常是由对象头，对象的实例数据、和对齐填充组成的。对象的大小计算方法可以简化为以下几个步骤：

1. 对象头(Object Header)大小：

- 在32位JVM上：8字节
- 在64位JVM上：

- 未开启指针压缩：16字节
- 开启指针压缩：12字节

1. 实例数据(Instance Data)大小：

- 基本数据类型：

- boolean/byte: 1字节
- char/short: 2字节
- int/float: 4字节
- long/double: 8字节

- 引用类型：

- 32位JVM：4字节
- 64位JVM未压缩：8字节
- 64位JVM开启指针压缩：4字节

1. 对齐填充(Padding)：

- 对象大小必须是8字节的整数倍
- 如果对象头+实例数据的大小不是8的倍数，需要进行填充

计算示例：

```java
class Example {  
    private int a;    // 4字节  
    private long b;   // 8字节  
    private byte c;   // 1字节  
}
```

在64位JVM，开启指针压缩的情况下：

- 对象头：12字节
- 实例数据：4 + 8 + 1 = 13字节
- 填充：3字节(补齐到8的倍数)
- 总大小：12 + 13 + 3 = 28字节

注意事项：

1. 可以使用Java Agent或JOL(Java Object Layout)工具精确查看对象大小
2. 不同JVM版本和实现可能会有差异
3. JVM参数配置会影响对象大小
4. 继承关系中要包含父类的实例数据大小

如果需要优化对象大小，可以：

1. 合理排序字段顺序，减少对齐浪费
2. 使用基本数据类型替代包装类
3. 考虑使用压缩指针
4. 合理使用继承层次
