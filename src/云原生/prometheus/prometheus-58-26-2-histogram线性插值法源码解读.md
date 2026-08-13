---
title: 26.2 histogram线性插值法源码解读
sidebarGroup: Prometheus
shortTitle: 58 26.2 histogram线性插值法源码解...
order: 58
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - histogram 线性插值法源码解读 histogram 线性插值法 histogram_quantile为何需要先算 rate - 因为每个bucket都是 counter ...'
---

> **Prometheus · 第 58 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

