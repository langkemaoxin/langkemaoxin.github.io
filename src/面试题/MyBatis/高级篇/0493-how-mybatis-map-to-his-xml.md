---
title: "mybatis 是怎么跟他的 xml 之间形成映射的？"
sidebarGroup: "高级篇"
shortTitle: "mybatis 是怎么跟他的 xml 之间形成映射的？"
order: 493
date: 2026-06-21
category: "面试题"
tag:
  - "面试题"
description: "1. 概述MyBatis 是一个灵活的持久层框架，核心在于通过 XML 或注解，将 Java 方法与 SQL 语句高效映射。在实际开发中，Mapper 接口和 XML 映射文件的关联是 MyBatis 的基础，也是经常被问及的核心原理。2."
article: false
---

> 来源：[mybatis 是怎么跟他的 xml 之间形成映射的？](https://www.yuque.com/tulingzhouyu/db22bv/eyw0xl2ktv4ew1gt)

## 1. 概述

MyBatis 是一个灵活的持久层框架，核心在于通过 XML 或注解，将 Java 方法与 SQL 语句高效映射。

在实际开发中，**Mapper 接口和 XML 映射文件的关联**是 MyBatis 的基础，也是经常被问及的核心原理。

---

## 2. 基本结构与关联方式

### (1) Mapper 接口（Java）

```java
public interface UserMapper {  
    User selectUserById(int id);  
}
```

### (2) XML 映射文件

```xml
&lt;mapper namespace="com.example.mapper.UserMapper"&gt;  
  &lt;select id="selectUserById" parameterType="int" resultType="com.example.model.User"&gt;  
    SELECT * FROM users WHERE id = #{id}  
  &lt;/select&gt;  
&lt;/mapper&gt;
```

### (3) 关联方式说明

- **namespace**：XML 文件的 `namespace` 属性必须与 Mapper 接口的全限定名一致。
- **id**：SQL 标签的 `id` 属性必须与接口方法名一致。

**这样，MyBatis 能自动把接口方法与 XML 中的 SQL 关联起来**。

---

## 3. MyBatis 关联底层实现原理

### (1) 动态代理机制

- MyBatis 为每个 Mapper 接口生成一个代理对象（使用 JDK 动态代理）。
- 你调用 Mapper 方法时，实际是由代理对象接管，并根据方法名和参数查找、执行对应 SQL。

**示例：**

```java
UserMapper userMapper = sqlSession.getMapper(UserMapper.class);  
User user = userMapper.selectUserById(1);
```

### (2) MapperRegistry 和 MapperProxyFactory

- **MapperRegistry**：负责注册和管理所有 Mapper 接口。
- **MapperProxyFactory**：为每个接口创建动态代理对象，内部由 MapperProxy 实现方法拦截和执行。

**关联过程：**

1. MyBatis 通过 `MapperRegistry` 注册 Mapper 接口。
2. 当调用 `getMapper` 方法时，`MapperProxyFactory` 生成相应的代理对象。
3. 代理对象通过 `MapperProxy` 调用对应的 SQL 语句。

### (3) XML 解析与绑定

- MyBatis 启动时，用 `XMLMapperBuilder` 解析 XML 文件：

- 读取 `namespace`，与接口绑定。
- 读取 `id`，与方法名一一对应。
- 每个 SQL 和方法的绑定关系，生成 `MappedStatement` 存入 `Configuration` 对象。

### (4) 流程图

![image](/面试题/MyBatis/高级篇/0493-how-mybatis-map-to-his-xml/img-c6b5e240260f.png)

---

## 4. 实例流程（OrderMapper 为例）

- **接口**：`Order selectOrderById(int id);`
- **XML**：

```xml
&lt;mapper namespace="com.example.mapper.OrderMapper"&gt;  
  &lt;select id="selectOrderById" ...&gt;SELECT * FROM orders WHERE id = #{id}&lt;/select&gt;  
&lt;/mapper&gt;
```

- **执行过程**：

1. 启动加载 XML——解析 namespace/id——方法与 SQL 关联
2. sqlSession.getMapper(OrderMapper.class) 创建代理
3. 调用 selectOrderById -> 查找配置 -> 执行 SQL -> 返回 Order 对象

---

## 5. 动态 SQL 与高级映射

- 支持 `、、` 等标签，实现条件拼装动态 SQL。
- 提升灵活性，替换传统硬编码 SQL。

**示例：**

```xml
&lt;select id="selectOrders" resultType="Order"&gt;  
  SELECT * FROM orders  
  WHERE 1=1  
  &lt;if test="status != null"&gt;AND status = #{status}&lt;/if&gt;  
&lt;/select&gt;
```

---
