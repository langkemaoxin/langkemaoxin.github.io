---
title: "34.3 m3db-oom的内存火焰图和内存分配器加油模型源码解读"
sidebarGroup: "Prometheus"
shortTitle: "106 34.3 m3db-oom的内存火焰图和内存..."
order: 106
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - m3dbnode oom时内存火焰图追查源码调用 - 内存分配器加油模型源码解读 - 高基数查询导致m3db oom m3dbnode oom oom时排查监控曲线 - 内存火焰..."
---

> **Prometheus · 第 106 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- m3dbnode oom时内存火焰图追查源码调用
- 内存分配器加油模型源码解读
- 高基数查询导致m3db oom

# m3dbnode oom

## oom时排查监控曲线

- 内存火焰图: 80G内存
- ![mo01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743369000/777d0dbce9ad49328fe87e688e2d2db0.png)
- bytes_pool_get_on_empty qps 很高
- ![mo02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743369000/dfa3593dba4e42f6845d6febf4757b87.png)
- db read qps增长 80%
- ![mo03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743369000/2d047058428a4e54ad4b3f474a4a0891.png)
- node cpu kernel 暴涨
- ![mo04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743369000/4de6c2c152b5451eb06a65f28864b09f.png)

## 看图结论

- m3dbnode 内存oom过程很短，很剧烈：总时间不超过7分钟
- 内存从27G增长到250G
- 节点sys态cpu暴涨：因为大量的mem_alloca sys_call
- 内存增长曲线和db_read_qps曲线和bytes_pool_get_on_empty曲线高度吻合
- 内存火焰图： 27G的rpc 40G的pool.(*objectPool).tryFill

# 查看代码，追踪火焰图中这个tryFill

## 内存分配器

- 目的很简单:自己管理内存
- 避免频繁的mem_allocate
- sys_call提升速度，空间换时间

## 核心结构 objectPool

- 位置 D:\go_path\pkg\mod\github.com\m3db\m3@v1.1.0\src\x\pool\object.go

```go
type objectPool struct {
	opts                ObjectPoolOptions
	values              chan interface{}
	alloc               Allocator
	size                int
	refillLowWatermark  int
	refillHighWatermark int
	filling             int32
	initialized         int32
	dice                int32
	metrics             objectPoolMetrics
}
```

- 初始化时调用Init 向池中注入

```go
func (p *objectPool) Init(alloc Allocator) {
	if !atomic.CompareAndSwapInt32(&p.initialized, 0, 1) {
		p.onPoolAccessErrorFn(errPoolAlreadyInitialized)
		return
	}

	p.values = make(chan interface{}, p.size)
	for i := 0; i < cap(p.values); i++ {
		p.values <- alloc()
	}

	p.alloc = alloc
	p.setGauges()
}

```

## 从池中获取对象时

- 池中还有剩余则直接获取
- 否则走各自的alloc分配，同时设置这个 bytes_pool_get_on_empty指标+1

```go
func (p *objectPool) Get() interface{} {
	var (
		metrics = p.metrics
		v       interface{}
	)

	select {
	case v = <-p.values:
	default:
		v = p.alloc()
		metrics.getOnEmpty.Inc(1)
	}

	if unsafe.Fastrandn(sampleObjectPoolLengthEvery) == 0 {
		// inlined setGauges()
		metrics.free.Update(float64(len(p.values)))
		metrics.total.Update(float64(p.size))
	}

	if p.refillLowWatermark > 0 && len(p.values) <= p.refillLowWatermark {
		p.tryFill()
	}

	return v
}
```

## 每次Get同时判断池水位，是否加油

```go
	if p.refillLowWatermark > 0 && len(p.values) <= p.refillLowWatermark {
		p.tryFill()
	}
```

## 加油过程

- 用CompareAndSwapInt32做并发控制标志位
- 加油加到refillHighWatermark

```go
func (p *objectPool) tryFill() {
	if !atomic.CompareAndSwapInt32(&p.filling, 0, 1) {
		return
	}

	go func() {
		defer atomic.StoreInt32(&p.filling, 0)

		for len(p.values) < p.refillHighWatermark {
			select {
			case p.values <- p.alloc():
			default:
				return
			}
		}
	}()
}

```

## 默认池参数

```go
	defaultRefillLowWaterMark  = 0.3
	defaultRefillHighWaterMark = 0.6
```

## 总结思考

- 默认池低水位为什么不是0:因为 从水位判断到tryFill中间的并发请求使得最后tryFill开始时低水位可能低于0.3
- 火焰图中的tryFill消耗了40G内存不是一次性的，类比右侧thriftrpc27，属于累加内存消耗值
- 一次性的内存消耗肯定没有这么多：每次加油时内存消耗低于初始化
- 所以可以得到结论，oom是因为在当时byte_pool频繁的get消耗，然后tryFill频繁的加油导致内存分配
- 所以根本原因还是查询导致的

## 临时解决办法:限制query资源消耗保护db

- 首先要明确的几点，因为remote_read是链式的调用
- 所以限制m3db前面的组件`prometheusm3coordinator`是没用的
- 只能限制m3db中关于query的参数，但是这个方法不根治
- ![mo05.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743369000/0cb51b9f97d24909b5ff86004c6a1c9d.png)

## 上面的方法治标不治本，重要的是解决高基数/重查询的问题

# 本节重点总结 :

- m3dbnode oom时内存火焰图追查源码调用
- 内存分配器加油模型源码解读
- 高基数查询导致m3db oom

