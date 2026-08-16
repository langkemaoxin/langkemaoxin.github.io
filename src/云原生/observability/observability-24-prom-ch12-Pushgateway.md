---
title: Prometheus 第12章：Pushgateway
sidebarGroup: 可观测性
shortTitle: 24 Pushgateway
order: 24
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第12章（Pushgateway）合并笔记
---

> **Prometheus · 第 12 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 12.1 应用场景和部署

# 本节重点介绍 : 
- pushgateway简介
- pushgateway使用场景
    - 说白了就是不能使用pull模型的场景
- 安装部署

# 项目地址 
- https://github.com/prometheus/pushgateway

## 什么情况下使用pushgateway

- https://prometheus.io/docs/practices/pushing/
- Pushgateway的唯一有效用例是捕获服务级别批处理作业的结果
- pull网络不通，但有[替代方案](https://github.com/prometheus-community/PushProx) 

## pushgateway 注意事项
- 不支持带时间戳上报，会被忽略
- 当通过单个Pushgateway监视多个实例时，Pushgateway既成为单个故障点，又成为潜在的瓶颈。
- Prometheus为每个采集的target生成的up指标无法使用
- Pushgateway永远不会删除推送到其中的系列，除非通过Pushgateway的API手动删除了这些系列，否则它们将永远暴露给Prometheus

# 部署 
##  下载pushgateway 
```shell script

wget -O /opt/tgzs/pushgateway-1.4.0.linux-amd64.tar.gz wget https://github.com/prometheus/pushgateway/releases/download/v1.4.0/pushgateway-1.4.0.linux-amd64.tar.gz
```

## 准备service文件
```shell script
cat <<EOF >/opt/tgzs/pushgateway.service
[Unit]
Description=pushgateway server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/pushgateway/pushgateway
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pushgateway
[Install]
WantedBy=default.target
EOF

```

## 使用ansible部署 pushgateway
```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=pushgateway-1.4.0.linux-amd64.tar.gz" -e "app=pushgateway"

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9091
ps -ef |grep pushgateway |grep -v grep 

```

# 本节重点总结 : 
- pushgateway简介
- pushgateway使用场景
    - 说白了就是不能使用pull模型的场景
- 安装部署

## 12.2 使用prometheus-sdk向pushgateway打点

# 本节重点介绍 :

- 使用golang sdk打prometheus4种指标，推送到pushgateway
  - gauge、counter、histogram、summary的初始化
  - 4种类似的设置值的方法
  - 推送到pushgateway的方法
- prometheus配置采集pushgateway，grafana上配大盘

# golang-sdk

- 项目地址 https://github.com/prometheus/client_golang

# 使用sdk打点并推送到pushgateway

### 首先导入包，初始化pusher 推送对象

```go
import (
"github.com/prometheus/client_golang/prometheus/push"
)
var (
	// pusher对象
	pusher *push.Pusher
)
```

### 初始化4种数据metrics对象

```go
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
        // histogram 需要传入 bucket的start 和width参数
		Buckets: prometheus.LinearBuckets(hisStart, histWidth, 20),
	})

	// summary
	TestSummary01 = prometheus.NewSummaryVec(
		prometheus.SummaryOpts{
			Name:       "test_summary_01",
			Help:       "RPC latency distributions.",
			// summary需要固定好最后的分位值结果
			Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
		},
		[]string{"service"},
	)
```

### 编写初始化pusher对象和注册metrics的Init函数

```go
func Init(url string, jobName string) {
	pusher = push.New(url, jobName)
	// collector 注册metrics
	pusher.Collector(TestMetricGauge01)
	pusher.Collector(TestMetricCounter01)
	pusher.Collector(TestHistogram01)
	pusher.Collector(TestSummary01)

}
```

### 编写设置gauge和counter值的函数 setValueGaugeAndCounter

- counter 只能恒增，需要使用Add函数

```go
// gauge和counter设置值的方法
func setValueGaugeAndCounter() {

	for {

		TestMetricGauge01.With(prometheus.Labels{"idc": "bj", "ip": "1.1"}).Set(float64(rand.Intn(100)))
		TestMetricCounter01.With(prometheus.Labels{"path": "/login", "code": "200"}).Add(float64(rand.Intn(100)))
		time.Sleep(5 * time.Second)
	}
}

```

### 编写设置histogram值的函数 setValueHistogram

- histogram 使用Observe函数设置bucket的值

```go
func setValueHistogram() {
	for {
		v := rand.NormFloat64()
		TestHistogram01.Observe(v)

		time.Sleep(100 * time.Millisecond)
	}
}

```

### 编写设置summary值的函数 setValueGaugeAndCounter

- summary使用Observe设置值

```go
// Summary设置值的方法
func setValueSummary() {
	for {
		v := rand.Float64()
		TestSummary01.WithLabelValues("uniform").Observe(v)
		time.Sleep(100 * time.Millisecond)
	}
}

```

### 编写推送到pushgateway的函数

```go
func PushWork() {
	for {

		err := pusher.Push()
		if err != nil {
			fmt.Println("Could not push completion time to Pushgateway:", err)
		}
		time.Sleep(5 * time.Second)
	}

}
```

### main函数启动任务

- 依次启动设置值的协程
- 启动push的协程

```go
func main() {
   
	rand.Seed(time.Now().UnixNano())
	Init("http://172.20.70.205:9091/", "my_job")
	go setValueGaugeAndCounter()
	go setValueHistogram()
	go setValueSummary()
	go PushWork()
	select {}
}

```

## pushgateway中查看对应指标

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511565000/4fea20edf3a34198956de6990cafa9d3.png)

# 将单个pushgateway加入prometheus采集job中

```yaml
  - job_name: 'pushgateway'
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    static_configs:
    - targets:
      - 172.20.70.205:9091
      - 172.20.70.215:9091
```

## 在prometheus查询相关指标

### promql

- histogram histogram_quantile(0.95, sum by(le) (rate(test_histogram_01_bucket[5m])))
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511565000/57b08e765be047efb133a3234ecbab62.png)
- summary  test_summary_01
- counter  rate(test_metric_counter_01[1m])
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511565000/981355923e2c4a00b3c280d4cc328b92.png)
- gauge test_metric_gauge_01

# 在grafana上设置相关图表

## 举例图片

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511565000/9bf266ed538b44ce8566a160d025a192.png)

## grafana json

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 11,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.1",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "test_metric_gauge_01",
          "interval": "",
          "legendFormat": "",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "test_metric_gauge_01",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 3,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.1",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "rate(test_metric_counter_01[1m])",
          "interval": "",
          "legendFormat": "",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "qps",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 9
      },
      "hiddenSeries": false,
      "id": 4,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.1",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "histogram_quantile(0.95, sum by(le) (rate(test_histogram_01_bucket[5m])))",
          "interval": "",
          "legendFormat": "",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "histogram 分位置",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": null,
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 12,
        "y": 9
      },
      "hiddenSeries": false,
      "id": 5,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.1",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "test_summary_01",
          "interval": "",
          "legendFormat": "",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "summary 分位值",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "10s",
  "schemaVersion": 27,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-30m",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "自打点pushgatway指标",
  "uid": "Kqdgmyn7k",
  "version": 2
}
```

# 全量代码

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

	// pusher对象
	pusher *push.Pusher
)

func Init(url string, jobName string) {
	pusher = push.New(url, jobName)
	// collector 注册metrics
	pusher.Collector(TestMetricGauge01)
	pusher.Collector(TestMetricCounter01)
	pusher.Collector(TestHistogram01)
	pusher.Collector(TestSummary01)

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

func PushWork() {
	for {

		err := pusher.Push()
		if err != nil {
			fmt.Println("Could not push completion time to Pushgateway:", err)
		}
		time.Sleep(5 * time.Second)
	}

}
func main() {
	rand.Seed(time.Now().UnixNano())
	Init("http://172.20.70.205:9091/", "my_job")
	go setValueGaugeAndCounter()
	go setValueHistogram()
	go setValueSummary()
	go PushWork()
	select {}
}

```

# 本节重点总结 :

- 使用golang sdk打prometheus4种指标，推送到pushgateway
  - gauge、counter、histogram、summary的初始化
  - 4种类似的设置值的方法
  - 推送到pushgateway的方法
- prometheus配置采集pushgateway，grafana上配大盘

