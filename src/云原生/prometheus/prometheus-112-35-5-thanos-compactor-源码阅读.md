---
title: 35.5 thanos-compactor 源码阅读
sidebarGroup: Prometheus
shortTitle: 112 35.5 thanos-compactor ...
order: 112
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : compact做什么 - 定时扫描对象存储的block，干2件事 - 压实 - 通过plan拿到所有要压实的block - 通过对象存储下载block - 底层调用prometheu...'
---

> **Prometheus · 第 112 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

