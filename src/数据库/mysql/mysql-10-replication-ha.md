---
title: "MySQL 8.0 主从复制与高可用集群"
sidebarGroup: "MySQL"
shortTitle: "10 主从与高可用"
order: 10
date: 2026-09-04
category: "数据库"
tag:
  - "数据库"
  - "MySQL"
description: "异步/半同步/GTID 主从复制实战，Group Replication 组复制，以及 InnoDB Cluster 与 ReplicaSet 高可用架构部署。"
---

> **MySQL 系列 · 第 10/10 篇（终章）**  
> 上一篇：[《MySQL 全局优化与 8.0 新特性》](/数据库/mysql/mysql-09-mysql8-features)

---

## 开头：从单机到高可用，MySQL 复制是第一步

MySQL **Replication（复制）** 是官方主从同步方案，使用最广泛的容灾手段。本文合并**主从复制原理与实战**和**高可用集群架构**两部分内容，按「传统复制 → GTID → 组复制 → InnoDB Cluster」递进，帮你建立完整的 MySQL 高可用知识体系。

前置阅读：[binlog 机制](/数据库/mysql/mysql-08-innodb-logs)、[全局参数调优](/数据库/mysql/mysql-09-mysql8-features)。

---

# 第一部分：MySQL 主从复制

## 一、复制概述

Replication 使 Source（源，旧称 Master）的数据复制到一个或多个 Replica（副本，旧称 Slave）。默认**异步**——副本无需永久连接即可接收更新。可配置复制全部库、指定库或指定表。

![复制架构概览](/数据库/mysql-10-replication-ha/p001-01.png)

### 1.1 优势

| 优势 | 说明 |
|------|------|
| **高可用** | 跨主机数据复制；多副本/级联复制提升可用性 |
| **性能扩展** | 读请求分发至副本，读写分离 |
| **异地灾备** | 副本部署到异地机房（需考虑网络延迟） |
| **交易分离** | 低频大运算量交易发副本，避免与高频交易争资源 |

### 1.2 缺点

- **无自动故障转移**，易造成单点故障
- **主从延迟**，可能导致数据最终不一致
- **从库过多**加重主库负载和网络带宽

### 1.3 应用场景

电子商务平台读写分离、社交网络快速读取、监控系统分布式存储、金融数据备份与高可用、新闻网站高并发访问。

---

## 二、复制方式与同步类型

### 2.1 两种复制方式

**基于 binlog 位点**：同步 binlog 文件名与 position，传统方法。

```sql
SHOW BINARY LOGS;
SHOW BINLOG EVENTS IN 'binlog.000003';
```

**基于 GTID**：全局事务标识符，完全基于事务，易判断主从一致。

### 2.2 同步类型

| 类型 | 说明 |
|------|------|
| **异步复制（默认）** | 主库提交不等从库确认 |
| **半同步复制** | 至少一个副本确认后才返回客户端 |
| **延迟复制** | 副本故意落后源至少指定时间 |

![异步复制时序](/数据库/mysql-10-replication-ha/p003-01.png)

**异步复制流程：**

1. 主库写 Binlog → 提交事务 → 返回客户端
2. 从库 I/O 线程接收 Binlog → 写 relay log → 返回确认
3. 从库 SQL 线程读 relay log → 回放更新

两流程在不同线程，**互不等待**——优势是性能，劣势是主从延迟和宕机可能丢数据。

![半同步复制时序](/数据库/mysql-10-replication-ha/p004-01.png)

**半同步复制（5.7+）：**

- 主库在**提交前（AFTER_SYNC，默认）**或提交后（AFTER_COMMIT）等待至少 N 个从库确认
- 从库写入 relay log 并刷盘后才响应
- 从库超时后主库退化为异步；从库恢复后恢复半同步

关键参数（8.0.26+ 改名）：

| 旧名 | 新名 | 含义 |
|------|------|------|
| `rpl_semi_sync_master_wait_slave_count` | `rpl_semi_sync_source_wait_for_replica_count` | 至少等待几个从库 |
| `rpl_semi_sync_master_wait_point` | `rpl_semi_sync_source_wait_point` | AFTER_SYNC / AFTER_COMMIT |

---

## 三、复制状态机理念

几乎所有分布式存储都用同一套模型：**快照 + 操作日志**。

- **状态**：MySQL 中的数据
- **Snapshot**：全量备份
- **Commit Log / Binlog**：顺序记录每次更新

基于快照 + 顺序回放操作日志，从节点可得到与主节点一致的状态。Redis Cluster 的 Snapshot + backlog、Elasticsearch 的 translog，原理相同。

![复制状态机](/数据库/mysql-10-replication-ha/p005-01.png)

复制策略对比：

| 策略 | 特点 |
|------|------|
| 异步 | 性能最好；可能丢数据 |
| 半同步 | 性能、可用性、可靠性平衡；多数系统默认 |

---

## 四、基于 binlog 位点的异步复制实战

### 4.1 架构规划

| 角色 | server_id | 端口 |
|------|-----------|------|
| mysql-source（主） | 10 | 3307 |
| mysql-replica1 | 11 | 3308 |
| mysql-replica2 | 12 | 3309 |

![binlog 位点复制原理](/数据库/mysql-10-replication-ha/p006-01.png)

**七步流程：**

1. 主库生成多个 binlog 文件
2. 从库 I/O 线程请求指定位点
3. 主库 dump 线程读取 binlog
4. 推送 binlog 给从库
5. 从库写入 relay log
6. 从库 SQL 线程解析 relay log
7. SQL 线程重放命令

### 4.2 主库配置要点

```ini
[mysqld]
server-id=10
log-bin=mysql-bin
max_connections=1000
default-time_zone='+8:00'
lower_case_table_names=1
```

Docker 部署时创建专用网络，挂载 data/conf/log 目录。

### 4.3 配置复制

**主库创建复制用户：**

```sql
CREATE USER 'fox'@'%' IDENTIFIED WITH mysql_native_password BY '123456';
GRANT REPLICATION SLAVE ON *.* TO 'fox'@'%';
FLUSH PRIVILEGES;
```

**查看主库位点：**

```sql
SHOW MASTER STATUS;
-- File: mysql-bin.000003, Position: 1273
```

**从库设置主库信息（8.0.23+）：**

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.65.185',
  SOURCE_USER='fox',
  SOURCE_PASSWORD='123456',
  SOURCE_PORT=3307,
  SOURCE_LOG_FILE='mysql-bin.000003',
  SOURCE_LOG_POS=1273,
  SOURCE_CONNECT_RETRY=30;

START REPLICA;
SHOW REPLICA STATUS\G;
```

![从库状态](/数据库/mysql-10-replication-ha/p014-01.png)

看到 `Replica_SQL_Running_State: Replica has read all relay log; waiting for more updates` 表示复制正常。

**8.0.23 之前**用 `CHANGE MASTER TO` / `START SLAVE` / `SHOW SLAVE STATUS`。

### 4.4 测试主从复制

在主库执行建表插入，从库验证数据同步。

---

## 五、半同步复制实战

### 5.1 安装插件

```sql
-- 主库（8.0.26+）
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';

-- 从库
INSTALL PLUGIN rpl_semi_sync_replica SONAME 'semisync_replica.so';

SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS WHERE PLUGIN_NAME LIKE '%semi%';
```

### 5.2 开启半同步

```sql
-- 主库
SET GLOBAL rpl_semi_sync_source_enabled = 1;

-- 从库
SET GLOBAL rpl_semi_sync_replica_enabled = 1;
STOP REPLICA IO_THREAD;
START REPLICA IO_THREAD;
```

![半同步插件状态](/数据库/mysql-10-replication-ha/p016-01.png)

### 5.3 超时退化测试

```sql
SET GLOBAL rpl_semi_sync_source_wait_for_replica_count = 2;
SET GLOBAL rpl_semi_sync_source_timeout = 100000;

-- 停掉 replica2，观察主库退化为异步
-- 恢复 replica2 并重启 IO 线程，观察恢复半同步
```

![半同步退化与恢复](/数据库/mysql-10-replication-ha/p017-01.png)

---

## 六、GTID 复制

### 6.1 位点复制的痛点

- 首次开启：找位点、设位点、开线程——步骤复杂易错
- 故障恢复：找停止位点、跳过错误（`slave_skip_errors=1032,1062`）
- 主从切换：计算 log_pos 繁琐

MySQL 5.6 引入 **GTID** 彻底解决。

### 6.2 GTID 结构与优势

```
GTID = source_id:transaction_id
例：3E11FA47-71CA-11E1-9E33-C80AA9429562:23
```

- `source_id`：源服务器 UUID（server_uuid）
- `transaction_id`：提交顺序序列号（上限 2^63-1）

GTID 集合示例：

```
3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5
3E11FA47-71CA-11E1-9E33-C80AA9429562:1-3:11:47-49
```

![GTID 格式](/数据库/mysql-10-replication-ha/p021-01.png)

**优势：**

- 更简单的 failover，不用找 log_file + log_pos
- 更简单的搭建主从
- GTID 连续无空洞，零丢失
- 更安全

GTID 存储在 `mysql.gtid_executed` 表。

### 6.3 GTID 工作原理

![GTID 同步流程](/数据库/mysql-10-replication-ha/p021-02.png)

1. 从库 B 连接主库 A
2. B 发送自身 GTID 集合 y 给 A
3. A 计算 x 与 y 的**差集**（x 有 y 没有的 GTID）
4. 若 x 不包含 y 的全部 GTID → A 返回错误（binlog 被删）
5. A 从第一个不在 y 中的 GTID 开始顺序发送 binlog
6. B 的 I/O 线程写 relay log，SQL 线程执行

**与位点复制的区别：** GTID 由主库自动计算位点，无需人工指定。

### 6.4 GTID 配置与实战

**主从库配置：**

```ini
gtid_mode=ON
enforce_gtid_consistency=ON
```

**从库设置（8.0.23+）：**

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.65.185',
  SOURCE_USER='fox',
  SOURCE_PASSWORD='123456',
  SOURCE_PORT=3307,
  SOURCE_AUTO_POSITION=1;

START REPLICA;
SET GLOBAL read_only = OFF;
SHOW REPLICA STATUS\G;
```

![GTID 复制状态](/数据库/mysql-10-replication-ha/p023-01.png)

### 6.5 主从切换演练

**场景 1：主库宕机，从库 1 同步完成、从库 2 未完成**

```sql
-- 从库 2 停止复制
STOP REPLICA;
-- 主库插入数据
INSERT INTO test.user VALUES (12, 'fox', NULL, NULL, NULL);
```

从库 1 有最新数据，从库 2 落后。

**场景 2：从库 1 升主，从库 2 切换新主**

```sql
-- 停主库
docker stop mysql-source

-- replica1 创建复制用户
CREATE USER 'fox'@'%' IDENTIFIED WITH mysql_native_password BY '123456';
GRANT REPLICATION SLAVE ON *.* TO 'fox'@'%';

-- replica2 指向 replica1（GTID 自动定位）
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.65.185', SOURCE_PORT=3308,
  SOURCE_USER='fox', SOURCE_PASSWORD='123456',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
```

![主从切换](/数据库/mysql-10-replication-ha/p025-01.png)

**场景 3：从库误删表，主库继续写入**

从库删除 `test.user` 表后，主库 INSERT 导致复制报错：

```
Coordinator stopped because there were error(s) in the worker(s).
Worker failed executing transaction 'aac92b21-...:6'
```

**修复：** 从主库拷贝表数据到从库，跳过错误 GTID：

```sql
STOP REPLICA;
SET @@SESSION.GTID_NEXT = 'aac92b21-b6a4-11ee-bab5-0242ac120002:7';
BEGIN; COMMIT;
SET SESSION GTID_NEXT = AUTOMATIC;
START REPLICA;
```

![GTID 错误修复](/数据库/mysql-10-replication-ha/p029-01.png)

---

# 第二部分：Group Replication 组复制

## 七、什么是组复制（MGR）

MySQL 5.7.17 推出 **MySQL Group Replication（MGR）**，增强 GTID 复制，支持**单主**和**多主**模式。3 节点集群允许 1 台宕机仍可用（大多数原则）。

![MGR 概述](/数据库/mysql-10-replication-ha/p030-01.png)

Group Replication 提供**分布式状态机复制**，服务器之间强协调：

| 模式 | 说明 |
|------|------|
| **单主（默认）** | 一次只有一台接受写；其余只读（`super_read_only=ON`） |
| **多主** | 所有兼容成员可接受并发写 |

**相比传统复制的改进：**

- 基于 **Paxos 协议**传输，保证一致性和原子性
- 多写方案，为多活提供可能
- 自动选主（单主模式）

**局限：** MGR 保证服务连续可用，但客户端连接不可用的成员需通过 **MySQL Router** 等中间件重定向——MGR 本身不提供连接路由。

### 7.1 查找 Primary

```sql
SELECT MEMBER_HOST, MEMBER_ROLE
FROM performance_schema.replication_group_members;

SHOW STATUS LIKE 'group_replication_primary_member';
```

![MGR 单主模式](/数据库/mysql-10-replication-ha/p031-01.png)

---

## 八、MGR 单主模式部署

| 节点 | server_id | 端口 | 内部通信 |
|------|-----------|------|----------|
| mgr-node1 (Primary) | 1 | 3321 | mgr-node1:33061 |
| mgr-node2 | 2 | 3322 | mgr-node2:33061 |
| mgr-node3 | 3 | 3323 | mgr-node3:33061 |

### 8.1 核心配置

```ini
[mysqld]
server_id=1
gtid_mode=ON
enforce_gtid_consistency=ON
log-bin=mysql-bin
disabled_storage_engines="MyISAM,BLACKHOLE,FEDERATED,ARCHIVE,MEMORY"

plugin_load_add='group_replication.so'
group_replication_group_name="117dc7ea-b9bd-11ee-9bdb-0242ac120002"
group_replication_start_on_boot=off
group_replication_local_address="mgr-node1:33061"
group_replication_group_seeds="mgr-node1:33061,mgr-node2:33061,mgr-node3:33061"
group_replication_bootstrap_group=off
```

### 8.2 配置复制用户

```sql
SET SQL_LOG_BIN=0;
CREATE USER fox@'%' IDENTIFIED BY '123456';
GRANT REPLICATION SLAVE ON *.* TO fox@'%';
GRANT CONNECTION_ADMIN ON *.* TO fox@'%';
GRANT BACKUP_ADMIN ON *.* TO fox@'%';
GRANT GROUP_REPLICATION_STREAM ON *.* TO fox@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN=1;

CHANGE REPLICATION SOURCE TO
  SOURCE_USER='fox', SOURCE_PASSWORD='123456'
  FOR CHANNEL 'group_replication_recovery';

SET GLOBAL group_replication_recovery_get_public_key=ON;
```

### 8.3 引导组并加入成员

**mgr-node1 引导：**

```sql
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;

SELECT MEMBER_HOST, MEMBER_ROLE
FROM performance_schema.replication_group_members;
```

**mgr-node2/3 加入：**

```sql
START GROUP_REPLICATION;
```

![MGR 成员信息](/数据库/mysql-10-replication-ha/p037-01.png)

验证数据同步：

```sql
-- node1
CREATE DATABASE test;
USE test;
CREATE TABLE t1 (c1 INT PRIMARY KEY, c2 TEXT NOT NULL);
INSERT INTO t1 VALUES (1, 'Fox');

-- node2/3 查询
SELECT * FROM test.t1;
```

![MGR 数据同步](/数据库/mysql-10-replication-ha/p038-01.png)

---

## 九、MGR 多主模式

```sql
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_single_primary_mode=OFF;
SET GLOBAL group_replication_enforce_update_everywhere_checks=ON;

-- node1 引导
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;

-- node2/3
START GROUP_REPLICATION;

SELECT * FROM performance_schema.replication_group_members;
```

![多主模式成员](/数据库/mysql-10-replication-ha/p040-01.png)

多主模式下各节点可并发写入；任一成员不可用时需中间件做客户端故障转移。

![多主写入测试](/数据库/mysql-10-replication-ha/p041-01.png)

---

# 第三部分：InnoDB Cluster 高可用集群

## 十、InnoDB Cluster 概述

**InnoDB Cluster = MySQL Shell + MySQL Router + MySQL Group Replication**，官方高可用 + 读写分离方案。

![InnoDB Cluster 架构](/数据库/mysql-10-replication-ha__extra/p002-01.png)

| 组件 | 职责 |
|------|------|
| **MySQL Group Replication** | 数据同步与角色选举 |
| **MySQL Shell** | 集群创建与管理（AdminAPI） |
| **MySQL Router** | 流量入口，读写分离 |

一个 Primary（R/W）+ 两个 Secondary（R/O），Router 将客户端路由到 Primary。

---

## 十一、InnoDB Cluster 部署实战

### 11.1 实例规划

| 节点 | server_id | 容器 IP | 端口 |
|------|-----------|---------|------|
| mgr-node1 (Primary) | 1 | 172.19.0.10 | 3321 |
| mgr-node2 | 2 | 172.19.0.11 | 3322 |
| mgr-node3 | 3 | 172.19.0.12 | 3323 |

配置在 MGR 基础上增加**并行复制**参数：

```ini
binlog_transaction_dependency_tracking=WRITESET
replica_preserve_commit_order=ON
replica_parallel_type=LOGICAL_CLOCK
transaction_write_set_extraction=XXHASH64
```

Docker 启动时指定固定 IP 和 hostname 映射（`/etc/hosts`）。

### 11.2 安装 MySQL Shell 与 Router

```bash
# CentOS 7 示例
rpm -ivh mysql-shell-community-8.0.27-1.el7.x86_64.rpm
rpm -ivh mysql-router-community-8.0.27-1.el7.x86_64.rpm

mysqlsh root@mgr-node1:3306 --js
```

### 11.3 预检与初始化

**检查实例配置：**

```javascript
dba.checkInstanceConfiguration('root@mgr-node1:3306')
dba.checkInstanceConfiguration('root@mgr-node2:3306')
dba.checkInstanceConfiguration('root@mgr-node3:3306')
```

要求：binlog ROW 格式、`log_replica_updates=ON`、GTID 开启、InnoDB 引擎、并行复制参数。

**初始化实例：**

```javascript
dba.configureInstance('root@mgr-node1:3306')
dba.configureInstance('root@mgr-node2:3306')
dba.configureInstance('root@mgr-node3:3306')
```

### 11.4 创建集群

```javascript
// 主节点
mysqlsh root@mgr-node1:3306 --js

var cluster = dba.createCluster('myCluster');
cluster.status();

// 添加副本
cluster.addInstance('root@mgr-node2:3306');
cluster.addInstance('root@mgr-node3:3306');

cluster.status();
```

![集群创建状态](/数据库/mysql-10-replication-ha__extra/p010-01.png)

GTID 不一致时选择 **Clone** 覆盖副本数据。状态变为 `"status": "OK"` 表示集群在线，可容忍 1 个节点故障。

![集群 ONLINE 状态](/数据库/mysql-10-replication-ha__extra/p015-01.png)

**完整步骤：**

```javascript
dba.checkInstanceConfiguration('root@mgr-node1:3306');
dba.configureInstance('root@mgr-node1:3306');
var cluster = dba.createCluster('myCluster');

dba.checkInstanceConfiguration('root@mgr-node2:3306');
dba.configureInstance('root@mgr-node2:3306');
cluster.addInstance('root@mgr-node2:3306');

dba.checkInstanceConfiguration('root@mgr-node3:3306');
dba.configureInstance('root@mgr-node3:3306');
cluster.addInstance('root@mgr-node3:3306');

cluster.status();
```

### 11.5 节点状态说明

| 状态 | 含义 |
|------|------|
| **ONLINE** | 正常 |
| **OFFLINE** | 运行但未加入 Cluster |
| **RECOVERING** | 正在同步 |
| **ERROR** | 同步异常 |
| **UNREACHABLE** | 通讯中断 |
| **MISSING** | 已加入但未启动 group replication |

**注意：** 创建表必须有主键，否则报错 `ERROR 3098`。

### 11.6 主从切换测试

```javascript
// 停掉 mgr-node1
docker stop mgr-node1

// 连接 mgr-node2
\connect root@mgr-node2:3306
var cluster = dba.getCluster();
cluster.status();
// mgr-node2 升为 PRIMARY
```

![主从切换结果](/数据库/mysql-10-replication-ha__extra/p018-01.png)

启动 mgr-node1 后重新加入：`cluster.rejoinInstance('root@mgr-node1:3306')`

### 11.7 集群常用操作

```javascript
dba.help();           // DBA 命令
cluster.help();       // 集群命令

cluster.status();                          // 查看状态
cluster.addInstance('root@hostname:3306'); // 添加节点
cluster.removeInstance('root@hostname:3306', {force: true});
cluster.rejoinInstance('root@hostname:3306');
cluster.dissolve({force: true});           // 解散集群

// 参数配置
cluster.setOption('memberWeight', 50);
cluster.setInstanceOption('mgr-node2:3306', 'memberWeight', 75);

// 角色切换
cluster.setPrimaryInstance('hostname:3306');
cluster.switchToMultiPrimaryMode();
cluster.switchToSinglePrimaryMode('hostname:3306');

cluster.setupAdminAccount('fox');
```

---

## 十二、MySQL Router 读写分离

### 12.1 引导 Router

```bash
mysqlrouter --bootstrap root@mgr-node2:3306 --force --user=root
mysqlrouter &
```

![Router 端口说明](/数据库/mysql-10-replication-ha__extra/p025-02.png)

| 协议 | 读写端口 | 只读端口 |
|------|----------|----------|
| MySQL 经典协议 | 6446 | 6447 |
| X 协议 | 6448 | 6449 |

### 12.2 测试

```bash
# 读写端口
mysqlsh root@localhost:6446 --sql
USE test;
SELECT * FROM t;
INSERT INTO t(x,y) VALUES(2,2);

# 只读端口
mysqlsh root@localhost:6447 --sql
INSERT INTO t(x,y) VALUES(3,3);  -- 报错，只读
```

![Router 读写测试](/数据库/mysql-10-replication-ha__extra/p028-02.png)

查看集群成员：

```sql
SELECT * FROM performance_schema.replication_group_members;
```

---

## 十三、InnoDB ReplicaSet

MySQL 8.0.19+ 将 **MySQL Shell + MySQL Router + MySQL Replication** 组合延伸为 **InnoDB ReplicaSet**——至少两个实例的**异步主从复制**集。

![ReplicaSet 与 Cluster 对比](/数据库/mysql-10-replication-ha__extra/p026-01.png)

| 对比 | InnoDB Cluster | InnoDB ReplicaSet |
|------|----------------|-------------------|
| 复制基础 | MGR（Paxos） | 传统异步复制 |
| 故障转移 | 自动选主 | 手动 AdminAPI 触发 |
| 数据安全 | 强一致 | 可能丢数据 |
| 脑裂 | Paxos 防脑裂 | 可能不一致 |

**ReplicaSet 适用场景：** 不需要强一致、可接受手动 failover 的读扩展场景。

### 13.1 快速搭建

```javascript
mysqlsh root@rs-node1:3306 --js

dba.configureReplicaSetInstance('root@rs-node1:3306');
var rs = dba.createReplicaSet('myrs');
rs.addInstance('root@rs-node2:3306');
rs.status();
```

Router 引导方式相同：

```bash
mysqlrouter --bootstrap root@rs-node1:3306 --force --user=root
mysqlrouter &
```

---

## 系列总结

| 层级 | 方案 | 适用场景 |
|------|------|----------|
| 基础 | 异步主从 + binlog 位点 | 读写分离、简单灾备 |
| 增强 | 半同步 / GTID | 减少丢数据、简化运维 |
| 高可用 | MGR 组复制 | 自动故障检测、多数派可用 |
| 一站式 | InnoDB Cluster | 生产级 HA + 读写分离 + 自动路由 |
| 轻量 | InnoDB ReplicaSet | 异步复制 + Shell 管理 |

**MySQL 系列 10 篇至此完结。** 从 [架构总览](/数据库/mysql/mysql-01-architecture) 到索引优化，从事务锁/MVCC 到日志机制，再到全局调优与高可用——构成一套完整的 MySQL 深度学习路径。建议结合实际业务场景选型，而非盲目追求最高可用级别。
