---
title: 29.3 准备工作，编写配置文件，解析配置，校验正则，设置log
sidebarGroup: Prometheus
shortTitle: 75 29.3 准备工作，编写配置文件，解析配置，...
order: 75
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 新建项目 log2metrics - 编写配置文件yaml - main 解析配置，校验正则，设置log - 根据配置文件设置metrics 新建项目 log2metrics g...'
---

> **Prometheus · 第 75 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

