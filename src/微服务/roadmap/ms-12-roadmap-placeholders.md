---
title: "微服务专栏补齐清单：Boot3 / Gateway / Feign 等占位"
sidebarGroup: "路线与占位"
shortTitle: "12 补齐清单与占位"
order: 12
date: 2026-09-07
category: "微服务"
tag:
  - "微服务"
  - "路线"
  - "占位"
description: "微服务专栏 01–11 已发布索引，以及 Boot3、Gateway、Feign、LoadBalancer、SkyWalking、Sa-Token 等待补齐主题。"
---

> **微服务 · 路线与占位 · 第 12/12 篇（系列收尾）**  
> 上一篇：[《Spring 扩展点在微服务组件中的应用》](/微服务/spring-ext/spring-ext-01-extension-points)

---

## 系列说明

本专栏共 **12 篇**，围绕 **Spring Boot 原理 → Spring Cloud Alibaba → Nacos / Sentinel / Seata 内核 → Spring 扩展点** 展开。前 11 篇为本地课件整理的正文；本篇为**补齐清单与占位索引**，标明已有内容与待写主题。

分布式事务**用法与实战**见独立专栏 [分布式 · Seata](/分布式/seata/seata-01-distributed-tx-overview)；本模块 Seata 篇仅做**内核源码深化**。

---

## 一、已发布文章（01–11）

### Spring Boot

| # | 标题 | 链接 |
|---|------|------|
| 01 | 手写模拟 Spring Boot 核心流程 | [boot-01-handwritten-core](/微服务/springboot/boot-01-handwritten-core) |
| 02 | Spring Boot 启动过程源码解析 | [boot-02-startup-source](/微服务/springboot/boot-02-startup-source) |
| 03 | Spring Boot 自动配置底层源码解析 | [boot-03-autoconfigure](/微服务/springboot/boot-03-autoconfigure) |

### Spring Cloud Alibaba

| # | 标题 | 链接 |
|---|------|------|
| 04 | 微服务架构概述与 Spring Cloud Alibaba | [sca-01-microservice-overview](/微服务/springcloud/sca-01-microservice-overview) |
| 05 | Spring Cloud Alibaba 实战总结与组件地图 | [sca-02-practice-summary](/微服务/springcloud/sca-02-practice-summary) |

### Nacos / Sentinel / Seata / 扩展

| # | 标题 | 链接 |
|---|------|------|
| 06 | Nacos 2.x 核心架构源码剖析 | [nacos-01-architecture](/微服务/nacos/nacos-01-architecture) |
| 07 | Nacos 2.x gRPC Client/Server 初始化 | [nacos-02-grpc](/微服务/nacos/nacos-02-grpc) |
| 08 | Nacos 2.x 配置中心源码分析 | [nacos-03-config-center](/微服务/nacos/nacos-03-config-center) |
| 09 | Sentinel 核心架构源码剖析 | [sentinel-01-architecture](/微服务/sentinel/sentinel-01-architecture) |
| 10 | Seata 内核源码深化 | [seata-kernel-01-source](/微服务/seata/seata-kernel-01-source) |
| 11 | Spring 扩展点在微服务组件中的应用 | [spring-ext-01-extension-points](/微服务/spring-ext/spring-ext-01-extension-points) |

---

## 二、待补齐主题（占位）

以下主题在课程 **ProcessOn 大纲** 或外链资料中有覆盖，但**本地暂无完整 PDF/课件**，先以占位形式记录规划。状态均为 **`待补齐`**。

---

### Spring Boot 3 新特性 {#boot3}

> **状态：待补齐**

**将写什么**：Spring Boot 3 / Spring Framework 6 迁移要点——Jakarta EE 命名空间、Native Image 与 AOT、Observability（Micrometer）、虚拟线程（Project Loom）与配置变化；对照 Boot 2 项目的升级清单。

**资料说明**：课件为**语雀外链**，本地目录 `4、5、6节课资料-SpringBoot3新特性-徐庶` 仅含链接文本，无 PDF。

---

### LoadBalancer 实战 {#loadbalancer}

> **状态：待补齐**

**将写什么**：`spring-cloud-starter-loadbalancer` 替代 Ribbon 后的实战——`@LoadBalanced RestTemplate`、`ReactiveLoadBalancer`、`LoadBalancerClientFactory` 自定义负载策略、与 Nacos 服务发现联调。

**大纲参考**：[ProcessOn · LoadBalancer 实战](https://www.processon.com/view/link/66ed063f3551d12631060747)

**已有铺垫**：[Spring 扩展点 · LoadBalancer 绑定拦截器](/微服务/spring-ext/spring-ext-01-extension-points#loadbalancer)

---

### OpenFeign 实战 {#openfeign}

> **状态：待补齐**

**将写什么**：声明式 HTTP 客户端——`@FeignClient` 配置、超时/重试/日志、请求拦截器传递 Header 与 XID、与 Sentinel 降级整合、多环境 URL 覆盖。

**大纲参考**：[ProcessOn · OpenFeign 实战](https://www.processon.com/view/link/66f272bbce5f3001cf4c7bbc)

**已有铺垫**：[Spring 扩展点 · Feign FactoryBean](/微服务/spring-ext/spring-ext-01-extension-points#openfeign)

---

### Nacos 注册中心实战（深化） {#nacos-registry-practice}

> **状态：待补齐**

**将写什么**：注册中心**运维向**实战——命名空间与分组、权重与元数据、临时/持久实例、健康检查与摘流、多集群与异地多活；与源码篇 [nacos-01](/微服务/nacos/nacos-01-architecture)、[nacos-02](/微服务/nacos/nacos-02-grpc) 互补。

**大纲参考**：[ProcessOn · Nacos 注册中心实战](https://www.processon.com/view/link/66ea397f447df77e43f88a4f)

---

### Sentinel 实战（非源码） {#sentinel-practice}

> **状态：待补齐**

**将写什么**：流控规则 QPS/线程数、熔断降级、热点参数、系统自适应保护；规则持久化到 Nacos；Gateway 与 Feign 链路限流；控制台与监控面板使用——**偏运维与规则设计**，非 Slot 链源码。

**大纲参考**：[ProcessOn · Sentinel 实战](https://www.processon.com/view/link/67075d334b2fdd4df7f485b4)

**已有铺垫**：[Sentinel 架构源码](/微服务/sentinel/sentinel-01-architecture)

---

### Seata 实战 {#seata-practice}

> **状态：待补齐**

**将写什么**：SCA 整合 Seata 的**配置与排障**——TC 高可用、全局事务传播、AT undo_log 运维、TCC 业务改造 checklist。

**用法详见**：[分布式 · Seata 系列](/分布式/seata/seata-01-distributed-tx-overview)（AT/TCC 共 8 篇）

**内核详见**：[Seata 内核源码](/微服务/seata/seata-kernel-01-source)

**大纲参考**：[ProcessOn · Seata 实战](https://www.processon.com/view/link/6732101561fdee7d750b35ab)

---

### Spring Cloud Gateway 实战 {#gateway}

> **状态：待补齐**

**将写什么**：路由断言与过滤器链、全局/局部过滤器、JWT 鉴权、限流（RequestRateLimiter + Redis）、与 Nacos 动态路由、与 Sentinel Gateway 适配；与下游 Feign 的 Header 透传。

**大纲参考**：[ProcessOn · Gateway 实战](https://www.processon.com/view/link/67075df6a7a02c54be5a9537)

---

### SkyWalking 实战 {#skywalking}

> **状态：待补齐**

**将写什么**：Java Agent 接入、TraceId 与日志关联、OAP 与存储选型、告警与拓扑；与 Spring Cloud 微服务的采样率与性能开销。

**大纲参考**：[ProcessOn · SkyWalking 实战](https://www.processon.com/view/link/6732102d25e8fb30af32c3d3)

---

### Sa-Token 实战 {#sa-token}

> **状态：待补齐**

**将写什么**：登录认证、权限注解、JWT 模式、网关统一鉴权与微服务内部鉴权分工；与 Spring Cloud Gateway 整合。

**大纲参考**：[ProcessOn · Sa-Token 实战](https://www.processon.com/view/link/672f52ccadd5d50b9af02921)

---

## 三、课程资源与项目

| 资源 | 链接 |
|------|------|
| SCA 2024 课程大纲 | [ProcessOn 大纲](https://www.processon.com/view/link/676ce1f3f80ce653025c43c9) |
| 配套项目 | [Gitee · vip_springcloud_alibaba_2024](https://gitee.com/dongchenglin/vip_springcloud_alibaba_2024) |

---

## 四、系列收尾

| 维度 | 本专栏（微服务） | 分布式专栏（Seata） |
|------|------------------|---------------------|
| 定位 | 组件**内核与 Spring 整合机制** | 分布式事务**模式、实战、面试** |
| Boot | 手写核心 + 启动 + 自动配置 | — |
| SCA | 概述 + 组件地图 + 扩展点 | AT/TCC 八篇 |
| 中间件 | Nacos / Sentinel / Seata **源码** | Seata **用法** |
| 待补 | Gateway / Feign / LB / 监控 / 安全 / Boot3 | 已相对完整 |

建议阅读顺序：**Boot 01–03 → SCA 04–05 → Nacos 06–08 → Sentinel 09 → Seata 内核 10 → 扩展点 11**；需要上手分布式事务时并行阅读 [分布式 Seata](/分布式/seata/seata-01-distributed-tx-overview)。

---

## 小结

- **01–11** 已覆盖本地课件范围内的 Boot、SCA、Nacos、Sentinel、Seata 内核与 Spring 扩展点。
- **本篇占位** 的 9 个主题待本地资料或整理完成后逐篇补齐；占位内容均保留在本页锚点，不创建空壳页面。
- 系列至此完结；感谢跟读。
