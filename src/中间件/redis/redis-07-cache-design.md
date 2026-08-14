---
title: "缓存穿透击穿雪崩与多级缓存"
sidebarGroup: "Redis"
shortTitle: "07 缓存设计与优化"
order: 7
date: 2026-10-04
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 7/10 篇**  
> 上一篇：[06 Cluster 集群](/中间件/redis/redis-06-cluster) · 下一篇：[08 Redis Stack](/中间件/redis/redis-08-stack)

---

## 场景：缓存是把双刃剑

活动秒杀、热点商品、恶意爬虫——缓存设计不当会把 DB 打穿。本文梳理**穿透 / 击穿 / 雪崩**、双写一致、键值规范、连接池与内核调优。

---

## 一、多级缓存架构

典型链路：**浏览器 → CDN → Nginx 本地缓存 → Redis → DB**。越靠近用户越快，越靠近 DB 越权威。

![多级缓存架构：CDN、网关、Redis、数据库分层](/中间件/redis/05/p01-01.png)

---

## 二、缓存穿透

查询**不存在**的数据，缓存与 DB 都不命中，每次打到 DB。

**原因：** 业务 bug、恶意攻击/爬虫。

![缓存穿透：请求绕过缓存直达数据库](/中间件/redis/05/p02-01.png)

**方案 1：缓存空对象**

```java
if (storageValue == null) {
    cache.set(key, "");
    cache.expire(key, 60 * 5);
}
```

**方案 2：布隆过滤器**

多个 hash 映射到位数组；**说不存在则一定不存在**，说存在可能误判。适合**数据集相对固定、实时性要求低**的大集合。

Redisson 示例：

```java
RBloomFilter<String> bloomFilter = redisson.getBloomFilter("nameList");
bloomFilter.tryInit(100000000L, 0.03);
bloomFilter.add("zhuge");
bloomFilter.contains("guojia"); // false
```

**组合伪代码：** 先 `bloomFilter.contains(key)`，再查缓存，再查 DB；**布隆过滤器不能删元素**，删数据需重建。

![布隆过滤器 + 缓存 + DB 三级查询流程](/中间件/redis/05/p06-01.png)

![布隆过滤器在缓存层的部署位置示意](/中间件/redis/05/p06-02.png)

---

## 三、缓存击穿（失效）

**热点 key** 在过期瞬间，大量请求同时穿透到 DB。

**方案：** 过期时间加**随机抖动**（如 300–600 秒随机），避免同一批 key 同时失效。

![批量 key 同时过期导致击穿示意](/中间件/redis/05/p07-01.png)

---

## 四、缓存雪崩

缓存层**整体不可用**或**大量同时过期**，流量涌向 DB 导致级联宕机。

**预防：**

1. 缓存高可用：Sentinel / Cluster  
2. 限流熔断：Sentinel、Hystrix；非核心数据降级返回默认值  
3. **提前演练**缓存宕机预案  

---

## 五、热点 key 重建

**问题：** 热点 key 过期 + 重建慢（复杂 SQL）→ 大量线程同时重建。

**互斥锁：**

```java
String mutexKey = "mutex:key:" + key;
if (redis.set(mutexKey, "1", "ex 180", "nx")) {
    value = db.get(key);
    redis.setex(key, timeout, value);
    redis.delete(mutexKey);
} else {
    Thread.sleep(50);
    return get(key);
}
```

只允许一个线程重建，其他等待或重试。

---

## 六、缓存与 DB 双写不一致

并发读写缓存与 DB 可能出现短暂不一致。

**思路：**

1. 低并发个人数据：过期时间 + 偶尔不一致可接受  
2. 可容忍短时不一致：TTL  
3. 强一致：分布式读写锁排队  
4. **Canal** 监听 binlog 异步更新缓存（增组件）  
5. **写多读少且不容忍不一致**：可不加缓存，或**缓存作主存异步落库**

**原则：** 缓存放**实时性、一致性要求不高**的数据；勿为绝对一致过度设计。

---

## 七、开发规范与性能优化

### 键值设计

- **Key：** `业务:表:id`，冒号分隔；控制长度；禁特殊字符  
- **Value：** 拒绝 BigKey（string >10KB，hash/list/set/zset 元素 >5000）  
- BigKey 删除用 `HSCAN/SSCAN/ZSCAN` 渐进删，慎用对大 zset 设短 TTL 触发同步 DEL  

**BigKey 危害：** 阻塞 Redis、网卡打满、过期同步删除阻塞。

**优化：** 拆 key；避免 `HGETALL` 大 hash；用 `UNLINK` 异步删。

### 命令

- 慎用 O(N)：`HGETALL`、`LRANGE 0 -1`、`SMEMBERS` → 用 SCAN 系列  
- 禁用 `KEYS`、`FLUSHALL`（rename 或 SCAN）  
- 批量：`MGET/MSET`、Pipeline（控制单次条数，非原子）  
- 事务弱，复杂逻辑用 **Lua**

### 客户端

- 多应用**拆分实例**或逻辑库，避免共用一个 Redis  
- **连接池**（JedisPool / Lettuce）：`maxTotal`、`maxIdle` 按 QPS 估算（例：1ms/命令 → 单连接约 1000 QPS，5 万 QPS 约需 50 连接，再留余量）  
- 启动**预热** minIdle 连接  

### 内存淘汰

`maxmemory-policy` 推荐 **`volatile-lru`**（对有过期 key）；Redis 4.0+ 共 8 种策略（volatile/allkeys × lru/lfu/random/ttl，及 noeviction）。

主从模式下**只有主节点**执行过期删除。

### 内核参数

```bash
echo 1 > /proc/sys/vm/swappiness          # 内核>=3.5 时避免 OOM kill Redis
echo vm.overcommit_memory=1 >> /etc/sysctl.conf  # fork 成功
ulimit -n 65535
```

### 慢查询

```conf
slowlog-log-slower-than 1000   # 微秒，生产可设 1000=1ms
slowlog-max-len 1024
```

---

## 小结

| 问题 | 核心手段 |
|------|----------|
| 穿透 | 空值缓存、布隆过滤器 |
| 击穿 | 互斥重建、逻辑过期 |
| 雪崩 | 高可用、随机 TTL、限流、演练 |
| 一致 | TTL / 锁 / Canal，按业务容忍度选型 |
| 性能 | 禁 BigKey、Pipeline、连接池、内核调优 |
