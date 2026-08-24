---
title: Kubernetes
index: false
icon: dharmachakra
article: false
description: Kubernetes
---

# Kubernetes

云原生编排层。Docker 把「一个进程怎么进沙箱」讲清楚之后，K8s 负责「成百上千个容器怎么调度、发现、扩缩与自愈」。

本系列共 **36 篇**：第 0 篇[《K8s 学习总纲》](./k8s-00-roadmap.md)（零基础到资深专家的九阶段教学大纲）+ 正文 35 篇按大纲学习线排序——西蒙学习法：每篇只依赖前面的篇目，标 🚧 的为占位待学。已成文的 30 篇整合自《K8S 学习圣经》与原「K8s 运维笔记」72 篇课程笔记，5 篇占位为按总纲补缺（Gateway API / etcd 内幕 / RBAC 安全 / Operator 实战 / DRA 调度）。

建议先读完 [Docker 系列](/云原生/docker/docker-01-what-is-docker)（总纲的前置地基），再按侧栏或下方目录顺序阅读。

## 文章目录

0. [K8s 学习总纲——零基础到资深专家的完整教学大纲](./k8s-00-roadmap.md)

### 阶段 0 · 起步：为什么是 K8s，先把集群跑起来

1. [云原生原理与演进——从 CNCF 到 Service Mesh](./k8s-01-cloud-native.md)
2. [穿透 K8S 八大宏观架构——Master、Worker 与数据流](./k8s-02-macro-architecture.md)
3. [K8s 运行时实操——Minikube 安装、排障与 Helm](./k8s-03-minikube-runtime.md)

### 阶段 1 · 会用：对象模型与工作负载（CKA 主体）

4. [Kubernetes 基本概念与 kubectl——对象模型与常用命令](./k8s-04-objects-kubectl.md)
5. [工作负载核心：Pod 生命周期、Pause、Init 与探针](./k8s-05-pod-workload.md)
6. [Deployment 与副本控制——灰度更新、RC 与 ReplicaSet](./k8s-06-deployment-rs.md)
7. [DaemonSet、StatefulSet、Job 与 CronJob](./k8s-07-daemon-stateful-job.md)
8. [HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点](./k8s-08-hpa-cri-crd.md)

### 阶段 2 · 联网：四层 Service 与集群 DNS

9. [Service 四层流量分发——iptables、IPVS 与四类 Port](./k8s-09-service-l4.md)
10. [Underlay/Overlay 网络与集群 DNS 解析](./k8s-10-network-dns.md)

### 阶段 3 · 状态：配置与存储

11. [应用持久化存储——Volume、PV 与 PVC](./k8s-11-pv-pvc.md)
12. [Secret、ConfigMap 与常见部署排障](./k8s-12-secret-configmap.md)

### 阶段 4 · 入口：七层流量与发布

13. [Ingress 七层流量分发——原理、部署模式与动态域名](./k8s-13-ingress-l7.md)
14. 🚧 [Gateway API：七层入口的新标准与 Ingress 迁移](./k8s-14-gateway-api.md)
15. [发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试](./k8s-15-release-strategies.md)

### 阶段 5 · 会修：可观测与排障

16. [基于 QPS 的动态扩缩容——Prometheus Operator 与 Adapter](./k8s-16-prometheus-hpa.md)
17. [custom-metrics-server 规则配置与 Grafana 展示](./k8s-17-custom-metrics.md)
18. [集群日志收集——ELK 与 EFK](./k8s-18-logging-elk-efk.md)
19. [容器内 JVM 参数解析与生产优化](./k8s-19-jvm-in-container.md)

### 阶段 6 · 会建：生产集群从零到高可用（CKA 冲刺）

20. [生产集群部署——kubeadm 从零到高可用](./k8s-20-deploy-kubeadm-ha.md)
21. [部署方法横向对比——二进制、RKE/RKE2、k0s、sealos 与 kubespray](./k8s-21-deploy-methods.md)
22. [国产化 OS 与容器运行时——OpenEuler、麒麟、CRI-O 与 iSula](./k8s-22-os-runtimes.md)
23. [安全容器运行时——Kata Containers 与 gVisor](./k8s-23-sandbox-runtimes.md)

### 阶段 7 · 交付：从代码到集群

24. [分布式存储方案——Longhorn 与 GlusterFS](./k8s-24-storage-longhorn-glusterfs.md)
25. [Harbor + K8s 手动部署 SpringCloud——镜像构建与推送](./k8s-25-harbor-springcloud.md)
26. [Jenkins + Ingress 自动化灰度发布流水线](./k8s-26-jenkins-canary.md)
27. [发布进阶——Argo Rollouts 金丝雀与 OpenKruise 原地升级](./k8s-27-advanced-rollout.md)
28. [项目上云实战——Java/Python/Golang 与中间件部署](./k8s-28-app-onboarding.md)

### 阶段 8 · 会扩：深水区与专家化（CKS · 毕业）

29. [网络进阶——Cilium、Hybridnet、双栈与 Traefik](./k8s-29-advanced-network.md)
30. [Service Mesh 与 Istio——Sidecar 架构与 Bookinfo](./k8s-30-service-mesh-istio.md)
31. [事件驱动伸缩与集群监控——KEDA 与监控 UI](./k8s-31-keda-monitoring.md)
32. 🚧 [etcd 与 List-Watch：控制面的心跳与自愈心脏](./k8s-32-etcd-listwatch.md)
33. 🚧 [RBAC 与安全加固：认证、鉴权、准入三道关](./k8s-33-rbac-security.md)
34. 🚧 [CRD 与 Operator 开发：把运维经验写成控制器](./k8s-34-crd-operator.md)
35. 🚧 [DRA 与 GPU 调度：AI 时代的资源分配](./k8s-35-dra-gpu-scheduling.md)
