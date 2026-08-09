---
title: "mybatis使用like的时候，如何防止sql注入"
sidebarGroup: "基础篇"
shortTitle: "mybatis使用like的时候，如何防止sql注入"
order: 473
date: 2026-06-21
category: "面试题"
tag:
  - "面试题"
description: "在 MyBatis 中使用 `LIKE` 查询时，错误示例： @Select(\"SELECT * FROM users WHERE name LIKE '%${name}%'\") List findUsersByName(@Param(\"n"
article: false
---

> 来源：[mybatis使用like的时候，如何防止sql注入](https://www.yuque.com/tulingzhouyu/db22bv/epfoa791ghp50fk5)

在 MyBatis 中使用 `LIKE` 查询时，

**错误示例：**

```java
@Select("SELECT * FROM users WHERE name LIKE '%${name}%'")
List&lt;User&gt; findUsersByName(@Param("name") String name);
```

**问题：**

- 使用 `${}` 会直接将参数插入到 SQL 中，而不会进行转义。
- -如果用户输入了恶意内容（如 `'; DROP TABLE users; --`），可能导致 SQL 注入。

防止 SQL 注入是一个重要的安全问题。SQL 注入通常发生在用户输入的内容直接拼接到 SQL 语句中，而没有进行适当的处理。以下是防止 SQL 注入的几种方法：

## 1. 使用 MyBatis 的参数占位符+CONCAT动态拼接

MyBatis 提供了参数占位符（`#{}`），可以自动对参数进行转义，防止 SQL 注入。

```xml
&lt;select id="findUsersByName" resultType="User"&gt;
  SELECT * FROM users
  WHERE name LIKE CONCAT('%', #{name}, '%')
&lt;/select&gt;
```

#### Java 调用：

```java
List&lt;User&gt; users = userMapper.findUsersByName("John");
```

## 2.手动拼接 `%` 并使用参数占位符

在 Java 代码中手动拼接 `%`，然后将拼接后的字符串作为参数传递给 MyBatis。

```java
String name = "%John%";
List&lt;User&gt; users = userMapper.findUsersByName(name);
```

#### XML 配置：

```xml
&lt;select id="findUsersByName" resultType="User"&gt;
  SELECT * FROM users
  WHERE name LIKE #{name}
&lt;/select&gt;
```

## 3. 使用 MyBatis 的 `bind` 标签

MyBatis 的 `bind` 标签可以在 SQL 中动态绑定变量，同时防止 SQL 注入。

```xml
&lt;select id="findUsersByName" resultType="User"&gt;
    &lt;bind name="pattern" value="'%' + name + '%'" /&gt;
    SELECT * FROM users
    WHERE name LIKE #{pattern}
&lt;/select&gt;
```

#### 解释：

- `&lt;bind&gt;` 标签将用户输入的 `name` 参数动态绑定为 `pattern`，并拼接 `%`。

- `#{pattern}` 会自动转义，防止 SQL 注入。

## 4. 使用MyBatis Plus 的 QueryWrapper

如果需要更复杂的查询，可以结合 MyBatis 和其他工具（如 MyBatis Plus 或 QueryWrapper）来构建安全的查询。

#### 示例：

```java
QueryWrapper&lt;User&gt; queryWrapper = new QueryWrapper<>();
queryWrapper.like("name", name);
List&lt;User&gt; users = userMapper.selectList(queryWrapper);
```

#### 解释：

MyBatis Plus 的 `QueryWrapper` 会自动处理参数，防止 SQL 注入。

## 5. 输入校验

除了使用 MyBatis 的安全特性，还可以对用户输入进行校验，确保输入内容符合预期。

#### 示例：

- 检查输入是否包含非法字符（如 `%`、`_` 等）。

- 对输入进行长度限制，避免过长的字符串。

#### 示例代码：

```java
public String sanitizeInput(String input) {
    if (input == null) {
        return null;
    }
    // 去除特殊字符
    return input.replaceAll("[^a-zA-Z0-9]", "");
}
```

通过这些方法，可以有效防止 SQL 注入，同时保证查询的安全性和可靠性。
