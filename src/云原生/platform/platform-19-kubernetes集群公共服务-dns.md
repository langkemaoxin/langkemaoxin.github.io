---
title: kubernetes集群公共服务 DNS
sidebarGroup: 平台与实战
shortTitle: 19 kubernetes集群公共服务 DNS
order: 19
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: kubernetes集群公共服务 DNS 一、软件安装 ~~~powershell yum -y install bind ~~~ 二、软件配置 2.1 主配置文件修改 ~~~powershell v...
---

> **微服务实战 · 第 15 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kubernetes集群公共服务 DNS

# 一、软件安装

~~~powershell
# yum -y install bind
~~~

# 二、软件配置

## 2.1 主配置文件修改

~~~powershell
# vim /etc/named.conf
# cat -n /etc/named.conf
     1  //
     2  // named.conf
     3  //
     4  // Provided by Red Hat bind package to configure the ISC BIND named(8) DNS
     5  // server as a caching only nameserver (as a localhost DNS resolver only).
     6  //
     7  // See /usr/share/doc/bind*/sample/ for example named configuration files.
     8  //
     9  // See the BIND Administrator's Reference Manual (ARM) for details about the
    10  // configuration located in /usr/share/doc/bind-{version}/Bv9ARM.html
    11
    12  options {
    13          listen-on port 53 { 127.0.0.1;any; }; 添加any;
    14          listen-on-v6 port 53 { ::1; };
    15          directory       "/var/named";
    16          dump-file       "/var/named/data/cache_dump.db";
    17          statistics-file "/var/named/data/named_stats.txt";
    18          memstatistics-file "/var/named/data/named_mem_stats.txt";
    19          recursing-file  "/var/named/data/named.recursing";
    20          secroots-file   "/var/named/data/named.secroots";
    21          allow-query     { localhost;any; }; 添加any;
~~~

## 2.2 添加域名注册

~~~powershell
# vim /etc/named.rfc1912.zones
# tail -5 /etc/named.rfc1912.zones
zone "mashibing.com" IN {
        type master;
        file "mashibing.com.zone";
        allow-update { none; };
};
~~~

## 2.3 正向查询区域文件

~~~powershell
# cd /var/named
# cp -p named.localhost mashibing.com.zone
# vim mashibing.com.zone 
# cat  mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
~~~

# 三、开启服务

~~~powershell
# systemctl enable --now named
~~~

# 四、主机网络DNS服务器配置

~~~powershell
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
# tail -5 /etc/sysconfig/network-scripts/ifcfg-ens33
IPADDR="192.168.10.143"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="192.168.10.143" 添加本地DNS
DNS2="119.29.29.29"
~~~

~~~powershell
# systemctl restart network
~~~

# 五、域名解析

~~~powershell
# nslookup
> server 输入server，查看本地DNS server服务器
Default server: 192.168.10.143
Address: 192.168.10.143#53
Default server: 119.29.29.29
Address: 119.29.29.29#53

> ns.mashibing.com 输入ns.mashibing.com域名，用于解析
Server:         192.168.10.143
Address:        192.168.10.143#53

Name:   ns.mashibing.com
Address: 192.168.10.143
~~~

# 六、K8S集群主机网络DNS配置

~~~powershell
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
# tail -5 /etc/sysconfig/network-scripts/ifcfg-ens33
IPADDR="192.168.10.14X"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="192.168.10.143" 添加本地DNS
DNS2="119.29.29.29"
~~~

