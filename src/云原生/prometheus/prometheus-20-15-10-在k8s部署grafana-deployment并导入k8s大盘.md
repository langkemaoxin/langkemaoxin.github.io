---
title: "15.10 在k8s部署grafana-deployment并导入k8s大盘"
sidebarGroup: "Prometheus"
shortTitle: "20 15.10 在k8s部署grafana-de..."
order: 20
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - grafana deployment部署 - k8s大盘导入 准备yaml 部署工作 1. 修改yaml中的节点选择器标签 k8s-node01改为你自己的节点 2. 在节点上创..."
---

> **Prometheus · 第 20 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- grafana deployment部署
- k8s大盘导入

# 准备yaml

# 部署工作

## 1. 修改yaml中的节点选择器标签 k8s-node01改为你自己的节点

## 2. 在节点上创建数据目录

```shell
mkdir -pv /data/grafana

```

## 3. 部署grafana

```shell
# 部署
kubectl apply -f deployment.yaml
# 检查 
[root@prome-master01 grafana]# kubectl get pod 
NAME                       READY   STATUS    RESTARTS   AGE
grafana-756fb84d84-h2jf7   1/1     Running   0          45s
[root@prome-master01 grafana]# 

```

## 4. 访问 节点的 :30000端口  账户密码 : admin/admin

## 5. 添加prometheus数据源，如果prometheus是 hostnetwork的，直接写node的ip:port即可

# 导入grafana大盘

## 基础大盘

- https://grafana.com/grafana/dashboards/13105
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/7263a68146434016bede3587665513f4.png)

## Deployment Statefulset Daemonset 统计

- https://grafana.com/grafana/dashboards/8588
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/60f013b99f8c4294a0a728fcfe392301.png)

## 集群汇总大盘

- https://grafana.com/grafana/dashboards/8685![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/19ef24956b434b67a713c7d184ee9e05.png)

## apiserver 健康度

- https://grafana.com/grafana/dashboards/12006
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/7a122c4ffef54b199345925464ee5d77.png)

# 本节重点总结 :

- grafana deployment部署
- k8s大盘导入

