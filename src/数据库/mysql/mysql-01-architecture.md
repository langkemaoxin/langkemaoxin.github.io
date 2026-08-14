---
title: "全面理解 MySQL 架构"
sidebarGroup: "MySQL"
shortTitle: "01 MySQL 架构"
order: 1
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "从 Server 层与存储引擎层入手，梳理一条 SQL 查询与更新的完整执行路径，以及 redo log 与 binlog 的两阶段提交。"
---

> **MySQL 系列 · 第 1/10 篇**  
> 下一篇：[《MySQL 索引底层数据结构与算法》](/数据库/mysql/mysql-02-index-structure)

---

## 开头：先鸟瞰，再下钻

日常写 SQL，你往往只看到「输入一条语句，返回一个结果」。但 MySQL 内部经历了连接、解析、优化、执行、存储引擎读写等一系列步骤。理解这条链路，是后续索引优化、事务与锁、主从复制的基础。

本篇建立 **MySQL 全景地图**：Server 层与存储引擎层的分工、查询与更新的执行流程、redo log 与 binlog 为何并存，以及两阶段提交如何保证数据一致。

---

## 一、MySQL 怎么学

MySQL 专题可按两条线推进：

| 阶段 | 主题 |
|------|------|
| **基础** | 架构 → 索引底层 → Explain → 索引优化实战 |
| **进阶** | 事务与锁 → MVCC 与 Buffer Pool → 日志机制 → 8.0 特性 → 集群与高可用 |

官方文档始终是权威参考：[MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)。

---

## 二、一条 SQL 查询是如何执行的

```sql
mysql> SELECT * FROM user WHERE id = 10;
```

Navicat、JDBC 等工具都属于 **MySQL 客户端（Client）**，负责把 SQL 请求发送到服务端。

### 2.1 整体架构

MySQL 服务端大体分为 **Server 层** 和 **存储引擎层**：

![MySQL 基本架构：Client → Server 层 → 存储引擎层](/数据库/mysql-01-architecture/p002-01.png)

| 层次 | 职责 |
|------|------|
| **Server 层** | 连接器、查询缓存（8.0 已移除）、分析器、优化器、执行器；内置函数、视图、存储过程、跨引擎能力；**binlog** 归档日志 |
| **存储引擎层** | 数据的存储与检索；插件式架构，支持 InnoDB、MyISAM、Memory 等；**InnoDB** 自 5.5.5 起为默认引擎 |

建表不指定引擎时默认 InnoDB，也可显式指定：

```sql
CREATE TABLE t (...) ENGINE=InnoDB;
CREATE TABLE t_mem (...) ENGINE=MEMORY;
```

### 2.2 连接器

连接命令：

```bash
mysql -h$ip -P$port -u$user -p
```

TCP 握手完成后，连接器用用户名和密码做身份认证。通过后从权限表读取该连接拥有的权限——**此后本连接内的权限判断都依赖此时读到的权限**，不会因为中途改权限而立即生效。

**长连接 vs 短连接**

- **长连接**：连接建立后持续复用，减少握手开销；但连接内临时内存等资源要到断开才释放，大量长连接可能导致 OOM。
- **短连接**：每次查询完就断开，频繁建连成本高。

生产环境通常用 **连接池** 管理长连接。应对内存膨胀：

```sql
-- 查看连接状态
SHOW PROCESSLIST;
SHOW VARIABLES LIKE 'wait_timeout';  -- 默认 8 小时无活动则断开

-- MySQL 5.7+：大查询后重置连接状态，不必重连
mysql_reset_connection();
```

### 2.3 查询缓存（MySQL 8.0 已移除）

MySQL 5.7 及以前，Server 层会先查 **query cache**：以 SQL 文本为 key，命中则直接返回缓存结果。

**为何多数场景不建议开启**：更新压力大的库，缓存命中率极低——表一有更新，相关缓存全部失效。MySQL 8.0 直接移除了整块 query cache 功能。

若仍在 5.7 环境，可按需关闭或设为 `DEMAND` 模式，仅对带 `SQL_CACHE` 提示的语句缓存。

### 2.4 分析器

缓存未命中（或 8.0 无缓存）后进入 **分析器**，做两件事：

1. **词法分析**：识别关键字、表名、列名等。
2. **语法分析**：判断 SQL 是否符合 MySQL 语法。

语法错误时返回 `You have an error in your SQL syntax`，并指出 `use near` 附近的位置。

**思考题**：表 T 没有列 k，执行 `SELECT * FROM T WHERE k = 1` 报 `Unknown column 'k' in 'where clause'`，是在哪个阶段？

> 答案：**分析器**的语法/语义分析阶段——词法分析能识别 k 是列名，但 information_schema 里找不到该列。

### 2.5 优化器

分析通过后，**优化器**决定执行方案：选哪个索引、多表 JOIN 的连接顺序等。

```sql
-- 两种逻辑等价、效率可能不同的 JOIN 顺序
SELECT * FROM t1 JOIN t2 USING(ID) WHERE t1.c = 10 AND t2.d = 20;
```

若 t1 很大、t2 很小，优化器可能先从 t2 筛 d=20，再用 ID 关联 t1，减少扫描量。

### 2.6 执行器

优化器确定方案后，**执行器**开始执行：

1. 检查对该表是否有查询权限（无权限则 `SELECT command denied`）。
2. 打开表，调用存储引擎接口逐行读取、判断条件、组装结果集返回客户端。

**权限检查时机**

- 命中 query cache 时，在返回结果前做权限验证。
- 分析器做 **precheck**（能否访问库/表），但触发器等运行时才能确定的表，要在执行器阶段再校验。

![Select 执行流程概览](/数据库/mysql-01-architecture/p003-01.png)

---

## 三、一条 SQL 更新是如何执行的

```sql
CREATE TABLE T(ID INT PRIMARY KEY, c INT);
UPDATE T SET c = c + 1 WHERE ID = 2;
```

更新语句同样走连接 → 分析 → 优化 → 执行；与查询不同的是，还涉及 **redo log** 和 **binlog** 两套日志。

### 3.1 更新流程概览

1. 连接器建立连接。
2. 表有更新时，该表 query cache 全部失效（5.7）。
3. 分析器识别为 UPDATE。
4. 优化器决定使用 ID 索引。
5. 执行器调用引擎接口找到 ID=2 的行并更新。
6. 引擎把变更写入 **redo log**（prepare 状态），再写 **binlog**，最后 redo log 改为 commit。

![UPDATE 执行流程](/数据库/mysql-01-architecture/p013-01.png)

### 3.2 redo log：InnoDB 的「粉板」

若每次更新都直接写磁盘，随机 IO 成本极高。InnoDB 采用 **WAL（Write-Ahead Logging）**：**先写日志，再写磁盘**。

类比：掌柜先在粉板上记赊账，打烊后再入账本。更新时先把记录写到 redo log 并更新内存（Buffer Pool），更新即算完成；空闲时再刷盘。

redo log 是 **固定大小、循环写** 的文件组（如 4 个 1GB 文件）：

![redo log 循环写入：write pos 与 checkpoint](/数据库/mysql-01-architecture/p010-01.png)

- **write pos**：当前写入位置，顺时针推进。
- **checkpoint**：当前要擦除（刷盘）的位置。
- 两者之间是可用空间；write pos 追上 checkpoint 时，必须暂停新写入，先推进 checkpoint。

有了 redo log，InnoDB 具备 **crash-safe** 能力：异常重启后仍可通过 redo log 恢复已提交的数据。

### 3.3 binlog：Server 层的「归档日志」

**binlog** 属于 Server 层，所有引擎都可使用，记录逻辑变更（如「给 ID=2 的 c 加 1」），用于 **主从复制** 和 **按时间点恢复**。

| 对比项 | redo log | binlog |
|--------|----------|--------|
| 归属 | InnoDB 引擎特有 | Server 层，全引擎 |
| 内容 | 物理日志（数据页上的修改） | 逻辑日志（SQL 或行变更） |
| 写入方式 | 循环写，空间有限 | 追加写，可切换文件 |

**为何有两套日志？** 历史原因：MySQL 自带 MyISAM 不支持 crash-safe；InnoDB 以插件形式引入，需 redo log 保证崩溃恢复，binlog 则承担复制与归档。

### 3.4 误删数据如何恢复

假设中午 12 点误删了表，下午才发现：

1. 找最近一次 **全量备份**（如昨晚）。
2. 恢复到临时库。
3. 从备份时间点起，依次重放 **binlog**，直到误删前一刻。
4. 把临时库数据导回线上。

相关参数建议设为 1，保证持久化：

```sql
-- redo log 每次事务提交都刷盘
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
-- binlog 每次事务提交都刷盘
SET GLOBAL sync_binlog = 1;
```

---

## 四、两阶段提交

redo log 与 binlog 是两套独立逻辑。若只写其中一个就 crash，用 binlog 恢复的库可能与原库不一致。

以 `UPDATE T SET c = c + 1 WHERE ID = 2`（c 原值为 0）为例：

| 场景 | 后果 |
|------|------|
| 先写 redo、binlog 未写完就 crash | redo 恢复后 c=1，但 binlog 无此记录，从库/备份恢复得到 c=0 |
| 先写 binlog、redo 未写完就 crash | binlog 有 c→1，redo 回滚后 c=0，恢复出来却是 c=1 |

因此 InnoDB 采用 **两阶段提交（内部 XA）**：

1. 写 redo log，状态 **prepare**。
2. 写 binlog。
3. 调用引擎提交，redo log 改为 **commit**。

![两阶段提交时序](/数据库/mysql-01-architecture/p011-01.png)

**崩溃恢复规则**

- redo 有 **commit** 标识 → 直接提交。
- redo 只有 **prepare** → 用 XID 去 binlog 找对应事务；binlog 完整则提交，否则回滚。

**redo log buffer**：事务中多次写日志先放在内存 buffer，**commit 时**才刷到 ib_logfile 文件。

---

## 小结

| 模块 | 查询路径中的作用 |
|------|------------------|
| 连接器 | 认证、权限、连接管理 |
| 查询缓存 | 5.7 可选；8.0 已删除 |
| 分析器 | 词法、语法分析 |
| 优化器 | 执行计划、索引与 JOIN 顺序 |
| 执行器 | 权限、调用引擎接口 |
| InnoDB | 数据页读写、redo log |
| binlog | 复制与时间点恢复 |

下一篇进入 **索引底层**：B+ 树为何成为 InnoDB 默认选择，聚簇索引与二级索引如何组织数据。

---

**系列导航**

- 下一篇：[MySQL 索引底层数据结构与算法](/数据库/mysql/mysql-02-index-structure)
