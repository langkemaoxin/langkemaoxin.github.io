---
title: "模糊查询 like 语句该怎么写?"
sidebarGroup: "基础篇"
shortTitle: "模糊查询 like 语句该怎么写?"
order: 485
date: 2026-06-21
category: "面试题"
tag:
  - "面试题"
description: "在MyBatis中，要执行模糊查询（使用LIKE语句），你可以使用SQL语句的字符串拼接或使用动态SQL来构建查询语句。下面我将为你展示两种常用的方式。假设你要在一个查询中执行模糊查询，搜索用户的用户名包含特定关键字的情况。字符串拼接方式："
article: false
---

> 来源：[模糊查询 like 语句该怎么写?](https://www.yuque.com/tulingzhouyu/db22bv/nb59wacg7gadhdak)

在MyBatis中，要执行模糊查询（使用LIKE语句），你可以使用SQL语句的字符串拼接或使用动态SQL来构建查询语句。下面我将为你展示两种常用的方式。

假设你要在一个查询中执行模糊查询，搜索用户的用户名包含特定关键字的情况。

1. **字符串拼接方式**：

```xml
&lt;select id="searchUsers" resultMap="userResultMap"&gt;
    SELECT * FROM users
    WHERE username LIKE CONCAT('%', #{keyword}, '%')
&lt;/select&gt;
```

在这个例子中，`#{keyword}`是参数占位符，表示要搜索的关键字。`CONCAT('%', #{keyword}, '%')`用于构建模糊匹配的字符串。

1. **动态SQL方式**：

```xml
&lt;select id="searchUsers" resultMap="userResultMap"&gt;
    SELECT * FROM users
    &lt;where&gt;
        &lt;if test="keyword != null"&gt;
            AND username LIKE CONCAT('%', #{keyword}, '%')
        &lt;/if&gt;
    &lt;/where&gt;
&lt;/select&gt;
```

在这个例子中，使用了``标签来创建动态条件。只有在`keyword`参数不为null时，才会添加`AND username LIKE CONCAT('%', #{keyword}, '%')`这个条件到查询语句中。

无论哪种方式，你都可以在SQL语句中使用`LIKE`关键字来实现模糊查询，然后通过`#{}`语法或动态SQL的方式将参数值插入到查询语句中。选择哪种方式取决于你的项目需求和团队的偏好。
