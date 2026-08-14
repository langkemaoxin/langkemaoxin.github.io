---
title: "MVCC 与 Buffer Pool 缓存机制"
sidebarGroup: "MySQL"
shortTitle: "07 MVCC 与 BufferPool"
order: 7
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "意向锁、间隙锁深入，MVCC 的 undo 版本链与 Read View 可见性算法，以及 InnoDB Buffer Pool 读写路径。"
---

> **MySQL 系列 · 第 7/10 篇**  
> 上一篇：[《MySQL 事务隔离级别与锁机制》](/数据库/mysql/mysql-06-transaction-lock)  
> 下一篇：[《InnoDB 底层原理与 MySQL 日志机制》](/数据库/mysql/mysql-08-innodb-logs)

---

## 开头：可重复读隔离性靠什么保证？

[上一篇](/数据库/mysql/mysql-06-transaction-lock) 演示过：RR 级别下同一事务多次 `SELECT` 结果相同，即使其他事务已修改数据。这种隔离性靠 **MVCC（Multi-Version Concurrency Control）** 实现——读和写默认不通过加锁互斥，避免频繁加锁；串行化隔离级别则对所有操作加锁互斥。

MySQL 在 **RC** 和 **RR** 级别都实现了 MVCC。本文先补充锁机制细节，再剖析 MVCC 底层，最后说明 **Buffer Pool** 在读写路径中的角色。

---

## 一、锁机制补充

### 1.1 锁分类回顾

| 维度 | 类型 | 说明 |
|------|------|------|
| 性能 | 乐观锁 / 悲观锁 | 乐观锁适合读多；悲观锁适合写多 |
| 粒度 | 表锁 / 页锁 / 行锁 | 页锁仅 BDB 支持；InnoDB 用行锁 |
| 类型 | S 锁 / X 锁 / 意向锁 | 意向锁提高表锁效率 |

**显式加锁：**

```sql
SELECT * FROM T WHERE id = 1 LOCK IN SHARE MODE;  -- S 锁
SELECT * FROM T WHERE id = 1 FOR UPDATE;           -- X 锁
```

**意向锁（Intention Lock）**：当事务给行加 S/X 锁时，同时在表上设置标识（IS/IX），其他事务加表锁时无需逐行检查，直接读标识即可。表记录多时效率提升明显。

### 1.2 InnoDB 行锁的本质

InnoDB 行锁针对**索引项**加锁，而非整行记录；**索引失效**时可能升级为表锁（RR 会升表锁，RC 不会）。

RR 级别下，为防不可重复读和幻读，扫描聚集索引时会锁住**扫描过的索引记录和间隙**——不是直接锁整张表，而是锁住扫描路径上的记录与 gap。

![间隙锁示意](/数据库/mysql-07-mvcc-bufferpool/p002-01.png)

**间隙锁示例：**

```sql
-- 锁住 (10, 20) 间隙，其他 Session 无法在此范围插入
SELECT * FROM account WHERE id = 18 FOR UPDATE;

-- 锁住 (20, +∞) 间隙
SELECT * FROM account WHERE id = 25 FOR UPDATE;
```

**临键锁（Next-Key Lock）** = 行锁 + 间隙锁。

### 1.3 锁等待分析与死锁

```sql
SHOW STATUS LIKE 'innodb_row_lock%';

SELECT * FROM INFORMATION_SCHEMA.INNODB_TRX;
-- 8.0+ 锁信息
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;

KILL trx_mysql_thread_id;
SHOW ENGINE INNODB STATUS;
```

**锁优化实践：**

1. 检索走索引，避免无索引升表锁
2. 缩小锁范围
3. 减少间隙锁触发条件
4. 控制事务大小，加锁 SQL 放事务末尾
5. 尽量用较低隔离级别

---

## 二、MVCC 多版本并发控制

### 2.1 核心思想

MVCC 通过 **Read View 机制** 与 **undo 版本链比对**，让不同事务读取同一行数据在版本链上的不同版本，从而实现 RC/RR 下的无锁读。

- **串行化**：所有操作加锁互斥
- **RC / RR**：读操作走 MVCC 快照，写操作加锁并产生新版本

### 2.2 undo 日志版本链

一行数据被多个事务依次修改后，MySQL 保留每次修改前的 undo 回滚日志，用隐藏字段 `trx_id` 和 `roll_pointer` 串联成**历史版本链**：

![undo 版本链](/数据库/mysql-07-mvcc-bufferpool/p005-01.png)

### 2.3 Read View 与可见性算法

**RR 级别**：事务开启后，第一次执行查询 SQL 时生成 **Read View**，事务结束前**不再变化**。

**RC 级别**：每次查询 SQL 都**重新生成** Read View。

Read View 由以下组成：

- **min_id**：未提交事务 id 数组中的最小值
- **max_id**：已创建的最大事务 id
- **数组**：执行查询时所有未提交事务 id 列表

**版本链比对规则：**

1. 若 `row.trx_id < min_id`（绿色区域）→ 已提交，**可见**
2. 若 `row.trx_id > max_id`（红色区域）→ 将来事务产生，**不可见**（若是当前事务自己的 trx_id 则可见）
3. 若 `min_id <= trx_id <= max_id`（黄色区域）：
   - 在视图数组中 → 未提交，**不可见**（自己的事务除外）
   - 不在数组中 → 已提交，**可见**

![Read View 可见性示意](/数据库/mysql-07-mvcc-bufferpool/p006-01.png)

**删除的特殊处理**：复制最新版本，修改 `trx_id` 为删除操作的 id，在 record header 的 `deleted_flag` 标记为 true；查询时若该标记为 true 则不返回。

### 2.4 RC 与 RR 的实现差异

| 隔离级别 | Read View 行为 | 效果 |
|----------|----------------|------|
| **RR** | 首次查询生成，之后不变 | 同一事务内多次查询可重复读 |
| **RC** | 每次查询重新生成 | 每次读到已提交的最新数据 |

### 2.5 事务真正启动的时机

`BEGIN` / `START TRANSACTION` **不是**事务起点。在执行到第一个**修改操作**或 **`SELECT ... FOR UPDATE`** 时，事务才真正启动并向 MySQL 申请 trx_id；MySQL 严格按启动顺序分配 trx_id。

---

## 三、Buffer Pool 缓存机制

### 3.1 为什么需要 Buffer Pool

直接对磁盘随机读写性能极差，无法支撑高并发。InnoDB 的设计是：

1. **更新先写内存 Buffer Pool**（页缓存）
2. **顺序写 redo log** 保证持久性
3. 后台线程异步将脏页刷回磁盘

内存读写性能远高于磁盘随机 IO，这是 MySQL 能在较高配置机器上抗住数千甚至上万 QPS 的关键。

### 3.2 Buffer Pool 结构

Buffer Pool 是 InnoDB 在内存中缓存数据页和索引页的区域，默认大小由 `innodb_buffer_pool_size` 控制（生产环境通常设为物理内存的 60%–70%，详见 [全局优化篇](/数据库/mysql/mysql-09-mysql8-features)）。

核心组成：

| 区域 | 作用 |
|------|------|
| **数据页 / 索引页** | 缓存表数据和索引，16 KB 为一页 |
| **Change Buffer** | 缓存对二级索引页的写操作（非唯一索引） |
| **Adaptive Hash Index** | 热点页的自适应哈希索引 |
| **Lock Info / Data Dictionary** | 锁信息与数据字典缓存 |

### 3.3 读写与 MVCC 的协作

**读路径：**

1. 查询先在 Buffer Pool 查找目标页
2. 未命中则从磁盘加载到 Buffer Pool
3. 结合 Read View 在版本链上找可见版本（可能需要读 undo 页）

**写路径：**

1. 在 Buffer Pool 中找到（或加载）目标页
2. 修改页内容，产生 undo log 记录旧版本
3. 写 redo log（WAL：先日志后刷盘）
4. 事务提交时根据 `innodb_flush_log_at_trx_commit` 策略持久化 redo
5. 脏页由后台线程异步 flush 到数据文件

MVCC 的 undo 版本链数据也存储在 Buffer Pool 管理的页中（undo tablespace），读操作通过 `roll_pointer` 在内存中遍历版本链，无需加锁。

### 3.4 命中率监控

```sql
SHOW GLOBAL STATUS LIKE 'innodb%read%';
```

关键指标：

| 变量 | 含义 |
|------|------|
| `Innodb_buffer_pool_read_requests` | 从缓冲池读页次数 |
| `Innodb_buffer_pool_reads` | 从磁盘读页次数（未命中） |

**命中率** ≈ `1 - Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests`，InnoDB 建议 **≥ 99%**。

---

## 小结

| 机制 | 作用 |
|------|------|
| 意向锁 / 间隙锁 / 临键锁 | 行锁效率与 RR 幻读防护 |
| undo 版本链 | 保存历史版本，支撑 MVCC |
| Read View | RC/RR 快照读的可见性判定 |
| Buffer Pool | 内存页缓存，读写先走内存 + WAL |

下一篇进入 **InnoDB 日志体系**——redo log、binlog、undo log 如何配合实现 crash-safe 与主从复制。
