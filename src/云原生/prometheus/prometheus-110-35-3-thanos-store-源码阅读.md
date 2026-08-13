---
title: 35.3 thanos-store 源码阅读
sidebarGroup: Prometheus
shortTitle: 110 35.3 thanos-store 源码阅读
order: 110
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 启动时同步对象存储的各个block元信息到本地，并且将索引数据也同步过来 - 启动定时同步的任务 - 封装prometheus查询的grpc服务，对外提供服务，底层调用配置的对象...'
---

> **Prometheus · 第 110 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

