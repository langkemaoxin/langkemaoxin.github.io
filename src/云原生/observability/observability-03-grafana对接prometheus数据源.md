---
title: Grafana对接Prometheus数据源
sidebarGroup: 可观测性
shortTitle: 03 Grafana对接Prometheus数据源
order: 3
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 可观测性
  - 云原生
  - 课程笔记
description: 'Grafana对接Prometheus数据源 一、Grafana介绍 二、Grafana安装 2.1 Grafana安装 本次方案使用二进制文件方式安装 ~~~powershell [root@gra...'
---

> **可观测性 · 第 3 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Grafana对接Prometheus数据源

# 一、Grafana介绍

![image-20230625123755192](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625123755192.png)

# 二、Grafana安装

## 2.1 Grafana安装

![image-20230625124204028](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625124204028.png)

![image-20230625124238773](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625124238773.png)

![image-20230625124329285](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625124329285.png)

![image-20230625124713156](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625124713156.png)

> 本次方案使用二进制文件方式安装

~~~powershell
[root@grafana ~]# wget https://dl.grafana.com/oss/release/grafana-10.0.1.linux-amd64.tar.gz
~~~

~~~powershell
[root@grafana ~]# tar xf grafana-10.0.1.linux-amd64.tar.gz
[root@grafana ~]# ls
anaconda-ks.cfg  grafana-10.0.1
~~~

~~~powershell
[root@grafana ~]# mv grafana-10.0.1 /usr/local/src/grafana
[root@grafana ~]# ls /usr/local/src/
grafana
~~~

~~~powershell
[root@grafana ~]# cd /usr/local/src/grafana/
[root@grafana grafana]# ls
bin  conf  LICENSE  NOTICE.md  plugins-bundled  public  README.md  VERSION
~~~

~~~powershell
[root@grafana grafana]# pwd
/usr/local/src/grafana

[root@grafana grafana]# nohup /usr/local/src/grafana/bin/grafana-server --config=/usr/local/src/grafana/conf/defaults.ini --homepath=/usr/local/src/grafana &
~~~

~~~powershell
[root@grafana grafana]# ps aux | grep "grafana"
root      46731  2.6  3.5 1298764 141460 pts/1  Sl   13:01   0:02 grafana server --config=/usr/local/src/grafana/conf/defaults.ini --homepath=/usr/local/src/grafana
~~~

> 也可以使用systemd实现对grafana管理

~~~powershell
注册为系统服务
[root@grafana grafana]# vim /usr/lib/systemd/system/grafana.service
[root@grafana grafana]# cat > /usr/lib/systemd/system/grafana.service << EOF
[Service]
ExecStart=/usr/local/src/grafana/bin/grafana-server --config=/usr/local/src/grafana/conf/defaults.ini --homepath=/usr/local/src/grafana
 
[Install]
WantedBy=multi-user.target
 
[Unit]
Description=grafana
After=network.target
EOF
~~~

~~~powershell
重载/开机自启/查看状态/启动
[root@grafana grafana]# systemctl daemon-reload
[root@grafana grafana]# systemctl enable grafana
[root@grafana grafana]# systemctl status grafana 
[root@grafana grafana]# systemctl start grafana
~~~

~~~powershell
[root@grafana grafana]# lsof -i:3000
[root@grafana grafana]# ps -ef | grep grafana
~~~

## 2.2 Grafana访问

~~~powershell
[root@grafana grafana]# ss -anput | grep ":3000"
tcp    LISTEN     0      4096   [::]:3000               [::]:*                   users:(("grafana",pid=46731,fd=11))
~~~

![image-20230625130858052](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625130858052.png)

![image-20230625130927157](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625130927157.png)

> 提交时会让设置密码，可以设置，也可以直接跳过不设置。

![image-20230625131026139](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625131026139.png)

![image-20230625131135286](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625131135286.png)

# 三、Grafana数据源Prometheus添加

![image-20230625131253426](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625131253426.png)

![image-20230625131403285](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625131403285.png)

![image-20230625132116562](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625132116562.png)

![image-20230625133411854](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625133411854.png)

![image-20230625133707612](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625133707612.png)

![image-20230625133743616](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625133743616.png)

![image-20230625133821168](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625133821168.png)

![image-20230625133909794](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625133909794.png)

# 四、Grafana添加数据仪表盘

![image-20230625140242141](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625140242141.png)

![image-20230625140331063](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625140331063.png)

![image-20230625140752221](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625140752221.png)

![image-20230625140849175](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625140849175.png)

![image-20230625141058347](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625141058347.png)

![image-20230625141140694](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625141140694.png)

![image-20230625141306067](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625141306067.png)

![image-20230625141356110](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625141356110.png)

![image-20230625141424667](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625141424667.png)

![image-20230625145031437](/云原生/observability/observability-03-grafana对接prometheus数据源/image-20230625145031437.png)

