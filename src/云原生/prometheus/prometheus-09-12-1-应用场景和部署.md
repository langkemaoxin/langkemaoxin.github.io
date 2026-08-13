---
title: "12.1 应用场景和部署"
sidebarGroup: "Prometheus"
shortTitle: "09 12.1 应用场景和部署"
order: 9
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - pushgateway简介 - pushgateway使用场景 - 说白了就是不能使用pull模型的场景 - 安装部署 项目地址 - https://github.com/pro..."
---

> **Prometheus · 第 9 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- pushgateway简介
- pushgateway使用场景
    - 说白了就是不能使用pull模型的场景
- 安装部署

# 项目地址 
- https://github.com/prometheus/pushgateway

## 什么情况下使用pushgateway

- https://prometheus.io/docs/practices/pushing/
- Pushgateway的唯一有效用例是捕获服务级别批处理作业的结果
- pull网络不通，但有[替代方案](https://github.com/prometheus-community/PushProx) 

## pushgateway 注意事项
- 不支持带时间戳上报，会被忽略
- 当通过单个Pushgateway监视多个实例时，Pushgateway既成为单个故障点，又成为潜在的瓶颈。
- Prometheus为每个采集的target生成的up指标无法使用
- Pushgateway永远不会删除推送到其中的系列，除非通过Pushgateway的API手动删除了这些系列，否则它们将永远暴露给Prometheus

# 部署 
##  下载pushgateway 
```shell script

wget -O /opt/tgzs/pushgateway-1.4.0.linux-amd64.tar.gz wget https://github.com/prometheus/pushgateway/releases/download/v1.4.0/pushgateway-1.4.0.linux-amd64.tar.gz
```

## 准备service文件
```shell script
cat <<EOF >/opt/tgzs/pushgateway.service
[Unit]
Description=pushgateway server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/pushgateway/pushgateway
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pushgateway
[Install]
WantedBy=default.target
EOF

```

## 使用ansible部署 pushgateway
```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=pushgateway-1.4.0.linux-amd64.tar.gz" -e "app=pushgateway"

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9091
ps -ef |grep pushgateway |grep -v grep 

```

# 本节重点总结 : 
- pushgateway简介
- pushgateway使用场景
    - 说白了就是不能使用pull模型的场景
- 安装部署

