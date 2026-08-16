---
title: Prometheus 第13章：Alertmanager
sidebarGroup: 可观测性
shortTitle: 25 Alertmanager
order: 25
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第13章（Alertmanager）合并笔记
---

> **Prometheus · 第 13 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 13.1 alertmanager核心功能点介绍和安装部署

# 本节重点介绍 : 
- alertmanager项目介绍
    - 架构介绍
    - 核心功能点
- 安装部署
    - ui功能介绍
    - 配置文件讲解

# 项目介绍

## 文档地址
- https://prometheus.io/docs/alerting/latest/alertmanager/
- Alertmanager处理由诸如Prometheus服务器之类的客户端应用程序发送的警报

## alertmanager 架构图
- 架构图

## 核心功能点

|  英文   | 中文 | 含义  | 
|  ----  | ----  | ---- | 
| deduplicating	| 重复数据删除 |	prometheus产生同一条报警<br>发送给多个alm去重后发送  |  
| grouping	| 分组  |	告警可以分组处理，同一个组里共享等待时长等参数<br>可以做告警聚合 |  
| route	| 路由  |路由匹配树，可以理解为告警订阅 |  
| silencing 	| 静默  | 灵活的告警静默，如按tag | 
| inhibition  	| 抑制  | 如果某些其他警报已经触发，则抑制某些警报的通知 <br>如机器down，上面的进程down告警不触发| 
| HA  	| 高可用性  | gossip实现 | 
 
# 搭建单机版本
- 准备service文件
```shell script
cat <<EOF > alertmanager.service
[Unit]
Description="alertmanager"
Documentation=https://alertmanager.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/alertmanager/alertmanager  --config.file=/opt/app/alertmanager/alertmanager.yml  --storage.path=/opt/app/alertmanager/data/

Restart=on-failure
RestartSecs=5s
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=alertmanager

[Install]
WantedBy=multi-user.target

EOF
```
- 下载二进制包
```shell script
wget -O /opt/tgzs/alertmanager-0.21.0.linux-amd64.tar.gz https://github.com/prometheus/alertmanager/releases/download/v0.21.0/alertmanager-0.21.0.linux-amd64.tar.gz

```

- ansible部署服务

```shell script
ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=alertmanager-0.21.0.linux-amd64.tar.gz" -e "app=alertmanager"
```

## ui功能介绍 
- 访问ip:9093页面查看
 
## 配置文件讲解

```yaml
global:
  ＃ 如果一个告警不包括EndsAt，经过此时间后，如果尚未更新警报，则可以将警报声明为已恢复。
  ＃ 这对Prometheus的警报没有影响，因为它们始终包含EndsAt。
  resolve_timeout: 5m
  # 默认的httpconfig 如果下面webhook为空的时候用这个
  http_config: {}
  # smtp配置
  smtp_hello: localhost
  smtp_require_tls: true
  # 几个默认支持地址
  pagerduty_url: https://events.pagerduty.com/v2/enqueue
  opsgenie_api_url: https://api.opsgenie.com/
  wechat_api_url: https://qyapi.weixin.qq.com/cgi-bin/
  victorops_api_url: https://alert.victorops.com/integrations/generic/20131114/alert/
route:
  # 代表路由树的默认receiver
  # 匹配不中就走这个
  receiver: web.hook

  # 分组依据，比如按alertname分组
  group_by:
  - alertname
  # 代表新的报警最小聚合时间，第一次来的时候最短间隔
  group_wait: 10s
  # 代表同一个组里面告警聚合时间 同一个group_by 里面不同tag的聚合时间
  
  group_interval: 10s
  # 代表同一个报警(label完全相同)的最小发送间隔
  repeat_interval: 1h
# 抑制规则
# 可以有效的防止告警风暴
# 下面的含义： 当拥有相同 alertname，dev ，instance标签的多条告警触发时
# 如果severity=critical的已出发，抑制severity=warning的
inhibit_rules:
- source_match:
    severity: critical
  target_match:
    severity: warning
  equal:
  - alertname
  - dev
  - instance

# 接受者配置
receivers:
- name: web.hook
  webhook_configs:
  - send_resolved: true
    http_config: {}
    url: http://127.0.0.1:5001/
    max_alerts: 0

# 文本模板
templates: []

```

# 本节重点总结 : 
- alertmanager项目介绍
    - 架构介绍
    - 核心功能点
- 安装部署
    - ui功能介绍
    - 配置文件讲解

## 13.2 编写go程序充当告警触发端和接收端

# 本节重点介绍 :

- 编写go程序充当告警触发端，向alertmanager发送告警
- 编写go程序充当告警接收端，从alertmanager 接收webhook的告警信息

# 发送告警的接口

- 接口地址 https://prometheus.io/docs/alerting/latest/clients/
- 使用的公共库 https://github.com/prometheus/common

## 使用go编写报警发送代码

- 代码

```go
package main

import (
	"bytes"
	"encoding/json"
	"github.com/prometheus/common/model"

	"io/ioutil"
	"log"
	"net/http"
)

func alertSend(alertMUrl string) {
	lables := model.LabelSet{}

	lables["alertname"] = "报警测试"
	lables["group"] = "abc"
	lables["severity"] = "2"
	lables["job"] = "node_exporter"
	anno := model.LabelSet{}
	anno["value"] = "88"
	alerts := make([]*model.Alert, 0)
	a := &model.Alert{
		Labels:       lables,
		Annotations:  anno,
		GeneratorURL: "http://localhost:9090",
	}
	alerts = append(alerts, a)
	jsonStr, _ := json.Marshal(alerts)

	req, err := http.NewRequest("POST", alertMUrl, bytes.NewBuffer(jsonStr))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[http.post.request.err][url:%v][err:%v]", alertMUrl, err)
		return
	}
	defer resp.Body.Close()

	log.Printf("response Status:%v", resp.Status)
	log.Printf("response Headers:%v", resp.Header)
	body, _ := ioutil.ReadAll(resp.Body)
	log.Printf("response Body:%v", string(body))
}

func main() {
	alertMUrl := "http://172.20.70.205:9093/api/v1/alerts"
	alertSend(alertMUrl)

}

```

- 代码解析
  - 构造 github.com/prometheus/common/model中的alert对象，塞入相关字段
  - 使用http post 发送json到alertmanager接口即可

## 运行程序向alertmanager报警

- 查看alertmanager web页面，能看到刚才发送的告警
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511634000/870f85122af144efabd9a0cb45b175a8.png)

# 告警接收端

- 接收webhook的代码

```go
package main

import (
	"errors"
	"flag"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/alertmanager/notify/webhook"
	"log"
)

func main() {

	listenAddress := flag.String("addr", ":5001",
		"Address on which to expose metrics and web interface.")
	flag.Parse()
	r := gin.Default()

	r.POST("/alert", alertReceive)
	r.Run(*listenAddress) // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}

func alertReceive(c *gin.Context) {
	var msg webhook.Message
	if err := c.BindJSON(&msg); err != nil {
		c.JSON(400, errors.New("invalid args"))
		return
	}
	baseMsg := fmt.Sprintf("[状态：%s][报警条数:%d]", msg.Status, len(msg.Alerts))
	log.Printf("[alertReceive][baseMsg:%+v]", baseMsg)
	for i := 0; i < len(msg.Alerts); i++ {
		alert := msg.Alerts[i]
		log.Printf("[detail][%d/%d][alert:%+v]", i+1, len(msg.Alerts), alert)
	}
	c.JSON(200, "ok")
}

```

- 代码解读
  - 使用gin启动http
  - alertReceive接收alertmanager发送过来的告警
  - 解析json字段为 github.com/prometheus/alertmanager/notify/webhook 的Message
  - 打印部分字段即可

## 编辑alertmanager配置文件

- 将默认的webhook发送者指向 上面的告警接收端
- 运行接收端程序
- 运行发送端程序
- 接收端应该能接收到告警，并打印相关日志
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511634000/e0b25eb417584b8d981b76f040dbffa2.png)

```shell
2021/08/18 17:28:42 [alertReceive][baseMsg:[状态：firing][报警条数:1]]
2021/08/18 17:28:42 [detail][1/1][alert:{Status:firing Labels:map[alertname:[004]go代码发送的报警测试 group:abc job:node_exporter severity:2] Annotations:map[value:88] StartsAt:2021
-08-18 17:28:37.569313212 +0800 CST EndsAt:0001-01-01 00:00:00 +0000 UTC GeneratorURL:http://localhost:9090 Fingerprint:56558b02b61ab8cf}]

```

# 本节重点总结:

- 编写go程序充当告警触发端，向alertmanager发送告警
  - 调用alertmanager的 /api/v1/alerts接口
- 编写go程序充当告警接收端，从alertmanager 接收webhook的告警信息
  - 解析alertmanager Message对象

## 13.3 alertmanager分组功能

# 本节重点介绍 :

- 启动3个alert_receive接收端
- 在alertmanager配置文件中编写相关路由
- prometheus编写rule文件触发告警
- 观察3个接收端
  - 5001 收到 alert_g_1
  - 5002 收到 alert_g_2
  - 5003 收到 alert_g_1 和 alert_g_2

# 分组说明

- alertmanager可以根据设置的路由将告警可以分组处理，发送给对应的接收端
- 三个接收组
  - sre_system接收机器告警，对应 job=node_exporter
  - sre_dba接收数据库告警，对应 job=mysqld_exporter
  - sre_all接收所有告警，对应 job=~ .*

# 分组实验

## 启动多个告警的webhook接收端，对应多个receiver

- 之前我们写的alert_receive.go，编译成 alert_receive二进制
- --addr指定 地址启动3个进程
  - ./alert_receive --addr=:5001
  - ./alert_receive --addr=:5002
  - ./alert_receive --addr=:5003

## 在alertmanager配置文件中编写相关路由

```shell
# 写配置文件
cat <<-"EOF" > /opt/app/alertmanager/alertmanager.yml
global:
  resolve_timeout: 30m

route:
  group_by: ['alertname']
  group_wait: 5s
  group_interval: 5s
  repeat_interval: 1h
  receiver: 'sre_all'
  routes:                                       #子路由，父路由的所有属性都会被子路由继承
    - match_re:                                   #此路由在警报标签上执行正则表达式匹配，以捕获与服务列表相关的警报
        job: node_exporter
      receiver: sre_system
      # continue=true 代表继续向下匹配，不然就break了
      continue: true
    - match_re:
        job: mysqld_exporter
      receiver: sre_dba
      continue: true
      # 默认all路由
    - match_re:
        job: .*
      receiver: sre_all
      continue: true

receivers:
- name: 'sre_system'
  webhook_configs:
  - url: 'http://127.0.0.1:5001/alert'
- name: 'sre_dba'
  webhook_configs:
  - url: 'http://127.0.0.1:5002/alert'
- name: 'sre_all'
  webhook_configs:
  - url: 'http://127.0.0.1:5003/alert'
EOF

# reload
curl -X POST -vvv  localhost:9093/-/reload

```

- 解读一下
- job=node_exporter 由 sre_system处理  5001端口
- job=mysqld_exporter  由 sre_dba处理 5002端口
- 所有的告警 由 sre_all处理 5003端口
- 重新加载alertmanager配置文件

## 准备prometheus 规则文件，触发告警

### 准备rule文件

```shell
cat <<EOF > /opt/app/prometheus/rule.yml
groups:
- name: alert_g_1
  rules:
  - alert: node_load too high
    expr:  node_memory_Active_bytes{instance="192.168.3.200:9100", job="node_exporter"}>0
    labels:
      severity: critical
      node_name: abc
    annotations:
      summary: 机器太累了

- name: alert_g_2
  rules:
  - alert: mysql_qps too high
    expr: mysql_global_status_queries{instance="192.168.3.200:3306", job="mysql_exporter"} >0
    labels:
      severity: warning
      node_name: abc
    annotations:
      summary: mysql太累了

EOF

```

- 其中alert_g_1由job=node_exporter触发
- 其中alert_g_2由job=mysqld_exporter触发

### 修改prometheus主配置文件，生效rule和alertmanager

```shell
# 写配置文件
cat <<EOF > /opt/app/prometheus/prometheus.yml

global:
  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - 172.20.70.215:9093

rule_files:
  - /opt/app/prometheus/rule.yml

scrape_configs:

  - job_name: node_exporter
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    #metrics_path: /metrics
    #scheme: http
    static_configs:
    - targets:
      - 172.20.70.205:9100

  - job_name: mysqld_exporter
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    #metrics_path: /metrics
    #scheme: http
    static_configs:

    - targets:
      - 172.20.70.205:9104
EOF

# reload
curl -X POST -vvv  localhost:9090/-/reload

```

# 效果展示

## 期望效果

- 5001 收到 alert_g_1
- 5002 收到 alert_g_2
- 5003 收到 alert_g_1 和 alert_g_2

## 实际效果

- 效果图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511655000/345110d8793c43a4b3b9e1b77e6ee546.png)

# 本节重点总结 : alertmanager分组

- 启动3个alert_receive接收端
- 在alertmanager配置文件中编写相关路由
- prometheus编写rule文件触发告警
- 观察3个接收端
  - 5001 收到 alert_g_1
  - 5002 收到 alert_g_2
  - 5003 收到 alert_g_1 和 alert_g_2

## 13.4告警抑制实例

# 本节重点介绍 :

- 告警抑制
  - 应用场景
  - 配置方法：一定要有equal标签
- 配置演示：critical告警触发了就抑制warning的

# 告警抑制

## 应用场景

- 如果某些其他警报已经触发，则抑制某些警报的通知。
- 多用于某些高等级的告警已触发，然后低等级的被抑制
  - 如机器宕机告警触发，则机器上的进程存活监控都被抑制
  - 如region基础网络告警触发，region内部的服务端口探活都被抑制

## 配置

- 告警中同一个机器`node_name`出发的 critical告警要抑制warning的

```yaml
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['node_name']
```

- 添加到alertmanager配置文件中并 reload

## 重启prometheus和alertmanager

- 重启服务

```shell
systemctl restart prometheus
systemctl restart alertmanager
```

## 期望现象

- 相同node_name的多条告警，当severity='critical'触发时抑制 severity='warning'的
- 即  severity='warning'不会触发，对应的就是mysql的不会触发，node的会触发
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511682000/5127a3393e684b638053aef52b96db66.png)

## 真实现象

- 真实图片举例
- 5002 没收收到告警，即mysql的不会触发，即  severity='warning'没有触发
- 5001 和 5003 能收到node的告警 ，即  severity='critical'触发了，并且抑制了severity='warning'的
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511682000/5e40b68aa8614c13a200a469ac4c3d6c.png)

# 本节重点总结 :

- 告警抑制
  - 应用场景
  - 配置方法：一定要有equal标签
- 配置演示：critical告警触发了就抑制warning的

## 13.5 告警静默

# 本节重点介绍 :

- 静默应用场景
- 页面创建
- api接口创建
- 查看

# 静默

## 作用

- 先告警后静默：持续发送的告警停止发送
- 先配置静默：上线或者运维操作会导致触发一大波告警，提前创建静默消息。防止告警风暴

## 静默接口

- /api/v2/silences

## 调用静默的代码

```go
package main

import (
	"bytes"
	"encoding/json"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/alertmanager/types"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func createSilence(alertMUrl string) {
	matchers := labels.Matchers{}
	m1 := &labels.Matcher{
		Type:  labels.MatchEqual,
		Name:  "node_name",
		Value: "abc",
	}
	matchers = append(matchers, m1)
	si := types.Silence{
		ID:        "",
		Matchers:  matchers,
		StartsAt:  time.Now(),
		EndsAt:    time.Now().Add(3 * time.Hour * 24),
		CreatedBy: "xiaoyi",
		Comment:   "小乙创建的告警静默",
		Status:    types.SilenceStatus{},
	}

	jsonStr, _ := json.Marshal(si)

	req, err := http.NewRequest("POST", alertMUrl, bytes.NewBuffer(jsonStr))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[http.post.request.err][url:%v][err:%v]", alertMUrl, err)
		return
	}
	defer resp.Body.Close()

	log.Printf("response Status:%v", resp.Status)
	log.Printf("response Headers:%v", resp.Header)
	body, _ := ioutil.ReadAll(resp.Body)
	log.Printf("response Body:%v", string(body))

}

func main() {
	alertMUrl := "http://172.20.70.215:9093/api/v1/silences"
	createSilence(alertMUrl)

}

```

- 解读，构造github.com/prometheus/alertmanager/types下的Silence对象
- 调用post发送即可

## 运行程序后查看alertmanager页面

- path http://172.20.70.215:9093/#/silences
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511702000/ade5e85962ee460d97f8f84115cb4a9d.png)

## 创建完静默后，重启prometheus 和alertmanager

- 查看是否会被静默
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511702000/334a3394c48e41d7bd9c5af0353bae7b.png)

# 本节重点总结 :

- 静默应用场景
- 页面创建
- api接口创建
- 查看

## 13.6 编写go代码接收webhook的告警发送钉钉

# 本节重点介绍 :

- 使用钉钉机器人发送到钉钉群
- 通过alertmanager webhook发送我们自定义的go程序中
- 解析alert对象并拼接钉钉信息发送

# 需求分析

## 使用钉钉机器人发送到钉钉群

> 钉钉机器人发送群消息

- [文档地址](https://developers.dingtalk.com/document/robots/custom-robot-access/title-72m-8ag-pqw)

## 通过webhook发送我们自定义的go程序中

- 然后解析发过来的alert，转换成钉钉的数据结构。推送过去

# 发送代码编写

## 钉钉信息json结构体

```go
type dingMsg struct {
	Msgtype string `json:"msgtype"`
	Text    struct {
		Content string `json:"content"`
	} `json:"text"`
	At struct {
		AtMobiles []string `json:"atMobiles"`
	} `json:"at"`
}

```

## 由alert对象拼接钉钉信息

- 代码如下

```go
// 拼接钉钉信息的函数
func buildDDContent(msg template.Alert) ([]byte, error) {
	recM := map[string]string{"firing": "已触发", "resolved": "已恢复"}

	msgTpl := fmt.Sprintf(
		"[规则名称：%s]\n"+
			"[是否已恢复：%s]\n"+
			"[告警级别：%s]\n"+
			"[触发时间：%s]\n"+
			"[看图连接：%s]\n"+
			"[当前值：%s]\n"+
			"[标签组：%s]",
		msg.Labels["alertname"],
		recM[msg.Status],
		msg.Labels["severity"],
		// prometheus使用utc时间，转换为当前时间
		msg.StartsAt.In(time.Local).Format("2006-01-02 15:03:04"),
		msg.GeneratorURL,
		msg.Annotations["value"],
		msg.Labels.SortedPairs(),

	)

	dm := dingMsg{Msgtype: "text"}
	dm.Text.Content = msgTpl
	bs, err := json.Marshal(dm)
	return bs, err
}

```

- 解读一下
  - prometheus使用utc时间，转换为当前时间
  - msg.Labels 和msg.Annotations都是 map[string]string，解析相关字段拼接即可

## 把我们上述的代码添加到之前的alert_receive.go中

- 完整代码如下

```go
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/alertmanager/notify/webhook"
	"github.com/prometheus/alertmanager/template"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func main() {

	listenAddress := flag.String("addr", ":5001",
		"Address on which to expose metrics and web interface.")
	flag.Parse()
	r := gin.Default()

	r.POST("/alert", alertReceive)
	r.Run(*listenAddress) // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}

func alertReceive(c *gin.Context) {
	var msg webhook.Message
	if err := c.BindJSON(&msg); err != nil {
		c.JSON(400, errors.New("invalid args"))
		return
	}
	baseMsg := fmt.Sprintf("[状态：%s][报警条数:%d]", msg.Status, len(msg.Alerts))
	log.Printf("[alertReceive][baseMsg:%+v]", baseMsg)
	for i := 0; i < len(msg.Alerts); i++ {

		alert := msg.Alerts[i]
		bs, _ := buildDDContent(alert)

		log.Printf("[detail][%d/%d][alert:%+v]", i+1, len(msg.Alerts), alert)
		sendToDing(bs)
	}
	c.JSON(200, "ok")
}

type dingMsg struct {
	Msgtype string `json:"msgtype"`
	Text    struct {
		Content string `json:"content"`
	} `json:"text"`
	At struct {
		AtMobiles []string `json:"atMobiles"`
	} `json:"at"`
}

// 拼接钉钉信息的函数
func buildDDContent(msg template.Alert) ([]byte, error) {
	recM := map[string]string{"firing": "已触发", "resolved": "已恢复"}

	msgTpl := fmt.Sprintf(
		"[规则名称：%s]\n"+
			"[是否已恢复：%s]\n"+
			"[告警级别：%s]\n"+
			"[触发时间：%s]\n"+
			"[看图连接：%s]\n"+
			"[当前值：%s]\n"+
			"[标签组：%s]",
		msg.Labels["alertname"],
		recM[msg.Status],
		msg.Labels["severity"],
		// prometheus使用utc时间，转换为当前时间
		msg.StartsAt.In(time.Local).Format("2006-01-02 15:03:04"),
		msg.GeneratorURL,
		msg.Annotations["value"],
		msg.Labels.SortedPairs(),

	)

	dm := dingMsg{Msgtype: "text"}
	dm.Text.Content = msgTpl
	bs, err := json.Marshal(dm)
	return bs, err
}

func sendToDing(jsonByte []byte) {
	apiUrl := "https://oapi.dingtalk.com/robot/send?access_token=75f08bf6f2fa40d45bc987608fa3ffa860bc9d8e2cd2b6099a5cc644ba0b3c50"

	req, err := http.NewRequest("POST", apiUrl, bytes.NewBuffer(jsonByte))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[http.post.request.err][url:%v][err:%v]", apiUrl, err)
		return
	}
	defer resp.Body.Close()

	log.Printf("response Status:%v", resp.Status)
	log.Printf("response Headers:%v", resp.Header)
	body, _ := ioutil.ReadAll(resp.Body)
	log.Printf("response Body:%v", string(body))
}

```

# 修改prometheus侧配置

- rule配置文件添加 value在annotation中

```yaml
groups:
- name: alert_g_1
  rules:
  - alert: node_load too high
    expr:  node_memory_Active_bytes>0
    labels:
      severity: critical
      node_name: abc
    annotations:
      summary: 机器太累了
      value: "{{ $value }}"

- name: alert_g_2
  rules:
  - alert: mysql_qps too high
    expr: mysql_global_status_queries >0
    labels:
      severity: warning
      node_name: abc
    annotations:
      summary: mysql太累了
      value: "{{ $value }}"

```

- service文件中添加  --web.external-url=http://172.20.70.215:9090/
- 这个代表 最后告警中的  GeneratorURL字段使用这个链接前缀，钉钉告警中的看图链接能直接访问到对应的prometheus
- 重启prometheus和alertmanager

## 观察5001 receive到的报警

```shell
2021/08/19 11:39:06 [alertReceive][baseMsg:[状态：firing][报警条数:1]]
2021/08/19 11:39:06 [detail][1/1][alert:{Status:firing Labels:map[alertname:node_load too high instance:172.20.70.205:9100 job:node_exporter node_name:abc severity:critical] Annotat
ions:map[summary:机器太累了 value:1.0065547264e+10] StartsAt:2021-08-19 03:39:01.628 +0000 UTC EndsAt:0001-01-01 00:00:00 +0000 UTC GeneratorURL:http://172.20.70.215:9090/graph?g0.e
xpr=node_memory_Active_bytes+%3E+0&g0.tab=1 Fingerprint:0ccc723bf948e5fb}]
2021/08/19 11:39:06 response Status:200 OK
2021/08/19 11:39:06 response Headers:map[Cache-Control:[no-cache] Connection:[keep-alive] Content-Type:[application/json] Date:[Thu, 19 Aug 2021 03:39:06 GMT] Server:[DingTalk/1.0.0
]]
2021/08/19 11:39:06 response Body:{"errcode":0,"errmsg":"ok"}
[GIN] 2021/08/19 - 11:39:06 |?[97;42m 200 ?[0m|    181.7246ms |   172.20.70.215 |?[97;46m POST    ?[0m "/alert"

```

## 观察钉钉群收到的信息

```shell
[规则名称：node_load too high]
[是否已恢复：已触发]
[告警级别：critical]
[触发时间：2021-08-19 11:11:39]
[看图连接：http://172.20.70.215:9090/graph?g0.expr=node_memory_Active_bytes+%3E+0&g0.tab=1]
[当前值：1.0065547264e+10]
[标签组：[{alertname node_load too high} {instance 172.20.70.205:9100} {job node_exporter} {node_name abc} {severity critical}]]
```

# 截图 ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511730000/572b22511929423294aa9dfa79f9bfbc.png)

# 本节重点总结 :

- 使用钉钉机器人发送到钉钉群
- 通过alertmanager webhook发送我们自定义的go程序中
- 解析alert对象并拼接钉钉信息发送

