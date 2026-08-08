---
title: "Redis 主从复制与 Sentinel"
sidebarGroup: "Redis"
shortTitle: "05 主从与哨兵"
order: 5
date: 2026-10-02
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 5/10 篇**  
> 上一篇：[04 持久化 RDB/AOF](/中间件/redis/redis-04-persistence) · 下一篇：[06 Cluster 集群](/中间件/redis/redis-06-cluster)

---

## 场景：读扩展 + 自动 failover

主从复制做读写分离与备份；Sentinel 在主库宕机时**自动选主**，免人工 `SLAVEOF`。本文覆盖 Replica 配置、复制流程与 Sentinel 主观/客观下线原理。

---

## 一、主从复制（Replica）

![主从复制、哨兵、Cluster 三层递进关系图](/中间件/redis/03/p10-01.png)

**是什么：** Master 写，Slave 异步复制，得到 Master 的精确副本。

**作用：**

- 读写分离（写 Master、读 Slave）
- 数据备份与容灾
- 哨兵/Cluster 的基础

**配置原则：配从不配主**

```conf
replicaof host port
# 或运行时 SLAVEOF host port / SLAVEOF NO ONE
```

### 状态查看

Master 上 `info replication`：关注 `connected_slaves`、`slave0:...state=online`、`master_repl_offset`。

Slave 上：关注 `role:slave`、`master_link_status:up`、`slave_read_only:1`。

### 从库只读

默认 `replica-read-only yes`，Slave 写入会报错 `READONLY`。

管理命令（CONFIG、DEBUG 等）在从库仍可用，生产可用 `rename-command CONFIG ""` 屏蔽危险指令。

### Slave 已有数据时

建立主从时，Slave 会**清空本地数据**（删除 RDB/AOF），再接收 Master 的 RDB + 缓冲写命令。可从从库日志观察 `FULL RESYNC` / `PARTIAL RESYNC`。

![解除并重建主从关系验证同步行为](/中间件/redis/03/p17-01.png)

![主从全量同步与增量复制 offset 示意](/中间件/redis/03/p17-02.png)

### 复制流程

1. Slave 发 `SYNC`，Master `BGSAVE` RDB + 缓冲写命令一并推送  
2. 全量完成后，Master 按 `repl-ping-replica-period`（默认 10s）心跳  
3. 持续传增量；记录 `offset`  
4. Slave 短暂失联，Master 暂停同步，恢复后从 offset 续传  

### 主从缺点

1. **复制延迟**：写多 Slave 多时更明显  
2. **Master 高可用**：Master 挂掉需人工切换  
3. **数据安全 vs 可用**：多副本提高安全，但单 Master 仍是 SPOF（直到加 Sentinel）

---

## 二、Sentinel 哨兵

**作用（不负责数据读写）：**

- 主从监控  
- 故障转移（选新 Master）  
- 消息通知客户端  
- 配置中心（查询当前 Master 地址）

![Sentinel 架构：监控、通知、故障转移、配置中心](/中间件/redis/03/p19-01.png)

**核心配置：**

```conf
sentinel monitor mymaster 192.168.75.129 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 180000
```

`quorum`：判定 O_DOWN 所需 Sentinel 票数（非选举 Leader 的票数，但通常设为集群过半）。

![sentinel.conf 中 monitor 与 quorum 参数说明](/中间件/redis/03/p20-01.png)

### 工作原理

**1. 发现 Master 宕机**

- **S_DOWN（主观下线）：** 某 Sentinel 在 `down-after-milliseconds` 内未收到 Master 回复  
- **O_DOWN（客观下线）：** ≥ quorum 个 Sentinel 都认为 S_DOWN  

**2. 故障转移**

1. Raft 类选举产生 **Sentinel Leader**  
2. 选新 Master 规则：  
   - `replica-priority` 最小（默认 100）  
   - 复制 offset 最大（数据最新）  
   - `runid` 字典序最小  
3. Leader 对新 Master 执行 `SLAVEOF NO ONE`，对其余 Slave `SLAVEOF newmaster`  
4. 旧 Master 恢复后降为 Slave  

结果写入各节点 `redis.conf`。

![Sentinel 故障转移完整日志与步骤拆解](/中间件/redis/03/p21-01.png)

### Sentinel 缺点

1. **客户端需感知 Master 变更**（应用或 SDK 支持 Sentinel）  
2. **切换窗口内可能丢写**：已提交 Master 但未复制到 Slave 的写会丢失  

![Sentinel 切换期间未复制写操作丢失示意](/中间件/redis/03/p22-01.png)

---

## 小结

| 方案 | 自动 failover | 数据安全 | 客户端复杂度 |
|------|---------------|----------|--------------|
| 主从 | 否 | 多副本 | 低（固定 Master） |
| Sentinel | 是 | 异步复制仍可能丢写 | 中（需发现 Master） |

需要**分片 + 客户端透明路由**时，看下一篇 Cluster。
