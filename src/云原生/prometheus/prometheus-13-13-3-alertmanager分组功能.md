---
title: 13.3 alertmanager分组功能
sidebarGroup: Prometheus
shortTitle: 13 13.3 alertmanager分组功能
order: 13
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 启动3个alert_receive接收端 - 在alertmanager配置文件中编写相关路由 - prometheus编写rule文件触发告警 - 观察3个接收端 - 5001...'
---

> **Prometheus · 第 13 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 启动3个alert_receive接收端
- 在alertmanager配置文件中编写相关路由
- prometheus编写rule文件触发告警
- 观察3个接收端
  - 5001 收到 alert_g_1
  - 5002 收到 alert_g_2
  - 5003 收到 alert_g_1 和 alert_g_2

# 分组说明

- alertmanager可以根据设置的路由将告警可以分组处理，发送给对应的接收端
- 三个接收组
  - sre_system接收机器告警，对应 job=node_exporter
  - sre_dba接收数据库告警，对应 job=mysqld_exporter
  - sre_all接收所有告警，对应 job=~ .*

# 分组实验

## 启动多个告警的webhook接收端，对应多个receiver

- 之前我们写的alert_receive.go，编译成 alert_receive二进制
- --addr指定 地址启动3个进程
  - ./alert_receive --addr=:5001
  - ./alert_receive --addr=:5002
  - ./alert_receive --addr=:5003

## 在alertmanager配置文件中编写相关路由

```shell
# 写配置文件
cat <<-"EOF" > /opt/app/alertmanager/alertmanager.yml
global:
  resolve_timeout: 30m

route:
  group_by: ['alertname']
  group_wait: 5s
  group_interval: 5s
  repeat_interval: 1h
  receiver: 'sre_all'
  routes:                                       #子路由，父路由的所有属性都会被子路由继承
    - match_re:                                   #此路由在警报标签上执行正则表达式匹配，以捕获与服务列表相关的警报
        job: node_exporter
      receiver: sre_system
      # continue=true 代表继续向下匹配，不然就break了
      continue: true
    - match_re:
        job: mysqld_exporter
      receiver: sre_dba
      continue: true
      # 默认all路由
    - match_re:
        job: .*
      receiver: sre_all
      continue: true

receivers:
- name: 'sre_system'
  webhook_configs:
  - url: 'http://127.0.0.1:5001/alert'
- name: 'sre_dba'
  webhook_configs:
  - url: 'http://127.0.0.1:5002/alert'
- name: 'sre_all'
  webhook_configs:
  - url: 'http://127.0.0.1:5003/alert'
EOF

# reload
curl -X POST -vvv  localhost:9093/-/reload

```

- 解读一下
- job=node_exporter 由 sre_system处理  5001端口
- job=mysqld_exporter  由 sre_dba处理 5002端口
- 所有的告警 由 sre_all处理 5003端口
- 重新加载alertmanager配置文件

## 准备prometheus 规则文件，触发告警

### 准备rule文件

```shell
cat <<EOF > /opt/app/prometheus/rule.yml
groups:
- name: alert_g_1
  rules:
  - alert: node_load too high
    expr:  node_memory_Active_bytes{instance="192.168.3.200:9100", job="node_exporter"}>0
    labels:
      severity: critical
      node_name: abc
    annotations:
      summary: 机器太累了

- name: alert_g_2
  rules:
  - alert: mysql_qps too high
    expr: mysql_global_status_queries{instance="192.168.3.200:3306", job="mysql_exporter"} >0
    labels:
      severity: warning
      node_name: abc
    annotations:
      summary: mysql太累了

EOF

```

- 其中alert_g_1由job=node_exporter触发
- 其中alert_g_2由job=mysqld_exporter触发

### 修改prometheus主配置文件，生效rule和alertmanager

```shell
# 写配置文件
cat <<EOF > /opt/app/prometheus/prometheus.yml

global:
  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - 172.20.70.215:9093

rule_files:
  - /opt/app/prometheus/rule.yml

scrape_configs:

  - job_name: node_exporter
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    #metrics_path: /metrics
    #scheme: http
    static_configs:
    - targets:
      - 172.20.70.205:9100

  - job_name: mysqld_exporter
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    #metrics_path: /metrics
    #scheme: http
    static_configs:

    - targets:
      - 172.20.70.205:9104
EOF

# reload
curl -X POST -vvv  localhost:9090/-/reload

```

# 效果展示

## 期望效果

- 5001 收到 alert_g_1
- 5002 收到 alert_g_2
- 5003 收到 alert_g_1 和 alert_g_2

## 实际效果

- 效果图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511655000/345110d8793c43a4b3b9e1b77e6ee546.png)

# 本节重点总结 : alertmanager分组

- 启动3个alert_receive接收端
- 在alertmanager配置文件中编写相关路由
- prometheus编写rule文件触发告警
- 观察3个接收端
  - 5001 收到 alert_g_1
  - 5002 收到 alert_g_2
  - 5003 收到 alert_g_1 和 alert_g_2

