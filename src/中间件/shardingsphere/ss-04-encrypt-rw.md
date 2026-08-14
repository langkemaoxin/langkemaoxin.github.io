---
title: "数据加密、读写分离、广播表与绑定表"
sidebarGroup: "ShardingSphere"
shortTitle: "04 加密读写分离"
order: 4
date: 2026-10-16
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 4/7 篇**  
> 上一篇：[《ShardingJDBC 分片策略实战》](/中间件/shardingsphere/ss-03-sharding-strategies) · 下一篇：[《ShardingSphere 内核——解析路由改写执行归并》](/中间件/shardingsphere/ss-05-kernel)

---

## 开头：分片之外，还有安全、读扩展与多表 join

Course 分片跑通后，生产还会遇到：**密码列加密**、**读写分离**、字典**广播表**、用户与订单**绑定表**关联。ShardingSphere 在规则层一并解决，应用仍面向逻辑表。

![加密与读写分离章节概览](/中间件/shardingsphere/10-2/p20-01.png)

![user 表分片与加密规划](/中间件/shardingsphere/10-2/p20-02.png)

---

## 一、数据加密

`user` 表示例：明文 `password`，密文 `password_cipher`。

```sql
CREATE TABLE user (
  userid VARCHAR(64) PRIMARY KEY,
  username VARCHAR(32),
  password VARCHAR(64),
  password_cipher VARCHAR(64),
  ...
);
```

在 `shardingdb1/2` 建 `user_1`、`user_2`。

### 配置要点

- 分片：`userid` + HASH_MOD / INLINE（字符串需 `hashCode` 再取模）
- 主键：`NANOID` 或 `UUID`
- 加密规则：

```properties
spring.shardingsphere.rules.encrypt.tables.user.columns.password.plainColumn=password
spring.shardingsphere.rules.encrypt.tables.user.columns.password.cipherColumn=password_cipher
spring.shardingsphere.rules.encrypt.tables.user.columns.password.encryptorName=user_password_encry
spring.shardingsphere.rules.encrypt.encryptors.user_password_encry.type=SM3
spring.shardingsphere.rules.encrypt.encryptors.user_password_encry.props.sm3-salt=12345678
```

可选 AES、MD5、SM4 等。插入时自动写密文；按 `password` 查询会转为密文列条件。

![user 加密配置片段](/中间件/shardingsphere/10-2/p21-01.png)

![insert 后 password_cipher 密文](/中间件/shardingsphere/10-2/p20-01.png)

![按明文 password 查询转密文](/中间件/shardingsphere/10-2/p20-02.png)

---

## 二、读写分离

数据层：MySQL 主从或 Canal 等同步；应用层：`readwrite-splitting` 把写路由主库、读路由从库。

```properties
spring.shardingsphere.rules.sharding.tables.user.actual-data-nodes=userdb.user
spring.shardingsphere.rules.readwrite-splitting.data-sources.userdb.static-strategy.write-data-source-name=m0
spring.shardingsphere.rules.readwrite-splitting.data-sources.userdb.static-strategy.read-data-source-names[0]=m1
spring.shardingsphere.rules.readwrite-splitting.data-sources.userdb.load-balancer-name=user_lb
spring.shardingsphere.rules.readwrite-splitting.load-balancers.user_lb.type=ROUND_ROBIN
```

负载策略还有：`RANDOM`、`TRANSACTION_ROUND_ROBIN`、`FIXED_PRIMARY`（读也走主）等。

![读写分离架构示意](/中间件/shardingsphere/10-2/p21-01.png)

配置完成后：写操作（insert/update/delete）路由到 `m0` 主库；读操作（select）按 `ROUND_ROBIN` 轮询 `m1` 从库。开启 `sql-show=true` 可在日志里对比 Logic SQL 与 Actual SQL 的数据源名称。

---

## 三、广播表

**广播表**：每个分片库都有**相同结构与相同数据**（如字典 `dict`）。配置：

```properties
spring.shardingsphere.rules.sharding.tables.dict.actual-data-nodes=m$->{0..1}.dict
spring.shardingsphere.rules.sharding.broadcast-tables=dict
```

插入一条 `dict`，会写入 m0、m1 的 `dict`。

广播表适合字典、配置等**各分片都需要且数据量小**的表。配置 `broadcast-tables=dict` 后，对 `dict` 的 insert/update/delete 会自动同步到所有分片库，无需在业务代码里双写。

---

## 四、绑定表

**绑定表**：分片规则一致的表（如 `user` 与 `user_course_info` 均按 `userid` 分表）。配置：

```properties
spring.shardingsphere.rules.sharding.binding-tables[0]=user,user_course_info
```

关联 SQL：

```sql
SELECT uci.* FROM user_course_info uci, user u WHERE uci.userid = u.userid
```

- **无绑定**：4 种表组合 → 笛卡尔式 4 条 SQL  
- **有绑定**：仅 `user_1↔user_course_info_1`、`user_2↔user_course_info_2` 两条

无 `binding-tables` 时，两表各 2 片会产生 2×2=4 条 Actual SQL；配置绑定后 ShardingSphere 知道 `user_i` 只与 `user_course_info_i` 关联，SQL 数量减半，避免无效笛卡尔积。

![绑定表配置 user + user_course_info](/中间件/shardingsphere/10-2/p27-01.png)

![有绑定时两条 Actual SQL](/中间件/shardingsphere/10-2/p27-01.png)

---

## 五、分片审计

内置 `DML_SHARDING_CONDITIONS`：要求对逻辑表的 DML **必须带分片键**（可 `allow-hint-disable`）。可自定义 SPI 扩展审计规则。

```properties
spring.shardingsphere.rules.sharding.tables.course.audit-strategy.auditor-names[0]=course_auditor
spring.shardingsphere.rules.sharding.auditors.course_auditor.type=DML_SHARDING_CONDITIONS
```

Hint 查询若不带分片键可能触发拦截——团队可用作**规范约束**。

---

## 小结

- **Encrypt** 对应用透明；**RW** 解耦读扩展；**广播** 同步维表；**绑定** 避免 join 爆炸。
- 配置项多，关键是理解**规则类型**而非死记 key（见 [ss-05 内核](/中间件/shardingsphere/ss-05-kernel)）。
- 下一篇：SQL 在 ShardingSphere 内的五段流水线。
