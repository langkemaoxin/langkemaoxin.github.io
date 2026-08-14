---
title: "MySQL 全局优化与 8.0 新特性"
sidebarGroup: "MySQL"
shortTitle: "09 全局优化与 8.0"
order: 9
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "max_connections、Buffer Pool 命中率、InnoDB 与 binlog 参数调优，以及 MySQL 8.0 降序索引、隐藏索引、窗口函数等新特性。"
---

> **MySQL 系列 · 第 9/10 篇**  
> 上一篇：[《InnoDB 底层原理与 MySQL 日志机制》](/数据库/mysql/mysql-08-innodb-logs)  
> 下一篇：[《MySQL 8.0 主从复制与高可用集群》](/数据库/mysql/mysql-10-replication-ha)

---

## 开头：优化从哪里下手？

SQL 及索引优化效果通常最好、成本最低，工作中应优先投入。但当 SQL 已经优化到位，就需要从**全局参数**和**版本新特性**层面继续挖掘性能空间。本文梳理 **MySQL Server 与 InnoDB 核心参数**，并详解 **MySQL 8.0 重要新特性**。

---

## 一、MySQL 全局优化

![优化优先级](/数据库/mysql-09-mysql8-features/p001-01.png)

假设服务器配置：**32 核 CPU、64G 内存、2T SSD**。

### 1.1 连接相关参数

```ini
[mysqld]
max_connections=3000
max_user_connections=2980
back_log=300
wait_timeout=300
interactive_timeout=300
sort_buffer_size=4M
join_buffer_size=4M
```

| 参数 | 说明 |
|------|------|
| `max_connections` | 最大连接数；剩余留给 DBA 管理 |
| `back_log` | 连接数达上限时，暂存等待连接的堆栈大小 |
| `wait_timeout` | 非交互连接空闲超时（秒），默认 28800 |
| `interactive_timeout` | 交互连接空闲超时 |
| `sort_buffer_size` | 每个需要排序的连接一次性分配；connection 级，500 连接 × 4M = 2G |
| `join_buffer_size` | 表关联缓存，每个连接独享 |

**内存估算：** 每连接最少 256 KB，最大 64 MB（排序超 64 MB 用临时磁盘空间）。3000 连接最大约 192 GB 内存需求——若 `innodb_buffer_pool_size=40G`、OS 4G，连接占用超 20G 会触发 **SWAP**，反而降低性能。**连接数过高不一定提高吞吐量**。

### 1.2 InnoDB 参数

```ini
innodb_thread_concurrency=64
innodb_buffer_pool_size=40G
innodb_lock_wait_timeout=10
innodb_flush_log_at_trx_commit=1
```

| 参数 | 说明 |
|------|------|
| `innodb_thread_concurrency` | 并发线程数，建议与 CPU 核数相同或 2 倍；过大导致锁争用 |
| `innodb_buffer_pool_size` | 缓冲池大小，物理内存 60%–70% |
| `innodb_lock_wait_timeout` | 行锁等待超时，默认 50s |
| `innodb_flush_log_at_trx_commit` | redo 刷盘策略，线上推荐 1（见 [第 8 篇](/数据库/mysql/mysql-08-innodb-logs)） |

### 1.3 Buffer Pool 命中率

```sql
SHOW GLOBAL STATUS LIKE 'innodb%read%';
```

![Buffer Pool 读统计](/数据库/mysql-09-mysql8-features/p004-01.png)

| 变量 | 含义 |
|------|------|
| `Innodb_buffer_pool_reads` | 从磁盘读页次数 |
| `Innodb_buffer_pool_read_requests` | 从缓冲池读页次数 |
| `Innodb_buffer_pool_read_ahead` | 预读次数 |
| `Innodb_buffer_pool_read_ahead_evicted` | 预读但未使用的页数 |

**命中率** ≈ `1 - reads / read_requests`，应 **≥ 99%**。低于此说明 Buffer Pool 不足或 SQL 访问模式不合理。

### 1.4 binlog 参数

```ini
sync_binlog=1
binlog_format=row
binlog_expire_logs_seconds=604800
```

`sync_binlog=1` 每次提交 fsync，与 `innodb_flush_log_at_trx_commit=1` 配合实现最强数据安全（见 [第 8 篇](/数据库/mysql/mysql-08-innodb-logs)）。

---

## 二、MySQL 8.0 新特性详解

建议使用 **8.0.17 及之后**版本。参考 [MySQL 8.0 Release Notes](https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html)。

![InnoDB 8.0 架构](/数据库/mysql-09-mysql8-features/p004-02.png)

### 2.1 降序索引

MySQL 语法早支持 `DESC`，但 5.7 实际仍建升序索引：

```sql
-- MySQL 5.7
CREATE TABLE t1(c1 INT, c2 INT, INDEX idx_c1_c2(c1, c2 DESC));
SHOW CREATE TABLE t1;  -- c2 仍是升序
EXPLAIN SELECT * FROM t1 ORDER BY c1, c2 DESC;
-- Extra: Using index; Using filesort
```

**8.0 真正支持降序索引：**

```sql
CREATE TABLE t1(c1 INT, c2 INT, INDEX idx_c1_c2(c1, c2 DESC));
SHOW CREATE TABLE t1;  -- KEY `idx_c1_c2` (`c1`,`c2` DESC)

EXPLAIN SELECT * FROM t1 ORDER BY c1, c2 DESC;
-- Extra: Using index（无 filesort）

EXPLAIN SELECT * FROM t1 ORDER BY c1 DESC, c2;
-- Extra: Backward index scan; Using index
```

排序必须按每个字段定义的排序方向（或完全相反）才能充分利用索引。

### 2.2 GROUP BY 不再隐式排序

5.7 的 `GROUP BY` 默认按分组字段排序；**8.0 不再隐式排序**，需要排序须显式 `ORDER BY`：

```sql
-- 8.0
SELECT COUNT(*), c2 FROM t1 GROUP BY c2;              -- 结果无序
SELECT COUNT(*), c2 FROM t1 GROUP BY c2 ORDER BY c2;  -- 显式排序
```

### 2.3 隐藏索引（Invisible Index）

```sql
CREATE TABLE t2(
  c1 INT, c2 INT,
  INDEX idx_c1(c1),
  INDEX idx_c2(c2) INVISIBLE
);

SHOW INDEX FROM t2;  -- idx_c2 Visible: NO
```

隐藏索引不可见但后台仍维护。优化器默认不使用，即使 `FORCE INDEX` 也不使用（不报错）。**软删除索引**场景：先设为 invisible，确认无用再 DROP。

```sql
-- 会话级启用隐藏索引
SET SESSION optimizer_switch = 'use_invisible_indexes=on';

ALTER TABLE t2 ALTER INDEX idx_c2 VISIBLE;
ALTER TABLE t2 ALTER INDEX idx_c2 INVISIBLE;
```

### 2.4 函数索引（8.0.13+）

基于虚拟列实现，对函数表达式建索引：

```sql
CREATE TABLE t3(c1 VARCHAR(10), c2 VARCHAR(10));
CREATE INDEX idx_c1 ON t3(c1);
CREATE INDEX func_idx ON t3((UPPER(c2)));

EXPLAIN SELECT * FROM t3 WHERE UPPER(c1) = 'ZHUGE';  -- 全表扫描
EXPLAIN SELECT * FROM t3 WHERE UPPER(c2) = 'ZHUGE';  -- 使用 func_idx
```

### 2.5 SELECT FOR UPDATE 跳过锁等待

8.0 新增 `NOWAIT` 和 `SKIP LOCKED`：

```sql
-- 5.7：一直等待直到 innodb_lock_wait_timeout
SELECT * FROM t1 WHERE c1 = 2 FOR UPDATE;

-- 8.0
SELECT * FROM t1 WHERE c1 = 2 FOR UPDATE NOWAIT;   -- 立即报错
SELECT * FROM t1 FOR UPDATE SKIP LOCKED;            -- 跳过被锁行
```

**余票查询**等场景：`SKIP LOCKED` 跳过已锁定记录，只返回可售座位，提高并发性能。

### 2.6 innodb_dedicated_server

自动根据服务器内存配置 `innodb_buffer_pool_size`、`innodb_log_file_size` 等。**专用 MySQL 服务器**可开启；多实例或共享资源环境不建议。

```sql
SHOW VARIABLES LIKE '%innodb_dedicated_server%';  -- 默认 OFF
```

### 2.7 死锁检查控制

```sql
SHOW VARIABLES LIKE '%innodb_deadlock_detect%';  -- 默认 ON
```

高并发系统可关闭死锁检测提升性能，但需确保极少死锁，并将 `innodb_lock_wait_timeout` 调小。

### 2.8 undo 表空间独立

8.0 默认创建 2 个独立 UNDO 表空间，不再使用系统表空间。

### 2.9 binlog 过期时间精确到秒

8.0 用 `binlog_expire_logs_seconds` 替代 `expire_logs_days`。

### 2.10 窗口函数（Window Functions）

聚合函数后加 `OVER()` 即为窗口函数，**不合并行**：

```sql
CREATE TABLE account_channel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255), channel VARCHAR(20), balance INT
);

-- 普通 GROUP BY：每组一行
SELECT name, SUM(balance) FROM account_channel GROUP BY name;

-- 窗口函数：保留原行结构
SELECT name, channel, balance,
       SUM(balance) OVER(PARTITION BY name) AS sum_balance
FROM account_channel;

-- 组内按 balance 排序的累加
SELECT name, channel, balance,
       SUM(balance) OVER(PARTITION BY name ORDER BY balance) AS sum_balance
FROM account_channel;
```

**专用窗口函数：**

| 类别 | 函数 |
|------|------|
| 序号 | `ROW_NUMBER()`、`RANK()`、`DENSE_RANK()` |
| 分布 | `PERCENT_RANK()`、`CUME_DIST()` |
| 前后 | `LAG()`、`LEAD()` |
| 头尾 | `FIRST_VALUE()`、`LAST_VALUE()` |
| 其他 | `NTH_VALUE()`、`NTILE()` |

### 2.11 默认字符集 utf8mb4

8.0 默认字符集从 latin1 改为 **utf8mb4**；`utf8` 指向 utf8mb4 而非 utf8mb3。

### 2.12 MyISAM 系统表换 InnoDB

系统表和数据字典全部改为 InnoDB；默认实例不含 MyISAM 表。

### 2.13 元数据存储变动

8.0 删除 `.frm` 文件，元数据集中存入 `mysql.ibd`。

### 2.14 自增变量持久化

5.7 重启后 `AUTO_INCREMENT` 重置为 `MAX(id)+1`，可能导致主键冲突。8.0 **持久化**自增值，重启后不重置。

### 2.15 DDL 原子化

InnoDB DDL 支持事务完整性——成功或回滚：

```sql
-- 5.7：drop table t1,t2; t1 已删，t2 不存在报错，t1 不会回滚
-- 8.0：报错时 t1 仍在
```

### 2.16 参数修改持久化

```sql
SET PERSIST innodb_lock_wait_timeout = 25;
```

写入 `mysqld-auto.cnf`（JSON 格式），重启后生效。`SET GLOBAL` 不持久化。

---

## 小结

| 类别 | 要点 |
|------|------|
| 连接 | 控制 max_connections，避免 SWAP |
| Buffer Pool | 60–70% 内存，命中率 ≥ 99% |
| 日志 | redo + binlog 双 1 刷盘 |
| 8.0 索引 | 降序索引、隐藏索引、函数索引 |
| 8.0 并发 | NOWAIT / SKIP LOCKED、死锁检测开关 |
| 8.0 其他 | 窗口函数、DDL 原子化、自增持久化 |

下一篇是系列终章：**MySQL 8.0 主从复制与高可用集群**（MGR + InnoDB Cluster）。
