---
title: "Redis 底层结构——String、Hash、List"
sidebarGroup: "Redis"
shortTitle: "09 底层 String/Hash/List"
order: 9
date: 2026-10-06
category: "中间件"
tag:
  - "Redis"
  - "中间件"
---

> **Redis 系列 · 第 9/10 篇**  
> 上一篇：[08 Redis Stack](/中间件/redis/redis-08-stack) · 下一篇：[10 底层 SET/ZSET](/中间件/redis/redis-10-bottom-set-zset)

---

## 场景：面试加深理解

应用层操作 `set k1 v1`，底层如何存？本文剖析 **redisObject**、String（int/embstr/raw）、Hash（listpack/hashtable）、List（listpack/quicklist）。源码基于 **Redis 7.2.5**；7 用 **listpack** 替代 ziplist。

**声明：** 目标在**面试与理解深度**，非重写 Redis；源码仅摘要点。

---

## 一、整体：redisObject

`OBJECT ENCODING key` 查看底层编码；`type key` 看应用层类型。

```redis
set k1 v1
OBJECT ENCODING k1    # "embstr"
```

**encoding 常量（server.h）：** RAW、INT、HT、EMBSTR、QUICKLIST、LISTPACK、INTSET、SKIPLIST 等；ZIPLIST 等已废弃。

**redisObject 结构：**

```c
struct redisObject {
    unsigned type:4;      // string/hash/list...
    unsigned encoding:4;  // int/embstr/raw/listpack...
    unsigned lru:LRU_BITS;
    int refcount;
    void *ptr;            // 指向真实数据结构
};
```

- **type**：应用类型  
- **encoding**：底层实现  
- **ptr**：实际数据  

**上层 vs 底层：非一一对应**

```redis
set k2 1        -> encoding int
set k3 <长字符串> -> encoding raw
```

同一 `string` 类型可有 int、embstr、raw 多种 encoding。

**DEBUG OBJECT**（需 `enable-debug-command yes`）可看 refcount、serializedlength 等。

**Redis 6 vs 7 底层对照（高频面试）：**

| 类型 | Redis 6 | Redis 7 |
|------|---------|---------|
| string | SDS | SDS |
| hash | hashtable+ziplist | hashtable+**listpack** |
| list | quicklist+ziplist | quicklist+**listpack** |
| set | intset+hashtable | intset+listpack+hashtable |
| zset | skiplist+ziplist | skiplist+**listpack** |

---

## 二、String 详解

**规则：**

| 条件 | encoding |
|------|----------|
| 可转 long 整数（≤20 位） | **int**，ptr 存整数 |
| 字符串且 len < 44 字节 | **embstr**，SDS 与 robj 连续分配 |
| 字符串 ≥ 44 字节 | **raw**，SDS 单独分配 |
| 0–999 小整数 | 共享缓存对象，免分配 |

源码：`setCommand` → `tryObjectEncodingEx`（object.c）。

![set 命令进入 tryObjectEncoding 编码选择流程](/中间件/redis/09/p08-01.png)

![tryObjectEncodingEx 中 int/embstr/raw 分支逻辑](/中间件/redis/09/p08-02.png)

### int

ptr 直接存整数；1000 以内用预建共享对象。

![int 编码共享整数对象池示意](/中间件/redis/09/p09-01.png)

### embstr

`createEmbeddedStringObject`：SDS **紧挨** redisObject 分配，读缓存友好。  
**注意：** APPEND 等修改会转 **raw**（SDS 不可变语义）。

![embstr 内嵌 SDS 连续内存布局](/中间件/redis/09/p10-01.png)

### SDS（Simple Dynamic String）

`sds.h`：按长度多种 header，`len` O(1) 取长度，避免 C 字符串 `\0` 歧义。

![SDS 结构：len、alloc、buf 字段](/中间件/redis/09/p11-01.png)

### raw

大字符串单独分配 SDS，ptr 指向。

![raw 编码 redisObject 与 SDS 分离分配](/中间件/redis/09/p12-01.png)

**String 总结：** 自适应 int / embstr / raw，对用户透明，节省内存与 CPU。

![String 三种 encoding 选型总结图](/中间件/redis/09/p13-01.png)

---

## 三、Hash 详解

**规则：** 元素少 → **listpack**；超阈值 → **hashtable**（只升不降）。

```conf
hash-max-listpack-entries 512   # 默认
hash-max-listpack-value 64      # 单值字节
```

```redis
hset user:1 id 1 name roy
OBJECT ENCODING user:1    # listpack
# 调小阈值或增大 field → hashtable
```

![Hash 在 listpack 与 hashtable 间转换实验](/中间件/redis/09/p14-01.png)

**存储结构：** field-value 序列 → **dictEntry** → **dict**（value 整体）。

`hset` → `hashTypeTryConversion` 按阈值选择编码。

![hashTypeTryConversion 编码转换入口](/中间件/redis/09/p16-01.png)

![hset 指令处理链路示意](/中间件/redis/09/p16-02.png)

### listpack 与 ziplist

**ziplist：** 紧凑连续内存 + 变长 entry（prev_len、encoding、content）。  
**连锁更新：** 前 entry 变长导致后续 prev_len 连锁扩容 → Redis 7 用 **listpack**（entry 记录**自身**长度，无连锁更新）。

![ziplist 紧凑结构与 entry 三部分](/中间件/redis/09/p17-01.png)

![ziplist 连锁更新问题示意](/中间件/redis/09/p17-02.png)

![listpack 结构：entry 自带长度避免连锁更新](/中间件/redis/09/p18-01.png)

![listpack.h 中 listpack 定义片段](/中间件/redis/09/p18-02.png)

**Hash 总结：**

1. 常态 **listpack**  
2. entries>512 或 value>64B → **hashtable**  
3. **不可逆**降级  

![Hash 底层 encoding 升级规则总结](/中间件/redis/09/p19-01.png)

![Hash listpack 与 hashtable 内存布局对比](/中间件/redis/09/p19-02.png)

---

## 四、List 详解

**默认 listpack**；数据量大 → **quicklist**。

```conf
list-max-listpack-size -2   # 负数表节点字节上限（-2≈8KB），正数表元素个数
list-compress-depth 0       # 两端不压缩，中间可 LZF 压缩
```

```redis
lpush l1 a1
OBJECT ENCODING l1    # listpack
# 调 list-max-listpack-size 2，push 多个元素 → quicklist
```

![List encoding 随 list-max-listpack-size 变化](/中间件/redis/09/p20-01.png)

![redis.conf 中 list-max-listpack-size 参数说明](/中间件/redis/09/p20-02.png)

**源码：** `lpush` → `createListListpackObject` → `listTypeTryConvertListpack` → 超阈值转 **quicklist**。

### quicklist

**动机：** 纯 listpack（数组）中间插入慢；纯链表检索慢 → **quicklist = 双向链表 + 每节点一个 listpack**。

![quicklist 链表节点各挂一个 listpack 示意图](/中间件/redis/09/p23-01.png)

![quicklistNode 结构：prev/next + entry 指向 listpack](/中间件/redis/09/p23-02.png)

![quick.h 中 quicklist 与 quicklistNode 定义](/中间件/redis/09/p24-01.png)

![quicklistNode->entry 指向 listpack 数据区](/中间件/redis/09/p24-02.png)

Redis 6 节点内为 ziplist，7 改为 listpack。

**List 总结：** 小 listpack，大 quicklist；参数控制切换阈值。

---

## 小结

- 一切皆 **redisObject**，encoding + ptr 多态  
- **String**：int / embstr / raw + SDS  
- **Hash**：listpack ↔ hashtable（阈值触发，不降级）  
- **List**：listpack ↔ quicklist（结合数组与链表优点）

下一篇：Set、ZSet 与系列收束。
