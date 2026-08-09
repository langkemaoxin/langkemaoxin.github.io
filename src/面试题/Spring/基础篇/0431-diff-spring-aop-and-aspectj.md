---
title: "Spring AOP 与 AspectJ 的区别"
sidebarGroup: "基础篇"
shortTitle: "Spring AOP 与 AspectJ 的区别"
order: 431
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "Spring AOP的实现原理Spring AOP 基于代理模式实现，主要采用两种代理方式（Spring 框架采用了 AspectJ 的注解风格，但底层实现仍保持了 Spring AOP 自身的代理机制）： 1. 代理机制JDK动态代理：当"
article: false
---

> 来源：[Spring AOP 与 AspectJ 的区别](https://www.yuque.com/tulingzhouyu/db22bv/hthr1488kgh8xhgz)

## Spring AOP的实现原理

Spring AOP 基于**代理模式**实现，主要采用两种代理方式（Spring 框架采用了 AspectJ 的注解风格，但底层实现仍保持了 Spring AOP 自身的代理机制）：

### 1. 代理机制

- **JDK动态代理**：当目标类实现了接口时使用，基于`java.lang.reflect.Proxy`
- **CGLIB代理**：当目标类没有实现接口时使用，通过继承目标类生成子类

### 2. 运行时织入流程

```java
// 简化的Spring AOP代理创建过程  
public Object createProxy(Object target) {  
    // 创建代理工厂  
    ProxyFactory factory = new ProxyFactory();  
    factory.setTarget(target);  
    
    // 添加通知和顾问  
    factory.addAdvice(new AroundAdvice());  
    
    // 获取代理对象  
    return factory.getProxy();  
}
```

### 3. 核心类

- `ProxyFactory`：代理工厂，负责创建AOP代理
- `AopProxy`：代理接口，有JDK和CGLIB两种实现
- `DefaultAopProxyFactory`：根据条件选择代理实现
- `ReflectiveMethodInvocation`：方法调用链的实现

### 4. 代理调用过程

1. 客户端调用代理对象的方法
2. 代理对象将调用委托给拦截器链
3. 拦截器链按顺序执行所有通知
4. 最终调用目标对象的方法

## AspectJ的实现原理

AspectJ是完整的AOP解决方案，基于**字节码修改**技术实现：

### 1. 织入方式

- **编译时织入**：使用ajc编译器在编译源码时织入
- **后编译织入**：对已编译的.class文件进行转换
- **加载时织入(LTW)**：在JVM加载类时动态修改字节码

### 2. 实现技术

- 使用专门的AspectJ编译器(ajc)
- 直接修改字节码，将切面逻辑编织到目标类中
- 不依赖运行时的代理机制

### 3. 织入示例

```java
// 使用AspectJ的LTW配置  
public static void main(String[] args) {  
    // 设置LTW代理  
    System.setProperty("java.agent", "path-to-aspectjweaver.jar");  

    // 正常运行应用，AspectJ会在类加载时织入  
    Application.main(args);  
}
```

## Spring AOP与AspectJ对比

**特性**
**Spring AOP**
**AspectJ**

**实现方式**
动态代理（运行时）
字节码修改（编译时/加载时）

**织入时机**
运行时
编译时、后编译时、加载时

**性能**
相对较低（有代理开销）
较高（无代理，直接修改字节码）

**功能范围**
仅支持方法级别切点
全面支持（方法、字段、构造函数等）

**连接点类型**
仅方法执行
方法调用、字段访问、异常处理等多种

**代理限制**
需创建代理对象，有self-invocation问题
无代理限制，无self-invocation问题

**与Spring集成**
原生集成，配置简单
需额外配置，但Spring提供了集成支持

**使用复杂度**
简单易用
功能强大但学习曲线陡峭

## Spring中使用AspectJ语法

Spring提供了对AspectJ注解风格的支持，但底层仍使用Spring AOP机制：

```java
// Spring中使用AspectJ风格注解定义切面  
@Aspect  
@Component  
public class LoggingAspect {  
    @Before("execution(* com.example.service.*.*(..))")  
    public void logBefore(JoinPoint joinPoint) {  
        // 前置通知逻辑  
    }  
}  

// 启用AspectJ注解支持  
@Configuration  
@EnableAspectJAutoProxy  
public class AppConfig {  
    // 配置  
}
```

## 选择建议

- **选择Spring AOP**：

- 当仅需要简单的方法拦截
- 需要与Spring无缝集成
- 对性能要求不是极端苛刻

- **选择AspectJ**：

- 需要字段级别或构造函数级别的切点
- 需要拦截不由Spring管理的对象
- 有self-invocation（目标对象内部方法调用）需求
- 对性能有极高要求

Spring AOP满足了大多数企业应用的AOP需求，而AspectJ则提供了更强大但复杂度更高的AOP能力。两者各有优势，可根据实际需求选择。
