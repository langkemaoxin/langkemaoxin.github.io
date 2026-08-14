---
title: "ShardingSphere 内核——解析路由改写执行归并"
sidebarGroup: "ShardingSphere"
shortTitle: "05 内核五阶段"
order: 5
date: 2026-10-17
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 5/7 篇**  
> 上一篇：[《数据加密、读写分离、广播表与绑定表》](/中间件/shardingsphere/ss-04-encrypt-rw) · 下一篇：[《ShardingProxy 服务端分库分表》](/中间件/shardingsphere/ss-06-proxy)

---

## 开头：配置从哪来、SQL 进去后发生了什么

上一章 properties 里满屏的 `COMPLEX`、`NANOID` 容易让人死记。理解 **一条逻辑 SQL 的五段流水线**，再对照 **SPI 扩展点**，配置就变成「选能力 + 填类型名」。

![ShardingSphere 内核总览](/中间件/shardingsphere/10-3/p02-01.png)

---

## 零、配置管控

进入内核前，规则可从本地文件或 **ZooKeeper / Nacos / Etcd** 加载；Proxy 集群强依赖此能力。JDBC 也可接集群模式统一配置。

![配置管控与注册中心](/中间件/shardingsphere/10-3/p03-01.png)

---

## 一、SQL Parser（解析）

词法 → Token；语法 → **AST**。3.x 起基于 **ANTLR**，并缓存 AST 提升性能。

示例：

```sql
SELECT id, name FROM t_user WHERE status = 'ACTIVE' AND age > 18
```

→ 结构化语法树，供后续路由使用。

![SQL 解析为 AST](/中间件/shardingsphere/10-3/p04-01.png)

---

## 二、SQL Router（路由）

按分片键匹配策略，生成**路由路径**：

| 类型 | 条件 |
|------|------|
| 单片 | `=` |
| 多片 | `IN` |
| 范围 | `BETWEEN` |
| 广播 | 无分片键 |

广播子类：全库表、全库、全实例、单播、阻断等。生产应**尽量精确路由**。

![路由引擎与分片策略](/中间件/shardingsphere/10-3/p05-01.png)

![广播路由类型示意](/中间件/shardingsphere/10-3/p05-02.png)

---

## 三、SQL Rewriter（改写）

- **方言翻译**：如 MySQL 语句访问 PostgreSQL 存储
- **正确性改写**：逻辑表名 → 真实表名；补列、分页修正等
- **优化改写**：同库多表 **UNION** 合并（见 [ss-03](/中间件/shardingsphere/ss-03-sharding-strategies) 日志）

![SQL 方言翻译](/中间件/shardingsphere/10-3/p06-01.png)

![正确性改写与优化改写](/中间件/shardingsphere/10-3/p06-02.png)

![UNION 优化合并](/中间件/shardingsphere/10-3/p07-01.png)

---

## 四、SQL Executor（执行）

自动平衡**连接创建**与**内存**，控制并发：

| 模式 | 含义 |
|------|------|
| **内存限制** | 一连接一 SQL，连接数不严格限 |
| **连接限制** | 一连接多 SQL，严格限连接数 |

由 `max-connections-size-per-query` 等 props 影响，OLTP 偏流式、OLAP 偏内存归并。

执行引擎在「内存限制」与「连接限制」两种模式间平衡：前者每个连接一次只跑一条 SQL，连接数可能较多；后者一个连接串行跑多条 SQL，严格限制并发连接。多片查询时，引擎按路由结果并行或串行下发到各数据源，再交给归并层。

---

## 五、Result Merger（归并）

多片结果集合并返回：

- **流式归并**：逐条取，适合 order by / 流式分组（OLTP）
- **内存归并**：全量进内存再排序聚合（OLAP）

流式归并逐条从各分片结果集取数，适合 `ORDER BY`/`GROUP BY` 且数据量可控的 OLTP；内存归并先把各片结果全部加载再排序聚合，适合分析型查询。跨片 `LIMIT` 也可能触发内存归并——这是分片 SQL 需要谨慎设计的原因之一。

---

## 六、ShardingSphereDataSource

内核产物是 **`ShardingSphereDataSource`**（标准 `DataSource`），与 MyBatis/Spring 集成；调试入口：

```java
DataSource ds = ShardingSphereDataSourceFactory.createDataSource(
    dataSourceMap, Collections.singleton(shardingRuleConfig), props);
Connection conn = ds.getConnection(); // ShardingConnection
```

Java 配置与 YAML/`application.properties` **一一对应**（`AlgorithmConfiguration("MOD", props)` 等）。

调试时可断点 `ShardingSphereDataSourceFactory.createDataSource`，观察传入的 `dataSourceMap` 与 `ShardingRuleConfiguration`；`getConnection()` 返回的 `ShardingConnection` 会在 `prepareStatement` 时触发完整五阶段流水线。

![Java API 与 properties 对照](/中间件/shardingsphere/10-3/p15-01.png)

### 独立 JDBC Driver

```java
Class.forName("org.apache.shardingsphere.driver.ShardingSphereDriver");
Connection c = DriverManager.getConnection("jdbc:shardingsphere:classpath:config.yaml");
```

`config.yaml` 与 **Proxy 同源**，可脱离 Spring Boot。

独立 Driver 适合非 Spring 项目或 CLI 工具：classpath 下放与 Proxy `conf/` 同结构的 YAML，通过 `jdbc:shardingsphere:classpath:config.yaml` 连接，规则变更只需改 YAML 无需改代码。

---

## 七、SPI 扩展（主键 & 分片）

### KeyGenerateAlgorithm

`KeyGenerateAlgorithmFactory` → `ServiceLoader.load(KeyGenerateAlgorithm.class)`  
内置 `SNOWFLAKE`、`NANOID` 等；`getType()` 返回配置里的 `type` 字符串。

自定义：实现接口 + `META-INF/services/org.apache.shardingsphere.sharding.spi.KeyGenerateAlgorithm` + `type=MYKEY`。

`ServiceLoader` 在启动时扫描 classpath 下 SPI 文件，按 `getType()` 返回的字符串与配置里的 `type=MYKEY` 匹配。自定义主键生成器只需实现 `generateKey()` 并在 resources 目录注册即可。

![自定义 MyKeyGeneratorAlgorithm](/中间件/shardingsphere/10-3/p15-01.png)

### ShardingAlgorithm

`MyComplexAlgorithm` 除 `CLASS_BASED` 外，也可 SPI 注册 `org.apache.shardingsphere.sharding.spi.ShardingAlgorithm`，`getType()` → `MYCOMPLEX`，配置：

```properties
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.type=MYCOMPLEX
```

![SPI 扩展分片算法](/中间件/shardingsphere/10-3/p07-01.png)

---

## 小结

- 流水线：**Parse → Route → Rewrite → Execute → Merge**。
- 配置项来自 **SPI 的 type + props**；查官方文档 = 查接口实现列表。
- 下一篇：**ShardingProxy** 与 JDBC 的配置统一、XA、集群模式。
