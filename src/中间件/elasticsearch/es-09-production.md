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
> 下一篇预告：[《ELK 日志体系与 MySQL 到 ES 一致性》](/中间件/elasticsearch/es-10-elk-sync)

---

## 开头：场景与目标

上线前要问：节点角色怎么分？冷热数据怎么放？读写怎么调优？本篇覆盖节点角色、Hot-Warm 架构、跨集群搜索、容量规划，以及底层读写原理与性能优化。


### 第 1 页

如果你的Elasticsearch集群是7.9之前的版本，在配置节点的时候，则只会涉及节点类型的知识。

Elasticsearch 7.9版本开始引入节点角色的概念。节点角色划分的目的是让不同角色的节点各司其职，

共同确保集群功能的稳定和性能的高可用。

Elasticsearch早期版本（以7.1版本为例）中，如果配置仅候选主节点类型，那么极端情况下需要的配置如下：

这是非常烦琐的配置，其逻辑类似于“若我要说明自己是主节点，则要先说明我不是数据节点、不是ingest节点、不是XXX节点……”​。而节点角色的出现“革命性”地解决了这个问题。利用节点角色，我们只需要说明“我是XXX”即可，而不需要卖力解释“我不是XXX”​。

以Elasticsearch 8.X版本集群为例，如果我们不手动设置节点角色，则默认节点角色为cdfhilmrstw。

对默认节点角色cdfhilmrstw的解释如下表所示：

当集群规模比较大之后（比如集群节点数大于6个）​，就需要手动设定、配置节点角色。

1. 节点角色配置方案节点角色介绍主节点：负责集群管理和元数据维护，确保集群正常运行。

数据节点：负责存储、检索和处理数据，提供搜索和聚合功能。

协调节点：处理客户端请求，协调数据节点工作，优化分布式搜索。

ingest节点：即预处理节点，负责数据预处理，如过滤、转换等，准备好数据再将其索引到数据节点。

```
node.master: true
node.data: false
node.ingest: false
node.roles: [data,master]
```

### 第 2 页

![Elasticsearch 教程配图（46-15 第2页 图1）](/中间件/elasticsearch/46-15/p02-page.png)

在开发环境中，一个节点可承担多种角色。

在生产环境中：

这种单一角色职责分离的好处：

生产环境中，建议为一些大的集群配置Coordinating Only Nodes

热节点存放用户最关心的热数据；温节点存放用户关心优先级低的暖数据；冷节点存放用户不太关心的冷数据。

一个节点只承担一个角色的配置根据数据量，写入和查询的吞吐量，选择合适的部署方式建议设置单一角色的节点单一 master eligible nodes: 负责集群状态(cluster state)的管理使用低配置的CPU,RAM和磁盘单一 data nodes: 负责数据存储及处理客户端请求使用高配置的CPU,RAM和磁盘单一ingest nodes: 负责数据处理使用高配置CPU; 中等配置的RAM; 低配置的磁盘单一Coordinating Only Nodes(Client Node)使用高配置CPU; 高配置的RAM; 低配置的磁盘扮演Load Balancers，降低Master和 Data Nodes的负载负责搜索结果的Gather/Reduce有时候无法预知客户端会发送怎么样的请求。比如大量占用内存的操作，一个深度聚合可能会引发OOM增加节点的场景当磁盘容量无法满足需求时，可以增加数据节点；

磁盘读写压力大时，增加数据节点当系统中有大量的复杂查询及聚合时候，增加Coordinating节点，增加查询的性能2. 高可用场景部署方案读写分离架构

Hot & Warm 架构

### 第 3 页

![Elasticsearch 教程配图（46-15 第3页 图1）](/中间件/elasticsearch/46-15/p03-page.png)

在成本有限的前提下，让客户关注的实时数据和历史数据硬件隔离，最大化解决客户反应的响应时间慢的问题。

业务场景描述：每日增量6TB日志数据，高峰时段写入及查询频率都较高，集群压力较大，查询ES时，常出现查询缓慢问题。

两类数据节点，不同的硬件配置：

Hot Nodes用于数据的写入：

Warm Nodes用于保存只读的索引，比较旧的数据。通常使用大容量的磁盘使用Shard Filtering实现Hot&Warm node间的数据迁移典型的应用场景ES集群的索引写入及查询速度主要依赖于磁盘的IO速度，冷热数据分离的关键为使用SSD磁盘存储热数据，提升查询效率。

若全部使用SSD，成本过高，且存放冷数据较为浪费，因而使用普通SATA磁盘与SSD磁盘混搭，可做到资源充分利用，性能大幅提升的目标。

ES为什么要设计Hot & Warm 架构？

ES数据通常不会有 Update操作;适用于Time based索引数据，同时数据量比较大的场景。

引入 Warm节点，低配置大容量的机器存放老数据，以降低部署成本Hot节点(通常使用SSD)︰索引不断有新文档写入。

Warm 节点（通常使用HDD)︰索引不存在新数据的写入，同时也不存在大量的数据查询lndexing 对 CPU和IO都有很高的要求，所以需要使用高配置的机器存储的性能要好，建议使用SSD配置Hot & Warm 架构

```
node.attr来指定node属性：hot或是warm。
```

在index的settings里通过index.routing.allocation来指定索引（index)到一个满足要求的node设置分配索引到节点，节点的属性规则

```
index.routing.allocation.include.{attr}
```

至少包含一个值

```
index.routina.allocation.exclude.{attr}
```

不能包含任何一个值

```
index.routina.allocation.require. {attr}
```

所有值都需要包含

### 第 4 页

![Elasticsearch 教程配图（46-15 第4页 图1）](/中间件/elasticsearch/46-15/p04-page.png)

使用 Shard Filtering，步骤分为以下几步:1) 标记节点需要通过“node.attr”来标记一个节点

- 2）配置Hot数据创建索引时候，指定将其创建在hot节点上标记节点(Tagging)配置索引到Hot Node配置索引到 Warm节点节点的attribute可以是任何的key/value可以通过elasticsearch.yml

```
# 标记一个 Hot 节点
node.attr.my_node_type: hot
```

3

```
# 标记一个 warm 节点
node.attr.my_node_type: warm
```

6

```
# 查看节点
GET /_cat/nodeattrs?v
```

### 第 5 页

![Elasticsearch 教程配图（46-15 第5页 图1）](/中间件/elasticsearch/46-15/p05-page.png)

- 3）旧数据移动到Warm节点Index.routing.allocation是一个索引级的dynamic setting,可以通过API在后期进行设定

```
# 配置到 Hot节点
PUT /index-2022-05
{
"settings":{
"number_of_shards":2,
"number_of_replicas":0,
"index.routing.allocation.require.my_node_type":"hot"
}
}
```

10

```
POST /index-2022-05/_doc
{
"create_time":"2022-05-27"
}
```

15

```
#查看索引文档的分布
GET _cat/shards/index-2022-05?v
# 配置到 warm 节点
PUT /index-2022-05/_settings
{
"index.routing.allocation.require.my_node_type":"warm"
}
GET _cat/shards/index-2022-05?v
```

3. ES跨集群搜索（CCS）ES水平扩展存在的问题单集群水平扩展时，节点数不能无限增加

### 第 6 页

![Elasticsearch 教程配图（46-15 第6页 图1）](/中间件/elasticsearch/46-15/p06-page.png)

Elasticsearch 5.3引入了跨集群搜索的功能(Cross Cluster Search)，推荐使用

- 1）配置集群当集群的meta 信息(节点，索引，集群状态)过多会导致更新压力变大，单个Active Master会成为性能瓶颈，

导致整个集群无法正常工作早期版本，通过Tribe Node可以实现多集群访问的需求，但是还存在一定的问题Tribe Node会以Client Node的方式加入每个集群，集群中Master节点的任务变更需要Tribe Node 的回应才能继续。

Tribe Node 不保存Cluster State信息，一旦重启，初始化很慢当多个集群存在索引重名的情况时，只能设置一种 Prefer 规则跨集群搜索实战允许任何节点扮演联合节点，以轻量的方式，将搜索请求进行代理不需要以Client Node的形式加入其他集群

### 第 7 页

![Elasticsearch 教程配图（46-15 第7页 图1）](/中间件/elasticsearch/46-15/p07-page.png)

//启动3个集群1

```
elasticsearch.bat -E node.name=cluster0node -E cluster.name=cluster0 -E
path.data=cluster0_data -E discovery.type=single-node -E http.port=9200 -E
transport.port=9300
elasticsearch.bat -E node.name=cluster1node -E cluster.name=cluster1 -E
path.data=cluster1_data -E discovery.type=single-node -E http.port=9201 -E
transport.port=9301
elasticsearch.bat -E node.name=cluster2node -E cluster.name=cluster2 -E
path.data=cluster2_data -E discovery.type=single-node -E http.port=9202 -E
transport.port=9302
```

5//在每个集群上设置动态的设置6

```
PUT _cluster/settings
{
"persistent": {
"cluster": {
"remote": {
"cluster0": {
"seeds": [
"127.0.0.1:9300"
],
"transport.ping_schedule": "30s"
},
"cluster1": {
"seeds": [
"127.0.0.1:9301"
],
"transport.compress": true,
"skip_unavailable": true
},
"cluster2": {
"seeds": [
"127.0.0.1:9302"
]
}
}
}
}
}
```

34

### 第 8 页

CCS的配置：

- 1）seeds配置的远程集群的remote cluster的一个node。

- 2）connected如果至有少一个到远程集群的连接则为true。

- 3）num_nodes_connected远程集群中连接节点的数量。

- 4）max_connections_per_cluster远程集群维护的最大连接数。

- 5）transport.ping_schedule设置了tcp层面的活性监听6）skip_unavailable设置为true的话，当这个remote cluster不可用的时候，就会忽略，默认是false，当对应的remotecluster不可用的话，则会报错。

- 7）cluster.remote.connections_per_clustergateway nodes数量，默认是38）cluster.remote.initial_connect_timeout节点启动时等待远程节点的超时时间，默认是30s9）cluster.remote.node.attr：

一个节点属性，用于过滤掉remote cluster中 符合gateway nodes的节点，比如设置

```
cluster.remote.node.attr=gateway，那么将匹配节点属性node.attr.gateway: true 的node才会被该node
```

连接用来做CCS查询。

- 10）cluster.remote.connect：

默认情况下，群集中的任意节点都可以充当federated client并连接到remote cluster，

```
cluster.remote.connect可以设置为 false（默认为true）以防止某些节点连接到remote cluster
```

- 11）在使用api进行动态设置的时候每次都要把seeds带上

- 2）创建测试数据

### 第 9 页

![Elasticsearch 教程配图（46-15 第9页 图1）](/中间件/elasticsearch/46-15/p09-page.png)

- 3）查询

```
#在不同集群上执行
# cluster0 localhost:9200
POST /users/_doc
{
"name":"fox",
"age":"30"
}
```

8

```
#cluster1  localhost:9201
POST /users/_doc
{
"name":"monkey",
"age":"33"
}
```

15

```
#cluster2  localhost:9202
POST /users/_doc
{
"name":"mark",
"age":"35"
}
```

22

```
#查询结果获取到所有集群符合要求的数据
GET /users,cluster1:users,cluster2:users/_search
{
"query": {
"range": {
"age": {
"gte": 30,
"lte":
}
}
}
}
```

### 第 10 页

![Elasticsearch 教程配图（46-15 第10页 图1）](/中间件/elasticsearch/46-15/p10-page.png)

一个集群总共需要多少个节点?一个索引需要设置几个分片？规划上需要保持一定的余量，当负载出现波动，节点出现丢失时，还能正常运行。

做容量规划时，一些需要考虑的因素：

做容量规划之前应该先对业务的性能需求做一个评估。

评估业务的性能需求：

常见用例：

硬件配置：

4. 如何对集群的容量进行规划机器的软硬件配置单条文档的大小│文档的总数据量│索引的总数据量（(Time base数据保留的时间)|副本分片数文档是如何写入的(Bulk的大小)文档的复杂度，文档是如何进行读取的(怎么样的查询和聚合)数据吞吐及性能需求数据写入的吞吐量，每秒要求写入多少数据?

查询的吞吐量?

单条查询可接受的最大返回时间?

了解你的数据数据的格式和数据的Mapping实际的查询和聚合长的是什么样的搜索: 固定大小的数据集搜索的数据集增长相对比较缓慢日志: 基于时间序列的数据使用ES存放日志与性能指标。数据每天不断写入，增长速度较快结合Warm Node 做数据的老化处理选择合理的硬件，数据节点尽可能使用SSD搜索等性能要求高的场景，建议SSD按照1∶10-20的比例配置内存和硬盘日志类和查询并发低的场景，可以考虑使用机械硬盘存储按照1:50的比例配置内存和硬盘单节点数据建议控制在2TB以内，最大不建议超过5TBJVM配置机器内存的一半，JVM内存配置不建议超过32G不建议在一台服务器上运行多个节点

### 第 11 页

![Elasticsearch 教程配图（46-15 第11页 图1）](/中间件/elasticsearch/46-15/p11-page.png)

内存大小要根据Node 需要存储的数据来进行估算假设总数据量1T，设置一个副本就是2T总数据量

部署方式：

集群扩容：

容量规划案例1: 固定大小的数据集场景：产品信息库搜索特性：

估算索引的的数据量，然后确定分片的大小：

思考：如果单个索引数据量非常大，如何优化提升查询性能？

拆分索引搜索类的比例建议: 1:16日志类: 1:48——1:96之间如果搜索类的项目，每个节点31*16 = 496 G，加上预留空间。所以每个节点最多400G数据，至少需要5个数据节点如果是日志类项目，每个节点31*50= 1550 GB，2个数据节点即可按需选择合理的部署方式如果需要考虑可靠性高可用，建议部署3台单一的Master节点如果有复杂的查询和聚合，建议设置Coordinating节点增加Coordinating / Ingest Node解决CPU和内存开销的问题增加数据节点解决存储的容量的问题为避免分片分布不均的问题，要提前监控磁盘空间，提前清理数据或增加节点被搜索的数据集很大，但是增长相对比较慢(不会有大量的写入)。更关心搜索和聚合的读取性能数据的重要性与时间范围无关。关注的是搜索的相关度单个分片的数据不要超过20 GB可以通过增加副本分片，提高查询的吞吐量如果业务上有大量的查询是基于一个字段进行Filter，该字段又是一个数量有限的枚举值。

例如订单所在的地区。可以考虑以地区进行索引拆分如果在单个索引有大量的数据，可以考虑将索引拆分成多个索引：

查询性能可以得到提高如果要对多个索引进行查询，还是可以在查询中指定多个索引得以实现如果业务上有大量的查询是基于一个字段进行Filter，该字段数值并不固定

### 第 12 页

![Elasticsearch 教程配图（46-15 第12页 图1）](/中间件/elasticsearch/46-15/p12-page.png)

容量规划案例2: 基于时间序列的数据相关的场景：

特性：

创建基于时间序列的索引创建timed-base索引这样做的好处：更加合理的组织索引，例如随着时间推移，便于对索引做的老化处理。

基于Date Math方式建立索引比如：假设当前日期 2022-05-27可以启用Routing 功能，按照filter 字段的值分布到集群中不同的shard，降低查询时相关的shard数提高CPU利用率es分片路由的规则:1shard_num = hash(_routing) % num_primary_shards2_routing字段的取值，默认是_id字段，可以自定义。

3

4

```
PUT /users
{
"settings": {
"number_of_shards":2
}
}
POST /users/_create/1?routing=fox
{
"name":"fox"
}
```

日志/指标/安全相关的事件舆情分析每条数据都有时间戳，文档基本不会被更新(日志和指标数据)用户更多的会查询近期的数据，对旧的数据查询相对较少对数据的写入性能要求比较高在索引的名字中增加时间信息按照每天/每周/每月的方式进行划分可以利用Hot & Warm 架构备份和删除的效率高

### 第 13 页

![Elasticsearch 教程配图（46-15 第13页 图1）](/中间件/elasticsearch/46-15/p13-page.png)

基于Index Alias索引最新的数据\<\i\n\d\e\x\N\a\m\e\-\{\n\o\w\/\d\}\>\indexName-2022.05.27\<\i\n\d\e\x\N\a\m\e\-\{\n\o\w\{\Y\Y\Y\Y\.\M\M\}\}\>\indexName-2022.05

```
# PUT /<logs-{now/d}>
PUT /%3Clogs-%7Bnow%2Fd%7D%3E
```

3

```
# POST /<logs-{now/d}>/_search
POST /%3Clogs-%7Bnow%2Fd%7D%3E/_search
```

创建索引，每天/每周/每月在索引的名字中增加时间信息

### 第 14 页

![Elasticsearch 教程配图（46-15 第14页 图1）](/中间件/elasticsearch/46-15/p14-page.png)

单个分片两个分片

```
PUT /logs_2022-05-27
PUT /logs_2022-05-26
```

3

```
#可以每天晚上定时执行
POST /_aliases
{
"actions": [
{
"add": {
"index": "logs_2022-05-27",
"alias": "logs_write"
}
},
{
"remove": {
"index": "logs_2022-05-26",
"alias": "logs_write"
}
}
]
}
```

22

```
GET /logs_write
```

5. 如何设计和管理分片7.0开始，新创建一个索引时，默认只有一个主分片。

单个分片，查询算分，聚合不准的问题都可以得以避免单个索引，单个分片时候，集群无法实现水平扩展。

即使增加新的节点，无法实现水平扩展

### 第 15 页

![Elasticsearch 教程配图（46-15 第15页 图1）](/中间件/elasticsearch/46-15/p15-page.png)

集群增加一个节点后，Elasticsearch 会自动进行分片的移动，也叫 Shard Rebalancing当分片数>节点数时多分片的好处: 一个索引如果分布在不同的节点，多个节点可以并行执行

案例1

案例2

分片过多所带来的副作用Shard是Elasticsearch 实现集群水平扩展的最小单位。过多设置分片数会带来一些潜在的问题：

从存储的物理角度看：

为什么要控制分片存储大小：

如何设计分片数一旦集群中有新的数据节点加入，分片就可以自动进行分配分片在重新分配时，系统不会有downtime查询可以并行执行数据写入可以分散到多个机器每天1GB的数据，一个索引一个主分片，一个副本分片需保留半年的数据，接近360 GB的数据量，360个分片5个不同的日志，每天创建一个日志索引。每个日志索引创建10个主分片保留半年的数据5*10* 30* 6 = 9000个分片每个分片是一个Lucene的索引，会使用机器的资源。过多的分片会导致额外的性能开销。

Lucene Indices / File descriptors / RAM/ CPU每次搜索的请求,需要从每个分片上获取数据分片的Meta 信息由Master节点维护。过多，会增加管理的负担。经验值，控制分片总数在10W以内如何确定主分片数搜索类应用，单个分片不要超过20 GB日志类应用，单个分片不要大于50 GB提高Update 的性能进行Merge 时，减少所需的资源丢失节点后，具备更快的恢复速度

### 第 16 页

![Elasticsearch 教程配图（46-15 第16页 图1）](/中间件/elasticsearch/46-15/p16-page.png)

副本是主分片的拷贝：

对性能的影响：

ES的分片策略会尽量保证节点上的分片数大致相同，但是有些场景下会导致分配不均匀：

可以通过调整分片总数，避免分配不均衡如果目标Node的Shard数超过了配置的上限，则不允许分配Shard到该Node上。注意：index级别的配置会覆盖cluster级别的配置。

思考：5个节点的集群。索引有5个主分片，1个副本，index.routing.allocation.total_shards_per_node应该如何设置?

便于分片在集群内 Rebalancing如何确定副本分片数提高系统可用性︰响应查询请求，防止数据丢失需要占用和主分片一样的资源副本会降低数据的索引速度: 有几份副本就会有几倍的CPU资源消耗在索引上会减缓对主分片的查询压力，但是会消耗同样的内存资源。如果机器资源充分，提高副本数，可以提高整体的查询QPS扩容的新节点没有数据，导致新索引集中在新的节点热点数据过于集中，可能会产生性能问题"index.routing.allocation.total_shards_per_node"，index级别的，表示这个index每个Node总共允许存在多少个shard，默认值是-1表示无穷多个；

"cluster.routing.allocation.total_shards_per_node"，cluster级别，表示集群范围内每个Node允许存在有多少个shard。默认值是-1表示无穷多个。

(5+5)/ 5= 2生产环境中要适当调大这个数字，避免有节点下线时，分片无法正常迁移

---

## 第二部分：底层读写原理与性能调优


### 第 1 页

![Elasticsearch 教程配图（46-1 第1页 图1）](/中间件/elasticsearch/46-1/p01-01.png)

如图所示：当我们想一个集群保存文档时，文档该存储到哪个节点呢？ 是随机吗？ 是轮询吗？

实际上，在ELasticsearch中，会采用计算的方式来确定存储到哪个节点，计算公式如下：

这就是为什么创建了主分片后，不能修改的原因。

写请求是写入 primary shard，然后同步给所有的 replica shard；读请求可以从 primary shard 或replica shard 读取，采用的是随机轮询算法。

1. ES底层读写工作原理分析分片路由

```
# es分片路由的规则
shard_num = hash(_routing) % num_primary_shards
# _routing字段的取值，默认是_id字段，可以自定义。
```

ES写入数据的过程客户端选择一个node发送请求过去，这个node就是coordinating node (协调节点)coordinating node，对document进行路由，将请求转发给对应的nodenode上的primary shard处理请求，然后将数据同步到replica node1.

2.

3.

### 第 2 页

![Elasticsearch 教程配图（46-1 第2页 图1）](/中间件/elasticsearch/46-1/p02-page.png)

根据 doc id 进行 hash，判断出来当时把 doc id 分配到了哪个 shard 上面去，从那个 shard 去查询。

文档能够从主分片或任意一个复制分片被检索。

对于全文搜索而言，文档可能分散在各个节点上，那么在分布式的情况下，如何搜索文档呢？

核心概念segment file: 存储倒排索引的文件，每个segment本质上就是一个倒排索引，每秒都会生成一个segment文件，当文件过多时es会自动进行segment merge（合并文件），合并时会同时将已经标注删除的文档物理删除。

commit point: 记录当前所有可用的segment，每个commit point都会维护一个.del文件，即每个.del文件都有一个commit point文件（es删除数据本质是不属于物理删除），当es做删改操作时首先会在.del文件中声明某个document已经被删除，文件内记录了在某个segment内某个文档已经被删除，当查询请求过来时在segment中被删除的文件是能够查出来的，但是当返回结果时会根据commit point维护的那个.del文件把已经删除的文档过滤掉translog日志文件: 为了防止elasticsearch宕机造成数据丢失保证可靠存储，es会将每次写入数据同时写到translog日志中。

coordinating node如果发现primary node和所有的replica node都搞定之后，就会返回请求到客户端ES读取数据的过程根据id查询数据的过程客户端发送请求到任意一个 node，成为 coordinate node 。

coordinate node 对 doc id 进行哈希路由(hash(_id)%shards_size)，将请求转发到对应的 node，此时会使用round-robin 随机轮询算法，在 primary shard 以及其所有 replica 中随机选择一个，让读请求负载均衡。

接收请求的 node 返回 document 给 coordinate node 。

coordinate node 返回 document 给客户端。

根据关键词查询数据的过程客户端发送请求到一个 coordinate node 。

协调节点将搜索请求转发到所有的 shard 对应的 primary shard 或 replica shard ，都可以。

query phase：每个 shard 将自己的搜索结果返回给协调节点，由协调节点进行数据的合并、排序、分页等操作，产出最终结果。

fetch phase：接着由协调节点根据 doc id 去各个节点上拉取实际的 document 数据，最终返回给客户端。

写数据底层原理4.

1.

2.

3.

4.

### 第 3 页

![Elasticsearch 教程配图（46-1 第3页 图1）](/中间件/elasticsearch/46-1/p03-page.png)

os cache：操作系统里面，磁盘文件其实都有一个东西，叫做os cache，操作系统缓存，就是说数据写入磁盘文件之前，会先进入os cache，先进入操作系统级别的一个内存缓存中去RefreshTranslogFlush将文档先保存在Index buffer中，以refresh_interval为间隔时间，定期清空buffer，生成 segment,借助文件系统缓存的特性，先将segment放在文件系统缓存中，并开放查询，以提升搜索的实时性Segment没有写入磁盘，即便发生了宕机，重启后，数据也能恢复，从ES6.0开始默认配置是每次请求都会落盘删除旧的translog 文件生成Segment并写入磁盘│更新commit point并写入磁盘。ES自动完成，可优化点不多

2. 如何提升集群的读写性能提升集群读取性能的方法数据建模尽量将数据先行计算，然后保存到Elasticsearch 中。尽量避免查询时的 Script计算

### 第 4 页

![Elasticsearch 教程配图（46-1 第4页 图1）](/中间件/elasticsearch/46-1/p04-page.png)

```
#避免查询时脚本
GET blogs/_search
{
"query": {
"bool": {
"must": [
{"match": {
"title": "elasticsearch"
}}
],
```

11"filter": {12"script": {13"script": {14"source": "doc['title.keyword'].value.length()>5"15

```
}
}
}
}
}
}
```

尽量使用Filter Context，利用缓存机制，减少不必要的算分结合profile，explain API分析慢查询的问题，持续优化数据模型避免使用*开头的通配符查询

```
GET /es_db/_search
{
"query": {
"wildcard": {
"address": {
"value": "*白云*"
}
}
}
}
```

### 第 5 页

![Elasticsearch 教程配图（46-1 第5页 图1）](/中间件/elasticsearch/46-1/p05-page.png)

优化分片避免Over Sharing一个查询需要访问每一个分片，分片过多，会导致不必要的查询开销结合应用场景，控制单个分片的大小Search: 20GBLogging: 50GBForce-merge Read-only索引使用基于时间序列的索引，将只读的索引进行force merge，减少segment数量

```
#手动force merge
POST /my_index/_forcemerge
```

提升写入性能的方法写性能优化的目标: 增大写吞吐量，越高越好客户端: 多线程，批量写可以通过性能测试，确定最佳文档数量多线程: 需要观察是否有HTTP 429（Too Many Requests）返回，实现 Retry以及线程数量的自动调节服务器端: 单个性能问题，往往是多个因素造成的。需要先分解问题，在单个节点上进行调整并且结合测试，尽可能压榨硬件资源,以达到最高吞吐量使用更好的硬件。观察CPU / IO Block线程切换│堆栈状况服务器端优化写入性能的一些手段降低IO操作使用ES自动生成的文档ld一些相关的ES 配置，如Refresh Interval降低 CPU 和存储开销减少不必要分词避免不需要旳doc_values文档的字段尽量保证相同的顺予，可以提高文档的压缩率

### 第 6 页

![Elasticsearch 教程配图（46-1 第6页 图1）](/中间件/elasticsearch/46-1/p06-page.png)

注意：ES 的默认设置，已经综合考虑了数据可靠性，搜索的实时性，写入速度，一般不要盲目修改。

一切优化，都要基于高质量的数据建模。

如果需要追求极致的写入速度，可以牺牲数据可靠性及搜索实时性以换取性能：

尽可能做到写入和分片的均衡负载，实现水平扩展Shard Filtering / Write Load Balancer调整Bulk 线程池和队列建模时的优化只需要聚合不需要搜索，index设置成false不要对字符串使用默认的dynamic mapping。字段数量过多，会对性能产生比较大的影响Index_options控制在创建倒排索引时，哪些内容会被添加到倒排索引中。

牺牲可靠性: 将副本分片设置为0，写入完毕再调整回去牺牲搜索实时性︰增加Refresh Interval的时间牺牲可靠性: 修改Translog的配置降低 Refresh的频率增加refresh_interval 的数值。默认为1s ，如果设置成-1，会禁止自动refresh避免过于频繁的refresh，而生成过多的segment 文件但是会降低搜索的实时性

```
PUT /my_index/_settings
{
"index" : {
"refresh_interval" : "10s"
}
}
```

增大静态配置参数indices.memory.index_buffer_size默认是10%，会导致自动触发refresh降低Translog写磁盘的频率，但是会降低容灾能力

### 第 7 页

![Elasticsearch 教程配图（46-1 第7页 图1）](/中间件/elasticsearch/46-1/p07-page.png)

Index.translog.durability: 默认是request，每个请求都落盘。设置成async，异步写入lndex.translog.sync_interval：设置为60s，每分钟执行一次Index.translog.flush_threshod_size: 默认512 m，可以适当调大。当translog 超过该值，会触发flush分片设定副本在写入时设为0，完成后再增加合理设置主分片数，确保均匀分配在所有数据节点上Index.routing.allocation.total_share_per_node:限定每个索引在每个节点上可分配的主分片数调整Bulk 线程池和队列客户端单个bulk请求体的数据量不要太大，官方建议大约5-15m写入端的 bulk请求超时需要足够长，建议60s 以上写入端尽量将数据轮询打到不同节点。

服务器端索引创建属于计算密集型任务，应该使用固定大小的线程池来配置。来不及处理的放入队列，线程数应该配置成CPU核心数+1，避免过多的上下文切换队列大小可以适当增加，不要过大，否则占用的内存会成为GC的负担ES线程池设置：

https://blog.csdn.net/justlpf/article/details/103233215

### 第 8 页

![Elasticsearch 教程配图（46-1 第8页 图1）](/中间件/elasticsearch/46-1/p08-page.png)

```
DELETE myindex
PUT myindex
{
"settings": {
"index": {
"refresh_interval": "30s",  #30s一次refresh
"number_of_shards": "2"
},
"routing": {
"allocation": {
"total_shards_per_node": "3"  #控制分片，避免数据热点
}
},
"translog": {
"sync_interval": "30s",
"durability": "async"    #降低translog落盘频率
},
"number_of_replicas":
},
"mappings": {
"dynamic": false,     #避免不必要的字段索引，必要时可以通过update by query索引必要的字
```

段21"properties": {}22

```
}
}
```

---

## 小结

- 本篇为 Elasticsearch 系列第 9/10 篇，主题：**ES 集群生产实践与性能调优**。
- 建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。
- 系列文章路径前缀：`/中间件/elasticsearch/`。

下一篇：[《ELK 日志体系与 MySQL 到 ES 一致性》](/中间件/elasticsearch/es-10-elk-sync)
