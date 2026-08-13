---
title: 33.4 为什么remote_read查询series比直接查询要慢很多和源码解读
sidebarGroup: Prometheus
shortTitle: 100 33.4 为什么remote_read查询s...
order: 100
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 为什么remote_read查询series比直接查询要慢很多 - remote_read源码解析 为什么remote_read 比 直接查询要慢很多 现象描述 - 查询脚本 -...'
---

> **Prometheus · 第 100 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 为什么remote_read查询series比直接查询要慢很多
- remote_read源码解析

# 为什么remote_read 比 直接查询要慢很多

## 现象描述

- 查询脚本
- ```python
  import json
  import time
  import requests
  import logging
  import curlify

  logging.basicConfig(
      format='%(asctime)s %(levelname)s %(filename)s [func:%(funcName)s] [line:%(lineno)d]:%(message)s',
      datefmt="%Y-%m-%d %H:%M:%S",
      level="INFO"
  )

  def label_values(host):
      uri = 'http://{}/api/v1/series'.format(host)
      end = int(time.time())
      start = end - 60 * 60 * 24 *20
      expr = '''{__name__=~".*a.*|.*e.*"}'''
      G_PARMS = {
          "match[]": expr,
          "start": start,
          "end": end,
      }
      res = requests.get(uri, G_PARMS, timeout=5)
      print(curlify.to_curl(res.request))
      tag_values = set()
      if res.status_code != 200:
          msg = "[error_code_not_200]"
          logging.error(msg)
          return
      jd = res.json()
      if not jd:
          msg = "[error_loads_json]"
          logging.error(msg)
          return
      # for i in jd.get("data"):
      #     tag_values.add(i.get(tag_key))
      # msg = "\n[prometheus_host:{}]\n[expr:{}]\n[target_tag:{}]\n[num:{}][tag_values:{}]".format(
      #     host,
      #     expr,
      #     tag_key,
      #     len(tag_values),
      #     tag_values)
      # logging.info(msg)
      return tag_values

  if __name__ == '__main__':
      start = time.perf_counter()
      # label_values("192.168.3.200:9090")
      label_values("192.168.3.200:8090")
      end = time.perf_counter()
      haoshi = end - start
      msg = "耗时:{}".format(haoshi)
      logging.info(haoshi)

  ```

> 现象描述-series 接口对比

- 直接查询

```shell
curl -X GET -H 'Accept: */*' -H 'Accept-Encoding: gzip, deflate' -H 'Connection: keep-alive' -H 'User-Agent: python-requests/2.25.1' 'http://172.20.70.215:9090/api/v1/series?match%5B%5D=+%7B__name__%3D~%22.%2Aa.%2A%7C.%2Ae.%2A%22%7D+&start=1628563540&end=1628563840'
2021-08-10 10:50:48 INFO 001_series_query.py [func:label_values] [line:34]:请求  {__name__=~".*a.*|.*e.*"}  耗时:7.760190099999999
```

- 通过prometheus remote_read查series结果

```shell
curl -X GET -H 'Accept: */*' -H 'Accept-Encoding: gzip, deflate' -H 'Connection: keep-alive' -H 'User-Agent: python-requests/2.25.1' 'http://172.20.70.215:8090/api/v1/series?match%5B%5D=+%7B__name__%3D~%22.%2Aa.%2A%7C.%2Ae.%2A%22%7D+&start=1628564145&end=1628564445'
2021-08-10 11:01:09 INFO 001_series_query.py [func:label_values] [line:34]:请求  {__name__=~".*a.*|.*e.*"}  耗时:23.1208281
```

- 可以看出相同数据量的前提下 remote_read要慢 3倍

> 现象描述-query_range  接口对比

- 直接查询

```shell
curl -X GET -H 'Accept: */*' -H 'Accept-Encoding: gzip, deflate' -H 'Connection: keep-alive' -H 'User-Agent: python-requests/2.25.1' 'http://172.20.70.215:9090/api/v1/query_range?query=+avg%28rate%28node_cpu_seconds_total%5B2m%5D%29%29+by+%28instance%29+%2A100+&start=1628585656&end=1628589256&step=30'

2021-08-10 17:54:19 INFO 001_range_query.py [func:ins_query] [line:48]:请求  avg(rate(node_cpu_seconds_total[2m])) by (instance) *100  耗时:3.0241588999999998

```

- 通过remote_read查询

```shell
curl -X GET -H 'Accept: */*' -H 'Accept-Encoding: gzip, deflate' -H 'Connection: keep-alive' -H 'User-Agent: python-requests/2.25.1' 'http://172.20.70.215:8090/api/v1/query_range?query=+avg%28rate%28node_cpu_seconds_total%5B2m%5D%29%29+by+%28instance%29+%2A100+&start=1628585590&end=1628589190&step=30'
2021-08-10 17:53:16 INFO 001_range_query.py [func:ins_query] [line:48]:请求  avg(rate(node_cpu_seconds_total[2m])) by (instance) *100  耗时:6.7678848
```

- 结论：依旧是remote_read慢 一倍

## 思考

- 是否remote_read中做了额外的操作导致的？

# 源码追查

## main中启动的 fanoutStorage

- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\cmd\prometheus\main.go

```go
		remoteStorage = remote.NewStorage(log.With(logger, "component", "remote"), prometheus.DefaultRegisterer, localStorage.StartTime, cfg.localStoragePath, time.Duration(cfg.RemoteFlushDeadline), scraper)
		fanoutStorage = storage.NewFanout(logger, localStorage, remoteStorage)
```

## fanoutStorage的new 方法

- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\fanout.go
- 代码注释中写的很明白，如果primary存在，并且查询出错就不去 secondaries中查询了
- 如果 secondaries 中有的出错，那么只打个warning

```go
// NewFanout returns a new fanout Storage, which proxies reads and writes
// through to multiple underlying storages.
//
// The difference between primary and secondary Storage is only for read (Querier) path and it goes as follows:
// * If the primary querier returns an error, then any of the Querier operations will fail.
// * If any secondary querier returns an error the result from that queries is discarded. The overall operation will succeed,
// and the error from the secondary querier will be returned as a warning.
//
// NOTE: In the case of Prometheus, it treats all remote storages as secondary / best effort.
func NewFanout(logger log.Logger, primary Storage, secondaries ...Storage) Storage {
	return &fanout{
		logger:      logger,
		primary:     primary,
		secondaries: secondaries,
	}
}
```

- 在main中 fanoutStorage会被作为 web的storage

```go
cfg.web.Storage = fanoutStorage
```

## fanoutStorage 的 Querier方法

- Querier方法是调用具体查询接口前获取 查询对象的方法
- fanoutStorage的 Querier方法
- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\fanout.go

```go
func (f *fanout) Querier(ctx context.Context, mint, maxt int64) (Querier, error) {
	primary, err := f.primary.Querier(ctx, mint, maxt)
	if err != nil {
		return nil, err
	}

	secondaries := make([]Querier, 0, len(f.secondaries))
	for _, storage := range f.secondaries {
		querier, err := storage.Querier(ctx, mint, maxt)
		if err != nil {
			// Close already open Queriers, append potential errors to returned error.
			errs := tsdb_errors.NewMulti(err, primary.Close())
			for _, q := range secondaries {
				errs.Add(q.Close())
			}
			return nil, errs.Err()
		}
		secondaries = append(secondaries, querier)
	}
	return NewMergeQuerier([]Querier{primary}, secondaries, ChainedSeriesMerge), nil
}
```

- 会转化为NewMergeQuerier

## merge 的 NewMergeQuerier方法

- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\merge.go

```go
func NewMergeQuerier(primaries []Querier, secondaries []Querier, mergeFn VerticalSeriesMergeFunc) Querier {
	queriers := make([]genericQuerier, 0, len(primaries)+len(secondaries))
	for _, q := range primaries {
		if _, ok := q.(noopQuerier); !ok && q != nil {
			queriers = append(queriers, newGenericQuerierFrom(q))
		}
	}
	for _, q := range secondaries {
		if _, ok := q.(noopQuerier); !ok && q != nil {
			queriers = append(queriers, newSecondaryQuerierFrom(q))
		}
	}

	concurrentSelect := false
	if len(secondaries) > 0 {
		concurrentSelect = true
	}
	return &querierAdapter{&mergeGenericQuerier{
		mergeFn:          (&seriesMergerAdapter{VerticalSeriesMergeFunc: mergeFn}).Merge,
		queriers:         queriers,
		concurrentSelect: concurrentSelect,
	}}
}
```

- NewMergeQuerier 会被转化为 querierAdapter
- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\merge.go

## mergeGenericQuerier的select 方法是真正的series 查询动作，核心

- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\merge.go

```go
// Select returns a set of series that matches the given label matchers.
func (q *mergeGenericQuerier) Select(sortSeries bool, hints *SelectHints, matchers ...*labels.Matcher) genericSeriesSet {
	if len(q.queriers) == 0 {
		return noopGenericSeriesSet{}
	}
	if len(q.queriers) == 1 {
		return q.queriers[0].Select(sortSeries, hints, matchers...)
	}

	var seriesSets = make([]genericSeriesSet, 0, len(q.queriers))
	if !q.concurrentSelect {
		for _, querier := range q.queriers {
			// We need to sort for merge  to work.
			seriesSets = append(seriesSets, querier.Select(true, hints, matchers...))
		}
		return &lazyGenericSeriesSet{init: func() (genericSeriesSet, bool) {
			s := newGenericMergeSeriesSet(seriesSets, q.mergeFn)
			return s, s.Next()
		}}
	}

	var (
		wg            sync.WaitGroup
		seriesSetChan = make(chan genericSeriesSet)
	)
	// Schedule all Selects for all queriers we know about.
	for _, querier := range q.queriers {
		wg.Add(1)
		go func(qr genericQuerier) {
			defer wg.Done()

			// We need to sort for NewMergeSeriesSet to work.
			seriesSetChan <- qr.Select(true, hints, matchers...)
		}(querier)
	}
	go func() {
		wg.Wait()
		close(seriesSetChan)
	}()

	for r := range seriesSetChan {
		seriesSets = append(seriesSets, r)
	}
	return &lazyGenericSeriesSet{init: func() (genericSeriesSet, bool) {
		s := newGenericMergeSeriesSet(seriesSets, q.mergeFn)
		return s, s.Next()
	}}
}

```

- 如果我们没有配置remote_read ，那么就会走这里，也就是只查询 primary

```go
	if len(q.queriers) == 1 {
		return q.queriers[0].Select(sortSeries, hints, matchers...)
	}
```

- 那么对应查询的就是block
- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210220213500-8c8de46003d1\tsdb\querier.go

```go
func (q *blockQuerier) Select(sortSeries bool, hints *storage.SelectHints, ms ...*labels.Matcher) storage.SeriesSet {
	mint := q.mint
	maxt := q.maxt
	p, err := PostingsForMatchers(q.index, ms...)
	if err != nil {
		return storage.ErrSeriesSet(err)
	}
	if sortSeries {
		p = q.index.SortedPostings(p)
	}

	if hints != nil {
		mint = hints.Start
		maxt = hints.End
		if hints.Func == "series" {
			// When you're only looking up metadata (for example series API), you don't need to load any chunks.
			return newBlockSeriesSet(q.index, newNopChunkReader(), q.tombstones, p, mint, maxt)
		}
	}

	return newBlockSeriesSet(q.index, q.chunks, q.tombstones, p, mint, maxt)
}
```

## 那么如果配置了remote_read的接口会怎么样

- 会走 mergeGenericQuerier.Select底部代码

```go
	return &lazyGenericSeriesSet{init: func() (genericSeriesSet, bool) {
		s := newGenericMergeSeriesSet(seriesSets, q.mergeFn)
		return s, s.Next()
	}}
```

- 也就是 newGenericMergeSeriesSet这个方法
- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\merge.go

```go

// newGenericMergeSeriesSet returns a new genericSeriesSet that merges (and deduplicates)
// series returned by the series sets when iterating.
// Each series set must return its series in labels order, otherwise
// merged series set will be incorrect.
// Overlapped situations are merged using provided mergeFunc.
func newGenericMergeSeriesSet(sets []genericSeriesSet, mergeFunc genericSeriesMergeFunc) genericSeriesSet {
	if len(sets) == 1 {
		return sets[0]
	}

	// We are pre-advancing sets, so we can introspect the label of the
	// series under the cursor.
	var h genericSeriesSetHeap
	for _, set := range sets {
		if set == nil {
			continue
		}
		if set.Next() {
			heap.Push(&h, set)
		}
		if err := set.Err(); err != nil {
			return errorOnlySeriesSet{err}
		}
	}
	return &genericMergeSeriesSet{
		mergeFunc: mergeFunc,
		sets:      sets,
		heap:      h,
	}
}
```

- 看代码中有遍历往 heap中push的动作，应该是为了去重deduplicates
- 看上面的注释说，主要为了merges (and deduplicates)

## 用到的merge func是这个

- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\storage\merge.go

```go
// ChainedSeriesMerge returns single series from many same, potentially overlapping series by chaining samples together.
// If one or more samples overlap, one sample from random overlapped ones is kept and all others with the same
// timestamp are dropped.
//
// This works the best with replicated series, where data from two series are exactly the same. This does not work well
// with "almost" the same data, e.g. from 2 Prometheus HA replicas. This is fine, since from the Prometheus perspective
// this never happens.
//
// It's optimized for non-overlap cases as well.
func ChainedSeriesMerge(series ...Series) Series {
	if len(series) == 0 {
		return nil
	}
	return &SeriesEntry{
		Lset: series[0].Labels(),
		SampleIteratorFn: func() chunkenc.Iterator {
			iterators := make([]chunkenc.Iterator, 0, len(series))
			for _, s := range series {
				iterators = append(iterators, s.Iterator())
			}
			return newChainSampleIterator(iterators)
		},
	}
}
```

- 看起来还要再遍历一次

# remote_read不应该查询过多数据

- 在官方文档上进行了[说明](https://prometheus.io/blog/2019/10/10/remote-read-meets-streaming/#problem-statement)
- 查询 10,000 系列并不是一个好主意，即使对于 Prometheus 原生 HTTPquery_range端点也是如此
- 因为您的浏览器根本不会高兴地获取、存储和呈现数百兆字节的数据
- 此外，出于仪表板和渲染目的，拥有那么多数据是不切实际的，因为人类不可能读取它。这就是为什么我们通常会制作不超过 20 个系列的查询。
- 这很好，但一种非常常见的技术是以查询返回聚合20 个系列的方式组合查询，

# 本节重点总结 :

- 现象 remote_read查询series比直接查询要慢很多
- remote_read源码解析
  - remote_read代码中有遍历往 heap中push的动作，是为了去重deduplicates
  - 内层调用又会遍历Sample导致速度比较慢
- 无论是何种查询，都应该避免过多series，应该多使用聚合

