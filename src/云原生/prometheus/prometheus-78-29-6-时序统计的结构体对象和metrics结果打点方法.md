---
title: 29.6 时序统计的结构体对象和metrics结果打点方法
sidebarGroup: Prometheus
shortTitle: 78 29.6 时序统计的结构体对象和metric...
order: 78
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 时序统计的结构体对象 - 时序统计结构体的管理者 - metrics结果打点方法 时序统计的结构体对象 - 位置 counter/counter.go go //统计的实体 ty...'
---

> **Prometheus · 第 78 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

