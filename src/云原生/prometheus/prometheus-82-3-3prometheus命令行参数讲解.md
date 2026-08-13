---
title: 3.3prometheus命令行参数讲解
sidebarGroup: Prometheus
shortTitle: 82 3.3prometheus命令行参数讲解
order: 82
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - target页面 - flags页面 - status页面 - tsdb-status页面 访问地址 $ip:9090 target页面 flags页面 - 展示命令行参数的，没...'
---

> **Prometheus · 第 82 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- target页面
- flags页面
- status页面
- tsdb-status页面

# 访问地址 $ip:9090

# target页面

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/78439ddafcc14d6f98179730adad56f9.png)

# flags页面

- 展示命令行参数的，没设置的取默认值
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/c7c380fd8f9546b7bfdb5545060559ad.png)

# status页面

- 描述运行信息和编译的信息

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/0a3c20d6f03a4782a0ee30debc98524a.png)

# tsdb-status页面

- 打印存储的运行状态信息
- 帮我们定位重查询的

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/f9cda8fef0204e80806f96e0b69b2a4f.png)

# 服务发现页面

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1628914199000/61c9c139916d40acbd146900b045d937.png)

# 本节重点总结 :

- target页面 展示采集任务的
- flags页面 命令行参数
- status页面  编译信息和运行信息
- tsdb-status页面 存储信息

