---
title: "13.5 告警静默"
sidebarGroup: "Prometheus"
shortTitle: "15 13.5 告警静默"
order: 15
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 静默应用场景 - 页面创建 - api接口创建 - 查看 静默 作用 - 先告警后静默：持续发送的告警停止发送 - 先配置静默：上线或者运维操作会导致触发一大波告警，提前创建静默..."
---

> **Prometheus · 第 15 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

