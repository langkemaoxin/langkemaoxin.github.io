---
title: Prometheus告警Alertmanager组件
sidebarGroup: 可观测性
shortTitle: 04 Prometheus告警Alertmanag...
order: 4
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 可观测性
  - 云原生
  - 课程笔记
description: Prometheus告警Alertmanager组件 一、Alertmanager介绍 实现Prometheus的告警，需Alertmanager这个组件。Alertmanager与Prometheu...
---

> **可观测性 · 第 4 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Prometheus告警Alertmanager组件

# 一、Alertmanager介绍

实现Prometheus的告警，需Alertmanager这个组件。Alertmanager与Prometheus是相互分离的两个组件。所以，Alertmanager需单独安装配置。通过在Prometheus中定义AlertRule（告警规则），Prometheus会周期性的对告警规则进行计算，如果满足告警触发条件就会向Alertmanager发送告警信息。

在Prometheus中一条告警规则主要由告警名称和告警规则两部分组成：

- 告警名称：用户为告警规则命名
- 告警规则：告警规则由PromQL进行定义，其实际意义是当表达式（PromQL）查询结果持续多长时间（During）后出发告警
  Prometheus服务器根据报警规则将警报发送给Alertmanager，然后Alertmanager将静默（silencing）、抑制（inhibition）、分组聚合（aggregation）等消息通过Email、钉钉等发送通知。

- Alertmanager特性
- 分组聚合：分组将同一类型的报警归类单个报警通知 。适用于当系统宕机导致大量报警被同时触发，此时分组机制可将这些被触发的告警合并为一个告警通知，避免一次性发送大量告警通知。
- 静默：提供了一个简单的机制可以快速根据标签对告警进行静默处理。特定时间不会发送告警通知。
- 抑制：指当警报发出后，停止重复发送由此警报引发其他错误的警报的机制。如网络不可达，导致其他服务连接相关警报。

# 二、Alertmanager安装及访问

## 2.1 Alertmanager安装文件获取

![image-20230625171413585](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625171413585.png)

![image-20230625172146167](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625172146167.png)

![image-20230625172220621](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625172220621.png)

![image-20230625172341158](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625172341158.png)

~~~powershell
[root@alertmanager ~]# wget https://github.com/prometheus/alertmanager/releases/download/v0.25.0/alertmanager-0.25.0.linux-amd64.tar.gz
~~~

~~~powershell
[root@alertmanager ~]# tar xf alertmanager-0.25.0.linux-amd64.tar.gz
[root@alertmanager ~]# ls
alertmanager-0.25.0.linux-amd64
~~~

~~~powershell
[root@alertmanager ~]# mv alertmanager-0.25.0.linux-amd64 /usr/local/src/alertmanager
[root@alertmanager ~]# ls /usr/local/src/
alertmanager
~~~

~~~powershell
[root@alertmanager alertmanager]# pwd
/usr/local/src/alertmanager

[root@alertmanager alertmanager]# nohup /usr/local/src/alertmanager/alertmanager --config.file=/usr/local/src/alertmanager/alertmanager.yml &
~~~

~~~powershell
[root@alertmanager alertmanager]# lsof -i tcp:9093
COMMAND     PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
alertmana 15889 root    8u  IPv6  64844      0t0  TCP *:copycat (LISTEN)
~~~

~~~powershell
[root@alertmanager alertmanager]# ps -ef | grep alertmanager
root      15889   3381  0 18:09 pts/1    00:00:00 /usr/local/src/alertmanager/alertmanager --config.file=/usr/local/src/alertmanager/alertmanager.yml
~~~

> 可以把Alertmanager托管给systemd管理，示例如下：

~~~powershell
注册为系统服务
[root@alertmanager alertmanager]# vim /usr/lib/systemd/system/alertmanager.service
[root@alertmanager alertmanager]# cat > /usr/lib/systemd/system/alertmanager.service << EOF
[Service]
ExecStart=/usr/local/src/alertmanager/alertmanager --config.file=/usr/local/src/alertmanager/alertmanager.yml
 
[Install]
WantedBy=multi-user.target
 
[Unit]
Description=alertmanager
After=network.target
EOF
~~~

~~~powershell
重载/开机自启/查看状态/启动
[root@alertmanager alertmanager]# systemctl daemon-reload
[root@alertmanager alertmanager]# systemctl enable alertmanager
[root@alertmanager alertmanager]# systemctl status alertmanager
[root@alertmanager alertmanager]# systemctl start alertmanager
~~~

## 2.2 Alertmanager访问

![image-20230625182402690](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625182402690.png)

# 三、Prometheus集成Alertmanager组件

## 3.1 在Prometheus.yml文件加添加Alertmanager连接配置

~~~powershell
[root@prometheus-server ~]# vim /usr/local/src/prometheus/prometheus.yml
# my global config
global:
  scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  # scrape_timeout is set to the global default (10s).

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - 192.168.10.173:9093   默认为# -alertmanager:9093,修改为alertmanager服务器IP地址+9093
~~~

## 3.2 在Prometheus.yml文件中添加告警规则配置文件位置

~~~powershell
[root@prometheus-server ~]# vim /usr/local/src/prometheus/prometheus.yml

修改如下配置：
# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"
  
  
  
为
# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  - "rules/*.yml"
  
rules为告警规则配置文件所在的目录，需要自行创建，创建位置为 /usr/local/src/prometheus/
~~~

## 3.3 在Prometheus.yml文件中添加监控Alertmanager主机

> 为了对Alertmanager主机进行监控。

~~~powershell
[root@prometheus-server ~]# vim /usr/local/src/prometheus/prometheus.yml

添加如下监控主机配置
scrape_configs:
  ......
  - job_name: "alertmanager"
    static_configs:
      - targets: ["192.168.10.173:9093"]

~~~

## 3.4 重启Prometheus

~~~powershell
[root@prometheus-server ~]# systemctl restart prometheus
~~~

![image-20230625191031681](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625191031681.png)

# 四、配置alertmanager告警邮箱及告警规则

## 4.1 配置alertmanager告警邮箱

> 在配置告警邮箱前，先配置邮箱授权码

~~~powershell
[root@alertmanager alertmanager]# vim alertmanager.yml
[root@alertmanager alertmanager]# cat alertmanager.yml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.126.com:25'
  smtp_from: 'nextgo@126.com'
  smtp_auth_username: 'nextgo@126.com'
  smtp_auth_password: 'RXGFEHFQCLXAMFTP'
  smtp_require_tls: false
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 1m
  receiver: 'mail'
receivers:
- name: 'mail'
  email_configs:
  - to: 'nextgo@126.com'
~~~

~~~powershell
[root@alertmanager alertmanager]# systemctl restart alertmanager
[root@alertmanager alertmanager]# systemctl status alertmanager
~~~

~~~powershell
关于alertmanager.yaml文件的解释如下：
global: #全局设置，配置解决告警时间间隔和邮件发送服务
  resolve_timeout: 5m # 定义持续多长时间未接收到告警标记后，就将告警状态标记为resolved
  smtp_smarthost: 'smtp.126.com:25' # 邮件服务器
  smtp_from: 'nextgo@126.com' # 告警发送邮箱
  smtp_auth_username: 'nextgo@126.com' # 邮箱名
  smtp_auth_password: 'RXGFEHFQCLXAMFTP' # 邮箱认证使用授权码
  smtp_require_tls: false # 是否启动tls
route: # 路由树，每个告警都会在配置的顶级路由中进入路由树，路由树匹配所有报警规则
  group_by: ['alertname'] # 告警过滤中分组标签
  group_wait: 10s # 分组等待的时间
  group_interval: 5m # 上下两组发送告警的间隔时间
  repeat_interval: 1m # 重复发送告警时间，默认为1h,现修改为1分钟
  receiver: 'mail' # 指定告警媒介类型
receivers: # 告警接收器，这里配置接收邮箱地址。
- name: 'mail' # 告警来源自定义名称
  email_configs:
  - to: 'nextgo@126.com' # 指定接收端email
~~~

## 4.2 配置alertmanager告警规则

~~~powershell
[root@prometheus-server ~]# mkdir /usr/local/src/prometheus/rules
~~~

~~~powershell
[root@prometheus-server ~]# vim /usr/local/src/prometheus/rules/node_alerts.yml
[root@prometheus-server ~]# cat /usr/local/src/prometheus/rules/node_alerts.yml
groups:
- name: general.rules
  rules:
  - alert: NodeFilesystemUsage
    expr: 100 - (node_filesystem_free_bytes{mountpoint="/",fstype=~"ext4|xfs"} / node_filesystem_size_bytes{fstype=~"ext4|xfs"} * 100) > 30
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Instance {{ $labels.instance }} : {{ $labels.mountpoint }} 分区使用率过高"
      description: "{{ $labels.instance }} : {{ $labels.job }} : {{$labels.mountpoint}} 这个分区使用大于百分之30% (当前值: {{ $value }})"
~~~

~~~powershell
[root@prometheus-server ~]# systemctl restart prometheus

[root@prometheus-server ~]# systemctl status prometheus
● prometheus.service - promethues
   Loaded: loaded (/usr/lib/systemd/system/prometheus.service; enabled; vendor preset: disabled)
   Active: active (running) since 日 2023-06-25 23:26:05 CST; 8s ago
 Main PID: 111485 (prometheus)
    Tasks: 9
   CGroup: /system.slice/prometheus.service
           └─111485 /usr/local/src/prometheus/prometheus --config.file=/usr/local/src/prometheus/prometheus.yml

6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.281Z caller=head.go:613 level=info component=tsdb msg="WAL segmen...gment=4
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.290Z caller=head.go:613 level=info component=tsdb msg="WAL segmen...gment=4
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.290Z caller=head.go:613 level=info component=tsdb msg="WAL segmen...gment=4
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.290Z caller=head.go:619 level=info component=tsdb msg="WAL replay…87.6423ms
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.292Z caller=main.go:993 level=info fs_type=XFS_SUPER_MAGIC
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.292Z caller=main.go:996 level=info msg="TSDB started"
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.292Z caller=main.go:1177 level=info msg="Loading configuration fi...eus.yml
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.405Z caller=main.go:1214 level=info msg="Completed loading of configurat…µs
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.405Z caller=main.go:957 level=info msg="Server is ready to receiv...uests."
6月 25 23:26:05 prometheus-server prometheus[111485]: ts=2023-06-25T15:26:05.405Z caller=manager.go:941 level=info component="rule manager" ms...ger..."
Hint: Some lines were ellipsized, use -l to show in full.
~~~

~~~powershell
[root@prometheus-server ~]# systemctl restart prometheus
~~~

~~~powershell
关于告警规则的解析说明如下：
groups:
- name: general.rules # 告警规则组名称
  rules: # 定义规则
  - alert: NodeFilesystemUsage # 告警名称，在Alertmanager及邮箱可见。
    expr: 100 - (node_filesystem_free_bytes{mountpoint="/",fstype=~"ext4|xfs"} / node_filesystem_size_bytes{fstype=~"ext4|xfs"} * 100) > 30 # 表达式，获取硬盘使用率 大于30% 触发告警
    for: 1m # 持续时间，表示持续1分钟获取不到信息，则触发报警，0表示不使用持续时间。
    labels: # 定义当前告警规则级别
      severity: warning
    annotations: #注释 告警通知
      summary: "Instance {{ $labels.instance }} : {{ $labels.mountpoint }} 分区使用率过高"
      description: "{{ $labels.instance }} : {{ $labels.job }} : {{$labels.mountpoint}} 这个分区使用大于百分之30% (当前值: {{ $value }})"
      # 调用标签具体附加通知信息，在邮件中可见
~~~

~~~powershell
在相关主机上使用命令创建占用磁盘空间的大文件，以达到测试的目的。
dd if=/dev/zero of=/test bs=1M count=10000
~~~

![image-20230625234358231](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625234358231.png)

![image-20230625234449522](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625234449522.png)

![image-20230625234520368](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625234520368.png)

![image-20230625234556898](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625234556898.png)

![image-20230625235105567](/云原生/observability/observability-04-prometheus告警alertmanager组件/image-20230625235105567.png)

