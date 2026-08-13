---
title: "42.1 从一条告警的触发分析prometheus alert告警源码"
sidebarGroup: "Prometheus"
shortTitle: "139 42.1 从一条告警的触发分析prometh..."
order: 139
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 源码解读 源码解读 - 主流程在40.3讲解过，回顾一下 rule manager管理器 初始化ruleManager - main中初始化 go ruleManager = r..."
---

> **Prometheus · 第 139 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- 源码解读

# 源码解读
- 主流程在40.3讲解过，回顾一下

## rule manager管理器
### 初始化ruleManager
- main中初始化
```go
		ruleManager = rules.NewManager(&rules.ManagerOptions{
			Appendable:      fanoutStorage,
			Queryable:       localStorage,
			QueryFunc:       rules.EngineQueryFunc(queryEngine, fanoutStorage),
			NotifyFunc:      sendAlerts(notifierManager, cfg.web.ExternalURL.String()),
			Context:         ctxRule,
			ExternalURL:     cfg.web.ExternalURL,
			Registerer:      prometheus.DefaultRegisterer,
			Logger:          log.With(logger, "component", "rule manager"),
			OutageTolerance: time.Duration(cfg.outageTolerance),
			ForGracePeriod:  time.Duration(cfg.forGracePeriod),
			ResendDelay:     time.Duration(cfg.resendDelay),
		})
```

### ruleManager字段解析
- 代码位置D:\go_path\src\github.com\prometheus\prometheus\rules\manager.go
```go
type Manager struct {
	opts     *ManagerOptions // 相关的配置项
	groups   map[string]*Group  // 规则分组
	mtx      sync.RWMutex   
	block    chan struct{}   // 等待存储ok的chan
	done     chan struct{} // 退出通知的chan
	restored bool

	logger log.Logger
}

```

### 配置项 
```go
type ManagerOptions struct {
	ExternalURL     *url.URL
	QueryFunc       QueryFunc    // 数据查询的方法
	NotifyFunc      NotifyFunc   //发送告警的方法
	Context         context.Context  
	Appendable      storage.Appendable  // 结果写入的tsdb ，可以是本地或者remote
	Queryable       storage.Queryable   // 本地存储，用作查询
	Logger          log.Logger
	Registerer      prometheus.Registerer
	OutageTolerance time.Duration
	ForGracePeriod  time.Duration
	ResendDelay     time.Duration
	GroupLoader     GroupLoader

	Metrics *Metrics
}
```

### 在main中开启 reload配置监听
- 当用户发送 reload命令时  curl -vvv -X POST localhost:9090/-/reload
- 调用ruleManager.Update更新 rule.yml和record.yml配置
```go
{
			name: "rules",
			reloader: func(cfg *config.Config) error {
				// Get all rule files matching the configuration paths.
				var files []string
				for _, pat := range cfg.RuleFiles {
					fs, err := filepath.Glob(pat)
					if err != nil {
						// The only error can be a bad pattern.
						return errors.Wrapf(err, "error retrieving rule files for %s", pat)
					}
					files = append(files, fs...)
				}
				return ruleManager.Update(
					time.Duration(cfg.GlobalConfig.EvaluationInterval),
					files,
					cfg.GlobalConfig.ExternalLabels,
					externalURL,
				)
			},
```

## group告警或预聚合任务分组
- 位置 D:\go_path\src\github.com\prometheus\prometheus\rules\manager.go
```go
type Group struct {
	name                 string
	file                 string
	interval             time.Duration  // 执行间隔
	rules                []Rule   //多个规则
	seriesInPreviousEval []map[string]labels.Labels // One per Rule.
	staleSeries          []labels.Labels
	opts                 *ManagerOptions
	mtx                  sync.Mutex
	evaluationTime       time.Duration
	lastEvaluation       time.Time

	shouldRestore bool

	markStale   bool
	done        chan struct{}
	terminated  chan struct{}
	managerDone chan struct{}

	logger log.Logger

	metrics *Metrics
}
```

## run执行group
```go
func (g *Group) run(ctx context.Context) {}
```

### iter执行每个group
```go
	iter := func() {
		g.metrics.IterationsScheduled.WithLabelValues(GroupKey(g.file, g.name)).Inc()

		start := time.Now()
		g.Eval(ctx, evalTimestamp)
		timeSinceStart := time.Since(start)

		g.metrics.IterationDuration.Observe(timeSinceStart.Seconds())
		g.setEvaluationTime(timeSinceStart)
		g.setLastEvaluation(start)
	}
```

### 调用Eval执行 
```go
func (g *Group) Eval(ctx context.Context, ts time.Time) {}
```
- 调用alert或record的Eval 执行query拿到 vector
```go
vector, err := rule.Eval(ctx, ts, g.opts.QueryFunc, g.opts.ExternalURL)
```
- 如果类型是alert的就发送报警
```go
			if ar, ok := rule.(*AlertingRule); ok {
				ar.sendAlerts(ctx, ts, g.opts.ResendDelay, g.interval, g.opts.NotifyFunc)
			}
```
- 调用append 将vector结果写入tsdb中
```go
			for _, s := range vector {
				if _, err := app.Append(0, s.Metric, s.T, s.V); err != nil {
					rule.SetHealth(HealthBad)
					rule.SetLastError(err)

					switch errors.Cause(err) {
					case storage.ErrOutOfOrderSample:
						numOutOfOrder++
						level.Debug(g.logger).Log("msg", "Rule evaluation result discarded", "err", err, "sample", s)
					case storage.ErrDuplicateSampleForTimestamp:
						numDuplicates++
						level.Debug(g.logger).Log("msg", "Rule evaluation result discarded", "err", err, "sample", s)
					default:
						level.Warn(g.logger).Log("msg", "Rule evaluation result discarded", "err", err, "sample", s)
					}
				} else {
					seriesReturned[s.Metric.String()] = s.Metric
				}
			}
```

## alert 的 eval执行函数
- 位置 D:\go_path\src\github.com\prometheus\prometheus\rules\alerting.go
```go
func (r *AlertingRule) Eval(ctx context.Context, ts time.Time, query QueryFunc, externalURL *url.URL) (promql.Vector, error) {}
```

### 首先执行instant-query查询数据
- 如果出错设置SetLastError
```go
	res, err := query(ctx, r.vector.String(), ts)
	if err != nil {
		r.SetHealth(HealthBad)
		r.SetLastError(err)
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()
```

### 新建存储容器
- resultFPs 告警的哈希map
```go
resultFPs := map[uint64]struct{}{}

```
- alerts 告警对象
```go
var alerts = make(map[uint64]*Alert, len(res))
```

### 遍历查询vector结果
- 结果数量就是告警的数量

```go
for _, smpl := range res {}
```
- 如果报警的promql配置的聚合结果为1条就是1条，如
```shell script
sum (rate(apiserver_request_total[2m] ) ) >0 
```
- 配置的聚合 by产生多个结果，如code的值为5种
```shell script
sum by(code) (rate(apiserver_request_total[2m] ) ) >0 
```

### 根据go的模板注入标签
- 同时注入一些方便用户记忆的变量 .Labels  .Value  .ExternalLabels
```go
		tmplData := template.AlertTemplateData(l, r.externalLabels, r.externalURL, smpl.V)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := []string{
			"{{$labels := .Labels}}",
			"{{$externalLabels := .ExternalLabels}}",
			"{{$externalURL := .ExternalURL}}",
			"{{$value := .Value}}",
		}

		expand := func(text string) string {
			tmpl := template.NewTemplateExpander(
				ctx,
				strings.Join(append(defs, text), ""),
				"__alert_"+r.Name(),
				tmplData,
				model.Time(timestamp.FromTime(ts)),
				template.QueryFunc(query),
				externalURL,
			)
			result, err := tmpl.Expand()
			if err != nil {
				result = fmt.Sprintf("<error expanding template: %s>", err)
				level.Warn(r.logger).Log("msg", "Expanding alert template failed", "err", err, "data", tmplData)
			}
			return result
		}

		lb := labels.NewBuilder(smpl.Metric).Del(labels.MetricName)

		for _, l := range r.labels {
			lb.Set(l.Name, expand(l.Value))
		}
```

### 算报警的hash写入 指纹map中
- 同时判断如果有重复的指纹就报错
- 因为一个query出来的多个结果不能重复
- 设置alert的初始状态为pending
```go
		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			err = fmt.Errorf("vector contains metrics with the same labelset after applying alert labels")
			// We have already acquired the lock above hence using SetHealth and
			// SetLastError will deadlock.
			r.health = HealthBad
			r.lastError = err
			return nil, err
		}

		alerts[h] = &Alert{
			Labels:      lbs,
			Annotations: annotations,
			ActiveAt:    ts,
			State:       StatePending,
			Value:       smpl.V,
		}
```

### 根据缓存中的记录更新alert的值
- 要求alert的状态为 firing或者 pending
```go
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.active[h]; ok && alert.State != StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
			continue
		}

		r.active[h] = a
	}

```

### 检查alert上一次和这次的状态
- 检查过期的策略
    - 如果alert在 r.active而不在这次的resultFPs中
    - 如果状态是pending就要删掉
    - 如果距离现在超过15分钟了，就是很久没更新了也要删掉
    - 更新状态为StateInactive代表已恢复
    - 并且设置已恢复时间戳
    - 产生这种现象的原因是
        - 可能是用户更新了promql
        - 也可能是相关的vector确实恢复了
        - 也可能是没数据了
- 检查是否到配置的for时间，如果到了就把pending改为firing

```go
	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.active {
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > resolvedRetention) {
				delete(r.active, fp)
			}
			if a.State != StateInactive {
				a.State = StateInactive
				a.ResolvedAt = ts
			}
			continue
		}

		if a.State == StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration {
			a.State = StateFiring
			a.FiredAt = ts
		}

		if r.restored {
			vec = append(vec, r.sample(a, ts))
			vec = append(vec, r.forStateSample(a, ts, float64(a.ActiveAt.Unix())))
		}
	}
```

## rule manager中判断是alert类型就走发送流程
- D:\go_path\src\github.com\prometheus\prometheus\rules\manager.go
```go
			if ar, ok := rule.(*AlertingRule); ok {
				ar.sendAlerts(ctx, ts, g.opts.ResendDelay, g.interval, g.opts.NotifyFunc)
			}
```
### 判断函数 
```go
func (r *AlertingRule) sendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc) {
	alerts := []*Alert{}
	r.ForEachActiveAlert(func(alert *Alert) {
		if alert.needsSending(ts, resendDelay) {
			alert.LastSentAt = ts
			// Allow for two Eval or Alertmanager send failures.
			delta := resendDelay
			if interval > resendDelay {
				delta = interval
			}
			alert.ValidUntil = ts.Add(4 * delta)
			anew := *alert
			alerts = append(alerts, &anew)
		}
	})
	notifyFunc(ctx, r.vector.String(), alerts...)
}

```
- needsSending判断
    - 如果状态是pending则不发
    - 如果已经发送的报警恢复了，发送恢复信息
    - 如果上次发送的时间超过配置中的默认最短发送间隔 参数 rules.alert.resend-delay ，是1分钟就发送
- 代码
```go
func (a *Alert) needsSending(ts time.Time, resendDelay time.Duration) bool {
	if a.State == StatePending {
		return false
	}

	// if an alert has been resolved since the last send, resend it
	if a.ResolvedAt.After(a.LastSentAt) {
		return true
	}

	return a.LastSentAt.Add(resendDelay).Before(ts)
}

```

## 真实的发送函数
- D:\go_path\src\github.com\prometheus\prometheus\cmd\prometheus\main.go
- 构造notifier.Alert对象，调用Send发送
```go
func sendAlerts(s sender, externalURL string) rules.NotifyFunc {
	return func(ctx context.Context, expr string, alerts ...*rules.Alert) {
		var res []*notifier.Alert

		for _, alert := range alerts {
			a := &notifier.Alert{
				StartsAt:     alert.FiredAt,
				Labels:       alert.Labels,
				Annotations:  alert.Annotations,
				GeneratorURL: externalURL + strutil.TableLinkForExpression(expr),
			}
			if !alert.ResolvedAt.IsZero() {
				a.EndsAt = alert.ResolvedAt
			} else {
				a.EndsAt = alert.ValidUntil
			}
			res = append(res, a)
		}

		if len(alerts) > 0 {
			s.Send(res...)
		}
	}
}
```

### 发送方法
- D:\go_path\src\github.com\prometheus\prometheus\notifier\notifier.go
- 最终的http方法是sendAll，并发发送
```go
func (n *Manager) sendAll(alerts ...*Alert) bool {
	if len(alerts) == 0 {
		return true
	}

	begin := time.Now()

	// v1Payload and v2Payload represent 'alerts' marshaled for Alertmanager API
	// v1 or v2. Marshaling happens below. Reference here is for caching between
	// for loop iterations.
	var v1Payload, v2Payload []byte

	n.mtx.RLock()
	amSets := n.alertmanagers
	n.mtx.RUnlock()

	var (
		wg         sync.WaitGroup
		numSuccess atomic.Uint64
	)
	for _, ams := range amSets {
		var (
			payload []byte
			err     error
		)

		ams.mtx.RLock()

		switch ams.cfg.APIVersion {
		case config.AlertmanagerAPIVersionV1:
			{
				if v1Payload == nil {
					v1Payload, err = json.Marshal(alerts)
					if err != nil {
						level.Error(n.logger).Log("msg", "Encoding alerts for Alertmanager API v1 failed", "err", err)
						ams.mtx.RUnlock()
						return false
					}
				}

				payload = v1Payload
			}
		case config.AlertmanagerAPIVersionV2:
			{
				if v2Payload == nil {
					openAPIAlerts := alertsToOpenAPIAlerts(alerts)

					v2Payload, err = json.Marshal(openAPIAlerts)
					if err != nil {
						level.Error(n.logger).Log("msg", "Encoding alerts for Alertmanager API v2 failed", "err", err)
						ams.mtx.RUnlock()
						return false
					}
				}

				payload = v2Payload
			}
		default:
			{
				level.Error(n.logger).Log(
					"msg", fmt.Sprintf("Invalid Alertmanager API version '%v', expected one of '%v'", ams.cfg.APIVersion, config.SupportedAlertmanagerAPIVersions),
					"err", err,
				)
				ams.mtx.RUnlock()
				return false
			}
		}

		for _, am := range ams.ams {
			wg.Add(1)

			ctx, cancel := context.WithTimeout(n.ctx, time.Duration(ams.cfg.Timeout))
			defer cancel()

			go func(client *http.Client, url string) {
				if err := n.sendOne(ctx, client, url, payload); err != nil {
					level.Error(n.logger).Log("alertmanager", url, "count", len(alerts), "msg", "Error sending alert", "err", err)
					n.metrics.errors.WithLabelValues(url).Inc()
				} else {
					numSuccess.Inc()
				}
				n.metrics.latency.WithLabelValues(url).Observe(time.Since(begin).Seconds())
				n.metrics.sent.WithLabelValues(url).Add(float64(len(alerts)))

				wg.Done()
			}(ams.client, am.url().String())
		}

		ams.mtx.RUnlock()
	}

	wg.Wait()

	return numSuccess.Load() > 0
}
```

# 本节重点总结 :
- 源码解读

# 报警原理总结
- prometheus把record记录当做和alert一样处理
- 进行instant_query查询当前点，如果是alert则走报警的流程
- 通过本地缓存和这次查询对比更新alert的状态
    - pending代表触发了但是还没到配置的for时间
    - firing代表触发了
    - inactive代表恢复或者策略已删除
- 最终调用alertmanager的 api发送过去

