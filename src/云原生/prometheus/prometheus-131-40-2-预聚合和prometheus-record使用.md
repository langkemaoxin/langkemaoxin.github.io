---
title: 40.2 预聚合和prometheus-record使用
sidebarGroup: Prometheus
shortTitle: 131 40.2 预聚合和prometheus-re...
order: 131
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - downsample降采样可以降低查询数据量 - prometheus原生不支持downsample - 实时查询/聚合 VS 预查询/聚合的优缺点 - 实时查询/聚合条件随意组...'
---

> **Prometheus · 第 131 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- downsample降采样可以降低查询数据量
  - prometheus原生不支持downsample
- 实时查询/聚合 VS 预查询/聚合的优缺点
  - 实时查询/聚合条件随意组合，性能差
  - 预查询/聚合 性能好，聚合条件需要提前定义
- prometheus的预查询/聚合配置举例

# downsample降采样可以降低查询数据量

## prometheus原生不支持downsample

- 还有个原因是prometheus原生不支持downsample，所以无论grafana上面的step随时间如何变化，涉及到到查询都是将指定的block解压再按step切割
- 所以查询时间跨度大对应消耗的cpu和内存就会暴增，同时原始点的存储也浪费了，因为grafana的step会随时间跨度变大变大

# 实时查询/聚合 VS 预查询/聚合

- prometheus的query都是实时查询的/聚合

## 实时查询的优点很明显

- 查询/聚合条件随意组合，比如 rate后再sum然后再叠加一个histogram_quantile

## 实时查询的缺点也很明显

- 那就是慢，或者说资源消耗大

## 实时查询的优缺点反过来就是预查询/聚合的优缺点

- 一个预聚合的例子请看我写的falcon组件[监控聚合器系列之: open-falcon新聚合器polymetric](https://segmentfault.com/a/1190000023092934)
- 所有的聚合方法提前定义好，并定时被计算出结果
- 查询时不涉及任何的聚合，直接查询结果
- 比如实时聚合需要每次加载10万个series，预聚合则只需要查询几个结果集

## 那么问题来了prometheus有没有预查询/聚合呢

- 答案是有的

# prometheus的预查询/聚合

- [prometheus record](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- 记录规则允许您预先计算经常需要或计算量大的表达式，并将其结果保存为一组新的时间序列
- 查询预先计算的结果通常比每次需要时执行原始表达式要快得多
- 这对于仪表板特别有用，仪表板每次刷新时都需要重复查询相同的表达式

## record生产实例讲解

```yaml
groups:
- name: my_record
  interval: 30s
  rules:
  - record: hke:heavy_expr:0211d8a2fcdefee8e626c86ba3916281
    expr: sum(delta(kafka_topic_partition_current_offset{instance=~'1.1.1.1:9308', topic=~".+"}[5m])/5) by (topic)

```

- name代表 这个预聚合组的名字
- interval: 30s代表 每30秒执行一次预聚合
- rules代表规则
- record代表聚合之后的metrics 名字，prometheus推荐使用 :代表聚合的的metrics
- expr 代表要执行的promql ，和alert不同就是不用加阈值

## 配置一个预聚合

- 机器的平均cpu利用率

```shell
avg(1 - avg(rate(node_cpu_seconds_total{job=~"node_exporter",mode="idle"}[2m])) by (instance)) * 100
```

- 编写record.yml

```shell
cat <<EOF > /opt/app/prometheus/record.yml
groups:
  - name: example
    rules:
    - record: node_avg_cpu_usage
      expr: avg(1 - avg(rate(node_cpu_seconds_total{job=~"node_exporter",mode="idle"}[2m])) by (instance)) * 100
EOF

```

- check下语法

```shell
[root@prome-master01 prometheus]# ./promtool check rules record.yml 
Checking record.yml
  SUCCESS: 1 rules found

```

- 修改主配置文件加入record
- 查询数据![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755460000/490bdcbfe1cd40cb81f530d1d09d5206.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755460000/14183e22a0884fdab30e892be119fd7d.png)

# 本节重点总结 :

- downsample降采样可以降低查询数据量
  - prometheus原生不支持downsample
- 实时查询/聚合 VS 预查询/聚合的优缺点
  - 实时查询/聚合条件随意组合，性能差
  - 预查询/聚合 性能好，聚合条件需要提前定义
- prometheus的预查询/聚合配置举例

# 灵魂拷问

- 预聚合不能解决什么问题？
  - 如果instance_query本身就是高基数？

