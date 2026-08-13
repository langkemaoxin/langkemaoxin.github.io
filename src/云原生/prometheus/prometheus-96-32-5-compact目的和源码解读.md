---
title: "32.5 compact目的和源码解读"
sidebarGroup: "Prometheus"
shortTitle: "96 32.5 compact目的和源码解读"
order: 96
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 每一分钟重载reloadBlocks解读 - deleteBlocks删除过期的block - 第一层判断 ：如果block中meta.Compaction.Deletable为..."
---

> **Prometheus · 第 96 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 每一分钟重载reloadBlocks解读
- deleteBlocks删除过期的block
  - 第一层判断 ：如果block中meta.Compaction.Deletable为true就标记为删除
  - 第二层判断 ： 这个block的存储时间已经过期了
  - 第三层判断 ： 这个block的size超过了限制
- 压实底层调用的 LeveledCompactor.Compact方法
  - 合并meta
  - 合并block

# compact压实源码解读

## db.run 入口方法

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\db.go

```go
func (db *DB) run() {
	defer close(db.donec)

	backoff := time.Duration(0)

	for {
		select {
		case <-db.stopc:
			return
		case <-time.After(backoff):
		}

		select {
		case <-time.After(1 * time.Minute):
			db.cmtx.Lock()
			if err := db.reloadBlocks(); err != nil {
				level.Error(db.logger).Log("msg", "reloadBlocks", "err", err)
			}
			db.cmtx.Unlock()

			select {
			case db.compactc <- struct{}{}:
			default:
			}
		case <-db.compactc:
			db.metrics.compactionsTriggered.Inc()

			db.autoCompactMtx.Lock()
			if db.autoCompact {
				if err := db.Compact(); err != nil {
					level.Error(db.logger).Log("msg", "compaction failed", "err", err)
					backoff = exponential(backoff, 1*time.Second, 1*time.Minute)
				} else {
					backoff = 0
				}
			} else {
				db.metrics.compactionsSkipped.Inc()
			}
			db.autoCompactMtx.Unlock()
		case <-db.stopc:
			return
		}
	}
}
```

### 解读一下

- 每隔1分钟调用下 db.reloadBlocks()，然后通过db.compactc 发送compact命令
- 收到compact命令会调用 db.Compact触发压实
- 并将prometheus_tsdb_compactions_triggered_total这个counter +1![compact01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630722250000/0b45a39037a1439a958941cde7c287f2.png)

## 每一分钟重载reloadBlocks解读

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\db.go

```go
func (db *DB) reloadBlocks() (err error) {}
```

- 调用openblock重载下block

```go
loadable, corrupted, err := openBlocks(db.logger, db.dir, db.blocks, db.chunkPool)
```

### 调用 blocksToDelete判断要删除的blocks

```go
deletableULIDs := db.blocksToDelete(loadable)
```

- 对应的删除判断方法为  deletableBlocks

```go
func deletableBlocks(db *DB, blocks []*Block) map[ulid.ULID]struct{} {
	deletable := make(map[ulid.ULID]struct{})

	// Sort the blocks by time - newest to oldest (largest to smallest timestamp).
	// This ensures that the retentions will remove the oldest  blocks.
	sort.Slice(blocks, func(i, j int) bool {
		return blocks[i].Meta().MaxTime > blocks[j].Meta().MaxTime
	})

	for _, block := range blocks {
		if block.Meta().Compaction.Deletable {
			deletable[block.Meta().ULID] = struct{}{}
		}
	}

	for ulid := range BeyondTimeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}

	for ulid := range BeyondSizeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}

	return deletable
}
```

#### 第一层判断 ：如果block中meta.Compaction.Deletable为true就标记为删除

```go
	for _, block := range blocks {
		if block.Meta().Compaction.Deletable {
			deletable[block.Meta().ULID] = struct{}{}
		}
	}
```

- 也就是meta中 的numSamples为0 就会meta.Compaction.Deletable为true

```json
{
        "ulid": "01FD67HX4YP07NVVJ5KK47PJG8",
        "minTime": 1629064800170,
        "maxTime": 1629072000000,
        "stats": {
                "numSamples": 852948,
                "numSeries": 1781,
                "numChunks": 7108
        },
        "compaction": {
                "level": 1,
                "sources": [
                        "01FD67HX4YP07NVVJ5KK47PJG8"
                ]
        },
        "version": 1
}
```

#### 第二层判断 ： 这个block的存储时间已经过期了

```go
	for ulid := range BeyondTimeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}
```

- 底层调用的BeyondTimeRetention逻辑

```go
	for i, block := range blocks {
		// The difference between the first block and this block is larger than
		// the retention period so any blocks after that are added as deletable.
		if i > 0 && blocks[0].Meta().MaxTime-block.Meta().MaxTime > db.opts.RetentionDuration {
			for _, b := range blocks[i:] {
				deletable[b.meta.ULID] = struct{}{}
			}
			db.metrics.timeRetentionCount.Inc()
			break
		}
	}
```

#### 第三层判断 ： 这个block的size超过了限制

```go
	for ulid := range BeyondSizeRetention(db, blocks) {
		deletable[ulid] = struct{}{}
	}

```

- 底层调用的BeyondSizeRetention

```go
	for i, block := range blocks {
		blocksSize += block.Size()
		if blocksSize > int64(db.opts.MaxBytes) {
			// Add this and all following blocks for deletion.
			for _, b := range blocks[i:] {
				deletable[b.meta.ULID] = struct{}{}
			}
			db.metrics.sizeRetentionCount.Inc()
			break
		}
	}
```

### 最终调用 deleteBlocks删除过期的block

```go
func (db *DB) deleteBlocks(blocks map[ulid.ULID]*Block) error {
	for ulid, block := range blocks {
		if block != nil {
			if err := block.Close(); err != nil {
				level.Warn(db.logger).Log("msg", "Closing block failed", "err", err, "block", ulid)
			}
		}

		toDelete := filepath.Join(db.dir, ulid.String())
		if _, err := os.Stat(toDelete); os.IsNotExist(err) {
			// Noop.
			continue
		} else if err != nil {
			return errors.Wrapf(err, "stat dir %v", toDelete)
		}

		// Replace atomically to avoid partial block when process would crash during deletion.
		tmpToDelete := filepath.Join(db.dir, fmt.Sprintf("%s%s", ulid, tmpForDeletionBlockDirSuffix))
		if err := fileutil.Replace(toDelete, tmpToDelete); err != nil {
			return errors.Wrapf(err, "replace of obsolete block for deletion %s", ulid)
		}
		if err := os.RemoveAll(tmpToDelete); err != nil {
			return errors.Wrapf(err, "delete obsolete block %s", ulid)
		}
		level.Info(db.logger).Log("msg", "Deleting obsolete block", "block", ulid)
	}

	return nil
}
```

## 压实最终调用的 compactBlocks

```go
func (db *DB) compactBlocks() (err error) {
	// Check for compactions of multiple blocks.
	for {
		plan, err := db.compactor.Plan(db.dir)
		if err != nil {
			return errors.Wrap(err, "plan compaction")
		}
		if len(plan) == 0 {
			break
		}

		select {
		case <-db.stopc:
			return nil
		default:
		}

		uid, err := db.compactor.Compact(db.dir, plan, db.blocks)
		if err != nil {
			return errors.Wrapf(err, "compact %s", plan)
		}

		if err := db.reloadBlocks(); err != nil {
			if err := os.RemoveAll(filepath.Join(db.dir, uid.String())); err != nil {
				return errors.Wrapf(err, "delete compacted block after failed db reloadBlocks:%s", uid)
			}
			return errors.Wrap(err, "reloadBlocks blocks")
		}
	}

	return nil
}
```

### 底层调用的 LeveledCompactor.Compact方法

- 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\compact.go

```go
func (c *LeveledCompactor) Compact(dest string, dirs []string, open []*Block) (uid ulid.ULID, err error) {
	var (
		blocks []BlockReader
		bs     []*Block
		metas  []*BlockMeta
		uids   []string
	)
	start := time.Now()

	for _, d := range dirs {
		meta, _, err := readMetaFile(d)
		if err != nil {
			return uid, err
		}

		var b *Block

		// Use already open blocks if we can, to avoid
		// having the index data in memory twice.
		for _, o := range open {
			if meta.ULID == o.Meta().ULID {
				b = o
				break
			}
		}

		if b == nil {
			var err error
			b, err = OpenBlock(c.logger, d, c.chunkPool)
			if err != nil {
				return uid, err
			}
			defer b.Close()
		}

		metas = append(metas, meta)
		blocks = append(blocks, b)
		bs = append(bs, b)
		uids = append(uids, meta.ULID.String())
	}

	uid = ulid.MustNew(ulid.Now(), rand.Reader)

	meta := CompactBlockMetas(uid, metas...)
	err = c.write(dest, meta, blocks...)
	if err == nil {
		if meta.Stats.NumSamples == 0 {
			for _, b := range bs {
				b.meta.Compaction.Deletable = true
				n, err := writeMetaFile(c.logger, b.dir, &b.meta)
				if err != nil {
					level.Error(c.logger).Log(
						"msg", "Failed to write 'Deletable' to meta file after compaction",
						"ulid", b.meta.ULID,
					)
				}
				b.numBytesMeta = n
			}
			uid = ulid.ULID{}
			level.Info(c.logger).Log(
				"msg", "compact blocks resulted in empty block",
				"count", len(blocks),
				"sources", fmt.Sprintf("%v", uids),
				"duration", time.Since(start),
			)
		} else {
			level.Info(c.logger).Log(
				"msg", "compact blocks",
				"count", len(blocks),
				"mint", meta.MinTime,
				"maxt", meta.MaxTime,
				"ulid", meta.ULID,
				"sources", fmt.Sprintf("%v", uids),
				"duration", time.Since(start),
			)
		}
		return uid, nil
	}

	errs := tsdb_errors.NewMulti(err)
	if err != context.Canceled {
		for _, b := range bs {
			if err := b.setCompactionFailed(); err != nil {
				errs.Add(errors.Wrapf(err, "setting compaction failed for block: %s", b.Dir()))
			}
		}
	}

	return uid, errs.Err()
}
```

#### 合并meta

```go
meta := CompactBlockMetas(uid, metas...)
```

#### 合并blocks 底层调用的 LeveledCompactor.populateBlock

- 获取block的索引对象 indexrindexr

```go
indexr, err := b.Index()
```

- 遍历索引对象的symbol合并所有的标签keys

```go
    for i, b := range blocks {
		syms := indexr.Symbols()
		if i == 0 {
			symbols = syms
			continue
		}
		symbols = NewMergedStringIter(symbols, syms)
    }
	for symbols.Next() {
		if err := indexw.AddSymbol(symbols.At()); err != nil {
			return errors.Wrap(err, "add symbol")
		}
	}
```

- 构造 ChunkSeriesSet对象

```go
for i, b := range blocks {
    sets = append(sets, newBlockChunkSeriesSet(indexr, chunkr, tombsr, all, meta.MinTime, meta.MaxTime-1))
}
```

- 遍历ChunkSeriesSet对象进行merge
- 将数据追加到传入的chunkw和indexw对象上

```go
	for set.Next() {
		select {
		case <-c.ctx.Done():
			return c.ctx.Err()
		default:
		}
		s := set.At()
		chksIter := s.Iterator()
		chks = chks[:0]
		for chksIter.Next() {
			// We are not iterating in streaming way over chunk as it's more efficient to do bulk write for index and
			// chunk file purposes.
			chks = append(chks, chksIter.At())
		}
		...
		if err := chunkw.WriteChunks(chks...); err != nil {
			return errors.Wrap(err, "write chunks")
		}
		if err := indexw.AddSeries(ref, s.Labels(), chks...); err != nil 
}
```

# 本节重点总结 :

- 每一分钟重载reloadBlocks解读
- deleteBlocks删除过期的block
  - 第一层判断 ：如果block中meta.Compaction.Deletable为true就标记为删除
  - 第二层判断 ： 这个block的存储时间已经过期了
  - 第三层判断 ： 这个block的size超过了限制
- 压实底层调用的 LeveledCompactor.Compact方法
  - 合并meta
  - 合并block

