---
title: 35.2 thanos-sidecar源码阅读
sidebarGroup: Prometheus
shortTitle: 109 35.2 thanos-sidecar源码阅...
order: 109
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - sidercar 都干了什么 - 执行prometheus的探活 - 继承所有prometheus v1的查询方法，封装成http-client - 用上面的http-clien...'
---

> **Prometheus · 第 109 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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
        - 没有 Matchers就用 /api/v1/label/<label_name>/values
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

