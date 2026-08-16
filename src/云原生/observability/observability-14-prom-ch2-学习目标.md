---
title: Prometheus 第2章：学习目标
sidebarGroup: 可观测性
shortTitle: 14 学习目标
order: 14
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第2章（学习目标）合并笔记
---

> **Prometheus · 第 2 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 2.1达到大厂要求的学习目标

# 本节重点介绍 : 学习目标

- 熟悉prometheus 及其生态圈内组件的使用，配置调优
- 能够发现单点问题并有高可用解决方案
- 对时序监控底层原理的理解有较深理解
- 可以进行二次开发or使用golang开发周边项目

# 目标

## 熟悉prometheus 及其生态圈内组件的使用，配置调优

- 可以熟练配置采集常见的对象，特别是k8s相关的配置![p01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854981000/37bf5a208e9842d98d6ff4f91280659e.png)
- 熟练编写promql 查询和告警表达式，熟练运用各种函数![p02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854981000/cb9f203dfb8a4d8580dc7048da841209.png)
- alertmanager路由和分组配置![p03.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854981000/8fedffa275ef444d855309158c412d17.png)
- m3db 集群配置调优，并能解决常见问题如oom![p04.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854981000/99c53b934fc24b0d8ea22047a2f8c8a1.png)![p05.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854981000/13a4d494a7f14ac0a8759784a2a6335c.png)
- 使用如预聚合手段对重查询提速![s08.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854981000/bd1f9950d9f84a0fa5cc75bfda957b7a.png)

## 发现单点问题并有高可用解决方案

- 采集端高可用
- 存储高可用
- 查询告警高可用

## 对时序监控底层原理的理解

- 倒排索引
- 时序数据压缩算法
- 数据聚合的实现

## 二次开发or周边项目

- exporter管控平台
- 监控和服务树整合的平台
- 监控链路配置平台

# 本节重点总结 : 学习目标

- 第一层次：熟悉prometheus 及其生态圈内组件的使用，配置调优
  - prometheus
  - grafana
  - alertmanager
  - m3db
- 第二层次：能够发现单点问题并有高可用解决方案
- 第三层次：对时序监控底层原理的理解有较深理解
  - 采集
  - 传输
  - 存储
  - 查询
  - 告警
- 第四层次：可以进行二次开发or使用golang开发周边项目

