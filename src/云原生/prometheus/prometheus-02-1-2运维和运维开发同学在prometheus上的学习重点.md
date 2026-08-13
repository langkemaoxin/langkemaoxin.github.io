---
title: "1.2运维和运维开发同学在prometheus上的学习重点"
sidebarGroup: "Prometheus"
shortTitle: "02 1.2运维和运维开发同学在prometheu..."
order: 2
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : 运维和运维开发同学在prometheus的侧重点 - 运维：调参优化 - 运维开发/开发 : 二次开发or开发周边组件 运维同学学习一线大厂监控调优实战 - 简单说运维重调参，高可用..."
---

> **Prometheus · 第 2 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

