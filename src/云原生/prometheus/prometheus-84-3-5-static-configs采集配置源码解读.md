---
title: 3.5 static_configs采集配置源码解读
sidebarGroup: Prometheus
shortTitle: 84 3.5 static_configs采集配置...
order: 84
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 采集段静态配置的解释 - static_configs解析相关源码解读 采集段的解释 - 采集段是以job为单位配置的 yaml 采集配置段 scrape_configs: Th...'
---

> **Prometheus · 第 84 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 采集段静态配置的解释
- static_configs解析相关源码解读

## 采集段的解释

- 采集段是以job为单位配置的

```yaml
# 采集配置段
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'prometheus'

    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.

    static_configs:
    - targets: ['localhost:9090']
```

- target页面上可以看到相关的job
- ![p04.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628858278000/f7efa23088394f3db80d7bd5e655f041.png)
- 采集段中有很多配置项目，在页面上观察配置文件可以看到补全的信息

```yaml
- job_name: prometheus
  # true代表使用原始数据的时间戳，false代表使用prometheus采集器的时间戳
  honor_timestamps: true
  # 多久执行一次采集，就是这个job 多久执行一次
  scrape_interval: 15s
  # 采集的超时
  scrape_timeout: 15s
  # 就是采集target的 metric暴露 http path，默认是/metrics ,比如探针型的就是/probe
  metrics_path: /metrics
  # 采集目标的协议 是否是https
  scheme: http
  # 是否跟踪 redirect 
  follow_redirects: true
  static_configs:
  - targets:
    - localhost:9090
```

> 查看源码

- D:\go_path\src\github.com\prometheus\prometheus\config\config.go +380
- 可以看到全量的配置项

```golang
type ScrapeConfig struct {
	// The job name to which the job label is set by default.
	JobName string `yaml:"job_name"`
	// Indicator whether the scraped metrics should remain unmodified.
	HonorLabels bool `yaml:"honor_labels,omitempty"`
	// Indicator whether the scraped timestamps should be respected.
	HonorTimestamps bool `yaml:"honor_timestamps"`
	// A set of query parameters with which the target is scraped.
	Params url.Values `yaml:"params,omitempty"`
	// How frequently to scrape the targets of this scrape config.
	ScrapeInterval model.Duration `yaml:"scrape_interval,omitempty"`
	// The timeout for scraping targets of this config.
	ScrapeTimeout model.Duration `yaml:"scrape_timeout,omitempty"`
	// The HTTP resource path on which to fetch metrics from targets.
	MetricsPath string `yaml:"metrics_path,omitempty"`
	// The URL scheme with which to fetch metrics from targets.
	Scheme string `yaml:"scheme,omitempty"`
	// An uncompressed response body larger than this many bytes will cause the
	// scrape to fail. 0 means no limit.
	BodySizeLimit units.Base2Bytes `yaml:"body_size_limit,omitempty"`
	// More than this many samples post metric-relabeling will cause the scrape to
	// fail.
	SampleLimit uint `yaml:"sample_limit,omitempty"`
	// More than this many targets after the target relabeling will cause the
	// scrapes to fail.
	TargetLimit uint `yaml:"target_limit,omitempty"`
	// More than this many labels post metric-relabeling will cause the scrape to
	// fail.
	LabelLimit uint `yaml:"label_limit,omitempty"`
	// More than this label name length post metric-relabeling will cause the
	// scrape to fail.
	LabelNameLengthLimit uint `yaml:"label_name_length_limit,omitempty"`
	// More than this label value length post metric-relabeling will cause the
	// scrape to fail.
	LabelValueLengthLimit uint `yaml:"label_value_length_limit,omitempty"`

	// We cannot do proper Go type embedding below as the parser will then parse
	// values arbitrarily into the overflow maps of further-down types.

	ServiceDiscoveryConfigs discovery.Configs       `yaml:"-"`
	HTTPClientConfig        config.HTTPClientConfig `yaml:",inline"`

	// List of target relabel configurations.
	RelabelConfigs []*relabel.Config `yaml:"relabel_configs,omitempty"`
	// List of metric relabel configurations.
	MetricRelabelConfigs []*relabel.Config `yaml:"metric_relabel_configs,omitempty"`
}
```

- static_configs 段代表静态配置采集的端点
- 为何在上述ScrapeConfig配置段中没有找到 static_configs配置项，这又是怎么回事呢

## 源码搜索思路

- 在prometheus 源码目录搜索  static_configs![p01.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628858278000/d61ee1b59d3045cd9937af7fecf53c4b.png)
- 发现 在文件 D:\go_path\src\github.com\prometheus\prometheus\discovery\registry.go中有

![p02.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628858278000/74173fc81bc44cfd9807e429e59b0232.png)

- 看到这里 在registry.go中 的init 函数会在包自动导入的时候注册static_configs 到configFields中
- 所有服务发现都会在各自包中的init方法自动注册自己

> 追查 configFields是干什么用的

- D:\go_path\src\github.com\prometheus\prometheus\config\config.go
- ScrapeConfig实现了 yaml的Unmarshaler接口 中的UnmarshalYAML方法
- 所以在yaml解析的时候 ScrapeConfig字段时会调用这个UnmarshalYAML方法

```golang
func (c *ScrapeConfig) UnmarshalYAML(unmarshal func(interface{}) error) error {
	*c = DefaultScrapeConfig
	if err := discovery.UnmarshalYAMLWithInlineConfigs(c, unmarshal); err != nil {
		return err
	}
```

- UnmarshalYAMLWithInlineConfigs中 调用 getConfigType
- getConfigType方法中操作了configFields结构体
- 总结：

  - ScrapeConfig使用指定的UnmarshalYAML方法
  - 当中会去判断采用的是静态配置还是 服务发现的
  - 这样写的好处是不需要通过if-else判断，而且每种服务发现的配置是不一样的

# 本节重点总结 :

- prometheus的采集任务以job为单位
- prometheus充当http client 根据job中配置的 schema等信息去 ，target中配置的地址采集数据

