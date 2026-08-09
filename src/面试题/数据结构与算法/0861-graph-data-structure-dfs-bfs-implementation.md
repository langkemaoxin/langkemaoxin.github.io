---
title: "实现一个基本的图数据结构，并实现深度优先搜索（DFS）和广度优先搜索（BFS）"
sidebarGroup: "数据结构与算法"
shortTitle: "实现一个基本的图数据结构，并实现深度优先搜索（DFS）和广度优先搜索（BFS）"
order: 861
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现一个基本的图数据结构可以使用邻接表来表示图。邻接表是一种常用的图表示方法，其中每个节点都有一个列表，存储与其相邻的节点。我们将实现图的基本结构，并提供深度优先搜索（DFS）和广度优先搜索（BFS）算法。以下是详细的代码示例和解释：图数据"
article: false
---

> 来源：[实现一个基本的图数据结构，并实现深度优先搜索（DFS）和广度优先搜索（BFS）](https://www.yuque.com/tulingzhouyu/db22bv/vfdpb50bh04diqwy)

实现一个基本的图数据结构可以使用邻接表来表示图。邻接表是一种常用的图表示方法，其中每个节点都有一个列表，存储与其相邻的节点。我们将实现图的基本结构，并提供深度优先搜索（DFS）和广度优先搜索（BFS）算法。以下是详细的代码示例和解释：

### 图数据结构及DFS和BFS实现

1. **思路**：

- 使用一个`Map`来存储图的邻接表，其中键是节点，值是与该节点相邻的节点列表。
- 实现DFS和BFS算法来遍历图。

1. **代码示例**：

```java
import java.util.*;  

public class Graph {  
    private Map<Integer, List&lt;Integer&gt;> adjList; // 邻接表  

    // 构造函数  
    public Graph() {  
        adjList = new HashMap<>();  
    }  

    // 添加边  
    public void addEdge(int source, int destination) {  
        adjList.computeIfAbsent(source, k -> new ArrayList<>()).add(destination);  
        adjList.computeIfAbsent(destination, k -> new ArrayList<>()).add(source); // 无向图  
    }  

    // 深度优先搜索  
    public void dfs(int start) {  
        Set&lt;Integer&gt; visited = new HashSet<>();  
        dfsUtil(start, visited);  
    }  

    private void dfsUtil(int node, Set&lt;Integer&gt; visited) {  
        visited.add(node);  
        System.out.print(node + " ");  

        for (int neighbor : adjList.getOrDefault(node, new ArrayList<>())) {  
            if (!visited.contains(neighbor)) {  
                dfsUtil(neighbor, visited);  
            }  
        }  
    }  

    // 广度优先搜索  
    public void bfs(int start) {  
        Set&lt;Integer&gt; visited = new HashSet<>();  
        Queue&lt;Integer&gt; queue = new LinkedList<>();  

        visited.add(start);  
        queue.add(start);  

        while (!queue.isEmpty()) {  
            int node = queue.poll();  
            System.out.print(node + " ");  

            for (int neighbor : adjList.getOrDefault(node, new ArrayList<>())) {  
                if (!visited.contains(neighbor)) {  
                    visited.add(neighbor);  
                    queue.add(neighbor);  
                }  
            }  
        }  
    }  

    public static void main(String[] args) {  
        Graph graph = new Graph();  
        graph.addEdge(0, 1);  
        graph.addEdge(0, 2);  
        graph.addEdge(1, 2);  
        graph.addEdge(2, 3);  
        graph.addEdge(3, 4);  

        System.out.println("Depth First Search starting from node 0:");  
        graph.dfs(0);  

        System.out.println("\nBreadth First Search starting from node 0:");  
        graph.bfs(0);  
    }  
}
```

### 详细解释

1. **Graph类**：

- **成员变量**：

- `Map> adjList`: 用于存储图的邻接表。

- **构造函数**：初始化邻接表。
- **addEdge方法**：添加边到图中。

- 使用`computeIfAbsent`方法确保每个节点都有一个列表。
- 对于无向图，添加双向边。

1. **深度优先搜索（DFS）**：

- **dfs方法**：初始化一个`Set`用于存储已访问节点，并调用`dfsUtil`。
- **dfsUtil方法**：递归地访问节点。

- 将当前节点标记为已访问并打印。
- 递归访问所有未访问的邻居节点。

1. **广度优先搜索（BFS）**：

- **bfs方法**：使用队列实现。
- 初始化一个`Set`用于存储已访问节点和一个`Queue`用于存储待访问节点。
- 将起始节点标记为已访问并加入队列。
- 迭代访问队列中的节点，打印节点并将未访问的邻居节点加入队列。

1. **main方法**：

- 创建一个`Graph`实例。
- 添加一些边。
- 调用`dfs`和`bfs`方法从节点0开始遍历图，并打印结果。

通过这种实现，我们可以创建一个简单的图数据结构，并使用DFS和BFS算法遍历图。
