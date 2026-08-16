---
title: Prometheus 第43章：Alertmanager 流水线
sidebarGroup: 可观测性
shortTitle: 55 Alertmanager 流水线
order: 55
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第43章（Alertmanager 流水线）合并笔记
---

> **Prometheus · 第 43 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 43.1 配置alertmanager高可用并测试

# 本节重点介绍 :
- alertmanager 单点问题
- alertmanager 引入gossip协议来同步节点间的信息
- 配置alertmanager 高可用并测试

# 简介

## 项目地址
- https://prometheus.io/docs/alerting/latest/alertmanager/

## alertmanager 架构图
> （配图缺失：image）

## 文档地址
- https://prometheus.io/docs/alerting/latest/alertmanager/
- Alertmanager处理由诸如Prometheus服务器之类的客户端应用程序发送的警报

## 核心功能点

|  英文   | 中文 | 含义  | 
|  ----  | ----  | ---- | 
| deduplicating	| 重复数据删除 |	prometheus产生同一条报警<br>发送给多个alm去重后发送  |  
| grouping	| 分组  |	告警可以分组处理，同一个组里共享等待时长等参数<br>可以做告警聚合 |  
| route	| 路由  |路由匹配树，可以理解为告警订阅 |  
| silencing 	| 静默  | 灵活的告警静默，如按tag | 
| inhibition  	| 抑制  | 如果某些其他警报已经触发，则抑制某些警报的通知 <br>如机器down，上面的进程down告警不触发| 
| HA  	| 高可用性  | gossip实现 | 
 
 

# alertmanager 单点问题
- 部署一个肯定是单点
> （配图缺失：image）
> 尝试部署多个独立的alertmanager
-  prometheus产生的报警并行发往多个alm
> （配图缺失：image） 
- 此方案能保证告警信息不会因为单个alm挂掉儿接收不到
- 但是会造成同一条告警信息发送多次，告警重复

## alertmanager 引入gossip协议来同步节点间的信息
> （配图缺失：image） 
**信息种类如下**
- 新接收到的告警信息
    - 通知发送状态同步：告警通知发送完成后，基于Push-based同步告警发送状态。Wait阶段可以确保集群状态一致
- silence静默信息
- 查看代码可以知道共有两个地方被`SetBroadcast`
    - 即动态接受数据的地方可以gossip，配置如inhibit、route则不可以
- 调用gossip的地方
> （配图缺失：image）
 
# 回味alertmanager 架构图
> （配图缺失：image）

# 高可用部署
- 其余节点启动参数加上对端ip即可
```shell script
ExecStart=/opt/app/alertmanager/alertmanager  --config.file=/opt/app/alertmanager/alertmanager.yml --storage.path=/opt/app/alertmanager/data/ --cluster.peer=192.168.43.114:9094 
```
## 测试gossip方法
- 在一个节点创建静默
- 在其他点页面上能看到静默的记录

## 调api发送告警，测试dedupe
> step1：gossip启动两个alertm，配置保持一致

> step2：调两个alertm地址发送同一条告警
- 细节
    - 可以在第二个节点不启动接收端
    - 所以当日志中没出现 connection refused说明 第二个节点没有发送告警
    - 达到我们用gossip 去掉重复告警的目的
    - 其实是第一个节点发送告警后  gossip通知了第二个节点
- 文档地址 https://prometheus.io/docs/alerting/latest/clients/
```yaml
[
  {
    "labels": {
      "alertname": "<requiredAlertName>",
      "<labelname>": "<labelvalue>",
      ...
    },
    "annotations": {
      "<labelname>": "<labelvalue>",
    },
    "startsAt": "<rfc3339>",
    "endsAt": "<rfc3339>",
    "generatorURL": "<generator_url>"
  },
  ...
]
```

> step3: 查看接收端收到几条

# 本节重点总结 :
- alertmanager 单点问题
- alertmanager 引入gossip协议来同步节点间的信息
- 配置alertmanager 高可用并测试

## 43.2 gossip协议解读

# 本节重点介绍 :

- gossip流言算法
- 信息同步过程演示
- Gossip 的特点（优势）
- Gossip 的特点（的缺陷）

# gossip流言算法

> 作用

- 这个协议的作用就像其名字表示的意思一样，非常容易理
- 它的方式其实在我们日常生活中也很常见，比如电脑病毒的传播，森林大火，细胞扩散等等。
- 主要用在分布式数据库系统中各个副本节点同步数据之用

# 信息同步过程演示

> 前提设定

- Gossip 是周期性的散播消息，把周期限定为 1 秒
- 被感染节点随机选择 k 个邻接节点（fan-out）散播消息，这里把 fan-out 设置为 3，每次最多往 3 个节点散播。
- 每次散播消息都选择尚未发送过的节点进行散播
- 收到消息的节点不再往发送节点散播，比如 A -> B，那么 B 进行散播的时候，不再发给 A。
- Gossip 过程是异步的，也就是说发消息的节点不会关注对方是否收到，即不等待响应；不管对方有没有收到，它都会每隔 1 秒向周围节点发消息。异步是它的优点，而消息冗余则是它的缺点。

![gossip.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755939000/2d04a870caec4be1ac25f8e45433ea92.png)

![gossip02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755939000/5945343b9d824985b17c86512f349718.png)

# Gossip 的特点（优势）

1. 扩展性
   - 网络可以允许节点的任意增加和减少，新增加的节点的状态最终会与其他节点一致。
2. 容错
   - 网络中任何节点的宕机和重启都不会影响 Gossip 消息的传播，Gossip 协议具有天然的分布式系统容错特性。
3. 去中心化
   - Gossip 协议不要求任何中心节点，所有节点都可以是对等的，任何一个节点无需知道整个网络状况，只要网络是连通的，任意一个节点就可以把消息散播到全网。
4. 一致性收敛
   - Gossip 协议中的消息会以一传十、十传百一样的指数级速度在网络中快速传播，因此系统状态的不一致可以在很快的时间内收敛到一致。消息传播速度达到了 logN。
5. 简单
   - Gossip 协议的过程极其简单，实现起来几乎没有太多复杂性。

# Gossip 的缺陷

- 分布式网络中，没有一种完美的解决方案，Gossip 协议跟其他协议一样，也有一些不可避免的缺陷，主要是两个：

1. 消息的延迟

   - 由于 Gossip 协议中，节点只会随机向少数几个节点发送消息，消息最终是通过多个轮次的散播而到达全网的，
   - 因此使用 Gossip 协议会造成不可避免的消息延迟。不适合用在对实时性要求较高的场景下。
2. 消息冗余

   - Gossip 协议规定，节点会定期随机选择周围节点发送消息
   - 而收到消息的节点也会重复该步骤，因此就不可避免的存在消息重复发送给同一节点的情况
   - 造成了消息的冗余，同时也增加了收到消息的节点的处理压力
   - 而且，由于是定期发送，因此，即使收到了消息的节点还会反复收到重复消息，加重了消息的冗余。

# Gossip 中的通信模式

- 在 Gossip 协议下，网络中两个节点之间有三种通信方式:
- Push: 节点 A 将数据 (key,value,version) 及对应的版本号推送给 B 节点，B 节点更新 A 中比自己新的数据
- Pull：A 仅将数据 key, version 推送给 B，B 将本地比 A 新的数据（Key, value, version）推送给 A，A 更新本地
- Push/Pull：与 Pull 类似，只是多了一步，A 再将本地比 B 新的数据推送给 B，B 则更新本地
- 如果把两个节点数据同步一次定义为一个周期，则在一个周期内，Push 需通信 1 次，Pull 需 2 次，Push/Pull 则需 3 次
- 虽然消息数增加了，但从效果上来讲，Push/Pull 最好，理论上一个周期内可以使两个节点完全一致
- 直观上，Push/Pull 的收敛速度也是最快的。

# 本节重点总结 :

- gossip流言算法
- 信息同步过程演示
- Gossip 的特点（优势）
- Gossip 的特点（的缺陷）

## 43.3 alertmanager流水线处理源码解读

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

