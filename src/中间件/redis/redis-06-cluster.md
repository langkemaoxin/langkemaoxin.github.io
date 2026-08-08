---
title: "Redis Cluster——Slot 与数据安全"
sidebarGroup: "Redis"
shortTitle: "06 Cluster 集群"
order: 6
date: 2026-10-03
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 6/10 篇**  
> 上一篇：[05 主从与哨兵](/中间件/redis/redis-05-replication-sentinel) · 下一篇：[07 缓存设计与优化](/中间件/redis/redis-07-cache-design)

---

## 场景：数据量与 QPS 单机扛不住

Sentinel 解决了**自动选主**，但仍是**全量数据在每组主从**上。Cluster 把多组 Replica **整合为一个逻辑集群**，通过 **16384 槽位**分片，并内置 failover。

---

## 一、Cluster 是什么

**一句话：** 多组主从复制集对外像一个 Redis；核心仍是 Replica。

**解决：**

1. 客户端频繁切换 Master（`-c` 模式自动 MOVED/ASK）  
2. 单复制集内存/CPU 上限  
3. Master 宕机 Slave 自动升主  

![Redis Cluster 多分片 + 每分片主从拓扑](/中间件/redis/03/p22-01.png)

---

## 二、核心配置与搭建

```conf
cluster-enabled yes
cluster-config-file nodes-6379.conf
cluster-node-timeout 5000
requirepass xxx
masterauth xxx
```

创建三主三从：

```bash
redis-cli -a pwd --cluster create --cluster-replicas 1 \
  host:6381 host:6382 host:6383 host:6384 host:6385 host:6386
```

```bash
redis-cli -p 6381 -a pwd -c
cluster nodes
cluster info
```

![Cluster 节点 redis.conf 关键项与 create 命令](/中间件/redis/03/p27-01.png)

**验证三问题：**

```redis
set k1 v1
# -> Redirected to slot [12706] located at host:6383
set k2 v2
# -> Redirected to slot [449] located at host:6381
```

**高可用：** 关闭 6383 Master → 6384 升主；重启 6383 → 变为 6384 的 Slave。

![旧 Master 重启后以 slave 身份加入](/中间件/redis/03/p30-01.png)

手动 failover：`CLUSTER FAILOVER`（在从节点执行）。

---

## 三、Slot 槽位

- **16384** 槽，`CRC16(key) mod 16384`  
- 建集群时尽量均分；扩缩容用 **reshard**  

```bash
redis-cli --cluster add-node newhost:6387 existinghost:6381
redis-cli --cluster reshard host:6381
```

reshard 只迁移部分槽对应数据，不必全量搬库。

**部分槽不可用：** 默认 `cluster-require-full-coverage yes`，任一分片全挂则集群拒写。极端场景可设 `no` 允许部分槽继续服务（数据不完整，不推荐）。

**批量命令与 CROSSSLOT：**

```redis
mset k1 v1 k2 v2
# (error) CROSSSLOT Keys in request don't hash to the same slot
```

**Hash Tag：** `{tag}` 内子串参与槽计算，如 `user_{1}_name` 与 `user_{1}_id` 同槽：

```redis
mset user_{1}_name roy user_{1}_id 1 user_{1}_password 123
```

`CLUSTER KEYSLOT key` 查看槽号。

![Hash Tag 使多个 key 落入同一 slot 的示例](/中间件/redis/03/p27-01.png)

**数据倾斜：** 热点 key → 调整 key 结构；热点 slot → reshard 到不同节点。

---

## 四、Gossip 与选举（了解）

节点间 **gossip**（端口 = 服务端口 + 10000）：`ping/pong/meet/fail` 传播状态，去中心化，节点数过多同步延迟增大，不宜超大集群。

**Slave 升 Master 流程：**

1. 发现 Master FAIL  
2. `currentEpoch++`，广播 `FAILOVER_AUTH_REQUEST`  
3. Master 回复 `FAILOVER_AUTH_ACK`（每 epoch 一次）  
4. 获过半 Master ack 的 Slave 升主  
5. 广播 Pong  

延迟：`500ms + random(0~500ms) + SLAVE_RANK * 1000ms`（rank 小、数据新者优先发起）。

![Cluster gossip 协议与 fail 消息传播](/中间件/redis/03/p30-01.png)

---

## 五、数据安全

稳定运行时：每 Master 有 Slave 备份，failover 后继续服务。

配置可要求最少在线从库才接受写：

```conf
min-replicas-to-write 3
min-replicas-max-lag 10
```

**局限：** gossip 非强一致，极端脑裂等场景**可能丢失已收到的写**（概率低，有运维保障时可认为较安全）。

---

## 六、数据安全方案总览

| 层级 | 手段 |
|------|------|
| 单机 | RDB + AOF |
| 主从 | 多副本 |
| Sentinel | 自动 failover |
| Cluster | 分片 + 每分片主从 |

Redis Enterprise / Redis Cloud 在企业级 HA 与备份上更完善；多数业务 **OSS + 合理架构 + 运维** 已足够。Redis 仍更适合**高性能缓存**；作主库需评估成本与运维（Redis Cloud 提供 DB 级实例）。

---

## 小结

- Cluster = **槽位分片** + **主从** + **内置 failover**  
- 客户端用 `-c`；跨槽批量操作用 **Hash Tag** 或拆命令  
- 扩缩容用 `add-node` + `reshard`；注意 **10000 端口** 与 **CROSSSLOT**
