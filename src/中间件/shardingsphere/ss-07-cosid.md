---
title: "CosID 主键生成与分库分表坑点"
sidebarGroup: "ShardingSphere"
shortTitle: "07 CosID 主键"
order: 7
date: 2026-10-19
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 7/7 篇**  
> 上一篇：[《ShardingProxy 服务端分库分表》](/中间件/shardingsphere/ss-06-proxy)

---

## 开头：四条分片只进两片——往往是主键的锅

2 库 2 表共 **4 片**，分库 `cid%2`、分表 `((cid+1)%4).intdiv(2)+1`，主键用 **SNOWFLAKE**，插入 10 条却发现只落在 **m0.course_1** 与 **m1.course_2**。换 **`COSID_SNOWFLAKE`** 后四片均匀——这不是配置笔误，而是 **取模与雪花低位** 的数学关系。ShardingSphere 5.x 集成 **CosID**，值得单独搞懂。

![四片却只落两片的问题现象](/中间件/shardingsphere/10-5/p02-01.png)

---

## 一、复现与配置

```properties
spring.shardingsphere.rules.sharding.key-generators.alg_snowflake.type=SNOWFLAKE
# 改为 COSID_SNOWFLAKE 可修复四片均匀
spring.shardingsphere.rules.sharding.sharding-algorithms.course_tbl_alg.props.algorithm-expression=course_$->{((cid+1)%4).intdiv(2)+1}
```

![分片算法与 Snowflake 配置](/中间件/shardingsphere/10-5/p03-01.png)

四片节点为 `m0.course_1`、`m0.course_2`、`m1.course_1`、`m1.course_2`，`actual-data-nodes=m$->{0..1}.course_$->{1..2}`。分库 `cid%2`、分表 `((cid+1)%4).intdiv(2)+1` 理论上应均匀落四片。

![insert 十条分布异常](/中间件/shardingsphere/10-5/p05-01.png)

---

## 二、数学与 Snowflake 行为

- **对 2 取模** = 二进制**最低 1 位**；**对 4 取模** = **最低 2 位**  
- 要均匀 4 片，需要 cid 低位在 0–3 **循环**  
- 标准 **SNOWFLAKE**：跨毫秒时 `sequence` 在 0/1 **震荡**（`vibrateSequenceOffset`），插入 DB 又耗时间 → 低位常只有 0、1 → **仅 2 个表位**  

Snowflake 在同一毫秒内 `sequence` 仅在 0 和 1 之间交替递增，导致 cid 二进制最低两位无法覆盖 00/01/10/11 四种组合；配合 `%4` 分表时，实际只会命中两个表位。

**变通**（文档稀少）：SNOWFLAKE 增加 `max-vibration-offset=12` 扩大 sequence 摆动范围——不如换 CosID 直观。

### COSID_SNOWFLAKE

`sequence` **递增到 max 再回绕**，低位严格递增 → 对 4 取模均匀。

CosID 的 Snowflake 实现让 sequence 在同一毫秒内单调递增到上限后再归零，保证低位比特在短批量插入中遍历 0–3，与 `%4` 分片表达式配合时四片分布均匀。

**workerId 问题**：Snowflake 中间 10 bit 区分机器；ShardingSphere 里 `worker-id=1` 常全员相同，大集群仍可能冲突——CosID 用 **MachineIdDistributor**（JDBC/Redis/ZK 等）自动分配。

---

## 三、CosID 框架速览

ShardingSphere **未集成 CosID 全部能力**（部分依赖外部存储）。独立使用：

```xml
<dependency>
  <groupId>me.ahoo.cosid</groupId>
  <artifactId>cosid-spring-boot-starter</artifactId>
  <version>2.9.1</version>
</dependency>
```

```properties
cosid.namespace=cosid-example
cosid.snowflake.enabled=true
cosid.machine.distributor.type=manual
cosid.machine.distributor.manual.machine-id=1
```

```java
@Resource IdGeneratorProvider provider;
provider.getShare().generate();
```

三种模式：**Snowflake**、**Segment**、**SegmentChain**；统一经 `IdGeneratorProvider`。

| 模式 | 特点 | 适用 |
|------|------|------|
| Snowflake | 趋势递增、高性能 | 分库分表、日志 ID |
| Segment | DB 号段、严格递增 | 订单号、流水号 |
| SegmentChain | 双 Buffer 预取 | 高 QPS + 严格递增 |

---

## 四、Snowflake + MachineId（JDBC）

`cosid.machine.distributor.type=jdbc` 需 `cosid-jdbc` + 数据源，并建表：

```sql
CREATE TABLE cosid_machine (
  name VARCHAR(100) PRIMARY KEY,
  namespace VARCHAR(100) NOT NULL,
  machine_id INT UNSIGNED NOT NULL DEFAULT 0,
  last_timestamp BIGINT UNSIGNED NOT NULL DEFAULT 0,
  instance_id VARCHAR(100) NOT NULL DEFAULT '',
  ...
);
```

分发流程（`AbstractMachineIdDistributor`）：本地缓存 → **自认领** → **回滚认领** → **`max(machine_id)+1` 远程分配**。

三步保证集群内 machineId 不冲突：实例启动时先查本地缓存；若无则尝试 `INSERT` 认领空闲位；冲突则回滚并重试；最终由 DB 分配 `max(machine_id)+1` 作为新机器号。

`InstanceId` = 命名空间 + IP + port（或稳定 instanceId）；`stable=true` 时机器位持久化文件，停服仍占用。

时钟回拨：`ClockSyncSnowflakeId` / 抛 `ClockBackwardsException`；Second vs Millisecond 两种雪花实现。

![SnowflakeId Bean 注册与 createIdGen](/中间件/shardingsphere/10-5/p16-01.png)

![MachineId 注入 SnowflakeId.generate](/中间件/shardingsphere/10-5/p17-01.png)

---

## 五、Segment 与 SegmentChain

**Segment**：每次从 DB `update cosid set last_max_id=last_max_id+step` 取号段，本地递增；表 `cosid(name, last_max_id, ...)`。

```properties
cosid.snowflake.enabled=false
cosid.segment.enabled=true
cosid.segment.mode=segment
cosid.segment.distributor.type=jdbc
cosid.segment.share.step=100
```

严格递增 ID，适合订单号；DB 是号段瓶颈但交互频率低。

![Segment 号段表与 step](/中间件/shardingsphere/10-5/p18-01.png)

**双 Buffer / 美团 Leaf** 思想：号段用到 10% 预取下一段——CosID **SegmentChain** 用链表缓存多段，`safe-distance` 默认保持链上 segment 个数。

```properties
cosid.segment.mode=chain
cosid.segment.chain.safe-distance=10
```

![Segment vs SegmentChain 结构](/中间件/shardingsphere/10-5/p18-02.png)

![SegmentChain 预取与 hungry 模式](/中间件/shardingsphere/10-5/p18-03.png)

`DefaultSegmentId.generate`：段内自增，用尽 `nextIdSegment`；`SegmentChainId` 遍历链 + 后台 `PrefetchWorker` 扩容。

Segment 模式每次从 DB 预取 `step` 大小的号段（如 100），本地递增发号，用尽再请求下一段；SegmentChain 在链上缓存多段，用到 10% 时后台线程预取下一段，避免 DB 成为热点。

JDBC 核心 SQL：

```sql
UPDATE cosid SET last_max_id=(last_max_id + ?) WHERE name = ?;
SELECT last_max_id FROM cosid WHERE name = ?;
```

号段分发通过 `UPDATE ... SET last_max_id=last_max_id+step` 原子递增，再 `SELECT` 取新边界；SegmentChain 的 `PrefetchWorker` 在链长度低于 `safe-distance` 时异步补充号段。

---

## 六、与 ShardingSphere 集成

配置主键生成器：

```properties
spring.shardingsphere.rules.sharding.key-generators.alg_snowflake.type=COSID_SNOWFLAKE
```

理解 CosID 后，再选 SNOWFLAKE / COSID_SNOWFLAKE / NANOID / 自定义 SPI，并**联合分片表达式**验证低位分布。

ShardingSphere 5.x 内置 `COSID_SNOWFLAKE` 类型，底层调用 CosID 的递增 sequence 实现，配置只需把 `key-generators` 的 `type` 从 `SNOWFLAKE` 改为 `COSID_SNOWFLAKE`，无需引入 CosID 全部依赖。

---

## 系列收束

| 篇 | 要点 |
|----|------|
| 01 | 产品形态、何时分片 |
| 02–04 | JDBC 配置、策略、加密/RW/广播/绑定 |
| 05 | 内核五阶段 + SPI |
| 06 | Proxy、XA、ZK 集群 |
| 07 | 主键与取模、CosID |

分库分表：**框架解决路由，方案设计仍在你**——分片键、主键、绑定表、迁移路径需一并设计。CosID、Leaf、Uid 等说明「小领域也能深」；ShardingSphere 是工具，**融会贯通**才能用得灵活。

---

## 小结

- **取模分片看主键低位**；标准 Snowflake 的 sequence 震荡会导致「假四片真两片」。  
- **COSID_SNOWFLAKE** 递增 sequence；**MachineId** 应用 JDBC/ZK 等自动发号。  
- **SegmentChain** 兼顾严格递增与高可用号段缓存。
