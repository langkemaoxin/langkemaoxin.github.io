---
title: "KubeSphere集成本地容器镜像仓库 Harbor"
sidebarGroup: "PaaS 平台"
shortTitle: "09 KubeSphere集成本地容器镜像仓库 H..."
order: 9
date: 2026-08-13
category: "云原生"
tag:
  - "PaaS 平台"
  - "云原生"
  - "课程笔记"
description: "KubeSphere集成本地容器镜像仓库 Harbor 一、添加本地非安全容器镜像仓库至Docker配置 在k8s集群节点上配置 ~~~powershell cat /etc/docker/daemo..."
---

> **PaaS 平台 · 第 9 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# KubeSphere集成本地容器镜像仓库 Harbor

# 一、添加本地非安全容器镜像仓库至Docker配置

> 在k8s集群节点上配置

~~~powershell
# cat /etc/docker/daemon.json
{
        "exec-opts": ["native.cgroupdriver=systemd"]，
        "insecure-registries": ["http://harbor.mashibing.com"]
}
~~~

~~~powershell
# systemctl daemon-reload 

# systemctl restart docker
~~~

# 二、KubeSphere仓库配置密钥

> 在使用本地容器镜像仓库Harbor之前，需要创建密钥文件

![image-20221116111739797](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116111739797.png)

![image-20230227202757035](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227202757035.png)

![image-20230227202838828](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227202838828.png)

![image-20230227202920039](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227202920039.png)

![image-20230227203018304](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227203018304.png)

![image-20230227205906667](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227205906667.png)

# 三、创建应用进行测试及访问

## 3.1 容器镜像准备

> 在harbor主机上准备，需要为docker配置非安全仓库。

~~~powershell
# cat /etc/docker/daemon.json
{
        "insecure-registries": ["http://harbor.mashibing.com"]
}
~~~

~~~powershell
# docker pull nginx:latest
~~~

~~~powershell
# docker tag nginx:latest harbor.mashibing.com/library/nginx:v1
~~~

~~~powershell
# docker push harbor.mashibing.com/library/nginx:v1
~~~

![image-20221116112927002](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116112927002.png)

![image-20221116114040416](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116114040416.png)

## 3.2 创建应用

![image-20221116114233757](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116114233757.png)

![image-20221116114317826](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116114317826.png)

![image-20221116114334255](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116114334255.png)

![image-20221116114402046](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116114402046.png)

![image-20221116115226626](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116115226626.png)

![image-20221116115259870](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116115259870.png)

![image-20230227210936521](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227210936521.png)

![image-20230227211009147](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20230227211009147.png)

![image-20221116120021162](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116120021162.png)

![image-20221116120043459](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116120043459.png)

![image-20221116120101932](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116120101932.png)

![image-20221116120126052](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116120126052.png)

![image-20221116120239629](/云原生/paas/paas-09-kubesphere集成本地容器镜像仓库-harbor/image-20221116120239629.png)

