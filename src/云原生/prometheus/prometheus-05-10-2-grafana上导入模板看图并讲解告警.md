---
title: "10.2 grafana上导入模板看图并讲解告警"
sidebarGroup: "Prometheus"
shortTitle: "05 10.2 grafana上导入模板看图并讲解..."
order: 5
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 添加到prometheus采集配置中 - grafana 上导入dashboard - 重点指标讲解 添加到prometheus采集配置中 采用和blackbox-exporte..."
---

> **Prometheus · 第 5 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 添加到prometheus采集配置中
- grafana 上导入dashboard
- 重点指标讲解

# 添加到prometheus采集配置中

## 采用和blackbox-exporter一样的探针配置方式

```yaml
  - job_name: 'redis_exporter'
    static_configs:
      - targets:
        - redis://redis01:6379
        - redis://redis02:6379
    metrics_path: /scrape
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: redis_exporter01:9121
```

# 复制项目grafana json导入大盘图

- 地址 https://raw.githubusercontent.com/oliver006/redis_exporter/master/contrib/grafana_prometheus_redis_dashboard.json

# grafana 商城导入

- 地址 https://grafana.com/grafana/dashboards/763
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/6e1db083925f4c47b9001ca4ddba6c77.png)

# 核心指标讲解

- 连接的客户端数 redis_connected_clients
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/9027569cbcf64aa2be65f37932203873.png)
- 内存使用率 100 * (redis_memory_used_bytes  / redis_memory_max_bytes )
- 命令执行qps  rate(redis_commands_processed_total[1m])
  - redis执行命令，把qps打上去 ,0.1秒 执行3条命令，qps 大概在30 左右
  - ```bash
    while true;do 
       redis-cli keys "*"
       redis-cli set a b 
       redis-cli get a  
       sleep 0.1
    done

    ```
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/c315f62fc46947b88f74a3d982764f91.png)
- cache命中qps     irate(redis_keyspace_hits_total[5m])
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/211359de192f4499af62b83f2462999f.png)
- cache 未命中qps  irate(redis_keyspace_misses_total[5m])
- 网络入流量 rate(redis_net_input_bytes_total[5m])
- 网络出流量 rate(redis_net_output_bytes_total[5m])
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/54ad1170676b4e88a44a216d192f45ce.png)
- db中的key数量 sum (redis_db_keys) by (db)
- db中的过期key数量 sum (redis_db_keys_expiring) by (db)
- 每一种命令的qps  topk(5, irate(redis_commands_total[1m]))
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/7fcaed9ec90c4e21984a86705518e0e4.png)

# 本节重点总结 :

- 添加到prometheus采集配置中
- grafana 上导入dashboard
- 重点指标讲解

