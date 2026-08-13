---
title: 9.2 grafana 上导入模板看图并讲解告警
sidebarGroup: Prometheus
shortTitle: 168 9.2 grafana 上导入模板看图并讲解...
order: 168
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 添加到prometheus采集配置中 - grafana 上导入process-exporter dashboard - 重点指标讲解 添加到prometheus采集配置中 ya...'
---

> **Prometheus · 第 168 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 添加到prometheus采集配置中
- grafana 上导入process-exporter dashboard
- 重点指标讲解

# 添加到prometheus采集配置中

```yaml
  - job_name: 'process-exporter'
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets:
		- process-exporter01:9256
		- process-exporter02:9256
```

# grafana 上导入process-exporter dashboard

- 地址 https://grafana.com/grafana/dashboards/4202
- 备选 https://grafana.com/grafana/dashboards/10317

  - 变量替换
  - label_values(namedprocess_namegroup_num_procs, instance)
  - label_values(namedprocess_namegroup_cpu_seconds_total{instance=~"$host"},groupname)
- 举例图片

# 重点指标讲解

- 进程个数 namedprocess_namegroup_num_procs
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511262000/2eebf7a289e2406aa6ac79f29d4ec0dc.png)
- 进程cpu用户态使用秒数 sum by( groupname)  rate(namedprocess_namegroup_cpu_seconds_total{groupname=~".+"}[10m])
- 疑似结论是 100毫秒对应1个核？
- 常驻内存 namedprocess_namegroup_memory_bytes{groupname=~".+", memtype="resident"}
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511262000/5ad03670a35c4739b5a0ac3c2d3bd952.png)
- 读io rate(namedprocess_namegroup_read_bytes_total{groupname=~".+"}[5m])
- 写io rate(namedprocess_namegroup_write_bytes_total{groupname=~".+"}[5m])

# 本节重点总结 :

- 添加到prometheus采集配置中
- grafana 上导入process-exporter dashboard
- 重点指标讲解

