---
title: 27.4 一致性哈希算法的golang实现和迁移率测试
sidebarGroup: Prometheus
shortTitle: 63 27.4 一致性哈希算法的golang实现和...
order: 63
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 一致性哈希算法的golang实现 - 使用uint32封装索引排序的结构 - 定义一致性哈希环数据结构 - 选择哈希函数 - 完成Add、Remove、Get方法 一致性哈希算法...'
---

> **Prometheus · 第 63 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 一致性哈希算法的golang实现
  - 使用uint32封装索引排序的结构
  - 定义一致性哈希环数据结构
  - 选择哈希函数
  - 完成Add、Remove、Get方法

# 一致性哈希算法的golang实现

## 使用uint32封装索引排序的结构

- 使用uint32封装
- 实现Len Less Swap方法就可以使用sort.Sort排序

```go
type uints []uint32

// Len returns the length of the uints array.
func (x uints) Len() int { return len(x) }

// Less returns true if element i is less than element j.
func (x uints) Less(i, j int) bool { return x[i] < x[j] }

// Swap exchanges elements i and j.
func (x uints) Swap(i, j int) { x[i], x[j] = x[j], x[i] }

```

## 定义一致性哈希环数据结构

```go

type Consistent struct {
	circle       map[uint32]string // 索引和key的map
	members      map[string]bool   // 快速查找key的set
	sortedHashes uints             // 索引的有序数组
	replicas     int               // 虚拟节点数
	count        int64             // 节点总数
	sync.RWMutex                   //  读写锁
}

```

## 编写 初始化函数

- 根据传入的虚拟节点数初始化

```go
// 编写 初始化函数
func NewConsistent(replicas int) *Consistent {
	c := new(Consistent)
	c.replicas = replicas
	c.circle = make(map[uint32]string)
	c.members = make(map[string]bool)
	return c
}

```

## Add方法添加元素

```go
// Add方法添加元素
func (c *Consistent) Add(elt string) {
	c.Lock()
	defer c.Unlock()
	c.add(elt)
}

```

## 内部的add方法，遍历虚拟节点数添加key

- 首先遍历虚拟节点数
- 在key的前添加i
- hashkey 用哈希算法生成一个 uint32
- 然后将key更新的到member
- 将uint32索引切片排序

```go
// 内部的add方法，遍历虚拟节点数添加key
func (c *Consistent) add(key string) {
	for i := 0; i < c.replicas; i++ {
		c.circle[c.hashKey(c.genKey(key, i))] = key
	}
	c.members[key] = true
	c.updateSortedHashes()
	c.count++
}

```

### 将key加上虚拟节点的索引

```go
// 将key加上虚拟节点的索引
func (c *Consistent) genKey(key string, idx int) string {
	return strconv.Itoa(idx) + key
}
```

### 核心方法 hashKey

- 根据key生成hash值，底层使用murmur3算法
- 这个算法比crc32均匀性要好

```go
// 根据key生成hash值，底层使用murmur3算法，这个算法比crc32均匀性要好
func (c *Consistent) hashKey(key string) uint32 {
	return murmur3.Sum32(str2bytes(key))
}

```

### 同时需要频繁的string 转换为 []byte

- 可以通过unsafe 强制转换绕过复制提高性能

```go
// 可以通过unsafe 强制转换绕过复制提高性能
func str2bytes(s string) (b []byte) {
	sh := *(*reflect.StringHeader)(unsafe.Pointer(&s))
	bh := (*reflect.SliceHeader)(unsafe.Pointer(&b))
	bh.Cap = sh.Len
	bh.Len = sh.Len
	bh.Data = sh.Data
	return b
}
```

### 对索引进行排序

```go
// 对hash值切片进行排序
func (c *Consistent) updateSortedHashes() {
	hashes := c.sortedHashes[:0]
	for k := range c.circle {
		hashes = append(hashes, k)
	}
	sort.Sort(hashes)
	c.sortedHashes = hashes
}
```

## remove方法删除一个node

- 还是遍历虚拟节点数，算hash后删除map和member即可
- 同时也需要排序

```go
// 从hash环中删除一个节点
func (c *Consistent) Remove(elt string) {
	c.Lock()
	defer c.Unlock()
	c.remove(elt)
}

// 遍历虚拟节点数，获取key的哈希值，然后删除即可
func (c *Consistent) remove(key string) {
	for i := 0; i < c.replicas; i++ {
		delete(c.circle, c.hashKey(c.genKey(key, i)))
	}
	delete(c.members, key)
	c.updateSortedHashes()
	c.count--
}

```

## 根据一个key查找哈希环上的node

- 使用同样的哈希算法对key算hash
- 根据hash到环中搜索索引
- 根据索引找到数据返回

```go
// 根据一个target获取node
func (c *Consistent) Get(name string) string {
	c.RLock()
	defer c.RUnlock()
	key := c.hashKey(name)
	i := c.search(key)
	return c.circle[c.sortedHashes[i]]
}
```

### 索引切片的搜索方法

```go
// 索引切片的搜索方法，找到比key大的第一个值
func (c *Consistent) search(key uint32) (i int) {
	f := func(x int) bool {
		return c.sortedHashes[x] > key
	}
	i = sort.Search(len(c.sortedHashes), f)
	if i >= len(c.sortedHashes) {
		i = 0
	}
	return
}
```

## 至此一致性哈希环代码已经编写完了，完整代码如下

```go
package main

import (
	"fmt"
	"github.com/spaolacci/murmur3"
	"log"
	"reflect"
	"sort"
	"strconv"
	"sync"
	"unsafe"
)

type uints []uint32

// Len returns the length of the uints array.
func (x uints) Len() int { return len(x) }

// Less returns true if element i is less than element j.
func (x uints) Less(i, j int) bool { return x[i] < x[j] }

// Swap exchanges elements i and j.
func (x uints) Swap(i, j int) { x[i], x[j] = x[j], x[i] }

// 定义一致性哈希环的数据结构

type Consistent struct {
	circle       map[uint32]string // 索引和key的map
	members      map[string]bool   // 快速查找key的set
	sortedHashes uints             // 索引的有序数组
	replicas     int               // 虚拟节点数
	count        int64             // 节点总数
	sync.RWMutex                   //  读写锁
}

// 编写 初始化函数
func NewConsistent(replicas int) *Consistent {
	c := new(Consistent)
	c.replicas = replicas
	c.circle = make(map[uint32]string)
	c.members = make(map[string]bool)
	return c
}

// Add方法添加元素
func (c *Consistent) Add(key string) {
	c.Lock()
	defer c.Unlock()
	c.add(key)
}

// 内部的add方法，遍历虚拟节点数添加key
func (c *Consistent) add(key string) {
	for i := 0; i < c.replicas; i++ {
		c.circle[c.hashKey(c.genKey(key, i))] = key
	}
	c.members[key] = true
	c.updateSortedHashes()
	c.count++
}

// 将key加上虚拟节点的索引
func (c *Consistent) genKey(key string, idx int) string {
	return strconv.Itoa(idx) + key
}

// 根据key生成hash值，底层使用murmur3算法，这个算法比crc32均匀性要好
func (c *Consistent) hashKey(key string) uint32 {
	return murmur3.Sum32(str2bytes(key))
}

// 可以通过unsafe 强制转换绕过复制提高性能
func str2bytes(s string) (b []byte) {
	sh := *(*reflect.StringHeader)(unsafe.Pointer(&s))
	bh := (*reflect.SliceHeader)(unsafe.Pointer(&b))
	bh.Cap = sh.Len
	bh.Len = sh.Len
	bh.Data = sh.Data
	return b
}

// 对hash值切片进行排序
func (c *Consistent) updateSortedHashes() {
	hashes := c.sortedHashes[:0]
	for k := range c.circle {
		hashes = append(hashes, k)
	}
	sort.Sort(hashes)
	c.sortedHashes = hashes
}

// 根据一个target获取node
func (c *Consistent) Get(name string) string {
	c.RLock()
	defer c.RUnlock()
	key := c.hashKey(name)
	i := c.search(key)
	return c.circle[c.sortedHashes[i]]
}

// 索引切片的搜索方法，找到比key大的第一个值
func (c *Consistent) search(key uint32) (i int) {
	f := func(x int) bool {
		return c.sortedHashes[x] > key
	}
	i = sort.Search(len(c.sortedHashes), f)
	if i >= len(c.sortedHashes) {
		i = 0
	}
	return
}

// 从hash环中删除一个节点
func (c *Consistent) Remove(elt string) {
	c.Lock()
	defer c.Unlock()
	c.remove(elt)
}

// 遍历虚拟节点数，获取key的哈希值，然后删除即可
func (c *Consistent) remove(key string) {
	for i := 0; i < c.replicas; i++ {
		delete(c.circle, c.hashKey(c.genKey(key, i)))
	}
	delete(c.members, key)
	c.updateSortedHashes()
	c.count--
}

func main() {
	r := NewConsistent(500)

	// 初始化的时候5个节点
	nodes := []string{
		"1.1.1.1",
		"2.2.2.2",
		"3.3.3.3",
		"4.4.4.4",
		"5.5.5.5",
	}
	for _, n := range nodes {
		r.Add(n)
	}

	// 准备100个key
	keys := []string{}
	for i := 0; i < 1000; i++ {

		oneKey := fmt.Sprintf("%c_%d", i, i)
		keys = append(keys, oneKey)
	}
	// 100key获取哈希环中的节点
	keyNodeMap := make(map[string]string)
	for _, k := range keys {
		node := r.Get(k)
		keyNodeMap[k] = node
	}

	r.remove(nodes[1])
	log.Printf("remove_node:%v", nodes[1])
	removeNum := 0
	for _, k := range keys {
		node := r.Get(k)
		preNode := keyNodeMap[k]
		keyNodeMap[k] = node
		if preNode != node {
			//log.Printf("[key.node_change][key:%v][pre_node:%v][node:%v]", k, preNode, node)
			removeNum++
		}

	}
	log.Printf("[remove:%d/%d]", removeNum, len(keys))

	r.add("6.6.6.6")
	log.Printf("add_node:%v", "6.6.6.6")
	removeNum = 0
	for _, k := range keys {
		node := r.Get(k)
		preNode := keyNodeMap[k]
		keyNodeMap[k] = node
		if preNode != node {
			//log.Printf("[key.node_change][key:%v][pre_node:%v][node:%v]", k, preNode, node)
			removeNum++
		}

	}
	log.Printf("[remove:%d/%d]", removeNum, len(keys))

}

```

# 测试一致性哈希环在节点删除和新增时node迁移情况

## 删除一个节点

- 新建一个哈希环
- 初始化的时候5个节点
- 准备1000个key
- 1000key获取哈希环中的节点，并将结果塞入map中
- 删除一个节点
- 再将1000key获取哈希环中的节点
- 把前后两次获取到的结果进行比对，如果不一致说明这个key发生了哈希环迁移
- 打印迁移率：1/n

```go
func main() {
	r := NewConsistent(500)

	// 初始化的时候5个节点
	nodes := []string{
		"1.1.1.1",
		"2.2.2.2",
		"3.3.3.3",
		"4.4.4.4",
		"5.5.5.5",
	}
	for _, n := range nodes {
		r.Add(n)
	}

	// 准备1000个key
	keys := []string{}
	for i := 0; i < 1000; i++ {

		oneKey := fmt.Sprintf("%c_%d", i, i)
		keys = append(keys, oneKey)
	}
	// 1000key获取哈希环中的节点
	keyNodeMap := make(map[string]string)
	for _, k := range keys {
		node := r.Get(k)
		keyNodeMap[k] = node
	}

	r.remove(nodes[1])
	log.Printf("remove_node:%v", nodes[1])
	removeNum := 0
	for _, k := range keys {
		node := r.Get(k)
		preNode := keyNodeMap[k]
		keyNodeMap[k] = node
		if preNode != node {
			//log.Printf("[key.node_change][key:%v][pre_node:%v][node:%v]", k, preNode, node)
			removeNum++
		}

	}
	log.Printf("[remove:%d/%d]", removeNum, len(keys))

	r.add("6.6.6.6")
	log.Printf("add_node:%v", "6.6.6.6")
	removeNum = 0
	for _, k := range keys {
		node := r.Get(k)
		preNode := keyNodeMap[k]
		keyNodeMap[k] = node
		if preNode != node {
			//log.Printf("[key.node_change][key:%v][pre_node:%v][node:%v]", k, preNode, node)
			removeNum++
		}

	}
	log.Printf("[remove:%d/%d]", removeNum, len(keys))

}

```

## 新增一个节点

- 整体过程类似

## 结果解读

- 迁移率为 1/5
- abs(原节点数-现有节点数)/ max(原节点数,现有节点数)

```shell
2021/08/26 12:22:17 remove_node:2.2.2.2
2021/08/26 12:22:17 [remove:192/1000]
2021/08/26 12:22:17 add_node:6.6.6.6
2021/08/26 12:22:17 [remove:197/1000]

```

# 本节重点总结 :

- 一致性哈希算法的golang实现
  - 使用uint32封装索引排序的结构
  - 定义一致性哈希环数据结构
  - 选择哈希函数
  - 完成Add、Remove、Get方法

