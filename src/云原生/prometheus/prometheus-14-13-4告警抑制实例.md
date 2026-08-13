---
title: "13.4告警抑制实例"
sidebarGroup: "Prometheus"
shortTitle: "14 13.4告警抑制实例"
order: 14
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 告警抑制 - 应用场景 - 配置方法：一定要有equal标签 - 配置演示：critical告警触发了就抑制warning的 告警抑制 应用场景 - 如果某些其他警报已经触发，则..."
---

> **Prometheus · 第 14 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 告警抑制
  - 应用场景
  - 配置方法：一定要有equal标签
- 配置演示：critical告警触发了就抑制warning的

# 告警抑制

## 应用场景

- 如果某些其他警报已经触发，则抑制某些警报的通知。
- 多用于某些高等级的告警已触发，然后低等级的被抑制
  - 如机器宕机告警触发，则机器上的进程存活监控都被抑制
  - 如region基础网络告警触发，region内部的服务端口探活都被抑制

## 配置

- 告警中同一个机器`node_name`出发的 critical告警要抑制warning的

```yaml
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['node_name']
```

- 添加到alertmanager配置文件中并 reload

## 重启prometheus和alertmanager

- 重启服务

```shell
systemctl restart prometheus
systemctl restart alertmanager
```

## 期望现象

- 相同node_name的多条告警，当severity='critical'触发时抑制 severity='warning'的
- 即  severity='warning'不会触发，对应的就是mysql的不会触发，node的会触发
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511682000/5127a3393e684b638053aef52b96db66.png)

## 真实现象

- 真实图片举例
- 5002 没收收到告警，即mysql的不会触发，即  severity='warning'没有触发
- 5001 和 5003 能收到node的告警 ，即  severity='critical'触发了，并且抑制了severity='warning'的
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629511682000/5e40b68aa8614c13a200a469ac4c3d6c.png)

# 本节重点总结 :

- 告警抑制
  - 应用场景
  - 配置方法：一定要有equal标签
- 配置演示：critical告警触发了就抑制warning的

