---
title: 6.1 grafana和mysql安装
sidebarGroup: Prometheus
shortTitle: 151 6.1 grafana和mysql安装
order: 151
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - yum 安装mysql 5.7 (为后续mysqld_exporter做准备) - rpm安装grafana，并把grafana db由sqlite 改为mysql 安装mysq...'
---

> **Prometheus · 第 151 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- yum 安装mysql 5.7 (为后续mysqld_exporter做准备)
- rpm安装grafana，并把grafana db由sqlite 改为mysql

# 安装mysql

## yum install mysql 组件最新版本包
```shell script
# 下载mysql源安装包
wget http://dev.mysql.com/get/mysql57-community-release-el7-8.noarch.rpm

# 安装mysql源
yum localinstall mysql57-community-release-el7-8.noarch.rpm -y 

# 检查mysql源是否安装成功
yum repolist enabled | grep "mysql.*-community.*"

# 安装MySQL

yum install mysql-community-server -y 

# 3、启动MySQL服务
systemctl start mysqld

# 查看MySQL的启动状态
systemctl status mysqld

#4、开机启动
systemctl enable mysqld
systemctl daemon-reload

# 5、修改root本地登录密码
# mysql安装完成之后，在/var/log/mysqld.log文件中给root生成了一个默认密码。通过下面的方式找到root默认密码，然后登录mysql进行修改：
grep 'temporary password' /var/log/mysqld.log
mysql -uroot -p

# mysql5.7默认安装了密码安全检查插件(validate_password)，默认密码检查策略要求密码必须包含：大小写字母、数字和特殊符号，
# 并且长度不能少于8位。否则会提示ERROR 1819 (HY000): Your password does not satisfy the current policy requirements错误

# 如果不需要密码策略，添加my.cnf文件中添加如下配置禁用即可：
# 配置默认编码为utf8
# 关闭客户端dns反解

echo -e "validate_password = off\ncharacter_set_server=utf8\ninit_connect='SET NAMES utf8'\nskip-name-resolve\n" >> /etc/my.cnf 
systemctl restart mysqld 

mysql -uroot -p 

## 授权
alter user 'root'@'localhost' identified by '123123';

grant all privileges on *.* to root@'%' identified by '123123' with grant option;
flush privileges;

```

# 安装grafana

## rpm 安装grafana 7
```shell script

# 地址 https://grafana.com/grafana/download
wget -O /opt/tgzs/grafana-7.5.1-1.x86_64.rpm https://dl.grafana.com/oss/release/grafana-7.5.1-1.x86_64.rpm
sudo yum install grafana-7.5.1-1.x86_64.rpm

``` 

## mysql中创建数据库
```shell script
CREATE DATABASE IF NOT EXISTS grafana DEFAULT CHARSET utf8 COLLATE utf8_general_ci;
```

## 修改配置文件 填写mysql路径等
```shell script

vim /etc/grafana/grafana.ini

```

## 启动服务 
```shell script
systemctl start grafana-server
systemctl enable grafana-server
systemctl status grafana-server
```

## 查看日志 有无报错
```shell script
tail -f /var/log/grafana/grafana.log
```

## 浏览器访问
```shell script
http://$Ip:3000/?orgId=1
默认 用户密码 ：admin/admin
```

# 本节重点总结 : 
- yum 安装mysql 5.7 (为后续mysqld_exporter做准备)
- rpm安装grafana，并把grafana db由sqlite 改为mysql

