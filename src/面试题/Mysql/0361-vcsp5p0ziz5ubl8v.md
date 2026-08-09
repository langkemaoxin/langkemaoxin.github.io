---
title: "MySQL 8的索引跳跃扫描是什么"
sidebarGroup: "Mysql"
shortTitle: "MySQL 8的索引跳跃扫描是什么"
order: 361
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "MySQL中的索引跳跃扫描（Skip Scan）是一种优化策略，旨在提高在特定条件下对复合索引的利用效率。尽管MySQL并没有明确标记这项技术为\"Skip Scan\"功能，但通过其优化器的改进，特别是在MySQL 8.0.13及其后的版本中"
article: false
---

> 来源：[MySQL 8的索引跳跃扫描是什么](https://www.yuque.com/tulingzhouyu/db22bv/vcsp5p0ziz5ubl8v)

MySQL中的索引跳跃扫描（Skip Scan）是一种优化策略，旨在提高在特定条件下对复合索引的利用效率。尽管MySQL并没有明确标记这项技术为"Skip Scan"功能，但通过其优化器的改进，特别是在MySQL 8.0.13及其后的版本中，MySQL可以在某些条件下实现类似Skip Scan的效果。让我们通过一个具体示例来说明其概念和潜在应用。

### 示例背景

假设有一个包含以下数据结构的表`employees`：

**ID**
**Department**
**Position**

1
Sales
Executive

2
Sales
Manager

3
Sales
Stuff

4
Sales
Stuff

5
HR
Executive

6
HR
Manager

7
HR
Stuff

8
IT
Executive

9
IT
Manager

10
IT
Stuff

并且在表上有一个复合索引 `(Department, Position)`。

### 查询场景

假设我们希望查找所有`Manager`职位的员工：

```sql
SELECT * FROM employees WHERE Position = 'Manager';
```

### 传统索引处理

如果正常按索引`(Department, Position)`的顺序使用，理想情况下需要首先给出`Department`条件，以充分利用索引优势，但本查询并没有提供对`Department`的条件。

### 跳跃扫描的优化实现（概念性）

通过类似Skip Scan的逻辑，MySQL优化器可能会：

1. **分区扫描**：

- 将索引按`Department`的唯一值进行分割。每个分区相当于不同的部门，比如`Sales`、`HR`、`IT`。

1. **应用条件**：

- 对每个`Department`分区中的`Position`行进行扫描，即跳跃扫描中仅搜索`Position = 'Manager'`的员工。

1. **跳过无关分区**：

- 由于`Position = 'Manager'`限定，我们只在每个`Department`的分区中寻找匹配的`Position`，而不是对整个表进行扫描。

### 实际效果

虽然MySQL索引跳跃扫描概念上并不是一个独立标识的特性，但此类索引优化策略在新版MySQL中可能通过改进的索引条件推送和查询优化器来实现。它潜在地减少读取和滤除不必要数据的开销。

这种策略在数据有较低基数（即`Department`的唯一值少）的场景中特别有效，因为跳跃的次数减少，提高了效率。可通过 `EXPLAIN` 检查特定查询的实际执行计划以确认优化的应用。

> 嵌入图板：[打开](https://player.bilibili.com/player.html?bvid=BV1kFpue5Ehj&p=11&page=11&autoplay=0)
