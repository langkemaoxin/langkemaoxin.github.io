---
title: Prometheus 第4章：基本概念
sidebarGroup: 可观测性
shortTitle: 16 基本概念
order: 16
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第4章（基本概念）合并笔记
---

> **Prometheus · 第 4 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 4.1 prometheus基本概念-sample数据点

# 本节重点介绍 : prometheus 基本概念

- point 时序中单一数据点的数据结构，大小
- 标签和标签组
- sample 时序曲线中的一个点

# prometheus 基本概念

## Point 数据点

- 源码位置 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\promql\value.go

```go
// Point represents a single data point for a given timestamp.
type Point struct {
	T int64
	V float64
}
```

- 具体含义： 一个时间戳和一个value组合成的数据点
- size:16byte: 包含 1个8byte int64时间戳和1个8byte float64 value
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628933841000/a8e178956abb45f0a3e284cebdf9e1c9.png)

## Label 标签

- 源码位置 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\pkg\labels\labels.go

```
type Label struct {
	Name, Value string
}
```

- 一对label 比如`cpu="0"mode: "user"`
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628933841000/c0d5001fa6e34aad8c8edbdba381b85a.png)

## Labels 标签组

- 源码位置 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\pkg\labels\labels.go

```
type Labels []Label

```

- 是Label切片的别名
- 就是 一个指标的所有tag values
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628933841000/eef1a6a0793a47b5ad5092f0b10bf1e6.png)

## sample 数据点

- 源码位置 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\promql\value.go

```go
// Sample is a single sample belonging to a metric.
type Sample struct {
	Point

	Metric labels.Labels
}
```

- sample代表一个数据点
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628933841000/81631e6ec3ea4b9f833a1e0a08848149.png)

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628933841000/96cfc82d1c7947f0808eba32a0613d78.png)

# 本节重点总结 : prometheus 基本概念

- point 时序中单一数据点的数据结构，大小 8+8=16byte
- 标签和标签组 key-value的字符串
- sample 时序曲线中的一个点

## 4.2 prometheus四种查询类型

# 本节重点介绍 : prometheus 四种查询类型

- 4种查询类型
  - vector
  - matrix
  - scalar
  - string
- instant query 对应vector
- range query 对应matrix

# prometheus四种查询类型

- [文档地址](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- 查询类型源码地址 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\promql\parser\value.go

```go
// The valid value types.
const (
	ValueTypeNone   ValueType = "none"
	ValueTypeVector ValueType = "vector"
	ValueTypeScalar ValueType = "scalar"
	ValueTypeMatrix ValueType = "matrix"
	ValueTypeString ValueType = "string"
)

```

## 即时向量 `Instant vector` : 一组时间序列，每个时间序列包含一个样本，所有样本共享相同的时间戳

- vector 向量 源码位置 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\promql\value.go

```go
// Vector is basically only an alias for model.Samples, but the
// contract is that in a Vector, all Samples have the same timestamp.
type Vector []Sample
```

- vector 向量,是samples的别名,但是所有sample具有相同timestamp ,常用作instant_query的结果
- 在prometheus页面上就是table查询 ，对应查询接口 /api/v1/query
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628934619000/e2625550bfe34490a5fab661de644f13.png)

## 范围向量 `Range vector` : 一组时间序列，一段时间的结果

- 在prometheus页面上就是graph查询 ，对应查询接口 /api/v1/query_range
- 返回的结果是Matrix 矩阵，源码位置  D:\nyy_work\go_path\src\github.com\prometheus\prometheus\promql\value.go

```go
// Matrix is a slice of Series that implements sort.Interface and
// has a String method.
type Matrix []Series

```

- Matrix是series的切片 Series源码位置 D:\nyy_work\go_path\src\github.com\prometheus\prometheus\promql\value.go

```go
// Series is a stream of data points belonging to a metric.
type Series struct {
	Metric labels.Labels `json:"metric"`
	Points []Point       `json:"values"`
}

```

- series 是标签组+Points的组合
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628934619000/513df6f763294d8ea90cd8e7cb76f51b.png)

## 标量 `Scalar` 一个简单的数字浮点值

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628934619000/5dd665c26d6448f296c65df622d1341b.png)

## String 一个简单的字符串值；目前未使用

# 本节重点总结 : prometheus 四种查询类型

- 4种查询类型
  - vector  一个时刻的结果
  - matrix 一段时间的结果
  - scalar  浮点数
  - string
- instant query 对应vector
- range query 对应matrix

## 4.3 四种标签匹配模式

# 本节重点介绍 : prometheus 四种标签匹配模式

- 4种查询类型
  - `=` 等于
  - `!=` 不等于
  - `=~` 正则匹配
  - `!~` 正则非匹配

# 四种标签匹配模式

1. `=` 等于

   - 查询举例: cpu第一个核并且是用户态的数据  node_cpu_seconds_total{​mode="user",cpu="0"}
   - 查询举例: go_gc_duration_seconds{​quantile="0.75"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/64e02a6e53fd4c8b8a1f22fb75ca1e04.png)
2. `!=` 不等于

   - 查询举例: 非lo网卡的接收字节数  node_network_receive_bytes_total{​device!="lo"}
   - 查询举例:
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/7ee1829761b8439e9eb8735b3d9208a9.png)
3. `=~` 正则匹配

   - 查询: 挂载点以/run开头的文件系统剩余字节数  node_filesystem_avail_bytes{​mountpoint=~"^/run.*"}
   - 查询:  prometheus_http_requests_total{​handler=~"/api.*"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/60836f9ba2144d2ab6088ca598594647.png)
4. `!~` 正则非匹配

   - 查询: 块设备名字不包含vda的读字节数  node_disk_read_bytes_total{​device!~".*vda.*"}
   - 查询: prometheus_http_requests_total{​code!~".*00"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/511926903f334a78beecf55381f39f3a.png)
5. `__name__` 也是个标签，可以匹配metrics

   - 查询  {​__name__=~"go.*",quantile=~".*0.*"} 等价于 go_gc_duration_seconds{​quantile=~".*0.*"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/013716bf8cd84b128505f1ac85668dfa.png)

# 本节重点介绍 : prometheus 四种标签匹配模式

- 4种查询类型

  - `=` 等于
  - `!=` 不等于
  - `=~` 正则匹配
  - `!~` 正则非匹配
- =,!=不需要正则，速度最快
- 4种可以自由组合
- 标签的key要明确给出
- `__name__` 也是个标签，可以匹配metrics
- promql中查询没数据，大多是标签匹配的问题

## 4.4 四种数据类型

# 本节重点介绍 : prometheus 四种数据类型

- 四种数据类型
  - gauge  当前值
  - counter 计数器
  - histogram 直方图样本观测
  - summary   摘要

# 四种数据类型

## `gauge` 当前值

- 举例 go_info{​instance="localhost:9090", job="prometheus", version="go1.16.7"}
- 类似的info信息，看时序的结果值=1 意义不大
- 主要是看标签的key和value   go.1.16.7 ,关注一下
- 举例 go_memstats_heap_alloc_bytes

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628936365000/81cb171efa2341c2868100e46ce8b7eb.png)

## `counter`   计数器

- 代表一个累积指标单调递增计数器
- 使用rate 查看qps  rate(prometheus_http_requests_total[1m])
- 使用increase 查看增量   increase(prometheus_http_requests_total[10s])
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628936365000/91da3ebe45324a8eab36796f17396308.png)

## `histogram` 直方图样本观测

- 通常之类的东西请求持续时间或响应大小和计数它们配置的桶中
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628936365000/908886de57e64422a4570abf3f4fbdf2.png)
- 它还提供所有观察值的总和

```shell
# http所有接口 总的95分位值
# sum/count 可以算平均值
prometheus_http_request_duration_seconds_sum/ prometheus_http_request_duration_seconds_count

# histogram_quantile(0.95, sum(rate(prometheus_http_request_duration_seconds_bucket[5m])) by (le,handler))

histogram_quantile(0.95, sum(rate(prometheus_http_request_duration_seconds_bucket[1m])) by (le))

# range_query接口的95分位值
histogram_quantile(0.95, sum(rate(prometheus_http_request_duration_seconds_bucket{handler="/api/v1/query_range"}[5m])) by (le))

```

## `summary`   摘要会采样观察值

- 通常是请求持续时间和响应大小之类的东西
- 尽管它还提供了观测值的总数和所有观测值的总和

```shell
# gc耗时

# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
# TYPE go_gc_duration_seconds summary
go_gc_duration_seconds{quantile="0"} 0.000135743
go_gc_duration_seconds{quantile="0.25"} 0.000872805
go_gc_duration_seconds{quantile="0.5"} 0.000965516
go_gc_duration_seconds{quantile="0.75"} 0.001055636
go_gc_duration_seconds{quantile="1"} 0.006464756

# summary 平均值
go_gc_duration_seconds_sum /go_gc_duration_seconds_count
```

## 利用 sum/count 算平均值 ：histogram 和summary 都适用

- go_gc_duration_seconds_sum/go_gc_duration_seconds_count 算平均值

# 本节重点介绍 : prometheus 四种数据类型

- 四种数据类型
  - gauge  当前值 最简单，看标签
  - counter 计数器 多用在请求计数，cpu统计
  - histogram 直方图样本观测 ：服务端算分位值
  - summary   摘要：客户端算分位值
  - 利用 sum/count 算平均值 ：histogram 和summary 都适用

## 4.5 时间范围选择器

# 本节重点介绍 :

- 时间范围选择器的正确用法
- prometheus查询返回13位毫秒时间戳

# 范围向量选择器 Range Vector Selectors

- 范围矢量的工作方式与即时矢量一样，不同之处在于它们从当前即时中选择了一定范围的样本。语法上，将持续时间附加在[]向量选择器末尾的方括号（）中，以指定应为每个结果范围向量元素提取多远的时间值。
- 只能作用在`counter`上

> 时间范围

```shell
ms -毫秒
s -秒
m - 分钟
h - 小时
d -天-假设一天总是24小时
w -周-假设一周始终为7天
y -年-假设一年始终为365天
```

- 时间范围不能脱离rate等函数，不然会报错

> 直接查询报错   promhttp_metric_handler_requests_total[1m]

```shell
Error executing query: invalid expression type "range vector" for range query, must be Scalar or instant Vector

```

> 需要叠加一个非聚合函数 如 rate irate delta idelta sum 等

- 计算网卡入流量
  rate(promhttp_metric_handler_requests_total[1m])

> 时间范围 ，不能低于采集间隔

- 采集8秒 ，查询3秒则无数据
- rate(promhttp_metric_handler_requests_total[3s])

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937248000/5175af2a9dc04cab9d28d081f31d1afe.png)

# prometheus返回的都是毫秒时间戳

- 10位代表秒时间戳
- 13位代表毫秒时间戳
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937248000/618d28a25e1c4a6187829f71f0f625c4.png)

# 本节重点总结 : 

- 时间范围选择器的正确用法
- 时间范围 ，不能低于采集间隔
- prometheus查询返回13位毫秒时间戳

## 4.6 实用promql介绍

# 本节重点介绍 : prometheus promql简单的总结

- topk  最值
- absent nodata报警
- offset 同环比
- 分位值histogram_quantile
- 成功的/总的 = 成功率
- agg_over_time 横向的聚合

## 实用功能总结

## [查询函数文档](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## 举例

### agg 去掉/保留 label ，分布情况

- 去掉举例：``sum without(code) (rate(prometheus_http_requests_total[2m] ) )``
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937782000/bbfb0bba063e498980ded4e1931e1200.png)
- 保留举例：``sum by(code) (rate(prometheus_http_requests_total[2m] ) )  ``
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937782000/e26e25662ff644289c41523e627aff4d.png)

### topk bottomK 看top

- 举例：查看容器cpu使用率top5``topk(5,prometheus_http_response_size_bytes_bucket)``
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937782000/32104a28a35d4ccf9783aa8e4937ed7c.png)
- 最小的 bottomk(5,prometheus_http_response_size_bytes_bucket)

### 同环比 相减

- 举例：qps环比1小时 掉10``sum (rate(prometheus_http_requests_total[2m] offset 1h) ) - sum (rate(prometheus_http_requests_total[2m] ) )   ``

### absent nodata报警

- ==1代表absent生效
- 举例：``absent(abc_def)==1``

### 分位值histogram_quantile

- 举例查看apiserver 请求延迟90分位``histogram_quantile(0.90, sum(rate(prometheus_http_request_duration_seconds_bucket[5m])) by (le))``

### 两组series关联  成功率百分比

- 举例：apiserver 请求成功率`` 100* ( sum(prometheus_http_requests_total{​code=~"2.*|3.*"})/  sum(prometheus_http_requests_total) )``
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937782000/5c72528935a84595a8340cafc1a95b15.png)

### agg_over_time 给所有ts的value做agg 横向agg

- 举例查看一天的alert``avg_over_time(go_goroutines [24h])``

# 本节重点总结 : prometheus promql简单的总结

- topk  最值
- absent nodata报警
- 分位值histogram_quantile
- offset 同环比
- 成功的/总的 = 成功率
- agg_over_time 横向的聚合

