---
title: 11.1 监控kafka和zookeeper的jvm
sidebarGroup: Prometheus
shortTitle: 07 11.1 监控kafka和zookeeper...
order: 7
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - jmx_exporter简介 - 监控kafka和zookeeper 的jmx jmx github地址 - prometheus官方维护的jmx_exporter，通过jmx监...'
---

> **Prometheus · 第 7 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- jmx_exporter简介
- 监控kafka和zookeeper 的jmx

# jmx github地址

- prometheus官方维护的jmx_exporter，通过jmx监控jvm指标
- 项目地址 https://github.com/prometheus/jmx_exporter
- 下载

  ```shell
  wget https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.16.1/jmx_prometheus_javaagent-0.16.1.jar

  ```

## jmx config [模板](https://github.com/prometheus/jmx_exporter/tree/master/example_configs)

- 可以通过java.lang 采集机器cpu 内存等基础信息

```shell

cat <<"EOF" > common.yaml
---   
lowercaseOutputLabelNames: true
lowercaseOutputName: true
whitelistObjectNames: ["java.lang:type=OperatingSystem"]
blacklistObjectNames: []
rules:
  - pattern: 'java.lang<type=OperatingSystem><>(committed_virtual_memory|free_physical_memory|free_swap_space|total_physical_memory|total_swap_space)_size:'
    name: os_$1_bytes
    type: GAUGE
    attrNameSnakeCase: true
  - pattern: 'java.lang<type=OperatingSystem><>((?!process_cpu_time)\w+):'
    name: os_$1
    type: GAUGE
    attrNameSnakeCase: true
EOF

```

# 配置采集kafka 和zookeeper的 jmx

- 下载kafka

```shell
wget https://archive.apache.org/dist/kafka/1.0.0/kafka_2.11-1.0.0.tgz

tar -zxvf kafka_2.11-1.0.0.tgz

```

## 修改zookeeper 启动脚本

- 修改zookeeper 添加jmx_exporter.jar启动
- 在bin/zookeeper-server-start.sh 脚本EXTRA_ARGS 下面添加 EXTRA_ARGS

```shell
# 
# EXTRA_ARGS=${EXTRA_ARGS-'-name zookeeper -loggc'}

export EXTRA_ARGS="$EXTRA_ARGS -javaagent:/opt/app/jmx_exporter/jmx_prometheus_javaagent-0.16.0.jar=9142:/opt/app/jmx_exporter/common.yaml"

```

## 启动zk

- 使用安装包中的脚本启动单节点 Zookeeper 实例：

```shell
bin/kafka-run-class.sh +289 CONSOLE_OUTPUT_FILE可能报找不到，赋个别的值就可以了
bin/zookeeper-server-start.sh -daemon config/zookeeper.properties

```

## 检查zk

- zookeeper启动应该listen 2181和9142端口

```shell
ss -ntlp |grep java 
```

## 修改 kafka的配置

- 修改 kafka-server 的配置文件，指定broker.id和log目录

```shell
vim config/server.properties

broker.id=1
log.dirs=/opt/logs/kafka-logs

```

### 修改kafka启动脚本， 添加jmx_exporter.jar启动

- 在bin/kafka-server-start.sh 脚本最上面添加下面这行

```shell
export KAFKA_OPTS="-javaagent:/opt/app/jmx_exporter/jmx_prometheus_javaagent-0.16.1.jar=9309:/opt/app/jmx_exporter/kafka-agent.yaml"

```

## 启动kafka

- 使用 kafka-server-start.sh 启动 kafka 服务：

```
bin/kafka-server-start.sh -daemon config/server.properties

```

## 检查kafka

- zookeeper启动应该listen 9309端口

```shell
ss -ntlp |grep java 
```

## 检查jmx_exporter指标暴露的情况

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511459000/5f69c27a78a64991b2ecd9acd7ecd230.png)

## kafka创建 topic

- 使用 kafka-topics.sh 创建 topic test和hello

```shell
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic test
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 2 --topic Hello

```

## 查看 topic 列表：

```shell
bin/kafka-topics.sh --list --zookeeper localhost:2181
```

## 产生消息

- 使用 kafka-console-producer.sh 发送消息：

```shell
bin/kafka-console-producer.sh --broker-list localhost:9092 --topic test

bin/kafka-console-consumer.sh -bootstrap-server localhost:9092 --topic aggrin --from-beginning

```

## 消费消息

- 使用 kafka-console-consumer.sh 接收消息并在终端打印：

```shell
bin/kafka-console-consumer.sh --zookeeper localhost:2181 --topic test --from-beginning

```

## 查看描述 topics 信息

```shell
bin/kafka-topics.sh --describe --zookeeper localhost:2181 --topic test

```

# 本节重点总结 :

- jmx_exporter简介
- 监控kafka和zookeeper 的jmx
  - 通过启动的java应用的时候将 jmx_prometheus_javaagent-0.16.0.jar注入进去

