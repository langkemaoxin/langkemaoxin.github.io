---
title: "9.3 查看源码，讲解采集原理"
sidebarGroup: "Prometheus"
shortTitle: "169 9.3 查看源码，讲解采集原理"
order: 169
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 分析主流程源码 - cpu使用时间采集源码查看 - cpu使用时间和cpu利用率的关系 分析源码流程 创建ProcessCollector对象 - 代码位置 D:\go_path..."
---

> **Prometheus · 第 169 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- 分析主流程源码
- cpu使用时间采集源码查看
- cpu使用时间和cpu利用率的关系

# 分析源码流程
## 创建ProcessCollector对象 
- 代码位置 D:\go_path\pkg\mod\github.com\ncabatoff\process-exporter@v0.7.5\cmd\process-exporter\main.go
```go
	pc, err := NewProcessCollector(
		ProcessCollectorOption{
			ProcFSPath:  *procfsPath,
			Children:    *children,
			Threads:     *threads,
			GatherSMaps: *smaps,
			Namer:       matchnamer,
			Recheck:     *recheck,
			Debug:       *debug,
		},
	)
```
- NewProcessCollector方法中 创建/proc文件系统对象，为采集最准备
```go
fs, err := proc.NewFS(options.ProcFSPath, options.Debug)

```
- p.start开启采集主流程
```go

func (p *NamedProcessCollector) start() {
	for req := range p.scrapeChan {
		ch := req.results
		p.scrape(ch)
		req.done <- struct{}{}
	}
}
```
- p.scrapeChan 会在Collect中接受来自 Describe中的待采集的指标
```go
func (p *NamedProcessCollector) Collect(ch chan<- prometheus.Metric) {
	req := scrapeRequest{results: ch, done: make(chan struct{})}
	p.scrapeChan <- req
	<-req.done
}
```

- 采集动作 p.scrape，通过p.Update拿到/proc文件系统中的结果
```go
permErrs, groups, err := p.Update(p.source.AllProcs())
```
- 然后遍历赋值即可
```go
		for gname, gcounts := range groups {
			ch <- prometheus.MustNewConstMetric(numprocsDesc,
				prometheus.GaugeValue, float64(gcounts.Procs), gname)
			ch <- prometheus.MustNewConstMetric(membytesDesc,
				prometheus.GaugeValue, float64(gcounts.Memory.ResidentBytes), gname, "resident")
			ch <- prometheus.MustNewConstMetric(membytesDesc,
        }
```

## cpu采集和利用率
- p.scrape函数中 namedprocess_namegroup_cpu_seconds_total user对应 CPUUserTime，system对应CPUSystemTime
```go
			ch <- prometheus.MustNewConstMetric(cpuSecsDesc,
				prometheus.CounterValue, gcounts.CPUUserTime, gname, "user")
			ch <- prometheus.MustNewConstMetric(cpuSecsDesc,
				prometheus.CounterValue, gcounts.CPUSystemTime, gname, "system")
```
- getStat通过读取 /proc/stat文件获取到对应的counter指标，代码位置D:\go_path\pkg\mod\github.com\ncabatoff\process-exporter@v0.7.5\proc\read.go 
```go
func (p *proccache) getStat() (procfs.ProcStat, error) {
	if p.stat == nil {
		stat, err := p.Proc.NewStat()
		if err != nil {
			return procfs.ProcStat{}, err
		}
		p.stat = &stat
	}

	return *p.stat, nil
}

```
- GetCounts中对CPUUserTime计算方式为 /proc/stat文件中的第二列 cpu_user/userHZ ,userHZ=100
```go
func (p proc) GetCounts() (Counts, int, error) {
    // 忽略一些细节
    	return Counts{
    		CPUUserTime:           float64(stat.UTime) / userHZ,
    		CPUSystemTime:         float64(stat.STime) / userHZ,}
}
```

- 也就是cpu利用率可以用rate(namedprocess_namegroup_cpu_seconds_total)*100得到
```shell script
sum by( groupname) (rate(namedprocess_namegroup_cpu_seconds_total{groupname=~"$processes", instance="$host"}[$interval])) * 100

```
- 100毫秒对应1个核

# 本节重点介绍 : 
- 分析主流程源码
- cpu使用时间采集源码查看
- cpu使用时间和cpu利用率的关系

