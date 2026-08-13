---
title: 7.3 多实例采集的说明relabel配置
sidebarGroup: Prometheus
shortTitle: 159 7.3 多实例采集的说明relabel配置
order: 159
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 使用 relabel_configs配置blackbox采集 - http探测指标讲解 使用参数将采集任务配置到prometheus blackbox_exporter 需要传入...'
---

> **Prometheus · 第 159 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 使用 relabel_configs配置blackbox采集
- http探测指标讲解

# 使用参数将采集任务配置到prometheus

## blackbox_exporter 需要传入target 和 module 参数，采用下列方式加入的采集池中

```yaml
  - job_name: 'blackbox-http'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
      target: [prometheus.io,www.baidu.com,172.20.70.205:3000]
    static_configs:
      - targets:
        - 172.20.70.205:9115 
```

## 会发现如此配置之后 实例数据只有blackbox_exporter的地址 而没有target的地址

- prometheus页面查询数据

```shell
probe_duration_seconds{instance="172.20.70.205:9115", job="blackbox-http"}
```

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/b3c825fbea9c492eb68103314a071401.png)

## 正确配置方式

### 使用 relabel_configs 做标签替换

```yaml
scrape_configs:
  - job_name: 'blackbox-http'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    static_configs:
      - targets:
        - http://prometheus.io    # Target to probe with http.
        - https://www.baidu.com   # Target to probe with https.
        - http://172.20.70.205:3000 # Target to probe with http on port 3000.
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 127.0.0.1:9115  # The blackbox exporter's real hostname:port.

```

### 查看效果

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/ffef0289db39496e966fc33c21e784d0.png)

# http探测指标讲解

- probe_http_ssl =1 代表是https
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/38056bab94234ac599ddd2cbe500497f.png)
- probe_http_status_code  状态码
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/9092c9032d29470f9d5bf92785d54243.png)
- probe_http_duration_seconds 分阶段耗时统计
- probe_duration_seconds 总耗时
- probe_success  =1代表成功
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/3edd51937b0d43fab04f0b1efce88862.png)

# 本节重点介绍 :

- 使用 relabel_configs配置blackbox采集
- http探测指标讲解

