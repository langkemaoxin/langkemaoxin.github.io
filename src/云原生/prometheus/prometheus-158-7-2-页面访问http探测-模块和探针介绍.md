---
title: "7.2 页面访问http探测，模块和探针介绍"
sidebarGroup: "Prometheus"
shortTitle: "158 7.2 页面访问http探测，模块和探针介绍"
order: 158
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 访问的是/probe path 而非 /metrics - 需要传入target参数 作为探测的目标地址 - module参数代表使用哪个探测的模块 - debug=true参数..."
---

> **Prometheus · 第 158 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

