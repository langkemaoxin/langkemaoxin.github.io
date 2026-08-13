---
title: "6.4 设置表格tables"
sidebarGroup: "Prometheus"
shortTitle: "154 6.4 设置表格tables"
order: 154
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - table查询和instant查询 - table中的 transform 操作 - merge 将多行合并成一行 - filter 不要time - overrides操作 -..."
---

> **Prometheus · 第 154 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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
- cpu核数 count(node_cpu_seconds_total{mode='system'}) by (instance)
- cpu 使用率 (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) by (instance)) * 100
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

