---
title: "MySQL中like模糊查询如何优化"
sidebarGroup: "Mysql"
shortTitle: "MySQL中like模糊查询如何优化"
order: 356
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在MySQL中，LIKE 模糊查询可能会导致性能问题，特别是当使用通配符 % 开头时，因为这通常会导致全表扫描。以下方法可以帮助优化 LIKE 模糊查询：1. 合理使用索引前缀匹配：使用LIKE 'prefix%'的形式，这种情况MySQL"
article: false
---

> 来源：[MySQL中like模糊查询如何优化](https://www.yuque.com/tulingzhouyu/db22bv/wiz8zcex83ch9zt6)

在MySQL中，`LIKE` 模糊查询可能会导致性能问题，特别是当使用通配符 `%` 开头时，因为这通常会导致全表扫描。以下方法可以帮助优化 `LIKE` 模糊查询：

### 1. 合理使用索引

- **前缀匹配**：使用`LIKE 'prefix%'`的形式，这种情况MySQL能够利用索引，比如：

```sql
SELECT * FROM users WHERE username LIKE 'John%';
```

如果`username`字段有索引，前缀匹配会用到索引。

### 2. 使用反向索引

对于需要匹配后缀的情况（即`LIKE '%suffix'`），可以创建一个辅助列存储反转字符串，并基于此列进行前缀匹配。

- **创建反向字符串**：

```sql
ALTER TABLE users ADD reversed_username VARCHAR(255);  
UPDATE users SET reversed_username = REVERSE(username);  
CREATE INDEX idx_reversed_username ON users(reversed_username);
```

### 3. 限制扫描范围

在LIKE查询中，如果可以通过其他条件进一步缩小搜索范围，请尽量加入这些条件。

```sql
SELECT * FROM users WHERE created_at >= '2023-01-01' AND username LIKE 'John%';
```

### 4. 使用缓存

如果相同的查询需要频繁执行，可以考虑在应用层实施缓存策略来减少数据库负载。

### 5. 使用专业工具

对于非常大的数据集或者需要复杂文本处理和搜索功能，可以使用外部全文搜索引擎如Elasticsearch、Solr或者Sphinx来代替MySQL的LIKE操作。

通过这些方法优化LIKE查询，可以显著提升数据库的查询性能。应根据具体场景选择合适的优化策略。使用EXPLAIN分析查询执行计划，可以帮助确认优化效果。

> 嵌入图板：[打开](https://player.bilibili.com/player.html?bvid=BV1kFpue5Ehj&p=5&page=5&autoplay=0)
