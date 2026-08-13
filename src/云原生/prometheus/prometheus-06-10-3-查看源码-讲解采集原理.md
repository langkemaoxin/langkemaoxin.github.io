---
title: 10.3 查看源码，讲解采集原理
sidebarGroup: Prometheus
shortTitle: 06 10.3 查看源码，讲解采集原理
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - redis-exporter源码解读 源码解读 初始化redis-exporter对象 - 代码位置 [path]'
---

> **Prometheus · 第 6 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- redis-exporter源码解读

# 源码解读
## 初始化redis-exporter对象
- 代码位置 D:\go_path\pkg\mod\github.com\oliver006\redis_exporter@v1.24.0\main.go
```go
exp, err := exporter.NewRedisExporter()
```

## NewRedisExporter中注册 /scrape handler

- 位置 D:\go_path\pkg\mod\github.com\oliver006\redis_exporter@v1.24.0\exporter\exporter.go
```go
e.mux.HandleFunc("/scrape", e.scrapeHandler)
```

## scrapeHandler 注册采集对象
- 位置 D:\go_path\pkg\mod\github.com\oliver006\redis_exporter@v1.24.0\exporter\http.go
- 解析target参数
- 创建RedisExporter
- 注册采集对象
```go
    target := r.URL.Query().Get("target")
	_, err = NewRedisExporter(target, opts)
	if err != nil {
		http.Error(w, "NewRedisExporter() err: err", http.StatusBadRequest)
		e.targetScrapeRequestErrors.Inc()
		return
	}

	promhttp.HandlerFor(
		registry, promhttp.HandlerOpts{ErrorHandling: promhttp.ContinueOnError},
```

## 执行采集
- 调用 RedisExporter绑定的Collect方法
- e.scrapeRedisHost(ch) 代表连接redis实例执行采集
```go
// Collect fetches new metrics from the RedisHost and updates the appropriate metrics.
func (e *Exporter) Collect(ch chan<- prometheus.Metric) {
	e.Lock()
	defer e.Unlock()
	e.totalScrapes.Inc()

	if e.redisAddr != "" {
		startTime := time.Now()
		var up float64
		if err := e.scrapeRedisHost(ch); err != nil {
			e.registerConstMetricGauge(ch, "exporter_last_scrape_error", 1.0, fmt.Sprintf("%s", err))
		} else {
			up = 1
			e.registerConstMetricGauge(ch, "exporter_last_scrape_error", 0, "")
		}

		e.registerConstMetricGauge(ch, "up", up)

		took := time.Since(startTime).Seconds()
		e.scrapeDuration.Observe(took)
		e.registerConstMetricGauge(ch, "exporter_last_scrape_duration_seconds", took)
	}

	ch <- e.totalScrapes
	ch <- e.scrapeDuration
	ch <- e.targetScrapeRequestErrors
}
```

## 最终的执行函数 scrapeRedisHost

-  连接redis获得 client对象c，对应的redis库 为 github.com/gomodule/redigo/redis
```go
c, err := e.connectToRedis()
```
- 调用封装好的 doRedisCmd函数执行redis 命令
```go
func doRedisCmd(c redis.Conn, cmd string, args ...interface{}) (interface{}, error) {
	log.Debugf("c.Do() - running command: %s %s", cmd, args)
	res, err := c.Do(cmd, args...)
	if err != nil {
		log.Debugf("c.Do() - err: %s", err)
	}
	log.Debugf("c.Do() - done")
	return res, err
}

```
- 执行redis命令 ，做结果转换，推送到ch中即可

# 本节重点总结 : 
- redis-exporter源码解读

