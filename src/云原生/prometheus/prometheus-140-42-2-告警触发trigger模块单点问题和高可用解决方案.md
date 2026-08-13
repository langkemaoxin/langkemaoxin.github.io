---
title: 42.2 告警触发trigger模块单点问题和高可用解决方案
sidebarGroup: Prometheus
shortTitle: 140 42.2 告警触发trigger模块单点问题...
order: 140
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - prometheus告警trigger单点问题 - trigger模型简化 海量的job交给有限的work执行 - 动态分片方案 - 改造之前的prome-shard代码 tri...'
---

> **Prometheus · 第 140 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- prometheus告警trigger单点问题
- trigger模型简化 海量的job交给有限的work执行
- 动态分片方案
- 改造之前的prome-shard代码

# trigger单点问题
- 我们知道prometheus 如果配置了rule就充当trigger角色了

- prometheus实例可以用来做下列用途

|  对应的配置段   | 用途|
|  ----  | ----  | 
| 采集配置段	| 做采集器，数据保存在本地|
| 采集配置段 + 远程写入段| 做采集器+传输器，数据保存在本地+远端存储|
| 远程查询段| 做查询器，查询远端存储数据|
| 采集配置段 + 远程查询段| 做采集器+查询器，查询本地数据+远端存储数据 |
| 采集配置段 + Alertmanager信息段 + 告警配置文件段 | 做采集器+告警触发器，查询本地数据生成报警发往Alertmanager |
| 远程查询段 + Alertmanager信息段 + 告警配置文件段 | 做远程告警触发器，查询远端数据生成报警发往Alertmanager |
| 远程查询段+远程写入段  + 预聚合配置文件段 | 做预聚合指标，生成的结果集指标写入远端存储 |

## trigger模型简化 海量的job交给有限的work执行
- job就相当于用户配置的rule规则，规则的触发
- 海量的意思是，规则非常多
- 那么交给一个work执行就会有单点问题
- 解决方案就是静态分片和动态分片

# 静态分片解决方案
- 通过confd分片
- 具体方案可以看41.4章节
## 静态分片方案弊端
- 还是老问题，某个分片挂了之后没有其它分片接管
- 损失1/n的job

# 动态分片方案

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111890000/b21b8e5851d347169f9f614b28aa7773.png)

> 需要解决下面的问题

- 如何解决静态分片中分片挂掉的问题
- 如何统一采集器配置
- 如何将采集的target分发给采集器
- 如何降低分片变化是target的迁移

# 改造我们之前的prome-shard代码 27.9章

## 扩展target字段
- D:\go_path\src\prome-shard\target\target.go
- 添加alert rule所需要的
- 并添加Type字段用于判断类型
- json和yaml不需要的字段 在标签中 设置为 -，避免后面写文件有多余的字段
```go
package target

import (
	"prome-shard/common"
)

type ScrapeTarget struct {
	Type             string            `json:"-" yaml:"-"`
	Targets          []string          `json:"targets" yaml:"-"`
	Labels           map[string]string `json:"labels" yaml:"-"`
	AlertName        string            `yaml:"alert,omitempty" json:"-"`       //alert name
	Expr             string            `yaml:"expr" json:"-"`                  // alert表达式
	For              string            `yaml:"for,omitempty" json:"-"`         // alert for 时间
	AlertLabels      map[string]string `yaml:"labels,omitempty" json:"-"`      // alert的标签
	AlertAnnotations map[string]string `yaml:"annotations,omitempty" json:"-"` //alert的注释map
}

var (
	AvaiableGetTargetFuncs = map[string]GetTargetFunc{
		common.ScrapePromeJobPrefix + "node_exporter": GetTargetNodeExporter,
		common.ScrapePromeJobPrefix + "get_alert":     GetTargetAlertRule,
	}
)

type GetTargetFunc func() []ScrapeTarget

```

## 添加获取alert 的func
- D:\go_path\src\prome-shard\target\get_alert.go
```go
package target

import (
	"fmt"
	"math/rand"
	"prome-shard/common"
)

func GetTargetAlertRule() []ScrapeTarget {

	qls := []string{
		`node_cpu_seconds_total >0`,
		`node_memory_Active_bytes !=0`,
		`node_load1 * 100 > 10`,
		`node_disk_writes_completed_total>0`,
	}

	randMapKeys := []string{"arch", "idc", "os", "job"}
	randMapValues := []string{"linux", "beijing", "centos", "arm64"}
	frn := func(n int) int {
		return rand.Intn(n)
	}

	targets := make([]ScrapeTarget, 0)
	for index, ql := range qls {
		num := len(randMapKeys)
		m := make(map[string]string, num)
		for i := 0; i < num; i++ {
			m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
		}
		t := ScrapeTarget{

			Type:        common.TargetAlert,
			Expr:        ql,
			For:         "10s",
			AlertName:   fmt.Sprintf("test_alert_name_%d", index),
			AlertLabels: m,
		}
		targets = append(targets, t)
	}
	return targets
}

```
## 修改Dispath函数，根据类型做判断
- 如果是alert的就用 name做hash
- 如果是 scrape就用 ip做hash
- 配置文件中新添加最后写文件的类型，json或者yaml
```go
func (this *ShardService) Dispatch() {
	// 执行这个对应的获取target函数
	targets := this.TargetGetFunc()
	if len(targets) == 0 {
		level.Warn(this.logger).Log("msg", "Dispatch.empty.targets")
		return
	}
	// 先初始化一个map ，key是 节点，value是分配给这个节点的targets
	nodeMap := make(map[string][]target.ScrapeTarget)

	// 遍历target，
	for _, t := range targets {

		switch t.Type {
		case common.TargetScrape:
			t := t
			if len(t.Targets) != 1 {
				continue
			}
			// 对target的地址 在哈希环中寻找节点
			// 要求每个target的地址都是1个
			// 然后根据node塞入map中
			node := this.GetNode(t.Targets[0])

			preTs, loaded := nodeMap[node]
			if !loaded {
				preTs = make([]target.ScrapeTarget, 0)

			}
			preTs = append(preTs, t)
			nodeMap[node] = preTs
		case common.TargetAlert:
			t := t

			// 对target的地址 在哈希环中寻找节点
			// 要求每个target的地址都是1个
			// 然后根据node塞入map中
			node := this.GetNode(t.AlertName)

			preTs, loaded := nodeMap[node]
			if !loaded {
				preTs = make([]target.ScrapeTarget, 0)

			}
			preTs = append(preTs, t)
			nodeMap[node] = preTs
		}

	}
	index := 1
	allNum := len(nodeMap)
	for node, ts := range nodeMap {
		// 拼接一个json文件的名字
		// 服务名_节点ip_索引_分片总数_target总数.json
		dstFileName := ""
		// 写json文件
		switch this.FileType {
		case "json":
			dstFileName = fmt.Sprintf("%s_%s_%d_%d_%d.json",
				this.SrvName,
				node,
				index,
				allNum,
				len(ts),

			)

			writeJsonFile(dstFileName, ts)
		case "yaml":
			dstFileName = fmt.Sprintf("%s_%s_%d_%d_%d.yaml",
				this.SrvName,
				node,
				index,
				allNum,
				len(ts),

			)
			writeYamlFile(dstFileName, ts)

		}

		extraVars := make(map[string]interface{})
		extraVars["src_sd_file_name"] = dstFileName
		extraVars["dest_sd_file_name"] = this.DestSdFileName
		extraVars["service_port"] = this.Port
		level.Info(this.logger).Log(
			"msg", "goansiblerun.run",

			"this.SrvName", this.SrvName,
			"jsonFileName", dstFileName,
			"node", node,
			"index", index,
			"all", allNum,
			"targetNum", len(ts),

		)
		go goansiblerun.AnsiRunPlay(this.logger, this.SrvName, node, extraVars, this.YamlPath)
		index++
	}

}

```

## 写yaml的函数
```go

type RuleGroup struct {
	Name  string `yaml:"name"`
	Rules []Rule `yaml:"rules"`
}

// Rule describes an alerting or recording rule.
type Rule struct {
	Record      string            `yaml:"record,omitempty"`
	Alert       string            `yaml:"alert,omitempty"`
	Expr        string            `yaml:"expr"`
	For         string            `yaml:"for,omitempty"`
	Labels      map[string]string `yaml:"labels,omitempty"`
	Annotations map[string]string `yaml:"annotations,omitempty"`
}

func writeYamlFile(fileName string, ts []target.ScrapeTarget) {
	gs := make([]RuleGroup, 0)

	for _, t := range ts {
		rules := make([]Rule, 0)
		r := Rule{
			Alert:       t.AlertName,
			Expr:        t.Expr,
			For:         t.For,
			Labels:      t.AlertLabels,
			Annotations: t.AlertAnnotations,
		}

		rules = append(rules, r)
		g := RuleGroup{
			Name:  t.AlertName,
			Rules: rules,
		}
		gs = append(gs, g)
	}

	bs, _ := yaml.Marshal(gs)

	err := ioutil.WriteFile(fileName, bs, 0644)
	fmt.Println(err)
}

```

- yaml文件格式为
```yaml
groups:
- name: test_alert_name_0
  rules:
  - alert: test_alert_name_0
    expr: node_cpu_seconds_total >0
    for: 10s
    labels:
      arch: centos
      idc: linux
      os: linux
- name: test_alert_name_1
  rules:
  - alert: test_alert_name_1
    expr: node_memory_Active_bytes !=0
    for: 10s
    labels:
      os: beijing
- name: test_alert_name_3
  rules:
  - alert: test_alert_name_3
    expr: node_disk_writes_completed_total>0
    for: 10s
    labels:
      arch: beijing
      os: beijing

```

## 修改配置文件，运行
- 新增 scrape_prometheus_get_alert 这个job
- 文件路径设置为 rule/
```yaml
shard_service:
  - name:   scrape_prometheus_node_exporter
    file_type: json
    desc: inf ecs 监控
    nodes:
      - 172.20.70.205
      - 172.20.70.215

    port: 9090
    dest_sd_file_name: file_sd_by_prome_shared.json
    yaml_path: ./copy_file_and_reload_prome.yaml

  - name:   scrape_prometheus_get_alert
    file_type: yaml
    desc: alert rule文件
    nodes:
      - 172.20.70.205
      - 172.20.70.215

    port: 9090
    dest_sd_file_name: ../rule/file_sd_by_prome_shared.yaml
    yaml_path: ./copy_file_and_reload_prome.yaml

http:
  port: 8801
consul_server:
  # consul api 地址
  addr: 172.20.70.205:8500
  username:
  password:

```

# 本节重点总结 :
- prometheus告警trigger单点问题
- trigger模型简化 海量的job交给有限的work执行
- 动态分片方案
- 改造之前的prome-shard代码

