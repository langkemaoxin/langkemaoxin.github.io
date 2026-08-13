---
title: "14.1 为什么说k8s中监控更复杂了"
sidebarGroup: "Prometheus"
shortTitle: "17 14.1 为什么说k8s中监控更复杂了"
order: 17
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - k8s中监控变得复杂了，挑战如下 - 挑战1: 监控的目标种类多 - 挑战2: 监控的目标数量多 - 挑战3: 对象的变更和扩缩特别频繁 - 挑战4: 监控对象访问权限问题 k8..."
---

> **Prometheus · 第 17 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- k8s中监控变得复杂了，挑战如下
  - 挑战1: 监控的目标种类多
  - 挑战2: 监控的目标数量多
  - 挑战3: 对象的变更和扩缩特别频繁
  - 挑战4: 监控对象访问权限问题

# k8s架构图

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511808000/cb96c1dbb6794cd6b66898a4f45f200c.png)

## k8s中监控变得复杂了，挑战如下

### 挑战1: 监控的目标种类多

> 对象举例

- pod
- node
- service
- endpoint
- pv
- pvc
- job
- cronjob

> 给监控系统提出的挑战是

- 能否有很好的插件扩展机制，用来快速添加新增的k8s对象的监控

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511808000/6dfa673b9acc4113b960b4adfcbd92fb.png)

### 挑战2: 监控的目标数量多

> 目标多举例

- 几万甚至几十万的pod
- 数万级别的service和endpoint

> 给监控系统提出的挑战是

- 能否有很强悍的写入和查询性能，用来承载海量的监控资源

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511808000/511f1b17c76b46a280e32cbed44fe6c4.png)

### 挑战3: 对象的变更和扩缩特别频繁

> 变更和扩缩频繁举例

- 微服务的上线频繁
- 对象或扩缩十分频繁

> 给监控系统提出的挑战是

- 能否有机制可以及时感知到他们的变化，并且提供简单的配置方式，而不是手动配置

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511808000/bc54310e4eb54cffa2842fde2225971b.png)

### 挑战4: 监控对象访问权限问题

> 访问权限举例

- etcd的指标需要tls双向认证，需要token才能访问的某些接口

> 给监控系统提出的挑战是

- k8s中有复杂的权限体系，监控系统能否很好的适配。并提供一种简单的配置方式

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511808000/26b3301ad6da47ef93bc225a42daf1e3.png)

# 本节重点总结 :

- k8s中监控变得复杂了，挑战如下
  - 挑战1: 监控的目标种类多
  - 挑战2: 监控的目标数量多
  - 挑战3: 对象的变更和扩缩特别频繁
  - 挑战4: 监控对象访问权限问题

