---
title: "29.5 日志消费组和日志正则处理对象AnalysPoint"
sidebarGroup: "Prometheus"
shortTitle: "77 29.5 日志消费组和日志正则处理对象Ana..."
order: 77
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 日志正则消费分析对象 - 日志消费者组存在的意义和对应的方法 - 定义正则分析结果对象AnalysPoint - 编写正则处理方法 日志消费组和日志正则处理对象AnalysPoi..."
---

> **Prometheus · 第 77 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

