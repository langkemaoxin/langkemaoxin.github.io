---
title: "4.3 四种标签匹配模式"
sidebarGroup: "Prometheus"
shortTitle: "126 4.3 四种标签匹配模式"
order: 126
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : prometheus 四种标签匹配模式 - 4种查询类型 - = 等于 - != 不等于 - =~ 正则匹配 - !~ 正则非匹配 四种标签匹配模式 1. = 等于 - 查询举例: ..."
---

> **Prometheus · 第 126 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : prometheus 四种标签匹配模式

- 4种查询类型
  - `=` 等于
  - `!=` 不等于
  - `=~` 正则匹配
  - `!~` 正则非匹配

# 四种标签匹配模式

1. `=` 等于

   - 查询举例: cpu第一个核并且是用户态的数据  node_cpu_seconds_total{mode="user",cpu="0"}
   - 查询举例: go_gc_duration_seconds{quantile="0.75"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/64e02a6e53fd4c8b8a1f22fb75ca1e04.png)
2. `!=` 不等于

   - 查询举例: 非lo网卡的接收字节数  node_network_receive_bytes_total{device!="lo"}
   - 查询举例:
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/7ee1829761b8439e9eb8735b3d9208a9.png)
3. `=~` 正则匹配

   - 查询: 挂载点以/run开头的文件系统剩余字节数  node_filesystem_avail_bytes{mountpoint=~"^/run.*"}
   - 查询:  prometheus_http_requests_total{handler=~"/api.*"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/60836f9ba2144d2ab6088ca598594647.png)
4. `!~` 正则非匹配

   - 查询: 块设备名字不包含vda的读字节数  node_disk_read_bytes_total{device!~".*vda.*"}
   - 查询: prometheus_http_requests_total{code!~".*00"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/511926903f334a78beecf55381f39f3a.png)
5. `__name__` 也是个标签，可以匹配metrics

   - 查询  {__name__=~"go.*",quantile=~".*0.*"} 等价于 go_gc_duration_seconds{quantile=~".*0.*"}
   - ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628935633000/013716bf8cd84b128505f1ac85668dfa.png)

# 本节重点介绍 : prometheus 四种标签匹配模式

- 4种查询类型

  - `=` 等于
  - `!=` 不等于
  - `=~` 正则匹配
  - `!~` 正则非匹配
- =,!=不需要正则，速度最快
- 4种可以自由组合
- 标签的key要明确给出
- `__name__` 也是个标签，可以匹配metrics
- promql中查询没数据，大多是标签匹配的问题

