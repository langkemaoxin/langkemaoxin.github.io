---
title: "Elasticsearch 快速安装上手"
sidebarGroup: "Elasticsearch"
shortTitle: "02 快速安装"
order: 2
date: 2026-10-21
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 2/10 篇**  
> 上一篇：[《Elasticsearch 概述与 Elastic Stack》](/中间件/elasticsearch/es-01-overview)  
> 下一篇预告：[《ES 核心概念与基础数据管理》](/中间件/elasticsearch/es-03-data-concepts)

---

## 开头：先跑起来

学 ES 最稳妥的第一步：在本机或虚拟机把单节点拉起来，浏览器访问 `9200`，再用 Kibana Dev Tools 发第一条 REST 请求。本篇覆盖 Windows/Linux 安装、常用配置、Kibana 与 IK 中文分词。

---

## 一、安装与目录结构

初学者可在 Windows 直接解压运行；生产环境推荐 Linux。以 **8.14.3** 为例：

- 下载：[官方安装文档](https://www.elastic.co/guide/en/elasticsearch/reference/8.14/install-elasticsearch.html)
- Windows：`elasticsearch-8.14.3-windows-x86_64.zip`
- Linux：`elasticsearch-8.14.3-linux-x86_64.tar.gz`

| 目录 | 说明 |
|------|------|
| `bin` | 启动脚本、插件安装 |
| `config` | `elasticsearch.yml`、JVM、角色配置 |
| `jdk` | 7.x 起内置 JDK |
| `data` | 索引与分片数据（生产需独立磁盘） |
| `logs` | 运行日志 |
| `plugins` | 已安装插件 |

**内存建议**：虚拟机 ≥ 4GB，JVM heap ≥ 1GB。JDK 版本见 [Support Matrix](https://www.elastic.co/support/matrix#matrix_jvm)。环境变量优先级：`ES_JAVA_HOME` > 内置 JDK > `ES_HOME`。

Windows 下设置环境变量：

```powershell
# 系统环境变量
ES_JAVA_HOME = D:\elasticsearch-8.14.3\jdk
ES_HOME      = D:\elasticsearch-8.14.3
```

---

## 二、基础配置（开发模式）

编辑 `config/elasticsearch.yml`：

```yaml
network.host: 0.0.0.0
discovery.type: single-node
xpack.security.enabled: false
```

ES 8 默认开启 Security；初学者可先关闭以便快速上手。

解决 Windows 控制台乱码，在 `config/jvm.options` 末尾添加：

```
-Dfile.encoding=GBK
```

- **9200**：HTTP REST 端口（浏览器访问）
- **9300**：节点间通信端口

启动 `bin/elasticsearch.bat`（Windows）或 `bin/elasticsearch`（Linux），访问 `http://localhost:9200` 应返回集群 JSON 信息。

---

## 三、Linux 安装要点

ES **禁止 root 直接启动**。若 root 解压，需 `chown -R es:es elasticsearch-8.14.3`。

```bash
adduser es
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.14.3-linux-x86_64.tar.gz
tar -xzf elasticsearch-8.14.3-linux-x86_64.tar.gz
chown -R es:es elasticsearch-8.14.3
```

在 `~/.bash_profile` 中：

```bash
export ES_JAVA_HOME=/home/fox/elasticsearch-8.14.3/jdk/
export ES_HOME=/home/fox/elasticsearch-8.14.3
source ~/.bash_profile
```

### 开发模式 vs 生产模式

| 模式 | 特征 |
|------|------|
| 开发模式 | `discovery.type: single-node` 绕过引导检查 |
| 生产模式 | 修改集群相关配置会触发 bootstrap checks（JVM、内存锁、虚拟内存、线程数、discovery 等），不合理则拒绝启动 |

常用配置项见 [Important Settings](https://www.elastic.co/guide/en/elasticsearch/reference/8.14/important-settings.html)：

| 参数 | 说明 |
|------|------|
| `cluster.name` | 集群名，多节点必须一致 |
| `node.name` | 节点名，同机多实例需不同 |
| `path.data` / `path.logs` | 数据与日志目录 |
| `network.host` | 默认 127.0.0.1，远程需 0.0.0.0 |
| `discovery.seed_hosts` | 候选主节点主机列表 |
| `cluster.initial_master_nodes` | 首次选主节点名（首次后应移除） |
| `bootstrap.memory_lock` | 内存锁定，生产建议 true；内存不足时可设 false |

JVM 堆内存 `config/jvm.options`：

```
-Xms4g
-Xmx4g
```

建议 Xms = Xmx，且不超过物理内存 50%，单节点 heap 不宜超过 30GB。

生产启动常见报错及处理：

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 4096
* hard nproc 4096

# /etc/sysctl.conf
vm.max_map_count=262144
sysctl -p
```

缺少 discovery 配置时，需设置 `discovery.seed_hosts` 与 `cluster.initial_master_nodes`，或使用 `discovery.type: single-node`。

---

## 四、浏览器插件与 Kibana

常用 Dev 插件：Elasticsearch Head、Elasticvue（对国人友好）。生产环境更推荐 **Kibana**。

下载 [Kibana 8.14.3](https://www.elastic.co/cn/downloads/past-releases#kibana)，编辑 `config/kibana.yml`：

```yaml
server.port: 5601
server.host: "0.0.0.0"
elasticsearch.hosts: ["http://localhost:9200"]
i18n.locale: "zh-CN"
```

启动后访问 `http://localhost:5601`。Dev Tools 中可使用 `_cat` API 查看集群：

```
GET /_cat/health?v
GET /_cat/indices?v
GET /_cat/shards?v
```

---

## 五、中文分词插件

```bash
bin/elasticsearch-plugin list
bin/elasticsearch-plugin install analysis-icu
bin/elasticsearch-plugin remove analysis-icu
```

安装/删除插件后需**重启 ES**。

测试 ICU 分词：

```json
POST _analyze
{
  "analyzer": "icu_analyzer",
  "text": "中华人民共和国"
}
```

### IK 中文分词

IK 需与 ES 版本严格对应。8.14.3 可从 [infinilabs 发布页](https://release.infinilabs.com/analysis-ik/stable/) 下载对应 zip，放入 `plugins` 目录后重启。

```json
POST _analyze
{ "analyzer": "standard", "text": "中华人民共和国" }

POST _analyze
{ "analyzer": "ik_smart", "text": "中华人民共和国" }

POST _analyze
{ "analyzer": "ik_max_word", "text": "中华人民共和国" }
```

创建索引时指定默认分词器：

```json
PUT /employee
{
  "settings": {
    "index": {
      "analysis.analyzer.default.type": "ik_max_word"
    }
  }
}
```

字段级指定 index/search 不同分词器：

```json
PUT /index
POST /index/_mapping
{
  "properties": {
    "content": {
      "type": "text",
      "analyzer": "ik_max_word",
      "search_analyzer": "ik_smart"
    }
  }
}
```

插入文档并高亮查询：

```json
POST /index/_create/1
{"content":"中国驻洛杉矶领事馆遭亚裔男子枪击 嫌犯已自首"}

POST /index/_search
{
  "query": { "match": { "content": "中国" } },
  "highlight": { "fields": { "content": {} } }
}
```

---

## 小结

- 开发环境：`single-node` + 关闭 Security，快速访问 9200。
- 生产环境：独立 data/logs 目录、JVM 与系统 limits 调优、discovery 与引导检查。
- Kibana + IK 是中文搜索的标配组合。

下一篇：[《ES 核心概念与基础数据管理》](/中间件/elasticsearch/es-03-data-concepts)
