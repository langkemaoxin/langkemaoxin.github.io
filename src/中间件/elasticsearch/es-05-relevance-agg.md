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
> 下一篇预告：[《Spring Boot 整合 ES 与商品搜索实战》](/中间件/elasticsearch/es-06-springboot-search)

---

## 开头：场景与目标

搜到了还要排对——相关性打分决定用户第一眼看到什么。BM25、自定义评分、Function Score 与聚合分析（Metric/Bucket/Pipeline）是搜索体验与数据分析的双引擎。


### 第 1 页

搜索是用户和搜索引擎的对话，用户关心的是搜索结果的相关性相关性是指在搜索引擎中，描述一个文档与查询语句匹配程度的度量标准。这种相关性通过为每个匹配查询条件的文档计算一个相关性评分（_score）来实现，评分越高表示文档与查询语句的匹配程度越高如下例子：显而易见，查询JAVA多线程设计模式，文档id为2,3的文档的算分更高

Elasticsearch使用评分算法，根据查询条件与索引文档的匹配程度来确定每个文档的相关性。同时，

为了满足各种特定的业务需求，Elasticsearch也充分允许用户自定义评分。

在下面示例中，_score就是Elasticsearch检索返回的评分，其值可以衡量每个文档与查询的匹配程度，即相关性。每个文档都有对应的评分，该得分由正浮点数表示。文档评分越高，则该文档的相关性越高。

Elasticsearch使用布尔模型查找匹配文档，并用一个名为“实用评分函数”的公式来计算相关性。这个公式借鉴了TF-IDF（词频-逆向文档频率）和向量空间模型，同时加入了一些现代的新特性，如协调因子、字段长度归一化以及词/查询语句权重提升。

1. 相关性的概述什么是相关性（Relevance）是否可以找到所有相关的内容有多少不相关的内容被返回了文档的打分是否合理结合业务需求，平衡结果排名关键词文档IDJAVA1,2,3设计模式1,2,3,4,5,6多线程2,3,7,9计算相关性评分

### 第 2 页

![Elasticsearch 教程配图（46-7 第2页 图1）](/中间件/elasticsearch/46-7/p02-page.png)

Elasticsearch 5之前的版本，评分机制或者打分模型是基于TF-IDF实现的。从Elasticsearch 5之后，默认的打分机制改成了Okapi BM25。其中BM是Best Match的缩写，25是指经过25次迭代调整之后得出的算法，它是由TF-IDF机制进化来的。

传统TF-IDF和BM25都使用逆向文档频率来区分普通词（不重要）和非普通词（重要）​，使用词频来衡量某个词在文档中出现的频率。两种机制的逻辑相似：首先，文档里的某个词出现得越频繁，文档与这个词就越相关，得分越高；其次，某个词在集合中所有文档里出现的频次越高，则它的权重越低、得分越低。也就是说，某个词在集合中所有文档里越罕见，其得分越高。BM25在传统TF-IDF的基础上增加了几个可调节的参数，使得它在应用上更佳灵活和强大，具有较高的实用性。

TF-IDF评分公式：

检索词在文档中出现的频率越高，相关性也越高。

每个检索词在索引中出现的频率，频率越高，相关性越低。总文档中有些词比如“是”、“的” 、“在” 在所有文档中出现频率都很高，并不重要，可以减少多个文档中都频繁出现的词的权重。

检索词出现在一个内容短的 title 要比同样的词出现在一个内容长的 content 字段权重更大。

以上三个因素——词频（term frequency）、逆向文本频率（inverse document frequency）和字段长度归一值（field-length norm）——是在索引时计算并存储的，最后将它们结合在一起计算单个词在特定文档中的权重。

BM25 就是对 TF-IDF 算法的改进，对于 TF-IDF 算法，TF(t) 部分的值越大，整个公式返回的值就会越大。BM25 就针对这点进行来优化，随着TF(t) 的逐步加大，该算法的返回值会趋于一个数值。

示例：通过Explain API查看TF-IDFTF是词频(Term Frequency)词频（TF） =  某个词在文档中出现的次数 /  文档的总词数1IDF是逆向文本频率(Inverse Document Frequency)逆向文本频率（IDF）= log (语料库的文档总数 / (包含该词的文档数+1))1字段长度归一值（ field-length norm）BM 25的公式

### 第 3 页

![Elasticsearch 教程配图（46-7 第3页 图1）](/中间件/elasticsearch/46-7/p03-page.png)

自定义评分是用来优化Elasticsearch默认评分算法的一种有效方法，可以更好地满足特定应用场景的需求。

自定义评分的核心是通过修改评分来修改文档相关性，在最前面的位置返回用户最期望的结果。

Elasticsearch自定义评分的主要作用如下：

- 1) 排序偏好：通过在搜索结果中给每个文档自定义评分，可以更好地满足搜索用户的排序偏好。

- 2) 特殊字段权重：通过给特定字段赋予更高的权重，可以让这些字段对搜索结果的影响更大。

- 3) 业务逻辑需求：根据业务需求，可以定义复杂的评分逻辑，使搜索结果更符合业务需求。

```
PUT /test_score/_bulk
{"index":{"_id":1}}
{"content":"we use Elasticsearch to power the search"}
{"index":{"_id":2}}
{"content":"we like elasticsearch"}
{"index":{"_id":3}}
{"content":"Thre scoring of documents is caculated by the scoring formula"}
{"index":{"_id":4}}
{"content":"you know,for search"}
```

10

```
GET /test_score/_search
{
"explain": true,
"query": {
"match": {
"content": "elasticsearch"
}
}
}
```

20

```
GET /test_score/_explain/2
{
"query": {
"match": {
"content": "elasticsearch"
}
}
}
```

Elasticsearch自定义评分

### 第 4 页

![Elasticsearch 教程配图（46-7 第4页 图1）](/中间件/elasticsearch/46-7/p04-page.png)

- 4) 自定义用户行为：可以使用用户行为数据（如点击率）作为评分因素，提高用户搜索体验。

搜索结果相关性与自定义评分的关系搜索引擎本质是一个匹配过程，即从海量的数据中找到匹配用户需求的内容。判定内容与用户查询的相关性一直是搜索引擎领域的核心研究课题之一。如果搜索引擎不能准确地识别用户查询的意图并将相关结果排在前面的位置，那么搜索结果就不能满足用户的需求，从而影响用户对搜索引擎的满意度。

如上图所示，左侧圆圈代表用户期望通过搜索引擎获取的结果，右侧圆圈代表用户最终得到的结果。

左右两个圆的交集部分即为预期结果与实际结果的相关性。

然而，如何实现这样的自定义评分策略，以确保搜索结果能够最大限度地满足用户需求呢？我们可以从多个层面，包括索引层面、查询层面以及后处理阶段着手。

以下是几种主要的自定义评分策略：

Index Boost这种方式能在跨多个索引搜索时为每个索引配置不同的级别。所以它适用于索引级别调整评分。

实战举例：一批数据里有不同的标签，数据结构一致，要将不同的标签存储到不同的索引(A、B、C)，

并严格按照标签来分类展示（先展示A类，然后展示B类，最后展示C类）​，应该用什么方式查询呢？

具体实现如下。借助indices_boost提升索引的权重，让A排在最前，其次是B，最后是C。

2. 自定义评分的策略Index Boost: 在索引层面修改相关性boosting: 修改文档相关性negative_boost: 降低相关性function_score: 自定义评分rescore_query：查询后二次打分Index Boost: 在索引层面修改相关性

### 第 5 页

![Elasticsearch 教程配图（46-7 第5页 图1）](/中间件/elasticsearch/46-7/p05-page.png)

```
PUT my_index_100a/_doc/1
{
"subject":"subject 1"
}
PUT my_index_100b/_doc/1
{
"subject":"subject 1"
}
PUT my_index_100c/_doc/1
{
"subject":"subject 1"
}
```

13

```
POST my_index_100*/_search
{
"query": {
"term": {
"subject.keyword": {
"value": "subject 1"
}
}
}
}
```

24

```
POST my_index_100*/_search
{
"query": {
"term": {
"subject.keyword": {
"value": "subject 1"
}
}
},
"indices_boost": [
{
"my_index_100a": 1.5
},
{
"my_index_100b": 1.2
```

### 第 6 页

![Elasticsearch 教程配图（46-7 第6页 图1）](/中间件/elasticsearch/46-7/p06-page.png)

boosting可在查询时修改文档的相关度。boosting值所在范围不同，含义也不同。

若boosting值为0～1，如0.2，代表降低评分；

若boosting值＞1，如1.5，则代表提升评分。

适用于某些特定的查询场景，用户可以自定义修改满足某个查询条件的结果评分。

```
},
{
"my_index_100c":
}
]
}
boosting: 修改文档相关性
```

### 第 7 页

![Elasticsearch 教程配图（46-7 第7页 图1）](/中间件/elasticsearch/46-7/p07-page.png)

若对某些返回结果不满意，但又不想将其排除(must_not)，则可以考虑采用negative_boost的方式。

原理说明如下：

```
POST /blogs/_bulk
{"index":{"_id":1}}
{"title":"Apple iPad","content":"Apple iPad,Apple iPad"}
{"index":{"_id":2}}
{"title":"Apple iPad,Apple iPad","content":"Apple iPad"}
```

6

```
GET /blogs/_search
{
"query": {
"bool": {
"should": [
{
"match": {
"title": {
"query": "apple,ipad",
"boost":
}
}
},
{
"match": {
"content": {
"query": "apple,ipad",
"boost":
}
}
}
]
}
}
}
negative_boost: 降低相关性
```

negative_boost仅对查询中定义为negative的部分生效。

计算评分时，不修改boosting部分评分，而negative部分的评分则乘以negative_boost的值。

negative_boost取值为0～1.0，如0.3。

### 第 8 页

![Elasticsearch 教程配图（46-7 第8页 图1）](/中间件/elasticsearch/46-7/p08-page.png)

案例：要求苹果公司的产品信息优先展示

### 第 9 页

![Elasticsearch 教程配图（46-7 第9页 图1）](/中间件/elasticsearch/46-7/p09-page.png)

```
POST /news/_bulk
{"index":{"_id":1}}
{"content":"Apple Mac"}
{"index":{"_id":2}}
{"content":"Apple iPad"}
{"index":{"_id":3}}
{"content":"Apple employee like Apple Pie and Apple Juice"}
```

8

9

```
GET /news/_search
{
"query": {
"bool": {
"must": {
"match": {
"content": "apple"
}
}
}
}
}
```

22

```
# 利用must not排除不是苹果公司产品的文档
GET /news/_search
{
"query": {
"bool": {
"must": {
"match": {
"content": "apple"
}
},
"must_not": {
"match":{
"content": "pie"
}
}
}
}
```

### 第 10 页

![Elasticsearch 教程配图（46-7 第10页 图1）](/中间件/elasticsearch/46-7/p10-page.png)

该方式支持用户自定义一个或多个查询语句及脚本，达到精细化控制评分的目的，以对搜索结果进行高度个性化的排序设置。适用于需进行复杂查询的自定义评分业务场景。

案例1：商品信息如下，如何同时根据销量和浏览人数进行相关度提升？

想要提升相关度评分，则将每个文档的原始评分与其销量和浏览人数相结合，得到一个新的评分。例如，使用如下公式：

评分=原始评分×（销量+浏览人数）这样，销量和浏览人数较高的文档就会有更高的评分，从而在搜索结果中排名更靠前。这种评分方式不仅考虑了文档与查询的匹配度（由_score表示）​，还考虑了文档的销量和浏览人数，非常适用于电子商务等场景。

```
}
# 利用negative_boost降低相关性
GET /news/_search
{
"query": {
"boosting": {
"positive": {
"match": {
"content": "apple"
}
},
"negative": {
"match": {
"content": "pie"
}
},
"negative_boost": 0.2
}
}
}
function_score: 自定义评分
```

商品销量浏览人数A1010B2020

### 第 11 页

![Elasticsearch 教程配图（46-7 第11页 图1）](/中间件/elasticsearch/46-7/p11-page.png)

该需求可以借助script_score实现，代码如下，其评分是基于原始评分和销量与浏览人数之和的乘积计算的结果。

二次评分是指重新计算查询所返回的结果文档中指定文档的得分。

Elasticsearch会截取查询返回的前N条结果，并使用预定义的二次评分方法来重新计算其得分。但对全部有序的结果集进行重新排序的话，开销势必很大，使用rescore_query可以只对结果集的子集进行处理。该方式适用于对查询语句的结果不满意，需要重新打分的场景。

```
PUT my_index_products/_bulk
{"index":{"_id":1}}
{"name":"A","sales":10,"visitors":10}
{"index":{"_id":2}}
{"name":"B","sales":20,"visitors":20}
{"index":{"_id":3}}
{"name":"C","sales":30,"visitors":30}
```

8

```
#基于function_score实现自定义评分检索
POST my_index_products/_search
{
"query": {
"function_score": {
"query": {
"match_all": {}
},
"script_score": {
"script": {
"source": "_score*(doc['sales'].value+doc['visitors'].value)"
}
}
}
}
}
```

rescore_query：查询后二次打分

### 第 12 页

![Elasticsearch 教程配图（46-7 第12页 图1）](/中间件/elasticsearch/46-7/p12-page.png)

```
PUT my_index_books-demo/_bulk
{"index":{"_id":"1"}}
{"title":"ES实战","content":"ES的实战操作，实战要领，实战经验"}
{"index":{"_id":"2"}}
{"title":"MySQL实战","content":"MySQL的实战操作"}
{"index":{"_id":"3"}}
{"title":"MySQL","content":"MySQL一定要会"}
```

8

```
GET my_index_books-demo/_search
{
"query": {
"match": {
"content": "实战"
}
}
}
```

17

```
# 查询content字段中包含”实战“的文档，权重为0.7。
# 并对文档中title为MySQL的文档增加评分，权重为1.2，
# window_size为50，表示取分片结果的前50进行重新算分
GET my_index_books-demo/_search
{
"query": {
"match": {
"content": "实战"
}
},
"rescore": {
"query": {
"rescore_query": {
"match": {
"title": "MySQL"
}
},
"query_weight": 0.7,
"rescore_query_weight": 1.2
},
"window_size":
}
```

### 第 13 页

![Elasticsearch 教程配图（46-7 第13页 图1）](/中间件/elasticsearch/46-7/p13-page.png)

通过rescore_query我们可以对检索结果进行二次评分，增加自己更复杂的评分逻辑，提供更准确的结果排序，但是相应的也会增加查询的计算成本与响应时间。

多字段搜索的三种场景：

当字段之间相互竞争，又相互关联。例如，对于博客的 title和 body这样的字段，评分来自最匹配字段处理英文内容时的一种常见的手段是，在主字段( English Analyzer)，抽取词干，加入同义词，以匹配更多的文档。相同的文本，加入子字段（Standard Analyzer），以提供更加精确的匹配。其他字段作为匹配文档提高相关度的信号，匹配字段越多则越好。

对于某些实体，例如人名，地址，图书信息。需要在多个字段中确定信息，单个字段只能作为整体的一部分。希望在任何这些列出的字段中找到尽可能多的词。

将任何与任一查询匹配的文档作为结果返回，采用字段上最匹配的评分作为最终评分返回。

官方文档：

案例

```
}
```

多字段搜索场景优化最佳字段(Best Fields) ： 多个字段中返回评分最高的多数字段(Most Fields)：匹配多个字段，返回各个字段评分之和混合字段(Cross Fields)： 跨字段匹配，待查询内容在多个字段中都显示最佳字段搜索https://www.elastic.co/guide/en/elasticsearch/reference/8.14/query-dsl-dis-max-query.

html

### 第 14 页

![Elasticsearch 教程配图（46-7 第14页 图1）](/中间件/elasticsearch/46-7/p14-page.png)

思考：查询结果不符合预期，为什么？

bool should的算法过程：

上述例子中，title和body属于竞争关系，不应该将分数简单叠加，而是应该找到单个最佳匹配的字段的评分。

1

```
DELETE /blogs
PUT /blogs/_doc/1
{
"title": "Quick brown rabbits",
"body":  "Brown rabbits are commonly seen."
}
```

8

```
PUT /blogs/_doc/2
{
"title": "Keeping pets healthy",
"body":  "My quick brown fox eats rabbits on a regular basis."
}
# 搜索棕色的狐狸
POST /blogs/_search
{
"query": {
"bool": {
"should": [
{ "match": { "title": "Brown fox" }},
{ "match": { "body":  "Brown fox" }}
]
}
}
}
```

26查询should语句中的两个查询加和两个查询的评分乘以匹配语句的总数除以所有语句的总数使用dis max query查询

### 第 15 页

![Elasticsearch 教程配图（46-7 第15页 图1）](/中间件/elasticsearch/46-7/p15-page.png)

可以通过tie_breaker参数调整Tie Breaker是一个介于0-1之间的浮点数。0代表使用最佳匹配;1代表所有语句同等重要。

最终得分=最佳匹配字段+其他匹配字段*tie_breaker

```
POST /blogs/_search
{
"query": {
"dis_max": {
"queries": [
{ "match": { "title": "Brown fox" }},
{ "match": { "body":  "Brown fox" }}
]
}
}
}
```

获得最佳匹配语句的评分_score 。

将其他匹配语句的评分与tie_breaker相乘对以上评分求和并规范化1.

2.

3.

### 第 16 页

![Elasticsearch 教程配图（46-7 第16页 图1）](/中间件/elasticsearch/46-7/p16-page.png)

best_fields策略获取最佳匹配字段的得分, final_score = max(其他匹配字段得分， 最佳匹配字段得分)采用 best_fields 查询，并添加参数 tie_breaker=0.1，final_score = 其他匹配字段得分 * 0.1 + 最佳匹配字段得分Best Fields是默认类型，可以不用指定，等价于dis_max查询方式

```
POST /blogs/_search
{
"query": {
"dis_max": {
"queries": [
{ "match": { "title": "Quick pets" }},
{ "match": { "body":  "Quick pets" }}
]
}
}
}
```

12

13

```
POST /blogs/_search
{
"query": {
"dis_max": {
"queries": [
{ "match": { "title": "Quick pets" }},
{ "match": { "body":  "Quick pets" }}
],
"tie_breaker": 0.1
}
}
}
```

使用 best_fields 查询

### 第 17 页

![Elasticsearch 教程配图（46-7 第17页 图1）](/中间件/elasticsearch/46-7/p17-page.png)

案例

```
POST /blogs/_search
{
"query": {
"multi_match": {
"type": "best_fields",
"query": "Brown fox",
"fields": ["title","body"],
"tie_breaker": 0.2
}
}
}
```

### 第 18 页

![Elasticsearch 教程配图（46-7 第18页 图1）](/中间件/elasticsearch/46-7/p18-page.png)

```
PUT /employee
{
"settings" : {
"index" : {
"analysis.analyzer.default.type": "ik_max_word"
}
}
}
```

9

```
POST /employee/_bulk
{"index":{"_id":1}}
{"empId":"1","name":"员工
```

001","age":20,"sex":"男","mobile":"19000001111","salary":23343,"deptName":"技术部","address":"湖北省武汉市洪山区光谷大厦","content":"i like to write best elasticsearcharticle"}12

```
{"index":{"_id":2}}
{"empId":"2","name":"员工
```

002","age":25,"sex":"男","mobile":"19000002222","salary":15963,"deptName":"销售部","address":"湖北省武汉市江汉路","content":"i think java is the best programminglanguage"}14

```
{"index":{"_id":3}}
{"empId":"3","name":"员工
```

003","age":30,"sex":"男","mobile":"19000003333","salary":20000,"deptName":"技术部","address":"湖北省武汉市经济开发区","content":"i am only an elasticsearch beginner"}16

```
{"index":{"_id":4}}
{"empId":"4","name":"员工
```

004","age":20,"sex":"女","mobile":"19000004444","salary":15600,"deptName":"销售部","address":"湖北省武汉市沌口开发区","content":"elasticsearch and hadoop are all verygood solution, i am a beginner"}18

```
{"index":{"_id":5}}
{"empId":"5","name":"员工
```

005","age":20,"sex":"男","mobile":"19000005555","salary":19665,"deptName":"测试部","address":"湖北省武汉市东湖隧道","content":"spark is best big data solution based onscala, an programming language similar to java"}20

```
{"index":{"_id":6}}
{"empId":"6","name":"员工
```

006","age":30,"sex":"女","mobile":"19000006666","salary":30000,"deptName":"技术部","address":"湖北省武汉市江汉路","content":"i like java developer"}22

```
{"index":{"_id":7}}
{"empId":"7","name":"员工
```

007","age":60,"sex":"女","mobile":"19000007777","salary":52130,"deptName":"测试部","address":"湖北省黄冈市边城区","content":"i like elasticsearch developer"}24

```
{"index":{"_id":8}}
```

### 第 19 页

![Elasticsearch 教程配图（46-7 第19页 图1）](/中间件/elasticsearch/46-7/p19-page.png)

```
{"empId":"8","name":"员工
```

008","age":19,"sex":"女","mobile":"19000008888","salary":60000,"deptName":"技术部","address":"湖北省武汉市江汉大学","content":"i like spark language"}26

```
{"index":{"_id":9}}
{"empId":"9","name":"员工
```

009","age":40,"sex":"男","mobile":"19000009999","salary":23000,"deptName":"销售部","address":"河南省郑州市郑州大学","content":"i like java developer"}28

```
{"index":{"_id":10}}
{"empId":"10","name":"张湖
```

北","age":35,"sex":"男","mobile":"19000001010","salary":18000,"deptName":"测试部","address":"湖北省武汉市东湖高新","content":"i like java developer, i also likeelasticsearch"}30

```
{"index":{"_id":11}}
{"empId":"11","name":"王河
```

南","age":61,"sex":"男","mobile":"19000001011","salary":10000,"deptName":"销售部","address":"河南省开封市河南大学","content":"i am not like java"}32

```
{"index":{"_id":12}}
{"empId":"12","name":"张大
```

学","age":26,"sex":"女","mobile":"19000001012","salary":11321,"deptName":"测试部","address":"河南省开封市河南大学","content":"i am java developer, java is good"}34

```
{"index":{"_id":13}}
{"empId":"13","name":"李江
```

汉","age":36,"sex":"男","mobile":"19000001013","salary":11215,"deptName":"销售部","address":"河南省郑州市二七区","content":"i like java and java is very best, i likeit, do you like java"}36

```
{"index":{"_id":14}}
{"empId":"14","name":"王技
```

术","age":45,"sex":"女","mobile":"19000001014","salary":16222,"deptName":"测试部","address":"河南省郑州市金水区","content":"i like c++"}38

```
{"index":{"_id":15}}
{"empId":"15","name":"张测
```

试","age":18,"sex":"男","mobile":"19000001015","salary":20000,"deptName":"技术部","address":"河南省郑州市高新开发区","content":"i think spark is good"}40

41

42

```
GET /employee/_search
{
"query": {
"multi_match": {
"query": "elasticsearch beginner 湖北省 开封市",
"type": "best_fields",
"fields": [
"content",
"address"
]
}
```

### 第 20 页

![Elasticsearch 教程配图（46-7 第20页 图1）](/中间件/elasticsearch/46-7/p20-page.png)

```
},
"size":
}
```

57

58

```
# 查看执行计划
GET /employee/_explain/3
{
```

62"query": {63"multi_match": {64"query": "elasticsearch beginner 湖北省 开封市",

65"type": "best_fields",

66"fields": [67"content",

68"address"69

```
]
}
}
}
```

74

```
GET /employee/_explain/3
{
```

77"query": {78"multi_match": {79"query": "elasticsearch beginner 湖北省 开封市",

80"type": "best_fields",

81"fields": [82"content",

83"address"84

```
],
"tie_breaker": 0.1
}
}
}
```

90

### 第 21 页

![Elasticsearch 教程配图（46-7 第21页 图1）](/中间件/elasticsearch/46-7/p21-page.png)

most_fields策略获取全部匹配字段的累计得分（综合全部匹配字段的得分），等价于bool should查询方式案例

使用多数字段搜索

```
GET /employee/_explain/3
{
```

3"query": {4"multi_match": {5"query": "elasticsearch beginner 湖北省 开封市",

6"type": "most_fields",

7"fields": [8"content",

9"address"10

```
]
}
}
}
```

### 第 22 页

![Elasticsearch 教程配图（46-7 第22页 图1）](/中间件/elasticsearch/46-7/p22-page.png)

用广度匹配字段title包括尽可能多的文档——以提升召回率——同时又使用字段title.std 作为信号将相关度更高的文档置于结果顶部。

```
DELETE /titles
PUT /titles
{
"mappings": {
"properties": {
"title": {
"type": "text",
"analyzer": "english",
"fields": {
"std": {
"type": "text",
"analyzer": "standard"
}
}
}
}
}
}
```

19

```
POST titles/_bulk
{ "index": { "_id": 1 }}
{ "title": "My dog barks" }
{ "index": { "_id": 2 }}
{ "title": "I see a lot of barking dogs on the road " }
```

25

```
# 结果与预期不匹配
GET /titles/_search
{
"query": {
"match": {
"title": "barking dogs"
}
}
}
```

### 第 23 页

![Elasticsearch 教程配图（46-7 第23页 图1）](/中间件/elasticsearch/46-7/p23-page.png)

每个字段对于最终评分的贡献可以通过自定义值boost 来控制。比如，使title 字段更为重要,这样同时也降低了其他信号字段的作用：

搜索内容在多个字段中都显示，类似bool+dis_max组合

```
GET /titles/_search
{
"query": {
"multi_match": {
"query": "barking dogs",
"type": "most_fields",
"fields": [
"title",
"title.std"
]
}
}
}
#增加title的权重
GET /titles/_search
{
"query": {
"multi_match": {
"query": "barking dogs",
"type": "most_fields",
"fields": [
"title^10",
"title.std"
]
}
}
}
```

跨字段搜索

### 第 24 页

![Elasticsearch 教程配图（46-7 第24页 图1）](/中间件/elasticsearch/46-7/p24-page.png)

```
DELETE /address
PUT /address
{
"settings" : {
"index" : {
"analysis.analyzer.default.type": "ik_max_word"
}
}
}
```

10

```
PUT /address/_bulk
{ "index": { "_id": "1"} }
{"province": "湖南","city": "长沙"}
{ "index": { "_id": "2"} }
{"province": "湖南","city": "常德"}
{ "index": { "_id": "3"} }
{"province": "广东","city": "广州"}
{ "index": { "_id": "4"} }
{"province": "湖南","city": "邵阳"}
```

20

```
#使用most_fields的方式结果不符合预期，不支持operator
GET /address/_search
{
"query": {
"multi_match": {
"query": "湖南常德",
"type": "most_fields",
"fields": ["province","city"]
}
}
}
```

32

```
# 可以使用cross_fields，支持operator
#与copy_to相比，其中一个优势就是它可以在搜索时为单个字段提升权重。
GET /address/_search
{
"query": {
"multi_match": {
"query": "湖南常德",
```

### 第 25 页

![Elasticsearch 教程配图（46-7 第25页 图1）](/中间件/elasticsearch/46-7/p25-page.png)

还可以用copy...to 解决，但是需要额外的存储空间"type": "cross_fields",

40"operator": "and",

41"fields": ["province","city"]42

```
}
}
}
```

### 第 26 页

![Elasticsearch 教程配图（46-7 第26页 图1）](/中间件/elasticsearch/46-7/p26-page.png)

```
DELETE /address
# copy_to参数允许将多个字段的值复制到组字段中，然后可以将其作为单个字段进行查询
PUT /address
{
"mappings" : {
"properties" : {
"province" : {
"type" : "keyword",
"copy_to": "full_address"
},
"city" : {
"type" : "text",
"copy_to": "full_address"
}
}
},
"settings" : {
"index" : {
"analysis.analyzer.default.type": "ik_max_word"
}
}
}
```

23

```
PUT /address/_bulk
{ "index": { "_id": "1"} }
{"province": "湖南","city": "长沙"}
{ "index": { "_id": "2"} }
{"province": "湖南","city": "常德"}
{ "index": { "_id": "3"} }
{"province": "广东","city": "广州"}
{ "index": { "_id": "4"} }
{"province": "湖南","city": "邵阳"}
```

33

```
GET /address/_search
{
"query": {
"match": {
"full_address": {
"query": "湖南常德",
```

### 第 27 页

![Elasticsearch 教程配图（46-7 第27页 图1）](/中间件/elasticsearch/46-7/p27-page.png)

"operator": "and"40

```
}
}
}
}
```

45

---

## 第二部分：聚合分析（Aggregations）


### 第 1 页

Elasticsearch除搜索以外，提供了针对ES 数据进行统计分析的功能。

可以让我们极其方便的实现对数据的统计、分析、运算。例如：

聚合查询可以用于各种场景，比如商业智能、数据挖掘、日志分析等等。

聚合查询的语法结构与其他查询相似，通常包含以下部分：

1. 聚合的概述聚合(aggregations)什么品牌的手机最受欢迎？

这些手机的平均价格、最高价格、最低价格？

这些手机每月的销售情况如何？

使用场景电商平台的销售分析：统计每个地区的销售额、每个用户的消费总额、每个产品的销售量等，以便更好地了解销售情况和趋势。

社交媒体的用户行为分析：统计每个用户的发布次数、转发次数、评论次数等，以便更好地了解用户行为和趋势，同时可以将数据按照地区、时间、话题等维度进行分析。

物流企业的运输分析：统计每个区域的运输量、每个车辆的运输次数、每个司机的行驶里程等，以便更好地了解运输情况和优化运输效率。

金融企业的交易分析：统计每个客户的交易总额、每个产品的销售量、每个交易员的业绩等，以便更好地了解交易情况和优化业务流程。

智能家居的设备监控分析：统计每个设备的使用次数、每个家庭的能源消耗量、每个时间段的设备使用率等，以便更好地了解用户需求和优化设备效能。

基本语法查询条件：指定需要聚合的文档，可以使用标准的 Elasticsearch 查询语法，如 term、match、range 等等。

聚合函数：指定要执行的聚合操作，如 sum、avg、min、max、terms、date_histogram 等等。每个聚合命令都会生成一个聚合结果。

聚合嵌套：聚合命令可以嵌套，以便更细粒度地分析数据。

### 第 2 页

![Elasticsearch 教程配图（46-8 第2页 图1）](/中间件/elasticsearch/46-8/p02-page.png)

```
GET <index_name>/_search
{
"aggs": {
"<aggs_name>": { // 聚合名称需要自己定义
"<agg_type>": {
"field": "<field_name>"
}
}
}
}
```

aggs_name：聚合函数的名称agg_type：聚合种类，比如是桶聚合（terms）或者是指标聚合（avg、sum、min、max等）field_name：字段名称或者叫域名。

2. 聚合的分类Metric Aggregation：—些数学运算，可以对文档字段进行统计分析，类比Mysql中的 min(), max(), sum() 操作。

SELECT MIN(price), MAX(price) FROM products1

```
#Metric聚合的DSL类比实现：
{
"aggs":{
"avg_price":{
"avg":{
"field":"price"
}
}
}
}
```

Bucket Aggregation： 一些满足特定条件的文档的集合放置到一个桶里，每一个桶关联一个key，类比Mysql中的group by操作。

### 第 3 页

![Elasticsearch 教程配图（46-8 第3页 图1）](/中间件/elasticsearch/46-8/p03-page.png)

示例数据ELECT size COUNT(*) FROM products GROUP BY size1

```
#bucket聚合的DSL类比实现：
{
"aggs": {
"by_size": {
"terms": {
"field": "size"
}
}
}
```

Pipeline Aggregation：对其他的聚合结果进行二次聚合

### 第 4 页

![Elasticsearch 教程配图（46-8 第4页 图1）](/中间件/elasticsearch/46-8/p04-page.png)

```
DELETE /employees
#创建索引库
PUT /employees
{
"mappings": {
"properties": {
"age":{
"type": "integer"
},
"gender":{
"type": "keyword"
},
"job":{
"type" : "text",
"fields" : {
"keyword" : {
"type" : "keyword",
"ignore_above" :
}
}
},
"name":{
"type": "keyword"
},
"salary":{
"type": "integer"
}
}
}
}
```

31

```
PUT /employees/_bulk
{ "index" : {  "_id" : "1" } }
{ "name" : "Emma","age":32,"job":"Product Manager","gender":"female","salary":35000 }
{ "index" : {  "_id" : "2" } }
{ "name" : "Underwood","age":41,"job":"Dev Manager","gender":"male","salary": 50000}
{ "index" : {  "_id" : "3" } }
{ "name" : "Tran","age":25,"job":"Web Designer","gender":"male","salary":18000 }
{ "index" : {  "_id" : "4" } }
```

### 第 5 页

![Elasticsearch 教程配图（46-8 第5页 图1）](/中间件/elasticsearch/46-8/p05-page.png)

{ "name" : "Rivera","age":26,"job":"Web Designer","gender":"female","salary": 22000}40{ "index" : {  "_id" : "5" } }41{ "name" : "Rose","age":25,"job":"QA","gender":"female","salary":18000 }42{ "index" : {  "_id" : "6" } }43{ "name" : "Lucy","age":31,"job":"QA","gender":"female","salary": 25000}44{ "index" : {  "_id" : "7" } }45{ "name" : "Byrd","age":27,"job":"QA","gender":"male","salary":20000 }46{ "index" : {  "_id" : "8" } }47{ "name" : "Foster","age":27,"job":"Java Programmer","gender":"male","salary": 20000}48{ "index" : {  "_id" : "9" } }49{ "name" : "Gregory","age":32,"job":"Java Programmer","gender":"male","salary":22000 }50{ "index" : {  "_id" : "10" } }51{ "name" : "Bryant","age":20,"job":"Java Programmer","gender":"male","salary": 9000}52{ "index" : {  "_id" : "11" } }53{ "name" : "Jenny","age":36,"job":"Java Programmer","gender":"female","salary":38000 }54{ "index" : {  "_id" : "12" } }55{ "name" : "Mcdonald","age":31,"job":"Java Programmer","gender":"male","salary": 32000}56{ "index" : {  "_id" : "13" } }57{ "name" : "Jonthna","age":30,"job":"Java Programmer","gender":"female","salary":30000

```
}
{ "index" : {  "_id" : "14" } }
{ "name" : "Marshall","age":32,"job":"Javascript Programmer","gender":"male","salary":
25000}
{ "index" : {  "_id" : "15" } }
{ "name" : "King","age":33,"job":"Java Programmer","gender":"male","salary":28000 }
{ "index" : {  "_id" : "16" } }
{ "name" : "Mccarthy","age":21,"job":"Javascript Programmer","gender":"male","salary":
16000}
{ "index" : {  "_id" : "17" } }
{ "name" : "Goodwin","age":25,"job":"Javascript Programmer","gender":"male","salary":
16000}
{ "index" : {  "_id" : "18" } }
{ "name" : "Catherine","age":29,"job":"Javascript
Programmer","gender":"female","salary": 20000}
{ "index" : {  "_id" : "19" } }
{ "name" : "Boone","age":30,"job":"DBA","gender":"male","salary": 30000}
{ "index" : {  "_id" : "20" } }
{ "name" : "Kathy","age":29,"job":"DBA","gender":"female","salary": 20000}
```

### 第 6 页

![Elasticsearch 教程配图（46-8 第6页 图1）](/中间件/elasticsearch/46-8/p06-page.png)

查询员工的最低最高和平均工资

对salary进行统计指标聚合（Metric Aggregation）单值分析︰只输出一个分析结果min, max, avg, sumCardinality（类似distinct Count)多值分析:输出多个分析结果stats（统计）, extended statspercentile （百分位）, percentile ranktop hits(排在前面的示例)

```
#多个 Metric 聚合，找到最低最高和平均工资
POST /employees/_search
{
"size": 0,
"aggs": {
"max_salary": {
"max": {
"field": "salary"
}
},
"min_salary": {
"min": {
"field": "salary"
}
},
"avg_salary": {
"avg": {
"field": "salary"
}
}
}
}
```

### 第 7 页

![Elasticsearch 教程配图（46-8 第7页 图1）](/中间件/elasticsearch/46-8/p07-page.png)

cardinate对搜索结果去重

按照一定的规则，将文档分配到不同的桶中，从而达到分类的目的。ES提供的一些常见的 BucketAggregation。

```
# 一个聚合，输出多值
POST /employees/_search
{
"size": 0,
"aggs": {
"stats_salary": {
"stats": {
"field":"salary"
}
}
}
}
POST /employees/_search
{
"size": 0,
"aggs": {
"cardinate": {
"cardinality": {
"field": "job.keyword"
}
}
}
}
```

桶聚合（Bucket Aggregation）Terms，需要字段支持filedata

### 第 8 页

![Elasticsearch 教程配图（46-8 第8页 图1）](/中间件/elasticsearch/46-8/p08-page.png)

桶聚合可以用于各种场景，例如：

聚合可配置属性有：

默认情况下，Bucket聚合会统计Bucket内的文档数量，记为_count，并且按照_count降序排序。我们可以指定order属性，自定义聚合的排序方式：

keyword 默认支持fielddatatext需要在Mapping 中开启fielddata，会按照分词后的结果进行分桶数字类型Range / Data RangeHistogram（直方图） / Date Histogram支持嵌套: 也就在桶里再做分桶对数据进行分组统计，比如按照地区、年龄段、性别等字段进行分组统计。

对时间序列数据进行时间段分析，比如按照每小时、每天、每月、每季度、每年等时间段进行分析。

对各种标签信息分类，并统计其数量。

获取job的分类信息

```
# 对keword 进行聚合
GET /employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword"
}
}
}
}
```

field：指定聚合字段size：指定聚合结果数量order：指定聚合结果排序方式

### 第 9 页

![Elasticsearch 教程配图（46-8 第9页 图1）](/中间件/elasticsearch/46-8/p09-page.png)

```
GET /employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword",
"size": 10,
"order": {
"_count": "desc"
}
}
}
}
}
```

限定聚合范围

### 第 10 页

![Elasticsearch 教程配图（46-8 第10页 图1）](/中间件/elasticsearch/46-8/p10-page.png)

注意：对 Text 字段进行 terms 聚合查询，会失败抛出异常

```
#只对salary在10000元以上的文档聚合
GET /employees/_search
{
"query": {
"range": {
"salary": {
"gte":
}
}
},
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword",
"size": 10,
"order": {
"_count": "desc"
}
}
}
}
}
```

### 第 11 页

![Elasticsearch 教程配图（46-8 第11页 图1）](/中间件/elasticsearch/46-8/p11-page.png)

解决办法：对 Text 字段打开 fielddata，支持terms aggregation

```
POST /employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job"
}
}
}
}
```

### 第 12 页

![Elasticsearch 教程配图（46-8 第12页 图1）](/中间件/elasticsearch/46-8/p12-page.png)

对job.keyword 和 job 进行 terms 聚合，分桶的总数并不一样

```
PUT /employees/_mapping
{
"properties" : {
"job":{
"type":  "text",
"fielddata": true
}
}
}
```

10

```
# 对 Text 字段进行分词，分词后的terms
POST /employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job"
}
}
}
}
POST /employees/_search
{
"size": 0,
"aggs": {
"cardinate": {
"cardinality": {
"field": "job"
}
}
}
}
```

### 第 13 页

![Elasticsearch 教程配图（46-8 第13页 图1）](/中间件/elasticsearch/46-8/p13-page.png)

Range 示例：按照工资的 Range 分桶

Histogram示例：按照工资的间隔分桶Range & Histogram聚合按照数字的范围，进行分桶在Range Aggregation中，可以自定义KeySalary Range分桶，可以自己定义 key1

```
POST employees/_search
{
"size": 0,
"aggs": {
"salary_range": {
"range": {
"field":"salary",
"ranges":[
{
"to":10000
},
{
"from":10000,
"to":20000
},
{
"key":">20000",
"from":20000
}
]
}
}
}
}
```

### 第 14 页

![Elasticsearch 教程配图（46-8 第14页 图1）](/中间件/elasticsearch/46-8/p14-page.png)

top_hits应用场景: 当获取分桶后，桶内最匹配的顶部文档列表

```
#工资0到10万，以 5000一个区间进行分桶
POST employees/_search
{
"size": 0,
"aggs": {
"salary_histrogram": {
"histogram": {
"field":"salary",
"interval":5000,
"extended_bounds":{
"min":0,
"max":100000
}
}
}
}
}
```

### 第 15 页

![Elasticsearch 教程配图（46-8 第15页 图1）](/中间件/elasticsearch/46-8/p15-page.png)

嵌套聚合示例

```
# 指定size，不同工种中，年纪最大的3个员工的具体信息
POST /employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword"
},
"aggs":{
"old_employee":{
"top_hits":{
"size":3,
"sort":[
{
"age":{
"order":"desc"
}
}
]
}
}
}
}
}
}
```

27

### 第 16 页

![Elasticsearch 教程配图（46-8 第16页 图1）](/中间件/elasticsearch/46-8/p16-page.png)

```
# 嵌套聚合1，按照工作类型分桶，并统计工资信息
POST employees/_search
{
"size": 0,
"aggs": {
"Job_salary_stats": {
"terms": {
"field": "job.keyword"
},
"aggs": {
"salary": {
"stats": {
"field": "salary"
}
}
}
}
}
}
```

20

```
# 多次嵌套。根据工作类型分桶，然后按照性别分桶，计算工资的统计信息
POST employees/_search
{
"size": 0,
"aggs": {
"Job_gender_stats": {
"terms": {
"field": "job.keyword"
},
"aggs": {
"gender_stats": {
"terms": {
"field": "gender"
},
"aggs": {
"salary_stats": {
"stats": {
"field": "salary"
}
```

### 第 17 页

![Elasticsearch 教程配图（46-8 第17页 图1）](/中间件/elasticsearch/46-8/p17-page.png)

支持对聚合分析的结果，再次进行聚合分析。

Pipeline 的分析结果会输出到原结果中，根据位置的不同，分为两类：

min_bucket示例在员工数最多的工种里，找出平均工资最低的工种

```
}
}
}
}
}
}
}
```

管道聚合（Pipeline Aggregation）Sibling - 结果和现有分析结果同级Max，min，Avg & Sum BucketStats，Extended Status BucketPercentiles BucketParent -结果内嵌到现有的聚合分析结果之中Derivative(求导)Cumultive Sum(累计求和)Moving Function(移动平均值 )

### 第 18 页

![Elasticsearch 教程配图（46-8 第18页 图1）](/中间件/elasticsearch/46-8/p18-page.png)

Stats示例

```
# 平均工资最低的工种
POST employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field": "job.keyword",
"size":
},
"aggs": {
"avg_salary": {
"avg": {
"field": "salary"
}
}
}
},
"min_salary_by_job":{
"min_bucket": {
"buckets_path": "jobs>avg_salary"
}
}
}
}
```

min_salary_by_job结果和jobs的聚合同级min_bucket求之前结果的最小值通过bucket_path关键字指定路径

### 第 19 页

![Elasticsearch 教程配图（46-8 第19页 图1）](/中间件/elasticsearch/46-8/p19-page.png)

percentiles示例

```
# 平均工资的统计分析
POST employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field": "job.keyword",
"size":
},
"aggs": {
"avg_salary": {
"avg": {
"field": "salary"
}
}
}
},
"stats_salary_by_job":{
"stats_bucket": {
"buckets_path": "jobs>avg_salary"
}
}
}
}
```

### 第 20 页

![Elasticsearch 教程配图（46-8 第20页 图1）](/中间件/elasticsearch/46-8/p20-page.png)

Cumulative_sum示例

```
# 平均工资的百分位数
POST employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field": "job.keyword",
"size":
},
"aggs": {
"avg_salary": {
"avg": {
"field": "salary"
}
}
}
},
"percentiles_salary_by_job":{
"percentiles_bucket": {
"buckets_path": "jobs>avg_salary"
}
}
}
}
```

26

### 第 21 页

![Elasticsearch 教程配图（46-8 第21页 图1）](/中间件/elasticsearch/46-8/p21-page.png)

ES聚合分析的默认作用范围是query的查询结果集，同时ES还支持以下方式改变聚合的作用范围：

```
#Cumulative_sum   累计求和
POST employees/_search
{
"size": 0,
"aggs": {
"age": {
"histogram": {
"field": "age",
"min_doc_count": 0,
"interval":
},
"aggs": {
"avg_salary": {
"avg": {
"field": "salary"
}
},
"cumulative_salary":{
"cumulative_sum": {
"buckets_path": "avg_salary"
}
}
}
}
}
}
```

27聚合的作用范围FilterPost FilterGlobal

### 第 22 页

![Elasticsearch 教程配图（46-8 第22页 图1）](/中间件/elasticsearch/46-8/p22-page.png)

```
#Query
POST employees/_search
{
"size": 0,
"query": {
"range": {
"age": {
"gte":
}
}
},
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword"
```

16

```
}
}
}
}
```

21

```
#Filter
POST employees/_search
{
"size": 0,
"aggs": {
"older_person": {
"filter":{
"range":{
"age":{
"from":35
}
}
},
"aggs":{
"jobs":{
"terms": {
"field":"job.keyword"
}
```

### 第 23 页

![Elasticsearch 教程配图（46-8 第23页 图1）](/中间件/elasticsearch/46-8/p23-page.png)

```
}
}},
"all_jobs": {
"terms": {
"field":"job.keyword"
```

45

```
}
}
}
}
```

50

51

52

```
#Post field. 一条语句，找出所有的job类型。还能找到聚合后符合条件的结果
POST employees/_search
{
"aggs": {
"jobs": {
"terms": {
"field": "job.keyword"
}
}
},
"post_filter": {
"match": {
"job.keyword": "Dev Manager"
}
}
}
```

69

70

```
#global
# 使用global聚合来计算所有匹配查询的文档（即所有年龄大于或等于40岁的员工）的平均薪资。
#global聚合的特点是它会考虑查询范围内的所有文档，而不仅仅是某个特定分组或桶中的文档。
POST employees/_search
{
"size": 0,
"query": {
"range": {
"age": {
```

### 第 24 页

![Elasticsearch 教程配图（46-8 第24页 图1）](/中间件/elasticsearch/46-8/p24-page.png)

指定order，按照count和key进行排序：

"gte": 4080

```
}
}
},
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword"
}
},
```

90"all":{91"global":{},

92"aggs":{93"salary_avg":{94"avg":{95"field":"salary"96

```
}
}
}
}
}
}
```

103

104

105

排序默认情况，按照count降序排序指定size，就能返回相应的桶

### 第 25 页

![Elasticsearch 教程配图（46-8 第25页 图1）](/中间件/elasticsearch/46-8/p25-page.png)

```
#排序 order
#count and key
POST employees/_search
{
"size": 0,
"query": {
"range": {
"age": {
"gte":
}
}
},
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword",
"order":[
{"_count":"asc"},
{"_key":"desc"}
]
```

21

```
}
}
}
}
```

26

27

```
#排序 order
#count and key
POST employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword",
"order":[  {
"avg_salary":"desc"
}]
```

### 第 26 页

![Elasticsearch 教程配图（46-8 第26页 图1）](/中间件/elasticsearch/46-8/p26-page.png)

40

41

```
},
"aggs": {
"avg_salary": {
"avg": {
"field":"salary"
}
}
}
}
}
}
```

53

54

```
#排序 order
#count and key
POST employees/_search
{
"size": 0,
"aggs": {
"jobs": {
"terms": {
"field":"job.keyword",
"order":[  {
"stats_salary.min":"desc"
}]
},
"aggs": {
"stats_salary": {
"stats": {
"field":"salary"
}
}
}
}
}
}
```

### 第 27 页

![Elasticsearch 教程配图（46-8 第27页 图1）](/中间件/elasticsearch/46-8/p27-page.png)

ElasticSearch在对海量数据进行聚合分析的时候会损失搜索的精准度来满足实时性的需求。

Terms聚合分析的执行流程：

不精准的原因： 数据分散到多个分片，聚合是每个分片的取 Top X，导致结果不精准。ES 可以不每个分片Top X，而是全量聚合，但势必这会有很大的性能问题。

思考：如何提高聚合精确度？

方案1：设置主分片为1注意7.x版本已经默认为1。

适用场景：数据量小的小集群规模业务场景。

方案2：调大 shard_size 值设置 shard_size 为比较大的值，官方推荐：size*1.5+10。shard_size 值越大，结果越趋近于精准聚合结果值。此外，还可以通过show_term_doc_count_error参数显示最差情况下的错误值，用于辅助确定shard_size 大小。

适用场景：数据量大、分片数多的集群业务场景。

测试： 使用kibana的测试数据

3. ES聚合分析不精准原因分析size：是聚合结果的返回值，客户期望返回聚合排名前三，size值就是 3。

shard_size: 每个分片上聚合的数据条数。shard_size 原则上要大于等于 size

### 第 28 页

![Elasticsearch 教程配图（46-8 第28页 图1）](/中间件/elasticsearch/46-8/p28-page.png)

```
DELETE my_flights
PUT my_flights
{
"settings": {
"number_of_shards":
},
"mappings" : {
"properties" : {
"AvgTicketPrice" : {
"type" : "float"
},
"Cancelled" : {
"type" : "boolean"
},
"Carrier" : {
"type" : "keyword"
},
"Dest" : {
"type" : "keyword"
},
"DestAirportID" : {
"type" : "keyword"
},
"DestCityName" : {
"type" : "keyword"
},
"DestCountry" : {
"type" : "keyword"
},
"DestLocation" : {
"type" : "geo_point"
},
"DestRegion" : {
"type" : "keyword"
},
"DestWeather" : {
"type" : "keyword"
},
"DistanceKilometers" : {
```

### 第 29 页

![Elasticsearch 教程配图（46-8 第29页 图1）](/中间件/elasticsearch/46-8/p29-page.png)

"type" : "float"40

```
},
"DistanceMiles" : {
"type" : "float"
},
"FlightDelay" : {
"type" : "boolean"
},
"FlightDelayMin" : {
"type" : "integer"
},
"FlightDelayType" : {
"type" : "keyword"
},
"FlightNum" : {
"type" : "keyword"
},
"FlightTimeHour" : {
"type" : "keyword"
},
"FlightTimeMin" : {
"type" : "float"
},
"Origin" : {
"type" : "keyword"
},
"OriginAirportID" : {
"type" : "keyword"
},
"OriginCityName" : {
"type" : "keyword"
},
"OriginCountry" : {
"type" : "keyword"
},
"OriginLocation" : {
"type" : "geo_point"
},
"OriginRegion" : {
"type" : "keyword"
```

### 第 30 页

![Elasticsearch 教程配图（46-8 第30页 图1）](/中间件/elasticsearch/46-8/p30-page.png)

```
},
"OriginWeather" : {
"type" : "keyword"
},
"dayOfWeek" : {
"type" : "integer"
},
"timestamp" : {
"type" : "date"
}
}
}
}
```

93

```
POST _reindex
{
"source": {
"index": "kibana_sample_data_flights"
},
"dest": {
"index": "my_flights"
}
}
```

103

```
GET my_flights/_count
GET kibana_sample_data_flights/_search
{
"size": 0,
"aggs": {
"weather": {
"terms": {
"field":"OriginWeather",
"size":5,
"show_term_doc_count_error":true
}
}
}
}
```

118

```
GET my_flights/_search
```

### 第 31 页

![Elasticsearch 教程配图（46-8 第31页 图1）](/中间件/elasticsearch/46-8/p31-page.png)

在Terms Aggregation的返回中有两个特殊的数值：

方案3：将size设置为全量值，来解决精度问题将size设置为2的32次方减去1也就是分片支持的最大值，来解决精度问题。

原因：1.x版本，size等于 0 代表全部，高版本取消 0 值，所以设置了最大值（大于业务的全量值）。

全量带来的弊端就是：如果分片数据量极大，这样做会耗费巨大的CPU 资源来排序，而且可能会阻塞网络。

适用场景：对聚合精准度要求极高的业务场景，由于性能问题，不推荐使用。

方案4：使用Clickhouse/ Spark 进行精准聚合适用场景：数据量非常大、聚合精度要求高、响应速度快的业务场景。

```
{
"size": 0,
"aggs": {
"weather": {
"terms": {
"field":"OriginWeather",
"size":5,
"shard_size":10,
"show_term_doc_count_error":true
}
}
}
}
doc_count_error_upper_bound : 被遗漏的term 分桶，包含的文档，有可能的最大值
sum_other_doc_count: 除了返回结果 bucket的terms以外，其他 terms 的文档总数（总数-返回的总数)
```

4. Elasticsearch 聚合性能优化插入数据时对索引进行预排序Index sorting （索引排序）可用于在插入时对索引进行预排序，而不是在查询时再对索引进行排序，这将提高范围查询（range query）和排序操作的性能。

在 Elasticsearch 中创建新索引时，可以配置如何对每个分片内的段进行排序。

这是 Elasticsearch 6.X 之后版本才有的特性。

### 第 32 页

![Elasticsearch 教程配图（46-8 第32页 图1）](/中间件/elasticsearch/46-8/p32-page.png)

注意：预排序将增加 Elasticsearch 写入的成本。在某些用户特定场景下，开启索引预排序会导致大约40%-50% 的写性能下降。也就是说，如果用户场景更关注写性能的业务，开启索引预排序不是一个很好的选择。

节点查询缓存（Node query cache）可用于有效缓存过滤器（filter）操作的结果。如果多次执行同一filter 操作，这将很有效，但是即便更改过滤器中的某一个值，也将意味着需要计算新的过滤器结果。

你可以执行一个带有过滤查询的搜索请求，Elasticsearch将自动尝试使用节点查询缓存来优化性能。

例如，如果你想缓存一个基于特定字段值的过滤查询，你可以发送如下的HTTP请求：

1

```
PUT /my_index
{
"settings": {
"index":{
"sort.field": "create_time",
"sort.order": "desc"
}
},
"mappings": {
"properties": {
"create_time":{
"type": "date"
}
}
}
}
```

使用节点查询缓存

### 第 33 页

![Elasticsearch 教程配图（46-8 第33页 图1）](/中间件/elasticsearch/46-8/p33-page.png)

聚合语句中，设置：size：0，就会使用分片请求缓存缓存结果。size = 0 的含义是：只返回聚合结果，不返回查询结果。

```
GET /your_index/_search
{
"query": {
"bool": {
"filter": {
"term": {
"your_field": "your_value"
}
}
}
}
}
```

使用分片请求缓存

```
GET /es_db/_search
{
"size": 0,
"aggs": {
"remark_agg": {
"terms": {
"field": "remark.keyword"
}
}
}
}
```

拆分聚合，使聚合并行化

### 第 34 页

![Elasticsearch 教程配图（46-8 第34页 图1）](/中间件/elasticsearch/46-8/p34-page.png)

Elasticsearch 查询条件中同时有多个条件聚合，默认情况下聚合不是并行运行的。当为每个聚合提供自己的查询并执行 msearch 时，性能会有显著提升。因此，在 CPU 资源不是瓶颈的前提下，如果想缩短响应时间，可以将多个聚合拆分为多个查询，借助：msearch 实现并行聚合。

```
#常规的多条件聚合实现
GET /employees/_search
{
"size": 0,
"aggs": {
"job_agg": {
"terms": {
"field": "job.keyword"
}
},
"max_salary":{
"max": {
"field": "salary"
}
}
}
}
# msearch 拆分多个语句的聚合实现
GET _msearch
{"index":"employees"}
{"size":0,"aggs":{"job_agg":{"terms":{"field": "job.keyword"}}}}
{"index":"employees"}
{"size":0,"aggs":{"max_salary":{"max":{"field": "salary"}}}}
```

---

## 小结

- 本篇为 Elasticsearch 系列第 5/10 篇，主题：**搜索相关性与聚合分析**。
- 建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。
- 系列文章路径前缀：`/中间件/elasticsearch/`。

下一篇：[《Spring Boot 整合 ES 与商品搜索实战》](/中间件/elasticsearch/es-06-springboot-search)
