---
title: "26.1 分位值summary和histogram对比"
sidebarGroup: "Prometheus"
shortTitle: "57 26.1 分位值summary和histog..."
order: 57
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 分位值的作用 - histogram数据说明 - summary数据说明 - 两者对比 - histogram 服务端计算分位值 - summary 客户端计算分位值 分位值的作..."
---

> **Prometheus · 第 57 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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
  - prometheus_tsdb_compaction_duration_seconds_bucket{le="4"} 226 的意思就是 小于4秒的一共226个
  - prometheus_tsdb_compaction_duration_seconds_bucket{le="8192"} 231 的意思就是 小于8192秒的一共231个
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
- xxx{quantile} 代表分位值=quantile的值
  - go_gc_duration_seconds{quantile="0.75"} 0.00123169 代表就是75分位值为0.00123169秒
  - go_gc_duration_seconds{quantile="0"} 0.000734711 代表就是最小的耗时为0.000734711秒
  - go_gc_duration_seconds{quantile="1"} 0.006106601 代表就是最小的耗时为0.006106601秒

## 分位值计算方法

- xxx{quantile} 代表分位值=quantile的值
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

