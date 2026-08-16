---
title: Prometheus 第6章：PromQL 基础
sidebarGroup: 可观测性
shortTitle: 18 PromQL 基础
order: 18
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第6章（PromQL 基础）合并笔记
---

> **Prometheus · 第 6 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 6.1 grafana和mysql安装

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

## 6.2 基础功能介绍

# 本节重点介绍 :

- 数据源操作
- 新增一个数据源
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629015415000/c6bf37cd23c84e01966bacb02a3b14d1.png)
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629015415000/7b1d23c33dc147d784b85c2a5ed66c20.png)
- dashboard操作
- folder操作
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629015415000/51019d919e9e4c7c949e8fd12a5a2dff.png)
- alerting操作
- 用户和组操作
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629015415000/b5c9ba3e26fe4d6793c98c8bb28ca73b.png)

# 本节重点总结 :

- 数据源操作
- dashboard操作
- folder操作
- alerting操作
- 用户和组操作

## 6.3 panel中操作

# 本节重点介绍 :

- 设置单位
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/2cc27e7416db4a1990a5a1328e179c1f.png)
- panel改名
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/bf54a0b10d4e499b9de5ec641a54656b.png)
- 曲线别名
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/e8e6f2729b6a404081cd227f37ecdb14.png)
- 曲线sort
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/b80e73c307d349339a70cad85cb20c3f.png)
- 曲线复制
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/87addd2a22074976a1d96d86201e44a2.png)
- 曲线静默
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/b4c0901cd4d443a4858c31398d42f753.png)
- panel复制
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/24834e258f594fb297b313861ec93fdd.png)设置告警线
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/965e5acf5a06458ebffea4e29569a9d7.png)
- row
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629016476000/6fa5f2541ab74ab3b195b63fff84e143.png)

# 本节重点总结 :

- 设置单位
- panel改名
- 曲线别名
- 曲线sort
- 曲线复制
- 曲线静默
- panel复制
- 设置告警线

## 6.4 设置表格tables

# 本节重点介绍 :

- table查询和instant查询
- table中的 transform 操作
  - merge 将多行合并成一行
  - filter 不要time
- overrides操作
  - 设置单位
  - 设置展示名称
  - 设置阈值
  - 设置背景色

# 查询指标并设置表格

- node_uname_info

```shell
{domainname="(none)", instance="192.168.3.200:9100", job="node_exporter", machine="x86_64", nodename="prome-master01", release="3.10.0-1160.el7.x86_64", sysname="Linux", version="#1 SMP Mon Oct 19 16:18:59 UTC 2020"}

```

- avg(node_uname_info) by(instance,nodename,release)  展示的信息如下
  - ip+port  instance
  - 主机名   nodename
  - 内核版本   release
- 5分钟内存负载 node_load5-0
- cpu核数 count(node_cpu_seconds_total{​mode='system'}) by (instance)
- cpu 使用率 (1 - avg(rate(node_cpu_seconds_total{​mode="idle"}[1m])) by (instance)) * 100
  - 设置阈值和背景色
  - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629021400000/aad0c0d34db946489e63d5f7bc8cccc8.png)
- 总内存 node_memory_MemTotal_bytes-0
  - 设置单位
  - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629021400000/666b6d0f60ef458b9be61ea482663646.png)
- 内存使用率 (1 - (node_memory_MemAvailable_bytes{} / (node_memory_MemTotal_bytes)))* 100
- 网卡出流量 max(rate(node_network_transmit_bytes_total[1m])*8) by (instance)

# 本节重点总结 :

- table查询和instant查询
- table中的 transform 操作
  - merge 将多行合并成一行
  - filter 不要time
  - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629021400000/c3c65dc0cc3847b08d76a17079c7d894.png)
- overrides操作
  - 设置单位
  - 设置展示名称
  - 设置阈值
  - 设置背景色

## 6.5 使用变量查询

# 本节重点介绍 :

- grafana设置变量
  - 变量类型
  - label_values函数
  - prometheus查询语句
- 变量嵌套
- 变量应用于图表

# 变量

- 变量类型![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/f391195b9103432786eb0bfdb0fd56c0.png)
- 查询语句中切换
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/799fff3b727043cfae38297d6d4c66fc.png)
- legend 展示 变量名
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/18a2427150b745629ff7526a237e16d0.png)
- query动态查询变量
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/a6474b2cdace49b19d19d8e886ffdb02.png)
- 机器地址变量，看单个机器
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/f70bd8fae8cc4b3e8447c744941d2a04.png)
- 变量嵌套
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/0364acea50464dc2a4ce41deca854f66.png)
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629022733000/4f6e4458fb684320aad7b2f522875751.png)

# 内存查询语句

- 总内存 node_memory_MemTotal_bytes
- 内存使用率 (1 - (node_memory_MemAvailable_bytes{} / (node_memory_MemTotal_bytes)))* 100
-
- 网卡信息 node_network_info
- 网卡流量 node_network_transmit_bytes_total

# 本节重点总结 :

- grafana设置变量
  - 变量类型 custom  query
  - label_values函数 查询 目标标签的集合
  - prometheus查询语句 /api/v1/series接口
- 变量嵌套   label_values(node_network_info{​instance="$ins"},device)
- 变量应用于图表

## 6.6 使用dashboard商城搜索导入模板

# 本节重点介绍 :

- 模板商城中搜索模板
- 导入模板
- 修改模板

# 大盘模板商城地址 免费的

- 地址 https://grafana.com/grafana/dashboards

# 搜索模板技巧

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629023976000/3dd4493f238440c180267cfe5997d2d9.png)

- 详情
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629023976000/288d9b6472d844a0a4ccccd9c670956b.png)

# 导入dashboard

- 两种导入模式
  - url导入
  - id导入
  - json文件导入

# 导入 node_exporter模板

- https://grafana.com/grafana/dashboards/8919

# 导出模板

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629023976000/54144394898240c787f5f35649393592.png)

# 本节重点总结 :

- 模板商城中搜索模板
- 导入模板
- 修改模板

