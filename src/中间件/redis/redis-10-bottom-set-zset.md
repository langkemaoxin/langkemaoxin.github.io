---
title: "Redis 底层结构——SET、ZSET 与课程收束"
sidebarGroup: "Redis"
shortTitle: "10 底层 SET/ZSET"
order: 10
date: 2026-10-07
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 10/10 篇**  
> 上一篇：[09 底层 String/Hash/List](/中间件/redis/redis-09-bottom-string-hash-list)

---

## 场景：收束全系列

Set 去重、ZSet 排行——底层如何用 **intset / listpack / hashtable / skiplist** 自适应？本篇完结 Redis 10 篇系列，并回答「Redis 为什么快」。

---

## 一、List 回顾（衔接）

quicklist 结合链表与 listpack，Redis 7 节点内为 listpack。

![quicklist 整体结构回顾](/中间件/redis/09/p20-01.png)

![listpack 在 quicklist 节点中的位置](/中间件/redis/09/p20-02.png)

---

## 二、Set 详解

**结论：** **intset + listpack + hashtable** 组合；元素为 `<member, null>` 形式。

```conf
set-max-intset-entries 512      # 全为整数且在 64 位范围内 → intset
set-max-listpack-entries 128
set-max-listpack-value 64
```

```redis
sadd s1 1 2 3 4 5
OBJECT ENCODING s1    # intset
sadd s2 a b c d e
OBJECT ENCODING s2    # listpack
# 超 listpack 阈值 → hashtable
```

### intset

紧凑有序整数数组（intset.h），省内存。

### 转换逻辑

`sadd` → `setTypeAdd`：创建时按元素是否全整数选 intset 或 listpack；添加过程中超阈值升 **hashtable**。

![sadd 入口 setTypeAdd 编码判断](/中间件/redis/09/p23-01.png)

![Set 创建时 intset 与 listpack 分支](/中间件/redis/09/p23-02.png)

![Set 添加元素触发 encoding 升级逻辑](/中间件/redis/09/p24-01.png)

![set-max-* 配置与 encoding 转换关系](/中间件/redis/09/p24-02.png)

---

## 三、ZSet 详解

**结论：** 元素少 → **listpack**（member + score 紧凑存）；元素多 → **skiplist + hashtable**（dict 存 member→score，跳表按 score 排序）。

```conf
zset-max-listpack-entries 128
zset-max-listpack-value 64
```

```redis
zadd z1 80 a
OBJECT ENCODING z1    # listpack
zadd z2 80 a 90 b 91 c 95 d   # 超 entries → skiplist
OBJECT ENCODING z2    # skiplist
```

### skiplist 跳表

单链表查找 O(N)；跳表多层索引，查找 **O(log N)**，空间 **O(N)**，**读多写少**合适（维护索引有写成本）。

![跳表多层索引结构示意](/中间件/redis/09/p26-01.png)

![跳表查找路径与复杂度分析](/中间件/redis/09/p26-02.png)

### 转换

`zadd` → `zaddGenericCommand` → 超阈值从 listpack 转 skiplist。

![zaddGenericCommand 处理流程](/中间件/redis/09/p27-01.png)

![ZSet 超阈值升级为 skiplist+dict](/中间件/redis/09/p27-02.png)

![skiplist 与 dict 在 ZSet 中的分工](/中间件/redis/09/p28-01.png)

**ZSet 总结：** 小 listpack，大 skiplist；两参数控切换。

---

## 四、全类型对照表（Redis 7）

| 类型 | 底层 |
|------|------|
| string | SDS（int/embstr/raw） |
| hash | listpack / hashtable |
| list | listpack / quicklist |
| set | intset / listpack / hashtable |
| zset | listpack / skiplist+hashtable |

![Redis7 五种类型底层结构总表](/中间件/redis/09/p30-01.png)

![Redis6 与 Redis7 底层差异（ziplist→listpack）](/中间件/redis/09/p30-02.png)

---

## 五、Redis 为什么快？（开放题）

无标准答案，常见维度：

- **内存存储** + 高效数据结构（SDS、跳表、listpack…）  
- **单线程命令** + IO 多路复用，无锁竞争  
- **渐进式 rehash**、lazy free、后台持久化  
- **集群分片**水平扩展  

![Redis 高性能多维度原因归纳](/中间件/redis/09/p31-01.png)

![内存、单线程、持久化、集群协同示意](/中间件/redis/09/p31-02.png)

但 Redis 的价值不仅是「快」：**缓存、分布式锁、NoSQL、向量搜索、Stack 扩展**——在复杂业务中**选对类型、部署与原子性方案**才是基本功。

---

## 六、系列回顾

| 篇 | 主题 |
|----|------|
| 01 | 单机 / 主从 / 哨兵 / Cluster 部署 |
| 02 | 核心数据结构实战 |
| 03 | 线程模型与原子性（Lua/Function） |
| 04 | RDB / AOF 持久化 |
| 05 | 主从与 Sentinel |
| 06 | Cluster 槽位与安全 |
| 07 | 穿透击穿雪崩与规范 |
| 08 | Redis Stack 扩展 |
| 09–10 | 底层结构 |

![Redis 系列十篇知识地图](/中间件/redis/09/p33-01.png)

![从安装到源码的学习路径建议](/中间件/redis/09/p33-02.png)

![生产实践检查清单：部署、缓存、BigKey、持久化](/中间件/redis/09/p33-03.png)

---

## 结语

理解 `OBJECT ENCODING` 背后的 **编码升级路径**，面试与排障都会更从容。系列完结——愿你的 Redis 又稳又快。

![Redis 课程总结：理解深度与实战并重](/中间件/redis/09/p34-01.png)
