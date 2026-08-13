---
title: 3.1 prometheus二进制安装
sidebarGroup: Prometheus
shortTitle: 80 3.1 prometheus二进制安装
order: 80
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 二进制安装prometheus，使用systemd托管服务 二进制安装prometheus 下载prometheus - http[path]'
---

> **Prometheus · 第 80 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 二进制安装prometheus，使用systemd托管服务

# 二进制安装prometheus

> 下载prometheus

- https://github.com/prometheus/prometheus/releases/download/v2.29.1/prometheus-2.29.1.linux-amd64.tar.gz

> 解压到指定目录

```shell
mkdir /opt/app
tar xvf prometheus-2.29.1.linux-amd64.tar.gz -C /opt/app

mv /opt/app/prometheus-2.29.1.linux-amd64 /opt/app/prometheus
```

> 准备service文件

```shell

cat <<-"EOF" > /etc/systemd/system/prometheus.service
[Unit]
Description="prometheus"
Documentation=https://prometheus.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/prometheus/prometheus  --config.file=/opt/app/prometheus/prometheus.yml --storage.tsdb.path=/opt/app/prometheus/data --web.enable-lifecycle

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=655360
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=prometheus

[Install]
WantedBy=multi-user.target
EOF

```

> 启动prometheus 服务

```shell
systemctl daemon-reload
systemctl restart prometheus
systemctl status prometheus

```

> 检查prometheus服务

```shell

# 查看端口 进程 日志
ss -ntlp |grep 9090
ps -ef |grep prometheus |grep -v grep 

tail -100  /var/log/messages |grep prometheus

```

# 本节重点总结 :

- 二进制安装prometheus，使用systemd托管服务

