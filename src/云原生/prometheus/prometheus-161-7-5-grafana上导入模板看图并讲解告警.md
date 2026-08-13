---
title: 7.5 grafana上导入模板看图并讲解告警
sidebarGroup: Prometheus
shortTitle: 161 7.5 grafana上导入模板看图并讲解告...
order: 161
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - blackbox_exporter grafana大盘导入和查看 - 告警配置讲解 grafana大盘 grafana 上导入 blackbox_exporter dashboa...'
---

> **Prometheus · 第 161 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

