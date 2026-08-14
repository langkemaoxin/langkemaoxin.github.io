---
title: "ELK 日志体系与 MySQL 到 ES 一致性"
sidebarGroup: "Elasticsearch"
shortTitle: "10 ELK 与数据同步"
order: 10
date: 2026-10-29
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 10/10 篇**  
> 上一篇：[《ES 集群生产实践与性能调优》](/中间件/elasticsearch/es-09-production)

---

## 开头：场景与目标

搜索索引只是 ES 的一半战场——日志才是 ELK 的主场。本篇搭建 Filebeat + Logstash + ES + Kibana 日志链路，并对比 MySQL 到 ES 的四种数据一致性方案。

![ELK 日志采集与分析架构](/中间件/elasticsearch/46-2/p01-01.png)

---

## 一、为什么使用 ELK

| 价值 | 说明 |
|------|------|
| 集中化管理 | 分布式系统日志统一采集、检索 |
| 高效检索 | ES 倒排索引秒级定位 ERROR/WARN |
| 可视化 | Kibana 仪表盘、Discover 交互分析 |
| 监控告警 | 结合 Watcher/Elastic Agent 做异常检测 |

---

## 二、ELK 架构

### 2.1 经典 ELK

```
Filebeat → Logstash → Elasticsearch → Kibana
```

| 组件 | 职责 |
|------|------|
| Filebeat | 轻量日志采集（Golang，资源占用低） |
| Logstash | ETL 管道：input → filter → output |
| Elasticsearch | 存储与检索 |
| Kibana | 可视化 |

适用：开发/中小规模；Logstash 或 ES 故障时可能丢数据。

### 2.2 生产架构（加消息队列）

```
Filebeat → Kafka/Redis → Logstash → ES → Kibana
                ↑
              Nginx（可选，负载均衡）
```

消息队列提供**削峰填谷**与**持久缓冲**，保证数据不丢。

---

## 三、Logstash 详解

Pipeline 三阶段：**input → filter → output**

### 3.1 快速测试

```bash
bin/logstash -e 'input { stdin { } } output { stdout {} }'
```

### 3.2 Apache 日志解析示例

```ruby
input {
  stdin { }
}

filter {
  grok {
    match => { "message" => "%{COMBINEDAPACHELOG}" }
  }
  date {
    match => [ "timestamp", "dd/MMM/yyyy:HH:mm:ss Z" ]
  }
}

output {
  elasticsearch {
    index => "logstash-demo"
    hosts => ["http://localhost:9200"]
  }
  stdout { codec => rubydebug }
}
```

```bash
bin/logstash -f logstash-demo.conf
```

### 3.3 常用插件

| 类型 | 插件 |
|------|------|
| Input | stdin, file, beats, jdbc, kafka |
| Filter | grok, date, mutate, geoip, dissect |
| Output | elasticsearch, stdout, kafka |
| Codec | json, multiline, rubydebug |

### 3.4 Multiline 合并堆栈

```ruby
input {
  stdin {
    codec => multiline {
      pattern => "^\s"
      what => "previous"
    }
  }
}
```

Java 异常堆栈以空格缩进行续接上一行。

### 3.5 持久化队列

```yaml
# logstash.yml
queue.type: persisted
queue.max_bytes: 4gb
```

防止 Logstash 崩溃时内存队列丢数据。

---

## 四、Filebeat

Filebeat 部署在应用服务器，通过 **Harvester** 逐行读取日志文件，发送到 Logstash 或 ES。

`filebeat.yml` 示例：

```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/app/*.log

output.logstash:
  hosts: ["localhost:5044"]
```

| 对比 | Filebeat | Logstash |
|------|----------|----------|
| 语言 | Go | JVM |
| 资源 | 极低 | 较高 |
| Filter | 无 | 丰富 |

**推荐**：Filebeat 采集 → Kafka → Logstash 过滤 → ES。

---

## 五、MySQL → ES 数据同步

### 5.1 四种方案对比

| 方案 | 实时性 | 一致性 | 复杂度 | 适用 |
|------|--------|--------|--------|------|
| **Logstash JDBC** | 分钟级 | 最终一致 | 低 | 简单增量同步 |
| **Canal + MQ** | 秒级 | 较高 | 中 | 主流生产方案 |
| **双写** | 实时 | 难保证 | 低 | 小项目（不推荐） |
| **定时全量/增量** | 小时级 | 低 | 低 | 报表、离线 |

### 5.2 Logstash JDBC 增量同步

```ruby
input {
  jdbc {
    jdbc_driver_library => "/path/mysql-connector-java-8.0.33.jar"
    jdbc_driver_class => "com.mysql.cj.jdbc.Driver"
    jdbc_connection_string => "jdbc:mysql://localhost:3306/test"
    jdbc_user => "root"
    jdbc_password => "password"
    use_column_value => true
    tracking_column => "last_updated"
    tracking_column_type => "numeric"
    record_last_run => true
    last_run_metadata_path => "jdbc-position.txt"
    statement => "SELECT * FROM user WHERE last_updated > :sql_last_value"
    schedule => "*/5 * * * *"
  }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "users"
    document_id => "%{id}"
  }
}
```

MySQL 表设计：

```sql
CREATE TABLE user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50),
  address VARCHAR(50),
  last_updated BIGINT,
  is_deleted INT DEFAULT 0
);
```

### 5.3 软删除与 Alias 过滤

JDBC 无法物理删除 ES 文档，用**软删除 + 别名过滤**：

```json
POST /_aliases
{
  "actions": [{
    "add": {
      "index": "users",
      "alias": "view_users",
      "filter": { "term": { "is_deleted": 0 } }
    }
  }]
}

POST view_users/_search
{
  "query": { "term": { "name.keyword": "张三" } }
}
```

### 5.4 Canal 方案（推荐生产）

```
MySQL Binlog → Canal → Kafka/RocketMQ → 消费者写 ES
```

- 监听 binlog，捕获 insert/update/delete
- 消息队列解耦，支持重试
- 消费者按事件类型 upsert/delete ES 文档

---

## 六、Kibana 日志分析

1. 创建 **Index Pattern**（如 `logstash-*`）
2. **Discover** 按时间范围检索
3. **Visualize** 创建柱状图、饼图（按 level、host 聚合）
4. **Dashboard** 组合面板，运维一屏监控

常用查询：

```
level: ERROR AND @timestamp:[now-1h TO now]
host.name: "web-01" AND message: "timeout"
```

---

## 系列收束

| 篇目 | 主题 |
|------|------|
| 01 | ES 概述与 Elastic Stack |
| 02 | 安装与 IK 分词 |
| 03 | 核心概念与数据管理 |
| 04 | Query DSL |
| 05 | 相关性与聚合 |
| 06 | Spring Boot 商品搜索 |
| 07 | 深分页与 Analyzer |
| 08 | 高可用集群 |
| 09 | 生产调优 |
| 10 | ELK 与数据同步 |

从单机安装到集群运维，从 DSL 到 Spring 集成，从搜索到日志——Elasticsearch 系列完结。实践中请结合官方 [Elastic 8.14 文档](https://www.elastic.co/guide/en/elasticsearch/reference/8.14/index.html) 与业务场景持续调优。
