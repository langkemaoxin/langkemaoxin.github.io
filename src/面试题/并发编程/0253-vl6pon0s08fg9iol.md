---
title: "Future和CompletableFuture的区别"
sidebarGroup: "并发编程"
shortTitle: "Future和CompletableFuture的区别"
order: 253
date: 2026-03-17
category: "面试题"
tag:
  - "面试题"
description: "Future 和 CompletableFuture 是 Java 中用于异步编程的两个重要接口，它们都在 java.util.concurrent 包中被定义，但它们的设计和用途有显著的不同。FutureFuture 接口代表了一个异步计"
article: false
---

> 来源：[Future和CompletableFuture的区别](https://www.yuque.com/tulingzhouyu/db22bv/vl6pon0s08fg9iol)

`Future` 和 `CompletableFuture` 是 Java 中用于异步编程的两个重要接口，它们都在 `java.util.concurrent` 包中被定义，但它们的设计和用途有显著的不同。

### Future

`Future` 接口代表了一个异步计算的结果。它提供了一种检查计算是否完成的方法，以及在计算完成后获取结果或处理可能的异常。

#### 特点

1. **获取结果**：可以通过 `get()` 方法阻塞等待计算完成并获取结果。
2. **取消任务**：可以通过 `cancel()` 方法尝试取消任务。
3. **异步但不易组合**：`Future` 本身没有提供处理异步结果的方法，也没有组合多个 `Future` 的机制。

#### 示例代码

```java
import java.util.concurrent.Callable;  
import java.util.concurrent.ExecutionException;  
import java.util.concurrent.ExecutorService;  
import java.util.concurrent.Executors;  
import java.util.concurrent.Future;  

public class FutureExample {  
    public static void main(String[] args) {  
        ExecutorService executor = Executors.newFixedThreadPool(2);  

        Callable&lt;Integer&gt; task = () -> {  
            Thread.sleep(1000); // 模拟长时间任务  
            return 42;  
        };  

        Future&lt;Integer&gt; future = executor.submit(task);  

        try {  
            // do something else  
            System.out.println("Doing something else...");  
            Integer result = future.get(); // 阻塞等待结果  
            System.out.println("Result: " + result);  
        } catch (InterruptedException | ExecutionException e) {  
            e.printStackTrace();  
        } finally {  
            executor.shutdown();  
        }  
    }  
}
```

### CompletableFuture

`CompletableFuture` 是 Java 8 引入的新特性，支持更多的异步编程功能和更丰富的组合手段。

#### 特点

1. **非阻塞**：提供了很多方法如 `thenApply()`, `thenAccept()` 等进行异步计算，避免阻塞。
2. **组合任务**：支持组合多个异步操作，如使用 `thenCombine()`, `allOf()`, `anyOf()` 等。
3. **手动完成**：可以通过 `complete()` 方法手动设置结果。
4. **与流式操作结合**：支持更多的函数式操作，像流式 API 一样链式调用。

#### 示例代码

```java
import java.util.concurrent.CompletableFuture;  
import java.util.concurrent.ExecutionException;  

public class CompletableFutureExample {  
    public static void main(String[] args) throws ExecutionException, InterruptedException {  
        CompletableFuture&lt;Integer&gt; future = CompletableFuture.supplyAsync(() -> {  
            sleep(1000);  
            return 42;  
        });  

        // 非阻塞链式操作  
        CompletableFuture&lt;Void&gt; resultFuture = future.thenApply(result -> {  
            System.out.println("Result: " + result);  
            return result * 2;  
        }).thenAccept(result -> System.out.println("Transformed Result: " + result));  

        resultFuture.get(); // 等待所有阶段完成  
    }  

    private static void sleep(int milliseconds) {  
        try {  
            Thread.sleep(milliseconds);  
        } catch (InterruptedException e) {  
            throw new IllegalStateException(e);  
        }  
    }  
}
```

### 主要区别

1. **功能范围**：`CompletableFuture` 为更复杂的异步操作提供了更广泛的功能，而 `Future` 仅提供基本的任务完成和结果获取。
2. **组合能力**：`CompletableFuture` 支持异步任务的流式组合，而 `Future` 需要显式的阻塞和同步。
3. **非阻塞**：`CompletableFuture` 可以方便地进行非阻塞操作链，而 `Future` 本质上是阻塞的。

`CompletableFuture` 提供了更现代的接口来处理复杂的异步编程需求，它支持 completablepatables 和更丰富的组合能力，尤其适合复杂的异步数据流处理场景。
