---
title: "PostgreSQL中的JSON和JSONB数据类型有什么区别？各自适合什么场景"
sidebarGroup: "PostgreSQL"
shortTitle: "PostgreSQL中的JSON和JSONB数据类型有什么区别？各自适合什么场景"
order: 418
date: 2026-06-09
category: "面试题"
tag:
  - "面试题"
description: "PostgreSQL中的JSON和JSONB是两种存储JSON数据的不同方式，它们各有特点和适用场景。下面我将详细比较这两种数据类型：1. 存储方式差异JSON类型以原始文本形式存储保留空格和格式每次操作都需要重新解析CREATE TABL"
article: false
---

> 来源：[PostgreSQL中的JSON和JSONB数据类型有什么区别？各自适合什么场景](https://www.yuque.com/tulingzhouyu/db22bv/xms10ysak8qeuolc)

PostgreSQL中的JSON和JSONB是两种存储JSON数据的不同方式，它们各有特点和适用场景。下面我将详细比较这两种数据类型：

### 1. 存储方式差异

#### JSON类型

- 以原始文本形式存储
- 保留空格和格式
- 每次操作都需要重新解析

```sql
CREATE TABLE user_profiles (  
  id SERIAL PRIMARY KEY,  
  profile JSON  
);  

INSERT INTO user_profiles (profile)   
VALUES ('{"name": "John", "age": 30, "skills": ["Java", "PostgreSQL"]}');
```

#### JSONB类型

- 以二进制形式存储
- 不保留空格和格式
- 预处理和压缩，后续操作更快

```sql
CREATE TABLE user_profiles_jsonb (  
  id SERIAL PRIMARY KEY,  
  profile JSONB  
);  

INSERT INTO user_profiles_jsonb (profile)   
VALUES ('{"name": "John", "age": 30, "skills": ["Java", "PostgreSQL"]}');
```

### 2. 性能和查询特点

#### JSON类型特点

- 保留原始输入格式
- 写入速度快
- 查询性能较低
- 适合：

- 需要保留原始输入格式的场景
- 很少进行复杂查询的情况

#### JSONB类型特点

- 支持索引
- 查询速度快
- 支持高效的部分检索
- 适合：

- 需要频繁检索和过滤JSON数据
- 复杂查询场景

### 3. 查询示例

#### JSON查询

```sql
-- JSON查询需要每次重sqs新解析  
SELECT profile->'name' FROM user_profiles   
WHERE profile->>'age' = '30';
```

#### JSONB查询

```sql
-- JSONB查询更高效  
CREATE INDEX ON user_profiles_jsonb USING GIN (profile);  

SELECT profile->'name' FROM user_profiles_jsonb   
WHERE profile @> '{"age": 30}';  

-- 部分检索  
SELECT profile->>'skills'   
FROM user_profiles_jsonb   
WHERE profile->'skills' ? 'Java';
```

### 4. 使用场景推荐

#### 选择JSON的场景

- 日志存储
- 原始配置保留
- 不需要频繁检索的半结构化数据
- 需要保留输入的精确格式

#### 选择JSONB的场景

- 需要快速检索的文档型数据库
- 电商系统的产品属性
- 用户配置和动态属性
- 需要复杂查询和索引的应用

### 5. 性能和空间考虑

- JSONB会略微增加存储空间
- JSONB在大量写入时性能略低
- JSONB在读取和复杂查询时性能显著优于JSON

### 推荐实践

1. 默认优先使用JSONB
2. 当保留原始格式很重要时使用JSON
3. 对于写入密集型场景，评估性能影响
4. 使用GIN索引优化JSONB查询性能

### 注意事项

- PostgreSQL 9.4及以上版本完全支持这两种类型
- 谨慎处理类型转换，可能会丢失精度
- 复杂查询优先考虑JSONB

总之，JSONB在大多数现代应用中是更好的选择，除非有特殊的格式保留需求。选择时需要根据具体业务场景权衡性能、存储和查询需求。
