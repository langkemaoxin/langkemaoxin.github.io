---
title: 33.5 remote实战项目之设计prometheus数据源的结构
sidebarGroup: Prometheus
shortTitle: 101 33.5 remote实战项目之设计prom...
order: 101
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 项目要求 - 通过remote read读取prometheus中的数据 - 通过remote write向prometheus中写入数据 - 准备工作 - 新建项目 prome...'
---

> **Prometheus · 第 101 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 项目要求
  - 通过remote read读取prometheus中的数据
  - 通过remote write向prometheus中写入数据
- 准备工作
  - 新建项目 prome_remote_read_write
  - 设计prometheus 数据源的结构
  - 初始化

# 项目要求

- 通过remote read读取prometheus中的数据
- 通过remote write向prometheus中写入数据

# 准备工作

## 新建项目 prome_remote_read_write

```shell
go mod init prome_remote_read_write
```

## 准备配置文件 prome_remote_read_write.yml

- remoteWrite代表 支持remote_write的多个后端
- remoteRead代表 支持remote_read的多个后端

```yaml
remoteWrite:
  # m3db的配置
  #- name: m3db01
  #  url: http://localhost:7201/api/v1/prom/remote/write
  #  remoteTimeoutSecond: 5

  # prometheus的配置
  - name: prome01
    url: http://172.20.70.205:9090/api/v1/write
    remoteTimeoutSecond: 5
remoteRead:
  - name: prome01
    url: http://172.20.70.205:9090/api/v1/read
    remoteTimeoutSecond: 5
```

## 配置文件解析

- config/config.go

```go
package config

import (
	"github.com/toolkits/pkg/logger"
	"gopkg.in/yaml.v2"
	"io/ioutil"
)

type RemoteConfig struct {
	Name                string `yaml:"name"`
	Url                 string `yaml:"url"`
	RemoteTimeoutSecond int    `yaml:"remoteTimeoutSecond"`
}

type PromeSection struct {
	RemoteWrite []RemoteConfig `yaml:"remoteWrite"`
	RemoteRead  []RemoteConfig `yaml:"remoteRead"`
}

func Load(s string) (*PromeSection, error) {
	cfg := &PromeSection{}

	err := yaml.Unmarshal([]byte(s), cfg)

	if err != nil {
		return nil, err
	}
	return cfg, nil
}

func LoadFile(filename string) (*PromeSection, error) {
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	cfg, err := Load(string(content))
	if err != nil {
		logger.Errorf("[parsing YAML file errr...][error:%v]", err)
		return nil, err
	}
	return cfg, nil
}

```

### main.go中解析配置

```go
package main

import (
	"flag"
	"github.com/toolkits/pkg/logger"
	"math/rand"
	"prome_remote_read_write/config"
	"prome_remote_read_write/datasource"
	"time"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	configFile := flag.String("config", "prome_remote_read_write.yml",
		"Address on which to expose metrics and web interface.")
	flag.Parse()

	sConfig, err := config.LoadFile(*configFile)
	if err != nil {
		logger.Infof("config.LoadFile Error,Exiting ...error:%v", err)
		return
	}
}
```

# 设计prometheus 数据源的结构

- 位置 datasource/prome.go

```go
package datasource

import (
	"github.com/go-kit/kit/log"
	"github.com/prometheus/client_golang/prometheus"
	config_util "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promlog"
	pc "github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/prompb"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
	"github.com/toolkits/pkg/logger"
	"go.uber.org/atomic"
	"io/ioutil"
	"net/http"
	"net/url"
	"prome_remote_read_write/config"
	"time"
)

type PromeDataSource struct {
	Section      *config.PromeSection            //配置
	PushQueue    chan []prompb.TimeSeries        // 数据推送的chan
	LocalTmpDir  string                          // 本地临时目录，存放queries.active文件
	Queryable    storage.SampleAndChunkQueryable // 除了promql的查询，需要后端存储，如查询series
	QueryEngine  *promql.Engine                  // promql相关查询
	WriteTargets []*HttpClient                   // remote_write写入的后端地址
}

type HttpClient struct {
	remoteName string // Used to differentiate clients in metrics.
	url        *url.URL
	Client     *http.Client
	timeout    time.Duration
}

```

## new函数

- 根据传入的配置new

```go
func NewPromeDataSource(cg *config.PromeSection) *PromeDataSource {
	pd := &PromeDataSource{
		Section:   cg,
		PushQueue: make(chan []prompb.TimeSeries, 10000),
	}
	return pd
}
```

## Init初始化函数

- 完整代码如下

```go

type safePromQLNoStepSubqueryInterval struct {
	value atomic.Int64
}

func durationToInt64Millis(d time.Duration) int64 {
	return int64(d / time.Millisecond)
}
func (i *safePromQLNoStepSubqueryInterval) Set(ev model.Duration) {
	i.value.Store(durationToInt64Millis(time.Duration(ev)))
}
func (i *safePromQLNoStepSubqueryInterval) Get(int64) int64 {
	return i.value.Load()
}

func NewPromeDataSource(cg *config.PromeSection) *PromeDataSource {
	pd := &PromeDataSource{
		Section:   cg,
		PushQueue: make(chan []prompb.TimeSeries, 10000),
	}
	return pd
}

func (pd *PromeDataSource) Init() {
	// 模拟创建本地存储目录
	dbDir, err := ioutil.TempDir("", "tsdb-api-ready")
	if err != nil {
		logger.Errorf("[error_create_local_tsdb_dir][err: %v]", err)
		return
	}
	pd.LocalTmpDir = dbDir
	promlogConfig := promlog.Config{}
	// 使用本地目录创建remote-storage
	remoteS := remote.NewStorage(promlog.New(&promlogConfig), prometheus.DefaultRegisterer, func() (int64, error) {
		return 0, nil
	}, dbDir, 1*time.Minute, nil)

	// ApplyConfig 加载queryables
	remoteReadC := make([]*pc.RemoteReadConfig, 0)
	for _, u := range pd.Section.RemoteRead {

		ur, err := url.Parse(u.Url)
		if err != nil {
			logger.Errorf("[prome_ds_init_error][parse_url_error][url:%+v][err:%+v]", u.Url, err)
			continue
		}

		remoteReadC = append(remoteReadC,
			&pc.RemoteReadConfig{
				URL:           &config_util.URL{URL: ur},
				RemoteTimeout: model.Duration(time.Duration(u.RemoteTimeoutSecond) * time.Second),
				ReadRecent:    true,
			},
		)
	}
	if len(remoteReadC) == 0 {
		logger.Errorf("[prome_ds_error_got_zero_remote_read_storage]")
		return
	}
	err = remoteS.ApplyConfig(&pc.Config{RemoteReadConfigs: remoteReadC})
	if err != nil {
		logger.Errorf("[error_load_remote_read_config][err: %v]", err)
		return
	}
	pLogger := log.NewNopLogger()

	noStepSubqueryInterval := &safePromQLNoStepSubqueryInterval{}

	queryQueueDir, err := ioutil.TempDir(dbDir, "prom_query_concurrency")
	opts := promql.EngineOpts{
		Logger:                   log.With(pLogger, "component", "query engine"),
		Reg:                      prometheus.DefaultRegisterer,
		MaxSamples:               50000000,
		Timeout:                  30 * time.Second,
		ActiveQueryTracker:       promql.NewActiveQueryTracker(queryQueueDir, 20, log.With(pLogger, "component", "activeQueryTracker")),
		LookbackDelta:            5 * time.Minute,
		NoStepSubqueryIntervalFn: noStepSubqueryInterval.Get,
		EnableAtModifier:         true,
	}

	queryEngine := promql.NewEngine(opts)
	pd.QueryEngine = queryEngine
	pd.Queryable = remoteS

	// 初始化writeClients
	if len(pd.Section.RemoteWrite) == 0 {
		logger.Warningf("[prome_ds_init_with_zero_RemoteWrite_target]")
		logger.Infof("[successfully_init_prometheus_datasource][remote_read_num:%+v][remote_write_num:%+v]",
			len(pd.Section.RemoteRead),
			len(pd.Section.RemoteWrite),
		)
		return
	}
	writeTs := make([]*HttpClient, 0)
	for _, u := range pd.Section.RemoteWrite {
		ur, err := url.Parse(u.Url)
		if err != nil {
			logger.Errorf("[prome_ds_init_error][parse_url_error][url:%+v][err:%+v]", u.Url, err)
			continue
		}
		writeTs = append(writeTs,
			&HttpClient{
				remoteName: u.Name,
				url:        ur,
				Client:     &http.Client{},
				timeout:    time.Duration(u.RemoteTimeoutSecond) * time.Second,
			})
	}
	pd.WriteTargets = writeTs
	// 开启prometheus 队列消费协程
	go pd.remoteWrite()
	logger.Infof("[successfully_init_prometheus_datasource][remote_read_num:%+v][remote_write_num:%+v]",
		len(remoteReadC),
		len(writeTs),
	)
}

```

### 创建本地存储目录和remote-storage

- 模拟创建本地存储目录

```go
	// 模拟创建本地存储目录
	dbDir, err := ioutil.TempDir("", "tsdb-api-ready")
	if err != nil {
		logger.Errorf("[error_create_local_tsdb_dir][err: %v]", err)
		return
	}
	pd.LocalTmpDir = dbDir
```

- 使用本地目录创建remote-storage

```go
	// 使用本地目录创建remote-storage
	remoteS := remote.NewStorage(promlog.New(&promlogConfig), prometheus.DefaultRegisterer, func() (int64, error) {
		return 0, nil
	}, dbDir, 1*time.Minute, nil)
```

### 创建remote_read对象

- 遍历配置中的remote_read，构造RemoteReadConfig
- 使用RemoteReadConfig.ApplyConfig 生效配置

```go
	// ApplyConfig 加载queryables
	remoteReadC := make([]*pc.RemoteReadConfig, 0)
	for _, u := range pd.Section.RemoteRead {

		ur, err := url.Parse(u.Url)
		if err != nil {
			logger.Errorf("[prome_ds_init_error][parse_url_error][url:%+v][err:%+v]", u.Url, err)
			continue
		}

		remoteReadC = append(remoteReadC,
			&pc.RemoteReadConfig{
				URL:           &config_util.URL{URL: ur},
				RemoteTimeout: model.Duration(time.Duration(u.RemoteTimeoutSecond) * time.Second),
				ReadRecent:    true,
			},
		)
	}
	if len(remoteReadC) == 0 {
		logger.Errorf("[prome_ds_error_got_zero_remote_read_storage]")
		return
	}
	err = remoteS.ApplyConfig(&pc.Config{RemoteReadConfigs: remoteReadC})
	if err != nil {
		logger.Errorf("[error_load_remote_read_config][err: %v]", err)
		return
	}
```

### 创建QueryEngine并赋值

```go
	noStepSubqueryInterval := &safePromQLNoStepSubqueryInterval{}

	queryQueueDir, err := ioutil.TempDir(dbDir, "prom_query_concurrency")
	opts := promql.EngineOpts{
		Logger:                   log.With(pLogger, "component", "query engine"),
		Reg:                      prometheus.DefaultRegisterer,
		MaxSamples:               50000000,
		Timeout:                  30 * time.Second,
		ActiveQueryTracker:       promql.NewActiveQueryTracker(queryQueueDir, 20, log.With(pLogger, "component", "activeQueryTracker")),
		LookbackDelta:            5 * time.Minute,
		NoStepSubqueryIntervalFn: noStepSubqueryInterval.Get,
		EnableAtModifier:         true,
	}

	queryEngine := promql.NewEngine(opts)
	pd.QueryEngine = queryEngine
	pd.Queryable = remoteS
```

### 初始化writeClients创建RemoteWrite对象

- 遍历RemoteWrite配置创建
- 开启prometheus 队列消费协程

```go
	// 初始化writeClients
	if len(pd.Section.RemoteWrite) == 0 {
		logger.Warningf("[prome_ds_init_with_zero_RemoteWrite_target]")
		logger.Infof("[successfully_init_prometheus_datasource][remote_read_num:%+v][remote_write_num:%+v]",
			len(pd.Section.RemoteRead),
			len(pd.Section.RemoteWrite),
		)
		return
	}
	writeTs := make([]*HttpClient, 0)
	for _, u := range pd.Section.RemoteWrite {
		ur, err := url.Parse(u.Url)
		if err != nil {
			logger.Errorf("[prome_ds_init_error][parse_url_error][url:%+v][err:%+v]", u.Url, err)
			continue
		}
		writeTs = append(writeTs,
			&HttpClient{
				remoteName: u.Name,
				url:        ur,
				Client:     &http.Client{},
				timeout:    time.Duration(u.RemoteTimeoutSecond) * time.Second,
			})
	}
	pd.WriteTargets = writeTs
	// 开启prometheus 队列消费协程
	go pd.remoteWrite()
	logger.Infof("[successfully_init_prometheus_datasource][remote_read_num:%+v][remote_write_num:%+v]",
		len(remoteReadC),
		len(writeTs),
	)
```

# 本节重点总结 :

- 项目要求
  - 通过remote read读取prometheus中的数据
  - 通过remote write向prometheus中写入数据
- 准备工作
  - 新建项目 prome_remote_read_write
  - 设计prometheus 数据源的结构
  - 初始化

