---
title: 16.1 k8s容器基础资源指标采集原理讲解
sidebarGroup: Prometheus
shortTitle: 29 16.1 k8s容器基础资源指标采集原理讲解
order: 29
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 容器采集流程追查 - 通过容器的内存指标追踪job得知是kubelet进程 - kubelet进程内置了 cadvisor的代码 - 底层采集来自cadvisor - cadvi...'
---

> **Prometheus · 第 29 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

