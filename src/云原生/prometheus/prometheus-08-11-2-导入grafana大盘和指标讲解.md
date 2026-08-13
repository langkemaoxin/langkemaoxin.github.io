---
title: "11.2 导入grafana大盘和指标讲解"
sidebarGroup: "Prometheus"
shortTitle: "08 11.2 导入grafana大盘和指标讲解"
order: 8
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - grafana 上导入jmx_exporter dashboard - 核心指标讲解 将采集配置到prometheus中 - 通过labels打静态的标签，java_app指明这..."
---

> **Prometheus · 第 8 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

