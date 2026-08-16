---
title: Prometheus 第20章：监控体系综述
sidebarGroup: 可观测性
shortTitle: 32 监控体系综述
order: 32
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第20章（监控体系综述）合并笔记
---

> **Prometheus · 第 20 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 20.1 分析pull模型在k8s中的应用，对比push模型

# 本节重点介绍 :

- push模型和pull模型监控系统对比
- 为什么在k8s中只能用pull模型的
- k8s中主要组件的暴露地址说明

# push模型和pull模型监控系统

- 对比下两种系统采用的不同采集模型，即push型采集和pull型采集。不同的模型在性能的考虑上是截然不同的。下面表格简单的说明了下两种模型的特点：

| **采集模型** | **原理简介**        | **代表**   |
| :----------------- | :------------------------ | :--------------- |
| push               | agent定时推送数据到server | 夜莺&open-falcon |
| pull               | server定时去agent拉数据   | prometheus       |

## 就采集器是否丰富来说

- 我们需要对比的是这个系统是否有很好的插件扩展机制，因为这直接决定了开源社区对该系统采集器贡献的活跃度
- prometheus采集的pull模型，使用者可以用自定义exporter的模式灵活的接入。

## push型的致命缺点 agent和服务端强耦合

- 那就是agent需要配置服务端地址，带来了一定的耦合性，不适合云原生场景。
- 如果采用push型，试想一下你的应用部署在k8s中，在启动的时候需要指定监控上报的服务地址，那是不能接受的。
- 类比pushgateway的例子`pusher = push.New(url, jobName)` 必须要指定服务端的地址

## 如果push端的服务地址变化了怎么办

- 一个典型的场景就是在k8s中，pod的扩缩十分频繁，服务端的地址也不固定。

## pull型的处理方法

- 对比来说，应用pull模型采集的prometheus，可以对接多种服务发现源，特别适合k8s环境。
- 举个例子，应用的pod一旦发生变化，prometheus就可以通过配置好k8s的服务发现模式监听到资源变化，进行采集的增删，agent侧只需要暴露自己的指标，完全不关心是哪一个server过来获取数据。

# k8s中主要组件的暴露地址说明

## 部署在pod中业务埋点指标

- 是直接通过pod的ip暴露的，我们可以直接通过get pod 获取容器的ip，在node上直接curl访问到

```shell
[root@k8s-master01 ink8s-pod-metrics]# kubectl get pod -o wide                
NAME                                           READY   STATUS    RESTARTS   AGE     IP              NODE         NOMINATED NODE   READINESS GATES
ink8s-pod-metrics-deployment-85d9795d6-95lsp   1/1     Running   0          13h     10.100.85.207   k8s-node01   <none>           <none>
[root@k8s-master01 ink8s-pod-metrics]# curl -s 10.100.85.207:8080/metrics |grep ink8s                               # HELP ink8s_pod_metrics_get_node_detail k8s node detail each
# TYPE ink8s_pod_metrics_get_node_detail gauge
ink8s_pod_metrics_get_node_detail{containerRuntimeVersion="containerd://1.4.4",hostname="k8s-master01",ip="172.20.70.205",kubeletVersion="v1.20.1"} 1
ink8s_pod_metrics_get_node_detail{containerRuntimeVersion="containerd://1.4.4",hostname="k8s-node01",ip="172.20.70.215",kubeletVersion="v1.20.1"} 1
# HELP ink8s_pod_metrics_get_node_last_duration_seconds get node last duration seconds
# TYPE ink8s_pod_metrics_get_node_last_duration_seconds gauge
ink8s_pod_metrics_get_node_last_duration_seconds 0.008506914
# HELP ink8s_pod_metrics_get_pod_control_plane_pod_detail k8s pod detail of control plane
# TYPE ink8s_pod_metrics_get_pod_control_plane_pod_detail gauge
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="etcd",ip="172.20.70.205",pod_name="etcd-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-apiserver",ip="172.20.70.205",pod_name="kube-apiserver-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-controller-manager",ip="172.20.70.205",pod_name="kube-controller-manager-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-scheduler",ip="172.20.70.205",pod_name="kube-scheduler-k8s-master01"} 1
# HELP ink8s_pod_metrics_get_pod_last_duration_seconds get pod last duration seconds
# TYPE ink8s_pod_metrics_get_pod_last_duration_seconds gauge
ink8s_pod_metrics_get_pod_last_duration_seconds 0.012481561
```

- target页面举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111173000/83faefb3aa9f477f83924309f6e5a58e.png)

## 容器基础资源指标

- kubelet 内置cadvisor metrics接口暴露的
- 我们可以先获取token，再使用token作为header访问各个节点的cadvisor指标

```shell
TOKEN=$(kubectl -n kube-system  get secret $(kubectl -n kube-system  get serviceaccount prometheus -o jsonpath='{.secrets[0].name}') -o jsonpath='{.data.token}' | base64 --decode )
curl -s   https://172.20.70.215:10250/metrics/cadvisor --header "Authorization: Bearer $TOKEN" --insecure  |head  

                                
# HELP cadvisor_version_info A metric with a constant '1' value labeled by kernel version, OS version, docker version, cadvisor version & cadvisor revision.
# TYPE cadvisor_version_info gauge
cadvisor_version_info{cadvisorRevision="",cadvisorVersion="",dockerVersion="1.13.1",kernelVersion="3.10.0-957.1.3.el7.x86_64",osVersion="CentOS Linux 7 (Core)"} 1
# HELP container_cpu_cfs_periods_total Number of elapsed enforcement period intervals.
# TYPE container_cpu_cfs_periods_total counter
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod6ab97c68_b0ac_48ce_ba39_6ffa72a2f4c8.slice",image="",name="",namespace="default",pod="ink8s-pod-metrics-deployment-85d9795d6-95lsp"} 46664 1629771810858
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podbf3f353a_92fa_4436_a8ca_6cb632d48ada.slice",image="",name="",namespace="kube-admin",pod="k8s-mon-daemonset-z6sfw"} 762965 1629771819606
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podd9a95d67_a843_4369_8d5c_34a5333f1480.slice",image="",name="",namespace="kube-admin",pod="k8s-mon-deployment-6d7d58bdc8-rxj42"} 458822 1629771809776
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pode27c9fe7_9d82_4228_86fb_b9c920611c15.slice",image="",name="",namespace="kube-system",pod="prometheus-0"} 941374 1629771809770
container_cpu_cfs_periods_total{container="ink8s-pod-metrics",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod6ab97c68_b0ac_48ce_ba39_6ffa72a2f4c8.slice/cri-containerd-2f85fd45a67cc4bb775b99d4676200b412ea18ef7ae4976fc93a8a7cff1c5f34.scope",image="docker.io/library/ink8s-pod-metrics:v1",name="2f85fd45a67cc4bb775b99d4676200b412ea18ef7ae4976fc93a8a7cff1c5f34",namespace="default",pod="ink8s-pod-metrics-deployment-85d9795d6-95lsp"} 46667 1629771818053
```

- target页面举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111173000/a8b160041eff4f4980d45961c56e89e6.png)

## k8s对象资源指标

- 这是ksm直接暴露指标，prometheus通过dns解析到域名然后访问的
- 我们可以通过dig获取ksm 的service_ip，然后访问 service_ip:8080

```shell
 dig +short kube-state-metrics.kube-system.svc.cluster.local @10.96.0.10
10.100.85.200
curl -s 10.100.85.200:8080/metrics  |head  

          
# HELP kube_certificatesigningrequest_labels Kubernetes labels converted to Prometheus labels.
# TYPE kube_certificatesigningrequest_labels gauge
# HELP kube_certificatesigningrequest_created Unix creation timestamp
# TYPE kube_certificatesigningrequest_created gauge
# HELP kube_certificatesigningrequest_condition The number of each certificatesigningrequest condition
# TYPE kube_certificatesigningrequest_condition gauge
# HELP kube_certificatesigningrequest_cert_length Length of the issued cert
# TYPE kube_certificatesigningrequest_cert_length gauge
# HELP kube_configmap_info Information about configmap.
# TYPE kube_configmap_info gauge
```

- target页面举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111173000/dfa951f2716b47e0861d82ae3887bfdc.png)

## k8s服务组件指标

- 是由服务组件自身直接暴露的，我们也可以通过带token直接访问

```shell
TOKEN=$(kubectl -n kube-system  get secret $(kubectl -n kube-system  get serviceaccount prometheus -o jsonpath='{.secrets[0].name}') -o jsonpath='{.data.token}' | base64 --decode )
curl -s  https://localhost:6443/metrics --header "Authorization: Bearer $TOKEN" --insecure |head  

                                                                
# HELP aggregator_openapi_v2_regeneration_count [ALPHA] Counter of OpenAPI v2 spec regeneration count broken down by causing APIService name and reason.
# TYPE aggregator_openapi_v2_regeneration_count counter
aggregator_openapi_v2_regeneration_count{apiservice="*",reason="startup"} 0
aggregator_openapi_v2_regeneration_count{apiservice="k8s_internal_local_delegation_chain_0000000002",reason="update"} 0
# HELP aggregator_openapi_v2_regeneration_duration [ALPHA] Gauge of OpenAPI v2 spec regeneration duration in seconds.
# TYPE aggregator_openapi_v2_regeneration_duration gauge
aggregator_openapi_v2_regeneration_duration{reason="startup"} 0.812717406
aggregator_openapi_v2_regeneration_duration{reason="update"} 0.848521427
# HELP aggregator_unavailable_apiservice [ALPHA] Gauge of APIServices which are marked as unavailable broken down by APIService name.
# TYPE aggregator_unavailable_apiservice gauge
[root@k8s-master01 ink8s-pod-metrics]# 
```

- target页面举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111173000/82562ebf8b944899838f44375e49e2f7.png)

# k8s中关注四大块指标总结

- 之前在k8s中关注4块指标有过总结

| 指标类型                | 采集源                                                                        | 应用举例                                                                                                | 发现类型                                |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 容器基础资源指标        | kubelet 内置cadvisor metrics接口                                              | 查看容器cpu、mem利用率等                                                                                | k8s_sd node级别直接访问node_ip          |
| k8s对象资源指标         | [kube-stats-metrics](https://github.com/kubernetes/kube-state-metrics) (简称ksm) | 具体可以看 `<br>` 看pod状态如pod waiting状态的原因 `<br>` 数个数如：查看node pod按namespace分布情况 | 通过coredns访问域名                     |
| k8s服务组件指标         | 服务组件 metrics接口                                                          | 查看apiserver 、scheduler、etc、coredns请求延迟等                                                       | k8s_sd endpoint级别                     |
| 部署在pod中业务埋点指标 | pod 的metrics接口                                                             | 依据业务指标场景                                                                                        | k8s_sd pod级别，访问pod ip的metricspath |

# 本节重点总结 :

- push模型和pull模型监控系统对比
- 为什么在k8s中只能用pull模型的
- k8s中主要组件的暴露地址说明

