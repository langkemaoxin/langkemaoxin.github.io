---
title: "24.2 prometheus target管理"
sidebarGroup: "Prometheus"
shortTitle: "49 24.2 prometheus target..."
order: 49
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - target 状态页面字段解析 - target 采集失败常见原因分析 - target 状态接口源码分析 - 脚本获取target存活情况和失败原因 target 状态页面字段..."
---

> **Prometheus · 第 49 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

- 接口地址 http://${prometheus_ip}/api/v1/targets

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

