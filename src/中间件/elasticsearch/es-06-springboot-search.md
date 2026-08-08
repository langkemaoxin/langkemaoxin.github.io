---
title: "Spring Boot 整合 ES 与商品搜索实战"
sidebarGroup: "Elasticsearch"
shortTitle: "06 SpringBoot 与商品搜索"
order: 6
date: 2026-10-25
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 6/10 篇**
> 下一篇预告：[《深度分页问题与自定义分词》](/中间件/elasticsearch/es-07-pagination-analyzer)

---

## 开头：场景与目标

REST API 适合运维，Spring Boot 项目更需要声明式集成。本篇从 Spring Data Elasticsearch 入门，到图灵商城商品搜索的完整建模、筛选、排序与高亮实战。


### 第 1 页

![Elasticsearch 教程配图（46-10 第1页 图1）](/中间件/elasticsearch/46-10/p01-01.png)

Spring Data Elasticsearch 基于 spring data API 简化 Elasticsearch 操作，将原始操作Elasticsearch的客户端 API 进行封装 。Spring Data 为 Elasticsearch 项目提供集成搜索引擎。Spring DataElasticsearch POJO 的关键功能区域为中心的模型与 Elastichsearch 交互文档和轻松地编写一个存储索引库数据访问层。

官方网站:

Elasticsearch 8.14.x 对应依赖 Spring Data Elasticsearch 5.3.x，对应Spring6.1.x，Spring Boot版本可以选择3.3.x1. Spring Data Elasticsearch的介绍https://spring.io/projects/spring-data-elasticsearch

2. Spring Boot整合Spring Data Elasticsearch1）版本选型2）引入依赖

### 第 2 页

![Elasticsearch 教程配图（46-10 第2页 图1）](/中间件/elasticsearch/46-10/p02-page.png)

如果Spring Boot版本选择3.3.2，对应的Spring Data Elasticsearch为5.3.2

Spring Boot中有两种配置ElasticSearch的方式，选择一种即可。

```
<dependency>
```

\<\g\r\o\u\p\I\d\>\org.springframework.boot\<\/\g\r\o\u\p\I\d\>\2\<\a\r\t\i\f\a\c\t\I\d\>\spring-boot-starter-data-elasticsearch\<\/\a\r\t\i\f\a\c\t\I\d\>\3

```
</dependency>
```

- 3）配置ElasticSearch方式1：yml配置

```
spring:
elasticsearch:
uris: http://localhost:9200
```

connection-timeout: 3s4方式2： @Configuration配置

```
@Configuration
public class MyESClientConfig extends ElasticsearchConfiguration {
```

3@Override4

```
public ClientConfiguration clientConfiguration() {
```

return ClientConfiguration.builder().connectedTo("localhost:9200").build();6

```
}
}
```

- 4）Java代码实现方式1：使用ElasticsearchRepository

### 第 3 页

![Elasticsearch 教程配图（46-10 第3页 图1）](/中间件/elasticsearch/46-10/p03-page.png)

ElasticsearchRepository 是Spring Data Elasticsearch项目中的一个接口，用于简化对Elasticsearch集群的CRUD操作以及其他高级搜索功能的集成。这个接口允许开发者通过声明式编程模型来执行数据持久化操作，从而避免直接编写复杂的REST API调用代码。

创建实体类

实现ElasticsearchRepository接口该接口是框架封装的用于操作Elastsearch的高级接口测试

```
@Data
```

@AllArgsConstructor2@NoArgsConstructor3@Document(indexName = "employees")4

```
public class Employee {
```

@Id6

```
private Long id;
```

@Field(type= FieldType.Keyword)8

```
private String name;
private int sex;
private int age;
```

@Field(type= FieldType.Text,analyzer="ik_max_word")12

```
private String address;
private String remark;
}
```

@Repository1

```
public interface EmployeeRepository extends ElasticsearchRepository<Employee, Long> {
```

List\<\E\m\p\l\o\y\e\e\>\ findByName(String name);3

```
}
```

### 第 4 页

![Elasticsearch 教程配图（46-10 第4页 图1）](/中间件/elasticsearch/46-10/p04-page.png)

更多实现参考官方文档：

ElasticsearchTemplate模板类，封装了便捷操作Elasticsearch的模板方法，包括 索引 / 映射 / 文档CRUD 等底层操作和高级操作。

@Autowired1EmployeeRepository employeeRepository;2

3@Test4

```
public void testDocument() {
```

6Employee employee = new Employee(10L, "fox666", 1, 32, "长沙麓谷", "javaarchitect");7//插入文档8employeeRepository.save(employee);9

10//根据id查询11Optional\<\E\m\p\l\o\y\e\e\>\ result = employeeRepository.findById(10L);12if (!result.isEmpty()){13log.info(String.valueOf(result.get()));14

```
}
```

16

17//根据name查询18List\<\E\m\p\l\o\y\e\e\>\ list = employeeRepository.findByName("fox666");19if(!list.isEmpty()){20log.info(String.valueOf(list.get(0)));21

```
}
```

23

```
}
https://docs.spring.io/spring-data/elasticsearch/reference/elasticsearch/repo
```

sitories/elasticsearch-repository-queries.html方式2：使用ElasticsearchTemplate@Autowired1ElasticsearchTemplate elasticsearchTemplate;2

### 第 5 页

![Elasticsearch 教程配图（46-10 第5页 图1）](/中间件/elasticsearch/46-10/p05-page.png)

从 Java Rest Client 7.15.0 版本开始，Elasticsearch 官方决定将 RestHighLevelClient 标记为废弃的，并推荐使用新的 Java API Client，即 ElasticsearchClient. Spring Data ElasticSearch对ElasticsearchClient做了进一步的封装，成了新的客户端 ElasticsearchTemplate测试

### 第 6 页

![Elasticsearch 教程配图（46-10 第6页 图1）](/中间件/elasticsearch/46-10/p06-page.png)

@Slf4j1

```
public class ElasticsearchClientTest extends VipEsDemoApplicationTests{
```

3@Autowired4ElasticsearchTemplate elasticsearchTemplate;5

6

7@Test8

```
public void testCreateIndex(){
```

10//索引是否存在11boolean exist = elasticsearchTemplate.indexOps(Employee.class).exists();12if(exist){13//删除索引14elasticsearchTemplate.indexOps(Employee.class).delete();15

```
}
//创建索引
//1）配置settings
```

Map\<\S\t\r\i\n\g\,\ \O\b\j\e\c\t\>\ settings = new HashMap<>();19//"number_of_shards": 1,

20//"number_of_replicas": 121settings.put("number_of_shards",1);22settings.put("number_of_replicas",1);23//2) 配置mapping24String json = "{\n" +25"      \"properties\": {\n" +26"        \"_class\": {\n" +27"          \"type\": \"text\",\n" +28"          \"fields\": {\n" +29"            \"keyword\": {\n" +30"              \"type\": \"keyword\",\n" +31"              \"ignore_above\": 256\n" +32"            }\n" +33"          }\n" +34"        },\n" +35"        \"address\": {\n" +36"          \"type\": \"text\",\n" +37"          \"fields\": {\n" +38"            \"keyword\": {\n" +39

### 第 7 页

![Elasticsearch 教程配图（46-10 第7页 图1）](/中间件/elasticsearch/46-10/p07-page.png)

"              \"type\": \"keyword\"\n" +40"            }\n" +41"          },\n" +42"          \"analyzer\": \"ik_max_word\"\n" +43"        },\n" +44"        \"age\": {\n" +45"          \"type\": \"integer\"\n" +46"        },\n" +47"        \"id\": {\n" +48"          \"type\": \"long\"\n" +49"        },\n" +50"        \"name\": {\n" +51"          \"type\": \"keyword\"\n" +52"        },\n" +53"        \"remark\": {\n" +54"          \"type\": \"text\",\n" +55"          \"fields\": {\n" +56"            \"keyword\": {\n" +57"              \"type\": \"keyword\"\n" +58"            }\n" +59"          },\n" +60"          \"analyzer\": \"ik_smart\"\n" +61"        },\n" +62"        \"sex\": {\n" +63"          \"type\": \"integer\"\n" +64"        }\n" +65"      }\n" +66"    }";67Document mapping = Document.parse(json);68//3)创建索引69elasticsearchTemplate.indexOps(Employee.class)70.create(settings,mapping);71

72//查看索引mappings信息73Map\<\S\t\r\i\n\g\,\ \O\b\j\e\c\t\>\ mappings =elasticsearchTemplate.indexOps(Employee.class).getMapping();74log.info(mappings.toString());75

76

77

```
}
```

79

### 第 8 页

![Elasticsearch 教程配图（46-10 第8页 图1）](/中间件/elasticsearch/46-10/p08-page.png)

80@Test81

```
public void testBulkBatchInsert(){
```

List\<\E\m\p\l\o\y\e\e\>\ employees = new ArrayList<>();83employees.add(new Employee(2L,"张三",1,25,"广州天河公园","java developer"));84employees.add(new Employee(3L,"李四",1,28,"广州荔湾大厦","java assistant"));85employees.add(new Employee(4L,"小红",0,26,"广州白云山公园","php developer"));86

87List\<\I\n\d\e\x\Q\u\e\r\y\>\ bulkInsert = new ArrayList<>();88for (Employee employee : employees) {89IndexQuery indexQuery = new IndexQuery();90indexQuery.setId(String.valueOf(employee.getId()));91String json = JSONObject.toJSONString(employee);92indexQuery.setSource(json);93bulkInsert.add(indexQuery);94

```
}
//bulk批量插入文档
```

elasticsearchTemplate.bulkIndex(bulkInsert,Employee.class);97

```
}
```

99

100@Test101

```
public void testDocument(){
```

103//根据id删除文档104//对应： DELETE /employee/_doc/12105elasticsearchTemplate.delete(String.valueOf(12L),Employee.class);106

107Employee employee = new Employee(12L,"张三三",1,25,"广州天河公园","javadeveloper");108//插入文档109elasticsearchTemplate.save(employee);110

111//根据id查询文档112//对应：GET /employee/_doc/12113Employee emp = elasticsearchTemplate.get(String.valueOf(12L),Employee.class);114log.info(String.valueOf(emp));115

116

```
}
```

118

119

### 第 9 页

![Elasticsearch 教程配图（46-10 第9页 图1）](/中间件/elasticsearch/46-10/p09-page.png)

120@Test121

```
public void testQueryDocument(){
//条件查询
```

/* 查询姓名为张三的员工信息124

```
GET /employee/_search
{
"query": {
"term": {
"name": {
"value": "张三"
}
}
}
}*/
```

135//第一步：构建查询语句136//方式1：StringQuery137//        Query query = new StringQuery("{\n" +138//                "            \"term\": {\n" +139//                "                \"name\": {\n" +140//                "                    \"value\": \"张三\"\n" +141//                "                }\n" +142//                "            }\n" +143//                "        }");144//方式2：NativeQuery145Query query = NativeQuery.builder()146.withQuery(q -> q.term(147t -> t.field("name").value("张三")))148.build();149

150

151//第二步：调用search查询152SearchHits\<\E\m\p\l\o\y\e\e\>\ search = elasticsearchTemplate.search(query,

Employee.class);153//第三步：解析返回结果154List\<\S\e\a\r\c\h\H\i\t\<\E\m\p\l\o\y\e\e\>\> searchHits = search.getSearchHits();155for (SearchHit hit: searchHits){156log.info("返回结果："+hit.toString());157

```
}
```

159

### 第 10 页

![Elasticsearch 教程配图（46-10 第10页 图1）](/中间件/elasticsearch/46-10/p10-page.png)

160

```
}
```

162

163@Test164

```
public void testMatchQueryDocument(){
//条件查询
```

/*最少匹配广州，公园两个词167

```
GET /employee/_search
{
"query": {
"match": {
"address": {
"query": "广州公园",
"minimum_should_match":
}
}
}
}*/
```

179//第一步：构建查询语句180//方式1：StringQuery181//        Query query = new StringQuery("{\n" +182//                "            \"match\": {\n" +183//                "                \"address\": {\n" +184//                "                    \"query\": \"广州公园\",\n" +185//                "                     \"minimum_should_match\": 2\n" +186//                "                }\n" +187//                "            }\n" +188//                "        }");189//方式2：NativeQuery190Query query = NativeQuery.builder()191.withQuery(q -> q.match(192m -> m.field("address").query("广州公园")193.minimumShouldMatch("2")))194.build();195

196

197//第二步：调用search查询198SearchHits\<\E\m\p\l\o\y\e\e\>\ search = elasticsearchTemplate.search(query,

Employee.class);199

### 第 11 页

![Elasticsearch 教程配图（46-10 第11页 图1）](/中间件/elasticsearch/46-10/p11-page.png)

//第三步：解析返回结果200List\<\S\e\a\r\c\h\H\i\t\<\E\m\p\l\o\y\e\e\>\> searchHits = search.getSearchHits();201for (SearchHit hit: searchHits){202log.info("返回结果："+hit.toString());203

```
}
```

205

```
}
```

207@Test208

```
public void testQueryDocument3(){
// 分页排序高亮
```

/*211

```
GET /employee/_search
{
"from": 0,
"size": 3,
"query": {
"match": {
"remark": {
"query": "JAVA"
}
}
},
"highlight": {
"pre_tags": ["<font color='red'>"],
"post_tags": ["<font/>"],
"require_field_match": "false",
"fields": {
"*":{}
}
},
"sort": [
{
"age": {
"order": "desc"
}
}
]
}*/
//第一步：构建查询语句
```

### 第 12 页

![Elasticsearch 教程配图（46-10 第12页 图1）](/中间件/elasticsearch/46-10/p12-page.png)

Query query = new StringQuery("{\n" +240"        \"match\": {\n" +241"          \"remark\": {\n" +242"            \"query\": \"JAVA\"\n" +243"          }\n" +244"        }\n" +245"      }");246//分页  注意：from = pageNumber（页码，从0开始，） * pageSize（每页的记录数）247query.setPageable(PageRequest.of(0, 3));248//排序249query.addSort(Sort.by(Order.desc("age")));250//高亮251HighlightField highlightField = new HighlightField("*");252HighlightParameters highlightParameters = newHighlightParameters.HighlightParametersBuilder()253.withPreTags("\<\f\o\n\t\ \c\o\l\o\r\=\'\r\e\d\'\>\")254.withPostTags("\<\f\o\n\t\/\>\")255.withRequireFieldMatch(false)256.build();257Highlight highlight = newHighlight(highlightParameters,Arrays.asList(highlightField));258HighlightQuery highlightQuery = new HighlightQuery(highlight,Employee.class);259

260query.setHighlightQuery(highlightQuery);261

262

263//第二步：调用search查询264SearchHits\<\E\m\p\l\o\y\e\e\>\ search = elasticsearchTemplate.search(query,

Employee.class);265//第三步：解析返回结果266List\<\S\e\a\r\c\h\H\i\t\<\E\m\p\l\o\y\e\e\>\> searchHits = search.getSearchHits();267for (SearchHit hit: searchHits){268log.info("返回结果："+hit.toString());269

```
}
}
```

272

273@Test274

```
public void testBoolQueryDocument(){
//条件查询
```

/*277

### 第 13 页

![Elasticsearch 教程配图（46-10 第13页 图1）](/中间件/elasticsearch/46-10/p13-page.png)

```
GET /employee/_search
{
"query": {
"bool": {
"must": [
{
"match": {
"address": "广州"
}
},{
"match": {
"remark": "java"
}
}
]
}
}
}
*/
```

297//第一步：构建查询语句298//方式1：StringQuery299//        Query query = new StringQuery("{\n" +300//                "            \"bool\": {\n" +301//                "              \"must\": [\n" +302//                "                {\n" +303//                "                  \"match\": {\n" +304//                "                    \"address\": \"广州\"\n" +305//                "                  }\n" +306//                "                },{\n" +307//                "                  \"match\": {\n" +308//                "                    \"remark\": \"java\"\n" +309//                "                  }\n" +310//                "                }\n" +311//                "              ]\n" +312//                "            }\n" +313//                "          }");314//方式2：NativeQuery315Query query = NativeQuery.builder()316.withQuery(q -> q.bool(317

### 第 14 页

![Elasticsearch 教程配图（46-10 第14页 图1）](/中间件/elasticsearch/46-10/p14-page.png)

从 Java Rest Client 7.15.0 版本开始，Elasticsearch 官方决定将 RestHighLevelClient 标记为废弃的，

并推荐使用新的 Java API Client，即 ElasticsearchClient.

官网文档：

测试m -> m.must(318QueryBuilders.match( q1 -> q1.field("address").query("广州")),

319QueryBuilders.match( q2 -> q2.field("remark").query("java"))320)))321.build();322

323//第二步：调用search查询324SearchHits\<\E\m\p\l\o\y\e\e\>\ search = elasticsearchTemplate.search(query,

Employee.class);325//第三步：解析返回结果326List\<\S\e\a\r\c\h\H\i\t\<\E\m\p\l\o\y\e\e\>\> searchHits = search.getSearchHits();327for (SearchHit hit: searchHits){328log.info("返回结果："+hit.toString());329

```
}
```

331

```
}
```

333

```
}
```

方式3：使用ElasticsearchClienthttps://www.elastic.co/guide/en/elasticsearch/client/java-api-client/8.14/getting-started-java.html

### 第 15 页

![Elasticsearch 教程配图（46-10 第15页 图1）](/中间件/elasticsearch/46-10/p15-page.png)

@Autowired1ElasticsearchClient elasticsearchClient;2

3String indexName = "employee_demo";4

5@Test6

```
public void testCreateIndex() throws IOException {
```

8//索引是否存在9BooleanResponse exist = elasticsearchClient.indices()10.exists(e->e.index(indexName));11if(exist.value()){12//删除索引13elasticsearchClient.indices().delete(d->d.index(indexName));14

```
}
//创建索引
```

elasticsearchClient.indices().create(c->c.index(indexName)17.settings(s->s.numberOfShards("1").numberOfReplicas("1"))18.mappings(m-> m.properties("name",p->p.keyword(k->k))19.properties("sex",p->p.long_(l->l))20.properties("address",p->p.text(t->t.analyzer("ik_max_word")))21)22);23

24//查询索引25GetIndexResponse getIndexResponse = elasticsearchClient.indices().get(g ->g.index(indexName));26log.info(getIndexResponse.result().toString());27

28

```
}
```

30

31@Test32

```
public void testBulkBatchInsert() throws IOException {
```

List\<\E\m\p\l\o\y\e\e\>\ employees = new ArrayList<>();34employees.add(new Employee(2L,"张三",1,25,"广州天河公园","java developer"));35employees.add(new Employee(3L,"李四",1,28,"广州荔湾大厦","java assistant"));36employees.add(new Employee(4L,"小红",0,26,"广州白云山公园","php developer"));37

38List\<\I\n\d\e\x\Q\u\e\r\y\>\ bulkInsert = new ArrayList<>();39

### 第 16 页

![Elasticsearch 教程配图（46-10 第16页 图1）](/中间件/elasticsearch/46-10/p16-page.png)

for (Employee employee : employees) {40IndexQuery indexQuery = new IndexQuery();41indexQuery.setId(String.valueOf(employee.getId()));42String json = JSONObject.toJSONString(employee);43indexQuery.setSource(json);44bulkInsert.add(indexQuery);45

```
}
```

List\<\B\u\l\k\O\p\e\r\a\t\i\o\n\>\ list = new ArrayList<>();47for (Employee employee : employees) {48BulkOperation bulkOperation = new BulkOperation.Builder()49.create(c->c.id(String.valueOf(employee.getId()))50.document(employee)51)52.build();53

54list.add(bulkOperation);55

```
}
```

57//bulk批量插入文档58elasticsearchClient.bulk(b->b.index(indexName).operations(list));59

```
}
```

61@Test62

```
public void testDocument() throws IOException {
```

Employee employee = new Employee(12L,"张三三",1,25,"广州天河公园","java developer");64

65IndexRequest\<\E\m\p\l\o\y\e\e\>\ request = IndexRequest.of(i -> i66.index(indexName)67.id(employee.getId().toString())68.document(employee)69);70

71IndexResponse response = elasticsearchClient.index(request);72

73log.info("response:"+response);74

```
}
```

76

77@Test78

```
public void testQuery() throws IOException {
```

### 第 17 页

![Elasticsearch 教程配图（46-10 第17页 图1）](/中间件/elasticsearch/46-10/p17-page.png)

SearchRequest searchRequest = SearchRequest.of(s -> s80.index(indexName)81.query(q -> q.match(m -> m.field("name").query("张三三"))82));83

84log.info("构建的DSL语句:"+ searchRequest.toString());85

86SearchResponse\<\E\m\p\l\o\y\e\e\>\ searchResponse = elasticsearchClient.search(searchRequest,

Employee.class);87

88List\<\H\i\t\<\E\m\p\l\o\y\e\e\>\> hits = searchResponse.hits().hits();89hits.stream().map(Hit::source).forEach(employee -> {90log.info("员工信息:"+employee);91});92

93

```
}
```

95@Test96

```
public void testBoolQueryDocument() throws IOException {
//条件查询
```

/*99

```
GET /employee/_search
{
"query": {
"bool": {
"must": [
{
"match": {
"address": "广州"
}
},{
"match": {
"remark": "java"
}
}
]
}
}
}
*/
```

119

### 第 18 页

![Elasticsearch 教程配图（46-10 第18页 图1）](/中间件/elasticsearch/46-10/p18-page.png)

//第一步：构建查询语句120BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder();121boolQueryBuilder.must(m->m.match(q->q.field("address").query("广州")))122.must(m->m.match(q->q.field("remark").query("java")));123

124SearchRequest searchRequest = new SearchRequest.Builder()125.index("employee")126.query(q->q.bool(boolQueryBuilder.build()))127.build();128

129//第二步：调用search查询130SearchResponse\<\E\m\p\l\o\y\e\e\>\ searchResponse = elasticsearchClient.search(searchRequest,

Employee.class);131//第三步：解析返回结果132List\<\H\i\t\<\E\m\p\l\o\y\e\e\>\> list = searchResponse.hits().hits();133for(Hit\<\E\m\p\l\o\y\e\e\>\ hit: list){134//返回source135log.info(String.valueOf(hit.source()));136

```
}
```

138

```
}
```

---

## 第二部分：图灵商城商品搜索实战


### 第 1 页

![Elasticsearch 教程配图（46-11 第1页 图1）](/中间件/elasticsearch/46-11/p01-01.png)

根据关键字查询、根据品牌、商品类别、商品属性信息、价格区间、是否有库存筛选查询，根据销量、价格、上架时间等排序

商品json文档1. 业务场景——图灵商城商品搜索2. 商品文档建模

### 第 2 页

![Elasticsearch 教程配图（46-11 第2页 图1）](/中间件/elasticsearch/46-11/p02-page.png)

```
{
"id": "26",
"name": "小米 11 手机",
"keywords": "小米手机",
"subTitle": "AI智慧全面屏 6GB +64GB 亮黑色 全网通版 移动联通电信4G手机 双卡双待 双卡双待",
"price": "3999",
"promotionPrice": "2999",
"originalPrice": "5999",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/xiaomi.jpg",
"sale": 999,
"hasStock": true,
"salecount":999,
"putawayDate":"2021-04-01",
"brandId": 6,
"brandName": "小米",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/1e34aef2a409119018a4c6258e39ecfb_222_222.png",

16"categoryId": 19,

17"categoryName": "手机通讯",

18"attrs": [19

```
{
"attrId": 1,
"attrName": "cpu",
"attrValue": "2核"
},
{
"attrId": 2,
"attrName": "颜色",
"attrValue": "黑色"
}
]
}
```

32

```
{
"id": "30",
"name": "HLA海澜之家简约动物印花短袖T恤",
"keywords": "海澜之家衣服",
"subTitle": "HLA海澜之家短袖T恤",
```

### 第 3 页

![Elasticsearch 教程配图（46-11 第3页 图1）](/中间件/elasticsearch/46-11/p03-page.png)

建模分析：

思考：如何处理商品和商品属性之间的关联关系？

定义mapping，创建索引"price": "199",

38"promotionPrice": "99",

39"originalPrice": "299",

40"pic": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180615/5ad83a4fN6ff67ecd.jpg!cc_350x449.jpg",

41"sale": 999,

42"hasStock": true,

43"salecount":19,

44"putawayDate":"2021-04-05",

45"brandId": 50,

46"brandName": "海澜之家",

47"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/99d3279f1029d32b929343b09d3c72de_222_222.jpg",

48"categoryId": 8,

49"categoryName": "T恤",

50"attrs": [51

```
{
"attrId": 3,
"attrName": "尺寸",
"attrValue": "M"
},
{
"attrId": 4,
"attrName": "颜色",
"attrValue": "黑色"
}
]
}
```

name，keywords，subTitle 需要使用中文分词器categoryName，brandName 类型可以为keyword不同的商品其属性也不同，属性和商品之间存在关联关系。商品属性attrs不会频繁更新，可以选择使用nested类型

### 第 4 页

![Elasticsearch 教程配图（46-11 第4页 图1）](/中间件/elasticsearch/46-11/p04-page.png)

```
PUT product_db
{
"mappings": {
"properties": {
"id": {
"type": "long"
},
"name": {
"type": "text",
"analyzer": "ik_max_word"
},
"keywords": {
"type": "text",
"analyzer": "ik_max_word"
},
"subTitle": {
"type": "text",
"analyzer": "ik_max_word"
},
"salecount":{
"type": "long"
},
"putawayDate":{
"type": "date"
},
"price": {
"type": "double"
},
```

29"promotionPrice": {30"type": "keyword"31

```
},
"originalPrice": {
"type": "keyword"
},
"pic": {
"type": "keyword"
},
"sale": {
```

### 第 5 页

![Elasticsearch 教程配图（46-11 第5页 图1）](/中间件/elasticsearch/46-11/p05-page.png)

"type": "long"40

```
},
"hasStock": {
"type": "boolean"
},
"brandId": {
"type": "long"
},
"brandName": {
"type": "keyword"
},
"brandImg": {
"type": "keyword"
},
"categoryId": {
"type": "long"
},
"categoryName": {
"type": "keyword"
},
"attrs": {
"type": "nested",
"properties": {
"attrId": {
"type": "long"
},
"attrName": {
"type": "keyword"
},
"attrValue": {
"type": "keyword"
}
}
}
}
}
}
```

77

### 第 6 页

![Elasticsearch 教程配图（46-11 第6页 图1）](/中间件/elasticsearch/46-11/p06-page.png)

测试数据

### 第 7 页

![Elasticsearch 教程配图（46-11 第7页 图1）](/中间件/elasticsearch/46-11/p07-page.png)

```
PUT /product_db/_doc/1
{
"id": "26",
"name": "小米 11 手机",
"keywords": "小米手机",
"subTitle": "AI智慧全面屏 6GB +64GB 亮黑色 全网通版 移动联通电信4G手机 双卡双待 双卡双待",
"price": "3999",
"promotionPrice": "2999",
"originalPrice": "5999",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/xiaomi.jpg",
"sale": 999,
"hasStock": true,
"salecount":999,
"putawayDate":"2021-04-01",
"brandId": 6,
"brandName": "小米",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/1e34aef2a409119018a4c6258e39ecfb_222_222.png",

17"categoryId": 19,

18"categoryName": "手机通讯",

19"attrs": [20

```
{
"attrId": 1,
"attrName": "cpu",
"attrValue": "2核"
},
{
"attrId": 2,
"attrName": "颜色",
"attrValue": "黑色"
}
]
}
```

33

```
PUT /product_db/_doc/2
{
"id": "27",
"name": "小米 10 手机",
```

### 第 8 页

![Elasticsearch 教程配图（46-11 第8页 图1）](/中间件/elasticsearch/46-11/p08-page.png)

"keywords": "小米手机",

38"subTitle": "AI智慧全面屏 4GB +64GB 亮白色 全网通版 移动联通电信4G手机 双卡双待 双卡双待",

39"price": "2999",

40"promotionPrice": "1999",

41"originalPrice": "3999",

42"pic": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180615/xiaomi.jpg",

43"sale": 999,

44"hasStock": false,

45"salecount":99,

46"putawayDate":"2021-04-02",

47"brandId": 6,

48"brandName": "小米",

49"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/1e34aef2a409119018a4c6258e39ecfb_222_222.png",

50"categoryId": 19,

51"categoryName": "手机通讯",

52"attrs": [53

```
{
"attrId": 1,
"attrName": "cpu",
"attrValue": "4核"
},
{
"attrId": 2,
"attrName": "颜色",
"attrValue": "白色"
}
]
}
PUT /product_db/_doc/3
{
"id": "28",
"name": "小米  手机",
"keywords": "小米手机",
"subTitle": "AI智慧全面屏 4GB +64GB 亮蓝色 全网通版 移动联通电信4G手机 双卡双待 双卡双待",
"price": "2999",
"promotionPrice": "1999",
"originalPrice": "3999",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/xiaomi.jpg",
```

### 第 9 页

![Elasticsearch 教程配图（46-11 第9页 图1）](/中间件/elasticsearch/46-11/p09-page.png)

"sale": 999,

76"hasStock": true,

77"salecount":199,

78"putawayDate":"2021-04-03",

79"brandId": 6,

80"brandName": "小米",

81"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/1e34aef2a409119018a4c6258e39ecfb_222_222.png",

82"categoryId": 19,

83"categoryName": "手机通讯",

84"attrs": [85

```
{
"attrId": 1,
"attrName": "cpu",
"attrValue": "2核"
},
{
"attrId": 2,
"attrName": "颜色",
"attrValue": "蓝色"
}
]
}
PUT /product_db/_doc/4
{
"id": "29",
"name": "Apple iPhone 8 Plus 64GB 金色特别版 移动联通电信4G手机",
"keywords": "苹果手机",
"subTitle": "苹果手机 Apple产品年中狂欢节，好物尽享，美在智慧！速来 >> 勾选[保障服务][原厂
保2年]，获得AppleCare+全方位服务计划，原厂延保售后无忧。",
"price": "5999",
"promotionPrice": "4999",
"originalPrice": "7999",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/5acc5248N6a5f81cd.jpg",
"sale": 999,
"hasStock": true,
"salecount":1199,
"putawayDate":"2021-04-04",
"brandId": 51,
"brandName": "苹果",
```

### 第 10 页

![Elasticsearch 教程配图（46-11 第10页 图1）](/中间件/elasticsearch/46-11/p10-page.png)

"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180607/timg.jpg",

114"categoryId": 19,

115"categoryName": "手机通讯",

116"attrs": [117

```
{
"attrId": 1,
"attrName": "cpu",
"attrValue": "4核"
},
{
"attrId": 2,
"attrName": "颜色",
"attrValue": "金色"
}
]
}
PUT /product_db/_doc/5
{
"id": "30",
"name": "HLA海澜之家简约动物印花短袖T恤",
"keywords": "海澜之家衣服",
"subTitle": "HLA海澜之家短袖T恤",
"price": "199",
"promotionPrice": "99",
"originalPrice": "299",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/5ad83a4fN6ff67ecd.jpg!cc_350x449.jpg",
"sale": 999,
"hasStock": true,
"salecount":19,
"putawayDate":"2021-04-05",
"brandId": 50,
"brandName": "海澜之家",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/99d3279f1029d32b929343b09d3c72de_222_222.jpg",

146"categoryId": 8,

147"categoryName": "T恤",

148"attrs": [149

```
{
"attrId": 3,
```

### 第 11 页

![Elasticsearch 教程配图（46-11 第11页 图1）](/中间件/elasticsearch/46-11/p11-page.png)

"attrName": "尺寸",

152"attrValue": "M"153

```
},
{
"attrId": 4,
"attrName": "颜色",
"attrValue": "黑色"
}
]
}
PUT /product_db/_doc/6
{
"id": "31",
"name": "HLA海澜之家蓝灰花纹圆领针织布短袖T恤",
"keywords": "海澜之家衣服",
"subTitle": "HLA海澜之家短袖T恤",
"price": "299",
"promotionPrice": "199",
"originalPrice": "299",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/5ac98b64N70acd82f.jpg!cc_350x449.jpg",
"sale": 999,
"hasStock": true,
"salecount":399,
"putawayDate":"2021-04-06",
"brandId": 50,
"brandName": "海澜之家",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/99d3279f1029d32b929343b09d3c72de_222_222.jpg",

178"categoryId": 8,

179"categoryName": "T恤",

180"attrs": [181

```
{
"attrId": 3,
"attrName": "尺寸",
"attrValue": "X"
},
{
"attrId": 4,
"attrName": "颜色",
```

### 第 12 页

![Elasticsearch 教程配图（46-11 第12页 图1）](/中间件/elasticsearch/46-11/p12-page.png)

"attrValue": "蓝灰"190

```
}
]
}
PUT /product_db/_doc/7
{
"id": "32",
"name": "HLA海澜之家短袖T恤男基础款",
"keywords": "海澜之家衣服",
"subTitle": "HLA海澜之家短袖T恤",
"price": "269",
"promotionPrice": "169",
"originalPrice": "399",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/5a51eb88Na4797877.jpg",
"sale": 999,
"hasStock": true,
"salecount":399,
"putawayDate":"2021-04-07",
"brandId": 50,
"brandName": "海澜之家",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/99d3279f1029d32b929343b09d3c72de_222_222.jpg",

210"categoryId": 8,

211"categoryName": "T恤",

212"attrs": [213

```
{
"attrId": 3,
"attrName": "尺寸",
"attrValue": "L"
},
{
"attrId": 4,
"attrName": "颜色",
"attrValue": "蓝色"
}
]
}
PUT /product_db/_doc/8
{
```

### 第 13 页

![Elasticsearch 教程配图（46-11 第13页 图1）](/中间件/elasticsearch/46-11/p13-page.png)

"id": "33",

228"name": "小米（MI）小米电视4A ",

229"keywords": "小米电视机家用电器",

230"subTitle": "小米（MI）小米电视4A 55英寸 L55M5-AZ/L55M5-AD 2GB+8GB HDR 4K超高清 人工智能网络液晶平板电视",

231"price": "2269",

232"promotionPrice": "2169",

233"originalPrice": "2399",

234"pic": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180615/5b02804dN66004d73.jpg",

235"sale": 999,

236"hasStock": true,

237"salecount":132,

238"putawayDate":"2021-04-09",

239"brandId": 6,

240"brandName": "小米",

241"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/1e34aef2a409119018a4c6258e39ecfb_222_222.png",

242"categoryId": 35,

243"categoryName": "手机数码",

244"attrs": [245

```
{
"attrId": 5,
"attrName": "屏幕尺寸",
"attrValue": "52"
},
{
"attrId": 6,
"attrName": "机身颜色",
"attrValue": "黑色"
}
]
}
PUT /product_db/_doc/9
{
"id": "34",
"name": "小米（MI）小米电视4A 65英寸",
"keywords": "小米电视机家用电器",
"subTitle": "小米（MI）小米电视4A 65英寸 L55M5-AZ/L55M5-AD 2GB+8GB HDR 4K超高清 人工智能
网络液晶平板电视",
"price": "3269",
```

### 第 14 页

![Elasticsearch 教程配图（46-11 第14页 图1）](/中间件/elasticsearch/46-11/p14-page.png)

"promotionPrice": "3169",

265"originalPrice": "3399",

266"pic": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180615/5b028530N51eee7d4.jpg",

267"sale": 999,

268"hasStock": true,

269"salecount":999,

270"putawayDate":"2021-04-10",

271"brandId": 6,

272"brandName": "小米",

273"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/1e34aef2a409119018a4c6258e39ecfb_222_222.png",

274"categoryId": 35,

275"categoryName": "手机数码",

276"attrs": [277

```
{
"attrId": 5,
"attrName": "屏幕尺寸",
"attrValue": "65"
},
{
"attrId": 6,
"attrName": "机身颜色",
"attrValue": "金色"
}
]
}
PUT /product_db/_doc/10
{
"id": "35",
"name": "耐克NIKE 男子 休闲鞋 ROSHE RUN 运动鞋 511881-010黑色41码",
"keywords": "耐克运动鞋 鞋子",
"subTitle": "耐克NIKE 男子 休闲鞋 ROSHE RUN 运动鞋 511881-010黑色41码",
"price": "569",
"promotionPrice": "369",
"originalPrice": "899",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/5b235bb9Nf606460b.jpg",
"sale": 999,
"hasStock": true,
"salecount":399,
```

### 第 15 页

![Elasticsearch 教程配图（46-11 第15页 图1）](/中间件/elasticsearch/46-11/p15-page.png)

"putawayDate":"2021-04-11",

303"brandId": 58,

304"brandName": "NIKE",

305"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180615/timg(51).jpg",

306"categoryId": 29,

307"categoryName": "男鞋",

308"attrs": [309

```
{
"attrId": 7,
"attrName": "尺码",
"attrValue": "42"
},
{
"attrId": 8,
"attrName": "颜色",
"attrValue": "黑色"
}
]
}
PUT /product_db/_doc/11
{
"id": "36",
"name": "耐克NIKE 男子 气垫 休闲鞋 AIR MAX 90 ESSENTIAL 运动鞋 AJ1285-101白色41码",
"keywords": "耐克运动鞋 鞋子",
"subTitle": "AIR MAX 90 ESSENTIAL 运动鞋 AJ1285-101白色",
"price": "769",
"promotionPrice": "469",
"originalPrice": "999",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/5b19403eN9f0b3cb8.jpg",
"sale": 999,
"hasStock": true,
"salecount":499,
"putawayDate":"2021-04-13",
"brandId": 58,
"brandName": "NIKE",
"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20180615/timg
(51).jpg",
"categoryId": 29,
"categoryName": "男鞋",
```

### 第 16 页

![Elasticsearch 教程配图（46-11 第16页 图1）](/中间件/elasticsearch/46-11/p16-page.png)

"attrs": [341

```
{
"attrId": 7,
"attrName": "尺码",
"attrValue": "44"
},
{
"attrId": 8,
"attrName": "颜色",
"attrValue": "白色"
}
]
}
PUT /product_db/_doc/12
{
"id": "37",
"name": "(华为)HUAWEI MateBook X Pro 2019款 13.9英寸3K触控全面屏 轻薄笔记本",
"keywords": "轻薄笔记本华为 笔记本电脑",
"subTitle": "轻薄华为笔记本 电脑",
"price": "4769",
"promotionPrice": "4469",
"originalPrice": "4999",
"pic": "http://tuling-mall.oss-cn-
shenzhen.aliyuncs.com/tulingmall/images/20200317/800_800_1555752016264mp.png",
"sale": 999,
"hasStock": true,
"salecount":699,
"putawayDate":"2021-04-14",
"brandId": 3,
"brandName": "华为",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/17f2dd9756d9d333bee8e60ce8c03e4c_222_222.jpg",

370"categoryId": 19,

371"categoryName": "手机通讯",

372"attrs": [373

```
{
"attrId": 9,
"attrName": "容量",
"attrValue": "16G"
},
```

### 第 17 页

![Elasticsearch 教程配图（46-11 第17页 图1）](/中间件/elasticsearch/46-11/p17-page.png)

```
{
"attrId": 10,
"attrName": "网络",
"attrValue": "4G"
}
]
}
PUT /product_db/_doc/13
{
"id": "38",
"name": "华为nova6se 手机 绮境森林 全网通（8G+128G)",
"keywords": "轻薄笔记本华为 手机",
"subTitle": "华为nova6se 手机",
"price": "6769",
"promotionPrice": "6469",
"originalPrice": "6999",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180607/5ac1bf58Ndefaac16.jpg",
"sale": 999,
"hasStock": true,
"salecount":899,
"putawayDate":"2021-04-15",
"brandId": 3,
"brandName": "华为",
"brandImg": "http://macro-oss.oss-cn-
```

shenzhen.aliyuncs.com/mall/images/20190129/17f2dd9756d9d333bee8e60ce8c03e4c_222_222.jpg",

402"categoryId": 19,

403"categoryName": "手机通讯",

404"attrs": [405

```
{
"attrId": 9,
"attrName": "容量",
"attrValue": "64G"
},
{
"attrId": 10,
"attrName": "网络",
"attrValue": "5G"
}
]
```

### 第 18 页

![Elasticsearch 教程配图（46-11 第18页 图1）](/中间件/elasticsearch/46-11/p18-page.png)

```
}
PUT /product_db/_doc/14
{
"id": "39",
"name": "iPhone7/6s/8钢化膜苹果8Plus全屏复盖抗蓝光防窥防偷看手机膜",
"keywords": "手机膜",
"subTitle": "iPhone7/6s/8钢化膜苹果8Plus全屏复盖抗蓝光防窥防偷看手机膜",
"price": "29",
"promotionPrice": "39",
"originalPrice": "49",
"pic": "http://tuling-mall.oss-cn-
shenzhen.aliyuncs.com/tulingmall/images/20200311/6df99dab78bb2014.jpg",
"sale": 999,
"hasStock": true,
"salecount":799,
"putawayDate":"2021-04-16",
"brandId": 51,
"brandName": "苹果",
"brandImg": "http://tuling-mall.oss-cn-
shenzhen.aliyuncs.com/tulingmall/images/20200311/2b84746650fc122d67749a876c453619.png",
"categoryId": 30,
"categoryName": "手机配件",
"attrs": [
{
"attrId": 11,
"attrName": "手机膜-材料",
"attrValue": "钢化"
},
{
"attrId": 12,
"attrName": "手机膜-颜色",
"attrValue": "白色"
}
]
}
```

450

```
PUT /product_db/_doc/15
{
"id": "40",
"name": "七匹狼短袖T恤男纯棉舒适春夏修身运动休闲短袖三条装 圆领3条装",
"keywords": "七匹狼服装 衣服",
```

### 第 19 页

![Elasticsearch 教程配图（46-11 第19页 图1）](/中间件/elasticsearch/46-11/p19-page.png)

"subTitle": "七匹狼短袖T恤男纯棉舒适春夏修身运动休闲短袖三条装 圆领3条装",

456"price": "129",

457"promotionPrice": "139",

458"originalPrice": "149",

459"pic": "http://tuling-mall.oss-cn-shenzhen.aliyuncs.com/tulingmall/images/20200311/19e846e727dff337.jpg",

460"sale": 999,

461"hasStock": true,

462"salecount":199,

463"putawayDate":"2021-04-20",

464"brandId": 49,

465"brandName": "七匹狼",

466"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/18d8bc3eb13533fab466d702a0d3fd1f40345bcd.jpg",

467"categoryId": 8,

468"categoryName": "T恤",

469"attrs": [470

```
{
"attrId": 3,
"attrName": "尺寸",
"attrValue": "M"
},
{
"attrId": 4,
"attrName": "颜色",
"attrValue": "白色"
}
]
}
PUT /product_db/_doc/16
{
"id": "41",
"name": "华为P40 Pro手机",
"keywords": "华为手机",
"subTitle": "华为P40 Pro手机",
"price": "2129",
"promotionPrice": "2139",
"originalPrice": "2149",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180607/5ac1bf58Ndefaac16.jpg",
"sale": 999,
```

### 第 20 页

![Elasticsearch 教程配图（46-11 第20页 图1）](/中间件/elasticsearch/46-11/p20-page.png)

"hasStock": true,

494"salecount":199,

495"putawayDate":"2021-05-03",

496"brandId": 3,

497"brandName": "华为",

498"brandImg": "http://macro-oss.oss-cn-shenzhen.aliyuncs.com/mall/images/20190129/17f2dd9756d9d333bee8e60ce8c03e4c_222_222.jpg",

499"categoryId": 19,

500"categoryName": "手机通讯",

501"attrs": [502

```
{
"attrId": 9,
"attrName": "容量",
"attrValue": "128G"
},
{
"attrId": 10,
"attrName": "网络",
"attrValue": "5G"
}
]
}
PUT /product_db/_doc/17
{
"id": "42",
"name": "朵唯智能手机 4G全网通 老人学生双卡双待手机",
"keywords": "朵唯手机",
"subTitle": "朵唯手机后置双摄，国产虎贲芯片！优化散热结构！浅薄机身！朵唯4月特惠！",
"price": "3129",
"promotionPrice": "3139",
"originalPrice": "3249",
"pic": "http://macro-oss.oss-cn-
shenzhen.aliyuncs.com/mall/images/20180615/xiaomi.jpg",
"sale": 999,
"hasStock": true,
"salecount":1199,
"putawayDate":"2021-06-01",
"brandId": 59,
"brandName": "朵唯",
"brandImg": "http://tuling-mall.oss-cn-
shenzhen.aliyuncs.com/tulingmall/images/20200311/2b84746650fc122d67749a876c453619.png",
```

### 第 21 页

![Elasticsearch 教程配图（46-11 第21页 图1）](/中间件/elasticsearch/46-11/p21-page.png)

"categoryId": 19,

532"categoryName": "手机通讯",

533"attrs": [534

```
{
"attrId": 9,
"attrName": "容量",
"attrValue": "32G"
},
{
"attrId": 10,
"attrName": "网络",
"attrValue": "4G"
}
]
}
```

5473. 构建DSL语句实现商品搜索

### 第 22 页

![Elasticsearch 教程配图（46-11 第22页 图1）](/中间件/elasticsearch/46-11/p22-page.png)

```
POST /product_db/_doc/_search
{
"from": 0,
"size": 8,
"query": {
"bool": {
"must": [
{
"match": {
"name": {
"query": "手机"
}
}
}
],
"filter": [
{
"term": {
"hasStock": {
"value": true
}
}
},
{
"range": {
"price": {
"from": "1",
"to": "5000"
}
}
}
]
}
},"sort": [
{
"salecount": {
"order": "asc"
}
}
```

### 第 23 页

![Elasticsearch 教程配图（46-11 第23页 图1）](/中间件/elasticsearch/46-11/p23-page.png)

```
],
"aggregations": {
"brand_agg": {
"terms": {
"field": "brandId",
"size":
},
"aggregations": {
"brand_name_agg": {
"terms": {
"field": "brandName"
}
},
"brand_img_agg": {
"terms": {
"field": "brandImg"
}
}
}
},
"category_agg": {
"terms": {
"field": "categoryId",
"size": 50,
"min_doc_count":
},
"aggregations": {
"category_name_agg": {
"terms": {
"field": "categoryName"
}
}
}
},
"attr_agg": {
"nested": {
"path": "attrs"
},
"aggregations": {
"attr_id_agg": {
```

### 第 24 页

![Elasticsearch 教程配图（46-11 第24页 图1）](/中间件/elasticsearch/46-11/p24-page.png)

"terms": {80"field": "attrs.attrId"81

```
},
"aggregations": {
"attr_name_agg": {
"terms": {
"field": "attrs.attrName"
}
},
"attr_value_agg": {
"terms": {
"field": "attrs.attrValue"
}
}
}
}
}
}
},
"highlight": {
"pre_tags": [
"<b style='color:red'>"
],
"post_tags": [
"</b>"
],
"fields": {
"name": {}
}
}
}
```

111

112

### 第 25 页

![Elasticsearch 教程配图（46-11 第25页 图1）](/中间件/elasticsearch/46-11/p25-page.png)

```
GET product_db/_search
{
"from": 0,
"size": 20,
"query": {
"bool": {
"must": [
{
"multi_match": {
"query": "手机",
"fields": [
"name",
"keywords",
"subTitle"
]
}
}
],
"filter": [
{
"term": {
"hasStock": "true"
}
},
{
"range": {
"price": {
"gte": 2000,
"lte":
}
}
}
]
}
},
"aggs": {
"brandId_aggs": {
"terms": {
"field": "brandId",
```

### 第 26 页

![Elasticsearch 教程配图（46-11 第26页 图1）](/中间件/elasticsearch/46-11/p26-page.png)

"size": 1040

```
},
"aggs": {
"brandName_aggs": {
"terms": {
"field": "brandName"
}
},
"brandImg_aggs": {
"terms": {
"field": "brandImg"
}
}
}
},
"categoryId_aggs": {
"terms": {
"field": "categoryId",
"size":
},
"aggs": {
"categoryName_aggs": {
"terms": {
"field": "categoryName"
}
}
}
},
"attrs_aggs": {
"nested": {
"path": "attrs"
},
"aggs": {
"attrId_aggs": {
"terms": {
"field": "attrs.attrId"
},
"aggs": {
"attrName_aggs": {
"terms": {
```

### 第 27 页

![Elasticsearch 教程配图（46-11 第27页 图1）](/中间件/elasticsearch/46-11/p27-page.png)

- 1）引入依赖"field": "attrs.attrName"80

```
}
},
"attrValue_aggs": {
"terms": {
"field": "attrs.attrValue"
}
}
}
}
}
}
},
"sort": [
{
"salecount": {
"order": "desc"
}
}
],
"highlight": {
"fields": {
"*": {}
}
}
}
```

4. 微服务实现商品搜索功能

```
<dependency>
```

\<\g\r\o\u\p\I\d\>\org.springframework.boot\<\/\g\r\o\u\p\I\d\>\2\<\a\r\t\i\f\a\c\t\I\d\>\spring-boot-starter-data-elasticsearch\<\/\a\r\t\i\f\a\c\t\I\d\>\3

```
</dependency>
```

### 第 28 页

![Elasticsearch 教程配图（46-11 第28页 图1）](/中间件/elasticsearch/46-11/p28-page.png)

- 2）核心代码

### 第 29 页

![Elasticsearch 教程配图（46-11 第29页 图1）](/中间件/elasticsearch/46-11/p29-page.png)

1

```
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldSort;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.SortOptionsBuilders;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.aggregations.*;
```

8

```
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
```

12

```
import co.elastic.clients.elasticsearch.core.search.*;
import co.elastic.clients.json.JsonData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
```

17

```
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.tuling.tlmall_search.common.SearchConstant;
import org.tuling.tlmall_search.domain.EsProduct;
import org.tuling.tlmall_search.service.TulingMallSearchService;
import org.tuling.tlmall_search.vo.ESRequestParam;
import org.tuling.tlmall_search.vo.ESResponseResult;
```

25

```
import java.util.*;
import java.util.stream.Collectors;
```

28

29@Service(value = "tulingMallSearchService")30

```
public class TulingMallSearchServiceImpl implements TulingMallSearchService {
```

32

33@Qualifier("elasticsearchClient")34@Autowired35ElasticsearchClient client;36

37

38/**************************图灵商城搜索*****************************/39

### 第 30 页

![Elasticsearch 教程配图（46-11 第30页 图1）](/中间件/elasticsearch/46-11/p30-page.png)

@Override40

```
public ESResponseResult search(ESRequestParam param) {
```

42try {43//1、构建检索对象-封装请求相关参数信息44SearchRequest searchRequest = startBuildRequestParam(param);45

46//2、进行检索操作47SearchResponse response = client.search(searchRequest, EsProduct.class);48System.out.println("response:" + response);49//3、分析响应数据，封装成指定的格式50ESResponseResult responseResult = startBuildResponseResult(response,

param);51return responseResult;52} catch (Exception e) {53e.printStackTrace();54

```
}
```

56return null;57

58

```
}
```

60/**61* 封装请求参数信息62* 关键字查询、根据属性、分类、品牌、价格区间、是否有库存等进行过滤、分页、高亮、以及聚合统计品牌分类属性63* price=1_5000&keyword=手机&sort=salecount_asc&hasStock=1&pageNum=1&pageSize=20&categoryId=19&attrs=2_蓝色&attrs=1_2核64*/65

```
private SearchRequest startBuildRequestParam(ESRequestParam param) {
```

67//构建搜索请求68SearchRequest.Builder searchRequestBuilder = new SearchRequest.Builder();69

70/**71* 关键字查询、根据属性、分类、品牌、价格区间、是否有库存等进行过滤、分页、高亮、以及聚合统计品牌分类属性72*/73

74//构建bool查询75BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder();76

### 第 31 页

![Elasticsearch 教程配图（46-11 第31页 图1）](/中间件/elasticsearch/46-11/p31-page.png)

77//1、查询关键字78if (!StringUtils.isEmpty(param.getKeyword())) {79//单字段查询80//            boolQueryBuilder.must(QueryBuilders.match(81//                    m->m.field("name").query(param.getKeyword())82//            ));83//多字段查询84boolQueryBuilder.must(m->m.multiMatch(85q->q.fields("name", "keywords",

"subTitle").query(param.getKeyword())86));87

```
}
//2、根据类目ID进行过滤
if (null != param.getCategoryId()) {
```

boolQueryBuilder.filter(QueryBuilders.term(t ->t.field("categoryId").value(param.getCategoryId())));91

92

```
}
```

94//3、根据品牌ID进行过滤95if (null != param.getBrandId() && param.getBrandId().size() > 0) {96List\<\F\i\e\l\d\V\a\l\u\e\>\ brandIds = param.getBrandId().stream().map(b ->FieldValue.of(b)).collect(Collectors.toList());97boolQueryBuilder.filter(QueryBuilders.terms(t ->t.field("brandId").terms(v -> v.value(brandIds))));98

```
}
```

100//4、根据属性进行相关过滤101if (param.getAttrs() != null && param.getAttrs().size() > 0) {102

103param.getAttrs().forEach(item -> {104//attrs=1_白色&2_4核105BoolQuery.Builder boolQuery = QueryBuilders.bool();106

107//attrs=1_64G108String[] s = item.split("_");109String attrId = s[0];110String[] attrValues = s[1].split(":");//这个属性检索用的值111

112boolQuery.filter(QueryBuilders.term(t ->t.field("attrs.attrId").value(attrId)));113

### 第 32 页

![Elasticsearch 教程配图（46-11 第32页 图1）](/中间件/elasticsearch/46-11/p32-page.png)

114List\<\F\i\e\l\d\V\a\l\u\e\>\ attrValueList = Arrays.stream(attrValues).map(b ->FieldValue.of(b)).collect(Collectors.toList());115boolQuery.filter(QueryBuilders.terms(t ->t.field("attrs.attrValue").terms(v -> v.value(attrValueList))));116

117NestedQuery.Builder nestedQueryBuilder = new NestedQuery.Builder();118//nested查询119nestedQueryBuilder.path("attrs").query(q ->q.bool(boolQuery.build())).scoreMode(ChildScoreMode.None);120

121boolQueryBuilder.filter(q -> q.nested(nestedQueryBuilder.build()));122});123

124

```
}
```

126//5、是否有库存127if (null != param.getHasStock()) {128boolQueryBuilder.filter(QueryBuilders.term(t ->t.field("hasStock").value(param.getHasStock() == 1)));129

```
}
```

131

132//6、根据价格过滤133if (!StringUtils.isEmpty(param.getPrice())) {134//价格的输入形式为：10_100（起始价格和最终价格）或_100（不指定起始价格）或10_（不限制最终价格）135RangeQuery.Builder rangeQueryBuilder =QueryBuilders.range().field("price");136

137String[] price = param.getPrice().split("_");138if (price.length == 2) {139//price: _5000   [, 5000]140if (param.getPrice().startsWith("_")) {141rangeQueryBuilder.lte(JsonData.of(price[1]));142} else {143//price: 1_5000  [1, 5000]144

rangeQueryBuilder.gte(JsonData.of(price[0])).lte(JsonData.of(price[1]));145

```
}
```

147} else if (price.length == 1) {148//price: 1_     [1]149

### 第 33 页

![Elasticsearch 教程配图（46-11 第33页 图1）](/中间件/elasticsearch/46-11/p33-page.png)

if (param.getPrice().endsWith("_")) {150rangeQueryBuilder.gte(JsonData.of(price[0]));151

```
}
}
```

boolQueryBuilder.filter(r -> r.range(rangeQueryBuilder.build()));154

```
}
```

156//封装所有查询条件157searchRequestBuilder.query(q -> q.bool(boolQueryBuilder.build()));158

159

160/**161* 实现排序、高亮、分页操作162*/163

164//排序165//页面传入的参数值形式 sort=price_asc/desc166if (!StringUtils.isEmpty(param.getSort())) {167String sort = param.getSort();168String[] sortFileds = sort.split("_");169

170if (!StringUtils.isEmpty(sortFileds[0])) {171

172SortOrder sortOrder = "asc".equalsIgnoreCase(sortFileds[1]) ?

SortOrder.Asc : SortOrder.Desc;173

174//排序175FieldSort fieldSort =SortOptionsBuilders.field().field(sortFileds[0]).order(sortOrder).build();176searchRequestBuilder.sort(s -> s.field(fieldSort));177

```
}
}
```

180

181//分页查询182searchRequestBuilder.from((param.getPageNum() - 1) * SearchConstant.PAGE_SIZE);183searchRequestBuilder.size(SearchConstant.PAGE_SIZE);184

185//高亮显示186if (!StringUtils.isEmpty(param.getKeyword())) {187

188

### 第 34 页

![Elasticsearch 教程配图（46-11 第34页 图1）](/中间件/elasticsearch/46-11/p34-page.png)

HighlightField highlightField = new HighlightField.Builder().preTags("\<\b\s\t\y\l\e\=\'\c\o\l\o\r\:\r\e\d\'\>\").postTags("\<\/\b\>\").build();189searchRequestBuilder.highlight(h -> h.fields("name", highlightField));190

```
}
```

192

193/**194* 对品牌、分类信息、属性信息进行聚合分析195*/196//1. 按照品牌进行聚合197//1.1 品牌的子聚合-品牌名聚合198Aggregation brand_name_agg = AggregationBuilders.terms(t ->t.field("brandName").size(1));199//1.2 品牌的子聚合-品牌图片聚合200Aggregation brand_img_agg = AggregationBuilders.terms(t ->t.field("brandImg").size(1));201

202Aggregation brand_agg = new Aggregation.Builder()203//按照品牌id进行聚合204.terms(t -> t.field("brandId").size(50)).aggregations("brand_name_agg",

brand_name_agg).aggregations("brand_img_agg", brand_img_agg).build();205searchRequestBuilder.aggregations("brand_agg", brand_agg);206

207//2. 按照分类信息进行聚合208Aggregation category_agg = new Aggregation.Builder().terms(t ->t.field("categoryId").size(50)).aggregations("category_name_agg",

AggregationBuilders.terms(t -> t.field("categoryName").size(1))).build();209searchRequestBuilder.aggregations("category_agg", category_agg);210

211

212//2. 按照属性信息进行聚合213NestedAggregation attrs = newNestedAggregation.Builder().path("attrs").build();214

215Aggregation attr_id_agg = new Aggregation.Builder()216//2.1 按照属性ID进行聚合217.terms(t -> t.field("attrs.attrId"))218//2.1.1 在每个属性ID下，按照属性名进行聚合219.aggregations("attr_name_agg", AggregationBuilders.terms(t ->t.field("attrs.attrName").size(1)))220//2.1.1 在每个属性ID下，按照属性值进行聚合221.aggregations("attr_value_agg", AggregationBuilders.terms(t ->t.field("attrs.attrValue").size(1))).build();222

### 第 35 页

![Elasticsearch 教程配图（46-11 第35页 图1）](/中间件/elasticsearch/46-11/p35-page.png)

223Aggregation attrs_agg = newAggregation.Builder().nested(attrs).aggregations("attr_id_agg", attr_id_agg).build();224

225searchRequestBuilder.aggregations("attrs_agg", attrs_agg);226

227System.out.println("构建的DSL语句:" + searchRequestBuilder.toString());228

229

230SearchRequest searchRequest =searchRequestBuilder.index(SearchConstant.INDEX_NAME).build();231

232return searchRequest;233

```
}
```

235

236/**237* 封装查询到的结果信息238* 关键字查询、根据属性、分类、品牌、价格区间、是否有库存等进行过滤、分页、高亮、以及聚合统计品牌分类属性239*/240

```
private ESResponseResult startBuildResponseResult(SearchResponse response,
ESRequestParam param) {
//构建返回结果
```

ESResponseResult result = new ESResponseResult();243

244//1、获取查询到的商品信息245HitsMetadata\<\E\s\P\r\o\d\u\c\t\>\ hitsMetadata = response.hits();246List\<\H\i\t\<\E\s\P\r\o\d\u\c\t\>\> hits = hitsMetadata.hits();247

248List\<\E\s\P\r\o\d\u\c\t\>\ esProducts = new ArrayList<>();249//2、遍历所有商品信息250if (!hits.isEmpty()) {251for (Hit\<\E\s\P\r\o\d\u\c\t\>\ hit : hits) {252EsProduct product = hit.source();253

254//2.1 判断是否按关键字检索，若是就显示高亮，否则不显示255if (!StringUtils.isEmpty(param.getKeyword())) {256//2.2 拿到高亮信息显示标题257List\<\S\t\r\i\n\g\>\ name = hit.highlight().get("name");258//2.3 判断name中是否含有查询的关键字(因为是多字段查询，因此可能不包含指定的关键字，假设不包含则显示原始name字段的信息)259

### 第 36 页

![Elasticsearch 教程配图（46-11 第36页 图1）](/中间件/elasticsearch/46-11/p36-page.png)

String nameValue = name != null ? name.get(0) : product.getName();260product.setName(nameValue);261

```
}
```

esProducts.add(product);263

264

```
}
}
```

result.setProducts(esProducts);267

268//3、当前商品涉及到的所有品牌信息，小米手机和小米电脑都属于小米品牌，过滤重复品牌信息269List\<\E\S\R\e\s\p\o\n\s\e\R\e\s\u\l\t\.\B\r\a\n\d\V\o\>\ brandVos = new ArrayList<>();270

271// 获取聚合结果272Map\<\S\t\r\i\n\g\,\ \A\g\g\r\e\g\a\t\e\>\ aggs = response.aggregations();273//获取到品牌的聚合274Aggregate brandAgg = aggs.get("brand_agg");275if (brandAgg != null) {276List\<\L\o\n\g\T\e\r\m\s\B\u\c\k\e\t\>\ brandIdBuckets = brandAgg.lterms().buckets().array();277for (LongTermsBucket brandIdBucket : brandIdBuckets) {278//构建品牌信息279ESResponseResult.BrandVo brandVo = new ESResponseResult.BrandVo();280//设置品牌ID281brandVo.setBrandId(brandIdBucket.key());282

283Aggregate brandImgAgg =brandIdBucket.aggregations().get("brand_img_agg");284Aggregate brandNameAgg =brandIdBucket.aggregations().get("brand_name_agg");285if (brandImgAgg != null && brandNameAgg != null) {286StringTermsBucket imgBucket =brandImgAgg.sterms().buckets().array().get(0);287StringTermsBucket nameBucket =brandNameAgg.sterms().buckets().array().get(0);288//设置品牌的图片和名称289brandVo.setBrandImg(imgBucket.key().stringValue());290brandVo.setBrandName(nameBucket.key().stringValue());291

```
}
```

brandVos.add(brandVo);293

```
}
}
```

result.setBrands(brandVos);296

297

### 第 37 页

![Elasticsearch 教程配图（46-11 第37页 图1）](/中间件/elasticsearch/46-11/p37-page.png)

298//4、当前商品相关的所有类目信息299//获取到分类的聚合300List\<\E\S\R\e\s\p\o\n\s\e\R\e\s\u\l\t\.\c\a\t\e\g\o\r\y\V\o\>\ categoryVos = new ArrayList<>();301

302Aggregate categoryAgg = aggs.get("category_agg");303if (categoryAgg != null) {304List\<\L\o\n\g\T\e\r\m\s\B\u\c\k\e\t\>\ categoryBuckets =categoryAgg.lterms().buckets().array();305for (LongTermsBucket categoryBucket : categoryBuckets) {306//构建分类信息307ESResponseResult.categoryVo categoryVo = newESResponseResult.categoryVo();308//设置分类ID309categoryVo.setCategoryId(categoryBucket.key());310

311Aggregate categoryNameAgg =categoryBucket.aggregations().get("category_name_agg");312if (categoryNameAgg != null) {313StringTermsBucket nameBucket =categoryNameAgg.sterms().buckets().array().get(0);314//设置分类名称315categoryVo.setCategoryName(nameBucket.key().stringValue());316

```
}
```

categoryVos.add(categoryVo);318

```
}
}
```

result.setCategorys(categoryVos);321

322

323//5、获取商品相关的所有属性信息324List\<\E\S\R\e\s\p\o\n\s\e\R\e\s\u\l\t\.\A\t\t\r\V\o\>\ attrVos = new ArrayList<>();325//获取属性信息的聚合326Aggregate attrsAgg = aggs.get("attrs_agg");327if (attrsAgg != null) {328//获取属性id的集合329Aggregate attrIdAgg = attrsAgg.nested().aggregations().get("attr_id_agg");330List\<\L\o\n\g\T\e\r\m\s\B\u\c\k\e\t\>\ attrBuckets = attrIdAgg.lterms().buckets().array();331for (LongTermsBucket attrBucket : attrBuckets) {332//构建属性信息333ESResponseResult.AttrVo attrVo = new ESResponseResult.AttrVo();334//设置属性ID335

### 第 38 页

![Elasticsearch 教程配图（46-11 第38页 图1）](/中间件/elasticsearch/46-11/p38-page.png)

attrVo.setAttrId(attrBucket.key());336

337Aggregate attrNameAgg = attrBucket.aggregations().get("attr_name_agg");338Aggregate attrValueAgg =attrBucket.aggregations().get("attr_value_agg");339if (attrNameAgg != null && attrValueAgg != null) {340StringTermsBucket attrNameBucket =attrNameAgg.sterms().buckets().array().get(0);341//设置属性名称342attrVo.setAttrName(attrNameBucket.key().stringValue());343

344List\<\S\t\r\i\n\g\T\e\r\m\s\B\u\c\k\e\t\>\ attrValueBuckets =attrValueAgg.sterms().buckets().array();345List\<\S\t\r\i\n\g\>\ attrValues = new ArrayList<>();346for (StringTermsBucket attrValueBucket : attrValueBuckets) {347attrValues.add(attrValueBucket.key().stringValue());348

```
}
//设置属性值
```

attrVo.setAttrValue(attrValues);351

```
}
```

attrVos.add(attrVo);353

```
}
}
```

result.setAttrs(attrVos);356

357//6、进行分页操作358result.setPageNum(param.getPageNum());359//获取总记录数360long total = hitsMetadata.total().value();361result.setTotal(total);362

363//计算总页码364int totalPages = (int) total % SearchConstant.PAGE_SIZE == 0 ? (int) total /SearchConstant.PAGE_SIZE : ((int) total / SearchConstant.PAGE_SIZE + 1);365result.setTotalPages(totalPages);366

367List\<\I\n\t\e\g\e\r\>\ pageNavs = new ArrayList<>();368for (int i = 1; i <= totalPages; i++) {369pageNavs.add(i);370

```
}
```

result.setPageNavs(pageNavs);372

373

### 第 39 页

![Elasticsearch 教程配图（46-11 第39页 图1）](/中间件/elasticsearch/46-11/p39-page.png)

测试

return result;374

```
}
```

376

```
}
```

378

379

380

381

382http://localhost:8054/searchList?price=1_5000&keyword=%E6%89%8B%E6%9C%BA&sort=salecount_asc&hasStock=1&pageNum=1&pageSize=20&categoryId=19&attrs=2_%E8%93%9D%E8%89%B2&attrs=1_2%E6%A0%B8

---

## 小结

- 本篇为 Elasticsearch 系列第 6/10 篇，主题：**Spring Boot 整合 ES 与商品搜索实战**。
- 建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。
- 系列文章路径前缀：`/中间件/elasticsearch/`。

下一篇：[《深度分页问题与自定义分词》](/中间件/elasticsearch/es-07-pagination-analyzer)
