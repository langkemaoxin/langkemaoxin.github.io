---
title: 4.5 时间范围选择器
sidebarGroup: Prometheus
shortTitle: 128 4.5 时间范围选择器
order: 128
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 时间范围选择器的正确用法 - prometheus查询返回13位毫秒时间戳 范围向量选择器 Range Vector Selectors - 范围矢量的工作方式与即时矢量一样，不...'
---

> **Prometheus · 第 128 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 时间范围选择器的正确用法
- prometheus查询返回13位毫秒时间戳

# 范围向量选择器 Range Vector Selectors

- 范围矢量的工作方式与即时矢量一样，不同之处在于它们从当前即时中选择了一定范围的样本。语法上，将持续时间附加在[]向量选择器末尾的方括号（）中，以指定应为每个结果范围向量元素提取多远的时间值。
- 只能作用在`counter`上

> 时间范围

```shell
ms -毫秒
s -秒
m - 分钟
h - 小时
d -天-假设一天总是24小时
w -周-假设一周始终为7天
y -年-假设一年始终为365天
```

- 时间范围不能脱离rate等函数，不然会报错

> 直接查询报错   promhttp_metric_handler_requests_total[1m]

```shell
Error executing query: invalid expression type "range vector" for range query, must be Scalar or instant Vector

```

> 需要叠加一个非聚合函数 如 rate irate delta idelta sum 等

- 计算网卡入流量
  rate(promhttp_metric_handler_requests_total[1m])

> 时间范围 ，不能低于采集间隔

- 采集8秒 ，查询3秒则无数据
- rate(promhttp_metric_handler_requests_total[3s])

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937248000/5175af2a9dc04cab9d28d081f31d1afe.png)

# prometheus返回的都是毫秒时间戳

- 10位代表秒时间戳
- 13位代表毫秒时间戳
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628937248000/618d28a25e1c4a6187829f71f0f625c4.png)

# 本节重点总结 : 

- 时间范围选择器的正确用法
- 时间范围 ，不能低于采集间隔
- prometheus查询返回13位毫秒时间戳

