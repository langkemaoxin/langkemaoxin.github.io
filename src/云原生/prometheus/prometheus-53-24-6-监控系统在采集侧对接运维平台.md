---
title: 24.6 监控系统在采集侧对接运维平台
sidebarGroup: Prometheus
shortTitle: 53 24.6 监控系统在采集侧对接运维平台
order: 53
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 监控系统在采集侧对接运维平台 - 服务树充当监控系统的上游数据提供者 - 在运维平台上 可以配置采集任务 - exporter改造成探针型 - 将给exporter传参和修改pr...'
---

> **Prometheus · 第 53 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 监控系统在采集侧对接运维平台
  - 服务树充当监控系统的上游数据提供者
  - 在运维平台上 可以配置采集任务
    - exporter改造成探针型
    - 将给exporter传参和修改prometheus scrape配置等操作页面化

# 监控系统在采集侧对接运维平台

1. 服务树充当监控系统的上游数据提供者
2. 在运维平台上 可以配置采集任务

# 服务树充当监控系统的上游数据提供者

- 服务树提供数据接口，供监控系统查询资源信息
- 通过http/file/consul等服务发现机制将查询到的信息配置到prometheus中
- prometheus采集即可
- 这样所有的资源会打上相关的标签在监控系统中存储

# 运维平台配置采集任务

## 首先应该将prometheus采集器管理成采集池

![.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111525000/efee692faf034a4cb129b16aed14c053.png)

### 创建采集池

> 用户在页面上填写信息

- 采集池的名字
- 池中节点选择
  - 池节点 一对多
  - 一个节点只能属于一个池
- remote_write的地址
- external_label

## 采集任务自助操作

![.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111525000/5be827566d6a4cadaca76f7c66861e4c.png)

- 所有的exporter应该改造为探针型

### 新增采集任务 (以redis为例)

> 用户在采集app页面上点击 redis图标

- 如果之前没拉起这个类型的探针，就拉起redis_exporter进程
- 选择采集池
- 填写采集任务的名称job_name
- 填写采集间隔
- 选择是服务发现类型还是静态类型
  - 配置target目标列表
  - 服务发现配置

# 本节重点总结 :

- 监控系统在采集侧对接运维平台
  - 服务树充当监控系统的上游数据提供者
  - 在运维平台上 可以配置采集任务
    - exporter改造成探针型
    - 将给exporter传参和修改prometheus scrape配置等操作页面化

