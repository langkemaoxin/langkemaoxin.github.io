---
title: 7.6 blackbox框架源码和http探测源码解读
sidebarGroup: Prometheus
shortTitle: 162 7.6 blackbox框架源码和http探...
order: 162
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - blackbox框架源码解读 - 根据模块找到探针 - 对目标执行探针方法 - http 探测代码 - 使用net/http/httptrace库进行trace - 钩子函数设置...'
---

> **Prometheus · 第 162 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- blackbox框架源码解读
  - 根据模块找到探针
  - 对目标执行探针方法
- http 探测代码
  - 使用net/http/httptrace库进行trace
  - 钩子函数设置时刻
  - time.sub计算时间差

# blackbox框架源码解读

## main中注册 /probe handler

```go
	http.HandleFunc(path.Join(*routePrefix, "/probe"), func(w http.ResponseWriter, r *http.Request) {
		sc.Lock()
		conf := sc.C
		sc.Unlock()
		probeHandler(w, r, conf, logger, rh)
	})
```

## probeHandler函数中 解析请求的module参数和target参数

- 获取 module参数

```go
moduleName := r.URL.Query().Get("module")
```

- 根据启动时配置文件中加载的模块找到对应的模块

```go
module, ok := c.Modules[moduleName]
```

- 解析请求的target参数

```go
target := params.Get("target")
```

- 根据解析得到的模块，找到对应的底层探针

```go
prober, ok := Probers[module.Prober]
```

- 执行对应的探针函数，这步是核心

```go
success := prober(ctx, target, module, registry, sl)
```

# http 探测代码解读

- 根据上面的解读我们，得知最核心的流程就是探针函数的执行

## http探针

- 代码位置 D:\go_path\pkg\mod\github.com\prometheus\blackbox_exporter@v0.19.0\prober\http.go 中的ProbeHTTP

### 源码解读

- 底层使用 net/http/httptrace库
- 在HTTP客户端请求的整个生命周期中收集细粒度信息的工具， 收集的信息可用于调试延迟问题，服务监控，编写自适应系统等。

```go
	trace := &httptrace.ClientTrace{
		DNSStart:             tt.DNSStart,
		DNSDone:              tt.DNSDone,
		ConnectStart:         tt.ConnectStart,
		ConnectDone:          tt.ConnectDone,
		GotConn:              tt.GotConn,
		GotFirstResponseByte: tt.GotFirstResponseByte,
		TLSHandshakeStart:    tt.TLSHandshakeStart,
		TLSHandshakeDone:     tt.TLSHandshakeDone,
	}
	request = request.WithContext(httptrace.WithClientTrace(request.Context(), trace))

```

- 这个库的用法就是可以在http各个阶段设置对应的钩子处理函数
- 同时设定很多时间点对象

```go
// roundTripTrace holds timings for a single HTTP roundtrip.
type roundTripTrace struct {
	tls           bool
	start         time.Time
	dnsDone       time.Time
	connectDone   time.Time
	gotConn       time.Time
	responseStart time.Time
	end           time.Time
	tlsStart      time.Time
	tlsDone       time.Time
}

```

- 那么在对应的事件触发时，trace调用实现设定好的钩子函数给相关的时间对象赋值，比如下面的dns解析结束的例子
- DNSDone发生时将dnsDone时间对象设置为当前时间

```go
func (t *transport) DNSDone(_ httptrace.DNSDoneInfo) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.current.dnsDone = time.Now()
}
```

- 最后进行各阶段统计耗时的计算，算时间差即可

```go
durationGaugeVec.WithLabelValues("resolve").Add(trace.dnsDone.Sub(trace.start).Seconds())
```

- 各阶段耗时统计
- ```shell
  ## http trace中对于http各个状态的描述
  - dns解析时间:              DNSDone-DNSStart
  - tls握手时间:              gotConn - DNSDone
  - tls connect连接时间:      connectDone - DNSDone
  - 非tls connect连接时间:    gotConn - DNSDone
  - processing 服务端处理时间: responseStart - gotConn
  - transfer 数据传输时间:     end - responseStart
  ```
- 类似的代码可以看下[httpstat](https://github.com/davecheney/httpstat/blob/master/screenshot.png)
- ```
  go get github.com/davecheney/httpstat
  ```

  ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511000000/4c7654dae3174ea99fbfc6ec3087b28a.png)

# 本节重点总结:

- blackbox框架源码解读
  - 根据模块找到探针
  - 对目标执行探针方法
- http 探测代码
  - 使用net/http/httptrace库进行trace
  - 钩子函数设置时刻
  - time.sub计算时间差

