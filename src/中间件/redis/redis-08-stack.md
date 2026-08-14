---
title: "Redis Stack——JSON、Search、Bloom、Cuckoo"
sidebarGroup: "Redis"
shortTitle: "08 Redis Stack"
order: 8
date: 2026-10-05
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 8/10 篇**  
> 上一篇：[07 缓存设计与优化](/中间件/redis/redis-07-cache-design) · 下一篇：[09 底层 String/Hash/List](/中间件/redis/redis-09-bottom-string-hash-list)

---

## 场景：Redis 不止 K-V

登录态 JSON、商品多维搜索、海量去重——Redis Stack 在 OSS 上叠加 **JSON、Search、Bloom、Cuckoo** 等模块。本文基于 Redis Cloud 免费实例体验，并说明本地加载与 Java 调用。

---

## 一、产品矩阵

| 产品 | 说明 |
|------|------|
| Redis OSS | 开源核心 |
| Redis Stack | OSS + 扩展模块 |
| Redis Cloud | 托管云服务 |
| Redis Insight | 官方 GUI 客户端 |
| Redis Enterprise | 企业版 |

![Redis 官网产品线：OSS、Stack、Cloud、Enterprise](/中间件/redis/07/p02-01.png)

---

## 二、Redis Cloud 快速体验

官网注册 Cloud → 分配免费 Stack 实例 → 命令行连接（空间有限、不宜长期使用，付费约 $5/月起）。

![Redis Cloud 注册与免费实例创建流程](/中间件/redis/07/p03-01.png)

![Cloud 控制台连接信息与 redis-cli 连接](/中间件/redis/07/p04-01.png)

![免费实例限制与 module list 查看已加载模块](/中间件/redis/07/p04-02.png)

---

## 三、Redis Stack 扩展一览

官网 Commands 页按组检索；服务端 `MODULE LIST` 查看已加载模块。

---

## 四、Redis JSON

**是什么：** 原生 JSON 类型，二进制存储，树形结构快速访问子路径。

```redis
JSON.SET user $ '{"name":"admin","age":18}'
JSON.GET user
JSON.GET user $.name
JSON.TYPE user $.age          # integer
JSON.NUMINCRBY user $.age 2
JSON.SET user $.address '{"city":"Changsha"}' NX
JSON.ARRAPPEND user $.hobbies '"swimming"'
JSON.DEL user $.address
```

![JSON.SET/GET 与路径 $. 操作示例](/中间件/redis/07/p07-01.png)

**优势：**

- 比 string 存 JSON 性能更高、更省内存（官方对比 MongoDB/ES）  
- 与 TTL、事务、Pub/Sub、Lua 无缝集成  
- 典型：分布式 Session、复杂对象缓存  

![Redis JSON 与 string 存 JSON 的性能与结构对比](/中间件/redis/07/p09-01.png)

---

## 五、Search And Query

生产禁用 `KEYS *`；渐进用 **SCAN**。复杂过滤（品牌、价格区间）需 **RediSearch**。

**SCAN：**

```redis
SCAN 0 MATCH k* COUNT 20
SSCAN / HSCAN / ZSCAN  # 按类型
```

**RediSearch（基于 JSON 或 Hash）：**

```redis
FT.CREATE productIndex ON JSON SCHEMA $.name AS name TEXT $.price AS price NUMERIC
JSON.SET phone:1 $ '{"id":1,"name":"HUAWEI 1","price":1999}'
FT.SEARCH productIndex "@name:HUAWEI @price:[1000 5000]" RETURN 2 id name
FT.INFO productIndex
```

可视为 ES 的轻量替代，减少数据搬迁。

![商品 JSON 数据与搜索结果返回](/中间件/redis/07/p12-01.png)

---

## 六、Bloom Filter（RedisBloom）

**原理：** 位数组 + 多 hash；**不存在必不存在**，存在可能误判；**不能删元素**。

Guava：

```java
BloomFilter<String> bf = BloomFilter.create(
    Funnels.stringFunnel(StandardCharsets.UTF_8), 10000, 0.01);
```

**Redis 命令：**

```redis
BF.RESERVE bf 0.01 1000 NONSCALING
BF.ADD bf A
BF.MADD bf B C D
BF.EXISTS bf a        # 0 不存在 1 可能存在
BF.INFO bf
BF.SCANDUMP bf 0      # 迭代位数组，配合 BF.LOADCHUNK 备份
```

典型：防穿透、用户名是否存在前置过滤。

---

## 七、Cuckoo Filter

布隆过滤器**不能删**；**Cuckoo Filter** 支持 `CF.DEL`，同误报率下空间 often 更小，算法更复杂。

```redis
CF.RESERVE cf 1000 BUCKETSIZE 2 MAXITERATIONS 20 EXPANSION 1
CF.ADD / CF.EXISTS / CF.DEL
```

BUCKETSIZE 默认 2；越大利用率越高但误判率上升。

---

## 八、本地安装与 Java 调用

**加载模块：**

```conf
loadmodule /path/redisbloom.so
```

`MODULE LIST` 验证；`.so` 需可执行权限，否则启动失败。

![loadmodule 配置与 MODULE LIST 验证](/中间件/redis/07/p12-01.png)

**Java：** 多数客户端尚未原生封装 Stack，可用 **Lua** 调 `BF.*`，并 catch「命令不存在」：

```java
DefaultRedisScript<String> script = new DefaultRedisScript<>(
    "return redis.call('BF.RESERVE', KEYS[1], '0.01','1000','NONSCALING')", String.class);
redisTemplate.execute(script, List.of("a-bf"));
```

---

## 小结

| 模块 | 用途 |
|------|------|
| RedisJSON | 结构化文档、Session |
| RediSearch | 全文/多维检索 |
| Bloom / Cuckoo | 海量存在性判断、防穿透 |
| SCAN | 安全遍历 key |

Stack 适合**已在 Redis 上想少引组件**的场景；超大规模搜索仍可能选 ES 等专业引擎。
