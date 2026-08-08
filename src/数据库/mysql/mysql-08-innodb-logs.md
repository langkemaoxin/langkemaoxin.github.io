---
title: "InnoDB 底层原理与 MySQL 日志机制"
sidebarGroup: "MySQL"
shortTitle: "08 InnoDB 与日志"
order: 8
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "MySQL Server 层组件、redo log 与 binlog 写入策略、undo log 与 MVCC，以及 binlog 数据恢复实战。"
---

> **MySQL 系列 · 第 8/10 篇**  
> 上一篇：[《MVCC 与 Buffer Pool 缓存机制》](/数据库/mysql/mysql-07-mvcc-bufferpool)  
> 下一篇：[《MySQL 全局优化与 8.0 新特性》](/数据库/mysql/mysql-09-mysql8-features)

---

## 开头：一条 UPDATE 在 MySQL 内部走了哪些步骤？

[上一篇](/数据库/mysql/mysql-07-mvcc-bufferpool) 介绍了 Buffer Pool 与 MVCC；本文从 **MySQL 内部组件** 出发，深入 **redo log、binlog、undo log** 三套日志如何配合，实现 crash-safe 与数据恢复。

---

## 一、MySQL 内部组件结构

MySQL 分为 **Server 层** 和 **存储引擎层**：

![MySQL 内部组件](/数据库/mysql-08-innodb-logs/p001-01.png)

| 层次 | 组件 | 职责 |
|------|------|------|
| **Server 层** | 连接器、查询缓存、分析器、优化器、执行器 | 跨引擎功能：存储过程、触发器、视图等 |
| **存储引擎层** | InnoDB、MyISAM、Memory 等 | 数据存储与提取；InnoDB 自 5.5.5 起为默认引擎 |

### 1.1 连接器

负责与客户端建立连接、认证、维持和管理连接：

```bash
mysql -h host -u root -p -P 3306
```

TCP 握手后验证用户名密码，从权限表读取权限。**已建立连接的权限不受后续账号变更影响**，只有新连接才用新权限。

### 1.2 查询缓存（8.0 已移除）

连接建立后执行 `SELECT`，MySQL 先查查询缓存（key 为 SQL，value 为结果）。命中则直接返回。

**大多数场景查询缓存弊大于利**：任一表更新会清空该表所有缓存。MySQL 8.0 **已移除**查询缓存功能。MySQL 5.7 可通过 `query_cache_type=DEMAND` 按需启用，仅适合极少更新的静态表。

### 1.3 分析器

未命中缓存时，先做**词法分析**（识别关键字、表名、列名），再做**语法分析**（判断 SQL 是否合法）：

![分析器处理步骤](/数据库/mysql-08-innodb-logs/p003-01.png)

分析完成后生成**语法树**：

![SQL 语法树](/数据库/mysql-08-innodb-logs/p003-02.png)

### 1.4 优化器

决定使用哪个索引、多表 JOIN 的连接顺序，以及 MySQL 内部优化策略。

### 1.5 执行器

检查权限后，调用存储引擎接口执行。InnoDB 在此层与 Buffer Pool、日志系统交互。

![优化器与执行器](/数据库/mysql-08-innodb-logs/p004-01.png)

---

## 二、redo log 重做日志

redo log 保证 **InnoDB crash-safe**：异常重启后已提交事务不丢失。

### 2.1 关键参数

```sql
SHOW VARIABLES LIKE '%innodb_log_buffer_size%';      -- 默认 16M
SHOW VARIABLES LIKE '%innodb_log_group_home_dir%';   -- redo 文件目录
SHOW VARIABLES LIKE '%innodb_log_files_in_group%';   -- 文件个数，默认 2
SHOW VARIABLES LIKE '%innodb_log_file_size%';        -- 单文件大小，默认 48M
```

### 2.2 循环写入

redo log 从头写，写满最后一个文件后回到第一个文件循环：

![redo log 循环写入](/数据库/mysql-08-innodb-logs/p005-01.png)

- **write pos**：当前写入位置，向后移动
- **checkpoint**：当前擦除位置，擦除前需把记录更新到数据文件
- write pos 追上 checkpoint → redo log 写满，需先推进 checkpoint

### 2.3 写入策略

`innodb_flush_log_at_trx_commit` 控制 redo 持久化策略：

| 值 | 行为 | 安全性 / 性能 |
|----|------|---------------|
| **0** | 事务提交只写 redo buffer，由后台线程每秒 write + fsync | 可能丢数据；性能最好 |
| **1（默认，推荐）** | 每次提交直接 fsync 到磁盘 | 最安全；线上推荐 |
| **2** | 每次提交 write 到 OS page cache，不 fsync | OS 宕机可能丢数据 |

![redo log 写入策略](/数据库/mysql-08-innodb-logs/p006-01.png)

InnoDB 后台线程每隔 1 秒将 redo log buffer 通过 `write` 写到 page cache，再 `fsync` 持久化。

```sql
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
```

---

## 三、binlog 二进制归档日志

binlog 记录**所有修改操作**（不含查询），用于**排查、恢复、主从复制**。MySQL 5.7 默认关闭，**8.0 默认开启**。

### 3.1 开启 binlog

```ini
[mysqld]
log-bin=mysql-binlog
server-id=1
binlog_format=row
expire_logs_days=15          ; 8.0 改用 binlog_expire_logs_seconds
max_binlog_size=200M
```

重启后 data 目录出现 binlog 文件及索引文件：

![binlog 文件](/数据库/mysql-08-innodb-logs/p007-01.png)

```sql
SHOW BINARY LOGS;
SHOW VARIABLES LIKE '%log_bin%';
```

| 参数 | 含义 |
|------|------|
| `log_bin` | 是否开启 |
| `log_bin_basename` | 基本文件名 |
| `log_bin_index` | 索引文件 |
| `sql_log_bin` | 当前 session 是否写入 binlog（OFF 可模拟复制异常） |

### 3.2 binlog 格式

| 格式 | 说明 |
|------|------|
| **STATEMENT** | 记录 SQL 语句，日志量小；函数如 UUID() 可能导致主从不一致 |
| **ROW** | 记录每行变更细节，日志量大；解决函数/存储过程复制问题 |
| **MIXED** | 按 SQL 自动选择，**推荐** |

### 3.3 写入磁盘机制

`sync_binlog` 控制 binlog 刷盘（默认 0）：

| 值 | 行为 |
|----|------|
| **0** | 每次提交 write 到 page cache，由 OS 决定 fsync |
| **1** | 每次提交 fsync，最安全 |
| **N>1** | 累积 N 个事务后 fsync |

binlog 重新生成的时机：服务器启动/重启、`FLUSH LOGS`、文件达 `max_binlog_size`、删除 binlog。

```sql
RESET MASTER;
PURGE MASTER LOGS TO 'mysql-binlog.000006';
PURGE MASTER LOGS BEFORE '2023-01-21 14:00:00';
```

### 3.4 查看 binlog

```bash
mysqlbinlog --no-defaults -v --base64-output=decode-rows \
  /path/to/mysql-binlog.000007
```

ROW 格式下可看到伪 SQL（如 `UPDATE test.account SET @3=2000 WHERE @1=1`）。

### 3.5 binlog 数据恢复实战

```sql
FLUSH LOGS;
INSERT INTO `test`.`account` VALUES (4, 'zhuge', 666);
INSERT INTO `test`.`account` VALUES (5, 'zhuge1', 888);
-- 误操作
DELETE FROM account WHERE id > 3;
```

查看 binlog 找到 INSERT 的 BEGIN/COMMIT 位置标识（at 219 ~ at 701），按位置回放：

```bash
mysqlbinlog --no-defaults --start-position=219 --stop-position=701 \
  --database=test /path/to/mysql-binlog.000009 \
  | mysql -uroot -p -v test
```

也可按时间范围恢复。生产环境推荐 **每日全量备份 + 备份时间点之后的 binlog** 组合恢复；`mysqldump` 做全量：

```bash
mysqldump -u root dbname > backup.sql
mysql -u root dbname < backup.sql
```

---

## 四、为什么需要 redo log 和 binlog 两份日志？

早期 MySQL 自带 MyISAM，**无 crash-safe 能力**，binlog 只能归档。InnoDB 作为插件引入后，单靠 binlog 无法保证崩溃恢复，因此引入 **redo log** 实现 crash-safe。

| 日志 | 层级 | 作用 |
|------|------|------|
| **redo log** | InnoDB 引擎 | 物理日志，保证已提交事务不丢 |
| **binlog** | Server 层 | 逻辑日志，归档 + 主从复制 |

两者配合构成 **两阶段提交（2PC）**，保证 redo 与 binlog 一致——这是 [主从复制篇](/数据库/mysql/mysql-10-replication-ha) 的基础。

![redo 与 binlog 协作](/数据库/mysql-08-innodb-logs/p006-02.png)

---

## 五、undo log 回滚日志

undo log 支撑 **事务回滚** 与 **MVCC**（见 [第 7 篇](/数据库/mysql/mysql-07-mvcc-bufferpool)）。

InnoDB 用**回滚段（rollback segment）**管理 undo log，每个段 1024 个 undo log segment：

- MySQL 5.5：1 个回滚段，最多 1024 并发事务
- MySQL 5.6+：最多 128 个回滚段，约 128×1024 并发

```sql
-- innodb_undo_directory：undo 文件路径
-- innodb_undo_logs：回滚段个数，默认 128
-- innodb_undo_tablespaces：undo 文件数量
```

**undo 何时删除：**

- **INSERT**：事务提交后可清除
- **UPDATE/DELETE**：提交后不能立即清除，需保留供 MVCC；无事务引用该版本时才清除

---

## 六、为什么不直接更新磁盘？

随机读写磁盘性能差，无法抗高并发。InnoDB 机制：

1. 更新先写内存 **Buffer Pool**
2. **顺序写** redo log
3. 保证各种异常下数据一致

内存更新 + 顺序写日志的性能远高于随机写磁盘——这是 MySQL 高并发的基石。

---

## 七、其他日志

### 7.1 错误日志

记录启动、停止及严重错误，**默认开启且无法关闭**：

```sql
SHOW VARIABLES LIKE '%log_error%';
```

### 7.2 通用查询日志

记录所有用户操作（含 SELECT），用于还原操作场景。默认 **OFF**（消耗资源）：

```sql
SHOW VARIABLES LIKE '%general_log%';
SET GLOBAL general_log = ON;
```

---

## 小结

| 日志 | 层级 | 核心作用 |
|------|------|----------|
| redo log | InnoDB | crash-safe，WAL |
| binlog | Server | 归档、恢复、复制 |
| undo log | InnoDB | 回滚、MVCC 版本链 |
| 错误 / 通用日志 | Server | 排障、审计 |

下一篇进入 **MySQL 全局参数调优** 与 **8.0 新特性**。
