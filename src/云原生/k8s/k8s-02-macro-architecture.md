---
title: 穿透 K8S 八大宏观架构——Master、Worker 与数据流
sidebarGroup: Kubernetes
shortTitle: 02 宏观架构
order: 2
date: 2026-08-26T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 用八张宏观架构图讲清 Master/Worker、元数据流、APIServer 与 kubelet 内部结构。
---

> **Kubernetes 系列 · 第 2/35 篇**  
> 上一篇：[《云原生原理与演进——从 CNCF 到 Service Mesh》](/云原生/k8s/k8s-01-cloud-native)  
> 下一篇：[《K8s 运行时实操——Minikube 安装、排障与 Helm》](/云原生/k8s/k8s-03-minikube-runtime)

---

## 开头：别急着记 Pod 命令，先建立「地图」

很多人学 K8s 从 `kubectl get pods` 开始，却说不清 **Master 和 Worker 各管什么**、YAML 提交后**数据怎么流到 kubelet**、**Service 流量怎么进 Pod**。本文用 **8 张宏观架构图**建立整体地图——后续 Minikube 实操、对象模型、网络存储都建立在这套骨架上。

K8s 的核心价值：把容器管理从「石器时代」（手工 `docker run`、脚本编排）带入**工业时代**（声明式 API、控制器闭环、统一数据面）。

---

## 图 0：K8S 宏观组件架构

![K8S 宏观组件架构图](/云原生/k8s/p053-01.png)

K8s 是**围绕容器打造的分布式系统**，宏观上与 RocketMQ、Kafka、Elasticsearch 等类似：有**控制面**与**数据面**，有**元数据存储**与**工作节点**。

### 石器时代 vs 工业时代

| 阶段 | 容器管理方式 |
|------|--------------|
| 早期 | 手工 `docker` 命令 |
| 晚期 | Docker Compose / 脚本编排 |
| 工业时代 | **Kubernetes** 声明式编排 + 控制器 |

![K8S 核心价值](/云原生/k8s/p054-01.png)

### 两大组件

| 角色 | 职责 | 主要组件 |
|------|------|----------|
| **Master（控制平面）** | 集群管理 + **元数据管理** | **kube-apiserver** + 各类**控制器**（Deployment、ReplicaSet 等） |
| **Worker（Node）** | **容器生命周期管理** | **kubelet**（容器管理）+ **kube-proxy**（流量负载均衡） |

元数据持久化在 **etcd**；客户端 **kubectl** 通常连 Master 上的 APIServer。

![Master 与 Worker 组件](/云原生/k8s/p055-01.png)

---

## 图 1：K8S 业务架构图

![K8S 业务架构图](/云原生/k8s/p056-01.png)

从**业务视角**，K8s 做两件事：

1. **容器元数据管理**：镜像地址、资源配额、副本数、调度节点、对外端口等。
2. **容器生命周期管理**：管生、管死、管过程（创建、健康检查、重启、销毁）。

![业务架构细化](/云原生/k8s/p056-02.png)

---

## 图 2：K8S 元数据架构图

![K8S 元数据架构图](/云原生/k8s/p057-01.png)

核心对象与关系（早期模型 + 现代等价物）：

| 对象 | 说明 |
|------|------|
| **Pod** | 最小调度单元；一个或多个容器共享网络命名空间 |
| **Service** | Pod 对外统一入口；后端维护同一类多个 Pod |
| **Label** | 键值标签，用于分类与选择 |
| **Master / Node** | 控制节点 vs 工作节点 |
| **Replication Controller（RC）** | 保证指定数量 Pod 副本运行；Pod 被删会自动补齐（已逐步被 ReplicaSet/Deployment 取代） |
| **ReplicaSet** | RC 的下一代；支持**基于集合的 selector**（如 `version in (v1.0, v2.0)`） |
| **Deployment** | 声明式管理 Pod 与 ReplicaSet；支持滚动升级、回滚、扩缩容、暂停/继续 |

**RC 与 ReplicaSet 区别**：Selector 能力——RC 仅支持等式 selector（`env=dev`），ReplicaSet 还支持 `in` / `notin` 等集合 selector。官方推荐 **ReplicaSet**；生产环境即使只跑一个 Pod，也建议通过 Deployment/ReplicaSet 管理，而非裸 Pod。

---

## 图 3：K8S 容器管理流程架构

![容器管理流程](/云原生/k8s/p058-01.png)

从用户提交到容器运行的主路径：

1. 用户向 **APIServer**（集群数据总线）提交部署 YAML/JSON（用户视角的容器元数据）。
2. APIServer 通知**控制器**处理，得到最终**资源对象**，持久化到 **etcd**，并下发到目标 Node 的 **kubelet**。
3. **kubelet** 判断是否由本节点负责；若是，则创建容器。

创建容器时依赖三类接口：

| 接口 | 全称 | 作用 |
|------|------|------|
| **CRI** | Container Runtime Interface | 容器运行时接口，提供计算资源（containerd、CRI-O 等） |
| **CNI** | Container Network Interface | 容器网络接口，分配 IP、路由、DNS 等 |
| **CSI** | Container Storage Interface | 容器存储接口，挂载持久卷（K8s 1.13 GA） |

CRI 自 **1.5** 起由 Kubernetes 项目推出，替代直接绑定 Docker；CNI 由 CoreOS 等主导制定网络标准；CSI 由 K8s、Mesos、Docker 等联合制定。

---

## 图 4：容器元数据的数据传输架构

![元数据传输架构](/云原生/k8s/p059-01.png)

APIServer 与 kubelet 之间通过**长连接 + 短连接**组合实现高性能元数据同步：

| 方式 | 模式 | 用途 |
|------|------|------|
| **长连接** | 推模式 | 增量元数据推送 |
| **短连接** | 拉模式 | 全量元数据拉取 |

---

## 图 5：容器对外暴露架构图

![对外暴露架构](/云原生/k8s/p060-01.png)

分两个阶段：

1. **元数据对象创建阶段**：完成 Pod 选择、Service/Endpoint 建立、端口映射。
2. **流量路由阶段**：**kube-proxy** 负责流量分发与 Pod 间负载均衡（iptables 或 IPVS 模式，系列第 9 篇详述）。

![暴露架构补充](/云原生/k8s/p060-02.png)

---

## 图 6：总架构图

![K8S 总架构图](/云原生/k8s/p061-01.png)

汇总前述内容：

- **Master**：api-server + 控制器 + **etcd**（元数据持久化）。
- **Worker**：kubelet + kube-proxy。
- 用户 / CI 通过 **kubectl** → APIServer → 控制器闭环 → kubelet → CRI/CNI/CSI → 运行中容器。
- 集群外流量：Ingress / LoadBalancer / NodePort → Service → kube-proxy → Pod。

K8s 与消息中间件、搜索引擎等分布式系统在「控制面 + 数据面 + 元数据存储」分层上高度同构——理解这一点，有助于横向迁移已有分布式系统经验。

---

## 图 7：Master 上 APIServer 内部架构

![APIServer 内部架构](/云原生/k8s/p062-01.png)

**kube-apiserver** 是 K8s 最核心的组件之一，主要能力：

- 提供集群管理的 **REST API**：Authentication、Authorization、Admission（Mutating & Validating）。
- 作为各模块间**数据交互枢纽**（其他模块经 APIServer 读写 etcd；仅 APIServer 直接操作 etcd）。
- **etcd 数据缓存**，减少对 etcd 的直接访问压力。

请求处理采用类似**责任链**的处理器链：

| 顺序 | 处理器 | 说明 |
|------|--------|------|
| 1 | **APIHandler** | 注册各资源 REST Handler |
| 2 | **AuthN** | 认证；可接 Webhook 集成企业统一认证 |
| 3 | **Rate Limit** | 限流 |
| 4 | **Auditing** | 审计；操作生成审计日志 |
| 5 | **AuthZ** | 授权；RBAC 或 Webhook |
| 6 | **Aggregator** | 路由：标准 K8s API vs **Aggregated APIServer**（CRD / 扩展 API） |
| 7 | **Mutating** | 准入变更；可注入默认值、Sidecar 等 |
| 8 | **Validating** | 准入校验 |

---

## 图 8：Worker 上 kubelet 内部架构

**kubelet** 将容器运行时、网络、存储抽象为 **CRI、CNI、CSI**，主要职责：

1. Node 上的 **init system**，负责 Pod 生命周期。
2. 从**本地文件**、**HTTPServer** 或 **APIServer** 获取 Pod 清单并按需启停 Pod。
3. 汇报节点**资源与健康状态**。
4. 执行 Pod **健康检查**并上报状态。

kubelet 不直接面向用户；用户通过 kubectl 改期望状态，控制器 + APIServer + kubelet 协作使**实际状态**逼近**期望状态**——这是 K8s **声明式 API** 在节点侧的落地。

---

## 小结

| 图 | 回答的问题 |
|----|------------|
| 图 0 | Master / Worker 各有什么组件？ |
| 图 1 | 业务上 K8s 管什么？ |
| 图 2 | Pod、Service、Deployment 等元数据如何组织？ |
| 图 3 | YAML 如何变成运行中的容器？CRI/CNI/CSI 在哪？ |
| 图 4 | APIServer 与 kubelet 如何同步元数据？ |
| 图 5 | 集群外流量如何到达 Pod？ |
| 图 6 | 一张总图串起来 |
| 图 7 | APIServer 请求链路与扩展点 |
| 图 8 | kubelet 在节点上做什么？ |

> ➡️ 下一篇：[《K8s 运行时实操——Minikube 安装、排障与 Helm》](/云原生/k8s/k8s-03-minikube-runtime)
