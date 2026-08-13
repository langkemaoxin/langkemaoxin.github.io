---
title: "25.3 使用relabel中的drop将对应的无用指标丢弃"
sidebarGroup: "Prometheus"
shortTitle: "56 25.3 使用relabel中的drop将对..."
order: 56
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 无用指标计算方式变更 - 真实案例分析 - 华为云CCE服务，container_fs_usage_bytes 容器的都为0 - drop之后利用率提升25% 无用指标计算方式变..."
---

> **Prometheus · 第 56 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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
  container_fs_usage_bytes{cluster=~"ugc-cce-prod",id!="/",container_name!="POD"}
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

