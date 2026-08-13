---
title: "4.2 prometheus四种查询类型"
sidebarGroup: "Prometheus"
shortTitle: "125 4.2 prometheus四种查询类型"
order: 125
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : prometheus 四种查询类型 - 4种查询类型 - vector - matrix - scalar - string - instant query 对应vector - r..."
---

> **Prometheus · 第 125 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

