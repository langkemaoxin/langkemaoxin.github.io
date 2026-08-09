---
title: "使用两个队列实现一个栈"
sidebarGroup: "数据结构与算法"
shortTitle: "使用两个队列实现一个栈"
order: 858
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "使用两个队列实现一个栈的关键在于模拟栈的“后进先出”（LIFO）特性。我们可以通过两个队列来实现栈的基本操作：push（入栈）、pop（出栈）、和peek（查看栈顶元素）。以下是一个实现示例：使用两个队列实现栈设计思路：使用两个队列queu"
article: false
---

> 来源：[使用两个队列实现一个栈](https://www.yuque.com/tulingzhouyu/db22bv/bareggdfa4qy0czh)

使用两个队列实现一个栈的关键在于模拟栈的“后进先出”（LIFO）特性。我们可以通过两个队列来实现栈的基本操作：`push`（入栈）、`pop`（出栈）、和`peek`（查看栈顶元素）。以下是一个实现示例：

### 使用两个队列实现栈

1. **设计思路**：

- 使用两个队列`queue1`和`queue2`。
- `push`操作始终在非空队列中进行。
- `pop`和`peek`操作通过将元素从一个队列转移到另一个队列来实现，直到剩下最后一个元素。

1. **代码示例**：

```java
import java.util.LinkedList;  
import java.util.Queue;  

public class StackUsingQueues {  
    private Queue&lt;Integer&gt; queue1;  
    private Queue&lt;Integer&gt; queue2;  

    // 初始化栈  
    public StackUsingQueues() {  
        queue1 = new LinkedList<>();  
        queue2 = new LinkedList<>();  
    }  

    // 入栈操作  
    public void push(int value) {  
        // 始终在非空队列中进行push操作  
        if (!queue1.isEmpty()) {  
            queue1.offer(value);  
        } else {  
            queue2.offer(value);  
        }  
    }  

    // 出栈操作  
    public int pop() {  
        if (isEmpty()) {  
            throw new IllegalStateException("Stack is empty");  
        }  

        // 将元素从一个队列转移到另一个队列，直到剩下最后一个元素  
        if (!queue1.isEmpty()) {  
            while (queue1.size() > 1) {  
                queue2.offer(queue1.poll());  
            }  
            return queue1.poll();  
        } else {  
            while (queue2.size() > 1) {  
                queue1.offer(queue2.poll());  
            }  
            return queue2.poll();  
        }  
    }  

    // 查看栈顶元素  
    public int peek() {  
        if (isEmpty()) {  
            throw new IllegalStateException("Stack is empty");  
        }  

        int topElement = 0;  
        if (!queue1.isEmpty()) {  
            while (!queue1.isEmpty()) {  
                topElement = queue1.poll();  
                queue2.offer(topElement);  
            }  
        } else {  
            while (!queue2.isEmpty()) {  
                topElement = queue2.poll();  
                queue1.offer(topElement);  
            }  
        }  
        return topElement;  
    }  

    // 检查栈是否为空  
    public boolean isEmpty() {  
        return queue1.isEmpty() && queue2.isEmpty();  
    }  

    public static void main(String[] args) {  
        StackUsingQueues stack = new StackUsingQueues();  

        stack.push(10);  
        stack.push(20);  
        stack.push(30);  

        System.out.println("Top element is: " + stack.peek());  
        System.out.println("Popped element is: " + stack.pop());  
        System.out.println("Top element after pop is: " + stack.peek());  
    }  
}
```

### 说明

- **入栈**`push`：将元素添加到非空队列中。
- **出栈**`pop`：将元素从一个队列转移到另一个队列，直到剩下最后一个元素，该元素即为栈顶元素，将其移除并返回。
- **查看栈顶**`peek`：类似于`pop`，但不移除最后一个元素，只返回其值。
- **检查空栈**`isEmpty`：判断两个队列是否都为空。

这种实现方式通过两个队列来模拟栈的行为，虽然操作复杂度较高，但可以有效地展示如何利用队列实现栈的功能。
