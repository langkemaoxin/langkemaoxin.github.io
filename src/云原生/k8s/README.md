---
title: Kubernetes
index: false
icon: dharmachakra
article: false
description: Kubernetes
---

# Kubernetes

云原生编排层。Docker 把「一个进程怎么进沙箱」讲清楚之后，K8s 负责「成百上千个容器怎么调度、发现、扩缩与自愈」。

本系列共 **20 篇**，整合《K8S 学习圣经》主线：宏观架构 → 工作负载 → 网络存储 → Ingress/灰度 → Service Mesh → SpringCloud/Jenkins 实战 → 监控扩缩与容器 JVM。

建议先读完 [Docker 系列](/云原生/docker/docker-01-what-is-docker)，再按侧栏或下方目录阅读。

## 文章目录

1. [云原生原理与演进——从 CNCF 到 Service Mesh](./k8s-01-cloud-native.md)
2. [穿透 K8S 八大宏观架构——Master、Worker 与数据流](./k8s-02-macro-architecture.md)
3. [K8s 运行时实操——Minikube 安装、排障与 Helm](./k8s-03-minikube-runtime.md)
4. [Kubernetes 基本概念与 kubectl——对象模型与常用命令](./k8s-04-objects-kubectl.md)
5. [工作负载核心：Pod 生命周期、Pause、Init 与探针](./k8s-05-pod-workload.md)
6. [Deployment 与副本控制——灰度更新、RC 与 ReplicaSet](./k8s-06-deployment-rs.md)
7. [DaemonSet、StatefulSet、Job 与 CronJob](./k8s-07-daemon-stateful-job.md)
8. [HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点](./k8s-08-hpa-cri-crd.md)
9. [Service 四层流量分发——iptables、IPVS 与四类 Port](./k8s-09-service-l4.md)
10. [Underlay/Overlay 网络与集群 DNS 解析](./k8s-10-network-dns.md)
11. [应用持久化存储——Volume、PV 与 PVC](./k8s-11-pv-pvc.md)
12. [Ingress 七层流量分发——原理、部署模式与动态域名](./k8s-12-ingress-l7.md)
13. [发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试](./k8s-13-release-strategies.md)
14. [Service Mesh 与 Istio——Sidecar 架构与 Bookinfo](./k8s-14-service-mesh-istio.md)
15. [Harbor + K8s 手动部署 SpringCloud——镜像构建与推送](./k8s-15-harbor-springcloud.md)
16. [Secret、ConfigMap 与常见部署排障](./k8s-16-secret-configmap.md)
17. [Jenkins + Ingress 自动化灰度发布流水线](./k8s-17-jenkins-canary.md)
18. [基于 QPS 的动态扩缩容——Prometheus Operator 与 Adapter](./k8s-18-prometheus-hpa.md)
19. [custom-metrics-server 规则配置与 Grafana 展示](./k8s-19-custom-metrics.md)
20. [容器内 JVM 参数解析与生产优化](./k8s-20-jvm-in-container.md)
