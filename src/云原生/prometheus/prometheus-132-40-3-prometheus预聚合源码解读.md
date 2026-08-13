---
title: "40.3 prometheus预聚合源码解读"
sidebarGroup: "Prometheus"
shortTitle: "132 40.3 prometheus预聚合源码解读"
order: 132
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 预聚合原理总结 - 源码解读 预聚合原理总结 - prometheus把record记录当做和alert一样处理 - 进行instant_query查询当前点，如果是alert则..."
---

> **Prometheus · 第 132 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 预聚合原理总结
- 源码解读

# 预聚合原理总结

- prometheus把record记录当做和alert一样处理
- 进行instant_query查询当前点，如果是alert则走报警的流程
- 如果是record，那么将查询到的结果写入tsdb，新的metric_name使用配置中设置的record名字，同时保留原有结果的label

# 源码解读

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

## record的 eval执行函数

- 位置 D:\go_path\src\github.com\prometheus\prometheus\rules\recording.go

```go
// Eval evaluates the rule and then overrides the metric names and labels accordingly.
func (rule *RecordingRule) Eval(ctx context.Context, ts time.Time, query QueryFunc, _ *url.URL) (promql.Vector, error) {
	vector, err := query(ctx, rule.vector.String(), ts)
	if err != nil {
		return nil, err
	}
	// Override the metric name and labels.
	for i := range vector {
		sample := &vector[i]

		lb := labels.NewBuilder(sample.Metric)

		lb.Set(labels.MetricName, rule.name)

		for _, l := range rule.labels {
			lb.Set(l.Name, l.Value)
		}

		sample.Metric = lb.Labels()
	}

	// Check that the rule does not produce identical metrics after applying
	// labels.
	if vector.ContainsSameLabelset() {
		err = fmt.Errorf("vector contains metrics with the same labelset after applying rule labels")
		rule.SetHealth(HealthBad)
		rule.SetLastError(err)
		return nil, err
	}

	rule.SetHealth(HealthGood)
	rule.SetLastError(err)
	return vector, nil
}

```

- 底层调用的instant query查询一个点
- 使用rule中配置的record作为新的series的name，并设置标签
  - 标签来自于两个部分
  - 一个是查询的结果标签，比如sum by instance 那就会有一个instance标签 或者 avg by code,verb 就会有code和verb的标签
  - 第二是rule中配置的标签

```go
		lb.Set(labels.MetricName, rule.name)

		for _, l := range rule.labels {
			lb.Set(l.Name, l.Value)
		}
```

# 本节重点总结 :

- 预聚合原理总结
- 源码解读

