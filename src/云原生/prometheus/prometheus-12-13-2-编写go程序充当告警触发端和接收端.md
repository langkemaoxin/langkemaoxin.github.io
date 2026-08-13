---
title: "13.2 编写go程序充当告警触发端和接收端"
sidebarGroup: "Prometheus"
shortTitle: "12 13.2 编写go程序充当告警触发端和接收端"
order: 12
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 编写go程序充当告警触发端，向alertmanager发送告警 - 编写go程序充当告警接收端，从alertmanager 接收webhook的告警信息 发送告警的接口 - 接口..."
---

> **Prometheus · 第 12 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

