---
title: 10.1 使用ansible部署 redis-exporter
sidebarGroup: Prometheus
shortTitle: 04 10.1 使用ansible部署 redis...
order: 4
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - ansible 部署二进制 redis_exporter 项目地址 - 项目地址 http[path] 下载地址...'
---

> **Prometheus · 第 4 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- ansible 部署二进制 redis_exporter

## 项目地址 
- 项目地址 https://github.com/oliver006/redis_exporter

## 下载地址 
```shell script
wget -O  /opt/tgzs/redis_exporter-v1.20.0.linux-amd64.tar.gz https://github.com/oliver006/redis_exporter/releases/download/v1.20.0/redis_exporter-v1.20.0.linux-amd64.tar.gz

```

## 准备文件 redis_exporter.service
```shell script
cat <<EOF >redis_exporter.service
[Unit]
Description=redis Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/redis_exporter/redis_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=redis_exporter
[Install]
WantedBy=default.target

EOF

```

##  使用ansible部署 redis_exporter

- 执行ansible-playbook

```shell script
ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=redis_exporter-v1.20.0.linux-amd64.tar.gz" -e "app=redis_exporter"

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9121
ps -ef |grep redis_exporter |grep -v grep 

```

# 本节重点介绍 : 
- ansible 部署二进制 redis_exporter

