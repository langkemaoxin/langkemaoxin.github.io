---
title: "Redis 7 安装与单机/主从/哨兵/集群部署"
sidebarGroup: "Redis"
shortTitle: "01 安装与部署形态"
order: 1
date: 2026-09-28
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 1/10 篇**  
> 下一篇：[02 核心数据结构](/中间件/redis/redis-02-data-structures)

---

## 场景：上线前先把 Redis 跑起来

电商大促前，你需要在 Linux 上快速搭好 Redis 7：开发环境单机、预发主从读写分离、生产哨兵高可用、海量数据 Cluster 分片。本文按「单机 → 主从 → 哨兵 → 集群」递进，给出可复制的安装与配置要点。

---

## 一、环境准备与单机部署

Redis 由 C 编写，需先安装 gcc 编译环境：

```bash
systemctl stop firewalld.service
gcc --version
yum install gcc
```

![Redis 7 安装教程封面与整体部署形态概览](/中间件/redis/01a/p01-01.png)

### 1.1 下载编译安装

```bash
mkdir -p /opt/software/redis
cd /opt/software/redis
wget https://download.redis.io/redis-stable.tar.gz
tar -xzf redis-stable.tar.gz
cd redis-stable
make install
ll /usr/local/bin
```

![wget 下载与 make install 编译安装过程](/中间件/redis/01a/p02-01.png)

安装完成后 `/usr/local/bin` 会生成常用工具：

| 命令 | 用途 |
|------|------|
| `redis-server` | 启动服务 |
| `redis-cli` | 客户端入口 |
| `redis-benchmark` | 性能压测 |
| `redis-check-aof` / `redis-check-rdb` | 修复持久化文件 |
| `redis-sentinel` | 哨兵进程 |

### 1.2 启动与后台运行

源码目录直接启动（前台，退出即停）：

```bash
./src/redis-server
# 或
redis-server
```

![前台启动 redis-server 的终端输出](/中间件/redis/01a/p04-01.png)

生产需修改 `redis.conf` 后后台运行：

```bash
vim redis.conf
```

关键项：

```conf
bind * -::*              # 允许远程连接
daemonize yes            # 守护进程
logfile /opt/software/redis/redis-stable/redis.log
dir /opt/software/redis
requirepass 1qaz@WSX     # 访问密码（示例）
protected-mode no        # 不设密码时必须关闭保护模式
```

![redis.conf 核心配置项修改示意](/中间件/redis/01a/p05-01.png)

启动与验证：

```bash
redis-server redis.conf
redis-cli
auth 1qaz@WSX
quit
redis-cli shutdown
```

![使用配置文件启动并通过 redis-cli 认证连接](/中间件/redis/01a/p06-01.png)

---

## 二、主从复制（Master-Slave）

主从复制将一台 Master 的数据异步复制到 Slave，数据流向单向：Master → Slave。

![主从复制整体架构图](/中间件/redis/01a/p07-01.png)

**作用：**

- **数据冗余**：热备份，持久化之外的冗余手段
- **故障恢复**：Master 故障时可由 Slave 提供读服务
- **负载均衡**：写走 Master、读走 Slave，写少读多场景提升并发
- **高可用基石**：哨兵与 Cluster 都建立在主从之上

**部署：** 从节点在 `redis.conf` 增加：

```conf
replicaof 192.168.75.129 6379
```

Master 上 `info replication` 可查看从节点状态。

![主节点 info replication 查看从库连接状态](/中间件/redis/01a/p08-01.png)

![主从复制延迟与 Master 宕机时的故障场景说明](/中间件/redis/01a/p08-02.png)

**缺点：**

- **复制延迟**：写先在 Master，再异步到 Slave，繁忙时延迟加剧
- **Master 故障**：默认不会自动选主，需人工干预；单纯主从无法保证高可用

![主从默认不会自动 failover，需人工切换 Master](/中间件/redis/01a/p09-01.png)

---

## 三、哨兵部署（Sentinel）

哨兵在独立进程上运行，监控主从状态，故障时自动发现与转移，并通知客户端。

![Sentinel 选举 Leader 与监控、故障转移流程](/中间件/redis/01a/p12-01.png)

**选举过程：**

- 在线哨兵均可成为 Leader，通过 `is-master-down-by-addr` 投票
- 票数 ≥ `num(sentinels)/2 + 1` 时成为 Leader
- 监控主从健康；Master 不可用时触发 failover，从 Slave 中选新 Master

**客观下线：** 单个 Sentinel 主观认为 Master 下线（S_DOWN）后，超过 quorum 个节点一致则标记 O_DOWN，才开始切换。

![三台机器 sentinel.conf 核心配置示例](/中间件/redis/01a/p13-01.png)

```conf
protected-mode no
daemonize yes
logfile /opt/software/redis/redis-stable/sentinel.log
dir /opt/software/redis
sentinel monitor mymaster 192.168.75.129 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 180000
```

故障模拟与观察：

```bash
redis-cli -p 26379 info sentinel
redis-cli shutdown          # 停 Master
tail -f sentinel.log        # 观察选主
redis-server redis.conf     # 旧 Master 重启后降为 Slave
```

![哨兵故障转移后 redis.conf 与 sentinel.conf 自动改写](/中间件/redis/01a/p14-01.png)

![故障转移后各节点 role 变化示意](/中间件/redis/01a/p14-02.png)

![Sentinel 日志中主从切换过程](/中间件/redis/01a/p14-03.png)

**使用建议：**

- 哨兵节点应为**奇数个**，配置一致
- Docker 部署注意端口映射
- **不能保证数据零丢失**：复制延迟、故障检测时间、网络分区、多 Slave 同时故障等场景仍可能丢写

![哨兵模式数据零丢失无法保证的原因说明](/中间件/redis/01a/p15-01.png)

---

## 四、集群部署（Cluster）

Cluster 通过 **16384 个哈希槽**分片，突破单机内存，每个 Master 可读写，Slave 复制 Master。

![Cluster 三主三从架构与槽位分配示意](/中间件/redis/01a/p18-01.png)

**作用：**

- **数据分区**：突破单机内存；每个 Master 提供读写
- **高可用**：类似哨兵的自动 failover

槽位计算：`CRC16(key) mod 16384`。三节点示例：A 0–5460，B 5461–10922，C 10923–16383。

**搭建步骤：**

```bash
mkdir -p /opt/software/redis/redis-stable/cluster
mkdir -p /opt/software/redis/cluster
# 编写 redis_6379.conf、redis_6380.conf ...
redis-server ./cluster/redis_6379.conf
redis-server ./cluster/redis_6380.conf
redis-cli --cluster create --cluster-replicas 1 \
  192.168.75.129:6379 192.168.75.129:6380 \
  192.168.75.131:6379 192.168.75.131:6380 \
  192.168.75.132:6379 192.168.75.132:6380
redis-cli cluster info
redis-cli cluster nodes
```

6379 节点配置要点：

```conf
bind * -::*
daemonize yes
protected-mode no
cluster-enabled yes
cluster-node-timeout 5000
dir "/opt/software/redis/cluster"
appendonly yes
port 6379
cluster-config-file nodes-6379.conf
```

**读写与路由：**

```bash
redis-cli -c    # -c 开启集群路由
set k1 b1       # 可能 MOVED 重定向到正确槽位节点
```

![跨槽写入时的 MOVED 重定向提示](/中间件/redis/01a/p23-01.png)

![使用 redis-cli -c 开启集群模式后正常写入](/中间件/redis/01a/p23-02.png)

**故障转移验证：**

```bash
redis-cli -p 6379 shutdown    # 干掉某 Master
redis-cli cluster nodes       # 观察 Slave 升主
redis-server ./cluster/redis_6379.conf  # 旧 Master 重启后变 Slave
```

![模拟 Master 宕机后 cluster nodes 状态变化](/中间件/redis/01a/p24-01.png)

![旧 Master 重启后以 Slave 身份重新加入集群](/中间件/redis/01a/p24-02.png)

![6380 节点日志中 failover 记录](/中间件/redis/01a/p25-01.png)

![129 节点重启后 info replication 显示为从节点](/中间件/redis/01a/p25-02.png)

![部署篇章完成与目录结构总览](/中间件/redis/01a/p26-01.png)

![/opt/software/redis 推荐目录结构](/中间件/redis/01a/p26-02.png)

![单机 redis.conf 配置文件截图](/中间件/redis/01a/p27-01.png)

---

## 五、配置与命令速查

### 5.1 推荐目录结构

```text
/opt/software/redis/                          # 应用根目录
/opt/software/redis/redis-stable/             # 源码与单机/哨兵配置
/opt/software/redis/cluster/                  # 集群运行时数据（RDB/AOF/日志）
/opt/software/redis/redis-stable/cluster/     # 集群 redis_6379.conf 等
```

### 5.2 单机 redis.conf 要点

```conf
bind * -::*
protected-mode no
port 6379
daemonize yes
logfile /opt/software/redis/redis-stable/redis.log
dir /opt/software/redis
requirepass 1qaz@WSX
appendonly no
appendfsync everysec
aof-use-rdb-preamble yes
```

### 5.3 主从节点（131/132 从节点示例）

```conf
replicaof 192.168.75.129 6379
replica-read-only yes
```

### 5.4 哨兵 sentinel.conf（26379，三机相同）

```conf
port 26379
daemonize yes
logfile /opt/software/redis/redis-stable/sentinel.log
dir /opt/software/redis
sentinel monitor mymaster 192.168.75.129 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 180000
```

### 5.5 集群节点（6379 / 6380 各一份，改 port 与文件名）

```conf
bind * -::*
daemonize yes
protected-mode no
cluster-enabled yes
cluster-node-timeout 5000
dir /opt/software/redis/cluster
appendonly yes
port 6379
logfile /opt/software/redis/redis-stable/cluster/redis6379.log
cluster-config-file nodes-6379.conf
appendfilename appendonly6379.aof
dbfilename dump6379.rdb
```

### 5.6 常用命令

```bash
# 基础
keys * | exists key | type key | ttl key
del key | unlink key | expire key seconds
select 0 | dbsize | flushdb | flushall

# 单机运维
redis-server redis.conf
redis-cli -a 1qaz@WSX
redis-cli shutdown

# 主从
info replication

# 哨兵
redis-cli -p 26379 info sentinel
tail -f sentinel.log

# 集群
redis-cli --cluster create --cluster-replicas 1 \
  192.168.75.129:6379 192.168.75.129:6380 \
  192.168.75.131:6379 192.168.75.131:6380 \
  192.168.75.132:6379 192.168.75.132:6380
redis-cli -c
redis-cli cluster info
redis-cli cluster nodes
```

## 小结

| 形态 | 适用场景 | 核心能力 |
|------|----------|----------|
| 单机 | 开发、小流量 | 最简单，无高可用 |
| 主从 | 读多写少、备份 | 读写分离，不自动 failover |
| 哨兵 | 需要自动选主 | 监控 + 故障转移 |
| Cluster | 大数据量、水平扩展 | 槽位分片 + 内置 failover |

下一篇进入 Redis 7 核心数据结构实战。
