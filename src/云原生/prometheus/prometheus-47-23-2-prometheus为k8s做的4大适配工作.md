---
title: 23.2 prometheus为k8s做的4大适配工作
sidebarGroup: Prometheus
shortTitle: 47 23.2 prometheus为k8s做的4...
order: 47
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - k8s监控中的4大采集类型总结 - prometheus为k8s监控做的4大适配工作 k8s关注指标分析 在监控每个细分的领域时，我们都要先思考下到底需要关注哪些方面的指标。k8...'
---

> **Prometheus · 第 47 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- k8s监控中的4大采集类型总结
- prometheus为k8s监控做的4大适配工作
    
# k8s关注指标分析
在监控每个细分的领域时，我们都要先思考下到底需要关注哪些方面的指标。k8s中组件复杂，我们主要专注的无外乎四大块指标：容器基础资源指标、k8s资源指标、k8s服务组件指标、部署在pod中业务埋点指标
下面的表格简单列举了下他们的对比。

指标类型 | 采集源 | 应用举例  |发现类型| 
|  ----  | ----  | ---- | ---- | 
容器基础资源指标 | kubelet 内置cadvisor metrics接口 | 查看容器cpu、mem利用率等 |k8s_sd node级别直接访问node_ip| 
k8s对象资源指标 | [kube-stats-metrics](https://github.com/kubernetes/kube-state-metrics) (简称ksm) | 具体可以看<br> 看pod状态如pod waiting状态的原因 <br> 数个数如：查看node pod按namespace分布情况 |通过coredns访问域名| 
k8s服务组件指标| 服务组件 metrics接口 | 查看apiserver 、scheduler、etc、coredns请求延迟等 | k8s_sd endpoint级别 | 
部署在pod中业务埋点指标| pod 的metrics接口 |  依据业务指标场景 | k8s_sd pod级别，访问pod ip的metricspath |

# prometheus为k8s监控做的适配工作
那么prometheus有别于其他时序监控系统在设计之初肯定做了很多适配k8s的工作，我总结一下四点：kubernetes的服务发现、各个组件metrics自暴露+pull采集、采集鉴权的支持、标签relabel能力。下面的表格列举了一下他们的特点。下面我们会详细的分析一下相关配置。

|适配名字|说明|举例|
|:----|:----|:----|
| 各个组件metrics自暴露  | 所有组件将自身指标暴露在各自的服务端口上，prometheus通过pull过来拉取指标 | apiserver:6443/metrics | 
| k8s服务发现  | 通过watch即时发现资源变化  | `  kubernetes_sd_configs:- role: node` | 
| 鉴权  | k8s的组件接口都是要鉴权的，所以k8s的采集器要支持配置鉴权 | 支持配置token和tls证书 | 
| 标签relabel能力  | 过滤服务发现标的  | `labelmap`去掉服务发现标签的长前缀<br> `replace`做替换 <br> `hashmod`做静态分片 |

# 本节重点总结 :
- k8s监控中的4大采集类型总结
- prometheus为k8s监控做的4大适配工作

