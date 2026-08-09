---
title: "Java死锁问题如何解决"
sidebarGroup: "并发编程"
shortTitle: "Java死锁问题如何解决"
order: 244
date: 2026-05-06
category: "面试题"
tag:
  - "面试题"
description: "在Java中，死锁是一种阻塞现象，发生在两个或多个线程相互持有对方所需的资源，从而导致线程无法继续执行。当线程陷入死锁状态时，就无法释放它们持有的资源，因为它们在等待其他线程释放其持有的资源。死锁的四个必要条件是：互斥条件：资源不能被多个线"
article: false
---

> 来源：[Java死锁问题如何解决](https://www.yuque.com/tulingzhouyu/db22bv/yhez1gsatz4004rs)

在Java中，死锁是一种阻塞现象，发生在两个或多个线程相互持有对方所需的资源，从而导致线程无法继续执行。当线程陷入死锁状态时，就无法释放它们持有的资源，因为它们在等待其他线程释放其持有的资源。死锁的四个必要条件是：

1. **互斥条件**：资源不能被多个线程共享。
2. **持有和等待**：线程已经持有至少一个资源并等待获取另外的资源。
3. **不剥夺条件**：资源不能从持有它的线程中剥夺，必须由线程自行释放。
4. **循环等待条件**：存在一个线程循环等待链，链中的每个线程都等待下一个线程所持有的资源。

### 示例代码造成死锁

下面是一个简单的造成死锁的Java代码示例：

```java
public class DeadlockExample {  

    private static class Resource {  
        private final String name;  

        public Resource(String name) {  
            this.name = name;  
        }  

        public String getName() {  
            return name;  
        }  
    }  

    private static final Resource resource1 = new Resource("Resource1");  
    private static final Resource resource2 = new Resource("Resource2");  

    public static void main(String[] args) {  
        Thread thread1 = new Thread(() -> {  
            synchronized (resource1) {  
                System.out.println("Thread 1: locked " + resource1.getName());  

                try { Thread.sleep(100); } catch (InterruptedException e) {}  

                synchronized (resource2) {  
                    System.out.println("Thread 1: locked " + resource2.getName());  
                }  
            }  
        });  

        Thread thread2 = new Thread(() -> {  
            synchronized (resource2) {  
                System.out.println("Thread 2: locked " + resource2.getName());  

                try { Thread.sleep(100); } catch (InterruptedException e) {}  

                synchronized (resource1) {  
                    System.out.println("Thread 2: locked " + resource1.getName());  
                }  
            }  
        });  

        thread1.start();  
        thread2.start();  
    }  
}
```

在这个示例中，`thread1`首先锁定`resource1`然后尝试锁定`resource2`。同时，`thread2`锁定`resource2`后尝试锁定`resource1`。由于两个线程都在相互等待对方释放资源，因此会形成死锁。

### 检测死锁

1. **线程转储分析**：可以通过JVM工具如`jstack`获取线程转储来识别死锁。线程转储会展示所有线程的状态以及所有锁的持有情况。
2. **使用JVisualVM/JConsole**：这些工具可以实时监控JVM状态，并且会自动检测和报告死锁。

### 预防死锁

1. **资源排序（Resource Ordering）**：避免循环等待，可以提前规定资源获取的顺序。所有线程在锁定资源时，必须按预定顺序加锁。

```java
private void acquireResourcesInOrder() {  
    synchronized (resource1) {  
        synchronized (resource2) {  
            // Perform operations  
        }  
    }  
}
```

1. **尝试锁定（Try-Lock）**：使用`tryLock()`方法非阻塞地获取锁。可以设置超时时间来避免死锁。

```java
ReentrantLock lock1 = new ReentrantLock();  
ReentrantLock lock2 = new ReentrantLock();  

public void safeMethod() {  
    try {  
        if (lock1.tryLock(100, TimeUnit.MILLISECONDS)) {  
            try {  
                if (lock2.tryLock(100, TimeUnit.MILLISECONDS)) {  
                    try {  
                        // Perform operations  
                    } finally {  
                        lock2.unlock();  
                    }  
                }  
            } finally {  
                lock1.unlock();  
            }  
        }  
    } catch (InterruptedException e) {  
        e.printStackTrace();  
    }  
}
```

通过适当的设计和策略，死锁是可以预防和管理的，特别是在复杂应用程序多线程编程环境中。
