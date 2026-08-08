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
> 下一篇预告：[《Elasticsearch 高可用集群架构》](/中间件/elasticsearch/es-08-cluster)

---

## 开头：场景与目标

翻到第 1000 页为什么越来越慢？中文为什么必须分词？本篇剖析 from+size 深度分页陷阱，对比 scroll / search_after，并深入 IK 与自定义 Analyzer。


### 第 1 页

![Elasticsearch 教程配图（46-12 第1页 图1）](/中间件/elasticsearch/46-12/p01-01.png)

深度分页是指在处理大数据集查询时，用户尝试访问多页数据中较后面的页面时遇到的问题。当尝试访问排序后的数据列表的第1000页或更后面的页面时，数据库需要先跳过前面数十万条记录，这一过程通常涉及大量的数据扫描和排序，极大地增加了数据库的查询负载，从而成为性能瓶颈。

ES分页查询流程大致如下：

在分布式系统中，对结果排序的成本随分页的深度成指数上升。

从10万名高考生中查询成绩为的10001-10100位的100名考生的信息。

从上面案例中不难看出，每次有序的查询都会在每个分片中执行单独的查询，然后进行数据的二次排序，而这个二次排序的过程是发生在heap中的，也就是说当你单次查询的数量越大，那么堆内存中汇总的数据也就越多，对内存的压力也就越大。这里的单次查询的数据量取决于你查询的是第几条数据而不是查询了几条数据，比如你希望查询的是第10001-10100这一百条数据，但是ES必须将前10100全部取出进行二次查询。因此，如果查询的数据排序越靠后，就越容易导致OOM（Out Of Memory）情况的发生，频繁的深分页查询会导致频繁的FullGC。

1. 什么是深度分页数据存储在各个分片中，协调节点将查询请求转发给各个节点，当各个节点执行搜索后，将排序后的前N条数据返回给协调节点。

协调节点汇总各个分片返回的数据，再次排序，最终返回前N条数据给客户端。

这个流程会导致一个深度分页的问题，也就是翻页越多，性能越差，甚至导致ES出现OOM。

1.

2.

3.

### 第 2 页

![Elasticsearch 教程配图（46-12 第2页 图1）](/中间件/elasticsearch/46-12/p02-page.png)

ES为了避免用户在不了解其内部原理的情况下而做出错误的操作，设置了一个阈值，即max_result_window，其默认值为10000，其作用是为了保护堆内存不被错误操作导致溢出。

在Elasticsearch中，分页查询的实现主要通过两个参数from和size来实现。from参数指定了从结果集中的第几条数据开始返回，而size参数指定了返回数据的数量。正常情况下分页代码如实下面这样的：

输出结果如下图：

但是如果我们查询的数据页数特别大，当from + size大于10000的时候，就会出现问题，如下图报错信息所示：

分析可知，查询结果的窗口大小超过了最大窗口的限制，而index. max_result_window默认值为10000。

Elasticsearch会限制最大分页数，避免因大数据量的召回导致系统性能低下。Elasticsearch的max_result_window默认值是10000，意味着每页有10条数据，会最大翻页至1000页。主流搜索引擎实际都翻不了那么多页。

对此，有两个可行的解决方案，如下所示：

2. 深度分页不推荐使用from+size

```
# 查询第一页5条数据
GET /employee/_search
{
"query": {
"match_all": {}
},
"from": 0,
"size":
}
```

10方案一：对于大型数据集，我们可采用scroll API来召回数据。这个策略我们将在后续的内容中进行详细分析。

方案二：调大index.max_result_window默认值

```
PUT /employee/_settings
{
"index.max_result_window":
}
```

### 第 3 页

![Elasticsearch 教程配图（46-12 第3页 图1）](/中间件/elasticsearch/46-12/p03-page.png)

官方建议避免使用from+size来过度分页或一次请求太多结果。

不推荐使用from+size来深度分页的核心原因如下：

from+size分页查询的优缺点如下：

from+size查询适用场景如下：

解决深度分页问题最好的办法就是避免使用深度分页。谷歌、百度目前作为全球和国内做大的搜索引擎不约而同的在分页条中删除了“跳页”功能，其目的就是为了避免用户使用深度分页检索。

在百度中搜索“Elasticsearch”​，在搜索结果中翻到第20页，就无法再往下翻页了，提示信息如下图：

虽然没有删除“跳页”功能，但不管我们搜索什么内容，只要商品结果足够多，返回的商品列表都是仅展示前100页的数据，其本质和ES中的max_result_window作用是一样的，都是限制你去搜索更深页数的数据。

手机端APP就更不用说了，直接是下拉加载更多，连分页条都没有，相当于你只能点击“下一页”。

scroll API可从单个搜索请求中检索大量结果（甚至所有结果）​，这种方式与传统数据库中的游标(cursor)类似。scroll滚动遍历查询是非实时的，数据量大的时候，响应时间可能会比较长。

搜索请求通常会跨多个分片，每个分片必须将其请求的命中内容以及先前页面的命中内容加载到内存中。

对于分页较多的页面或大量结果，这样操作会显著增加内存和CPU使用率，导致性能下降，甚至导致节点故障。

from+size查询的优缺点及适用场景from+size查询优点：支持随机翻页。

from+size查询缺点：

限于max_result_window设置，不能无限制翻页；

存在深度翻页问题，越往后翻页越慢。

非常适合小型数据集或者从大数据集中返回Top N(N≤10000)结果集的业务场景。

主流PC搜索引擎中支持随机跳转分页的业务场景，如下图所示：

3. 深度分页问题的常见解决方案尝试避免使用深度分页淘宝Scroll Search滚动查询

### 第 4 页

![Elasticsearch 教程配图（46-12 第4页 图1）](/中间件/elasticsearch/46-12/p04-page.png)

官方文档：

ES7之后，官方已经不再建议使用scroll API进行深度分页。如果要分页检索超过 Top 10,000+ 结果时，推荐使用：search_after。

适合场景单个滚动搜索请求中检索大量结果，即非“C端业务”场景scroll查询的核心执行步骤如下。

- 1) 第一次进行scroll查询，指定检索语句的同时设置scroll上下文保留时间。

scroll请求返回的结果反映了发出初始搜索请求时索引的状态，就像在那一个时刻做了快照，随后对文档的更改（写入、更新或删除）只会影响以后的搜索请求。

返回结果：

- 2) 向后翻页，继续获取数据，直到没有要返回的结果为止https://www.elastic.co/guide/en/elasticsearch/reference/8.14/paginate-search-results.

html#scroll-search-results实现步骤

```
# 使用kibana提供的航班测试数据集
#查询命令中新增scroll=5m,说明采用游标查询，保持游标查询窗口5分钟，也就是本次快照的结果缓存起来
```

的有效时间是5分钟。

2

```
GET /kibana_sample_data_flights/_search?scroll=5m
{
"query": {
"term": {
"OriginWeather": "Sunny"
}
},
"size":
}
```

### 第 5 页

![Elasticsearch 教程配图（46-12 第5页 图1）](/中间件/elasticsearch/46-12/p05-page.png)

多次根据scroll_id游标查询，直到没有数据返回则结束查询。采用游标查询索引全量数据，更安全高效，限制了单次对内存的消耗。

删除游标scrollscroll超过超时后，搜索上下文会自动删除。然而，保持scroll打开是有代价的，因此一旦不再使用，就应明确清除scroll上下文

scroll查询的优缺点如下：

scroll查询的适用场景如下：

注意：

```
# scroll_id 的值就是上一个请求中返回的 _scroll_id 的值
GET /_search/scroll
{
"scroll": "5m",
"scroll_id" :
"FGluY2x1ZGVfY29udGV4dF91dWlkDXF1ZXJ5QW5kRmV0Y2gBFnQ5MUF6M3dYUkhPQW81czY3RXBDckEAAAAAAB
```

kMUBZPOVotS1A1MlI1dU43QXFsdkRGUEhB"5

```
}
DELETE /_search/scroll
{
"scroll_id" :
"FGluY2x1ZGVfY29udGV4dF91dWlkDXF1ZXJ5QW5kRmV0Y2gBFmNwcVdjblRxUzVhZXlicG9HeU02bWcAAAAAAA
```

BmzRY2YlV3Z0o5VVNTdWJobkE5Z3MtXzJB"3

```
}
```

scroll查询的优缺点及适用场景scroll查询优点：支持全量遍历，是检索大量文档的重要方法，但单次遍历的size值不能超过max_result_window的大小。

scroll查询缺点：

响应是非实时的；

保留上下文需要具有足够的堆内存空间；

需要通过更多的网络请求才能获取所有结果。

大量文档检索：当要检索的文档数量很大，甚至需要全量召回数据时，scroll查询是一个很好的选择。

大量文档的数据处理：滚动API适合对大量文档进行数据处理，例如索引迁移或将数据导入其他技术栈。

### 第 6 页

![Elasticsearch 教程配图（46-12 第6页 图1）](/中间件/elasticsearch/46-12/p06-page.png)

- 1) ES7.x之后不建议使用scroll API进行深度分页。

- 2) 如果要分页检索并获得超过10000条结果时，则推荐使用search_after。

search_after查询的基本工作原理是以前一页结果的排序值作为参照点，进而检索与这个参照点相邻的下一页的匹配数据。

这种方法在处理大规模数据分页时更为高效且实用。使用该查询的前置条件是要求后续的多个请求返回与第一次查询相同的排序结果序列。也就是说，在后续翻页的过程中，即便有新数据写入等操作，

也不会对原有结果集构成影响。

scroll API适用于高效的深度滚动，但滚动上下文成本高昂，不建议将其用于实时用户请求。而search_after参数通过提供一个活动光标来规避这个问题。这样可以使用上一页的结果来帮助检索下一页。

官方文档：

那么，如何实现呢？

可以创建一个时间点PIT(Point In Time)来保障在搜索过程中能保留特定事件点的索引状态。

search_after的后续查询都是基于PIT视图进行的，能有效保障数据的一致性。

PIT是Elasticsearch 7.10版本之后才有的新特性，实际上是存储索引数据状态的轻量级视图。

search_after 分页查询可以简单概括为如下几个步骤：

- 1）获取索引的pit使用 search_after 需要具有相同查询和排序值的多个搜索请求。 如果在这些请求之间发生刷新，结果的顺序可能会发生变化，从而导致跨页面的结果不一致。 为防止出现这种情况，可以创建一个时间点(PIT) 以保留搜索中的当前索引状态。Point In Time（PIT）是 Elasticsearch 7.10 版本之后才有的新特性。

search_after查询https://www.elastic.co/guide/en/elasticsearch/reference/8.14/paginate-search-results.

html#search-after实现步骤

### 第 7 页

![Elasticsearch 教程配图（46-12 第7页 图1）](/中间件/elasticsearch/46-12/p07-page.png)

keep_alive=5m是一个类似于scroll的参数，表示滚动视图的保留时间是5min，超过5min Elasticsearch会清除这个滚动视图并报错，如下图所示2） 根据pit首次查询创建基础查询语句，主要是设置分页的条件

```
# 使用kibana提供的航班测试数据集
# 创建一个时间点(PIT)来保存搜索期间的当前索引状态
POST /kibana_sample_data_flights/_pit?keep_alive=5m
#返回结果如下，会返回一个PID的值
{
"id":
"4YyPBAEaa2liYW5hX3NhbXBsZV9kYXRhX2ZsaWdodHMWZENSdWh0NWNSai1EdUhpcnBCZXgyZwAWTzlaLUtQNT
```

JSNXVON0FxbHZERlBIQQAAAAAAABkI4hZ0OTFBejN3WFJIT0FvNXM2N0VwQ3JBAAEWZENSdWh0NWNSai1EdUhpcnBCZXgyZwAA"6

```
}
```

8

### 第 8 页

![Elasticsearch 教程配图（46-12 第8页 图1）](/中间件/elasticsearch/46-12/p08-page.png)

代码中设置了PIT，因此检索时候就不需要再指定索引。id是基于第一步返回的id值。排序sort指的是按照哪个关键字排序。

在每个返回文档的最后会有两个结果值，如下所示:在每个返回文档的最后会有两个结果值，如下所示。

其中，1723434063000就是我们指定的排序方式，所以上述示例是基于{"timestamp": "asc"}升序排列的。130代表隐含的排序值，官方文档把这种隐含的字段叫作tiebreaker（决胜字段）​，tiebreaker代表了每个文档的唯一值，确保分页不会丢失或者分页结果数据出现重复（包括相同页重复和跨页重复）​。

- 3）根据search_after和pit实现后续翻页。

要获得下一页结果，请使用最后一次命中的排序值（包括 tiebreaker）作为 search_after 参数重新运行先前的搜索。 如果使用 PIT，请在 pit.id 参数中使用最新的 PIT ID。 搜索的查询和排序参数必须保持不变。

```
GET /_search
{
"query": {
"term": {
"OriginWeather": "Sunny"
}
},
"pit": {
"id":
"4YyPBAEaa2liYW5hX3NhbXBsZV9kYXRhX2ZsaWdodHMWZENSdWh0NWNSai1EdUhpcnBCZXgyZwAWTzlaLUtQNT
```

JSNXVON0FxbHZERlBIQQAAAAAAABkI4hZ0OTFBejN3WFJIT0FvNXM2N0VwQ3JBAAEWZENSdWh0NWNSai1EdUhpcnBCZXgyZwAA",

9"keep_alive": "1m"10

```
},
"size": 10,
"sort": [
{
"timestamp": "asc"
}
]
}
```

19

### 第 9 页

![Elasticsearch 教程配图（46-12 第9页 图1）](/中间件/elasticsearch/46-12/p09-page.png)

显然，search_after查询仅支持向后翻页。

search_after优点：

search_after缺点：

```
#后续翻页都需要借助search_after来指定前一页中最后一个文档的sort字段值
GET /_search
{
"query": {
"term": {
"OriginWeather": "Sunny"
}
},
"pit": {
"id":
"4YyPBAEaa2liYW5hX3NhbXBsZV9kYXRhX2ZsaWdodHMWZENSdWh0NWNSai1EdUhpcnBCZXgyZwAWTzlaLUtQNT
```

JSNXVON0FxbHZERlBIQQAAAAAAABkI4hZ0OTFBejN3WFJIT0FvNXM2N0VwQ3JBAAEWZENSdWh0NWNSai1EdUhpcnBCZXgyZwAA",

10"keep_alive": "5m"11

```
},
"size": 10,
"sort": [
{
"timestamp": "asc"
}
],
"search_after": [
1723434063000,
]
}
```

优缺点不严格受制于max_result_window，可以无限地往后翻页。此处的“不严格”是指单次请求值不能超过max_result_window，但总翻页结果集可以超过。

只支持向后翻页，不支持随机翻页。search_after不支持随机翻页，更适合在手机端应用的场景中使用，类似今日头条等产品的分页搜索。

### 第 10 页

![Elasticsearch 教程配图（46-12 第10页 图1）](/中间件/elasticsearch/46-12/p10-page.png)

4. ES三种分页方式总结分页方式性能优点缺点适用场景from + size低支持随机翻页受制于max_result_window设置，不能无限制翻页；

存在深度翻译问题，越往后翻译越慢。

需要随机跳转不同页（PC端主流搜索引擎）； 在10000条数据之内分页显示scroll中支持全量遍历，但单次遍历的size值不能超过max_result_window的大小响应是非实时的；

保留上下文需要具有足够的堆内存空间；需要通过更多的网络请求才能获取所有结果。

需要遍历全量数据search_after高不严格受制于max_result_window，可以无限地往后翻页。

只支持向后翻页，

不支持随机翻页。

仅需要向后翻页;超过10000条数据，

需要分页

---

## 第二部分：分词器与自定义 Analyzer


### 第 1 页

分词是构建倒排索引的重要一环。分词根据语言环境的不同可以分为英文分词、中文分词等；根据分词实现的不同又分为标准分词器、空格分词器、停用词分词器等。在传统的分词器不能解决特定业务场景的问题时，往往需要自定义分词器。

对于分词操作来说，英语单词相对而言是比较容易辨认和区分的，因为单词之间都会以空格或者标点隔开，举例如下:而中文在单词、句子甚至段落之间没有空格。有些词可以用几个字来表达，但是同样的字在另外的句子中可以拆解成不同的组合。例如

中文分词是自然语言处理的基础。搜索引擎之所以需要进行中文分词，主要有如下3个维度的原因：

1. 分词器概述1.1 认识分词you cannot use from and size to page through more than 10,000 hits1you / cannot / use / from / and / size / to / page / through / more / than / 10,000 /hits2

1杭州市长春药店2杭州 / 市长 / 春药 / 店 (错误)3杭州市 / 长春 / 药店 (正确)41.2 为什么需要分词语义维度：单字很多时候表达不了语义，而词往往能表达。分词相当于预处理，能使后面和语义有关的分析更准确：

存储维度：如果所有文章按照单字来索引，那么所需要的存储空间和搜索计算时间就要多得多：

时间维度：通过倒排索引，我们能以O(1)的时间复杂度，通过词组找到对应的文章。

1.

2.

3.

### 第 2 页

以“深入浅出Elasticsearch”这一字符串的检索为例。​“深”​“入”​“浅”​“出”这些字在全体内容中可能会无数次出现，如果以这些单独的字为索引，那么就需要添加无数条记录。而以“深入”为索引，所需记录就少了一些；以“深入浅出”为索引，则少得更多；最后以“深入浅出Elasticsearch”为索引，可能就剩余寥寥几条数据。但只有剩余的这些全字符匹配的文档才是我们期望召回的结果。

注意：设计索引的Mapping阶段，要根据业务用途确定是否需要分词。如果不需要分词，则建议设置keyword类型；如果需要分词，则建议设置为text类型并指定分词器。

分词发生在数据写入阶段，也就是数据索引化阶段，其分词逻辑取决于映射参数analyzer。例如，当使用ik_smart分词器对“昨天，小明和他的朋友们去了市中心的图书馆”进行分词后，会将这句话分成不同的词汇或词组。

### 1.3 分词发生的阶段写入数据阶段

### 第 3 页

![Elasticsearch 教程配图（46-13 第3页 图1）](/中间件/elasticsearch/46-13/p03-page.png)

```
POST _analyze
{
"analyzer":"ik_max_word",
"text":"昨天，小明和他的朋友们去了市中心的图书馆"
}
```

6返回结果：

7

```
{
"tokens": [
{
"token": "昨天",
"start_offset": 0,
"end_offset": 2,
"type": "CN_WORD",
"position":
},
{
"token": "小明",
"start_offset": 3,
"end_offset": 5,
"type": "CN_WORD",
"position":
},
{
"token": "和他",
"start_offset": 5,
"end_offset": 7,
"type": "CN_WORD",
"position":
},
{
"token": "的",
"start_offset": 7,
"end_offset": 8,
"type": "CN_CHAR",
"position":
},
{
"token": "朋友们",
```

### 第 4 页

![Elasticsearch 教程配图（46-13 第4页 图1）](/中间件/elasticsearch/46-13/p04-page.png)

"start_offset": 8,

40"end_offset": 11,

41"type": "CN_WORD",

42"position": 443

```
},
{
"token": "去了",
"start_offset": 11,
"end_offset": 13,
"type": "CN_WORD",
"position":
},
{
"token": "市中心",
"start_offset": 13,
"end_offset": 16,
"type": "CN_WORD",
"position":
},
{
"token": "的",
"start_offset": 16,
"end_offset": 17,
"type": "CN_CHAR",
"position":
},
{
"token": "图书馆",
"start_offset": 17,
"end_offset": 20,
"type": "CN_WORD",
"position":
}
]
}
```

75执行检索阶段

### 第 5 页

![Elasticsearch 教程配图（46-13 第5页 图1）](/中间件/elasticsearch/46-13/p05-page.png)

搜索发生时期，其分词仅对搜索词产生作用。在执行“图书馆”检索时，Elasticsearch会根据倒排索引查找所有包含“图书馆”的文档。

文档被写入并转换为倒排索引之前，Elasticsearch对文档的操作称为分析。而分析是基于Elasticsearch内置分词器(analyzer)或者自定义分词器实现的。分词器由如下三部分组成，如下图所示：

字符过滤器(character filter)将原始文本作为字符流接收，并通过添加、删除或更改字符来转换字符流。

作用：分词之前的预处理，过滤无用字符。

字符过滤器分类如下：

- 1) HTML Strip Character Filter：用于删除HTML元素，如删除＜b＞标签；解码HTML实体，如将&amp转义为&。

2. 分词器的组成字符过滤器Character Filter

### 第 6 页

![Elasticsearch 教程配图（46-13 第6页 图1）](/中间件/elasticsearch/46-13/p06-page.png)

- 2) Mapping Character Filter：用于替换指定的字符。

```
PUT test_html_strip_filter
{
"settings": {
"analysis": {
"char_filter": {
"my_char_filter": {
"type": "html_strip",  // html_strip 代表使用 HTML 标签过滤器
"escaped_tags": [     // 当前仅保留 a 标签, escaped_tags：需要保留的 html 标签
```

8"a"9

```
]
}
}
}
}
}
GET test_html_strip_filter/_analyze
{
"tokenizer": "standard",
"char_filter": ["my_char_filter"],
"text": ["<p>I&apos;m so <a>happy</a>!</p>"]
}
```

### 第 7 页

![Elasticsearch 教程配图（46-13 第7页 图1）](/中间件/elasticsearch/46-13/p07-page.png)

- 3) Pattern Replace Character Filter：可以基于正则表达式替换指定的字符。

```
PUT test_html_strip_filter
{
"settings": {
"analysis": {
"char_filter": {
"my_char_filter": {
"type": "mapping", // mapping 代表使用字符映射过滤器
"mappings": [ // 数组中规定的字符会被等价替换为 => 指定的字符
"滚 => *",
"垃 => *",
"圾 => *"
]
}
}
}
}
}
GET test_html_strip_filter/_analyze
{
//"tokenizer": "standard",
"char_filter": ["my_char_filter"],
"text": "你就是个垃圾！滚"
}
```

### 第 8 页

![Elasticsearch 教程配图（46-13 第8页 图1）](/中间件/elasticsearch/46-13/p08-page.png)

若进行了字符过滤，则系统将接收过滤后的字符流；若未进行过滤，则系统接收原始字符流。在接收字符流后，系统将对其进行分词，并记录分词后的顺序或位置(position)、起始值(start_offset)以及偏移量(end_offset-start_offset)。而tokenizer负责初步进行文本分词。官方内置了很多种切词器，默认的切词器为 standard。

词项过滤器用来处理切词完成之后的词项，例如把大小写转换，删除停用词或同义词处理等。官方同样预置了很多词项过滤器，基本可以满足日常开发的需要。当然也是支持第三方也自行开发的。

```
PUT text_pattern_replace_filter
{
"settings": {
"analysis": {
"char_filter": {
"my_char_filter": {
"type": "pattern_replace", // pattern_replace 代表使用正则替换过滤器
```

7"pattern": """(\d{3})\d{4}(\d{4})""", // 正则表达式8"replacement": "$1****$2"9

```
}
}
}
}
}
GET text_pattern_replace_filter/_analyze
{
"char_filter": ["my_char_filter"],
"text": "您的手机号是18868686688"
}
```

切词器Tokenizer词项过滤器Token Filter

### 第 9 页

![Elasticsearch 教程配图（46-13 第9页 图1）](/中间件/elasticsearch/46-13/p09-page.png)

停用词在切词完成之后，会被干掉词项，即停用词。停用词可以自定义英文停用词（english）：a, an, and, are, as, at, be, but, by, for, if, in, into, is, it, no, not, of, on, or,

such, that, the, their, then, there, these, they, this, to, was, will, with。

中日韩停用词（cjk）：a, and, are, as, at, be, but, by, for, if, in, into, is, it, no, not, of, on, or, s, such, t,

that, the, their, then, there, these, they, this, to, was, will, with, www。

```
GET _analyze
{
"tokenizer" : "standard",
"filter" : ["uppercase"],
"text" : ["www.elastic.org.cn","www elastic org cn"]
}
```

### 第 10 页

![Elasticsearch 教程配图（46-13 第10页 图1）](/中间件/elasticsearch/46-13/p10-page.png)

同义词同义词定义规则

```
GET _analyze
{
"tokenizer": "standard",
"filter": ["stop"],
"text": ["What are you doing"]
}
```

7

```
### 自定义 filter
DELETE test_token_filter_stop
PUT test_token_filter_stop
{
"settings": {
"analysis": {
"filter": {
"my_filter": {
"type": "stop",
"stopwords": [
"www"
],
"ignore_case": true
}
}
}
}
}
GET test_token_filter_stop/_analyze
{
"tokenizer": "standard",
"filter": ["my_filter"],
"text": ["What www WWW are you doing"]
}
```

a, b, c => d：这种方式，a、b、c 会被 d 代替。

a, b, c, d：这种方式下，a、b、c、d 是等价的。

### 第 11 页

![Elasticsearch 教程配图（46-13 第11页 图1）](/中间件/elasticsearch/46-13/p11-page.png)

业务需求是这样的：有一个作者字段，比如Li，LeiLei；Han，MeiMei以及LeiLei Li；……现在要对其进行精确匹配。

```
PUT test_token_filter_synonym
{
"settings": {
"analysis": {
"filter": {
"my_synonym": {
"type": "synonym",
"synonyms": [ "good, nice => excellent" ] //good, nice, excellent
}
}
}
}
}
GET test_token_filter_synonym/_analyze
{
"tokenizer": "standard",
"filter": ["my_synonym"],
"text": ["good"]
}
```

实践练习：自定义分词器实现对书籍作者的精确匹配

### 第 12 页

![Elasticsearch 教程配图（46-13 第12页 图1）](/中间件/elasticsearch/46-13/p12-page.png)

自定义分词器

```
POST /booksdemo/_bulk
{"index":{"_id":1}}
{"name":"Li,LeiLei;Han,MeiMei"}
{"index":{"_id":2}}
{"name": "LeiLei,Li;MeiMei,Han"}
```

6

```
# 查不出数据
POST /booksdemo/_search
{
"query": {
"match": {
"name": "lileilei"
}
}
}
```

16

### 第 13 页

![Elasticsearch 教程配图（46-13 第13页 图1）](/中间件/elasticsearch/46-13/p13-page.png)

```
DELETE /booksdemo
PUT /booksdemo
{
"settings": {
"analysis": {
"char_filter": {
"my_char_filter": {
"type": "mapping",
"mappings": [        //将“,”过滤掉
", => "
]
}
},
"tokenizer": {
"my_tokenizer": {
"type": "pattern",
"pattern": """\;"""     //将“;”作为自定义分词分隔符
}
},
"filter": {
"my_synonym_filter": {
"type": "synonym",
"expand": true,
"synonyms": [               //添加同义词词组
"leileili  => lileilei",
"meimeihan => hanmeimei"
]
}
},
"analyzer": {
"my_analyzer": {
"tokenizer": "my_tokenizer",
"char_filter": [
"my_char_filter"
],
"filter": [
"lowercase",
"my_synonym_filter"
]
```

### 第 14 页

![Elasticsearch 教程配图（46-13 第14页 图1）](/中间件/elasticsearch/46-13/p14-page.png)

测试自定义分词器效果

```
}
}
}
},
"mappings": {
"properties": {
"name": {
"type": "text",
"analyzer": "my_analyzer"
}
}
}
}
```

53

54

### 第 15 页

![Elasticsearch 教程配图（46-13 第15页 图1）](/中间件/elasticsearch/46-13/p15-page.png)

当对keyword类型的字段进行高亮查询时，若值为123asd456，查询sd4，则高亮结果是＜em＞123asd456＜em＞。那么，有没有办法只对sd4高亮呢？

用一句话来概括问题：明明只想查询ID的一部分，但高亮结果是整个ID串，此时应该怎么办？

```
#借助analyzer API验证分词结果是否正确
POST booksdemo/_analyze
{
"analyzer": "my_analyzer",
"text": "Li,LeiLei;Han,MeiMei"
}
```

7

```
POST booksdemo/_analyze
{
"analyzer": "my_analyzer",
"text": "LeiLei,Li;MeiMei,Han"
}
```

13

```
POST /booksdemo/_bulk
{"index":{"_id":1}}
{"name":"Li,LeiLei;Han,MeiMei"}
{"index":{"_id":2}}
{"name": "LeiLei,Li;MeiMei,Han"}
```

19

```
POST /booksdemo/_search
{
"query": {
"match": {
"name": "lileilei"
}
}
}
```

3. Ngram自定义分词实战需求背景解决方案分析

### 第 16 页

![Elasticsearch 教程配图（46-13 第16页 图1）](/中间件/elasticsearch/46-13/p16-page.png)

实战问题拆解

### 第 17 页

![Elasticsearch 教程配图（46-13 第17页 图1）](/中间件/elasticsearch/46-13/p17-page.png)

```
###定义索引
PUT my_index_phone
{
"mappings": {
"properties": {
"phoneNum": {
"type": "keyword"
}
}
}
}
```

12

```
####批量写入数据
POST my_index_phone/_bulk
{"index":{"_id":1}}
{"phoneNum":"13611112222"}
{"index":{"_id":2}}
{"phoneNum":"13944248474"}
```

19

20

21

22

```
###执行模糊检索和高亮显示
POST my_index_phone/_search
{
"highlight": {
"fields": {
"phoneNum": {}
}
},
"query": {
"bool": {
"should": [
{
"wildcard": {
"phoneNum": "*1111*"
}
}
]
```

### 第 18 页

![Elasticsearch 教程配图（46-13 第18页 图1）](/中间件/elasticsearch/46-13/p18-page.png)

高亮检索结果如下：

也就是说，整个字符串都呈现为高亮状态了，没有达到预期。检索过程中选择使用wildcard是为了解决子串匹配的问题，wildcard的实现逻辑类似于MySQL的like模糊匹配。传统的text标准分词器，包括中文分词器ik、英文分词器english、standard等都不能解决上述子串匹配问题。

而实际业务需求是这样的：一方面要求输入子串能召回全串；另一方面要求检索的子串实现高亮。对此，只能更换一种分词来实现，即Ngram。

Ngram分词定义Ngram是一种基于统计语言模型的算法。Ngram基本思想是将文本里面的内容按照字节大小进行滑动窗口操作，形成长度是N的字节片段序列。此时每一个字节片段称为gram。对所有gram的出现频度进行统计，并且按照事先设定好的阈值进行过滤，形成关键gram列表，也就是这个文本的向量特征空间。列表中的每一种gram就是一个特征向量维度。该模型基于这样一种假设，第N个词的出现只与前面N-1个词相关，而与其他任何词都不相关，整句的概率就是各个词出现概率的乘积。这些概率可以通过直接从语料中统计N个词同时出现的次数得到。常用的是二元的Bi-Gram（二元语法）和三元的Tri-Gram（三元语法）​。

Ngram分词示例以“你今天吃饭了吗“这一中文句子为例，它的Bi-Gram分词结果如下：

Ngram分词应用场景

Ngram分词实战

```
}
}
}
```

Ngram分词实战场景1：文本压缩、检查拼写错误、加速字符串查找、文献语种识别。

场景2：自然语言处理自动化领域得到新的应用。如自动分类、自动索引、超链的自动生成、文献检索、无分隔符语言文本的切分等。

场景3：自然语言的自动分类功能。针对Elasticsearch检索，Ngram针对无分隔符语言文本的分词（比如手机号检索）​，可提高检索效率（相较于wildcard检索和正则匹配检索来说）​。

### 第 19 页

![Elasticsearch 教程配图（46-13 第19页 图1）](/中间件/elasticsearch/46-13/p19-page.png)

```
DELETE my_index_phone
###定义索引
PUT my_index_phone
{
"settings":{
"number_of_shards":1,
"number_of_replicas":0,
"index.max_ngram_diff" : 10,
"analysis":{
"analyzer":{
"phoneNo_analyzer":{
"tokenizer": "phoneNo_analyzer"
}
},
"tokenizer":{
"phoneNo_analyzer":{
"type": "ngram",
"min_gram": 4,
"max_gram": 11,
"token_chars": [
"letter","digit"
]
}
}
}
},
"mappings":{
"dynamic":"strict",
"properties":{
"phoneNo":{
"type":"text",
"analyzer": "phoneNo_analyzer"
}
}
}
}
```

37

38

```
####批量写入数据
```

### 第 20 页

![Elasticsearch 教程配图（46-13 第20页 图1）](/中间件/elasticsearch/46-13/p20-page.png)

如上示例共有3个核心参数。

min_gram：最小字符长度（切分）​，默认为1。

max_gram：最大字符长度（切分）​，默认为2。

token_chars：表示生成的分词结果中包含的字符类型，默认是全部类型，而在如上的示例中代表保留数字、字母。若只指定letter分词器，则数字就会被过滤掉，分词结果只剩下串中的字符。

借助analyzer API查看分词结果:检索及高亮的执行语句如下:

```
POST my_index_phone/_bulk
{"index":{"_id":1}}
{"phoneNo":"13611112222"}
{"index":{"_id":2}}
{"phoneNo":"13944248474"}
```

45

1

```
POST my_index_phone/_analyze
{
"analyzer": "phoneNo_analyzer",
"text": "13611112222"
}
```

### 第 21 页

![Elasticsearch 教程配图（46-13 第21页 图1）](/中间件/elasticsearch/46-13/p21-page.png)

返回结果的片段如下:可以看出，此时代码已经能满足检索和高亮的双重需求，也就是说自定义分词完美地解决了提出的问题。

```
POST my_index_phone/_search
{
"highlight": {
"fields": {
"phoneNo": {}
}
},
"query": {
"bool": {
"should": [
{
"match_phrase": {
"phoneNo": "1111"
}
}
]
}
}
}
```

---

## 小结

- 本篇为 Elasticsearch 系列第 7/10 篇，主题：**深度分页问题与自定义分词**。
- 建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。
- 系列文章路径前缀：`/中间件/elasticsearch/`。

下一篇：[《Elasticsearch 高可用集群架构》](/中间件/elasticsearch/es-08-cluster)
