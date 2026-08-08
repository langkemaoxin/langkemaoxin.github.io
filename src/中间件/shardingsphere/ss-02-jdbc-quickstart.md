---
title: "ShardingJDBC 第一个分库分表案例"
sidebarGroup: "ShardingSphere"
shortTitle: "02 JDBC 入门案例"
order: 2
date: 2026-10-14
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 2/7 篇**  
> 上一篇：[《ShardingSphere 是什么》](/中间件/shardingsphere/ss-01-intro) · 下一篇：[《ShardingJDBC 分片策略实战》](/中间件/shardingsphere/ss-03-sharding-strategies)

---

## 开头：10 条 insert，背后可能是 4 张物理表

先把「分库分表」从概念落到一次可运行的 Demo：**2 个库 × 2 张表 = 4 片**，业务仍写 `course` 一张逻辑表。本篇搭 Spring Boot + MyBatis-Plus 基线，再只改依赖与配置接入 ShardingJDBC。

**案例目标**：插入 10 条 `course` 记录后，数据按 `cid` 路由到 `shardingdb1/shardingdb2` 下的 `course_1`、`course_2`；开启 `sql-show` 可在日志中看到 Logic SQL 与 Actual SQL 的对应关系。

---

## 一、准备表结构

```sql
CREATE TABLE course (
  cid BIGINT NOT NULL PRIMARY KEY,
  cname VARCHAR(50) NOT NULL,
  user_id BIGINT NOT NULL,
  cstatus VARCHAR(10) NOT NULL
);
```

目标：数据写入 `shardingdb1/shardingdb2` 下的 `course_1`、`course_2`。

![Course 表与分片规划](/中间件/shardingsphere/10-2/p03-01.png)

---

## 二、纯 JDBC 基线（对照组）

**Step 1** — `pom`：Spring Boot 2.2.x、MyBatis-Plus、Druid、MySQL 驱动。

**Step 2** — Entity + `CourseMapper extends BaseMapper<Course>`。

**Step 3** — `@SpringBootApplication` + `@MapperScan`。

**Step 4** — `application.properties` 单数据源 URL。

**Step 5** — 单元测试 `insert` 循环 10 条、`selectList` 查询。

基线跑通后，所有数据在**单库单表**。

典型工程结构：`pom.xml`（Spring Boot + MyBatis-Plus + Druid + MySQL 驱动）→ `entity/Course.java` → `mapper/CourseMapper.java` → `Application` 主类加 `@MapperScan` → `application.properties` 单数据源 → 单元测试 `insert` 循环 10 条、`selectList` 验证。此对照组证明业务代码本身无需分片感知。

---

## 三、接入 ShardingJDBC

### 依赖注意

- 使用 `shardingsphere-jdbc-core-spring-boot-starter` **5.2.1**（与 Boot 集成、IDE 提示更友好；与 5.5 官方 artifact 取舍见下文）
- **不要**与 `druid-spring-boot-starter` 同时自动建数据源，改用 `druid` 裸依赖
- 处理 `snakeyaml` 版本冲突

### 物理表

在 `shardingdb1`、`shardingdb2` 各建 `course_1`、`course_2`。

### 核心配置（节选）

```properties
spring.shardingsphere.datasource.names=m0,m1
# m0 -> shardingdb1, m1 -> shardingdb2

spring.shardingsphere.rules.sharding.tables.course.actual-data-nodes=m$->{0..1}.course_$->{1..2}

spring.shardingsphere.rules.sharding.key-generators.alg_snowflake.type=SNOWFLAKE
spring.shardingsphere.rules.sharding.tables.course.key-generate-strategy.column=cid
spring.shardingsphere.rules.sharding.tables.course.key-generate-strategy.key-generator-name=alg_snowflake

# 分库 MOD(cid) % 2
spring.shardingsphere.rules.sharding.tables.course.database-strategy.standard.sharding-column=cid
spring.shardingsphere.rules.sharding.tables.course.database-strategy.standard.sharding-algorithm-name=course_db_alg
spring.shardingsphere.rules.sharding.sharding-algorithms.course_db_alg.type=MOD
spring.shardingsphere.rules.sharding.sharding-algorithms.course_db_alg.props.sharding-count=2

# 分表 INLINE
spring.shardingsphere.rules.sharding.tables.course.table-strategy.standard.sharding-column=cid
spring.shardingsphere.rules.sharding.tables.course.table-strategy.standard.sharding-algorithm-name=course_tbl_alg
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.type=INLINE
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.algorithm-expression=course_$->{cid%2+1}

spring.shardingsphere.props.sql-show=true
```

**Groovy 表达式**：`m$->{0..1}` → m0,m1；`course_$->{cid%2+1}` 按 cid 奇偶落表。

![ShardingJDBC 依赖与版本说明](/中间件/shardingsphere/10-2/p10-01.png)

![完整 properties 分片配置](/中间件/shardingsphere/10-2/p10-02.png)

### 运行结果

- 业务代码**零改动**，仍 `courseMapper.insert`
- 日志可见 Logic SQL → Actual SQL（如 `m0.course_1`）
- 默认 **Snowflake** 非严格递增，十条数据可能只均匀落在**两片**（两表组合），要均匀四片需调整算法 + 主键策略（见 [ss-07 CosID](/中间件/shardingsphere/ss-07-cosid)）

![insert 后数据分布与 SQL 日志](/中间件/shardingsphere/10-2/p10-01.png)

![Actual SQL 路由示例](/中间件/shardingsphere/10-2/p10-02.png)

---

## 四、核心概念（本案例对应关系）

| 概念 | 本例 |
|------|------|
| **逻辑库** | ShardingSphere DataSource 虚拟库 |
| **真实库** | m0、m1 |
| **逻辑表** | `course`（库中可不建） |
| **真实表** | `course_1`、`course_2` |
| **分片键** | `cid` |
| **分片算法** | 库 MOD；表 INLINE |
| **分布式主键** | SNOWFLAKE |

**垂直分片**：按业务拆库（不同表到不同库）。**水平分片**：同表拆多表/多库。日常「分库分表」多指水平。

---

## 小结

- 分片 = **改配置不改 Mapper**（理想情况）。
- 看懂 `actual-data-nodes`、分库/分表策略、key-generator 三件套。
- 下一篇展开 **INLINE / STANDARD / COMPLEX / HINT / CLASS_BASED** 等策略与坑。
