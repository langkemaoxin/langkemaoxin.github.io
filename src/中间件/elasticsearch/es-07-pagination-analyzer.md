---
title: "深度分页问题与自定义分词"
sidebarGroup: "Elasticsearch"
shortTitle: "07 深分页与分词"
order: 7
date: 2026-10-26
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 7/10 篇**  
> 上一篇：[《Spring Boot 整合 ES 与商品搜索实战》](/中间件/elasticsearch/es-06-springboot-search)  
> 下一篇预告：[《Elasticsearch 高可用集群架构》](/中间件/elasticsearch/es-08-cluster)

---

## 开头：场景与目标

翻到第 1000 页为什么越来越慢？中文为什么必须分词？本篇剖析 from+size 深度分页陷阱，对比 scroll / search_after，并深入 IK 与自定义 Analyzer。

![深度分页与协调节点排序流程](/中间件/elasticsearch/46-12/p01-01.png)

---

## 一、深度分页原理与问题

分布式查询流程：

1. 各分片执行查询，返回**有序的前 N 条**给协调节点
2. 协调节点**二次排序**，取全局前 N 条返回客户端

要查第 10001~10100 条，每个分片仍需取出前 10100 条参与排序——**翻页越深，内存与 CPU 开销越大**，易引发 OOM。

---

## 二、from + size

```json
GET /employee/_search
{
  "query": { "match_all": {} },
  "from": 0,
  "size": 10
}
```

| 优点 | 缺点 |
|------|------|
| 支持随机跳页 | 受 `max_result_window` 限制（默认 10000） |
| 实现简单 | 深度分页性能急剧下降 |

当 `from + size > 10000` 时报错：

```
Result window is too large, from + size must be less than or equal to: [10000]
```

**不推荐**调大 `index.max_result_window` 作为生产方案——只是推迟 OOM。

---

## 三、scroll 全量遍历

适合**离线导出、Reindex 源数据**，不适合用户实时翻页。

```json
POST /employee/_search?scroll=1m
{
  "size": 100,
  "query": { "match_all": {} }
}

POST /_search/scroll
{
  "scroll": "1m",
  "scroll_id": "<scroll_id>"
}

DELETE /_search/scroll
{ "scroll_id": "<scroll_id>" }
```

| 优点 | 缺点 |
|------|------|
| 可遍历全量数据 | 非实时；占用堆内存保存上下文 |
| 单次 size 仍 ≤ max_result_window | 7.x 起已标记 deprecated，推荐 PIT + search_after |

---

## 四、search_after（推荐深分页）

基于**上一页最后一条的 sort 值**向后翻，性能稳定。

```json
GET /employee/_search
{
  "size": 10,
  "query": { "match_all": {} },
  "sort": [
    { "age": "desc" },
    { "_id": "asc" }
  ]
}

GET /employee/_search
{
  "size": 10,
  "query": { "match_all": {} },
  "sort": [
    { "age": "desc" },
    { "_id": "asc" }
  ],
  "search_after": [32, "6"]
}
```

**注意**：sort 字段必须唯一（通常加 `_id`）；只支持**向后翻页**，适合 Feed 流、移动端无限滚动。

### Point in Time（PIT）

防止翻页期间索引变更导致重复/遗漏：

```json
POST /employee/_pit?keep_alive=5m

GET /_search
{
  "size": 10,
  "query": { "match_all": {} },
  "pit": { "id": "<pit_id>", "keep_alive": "5m" },
  "sort": [{ "age": "desc" }, { "_id": "asc" }],
  "search_after": [28, "2"]
}
```

---

## 五、三种分页对比

| 方式 | 性能 | 优点 | 缺点 | 适用 |
|------|------|------|------|------|
| from + size | 低 | 随机跳页 | 深度分页慢；≤10000 | PC 搜索前 1000 页 |
| scroll | 中 | 全量遍历 | 非实时；占内存 | 数据导出 |
| search_after | 高 | 可无限向后翻 | 不能随机跳页 | 移动端 Feed、深分页 |

---

## 六、Analyzer 与分词

### 6.1 分析器组成

Analyzer = **Character Filter** → **Tokenizer** → **Token Filter**

```json
POST _analyze
{
  "analyzer": "standard",
  "text": "The 2 QUICK Brown-Foxes jumped over the lazy dog's bone."
}
```

| 内置 Analyzer | 说明 |
|---------------|------|
| standard | 按词切分，小写化 |
| simple | 非字母切分 |
| whitespace | 空格切分 |
| keyword | 整句作为一个 token |
| pattern | 正则切分 |

### 6.2 IK 分词器

```json
POST _analyze
{ "analyzer": "ik_max_word", "text": "中华人民共和国国歌" }

POST _analyze
{ "analyzer": "ik_smart", "text": "中华人民共和国国歌" }
```

| 模式 | 行为 |
|------|------|
| ik_max_word | 最细粒度（索引时用） |
| ik_smart | 最粗粒度（搜索时用） |

### 6.3 自定义 Analyzer

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "char_filter": {
        "my_char_filter": {
          "type": "mapping",
          "mappings": ["- => _"]
        }
      },
      "tokenizer": "standard",
      "filter": ["lowercase", "my_stop"],
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "char_filter": ["my_char_filter"],
          "tokenizer": "standard",
          "filter": ["lowercase", "my_stop"]
        }
      }
    }
  }
}
```

### 6.4 字段级 analyzer 策略

```json
"title": {
  "type": "text",
  "analyzer": "ik_max_word",
  "search_analyzer": "ik_smart"
}
```

- **index 时**用细粒度分词，提高召回
- **search 时**用粗粒度，提高精度

### 6.5 自定义词典（IK）

在 `config/analysis-ik/` 下配置 `IKAnalyzer.cfg.xml`，添加 `ext.dic` 扩展词典、`stopword.dic` 停用词，重启 ES 生效。

---

## 小结

- 生产深分页用 **search_after + PIT**，不要用 from+size 硬翻。
- 中文搜索必须配置 **IK**；索引/搜索可分设 analyzer。
- scroll 仅用于批量导出，不要用于用户翻页。

下一篇：[《Elasticsearch 高可用集群架构》](/中间件/elasticsearch/es-08-cluster)
