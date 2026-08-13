---
title: "5.2黑白名单配置"
sidebarGroup: "Prometheus"
shortTitle: "146 5.2黑白名单配置"
order: 146
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 黑白名单的配置方法 - 为何会有默认开始的默认关闭的采集模块 项目地址 - [node_exporter](https://github.com/prometheus/node_..."
---

> **Prometheus · 第 146 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

