---
title: Kubesphere部署三高商城组织架构说明
sidebarGroup: 平台与实战
shortTitle: 06 Kubesphere部署三高商城组织架构说明
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - PaaS 平台
  - 云原生
  - 课程笔记
description: KubeSphere部署三高商城组织架构说明 一、 创建企业空间 1.使用ws-manager用户登录KubeSphere web控制器，创建企业空间。 2.登出控制台，然后以 ws-admin 身份...
---

> **PaaS 平台 · 第 6 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# KubeSphere部署三高商城组织架构说明

# 一、 创建企业空间

1.使用ws-manager用户登录KubeSphere  web控制器，创建企业空间。

![image-20221103172420650](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172420650.png)

![image-20221103172450784](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172450784.png)

![image-20221103172602969](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172602969.png)

![image-20221103172651118](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172651118.png)

2.登出控制台，然后以 `ws-admin` 身份重新登录。在**企业空间设置**中，选择**企业空间成员**，然后点击**邀请**。

4.邀请 `project-admin` 和 `project-regular` 进入企业空间，分别授予 `demo-workspace-self-provisioner` 和 `demo-workspace-viewer` 角色，点击**确定**。

![image-20221103172808727](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172808727.png)

![image-20221103172852331](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172852331.png)

![image-20221103172927032](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103172927032.png)

![image-20221103173000982](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103173000982.png)

![image-20221103173034947](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103173034947.png)

# 二、 创建项目

在此步骤中，您需要使用在上一步骤中创建的帐户 `project-admin` 来创建项目。KubeSphere 中的项目与 Kubernetes 中的命名空间相同，为资源提供了虚拟隔离。有关更多信息，请参见[命名空间](https://kubernetes.io/zh/docs/concepts/overview/working-with-objects/namespaces/)。

1.以 `project-admin` 身份登录 KubeSphere Web 控制台，在**项目**中，点击**创建**。

2.输入项目名称（例如 `sangomall`），点击**确定**。您还可以为项目添加别名和描述。

3.在**项目**中，点击刚创建的项目查看其详情页面。

4.在项目的**概览**页面，默认情况下未设置项目配额。您可以点击**编辑配额**并根据需要指定[资源请求和限制](https://v3-2.docs.kubesphere.io/zh/docs/workspace-administration/project-quotas/)（例如：CPU 和内存的限制分别设为 1 Core 和 1000 Gi）。

5.在**项目设置** > **项目成员**中，邀请 `project-regular` 至该项目，并授予该用户 `operator` 角色。

![image-20221103173611878](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103173611878.png)

![image-20221103173642396](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103173642396.png)

![image-20221103173845981](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103173845981.png)

![image-20221103174001083](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174001083.png)

![image-20221103174014789](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174014789.png)

![image-20221103174527562](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174527562.png)

![image-20221103174612356](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174612356.png)

![image-20221103174631858](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174631858.png)

![image-20221103174654306](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174654306.png)

![image-20221103174740574](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174740574.png)

![image-20221103174804376](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174804376.png)

![image-20221103174835635](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103174835635.png)

>如果要使用 `LoadBalancer` 暴露服务，则需要使用云厂商的 LoadBalancer 插件。如果您的 Kubernetes 集群在裸机环境中运行，建议使用 [OpenELB](https://github.com/kubesphere/openelb) 作为 LoadBalancer 插件。

# 三、 创建DevOps项目

![image-20221103175425428](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103175425428.png)

![image-20221103180539552](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180539552.png)

![image-20221103180421015](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180421015.png)

![image-20221103180438211](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180438211.png)

![image-20221103180642271](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180642271.png)

![image-20221103180713252](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180713252.png)

![image-20221103180749139](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180749139.png)

![image-20221103180826268](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221103180826268.png)

> 项目准备好后，创建流水线即可实现发布。

![image-20221116145507311](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221116145507311.png)

![image-20221116145702664](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221116145702664.png)

![image-20221116145803133](/云原生/platform/platform-06-kubesphere部署三高商城组织架构说明/image-20221116145803133.png)

