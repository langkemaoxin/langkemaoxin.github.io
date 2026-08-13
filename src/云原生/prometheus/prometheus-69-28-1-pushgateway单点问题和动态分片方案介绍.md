---
title: "28.1 pushgateway单点问题和动态分片方案介绍"
sidebarGroup: "Prometheus"
shortTitle: "69 28.1 pushgateway单点问题和动..."
order: 69
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - pushgateway单点问题现象和原因 - 静态分片的弊端 - 动态分片方案介绍 pgw单点问题 pgw是什么 - [项目介绍](https://github.com/prom..."
---

> **Prometheus · 第 69 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- pushgateway单点问题现象和原因
- 静态分片的弊端
- 动态分片方案介绍

# pgw单点问题

## pgw是什么

- [项目介绍](https://github.com/prometheus/pushgateway)

## pgw打点特点

- 没有使用grouping对应的接口uri为

```
http://pushgateway_addr/metrics/job/<JOB_NAME>
```

- 使用grouping对应的接口uri为

```
http://pushgateway_addr/metrics/job/<JOB_NAME>/<LABEL_NAME>/<LABEL_VALUE>
```

- put/post方法区别在于 put只替换metrics和job相同的 post替换label全部相同的

## pgw单点问题

## 如果简单把pgw挂在lb后面的问题

- lb后面rr轮询:如果不加控制的让push数据随机打到多个pushgateway实例上,prometheus无差别scrape会导致数据错乱,表现如下
- ![pgw_err.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112309000/91ed0e10cdab438bbec9b966f4ee4479.png)
- 根本原因是在t1时刻 指标的值为10 t2时刻 值为20
- t1时刻轮询打点到了pgw-a上 t2时刻打点到了pgw-b上
- 而promethues采集的时候两边全都采集导致本应该一直上升的值呈锯齿状

## 如果对uri做静态一致性哈希+prome静态配置pgw

- 假设有3个pgw,前面lb根据request_uri做一致性哈希
- promethues scrape时静态配置3个pgw实例

```
  - job_name: pushgateway
    honor_labels: true
    honor_timestamps: true
    scrape_interval: 5s
    scrape_timeout: 4s
    metrics_path: /metrics
    scheme: http
    static_configs:
    - targets:
      - pgw-a:9091
      - pgw-b:9091

```

- 结果是可以做到哈希分流,但无法解决某个pgw实例挂掉,哈希到这个实例上面的请求失败问题

## 解决方案是: 动态一致性哈希分流+consul service_check

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112309000/096bd32ad0f54125a28e2f1e1b9298ab.png)

- dynamic-sharding服务启动会根据配置文件注册pgw服务到consul中
- 由consul定时对pgw server做http check
- push请求会根据请求path做一致性哈希分离,eg:

```
# 仅job不同
- http://pushgateway_addr/metrics/job/job_a
- http://pushgateway_addr/metrics/job/job_b
- http://pushgateway_addr/metrics/job/job_c
# label不同
- http://pushgateway_addr/metrics/job/job_a/tag_a/value_a
- http://pushgateway_addr/metrics/job/job_a/tag_a/value_b
```

- 当多个pgw中实例oom或异常重启,consul check service会将bad实例标记为down
- dynamic-sharding轮询检查实例数量变化
- 重新生成哈希环,rehash将job分流
- 同时promethues使用consul服务发现的pgw实例列表,无需手动变更
- dynamic-sharding本身无状态,可启动多个实例作为流量接入层和pgw server之间
- 采用redirect而不处理请求,简单高效
- 扩容时同时也需要重启所有存量pgw服务

# 本节重点总结 :

- pushgateway单点问题现象和原因
- 静态分片的弊端
- 动态分片方案介绍

