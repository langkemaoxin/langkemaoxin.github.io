---
title: "MySQL 索引优化实战（二）"
sidebarGroup: "MySQL"
shortTitle: "05 索引优化实战二"
order: 5
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "深分页、JOIN 算法（NLJ/BNL）、IN 与 EXISTS、COUNT 优化，以及 MySQL 数据类型选型要点。"
---

> **MySQL 系列 · 第 5/10 篇**  
> 上一篇：[《MySQL 索引优化实战（一）》](/数据库/mysql/mysql-04-index-opt-1)  
> 下一篇：[《MySQL 事务隔离级别与锁机制》](/数据库/mysql/mysql-06-transaction-lock)

---

## 开头：索引之外的 SQL 性能

索引调好后，仍常见 **深分页慢**、**JOIN 扫百万行**、**COUNT(\*) 拖垮库**。本篇覆盖分页改写、Nested-Loop 与 Block Nested-Loop、`IN`/`EXISTS` 选型、`COUNT` 优化，以及数据类型对索引与存储的影响。

> 工程规范可参考《阿里巴巴 Java 开发手册》数据库章节（索引命名、字段类型等）；本文不展开手册条文，仅聚焦 **原理与可验证的优化手段**。

---

## 一、分页查询优化

```sql
SELECT * FROM employees LIMIT 10000, 10;
```

语义是跳过前 10000 行再取 10 行——引擎往往 **读 10010 行再丢弃前 10000 行**，越往后越慢。

### 1.1 主键连续时的改写

```sql
EXPLAIN SELECT * FROM employees LIMIT 90000, 5;
EXPLAIN SELECT * FROM employees WHERE id > 90000 LIMIT 5;
```

后者走主键范围，扫描行数大幅减少。

![深分页：LIMIT offset vs 主键范围](/数据库/mysql-05-index-opt-2/p002-02.png)

**限制**：

1. 主键 **自增且连续**（中间删行会有空洞，结果可能与 OFFSET 分页不一致）。
2. 若 `ORDER BY` 非主键，不能简单替换。

### 1.2 按非主键排序的分页

```sql
SELECT * FROM employees ORDER BY name LIMIT 90000, 5;
-- 常 filesort + 大量扫描
```

**优化**：子查询先 **只查排序列对应的主键**，再 JOIN 回表：

```sql
SELECT e.*
FROM employees e
INNER JOIN (
  SELECT id FROM employees ORDER BY name LIMIT 90000, 5
) ed ON e.id = ed.id;
```

内层可用覆盖索引或更小的排序集；外层仅 5 次主键查找。

![延迟关联分页优化](/数据库/mysql-05-index-opt-2/p002-04.png)

---

## 二、JOIN 关联查询优化

### 2.1 示例表

```sql
CREATE TABLE t1 (
  id INT(11) NOT NULL AUTO_INCREMENT,
  a  INT(11) DEFAULT NULL,
  b  INT(11) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_a (a)
) ENGINE=InnoDB;

CREATE TABLE t2 LIKE t1;

-- t1 插入 1 万行，t2 插入 100 行（存储过程略，见课程脚本）
```

### 2.2 Nested-Loop Join（NLJ）

```sql
EXPLAIN SELECT * FROM t1 INNER JOIN t2 ON t1.a = t2.a;
```

- **驱动表** t2（小表，约 100 行）。
- 对 t2 每行，用 `a` 在 t1 的 **idx_a** 上查找。
- 扫描约 100 + 100 = **200 行**。
- Extra **无** `Using join buffer` → NLJ。

```mermaid
flowchart LR
  T2["驱动表 t2\n100 行"] -->|"每行 a 值"| IDX["t1.idx_a 查找"]
  IDX --> RES["结果合并"]
```

### 2.3 Block Nested-Loop Join（BNL）

```sql
EXPLAIN SELECT * FROM t1 INNER JOIN t2 ON t1.b = t2.b;
-- Extra: Using join buffer (Block Nested Loop)
```

`t1.b`、`t2.b` **无索引**：

1. 把 t2 全部放入 **join_buffer**。
2. 扫描 t1 全表，与 buffer 中每行比对。

扫描约 10000 + 100 = **10100 行**；内存比较约 100 × 10000 次。  
若 buffer 放不下（由 **`join_buffer_size`** 控制，默认 256KB），**分段** 放入 t2，t1 可能被多扫几遍。

**为何无索引时用 BNL 而非 NLJ？** NLJ 需对被驱动表每行扫全表，磁盘 IO 约 100×10000；BNL 一次扫 t1 + 内存比对，通常更省。

![NLJ vs BNL 执行计划](/数据库/mysql-05-index-opt-2/p005-01.png)

### 2.4 JOIN 优化建议

1. **关联字段加索引**，让优化器选 NLJ。
2. **小表驱动大表**：过滤后 **行数少** 的作为驱动表。
3. `STRAIGHT_JOIN` 可固定驱动顺序（仅 INNER JOIN），**慎用**——优化器多数情况更准。
4. `LEFT JOIN` 左表、`RIGHT JOIN` 右表固定为驱动表，不能用 STRAIGHT_JOIN 改变语义。

---

## 三、IN 与 EXISTS

原则：**小结果集驱动大结果集**。

```sql
-- B 表小于 A 表时，IN 可能更优
SELECT * FROM A WHERE id IN (SELECT id FROM B);

-- A 表小于 B 表时，EXISTS 可能更优
SELECT * FROM A WHERE EXISTS (SELECT 1 FROM B WHERE B.id = A.id);
```

语义等价理解：

- **IN**：先查 B，再对 A 逐 id 匹配。
- **EXISTS**：先查 A 每行，再到 B 验证是否存在。

**注意**

1. `EXISTS (SELECT 1 ...)` 与 `SELECT *` 等价，执行时忽略 SELECT 清单。
2. 子查询可能被优化为 semi-join，不一定逐行对比。
3. 很多场景 **JOIN 改写** 性能更好，需 Explain 验证。
4. A、B 的 **id 应有索引**。

---

## 四、COUNT(\*) 查询优化

```sql
EXPLAIN SELECT COUNT(1) FROM employees;
EXPLAIN SELECT COUNT(id) FROM employees;
EXPLAIN SELECT COUNT(name) FROM employees;
EXPLAIN SELECT COUNT(*) FROM employees;
```

InnoDB 下四者执行计划类似；**COUNT(\*)** 由 Server 层优化，**不取字段**，推荐写法。

**统计差异**：`COUNT(列)` **不统计 NULL**；`COUNT(*)` / `COUNT(1)` 统计所有行。

**效率粗记**（有二级索引时）：

- `COUNT(*) ≈ COUNT(1) > COUNT(字段) > COUNT(主键 id)`（字段走二级索引，页更小；MySQL 5.7+ 对 COUNT(id) 也有优化）

### 4.1 常见加速手段

| 方案 | 说明 |
|------|------|
| **MyISAM** | 维护总行数，无 WHERE 的 COUNT 极快（无 MVCC） |
| **SHOW TABLE STATUS** | `Rows` 为估计值，近似 COUNT |
| **Redis 计数** | 增删时维护；与 DB 事务一致性难保证 |
| **计数表** | 同事务更新业务表 + 计数表 |

InnoDB 无精确行数缓存，大表 **实时 COUNT(\*)** 成本高，业务上常用 **近似值或冗余计数**。

![COUNT 执行计划对比](/数据库/mysql-05-index-opt-2/p007-01.png)

---

## 五、MySQL 数据类型选型

选型两步：**定大类**（数字/字符串/时间/二进制）→ **定具体类型**（有无符号、变长、精度）。

原则：**尽量小**、**尽量 NOT NULL**（NULL 使索引与比较更复杂）。

### 5.1 数值类型

| 类型 | 字节 | 用途 |
|------|------|------|
| TINYINT | 1 | 状态、布尔 |
| INT | 4 | 一般整数 |
| BIGINT | 8 | 大 ID、金额分 |
| DECIMAL(M,D) | 变长 | 精确小数（价格） |

建议：

- 无负数用 **UNSIGNED**。
- 避免 `INT(10)` 显示宽度误区——宽度不限制存储，只影响 ZEROFILL 展示。
- 金额可用 **整型存分**，运算用 INT/BIGINT。

### 5.2 日期时间

| 类型 | 字节 | 说明 |
|------|------|------|
| DATE | 3 | 仅日期 |
| DATETIME | 8 | 与时区无关，存什么读什么 |
| TIMESTAMP | 4 | UTC，有时区转换，2038 上限 |

阿里等团队常用 **DATETIME** 避免 TIMESTAMP 上限；一般业务 TIMESTAMP + `DEFAULT CURRENT_TIMESTAMP` 也足够。

**用原生 DATE/DATETIME/TIMESTAMP**，少存 Unix 时间戳整型（除非有特殊理由）。

### 5.3 字符串

| 类型 | 说明 |
|------|------|
| CHAR | 定长，适合短且长度固定（如 MD5、邮编） |
| VARCHAR | 变长 + 2 字节长度，常用 |
| TEXT/BLOB | 大字段，单独表 + id 关联 often 更好 |

长 VARCHAR 索引用 **前缀索引**；BLOB/TEXT 避免默认索引整列。

---

## 小结

| 场景 | 优化方向 |
|------|----------|
| 深分页 | 主键范围；延迟关联（先 id 再 JOIN） |
| JOIN | 关联列索引；小表驱动；理解 NLJ/BNL |
| IN / EXISTS | 小表驱动；必要时改 JOIN |
| COUNT | 优先 COUNT(\*)；大表用冗余或近似 |
| 类型 | 更小、NOT NULL、精确场景用 DECIMAL |

索引系列到此告一段落；下一篇进入 **事务隔离级别与锁**。

---

**系列导航**

- 上一篇：[MySQL 索引优化实战（一）](/数据库/mysql/mysql-04-index-opt-1)
- 下一篇：[MySQL 事务隔离级别与锁机制](/数据库/mysql/mysql-06-transaction-lock)
