---
title: "17.1ksm关注指标讲解 pod和node状态的统计"
sidebarGroup: "Prometheus"
shortTitle: "32 17.1ksm关注指标讲解 pod和node..."
order: 32
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 主要的应用 - 看状态 - 数个数 - 根据13105大盘模板看ksm指标 - 节点指标 - pod和容器指标 - 资源对象按namespace分布指标 - 其他资源指标 主要的..."
---

> **Prometheus · 第 32 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 主要的应用

  - 看状态
  - 数个数
- 根据13105大盘模板看ksm指标

  - 节点指标
  - pod和容器指标
  - 资源对象按namespace分布指标
  - 其他资源指标

# 主要的应用

1. 看状态，举例图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1629624126000/53587b279f564f6b80bcc58a688f23e0.png)
2. 数个数，举例图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1629624126000/08462b26da6e440a98d454d5d892c417.png)

# 根据大盘模板 查看指标

- https://grafana.com/grafana/dashboards/13105
- 根据节点表格查看

# 节点指标

## 节点名

- kube_node_info中的 node标签

```shell

kube_node_info{container_runtime_version="containerd://1.4.4", instance="kube-state-metrics:8080", job="kube-state-metrics", kernel_version="3.10.0-957.1.3.el7.x86_64", kubelet_version="v1.20.1", kubeproxy_version="v1.20.1", node="k8s-master01", os_image="CentOS Linux 7 (Core)", pod_cidr="10.100.0.0/24"}
kube_node_info{container_runtime_version="containerd://1.4.4", instance="kube-state-metrics:8080", job="kube-state-metrics", kernel_version="3.10.0-957.1.3.el7.x86_64", kubelet_version="v1.20.1", kubeproxy_version="v1.20.1", node="k8s-node01", os_image="CentOS Linux 7 (Core)", pod_cidr="10.100.1.0/24"}

```

## cpu

### 节点总cpu核数

```shell
kube_node_status_capacity_cpu_cores
```

### 节点上pod cpu请求核数

```shell
sum(kube_pod_container_resource_requests_cpu_cores{}) by (node)

```

### 节点上pod cpu限制核数

```shell
sum(kube_pod_container_resource_limits_cpu_cores{}) by (node)

```

### 节点上 容器cpu使用核数

```shell
sum (rate (container_cpu_usage_seconds_total{id="/"}[2m]))by (node)
```

### 节点上pod cpu请求百分比

```shell
100 *sum(kube_pod_container_resource_requests_cpu_cores{})by (node) / 
sum(kube_node_status_allocatable_cpu_cores{})by (node)
```

### 节点上pod cpu限制百分比

```shell
100 * sum(kube_pod_container_resource_limits_cpu_cores)by (node) 
/ sum(kube_node_status_allocatable_cpu_cores)by (node)

```

### 节点上容器 cpu使用百分比

```shell
100 *sum (rate (container_cpu_usage_seconds_total{id="/"}[2m]))by (node) /
sum (kube_node_status_capacity_cpu_cores)by (node)
```

## mem

### 节点总内存大小

```shell
- kube_node_status_allocatable_memory_bytes

```

### 节点上pod mem请求大小

```shell
sum(kube_pod_container_resource_requests_memory_bytes{}) by (node)
```

### 节点上pod mem限制大小

```shell
sum(kube_pod_container_resource_limits_memory_bytes{}) by (node)
```

### 节点上pod mem使用大小

```shell
sum(container_memory_working_set_bytes{}) by (node)
```

### 节点上pod mem请求百分比

```shell
100 * sum(kube_pod_container_resource_requests_memory_bytes{}) by (node)/
sum(kube_node_status_allocatable_memory_bytes) by(node)
```

### 节点上pod mem限制百分比

```shell

100 * sum(kube_pod_container_resource_limits_memory_bytes{}) by (node)/
sum(kube_node_status_allocatable_memory_bytes) by(node)
```

### 节点上pod mem使用百分比

```shell

100 * sum(container_memory_working_set_bytes{id="/"}) by (node)/
sum(kube_node_status_allocatable_memory_bytes) by(node)
```

## 节点上可分配pod总数

- kube_node_status_allocatable_pods

## 文件系统

### 节点磁盘总量

```shell
sum (container_fs_limit_bytes{device=~"^/dev/.*$",id="/"}) by (node)
```

### 节点磁盘使用总量

```shell
sum (container_fs_usage_bytes{device=~"^/dev/.*$",id="/"}) by (node)
```

### 使用率

```shell
100 *  sum (container_fs_usage_bytes{device=~"^/dev/.*$",id="/"}) by (node)/
sum (container_fs_usage_bytes{device=~"^/dev/.*$",id="/"}) by (node)
```

## id="/"的容器含义

- 代码位置 D:\go_path\pkg\mod\github.com\google\cadvisor@v0.38.7\manager\manager.go

```go
	// Create root and then recover all containers.
	err = m.createContainer("/", watcher.Raw)
	if err != nil {
		return err
	}
```

- 含义是id="/"代表所有的有的容器和

## node  指标表格

| 指标名                                    | 类型  | 含义                                                                                                                    |
| ----------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| kube_node_status_condition                | gauge | condition:`<br>` NetworkUnavailable `<br>` MemoryPressure `<br>` DiskPressure `<br>` PIDPressure `<br>` Ready |
| kube_node_status_allocatable_cpu_cores    | gauge | 节点可以分配cpu核数                                                                                                     |
| kube_node_status_allocatable_memory_bytes | gauge | 节点可以分配内存总量(单位：字节)                                                                                        |
| kube_node_spec_taint                      | gauge | 节点污点情况                                                                                                            |
| kube_node_status_capacity_memory_bytes    | gauge | 节点内存总量(单位：字节)                                                                                                |
| kube_node_status_capacity_cpu_cores       | gauge | 节点cpu核数                                                                                                             |
| kube_node_status_capacity_pods            | gauge | 节点可运行的pod总数                                                                                                     |

# pod指标

## pod状态

### 运行的pod

```shell
sum(kube_pod_status_phase{phase="Running"})
```

### pending的pod

```shell
sum(kube_pod_status_phase{ phase="Pending"})
```

### Failed的pod

```shell
sum(kube_pod_status_phase{ phase="Failed"})
```

## 容器状态

### Running的容器

```shell
sum(kube_pod_container_status_running{})
```

### pod处于waiting状态原因

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1629624126000/bc1fa014187d469ba431af64be784614.png)

```shell
kube_pod_container_status_waiting_reason==1
```

### pod处于terminated状态原因

```shell
kube_pod_container_status_terminated_reason==1
```

### 最近重启过的容器

```shell
delta(kube_pod_container_status_restarts_total[1m])>0
```

## pod和 container指标表格

| 指标名                                            | 类型    | 含义                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| kube_pod_status_phase                             | gauge   | pod状态统计:`<br>`  Pending `<br>` Succeeded `<br>` Failed `<br>` Running `<br>` Unknown                                                                                                                                                           |
| kube_pod_container_status_waiting                 | counter | pod处于waiting状态，值为1代表waiting                                                                                                                                                                                                                         |
| kube_pod_container_status_waiting_reason          | gauge   | pod处于waiting状态原因 `<br>` ContainerCreating `<br>`CrashLoopBackOff  pod启动崩溃,再次启动然后再次崩溃 `<br>`CreateContainerConfigError `<br>`ErrImagePull `<br>`ImagePullBackOff `<br>`CreateContainerError `<br>`InvalidImageName `<br>` |
| kube_pod_container_status_terminated              | gauge   | pod处于terminated状态，值为1代表terminated                                                                                                                                                                                                                   |
| kube_pod_container_status_terminated_reason       | gauge   | pod处于terminated状态原因 `<br>` 	OOMKilled `<br>` Completed `<br>` Error `<br>` ContainerCannotRun `<br>` DeadlineExceeded `<br>` Evicted `<br>`                                                                                              |
| kube_pod_container_status_restarts_total          | counter | pod中的容器重启次数                                                                                                                                                                                                                                          |
| kube_pod_container_resource_requests_cpu_cores    | gauge   | pod容器cpu limit                                                                                                                                                                                                                                             |
| kube_pod_container_resource_requests_memory_bytes | gauge   | pod容器mem limit(单位:字节)                                                                                                                                                                                                                                  |

# 根据命名空间明细表格 数资源个数

## 资源按ns分布

### pod数

```shell
count(kube_pod_info{}) by (namespace)
```

### 容器数

```shell
count(kube_pod_container_info{}) by (namespace)

```

### svc数

```shell
count(kube_service_info{}) by (namespace)
```

### svc数

```shell
count(kube_service_info{}) by (namespace)
```

### secret数

```shell
count(kube_secret_info{}) by (namespace)
```

### configmap数

```shell
count(kube_configmap_info{}) by (namespace)
```

# 其他资源对象指标表格

## deployment  metrics

| 指标名                                      | 类型  | 含义                  |
| ------------------------------------------- | ----- | --------------------- |
| kube_deployment_status_replicas             | gauge | dep中的pod num        |
| kube_deployment_status_replicas_available   | gauge | dep中的 可用pod num   |
| kube_deployment_status_replicas_unavailable | gauge | dep中的 不可用pod num |

## daemonSet  metrics

| 指标名                                         | 类型  | 含义                     |
| ---------------------------------------------- | ----- | ------------------------ |
| kube_daemonset_status_number_available         | gauge | ds 可用数                |
| kube_daemonset_status_number_unavailable       | gauge | ds 不可用数              |
| kube_daemonset_status_number_ready             | gauge | ds ready数               |
| kube_daemonset_status_number_misscheduled      | gauge | 未经过调度运行ds的节点数 |
| kube_daemonset_status_current_number_scheduled | gauge | ds目前运行节点数         |
| kube_daemonset_status_desired_number_scheduled | gauge | 应该运行ds的节点数       |

## statefulSet  metrics

| 指标名                                   | 类型  | 含义           |
| ---------------------------------------- | ----- | -------------- |
| kube_statefulset_status_replicas         | gauge | ss副本总数     |
| kube_statefulset_status_replicas_current | gauge | ss当前副本数   |
| kube_statefulset_status_replicas_updated | gauge | ss已更新副本数 |
| kube_statefulset_replicas                | gauge | ss目标副本数   |

## Job   metrics

| 指标名                    | 类型  | 含义              |
| ------------------------- | ----- | ----------------- |
| kube_job_status_active    | gauge | job running pod数 |
| kube_job_status_succeeded | gauge | job 成功 pod数    |
| kube_job_status_failed    | gauge | job 失败 pod数    |
| kube_job_complete         | gauge | job 是否完成      |
| kube_job_failed           | gauge | job 是否失败      |

## CronJob   metrics

| 指标名                                 | 类型  | 含义              |
| -------------------------------------- | ----- | ----------------- |
| kube_cronjob_status_active             | gauge | job running pod数 |
| kube_cronjob_spec_suspend              | gauge | =1代表 job 被挂起 |
| kube_cronjob_next_schedule_time        | gauge | job 下次调度时间  |
| kube_cronjob_status_last_schedule_time | gauge | job 下次调度时间  |

## PersistentVolume    metrics

| 指标名                               | 类型  | 含义                                                                                                 |
| ------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------- |
| kube_persistentvolume_capacity_bytes | gauge | pv申请大小                                                                                           |
| kube_persistentvolume_status_phase   | gauge | pv状态:`<br>` Pending `<br>` Available `<br>` Bound `<br>` Released `<br>` Failed `<br>` |

## PersistentVolumeClaim     metrics

| 指标名                                                     | 类型  | 含义                                                  |
| ---------------------------------------------------------- | ----- | ----------------------------------------------------- |
| kube_persistentvolumeclaim_resource_requests_storage_bytes | gauge | pvc request大小                                       |
| kube_persistentvolumeclaim_status_phase                    | gauge | pvc状态:`<br>` Lost `<br>` Bound `<br>` Pending |

# 本节重点总结:

- 主要的应用

  - 看状态
  - 数个数
- 根据13105大盘模板看ksm指标

  - 节点指标
  - pod和容器指标
  - 资源对象按namespace分布指标
  - 其他资源指标

