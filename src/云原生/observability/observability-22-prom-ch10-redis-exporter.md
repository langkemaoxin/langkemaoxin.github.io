---
title: Prometheus 第10章：redis-exporter
sidebarGroup: 可观测性
shortTitle: 22 redis-exporter
order: 22
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第10章（redis-exporter）合并笔记
---

> **Prometheus · 第 10 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 10.1 使用ansible部署 redis-exporter

# 本节重点介绍 : 
- ansible 部署二进制 redis_exporter

## 项目地址 
- 项目地址 https://github.com/oliver006/redis_exporter

## 下载地址 
```shell script
wget -O  /opt/tgzs/redis_exporter-v1.20.0.linux-amd64.tar.gz https://github.com/oliver006/redis_exporter/releases/download/v1.20.0/redis_exporter-v1.20.0.linux-amd64.tar.gz

```

## 准备文件 redis_exporter.service
```shell script
cat <<EOF >redis_exporter.service
[Unit]
Description=redis Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/redis_exporter/redis_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=redis_exporter
[Install]
WantedBy=default.target

EOF

```

##  使用ansible部署 redis_exporter

- 执行ansible-playbook

```shell script
ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=redis_exporter-v1.20.0.linux-amd64.tar.gz" -e "app=redis_exporter"

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9121
ps -ef |grep redis_exporter |grep -v grep 

```

# 本节重点介绍 : 
- ansible 部署二进制 redis_exporter

## 10.2 grafana上导入模板看图并讲解告警

# 本节重点介绍 :

- 添加到prometheus采集配置中
- grafana 上导入dashboard
- 重点指标讲解

# 添加到prometheus采集配置中

## 采用和blackbox-exporter一样的探针配置方式

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

# 复制项目grafana json导入大盘图

- 地址 https://raw.githubusercontent.com/oliver006/redis_exporter/master/contrib/grafana_prometheus_redis_dashboard.json

# grafana 商城导入

- 地址 https://grafana.com/grafana/dashboards/763
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/6e1db083925f4c47b9001ca4ddba6c77.png)

# 核心指标讲解

- 连接的客户端数 redis_connected_clients
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/9027569cbcf64aa2be65f37932203873.png)
- 内存使用率 100 * (redis_memory_used_bytes  / redis_memory_max_bytes )
- 命令执行qps  rate(redis_commands_processed_total[1m])
  - redis执行命令，把qps打上去 ,0.1秒 执行3条命令，qps 大概在30 左右
  - ```bash
    while true;do 
       redis-cli keys "*"
       redis-cli set a b 
       redis-cli get a  
       sleep 0.1
    done

    ```
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/c315f62fc46947b88f74a3d982764f91.png)
- cache命中qps     irate(redis_keyspace_hits_total[5m])
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/211359de192f4499af62b83f2462999f.png)
- cache 未命中qps  irate(redis_keyspace_misses_total[5m])
- 网络入流量 rate(redis_net_input_bytes_total[5m])
- 网络出流量 rate(redis_net_output_bytes_total[5m])
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/54ad1170676b4e88a44a216d192f45ce.png)
- db中的key数量 sum (redis_db_keys) by (db)
- db中的过期key数量 sum (redis_db_keys_expiring) by (db)
- 每一种命令的qps  topk(5, irate(redis_commands_total[1m]))
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511382000/7fcaed9ec90c4e21984a86705518e0e4.png)

# 本节重点总结 :

- 添加到prometheus采集配置中
- grafana 上导入dashboard
- 重点指标讲解

## 10.3 查看源码，讲解采集原理

# 本节重点介绍 : 
- redis-exporter源码解读

# 源码解读
## 初始化redis-exporter对象
- 代码位置 D:\go_path\pkg\mod\github.com\oliver006\redis_exporter@v1.24.0\main.go
```go
exp, err := exporter.NewRedisExporter()
```

## NewRedisExporter中注册 /scrape handler

- 位置 D:\go_path\pkg\mod\github.com\oliver006\redis_exporter@v1.24.0\exporter\exporter.go
```go
e.mux.HandleFunc("/scrape", e.scrapeHandler)
```

## scrapeHandler 注册采集对象
- 位置 D:\go_path\pkg\mod\github.com\oliver006\redis_exporter@v1.24.0\exporter\http.go
- 解析target参数
- 创建RedisExporter
- 注册采集对象
```go
    target := r.URL.Query().Get("target")
	_, err = NewRedisExporter(target, opts)
	if err != nil {
		http.Error(w, "NewRedisExporter() err: err", http.StatusBadRequest)
		e.targetScrapeRequestErrors.Inc()
		return
	}

	promhttp.HandlerFor(
		registry, promhttp.HandlerOpts{ErrorHandling: promhttp.ContinueOnError},
```

## 执行采集
- 调用 RedisExporter绑定的Collect方法
- e.scrapeRedisHost(ch) 代表连接redis实例执行采集
```go
// Collect fetches new metrics from the RedisHost and updates the appropriate metrics.
func (e *Exporter) Collect(ch chan<- prometheus.Metric) {
	e.Lock()
	defer e.Unlock()
	e.totalScrapes.Inc()

	if e.redisAddr != "" {
		startTime := time.Now()
		var up float64
		if err := e.scrapeRedisHost(ch); err != nil {
			e.registerConstMetricGauge(ch, "exporter_last_scrape_error", 1.0, fmt.Sprintf("%s", err))
		} else {
			up = 1
			e.registerConstMetricGauge(ch, "exporter_last_scrape_error", 0, "")
		}

		e.registerConstMetricGauge(ch, "up", up)

		took := time.Since(startTime).Seconds()
		e.scrapeDuration.Observe(took)
		e.registerConstMetricGauge(ch, "exporter_last_scrape_duration_seconds", took)
	}

	ch <- e.totalScrapes
	ch <- e.scrapeDuration
	ch <- e.targetScrapeRequestErrors
}
```

## 最终的执行函数 scrapeRedisHost

-  连接redis获得 client对象c，对应的redis库 为 github.com/gomodule/redigo/redis
```go
c, err := e.connectToRedis()
```
- 调用封装好的 doRedisCmd函数执行redis 命令
```go
func doRedisCmd(c redis.Conn, cmd string, args ...interface{}) (interface{}, error) {
	log.Debugf("c.Do() - running command: %s %s", cmd, args)
	res, err := c.Do(cmd, args...)
	if err != nil {
		log.Debugf("c.Do() - err: %s", err)
	}
	log.Debugf("c.Do() - done")
	return res, err
}

```
- 执行redis命令 ，做结果转换，推送到ch中即可

# 本节重点总结 : 
- redis-exporter源码解读

