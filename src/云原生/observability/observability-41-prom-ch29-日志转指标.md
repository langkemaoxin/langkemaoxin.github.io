---
title: Prometheus 第29章：日志转指标
sidebarGroup: 可观测性
shortTitle: 41 日志转指标
order: 41
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第29章（日志转指标）合并笔记
---

> **Prometheus · 第 29 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 29.1 时序监控和日志监控的对比，分析日志监控的核心诉求

# 本节重点介绍 :

- 监控系统分类
- 时序监控和日志监控的对比
- 轻量日志监控系统的诉求

# 监控系统分类

> 监控系统按照原理和作用大致可以分为三类

- 日志类（Log）
- 调用链类（Tracing）
- 度量类（Metrics）

# 日志类（Log）介绍

- 日志类比较常见，我们的框架代码、系统环境、以及业务逻辑中一般都会产出一些日志
- 这些日志我们通常把它记录后统一收集起来，方便在需要的时候进行查询。
- 日志类记录的信息一般是一些事件、非结构化的一些文本内容
- 日志的输出和处理的解决方案比较多，大家熟知的有 ELK Stack 方案（Elasticseach + Logstash + Kibana）![log01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721256000/d50c392d9d3f42d78048524f27b105f9.png)

# 时序监控和日志监控的对比

- 日志监控属于非侵入监控
  - 意思是不像时序监控那样必须引用sdk代码才能打点
  - 业务只需要写入日志，提供日志的路径等信息，日志监控系统就可以采集到
- 日志监控提供更原始的时间戳
  - 因为只要能采集到原始日志，那么时间戳相对精准一点
  - 时序监控在时间戳上会有偏移的处理

# elk等日志监控系统的弊端

- 存储使用es
- es无论你查不查，巨大的全文索引开销必须时刻承担

# 轻量日志监控系统的诉求

> 总结起来就是日志转时序

## 算qps

- 比如统计 nginx日志中code=200的qps
- 对应就是 每隔10秒grep一下日志文件 ，用增量/时间差 算出qps

## 日志关键字告警

### 错误类型的关键字举例

- 如应用连接mysql报错`dial mysql host error `
- 如redis同步失败报错`cannot sync data `
- 如进程被oom kill了`Out of Memory (OOM) killer`

## 诉求和解决方案

- 出现上述错误类型进行报警
- 但并不需要存储全量的日志
- 所以可以通过日志转时序解决
  - 将日志流信息转换计算后推送给时序监控系统

# 本节重点总结 :

- 监控系统分类
- 时序监控和日志监控的对比
- 轻量日志监控系统的诉求

## 29.2 golang实战项目log2metrics架构说明

# 本节重点介绍 :

- 需求分析
- 流程说明
- log2metrics架构设计

# 架构图

![log2metrics.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721301000/93083cd1c9924518868bc94f9baba35e.png)

# 需求分析

## 算qps

- 比如统计 nginx日志中code=200的qps
- 对应就是 每隔10秒grep一下日志文件 ，用增量/时间差 算出qps

## 日志关键字告警

### 错误类型的关键字举例

- 如应用连接mysql报错`dial mysql host error `
- 如redis同步失败报错`cannot sync data `
- 如进程被oom kill了`Out of Memory (OOM) killer`

# 流程说明

## 配置采集任务

- 采集任务的名称
- 指定暴露的metrics名称 如 ngx_access_cnt
- 指定日志路径
- 提供日志匹配正则 ，如过滤包含 containerd的日志

```shell
 ".*containerd.*"
```

- 提供标签正则，如过滤level

```shell
      level: ".*level=(.*?) .*"
```

## 计算方法说明

- cnt 对符合规则的日志进行计数 ，就是日志的总数counter
- max 对符合规则的日志抓取出的数字算最大值 ，如code=404 和code=500 max结果就是 500
- min 对符合规则的日志抓取出的数字算最小值
- sum 对符合规则的日志抓取出的数字算和
- avg 对符合规则的日志抓取出的数字算平均值

## 启动日志采集任务

- 启动tailer读取相关日志
- 将结果通过队列发送给分析组件

## 启动分析组件

- 接收tailer发过来的日志
- 使用正则进行分析
- 转换为统计的数据结构
- 发送给数据处理组件

## 启动数据处理组件

- 定时分析数据，转化为prometheus metrics

# 架构图

![log2metrics.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721301000/93083cd1c9924518868bc94f9baba35e.png)

# 本节重点总结 :

- 需求分析
- 流程说明
- log2metrics架构设计

## 29.3 准备工作，编写配置文件，解析配置，校验正则，设置log

# 本节重点介绍 :
- 新建项目 log2metrics 
- 编写配置文件yaml
- main 解析配置，校验正则，设置log
- 根据配置文件设置metrics 

# 新建项目 log2metrics 

## go mod init 
```shell script
go mod init log2metrics
```

# 编写配置文件yaml
```yaml
http_addr: 0.0.0.0:8087
log_level: INFO

log_strategy:
  - metric_name: log_containerd_total
    metric_help: /var/log/messages 中的 containerd日志 total
    file_path: /var/log/messages
    pattern:  ".*containerd.*"
    func: cnt
    tags:
      level: ".*level=(.*?) .*"
  - metric_name: ngx_acc_code
    metric_help: nginx code avg
    file_path: /var/log/nginx/access.log
    pattern:  '.*\[code=(.*?)\].*'
    func: avg
```
## log_strategy 字段解析
- metric_name :指定暴露的metrics名称 如 ngx_access_cnt
- metric_help : 暴露指标的metrics帮助信息，支持中文
- file_path : 指定日志路径
- pattern：提供日志匹配正则 ，如过滤包含 containerd的日志
- func ：计算方法
    - cnt 对符合规则的日志进行计数 ，就是日志的总数counter
    - max 对符合规则的日志抓取出的数字算最大值 ，如code=404 和code=500 max结果就是 500
    - min 对符合规则的日志抓取出的数字算最小值 
    - sum 对符合规则的日志抓取出的数字算和 
    - avg 对符合规则的日志抓取出的数字算平均值 
- tags：标签的正则，
    - key=正则 
    - key最后用来设置metrics的标签
    - value正则匹配的结果是标签的值
    
## 代码中解析配置文件

### 日志采集策略文件
- 位置strategy/log.go
- 代码
```go
package strategy

import "regexp"

type Strategy struct {
	ID         int64  `json:"id" yaml:"-"`
	MetricName string `json:"metric_name" yaml:"metric_name" ` //监控策略名
	MetricHelp string `json:"metric_help" yaml:"metric_help" ` //metric help信息

	FilePath   string                    `json:"file_path" yaml:"file_path"` //文件路径
	Pattern    string                    `json:"pattern" yaml:"pattern"`     //正则表达式
	Tags       map[string]string         `json:"tags" yaml:"tags"`           // 配置的标签正则
	Func       string                    `json:"func" yaml:"func" `          //计算方式（max/min/avg/cnt）
	Creator    string                    `json:"creator"`
	PatternReg *regexp.Regexp            `json:"-"` // 正则表达式配置解析后的
	TagRegs    map[string]*regexp.Regexp `json:"-"` // 配置的标签正则解析后的
}

```

### 解析配置的方法
- 位置 config/config.go
```go

package config

import (
	"fmt"
	"github.com/toolkits/pkg/logger"
	"io/ioutil"
	"log2metrics/strategy"
	"regexp"

	"gopkg.in/yaml.v2"
)

type Config struct {
	LogStrategies []*strategy.Strategy `yaml:"log_strategy"`
	LogLevel      string               `yaml:"log_level"`
	HttpAddr      string               `yaml:"http_addr"`
}

func Load(s string) (*Config, error) {
	cfg := &Config{}

	err := yaml.Unmarshal([]byte(s), cfg)

	if err != nil {
		return nil, err
	}
	cfg.LogStrategies = updateRegs(cfg)
	return cfg, nil
}
func updateRegs(cfg *Config) []*strategy.Strategy {
	res := []*strategy.Strategy{}
	for _, st := range cfg.LogStrategies {
		st := st
		//更新pattern
		if len(st.Pattern) != 0 {
			reg, err := regexp.Compile(st.Pattern)
			if err != nil {
				logger.Errorf("compile pattern regexp failed:[sid:%d][pat:%s][err:%v]", st.ID, st.Pattern, err)
				continue
			}
			st.PatternReg = reg
		}
		st.TagRegs = map[string]*regexp.Regexp{}
		//更新tags
		for tagk, tagv := range st.Tags {
			reg, err := regexp.Compile(tagv)
			if err != nil {
				logger.Errorf("compile tag failed:[sid:%d][pat:%s][err:%v]", st.ID, tagv, err)
				continue
			}
			st.TagRegs[tagk] = reg
		}
		res = append(res, st)

	}
	return res
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

#### updateRegs校验用户配置的正则
- 使用regexp.Compile解析 st.Pattern 
- 如果报错了说明用户配置的正则不对，那么就忽略这个配置
- 对于标签的正则st.TagRegs的处理方式是
    - 如果一个正则配置错误就忽略这个标签
 
 

# main 解析配置，设置log
## 解析命令行
```go
package main

import (
	"context"
	"github.com/oklog/run"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/promlog"
	promlogflag "github.com/prometheus/common/promlog/flag"
	"github.com/prometheus/common/version"
	"github.com/toolkits/pkg/logger"
	"gopkg.in/alecthomas/kingpin.v2"
	"log2metrics/common"
	"log2metrics/config"
	"log2metrics/consumer"
	"log2metrics/counter"
	"log2metrics/logjob"
	"log2metrics/metrics"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
)

func main() {

	var (
		// 命令行参数
		app = kingpin.New(filepath.Base(os.Args[0]), "The log2metrics")
		// 指定配置文件
		configFile = app.Flag("config.file", "log2metrics configuration file path.").Default("log2metrics.yml").String()
	)
	promlogConfig := promlog.Config{}
	//
	app.Version(version.Print("log2metrics"))
	app.HelpFlag.Short('h')
	promlogflag.AddFlags(app, &promlogConfig)
	kingpin.MustParse(app.Parse(os.Args[1:]))

```

## 解析配置文件和设置log
```go

	// 解析yaml配置文件
	sConfig, err := config.LoadFile(*configFile)
	if err != nil {
		logger.Infof("config.LoadFile Error,Exiting ...error:%v", err)
		return
	}

	// 设置日志级别
	logger.SetSeverity(sConfig.LogLevel)
```

# 根据配置文件设置metrics 
- 位置 metrics/metrics.go
```go
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"log2metrics/strategy"
	"net/http"
)

func CreateMetrics(ss []*strategy.Strategy) map[string]*prometheus.GaugeVec {
	mmap := make(map[string]*prometheus.GaugeVec)
	for _, s := range ss {
		labels := []string{}
		for k := range s.Tags {
			labels = append(labels, k)
		}
		m := prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: s.MetricName,
			Help: s.MetricHelp,
		}, labels)
		mmap[s.MetricName] = m

	}
	return mmap

}

```
## 解读
- 遍历配置文件解析完之后的策略数组
- 初始化一个gauge类型的metrics
    - 名字为用户配置的 MetricName
    - Help为用户配置的 MetricHelp
    - labels为用户配置的 tags的key
- 以metrics 的name为key，value是这个metrics 创建一个map

## main.go中创建这个metrics的map
- 遍历metrics map，注册metrics 
```go
	// 创建metrics
	metricsMap := metrics.CreateMetrics(sConfig.LogStrategies)
	// 注册metrics
	for _, m := range metricsMap {
		prometheus.MustRegister(m)
	}
```

# 本节重点总结 :
- 新建项目 log2metrics 
- 编写配置文件yaml
- main 解析配置，设置log
- 根据配置文件设置metrics

## 29.4 日志任务增量更新管理器和具体的日志job对象

# 本节重点介绍 :
- 日志任务增量更新管理器
- 具体的日志job对象
- 读取日志的reader对象

日志任务增量更新管理器和具体的日志job对象

# 日志任务增量更新管理器

- 位置 logjob/manager.go

```go

package logjob

import (
	"context"
	"github.com/toolkits/pkg/logger"
	"log2metrics/consumer"
	"sync"
)
type LogJobManager struct {
	targetMtx     sync.Mutex
	activeTargets map[string]*LogJob
}

func (jm *LogJobManager) Sync(jobs []*LogJob) {
	thisNewTargets := make(map[string]*LogJob)
	thisAllTargets := make(map[string]*LogJob)

	jm.targetMtx.Lock()
	for _, t := range jobs {
		hash := t.hash()
		thisAllTargets[hash] = t
		if _, loaded := jm.activeTargets[hash]; !loaded {
			thisNewTargets[hash] = t
			jm.activeTargets[hash] = t
		}
	}

	// 停止旧的
	for hash, t := range jm.activeTargets {
		if _, loaded := thisAllTargets[hash]; !loaded {
			logger.Infof("stop %+v stra:%+v", t, t.Stra)
			t.stop()
			delete(jm.activeTargets, hash)
		}
	}

	jm.targetMtx.Unlock()
	// 开启新的
	for _, t := range thisNewTargets {
		t := t
		t.start(jm.cq)
	}

}

```
## 增量更新解读
- 后续会做配置热更新或者 agent和server的交互
- 也就是logjob会有更新的情况

### 增量更新管理器
- activeTargets 中的map代表当前活跃的日志任务
```go
type LogJobManager struct {
	targetMtx     sync.Mutex
	activeTargets map[string]*LogJob
}
```

### 增量更新体现在sync方法中
- 远端或新传入的jobs代表最新的全量配置
- 用jobs和本地上次的activeTargets最差异化
- 首先遍历jobs，将全量的结果塞入thisAllTargets map中
```go
	thisNewTargets := make(map[string]*LogJob)
	thisAllTargets := make(map[string]*LogJob)

	jm.targetMtx.Lock()
	for _, t := range jobs {
		hash := t.hash()
		thisAllTargets[hash] = t
		if _, loaded := jm.activeTargets[hash]; !loaded {
			thisNewTargets[hash] = t
			jm.activeTargets[hash] = t
		}
	}
```
- 同时如果job在jobs中，但是不在activeTargets说明是新增的任务，塞入 thisNewTargets map中
```go
if _, loaded := jm.activeTargets[hash]; !loaded {
			thisNewTargets[hash] = t
			jm.activeTargets[hash] = t
		}
```

- 如果在这次的map thisAllTargets中 但是不在activeTargets中，说明已经删除了，需要停止
```go
	// 停止旧的
	for hash, t := range jm.activeTargets {
		if _, loaded := thisAllTargets[hash]; !loaded {
			logger.Infof("stop %+v stra:%+v", t, t.Stra)
			t.stop()
			delete(jm.activeTargets, hash)
		}
	}
```
- 开启新的任务
```go
	// 开启新的
	for _, t := range thisNewTargets {
		t := t
		t.start(jm.cq)
	}

```

## 要求管理的对象有三个方法
- hash 判断唯一性的
- start 开始
- stop 停止

# 具体的日志job对象

- 日志logjob\perjob.go
```go
package logjob

import (
	"crypto/md5"
	"encoding/hex"
	"github.com/toolkits/pkg/logger"
	"log2metrics/common"
	"log2metrics/consumer"
	"log2metrics/reader"
	"log2metrics/strategy"
)

type LogJob struct {
	r    *reader.Reader
	c    *consumer.ConsumerGroup
	Stra *strategy.Strategy
}

func (lj *LogJob) hash() string {

	md5o := md5.New()

	md5o.Write([]byte(lj.Stra.FilePath))
	md5o.Write([]byte(lj.Stra.MetricName))
	return hex.EncodeToString(md5o.Sum(nil))
}
func (lj *LogJob) start(cq chan *consumer.AnalysPoint) {
	fPath := lj.Stra.FilePath
	cache := make(chan string, common.LogQueueSize)

	//启动reader
	r, err := reader.NewReader(fPath, cache)
	if err != nil {
		return
	}
	lj.r = r
	//启动worker
	cg := consumer.NewConsumerGroup(fPath, cache, lj.Stra, cq)

	cg.Start()
	lj.c = cg
	//启动reader
	go r.Start()

	logger.Infof("Create job success [filePath:%s][sid:%d]", fPath, lj.Stra.ID)
}

func (lj *LogJob) stop() {

	lj.c.Stop() //先stop consumer
	lj.r.Stop()
	logger.Infof("stop job success [filePath:%s][sid:%d]", lj.Stra.FilePath, lj.Stra.ID)
}

```

## 增量更新要求job 有start、stop、hash方法

## 字段解析
```go
type LogJob struct {
	r    *reader.Reader          // 读取日志
	c    *consumer.ConsumerGroup // 消费日志
	Stra *strategy.Strategy      // 策略
}

```

# 读取日志的reader对象
- [底层库使用](https://github.com/hpcloud/tail) 
## 使用tailer封装reader对象
- 位置reader\reader.go
```go
package reader

import (
	"github.com/hpcloud/tail"
	"github.com/toolkits/pkg/logger"
	"io"
	"time"
)

type Reader struct {
	FilePath    string        //配置的路径 正则路径
	tailer      *tail.Tail    // tailer对象
	Stream      chan string   // 同步的chan
	CurrentPath string        //当前的路径
	Close       chan struct{} // 关闭的chan
	FD          uint64        // 文件的inode，用来处理文件名变更的情况
}

```
## 初始化tailer，打开日志文件
- stream 由外部传入，用作同步
- 文件打开方式解读
    -  	SeekStart   = 0 // seek relative to the origin of the file
    -   SeekCurrent = 1 // seek relative to the current offset
    -   SeekEnd     = 2 // seek relative to the end
- 代码如下

```go

func NewReader(filepath string, stream chan string) (*Reader, error) {
	r := &Reader{
		FilePath: filepath,
		Stream:   stream,
		Close:    make(chan struct{}),
	}
	err := r.openFile(io.SeekEnd, filepath) //默认打开SeekEnd

	return r, err
}

func (r *Reader) openFile(whence int, filepath string) error {
	seekinfo := &tail.SeekInfo{
		Offset: 0,
		Whence: whence,
	}
	config := tail.Config{
		Location: seekinfo,
		ReOpen:   true,
		Poll:     true,
		Follow:   true,
	}

	t, err := tail.TailFile(filepath, config)
	if err != nil {
		return err
	}
	r.tailer = t
	r.CurrentPath = filepath
	r.FD = GetFileInodeNum(r.CurrentPath)
	return nil
}

```

## 开启reader的方法
- 启动一个协程进行日志统计
- 核心方法为通过tailer的Lines 读取，然后通过stream发送出去
```go
func (r *Reader) Start() {
	r.StartRead()
}

func (r *Reader) StartRead() {
	var readCnt, readSwp int64
	var dropCnt, dropSwp int64

	analysClose := make(chan int)
	go func() {
		for {
			// 十秒钟统计一次
			select {
			case <-analysClose:
				return
			case <-time.After(time.Second * 10):
			}
			a := readCnt
			b := dropCnt
			logger.Debugf("read [%d] line in last 10s\n", a-readSwp)
			logger.Debugf("drop [%d] line in last 10s\n", b-dropSwp)
			readSwp = a
			dropSwp = b
		}
	}()

	for line := range r.tailer.Lines {
		readCnt = readCnt + 1
		select {
		case r.Stream <- line.Text:
		default:
			dropCnt = dropCnt + 1
		}
	}
	analysClose <- 0
}

```

## 停止reader的方法
```go
func (r *Reader) StopRead() error {
	return r.tailer.Stop()
}

func (r *Reader) Stop() {
	r.StopRead()
	close(r.Close)

}
```

# 本节重点总结 :
- 日志任务增量更新管理器
    - 增量更新的通用方法 
        - hash
        - stop
        - start
- 具体的日志job对象
- 读取日志的reader对象
    - tailer对象

## 29.5 日志消费组和日志正则处理对象AnalysPoint

# 本节重点介绍 :
- 日志正则消费分析对象
- 日志消费者组存在的意义和对应的方法
- 定义正则分析结果对象AnalysPoint
- 编写正则处理方法

日志消费组和日志正则处理对象AnalysPoint

# 日志正则消费分析对象

## consumer对象
- 位置 consumer\consumer.go
```go
package consumer

import (
	"bytes"
	"github.com/toolkits/pkg/logger"
	"log2metrics/strategy"
	"math"
	"regexp"
	"sort"
	"strconv"
	"time"
)

//单个Consumer对象
type Consumer struct {
	FilePath     string
	Close        chan struct{}
	Stream       chan string
	CounterQueue chan *AnalysPoint
	Mark         string //标记该worker信息，方便打log及上报自监控指标, 追查问题
	Analyzing    bool   //标记当前Worker状态是否在分析中,还是空闲状态
	Stra         *strategy.Strategy
}
```

## 启动和停止 
```go
func (c *Consumer) Start() {
	go func() {
		c.Work()
	}()
}

func (c *Consumer) Stop() {
	close(c.Close)
}

```

## 核心的work方法
- 启动一个  统计的任务协程
- 核心方法为，从c.Stream接收每行的日志，然后调用 analysis方法进行分析
```go
func (c *Consumer) Work() {

	logger.Infof("worker starting...[%s]", c.Mark)

	var anaCnt, anaSwp int64
	analysClose := make(chan int)

	// 统计的任务
	go func() {
		for {
			//休眠10s
			select {
			case <-analysClose:
				return
			case <-time.After(time.Second * 10):
			}
			a := anaCnt
			logger.Debugf("[mark:%v]analysis %d line in last 10s", c.Mark, a-anaSwp)
			anaSwp = a
		}
	}()

	for {
		select {
		case line := <-c.Stream:
			c.Analyzing = true
			anaCnt = anaCnt + 1
			c.analysis(line)
			c.Analyzing = false
		case <-c.Close:
			analysClose <- 0
			return
		}

	}
}
```

## 日志正则处理函数 analysis
- 可以先使用简单的日志打印代替，如果能打印说明流程没问题
```go
func (c *Consumer) analysis(line string) {

	logger.Infof("[mark:%v]start analysis %v", c.Mark, line)

	//c.producer(line)

}
```

# 日志消费者组
## 作用
- 因为正则匹配比较消耗资源，速度较慢
- 所以一个消费者不够用，所以要抽象消费者组容纳多个消费者
## 代码
- 位置 consumer\group.go
```go
package consumer

import (
	"fmt"
	"github.com/toolkits/pkg/logger"
	"log2metrics/common"
	"log2metrics/strategy"
)

//Consumer组
type ConsumerGroup struct {
	ConsumerNum        int
	Consumers          []*Consumer
}

func NewConsumerGroup(filePath string, stream chan string, stra *strategy.Strategy, cq chan *AnalysPoint) *ConsumerGroup {
	consumerNum := common.LogConsumerNum
	cg := &ConsumerGroup{
		ConsumerNum: consumerNum,
		Consumers:   make([]*Consumer, 0),
	}

	logger.Infof("new worker group, [file:%s][consumer_num:%d]", filePath, consumerNum)

	for i := 0; i < cg.ConsumerNum; i++ {
		mark := fmt.Sprintf("[consumer][file:%s][num:%d/%d]", filePath, i, consumerNum)
		c := Consumer{}
		c.CounterQueue = cq
		c.Stra = stra
		c.Close = make(chan struct{})
		c.FilePath = filePath
		c.Stream = stream
		c.Mark = mark
		c.Analyzing = false
		cg.Consumers = append(cg.Consumers, &c)
	}

	return cg
}

func (cg *ConsumerGroup) Start() {
	for _, consumer := range cg.Consumers {
		consumer.Start()
	}
}

func (cg *ConsumerGroup) Stop() {
	for _, consumer := range cg.Consumers {
		consumer.Stop()
	}
}

```
#### 解读一下
- 根据配置的组中消费者数量，创建消费者
- stream是接收日志reader信息的chan
- cq是分析结果后传输 结果的chan，对象是AnalysPoint

# 初始化job
- 位置logjob\perjob.go
```go
func (lj *LogJob) start(cq chan *consumer.AnalysPoint) {
	fPath := lj.Stra.FilePath
	cache := make(chan string, common.LogQueueSize)

	//启动reader
	r, err := reader.NewReader(fPath, cache)
	if err != nil {
		return
	}
	lj.r = r
	//启动worker
	cg := consumer.NewConsumerGroup(fPath, cache, lj.Stra, cq)

	cg.Start()
	lj.c = cg
	//启动reader
	go r.Start()

	logger.Infof("Create job success [filePath:%s][sid:%d]", fPath, lj.Stra.ID)
}

func (lj *LogJob) stop() {

	lj.c.Stop() //先stop consumer
	lj.r.Stop()
	logger.Infof("stop job success [filePath:%s][sid:%d]", lj.Stra.FilePath, lj.Stra.ID)
}

```

# 定义正则分析结果对象
- 位置 consumer\consumer.go
```go
//从worker往计算部分推的Point
type AnalysPoint struct {
	Value           float64           // 数字的正则，cnt是 NaN，其余是对应的数字
	MetricsName     string            // metrics的名字，用作后续匹配使用
	LogFunc         string            // 计算的方法，cnt、avg、max、min
	SortLabelString string            // 标签排序后的结果
	LabelMap        map[string]string // 标签的map
}

```

# 编写正则处理方法

```go
func (c *Consumer) producer(line string) {
	defer func() {
		if err := recover(); err != nil {
			logger.Errorf("%s[producer panic] : %v", c.Mark, err)
		}
	}()

	//处理用户正则
	var patternReg *regexp.Regexp
	var value = math.NaN()
	var err error
	patternReg = c.Stra.PatternReg
	v := patternReg.FindStringSubmatch(line)
	var vString string
	if len(v) == 0 {
		//  正则匹配失败
		return
	}
	logger.Debug("[mark:%v][line:%v][reg_res:%v]", c.Mark, line, v)
	/*
		patternReg.FindStringSubmatch(line) 的结果v
		len=0 说明 正则没匹配中，应该丢弃这行
		len=1 说明 正则匹配中了，但是小括号分组没匹配到
		len>1 说明 正则匹配中了，小括号分组也匹配到
	*/
	if len(v) > 1 {
		// 用户正则的第一个 小括号分组 ()
		vString = v[1]
	} else {
		vString = ""
	}
	value, err = strconv.ParseFloat(vString, 64)
	if err != nil {
		value = math.NaN()
	}

	//处理tag 正则
	labelMap := map[string]string{}
	for tagk, regTag := range c.Stra.TagRegs {
		labelMap[tagk] = ""
		t := regTag.FindStringSubmatch(line)
		if t != nil && len(t) > 1 {
			labelMap[tagk] = t[1]
		}

	}

	ret := &AnalysPoint{
		LabelMap:        labelMap,
		Value:           value,
		SortLabelString: SortedTags(labelMap),
		MetricsName:     c.Stra.MetricName,
		LogFunc:         c.Stra.Func,
	}
	c.CounterQueue <- ret
}

```
## 处理日志主正则
- patternReg.FindStringSubmatch(line) 的结果v
- len=0 说明 正则没匹配中，应该丢弃这行
- len=1 说明 正则匹配中了，但是小括号分组没匹配到
- len>1 说明 正则匹配中了，小括号分组也匹配到
```go
	//处理用户正则
	var patternReg *regexp.Regexp
	var value = math.NaN()
	var err error
	patternReg = c.Stra.PatternReg
	v := patternReg.FindStringSubmatch(line)
	var vString string
	if len(v) == 0 {
		//  正则匹配失败
		return
	}
	logger.Debug("[mark:%v][line:%v][reg_res:%v]", c.Mark, line, v)
	/*
		patternReg.FindStringSubmatch(line) 的结果v
		len=0 说明 正则没匹配中，应该丢弃这行
		len=1 说明 正则匹配中了，但是小括号分组没匹配到
		len>1 说明 正则匹配中了，小括号分组也匹配到
	*/
```

## 设置value
- 将正则匹配的结果做float64转行，如果失败就设置一个NaN
```go
	value, err = strconv.ParseFloat(vString, 64)
	if err != nil {
		value = math.NaN()
	}

```

## 处理标签的正则

```go

	//处理tag 正则
	labelMap := map[string]string{}
	for tagk, regTag := range c.Stra.TagRegs {
		labelMap[tagk] = ""
		t := regTag.FindStringSubmatch(line)
		if t != nil && len(t) > 1 {
			labelMap[tagk] = t[1]
		}

	}
```
- code=404 和code=200 是两个series，因为标签不一致
- 所以需要一个标签排序的方法
```go
func SortedTags(tags map[string]string) string {
	if tags == nil {
		return ""
	}

	size := len(tags)
	if size == 0 {
		return ""
	}

	ret := new(bytes.Buffer)

	if size == 1 {
		for k, v := range tags {
			ret.WriteString(k)
			ret.WriteString("=")
			ret.WriteString(v)
		}
		return ret.String()
	}

	keys := make([]string, size)
	i := 0
	for k := range tags {
		keys[i] = k
		i++
	}
	sort.Strings(keys)

	for j, key := range keys {
		ret.WriteString(key)
		ret.WriteString("=")
		ret.WriteString(tags[key])
		if j != size-1 {
			ret.WriteString(",")
		}
	}

	return ret.String()
}

```

## 构造正则分析的结果，塞入chan中
```go

	ret := &AnalysPoint{
		LabelMap:        labelMap,
		Value:           value,
		SortLabelString: SortedTags(labelMap),
		MetricsName:     c.Stra.MetricName,
		LogFunc:         c.Stra.Func,
	}
	c.CounterQueue <- ret
```

# 本节重点总结 :
- 日志正则消费分析对象
- 日志消费者组存在的意义和对应的方法
- 定义正则分析结果对象AnalysPoint
- 编写正则处理方法

## 29.6 时序统计的结构体对象和metrics结果打点方法

# 本节重点介绍 :
- 时序统计的结构体对象
- 时序统计结构体的管理者
- metrics结果打点方法

# 时序统计的结构体对象
- 位置 counter\counter.go
```go
//统计的实体
type PointCounter struct {
	sync.RWMutex
	Count           int64   // 日志条数计数
	Sum             float64 // 正则数字的sum
	Max             float64 // 正则数字的max
	Min             float64 // 正则数字的min
	Ts              int64   // 最近更新的时间戳
	LogFunc         string  // 计算方法
	MetricsName     string  //metrics名字 
	SortLabelString string  // 标签排序的结果
	LabelMap        map[string]string
}

func NewPointCounter(metricsName, sortLabelString, logFunc string, labelMap map[string]string) *PointCounter {
	pc := &PointCounter{
		MetricsName:     metricsName,
		SortLabelString: sortLabelString,
		LabelMap:        labelMap,
		LogFunc:         logFunc,
	}
	return pc

}

```

## 计算方法
```go
func (pc *PointCounter) Update(value float64) {

	//logger.Infof("[start.Update][pc:%+v]", pc)
	pc.Lock()
	defer pc.Unlock()
	pc.Sum = pc.Sum + value
	if math.IsNaN(pc.Max) || value > pc.Max {
		pc.Max = value
	}
	if math.IsNaN(pc.Min) || value < pc.Min {
		pc.Min = value
	}

	pc.Count += 1
	pc.Ts = time.Now().Unix()
}
```

# 时序统计结构体的管理者
```go
type PointCounterManager struct {
	sync.RWMutex
	TagstringMap map[string]*PointCounter
	CounterQueue chan *consumer.AnalysPoint
	MetricsMap map[string]*prometheus.GaugeVec
}

```
## 初始化方法
- 传入metrics map 和分析结果的chan
```go
func NewPointCounterManager(cq chan *consumer.AnalysPoint, m map[string]*prometheus.GaugeVec) *PointCounterManager {

	pm := &PointCounterManager{
		TagstringMap: make(map[string]*PointCounter),
		CounterQueue: cq,
		//QuitC:        make(chan struct{}, 1),
		MetricsMap: m,
	}
	return pm
}
```

## 更新和获取统计实体的方法
```go
func (pm *PointCounterManager) GetPcByUniqueName(seriesId string) *PointCounter {
	pm.RLock()
	defer pm.RUnlock()
	return pm.TagstringMap[seriesId]

}

func (pm *PointCounterManager) SetPc(seriesId string, pc *PointCounter) {
	pm.Lock()
	defer pm.Unlock()
	pm.TagstringMap[seriesId] = pc

}

```

## 更新的manager方法
- 通过分析chan接收 分析的结果
- 根据metric名字+有序标签字符串作为key 获取统计的实体对象
- 如果没有就新建一个
- 然后调用update进行计算
```go
func (pm *PointCounterManager) UpdateManager(ctx context.Context) error {

	for {
		select {
		case <-ctx.Done():
			logger.Infof("PointCounterManager.UpdateManager.receive_quit_signal_and_quit")
			return nil
		case ap := <-pm.CounterQueue:
			//logger.Infof("[receive_ap_from_pm.CounterQueue][ap:%+v]", ap)
			pc := pm.GetPcByUniqueName(ap.MetricsName + ap.SortLabelString)
			if pc == nil {
				pc = NewPointCounter(ap.MetricsName, ap.SortLabelString, ap.LogFunc, ap.LabelMap)
				pm.SetPc(ap.MetricsName+ap.SortLabelString, pc)
			}

			pc.Update(ap.Value)
			//case <-pm.QuitC:
			//	return nil
		}

	}

}

```

# metrics结果打点方法
- 遍历metrics map，获取metrics对象和它对应的统计实体
- 根据统计的方法，调用统计实体的字段进行打点
```go
func (pm *PointCounterManager) SetMetrics() {
	pm.RLock()
	defer pm.RUnlock()

	for _, pc := range pm.TagstringMap {
		metric, loaded := pm.MetricsMap[pc.MetricsName]
		if !loaded {
			logger.Errorf("metrics not found in map metric_name:%v", pc.MetricsName)
			continue
		}
		logger.Debugf("[metrics_set][pc:%+v]", pc)

		var value float64

		switch pc.LogFunc {
		case common.LogFuncCnt:
			value = float64(pc.Count)
		case common.LogFuncSum:
			value = float64(pc.Sum)
		case common.LogFuncMax:
			value = float64(pc.Max)
		case common.LogFuncMin:
			value = float64(pc.Min)
		case common.LogFuncAvg:
			value = float64(pc.Sum) / float64(pc.Count)

		}
		metric.With(prometheus.Labels(pc.LabelMap)).Set(value)

	}

}

```

## 打点的manager
```go
func (pm *PointCounterManager) SetMetricsManager(ctx context.Context) error {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			logger.Infof("SetMetricsManager.receive_quit_signal_and_quit")
			//close(pm.QuitC)
			return nil
		case <-ticker.C:
			logger.Debug("SetMetricsManager.SetMetrics.run")
			pm.SetMetrics()
		}

	}
}

```

# main.go中启动这些manager
## 先初始化对应的对象
```go

	// 统计指标的同步queue
	cq := make(chan *consumer.AnalysPoint, common.CounterQueueSize)
	// 统计指标的管理器
	pm := counter.NewPointCounterManager(cq, metricsMap)
	// 日志job管理器
	lm := logjob.NewLogJobManager(cq)

	ctxAll, cancelAll := context.WithCancel(context.Background())
```

## oklog.run启动任务
```go
var g run.Group
	{
		// Termination handler.
		term := make(chan os.Signal, 1)
		signal.Notify(term, os.Interrupt, syscall.SIGTERM)
		cancelC := make(chan struct{})
		g.Add(

			func() error {
				select {
				case <-term:
					/*
					 */
					logger.Infof("Received SIGTERM, exiting gracefully...")
					cancelAll()
					return nil
				case <-cancelC:
					/*
						1. 如果cancelC读到了数据，说明其他的goroutine出现了错误，通知接收signal的本goroutine退出
					*/
					logger.Infof("other go error server finally exit...")
					return nil
				}
			},
			func(err error) {
				close(cancelC)

			},
		)
	}

	{
		// metrics web handler.
		g.Add(func() error {
			logger.Infof("start web service Listening on address :%v", sConfig.HttpAddr)
			errchan := make(chan error)

			go func() {
				errchan <- metrics.StartMetricWeb(sConfig.HttpAddr)
			}()
			select {
			case err := <-errchan:
				logger.Errorf("msg", "Error starting HTTP server.error:%v ", err)
				return err
			case <-ctxAll.Done():
				logger.Infof("Web service Exit..")
				return nil

			}

		}, func(err error) {
			cancelAll()
		})
	}

	{
		// 统计metrics的模块
		g.Add(func() error {
			err := pm.UpdateManager(ctxAll)
			if err != nil {
				logger.Errorf("PointCounterManager.SetMetricsManager.error:%v", err)
			}

			return err
		}, func(err error) {
			cancelAll()
		})

	}

	{
		// 统计metrics的模块
		g.Add(func() error {
			err := pm.SetMetricsManager(ctxAll)
			if err != nil {
				logger.Errorf("PointCounterManager.SetMetricsManager.error:%v", err)
			}

			return err
		}, func(err error) {
			cancelAll()
		})

	}

	{
		// LogJobManager 同步的模块
		g.Add(func() error {
			err := lm.SyncManager(ctxAll, logjobSyncChan)
			if err != nil {
				logger.Errorf("PointCounterManager.SetMetricsManager.error:%v", err)
			}

			return err
		}, func(err error) {
			cancelAll()
		})

	}

	g.Run()
```

# 启动metrics的http
- 因为srv.ListenAndServe方法不便于使用ctx控制，所以通过一个errChan接收它的错误
```go
	{
		// metrics web handler.
		g.Add(func() error {
			logger.Infof("start web service Listening on address :%v", sConfig.HttpAddr)
			errchan := make(chan error)

			go func() {
				errchan <- metrics.StartMetricWeb(sConfig.HttpAddr)
			}()
			select {
			case err := <-errchan:
				logger.Errorf("msg", "Error starting HTTP server.error:%v ", err)
				return err
			case <-ctxAll.Done():
				logger.Infof("Web service Exit..")
				return nil

			}

		}, func(err error) {
			cancelAll()
		})
	}
```

# 本节重点总结 :
- 时序统计的结构体对象
- 时序统计结构体的管理者
- metrics结果打点方法

## 29.7 编译运行，读取日志配置看图

# 本节重点介绍 :

- 编译运行，配置采集和大盘

# 编译二进制

- 打包后编译

```shell
go build -o log2metrics main.go
```

# 修改配置文件

```yaml
http_addr: 0.0.0.0:8087
log_level: INFO

log_strategy:
  - metric_name: log_var_log_messages_level_total
    metric_help: /var/log/messages中的日志 total
    file_path: /var/log/messages
    pattern:  ".*"
    func: cnt
    tags:
      level: ".*level=(.*?) .*"

  - metric_name: ngx_acc_code
    metric_help: nginx access日志中的code 数字最大值
    file_path: /var/log/nginx/access.log
    pattern:  '.*\[code=(.*?)\].*'
    func: max

  - metric_name: ngx_acc_code_sum
    metric_help: nginx access日志中的code 数字最大值
    file_path: /var/log/nginx/access.log
    pattern:  '.*\[code=(.*?)\].*'
    func: sum

```

## 修改nginx access log的logfmat

```shell
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '[code=$status] $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

```

# 运行服务

```yaml
./log2metrics 
```

# 查看metrics

- 向nginx日志中追加内容
- ```
  echo "::1 - - [04/Sep/2021:12:21:10 +0800] "GET / HTTP/1.1" [code=504] 4833 "-" "curl/7.29.0" "-"" >> /var/log/nginx/access.log
  ```
- message total

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/4568973b31cd47329e154f79a97b6372.png)

- nginx metrics

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/662f78e0c45449b5b78832a60648eda0.png)

# 配置prometheus采集

```yaml
  - job_name: 'log2metrics'
    honor_timestamps: true
    scrape_interval: 15s
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets:
          - 192.168.3.200:8087
```

# ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/0d1490510d964770a9f4942e96d1d570.png)

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721498000/48e5dcf1daa343a8b2535e5ca5f76bc0.png)

# 配置grafana

# 本节重点总结 :

- 编译运行，配置采集和大盘

