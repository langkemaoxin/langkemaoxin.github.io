---
title: 35.6 thanos-rule 源码阅读
sidebarGroup: Prometheus
shortTitle: 113 35.6 thanos-rule 源码阅读
order: 113
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点总结 : rule做了什么 - 根据配置的查询地址 创建查询prometheus数据的clients，给后面的报警和预聚合使用 - 新建本地tsdb，为了写入用户配置的预聚合指标结果 - 根据...'
---

> **Prometheus · 第 113 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

