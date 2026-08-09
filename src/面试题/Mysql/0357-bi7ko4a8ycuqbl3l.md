---
title: "SQL用了函数一定会索引失效吗"
sidebarGroup: "Mysql"
shortTitle: "SQL用了函数一定会索引失效吗"
order: 357
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在MySQL中，当查询语句中对索引列使用某些函数时，确实可能导致索引失效，迫使数据库执行全表扫描。这是因为函数应用于列值后，数据库无法直接利用索引中储存的排序信息。不过，这并不意味着所有情况都会导致索引失效，具体取决于使用的函数类型和场景。"
article: false
---

> 来源：[SQL用了函数一定会索引失效吗](https://www.yuque.com/tulingzhouyu/db22bv/bi7ko4a8ycuqbl3l)

在MySQL中，当查询语句中对索引列使用某些函数时，确实可能导致索引失效，迫使数据库执行全表扫描。这是因为函数应用于列值后，数据库无法直接利用索引中储存的排序信息。不过，这并不意味着所有情况都会导致索引失效，具体取决于使用的函数类型和场景。以下是详细说明：

### 常见会导致索引失效的情况：

1. **对索引列使用函数**：

- 如果在 `WHERE` 子句中对索引列应用了函数转换，例如 `LOWER(column_name)`，会导致索引无法被使用。这是因为索引是基于列的原始值而构建的，函数改变了这些值。
- 示例：

```sql
SELECT * FROM users WHERE LOWER(username) = 'john';
```

- 在这种情况下，可以考虑在应用层处理大小写不敏感的比较，或者在数据库中创建一个计算列（从MySQL 5.7开始支持持久生成列）、存储计算值并对其建立索引。

1. **计算表达式**：

- 使用计算表达式如 `column + 1` 可能导致MySQL放弃使用索引。
- 示例：

```sql
SELECT * FROM orders WHERE price + 10 > 100;
```

### 不会导致索引失效的情况：

1. **函数在索引范围之外使用**：

- 函数不在索引范围（即`WHERE`或`ON`条件）使用时，索引仍然有效。例如，在 `SELECT` 列表、`ORDER BY`、`GROUP BY`等地方使用函数通常不影响索引的使用。
- 示例：

```sql
SELECT UPPER(username) FROM users WHERE username = 'john';  -- 索引用于WHERE子句
```

### 优化建议：

- **使用生成列**：如果定期需要函数值，可以考虑使用生成列来预计算值并索引它。

```sql
ALTER TABLE users ADD username_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(username)) STORED, ADD INDEX (username_lower);
```

- **在应用层处理**：在应用层而不是数据库中处理某些需要函数的计算或转换。
- **分析查询计划**：使用 `EXPLAIN` 语句分析和验证查询是否有效利用索引。

通过合理的索引设计与查询编写，尽量避免在索引列上直接使用会影响索引的函数，是提高查询性能的重要手段。

> 嵌入图板：[打开](https://player.bilibili.com/player.html?bvid=BV1kFpue5Ehj&p=7&page=7&autoplay=0)
