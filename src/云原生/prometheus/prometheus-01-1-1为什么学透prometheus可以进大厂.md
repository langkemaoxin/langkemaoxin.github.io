---
title: "1.1为什么学透prometheus可以进大厂"
sidebarGroup: "Prometheus"
shortTitle: "01 1.1为什么学透prometheus可以进大..."
order: 1
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 :为什么学透prometheus可以进大厂 - 监控系统在基础架构中的重要位置，如何为其他系统提供决策数据 - 互联网有大厂专门的监控开发团队，2-10人 - prometheus的火热..."
---

> **Prometheus · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :为什么学透prometheus可以进大厂

- 监控系统在基础架构中的重要位置，如何为其他系统提供决策数据
- 互联网有大厂专门的监控开发团队，2-10人
- prometheus的火热程度，作为CNCF顶级项目，是学习go语言的标杆
- 为何大厂监控开发招聘要求熟悉prometheus
- 大厂搞不定的prometheus问题有哪些

# 监控系统在基础架构中的重要位置

> 为资产系统提供统计能力

![01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/37ac351dd10f4984b6118ba6938d6025.png)

> 为k8s平台提供监控数据

![k8s01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/21e0e15759704bb5a12631261f8a0349.png)

> 为灰度发布提供决策数据

![cicd01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/e2f5e8cace994b5bbe6ba20c156540d6.png)

> 提供流量探针数据

![01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/526ee575103d4d78a9849f83414d89c6.png)

- 总结：基础架构不能离开监控系统

# 互联网大厂有专门的监控开发团队

## 专门的监控工程师岗位

![mon01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/5a21aa75795140dcbc01b2a216402923.png)

![mon02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/ca05e775e3e84622a01f338c9d7b256a.png)

## 运维开发工程师中 也会要求监控知识

![mon03.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/43d309565ad24333a9ddd2affccfb9fe.png)

- 熟悉开源的监控软件(Zabbix/Open-Falcon/Prometheus)中的一种；

![mon04.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/5b70ac34160b4021807729855df98aa5.png)

# 为何大厂监控开发招聘要求熟悉prometheus

- prometheus以丰富的promql实时查询聚合引擎
- 强悍的性能：单机千万级别并发写入的qps
- 云原生等特性： k8s监控的不二选择

## prometheus官网主页介绍

![p01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/71a3ad7120e04edf831a50a765dcb52e.png)

## prometheus到底有多火热

- 各个领域的大神给它贡献的exporter   [exporter地址](https://prometheus.io/docs/instrumenting/exporters/)

  - 开源项目的参与者越多说明越火热
- 可以从集成了它sdk的情况来看 [sdk集成情况](https://prometheus.io/docs/instrumenting/exporters/#software-exposing-prometheus-metrics)

  - 集成说明大家认可它，愿意以侵入式的sdk打点暴露指标
- db ranking 给出的数据 [ranking数据](https://db-engines.com/en/ranking/time+series+dbms)

# 大厂搞不定的prometheus问题有哪些

- 存储高可用
- 高基数查询延迟和资源开销高
- 采集端exporter难以管理
- 长期查询降采样
- 配置文件操作麻烦

# 总结

- 监控系统是运维之眼，如同水、电、煤气一般的存在
- 而prometheus作为CNCF顶级项目，和k8s紧密结合已经成为时序监控的老大
- 互联网大厂会组建专门的监控开发团队，少则2人，多则10多人
- 大厂监控开发招聘要求熟悉prometheus
- 同时需要搞定诸如 高可用 ，高并发调优的问题

> 所以掌握prometheus底层原理，并有性能提升实战项目经验可助力斩获大厂监控运维开发offer

