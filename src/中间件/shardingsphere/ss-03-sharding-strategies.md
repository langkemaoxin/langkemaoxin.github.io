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

**垂直分片**：按业务拆库，不同表落到不同库（如用户库、订单库）。**水平分片**：同一张表拆成多表/多库（如 `course_1`、`course_2`）。日常说的「分库分表」多指水平分片；垂直分片解决业务边界，水平分片解决单表数据量。

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

无分片键条件时，ShardingSphere 会对所有 actual-data-nodes 执行查询，同库多表结果用 **UNION ALL** 合并。日志里可见多条 Actual SQL，这是性能最差的路径，生产应通过分片键、Hint 或改写 SQL 避免。

---

## 三、STANDARD 标准分片

同时支持精确 + **范围**（`between`）。纯 INLINE 对范围会报错，需：

```properties
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.allow-range-query-with-inline-sharding=true
```

开启后范围查询往往仍走**全路由**；精确范围裁剪需自定义算法（见 CLASS_BASED）。

![between 范围查询报错与参数](/中间件/shardingsphere/10-2/p16-01.png)

`between 1 and 10` 这类范围条件在 INLINE 模式下，即使开启 `allow-range-query-with-inline-sharding`，也常会路由到全部 4 个节点并在内存归并——日志里能看到对 `m0.course_1`、`m0.course_2`、`m1.course_1`、`m1.course_2` 四条 Actual SQL。

---

## 四、COMPLEX_INLINE 复杂分片

多列组合，如 `cid in (...)` **且** `user_id = 1001`：

```properties
spring.shardingsphere.rules.sharding.tables.course.table-strategy.complex.sharding-columns=cid,user_id
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.type=COMPLEX_INLINE
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.algorithm-expression=course_$->{(cid+user_id+1)%2+1}
```

`user_id=1002` 时可路由到**必空**的表，体现「分片即过滤」。

配置 `table-strategy.complex` 指定 `sharding-columns=cid,user_id`，算法类型改为 `COMPLEX_INLINE`，表达式可同时引用两列。测试 `cid in (1,2,3,4) and user_id=1001` 时路由范围会明显小于全表扫描。

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

`HintManager.addTableShardingValue("course", "1")` 后，即使 SQL 是 `select * from course` 不带分片键，也会强制路由到 `course_1`，日志里 Actual SQL 仅一条。

分库分表后应减少多表 join、复杂子查询、distinct 等。HINT 适合 ShardingSphere 无法从 SQL 解析出分片键的场景（如 `MOD(cid,2)=1`），但不应作为日常查询手段——团队可用分片审计规则约束 DML 必须带分片键。

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
