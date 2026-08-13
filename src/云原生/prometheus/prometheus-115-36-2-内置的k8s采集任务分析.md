---
title: 36.2 内置的k8s采集任务分析
sidebarGroup: Prometheus
shortTitle: 115 36.2 内置的k8s采集任务分析
order: 115
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点总结 : - prometheus 采集分析 prometheus 采集分析 serviceMonitor/monitoring/kube-state-metrics/0 代表采集ksm 资源...'
---

> **Prometheus · 第 115 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点总结 :

- prometheus 采集分析

# prometheus 采集分析

## serviceMonitor/monitoring/kube-state-metrics/0 代表采集ksm 资源指标

- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/040f5a69cb19465ab8bb3b34bc086ad0.png)
- 带上target显示的标签过来 查询 {job="kube-state-metrics",container="kube-rbac-proxy-main"}
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/325a69b7f177442b94586df524230ab9.png)
- 全量yaml如下

```yaml
- job_name: serviceMonitor/monitoring/kube-state-metrics/0
  honor_labels: true
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 30s
  metrics_path: /metrics
  scheme: https
  authorization:
    type: Bearer
    credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    insecure_skip_verify: true
  follow_redirects: true
  relabel_configs:
  - source_labels: [job]
    separator: ;
    regex: (.*)
    target_label: __tmp_prometheus_job_name
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_component]
    separator: ;
    regex: exporter
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: kube-state-metrics
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_part_of]
    separator: ;
    regex: kube-prometheus
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-main
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_address_target_kind, __meta_kubernetes_endpoint_address_target_name]
    separator: ;
    regex: Node;(.*)
    target_label: node
    replacement: ${1}
    action: replace
  - source_labels: [__meta_kubernetes_endpoint_address_target_kind, __meta_kubernetes_endpoint_address_target_name]
    separator: ;
    regex: Pod;(.*)
    target_label: pod
    replacement: ${1}
    action: replace
  - source_labels: [__meta_kubernetes_namespace]
    separator: ;
    regex: (.*)
    target_label: namespace
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_service_name]
    separator: ;
    regex: (.*)
    target_label: service
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_pod_name]
    separator: ;
    regex: (.*)
    target_label: pod
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_pod_container_name]
    separator: ;
    regex: (.*)
    target_label: container
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_service_name]
    separator: ;
    regex: (.*)
    target_label: job
    replacement: ${1}
    action: replace
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: (.+)
    target_label: job
    replacement: ${1}
    action: replace
  - separator: ;
    regex: (.*)
    target_label: endpoint
    replacement: https-main
    action: replace
  - separator: ;
    regex: (pod|service|endpoint|namespace)
    replacement: $1
    action: labeldrop
  - source_labels: [__address__]
    separator: ;
    regex: (.*)
    modulus: 1
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    separator: ;
    regex: "0"
    replacement: $1
    action: keep
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

### 首先采用的k8s的endpoint的sd

- 指定namespace为 monitoring

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

### monitoring下的endpoint查看

```
[root@prome-master01 kube-prometheus]# kubectl get endpoints -n monitoring
NAME                    ENDPOINTS                                                           AGE
alertmanager-main       10.100.71.17:9093,10.100.71.50:9093,10.100.71.60:9093               20m
alertmanager-operated   10.100.71.17:9094,10.100.71.50:9094,10.100.71.60:9094 + 6 more...   20m
blackbox-exporter       10.100.71.48:9115,10.100.71.48:19115                                20m
grafana                 10.100.71.51:3000                                                   20m
kube-state-metrics      10.100.71.52:8443,10.100.71.52:9443                                 20m
node-exporter           192.168.3.200:9100,192.168.3.201:9100                               20m
prometheus-adapter      10.100.71.53:6443,10.100.71.54:6443                                 20m
prometheus-k8s          10.100.71.18:9090,10.100.71.58:9090                                 20m
prometheus-operated     10.100.71.18:9090,10.100.71.58:9090                                 20m
prometheus-operator     10.100.71.42:8443                                                   137m

```

### 下面这4个relabel代表过滤 kube-state-metrics的endpoint

- yaml如下

```yaml
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_component]
    separator: ;
    regex: exporter
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: kube-state-metrics
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_part_of]
    separator: ;
    regex: kube-prometheus
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-main
    replacement: $1
    action: keep
```

- kubectl describe endpoints kube-state-metrics  -n monitoring
- 这里的几个label和上面的relabel刚好匹配中，意思就是过滤  monitoring namespace下的kube-state-metrics的endpoint
- 同时这个job只采集 portname=https-main 也就是8443端口的指标

```shell
kubectl describe endpoints kube-state-metrics  -n monitoring 
Name:         kube-state-metrics
Namespace:    monitoring
Labels:       app.kubernetes.io/component=exporter
              app.kubernetes.io/name=kube-state-metrics
              app.kubernetes.io/part-of=kube-prometheus
              app.kubernetes.io/version=2.0.0
              service.kubernetes.io/headless=
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2021-09-06T04:36:42Z
Subsets:
  Addresses:          10.100.85.238
  NotReadyAddresses:  <none>
  Ports:
    Name        Port  Protocol
    ----        ----  --------
    https-main  8443  TCP
    https-self  9443  TCP

```

#### kube-stats-metrics 8443端口是 ksm主服务的端口

- yaml地址 manifests\kube-state-metrics-deployment.yaml
- ksm服务listen 127.0.0.1 8081端口

```yaml
      containers:
      - args:
        - --host=127.0.0.1
        - --port=8081
        - --telemetry-host=127.0.0.1
        - --telemetry-port=8082
        image: k8s.gcr.io/kube-state-metrics/kube-state-metrics:v2.0.0
        name: kube-state-metrics
        resources:
          limits:
            cpu: 100m
            memory: 250Mi
          requests:
            cpu: 10m
            memory: 190Mi
        securityContext:
          runAsUser: 65534
```

- kube-rbac-proxy 代理服务监听8443端口，代理来自127.0.0.1:8081的请求

```yaml
      - args:
        - --logtostderr
        - --secure-listen-address=:8443
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:8081/
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy-main
        ports:
        - containerPort: 8443
          name: https-main
        resources:
          limits:
            cpu: 40m
            memory: 40Mi
          requests:
            cpu: 20m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
```

- kube-rbac-proxy 的作用就是将之前ksm暴露的指标 保护起来
- 因为在攻击者可能获得对 Pod 的完全控制的场景中，该攻击者将能够发现有关工作负载以及相应工作负载的当前负载的大量信息。
- 所以加了一层代理，只能通过代理来访问具体的指标。这样只有部署了kube-rbac-proxy sidecar的容器才能访问

### 同时去掉 pod|service|endpoint|namespace 标签

- 最终的sd结果标签中只保留三个
  - container
  - instance
  - job
- yaml配置如下

```yaml
  - separator: ;
    regex: (pod|service|endpoint|namespace)
    replacement: $1
    action: labeldrop
```

### 同时做了hashmod ，猜测为了扩容准备的

```yaml
  - source_labels: [__address__]
    separator: ;
    regex: (.*)
    modulus: 1
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    separator: ;
    regex: "0"
    replacement: $1
    action: keep
```

## 修改ksm的副本数

- vim manifests/kube-state-metrics-deployment.yaml
- replicas由1改为2
- 可以在target页面看到ksm相关的两个job endpoint数量改为2了
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/64890e5f574f4f96a8e4167975cb9dce.png)
- 查询数据可以看到采集已经有两个了，通过instance标签区分
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/944f6ba5ce5f42158321f3ba94a84d93.png)

## serviceMonitor/monitoring/kube-state-metrics/1 代表ksm自身的指标

- 指标查询

```shell
{endpoint="https-self", job="kube-state-metrics", namespace="monitoring"}
```

- 所有的配置和0一致
- 只是port_name由 https-main改为了https-self，即9443端口

```yaml
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-self
    replacement: $1
    action: keep
```

### 对应ksm容器端口 8082

- 位置 manifests\kube-state-metrics-deployment.yaml
- ksm的 telemetry-port=8082代表将自身指标暴露在 8082端口上
- target页面![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/db024813b00b4be9850b7bf4fda03f75.png)
- 查询 {job="kube-state-metrics",container="kube-rbac-proxy-self"}
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/bb15d3b479294e95979548b67897bdbb.png)

```yaml
      containers:
      - args:
        - --host=127.0.0.1
        - --port=8081
        - --telemetry-host=127.0.0.1
        - --telemetry-port=8082
        image: k8s.gcr.io/kube-state-metrics/kube-state-metrics:v2.0.0
        name: kube-state-metrics
        resources:
          limits:
            cpu: 100m
            memory: 250Mi
          requests:
            cpu: 10m
            memory: 190Mi
        securityContext:
          runAsUser: 65534
```

- kube-rbac-proxy 9443代理8082端口流量

```yaml
      - args:
        - --logtostderr
        - --secure-listen-address=:9443
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:8082/
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy-self
        ports:
        - containerPort: 9443
          name: https-self
        resources:
          limits:
            cpu: 20m
            memory: 40Mi
          requests:
            cpu: 10m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
```

## serviceMonitor/monitoring/node-exporter/0

- 使用endpoints的k8s_sd ,namespace为 monitoring

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

- 过滤 node-exporter endpoints

```yaml
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: node-exporter
    replacement: $1
    action: keep
```

- kubectl describe endpoints node-exporter   -n monitoring

```shell
[root@k8s-master01 kube-prometheus]# kubectl describe endpoints node-exporter   -n monitoring              
Name:         node-exporter
Namespace:    monitoring
Labels:       app.kubernetes.io/component=exporter
              app.kubernetes.io/name=node-exporter
              app.kubernetes.io/part-of=kube-prometheus
              app.kubernetes.io/version=1.1.2
              service.kubernetes.io/headless=
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2021-09-06T04:36:40Z
Subsets:
  Addresses:          172.20.70.205,172.20.70.215
  NotReadyAddresses:  <none>
  Ports:
    Name   Port  Protocol
    ----   ----  --------
    https  9100  TCP

Events:  <none>
```

- 直接访问https的node-exporter报错
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/1ec5340f997c49bab740229448b57c9a.png)
- 可以通过127.0.0.1:9100访问 http的
- ```
  [root@prome-master01 kube-prometheus]# curl localhost:9100
  <html>
  			<head><title>Node Exporter</title></head>
  			<body>
  			<h1>Node Exporter</h1>
  			<p><a href="/metrics">Metrics</a></p>
  			</body>
  			</html>[root@prome-master01 
  ```

```shell

```

### kube-rbac-proxy 通过9100代理node-exporter

- manifests\node-exporter-daemonset.yaml
- node-exporter改为listen 127.0.0.1:9100，只能在node上访问自己
- 外面想要访问必须要通过 kube-rbac-proxy
- yaml配置

```yaml
      - args:
        - --web.listen-address=127.0.0.1:9100
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --no-collector.wifi
        - --no-collector.hwmon
        - --collector.filesystem.ignored-mount-points=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/pods/.+)($|/)
        - --collector.netclass.ignored-devices=^(veth.*|[a-f0-9]{15})$
        - --collector.netdev.device-exclude=^(veth.*|[a-f0-9]{15})$
        image: quay.io/prometheus/node-exporter:v1.1.2
        name: node-exporter
        resources:
          limits:
            cpu: 250m
            memory: 180Mi
          requests:
            cpu: 102m
            memory: 180Mi
        volumeMounts:
        - mountPath: /host/sys
          mountPropagation: HostToContainer
          name: sys
          readOnly: true
        - mountPath: /host/root
          mountPropagation: HostToContainer
          name: root
          readOnly: true
      - args:
        - --logtostderr
        - --secure-listen-address=[$(IP)]:9100
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:9100/
        env:
        - name: IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: https
        resources:
          limits:
            cpu: 20m
            memory: 40Mi
          requests:
            cpu: 10m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
      hostNetwork: true
      hostPID: true
      nodeSelector:
        kubernetes.io/os: linux
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
      serviceAccountName: node-exporter
      tolerations:
      - operator: Exists
      volumes:
      - hostPath:
          path: /sys
        name: sys
      - hostPath:
          path: /
        name: root
```

## serviceMonitor/monitoring/kube-apiserver/0

- 使用endpoints的k8s_sd ,namespace为 default
- 原因是集群默认在default ns中创建 kubernetes 的 svc 和endpoints
- ```shell
  [root@prome-master01 kube-prometheus]# kubectl get endpoints
  NAME                ENDPOINTS            AGE
  grafana-node-port   10.100.71.41:3000    20d
  kubernetes          192.168.3.200:6443   20d
  [root@prome-master01 kube-prometheus]# kubectl get svc
  NAME                TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
  grafana-node-port   NodePort    10.96.132.2   <none>        80:30000/TCP   20d
  kubernetes          ClusterIP   10.96.0.1     <none>        443/TCP        20d

  ```

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - default
```

### 过滤endpoint

```yaml
  - source_labels: [__meta_kubernetes_service_label_component]
    separator: ;
    regex: apiserver
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_provider]
    separator: ;
    regex: kubernetes
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https
    replacement: $1
    action: keep
```

### 同时使用 metric_relabel_configs drop掉了大量的无用指标

```yaml
 metric_relabel_configs:
    regex: apiserver_admission_controller_admission_latencies_seconds_.*
    replacement: $1
    action: drop
  - source_labels: [__name__]
    separator: ;
    regex: apiserver_admission_step_admission_latencies_seconds_.*
    replacement: $1
    action: drop
  - source_labels: [__name__, le]
    separator: ;
    regex: apiserver_request_duration_seconds_bucket;(0.15|0.25|0.3|0.35|0.4|0.45|0.6|0.7|0.8|0.9|1.25|1.5|1.75|2.5|3|3.5|4.5|6|7|8|9|15|25|30|50)
    replacement: $1
    action: drop

```

## 从 kubelet上采集 serviceMonitor/monitoring/kubelet

### 通用的配置

- kube-system命名空间下的endpoints

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - kube-system
```

- 过滤kubelet endpoints
- kubectl describe endpoints kubelet -n kube-system

```shell
[root@k8s-master01 kube-prometheus]# kubectl describe endpoints kubelet -n kube-system
Name:         kubelet
Namespace:    kube-system
Labels:       app.kubernetes.io/managed-by=prometheus-operator
              app.kubernetes.io/name=kubelet
              k8s-app=kubelet
Annotations:  <none>
Subsets:
  Addresses:          172.20.70.205,172.20.70.215
  NotReadyAddresses:  <none>
  Ports:
    Name           Port   Protocol
    ----           ----   --------
    https-metrics  10250  TCP
    http-metrics   10255  TCP
    cadvisor       4194   TCP

Events:  <none>
```

- 过滤port_name为https-metrics也就是 10250端口

```yaml
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-metrics
    replacement: $1
    action: keep
```

### serviceMonitor/monitoring/kubelet/0 代表采集kubelet自身指标

- 对应的为 https://172.20.70.205:10250/metrics

```yaml
metrics_path: /metrics
```

### serviceMonitor/monitoring/kubelet/1 代表采集kubelet内置的cadvisor指标也就是容器指标

- 对应的为 https://172.20.70.205:10250/metrics/cadvisor

```yaml
 metrics_path: /metrics/cadvisor
```

### serviceMonitor/monitoring/kubelet/2 代表采集kubelet对容器的Liveness Readiness探测的结果

- 对应的为 https://172.20.70.205:10250/metrics/probes

```yaml
metrics_path: /metrics/probes
```

- 容器探活的 Liveness Readiness 指标

```shell

prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="kube-system", node="k8s-node01", pod="prometheus-0", pod_uid="e27c9fe7-9d82-4228-86fb-b9c920611c15", probe_type="Liveness", result="successful", service="kubelet"}
148299
prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="kube-system", node="k8s-node01", pod="prometheus-0", pod_uid="e27c9fe7-9d82-4228-86fb-b9c920611c15", probe_type="Readiness", result="successful", service="kubelet"}
148300
prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="monitoring", node="k8s-node01", pod="prometheus-k8s-0", pod_uid="8898c8f2-1ea7-412f-8a25-ce98a8ca47c2", probe_type="Readiness", result="successful", service="kubelet"}
3084
prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="monitoring", node="k8s-node01", pod="prometheus-k8s-1", pod_uid="937e07bc-5cea-4e3d-83ac-a2e68e072340", probe_type="Readiness", result="successful", service="kubelet"}
3083

```

## serviceMonitor/monitoring/prometheus-operator/0 代表prometheus-operator的指标

- 过滤monitoring的  prometheus-operator

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

### prometheus-operator的作用

![image](https://bxdc-static.oss-cn-beijing.aliyuncs.com/images/20200407180510.png)

- 根据配置查询prometheus中的指标，作为用户自定义HPA的依据
- kube-aggregator 允许开发人员编写一个自己的服务，把这个服务注册到 Kubernetes 的 APIServer 里面去，这样我们就可以像原生的 APIServer 提供的 API 使用自己的 API 了，我们把自己的服务运行在 Kubernetes 集群里面，然后 Kubernetes 的 Aggregator 通过 Service 名称就可以转发到我们自己写的 Service 里面去了。这样这个聚合层就带来了很多好处：

  - 增加了 API 的扩展性，开发人员可以编写自己的 API 服务来暴露他们想要的 API。
  - 丰富了 API，核心 kubernetes 团队阻止了很多新的 API 提案，通过允许开发人员将他们的 API 作为单独的服务公开，这样就无须社区繁杂的审查了。
  - 开发分阶段实验性 API，新的 API 可以在单独的聚合服务中开发，当它稳定之后，在合并会 APIServer 就很容易了。
  - 确保新 API 遵循 Kubernetes 约定，如果没有这里提出的机制，社区成员可能会被迫推出自己的东西，这样很可能造成社区成员和社区约定不一致。
- 除了基于 CPU 和内存来进行自动扩缩容之外，我们还可以根据自定义的监控指标来进行
- 这个我们就需要使用 Prometheus Adapter，Prometheus 用于监控应用的负载和集群本身的各种指标
- Prometheus Adapter 可以帮我们使用 Prometheus 收集的指标并使用它们来制定扩展策略
- 这些指标都是通过 APIServer 暴露的，而且 HPA 资源对象也可以很轻易的直接使用。

### 对应的配置文件 manifests\prometheus-adapter-configMap.yaml

```yaml
apiVersion: v1
data:
  config.yaml: |-
    "resourceRules":
      "cpu":
        "containerLabel": "container"
        "containerQuery": "sum(irate(container_cpu_usage_seconds_total{<<.LabelMatchers>>,container!=\"\",pod!=\"\"}[5m])) by (<<.GroupBy>>)"
        "nodeQuery": "sum(1 - irate(node_cpu_seconds_total{mode=\"idle\"}[5m]) * on(namespace, pod) group_left(node) node_namespace_pod:kube_pod_info:{<<.LabelMatchers>>}) by (<<.GroupBy>>) or sum (1- irate(windows_cpu_time_total{mode=\"idle\", job=\"windows-exporter\",<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>)"
        "resources":
          "overrides":
            "namespace":
              "resource": "namespace"
            "node":
              "resource": "node"
            "pod":
              "resource": "pod"
      "memory":
        "containerLabel": "container"
        "containerQuery": "sum(container_memory_working_set_bytes{<<.LabelMatchers>>,container!=\"\",pod!=\"\"}) by (<<.GroupBy>>)"
        "nodeQuery": "sum(node_memory_MemTotal_bytes{job=\"node-exporter\",<<.LabelMatchers>>} - node_memory_MemAvailable_bytes{job=\"node-exporter\",<<.LabelMatchers>>}) by (<<.GroupBy>>) or sum(windows_cs_physical_memory_bytes{job=\"windows-exporter\",<<.LabelMatchers>>} - windows_memory_available_bytes{job=\"windows-exporter\",<<.LabelMatchers>>}) by (<<.GroupBy>>)"
        "resources":
          "overrides":
            "instance":
              "resource": "node"
            "namespace":
              "resource": "namespace"
            "pod":
              "resource": "pod"
      "window": "5m"
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/component: metrics-adapter
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 0.8.4
  name: adapter-config
  namespace: monitoring

```

## 其余自身指标

- serviceMonitor/monitoring/prometheus-k8s/0 代表两个prometheus采集器的指标
- serviceMonitor/monitoring/prometheus-operator/0 代表 prometheus-operator的指标
- serviceMonitor/monitoring/alertmanager/0 三个alertmanager的指标
- serviceMonitor/monitoring/grafana/0 1个grafana的指标

# 本节重点总结 :

- prometheus 采集分析

