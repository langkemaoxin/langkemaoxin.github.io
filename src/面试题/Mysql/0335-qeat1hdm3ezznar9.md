---
title: "假如优化器走的索引不是预期中的索引怎么办"
sidebarGroup: "Mysql"
shortTitle: "假如优化器走的索引不是预期中的索引怎么办"
order: 335
date: 2026-07-23
category: "面试题"
tag:
  - "面试题"
description: "老规矩，学习某个知识点，先搞清楚为什么？在看怎么解决为什么优化器可能选择非预期索引？1. 统计信息偏差 优化器依赖数据分布统计信息进行成本估算：场景：表数据量剧增/剧减未更新统计信息索引列数据分布不均（如90%都是同一状态）后果：优化器误判"
article: false
---

> 来源：[假如优化器走的索引不是预期中的索引怎么办](https://www.yuque.com/tulingzhouyu/db22bv/qeat1hdm3ezznar9)

**老规矩，学习某个知识点，先搞清楚为什么？在看怎么解决**

### 为什么优化器可能选择非预期索引？

#### **1. 统计信息偏差 **

优化器依赖**数据分布统计信息**进行成本估算：

- **场景**：

- 表数据量剧增/剧减未更新统计信息
- 索引列数据分布不均（如90%都是同一状态）

- **后果**：

- 优化器误判扫描行数（Rows列）

***示例：实际扫描1万行，统计信息误判为100行，导致错误选择索引***

- **更新机制**

**数据库**
**自动更新触发条件**
**手动更新命令**

MySQL
表数据修改 > 10% + 重启
`ANALYZE TABLE t`

PostgreSQL
AUTOVACUUM 阈值 (默认20%修改)
`VACUUM ANALYZE t`

**关键隐患**：大表统计更新可能锁表，需在业务低峰执行

---

#### **2. 查询条件陷阱**

SQL写法导致索引失效，但优化器仍然选择低效索引：

**陷阱类型**
**案例**
**优化器行为**

隐式类型转换
`WHERE varchar_col = 123`
索引失效但仍出现在执行计划

索引列函数操作
`WHERE YEAR(create_time)=2023`
索引无效但被选择

`LIKE`通配符开头
`WHERE name LIKE '%apple%'`
退化全表扫描

`OR`连接非索引列
`WHERE indexed_id=1 OR name='A'`
可能放弃索引

---

#### **3. 索引设计缺陷**

索引本身存在结构性问题：

- **复合索引顺序错误**：

```plsql
-- 现有索引
INDEX(status, create_time)
-- 但高频查询
WHERE create_time > '2023-01-01' AND status='paid'  
-- 优化器无法高效使用 create_time 范围扫描
```

- **缺失覆盖索引**：

- 查询需回表大量数据，优化器可能放弃索引扫描

- **冗余索引干扰**：

- 过多相似索引（如`idx_a`,`idx_a_b`）导致优化器选择错误

---

#### **4. 成本计算模型局限**

优化器基于**成本估算**而非实际耗时：

- **参数误差**：

- `random_page_cost` (PostgreSQL)
- `innodb_stats_persistent_sample_pages` (MySQL)

- **硬件认知偏差**：

- SSD环境仍用HDD默认成本参数

- **算法限制**：

- MySQL对`IN`子查询可能错误选择全表扫描

---

#### **5. 环境干扰因素**

外部因素导致误判：

- **Buffer Pool未预热**：冷启动时优化器拒绝走索引
- **参数强制设置**：

- `optimizer_switch`关闭索引下推(ICP)
- `force index`残留导致后续执行计划混乱

---

### 系统化解决方案

根据根因采取针对性措施：

#### **1. 解决统计信息问题**

```plsql
-- MySQL (立即更新)
ANALYZE TABLE orders;

-- PostgreSQL (提升采样精度)
SET default_statistics_target = 1000;
VACUUM ANALYZE orders;
```

#### **2. 修正查询写法**

```plsql
/* 类型转换修复 */
-- 原: SELECT ... WHERE phone = 13800138000
SELECT ... WHERE phone = '13800138000'  -- 明确字符串类型

/* 函数操作改造 */
-- 原: SELECT ... WHERE DATE(create_time) = '2023-01-01'
SELECT ... 
WHERE create_time >= '2023-01-01 00:00:00' 
  AND create_time < '2023-01-02 00:00:00'

/* OR 条件解耦 处理NULL值*/ 
-- 原: WHERE indexed_id=1 OR name='A'
SELECT ... WHERE indexed_id = 1 
UNION ALL
SELECT ... WHERE name='A' 
  AND (indexed_id <> 1 OR indexed_id IS NULL)
```

#### **3. 优化索引结构**

```plsql
/* 重建复合索引顺序 */
-- 原索引：INDEX(status, create_time)
DROP INDEX idx_old ON orders;
CREATE INDEX idx_new ON orders(create_time, status);  -- 范围列前置

/* 添加覆盖索引 */
-- 高频查询：SELECT status, amount FROM orders WHERE user_id=?
CREATE INDEX idx_cover ON orders(user_id, status, amount);  -- 覆盖查询字段
```

#### **4. 干预优化器决策**

```plsql
# MySQL SSD优化 (my.cnf)
innodb_io_capacity=20000
innodb_read_io_threads=16
optimizer_switch='index_merge=on'

# PostgreSQL SSD优化 (postgresql.conf)
random_page_cost=1.1
effective_io_concurrency=200
```

#### **5. 终极端解决方案**

当所有优化无效时：

```plsql
-- 创建虚拟计算列 + 函数索引
ALTER TABLE orders 
  ADD COLUMN create_date DATE AS (DATE(create_time)) VIRTUAL;
CREATE INDEX idx_func ON orders(create_date);  -- 对计算列创建索引

-- 业务层拆分查询：将复杂查询拆分为多个简单查询
```
