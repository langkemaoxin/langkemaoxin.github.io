---
title: 28.4 编译运行测试效果
sidebarGroup: Prometheus
shortTitle: 72 28.4 编译运行测试效果
order: 72
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '使用指南 安装 shell 自行编译 build go build -o dynamic-sharding main.go 修改配置文件 - 补充dynamic-sharding.yml中的信息: y...'
---

> **Prometheus · 第 72 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

