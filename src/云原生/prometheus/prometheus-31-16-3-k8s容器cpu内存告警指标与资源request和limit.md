---
title: "16.3 k8s容器cpu内存告警指标与资源request和limit"
sidebarGroup: "Prometheus"
shortTitle: "31 16.3 k8s容器cpu内存告警指标与资源..."
order: 31
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - Guaranteed的pod Qos最高 - 在生产环境中，如何设置 Kubernetes 的 Limit 和 Request 对于优化应用程序和集群性能至关重要。 - 对于 C..."
---

> **Prometheus · 第 31 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- Guaranteed的pod Qos最高
- 在生产环境中，如何设置 Kubernetes 的 Limit 和 Request 对于优化应用程序和集群性能至关重要。
- 对于 CPU，如果 pod 中服务使用 CPU 超过设置的limits，pod 不会被 kill 掉但会被限制。如果没有设置 limits ，pod 可以使用全部空闲的 CPU 资源。
- 对于内存，当一个 pod 使用内存超过了设置的limits，pod 中 container 的进程会被 kernel 因 OOM kill 掉。

# kubernetes 中的 Qos 合理分配node上的有限资源

## 简介

- QoS(Quality of Service) 即服务质量
- QoS 是一种控制机制，它提供了针对不同用户或者不同数据流采用相应不同的优先级
- 或者是根据应用程序的要求，保证数据流的性能达到一定的水准。kubernetes 中有三种 Qos，分别为：

  - Guaranteed：pod 的 requests 与 limits 设定的值相等；
  - Burstable：pod requests 小于 limits 的值且不为 0；
  - BestEffort：pod 的 requests 与 limits 均为 0；
- 三者的优先级如下所示，依次递增：

```shell
BestEffort -> Burstable -> Guaranteed
```

## 不同 Qos 的本质区别

- 在调度时调度器只会根据 request 值进行调度；
- 二是当系统 OOM上时对于处理不同 OOMScore 的进程表现不同，也就是说当系统 OOM 时，首先会 kill 掉 BestEffort pod 的进程，若系统依然处于 OOM 状态，然后才会 kill 掉 Burstable pod，最后是 Guaranteed pod；

# 资源的requests和limits

- 我们知道在k8s中为了达到容器资源限制的目录，在yaml文件中有cpu和内存的 requests和limits配置
- 对这两个参数可以简单理解为根据requests进行调度，根据limits进行运行限制。
- 举例下面的配置代表cpu 申请100m，限制1000m。内存申请100Mi ，限制2500Mi

```yaml
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 1000m
            memory: 2500Mi
```

### 首先我们应关心这两组limits和requests值

- 下面的表格中反应了`kube-state-metrics` 提供的4个相关指标。

| 指标名称                                          | 含义                     | 单位说明                       |
| ------------------------------------------------- | ------------------------ | ------------------------------ |
| kube_pod_container_resource_requests_cpu_cores    | 容器设置的cpu requests值 | request=100m 代表使用0.1个核心 |
| kube_pod_container_resource_requests_memory_bytes | 容器设置的mem requests值 | 单位：字节                     |
| kube_pod_container_resource_limits_cpu_cores      | 容器设置的cpu limits值   | request=100m 代表使用0.1个核心 |
| kube_pod_container_resource_limits_memory_bytes   | 容器设置的mem limits值   | 单位：字节                     |

## cpu属于可压缩资源

- 在k8s中cpu属于可压缩资源
- 意思是pod中服务使用CPU超过设置的limits
- pod不会被kill掉但会被限制
- 所以我们应该通过观察容器cpu被限制的情况来考虑是否将cpu的limit调大。

### cpu限制率和利用率

> 限制率

- 有这样的两个cpu指标，`container_cpu_cfs_periods_total`代表 container生命周期中度过的cpu周期总数
- `container_cpu_cfs_throttled_periods_total`代表container生命周期中度过的受限的cpu周期总数。
- 所以我们可以使用下面的表达式来查出最近5分钟，超过25%的CPU执行周期受到限制的container有哪些。

```shell
 100 *  sum by(container_name, pod_name, namespace) (increase(container_cpu_cfs_throttled_periods_total{container_name!=""}[5m]))
  / sum by(container_name, pod_name, namespace) (increase(container_cpu_cfs_periods_total[5m]))  > 25
```

- 如果上述ql有查询结果，我们可以考虑将cpu的limit调大

> 利用率

- 同时我们可以用下面的计算方式表示容器cpu使用率
- 其中`container_cpu_usage_seconds_total` 代表cpu的计数器
- `container_spec_cpu_quota`是容器的CPU配额，它的值是容器指定的CPU个数*100000。

```shell
sum(rate(container_cpu_usage_seconds_total{image!=""}[1m])) by (container, pod)  / (sum(container_spec_cpu_quota{image!=""}/100000) by (container, pod)  )* 100

```

## mem属于不可压缩资源

- 在k8s中mem属于不可压缩资源
- pod之间是无法共享的，完全独占的
- 所以一旦容器内存使用超过limits，会导致oom，然后重新调度。

### mem oom 判定依据

- `container_memory_working_set_bytes`是容器真实使用的内存量
- kubelet通过比较 `container_memory_working_set_bytes`和 `container_spec_memory_limit_bytes` 来决定oom container。
- 同时还有 `container_memory_usage_bytes`用来表示容器使用内存，其中包含了很久没用的缓存，该值比 `container_memory_working_set_bytes`要大
- 所以cpu使用率可以使用下面的公式计算

```shell
(container_memory_working_set_bytes/container_spec_memory_limit_bytes )*100
```

# 本节重点总结 :

- Guaranteed的pod Qos最高
  - oom的时候先是 BestEffort 然后是Burstable 最后才 Guaranteed
- 在生产环境中，如何设置 Kubernetes 的 Limit 和 Request 对于优化应用程序和集群性能至关重要。
- 对于 CPU，如果 pod 中服务使用 CPU 超过设置的limits，pod 不会被 kill 掉但会被限制。如果没有设置 limits ，pod 可以使用全部空闲的 CPU 资源。
  - 可以查看cpu限制率来决定是否调大 cpu的limit
  - cpu属于可压缩资源
- 对于内存，当一个 pod 使用内存超过了设置的limits，pod 中 container 的进程会被 kernel 因 OOM kill 掉。
  - mem属于不可压缩资源
  - oom判定的时候是 比较 container_memory_working_set_bytes 而不是 usage
  - usage含有很久未用的缓存，比workingset偏大
- Qos 的目的是为了合理分配node上的有限资源 {cpu和mem上}

