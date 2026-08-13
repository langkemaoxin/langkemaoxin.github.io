---
title: 29.7 编译运行，读取日志配置看图
sidebarGroup: Prometheus
shortTitle: 79 29.7 编译运行，读取日志配置看图
order: 79
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 编译运行，配置采集和大盘 编译二进制 - 打包后编译 shell go build -o log2metrics main.go 修改配置文件 yaml http_addr: 0...'
---

> **Prometheus · 第 79 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 编译运行，配置采集和大盘

# 编译二进制

- 打包后编译

```shell
go build -o log2metrics main.go
```

# 修改配置文件

```yaml
http_addr: 0.0.0.0:8087
log_level: INFO

log_strategy:
  - metric_name: log_var_log_messages_level_total
    metric_help: /var/log/messages中的日志 total
    file_path: /var/log/messages
    pattern:  ".*"
    func: cnt
    tags:
      level: ".*level=(.*?) .*"

  - metric_name: ngx_acc_code
    metric_help: nginx access日志中的code 数字最大值
    file_path: /var/log/nginx/access.log
    pattern:  '.*\[code=(.*?)\].*'
    func: max

  - metric_name: ngx_acc_code_sum
    metric_help: nginx access日志中的code 数字最大值
    file_path: /var/log/nginx/access.log
    pattern:  '.*\[code=(.*?)\].*'
    func: sum

```

## 修改nginx access log的logfmat

```shell
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '[code=$status] $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

```

# 运行服务

```yaml
./log2metrics 
```

# 查看metrics

- 向nginx日志中追加内容
- ```
  echo "::1 - - [04/Sep/2021:12:21:10 +0800] "GET / HTTP/1.1" [code=504] 4833 "-" "curl/7.29.0" "-"" >> /var/log/nginx/access.log
  ```
- message total

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/4568973b31cd47329e154f79a97b6372.png)

- nginx metrics

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/662f78e0c45449b5b78832a60648eda0.png)

# 配置prometheus采集

```yaml
  - job_name: 'log2metrics'
    honor_timestamps: true
    scrape_interval: 15s
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets:
          - 192.168.3.200:8087
```

# ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/0d1490510d964770a9f4942e96d1d570.png)

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/48e5dcf1daa343a8b2535e5ca5f76bc0.png)

# 配置grafana

# 本节重点总结 :

- 编译运行，配置采集和大盘

