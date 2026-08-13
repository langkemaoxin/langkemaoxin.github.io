---
title: "29.2 golang实战项目log2metrics架构说明"
sidebarGroup: "Prometheus"
shortTitle: "74 29.2 golang实战项目log2met..."
order: 74
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 需求分析 - 流程说明 - log2metrics架构设计 架构图 需求分析 算qps - 比如统计 nginx日志中code=200的qps - 对应就是 每隔10秒grep一..."
---

> **Prometheus · 第 74 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 需求分析
- 流程说明
- log2metrics架构设计

# 架构图

![log2metrics.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721301000/93083cd1c9924518868bc94f9baba35e.png)

# 需求分析

## 算qps

- 比如统计 nginx日志中code=200的qps
- 对应就是 每隔10秒grep一下日志文件 ，用增量/时间差 算出qps

## 日志关键字告警

### 错误类型的关键字举例

- 如应用连接mysql报错`dial mysql host error `
- 如redis同步失败报错`cannot sync data `
- 如进程被oom kill了`Out of Memory (OOM) killer`

# 流程说明

## 配置采集任务

- 采集任务的名称
- 指定暴露的metrics名称 如 ngx_access_cnt
- 指定日志路径
- 提供日志匹配正则 ，如过滤包含 containerd的日志

```shell
 ".*containerd.*"
```

- 提供标签正则，如过滤level

```shell
      level: ".*level=(.*?) .*"
```

## 计算方法说明

- cnt 对符合规则的日志进行计数 ，就是日志的总数counter
- max 对符合规则的日志抓取出的数字算最大值 ，如code=404 和code=500 max结果就是 500
- min 对符合规则的日志抓取出的数字算最小值
- sum 对符合规则的日志抓取出的数字算和
- avg 对符合规则的日志抓取出的数字算平均值

## 启动日志采集任务

- 启动tailer读取相关日志
- 将结果通过队列发送给分析组件

## 启动分析组件

- 接收tailer发过来的日志
- 使用正则进行分析
- 转换为统计的数据结构
- 发送给数据处理组件

## 启动数据处理组件

- 定时分析数据，转化为prometheus metrics

# 架构图

![log2metrics.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721301000/93083cd1c9924518868bc94f9baba35e.png)

# 本节重点总结 :

- 需求分析
- 流程说明
- log2metrics架构设计

