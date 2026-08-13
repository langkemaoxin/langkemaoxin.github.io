---
title: 27.5 go实战项目prome-shard的代码准备工作
sidebarGroup: Prometheus
shortTitle: 64 27.5 go实战项目prome-shard...
order: 64
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 定义每个分片的服务 - 编写配置文件 - 配置文件解析的工作 - 命令行参数解析、读取配置文件、设置logger - 初始化consul client 设计配置文件 定义每个分片...'
---

> **Prometheus · 第 64 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 定义每个分片的服务
- 编写配置文件
- 配置文件解析的工作
- 命令行参数解析、读取配置文件、设置logger
- 初始化consul client

# 设计配置文件

## 定义每个分片的服务

- name 代表这个服务的名字和在consul注册的服务的名字
- desc 是描述信息
- nodes 代表这个服务对应的prometheus节点列表
- port代表prometheus端口
- dest_sd_file_name代表 prometheus file_sd的json文件名字
- yaml_path 代表执行哪个ansible的playbook

```yaml
shard_service:
  - name:   scrape_prometheus_node_exporter
    desc: inf ecs 监控
    nodes:
      - 172.20.70.205
      - 172.20.70.215

    port: 9090
    dest_sd_file_name: file_sd_by_prome_shared.json
    yaml_path: ./copy_file_and_reload_prome.yaml

```

## consul服务信息

```yaml
consul_server:
  # consul api 地址
  addr: 172.20.70.205:8500
  username:
  password:

```

# 新建项目完成前期准备工作

## 新建go项目 prome-shard

- go mod init prome-shard

## 配置文件解析的工作

- 新建目录和文件 config/config.go
- 配置文件解析

```yaml
package config

import (
	"fmt"
	"io/ioutil"

	"gopkg.in/yaml.v2"
)

type Config struct {
	ShardService []*ShardService     `yaml:"shard_service"`
	ConsulServer *ConsulServerConfig `yaml:"consul_server"`
	RpcAddr      string              `yaml:"rpc_addr"`
	HttpAddr     string              `yaml:"http_addr"`
}

type ShardService struct {
	Name           string   `yaml:"name"`
	Desc           string   `yaml:"desc"`
	DestSdFileName string   `yaml:"dest_sd_file_name"`
	YamlPath       string   `yaml:"yaml_path"`
	Nodes          []string `yaml:"nodes"`
	Port           int      `yaml:"port"`
}
type ConsulServerConfig struct {
	Addr     string `yaml:"addr,omitempty"`
	Username string `yaml:"username,omitempty"`
	Password string `yaml:"password,omitempty"`
}

func Load(s string) (*Config, error) {
	cfg := &Config{}

	err := yaml.Unmarshal([]byte(s), cfg)

	if err != nil {
		return nil, err
	}

	return cfg, nil
}

func LoadFile(filename string) (*Config, error) {
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	cfg, err := Load(string(content))
	if err != nil {
		fmt.Printf("[parsing YAML file errr...][error:%v]", err)
		return nil, err
	}
	return cfg, nil
}

```

## 命令行参数解析、读取配置文件、设置logger

- main.go中

```go
package main

import (
	"fmt"
	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"
	"os"
	"path/filepath"
	"prome-shard/config"
	"time"
	//"github.com/oklog/run"
	"github.com/prometheus/common/promlog"
	promlogflag "github.com/prometheus/common/promlog/flag"
	"github.com/prometheus/common/version"
	"gopkg.in/alecthomas/kingpin.v2"
)

func main() {

	var (
		// 命令行参数
		app = kingpin.New(filepath.Base(os.Args[0]), "The prome-shard")
		// 指定配置文件
		configFile = app.Flag("config.file", "prome-shard configuration file path.").Default("prome-shard.yml").String()
	)
	promlogConfig := promlog.Config{}
	//
	app.Version(version.Print("prome-shard"))
	app.HelpFlag.Short('h')
	promlogflag.AddFlags(app, &promlogConfig)
	kingpin.MustParse(app.Parse(os.Args[1:]))

	// 设置logger
	var logger log.Logger
	logger = func(config *promlog.Config) log.Logger {
		var (
			l  log.Logger
			le level.Option
		)
		if config.Format.String() == "logfmt" {
			l = log.NewLogfmtLogger(log.NewSyncWriter(os.Stderr))
		} else {
			l = log.NewJSONLogger(log.NewSyncWriter(os.Stderr))
		}

		switch config.Level.String() {
		case "debug":
			le = level.AllowDebug()
		case "info":
			le = level.AllowInfo()
		case "warn":
			le = level.AllowWarn()
		case "error":
			le = level.AllowError()
		}
		l = level.NewFilter(l, le)
		l = log.With(l, "ts", log.TimestampFormat(
			func() time.Time { return time.Now().Local() },
			"2006-01-02T15:04:05.000Z07:00",
		), "caller", log.DefaultCaller)
		return l
	}(&promlogConfig)
	level.Debug(logger).Log("msg", "using_config_file", "filepath", *configFile)

	sConfig, err := config.LoadFile(*configFile)
	fmt.Println(sConfig.ShardService[0], err)
}

```

## 新建watch目录，完成consul的初始化

- 新建watch/consul.go ，把之前演示的consul代码copy过来

```go
package watch

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"
	consul "github.com/hashicorp/consul/api"
	"github.com/hashicorp/consul/api/watch"
)

type client struct {
	consul           *consul.Client
	consulServerAddr string

	logger log.Logger
}

func NewConsulClient(addr string, logger log.Logger) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{
		consul:           c,
		consulServerAddr: addr,
		logger:           logger,
	}, nil
}

// Register a service with consul local agent
func (c *client) ServiceRegister(srvName, srvHost string, srvPort int) error {

	reg := new(consul.AgentServiceRegistration)
	reg.Name = srvName

	thisId := fmt.Sprintf("%s_%d", srvHost, srvPort)
	reg.ID = thisId
	reg.Port = srvPort
	reg.Address = srvHost
	level.Info(c.logger).Log("msg", "ServiceRegisterStart", "id", thisId)
	//增加check
	check := new(consul.AgentServiceCheck)
	check.HTTP = fmt.Sprintf("http://%s:%d%s", reg.Address, reg.Port, "/-/healthy")
	//设置超时 5s。
	check.Timeout = "2s"
	//check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}

```

- main.go中初始化consul client

```go
	// init consul client
	client, err := cl.NewConsulClient(sConfig.ConsulServer.Addr, logger)

	if err != nil || client == nil {
		level.Error(logger).Log("msg", "NewConsulClient Error, exiting ...", "error", err)
		return
	}
```

# 本节重点总结 :

- 定义每个分片的服务
- 编写配置文件
- 配置文件解析的工作
- 命令行参数解析、读取配置文件、设置logger
- 初始化consul client

