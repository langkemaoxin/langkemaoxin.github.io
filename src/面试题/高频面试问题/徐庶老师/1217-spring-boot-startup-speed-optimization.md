---
title: "有没有优化过 Spring Boot 启动速度"
sidebarGroup: "徐庶老师"
shortTitle: "有没有优化过 Spring Boot 启动速度"
order: 1217
date: 2026-04-21
category: "面试题"
tag:
  - "面试题"
description: "面试官问你：有没有优化过 Spring Boot 启动速度？ 怎么回答“加@Lazy?、换 GraalVM?”，那你是真没做过！面试官想听到的是你真实的优化案例，你如何排查、定位和解决实际业务中的启动耗时问题。 Spring Boot 启动"
article: false
---

> 来源：[有没有优化过 Spring Boot 启动速度](https://www.yuque.com/tulingzhouyu/db22bv/fdpw219yfp60w5bz)

**面试官问你：有没有优化过 Spring Boot 启动速度？**

怎么回答“加@Lazy?、换 GraalVM?”，那你是真没做过！面试官想听到的是你真实的优化案例，你如何排查、定位和解决实际业务中的启动耗时问题。

Spring Boot 启动慢并不是框架的原罪。为了提供开箱即用的体验，他在启动过程帮我干了很多事情：

### 启动流程深度解析

Spring Boot 启动过程可分为 **6 个核心阶段**，这里是简要代码示例：

```plain
复制
public ConfigurableApplicationContext run(String... args) {
    StopWatch stopWatch = new StopWatch();
    stopWatch.start();
    // 初始化 SpringApplication
    // 准备环境
    // 创建并刷新 ApplicationContext
    context = createApplicationContext();
    refreshContext(context); // 核心
    // 执行 CommandLineRunner / ApplicationRunner
    // 发布 ApplicationReadyEvent
}
```

#### 关键阶段分析

1. **应用上下文创建**：通常耗时 < 100ms，影响较小。
2. **环境准备**：中等耗时（200~800ms），依赖配置源数量。
3. **自动配置与 Bean 扫描**：占总耗时的 **60%~80%**，性能瓶颈集中在这一步。。其实官方在不断优化（ 从多线程过滤自动配置类 → SpringBoot 3 重构 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` → 再到 GraalVM 原生镜像。  ）， 但这些都是 “框架内部优化”  ， 面试官真正关注的是你如何应对实际业务中的启动耗时。

因为很多时候，启动慢根本不是 SpringBoot 本身的问题，而是你项目里的第三方组件、自定义代码，在启动时做了耗时操作 —— 比如初始化数据库连接、预加载大量数据、自定义钩子函数里的耗时逻辑，这些才是关键！

核心：先找到耗时在哪里，再优化！关键要懂 Spring 初始化扩展点，精准 debug：

### 启动性能诊断方法论（30-45秒）

1. **启用启动指标**：在 `application.yml` 中设置 `spring.main.log-startup-info: true`，查看各步骤耗时。
2. **使用 Spring Boot Actuator**：引入依赖并启用 `startup` 端点，访问 `/actuator/startup` 获取详细的启动阶段耗时。

3. 以上2种方式也只能确认你确实哪个阶段慢， 但是你想确认是哪个bean创建慢， 你可以利用bean的创建前后初始化后的扩展点， 来记录耗时时间并且排序。（提供代码）

### 系统性优化策略（45-55秒）

结合实际经验，以下是五条有效的优化建议：

1. **精确化 **`@ComponentScan`：避免全包扫描，限制扫描范围。

```plain

@SpringBootApplication
@ComponentScan(basePackages = "com.company.order.service")
public class OrderApplication { ... }
```

1. **排除不必要的自动配置**：在 `@SpringBootApplication` 中排除无用配置。

```plain

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class App { ... }
```

1. **启用懒加载**：全局懒加载，只有在首次使用时创建 Bean，但是有些bean他就是启动的时候就会创建， 比如一个beanA依赖注入另一个beanB, beanB你即便加了懒加载也无济于事

```plain

spring:
  main:
    lazy-initialization: true
```

1. **优化重量级组件初始化**：如数据库连接池预热、调用远程http加载数据等。  这个就只能启动速度和首次访问加载选其一了。

```plain

@Bean
public DataSource dataSource() {
    HikariConfig config = new HikariConfig();
    config.setConnectionInitSql("SELECT 1");
    return new HikariDataSource(config);
}
```

1. **使用 GraalVM 原生镜像**：启动时间从秒级降至毫秒级，内存占用减少 50% 以上，但是这种方式目前有很多限制比如动态代理啊，反射啊， 等等，对项目影响较大， 目前很少会有项目为了启动速度将老项目重构为graalvm（新项目可以考虑）

### 金句总结（55-60秒）

**总结**：Spring Boot 启动优化，不仅仅是框架层面的优化！面试官想听的是：通过启动日志、扩展点和工具定位耗时根源，精准缩小扫描、排除无用配置、开启懒加载、延迟重组件初始化，最后结合 GraalVM 进行极致优化。这才是生产优化的真实回答！
