---
title: "BeanFactory与FactoryBean区别：面试必备解析"
sidebarGroup: "高级篇"
shortTitle: "BeanFactory与FactoryBean区别：面试必备解析"
order: 457
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "今天跟大家分享一道Spring面试高频题：BeanFactory与FactoryBean的区别。这个问题在中高级Java面试中出现频率非常高，很多小伙伴常因为名字相似而搞混，导致面试时回答不清晰。下面，我将以最清晰直观的方式为大家讲解如何完"
article: false
---

> 来源：[BeanFactory与FactoryBean区别：面试必备解析](https://www.yuque.com/tulingzhouyu/db22bv/dds43egxxx36x9dw)

今天跟大家分享一道Spring面试高频题：**BeanFactory与FactoryBean的区别**。

这个问题在中高级Java面试中出现频率非常高，很多小伙伴常因为名字相似而搞混，导致面试时回答不清晰。

下面，我将以最清晰直观的方式为大家讲解如何完美回答这个问题。

## 一、核心区别一句话总结

**最简单记忆**：

- **BeanFactory**是工厂，**管理Bean**的容器
- **FactoryBean**是特殊Bean，**生产Bean**的工厂

这个区别虽然简单，但面试时一定要表达清楚，接下来我们深入分析。

## 二、BeanFactory详解

### 1. 本质与定位

BeanFactory是Spring框架的**核心接口**，是IoC容器的顶层设计。它定义了容器的基本功能，负责**管理、装配和提供Bean**。可以类比为一个大型工厂，负责生产和管理各种产品(Bean)。

### 2. 主要功能

- 提供Bean的**生命周期管理**
- 实现**依赖注入**
- 支持**Bean的装配**和**延迟初始化**

### 3. 常见实现

- **DefaultListableBeanFactory**：最常用的实现类
- **XmlBeanFactory**：读取XML配置文件的实现(已过时)
- **ApplicationContext**：更高级的容器，扩展了BeanFactory

```java
// BeanFactory的基本使用  
BeanFactory factory = new ClassPathXmlApplicationContext("applicationContext.xml");  
UserService userService = factory.getBean("userService", UserService.class);
```

## 三、FactoryBean详解

### 1. 本质与定位

FactoryBean是一个**特殊的Bean**，它是一个接口，用于**定制化Bean的创建逻辑**。当某些Bean的实例化过程复杂时，实现这个接口可以将复杂创建过程封装起来。

### 2. 核心方法

- **getObject()**：返回该工厂创建的对象实例
- **getObjectType()**：返回该工厂创建的对象类型
- **isSingleton()**：返回由该工厂创建的对象是否是单例

### 3. 使用场景

- **复杂对象的初始化**：如JDBC连接、第三方框架对象
- **动态代理对象创建**：MyBatis中的Mapper接口代理对象就是通过FactoryBean创建的
- **条件化Bean创建**：根据条件创建不同实现的Bean

```java
// FactoryBean实现示例  
public class UserServiceFactoryBean implements FactoryBean&lt;UserService&gt; {  

    @Override  
    public UserService getObject() throws Exception {  
        // 复杂的创建逻辑  
        UserService service = new UserServiceImpl();  
        // 执行一系列初始化操作  
        return service;  
    }  

    @Override  
    public Class&lt;?> getObjectType() {  
        return UserService.class;  
    }  

    @Override  
    public boolean isSingleton() {  
        return true;  
    }  
}
```

## 四、关键区别详解

### 1. 角色不同

- **BeanFactory**：**容器角色**，管理所有Bean
- **FactoryBean**：**工厂Bean角色**，是容器中的一个Bean

### 2. 使用方式不同

- **BeanFactory**：通常由Spring框架实现，开发者很少直接实现
- **FactoryBean**：开发者实现该接口，自定义Bean的创建过程

### 3. 获取方式有特别之处

- 通过`context.getBean("beanName")`获取FactoryBean创建的对象
- 通过`context.getBean("&beanName")`获取FactoryBean本身

### 4. 应用场景不同

- **BeanFactory**：作为容器的基础设施使用
- **FactoryBean**：解决特定Bean的复杂创建问题

## 五、面试回答技巧

回答这个问题时，建议采用以下结构：

1. **先说明基本区别**：一个是容器，一个是产生Bean的工厂Bean
2. **分别解释各自职责**：BeanFactory管理Bean，FactoryBean创建特定Bean
3. **举例说明**：MyBatis的Mapper接口是通过MapperFactoryBean创建的
4. **补充实现细节**：提到FactoryBean的三个核心方法及获取特殊性
5. **强调应用场景**：说明什么情况下会使用FactoryBean

## 六、经典例子

**实际工作中的例子**：Spring整合MyBatis时，我们只需定义Mapper接口，不需要实现类。这是因为MyBatis使用了MapperFactoryBean(一个FactoryBean实现)，它在运行时动态创建Mapper接口的代理实现。

```java
// Spring整合MyBatis的配置  
@Bean  
public MapperFactoryBean&lt;UserMapper&gt; userMapper() {  
    MapperFactoryBean&lt;UserMapper&gt; factoryBean = new MapperFactoryBean<>();  
    factoryBean.setMapperInterface(UserMapper.class);  
    factoryBean.setSqlSessionFactory(sqlSessionFactory());  
    return factoryBean;  
}  

// 简化后的注解方式  
@MapperScan("com.example.mapper")
```

## 总结

面试中回答BeanFactory与FactoryBean区别时，关键是要明确：

- BeanFactory是**容器**，管理所有Bean
- FactoryBean是特殊的**Bean**，用于创建复杂Bean

通过这种方式回答，既点明了核心区别，又展示了技术深度，相信大家在面试中一定能够从容应对这个问题！
