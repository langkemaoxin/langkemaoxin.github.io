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


### 第 1 页

![Elasticsearch 教程配图（46-2 第1页 图1）](/中间件/elasticsearch/46-2/p01-01.png)

随着企业信息化进程的加速，日志数据量急剧增加且来源多样、格式复杂，传统的日志管理方式已难以满足需求。

ELK（Elasticsearch、Logstash、Kibana）的引入，正是为了应对这些挑战。ELK通过其强大的分布式搜索能力（Elasticsearch）、灵活的数据采集与处理功能（Logstash）、以及直观的数据可视化界面（Kibana），提供了高效、实时、可扩展且易用的日志管理解决方案，帮助企业和开发人员更有效地管理和分析日志数据，从而提高工作效率和问题解决速度。

以下是使用ELK的主要原因：

1. 为什么要使用 ELK集中化管理与高效检索日志：

在大型分布式系统中，ELK通过构建集中式日志系统，实现所有节点上日志的统一收集、管理和访问，提高定位问题的效率。

Elasticsearch提供强大的检索特性，能够快速查询问题日志，显著提升运维人员的工作效率。

全面的日志分析与系统监控：

ELK能够管理和分析包括系统日志、应用程序日志和安全日志在内的多种日志，帮助系统运维和开发人员了解服务器软硬件信息、检查配置错误及其原因。

1.

2.

### 第 2 页

![Elasticsearch 教程配图（46-2 第2页 图1）](/中间件/elasticsearch/46-2/p02-page.png)

ELK架构分为两种，一种是经典的ELK，另外一种是加上消息队列（Redis或Kafka或RabbitMQ）和Nginx结构。

组成：经典的ELK架构主要由Filebeat + Logstash + Elasticsearch + Kibana组成。在早期，ELK架构可能仅包含Logstash + Elasticsearch + Kibana，但随着技术的发展，Filebeat因其轻量级和高效性逐渐被引入作为日志收集工具。

特点：

适用场景：经典的ELK架构主要适用于数据量较小的开发环境。然而，由于缺少消息队列的缓冲机制，当Logstash或Elasticsearch出现故障时，可能存在数据丢失的风险。

组成：在经典的ELK架构基础上，整合消息队列（如Redis、Kafka、RabbitMQ）和Nginx，形成更为复杂的架构。

特点：

适用场景：整合消息队列+Nginx的架构主要适用于生产环境，特别是需要处理大数据量的场景。它能够确保数据的安全性和完整性，同时提供高性能的日志处理和可视化分析服务。

通过分析和监控日志，可以及时了解服务器的负荷、性能和安全性，从而及时采取措施纠正错误。

直观的数据可视化与理解：

Kibana为Elasticsearch提供Web可视化界面，可以生成各种维度表格、图形，使复杂的日志数据可视化。

可视化界面帮助用户更直观地理解和分析数据，进一步提升日志分析和系统监控的效果。

2. ELK的整体架构分析2.1 经典的ELK日志收集：Filebeat作为轻量级的日志收集代理，部署在客户端上，消耗资源少，能够高效地收集日志数据。

数据处理：Logstash作为数据处理管道，负责将Filebeat收集的日志数据进行过滤、转换等操作，然后发送到Elasticsearch进行存储。

存储与搜索：Elasticsearch是一个基于Lucene的分布式搜索和分析引擎，提供强大的数据存储和搜索能力。

可视化：Kibana为Elasticsearch提供Web可视化界面，允许用户通过图表、仪表盘等方式直观地查看和分析日志数据。

2.2 整合消息队列+Nginx的ELK架构消息队列：引入消息队列作为缓冲机制，确保即使在Logstash或Elasticsearch出现故障时，日志数据也不会丢失。消息队列能够均衡网络传输，降低数据丢失的可能性。

Nginx：Nginx作为高性能的Web和反向代理服务器，可以进一步优化整个系统的性能和可用性。它可以在负载均衡、缓存等方面发挥作用，提升用户访问体验。

扩展性：由于引入了消息队列和Nginx等组件，整个架构的扩展性得到增强。可以根据实际需求动态调整各组件的资源分配和部署规模。

3.

### 第 3 页

![Elasticsearch 教程配图（46-2 第3页 图1）](/中间件/elasticsearch/46-2/p03-page.png)

Logstash 是免费且开放的服务器端数据处理管道，能够从多个来源采集数据，转换数据，然后将数据发送到您最喜欢的存储库中。

应用场景：ETL工具 / 数据采集处理引擎

PipelineLogstash EventCodec (Code / Decode)将原始数据decode成Event;将Event encode成目标数据

Logstash通过管道完成数据的采集与处理，管道配置中包含input、output和filter（可选）插件，input和output用来配置输入和输出数据源、filter用来对数据进行过滤或预处理。

3. 数据处理管道Logstash详解Logstash的概述https://www.elastic.co/cn/logstash/Logstash的工作原理分析Logstash核心概念包含了input—filter—output三个阶段的处理流程插件生命周期管理队列管理数据在内部流转时的具体表现形式。数据在input 阶段被转换为Event，在 output被转化成目标格式数据Event 其实是一个Java Object，在配置文件中，可以对Event 的属性进行增删改查Logstash数据传输原理数据采集与输入：Logstash支持各种输入选择，能够以连续的流式传输方式，轻松地从日志、指标、Web应用以及数据存储中采集数据。

实时解析和数据转换：通过Logstash过滤器解析各个事件，识别已命名的字段来构建结构，并将它们转换成通用格式，最终将数据从源端传输到存储库中。

存储与数据导出：Logstash提供多种输出选择，可以将数据发送到指定的地方。

1.

2.

3.

### 第 4 页

![Elasticsearch 教程配图（46-2 第4页 图1）](/中间件/elasticsearch/46-2/p04-page.png)

logstash官方文档:

- 1）下载并解压logstash下载地址：

选择版本：8.14.3

- 2）测试：运行最基本的logstash管道

测试结果：

参考：

Logstash的管道配置文件对每种类型的插件都提供了一个单独的配置部分，用于处理管道事件。

Logstash的安装与配置Logstash安装https://www.elastic.co/guide/en/logstash/8.14/installing-logstash.htmlhttps://www.elastic.co/cn/downloads/past-releases#logstash

```
#下载Logstash
#windows
https://artifacts.elastic.co/downloads/logstash/logstash-8.14.3-windows-x86_64.zip
#linux
https://artifacts.elastic.co/downloads/logstash/logstash-8.14.3-linux-x86_64.tar.gz
cd logstash-8.14.3
#linux
#-e选项表示，直接把配置放在命令中，这样可以有效快速进行测试
bin/logstash -e 'input { stdin { } } output { stdout {} }'
#windows
```

.\bin\logstash.bat -e "input { stdin { } } output { stdout {} }"6Logstash的配置https://www.elastic.co/guide/en/logstash/8.14/configuration.html

### 第 5 页

![Elasticsearch 教程配图（46-2 第5页 图1）](/中间件/elasticsearch/46-2/p05-page.png)

每个配置部分可以包含一个或多个插件。例如，指定多个filter插件，Logstash会按照它们在配置文件中出现的顺序进行处理。

测试效果

Input Plugins

一个 Pipeline可以有多个input插件

```
input {
stdin { }
}
```

4

```
filter {
grok {
match => { "message" => "%{COMBINEDAPACHELOG}" }
}
date {
match => [ "timestamp" , "dd/MMM/yyyy:HH:mm:ss Z" ]
}
}
```

13

```
output {
elasticsearch {
index => "logstash-demo"
hosts => ["localhost:9200"]
}
stdout { codec => rubydebug }
}
#运行
bin/logstash -f logstash-demo.conf
```

Loginstash插件https://www.elastic.co/guide/en/logstash/8.14/input-plugins.htmlStdin / File

### 第 6 页

![Elasticsearch 教程配图（46-2 第6页 图1）](/中间件/elasticsearch/46-2/p06-page.png)

Filter Plugins

Filter Plugin可以对Logstash Event进行各种处理，例如解析，删除字段，类型转换

Output Plugins

将Event发送到特定的目的地，是 Pipeline 的最后一个阶段。

常见 Output Plugins：

Codec Plugins

将原始数据decode成Event;将Event encode成目标数据内置的Codec Plugins:

Codec Plugin测试Beats / Log4J /Elasticsearch / JDBC / Kafka /Rabbitmq /RedisJMX/ HTTP / Websocket / UDP / TCPGoogle Cloud Storage / S3Github / Twitterhttps://www.elastic.co/guide/en/logstash/8.14/filter-plugins.htmlDate: 日期解析Dissect: 分割符解析Grok: 正则匹配解析Mutate: 对字段做各种操作Convert : 类型转换Gsub : 字符串替换Split / Join /Merge: 字符串切割，数组合并字符串，数组合并数组Rename: 字段重命名Update / Replace: 字段内容更新替换Remove_field: 字段删除Ruby: 利用Ruby 代码来动态修改Eventhttps://www.elastic.co/guide/en/logstash/8.14/output-plugins.htmlElasticsearchEmail / PagedutyInfluxdb / Kafka / Mongodb / Opentsdb / ZabbixHttp / TCP / Websockethttps://www.elastic.co/guide/en/logstash/8.14/codec-plugins.htmlLine / MultilineJSON / Avro / Cef (ArcSight Common Event Format)Dots / Rubydebug

### 第 7 页

![Elasticsearch 教程配图（46-2 第7页 图1）](/中间件/elasticsearch/46-2/p07-page.png)

Codec Plugin —— Multiline设置参数:

```
# single line
bin/logstash -e "input{stdin{codec=>line}}output{stdout{codec=> rubydebug}}"
```

3pattern: 设置行匹配的正则表达式what : 如果匹配成功，那么匹配行属于上一个事件还是下一个事件previous / nextnegate : 是否对pattern结果取反true / false

### 第 8 页

![Elasticsearch 教程配图（46-2 第8页 图1）](/中间件/elasticsearch/46-2/p08-page.png)

进程Crash，机器宕机，都会引起数据的丢失机器宕机，数据也不会丢失; 数据保证会被消费; 可以替代 Kafka等消息队列缓冲区的作用

```
# 多行数据，异常
```

Exception in thread "main" java.lang.NullPointerException2at com.example.myproject.Book.getTitle(Book.java:16)3at com.example.myproject.Author.getBookTitles(Author.java:25)4at com.example.myproject.Bootstrap.main(Bootstrap.java:14)5

6

7

```
#vim multiline-exception.conf
input {
stdin {
codec => multiline {
pattern => "^\s"
what => "previous"
}
}
}
```

17

```
filter {}
```

19

```
output {
stdout { codec => rubydebug }
}
```

23

```
#执行管道
bin/logstash -f multiline-exception.conf
```

Logstash QueueIn Memory QueuePersistent Queue

```
# pipelines.yml
queue.type: persisted (默认是memory)
queue.max_bytes: 4gb
```

### 第 9 页

![Elasticsearch 教程配图（46-2 第9页 图1）](/中间件/elasticsearch/46-2/p09-page.png)

将数据库中的数据同步到ES，借助ES的全文搜索,提高搜索速度借助JDBC Input Plugin将数据从数据库读到Logstash拓展：

- 1）拷贝jdbc依赖到logstash-8.14.3/drivers（自定义的）目录下2）准备mysql-demo.conf配置文件实践练习：同步mysql数据到Elasticsearch需求分析需要把新增用户信息同步到Elasticsearch中用户信息Update 后，需要能被更新到Elasticsearch支持增量更新用户注销后，不能被ES所搜索到实现思路需要自己提供所需的 JDBC Driver；

JDBC Input Plugin 支持定时任务 Scheduling，其语法来自 Rufus-scheduler，其扩展了 Cron，使用 Cron 的语法可以完成任务的触发；

JDBC Input Plugin 支持通过 Tracking_column / sql_last_value 的方式记录 State，最终实现增量的更新；

官方文档：

Jdbc input plugin如何保证Mysql数据库到ES的数据一致性JDBC Input Plugin实现步骤

### 第 10 页

![Elasticsearch 教程配图（46-2 第10页 图1）](/中间件/elasticsearch/46-2/p10-page.png)

- 3）运行logstash

```
input {
jdbc {
jdbc_driver_library => "/home/fox/logstash-8.14.3/driver/mysql-connector-java-
```

5.1.49.jar"3jdbc_driver_class => "com.mysql.jdbc.Driver"4jdbc_connection_string => "jdbc:mysql://localhost:3306/test?useSSL=false"5jdbc_user => "root"6jdbc_password => "123456"7

```
#启用追踪，如果为true，则需要指定tracking_column
use_column_value => true
#指定追踪的字段，
tracking_column => "last_updated"
#追踪字段的类型，目前只有数字(numeric)和时间类型(timestamp)，默认是数字类型
tracking_column_type => "numeric"
#记录最后一次运行的结果
record_last_run => true
#上面运行结果的保存位置
last_run_metadata_path => "jdbc-position.txt"
statement => "SELECT * FROM user where last_updated >:sql_last_value;"
schedule => " * * * * * *"
}
}
output {
elasticsearch {
document_id => "%{id}"
document_type => "_doc"
index => "users"
hosts => ["http://localhost:9200"]
username: "elastic"
password: "123456"
}
stdout{
codec => rubydebug
}
}
```

### 第 11 页

![Elasticsearch 教程配图（46-2 第11页 图1）](/中间件/elasticsearch/46-2/p11-page.png)

测试

```
bin/logstash -f mysql-demo.conf
#user表
```

CREATE TABLE `user` (2`id` int NOT NULL AUTO_INCREMENT,

3`name` varchar(50) DEFAULT NULL,

4`address` varchar(50) DEFAULT NULL,

5`last_updated` bigint DEFAULT NULL,

6`is_deleted` int DEFAULT NULL,

7PRIMARY KEY (`id`)8) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 ;9

```
#插入数据
```

INSERT INTO user(name,address,last_updated,is_deleted) VALUES("张三","广州天河",unix_timestamp(NOW()),0);11

```
# 更新
```

update user set address="广州白云山",last_updated=unix_timestamp(NOW()) where name="张三";2

```
#删除
```

update user set is_deleted=1,last_updated=unix_timestamp(NOW()) where name="张三";2

### 第 12 页

![Elasticsearch 教程配图（46-2 第12页 图1）](/中间件/elasticsearch/46-2/p12-page.png)

Beats 是一个免费且开放的平台，集合了多种单一用途的数据采集器。它们从成百上千或成千上万台机器和系统向 Logstash 或 Elasticsearch 发送数据。

```
#ES中查询
# 创建 alias，只显示没有被标记 deleted的用户
POST /_aliases
{
"actions": [
{
"add": {
"index": "users",
"alias": "view_users",
"filter" : { "term" : { "is_deleted" : 0} }
}
}
]
}
```

15

```
# 通过 Alias查询，查不到被标记成 deleted的用户
POST view_users/_search
```

18

```
POST view_users/_search
{
"query": {
"term": {
"name.keyword": {
"value": "张三"
}
}
}
}
```

4. 轻量级采集器FileBeat详解FileBeat的概述

### 第 13 页

![Elasticsearch 教程配图（46-2 第13页 图1）](/中间件/elasticsearch/46-2/p13-page.png)

FileBeat专门用于转发和收集日志数据的轻量级采集工具。它可以作为代理安装在服务器上，FileBeat监视指定路径的日志文件，收集日志数据，并将收集到的日志转发到Elasticsearch或者Logstash。

启动FileBeat时，会启动一个或者多个输入（Input），这些Input监控指定的日志数据位置。FileBeat会针对每一个文件启动一个Harvester（收割机）。Harvester读取每一个文件的日志，将新的日志发送到libbeat，libbeat将数据收集到一起，并将数据发送给输出（Output）。

- 1）下载并解压Filebeat下载地址：

选择版本：8.14.3FileBeat的工作原理分析

logstash vs FileBeatLogstash是在jvm上运行的，资源消耗比较大。而FileBeat是基于golang编写的，功能较少但资源消耗也比较小，

更轻量级。

Logstash 和Filebeat都具有日志收集功能，Filebeat更轻量，占用资源更少Logstash 具有Filter功能，能过滤分析日志一般结构都是Filebeat采集日志，然后发送到消息队列、Redis、MQ中，然后Logstash去获取，利用Filter功能过滤分析，然后存储到Elasticsearch中FileBeat和Logstash配合，实现背压机制。当将数据发送到Logstash或 Elasticsearch时，Filebeat使用背压敏感协议，以应对更多的数据量。如果Logstash正在忙于处理数据，则会告诉Filebeat 减慢读取速度。一旦拥堵得到解决，Filebeat就会恢复到原来的步伐并继续传输数据。

Filebeat的安装与配置https://www.elastic.co/guide/en/beats/filebeat/8.14/filebeat-installation-configuration.htmlhttps://www.elastic.co/cn/downloads/past-releases#filebeat

```
#windows
https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.14.3-windows-
```

x86_64.zip2

```
# linux
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.14.3-linux-
```

x86_64.tar.gz4

```
tar xzvf filebeat-8.14.3-linux-x86_64.tar.gz
```

### 第 14 页

![Elasticsearch 教程配图（46-2 第14页 图1）](/中间件/elasticsearch/46-2/p14-page.png)

- 2）编辑配置修改 filebeat.yml 以设置连接信息：

- 3) 启用和配置数据收集模块从安装目录中，运行：

- 4）启动 Filebeatoutput.elasticsearch:1hosts: ["192.168.65.174:9200","192.168.65.192:9200","192.168.65.204:9200"]2username: "elastic"3password: "123456"4setup.kibana:5host: "192.168.65.174:5601"6

```
# 查看可以模块列表
```

./filebeat modules list2

3

```
#启用nginx模块
```

./filebeat modules enable nginx5

```
#如果需要更改nginx日志路径,修改modules.d/nginx.yml
- module: nginx
access:
enabled: true
var.paths: ["/var/log/nginx/access.log*"]
```

11

```
#启用 Logstash 模块
```

./filebeat modules enable logstash13

```
#在 modules.d/logstash.yml 文件中修改设置
- module: logstash
log:
enabled: true
var.paths: ["/home/fox/logstash-8.14.3/logs/*.log"]
```

19

### 第 15 页

![Elasticsearch 教程配图（46-2 第15页 图1）](/中间件/elasticsearch/46-2/p15-page.png)

启动成功后，在kibana中可以查看到logstash的日志

Tomcat服务器运行过程中产生很多日志信息，通过filebeat采集tomcat日志并发送到Logstash1）配置FileBeats采集tomcat日志并将日志发送到Logstash创建配置文件filebeat-tomcat.yml，配置FileBeats将数据发送到Logstash2）启动FileBeat，并指定使用指定的配置文件

```
# setup命令加载Kibana仪表板。 如果仪表板已经设置，则忽略此命令。
```

./filebeat setup2

```
# 启动Filebeat
```

./filebeat -e4实践练习1：FileBeat采集tomcat服务器日志并发送到Logstash

```
#因为Tomcat的web log日志都是以IP地址开头的，所以我们需要修改下匹配字段。
# 不以ip地址开头的行追加到上一行
filebeat.inputs:
- type: log
enabled: true
paths:
- /home/fox/apache-tomcat-9.0.93/logs/*access*.*
multiline.pattern: '^\\d+\\.\\d+\\.\\d+\\.\\d+ '
multiline.negate: true
multiline.match: after
```

11output.logstash:12enabled: true13hosts: ["localhost:5044"]14

15pattern：正则表达式negate：true 或 false；默认是false，匹配pattern的行合并到上一行；true，不匹配pattern的行合并到上一行match：after 或 before，合并到上一行的末尾或开头

### 第 16 页

![Elasticsearch 教程配图（46-2 第16页 图1）](/中间件/elasticsearch/46-2/p16-page.png)

可能出现的异常：

异常1：Exiting: error loading config file: config file ("filebeat-tomcat.yml") can only be writable by theowner but the permissions are "-rw-rw-r--" (to fix the permissions use: 'chmod go-w/home/fox/filebeat-8.14.3-linux-x86_64/filebeat-tomcat.yml')因为安全原因不要其他用户写的权限，去掉写的权限就可以了

异常2：Failed to connect to backoff(async(tcp://192.168.65.204:5044)): dial tcp192.168.65.204:5044: connect: connection refusedFileBeat将尝试建立与Logstash监听的IP和端口号进行连接。但此时，我们并没有开启并配置Logstash，所以FileBeat是无法连接到Logstash的。

- 2) 配置Logstash接收FileBeat收集的数据并打印测试logstash配置是否正确./filebeat -e -c filebeat-tomcat.yml1chmod 644 filebeat-tomcat.yml1

```
vim config/logstsh-tomcat.conf
# 配置从FileBeat接收数据
input {
beats {
port =>
}
}
```

8

```
output {
stdout {
codec => rubydebug
}
}
```

### 第 17 页

![Elasticsearch 教程配图（46-2 第17页 图1）](/中间件/elasticsearch/46-2/p17-page.png)

启动logstash

测试：访问tomcat，logstash是否接收到了Filebeat传过来的tomcat日志

- 1）Logstash输出数据到Elasticsearch如果我们需要将数据输出值ES而不是控制台的话，我们修改Logstash的output配置。

启动logstash

```
bin/logstash -f config/logstsh-tomcat.conf --config.test_and_exit
# reload.automatic：修改配置文件时自动重新加载
bin/logstash -f config/logstsh-tomcat.conf --config.reload.automatic
```

实践练习2： 整合ELK采集与分析tomcat日志

```
vim config/logstsh-tomcat.conf
input {
beats {
port =>
}
}
```

7

```
output {
elasticsearch {
hosts => ["http://localhost:9200"]
index => "tomcat-logs"
user => "elastic"
password => "123456"
}
stdout{
codec => rubydebug
}
}
```

### 第 18 页

![Elasticsearch 教程配图（46-2 第18页 图1）](/中间件/elasticsearch/46-2/p18-page.png)

测试日志是否保存到了ES

思考：日志信息都保证在message字段中，是否可以把日志进行解析一个个的字段？例如：IP字段、时间、请求方式、请求URL、响应结果。

- 2) 利用Logstash过滤器解析日志从日志文件中收集到的数据包含了很多有效信息，比如IP、时间等，在Logstash中可以配置过滤器Filter对采集到的数据进行过滤处理，Logstash中有大量的插件可以供我们使用。

Grok插件Grok是一种将非结构化日志解析为结构化的插件。这个工具非常适合用来解析系统日志、Web服务器日志、MySQL或者是任意其他的日志格式。

Grok语法Grok是通过模式匹配的方式来识别日志中的数据,可以把Grok插件简单理解为升级版本的正则表达式。

它拥有更多的模式，默认Logstash拥有120个模式。如果这些模式不满足我们解析日志的需求，我们可以直接使用正则表达式来进行匹配。

grok模式的语法是：

SYNTAX（语法）指的是Grok模式名称，SEMANTIC（语义）是给模式匹配到的文本字段名。例如：

```
bin/logstash -f config/logstsh-tomcat.conf --config.reload.automatic
```

查看Logstash已经安装的插件1

```
bin/logstash-plugin list
https://www.elastic.co/guide/en/logstash/8.14/plugins-filters-grok.html
%{SYNTAX:SEMANTIC}
%{NUMBER:duration} %{IP:client}
```

duration表示：匹配一个数字，client表示匹配一个IP地址。

2

### 第 19 页

![Elasticsearch 教程配图（46-2 第19页 图1）](/中间件/elasticsearch/46-2/p19-page.png)

默认在Grok中，所有匹配到的的数据类型都是字符串，如果要转换成int类型（目前只支持int和float），可以这样：%{NUMBER:duration:int} %{IP:client}

常用的Grok模式

用法

比如，tomacat日志解析后的字段grok模式https://help.aliyun.com/document_detail/129387.html?scm=20140722.184.2.173

```
filter {
grok {
match => { "message" => "%{IP:client} %{WORD:method} %{URIPATHPARAM:request} %
{NUMBER:bytes} %{NUMBER:duration}" }
}
}
```

192.168.65.103 - - [23/Jun/2022:22:37:23 +0800] "GET /docs/images/docs-stylesheet.cssHTTP/1.1" 200 57801字段名说明client IP浏览器端IPtimestamp请求的时间戳method请求方式（GET/POST）uri请求的链接地址status服务器端响应状态length响应的数据长度

### 第 20 页

![Elasticsearch 教程配图（46-2 第20页 图1）](/中间件/elasticsearch/46-2/p20-page.png)

为了方便测试，我们可以使用Kibana来进行Grok开发：

修改Logstash配置文件启动logstash测试

mutate插件使用mutate插件过滤掉不需要的字段%{IP:ip} - - \[%{HTTPDATE:date}\] \"%{WORD:method} %{PATH:uri} %{DATA:protocol}\" %{INT:status} %{INT:length}1

```
vim config/logstash-console.conf
```

2

```
input {
beats {
port =>
}
}
```

8

```
filter {
grok {
match => {
"message" => "%{IP:ip} - - \[%{HTTPDATE:date}\] \"%{WORD:method} %{PATH:uri} %
{DATA:protocol}\" %{INT:status:int} %{INT:length:int}"
}
}
}
```

16

```
output {
stdout {
codec => rubydebug
}
}
bin/logstash -f config/logstash-console.conf --config.reload.automatic
```

### 第 21 页

![Elasticsearch 教程配图（46-2 第21页 图1）](/中间件/elasticsearch/46-2/p21-page.png)

Date插件要将日期格式进行转换，我们可以使用Date插件来实现。该插件专门用来解析字段中的日期，官方说明文档：

用法如下：

将date字段转换为「年月日 时分秒」格式。默认字段经过date插件处理后，会输出到@timestamp字段，所以，我们可以通过修改target属性来重新定义输出字段。

filter完整的配置测试效果

- 3) 输出到Elasticsearch指定索引index来指定索引名称，默认输出的index名称为：logstash-%{+yyyy.MM.dd}。但注意，要在index中使用时间格式化，filter的输出必须包含 @timestamp字段，否则将无法解析日期。

mutate {1enable_metric => "false"2remove_field => ["message", "log", "tags", "input", "agent", "host", "ecs",

"@version"]3

```
}
https://www.elastic.co/guide/en/logstash/8.14/plugins-filters-date.html
date {
match => ["date","dd/MMM/yyyy:HH:mm:ss Z","yyyy-MM-dd HH:mm:ss"]
target => "date"
}
```

### 第 22 页

![Elasticsearch 教程配图（46-2 第22页 图1）](/中间件/elasticsearch/46-2/p22-page.png)

注意：index名称中，不能出现大写字符完整的Logstash配置文件

```
output {
elasticsearch {
index => "tomcat_web_log_%{+YYYY-MM}"
hosts => ["http://localhost:9200"]
user => "elastic"
password => "123456"
}
stdout{
codec => rubydebug
}
}
```

### 第 23 页

![Elasticsearch 教程配图（46-2 第23页 图1）](/中间件/elasticsearch/46-2/p23-page.png)

启动logstash

```
vim config/logstash-tomcat-es.conf
```

2

```
input {
beats {
port =>
}
}
```

8

```
filter {
grok {
match => {
"message" => "%{IP:ip} - - \[%{HTTPDATE:date}\] \"%{WORD:method} %{PATH:uri} %
{DATA:protocol}\" %{INT:status:int} %{INT:length:int}"
}
}
mutate {
enable_metric => "false"
remove_field => ["message", "log", "tags", "input", "agent", "host", "ecs",
"@version"]
}
date {
match => ["date","dd/MMM/yyyy:HH:mm:ss Z","yyyy-MM-dd HH:mm:ss"]
target => "date"
}
}
```

24

```
output {
stdout {
codec => rubydebug
}
elasticsearch {
index => "tomcat_web_log_%{+YYYY-MM}"
hosts => ["http://localhost:9200"]
user => "elastic"
password => "123456"
}
}
```

### 第 24 页

![Elasticsearch 教程配图（46-2 第24页 图1）](/中间件/elasticsearch/46-2/p24-page.png)

查询es中是否有数据

- 4）通过Kibana分析微服务日志在kibana中，创建一个数据视图，创建完成后可以看到索引的相关详细信息点击Discover，选择刚刚创建的数据视图筛选出status为403的日志Spring Boot应用输出日志到ELK的流程如下图所示：

实现步骤：

- 1）使用logstash日志插件引入依赖

```
bin/logstash -f config/logstash-tomcat-es.conf --config.reload.automatic
```

5. 微服务整合ELK实现日志采集与分析实战实现思路分析Spring Boot应用产生日志数据，使用Logback日志框架记录日志。

Logstash作为日志收集器，接收Spring Boot应用发送的日志数据。

Logstash解析和过滤日志数据，可能会对其进行格式化和处理。

处理后的日志数据被发送到Elasticsearch，Elasticsearch将日志数据存储在分布式索引中。

Kibana连接到Elasticsearch，可以查看存储在Elasticsearch中的日志数据。

微服务整合Logstash实现日志采集

```
<dependency>
```

\<\g\r\o\u\p\I\d\>\net.logstash.logback\<\/\g\r\o\u\p\I\d\>\2\<\a\r\t\i\f\a\c\t\I\d\>\logstash-logback-encoder\<\/\a\r\t\i\f\a\c\t\I\d\>\3\<\v\e\r\s\i\o\n\>\6.3\<\/\v\e\r\s\i\o\n\>\4

```
</dependency>
```

1.

2.

3.

4.

5.

### 第 25 页

![Elasticsearch 教程配图（46-2 第25页 图1）](/中间件/elasticsearch/46-2/p25-page.png)

- 2）logback-spring.xml中添加logstash配置3）添加elk-demo.conf配置，启动logstash\<\?\x\m\l\ \v\e\r\s\i\o\n\=\"\1\.\0\"\ \e\n\c\o\d\i\n\g\=\"\U\T\F\-\8\"\?\>\1\<\c\o\n\f\i\g\u\r\a\t\i\o\n\ \d\e\b\u\g\=\"\f\a\l\s\e\"\>\2\<\p\r\o\p\e\r\t\y\ \n\a\m\e\=\"\L\O\G\_\H\O\M\E\"\ \v\a\l\u\e\=\"\l\o\g\s\/\e\l\k\-\d\e\m\o\.\l\o\g\"\ \/\>\3\<\a\p\p\e\n\d\e\r\ \n\a\m\e\=\"\S\T\D\O\U\T\"\ \c\l\a\s\s\=\"\c\h\.\q\o\s\.\l\o\g\b\a\c\k\.\c\o\r\e\.\C\o\n\s\o\l\e\A\p\p\e\n\d\e\r\"\>\4\<\e\n\c\o\d\e\r\ \c\l\a\s\s\=\"\c\h\.\q\o\s\.\l\o\g\b\a\c\k\.\c\l\a\s\s\i\c\.\e\n\c\o\d\e\r\.\P\a\t\t\e\r\n\L\a\y\o\u\t\E\n\c\o\d\e\r\"\>\5\<\p\a\t\t\e\r\n\>\%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} -%msg%n\<\/\p\a\t\t\e\r\n\>\6\<\/\e\n\c\o\d\e\r\>\7\<\/\a\p\p\e\n\d\e\r\>\8

9\<\a\p\p\e\n\d\e\r\ \n\a\m\e\=\"\l\o\g\s\t\a\s\h\"\c\l\a\s\s\=\"\n\e\t\.\l\o\g\s\t\a\s\h\.\l\o\g\b\a\c\k\.\a\p\p\e\n\d\e\r\.\L\o\g\s\t\a\s\h\T\c\p\S\o\c\k\e\t\A\p\p\e\n\d\e\r\"\>\10\<\d\e\s\t\i\n\a\t\i\o\n\>\192.168.65.211:4560\<\/\d\e\s\t\i\n\a\t\i\o\n\>\11\<\e\n\c\o\d\e\r\ \c\l\a\s\s\=\"\n\e\t\.\l\o\g\s\t\a\s\h\.\l\o\g\b\a\c\k\.\e\n\c\o\d\e\r\.\L\o\g\s\t\a\s\h\E\n\c\o\d\e\r\"\ \>\12\<\c\u\s\t\o\m\F\i\e\l\d\s\>\{"appname": "elk-demo"}\<\/\c\u\s\t\o\m\F\i\e\l\d\s\>\13\<\/\e\n\c\o\d\e\r\>\14\<\/\a\p\p\e\n\d\e\r\>\15<!-- 日志输出级别 -->16\<\r\o\o\t\ \l\e\v\e\l\=\"\I\N\F\O\"\>\17\<\a\p\p\e\n\d\e\r\-\r\e\f\ \r\e\f\=\"\S\T\D\O\U\T\"\ \/\>\18\<\a\p\p\e\n\d\e\r\-\r\e\f\ \r\e\f\=\"\l\o\g\s\t\a\s\h\"\ \/\>\19\<\/\r\o\o\t\>\20\<\/\c\o\n\f\i\g\u\r\a\t\i\o\n\>\21

### 第 26 页

![Elasticsearch 教程配图（46-2 第26页 图1）](/中间件/elasticsearch/46-2/p26-page.png)

启动logstash4）测试调用springboot应用提供的接口，logstash控制台是否正常打印日志在kibana中查看elk-demo开头的索引是否存在创建demo-elk-*的数据视图

```
vim config/elk-demo.conf
```

2

```
input {
tcp {
host => "0.0.0.0"
port => "4560"
mode => "server"
codec => json_lines
}
stdin {}
}
filter {
```

13

```
}
output {
stdout {
codec => rubydebug
}
elasticsearch {
hosts => ["127.0.0.1:9200"]
index => "%{[appname]}-%{+YYYY.MM.dd}"
}
}
```

24

```
# 后台启动
bin/logstash -f config/elk-demo.conf
```

通过Kibana分析微服务日志

### 第 27 页

![Elasticsearch 教程配图（46-2 第27页 图1）](/中间件/elasticsearch/46-2/p27-page.png)

在Discover中查看日志数据

---

## 第二部分：MySQL 到 ES 数据一致性


### 第 1 页

某知名的在线旅游平台，在即将到来的春季促销活动之前，决定推出一项新的功能：用户可以通过输入目的地、酒店名称、房型、价格范围等属性来搜索旅游优惠酒店。为了及时上线这一功能，运营团队需要将现有的酒店数据同步到高效的搜索引擎中，以支持用户的高频搜索需求。

1.业务场景介绍1.1 需求分析功能需求：按目的地、酒店名称、房型、价格范围等属性进行全模糊搜索酒店信息。

非功能需求：

性能：预计春季促销期间酒店搜索的QPS将达到1000左右，搜索结果会包含丰富的酒店信息。

响应时间：搜索响应时间需控制在500毫秒以内，以确保良好的用户体验。

数据一致性：确保搜索结果反映的是最新的酒店信息及可用性。

### 第 2 页

![Elasticsearch 教程配图（46-3 第2页 图1）](/中间件/elasticsearch/46-3/p02-01.png)

假设底层使用MySQL数据库存储酒店数据，以下是实现该需求的技术方案：

通过将数据从MySQL实时同步到Elasticsearch，并优化查询性能，我们可以实现一个快速、准确的酒店搜索功能，满足春季促销期间的高并发搜索需求。

### 1.2 技术实现方案数据同步：利用MySQL的binlog或第三方数据同步工具（如Debezium、Canal等）来实时监听酒店数据的变更，

并将这些变更同步到Elasticsearch中。

索引构建：在Elasticsearch中为目的地、酒店名称、房型、价格范围等字段建立合适的索引，以支持快速和高效的模糊搜索。

### 第 3 页

思考： 如何保证Mysql数据库和ES的数据一致性？

在确保My数据库和Elasticsearch（ES）数据一致性方面，业界有几种常见的方案：

在代码中对数据库和ES进行双写操作，确保先更新数据库后更新ES。如果数据库更新成功而ES更新失败，可以通过事务回滚来保证一致性。这种方案简单易实现，但可能存在性能瓶颈和不一致的风险。

使用消息队列（如RocketMQ、Kafka等）作为中间件，应用程序在更新数据库后发送消息到MQ，由MQ的消费者异步更新ES。这种方案可以解耦数据库和ES，提高性能，但可能存在消息延迟和系统复杂度增加的问题。

通过定时任务定期扫描数据库，将变更的数据同步到ES。这种方案的实时性较差，但可以减少对数据库的即时压力。

通过直接监听MySQL的binlog来实现数据库和ES之间的实时同步。这种方案对业务代码没有侵入性，

可以实现数据库和ES的实时同步，但需要额外的框架和可能存在一定的延迟。

在数据写入MySQL的同时，直接将相同的数据写入ES。

2.业界常用数据一致性方案分析同步双写方案MQ异步双写方案扫表定时同步方案监听binlog同步方案2.1 同步双写方案实现思路优缺点对比优点数据一致性：双写策略可以保证在MySQL和Elasticsearch之间数据的强一致性，因为每次数据库的变更都会在Elasticsearch中同步反映。

实时性：双写策略可以实现数据的实时同步，用户在MySQL中进行的任何操作都会立即在Elasticsearch中体现。

易于实现：从技术角度来说，双写策略的实现相对简单，通常只需要在应用程序代码中添加额外的写入逻辑。

1.

2.

3.

4.

1.

2.

3.

### 第 4 页

![Elasticsearch 教程配图（46-3 第4页 图1）](/中间件/elasticsearch/46-3/p04-page.png)

系统特点:旧系统年限长、单体架构且技术比较落后,如果引入除es之外的其他中间件治理成本很高，可以考虑这个方案。

业务场景:用户量少、偏后台管理类的系统，对数据同步的实时性要求很高,接近实时。

使用消息队列（如RocketMQ、Kafka等）作为中间件，应用程序在更新数据库后发送消息到MQ，由MQ的消费者异步更新ES。

方案核心

缺点代码复杂性：需要在应用程序中增加额外的代码来处理数据的双写，这会增加代码的复杂性和维护难度。

性能开销：每次数据库操作都需要执行两次，这会导致额外的性能开销，尤其是在高并发的场景下。

数据不一致风险：在双写过程中，如果发生系统故障或网络延迟，可能会出现数据不一致的情况，尤其是在写入MySQL成功但写入ES失败时。

应用场景2.2 MQ异步双写方案实现思路生产者端双写：生产者系统在发送消息到MQ的同时，也写入到Mysql。

消费者端异步处理：消费者从MQ中读取消息，并异步地将消息处理结果写入到ES。

优缺点对比优点系统解耦：MQ的使用使得MySQL和ES之间的依赖性降低，提高了系统的可维护性和扩展性。

高可用性：MQ可以提供消息的持久化存储，确保即使系统故障，消息也不会丢失。

容错性：在双写过程中，即使某个系统出现故障，数据仍然可以通过其他系统恢复。

缺点延迟：异步处理可能会导致数据同步的延迟，特别是在高负载或系统资源不足的情况下。

复杂度：引入MQ和双写机制增加了系统的复杂度，需要更多的开发和维护工作。

补偿机制：需要设计复杂的补偿机制来处理同步失败的情况，增加了系统的复杂性。

1.

2.

3.

### 第 5 页

![Elasticsearch 教程配图（46-3 第5页 图1）](/中间件/elasticsearch/46-3/p05-page.png)

系统特点：

业务场景：

通过定时任务定期扫描数据库，将变更的数据同步到ES。

1. 实现简单：使用定时任务调度框架，不需要复杂的开发工作。

2. 适合批量数据：对于大量数据的迁移，批量处理可以减少网络传输次数和ES的写入压力。

3. 对业务影响小：定时任务可以在系统负载较低的时段运行，对在线业务影响较小。

1. 实时性差：由于是定期执行，数据同步存在延迟，不适合对实时性要求高的应用。

2. 性能影响：同步过程中可能会对MySQL和ES的性能产生短期影响，尤其是在数据量大时。

3. 数据一致性：如果在同步周期内数据发生变化，可能会导致ES中数据与MySQL不一致。

系统特点:旧系统年限长、技术框架老旧，引入其他的中间件成本很高。

业务场景:用户体量小、偏报表统计类业务、对数据实时性要求不高。

应用场景C端系统：该系统面向最终用户，可能是移动应用、Web应用或桌面应用。

引入MQ中间件：系统架构中已经包含了消息队列中间件，这为异步处理提供了基础。

接口TPS性能要求：系统对接口的吞吐量（TPS，Transactions Per Second）有一定要求，需要保证高并发情况下的性能。

用户体量大，高并发场景：系统服务的大量用户同时进行操作，导致系统面临高并发压力。

业务变更少：业务逻辑变更相对较少，数据同步的需求比较稳定。

允许一定的延迟：在保证用户体验的前提下，数据同步的延迟在秒级范围内是可以接受的。

### 2.3 扫表定期同步方案实现思路优缺点对比优点缺点应用场景

### 第 6 页

![Elasticsearch 教程配图（46-3 第6页 图1）](/中间件/elasticsearch/46-3/p06-page.png)

通过直接监听MySQL的binlog来实现数据库和ES之间的实时同步。

在高并发场景下，直接将binlog事件推送到ES可能会导致ES负载过高。Kafka可以作为缓冲层，暂时存储binlog事件，平滑数据流，避免瞬时的高负载。

系统特点: c端系统，开放mysql binlog日志监听，引入第三方canal中间件成本不高。

业务场景: 互联网公司，用户体量大、大型多中心组织、高并发场景，业务上允许有一定的延迟(秒级)。

### 2.4 监听binlog同步方案实现思路优缺点对比优点业务无侵入，数据同步准实时业务解耦，不需要关注原来系统的业务逻辑。

缺点构建 Binlog 系统复杂；

如果采用 MQ 消费解析的 Binlog 信息，也会像方案二一样存在 MQ 延时的风险。

应用场景

---

## 小结

- 本篇为 Elasticsearch 系列第 10/10 篇，主题：**ELK 日志体系与 MySQL 到 ES 一致性**。
- 建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。
- 系列文章路径前缀：`/中间件/elasticsearch/`。
