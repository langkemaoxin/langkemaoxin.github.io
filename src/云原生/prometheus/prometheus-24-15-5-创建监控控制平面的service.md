---
title: 15.5 创建监控控制平面的service
sidebarGroup: Prometheus
shortTitle: 24 15.5 创建监控控制平面的service
order: 24
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - k8s中service的作用和类型 - 创建k8s控制平面的service 给prometheus采集用， 类型clusterIp - kube-scheduler - kube...'
---

> **Prometheus · 第 24 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- k8s中service的作用和类型
- 创建k8s控制平面的service 给prometheus采集用， 类型clusterIp
  - kube-scheduler
  - kube-controller-manager
  - kube-etcd

# service的作用

- Kubernetes Service定义了这样一种抽象： Service是一种可以访问 Pod逻辑分组的策略， Service通常是通过 Label Selector访问 Pod组。
- 当Pod宕机后重新生成时，其IP等状态信息可能会变动，Service会根据Pod的Label对这些状态信息进行监控和变更，保证上游服务不受Pod的变动而影响。

## service 类型

> Service在 K8s中有以下四种类型：

### ClusterIp

- 默认类型
- 自动分配一个仅 Cluster内部可以访问的虚拟 IP

### NodePort

- 在 ClusterIP基础上为 Service在每台机器上绑定一个端口
- 这样就可以通过 : NodePort来访问该服务

### LoadBalancer

- 在NodePort的基础上，借助 Cloud Provider创建一个外部负载均衡器，并将请求转发到 NodePort

### ExternalName

- 把集群外部的服务引入到集群内部来，在集群内部直接使用。没有任何类型代理被创建
- 只有 Kubernetes 1.7或更高版本的 kube-dns才支持。

# 为何这里要使用service

- 因为我们要监控控制平面组件，采用service让prometheus能够访问到他们

# 创建控制平面的service

## kube-scheduler的service

```yaml
---
apiVersion: v1
kind: Service
metadata:
  # 元信息
  namespace: kube-system
  name: kube-scheduler
  labels:
    k8s-app: kube-scheduler
spec:
  selector:
    # 标签选择器，因为对应的kube-scheduler的pod 有component=kube-scheduler这个标签
    component: kube-scheduler
  ports:
  - name: http-metrics
    port: 10259  # service的端口
  
    targetPort: 10259 # pod 的端口
    protocol: TCP #协议

```

## kube-controller-manager 的service

```yaml
--- 
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-controller-manager
  labels:
    k8s-app: kube-controller-manager
spec:
  selector:
    component: kube-controller-manager
  ports:
  - name: http-metrics
    port: 10257
    targetPort: 10257
    protocol: TCP

```

## kube-etcd 的service

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-etcd
  labels:
    k8s-app: kube-etcd
spec:
  selector:
    component: etcd
    tier: control-plane
  ports:
  - name: http-metrics
    port: 2379
    targetPort: 2379
    protocol: TCP

```

# 将上述service写入一个yaml中，control_plane_service.yaml

# 本节重点总结 :

- k8s中service的作用和类型
- 创建k8s控制平面的service 给prometheus采集用， 类型clusterIp
  - kube-scheduler
  - kube-controller-manager
  - kube-etcd

