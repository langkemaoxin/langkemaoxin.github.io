---
title: HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点
sidebarGroup: Kubernetes
shortTitle: 08 HPA 与扩展点
order: 8
date: 2026-08-29T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
  - HPA
  - CRI
  - CRD
description: HPA 与 Metrics API，以及 OCI/CRI/CNI/CSI/CRD 扩展点与创建流程。
---

> **Kubernetes 系列 · 第 8/35 篇**  
> 上一篇：[《DaemonSet、StatefulSet、Job 与 CronJob》](/云原生/k8s/k8s-07-daemon-stateful-job) · 下一篇：[《Service 四层流量分发——iptables、IPVS 与四类 Port》](/云原生/k8s/k8s-09-service-l4)

---

## 开头：CPU 飙到 400%，Pod 能自己变 4 个吗？

流量高峰手动 `kubectl scale` 太慢。Kubernetes 的 **HPA（Horizontal Pod Autoscaler）** 根据 CPU、内存或自定义指标自动调整 Deployment / ReplicaSet 副本数。

本篇先讲基于 **metrics-server** 的 CPU HPA 完整链路（含 API 聚合与安装排障），再梳理 **OCI / CRI / CNI / CSI / CRD** 扩展体系与 CRD 创建流程。

---

## 一、HPA 概述

**HPA** 使 Pod **水平**自动伸缩，无需手工扩容。

| 对比 | HPA | VPA |
|------|-----|-----|
| 方向 | 增加 Pod 数量 | 增加单 Pod 资源 |
| 适用 | 无状态、易水平扩展 | 有序处理、有状态 |
| 建议 | 一般不与 VPA 同时作用于同一资源 | — |

HPA 适用于 **Deployment** 和 **ReplicaSet**，由 API Server 与 controller 共同实现。

![HPA 概念](/云原生/k8s/p220-01.png)

---

## 二、Metrics 采集架构

自 v1.8 起，资源监控通过 **Metrics API** 暴露；组件 **Metrics Server** 替代已废弃的 Heapster（1.11 起逐步淘汰）。

Metrics Server 从 Kubelet 采集指标，经 Metrics API 供 HPA、VPA、`kubectl top` 使用。

![Metrics 架构](/云原生/k8s/p221-01.png)

### 两条 Pipeline

| Pipeline | 组件 | 用途 |
|----------|------|------|
| **Core metrics** | Kubelet、metrics-server、Metrics API | 调度、HPA、`kubectl top` |
| **Monitoring** | Prometheus、Node Exporter 等 | 告警、自定义指标、QPS 伸缩 |

Kubernetes **正常运行只依赖 core metrics**；Monitoring 由第三方实现。系列第 18–19 篇介绍 Prometheus + 自定义 QPS HPA。

**注意：** Metrics API **不持久化**历史数据，只能查当前用量。

---

## 三、前置条件：开启 API 聚合

Metrics Server 通过 **API Aggregation** 注册到 Kubernetes API。

检查 apiserver 是否开启 `--enable-aggregator-routing=true`：

```bash
ps -ef | grep apiserver
```

若未开启，编辑 `/etc/kubernetes/manifests/kube-apiserver.yaml`，添加：

```yaml
- --enable-aggregator-routing=true
```

修改后 kubelet 会自动重启 apiserver：

```bash
systemctl restart kubelet
```

![开启 Aggregator Routing](/云原生/k8s/p223-02.png)

---

## 四、安装 metrics-server

### 方式一：Minikube 插件

```bash
minikube addons enable metrics-server
```

若拉取 `k8s.gcr.io` 失败，可换国内镜像：

```bash
minikube ssh
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/metrics-server-amd64:v0.5.2
docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/metrics-server-amd64:v0.5.2 \
  k8s.gcr.io/metrics-server/metrics-server:v0.5.2
```

Deployment 中设置 `imagePullPolicy: IfNotPresent`。

### 方式二：手动安装（推荐学习）

版本需与 K8s 匹配（示例 v0.6.3 支持 1.19+）：

| Metrics Server | K8s 版本 |
|----------------|----------|
| 0.6.x | 1.19+ |
| 0.5.x | 1.8+ |

```bash
# 若已启用插件，先禁用
minikube addons disable metrics-server

wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.3/components.yaml
# 修改镜像地址、TLS 参数、imagePullPolicy
kubectl apply -f components.yaml
```

验证：

```bash
kubectl get pod -n kube-system | grep metrics-server
kubectl describe apiservice v1beta1.metrics.k8s.io
kubectl top nodes
kubectl top pods
```

常见错误 `endpoints for service/metrics-server have no addresses with port name "https"`，需检查 TLS 与 kubelet 证书配置。

![metrics-server 安装](/云原生/k8s/p226-01.png)

![kubectl top 成功](/云原生/k8s/p229-02.png)

---

## 五、HPA 实操：Spring Cloud 微服务

### 前提：Pod 必须设置 resources.requests

HPA 按 **requests** 计算利用率。例如 `requests.cpu: 250m`，CPU 目标 50% 即平均不超过 125m。

```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

### 创建 HPA

```bash
kubectl autoscale deployment demo-provider-deployment \
  --cpu-percent=50 --min=1 --max=4
```

含义：CPU 平均利用率超过 50% 时，副本在 1–4 之间自动调整。

```bash
kubectl get hpa
watch kubectl get hpa
kubectl delete hpa demo-provider-deployment
```

![HPA 创建](/云原生/k8s/p232-03.png)

### 压测验证

```bash
wrk -t12 -c400 -d30s http://192.168.49.2:32700/demo-provider/swagger-ui.html
```

观察 HPA 指标上升、Pod 从 1 扩到 4：

![HPA 扩容](/云原生/k8s/p224-02.png)

也可基于内存或自定义指标（Prometheus Adapter）伸缩；QPS 方案见系列第 18 篇。

---

## 六、垃圾回收（扩展）

Kubernetes GC 删除失去 owner 的对象。`kubectl delete` 的级联策略：

```bash
kubectl delete replicaset my-repset --cascade=orphan   # 删 RS，保留 Pod
kubectl delete replicaset my-repset --cascade=true     # 级联删除（默认）
```

---

## 七、OCI、CRI、CNI、CSI、CRD

![扩展接口体系](/云原生/k8s/p235-01.png)

| 规范 | 全称 | 作用 |
|------|------|------|
| **OCI** | Open Container Initiative | 容器镜像与运行时开放标准（runtime-spec、image-spec） |
| **CRI** | Container Runtime Interface | 容器运行时接口，提供计算资源 |
| **CNI** | Container Network Interface | 容器网络接口，分配 IP、路由、DNS |
| **CSI** | Container Storage Interface | 容器存储接口，挂载卷 |
| **CRD** | CustomResourceDefinition | 用户自定义 API 资源类型 |
| **CNM** | Container Network Model | Docker 提出的网络模型（与 CNI 并行） |

### CRI 常见实现

containerd、CRI-O、docker（逐步解耦）、kata-containers、clear-containers 等。

### CNI 常见实现

Flannel、Calico、Cilium、WeaveNet、Kube-Route 等。CNI 与 CNM 对比：CNI 更模块化、可集成第三方 IPAM，CNM 绑定 Docker libnetwork。

### CSI 演进

VolumePlugin（内置）→ FlexVolume → **CSI**（v1.13 GA）。Volume 生命周期与 Pod 独立，支持 Static / Dynamic 供给。

### CRI 与 OCI 关系

![CRI/OCI 生态](/云原生/k8s/p228-01.png)

工作流程：

1. Kubernetes / Docker 调用 **CRI**（containerd、CRI-O）
2. CRI 遵循 **OCI**，通过 **runc** 与内核交互创建容器

---

## 八、CRD 与 CR

| 概念 | 说明 |
|------|------|
| **CRD** | 自定义资源**定义**，类似数据库表结构 |
| **CR** | 自定义资源**实例**，类似表中的一行记录 |

**为什么需要 CRD？** 用户希望把更多领域数据纳入 Kubernetes 统一管理，需扩展 API「表结构」。

CRD 在 API Server 中需实现（或依赖框架）：

1. Schema 元数据定义
2. 校验逻辑
3. CRUD（持久化到 etcd）
4. Controller（List-Watch 控制器，保证期望状态）

前 3 项可通过 YAML 声明；第 4 项需编程，但 K8s 提供了 List-Watch 框架降低难度。

---

## 九、创建 CRD 流程

### CRD YAML 结构

三部分：**常规元数据**、**表级信息**（kind、plural、singular）、**列级 Schema**（OpenAPI v3）。

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: fruits.example.com
spec:
  group: example.com
  names:
    kind: Fruit
    plural: fruits
    singular: fruit
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                name:
                  type: string
                sweetness:
                  type: boolean
```

官方文档：[Create a CustomResourceDefinition](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)

![CRD 结构](/云原生/k8s/p241-02.png)

### 创建 CR 实例

```yaml
apiVersion: example.com/v1
kind: Fruit
metadata:
  name: apple
spec:
  name: apple
  sweetness: true
```

### 验证 CRUD（类比 SQL）

```bash
# CREATE TABLE
kubectl create -f fruit-crd.yaml

# INSERT
kubectl create -f apple.yaml

# SELECT *
kubectl get fruits

# SELECT WHERE
kubectl get fruit apple

# DELETE
kubectl delete fruit apple
```

![CR 列表](/云原生/k8s/p244-01.png)

也可用 Operator 从简化的「表定义」自动生成 CRD YAML。

---

## 小结

- **HPA** 依赖 **Metrics Server** 与 **API Aggregation**；Pod 须设 `resources.requests`。
- **Core metrics** 支撑调度与 HPA；**Monitoring pipeline** 支撑 Prometheus 与自定义指标。
- **OCI → runc → CRI → Kubelet** 是容器运行链路；**CNI / CSI** 分别扩展网络与存储。
- **CRD + Controller** 扩展 Kubernetes API，CR 是具体实例。

> ➡️ 下一篇：[《基于 QPS 的动态扩缩容——Prometheus Operator 与 Adapter》](/云原生/k8s/k8s-16-prometheus-hpa)
