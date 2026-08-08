---
title: "搜索相关性与聚合分析"
sidebarGroup: "Elasticsearch"
shortTitle: "05 相关性与聚合"
order: 5
date: 2026-10-24
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 5/10 篇**  
> 上一篇：[《Elasticsearch Query DSL 实战》](/中间件/elasticsearch/es-04-query-dsl)  
> 下一篇预告：[《Spring Boot 整合 ES 与商品搜索实战》](/中间件/elasticsearch/es-06-springboot-search)

---

## 开头：场景与目标

搜到了还要排对——相关性打分决定用户第一眼看到什么。BM25、自定义评分、Function Score 与聚合分析（Metric/Bucket/Pipeline）是搜索体验与数据分析的双引擎。

---

## 一、相关性评分

### 1.1 什么是相关性

搜索「JAVA 多线程 设计模式」时，文档 2、3 应排在前面——这就是**相关性（Relevance）**。每个命中文档都有 `_score`，越高表示与查询越匹配。

评估相关性时关注：

- 是否召回所有相关文档？
- 是否混入大量不相关结果？
- 排序是否符合业务预期？

### 1.2 TF-IDF 与 BM25

ES 5 之前默认 **TF-IDF**；5 之后默认 **Okapi BM25**。

| 因素 | 含义 |
|------|------|
| **TF（词频）** | 词在文档中出现越多，相关性越高 |
| **IDF（逆文档频率）** | 词在全库越罕见，权重越高（「的」「是」权重低） |
| **字段长度归一化** | 短字段命中同一词，权重高于长字段 |

BM25 对 TF 做了饱和处理：词频增加到一定程度后，加分趋于平缓，避免「堆词」刷分。

### 1.3 Explain API 查看算分

```json
PUT /test_score/_bulk
{"index":{"_id":1}}
{"content":"we use Elasticsearch to power the search"}
{"index":{"_id":2}}
{"content":"we like elasticsearch"}
{"index":{"_id":3}}
{"content":"The scoring of documents is calculated by the scoring formula"}
{"index":{"_id":4}}
{"content":"you know, for search"}

GET /test_score/_search
{
  "explain": true,
  "query": { "match": { "content": "elasticsearch" } }
}
```

---

## 二、自定义评分

### 2.1 boost 权重

字段级 boost：

```json
GET /test_score/_search
{
  "query": {
    "match": {
      "content": { "query": "elasticsearch", "boost": 2.0 }
    }
  }
}
```

查询级 boost（bool should）：

```json
GET /test_score/_search
{
  "query": {
    "bool": {
      "should": [
        { "match": { "content": { "query": "elasticsearch", "boost": 3 } } },
        { "match": { "content": { "query": "search", "boost": 1 } } }
      ]
    }
  }
}
```

### 2.2 function_score

按业务字段（销量、浏览量）调整排序：

```json
PUT /my_index_products/_bulk
{"index":{"_id":1}}
{"name":"A","sales":10,"visitors":10}
{"index":{"_id":2}}
{"name":"B","sales":20,"visitors":20}
{"index":{"_id":3}}
{"name":"C","sales":30,"visitors":30}

POST /my_index_products/_search
{
  "query": {
    "function_score": {
      "query": { "match_all": {} },
      "script_score": {
        "script": {
          "source": "_score * (doc['sales'].value + doc['visitors'].value)"
        }
      }
    }
  }
}
```

常用 function：

| 类型 | 用途 |
|------|------|
| `script_score` | Painless 脚本自定义 |
| `weight` | 固定权重 |
| `field_value_factor` | 按数值字段缩放 |
| `random_score` | 随机排序 |
| `decay functions` | 时间/距离衰减 |

### 2.3 rescore 二次打分

只对前 N 条结果重新算分，平衡精度与性能：

```json
PUT /my_index_books/_bulk
{"index":{"_id":"1"}}
{"title":"ES实战","content":"ES的实战操作，实战要领，实战经验"}
{"index":{"_id":"2"}}
{"title":"MySQL实战","content":"MySQL的实战操作"}
{"index":{"_id":"3"}}
{"title":"MySQL","content":"MySQL一定要会"}

GET /my_index_books/_search
{
  "query": { "match": { "content": "实战" } },
  "rescore": {
    "window_size": 50,
    "query": {
      "rescore_query": { "match": { "title": "MySQL" } },
      "query_weight": 0.7,
      "rescore_query_weight": 1.2
    }
  }
}
```

---

## 三、多字段搜索优化

### 3.1 竞争字段 vs 关联字段

| 场景 | 策略 | 查询 |
|------|------|------|
| title/body **竞争**（取最佳匹配） | dis_max | 见下例 |
| 多字段 **累加** | most_fields | multi_match type=most_fields |
| 跨字段 **整体匹配** | cross_fields | multi_match type=cross_fields |

### 3.2 dis_max 示例

```json
PUT /blogs/_doc/1
{ "title": "Quick brown rabbits", "body": "Brown rabbits are commonly seen." }

PUT /blogs/_doc/2
{ "title": "Keeping pets healthy", "body": "My quick brown fox eats rabbits on a regular basis." }

POST /blogs/_search
{
  "query": {
    "dis_max": {
      "queries": [
        { "match": { "title": "Brown fox" } },
        { "match": { "body":  "Brown fox" } }
      ],
      "tie_breaker": 0.3
    }
  }
}
```

`bool.should` 会把各字段分数**相加**，竞争字段场景下容易误排；`dis_max` 取**最高分**字段为主。

---

## 四、聚合分析（Aggregations）

聚合类似 SQL 的 `GROUP BY` + 统计函数，分三类：

| 类型 | 作用 | 示例 |
|------|------|------|
| **Metric** | 计算指标 | avg、sum、max、min、stats |
| **Bucket** | 分组 | terms、range、date_histogram |
| **Pipeline** | 对聚合结果再聚合 | avg_bucket、derivative |

### 4.1 Metric 聚合

```json
GET /employee/_search
{
  "size": 0,
  "aggs": {
    "avg_age":  { "avg":  { "field": "age" } },
    "max_age":  { "max":  { "field": "age" } },
    "min_age":  { "min":  { "field": "age" } },
    "sum_age":  { "sum":  { "field": "age" } },
    "stats_age": { "stats": { "field": "age" } }
  }
}
```

### 4.2 Bucket 聚合

**terms**（按字段值分组）：

```json
GET /employee/_search
{
  "size": 0,
  "aggs": {
    "sex_group": {
      "terms": { "field": "sex", "size": 10 }
    }
  }
}
```

**range**（区间分组）：

```json
GET /employee/_search
{
  "size": 0,
  "aggs": {
    "age_ranges": {
      "range": {
        "field": "age",
        "ranges": [
          { "to": 25 },
          { "from": 25, "to": 30 },
          { "from": 30 }
        ]
      }
    }
  }
}
```

**date_histogram**（按时间桶）：

```json
GET /logs/_search
{
  "size": 0,
  "aggs": {
    "logs_per_day": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "day"
      }
    }
  }
}
```

### 4.3 嵌套聚合

```json
GET /employee/_search
{
  "size": 0,
  "aggs": {
    "sex_group": {
      "terms": { "field": "sex" },
      "aggs": {
        "avg_age": { "avg": { "field": "age" } }
      }
    }
  }
}
```

### 4.4 聚合 + 查询过滤

```json
GET /employee/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [{ "range": { "age": { "gte": 20 } } }]
    }
  },
  "aggs": {
    "sex_group": { "terms": { "field": "sex" } }
  }
}
```

---

## 小结

- 默认 **BM25** 算分；用 Explain API 调试排序。
- 电商等场景用 **function_score** / **rescore** 注入业务权重。
- 竞争字段用 **dis_max**，不要简单 bool.should 相加。
- **Metric + Bucket** 聚合是 BI 分析的基础，可与 query filter 组合。

下一篇：[《Spring Boot 整合 ES 与商品搜索实战》](/中间件/elasticsearch/es-06-springboot-search)
