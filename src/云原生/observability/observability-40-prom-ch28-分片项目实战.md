---
title: Prometheus 第28章：分片项目实战
sidebarGroup: 可观测性
shortTitle: 40 分片项目实战
order: 40
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第28章（分片项目实战）合并笔记
---

> **Prometheus · 第 28 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 28.1 pushgateway单点问题和动态分片方案介绍

# 本节重点介绍 :

- pushgateway单点问题现象和原因
- 静态分片的弊端
- 动态分片方案介绍

# pgw单点问题

## pgw是什么

- [项目介绍](https://github.com/prometheus/pushgateway)

## pgw打点特点

- 没有使用grouping对应的接口uri为

```
http://pushgateway_addr/metrics/job/<JOB_NAME>
```

- 使用grouping对应的接口uri为

```
http://pushgateway_addr/metrics/job/<JOB_NAME>/<LABEL_NAME>/<LABEL_VALUE>
```

- put/post方法区别在于 put只替换metrics和job相同的 post替换label全部相同的

## pgw单点问题

## 如果简单把pgw挂在lb后面的问题

- lb后面rr轮询:如果不加控制的让push数据随机打到多个pushgateway实例上,prometheus无差别scrape会导致数据错乱,表现如下
- ![pgw_err.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112309000/91ed0e10cdab438bbec9b966f4ee4479.png)
- 根本原因是在t1时刻 指标的值为10 t2时刻 值为20
- t1时刻轮询打点到了pgw-a上 t2时刻打点到了pgw-b上
- 而promethues采集的时候两边全都采集导致本应该一直上升的值呈锯齿状

## 如果对uri做静态一致性哈希+prome静态配置pgw

- 假设有3个pgw,前面lb根据request_uri做一致性哈希
- promethues scrape时静态配置3个pgw实例

```
  - job_name: pushgateway
    honor_labels: true
    honor_timestamps: true
    scrape_interval: 5s
    scrape_timeout: 4s
    metrics_path: /metrics
    scheme: http
    static_configs:
    - targets:
      - pgw-a:9091
      - pgw-b:9091

```

- 结果是可以做到哈希分流,但无法解决某个pgw实例挂掉,哈希到这个实例上面的请求失败问题

## 解决方案是: 动态一致性哈希分流+consul service_check

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112309000/096bd32ad0f54125a28e2f1e1b9298ab.png)

- dynamic-sharding服务启动会根据配置文件注册pgw服务到consul中
- 由consul定时对pgw server做http check
- push请求会根据请求path做一致性哈希分离,eg:

```
# 仅job不同
- http://pushgateway_addr/metrics/job/job_a
- http://pushgateway_addr/metrics/job/job_b
- http://pushgateway_addr/metrics/job/job_c
# label不同
- http://pushgateway_addr/metrics/job/job_a/tag_a/value_a
- http://pushgateway_addr/metrics/job/job_a/tag_a/value_b
```

- 当多个pgw中实例oom或异常重启,consul check service会将bad实例标记为down
- dynamic-sharding轮询检查实例数量变化
- 重新生成哈希环,rehash将job分流
- 同时promethues使用consul服务发现的pgw实例列表,无需手动变更
- dynamic-sharding本身无状态,可启动多个实例作为流量接入层和pgw server之间
- 采用redirect而不处理请求,简单高效
- 扩容时同时也需要重启所有存量pgw服务

# 本节重点总结 :

- pushgateway单点问题现象和原因
- 静态分片的弊端
- 动态分片方案介绍

## 28.2 go实战项目dynamic-sharding的代码准备工作

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

## 28.3 一致性哈希和推送数据的redirect流程

# 本节重点介绍 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- 开启结果监听和watch服务
- 编写pgw的http接收端
  - 推送数据的redirect流程

一致性哈希和推送数据的redirect流程

# 开启一致性哈希环变更监听处理

- 位置 sd/rings.go
- 当这个服务的节点变更了(节点宕机、扩容)
- 通过consul的watch操作会通知到这里，也就是  this.NodeUpdateChan会有数据
- 这时需要从 哈希环中获取节点信息`oldNodes := this.ring.Members()`，然后两边对对比
- 如果节点不同则，更新哈希环`this.ReShardRing(nodes)`

```go
func RunReshardHashRing(ctx context.Context, logger log.Logger) {

	level.Info(logger).Log("msg", "RunRefreshServiceNode start....")
	for {
		select {
		case nodes := <-NodeUpdateChan:

			oldNodes := PgwNodeRing.ring.Members()
			sort.Strings(nodes)
			sort.Strings(oldNodes)
			isEq := StringSliceEqualBCE(nodes, oldNodes)
			if isEq == false {
				level.Info(logger).Log("msg", "RunReshardHashRing_node_update_reshard", "old_num", len(oldNodes), "new_num", len(nodes), "oldnodes", strings.Join(oldNodes, ","), "newnodes", strings.Join(nodes, ","), )
				PgwNodeRing.ReShardRing(nodes)
			} else {
				level.Info(logger).Log("msg", "RunReshardHashRing_node_same", "nodes", strings.Join(nodes, ","))

			}
		case <-ctx.Done():
			level.Info(logger).Log("msg", "RunReshardHashRingQuit")
			return
		}

	}
}

```

## 两个string切片比较 的函数

```go
    func StringSliceEqualBCE(a, b []string) bool {
    if len(a) != len(b) {
        return false
    }
  
    if (a == nil) != (b == nil) {
        return false
    }
  
    b = b[:len(a)]
    for i, v := range a {
        if v != b[i] {
            return false
        }
    }
  
    return true
    }
```

# 开启结果监听和watch服务

- sd/sd.go RunRefreshServiceNode函数中
- 开启Reshard任务，并启动watch

```go
func (c *client) RunRefreshServiceNode(ctx context.Context, srvName string, consulServerAddr string) error {
	level.Info(c.logger).Log("msg", "RunRefreshServiceNode start....")
	go RunReshardHashRing(ctx, c.logger)

	errchan := make(chan error, 1)
	go func() {
		errchan <- c.WatchService(ctx, srvName, consulServerAddr)

	}()
	select {
	case <-ctx.Done():
		level.Info(c.logger).Log("msg", "RunRefreshServiceNode_receive_quit_signal_and_quit")
		return nil
	case err := <-errchan:
		level.Error(c.logger).Log("msg", "WatchService_get_error", "err", err)
		return err
	}
	return nil
}
```

## 启动watch

- sd/sd.go
- 如果节点变化了就通过NodeUpdateChan通知 RunReshardHashRing

```go
func (c *client) WatchService(ctx context.Context, srvName string, consulServerAddr string) error {

	watchConfig := make(map[string]interface{})

	watchConfig["type"] = "service"
	watchConfig["service"] = srvName
	watchConfig["handler_type"] = "script"
	watchConfig["passingonly"] = true
	watchPlan, err := watch.Parse(watchConfig)
	if err != nil {
		level.Error(c.logger).Log("msg", "create_Watch_by_watch_config_error", "srv_name", srvName, "error", err)
		return err

	}

	watchPlan.Handler = func(lastIndex uint64, result interface{}) {
		if entries, ok := result.([]*consul.ServiceEntry); ok {
			var hs []string

			for _, a := range entries {

				hs = append(hs, fmt.Sprintf("%s:%d", a.Service.Address, a.Service.Port))
			}
			if len(hs) > 0 {
				level.Info(c.logger).Log("msg", "service_node_change_by_healthy_check", "srv_name", srvName, "num", len(hs), "detail", strings.Join(hs, " "))
				NodeUpdateChan <- hs
			}

		}

	}
	if err := watchPlan.Run(consulServerAddr); err != nil {
		level.Error(c.logger).Log("msg", "watchPlan_run_error", "srv_name", srvName, "error", err)
		return err
	}
	return nil

}
```

# 编写pgw的http接收端

- web/http.go
- 使用gin 启动web
- 添加pushgateway路由

```go
package web

import (
	"time"
	"net/http"

	"github.com/gin-gonic/gin"

	"dynamic-sharding/pkg/web/controller/pushgateway"
)

func StartGin(port string, r *gin.Engine) error {

	pushgateway.Routes(r)
	s := &http.Server{
		Addr:           port,
		Handler:        r,
		ReadTimeout:    time.Duration(5) * time.Second,
		WriteTimeout:   time.Duration(5) * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	err := s.ListenAndServe()
	return err

}

```

## main中 oklog.run 开启web

```go
	var g run.Group

	{
		// Termination handler.
		term := make(chan os.Signal, 1)
		signal.Notify(term, os.Interrupt, syscall.SIGTERM)
		cancel := make(chan struct{})
		g.Add(

			func() error {
				select {
				case <-term:
					level.Warn(logger).Log("msg", "Received SIGTERM, exiting gracefully...")
					cancelAll()
					return nil
					//TODO clean work here
				case <-cancel:
					level.Warn(logger).Log("msg", "server finally exit...")
					return nil
				}
			},
			func(err error) {
				close(cancel)

			},
		)
	}
	{
		// metrics web handler.
		g.Add(func() error {
			level.Info(logger).Log("msg", "start web service Listening on address", "address", sc.HttpListenAddr)
			gin.SetMode(gin.ReleaseMode)
			routes := gin.Default()
			errchan := make(chan error, 1)

			go func() {
				errchan <- web.StartGin(sc.HttpListenAddr, routes)
			}()
			select {
			case err := <-errchan:
				level.Error(logger).Log("msg", "Error starting HTTP server", "err", err)
				return err
			case <-ctxAll.Done():
				level.Info(logger).Log("msg", "Web service Exit..")
				return nil

			}

		}, func(err error) {
			cancelAll()
		})
	}
	g.Run()
```

## pushgateway的路由

- web/controller/pushgateway/pgw_route.go
- 需要处理的是 /metrics/job的get 、put和post方法

```go
package pushgateway

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Routes(r *gin.Engine) {

	authapi := r.Group("/metrics/job")
	authapi.GET("/*any", PushMetricsGetHash)
	authapi.PUT("/*any", PushMetricsRedirect)
	authapi.POST("/*any", PushMetricsRedirect)

	tapi := r.Group("/test")
	tapi.GET("/v1", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello, I'm pgw gateway+ (｡A｡)")
	})
}

```

# 推送数据的redirect流程

- web/controller/pushgateway/pgw_controller.go
- 获取请求的path
- 根据path在哈希环上找到要调度的真实pgw node
- 拼接redirect url，返回给client
- client再发起请求即可到真实的pgw上

```go
func PushMetricsRedirect(c *gin.Context) {

	path := c.Request.URL.Path

	node, err := sd.PgwNodeRing.GetNode(path)
	if err != nil {
		c.String(http.StatusInternalServerError, "get_node_from_hashring_error")
	}

	nextUrl := "http://" + node + path
	log.Printf("[PushMetrics][request_path:%s][redirect_url:%s]", path, nextUrl)
	//c.Redirect(http.StatusMovedPermanently, nextUrl)
	c.Redirect(http.StatusTemporaryRedirect, nextUrl)
	//c.Redirect(http.StatusPermanentRedirect, nextUrl)
	c.Abort()

}
func PushMetricsGetHash(c *gin.Context) {

	path := c.Request.URL.Path

	node, err := sd.PgwNodeRing.GetNode(path)
	if err != nil {
		c.String(http.StatusInternalServerError, "get_node_from_hashring_error")
	}

	nextUrl := "http://" + node + path
	log.Printf("[PushMetrics][request_path:%s][redirect_url:%s]", path, nextUrl)
	c.String(http.StatusOK, "nextUrl:"+nextUrl)

}

```

# 本节重点总结 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- 开启结果监听和watch服务
- 编写pgw的http接收端
  - 推送数据的redirect流程

## 28.4 编译运行测试效果

## 使用指南

## 安装

```shell
# 自行编译 build
go build -o dynamic-sharding main.go

```

## 修改配置文件

- 补充dynamic-sharding.yml中的信息:

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

## 启动dynamic-sharding服务

./dynamic-sharding --config.file=dynamic-sharding.yml

## 和promtheus集成

```yaml
scrape_configs:
  - job_name: pushgateway
    consul_sd_configs:
      - server: $cousul_api
        services:
          - pushgateway
    relabel_configs:
    - source_labels:  ["__meta_consul_dc"]
      target_label: "dc"

```

## 查看prometheus target发现的pgw结果

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112459000/93b8b0ca8f5646c3a463c54a82cc1bab.png)

## 调用方调用 dynamic-sharding接口即可

- eg: http://localhost:9292/
- 测试一下getNexturl的结果`curl -vvv  http://localhost:9292/metrics/job/job_abc`
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112459000/d55064aaf0aa4814891cf463eaf966f8.png)

# 测试效果

## 使用go代码测试

```go
package main

import (
	"fmt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/push"
	"math/rand"
	"time"
)

var (

	// 带标签的gauge
	TestMetricGauge01 = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "test_metric_gauge_01",
		Help: "gauge metic test 01",
	}, []string{"idc", "ip"})

	// 带标签的counter
	TestMetricCounter01 = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "test_metric_counter_01",
		Help: "gauge metic counter 01",
	}, []string{"path", "code"})

	// histogram
	hisStart        = 0.1
	histWidth       = 0.2
	TestHistogram01 = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "test_histogram_01",
		Help:    "RPC latency distributions.",
		Buckets: prometheus.LinearBuckets(hisStart, histWidth, 20),
	})

	// summary
	TestSummary01 = prometheus.NewSummaryVec(
		prometheus.SummaryOpts{
			Name:       "test_summary_01",
			Help:       "RPC latency distributions.",
			Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
		},
		[]string{"service"},
	)
)

func Init(url string, jobName string) []*push.Pusher {
	pushers := make([]*push.Pusher, 0)
	for i := 0; i < 10; i++ {
		jobN := fmt.Sprintf("%s_%d_%d", jobName, i, i)
		pusher := push.New(url, jobN)
		// collector 注册metrics
		pusher.Collector(TestMetricGauge01)
		pusher.Collector(TestMetricCounter01)
		pusher.Collector(TestHistogram01)
		pusher.Collector(TestSummary01)
		pushers = append(pushers, pusher)

	}
	return pushers

}

// Summary设置值的方法
func setValueSummary() {
	for {
		v := rand.Float64()
		TestSummary01.WithLabelValues("uniform").Observe(v)
		time.Sleep(100 * time.Millisecond)
	}
}

// gauge和counter设置值的方法
func setValueGaugeAndCounter() {

	for {

		TestMetricGauge01.With(prometheus.Labels{"idc": "bj", "ip": "1.1"}).Set(float64(rand.Intn(100)))
		TestMetricCounter01.With(prometheus.Labels{"path": "/login", "code": "200"}).Add(float64(rand.Intn(100)))
		time.Sleep(5 * time.Second)
	}
}

func setValueHistogram() {
	for {
		v := rand.NormFloat64()
		TestHistogram01.Observe(v)

		time.Sleep(100 * time.Millisecond)
	}
}

func PushWork(pushers []*push.Pusher) {
	for {
		for _, i := range pushers {
			i := i
			err := i.Push()
			if err != nil {
				fmt.Println("Could not push completion time to Pushgateway:", err)
			}
			time.Sleep(500 * time.Millisecond)
		}
		time.Sleep(5 * time.Second)

	}

}
func main() {
	rand.Seed(time.Now().UnixNano())
	pushers := Init("http://192.168.3.200:9292/", "my_job")
	go setValueGaugeAndCounter()
	go setValueHistogram()
	go setValueSummary()
	go PushWork(pushers)
	select {}
}

```

## 停掉一台pgw 测试

- 02开始只有一个job
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112459000/c6147a9dde7e4f20b50843440bdae77e.png)
- 停掉01发现全部过来02上了
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112459000/badc30d87a564e6e9a165ca20093c479.png)
- consul已经把02从服务中踢掉了
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112459000/42f9129a930c459a873cfd4c215e9e27.png)因为在代码中设置了踢掉的时间，主要为了防止down了又回来，旧数据的问题
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112459000/62404e5c58144662948b18f5aadefc31.png)

# 运维指南

### pgw节点故障 (无需关心)

- eg: 启动了4个pgw实例,其中一个宕机了,则流量从4->3,以此类推

### pgw节点恢复

- eg: 启动了4个pgw实例,其中一个宕机了,过一会儿恢复了,那么它会被consul unregister掉
- 避免出现和扩容一样的case: 再次rehash的job 会持续在原有pgw被prome scrap，而且value不会更新

### 扩容

- 修改yml配置文件将pgw servers 调整到扩容后的数量,重启服务dynamic-sharding
- 注意 同时也要重启所有存量pgw服务,不然rehash的job 会持续在原有pgw被prome scrap，而且value不会更新

### 缩容

#### 方法一

#### 调用cousul api

- 修改yml配置文件将pgw servers 调整到缩容后的数量，避免服务重启时再次注册缩容节点

```shell
curl -vvv --request PUT 'http://$cousul_api/v1/agent/service/deregister/$pgw_addr_$pgw_port' 
eg: curl -vvv --request PUT 'http://localhost:8500/v1/agent/service/deregister/1.1.1.1_9091'
-  
```

#### 方法二

- 停止缩容节点服务,consul会将服务踢出,然后再注销

# 本节重点总结 :

- dynamic-sharding服务编写测试
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112309000/096bd32ad0f54125a28e2f1e1b9298ab.png)

