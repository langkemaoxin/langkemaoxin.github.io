---
title: k8s集群中部署服务之Dockerfile文件准备
sidebarGroup: 平台与实战
shortTitle: 12 k8s集群中部署服务之Dockerfile文件准
order: 12
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: '微服务项目各微服务Dockerfile文件准备 一、获取jar的方法 二、各微服务Dockerfile文件准备 2.1 mall-auth ~~~powershell FROM openjdk:8 E...'
---

> **微服务实战 · 第 7 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 微服务项目各微服务Dockerfile文件准备

# 一、获取jar的方法

![image-20221125151520749](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221125151520749.png)

![image-20221125151641610](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221125151641610.png)

![image-20221125151816250](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221125151816250.png)

# 二、各微服务Dockerfile文件准备

## 2.1  mall-auth

![image-20221208115826648](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208115826648.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 30000

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.2 mall-cart

![image-20221208120156489](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208120156489.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 22200

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.3 mall-coupon

![image-20221208120632826](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208120632826.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8010

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.4 mall-gateway

![image-20221208120836290](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208120836290.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8072

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.5 mall-member

![image-20221208121017862](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121017862.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 20300

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.6 mall-order

![image-20221208121135686](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121135686.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8030

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.7 mall-product

![image-20221208121249417](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121249417.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8040

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.8 mall-search

![image-20221208121407868](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121407868.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8090

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.9 mall-seckill

![image-20221208121521080](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121521080.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 9601

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.10 mall-third-party

![image-20221208121629451](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121629451.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8100

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.11 mall-ware

![image-20221208121750353](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121750353.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8050

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

## 2.12 renren-fast-master

![image-20221208121856159](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208121856159.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 8080

VOLUME /tmp

ADD  target/*.jar /app.jar

ENTRYPOINT ["java","-jar","/app.jar","--spring.profiles.active=dev"]
~~~

## 2.13 renren-generator-master

![image-20221208122016906](/云原生/platform/platform-12-k8s集群中部署服务之dockerfile文件准备/image-20221208122016906.png)

~~~powershell
FROM openjdk:8

ENV TZ Asia/Shanghai

EXPOSE 80

VOLUME /tmp

ADD target/*.jar  /app.jar

ENTRYPOINT ["java","-jar","/app.jar"]
~~~

# 三、容器镜像构建命令

~~~powershell
# docker build -f Dockerfile -t harbor.msb.com/sangomall/xxx:v1.0 .
~~~

~~~powershell
# docker build -f Dockerfile -t docker.io/nextgomsb/xxx:v1.0 .
~~~

