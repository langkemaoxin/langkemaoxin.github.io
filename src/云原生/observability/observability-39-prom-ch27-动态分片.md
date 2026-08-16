---
title: Prometheus 第27章：动态分片
sidebarGroup: 可观测性
shortTitle: 39 动态分片
order: 39
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第27章（动态分片）合并笔记
---

> **Prometheus · 第 27 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 27.1 采集端单点问题原因和危害，静态分片方案的弊端

# 本节重点介绍 :

- 采集器单点问题和危害
- 采集器挂掉的场景原因
- 静态分片的手段和弊端

# 采集器单点问题

- 采集器由于prometheus进程挂了，导致数据断点
- 数据断点时间取决于 进程挂的持续时间
- 采集器上的所有job数据都将断点

## 模拟数据断点问题

- 将prometheus采集器停止 1分钟
- 断点图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111851000/216cebdfbe5547878ca50b0de338f002.png)

## prometheus进程挂的常见原因

- 由于采集target的突增，导致prometheus采集器内存暴涨，oom
  - 动态服务发现举例，k8s中的pod扩容，导致数据暴涨，prometheus，oom
  - 静态配置突增的原因
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111851000/26953feaddfb46ebb70151f0be0bfac0.png)
- 由于prometheus所在机器 down机导致

## 危害

- 采集器宕机时，看图不可用
- 报警不可用，因为查询不到数据

# 静态分片的手段

## 应用：hashmod 解决k8s大集群采集问题

## 场景说明

- 有的k8s集群数据量太大了，一个prometheus采集会导致内存消耗过多，采集效率下降
- 此时需要启动多个prometheus，使用hashmod做静态分片
- hashmod需要和keep或drop做配合

## 配置说明

- 第1个prometheus配置

```yaml
relabel_configs:
  - source_labels: [__address__]
    regex: (.*)
    modulus: 2
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    regex: ^0$
    replacement: $1
    action: keep

```

- 第2个prometheus配置

```yaml
relabel_configs:
  - source_labels: [__address__]
    regex: (.*)
    modulus: 2
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    regex: ^1$
    replacement: $1
    action: keep

```

- 解读一下，两个prometheus的   modulus=2代表一共两个分片
- 其中第1个 regex: ^0$ 第二个 regex: ^1$ ，然后通过action: keep做保留
- 意思是target的__address__做hash之后对2取模
- =0由第1个prometheus采集，=1由第2个prometheus采集

## 源码解读

```go
	case HashMod:
		mod := sum64(md5.Sum([]byte(val))) % cfg.Modulus
		lb.Set(cfg.TargetLabel, fmt.Sprintf("%d", mod))
```

# 静态分片的弊端

- 静态分片虽然将全部数据分成n份采集
- 这时1个分片挂掉，只会影响 1/n的数据
- 但是由于没有接管这 1/n，也会导致部分数据断点

# 本节重点总结:

- 采集器单点问题和危害
- 采集器挂掉的场景原因
- 静态分片的手段和弊端

## 27.2 动态分片方案和它要解决的问题

# 本节重点介绍 :

- 动态分片方案要解决的几个问题
  - 如何解决静态分片中分片挂掉的问题
  - 如何统一采集器配置
  - 如何将采集的target分发给采集器
  - 如何降低分片变化时target的迁移

# 动态分片方案

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111890000/b21b8e5851d347169f9f614b28aa7773.png)

> 需要解决下面的问题

- 如何解决静态分片中分片挂掉的问题
- 如何统一采集器配置
- 如何将采集的target分发给采集器
- 如何降低分片变化是target的迁移

## 如何解决静态分片中分片挂掉的问题

- 答案就是探活，对所有分片进行探活
- 如果发现分片挂掉，将挂掉的分片剔除，进行target的再分配

## 如何统一采集器配置

- 使用file_sd ，这样每个采集器分片的配置都一致

## 如何将采集的target分发给采集器

- 既然传输的是文件，则需要ansible文件分发或者其他同步手段

## 如何降低分片变化时候target的迁移

- 使用一致性哈希算法替换取模
- 这样在分片发生变化时可以降低key的迁移

## 整体思路总结

- 从cmdb/服务树获取 要监控的target列表，如300台node_exporter
- 以json文件的形式分发存活的3个采集器，每个节点100台
- 每个采集器收到属于自己的target，使用file_sd ，reload配置即可
- 同时开启对3个采集器的探活
- 如果发现采集器A挂掉，则立即获取300台node_exporter分发给 B和C

# 本节重点 :

- 动态分片方案要解决的几个问题
  - 如何解决静态分片中分片挂掉的问题
  - 如何统一采集器配置
  - 如何将采集的target分发给采集器
  - 如何降低分片变化是target的迁移

## 27.3 一致性哈希算法介绍

# 本节重点介绍 :

- 哈希算法
- 一致性哈希算法
  - 优点
  - 特性
  - 迁移过程
  - 底层算法导致的不均衡性

# 什么是哈希

hash（散列、杂凑）函数，是将任意长度的数据映射到有限长度的域上。直观解释起来，就是对一串数据m进行杂糅，输出另一段固定长度的数据h，作为这段数据的特征（指纹）

- 举例 md5sum

```shell
[root@prome_master_01 prometheus]# md5sum  prometheus.yml
b03075ae85405e468a327d285bb1a84f  prometheus.yml

```

## 哈希算法在分布式系统中的问题

- 在分布式的存储系统中，要将数据存储到具体的节点上
- 如果我们采用普通的hash算法进行路由，将数据映射到具体的节点上，如key%N，key是数据的key，N是机器节点数
- 如果有一个机器加入或退出这个集群，则所有的数据映射都无效了，如果是持久化存储则要做数据迁移，如果是分布式缓存，则其他缓存就失效了。

# 一致性哈希算法

- 一致性哈希算法在 1997 年由麻省理工学院提出
- 是一种特殊的哈希算法
- 在移除或者添加一个服务器时，能够尽可能小地改变已存在的服务请求与处理请求服务器之间的映射关系
- 一致性哈希解决了简单哈希算法在分布式哈希表（Distributed Hash Table，DHT）中存在的动态伸缩等问题 。

## 一致性哈希算法优点

- 可扩展性

  - 一致性哈希算法保证了增加或减少服务器时，数据存储的改变最少
  - 相比传统哈希算法大大节省了数据移动的开销
- 更好地适应数据的快速增长

  - 采用一致性哈希算法分布数据，当数据不断增长时，部分虚拟节点中可能包含很多数据、造成数据在虚拟节点上分布不均衡
  - 此时可以将包含数据多的虚拟节点分裂，这种分裂仅仅是将原有的虚拟节点一分为二、不需要对全部的数据进行重新哈希和划分。
- 处理负载不均衡

  - 虚拟节点分裂后，如果物理服务器的负载仍然不均衡，只需在服务器之间调整部分虚拟节点的存储分布
  - 这样可以随数据的增长而动态的扩展物理服务器的数量，且代价远比传统哈希算法重新分布所有数据要小很多。

## 一致性哈希算法与哈希算法的关系

> 一致性哈希算法是在哈希算法基础上提出的，在动态变化的分布式环境中，哈希算法应该满足的几个条件：平衡性、单调性和分散性。**

- 平衡性：是指 hash 的结果应该平均分配到各个节点，这样从算法上解决了负载均衡问题。
- 单调性：是指在新增或者删减节点时，不影响系统正常运行。
- 分散性：是指数据应该分散地存放在分布式集群中的各个节点（节点自己可以有备份），不必每个节点都存储所有的数据。

## 一致性哈希算法原理

### 一致性哈希环

- 一致性哈希算法通过一个叫作一致性哈希环的数据结构实现
- 这个环的起点是 0，终点是 2^32 - 1，并且起点与终点连接，故这个环的整数分布范围是 [0, 2^32-1]，如下图所示：![c_hash_01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/609696ba12dc4d4da6d33eb2c0f4408d.png)

## 将对象放置到哈希环

- 假设我们有 "semlinker"、"kakuqo"、"lolo"、"fer" 四个对象，分别简写为 o1、o2、o3 和 o4，然后使用哈希函数计算这个对象的 hash 值，值的范围是 [0, 2^32-1]：![c_hash_02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/e8dcd6153f7348a3b0a7154172cfce03.png)

图中对象的映射关系如下：

```shell
hash(o1) = k1; hash(o2) = k2;
hash(o3) = k3; hash(o4) = k4;
```

## 将服务器放置到哈希环

- 接着使用同样的哈希函数，我们将服务器也放置到哈希环上
- 可以选择服务器的 IP 或主机名作为键进行哈希，这样每台服务器就能确定其在哈希环上的位置。这里假设我们有 3 台缓存服务器，分别为 cs1、cs2 和 cs3：![c_hash_03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/6c17523317cc45319a07a2dce315eeb0.png)
- 图中服务器的映射关系如下：

```shell
hash(cs1) = t1; hash(cs2) = t2; hash(cs3) = t3; # Cache Server
```

## 为对象选择服务器

- 将对象和服务器都放置到同一个哈希环后，在哈希环上顺时针查找距离这个对象的 hash 值最近的机器，即是这个对象所属的机器
- 以 o2 对象为例，顺序针找到最近的机器是 cs2，故服务器 cs2 会缓存 o2 对象
- 而服务器 cs1 则缓存 o1，o3 对象，服务器 cs3 则缓存 o4 对象。![c_hash_04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/88613c76e2d449649a97232ba506ab54.png)

## 服务器增加的情况

- 假设由于业务需要，我们需要增加一台服务器 cs4
- 经过同样的 hash 运算，该服务器最终落于 t1 和 t2 服务器之间，具体如下图所示：![c_hash_05.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/a584edd2bcdc4bc09adb789761d703e5.png)
- 对于上述的情况，只有 t1 和 t2 服务器之间的对象需要重新分配
- 在以上示例中只有 o3 对象需要重新分配，即它被重新到 cs4 服务器
- 在前面我们已经分析过，如果使用简单的取模方法，当新添加服务器时可能会导致大部分缓存失效
- 而使用一致性哈希算法后，这种情况得到了较大的改善，因为只有少部分对象需要重新分配。

## 服务器减少的情况

- 假设 cs3 服务器出现故障导致服务下线
- 这时原本存储于 cs3 服务器的对象 o4，需要被重新分配至 cs2 服务器，其它对象仍存储在原有的机器上。![c_hash_06.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/6dc3462ff8f649ab968bfc5372e6e811.png)

## 虚拟节点

- 到这里一致性哈希的基本原理已经介绍完了，但对于新增服务器的情况还存在一些问题
- 新增的服务器 cs4 只分担了 cs1 服务器的负载，服务器 cs2 和 cs3 并没有因为 cs4 服务器的加入而减少负载压力
- 如果 cs4 服务器的性能与原有服务器的性能一致甚至可能更高，那么这种结果并不是我们所期望的。
- 针对这个问题，我们可以通过引入虚拟节点来解决负载不均衡的问题
- 即将每台物理服务器虚拟为一组虚拟服务器，将虚拟服务器放置到哈希环上，如果要确定对象的服务器，需先确定对象的虚拟服务器，再由虚拟服务器确定物理服务器。![c_hash_07.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/51668aafcc9b44d8b379dec47b7a2144.png)
- 图中 o1 和 o2 表示对象，v1 ~ v6 表示虚拟服务器，s1 ~ s3 表示物理服务器。

# python 实现一致性哈希算法

```python
import mmh3

class ConsistentHashRing(object):
    def __init__(self, replicas=3, nodes=None, ):
        self.replicas = replicas
        self.ring = dict()
        self._sorted_keys = []

        if nodes:
            for node in nodes:
                self.add_node(node)
        self.nodes = nodes

    def add_node(self, node):
        """
        Adds a `node` to the hash ring (including a number of replicas)
        """
        for i in range(self.replicas):
            virtual_node = f"{node}#{i}"
            key = self.gen_key(virtual_node)
            self.ring[key] = node
            self._sorted_keys.append(key)
            # print(f"{virtual_node} --> {key} --> {node}")

        self._sorted_keys.sort()
        # print([self.ring[key] for key in self._sorted_keys])

    def remove_node(self, node):
        """
        Removes `node` from the hash ring and its replicas
        """
        for i in range(self.replicas):
            key = self.gen_key(f"{node}#{i}")
            del self.ring[key]
            self._sorted_keys.remove(key)

    def get_node(self, string_key):
        """
        Given a string key a corresponding node in the hash ring is returned.

        If the hash ring is empty, `None` is returned.
        """
        return self.get_node_pos(string_key)[0]

    def get_node_pos(self, string_key):
        """
        Given a string key a corresponding node in the hash ring is returned
        along with it's position in the ring.

        If the hash ring is empty, (`None`, `None`) is returned.
        """
        if not self.ring:
            return None, None

        key = self.gen_key(string_key)
        nodes = self._sorted_keys
        for i in range(len(nodes)):
            node = nodes[i]
            if key < node:
                return self.ring[node], i

        # 如果key > node，那么让这些key落在第一个node上就形成了闭环
        return self.ring[nodes[0]], 0

    def gen_key(self, string_key):
        """
        Given a string key it returns a long value, this long value represents
        a place on the hash ring
        """
        return mmh3.hash(string_key, 32, signed=False)

```

# 一致性哈希算法不均匀 中 crc32 vs murmur3

![transfer01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/22580d4a9f564e6bb7e10240af11716f.png)

![transfer02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111900000/f15ba6abe16d498fb5f46b489d747718.png)

# 本节重点总结 :

- 哈希算法
- 一致性哈希算法
  - 优点
  - 特性
  - 迁移过程
  - 底层算法导致的不均衡性

## 27.4 一致性哈希算法的golang实现和迁移率测试

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

## 27.5 go实战项目prome-shard的代码准备工作

# 本节重点介绍 :

- 定义每个分片的服务
- 编写配置文件
- 配置文件解析的工作
- 命令行参数解析、读取配置文件、设置logger
- 初始化consul client

# 设计配置文件

## 定义每个分片的服务

- name 代表这个服务的名字和在consul注册的服务的名字
- desc 是描述信息
- nodes 代表这个服务对应的prometheus节点列表
- port代表prometheus端口
- dest_sd_file_name代表 prometheus file_sd的json文件名字
- yaml_path 代表执行哪个ansible的playbook

```yaml
shard_service:
  - name:   scrape_prometheus_node_exporter
    desc: inf ecs 监控
    nodes:
      - 172.20.70.205
      - 172.20.70.215

    port: 9090
    dest_sd_file_name: file_sd_by_prome_shared.json
    yaml_path: ./copy_file_and_reload_prome.yaml

```

## consul服务信息

```yaml
consul_server:
  # consul api 地址
  addr: 172.20.70.205:8500
  username:
  password:

```

# 新建项目完成前期准备工作

## 新建go项目 prome-shard

- go mod init prome-shard

## 配置文件解析的工作

- 新建目录和文件 config/config.go
- 配置文件解析

```yaml
package config

import (
	"fmt"
	"io/ioutil"

	"gopkg.in/yaml.v2"
)

type Config struct {
	ShardService []*ShardService     `yaml:"shard_service"`
	ConsulServer *ConsulServerConfig `yaml:"consul_server"`
	RpcAddr      string              `yaml:"rpc_addr"`
	HttpAddr     string              `yaml:"http_addr"`
}

type ShardService struct {
	Name           string   `yaml:"name"`
	Desc           string   `yaml:"desc"`
	DestSdFileName string   `yaml:"dest_sd_file_name"`
	YamlPath       string   `yaml:"yaml_path"`
	Nodes          []string `yaml:"nodes"`
	Port           int      `yaml:"port"`
}
type ConsulServerConfig struct {
	Addr     string `yaml:"addr,omitempty"`
	Username string `yaml:"username,omitempty"`
	Password string `yaml:"password,omitempty"`
}

func Load(s string) (*Config, error) {
	cfg := &Config{}

	err := yaml.Unmarshal([]byte(s), cfg)

	if err != nil {
		return nil, err
	}

	return cfg, nil
}

func LoadFile(filename string) (*Config, error) {
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	cfg, err := Load(string(content))
	if err != nil {
		fmt.Printf("[parsing YAML file errr...][error:%v]", err)
		return nil, err
	}
	return cfg, nil
}

```

## 命令行参数解析、读取配置文件、设置logger

- main.go中

```go
package main

import (
	"fmt"
	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"
	"os"
	"path/filepath"
	"prome-shard/config"
	"time"
	//"github.com/oklog/run"
	"github.com/prometheus/common/promlog"
	promlogflag "github.com/prometheus/common/promlog/flag"
	"github.com/prometheus/common/version"
	"gopkg.in/alecthomas/kingpin.v2"
)

func main() {

	var (
		// 命令行参数
		app = kingpin.New(filepath.Base(os.Args[0]), "The prome-shard")
		// 指定配置文件
		configFile = app.Flag("config.file", "prome-shard configuration file path.").Default("prome-shard.yml").String()
	)
	promlogConfig := promlog.Config{}
	//
	app.Version(version.Print("prome-shard"))
	app.HelpFlag.Short('h')
	promlogflag.AddFlags(app, &promlogConfig)
	kingpin.MustParse(app.Parse(os.Args[1:]))

	// 设置logger
	var logger log.Logger
	logger = func(config *promlog.Config) log.Logger {
		var (
			l  log.Logger
			le level.Option
		)
		if config.Format.String() == "logfmt" {
			l = log.NewLogfmtLogger(log.NewSyncWriter(os.Stderr))
		} else {
			l = log.NewJSONLogger(log.NewSyncWriter(os.Stderr))
		}

		switch config.Level.String() {
		case "debug":
			le = level.AllowDebug()
		case "info":
			le = level.AllowInfo()
		case "warn":
			le = level.AllowWarn()
		case "error":
			le = level.AllowError()
		}
		l = level.NewFilter(l, le)
		l = log.With(l, "ts", log.TimestampFormat(
			func() time.Time { return time.Now().Local() },
			"2006-01-02T15:04:05.000Z07:00",
		), "caller", log.DefaultCaller)
		return l
	}(&promlogConfig)
	level.Debug(logger).Log("msg", "using_config_file", "filepath", *configFile)

	sConfig, err := config.LoadFile(*configFile)
	fmt.Println(sConfig.ShardService[0], err)
}

```

## 新建watch目录，完成consul的初始化

- 新建watch/consul.go ，把之前演示的consul代码copy过来

```go
package watch

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"
	consul "github.com/hashicorp/consul/api"
	"github.com/hashicorp/consul/api/watch"
)

type client struct {
	consul           *consul.Client
	consulServerAddr string

	logger log.Logger
}

func NewConsulClient(addr string, logger log.Logger) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{
		consul:           c,
		consulServerAddr: addr,
		logger:           logger,
	}, nil
}

// Register a service with consul local agent
func (c *client) ServiceRegister(srvName, srvHost string, srvPort int) error {

	reg := new(consul.AgentServiceRegistration)
	reg.Name = srvName

	thisId := fmt.Sprintf("%s_%d", srvHost, srvPort)
	reg.ID = thisId
	reg.Port = srvPort
	reg.Address = srvHost
	level.Info(c.logger).Log("msg", "ServiceRegisterStart", "id", thisId)
	//增加check
	check := new(consul.AgentServiceCheck)
	check.HTTP = fmt.Sprintf("http://%s:%d%s", reg.Address, reg.Port, "/-/healthy")
	//设置超时 5s。
	check.Timeout = "2s"
	//check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}

```

- main.go中初始化consul client

```go
	// init consul client
	client, err := cl.NewConsulClient(sConfig.ConsulServer.Addr, logger)

	if err != nil || client == nil {
		level.Error(logger).Log("msg", "NewConsulClient Error, exiting ...", "error", err)
		return
	}
```

# 本节重点总结 :

- 定义每个分片的服务
- 编写配置文件
- 配置文件解析的工作
- 命令行参数解析、读取配置文件、设置logger
- 初始化consul client

## 27.6 consul注册服务、抽象获取target的方法

# 本节重点介绍 :

- consul注册服务
  - 先获取服务，不存在再注册
  - 使用存活的节点初始化哈希环，避免因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉
- 抽象获取target的方法
  - 这些方法需要和配置文件中的服务名称对应上，通过AvaiableGetTargetFuncs这个map体现
- 定义ShardService结构体

# consul注册服务

## 先获取服务，不存在再注册

- watch/consul.go中
- 根据serviceName 获取存活的 实例ip列表

```go
// Service return a service
func (c *client) GetServiceNodes(service string) ([]string, error) {
	passingOnly := true
	addrs, _, err := c.consul.Health().Service(service, "", passingOnly, nil)
	if len(addrs) == 0 && err == nil {
		return nil, fmt.Errorf("service ( %s ) was not found", service)
	}

	if err != nil {
		return nil, err
	}
	var hs []string

	for _, a := range addrs {

		//hs = append(hs, fmt.Sprintf("%s:%d", a.Service.Address, a.Service.Port))
		hs = append(hs, a.Service.Address)
	}

	return hs, nil
}
```

# main.go中遍历配置中的分片服务，进行注册

- main.go
- aliveNodes如果存在说明，之前已经注册过了，属于本服务重启了
- 这时需要将aliveNodes赋值给nodes，因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉
- 如果没有aliveNodes，再进行注册

```go
	for _, i := range sConfig.ShardService {

		// 先获取service对应的nodes，用返回健康的node做哈希环注册，避免宕掉节点的发送

		aliveNodes, _ := client.GetServiceNodes(i.Name)
		if len(aliveNodes) > 0 {
			i.Nodes = aliveNodes
		} else {
			// 注册服务
			for _, n := range i.Nodes {
				n := n
				iport := strings.Split(n, ":")
				if len(iport) == 2 {
					n = iport[0]
				}
				err := client.ServiceRegister(i.Name, n, i.Port)
				if err != nil {
					level.Error(logger).Log("msg", "client.ServiceRegister.error", "error", err, "srvName", i.Name, "host", n, "port", i.Port)
					return
				}
			}
		}
}
```

## 同时要对配置中进行检查

- 约定name必须以 scrape_prometheus_开头
- 同时在代码中有 这个name对应的获取Target的方法

```go
		i := i
		if !strings.HasPrefix(i.Name, common.ScrapePromeJobPrefix) {
			level.Warn(logger).Log("msg", "ShardService.Name.invalid", "name", i.Name)
			continue
		}
		_, loaded := target.AvaiableGetTargetFuncs[i.Name]
		if !loaded {
			level.Warn(logger).Log("msg", "ShardService.Name.getTargetfunc.not.inplement", "name", i.Name)
			continue
		}
```

## 在common/const.go中添加const常量

```go
package common

const (
	ScrapePromeJobPrefix = "scrape_prometheus_"
)

```

# 抽象获取target的方法

- 每个服务都有对应的获取监控targets列表的方法
- 这个方法需要在代码中提前定义好
- 新建 target/target.go

```go
package target

import "prome-shard/common"

type ScrapeTarget struct {
	Targets []string          `json:"targets"`
	Labels  map[string]string `json:"labels"`
}

var (
	AvaiableGetTargetFuncs = map[string]GetTargetFunc{
		common.ScrapePromeJobPrefix + "node_exporter": GetTargetNodeExporter,
	}
)

type GetTargetFunc func() []ScrapeTarget

```

- 意思是可以有多个GetTargetFunc函数
- 他们的共同特点是都返回 []ScrapeTarget，就是待采集目标的切片
- 这些方法由使用者定义，可以是从公司内部的CMDB接口获取，也可以是其他地方
- 要求这些方法需要和配置文件中的服务名称对应上，通过AvaiableGetTargetFuncs这个map体现

## 比如我们定义一个node_exporter的方法

- 位置 target/node_exporter.go
- 这里mock一些测试的数据，真实的场景应该是去CMDB中获取
- 那么我们现在就可以在配置文件中指定 name = scrape_prometheus_node_exporter的 服务了

```go
package target

import "math/rand"

func GetTargetNodeExporter() []ScrapeTarget {

	nodes := []string{
		"172.20.70.205:9115",
		"http://prometheus.io",
		"http://www.baidu.com",
		"https://www.baidu.com",
		"https://github.com/",
	}
	randMapKeys := []string{"arch", "idc", "os", "jobname"}
	randMapValues := []string{"linux", "beijing", "centos", "arm64"}
	frn := func(n int) int {
		return rand.Intn(n)
	}

	targets := make([]ScrapeTarget, 0)
	for _, n := range nodes {
		num := len(randMapKeys)
		m := make(map[string]string, num)
		for i := 0; i < num; i++ {
			m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
		}
		t := ScrapeTarget{
			Targets: []string{n},
			Labels:  m,
		}
		targets = append(targets, t)
	}
	return targets
}

```

# 定义 ShardService结构体

- 位置 service/shard_service.go

```go
type ShardService struct {
	SrvName        string                 //服务名称
	ring           *consistent.Consistent //一致性哈希环
	DestSdFileName string                 // json文件在目标机器上的名字
	YamlPath       string                 // 执行的ansible playbook yaml
	Nodes          []string               //节点 
	Port           int                    //端口
	TargetGetFunc  target.GetTargetFunc   // 对应获取target的方法
	logger         log.Logger
	NodeUpdateChan chan []string // 节点变更的通知chan
	ctx            context.Context
	sync.RWMutex
}
```

### new方法 引入一致性哈希环

```go
func NewShardService(cg *config.ShardService, ctx context.Context, logger log.Logger) *ShardService {
	tf := target.AvaiableGetTargetFuncs[cg.Name]

	r := consistent.NewConsistent(common.Replicas)

	s := &ShardService{
		SrvName:        cg.Name,
		DestSdFileName: cg.DestSdFileName,
		YamlPath:       cg.YamlPath,
		ring:           r,
		Nodes:          cg.Nodes,
		Port:           cg.Port,
		ctx:            ctx,
		logger:         logger,
		TargetGetFunc:  tf,
		NodeUpdateChan: make(chan []string, 1),
	}

	s.SetNodes(cg.Nodes)

	return s
}
```

- 给shard_service绑定一个SetNodes方法，
- ```go
  func (ss *ShardService) SetNodes(nodes []string) {
  	ss.Lock()
  	defer ss.Unlock()
  	for _, n := range nodes {
  		ss.ring.Add(n)
  	}
  }

  ```
- 新建 consistent/consistent.go

```go
package consistent

import (
	"github.com/spaolacci/murmur3"
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

func (c *Consistent) Members() []string {
	c.RLock()
	defer c.RUnlock()
	var m []string
	for k := range c.members {
		m = append(m, k)
	}
	return m
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

```

## 在main中遍历中创建 ShardService对象

- 同时新建一个 服务名对应 它的更新chan的map
- 将 ShardService中的更新chan和它的名字塞入map中，用作后续通知使用

```go
srvNameChanMap := make(map[string]chan<- []string) //for 循环的上面

		shardService := service.NewShardService(i, ctxAll, logger)

		// 初始化consulwatch
		srvNameChanMap[i.Name] = shardService.NodeUpdateChan
```

# 本节重点总结 :

- consul注册服务
  - 先获取服务，不存在再注册
  - 使用存活的节点初始化哈希环，避免因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉
- 抽象获取target的方法
  - 这些方法需要和配置文件中的服务名称对应上，通过AvaiableGetTargetFuncs这个map体现
- 定义 ShardService结构体

## 27.7 开启一致性哈希环变更监听处理和consul-watch服务

# 本节重点介绍 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- consul中watch 服务中节点变化
  - 遍历所有的service和变更chan的map，开启watch

# 开启一致性哈希环变更监听处理

- 位置 service/shard_service.go
- 当这个服务的节点变更了(节点宕机、扩容)
- 通过consul的watch操作会通知到这里，也就是  this.NodeUpdateChan会有数据
- 这时需要从 哈希环中获取节点信息`oldNodes := this.ring.Members()`，然后两边对对比
- 如果节点不同则，更新哈希环`this.ReShardRing(nodes)`

```go
func (this *ShardService) RunReshardHashRing() {

	level.Info(this.logger).Log("msg", "RunRefreshServiceNode start....")
	for {
		select {
		case nodes := <-this.NodeUpdateChan:

			oldNodes := this.ring.Members()
			sort.Strings(nodes)
			sort.Strings(oldNodes)
			isEq := StringSliceEqualBCE(nodes, oldNodes)
			if isEq == false {
				level.Info(this.logger).Log("msg", "RunReshardHashRing_node_update_reshard", "old_num", len(oldNodes), "new_num", len(nodes), "oldnodes", strings.Join(oldNodes, ","), "newnodes", strings.Join(nodes, ","))
				this.ReShardRing(nodes)

			} else {
				level.Info(this.logger).Log("msg", "RunReshardHashRing_node_same", "nodes", strings.Join(nodes, ","))

			}
		case <-this.ctx.Done():
			level.Info(this.logger).Log("msg", "RunReshardHashRingQuit")
			return
		}

	}
}
```

## 两个string切片比较 的函数

```go
func StringSliceEqualBCE(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}

	if (a == nil) != (b == nil) {
		return false
	}

	b = b[:len(a)]
	for i, v := range a {
		if v != b[i] {
			return false
		}
	}

	return true
}
```

## reshard函数

```go
func (ss *ShardService) ReShardRing(nodes []string) {
	ss.Lock()
	defer ss.Unlock()
	newRing := consistent.NewConsistent(common.Replicas)
	for _, node := range nodes {
		newRing.Add(node)
	}
	ss.ring = newRing

}
```

## 在初始化完 ShardService后就开启上面的协程

- service/shard_service.go NewShardService函数中

```go
	s.SetNodes(cg.Nodes)
	// 开启一致性哈希环变更监听
	go s.RunReshardHashRing()
	return s
```

# consul中watch 服务中节点变化

- 位置 watch/consul.go WatchService方法
- 调用consul api的watch功能 ，对指定的srvName进行watch
- 并将变化的结果 塞入到nodeUpdateChan srvName对应的chan中

```go
func (c *client) WatchService(srvName string, nodeUpdateChan chan<- []string) error {

	watchConfig := make(map[string]interface{})

	watchConfig["type"] = "service"
	watchConfig["service"] = srvName
	watchConfig["handler_type"] = "script"
	watchConfig["passingonly"] = true
	watchPlan, err := watch.Parse(watchConfig)
	if err != nil {
		level.Error(c.logger).Log("msg", "create_Watch_by_watch_config_error", "srv_name", srvName, "error", err)
		return err

	}

	watchPlan.Handler = func(lastIndex uint64, result interface{}) {
		if entries, ok := result.([]*consul.ServiceEntry); ok {
			var hs []string

			for _, a := range entries {

				//hs = append(hs, fmt.Sprintf("%s:%d", a.Service.Address, a.Service.Port))
				hs = append(hs, a.Service.Address)
			}
			if len(hs) > 0 {
				level.Info(c.logger).Log("msg", "service_node_change_by_healthy_check", "srv_name", srvName, "num", len(hs), "detail", strings.Join(hs, " "))
				nodeUpdateChan <- hs
			}

		}

	}
	if err := watchPlan.Run(c.consulServerAddr); err != nil {
		level.Error(c.logger).Log("msg", "watchPlan_run_error", "srv_name", srvName, "error", err)
		return err
	}
	return nil

}

```

## 遍历所有的service和变更chan的map，开启watch

- 位置 watch/consul.go

```go
func (c *client) RunRefreshServiceNode(ctx context.Context, srvNameChanMap map[string]chan<- []string) error {
	level.Info(c.logger).Log("msg", "RunRefreshServiceNode start....")

	for srvName, upChan := range srvNameChanMap {
		srvName := srvName
		upChan := upChan
		go func() {
			c.WatchService(srvName, upChan)

		}()
	}

	select {
	case <-ctx.Done():
		level.Info(c.logger).Log("msg", "RunRefreshServiceNode_receive_quit_signal_and_quit")
		return nil
	}
}
```

## main中 使用 编排开启这个任务

- main.go中

```go
	{
		// WatchService   manager.
		g.Add(func() error {
			err := client.RunRefreshServiceNode(ctxAll, srvNameChanMap)
			if err != nil {
				level.Error(logger).Log("msg", "watchService_error", "error", err)
			}
			return err
		}, func(err error) {
			cancelAll()
		})
	}
```

## 同时 定义处理 信号的任务

```go
	var g run.Group
	{
		// Termination handler.
		term := make(chan os.Signal, 1)
		signal.Notify(term, os.Interrupt, syscall.SIGTERM)
		cancel := make(chan struct{})
		g.Add(

			func() error {
				select {
				case <-term:
					level.Warn(logger).Log("msg", "Received SIGTERM, exiting gracefully...")
					cancelAll()
					return nil
					//TODO clean work here
				case <-cancel:
					level.Warn(logger).Log("msg", "server finally exit...")
					return nil
				}
			},
			func(err error) {
				close(cancel)

			},
		)
	}
```

# 运行结果 3.201是后面启动的

```shell
level=info ts=2021-08-29T15:22:47.400+08:00 caller=main.go:83 msg="NewConsulClient successfully" addr=192.168.3.200:8500
ts=2021-08-29T15:22:47.457+08:00 caller=log.go:168 level=info msg="RunRefreshServiceNode start...."
level=info ts=2021-08-29T15:22:47.457+08:00 caller=consul.go:124 msg="RunRefreshServiceNode start...."
level=info ts=2021-08-29T15:22:47.459+08:00 caller=consul.go:108 msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=1 detai
l=192.168.3.200
ts=2021-08-29T15:22:47.459+08:00 caller=log.go:168 level=info msg=RunReshardHashRing_node_same nodes=192.168.3.200
level=info ts=2021-08-29T15:24:19.122+08:00 caller=consul.go:108 msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=2 detai
l="192.168.3.200 192.168.3.201"
ts=2021-08-29T15:24:19.122+08:00 caller=log.go:168 level=info msg=RunReshardHashRing_node_update_reshard old_num=1 new_num=2 oldnodes=192.168.3.200 newnodes=1
92.168.3.200,192.168.3.201

```

# 本节重点总结 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- consul中watch 服务中节点变化
  - 遍历所有的service和变更chan的map，开启watch

## 27.8 把target做一致性哈希进行分发

# 本节重点介绍 :

- 编写分发任务
  - 执行这个对应的获取target函数
  - 对target的地址 在哈希环中寻找节点
  - 然后根据node塞入map中
  - 然后写json文件

# 编写分发任务

- 位置 service/shard_service.go

```go
func (this *ShardService) Dispatch() {
	// 执行这个对应的获取target函数
	targets := this.TargetGetFunc()
	if len(targets) == 0 {
		level.Warn(this.logger).Log("msg", "Dispatch.empty.targets")
		return
	}
	// 先初始化一个map ，key是 节点，value是分配给这个节点的targets 
	nodeMap := make(map[string][]target.ScrapeTarget)

	// 遍历target，
	for _, t := range targets {
		t := t
		if len(t.Targets) != 1 {
			continue
		}
		// 对target的地址 在哈希环中寻找节点
		// 要求每个target的地址都是1个
		// 然后根据node塞入map中
		node := this.GetNode(t.Targets[0])

		preTs, loaded := nodeMap[node]
		if !loaded {
			preTs = make([]target.ScrapeTarget, 0)

		}
		preTs = append(preTs, t)
		nodeMap[node] = preTs

	}
	index := 1
	allNum := len(nodeMap)
	for node, ts := range nodeMap {
		// 拼接一个json文件的名字
		// 服务名_节点ip_索引_分片总数_target总数.json
		jsonFileName := fmt.Sprintf("%s_%s_%d_%d_%d.json",
			this.SrvName,
			node,
			index,
			allNum,
			len(ts),

		)
		// 写json文件
		writeJsonFile(jsonFileName, ts)

		extraVars := make(map[string]interface{})
		extraVars["src_sd_file_name"] = jsonFileName
		extraVars["dest_sd_file_name"] = this.DestSdFileName
		extraVars["service_port"] = this.Port
		level.Info(this.logger).Log(
			"msg", "goansiblerun.run",

			"this.SrvName", this.SrvName,
			"jsonFileName", jsonFileName,
			"node", node,
			"index", index,
			"all", allNum,
			"targetNum", len(ts),

		)
		go goansiblerun.AnsiRunPlay(this.logger, this.SrvName, node, extraVars, this.YamlPath)
		index++
	}

}
```

## 流程说明

- 先初始化一个map ，key是 节点，value是分配给这个节点的targets`nodeMap := make(map[string][]target.ScrapeTarget)`
- 执行这个对应的获取target函数`targets := this.TargetGetFunc()`
- 遍历target，
  - 对target的地址 在哈希环中寻找节点
  - 要求每个target的地址都是1个
  - 然后根据node塞入map中
- 代码如下

```go
	// 遍历target，
	for _, t := range targets {
		t := t
		if len(t.Targets) != 1 {
			continue
		}

		node := this.GetNode(t.Targets[0])

		preTs, loaded := nodeMap[node]
		if !loaded {
			preTs = make([]target.ScrapeTarget, 0)

		}
		preTs = append(preTs, t)
		nodeMap[node] = preTs

	}
```

- 然后遍历结果map，拼接json文件名，写json文件即可
- getNode
- ```go
  func (this *ShardService) GetNode(key string) string {
  	return this.ring.Get(key)

  }
  ```

## 外层ticker周期性的调用这个分发服务

- 每隔1分钟调用1次
- 这样能保证变更的target 最晚1分钟可以在监控中体现

```go
func (this *ShardService) RunDispatch() error {
	level.Info(this.logger).Log("msg", "RunDispatch.start", "name", this.SrvName)
	ticker := time.NewTicker(1 * time.Minute)
	this.Dispatch()
	defer ticker.Stop()
	for {
		select {
		case <-this.ctx.Done():
			level.Info(this.logger).Log("msg", "receive_quit_signal_and_quit")
			return nil
		case <-ticker.C:
			//level.Info(logger).Log("msg", "doIndexSync_run")
			this.Dispatch()
		}

	}
}

```

## main中在遍历创建shardService对象时，启动这份分发的周期任务

```go
for _, i := range sConfig.ShardService {
    ....
    go shardService.RunDispatch()
}

```

# 本节重点总结 :

- 两个均分任务的截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112218000/bf12d826ff0a45fb82aa5d586f42d26e.png)
- 仅有1个存活节点的截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112218000/5ed937981dec41b7af34fcf75c349295.png)
- 编写分发任务

  - 执行这个对应的获取target函数
  - 对target的地址 在哈希环中寻找节点
  - 然后根据node塞入map中
  - 然后写json文件

## 27.9 调用go-ansible执行playbook拷贝json文件重载采集器

# 本节重点介绍 :

- go-ansible执行playbook
- 编写分发重载的playbook
- 编译执行
  - 测试停掉一个节点
  - 测试停掉的节点再回来

# go-ansible执行playbook

- 新增 goansiblerun/run.go

```go
package goansiblerun

import (
	"context"
	"github.com/apenella/go-ansible/pkg/execute"
	"github.com/apenella/go-ansible/pkg/stdoutcallback/results"
	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"time"

	"github.com/apenella/go-ansible/pkg/options"
	"github.com/apenella/go-ansible/pkg/playbook"
)

func AnsiRunPlay(logger log.Logger, srvName string, remoteHost string, extraVars map[string]interface{}, ansiYamlPath string) {
	ansiblePlaybookConnectionOptions := &options.AnsibleConnectionOptions{
		Connection: "smart",
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(10)*time.Second)
	defer cancel()
	ansiblePlaybookOptions := &playbook.AnsiblePlaybookOptions{
		Inventory: remoteHost + ",",
		ExtraVars: extraVars,
	}

	lplaybook := &playbook.AnsiblePlaybookCmd{
		Playbooks:         []string{ansiYamlPath},
		ConnectionOptions: ansiblePlaybookConnectionOptions,
		Options:           ansiblePlaybookOptions,
		Exec: execute.NewDefaultExecute(
			execute.WithTransformers(
				results.Prepend("Go-ansible example"),
			),
		),
		//StdoutCallback: "json",
	}

	err := lplaybook.Run(ctx)
	if err != nil {
		level.Error(logger).Log("msg", "create_Watch_by_watch_config_error", "srv_name", srvName, "host", remoteHost, "error", err)

	}
}

```

## 解读一下

- 使用 https://github.com/apenella/go-ansible
- ansiYamlPath代表要执行那个playbook
- extraVars代表 playbook中的外部参数
- Inventory代表 执行的host
- 每个执行 设置10秒的超时时间

```go
ctx, cancel := context.WithTimeout(context.Background(), time.Duration(10)*time.Second)
```

## 在Dispatch分发的时候调用ansible playbook

- 位置 service/shard_service.go
- 将配置中的 src_sd_file_name，dest_sd_file_name，yaml_path等参数传入playbook

```go
	for node, ts := range nodeMap {
		// 拼接一个json文件的名字
		// 服务名_节点ip_索引_分片总数_target总数.json
		jsonFileName := fmt.Sprintf("%s_%s_%d_%d_%d.json",
			this.SrvName,
			node,
			index,
			allNum,
			len(ts),

		)
		// 写json文件
		writeJsonFile(jsonFileName, ts)

		extraVars := make(map[string]interface{})
		extraVars["src_sd_file_name"] = jsonFileName
		extraVars["dest_sd_file_name"] = this.DestSdFileName
		extraVars["service_port"] = this.Port
		level.Info(this.logger).Log(
			"msg", "goansiblerun.run",

			"this.SrvName", this.SrvName,
			"jsonFileName", jsonFileName,
			"node", node,
			"index", index,
			"all", allNum,
			"targetNum", len(ts),

		)
		go goansiblerun.AnsiRunPlay(this.logger, this.SrvName, node, extraVars, this.YamlPath)
		index++
	}

```

# 编写分发重载的playbook

- yaml名字 copy_file_and_reload_prome.yaml
- 先将本地的json文件copy到目标机器上
- 目标目录为 /opt/app/prometheus/sd
- 然后给prometheus采集器发送reload命令

```yaml
- name:  copy_file_and_reload
  hosts: all
  user: root
  gather_facts:  false
  vars:
      target_path: /opt/app/prometheus/sd
  tasks:
      - name: copy target file
        copy:
          src: '{{ item.src }}'
          dest: '{{ item.dest }}'
          owner: root
          group: root
          mode: 0644
          force: true
        with_items:
          - { src: './{{ src_sd_file_name }}', dest: '{{ target_path }}/{{ dest_sd_file_name }}' }

      - name: reload_service
        shell: /usr/bin/curl -X POST http://localhost:{{ service_port }}/-/reload &

```

# prometheus上的配置

- 将blackbox_http改造为管控的

```yaml
  - job_name: 'blackbox-http-shard'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    file_sd_configs:
      - files:
          - /opt/app/prometheus/sd/file_sd_by_prome_shared.json
        refresh_interval: 2m
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 172.20.70.205:9115  # The blackbox exporter's real hostname:port.

```

# 编译执行

## 正常执行两个节点均分

```shell
level=info ts=2021-08-26T19:08:09.770+08:00 caller=shard_service.go:103 msg="RunRefreshServiceNode start...."
level=info ts=2021-08-26T19:08:09.771+08:00 caller=shard_service.go:198 msg=RunDispatch.start name=scrape_prometheus_node_exporter
ts=2021-08-26T19:08:09.771+08:00 caller=log.go:124 level=info msg="RunRefreshServiceNode start...."
<nil>
level=info ts=2021-08-26T19:08:09.772+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json node=172.20.70.215 index=1 all=2 targetNum=2
<nil>
level=info ts=2021-08-26T19:08:09.773+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json node=172.20.70.205 index=2 all=2 targetNum=3
ts=2021-08-26T19:08:09.774+08:00 caller=log.go:124 level=info msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=2 detail="172.20.70.205 172.20.70.215"
level=info ts=2021-08-26T19:08:09.774+08:00 caller=shard_service.go:119 msg=RunReshardHashRing_node_same nodes=172.20.70.205,172.20.70.215
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── ok: [172.20.70.205] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
prome-shard ── ok: [172.20.70.215] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
[WARNING]: Consider using the get_url or uri module rather than running 'curl'.  If you need to use
command because get_url or uri is insufficient you can add 'warn: false' to this command task or set
'command_warnings=False' in ansible.cfg to get rid of this message.
prome-shard ── changed: [172.20.70.215]
prome-shard ── 
prome-shard ── PLAY RECAP ************************************************************************************************
prome-shard ── 172.20.70.215              : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
prome-shard ── 
[WARNING]: Consider using the get_url or uri module rather than running 'curl'.  If you need to use
command because get_url or uri is insufficient you can add 'warn: false' to this command task or set
'command_warnings=False' in ansible.cfg to get rid of this message.
prome-shard ── changed: [172.20.70.205]
prome-shard ── 
prome-shard ── PLAY RECAP ************************************************************************************************
prome-shard ── 172.20.70.205              : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
prome-shard ── 
```

## 停掉其中一个节点，全部分配给存活的节点

```shell

ts=2021-08-26T19:09:56.422+08:00 caller=log.go:124 level=info msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=1 detail=172.20.70.215
level=info ts=2021-08-26T19:09:56.423+08:00 caller=shard_service.go:114 msg=RunReshardHashRing_node_update_reshard old_num=2 new_num=1 oldnodes=172.20.70.205,172.20.70.215 newnodes=172.20.70.215
<nil>
level=info ts=2021-08-26T19:09:56.424+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.215_1_1_5.json node=172.20.70.215 index=1 all=1 targetNum=5
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── changed: [172.20.70.215] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.215_1_1_5.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
[WARNING]: Consider using the get_url or uri module rather than running 'curl'.  If you need to use
command because get_url or uri is insufficient you can add 'warn: false' to this command task or set
prome-shard ── changed: [172.20.70.215]
'command_warnings=False' in ansible.cfg to get rid of this message.
prome-shard ── 
prome-shard ── PLAY RECAP ************************************************************************************************
prome-shard ── 172.20.70.215              : ok=2    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

## 再启动节点，又再均分

```shell

ts=2021-08-26T19:11:06.439+08:00 caller=log.go:124 level=info msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=2 detail="172.20.70.205 172.20.70.215"
level=info ts=2021-08-26T19:11:06.440+08:00 caller=shard_service.go:114 msg=RunReshardHashRing_node_update_reshard old_num=1 new_num=2 oldnodes=172.20.70.215 newnodes=172.20.70.205,172.20.70.215
<nil>
level=info ts=2021-08-26T19:11:06.441+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json node=172.20.70.215 index=1 all=2 targetNum=2
<nil>
level=info ts=2021-08-26T19:11:06.441+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json node=172.20.70.205 index=2 all=2 targetNum=3
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── changed: [172.20.70.215] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
prome-shard ── changed: [172.20.70.205] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json'})
prome-shard ── 
```

# 效果图

- target页面
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/b9ce8b9a032e4b9fbbe89e7b5eec794f.png)
- 感知到节点变化的shard日志
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/0c849ec9517f4730901dd323fe794120.png)
- ansible的日志
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/1f1bdd8f9be9486f9c12accd332f7eaa.png)
- consul的服务截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/e69020bf38584836bbc16b2128615596.png)

# 回顾一下架构图

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111890000/b21b8e5851d347169f9f614b28aa7773.png)

# 本节重点总结 :

- go-ansible执行playbook
- 编写分发重载的playbook
- 编译执行
  - 测试停掉一个节点
  - 测试停掉的节点再回来

