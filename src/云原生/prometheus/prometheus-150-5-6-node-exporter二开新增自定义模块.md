---
title: "5.6 node_exporter二开新增自定义模块"
sidebarGroup: "Prometheus"
shortTitle: "150 5.6 node_exporter二开新增自..."
order: 150
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 自定义一个模块的二开方法 - 自定义一个errLog模块，统计/var/log/message 中的错误日志 自定义一个模块的二开方法 - collect/目录下新建一个 err..."
---

> **Prometheus · 第 150 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- 自定义一个模块的二开方法
- 自定义一个errLog模块，统计/var/log/message 中的错误日志

# 自定义一个模块的二开方法
- collect/目录下新建一个 errlog.go

- 定义一个结构体体errLogCollector
```go
type errLogCollector struct {
	logger log.Logger
}
```

- 写一个new xxCollector的工厂函数，一个参数为 log.logger
```go
func NewErrLogCollector(logger log.Logger) (Collector, error) {
	return &errLogCollector{logger}, nil
}

```

- 写一个 init方法调用 registerCollector 注册自己
```go
const (
	errLogSubsystem = "errlog"
)
func init() {
	registerCollector(errLogSubsystem, defaultEnabled, NewErrLogCollector)
}
```

- 给这个结构体绑定一个Update方法，签名如下

```go
func (c *xxCollector) Update(ch chan<- prometheus.Metric) error {}
```

# 完成这个Update方法
## 流程说明
- 分析 日志文件
    - $5是app的名字
    - 有info error等level字段
```shell script
Aug 15 09:54:02 prome-master01 containerd: time="2021-08-15T09:54:02.839718531+08:00" level=info msg="ExecSync for \"cedb3c6d71c0422dfe95d16b242fd08e78096606f1f9614e945cc99581b92f92\" returns with exit code 1"

```

- 执行awk可以得到一个日志文件中错误日志按app name进行分布的结果
```shell script
grep -i error /var/log/messages-20210814 |awk '{a[$5]++}END{for(i in a) print i,a[i]}'
telegraf: 3872
pushgateway: 2
kubelet: 16822
containerd: 9350
kernel: 5
grafana-server: 10

``` 

## 新增一个执行shell命令的函数
```shell script
func errLogGrep() string {
	errLogCmd := `grep -i error /var/log/messages |awk '{a[$5]++}END{for(i in a) print i,a[i]}'`
	cmd := exec.Command("sh", "-c", errLogCmd)
	output, _ := cmd.CombinedOutput()
	return string(output)

}
```
## 然后在Update中按行遍历
- 按行遍历之后再按 :分割就能得到 appname 和value
- 然后将name中的 - 替换为_
- value 字符串转换为int
- 然后构建一个 metric对象塞入ch中即可
```go
func (c *errLogCollector) Update(ch chan<- prometheus.Metric) error {
	var metricType prometheus.ValueType
	metricType = prometheus.GaugeValue
	output := errLogGrep()
	for _, line := range strings.Split(output, "\n") {
		l := strings.Split(line, ":")
		if len(l) != 2 {
			continue
		}
		name := strings.TrimSpace(l[0])
		value := strings.TrimSpace(l[1])
		v, _ := strconv.Atoi(value)
		name = strings.Replace(name, "-", "_", -1)
		level.Debug(c.logger).Log("msg", "Set errLog", "name", name, "value", value)

		ch <- prometheus.MustNewConstMetric(
			prometheus.NewDesc(
				prometheus.BuildFQName(namespace, errLogSubsystem, name),
				fmt.Sprintf("/var/log/message err log %s.", name),
				nil, nil,
			),
			metricType, float64(v),
		)
	}
	return nil
}
```

# 运行我们的程序
- 打包
- 编译  go build -v  node_exporter.go
- 然后运行 ./node_exporter  --web.listen-address=":9101"
- 查询errlog metrics
```shell script
[root@prome-master01 tgzs]# curl -s localhost:9101/metrics |grep node_errlog
# HELP node_errlog_containerd /var/log/message err log containerd.
# TYPE node_errlog_containerd gauge
node_errlog_containerd 9350
# HELP node_errlog_grafana_server /var/log/message err log grafana_server.
# TYPE node_errlog_grafana_server gauge
node_errlog_grafana_server 10
# HELP node_errlog_kernel /var/log/message err log kernel.
# TYPE node_errlog_kernel gauge
node_errlog_kernel 5
# HELP node_errlog_kubelet /var/log/message err log kubelet.
# TYPE node_errlog_kubelet gauge
node_errlog_kubelet 16822
# HELP node_errlog_pushgateway /var/log/message err log pushgateway.
# TYPE node_errlog_pushgateway gauge
node_errlog_pushgateway 2
# HELP node_errlog_telegraf /var/log/message err log telegraf.
# TYPE node_errlog_telegraf gauge
node_errlog_telegraf 3872
```

# 完整的errlog.go
```go
// Copyright 2015 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// +build darwin linux openbsd
// +build !nomeminfo

package collector

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	errLogSubsystem = "errlog"
)

type errLogCollector struct {
	logger log.Logger
}

func init() {
	registerCollector(errLogSubsystem, defaultEnabled, NewErrLogCollector)
}

// NewMeminfoCollector returns a new Collector exposing memory stats.
func NewErrLogCollector(logger log.Logger) (Collector, error) {
	return &errLogCollector{logger}, nil
}

func errLogGrep() string {
	errLogCmd := `grep -i error /var/log/messages |awk '{a[$5]++}END{for(i in a) print i,a[i]}'`
	cmd := exec.Command("sh", "-c", errLogCmd)
	output, _ := cmd.CombinedOutput()
	return string(output)

}

// Update calls (*meminfoCollector).getMemInfo to get the platform specific
// memory metrics.
func (c *errLogCollector) Update(ch chan<- prometheus.Metric) error {
	var metricType prometheus.ValueType
	metricType = prometheus.GaugeValue
	output := errLogGrep()
	for _, line := range strings.Split(output, "\n") {
		l := strings.Split(line, ":")
		if len(l) != 2 {
			continue
		}
		name := strings.TrimSpace(l[0])
		value := strings.TrimSpace(l[1])
		v, _ := strconv.Atoi(value)
		name = strings.Replace(name, "-", "_", -1)
		level.Debug(c.logger).Log("msg", "Set errLog", "name", name, "value", value)

		ch <- prometheus.MustNewConstMetric(
			prometheus.NewDesc(
				prometheus.BuildFQName(namespace, errLogSubsystem, name),
				fmt.Sprintf("/var/log/message err log %s.", name),
				nil, nil,
			),
			metricType, float64(v),
		)
	}
	return nil
}

```

# 本节重点总结 : 
- 自定义一个模块的二开方法
- 自定义一个errLog模块，统计/var/log/message 中的错误日志

