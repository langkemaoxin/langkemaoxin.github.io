---
title: "ES 集群生产实践与性能调优"
sidebarGroup: "Elasticsearch"
shortTitle: "09 生产实践与调优"
order: 9
date: 2026-10-28
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 9/10 篇**  
> 上一篇：[《Elasticsearch 高可用集群架构》](/中间件/elasticsearch/es-08-cluster)  
> 下一篇预告：[《ELK 日志体系与 MySQL 到 ES 一致性》](/中间件/elasticsearch/es-10-elk-sync)

---

## 开头：场景与目标

上线前要问：节点角色怎么分？冷热数据怎么放？读写怎么调优？本篇覆盖节点角色、Hot-Warm 架构、跨集群搜索、容量规划，以及底层读写原理与性能优化。

---

## 一、节点角色（7.9+）

ES 8.x 默认节点承担多种角色。集群 > 6 节点时，建议**职责分离**：

```yaml
# 专用 Master（低配置）
node.roles: [master]
node.master: true

# 专用 Data（高 CPU/内存/磁盘）
node.roles: [data]

# 专用 Ingest（数据预处理）
node.roles: [ingest]

# 专用 Coordinating（无 data/master 角色）
node.roles: []
```

| 角色 | 职责 | 硬件建议 |
|------|------|----------|
| Master | 集群状态、元数据 | 低配置 |
| Data | 存储、索引、查询 | 高 CPU/RAM/磁盘 |
| Ingest | Pipeline 预处理 | 高 CPU |
| Coordinating | 路由、聚合 reduce | 高 CPU/RAM |

**何时扩容**：

- 磁盘不足 → 加 Data 节点
- 复杂聚合 OOM → 加 Coordinating 节点
- 写入瓶颈 → 加 Data 节点或优化 bulk

---

## 二、Hot-Warm 冷热架构

适用：**时序数据**（日志、指标），热数据高频读写，冷数据只读归档。

| 节点 | 硬件 | 数据 |
|------|------|------|
| Hot（SSD） | 高配置 | 近期索引，持续写入 |
| Warm（HDD） | 大容量低配置 | 历史索引，只读 |

### 2.1 标记节点

```yaml
# hot 节点
node.attr.my_node_type: hot

# warm 节点
node.attr.my_node_type: warm
```

```json
GET /_cat/nodeattrs?v
```

### 2.2 索引分配到 Hot

```json
PUT /index-2024-08
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 0,
    "index.routing.allocation.require.my_node_type": "hot"
  }
}
```

### 2.3 迁移到 Warm

```json
PUT /index-2024-08/_settings
{
  "index.routing.allocation.require.my_node_type": "warm"
}

GET /_cat/shards/index-2024-08?v
```

| 规则 | 含义 |
|------|------|
| `require.{attr}` | 必须包含所有指定值 |
| `include.{attr}` | 至少包含一个 |
| `exclude.{attr}` | 不能包含任何 |

---

## 三、跨集群搜索（CCS）

单集群节点数有上限（Master 更新压力）。ES 5.3+ 推荐 **Cross Cluster Search** 替代 Tribe Node。

```json
PUT _cluster/settings
{
  "persistent": {
    "cluster": {
      "remote": {
        "cluster_b": {
          "seeds": ["192.168.1.10:9300"]
        }
      }
    }
  }
}

GET /cluster_b:index-*/_search
{
  "query": { "match_all": {} }
}
```

---

## 四、容量规划

| 指标 | 经验值 |
|------|--------|
| 单分片大小 | 10~50 GB（日志可更大） |
| JVM Heap | ≤ 31 GB；不超过物理内存 50% |
| 副本数 | 生产至少 1；读多可加 |
| 磁盘预留 | 不超过 85%（超过易 Yellow/拒绝写入） |

分片数规划：

```
所需主分片数 ≈ 总数据量 / 目标单分片大小
```

---

## 五、写入性能优化

1. **Bulk 批量**：每批 5~15 MB，1000~5000 条
2. **减少副本**：大批量导入时临时设 `number_of_replicas: 0`，完成后恢复
3. **refresh_interval**：导入期间设为 `-1` 或 `30s`，完成后改回 `1s`
4. **禁用不必要的 _source 字段**或使用 `doc_values`
5. **Ingest Pipeline** 预处理放专用 Ingest 节点

```json
PUT /my_index/_settings
{
  "index": {
    "refresh_interval": "-1",
    "number_of_replicas": 0
  }
}
```

---

## 六、查询性能优化

1. **filter 代替 query**：过滤条件放 `bool.filter`（不计分、可缓存）
2. **避免深度分页**：用 search_after
3. **控制聚合 cardinality**：高基数 field 慎用 `terms` agg
4. **路由**：相同 routing 的文档落同一分片，减少 scatter-gather
5. **预热**：`/_cache/clear` 后首次查询较慢，可预热关键查询

```json
GET /my_index/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "status": "active" } },
        { "range": { "date": { "gte": "now-7d" } } }
      ]
    }
  }
}
```

---

## 七、读写原理简述

**写入路径**：协调节点 → 路由到主分片 → 写 Lucene → 同步副本 → refresh 可见

**查询路径**：协调节点 → 广播到各分片 → 各分片查询/聚合 → 协调节点 merge 排序

理解此路径有助于定位慢查询是**分片过多**还是**聚合过重**。

---

## 小结

- 大集群：**角色分离** + **Hot-Warm** 降本增效。
- 写入调 bulk/refresh/replicas；查询调 filter/search_after/聚合粒度。
- CCS 解决多集群统一检索，避免无限堆节点。

下一篇：[《ELK 日志体系与 MySQL 到 ES 一致性》](/中间件/elasticsearch/es-10-elk-sync)
