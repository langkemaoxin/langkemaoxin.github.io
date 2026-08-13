---
title: 35.4 thanos-query 源码阅读
sidebarGroup: Prometheus
shortTitle: 111 35.4 thanos-query 源码阅读
order: 111
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 根据配置的后端存储grpc地址初始化 proxyStore - 用proxyStore初始化api - api完全实现了prometheus的v1查询接口 - 根据http查询，...'
---

> **Prometheus · 第 111 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

