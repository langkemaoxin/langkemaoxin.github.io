---
title: "7.7 prometheus relabel address替换源码解析"
sidebarGroup: "Prometheus"
shortTitle: "163 7.7 prometheus relabel..."
order: 163
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 多实例探针型采集配置解读 - relabel源码阅读 - __address__标签和target的关系 - 采集http请求时获取target最终参数 多实例探针型采集配置 y..."
---

> **Prometheus · 第 163 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 

- 多实例探针型采集配置解读
- relabel源码阅读
- __address__标签和target的关系
- 采集http请求时获取target最终参数

# 多实例探针型采集配置
```yaml
  - job_name: 'blackbox-http'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    static_configs:
      - targets:
        - http://prometheus.io    # Target to probe with http.
        - https://www.baidu.com   # Target to probe with https.
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 127.0.0.1:9115  # The blackbox exporter's real hostname:port.

```

## 进行一下解读
1. prometheus首先读取job中的targets，把target赋值给 `__address__`标签 ，此标签代表采集的地址
2. 将 `__address__`标签 赋值给`__param_target`标签，因为prometheus 访问blackbox需要传参， `__param_target`代表target参数
3. 将 `__param_target`标签  赋值给instance标签，因为后面监控数据需要instance标签做 被探测实例的标记
4. 将`__address__`标签 替换成真实的blackbox地址，因为prometheus是请求blackbox地址而不是 探测的目标地址

# relabel源码阅读
- 位置在D:\go_path\pkg\mod\github.com\prometheus\prometheus\scrape\target.go+ 328 
- populateLabels函数 ，处理标签relabel流程

- 先设置job级别的 3个标签 `job、__metrics_path__、 __scheme__`
```go
	scrapeLabels := []labels.Label{
		{Name: model.JobLabel, Value: cfg.JobName},
		{Name: model.MetricsPathLabel, Value: cfg.MetricsPath},
		{Name: model.SchemeLabel, Value: cfg.Scheme},
	}
```
- 再根据job配置中的 params设置所有参数标签 `__param_`
```go
    //  再根据job配置中的 params设置所有参数标签 `__param_`
    	for k, v := range cfg.Params {
		if len(v) > 0 {
			lb.Set(model.ParamLabelPrefix+k, v[0])
		}
	}
```

- 调用 relabel.Process处理relabel config
- relabel.Process中会根据配置的action 进行处理

```go
	switch cfg.Action {
	case Drop:
		if cfg.Regex.MatchString(val) {
			return nil
		}
	case Keep:
		if !cfg.Regex.MatchString(val) {
			return nil
		}
	case Replace:
		lb.Set(string(target), string(res))
    }
```  
-  默认的action就是 replace
```go
	DefaultRelabelConfig = Config{
		Action:      Replace,
		Separator:   ";",
		Regex:       MustNewRegexp("(.*)"),
		Replacement: "$1",
	}
```
- 对于我们上面的例子中就是 source赋值给target
- 再回到populateLabels函数， 处理__address__标签，如果没有端口 则设置端口和scheme 
```go
lb.Set(model.AddressLabel, addr)
```
- 删掉 __meta_开头的标签
```go
    for _, l := range lset {
    if strings.HasPrefix(l.Name, model.MetaLabelPrefix) {
        lb.Del(l.Name)
    }
```
- populateLabels最后一步 ，把将 instance标签设置为addr的值 
```go
if v := lset.Get(model.InstanceLabel); v == "" {
    lb.Set(model.InstanceLabel, addr)
}
```
- addr 就是 __address__的值

# __address__标签和target的关系
- __address__标签来自于 各个服务发现给出的，比如常规的yaml解析的时候
- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\discovery\targetgroup\targetgroup.go
```go
func (tg *Group) UnmarshalYAML(unmarshal func(interface{}) error) error {
	g := struct {
		Targets []string       `yaml:"targets"`
		Labels  model.LabelSet `yaml:"labels"`
	}{}
	if err := unmarshal(&g); err != nil {
		return err
	}
	tg.Targets = make([]model.LabelSet, 0, len(g.Targets))
	for _, t := range g.Targets {
		tg.Targets = append(tg.Targets, model.LabelSet{
			model.AddressLabel: model.LabelValue(t),
		})
	}
	tg.Labels = g.Labels
	return nil
}
```

# 采集http请求时获取target最终参数
- 这些参数后面会加在请求目标地址的时候，代码位置 D:\go_path\src\github.com\prometheus\prometheus\scrape\target.go
- 在target的URL方法中可以看到 几个重要的参数 Schema、host、path、params
```go
func (t *Target) URL() *url.URL {
	params := url.Values{}

	for k, v := range t.params {
		params[k] = make([]string, len(v))
		copy(params[k], v)
	}
	for _, l := range t.labels {
		if !strings.HasPrefix(l.Name, model.ParamLabelPrefix) {
			continue
		}
		ks := l.Name[len(model.ParamLabelPrefix):]

		if len(params[ks]) > 0 {
			params[ks][0] = l.Value
		} else {
			params[ks] = []string{l.Value}
		}
	}

	return &url.URL{
		Scheme:   t.labels.Get(model.SchemeLabel),
		Host:     t.labels.Get(model.AddressLabel),
		Path:     t.labels.Get(model.MetricsPathLabel),
		RawQuery: params.Encode(),
	}
}
```

- 在最终的采集动作中，会获取target的URL方法获取 地址和参数，位置 D:\go_path\src\github.com\prometheus\prometheus\scrape\scrape.go
```go
func (s *targetScraper) scrape(ctx context.Context, w io.Writer) (string, error) {
	if s.req == nil {
		req, err := http.NewRequest("GET", s.URL().String(), nil)
    }
}
```

# 本节重点总结: 

- 多实例探针型采集配置解读
- relabel源码阅读
- __address__标签和target的关系
- 采集http请求时获取target最终参数

