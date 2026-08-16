---
title: Prometheus 第44章：综合实战
sidebarGroup: 可观测性
shortTitle: 56 综合实战
order: 56
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第44章（综合实战）合并笔记
---

> **Prometheus · 第 44 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 44.1 告警自愈之回调重启服务实战

# 本节重点介绍 :

- 告警回调能用来做什么
- 报警回调执行命令过程
- 回调重启服务实战

# 告警回调能用来做什么

- 重启服务
- 抓火焰图
- 硬件告警回调换配件工单

# 回调架构图

![arch.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630756015000/bd6f7fb17624449b9287073d066c8056.png)

# 报警回调执行命令过程

- prometheus配置rule规则生成报警发往alm
- alm根据配置好的receive发往回调处理程序
- 处理程序解析报警中的app ip等信息触发动作
- 控制节点发送命令给目标机器

## 回调重启服务的playbook

```yaml
- name: restart for {{ app }}
  hosts: all
  user: root
  gather_facts:  false
  become_user: root

  tasks:

      #重启服务
      - name: restart for {{ app }}
        systemd:  name={{ app }} state=restarted
        register: result
      - name: Show debug info
        debug: var=result verbosity=0

```

# 实验 效果

- 通过告警触发，打给callback处理程序
- callback处理程序解析字段 和标签，选择不同的playbook
- 根据instance标签调ansible-api 执行动作

## 准备alertmanger.yml

```yaml
global:
  resolve_timeout: 30m

route:
  group_by: ['alertname']
  group_wait: 5s
  group_interval: 5s
  repeat_interval: 5m
  receiver: 'callback'
  routes:                                       #子路由，父路由的所有属性都会被子路由继承

receivers:
- name: 'callback'
  webhook_configs:
  - url: 'http://127.0.0.1:5004/alert/callback'

```

## 准备rule_callback.yml

```yaml
groups:
 - name: g12
   rules:
   - alert: mem_callback
     expr: node_memory_MemTotal_bytes > 0
     for: 10s
     labels:
       app: prometheus
       severity: warning
     annotations:
       summary: "服务器: {{$labels.alertname}} 内存报警"
       description: "回调测试"
       value: "{{ $value }}"

```

## 启动告警回调处理程序 alert_callback.py

## 传入restart_service.yaml 变量执行restart服务

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630756015000/265acb203e6d484abee9d8f42f9c3554.png)

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630756015000/834380af6b124654b91b749b02b22650.png)

# 本节重点总结 :

- 告警回调能用来做什么
- 报警回调执行命令过程
- 回调重启服务实战

