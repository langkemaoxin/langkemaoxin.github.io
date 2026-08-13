---
title: "4.4 四种数据类型"
sidebarGroup: "Prometheus"
shortTitle: "127 4.4 四种数据类型"
order: 127
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : prometheus 四种数据类型 - 四种数据类型 - gauge 当前值 - counter 计数器 - histogram 直方图样本观测 - summary 摘要 四种数据类..."
---

> **Prometheus · 第 127 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : prometheus 四种数据类型

- 四种数据类型
  - gauge  当前值
  - counter 计数器
  - histogram 直方图样本观测
  - summary   摘要

# 四种数据类型

## `gauge` 当前值

- 举例 go_info{instance="localhost:9090", job="prometheus", version="go1.16.7"}
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

