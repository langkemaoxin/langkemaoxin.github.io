---
title: "13.6 编写go代码接收webhook的告警发送钉钉"
sidebarGroup: "Prometheus"
shortTitle: "16 13.6 编写go代码接收webhook的告..."
order: 16
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 使用钉钉机器人发送到钉钉群 - 通过alertmanager webhook发送我们自定义的go程序中 - 解析alert对象并拼接钉钉信息发送 需求分析 使用钉钉机器人发送到钉..."
---

> **Prometheus · 第 16 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

