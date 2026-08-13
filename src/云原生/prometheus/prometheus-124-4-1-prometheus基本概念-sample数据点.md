---
title: "4.1 prometheus基本概念-sample数据点"
sidebarGroup: "Prometheus"
shortTitle: "124 4.1 prometheus基本概念-sam..."
order: 124
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : prometheus 基本概念 - point 时序中单一数据点的数据结构，大小 - 标签和标签组 - sample 时序曲线中的一个点 prometheus 基本概念 Point ..."
---

> **Prometheus · 第 124 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

