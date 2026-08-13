---
title: "27.6 consul注册服务、抽象获取target的方法"
sidebarGroup: "Prometheus"
shortTitle: "65 27.6 consul注册服务、抽象获取ta..."
order: 65
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - consul注册服务 - 先获取服务，不存在再注册 - 使用存活的节点初始化哈希环，避免因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉 - 抽象获取targe..."
---

> **Prometheus · 第 65 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- consul注册服务
  - 先获取服务，不存在再注册
  - 使用存活的节点初始化哈希环，避免因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉
- 抽象获取target的方法
  - 这些方法需要和配置文件中的服务名称对应上，通过AvaiableGetTargetFuncs这个map体现
- 定义ShardService结构体

# consul注册服务

## 先获取服务，不存在再注册

- watch/consul.go中
- 根据serviceName 获取存活的 实例ip列表

```go
// Service return a service
func (c *client) GetServiceNodes(service string) ([]string, error) {
	passingOnly := true
	addrs, _, err := c.consul.Health().Service(service, "", passingOnly, nil)
	if len(addrs) == 0 && err == nil {
		return nil, fmt.Errorf("service ( %s ) was not found", service)
	}

	if err != nil {
		return nil, err
	}
	var hs []string

	for _, a := range addrs {

		//hs = append(hs, fmt.Sprintf("%s:%d", a.Service.Address, a.Service.Port))
		hs = append(hs, a.Service.Address)
	}

	return hs, nil
}
```

# main.go中遍历配置中的分片服务，进行注册

- main.go
- aliveNodes如果存在说明，之前已经注册过了，属于本服务重启了
- 这时需要将aliveNodes赋值给nodes，因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉
- 如果没有aliveNodes，再进行注册

```go
	for _, i := range sConfig.ShardService {

		// 先获取service对应的nodes，用返回健康的node做哈希环注册，避免宕掉节点的发送

		aliveNodes, _ := client.GetServiceNodes(i.Name)
		if len(aliveNodes) > 0 {
			i.Nodes = aliveNodes
		} else {
			// 注册服务
			for _, n := range i.Nodes {
				n := n
				iport := strings.Split(n, ":")
				if len(iport) == 2 {
					n = iport[0]
				}
				err := client.ServiceRegister(i.Name, n, i.Port)
				if err != nil {
					level.Error(logger).Log("msg", "client.ServiceRegister.error", "error", err, "srvName", i.Name, "host", n, "port", i.Port)
					return
				}
			}
		}
}
```

## 同时要对配置中进行检查

- 约定name必须以 scrape_prometheus_开头
- 同时在代码中有 这个name对应的获取Target的方法

```go
		i := i
		if !strings.HasPrefix(i.Name, common.ScrapePromeJobPrefix) {
			level.Warn(logger).Log("msg", "ShardService.Name.invalid", "name", i.Name)
			continue
		}
		_, loaded := target.AvaiableGetTargetFuncs[i.Name]
		if !loaded {
			level.Warn(logger).Log("msg", "ShardService.Name.getTargetfunc.not.inplement", "name", i.Name)
			continue
		}
```

## 在common/const.go中添加const常量

```go
package common

const (
	ScrapePromeJobPrefix = "scrape_prometheus_"
)

```

# 抽象获取target的方法

- 每个服务都有对应的获取监控targets列表的方法
- 这个方法需要在代码中提前定义好
- 新建 target/target.go

```go
package target

import "prome-shard/common"

type ScrapeTarget struct {
	Targets []string          `json:"targets"`
	Labels  map[string]string `json:"labels"`
}

var (
	AvaiableGetTargetFuncs = map[string]GetTargetFunc{
		common.ScrapePromeJobPrefix + "node_exporter": GetTargetNodeExporter,
	}
)

type GetTargetFunc func() []ScrapeTarget

```

- 意思是可以有多个GetTargetFunc函数
- 他们的共同特点是都返回 []ScrapeTarget，就是待采集目标的切片
- 这些方法由使用者定义，可以是从公司内部的CMDB接口获取，也可以是其他地方
- 要求这些方法需要和配置文件中的服务名称对应上，通过AvaiableGetTargetFuncs这个map体现

## 比如我们定义一个node_exporter的方法

- 位置 target/node_exporter.go
- 这里mock一些测试的数据，真实的场景应该是去CMDB中获取
- 那么我们现在就可以在配置文件中指定 name = scrape_prometheus_node_exporter的 服务了

```go
package target

import "math/rand"

func GetTargetNodeExporter() []ScrapeTarget {

	nodes := []string{
		"172.20.70.205:9115",
		"http://prometheus.io",
		"http://www.baidu.com",
		"https://www.baidu.com",
		"https://github.com/",
	}
	randMapKeys := []string{"arch", "idc", "os", "jobname"}
	randMapValues := []string{"linux", "beijing", "centos", "arm64"}
	frn := func(n int) int {
		return rand.Intn(n)
	}

	targets := make([]ScrapeTarget, 0)
	for _, n := range nodes {
		num := len(randMapKeys)
		m := make(map[string]string, num)
		for i := 0; i < num; i++ {
			m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
		}
		t := ScrapeTarget{
			Targets: []string{n},
			Labels:  m,
		}
		targets = append(targets, t)
	}
	return targets
}

```

# 定义 ShardService结构体

- 位置 service/shard_service.go

```go
type ShardService struct {
	SrvName        string                 //服务名称
	ring           *consistent.Consistent //一致性哈希环
	DestSdFileName string                 // json文件在目标机器上的名字
	YamlPath       string                 // 执行的ansible playbook yaml
	Nodes          []string               //节点 
	Port           int                    //端口
	TargetGetFunc  target.GetTargetFunc   // 对应获取target的方法
	logger         log.Logger
	NodeUpdateChan chan []string // 节点变更的通知chan
	ctx            context.Context
	sync.RWMutex
}
```

### new方法 引入一致性哈希环

```go
func NewShardService(cg *config.ShardService, ctx context.Context, logger log.Logger) *ShardService {
	tf := target.AvaiableGetTargetFuncs[cg.Name]

	r := consistent.NewConsistent(common.Replicas)

	s := &ShardService{
		SrvName:        cg.Name,
		DestSdFileName: cg.DestSdFileName,
		YamlPath:       cg.YamlPath,
		ring:           r,
		Nodes:          cg.Nodes,
		Port:           cg.Port,
		ctx:            ctx,
		logger:         logger,
		TargetGetFunc:  tf,
		NodeUpdateChan: make(chan []string, 1),
	}

	s.SetNodes(cg.Nodes)

	return s
}
```

- 给shard_service绑定一个SetNodes方法，
- ```go
  func (ss *ShardService) SetNodes(nodes []string) {
  	ss.Lock()
  	defer ss.Unlock()
  	for _, n := range nodes {
  		ss.ring.Add(n)
  	}
  }

  ```
- 新建 consistent/consistent.go

```go
package consistent

import (
	"github.com/spaolacci/murmur3"
	"reflect"
	"sort"
	"strconv"
	"sync"
	"unsafe"
)

type uints []uint32

// Len returns the length of the uints array.
func (x uints) Len() int { return len(x) }

// Less returns true if element i is less than element j.
func (x uints) Less(i, j int) bool { return x[i] < x[j] }

// Swap exchanges elements i and j.
func (x uints) Swap(i, j int) { x[i], x[j] = x[j], x[i] }

// 定义一致性哈希环的数据结构

type Consistent struct {
	circle       map[uint32]string // 索引和key的map
	members      map[string]bool   // 快速查找key的set
	sortedHashes uints             // 索引的有序数组
	replicas     int               // 虚拟节点数
	count        int64             // 节点总数
	sync.RWMutex                   //  读写锁
}

// 编写 初始化函数
func NewConsistent(replicas int) *Consistent {
	c := new(Consistent)
	c.replicas = replicas
	c.circle = make(map[uint32]string)
	c.members = make(map[string]bool)
	return c
}

// Add方法添加元素
func (c *Consistent) Add(key string) {
	c.Lock()
	defer c.Unlock()
	c.add(key)
}

// 内部的add方法，遍历虚拟节点数添加key
func (c *Consistent) add(key string) {
	for i := 0; i < c.replicas; i++ {
		c.circle[c.hashKey(c.genKey(key, i))] = key
	}
	c.members[key] = true
	c.updateSortedHashes()
	c.count++
}

// 将key加上虚拟节点的索引
func (c *Consistent) genKey(key string, idx int) string {
	return strconv.Itoa(idx) + key
}

// 根据key生成hash值，底层使用murmur3算法，这个算法比crc32均匀性要好
func (c *Consistent) hashKey(key string) uint32 {
	return murmur3.Sum32(str2bytes(key))
}

// 可以通过unsafe 强制转换绕过复制提高性能
func str2bytes(s string) (b []byte) {
	sh := *(*reflect.StringHeader)(unsafe.Pointer(&s))
	bh := (*reflect.SliceHeader)(unsafe.Pointer(&b))
	bh.Cap = sh.Len
	bh.Len = sh.Len
	bh.Data = sh.Data
	return b
}

// 对hash值切片进行排序
func (c *Consistent) updateSortedHashes() {
	hashes := c.sortedHashes[:0]
	for k := range c.circle {
		hashes = append(hashes, k)
	}
	sort.Sort(hashes)
	c.sortedHashes = hashes
}

// 根据一个target获取node
func (c *Consistent) Get(name string) string {
	c.RLock()
	defer c.RUnlock()
	key := c.hashKey(name)
	i := c.search(key)
	return c.circle[c.sortedHashes[i]]
}

// 索引切片的搜索方法，找到比key大的第一个值
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

func (c *Consistent) Members() []string {
	c.RLock()
	defer c.RUnlock()
	var m []string
	for k := range c.members {
		m = append(m, k)
	}
	return m
}
// 从hash环中删除一个节点
func (c *Consistent) Remove(elt string) {
	c.Lock()
	defer c.Unlock()
	c.remove(elt)
}

// 遍历虚拟节点数，获取key的哈希值，然后删除即可
func (c *Consistent) remove(key string) {
	for i := 0; i < c.replicas; i++ {
		delete(c.circle, c.hashKey(c.genKey(key, i)))
	}
	delete(c.members, key)
	c.updateSortedHashes()
	c.count--
}

```

## 在main中遍历中创建 ShardService对象

- 同时新建一个 服务名对应 它的更新chan的map
- 将 ShardService中的更新chan和它的名字塞入map中，用作后续通知使用

```go
srvNameChanMap := make(map[string]chan<- []string) //for 循环的上面

		shardService := service.NewShardService(i, ctxAll, logger)

		// 初始化consulwatch
		srvNameChanMap[i.Name] = shardService.NodeUpdateChan
```

# 本节重点总结 :

- consul注册服务
  - 先获取服务，不存在再注册
  - 使用存活的节点初始化哈希环，避免因为配置文件中可能有节点已经down了，但是还没来得及从配置中去掉
- 抽象获取target的方法
  - 这些方法需要和配置文件中的服务名称对应上，通过AvaiableGetTargetFuncs这个map体现
- 定义 ShardService结构体

