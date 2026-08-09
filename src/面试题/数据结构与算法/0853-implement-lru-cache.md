---
title: "实现一个LRU（最近最少使用）缓存"
sidebarGroup: "数据结构与算法"
shortTitle: "实现一个LRU（最近最少使用）缓存"
order: 853
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现一个LRU（最近最少使用）缓存可以通过使用HashMap和双向链表来实现。HashMap用于快速查找缓存中的元素，而双向链表用于维护元素的使用顺序。以下是详细的代码示例和解释：LRU缓存实现思路：使用HashMap存储键值对，以便快速访"
article: false
---

> 来源：[实现一个LRU（最近最少使用）缓存](https://www.yuque.com/tulingzhouyu/db22bv/ok06pgr1p259gqc6)

实现一个LRU（最近最少使用）缓存可以通过使用`HashMap`和双向链表来实现。`HashMap`用于快速查找缓存中的元素，而双向链表用于维护元素的使用顺序。以下是详细的代码示例和解释：

### LRU缓存实现

1. **思路**：

- 使用`HashMap`存储键值对，以便快速访问。
- 使用双向链表维护元素的使用顺序，最近使用的元素放在链表头部，最少使用的元素放在链表尾部。
- 每次访问或插入元素时，将该元素移动到链表头部。
- 当缓存容量达到上限时，移除链表尾部的元素。

1. **代码示例**：

```java
import java.util.HashMap;  

class LRUCache {  
    private class Node {  
        int key;  
        int value;  
        Node prev;  
        Node next;  

        Node(int key, int value) {  
            this.key = key;  
            this.value = value;  
        }  
    }  

    private final int capacity;  
    private final HashMap<Integer, Node> map;  
    private final Node head;  
    private final Node tail;  

    public LRUCache(int capacity) {  
        this.capacity = capacity;  
        this.map = new HashMap<>();  
        this.head = new Node(0, 0); // 哨兵节点，头部  
        this.tail = new Node(0, 0); // 哨兵节点，尾部  
        head.next = tail;  
        tail.prev = head;  
    }  

    public int get(int key) {  
        Node node = map.get(key);  
        if (node == null) {  
            return -1; // 如果键不存在，返回-1  
        }  
        moveToHead(node); // 将访问的节点移动到头部  
        return node.value;  
    }  

    public void put(int key, int value) {  
        Node node = map.get(key);  
        if (node == null) {  
            Node newNode = new Node(key, value);  
            map.put(key, newNode);  
            addNode(newNode);  
            if (map.size() > capacity) {  
                Node tail = popTail();  
                map.remove(tail.key);  
            }  
        } else {  
            node.value = value;  
            moveToHead(node);  
        }  
    }  

    private void addNode(Node node) {  
        node.prev = head;  
        node.next = head.next;  
        head.next.prev = node;  
        head.next = node;  
    }  

    private void removeNode(Node node) {  
        Node prev = node.prev;  
        Node next = node.next;  
        prev.next = next;  
        next.prev = prev;  
    }  

    private void moveToHead(Node node) {  
        removeNode(node);  
        addNode(node);  
    }  

    private Node popTail() {  
        Node res = tail.prev;  
        removeNode(res);  
        return res;  
    }  

    public static void main(String[] args) {  
        LRUCache cache = new LRUCache(2);  

        cache.put(1, 1);  
        cache.put(2, 2);  
        System.out.println(cache.get(1)); // 返回 1  

        cache.put(3, 3); // 该操作会使得键 2 作废  
        System.out.println(cache.get(2)); // 返回 -1 (未找到)  

        cache.put(4, 4); // 该操作会使得键 1 作废  
        System.out.println(cache.get(1)); // 返回 -1 (未找到)  
        System.out.println(cache.get(3)); // 返回 3  
        System.out.println(cache.get(4)); // 返回 4  
    }  
}
```

### 详细解释

1. **Node类**：

- `int key, value`: 存储缓存的键和值。
- `Node prev, next`: 指向前一个和后一个节点的指针。
- 构造函数`Node(int key, int value)`: 初始化节点的键和值。

1. **LRUCache类**：

- **成员变量**：

- `int capacity`: 缓存的容量。
- `HashMap map`: 存储键到节点的映射。
- `Node head, tail`: 哨兵节点，用于标记链表的头部和尾部。

- **构造函数**：

- 初始化容量、`HashMap`和哨兵节点。
- 将`head`和`tail`连接起来。

- **get方法**：

- 从`map`中获取节点，如果不存在返回-1。
- 如果存在，将节点移动到链表头部，并返回节点的值。

- **put方法**：

- 检查键是否存在于`map`中。
- 如果不存在，创建新节点并添加到链表头部。
- 如果`map`的大小超过容量，移除链表尾部的节点。
- 如果存在，更新节点的值并移动到链表头部。

- **辅助方法**：

- `addNode(Node node)`: 将节点添加到链表头部。
- `removeNode(Node node)`: 从链表中移除节点。
- `moveToHead(Node node)`: 将节点移动到链表头部。
- `popTail()`: 移除并返回链表尾部的节点。

通过这种方式，我们可以高效地实现一个LRU缓存，`get`和`put`操作的时间复杂度均为O(1)。
