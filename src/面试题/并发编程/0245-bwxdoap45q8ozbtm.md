---
title: "Synchronized是如何实现线程同步的"
sidebarGroup: "并发编程"
shortTitle: "Synchronized是如何实现线程同步的"
order: 245
date: 2026-06-17
category: "面试题"
tag:
  - "面试题"
description: "synchronized关键字是Java中实现线程同步的基本机制之一。它用于保护共享资源不被多个线程同时访问，从而避免数据不一致和保证线程安全。synchronized可以用于方法和代码块，有助于确保在同一时刻只有一个线程可以进入同步代码块"
article: false
---

> 来源：[Synchronized是如何实现线程同步的](https://www.yuque.com/tulingzhouyu/db22bv/bwxdoap45q8ozbtm)

`synchronized`关键字是Java中实现线程同步的基本机制之一。它用于保护共享资源不被多个线程同时访问，从而避免数据不一致和保证线程安全。`synchronized`可以用于方法和代码块，有助于确保在同一时刻只有一个线程可以进入同步代码块。

### 实现原理

`synchronized`基于监视器锁（Monitor Lock）实现，底层依赖于操作系统的互斥锁（Mutex）。每个对象在Java中都与一个隐式的监视器相关联，使用`synchronized`时，线程需要获得对象的监视器锁，然后才能进入同步代码块。

Java的对象有一个头（Object Header），其中包含一个`Mark Word`，用于存储锁的信息。锁有不同的状态，包括无锁状态、偏向锁、轻量级锁和重量级锁，JVM会根据竞争情况自动进行状态变换以优化性能。

### 使用示例

#### 1. 同步方法

使用`synchronized`直接修饰实例方法或静态方法，以同步整个方法。下面是一个示例：

```java
public class Counter {  
    private int count = 0;  

    // Synchronized instance method  
    public synchronized void increment() {  
        count++;  
    }  

    public synchronized int getCount() {  
        return count;  
    }  
}
```

在这个示例中，`increment()`和`getCount()`方法是同步的，这意味着对同一实例的这些方法调用是线程安全的。

#### 2. 同步代码块

为了减少锁的粒度，您可以在方法中使用`synchronized`代码块，从而只锁住特定的部分。

```java
public class Counter {  
    private int count = 0;  
    private final Object lock = new Object(); // 使用自定义锁对象  

    public void increment() {  
        synchronized(lock) {  
            count++;  
        }  
    }  

    public int getCount() {  
        synchronized(lock) {  
            return count;  
        }  
    }  
}
```

这种方法允许更精细地控制同步范围，常用于只需保护代码的一部分而非整个方法的场景。

### 同步静态方法

对于静态方法，`synchronized`锁定的是类对象，因为静态方法属于类，而不是实例。

```java
public class Counter {  
    private static int count = 0;  

    // Synchronized static method  
    public static synchronized void increment() {  
        count++;  
    }  

    public static synchronized int getCount() {  
        return count;  
    }  
}
```

在这个例子中，加锁保护的是整个类`Counter`的静态成员`count`，使用类级别的锁来保证线程安全。

### 注意事项

1. **性能**：使用`synchronized`可能导致线程阻塞，从而影响程序性能。尽量将`synchronized`锁的范围缩小，以减少锁竞争。
2. **死锁风险**：错误使用同步可能导致死锁。例如，多个线程在不同的锁上循环等待。要避免持有多个锁，或者确保获取锁的顺序一致。
3. **原子性和可见性**：`synchronized`不仅保证代码块的原子性，还保证进入同步代码块之前对变量的修改，对于其他线程是可见的。
4. **公平性**：`synchronized`不保证线程获取锁的公平性，即线程获取锁的顺序不一定按照调用顺序。如果需要严格的公平性控制，可能需要使用`ReentrantLock`等高级锁。

通过`synchronized`，我们可以确保共享资源在多线程环境下的安全访问，同时通过合适的使用方式来优化性能和避免常见的多线程问题。
