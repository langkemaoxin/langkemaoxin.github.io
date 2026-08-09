---
title: "String s = new String (\"abc\") 创建了几个对象？存储在哪里？"
sidebarGroup: "综合篇"
shortTitle: "String s = new String (\"abc\") 创建了几个对象？存储在哪里？"
order: 116
date: 2026-07-28
category: "面试题"
tag:
  - "面试题"
description: "这是 Java 面试中非常经典的一个问题，关于 String s = new String(\"abc\") 创建了几个对象以及对象存储位置。这个问题的答案要分 JDK 版本 和 字符串常量池是否已有 \"abc\" 来讨论。1. JDK 6 及之"
article: false
---

> 来源：[String s = new String ("abc") 创建了几个对象？存储在哪里？](https://www.yuque.com/tulingzhouyu/db22bv/ggpo7i5lg5ehvgn9)

这是 Java 面试中非常经典的一个问题，关于 String s = new String("abc") 创建了几个对象以及对象存储位置。这个问题的答案要分 **JDK 版本** 和 **字符串常量池是否已有 "abc"** 来讨论。

## **1. JDK 6 及之前**

- **字符串常量池**位于 **永久代（PermGen）**。
- `new String("abc")` 执行流程：

1. **首次使用字面量 **`"abc"` 时，JVM 在 **永久代的字符串常量池** 创建一个 `String` 对象（内容为 "abc"）。
2. 执行 `new String("abc")` 时，在 **Java 堆** 创建一个新的 `String` 对象。
3. 新对象的 `value` 数组引用常量池对象的 `value` 数组（**共享字符数组**）。

![image](/面试题/综合篇/0116-string-s-new-string-abc-how-many-objects-were-created-where/img-0ca8a5b51ca3.png)

**结论：**

- 如果 `"abc"` 不在常量池：**2 个对象**

- 1 个在永久代的常量池
- 1 个在 Java 堆

- 如果 `"abc"` 已在常量池：**1 个对象**（仅 Java 堆）

## **2. JDK 7 及之后（包括 JDK 8）**

- **字符串常量池**移到 **Java 堆** 中。
- `new String("abc")` 执行流程：

1. **首次使用 **`"abc"` 时，在 **堆中的字符串常量池** 创建一个 `String` 对象。
2. 执行 `new String("abc")` 时，在 **Java 堆的普通对象区** 创建一个新的 `String` 对象。
3. 新对象的 `value` 数组引用常量池对象的 `value` 数组（**仍然共享**）。

![image](/面试题/综合篇/0116-string-s-new-string-abc-how-many-objects-were-created-where/img-4c43f2ed7834.png)

**结论：**

- 如果 `"abc"` 不在常量池：**2 个对象**（都在堆，一个在常量池区域，一个在普通对象区）
- 如果 `"abc"` 已在常量池：**1 个对象**（仅普通对象区）

## **3. JDK 9+ 的变化**

从 **JDK 9** 开始，Java 引入 **Compact Strings（紧凑字符串）** 优化：

- **内部存储变更**：由 `char[]`（每个字符 2 字节）改为 `byte[]`（每个字符 1 字节或 2 字节，Latin-1 字符用 1 字节存储）。
- `new String("abc")`** 行为变化**：新对象不再共享常量池中的字符数组，而是**复制一份内容到新的 byte [] 数组**。

**JDK 9+ 流程：**

1. 首次使用 `"abc"` → 在字符串常量池创建 `String` 对象，内部是 `byte[]`（数组 A）。
2. `new String("abc")` → 在堆普通区创建新 `String` 对象，并**复制**数组 A 内容到新的 `byte[]`（数组 B）。

![image](/面试题/综合篇/0116-string-s-new-string-abc-how-many-objects-were-created-where/img-6cbf19c5b03d.png)

**结论：**

- 如果 `"abc"` 不在常量池：**2 个 String 对象 + 2 个 byte [] 数组**（都在堆）
- 如果 `"abc"` 已在常量池：**1 个 String 对象 + 1 个新的 byte [] 数组**（都在堆普通区）

## **4. 为什么会有这些设计变化？**

- **字符串常量池**：缓存字符串字面量，减少重复对象。
- **JDK 7 常量池移到堆**：

- 减少永久代内存压力
- 方便 GC 回收不再使用的字符串

- **JDK 9 Compact Strings**：

- 节省内存（Latin-1 字符从 2 字节降为 1 字节）
- 避免共享数组带来的潜在安全隐患（如 `substring` 内存泄漏问题）

## **5. intern () 方法扩展**

`intern()` 用来确保字符串在常量池中存在，并返回常量池中的引用。

### **JDK 6**

- 常量池在永久代
- 调用 `intern()` 时，如果字符串不在常量池，会**复制一份字符串到永久代**并返回引用。

### **JDK 7+**

- 常量池在堆中
- 调用 `intern()` 时，如果字符串不在常量池，会**直接在常量池中存储堆对象的引用**，而不会复制字符串内容。

**示例：**

```java
// 1. 在常量池中创建 "abc" 对象
String s1 = "abc";
// 2. 在堆中创建新对象，此时常量池中 "abc" 已存在
String s2 = new String("abc");
// 3. s2.intern() 发现常量池已有 "abc"，返回其引用
String s3 = s2.intern();

System.out.println(s1 == s2); // false (一个在常量池，一个在堆)
System.out.println(s1 == s3); // true (都指向常量池)
```

![image](/面试题/综合篇/0116-string-s-new-string-abc-how-many-objects-were-created-where/img-9bc956abc85e.png)

**JDK 9+ 优化：**

- 结合 Compact Strings，intern () 同样不再复制内容，而是存储引用，节省内存。

![image](/面试题/综合篇/0116-string-s-new-string-abc-how-many-objects-were-created-where/img-8d09e7ec7026.png)

## **6. 总结对比**

## **7. 面试标准答案**

**分情况讨论：**

1. **JDK 6**

- `"abc"` 不在常量池：2 个对象（永久代 1 个，堆 1 个）
- `"abc"` 已在常量池：1 个对象（堆）

1. **JDK 7/8**

- `"abc"` 不在常量池：2 个对象（堆中常量池 1 个，普通对象区 1 个）
- `"abc"` 已在常量池：1 个对象（普通对象区）

1. **JDK 9+**

- `"abc"` 不在常量池：2 个 String 对象 + 2 个 byte [] 数组
- `"abc"` 已在常量池：1 个 String 对象 + 1 个新 byte [] 数组

> 💡 **记忆口诀**：
> 常量池看有无，JDK 分版本；6 在永久代，7+ 到堆来；9 后不共享，复制更安全。
