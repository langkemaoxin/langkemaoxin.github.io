---
title: "37.1 prometheus管理接口源码讲解"
sidebarGroup: "Prometheus"
shortTitle: "119 37.1 prometheus管理接口源码讲..."
order: 119
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 生命周期控制相关 - reload 热更新配置 - pprof相关 - prometheus pprof 查看火焰图 - 存储操作相关 生命周期控制相关 - 代码位置位置 D:\..."
---

> **Prometheus · 第 119 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 生命周期控制相关
  - reload 热更新配置
- pprof相关
  - prometheus pprof 查看火焰图
- 存储操作相关

# 生命周期控制相关

- 代码位置位置 D:\go_path\src\github.com\prometheus\prometheus\web\web.go

```go
	if o.EnableLifecycle {
		router.Post("/-/quit", h.quit)
		router.Put("/-/quit", h.quit)
		router.Post("/-/reload", h.reload)
		router.Put("/-/reload", h.reload)
	} else {
		forbiddenAPINotEnabled := func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte("Lifecycle API is not enabled."))
		}
		router.Post("/-/quit", forbiddenAPINotEnabled)
		router.Put("/-/quit", forbiddenAPINotEnabled)
		router.Post("/-/reload", forbiddenAPINotEnabled)
		router.Put("/-/reload", forbiddenAPINotEnabled)
	}
```

- reload的源码在3.7已经讲解过了
- quit代表退出
- 如果  --web.enable-lifecycle没开启的话访问会报错

```shell
Lifecycle API is not enabled.
```

# pprof相关

- 代码位置 D:\go_path\src\github.com\prometheus\prometheus\web\web.go

```go
func serveDebug(w http.ResponseWriter, req *http.Request) {
	ctx := req.Context()
	subpath := route.Param(ctx, "subpath")

	if subpath == "/pprof" {
		http.Redirect(w, req, req.URL.Path+"/", http.StatusMovedPermanently)
		return
	}

	if !strings.HasPrefix(subpath, "/pprof/") {
		http.NotFound(w, req)
		return
	}
	subpath = strings.TrimPrefix(subpath, "/pprof/")

	switch subpath {
	case "cmdline":
		pprof.Cmdline(w, req)
	case "profile":
		pprof.Profile(w, req)
	case "symbol":
		pprof.Symbol(w, req)
	case "trace":
		pprof.Trace(w, req)
	default:
		req.URL.Path = "/debug/pprof/" + subpath
		pprof.Index(w, req)
	}
}
```

## pprof实例

- 访问地址 /debug/pprof/

```shell

Types of profiles available:
Count	Profile
2255	allocs
0	block
0	cmdline
66	goroutine
2255	heap
0	mutex
0	profile
16	threadcreate
0	trace
full goroutine stack dump
Profile Descriptions:

allocs: A sampling of all past memory allocations
block: Stack traces that led to blocking on synchronization primitives
cmdline: The command line invocation of the current program
goroutine: Stack traces of all current goroutines
heap: A sampling of memory allocations of live objects. You can specify the gc GET parameter to run GC before taking the heap sample.
mutex: Stack traces of holders of contended mutexes
profile: CPU profile. You can specify the duration in the seconds GET parameter. After you get the profile file, use the go tool pprof command to investigate the profile.
threadcreate: Stack traces that led to the creation of new OS threads
trace: A trace of execution of the current program. You can specify the duration in the seconds GET parameter. After you get the trace file, use the go tool trace command to investigate the trace.
```

## pprof作用

- pprof 是 Go 语言中分析程序运行性能的工具，它能提供各种性能数据：![pprof01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630754984000/154081ed995d46cca43618c8ecdcea1f.png)

> 主要体现下面4种实用功能

1. CPU Profiling：CPU 分析，按照一定的频率采集所监听的应用程序 CPU（含寄存器）的使用情况，可确定应用程序在主动消耗 CPU 周期时花费时间的位置
2. Memory Profiling：内存分析，在应用程序进行堆分配时记录堆栈跟踪，用于监视当前和历史内存使用情况，以及检查内存泄漏
3. Block Profiling：阻塞分析，记录 goroutine 阻塞等待同步（包括定时器通道）的位置
4. Mutex Profiling：互斥锁分析，报告互斥锁的竞争情况

## prometheus pprof 查看火焰图

> 安装作图库

- yum -y install graphviz

> 直接生成svg文件

```shell
go tool pprof -svg  http://localhost:9090/debug/pprof/heap > b.svg

```

> http直接查看

```shell
go tool pprof --http=0.0.0.0:7777 http://localhost:9090/debug/pprof/heap
Fetching profile over HTTP from http://localhost:10000/debug/pprof/profile?seconds=30
Saved profile in /root/pprof/pprof.a.samples.cpu.002.pb.gz
Serving web UI on http://0.0.0.0:7777
http://0.0.0.0:7777

```

> 火焰图样例
> ![pprof03.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630754984000/2f5da20b98784cf9a8a2f54d194d3cc2.png)
>
> ![pprof04.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630754984000/3f281bded6ce4f4f98fecd96ae673a49.png)
>
> ![pprof05.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630754984000/a9129484751a4379b5e3503c4d801593.png)

# 存储操作相关

- 代码位置  D:\go_path\src\github.com\prometheus\prometheus\web\api\v1\api.go

```go
	// Admin APIs
	r.Post("/admin/tsdb/delete_series", wrap(api.deleteSeries))
	r.Post("/admin/tsdb/clean_tombstones", wrap(api.cleanTombstones))
	r.Post("/admin/tsdb/snapshot", wrap(api.snapshot))

	r.Put("/admin/tsdb/delete_series", wrap(api.deleteSeries))
	r.Put("/admin/tsdb/clean_tombstones", wrap(api.cleanTombstones))
	r.Put("/admin/tsdb/snapshot", wrap(api.snapshot))
```

- 这些操作需要 web.enable-admin-api=true

```go
	a.Flag("web.enable-admin-api", "Enable API endpoints for admin control actions.").
		Default("false").BoolVar(&cfg.web.EnableAdminAPI)
```

## 删除series(不常用)

- 调用api.db.Delete删除数据
- 数据的删除不应该手动触发，应该让tsdb 做过期删除

```go
func (api *API) deleteSeries(r *http.Request) apiFuncResult {
	if !api.enableAdmin {
		return apiFuncResult{nil, &apiError{errorUnavailable, errors.New("admin APIs disabled")}, nil, nil}
	}
	if err := r.ParseForm(); err != nil {
		return apiFuncResult{nil, &apiError{errorBadData, errors.Wrap(err, "error parsing form values")}, nil, nil}
	}
	if len(r.Form["match[]"]) == 0 {
		return apiFuncResult{nil, &apiError{errorBadData, errors.New("no match[] parameter provided")}, nil, nil}
	}

	start, err := parseTimeParam(r, "start", minTime)
	if err != nil {
		return invalidParamError(err, "start")
	}
	end, err := parseTimeParam(r, "end", maxTime)
	if err != nil {
		return invalidParamError(err, "end")
	}

	for _, s := range r.Form["match[]"] {
		matchers, err := parser.ParseMetricSelector(s)
		if err != nil {
			return invalidParamError(err, "match[]")
		}
		if err := api.db.Delete(timestamp.FromTime(start), timestamp.FromTime(end), matchers...); err != nil {
			return apiFuncResult{nil, &apiError{errorInternal, err}, nil, nil}
		}
	}

	return apiFuncResult{nil, nil, nil, nil}
}
```

# 本节重点总结 :

- 生命周期控制相关
  - reload 热更新配置
- pprof相关
  - prometheus pprof 查看火焰图
- 存储操作相关

