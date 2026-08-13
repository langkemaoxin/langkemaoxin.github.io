---
title: "32.1 prometheus倒排索引源码解析"
sidebarGroup: "Prometheus"
shortTitle: "92 32.1 prometheus倒排索引源码解..."
order: 92
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 倒排索引源码解析 - 创建索引的过程 - 查找索引的过程 - 优化工作 - seriesId求交集的优化 - 锁的粒度的优化 从promql查询看匹配过程 - 如下面的promq..."
---

> **Prometheus · 第 92 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- 倒排索引源码解析
    - 创建索引的过程
    - 查找索引的过程
- 优化工作
    - seriesId求交集的优化
    - 锁的粒度的优化

# 从promql查询看匹配过程
- 如下面的promql
```shell script
node_cpu_seconds_total{mode=~"user|system",cpu="0"} 
```
- 解读一下，名称为 node_cpu_seconds_total，我们知道prometheus中 指标的名称也是一个标签为 `__name__`
- 上面的查询语句可以转化为下面的匹配条件
```shell script
__name__ 为 node_cpu_seconds_total
cpu 为0 
mode 为  user或者 system 
```

## 标签组的唯一组合是一个series，对应唯一的seriesId
- 上面的查询结果匹配到两个结果
- 那么这两个结果的seriesId不同，即只要有一个标签的值不一样就会产生新的seriesId
```shell script
node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="system"}
5870.66
node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7224.39

```

# 为了支持模糊匹配等复杂查询要求prometheus 引入倒排索引来解决

# 倒排索引简介
- 倒排索引（英文：Inverted Index），是一种索引方法，常被用于全文检索系统中的一种单词文档映射结构
- 现代搜索引擎绝大多数的索引都是基于倒排索引来进行构建的
- 这源于在实际应用当中，用户在使用搜索引擎查找信息时往往只输入信息中的某个属性关键字，如一些用户不记得歌名，会输入歌词来查找歌名；输入某个节目内容片段来查找该节目等等

##  倒排索引核心数据结构
- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\index\postings.go
```go
type MemPostings struct {
	mtx     sync.RWMutex
	m       map[string]map[string][]uint64
	ordered bool
}
```
### 数据结构解读
- 核心结构MemPostings是一个双层map 
- 第一层map的key 是标签的名字 ，如 instance或者 job
- 第一层map的value是一个map
- 第二层map的key 是标签的值，如node_exporter 
- 第二层map的value 是对应seriesId 的数组，如1,2,3 
 
## 创建索引的过程
- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\head.go
```go
func (h *Head) getOrCreate(hash uint64, lset labels.Labels) (*memSeries, bool, error) {
	// Just using `getOrCreateWithID` below would be semantically sufficient, but we'd create
	// a new series on every sample inserted via Add(), which causes allocations
	// and makes our series IDs rather random and harder to compress in postings.
	s := h.series.getByHash(hash, lset)
	if s != nil {
		return s, false, nil
	}

	// Optimistically assume that we are the first one to create the series.
	id := h.lastSeriesID.Inc()

	return h.getOrCreateWithID(id, hash, lset)
}
```
- 通过h.lastSeriesID.Inc()递增获取seriesId，然后调用  getOrCreateWithID函数

### getOrCreateWithID函数调用 posting.Add函数
- D:\go_path\src\github.com\prometheus\prometheus\tsdb\index\postings.go
```go
func (p *MemPostings) Add(id uint64, lset labels.Labels) {
	p.mtx.Lock()

	for _, l := range lset {
		p.addFor(id, l)
	}
	p.addFor(id, allPostingsKey)

	p.mtx.Unlock()
}

```
- 遍历所有的标签组，调用addFor函数

### addFor函数
- D:\go_path\src\github.com\prometheus\prometheus\tsdb\index\postings.go
```go
func (p *MemPostings) addFor(id uint64, l labels.Label) {
	nm, ok := p.m[l.Name]
	if !ok {
		nm = map[string][]uint64{}
		p.m[l.Name] = nm
	}
	list := append(nm[l.Value], id)
	nm[l.Value] = list

	if !p.ordered {
		return
	}
	// There is no guarantee that no higher ID was inserted before as they may
	// be generated independently before adding them to postings.
	// We repair order violations on insert. The invariant is that the first n-1
	// items in the list are already sorted.
	for i := len(list) - 1; i >= 1; i-- {
		if list[i] >= list[i-1] {
			break
		}
		list[i], list[i-1] = list[i-1], list[i]
	}
}
```
- 先用l.Name在倒排索引的获取第第二层的map nm，
- 如果没获取到则创建一个
- 然后将seriesId添加到这个nm中 的set中
- 然后将seriesId的切片排序

## 创建索引的举例
- 假设这个 `node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="system"}` 的 seriesId=10
- 假设这个 `node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="user"}` 的 seriesId=11
- 更新双层map示意过程如下
```shell script
MemPostings.m["__name__"]["node_cpu_seconds_total"]={..,10,..}
MemPostings.m["mode"]["system"]={..,10,..}
MemPostings.m["cpu"]["0"]={..,10,..}
MemPostings.m["instance"]["172.20.70.215:9100"]={..,10,..}

MemPostings.m["__name__"]["node_cpu_seconds_total"]={..,10,11,..}
MemPostings.m["mode"]["user"]={..,11,..}
MemPostings.m["cpu"]["0"]={..,10,11,..}
MemPostings.m["instance"]["172.20.70.215:9100"]={..,10,11,..}

```

## 查询索引的过程  
- `node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="user"}`
- 查询指标的名字 
```shell script
MemPostings.m["__name__"]["node_cpu_seconds_total"]={1,2,3,5,7,8,10,11}
```

- 查询 instance="172.20.70.215:9100"
```shell script
MemPostings.m["instance"]["172.20.70.215:9100"]={1,2,3,5,7,8,10,11}
```
- 查询 mode=user
```shell script
MemPostings.m["mode"]["user"]={8,9,11}
```

- 查询 cpu=0
```shell script
MemPostings.m["mode"]["user"]={10,11,12}
```
- 匹配过程就是这几个集合求交集
```shell script
{1,2,3,5,7,8,10,11} 
{1,2,3,5,7,8,10,11}
{8,9,11}
{10,11,12}
```
- 结果就是id=11 也就是  `node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="user"}`

## id求交集的优化
- 但是如果每个label pair包含的`series`足够多，那么对多个label pair的`series`做交集也将是非常耗时的操作。
- 那么能不能进一步优化呢？事实上，只要保持每个label pair里包含的series有序就可以了，这样就能将复杂度从指数级瞬间下降到线性级
```shell script
MemPostings.["__name__"]["http_request_total"]{1, 2, 3, 4}
MemPostings.["path"]["/"]{1, 3, 4, 5}
{1, 2, 3, 4} x {1, 3, 4, 5} -> {1, 3, 4}
```

## 锁的粒度的优化
- golang中的map不是并发安全的，而Prometheus中又有大量对于`memSeries`的增删操作，如果在读写上述结构时简单地用一把大锁锁住，显然无法满足性能要求
- prometheus的解决方法就是拆分锁，代码位置  D:\go_path\src\github.com\prometheus\prometheus\tsdb\head.go
```go
const (
	// DefaultStripeSize is the default number of entries to allocate in the stripeSeries hash map.
	DefaultStripeSize = 1 << 14
)

// stripeSeries locks modulo ranges of IDs and hashes to reduce lock contention.
// The locks are padded to not be on the same cache line. Filling the padded space
// with the maps was profiled to be slower – likely due to the additional pointer
// dereferences.
type stripeSeries struct {
	size                    int
	series                  []map[uint64]*memSeries
	hashes                  []seriesHashmap
	locks                   []stripeLock
	seriesLifecycleCallback SeriesLifecycleCallback
}

type stripeLock struct {
	sync.RWMutex
	// Padding to avoid multiple locks being on the same cache line.
	_ [40]byte
}

```

- 初始化head的时候 生成16384个小哈希表，如果想根据ref找到`memSeries`只需要把`ref`对16384取模找到对应的series[x]，只需要lock[x]，从而大大降低了读写`memSeries`时对锁的抢占造成的消耗，提升读写吞吐量
```go
func (s *stripeSeries) getByHash(hash uint64, lset labels.Labels) *memSeries {
    i := hash & uint64(s.size-1)
    
    s.locks[i].RLock()
    series := s.hashes[i].get(hash, lset)
    s.locks[i].RUnlock()
    
    return series
}
```
- 注意看这里 取模的操作使用的是&而不是% 这是因为位运算(&)效率要比取模运算(%)高很多，主要原因是位运算直接对内存数据进行操作，不需要转成十进制，因此处理速度非常快
```shell script
a % b == a & (b - 1) 前提：b 为 2^n
```

# 本节重点总结 :
- 倒排索引源码解析
    - 创建索引的过程
    - 查找索引的过程
- 优化工作
    - seriesId求交集的优化
    - 锁的粒度的优化

