---
title: Prometheus 第3章：安装与上手
sidebarGroup: 可观测性
shortTitle: 15 安装与上手
order: 15
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第3章（安装与上手）合并笔记
---

> **Prometheus · 第 3 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 3.1 prometheus二进制安装

# 本节重点介绍 :

- 二进制安装prometheus，使用systemd托管服务

# 二进制安装prometheus

> 下载prometheus

- https://github.com/prometheus/prometheus/releases/download/v2.29.1/prometheus-2.29.1.linux-amd64.tar.gz

> 解压到指定目录

```shell
mkdir /opt/app
tar xvf prometheus-2.29.1.linux-amd64.tar.gz -C /opt/app

mv /opt/app/prometheus-2.29.1.linux-amd64 /opt/app/prometheus
```

> 准备service文件

```shell

cat <<-"EOF" > /etc/systemd/system/prometheus.service
[Unit]
Description="prometheus"
Documentation=https://prometheus.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/prometheus/prometheus  --config.file=/opt/app/prometheus/prometheus.yml --storage.tsdb.path=/opt/app/prometheus/data --web.enable-lifecycle

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=655360
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=prometheus

[Install]
WantedBy=multi-user.target
EOF

```

> 启动prometheus 服务

```shell
systemctl daemon-reload
systemctl restart prometheus
systemctl status prometheus

```

> 检查prometheus服务

```shell

# 查看端口 进程 日志
ss -ntlp |grep 9090
ps -ef |grep prometheus |grep -v grep 

tail -100  /var/log/messages |grep prometheus

```

# 本节重点总结 :

- 二进制安装prometheus，使用systemd托管服务

## 3.2ui功能讲解之graph页面

# 文档链接
- http://fynote.com/detail/MjU0Nw==
# 本节重点介绍 :

- graph页面
- target页面
- flags页面
- status页面
- tsdb-status页面

# 访问地址 $ip:9090

# graph页面

- autocomplete 可以补全metrics tag信息或者 内置的关键字 ，如sum聚合函数
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628856931000/34effc8bb8a8457695149dfac259e5d8.png)
- table查询 instante查询， 一个点的查询
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628856931000/018db810163f4614b54abf69c762faf5.png)
- graph查询
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628856931000/491ef64a08c246a79432e87bc192b67f.png)
- 调整分辨率  resolution
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628856931000/65338422679a49a79044dc385e824fa4.png)

# 本节重点总结 :

- graph页面
- target页面
- flags页面
- status页面
- tsdb-status页面

## 3.3prometheus命令行参数讲解

# 本节重点介绍 :

- target页面
- flags页面
- status页面
- tsdb-status页面

# 访问地址 $ip:9090

# target页面

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/78439ddafcc14d6f98179730adad56f9.png)

# flags页面

- 展示命令行参数的，没设置的取默认值
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/c7c380fd8f9546b7bfdb5545060559ad.png)

# status页面

- 描述运行信息和编译的信息

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/0a3c20d6f03a4782a0ee30debc98524a.png)

# tsdb-status页面

- 打印存储的运行状态信息
- 帮我们定位重查询的

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/f9cda8fef0204e80806f96e0b69b2a4f.png)

# 服务发现页面

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/61c9c139916d40acbd146900b045d937.png)

# 本节重点总结 :

- target页面 展示采集任务的
- flags页面 命令行参数
- status页面  编译信息和运行信息
- tsdb-status页面 存储信息

## 3.4 prometheus配置文件和6大模块讲解

# 本节重点介绍 : 
- prometheus配置文件6个大配置段的含义 
- 了解prometheus 根据不同配置可以充当不同的角色/模块

# prometheus配置文件 解析

## 各个大配置段的含义 

```yaml

# 全局配置段
global:
  # 采集间隔 
  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  # 计算报警和预聚合间隔
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  # 采集超时时间
  scrape_timeout: 10s 
  # 查询日志，包含各阶段耗时统计
  query_log_file: /opt/logs/prometheus_query_log
  # 全局标签组
  # 通过本实例采集的数据都会叠加下面的标签
  external_labels:
    account: 'huawei-main'
    region: 'beijng-01'

# Alertmanager信息段
alerting:
  alertmanagers:
  - scheme: http
    static_configs:
    - targets:
      - "localhost:9093"

# 告警、预聚合配置文件段
rule_files:
    - /etc/prometheus/rules/record.yml
    - /etc/prometheus/rules/alert.yml

# 采集配置段
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'prometheus'

    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.

    static_configs:
    - targets: ['localhost:9090']

# 远程查询段
remote_read:
  # prometheus 
  - url: http://prometheus/v1/read
    read_recent: true

  # m3db 
  - url: "http://m3coordinator-read:7201/api/v1/prom/remote/read"
    read_recent: true

# 远程写入段
remote_write:
  - url: "http://m3coordinator-write:7201/api/v1/prom/remote/write"
    queue_config:
      capacity: 10000
      max_samples_per_send: 60000
    write_relabel_configs:
      - source_labels: [__name__]
        separator: ;
        # 标签key前缀匹配到的drop
        regex: '(kubelet_|apiserver_|container_fs_).*'
        replacement: $1
        action: drop
```

- 所以prometheus实例可以用来做下列用途

|  对应的配置段   | 用途|
|  ----  | ----  | 
| 采集配置段	| 做采集器，数据保存在本地|
| 采集配置段 + 远程写入段| 做采集器+传输器，数据保存在本地+远端存储|
| 远程查询段| 做查询器，查询远端存储数据|
| 采集配置段 + 远程查询段| 做采集器+查询器，查询本地数据+远端存储数据 |
| 采集配置段 + Alertmanager信息段 + 告警配置文件段 | 做采集器+告警触发器，查询本地数据生成报警发往Alertmanager |
| 远程查询段 + Alertmanager信息段 + 告警配置文件段 | 做远程告警触发器，查询远端数据生成报警发往Alertmanager |
| 远程查询段+远程写入段  + 预聚合配置文件段 | 做预聚合指标，生成的结果集指标写入远端存储 |

- 优秀的开源项目大多是模块化的，根据配置来决定开启哪些配置

# 本节重点总结 : 
- prometheus配置文件各个大配置段
    - scrape_configs 采集配置段 做采集器
    - rule_files 告警、预聚合配置文件段
    - remote_read 远程查询段
    - remote_write 远程写入段
    - alerting: Alertmanager信息段
- 了解prometheus 根据不同配置可以充当不同的角色/模块

## 3.5 static_configs采集配置源码解读

# 本节重点介绍 :

- 采集段静态配置的解释
- static_configs解析相关源码解读

## 采集段的解释

- 采集段是以job为单位配置的

```yaml
# 采集配置段
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'prometheus'

    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.

    static_configs:
    - targets: ['localhost:9090']
```

- target页面上可以看到相关的job
- ![p04.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628858278000/f7efa23088394f3db80d7bd5e655f041.png)
- 采集段中有很多配置项目，在页面上观察配置文件可以看到补全的信息

```yaml
- job_name: prometheus
  # true代表使用原始数据的时间戳，false代表使用prometheus采集器的时间戳
  honor_timestamps: true
  # 多久执行一次采集，就是这个job 多久执行一次
  scrape_interval: 15s
  # 采集的超时
  scrape_timeout: 15s
  # 就是采集target的 metric暴露 http path，默认是/metrics ,比如探针型的就是/probe
  metrics_path: /metrics
  # 采集目标的协议 是否是https
  scheme: http
  # 是否跟踪 redirect 
  follow_redirects: true
  static_configs:
  - targets:
    - localhost:9090
```

> 查看源码

- D:\go_path\src\github.com\prometheus\prometheus\config\config.go +380
- 可以看到全量的配置项

```golang
type ScrapeConfig struct {
	// The job name to which the job label is set by default.
	JobName string `yaml:"job_name"`
	// Indicator whether the scraped metrics should remain unmodified.
	HonorLabels bool `yaml:"honor_labels,omitempty"`
	// Indicator whether the scraped timestamps should be respected.
	HonorTimestamps bool `yaml:"honor_timestamps"`
	// A set of query parameters with which the target is scraped.
	Params url.Values `yaml:"params,omitempty"`
	// How frequently to scrape the targets of this scrape config.
	ScrapeInterval model.Duration `yaml:"scrape_interval,omitempty"`
	// The timeout for scraping targets of this config.
	ScrapeTimeout model.Duration `yaml:"scrape_timeout,omitempty"`
	// The HTTP resource path on which to fetch metrics from targets.
	MetricsPath string `yaml:"metrics_path,omitempty"`
	// The URL scheme with which to fetch metrics from targets.
	Scheme string `yaml:"scheme,omitempty"`
	// An uncompressed response body larger than this many bytes will cause the
	// scrape to fail. 0 means no limit.
	BodySizeLimit units.Base2Bytes `yaml:"body_size_limit,omitempty"`
	// More than this many samples post metric-relabeling will cause the scrape to
	// fail.
	SampleLimit uint `yaml:"sample_limit,omitempty"`
	// More than this many targets after the target relabeling will cause the
	// scrapes to fail.
	TargetLimit uint `yaml:"target_limit,omitempty"`
	// More than this many labels post metric-relabeling will cause the scrape to
	// fail.
	LabelLimit uint `yaml:"label_limit,omitempty"`
	// More than this label name length post metric-relabeling will cause the
	// scrape to fail.
	LabelNameLengthLimit uint `yaml:"label_name_length_limit,omitempty"`
	// More than this label value length post metric-relabeling will cause the
	// scrape to fail.
	LabelValueLengthLimit uint `yaml:"label_value_length_limit,omitempty"`

	// We cannot do proper Go type embedding below as the parser will then parse
	// values arbitrarily into the overflow maps of further-down types.

	ServiceDiscoveryConfigs discovery.Configs       `yaml:"-"`
	HTTPClientConfig        config.HTTPClientConfig `yaml:",inline"`

	// List of target relabel configurations.
	RelabelConfigs []*relabel.Config `yaml:"relabel_configs,omitempty"`
	// List of metric relabel configurations.
	MetricRelabelConfigs []*relabel.Config `yaml:"metric_relabel_configs,omitempty"`
}
```

- static_configs 段代表静态配置采集的端点
- 为何在上述ScrapeConfig配置段中没有找到 static_configs配置项，这又是怎么回事呢

## 源码搜索思路

- 在prometheus 源码目录搜索  static_configs![p01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628858278000/d61ee1b59d3045cd9937af7fecf53c4b.png)
- 发现 在文件 D:\go_path\src\github.com\prometheus\prometheus\discovery\registry.go中有

![p02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628858278000/74173fc81bc44cfd9807e429e59b0232.png)

- 看到这里 在registry.go中 的init 函数会在包自动导入的时候注册static_configs 到configFields中
- 所有服务发现都会在各自包中的init方法自动注册自己

> 追查 configFields是干什么用的

- D:\go_path\src\github.com\prometheus\prometheus\config\config.go
- ScrapeConfig实现了 yaml的Unmarshaler接口 中的UnmarshalYAML方法
- 所以在yaml解析的时候 ScrapeConfig字段时会调用这个UnmarshalYAML方法

```golang
func (c *ScrapeConfig) UnmarshalYAML(unmarshal func(interface{}) error) error {
	*c = DefaultScrapeConfig
	if err := discovery.UnmarshalYAMLWithInlineConfigs(c, unmarshal); err != nil {
		return err
	}
```

- UnmarshalYAMLWithInlineConfigs中 调用 getConfigType
- getConfigType方法中操作了configFields结构体
- 总结：

  - ScrapeConfig使用指定的UnmarshalYAML方法
  - 当中会去判断采用的是静态配置还是 服务发现的
  - 这样写的好处是不需要通过if-else判断，而且每种服务发现的配置是不一样的

# 本节重点总结 :

- prometheus的采集任务以job为单位
- prometheus充当http client 根据job中配置的 schema等信息去 ，target中配置的地址采集数据

## 3.6 prometheus命令行参数讲解

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

## 3.7 热更新源码解读

# 本节重点介绍 :

- prometheus 热更新源码解读

## --web.enable-lifecycle代表开启热更新配置

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

## 源码解读

- D:\go_path\src\github.com\prometheus\prometheus\cmd\prometheus\main.go

```go

	a.Flag("web.enable-lifecycle", "Enable shutdown and reload via HTTP request.").
		Default("false").BoolVar(&cfg.web.EnableLifecycle)
```

- main中 web.enable-lifecycle命令行参数被赋值给 cfg.web.EnableLifecycle
- 追踪这个 bool类型的字段 D:\go_path\src\github.com\prometheus\prometheus\web\web.go

```go
	if o.EnableLifecycle {
		router.Post("/-/quit", h.quit)
		router.Put("/-/quit", h.quit)
		router.Post("/-/reload", h.reload)
		router.Put("/-/reload", h.reload)
    }
```

- 说明开启这个参数后，web 路由中就开启了reload方法，这个和我们发送的 reload 请求一致
- 追踪这个http方法中的内容

```go
func (h *Handler) reload(w http.ResponseWriter, r *http.Request) {
	rc := make(chan error)
	h.reloadCh <- rc
	if err := <-rc; err != nil {
		http.Error(w, fmt.Sprintf("failed to reload config: %s", err), http.StatusInternalServerError)
	}
}
```

- 发现向 h.reloadCh 塞入一个chan
- 继续追踪发现  在main中有监听这个chan的方法

```go
 
					case rc := <-webHandler.Reload():
						if err := reloadConfig(cfg.configFile, cfg.enableExpandExternalLabels, cfg.tsdb.EnableExemplarStorage, logger, noStepSubqueryInterval, reloaders...); err != nil {
							level.Error(logger).Log("msg", "Error reloading config", "err", err)
							rc <- err
						} else {
							rc <- nil
						}
```

- 至此我们发现 server收到 reload命令后会执行这个reloadConfig函数

```go
	conf, err := config.LoadFile(filename, expandExternalLabels, logger)
	if err != nil {
		return errors.Wrapf(err, "couldn't load configuration (--config.file=%q)", filename)
	}

	if enableExemplarStorage {
		if conf.StorageConfig.ExemplarsConfig == nil {
			conf.StorageConfig.ExemplarsConfig = &config.DefaultExemplarsConfig
		}
	}

	failed := false
	for _, rl := range rls {
		rstart := time.Now()
		if err := rl.reloader(conf); err != nil {
			level.Error(logger).Log("msg", "Failed to apply configuration", "err", err)
			failed = true
		}
		timings = append(timings, rl.name, time.Since(rstart))
	}
```

- reloadConfig主要干两件事：

  - 先读取一下配置文件
  - 然后遍历reloader对象，执行他们的 reload方法即可
- reloaders切片的内容为 ，每个配置的小模块名和他们要执行的reload方法

```go

	reloaders := []reloader{
		{
			name:     "db_storage",
			reloader: localStorage.ApplyConfig,
		}, {
			name:     "remote_storage",
			reloader: remoteStorage.ApplyConfig,
		}, {
			name:     "web_handler",
			reloader: webHandler.ApplyConfig,
		}, {
			name: "query_engine",
			reloader: func(cfg *config.Config) error {
				if cfg.GlobalConfig.QueryLogFile == "" {
					queryEngine.SetQueryLogger(nil)
					return nil
				}

				l, err := logging.NewJSONFileLogger(cfg.GlobalConfig.QueryLogFile)
				if err != nil {
					return err
				}
				queryEngine.SetQueryLogger(l)
				return nil
			},
		}, {
			// The Scrape and notifier managers need to reload before the Discovery manager as
			// they need to read the most updated config when receiving the new targets list.
			name:     "scrape",
			reloader: scrapeManager.ApplyConfig,
```

- 那么我们刚才修改了采集段中的配置，那么调用的就是 scrapeManager.ApplyConfig

## scrapeManager.ApplyConfig这个函数 分析

- 主要 通过 对比 	scrapeConfigs map[string]*config.ScrapeConfig
- scrapePools   map[string]*scrapePool
- 的区别，如果 key在本次配置中 但不在上次的缓存中 scrapePools，那么删除
- 否则使用 reflect.DeepEqual对比job配置是否发生细微变化

```go
func (m *Manager) ApplyConfig(cfg *config.Config) error {
	m.mtxScrape.Lock()
	defer m.mtxScrape.Unlock()

	c := make(map[string]*config.ScrapeConfig)
	for _, scfg := range cfg.ScrapeConfigs {
		c[scfg.JobName] = scfg
	}
	m.scrapeConfigs = c

	if err := m.setJitterSeed(cfg.GlobalConfig.ExternalLabels); err != nil {
		return err
	}

	// Cleanup and reload pool if the configuration has changed.
	var failed bool
	for name, sp := range m.scrapePools {
		if cfg, ok := m.scrapeConfigs[name]; !ok {
			sp.stop()
			delete(m.scrapePools, name)
		} else if !reflect.DeepEqual(sp.config, cfg) {
			err := sp.reload(cfg)
			if err != nil {
				level.Error(m.logger).Log("msg", "error reloading scrape pool", "err", err, "scrape_pool", name)
				failed = true
			}
		}
	}

	if failed {
		return errors.New("failed to apply the new configuration")
	}
	return nil
```

# 本节重点总结 :

- 通过chan 传递热更新的动作
- main中执行相关的reload命令
- 对比这次 scrapeConfigs和上次 scrapePools的配置
- 进行增量更新
- reflect.DeepEqual对比结构体是否相同

