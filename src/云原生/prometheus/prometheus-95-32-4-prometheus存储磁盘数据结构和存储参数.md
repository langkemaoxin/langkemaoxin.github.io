---
title: 32.4 prometheus存储磁盘数据结构和存储参数
sidebarGroup: Prometheus
shortTitle: 95 32.4 prometheus存储磁盘数据结...
order: 95
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - prometheus存储磁盘数据结构介绍 - index - chunks - head chunks - Tombstones - wal - prometheus对block...'
---

> **Prometheus · 第 95 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- prometheus存储磁盘数据结构介绍
  - index
  - chunks
  - head chunks
  - Tombstones
  - wal
- prometheus对block进行定时压实 compact
- prometheus 查看支持的存储参数

# prometheus存储示意图

![prome_tsdb_01.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/cdea5bcc1fc44e258dcc6ba99bcfd3aa.jpg)

# 内存和disk之间的纽带 wal

- WAL目录中包含了多个连续编号的且大小为128M的文件，Prometheus称这样的文件为Segment，其中存放的就是对内存中series以及sample数据的备份。
- 另外还包含一个以checkpoint为前缀的子目录，由于内存中的时序数据经常会做持久化处理，WAL中的数据也将因此出现冗余
- 所以每次在对内存数据进行持久化之后，Prometheus都会对部分编号靠后的Segment进行清理。但是我们并没有办法做到恰好将已经持久化的数据从Segment中剔除，也就是说被删除的Segment中部分的数据依然可能是有用的。所以在清理Segment时，我们会将肯定无效的数据删除，剩下的数据就存放在checkpoint中。而在Prometheus重启时，应该首先加载checkpoint中的内容，再按序加载各个Segment的内容。
- 最后，series和samples以Record的形式被批量写入Segment文件中，默认当Segment超过128M时，会创建新的Segment文件。若Prometheus因为各种原因崩溃了，WAL里的各个Segment以及checkpoint里的内容就是在崩溃时刻Prometheus内存的映像。Prometheus在重启时只要加载WAL中的内容就能完全"恢复现场"。

# 磁盘数据结构

## promethues 磁盘数据结构

![prome_tsdb_disk_01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/4666e321c4384d1fb1d7f475879ab285.png)

![prome_tsdb_disk_02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/6400f9031f894aee8d0449930e702203.png)

### Index Disk Format

- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/index.md

### Chunks

- 下面介绍块文件的格式，该文件在chunks/块目录中创建。每个段文件的最大大小为512MiB。
- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/chunks.md

### head chunks

- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/head_chunks.md

### Tombstones

- prometheus 删除数据`/admin/tsdb/delete_series`
- tombstones用于存储对于series的删除记录。如果删除了某个时间序列，Prometheus并不会立即对它进行清理，而是会在tombstones做一次记录，等到下一次Block压缩合并的时候统一清理。![prome_tsdb_disk_tombstone.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/8ca08eb7713a4c28963ebc64fe8527d1.png)
- 文档地址 https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/tombstones.md

### wal

- 文档地址  https://github.com/prometheus/prometheus/blob/release-2.26/tsdb/docs/format/wal.md![prome_tsdb_disk_series.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/e6271d5a00744636b53911268e59cf2f.png)
- ![prome_tsdb_disk_sample.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722123000/8dac04ca148947fcafaa75d7212eb69c.png)
- 该预写日志在编号和顺序，如段工作000000，000001，000002等，在默认情况下被限制为128MB
- 段写入到32KB的页面中。仅最近段的最后一页可能是不完整的
- WAL记录是一个不透明的字节片，如果超过当前页面的剩余空间，它将被分成子记录。记录永远不会跨段边界拆分
- 如果单个记录超过了默认的段大小，则将创建一个更大的段。页面的编码很大程度上是从LevelDB / RocksDB的预写日志中借用的。

# prometheus对block进行定时压实 compact

> 压实的作用

- 标记删除
- Compaction主要操作包括合并block、删除过期数据、重构chunk数据
- 其中合并多个block成为更大的block，可以有效减少block个数，当查询覆盖的时间范围较长时，避免需要合并很多block的查询结果。
- 为提高删除效率，删除时序数据时，会记录删除的位置，只有block所有数据都需要删除时，才将block整个目录删除，因此block合并的大小也需要进行限制，

# 访问prometheus flags api 查看支持的存储参数

| 参数名                                 | 含义                                                                                                                                                                                                              | 默认值                   | 说明                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------ |
| storage.remote.flush-deadline          | 在关闭或配置重新加载时等待存储刷盘的时间                                                                                                                                                                          | 1分钟                    | 可以依据数据量调整             |
| storage.remote.read-concurrent-limit   | 远程读取调用的并发qps， 0表示没有限制。                                                                                                                                                                           | 10                       | 保护后端存储，避免被高并发打垮 |
| storage.remote.read-max-bytes-in-frame | 远程读取流中，在解码数据前，单个帧中的最大字节数。请注意，客户端也可能会限制帧大小。默认为protobuf建议的1MB。                                                                                                     | 1M                       | 保护后端存储，避免被高并发打垮 |
| storage.remote.read-sample-limit       | 在单个查询中要通过远程读取接口返回的最大样本总数。 0表示没有限制。对于流式响应类型，将忽略此限制。                                                                                                                | 10                       | 保护后端存储，避免被高并发打垮 |
| storage.tsdb.allow-overlapping-blocks  | 允许重叠的块，从而启用垂直压缩和垂直查询合并                                                                                                                                                                      | false                    |                                |
| storage.tsdb.max-block-duration        | 压实块的时间范围上限 用于测试。                                                                                                                                                                                   | （默认为保留期的10％。） |                                |
| storage.tsdb.min-block-duration        | 数据块在保留之前的最小持续时间。用于测试。                                                                                                                                                                        |                          |                                |
| storage.tsdb.no-lockfile               | 不要在数据目录中创建锁文件。                                                                                                                                                                                      | false                    |                                |
| storage.tsdb.path                      | 数据目录path                                                                                                                                                                                                      | 默认为进程运行目录的data |                                |
| storage.tsdb.retention.time            | 保存样品的时间。当设置此标志时，它将覆盖“storage.tsdb.retention”。如果既没有这个标志，也没有“storage.tsdb”。保留”也不“storage.tsdb.retention。设置大小，保留时间默 认为15d。支持单位:y, w, d, h, m, s, ms。 | 保留时间默 认为15d       |                                |
| storage.tsdb.retention.size            | 大小[实验]块可以存储的最大字节数。需要一个单位，支持单位:B, KB, MB, GB, TB, PB, EB。例:“512 mb”。这个标志是实验性的，可以在以后的版本中更改                                                                     |                          |                                |
| storage.tsdb.wal-compression           | 开启wal snappy压缩                                                                                                                                                                                                | true                     |                                |
| storage.tsdb.wal-segment-size          | wal文件大小                                                                                                                                                                                                       | 默认128M                 |                                |

# 本节重点总结 :

- prometheus存储磁盘数据结构介绍
  - index
  - chunks
  - head chunks
  - Tombstones
  - wal
- prometheus对block进行定时压实 compact
- prometheus 查看支持的存储参数

