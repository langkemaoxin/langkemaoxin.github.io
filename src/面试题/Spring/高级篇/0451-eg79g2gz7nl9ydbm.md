---
title: "Spring Bean分类"
sidebarGroup: "高级篇"
shortTitle: "Spring Bean分类"
order: 451
date: 2026-06-11
category: "面试题"
tag:
  - "面试题"
description: "在Spring框架中，Bean是Spring容器管理的对象，它可以通过多种方式定义和配置。此问题可能换其他问法：比如你用过那些类型的Bean，你平时如何通过Spring创建Bean对象，单列Bean和原型Bean的区别等。首先这个问题，可以"
article: false
---

> 来源：[Spring Bean分类](https://www.yuque.com/tulingzhouyu/db22bv/eg79g2gz7nl9ydbm)

在Spring框架中，Bean是Spring容器管理的对象，它可以通过多种方式定义和配置。此问题可能换其他问法：比如你用过那些类型的Bean，你平时如何通过Spring创建Bean对象，单列Bean和原型Bean的区别等。

首先这个问题，可以根据不同的分类方式来回答。根据Bean的**作用域**、**定义方式**、**生命周期，功能，注入方式**特性，Spring中的Bean可以分为以下几种类型：

---

### 1. **按作用域分类**

Spring中的Bean可以根据作用域（Scope）分为以下几种：

#### **（1）单例Bean（Singleton）**

- **定义**：这是Spring的默认作用域。在整个Spring容器中，单例Bean只有一个实例。
- **特点**：

- 适合无状态的Bean（如工具类、服务类）。
- 性能较高，因为实例只创建一次。
- Spring容器会管理其生命周期（创建、初始化、销毁）。

- **适用场景**：大多数的业务逻辑类、工具类、服务类等。
- **配置方式**：java**复制**

```java
@Bean
public MyService myService() {
    return new MyService();
}
```

或者通过XML配置：xml**复制**

```xml
&lt;bean id="myService" class="com.example.MyService" scope="singleton"/&gt;
```

---

#### **（2）原型Bean（Prototype）**

- **定义**：每次请求都会创建一个新的Bean实例。
- **特点**：

- 每次调用都会返回一个全新的实例。
- 适合有状态的Bean（如用户会话相关的Bean）。
- Spring容器只负责创建实例，不会管理其生命周期。

- **适用场景**：需要独立状态的Bean，如用户会话管理、临时对象等。
- **配置方式**：java**复制**

```java
@Bean
@Scope("prototype")
public MyPrototypeBean myPrototypeBean() {
    return new MyPrototypeBean();
}
```

或者通过XML配置：xml**复制**

```xml
&lt;bean id="myPrototypeBean" class="com.example.MyPrototypeBean" scope="prototype"/&gt;
```

---

#### **（3）会话Bean（Session）**

- **定义**：作用域与HTTP会话绑定。每个HTTP会话都有一个独立的Bean实例。
- **特点**：

- 适用于Web应用中的用户会话相关数据。
- 实例的生命周期与会话绑定，会话结束时Bean销毁。

- **适用场景**：用户会话管理、购物车等。
- **配置方式**：java**复制**

```java
@Bean
@Scope("session")
public UserSession userSession() {
    return new UserSession();
}
```

---

#### **（4）请求Bean（Request）**

- **定义**：作用域与HTTP请求绑定。每个HTTP请求都有一个独立的Bean实例。
- **特点**：

- 适用于每个请求都需要独立状态的场景。
- 请求结束时，Bean实例销毁。

- **适用场景**：用户请求相关的数据处理。
- **配置方式**：java**复制**

```java
@Bean
@Scope("request")
public RequestData requestData() {
    return new RequestData();
}
```

---

#### **（5）全局会话Bean（Global Session）**

- **定义**：作用域与Portlet应用的全局会话绑定。
- **特点**：

- 主要用于Portlet应用。
- 与会话Bean类似，但作用范围更广。

- **适用场景**：Portlet应用中的全局会话管理。
- **配置方式**：java**复制**

```java
@Bean
@Scope("globalSession")
public GlobalSessionData globalSessionData() {
    return new GlobalSessionData();
}
```

---

### 2. **按定义方式分类**

Spring中的Bean可以通过以下几种方式定义：

#### **（1）基于注解的Bean**

- **@Component**：通用组件注解，自动检测并注册为Bean。
- **@Service**：用于服务层组件。
- **@Repository**：用于数据访问层组件。
- **@Controller**：用于Web控制器组件。
- **@Bean**：在配置类中显式定义Bean。
- **示例**：java**复制**

```java
@Service
public class MyService {
    public void doSomething() {
        System.out.println("Doing something...");
    }
}
```

---

#### **（2）基于XML配置的Bean**

- 在Spring的XML配置文件中定义Bean。
- **示例**：xml**复制**

```xml
&lt;bean id="myBean" class="com.example.MyBean"/&gt;
```

---

#### **（3）基于Java配置的Bean**

- 使用`@Configuration`注解的类中定义Bean。
- **示例**：java**复制**

```java
@Configuration
public class AppConfig {
    @Bean
    public MyBean myBean() {
        return new MyBean();
    }
}
```

---

### 3. **按生命周期分类**

根据Bean的生命周期管理方式，可以分为以下几种：

#### **（1）普通Bean**

- 生命周期完全由Spring容器管理（创建、初始化、销毁）。
- **示例**：单例Bean。

---

#### **（2）原型Bean**

- Spring只负责创建实例，销毁由客户端管理。
- **特点**：每次请求创建一个新实例，生命周期较短。

---

#### **（3）作用域代理Bean（Scoped Proxy）**

- 用于解决非单例Bean（如原型Bean、会话Bean）注入到单例Bean中的问题。
- Spring会创建一个代理对象，代理对象会根据作用域动态获取目标Bean实例。
- **配置方式**：java**复制**

```java
@Bean
@Scope(value = "prototype", proxyMode = ScopedProxyMode.TARGET_CLASS)
public MyPrototypeBean myPrototypeBean() {
    return new MyPrototypeBean();
}
```

---

### 4. **按功能分类**

根据Bean的功能和用途，可以分为以下几种：

#### **（1）普通业务Bean**

- 用于实现具体业务逻辑。
- **示例**：服务类、工具类。

---

#### **（2）配置Bean**

- 用于定义配置信息，如数据源、事务管理器等。
- **示例**：java**复制**

```java
@Bean
public DataSource dataSource() {
    return new DriverManagerDataSource("jdbc:mysql://localhost:3306/mydb");
}
```

---

#### **（3）工厂Bean（Factory Bean）**

- 实现`FactoryBean`接口，用于动态创建Bean。
- **特点**：可以控制Bean的创建逻辑。
- **示例**：java**复制**

```java
public class MyFactoryBean implements FactoryBean&lt;MyBean&gt; {
    @Override
    public MyBean getObject() {
        return new MyBean();
    }

    @Override
    public Class&lt;?> getObjectType() {
        return MyBean.class;
    }
}
```

---

### 5. **按依赖注入方式分类**

根据依赖注入的方式，Bean可以分为以下几种：

#### **（1）构造器注入Bean**

- 通过构造器注入依赖。
- **优点**：不可变性，依赖关系明确。
- **缺点**：无法解决循环依赖。

---

#### **（2）Setter注入Bean**

- 通过Setter方法注入依赖。
- **优点**：可以解决循环依赖。
- **缺点**：依赖关系可变。

---

### 总结

Spring中的Bean可以根据作用域、定义方式、生命周期、功能和依赖注入方式等多种维度进行分类。在实际开发中，选择合适的Bean类型和定义方式需要根据具体需求来决定。例如：

- **单例Bean**：适合无状态的工具类和服务类。
- **原型Bean**：适合有状态的Bean，如用户会话相关数据。
- **注解方式**：适合现代Spring应用，代码更简洁。
- **XML配置**：适合复杂的配置场景，便于管理。

通过合理使用这些Bean类型，可以更好地利用Spring框架的强大功能，实现高效、灵活的开发。
