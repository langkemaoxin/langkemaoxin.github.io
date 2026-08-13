---
title: "微服务部署前中间件部署"
sidebarGroup: "微服务实战"
shortTitle: "04 微服务部署前中间件部署"
order: 4
date: 2026-08-13
category: "云原生"
tag:
  - "微服务实战"
  - "云原生"
  - "课程笔记"
description: "微服务部署前中间件部署 一、MySQL部署 1.1 使用Docker实现MySQL主从复制 ~~~powershell docker run -p 3307:3306 --name mysql-mas..."
---

> **微服务实战 · 第 4 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 微服务部署前中间件部署

# 一、MySQL部署

## 1.1 使用Docker实现MySQL主从复制

~~~powershell
docker run -p 3307:3306 --name mysql-master \
-v /mydata/mysql/master/log:/var/log/mysql \
-v /mydata/mysql/master/data:/var/lib/mysql \
-v /mydata/mysql/master/conf:/etc/mysql \
-e MySQL_ROOT_PASSWORD=root \
-d mysql:5.7 
~~~

~~~powershell
vim /mydata/mysql/master/conf/my.cnf

[client]
default-character-set=utf8

[mysql]
default-character-set=utf8

[mysqld]
init_connect='SET collation_connection = utf8_unicode_ci'
init_connect='SET NAMES utf8'
character-set-server=utf8
collation-server=utf8_unicode_ci
skip-character-set-client-handshake
skip-name-resolve
~~~

> skip-name-resolve一定要加，不然连接mysql 会慢

~~~powershell
server_id=1
log_bin=mysql-bin
read-only=0
binlog-do-db=mall_oms
binlog-do-db=mall_pms
binlog-do-db=mall_sms
binlog-do-db=mall_ums
binlog-do-db=mall_wms

replicate-ignore-db=mysql
replicate-ignore-db=sys
replicate-ignore-db=information_schema
replicate-ignore-db=performance_schema
~~~

~~~powershell
docker run -p 3317:3306 --name mysql-slaver-01 \
-v /mydata/mysql/slaver/log:/var/log/mysql \
-v /mydata/mysql/slaver/data:/var/lib/mysql \
-v /mydata/mysql/slaver/conf:/etc/mysql \
-e MYSQL_ROOT_PASSWORD=root \
-d mysql:5.7
~~~

~~~powershell
vim /mydata/mysql/slaver/conf/my.cnf

[client]
default-character-set=utf8

[mysql]
default-character-set=utf8

[mysqld]
init_connect='SET collation_connection = utf8_unicode_ci'
init_connect='SET NAMES utf8'
character-set-server=utf8
collation-server=utf8_unicode_ci
skip-character-set-client-handshake
skip-name-resolve
~~~

~~~powershell
server_id=2
log_bin=mysql-bin
read-only=1
binlog-do-db=mall_oms
binlog-do-db=mall_pms
binlog-do-db=mall_sms
binlog-do-db=mall_ums
binlog-do-db=mall_wms

replicate-ignore-db=mysql
replicate-ignore-db=sys
replicate-ignore-db=information_schema
replicate-ignore-db=performance_schema
~~~

~~~powershell
docker restart mysql-master mysql-slaver-01
~~~

为master授权用户实现数据同步

~~~powershell
进入master容器
docker exec -it mysql /bin/bash

访问mysql数据库
mysql -uroot -proot

授权root可以远程访问，为了方便连接使用
grant all privileges on *.* to 'root'@'%' identified by 'root' with grant option;
flush privileges;

添加用于同步用户
grant replication slave on *.* to 'backup'@'%' identified by '123456';

查看master状态
show master status\G;
~~~

配置slaver同步master数据

~~~powershell
进入slaver容器
docker exec -it mysql-slaver-01 /bin/bash

访问mysql数据库
mysql -uroot -proot

授权root可以远程访问，为了方便连接使用
grant all privileges on *.* to 'root'@'%' identified by 'root' with grant option;
flush privileges;

设置主库连接
changer master to
master_host='192.168.56.10'
master_user='backup'
master_password='123456'
master_log_file='mysql-bin.000001'
master_log_pos=0
master_port=3307

启动从库同步
start slave;

查看从库的状态
show slave status\G;
~~~

可以使用kubesphere快速完成MySQL部署

- 有状态服务抽取配置为ConfigMap
- 有状态服务必须使用PVC持久化存储数据
- 服务集群内访问使用DNS提供稳定的域名

## 1.2 通过KubeSphere实现MySQL主从复制部署

### 1.2.1 持久存储准备

![image-20221116150151129](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150151129.png)

#### 1.2.1.1  master节点存储

![image-20221116145939560](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116145939560.png)

![image-20221116150226354](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150226354.png)

![image-20221116150250458](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150250458.png)

![image-20221116150307819](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150307819.png)

![image-20221116150403407](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150403407.png)

![image-20221116150518900](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150518900.png)

![image-20221116150549169](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150549169.png)

![image-20221116150614191](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150614191.png)

#### 1.2.1.2 slave节点存储

![image-20221116150738977](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150738977.png)

![image-20221116150829183](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150829183.png)

![image-20221116150848339](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150848339.png)

![image-20221116150914411](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150914411.png)

![image-20221116150947617](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116150947617.png)

### 1.2.2 配置文件准备

#### 1.2.2.1 master节点配置文件

~~~powershell
[client]
default-character-set=utf8

[mysql]
default-character-set=utf8

[mysqld]
init_connect='SET collation_connection = utf8_unicode_ci'
init_connect='SET NAMES utf8'
character-set-server=utf8
collation-server=utf8_unicode_ci
skip-character-set-client-handshake
skip-name-resolve

server_id=1
log_bin=mysql-bin
read-only=0
binlog-do-db=mall_oms
binlog-do-db=mall_pms
binlog-do-db=mall_sms
binlog-do-db=mall_ums
binlog-do-db=mall_wms

replicate-ignore-db=mysql
replicate-ignore-db=sys
replicate-ignore-db=information_schema
replicate-ignore-db=performance_schema
~~~

![image-20221116151748284](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116151748284.png)

![image-20221116151832779](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116151832779.png)

![image-20221116151939455](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116151939455.png)

![image-20221116152009205](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152009205.png)

![image-20221116152227335](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152227335.png)

![image-20221116152256217](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152256217.png)

![image-20221116152324266](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152324266.png)

#### 1.2.2.2 slave节点配置文件

~~~powershell
[client]
default-character-set=utf8

[mysql]
default-character-set=utf8

[mysqld]
init_connect='SET collation_connection = utf8_unicode_ci'
init_connect='SET NAMES utf8'
character-set-server=utf8
collation-server=utf8_unicode_ci
skip-character-set-client-handshake
skip-name-resolve

server_id=2
log_bin=mysql-bin
read-only=1
binlog-do-db=mall_oms
binlog-do-db=mall_pms
binlog-do-db=mall_sms
binlog-do-db=mall_ums
binlog-do-db=mall_wms

replicate-ignore-db=mysql
replicate-ignore-db=sys
replicate-ignore-db=information_schema
replicate-ignore-db=performance_schema
~~~

![image-20221116151755036](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116151755036.png)

![image-20221116151839773](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116151839773.png)

![image-20221116152433134](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152433134.png)

![image-20221116152517819](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152517819.png)

![image-20221116152624844](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152624844.png)

![image-20221116152659305](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152659305.png)

![image-20221116152720086](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116152720086.png)

### 1.2.3 mysql管理员root用户密码

![image-20221116153603954](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116153603954.png)

![image-20221116153628368](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116153628368.png)

![image-20221116153745835](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116153745835.png)

![image-20221116154945384](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116154945384.png)

![image-20221116155047588](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116155047588.png)

![image-20221116155117578](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116155117578.png)

![image-20221116155140463](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116155140463.png)

### 1.2.4 master部署

![image-20221116161102547](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161102547.png)

![image-20221116161132513](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161132513.png)

![image-20221116161207157](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161207157.png)

![image-20221116161233065](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161233065.png)

![image-20221116161313687](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161313687.png)

![image-20221116161338890](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161338890.png)

![image-20221116161451298](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161451298.png)

![image-20221116161525223](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161525223.png)

![image-20221116161552467](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161552467.png)

![image-20221116161625572](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161625572.png)

![image-20221116161649221](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161649221.png)

![image-20221116161707481](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161707481.png)

![image-20221116161746897](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161746897.png)

![image-20221116161821928](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161821928.png)

![image-20221116161854815](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161854815.png)

![image-20221116161926168](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116161926168.png)

![image-20221116162017205](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116162017205.png)

![image-20221116162049018](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116162049018.png)

![image-20221116162121841](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116162121841.png)

![image-20221116163058054](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116163058054.png)

![image-20221116163208399](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116163208399.png)

![image-20221116164839169](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116164839169.png)

**把配置文件一定要挂载到/etc/mysql/conf.d目录中**

![image-20221116163523448](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116163523448.png)

![image-20221116163552189](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116163552189.png)

![image-20221116163634181](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116163634181.png)

![image-20221116165022423](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116165022423.png)

~~~powershell
# dig -t a mysql-master.sangomall.svc.cluster.local. @10.96.0.10
~~~

### 1.2.5 slaver部署

![image-20221116165826503](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116165826503.png)

![image-20221116165903923](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116165903923.png)

![image-20221116165932009](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116165932009.png)

![image-20221116165952680](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116165952680.png)

![image-20221116170026989](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170026989.png)

![image-20221116170049218](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170049218.png)

![image-20221116170207278](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170207278.png)

![image-20221116170230693](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170230693.png)

![image-20221116170252357](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170252357.png)

![image-20221116170311471](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170311471.png)

![image-20221116170336215](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170336215.png)

![image-20221116170359805](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170359805.png)

![image-20221116170428075](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170428075.png)

![image-20221116170450309](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170450309.png)

![image-20221116170523006](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170523006.png)

![image-20221116170544303](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170544303.png)

![image-20221116170608934](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170608934.png)

![image-20221116170655526](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170655526.png)

![image-20221116170709921](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170709921.png)

![image-20221116170732873](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170732873.png)

![image-20221116170755435](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170755435.png)

![image-20221116170818813](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116170818813.png)

~~~powershell
# dig -t a mysql-slave.sangomall.svc.cluster.local. @10.96.0.10
~~~

### 1.2.6 MySQL主从复制

#### 1.2.6.1 MySQL Master节点授权

![image-20221116171606588](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116171606588.png)

![image-20221116171631986](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116171631986.png)

![image-20221116171659004](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116171659004.png)

![image-20221116171746228](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116171746228.png)

~~~powershell
mysql>grant replication slave on *.* to 'backup'@'%' identified by '123456';
~~~

~~~powershell
mysql>show master status\G;
~~~

![image-20221116173651475](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116173651475.png)

#### 1.2.6.2 MySQL Slave配置

![image-20221116173804766](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116173804766.png)

![image-20221116173836047](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116173836047.png)

![image-20221116173903646](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116173903646.png)

![image-20221116173940708](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116173940708.png)

~~~powershell
mysql>change master to
master_host='mysql-master.sangomall.svc.cluster.local.',
master_user='backup',
master_password='123456',
master_log_file='mysql-bin.000003',
master_log_pos=439,
master_port=3306;
~~~

~~~powershell
mysql>start slave;
~~~

~~~powershell
mysql> show slave status\G;
*************************** 1. row ***************************
               Slave_IO_State: Waiting for master to send event
                  Master_Host: mysql-master.sangomall.svc.cluster.local.
                  Master_User: backup
                  Master_Port: 3306
                Connect_Retry: 60
              Master_Log_File: mysql-bin.000003
          Read_Master_Log_Pos: 439
               Relay_Log_File: mysql-slave-v1-0-relay-bin.000002
                Relay_Log_Pos: 652
        Relay_Master_Log_File: mysql-bin.000003
             Slave_IO_Running: Yes  一定要为Yes
            Slave_SQL_Running: Yes  一定要为Yes
              Replicate_Do_DB:
~~~

#### 1.2.6.3 验证

![image-20221116212248425](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221116212248425.png)

# 二、Redis部署

## 2.1 准备配置PVC

![image-20221117100514426](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100514426.png)

![image-20221117100531721](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100531721.png)

![image-20221117100556510](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100556510.png)

![image-20221117100628121](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100628121.png)

![image-20221117100711803](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100711803.png)

![image-20221117100736679](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100736679.png)

## 2.2 准备配置文件

![image-20221117100942427](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117100942427.png)

![image-20221117101008447](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101008447.png)

![image-20221117101035223](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101035223.png)

![image-20221117101053169](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101053169.png)

![image-20221117101147709](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101147709.png)

![image-20221117101221373](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101221373.png)

![image-20221117101243833](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101243833.png)

## 2.3 部署Redis

![image-20221117101354180](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101354180.png)

![image-20221117101422218](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101422218.png)

![image-20221117101449558](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101449558.png)

![image-20221117101517345](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101517345.png)

![image-20221117101542587](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101542587.png)

![image-20221117101614514](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101614514.png)

![image-20221117101645425](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101645425.png)

![image-20221117101818432](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117101818432.png)

![image-20221117102225292](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102225292.png)

![image-20221117102244408](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102244408.png)

![image-20221117102330969](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102330969.png)

![image-20221117102448090](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102448090.png)

![image-20221117102619529](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102619529.png)

![image-20221117102643463](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102643463.png)

![image-20221117102707428](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102707428.png)

![image-20221117102737287](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117102737287.png)

![image-20221117103430061](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103430061.png)

![image-20221117103501306](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103501306.png)

![image-20221117103713534](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103713534.png)

![image-20221117103746058](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103746058.png)

![image-20221117103809986](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103809986.png)

![image-20221117103831827](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103831827.png)

![image-20221117103856890](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117103856890.png)

~~~powershell
# dig -t a redis.sangomall.svc.cluster.local. @10.96.0.10
~~~

![image-20221117105520889](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117105520889.png)

# 三、ES&Kibana部署

## 3.1 elasticsearch pvc准备

![image-20221117114917705](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117114917705.png)

![image-20221117114942349](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117114942349.png)

![image-20221117115016602](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115016602.png)

![image-20221117115043762](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115043762.png)

![image-20221117115107736](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115107736.png)

![image-20221117115127572](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115127572.png)

## 3.2 elasticsearch 配置文件准备

~~~powershell
http.host: 0.0.0.0
discovery.type: single-node
ES_JAVA_OPTS: -Xms64m -Xmx512m
~~~

![image-20221117115200378](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115200378.png)

![image-20221117115222391](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115222391.png)

![image-20221117115254704](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115254704.png)

![image-20221117115312287](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115312287.png)

![image-20221117115402207](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115402207.png)

![image-20221117115423434](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115423434.png)

![image-20221117115525232](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115525232.png)

![image-20221117115550056](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115550056.png)

![image-20221117115648185](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115648185.png)

![image-20221117115705170](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115705170.png)

![image-20221117115725144](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117115725144.png)

## 3.3 elasticsearch 部署

![image-20221117120506115](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120506115.png)

![image-20221117120640745](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120640745.png)

![image-20221117120710222](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120710222.png)

![image-20221117120729395](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120729395.png)

![image-20221117120811637](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120811637.png)

![image-20221117120836963](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120836963.png)

![image-20221117120927683](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117120927683.png)

![image-20221117121005209](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121005209.png)

![image-20221117121022357](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121022357.png)

![image-20221117121046096](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121046096.png)

![image-20221117121108220](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121108220.png)

![image-20221117121133756](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121133756.png)

![image-20221117121156035](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121156035.png)

![image-20221117121220524](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121220524.png)

![image-20221117121324553](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121324553.png)

![image-20221117121343140](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121343140.png)

![image-20221117121407714](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121407714.png)

![image-20221117121424754](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121424754.png)

![image-20221117121528715](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121528715.png)

![image-20221117121643096](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121643096.png)

## 3.4 kibana部署

~~~powershell
ELASTICSEARCH_HOSTS=http://elasticsearch.sangomall.svc.cluster.local.:9200
~~~

![image-20221117121927093](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121927093.png)

![image-20221117121951165](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117121951165.png)

![image-20221117122014648](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122014648.png)

![image-20221117122034628](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122034628.png)

![image-20221117122116590](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122116590.png)

![image-20221117122143325](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122143325.png)

![image-20221117122220259](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122220259.png)

![image-20221117122242867](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122242867.png)

![image-20221117122327569](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122327569.png)

![image-20221117122351798](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122351798.png)

![image-20221117122409260](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122409260.png)

![image-20221117122431700](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122431700.png)

![image-20221117122456817](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122456817.png)

![image-20221117122604355](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117122604355.png)

## 3.5 kibana访问

![image-20221117132746301](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117132746301.png)

![image-20221117132806869](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117132806869.png)

~~~powershell
lb.kubesphere.io/v1alpha1: openelb
protocol.openelb.kubesphere.io/v1alpha1: layer2
eip.openelb.kubesphere.io/v1alpha2: layer2-eip
~~~

![image-20221117133033262](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117133033262.png)

![image-20221117133344628](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117133344628.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146
reg-test        A       192.168.10.72
kibana  A       192.168.10.73
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221117140625520](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117140625520.png)

# 四、RabbitMQ部署

## 4.1 RabbitMQ持久存储准备 PVC

![image-20221117181804547](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117181804547.png)

![image-20221117181829170](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117181829170.png)

![image-20221117181858069](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117181858069.png)

![image-20221117181929362](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117181929362.png)

![image-20221117181954258](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117181954258.png)

![image-20221117182015755](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182015755.png)

## 4.2 RabbitMQ部署

![image-20221117182141991](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182141991.png)

![image-20221117182221841](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182221841.png)

![image-20221117182253002](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182253002.png)

![image-20221117182317822](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182317822.png)

![image-20221117182908455](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182908455.png)

![image-20221117182938031](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117182938031.png)

![image-20221117183001369](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183001369.png)

![image-20221117183111948](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183111948.png)

![image-20221117183130850](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183130850.png)

![image-20221117183206739](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183206739.png)

![image-20221117183234393](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183234393.png)

![image-20221117183252722](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183252722.png)

![image-20221117183316014](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183316014.png)

![image-20221117183404869](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183404869.png)

![image-20221117183424989](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183424989.png)

![image-20221117183446232](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183446232.png)

![image-20221117184020167](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117184020167.png)

![image-20221117183950931](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117183950931.png)

## 4.3 RabbitMQ访问

![image-20221117190111326](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190111326.png)

![image-20221117190215195](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190215195.png)

![image-20221117190235984](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190235984.png)

![image-20221117190316870](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190316870.png)

![image-20221117190343087](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190343087.png)

![image-20221117190426639](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190426639.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146
reg-test        A       192.168.10.72
rabbitmq        A       192.168.10.72
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221117190608769](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190608769.png)

![image-20221117190635336](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190635336.png)

![image-20221117190703978](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190703978.png)

![image-20221117190719161](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221117190719161.png)

# 五、Nacos部署

## 5.1 Nacos Server数据持久存储 PVC

![image-20221118111424663](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111424663.png)

![image-20221118111454614](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111454614.png)

![image-20221118111527651](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111527651.png)

![image-20221118111603511](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111603511.png)

![image-20221118111634271](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111634271.png)

![image-20221118111659232](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111659232.png)

## 5.2 Nacos Server部署

![image-20221118112157776](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118112157776.png)

![image-20221118112240241](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118112240241.png)

![image-20221118111736543](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118111736543.png)

![image-20221118112009649](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118112009649.png)

![image-20221118112036448](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118112036448.png)

![image-20221118113215225](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113215225.png)

![image-20221118113243442](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113243442.png)

![image-20221201185554705](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221201185554705.png)

![image-20221118113538502](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113538502.png)

![image-20221118113558507](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113558507.png)

~~~powershell
MODE: standalone
~~~

![image-20221118113704296](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113704296.png)

![image-20221118113723496](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113723496.png)

![image-20221118113747089](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113747089.png)

![image-20221118113832199](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113832199.png)

![image-20221118113854448](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113854448.png)

![image-20221118113914190](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113914190.png)

![image-20221118113939071](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118113939071.png)

![image-20221118114330333](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114330333.png)

~~~powershell
# dig -t a nacos-server.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 5.3 Nacos Server访问

![image-20221118114449028](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114449028.png)

![image-20221118114516875](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114516875.png)

![image-20221118114550086](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114550086.png)

![image-20221118114609951](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114609951.png)

![image-20221118114654230](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114654230.png)

![image-20221118114730966](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114730966.png)

![image-20221118114752556](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114752556.png)

![image-20221118114830261](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118114830261.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146
nacos-server    A       192.168.10.72 添加主机记录
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221118121957200](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118121957200.png)

# 六、链路跟踪服务 zipkin

## 6.1 依赖服务检查

![image-20221118132728304](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118132728304.png)

~~~powershell
# dig -t a elasticsearch.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 6.2 zipkin部署

~~~powershell
STORAGE_TYPE: elasticsearch
ES_HOSTS: elasticsearch.sangomall.svc.cluster.local.:9200
~~~

![image-20221118132856523](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118132856523.png)

![image-20221118133053959](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133053959.png)

![image-20221118133132419](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133132419.png)

![image-20221118133153250](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133153250.png)

![image-20221118133340971](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133340971.png)

![image-20221118133422245](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133422245.png)

![image-20221118133557452](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133557452.png)

![image-20221118133625577](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133625577.png)

![image-20221118133647401](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133647401.png)

![image-20221118133745091](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133745091.png)

~~~powershell
# dig -t a zipkin-server.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 6.3 zipkin访问

![image-20221118133905723](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133905723.png)

![image-20221118133947927](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118133947927.png)

![image-20221118134008561](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134008561.png)

![image-20221118134054951](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134054951.png)

![image-20221118134114204](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134114204.png)

![image-20221118134153371](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134153371.png)

![image-20221118134211264](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134211264.png)

![image-20221118134237546](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134237546.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146

zipkin-server    A       192.168.10.72 添加主机记录
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221118134506569](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118134506569.png)

# 七、sentinel 流量卫兵

## 7.1 获取容器镜像

![image-20221118142514104](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142514104.png)

## 7.2 sentinel部署

![image-20221118142605585](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142605585.png)

![image-20221118142628634](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142628634.png)

![image-20221118142709628](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142709628.png)

![image-20221118142728309](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142728309.png)

~~~powershell
bladex/sentinel-dashboard:latest
~~~

![image-20221118142818645](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142818645.png)

![image-20221118142904595](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142904595.png)

![image-20221118142930325](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142930325.png)

![image-20221118142951706](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118142951706.png)

![image-20221118143014238](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143014238.png)

![image-20221118143033786](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143033786.png)

~~~powershell
#  dig -t a sentinel-server.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 7.3 sentinel访问

![image-20221118143157227](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143157227.png)

![image-20221118143230944](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143230944.png)

![image-20221118143249741](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143249741.png)

![image-20221118143330578](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143330578.png)

![image-20221118143401606](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143401606.png)

![image-20221118143423559](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143423559.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146

sentinel-server    A       192.168.10.72 添加主机记录
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221118143621738](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143621738.png)

![image-20221118143741385](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143741385.png)

![image-20221118143833490](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118143833490.png)

# 八、Skywalking部署

## 8.1 获取容器镜像方法及ES服务确认 

### 8.1.1 获取Skywalking oap server及Skywalking ui容器镜像

![image-20221118210853186](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118210853186.png)

![image-20221118211010741](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211010741.png)

### 8.1.2 elasticsearch服务确认

![image-20221118211105436](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211105436.png)

~~~powershell
elasticsearch.sangomall.svc.cluster.local.
~~~

## 8.2 Skywalking oap server部署

![image-20221118211214913](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211214913.png)

![image-20221118211236729](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211236729.png)

![image-20221118211312075](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211312075.png)

![image-20221118211337572](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211337572.png)

![image-20221118211430843](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211430843.png)

**CPU及内存限制要注意：CPU 500m至1000m，内存 100M至2000M**

![image-20221118211537385](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211537385.png)

![image-20221118211609548](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211609548.png)

![image-20221118211629620](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211629620.png)

![image-20221118211809873](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211809873.png)

~~~powershell
SW_STORAGE  elasticsearch

SW_STORAGE_ES_CLUSTER_NODES    elasticsearch.sangomall.svc.cluster.local.:9200
~~~

![image-20221118211832750](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211832750.png)

![image-20221118211853178](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211853178.png)

![image-20221118211913504](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211913504.png)

![image-20221118211933968](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118211933968.png)

![image-20221118212000849](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212000849.png)

~~~powershell
# dig -t a skywalking-oap-server.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 8.3 Skywalking ui部署

![image-20221118212131096](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212131096.png)

![image-20221118212202627](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212202627.png)

![image-20221118212238923](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212238923.png)

![image-20221118212301376](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212301376.png)

![image-20221118212325922](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212325922.png)

![image-20221118212345656](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212345656.png)

![image-20221118212452812](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212452812.png)

![image-20221118212510914](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212510914.png)

![image-20221118212709275](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212709275.png)

![image-20221118212840291](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212840291.png)

~~~powershell
SW_OAP_ADDRESS: http://skywalking-oap-server.sangomall.svc.cluster.local.:12800
~~~

![image-20221118212922595](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212922595.png)

![image-20221118212944881](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118212944881.png)

![image-20221118213004519](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213004519.png)

![image-20221118213709218](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213709218.png)

![image-20221118213731348](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213731348.png)

~~~powershell
# dig -t a skywalking-ui.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 8.4 Skywalking ui访问

![image-20221118213052639](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213052639.png)

![image-20221118213130895](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213130895.png)

![image-20221118213223017](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213223017.png)

![image-20221118213312677](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213312677.png)

![image-20221118213850609](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118213850609.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146
reg-test        A       192.168.10.72
kibana          A       192.168.10.72
rabbitmq        A       192.168.10.72
nacos-server    A       192.168.10.72
zipkin-server   A       192.168.10.72
sentinel-server A       192.168.10.72
skywalking-ui   A       192.168.10.72
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221118210751322](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221118210751322.png)

# 九、RocketMQ部署

## 9.1 rocketmq namesrv存储准备

![image-20221122012106235](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012106235.png)

![image-20221122012143042](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012143042.png)

![image-20221122012212340](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012212340.png)

![image-20221122012235734](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012235734.png)

## 9.2  rocketmq namesrv部署

![image-20221122012318524](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012318524.png)

![image-20221122012344857](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012344857.png)

![image-20221122012438121](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012438121.png)

![image-20221122012459140](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012459140.png)

![image-20221122012614651](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012614651.png)

![image-20221122012640158](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012640158.png)

~~~powershell
启动命令:
 /bin/bash
 参数:
 mqnamesrv
~~~

![image-20221122012722850](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012722850.png)

~~~powershell
环境变量
JAVA_OPT_EXT: -Xms512M -Xmx512M -Xmn128m
~~~

![image-20221122012757996](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012757996.png)

![image-20221122012827630](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012827630.png)

![image-20221122012914640](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012914640.png)

![image-20221122012933363](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012933363.png)

![image-20221122012956026](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122012956026.png)

~~~powershell
dig -t a  rocketmq-namesrv.sangomall.svc.cluster.local. @10.96.0.10
~~~

## 9.3 rocketmq broker存储准备

![image-20221122013024827](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013024827.png)

![image-20221122013053220](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013053220.png)

![image-20221122013128094](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013128094.png)

![image-20221122013154589](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013154589.png)

![image-20221122013218521](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013218521.png)

![image-20221122013243400](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013243400.png)

![image-20221122013316406](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013316406.png)

![image-20221122013350824](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013350824.png)

![image-20221122013414186](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013414186.png)

![image-20221122013435806](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013435806.png)

![image-20221122013459184](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013459184.png)

## 9.4 rocketmq broker部署

![image-20221122013551953](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013551953.png)

![image-20221122013617926](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013617926.png)

![image-20221122013653478](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013653478.png)

![image-20221122013816754](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013816754.png)

![image-20221122013845172](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013845172.png)

~~~powershell
启动命令:
/bin/bash

参数:
mqbroker,-n,rocketmq-namesrv.sangomall.svc.cluster.local.:9876
~~~

![image-20221122013928506](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122013928506.png)

~~~powershell
JAVA_OPT_EXT: -server -Xms128m -Xmx128m -Xmn128m
NAMESRV_ADDR: rocketmq-namesrv.sangomall.svc.cluster.local.:9876
~~~

![image-20221122014021294](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014021294.png)

![image-20221122014043978](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014043978.png)

![image-20221122014124423](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014124423.png)

![image-20221122014141070](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014141070.png)

![image-20221122014225375](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014225375.png)

![image-20221122014253129](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014253129.png)

![image-20221122014319488](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014319488.png)

## 9.5 rocketmq dashboard部署

![image-20221122014353074](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014353074.png)

![image-20221122014412889](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014412889.png)

![image-20221122014443710](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014443710.png)

![image-20221122014607093](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014607093.png)

![image-20221122014641959](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014641959.png)

~~~powershell
JAVA_OPTS: -Drocketmq.namesrv.addr=rocketmq-namesrv.sangomall.svc.cluster.local.:9876
~~~

![image-20221122014737581](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014737581.png)

![image-20221122014802165](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014802165.png)

![image-20221122014820149](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014820149.png)

![image-20221122014844953](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122014844953.png)

## 9.6 rocketmq dashboard创建应用路由

![image-20221122015016869](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122015016869.png)

![image-20221122011453940](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122011453940.png)

![image-20221122011607386](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122011607386.png)

![image-20221122011648238](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122011648238.png)

![image-20221122011411836](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122011411836.png)

![image-20221122011734139](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122011734139.png)

## 9.7 rocketmq dashboard访问

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146
reg-test        A       192.168.10.72
kibana          A       192.168.10.72
rabbitmq        A       192.168.10.72
nacos-server    A       192.168.10.72
zipkin-server   A       192.168.10.72
sentinel-server A       192.168.10.72
skywalking-ui   A       192.168.10.72
rocketmq-dashboard      A       192.168.10.72
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221122011253258](/云原生/microservices/microservices-04-微服务部署前中间件部署/image-20221122011253258.png)

