---
title: 7.1 使用ansible部署 blackbox_exporter
sidebarGroup: Prometheus
shortTitle: 157 7.1 使用ansible部署 blackb...
order: 157
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - ansible 部署二进制 blackbox_exporter 项目地址 - 项目地址 http[path]'
---

> **Prometheus · 第 157 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- ansible 部署二进制 blackbox_exporter

## 项目地址 
- 项目地址 https://github.com/prometheus/blackbox_exporter
## 下载地址 
```shell script
wget -O  /opt/tgzs/blackbox_exporter-0.18.0.linux-amd64.tar.gz https://github.com/prometheus/blackbox_exporter/releases/download/v0.18.0/blackbox_exporter-0.18.0.linux-amd64.tar.gz

```

##  使用ansible部署 blackbox_exporter
- 准备 service文件
```shell script
cat <<EOF> blackbox_exporter.service
[Unit]
Description=blackbox_exporter Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/blackbox_exporter/blackbox_exporter --config.file=/opt/app/blackbox_exporter/blackbox.yml
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=blackbox_exporter
[Install]
WantedBy=default.target
EOF

```
- 执行ansible-playbook

```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=blackbox_exporter-0.18.0.linux-amd64.tar.gz" -e "app=blackbox_exporter"

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9115
ps -ef |grep blackbox_exporter |grep -v grep 

```

# 本节重点总结 : 
- ansible 部署二进制 blackbox_exporter

