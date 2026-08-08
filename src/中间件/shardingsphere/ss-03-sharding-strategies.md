---
title: "ShardingJDBC 分片策略实战"
sidebarGroup: "ShardingSphere"
shortTitle: "03 分片策略"
order: 3
date: 2026-10-15
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 3/7 篇**  
> 上一篇：[《ShardingJDBC 第一个分库分表案例》](/中间件/shardingsphere/ss-02-jdbc-quickstart) · 下一篇：[《数据加密、读写分离、广播表与绑定表》](/中间件/shardingsphere/ss-04-encrypt-rw)

---

## 开头：一条 SQL 能不能只打一片，取决于分片键

接上篇 Course 案例：精确查、范围查、多列条件、自定义 SQL、`MOD(cid,2)` 这类表达式，路由行为完全不同。本篇按「问题驱动」过一遍常用策略。

![分片策略实战导读](/中间件/shardingsphere/10-2/p10-01.png)

![逻辑表与真实节点回顾](/中间件/shardingsphere/10-2/p10-02.png)

---

## 一、核心概念再巩固

![虚拟库、真实库、逻辑表、真实表](/中间件/shardingsphere/10-2/p11-01.png)

- **分片策略** = 分片键 + 分片算法（分库 + 分表）
- 匹配不到 → **全路由**（所有 actual-nodes），性能最差

![垂直分片 vs 水平分片](/中间件/shardingsphere/10-2/p12-page.png)

---

## 二、INLINE 简单分片

适用：`=`、`IN` 等能拿到**精确分片值**。

```java
wrapper.eq("cid", 924770131651854337L);
// orderBy 不影响路由；无分片键 → 全路由
```

同库多表会用 **UNION ALL** 合并，仍要尽量避免全路由。

![INLINE 精确查询路由](/中间件/shardingsphere/10-2/p13-01.png)

改表达式 `course_$->{((cid+1)%4).intdiv(2)+1}` 可验证 `in (1,2,3,4)` 的路由——**有路由 ≠ 有数据**。

![全路由 UNION 日志](/中间件/shardingsphere/10-2/p14-page.png)

---

## 三、STANDARD 标准分片

同时支持精确 + **范围**（`between`）。纯 INLINE 对范围会报错，需：

```properties
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.allow-range-query-with-inline-sharding=true
```

开启后范围查询往往仍走**全路由**；精确范围裁剪需自定义算法（见 CLASS_BASED）。

![between 范围查询报错与参数](/中间件/shardingsphere/10-2/p16-01.png)

![范围查询 Actual SQL 全路由](/中间件/shardingsphere/10-2/p17-page.png)

---

## 四、COMPLEX_INLINE 复杂分片

多列组合，如 `cid in (...)` **且** `user_id = 1001`：

```properties
spring.shardingsphere.rules.sharding.tables.course.table-strategy.complex.sharding-columns=cid,user_id
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.type=COMPLEX_INLINE
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.algorithm-expression=course_$->{(cid+user_id+1)%2+1}
```

`user_id=1002` 时可路由到**必空**的表，体现「分片即过滤」。

![COMPLEX_INLINE 配置](/中间件/shardingsphere/10-2/p18-page.png)

---

## 五、CLASS_BASED 自定义分片

实现 `ComplexKeysShardingAlgorithm`：例如 `user_id between 3 and 8` 若不包含 1001，直接 `UnsupportedShardingOperationException`，**避免无效扫库**。

```properties
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.type=CLASS_BASED
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.strategy=COMPLEX
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.algorithmClassName=com.example.MyComplexAlgorithm
```

![MyComplexAlgorithm 核心 doSharding](/中间件/shardingsphere/10-2/p16-01.png)

STANDARD 场景可实现 `StandardShardingAlgorithm` 做范围裁剪。

---

## 六、HINT_INLINE 强制分片

SQL 含 `MOD(cid,2)=1` 时解析器难以还原分片键 → 又全路由。用 **HintManager** 与 SQL 无关地指定表后缀：

```java
try (HintManager hint = HintManager.getInstance()) {
    hint.addTableShardingValue("course", "1");
    courseMapper.selectList(null);
}
```

```properties
spring.shardingsphere.rules.sharding.tables.course.table-strategy.hint.sharding-algorithm-name=course_tbl_alg
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.type=HINT_INLINE
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.algorithm-expression=course_$->{value}
```

![HintManager 强制查 course_1](/中间件/shardingsphere/10-2/p17-page.png)

分库分表后应减少多表 join、复杂子查询、distinct 等。

![HINT 与复杂 SQL 限制](/中间件/shardingsphere/10-2/p18-page.png)

---

## 七、算法小结

| 类型 | 场景 |
|------|------|
| MOD / HASH_MOD | 内置取模 |
| INLINE / COMPLEX_INLINE | Groovy 表达式 |
| STANDARD | 精确 + 范围（常配合自定义） |
| HINT | 强制路由、ShardingSphere 难解析的 SQL |
| CLASS_BASED | Java 实现复杂业务规则 |

![常用分片算法总结](/中间件/shardingsphere/10-2/p20-01.png)

![分片策略选型思维](/中间件/shardingsphere/10-2/p20-02.png)

---

## 小结

- **带分片键的精确条件** → 单片/少片；否则警惕全路由。
- 复杂条件用 **COMPLEX** 或 **CLASS_BASED** 把「必空查询」挡在 JDBC 层外。
- 下一篇：**加密、读写分离、广播表、绑定表、分片审计**。
