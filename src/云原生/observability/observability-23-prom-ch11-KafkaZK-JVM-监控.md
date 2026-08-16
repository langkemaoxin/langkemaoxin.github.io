---
title: Prometheus 第11章：Kafka/ZK JVM 监控
sidebarGroup: 可观测性
shortTitle: 23 Kafka/ZK JVM 监控
order: 23
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第11章（Kafka/ZK JVM 监控）合并笔记
---

> **Prometheus · 第 11 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 11.1 监控kafka和zookeeper的jvm

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

## 11.2 导入grafana大盘和指标讲解

# 本节重点介绍 :

- grafana 上导入jmx_exporter dashboard
- 核心指标讲解

# 将采集配置到prometheus中

- 通过labels打静态的标签，java_app指明这个jmx属于哪个java app

```yaml
  - job_name: 'jmx_exporter'
    honor_timestamps: true
    scrape_interval: 15s
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets: ["192.168.3.200:9309"]
        labels:
          java_app: kafka
      
      - targets: ["192.168.3.200:9142"]
        labels:
          java_app: zookeeper
```

# grafana 上导入jmx_exporter dashboard

- https://grafana.com/grafana/dashboards/10519
- 举例图片
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511492000/e6f7b6f1887544d2819b6f734394bf88.png)

# 核心指标讲解

## jvm_info

- label_join(jvm_info, "jdk", ", ", "vendor", "runtime", "version")

## 左右Y轴展示

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511492000/66e518057f6d4bedaf975f1e4cea2e17.png)

## 内存指标

| 指标名                                        | 指标含义                                                       | 标签举例和说明                                                                                                                                                                                                                                                              | 说明              |
| --------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| jvm_memory_bytes_used                         | jvm内存使用                                                    | area标签:`<br>`	heap 堆区 `<br>` nonheap非堆区                                                                                                                                                                                                                          |                   |
| jvm_memory_bytes_committed                    | 返回提交给 Java 虚拟机使用的内存量（以字节为单位）             | -                                                                                                                                                                                                                                                                           |                   |
| jvm_memory_bytes_max                          | jvm最大内存                                                    | -                                                                                                                                                                                                                                                                           |                   |
| jvm_memory_bytes_init                         | jvm 初始化内存                                                 | -                                                                                                                                                                                                                                                                           |                   |
| jvm_memory_bytes_used/jvm_memory_bytes_max    | jvm内存使用百分比                                              | -                                                                                                                                                                                                                                                                           |                   |
| jvm_memory_objects_pending_finalization       | 在队列中等待的对象个数                                         | -                                                                                                                                                                                                                                                                           |                   |
| jvm_memory_pool_bytes_max                     | jvm内存池最大值                                                | code Cache是JVM用来存储native code的，因为是用Heap的形式来存储的，所以叫Code Heap。Code Heap被分为三个部分，Non-method，Profiled和Non-profiled。                                                                                                                            |                   |
| -                                             | jvm内存池最大值                                                | pool标签:`<br>`  Non-method部分包含的是非方法的code，比如说编译器缓冲区和字节码解释器。这些代码是永久保存在代码缓存区中的。代码堆的大小是固定的                                                                                                                           |                   |
| -                                             | -                                                              | pool="CodeHeap 'non-nmethods'"`<br>`  Non-method部分包含的是非方法的code，比如说编译器缓冲区和字节码解释器。这些代码是永久保存在代码缓存区中的。代码堆的大小是固定的                                                                                                      |                   |
| -                                             | -                                                              | pool="CodeHeap 'non-profiled nmethods'"`<br>`  Non-profiled存放的是优化过的，non-profiled方法，并且他们的生命周期会比较长。Non-profiled用-XX:NonProfiledCodeHeapSize来控制。                                                                                              |                   |
| -                                             | -                                                              | pool="CodeHeap 'profiled nmethods'"`<br>` Profiled部分表示存的是生命周期比较短的稍微优化的profiled methods。Profiled使用–XX:ProfiledCodeHeapSize来控制。                                                                                                                 |                   |
| -                                             | -                                                              | pool="Compressed Class Space"`<br>` 最后还有一个Compressed Class Space，它是和-XX:+UseCompressedOops，-XX:+UseCompressedClassesPointers有关的。实际上是一个指针的压缩，可以使用32bits来表示之前64bits的指针。                                                             |                   |
| -                                             | -                                                              | pool="Metaspace"`<br>` 在JDK8之前，类定义、字节码和常量等很少会变更的信息是放在持久代Perm Gen中的。不过在JDK8之后，Perm Gen已经被取消了，现在叫做Metaspace。Metaspace并不在java虚拟机中，它使用的是本地内存。Metaspace可以通过-XX:MaxMetaspaceSize来控制。                |                   |
| -                                             | -                                                              | pool="G1 Eden Space"`<br>` Young Gen被划分为1个Eden Space和2个Suvivor Space。当对象刚刚被创建的时候，是放在Eden space。垃圾回收的时候，会扫描Eden Space和一个Suvivor Space。如果在垃圾回收的时候发现Eden Space中的对象任然有效，则会将其复制到另外一个Suvivor Space。     |                   |
| -                                             | -                                                              | pool="G1 Old Gen"`<br>` Young Gen被划分为1个Eden Space和2个Suvivor Space。当对象刚刚被创建的时候，是放在Eden space。垃圾回收的时候，会扫描Eden Space和一个Suvivor Space。如果在垃圾回收的时候发现Eden Space中的对象任然有效，则会将其复制到另外一个Suvivor Space。        |                   |
| -                                             | -                                                              | pool="G1 Survivor Space"`<br>` Young Gen被划分为1个Eden Space和2个Suvivor Space。当对象刚刚被创建的时候，是放在Eden space。垃圾回收的时候，会扫描Eden Space和一个Suvivor Space。如果在垃圾回收的时候发现Eden Space中的对象任然有效，则会将其复制到另外一个Suvivor Space。 |                   |
| increase(jvm_gc_collection_seconds_sum[1m])   | jvm gc耗时                                                     | gc标签 ：`<br >` gc="G1 Young Generation" `<br>`gc="G1 Old Generation"                                                                                                                                                                                                  |                   |
| increase(jvm_gc_collection_seconds_count[1m]) | jvm gc 次数                                                    | gc标签 ：`<br >` gc="G1 Young Generation" `<br>`gc="G1 Old Generation"                                                                                                                                                                                                  |                   |
| increase(jvm_gc_collection_seconds_count[1m]) | -                                                              | -                                                                                                                                                                                                                                                                           | 为何没有summary？ |
| jvm_threads_current                           | 当前线程数                                                     | -                                                                                                                                                                                                                                                                           | -                 |
| jvm_threads_daemon                            | 守护线程数                                                     | -                                                                                                                                                                                                                                                                           | -                 |
| jvm_threads_deadlocked                        | 死锁线程数                                                     | -                                                                                                                                                                                                                                                                           | -                 |
| jvm_threads_deadlocked_monitor                | ？                                                             | -                                                                                                                                                                                                                                                                           | -                 |
| jvm_threads_peak                              | 活动线程峰值                                                   | -                                                                                                                                                                                                                                                                           | -                 |
| jvm_threads_started_total                     | 自JVM启动后，启动的线程总量（包括daemon,non-daemon和终止了的） | -                                                                                                                                                                                                                                                                           | -                 |
| jvm_threads_state                             | 当前线程状态个数                                               | state标签 `<br>` TERMINATED `<br>`  RUNNABLE `<br >`  NEW  `<br>` TIMED_WAITING  `<br>`  BLOCKED   `<br>` WAITING                                                                                                                                               | -                 |
| jvm_classes_loaded                            | jvm 当前加载的类个数                                           | -                                                                                                                                                                                                                                                                           |                   |
| jvm_classes_loaded_total                      | jvm加载的类总个数 counter                                      | -                                                                                                                                                                                                                                                                           |                   |
| jvm_classes_unloaded_total                    | jvm卸载的类总个数 counter                                      | -                                                                                                                                                                                                                                                                           |                   |
| jvm_buffer_pool_capacity_bytes                | JVM 缓冲池的字节容量                                           | pool="direct" 堆外内存 `<br>` pool="mapped"  <br  pool="mapped - 'non-volatile memory'"}                                                                                                                                                                                  |                   |
| jvm_buffer_pool_used_buffers                  | JVM 缓冲池使用缓存大小                                         | pool="direct" 堆外内存 `<br>` pool="mapped"  <br  pool="mapped - 'non-volatile memory'"}                                                                                                                                                                                  |                   |
| jvm_buffer_pool_used_bytes                    | JVM 缓冲池的字节大小                                           | pool="direct" 堆外内存 `<br>` pool="mapped"  <br  pool="mapped - 'non-volatile memory'"}                                                                                                                                                                                  |                   |

# 本节重点介绍 :

- grafana 上导入jmx_exporter dashboard
- 核心指标讲解

