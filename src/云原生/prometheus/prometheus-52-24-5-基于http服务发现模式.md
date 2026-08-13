---
title: 24.5 基于http服务发现模式
sidebarGroup: Prometheus
shortTitle: 52 24.5 基于http服务发现模式
order: 52
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - http型的服务发现的优点 - 使用go语言编写 http服务发现源 - 将blackbox-http job改造为 http服务发现类型 说明 对比file_sd的优点 - 不...'
---

> **Prometheus · 第 52 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

