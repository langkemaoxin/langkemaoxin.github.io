---
title: "19.3 打镜像部署到k8s中，prometheus配置采集并在grafana看图"
sidebarGroup: "Prometheus"
shortTitle: "38 19.3 打镜像部署到k8s中，promet..."
order: 38
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 打镜像，导出镜像，传输到各个节点并导入 - 运行该项目 - 配置prometheus和grafana 打镜像 本地build shell docker build -t ink8..."
---

> **Prometheus · 第 38 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 打镜像，导出镜像，传输到各个节点并导入
- 运行该项目
- 配置prometheus和grafana

# 打镜像

## 本地build

```shell

docker build -t ink8s-pod-metrics:v1 .
```

##  build过程

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/9087b9c5fa544576a57c6b2a8d3205e8.png)

## 导出镜像

```shell

docker save  ink8s-pod-metrics > ink8s-pod-metrics.tar 

```

## 传输到各个node节点上

```shell
scp ink8s-pod-metrics.tar k8s-node01:~
```

## 各个node节点上导入镜像

### 使用docker

```shell
docker load < ink8s-pod-metrics.tar
```

### 使用containerd

```shell
ctr --namespace k8s.io images import ink8s-pod-metrics.tar

```

# 运行该项目

```shell
 kubectl apply -f rbac.yaml
 kubectl apply -f deployment.yaml

```

## 检查

```shell
[root@k8s-master01 ink8s-pod-metrics]# kubectl get pod -o wide 
NAME                                           READY   STATUS    RESTARTS   AGE    IP              NODE         NOMINATED NODE   READINESS GATES
grafana-d5d85bcd6-f74ch                        1/1     Running   0          3d9h   10.100.85.199   k8s-node01   <none>           <none>
grafana-d5d85bcd6-l44mx                        1/1     Running   0          3d9h   10.100.85.198   k8s-node01   <none>           <none>
ink8s-pod-metrics-deployment-85d9795d6-95lsp   1/1     Running   0          13m    10.100.85.207   k8s-node01   <none>           <none>
```

- 日志

```shell
[root@k8s-master01 ink8s-pod-metrics]# kubectl logs -l app=ink8s-pod-metrics  -f  
2021-08-23 20:34:35.377256 INFO app/get_k8s_objs.go:128 [pod.label:map[component:etcd tier:control-plane]]
2021-08-23 20:34:35.377266 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-apiserver tier:control-plane]]
2021-08-23 20:34:35.377274 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-controller-manager tier:control-plane]]
2021-08-23 20:34:35.377292 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:35.377299 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:35.377317 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-scheduler tier:control-plane]]
2021-08-23 20:34:35.377324 INFO app/get_k8s_objs.go:128 [pod.label:map[app.kubernetes.io/name:kube-state-metrics app.kubernetes.io/version:v1.9.7 pod-template-hash:564668c858]]
2021-08-23 20:34:35.377331 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:metrics-server pod-template-hash:7dbf6c4558]]
2021-08-23 20:34:35.377336 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:prometheus-5b9cdcfd6c k8s-app:prometheus statefulset.kubernetes.io/pod-name:prometheus-0]]
2021-08-23 20:34:35.377358 INFO app/get_k8s_objs.go:143 server_pod_ips_result][num_pod:11][time_took_seconds:6.189551999]
2021-08-23 20:34:39.197614 INFO app/get_k8s_objs.go:107 server_node_ips_result][num_node:2][time_took_seconds:0.009575987]
2021-08-23 20:34:39.200824 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:kube-dns pod-template-hash:68b9d7b887]]
2021-08-23 20:34:39.200857 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:kube-dns pod-template-hash:68b9d7b887]]
2021-08-23 20:34:39.200871 INFO app/get_k8s_objs.go:128 [pod.label:map[component:etcd tier:control-plane]]
2021-08-23 20:34:39.200889 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-apiserver tier:control-plane]]
2021-08-23 20:34:39.200903 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-controller-manager tier:control-plane]]
2021-08-23 20:34:39.200920 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:39.200934 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:39.200947 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-scheduler tier:control-plane]]
2021-08-23 20:34:39.200961 INFO app/get_k8s_objs.go:128 [pod.label:map[app.kubernetes.io/name:kube-state-metrics app.kubernetes.io/version:v1.9.7 pod-template-hash:564668c858]]
2021-08-23 20:34:39.200981 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:metrics-server pod-template-hash:7dbf6c4558]]
2021-08-23 20:34:39.200992 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:prometheus-5b9cdcfd6c k8s-app:prometheus statefulset.kubernetes.io/pod-name:prometheus-0]]
2021-08-23 20:34:39.201022 INFO app/get_k8s_objs.go:143 server_pod_ips_result][num_pod:11][time_took_seconds:0.013052527]
```

## node上请求 pod 的metrics

- curl pod的ip:8080/metrics

```shell
[root@k8s-master01 ink8s-pod-metrics]# curl -s 10.100.85.207:8080/metrics |grep ink8s
# HELP ink8s_pod_metrics_get_node_detail k8s node detail each
# TYPE ink8s_pod_metrics_get_node_detail gauge
ink8s_pod_metrics_get_node_detail{containerRuntimeVersion="containerd://1.4.4",hostname="k8s-master01",ip="172.20.70.205",kubeletVersion="v1.20.1"} 1
ink8s_pod_metrics_get_node_detail{containerRuntimeVersion="containerd://1.4.4",hostname="k8s-node01",ip="172.20.70.215",kubeletVersion="v1.20.1"} 1
# HELP ink8s_pod_metrics_get_node_last_duration_seconds get node last duration seconds
# TYPE ink8s_pod_metrics_get_node_last_duration_seconds gauge
ink8s_pod_metrics_get_node_last_duration_seconds 0.008066143
# HELP ink8s_pod_metrics_get_pod_control_plane_pod_detail k8s pod detail of control plane
# TYPE ink8s_pod_metrics_get_pod_control_plane_pod_detail gauge
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="etcd",ip="172.20.70.205",pod_name="etcd-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-apiserver",ip="172.20.70.205",pod_name="kube-apiserver-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-controller-manager",ip="172.20.70.205",pod_name="kube-controller-manager-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-scheduler",ip="172.20.70.205",pod_name="kube-scheduler-k8s-master01"} 1
# HELP ink8s_pod_metrics_get_pod_last_duration_seconds get pod last duration seconds
# TYPE ink8s_pod_metrics_get_pod_last_duration_seconds gauge
ink8s_pod_metrics_get_pod_last_duration_seconds 0.01159838
```

# prometheus target页面检查pod 

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/aae77dfdc78442fcb9632f13f9f209c9.png)

- 发现pod已经发现到了，但是 报错：向http的server发送https的请求

# prometheus和grafana配置

## 检查 kubernetes-pods的job

- 如果之前配置的https，需要改为http的

```yaml
- job_name: kubernetes-pods
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /metrics
  scheme: http
  follow_redirects: true
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    separator: ;
    regex: "true"
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    separator: ;
    regex: (.+)
    target_label: __metrics_path__
    replacement: $1
    action: replace
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    separator: ;
    regex: ([^:]+)(?::\d+)?;(\d+)
    target_label: __address__
    replacement: $1:$2
    action: replace
  - separator: ;
    regex: __meta_kubernetes_pod_label_(.+)
    replacement: $1
    action: labelmap
  - source_labels: [__meta_kubernetes_namespace]
    separator: ;
    regex: (.*)
    target_label: kubernetes_namespace
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_pod_name]
    separator: ;
    regex: (.*)
    target_label: kubernetes_pod_name
    replacement: $1
    action: replace
  kubernetes_sd_configs:
  - role: pod
    kubeconfig_file: ""
    follow_redirects: true
```

## 在prometheus中检查指标

- 查询 ink8s_pod_metrics_get_node_detail
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/b50170e9dea24ee4b0f67abd3d7d8195.png)

```shell
ink8s_pod_metrics_get_node_detail{app="ink8s-pod-metrics", containerRuntimeVersion="containerd://1.4.4", hostname="k8s-master01", instance="10.100.85.207:8080", ip="172.20.70.205", job="kubernetes-pods", kubeletVersion="v1.20.1", kubernetes_namespace="default", kubernetes_pod_name="ink8s-pod-metrics-deployment-85d9795d6-95lsp", pod_template_hash="85d9795d6"}
1
ink8s_pod_metrics_get_node_detail{app="ink8s-pod-metrics", containerRuntimeVersion="containerd://1.4.4", hostname="k8s-node01", instance="10.100.85.207:8080", ip="172.20.70.215", job="kubernetes-pods", kubeletVersion="v1.20.1", kubernetes_namespace="default", kubernetes_pod_name="ink8s-pod-metrics-deployment-85d9795d6-95lsp", pod_template_hash="85d9795d6"}
```

## 配置grafana

- 举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/58fdb9e57b7d43baac99021109a7cf1d.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/234876ad0b4c47d4a6c3f02a927a5cf8.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/4e765de3d7b1439bb92e17be00b18c6b.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/e31ed3d5e8c84c0eaebf0722ddf8eddb.png)

# 本节重点总结 :

- 打镜像，导出镜像，传输到各个节点并导入
- 运行该项目
- 配置prometheus和grafana

