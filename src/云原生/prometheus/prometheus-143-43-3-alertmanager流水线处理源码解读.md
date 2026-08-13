---
title: 43.3 alertmanager流水线处理源码解读
sidebarGroup: Prometheus
shortTitle: 143 43.3 alertmanager流水线处理...
order: 143
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - alertmanager代码解析 - gossip集群通信 - pipline流水线处理 alertmanager代码解析 开启gossip集群通信 - 底层库使用 [https...'
---

> **Prometheus · 第 143 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- alertmanager代码解析
- gossip集群通信
- pipline流水线处理

# alertmanager代码解析

# 开启gossip集群通信
- 底层库使用 [https://github.com/hashicorp/memberlist](https://github.com/hashicorp/memberlist)
- main.go中，如果配置了  --cluster.peer就开始peer
```go
	if *clusterBindAddr != "" {
		peer, err = cluster.Create(
			log.With(logger, "component", "cluster"),
			prometheus.DefaultRegisterer,
			*clusterBindAddr,
			*clusterAdvertiseAddr,
			*peers,
			true,
			*pushPullInterval,
			*gossipInterval,
			*tcpTimeout,
			*probeTimeout,
			*probeInterval,
		)
		if err != nil {
			level.Error(logger).Log("msg", "unable to initialize gossip mesh", "err", err)
			return 1
		}
		clusterEnabled.Set(1)
	}

```

# 创建notificationLog管理器
- 如果开启了peer就给 notificationLog设置 广播，后续发送之后就要通知其他节点 
```go
	notificationLogOpts := []nflog.Option{
		nflog.WithRetention(*retention),
		nflog.WithSnapshot(filepath.Join(*dataDir, "nflog")),
		nflog.WithMaintenance(15*time.Minute, stopc, wg.Done),
		nflog.WithMetrics(prometheus.DefaultRegisterer),
		nflog.WithLogger(log.With(logger, "component", "nflog")),
	}

	notificationLog, err := nflog.New(notificationLogOpts...)
	if err != nil {
		level.Error(logger).Log("err", err)
		return 1
	}
	if peer != nil {
		c := peer.AddState("nfl", notificationLog, prometheus.DefaultRegisterer)
		notificationLog.SetBroadcast(c.Broadcast)
	}

```

# 创建 管理器
- 如果配置了peer，就设置它的广播
```go
	silenceOpts := silence.Options{
		SnapshotFile: filepath.Join(*dataDir, "silences"),
		Retention:    *retention,
		Logger:       log.With(logger, "component", "silences"),
		Metrics:      prometheus.DefaultRegisterer,
	}

	silences, err := silence.New(silenceOpts)
	if err != nil {
		level.Error(logger).Log("err", err)
		return 1
	}
	if peer != nil {
		c := peer.AddState("sil", silences, prometheus.DefaultRegisterer)
		silences.SetBroadcast(c.Broadcast)
	}
```

# 开启静默的刷盘操作
```go
	wg.Add(1)
	go func() {
		silences.Maintenance(15*time.Minute, filepath.Join(*dataDir, "silences"), stopc)
		wg.Done()
	}()

	defer func() {
		close(stopc)
		wg.Wait()
	}()
```

## 静默维护函数
- 每个15分钟gcMerge一下，然后刷盘
```go
func (s *Silences) Maintenance(interval time.Duration, snapf string, stopc <-chan struct{}) {
	t := time.NewTicker(interval)
	defer t.Stop()

	f := func() error {
		start := s.now()
		var size int64

		level.Debug(s.logger).Log("msg", "Running maintenance")
		defer func() {
			level.Debug(s.logger).Log("msg", "Maintenance done", "duration", s.now().Sub(start), "size", size)
			s.metrics.snapshotSize.Set(float64(size))
		}()

		if _, err := s.GC(); err != nil {
			return err
		}
		if snapf == "" {
			return nil
		}
		f, err := openReplace(snapf)
		if err != nil {
			return err
		}
		if size, err = s.Snapshot(f); err != nil {
			return err
		}
		return f.Close()
	}
```

### gc 合并的操作
- 代码位置 D:\go_path\pkg\mod\github.com\prometheus\alertmanager@v0.22.2\silence\silence.go
- 意识是配置的静默已经过期了就删掉
```go
// GC runs a garbage collection that removes silences that have ended longer
// than the configured retention time ago.
func (s *Silences) GC() (int, error) {
	start := time.Now()
	defer func() { s.metrics.gcDuration.Observe(time.Since(start).Seconds()) }()

	now := s.now()
	var n int

	s.mtx.Lock()
	defer s.mtx.Unlock()

	for id, sil := range s.st {
		if sil.ExpiresAt.IsZero() {
			return n, errors.New("unexpected zero expiration timestamp")
		}
		if !sil.ExpiresAt.After(now) {
			delete(s.st, id)
			delete(s.mc, sil.Silence)
			n++
		}
	}

	return n, nil
}
```

# peer join cluster
- 调用 gossip join 
```go
	// Peer state listeners have been registered, now we can join and get the initial state.
	if peer != nil {
		err = peer.Join(
			*reconnectInterval,
			*peerReconnectTimeout,
		)
		if err != nil {
			level.Warn(logger).Log("msg", "unable to join gossip mesh", "err", err)
		}
		ctx, cancel := context.WithTimeout(context.Background(), *settleTimeout)
		defer func() {
			cancel()
			if err := peer.Leave(10 * time.Second); err != nil {
				level.Warn(logger).Log("msg", "unable to leave gossip mesh", "err", err)
			}
		}()
		go peer.Settle(ctx, *gossipInterval*10)
	}

```

# 创建api对象
```go
	api, err := api.New(api.Options{
		Alerts:      alerts,
		Silences:    silences,
		StatusFunc:  marker.Status,
		Peer:        clusterPeer,
		Timeout:     *httpTimeout,
		Concurrency: *getConcurrency,
		Logger:      log.With(logger, "component", "api"),
		Registry:    prometheus.DefaultRegisterer,
		GroupFunc:   groupFn,
	})
```

# 创建pipline
## 根据配置创建receivers对象
```go
		// Build the map of receiver to integrations.
		receivers := make(map[string][]notify.Integration, len(activeReceivers))
		var integrationsNum int
		for _, rcv := range conf.Receivers {
			if _, found := activeReceivers[rcv.Name]; !found {
				// No need to build a receiver if no route is using it.
				level.Info(configLogger).Log("msg", "skipping creation of receiver not referenced by any route", "receiver", rcv.Name)
				continue
			}
			integrations, err := buildReceiverIntegrations(rcv, tmpl, logger)
			if err != nil {
				return err
			}
			// rcv.Name is guaranteed to be unique across all receivers.
			receivers[rcv.Name] = integrations
			integrationsNum += len(integrations)
		}
```

## 根据配置创建 抑制器
```go
inhibitor = inhibit.NewInhibitor(alerts, conf.InhibitRules, marker, logger)
func NewInhibitor(ap provider.Alerts, rs []*config.InhibitRule, mk types.Marker, logger log.Logger) *Inhibitor {
	ih := &Inhibitor{
		alerts: ap,
		marker: mk,
		logger: logger,
	}
	for _, cr := range rs {
		r := NewInhibitRule(cr)
		ih.rules = append(ih.rules, r)
	}
	return ih
}
```

## 创建静默的对象
```go
silencer := silence.NewSilencer(silences, marker, logger)
```

## 创建pipeline
```go
		pipeline := pipelineBuilder.New(
			receivers,
			waitFunc,
			inhibitor,
			silencer,
			muteTimes,
			notificationLog,
			pipelinePeer,
		)
```

## 使用这个pipline 创建dispatcher
```go
disp = dispatch.NewDispatcher(alerts, routes, pipeline, marker, timeoutFunc, logger, dispMetrics)
```

# 报警处理流程
## run方法
- D:\go_path\pkg\mod\github.com\prometheus\alertmanager@v0.22.2\dispatch\dispatch.go
- 通过subscribe 拿到alert对象，然后执行processAlert
```go
func (d *Dispatcher) run(it provider.AlertIterator) {
	cleanup := time.NewTicker(30 * time.Second)
	defer cleanup.Stop()

	defer it.Close()

	for {
		select {
		case alert, ok := <-it.Next():
			if !ok {
				// Iterator exhausted for some reason.
				if err := it.Err(); err != nil {
					level.Error(d.logger).Log("msg", "Error on alert update", "err", err)
				}
				return
			}

			level.Debug(d.logger).Log("msg", "Received alert", "alert", alert)

			// Log errors but keep trying.
			if err := it.Err(); err != nil {
				level.Error(d.logger).Log("msg", "Error on alert update", "err", err)
				continue
			}

			now := time.Now()
			for _, r := range d.route.Match(alert.Labels) {
				d.processAlert(alert, r)
			}
			d.metrics.processingDuration.Observe(time.Since(now).Seconds())

		case <-cleanup.C:
			d.mtx.Lock()

			for _, groups := range d.aggrGroups {
				for _, ag := range groups {
					if ag.empty() {
						ag.stop()
						delete(groups, ag.fingerprint())
						d.metrics.aggrGroups.Dec()
					}
				}
			}

			d.mtx.Unlock()

		case <-d.ctx.Done():
			return
		}
	}
}
```

## processAlert方法
- 计算alert的hash值 fp
- 在缓存group中如果没有这个alert就开启一个新的agggroup
- 并且执行agggroup的run
```go
// processAlert determines in which aggregation group the alert falls
// and inserts it.
func (d *Dispatcher) processAlert(alert *types.Alert, route *Route) {
	groupLabels := getGroupLabels(alert, route)

	fp := groupLabels.Fingerprint()

	d.mtx.Lock()
	defer d.mtx.Unlock()

	group, ok := d.aggrGroups[route]
	if !ok {
		group = map[model.Fingerprint]*aggrGroup{}
		d.aggrGroups[route] = group
	}

	// If the group does not exist, create it.
	ag, ok := group[fp]
	if !ok {
		ag = newAggrGroup(d.ctx, groupLabels, route, d.timeout, d.logger)
		group[fp] = ag
		d.metrics.aggrGroups.Inc()

		go ag.run(func(ctx context.Context, alerts ...*types.Alert) bool {
			_, _, err := d.stage.Exec(ctx, d.logger, alerts...)
			if err != nil {
				lvl := level.Error(d.logger)
				if ctx.Err() == context.Canceled {
					// It is expected for the context to be canceled on
					// configuration reload or shutdown. In this case, the
					// message should only be logged at the debug level.
					lvl = level.Debug(d.logger)
				}
				lvl.Log("msg", "Notify for alerts failed", "num_alerts", len(alerts), "err", err)
			}
			return err == nil
		})
	}

	ag.insert(alert)
}
```

## 底层不断执行 stage 的Exec方法
- Dispatcher.stage是前面初始化的pipline流水线
- D:\go_path\pkg\mod\github.com\prometheus\alertmanager@v0.22.2\notify\notify.go
```go
type RoutingStage map[string]Stage

// Exec implements the Stage interface.
func (rs RoutingStage) Exec(ctx context.Context, l log.Logger, alerts ...*types.Alert) (context.Context, []*types.Alert, error) {
	receiver, ok := ReceiverName(ctx)
	if !ok {
		return ctx, nil, errors.New("receiver missing")
	}

	s, ok := rs[receiver]
	if !ok {
		return ctx, nil, errors.New("stage for receiver missing")
	}

	return s.Exec(ctx, l, alerts...)
}

```
- RoutingStage.Exec 方法 根据ctx中的ReceiverName的key 拿到ReceiverName找到对应的receiver 再找到stage链执行

# 本节重点总结 :
- alertmanager代码解析
- gossip集群通信
- pipline流水线处理

