---
title: "父子线程之间如何共享传递数据"
sidebarGroup: "并发编程"
shortTitle: "父子线程之间如何共享传递数据"
order: 243
date: 2026-05-06
category: "面试题"
tag:
  - "面试题"
description: "在Java中，父线程和子线程之间共享或传递数据可以通过多种方式实现，具体可以根据需求选择以下几种常用的方法：1. 使用ThreadLocalThreadLocal是一种特殊的Java对象，它为每个线程提供了独立的变量副本。通过ThreadL"
article: false
---

> 来源：[父子线程之间如何共享传递数据](https://www.yuque.com/tulingzhouyu/db22bv/htt1aseenb9icbcz)

在Java中，父线程和子线程之间共享或传递数据可以通过多种方式实现，具体可以根据需求选择以下几种常用的方法：

### 1. 使用ThreadLocal

`ThreadLocal`是一种特殊的Java对象，它为每个线程提供了独立的变量副本。通过`ThreadLocal`可以实现线程范围内的变量隔离，但不直接用于父子线程数据共享。不过，父线程可以在线程启动之前将数据放到InheritableThreadLocal，子线程可以读取到这些数据。

```java
public class ThreadLocalExample {  
    // 创建一个ThreadLocal对象  
    private static final ThreadLocal&lt;String&gt; threadLocal = new InheritableThreadLocal（）;  

    public static void main(String[] args) {  
        // 设置ThreadLocal的值  
        threadLocal.set("Shared Data");  

        // 子线程  
        Thread childThread = new Thread(() -> {  
            System.out.println("Child Thread: " + threadLocal.get());  
        });  

        // 启动子线程  
        childThread.start();  
    }  
}
```

### 2. 使用Concurrent Collections

Java提供了一些线程安全的集合类，如`ConcurrentHashMap`、`CopyOnWriteArrayList`等，可以安全并发地访问和修改，适用于需要较多线程共享数据的场景。

```java
import java.util.concurrent.ConcurrentHashMap;  
import java.util.Map;  

public class ConcurrentCollectionExample {  
    public static void main(String[] args) {  
        Map<String, String> sharedMap = new ConcurrentHashMap<>();  
       
        sharedMap.put("key", "value from parent");  
       
        // 子线程  
        Thread childThread = new Thread(() -> {  
            // 等待父线程设置完值  
            while (!sharedMap.containsKey("key")) {  
                // active waiting  
            }  
            System.out.println("Child read from map: " + sharedMap.get("key"));  
        });  

        childThread.start();  
    }  
}
```

### 3. 使用消息队列

在复杂的多线程环境下，使用Java的阻塞队列（如`BlockingQueue`）可以在父子线程之间传递数据，并控制线程的执行顺序。

```java
import java.util.concurrent.ArrayBlockingQueue;  
import java.util.concurrent.BlockingQueue;  

public class BlockingQueueExample {  
    public static void main(String[] args) {  
        BlockingQueue&lt;Integer&gt; queue = new ArrayBlockingQueue<>(5);  
        
        for (int i = 0; i < 5; i++) {  
            queue.put(i);  
            System.out.println("Parent put: " + i);  
        }  
           
        // 子线程  
        Thread childThread = new Thread(() -> {  
            try {  
                for (int i = 0; i < 5; i++) {  
                    Integer value = queue.take();  
                    System.out.println("Child take: " + value);  
                }  
            } catch (InterruptedException e) {  
                Thread.currentThread().interrupt();  
            }  
        });  

        childThread.start();  
    }  
}
```

通过这些方式，父子线程可以有效地共享和传递数据，根据应用场景选择最适合的方案，以确保数据一致性和并发安全。
