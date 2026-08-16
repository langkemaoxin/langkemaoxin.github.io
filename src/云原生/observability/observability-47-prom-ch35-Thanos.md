---
title: Prometheus 第35章：Thanos
sidebarGroup: 可观测性
shortTitle: 47 Thanos
order: 47
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第35章（Thanos）合并笔记
---

> **Prometheus · 第 35 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 35.1 thanos项目介绍和二进制部署

# 本节重点介绍 :
- 核心优点
    - 无需维护存储，存储高可用： 利用廉价的公有云对象存储，高可用
    - 长时间存储，数据降采样：利用Compactor降采样
    - 完全适配原生prometheus查询接口：Query实现
    - 多级数据缓存配置
- 二进制部署

# thanos简介
- [项目地址](https://github.com/thanos-io/thanos)
- [文档地址](https://thanos.io/)

## 组件简介
- Sidecar：连接到 Prometheus，读取其数据进行查询和/或将其上传到云存储。
- Store Gateway：在云存储桶内提供指标
- Compactor：对存储在云存储桶中的数据进行压缩、下采样和 清理过期数据
- Receiver： 从 Prometheus  的WAL接收远程写入数据，将其公开和/或将其上传到云存储
- Ruler/Rule:  针对Thanos 中的数据 进行告警或预聚合工作，进行展示和/或上传
- Querier/Query: 实现 Prometheus 的 v1 API 来聚合来自底层组件的数据
- Query Frontend：实现 Prometheus 的 v1 API，将其代理到 Query，同时缓存响应并按查询日进行可选拆分

## 架构图
- sidecar形式部署
> （配图缺失：image）
- receiver形式部署
> （配图缺失：image）

## 核心优点
- 无需维护存储，存储高可用： 利用廉价的公有云对象存储，高可用
- 长时间存储，数据降采样：利用Compactor降采样
- 完全适配原生prometheus查询接口：Query实现
- 多级数据缓存配置

# 部署thanos
- 下载 thanos 
```shell script
wget https://github.com/thanos-io/thanos/releases/download/v0.22.0/thanos-0.22.0.linux-amd64.tar.gz

```
## 步骤1 部署prometheus
### 关闭Prometheus采集器的本地数据压实 
- 使用sidecar模式时，需要关闭Prometheus采集器的本地数据压实
- 对应参数为
    - --storage.tsdb.min-block-duration=2h
    - --storage.tsdb.max-block-duration=2h
    
### sidecar启动的时候也会check
- 对应请求的是 prometheus的 /api/v1/status/flags接口获取其启动的命令行参数
- 检查 storage.tsdb.min-block-duration是否设置是2h
- 如果参数配置错误sidecar启动失败

### 准备prometheus 数据目录等

### prometheus需要设置external_label 
- 原因如下：https://thanos.io/tip/thanos/storage.md/#external-labels
```yaml
global:
  external_labels:
    role: p_for_thanos
```

### 准备prometheus service 文件
```shell script
cat <<EOF >/etc/systemd/system/prometheus_for_thanos.service
[Unit]
Description="prometheus"
Documentation=https://prometheus.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/prometheus_for_thanos/prometheus  --config.file=/opt/app/prometheus_for_thanos/prometheus.yml --storage.tsdb.path=/opt/app/prometheus_for_thanos/data --web.enable-lifecycle --storage.tsdb.min-block-duration=2h  --storage.tsdb.max-block-duration=2h   --web.listen-address=0.0.0.0:7090

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=655360
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=prometheus_for_thanos

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart prometheus_for_thanos
```

## 步骤2 部署thanos-sidecar
### 使用本地存储测试充当对象存储
- 准备目录和bucket配置文件
```shell script
mkdir -pv /opt/app/thanos/data
cat <<EOF > /opt/app/thanos/local_filesystem_bucket.yml
type: FILESYSTEM
config:
  directory: /opt/app/thanos/data
EOF
```
- 将thanos二进制拷贝到/opt/app/thanos/下

### 准service文件
- --tsdb.path 代表prometheus的data存储目录 
- --prometheus.url 代表prometheus的 地址 
- --objstore.config-file 指定使用哪个对象存储配置文件
- --grpc-address 指定grpc listen 的地址 默认 10901
- --http-address  指定http listen 的地址 默认 10902
```shell script
cat <<EOF> /etc/systemd/system/thanos_sidecar.service
[Unit]
Description="thanos_sidecar"
Documentation=https://prometheus.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/thanos/thanos sidecar --tsdb.path=/opt/app/prometheus_for_thanos/data/ --prometheus.url=http://localhost:7090   --objstore.config-file=/opt/app/thanos/local_filesystem_bucket.yml

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=thanos_sidecar

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart thanos_sidecar

```

### 检查 本地对象存储目录
```shell script
[root@k8s-master01 data]# du -sh /opt/app/prometheus/data 
289M	/opt/app/prometheus/data
[root@k8s-master01 data]# du -sh /opt/app/thanos/data
263M	/opt/app/thanos/data
[root@k8s-master01 data]# 

```

> 上传旧指标  `--shipper.upload-compacted`
- 当 sidecar 使用该--shipper.upload-compacted标志运行时
- 它将在启动时同步来自 Prometheus 本地存储的所有旧的现有块
- 注意：这假设您从未针对此存储桶运行带有块上传的 sidecar
- 否则需要手动步骤从存储桶中删除重叠的块。这些将由 sidecar 验证过程建议。
- 第一次开启后可以看看到sidercar本地数据量和prometheus本地数据量差不多

## 步骤3 部署thanos-store

### 准备service文件
- --data-dir=/var/thanos/store  代表缓存对象存储中的block元信息和索引的目录，不需要设置很大
- --objstore.config-file=/opt/app/thanos/local_filesystem_bucket.yml  代表使用哪个对象存储配置
- --grpc-address=0.0.0.0:10903 因为跟sidecar部署在一台机器上所以 在10901上地址即可   
- --http-address=0.0.0.0:10904 

```shell script
cat  <<EOF > /etc/systemd/system/thanos_store.service
[Unit]
Description="thanos_store"
Documentation=https://prometheus.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/thanos/thanos store --data-dir=/var/thanos/store --objstore.config-file=/opt/app/thanos/local_filesystem_bucket.yml  --grpc-address=0.0.0.0:10903    --http-address=0.0.0.0:10904 

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=thanos_store

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart thanos_store

```

## 步骤4 部署thanos-compactor
### 准备service文件
```shell script
cat  <<EOF > /etc/systemd/system/thanos_compact.service
[Unit]
Description="thanos_compact"
Documentation=https://prometheus.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/thanos/thanos compact --data-dir=/var/thanos/compact --objstore.config-file=/opt/app/thanos/local_filesystem_bucket.yml  --http-address=0.0.0.0:10905      --wait
Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=thanos_compact

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart thanos_compact

```

## 步骤5 部署thanos-query

### 准备service文件
-  --grpc-address=0.0.0.0:10907
-  --http-address=0.0.0.0:10908
- --store=localhost:10901 代表将sidecar 的grpc加入进来
- --store=localhost:10903 代表将store 的grpc加入进来
```shell script
cat  <<EOF > /etc/systemd/system/thanos_query.service
[Unit]
Description="thanos_query"
Documentation=https://thanos.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/thanos/thanos  query  --grpc-address=0.0.0.0:10907  --http-address=0.0.0.0:10908 --store=localhost:10901 --store=localhost:10903

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=thanos_query

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart thanos_query

```

- 访问页面 http://localhost:10908/
- 可以使用promql进行查询

### 配置grafana 数据源 查看图

## 步骤6 部署thanos-rule

### 准备service文件
-  --data-dir=/opt/app/thanos/rule/data 代表预聚合的结果写入的tsdb目录
-   --eval-interval 代表全局执行周期
-   --rule-file=/opt/app/thanos/rule/rule*.yaml 代表预聚合和告警配置文件
-    --alert.query-url=http://172.20.70.215:10908 代表external-url
-  --alertmanagers.url  代表alertmanager的地址
- --query  代表查询接口，可以配置多个
-  --objstore.config-file=/opt/app/thanos/local_filesystem_bucket.yml代表 预聚合后上传到这个对象存储

```shell script
cat  <<EOF > /etc/systemd/system/thanos_rule.service
[Unit]
Description="thanos_rule"
Documentation=https://thanos.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/thanos/thanos  rule  --grpc-address=0.0.0.0:10909  --http-address=0.0.0.0:10910 --data-dir=/opt/app/thanos/rule/data --rule-file=/opt/app/thanos/rule/rule*.yaml  --alertmanagers.url=localhost:9093 --query=localhost:10908 --objstore.config-file=/opt/app/thanos/local_filesystem_bucket.yml --alert.query-url=http://172.20.70.215:10908

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=thanos_rule

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart thanos_rule

```

- 访问页面 http://localhost:10910/
- 查看rule

### 配置grafana 数据源 查看图

# 本节重点总结 :
- 核心优点
    - 无需维护存储，存储高可用： 利用廉价的公有云对象存储，高可用
    - 长时间存储，数据降采样：利用Compactor降采样
    - 完全适配原生prometheus查询接口：Query实现
    - 多级数据缓存配置
- 二进制部署

## 35.2 thanos-sidecar源码阅读

# 本节重点介绍 :
- sidercar 都干了什么
    - 执行prometheus的探活
    - 继承所有prometheus v1的查询方法，封装成http-client
    - 用上面的http-client 注册grpc-server，外部可以调grpc方法通过sidecar查询prometheus数据
    - 初始化对象存储的bkt 
    - 用bkt创建shipper对象，扫描prometheus data目录下的block，进行上传到对象存储
    - 不包括 prometheus 的chunk_head，也就是最近两小时的数据要通过sidecar的grpc接口查询prometheus v1接口获得

# 执行入口 runSidecar ，初始化操作
- 代码位置 D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\sidecar.go

## 初始化探活prometheus 的meta对象
```go
	var m = &promMetadata{
		promURL: conf.prometheus.url,

		// Start out with the full time range. The shipper will constrain it later.
		// TODO(fabxc): minimum timestamp is never adjusted if shipping is disabled.
		mint: conf.limitMinTime.PrometheusTimestamp(),
		maxt: math.MaxInt64,

		limitMinTime: conf.limitMinTime,
		client:       promclient.NewWithTracingClient(logger, "thanos-sidecar"),
	}

```

## 根据是否配置了 存储决定开启upload
- 存储命令行参数 --objstore.config-file
```go
	confContentYaml, err := conf.objStore.Content()
	if err != nil {
		return errors.Wrap(err, "getting object store config")
	}

	var uploads = true
	if len(confContentYaml) == 0 {
		level.Info(logger).Log("msg", "no supported bucket was configured, uploads will be disabled")
		uploads = false
	}

```

## 初始化grpc http探活
```go
	grpcProbe := prober.NewGRPC()
	httpProbe := prober.NewHTTP()
	statusProber := prober.Combine(
		httpProbe,
		grpcProbe,
		prober.NewInstrumentation(comp, logger, extprom.WrapRegistererWithPrefix("thanos_", reg)),
	)

```

## 启动httpserver
- 默认端口 10902
```go
	srv := httpserver.New(logger, reg, comp, httpProbe,
		httpserver.WithListen(conf.http.bindAddress),
		httpserver.WithGracePeriod(time.Duration(conf.http.gracePeriod)),
		httpserver.WithTLSConfig(conf.http.tlsConfig),
	)
	g.Add(func() error {
		statusProber.Healthy()

		return srv.ListenAndServe()
	}, func(err error) {
		statusProber.NotReady(err)
		defer statusProber.NotHealthy(err)

		srv.Shutdown(err)
	})

```

# 探活的任务组
## 先校验prometheus 参数
```go
		g.Add(func() error {
			// Only check Prometheus's flags when upload is enabled.
			if uploads {
				// Check prometheus's flags to ensure same sidecar flags.
				if err := validatePrometheus(ctx, m.client, logger, conf.shipper.ignoreBlockSize, m); err != nil {
					return errors.Wrap(err, "validate Prometheus flags")
				}
			}
```

### 关闭Prometheus采集器的本地数据压实 
- 使用sidecar模式时，需要关闭Prometheus采集器的本地数据压实
- 对应参数为
    - --storage.tsdb.min-block-duration=2h
    - --storage.tsdb.max-block-duration=2h
    
### sidecar启动的时候也会check
- 代码位置 D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\sidecar.go
- 对应请求的是 prometheus的 /api/v1/status/flags接口获取其启动的命令行参数
- 检查 storage.tsdb.min-block-duration是否设置是2h
- 如果参数配置错误sidecar启动失败
```go
func validatePrometheus(ctx context.Context, client *promclient.Client, logger log.Logger, ignoreBlockSize bool, m *promMetadata) error {
	var (
		flagErr error
		flags   promclient.Flags
	)

	if err := runutil.Retry(2*time.Second, ctx.Done(), func() error {
		if flags, flagErr = client.ConfiguredFlags(ctx, m.promURL); flagErr != nil && flagErr != promclient.ErrFlagEndpointNotFound {
			level.Warn(logger).Log("msg", "failed to get Prometheus flags. Is Prometheus running? Retrying", "err", flagErr)
			return errors.Wrapf(flagErr, "fetch Prometheus flags")
		}
		return nil
	}); err != nil {
		return errors.Wrapf(err, "fetch Prometheus flags")
	}

	if flagErr != nil {
		level.Warn(logger).Log("msg", "failed to check Prometheus flags, due to potentially older Prometheus. No extra validation is done.", "err", flagErr)
		return nil
	}

	// Check if compaction is disabled.
	if flags.TSDBMinTime != flags.TSDBMaxTime {
		if !ignoreBlockSize {
			return errors.Errorf("found that TSDB Max time is %s and Min time is %s. "+
				"Compaction needs to be disabled (storage.tsdb.min-block-duration = storage.tsdb.max-block-duration)", flags.TSDBMaxTime, flags.TSDBMinTime)
		}
		level.Warn(logger).Log("msg", "flag to ignore Prometheus min/max block duration flags differing is being used. If the upload of a 2h block fails and a Prometheus compaction happens that block may be missing from your Thanos bucket storage.")
	}
	// Check if block time is 2h.
	if flags.TSDBMinTime != model.Duration(2*time.Hour) {
		level.Warn(logger).Log("msg", "found that TSDB block time is not 2h. Only 2h block time is recommended.", "block-time", flags.TSDBMinTime)
	}

	return nil
}
```

## 获取prometheus的版本信息
- 调用prometheus 接口 /api/v1/status/buildinfo
```go

			// We retry infinitely until we reach and fetch BuildVersion from our Prometheus.
			err := runutil.Retry(2*time.Second, ctx.Done(), func() error {
				if err := m.BuildVersion(ctx); err != nil {
					level.Warn(logger).Log(
						"msg", "failed to fetch prometheus version. Is Prometheus running? Retrying",
						"err", err,
					)
					return err
				}

				level.Info(logger).Log(
					"msg", "successfully loaded prometheus version",
				)
				return nil
			})
			if err != nil {
				return errors.Wrap(err, "failed to get prometheus version")
			}
```

### 获取prometheus配置的 external labels
- 调用 prometheus /api/v1/status/config 接口
```go
			// Blocking query of external labels before joining as a Source Peer into gossip.
			// We retry infinitely until we reach and fetch labels from our Prometheus.
			err = runutil.Retry(2*time.Second, ctx.Done(), func() error {
				if err := m.UpdateLabels(ctx); err != nil {
					level.Warn(logger).Log(
						"msg", "failed to fetch initial external labels. Is Prometheus running? Retrying",
						"err", err,
					)
					promUp.Set(0)
					statusProber.NotReady(err)
					return err
				}

				level.Info(logger).Log(
					"msg", "successfully loaded prometheus external labels",
					"external_labels", m.Labels().String(),
				)
				promUp.Set(1)
				statusProber.Ready()
				lastHeartbeat.SetToCurrentTime()
				return nil
			})
			if err != nil {
				return errors.Wrap(err, "initial external labels query")
			}

```
- sidecar要求prometheus 采集器一定要配置 external label
```go
			if len(m.Labels()) == 0 {
				return errors.New("no external labels configured on Prometheus server, uniquely identifying external labels must be configured; see https://thanos.io/tip/thanos/storage.md#external-labels for details.")
			}
```
- 文档地址 https://thanos.io/tip/thanos/storage.md/#external-labels
- 唯一标签用来区分不同sidecar的数据，和后续的查询工作，这些标签会被后面的一堆组件使用

### 最后启动一个持续探测 external-label的任务
```go
			// Periodically query the Prometheus config. We use this as a heartbeat as well as for updating
			// the external labels we apply.
			return runutil.Repeat(30*time.Second, ctx.Done(), func() error {
				iterCtx, iterCancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer iterCancel()

				if err := m.UpdateLabels(iterCtx); err != nil {
					level.Warn(logger).Log("msg", "heartbeat failed", "err", err)
					promUp.Set(0)
				} else {
					promUp.Set(1)
					lastHeartbeat.SetToCurrentTime()
				}

				return nil
			})
```

## 启动配置热更新监听
```go
	{
		ctx, cancel := context.WithCancel(context.Background())
		g.Add(func() error {
			return reloader.Watch(ctx)
		}, func(error) {
			cancel()
		})
	}
```

# 新建PrometheusStore，使用http-client和prometheus交互
- 这个PrometheusStore对外通过grpc 提供服务
- 对内通过prometheus 的api 接口和prometheus通信
```go
		t := exthttp.NewTransport()
		t.MaxIdleConnsPerHost = conf.connection.maxIdleConnsPerHost
		t.MaxIdleConns = conf.connection.maxIdleConns
		c := promclient.NewClient(&http.Client{Transport: tracing.HTTPTripperware(logger, t)}, logger, thanoshttp.ThanosUserAgent)

		promStore, err := store.NewPrometheusStore(logger, reg, c, conf.prometheus.url, component.Sidecar, m.Labels, m.Timestamps, m.Version)
		if err != nil {
			return errors.Wrap(err, "create Prometheus store")
		}
```

## new函数
```go
// NewPrometheusStore returns a new PrometheusStore that uses the given HTTP client
// to talk to Prometheus.
// It attaches the provided external labels to all results. Provided external labels has to be sorted.
func NewPrometheusStore(
	logger log.Logger,
	reg prometheus.Registerer,
	client *promclient.Client,
	baseURL *url.URL,
	component component.StoreAPI,
	externalLabelsFn func() labels.Labels,
	timestamps func() (mint int64, maxt int64),
	promVersion func() string,
) (*PrometheusStore, error) {
	if logger == nil {
		logger = log.NewNopLogger()
	}
	p := &PrometheusStore{
		logger:                        logger,
		base:                          baseURL,
		client:                        client,
		component:                     component,
		externalLabelsFn:              externalLabelsFn,
		timestamps:                    timestamps,
		promVersion:                   promVersion,
		remoteReadAcceptableResponses: []prompb.ReadRequest_ResponseType{prompb.ReadRequest_STREAMED_XOR_CHUNKS, prompb.ReadRequest_SAMPLES},
		buffers: sync.Pool{New: func() interface{} {
			b := make([]byte, 0, initialBufSize)
			return &b
		}},
		framesRead: promauto.With(reg).NewHistogram(
			prometheus.HistogramOpts{
				Name:    "prometheus_store_received_frames",
				Help:    "Number of frames received per streamed response.",
				Buckets: prometheus.ExponentialBuckets(10, 10, 5),
			},
		),
	}
	return p, nil
}
```

# 初始化 grpc服务端并启动
```go
		tlsCfg, err := tls.NewServerConfig(log.With(logger, "protocol", "gRPC"),
			conf.grpc.tlsSrvCert, conf.grpc.tlsSrvKey, conf.grpc.tlsSrvClientCA)
		if err != nil {
			return errors.Wrap(err, "setup gRPC server")
		}

		s := grpcserver.New(logger, reg, tracer, grpcLogOpts, tagOpts, comp, grpcProbe,
			grpcserver.WithServer(store.RegisterStoreServer(promStore)),
			grpcserver.WithServer(rules.RegisterRulesServer(rules.NewPrometheus(conf.prometheus.url, c, m.Labels))),
			grpcserver.WithServer(targets.RegisterTargetsServer(targets.NewPrometheus(conf.prometheus.url, c, m.Labels))),
			grpcserver.WithServer(meta.RegisterMetadataServer(meta.NewPrometheus(conf.prometheus.url, c))),
			grpcserver.WithServer(exemplars.RegisterExemplarsServer(exemplars.NewPrometheus(conf.prometheus.url, c, m.Labels))),
			grpcserver.WithListen(conf.grpc.bindAddress),
			grpcserver.WithGracePeriod(time.Duration(conf.grpc.gracePeriod)),
			grpcserver.WithTLSConfig(tlsCfg),
		)
		g.Add(func() error {
			statusProber.Ready()
			return s.ListenAndServe()
		}, func(err error) {
			statusProber.NotReady(err)
			s.Shutdown(err)
		})
```

## 注册一个grpc service  ：prometheus 查询数据 服务 thanos.Store
```go
grpcserver.WithServer(store.RegisterStoreServer(promStore)),
```
### 服务thanos.Store
- D:\go_path\src\github.com\thanos-io\thanos\pkg\store\storepb\rpc.pb.go
```go
var _Store_serviceDesc = grpc.ServiceDesc{
	ServiceName: "thanos.Store",
	HandlerType: (*StoreServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "Info",
			Handler:    _Store_Info_Handler,
		},
		{
			MethodName: "LabelNames",
			Handler:    _Store_LabelNames_Handler,
		},
		{
			MethodName: "LabelValues",
			Handler:    _Store_LabelValues_Handler,
		},
	},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "Series",
			Handler:       _Store_Series_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "store/storepb/rpc.proto",
}
```
- 有3个方法 ，对应实现在 D:\go_path\src\github.com\thanos-io\thanos\pkg\store\prometheus.go
    - Info 获取prometheus信息的 
    - LabelNames  通过 prometheus 的/api/v1/labels接口获取标签的名称列表
    - LabelValues 
        - 没有 Matchers就用 /api/v1/label/&lt;label_name&gt;/values
        - 有 Matchers就用series 
- 有1个流
    - Series
    
## 注册 第二个 grpc service : rules.Prometheus 获取prometheus的告警或聚合配置
- 代码
```go
grpcserver.WithServer(rules.RegisterRulesServer(rules.NewPrometheus(conf.prometheus.url, c, m.Labels))),
```
- D:\go_path\src\github.com\thanos-io\thanos\pkg\rules\rulespb\rpc.pb.go
```go
var _Rules_serviceDesc = grpc.ServiceDesc{
	ServiceName: "thanos.Rules",
	HandlerType: (*RulesServer)(nil),
	Methods:     []grpc.MethodDesc{},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "Rules",
			Handler:       _Rules_Rules_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "rules/rulespb/rpc.proto",
}

```
- 通过 /api/v1/rules 获取prometheus 的告警和聚合配置

## 注册 第3个 grpc service : targets.Prometheus. 获取prometheus的 采集target
```go
grpcserver.WithServer(targets.RegisterTargetsServer(targets.NewPrometheus(conf.prometheus.url, c, m.Labels))),
```
- D:\go_path\src\github.com\thanos-io\thanos\pkg\targets\targetspb\rpc.pb.go
```go
var _Targets_serviceDesc = grpc.ServiceDesc{
	ServiceName: "thanos.Targets",
	HandlerType: (*TargetsServer)(nil),
	Methods:     []grpc.MethodDesc{},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "Targets",
			Handler:       _Targets_Targets_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "targets/targetspb/rpc.proto",
}
```
- 实现  D:\go_path\src\github.com\thanos-io\thanos\pkg\targets\prometheus.go
- 通过 /api/v1/targets 接口获取target 
```go
func (p *Prometheus) Targets(r *targetspb.TargetsRequest, s targetspb.Targets_TargetsServer) error {
	var stateTargets string
	if r.State != targetspb.TargetsRequest_ANY {
		stateTargets = strings.ToLower(r.State.String())
	}
	targets, err := p.client.TargetsInGRPC(s.Context(), p.base, stateTargets)
	if err != nil {
		return err
	}

	// Prometheus does not add external labels, so we need to add on our own.
	enrichTargetsWithExtLabels(targets, p.extLabels())

	if err := s.Send(&targetspb.TargetsResponse{Result: &targetspb.TargetsResponse_Targets{Targets: targets}}); err != nil {
		return err
	}

	return nil
}
```

## 注册 第4个 grpc service : metadata.Prometheus. 获取prometheus的 采集metrics的元信息
```go
grpcserver.WithServer(meta.RegisterMetadataServer(meta.NewPrometheus(conf.prometheus.url, c))),
```
- 实现 D:\go_path\src\github.com\thanos-io\thanos\pkg\metadata\prometheus.go
- 通过/api/v1/metadata 接口获取信息
```go
// MetricMetadata returns all specified metric metadata from Prometheus.
func (p *Prometheus) MetricMetadata(r *metadatapb.MetricMetadataRequest, s metadatapb.Metadata_MetricMetadataServer) error {
	md, err := p.client.MetricMetadataInGRPC(s.Context(), p.base, r.Metric, int(r.Limit))
	if err != nil {
		return err
	}

	tracing.DoInSpan(s.Context(), "send_metadata_response", func(_ context.Context) {
		err = s.Send(&metadatapb.MetricMetadataResponse{Result: &metadatapb.MetricMetadataResponse_Metadata{
			Metadata: metadatapb.FromMetadataMap(md)}})
	})
	return err
}

```

## 注册 第5个 grpc service : exemplars.Prometheus.
```go
grpcserver.WithServer(exemplars.RegisterExemplarsServer(exemplars.NewPrometheus(conf.prometheus.url, c, m.Labels))),
```
- 实现  D:\go_path\src\github.com\thanos-io\thanos\pkg\exemplars\prometheus.go
- 通过 /api/v1/query_exemplars获取
```go
// Exemplars returns all specified exemplars from Prometheus.
func (p *Prometheus) Exemplars(r *exemplarspb.ExemplarsRequest, s exemplarspb.Exemplars_ExemplarsServer) error {
	exemplars, err := p.client.ExemplarsInGRPC(s.Context(), p.base, r.Query, r.Start, r.End)
	if err != nil {
		return err
	}

	// Prometheus does not add external labels, so we need to add on our own.
	extLset := p.extLabels()
	for _, e := range exemplars {
		// Make sure the returned series labels are sorted.
		e.SetSeriesLabels(labelpb.ExtendSortedLabels(e.SeriesLabels.PromLabels(), extLset))

		var err error
		tracing.DoInSpan(s.Context(), "send_exemplars_response", func(_ context.Context) {
			err = s.Send(&exemplarspb.ExemplarsResponse{Result: &exemplarspb.ExemplarsResponse_Data{Data: e}})
		})
		if err != nil {
			return err
		}
	}
	return nil
}

```

# 如果配置了存储，开启上传任务
## 初始化对象存储的bkt 
```go
		bkt, err := client.NewBucket(logger, confContentYaml, reg, component.Sidecar.String())
		if err != nil {
			return err
		}

```

## 检查prometheus的 external label
```go
			promReadyTimeout := conf.prometheus.readyTimeout
			extLabelsCtx, cancel := context.WithTimeout(ctx, promReadyTimeout)
			defer cancel()

			if err := runutil.Retry(2*time.Second, extLabelsCtx.Done(), func() error {
				if len(m.Labels()) == 0 {
					return errors.New("not uploading as no external labels are configured yet - is Prometheus healthy/reachable?")
				}
				return nil
			}); err != nil {
				return errors.Wrapf(err, "aborting as no external labels found after waiting %s", promReadyTimeout)
			}

```

# 用bkt创建托运人
- 代码注释中也说明了 shipper会持续的扫描 data目录，上传数据
```go
		// The background shipper continuously scans the data directory and uploads
		// new blocks to Google Cloud Storage or an S3-compatible storage service.
			s := shipper.New(logger, reg, conf.tsdb.path, bkt, m.Labels, metadata.SidecarSource,
				conf.shipper.uploadCompacted, conf.shipper.allowOutOfOrderUpload, metadata.HashFunc(conf.shipper.hashFunc))

```

# 开启后台扫描上传任务
```go
			return runutil.Repeat(30*time.Second, ctx.Done(), func() error {
				if uploaded, err := s.Sync(ctx); err != nil {
					level.Warn(logger).Log("err", err, "uploaded", uploaded)
				}

				minTime, _, err := s.Timestamps()
				if err != nil {
					level.Warn(logger).Log("msg", "reading timestamps failed", "err", err)
					return nil
				}
				m.UpdateTimestamps(minTime, math.MaxInt64)
				return nil
			})
```

## sync函数解读 
### 读取 tsdb.path 下面的 thanos.shipper.json ,读取已经上传的block id
- 这个文件记录了已经通过sidecar上传的 block id
```go
	meta, err := ReadMetaFile(s.dir)
	if err != nil {
		// If we encounter any error, proceed with an empty meta file and overwrite it later.
		// The meta file is only used to avoid unnecessary bucket.Exists call,
		// which are properly handled by the system if their occur anyway.
		if !os.IsNotExist(err) {
			level.Warn(s.logger).Log("msg", "reading meta file failed, will override it", "err", err)
		}
		meta = &Meta{Version: MetaVersion1}
	}

	// Build a map of blocks we already uploaded.
	hasUploaded := make(map[ulid.ULID]struct{}, len(meta.Uploaded))
	for _, id := range meta.Uploaded {
		hasUploaded[id] = struct{}{}
	}

	// Reset the uploaded slice so we can rebuild it only with blocks that still exist locally.
	meta.Uploaded = nil

```

- thanos.shipper.json解读
```json
{
        "version": 1,
        "uploaded": [
                "01FDBCBBFAWYD0DNF4XA2AQ1KC",
                "01FDBK72D1V6REV2PJMWC29TK4",
                "01FDBT2SN1V25BWQ9AM02NJ1RA",
                "01FDC0YH78ZTKMH19PCCHXMHJ8",
                "01FDC7T8F9WEC1CV4WCETXPDQG",
                "01FDCENZQ8PSXKTH7SX7WGVK1W",
                "01FDCNHPMSC5G4YPE1T5X1B8BS",
                "01FDCWDDX2RV0DE2QCQ9XRKTZ4",
                "01FDD395F8VSR0FV0P00W8BNCW",
                "01FDDA4WQ9AXPCHKP6ZVMFA7G8",
                "01FDDH0KZ8JMNDPMN6WZQKWKYZ",
                "01FDDQWB7906AVV6J3YJ2CMJAC",
                "01FDDYR2524X62YKAVG7RFNHT2",
                "01FDE5KSC9QQZV1ZF7TRBMXFEC",
                "01FDECFGZ9M42FHGATG0EAN6T0",
                "01FDEKB7XB3ZV6G9CA6Z9PRZQ4",
                "01FDET6Z82HXBP006MPTN5761B",
                "01FDF12PQ9T4749F9W051HYHPF",
                "01FDF7YDMV2KFXGGX60FTY3YPP",
                "01FDFET5789VC63Z2DZTWC6H9B",
                "01FDFNNW51JFVGM74XS1SJQK42",
                "01FDFWHKQ82T5QV1CXAM2XRTDQ",
                "01FDG3DAZ93DY60VRWVRR6WFHX",
                "01FDGA9279K2QDJCPK9HNSV7SV",
                "01FDGH4RSXZ1GCB1CR63VH6ZBT",
                "01FDGR0GQ98KZWNTYN3G5KF8SJ",
                "01FDGYW7Z806AV7G9E9WTB799P",
                "01FDH5QYXFCJYXM19WCARE2XF7",
                "01FDHCKP5MCSM7M3GXTZMKBN7E",
                "01FDHKFDCY94CSR8D1J8A630PJ",
                "01FDHTB4Z91ZEZS46H9K3C6X6W",
                "01FDJ16W79PR9BT5A7RRGEB6NX",
                "01FDJ82KF92DNZAN9AX498KTRH",
                "01FDJEYAQ93BWV8SVBG57VHA9Q",
                "01FDJNT1Z97E6Y6N49WM4GWTM4",
                "01FDJWNS793CERX9ZE24T6P8P4",
                "01FDK3HGF9SQN63CVN0YXR4NKX",
                "01FDKAD7CR2SSYVCMTPZFKBAM0",
                "01FDKH8YZ98F8N5X1MHPNNH2HD",
                "01FDKR4P7831CV8FWJH5W2XAT8",
                "01FDKZ0DF9DADF0DV2BDV0CRHZ",
                "01FDM5W4Q8617VNV2HSYPAPVFR",
                "01FDMCQVZ9XESVYXJS3469FH0D",
                "01FDMKKJWZVV2JDSDJ1XEAP1C6",
                "01FDMTFA50GR2GXBKCHMZTJVAY",
                "01FDN1B1Q8XAZZVNG6V5RV4DBD",
                "01FDN86RZ9CGQJKGMTM6KNFDFW",
                "01FDNF2G79ZHZVMCMHT9NTM7AQ",
                "01FDNNY7F95AGEJAVXYQE8429Z",
                "01FDNWSYCWRRV72GPW7X98WQKK",
                "01FDP3NNZ9VT8ZFAF49AFZD9JX",
                "01FDPAHD7806E5W97Y1XDQZHHW",
                "01FDPHD4F9FC2EEX4WA96D6WWW",
                "01FDPR8VQ8MDW3DY6V3B3G94F4",
                "01FDPZ4JZ8DR1VWW3E9WQHCGXD",
                "01FDQ60A790Z81KTVT5E2EXM8Z",
                "01FDQCW1F935CTJDNYYTSBWARR",
                "01FDQKQRQ962JYAJBKBA1SZAAE",
                "01FDQTKFZ9YQ9AXW607S3FQ543",
                "01FDR1F779C3R0K2BMH8RPNDHR",
                "01FDR8AYF93SMWYPGBNEVBJP90",
                "01FDRF6NQAA70TFSEBYG08B3RT",
                "01FDRP2CMZGBWTHVYMT4HC6XTW",
                "01FDRWY4794VJFVHZ6D6NX11SY",
                "01FDS3SV58JYSX8BGGTSHH6AX7",
                "01FDSANJQ9QSDVDHQP85TW25M4",
                "01FDSHH9Z8H72X2QHQYMGPWTBY",
                "01FDSRD179N00BQJFP4GQMXWR5",
                "01FDSZ8RF8EQ7KP073WGTFH6DC",
                "01FDT64FQ87Z4H23D52D6YRRK8",
                "01FDTD06Z9A08W8Y644Y9YWV2K",
                "01FDTKVXT80X9KMCZGJTQF59W4",
                "01FDTTQNF9F0XGZ6GNZ3MVV53X",
                "01FDV1KCQ9G0NVXYSX863DBBH3",
                "01FDV8F3Z871FFQMK47BT9BMFJ",
                "01FDVFAV79YZD0HT87HJ3QV67P",
                "01FDVP6J4W142XW3B8AMS192P2",
                "01FDVX29Q8GBM1TM4DWJXZ1GEJ",
                "01FDW3Y0Z9EF8CEE4YWQF4DZQM",
                "01FDWASR79QBF32Q1AQ08R3MG2",
                "01FDWHNFF9643T88YZDXB4YWF7",
                "01FDWRH6Q92YTK33YXHAVVXP25",
                "01FDWZCXZ990B4VJZBFDN0Z5N1",
                "01FDX68MWR9C16JWGKD9H0KVDM",
                "01FDXD4CF9DJJHH62065XKQTJ1",
                "01FDXM03Q9BPSG6E25QJF8H3T6",
                "01FDXTVTZ9X2CV8CF3W8VR9FXV",
                "01FDY1QJ797Y7DQNR5DCV5ZYEZ",
                "01FDY8K9F9WG8JQH026VTDW9MF",
                "01FDYFF0D34D7TRCF2M8J814W3",
                "01FDYPAQZ9P4857YBZK7QT2SDD",
                "01FDYX6F79XNY7Q82KN85K8F7M",
                "01FDZ426FA81GR4W6430N11226",
                "01FDZAXXQ98PH0GN4382GRBJXQ",
                "01FDZHSMZ9JQ98RXT3ZZWA8AP4",
                "01FDZRNC7961919BM34HDT3WXH",
                "01FDZZH3F9DXG8EHZVDNFF60DS",
                "01FE06CTQ9HXKE46SZXWC9VR9G",
                "01FE0D8HZ80JFA5JXYCAZZ9AW6",
                "01FE0M48X8PNR35SQFWEHVJH51",
                "01FE0V00F8T9GP955692GX7S4Q",
                "01FE11VQQ8VV03CG46CBXVCNP0",
                "01FE18QE9NW4XZTX5HHXA264VB",
                "01FE1FK5WY9DXCD00KS00EPGB6",
                "01FE1PEXF8QVF1JXJ0CYHAF56B",
                "01FE1XAMQ8DDZZQ5TR0HMRJVZK",
                "01FE246BZ83HPXX9F5YWQWC4FP",
                "01FE2B23794MA54N0CY81AQ8E6",
                "01FE2HXT4TSHHKZ3V5V5PREAR0",
                "01FE2RSHD3YZFNKFT5NXZQ93DY",
                "01FE2ZN8N4DEAT3V3JYP7ATD87",
                "01FE36H078HPGENNV2K7H8GQ16",
                "01FE3DCQFA1GCAQA61DHFH94J3",
                "01FE3M8EQ9SG33QDQPFW4AJRVZ",
                "01FE3V45Z9GC1KAQS68VAW44B3",
                "01FE41ZWWYTYF4DD9XEVKJ3G5Z",
                "01FE48VMF9XT8295MHZDB9THVC",
                "01FE4FQBQ8BDZHGECRSFVQDEME",
                "01FE4PK2Z9T46QTK42JTXN4B4R",
                "01FE4XET78D0XEXKWB6M1XV06D",
                "01FE54AH4YTY5AVGPH93VS8WY8",
                "01FE5B68B4KT8T6V9YE4P1H9YD",
                "01FE5J1ZZ8V95Q8V96Y9VFKTD8",
                "01FE5RXQ78PWBKHFHM57XGGMXF",
                "01FE5ZSEF9FP8JHDS1K7PN0ANK",
                "01FE66N5CSPTRTQTZRZK8V3WEG",
                "01FE6DGWZ94HVAFYYGV76502ZV",
                "01FE6MCM79BYSFYFB6M5N2QDJZ",
                "01FE6V8BF8PCYKHE8HMPAZWJ8E",
                "01FE7242Q8W046HN4WS3PGJB9N",
                "01FE78ZSZ8APGEK6WJ3DGTQGHX",
                "01FE7FVGWY7XT4XQ7HG7HQ9PY1",
                "01FE7PQ851T5V18ZVH32G3GMXJ",
                "01FE7XJZQ85QZ6B0MY589CB1M2",
                "01FE84EPZ9R2JWVFQQG3EWDWAP",
                "01FE8BAE78A25EQZDF7Z3W64DT",
                "01FE8J65F8YGQS4XX66C5Y092B",
                "01FE8S1WQ891TFZ06WV152CWZ1",
                "01FE8ZXKZ9ASQQ4D0VDF1GXN5V",
                "01FE96SB78754T9FDG9H3EJ68R",
                "01FE9DN2F8TB4TWXHW7D5X183P",
                "01FE9MGSQ9958YHFAKM6YMQ8VR",
                "01FE9VCGZ9XK2MKK3PX7WSMN2D",
                "01FEA28879N2P49JJF9RXVZTDS",
                "01FEA93ZF9W3A36JMDJZ3SJ45K",
                "01FEAFZPQ9MYWSQE2YHQ962FG0",
                "01FEAPVDZ9C0AB8GDYQRNS9SWN",
                "01FEAXQ54ME6C2C2WG18RKMMSK",
                "01FEB4JWF9XYVYNP63GRPN85RS",
                "01FEBBEKQ8F55ZGJ8Y2TJH251V",
                "01FEBJAAZ9DHYEFF6A3BFJQFXP",
                "01FEBS61X3RGM85A0VKG3756EB",
                "01FEC01SFANMN7SYRCTW2DKF1D",
                "01FEC6XGQ8VRDYH8QXC6CMWT1F",
                "01FECDS7Z97WZ01GG7QSEMPSG2",
                "01FECMMZ78SZTWEM3JQ66QSX4F",
                "01FECVGPF8SWGVB1ZSMH2TN5PC",
                "01FED2CDQ85ZGYNYRNX0QAY01B",
                "01FED984N5T1DTJMWDCXV94BSR",
                "01FEDG3W794DXZT7PZE4J2GZV7",
                "01FEDPZKF955VZZV5ZGM7AQ5MT",
                "01FEDXVACZHB6W5R0QBRCHNGF0",
                "01FEE4Q19MGM1SXCJE8XN15SG2",
                "01FEEBJS79HWZ5CX9DVN9E7K7A",
                "01FEEJEGF83XJZXFR9E47QS0MA",
                "01FEESA7Q8AB9MCTCEQ1F54WEM",
                "01FEF05YZ7EFNG7RD178HKAGNA",
                "01FEF71P78BQQ4GYZ1EDC09NXW",
                "01FEFDXD4TX162T2CE1BBWQMMW",
                "01FEFMS4Q971ZM0R19PSVAHY40",
                "01FEFVMVZ7RK3742QHJREE445J",
                "01FEG2GJX71H5024VKCEB6M9EN",
                "01FEG9C9SRBCY00AWXR74D5HPD",
                "01FEGG81Q85M7H267SPVRTERQV",
                "01FEGQ3RMXFPK2EPFNWDMMH316",
                "01FEGXZG78DPH0Z6FYEKZZWYSX",
                "01FEH4V7F80TN8WSS1CM014H5V",
                "01FEHBPYQ8N6SMTE5MSF9R9FZ0",
                "01FEHJJNZ8QT7SFYZQTR7WMEET",
                "01FEHSED775V9P0TR805YZNK1T",
                "01FEJ0A456CGV5FVN5M46Q0TFS"
        ]
}
```

### 读取prometheus 非chunk_head的所有block元信息
- 判断依据就是目录是否为32位字符串的 ulid格式
- 形如01FEGG81Q85M7H267SPVRTERQV

```go
	metas, err := s.blockMetasFromOldest()
func IsBlockDir(path string) (id ulid.ULID, ok bool) {
	id, err := ulid.Parse(filepath.Base(path))
	return id, err == nil
}
```

### 遍历prometheus 存储的block判断是否要上传
- 如果在之前的 thanos.shipper.json中记录上传过了就 忽略
```go
		if _, uploaded := hasUploaded[m.ULID]; uploaded {
			meta.Uploaded = append(meta.Uploaded, m.ULID)
			continue
		}
```
- 如果 sample数=0，就忽略
```go
		if m.Stats.NumSamples == 0 {
			// Ignore empty blocks.
			level.Debug(s.logger).Log("msg", "ignoring empty block", "block", m.ULID)
			continue
		}
```
- 如果level>1，代表已压实过就忽略，命令行参数shipper.upload-compacted为false，意思是不上传已压实的block
```go
		// We only ship of the first compacted block level as normal flow.
		if m.Compaction.Level > 1 {
			if !s.uploadCompacted {
				continue
			}
		}
```

- 检查这个block是否已经在对象存储中了，如果在就忽略
```go
		ok, err := s.bucket.Exists(ctx, path.Join(m.ULID.String(), block.MetaFilename))
		if err != nil {
			return 0, errors.Wrap(err, "check exists")
		}
		if ok {
			meta.Uploaded = append(meta.Uploaded, m.ULID)
			continue
		}
```

### 调用upload 函数上传
```go
		if err := s.upload(ctx, m); err != nil {
			if !s.allowOutOfOrderUploads {
				return 0, errors.Wrapf(err, "upload %v", m.ULID)
			}

			// No error returned, just log line. This is because we want other blocks to be uploaded even
			// though this one failed. It will be retried on second Sync iteration.
			level.Error(s.logger).Log("msg", "shipping failed", "block", m.ULID, "err", err)
			uploadErrs++
			continue
		}
```
### upload函数
- 会在tsdb的data目录下创建 thanos/upload目录
- 然后以block文件夹的名字创建目录
- 再创建硬链接操作，避免上传过程中数据被tsdb其他动作占用删除等
```go
	level.Info(s.logger).Log("msg", "upload new block", "id", meta.ULID)

	// We hard-link the files into a temporary upload directory so we are not affected
	// by other operations happening against the TSDB directory.
	updir := filepath.Join(s.dir, "thanos", "upload", meta.ULID.String())

	// Remove updir just in case.
	if err := os.RemoveAll(updir); err != nil {
		return errors.Wrap(err, "clean upload directory")
	}
	if err := os.MkdirAll(updir, 0750); err != nil {
		return errors.Wrap(err, "create upload dir")
	}
	defer func() {
		if err := os.RemoveAll(updir); err != nil {
			level.Error(s.logger).Log("msg", "failed to clean upload directory", "err", err)
		}
	}()

	dir := filepath.Join(s.dir, meta.ULID.String())
	if err := hardlinkBlock(dir, updir); err != nil {
		return errors.Wrap(err, "hard link block")
	}
	// Attach current labels and write a new meta file with Thanos extensions.
	if lset := s.labels(); lset != nil {
		meta.Thanos.Labels = lset.Map()
	}
	meta.Thanos.Source = s.source
	meta.Thanos.SegmentFiles = block.GetSegmentFiles(updir)
	if err := meta.WriteToDir(s.logger, updir); err != nil {
		return errors.Wrap(err, "write meta file")
	}
	return block.Upload(ctx, s.logger, s.bucket, updir, s.hashFunc)
```

### 最终的上传函数 upload
- D:\go_path\src\github.com\thanos-io\thanos\pkg\block\block.go
- 依次上传 chunks目录，index文件 ,meta.json
```go
	if err := bkt.Upload(ctx, path.Join(DebugMetas, fmt.Sprintf("%s.json", id)), strings.NewReader(metaEncoded.String())); err != nil {
		return cleanUp(logger, bkt, id, errors.Wrap(err, "upload debug meta file"))
	}

	if err := objstore.UploadDir(ctx, logger, bkt, path.Join(bdir, ChunksDirname), path.Join(id.String(), ChunksDirname)); err != nil {
		return cleanUp(logger, bkt, id, errors.Wrap(err, "upload chunks"))
	}

	if err := objstore.UploadFile(ctx, logger, bkt, path.Join(bdir, IndexFilename), path.Join(id.String(), IndexFilename)); err != nil {
		return cleanUp(logger, bkt, id, errors.Wrap(err, "upload index"))
	}

	// Meta.json always need to be uploaded as a last item. This will allow to assume block directories without meta file to be pending uploads.
	if err := bkt.Upload(ctx, path.Join(id.String(), MetaFilename), strings.NewReader(metaEncoded.String())); err != nil {
		// Don't call cleanUp here. Despite getting error, meta.json may have been uploaded in certain cases,
```

# 本节重点总结 :
- sidercar 都干了什么
    - 执行prometheus的探活
    - 继承所有prometheus v1的查询方法，封装成http-client
    - 用上面的http-client 注册grpc-server，外部可以调grpc方法通过sidecar查询prometheus数据
    - 初始化对象存储的bkt 
    - 用bkt创建shipper对象，扫描prometheus data目录下的block，进行上传到对象存储
    - 不包括 prometheus 的chunk_head，也就是最近两小时的数据要通过sidecar的grpc接口查询prometheus v1接口获得

## 35.3 thanos-store 源码阅读

# 本节重点介绍 :
- 启动时同步对象存储的各个block元信息到本地，并且将索引数据也同步过来
- 启动定时同步的任务
- 封装prometheus查询的grpc服务，对外提供服务，底层调用配置的对象存储查询

# store 
- [文档地址](https://thanos.io/tip/components/store.md/#store)

## store 的作用
- 提供grpc查询 对象存储的接口
- 充当查询网关

# store代码做了什么
- 启动时同步对象存储的各个block元信息到本地，并且将索引数据也同步过来
- 启动定时同步的任务
- 封装prometheus查询的grpc服务，对外提供服务，底层调用配置的对象存储查询

# 执行入口runStore
- 代码位置 D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\store.go
## 初始化prober 和http server
- http-server中有三部分内容
    - 探活相关的 /-/ready  /-/healthy
    - pprof 相关
    - metrics相关
- 代码如下
```go
	grpcProbe := prober.NewGRPC()
	httpProbe := prober.NewHTTP()
	statusProber := prober.Combine(
		httpProbe,
		grpcProbe,
		prober.NewInstrumentation(conf.component, logger, extprom.WrapRegistererWithPrefix("thanos_", reg)),
	)

	srv := httpserver.New(logger, reg, conf.component, httpProbe,
		httpserver.WithListen(conf.httpConfig.bindAddress),
		httpserver.WithGracePeriod(time.Duration(conf.httpConfig.gracePeriod)),
		httpserver.WithTLSConfig(conf.httpConfig.tlsConfig),
	)

	g.Add(func() error {
		statusProber.Healthy()

		return srv.ListenAndServe()
	}, func(err error) {
		statusProber.NotReady(err)
		defer statusProber.NotHealthy(err)

		srv.Shutdown(err)
	})

```

## 根据配置的对象存储创建bkt
```go

	confContentYaml, err := conf.objStoreConfig.Content()
	if err != nil {
		return err
	}

	bkt, err := client.NewBucket(logger, confContentYaml, reg, conf.component.String())
	if err != nil {
		return errors.Wrap(err, "create bucket client")
	}

```

## 根据配置 创建缓存桶
- 文档地址 https://thanos.io/tip/components/store.md/#caching-bucket

```go
	cachingBucketConfigYaml, err := conf.cachingBucketConfig.Content()
	if err != nil {
		return errors.Wrap(err, "get caching bucket configuration")
	}
	if len(cachingBucketConfigYaml) > 0 {
		bkt, err = storecache.NewCachingBucketFromYaml(cachingBucketConfigYaml, bkt, logger, reg)
		if err != nil {
			return errors.Wrap(err, "create caching bucket")
		}
	}
```

- 位置 D:\go_path\src\github.com\thanos-io\thanos\pkg\store\cache\caching_bucket_factory.go
- 类型为memcached 和 本地内存的
```go
func NewCachingBucketFromYaml(yamlContent []byte, bucket objstore.Bucket, logger log.Logger, reg prometheus.Registerer) (objstore.InstrumentedBucket, error) {
	level.Info(logger).Log("msg", "loading caching bucket configuration")

	config := &CachingWithBackendConfig{}
	config.Defaults()

	if err := yaml.UnmarshalStrict(yamlContent, config); err != nil {
		return nil, errors.Wrap(err, "parsing config YAML file")
	}

	backendConfig, err := yaml.Marshal(config.BackendConfig)
	if err != nil {
		return nil, errors.Wrap(err, "marshal content of cache backend configuration")
	}

	var c cache.Cache

	switch strings.ToUpper(string(config.Type)) {
	case string(MemcachedBucketCacheProvider):
		var memcached cacheutil.MemcachedClient
		memcached, err := cacheutil.NewMemcachedClient(logger, "caching-bucket", backendConfig, reg)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to create memcached client")
		}
		c = cache.NewMemcachedCache("caching-bucket", logger, memcached, reg)
	case string(InMemoryBucketCacheProvider):
		c, err = cache.NewInMemoryCache("caching-bucket", logger, reg, backendConfig)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to create inmemory cache")
		}
	default:
		return nil, errors.Errorf("unsupported cache type: %s", config.Type)
	}

	// Include interactions with cache in the traces.
	c = cache.NewTracingCache(c)
	cfg := NewCachingBucketConfig()

	// Configure cache.
	cfg.CacheGetRange("chunks", c, isTSDBChunkFile, config.ChunkSubrangeSize, config.ChunkObjectAttrsTTL, config.ChunkSubrangeTTL, config.MaxChunksGetRangeRequests)
	cfg.CacheExists("meta.jsons", c, isMetaFile, config.MetafileExistsTTL, config.MetafileDoesntExistTTL)
	cfg.CacheGet("meta.jsons", c, isMetaFile, int(config.MetafileMaxSize), config.MetafileContentTTL, config.MetafileExistsTTL, config.MetafileDoesntExistTTL)

	// Cache Iter requests for root.
	cfg.CacheIter("blocks-iter", c, isBlocksRootDir, config.BlocksIterTTL, JSONIterCodec{})

	cb, err := NewCachingBucket(bucket, cfg, logger, reg)
	if err != nil {
		return nil, err
	}

	return cb, nil
}
```

## 创建查询rebel配置,作用于查询 block中 
- 根据参数 selector.relabel-config
```go
	relabelContentYaml, err := conf.selectorRelabelConf.Content()
	if err != nil {
		return errors.Wrap(err, "get content of relabel configuration")
	}

	relabelConfig, err := block.ParseRelabelConfig(relabelContentYaml, block.SelectorSupportedRelabelActions)
	if err != nil {
		return err
	}

```

## 根据配置创建 索引缓存
- 文档地址 https://thanos.io/tip/components/store.md/#in-memory-index-cache
- 如果 --index-cache.config-file 没有指定就是用本地内存创建缓存
- 是用 lru创建缓存
```go
	indexCacheContentYaml, err := conf.indexCacheConfigs.Content()
	if err != nil {
		return errors.Wrap(err, "get content of index cache configuration")
	}

	// Ensure we close up everything properly.
	defer func() {
		if err != nil {
			runutil.CloseWithLogOnErr(logger, bkt, "bucket client")
		}
	}()

	// Create the index cache loading its config from config file, while keeping
	// backward compatibility with the pre-config file era.
	var indexCache storecache.IndexCache
	if len(indexCacheContentYaml) > 0 {
		indexCache, err = storecache.NewIndexCache(logger, indexCacheContentYaml, reg)
	} else {
		indexCache, err = storecache.NewInMemoryIndexCacheWithConfig(logger, reg, storecache.InMemoryIndexCacheConfig{
			MaxSize:     model.Bytes(conf.indexCacheSizeBytes),
			MaxItemSize: storecache.DefaultInMemoryIndexCacheConfig.MaxItemSize,
		})
	}
```

## 创建元数据 获取 的fetcher
```go
	ignoreDeletionMarkFilter := block.NewIgnoreDeletionMarkFilter(logger, bkt, time.Duration(conf.ignoreDeletionMarksDelay), conf.blockMetaFetchConcurrency)
	metaFetcher, err := block.NewMetaFetcher(logger, conf.blockMetaFetchConcurrency, bkt, conf.dataDir, extprom.WrapRegistererWithPrefix("thanos_", reg),
		[]block.MetadataFilter{
			block.NewTimePartitionMetaFilter(conf.filterConf.MinTime, conf.filterConf.MaxTime),
			block.NewLabelShardedMetaFilter(relabelConfig),
			block.NewConsistencyDelayMetaFilter(logger, time.Duration(conf.consistencyDelay), extprom.WrapRegistererWithPrefix("thanos_", reg)),
			ignoreDeletionMarkFilter,
			block.NewDeduplicateFilter(),
		}, nil)
	if err != nil {
		return errors.Wrap(err, "meta fetcher")
	}

```

## 创建prometheus查询的 并发限制器 gate
- 底层调用 https://github.com/prometheus/prometheus/blob/main/pkg/gate/gate.go
```go
	queriesGate := gate.New(extprom.WrapRegistererWithPrefix("thanos_bucket_store_series_", reg), int(conf.maxConcurrency))

```

## 是用上的参数创建 操作对象存储的对象bs 
```go
	options := []store.BucketStoreOption{
		store.WithLogger(logger),
		store.WithRegistry(reg),
		store.WithIndexCache(indexCache),
		store.WithQueryGate(queriesGate),
		store.WithChunkPool(chunkPool),
		store.WithFilterConfig(conf.filterConf),
	}

	if conf.debugLogging {
		options = append(options, store.WithDebugLogging())
	}

	bs, err := store.NewBucketStore(
		bkt,
		metaFetcher,
		conf.dataDir,
		store.NewChunksLimiterFactory(conf.maxSampleCount/store.MaxSamplesPerChunk), // The samples limit is an approximation based on the max number of samples per chunk.
		store.NewSeriesLimiterFactory(conf.maxTouchedSeriesCount),
		store.NewGapBasedPartitioner(store.PartitionerMaxGapSize),
		conf.blockSyncConcurrency,
		conf.advertiseCompatibilityLabel,
		conf.postingOffsetsInMemSampling,
		false,
		conf.lazyIndexReaderEnabled,
		conf.lazyIndexReaderIdleTimeout,
		options...,
	)
	if err != nil {
		return errors.Wrap(err, "create object storage store")
	}

```

# 启动时同步对象存储的 block元信息 
- 如果bs.InitialSync正常同步就继续，否则报错退出
```go
	bucketStoreReady := make(chan struct{})
	{
		ctx, cancel := context.WithCancel(context.Background())
		g.Add(func() error {
			defer runutil.CloseWithLogOnErr(logger, bkt, "bucket client")

			level.Info(logger).Log("msg", "initializing bucket store")
			begin := time.Now()
			if err := bs.InitialSync(ctx); err != nil {
				close(bucketStoreReady)
				return errors.Wrap(err, "bucket store initial sync")
			}
			level.Info(logger).Log("msg", "bucket store ready", "init_duration", time.Since(begin).String())
			close(bucketStoreReady)

			err := runutil.Repeat(conf.syncInterval, ctx.Done(), func() error {
				if err := bs.SyncBlocks(ctx); err != nil {
					level.Warn(logger).Log("msg", "syncing blocks failed", "err", err)
				}
				return nil
			})

			runutil.CloseWithLogOnErr(logger, bs, "bucket store")
			return err
		}, func(error) {
			cancel()
		})
	}
```

## 然后开启每3分钟同步的任务
```go
			err := runutil.Repeat(conf.syncInterval, ctx.Done(), func() error {
				if err := bs.SyncBlocks(ctx); err != nil {
					level.Warn(logger).Log("msg", "syncing blocks failed", "err", err)
				}
				return nil
			})

```

## InitialSync解析
- 代码位置 D:\go_path\src\github.com\thanos-io\thanos\pkg\store\bucket.go
### 先调用对象存储的接口获取 block的 metas信息
```go
	metas, _, metaFetchErr := s.fetcher.Fetch(ctx)
	// For partial view allow adding new blocks at least.
	if metaFetchErr != nil && metas == nil {
		return metaFetchErr
	}

	var wg sync.WaitGroup
	blockc := make(chan *metadata.Meta)
```

### 并发的加载 block
```go
	var wg sync.WaitGroup
	blockc := make(chan *metadata.Meta)

	for i := 0; i < s.blockSyncConcurrency; i++ {
		wg.Add(1)
		go func() {
			for meta := range blockc {
				if err := s.addBlock(ctx, meta); err != nil {
					continue
				}
			}
			wg.Done()
		}()
	}

	for id, meta := range metas {
		if b := s.getBlock(id); b != nil {
			continue
		}
		select {
		case <-ctx.Done():
		case blockc <- meta:
		}
	}

	close(blockc)
	wg.Wait()

	if metaFetchErr != nil {
		return metaFetchErr
	}

```

## 加载block  addBlock函数
### 准备工作
- 拼接dir
- 读取标签，算哈希
```go
	dir := filepath.Join(s.dir, meta.ULID.String())
	start := time.Now()

	level.Debug(s.logger).Log("msg", "loading new block", "id", meta.ULID)
	defer func() {
		if err != nil {
			s.metrics.blockLoadFailures.Inc()
			if err2 := os.RemoveAll(dir); err2 != nil {
				level.Warn(s.logger).Log("msg", "failed to remove block we cannot load", "err", err2)
			}
			level.Warn(s.logger).Log("msg", "loading block failed", "elapsed", time.Since(start), "id", meta.ULID, "err", err)
		} else {
			level.Info(s.logger).Log("msg", "loaded new block", "elapsed", time.Since(start), "id", meta.ULID)
		}
	}()
	s.metrics.blockLoads.Inc()

	lset := labels.FromMap(meta.Thanos.Labels)
	h := lset.Hash()
```

### 创建索引reader对象
- 根据data目录下的 index-header 文件准备 这个block的索引数据文件
- 如 /var/thanos/store/01FEHMEXVPZYD128FHFJSWEZGV/index-header 
```go
	indexHeaderReader, err := s.indexReaderPool.NewBinaryReader(
		ctx,
		s.logger,
		s.bkt,
		s.dir,
		meta.ULID,
		s.postingOffsetsInMemSampling,
	)
```

#### 查询对象存储索引数据后 写入索引文件
- D:\go_path\src\github.com\thanos-io\thanos\pkg\block\indexheader\binary_reader.go
- 先准备 br对象，再调用WriteBinary查询对象存储写入索引 
```go
// NewBinaryReader loads or builds new index-header if not present on disk.
func NewBinaryReader(ctx context.Context, logger log.Logger, bkt objstore.BucketReader, dir string, id ulid.ULID, postingOffsetsInMemSampling int) (*BinaryReader, error) {
	binfn := filepath.Join(dir, id.String(), block.IndexHeaderFilename)
	br, err := newFileBinaryReader(binfn, postingOffsetsInMemSampling)
	if err == nil {
		return br, nil
	}

	level.Debug(logger).Log("msg", "failed to read index-header from disk; recreating", "path", binfn, "err", err)

	start := time.Now()
	if err := WriteBinary(ctx, bkt, id, binfn); err != nil {
		return nil, errors.Wrap(err, "write index header")
	}

	level.Debug(logger).Log("msg", "built index-header file", "path", binfn, "elapsed", time.Since(start))
	return newFileBinaryReader(binfn, postingOffsetsInMemSampling)
}
```

#### WriteBinary函数
```go
func WriteBinary(ctx context.Context, bkt objstore.BucketReader, id ulid.ULID, filename string) (err error) {
	ir, indexVersion, err := newChunkedIndexReader(ctx, bkt, id)
	if err != nil {
		return errors.Wrap(err, "new index reader")
	}
	tmpFilename := filename + ".tmp"

	// Buffer for copying and encbuffers.
	// This also will control the size of file writer buffer.
	buf := make([]byte, 32*1024)
	bw, err := newBinaryWriter(tmpFilename, buf)
	if err != nil {
		return errors.Wrap(err, "new binary index header writer")
	}
	defer runutil.CloseWithErrCapture(&err, bw, "close binary writer for %s", tmpFilename)

	if err := bw.AddIndexMeta(indexVersion, ir.toc.PostingsTable); err != nil {
		return errors.Wrap(err, "add index meta")
	}

	if err := ir.CopySymbols(bw.SymbolsWriter(), buf); err != nil {
		return err
	}

	if err := bw.f.Flush(); err != nil {
		return errors.Wrap(err, "flush")
	}

	if err := ir.CopyPostingsOffsets(bw.PostingOffsetsWriter(), buf); err != nil {
		return err
	}

	if err := bw.f.Flush(); err != nil {
		return errors.Wrap(err, "flush")
	}

	if err := bw.WriteTOC(); err != nil {
		return errors.Wrap(err, "write index header TOC")
	}

	if err := bw.f.Flush(); err != nil {
		return errors.Wrap(err, "flush")
	}

	if err := bw.f.f.Sync(); err != nil {
		return errors.Wrap(err, "sync")
	}

	// Create index-header in atomic way, to avoid partial writes (e.g during restart or crash of store GW).
	return os.Rename(tmpFilename, filename)
}
```

# 开启grpc 查询数据的服务
- D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\store.go
```go
	{
		tlsCfg, err := tls.NewServerConfig(log.With(logger, "protocol", "gRPC"), conf.grpcConfig.tlsSrvCert, conf.grpcConfig.tlsSrvKey, conf.grpcConfig.tlsSrvClientCA)
		if err != nil {
			return errors.Wrap(err, "setup gRPC server")
		}

		s := grpcserver.New(logger, reg, tracer, grpcLogOpts, tagOpts, conf.component, grpcProbe,
			grpcserver.WithServer(store.RegisterStoreServer(bs)),
			grpcserver.WithListen(conf.grpcConfig.bindAddress),
			grpcserver.WithGracePeriod(time.Duration(conf.grpcConfig.gracePeriod)),
			grpcserver.WithTLSConfig(tlsCfg),
		)

		g.Add(func() error {
			<-bucketStoreReady
			statusProber.Ready()
			return s.ListenAndServe()
		}, func(err error) {
			statusProber.NotReady(err)
			s.Shutdown(err)
		})
	}
	// 
```

## 注册prometheus查询的grpc 服务
```go
grpcserver.WithServer(store.RegisterStoreServer(bs)),
```
- 位置 D:\go_path\src\github.com\thanos-io\thanos\pkg\store\storepb\rpc.pb.go
```go
var _Store_serviceDesc = grpc.ServiceDesc{
	ServiceName: "thanos.Store",
	HandlerType: (*StoreServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "Info",
			Handler:    _Store_Info_Handler,
		},
		{
			MethodName: "LabelNames",
			Handler:    _Store_LabelNames_Handler,
		},
		{
			MethodName: "LabelValues",
			Handler:    _Store_LabelValues_Handler,
		},
	},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "Series",
			Handler:       _Store_Series_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "store/storepb/rpc.proto",
}

```

# 开启查看ui相关的web
```go
	// Add bucket UI for loaded blocks.
	{
		r := route.New()
		ins := extpromhttp.NewInstrumentationMiddleware(reg, nil)

		compactorView := ui.NewBucketUI(logger, "", conf.webConfig.externalPrefix, conf.webConfig.prefixHeaderName, "/loaded", conf.component)
		compactorView.Register(r, true, ins)

		// Configure Request Logging for HTTP calls.
		logMiddleware := logging.NewHTTPServerMiddleware(logger, httpLogOpts...)
		api := blocksAPI.NewBlocksAPI(logger, conf.webConfig.disableCORS, "", flagsMap)
		api.Register(r.WithPrefix("/api/v1"), tracer, logger, ins, logMiddleware)

		metaFetcher.UpdateOnChange(func(blocks []metadata.Meta, err error) {
			compactorView.Set(blocks, err)
			api.SetLoaded(blocks, err)
		})
		srv.Handle("/", r)
	}

```

# 本节重点总结 :
- 启动时同步对象存储的各个block元信息到本地，并且将索引数据也同步过来
- 启动定时同步的任务
- 封装prometheus查询的grpc服务，对外提供服务，底层调用配置的对象存储查询

## 35.4 thanos-query 源码阅读

# 本节重点介绍 :
- 根据配置的后端存储grpc地址初始化 proxyStore
- 用proxyStore初始化api
- api完全实现了prometheus的v1查询接口
- 根据http查询，调用proxyStore 的grpc方法，底层就3种方法
    - Series
    - LabelNames
    - LabelValues
- 查询各个store ，store又对应对象存储，最终的查询由对象存储完成
- 同时如果不带matcher查询标签信息，又可以使用store本地的 index-reader缓存

# 初始化工作
- 创建文件发现的 sd 和dns sd

```go
	duplicatedStores := promauto.With(reg).NewCounter(prometheus.CounterOpts{
		Name: "thanos_query_duplicated_store_addresses_total",
		Help: "The number of times a duplicated store addresses is detected from the different configs in query",
	})

	dialOpts, err := extgrpc.StoreClientGRPCOpts(logger, reg, tracer, secure, skipVerify, cert, key, caCert, serverName)
	if err != nil {
		return errors.Wrap(err, "building gRPC client")
	}

	fileSDCache := cache.New()
	dnsStoreProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_query_store_apis_", reg),
		dns.ResolverType(dnsSDResolver),
	)

	for _, store := range strictStores {
		if dns.IsDynamicNode(store) {
			return errors.Errorf("%s is a dynamically specified store i.e. it uses SD and that is not permitted under strict mode. Use --store for this", store)
		}
	}

	dnsRuleProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_query_rule_apis_", reg),
		dns.ResolverType(dnsSDResolver),
	)

	dnsTargetProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_query_target_apis_", reg),
		dns.ResolverType(dnsSDResolver),
	)

	dnsMetadataProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_query_metadata_apis_", reg),
		dns.ResolverType(dnsSDResolver),
	)

	dnsExemplarProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_query_exemplar_apis_", reg),
		dns.ResolverType(dnsSDResolver),
	)
```

## 创建查询的endpoint集合
```go

	var (
		endpoints = query.NewEndpointSet(
			logger,
			reg,
			func() (specs []query.EndpointSpec) {
				// Add strict & static nodes.
				for _, addr := range strictStores {
					specs = append(specs, query.NewGRPCEndpointSpec(addr, true))
				}

				for _, dnsProvider := range []*dns.Provider{dnsStoreProvider, dnsRuleProvider, dnsExemplarProvider, dnsMetadataProvider, dnsTargetProvider} {
					var tmpSpecs []query.EndpointSpec

					for _, addr := range dnsProvider.Addresses() {
						tmpSpecs = append(tmpSpecs, query.NewGRPCEndpointSpec(addr, false))
					}
					tmpSpecs = removeDuplicateEndpointSpecs(logger, duplicatedStores, tmpSpecs)
					specs = append(specs, tmpSpecs...)
				}

				return specs
			},
			dialOpts,
			unhealthyStoreTimeout,
		)
```

## 创建各种代理对象和query-engine
```go
		proxy            = store.NewProxyStore(logger, reg, endpoints.GetStoreClients, component.Query, selectorLset, storeResponseTimeout)
		rulesProxy       = rules.NewProxy(logger, endpoints.GetRulesClients)
		targetsProxy     = targets.NewProxy(logger, endpoints.GetTargetsClients)
		metadataProxy    = metadata.NewProxy(logger, endpoints.GetMetricMetadataClients)
		exemplarsProxy   = exemplars.NewProxy(logger, endpoints.GetExemplarsStores, selectorLset)
		queryableCreator = query.NewQueryableCreator(
			logger,
			extprom.WrapRegistererWithPrefix("thanos_query_", reg),
			proxy,
			maxConcurrentSelects,
			queryTimeout,
		)
		engineOpts = promql.EngineOpts{
			Logger: logger,
			Reg:    reg,
			// TODO(bwplotka): Expose this as a flag: https://github.com/thanos-io/thanos/issues/703.
			MaxSamples:    math.MaxInt32,
			Timeout:       queryTimeout,
			LookbackDelta: lookbackDelta,
			NoStepSubqueryIntervalFn: func(int64) int64 {
				return defaultEvaluationInterval.Milliseconds()
			},
		}
```

## 开始存储地址更新的任务
```go
	{
		ctx, cancel := context.WithCancel(context.Background())
		g.Add(func() error {
			return runutil.Repeat(5*time.Second, ctx.Done(), func() error {
				endpoints.Update(ctx)
				return nil
			})
		}, func(error) {
			cancel()
			endpoints.Close()
		})
	}
```
- 底层调用thanos组件的info rpc方法获取信息 
- 位置 D:\go_path\src\github.com\thanos-io\thanos\pkg\info\infopb\rpc.pb.go
```go
func (c *infoClient) Info(ctx context.Context, in *InfoRequest, opts ...grpc.CallOption) (*InfoResponse, error) {
	out := new(InfoResponse)
	err := c.cc.Invoke(ctx, "/thanos.info.Info/Info", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}
```

## 如果配置了文件服务发现 storeapi  
- 对应命令行参数为 store.sd-files
```go
	if fileSD != nil {
		var fileSDUpdates chan []*targetgroup.Group
		ctxRun, cancelRun := context.WithCancel(context.Background())

		fileSDUpdates = make(chan []*targetgroup.Group)

		g.Add(func() error {
			fileSD.Run(ctxRun, fileSDUpdates)
			return nil
		}, func(error) {
			cancelRun()
		})

		ctxUpdate, cancelUpdate := context.WithCancel(context.Background())
		g.Add(func() error {
			for {
				select {
				case update := <-fileSDUpdates:
					// Discoverers sometimes send nil updates so need to check for it to avoid panics.
					if update == nil {
						continue
					}
					fileSDCache.Update(update)
					endpoints.Update(ctxUpdate)

					if err := dnsStoreProvider.Resolve(ctxUpdate, append(fileSDCache.Addresses(), storeAddrs...)); err != nil {
						level.Error(logger).Log("msg", "failed to resolve addresses for storeAPIs", "err", err)
					}

					// Rules apis do not support file service discovery as of now.
				case <-ctxUpdate.Done():
					return nil
				}
			}
		}, func(error) {
			cancelUpdate()
			close(fileSDUpdates)
		})
	}
```

## 定时解析 store-api地址
```go
	{
		ctx, cancel := context.WithCancel(context.Background())
		g.Add(func() error {
			return runutil.Repeat(dnsSDInterval, ctx.Done(), func() error {
				resolveCtx, resolveCancel := context.WithTimeout(ctx, dnsSDInterval)
				defer resolveCancel()
				if err := dnsStoreProvider.Resolve(resolveCtx, append(fileSDCache.Addresses(), storeAddrs...)); err != nil {
					level.Error(logger).Log("msg", "failed to resolve addresses for storeAPIs", "err", err)
				}
				if err := dnsRuleProvider.Resolve(resolveCtx, ruleAddrs); err != nil {
					level.Error(logger).Log("msg", "failed to resolve addresses for rulesAPIs", "err", err)
				}
				if err := dnsTargetProvider.Resolve(ctx, targetAddrs); err != nil {
					level.Error(logger).Log("msg", "failed to resolve addresses for targetsAPIs", "err", err)
				}
				if err := dnsMetadataProvider.Resolve(resolveCtx, metadataAddrs); err != nil {
					level.Error(logger).Log("msg", "failed to resolve addresses for metadataAPIs", "err", err)
				}
				if err := dnsExemplarProvider.Resolve(resolveCtx, exemplarAddrs); err != nil {
					level.Error(logger).Log("msg", "failed to resolve addresses for exemplarsAPI", "err", err)
				}
				return nil
			})
		}, func(error) {
			cancel()
		})
	}
```

# 使用配置的store 创建 proxystore用作后面api查询的client
```go
proxy            = store.NewProxyStore(logger, reg, endpoints.GetStoreClients, component.Query, selectorLset, storeResponseTimeout)
		queryableCreator = query.NewQueryableCreator(
			logger,
			extprom.WrapRegistererWithPrefix("thanos_query_", reg),
			proxy,
			maxConcurrentSelects,
			queryTimeout,
		)

```

# 启动ui和api 的http
- 使用之前创建的QueryableCreator 作为查询时产生 querier对象的方法
```go
	// Start query API + UI HTTP server.
	{
		router := route.New()

		// RoutePrefix must always start with '/'.
		webRoutePrefix = "/" + strings.Trim(webRoutePrefix, "/")

		// Redirect from / to /webRoutePrefix.
		if webRoutePrefix != "/" {
			router.Get("/", func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, webRoutePrefix+"/graph", http.StatusFound)
			})
			router.Get(webRoutePrefix, func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, webRoutePrefix+"/graph", http.StatusFound)
			})
			router = router.WithPrefix(webRoutePrefix)
		}

		// Configure Request Logging for HTTP calls.
		logMiddleware := logging.NewHTTPServerMiddleware(logger, httpLogOpts...)

		ins := extpromhttp.NewInstrumentationMiddleware(reg, nil)
		// TODO(bplotka in PR #513 review): pass all flags, not only the flags needed by prefix rewriting.
		ui.NewQueryUI(logger, endpoints, webExternalPrefix, webPrefixHeaderName).Register(router, ins)

		api := v1.NewQueryAPI(
			logger,
			endpoints,
			engineFactory(promql.NewEngine, engineOpts, dynamicLookbackDelta),
			queryableCreator,
			// NOTE: Will share the same replica label as the query for now.
			rules.NewGRPCClientWithDedup(rulesProxy, queryReplicaLabels),
			targets.NewGRPCClientWithDedup(targetsProxy, queryReplicaLabels),
			metadata.NewGRPCClient(metadataProxy),
			exemplars.NewGRPCClientWithDedup(exemplarsProxy, queryReplicaLabels),
			enableAutodownsampling,
			enableQueryPartialResponse,
			enableRulePartialResponse,
			enableTargetPartialResponse,
			enableMetricMetadataPartialResponse,
			queryReplicaLabels,
			flagsMap,
			defaultRangeQueryStep,
			instantDefaultMaxSourceResolution,
			defaultMetadataTimeRange,
			disableCORS,
			gate.New(
				extprom.WrapRegistererWithPrefix("thanos_query_concurrent_", reg),
				maxConcurrentQueries,
			),
			reg,
		)

		api.Register(router.WithPrefix("/api/v1"), tracer, logger, ins, logMiddleware)

		srv := httpserver.New(logger, reg, comp, httpProbe,
			httpserver.WithListen(httpBindAddr),
			httpserver.WithGracePeriod(httpGracePeriod),
			httpserver.WithTLSConfig(httpTLSConfig),
		)
		srv.Handle("/", router)

		g.Add(func() error {
			statusProber.Healthy()

			return srv.ListenAndServe()
		}, func(err error) {
			statusProber.NotReady(err)
			defer statusProber.NotHealthy(err)

			srv.Shutdown(err)
		})
	}
```

# 注册并启动grpc server
```go
// Start query (proxy) gRPC StoreAPI.
	{
		tlsCfg, err := tls.NewServerConfig(log.With(logger, "protocol", "gRPC"), grpcCert, grpcKey, grpcClientCA)
		if err != nil {
			return errors.Wrap(err, "setup gRPC server")
		}

		s := grpcserver.New(logger, reg, tracer, grpcLogOpts, tagOpts, comp, grpcProbe,
			grpcserver.WithServer(store.RegisterStoreServer(proxy)),
			grpcserver.WithServer(rules.RegisterRulesServer(rulesProxy)),
			grpcserver.WithServer(targets.RegisterTargetsServer(targetsProxy)),
			grpcserver.WithServer(metadata.RegisterMetadataServer(metadataProxy)),
			grpcserver.WithServer(exemplars.RegisterExemplarsServer(exemplarsProxy)),
			grpcserver.WithListen(grpcBindAddr),
			grpcserver.WithGracePeriod(grpcGracePeriod),
			grpcserver.WithTLSConfig(tlsCfg),
			grpcserver.WithMaxConnAge(grpcMaxConnAge),
		)

		g.Add(func() error {
			statusProber.Ready()
			return s.ListenAndServe()
		}, func(error) {
			statusProber.NotReady(err)
			s.Shutdown(err)
		})
	}
```

# 适配所有的prometheus查询接口
- 代码位置 D:\go_path\src\github.com\thanos-io\thanos\pkg\api\query\v1.go
- 这里可以看到我们熟悉的所有prometheus查询接口
```go
// Register the API's endpoints in the given router.
func (qapi *QueryAPI) Register(r *route.Router, tracer opentracing.Tracer, logger log.Logger, ins extpromhttp.InstrumentationMiddleware, logMiddleware *logging.HTTPServerMiddleware) {
	qapi.baseAPI.Register(r, tracer, logger, ins, logMiddleware)

	instr := api.GetInstr(tracer, logger, ins, logMiddleware, qapi.disableCORS)

	r.Get("/query", instr("query", qapi.query))
	r.Post("/query", instr("query", qapi.query))

	r.Get("/query_range", instr("query_range", qapi.queryRange))
	r.Post("/query_range", instr("query_range", qapi.queryRange))

	r.Get("/label/:name/values", instr("label_values", qapi.labelValues))

	r.Get("/series", instr("series", qapi.series))
	r.Post("/series", instr("series", qapi.series))

	r.Get("/labels", instr("label_names", qapi.labelNames))
	r.Post("/labels", instr("label_names", qapi.labelNames))

	r.Get("/stores", instr("stores", qapi.stores))

	r.Get("/rules", instr("rules", NewRulesHandler(qapi.ruleGroups, qapi.enableRulePartialResponse)))

	r.Get("/targets", instr("targets", NewTargetsHandler(qapi.targets, qapi.enableTargetPartialResponse)))

	r.Get("/metadata", instr("metadata", NewMetricMetadataHandler(qapi.metadatas, qapi.enableMetricMetadataPartialResponse)))

	r.Get("/query_exemplars", instr("exemplars", NewExemplarsHandler(qapi.exemplars, qapi.enableExemplarPartialResponse)))
	r.Post("/query_exemplars", instr("exemplars", NewExemplarsHandler(qapi.exemplars, qapi.enableExemplarPartialResponse)))
}
```

## 追踪查询过程 以labelname为例
```go
r.Get("/labels", instr("label_names", qapi.labelNames))
```
### 调用之前的 生成querier对象
```go
	q, err := qapi.queryableCreate(true, nil, storeDebugMatchers, 0, enablePartialResponse, true).
		Querier(r.Context(), timestamp.FromTime(start), timestamp.FromTime(end))
```
- 对应调用 D:\go_path\src\github.com\thanos-io\thanos\pkg\query\querier.go
```go
// Querier returns a new storage querier against the underlying proxy store API.
func (q *queryable) Querier(ctx context.Context, mint, maxt int64) (storage.Querier, error) {
	return newQuerier(ctx, q.logger, mint, maxt, q.replicaLabels, q.storeDebugMatchers, q.proxy, q.deduplicate, q.maxResolutionMillis, q.partialResponse, q.skipChunks, q.gateProviderFn(), q.selectTimeout), nil
}

```
- 结构体为 ,注意 proxy是后端存储 
```go
type querier struct {
	ctx                 context.Context
	logger              log.Logger
	cancel              func()
	mint, maxt          int64
	replicaLabels       map[string]struct{}
	storeDebugMatchers  [][]*labels.Matcher
	proxy               storepb.StoreServer
	deduplicate         bool
	maxResolutionMillis int64
	partialResponse     bool
	skipChunks          bool
	selectGate          gate.Gate
	selectTimeout       time.Duration
}

```

### 如果有matcher参数就用Select查询，如果没有使用LabelNames
```go
	if len(matcherSets) > 0 {
		// Get all series which match matchers.
		var sets []storage.SeriesSet
		for _, mset := range matcherSets {
			s := q.Select(false, nil, mset...)
			sets = append(sets, s)
		}
		names, warnings, err = labelNamesByMatchers(sets)
	} else {
		names, warnings, err = q.LabelNames()
	}

```

#### LabelNames方法
- D:\go_path\src\github.com\thanos-io\thanos\pkg\query\querier.go
- 底层调用proxy存储的LabelNames方法，就是grpc去调用各个 store 的api
```go
// LabelNames returns all the unique label names present in the block in sorted order.
func (q *querier) LabelNames() ([]string, storage.Warnings, error) {
	span, ctx := tracing.StartSpan(q.ctx, "querier_label_names")
	defer span.Finish()

	// TODO(bwplotka): Pass it using the SeriesRequest instead of relying on context.
	ctx = context.WithValue(ctx, store.StoreMatcherKey, q.storeDebugMatchers)

	resp, err := q.proxy.LabelNames(ctx, &storepb.LabelNamesRequest{
		PartialResponseDisabled: !q.partialResponse,
		Start:                   q.mint,
		End:                     q.maxt,
	})
	if err != nil {
		return nil, nil, errors.Wrap(err, "proxy LabelNames()")
	}

	var warns storage.Warnings
	for _, w := range resp.Warnings {
		warns = append(warns, errors.New(w))
	}

	return resp.Names, warns, nil
}
```
- 底层proxyStore的LabelNames方法
- D:\go_path\src\github.com\thanos-io\thanos\pkg\store\proxy.go 
```go
func (s *ProxyStore) LabelNames(ctx context.Context, r *storepb.LabelNamesRequest) (
	*storepb.LabelNamesResponse, error,
) {
	var (
		warnings       []string
		names          [][]string
		mtx            sync.Mutex
		g, gctx        = errgroup.WithContext(ctx)
		storeDebugMsgs []string
	)

	for _, st := range s.stores() {
		st := st

		// We might be able to skip the store if its meta information indicates it cannot have series matching our query.
		if ok, reason := storeMatches(gctx, st, r.Start, r.End); !ok {
			storeDebugMsgs = append(storeDebugMsgs, fmt.Sprintf("Store %s filtered out due to %v", st, reason))
			continue
		}
		storeDebugMsgs = append(storeDebugMsgs, fmt.Sprintf("Store %s queried", st))

		g.Go(func() error {
			resp, err := st.LabelNames(gctx, &storepb.LabelNamesRequest{
				PartialResponseDisabled: r.PartialResponseDisabled,
				Start:                   r.Start,
				End:                     r.End,
			})
			if err != nil {
				err = errors.Wrapf(err, "fetch label names from store %s", st)
				if r.PartialResponseDisabled {
					return err
				}

				mtx.Lock()
				warnings = append(warnings, err.Error())
				mtx.Unlock()
				return nil
			}

			mtx.Lock()
			warnings = append(warnings, resp.Warnings...)
			names = append(names, resp.Names)
			mtx.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	level.Debug(s.logger).Log("msg", strings.Join(storeDebugMsgs, ";"))
	return &storepb.LabelNamesResponse{
		Names:    strutil.MergeUnsortedSlices(names...),
		Warnings: warnings,
	}, nil
}

```

- 再底层就是 bucketStore 的LabelNames
- 通过读取 block的index-reader文件可以查到 labelNames
- D:\go_path\src\github.com\thanos-io\thanos\pkg\store\bucket.go

```go
// LabelNames implements the storepb.StoreServer interface.
func (s *BucketStore) LabelNames(ctx context.Context, req *storepb.LabelNamesRequest) (*storepb.LabelNamesResponse, error) {
	reqSeriesMatchers, err := storepb.MatchersToPromMatchers(req.Matchers...)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, errors.Wrap(err, "translate request labels matchers").Error())
	}

	resHints := &hintspb.LabelNamesResponseHints{}

	var reqBlockMatchers []*labels.Matcher
	if req.Hints != nil {
		reqHints := &hintspb.LabelNamesRequestHints{}
		err := types.UnmarshalAny(req.Hints, reqHints)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, errors.Wrap(err, "unmarshal label names request hints").Error())
		}

		reqBlockMatchers, err = storepb.MatchersToPromMatchers(reqHints.BlockMatchers...)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, errors.Wrap(err, "translate request hints labels matchers").Error())
		}
	}

	g, gctx := errgroup.WithContext(ctx)

	s.mtx.RLock()

	var mtx sync.Mutex
	var sets [][]string
	var seriesLimiter = s.seriesLimiterFactory(s.metrics.queriesDropped.WithLabelValues("series"))

	for _, b := range s.blocks {
		b := b
		if !b.overlapsClosedInterval(req.Start, req.End) {
			continue
		}
		if len(reqBlockMatchers) > 0 && !b.matchRelabelLabels(reqBlockMatchers) {
			continue
		}

		resHints.AddQueriedBlock(b.meta.ULID)

		indexr := b.indexReader(gctx)

		g.Go(func() error {
			defer runutil.CloseWithLogOnErr(s.logger, indexr, "label names")

			var result []string
			if len(reqSeriesMatchers) == 0 {
				// Do it via index reader to have pending reader registered correctly.
				// LabelNames are already sorted.
				res, err := indexr.block.indexHeaderReader.LabelNames()
				if err != nil {
					return errors.Wrapf(err, "label names for block %s", b.meta.ULID)
				}

				// Add  a set for the external labels as well.
				// We're not adding them directly to res because there could be duplicates.
				// b.extLset is already sorted by label name, no need to sort it again.
				extRes := make([]string, 0, len(b.extLset))
				for _, l := range b.extLset {
					extRes = append(extRes, l.Name)
				}

				result = strutil.MergeSlices(res, extRes)
			} else {
				seriesSet, _, err := blockSeries(b.extLset, indexr, nil, reqSeriesMatchers, nil, seriesLimiter, true, req.Start, req.End, nil)
				if err != nil {
					return errors.Wrapf(err, "fetch series for block %s", b.meta.ULID)
				}

				// Extract label names from all series. Many label names will be the same, so we need to deduplicate them.
				// Note that label names will already include external labels (passed to blockSeries), so we don't need
				// to add them again.
				labelNames := map[string]struct{}{}
				for seriesSet.Next() {
					ls, _ := seriesSet.At()
					for _, l := range ls {
						labelNames[l.Name] = struct{}{}
					}
				}
				if seriesSet.Err() != nil {
					return errors.Wrapf(seriesSet.Err(), "iterate series for block %s", b.meta.ULID)
				}

				result = make([]string, 0, len(labelNames))
				for n := range labelNames {
					result = append(result, n)
				}
				sort.Strings(result)
			}

			if len(result) > 0 {
				mtx.Lock()
				sets = append(sets, result)
				mtx.Unlock()
			}

			return nil
		})
	}

	s.mtx.RUnlock()

	if err := g.Wait(); err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	anyHints, err := types.MarshalAny(resHints)
	if err != nil {
		return nil, status.Error(codes.Unknown, errors.Wrap(err, "marshal label names response hints").Error())
	}

	return &storepb.LabelNamesResponse{
		Names: strutil.MergeSlices(sets...),
		Hints: anyHints,
	}, nil
}
```

# 本节重点总结 :
- 根据配置的后端存储grpc地址初始化 proxyStore
- 用proxyStore初始化api
- api完全实现了prometheus的v1查询接口
- 根据http查询，调用proxyStore 的grpc方法，底层就3种方法
    - Series
    - LabelNames
    - LabelValues
- 查询各个store ，store又对应对象存储，最终的查询由对象存储完成
- 同时如果不带matcher查询标签信息，又可以使用store本地的 index-reader缓存

## 35.5 thanos-compactor 源码阅读

# 本节重点介绍 :

# compact做什么
- 定时扫描对象存储的block，干2件事
    - 压实
        - 通过plan拿到所有要压实的block
        - 通过对象存储下载block
        - 底层调用prometheus的level-compact压实
        - 将新的block上传到对象存储
    - 降采样
        - 通过对象存储下载block
        - 底层调用降采样函数降采样
        - 将新的block上传到对象存储

# 初始化工作
- 入口 runCompact D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\compact.go 
- 创建探活的prober
- 创建基础http server
```go
	deleteDelay := time.Duration(conf.deleteDelay)
	compactMetrics := newCompactMetrics(reg, deleteDelay)
	downsampleMetrics := newDownsampleMetrics(reg)

	httpProbe := prober.NewHTTP()
	statusProber := prober.Combine(
		httpProbe,
		prober.NewInstrumentation(component, logger, extprom.WrapRegistererWithPrefix("thanos_", reg)),
	)

	srv := httpserver.New(logger, reg, component, httpProbe,
		httpserver.WithListen(conf.http.bindAddress),
		httpserver.WithGracePeriod(time.Duration(conf.http.gracePeriod)),
		httpserver.WithTLSConfig(conf.http.tlsConfig),
	)

	g.Add(func() error {
		statusProber.Healthy()

		return srv.ListenAndServe()
	}, func(err error) {
		statusProber.NotReady(err)
		defer statusProber.NotHealthy(err)

		srv.Shutdown(err)
	})
```

## 根据对象存储配置创建 bkt
```go
	confContentYaml, err := conf.objStore.Content()
	if err != nil {
		return err
	}

	bkt, err := client.NewBucket(logger, confContentYaml, reg, component.String())
	if err != nil {
		return err
	}

```

## 创建一些过滤器
```go
	// While fetching blocks, we filter out blocks that were marked for deletion by using IgnoreDeletionMarkFilter.
	// The delay of deleteDelay/2 is added to ensure we fetch blocks that are meant to be deleted but do not have a replacement yet.
	// This is to make sure compactor will not accidentally perform compactions with gap instead.
	ignoreDeletionMarkFilter := block.NewIgnoreDeletionMarkFilter(logger, bkt, deleteDelay/2, conf.blockMetaFetchConcurrency)
	duplicateBlocksFilter := block.NewDeduplicateFilter()
	noCompactMarkerFilter := compact.NewGatherNoCompactionMarkFilter(logger, bkt, conf.blockMetaFetchConcurrency)
	labelShardedMetaFilter := block.NewLabelShardedMetaFilter(relabelConfig)
	consistencyDelayMetaFilter := block.NewConsistencyDelayMetaFilter(logger, conf.consistencyDelay, extprom.WrapRegistererWithPrefix("thanos_", reg))

```

## 创建ui的http view
```go
		compactorView = ui.NewBucketUI(
			logger,
			conf.label,
			conf.webConf.externalPrefix,
			conf.webConf.prefixHeaderName,
			"/loaded",
			component,
		)
		api = blocksAPI.NewBlocksAPI(logger, conf.webConf.disableCORS, conf.label, flagsMap)
```

## 创建元信息fetcher 和同步的sy
```go
		// Make sure all compactor meta syncs are done through Syncer.SyncMeta for readability.
		cf := baseMetaFetcher.NewMetaFetcher(
			extprom.WrapRegistererWithPrefix("thanos_", reg), []block.MetadataFilter{
				labelShardedMetaFilter,
				consistencyDelayMetaFilter,
				ignoreDeletionMarkFilter,
				duplicateBlocksFilter,
				noCompactMarkerFilter,
			}, []block.MetadataModifier{block.NewReplicaLabelRemover(logger, conf.dedupReplicaLabels)},
		)
		cf.UpdateOnChange(func(blocks []metadata.Meta, err error) {
			compactorView.Set(blocks, err)
			api.SetLoaded(blocks, err)
		})
		sy, err = compact.NewMetaSyncer(
			logger,
			reg,
			bkt,
			cf,
			duplicateBlocksFilter,
			ignoreDeletionMarkFilter,
			compactMetrics.blocksMarked.WithLabelValues(metadata.DeletionMarkFilename, ""),
			compactMetrics.garbageCollectedBlocks,
			conf.blockSyncConcurrency)
		if err != nil {
			return errors.Wrap(err, "create syncer")
		}
```

## 默认最大压缩4层
```go
	levels, err := compactions.levels(conf.maxCompactionLevel)
	if err != nil {
		return errors.Wrap(err, "get compaction levels")
	}

	if conf.maxCompactionLevel < compactions.maxLevel() {
		level.Warn(logger).Log("msg", "Max compaction level is lower than should be", "current", conf.maxCompactionLevel, "default", compactions.maxLevel())
	}

	ctx, cancel := context.WithCancel(context.Background())

	defer func() {
		if rerr != nil {
			cancel()
		}
	}()
```

# 根据默认的去重函数初始化merge func
- 默认为空，使用 NewCompactingChunkSeriesMerger
```go
	var mergeFunc storage.VerticalChunkSeriesMergeFunc
	switch conf.dedupFunc {
	case compact.DedupAlgorithmPenalty:
		mergeFunc = dedup.NewChunkSeriesMerger()

		if len(conf.dedupReplicaLabels) == 0 {
			return errors.New("penalty based deduplication needs at least one replica label specified")
		}
	case "":
		mergeFunc = storage.NewCompactingChunkSeriesMerger(storage.ChainedSeriesMerge)

	default:
		return errors.Errorf("unsupported deduplication func, got %s", conf.dedupFunc)
	}

```

# 创建levelCompactor
```go
	comp, err := tsdb.NewLeveledCompactor(ctx, reg, logger, levels, downsample.NewPool(), mergeFunc)
	if err != nil {
		return errors.Wrap(err, "create compactor")
	}

```

## 创建 compact 和downsample目录
```go
	var (
		compactDir      = path.Join(conf.dataDir, "compact")
		downsamplingDir = path.Join(conf.dataDir, "downsample")
	)

	if err := os.MkdirAll(compactDir, os.ModePerm); err != nil {
		return errors.Wrap(err, "create working compact directory")
	}

	if err := os.MkdirAll(downsamplingDir, os.ModePerm); err != nil {
		return errors.Wrap(err, "create working downsample directory")
	}

```

# 创建核心的compactor
## 依次创建几个需要的对象
- grouper 是block的分组
- blocksCleaner 是清理block的对象
- planner是prometheus计划执行者
```go
	grouper := compact.NewDefaultGrouper(
		logger,
		bkt,
		conf.acceptMalformedIndex,
		enableVerticalCompaction,
		reg,
		compactMetrics.blocksMarked.WithLabelValues(metadata.DeletionMarkFilename, ""),
		compactMetrics.garbageCollectedBlocks,
		compactMetrics.blocksMarked.WithLabelValues(metadata.NoCompactMarkFilename, metadata.OutOfOrderChunksNoCompactReason),
		metadata.HashFunc(conf.hashFunc),
	)
	planner := compact.WithLargeTotalIndexSizeFilter(
		compact.NewPlanner(logger, levels, noCompactMarkerFilter),
		bkt,
		int64(conf.maxBlockIndexSize),
		compactMetrics.blocksMarked.WithLabelValues(metadata.NoCompactMarkFilename, metadata.IndexSizeExceedingNoCompactReason),
	)
	blocksCleaner := compact.NewBlocksCleaner(logger, bkt, ignoreDeletionMarkFilter, deleteDelay, compactMetrics.blocksCleaned, compactMetrics.blockCleanupFailures)
	
```

## 创建compactor
```go
compactor, err := compact.NewBucketCompactor(
		logger,
		sy,
		grouper,
		planner,
		comp,
		compactDir,
		bkt,
		conf.compactionConcurrency,
		conf.skipBlockWithOutOfOrderChunks,
	)
```

## 清理的函数
```go
	cleanPartialMarked := func() error {
		cleanMtx.Lock()
		defer cleanMtx.Unlock()

		if err := sy.SyncMetas(ctx); err != nil {
			cancel()
			return errors.Wrap(err, "syncing metas")
		}

		compact.BestEffortCleanAbortedPartialUploads(ctx, logger, sy.Partial(), bkt, compactMetrics.partialUploadDeleteAttempts, compactMetrics.blocksCleaned, compactMetrics.blockCleanupFailures)
		if err := blocksCleaner.DeleteMarkedBlocks(ctx); err != nil {
			return errors.Wrap(err, "cleaning marked blocks")
		}
		compactMetrics.cleanups.Inc()

		return nil
	}

```

# compactMainFn代表压实主函数
```go
	compactMainFn := func() error {
		if err := compactor.Compact(ctx); err != nil {
			return errors.Wrap(err, "compaction")
		}

		if !conf.disableDownsampling {
			// After all compactions are done, work down the downsampling backlog.
			// We run two passes of this to ensure that the 1h downsampling is generated
			// for 5m downsamplings created in the first run.
			level.Info(logger).Log("msg", "start first pass of downsampling")
			if err := sy.SyncMetas(ctx); err != nil {
				return errors.Wrap(err, "sync before first pass of downsampling")
			}

			for _, meta := range sy.Metas() {
				groupKey := compact.DefaultGroupKey(meta.Thanos)
				downsampleMetrics.downsamples.WithLabelValues(groupKey)
				downsampleMetrics.downsampleFailures.WithLabelValues(groupKey)
			}
			if err := downsampleBucket(ctx, logger, downsampleMetrics, bkt, sy.Metas(), downsamplingDir, conf.downsampleConcurrency, metadata.HashFunc(conf.hashFunc)); err != nil {
				return errors.Wrap(err, "first pass of downsampling failed")
			}

			level.Info(logger).Log("msg", "start second pass of downsampling")
			if err := sy.SyncMetas(ctx); err != nil {
				return errors.Wrap(err, "sync before second pass of downsampling")
			}
			if err := downsampleBucket(ctx, logger, downsampleMetrics, bkt, sy.Metas(), downsamplingDir, conf.downsampleConcurrency, metadata.HashFunc(conf.hashFunc)); err != nil {
				return errors.Wrap(err, "second pass of downsampling failed")
			}
			level.Info(logger).Log("msg", "downsampling iterations done")
		} else {
			level.Info(logger).Log("msg", "downsampling was explicitly disabled")
		}

		// TODO(bwplotka): Find a way to avoid syncing if no op was done.
		if err := sy.SyncMetas(ctx); err != nil {
			return errors.Wrap(err, "sync before first pass of downsampling")
		}

		if err := compact.ApplyRetentionPolicyByResolution(ctx, logger, bkt, sy.Metas(), retentionByResolution, compactMetrics.blocksMarked.WithLabelValues(metadata.DeletionMarkFilename, "")); err != nil {
			return errors.Wrap(err, "retention failed")
		}

		return cleanPartialMarked()
	}

```

## 5分组执行一下压实函数
```go

	g.Add(func() error {
		defer runutil.CloseWithLogOnErr(logger, bkt, "bucket client")

		if !conf.wait {
			return compactMainFn()
		}

		// --wait=true is specified.
		return runutil.Repeat(conf.waitInterval, ctx.Done(), func() error {
			err := compactMainFn()
			if err == nil {
				compactMetrics.iterations.Inc()
				return nil
			}

			// The HaltError type signals that we hit a critical bug and should block
			// for investigation. You should alert on this being halted.
			if compact.IsHaltError(err) {
				if conf.haltOnError {
					level.Error(logger).Log("msg", "critical error detected; halting", "err", err)
					compactMetrics.halted.Set(1)
					select {}
				} else {
					return errors.Wrap(err, "critical error detected")
				}
			}

			// The RetryError signals that we hit an retriable error (transient error, no connection).
			// You should alert on this being triggered too frequently.
			if compact.IsRetryError(err) {
				level.Error(logger).Log("msg", "retriable error", "err", err)
				compactMetrics.retried.Inc()
				// TODO(bplotka): use actual "retry()" here instead of waiting 5 minutes?
				return nil
			}

			return errors.Wrap(err, "error executing compaction")
		})
	}, func(error) {
		cancel()
	})
```

## 压实任务中 执行任务1：压实 
- D:\go_path\src\github.com\thanos-io\thanos\pkg\compact\compact.go
### 核心函数  compact
- D:\go_path\src\github.com\thanos-io\thanos\pkg\compact\compact.go
- 先通过plan获取所有要压实的block
- 然后通过对象存储下载block进行压实
- 压实完之后再上传
```go
func (cg *Group) compact(ctx context.Context, dir string, planner Planner, comp Compactor) (shouldRerun bool, compID ulid.ULID, err error) {
	cg.mtx.Lock()
	defer cg.mtx.Unlock()

	// Check for overlapped blocks.
	overlappingBlocks := false
	if err := cg.areBlocksOverlapping(nil); err != nil {
		// TODO(bwplotka): It would really nice if we could still check for other overlaps than replica. In fact this should be checked
		// in syncer itself. Otherwise with vertical compaction enabled we will sacrifice this important check.
		if !cg.enableVerticalCompaction {
			return false, ulid.ULID{}, halt(errors.Wrap(err, "pre compaction overlap check"))
		}

		overlappingBlocks = true
	}

	toCompact, err := planner.Plan(ctx, cg.metasByMinTime)
	if err != nil {
		return false, ulid.ULID{}, errors.Wrap(err, "plan compaction")
	}
	if len(toCompact) == 0 {
		// Nothing to do.
		return false, ulid.ULID{}, nil
	}

	level.Info(cg.logger).Log("msg", "compaction available and planned; downloading blocks", "plan", fmt.Sprintf("%v", toCompact))

	// Due to #183 we verify that none of the blocks in the plan have overlapping sources.
	// This is one potential source of how we could end up with duplicated chunks.
	uniqueSources := map[ulid.ULID]struct{}{}

	// Once we have a plan we need to download the actual data.
	begin := time.Now()

	toCompactDirs := make([]string, 0, len(toCompact))
	for _, meta := range toCompact {
		bdir := filepath.Join(dir, meta.ULID.String())
		for _, s := range meta.Compaction.Sources {
			if _, ok := uniqueSources[s]; ok {
				return false, ulid.ULID{}, halt(errors.Errorf("overlapping sources detected for plan %v", toCompact))
			}
			uniqueSources[s] = struct{}{}
		}

		if err := block.Download(ctx, cg.logger, cg.bkt, meta.ULID, bdir); err != nil {
			return false, ulid.ULID{}, retry(errors.Wrapf(err, "download block %s", meta.ULID))
		}

		// Ensure all input blocks are valid.
		stats, err := block.GatherIndexHealthStats(cg.logger, filepath.Join(bdir, block.IndexFilename), meta.MinTime, meta.MaxTime)
		if err != nil {
			return false, ulid.ULID{}, errors.Wrapf(err, "gather index issues for block %s", bdir)
		}

		if err := stats.CriticalErr(); err != nil {
			return false, ulid.ULID{}, halt(errors.Wrapf(err, "block with not healthy index found %s; Compaction level %v; Labels: %v", bdir, meta.Compaction.Level, meta.Thanos.Labels))
		}

		if err := stats.OutOfOrderChunksErr(); err != nil {
			return false, ulid.ULID{}, outOfOrderChunkError(errors.Wrapf(err, "blocks with out-of-order chunks are dropped from compaction:  %s", bdir), meta.ULID)
		}

		if err := stats.Issue347OutsideChunksErr(); err != nil {
			return false, ulid.ULID{}, issue347Error(errors.Wrapf(err, "invalid, but reparable block %s", bdir), meta.ULID)
		}

		if err := stats.PrometheusIssue5372Err(); !cg.acceptMalformedIndex && err != nil {
			return false, ulid.ULID{}, errors.Wrapf(err,
				"block id %s, try running with --debug.accept-malformed-index", meta.ULID)
		}
		toCompactDirs = append(toCompactDirs, bdir)
	}
	level.Info(cg.logger).Log("msg", "downloaded and verified blocks; compacting blocks", "plan", fmt.Sprintf("%v", toCompactDirs), "duration", time.Since(begin), "duration_ms", time.Since(begin).Milliseconds())

	begin = time.Now()
	compID, err = comp.Compact(dir, toCompactDirs, nil)
	if err != nil {
		return false, ulid.ULID{}, halt(errors.Wrapf(err, "compact blocks %v", toCompactDirs))
	}
	if compID == (ulid.ULID{}) {
		// Prometheus compactor found that the compacted block would have no samples.
		level.Info(cg.logger).Log("msg", "compacted block would have no samples, deleting source blocks", "blocks", fmt.Sprintf("%v", toCompactDirs))
		for _, meta := range toCompact {
			if meta.Stats.NumSamples == 0 {
				if err := cg.deleteBlock(meta.ULID, filepath.Join(dir, meta.ULID.String())); err != nil {
					level.Warn(cg.logger).Log("msg", "failed to mark for deletion an empty block found during compaction", "block", meta.ULID)
				}
			}
		}
		// Even though this block was empty, there may be more work to do.
		return true, ulid.ULID{}, nil
	}
	cg.compactions.Inc()
	if overlappingBlocks {
		cg.verticalCompactions.Inc()
	}
	level.Info(cg.logger).Log("msg", "compacted blocks", "new", compID,
		"blocks", fmt.Sprintf("%v", toCompactDirs), "duration", time.Since(begin), "duration_ms", time.Since(begin).Milliseconds(), "overlapping_blocks", overlappingBlocks)

	bdir := filepath.Join(dir, compID.String())
	index := filepath.Join(bdir, block.IndexFilename)

	newMeta, err := metadata.InjectThanos(cg.logger, bdir, metadata.Thanos{
		Labels:       cg.labels.Map(),
		Downsample:   metadata.ThanosDownsample{Resolution: cg.resolution},
		Source:       metadata.CompactorSource,
		SegmentFiles: block.GetSegmentFiles(bdir),
	}, nil)
	if err != nil {
		return false, ulid.ULID{}, errors.Wrapf(err, "failed to finalize the block %s", bdir)
	}

	if err = os.Remove(filepath.Join(bdir, "tombstones")); err != nil {
		return false, ulid.ULID{}, errors.Wrap(err, "remove tombstones")
	}

	// Ensure the output block is valid.
	if err := block.VerifyIndex(cg.logger, index, newMeta.MinTime, newMeta.MaxTime); !cg.acceptMalformedIndex && err != nil {
		return false, ulid.ULID{}, halt(errors.Wrapf(err, "invalid result block %s", bdir))
	}

	// Ensure the output block is not overlapping with anything else,
	// unless vertical compaction is enabled.
	if !cg.enableVerticalCompaction {
		if err := cg.areBlocksOverlapping(newMeta, toCompact...); err != nil {
			return false, ulid.ULID{}, halt(errors.Wrapf(err, "resulted compacted block %s overlaps with something", bdir))
		}
	}

	begin = time.Now()

	if err := block.Upload(ctx, cg.logger, cg.bkt, bdir, cg.hashFunc); err != nil {
		return false, ulid.ULID{}, retry(errors.Wrapf(err, "upload of %s failed", compID))
	}
	level.Info(cg.logger).Log("msg", "uploaded block", "result_block", compID, "duration", time.Since(begin), "duration_ms", time.Since(begin).Milliseconds())

	// Mark for deletion the blocks we just compacted from the group and bucket so they do not get included
	// into the next planning cycle.
	// Eventually the block we just uploaded should get synced into the group again (including sync-delay).
	for _, meta := range toCompact {
		if err := cg.deleteBlock(meta.ULID, filepath.Join(dir, meta.ULID.String())); err != nil {
			return false, ulid.ULID{}, retry(errors.Wrapf(err, "mark old block for deletion from bucket"))
		}
		cg.groupGarbageCollectedBlocks.Inc()
	}
	return true, compID, nil
}
```
## 压实任务中 执行任务2：降采样
- D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\downsample.go
### 核心函数 processDownsampling
- D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\downsample.go
- 从对象存储中下载block目录，执行降采样方法，将结果block上传上去
```go
func processDownsampling(
	ctx context.Context,
	logger log.Logger,
	bkt objstore.Bucket,
	m *metadata.Meta,
	dir string,
	resolution int64,
	hashFunc metadata.HashFunc,
	metrics *DownsampleMetrics,
) error {
	begin := time.Now()
	bdir := filepath.Join(dir, m.ULID.String())

	err := block.Download(ctx, logger, bkt, m.ULID, bdir)
	if err != nil {
		return errors.Wrapf(err, "download block %s", m.ULID)
	}
	level.Info(logger).Log("msg", "downloaded block", "id", m.ULID, "duration", time.Since(begin), "duration_ms", time.Since(begin).Milliseconds())

	if err := block.VerifyIndex(logger, filepath.Join(bdir, block.IndexFilename), m.MinTime, m.MaxTime); err != nil {
		return errors.Wrap(err, "input block index not valid")
	}

	begin = time.Now()

	var pool chunkenc.Pool
	if m.Thanos.Downsample.Resolution == 0 {
		pool = chunkenc.NewPool()
	} else {
		pool = downsample.NewPool()
	}

	b, err := tsdb.OpenBlock(logger, bdir, pool)
	if err != nil {
		return errors.Wrapf(err, "open block %s", m.ULID)
	}
	defer runutil.CloseWithLogOnErr(log.With(logger, "outcome", "potential left mmap file handlers left"), b, "tsdb reader")

	id, err := downsample.Downsample(logger, m, b, dir, resolution)
	if err != nil {
		return errors.Wrapf(err, "downsample block %s to window %d", m.ULID, resolution)
	}
	resdir := filepath.Join(dir, id.String())

	downsampleDuration := time.Since(begin)
	level.Info(logger).Log("msg", "downsampled block",
		"from", m.ULID, "to", id, "duration", downsampleDuration, "duration_ms", downsampleDuration.Milliseconds())
	metrics.downsampleDuration.WithLabelValues(compact.DefaultGroupKey(m.Thanos)).Observe(downsampleDuration.Seconds())

	if err := block.VerifyIndex(logger, filepath.Join(resdir, block.IndexFilename), m.MinTime, m.MaxTime); err != nil {
		return errors.Wrap(err, "output block index not valid")
	}

	begin = time.Now()

	err = block.Upload(ctx, logger, bkt, resdir, hashFunc)
	if err != nil {
		return errors.Wrapf(err, "upload downsampled block %s", id)
	}

	level.Info(logger).Log("msg", "uploaded block", "id", id, "duration", time.Since(begin), "duration_ms", time.Since(begin).Milliseconds())

	// It is not harmful if these fails.
	if err := os.RemoveAll(bdir); err != nil {
		level.Warn(logger).Log("msg", "failed to clean directory", "dir", bdir, "err", err)
	}
	if err := os.RemoveAll(resdir); err != nil {
		level.Warn(logger).Log("msg", "failed to clean directory", "resdir", bdir, "err", err)
	}

	return nil
}

```

# 本节重点总结 :

# compact做什么
- 定时扫描对象存储的block，干2件事
    - 压实
        - 通过plan拿到所有要压实的block
        - 通过对象存储下载block
        - 底层调用prometheus的level-compact压实
        - 将新的block上传到对象存储
    - 降采样
        - 通过对象存储下载block
        - 底层调用降采样函数降采样
        - 将新的block上传到对象存储

## 35.6 thanos-rule 源码阅读

# 本节重点总结 :

# rule做了什么

- 根据配置的查询地址 创建查询prometheus数据的clients，给后面的报警和预聚合使用
- 新建本地tsdb，为了写入用户配置的预聚合指标结果
- 根据配置的alertmanager 信息进行初始化操作并启动发送任务
- 使用查询数据的clients初始化ruleManager，并调用prometheus 的ruleManager Run执行任务
- 如果用户配置了对象存储，就开启shipper将预聚合的指标定期传上去

# 准备工作

- 执行入口 runRule D:\go_path\src\github.com\thanos-io\thanos\cmd\thanos\rule.go

## 根据配置的query 创建querycfg

```go
	var queryCfg []query.Config
	var err error
	if len(conf.queryConfigYAML) > 0 {
		queryCfg, err = query.LoadConfigs(conf.queryConfigYAML)
		if err != nil {
			return err
		}
	} else {
		queryCfg, err = query.BuildQueryConfig(conf.query.addrs)
		if err != nil {
			return err
		}

		// Build the query configuration from the legacy query flags.
		var fileSDConfigs []http_util.FileSDConfig
		if len(conf.query.sdFiles) > 0 {
			fileSDConfigs = append(fileSDConfigs, http_util.FileSDConfig{
				Files:           conf.query.sdFiles,
				RefreshInterval: model.Duration(conf.query.sdInterval),
			})
			queryCfg = append(queryCfg,
				query.Config{
					EndpointsConfig: http_util.EndpointsConfig{
						Scheme:        "http",
						FileSDConfigs: fileSDConfigs,
					},
				},
			)
		}
	}
```

## 初始化queryClient

```go
	queryProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_rule_query_apis_", reg),
		dns.ResolverType(conf.query.dnsSDResolver),
	)
	var queryClients []*http_util.Client
	queryClientMetrics := extpromhttp.NewClientMetrics(extprom.WrapRegistererWith(prometheus.Labels{"client": "query"}, reg))
	for _, cfg := range queryCfg {
		cfg.HTTPClientConfig.ClientMetrics = queryClientMetrics
		c, err := http_util.NewHTTPClient(cfg.HTTPClientConfig, "query")
		if err != nil {
			return err
		}
		c.Transport = tracing.HTTPTripperware(logger, c.Transport)
		queryClient, err := http_util.NewClient(logger, cfg.EndpointsConfig, c, queryProvider.Clone())
		if err != nil {
			return err
		}
		queryClients = append(queryClients, queryClient)
		// Discover and resolve query addresses.
		addDiscoveryGroups(g, queryClient, conf.query.dnsSDInterval)
	}

```

# 新建本地tsdb，为了写入配置的预聚合指标

```go
	db, err := tsdb.Open(conf.dataDir, log.With(logger, "component", "tsdb"), reg, tsdbOpts)
	if err != nil {
		return errors.Wrap(err, "open TSDB")
	}

	level.Debug(logger).Log("msg", "removing storage lock file if any")
	if err := removeLockfileIfAny(logger, conf.dataDir); err != nil {
		return errors.Wrap(err, "remove storage lock files")
	}

	{
		done := make(chan struct{})
		g.Add(func() error {
			<-done
			return db.Close()
		}, func(error) {
			close(done)
		})
	}
```

# 根据配置的alertmanager 信息进行初始化操作

```go
	// Build the Alertmanager clients.
	var alertingCfg alert.AlertingConfig
	if len(conf.alertmgrsConfigYAML) > 0 {
		alertingCfg, err = alert.LoadAlertingConfig(conf.alertmgrsConfigYAML)
		if err != nil {
			return err
		}
	} else {
		// Build the Alertmanager configuration from the legacy flags.
		for _, addr := range conf.alertmgr.alertmgrURLs {
			cfg, err := alert.BuildAlertmanagerConfig(addr, conf.alertmgr.alertmgrsTimeout)
			if err != nil {
				return err
			}
			alertingCfg.Alertmanagers = append(alertingCfg.Alertmanagers, cfg)
		}
	}

	if len(alertingCfg.Alertmanagers) == 0 {
		level.Warn(logger).Log("msg", "no alertmanager configured")
	}

	var alertRelabelConfigs []*relabel.Config
	if len(conf.alertRelabelConfigYAML) > 0 {
		alertRelabelConfigs, err = alert.LoadRelabelConfigs(conf.alertRelabelConfigYAML)
		if err != nil {
			return err
		}
	}

	amProvider := dns.NewProvider(
		logger,
		extprom.WrapRegistererWithPrefix("thanos_rule_alertmanagers_", reg),
		dns.ResolverType(conf.query.dnsSDResolver),
	)
	var alertmgrs []*alert.Alertmanager
	amClientMetrics := extpromhttp.NewClientMetrics(
		extprom.WrapRegistererWith(prometheus.Labels{"client": "alertmanager"}, reg),
	)
	for _, cfg := range alertingCfg.Alertmanagers {
		cfg.HTTPClientConfig.ClientMetrics = amClientMetrics
		c, err := http_util.NewHTTPClient(cfg.HTTPClientConfig, "alertmanager")
		if err != nil {
			return err
		}
		c.Transport = tracing.HTTPTripperware(logger, c.Transport)
		// Each Alertmanager client has a different list of targets thus each needs its own DNS provider.
		amClient, err := http_util.NewClient(logger, cfg.EndpointsConfig, c, amProvider.Clone())
		if err != nil {
			return err
		}
		// Discover and resolve Alertmanager addresses.
		addDiscoveryGroups(g, amClient, conf.alertmgr.alertmgrsDNSSDInterval)

		alertmgrs = append(alertmgrs, alert.NewAlertmanager(logger, amClient, time.Duration(cfg.Timeout), cfg.APIVersion))
	}

```

# 初始化ruleManager

## 创建告警的队列和通知func

```go
		alertQ  = alert.NewQueue(logger, reg, 10000, 100, labelsTSDBToProm(conf.lset), conf.alertmgr.alertExcludeLabels, alertRelabelConfigs)
	)
	{
		// Run rule evaluation and alert notifications.
		notifyFunc := func(ctx context.Context, expr string, alerts ...*rules.Alert) {
			res := make([]*alert.Alert, 0, len(alerts))
			for _, alrt := range alerts {
				// Only send actually firing alerts.
				if alrt.State == rules.StatePending {
					continue
				}
				a := &alert.Alert{
					StartsAt:     alrt.FiredAt,
					Labels:       alrt.Labels,
					Annotations:  alrt.Annotations,
					GeneratorURL: conf.alertQueryURL.String() + strutil.TableLinkForExpression(expr),
				}
				if !alrt.ResolvedAt.IsZero() {
					a.EndsAt = alrt.ResolvedAt
				} else {
					a.EndsAt = alrt.ValidUntil
				}
				res = append(res, a)
			}
			alertQ.Push(res)
		}
```

## 使用创建的tsdb和queryClient创建rules.Manager

- queryFuncCreator产生 queryFunc，使用的就是配置中的query 地址
- Appendable代表 预聚合产生的指标往本地创建的tsdb中写入

```go
		ctx, cancel := context.WithCancel(context.Background())
		logger = log.With(logger, "component", "rules")
		ruleMgr = thanosrules.NewManager(
			tracing.ContextWithTracer(ctx, tracer),
			reg,
			conf.dataDir,
			rules.ManagerOptions{
				NotifyFunc:  notifyFunc,
				Logger:      logger,
				Appendable:  db,
				ExternalURL: nil,
				Queryable:   db,
				ResendDelay: conf.resendDelay,
			},
			queryFuncCreator(logger, queryClients, metrics.duplicatedQuery, metrics.ruleEvalWarnings, conf.query.httpMethod),
			conf.lset,
		)

		// Schedule rule manager that evaluates rules.
		g.Add(func() error {
			ruleMgr.Run()
			<-ctx.Done()

			return nil
		}, func(err error) {
			cancel()
			ruleMgr.Stop()
		})
```

# 启动send发送告警任务

- 底层调用alertmanager v1 v2 接口

```go
	// Run the alert sender.
	{
		sdr := alert.NewSender(logger, reg, alertmgrs)
		ctx, cancel := context.WithCancel(context.Background())
		ctx = tracing.ContextWithTracer(ctx, tracer)

		g.Add(func() error {
			for {
				tracing.DoInSpan(ctx, "/send_alerts", func(ctx context.Context) {
					sdr.Send(ctx, alertQ.Pop(ctx.Done()))
				})

				select {
				case <-ctx.Done():
					return ctx.Err()
				default:
				}
			}
		}, func(error) {
			cancel()
		})
	}
```

# reload的任务

```go
// Handle reload and termination interrupts.
	reloadWebhandler := make(chan chan error)
	{
		ctx, cancel := context.WithCancel(context.Background())
		g.Add(func() error {
			// Initialize rules.
			if err := reloadRules(logger, conf.ruleFiles, ruleMgr, conf.evalInterval, metrics); err != nil {
				level.Error(logger).Log("msg", "initialize rules failed", "err", err)
				return err
			}
			for {
				select {
				case <-reloadSignal:
					if err := reloadRules(logger, conf.ruleFiles, ruleMgr, conf.evalInterval, metrics); err != nil {
						level.Error(logger).Log("msg", "reload rules by sighup failed", "err", err)
					}
				case reloadMsg := <-reloadWebhandler:
					err := reloadRules(logger, conf.ruleFiles, ruleMgr, conf.evalInterval, metrics)
					if err != nil {
						level.Error(logger).Log("msg", "reload rules by webhandler failed", "err", err)
					}
					reloadMsg <- err
				case <-ctx.Done():
					return ctx.Err()
				}
			}
		}, func(error) {
			cancel()
		})
	}
```

# grpc 和http ui

```go
grpcProbe := prober.NewGRPC()
	httpProbe := prober.NewHTTP()
	statusProber := prober.Combine(
		httpProbe,
		grpcProbe,
		prober.NewInstrumentation(comp, logger, extprom.WrapRegistererWithPrefix("thanos_", reg)),
	)

	// Start gRPC server.
	{
		tsdbStore := store.NewTSDBStore(logger, db, component.Rule, conf.lset)

		tlsCfg, err := tls.NewServerConfig(log.With(logger, "protocol", "gRPC"), conf.grpc.tlsSrvCert, conf.grpc.tlsSrvKey, conf.grpc.tlsSrvClientCA)
		if err != nil {
			return errors.Wrap(err, "setup gRPC server")
		}

		// TODO: Add rules API implementation when ready.
		s := grpcserver.New(logger, reg, tracer, grpcLogOpts, tagOpts, comp, grpcProbe,
			grpcserver.WithServer(store.RegisterStoreServer(tsdbStore)),
			grpcserver.WithServer(thanosrules.RegisterRulesServer(ruleMgr)),
			grpcserver.WithListen(conf.grpc.bindAddress),
			grpcserver.WithGracePeriod(time.Duration(conf.grpc.gracePeriod)),
			grpcserver.WithTLSConfig(tlsCfg),
		)

		g.Add(func() error {
			statusProber.Ready()
			return s.ListenAndServe()
		}, func(err error) {
			statusProber.NotReady(err)
			s.Shutdown(err)
		})
	}
	// Start UI & metrics HTTP server.
	{
		router := route.New()

		// RoutePrefix must always start with '/'.
		conf.web.routePrefix = "/" + strings.Trim(conf.web.routePrefix, "/")

		// Redirect from / to /webRoutePrefix.
		if conf.web.routePrefix != "/" {
			router.Get("/", func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, conf.web.routePrefix, http.StatusFound)
			})
			router = router.WithPrefix(conf.web.routePrefix)
		}

		router.Post("/-/reload", func(w http.ResponseWriter, r *http.Request) {
			reloadMsg := make(chan error)
			reloadWebhandler <- reloadMsg
			if err := <-reloadMsg; err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		})

		ins := extpromhttp.NewInstrumentationMiddleware(reg, nil)

		// Configure Request Logging for HTTP calls.
		logMiddleware := logging.NewHTTPServerMiddleware(logger, httpLogOpts...)

		// TODO(bplotka in PR #513 review): pass all flags, not only the flags needed by prefix rewriting.
		ui.NewRuleUI(logger, reg, ruleMgr, conf.alertQueryURL.String(), conf.web.externalPrefix, conf.web.prefixHeaderName).Register(router, ins)

		api := v1.NewRuleAPI(logger, reg, thanosrules.NewGRPCClient(ruleMgr), ruleMgr, conf.web.disableCORS, flagsMap)
		api.Register(router.WithPrefix("/api/v1"), tracer, logger, ins, logMiddleware)

		srv := httpserver.New(logger, reg, comp, httpProbe,
			httpserver.WithListen(conf.http.bindAddress),
			httpserver.WithGracePeriod(time.Duration(conf.http.gracePeriod)),
			httpserver.WithTLSConfig(conf.http.tlsConfig),
		)
		srv.Handle("/", router)

		g.Add(func() error {
			statusProber.Healthy()

			return srv.ListenAndServe()
		}, func(err error) {
			statusProber.NotReady(err)
			defer statusProber.NotHealthy(err)

			srv.Shutdown(err)
		})
	}
```

# 如果用户配置了对象存储，就开启shipper将预聚合的指标定期传上去

```go

	if len(confContentYaml) > 0 {
		// The background shipper continuously scans the data directory and uploads
		// new blocks to Google Cloud Storage or an S3-compatible storage service.
		bkt, err := client.NewBucket(logger, confContentYaml, reg, component.Rule.String())
		if err != nil {
			return err
		}

		// Ensure we close up everything properly.
		defer func() {
			if err != nil {
				runutil.CloseWithLogOnErr(logger, bkt, "bucket client")
			}
		}()

		s := shipper.New(logger, reg, conf.dataDir, bkt, func() labels.Labels { return conf.lset }, metadata.RulerSource, false, conf.shipper.allowOutOfOrderUpload, metadata.HashFunc(conf.shipper.hashFunc))

		ctx, cancel := context.WithCancel(context.Background())

		g.Add(func() error {
			defer runutil.CloseWithLogOnErr(logger, bkt, "bucket client")

			return runutil.Repeat(30*time.Second, ctx.Done(), func() error {
				if _, err := s.Sync(ctx); err != nil {
					level.Warn(logger).Log("err", err)
				}
				return nil
			})
		}, func(error) {
			cancel()
		})
	} else {
		level.Info(logger).Log("msg", "no supported bucket was configured, uploads will be disabled")
	}
```

# 本节重点总结:

# rule做了什么

- 根据配置的查询地址 创建查询prometheus数据的clients，给后面的报警和预聚合使用
- 新建本地tsdb，为了写入用户配置的预聚合指标结果
- 根据配置的alertmanager 信息进行初始化操作并启动发送任务
- 使用查询数据的clients初始化ruleManager，并调用prometheus 的ruleManager Run执行任务
- 如果用户配置了对象存储，就开启shipper将预聚合的指标定期传上去

