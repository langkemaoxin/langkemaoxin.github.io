---
title: 40.1 高基数查询原因总结和判定高基数的依据
sidebarGroup: Prometheus
shortTitle: 130 40.1 高基数查询原因总结和判定高基数的依...
order: 130
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 高基数查询举例 - 高基数查询原因总结 - 压缩放大叠加数据量 - 高基数的危害实例 - 判定高基数的依据 什么是高基数查询 - 来个 最直观的对比 - {__name__=~...'
---

> **Prometheus · 第 130 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 高基数查询举例
- 高基数查询原因总结
  - 压缩放大叠加数据量
- 高基数的危害实例
- 判定高基数的依据

# 什么是高基数查询

- 来个 最直观的对比
  - {__name__=~".*a.*"}
  - node_arp_entries
  - ![h_zhi.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/08af1ed356fa41198b24d5e5f66c7845.png)
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/60fb0b26f06f472d9d613c7a691ac05f.png)
  - 就是因为查询所有指标的12小时数据，前端浏览器卡死了，后台机器load1直接飙涨到18
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/da8f564c6f7d4499bd4779f491bf93d2.png)
- 通俗的说就是返回的series或者查询到的series数量过多
- 查询表现出来返回时间较长，对应调用服务端资源较多的查询
- 数量多少算多 10w~100w
- 一般我们定义在1小时内的range_query 响应时间超过`3秒`则认为较重了

# 高基数查询举例

- `{__name__=~".+"}`![high01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/15e9d1c543c34ea4baf4d3c05ce8825d.png)
- 生产举例 这就是一个典型的heavy_query![high02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/f3cec972ab054cc7befffa5f876461d7.png)
- 可以看到去掉histogram_quantile/rate等agg方法后查询一小时的metric传输数据达到12.8MB，可见数据量之大![high03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/4b7a67b8bd1e482991da16b60d85c492.png)
- 查询instance_query可以看到命中了1.8w个series![high04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/9e16d0c5d3b74c53b8631afc2d1be773.png)

## prometheus range_query过程

请看这篇文章，写的很清楚了[详解Prometheus range query中的step参数](https://segmentfault.com/a/1190000017553625)

## prometheus 查询limit限制参数

- --storage.remote.read-sample-limit=5e7 remote_read时单一query的最大加载点数
- --storage.remote.read-concurrent-limit remote_read并发query数目
- --storage.remote.read-max-bytes-in-frame=1048576  remote_read时单一返回字节大小
- --query.max-concurrency=20 prometheus 本身并发读请求
- --query.max-samples=50000000  prometheus 单一query的最大加载点数

# 高基数查询原因总结

## 资源原因

- 因为tsdb都有压缩算法对datapoint压缩，比如dod 和xor
- 那么当查询时数据必然涉及到解压放大的问题
- 比如压缩正常一个datapoint大小为16byte
- 一个heavy_query加载1万个series，查询时间24小时，30秒一个点来算，所需要的内存大小为 439MB，所以同时多个heavy_query会将prometheus内存打爆，prometheus也加了上面一堆参数去限制![high05.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/42a775890eb248e3936565d5f2457e13.png)
- 当然除了上面说的queryPreparation过程外，查询时还涉及sort和eval等也需要耗时

# 高基数的危害实例

## oom 和内核态cpu暴涨

![mo02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/9e8f5555c271406fba8bf3eaf577d159.png)

- node cpu kernel 暴涨![mo04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/068750b7372a46b8b8dff6bdeadd8382.png)
- 资源飙升![oom1000.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/1d1eda52730b402594cfe089efd94b61.png)

# 判定高基数的依据

## 方法一 tsdb的统计接口

- http://192.168.43.114:9090/tsdb-status
- ![get_h01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/9256d691036045148ec005713da8c5b1.png)
- 接口地址`/api/v1/status/tsdb`
- 是基于内存中的倒排索引 算最大堆取 top10
- 10个最多的metric_name排序

```shell
seriesCountByMetricName: [{name: "namedprocess_namegroup_memory_bytes", value: 245},…]
0: {name: "namedprocess_namegroup_memory_bytes", value: 245}
1: {name: "namedprocess_namegroup_states", value: 245}
2: {name: "mysql_global_status_commands_total", value: 148}
3: {name: "namedprocess_namegroup_context_switches_total", value: 98}
4: {name: "namedprocess_namegroup_cpu_seconds_total", value: 98}
5: {name: "node_scrape_collector_success", value: 80}
6: {name: "node_scrape_collector_duration_seconds", value: 80}
7: {name: "namedprocess_namegroup_threads_wchan", value: 73}
8: {name: "namedprocess_namegroup_thread_cpu_seconds_total", value: 66}
9: {name: "namedprocess_namegroup_thread_io_bytes_total", value: 66}
```

- 思考采集器如果不是prometheus怎么办？
  - 比如m3db没有提供高基数查询的接口

## 方法二 query_log

- 可以根据log中的queryPreparationTime来定位

## 方法三 通过count统计

```shell
topk(5,count({__name__=~".+"}) by(__name__) > 100 )
```

- scrape_samples_scraped 可以说明job的instance维度sample数量，也能够定位

# 本节重点总结 :

- 高基数查询举例
- 高基数查询原因总结
  - 压缩放大叠加数据量
- 高基数的危害实例
- 判定高基数的依据

