---
title: 基于 QPS 的动态扩缩容——Prometheus Operator 与 Adapter
sidebarGroup: Kubernetes
shortTitle: 16 QPS 动态扩缩
order: 16
date: 2026-09-01T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - Prometheus
  - HPA
  - 云原生
  - Kubernetes系列
description: SpringBoot 指标到 Prometheus Operator，再到 adapter 驱动 HPA。
---

> **Kubernetes 系列 · 第 16/35 篇**  
> 上一篇：[《发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试》](/云原生/k8s/k8s-15-release-strategies) · 下一篇：[《custom-metrics-server 规则配置与 Grafana 展示》](/云原生/k8s/k8s-17-custom-metrics)

---

## 开头：CPU 还没满，接口已经超时了

默认 HPA 只看 CPU / 内存（见 [第 08 篇 HPA 与扩展点](/云原生/k8s/k8s-08-hpa-cri-crd/)）。Web 类 Spring Boot 服务常出现：**CPU 利用率不高，但 QPS 飙升导致 RT 变差**——按 CPU 扩缩容往往滞后。

更合理的做法是：**应用暴露 HTTP 请求指标 → Prometheus 采集 → Adapter 转成 Custom Metrics API → HPA 按 QPS 扩缩容**。

本文走完这条链路的前半段：Spring Boot 埋点、Prometheus Operator 部署、Adapter 注册 Custom Metrics API。

---

## 一、整体架构

```text
Spring Boot (/actuator/prometheus)
        ↓ scrape
Prometheus (Prometheus Operator 管理)
        ↓ query
prometheus-adapter (Custom Metrics API Server)
        ↓
kube-controller-manager / HPA Controller
        ↓
Deployment 副本数调整
```

![Prometheus Operator 架构](/云原生/k8s/p482-01.png)

---

## 二、Spring Boot 暴露 Prometheus 指标

### 2.1 Maven 依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

- `actuator`：暴露 HTTP 端点  
- `micrometer-registry-prometheus`：输出 OpenMetrics 格式，供 Prometheus pull

### 2.2 配置

```yaml
management:
  endpoints:
    web:
      exposure:
        include: '*'
  metrics:
    tags:
      application: ${spring.application.name}
```

验证：

```bash
curl http://<pod-ip>:8080/demo-provider/actuator/prometheus
# 关注 http_server_requests_seconds_count
```

![Prometheus 端点输出](/云原生/k8s/p478-01.png)

### 2.3 可选：显式注册 PrometheusMeterRegistry

```java
@Configuration
public class CustomPrometheusConfig {
    @Bean
    @ConditionalOnMissingBean
    public PrometheusMeterRegistry prometheusMeterRegistry(
            PrometheusConfig config, CollectorRegistry registry, Clock clock) {
        return new PrometheusMeterRegistry(config, registry, clock);
    }
    @Bean
    @ConditionalOnMissingBean
    public CollectorRegistry collectorRegistry() {
        return new CollectorRegistry(true);
    }
}
```

压测 Swagger 或接口后，`http_server_requests_seconds_count` 会递增——后续 HPA 将基于该指标计算 QPS。

---

## 三、安装 Prometheus Operator（kube-prometheus）

推荐使用 [kube-prometheus](https://github.com/prometheus-operator/kube-prometheus) 一键部署 Prometheus、Alertmanager、Grafana、node-exporter 等。

### 3.1 环境要求

- Kubernetes ≥ v1.16（示例 v1.23.1 + Minikube）  
- 建议 4 CPU / 5Gi 内存以上

```bash
minikube start --kubernetes-version=v1.23.1 --driver=docker --cpus=4 --memory=5120
```

### 3.2 部署步骤

```bash
mkdir -p /usr/local/kube-prometheus && cd /usr/local/kube-prometheus
# 下载 v0.11.0
wget https://github.com/prometheus-operator/kube-prometheus/archive/refs/tags/v0.11.0.tar.gz
tar -zxvf v0.11.0.tar.gz
cd kube-prometheus-0.11.0

# 先 CRD + namespace，再其余 manifest（避免竞态）
kubectl apply --server-side -f manifests/setup
kubectl wait --for condition=Established crd/servicemonitors.monitoring.coreos.com --timeout=120s
kubectl apply -f manifests/
```

![setup 应用输出](/云原生/k8s/p484-01.png)

验证：

```bash
kubectl get crd | grep coreos
kubectl get prometheuses,servicemonitors,pods -n monitoring
kubectl get apiservices | grep metrics
# 此时通常只有 v1beta1.metrics.k8s.io（CPU/内存）
```

![已安装的 CRD 与 Pod](/云原生/k8s/p486-01.png)

### 3.3 核心 CRD 说明

| CRD | 作用 |
|-----|------|
| `Prometheus` | 声明 Prometheus Server 部署 |
| `ServiceMonitor` | 声明如何 scrape 一组 Service |
| `PodMonitor` | 声明如何 scrape 一组 Pod |
| `PrometheusRule` | 告警 /  recording 规则 |
| `Alertmanager` | 告警路由与通知 |

Operator 作为控制器，持续 reconcile 上述 CR 的期望状态；Prometheus 通过 ServiceMonitor 自动发现 scrape target，无需手写 `prometheus.yml` 里每个 job。

---

## 四、访问 Prometheus / Grafana / Alertmanager

集群内 Service 默认为 ClusterIP，本地调试可用 port-forward：

```bash
kubectl --namespace monitoring port-forward svc/prometheus-k8s 29090:9090
kubectl --namespace monitoring port-forward svc/grafana 23000:3000
kubectl --namespace monitoring port-forward svc/alertmanager-main 29093:9093
```

浏览器打开 `http://localhost:29090` → **Status → Targets** 查看服务发现；**Graph** 查询 `container_cpu_usage_seconds_total` 等。

![Prometheus Service Discovery](/云原生/k8s/p488-02.png)

![Prometheus Graph 查询](/云原生/k8s/p489-01.png)

Grafana 默认账号 `admin` / `admin`，已预置 K8s 大盘。

![Grafana 登录](/云原生/k8s/p491-01.png)

实验结束后清理：

```bash
kubectl delete --ignore-not-found=true -f manifests/ -f manifests/setup
```

---

## 五、Metrics API 两类指标

Kubernetes apiserver 通过 **聚合层（kube-aggregator）** 扩展监控 API：

| API | 提供者 | 典型用途 |
|-----|--------|----------|
| `metrics.k8s.io` | metrics-server / adapter | CPU、内存（Core Metrics） |
| `custom.metrics.k8s.io` | prometheus-adapter | QPS、队列深度等 Custom Metrics |

Core Metrics 来自 Kubelet/cAdvisor，由 metrics-server 聚合；Custom Metrics 需 Prometheus 采集业务指标，再由 **prometheus-adapter** 转换格式并注册 APIService。

![Metrics Server 与 Adapter 架构](/云原生/k8s/p489-02.png)

---

## 六、部署 k8s-prometheus-adapter

Prometheus 的 metrics **不能直接被 HPA 使用**，必须经过 adapter 转为 Kubernetes 可识别的 Custom Metrics API。

### 6.1 克隆与证书

```bash
git clone https://github.com/kubernetes-sigs/prometheus-adapter.git
cd prometheus-adapter
git checkout v0.9.1

export PURPOSE=serving
openssl req -x509 -sha256 -new -nodes -days 365 -newkey rsa:2048 \
  -keyout serving.key -out serving.crt -subj "/CN=ca"
kubectl -n monitoring create secret generic cm-adapter-serving-certs \
  --from-file=./serving.crt --from-file=./serving.key
```

### 6.2 修改 namespace 并部署

官方 manifest 默认 namespace 为 `custom-metrics`，需改为 `monitoring`：

```bash
cd deploy
for f in manifests/*.yaml; do
  sed -i 's/namespace: custom-metrics/namespace: monitoring/g' "$f"
  sed -i 's/apiregistration.k8s.io\/v1beta1/apiregistration.k8s.io\/v1/g' "$f"
done
kubectl apply -f manifests/
```

验证 APIService：

```bash
kubectl get apiservices | grep metrics
# 期望看到：
# v1beta1.metrics.k8s.io
# v1beta1.custom.metrics.k8s.io
```

### 6.3 测试 Custom Metrics API

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/monitoring/pods/*/fs_usage_bytes" | jq .
```

若 `resources` 数组为空或查询无数据，多半是 **adapter ConfigMap 规则** 或 **Prometheus 尚未 scrape 到业务 Pod**——下一篇专门配置 QPS 规则与 ServiceMonitor。

![Custom Metrics API 验证](/云原生/k8s/p496-01.png)

---

## 七、Adapter 配置文件结构（预览）

ConfigMap 中主要三块：

```yaml
rules:           # Custom Metrics（QPS 等）
resourceRules:   # Resource Metrics（CPU/内存，可替代 metrics-server）
externalRules:   # External Metrics（跨集群指标，本文暂不涉及）
```

单条 `rules` 包含四步（Discovery → Association → Naming → Querying）：

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

- **seriesQuery**：在 Prometheus 中发现哪些 series 可用于 HPA  
- **resources**：指标 label 与 K8s 资源（pod/namespace）的映射  
- **name**：暴露给 API 的指标名（如 `http_server_requests_per_second`）  
- **metricsQuery**：查询具体数值（`rate()` 把 counter 转为 QPS）

HPA Controller 周期拉取（默认 15s）时，会把 Deployment 的 `matchLabels` 填入 `<<.LabelMatchers>>`。

---

## 八、PrometheusRule 与告警（简述）

kube-prometheus 已预置大量 `PrometheusRule`。自定义告警只需创建 CR：

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: my-app-rules
  namespace: monitoring
  labels:
    prometheus: k8s
    role: alert-rules
spec:
  groups:
    - name: my-app
      rules:
        - alert: HighErrorRate
          expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.1
          for: 2m
          labels:
            severity: warning
```

Prometheus CR 的 `ruleSelector` 会匹配带 `prometheus: k8s` 标签的规则，并挂载到 Pod 内 `/etc/prometheus/rules/`。

![Prometheus 告警页](/云原生/k8s/p510-01.png)

---

## 九、常见部署问题

### 9.1 镜像拉取失败（ErrImagePull）

到对应 Node 手动 `docker pull`，或替换为国内镜像（如自建 `prometheus-adapter:v0.9.1`）。

### 9.2 APIService 版本不匹配

```text
no matches for kind "APIService" in version "apiregistration.k8s.io/v1beta1"
```

检查集群 `kubectl api-versions`，将 manifest 中 `v1beta1` 改为 `v1`。

### 9.3 Namespace 卡在 Terminating

```bash
kubectl proxy --port=9081 &
kubectl get ns monitoring -o json > ns.json
# 删除 spec.finalizers 后：
curl -k -H "Content-Type: application/json" -X PUT --data-binary @ns.json \
  http://127.0.0.1:9081/api/v1/namespaces/monitoring/finalize
```

### 9.4 数据未持久化

> ➡️ 下一篇：[《custom-metrics-server 规则配置与 Grafana 展示》](/云原生/k8s/k8s-17-custom-metrics)

---

## 小结

| 步骤 | 命令 / 对象 |
|------|-------------|
| 应用埋点 | actuator + micrometer，`/actuator/prometheus` |
| 监控栈 | `kube-prometheus` → Operator + Prometheus + Grafana |
| 自定义 API | `prometheus-adapter` → `custom.metrics.k8s.io` |
| HPA 前置 | adapter ConfigMap `rules` + ServiceMonitor |

> ➡️ 下一篇：[《custom-metrics-server 规则配置与 Grafana 展示》](/云原生/k8s/k8s-17-custom-metrics)
