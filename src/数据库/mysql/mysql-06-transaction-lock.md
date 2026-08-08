---
title: "MySQL 事务隔离级别与锁机制"
sidebarGroup: "MySQL"
shortTitle: "06 事务与锁"
order: 6
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "ACID 属性、脏读/不可重复读/幻读、四种隔离级别实战演示，以及表锁、行锁、间隙锁与死锁排查。"
---

> **MySQL 系列 · 第 6/10 篇**  
> 上一篇：[《MySQL 索引优化实战（二）》](/数据库/mysql/mysql-05-index-opt-2)  
> 下一篇：[《MVCC 与 Buffer Pool 缓存机制》](/数据库/mysql/mysql-07-mvcc-bufferpool)

---

## 开头：并发事务到底会出什么问题？

数据库通常会并发执行多个事务，多个事务可能对同一批数据增删改查，由此引出**脏写、脏读、不可重复读、幻读**等问题。这些问题的本质是**多事务并发**，MySQL 用**事务隔离机制、锁机制、MVCC** 一整套方案来解决。本文聚焦**隔离级别与锁**；MVCC 底层原理见 [下一篇](/数据库/mysql/mysql-07-mvcc-bufferpool)。

---

## 一、事务及其 ACID 属性

事务是由一组 SQL 语句组成的逻辑处理单元，具有以下 4 个属性（ACID）：

| 属性 | 含义 |
|------|------|
| **原子性（Atomicity）** | 事务对数据的修改要么全部执行，要么全部不执行 |
| **一致性（Consistency）** | 事务开始和完成时数据保持一致，相关数据规则必须全部满足 |
| **隔离性（Isolation）** | 数据库提供隔离机制，事务在不受外部并发影响的「独立」环境中执行 |
| **持久性（Durability）** | 事务完成后对数据的修改是永久的，系统故障也不丢失 |

---

## 二、并发事务处理带来的问题

### 2.1 更新丢失（脏写）

两个或多个事务选择同一行，基于最初选定的值更新，由于互不知晓对方存在，**最后的更新覆盖**了其他事务的更新。

### 2.2 脏读（Dirty Reads）

事务 A 正在修改一条记录，尚未提交；事务 B 读取了这些「脏」数据并继续处理。若 B 回滚，A 基于脏数据的操作无效，**不符合一致性**。

### 2.3 不可重复读（Non-Repeatable Reads）

事务 A 读取数据后，再次读取同一数据，发现已被其他事务**修改或删除**，同一事务内两次读结果不一致，**不符合隔离性**。

### 2.4 幻读（Phantom Reads）

事务 A 按相同条件重新读取，发现其他事务**插入了满足条件的新行**。同样是同一事务内读结果不一致。

![事务隔离级别对比](/数据库/mysql-06-transaction-lock/p002-01.png)

---

## 三、事务隔离级别

「脏读」「不可重复读」「幻读」都是**读一致性问题**，需由数据库提供不同强度的事务隔离机制来解决。

隔离越严格，并发副作用越小，但代价越大——实质是让事务在一定程度上「串行化」，与「并发」存在矛盾。不同应用对一致性的要求不同：有的对幻读不敏感，更关心并发能力。

**查看与设置隔离级别：**

```sql
-- MySQL 8.0
SHOW VARIABLES LIKE '%isolation%';
SET SESSION transaction_isolation = 'REPEATABLE-READ';

-- MySQL 5.7（已弃用，8.0 仍兼容）
-- SET SESSION tx_isolation = 'REPEATABLE-READ';
```

MySQL **默认隔离级别为可重复读（REPEATABLE-READ）**。Spring 若不显式设置隔离级别，则沿用 MySQL 默认值；若 Spring 设置了，以 Spring 配置为准。

---

## 四、锁详解

锁是协调多个进程/线程并发访问资源的机制。数据也是一种共享资源，**锁冲突**是影响数据库并发性能的重要因素。

### 4.1 锁分类

| 维度 | 类型 | 说明 |
|------|------|------|
| 性能 | 乐观锁 / 悲观锁 | 乐观锁用版本号对比；悲观锁假定会冲突，先加锁 |
| 操作类型 | 读锁（S）/ 写锁（X） | S 锁共享；X 锁排他，阻断其他读写 |
| 粒度 | 表锁 / 行锁 | 表锁开销小、并发低；行锁粒度细、并发高 |

### 4.2 表锁（MyISAM 演示）

每次操作锁住整张表：开销小、加锁快、不会死锁，但锁冲突概率高、并发度低，适合整表迁移。

```sql
CREATE TABLE `mylock` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `NAME` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = MyISAM DEFAULT CHARSET = utf8;

INSERT INTO `mylock` (`id`, `NAME`) VALUES (1,'a'),(2,'b'),(3,'c'),(4,'d');

-- 手动加表锁
LOCK TABLE mylock READ;   -- 或 WRITE
SHOW OPEN TABLES;
UNLOCK TABLES;
```

**案例结论：**

- **读锁**：其他 session 可读，不可写；读锁释放后才允许写
- **写锁**：阻塞其他 session 对该表的读写

### 4.3 行锁（InnoDB）

每次操作锁住一行：开销大、加锁慢、可能死锁，但锁冲突概率最低、并发度最高。

InnoDB 与 MyISAM 最大区别：**支持事务**和**行级锁**。

- 一个 session 开启事务更新不提交，另一 session 更新**同一行**阻塞，**不同行**不阻塞
- MyISAM：`SELECT` 自动加读锁，`UPDATE/INSERT/DELETE` 加写锁
- InnoDB：非串行化隔离级别下 `SELECT` 不加锁；`UPDATE/INSERT/DELETE` 加行锁
- **读锁阻塞写、不阻塞读；写锁阻塞读和写**

---

## 五、行锁与事务隔离级别案例分析

```sql
CREATE TABLE `account` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `balance` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `account` (`name`, `balance`) VALUES ('lilei', 450);
INSERT INTO `account` (`name`, `balance`) VALUES ('hanmei', 16000);
INSERT INTO `account` (`name`, `balance`) VALUES ('lucy', 2400);
```

### 5.1 读未提交（READ UNCOMMITTED）

![读未提交步骤 1](/数据库/mysql-06-transaction-lock/p004-01.png)

客户端 A 设为 `read-uncommitted`，B 更新未提交时 A 即可读到 B 的数据（**脏读**）：

![读未提交脏读](/数据库/mysql-06-transaction-lock/p004-02.png)

若 B 回滚，A 读到的数据无效。A 再执行 `UPDATE account SET balance = balance - 50 WHERE id = 1`，lilei 的 balance 可能变成 400 而非 350——应用层 unaware 时会产生数据不一致：

![读未提交更新异常](/数据库/mysql-06-transaction-lock/p005-01.png)

### 5.2 读已提交（READ COMMITTED）

![读已提交设置](/数据库/mysql-06-transaction-lock/p006-01.png)

B 未提交时 A 读不到 B 的更新（解决脏读）；B 提交后 A 再次查询，结果与第一次不一致（**不可重复读**）：

![不可重复读](/数据库/mysql-06-transaction-lock/p007-01.png)

### 5.3 可重复读（REPEATABLE-READ，MySQL 默认）

![可重复读设置](/数据库/mysql-06-transaction-lock/p008-01.png)

A 在 RR 级别下，B 更新并提交后，A 再次 `SELECT` 结果与第一次一致（解决不可重复读）：

![可重复读查询一致](/数据库/mysql-06-transaction-lock/p008-02.png)

但 A 执行 `UPDATE account SET balance = balance - 50 WHERE id = 1` 时，用的是 B 已提交的 350 计算，结果为 300——**数据一致性未被破坏**，这是 MVCC 机制：`SELECT` 是快照读，`UPDATE` 是当前读。

![当前读与快照读](/数据库/mysql-06-transaction-lock/p009-01.png)

B 插入新行后，A 普通 `SELECT` 查不到（**普通 SELECT 无幻读**）；但 A 执行 `UPDATE account SET balance = 888 WHERE id = 4` 能更新成功并查到 B 新增数据——**当前读场景下仍可能「看到」幻行**：

![幻读验证](/数据库/mysql-06-transaction-lock/p009-02.png)

### 5.4 串行化（SERIALIZABLE）

![串行化](/数据库/mysql-06-transaction-lock/p010-01.png)

串行模式下 InnoDB 的查询也会加行锁。范围查询会锁住范围内所有行及**间隙**（间隙锁），其他 session 在该范围插入会被阻塞，从而避免幻读。并发性极低，开发中很少使用。

---

## 六、间隙锁与临键锁

**间隙锁（Gap Lock）** 锁的是两个值之间的空隙，仅在 **REPEATABLE-READ** 下生效，用于解决幻读。

假设 `account` 表 id 为 3、10、20，间隙为 (3,10)、(10,20)、(20,+∞)。Session_1 执行：

```sql
UPDATE account SET name = 'zhuge' WHERE id > 8 AND id < 18;
```

其他 Session 无法在 (3,20] 范围内插入或修改。

**临键锁（Next-Key Lock）** = 行锁 + 间隙锁，锁住 (3,20] 整个区间。

![间隙示意](/数据库/mysql-06-transaction-lock/p011-01.png)

### 无索引行锁升级为表锁

锁加在**索引**上。对非索引字段更新，行锁可能升级为表锁：

```sql
-- session1
UPDATE account SET balance = 800 WHERE name = 'lilei';
-- session2 对该表任一行操作都会阻塞
```

InnoDB 行锁针对**索引**而非记录本身；索引失效时 RR 级别会升级为表锁。

### 显式加锁

```sql
SELECT * FROM test_innodb_lock WHERE a = 2 LOCK IN SHARE MODE;  -- 共享锁
SELECT * FROM test_innodb_lock WHERE a = 2 FOR UPDATE;           -- 排他锁
```

其他 session 可读共享锁行，修改则被阻塞，直到锁定 session 提交。

---

## 七、行锁分析与死锁

### 7.1 行锁状态变量

```sql
SHOW STATUS LIKE 'innodb_row_lock%';
```

| 变量 | 含义 |
|------|------|
| `Innodb_row_lock_current_waits` | 当前等待锁定的数量 |
| `Innodb_row_lock_time` | 锁定总时间 |
| `Innodb_row_lock_time_avg` | 每次等待平均时间 |
| `Innodb_row_lock_time_max` | 最长一次等待时间 |
| `Innodb_row_lock_waits` | 总等待次数 |

重点关注 `time_avg`、`waits`、`time`——等待次数高且耗时长时需分析原因并优化。

### 7.2 锁相关系统表

```sql
-- 查看事务
SELECT * FROM INFORMATION_SCHEMA.INNODB_TRX;

-- 查看锁（8.0+ 改用 performance_schema.data_locks）
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCKS;

-- 查看锁等待（8.0+ 改用 performance_schema.data_lock_waits）
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCK_WAITS;

-- 释放锁
KILL trx_mysql_thread_id;

-- 详细信息
SHOW ENGINE INNODB STATUS\G;
```

### 7.3 死锁示例

```sql
SET SESSION transaction_isolation = 'REPEATABLE-READ';

-- Session_1
SELECT * FROM account WHERE id = 1 FOR UPDATE;
SELECT * FROM account WHERE id = 2 FOR UPDATE;

-- Session_2（交叉加锁）
SELECT * FROM account WHERE id = 2 FOR UPDATE;
SELECT * FROM account WHERE id = 1 FOR UPDATE;
```

查看死锁日志：`SHOW ENGINE INNODB STATUS\G;`

MySQL 多数情况能自动检测死锁并回滚其中一个事务；少数情况需手动 `KILL`。

---

## 八、锁优化建议

1. 尽量让检索走索引，避免无索引行锁升级为表锁
2. 合理设计索引，缩小锁范围
3. 减少检索条件范围，避免不必要的间隙锁
4. 控制事务大小，涉及加锁的 SQL 尽量放在事务末尾
5. 在业务允许时使用较低隔离级别

---

## 小结

| 主题 | 要点 |
|------|------|
| 并发问题 | 脏写、脏读、不可重复读、幻读 |
| 隔离级别 | RU / RC / RR（默认）/ Serializable |
| 锁类型 | 表锁、行锁、间隙锁、临键锁 |
| InnoDB | 行锁依赖索引；RR 下 MVCC + 间隙锁 |
| 排查 | `innodb_row_lock%`、`INNODB_TRX`、死锁日志 |

下一篇深入 **MVCC 可见性算法** 与 **Buffer Pool** 如何配合实现 RR 隔离。
