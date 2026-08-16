---
title: Prometheus 第32章：TSDB 索引与 Compact
sidebarGroup: 可观测性
shortTitle: 44 TSDB 索引与 Compact
order: 44
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第32章（TSDB 索引与 Compact）合并笔记
---

> **Prometheus · 第 32 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 32.1 prometheus倒排索引源码解析

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

## 32.2 prometheus倒排索引统计功能

# 本节重点介绍 :

- 获取采集端的高基数metrics的tsdb页面解析
- tsdb统计函数Stats源码解读
  - 依赖倒排索引统计

# 获取采集端的高基数metrics

## tsdb页面解析

- Top 10 label names with value count： 标签中value最多的10个
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722019000/aae659a012fa4a46bee0ae8a4d5dc5e1.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722019000/6d2de254d75842daba9622ae0e6adb13.png)
- Top 10 series count by metric names： metric_name匹配的series最多的10个
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722019000/7e772d680ef040288f7aef421108e220.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722019000/156ce5a827074a89bc3ee5fbcd371a70.png)
- Top 10 label names with high memory usage： 标签消耗内存最多的10个
- Top 10 series count by label value pairs： 标签对数量最多的10个
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722019000/258021deaba1457cbac2f46c819b86ec.png)

# 核心源码解读

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\index\postings.go

## web侧调用入口

- api /api/v1/status/tsdb
- 代码位置  D:\go_path\src\github.com\prometheus\prometheus\web\api\v1\api.go

```go
func (api *API) serveTSDBStatus(*http.Request) apiFuncResult {
	s, err := api.db.Stats("__name__")
	if err != nil {
		return apiFuncResult{nil, &apiError{errorInternal, err}, nil, nil}
	}
	metrics, err := api.gatherer.Gather()
	if err != nil {
		return apiFuncResult{nil, &apiError{errorInternal, fmt.Errorf("error gathering runtime status: %s", err)}, nil, nil}
	}
	chunkCount := int64(math.NaN())
	for _, mF := range metrics {
		if *mF.Name == "prometheus_tsdb_head_chunks" {
			m := *mF.Metric[0]
			if m.Gauge != nil {
				chunkCount = int64(m.Gauge.GetValue())
				break
			}
		}
	}
	return apiFuncResult{tsdbStatus{
		HeadStats: HeadStats{
			NumSeries:     s.NumSeries,
			ChunkCount:    chunkCount,
			MinTime:       s.MinTime,
			MaxTime:       s.MaxTime,
			NumLabelPairs: s.IndexPostingStats.NumLabelPairs,
		},
		SeriesCountByMetricName:     convertStats(s.IndexPostingStats.CardinalityMetricsStats),
		LabelValueCountByLabelName:  convertStats(s.IndexPostingStats.CardinalityLabelStats),
		MemoryInBytesByLabelName:    convertStats(s.IndexPostingStats.LabelValueStats),
		SeriesCountByLabelValuePair: convertStats(s.IndexPostingStats.LabelValuePairsStats),
	}, nil, nil, nil}
}

```

### 底层调用的是 tsdb的Stats函数，传入__name__标签

## tsdb 统计函数 Stats

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\index\postings.go

### 初始最大堆用作统计

```go
	metrics := &maxHeap{}
	labels := &maxHeap{}
	labelValueLength := &maxHeap{}
	labelValuePairs := &maxHeap{}
	numLabelPairs := 0

	metrics.init(maxNumOfRecords)
	labels.init(maxNumOfRecords)
	labelValueLength.init(maxNumOfRecords)
	labelValuePairs.init(maxNumOfRecords)

```

### 遍历双层map 获取 标签中value最多的10个

- 把所有非空的标签算入统计 labels，值是e中id-set的长度
- labels这个 最大堆统计的就是 Top 10 label names with value count，代表 标签中value最多的10个

```go
	for n, e := range p.m {
		if n == "" {
			continue
		}
		labels.push(Stat{Name: n, Count: uint64(len(e))})
	}

```

### 遍历双层map 获取 标签中value最多的10个

- 遍历内层的map，如果name和传入的label一致，则加入metrics最大堆统计
- metrics这个 最大堆统计的就是 Top 10 series count by metric names： metric_name匹配的series最多的10个

```go
	for n, e := range p.m {
        ...
		size = 0
		for name, values := range e {
			if n == label {
				metrics.push(Stat{Name: name, Count: uint64(len(values))})
			}
		}
	}
```

### 遍历双层map 获取 标签对数量最多的10个

- 遍历内层的map，把name=value做统计算入labelValuePairs最大堆统计
- labelValuePairs这个 最大堆统计的就是Top 10 series count by label value pairs： 标签对数量最多的10个

```go
	for n, e := range p.m {
        ...

		for name, values := range e {
            labelValuePairs.push(Stat{Name: n + "=" + name, Count: uint64(len(values))})
		}
	}
```

### 遍历双层map 获取 标签消耗内存最多的10个

- 遍历内层的map，计算标签的value字符串长度 size，推入labelValueLength 最大堆统计
- labelValueLength这个 最大堆统计的就是Top 10 label names with high memory usage： 标签消耗内存最多的10个

```go
	for n, e := range p.m {
		if n == "" {
			continue
		}
		size = 0
		for name, values := range e {
			size += uint64(len(name))
		}
		labelValueLength.push(Stat{Name: n, Count: size})
	}
```

## get方法获取最大堆的结果

- D:\go_path\src\github.com\prometheus\prometheus\tsdb\index\postingsstats.go

```go
func (m *maxHeap) get() []Stat {
	sort.Slice(m.Items, func(i, j int) bool {
		return m.Items[i].Count > m.Items[j].Count
	})
	return m.Items
}

```

# 本节重点介绍 :

- 获取采集端的高基数metrics的tsdb页面解析
- tsdb统计函数Stats源码解读
  - 依赖倒排索引统计
  - 是基于内存中的倒排索引 算最大堆取 top10

## 32.3 mmap的在io提速上的应用和prometheus的应用

# 本节重点总结 :

- mmap的在io提速上的应用
- prometheus 中mmap的应用

# mmap = 减少copy次数

## 传统IO

- 在开始谈零拷贝之前，首先要对传统的IO方式有一个概念。
- 基于传统的IO方式，底层实际上通过调用`read()`和`write()`来实现。
- 通过`read()`把数据从硬盘读取到内核缓冲区，再复制到用户缓冲区；然后再通过`write()`写入到socket缓冲区，最后写入网卡设备。

![mmap_01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722045000/b461f4a1866643b4b95624e3d2b85715.png)

- 用户空间指的就是用户进程的运行空间，内核空间就是内核的运行空间。
- 如果进程运行在内核空间就是内核态，运行在用户空间就是用户态。
- 为了安全起见，他们之间是互相隔离的，而在用户态和内核态之间的上下文切换也是比较耗时的。
- 从上面我们可以看到，一次简单的IO过程产生了4次上下文切换，这个无疑在高并发场景下会对性能产生较大的影响。

## dma拷贝

> 那么什么又是DMA拷贝呢？

- 因为对于一个IO操作而言，都是通过CPU发出对应的指令来完成，但是相比CPU来说，IO的速度太慢了，CPU有大量的时间处于等待IO的状态。
- 因此就产生了DMA（Direct Memory Access）直接内存访问技术，本质上来说他就是一块主板上独立的芯片，通过它来进行内存和IO设备的数据传输，从而减少CPU的等待时间。
- 但是无论谁来拷贝，频繁的拷贝耗时也是对性能的影响。

## 零拷贝

- 零拷贝技术是指计算机执行操作时，CPU不需要先将数据从某处内存复制到另一个特定区域，这种技术通常用于通过网络传输文件时节省CPU周期和内存带宽。
- 那么对于零拷贝而言，并非真的是完全没有数据拷贝的过程，只不过是减少用户态和内核态的切换次数以及CPU拷贝的次数。

## mmap+write

- mmap+write简单来说就是使用mmap替换了read+write中的read操作，减少了一次CPU的拷贝。
- mmap主要实现方式是将读缓冲区的地址和用户缓冲区的地址进行映射，内核缓冲区和应用缓冲区共享，从而减少了从读缓冲区到用户缓冲区的一次CPU拷贝。
- mmap的方式节省了一次CPU拷贝，同时由于用户进程中的内存是虚拟的，只是映射到内核的读缓冲区，所以可以节省一半的内存空间，比较适合大文件的传输![mmap_02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722045000/d303ba82fa4443b6b66989566820bf74.png)

## sendfile

- 相比mmap来说，sendfile同样减少了一次CPU拷贝，而且还减少了2次上下文切换。
- sendfile是Linux2.1内核版本后引入的一个系统调用函数，通过使用sendfile数据可以直接在内核空间进行传输，因此避免了用户空间和内核空间的拷贝，同时由于使用sendfile替代了read+write从而节省了一次系统调用，也就是2次上下文切换。
- sendfile方法IO数据对用户空间完全不可见，所以只能适用于完全不需要用户空间处理的情况，比如静态文件服务器。![mmap_03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722045000/0b1825a42e9b42958f628ed172fb3bb4.png)

## sendfile+DMA Scatter/Gather

- Linux2.4内核版本之后对sendfile做了进一步优化，通过引入新的硬件支持，这个方式叫做DMA Scatter/Gather 分散/收集功能。
- 它将读缓冲区中的数据描述信息--内存地址和偏移量记录到socket缓冲区，由 DMA 根据这些将数据从读缓冲区拷贝到网卡，相比之前版本减少了一次CPU拷贝的过程
- DMA gather和sendfile一样数据对用户空间不可见，而且需要硬件支持，同时输入文件描述符只能是文件，但是过程中完全没有CPU拷贝过程，极大提升了性能。![mmap_04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722045000/685cb43d658746f993c0c03ace042773.png)

# prometheus 中mmap的应用

- 跨平台调用mmap![mmap.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722045000/4afe5024a043463c889328fbeda2a04a.png)
- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\fileutil\mmap_unix.go
- 使用系统调用打开mmap

```go
func mmap(f *os.File, length int) ([]byte, error) {
	return unix.Mmap(int(f.Fd()), 0, length, unix.PROT_READ, unix.MAP_SHARED)
}
```

## 应用总结

- prometheus使用mmap读取压缩合并后的大文件（不占用太多句柄），建立进程虚拟地址和文件偏移的映射关系，只有在查询读取对应的位置时才将数据真正读到物理内存
- 绕过文件系统page cache，减少了一次数据拷贝
- 查询结束后，对应内存由Linux系统根据内存压力情况自动进行回收，在回收之前可用于下一次查询命中
- 因此使用mmap自动管理查询所需的的内存缓存，具有管理简单，处理高效的优势。

# 本节重点总结 :

- 由于CPU和IO速度的差异问题，产生了DMA技术，通过DMA搬运来减少CPU的等待时间。
- 传统的IOread+write方式会产生2次DMA拷贝+2次CPU拷贝，同时有4次上下文切换。
- 而通过mmap+write方式则产生2次DMA拷贝+1次CPU拷贝，4次上下文切换，通过内存映射减少了一次CPU拷贝，可以减少内存使用，适合大文件的传输。
- sendfile方式是新增的一个系统调用函数，产生2次DMA拷贝+1次CPU拷贝，但是只有2次上下文切换。因为只有一次调用，减少了上下文的切换，但是用户空间对IO数据不可见，适用于静态文件服务器。
- sendfile+DMA gather方式产生2次DMA拷贝，没有CPU拷贝，而且也只有2次上下文切换。虽然极大地提升了性能，但是需要依赖新的硬件设备支持。

## 32.4 prometheus存储磁盘数据结构和存储参数

# 本节重点介绍 :

- prometheus存储磁盘数据结构介绍
  - index
  - chunks
  - head chunks
  - Tombstones
  - wal
- prometheus对block进行定时压实 compact
- prometheus 查看支持的存储参数

# prometheus存储示意图

![prome_tsdb_01.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/cdea5bcc1fc44e258dcc6ba99bcfd3aa.jpg)

# 内存和disk之间的纽带 wal

- WAL目录中包含了多个连续编号的且大小为128M的文件，Prometheus称这样的文件为Segment，其中存放的就是对内存中series以及sample数据的备份。
- 另外还包含一个以checkpoint为前缀的子目录，由于内存中的时序数据经常会做持久化处理，WAL中的数据也将因此出现冗余
- 所以每次在对内存数据进行持久化之后，Prometheus都会对部分编号靠后的Segment进行清理。但是我们并没有办法做到恰好将已经持久化的数据从Segment中剔除，也就是说被删除的Segment中部分的数据依然可能是有用的。所以在清理Segment时，我们会将肯定无效的数据删除，剩下的数据就存放在checkpoint中。而在Prometheus重启时，应该首先加载checkpoint中的内容，再按序加载各个Segment的内容。
- 最后，series和samples以Record的形式被批量写入Segment文件中，默认当Segment超过128M时，会创建新的Segment文件。若Prometheus因为各种原因崩溃了，WAL里的各个Segment以及checkpoint里的内容就是在崩溃时刻Prometheus内存的映像。Prometheus在重启时只要加载WAL中的内容就能完全"恢复现场"。

# 磁盘数据结构

## promethues 磁盘数据结构

![prome_tsdb_disk_01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/4666e321c4384d1fb1d7f475879ab285.png)

![prome_tsdb_disk_02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/6400f9031f894aee8d0449930e702203.png)

### Index Disk Format

- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/index.md

### Chunks

- 下面介绍块文件的格式，该文件在chunks/块目录中创建。每个段文件的最大大小为512MiB。
- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/chunks.md

### head chunks

- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/head_chunks.md

### Tombstones

- prometheus 删除数据`/admin/tsdb/delete_series`
- tombstones用于存储对于series的删除记录。如果删除了某个时间序列，Prometheus并不会立即对它进行清理，而是会在tombstones做一次记录，等到下一次Block压缩合并的时候统一清理。![prome_tsdb_disk_tombstone.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/8ca08eb7713a4c28963ebc64fe8527d1.png)
- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/tombstones.md

### wal

- 文档地址  https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/wal.md![prome_tsdb_disk_series.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/e6271d5a00744636b53911268e59cf2f.png)
- ![prome_tsdb_disk_sample.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/8dac04ca148947fcafaa75d7212eb69c.png)
- 该预写日志在编号和顺序，如段工作000000，000001，000002等，在默认情况下被限制为128MB
- 段写入到32KB的页面中。仅最近段的最后一页可能是不完整的
- WAL记录是一个不透明的字节片，如果超过当前页面的剩余空间，它将被分成子记录。记录永远不会跨段边界拆分
- 如果单个记录超过了默认的段大小，则将创建一个更大的段。页面的编码很大程度上是从LevelDB / RocksDB的预写日志中借用的。

# prometheus对block进行定时压实 compact

> 压实的作用

- 标记删除
- Compaction主要操作包括合并block、删除过期数据、重构chunk数据
- 其中合并多个block成为更大的block，可以有效减少block个数，当查询覆盖的时间范围较长时，避免需要合并很多block的查询结果。
- 为提高删除效率，删除时序数据时，会记录删除的位置，只有block所有数据都需要删除时，才将block整个目录删除，因此block合并的大小也需要进行限制，

# 访问prometheus flags api 查看支持的存储参数

| 参数名                                 | 含义                                                                                                                                                                                                              | 默认值                   | 说明                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------ |
| storage.remote.flush-deadline          | 在关闭或配置重新加载时等待存储刷盘的时间                                                                                                                                                                          | 1分钟                    | 可以依据数据量调整             |
| storage.remote.read-concurrent-limit   | 远程读取调用的并发qps， 0表示没有限制。                                                                                                                                                                           | 10                       | 保护后端存储，避免被高并发打垮 |
| storage.remote.read-max-bytes-in-frame | 远程读取流中，在解码数据前，单个帧中的最大字节数。请注意，客户端也可能会限制帧大小。默认为protobuf建议的1MB。                                                                                                     | 1M                       | 保护后端存储，避免被高并发打垮 |
| storage.remote.read-sample-limit       | 在单个查询中要通过远程读取接口返回的最大样本总数。 0表示没有限制。对于流式响应类型，将忽略此限制。                                                                                                                | 10                       | 保护后端存储，避免被高并发打垮 |
| storage.tsdb.allow-overlapping-blocks  | 允许重叠的块，从而启用垂直压缩和垂直查询合并                                                                                                                                                                      | false                    |                                |
| storage.tsdb.max-block-duration        | 压实块的时间范围上限 用于测试。                                                                                                                                                                                   | （默认为保留期的10％。） |                                |
| storage.tsdb.min-block-duration        | 数据块在保留之前的最小持续时间。用于测试。                                                                                                                                                                        |                          |                                |
| storage.tsdb.no-lockfile               | 不要在数据目录中创建锁文件。                                                                                                                                                                                      | false                    |                                |
| storage.tsdb.path                      | 数据目录path                                                                                                                                                                                                      | 默认为进程运行目录的data |                                |
| storage.tsdb.retention.time            | 保存样品的时间。当设置此标志时，它将覆盖“storage.tsdb.retention”。如果既没有这个标志，也没有“storage.tsdb”。保留”也不“storage.tsdb.retention。设置大小，保留时间默 认为15d。支持单位:y, w, d, h, m, s, ms。 | 保留时间默 认为15d       |                                |
| storage.tsdb.retention.size            | 大小[实验]块可以存储的最大字节数。需要一个单位，支持单位:B, KB, MB, GB, TB, PB, EB。例:“512 mb”。这个标志是实验性的，可以在以后的版本中更改                                                                     |                          |                                |
| storage.tsdb.wal-compression           | 开启wal snappy压缩                                                                                                                                                                                                | true                     |                                |
| storage.tsdb.wal-segment-size          | wal文件大小                                                                                                                                                                                                       | 默认128M                 |                                |

# 本节重点总结 :

- prometheus存储磁盘数据结构介绍
  - index
  - chunks
  - head chunks
  - Tombstones
  - wal
- prometheus对block进行定时压实 compact
- prometheus 查看支持的存储参数

## 32.5 compact目的和源码解读

# 本节重点介绍 :

- 每一分钟重载reloadBlocks解读
- deleteBlocks删除过期的block
  - 第一层判断 ：如果block中meta.Compaction.Deletable为true就标记为删除
  - 第二层判断 ： 这个block的存储时间已经过期了
  - 第三层判断 ： 这个block的size超过了限制
- 压实底层调用的 LeveledCompactor.Compact方法
  - 合并meta
  - 合并block

# compact压实源码解读

## db.run 入口方法

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\db.go

```go
func (db *DB) run() {
	defer close(db.donec)

	backoff := time.Duration(0)

	for {
		select {
		case <-db.stopc:
			return
		case <-time.After(backoff):
		}

		select {
		case <-time.After(1 * time.Minute):
			db.cmtx.Lock()
			if err := db.reloadBlocks(); err != nil {
				level.Error(db.logger).Log("msg", "reloadBlocks", "err", err)
			}
			db.cmtx.Unlock()

			select {
			case db.compactc <- struct{}{}:
			default:
			}
		case <-db.compactc:
			db.metrics.compactionsTriggered.Inc()

			db.autoCompactMtx.Lock()
			if db.autoCompact {
				if err := db.Compact(); err != nil {
					level.Error(db.logger).Log("msg", "compaction failed", "err", err)
					backoff = exponential(backoff, 1*time.Second, 1*time.Minute)
				} else {
					backoff = 0
				}
			} else {
				db.metrics.compactionsSkipped.Inc()
			}
			db.autoCompactMtx.Unlock()
		case <-db.stopc:
			return
		}
	}
}
```

### 解读一下

- 每隔1分钟调用下 db.reloadBlocks()，然后通过db.compactc 发送compact命令
- 收到compact命令会调用 db.Compact触发压实
- 并将prometheus_tsdb_compactions_triggered_total这个counter +1![compact01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722250000/0b45a39037a1439a958941cde7c287f2.png)

## 每一分钟重载reloadBlocks解读

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\db.go

```go
func (db *DB) reloadBlocks() (err error) {}
```

- 调用openblock重载下block

```go
loadable, corrupted, err := openBlocks(db.logger, db.dir, db.blocks, db.chunkPool)
```

### 调用 blocksToDelete判断要删除的blocks

```go
deletableULIDs := db.blocksToDelete(loadable)
```

- 对应的删除判断方法为  deletableBlocks

```go
func deletableBlocks(db *DB, blocks []*Block) map[ulid.ULID]struct{} {
	deletable := make(map[ulid.ULID]struct{})

	// Sort the blocks by time - newest to oldest (largest to smallest timestamp).
	// This ensures that the retentions will remove the oldest  blocks.
	sort.Slice(blocks, func(i, j int) bool {
		return blocks[i].Meta().MaxTime > blocks[j].Meta().MaxTime
	})

	for _, block := range blocks {
		if block.Meta().Compaction.Deletable {
			deletable[block.Meta().ULID] = struct{}{}
		}
	}

	for ulid := range BeyondTimeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}

	for ulid := range BeyondSizeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}

	return deletable
}
```

#### 第一层判断 ：如果block中meta.Compaction.Deletable为true就标记为删除

```go
	for _, block := range blocks {
		if block.Meta().Compaction.Deletable {
			deletable[block.Meta().ULID] = struct{}{}
		}
	}
```

- 也就是meta中 的numSamples为0 就会meta.Compaction.Deletable为true

```json
{
        "ulid": "01FD67HX4YP07NVVJ5KK47PJG8",
        "minTime": 1629064800170,
        "maxTime": 1629072000000,
        "stats": {
                "numSamples": 852948,
                "numSeries": 1781,
                "numChunks": 7108
        },
        "compaction": {
                "level": 1,
                "sources": [
                        "01FD67HX4YP07NVVJ5KK47PJG8"
                ]
        },
        "version": 1
}
```

#### 第二层判断 ： 这个block的存储时间已经过期了

```go
	for ulid := range BeyondTimeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}
```

- 底层调用的BeyondTimeRetention逻辑

```go
	for i, block := range blocks {
		// The difference between the first block and this block is larger than
		// the retention period so any blocks after that are added as deletable.
		if i > 0 && blocks[0].Meta().MaxTime-block.Meta().MaxTime > db.opts.RetentionDuration {
			for _, b := range blocks[i:] {
				deletable[b.meta.ULID] = struct{}{}
			}
			db.metrics.timeRetentionCount.Inc()
			break
		}
	}
```

#### 第三层判断 ： 这个block的size超过了限制

```go
	for ulid := range BeyondSizeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}

```

- 底层调用的BeyondSizeRetention

```go
	for i, block := range blocks {
		blocksSize += block.Size()
		if blocksSize > int64(db.opts.MaxBytes) {
			// Add this and all following blocks for deletion.
			for _, b := range blocks[i:] {
				deletable[b.meta.ULID] = struct{}{}
			}
			db.metrics.sizeRetentionCount.Inc()
			break
		}
	}
```

### 最终调用 deleteBlocks删除过期的block

```go
func (db *DB) deleteBlocks(blocks map[ulid.ULID]*Block) error {
	for ulid, block := range blocks {
		if block != nil {
			if err := block.Close(); err != nil {
				level.Warn(db.logger).Log("msg", "Closing block failed", "err", err, "block", ulid)
			}
		}

		toDelete := filepath.Join(db.dir, ulid.String())
		if _, err := os.Stat(toDelete); os.IsNotExist(err) {
			// Noop.
			continue
		} else if err != nil {
			return errors.Wrapf(err, "stat dir %v", toDelete)
		}

		// Replace atomically to avoid partial block when process would crash during deletion.
		tmpToDelete := filepath.Join(db.dir, fmt.Sprintf("%s%s", ulid, tmpForDeletionBlockDirSuffix))
		if err := fileutil.Replace(toDelete, tmpToDelete); err != nil {
			return errors.Wrapf(err, "replace of obsolete block for deletion %s", ulid)
		}
		if err := os.RemoveAll(tmpToDelete); err != nil {
			return errors.Wrapf(err, "delete obsolete block %s", ulid)
		}
		level.Info(db.logger).Log("msg", "Deleting obsolete block", "block", ulid)
	}

	return nil
}
```

## 压实最终调用的 compactBlocks

```go
func (db *DB) compactBlocks() (err error) {
	// Check for compactions of multiple blocks.
	for {
		plan, err := db.compactor.Plan(db.dir)
		if err != nil {
			return errors.Wrap(err, "plan compaction")
		}
		if len(plan) == 0 {
			break
		}

		select {
		case <-db.stopc:
			return nil
		default:
		}

		uid, err := db.compactor.Compact(db.dir, plan, db.blocks)
		if err != nil {
			return errors.Wrapf(err, "compact %s", plan)
		}

		if err := db.reloadBlocks(); err != nil {
			if err := os.RemoveAll(filepath.Join(db.dir, uid.String())); err != nil {
				return errors.Wrapf(err, "delete compacted block after failed db reloadBlocks:%s", uid)
			}
			return errors.Wrap(err, "reloadBlocks blocks")
		}
	}

	return nil
}
```

### 底层调用的 LeveledCompactor.Compact方法

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\compact.go

```go
func (c *LeveledCompactor) Compact(dest string, dirs []string, open []*Block) (uid ulid.ULID, err error) {
	var (
		blocks []BlockReader
		bs     []*Block
		metas  []*BlockMeta
		uids   []string
	)
	start := time.Now()

	for _, d := range dirs {
		meta, _, err := readMetaFile(d)
		if err != nil {
			return uid, err
		}

		var b *Block

		// Use already open blocks if we can, to avoid
		// having the index data in memory twice.
		for _, o := range open {
			if meta.ULID == o.Meta().ULID {
				b = o
				break
			}
		}

		if b == nil {
			var err error
			b, err = OpenBlock(c.logger, d, c.chunkPool)
			if err != nil {
				return uid, err
			}
			defer b.Close()
		}

		metas = append(metas, meta)
		blocks = append(blocks, b)
		bs = append(bs, b)
		uids = append(uids, meta.ULID.String())
	}

	uid = ulid.MustNew(ulid.Now(), rand.Reader)

	meta := CompactBlockMetas(uid, metas...)
	err = c.write(dest, meta, blocks...)
	if err == nil {
		if meta.Stats.NumSamples == 0 {
			for _, b := range bs {
				b.meta.Compaction.Deletable = true
				n, err := writeMetaFile(c.logger, b.dir, &b.meta)
				if err != nil {
					level.Error(c.logger).Log(
						"msg", "Failed to write 'Deletable' to meta file after compaction",
						"ulid", b.meta.ULID,
					)
				}
				b.numBytesMeta = n
			}
			uid = ulid.ULID{}
			level.Info(c.logger).Log(
				"msg", "compact blocks resulted in empty block",
				"count", len(blocks),
				"sources", fmt.Sprintf("%v", uids),
				"duration", time.Since(start),
			)
		} else {
			level.Info(c.logger).Log(
				"msg", "compact blocks",
				"count", len(blocks),
				"mint", meta.MinTime,
				"maxt", meta.MaxTime,
				"ulid", meta.ULID,
				"sources", fmt.Sprintf("%v", uids),
				"duration", time.Since(start),
			)
		}
		return uid, nil
	}

	errs := tsdb_errors.NewMulti(err)
	if err != context.Canceled {
		for _, b := range bs {
			if err := b.setCompactionFailed(); err != nil {
				errs.Add(errors.Wrapf(err, "setting compaction failed for block: %s", b.Dir()))
			}
		}
	}

	return uid, errs.Err()
}
```

#### 合并meta

```go
meta := CompactBlockMetas(uid, metas...)
```

#### 合并blocks 底层调用的 LeveledCompactor.populateBlock

- 获取block的索引对象 indexrindexr

```go
indexr, err := b.Index()
```

- 遍历索引对象的symbol合并所有的标签keys

```go
    for i, b := range blocks {
		syms := indexr.Symbols()
		if i == 0 {
			symbols = syms
			continue
		}
		symbols = NewMergedStringIter(symbols, syms)
    }
	for symbols.Next() {
		if err := indexw.AddSymbol(symbols.At()); err != nil {
			return errors.Wrap(err, "add symbol")
		}
	}
```

- 构造 ChunkSeriesSet对象

```go
for i, b := range blocks {
    sets = append(sets, newBlockChunkSeriesSet(indexr, chunkr, tombsr, all, meta.MinTime, meta.MaxTime-1))
}
```

- 遍历ChunkSeriesSet对象进行merge
- 将数据追加到传入的chunkw和indexw对象上

```go
	for set.Next() {
		select {
		case <-c.ctx.Done():
			return c.ctx.Err()
		default:
		}
		s := set.At()
		chksIter := s.Iterator()
		chks = chks[:0]
		for chksIter.Next() {
			// We are not iterating in streaming way over chunk as it's more efficient to do bulk write for index and
			// chunk file purposes.
			chks = append(chks, chksIter.At())
		}
		...
		if err := chunkw.WriteChunks(chks...); err != nil {
			return errors.Wrap(err, "write chunks")
		}
		if err := indexw.AddSeries(ref, s.Labels(), chks...); err != nil 
}
```

# 本节重点总结 :

- 每一分钟重载reloadBlocks解读
- deleteBlocks删除过期的block
  - 第一层判断 ：如果block中meta.Compaction.Deletable为true就标记为删除
  - 第二层判断 ： 这个block的存储时间已经过期了
  - 第三层判断 ： 这个block的size超过了限制
- 压实底层调用的 LeveledCompactor.Compact方法
  - 合并meta
  - 合并block

