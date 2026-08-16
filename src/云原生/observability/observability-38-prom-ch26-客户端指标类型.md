---
title: Prometheus 第26章：客户端指标类型
sidebarGroup: 可观测性
shortTitle: 38 客户端指标类型
order: 38
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第26章（客户端指标类型）合并笔记
---

> **Prometheus · 第 26 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 26.1 分位值summary和histogram对比

# 本节重点介绍 :

- 分位值的作用
- histogram数据说明
- summary数据说明
- 两者对比
  - histogram 服务端计算分位值
  - summary 客户端计算分位值

# 分位值的作用

## 分位值的意义是什么？

- 分位值即把所有的数值从小到大排序，取前N%位置的值，即为该分位的值。
- 一般用分位值来观察大部分用户数据，平均值会“削峰填谷”消减毛刺，同时高分位的稳定性可以忽略掉少量的长尾数据。
- 高分位数据不适用于全部的业务场景，例如金融支付行业，可能就会要求100%成功。

## 分位值是如何计算的？

- 以95分位值为例： 将采集到的100个数据，从小到大排列，95分位值就是取出第95个用户的数据做统计。
- 同理，50分位值就是第50个人的数据。

# histogram数据说明

## 数据示例

```shell
# HELP prometheus_tsdb_compaction_duration_seconds Duration of compaction runs
# TYPE prometheus_tsdb_compaction_duration_seconds histogram
prometheus_tsdb_compaction_duration_seconds_bucket{le="1"} 222
prometheus_tsdb_compaction_duration_seconds_bucket{le="2"} 223
prometheus_tsdb_compaction_duration_seconds_bucket{le="4"} 226
prometheus_tsdb_compaction_duration_seconds_bucket{le="8"} 230
prometheus_tsdb_compaction_duration_seconds_bucket{le="16"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="32"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="64"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="128"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="256"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="512"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="1024"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="2048"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="4096"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="8192"} 231
prometheus_tsdb_compaction_duration_seconds_bucket{le="+Inf"} 231
prometheus_tsdb_compaction_duration_seconds_sum 78.46930486000002
prometheus_tsdb_compaction_duration_seconds_count 231
```

## 数据说明

- xxx_sum 代表记录的和，比如这个指标就是tsdb_compaction延迟秒数的和 78秒
- xxx_count 代表记录的数量和，就是 一共231次上报
- xxx_bucket 代表延迟描述小于这个le的记录数为多少个
  - prometheus_tsdb_compaction_duration_seconds_bucket{​le="4"} 226 的意思就是 小于4秒的一共226个
  - prometheus_tsdb_compaction_duration_seconds_bucket{​le="8192"} 231 的意思就是 小于8192秒的一共231个
  - bucket的最后一定是个+inf的记录，因为算分位值的时候要用到+inf
  - 一个新的数据上报时，会把大于这个value的 bucket全部+1

## 分位值计算方法

- histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
- 就是获取记录中95分位值

# summary数据说明

## 数据示例

```shell
# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
# TYPE go_gc_duration_seconds summary
go_gc_duration_seconds{quantile="0"} 0.000734711
go_gc_duration_seconds{quantile="0.25"} 0.0010731
go_gc_duration_seconds{quantile="0.5"} 0.001139736
go_gc_duration_seconds{quantile="0.75"} 0.00123169
go_gc_duration_seconds{quantile="1"} 0.006106601
go_gc_duration_seconds_sum 16.28009843
go_gc_duration_seconds_count 13959
```

## 数据说明

- xxx_sum 代表记录的和，比如这个指标就是go_gc消耗秒数的和位16秒
- xxx_count 代表记录的数量和，就是 一共13959次上报
- xxx{​quantile} 代表分位值=quantile的值
  - go_gc_duration_seconds{​quantile="0.75"} 0.00123169 代表就是75分位值为0.00123169秒
  - go_gc_duration_seconds{​quantile="0"} 0.000734711 代表就是最小的耗时为0.000734711秒
  - go_gc_duration_seconds{​quantile="1"} 0.006106601 代表就是最小的耗时为0.006106601秒

## 分位值计算方法

- xxx{​quantile} 代表分位值=quantile的值
- 无需再计算，这个值就是结果值

# histogram和summary的对比

- [prometheus官方文档中对于两种类型的对比说明](https://prometheus.io/docs/practices/histograms/#histograms-and-summaries)
- 下面我总结一些对比点

| 对比点             | histogram                                                                                 | summary                                                            |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 查询表达式对比     | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` | `http_request_duration_seconds_summary{quantile="0.95"}`         |
| 所需配置           | 选择合适的buckets                                                                         | 选择所需的φ分位数和滑动窗口。其他φ分位数和滑动窗口以后无法计算。 |
| 客户端性能开销     | 开销低，因为它们只需要增加计数器                                                          | 开销高，由于流式分位数计算                                         |
| 服务端性能开销     | 开销高，因为需要在服务端实时计算(而且bucket值指标基数高)                                  | 开销低，可以看做是gauge指标上传，仅查询即可                        |
| 分位值误差         | 随bucket精度变大而变大(线性插值法计算问题)                                                | 误差在φ维度上受可配置值限制                                       |
| 是否支持聚合       | 支持                                                                                      | 不支持(配置sum avg等意义不大)                                      |
| 是否提供全局分位值 | 支持(根据promql匹配维度决定)                                                              | 不支持(因为数据在每个实例/pod/agent侧已经算好，无法聚合)           |

# 本节重点总结 :

- 分位值的作用
- histogram数据说明
- summary数据说明
- 两者对比
  - histogram 服务端计算分位值
  - summary 客户端计算分位值

## 26.2 histogram线性插值法源码解读

# 本节重点介绍 :

- histogram 线性插值法源码解读

# histogram 线性插值法

## histogram_quantile为何需要先算 `rate`

- 因为每个bucket都是`counter`型的，如果不算rate那么分位值的结果曲线是一条直线
- 原理是因为`counter`型累加，不算rate并不知道当前bucket的增长情况，换句话说不知道这些bucket是多久积攒到现在这个值的

## 什么是线性插值法

- 之前阅读很多文章都提到`histogram`采用`线性插值法`计算分位值会导致一定的误差
- 对这个`线性插值法`总是理解的不到位
- 在查看完代码之后明白了

### 代码分析

- 代码位置：`D:\work\go_work\pkg\mod\github.com\prometheus\prometheus@v0.0.0-20201209205804-66f47e116e00\promql\quantile.go`

### bucket数据结构

- 其中`bucket` 代表事先定义好的bucket
- `upperBound`代表这个bucket的上限值
- `count` 代表这个小于等于这个`upperBound`的个数/次数
- `workqueue_work_duration_seconds_bucket{name="crd_openapi_controller",le="10"} 65246 `
- 所以上述表达式含义为`workqueue_work_duration_seconds`小于`10`秒的有`65246 `个

```golang
type bucket struct {
	upperBound float64
	count      float64
}

type buckets []bucket

func (b buckets) Len() int           { return len(b) }
func (b buckets) Swap(i, j int)      { b[i], b[j] = b[j], b[i] }
func (b buckets) Less(i, j int) bool { return b[i].upperBound < b[j].upperBound }

```

### 核心计算函数

- 核心函数如下

```golang
func bucketQuantile(q float64, buckets buckets) float64 {
	if q < 0 {
		return math.Inf(-1)
	}
	if q > 1 {
		return math.Inf(+1)
	}
	sort.Sort(buckets)
	if !math.IsInf(buckets[len(buckets)-1].upperBound, +1) {
		return math.NaN()
	}

	buckets = coalesceBuckets(buckets)
	ensureMonotonic(buckets)

	if len(buckets) < 2 {
		return math.NaN()
	}
	observations := buckets[len(buckets)-1].count
	if observations == 0 {
		return math.NaN()
	}
	rank := q * observations
	b := sort.Search(len(buckets)-1, func(i int) bool { return buckets[i].count >= rank })

	if b == len(buckets)-1 {
		return buckets[len(buckets)-2].upperBound
	}
	if b == 0 && buckets[0].upperBound <= 0 {
		return buckets[0].upperBound
	}
	var (
		bucketStart float64
		bucketEnd   = buckets[b].upperBound
		count       = buckets[b].count
	)
	if b > 0 {
		bucketStart = buckets[b-1].upperBound
		count -= buckets[b-1].count
		rank -= buckets[b-1].count
	}
	sql:=fmt.Sprintf("%v+(%v-%v)*(%v/%v)",
		bucketStart,
		bucketEnd,
		bucketStart,
		rank,
		count,

	)
	log.Println(sql)
	return bucketStart + (bucketEnd-bucketStart)*(rank/count)
}

```

- 我们现在有这些数据，然后求75分位值

```golang
a := []bucket{
    {upperBound: 0.05, count: 199881},
    {upperBound: 0.1, count: 212210},
    {upperBound: 0.2, count: 215395},
    {upperBound: 0.4, count: 319435},
    {upperBound: 0.8, count: 419576},
    {upperBound: 1.6, count: 469593},
    {upperBound: math.Inf(1), count: 519593},
}

q75 := bucketQuantile(0.75, a)
```

- 其计算逻辑为：根据记录总数和分位值求目标落在第几个bucket段`b`
- 根据`b`得到起始bucket大小`bucketStart`,终止bucket大小`bucketEnd` ，本bucket宽度 ，本bucket记录数
- 根据本段记录数和分位值算出目标分位数在本bucket排行`rank`
- 最终的计算方式为`分位值=起始bucket大小+(本bucket宽度)*(目标分位数在本bucket排行/本bucket记录数)`
- 换成本例中：`q75=0.4+(0.8-0.4)*(70259.75/100141) = 0.6806432929569308`

```shell
2021/02/02 19:08:55 记录总数 = 519593
2021/02/02 19:08:55 目标落在第几个bucket段= 4
2021/02/02 19:08:55 起始bucket大小= 0.4
2021/02/02 19:08:55 终止bucket大小= 0.8
2021/02/02 19:08:55 本bucket宽度= 0.4
2021/02/02 19:08:55 本bucket记录数= 100141
2021/02/02 19:08:55 目标分位数在本bucket排行= 70259.75
2021/02/02 19:08:55 分位值=起始bucket大小+(本bucket宽度)*(目标分位数在本bucket排行/本bucket记录数)
2021/02/02 19:08:55 0.4+(0.8-0.4)*(70259.75/100141) = 0.6806432929569308

```

### 那线性插值法的含义体现在哪里呢

- 就是这里`本bucket宽度*(目标分位数在本bucket排行/本bucket记录数)`
- 有个假定：样本数据这个目标bucket中按照平均间隔均匀分布
- 举例 100141个样本在0.4-0.8 bucket中均匀分布
- 如果真实值分布靠近0.4一些，则计算出的值偏大
- 如果真实值分布靠近0.8一些，则计算出的值偏小
- 这就是线性插值法的含义

## histogram 高基数问题

- 具体可以看文章[prometheus高基数问题和其解决方案](https://zhuanlan.zhihu.com/p/228042105)

### 危害在哪里

- 一个高基数的查询会把存储打挂
- 一个50w基数查询1小时数据内存大概的消耗为1G，再叠加cpu等消耗

### 为何会出现

- label乘积太多 ，比如bucket有50种，再叠加4个10种的业务标签，所以总基数为`50*10*10*10*10=50w`

# 本节重点总结 :

- histogram 线性插值法源码解读

## 26.3 summary源码解读

# 本节重点介绍 :

- summary数据结构
- 分位值库 https://github.com/beorn7/perks

# 源码解读

## summary数据结构

- 源码位置 D:\go_path\pkg\mod\github.com\prometheus\client_golang@v1.9.0\prometheus\summary.go

```go
type summary struct {
	selfCollector

	bufMtx sync.Mutex // Protects hotBuf and hotBufExpTime.
	mtx    sync.Mutex // Protects every other moving part.
	// Lock bufMtx before mtx if both are needed.

	desc *Desc

	objectives       map[float64]float64 // 分位数，告诉Summary要统计哪些分位的值 key是分位数，value是浮动数
	sortedObjectives []float64  // 对分位数进行排序，升序，防止用户输入的分位数是乱序的

	labelPairs []*dto.LabelPair

	sum float64  // 观测到的数据值的总和 
	cnt uint64  // 观测的次数

	hotBuf, coldBuf []float64  // 数据的缓存

	streams                          []*quantile.Stream  //原始数据
	streamDuration                   time.Duration
	headStream                       *quantile.Stream
	headStreamIdx                    int
	headStreamExpTime, hotBufExpTime time.Time
}

```

## newSummary 初始化summary

### 设置3个默认值

```go
	if opts.MaxAge == 0 {
		opts.MaxAge = DefMaxAge
	}

	if opts.AgeBuckets == 0 {
		opts.AgeBuckets = DefAgeBuckets
	}

	if opts.BufCap == 0 {
		opts.BufCap = DefBufCap
	}
```

- hotBuf, coldBuf中的数据缓存长度为 500
- AgeBuckets 默认设置5个stream，代表5个stream缓存
- headStreamExpTime  设置为 10min/5 =2 min，代表2分钟的计算周期

### 初始化streams

- 底层分位值库 https://github.com/beorn7/perks

```go
	for i := uint32(0); i < opts.AgeBuckets; i++ {
		s.streams = append(s.streams, s.newStream())
	}
	s.headStream = s.streams[0]
```

## 记录summary的核心方法是Observe()

- 作用是在本地增加一个观测值

```go
func (s *summary) Observe(v float64) {
	s.bufMtx.Lock()
	defer s.bufMtx.Unlock()

	now := time.Now()
	if now.After(s.hotBufExpTime) {
		s.asyncFlush(now)
	}
	s.hotBuf = append(s.hotBuf, v)
	if len(s.hotBuf) == cap(s.hotBuf) {
		s.asyncFlush(now)
	}
}

```

- 将传入的v添加到 hotBuf中
- 两个条件会触发计算操作
  - 过了2分钟`if now.After(s.hotBufExpTime)`
  - `if len(s.hotBuf) == cap(s.hotBuf) ` hotBuf中的v数量达到了500

### flush操作

```go
func (s *summary) asyncFlush(now time.Time) {
	s.mtx.Lock()
	s.swapBufs(now)

	// Unblock the original goroutine that was responsible for the mutation
	// that triggered the compaction.  But hold onto the global non-buffer
	// state mutex until the operation finishes.
	go func() {
		s.flushColdBuf()
		s.mtx.Unlock()
	}()
}
```

- swapBufs 交换 s.hotBuf, s.coldBuf

```go
// swapBufs needs mtx AND bufMtx locked, coldBuf must be empty.
func (s *summary) swapBufs(now time.Time) {
	if len(s.coldBuf) != 0 {
		panic("coldBuf is not empty")
	}
	s.hotBuf, s.coldBuf = s.coldBuf, s.hotBuf
	// hotBuf is now empty and gets new expiration set.
	for now.After(s.hotBufExpTime) {
		s.hotBufExpTime = s.hotBufExpTime.Add(s.streamDuration)
	}
}
```

### flushColdBuf 函数

- 遍历s.coldBuf，将v插入所有的streams中
- 然后将 coldBuf清空

```go
// flushColdBuf needs mtx locked.
func (s *summary) flushColdBuf() {
	for _, v := range s.coldBuf {
		for _, stream := range s.streams {
			stream.Insert(v)
		}
		s.cnt++
		s.sum += v
	}
	s.coldBuf = s.coldBuf[0:0]
	s.maybeRotateStreams()
}
```

### 将数据插入到 stream中

- D:\go_path\pkg\mod\github.com\beorn7\perks@v1.0.1\quantile\stream.go

```go
// Insert inserts v into the stream.
func (s *Stream) Insert(v float64) {
	s.insert(Sample{Value: v, Width: 1})
}

func (s *Stream) insert(sample Sample) {
	s.b = append(s.b, sample)
	s.sorted = false
	if len(s.b) == cap(s.b) {
		s.flush()
	}
}
```

## 获取summary 的时候调用write函数

- 遍历分位值，然后调用headStream.Query方法获取对应rank的分位值

```go
func (s *summary) Write(out *dto.Metric) error {
    	for _, rank := range s.sortedObjectives {
    		var q float64
    		if s.headStream.Count() == 0 {
    			q = math.NaN()
    		} else {
    			q = s.headStream.Query(rank)
    		}
    		qs = append(qs, &dto.Quantile{
    			Quantile: proto.Float64(rank),
    			Value:    proto.Float64(q),
    		})
    	}
}
```

- 底层调用的就是 stream.query方法，位置D:\go_path\pkg\mod\github.com\beorn7\perks@v1.0.1\quantile\stream.go
- 原理就是根据长度和rank求索引，然后根据索引取值即可

```go
func (s *Stream) Query(q float64) float64 {
	if !s.flushed() {
		// Fast path when there hasn't been enough data for a flush;
		// this also yields better accuracy for small sets of data.
		l := len(s.b)
		if l == 0 {
			return 0
		}
		i := int(math.Ceil(float64(l) * q))
		if i > 0 {
			i -= 1
		}
		s.maybeSort()
		return s.b[i].Value
	}
	s.flush()
	return s.stream.query(q)
}

```

# 本节重点总结 :

- summary数据结构
  - coldbuf 做计算的
  - hotbuf是用来接收最新数据
- 分位值库 https://github.com/beorn7/perks

