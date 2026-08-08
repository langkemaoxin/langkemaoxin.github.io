---
title: "Redis 持久化——RDB、AOF 与混合策略"
sidebarGroup: "Redis"
shortTitle: "04 持久化 RDB/AOF"
order: 4
date: 2026-10-01
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 4/10 篇**  
> 上一篇：[03 线程模型与原子性](/中间件/redis/redis-03-threading) · 下一篇：[05 主从与哨兵](/中间件/redis/redis-05-replication-sentinel)

---

## 场景：内存快，磁盘要兜底

订单、会话写进 Redis，断电不能全丢。持久化在**性能与安全**间找平衡：纯缓存可关持久化；要安全则 RDB + AOF 混合最常见。

---

## 一、压测与策略总览

```bash
redis-benchmark -a 123qweasd -t set -n 1000000 -c 20
# throughput summary: ~116536 requests/sec
```

**四种策略：**

| 策略 | 说明 |
|------|------|
| 无持久化 | 纯缓存，宕机丢数据 |
| RDB | 定时全量快照 |
| AOF | 追加写操作日志 |
| RDB + AOF | 混合，恢复更快 |

**RDB 优缺点：**

- 优：文件紧凑、备份快（子进程 fork）、大数据量重启快、对主线程影响小
- 缺：非实时，可能丢最后一次快照后的数据；大数据 fork 可能短暂阻塞

**AOF 优缺点：**

- 优：默认每秒 fsync，最多丢约 1 秒；追加写不易损坏；可手工删错指令（如误 FLUSHALL）
- 缺：文件更大；写密集时比 RDB 慢

**建议：**

1. 纯缓存 → 关闭持久化  
2. 可接受少量丢失 → RDB  
3. **不建议单独 AOF** → RDB + AOF 混合，恢复用 AOF（含 RDB 前缀）

---

## 二、RDB 详解

**作用：** 间隔全量快照 → `dump.rdb`，恢复时载入内存；也可用于同版本实例间迁移。

**核心配置：**

```conf
save 3600 1 300 100 60 10000   # N 秒内有 M 次写则快照
dir /path
dbfilename dump.rdb
rdbcompression yes
stop-writes-on-bgsave-error yes
rdbchecksum yes
```

**触发时机：**

1. 满足 `save` 规则  
2. 手动 `SAVE`（阻塞）/ `BGSAVE`（fork 子进程）  
3. 主从全量同步时  

`LASTSAVE` 查看上次成功快照时间。

---

## 三、AOF 详解

**作用：** 只追加写命令日志（读不记）。

**核心配置：**

```conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # always / no
appenddirname "appendonlydir"   # Redis 7+
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**Redis 7 文件结构：**

- `*.base.rdb`：基准快照（二进制）
- `*.incr.aof`：增量命令
- `*.manifest`：元信息

AOF 已内置 RDB 段，便于控制体积与重写。

![Redis 7 AOF 三文件结构：base.rdb、incr.aof、manifest](/中间件/redis/03/p08-01.png)

**协议示例：** `set k1 v1` 在 incr 文件中类似：

```
*3\r\n$3\r\nSET\r\n$2\r\nk1\r\n$2\r\nv1\r\n
```

`*3` 表 3 段，`$3` + `SET` 为第一段……理解协议可手写简易客户端。

**损坏恢复：** 手动破坏 incr 文件后重启失败，用 `redis-check-aof --fix appendonly.aof.1.incr.aof` 截断非法尾部。

![redis-check-aof --fix 修复损坏的 AOF 文件](/中间件/redis/03/p10-01.png)

**重写：** 后台 `BGREWRITEAOF` 合并多条 INCR 为 SET 等，生成新 base + incr。

---

## 四、混合持久化

```conf
aof-use-rdb-preamble yes
```

同时开 RDB + AOF 时，**重启优先用 AOF**（通常更完整）。仍建议**定期备份 RDB 文件**作离线灾备——AOF 持续变化，不便单独归档。

**局限：** 持久化只保**单机**；磁盘损坏仍丢数据 → 需主从/哨兵/Cluster（下两篇）。

---

## 小结

| 维度 | RDB | AOF |
|------|-----|-----|
| 粒度 | 时间点快照 | 命令级 |
| 体积 | 小 | 大 |
| 丢失窗口 | 较大 | 小（everysec） |
| 恢复 | 快 | 较慢（含混合后改善） |

生产常见：**appendonly yes + save 规则 + aof-use-rdb-preamble yes**。
