---
title: "实现一个基于优先队列的最小堆"
sidebarGroup: "数据结构与算法"
shortTitle: "实现一个基于优先队列的最小堆"
order: 867
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现一个基于优先队列的最小堆可以通过Java的PriorityQueue类来实现。PriorityQueue是一个基于堆的优先队列，默认情况下是最小堆。以下是详细的代码示例和解释：基于优先队列的最小堆实现思路：使用Java内置的Priori"
article: false
---

> 来源：[实现一个基于优先队列的最小堆](https://www.yuque.com/tulingzhouyu/db22bv/ast7pw3cveaicxip)

实现一个基于优先队列的最小堆可以通过Java的`PriorityQueue`类来实现。`PriorityQueue`是一个基于堆的优先队列，默认情况下是最小堆。以下是详细的代码示例和解释：

### 基于优先队列的最小堆实现

1. **思路**：

- 使用Java内置的`PriorityQueue`类来实现最小堆。
- `PriorityQueue`会自动维护元素的顺序，使得每次访问或移除的元素都是最小的。

1. **代码示例**：

```java
import java.util.PriorityQueue;  

public class MinHeapExample {  
    public static void main(String[] args) {  
        // 创建一个优先队列，默认是最小堆  
        PriorityQueue&lt;Integer&gt; minHeap = new PriorityQueue<>();  

        // 添加元素到最小堆  
        minHeap.add(10);  
        minHeap.add(5);  
        minHeap.add(20);  
        minHeap.add(3);  

        // 打印最小堆的元素  
        System.out.println("MinHeap elements:");  
        for (Integer element : minHeap) {  
            System.out.print(element + " ");  
        }  
        System.out.println();  

        // 获取并移除最小元素  
        System.out.println("Removed element: " + minHeap.poll()); // 输出3  

        // 获取最小元素但不移除  
        System.out.println("Peek element: " + minHeap.peek()); // 输出5  

        // 再次打印最小堆的元素  
        System.out.println("MinHeap elements after removal:");  
        for (Integer element : minHeap) {  
            System.out.print(element + " ");  
        }  
        System.out.println();  
    }  
}
```

### 详细解释

1. **PriorityQueue类**：

- `PriorityQueue`是Java集合框架中的一个类，提供了基于堆的优先队列实现。
- 默认情况下，`PriorityQueue`是一个最小堆，即每次访问或移除的元素都是最小的。

1. **代码说明**：

- **创建最小堆**：

- `PriorityQueue minHeap = new PriorityQueue<>();`：创建一个空的优先队列，默认是最小堆。

- **添加元素**：

- `minHeap.add(10);`：将元素10添加到最小堆中。
- `minHeap.add(5);`：将元素5添加到最小堆中。
- `minHeap.add(20);`：将元素20添加到最小堆中。
- `minHeap.add(3);`：将元素3添加到最小堆中。

- **打印元素**：

- 使用增强型for循环遍历并打印最小堆中的元素。

- **获取并移除最小元素**：

- `minHeap.poll();`：获取并移除最小元素（3）。

- **获取最小元素但不移除**：

- `minHeap.peek();`：获取最小元素但不移除（5）。

- **再次打印元素**：

- 再次遍历并打印最小堆中的元素，验证最小元素已被移除。

通过这种方式，我们可以轻松地使用Java的`PriorityQueue`类来实现一个最小堆，支持快速的插入、删除和访问最小元素操作。
