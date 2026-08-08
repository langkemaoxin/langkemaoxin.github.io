---
title: "Elasticsearch Query DSL 实战"
sidebarGroup: "Elasticsearch"
shortTitle: "04 Query DSL"
order: 4
date: 2026-10-23
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 4/10 篇**  
> 上一篇：[《ES 核心概念与基础数据管理》](/中间件/elasticsearch/es-03-data-concepts)  
> 下一篇预告：[《搜索相关性与聚合分析》](/中间件/elasticsearch/es-05-relevance-agg)

---

## 开头：场景与目标

业务查询很少是「查全部」——需要组合条件、分页、排序、高亮。Query DSL 是 ES 检索的核心语言，本篇用 employee 示例数据集逐类讲解常用查询。

官方文档：[Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/8.14/query-dsl.html)

基本语法：

```
GET /<index>/_search
{ "query": { ... } }
```

---

## 一、示例数据准备

```json
DELETE /employee

PUT /employee
{
  "settings": { "number_of_shards": 1, "number_of_replicas": 1 },
  "mappings": {
    "properties": {
      "name":    { "type": "keyword" },
      "sex":     { "type": "integer" },
      "age":     { "type": "integer" },
      "address": {
        "type": "text", "analyzer": "ik_max_word",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "remark": {
        "type": "text", "analyzer": "ik_smart",
        "fields": { "keyword": { "type": "keyword" } }
      }
    }
  }
}

POST /employee/_bulk
{"index":{"_index":"employee","_id":"1"}}
{"name":"张三","sex":1,"age":25,"address":"广州天河公园","remark":"java developer"}
{"index":{"_index":"employee","_id":"2"}}
{"name":"李四","sex":1,"age":28,"address":"广州荔湾大厦","remark":"java assistant"}
{"index":{"_index":"employee","_id":"3"}}
{"name":"王五","sex":0,"age":26,"address":"广州白云山公园","remark":"php developer"}
{"index":{"_index":"employee","_id":"4"}}
{"name":"赵六","sex":0,"age":22,"address":"长沙橘子洲","remark":"python assistant"}
{"index":{"_index":"employee","_id":"5"}}
{"name":"张龙","sex":0,"age":19,"address":"长沙麓谷企业广场","remark":"java architect assistant"}
{"index":{"_index":"employee","_id":"6"}}
{"name":"赵虎","sex":1,"age":32,"address":"长沙麓谷兴工国际产业园","remark":"java architect"}
```

---

## 二、match_all 与通用参数

```json
GET /employee/_search
{
  "query": { "match_all": {} },
  "size": 3
}
```

| 参数 | 作用 |
|------|------|
| `size` | 返回条数，默认 10 |
| `from` | 分页偏移，配合 size |
| `sort` | 排序字段 |
| `_source` | 控制返回字段 |

```json
GET /employee/_search
{
  "query": { "match_all": {} },
  "from": 0,
  "size": 5,
  "sort": [{ "age": "desc" }],
  "_source": ["name", "address"]
}
```

`_source` 进阶：

```json
"_source": false
"_source": ["name", "age"]
"_source": "obj.*"
```

---

## 三、精确匹配（Term Level）

精确匹配不做分词，类似 SQL 等值查询。**不要对 text 字段直接用 term**（会按整句匹配分词结果，通常查不到）。

### 3.1 term

```json
GET /employee/_search
{
  "query": { "term": { "name": { "value": "张三" } } }
}
```

### 3.2 terms（多值 OR）

```json
GET /employee/_search
{
  "query": { "terms": { "name": ["张三", "李四"] } }
}
```

### 3.3 range

```json
GET /employee/_search
{
  "query": {
    "range": {
      "age": { "gte": 25, "lte": 30 }
    }
  }
}
```

### 3.4 exists / prefix / wildcard / regexp

```json
GET /employee/_search
{ "query": { "exists": { "field": "remark" } } }

GET /employee/_search
{ "query": { "prefix": { "name": "张" } } }

GET /employee/_search
{ "query": { "wildcard": { "name": "张*" } } }
```

### 3.5 ids

```json
GET /employee/_search
{ "query": { "ids": { "values": ["1", "2", "3"] } } }
```

---

## 四、全文匹配（Full Text）

### 4.1 match

对 text 字段分词后检索：

```json
GET /employee/_search
{
  "query": { "match": { "address": "广州" } }
}
```

`operator` 控制词项逻辑：

```json
"match": {
  "remark": {
    "query": "java developer",
    "operator": "and"
  }
}
```

### 4.2 match_phrase（短语）

```json
GET /employee/_search
{
  "query": {
    "match_phrase": {
      "remark": { "query": "java developer", "slop": 1 }
    }
  }
}
```

### 4.3 multi_match

```json
GET /employee/_search
{
  "query": {
    "multi_match": {
      "query": "java",
      "fields": ["remark", "address"]
    }
  }
}
```

| type | 说明 |
|------|------|
| `best_fields` | 取最高分字段（默认） |
| `most_fields` | 各字段分数相加 |
| `cross_fields` | 跨字段当作一个字段匹配 |

---

## 五、复合查询 bool

```json
GET /employee/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "address": "广州" } }
      ],
      "filter": [
        { "range": { "age": { "gte": 25 } } }
      ],
      "should": [
        { "term": { "sex": { "value": 1 } } }
      ],
      "must_not": [
        { "term": { "name": { "value": "王五" } } }
      ],
      "minimum_should_match": 1
    }
  }
}
```

| 子句 | 作用 | 是否计分 |
|------|------|----------|
| `must` | 必须匹配 | 是 |
| `filter` | 必须匹配 | 否（可缓存） |
| `should` | 可选匹配 | 是 |
| `must_not` | 必须不匹配 | 否 |

---

## 六、其他常用查询

### 6.1 constant_score

```json
GET /employee/_search
{
  "query": {
    "constant_score": {
      "filter": { "term": { "sex": { "value": 1 } } },
      "boost": 1.2
    }
  }
}
```

### 6.2 boosting

降低含特定词的文档权重：

```json
GET /employee/_search
{
  "query": {
    "boosting": {
      "positive": { "match": { "remark": "java" } },
      "negative": { "match": { "remark": "php" } },
      "negative_boost": 0.2
    }
  }
}
```

---

## 七、高亮

```json
GET /employee/_search
{
  "query": { "match": { "address": "广州" } },
  "highlight": {
    "pre_tags": ["<em>"],
    "post_tags": ["</em>"],
    "fields": {
      "address": {},
      "remark": { "fragment_size": 50 }
    }
  }
}
```

---

## 八、聚合入门（与第 5 篇衔接）

在查询同时做统计：

```json
GET /employee/_search
{
  "size": 0,
  "aggs": {
    "avg_age": { "avg": { "field": "age" } },
    "sex_count": { "terms": { "field": "sex" } }
  }
}
```

---

## 小结

| 场景 | 推荐查询 |
|------|----------|
| 查全部 | `match_all` |
| 精确等值 | `term` / `terms`（keyword 字段） |
| 数值/日期范围 | `range` |
| 全文搜索 | `match` / `match_phrase` |
| 多条件组合 | `bool`（过滤放 filter） |

下一篇：[《搜索相关性与聚合分析》](/中间件/elasticsearch/es-05-relevance-agg)
