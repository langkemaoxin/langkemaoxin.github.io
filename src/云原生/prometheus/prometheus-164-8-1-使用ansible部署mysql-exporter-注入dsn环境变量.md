---
title: 8.1 使用ansible部署mysql_exporter，注入dsn环境变量
sidebarGroup: Prometheus
shortTitle: 164 8.1 使用ansible部署mysql_e...
order: 164
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - ansible 部署二进制 mysqld_exporter - 通过环境变量传入mysql的连接地址，让 mysqld_exporter采集到 部署 项目地址 - 项目地址 ht...'
---

> **Prometheus · 第 164 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- ansible 部署二进制 mysqld_exporter
- 通过环境变量传入mysql的连接地址，让 mysqld_exporter采集到

# 部署
## 项目地址 
- 项目地址 https://github.com/prometheus/mysqld_exporter
## 下载地址 
```shell script
wget -O  /opt/tgzs/mysqld_exporter-0.12.1.linux-amd64.tar.gz https://github.com/prometheus/mysqld_exporter/releases/download/v0.12.1/mysqld_exporter-0.12.1.linux-amd64.tar.gz

```

## 使用ansible部署 mysql_exporter
```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=mysqld_exporter-0.12.1.linux-amd64.tar.gz" -e "app=mysqld_exporter"

```

## 部署后发现服务未启动 ，报错如下

## mysqld_exporter需要接收 连接地址参数
- 通过环境变量注入，
- 在mysqld_exporter的service 文件中使用环境变量 DATA_SOURCE_NAME

```shell script
# 代表localhost
Environment=DATA_SOURCE_NAME=exporter:123123@tcp/
```

## 同时为了降低数据暴露风险，创建专门的采集用户 exporter，并授权
```shell script
mysql -uroot -p123123

CREATE USER 'exporter'@'%' IDENTIFIED BY '123123' ;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;

```

## 准备 service文件

```shell script
cat <<EOF >mysqld_exporter.service
[Unit]
Description=mysqld_exporter Exporter
Wants=network-online.target
After=network-online.target

[Service]
Environment=DATA_SOURCE_NAME=exporter:123123@tcp/
ExecStart=/opt/app/mysqld_exporter/mysqld_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mysqld_exporter
[Install]
WantedBy=default.target
EOF
```

> 重启mysqld_exporter服务
```shell script
systemctl daemon-reload
systemctl restart mysqld_exporter

```

## 修改service文件
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

## 重启mysqld_exporter服务
```shell script
systemctl daemon-reload
systemctl restart mysqld_exporter

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9104
ps -ef |grep mysqld_exporter |grep -v grep 

```

# 本节重点总结 : 
- ansible 部署二进制 mysqld_exporter
- 通过环境变量传入mysql的连接地址，让 mysqld_exporter采集到

