---
title: 6.5 使用变量查询
sidebarGroup: Prometheus
shortTitle: 155 6.5 使用变量查询
order: 155
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - grafana设置变量 - 变量类型 - label_values函数 - prometheus查询语句 - 变量嵌套 - 变量应用于图表 变量 - 变量类型 - 查询语句中切换...'
---

> **Prometheus · 第 155 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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
- 变量嵌套   label_values(node_network_info{instance="$ins"},device)
- 变量应用于图表

