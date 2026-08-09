---
title: "说下CAS的实现与原理"
sidebarGroup: "并发编程"
shortTitle: "说下CAS的实现与原理"
order: 251
date: 2026-07-13
category: "面试题"
tag:
  - "面试题"
description: "CAS（Compare-And-Swap）是一种用于多线程编程中的原子操作，它通过硬件支持的指令来实现无锁同步。在多线程环境下，CAS操作通过比较和交换来更新变量的值，是一种乐观锁的实现方式，可以避免锁机制带来的开销。CAS工作原理CAS操"
article: false
---

> 来源：[说下CAS的实现与原理](https://www.yuque.com/tulingzhouyu/db22bv/rf6z3cwdvsus3wk3)

CAS（Compare-And-Swap）是一种用于多线程编程中的原子操作，它通过硬件支持的指令来实现无锁同步。在多线程环境下，CAS操作通过比较和交换来更新变量的值，是一种乐观锁的实现方式，可以避免锁机制带来的开销。

### CAS工作原理

CAS操作涉及三个操作数：

1. **内存位置V**：需要修改的变量的内存地址。
2. **预期值A**：期望变量当前持有的值。
3. **新值B**：需要更新到变量的新值。

CAS工作过程如下：

- 比较内存位置V的当前值是否等于预期值A。
- 如果是，则用新值B更新内存位置中的值。
- 如果不是，则不更新值，并返回当前实际值。

这个操作是原子的，硬件保证比较并更新的操作不会被中断。

### CAS在Java中的实现

在Java中，CAS操作主要通过`java.util.concurrent.atomic`包中的类来实现。例如，`AtomicInteger`、`AtomicBoolean`、`AtomicReference`等。通过这些类的操作，Java应用可以在多线程环境下安全地对基本数据类型进行操作，而无需显式锁定。

#### 示例：使用 `AtomicInteger`

`AtomicInteger`类提供了以原子方式更新`int`型变量的方法，其中`compareAndSet`是CAS操作实现的核心方法。

```java
import java.util.concurrent.atomic.AtomicInteger;  

public class CASExample {  
    private AtomicInteger atomicInteger = new AtomicInteger(0);  

    public void increment() {  
        int expectedValue;  
        int newValue;  
        do {  
            expectedValue = atomicInteger.get(); // 获取当前值  
            newValue = expectedValue + 1;        // 计算新值  
        } while (!atomicInteger.compareAndSet(expectedValue, newValue)); // CAS操作  
    }  

    public int getValue() {  
        return atomicInteger.get();  
    }  

    public static void main(String[] args) {  
        CASExample example = new CASExample();  
        example.increment();  
        System.out.println("Value after increment: " + example.getValue());  
    }  
}
```

在这个示例中，`increment`方法尝试获取当前值、计算新值并使用`compareAndSet`方法进行更新。`compareAndSet`返回`true`表示更新成功，返回`false`表示需要重试。

### 优势与考虑

- **无锁机制**：CAS允许许多线程尝试更新同一个变量，而无需锁定，大大减小了锁竞争。
- **性能提升**：在无锁的情况下，通常会有更好的性能表现，适合高并发场景。
- **ABA问题**：CAS无法直接解决ABA问题（一个值从A变到B，又变回A），可以使用带版本号的变量如`AtomicStampedReference`来解决这个问题。
- **活锁**：在高争用环境下，如果许多线程不断重试更新操作，可能会导致活锁，程序一直循环重试而得不到进展。

CAS是实现乐观并发控制的基础技术，它在Java的并发编程中起着非常重要的作用，尤其是在实现无锁算法时。通过适当使用CAS，可以在保证线程安全的同时，减少锁竞争，提高程序性能。
