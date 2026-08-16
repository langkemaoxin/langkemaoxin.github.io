---
title: Prometheus 第5章：node_exporter
sidebarGroup: 可观测性
shortTitle: 17 node_exporter
order: 17
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第5章（node_exporter）合并笔记
---

> **Prometheus · 第 5 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 5.1编写ansibleplaybook批量安装二进制

# 本节重点介绍 : ansible playbook编写
- rsyslog 和 logrotate
- service_deploy yaml的编写

# 配置机器直接的ssh免密码登录

## 节点主机名host解析
> 节点主机名写入hosts
```shell script

echo "192.168.3.200   prome-master01" >> /etc/hosts
echo "192.168.3.201   prome-node01" >> /etc/hosts

``` 

## master上生成ssh key 并拷贝到node上
```shell script
ssh-keygen
ssh-copy-id prome-node01

# 测试ssh联通

ssh prome-node01

```

## master 上安装ansible
```shell script
yum install -y ansible

# 关闭hostcheck 
vim /etc/ansible/ansible.cfg

ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no 

```

## playbook执行时需要设置机器文件 
```shell script
cat <<EOF > /opt/tgzs/host_file
prome-master01
prome-node01
EOF
```

##  设置syslog 和logrotate服务

### 编写yaml文件

```shell script
cat <<EOF >  init_syslog_logrotate.yaml
- name: init syslog logrotate
  hosts: all
  user: root
  gather_facts:  false
  vars:
      app_log_path: /opt/logs/
      sc_path: /opt/tgzs/
      syslog_conf: syslog_server.conf
      logrotate_conf: logrotate.conf

  tasks:

      - name: mkdir
        file: path={{ app_log_path }} state=directory
      

      - name: copy  files
        copy:
          src: '{{ item.src }}'
          dest: '{{ item.dest }}'
          owner: root
          group: root
          mode: 0644
          force: true

        with_items:
          - { src: '{{ sc_path }}/{{ syslog_conf }}', dest: '/etc/rsyslog.d/{{ syslog_conf }}' }
          - { src: '{{ sc_path }}/{{ logrotate_conf }}', dest: '/etc/logrotate.d/{{ logrotate_conf }}' }
        register: result

      - name: Show debug info
        debug: var=result verbosity=0

      - name: restart service

        systemd:
          name: "{{ item }}"
          state: restarted
          daemon_reload: yes
        with_items:
          - 'rsyslog'
        register: result

      - name: Show debug info
        debug: var=result verbosity=0

EOF
```

### 准备  syslog_server.conf  和 logrotate.conf 
```shell script
cat <<EOF >  syslog_server.conf
if $programname == 'alertmanager'               then /opt/logs/alertmanager.log
if $programname == 'prometheus'                 then /opt/logs/prometheus.log
if $programname == 'node_exporter'              then /opt/logs/node_exporter.log
if $programname == 'process_exporter'            then /opt/logs/process_exporter.log
if $programname == 'mysql_exporter'            then /opt/logs/mysql_exporter.log
if $programname == 'redis_exporter'            then /opt/logs/redis_exporter.log
if $programname == 'blackbox_exporter'          then /opt/logs/blackbox_exporter.log
if $programname == 'mysqld_exporter'          then /opt/logs/mysqld_exporter.log
if $programname == 'process-exporter'          then /opt/logs/process-exporter.log
if $programname == 'pushgateway'                then /opt/logs/pushgateway.log
if $programname == 'm3coordinator'              then /opt/logs/m3coordinator.log
if $programname == 'm3dbnode'                   then /opt/logs/m3dbnode.log
EOF

cat <<EOF > logrotate.conf 
/opt/logs/*.log
{
    daily
    missingok
    notifempty
    dateext
    compress
    delaycompress
    copytruncate
    rotate 15
}
EOF
```

### 执行 
```shell script
ansible-playbook -i host_file init_syslog_logrotate.yaml
```

### 编写ansible 发布服务脚本
```shell script
cat <<EOF >  service_deploy.yaml
- name:  install
  hosts: all
  user: root
  gather_facts:  false
  vars:
      local_path: /opt/tgzs
      app_dir: /opt/app

  tasks:
      - name: mkdir
        file: path={{ app_dir }}/{{ app }} state=directory
      - name: mkdir
        file: path={{ local_path }} state=directory

      - name: copy  config and service
        copy:
          src: '{{ item.src }}'
          dest: '{{ item.dest }}'
          owner: root
          group: root
          mode: 0644
          force: true

        with_items:
          - { src: '{{ local_path }}/{{ tgz }}', dest: '{{ local_path }}/{{ tgz }}' }
          - { src: '{{ local_path }}/{{ app }}.service', dest: '/etc/systemd/system/{{ app }}.service' }

        register: result
      - name: Show debug info 
        debug: var=result verbosity=0

      - name: tar gz
        shell: rm -rf /root/{{ app }}* ; \
          tar xf {{ local_path }}/{{ tgz }} -C /root/ ; \
          /bin/cp -far /root/{{ app }}*/* {{ app_dir }}/{{ app }}/ \

        register: result
      - name: Show debug info
        debug: var=result verbosity=0

      - name: restart service
        systemd:
          name: "{{ item }}"
          state: restarted
          daemon_reload: yes
          enabled: yes
        with_items:
          - '{{ app }}'
        register: result

      - name: Show debug info
        debug: var=result verbosity=0
EOF

```

## 使用这个脚本安装node_exporter

> 下载node_exporter

```shell script
wget -O /opt/tgzs/node_exporter-1.1.2.linux-amd64.tar.gz https://github.com/prometheus/node_exporter/releases/download/v1.1.2/node_exporter-1.1.2.linux-amd64.tar.gz

```

> 准备service文件
```shell script
cat <<EOF> node_exporter.service
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/node_exporter/node_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=node_exporter
[Install]
WantedBy=default.target

EOF
```

> 执行安装
```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=node_exporter-1.1.2.linux-amd64.tar.gz" -e "app=node_exporter"

```

# 本节重点总结 : ansible playbook编写
- rsyslog 和 logrotate
- service_deploy yaml的编写

## 5.2黑白名单配置

# 本节重点介绍 :

- 黑白名单的配置方法
- 为何会有默认开始的默认关闭的采集模块

# 项目地址

- [node_exporter](https://github.com/prometheus/node_exporter)

## 查看启动日志

```shell
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.315Z caller=node_exporter.go:178 msg="Starting node_exporter" version="(version=1.1.2, branch=HEAD, revision=b597c1244d7bef49e6f3359c87a56dd7707f6719)"
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.315Z caller=node_exporter.go:179 msg="Build context" build_context="(go=go1.15.8, user=root@f07de8ca602a, date=20210305-09:29:10)"
Mar 29 15:38:51 prome_master_01 node_exporter: level=warn ts=2021-03-29T07:38:51.315Z caller=node_exporter.go:181 msg="Node Exporter is running as root user. This exporter is designed to run as unpriviledged user, root is not required."
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=filesystem_common.go:74 collector=filesystem msg="Parsed flag --collector.filesystem.ignored-mount-points" flag=^/(dev|proc|sys|var/lib/docker/.+)($|/)
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=filesystem_common.go:76 collector=filesystem msg="Parsed flag --collector.filesystem.ignored-fs-types" flag=^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:106 msg="Enabled collectors"
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=arp
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=bcache
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=bonding
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=btrfs
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=conntrack
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=cpu
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=cpufreq
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=diskstats
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=edac
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=entropy
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=fibrechannel
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=filefd
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=filesystem
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=hwmon
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=infiniband
Mar 29 15:38:51 prome_master_01 node_exporter: level=info ts=2021-03-29T07:38:51.316Z caller=node_exporter.go:113 collector=ipvs
```

## 本机curl访问数据

```shell

[root@prome_master_01 tgzs]# curl  -s  localhost:9100/metrics |grep node_  |head -20
# HELP node_arp_entries ARP entries by device
# TYPE node_arp_entries gauge
node_arp_entries{device="eth0"} 3
# HELP node_boot_time_seconds Node boot time, in unixtime.
# TYPE node_boot_time_seconds gauge
node_boot_time_seconds 1.616987084e+09
# HELP node_context_switches_total Total number of context switches.
# TYPE node_context_switches_total counter
node_context_switches_total 2.105979e+06
# HELP node_cooling_device_cur_state Current throttle state of the cooling device
# TYPE node_cooling_device_cur_state gauge
node_cooling_device_cur_state{name="0",type="Processor"} 0
node_cooling_device_cur_state{name="1",type="Processor"} 0
node_cooling_device_cur_state{name="2",type="Processor"} 0
node_cooling_device_cur_state{name="3",type="Processor"} 0
# HELP node_cooling_device_max_state Maximum throttle state of the cooling device
# TYPE node_cooling_device_max_state gauge
node_cooling_device_max_state{name="0",type="Processor"} 0
node_cooling_device_max_state{name="1",type="Processor"} 0
node_cooling_device_max_state{name="2",type="Processor"} 0

```

## 默认开启的采集项目介绍

![node_exporter.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628940641000/56fe66b976ec432cb7f8cda8bf932bda.png)

## 黑名单: 关闭某一项默认开启的采集项

```shell
--no-collector.<name> flag

# 未开启前
[root@prome_master_01 node_exporter]# curl  -s  localhost:9100/metrics |grep node_cpu
# HELP node_cpu_guest_seconds_total Seconds the CPUs spent in guests (VMs) for each mode.
# TYPE node_cpu_guest_seconds_total counter
node_cpu_guest_seconds_total{cpu="0",mode="nice"} 0
node_cpu_guest_seconds_total{cpu="0",mode="user"} 0
node_cpu_guest_seconds_total{cpu="1",mode="nice"} 0
node_cpu_guest_seconds_total{cpu="1",mode="user"} 0
node_cpu_guest_seconds_total{cpu="2",mode="nice"} 0
node_cpu_guest_seconds_total{cpu="2",mode="user"} 0
node_cpu_guest_seconds_total{cpu="3",mode="nice"} 0
node_cpu_guest_seconds_total{cpu="3",mode="user"} 0
# HELP node_cpu_seconds_total Seconds the CPUs spent in each mode.
# TYPE node_cpu_seconds_total counter
node_cpu_seconds_total{cpu="0",mode="idle"} 17691.27
node_cpu_seconds_total{cpu="0",mode="iowait"} 8.9
node_cpu_seconds_total{cpu="0",mode="irq"} 0
node_cpu_seconds_total{cpu="0",mode="nice"} 0.32
node_cpu_seconds_total{cpu="0",mode="softirq"} 0.28
node_cpu_seconds_total{cpu="0",mode="steal"} 2.7

```

### 关闭cpu采集

- ./node_exporter --no-collector.cpu
- curl  -s  localhost:9100/metrics |grep node_cpu

## 白名单：关闭默认采集项而只开启某些采集

```shell
 --collector.disable-defaults --collector.<name> .

# 只开启mem采集
 ./node_exporter --collector.disable-defaults --collector.meminfo

# 只开启mem 和cpu 采集
./node_exporter --collector.disable-defaults --collector.meminfo --collector.cpu
```

## 默认关闭的原因

- 太重：High cardinality
- 太慢：Prolonged runtime that exceeds the Prometheus scrape_interval or scrape_timeout
- 太多资源开销： Significant resource demands on the host

![node_exporter.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628940641000/a3475ef63ace427cb27a9926a415ab1d.png)

# 本节重点总结 :

- 黑白名单的配置方法   --collector.`<name>`   --no-collector.`<name>`
- 为何会有默认开始的默认关闭的采集模块
  - 想做成模块化，用户传入哪些模块，再开启
  - 有些不能默认开启，因为很重，很慢

## 5.3 sdk指标和配置本地采集目录

# 本节重点介绍 : 
- prometheus sdk指标简介和如何在node_exporter中禁用
- 节点上自打点数据上报

# prometheus sdk指标

## `promhttp_` 代表访问`/metrics` 的http情况
```shell script
[root@prome_master_01 tgzs]# curl  -s  localhost:9100/metrics |grep promhttp_
# HELP promhttp_metric_handler_errors_total Total number of internal errors encountered by the promhttp metric handler.
# TYPE promhttp_metric_handler_errors_total counter
promhttp_metric_handler_errors_total{cause="encoding"} 0
promhttp_metric_handler_errors_total{cause="gathering"} 0
# HELP promhttp_metric_handler_requests_in_flight Current number of scrapes being served.
# TYPE promhttp_metric_handler_requests_in_flight gauge
promhttp_metric_handler_requests_in_flight 1
# HELP promhttp_metric_handler_requests_total Total number of scrapes by HTTP status code.
# TYPE promhttp_metric_handler_requests_total counter
promhttp_metric_handler_requests_total{code="200"} 8
promhttp_metric_handler_requests_total{code="500"} 0
promhttp_metric_handler_requests_total{code="503"} 0

```

## `go_`代表 goruntime 信息等
```shell script
# HELP go_goroutines Number of goroutines that currently exist.
# TYPE go_goroutines gauge
go_goroutines 7
# HELP go_info Information about the Go environment.
# TYPE go_info gauge
go_info{version="go1.15.8"} 1
# HELP go_memstats_alloc_bytes Number of bytes allocated and still in use.
# TYPE go_memstats_alloc_bytes gauge
go_memstats_alloc_bytes 2.781752e+06

```

## `process_`代表 进程信息等
```shell script
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.54
# HELP process_max_fds Maximum number of open file descriptors.
# TYPE process_max_fds gauge
process_max_fds 1024
# HELP process_open_fds Number of open file descriptors.
# TYPE process_open_fds gauge
process_open_fds 9
# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 1.5720448e+07

```

## 禁用golang sdk 指标
- 使用 ` --web.disable-exporter-metrics `

# 节点上自打点数据上报
- `--collector.textfile.directory=""` 配置本地采集目录
- 在采集目录里创建`.prom`文件，[格式说明](https://prometheus.io/docs/instrumenting/exposition_formats/)
```shell script
# 创建目录
mkdir ./text_file_dir
# 准备 prom文件
cat <<EOF > ./text_file_dir/test.prom
# HELP nyy_test_metric just test
# TYPE nyy_test_metric gauge
nyy_test_metric{method="post",code="200"} 1027
EOF

# 启动服务
./node_exporter --collector.textfile.directory=./text_file_dir

# curl查看数据
[root@prome_master_01 tgzs]# curl  -s  localhost:9100/metrics |grep nyy
# HELP nyy_test_metric just test
# TYPE nyy_test_metric gauge
nyy_test_metric{code="200",method="post"} 1027

```

# 本节重点总结 : 
- prometheus sdk指标简介和如何在node_exporter中禁用
- 节点上自打点数据上报

## 5.4 配置prometheus采集通过http请求参数过滤采集器

# 本节重点介绍 :

- 将node_exporter 作为采集job配置在prometheus
- node_exporter 通过http参数 过滤相关模块的指标
- prometheus如何配置 采集目标的参数
- node_export源码中怎么处理传入的模块参数

# 将node_exporter job配置在prometheus中

## job的yaml

```yaml
- job_name: node_exporter
  honor_timestamps: true
  scrape_interval: 8s
  scrape_timeout: 8s
  metrics_path: /metrics
  scheme: http
  follow_redirects: true
  static_configs:
  - targets:
    - 192.168.3.200:9100
```

## 编辑prometheus配置文件，发送热更新命令

```shell
curl -vvv  -X POST localhost:9090/-/reload
```

## 在prometheus中查询 node_exporter的指标

# http传入参数，按采集器过滤指标

## 使用

- 访问node_exporter metrics页面，传入 collect参数

```shell
# 只看cpu采集器的指标
http://192.168.0.112:9100/metrics?collect[]=cpu

# 只看cpu和mem采集器的指标
http://192.168.0.112:9100/metrics?collect[]=cpu&collect[]=meminfo
```

- prometheus配置参数

```yaml
  params:
    collect[]:
      - cpu
      - meminfo
```

- 总的配置变为

```yaml
- job_name: node_exporter
  honor_timestamps: true
  scrape_interval: 8s
  scrape_timeout: 8s
  metrics_path: /metrics
  scheme: http
  follow_redirects: true
  static_configs:
  - targets:
    - 192.168.3.200:9100
  params:
    collect[]:
      - cpu
      - meminfo
```

- 和prometheus`relabel_config`的区别 ：`按采集器过滤 VS 按metric_name 或label过滤`

## 原理： 通过http请求参数过滤采集器

- collect参数解析在  D:\nyy_work\go_path\src\github.com\prometheus\node_exporter\node_exporter.go
- 根据http传入的collect参数，进行filter采集模块过滤
- 将过滤后的模块注册到prometheus采集器上

```go
func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	filters := r.URL.Query()["collect[]"]
	level.Debug(h.logger).Log("msg", "collect query:", "filters", filters)

	if len(filters) == 0 {
		// No filters, use the prepared unfiltered handler.
		h.unfilteredHandler.ServeHTTP(w, r)
		return
	}
	// To serve filtered metrics, we create a filtering handler on the fly.
	filteredHandler, err := h.innerHandler(filters...)
	if err != nil {
		level.Warn(h.logger).Log("msg", "Couldn't create filtered metrics handler:", "err", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Sprintf("Couldn't create filtered metrics handler: %s", err)))
		return
	}
	filteredHandler.ServeHTTP(w, r)
}
```

# 本节重点总结 :

- 将node_exporter 作为采集job配置在prometheus
- node_exporter 通过http参数 过滤相关模块的指标
- prometheus如何配置 采集目标的参数
- node_export源码中怎么处理传入的模块参数

## 5.5 node_exporter采集原理简介

# 本节重点介绍 :

- node_exporter主流程源码追踪
- mem模块采集的流程

# node_exporter主流程源码追踪

## 采集器的初始化

- 初始化handler
- 源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\node_exporter.go

```go
http.Handle(*metricsPath, newHandler(!*disableExporterMetrics, *maxRequests, logger))
```

- 调用 newHandler，其中最关键一句是 innerHandler

```go
	if innerHandler, err := h.innerHandler(); err != nil {
		panic(fmt.Sprintf("Couldn't create metrics handler: %s", err))
```

- 调用 innerHandler ，其中干这么几件事
  - 根据过滤器初始化node_collector  nc
  - 把 nc注册到 prometheus的 registry 上`r.Register(nc)`
- 源码如下

```go
func (h *handler) innerHandler(filters ...string) (http.Handler, error) {
	nc, err := collector.NewNodeCollector(h.logger, filters...)
	if err != nil {
		return nil, fmt.Errorf("couldn't create collector: %s", err)
	}

	// Only log the creation of an unfiltered handler, which should happen
	// only once upon startup.
	if len(filters) == 0 {
		level.Info(h.logger).Log("msg", "Enabled collectors")
		collectors := []string{}
		for n := range nc.Collectors {
			collectors = append(collectors, n)
		}
		sort.Strings(collectors)
		for _, c := range collectors {
			level.Info(h.logger).Log("collector", c)
		}
	}

	r := prometheus.NewRegistry()
	r.MustRegister(version.NewCollector("node_exporter"))
	if err := r.Register(nc); err != nil {
		return nil, fmt.Errorf("couldn't register node collector: %s", err)
	}
	handler := promhttp.HandlerFor(
		prometheus.Gatherers{h.exporterMetricsRegistry, r},
		promhttp.HandlerOpts{
			ErrorLog:            stdlog.New(log.NewStdlibAdapter(level.Error(h.logger)), "", 0),
			ErrorHandling:       promhttp.ContinueOnError,
			MaxRequestsInFlight: h.maxRequests,
			Registry:            h.exporterMetricsRegistry,
		},
	)
	if h.includeExporterMetrics {
		// Note that we have to use h.exporterMetricsRegistry here to
		// use the same promhttp metrics for all expositions.
		handler = promhttp.InstrumentMetricHandler(
			h.exporterMetricsRegistry, handler,
		)
	}
	return handler, nil
}

```

## NewNodeCollector 初始化nc

- 源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\collector\collector.go
  - 根据 各个模块注册的 collectorState获取他们的执行函数 collector

```go
// NewNodeCollector creates a new NodeCollector.
func NewNodeCollector(logger log.Logger, filters ...string) (*NodeCollector, error) {
	f := make(map[string]bool)
	for _, filter := range filters {
		enabled, exist := collectorState[filter]
		if !exist {
			return nil, fmt.Errorf("missing collector: %s", filter)
		}
		if !*enabled {
			return nil, fmt.Errorf("disabled collector: %s", filter)
		}
		f[filter] = true
	}
	collectors := make(map[string]Collector)
	initiatedCollectorsMtx.Lock()
	defer initiatedCollectorsMtx.Unlock()
	for key, enabled := range collectorState {
		if !*enabled || (len(f) > 0 && !f[key]) {
			continue
		}
		if collector, ok := initiatedCollectors[key]; ok {
			collectors[key] = collector
		} else {
			collector, err := factories[key](log.With(logger, "collector", key))
			if err != nil {
				return nil, err
			}
			collectors[key] = collector
			initiatedCollectors[key] = collector
		}
	}
	return &NodeCollector{Collectors: collectors, logger: logger}, nil
}
```

- 各个模块会调用 在各自的init 函数中调用 registerCollector ,向 collectorState和factories注册自己

```go
func registerCollector(collector string, isDefaultEnabled bool, factory func(logger log.Logger) (Collector, error)) {
	var helpDefaultState string
	if isDefaultEnabled {
		helpDefaultState = "enabled"
	} else {
		helpDefaultState = "disabled"
	}

	flagName := fmt.Sprintf("collector.%s", collector)
	flagHelp := fmt.Sprintf("Enable the %s collector (default: %s).", collector, helpDefaultState)
	defaultValue := fmt.Sprintf("%v", isDefaultEnabled)

	flag := kingpin.Flag(flagName, flagHelp).Default(defaultValue).Action(collectorFlagAction(collector)).Bool()
	collectorState[collector] = flag

	factories[collector] = factory
}
```

![p1.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629012562000/a5d04555c589490b9666e7fc9f9dd19d.png)

## 执行采集

- prometheus sdk中执行采集就是执行对应的 Collect方法
- 源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\collector\collector.go

```go
// Collect implements the prometheus.Collector interface.
func (n NodeCollector) Collect(ch chan<- prometheus.Metric) {
	wg := sync.WaitGroup{}
	wg.Add(len(n.Collectors))
	for name, c := range n.Collectors {
		go func(name string, c Collector) {
			execute(name, c, ch, n.logger)
			wg.Done()
		}(name, c)
	}
	wg.Wait()
}
```

- 调用 execute函数，可以看到就是调用各个 collector模块的 update函数![p2.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629012562000/87c2e87308d84a16b2e00d6630151a38.png)

# mem采集模块的内容

- Update源码位置 D:\nyy_work\go_path\pkg\mod\github.com\prometheus\node_exporter@v1.2.2\collector\meminfo.go
- 源码如下

```go
// Update calls (*meminfoCollector).getMemInfo to get the platform specific
// memory metrics.
func (c *meminfoCollector) Update(ch chan<- prometheus.Metric) error {
	var metricType prometheus.ValueType
	memInfo, err := c.getMemInfo()
	if err != nil {
		return fmt.Errorf("couldn't get meminfo: %w", err)
	}
	level.Debug(c.logger).Log("msg", "Set node_mem", "memInfo", memInfo)
	for k, v := range memInfo {
		if strings.HasSuffix(k, "_total") {
			metricType = prometheus.CounterValue
		} else {
			metricType = prometheus.GaugeValue
		}
		ch <- prometheus.MustNewConstMetric(
			prometheus.NewDesc(
				prometheus.BuildFQName(namespace, memInfoSubsystem, k),
				fmt.Sprintf("Memory information field %s.", k),
				nil, nil,
			),
			metricType, v,
		)
	}
	return nil
}
```

- 内容分析
  - 通过c.getMemInfo() 获取到memInfo
  - 在linux 中memInfo中对应的就是 /proc/meminfo ，逐行解析
  - 遍历推送即可

# 本节重点总结 :

- node_exporter主流程源码追踪
- mem模块采集的流程

## 5.6 node_exporter二开新增自定义模块

# 本节重点介绍 : 
- 自定义一个模块的二开方法
- 自定义一个errLog模块，统计/var/log/message 中的错误日志

# 自定义一个模块的二开方法
- collect/目录下新建一个 errlog.go

- 定义一个结构体体errLogCollector
```go
type errLogCollector struct {
	logger log.Logger
}
```

- 写一个new xxCollector的工厂函数，一个参数为 log.logger
```go
func NewErrLogCollector(logger log.Logger) (Collector, error) {
	return &errLogCollector{logger}, nil
}

```

- 写一个 init方法调用 registerCollector 注册自己
```go
const (
	errLogSubsystem = "errlog"
)
func init() {
	registerCollector(errLogSubsystem, defaultEnabled, NewErrLogCollector)
}
```

- 给这个结构体绑定一个Update方法，签名如下

```go
func (c *xxCollector) Update(ch chan<- prometheus.Metric) error {}
```

# 完成这个Update方法
## 流程说明
- 分析 日志文件
    - $5是app的名字
    - 有info error等level字段
```shell script
Aug 15 09:54:02 prome-master01 containerd: time="2021-08-15T09:54:02.839718531+08:00" level=info msg="ExecSync for \"cedb3c6d71c0422dfe95d16b242fd08e78096606f1f9614e945cc99581b92f92\" returns with exit code 1"

```

- 执行awk可以得到一个日志文件中错误日志按app name进行分布的结果
```shell script
grep -i error /var/log/messages-20210814 |awk '{a[$5]++}END{for(i in a) print i,a[i]}'
telegraf: 3872
pushgateway: 2
kubelet: 16822
containerd: 9350
kernel: 5
grafana-server: 10

``` 

## 新增一个执行shell命令的函数
```shell script
func errLogGrep() string {
	errLogCmd := `grep -i error /var/log/messages |awk '{a[$5]++}END{for(i in a) print i,a[i]}'`
	cmd := exec.Command("sh", "-c", errLogCmd)
	output, _ := cmd.CombinedOutput()
	return string(output)

}
```
## 然后在Update中按行遍历
- 按行遍历之后再按 :分割就能得到 appname 和value
- 然后将name中的 - 替换为_
- value 字符串转换为int
- 然后构建一个 metric对象塞入ch中即可
```go
func (c *errLogCollector) Update(ch chan<- prometheus.Metric) error {
	var metricType prometheus.ValueType
	metricType = prometheus.GaugeValue
	output := errLogGrep()
	for _, line := range strings.Split(output, "\n") {
		l := strings.Split(line, ":")
		if len(l) != 2 {
			continue
		}
		name := strings.TrimSpace(l[0])
		value := strings.TrimSpace(l[1])
		v, _ := strconv.Atoi(value)
		name = strings.Replace(name, "-", "_", -1)
		level.Debug(c.logger).Log("msg", "Set errLog", "name", name, "value", value)

		ch <- prometheus.MustNewConstMetric(
			prometheus.NewDesc(
				prometheus.BuildFQName(namespace, errLogSubsystem, name),
				fmt.Sprintf("/var/log/message err log %s.", name),
				nil, nil,
			),
			metricType, float64(v),
		)
	}
	return nil
}
```

# 运行我们的程序
- 打包
- 编译  go build -v  node_exporter.go
- 然后运行 ./node_exporter  --web.listen-address=":9101"
- 查询errlog metrics
```shell script
[root@prome-master01 tgzs]# curl -s localhost:9101/metrics |grep node_errlog
# HELP node_errlog_containerd /var/log/message err log containerd.
# TYPE node_errlog_containerd gauge
node_errlog_containerd 9350
# HELP node_errlog_grafana_server /var/log/message err log grafana_server.
# TYPE node_errlog_grafana_server gauge
node_errlog_grafana_server 10
# HELP node_errlog_kernel /var/log/message err log kernel.
# TYPE node_errlog_kernel gauge
node_errlog_kernel 5
# HELP node_errlog_kubelet /var/log/message err log kubelet.
# TYPE node_errlog_kubelet gauge
node_errlog_kubelet 16822
# HELP node_errlog_pushgateway /var/log/message err log pushgateway.
# TYPE node_errlog_pushgateway gauge
node_errlog_pushgateway 2
# HELP node_errlog_telegraf /var/log/message err log telegraf.
# TYPE node_errlog_telegraf gauge
node_errlog_telegraf 3872
```

# 完整的errlog.go
```go
// Copyright 2015 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// +build darwin linux openbsd
// +build !nomeminfo

package collector

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	errLogSubsystem = "errlog"
)

type errLogCollector struct {
	logger log.Logger
}

func init() {
	registerCollector(errLogSubsystem, defaultEnabled, NewErrLogCollector)
}

// NewMeminfoCollector returns a new Collector exposing memory stats.
func NewErrLogCollector(logger log.Logger) (Collector, error) {
	return &errLogCollector{logger}, nil
}

func errLogGrep() string {
	errLogCmd := `grep -i error /var/log/messages |awk '{a[$5]++}END{for(i in a) print i,a[i]}'`
	cmd := exec.Command("sh", "-c", errLogCmd)
	output, _ := cmd.CombinedOutput()
	return string(output)

}

// Update calls (*meminfoCollector).getMemInfo to get the platform specific
// memory metrics.
func (c *errLogCollector) Update(ch chan<- prometheus.Metric) error {
	var metricType prometheus.ValueType
	metricType = prometheus.GaugeValue
	output := errLogGrep()
	for _, line := range strings.Split(output, "\n") {
		l := strings.Split(line, ":")
		if len(l) != 2 {
			continue
		}
		name := strings.TrimSpace(l[0])
		value := strings.TrimSpace(l[1])
		v, _ := strconv.Atoi(value)
		name = strings.Replace(name, "-", "_", -1)
		level.Debug(c.logger).Log("msg", "Set errLog", "name", name, "value", value)

		ch <- prometheus.MustNewConstMetric(
			prometheus.NewDesc(
				prometheus.BuildFQName(namespace, errLogSubsystem, name),
				fmt.Sprintf("/var/log/message err log %s.", name),
				nil, nil,
			),
			metricType, float64(v),
		)
	}
	return nil
}

```

# 本节重点总结 : 
- 自定义一个模块的二开方法
- 自定义一个errLog模块，统计/var/log/message 中的错误日志

