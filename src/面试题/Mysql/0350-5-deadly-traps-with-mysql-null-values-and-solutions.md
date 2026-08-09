---
title: "MySQL NULL 值的 5 大致命陷阱及解决方案"
sidebarGroup: "Mysql"
shortTitle: "MySQL NULL 值的 5 大致命陷阱及解决方案"
order: 350
date: 2026-06-21
category: "面试题"
tag:
  - "面试题"
description: "在日常开发中，MySQL 数据库字段允许 NULL 值是一个常见的设计，但它也可能引发许多意想不到的问题。NULL 值的特殊性经常让开发者在查询、统计和逻辑判断中踩坑，甚至导致程序异常。本文将通过详细的案例，分析 NULL 值可能引发的 5"
article: false
---

> 来源：[MySQL NULL 值的 5 大致命陷阱及解决方案](https://www.yuque.com/tulingzhouyu/db22bv/lnx5i0hic8kezp5y)

在日常开发中，MySQL 数据库字段允许 NULL 值是一个常见的设计，但它也可能引发许多意想不到的问题。NULL 值的特殊性经常让开发者在查询、统计和逻辑判断中踩坑，甚至导致程序异常。

本文将通过详细的案例，分析 NULL 值可能引发的 5 大问题，并提供实用的解决方案和最佳实践，帮助你彻底掌握 NULL 值的处理方法。

---

## 数据准备：快速复现问题

为了验证 NULL 值引发的问题，我们需要先创建测试表并插入测试数据。以下是完整的 SQL 代码：

```plsql
CREATE TABLE person (  
  id INT AUTO_INCREMENT PRIMARY KEY,  
  name VARCHAR(50) DEFAULT NULL,  
  mobile VARCHAR(20) DEFAULT NULL  
);  

CREATE TABLE employee (  
  id INT AUTO_INCREMENT PRIMARY KEY,  
  salary INT DEFAULT NULL  
);

INSERT INTO person (name, mobile) VALUES  
('Alice', '1234567890'),  
('Bob', '9876543210'),  
(NULL, '1234567890'),  
('Alice', NULL),  
('Java', '1111111111'),  
('Python', '2222222222'),  
('C++', '3333333333'),  
(NULL, NULL),  
('Java', NULL),  
(NULL, '4444444444');

INSERT INTO employee (salary) VALUES  
(1000),  
(2000),
(NULL);
```

---

## NULL 值引发的 5 大问题

### 一、COUNT/DISTINCT 数据丢失

#### 问题描述

`COUNT` 是 MySQL 中常用的统计函数，但当字段值为 NULL 时，`COUNT(column)` 会忽略这些记录，导致统计结果不准确。例如：

```plsql
SELECT COUNT(*) AS total_count, COUNT(name) AS name_count FROM person;
```

执行结果如下：

**total_count**
**name_count**

10
7

可以看到，`COUNT(name)` 忽略了 `name` 字段为 NULL 的记录，导致统计结果丢失。

#### 解决方案

- **使用 **`COUNT(*)`：统计所有记录，包括字段值为 NULL 的行。
- **扩展知识**：避免使用 `COUNT(常量)`，如 `COUNT(1)`，因为它的行为与 `COUNT(*)` 一致，但可读性较差。

---

#### 问题描述

当使用 `COUNT(DISTINCT column1, column2)` 时，如果任意一个字段值为 NULL，即使另一列有不同的值，查询结果也会忽略这些记录。例如：

```plsql
SELECT COUNT(DISTINCT name, mobile) AS distinct_count FROM person;
```

执行结果如下：

**distinct_count**

5

尽管 `mobile` 列中有多个不同的值，但由于 `name` 或 `mobile` 中存在 NULL，导致部分记录被忽略。

#### 解决方案

- **避免字段值为 NULL**：在表设计时，尽量设置字段为 `NOT NULL`，并为其指定默认值。
- **使用替代函数**：通过 `IFNULL(column, default_value)` 将 NULL 转换为默认值，例如：

```plsql
SELECT COUNT(DISTINCT IFNULL(name, ''), IFNULL(mobile, '')) AS distinct_count FROM person;
```

---

### 二、NULL 对比结果为未知（false）

#### 问题描述

在使用非等于查询（`<>` 或 `!=`）时，NULL 值的记录会被忽略。例如：

```plsql
SELECT * FROM person WHERE name != 'Java';
```

执行结果如下：

**id**
**name**
**mobile**

1
Alice
1234567890

2
Bob
9876543210

4
Alice
NULL

6
Python
2222222222

7
C++
3333333333

可以看到，`name` 为 NULL 的记录被忽略，导致查询结果不完整。

#### 解决方案

- **显式处理 NULL**：在查询条件中加入对 NULL 的判断，例如：

```plsql
SELECT * FROM person WHERE name != 'Java' OR name IS NULL;
```

---

### 三、NULL 值运算都为 NULL

#### 问题描述

在使用 NULL 值进行运算时，比如加减乘除，拼接等等 最终的结果都为 NULL

```plsql
SELECT id,salary + 1 FROM employee;
SELECT id,concat(name,'-baili') FROM person;
```

### 四、聚合空指针异常

#### 问题描述

在使用聚合函数（如 `SUM`、`AVG`）时，如果字段值为 NULL，查询结果也会为 NULL，而不是预期的 0。这可能导致程序在处理结果时出现空指针异常。例如：

```plsql
SELECT SUM(salary) AS total_salary FROM employee WHERE id >= 3;
```

执行结果如下：

**total_salary**

NULL

#### 解决方案

- **使用 **`IFNULL`** 函数**：将 NULL 转换为 0，例如：

```plsql
SELECT SUM(IFNULL(salary, 0)) AS total_salary FROM employee WHERE id >= 3;
```

执行结果为：

**total_salary**

0

---

### 五、Group By Order By 会统计 NULL 值

#### 问题描述

在使用 group by 与 order by 时，不会剔除 NULL，会将 NULL 作为最小值，例如：

```plsql
SELECT * FROM person order by name desc;
```

#### 解决方案

- **使用 **`IS NOT NULL`：剔除掉 NULL 记录，例如：

```plsql
SELECT * FROM person where name is not null order by name desc;
```

---

## 最佳实践

1. **表设计时尽量避免 NULL 值**：

- 设置字段为 `NOT NULL`。
- 为字段指定默认值，例如空字符串 `''` 或 0。

1. **查询时显式处理 NULL**：

- 使用 `IFNULL` 或 `COALESCE` 函数将 NULL 转换为默认值。
- 在查询条件中加入 `IS NULL` 或 `IS NOT NULL`。

1. **遵循规范**：

- 根据阿里巴巴《Java 开发手册》的建议，优先使用 `ISNULL(column)` 判断 NULL 值，提升代码可读性和执行效率。

---

## 总结

MySQL 中 NULL 值的处理是一个容易被忽视但又非常重要的问题。

通过本文的分析和解决方案，希望你能更好地理解和应对 NULL 值问题。

在实际开发中，尽量避免使用 NULL 值，并遵循最佳实践，才能让你的数据库设计更加健壮、高效。
