---
title: "MySQL 索引优化实战（一）"
sidebarGroup: "MySQL"
shortTitle: "04 索引优化实战一"
order: 4
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "联合索引范围、索引下推、optimizer trace、ORDER BY/GROUP BY 与 filesort 原理，以及索引设计原则与社交场景实战。"
---

> **MySQL 系列 · 第 4/10 篇**  
> 上一篇：[《Explain 详解与索引最佳实践》](/数据库/mysql/mysql-03-explain)  
> 下一篇：[《MySQL 索引优化实战（二）》](/数据库/mysql/mysql-05-index-opt-2)

---

## 开头：从「会用索引」到「选最优索引」

Explain 能告诉你 **有没有** 走索引；生产环境还要回答：**为什么优化器选了全表扫描**、**强制索引是否更快**、**ORDER BY 为何 filesort**。本篇用 10 万行级 `employees` 表做实验，并介绍 **optimizer trace** 看优化器决策过程。

---

## 一、准备示例数据

```sql
CREATE TABLE employees (
  id       INT(11) NOT NULL AUTO_INCREMENT,
  name     VARCHAR(24) NOT NULL DEFAULT '' COMMENT '姓名',
  age      INT(11) NOT NULL DEFAULT 0 COMMENT '年龄',
  position VARCHAR(20) NOT NULL DEFAULT '' COMMENT '职位',
  hire_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '入职时间',
  PRIMARY KEY (id),
  KEY idx_name_age_position (name, age, position)
) ENGINE=InnoDB COMMENT='员工记录表';

INSERT INTO employees(name, age, position, hire_time) VALUES
('LiLei', 22, 'manager', NOW()),
('HanMeimei', 23, 'dev', NOW()),
('Lucy', 23, 'dev', NOW());

-- 批量插入 10 万行（MySQL 8 可用 WHILE 存储过程）
DROP PROCEDURE IF EXISTS insert_emp;
DELIMITER ;;
CREATE PROCEDURE insert_emp()
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= 100000 DO
    INSERT INTO employees(name, age, position) VALUES (CONCAT('zhuge', i), i, 'dev');
    SET i = i + 1;
  END WHILE;
END;;
DELIMITER ;
CALL insert_emp();
```

---

## 二、联合索引第一个字段用范围

```sql
EXPLAIN SELECT * FROM employees
  WHERE name > 'LiLei' AND age = 22 AND position = 'manager';
```

**现象**：`name` 第一个字段就是范围（`>`），优化器常 **不走联合索引**，认为结果集大、回表成本高，不如全表扫描。

### 2.1 强制走索引

```sql
EXPLAIN SELECT * FROM employees FORCE INDEX(idx_name_age_position)
  WHERE name > 'LiLei' AND age = 22 AND position = 'manager';
```

`rows` 可能变少，但 **总耗时未必更低**——大量回表随机 IO。

```sql
-- 实测（关闭 query cache 后，以你环境为准）
SELECT * FROM employees WHERE name > 'LiLei';                          -- ~0.33s
SELECT * FROM employees FORCE INDEX(idx_name_age_position)
  WHERE name > 'LiLei';                                                -- ~0.44s
```

![强制索引 vs 全表扫描](/数据库/mysql-04-index-opt-1/p002-03.png)

**结论**：优化器选全表扫有时是对的；`FORCE INDEX` 慎用。

### 2.2 覆盖索引规避回表

```sql
EXPLAIN SELECT name, age, position FROM employees
  WHERE name > 'LiLei' AND age = 22 AND position = 'manager';
-- Extra: Using index
```

只查索引列，无需回表，范围扫描更划算。

---

## 三、IN、OR 与数据量

大表：

```sql
EXPLAIN SELECT * FROM employees
  WHERE name IN ('LiLei', 'HanMeimei', 'Lucy') AND age = 22 AND position = 'manager';

EXPLAIN SELECT * FROM employees
  WHERE (name = 'LiLei' OR name = 'HanMeimei') AND age = 22 AND position = 'manager';
```

小表（复制 `employees_copy` 仅保留数行）：MySQL 5.7 可能选全表扫；**MySQL 8** 小表 IN/OR 也常走索引。

---

## 四、索引下推（ICP）

对 `(name, age, position)`，查询：

```sql
EXPLAIN SELECT * FROM employees
  WHERE name LIKE 'LiLei%' AND age = 22 AND position = 'manager';
```

**5.6 之前**：`name LIKE 'LiLei%'` 走 name 前缀后，对每条命中记录 **回表**，再在 Server 层过滤 age、position。

**5.6+ 索引下推**：在 **二级索引叶子** 上先过滤 age、position，再回表，减少回表次数。Extra 可能出现 `Using index condition`。

**限制**：ICP 用于 **二级索引**；聚簇索引叶子已是整行，ICP 无意义。  
**范围查询** 通常不用 ICP——优化器认为范围结果集大，like `'LiLei%'` 结果集相对小才会用。

---

## 五、优化器如何选索引（optimizer trace）

```sql
SET SESSION optimizer_trace = 'enabled=on', end_markers_in_json = on;

SELECT * FROM employees WHERE name > 'a' ORDER BY position;
SELECT * FROM information_schema.OPTIMIZER_TRACE\G

SET SESSION optimizer_trace = 'enabled=off';
```

trace 中 **rows_estimation** 对比 **全表扫描 cost** 与 **idx_name_age_position 范围扫描 cost**：

- `name > 'a'`：匹配行约一半，索引 cost **高于** 全表 → 选 **ALL**。
- `name > 'zzz'`：匹配行很少，索引 cost **更低** → 选 **range**。

![optimizer trace 成本对比](/数据库/mysql-04-index-opt-1/p007-02.png)

**实践**：临时诊断工具，用完即关，避免性能损耗。

---

## 六、ORDER BY 与 GROUP BY 优化

联合索引 `(name, age, position)`，观察不同写法：

| Case | SQL 要点 | 现象 |
|------|----------|------|
| 1 | `WHERE name='LiLei' ORDER BY age, position` | 无 filesort，中间列未断 |
| 2 | `WHERE name='LiLei' ORDER BY position` | 跳过 age → **Using filesort** |
| 3 | `WHERE name='LiLei' AND age=22 ORDER BY position` | 无 filesort |
| 4 | `WHERE name='LiLei' ORDER BY age, position DESC` | 8.0 前可能 filesort；8.0 可建 **降序索引** |
| 5 | `WHERE name IN ('LiLei','Lucy') ORDER BY age` | IN 多值视为范围，可能 filesort |

```sql
-- MySQL 8 降序索引
CREATE INDEX idx_name_age_pos_desc ON employees(name ASC, age ASC, position DESC);
```

![ORDER BY 与 filesort 对比](/数据库/mysql-04-index-opt-1/p008-02.png)

**优化总结**

1. MySQL 支持 **index 排序** 与 **filesort**；优先前者。
2. ORDER BY 列满足 **最左前缀** 且与索引 **同序**（8.0 降序索引可放宽）。
3. `GROUP BY` 本质先排序再分组；可 `ORDER BY NULL` 避免多余排序（不需要排序时）。
4. **WHERE 优先于 HAVING**；能写 WHERE 的不写 HAVING。

---

## 七、filesort 原理

**单路排序**：`<sort_key, additional_fields>`，一次取出排序字段 + 查询字段进 sort_buffer，排完直接返回。  
**双路排序**：`<sort_key, rowid>`，只放排序列 + 主键，排完再 **回表** 取列。

由 **`max_length_for_sort_data`** 与查询字段总长度决定（MySQL 8 默认 **4096** 字节）：

- 字段总长 < 阈值 → 单路。
- 否则 → 双路，sort_buffer 能装更多行，但多一次回表。

```sql
EXPLAIN SELECT * FROM employees WHERE name = 'zhuge1' ORDER BY position;
-- trace 中 sort_mode: <sort_key, packed_additional_fields> 或 <sort_key, rowid>
```

**注意**：不要随意调大 `sort_buffer`（默认 1M）；双路/单路由优化器按场景选择。

---

## 八、索引设计原则

1. **代码先行，索引后上**：主体 SQL 稳定后再建索引，避免过早优化。
2. **联合索引覆盖** WHERE + ORDER BY + GROUP BY 常用列，注意列顺序。
3. **高基数列** 更适合建索引；性别等低基数列单独索引意义不大。
4. **长字符串用前缀索引**：`INDEX(name(20), age, position)`；ORDER BY/GROUP BY 完整 name 时前缀索引帮不上忙。
5. **WHERE 与 ORDER BY 冲突时优先 WHERE**：先缩小结果集再排序。
6. 结合 **慢查询日志** 做针对性索引（见下篇 count/分页场景）。

---

## 九、设计实战：社交 APP 用户筛选

典型 SQL：

```sql
SELECT xx FROM user
WHERE province = ? AND city = ? AND sex IN ('female','male')
  AND age BETWEEN ? AND ?
ORDER BY score LIMIT ?, ?;
```

**思路**

1. 高频过滤列建联合索引：`(province, city, sex, hobby, age)`。
2. 范围列（age）放 **等值列之后**；若跳过 sex，可把 `sex IN (...)` 改写进索引。
3. 「最近 7 天登录」若用 `latest_login_time >= ?` 难进索引，可冗余 **`is_login_in_latest_7_days` TINYINT**，纳入联合索引。
4. 非典型查询如 `WHERE sex='female' ORDER BY score` 单独建 **`(sex, score)`** 辅助索引。

![多索引分工：主联合索引 + 辅助索引](/数据库/mysql-04-index-opt-1/p014-01.png)

核心：**一两个复杂联合索引扛 80% 查询**，少量辅助索引覆盖长尾。

---

## 小结

| 主题 | 要点 |
|------|------|
| 首列范围 | 易全表扫；覆盖索引可缓解 |
| ICP | 减少二级索引回表 |
| trace | 看 cost 理解优化器 |
| ORDER BY | 最左前缀 + 排序方向一致 |
| filesort | 单路/双路由 max_length_for_sort_data 决定 |

---

**系列导航**

- 上一篇：[Explain 详解与索引最佳实践](/数据库/mysql/mysql-03-explain)
- 下一篇：[MySQL 索引优化实战（二）](/数据库/mysql/mysql-05-index-opt-2)
