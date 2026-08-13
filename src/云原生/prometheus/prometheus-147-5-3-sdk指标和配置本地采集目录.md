---
title: 5.3 sdk指标和配置本地采集目录
sidebarGroup: Prometheus
shortTitle: 147 5.3 sdk指标和配置本地采集目录
order: 147
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - prometheus sdk指标简介和如何在node_exporter中禁用 - 节点上自打点数据上报 prometheus sdk指标 promhttp_ 代表访问 /metr...'
---

> **Prometheus · 第 147 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- prometheus sdk指标简介和如何在node_exporter中禁用
- 节点上自打点数据上报

# prometheus sdk指标

## `promhttp_` 代表访问`/metrics` 的http情况
```shell script
[root@prome_master_01 tgzs]# curl  -s  localhost:9100/metrics |grep promhttp_
# HELP promhttp_metric_handler_errors_total Total number of internal errors encountered by the promhttp metric handler.
# TYPE promhttp_metric_handler_errors_total counter
promhttp_metric_handler_errors_total{cause="encoding"} 0
promhttp_metric_handler_errors_total{cause="gathering"} 0
# HELP promhttp_metric_handler_requests_in_flight Current number of scrapes being served.
# TYPE promhttp_metric_handler_requests_in_flight gauge
promhttp_metric_handler_requests_in_flight 1
# HELP promhttp_metric_handler_requests_total Total number of scrapes by HTTP status code.
# TYPE promhttp_metric_handler_requests_total counter
promhttp_metric_handler_requests_total{code="200"} 8
promhttp_metric_handler_requests_total{code="500"} 0
promhttp_metric_handler_requests_total{code="503"} 0

```

## `go_`代表 goruntime 信息等
```shell script
# HELP go_goroutines Number of goroutines that currently exist.
# TYPE go_goroutines gauge
go_goroutines 7
# HELP go_info Information about the Go environment.
# TYPE go_info gauge
go_info{version="go1.15.8"} 1
# HELP go_memstats_alloc_bytes Number of bytes allocated and still in use.
# TYPE go_memstats_alloc_bytes gauge
go_memstats_alloc_bytes 2.781752e+06

```

## `process_`代表 进程信息等
```shell script
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.54
# HELP process_max_fds Maximum number of open file descriptors.
# TYPE process_max_fds gauge
process_max_fds 1024
# HELP process_open_fds Number of open file descriptors.
# TYPE process_open_fds gauge
process_open_fds 9
# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 1.5720448e+07

```

## 禁用golang sdk 指标
- 使用 ` --web.disable-exporter-metrics `

# 节点上自打点数据上报
- `--collector.textfile.directory=""` 配置本地采集目录
- 在采集目录里创建`.prom`文件，[格式说明](https://prometheus.io/docs/instrumenting/exposition_formats/)
```shell script
# 创建目录
mkdir ./text_file_dir
# 准备 prom文件
cat <<EOF > ./text_file_dir/test.prom
# HELP nyy_test_metric just test
# TYPE nyy_test_metric gauge
nyy_test_metric{method="post",code="200"} 1027
EOF

# 启动服务
./node_exporter --collector.textfile.directory=./text_file_dir

# curl查看数据
[root@prome_master_01 tgzs]# curl  -s  localhost:9100/metrics |grep nyy
# HELP nyy_test_metric just test
# TYPE nyy_test_metric gauge
nyy_test_metric{code="200",method="post"} 1027

```

# 本节重点总结 : 
- prometheus sdk指标简介和如何在node_exporter中禁用
- 节点上自打点数据上报

