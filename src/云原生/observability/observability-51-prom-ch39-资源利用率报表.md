---
title: Prometheus 第39章：资源利用率报表
sidebarGroup: 可观测性
shortTitle: 51 资源利用率报表
order: 51
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第39章（资源利用率报表）合并笔记
---

> **Prometheus · 第 39 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 39.1 用最近1天的内存平均使用率等出业务资源利用率报表

# 本节重点介绍 :

- 纵向聚合VS横向聚合
- 用最近1天的内存平均使用率等出业务资源利用率报表
  - 为了降低成本
  - 合理配置资源

# 纵向聚合VS横向聚合

## 普通的聚合函数是纵向聚合

- 普通的聚合函数是纵向聚合，也就是多个series进行聚合
- 如求机器的平均cpu user态利用率

```shell
avg(rate(node_cpu_seconds_total{mode="user"}[1m])) by (instance) *100

```

- 内置含义是 所有的CPU 核心按照instance算平均值，就是纵向聚合

```shell

node_cpu_seconds_total{cpu="0", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7967.01
node_cpu_seconds_total{cpu="1", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7498.92
node_cpu_seconds_total{cpu="2", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7342.36
node_cpu_seconds_total{cpu="3", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7162.99
node_cpu_seconds_total{cpu="4", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7108.67
node_cpu_seconds_total{cpu="5", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
6996.87
node_cpu_seconds_total{cpu="6", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
7023.01
node_cpu_seconds_total{cpu="7", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
6846.69
node_cpu_seconds_total{cpu="8", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
6736.39
node_cpu_seconds_total{cpu="9", instance="172.20.70.215:9100", job="node_exporter", mode="user"}
12299.72

```

## agg_over_time 横向聚合

- [文档地址](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)
- 可以立即为这个series的时间数据从左到右应用聚合函数，如最近一天内的平均可用内存大小

```shell
avg_over_time(node_memory_MemAvailable_bytes[1d])
{instance="172.20.70.215:9100", job="node_exporter"} 12803739069.766266
```

# 算机器的使用率

## cpu使用率

### 最近1天内的cpu平均使用率

```shell
avg_over_time((avg(rate(node_cpu_seconds_total{mode="user"}[1m])) by (instance) *100)[1d:1m])

```

- 解读一下，先纵向将所有核数据聚合成instance节点级别
- 然后应用avg_over_time，求得instance节点级别自身 1天的平均值，结果如下

```shell
{instance="172.20.70.205:9100"} 1.619994350365054
{instance="172.20.70.215:9100"} 0.9007331827367474
```

### 最近1天内的cpu最大使用率

```shell
max_over_time((avg(rate(node_cpu_seconds_total{mode="user"}[1m])) by (instance) *100)[1d:1m])

```

- 结果值

```shell

{instance="172.20.70.205:9100"} 3.4466666666655024
{instance="172.20.70.215:9100"} 1.1044444444440966
```

### 最近1天内的cpu最小使用率

```shell
min_over_time((avg(rate(node_cpu_seconds_total{mode="user"}[1m])) by (instance) *100)[1d:1m])

```

- 结果值

```shell

{instance="172.20.70.205:9100"} 1.4244444444452202
{instance="172.20.70.215:9100"} 0.7977777777782142
```

## 内存使用率

### 最近1天内的内存平均使用率

```shell
avg_over_time(((1 - (node_memory_MemAvailable_bytes / (node_memory_MemTotal_bytes)))* 100)[1d:1m])

```

- 结果

```shell

{instance="172.20.70.205:9100", job="node-targets"} 32.282504064024934
{instance="172.20.70.215:9100", job="node_exporter"} 23.12835541813579
```

### 最近1天内的内存最大使用率

```shell
max_over_time(((1 - (node_memory_MemAvailable_bytes / (node_memory_MemTotal_bytes)))* 100)[1d:1m])

```

- 结果

```shell

{instance="172.20.70.205:9100", job="node-targets"} 33.12444929397736
{instance="172.20.70.215:9100", job="node_exporter"} 24.209719182042168

```

### 最近1天内的内存最小使用率

```shell
min_over_time(((1 - (node_memory_MemAvailable_bytes / (node_memory_MemTotal_bytes)))* 100)[1d:1m])

```

- 结果

```shell
{instance="172.20.70.205:9100", job="node-targets"} 31.942019063189264
{instance="172.20.70.215:9100", job="node_exporter"} 22.707273881305955
```

# 使用instant-query脚本查询数据

## python脚本

```python
import json
import time

import requests
import logging

logging.basicConfig(
    format='%(asctime)s %(levelname)s %(filename)s [func:%(funcName)s] [line:%(lineno)d]:%(message)s',
    datefmt="%Y-%m-%d %H:%M:%S",
    level="INFO"
)

def ins_query(host,expr="node_disk_reads_merged_total"):
    start_ts = time.perf_counter()
    uri="http://{}/api/v1/query".format(host)
    g_parms = {
        "query": expr,
    }
    res = requests.get(uri, g_parms)

    if res.status_code!=200:
        msg = "[error_code_not_200]"
        logging.error(msg)
        return
    jd = res.json()
    if not jd:
        msg = "[error_loads_json]"
        logging.error(msg)
        return
    inner_d = jd.get("data")
    if not inner_d:
        return

    result = inner_d.get("result")
    result_series = len(result)
    end_ts = time.perf_counter()
    for index,x in enumerate(result):
        msg = "[series:{}/{}][metric:{}]".format(
            index+1,
            result_series,
            json.dumps(x.get("metric"),indent=4)
        )
        logging.info(msg)
    msg = "Load time: {}  Resolution: {}s   Result series: {}".format(
        end_ts-start_ts,
        15,
        result_series
    )
    logging.info(msg)
if __name__ == '__main__':
    ins_query("192.168.0.106:9090",expr='''max(rate(node_network_receive_bytes_total{origin_prometheus=~"",job=~"node_exporter"}[2m])*8) by (instance)''')
```

# 总结

## 可以将服务分组信息通过服务发现打入监控

- 如之前举例的文件服务发现

```json
[
  {
    "targets": [
      "172.20.70.205:9100"
    ],
    "labels": {
      "account": "aliyun-01",
      "region": "ap-south-1",
      "env": "prod",
      "group": "inf",
      "project": "monitor",
      "stree_gpa": "inf.monitor.prometheus"
    }
  },
  {
    "targets": [
      "172.20.70.215:9100"
    ],
    "labels": {
      "account": "aliyun-02",
      "region": "ap-south-2",
      "env": "prod",
      "group": "inf",
      "project": "middleware",
      "stree_gpa": "inf.middleware.kafka"
    }
  }
]
```

- 通过查询的时候按照 stree_gpa等标签 聚合，就可以得到每个业务组的cpu和内存数据

## 生成业务资源利用率报表

- 最近1天的利用率数据

| 业务组名称        | cpu平均值 | cpu最大值 | cpu最小值 | mem平均值 | mem最大值 | mem最小值 |
| ----------------- | --------- | --------- | --------- | --------- | --------- | --------- |
| inf.bigdata.kafka | 20        | 30        | 10        | 40        | 50        | 35        |
| inf.bigdata.spark | 40        | 60        | 20        | 60        | 80        | 50        |
| web.ad.engine     | 15        | 20        | 8         | 20        | 35        | 16        |

- 由上表可知   inf.bigdata.spark利用率较好， web.ad.engine很差
- web.ad.engine可以缩容，或者减配置

# 本节重点总结 :

- 纵向聚合VS横向聚合
- 用最近1天的内存平均使用率等出业务资源利用率报表
  - 为了降低成本
  - 合理配置资源

