---
title: "5.5 node_exporter采集原理简介"
sidebarGroup: "Prometheus"
shortTitle: "149 5.5 node_exporter采集原理简..."
order: 149
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - node_exporter主流程源码追踪 - mem模块采集的流程 node_exporter主流程源码追踪 采集器的初始化 - 初始化handler - 源码位置 D:\nyy..."
---

> **Prometheus · 第 149 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- node_exporter主流程源码追踪
- mem模块采集的流程

# node_exporter主流程源码追踪

## 采集器的初始化

- 初始化handler
- 源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\node_exporter.go

```go
http.Handle(*metricsPath, newHandler(!*disableExporterMetrics, *maxRequests, logger))
```

- 调用 newHandler，其中最关键一句是 innerHandler

```go
	if innerHandler, err := h.innerHandler(); err != nil {
		panic(fmt.Sprintf("Couldn't create metrics handler: %s", err))
```

- 调用 innerHandler ，其中干这么几件事
  - 根据过滤器初始化node_collector  nc
  - 把 nc注册到 prometheus的 registry 上`r.Register(nc)`
- 源码如下

```go
func (h *handler) innerHandler(filters ...string) (http.Handler, error) {
	nc, err := collector.NewNodeCollector(h.logger, filters...)
	if err != nil {
		return nil, fmt.Errorf("couldn't create collector: %s", err)
	}

	// Only log the creation of an unfiltered handler, which should happen
	// only once upon startup.
	if len(filters) == 0 {
		level.Info(h.logger).Log("msg", "Enabled collectors")
		collectors := []string{}
		for n := range nc.Collectors {
			collectors = append(collectors, n)
		}
		sort.Strings(collectors)
		for _, c := range collectors {
			level.Info(h.logger).Log("collector", c)
		}
	}

	r := prometheus.NewRegistry()
	r.MustRegister(version.NewCollector("node_exporter"))
	if err := r.Register(nc); err != nil {
		return nil, fmt.Errorf("couldn't register node collector: %s", err)
	}
	handler := promhttp.HandlerFor(
		prometheus.Gatherers{h.exporterMetricsRegistry, r},
		promhttp.HandlerOpts{
			ErrorLog:            stdlog.New(log.NewStdlibAdapter(level.Error(h.logger)), "", 0),
			ErrorHandling:       promhttp.ContinueOnError,
			MaxRequestsInFlight: h.maxRequests,
			Registry:            h.exporterMetricsRegistry,
		},
	)
	if h.includeExporterMetrics {
		// Note that we have to use h.exporterMetricsRegistry here to
		// use the same promhttp metrics for all expositions.
		handler = promhttp.InstrumentMetricHandler(
			h.exporterMetricsRegistry, handler,
		)
	}
	return handler, nil
}

```

## NewNodeCollector 初始化nc

- 源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\collector\collector.go
  - 根据 各个模块注册的 collectorState获取他们的执行函数 collector

```go
// NewNodeCollector creates a new NodeCollector.
func NewNodeCollector(logger log.Logger, filters ...string) (*NodeCollector, error) {
	f := make(map[string]bool)
	for _, filter := range filters {
		enabled, exist := collectorState[filter]
		if !exist {
			return nil, fmt.Errorf("missing collector: %s", filter)
		}
		if !*enabled {
			return nil, fmt.Errorf("disabled collector: %s", filter)
		}
		f[filter] = true
	}
	collectors := make(map[string]Collector)
	initiatedCollectorsMtx.Lock()
	defer initiatedCollectorsMtx.Unlock()
	for key, enabled := range collectorState {
		if !*enabled || (len(f) > 0 && !f[key]) {
			continue
		}
		if collector, ok := initiatedCollectors[key]; ok {
			collectors[key] = collector
		} else {
			collector, err := factories[key](log.With(logger, "collector", key))
			if err != nil {
				return nil, err
			}
			collectors[key] = collector
			initiatedCollectors[key] = collector
		}
	}
	return &NodeCollector{Collectors: collectors, logger: logger}, nil
}
```

- 各个模块会调用 在各自的init 函数中调用 registerCollector ,向 collectorState和factories注册自己

```go
func registerCollector(collector string, isDefaultEnabled bool, factory func(logger log.Logger) (Collector, error)) {
	var helpDefaultState string
	if isDefaultEnabled {
		helpDefaultState = "enabled"
	} else {
		helpDefaultState = "disabled"
	}

	flagName := fmt.Sprintf("collector.%s", collector)
	flagHelp := fmt.Sprintf("Enable the %s collector (default: %s).", collector, helpDefaultState)
	defaultValue := fmt.Sprintf("%v", isDefaultEnabled)

	flag := kingpin.Flag(flagName, flagHelp).Default(defaultValue).Action(collectorFlagAction(collector)).Bool()
	collectorState[collector] = flag

	factories[collector] = factory
}
```

![p1.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629012562000/a5d04555c589490b9666e7fc9f9dd19d.png)

## 执行采集

- prometheus sdk中执行采集就是执行对应的 Collect方法
- 源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\collector\collector.go

```go
// Collect implements the prometheus.Collector interface.
func (n NodeCollector) Collect(ch chan<- prometheus.Metric) {
	wg := sync.WaitGroup{}
	wg.Add(len(n.Collectors))
	for name, c := range n.Collectors {
		go func(name string, c Collector) {
			execute(name, c, ch, n.logger)
			wg.Done()
		}(name, c)
	}
	wg.Wait()
}
```

- 调用 execute函数，可以看到就是调用各个 collector模块的 update函数![p2.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629012562000/87c2e87308d84a16b2e00d6630151a38.png)

# mem采集模块的内容

- Update源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\collector\meminfo.go
- 源码如下

```go
// Update calls (*meminfoCollector).getMemInfo to get the platform specific
// memory metrics.
func (c *meminfoCollector) Update(ch chan<- prometheus.Metric) error {
	var metricType prometheus.ValueType
	memInfo, err := c.getMemInfo()
	if err != nil {
		return fmt.Errorf("couldn't get meminfo: %w", err)
	}
	level.Debug(c.logger).Log("msg", "Set node_mem", "memInfo", memInfo)
	for k, v := range memInfo {
		if strings.HasSuffix(k, "_total") {
			metricType = prometheus.CounterValue
		} else {
			metricType = prometheus.GaugeValue
		}
		ch <- prometheus.MustNewConstMetric(
			prometheus.NewDesc(
				prometheus.BuildFQName(namespace, memInfoSubsystem, k),
				fmt.Sprintf("Memory information field %s.", k),
				nil, nil,
			),
			metricType, v,
		)
	}
	return nil
}
```

- 内容分析
  - 通过c.getMemInfo() 获取到memInfo
  - 在linux 中memInfo中对应的就是 /proc/meminfo ，逐行解析
  - 遍历推送即可

# 本节重点总结 :

- node_exporter主流程源码追踪
- mem模块采集的流程

