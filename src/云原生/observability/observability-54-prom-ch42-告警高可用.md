---
title: Prometheus 第42章：告警高可用
sidebarGroup: 可观测性
shortTitle: 54 告警高可用
order: 54
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第42章（告警高可用）合并笔记
---

> **Prometheus · 第 42 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 42.1 从一条告警的触发分析prometheus alert告警源码

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

## 42.2 告警触发trigger模块单点问题和高可用解决方案

# 本节重点介绍 :
- prometheus告警trigger单点问题
- trigger模型简化 海量的job交给有限的work执行
- 动态分片方案
- 改造之前的prome-shard代码

# trigger单点问题
- 我们知道prometheus 如果配置了rule就充当trigger角色了

- prometheus实例可以用来做下列用途

|  对应的配置段   | 用途|
|  ----  | ----  | 
| 采集配置段	| 做采集器，数据保存在本地|
| 采集配置段 + 远程写入段| 做采集器+传输器，数据保存在本地+远端存储|
| 远程查询段| 做查询器，查询远端存储数据|
| 采集配置段 + 远程查询段| 做采集器+查询器，查询本地数据+远端存储数据 |
| 采集配置段 + Alertmanager信息段 + 告警配置文件段 | 做采集器+告警触发器，查询本地数据生成报警发往Alertmanager |
| 远程查询段 + Alertmanager信息段 + 告警配置文件段 | 做远程告警触发器，查询远端数据生成报警发往Alertmanager |
| 远程查询段+远程写入段  + 预聚合配置文件段 | 做预聚合指标，生成的结果集指标写入远端存储 |

## trigger模型简化 海量的job交给有限的work执行
- job就相当于用户配置的rule规则，规则的触发
- 海量的意思是，规则非常多
- 那么交给一个work执行就会有单点问题
- 解决方案就是静态分片和动态分片

# 静态分片解决方案
- 通过confd分片
- 具体方案可以看41.4章节
## 静态分片方案弊端
- 还是老问题，某个分片挂了之后没有其它分片接管
- 损失1/n的job

# 动态分片方案

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111890000/b21b8e5851d347169f9f614b28aa7773.png)

> 需要解决下面的问题

- 如何解决静态分片中分片挂掉的问题
- 如何统一采集器配置
- 如何将采集的target分发给采集器
- 如何降低分片变化是target的迁移

# 改造我们之前的prome-shard代码 27.9章

## 扩展target字段
- D:\go_path\src\prome-shard\target\target.go
- 添加alert rule所需要的
- 并添加Type字段用于判断类型
- json和yaml不需要的字段 在标签中 设置为 -，避免后面写文件有多余的字段
```go
package target

import (
	"prome-shard/common"
)

type ScrapeTarget struct {
	Type             string            `json:"-" yaml:"-"`
	Targets          []string          `json:"targets" yaml:"-"`
	Labels           map[string]string `json:"labels" yaml:"-"`
	AlertName        string            `yaml:"alert,omitempty" json:"-"`       //alert name
	Expr             string            `yaml:"expr" json:"-"`                  // alert表达式
	For              string            `yaml:"for,omitempty" json:"-"`         // alert for 时间
	AlertLabels      map[string]string `yaml:"labels,omitempty" json:"-"`      // alert的标签
	AlertAnnotations map[string]string `yaml:"annotations,omitempty" json:"-"` //alert的注释map
}

var (
	AvaiableGetTargetFuncs = map[string]GetTargetFunc{
		common.ScrapePromeJobPrefix + "node_exporter": GetTargetNodeExporter,
		common.ScrapePromeJobPrefix + "get_alert":     GetTargetAlertRule,
	}
)

type GetTargetFunc func() []ScrapeTarget

```

## 添加获取alert 的func
- D:\go_path\src\prome-shard\target\get_alert.go
```go
package target

import (
	"fmt"
	"math/rand"
	"prome-shard/common"
)

func GetTargetAlertRule() []ScrapeTarget {

	qls := []string{
		`node_cpu_seconds_total >0`,
		`node_memory_Active_bytes !=0`,
		`node_load1 * 100 > 10`,
		`node_disk_writes_completed_total>0`,
	}

	randMapKeys := []string{"arch", "idc", "os", "job"}
	randMapValues := []string{"linux", "beijing", "centos", "arm64"}
	frn := func(n int) int {
		return rand.Intn(n)
	}

	targets := make([]ScrapeTarget, 0)
	for index, ql := range qls {
		num := len(randMapKeys)
		m := make(map[string]string, num)
		for i := 0; i < num; i++ {
			m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
		}
		t := ScrapeTarget{

			Type:        common.TargetAlert,
			Expr:        ql,
			For:         "10s",
			AlertName:   fmt.Sprintf("test_alert_name_%d", index),
			AlertLabels: m,
		}
		targets = append(targets, t)
	}
	return targets
}

```
## 修改Dispath函数，根据类型做判断
- 如果是alert的就用 name做hash
- 如果是 scrape就用 ip做hash
- 配置文件中新添加最后写文件的类型，json或者yaml
```go
func (this *ShardService) Dispatch() {
	// 执行这个对应的获取target函数
	targets := this.TargetGetFunc()
	if len(targets) == 0 {
		level.Warn(this.logger).Log("msg", "Dispatch.empty.targets")
		return
	}
	// 先初始化一个map ，key是 节点，value是分配给这个节点的targets
	nodeMap := make(map[string][]target.ScrapeTarget)

	// 遍历target，
	for _, t := range targets {

		switch t.Type {
		case common.TargetScrape:
			t := t
			if len(t.Targets) != 1 {
				continue
			}
			// 对target的地址 在哈希环中寻找节点
			// 要求每个target的地址都是1个
			// 然后根据node塞入map中
			node := this.GetNode(t.Targets[0])

			preTs, loaded := nodeMap[node]
			if !loaded {
				preTs = make([]target.ScrapeTarget, 0)

			}
			preTs = append(preTs, t)
			nodeMap[node] = preTs
		case common.TargetAlert:
			t := t

			// 对target的地址 在哈希环中寻找节点
			// 要求每个target的地址都是1个
			// 然后根据node塞入map中
			node := this.GetNode(t.AlertName)

			preTs, loaded := nodeMap[node]
			if !loaded {
				preTs = make([]target.ScrapeTarget, 0)

			}
			preTs = append(preTs, t)
			nodeMap[node] = preTs
		}

	}
	index := 1
	allNum := len(nodeMap)
	for node, ts := range nodeMap {
		// 拼接一个json文件的名字
		// 服务名_节点ip_索引_分片总数_target总数.json
		dstFileName := ""
		// 写json文件
		switch this.FileType {
		case "json":
			dstFileName = fmt.Sprintf("%s_%s_%d_%d_%d.json",
				this.SrvName,
				node,
				index,
				allNum,
				len(ts),

			)

			writeJsonFile(dstFileName, ts)
		case "yaml":
			dstFileName = fmt.Sprintf("%s_%s_%d_%d_%d.yaml",
				this.SrvName,
				node,
				index,
				allNum,
				len(ts),

			)
			writeYamlFile(dstFileName, ts)

		}

		extraVars := make(map[string]interface{})
		extraVars["src_sd_file_name"] = dstFileName
		extraVars["dest_sd_file_name"] = this.DestSdFileName
		extraVars["service_port"] = this.Port
		level.Info(this.logger).Log(
			"msg", "goansiblerun.run",

			"this.SrvName", this.SrvName,
			"jsonFileName", dstFileName,
			"node", node,
			"index", index,
			"all", allNum,
			"targetNum", len(ts),

		)
		go goansiblerun.AnsiRunPlay(this.logger, this.SrvName, node, extraVars, this.YamlPath)
		index++
	}

}

```

## 写yaml的函数
```go

type RuleGroup struct {
	Name  string `yaml:"name"`
	Rules []Rule `yaml:"rules"`
}

// Rule describes an alerting or recording rule.
type Rule struct {
	Record      string            `yaml:"record,omitempty"`
	Alert       string            `yaml:"alert,omitempty"`
	Expr        string            `yaml:"expr"`
	For         string            `yaml:"for,omitempty"`
	Labels      map[string]string `yaml:"labels,omitempty"`
	Annotations map[string]string `yaml:"annotations,omitempty"`
}

func writeYamlFile(fileName string, ts []target.ScrapeTarget) {
	gs := make([]RuleGroup, 0)

	for _, t := range ts {
		rules := make([]Rule, 0)
		r := Rule{
			Alert:       t.AlertName,
			Expr:        t.Expr,
			For:         t.For,
			Labels:      t.AlertLabels,
			Annotations: t.AlertAnnotations,
		}

		rules = append(rules, r)
		g := RuleGroup{
			Name:  t.AlertName,
			Rules: rules,
		}
		gs = append(gs, g)
	}

	bs, _ := yaml.Marshal(gs)

	err := ioutil.WriteFile(fileName, bs, 0644)
	fmt.Println(err)
}

```

- yaml文件格式为
```yaml
groups:
- name: test_alert_name_0
  rules:
  - alert: test_alert_name_0
    expr: node_cpu_seconds_total >0
    for: 10s
    labels:
      arch: centos
      idc: linux
      os: linux
- name: test_alert_name_1
  rules:
  - alert: test_alert_name_1
    expr: node_memory_Active_bytes !=0
    for: 10s
    labels:
      os: beijing
- name: test_alert_name_3
  rules:
  - alert: test_alert_name_3
    expr: node_disk_writes_completed_total>0
    for: 10s
    labels:
      arch: beijing
      os: beijing

```

## 修改配置文件，运行
- 新增 scrape_prometheus_get_alert 这个job
- 文件路径设置为 rule/
```yaml
shard_service:
  - name:   scrape_prometheus_node_exporter
    file_type: json
    desc: inf ecs 监控
    nodes:
      - 172.20.70.205
      - 172.20.70.215

    port: 9090
    dest_sd_file_name: file_sd_by_prome_shared.json
    yaml_path: ./copy_file_and_reload_prome.yaml

  - name:   scrape_prometheus_get_alert
    file_type: yaml
    desc: alert rule文件
    nodes:
      - 172.20.70.205
      - 172.20.70.215

    port: 9090
    dest_sd_file_name: ../rule/file_sd_by_prome_shared.yaml
    yaml_path: ./copy_file_and_reload_prome.yaml

http:
  port: 8801
consul_server:
  # consul api 地址
  addr: 172.20.70.205:8500
  username:
  password:

```

# 本节重点总结 :
- prometheus告警trigger单点问题
- trigger模型简化 海量的job交给有限的work执行
- 动态分片方案
- 改造之前的prome-shard代码

