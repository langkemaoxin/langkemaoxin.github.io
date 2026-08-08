---
title: "Elasticsearch 高可用集群架构"
sidebarGroup: "Elasticsearch"
shortTitle: "08 高可用集群"
order: 8
date: 2026-10-27
category: "中间件"
tag:
  - "Elasticsearch"
  - "中间件"
---

> **Elasticsearch 系列 · 第 8/10 篇**
> 下一篇预告：[《ES 集群生产实践与性能调优》](/中间件/elasticsearch/es-09-production)

---

## 开头：场景与目标

单机 ES 扛不住流量和数据量。本篇搭建三节点集群，理解主分片/副本、集群状态红黄绿，并完成 ES 8.x Security 认证与 Kibana/Cerebro 接入。


### 第 1 页

![Elasticsearch 教程配图（46-14 第1页 图1）](/中间件/elasticsearch/46-14/p01-01.png)

分布式系统的可用性与扩展性ES集群架构的优势：

1. 为什么要使用ES集群架构高可用性服务可用性——允许有节点停止服务数据可用性——部分节点丢失，不会丢失数据可扩展性请求量提升/数据的不断增长(将数据分布到所有节点上)提高系统的可用性: 在ES集群中，即使部分节点停止服务，整个集群的服务也不会受到影响，因为数据和索引操作可以在剩余的节点上继续进行。

存储的水平扩容: ES集群支持通过增加新的节点来扩展存储容量，实现数据的水平扩展，这样可以有效应对数据量的增长。

2. 核心概念集群一个集群可以有一个或者多个节点不同的集群通过不同的名字来区分，默认名字“elasticsearch“通过配置文件修改，或者在命令行中 -E cluster.name=es-cluster进行设定

### 第 2 页

![Elasticsearch 教程配图（46-14 第2页 图1）](/中间件/elasticsearch/46-14/p02-page.png)

节点节点是一个Elasticsearch的实例本质上就是一个JAVA进程一台机器上可以运行多个Elasticsearch进程，但是生产环境一般建议一台机器上只运行一个Elasticsearch实例每一个节点都有名字，通过配置文件配置，或者启动时候 -E node.name=node1指定每一个节点在启动之后，会分配一个UID，保存在data目录下分片(Primary Shard & Replica Shard)主分片（Primary Shard）用以解决数据水平扩展的问题。通过主分片，可以将数据分布到集群内的所有节点之上一个分片是一个运行的Lucene的实例主分片数在索引创建时指定，后续不允许修改，除非Reindex副本分片（Replica Shard）用以解决数据高可用的问题。 副本分片是主分片的拷贝副本分片数，可以动态调整增加副本数，还可以在一定程度上提高服务的可用性(读取的吞吐)

```
# 指定索引的主分片和副本分片数
PUT /blogs
{
"settings": {
"number_of_shards": 3,
"number_of_replicas":
}
}
```

分片架构集群statusGreen: 主分片与副本都正常分配Yellow: 主分片全部正常分配，有副本分片未能正常分配Red: 有主分片未能分配。例如，当服务器的磁盘容量超过85%时,去创建了一个新的索引

### 第 3 页

![Elasticsearch 教程配图（46-14 第3页 图1）](/中间件/elasticsearch/46-14/p03-page.png)

CAT API查看集群信息

建议：每台机器先安装好单节点ES进程，并能正常运行，再修改配置，搭建集群参考课程：

- 1）系统环境准备安装版本：elasticsearch8.14.3操作系统: CentOS7切换到root用户，创建用户es

```
#查看集群的健康状况
GET _cluster/health
```

1

```
GET /_cat/nodes?v   #查看节点信息
GET /_cat/health?v    #查看集群当前状态：红、黄、绿
GET /_cat/shards?v        #查看各shard的详细情况
GET /_cat/shards/{index}?v     #查看指定分片的详细情况
GET /_cat/master?v          #查看master节点信息
GET /_cat/indices?v         #查看集群中所有index的详细信息
GET /_cat/indices/{index}?v      #查看集群中指定index的详细信息
```

3. 搭建三节点ES集群ElasticSearch快速安装上手IPES节点名192.168.65.213

node-1192.168.65.207

node-2192.168.65.208node-3ES集群搭建步骤

### 第 4 页

![Elasticsearch 教程配图（46-14 第4页 图1）](/中间件/elasticsearch/46-14/p04-page.png)

修改/etc/hosts关闭防火墙

在生产模式下，服务启动会触发ES的引导检查或者叫启动检查（bootstrap checks），所谓引导检查就是在服务启动之前对一些重要的配置项进行检查，检查其配置值是否是合理的。引导检查包括对JVM大小、内存锁、虚拟内存、最大线程数、集群发现相关配置等相关的检查，如果某一项或者几项的配置不合理，ES会拒绝启动服务。

[1]: max file descriptors [4096] for elasticsearch process is too low, increase to at least [65536]ES因为需要大量的创建索引文件，需要大量的打开系统的文件，所以我们需要解除linux系统当中打开文件最大数目的限制，不然ES启动就会抛错

```
adduser es
passwd es
vim  /etc/hosts
```

#### 192.168.65.213 es-node12192.168.65.207 es-node23192.168.65.208 es-node34

```
#查看防火墙状态
systemctl status firewalld
#关闭防火墙
systemctl stop firewalld
systemctl disable firewalld
```

### 第 5 页

![Elasticsearch 教程配图（46-14 第5页 图1）](/中间件/elasticsearch/46-14/p05-page.png)

[2]: max number of threads [1024] for user [es] is too low, increase to at least [4096]无法创建本地线程问题,用户最大可创建线程数太小[3]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]最大虚拟内存太小,调大系统的虚拟内存

- 2）切换到es用户，修改elasticsearch.yml

```
#切换到root用户
vim /etc/security/limits.conf
```

3末尾添加如下配置：

4*	    softnofile 	655365*     hardnofile 	655366*     softnproc 	 40967*	    hardnproc 	 40968

```
vim /etc/security/limits.d/20-nproc.conf
```

2改为如下配置：

3* soft nproc 40964

```
vim /etc/sysctl.conf
```

追加以下内容：

2vm.max_map_count=2621443保存退出之后执行如下命令：

4sysctl -p5

### 第 6 页

![Elasticsearch 教程配图（46-14 第6页 图1）](/中间件/elasticsearch/46-14/p06-page.png)

三个节点配置如下：

```
# 指定集群名称3个节点必须一致
cluster.name: es-cluster
#指定节点名称，每个节点名字唯一
node.name: node-1
# 绑定ip,开启远程访问,可以配置0.0.0.0
network.host: 0.0.0.0
#指定web端口
#http.port: 9200
#指定tcp端口
#transport.tcp.port: 9300
#用于节点发现，一般配置集群的候选主节点
discovery.seed_hosts: ["es-node1", "es-node2", "es-node3"]
#7.0新引入的配置项,集群引导节点。指定集群初次选举中用到的具有主节点资格的节
#点称为集群引导节点，只在第一次形成集群时需要
#该选项配置为node.name的值，指定可以初始化集群节点的名称
cluster.initial_master_nodes: ["node-1","node-2","node-3"]
#解决跨域问题
http.cors.enabled: true
http.cors.allow-origin: "*"
#初学者建议关闭security安全认证
xpack.security.enabled: false
```

### 第 7 页

![Elasticsearch 教程配图（46-14 第7页 图1）](/中间件/elasticsearch/46-14/p07-page.png)

- 3) 启动每个节点的ES服务

```
#192.168.65.213的配置
cluster.name: es-cluster
node.name: node-1
network.host: 0.0.0.0
discovery.seed_hosts: ["es-node1", "es-node2", "es-node3"]
cluster.initial_master_nodes: ["node-1","node-2","node-3"]
http.cors.enabled: true
http.cors.allow-origin: "*"
xpack.security.enabled: false
```

10

```
#192.168.65.207的配置
cluster.name: es-cluster
node.name: node-3
network.host: 0.0.0.0
discovery.seed_hosts: ["es-node1", "es-node2", "es-node3"]
cluster.initial_master_nodes: ["node-1","node-2","node-3"]
http.cors.enabled: true
http.cors.allow-origin: "*"
xpack.security.enabled: false
```

20

```
#192.168.65.208的配置
cluster.name: es-cluster
node.name: node-2
network.host: 0.0.0.0
discovery.seed_hosts: ["es-node1", "es-node2", "es-node3"]
cluster.initial_master_nodes: ["node-1","node-2","node-3"]
http.cors.enabled: true
http.cors.allow-origin: "*"
xpack.security.enabled: false
```

### 第 8 页

![Elasticsearch 教程配图（46-14 第8页 图1）](/中间件/elasticsearch/46-14/p08-page.png)

- 4）验证集群

Cerebro介绍Cerebro 可以查看分片分配和通过图形界面执行常见的索引操作。 完全开源，并且它允许添加用户，

密码或 LDAP 身份验证问网络界面。

Cerebro 基于 Scala 的Play 框架编写，用于后端 REST 和 Elasticsearch 通信。 它使用通过AngularJS 编写的单页应用程序（SPA）前端。

项目网址：

安装 Cerebro下载地址：

运行 cerebro访问：

输入ES集群节点：http://192.168.65.207:9200，建立连接：

- 1）修改kibana配置

```
# 注意：如果运行过单节点模式，需要删除data目录， 否则会导致无法加入集群
```

rm -rf data2

```
#安装ik分词器
bin/elasticsearch-plugin install https://release.infinilabs.com/analysis-
```

ik/stable/elasticsearch-analysis-ik-8.14.3.zip4

```
# 启动ES服务
bin/elasticsearch -d
http://192.168.65.213:9200/_cat/nodes?pretty
```

安装Cerebro客户端https://github.com/lmenezes/cerebrohttps://github.com/lmenezes/cerebro/releases/download/v0.9.4/cerebro-0.9.4.zipcerebro-0.9.4/bin/cerebro1

2

```
#后台启动
nohup bin/cerebro &
http://192.168.65.207:9000/
```

安装kibana

### 第 9 页

![Elasticsearch 教程配图（46-14 第9页 图1）](/中间件/elasticsearch/46-14/p09-page.png)

- 2）运行Kibana提示：Kibana对外的 tcp 端口是5601，使用netstat -tunlp|grep 5601即可查看进程访问Kibana:

参考文档：

近几年来，ES 数据泄露事件频发给国内各行业用户敲响了数据安全的警钟。比如:

```
vim config/kibana.yml
```

2server.host: "192.168.65.213"3i18n.locale: "zh-CN"4

```
#后台启动
nohup  bin/kibana &
```

3

```
#查询kibana进程
```

netstat -tunlp | grep 56015http://192.168.65.213:5601/4. ES集群安全认证https://www.elastic.co/guide/en/elasticsearch/reference/8.14/configuring-stack-security.html2019 年发生的 ES 数据泄露事件，泄露包括 27 亿个电子邮件地址，其中 10 亿个密码是以简单的明文存储，涉及国内多家互联网公司。

## 2021 年 Group-IB 报告显示，网络上暴露的 ES 实例超过 10 万个，约占 2021 年暴露数据库总数的 30% 。

## 2022 年漫画阅读平台 Mangatoon 遭遇数据泄露，黑客从不安全的 ES 数据库中窃取了属于 2300 万用户帐户的信息。

## 2022 年阿里巴巴遭受了一次重大数据泄露，涉及客户数据包括：姓名、电话号、身份证号、居住地址等信息共计 23TB。

ES敏感信息泄露的原因Elasticsearch在安装后，不提供任何形式的安全防护不合理的配置导致公网可以访问ES集群。比如在elasticsearch.yml文件中,server.host配置为0.0.0.0

### 第 10 页

![Elasticsearch 教程配图（46-14 第10页 图1）](/中间件/elasticsearch/46-14/p10-page.png)

ES 8 默认启动了Security。ES 8.x 第一次启动之后会输出以下信息，此时服务已经启动成功了。

比如windows下第一次启动ES，会输出如下信息：

首次启动 Elasticsearch 时，会自动进行以下安全配置：

基于Security的安全认证------------------------------------------------------------------------------------------------------------------------1-> Elasticsearch security features have been automatically configured!

2-> Authentication is enabled and cluster connections are encrypted.

3

4->  Password for the elastic user (reset with `bin/elasticsearch-reset-password -uelastic`):5GFDGvf9kEuSaZrr=3eLt6

7->  HTTP CA certificate SHA-256 fingerprint:8f76d093b63225ea0866b4fcc1766293caf05c6ae152a9e95e3149afd74be5fa89

10->  Configure Kibana to use this cluster:11* Run Kibana and click the configuration link in the terminal when Kibana starts.

12* Copy the following enrollment token and paste it into Kibana in your browser (validfor the next 30 minutes):13

eyJ2ZXIiOiI4LjE0LjAiLCJhZHIiOlsiMTcyLjE5LjE3Ni4xOjkyMDAiXSwiZmdyIjoiZjc2ZDA5M2I2MzIyNWVhMDg2NmI0ZmNjMTc2NjI5M2NhZjA1YzZhZTE1MmE5ZTk1ZTMxNDlhZmQ3NGJlNWZhOCIsImtleSI6IjI1VW1jSkVCaXNrRWNrdjRYMXVzOlRWQjlMS2RwUkRTT2hjUmhWVGF2cUEifQ==14

15->  Configure other nodes to join this cluster:16* On this node:17- Create an enrollment token with `bin/elasticsearch-create-enrollment-token -snode`.

18- Uncomment the transport.host setting at the end of config/elasticsearch.yml.

19- Restart Elasticsearch.

20* On other nodes:21- Start Elasticsearch with `bin/elasticsearch --enrollment-token <token>`, using theenrollment token that you generated.

22------------------------------------------------------------------------------------------------------------------------23为传输层和 HTTP 层生成 TLS 证书和密钥。

TLS 配置设置被写入elasticsearch.yml。

### 第 11 页

![Elasticsearch 教程配图（46-14 第11页 图1）](/中间件/elasticsearch/46-14/p11-01.png)

在 ES 8.x版本以后，elasticsearch-setup-passwords设置密码的工具已经被弃用删除，此命令为7.x之前第一次生成密码时使用，8.x在第一次启动的时候会自动生密码。

如果需要修改账户密码，需进行以下操作：

访问服务在7.x的版本是通过如下地址访问ES服务：

但是在 8.x 的版本访问会看到如下页面：

原因解释这是正常现象，因为 Elastic 8 默认开启了 SSL，将默认配置项由true改为false即可推荐做法关闭SSL虽然可以访问服务了，但这本质上是在规避问题而非解决问题，更推荐的做法是使用https协议进行访问：

，此时如果你的浏览器版本是比较新的版本会出现以下弹窗提示，即：

为 elastic 用户生成密码。

为 Kibana 生成一个注册令牌。

修改账号密码

```
#为elastic账号自动生成新密码，输出至控制台
bin/elasticsearch-reset-password -u elastic
#手工指定用户的新密码
bin/elasticsearch-reset-password -u elastic -i
#指定服务地址和账户名
bin/elasticsearch-reset-password --url "https://ip:9200" -u elastic -i
```

验证服务状态http://localhost:9200/https://localhost:9200/

### 第 12 页

![Elasticsearch 教程配图（46-14 第12页 图1）](/中间件/elasticsearch/46-14/p12-page.png)

输入账号密码验证：

- 1）停止集群所有节点，并删除data目录2）以node-1为例，修改config/elasticsearch.yml配置文件3) 删除data目录（不删除会报错），然后启动node-1节点查看elasticsearch.yml配置文件，多出很多security相关配置4) 修改用户elastic的密码5）测试，访问

输入用户名密码

- 1）修改node-2和node-3的elasticsearch.yml配置文件2）向集群中加入新节点默认情况下，要向集群中添加新节点，需要通过令牌来完成节点之间的通信2.1）在node-1中执行下面的命令为新节点生成注册令牌2.2）以node-2为例，启动node-2节点，并带上注册令牌

三节点ES集群增加安全认证node-1增加安全认证

```
bin/elasticsearch -d
bin/elasticsearch-reset-password -u elastic -i
https://192.168.65.213:9200/
```

node-2和node-3加入集群

```
bin/elasticsearch-create-enrollment-token -s node
```

### 第 13 页

![Elasticsearch 教程配图（46-14 第13页 图1）](/中间件/elasticsearch/46-14/p13-page.png)

同上，启动node-3节点，并带上注册令牌注意：只有第一次加入集群需要带上注册令牌，后续启动不需要2.3）通过head插件查看集群

- 1）进入ES目录，生成kibana的注册令牌2) 进入kibana目录，通过下面的命令注册 Kibana3）直接启动Kibana服务然后我们访问Kibana：

输入用户名elastic和密码，进入kibana主界面

- 1）修改配置文件

```
bin/elasticsearch --enrollment-token <enrollment-token> -d
```

部署Kibana

```
bin/elasticsearch-create-enrollment-token -s kibana
bin/kibana-setup --enrollment-token <enrollment-token>
nohup bin/kibana &
http://192.168.65.213:5601/
```

部署cerebro

### 第 14 页

![Elasticsearch 教程配图（46-14 第14页 图1）](/中间件/elasticsearch/46-14/p14-page.png)

- 2) 启动cerebro服务访问：

```
vim conf/application.conf
```

2hosts = [3

```
{
host = "https://192.168.65.207:9200"
name = "es-cluster"
auth = {
username = "elastic"
password = "123456"
}
}
]
```

13

```
nohup bin/cerebro -Dplay.ws.ssl.loose.acceptAnyCertificate=true  &
http://192.168.65.207:9000/
```

---

## 小结

- 本篇为 Elasticsearch 系列第 8/10 篇，主题：**Elasticsearch 高可用集群架构**。
- 建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。
- 系列文章路径前缀：`/中间件/elasticsearch/`。

下一篇：[《ES 集群生产实践与性能调优》](/中间件/elasticsearch/es-09-production)
