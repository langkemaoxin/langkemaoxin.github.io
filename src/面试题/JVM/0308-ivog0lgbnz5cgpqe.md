---
title: "字符串常量池是如何实现的"
sidebarGroup: "JVM"
shortTitle: "字符串常量池是如何实现的"
order: 308
date: 2026-05-07
category: "面试题"
tag:
  - "面试题"
description: "要了解字符串常量池在Java中的实现，可以通过代码示例来深刻体会其工作机制。Java中的字符串常量池旨在优化内存使用，通过共享不可变字符串对象来避免重复创建相同的字符串。字符串常量池实现示例public class StringConsta"
article: false
---

> 来源：[字符串常量池是如何实现的](https://www.yuque.com/tulingzhouyu/db22bv/ivog0lgbnz5cgpqe)

要了解字符串常量池在Java中的实现，可以通过代码示例来深刻体会其工作机制。Java中的字符串常量池旨在优化内存使用，通过共享不可变字符串对象来避免重复创建相同的字符串。

### 字符串常量池实现示例

```java
public class StringConstantPoolExample {  
    public static void main(String[] args) {  
        // 字符串字面量  
        String str1 = "Hello";  
        String str2 = "Hello";  

        // 使用 `new` 关键字创建的字符串对象  
        String str3 = new String("Hello");  

        // 使用 intern 方法  
        String str4 = str3.intern();  

        // 比较内存地址  
        System.out.println("str1 == str2: " + (str1 == str2)); // true  
        System.out.println("str1 == str3: " + (str1 == str3)); // false  
        System.out.println("str1 == str4: " + (str1 == str4)); // true  

        // 字符串连接  
        String str5 = "Hel" + "lo"; // 编译期优化，仍在常量池中  
        System.out.println("str1 == str5: " + (str1 == str5)); // true  

        // 非直接字符串连接  
        String part1 = "Hel";  
        String part2 = "lo";  
        String str6 = part1 + part2; // 在运行时创建，不在常量池中  
        System.out.println("str1 == str6: " + (str1 == str6)); // false  
    }  
}
```

### 代码解析

1. **字面量字符串**：

- `String str1 = "Hello";` 和 `String str2 = "Hello";` 会将字符串 "Hello" 存储在字符串常量池中，两者引用同一个字符串对象，因此 `str1 == str2` 为 `true`。

1. `new`** 关键字**：

- `String str3 = new String("Hello");` 在堆上分配一个新的字符串对象，即使值相同，它与常量池中的 `"Hello"` 不同，因此 `str1 == str3` 为 `false`。

1. `intern()`** 方法**：

- 调用 `str3.intern()` 试图将 `"Hello"` 放入常量池中，若已存在，则返回池中的引用。因此，`str4` 引用了常量池中的对象，因此 `str1 == str4` 为 `true`。

1. **编译时字符串连接**：

- `String str5 = "Hel" + "lo";` 会被编译器优化成常量 "Hello"，直接放入常量池，因此 `str1 == str5` 为 `true`。

1. **运行时字符串连接**：

- `String str6 = part1 + part2;` 会在运行时创建一个新的字符串对象，因此 `str1 == str6` 为 `false`，因为它不在字符串常量池中。

### 总结

通过这种机制，Java字符串常量池有效地减少了内存消耗并提高了性能。字面量字符串自动入驻常量池，而 `String.intern()` 方法则提供了一种主动控制字符串驻留池的方式。编译时优化和不可变性也是字符串常量池得以高效运行的关键因素。
