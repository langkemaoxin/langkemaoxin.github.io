---
title: "Redis 7 核心数据结构实战"
sidebarGroup: "Redis"
shortTitle: "02 核心数据结构"
order: 2
date: 2026-09-29
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 2/10 篇**  
> 上一篇：[01 安装与部署形态](/中间件/redis/redis-01-install) · 下一篇：[03 线程模型与原子性](/中间件/redis/redis-03-threading)

---

## 场景：选对结构，少踩坑

用户会话、购物车、排行榜、签到、附近门店——不同业务对应不同 Redis 类型。本文按 String / Hash / List / Set / ZSet / Bitmap / HyperLogLog / Geo / Stream 梳理常用命令与典型场景，并补充 Spring Boot 集成要点。

---

## 一、Redis 7 数据结构概览

Redis 7 分**核心版**与**扩展版**；不确定命令时，`help` 是最好用的入口。

![Redis7 核心数据结构实战版封面](/中间件/redis/01b/p01-01.png)

![Redis7 数据结构核心版与扩展版划分](/中间件/redis/01b/p01-02.png)

![Redis7 数据结构全景分类图](/中间件/redis/01b/p01-03.png)

![Redis 命令 help 帮助系统示意](/中间件/redis/01b/p01-04.png)

![help 命令查看各命令组入口](/中间件/redis/01b/p02-01.png)

![核心数据结构命令分组一览](/中间件/redis/01b/p02-02.png)

![扩展数据结构命令分组一览](/中间件/redis/01b/p02-03.png)

---

## 二、String

**常用操作：**

```redis
SET key value
MSET key value [key value ...]
SETNX key value          # 不存在才写入
GET key / MGET key [...]
DEL key [...]
EXPIRE key seconds
INCR / DECR / INCRBY / DECRBY
```

![String 常用读写与原子加减命令](/中间件/redis/01b/p03-02.png)

**典型场景：**

| 场景 | 写法 |
|------|------|
| 单值缓存 | `SET key value` / `APPEND` |
| 对象缓存 | `SET user:1 '{"name":"roy","balance":1888}'` 或 `MSET user:1:name roy user:1:balance 1888` |
| 分布式锁 | `SETNX product:10001 true`；业务后 `DEL`；防死锁：`SET product:10001 true ex 10 nx` |

![String 单值缓存、对象缓存与分布式锁示例](/中间件/redis/01b/p04-02.png)

---

## 三、Hash

**常用操作：** `HSET` / `HSETNX` / `HMSET` / `HGET` / `HMGET` / `HDEL` / `HLEN` / `HGETALL` / `HINCRBY`

![Hash 常用命令列表](/中间件/redis/01b/p06-02.png)

**对象缓存：**

```redis
HSET user:1 name roy balance 1888
HMGET user:1 name balance
```

![Hash 存储用户对象字段示例](/中间件/redis/01b/p07-02.png)

**电商购物车：** 用户 id 为 key，商品 id 为 field，数量为 value。

```redis
HSET cart:1001 10088 1
HINCRBY cart:1001 10088 1
HLEN cart:1001
HDEL cart:1001 10088
HGETALL cart:1001
```

![Hash 实现购物车增删改查](/中间件/redis/01b/p08-02.png)

**优缺点：**

- 优点：同类数据归类、比 String 省内存与 CPU
- 缺点：过期只能设在 key 上；Cluster 下大规模 Hash 不合适

---

## 四、List

**常用操作：** `LPUSH` / `RPUSH` / `LPOP` / `RPOP` / `LRANGE` / `BLPOP` / `BRPOP`

![List 双端 push/pop 与阻塞 pop 命令](/中间件/redis/01b/p10-02.png)

**数据结构组合：**

- 栈：`LPUSH + LPOP`
- 队列：`LPUSH + RPOP`
- 阻塞队列：`LPUSH + BRPOP`

应用：视频列表、签到列表、简化版 MQ、排队机。

![List 栈/队列/阻塞队列实现方式](/中间件/redis/01b/p11-02.png)

**注意：** 容量约 2³²−1 元素，但要警惕 **BigKey**；中间节点按索引访问性能低（底层双向链表）。

![List 容量与中间节点访问性能注意点](/中间件/redis/01b/p12-02.png)

---

## 五、Set

**常用操作：** `SADD` / `SREM` / `SMEMBERS` / `SCARD` / `SISMEMBER` / `SRANDMEMBER` / `SPOP`

**集合运算：** `SINTER` / `SINTERSTORE` / `SUNION` / `SUNIONSTORE` / `SDIFF` / `SDIFFSTORE`

![Set 基础命令与交并差运算](/中间件/redis/01b/p13-02.png)

**抽奖小程序：**

```redis
SADD key {userId}      # 参与
SMEMBERS key           # 全部参与者
SRANDMEMBER key [count] / SPOP key [count]  # 抽奖
```

![Set 实现抽奖参与与开奖](/中间件/redis/01b/p14-02.png)

**点赞/收藏/标签：**

```redis
SADD like:{msgId} {userId}
SREM like:{msgId} {userId}
SISMEMBER like:{msgId} {userId}
SMEMBERS like:{msgId}
SCARD like:{msgId}
```

![Set 实现点赞、取消赞与计数](/中间件/redis/01b/p15-02.png)

**社交关系：** `SINTER` 共同关注、`SUNION` 朋友圈、`SDIFF` 推荐好友。

![Set 交集并集差集在社交场景的应用](/中间件/redis/01b/p16-02.png)

---

## 六、ZSet（有序集合）

**常用操作：** `ZADD` / `ZREM` / `ZSCORE` / `ZINCRBY` / `ZCARD` / `ZRANGE` / `ZREVRANGE` / `ZUNIONSTORE` / `ZINTERSTORE`

![ZSet 增删改查与有序范围查询命令](/中间件/redis/01b/p17-02.png)

**排行榜：**

```redis
ZINCRBY hotNews:20190819 1 守护香港
ZREVRANGE hotNews:20190819 0 9 WITHSCORES
ZUNIONSTORE hotNews:20190813-20190819 7 hotNews:20190813 ... hotNews:20190819
ZREVRANGE hotNews:20190813-20190819 0 9 WITHSCORES
```

![ZSet 热点新闻日榜与七日聚合榜](/中间件/redis/01b/p18-02.png)

---

## 七、Bitmap

**命令：** `SETBIT` / `GETBIT` / `BITCOUNT` / `BITPOS` / `BITOP`

**每日签到：**

```redis
SETBIT dailycheck:1 100 1
BITCOUNT dailycheck:1
BITPOS dailycheck:1 1
```

优点：快速、省空间。

![Bitmap 签到统计与位操作命令](/中间件/redis/01b/p19-01.png)

---

## 八、HyperLogLog

统计集合**基数**（去重计数），典型场景：UV 统计。

```redis
PFADD visitlog 192.168.65.111 192.168.65.112
PFCOUNT visitlog
PFMERGE destkey sourcekey [...]
```

![HyperLogLog 独立访客统计命令](/中间件/redis/01b/p20-01.png)

---

## 九、Geo

**命令：** `GEOADD` / `GEOPOS` / `GEODIST` / `GEORADIUS` / `GEOSEARCH`

```redis
GEOADD changsha 113.017489 28.200454 火车站 112.96903 28.201195 橘子洲 ...
GEODIST changsha 火车站 橘子洲 M
GEORADIUSBYMEMBER changsha 火车站 2 KM withdist withcoord count 4
```

经纬度可从地图 API 获取。

---

## 十、Stream（了解）

Redis 版轻量 MQ：`XADD` / `XDEL` / `XLEN` / `XRANGE` + 消费者组 `XGROUP CREATE` / `XREADGROUP`。

```redis
XADD mystream * name admin name roy
XGROUP CREATE mystream groupA 0
XREADGROUP GROUP groupA consumer1 count 2 STREAMS mystream >
XPENDING mystream groupA
```

企业级 MQ 场景仍更常用 Kafka/RocketMQ；Stream 适合简单队列。

![Stream 生产者与消费者组基本用法](/中间件/redis/01b/p22-01.png)

![Stream 消费进度 XPENDING 查看](/中间件/redis/01b/p23-01.png)

![Stream 与 List 作为 MQ 的对比说明](/中间件/redis/01b/p24-01.png)

---

## 十一、Spring Boot 集成

**依赖：**

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

**配置：**

```yaml
spring:
  data:
    redis:
      host: 192.168.65.214
      port: 6379
      password: 123qweasd
```

**RedisTemplate 按类型操作：**

```java
@Resource
private RedisTemplate<String, Object> redisTemplate;

redisTemplate.opsForValue()...   // String
redisTemplate.opsForHash()...    // Hash
redisTemplate.opsForList()...    // List
redisTemplate.opsForSet()...     // Set
redisTemplate.opsForZSet()...    // ZSet
redisTemplate.opsForGeo()...
redisTemplate.opsForHyperLogLog()...
redisTemplate.opsForStream()...
redisTemplate.opsForValue().setBit()  // Bitmap 无独立 ops
```

**中文乱码：** 统一 Key/Value 序列化器，例如 String 序列化 Key，GenericToStringSerializer 序列化 Value。

**RedisTemplate 配置示例：**

```java
@Configuration
public class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        StringRedisSerializer str = new StringRedisSerializer();
        template.setKeySerializer(str);
        template.setHashKeySerializer(str);
        GenericToStringSerializer<Object> val = new GenericToStringSerializer<>(Object.class);
        template.setValueSerializer(val);
        template.setHashValueSerializer(val);
        template.afterPropertiesSet();
        return template;
    }
}
```

---

## 小结

- 缓存/锁/计数 → **String**；对象/购物车 → **Hash**；队列/栈 → **List**
- 去重/标签/关系 → **Set**；排行榜 → **ZSet**；签到 → **Bitmap**；UV → **HyperLogLog**；LBS → **Geo**
- 理解场景比死记命令更重要：**理解 → 熟练 → 记忆**
