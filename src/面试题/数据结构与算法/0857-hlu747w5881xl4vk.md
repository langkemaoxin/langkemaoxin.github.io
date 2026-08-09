---
title: "实现一个简单的哈希表"
sidebarGroup: "数据结构与算法"
shortTitle: "实现一个简单的哈希表"
order: 857
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现一个简单的哈希表需要考虑如何存储键值对、处理哈希冲突、以及基本的操作如插入、删除和查找。我们可以使用链地址法来处理哈希冲突，这意味着每个哈希表的槽位将存储一个链表来处理冲突。以下是详细的代码示例和解释：简单哈希表实现思路：使用一个数组来"
article: false
---

> 来源：[实现一个简单的哈希表](https://www.yuque.com/tulingzhouyu/db22bv/hlu747w5881xl4vk)

实现一个简单的哈希表需要考虑如何存储键值对、处理哈希冲突、以及基本的操作如插入、删除和查找。我们可以使用链地址法来处理哈希冲突，这意味着每个哈希表的槽位将存储一个链表来处理冲突。以下是详细的代码示例和解释：

### 简单哈希表实现

1. **思路**：

- 使用一个数组来存储链表，每个链表用于存储哈希冲突的键值对。
- 计算键的哈希值并将其映射到数组的索引。
- 提供插入、删除和查找操作。

1. **代码示例**：

```java
import java.util.LinkedList;  

public class SimpleHashTable<K, V> {  
    // 定义哈希表的节点  
    private static class HashNode<K, V> {  
        K key;  
        V value;  
        HashNode<K, V> next;  

        public HashNode(K key, V value) {  
            this.key = key;  
            this.value = value;  
        }  
    }  

    private LinkedList<HashNode<K, V>>[] table; // 哈希表数组  
    private int capacity; // 哈希表的容量  
    private int size; // 当前哈希表中的元素数量  

    // 构造函数  
    public SimpleHashTable(int capacity) {  
        this.capacity = capacity;  
        this.table = new LinkedList[capacity];  
        this.size = 0;  
    }  

    // 计算哈希值  
    private int hash(K key) {  
        return Math.abs(key.hashCode()) % capacity;  
    }  

    // 插入键值对  
    public void put(K key, V value) {  
        int index = hash(key);  
        if (table[index] == null) {  
            table[index] = new LinkedList<>();  
        }  

        for (HashNode<K, V> node : table[index]) {  
            if (node.key.equals(key)) {  
                node.value = value; // 更新现有键的值  
                return;  
            }  
        }  

        table[index].add(new HashNode<>(key, value));  
        size++;  
    }  

    // 获取值  
    public V get(K key) {  
        int index = hash(key);  
        LinkedList<HashNode<K, V>> chain = table[index];  

        if (chain != null) {  
            for (HashNode<K, V> node : chain) {  
                if (node.key.equals(key)) {  
                    return node.value;  
                }  
            }  
        }  
        return null; // 如果键不存在  
    }  

    // 删除键值对  
    public V remove(K key) {  
        int index = hash(key);  
        LinkedList<HashNode<K, V>> chain = table[index];  

        if (chain != null) {  
            for (HashNode<K, V> node : chain) {  
                if (node.key.equals(key)) {  
                    V value = node.value;  
                    chain.remove(node);  
                    size--;  
                    return value;  
                }  
            }  
        }  
        return null; // 如果键不存在  
    }  

    // 获取哈希表的大小  
    public int size() {  
        return size;  
    }  

    public static void main(String[] args) {  
        SimpleHashTable<String, Integer> hashTable = new SimpleHashTable<>(10);  
        hashTable.put("apple", 1);  
        hashTable.put("banana", 2);  
        hashTable.put("orange", 3);  

        System.out.println("Value for 'apple': " + hashTable.get("apple"));  
        System.out.println("Value for 'banana': " + hashTable.get("banana"));  
        System.out.println("Removing 'banana': " + hashTable.remove("banana"));  
        System.out.println("Value for 'banana' after removal: " + hashTable.get("banana"));  
        System.out.println("Current size of hash table: " + hashTable.size());  
    }  
}
```

### 详细解释

1. **HashNode类**：

- 定义了一个节点，包含键、值和指向下一个节点的引用。

1. **SimpleHashTable类**：

- **成员变量**：

- `LinkedList>[] table`: 用于存储链表的数组。
- `int capacity`: 哈希表的容量。
- `int size`: 当前哈希表中的元素数量。

- **构造函数**：初始化哈希表的容量和数组。
- **hash方法**：计算键的哈希值并映射到数组的索引。
- **put方法**：插入键值对，处理哈希冲突。
- **get方法**：根据键查找值。
- **remove方法**：删除键值对并返回被删除的值。
- **size方法**：返回哈希表的当前大小。

1. **main方法**：

- 创建一个`SimpleHashTable`实例。
- 插入一些键值对。
- 获取和删除键值对，并打印结果。

通过这种实现，我们可以创建一个简单的哈希表，支持基本的插入、查找和删除操作。
