---
title: "实现一个基于数组的栈（Stack）"
sidebarGroup: "数据结构与算法"
shortTitle: "实现一个基于数组的栈（Stack）"
order: 866
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现一个基于数组的栈需要定义一个类来管理栈的基本操作，如入栈、出栈、查看栈顶元素等。以下是一个简单的基于数组的栈实现：基于数组的栈实现设计思路：使用一个数组来存储栈的元素。使用一个整数变量top来跟踪栈顶元素的索引。提供基本的栈操作：pus"
article: false
---

> 来源：[实现一个基于数组的栈（Stack）](https://www.yuque.com/tulingzhouyu/db22bv/dovgvw2vx40m0e9x)

实现一个基于数组的栈需要定义一个类来管理栈的基本操作，如入栈、出栈、查看栈顶元素等。以下是一个简单的基于数组的栈实现：

### 基于数组的栈实现

1. **设计思路**：

- 使用一个数组来存储栈的元素。
- 使用一个整数变量`top`来跟踪栈顶元素的索引。
- 提供基本的栈操作：`push`（入栈）、`pop`（出栈）、`peek`（查看栈顶元素）、`isEmpty`（检查栈是否为空）和`isFull`（检查栈是否已满）。

1. **代码示例**：

```java
public class ArrayStack {  
    private int[] stack;  
    private int top;  
    private int capacity;  

    // 初始化栈  
    public ArrayStack(int capacity) {  
        this.capacity = capacity;  
        stack = new int[capacity];  
        top = -1; // 栈为空时，top为-1  
    }  

    // 入栈操作  
    public void push(int value) {  
        if (isFull()) {  
            throw new StackOverflowError("Stack is full");  
        }  
        stack[++top] = value;  
    }  

    // 出栈操作  
    public int pop() {  
        if (isEmpty()) {  
            throw new IllegalStateException("Stack is empty");  
        }  
        return stack[top--];  
    }  

    // 查看栈顶元素  
    public int peek() {  
        if (isEmpty()) {  
            throw new IllegalStateException("Stack is empty");  
        }  
        return stack[top];  
    }  

    // 检查栈是否为空  
    public boolean isEmpty() {  
        return top == -1;  
    }  

    // 检查栈是否已满  
    public boolean isFull() {  
        return top == capacity - 1;  
    }  

    // 获取栈的大小  
    public int size() {  
        return top + 1;  
    }  

    public static void main(String[] args) {  
        ArrayStack stack = new ArrayStack(5);  

        stack.push(10);  
        stack.push(20);  
        stack.push(30);  

        System.out.println("Top element is: " + stack.peek());  
        System.out.println("Stack size is: " + stack.size());  

        System.out.println("Popped element is: " + stack.pop());  
        System.out.println("Stack size after pop is: " + stack.size());  
    }  
}
```

### 说明

- **初始化**：构造函数`ArrayStack(int capacity)`用于初始化栈的容量和数组。
- **入栈**`push`：在栈顶插入一个元素，并更新`top`索引。
- **出栈**`pop`：移除并返回栈顶元素，更新`top`索引。
- **查看栈顶**`peek`：返回栈顶元素但不移除它。
- **检查空栈**`isEmpty`：判断栈是否为空。
- **检查满栈**`isFull`：判断栈是否已满。
- **获取栈大小**`size`：返回当前栈中元素的数量。

这种基于数组的栈实现简单且高效，但需要注意栈的容量限制。如果需要动态调整栈的大小，可以考虑使用动态数组（如`ArrayList`）或链表来实现。
