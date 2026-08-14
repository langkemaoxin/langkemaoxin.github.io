---
title: "ShardingSphere 是什么——客户端与服务端分片"
sidebarGroup: "ShardingSphere"
shortTitle: "01 产品介绍"
order: 1
date: 2026-10-13
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 1/7 篇**  
> 下一篇预告：[《ShardingJDBC 第一个分库分表案例》](/中间件/shardingsphere/ss-02-jdbc-quickstart)

---

## 开头：单库扛不住时，别急着「多建几个 JDBC 连接」

订单表过千万、促销瞬时 QPS 打满连接池——加 Redis、MQ 能缓一部分，但**数据仍落在一个 MySQL** 上时，存储与写入天花板还在。分库分表是把数据库从单体升级为**集群**的思路；ShardingSphere 把「解析 SQL → 路由 → 改写 → 多库执行 → 归并」做成可插拔产品，而不是每个项目手写路由。

官网：[shardingsphere.apache.org](https://shardingsphere.apache.org/)

![ShardingSphere 产品生态概览](/中间件/shardingsphere/10-1/p02-01.png)

---

## 一、ShardingSphere 是什么

起源于当当 **ShardingJDBC**（2015），后演进为 Apache **顶级项目**。定位 **Database Plus**：**不自研存储**，在 JDBC/协议层增强，把多库组合成**逻辑上的分布式数据库**。

![ShardingSphere 核心：数据分片](/中间件/shardingsphere/10-1/p03-01.png)

**Sphere = 生态**：除核心外还有 ElasticJob（迁移/调度）、云上版本等。5.x 能力包括：分片、分布式事务、读写分离、加密、影子库、DistSQL、联邦查询等。

![技术体系与可插拔架构](/中间件/shardingsphere/10-1/p04-01.png)

设计哲学：**Connect · Enhance · Pluggable**（连接、增强、可拔插）。

![Connect Enhance Pluggable](/中间件/shardingsphere/10-1/p05-01.png)

---

## 二、客户端 vs 服务端分片

| 产品 | 形态 | 典型场景 |
|------|------|----------|
| **ShardingSphere-JDBC** | 应用内 Jar，增强 JDBC | Java 业务、与 MyBatis/JPA 同进程 |
| **ShardingSphere-Proxy** | 独立进程，MySQL/PG 协议 | 多语言、DBA 友好、统一入口 |

### ShardingJDBC

直连数据库，无额外部署；兼容 JDBC、连接池、ORM。

![ShardingJDBC 架构：应用内嵌](/中间件/shardingsphere/10-1/p06-01.png)

### ShardingProxy

对应用透明，像连一个 MySQL；Navicat、mysql CLI 均可。

![ShardingProxy 透明代理](/中间件/shardingsphere/10-1/p07-01.png)

### 对比与混合部署

| 维度 | JDBC | Proxy |
|------|------|-------|
| 语言 |  mainly Java | 任意（MySQL 协议） |
| 连接数 | 每应用连各分片，消耗高 | 集中代理，消耗低 |
| 性能 | 路径短，损耗低 | 多一跳 |
| 中心化 | 无静态入口 | 有 |
| 配置 | 随应用 | Governance Center（ZK/Nacos 等） |
| 部署 | 随应用发布 | 独立进程，需单独运维 |
| 适用 | Java 业务为主 | 多语言、DBA 统一入口 |

两者均可把规则托管到 **ZooKeeper / Nacos / Etcd**，形成**混合架构**。

![混合部署与治理中心](/中间件/shardingsphere/10-1/p09-01.png)

本系列先以 **5.2.x / 5.5.x** 为主线，理解**设计思路**比死记配置更重要。掌握 ShardingSphere 的价值在于：分片逻辑与业务解耦、规则可插拔、JDBC/Proxy 双形态可渐进迁移，而不是每个项目手写路由层。

---

## 三、能不分就不分

### 为何分库分表

- 数据量、访问量增长 → 单点性能与可用性瓶颈
- 单库无法水平扩展，故障影响面大

单体 MySQL 的典型瓶颈：磁盘 I/O 与 redo/binlog 写入、连接数上限、单表 B+ 树深度增大导致索引维护与全表扫描成本上升；备份恢复窗口随数据量线性拉长，故障切换 RTO 难以压缩。

### 收益

提高并发与查询面、复制提升可用性、按片优化、水平加库加表、可分散硬件成本。

### 代价（Sharding 真问题）

- **全局主键**、备份与高可用、**扩缩容迁移**
- **分布式事务**、**SQL 路由**、跨片 **归并**（limit/order by）
- 数据库**试错成本高**，方案不成熟会长期沉淀为技术债

常见踩坑还包括：选错分片键导致热点片、跨片 join/order by 触发全路由、主键低位分布不均（见 ss-07）、扩容迁移窗口内双写一致性。分片前务必在测试环境用真实 SQL 模式压测路由日志。

业界粗线：单表 **500 万行** 或 **2GB** 量级可评估分片（阿里手册参考，需结合业务）。

TiDB、MyCat、**ShardingSphere** 等属于**软件层分片**；相对 NewSQL 更轻、与现有 MySQL 兼容。

---

## 小结

- ShardingSphere = **JDBC 客户端 + Proxy 服务端 + 治理中心** 的生态。
- 分片前先想清楚：**数据如何分、如何查、如何扩**。
- 下一篇用 **Course 表** 跑通第一个 2 库 4 表案例。
