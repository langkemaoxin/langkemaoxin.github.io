---
title: Prometheus 第30章：存储与 WAL
sidebarGroup: 可观测性
shortTitle: 42 存储与 WAL
order: 42
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第30章（存储与 WAL）合并笔记
---

> **Prometheus · 第 30 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 30.1 时序数据库TSDB的典型特点

# 本节重点介绍 :

- db-ranking网站对db进行排名
- 时序数据特点
- 时序数据库特点
- 时序数据库遇到的挑战
- 开源时间序列数据库

# db-ranking

> 一个神奇的网站  https://db-engines.com/en/ranking

> 时序数据ranking https://db-engines.com/en/ranking/time+series+dbms
> ![db_engine_tsdb_ranking.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721540000/746a8c1754714600afa1ebee36717390.png)

> 排名方法  https://db-engines.com/en/ranking_definition
>
>
> ![tsdb_ranking_2.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721540000/006fc9068c5f4d34b57b7ac991b34741.png)

- DB引擎排名得分的计算方法
- DB-Engines排名是按当前流行程度排名的数据库管理系统的列表。我们通过使用以下参数来衡量系统的普及程度：
- 网站上系统提及的次数，以搜索引擎查询中结果的数量来衡量。目前，我们使用Google和Bing进行此度量。为了仅计算相关结果，我们正在与术语数据库（例如“ Oracle”和“ database”）一起搜索`<system name>`。
- 对系统的普遍兴趣。 对于此度量，我们使用Google趋势中的搜索频率。
- 有关系统的技术讨论频率。 我们使用与IT相关的著名问答站点Stack Overflow和DBA Stack Exchange上的相关问题数量和感兴趣的用户数量。
- 提及系统的工作机会数量。 我们使用的确有实物，只是雇用了领先的求职引擎上的报价。
- 提到系统的专业网络中的配置文件数。 我们使用国际上最受欢迎的专业网络LinkedIn。
- 社交网络中的相关性。我们计算提到该系统的Twitter推文的数量。

# 时序数据

> 带时间标签的数据也称为时间序列数据

> 具有不变性,、唯一性、时间排序性

- 举例![mysql.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721540000/0b59d4fb977545b09ef0cae701098d56.png)

# 时序数据库

> 时序数据库就是存放时序数据的数据库，并且需要支持时序数据的快速写入、持久化、多纬度的聚合查询等基本功能。

> Time Series DBMS are designed to efficiently collect, store and query various time series with high transaction volumes

## 数据写入的特点

> 写入平稳、持续、高并发高吞吐

- 时序数据的写入是比较平稳的，这点与应用数据不同，应用数据通常与应用的访问量成正比，而应用的访问量通常存在波峰波谷
- 时序数据的产生通常是以一个固定的时间频率产生，不会受其他因素的制约，其数据生成的速度是相对比较平稳的

> 写多读少

- 时序数据上95%-99%的操作都是写操作，是典型的写多读少的数据
- 这与其数据特性相关，例如监控数据，你的监控项可能很多，但是你真正去读的可能比较少，通常只会关心几个特定的关键指标或者在特定的场景下才会去读数据。

> 实时写入最近生成的数据，无更新

- 时序数据的写入是实时的，且每次写入都是最近生成的数据，这与其数据生成的特点相关，因为其数据生成是随着时间推进的，而新生成的数据会实时的进行写入
- 数据写入无更新，在时间这个维度上，随着时间的推进，每次数据都是新数据，不会存在旧数据的更新，不过不排除人为的对数据做订正。

## 数据查询和分析的特点

- 按时间范围读取：通常来说，你不会去关心某个特定点的数据，而是一段时间的数据。
- 最近的数据被读取的概率高
- 历史数据以粗粒度查询
- 多种精度查询
- 多维度分析

## 数据存储的特点

> 数据量大

- 拿监控数据来举例，如果我们采集的监控数据的时间间隔是1s，那一个监控项每天会产生86400个数据点
- 若有10000个监控项，则一天就会产生864000000个数据点。在物联网场景下，这个数字会更大。整个数据的规模，是TB甚至是PB级的。

> 冷热分明

- 时序数据有非常典型的冷热特征，越是历史的数据，被查询和分析的概率越低

> 具有时效性

- 时序数据具有时效性，数据通常会有一个保存周期，超过这个保存周期的数据可以认为是失效的，可以被回收
- 一方面是因为越是历史的数据，可利用的价值越低；另一方面是为了节省存储成本，低价值的数据可以被清理。

> 多精度数据存储

- 在查询的特点里提到时序数据出于存储成本和查询效率的考虑，会需要一个多精度的查询，同样也需要一个多精度数据的存储。

## 时序数据库遇到的挑战

> 能否使用关系型数据库实现tsdb

- 很多人可能认为在传统关系型数据库上加上时间戳一列就能作为时序数据库
- 数据量少的时候确实也没问题，但少量数据是展现的纬度有限，细节少，可置信低，更加不能用来做大数据分析
- 很明显时序数据库是为了解决海量数据场景而设计的。

> 可以看到时序数据库需要解决以下几个问题

- 时序数据的写入：如何支持每秒钟上千万上亿数据点的写入。
- 时序数据的读取：又如何支持在秒级对上亿数据的分组聚合运算。
- 成本敏感：由海量数据存储带来的是成本问题。如何更低成本的存储这些数据，将成为时序数据库需要解决的重中之重。

# 开源时间序列数据库

> 时间轴

- 1999/07/16 RRDTool First release
- 2009/12/30 Graphite 0.9.5
- 2011/12/23 OpenTSDB 1.0.0
- 2013/05/24 KairosDB 1.0.0-beta
- 2013/10/24 InfluxDB 0.0.1
- 2014/08/25 Heroic 0.3.0
- 2017/03/27 TimescaleDB 0.0.1-beta

> 简介

- RRDTool 是最早的时间序列数据库，它自带画图功能，现在大部分时间序列数据库都使用Grafana来画图。
- Graphite 是用 Python 写的 RRD 数据库，它的存储引擎 Whisper 也是 Python 写的， 它画图和聚合能力都强了很多，但是很难水平扩展。
- OpenTSDB 使用 HBase 解决了水平扩展的问题
- KairosDB 最初是基于OpenTSDB修改的，但是作者认为兼容HBase导致他们不能使用很多 Cassandra 独有的特性， 于是就抛弃了HBase仅支持Cassandra。
- 新发布的 OpenTSDB 中也加入了对 Cassandra 的支持。 故事还没完，Spotify 的人本来想使用 KairosDB，但是觉得项目发展方向不对以及性能太差，就自己撸了一个 Heroic。
- InfluxDB 早期是完全开源的，后来为了维持公司运营，闭源了集群版本。 在 Percona Live 上他们做了一个开源数据库商业模型正面临危机的演讲，里面调侃红帽的段子很不错。 并且今年的 Percona Live 还有专门的时间序列数据库单元。

# 本节重点总结 :

- db-ranking网站对db进行排名
- 时序数据特点
- 时序数据库特点
- 时序数据库遇到的挑战
- 开源时间序列数据库

## 30.2 不得不谈的lsm：分层结构和lsm数据结构

# 本节重点介绍 :

- LSM树核心特点
- LSM树的核心结构
  - MemTable
  - Immutable MemTable
  - SSTable
- LSM树的Compact策略
  - size-tiered 策略
  - leveled策略

# LSM树(Log-Structured-Merge-Tree)

- LSM树的名字往往会给初识者一个错误的印象，事实上，LSM树并不像B+树、红黑树一样是一颗严格的树状数据结构
- 它其实是一种存储结构，目前HBase,LevelDB,RocksDB这些NoSQL存储都是采用的LSM树

# 核心特点

- LSM树的核心特点是利用顺序写来提高写性能，但因为分层(此处分层是指的分为内存和文件两部分)的设计会稍微降低读性能
- 但是通过牺牲小部分读性能换来高性能写，使得LSM树成为非常流行的存储结构。

# LSM树的核心思想

![lsm.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/3a5d52412d0e4c8b86b4cbe5741d0d5e.png)

如上图所示，LSM树有以下三个重要组成部分：

1. MemTable

   - MemTable是在内存中的数据结构，用于保存最近更新的数据，会按照Key有序地组织这些数据
   - LSM树对于具体如何组织有序地组织数据并没有明确的数据结构定义，例如Hbase使跳跃表来保证内存中key的有序。
   - 因为数据暂时保存在内存中，内存并不是可靠存储，如果断电会丢失数据，因此通常会通过WAL(Write-ahead logging，预写式日志)的方式来保证数据的可靠性。
2. Immutable MemTable

   - 当 MemTable达到一定大小后，会转化成Immutable MemTable
   - Immutable MemTable是将转MemTable变为SSTable的一种中间状态
   - 写操作由新的MemTable处理，在转存过程中不阻塞数据更新操作
3. SSTable(Sorted String Table)
   ![lsm_sstable.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/84a960617f1d44a290ae4db355d627aa.png)

   - 有序键值对集合，是LSM树组在磁盘中的数据结构
   - 为了加快SSTable的读取，可以通过建立key的索引以及布隆过滤器来加快key的查找
   - 更新操作
     - 这里需要关注一个重点，LSM树(Log-Structured-Merge-Tree)正如它的名字一样，LSM树会将所有的数据插入、修改、删除等操作记录(注意是操作记录)保存在内存之中，当此类操作达到一定的数据量后，再批量地顺序写入到磁盘当中
     - 这与B+树不同，B+树数据的更新会直接在原数据所在处修改对应的值，但是LSM数的数据更新是日志式的，当一条数据更新是直接append一条更新记录完成的
     - 这样设计的目的就是为了顺序写，不断地将Immutable MemTable flush到持久化存储即可，而不用去修改之前的SSTable中的key，保证了顺序写。
   - 因此当MemTable达到一定大小flush到持久化存储变成SSTable后，在不同的SSTable中，可能存在相同Key的记录，当然最新的那条记录才是准确的。这样设计的虽然大大提高了写性能，但同时也会带来一些问题：
     1. 冗余存储，对于某个key，实际上除了最新的那条记录外，其他的记录都是冗余无用的，但是仍然占用了存储空间。因此需要进行Compact操作(合并多个SSTable)来清除冗余的记录。
     2. 读取时需要从最新的倒着查询，直到找到某个key的记录。最坏情况需要查询完所有的SSTable，这里可以通过前面提到的索引/布隆过滤器来优化查找速度。

# LSM树的Compact策略

> 从上面可以看出，Compact操作是十分关键的操作，否则SSTable数量会不断膨胀。在Compact策略上，主要介绍两种基本策略：size-tiered和leveled。

> 不过在介绍这两种策略之前，先介绍三个比较重要的概念，事实上不同的策略就是围绕这三个概念之间做出权衡和取舍。

## 三个重要概念

1. 读放大:读取数据时实际读取的数据量大于真正的数据量
   - 例如在LSM树中需要先在MemTable查看当前key是否存在，不存在继续从SSTable中寻找。
2. 写放大:写入数据时实际写入的数据量大于真正的数据量
   - 例如在LSM树中写入时可能触发Compact操作，导致实际写入的数据量远大于该key的数据量。
3. 空间放大:数据实际占用的磁盘空间比数据的真正大小更多
   - 上面提到的冗余存储，对于一个key来说，只有最新的那条记录是有效的，而之前的记录都是可以被清理回收的。

## size-tiered 策略

![lsm_size_tried.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/3b2c820cc0474e238f3895bd1bcf070d.png)

- size-tiered策略保证每层SSTable的大小相近，同时限制每一层SSTable的数量
- 如上图，每层限制SSTable为N，当每层SSTable达到N后，则触发Compact操作合并这些SSTable，并将合并后的结果写入到下一层成为一个更大的sstable。
- 由此可以看出，当层数达到一定数量时，最底层的单个SSTable的大小会变得非常大
- 并且size-tiered策略会导致空间放大比较严重。即使对于同一层的SSTable，每个key的记录是可能存在多份的，只有当该层的SSTable执行compact操作才会消除这些key的冗余记录。

## leveled策略

![lsm_level_compact.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/0e0dc748be9e44afb32cada73a6b729e.jpg)

- leveled策略也是采用分层的思想，每一层限制总文件的大小
- 但是跟size-tiered策略不同的是，leveled会将每一层切分成多个大小相近的SSTable
- 这些SSTable是这一层是`全局有序的`，意味着一个key在每一层至多只有1条记录，不存在冗余记录
- 之所以可以保证全局有序，是因为合并策略和size-tiered不同，接下来会详细提到。

![lsm_sstable.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/d31f001cb1524a55a91c4c0ee7869866.png)

### 合并过程

假设存在以下这样的场景:

1. L1的总大小超过L1本身大小限制：![lsm_compact_01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/1175e99f05134dc0b18fe1fc8187a39f.png)
2. 此时会从L1中选择至少一个文件，然后把它跟L2有交集的部分(非常关键)进行合并。生成的文件会放在L2:

   - ![lsm_compact_02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/63907b21f4fb46e79b22ebe0a233138c.png)
   - 如上图所示，此时L1第二SSTable的key的范围覆盖了L2中前三个SSTable，那么就需要将L1中第二个SSTable与L2中前三个SSTable执行Compact操作。
3. 如果L2合并后的结果仍旧超出L2的阈值大小，需要重复之前的操作 —— 选至少一个文件然后把它合并到下一层:![lsm_compact_03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/801f1beb92204f56ad7081eba7199688.png)
4. ![lsm_compact_04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721607000/56d4defefa1548ccbf833c34c4865b25.png)

- leveled策略相较于size-tiered策略来说，每层内key是不会重复的
- 即使是最坏的情况，除开最底层外，其余层都是重复key，按照相邻层大小比例为10来算，冗余占比也很小
- 因此空间放大问题得到缓解。但是写放大问题会更加突出。举一个最坏场景，如果LevelN层某个SSTable的key的范围跨度非常大，覆盖了LevelN+1层所有key的范围，那么进行Compact时将涉及LevelN+1层的全部数据。

# 总结

- LSM树是非常值得了解的知识，理解了LSM树可以很自然地理解Hbase，LevelDb等存储组件的架构设计
- ClickHouse中的MergeTree也是LSM树的思想，Log-Structured还可以联想到Kafka的存储方式。
- 虽然介绍了上面两种策略，但是各个存储都在自己的Compact策略上面做了很多特定的优化，例如Hbase分为Major和Minor两种Compact，这里不再做过多介绍，推荐阅读文末的RocksDb合并策略介绍。

# 本节重点总结 :

- LSM树核心特点
- LSM树的核心结构
  - MemTable
  - Immutable MemTable
  - SSTable
- LSM树的Compact策略
  - size-tiered 策略
  - leveled策略

