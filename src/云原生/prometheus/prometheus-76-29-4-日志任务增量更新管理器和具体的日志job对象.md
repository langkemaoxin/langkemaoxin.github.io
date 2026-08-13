---
title: "29.4 日志任务增量更新管理器和具体的日志job对象"
sidebarGroup: "Prometheus"
shortTitle: "76 29.4 日志任务增量更新管理器和具体的日志..."
order: 76
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 日志任务增量更新管理器 - 具体的日志job对象 - 读取日志的reader对象 日志任务增量更新管理器和具体的日志job对象 日志任务增量更新管理器 - 位置 logjob/m..."
---

> **Prometheus · 第 76 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

