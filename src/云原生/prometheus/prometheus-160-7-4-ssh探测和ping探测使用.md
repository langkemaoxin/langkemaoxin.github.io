---
title: "7.4 ssh探测和ping探测使用"
sidebarGroup: "Prometheus"
shortTitle: "160 7.4 ssh探测和ping探测使用"
order: 160
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - ssh探测和icmp探测的配置方法 - 探测模块中可以使用query_response，过滤响应中的字符串，来决定探测是否成功 ssh探测 配置方法 yaml - job_nam..."
---

> **Prometheus · 第 160 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- ssh探测和icmp探测的配置方法
- 探测模块中可以使用query_response，过滤响应中的字符串，来决定探测是否成功

# ssh探测

## 配置方法

```yaml
  - job_name: 'blackbox-ssh'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      # 使用ssh_banner模块
      module: [ssh_banner] 
    static_configs:
      - targets:
        - ip1:22   
        - ip2:22  
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox_exporter:9115  # The blackbox exporter's real hostname:port.
```

## 原理解析

- 使用ssh_banner模块，对应tcp探针
- 看配置说明要求返回值中有SSH-2.0-字符串则为探测成功

```yaml
    ssh_banner:
        prober: tcp

        tcp:
            ip_protocol_fallback: true
            query_response:
                - expect: ^SSH-2.0-

```

- 结果截图
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510956000/e24edd3c38014e11b84f93d211231a18.png)
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510956000/a16ce6a512974f2fb6d169fd37aa6816.png)

# icmp探测

## 配置方法

```yaml
  - job_name: 'blackbox_icmp'
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
      - targets:
        - ip1
        - ip2
        - baidu.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 127.0.0.1:9115  # The blackbox exporter's real hostname:port.
```

## 原理解析

- 使用icmp模块，对应icmp探针
- 结果截图
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510956000/966c4c1e88b24d27aa58ba55e54bdf68.png)

# 本节重点总结 :

- ssh探测和icmp探测的配置方法
- 探测模块中可以使用query_response，过滤响应中的字符串，来决定探测是否成功

