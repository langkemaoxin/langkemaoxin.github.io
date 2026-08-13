---
title: "24.1 prometheus-exporter管理"
sidebarGroup: "Prometheus"
shortTitle: "48 24.1 prometheus-export..."
order: 48
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - exporter 流派 - 必须和探测对象部署在一起的 - 1对多的远端探针模式 - exporter管控的难点 - 1对1 的exporter 需要依托诸如 ansible等节..."
---

> **Prometheus · 第 48 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

