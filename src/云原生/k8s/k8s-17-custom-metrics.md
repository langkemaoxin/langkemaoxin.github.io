---
title: custom-metrics-server 规则配置与 Grafana 展示
sidebarGroup: Kubernetes
shortTitle: 17 自定义指标
order: 17
date: 2026-09-01T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - Prometheus
  - HPA
  - Grafana
  - 云原生
  - Kubernetes系列
description: custom-metrics 规则、QPS 指标、Grafana 展示与 adapter Discovery。
---

> **Kubernetes 系列 · 第 17/35 篇**  
> 上一篇：[《基于 QPS 的动态扩缩容——Prometheus Operator 与 Adapter》](/云原生/k8s/k8s-16-prometheus-hpa) · 下一篇：[《集群日志收集——ELK 与 EFK》](/云原生/k8s/k8s-18-logging-elk-efk)

---

## 开头：Adapter 装好了，HPA 却说找不到指标

Prometheus Operator 和 prometheus-adapter 部署完成后，执行：

```bash
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/ | jq . | grep http_requests
```

往往只有 `prometheus_http_requests`，**没有业务应用的 QPS 指标**。根因通常是：

1. 未创建 **ServiceMonitor**，Prometheus 未发现 Spring Boot Service  
2. Service 缺少与 ServiceMonitor 匹配的 **labels**  
3. scrape **path** 默认为 `/metrics`，Spring Boot 实际是 `/actuator/prometheus`  
4. adapter **ConfigMap rules** 未把 `http_server_requests_seconds_count` 转为 QPS

本文逐步打通：**ServiceMonitor → 指标发现 → adapter 规则 → HPA → Grafana**。

---

## 一、ServiceMonitor：让 Prometheus 发现应用

### 1.1 部署 Spring Boot 应用

```bash
kubectl apply -f demo-provider.yml
kubectl get pod -l app=demo-provider
```

### 1.2 创建 ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: demo-provider-sm
  namespace: monitoring
  labels:
    app: demo-provider
    release: prometheus   # 需匹配 Prometheus CR 的 serviceMonitorSelector
spec:
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app: demo-provider
  endpoints:
    - port: http-demo-provider
      path: /demo-provider/actuator/prometheus
      interval: 15s
```

![Custom Metrics 架构总览](/云原生/k8s/p517-01.png)

### 1.3 Service 必须带匹配 label

常见坑：Service 没有 `app: demo-provider`，导致 ServiceMonitor `selector` 匹配不到。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-provider
  labels:
    app: demo-provider          # 与 ServiceMonitor matchLabels 一致
spec:
  selector:
    app: demo-provider
  ports:
    - name: http-demo-provider  # 与 endpoints.port 一致
      port: 8080
      targetPort: 8080
```

修正后重启 Service / Pod，在 Prometheus **Status → Service Discovery** 中应出现 `demo-provider-sm`。

![Service Discovery 出现目标](/云原生/k8s/p518-01.png)

### 1.4 path 定制化（重要）

Prometheus Operator 默认 scrape 路径为 `/metrics`。Spring Boot Micrometer 端点为：

```text
/<context-path>/actuator/prometheus
```

未配置 `path` 时 Target 状态为 **DOWN**，排查可浪费数小时。

![Target DOWN：路径错误](/云原生/k8s/p520-01.png)

配置正确 path 后 Target 变 **UP**：

![Target UP](/云原生/k8s/p521-01.png)

在 Prometheus Graph 查询：

```promql
http_server_requests_seconds_count
```

![Prometheus 查询 QPS 原始 counter](/云原生/k8s/p521-02.png)

---

## 二、验证 Custom Metrics API 中的 http 指标

```bash
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/ | jq . | grep -E 'http_|requests'
kubectl get --raw \
  "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/http_server_requests_seconds_count" | jq .
```

返回值中 `value: "133m"` 表示 **133 millirequests/s**（即 0.133 QPS）；`1000m = 1 req/s`。

![Custom API 返回 pod 指标](/云原生/k8s/p522-02.png)

---

## 三、配置 adapter rules：QPS 指标

编辑 prometheus-adapter 的 ConfigMap（通常在 `monitoring` namespace）：

```yaml
rules:
  - seriesQuery: 'http_server_requests_seconds_count{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace: {resource: namespace}
        pod: {resource: pod}
    name:
      matches: "^(.*)_seconds_count$"
      as: "${1}_per_second"
    metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[1m])) by (<<.GroupBy>>)'
```

- 通过 `name.as` 将规则重命名为 **`http_server_requests_per_second`**  
- `metricsQuery` 用 `rate(...[1m])` 把 counter 转为每秒速率

应用并重启 adapter：

```bash
kubectl apply -f custom-metrics-config-map.yaml
kubectl rollout restart deployment/prometheus-adapter -n monitoring
```

验证新指标名：

```bash
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/ | jq . | grep per_second
```

![per_second 指标已注册](/云原生/k8s/p525-01.png)

### `<<.LabelMatchers>>` 由谁填充？

HPA Controller 周期性（默认 15s，`--horizontal-pod-autoscaler-sync-period`）查询指标时，根据 HPA 关联的 Deployment **selector.matchLabels** 填入 label 匹配条件。`<<.GroupBy>>` 通常按 pod 分组。

---

## 四、HPA 基于 QPS 扩缩容

### 4.1 基于 Pod 自定义指标（type: Pods）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: demo-provider-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: demo-provider
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_server_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"    # 每 Pod 平均 100 millirequests/s = 0.1 QPS（示例阈值，按业务调整）
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

```bash
kubectl apply -f hpa-demo-provider.yml
kubectl get hpa demo-provider-hpa
kubectl describe hpa demo-provider-hpa
```

![HPA 详情](/云原生/k8s/p527-01.png)

### 4.2 常见报错

```text
unable to get metric http_server_requests_seconds: the server could not find the metric
```

原因：`metric.name` 与 adapter 暴露名称不一致。应使用 ConfigMap 中 `name.as` 后的 **`http_server_requests_per_second`**，而非原始 Prometheus 指标名。

### 4.3 基于 CPU / 内存（type: Resource）

```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Resource 类型走 `resourceRules`，由 adapter 或 metrics-server 提供。

---

## 五、压测验证 HPA

```bash
# 访问 Swagger 或业务接口
curl http://<node-ip>:<port>/demo-provider/swagger-ui.html

# wrk 压测
wrk -t12 -c400 -d30s http://<node-ip>:<port>/demo-provider/swagger-ui.html
```

观察副本数从 1 增至 5（或 maxReplicas）后稳定；缩容受 `scaleDown.stabilizationWindowSeconds: 300` 影响，**约 5 分钟后**才回收 Pod——避免流量尖刺导致频繁抖动。

![HPA 压测后 Pod 数量](/云原生/k8s/p528-02.png)

---

## 六、Grafana 展示 QPS

port-forward Grafana：

```bash
kubectl --namespace monitoring port-forward svc/grafana 23000:3000
```

PromQL（排除 actuator 自身请求）：

```promql
sum(rate(http_server_requests_seconds_count{job="kubernetes-pods",uri!="/actuator/prometheus"}[5m])) by (application)
```

推荐导入社区模板：[Spring Boot 2.1 Statistics](https://grafana.com/grafana/dashboards/)（Dashboard ID 可搜索 `spring boot prometheus`），复制 ID 或 JSON 导入。

![Grafana Spring Boot 大盘](/云原生/k8s/p529-01.png)

---

## 七、Adapter Discovery 规则四步法（深入）

以 `http_requests_total` 为例理解 adapter 如何将 Prometheus 指标暴露给 API：

| 步骤 | 配置字段 | 作用 |
|------|----------|------|
| Discovery | `seriesQuery` | 在 Prometheus 中发现候选 series |
| Association | `resources.overrides` | label 与 K8s 资源（pod/namespace）关联 |
| Naming | `name.matches` / `name.as` | API 中指标重命名（counter → rate） |
| Querying | `metricsQuery` | 查询具体数值 |

完整规则示例：

```yaml
rules:
  - seriesQuery: 'http_requests_total{kubernetes_namespace!="",kubernetes_pod_name!=""}'
    resources:
      overrides:
        kubernetes_namespace: {resource: namespace}
        kubernetes_pod_name: {resource: pod}
    name:
      matches: "^(.*)_total$"
      as: "${1}_per_second"
    metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[1m])) by (<<.GroupBy>>)'
```

查询单个 namespace 下所有 pod 的 QPS：

```bash
kubectl get --raw \
  "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/http_server_requests_per_second" | jq .
```

---

## 八、生产运维补充

### 8.1 Prometheus 数据持久化

默认 Prometheus Pod 用 `emptyDir`，重建丢数据。在 `Prometheus` CR 增加：

```yaml
spec:
  retention: 15d
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: prometheus-data-db
        resources:
          requests:
            storage: 10Gi
```

### 8.2 Operator 方案的不足（需运维跟进）

| 问题 | 方向 |
|------|------|
| 数据未持久化 | PVC + StorageClass |
| 告警通道 | Alertmanager 对接钉钉/企微 |
| 新增 scrape target | ServiceMonitor / PodMonitor，无需改 prometheus.yml |

开发侧重点：**埋点 → ServiceMonitor → adapter rules → HPA 阈值**；持久化与告警由平台组落地。

---

## 命令清单（速查）

```bash
# ServiceMonitor
kubectl apply -f sm-demo-provider.yml
kubectl get servicemonitor -A
kubectl describe servicemonitor demo-provider-sm -n monitoring

# Adapter
kubectl apply -f custom-metrics-config-map.yaml
kubectl rollout restart deployment/prometheus-adapter -n monitoring
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/ | jq . | grep http_

# HPA
kubectl apply -f hpa-demo-provider.yml
kubectl get hpa
kubectl describe hpa demo-provider-hpa

# 压测
wrk -t12 -c400 -d30s http://<host>/demo-provider/
```

---

## 小结

| 环节 | 关键点 |
|------|--------|
| 服务发现 | ServiceMonitor + Service labels + port name |
| scrape path | `/actuator/prometheus`，非默认 `/metrics` |
| QPS 规则 | `rate()` + `name.as: *_per_second` |
| HPA | `type: Pods`，`metric.name` 与 adapter 暴露名一致 |
| 可视化 | Grafana + `http_server_requests_seconds_count` PromQL |

> ➡️ 下一篇：[《事件驱动伸缩与集群监控——KEDA 与监控 UI》](/云原生/k8s/k8s-31-keda-monitoring)
