---
title: "全国 14 亿人，怎么统计重名最多的前 100 个姓名"
sidebarGroup: "fox老师"
shortTitle: "全国 14 亿人，怎么统计重名最多的前 100 个姓名"
order: 1044
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "最近有小伙伴在面试阿里，遇到这个面试题。全国14亿人，统计出重名最多的前100个姓名小伙伴支支吾吾的说了几句，面试官不满意，面试挂了。 TOP N 统计的面试题，是一道非常常见的题目，大家一定要掌握好。1. 问题描述我们的目标是找出重名人数"
article: false
---

> 来源：[全国 14 亿人，怎么统计重名最多的前 100 个姓名](https://www.yuque.com/tulingzhouyu/db22bv/pcamdcyypuevq8dv)

最近有小伙伴在面试阿里，遇到这个面试题。

> **全国14亿人，统计出重名最多的前100个姓名**

小伙伴支支吾吾的说了几句，面试官不满意，面试挂了。

TOP N 统计的面试题，是一道非常常见的题目，大家一定要掌握好。

## 1. 问题描述

我们的目标是找出重名人数最多的前100个姓名。为此，我们需要设计一种高效的方法来统计每个名字的出现次数，并快速找到出现次数最多的前100个名字。

## 2. 问题分析

要实现这个目标，我们需要两个步骤：

1. 选择一种高效的数据结构来统计每个名字出现的次数。
2. 快速找到出现次数最多的前100个名字。

### 数据结构选择

在选择数据结构时，我们考虑以下几种常见的选项：

- **数组和链表**：由于内存浪费和查找效率低下，这些结构不适合处理动态长度和多样性的字符串集合。
- **哈希表**：其插入和查找的时间复杂度为O(1)，但极端情况下可能造成冲突，且无法共享前缀。
- **平衡二叉搜索树**：支持快速插入和查找，但对字符串操作效率较低。
- **前缀树（Trie）**：通过共享前缀节点，能够有效节省空间并提高效率，适合存储姓名。

> [前缀树数据结构演示网站](https://www.cs.usfca.edu/~galles/visualization/Trie.html)

经过分析，我们选择使用前缀树（Trie）来统计姓名的出现次数。

### 如何快速筛选出Top 100？

在确定使用Trie树后，我们需要设计一个高效的方式来筛选出出现次数最多的前100个姓名。直接排序虽然简单，但对大数据量的处理会非常耗时，因此我们采用小顶堆来优化这个过程。

> [小顶堆数据结构演示网站](https://www.cs.usfca.edu/~galles/visualization/Heap.html)

使用小顶堆的步骤如下：

1. 初始化一个大小为100的小顶堆。
2. 遍历每个姓名及其出现次数：

- 如果当前堆的大小小于100，直接将姓名及其出现次数插入堆中。
- 如果当前姓名的出现次数大于堆顶元素的次数，则替换堆顶元素。

1. 遍历结束后，堆中将包含重名人数最多的前100个姓名。

## 3. 解决方案

**所以解决这个问题可以使用前缀树 + 小顶堆**

以下是Trie树和小顶堆的代码实现：

```java
import java.util.HashMap;  
import java.util.Map;  
import java.util.PriorityQueue;  

// Trie树节点类  
class TrieNode {  
    Map<Character, TrieNode> children; // 子节点集合  
    int count; // 姓名出现次数  

    public TrieNode() {  
        children = new HashMap<>(); // 初始化子节点集合  
        count = 0; // 初始化计数  
    }  
}  

// Trie树类  
class Trie {  
    private TrieNode root; // Trie树的根节点  

    public Trie() {  
        root = new TrieNode(); // 初始化根节点  
    }  

    // 插入姓名  
    public void insert(String name) {  
        TrieNode node = root; // 从根节点开始  
        for (char ch : name.toCharArray()) {  
            node = node.children.computeIfAbsent(ch, k -> new TrieNode());  
        }  
        node.count++; // 姓名出现次数加一  
    }  

    // 获取所有名字及其出现次数  
    public void getAllNames(TrieNode node, StringBuilder prefix,   
                            PriorityQueue&lt;NameCount&gt; minHeap, int k) {  
        if (node == null) return; // 递归终止条件  

        // 如果有名字出现次数  
        if (node.count > 0) {  
            if (minHeap.size() < k) {  
                minHeap.offer(new NameCount(prefix.toString(), node.count));  
            } else if (node.count > minHeap.peek().count) {  
                minHeap.poll(); // 替换堆顶  
                minHeap.offer(new NameCount(prefix.toString(), node.count));  
            }  
        }  

        // 遍历子节点  
        for (Map.Entry<Character, TrieNode> entry : node.children.entrySet()) {  
            prefix.append(entry.getKey());  
            getAllNames(entry.getValue(), prefix, minHeap, k); // 递归查找  
            prefix.deleteCharAt(prefix.length() - 1); // 回溯  
        }  
    }  

    // 获取前k个姓名  
    public PriorityQueue&lt;NameCount&gt; getTopKNames(int k) {  
        PriorityQueue&lt;NameCount&gt; minHeap = new PriorityQueue<>(k); // 创建小顶堆  
        getAllNames(root, new StringBuilder(), minHeap, k); // 调用递归  
        return minHeap;  
    }  
}  

// 包含姓名和出现次数的类  
class NameCount implements Comparable&lt;NameCount&gt; {  
    String name; // 姓名  
    int count; // 出现次数  

    public NameCount(String name, int count) {  
        this.name = name;  
        this.count = count;  
    }  

    @Override  
    public int compareTo(NameCount other) {  
        return Integer.compare(this.count, other.count); // 比较  
    }  

    @Override  
    public String toString() {  
        return name + ": " + count; // 输出格式  
    }  
}  

// 主程序类  
public class Main {  
    public static void main(String[] args) {  
        // 示例数据  
        String[] names = {"李强", "王丽", "张伟", "王芳", "李娜",   
                          "陈伟", "刘洋", "张敏", "李静", "黄磊",   
                          "刘涛", "王刚", "张明", "王勇", "李鹏"};   
        int k = 100; // 要找到的前100个姓名  

        Trie trie = new Trie(); // 创建Trie实例  
        for (String name : names) {  
            trie.insert(name); // 插入姓名  
        }  

        // 获取并输出重名人数最多的前k个姓名  
        PriorityQueue&lt;NameCount&gt; topKNames = trie.getTopKNames(k);  
        while (!topKNames.isEmpty()) {  
            System.out.println(topKNames.poll()); // 输出结果  
        }  
    }  
}
```

## 4. 问题改进：内存受限不超过2G

上面的问题进行改进一下, 如果我们对内存有一个限制,比如:要求内存的使用不能超过2G，怎么解决。

注意，这里的内存受限，尽量使用磁盘处理。

这在内存受限和需要高效磁盘操作的情况下，**哈希映射**相较于**Trie树**更为合适。Trie树是根据字符粒度组织的，进行磁盘读取时效率较低，而且需要更复杂的磁盘操作。而哈希映射则是基于键值对存储，处理时能以较高的效率进行磁盘读取，代码实现也相对简洁明了。

### 解决方案

针对大规模数据的处理，我们可以采用分治策略，利用外部排序和哈希映射的方法。具体步骤如下：

1. **分块读取数据**：将14亿条记录分成多个较小的块，每次读取一部分数据到内存中进行处理。
2. **哈希映射统计词频**：对每个数据块进行哈希映射，统计每个姓名出现的次数，并将结果写入到磁盘文件。
3. **合并词频统计结果**：读取所有中间文件，合并各个块的词频统计结果，得到全局的频次分布。
4. **使用小顶堆找出前100个重复最多的名字**：利用小顶堆获取出现次数最多的前100个姓名。

以下是实现上述逻辑的代码示例：

```java
import java.io.*;  
import java.util.HashMap;  
import java.util.Map;  
import java.util.PriorityQueue;  

// 存储姓名及其出现次数的类  
class NameCount implements Comparable&lt;NameCount&gt; {  
    String name; // 姓名  
    int count; // 出现次数  

    public NameCount(String name, int count) {  
        this.name = name;  
        this.count = count;  
    }  

    // 比较方法：按照次数进行比较  
    @Override  
    public int compareTo(NameCount other) {  
        return Integer.compare(this.count, other.count);  
    }  

    @Override  
    public String toString() {  
        return name + ": " + count; // 输出格式  
    }  
}  

public class ExternalMemoryTopK {  
    private static final int CHUNK_SIZE = 1000000; // 每个块处理100万条记录  

    public static void main(String[] args) throws IOException {  
        String inputFile = "names.txt"; // 输入文件名  
        String outputFile = "top100names.txt"; // 输出文件名  
        int k = 100; // 要找出的前100个名字  

        // 第一步：分块读取数据并统计词频  
        int chunkIndex = 0; // 记录块的索引  
        BufferedReader reader = new BufferedReader(new FileReader(inputFile));  
        String line;  
        while ((line = reader.readLine()) != null) {  
            Map<String, Integer> frequencyMap = new HashMap<>(); // 统计当前块的姓名频次  
            int lineCount = 0; // 记录当前块的行数  
            // 读取一部分数据到内存中  
            while (line != null && lineCount < CHUNK_SIZE) {  
                frequencyMap.put(line, frequencyMap.getOrDefault(line, 0) + 1); // 更新姓名频次  
                line = reader.readLine(); // 继续读取下一行  
                lineCount++; // 增加行数计数  
            }  
            writeFrequencyMapToFile(frequencyMap, "chunk_" + chunkIndex + ".txt"); // 将结果写入文件  
            chunkIndex++; // 增加块索引  
        }  
        reader.close(); // 关闭读取文件  

        // 第二步：合并所有块的词频统计结果  
        Map<String, Integer> globalFrequencyMap = new HashMap<>(); // 存储全局的频次统计结果  
        for (int i = 0; i < chunkIndex; i++) {  
            mergeFrequencyMapFromFile(globalFrequencyMap, "chunk_" + i + ".txt"); // 合并每个块的统计结果  
        }  

        // 第三步：使用小顶堆找出前100个重名人数最多的姓名  
        PriorityQueue&lt;NameCount&gt; minHeap = new PriorityQueue<>(k); // 创建小顶堆  
        for (Map.Entry<String, Integer> entry : globalFrequencyMap.entrySet()) {  
            // 如果堆的大小小于k，直接插入  
            if (minHeap.size() < k) {  
                minHeap.offer(new NameCount(entry.getKey(), entry.getValue()));  
            } else if (entry.getValue() > minHeap.peek().count) { // 如果当前次数大于堆顶  
                minHeap.poll(); // 移除堆顶元素  
                minHeap.offer(new NameCount(entry.getKey(), entry.getValue())); // 添加新的姓名及其数目  
            }  
        }  

        // 输出结果到文件  
        BufferedWriter writer = new BufferedWriter(new FileWriter(outputFile));  
        while (!minHeap.isEmpty()) {  
            writer.write(minHeap.poll().toString()); // 输出堆中每个元素  
            writer.newLine(); // 换行  
        }  
        writer.close(); // 关闭写入文件  
    }  

    // 把频次统计写入文件  
    private static void writeFrequencyMapToFile(Map<String, Integer> frequencyMap, String filename) throws IOException {  
        BufferedWriter writer = new BufferedWriter(new FileWriter(filename));  
        for (Map.Entry<String, Integer> entry : frequencyMap.entrySet()) {  
            writer.write(entry.getKey() + " " + entry.getValue()); // 格式：姓名 次数  
            writer.newLine(); // 换行  
        }  
        writer.close(); // 关闭写入文件  
    }  

    // 合并每个块的频次统计结果  
    private static void mergeFrequencyMapFromFile(Map<String, Integer> globalFrequencyMap, String filename) throws IOException {  
        BufferedReader reader = new BufferedReader(new FileReader(filename));  
        String line;  
        while ((line = reader.readLine()) != null) {  
            String[] parts = line.split(" "); // 按空格分割  
            String name = parts[0]; // 姓名  
            int count = Integer.parseInt(parts[1]); // 次数  
            globalFrequencyMap.put(name, globalFrequencyMap.getOrDefault(name, 0) + count); // 更新全局频次  
        }  
        reader.close(); // 关闭读取文件  
    }  
}
```

通过采取分块读取和哈希映射的方法，我们可以在内存受限的情况下有效地统计全国14亿人中重名人数最多的前100位姓名。使用小顶堆的策略可以快速找到出现次数最多的姓名，此解决方案在处理大规模数据时具有很好的灵活性和效率。
