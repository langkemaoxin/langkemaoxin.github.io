---
title: 13.1 alertmanager核心功能点介绍和安装部署
sidebarGroup: Prometheus
shortTitle: 11 13.1 alertmanager核心功能点...
order: 11
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - alertmanager项目介绍 - 架构介绍 - 核心功能点 - 安装部署 - ui功能介绍 - 配置文件讲解 项目介绍 文档地址 - http[path]'
---

> **Prometheus · 第 11 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- alertmanager项目介绍
    - 架构介绍
    - 核心功能点
- 安装部署
    - ui功能介绍
    - 配置文件讲解

# 项目介绍

## 文档地址
- https://prometheus.io/docs/alerting/latest/alertmanager/
- Alertmanager处理由诸如Prometheus服务器之类的客户端应用程序发送的警报

## alertmanager 架构图
- 架构图

## 核心功能点

|  英文   | 中文 | 含义  | 
|  ----  | ----  | ---- | 
| deduplicating	| 重复数据删除 |	prometheus产生同一条报警<br>发送给多个alm去重后发送  |  
| grouping	| 分组  |	告警可以分组处理，同一个组里共享等待时长等参数<br>可以做告警聚合 |  
| route	| 路由  |路由匹配树，可以理解为告警订阅 |  
| silencing 	| 静默  | 灵活的告警静默，如按tag | 
| inhibition  	| 抑制  | 如果某些其他警报已经触发，则抑制某些警报的通知 <br>如机器down，上面的进程down告警不触发| 
| HA  	| 高可用性  | gossip实现 | 
 
# 搭建单机版本
- 准备service文件
```shell script
cat <<EOF > alertmanager.service
[Unit]
Description="alertmanager"
Documentation=https://alertmanager.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/alertmanager/alertmanager  --config.file=/opt/app/alertmanager/alertmanager.yml  --storage.path=/opt/app/alertmanager/data/

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=alertmanager

[Install]
WantedBy=multi-user.target

EOF
```
- 下载二进制包
```shell script
wget -O /opt/tgzs/alertmanager-0.21.0.linux-amd64.tar.gz https://github.com/prometheus/alertmanager/releases/download/v0.21.0/alertmanager-0.21.0.linux-amd64.tar.gz

```

- ansible部署服务

```shell script
ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=alertmanager-0.21.0.linux-amd64.tar.gz" -e "app=alertmanager"
```

## ui功能介绍 
- 访问ip:9093页面查看
 
## 配置文件讲解

```yaml
global:
  ＃ 如果一个告警不包括EndsAt，经过此时间后，如果尚未更新警报，则可以将警报声明为已恢复。
  ＃ 这对Prometheus的警报没有影响，因为它们始终包含EndsAt。
  resolve_timeout: 5m
  # 默认的httpconfig 如果下面webhook为空的时候用这个
  http_config: {}
  # smtp配置
  smtp_hello: localhost
  smtp_require_tls: true
  # 几个默认支持地址
  pagerduty_url: https://events.pagerduty.com/v2/enqueue
  opsgenie_api_url: https://api.opsgenie.com/
  wechat_api_url: https://qyapi.weixin.qq.com/cgi-bin/
  victorops_api_url: https://alert.victorops.com/integrations/generic/20131114/alert/
route:
  # 代表路由树的默认receiver
  # 匹配不中就走这个
  receiver: web.hook

  # 分组依据，比如按alertname分组
  group_by:
  - alertname
  # 代表新的报警最小聚合时间，第一次来的时候最短间隔
  group_wait: 10s
  # 代表同一个组里面告警聚合时间 同一个group_by 里面不同tag的聚合时间
  
  group_interval: 10s
  # 代表同一个报警(label完全相同)的最小发送间隔
  repeat_interval: 1h
# 抑制规则
# 可以有效的防止告警风暴
# 下面的含义： 当拥有相同 alertname，dev ，instance标签的多条告警触发时
# 如果severity=critical的已出发，抑制severity=warning的
inhibit_rules:
- source_match:
    severity: critical
  target_match:
    severity: warning
  equal:
  - alertname
  - dev
  - instance

# 接受者配置
receivers:
- name: web.hook
  webhook_configs:
  - send_resolved: true
    http_config: {}
    url: http://127.0.0.1:5001/
    max_alerts: 0

# 文本模板
templates: []

```

# 本节重点总结 : 
- alertmanager项目介绍
    - 架构介绍
    - 核心功能点
- 安装部署
    - ui功能介绍
    - 配置文件讲解

