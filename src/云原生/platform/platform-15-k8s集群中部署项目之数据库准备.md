---
title: k8s集群中部署项目之数据库准备
sidebarGroup: 平台与实战
shortTitle: 15 k8s集群中部署项目之数据库准备
order: 15
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: 'k8s集群中部署微服务项目之数据库准备 一、navicat准备 二、 MySQL数据库连接 ~~~powershell lb.kubesphere.io/v1alpha1: openelb proto...'
---

> **微服务实战 · 第 10 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# k8s集群中部署微服务项目之数据库准备

# 一、navicat准备

![image-20221130152850632](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130152850632.png)

![image-20221130152922475](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130152922475.png)

![image-20221130152951172](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130152951172.png)

![image-20221130153012542](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130153012542.png)

![image-20221130153035678](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130153035678.png)

![image-20221130153056972](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130153056972.png)

![image-20221130153125166](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130153125166.png)

# 二、 MySQL数据库连接

![image-20221130154208901](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130154208901.png)

![image-20221130154242209](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130154242209.png)

![image-20221130154404052](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130154404052.png)

![image-20221130154436616](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130154436616.png)

![image-20221130154519373](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130154519373.png)

![image-20221130154634517](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130154634517.png)

![image-20221212091344146](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221212091344146.png)

~~~powershell
lb.kubesphere.io/v1alpha1: openelb
protocol.openelb.kubesphere.io/v1alpha1: layer2
eip.openelb.kubesphere.io/v1alpha2: layer2-eip
~~~

![image-20221130155333267](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130155333267.png)

![image-20221130155912862](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130155912862.png)

![image-20221130155938779](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130155938779.png)

![image-20221130160040526](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130160040526.png)

![image-20221130160120272](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130160120272.png)

![image-20221130160143098](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130160143098.png)

![image-20221130160223916](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130160223916.png)

# 三、 创建项目数据库及数据导入

## 3.1 mall_oms（订单数据库）

![image-20221130160414395](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130160414395.png)

![image-20221201225735962](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201225735962.png)

![image-20221201225807842](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201225807842.png)

![image-20221130161552605](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130161552605.png)

![image-20221130161905269](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130161905269.png)

![image-20221130161726467](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130161726467.png)

![image-20221130161808771](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130161808771.png)

## 3.2 mall_pms（商品数据库）

![image-20221130162127393](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130162127393.png)

![image-20221201225937192](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201225937192.png)

![image-20221201225957383](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201225957383.png)

![image-20221130162258077](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130162258077.png)

![image-20221130162345372](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130162345372.png)

![image-20221130162413818](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130162413818.png)

**导入商品分类表**

![image-20221130164328162](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130164328162.png)

![image-20221130164433070](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130164433070.png)

![image-20221130164520928](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130164520928.png)

![image-20221130164606840](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130164606840.png)

## 3.3 mall_sms（综合管理数据库）

![image-20221130162747497](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130162747497.png)

![image-20221201230212440](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230212440.png)

![image-20221201230235418](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230235418.png)

![image-20221130162937623](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130162937623.png)

![image-20221130163012133](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163012133.png)

![image-20221130163058335](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163058335.png)

![image-20221130163129839](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163129839.png)

## 3.4 mall_ums（会员数据库）

![image-20221130163217622](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163217622.png)

![image-20221201230428771](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230428771.png)

![image-20221130163320108](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163320108.png)

![image-20221130163358726](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163358726.png)

![image-20221130163432988](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163432988.png)

![image-20221130163500829](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163500829.png)

## 3.5 mall_wms（仓储数据库）

![image-20221130163552418](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163552418.png)

![image-20221201230600024](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230600024.png)

![image-20221201230618313](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230618313.png)

![image-20221130163732072](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163732072.png)

![image-20221130163808665](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163808665.png)

![image-20221130163846455](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163846455.png)

![image-20221130163916967](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130163916967.png)

## 3.6 renren_fast（后端管理数据库）

![image-20221130170130779](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130170130779.png)

![image-20221201230741603](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230741603.png)

![image-20221201230805678](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221201230805678.png)

![image-20221130170737014](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130170737014.png)

![image-20221130171427784](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130171427784.png)

![image-20221130171502940](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130171502940.png)

![image-20221130171537684](/云原生/platform/platform-15-k8s集群中部署项目之数据库准备/image-20221130171537684.png)

