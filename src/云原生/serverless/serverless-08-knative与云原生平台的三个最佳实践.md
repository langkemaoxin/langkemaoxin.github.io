---
title: Knative与云原生平台的三个最佳实践
sidebarGroup: Serverless
shortTitle: 08 Knative与云原生平台的三个最佳实践
order: 8
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Knative与云原生平台的三个最佳实践 一、最佳实践三个层面 1）服务编排要实现计算资源弹性化 2） 服务构建和部署要实现高度自动化 3）事件驱动基础设施标准化 二、Knative组件 Knativ...
---

> **Serverless · 第 8 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Knative与云原生平台的三个最佳实践

# 一、最佳实践三个层面

1）服务编排要实现计算资源弹性化

2） 服务构建和部署要实现高度自动化

3）事件驱动基础设施标准化

# 二、Knative组件

Knative的三个组件（Serving、Build、Eventing）正是遵循这三个最佳实践的设计实现。

## 2.1 Serving

### 2.1.1 serving组件提供的能力

> 把微服务从0扩展到无限

- 用户容器的快速部署
- 自动伸缩，支持缩容到零
- 服务路由和流量控制
- 容器和配置的版本管理

### 2.1.2 Serving组件的主要概念构成

> 四类主要的API

> 需要istio实现其底层的网络分发

- Service：管理应用的生命周期，确保应用拥有configuration和route，并可以定义应用使请求导向特定的revision
- Route:定义网络端口，映射到一个或多个revision
- Configuration:维护部署的期望状态，每次修改configuration产生一个新的revision
- Revision: 每次修改代码和配置产生的快照，不可更改。每个revision对应一次代码的部署，通过route把不同的流量导向不同的revision上去，并可以根据流量自动扩展,Revision类似于容器的容器镜像

![image-20211230100755650](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211230100755650.png)

### 2.1.3 用户容器的主要限制

- 必须是无状态的HTTP服务
- 允许挂载configmap、secret，但不允许挂载持久卷pvc
- 一个Service只能有一个用户容器

## 2.2 Tekton

Knative build作为Knative的CI/CD基础组件，实现了服务的自动化构建和部署能力。 在v0.8.0后由Tekton Pipelines项目替代，Tekton pipline是google开源的另外一个用于云原生平台的CI/CD的项目，以其灵活扩展的能力、轻量级、白盒化的特点成为Knative build的最佳接替者。

![image-20211230114234991](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211230114234991.png)

![image-20211230114421047](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211230114421047.png)

![image-20211230114438574](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211230114438574.png)

## 2.3 Eventing

Knative Eventing的核心功能是对发布/订阅细节进行抽象处理，帮助开发人员摆脱相关负担一种开发模型，由于前后端实现松耦合。

Eventing组件的特性如下：

- 声明式地绑定event sources, triggers和services
- 从少量事件到实时stream pipelines动态扩展
- 采用CloudeEvents标准
- 抽象的事件来源，解耦具体事件源类型(eg. Kafka,CronJob,Github,kubernetes … )
- Channel处理缓冲和持久性，即使该服务已被关闭时也确保将事件传递到其预期的服务。另外，Channel是我们代码和底层消息传递解决方案之间的一个抽象层。这意味着可以像 Kafka 和 RabbitMQ 一样在某些服务之间进行消息交换，但在这两种情况下我们都不需要编写特定的实现代码。(目前Channel的实现有InMemory, Kafka, Nats, PubSub )

![image-20211229091610529](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211229091610529.png)

# 三、关于CloudEvent

由于Serverless 平台和产品众多，支持的事件来源和事件格式定义也是五花八门，CNCF serveless工作组提出CloudEvnets项目，试图对事件进行标准化。

CloudEvents是以通用格式描述事件数据的规范，以提供跨服务、平台和系统的互操作性。CloudEvents当前已经发布1.0版。

![image-20211229092017272](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211229092017272.png)

![image-20211229092150118](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211229092150118.png)

![image-20211229123418255](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211229123418255.png)

# 四、整体结构图

![image-20211229090923888](/云原生/serverless/serverless-08-knative与云原生平台的三个最佳实践/image-20211229090923888.png)

