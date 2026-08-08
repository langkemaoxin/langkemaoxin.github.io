---
title: "Explain 详解与索引最佳实践"
sidebarGroup: "MySQL"
shortTitle: "03 Explain 与实践"
order: 3
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "逐列解读 EXPLAIN 输出，掌握 type、key_len、Extra 含义，并总结索引失效与最佳实践清单。"
---

> **MySQL 系列 · 第 3/10 篇**  
> 上一篇：[《MySQL 索引底层数据结构与算法》](/数据库/mysql/mysql-02-index-structure)  
> 下一篇：[《MySQL 索引优化实战（一）》](/数据库/mysql/mysql-04-index-opt-1)

---

## 开头：Explain 是什么

`EXPLAIN` 模拟优化器执行 SQL，**不真正跑完查询**（`FROM` 含子查询时子查询仍可能执行），返回 **执行计划**。调优索引前，应养成「先 Explain 再改表」的习惯。

```sql
EXPLAIN SELECT * FROM actor;
```

MySQL 8.0 起 **`EXPLAIN ANALYZE`** 可实际执行并附带真实耗时；日常分析 `EXPLAIN` 即可。8.0 已 **废除 `EXPLAIN EXTENDED`**，无需再配 `SHOW WARNINGS`。

官方文档：[EXPLAIN Output](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)

---

## 一、示例表结构

```sql
DROP TABLE IF EXISTS actor;
CREATE TABLE actor (
  id          INT(11) NOT NULL,
  name        VARCHAR(45) DEFAULT NULL,
  update_time DATETIME DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO actor (id, name, update_time) VALUES
(1, 'a', '2017-12-22 15:27:18'),
(2, 'b', '2017-12-22 15:28:18');

DROP TABLE IF EXISTS film;
CREATE TABLE film (
  id   INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(10) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO film (id, name) VALUES (3, 'film0'), (1, 'film1'), (2, 'film2');

DROP TABLE IF EXISTS film_actor;
CREATE TABLE film_actor (
  id       INT(11) NOT NULL,
  film_id  INT(11) NOT NULL,
  actor_id INT(11) NOT NULL,
  remark   VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_film_actor_id (film_id, actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO film_actor (id, film_id, actor_id) VALUES
(1, 1, 1), (2, 1, 2), (3, 2, 1);
```

---

## 二、Explain 各列详解

每个表一行；JOIN 有几张表通常几行（UNION 等例外）。

### 2.1 id

`SELECT` 的序号。id 越大优先级越高；id 相同从上到下执行；id 为 NULL 表示 UNION RESULT 等汇总行。

复杂查询示例（观察 PRIMARY / SUBQUERY / DERIVED）：

```sql
SET SESSION optimizer_switch = 'derived_merge=off';  -- 便于观察 derived 表

EXPLAIN SELECT (SELECT 1 FROM actor WHERE id = 1)
FROM (SELECT * FROM film WHERE id = 1) der;
```

![复杂查询 id 与 select_type](/数据库/mysql-03-explain/p003-01.png)

### 2.2 select_type

| 值 | 含义 |
|----|------|
| SIMPLE | 简单查询，无子查询/UNION |
| PRIMARY | 最外层 SELECT |
| SUBQUERY | SELECT 中的子查询 |
| DERIVED | FROM 中的子查询，结果放临时表 |
| UNION | UNION 中第二个及以后的 SELECT |

```sql
EXPLAIN SELECT * FROM film WHERE id = 2;                    -- SIMPLE
EXPLAIN SELECT 1 UNION ALL SELECT 1;                        -- UNION
```

### 2.3 type（访问类型，重点）

从优到劣：**system > const > eq_ref > ref > range > index > ALL**

目标：至少 **range**，最好 **ref** 及以上。

| type | 说明 | 示例 |
|------|------|------|
| NULL | 优化阶段已解决，无需访问表 | `SELECT MIN(id) FROM film` |
| const | 主键/唯一索引等值，最多一行 | `WHERE id = 1` |
| eq_ref | JOIN 时主键/唯一索引全部用于关联 | `film_actor JOIN film ON film_id = film.id` |
| ref | 非唯一索引等值 | `WHERE name = 'film1'` |
| range | 范围扫描 | `WHERE id > 1` |
| index | 全索引扫描（遍历二级索引叶子） | `SELECT * FROM film`（无 WHERE 时可能 index） |
| ALL | 全表扫描 | `SELECT * FROM actor`（无合适索引） |

```sql
EXPLAIN SELECT * FROM actor WHERE id > 1;           -- range
EXPLAIN SELECT * FROM actor;                        -- ALL
EXPLAIN SELECT MIN(id) FROM film;                   -- NULL / 优化 away
```

![type 对比示例](/数据库/mysql-03-explain/p004-02.png)

### 2.4 possible_keys 与 key

- **possible_keys**：可能用到的索引。
- **key**：实际使用的索引；NULL 表示未用索引。

小表全表扫描有时比走索引更便宜，会出现 possible_keys 有值而 key 为 NULL。

### 2.5 key_len

索引使用的 **字节数**，可推断用了联合索引的哪些列。

```sql
EXPLAIN SELECT * FROM film_actor WHERE film_id = 2;
-- key_len = 4 → 仅 film_id（INT 4 字节）
```

**计算规则摘要**

| 类型 | key_len |
|------|---------|
| INT | 4 |
| BIGINT | 8 |
| CHAR(n) utf8 | 3n |
| VARCHAR(n) utf8 | 3n + 2（长度字节） |
| 允许 NULL | +1 |

### 2.6 ref

索引列与谁比较：`const`、列名、`func` 等。

### 2.7 rows 与 filtered

- **rows**：估计扫描行数（非结果集行数）。
- **filtered**：条件过滤百分比；`rows × filtered/100` 可估算与上一表 JOIN 的行数（Extended 场景）。

### 2.8 Extra（常见值）

| Extra | 含义 |
|-------|------|
| Using index | **覆盖索引**，无需回表 |
| Using where | 在引擎层用 WHERE 过滤；或列未完全被索引覆盖 |
| Using index condition | **索引下推 ICP**（5.6+） |
| Using temporary | 使用临时表，常需优化 |
| Using filesort | 额外排序，常需优化 |
| Using index for skip scan | 8.0 索引跳跃扫描 |

```sql
-- 覆盖索引
EXPLAIN SELECT film_id FROM film_actor WHERE film_id = 1;

-- filesort：actor.name 无索引
EXPLAIN SELECT * FROM actor ORDER BY name;
```

![Extra：Using index / filesort](/数据库/mysql-03-explain/p007-02.png)

---

## 三、索引最佳实践（employees 表）

```sql
CREATE TABLE employees (
  id       INT(11) NOT NULL AUTO_INCREMENT,
  name     VARCHAR(24) NOT NULL DEFAULT '' COMMENT '姓名',
  age      INT(11) NOT NULL DEFAULT 0 COMMENT '年龄',
  position VARCHAR(20) NOT NULL DEFAULT '' COMMENT '职位',
  hire_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '入职时间',
  PRIMARY KEY (id),
  KEY idx_name_age_position (name, age, position)
) ENGINE=InnoDB;

INSERT INTO employees(name, age, position, hire_time) VALUES
('LiLei', 22, 'manager', NOW()),
('HanMeimei', 23, 'dev', NOW()),
('Lucy', 23, 'dev', NOW());
```

### 3.1 全值匹配与最左前缀

```sql
EXPLAIN SELECT * FROM employees WHERE name = 'LiLei';
EXPLAIN SELECT * FROM employees WHERE name = 'LiLei' AND age = 22;
EXPLAIN SELECT * FROM employees WHERE name = 'LiLei' AND age = 22 AND position = 'manager';
-- 三列都用上，key_len 最大
```

跳过最左列则通常不走联合索引（8.0 Skip Scan 例外见上篇）。

### 3.2 不对索引列做计算或隐式转换

```sql
EXPLAIN SELECT * FROM employees WHERE name = 'LiLei';              -- ✅
EXPLAIN SELECT * FROM employees WHERE LEFT(name, 3) = 'LiLei';      -- ❌ 函数导致失效

ALTER TABLE employees ADD INDEX idx_hire_time (hire_time);
EXPLAIN SELECT * FROM employees WHERE DATE(hire_time) = '2018-09-30';  -- ❌
EXPLAIN SELECT * FROM employees
  WHERE hire_time >= '2018-09-30 00:00:00'
    AND hire_time <= '2018-09-30 23:59:59';                          -- ✅ 范围改写
```

![函数导致索引失效](/数据库/mysql-03-explain/p008-04.png)

### 3.3 范围条件后的列难用于索引

```sql
EXPLAIN SELECT * FROM employees
  WHERE name = 'LiLei' AND age = 22 AND position = 'manager';  -- 全用
EXPLAIN SELECT * FROM employees
  WHERE name = 'LiLei' AND age > 22 AND position = 'manager';    -- position 往往用不上
```

### 3.4 尽量覆盖索引，少 `SELECT *`

```sql
EXPLAIN SELECT name, age FROM employees
  WHERE name = 'LiLei' AND age = 23 AND position = 'manager';  -- Using index
EXPLAIN SELECT * FROM employees
  WHERE name = 'LiLei' AND age = 23 AND position = 'manager';  -- 可能回表
```

### 3.5 不等于、NOT IN、LIKE 前缀

```sql
EXPLAIN SELECT * FROM employees WHERE name != 'LiLei';       -- 常全表扫
EXPLAIN SELECT * FROM employees WHERE name LIKE '%Lei';    -- 前导通配，失效
EXPLAIN SELECT * FROM employees WHERE name LIKE 'Lei%';    -- 可能走索引
```

`!=`、`<`、`>` 等是否走索引，优化器会按 **选择性、表大小** 综合判断；MySQL 8 与 5.7 行为可能不同，以 Explain 为准。

### 3.6 字符串与数字比较

```sql
EXPLAIN SELECT * FROM employees WHERE name = '1000';  -- ✅
EXPLAIN SELECT * FROM employees WHERE name = 1000;    -- ❌ 隐式转换，索引失效
```

### 3.7 OR / IN 与范围拆分

大表 `IN`/`OR` 可能走索引；小表可能全表扫。大范围 `age BETWEEN 1 AND 2000` 若不走索引，可拆成多段小范围：

```sql
ALTER TABLE employees ADD INDEX idx_age (age);
EXPLAIN SELECT * FROM employees WHERE age >= 1 AND age <= 2000;
-- 若 type=ALL，尝试：
EXPLAIN SELECT * FROM employees WHERE age >= 1 AND age <= 1000;
EXPLAIN SELECT * FROM employees WHERE age >= 1001 AND age <= 2000;
```

![范围过大导致不走索引](/数据库/mysql-03-explain/p009-02.png)

### 3.8 索引使用口诀

- `LIKE 'KK%'` 类似等值；`'%KK'`、`'%KK%'` 类似范围。
- 设计联合索引时，把 **等值条件列放前，范围条件列放后**。

---

## 小结

1. 关注 **type**（避免 ALL）、**key**（是否真的用上）、**Extra**（filesort/temporary）。
2. **key_len** 判断联合索引用了几列。
3. 最佳实践清单：最左前缀、禁止列上函数、覆盖索引、注意隐式类型转换与范围后的列。

下一篇进入 **实战**：联合索引第一个字段范围、索引下推、optimizer trace 与 ORDER BY 优化。

---

**系列导航**

- 上一篇：[MySQL 索引底层数据结构与算法](/数据库/mysql/mysql-02-index-structure)
- 下一篇：[MySQL 索引优化实战（一）](/数据库/mysql/mysql-04-index-opt-1)
