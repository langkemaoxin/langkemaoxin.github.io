---
title: Knative介绍
sidebarGroup: Serverless
shortTitle: 06 Knative介绍
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: 'Knative介绍 一、Knative相关网址 1.1 官方网址 网址为: knative.dev 1.2 开源网址 http[path] 二、Knative产品愿景 ...'
---

> **Serverless · 第 6 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Knative介绍

# 一、Knative相关网址

## 1.1 官方网址

网址为: knative.dev

![image-20211229110338275](/云原生/serverless/serverless-06-knative介绍/image-20211229110338275.png)

## 1.2 开源网址

https://github.com/knative

![image-20211229110904884](/云原生/serverless/serverless-06-knative介绍/image-20211229110904884.png)

# 二、Knative产品愿景

## 2.1 Serverless乱世

在 Knative 之前社区已经有很多 Serverless 解决方案，如下所示这些：

- kubeless
- Fission
- OpenFaaS
- Apache OpenWhisk

除了上面这些社区的开源解决方案以外各大云厂商也都有各自的 FaaS 产品的实现比如：

- AWS Lambda
- Google Cloud Functions
- Microsoft Azure Functions
- 阿里云的函数计算

业务代码部署到 Serverless 平台上就离不开源码的编译、部署和事件的管理。然而无论是开源的解决方案还是各公有云的 FaaS 产品大家的实现方式大家都各不相同，缺乏统一的标准导致市场呈现碎片化。因此无论选择哪一个方案都面临供应商绑定的风险。没有统一的标准、市场的碎片化这对云厂商来说用户 Serverless 上云就比较困难；对于 PaaS 提供商来说很难做一个通用的 PAAS 平台给用户使用。

基于这样的背景 Google 牵头联合IBM、Red Hat 等发起了 Knative 项目。

## 2.2 Knative一统江山

- Knative 是谷歌2018年发起的，IBM、RedHat等公司参与的，基于kubernetes平台的Serverless 开源项目,致力将Serverless标准化。

- 每当出现一种被广泛认可的技术标准，就意味着相应技术生态形成的开始。 就像CRI、CNI和CSI对于kubernetes生态的形成起到了至关重要的作用。Google发起的Knative项目正是致力于Serverless的标准化，将serveless的服务管理，事件驱动，构建部署进行了标准化。它不仅可以以托管服务形式运行在公有云中，也可以部署在企业内部的数据中心，很好地解决了多云部署以及供应商锁定问题。

![image-20211229111224491](/云原生/serverless/serverless-06-knative介绍/image-20211229111224491.png)

![image-20211229225129954](/云原生/serverless/serverless-06-knative介绍/image-20211229225129954.png)

