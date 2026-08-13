---
title: 4.6 实用promql介绍
sidebarGroup: Prometheus
shortTitle: 129 4.6 实用promql介绍
order: 129
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : prometheus promql简单的总结 - topk 最值 - absent nodata报警 - offset 同环比 - 分位值histogram_quantile - 成...'
---

> **Prometheus · 第 129 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

- 举例：apiserver 请求成功率`` 100* ( sum(prometheus_http_requests_total{code=~"2.*|3.*"})/  sum(prometheus_http_requests_total) )``
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

