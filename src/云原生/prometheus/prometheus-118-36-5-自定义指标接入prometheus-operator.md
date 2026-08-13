---
title: "36.5 自定义指标接入prometheus-operator"
sidebarGroup: "Prometheus"
shortTitle: "118 36.5 自定义指标接入prometheus..."
order: 118
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "prometheus-operator优势总结 - 自定义的采集配置接入更方便，只要定义serviceMonitor即可 - 采集的参数修改也很方便，对比之前只能由prometheus管理员修改job..."
---

> **Prometheus · 第 118 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# prometheus-operator优势总结

- 自定义的采集配置接入更方便，只要定义serviceMonitor即可
- 采集的参数修改也很方便，对比之前只能由prometheus管理员修改job段配置
- 告警配置也是

# prometheus-operator劣势总结

- 数据的长期存储没有解决
- 高可用性和扩展性没解决

# 什么是 Kubernetes Operator？

- Operator 是特定于 Kubernetes 的应用程序 (pod)，可自动配置、管理和优化其他 Kubernetes 部署。它们作为自定义控制器实现。
- Kubernetes 操作员封装了部署和扩展应用程序的专有技术，并直接执行与 API 通信的算法决策。

## Kubernetes Operator 能做什么：

> 基本上，任何可以由人工管理员表示为代码的内容都可以在 Kubernetes Operator 内实现自动化。

- 根据 Kubernetes 集群的规格，为您的部署安装并提供合理的初始配置和大小调整。
- 执行部署和 Pod 的实时重新加载，以适应任何用户请求的参数修改（热配置重新加载）。
- 根据性能指标自动扩大或缩小。
- 执行备份、完整性检查或任何其他维护任务。

# Prometheus Operator

- Prometheus Operator提供k8s service 和 deployment 监控的定义，并且管理普罗米修斯实例的部署

## Prometheus Operator具体能做什么

- 执行完整 Kubernetes-Prometheus 堆栈的初始安装和配置

  - Prometheus servers
  - Alertmanager
  - Grafana
  - Host node_exporter
  - kube-state-metrics
- 使用ServiceMonitor实体定义监控指标endpoint，并自动配置到prometheus中
- 使用 Operator CRD 和 ConfigMap 自定义和扩展服务，使我们的配置完全可移植且具有声明性

## Operator 定义了下面的CRD

- Prometheus，它定义了所需的 Prometheus 部署。Operator 始终确保与资源定义匹配的部署正在运行。
- ServiceMonitor，它以声明方式指定应如何监视服务组。Operator 根据定义自动生成 Prometheus 抓取配置。
- PrometheusRule，它定义了所需的 Prometheus 规则文件，该文件可由包含 Prometheus 警报和记录规则的 Prometheus 实例加载。
- Alertmanager，它定义了所需的 Alertmanager 部署。Operator 始终确保与资源定义匹配的部署正在运行。
- Operator 存储库中的kube-prometheus目录包含默认服务和配置，因此您不仅可以获得 Prometheus Operator 本身，还可以获得完整的设置，您可以从一开始就开始使用和自定义。

## kube-prometheus和prometheus-operator的关系

- Operator 项目中的kube-prometheus目录包含默认服务和配置
- 从中不仅可以获得 Prometheus Operator 本身，还可以获得完整的设置，您可以从一开始就开始使用和自定义。

## 架构图

![image](https://sysdig.com/wp-content/uploads/2018/09/prometheus_operator_diagram.png)

# ServiceMonitor作用

![image](https://sysdig.com/wp-content/uploads/2018/09/prometheus_operator_servicemonitor.png)

- ServiceMonitor 描述了 Prometheus 监视的目标集
- 如果存在与 ServiceMonitor 条件匹配的新指标端点，则此目标将自动添加到选择该 ServiceMonitor 的所有 Prometheus 服务器。
- ServiceMonitor 的目标是 Kubernetes 服务，而不是 pod 直接公开的端点
- 按命名空间、标签等过滤端点
- 定义不同的抓取端口
- 定义所有额外的抓取参数，如抓取间隔、使用的协议、TLS 凭证、重新标记策略等。

# 使用serviceMonitor采集我们自定义的指标

## 部署之前的ink8s-pod-metrics 在第19章中

## 编写 myPod_serviceMonitor

- endpoints代表最后采集的targets
  - interval采集间隔
  - port 采集端口
  - scheme采集协议
- jobLabel: app.kubernetes.io/name 的意思是最后job标签使用这个标签的value
- namespaceSelector代表过滤哪个ns下的svc
- selector代表svc的标签选择器

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/name: ink8s-pod-metrics
  name: ink8s-pod-metrics
  namespace: monitoring
spec:
  endpoints:
    - interval: 15s
      port: https-self
      scheme: http
  jobLabel: app.kubernetes.io/name
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app.kubernetes.io/name: ink8s-pod-metrics

```

## 编写 myPod_svc

- 在default ns下的svc
- 打上标签app.kubernetes.io/name: ink8s-pod-metrics 和上面的serviceMonitor对应
- 端口和容器端口对应上，端口名字和上面的serviceMonitor对应

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/name: ink8s-pod-metrics

  name: ink8s-pod-metrics
  namespace: default
spec:
  clusterIP: None
  ports:
    - name: https-self
      port: 8080
      targetPort: 8080
  selector:
    app: ink8s-pod-metrics

```

## 部署

```yaml
 kubectl apply -f .
```

## 检查target页面和discovery页面结果

- target页面的截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/be0c7a07186a40b7a047d5dddf12ab38.png)
- discovery的结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/c2a4994617e74dce979f9c2ec318cf0e.png)
- graph查询的结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/8b0a17105afa460b9b21384fcece920b.png)

# 使用PrometheusRule添加自定义指标的告警规则

## yaml

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app.kubernetes.io/name: ink8s-pod-metrics
    prometheus: k8s
    role: alert-rules
  name: ink8s-pod-metrics-k8s-prometheus-rules
  namespace: monitoring
spec:
  groups:
    - name: ink8s-pod-metrics-k8s-prometheus-rules01
      rules:
        - alert: pod_control_plane_pod_detail01
          annotations:
            description: Prometheus {{$labels.namespace}}/{{$labels.pod}} has failed to reload its configuration.
            runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/prometheusbadconfig
            summary: test
          expr: |
            ink8s_pod_metrics_get_pod_control_plane_pod_detail > 0
          for: 1m
          labels:
            severity: critical
```

- 元信息中的标签要和prometheus-k8s ruleSelector对应上
  - prometheus: k8s
  - role: alert-rules

```yaml
  ruleSelector:
    matchLabels:
      prometheus: k8s
      role: alert-rules
```

## 应用

## rule规则页面查看效果

- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/999c380f51304877829ef96d26539a0d.png)
- firing的结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/c76fb4ffa9884f1ca054c13a1cf8e9b0.png)

# prometheus-operator优势总结

- 自定义的采集配置接入更方便，只要定义serviceMonitor即可
- 采集的参数修改也很方便，对比之前只能由prometheus管理员修改job段配置
- 告警配置也是

# prometheus-operator劣势总结

- 数据的长期存储没有解决
- 高可用性和扩展性没解决

