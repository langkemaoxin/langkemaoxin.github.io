---
title: "3.7 热更新源码解读"
sidebarGroup: "Prometheus"
shortTitle: "86 3.7 热更新源码解读"
order: 86
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - prometheus 热更新源码解读 --web.enable-lifecycle代表开启热更新配置 - 修改配置文件 - 发http 请求 shell [root@k8s-no..."
---

> **Prometheus · 第 86 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- prometheus 热更新源码解读

## --web.enable-lifecycle代表开启热更新配置

- 修改配置文件
- 发http 请求

```shell
[root@k8s-node01 prometheus]# curl -X POST -vvv  localhost:9090/-/reload     
* About to connect() to localhost port 9090 (#0)
*   Trying 127.0.0.1...
* Connected to localhost (127.0.0.1) port 9090 (#0)
> POST /-/reload HTTP/1.1
> User-Agent: curl/7.29.0
> Host: localhost:9090
> Accept: */*
> 
< HTTP/1.1 200 OK
< Date: Fri, 13 Aug 2021 07:14:51 GMT
< Content-Length: 0
< 
* Connection #0 to host localhost left intact
```

- 观察配置文件已经重新加载过了

## 源码解读

- D:\go_path\src\github.com\prometheus\prometheus\cmd\prometheus\main.go

```go

	a.Flag("web.enable-lifecycle", "Enable shutdown and reload via HTTP request.").
		Default("false").BoolVar(&cfg.web.EnableLifecycle)
```

- main中 web.enable-lifecycle命令行参数被赋值给 cfg.web.EnableLifecycle
- 追踪这个 bool类型的字段 D:\go_path\src\github.com\prometheus\prometheus\web\web.go

```go
	if o.EnableLifecycle {
		router.Post("/-/quit", h.quit)
		router.Put("/-/quit", h.quit)
		router.Post("/-/reload", h.reload)
		router.Put("/-/reload", h.reload)
    }
```

- 说明开启这个参数后，web 路由中就开启了reload方法，这个和我们发送的 reload 请求一致
- 追踪这个http方法中的内容

```go
func (h *Handler) reload(w http.ResponseWriter, r *http.Request) {
	rc := make(chan error)
	h.reloadCh <- rc
	if err := <-rc; err != nil {
		http.Error(w, fmt.Sprintf("failed to reload config: %s", err), http.StatusInternalServerError)
	}
}
```

- 发现向 h.reloadCh 塞入一个chan
- 继续追踪发现  在main中有监听这个chan的方法

```go
 
					case rc := <-webHandler.Reload():
						if err := reloadConfig(cfg.configFile, cfg.enableExpandExternalLabels, cfg.tsdb.EnableExemplarStorage, logger, noStepSubqueryInterval, reloaders...); err != nil {
							level.Error(logger).Log("msg", "Error reloading config", "err", err)
							rc <- err
						} else {
							rc <- nil
						}
```

- 至此我们发现 server收到 reload命令后会执行这个reloadConfig函数

```go
	conf, err := config.LoadFile(filename, expandExternalLabels, logger)
	if err != nil {
		return errors.Wrapf(err, "couldn't load configuration (--config.file=%q)", filename)
	}

	if enableExemplarStorage {
		if conf.StorageConfig.ExemplarsConfig == nil {
			conf.StorageConfig.ExemplarsConfig = &config.DefaultExemplarsConfig
		}
	}

	failed := false
	for _, rl := range rls {
		rstart := time.Now()
		if err := rl.reloader(conf); err != nil {
			level.Error(logger).Log("msg", "Failed to apply configuration", "err", err)
			failed = true
		}
		timings = append(timings, rl.name, time.Since(rstart))
	}
```

- reloadConfig主要干两件事：

  - 先读取一下配置文件
  - 然后遍历reloader对象，执行他们的 reload方法即可
- reloaders切片的内容为 ，每个配置的小模块名和他们要执行的reload方法

```go

	reloaders := []reloader{
		{
			name:     "db_storage",
			reloader: localStorage.ApplyConfig,
		}, {
			name:     "remote_storage",
			reloader: remoteStorage.ApplyConfig,
		}, {
			name:     "web_handler",
			reloader: webHandler.ApplyConfig,
		}, {
			name: "query_engine",
			reloader: func(cfg *config.Config) error {
				if cfg.GlobalConfig.QueryLogFile == "" {
					queryEngine.SetQueryLogger(nil)
					return nil
				}

				l, err := logging.NewJSONFileLogger(cfg.GlobalConfig.QueryLogFile)
				if err != nil {
					return err
				}
				queryEngine.SetQueryLogger(l)
				return nil
			},
		}, {
			// The Scrape and notifier managers need to reload before the Discovery manager as
			// they need to read the most updated config when receiving the new targets list.
			name:     "scrape",
			reloader: scrapeManager.ApplyConfig,
```

- 那么我们刚才修改了采集段中的配置，那么调用的就是 scrapeManager.ApplyConfig

## scrapeManager.ApplyConfig这个函数 分析

- 主要 通过 对比 	scrapeConfigs map[string]*config.ScrapeConfig
- scrapePools   map[string]*scrapePool
- 的区别，如果 key在本次配置中 但不在上次的缓存中 scrapePools，那么删除
- 否则使用 reflect.DeepEqual对比job配置是否发生细微变化

```go
func (m *Manager) ApplyConfig(cfg *config.Config) error {
	m.mtxScrape.Lock()
	defer m.mtxScrape.Unlock()

	c := make(map[string]*config.ScrapeConfig)
	for _, scfg := range cfg.ScrapeConfigs {
		c[scfg.JobName] = scfg
	}
	m.scrapeConfigs = c

	if err := m.setJitterSeed(cfg.GlobalConfig.ExternalLabels); err != nil {
		return err
	}

	// Cleanup and reload pool if the configuration has changed.
	var failed bool
	for name, sp := range m.scrapePools {
		if cfg, ok := m.scrapeConfigs[name]; !ok {
			sp.stop()
			delete(m.scrapePools, name)
		} else if !reflect.DeepEqual(sp.config, cfg) {
			err := sp.reload(cfg)
			if err != nil {
				level.Error(m.logger).Log("msg", "error reloading scrape pool", "err", err, "scrape_pool", name)
				failed = true
			}
		}
	}

	if failed {
		return errors.New("failed to apply the new configuration")
	}
	return nil
```

# 本节重点总结 :

- 通过chan 传递热更新的动作
- main中执行相关的reload命令
- 对比这次 scrapeConfigs和上次 scrapePools的配置
- 进行增量更新
- reflect.DeepEqual对比结构体是否相同

