---
title: 26.3 summary源码解读
sidebarGroup: Prometheus
shortTitle: 59 26.3 summary源码解读
order: 59
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - summary数据结构 - 分位值库 http[path] 源码解读 summary数据结构 - 源码位置 [path]'
---

> **Prometheus · 第 59 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

