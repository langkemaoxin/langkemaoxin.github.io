---
title: "5.4 配置prometheus采集通过http请求参数过滤采集器"
sidebarGroup: "Prometheus"
shortTitle: "148 5.4 配置prometheus采集通过ht..."
order: 148
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 将node_exporter 作为采集job配置在prometheus - node_exporter 通过http参数 过滤相关模块的指标 - prometheus如何配置 采..."
---

> **Prometheus · 第 148 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 将node_exporter 作为采集job配置在prometheus
- node_exporter 通过http参数 过滤相关模块的指标
- prometheus如何配置 采集目标的参数
- node_export源码中怎么处理传入的模块参数

# 将node_exporter job配置在prometheus中

## job的yaml

```yaml
- job_name: node_exporter
  honor_timestamps: true
  scrape_interval: 8s
  scrape_timeout: 8s
  metrics_path: /metrics
  scheme: http
  follow_redirects: true
  static_configs:
  - targets:
    - 192.168.3.200:9100
```

## 编辑prometheus配置文件，发送热更新命令

```shell
curl -vvv  -X POST localhost:9090/-/reload
```

## 在prometheus中查询 node_exporter的指标

# http传入参数，按采集器过滤指标

## 使用

- 访问node_exporter metrics页面，传入 collect参数

```shell
# 只看cpu采集器的指标
http://192.168.0.112:9100/metrics?collect[]=cpu

# 只看cpu和mem采集器的指标
http://192.168.0.112:9100/metrics?collect[]=cpu&collect[]=meminfo
```

- prometheus配置参数

```yaml
  params:
    collect[]:
      - cpu
      - meminfo
```

- 总的配置变为

```yaml
- job_name: node_exporter
  honor_timestamps: true
  scrape_interval: 8s
  scrape_timeout: 8s
  metrics_path: /metrics
  scheme: http
  follow_redirects: true
  static_configs:
  - targets:
    - 192.168.3.200:9100
  params:
    collect[]:
      - cpu
      - meminfo
```

- 和prometheus`relabel_config`的区别 ：`按采集器过滤 VS 按metric_name 或label过滤`

## 原理： 通过http请求参数过滤采集器

- collect参数解析在  D:\nyy_work\go_path\src\github.com\prometheus\node_exporter\node_exporter.go
- 根据http传入的collect参数，进行filter采集模块过滤
- 将过滤后的模块注册到prometheus采集器上

```go
func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	filters := r.URL.Query()["collect[]"]
	level.Debug(h.logger).Log("msg", "collect query:", "filters", filters)

	if len(filters) == 0 {
		// No filters, use the prepared unfiltered handler.
		h.unfilteredHandler.ServeHTTP(w, r)
		return
	}
	// To serve filtered metrics, we create a filtering handler on the fly.
	filteredHandler, err := h.innerHandler(filters...)
	if err != nil {
		level.Warn(h.logger).Log("msg", "Couldn't create filtered metrics handler:", "err", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Sprintf("Couldn't create filtered metrics handler: %s", err)))
		return
	}
	filteredHandler.ServeHTTP(w, r)
}
```

# 本节重点总结 :

- 将node_exporter 作为采集job配置在prometheus
- node_exporter 通过http参数 过滤相关模块的指标
- prometheus如何配置 采集目标的参数
- node_export源码中怎么处理传入的模块参数

