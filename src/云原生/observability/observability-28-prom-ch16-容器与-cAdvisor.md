---
title: Prometheus 第16章：容器与 cAdvisor
sidebarGroup: 可观测性
shortTitle: 28 容器与 cAdvisor
order: 28
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第16章（容器与 cAdvisor）合并笔记
---

> **Prometheus · 第 16 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 16.1 k8s容器基础资源指标采集原理讲解

# 本节重点介绍 :

- 容器采集流程追查
  - 通过容器的内存指标追踪job得知是kubelet进程
  - kubelet进程内置了 cadvisor的代码
  - 底层采集来自cadvisor
- cadvisor架构说明

# 以container_memory_working_set_bytes指标为例

## 在prometheus中查询来自哪个采集任务

```shell

container_memory_working_set_bytes{beta_kubernetes_io_arch="amd64", beta_kubernetes_io_os="linux", container="calico-kube-controllers", id="/kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-podc601e52c_a49b_46e1_a9e7_433749dd722b.slice/cri-containerd-de1f3137b6aa15961b1784b1814bba78fbe4256141791007441cee49d3d139c1.scope", image="sha256:278f40d9f3b82fdb687ddc52dda21682525bd4c814fa3ab670fa44df150a1252", instance="k8s-master01", job="kubernetes-nodes-cadvisor", kubernetes_io_arch="amd64", kubernetes_io_hostname="k8s-master01", kubernetes_io_os="linux", name="de1f3137b6aa15961b1784b1814bba78fbe4256141791007441cee49d3d139c1", namespace="calico-system", node="k8s-master01", pod="calico-kube-controllers-854b9dcf89-gct84"}
```

- 得知是 job="kubernetes-nodes-cadvisor"

## 追踪 job="kubernetes-nodes-cadvisor"

- 查看target页面发现是 来自各个节点,path如下
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629604823000/d3cdb5500dd1474a938f07192931eefc.png)
- 对应的job配置为
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629604823000/c79a73d81255457c9847ef55415e798e.png)

```shell
https://172.20.70.205:10250/metrics/cadvisor
```

## 10250端口是kubelet进程

- 实则是kubelet内置的cadvisor 进程

## 底层采集来自 cadvisor

- 项目 https://github.com/google/cadvisor

# cadvisor介绍

- CAdvisor是Google开源的一款用于展示和分析容器运行状态的可视化工具
- cAdvisor可以对节点机器上的资源及容器进行实时监控和性能数据采集
- 包括CPU使用情况、内存使用情况、网络吞吐量及文件系统使用情况，效果图如下
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629604823000/5995cca4870d42829fc2fa9e7d97ea69.png)

## cadvisor架构图

- 我们知道`node_exporter`是通过查看`/proc/stat`等一些列伪文件系统计算相关指标来完成单机级别的采集的。
- 那么如何采集单个pod占用的cpu、内存等数据呢？想必你也能够想到了
- 一个pod对应多个容器运行在宿主机上，其实对应就是一个个单独的进程
- 那么采集到每个进程的cpu内存等信息就是对应容器的指标。
- 具体就是拿到进程的pid，通过查看pid下面的伪文件系统`/proc/<pid>/stat`完成采集。![cadvisor.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629604823000/5ae1b6434b214056920a7fa8051968ab.png)

# 本节重点总结 :

- 容器采集流程追查
  - 通过容器的内存指标追踪job得知是kubelet进程
  - kubelet进程内置了 cadvisor的代码
  - 底层采集来自cadvisor
- cadvisor架构说明
  - getProcessList 获取全部进程信息
  - 通过容器运行时，拿到所有容器信息的worker
    - /proc/`<pid>/stat` 计算相关指标
  - getMachineInfo 获取机器信息

## 16.2 k8s容器基础资源指标讲解

# 本节重点介绍 :

- 指标分析
  - cpu指标
  - mem指标
  - filesystem && disk.io指标
  - network指标
  - system指标
- container_network_{​tcp,udp}_usage_total 默认不采集是因为 --disable_metrics=tcp, udp ,因为开启cpu压力大[看这里](https://github.com/google/cadvisor/blob/master/docs/runtime_options.md#metrics)

# 指标分析

- 下面的表格对比了prometheus和[夜莺k8s-mon](https://github.com/n9e/k8s-mon) 的指标

### cpu指标

| 夜莺指标名            | 含义                                  | prometheus metrics或计算方式                                                                                                                                                                                                         | 说明                                 |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| cpu.util              | 容器cpu使用占其申请的百分比           | sum (rate (container_cpu_usage_seconds_total[1m])) by( container) /( sum (container_spec_cpu_quota) by(container) /100000) * 100                                                                                                     | 0-100的范围                          |
| cpu.idle              | 容器cpu空闲占其申请的百分比           | 100 - cpu.util                                                                                                                                                                                                                       | 0-100的范围                          |
| cpu.user              | 容器cpu用户态使用占其申请的百分比     | sum (rate (container_cpu_user_seconds_total[1m])) by( container) /( sum (container_spec_cpu_quota) by(container) /100000) * 100                                                                                                      | 0-100的范围                          |
| cpu.sys               | 容器cpu内核态使用占其申请的百分比     | sum (rate (container_cpu_sys_seconds_total[1m])) by( container) /( sum (container_spec_cpu_quota) by(container) /100000) * 100                                                                                                       | 0-100的范围                          |
| cpu.cores.occupy      | 容器cpu使用占用机器几个核             | rate(container_cpu_usage_seconds_total[1m])                                                                                                                                                                                          | 0到机器核数上限,结果为1就是占用1个核 |
| cpu.spec.quota        | 容器的CPU配额                         | container_spec_cpu_quota                                                                                                                                                                                                             | 为容器指定的CPU个数*100000           |
| cpu.throttled.util    | 容器CPU执行周期受到限制的百分比       | sum by(container_name, pod_name, namespace) (increase(container_cpu_cfs_throttled_periods_total{​container_name!=""}[5m])) /`<br>`sum by(container_name, pod_name, namespace) (increase(container_cpu_cfs_periods_total[5m])) * 100 | 0-100的范围                          |
| cpu.periods           | 容器生命周期中度过的cpu周期总数       | counter型无需计算                                                                                                                                                                                                                    | 使用rate/increase 查看               |
| cpu.throttled.periods | 容器生命周期中度过的受限的cpu周期总数 | counter型无需计算                                                                                                                                                                                                                    | 使用rate/increase 查看               |
| cpu.throttled.time    | 容器被节流的总时间 )                  | counter型无需计算                                                                                                                                                                                                                    | 单位(纳秒                            |

### mem指标

| 夜莺指标名                   | 含义                                                 | prometheus metrics或计算方式                                                                                                 | 说明                                           |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| mem.bytes.total              | 容器的内存限制                                       | 无需计算                                                                                                                     | 单位byte 对应pod yaml中resources.limits.memory |
| mem.bytes.used               | 当前内存使用情况，包括所有内存，无论何时访问         | container_memory_rss + container_memory_cache + kernel memory                                                                | 单位byte                                       |
| mem.bytes.used.percent       | 容器内存使用率                                       | container_memory_usage_bytes/container_spec_memory_limit_bytes *100                                                          | 范围0-100                                      |
| mem.bytes.workingset         | 容器真实使用的内存量，也是limit限制时的 oom 判断依据 | container_memory_max_usage_bytes > container_memory_usage_bytes >= container_memory_working_set_bytes > container_memory_rss | 单位byte                                       |
| mem.bytes.workingset.percent | 容器真实使用的内存量百分比                           | container_memory_working_set_bytes/container_spec_memory_limit_bytes *100                                                    | 范围0-100                                      |
| mem.bytes.cached             | 容器cache内存量                                      | container_memory_cache                                                                                                       | 单位byte                                       |
| mem.bytes.rss                | 容器rss内存量                                        | container_memory_rss                                                                                                         | 单位byte                                       |
| mem.bytes.swap               | 容器cache内存量                                      | container_memory_swap                                                                                                        | 单位byte                                       |

### filesystem && disk.io指标

| 夜莺指标名              | 含义                       | prometheus metrics或计算方式                           | 说明         |
| ----------------------- | -------------------------- | ------------------------------------------------------ | ------------ |
| disk.bytes.total        | 容器可以使用的文件系统总量 | container_fs_limit_bytes                               | (单位：字节) |
| disk.bytes.used         | 容器已经使用的文件系统总量 | container_fs_usage_bytes                               | (单位：字节) |
| disk.bytes.used.percent | 容器文件系统使用百分比     | container_fs_usage_bytes/container_fs_limit_bytes *100 | 范围0-100    |
| disk.io.read.bytes      | 容器io.read qps            | rate(container_fs_reads_bytes_total)[1m]               | (单位：bps)  |
| disk.io.write.bytes     | 容器io.write qps           | rate(container_fs_write_bytes_total)[1m]               | (单位：bps)  |

### network指标

#### **网卡指标都应该求所有interface的和计算**

| 夜莺指标名                                                                                             | 含义                                                                                  | prometheus metrics或计算方式                               | 说明            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------- |
| net.in.bytes                                                                                           | 容器网络接收数据总数                                                                  | rate(container_network_receive_bytes_total)[1m]            | (单位：bytes/s) |
| net.out.bytes                                                                                          | 容器网络积传输数据总数）                                                              | rate(container_network_transmit_bytes_total)[1m]           | (单位：bytes/s) |
| net.in.pps                                                                                             | 容器网络接收数据包pps                                                                 | rate(container_network_receive_packets_total)[1m]          | (单位：p/s)     |
| net.out.pps                                                                                            | 容器网络发送数据包pps                                                                 | rate(container_network_transmit_packets_total)[1m]         | (单位：p/s)     |
| net.in.errs                                                                                            | 容器网络接收数据错误数                                                                | rate(container_network_receive_errors_total)[1m]           | (单位：bytes/s) |
| net.out.errs                                                                                           | 容器网络发送数据错误数                                                                | rate(container_network_transmit_errors_total)[1m]          | (单位：bytes/s) |
| net.in.dropped                                                                                         | 容器网络接收数据包drop pps                                                            | rate(container_network_receive_packets_dropped_total)[1m]  | (单位：p/s)     |
| net.out.dropped                                                                                        | 容器网络发送数据包drop pps                                                            | rate(container_network_transmit_packets_dropped_total)[1m] | (单位：p/s)     |
| container_network_{​tcp,udp}_usage_total 默认不采集是因为 --disable_metrics=tcp, udp ,因为开启cpu压力大 | [看这里](https://github.com/google/cadvisor/blob/master/docs/runtime_options.md#metrics) |                                                            |                 |

### system指标

| 夜莺指标名            | 含义                           | prometheus metrics或计算方式 | 说明       |
| --------------------- | ------------------------------ | ---------------------------- | ---------- |
| sys.ps.process.count  | 容器中running进程个数          | container_processes          | (单位：个) |
| sys.ps.thread.count   | 容器中进程running线程个数      | container_threads            | (单位：个) |
| sys.fd.count.used     | 容器中打开文件描述符个数       | container_file_descriptors   | (单位：个) |
| sys.fd.soft.ulimits   | 容器中root process Soft ulimit | container_ulimits_soft       | (单位：个) |
| sys.socket.count.used | 容器中打开套接字个数           | container_sockets            | (单位：个) |
| sys.task.state        | 容器中task 状态分布            | container_tasks_state        | (单位：个) |

# 本节重点总结:

- 指标分析
  - cpu指标
  - mem指标
  - filesystem && disk.io指标
  - network指标
  - system指标
- container_network_{​tcp,udp}_usage_total 默认不采集是因为 --disable_metrics=tcp, udp ,因为开启cpu压力大[看这里](https://github.com/google/cadvisor/blob/master/docs/runtime_options.md#metrics)

## 16.3 k8s容器cpu内存告警指标与资源request和limit

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
- Qos 的目的是为了合理分配node上的有限资源 {​cpu和mem上}

