---
title: "ShardingProxy 服务端分库分表"
sidebarGroup: "ShardingSphere"
shortTitle: "06 ShardingProxy"
order: 6
date: 2026-10-18
category: "中间件"
tag:
  - "ShardingSphere"
  - "中间件"
---

> **ShardingSphere 系列 · 第 6/7 篇**  
> 上一篇：[《ShardingSphere 内核五阶段》](/中间件/shardingsphere/ss-05-kernel) · 下一篇：[《CosID 主键生成与分库分表坑点》](/中间件/shardingsphere/ss-07-cosid)

---

## 开头：DBA 和 Go/Python 服务也要分片怎么办

**ShardingSphere-Proxy** 对外是 MySQL/PostgreSQL 协议，应用无感连接 `3307`，规则在 Proxy 侧配置——与 JDBC **同一套 YAML 规则**，视角不同。

![ShardingProxy 在架构中的位置](/中间件/shardingsphere/10-4/p02-01.png)

### 为何需要 Proxy

1. **ORM 友好**：分片逻辑不在业务 Jar 里  
2. **DBA 友好**：运维直接看真实库，Proxy 透明  
3. **少侵入**：规则外置，变更不改业务代码  
4. **治理**：多数据源注册、监控、与 JDBC 混合部署  

![Proxy vs JDBC 选型理由](/中间件/shardingsphere/10-4/p03-01.png)

---

## 一、部署三步

1. 下载 `apache-shardingsphere-*-proxy-bin.tar.gz`，解压（路径避免中文）  
2. 将 **mysql-connector-java** 拷入 `lib/`（默认仅 PG 驱动）  
3. 改 `conf/`，`bin/start.sh` 启动  

目录：`conf/server.yaml`、`config-sharding.yaml`、`config-encrypt.yaml`、`config-readwrite-splitting.yaml` 等。

![Proxy 目录结构](/中间件/shardingsphere/10-4/p04-01.png)

![conf 配置文件说明](/中间件/shardingsphere/10-4/p06-01.png)

### server.yaml

打开 `rules`（AUTHORITY 用户、`TRANSACTION` XA）与 `props`（`sql-show`、`proxy-default-port: 3307`、`proxy-mysql-default-version: 8.0.20` 等）。

![server.yaml rules 与 props](/中间件/shardingsphere/10-4/p06-02.png)

连接：

```bash
mysql -h127.0.0.1 -P3307 -uroot -proot
```

初始仅有虚拟库骨架；随意 `CREATE TABLE` 会报对象不存在——**表由分片规则定义**。

用 `mysql -h127.0.0.1 -P3307 -uroot -proot` 连接后，`show databases` 最初只有 Proxy 内置库；配置分片规则并重启后才会出现 `sharding_db` 等逻辑库。对逻辑库执行 DML 时，Proxy 按规则路由到后端真实库表。

---

## 二、配置 course 分片

`config-sharding.yaml` 与 [ss-02](/中间件/shardingsphere/ss-02-jdbc-quickstart) 同构：`dataSources m0/m1`、`!SHARDING` 规则、`MOD` + `INLINE` + `SNOWFLAKE`。

重启后出现逻辑库 **`sharding_db`**，逻辑表 **`course`**；`select * from course` 归并分片数据；也可 `select * from course_1` 查**真实表**（解答「未映射真实表怎么查」）。

`config-sharding.yaml` 结构与 JDBC 的 `application.properties` 一一对应：`dataSources` 定义 m0/m1 连接，`!SHARDING` 规则块配置 `actual-data-nodes`、分片算法与主键生成器。改 YAML 后重启 Proxy 即可生效。

![show databases 与 course 查询](/中间件/shardingsphere/10-4/p11-01.png)

其他 `config-*.yaml` 示例可自行替换试验加密、读写分离。

---

## 三、分布式事务（XA）

Proxy 跨库写需 **分布式事务**。`server.yaml`：

```yaml
- !TRANSACTION
  defaultType: XA
  providerType: Atomikos
```

**XA** 两阶段：各 RM `prepare` → TM `commit/rollback`。MySQL InnoDB 支持 `XA START / PREPARE / COMMIT`。

注意：XA **慢**、**不能 autocommit 友好**、故障隔离难——仅在有跨片强一致需求时开启。

XA 两阶段流程：TM 协调各 RM——第一阶段各分片 `XA PREPARE` 预提交并持有锁；第二阶段 TM 根据结果发送 `COMMIT` 或 `ROLLBACK`。跨库 insert 同一事务时，任一 RM 失败则全部回滚，保证强一致但吞吐明显下降。

![JDBC XA 依赖与示例](/中间件/shardingsphere/10-4/p11-01.png)

换 **Narayana**：lib 放入 `shardingsphere-transaction-xa-narayana-*.jar`，`providerType: Narayana`（注意版本冲突）。

---

## 四、集群模式（ZooKeeper）

`server.yaml`：

```yaml
mode:
  type: Cluster
  repository:
    type: ZooKeeper
    props:
      server-lists: 192.168.x.x:2181
      namespace: governance_ds
```

- **Standalone**：默认，规则在内存  
- **Cluster**：多 Proxy/JDBC 实例共享 ZK 配置；CP 场景推荐 ZK  

ZK 树：`/rules`、`/metadata/{db}/versions/.../rules` 存分片规则；`/nodes/compute_nodes` 注册实例。

Cluster 模式下，多个 Proxy 实例共享 ZK 中的规则与元数据；`/governance_ds/rules` 下存放分片、加密、读写分离等 YAML 片段，任一实例修改规则后其他实例可感知并热更新（视版本而定）。

### JDBC 读 ZK 配置

```properties
spring.shardingsphere.mode.type=Cluster
spring.shardingsphere.mode.repository.type=ZooKeeper
spring.shardingsphere.mode.repository.props.namespace=governance_ds
spring.shardingsphere.mode.repository.props.server-lists=localhost:2181
spring.shardingsphere.database.name=sharding_db
```

或使用 **`jdbc:shardingsphere:classpath:config.yaml`** 与 Proxy **同文件**。

![JDBC 与 Proxy 配置统一](/中间件/shardingsphere/10-4/p21-01.png)

![整合 config.yaml 的 Driver 测试](/中间件/shardingsphere/10-4/p23-01.png)

---

## 五、Proxy 扩展与数据迁移

自定义 SPI（如 `MYKEY` 主键）打 Jar 丢进 `lib/`，与 JDBC 相同。

**迁移思路**（冷热分离）：

- 热数据：**双写** ShardingSphere 数据源（旧库 + 新分片集群）  
- 冷数据：定时任务 + 独立 **Proxy** 读旧写新，规则经 ZK 与 JDBC 写入库一致  
- 完成后下线双写，保留新分片 DS  

典型迁移步骤：① 新分片集群就绪并双写；② 历史数据通过 Data Pipeline 或定时任务同步；③ 读流量逐步切到新集群；④ 验证一致性后停写旧库；⑤ 下线双写与旧 Proxy。ZK 统一规则可保证 JDBC 与 Proxy 写入目标一致。

---

## 小结

- Proxy = **协议级分片 + 集中配置**；与 JDBC **规则同源**。  
- XA、Cluster、SPI 是登堂入室的三块拼图。  
- 下一篇：**CosID** 与 Snowflake 在取模分片下的均匀性问题。
