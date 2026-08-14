---
title: "Spring 扩展点在微服务组件中的应用"
sidebarGroup: "Spring 扩展"
shortTitle: "01 Spring 扩展点"
order: 11
date: 2026-09-07
category: "微服务"
tag:
  - "微服务"
  - "Spring"
  - "源码"
description: "梳理 Bean 生命周期扩展点，并对照 Nacos、LoadBalancer、Feign、Sentinel、Seata 在 SCA 中的典型落点。"
---

> **微服务 · Spring 扩展 · 第 1/1 篇**  
> 上一篇：[《Seata 内核源码深化》](/微服务/seata/seata-kernel-01-source)  
> 下一篇：[《微服务专栏补齐清单》](/微服务/roadmap/ms-12-roadmap-placeholders)

---

## 开头：中间件「自动生效」背后都是扩展点

整合 Nacos 后服务启动即注册、给 `RestTemplate` 加 `@LoadBalanced` 就能负载均衡、Feign 接口能 `@Autowired` 注入——这些「魔法」并非框架特例，而是 **Spring IoC 生命周期扩展点** 的标准用法。本文先梳理扩展点清单，再按 **Nacos → LoadBalancer → Feign → Sentinel → Seata** 对照源码入口。

**前置**：IoC 原理、[Boot 启动源码](/微服务/springboot/boot-02-startup-source)、[Boot 自动配置](/微服务/springboot/boot-03-autoconfigure) 与本专栏 [Nacos](/微服务/nacos/nacos-01-architecture)、[Sentinel](/微服务/sentinel/sentinel-01-architecture) 内核篇。

---

## 一、Spring 扩展点梳理

| 扩展点 | 典型时机 / 用途 |
|--------|-----------------|
| `BeanFactoryPostProcessor` | BeanDefinition 加载后、Bean 实例化前，修改工厂配置 |
| `BeanDefinitionRegistryPostProcessor` | 注册额外 BeanDefinition（如 `@Import` Registrar） |
| `BeanPostProcessor` | Bean 初始化前后增强 |
| `InstantiationAwareBeanPostProcessor` | 实例化前后、属性注入前后 |
| `AbstractAutoProxyCreator` | AOP 代理创建（Seata 全局事务） |
| `@Import` / `ImportBeanDefinitionRegistrar` / `ImportSelector` | 批量导入配置与 Registrar |
| `Aware`（`ApplicationContextAware`、`BeanFactoryAware`） | 注入容器引用 |
| `InitializingBean` / `@PostConstruct` | 初始化回调 |
| `FactoryBean` | 工厂 Bean，常用来注册接口代理（Feign） |
| `SmartInitializingSingleton` | 全部单例创建完成后统一处理（LoadBalancer、Sentinel 数据源） |
| `ApplicationListener` | 监听容器事件（Nacos 自动注册） |
| `Lifecycle` / `SmartLifecycle` | 启动、停止生命周期（NacosWatch） |
| `HandlerInterceptor` | MVC 请求拦截（Sentinel） |
| `MethodInterceptor` | AOP 方法拦截（Seata） |

### Bean 生命周期主线

![Bean 生命周期主线流程](/微服务/spring-ext-01-extension-points/p002-02.png)

理解上图后，下面每个中间件都可以回答：**它在生命周期的哪一环插入了逻辑？**

---

## 二、Nacos：ApplicationListener 与 SmartLifecycle

### 2.1 为什么启动后会自动注册？

**扩展点**：`ApplicationListener` — 监听容器发布的事件。

调用链：

```text
AbstractAutoServiceRegistration#onApplicationEvent
  → NacosServiceRegistry#register
```

`NacosAutoServiceRegistration` 在 **Web 服务器就绪事件** 触发后，把当前实例注册到 Nacos。这与 [Nacos 架构篇](/微服务/nacos/nacos-01-architecture) 中的客户端注册流程衔接。

![Nacos 自动注册 ApplicationListener 链路](/微服务/spring-ext-01-extension-points/p003-02.png)

### 2.2 NacosWatch：订阅实例变更

**扩展点**：`SmartLifecycle` — 管理需 start/stop 的组件。

```text
NacosWatch#start
  → NamingService#subscribe   // 订阅服务，接收实例变更事件
```

![NacosWatch SmartLifecycle](/微服务/spring-ext-01-extension-points/p004-02.png)

**对照**：Eureka Server 端上下文初始化同样在 `SmartLifecycle#start` 中完成（`EurekaServerInitializerConfiguration`），说明「注册中心客户端/服务端启动钩子」是同一类扩展模式。

---

## 三、LoadBalancer：SmartInitializingSingleton {#loadbalancer}

### 3.1 `@LoadBalanced` 如何生效？

**问题**：为什么 `@Bean` + `@LoadBalanced` 的 `RestTemplate` 能负载均衡？

**扩展点**：`SmartInitializingSingleton` — 所有单例 Bean 创建完毕后，对特定 Bean 做定制。

`LoadBalancerAutoConfiguration` 在 `afterSingletonsInstantiated` 阶段，为所有带 `@LoadBalanced`（配合 `@Qualifier`）的 `RestTemplate` 绑定 **`LoadBalancerInterceptor`**。

```java
@Bean
@LoadBalanced
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```

![LoadBalancer 拦截器绑定](/微服务/spring-ext-01-extension-points/p005-01.png)

请求发出前，拦截器从服务名解析实例并替换 URL——实战细节将写在 [补齐清单 · LoadBalancer](/微服务/roadmap/ms-12-roadmap-placeholders#loadbalancer)。

---

## 四、Feign：FactoryBean 与 Registrar {#openfeign}

### 4.1 接口为何能注入？

Feign 声明的是**接口**，Spring 默认无法直接实例化。 **`FactoryBean`** 扩展点负责：注册工厂 Bean，容器 `getBean` 时返回**代理对象**。

关键类：

- **`FeignClientsRegistrar`**（`ImportBeanDefinitionRegistrar`）：扫描 `@FeignClient`，注册 BeanDefinition；
- **`FeignClientFactoryBean`**：生成 JDK 动态代理，封装 HTTP 调用。

```java
@FeignClient(value = "mall-order", path = "/order")
public interface OrderFeignService {
    @RequestMapping("/findOrderByUserId/{userId}")
    R findOrderByUserId(@PathVariable("userId") Integer userId);
}
```

Controller 中 `@Autowired OrderFeignService` 实际注入的是 FactoryBean 产出的代理。

![Feign FactoryBean 与 Registrar](/微服务/spring-ext-01-extension-points/p007-01.png)

OpenFeign 实战占位见 [补齐清单 · OpenFeign](/微服务/roadmap/ms-12-roadmap-placeholders#openfeign)。

---

## 五、Sentinel：HandlerInterceptor + FactoryBean

### 5.1 Web 资源保护入口

**扩展点**：`HandlerInterceptor` — 增强 MVC 请求。

```text
AbstractSentinelInterceptor#preHandle   // WebMvc 接口资源保护入口
```

![Sentinel HandlerInterceptor](/微服务/spring-ext-01-extension-points/p009-02.png)

与 [Sentinel 架构源码](/微服务/sentinel/sentinel-01-architecture) 中的 Slot 链配合：拦截器负责**资源名解析与埋点**，规则由 Slot 链执行。

### 5.2 规则持久化：SmartInitializingSingleton + FactoryBean

Sentinel 从 Nacos 等读取规则时，组合使用两个扩展点：

```text
SentinelDataSourceHandler#afterSingletonsInstantiated
  → registerBean (FactoryBean)
    → NacosDataSourceFactoryBean#getObject
      → new NacosDataSource(properties, groupId, dataId, converter)
```

**`SmartInitializingSingleton`** 在单例就绪后批量注册数据源 FactoryBean；**`FactoryBean`** 按类型动态装配 `ReadableDataSource`。这与 Nacos [配置中心源码](/微服务/nacos/nacos-03-config-center) 的配置推送模型衔接。

---

## 六、Seata：AbstractAutoProxyCreator + MethodInterceptor

**扩展点组合**：与第三节 Feign 不同，Seata 走 **AOP 代理** 而非 FactoryBean。

| 类 | 作用 |
|----|------|
| `GlobalTransactionScanner` | 继承 `AbstractAutoProxyCreator`，在 Bean 初始化阶段决定是否代理 |
| `GlobalTransactionalInterceptor` | `MethodInterceptor`，拦截 `@GlobalTransactional` / `@GlobalLock` |

![Seata GlobalTransactionScanner 与 Interceptor](/微服务/spring-ext-01-extension-points/p011-03.png)

内核侧 Session、undo 链见 [Seata 内核篇](/微服务/seata/seata-kernel-01-source)；用法见 [分布式 · AT 实战](/分布式/seata/seata-04-at-tm-rm)。

---

## 七、扩展点速查表

| 组件 | 扩展点 | 入口类 |
|------|--------|--------|
| Nacos 注册 | `ApplicationListener` | `AbstractAutoServiceRegistration` |
| Nacos 订阅 | `SmartLifecycle` | `NacosWatch` |
| LoadBalancer | `SmartInitializingSingleton` | `LoadBalancerAutoConfiguration` |
| OpenFeign | `ImportBeanDefinitionRegistrar` + `FactoryBean` | `FeignClientsRegistrar` / `FeignClientFactoryBean` |
| Sentinel Web | `HandlerInterceptor` | `AbstractSentinelInterceptor` |
| Sentinel 规则源 | `SmartInitializingSingleton` + `FactoryBean` | `SentinelDataSourceHandler` / `NacosDataSourceFactoryBean` |
| Seata 全局事务 | `AbstractAutoProxyCreator` + `MethodInterceptor` | `GlobalTransactionScanner` / `GlobalTransactionalInterceptor` |

---

## 小结

微服务组件并非各自发明一套「启动魔法」，而是在 Spring **统一生命周期** 上挂接钩子：事件监听负责**就绪后注册**，`SmartLifecycle` 负责**长连接订阅**，`SmartInitializingSingleton` 负责**单例就绪后的批量增强**，`FactoryBean` 负责**接口代理**，AOP 负责**方法级事务**。掌握这张地图后，阅读任意 SCA 组件源码都能快速定位入口。

下一篇：[微服务专栏补齐清单](/微服务/roadmap/ms-12-roadmap-placeholders) — 系列收尾与待写主题占位。
