---
title: 37.2 prometheus分析接口源码讲解
sidebarGroup: Prometheus
shortTitle: 120 37.2 prometheus分析接口源码讲...
order: 120
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 获取配置文件 config - 获取运行信息 runtimeinfo - 编译的信息 buildinfo - tsdb统计信息 tsdb - walreplay的信息 - tar...'
---

> **Prometheus · 第 120 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 获取配置文件 config
- 获取运行信息 runtimeinfo
- 编译的信息 buildinfo
- tsdb统计信息 tsdb
- walreplay的信息
- target统计信息
- 获取metrics的元信息

# 状态信息相关

## 获取配置文件

- path /api/v1/status/config
- 代码位置 D:\go_path\src\github.com\prometheus\prometheus\web\api\v1\api.go

```go
func (api *API) serveConfig(_ *http.Request) apiFuncResult {
	cfg := &prometheusConfig{
		YAML: api.config().String(),
	}
	return apiFuncResult{cfg, nil, nil, nil}
}
```

- 通过yaml.Marshal获取配置

## 获取运行信息

- path /api/v1/status/runtimeinfo

```go
func (api *API) serveRuntimeInfo(_ *http.Request) apiFuncResult {
	status, err := api.runtimeInfo()
	if err != nil {
		return apiFuncResult{status, &apiError{errorInternal, err}, nil, nil}
	}
	return apiFuncResult{status, nil, nil, nil}
}
```

### 底层信息函数

- 位置 D:\go_path\src\github.com\prometheus\prometheus\web\web.go

```go
func (h *Handler) runtimeInfo() (api_v1.RuntimeInfo, error) {
	status := api_v1.RuntimeInfo{
		StartTime:      h.birth,
		CWD:            h.cwd,
		GoroutineCount: runtime.NumGoroutine(),
		GOMAXPROCS:     runtime.GOMAXPROCS(0),
		GOGC:           os.Getenv("GOGC"),
		GODEBUG:        os.Getenv("GODEBUG"),
	}

	if h.options.TSDBRetentionDuration != 0 {
		status.StorageRetention = h.options.TSDBRetentionDuration.String()
	}
	if h.options.TSDBMaxBytes != 0 {
		if status.StorageRetention != "" {
			status.StorageRetention = status.StorageRetention + " or "
		}
		status.StorageRetention = status.StorageRetention + h.options.TSDBMaxBytes.String()
	}

	metrics, err := h.gatherer.Gather()
	if err != nil {
		return status, errors.Errorf("error gathering runtime status: %s", err)
	}
	for _, mF := range metrics {
		switch *mF.Name {
		case "prometheus_tsdb_wal_corruptions_total":
			status.CorruptionCount = int64(toFloat64(mF))
		case "prometheus_config_last_reload_successful":
			status.ReloadConfigSuccess = toFloat64(mF) != 0
		case "prometheus_config_last_reload_success_timestamp_seconds":
			status.LastConfigTime = time.Unix(int64(toFloat64(mF)), 0).UTC()
		}
	}
	return status, nil
}

```

- 字段解读
  - StartTime 启动时间
  - CWD 运行位置
  - GoroutineCount 代表goroutine数量
  - GOMAXPROCS 代表p数量
  - lastConfigTime 上次加载配置文件的时间
  - ReloadConfigSuccess 上次加载配置文件是否成功

## 编译的信息

- path /api/v1/status/buildinfo
- 字段解读
  - version 版本信息
  - revision commit号
  - branch 分支
  - buildUser 编译的user
  - buildDate 编译的时间
  - goVersion go版本

## 命令行参数

- path  /api/v1/status/flags
- 代码 D:\go_path\src\github.com\prometheus\prometheus\cmd\prometheus\main.go
- 来自命令行的解析结果

```go
	cfg.web.Flags = map[string]string{}

	// Exclude kingpin default flags to expose only Prometheus ones.
	boilerplateFlags := kingpin.New("", "").Version("")
	for _, f := range a.Model().Flags {
		if boilerplateFlags.GetFlag(f.Name) != nil {
			continue
		}

		cfg.web.Flags[f.Name] = f.Value.String()
	}

```

## tsdb统计信息

- path /api/v1/status/tsdb
- 源码在 32.2和倒排索引一起讲了

## walreplay的信息

- /api/v1/status/walreplay

```go
func (api *API) serveWALReplayStatus(w http.ResponseWriter, r *http.Request) {
	httputil.SetCORS(w, api.CORSOrigin, r)
	status, err := api.db.WALReplayStatus()
	if err != nil {
		api.respondError(w, &apiError{errorInternal, err}, nil)
	}
	api.respond(w, walReplayStatus{
		Min:     status.Min,
		Max:     status.Max,
		Current: status.Current,
	}, nil)
}
```

## target统计信息

- path /api/v1/targets
- target源码在 24.2讲解过了

## 获取metrics的元信息

- path /api/v1/metadata
- 底层来自于 Target.metadata字段，位置 D:\go_path\src\github.com\prometheus\prometheus\scrape\target.go

```go
type Target struct {
	// Labels before any processing.
	discoveredLabels labels.Labels
	// Any labels that are added to this target and its metrics.
	labels labels.Labels
	// Additional URL parameters that are part of the target URL.
	params url.Values

	mtx                sync.RWMutex
	lastError          error
	lastScrape         time.Time
	lastScrapeDuration time.Duration
	health             TargetHealth
	metadata           MetricMetadataStore
}

```

# 本节重点总结 :

- 获取配置文件 config
- 获取运行信息 runtimeinfo
- 编译的信息 buildinfo
- tsdb统计信息 tsdb
- walreplay的信息
- target统计信息
- 获取metrics的元信息

