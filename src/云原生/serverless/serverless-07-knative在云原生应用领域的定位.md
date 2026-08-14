---
title: Knative在云原生应用领域的定位
sidebarGroup: Serverless
shortTitle: 07 Knative在云原生应用领域的定位
order: 7
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Knative在云原生应用领域的定位 一、Knative在Kubernetes生态中的定位 - Kubernetes作为基础设施，解决应用编排和运行环境； - Isito作为通信基础设施层，保证服务的...
---

> **Serverless · 第 7 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Knative在云原生应用领域的定位

# 一、Knative在Kubernetes生态中的定位

- Kubernetes作为基础设施，解决应用编排和运行环境；
- Isito作为通信基础设施层，保证服务的运行可检测、可配置、可追踪；
- Knative使用应用模板和统一的运行环境来标准化服务的构建、部署和管理；
- Knative构建在Kubernetes、Istio、Container的基础上，以K8S的CRD形式存在。

![image-20211229085759499](/云原生/serverless/serverless-07-knative在云原生应用领域的定位/image-20211229085759499.png)

# 二、已有kubernetes，我们为何还需要Knative

## 2.1 Kubernetes对使用者要求

K8S对业务开发者来说过多暴露了平台的细节，技术门槛比较高，大部分情况下，开发者并不希望关心容器编排的细节，只想关心应用本身的业务逻辑，服务规模的扩展交给平台来完成。K8S更适合Devops用来构建PaaS平台。

## 2.2 Knative能够满足使用者需求

Knative 将kubernetes和istio的复杂度进行抽象和隔离，解决了繁琐的构建，部署，服务治理步骤，并且基于开放标准使得服务变得可移植。

