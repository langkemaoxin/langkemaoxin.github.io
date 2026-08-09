---
title: "Java死锁问题如何排查"
sidebarGroup: "线上问题排查"
shortTitle: "Java死锁问题如何排查"
order: 767
date: 2026-05-28
category: "面试题"
tag:
  - "面试题"
description: "在Java应用程序中，死锁是一个经典的并发问题，它会导致线程永久阻塞，无法继续进行任何操作。排查Java死锁问题需要熟悉多线程调试技巧和工具。以下是一个详细的排查过程以及一个具体的示例。排查步骤识别死锁现象收集线程转储分析线程转储代码审查重"
article: false
---

> 来源：[Java死锁问题如何排查](https://www.yuque.com/tulingzhouyu/db22bv/hmdc25fizw0n6hlr)

在Java应用程序中，死锁是一个经典的并发问题，它会导致线程永久阻塞，无法继续进行任何操作。排查Java死锁问题需要熟悉多线程调试技巧和工具。以下是一个详细的排查过程以及一个具体的示例。

### 排查步骤

1. **识别死锁现象**
2. **收集线程转储**
3. **分析线程转储**
4. **代码审查**
5. **重现问题**
6. **使用调试工具**
7. **优化和验证**

### 详细排查过程

#### 1. 识别死锁现象

通常，死锁会表现为应用程序挂起、不响应用户请求或CPU使用率下降。

#### 2. 收集线程转储

当应用出现不响应时，使用以下方法收集Java线程转储（Thread Dump）：

- **JVM命令**：在Linux或Mac上使用`jstack`，在Windows上使用`Ctrl+Break`。

```java
jstack -l &lt;pid&gt; > threaddump.txt
```

- **IDE支持**：使用Eclipse或IntelliJ的调试功能来生成线程转储。

#### 3. 分析线程转储

从生成的线程转储中寻找"deadlock"相关信息。Java会在发现死锁时显示类似如下的信息：

```java
Found one Java-level deadlock:  
=============================  
"Thread-1":  
waiting to lock monitor 0x000000000f8cba48 (object 0x00000000d66b4db0, a java.lang.Object),  
which is held by "Thread-2"  
"Thread-2":  
waiting to lock monitor 0x000000000f8cba58 (object 0x00000000d66b4dc0, a java.lang.Object),  
which is held by "Thread-1"  

Java stack information for the threads listed above:  
===================================================  
"Thread-1":  
at com.example.MyClass.methodA(MyClass.java:10)  
                               - locked <0x00000000d66b4dc0> (a java.lang.Object)  
- waiting to lock <0x00000000d66b4db0> (a java.lang.Object)  
"Thread-2":  
at com.example.MyClass.methodB(MyClass.java:20)  
- locked <0x00000000d66b4db0> (a java.lang.Object)  
- waiting to lock <0x00000000d66b4dc0> (a java.lang.Object)
```

#### 4. 代码审查

根据线程转储信息，对出现死锁的代码段进行详细审查。

**示例代码**：

```java
public class DeadlockExample {  
    private final Object lock1 = new Object();  
    private final Object lock2 = new Object();  

    public void methodA() {  
        synchronized (lock1) {  
            System.out.println("Method A: Holding lock 1...");  
            try { Thread.sleep(100); } catch (InterruptedException e) {}  
            synchronized (lock2) {  
                System.out.println("Method A: Holding lock 2...");  
            }  
        }  
    }  

    public void methodB() {  
        synchronized (lock2) {  
            System.out.println("Method B: Holding lock 2...");  
            try { Thread.sleep(100); } catch (InterruptedException e) {}  
            synchronized (lock1) {  
                System.out.println("Method B: Holding lock 1...");  
            }  
        }  
    }  
}
```

- 问题：`methodA` 和 `methodB` 之间存在循环锁定。

#### 5. 重现问题

在测试环境中尝试重现死锁问题：

```java
public class DeadlockDemo {  
    public static void main(String[] args) {  
        DeadlockExample example = new DeadlockExample();  

        Thread t1 = new Thread(() -> example.methodA(), "Thread-1");  
        Thread t2 = new Thread(() -> example.methodB(), "Thread-2");  

        t1.start();  
        t2.start();  
    }  
}
```

#### 6. 使用调试工具

利用调试工具如Eclipse、IntelliJ的线程调试功能，进一步定位死锁位置。

#### 7. 优化和验证

**解决方案**：

- **锁排序**：确保所有线程以相同顺序申请锁。

```java
public void methodA() {  
    synchronized (lock1) {  
        synchronized (lock2) {  
            // 操作  
        }  
    }  
}  

public void methodB() {  
    synchronized (lock1) { // 调整顺序  
        synchronized (lock2) {  
            // 操作  
        }  
    }  
}
```

- **使用**`Lock`**接口**：用显式锁代替内置同步。

```java
private final Lock lock1 = new ReentrantLock();  
private final Lock lock2 = new ReentrantLock();  

public void methodA() {  
    lock1.lock();  
    try {  
        lock2.lock();  
        try {  
            // 操作  
        } finally {  
            lock2.unlock();  
        }  
    } finally {  
        lock1.unlock();  
    }  
}  

public void methodB() {  
    lock1.lock(); // 确保同样顺序的锁定  
    try {  
        lock2.lock();  
        try {  
            // 操作  
        } finally {  
            lock2.unlock();  
        }  
    } finally {  
        lock1.unlock();  
    }  
}
```

- **超时尝试**：利用`tryLock`的时间限制功能。

**验证**：

- 实施改动后，重新执行测试，确保死锁不再出现。
- 强化单元测试以覆盖多线程场景。

### 总结

排查Java死锁问题涉及识别现象、获取详细线程转储信息、分析代码、优化同步逻辑等步骤。在实践中，通过良好的设计可以避免大多数常见的死锁问题。使用高层次的并发工具（如`java.util.concurrent`包）也能显著简化并发编程，从而减少死锁的可能性。持续的监控和测试是确保应用稳定性的关键。
