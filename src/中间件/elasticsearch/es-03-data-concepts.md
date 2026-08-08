---
title: "ES 核心概念与基础数据管理"
sidebarGroup: "Elasticsearch"
shortTitle: "03 核心概念与数据管理"
order: 3
date: 2026-10-22
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 3/10 篇**  
> 上一篇：[《Elasticsearch 快速安装上手》](/中间件/elasticsearch/es-02-install)  
> 下一篇预告：[《Elasticsearch Query DSL 实战》](/中间件/elasticsearch/es-04-query-dsl)

---

## 开头：场景与目标

MySQL 的 `LIKE '%关键词%'` 无法支撑亿级文档的全文检索。本篇从倒排索引、Mapping、文档 CRUD、Bulk 导入到索引别名，系统梳理 ES 核心概念与数据管理。

---

## 一、搜索引擎基础

### 1.1 查询 vs 检索

| 概念 | 特征 | 示例 |
|------|------|------|
| **查询** | 有明确条件边界 | 年龄 15~25、颜色=红色、价格<3000 |
| **检索（全文检索）** | 无固定边界，结果按相关性排序 | 搜「Java 设计模式」，同义词、错别字、别名均可影响排序 |

### 1.2 为什么 MySQL 不适合全文检索

假设 10 亿条博客，用 MySQL：

```sql
SELECT * FROM t_blog WHERE content LIKE '%Java设计模式%';
```

问题：全表扫描效率极低；`LIKE` 前后 `%` 无法走索引；无法按相关性排序。

### 1.3 倒排索引原理

全文检索流程：

1. **预处理**：分词、去停用词、词干提取
2. **建索引**：为每个词建立倒排列表（词 → 文档 ID 列表 + 位置/词频）
3. **查询**：在倒排表中定位文档，计算相关性并排序

| 索引类型 | 结构 | 适用场景 |
|----------|------|----------|
| **正排索引** | 文档 ID → 完整内容 | MySQL 按主键查行 |
| **倒排索引** | 词 → 文档 ID 列表 | 关键词搜索 |

示例倒排表：

| 关键词 | 文章 ID |
|--------|---------|
| Java | 1, 2 |
| 设计模式 | 1, 2, 3, 4 |
| 多线程 | 2 |

---

## 二、ES 核心术语

### 2.1 与 MySQL 的对应关系

| MySQL | Elasticsearch | 说明 |
|-------|---------------|------|
| Database | Index（索引） | 逻辑容器，名称必须小写 |
| Table | ~~Type~~（7.x 已废弃） | 8.x 一个索引一种文档结构 |
| Row | Document（文档） | JSON 对象 |
| Column | Field（字段） | 键值对 |
| Schema | Mapping（映射） | 字段类型、分词、索引策略 |

### 2.2 文档元数据

```json
{
  "_index": "employee",
  "_id": "2",
  "_version": 1,
  "_seq_no": 1,
  "_primary_term": 1,
  "_source": {
    "name": "李四",
    "sex": 1,
    "age": 28,
    "address": "广州荔湾大厦",
    "remark": "java assistant"
  }
}
```

| 字段 | 含义 |
|------|------|
| `_index` | 所属索引 |
| `_id` | 文档唯一 ID |
| `_source` | 原始 JSON |
| `_version` | 版本号，每次更新 +1 |
| `_seq_no` / `_primary_term` | 并发控制与主分片切换 |

### 2.3 Mapping 设计示例

```json
PUT /employee
{
  "mappings": {
    "properties": {
      "name":    { "type": "keyword" },
      "sex":     { "type": "integer" },
      "age":     { "type": "integer" },
      "address": { "type": "text", "analyzer": "ik_max_word" },
      "remark":  { "type": "text", "analyzer": "ik_smart" }
    }
  }
}
```

**text vs keyword**：`text` 会分词，适合全文检索；`keyword` 不分词，适合精确匹配、排序、聚合。

---

## 三、索引操作

### 3.1 索引使用场景

- **按业务拆分**：`weibo_index`、`news_index`、`blog_index`
- **按时间切分日志**：`logs_202407`、`logs_202408`（便于冷热分离与删除）

### 3.2 创建索引

```json
PUT /student_index
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "name":          { "type": "text" },
      "age":           { "type": "integer" },
      "enrolled_date": { "type": "date" }
    }
  }
}
```

| 参数 | 说明 |
|------|------|
| `number_of_shards` | 主分片数，创建后**不可改**（需 Reindex） |
| `number_of_replicas` | 副本数，可动态调整 |

最简创建（使用默认 settings/mappings）：

```json
PUT /myindex
GET /myindex
```

### 3.3 查询与删除索引

```json
GET /student_index
GET /student_index/_search
{
  "query": { "match": { "name": "John" } }
}

DELETE /student_index
```

### 3.4 动态更新

**Settings**（部分可改）：

```json
PUT /student_index/_settings
{
  "index": { "number_of_replicas": 2 }
}
```

**Mapping**（只能新增字段，不能改已有字段类型）：

```json
PUT /student_index/_mapping
{
  "properties": {
    "grade": { "type": "integer" }
  }
}
```

---

## 四、文档 CRUD

### 4.1 创建文档

指定 ID（幂等）：

```json
PUT /employee/_doc/1
{
  "name": "张三", "sex": 1, "age": 25,
  "address": "广州天河公园", "remark": "java developer"
}
```

自动生成 ID：

```json
POST /employee/_doc
{ "name": "王五", "age": 26 }
```

### 4.2 查询文档

```json
GET /employee/_doc/1
GET /employee/_doc/1?_source=name,age
HEAD /employee/_doc/1
```

### 4.3 更新文档

全量替换：

```json
PUT /employee/_doc/1
{ "name": "张三", "age": 26 }
```

局部更新（推荐）：

```json
POST /employee/_update/1
{
  "doc": { "age": 26 }
}
```

脚本更新：

```json
POST /employee/_update/1
{
  "script": {
    "source": "ctx._source.age += params.count",
    "params": { "count": 1 }
  }
}
```

### 4.4 删除文档

```json
DELETE /employee/_doc/1
```

---

## 五、Bulk 批量操作

Bulk API 一次请求提交多条操作，格式为 **action 行 + source 行**：

```json
POST /employee/_bulk
{"index":  {"_index": "employee", "_id": "1"}}
{"name": "张三", "sex": 1, "age": 25, "address": "广州天河公园", "remark": "java developer"}
{"index":  {"_index": "employee", "_id": "2"}}
{"name": "李四", "sex": 1, "age": 28, "address": "广州荔湾大厦", "remark": "java assistant"}
{"delete": {"_index": "employee", "_id": "3"}}
{"update": {"_index": "employee", "_id": "1"}}
{"doc": {"age": 26}}
```

支持的操作：`index`、`create`、`update`、`delete`。

**最佳实践**：

- 每批 1000~5000 条，总 payload 约 5~15MB
- 失败条目在响应 `items` 中单独标记，可重试失败项

---

## 六、索引别名

ES **不允许改名索引**，别名可在不停服的情况下切换底层索引。

### 6.1 典型场景

1. **日志检索**：对外暴露 `logs_last_3_months`，背后指向多个按日期切分的索引
2. **零停机迁移**：新建 `employee_v2`，验证后把别名从 `employee_v1` 切到 `employee_v2`

### 6.2 别名操作

```json
POST /_aliases
{
  "actions": [
    { "add":    { "index": "employee_v1", "alias": "employee" } },
    { "remove": { "index": "employee_v0", "alias": "employee" } }
  ]
}

GET /employee/_search
GET /_alias/employee
GET /employee_v1/_alias
```

带过滤的别名（只暴露部分文档）：

```json
POST /_aliases
{
  "actions": [{
    "add": {
      "index": "logs_2024",
      "alias": "logs_active",
      "filter": { "term": { "status": "active" } }
    }
  }]
}
```

---

## 七、Mapping 进阶要点

### 7.1 多字段（fields）

```json
"address": {
  "type": "text",
  "analyzer": "ik_max_word",
  "fields": {
    "keyword": { "type": "keyword" }
  }
}
```

- `address`：全文检索
- `address.keyword`：精确匹配、排序、聚合

### 7.2 动态 Mapping

未声明字段时 ES 自动推断类型。生产环境建议**关闭动态映射**或仅允许新增：

```json
PUT /strict_index
{
  "mappings": {
    "dynamic": "strict",
    "properties": { "title": { "type": "text" } }
  }
}
```

---

## 小结

- **倒排索引**是 ES 全文检索的基石；**Mapping** 决定字段如何分词与索引。
- 索引创建后分片数不可改；Mapping 只能加字段，改类型需 Reindex。
- **Bulk** 是批量导入的标准方式；**别名** 实现零停机索引切换。

下一篇：[《Elasticsearch Query DSL 实战》](/中间件/elasticsearch/es-04-query-dsl)
