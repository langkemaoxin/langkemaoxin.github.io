---
title: "14.2 k8s中我们都需要监控哪些组件"
sidebarGroup: "Prometheus"
shortTitle: "18 14.2 k8s中我们都需要监控哪些组件"
order: 18
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - k8s中关注四大块指标总结 - 容器基础资源指标 - k8s资源指标 - k8s服务组件指标 - 部署在pod中业务埋点指标 k8s关注指标分析 k8s中组件复杂，我们主要专注的..."
---

> **Prometheus · 第 18 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- k8s中关注四大块指标总结
    - 容器基础资源指标
    - k8s资源指标
    - k8s服务组件指标
    - 部署在pod中业务埋点指标

# k8s关注指标分析
**k8s中组件复杂，我们主要专注的无外乎四大块指标：**
##  容器基础资源指标
### 为何关注这些指标
- 我们的应用从独享一台机器上迁移到k8s中
- 我们首要关心的肯定还是这个应用占用的基础资源指标
- 比如我这个应用使用了多少cpu、多少内存、使用多少存储等。

### 容器采集细节
- 在机器上这些指标原来是由`node_exporter`采集到的
- 我们知道`node_exporter`是通过查看`/proc/stats`等一些列伪文件系统计算相关指标来完成单机级别的采集的。
- 一个pod对应多个容器运行在宿主机上，其实对应就是一个个单独的进程。那么采集到每个进程的cpu内存等信息就是对应容器的指标。
- 具体就是拿到进程的pid，通过查看pid下面的伪文件系统`/proc/<pid>/stats`完成采集。

### 指标举例
- 容器cpu闲置率，举例图片
- 容器内存利用率，举例图片

## k8s资源指标
### 为何关注这些指标

- 同时我们的应用很少会直接以pod形式跑着k8s中
- 更多的是以deployment、daemonset、statefulset 部署
- 那么我们也需要关注下这些k8s资源的相关指标，比如使用了多少个deployment，运行的副本数，健康状况等。

### 采集细节
- 这些指标都来自于[kube-stats-metrics项目](https://github.com/kubernetes/kube-state-metrics) 

### 指标举例
- 比如查看下因为拉取镜像失败导致waiting的容器 `kube_pod_container_status_waiting_reason{reason="ErrImagePull"}==1`
- 查看下发生oom的容器 `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}==1`
- 最近十分钟内有重启 `(kube_pod_container_status_restarts_total - kube_pod_container_status_restarts_total offset 10m >= 1)`
- 比如查看节点因为内存有压力不可用 `kube_node_status_condition{condition="MemoryPressure",status="true"}==1`

## k8s服务组件指标
### 为何关注这些指标
- 在搭建k8s集群过程中我们知道，master节点上运行着 apiserver、etcd、kube-scheduler、kube-controller-manager，由它们组成服务组件
- 那么k8s的运维管理人员肯定要关注下它们的运行状况。
- 站在k8s集群管理员的角度，服务组件的健康状况需要额外的关注。
### 采集细节
- 这些指标都来自于[kube-stats-metrics项目](https://github.com/kubernetes/kube-state-metrics) 

### 指标举例

- 在监控apiserver时，我们可以重点关注四大黄金指标：延迟、请求qps、错误数、饱和度。
`apiserver_request_total`代表apiserver的请求计数器，所以我们可以使用`sum(rate(apiserver_request_total{job="kubernetes-apiservers",code=~"2.."}[5m]))`来计算apiserver请求成功的qps。
- 所以响应=2xx的qps除以总的qps就是apiserver的请求成功率，表达式如下。可以设置成功率低于95%的告警。
`100 * sum(rate(apiserver_request_total{job="kubernetes-apiservers",code=~"2.."}[5m])) /sum(rate(apiserver_request_total{job="kubernetes-apiservers"}[5m]))`
- 同理也可以关注4xx和5xx的错误qps，表达式如下
`sum(rate(apiserver_request_total{job="kubernetes-apiservers",code=~"[45].."}[5m]))`

## 部署在pod中业务埋点指标

### 为何关注这些指标
- 因为各个业务先的研发会引用prometheus的sdk，将相关指标暴露在pod中，比如支付接口的请求延迟。
- 那么各个业务线的运维人员在使用k8s时需要关注他们的指标

# k8s中关注四大块指标总结

指标类型 | 采集源 | 应用举例  |发现类型| grafana截图
|  ----  | ----  | ---- | ---- | ---- |
容器基础资源指标 | kubelet 内置cadvisor metrics接口 | 查看容器cpu、mem利用率等 |k8s_sd node级别直接访问node_ip|  [容器基础资源](pic/k8s_node.png) |
k8s对象资源指标 | [kube-stats-metrics](https://github.com/kubernetes/kube-state-metrics) (简称ksm) | 具体可以看<br> 看pod状态如pod waiting状态的原因 <br> 数个数如：查看node pod按namespace分布情况 |通过coredns访问域名| [k8s对象资源指标](pic/k8s_obj.png) | 
k8s服务组件指标| 服务组件 metrics接口 | 查看apiserver 、scheduler、etc、coredns请求延迟等 | k8s_sd endpoint级别 | [k8s服务组件指标](pic/k8s_server.png) |
部署在pod中业务埋点指标| pod 的metrics接口 |  依据业务指标场景 | k8s_sd pod级别，访问pod ip的metricspath |

# 本节重点总结 : 
-k8s中关注四大块指标总结
    - 容器基础资源指标
    - k8s资源指标
    - k8s服务组件指标
    - 部署在pod中业务埋点指标

