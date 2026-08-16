---
title: Prometheus 第8章：mysqld_exporter
sidebarGroup: 可观测性
shortTitle: 20 mysqld_exporter
order: 20
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第8章（mysqld_exporter）合并笔记
---

> **Prometheus · 第 8 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 8.1 使用ansible部署mysql_exporter，注入dsn环境变量

# 本节重点介绍 : 
- ansible 部署二进制 mysqld_exporter
- 通过环境变量传入mysql的连接地址，让 mysqld_exporter采集到

# 部署
## 项目地址 
- 项目地址 https://github.com/prometheus/mysqld_exporter
## 下载地址 
```shell script
wget -O  /opt/tgzs/mysqld_exporter-0.12.1.linux-amd64.tar.gz https://github.com/prometheus/mysqld_exporter/releases/download/v0.12.1/mysqld_exporter-0.12.1.linux-amd64.tar.gz

```

## 使用ansible部署 mysql_exporter
```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=mysqld_exporter-0.12.1.linux-amd64.tar.gz" -e "app=mysqld_exporter"

```

## 部署后发现服务未启动 ，报错如下

## mysqld_exporter需要接收 连接地址参数
- 通过环境变量注入，
- 在mysqld_exporter的service 文件中使用环境变量 DATA_SOURCE_NAME

```shell script
# 代表localhost
Environment=DATA_SOURCE_NAME=exporter:123123@tcp/
```

## 同时为了降低数据暴露风险，创建专门的采集用户 exporter，并授权
```shell script
mysql -uroot -p123123

CREATE USER 'exporter'@'%' IDENTIFIED BY '123123' ;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;

```

## 准备 service文件

```shell script
cat <<EOF >mysqld_exporter.service
[Unit]
Description=mysqld_exporter Exporter
Wants=network-online.target
After=network-online.target

[Service]
Environment=DATA_SOURCE_NAME=exporter:123123@tcp/
ExecStart=/opt/app/mysqld_exporter/mysqld_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mysqld_exporter
[Install]
WantedBy=default.target
EOF
```

> 重启mysqld_exporter服务
```shell script
systemctl daemon-reload
systemctl restart mysqld_exporter

```

## 修改service文件
- 准备 service文件
```shell script
cat <<EOF> blackbox_exporter.service
[Unit]
Description=blackbox_exporter Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/blackbox_exporter/blackbox_exporter --config.file=/opt/app/blackbox_exporter/blackbox.yml
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=blackbox_exporter
[Install]
WantedBy=default.target
EOF

```

## 重启mysqld_exporter服务
```shell script
systemctl daemon-reload
systemctl restart mysqld_exporter

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9104
ps -ef |grep mysqld_exporter |grep -v grep 

```

# 本节重点总结 : 
- ansible 部署二进制 mysqld_exporter
- 通过环境变量传入mysql的连接地址，让 mysqld_exporter采集到

## 8.2 grafana上导入模板看图并讲解告警

# 本节重点介绍 :

- grafana 上导入mysqld-dashboard
- global status 相关源码解读
- 重要指标讲解
  - 连接数
  - 内存
  - TPS、QPS

# 将采集任务添加到prometheus中

```yaml
  - job_name: mysqld_exporter
    honor_timestamps: true
    scrape_interval: 8s
    scrape_timeout: 8s
    metrics_path: /metrics
    scheme: http
    follow_redirects: true
    static_configs:
    - targets:
      - 192.168.3.200:9104

```

# grafana 上导入mysqld-dashboard

- 地址 https://grafana.com/grafana/dashboards/11323
-

## 调整大盘变量

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511152000/112cf6b8f41449f68a1750667438a4c4.png)
- 最终的效果图
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511152000/e066c9c75f9f422091c84ac3b4409b1f.png)

# 指标讲解和相关源码讲解

## global status 相关的

### mysql_global_status_threads_connected 表示当前连接数

- 源码 位置 D:\go_path\src\github.com\ning1875\mysqld_exporter\collector\global_status.go
- 执行`SHOW GLOBAL STATUS`命令，逐行遍历，如果key 不在 正则中，则用 mysql_global_status前缀+key，类型为prometheus.UntypedValue
- scrape函数

```go
func (ScrapeGlobalStatus) Scrape(ctx context.Context, db *sql.DB, ch chan<- prometheus.Metric, logger log.Logger) error {
	globalStatusRows, err := db.QueryContext(ctx, globalStatusQuery)

	for globalStatusRows.Next() {
		if err := globalStatusRows.Scan(&key, &val); err != nil {
			return err
		}
		if floatVal, ok := parseStatus(val); ok { // Unparsable values are silently skipped.
			key = validPrometheusName(key)
			match := globalStatusRE.FindStringSubmatch(key)
			if match == nil {
				ch <- prometheus.MustNewConstMetric(
					newDesc(globalStatus, key, "Generic metric from SHOW GLOBAL STATUS."),
					prometheus.UntypedValue,
					floatVal,
				)
				continue
			}
```

- globalStatusRE正则

```go
mysql_global_variables_innodb_buffer_pool_sizevar globalStatusRE = regexp.MustCompile(`^(com|handler|connection_errors|innodb_buffer_pool_pages|innodb_rows|performance_schema)_(.*)$`)

```

- 指标metrics结果

```shell
# HELP mysql_global_status_threads_connected Generic metric from SHOW GLOBAL STATUS.
# TYPE mysql_global_status_threads_connected untyped
mysql_global_status_threads_connected 9
```

### - 为什么进行这样

### 其它连接数

- mysql_global_status_max_used_connections   表示 服务器启动后已经同时使用的连接的最大数量
- mysql_global_variables_max_connections 表示 最大连接数
- mysql_global_status_questions 已执行的由客户端发出的语句
- mysql_global_status_aborted_connects 尝试已经失败的MySQL服务器的连接的次数
- mysql_global_status_aborted_clients 由于客户没有正确关闭连接已经死掉，已经放弃的连接数量

### 内存

- mysql_global_status_innodb_page_size innodb内存划分粒度
- mysql_global_status_buffer_pool_pages 用于缓存索引和数据的内存大小
- mysql_global_variables_innodb_log_buffer_size 用来设置缓存还未提交的事务的缓冲区的大小

## TPS 服务器每秒处理的事务数

- 计算方法

```shell
Com_commit = SHOW GLOBAL STATUS LIKE 'Com_commit'; 
Com_rollback = SHOW GLOBAL STATUS LIKE 'Com_rollback'; 
Uptime = SHOW GLOBAL STATUS LIKE 'Uptime'; 
TPS=(Com_commit + Com_rollback)/Uptime 
```

- promql`sum(rate(mysql_global_status_commands_total{command=~"(commit|rollback)"}[5m])) without (command)`

## QPS

- 计算方法

```shell
Questions = SHOW GLOBAL STATUS LIKE 'Questions'; 
Uptime = SHOW GLOBAL STATUS LIKE 'Uptime'; 
QPS=Questions/Uptime 
```

- promql irate(mysql_global_status_queries[5m])

# 本节重点总结 :

- grafana 上导入mysqld-dashboard
  - 变量的处理，没有图，变量解析的不对
- global status 相关源码解读
- 重要指标讲解
  - 连接数
  - 内存
  - TPS、QPS

## 8.3 修改mysqld_exporter源码 ，改造成类似blackbox的探针型，实现一对多探测

# 本节重点介绍 :

- 官方的mysqld_exporter问题
  - 只能一对一
  - 不能像探针一样采集多个实例
  - dsn需要配置环境变量或者配置文件解析
- 需求说明 改造成类似blackbox的探针型，实现一对多探测
- 改造方案
  - 修改源码
  - prometheus配置文件传参和实例地址获取
  - 改造grafana大盘配置成可以切换instance变量

# 问题描述

## 官方的mysqld_exporter问题

- 只能一个mysqld_exporter对应一个mysqld实例
- mysql 连接串dsn需要通过如配置文件或者 DATA_SOURCE_NAME 环境变量注入，下面展示之前讲过的环境变量方法

```shell
cat <<EOF >mysqld_exporter.service
[Unit]
Description=mysqld_exporter Exporter
Wants=network-online.target
After=network-online.target

[Service]
Environment=DATA_SOURCE_NAME=exporter:123123@tcp/
ExecStart=/opt/app/mysqld_exporter/mysqld_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mysqld_exporter
[Install]
WantedBy=default.target
EOF
```

- 如果没有dsn配置，那么启动服务的时候会直接报错退出

```shell
INFO[0000] Starting mysqld_exporter (version=0.12.1, branch=HEAD, revision=48667bf7c3b438b5e93b259f3d17b70a7c9aff96)  source="mysqld_exporter.go:257"
INFO[0000] Build context (go=go1.12.7, user=root@0b3e56a7bc0a, date=20190729-12:35:58)  source="mysqld_exporter.go:258"
FATA[0000] failed reading ini file: open /root/.my.cnf: no such file or directory  source="mysqld_exporter.go:264"
```

## 为何官方要求设计成一对一的模型

- 主要是云原生环境下，一对一可以以sidecar模式部署
- 但是mysqld一般不运行在k8s中

# 改造代码解决方案

## 需求说明

- 改造mysqld_exporter 使之可以http传参dsn，变成一个blackbox_exporter形式的探针

```shell
http://172.20.70.205:9105/probe?dsn=root:123123@tcp(172.20.70.205:3306)/
```

- 这样一个mysqld_exporter 探针可以探测多个mysql实例
- 通过relabel正则解析dsn，获取instance标签

## 代码改造方案

### 首先注释掉代码中dsn的检查限制

- 代码位置 D:\go_path\pkg\mod\github.com\prometheus\mysqld_exporter@v0.12.1\mysqld_exporter.go

```go
	dsn = os.Getenv("DATA_SOURCE_NAME")
	if len(dsn) == 0 {
		var err error
		if dsn, err = parseMycnf(*configMycnf); err != nil {
			log.Fatal(err)
		}
	}
```

### 添加一个/probe 处理的handler方法

- 代码位置 D:\go_path\pkg\mod\github.com\prometheus\mysqld_exporter@v0.12.1\mysqld_exporter.go

```go
	http.HandleFunc("/probe", func(w http.ResponseWriter, r *http.Request) {

		collector.ProbeHandler(w, r, collector.NewMetrics(), enabledScrapers, logger)

	})
```

- 这个函数的作用是，处理http请求 /probe path

### collect中添加一个 probe 处理函数

- 代码位置 D:\go_path\src\github.com\ning1875\mysqld_exporter\collector\exporter.go

```go
func ProbeHandler(w http.ResponseWriter, r *http.Request, metrics Metrics, scrapers []Scraper, logger log.Logger) {
	dsn := r.URL.Query().Get("dsn")
	if dsn == "" {
		http.Error(w, fmt.Sprintf("dsn empty %q", dsn), http.StatusBadRequest)
		return
	}
	mysqlExp := New(r.Context(), dsn, metrics, scrapers, logger)
	registry := prometheus.NewRegistry()
	registry.MustRegister(mysqlExp)
	h := promhttp.HandlerFor(registry, promhttp.HandlerOpts{})
	h.ServeHTTP(w, r)
}
```

- 流程解释，先解析 dsn参数
- 根据dsn参数创建一个 mysqlExporter对象
- mysqlExporter对象中实现了 prometheus sdk中的Collector接口

```go
func (e *Exporter) Describe(ch chan<- *prometheus.Desc) {
	ch <- e.metrics.TotalScrapes.Desc()
	ch <- e.metrics.Error.Desc()
	e.metrics.ScrapeErrors.Describe(ch)
	ch <- e.metrics.MySQLUp.Desc()
}

// Collect implements prometheus.Collector.
func (e *Exporter) Collect(ch chan<- prometheus.Metric) {
	e.scrape(e.ctx, ch)

	ch <- e.metrics.TotalScrapes
	ch <- e.metrics.Error
	e.metrics.ScrapeErrors.Collect(ch)
	ch <- e.metrics.MySQLUp
}

```

- 然后将这个 mysqlExp注册到prometheus的registry中
- 然后用 promhttp.HandlerFor处理即可

## 打包代码然后编译运行

- 编译

```shell
go build -v -o mysqld_exporter mysqld_exporter.go 
```

- 或者直接下载二进制

```shell
# 下载二进制
wget https://github.com/ning1875/mysqld_exporter/releases/download/v0.12.1/mysqld_exporter-0.12.1.linux-amd64.tar.gz

```

- 运行

```shell
./mysqld_exporter 
```

- 浏览器访问或者curl测试如下

```shell
curl 'http://localhost:9104/probe?dsn=root:123123@tcp(localhost:3306)/'
```

- dsn还是常规的dsn : user=root ,pass=123123 ,host=localhost ,port=3306
- 如果能显示metrics接口证明ok
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511184000/02ec8361b5f04c1f85184bbea2acd8c5.png)

## prometheus配置文件传参和实例地址获取

- 配置文件实例如下
- 通过replace正则替换获取 dsn中的mysql实例地址，即 ip+端口

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

- target页面检查，举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511184000/5273e8c0b86844869128e97152189f37.png)
- prometheus查询指标，一个mysql指标如果有两个instance标签说明正常，举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511184000/717b463d360c4d55b6533ce1865f5bdd.png)

## 改造grafana大盘配置成可以切换instance变量

- 设置host变量 label_values(mysql_up{}, instance)
- 测试host变量切换 ，举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511184000/0c54c9fb8c784ac099a70e073fb4e188.png)

# 本节重点总结 :

- 官方的mysqld_exporter问题
  - 只能一对一
  - 不能像探针一样采集多个实例
  - dsn需要配置环境变量或者配置文件解析
- 需求说明 改造成类似blackbox的探针型，实现一对多探测
- 改造方案
  - 修改源码
  - prometheus配置文件传参和实例地址获取
  - 改造grafana大盘配置成可以切换instance变量

