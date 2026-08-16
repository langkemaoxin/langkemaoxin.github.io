---
title: Prometheus 第24章：Target 与高基数
sidebarGroup: 可观测性
shortTitle: 36 Target 与高基数
order: 36
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第24章（Target 与高基数）合并笔记
---

> **Prometheus · 第 24 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 24.1 prometheus-exporter管理

# 本节重点介绍 :

- exporter 流派

  - 必须和探测对象部署在一起的
  - 1对多的远端探针模式
- exporter管控的难点

  - 1对1 的exporter 需要依托诸如 ansible等节点管理工具 ，所以应该尽量的少
- 1对1的exporter改造成探针型的通用思路

# exporter 流派

## 必须和探测对象部署在一起的

- 可以理解为1对1 的sidecar模式
- 典型的例子如
  - [node_exporter](https://github.com/prometheus/node_exporter)
  - [process-exporter](https://github.com/ncabatoff/process-exporter)

## 1对多的远端探针模式

- 典型的例子如
  - [blackbox_exporter](https://github.com/prometheus/blackbox_exporter)
  - [redis_exporter](https://github.com/oliver006/redis_exporter)
  - [snmp_exporter](https://github.com/prometheus/snmp_exporter)

# exporter管控的难点

- exporter的数量应该尽量少

## 1对1 的exporter 管理上的问题

- 1对1 的exporter的安装和管理是很大的问题
- 需要依托诸如 ansible等节点管理工具

## 探针型exporter的优点

- 只需要管理有限的探针节点
- 被探测的目标可以通过http参数传递给探针

### 比如redis-exporter的多实例配置

```yaml
  - job_name: 'redis_exporter'
    static_configs:
      - targets:
        - redis://redis01:6379
        - redis://redis02:6379
    metrics_path: /scrape
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: redis_exporter01:9121
```

### 比如改造后的mysqld-exporter 多实例配置

```yaml

  - job_name: 'mysql_exporter'
    metrics_path: /probe
    static_configs:
      - targets:
        - user1:pass1@tcp(mysql1:port1)/
        - user2:pass2@tcp(mysql2:port2)/

    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_dsn
      - source_labels: [__param_dsn]
        target_label: instance
        regex: .*tcp\((.*?)\).*
        replacement: $1
        action: replace

      - target_label: __address__
        replacement: localhost:9104 # 修改后的mysqld_exporter地址
```

## 将所有 1对1的exporter改造成探针型的收益

- 只要有维护少量的探针进程
- 所有的target都由prometheus通过http传参调用 exporter
- target的更新只需要在prometheus侧变更即可，可以和服务发现联动

# 1对1的exporter改造成探针型的通用思路

- 在8.3 我们修改mysqld_exporter源码 ，改造成类似blackbox的探针型，实现一对多探测

### 1. 添加/probe 探针处理handler ProbeHandler

```go
	http.HandleFunc("/probe", func(w http.ResponseWriter, r *http.Request) {

		ProbeHandler(w, r)

	})
```

### 2. 编写具体的ProbeHandler

- 解析http 中的target参数
- 用target初始化对应的exporter对象
- 初始化prometheus http Handler

```go
func ProbeHandler(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")

	mysqlExp := New(r.Context(), dsn, metrics, scrapers, logger)
	registry := prometheus.NewRegistry()
	registry.MustRegister(mysqlExp)
	h := promhttp.HandlerFor(registry, promhttp.HandlerOpts{})
	h.ServeHTTP(w, r)
}
```

### 3. 传参时调用对应exporter对象的 collect方法

- 通常是创建一个连接对象
- 然后执行 诸如info命令的采集任务即可

# 本节重点介绍 :

- exporter 流派

  - 必须和探测对象部署在一起的
  - 1对多的远端探针模式
- exporter管控的难点

  - 1对1 的exporter 需要依托诸如 ansible等节点管理工具 ，所以应该尽量的少
- 1对1的exporter改造成探针型的通用思路

## 24.2 prometheus target管理

# 本节重点介绍 :

- target 状态页面字段解析
- target 采集失败常见原因分析
- target 状态接口源码分析
- 脚本获取target存活情况和失败原因

# target 状态页面字段解析

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111419000/9ebe8e6c10eb42c0a3dbafbb34eb6c34.png)

## endpoint 采集完整的地址

- 有协议
- host
- port
- path
- http参数
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111419000/eb26f69f7a9346ffa9500488c5f0addd.png)

## State 状态

- HealthUnknown TargetHealth = "unknown"
- HealthGood    TargetHealth = "up"
- HealthBad     TargetHealth = "down"

## Labels 标签组

- 举例

## Last Scrape 上一次采集的时间

## Scrape Duration 上一次采集耗时

## Error 错误

# 常见采集错误分类

- metrics_invalid_utf_8 代表metrics中打点含有非法字符串![invalid_metrics.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111419000/98e95385b5554d02a08e7ba442b0bc11.png)
- conn_timeout 连接超时
- ctx_deadline 采集超时
- conn_refused 连接拒绝，多见于端口不对
- 403 forbidden service account权限不对
- other

# 通过接口获取target存活情况和失败原因

- 接口地址 http://${​prometheus_ip}/api/v1/targets

## 源码解析

- 路由地址 D:\go_path\src\github.com\prometheus\prometheus\web\api\v1\api.go

```go
r.Get("/targets", wrap(api.targets))
```

- 处理函数，通过 targetRetriever获取采集的target详情

```go
func (api *API) targets(r *http.Request) apiFuncResult {
	sortKeys := func(targets map[string][]*scrape.Target) ([]string, int) {
		var n int
		keys := make([]string, 0, len(targets))
		for k := range targets {
			keys = append(keys, k)
			n += len(targets[k])
		}
		sort.Strings(keys)
		return keys, n
	}

	flatten := func(targets map[string][]*scrape.Target) []*scrape.Target {
		keys, n := sortKeys(targets)
		res := make([]*scrape.Target, 0, n)
		for _, k := range keys {
			res = append(res, targets[k]...)
		}
		return res
	}

	state := strings.ToLower(r.URL.Query().Get("state"))
	showActive := state == "" || state == "any" || state == "active"
	showDropped := state == "" || state == "any" || state == "dropped"
	res := &TargetDiscovery{}

	if showActive {
		targetsActive := api.targetRetriever(r.Context()).TargetsActive()
		activeKeys, numTargets := sortKeys(targetsActive)
		res.ActiveTargets = make([]*Target, 0, numTargets)

		for _, key := range activeKeys {
			for _, target := range targetsActive[key] {
				lastErrStr := ""
				lastErr := target.LastError()
				if lastErr != nil {
					lastErrStr = lastErr.Error()
				}

				globalURL, err := getGlobalURL(target.URL(), api.globalURLOptions)

				res.ActiveTargets = append(res.ActiveTargets, &Target{
					DiscoveredLabels: target.DiscoveredLabels().Map(),
					Labels:           target.Labels().Map(),
					ScrapePool:       key,
					ScrapeURL:        target.URL().String(),
					GlobalURL:        globalURL.String(),
					LastError: func() string {
						if err == nil && lastErrStr == "" {
							return ""
						} else if err != nil {
							return errors.Wrapf(err, lastErrStr).Error()
						}
						return lastErrStr
					}(),
					LastScrape:         target.LastScrape(),
					LastScrapeDuration: target.LastScrapeDuration().Seconds(),
					Health:             target.Health(),
				})
			}
		}
	} else {
		res.ActiveTargets = []*Target{}
	}
	if showDropped {
		tDropped := flatten(api.targetRetriever(r.Context()).TargetsDropped())
		res.DroppedTargets = make([]*DroppedTarget, 0, len(tDropped))
		for _, t := range tDropped {
			res.DroppedTargets = append(res.DroppedTargets, &DroppedTarget{
				DiscoveredLabels: t.DiscoveredLabels().Map(),
			})
		}
	} else {
		res.DroppedTargets = []*DroppedTarget{}
	}
	return apiFuncResult{res, nil, nil, nil}
}

```

## 做up_rate

- 效果图
- ![target_up_rate.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111419000/d47c438551d3482694aa72cb270e209d.png)

## python 代码分析target

```python
import requests

def print_targets(targets):
    index = 1
    all_num = len(targets)
    up_num = 0
    err_map = {}
    for i in targets:
        scrapeUrl = i.get("scrapeUrl")
        state = i.get("health")
        labels = i.get("labels")
        lastScrape = i.get("lastScrape")
        lastScrapeDuration = i.get("lastScrapeDuration")
        lastError = i.get("lastError")
        if state == "up":
            up_type = "正常"
            up_num += 1
        else:
            up_type = "异常"

            msg = "状态:{} num:{}/{} endpoint:{} state:{} labels:{} lastScrape:{} lastScrapeDuration:{} lastError:{}".format(

                up_type,
                index,
                all_num,
                scrapeUrl,
                state,
                str(labels),
                lastScrape,
                lastScrapeDuration,
                lastError,

            )
            print(msg)
        if lastError != "":
            lastErrorEnds = err_map.get(lastError)
            if not lastErrorEnds:
                lastErrorEnds = []
            lastErrorEnds.append(scrapeUrl)
            err_map[lastError] = lastErrorEnds
        index += 1
    return all_num, up_num, err_map

def get_targets(t):
    try:
        uri = 'http://{}/api/v1/targets'.format(t)
        res = requests.get(uri)

        data = res.json().get("data")
        activeTargets = data.get("activeTargets")
        droppedTargets = data.get("droppedTargets")

        all_num, up_num, err_map = print_targets(activeTargets)
        msg = "[采集器地址:{}][{}/{}][up_rate:{}%][err_detail:{}]".format(
            uri,
            up_num,
            all_num,
            round((up_num / all_num) * 100, 2),
            err_map
        )
        print(msg)

    except Exception as e:
        print(e)

if __name__ == '__main__':
    scrapes = [
        "172.20.70.215:8091",
        "172.20.70.215:9090",
        "172.20.70.205:9090",
    ]
    for i in scrapes:
        get_targets(i)

```

- 打印的成功率日志

```shell
状态:异常 num:6/12 endpoint:https://172.20.70.205:10250/metrics/cadvisor state:down labels:{'beta_kubernetes_io_arch': 'amd64', 'beta_kubernetes_io_os': 'linux', 'instance': 'k8s-master01', 'job': 'kubernetes-nodes-cadvisor',
'kubernetes_io_arch': 'amd64', 'kubernetes_io_hostname': 'k8s-master01', 'kubernetes_io_os': 'linux', 'node': 'k8s-master01'} lastScrape:2021-08-25T03:38:21.869158652Z lastScrapeDuration:0.005617395 lastError:server returned H
TTP status 403 Forbidden
状态:异常 num:7/12 endpoint:https://172.20.70.215:10250/metrics/cadvisor state:down labels:{'beta_kubernetes_io_arch': 'amd64', 'beta_kubernetes_io_os': 'linux', 'instance': 'k8s-node01', 'job': 'kubernetes-nodes-cadvisor', 'k
ubernetes_io_arch': 'amd64', 'kubernetes_io_hostname': 'k8s-node01', 'kubernetes_io_os': 'linux', 'node': 'k8s-node01'} lastScrape:2021-08-25T03:38:04.540106744Z lastScrapeDuration:0.001006507 lastError:server returned HTTP st
atus 403 Forbidden
状态:异常 num:8/12 endpoint:https://172.20.70.215:10250/metrics state:down labels:{'beta_kubernetes_io_arch': 'amd64', 'beta_kubernetes_io_os': 'linux', 'instance': 'k8s-node01', 'job': 'kubernetes-nodes-kubelet', 'kubernetes_
io_arch': 'amd64', 'kubernetes_io_hostname': 'k8s-node01', 'kubernetes_io_os': 'linux'} lastScrape:2021-08-25T03:38:31.86533147Z lastScrapeDuration:0.004654096 lastError:server returned HTTP status 403 Forbidden
状态:异常 num:9/12 endpoint:https://172.20.70.205:10250/metrics state:down labels:{'beta_kubernetes_io_arch': 'amd64', 'beta_kubernetes_io_os': 'linux', 'instance': 'k8s-master01', 'job': 'kubernetes-nodes-kubelet', 'kubernete
s_io_arch': 'amd64', 'kubernetes_io_hostname': 'k8s-master01', 'kubernetes_io_os': 'linux'} lastScrape:2021-08-25T03:38:12.808065193Z lastScrapeDuration:0.001706876 lastError:server returned HTTP status 403 Forbidden

[采集器地址:http://172.20.70.215:8091/api/v1/targets][8/12][up_rate:66.67%][err_detail:{'server returned HTTP status 403 Forbidden': ['https://172.20.70.205:10250/metrics/cadvisor', 'https://172.20.70.215:10250/metrics/cadviso
r', 'https://172.20.70.215:10250/metrics', 'https://172.20.70.205:10250/metrics']}]

[采集器地址:http://172.20.70.215:9090/api/v1/targets][2/2][up_rate:100.0%][err_detail:{}]
状态:异常 num:10/12 endpoint:http://172.20.70.205:9308/metrics state:down labels:{'instance': '172.20.70.205:9308', 'job': 'kafka_exporter'} lastScrape:2021-08-25T11:38:30.871907605+08:00 lastScrapeDuration:0.000469941 lastErr
or:Get "http://172.20.70.205:9308/metrics": dial tcp 172.20.70.205:9308: connect: connection refused

[采集器地址:http://172.20.70.205:9090/api/v1/targets][11/12][up_rate:91.67%][err_detail:{'Get "http://172.20.70.205:9308/metrics": dial tcp 172.20.70.205:9308: connect: connection refused': ['http://172.20.70.205:9308/metrics'
]}]

```

# 本节重点总结 :

- target 状态页面字段解析
- target 采集失败常见原因分析
- target 状态接口源码分析
- 脚本获取target存活情况和失败原因

## 24.3 基于文件的服务发现模式

# 本节重点介绍 :

- 基于文件的服务发现提供了一种配置静态目标的更通用的方法
- 可以摆脱对特定服务发现源的依赖
- 通常的做法是调用内部CMDB的接口获取target数据，打上标签，生成json文件发给prometheus采集

# 基于文件的服务发现模式

# 解决的问题

- 之前手动配置了很多个traget
  - redis
  - mysql
  - blackbox
  - pushgateway
- 手动配置维护成本高，还容易出错

# 基于文件的服务发现配置

- [文档地址](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config)

## 特点

- 基于文件的服务发现提供了一种配置静态目标的更通用的方法
- 并充当了插入自定义服务发现机制的接口。
- 摆脱对特定服务发现源的依赖
- 只要能正确给出 json/yaml文件即可
- 和服务树的最好匹配方案

## yaml文件类型

- yaml

```shell
YAML yaml - targets: [ - '<host>' ] labels: [ <labelname>: <labelvalue> ... ]

```

- 举例

```yaml
- targets:  
  - 172.20.70.205:9100
  - 172.20.70.215:9100
  labels:
    account: "aliyun-01"   
    region: "ap-south-1"
```

## json文件类型

```shell
json [ { "targets": [ "<host>", ... ], "labels": { "<labelname>": "<labelvalue>", ... } }, ... ]
```

- 举例

```json
[
  {
    "targets": [
      "172.20.70.205:9100"
    ],
    "labels": {
      "account": "aliyun-01",
      "region": "ap-south-1",
      "env": "prod",
      "group": "inf",
      "project": "monitor",
      "stree_gpa": "inf.monitor.prometheus"
    }
  },
  {
    "targets": [
      "172.20.70.215:9100"
    ],
    "labels": {
      "account": "aliyun-02",
      "region": "ap-south-2",
      "env": "prod",
      "group": "inf",
      "project": "middleware",
      "stree_gpa": "inf.middleware.kafka"
    }
  }
]
```

### 下面来解读一下

- targets 是一组实例地址的列表
- labels 是这组实例的标签，应用到列表中所有实例
- 如果想每个实例不同的标签，可以将targets列表保留一个实例即可
- 标签可以自定义，下面举几个例子
  - account 代表公有云账户，多账户情况
  - region 代表区域
  - env 代表所属环境 prod代表生产，pre代表预发，test代表测试
  - group代表业务大组
  - project 代表项目
  - stree_gpa 代表服务树三级标签
- 那么prometheus在采集对应target时就会将对应标签打入其metrics中
- 为后续我们按照标签过滤提供方便

## 配置举例

- files 代表 文件路径 支持通配符
- refresh_interval 代表 文件刷新间隔

```yaml
  - job_name: 'node_exporter'
    scrape_interval: 30s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    honor_timestamps: false
    file_sd_configs:
    - files:
      - /opt/app/prometheus/sd/node_exporter.json
      refresh_interval: 5m
```

## 改造为服务发现类型

- 将 blackbox-http 和 node_exporter 改为文件发现
- prometheus 配置

```yaml

  - job_name: 'blackbox-http'
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    scrape_interval: 15s
    scrape_timeout: 10s
    scheme: http
    honor_timestamps: false
    file_sd_configs:
    - files:
      - /opt/app/prometheus/sd/blackbox_http.json
      refresh_interval: 2m
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 172.20.70.205:9115 

  - job_name: 'node_exporter'
    # metrics的path 注意不都是/metrics
    # 传入的参数
    scrape_interval: 30s
    scrape_timeout: 10s
    scheme: http
    honor_timestamps: false
    file_sd_configs:
    - files:
      - /opt/app/prometheus/sd/node_exporter.json
      refresh_interval: 2m

      

```

- 创建sd目录

```shell
mkdir -pv /opt/app/prometheus/sd/
```

- 写入json文件

```shell

cat <<EOF > /opt/app/prometheus/sd/node_exporter.json
[
  {
    "targets": [
      "172.20.70.205:9100"
    ],
    "labels": {
      "name": "prome-master01",
      "account": "aliyun-01",
      "region": "ap-south-1",
      "env": "prod",
      "group": "inf",
      "project": "monitor",
      "stree_gpa": "inf.monitor.prometheus"
    }
  },
  {
    "targets": [
      "172.20.70.215:9100"
    ],
    "labels": {
      "name": "prome-node01",
      "account": "aliyun-02",
      "region": "ap-south-2",
      "env": "prod",
      "group": "inf",
      "project": "middleware",
      "stree_gpa": "inf.middleware.kafka"
    }
  }
]
EOF

cat <<EOF > /opt/app/prometheus/sd/blackbox_http.json
[
  {
    "targets": [
      "172.20.70.205:9115",
      "http://prometheus.io",
      "http://www.baidu.com",
      "https://www.baidu.com"
    ]
  }
]
EOF

```

- reload prometheus
- 观察target页面 和 sd结果页面
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111451000/75a1832bf1214fe28daef40cc163792c.png)
- 修改文件 blackbox_http.json 新增 https://github.com/ 的探测
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111451000/7773cd985f554bd2a99ba8688c5d8d48.png)

```shell
cat <<EOF > /opt/app/prometheus/sd/blackbox_http.json
[
  {
    "targets": [
      "172.20.70.205:9115",
      "http://prometheus.io",
      "http://www.baidu.com",
      "https://www.baidu.com",
      "https://github.com/"
    ]
  }
]
EOF

curl -X POST http://localhost:9090/-/reload

```

# 本节重点总结 :

- 基于文件的服务发现提供了一种配置静态目标的更通用的方法
- 可以摆脱对特定服务发现源的依赖
- 通常的做法是调用内部CMDB的接口获取target数据，打上标签，生成json文件发给prometheus采集

## 24.4 基于consul服务发现模式

# 本节重点介绍 :

- consul 安装
- consul go代码注册服务，注销服务，获取服务
- node_exporter改造为consul服务发现
- 在数量比较大时，在注册服务的时候，关闭check，可以降低consul的压力

# consul 安装

## 准备工作

```shell

# 下载consul
wget -O /opt/tgzs/consul_1.9.4_linux_amd64.zip  https://releases.hashicorp.com/consul/1.9.4/consul_1.9.4_linux_amd64.zip 

cd /opt/tgzs/
unzip consul_1.9.4_linux_amd64.zip

/bin/cp -f consul /usr/bin/

```

## 启动单机版consul

```shell

# 
mkdir  /opt/app/consul

# 准备配置文件
cat <<EOF > /opt/app/consul/single_server.json
{
    "datacenter": "dc1",
    "node_name": "consul-svr-01",
    "server": true,
    "bootstrap_expect": 1,
    "data_dir": "/opt/app/consul/",
    "log_level": "INFO",
    "log_file": "/opt/logs/",
    "ui": true,
    "bind_addr": "0.0.0.0",
    "client_addr": "0.0.0.0",
    "retry_interval": "10s",
    "raft_protocol": 3,
    "enable_debug": false,
    "rejoin_after_leave": true,
    "enable_syslog": false
}
EOF

# 多个ip地址时，将bind_addr 改为一个内网的ip

# 写入service文件
cat <<EOF > /etc/systemd/system/consul.service
[Unit]
Description=consul server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/consul agent  -config-file=/opt/app/consul/single_server.json
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=consul
[Install]
WantedBy=default.target
EOF

# 启动服务
systemctl daemon-reload && systemctl start consul   

systemctl status consul 

```

### 验证访问

- http://localhost:8500/

# node_exporter的job改造为consul的服务发现

## 编写go代码注册服务到consul

### 初始化consul

- 使用包 github.com/hashicorp/consul/api

```go
import (
	"fmt"
	consul "github.com/hashicorp/consul/api"
	"log"
)

type client struct {
	consul *consul.Client
}

func NewConsulClient(addr string) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{consul: c}, nil
}

```

### 编写注册服务方法

- 需要指定参数为
  - 服务的名称
  - 实例地址
  - 实例端口
  - 实例探活path
  - 实例标签map
- check.HTTP 代表使用http类型的check
- 调用 consul.Agent().ServiceRegister(reg)注册服务

```go
// 注册服务
func (c *client) ServiceRegister(srvName, srvHost string, srvPort int, healthyCheckPath string, metaMap map[string]string) error {

	reg := new(consul.AgentServiceRegistration)
	reg.Name = srvName

	thisId := fmt.Sprintf("%s_%d", srvHost, srvPort)
	reg.ID = thisId
	reg.Port = srvPort
	reg.Address = srvHost
	reg.Meta = metaMap
	log.Printf("ServiceRegisterStart :%v", thisId)
	//增加check
	check := new(consul.AgentServiceCheck)
	check.HTTP = fmt.Sprintf("http://%s:%d%s", reg.Address, reg.Port, healthyCheckPath)
	//设置超时 5s。
	check.Timeout = "2s"
	check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}

```

### 编写获取服务信息的方法

- 使用consul.Health().Service获取 passing的服务

```go
// Service return a service
func (c *client) GetService(service, tag string) ([]*consul.ServiceEntry, error) {
	passingOnly := true
	ss, _, err := c.consul.Health().Service(service, tag, passingOnly, nil)
	if len(ss) == 0 && err == nil {
		return nil, fmt.Errorf("service ( %s ) was not found", service)
	}

	return ss, err
}

```

### 编写根据服务id注销服务的方法

```go
// 根据server id注销服务
func (c *client) DeRegister(id string) error {
	return c.consul.Agent().ServiceDeregister(id)
}
```

### 注册node_exporter服务

```go
func main() {
	c, err := NewConsulClient("http://172.20.70.205:8500")
	if err != nil {
		log.Printf("NewConsulClient.err:%v", err)
		return
	}

	nodes := []string{
		"172.20.70.205",
		"172.20.70.215",
	}

	nodeExporterSrv := "node_exporter"
	for _, h := range nodes {
		m := map[string]string{"region": "bj", "cloud": "huawei"}
		err = c.ServiceRegister(nodeExporterSrv, h, 9100, "/", m)
		if err != nil {
			log.Printf("[ServiceRegister.err][srv:%v][host:%v][err:%v]", nodeExporterSrv, h, err)
		} else {
			log.Printf("[ServiceRegister.success][srv:%v][host:%v]", nodeExporterSrv, h)
		}
	}

	ss, err := c.GetService(nodeExporterSrv, "")
	for _, s := range ss {
		log.Printf("[c.GetService][service_id:%v][err:%v]", s.Service.ID, err)
		//c.DeRegister(s.Service.ID)
	}

}

```

### 完整的go代码

```go
package main

import (
	"fmt"
	consul "github.com/hashicorp/consul/api"
	"log"
)

type client struct {
	consul *consul.Client
}

func NewConsulClient(addr string) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{consul: c}, nil
}

// 注册服务
func (c *client) ServiceRegister(srvName, srvHost string, srvPort int, healthyCheckPath string, metaMap map[string]string) error {

	reg := new(consul.AgentServiceRegistration)
	reg.Name = srvName

	thisId := fmt.Sprintf("%s_%d", srvHost, srvPort)
	reg.ID = thisId
	reg.Port = srvPort
	reg.Address = srvHost
	reg.Meta = metaMap
	log.Printf("ServiceRegisterStart :%v", thisId)
	//增加check
	check := new(consul.AgentServiceCheck)
	check.HTTP = fmt.Sprintf("http://%s:%d%s", reg.Address, reg.Port, healthyCheckPath)
	//设置超时 5s。
	check.Timeout = "2s"
	check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}

// 根据server id注销服务
func (c *client) DeRegister(id string) error {
	return c.consul.Agent().ServiceDeregister(id)
}

// Service return a service
func (c *client) GetService(service, tag string) ([]*consul.ServiceEntry, error) {
	passingOnly := true
	ss, _, err := c.consul.Health().Service(service, tag, passingOnly, nil)
	if len(ss) == 0 && err == nil {
		return nil, fmt.Errorf("service ( %s ) was not found", service)
	}

	return ss, err
}

func main() {
	c, err := NewConsulClient("http://172.20.70.205:8500")
	if err != nil {
		log.Printf("NewConsulClient.err:%v", err)
		return
	}

	nodes := []string{
		"172.20.70.205",
		"172.20.70.215",
	}

	nodeExporterSrv := "node_exporter"
	for _, h := range nodes {
		m := map[string]string{"region": "bj", "cloud": "huawei"}
		err = c.ServiceRegister(nodeExporterSrv, h, 9100, "/", m)
		if err != nil {
			log.Printf("[ServiceRegister.err][srv:%v][host:%v][err:%v]", nodeExporterSrv, h, err)
		} else {
			log.Printf("[ServiceRegister.success][srv:%v][host:%v]", nodeExporterSrv, h)
		}
	}

	ss, err := c.GetService(nodeExporterSrv, "")
	for _, s := range ss {
		log.Printf("[c.GetService][service_id:%v][err:%v]", s.Service.ID, err)
		//c.DeRegister(s.Service.ID)
	}

}

```

### 注册服务的结果

> 注册service
>
> ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111474000/ed455ed6c2e74b3da84da575186b0e2b.png)

> 注销服务

## 配置 node_exporter的job为consul服务发现模式

- [配置文档](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#consul_sd_config)
- 配置文件

```yaml
  - job_name: 'node_exporter'
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    consul_sd_configs:
      - server: 172.20.70.205:8500
        services:
          - node_exporter
    relabel_configs:
      - source_labels:  ["__meta_consul_dc"]
        target_label: "dc"
      - separator: ;
        regex: __meta_consul_service_metadata_(.+)
        replacement: $1
        action: labelmap
```

- target页面和service discovery 页面观察服务发现结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111474000/ce4f37df7b9544db9e58cefaa4255190.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111474000/24db7ef8f5df43869f5ead82981c3b76.png)

# 本节重点总结 :

- consul 安装
- consul go代码注册服务，注销服务，获取服务
- node_exporter改造为consul服务发现
- 在数量比较大时，在注册服务的时候，关闭check，可以降低consul的压力

## 24.5 基于http服务发现模式

# 本节重点介绍 :

- http型的服务发现的优点
- 使用go语言编写 http服务发现源
- 将blackbox-http job改造为 http服务发现类型

# 说明

## 对比file_sd的优点

- 不再依赖文件做传输。不需要confd或者ansible copy file的机制
- 直接在服务发现源(CMDB)启动一个接口
- 返回 json的target数据

```shell
[
  {
    "targets": [ "<host>", ... ],
    "labels": {
      "<labelname>": "<labelvalue>", ...
    }
  },
  ...
]
```

## 文档地址

- [http_sd_configs配置文档](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#http_sd_config)

# 编写go的http发现源

## 使用gin启动web

```go
package main

import (
	"flag"
	"github.com/gin-gonic/gin"
	"math/rand"
)

func main() {

	listenAddress := flag.String("addr", ":8001",
		"Address on which to expose metrics and web interface.")
	flag.Parse()
	r := gin.Default()

	r.GET("/prome_http_sd", httpSd)
	r.Run(*listenAddress) // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}

```

## 编写target数据结构

```go
type target struct {
	Targets []string          `json:"targets"`
	Labels  map[string]string `json:"labels"`
}
```

## 编写 httpSd 处理函数

- frn返回一个最大值为n的随机整数
- randMapKeys 作为随机标签的key
- randMapValues 作为随机标签的value
- 遍历nodes切片mock target数据
- 返回targets json数据

```go
func httpSd(c *gin.Context) {

	nodes := []string{
		"172.20.70.205:9115",
		"http://prometheus.io",
		"http://www.baidu.com",
		"https://www.baidu.com",
		"https://github.com/",
	}
	randMapKeys := []string{"arch", "idc", "os", "job"}
	randMapValues := []string{"linux", "beijing", "centos", "arm64"}
	frn := func(n int) int {
		return rand.Intn(n)
	}

	targets := make([]target, 0)
	for _, n := range nodes {
		num := len(randMapKeys)
		m := make(map[string]string, num)
		for i := 0; i < num; i++ {
			m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
		}
		t := target{
			Targets: []string{n},
			Labels:  m,
		}
		targets = append(targets, t)
	}

	c.JSON(200, targets)
}

```

## 完整go代码

```go
package main

import (
	"flag"
	"github.com/gin-gonic/gin"
	"math/rand"
)

func main() {

	listenAddress := flag.String("addr", ":8001",
		"Address on which to expose metrics and web interface.")
	flag.Parse()
	r := gin.Default()

	r.GET("/prome_http_sd", httpSd)
	r.Run(*listenAddress) // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}

type target struct {
	Targets []string          `json:"targets"`
	Labels  map[string]string `json:"labels"`
}

func httpSd(c *gin.Context) {

	nodes := []string{
		"172.20.70.205:9115",
		"http://prometheus.io",
		"http://www.baidu.com",
		"https://www.baidu.com",
		"https://github.com/",
	}
	randMapKeys := []string{"arch", "idc", "os", "job"}
	randMapValues := []string{"linux", "beijing", "centos", "arm64"}
	frn := func(n int) int {
		return rand.Intn(n)
	}

	targets := make([]target, 0)
	for _, n := range nodes {
		num := len(randMapKeys)
		m := make(map[string]string, num)
		for i := 0; i < num; i++ {
			m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
		}
		t := target{
			Targets: []string{n},
			Labels:  m,
		}
		targets = append(targets, t)
	}

	c.JSON(200, targets)
}

```

## 请求接口看返回

```shell
[root@k8s-master01 ~]#  curl -s http://localhost:8001/prome_http_sd |python -m json.tool
[
    {
        "labels": {
            "arch": "linux",
            "idc": "centos",
            "os": "centos"
        },
        "targets": [
            "172.20.70.205:9115"
        ]
    },
    {
        "labels": {
            "arch": "beijing",
            "os": "beijing"
        },
        "targets": [
            "http://prometheus.io"
        ]
    },
    {
        "labels": {
            "arch": "centos",
            "os": "centos"
        },
        "targets": [
            "http://www.baidu.com"
        ]
    },
    {
        "labels": {
            "arch": "beijing",
            "idc": "beijing",
            "os": "linux"
        },
        "targets": [
            "https://www.baidu.com"
        ]
    },
    {
        "labels": {
            "arch": "beijing",
            "idc": "linux"
        },
        "targets": [
            "https://github.com/"
        ]
    }
]
```

# 将blackbox-http job改造为 http服务发现类型

## 修改prometheus配置文件

- 传入http_sd_configs 的url
- 其余relabel配置不变

```yaml
  - job_name: 'blackbox-http-sd'
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    scrape_interval: 15s
    scrape_timeout: 10s
    scheme: http
    honor_timestamps: false
    http_sd_configs:
    - url: http://172.20.70.205:8001/prome_http_sd 
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 172.20.70.205:9115 
```

## 页面观察结果

- target页面
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111501000/36fccd7390284e7d90952ca8ac32086e.png)
- discovery页面
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111501000/659a9acab32f4ab28fe1e5009110716a.png)
- http发现源侧看到的prometheus请求
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111501000/6356878bfeea477da5d0bd0cacdf1c2b.png)

# 本节重点总结 :

- http型的服务发现的优点
- 使用go语言编写 http服务发现源
- 将blackbox-http job改造为 http服务发现类型

## 24.6 监控系统在采集侧对接运维平台

# 本节重点介绍 :

- 监控系统在采集侧对接运维平台
  - 服务树充当监控系统的上游数据提供者
  - 在运维平台上 可以配置采集任务
    - exporter改造成探针型
    - 将给exporter传参和修改prometheus scrape配置等操作页面化

# 监控系统在采集侧对接运维平台

1. 服务树充当监控系统的上游数据提供者
2. 在运维平台上 可以配置采集任务

# 服务树充当监控系统的上游数据提供者

- 服务树提供数据接口，供监控系统查询资源信息
- 通过http/file/consul等服务发现机制将查询到的信息配置到prometheus中
- prometheus采集即可
- 这样所有的资源会打上相关的标签在监控系统中存储

# 运维平台配置采集任务

## 首先应该将prometheus采集器管理成采集池

![.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111525000/efee692faf034a4cb129b16aed14c053.png)

### 创建采集池

> 用户在页面上填写信息

- 采集池的名字
- 池中节点选择
  - 池节点 一对多
  - 一个节点只能属于一个池
- remote_write的地址
- external_label

## 采集任务自助操作

![.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111525000/5be827566d6a4cadaca76f7c66861e4c.png)

- 所有的exporter应该改造为探针型

### 新增采集任务 (以redis为例)

> 用户在采集app页面上点击 redis图标

- 如果之前没拉起这个类型的探针，就拉起redis_exporter进程
- 选择采集池
- 填写采集任务的名称job_name
- 填写采集间隔
- 选择是服务发现类型还是静态类型
  - 配置target目标列表
  - 服务发现配置

# 本节重点总结 :

- 监控系统在采集侧对接运维平台
  - 服务树充当监控系统的上游数据提供者
  - 在运维平台上 可以配置采集任务
    - exporter改造成探针型
    - 将给exporter传参和修改prometheus scrape配置等操作页面化

