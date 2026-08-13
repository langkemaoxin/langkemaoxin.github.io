---
title: "33.3 prometheus 低成本存储multi_remote_read方案说明"
sidebarGroup: "Prometheus"
shortTitle: "99 33.3 prometheus 低成本存储m..."
order: 99
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - prometheus 低成本存储multi_remote_read方案说明 - 数据重复怎么办 - 配置prometheus remote_read prometheus 架构图..."
---

> **Prometheus · 第 99 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- prometheus 低成本存储multi_remote_read方案说明

  - 数据重复怎么办
- 配置prometheus remote_read prometheus

# 架构图

![mu01.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743019000/63cfccd7bc4c470e9792e7f706cb4f15.png)

# multi_remote_read方案说明

> 如果我们配置了多个remote_read 接口的话即可实现 multi

```yaml
remote_read:
  - url: "http://172.20.70.205:9090/api/v1/read"
    read_recent: true
  - url: "http://172.20.70.215:9090/api/v1/read"
    read_recent: true

```

## 上述配置代表并发查询两个后端存储，并可以对查询的结果进行merge

- merge有啥用： 以为着你们的查询promql或者alert配置文件无需关心数据到底存储在哪个存储里面
- 可以直接使用全局的聚合函数

## prometheus可以remote_read prometheus自己

- 感觉这个特点很多人不知道，以为remote_read必须配置第三方存储如 m3db等

## 所以结合上述两个特点就可以用多个采集的prometheus + 多个无状态的prometheus query实现prometheus的高可用方案

- 监控数据存储在多个采集器的本地，可以是机器上的prometheus
- 也可以是k8s中的prometheus statefulset
- prometheus query remote_read 填写多个`prometheus/api/v1/read/`地址

### 数据重复怎么办

- 不用管，上面提到了query会做merge，多个数据只会保留一份
- 到正可以利用这个特点模拟副本机制：
  - 重要的采集job由两个以上的采集prometheus采集
  - 查询的时候merge数据
  - 可以避免其中一个挂掉时没数据的问题

### 那么这种方案的缺点在哪里

- 并发查询必须要等最慢的那个返回才返回，所以如果有个慢的节点会导致查询速度下降，举个例子

  - 有个美东的节点，网络基础延迟是1秒，那么所有查询无论返回多快都必须叠加1秒的延迟
- 应对重查询时可能会把query打挂

  - 但也正是这个特点，会很好的保护后端存储分片
  - 重查询的基数分散给多个采集器了
- 由于是无差别的并发query，也就是说所有的query都会打向所有的采集器，会导致一些采集器总是查询不存在他这里的数据

  - 那么一个关键性的问题就是，查询不存在这个prometheus的数据的资源开销到底是多少
  - 据我观察，新版本速度还是很快的说明资源开销不会在很深的地方才判断出不属于我的数据
  - m3db有布隆过滤器来防止这个问题

# 配置prometheus remote_read prometheus

## 01 两个prometheus采集器只保留 采集本机node_exporter的job

- 配置如下

```yaml
global:
  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  query_log_file: /opt/logs/prometheus_query_log

scrape_configs:
  - job_name: node_exporter
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
    - targets:
      - 192.168.0.106:9100
```

- 这样在单一prometheus中只能查询到自己的数据

## 02 启动一个 p_query的服务 multi_remote_read 多个采集器

- 准备数据目录

```shell
mkdir -pv  /opt/app/p_query/
tar xf /opt/tgzs/prometheus-2.29.1.linux-amd64.tar.gz -C /root
/bin/cp -fa /root/prometheus-2.29.1.linux-amd64/* /opt/app/p_query/

```

- 配置如下

```shell
cat <<EOF >/opt/app/p_query/p_query.yml
global:
  scrape_interval:     15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  query_log_file: /opt/logs/prometheus_query_log

remote_read:
  - url: "http://192.168.3.200:9090/api/v1/read"
    read_recent: true
  - url: "http://192.168.3.201:9090/api/v1/read"
    read_recent: true
EOF
```

- 准备service 文件

```shell
cat <<EOF >/etc/systemd/system/p_query.service 
[Unit]
Description="p_query"
Documentation=https://p_query.io/
After=network.target

[Service]
Type=simple
ExecStart=/opt/app/p_query/prometheus  --config.file=/opt/app/p_query/p_query.yml  --web.enable-lifecycle --web.listen-address=0.0.0.0:8090

Restart=on-failure
SuccessExitStatus=0
LimitNOFILE=65536
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=p_query

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl restart p_query
```

## 03验证 查询效果

- 验证在 p_query服务上，即可查到所有数据
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743019000/2c283edcec9f4354934d6807918f9269.png)
- 验证grafana node_exporter大盘替换数据源 可以查到所有的机器数据
  - 先新建一个p_query的数据源 8090，地址是这个multi_remote_read的prometheus的地址
  - 导入 node_exporter大盘，注意改名字和id https://grafana.com/grafana/dashboards/8919
  - 验证新的大盘上能查到两个机器的数据，对比一个prometheus数据源的大盘
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743019000/559a728201eb4144b3cb275f652a3737.png)
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743019000/98e515c9ef30487dbac586ebc390ca90.png)

# 本节重点总结 :

- prometheus 低成本存储multi_remote_read方案说明

  - 数据重复怎么办
- 配置prometheus remote_read prometheus

