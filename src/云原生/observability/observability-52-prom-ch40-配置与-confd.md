---
title: Prometheus 第40章：配置与 confd
sidebarGroup: 可观测性
shortTitle: 52 配置与 confd
order: 52
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第40章（配置与 confd）合并笔记
---

> **Prometheus · 第 40 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 40.1 高基数查询原因总结和判定高基数的依据

# 本节重点介绍 :

- 高基数查询举例
- 高基数查询原因总结
  - 压缩放大叠加数据量
- 高基数的危害实例
- 判定高基数的依据

# 什么是高基数查询

- 来个 最直观的对比
  - {​__name__=~".*a.*"}
  - node_arp_entries
  - ![h_zhi.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/08af1ed356fa41198b24d5e5f66c7845.png)
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/60fb0b26f06f472d9d613c7a691ac05f.png)
  - 就是因为查询所有指标的12小时数据，前端浏览器卡死了，后台机器load1直接飙涨到18
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/da8f564c6f7d4499bd4779f491bf93d2.png)
- 通俗的说就是返回的series或者查询到的series数量过多
- 查询表现出来返回时间较长，对应调用服务端资源较多的查询
- 数量多少算多 10w~100w
- 一般我们定义在1小时内的range_query 响应时间超过`3秒`则认为较重了

# 高基数查询举例

- `{__name__=~".+"}`![high01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/15e9d1c543c34ea4baf4d3c05ce8825d.png)
- 生产举例 这就是一个典型的heavy_query![high02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/f3cec972ab054cc7befffa5f876461d7.png)
- 可以看到去掉histogram_quantile/rate等agg方法后查询一小时的metric传输数据达到12.8MB，可见数据量之大![high03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/4b7a67b8bd1e482991da16b60d85c492.png)
- 查询instance_query可以看到命中了1.8w个series![high04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/9e16d0c5d3b74c53b8631afc2d1be773.png)

## prometheus range_query过程

请看这篇文章，写的很清楚了[详解Prometheus range query中的step参数](https://segmentfault.com/a/1190000017553625)

## prometheus 查询limit限制参数

- --storage.remote.read-sample-limit=5e7 remote_read时单一query的最大加载点数
- --storage.remote.read-concurrent-limit remote_read并发query数目
- --storage.remote.read-max-bytes-in-frame=1048576  remote_read时单一返回字节大小
- --query.max-concurrency=20 prometheus 本身并发读请求
- --query.max-samples=50000000  prometheus 单一query的最大加载点数

# 高基数查询原因总结

## 资源原因

- 因为tsdb都有压缩算法对datapoint压缩，比如dod 和xor
- 那么当查询时数据必然涉及到解压放大的问题
- 比如压缩正常一个datapoint大小为16byte
- 一个heavy_query加载1万个series，查询时间24小时，30秒一个点来算，所需要的内存大小为 439MB，所以同时多个heavy_query会将prometheus内存打爆，prometheus也加了上面一堆参数去限制![high05.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/42a775890eb248e3936565d5f2457e13.png)
- 当然除了上面说的queryPreparation过程外，查询时还涉及sort和eval等也需要耗时

# 高基数的危害实例

## oom 和内核态cpu暴涨

![mo02.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/9e8f5555c271406fba8bf3eaf577d159.png)

- node cpu kernel 暴涨![mo04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/068750b7372a46b8b8dff6bdeadd8382.png)
- 资源飙升![oom1000.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/1d1eda52730b402594cfe089efd94b61.png)

# 判定高基数的依据

## 方法一 tsdb的统计接口

- http://192.168.43.114:9090/tsdb-status
- ![get_h01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755324000/9256d691036045148ec005713da8c5b1.png)
- 接口地址`/api/v1/status/tsdb`
- 是基于内存中的倒排索引 算最大堆取 top10
- 10个最多的metric_name排序

```shell
seriesCountByMetricName: [{name: "namedprocess_namegroup_memory_bytes", value: 245},…]
0: {name: "namedprocess_namegroup_memory_bytes", value: 245}
1: {name: "namedprocess_namegroup_states", value: 245}
2: {name: "mysql_global_status_commands_total", value: 148}
3: {name: "namedprocess_namegroup_context_switches_total", value: 98}
4: {name: "namedprocess_namegroup_cpu_seconds_total", value: 98}
5: {name: "node_scrape_collector_success", value: 80}
6: {name: "node_scrape_collector_duration_seconds", value: 80}
7: {name: "namedprocess_namegroup_threads_wchan", value: 73}
8: {name: "namedprocess_namegroup_thread_cpu_seconds_total", value: 66}
9: {name: "namedprocess_namegroup_thread_io_bytes_total", value: 66}
```

- 思考采集器如果不是prometheus怎么办？
  - 比如m3db没有提供高基数查询的接口

## 方法二 query_log

- 可以根据log中的queryPreparationTime来定位

## 方法三 通过count统计

```shell
topk(5,count({__name__=~".+"}) by(__name__) > 100 )
```

- scrape_samples_scraped 可以说明job的instance维度sample数量，也能够定位

# 本节重点总结 :

- 高基数查询举例
- 高基数查询原因总结
  - 压缩放大叠加数据量
- 高基数的危害实例
- 判定高基数的依据

## 40.2 预聚合和prometheus-record使用

# 本节重点介绍 :

- downsample降采样可以降低查询数据量
  - prometheus原生不支持downsample
- 实时查询/聚合 VS 预查询/聚合的优缺点
  - 实时查询/聚合条件随意组合，性能差
  - 预查询/聚合 性能好，聚合条件需要提前定义
- prometheus的预查询/聚合配置举例

# downsample降采样可以降低查询数据量

## prometheus原生不支持downsample

- 还有个原因是prometheus原生不支持downsample，所以无论grafana上面的step随时间如何变化，涉及到到查询都是将指定的block解压再按step切割
- 所以查询时间跨度大对应消耗的cpu和内存就会暴增，同时原始点的存储也浪费了，因为grafana的step会随时间跨度变大变大

# 实时查询/聚合 VS 预查询/聚合

- prometheus的query都是实时查询的/聚合

## 实时查询的优点很明显

- 查询/聚合条件随意组合，比如 rate后再sum然后再叠加一个histogram_quantile

## 实时查询的缺点也很明显

- 那就是慢，或者说资源消耗大

## 实时查询的优缺点反过来就是预查询/聚合的优缺点

- 一个预聚合的例子请看我写的falcon组件[监控聚合器系列之: open-falcon新聚合器polymetric](https://segmentfault.com/a/1190000023092934)
- 所有的聚合方法提前定义好，并定时被计算出结果
- 查询时不涉及任何的聚合，直接查询结果
- 比如实时聚合需要每次加载10万个series，预聚合则只需要查询几个结果集

## 那么问题来了prometheus有没有预查询/聚合呢

- 答案是有的

# prometheus的预查询/聚合

- [prometheus record](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- 记录规则允许您预先计算经常需要或计算量大的表达式，并将其结果保存为一组新的时间序列
- 查询预先计算的结果通常比每次需要时执行原始表达式要快得多
- 这对于仪表板特别有用，仪表板每次刷新时都需要重复查询相同的表达式

## record生产实例讲解

```yaml
groups:
- name: my_record
  interval: 30s
  rules:
  - record: hke:heavy_expr:0211d8a2fcdefee8e626c86ba3916281
    expr: sum(delta(kafka_topic_partition_current_offset{instance=~'1.1.1.1:9308', topic=~".+"}[5m])/5) by (topic)

```

- name代表 这个预聚合组的名字
- interval: 30s代表 每30秒执行一次预聚合
- rules代表规则
- record代表聚合之后的metrics 名字，prometheus推荐使用 :代表聚合的的metrics
- expr 代表要执行的promql ，和alert不同就是不用加阈值

## 配置一个预聚合

- 机器的平均cpu利用率

```shell
avg(1 - avg(rate(node_cpu_seconds_total{job=~"node_exporter",mode="idle"}[2m])) by (instance)) * 100
```

- 编写record.yml

```shell
cat <<EOF > /opt/app/prometheus/record.yml
groups:
  - name: example
    rules:
    - record: node_avg_cpu_usage
      expr: avg(1 - avg(rate(node_cpu_seconds_total{job=~"node_exporter",mode="idle"}[2m])) by (instance)) * 100
EOF

```

- check下语法

```shell
[root@prome-master01 prometheus]# ./promtool check rules record.yml 
Checking record.yml
  SUCCESS: 1 rules found

```

- 修改主配置文件加入record
- 查询数据![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755460000/490bdcbfe1cd40cb81f530d1d09d5206.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630755460000/14183e22a0884fdab30e892be119fd7d.png)

# 本节重点总结 :

- downsample降采样可以降低查询数据量
  - prometheus原生不支持downsample
- 实时查询/聚合 VS 预查询/聚合的优缺点
  - 实时查询/聚合条件随意组合，性能差
  - 预查询/聚合 性能好，聚合条件需要提前定义
- prometheus的预查询/聚合配置举例

# 灵魂拷问

- 预聚合不能解决什么问题？
  - 如果instance_query本身就是高基数？

## 40.3 prometheus预聚合源码解读

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

