---
title: "28.2 go实战项目dynamic-sharding的代码准备工作"
sidebarGroup: "Prometheus"
shortTitle: "70 28.2 go实战项目dynamic-sha..."
order: 70
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 编写配置文件 - 配置文件解析的工作 - 命令行参数解析、读取配置文件、设置logger - 初始化consul client - 注册服务 - 初始化哈希环 编写配置文件 ya..."
---

> **Prometheus · 第 70 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 编写配置文件
- 配置文件解析的工作
- 命令行参数解析、读取配置文件、设置logger
- 初始化consul client
- 注册服务
- 初始化哈希环

# 编写配置文件

```yaml
consul_server:
  # consul api 地址
  addr: localhost:8500
  username:
  password:
  # promethues中consul sd中pgw service name
  register_service_name: pushgateway
# 服务web addr
http_listen_addr: :9292
# pushgateway 信息
pushgateway:
  # 端口号
  port: 9091
  # pushgateway ip列表
  servers:
    - 1.1.1.1
    - 1.1.1.2

```

## 解析配置文件

- 新建目录和文件 config/config.go

```go
package config

import (
	"io/ioutil"

	"gopkg.in/yaml.v2"
	"github.com/go-kit/kit/log/level"
	"github.com/go-kit/kit/log"
)

type Config struct {
	ConsulServer   *ConsulServerConfig `yaml:"consul_server"`
	HttpListenAddr string              `yaml:"http_listen_addr"`
	PGW            *PushGateWayConfig  `yaml:"pushgateway"`
}

type ConsulServerConfig struct {
	Addr                string `yaml:"addr,omitempty"`
	Username            string `yaml:"username,omitempty"`
	Password            string `yaml:"password,omitempty"`
	RegisterServiceName string `yaml:"register_service_name,omitempty"`
}

type PushGateWayConfig struct {
	Servers []string `yaml:"servers"`
	Port    int      `yaml:"port"`
}

func Load(s string) (*Config, error) {
	cfg := &Config{}

	err := yaml.UnmarshalStrict([]byte(s), cfg)
	if err != nil {
		return nil, err
	}
	return cfg, nil
}

func LoadFile(filename string, logger log.Logger) (*Config, error) {
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	cfg, err := Load(string(content))
	if err != nil {
		level.Error(logger).Log("msg", "parsing YAML file errr...", "error", err)
	}

	return cfg, nil
}

```

# 命令行参数解析、读取配置文件、设置logger

## main.go中

```go
package main

import (
	"dynamic-sharding/config"
	"fmt"
	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"
	"github.com/prometheus/common/promlog"
	promlogflag "github.com/prometheus/common/promlog/flag"
	"github.com/prometheus/common/version"
	"gopkg.in/alecthomas/kingpin.v2"
	"os"
	"path/filepath"
	"time"
)

func main() {

	var (
		app = kingpin.New(filepath.Base(os.Args[0]), "The dynamic-sharding")
		//configFile = kingpin.Flag("config.file", "docker-mon configuration file path.").Default("docker-mon.yml").String()
		configFile = app.Flag("config.file", "docker-mon configuration file path.").Default("dynamic-sharding.yml").String()
	)
	promlogConfig := promlog.Config{}

	app.Version(version.Print("dynamic-sharding"))
	app.HelpFlag.Short('h')
	promlogflag.AddFlags(app, &promlogConfig)
	kingpin.MustParse(app.Parse(os.Args[1:]))

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

	// new grpc manager
	//ctxAll, cancelAll := context.WithCancel(context.Background())
	sc, err := config.LoadFile(*configFile, logger)
	if err != nil {
		level.Error(logger).Log("msg", "config.LoadFil Error, exiting ...", "error", err)
		return
	}
	fmt.Println(sc.ConsulServer.Addr)
	fmt.Println(sc.PGW.Servers)
}

```

# 初始化consul

- 位置 sd/sd.go
- 代码

```go
package sd

import (
	"fmt"
	"context"
	"strings"

	consul "github.com/hashicorp/consul/api"
	"github.com/hashicorp/consul/api/watch"
	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"
)

type client struct {
	consul *consul.Client
	logger log.Logger
}

type Client interface {
	// Get a Service from consul
	//GetService(string, string) ([]string, error)
	// register a service with local agent
	ServiceRegister(string, string, int) error
	// Deregister a service with local agent
	DeRegister(string) error
}

func NewConsulClient(addr string, logger log.Logger) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{consul: c, logger: logger}, nil
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
	check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}
```

## main中初始化

```go
	// init consul client
	client, err := sd.NewConsulClient(sc.ConsulServer.Addr, logger)

	if err != nil || client == nil {
		level.Error(logger).Log("msg", "NewConsulClient Error, exiting ...", "error", err)
		return
	}

```

# 初始化pgw用的哈希环

- D:\go_path\src\github.com\ning1875\dynamic-sharding\pkg\sd\rings.go

```go
package sd

import (
	"sync"
	"sort"
	"context"
	"strings"

	"github.com/go-kit/kit/log"
	"github.com/go-kit/kit/log/level"

	"dynamic-sharding/pkg/consistent"
)

const numberOfReplicas = 500

var (
	PgwNodeRing    *ConsistentHashNodeRing
	NodeUpdateChan = make(chan []string, 1)
)

// 一致性哈希环,用于管理服务器节点.
type ConsistentHashNodeRing struct {
	ring *consistent.Consistent
	sync.RWMutex
}

func NewConsistentHashNodesRing(nodes []string) *ConsistentHashNodeRing {
	ret := &ConsistentHashNodeRing{ring: consistent.New()}

	ret.SetNumberOfReplicas(numberOfReplicas)
	ret.SetNodes(nodes)
	PgwNodeRing = ret
	return ret
}

func (this *ConsistentHashNodeRing) ReShardRing(nodes []string) {
	this.Lock()
	defer this.Unlock()
	newRing := consistent.New()
	newRing.NumberOfReplicas = numberOfReplicas
	for _, node := range nodes {
		newRing.Add(node)
	}
	this.ring = newRing
}

// 根据pk,获取node节点. chash(pk) -> node
func (this *ConsistentHashNodeRing) GetNode(pk string) (string, error) {
	this.RLock()
	defer this.RUnlock()

	return this.ring.Get(pk)
}

func (this *ConsistentHashNodeRing) SetNodes(nodes []string) {
	for _, node := range nodes {
		this.ring.Add(node)
	}
}

func (this *ConsistentHashNodeRing) SetNumberOfReplicas(num int32) {
	this.ring.NumberOfReplicas = int(num)
}
```

- 新建 consistent/consistent.go

```go
// Copyright (C) 2012 Numerotron Inc.
// Use of this source code is governed by an MIT-style license
// that can be found in the LICENSE file.

// Package consistent provides a consistent hashing function.
//
// Consistent hashing is often used to distribute requests to a changing set of servers.  For example,
// say you have some cache servers cacheA, cacheB, and cacheC.  You want to decide which cache server
// to use to look up information on a user.
//
// You could use a typical hash table and hash the user id
// to one of cacheA, cacheB, or cacheC.  But with a typical hash table, if you add or remove a server,
// almost all keys will get remapped to different results, which basically could bring your service
// to a grinding halt while the caches get rebuilt.
//
// With a consistent hash, adding or removing a server drastically reduces the number of keys that
// get remapped.
//
// Read more about consistent hashing on wikipedia:  http://en.wikipedia.org/wiki/Consistent_hashing
//
package consistent

import (
	"errors"
	"sort"
	"strconv"
	"sync"

	"github.com/spaolacci/murmur3"
)

type uints []uint32

// Len returns the length of the uints array.
func (x uints) Len() int { return len(x) }

// Less returns true if element i is less than element j.
func (x uints) Less(i, j int) bool { return x[i] < x[j] }

// Swap exchanges elements i and j.
func (x uints) Swap(i, j int) { x[i], x[j] = x[j], x[i] }

// ErrEmptyCircle is the error returned when trying to get an element when nothing has been added to hash.
var ErrEmptyCircle = errors.New("empty circle")

// Consistent holds the information about the members of the consistent hash circle.
type Consistent struct {
	circle           map[uint32]string
	members          map[string]bool
	sortedHashes     uints
	NumberOfReplicas int
	count            int64
	scratch          [64]byte
	sync.RWMutex
}

// New creates a new Consistent object with a default setting of 20 replicas for each entry.
//
// To change the number of replicas, set NumberOfReplicas before adding entries.
func New() *Consistent {
	c := new(Consistent)
	c.NumberOfReplicas = 20
	c.circle = make(map[uint32]string)
	c.members = make(map[string]bool)
	return c
}

// eltKey generates a string key for an element with an index.
func (c *Consistent) eltKey(elt string, idx int) string {
	// return elt + "|" + strconv.Itoa(idx)
	return strconv.Itoa(idx) + elt
}

// Add inserts a string element in the consistent hash.
func (c *Consistent) Add(elt string) {
	c.Lock()
	defer c.Unlock()
	c.add(elt)
}

// need c.Lock() before calling
func (c *Consistent) add(elt string) {
	for i := 0; i < c.NumberOfReplicas; i++ {
		c.circle[c.hashKey(c.eltKey(elt, i))] = elt
	}
	c.members[elt] = true
	c.updateSortedHashes()
	c.count++
}

// Remove removes an element from the hash.
func (c *Consistent) Remove(elt string) {
	c.Lock()
	defer c.Unlock()
	c.remove(elt)
}

// need c.Lock() before calling
func (c *Consistent) remove(elt string) {
	for i := 0; i < c.NumberOfReplicas; i++ {
		delete(c.circle, c.hashKey(c.eltKey(elt, i)))
	}
	delete(c.members, elt)
	c.updateSortedHashes()
	c.count--
}

// Set sets all the elements in the hash.  If there are existing elements not
// present in elts, they will be removed.
func (c *Consistent) Set(elts []string) {
	c.Lock()
	defer c.Unlock()
	for k := range c.members {
		found := false
		for _, v := range elts {
			if k == v {
				found = true
				break
			}
		}
		if !found {
			c.remove(k)
		}
	}
	for _, v := range elts {
		_, exists := c.members[v]
		if exists {
			continue
		}
		c.add(v)
	}
}

func (c *Consistent) Members() []string {
	c.RLock()
	defer c.RUnlock()
	var m []string
	for k := range c.members {
		m = append(m, k)
	}
	return m
}

// Get returns an element close to where name hashes to in the circle.
func (c *Consistent) Get(name string) (string, error) {
	c.RLock()
	defer c.RUnlock()
	if len(c.circle) == 0 {
		return "", ErrEmptyCircle
	}
	key := c.hashKey(name)
	i := c.search(key)
	return c.circle[c.sortedHashes[i]], nil
}

func (c *Consistent) search(key uint32) (i int) {
	f := func(x int) bool {
		return c.sortedHashes[x] > key
	}
	i = sort.Search(len(c.sortedHashes), f)
	if i >= len(c.sortedHashes) {
		i = 0
	}
	return
}

// GetTwo returns the two closest distinct elements to the name input in the circle.
func (c *Consistent) GetTwo(name string) (string, string, error) {
	c.RLock()
	defer c.RUnlock()
	if len(c.circle) == 0 {
		return "", "", ErrEmptyCircle
	}
	key := c.hashKey(name)
	i := c.search(key)
	a := c.circle[c.sortedHashes[i]]

	if c.count == 1 {
		return a, "", nil
	}

	start := i
	var b string
	for i = start + 1; i != start; i++ {
		if i >= len(c.sortedHashes) {
			i = 0
		}
		b = c.circle[c.sortedHashes[i]]
		if b != a {
			break
		}
	}
	return a, b, nil
}

// GetN returns the N closest distinct elements to the name input in the circle.
func (c *Consistent) GetN(name string, n int) ([]string, error) {
	c.RLock()
	defer c.RUnlock()

	if len(c.circle) == 0 {
		return nil, ErrEmptyCircle
	}

	if c.count < int64(n) {
		n = int(c.count)
	}

	var (
		key   = c.hashKey(name)
		i     = c.search(key)
		start = i
		res   = make([]string, 0, n)
		elem  = c.circle[c.sortedHashes[i]]
	)

	res = append(res, elem)

	if len(res) == n {
		return res, nil
	}

	for i = start + 1; i != start; i++ {
		if i >= len(c.sortedHashes) {
			i = 0
		}
		elem = c.circle[c.sortedHashes[i]]
		if !sliceContainsMember(res, elem) {
			res = append(res, elem)
		}
		if len(res) == n {
			break
		}
	}

	return res, nil
}

func (c *Consistent) hashKey(key string) uint32 {
	if len(key) < 64 {
		var scratch [64]byte
		copy(scratch[:], key)
		//return crc32.ChecksumIEEE(scratch[:len(key)])
		return murmur3.Sum32(scratch[:len(key)])
	}
	//return crc32.ChecksumIEEE([]byte(key))
	return murmur3.Sum32([]byte(key))
}

func (c *Consistent) updateSortedHashes() {
	hashes := c.sortedHashes[:0]
	//reallocate if we're holding on to too much (1/4th)
	if cap(c.sortedHashes)/(c.NumberOfReplicas*4) > len(c.circle) {
		hashes = nil
	}
	for k := range c.circle {
		hashes = append(hashes, k)
	}
	sort.Sort(hashes)
	c.sortedHashes = hashes
}

func sliceContainsMember(set []string, member string) bool {
	for _, m := range set {
		if m == member {
			return true
		}
	}
	return false
}

```

# consul注册pgw服务

- D:\go_path\src\github.com\ning1875\dynamic-sharding\pkg\sd\sd.go

```go

func RegisterFromFile(c *client, servers []string, srvName string, srvPort int) (errors []error) {

	for _, addr := range servers {

		e := c.ServiceRegister(srvName, addr, srvPort)
		if e != nil {
			errors = append(errors, e)
		}

	}
	return
}

```

## main中调用

```go
	// register service
	errors := sd.RegisterFromFile(client, sc.PGW.Servers, sc.ConsulServer.RegisterServiceName, sc.PGW.Port)
	if len(errors) > 0 {
		level.Error(logger).Log("msg", "RegisterFromFile Error", "error", errors)
	}
```

# 初始化一致性哈希环

- main.go中

```go
	// init node hash ring
	var ss []string
	for _, i := range sc.PGW.Servers {
		ss = append(ss, fmt.Sprintf("%s:%d", i, sc.PGW.Port))
	}

	sd.NewConsistentHashNodesRing(ss)
```

# 本节重点总结 :

- 编写配置文件
- 配置文件解析的工作
- 命令行参数解析、读取配置文件、设置logger
- 初始化consul client
- 注册服务
- 初始化哈希环

