---
title: "3.6 prometheus命令行参数讲解"
sidebarGroup: "Prometheus"
shortTitle: "85 3.6 prometheus命令行参数讲解"
order: 85
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - prometheus 高频修改的命令行参数解读 命令行参数 - 在页面的/flags 页面上能看到所有的命令行参数 二进制 --help shell [root@k8s-node..."
---

> **Prometheus · 第 85 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- prometheus 高频修改的命令行参数解读

# 命令行参数

- 在页面的/flags 页面上能看到所有的命令行参数![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628917742000/7d45bcd946e04c599743aa23c87a7799.png)

> 二进制 --help

```shell
[root@k8s-node01 prometheus]# ./prometheus --help
usage: prometheus [<flags>]

The Prometheus monitoring server

Flags:
  -h, --help                     Show context-sensitive help (also try --help-long and --help-man).
      --version                  Show application version.
      --config.file="prometheus.yml"  
                                 Prometheus configuration file path.
      --web.listen-address="0.0.0.0:9090"  
                                 Address to listen on for UI, API, and telemetry.
      --web.config.file=""       [EXPERIMENTAL] Path to configuration file that can enable TLS or authentication.
      --web.read-timeout=5m      Maximum duration before timing out read of the request, and closing idle connections.
      --web.max-connections=512  Maximum number of simultaneous connections.
      --web.external-url=<URL>   The URL under which Prometheus is externally reachable (for example, if Prometheus is served via a reverse proxy). Used for generating relative and absolute links back to Prometheus itself. If the URL
                                 has a path portion, it will be used to prefix all HTTP endpoints served by Prometheus. If omitted, relevant URL components will be derived automatically.
      --web.route-prefix=<path>  Prefix for the internal routes of web endpoints. Defaults to path of --web.external-url.
      --web.user-assets=<path>   Path to static asset directory, available at /user.
      --web.enable-lifecycle     Enable shutdown and reload via HTTP request.
      --web.enable-admin-api     Enable API endpoints for admin control actions.
      --web.console.templates="consoles"  
                                 Path to the console template directory, available at /consoles.
      --web.console.libraries="console_libraries"  
                                 Path to the console library directory.
      --web.page-title="Prometheus Time Series Collection and Processing Server"  
                                 Document title of Prometheus instance.
      --web.cors.origin=".*"     Regex for CORS origin. It is fully anchored. Example: 'https?://(domain1|domain2)\.com'
      --storage.tsdb.path="data/"  
                                 Base path for metrics storage.
      --storage.tsdb.retention=STORAGE.TSDB.RETENTION  
                                 [DEPRECATED] How long to retain samples in storage. This flag has been deprecated, use "storage.tsdb.retention.time" instead.
      --storage.tsdb.retention.time=STORAGE.TSDB.RETENTION.TIME  
                                 How long to retain samples in storage. When this flag is set it overrides "storage.tsdb.retention". If neither this flag nor "storage.tsdb.retention" nor "storage.tsdb.retention.size" is set, the
                                 retention time defaults to 15d. Units Supported: y, w, d, h, m, s, ms.
      --storage.tsdb.retention.size=STORAGE.TSDB.RETENTION.SIZE  
                                 Maximum number of bytes that can be stored for blocks. A unit is required, supported units: B, KB, MB, GB, TB, PB, EB. Ex: "512MB".
      --storage.tsdb.no-lockfile  
                                 Do not create lockfile in data directory.
      --storage.tsdb.allow-overlapping-blocks  
                                 Allow overlapping blocks, which in turn enables vertical compaction and vertical query merge.
      --storage.remote.flush-deadline=<duration>  
                                 How long to wait flushing sample on shutdown or config reload.
      --storage.remote.read-sample-limit=5e7  
                                 Maximum overall number of samples to return via the remote read interface, in a single query. 0 means no limit. This limit is ignored for streamed response types.
      --storage.remote.read-concurrent-limit=10  
                                 Maximum number of concurrent remote read calls. 0 means no limit.
      --storage.remote.read-max-bytes-in-frame=1048576  
                                 Maximum number of bytes in a single frame for streaming remote read response types before marshalling. Note that client might have limit on frame size as well. 1MB as recommended by protobuf by
                                 default.
      --rules.alert.for-outage-tolerance=1h  
                                 Max time to tolerate prometheus outage for restoring "for" state of alert.
      --rules.alert.for-grace-period=10m  
                                 Minimum duration between alert and restored "for" state. This is maintained only for alerts with configured "for" time greater than grace period.
      --rules.alert.resend-delay=1m  
                                 Minimum amount of time to wait before resending an alert to Alertmanager.
      --alertmanager.notification-queue-capacity=10000  
                                 The capacity of the queue for pending Alertmanager notifications.
      --query.lookback-delta=5m  The maximum lookback duration for retrieving metrics during expression evaluations and federation.
      --query.timeout=2m         Maximum time a query may take before being aborted.
      --query.max-concurrency=20  
                                 Maximum number of queries executed concurrently.
      --query.max-samples=50000000  
                                 Maximum number of samples a single query can load into memory. Note that queries will fail if they try to load more samples than this into memory, so this also limits the number of samples a query can
                                 return.
      --enable-feature= ...      Comma separated feature names to enable. Valid options: promql-at-modifier, promql-negative-offset, remote-write-receiver, exemplar-storage, expand-external-labels. See
                                 https://prometheus.io/docs/prometheus/latest/feature_flags/ for more details.
      --log.level=info           Only log messages with the given severity or above. One of: [debug, info, warn, error]
      --log.format=logfmt        Output format of log messages. One of: [logfmt, json]

```

> 以首字母升序排列，而且也是分模块的

> 挑几个重要的参数讲解一下

- --web.listen-address="0.0.0.0:9090"

  - 代表prometheus监听的地址
  - 多个prometheus实例在一起时候会争抢
- --storage.tsdb.path="data/"  本地tsdb存储位置

```shell
[root@k8s-node01 prometheus]# pwd  
/opt/app/prometheus
[root@k8s-node01 prometheus]# find data
data
data/queries.active
data/lock
data/wal
data/wal/00000000
data/wal/00000001
data/wal/00000002
data/chunks_head
data/chunks_head/000002
data/chunks_head/000003
data/01FCZ27ENH6XN0RCYC1Z6YDBDW
data/01FCZ27ENH6XN0RCYC1Z6YDBDW/chunks
data/01FCZ27ENH6XN0RCYC1Z6YDBDW/chunks/000001
data/01FCZ27ENH6XN0RCYC1Z6YDBDW/index
data/01FCZ27ENH6XN0RCYC1Z6YDBDW/meta.json
data/01FCZ27ENH6XN0RCYC1Z6YDBDW/tombstones
data/01FCZ4Z259A6HJB7XSJT94QVD5
data/01FCZ4Z259A6HJB7XSJT94QVD5/chunks
data/01FCZ4Z259A6HJB7XSJT94QVD5/chunks/000001
data/01FCZ4Z259A6HJB7XSJT94QVD5/index
data/01FCZ4Z259A6HJB7XSJT94QVD5/meta.json
data/01FCZ4Z259A6HJB7XSJT94QVD5/tombstones
[root@k8s-node01 prometheus]# 
```

- --storage.tsdb.retention.time 代表数据保留时间 默认15天

> --web.enable-lifecycle代表开启热更新配置

- 修改配置文件
- 发http 请求

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
< Date: Fri, 13 Aug 2021 07:14:51 GMT
< Content-Length: 0
< 
* Connection #0 to host localhost left intact
```

- 观察配置文件已经重新加载过了

# 本节重点总结 :

- --web.listen-address 代表prometheus监听的地址
- --storage.tsdb.path  本地tsdb存储位置
- --storage.tsdb.retention.time 代表数据保留时间 默认15天
  --web.enable-lifecycle代表开启热更新配置

