---
title: "33.2 prometheus联邦功能源码解读和它的问题"
sidebarGroup: "Prometheus"
shortTitle: "98 33.2 prometheus联邦功能源码解..."
order: 98
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - prometheus 联邦使用的误解 - federate源码分析 prometheus 联邦使用的误解 - 我看到很多人会这样使用联邦：联邦prometheus 收集多个采集器..."
---

> **Prometheus · 第 98 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- prometheus 联邦使用的误解
- federate源码分析

# prometheus 联邦使用的误解

- 我看到很多人会这样使用联邦：联邦prometheus 收集多个采集器的数据
- 实在看不下下去了，很多小白还在乱用`prometheus`的联邦
- 其实很多人是想实现prometheus数据的可用性，数据分片保存，有个统一的查询地方(小白中的联邦prometheus)
- 今天写篇文章分析下联邦的问题，并给出一个基于全部是prometheus的`multi_remote_read`方案

# 联邦问题

- [联邦文档地址](https://prometheus.io/docs/prometheus/latest/federation/)

## 联邦使用配偶样例

- 本质上就是采集级联
- 说白了就是 a 从 b,c,d那里再采集数据过来
- 可以搭配match指定只拉取某些指标
- 下面就是官方文档给出的样例

```yaml
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s

    honor_labels: true
    metrics_path: '/federate'

    params:
      'match[]':
        - '{job="prometheus"}'
        - '{__name__=~"job:.*"}'

    static_configs:
      - targets:
        - 'source-prometheus-1:9090'
        - 'source-prometheus-2:9090'
        - 'source-prometheus-3:9090'
```

# federate源码分析

## 看上面的样例配置怎么感觉是采集的配置呢

- 不用怀疑就是，下面看看代码分析一下
- 从上述配置可以看到采集的 path是`/federate`
- 代码位置 D:\go_path\src\github.com\prometheus\prometheus\web\web.go

```go
    // web.go 的 federate Handler
	router.Get("/federate", readyf(httputil.CompressionHandler{
		Handler: http.HandlerFunc(h.federation),
	}.ServeHTTP))
```

## 分析下联邦http处理函数 说白了就是读取本地存储数据处理

- 代码位置 D:\go_path\src\github.com\prometheus\prometheus\web\federate.go

```go
func (h *Handler) federation(w http.ResponseWriter, req *http.Request) {

	// localstorage 的query
	q, err := h.localStorage.Querier(req.Context(), mint, maxt)

	defer q.Close()
	// 最终发送的Vector 数组
	vec := make(promql.Vector, 0, 8000)

	hints := &storage.SelectHints{Start: mint, End: maxt}

	var sets []storage.SeriesSet

	set := storage.NewMergeSeriesSet(sets, storage.ChainedSeriesMerge)
    // 遍历存储中的full series
	for set.Next() {
		s := set.At()

		vec = append(vec, promql.Sample{
			Metric: s.Labels(),
			Point:  promql.Point{T: t, V: v},
		})

	for _, s := range vec {
		nameSeen := false
		globalUsed := map[string]struct{}{}
		protMetric := &dto.Metric{
			Untyped: &dto.Untyped{},
		}
        // Encode方法根据请求类型编码
				if protMetricFam != nil {
					if err := enc.Encode(protMetricFam); err != nil {
						federationErrors.Inc()
						level.Error(h.logger).Log("msg", "federation failed", "err", err)
						return
					}
				}

		}

		protMetric.TimestampMs = proto.Int64(s.T)
		protMetric.Untyped.Value = proto.Float64(s.V)

		protMetricFam.Metric = append(protMetricFam.Metric, protMetric)
	}
	// 
	if protMetricFam != nil {
		if err := enc.Encode(protMetricFam); err != nil {
			federationErrors.Inc()
			level.Error(h.logger).Log("msg", "federation failed", "err", err)
		}
	}
}

```

### 解读一下

- 因为是将本地的数据发送走，所以首先创建一个localstorage 的Querier

```go
	q, err := h.localStorage.Querier(req.Context(), mint, maxt)

```

- 构造发送数据用的vector 容器

```go
	// 最终发送的Vector 数组
	vec := make(promql.Vector, 0, 8000)
```

- 遍历存储中的full series，塞入数据

```go
    // 遍历存储中的full series
	for set.Next() {
		s := set.At()

		vec = append(vec, promql.Sample{
			Metric: s.Labels(),
			Point:  promql.Point{T: t, V: v},
		})
```

- 对vector 容器数据进行排序，并准备一会要注入的外部标签组externalLabelNames

```go
	sort.Sort(byName(vec))

	externalLabels := h.config.GlobalConfig.ExternalLabels.Map()
	if _, ok := externalLabels[model.InstanceLabel]; !ok {
		externalLabels[model.InstanceLabel] = ""
	}
	externalLabelNames := make([]string, 0, len(externalLabels))
	for ln := range externalLabels {
		externalLabelNames = append(externalLabelNames, ln)
	}
	sort.Strings(externalLabelNames)
```

- 遍历vector，进行protocol 编码，并注入externalLabel

```go
	for _, s := range vec {
				for _, ln := range externalLabelNames {
			lv := externalLabels[ln]
			if _, ok := globalUsed[ln]; !ok {
				protMetric.Label = append(protMetric.Label, &dto.LabelPair{
					Name:  proto.String(ln),
					Value: proto.String(lv),
				})
			}
		}

		protMetric.TimestampMs = proto.Int64(s.T)
		protMetric.Untyped.Value = proto.Float64(s.V)

		protMetricFam.Metric = append(protMetricFam.Metric, protMetric)
    }
```

#### 最终调用压缩函数压缩发送数据

- 代码位置 D:\go_path\src\github.com\prometheus\prometheus\util\httputil\compression.go

```go
type CompressionHandler struct {
	Handler http.Handler
}

// ServeHTTP adds compression to the original http.Handler's ServeHTTP() method.
func (c CompressionHandler) ServeHTTP(writer http.ResponseWriter, req *http.Request) {
	compWriter := newCompressedResponseWriter(writer, req)
	c.Handler.ServeHTTP(compWriter, req)
	compWriter.Close()
}

```

# federate问题结论

## 如果没有过滤那么只是一股脑把分片的数据集中到了一起，没意义

- 很多时候是因为数据量太大了，分散在多个采集器的数据是不能被一个联邦消化的

## 正确使用联邦的姿势

- 使用match加过滤，将采集数据分位两类
  - 第一类需要再聚合的数据，通过联邦收集在一起
    - 举个例子
      - 只收集中间件的数据的联邦
      - 只收集业务数据的联邦
  - 其余数据保留在采集器本地即可
- 这样可以在各个联邦上执行`预聚合`和`alert`，使得查询速度提升

## 默认prometheus是不支持降采样的

- 可以在联邦配置scrape_interval的时候设置的大一点来达到 模拟降采样的目的
- 真实的降采样需要agg算法支持的，比如5分钟的数据算平均值、最大值、最小值保留，而不是这种把采集间隔调大到5分钟的随机选点逻辑

# 正确实现统一查询的姿势是使用prometheus multi_remote_read

# 本节重点总结 :

- prometheus 联邦使用的误解
- federate源码分析

