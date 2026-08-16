---
title: Prometheus 第25章：高基数与采集端
sidebarGroup: 可观测性
shortTitle: 37 高基数与采集端
order: 37
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第25章（高基数与采集端）合并笔记
---

> **Prometheus · 第 25 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 25.1 降低采集资源消耗的收益和无用监控指标的判定依据

# 本节重点介绍 :

- 降低采集资源消耗的收益
- 哪些是无用指标，什么判定依据
  - 通过 grafana的 mysql 表获取所有的 查询表达式expr
  - 通过 获取所有的prometheus rule文件获取所有的 告警表达式expr
  - 通过 获取所有的prometheus 采集器接口 获取所有的采集metrics
  - 计算可得到现在没用到的metrics列表
    - 计算方法为 所有采集到的-(告警的+看图的)

# 降低采集资源消耗的收益

- 缓存系统内存使用降低
  - 监控系统为了加快查询速度会在各个环节上设置缓存
  - 那么如果采集指标过多，无疑会使缓存内存使用变多
- 存储系统磁盘使用降低
  - 持久话存储的磁盘使用量和监控指标的数量是成正比的
- 组件间网络传输流量降低
  - 更多的监控指标数据意味着，组件间网络传输流量更大
- 查询速度提升降低
  - 更多的监控指标意味着查询的速度会被拖慢

## 收益实例

- 分析cadvisor 和 node_exporter中可以被drop的指标及其采集方式,去掉后 采集qps下降25%
- ![drop_result.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111568000/744d40de85a64ea7888056da4c12d4f2.png)

# 哪些是无用指标，什么判定依据

- 一句话就可以总结 ：always collect ,never used

## 指标的使用

- 看图使用
- 告警使用

## 那么系统中除了看图和告警使用的指标理论上都可以去掉

- 但是要注意的点是，有些指标今天没用到是还没发现它的意义
- 有可能明天就会使用

## 具体的判定依据

### 看图侧

- 假设所有的看图都配置在grafana中
- 通过grafana 的dashboard 接口或者 grafana的 mysql 表获取所有的 查询表达式expr
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111568000/0fcd9e558ccf4b35b13d800dbfcda4da.png)
- 对应就是众多的promql，在其中解析出所有的metrics
- 就可以获得看图侧的 metrics 列表 ,可以命名为graph_metrics_set

#### python脚本

- 创建db对象连接grafana 数据库
- 查询所有的 dashboard
- 遍历dashboard中的panel 对象获取 expr对象
- 将expr和prometheus metric 正则匹配，匹配到就是metric
-

```python
# pip install sqlalchemy PyMySQL
import re
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

METRIC_NAME_RE = re.compile(r'.*?([a-zA-Z_:][a-zA-Z0-9_:]*){.*?')

GRAFANA_SLAVE_DB_HOST = "172.20.70.205"
GRAFANA_SLAVE_DB_PORT = 3306
GRAFANA_SLAVE_DB_USER = "root"
GRAFANA_SLAVE_DB_PASS = "123123"

def init_grafana_db_session():
    engine = create_engine('mysql+pymysql://{}:{}@{}:{}/grafana'.format(
        GRAFANA_SLAVE_DB_USER,
        GRAFANA_SLAVE_DB_PASS,
        GRAFANA_SLAVE_DB_HOST,
        GRAFANA_SLAVE_DB_PORT))
    # 创建DBSession类型:
    dbSession = sessionmaker(bind=engine, autocommit=True)
    return dbSession()

def get_metrics_from_grafana_db():
    ds = init_grafana_db_session()
    res = ds.execute('select  data,slug from dashboard ')
    exprs = set()
    for r in res:
        try:
            data = json.loads(r[0])

            panels = data.get("panels")

            if not panels:
                continue
            for p in panels:
                if not p:
                    continue
                targets = p.get("targets")
                if not targets:
                    continue
                for i in targets:
                    ee = i.get("expr")

                    ddd = METRIC_NAME_RE.findall(ee)
                    exprs.update(set(ddd))
        except Exception as e:
            print(e)
    ss = sorted(list(exprs))
    print(ss)
    return ss

get_metrics_from_grafana_db()

```

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111568000/77b9aea64d834cfaa234eb9a18e86094.png)

### 告警侧

- 获取所有的prometheus rule文件
- 根据rule文件中的promql 解析出metrics，可以命名为 alert_metrics_set

#### python 脚本

- 打开rule yaml 文件，逐行获取
- 用正则匹配，匹配到的即为metric

```python
import re

METRIC_NAME_RE = re.compile(r'.*?([a-zA-Z_:][a-zA-Z0-9_:]*){.*?')

def get_metrics_from_rule_file(rule_file):
    exprs = set()
    with open(rule_file, encoding='UTF-8') as f:
        for i in f.readlines():
            if not "expr" in i:
                continue
            ddd = METRIC_NAME_RE.findall(i)
            exprs.update(set(ddd))

    ss = sorted(list(exprs))
    print(ss)
    return ss

get_metrics_from_rule_file("rule.yml")

```

### 采集侧

- 根据所有的采集器的接口获取其对应的metrics列表，对应接口如下

```shell
/api/v1/label/__name__/values
```

- 意思是获取__name__标签的values列表，也就是所有的metircs_name
- 截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111568000/56a6bb4b4bea4b36a4f9110ad4b828fe.png)
- 可以命名为 scrape_metrics_set

#### python脚本

```python
import requests

def get_metrics_names(host):
    url = "http://{}/api/v1/label/__name__/values".format(host)
    res = requests.get(url)
    print(res.status_code)
    exprs = res.json().get("data")
    if not exprs:
        return
    ss = sorted(list(exprs))
    print(ss)
    return ss

get_metrics_names("172.20.70.215:8091")

```

### 计算可得到现在没用到的metrics列表

- 计算方法为 所有采集到的-(告警的+看图的)

```shell
scrape_metrics_set - (alert_metrics_set + graph_metrics_set)
```

# 本节重点总结 :

- 降低采集资源消耗的收益
- 哪些是无用指标，什么判定依据
  - 通过 grafana的 mysql 表获取所有的 查询表达式expr
  - 通过 获取所有的prometheus rule文件获取所有的 告警表达式expr
  - 通过 获取所有的prometheus 采集器接口 获取所有的采集metrics
  - 计算可得到现在没用到的metrics列表
    - 计算方法为 所有采集到的-(告警的+看图的)

## 25.2 采集端高基数的现象和原因

# 本节重点介绍 :

- 什么是高基数
- 采集端高基数的原因
  - 标签的值过多
- 获取采集端的高基数metrics
  - tsdb-status页面介绍
  - 统计原理讲解：是基于内存中的倒排索引 算最大堆取 top10
  - 通过接口获取metrics name top10

# 什么是高基数

- 通俗的说就是返回的series或者查询到的series数量过多
- 查询表现出来返回时间较长，对应调用服务端资源较多的查询
- 数量多少算多 10w~100w

# 采集端高基数的现象

- apiserver_request_duration_seconds_bucket
- ![high01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111592000/427f94c8d0b64ca7b0bcb420d36ece05.png)

# 采集端高基数的原因

- 标签的值过多

## 举例histogram 标签过多

- 我们定义了一个名为 test_histogram_01 的histogram型metrics
- bucket总数为20个，也就是le这个标签的选项有20个
- 还定义了三个标签 "path", "resource", "scope"
- 假设这三个标签每个都有100选项
- 那么这个metric_name中不同标签的选项为`100*100*100*20=2kw`
- 也就是可以达到惊人的2千万的级别
- 当时实际中不大可能所有的标签都达到100个数量，但是个别的标签达到100是没问题的

```go
	TestHistogram01 = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name: "test_histogram_01",
		Help: "RPC latency distributions.",
		// histogram 需要传入 bucket的start 和width参数
		Buckets: prometheus.LinearBuckets(0.1, 0.2, 20),
	}, []string{"path", "resource", "scope"})
)
```

# 获取采集端的高基数metrics

## tsdb页面解析

- Top 10 label names with value count： 标签中value最多的10个
- Top 10 series count by metric names： metric_name匹配的series最多的10个
- Top 10 label names with high memory usage： 标签消耗内存最多的10个
- Top 10 series count by label value pairs： 标签对数量最多的10个

## 统计原理解析

- 是基于内存中的倒排索引 算最大堆取 top10
- 代码位置  D:\go_path\src\github.com\prometheus\prometheus\web\api\v1\api.go

```go
func (api *API) serveTSDBStatus(*http.Request) apiFuncResult {
	s, err := api.db.Stats("__name__")
	if err != nil {
		return apiFuncResult{nil, &apiError{errorInternal, err}, nil, nil}
	}
	metrics, err := api.gatherer.Gather()
	if err != nil {
		return apiFuncResult{nil, &apiError{errorInternal, fmt.Errorf("error gathering runtime status: %s", err)}, nil, nil}
	}
	chunkCount := int64(math.NaN())
	for _, mF := range metrics {
		if *mF.Name == "prometheus_tsdb_head_chunks" {
			m := *mF.Metric[0]
			if m.Gauge != nil {
				chunkCount = int64(m.Gauge.GetValue())
				break
			}
		}
	}
	return apiFuncResult{tsdbStatus{
		HeadStats: HeadStats{
			NumSeries:     s.NumSeries,
			ChunkCount:    chunkCount,
			MinTime:       s.MinTime,
			MaxTime:       s.MaxTime,
			NumLabelPairs: s.IndexPostingStats.NumLabelPairs,
		},
		SeriesCountByMetricName:     convertStats(s.IndexPostingStats.CardinalityMetricsStats),
		LabelValueCountByLabelName:  convertStats(s.IndexPostingStats.CardinalityLabelStats),
		MemoryInBytesByLabelName:    convertStats(s.IndexPostingStats.LabelValueStats),
		SeriesCountByLabelValuePair: convertStats(s.IndexPostingStats.LabelValuePairsStats),
	}, nil, nil, nil}
}

```

## api接口

- python代码

```python
import requests

def label_names(host, ):
    uri = 'http://{}/api/v1/status/tsdb'.format(host)

    res = requests.get(uri)

    data = res.json().get("data")
    if not data:
        return

    seriesCountByMetricName = data.get("seriesCountByMetricName")
    for i in seriesCountByMetricName:
        print(i)

if __name__ == '__main__':
    label_names("172.20.70.215:8091")

```

- seriesCountByMetricName结果

```shell
{'name': 'apiserver_request_duration_seconds_bucket', 'value': 11476}
{'name': 'etcd_request_duration_seconds_bucket', 'value': 9430}
{'name': 'rest_client_request_duration_seconds_bucket', 'value': 2266}
{'name': 'apiserver_response_sizes_bucket', 'value': 1440}
{'name': 'workqueue_work_duration_seconds_bucket', 'value': 737}
{'name': 'workqueue_queue_duration_seconds_bucket', 'value': 737}
{'name': 'grpc_server_handled_total', 'value': 697}
{'name': 'apiserver_request_total', 'value': 472}
{'name': 'apiserver_request_duration_seconds_count', 'value': 302}
{'name': 'apiserver_request_duration_seconds_sum', 'value': 302}
```

# 本节重点总结 :

- 什么是高基数
- 采集端高基数的原因
  - 标签的值过多
- 获取采集端的高基数metrics
  - tsdb-status页面介绍
  - 统计原理讲解：是基于内存中的倒排索引 算最大堆取 top10
  - 通过接口获取metrics name top10

## 25.3 使用relabel中的drop将对应的无用指标丢弃

# 本节重点介绍 :

- 无用指标计算方式变更
- 真实案例分析
  - 华为云CCE服务，container_fs_usage_bytes 容器的都为0
  - drop之后利用率提升25%

# 无用指标计算方式变更

- 之前的计算方法为 所有采集到的-(告警的+看图的)

```shell
scrape_metrics_set - (alert_metrics_set + graph_metrics_set)
```

- 通过采集端tsdb-status获取高基数后的计算方式为：在上面的结果中查找高基数的指标
- 举例，第一步的结果为,a-e5个指标

```shell
metrics_a
metrics_b
metrics_c
metrics_d
metrics_e
```

- 高级数从高到低的结果为

```shell
metrics_a  100w
metrics_b  90w
metrics_f  80w 

```

- 那么应该去掉的为 metrics_a和metrics_b，metrics_f在使用

# 去掉的方法

- 有些指标数据量很大，可以达到百万的量级，这种指标对监控系统是很大的压力
- 有些指标我们不关心
- 所以我们就可以使用drop将这些指标去掉

```yaml
- source_labels: [__name__]
    separator: ;
    # 标签key前缀匹配到的drop
    regex: '(metrics_a|metrics_a).*'
    replacement: $1
    action: drop
```

# 真实案例分析

![drop002.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111643000/6e72c88b439142f99120f70299d09ac0.png)

## 华为云CCE服务，container_fs_usage_bytes 容器的都为0

- 是因为华为存储为devicemapper
- id="/" 代表宿主机而不是容器
  container_fs_usage_bytes{​cluster=~"ugc-cce-prod",id!="/",container_name!="POD"}
- cadvisor 在统计container_fs_usage_bytes指标时不支持 devicemapper ，所以相关指标的结果都为0
- [issue地址](https://github.com/google/cadvisor/issues/2040)
- 代码分析 位置 E:\go_path\src\github.com\google\cadvisor\container\docker\factory.go

```go
	if storageDriver(dockerInfo.Driver) == devicemapperStorageDriver {
		thinPoolWatcher, err = startThinPoolWatcher(dockerInfo)
		if err != nil {
			klog.Errorf("devicemapper filesystem stats will not be reported: %v", err)
		}

		// Safe to ignore error - driver status should always be populated.
		status, _ := StatusFromDockerInfo(*dockerInfo)
		thinPoolName = status.DriverStatus[dockerutil.DriverStatusPoolName]
	}

```

# 本节重点总结 :

- 无用指标计算方式变更

  - drop依据:脚本分析指标利用率(报警和grafana看图)，同时采集端量比较大
- 真实案例分析

  - 华为云CCE服务，container_fs_usage_bytes 容器的都为0
  - drop之后利用率提升25%

