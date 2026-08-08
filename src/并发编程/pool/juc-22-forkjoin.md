---
title: "ForkJoinPool 分治与工作窃取"
sidebarGroup: "线程池"
shortTitle: "04 ForkJoinPool"
order: 4
date: 2026-11-28
category: "并发编程"
tag:
  - "并发编程"
  - "ForkJoin"
---

> **线程池 · 第 4/4 篇**  
> 上一篇：[《线程池参数动态化实践》](/并发编程/pool/juc-21-dynamic-params) · 下一篇：[《Disruptor 高性能内存队列实战》](/并发编程/performance/juc-23-disruptor)

---

## 开头：两千万整数排序，单线程要多久

一道面试题：对 2000 万元素的数组排序，如何吃满多核 CPU？单线程归并排序 O(n log n) 已经不错，但只有一个核在干活。把数组一分为二、四、八……交给多个线程并行排序再合并，就是 **分治 + ForkJoin** 的思路。

![由算法题引发的思考](/并发编程/pool/14/p01-01.png)

---

## 一、归并排序与分治

归并排序：拆成两个子数组 → 分别排序 → 合并有序结果。时间 O(n log n)，空间 O(n)。

**分治三步骤**：分解 → 求解子问题 → 合并。

单线程实现：小于阈值直接 `Arrays.sort`，否则递归拆分合并。

---

## 二、Fork/Join 并行归并

继承 `RecursiveAction`（无返回值）或 `RecursiveTask`（有返回值）：

```java
@Override
protected void compute() {
    if (arrayToSort.length <= threshold) {
        Arrays.sort(arrayToSort);
        return;
    }
    int mid = arrayToSort.length / 2;
    MergeSortTask left = new MergeSortTask(leftHalf, threshold);
    MergeSortTask right = new MergeSortTask(rightHalf, threshold);
    left.fork();
    right.fork();
    left.join();
    right.join();
    arrayToSort = MergeSort.merge(left.getSortedArray(), right.getSortedArray());
}
```

### 性能对比

2000 万元素测试：数组越大，ForkJoin 相对单线程归并优势越明显（具体倍数取决于核数与阈值）。

### 优化注意点

- **任务粒度**：太小 → 拆分合并开销大；太大 → 核利用不足
- **负载均衡**：递归深度不宜过深
- **数据分布**：尽量均分子数组
- **内存**：大数组注意拷贝成本，可考虑原地归并

---

## 三、Fork/Join 框架

**Fork** = 任务分解提交；**Join** = 等待子任务结果合并。

### 适用场景

- 递归分治：排序、大数组计算
- Java 8 **并行 Stream** 底层常用 common ForkJoinPool
- 计算密集型、可拆分任务

### 核心组件

| 组件 | 作用 |
|------|------|
| ForkJoinPool | 线程池，工作窃取调度 |
| ForkJoinTask | 抽象任务 |
| RecursiveAction | 无返回值递归任务 |
| RecursiveTask | 有返回值递归任务 |
| CountedCompleter | 完成时触发钩子 |

### ForkJoinPool 构造参数

- **parallelism**：并行度，默认 `availableProcessors()`
- **factory**：ForkJoinWorkerThreadFactory
- **handler**：未捕获异常处理
- **asyncMode**：true = FIFO，false = LIFO（默认，利于递归）

提交方式：`execute`（异步）、`invoke`（阻塞拿结果）、`submit`（Future）。

### fork() 与 join()

- `fork()`：提交到当前 worker 队列（非 FJ 线程则进 common pool）
- `join()`：阻塞等待子任务完成

---

## 四、工作窃取（Work-Stealing）

每个 worker 有自己的双端队列：本线程 **LIFO** 取自己的任务（缓存局部性）；空闲线程从**其他队列头部 FIFO 窃取**任务，减少锁竞争、提高 CPU 利用率。

### 斐波那契示例

`F(n) = F(n-1) + F(n-2)` 天然递归，用 RecursiveTask 演示 fork/join 拆分：

```java
class FibTask extends RecursiveTask<Integer> {
    final int n;
    FibTask(int n) { this.n = n; }
    protected Integer compute() {
        if (n <= 1) return n;
        FibTask f1 = new FibTask(n - 1);
        f1.fork();
        int f2 = new FibTask(n - 2).compute();
        return f1.join() + f2;
    }
}
```

---

## 五、与 ThreadPoolExecutor 的分工

| | ThreadPoolExecutor | ForkJoinPool |
|--|-------------------|--------------|
| 任务模型 | 独立 Runnable/Callable | 递归拆分合并 |
| 队列 | 共享 BlockingQueue | 每 worker 双端队列 + 窃取 |
| 典型场景 | IO 密集、Web 请求、异步任务 | CPU 密集、递归、并行 Stream |

---

## 小结

- 分治问题用 **RecursiveAction/Task** + **ForkJoinPool**
- 工作窃取让 idle 线程从 busy 线程队列偷任务，提高多核利用率
- 线程池系列收束；下一组进入 **性能扩展**——Disruptor 与专栏回顾
