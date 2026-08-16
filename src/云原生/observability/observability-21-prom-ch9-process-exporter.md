---
title: Prometheus 第9章：process-exporter
sidebarGroup: 可观测性
shortTitle: 21 process-exporter
order: 21
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第9章（process-exporter）合并笔记
---

> **Prometheus · 第 9 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 9.1 使用ansible部署process-exporter

# 本节重点介绍 : 
- ansible 部署二进制 process-exporter

## 项目地址 
- 项目地址 https://github.com/ncabatoff/process-exporter
## 下载地址 
```shell script
wget -O  /opt/tgzs/process-exporter-0.7.5.linux-amd64.tar.gz https://github.com/ncabatoff/process-exporter/releases/download/v0.7.5/process-exporter-0.7.5.linux-amd64.tar.gz

```

## 准备配置文件 process-exporter.yaml
- 指定采集进程的方式，下面的例子代表所有cmdline
```shell script
mkdir /opt/app/process-exporter
cat <<EOF >/opt/app/process-exporter/process-exporter.yaml
process_names:
  - name: "{{.Comm}}"
    cmdline:
    - '.+'
EOF

```

##  使用ansible部署 process-exporter
- 准备 service文件
```shell script
cat <<EOF> process-exporter.service
[Unit]
Description=process-exporter Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/process-exporter/process-exporter -config.path=/opt/app/process-exporter/process-exporter.yaml
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=process-exporter
[Install]
WantedBy=default.target
EOF
```
- 执行ansible-playbook

```shell script
ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=process-exporter-0.7.5.linux-amd64.tar.gz" -e "app=process-exporter"
```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9256
ps -ef |grep process-exporter |grep -v grep 

```

# 本节重点总结 : 
- ansible 部署二进制 process-exporter

## 9.2 grafana 上导入模板看图并讲解告警

# 本节重点介绍 :

- 添加到prometheus采集配置中
- grafana 上导入process-exporter dashboard
- 重点指标讲解

# 添加到prometheus采集配置中

```yaml
  - job_name: 'process-exporter'
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets:
		- process-exporter01:9256
		- process-exporter02:9256
```

# grafana 上导入process-exporter dashboard

- 地址 https://grafana.com/grafana/dashboards/4202
- 备选 https://grafana.com/grafana/dashboards/10317

  - 变量替换
  - label_values(namedprocess_namegroup_num_procs, instance)
  - label_values(namedprocess_namegroup_cpu_seconds_total{​instance=~"$host"},groupname)
- 举例图片

# 重点指标讲解

- 进程个数 namedprocess_namegroup_num_procs
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511262000/2eebf7a289e2406aa6ac79f29d4ec0dc.png)
- 进程cpu用户态使用秒数 sum by( groupname)  rate(namedprocess_namegroup_cpu_seconds_total{​groupname=~".+"}[10m])
- 疑似结论是 100毫秒对应1个核？
- 常驻内存 namedprocess_namegroup_memory_bytes{​groupname=~".+", memtype="resident"}
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511262000/5ad03670a35c4739b5a0ac3c2d3bd952.png)
- 读io rate(namedprocess_namegroup_read_bytes_total{​groupname=~".+"}[5m])
- 写io rate(namedprocess_namegroup_write_bytes_total{​groupname=~".+"}[5m])

# 本节重点总结 :

- 添加到prometheus采集配置中
- grafana 上导入process-exporter dashboard
- 重点指标讲解

## 9.3 查看源码，讲解采集原理

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

