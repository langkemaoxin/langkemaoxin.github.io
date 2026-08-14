---
title: 微服务
index: false
icon: cubes
article: false
---

# 微服务

本专栏围绕 **Spring Boot 原理 → Spring Cloud Alibaba → Nacos / Sentinel / Seata 内核 → Spring 扩展点** 展开。

当前本地课件覆盖 Boot 核心源码、SCA 概览与总结、Nacos/Sentinel/Seata 内核、Spring 扩展点；Gateway / OpenFeign / LoadBalancer / SkyWalking / Sa-Token / Boot3 等见 [补齐清单](./roadmap/ms-12-roadmap-placeholders.md) 占位。

分布式事务用法见独立专栏 [分布式 · Seata](/分布式/seata/seata-01-distributed-tx-overview)；本模块 Seata 篇做**内核源码深化**。

## 文章目录

### Spring Boot
1. [手写模拟 Spring Boot 核心流程](./springboot/boot-01-handwritten-core.md)
2. [Spring Boot 启动过程源码解析](./springboot/boot-02-startup-source.md)
3. [Spring Boot 自动配置底层源码解析](./springboot/boot-03-autoconfigure.md)

### Spring Cloud Alibaba
4. [微服务架构概述与 Spring Cloud Alibaba](./springcloud/sca-01-microservice-overview.md)
5. [Spring Cloud Alibaba 实战总结与组件地图](./springcloud/sca-02-practice-summary.md)

### Nacos / Sentinel / Seata / 扩展
6. [Nacos 2.x 核心架构源码剖析](./nacos/nacos-01-architecture.md)
7. [Nacos 2.x gRPC Client/Server 初始化](./nacos/nacos-02-grpc.md)
8. [Nacos 2.x 配置中心源码分析](./nacos/nacos-03-config-center.md)
9. [Sentinel 核心架构源码剖析](./sentinel/sentinel-01-architecture.md)
10. [Seata 内核源码深化](./seata/seata-kernel-01-source.md)
11. [Spring 扩展点在微服务组件中的应用](./spring-ext/spring-ext-01-extension-points.md)
12. [补齐清单与占位](./roadmap/ms-12-roadmap-placeholders.md)
