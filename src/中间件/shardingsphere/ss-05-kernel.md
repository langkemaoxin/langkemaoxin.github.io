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

![执行引擎架构](/中间件/shardingsphere/10-3/p09-page.png)

---

## 五、Result Merger（归并）

多片结果集合并返回：

- **流式归并**：逐条取，适合 order by / 流式分组（OLTP）
- **内存归并**：全量进内存再排序聚合（OLAP）

![结果归并流式 vs 内存](/中间件/shardingsphere/10-3/p12-page.png)

---

## 六、ShardingSphereDataSource

内核产物是 **`ShardingSphereDataSource`**（标准 `DataSource`），与 MyBatis/Spring 集成；调试入口：

```java
DataSource ds = ShardingSphereDataSourceFactory.createDataSource(
    dataSourceMap, Collections.singleton(shardingRuleConfig), props);
Connection conn = ds.getConnection(); // ShardingConnection
```

Java 配置与 YAML/`application.properties` **一一对应**（`AlgorithmConfiguration("MOD", props)` 等）。

![ShardingSphereDataSource 创建与调试](/中间件/shardingsphere/10-3/p14-page.png)

![Java API 与 properties 对照](/中间件/shardingsphere/10-3/p15-01.png)

### 独立 JDBC Driver

```java
Class.forName("org.apache.shardingsphere.driver.ShardingSphereDriver");
Connection c = DriverManager.getConnection("jdbc:shardingsphere:classpath:config.yaml");
```

`config.yaml` 与 **Proxy 同源**，可脱离 Spring Boot。

![ShardingSphereDriver 与 config.yaml](/中间件/shardingsphere/10-3/p12-page.png)

---

## 七、SPI 扩展（主键 & 分片）

### KeyGenerateAlgorithm

`KeyGenerateAlgorithmFactory` → `ServiceLoader.load(KeyGenerateAlgorithm.class)`  
内置 `SNOWFLAKE`、`NANOID` 等；`getType()` 返回配置里的 `type` 字符串。

自定义：实现接口 + `META-INF/services/org.apache.shardingsphere.sharding.spi.KeyGenerateAlgorithm` + `type=MYKEY`。

![SPI 加载 KeyGenerateAlgorithm](/中间件/shardingsphere/10-3/p14-page.png)

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
