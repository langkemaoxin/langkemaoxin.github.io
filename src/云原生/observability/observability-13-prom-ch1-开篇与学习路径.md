---
title: Prometheus 第1章：开篇与学习路径
sidebarGroup: 可观测性
shortTitle: 13 开篇与学习路径
order: 13
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第1章（开篇与学习路径）合并笔记
---

> **Prometheus · 第 1 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 1.1为什么学透prometheus可以进大厂

# 本节重点介绍 :为什么学透prometheus可以进大厂

- 监控系统在基础架构中的重要位置，如何为其他系统提供决策数据
- 互联网有大厂专门的监控开发团队，2-10人
- prometheus的火热程度，作为CNCF顶级项目，是学习go语言的标杆
- 为何大厂监控开发招聘要求熟悉prometheus
- 大厂搞不定的prometheus问题有哪些

# 监控系统在基础架构中的重要位置

> 为资产系统提供统计能力

![01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/37ac351dd10f4984b6118ba6938d6025.png)

> 为k8s平台提供监控数据

![k8s01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/21e0e15759704bb5a12631261f8a0349.png)

> 为灰度发布提供决策数据

![cicd01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/e2f5e8cace994b5bbe6ba20c156540d6.png)

> 提供流量探针数据

![01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/526ee575103d4d78a9849f83414d89c6.png)

- 总结：基础架构不能离开监控系统

# 互联网大厂有专门的监控开发团队

## 专门的监控工程师岗位

![mon01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/5a21aa75795140dcbc01b2a216402923.png)

![mon02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/ca05e775e3e84622a01f338c9d7b256a.png)

## 运维开发工程师中 也会要求监控知识

![mon03.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/43d309565ad24333a9ddd2affccfb9fe.png)

- 熟悉开源的监控软件(Zabbix/Open-Falcon/Prometheus)中的一种；

![mon04.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/5b70ac34160b4021807729855df98aa5.png)

# 为何大厂监控开发招聘要求熟悉prometheus

- prometheus以丰富的promql实时查询聚合引擎
- 强悍的性能：单机千万级别并发写入的qps
- 云原生等特性： k8s监控的不二选择

## prometheus官网主页介绍

![p01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628852711000/71a3ad7120e04edf831a50a765dcb52e.png)

## prometheus到底有多火热

- 各个领域的大神给它贡献的exporter   [exporter地址](https://prometheus.io/docs/instrumenting/exporters/)

  - 开源项目的参与者越多说明越火热
- 可以从集成了它sdk的情况来看 [sdk集成情况](https://prometheus.io/docs/instrumenting/exporters/#software-exposing-prometheus-metrics)

  - 集成说明大家认可它，愿意以侵入式的sdk打点暴露指标
- db ranking 给出的数据 [ranking数据](https://db-engines.com/en/ranking/time+series+dbms)

# 大厂搞不定的prometheus问题有哪些

- 存储高可用
- 高基数查询延迟和资源开销高
- 采集端exporter难以管理
- 长期查询降采样
- 配置文件操作麻烦

# 总结

- 监控系统是运维之眼，如同水、电、煤气一般的存在
- 而prometheus作为CNCF顶级项目，和k8s紧密结合已经成为时序监控的老大
- 互联网大厂会组建专门的监控开发团队，少则2人，多则10多人
- 大厂监控开发招聘要求熟悉prometheus
- 同时需要搞定诸如 高可用 ，高并发调优的问题

> 所以掌握prometheus底层原理，并有性能提升实战项目经验可助力斩获大厂监控运维开发offer

## 1.2运维和运维开发同学在prometheus上的学习重点

# 本节重点介绍 : 运维和运维开发同学在prometheus的侧重点

- 运维：调参优化
- 运维开发/开发 : 二次开发or开发周边组件

# 运维同学学习一线大厂监控调优实战

- 简单说运维重调参，高可用改造，写代码较少

## prometheus使用和调参

> 命令行参数

![p01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/b0bda409f4fe4c82a0796f86760120a6.png)

- prometheus本身 40+的命令行参数参数可供调整
- 那么了解每个参数的含义，调整成多少更合适很要必要研究一下吧

> 配置文件中的参数

- global段

```yaml
global:
  scrape_interval: 15s
  scrape_timeout: 15s
  evaluation_interval: 15s
  query_log_file: /opt/logs/prometheus_query_log
  external_labels:
    app2: thanos
```

- alerting段

```yaml
alerting:
  alertmanagers:
  - follow_redirects: true
    scheme: http
    timeout: 10s
    api_version: v1
    static_configs:
    - targets:
      - localhost:9093
```

- scrape段，证书配置，relabel配置

```yaml
scrape_configs:
- job_name: kube-etcd
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /metrics
  scheme: https
  authorization:
    type: Bearer
    credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    ca_file: /etc/prometheus/secrets/etcd-certs/ca.crt
    cert_file: /etc/prometheus/secrets/etcd-certs/healthcheck-client.crt
    key_file: /etc/prometheus/secrets/etcd-certs/healthcheck-client.key
    insecure_skip_verify: true
  follow_redirects: true
  relabel_configs:
  - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name]
    separator: ;
    regex: kube-system;kube-etcd
    replacement: $1
    action: keep
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
```

- promql![k8s012.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/044ae8f9e5e4432d918e95bd70e0a5c3.png)

## grafana

- 复杂的grafana 配置 和 promql编写![g01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/5515bf61d62f4fa8b1c20e19d13b757b.png)

## 存储

> m3db

![m301.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/622b9e6767f64a35aa25a83d374fda70.png)

- 配置文件

![m302.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/6db39c78ddfc47afa81291ff7c675483.png)

> thanos

![sidecar.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/7c9b91730cd14a1bbf8a0a7fceb21453.png)

## 总结

- 运维同学不写代码在prometheus也能有很多优化点
- 配置调优，高可用改造，存储调优
- promql维护

# 运维开发同学深入了解prometheus源码，二次开发or 开发新组件

## 源码展示

> goroutine 编排

![s01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/18e119dd1f844aa8af54f9d893788c18.png)

- 应用![s02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/1f8a873b92d0406eba02f52fc2e39b51.png)

> 倒排索引

- 应用![s03.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/9829826675ef4eaf95152dfd43fc295b.png)

> 热更新

- 源码
- ![s05.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/f3f032ab6e074cde82783e554e9e6fe3.png)
- 使用

```shell
[root@k8s-node01 prometheus]# curl -X POST -vvv  localhost:9090/-/reload 
* About to connect() to localhost port 9090 (#0)
*   Trying 127.0.0.1...
* Connected to localhost (127.0.0.1) port 9090 (#0)
> POST /-/reload HTTP/1.1
> User-Agent: curl/7.29.0
> Host: localhost:9090
> Accept: */*
> 
< HTTP/1.1 200 OK
< Date: Thu, 12 Aug 2021 12:27:00 GMT
< Content-Length: 0
< 
* Connection #0 to host localhost left intact
```

> dod压缩算法

- 源码![s06.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/4553a86eb6264a7da8dcb2469bd60e25.png)

## 周边项目

- 用动态分片解决pushgateway高可用![s07.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/a99864fe42ba47daa750c1b6d9d00be9.png)
- 采用预聚合给重查询加速30-100项目![s08.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/7bf8837a39034eb4a93b6bb8417e63d7.png)
- 使用prometheus 倒排索引编写 带统计功能的服务树![s09.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/355ff22edc8240dab5422f5848842573.png)
- 参考blackbox_exporter 编写分布式网络探测项目![s10.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/6314dca35cb44ef287e0622bedcc463d.png)
- 使用consul+动态分片 实现prometheus采集端高可用项目![s11.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628853308000/0f9cbabc71f748cfbebdbb8e3457c117.png)

# 本节总结：

## 对运维

- 组件使用
  - 告警、查询表达式配置，grafana大盘
- 生态圈内的组件调参
- 时序存储选型和优化
- 单点改造为高可用架构

## 对运维开发

- prometheus源码中很有可以借鉴的优秀设计模式
- 有很多可以直接拿来用的类库
- 原版prometheus项目在高并发高可用上有不足，可以写周边项目补足
- prometheus代表了时序监控的行业标准：做监控的必须要研究

## 1.3 为什么本节课的老师最专业

# 本节重点介绍 : 为什么本节课的老师最专业

- 多年一线互联公司监控系统架构经验，原字节跳动基础监控核心开发人员
- 对OpenFalcon有深度二次开发经验，滴滴夜莺核心开发人员之一
- 熟读Prometheus源码、贡献多个周边开源项目

# 多年一线互联公司监控系统架构经验

## 原字节跳动基础监控核心开发人员

- 在开源版open-falcon基础上做很很多深度的二次开发工作
- ![a02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/63fb33025c804c69819a0a56e84a39a0.png)
- ![a03.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/4837a4dcfb104d59ab9c47be7eb4cd70.png)![a04.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/27aa5afec9da407c9caa10bd23139225.png)

## 滴滴夜莺核心开发人员之一

- 夜莺k8s监控组件开发者 https://github.com/n9e/k8s-mon![b01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/426d8128320e43fdb9ccebded6851f33.png)
- 持续贡献代码，被merge![b02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/2bec7ba4c41a4d2ebb5944cb51f6293f.png)

## 熟读Prometheus源码、贡献多个周边开源项目

- github首页![a01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/f9c375b8c0d4415ba55897cea976e7d6.png)
- 发表多篇prometheus 底层原理文章![c01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/889161ba46aa4e0babdd724f8d31b094.png)
-
- ![c02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628854399000/7306159bf8d946c191138c273f9d59ba.png)

# 本节总结

- 七年运维、运维开发从业经验
- 先后就职于 多家一线互联网公司
- 从事基础架构研发工作
- 对开源版open-falcon有深度二次开发经验，开源多个prometheus监控系统相关项目，发表过多篇监控系统原理性文章

