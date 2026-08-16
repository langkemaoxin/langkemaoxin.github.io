---
title: Prometheus 第7章：服务发现与 Relabel
sidebarGroup: 可观测性
shortTitle: 19 服务发现与 Relabel
order: 19
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第7章（服务发现与 Relabel）合并笔记
---

> **Prometheus · 第 7 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 7.1 使用ansible部署 blackbox_exporter

# 本节重点介绍 : 
- ansible 部署二进制 blackbox_exporter

## 项目地址 
- 项目地址 https://github.com/prometheus/blackbox_exporter
## 下载地址 
```shell script
wget -O  /opt/tgzs/blackbox_exporter-0.18.0.linux-amd64.tar.gz https://github.com/prometheus/blackbox_exporter/releases/download/v0.18.0/blackbox_exporter-0.18.0.linux-amd64.tar.gz

```

##  使用ansible部署 blackbox_exporter
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
- 执行ansible-playbook

```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=blackbox_exporter-0.18.0.linux-amd64.tar.gz" -e "app=blackbox_exporter"

```

## 检查部署情况

```shell script

# 查看端口 进程 日志
ss -ntlp |grep 9115
ps -ef |grep blackbox_exporter |grep -v grep 

```

# 本节重点总结 : 
- ansible 部署二进制 blackbox_exporter

## 7.2 页面访问http探测，模块和探针介绍

# 本节重点介绍 : 

- 访问的是/probe path 而非 /metrics
- 需要传入target参数 作为探测的目标地址
- module参数代表使用哪个探测的模块
- debug=true参数打印探测的完整过程
- 默认支持的7种探测模块解析
- 底层3种探针

# 页面访问blackbox 
- 地址 http://$blackbox_exporter_ip:9115/

## 页面访问target http探测
```shell script
http://$blackbox_exporter_ip:9115/probe?target=https://www.baidu.com&module=http_2xx&debug=true

```

## 结果解读
```shell script

Logs for the probe:
ts=2021-03-30T07:28:17.405299592Z caller=main.go:304 module=http_2xx target=https://www.baidu.com level=info msg="Beginning probe" probe=http timeout_seconds=119.5
ts=2021-03-30T07:28:17.40563586Z caller=http.go:342 module=http_2xx target=https://www.baidu.com level=info msg="Resolving target address" ip_protocol=ip6
ts=2021-03-30T07:28:17.414113889Z caller=http.go:342 module=http_2xx target=https://www.baidu.com level=info msg="Resolved target address" ip=110.242.68.4
ts=2021-03-30T07:28:17.414249109Z caller=client.go:252 module=http_2xx target=https://www.baidu.com level=info msg="Making HTTP request" url=https://110.242.68.4 host=www.baidu.com
ts=2021-03-30T07:28:17.459576352Z caller=main.go:119 module=http_2xx target=https://www.baidu.com level=info msg="Received HTTP response" status_code=200
ts=2021-03-30T07:28:17.459696667Z caller=main.go:119 module=http_2xx target=https://www.baidu.com level=info msg="Response timings for roundtrip" roundtrip=0 start=2021-03-30T15:28:17.414370915+08:00 dnsDone=2021-03-30T15:28:17.414370915+08:00 connectDone=2021-03-30T15:28:17.423500145+08:00 gotConn=2021-03-30T15:28:17.449441723+08:00 responseStart=2021-03-30T15:28:17.459467652+08:00 end=2021-03-30T15:28:17.459684294+08:00
ts=2021-03-30T07:28:17.459886914Z caller=main.go:304 module=http_2xx target=https://www.baidu.com level=info msg="Probe succeeded" duration_seconds=0.054504338

Metrics that would have been returned:
# HELP probe_dns_lookup_time_seconds Returns the time taken for probe dns lookup in seconds
# TYPE probe_dns_lookup_time_seconds gauge
probe_dns_lookup_time_seconds 0.008485086
# HELP probe_duration_seconds Returns how long the probe took to complete in seconds
# TYPE probe_duration_seconds gauge
probe_duration_seconds 0.054504338
# HELP probe_failed_due_to_regex Indicates if probe failed due to regex
# TYPE probe_failed_due_to_regex gauge
probe_failed_due_to_regex 0
# HELP probe_http_content_length Length of http content response
# TYPE probe_http_content_length gauge
probe_http_content_length 227
# HELP probe_http_duration_seconds Duration of http request by phase, summed over all redirects
# TYPE probe_http_duration_seconds gauge
probe_http_duration_seconds{phase="connect"} 0.009129316
probe_http_duration_seconds{phase="processing"} 0.01002596
probe_http_duration_seconds{phase="resolve"} 0.008485086
probe_http_duration_seconds{phase="tls"} 0.035070878
probe_http_duration_seconds{phase="transfer"} 0.000216612
# HELP probe_http_redirects The number of redirects
# TYPE probe_http_redirects gauge
probe_http_redirects 0
# HELP probe_http_ssl Indicates if SSL was used for the final redirect
# TYPE probe_http_ssl gauge
probe_http_ssl 1
# HELP probe_http_status_code Response HTTP status code
# TYPE probe_http_status_code gauge
probe_http_status_code 200
# HELP probe_http_uncompressed_body_length Length of uncompressed response body
# TYPE probe_http_uncompressed_body_length gauge
probe_http_uncompressed_body_length 227
# HELP probe_http_version Returns the version of HTTP of the probe response
# TYPE probe_http_version gauge
probe_http_version 1.1
# HELP probe_ip_addr_hash Specifies the hash of IP address. It's useful to detect if the IP address changes.
# TYPE probe_ip_addr_hash gauge
probe_ip_addr_hash 4.37589817e+08
# HELP probe_ip_protocol Specifies whether probe ip protocol is IP4 or IP6
# TYPE probe_ip_protocol gauge
probe_ip_protocol 4
# HELP probe_ssl_earliest_cert_expiry Returns earliest SSL cert expiry in unixtime
# TYPE probe_ssl_earliest_cert_expiry gauge
probe_ssl_earliest_cert_expiry 1.627277462e+09
# HELP probe_ssl_last_chain_expiry_timestamp_seconds Returns last SSL chain expiry in timestamp seconds
# TYPE probe_ssl_last_chain_expiry_timestamp_seconds gauge
probe_ssl_last_chain_expiry_timestamp_seconds 1.627277462e+09
# HELP probe_ssl_last_chain_info Contains SSL leaf certificate information
# TYPE probe_ssl_last_chain_info gauge
probe_ssl_last_chain_info{fingerprint_sha256="2ed189349f818f3414132ebea309e36f620d78a0507a2fa523305f275062d73c"} 1
# HELP probe_success Displays whether or not the probe was a success
# TYPE probe_success gauge
probe_success 1
# HELP probe_tls_version_info Contains the TLS version used
# TYPE probe_tls_version_info gauge
probe_tls_version_info{version="TLS 1.2"} 1

Module configuration:
prober: http
http:
    ip_protocol_fallback: true
tcp:
    ip_protocol_fallback: true
icmp:
    ip_protocol_fallback: true
dns:
    ip_protocol_fallback: true
```

# 默认支持的7种探测模块解析
- http_2xx 代表http get方法，返回code为 2xx代表正常
- http_post_2xx 代表http post方法，返回code为 2xx代表正常
- icmp 代表icmp 协议
- irc_banner 代表irc协议 ，需要匹配发送的请求和响应
- pop3s_banner 代表邮局协议
- ssh_banner 代表ssh探活
- tcp_connect 代表tcp端口探活

```yaml
modules:
    http_2xx:
        prober: http
        http:
            ip_protocol_fallback: true
        tcp:
            ip_protocol_fallback: true
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
    http_post_2xx:
        prober: http
        http:
            ip_protocol_fallback: true
            method: POST
        tcp:
            ip_protocol_fallback: true
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
    icmp:
        prober: icmp
        http:
            ip_protocol_fallback: true
        tcp:
            ip_protocol_fallback: true
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
    irc_banner:
        prober: tcp
        http:
            ip_protocol_fallback: true
        tcp:
            ip_protocol_fallback: true
            query_response:
                - send: NICK prober
                - send: USER prober prober prober :prober
                - expect: PING :([^ ]+)
                  send: PONG ${1}
                - expect: ^:[^ ]+ 001
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
    pop3s_banner:
        prober: tcp
        http:
            ip_protocol_fallback: true
        tcp:
            ip_protocol_fallback: true
            query_response:
                - expect: ^+OK
            tls: true
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
    ssh_banner:
        prober: tcp
        http:
            ip_protocol_fallback: true
        tcp:
            ip_protocol_fallback: true
            query_response:
                - expect: ^SSH-2.0-
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
    tcp_connect:
        prober: tcp
        http:
            ip_protocol_fallback: true
        tcp:
            ip_protocol_fallback: true
        icmp:
            ip_protocol_fallback: true
        dns:
            ip_protocol_fallback: true
```

# 对应的3种底层探针
- tcp 
- http
- icmp

# 本节重点总结 : 
- 访问的是/probe path 而非 /metrics
- 需要传入target参数 作为探测的目标地址
- module参数代表使用哪个探测的模块
- debug=true参数打印探测的完整过程
- 默认支持的7种探测模块解析
- 底层3种探针

## 7.3 多实例采集的说明relabel配置

# 本节重点介绍 :

- 使用 relabel_configs配置blackbox采集
- http探测指标讲解

# 使用参数将采集任务配置到prometheus

## blackbox_exporter 需要传入target 和 module 参数，采用下列方式加入的采集池中

```yaml
  - job_name: 'blackbox-http'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
      target: [prometheus.io,www.baidu.com,172.20.70.205:3000]
    static_configs:
      - targets:
        - 172.20.70.205:9115 
```

## 会发现如此配置之后 实例数据只有blackbox_exporter的地址 而没有target的地址

- prometheus页面查询数据

```shell
probe_duration_seconds{instance="172.20.70.205:9115", job="blackbox-http"}
```

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/b3c825fbea9c492eb68103314a071401.png)

## 正确配置方式

### 使用 relabel_configs 做标签替换

```yaml
scrape_configs:
  - job_name: 'blackbox-http'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    static_configs:
      - targets:
        - http://prometheus.io    # Target to probe with http.
        - https://www.baidu.com   # Target to probe with https.
        - http://172.20.70.205:3000 # Target to probe with http on port 3000.
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 127.0.0.1:9115  # The blackbox exporter's real hostname:port.

```

### 查看效果

- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/ffef0289db39496e966fc33c21e784d0.png)

# http探测指标讲解

- probe_http_ssl =1 代表是https
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/38056bab94234ac599ddd2cbe500497f.png)
- probe_http_status_code  状态码
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/9092c9032d29470f9d5bf92785d54243.png)
- probe_http_duration_seconds 分阶段耗时统计
- probe_duration_seconds 总耗时
- probe_success  =1代表成功
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510916000/3edd51937b0d43fab04f0b1efce88862.png)

# 本节重点介绍 :

- 使用 relabel_configs配置blackbox采集
- http探测指标讲解

## 7.4 ssh探测和ping探测使用

# 本节重点介绍 :

- ssh探测和icmp探测的配置方法
- 探测模块中可以使用query_response，过滤响应中的字符串，来决定探测是否成功

# ssh探测

## 配置方法

```yaml
  - job_name: 'blackbox-ssh'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      # 使用ssh_banner模块
      module: [ssh_banner] 
    static_configs:
      - targets:
        - ip1:22   
        - ip2:22  
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox_exporter:9115  # The blackbox exporter's real hostname:port.
```

## 原理解析

- 使用ssh_banner模块，对应tcp探针
- 看配置说明要求返回值中有SSH-2.0-字符串则为探测成功

```yaml
    ssh_banner:
        prober: tcp

        tcp:
            ip_protocol_fallback: true
            query_response:
                - expect: ^SSH-2.0-

```

- 结果截图
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510956000/e24edd3c38014e11b84f93d211231a18.png)
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510956000/a16ce6a512974f2fb6d169fd37aa6816.png)

# icmp探测

## 配置方法

```yaml
  - job_name: 'blackbox_icmp'
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
      - targets:
        - ip1
        - ip2
        - baidu.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 127.0.0.1:9115  # The blackbox exporter's real hostname:port.
```

## 原理解析

- 使用icmp模块，对应icmp探针
- 结果截图
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510956000/966c4c1e88b24d27aa58ba55e54bdf68.png)

# 本节重点总结 :

- ssh探测和icmp探测的配置方法
- 探测模块中可以使用query_response，过滤响应中的字符串，来决定探测是否成功

## 7.5 grafana上导入模板看图并讲解告警

# 本节重点介绍 :

- blackbox_exporter grafana大盘导入和查看
- 告警配置讲解

# grafana大盘

## grafana 上导入 blackbox_exporter dashboard

- 地址 https://grafana.com/grafana/dashboards/13659
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510980000/91d23dc060fb40ac84de9c95e12e41db.png)
- http总览图
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510980000/f725efcddb5d4b3b8659a19076f688a9.png)
- value_mapping设置 展示
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510980000/5e3d30ec6a564e71b41d19767d5d402d.png)
- 设置阈值，展示不同背景色
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510980000/74f06a285fd04d11b03dd8d34c339028.png)

# 告警配置讲解

## 所有模块都适用的

- 探测失败`probe_success ==0`
- 探测时间阈值` probe_duration_seconds  > 5`
- dns解析时间超过5秒` probe_dns_lookup_time_seconds  > 5`

## http模块

- http接口返回状态码4xx/5xx错误`probe_http_status_code >=400`
- https证书过期时间小于7天`(probe_ssl_earliest_cert_expiry - time()) / 3600 / 24 <7`
- http探测连接耗时大于5秒`probe_http_duration_seconds{phase="connect"} >5 `
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510980000/68d61982fad04108a1c29cfd8f162b19.png)

# 根据instance 进行row的repeat

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629510980000/3e06f892ae564a40b7d77eb5e838b277.png)

# 本节重点总结 :

- blackbox_exporter grafana大盘导入和查看
- 告警配置讲解

## 7.6 blackbox框架源码和http探测源码解读

# 本节重点介绍 :

- blackbox框架源码解读
  - 根据模块找到探针
  - 对目标执行探针方法
- http 探测代码
  - 使用net/http/httptrace库进行trace
  - 钩子函数设置时刻
  - time.sub计算时间差

# blackbox框架源码解读

## main中注册 /probe handler

```go
	http.HandleFunc(path.Join(*routePrefix, "/probe"), func(w http.ResponseWriter, r *http.Request) {
		sc.Lock()
		conf := sc.C
		sc.Unlock()
		probeHandler(w, r, conf, logger, rh)
	})
```

## probeHandler函数中 解析请求的module参数和target参数

- 获取 module参数

```go
moduleName := r.URL.Query().Get("module")
```

- 根据启动时配置文件中加载的模块找到对应的模块

```go
module, ok := c.Modules[moduleName]
```

- 解析请求的target参数

```go
target := params.Get("target")
```

- 根据解析得到的模块，找到对应的底层探针

```go
prober, ok := Probers[module.Prober]
```

- 执行对应的探针函数，这步是核心

```go
success := prober(ctx, target, module, registry, sl)
```

# http 探测代码解读

- 根据上面的解读我们，得知最核心的流程就是探针函数的执行

## http探针

- 代码位置 D:\go_path\pkg\mod\github.com\prometheus\blackbox_exporter@v0.19.0\prober\http.go 中的ProbeHTTP

### 源码解读

- 底层使用 net/http/httptrace库
- 在HTTP客户端请求的整个生命周期中收集细粒度信息的工具， 收集的信息可用于调试延迟问题，服务监控，编写自适应系统等。

```go
	trace := &httptrace.ClientTrace{
		DNSStart:             tt.DNSStart,
		DNSDone:              tt.DNSDone,
		ConnectStart:         tt.ConnectStart,
		ConnectDone:          tt.ConnectDone,
		GotConn:              tt.GotConn,
		GotFirstResponseByte: tt.GotFirstResponseByte,
		TLSHandshakeStart:    tt.TLSHandshakeStart,
		TLSHandshakeDone:     tt.TLSHandshakeDone,
	}
	request = request.WithContext(httptrace.WithClientTrace(request.Context(), trace))

```

- 这个库的用法就是可以在http各个阶段设置对应的钩子处理函数
- 同时设定很多时间点对象

```go
// roundTripTrace holds timings for a single HTTP roundtrip.
type roundTripTrace struct {
	tls           bool
	start         time.Time
	dnsDone       time.Time
	connectDone   time.Time
	gotConn       time.Time
	responseStart time.Time
	end           time.Time
	tlsStart      time.Time
	tlsDone       time.Time
}

```

- 那么在对应的事件触发时，trace调用实现设定好的钩子函数给相关的时间对象赋值，比如下面的dns解析结束的例子
- DNSDone发生时将dnsDone时间对象设置为当前时间

```go
func (t *transport) DNSDone(_ httptrace.DNSDoneInfo) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.current.dnsDone = time.Now()
}
```

- 最后进行各阶段统计耗时的计算，算时间差即可

```go
durationGaugeVec.WithLabelValues("resolve").Add(trace.dnsDone.Sub(trace.start).Seconds())
```

- 各阶段耗时统计
- ```shell
  ## http trace中对于http各个状态的描述
  - dns解析时间:              DNSDone-DNSStart
  - tls握手时间:              gotConn - DNSDone
  - tls connect连接时间:      connectDone - DNSDone
  - 非tls connect连接时间:    gotConn - DNSDone
  - processing 服务端处理时间: responseStart - gotConn
  - transfer 数据传输时间:     end - responseStart
  ```
- 类似的代码可以看下[httpstat](https://github.com/davecheney/httpstat/blob/master/screenshot.png)
- ```
  go get github.com/davecheney/httpstat
  ```

  ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511000000/4c7654dae3174ea99fbfc6ec3087b28a.png)

# 本节重点总结:

- blackbox框架源码解读
  - 根据模块找到探针
  - 对目标执行探针方法
- http 探测代码
  - 使用net/http/httptrace库进行trace
  - 钩子函数设置时刻
  - time.sub计算时间差

## 7.7 prometheus relabel address替换源码解析

# 本节重点介绍 : 

- 多实例探针型采集配置解读
- relabel源码阅读
- __address__标签和target的关系
- 采集http请求时获取target最终参数

# 多实例探针型采集配置
```yaml
  - job_name: 'blackbox-http'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    static_configs:
      - targets:
        - http://prometheus.io    # Target to probe with http.
        - https://www.baidu.com   # Target to probe with https.
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 127.0.0.1:9115  # The blackbox exporter's real hostname:port.

```

## 进行一下解读
1. prometheus首先读取job中的targets，把target赋值给 `__address__`标签 ，此标签代表采集的地址
2. 将 `__address__`标签 赋值给`__param_target`标签，因为prometheus 访问blackbox需要传参， `__param_target`代表target参数
3. 将 `__param_target`标签  赋值给instance标签，因为后面监控数据需要instance标签做 被探测实例的标记
4. 将`__address__`标签 替换成真实的blackbox地址，因为prometheus是请求blackbox地址而不是 探测的目标地址

# relabel源码阅读
- 位置在D:\go_path\pkg\mod\github.com\prometheus\prometheus\scrape\target.go+ 328 
- populateLabels函数 ，处理标签relabel流程

- 先设置job级别的 3个标签 `job、__metrics_path__、 __scheme__`
```go
	scrapeLabels := []labels.Label{
		{Name: model.JobLabel, Value: cfg.JobName},
		{Name: model.MetricsPathLabel, Value: cfg.MetricsPath},
		{Name: model.SchemeLabel, Value: cfg.Scheme},
	}
```
- 再根据job配置中的 params设置所有参数标签 `__param_`
```go
    //  再根据job配置中的 params设置所有参数标签 `__param_`
    	for k, v := range cfg.Params {
		if len(v) > 0 {
			lb.Set(model.ParamLabelPrefix+k, v[0])
		}
	}
```

- 调用 relabel.Process处理relabel config
- relabel.Process中会根据配置的action 进行处理

```go
	switch cfg.Action {
	case Drop:
		if cfg.Regex.MatchString(val) {
			return nil
		}
	case Keep:
		if !cfg.Regex.MatchString(val) {
			return nil
		}
	case Replace:
		lb.Set(string(target), string(res))
    }
```  
-  默认的action就是 replace
```go
	DefaultRelabelConfig = Config{
		Action:      Replace,
		Separator:   ";",
		Regex:       MustNewRegexp("(.*)"),
		Replacement: "$1",
	}
```
- 对于我们上面的例子中就是 source赋值给target
- 再回到populateLabels函数， 处理__address__标签，如果没有端口 则设置端口和scheme 
```go
lb.Set(model.AddressLabel, addr)
```
- 删掉 __meta_开头的标签
```go
    for _, l := range lset {
    if strings.HasPrefix(l.Name, model.MetaLabelPrefix) {
        lb.Del(l.Name)
    }
```
- populateLabels最后一步 ，把将 instance标签设置为addr的值 
```go
if v := lset.Get(model.InstanceLabel); v == "" {
    lb.Set(model.InstanceLabel, addr)
}
```
- addr 就是 __address__的值

# __address__标签和target的关系
- __address__标签来自于 各个服务发现给出的，比如常规的yaml解析的时候
- D:\go_path\pkg\mod\github.com\prometheus\prometheus@v1.8.2-0.20210321183757-31a518faab18\discovery\targetgroup\targetgroup.go
```go
func (tg *Group) UnmarshalYAML(unmarshal func(interface{}) error) error {
	g := struct {
		Targets []string       `yaml:"targets"`
		Labels  model.LabelSet `yaml:"labels"`
	}{}
	if err := unmarshal(&g); err != nil {
		return err
	}
	tg.Targets = make([]model.LabelSet, 0, len(g.Targets))
	for _, t := range g.Targets {
		tg.Targets = append(tg.Targets, model.LabelSet{
			model.AddressLabel: model.LabelValue(t),
		})
	}
	tg.Labels = g.Labels
	return nil
}
```

# 采集http请求时获取target最终参数
- 这些参数后面会加在请求目标地址的时候，代码位置 D:\go_path\src\github.com\prometheus\prometheus\scrape\target.go
- 在target的URL方法中可以看到 几个重要的参数 Schema、host、path、params
```go
func (t *Target) URL() *url.URL {
	params := url.Values{}

	for k, v := range t.params {
		params[k] = make([]string, len(v))
		copy(params[k], v)
	}
	for _, l := range t.labels {
		if !strings.HasPrefix(l.Name, model.ParamLabelPrefix) {
			continue
		}
		ks := l.Name[len(model.ParamLabelPrefix):]

		if len(params[ks]) > 0 {
			params[ks][0] = l.Value
		} else {
			params[ks] = []string{l.Value}
		}
	}

	return &url.URL{
		Scheme:   t.labels.Get(model.SchemeLabel),
		Host:     t.labels.Get(model.AddressLabel),
		Path:     t.labels.Get(model.MetricsPathLabel),
		RawQuery: params.Encode(),
	}
}
```

- 在最终的采集动作中，会获取target的URL方法获取 地址和参数，位置 D:\go_path\src\github.com\prometheus\prometheus\scrape\scrape.go
```go
func (s *targetScraper) scrape(ctx context.Context, w io.Writer) (string, error) {
	if s.req == nil {
		req, err := http.NewRequest("GET", s.URL().String(), nil)
    }
}
```

# 本节重点总结: 

- 多实例探针型采集配置解读
- relabel源码阅读
- __address__标签和target的关系
- 采集http请求时获取target最终参数

