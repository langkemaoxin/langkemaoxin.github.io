---
title: "36.3 grafana-dashboard看图分析"
sidebarGroup: "Prometheus"
shortTitle: "116 36.3 grafana-dashboard..."
order: 116
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "kube-prometheus中的grafana总结 - db使用 sqlit，volume类型为emptydir 无法持久化，pod扩缩就重新创建 - 通过configMap设置的prometheu..."
---

> **Prometheus · 第 116 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kube-prometheus中的grafana总结

- db使用 sqlit，volume类型为emptydir 无法持久化，pod扩缩就重新创建
- 通过configMap设置的prometheus DataSource
  - 通过 prometheus-k8s svc对应的 域名访问
  - 下面对应两个prometheus容器，有HA
- 各个dashboard通过 configMap挂载，grafana动态加载，不能修改
- 内置了22张大盘图，包含预聚合指标，很全面

# grafana deployment部署分析

## sqlit db文件

- manifests\grafana-deployment.yaml

```yaml
        volumeMounts:
        - mountPath: /var/lib/grafana
          name: grafana-storage
          readOnly: false
```

- 对应的grafana-storage为 emptyDir类型，属于pod临时的目录

```yaml
      volumes:
      - emptyDir: {}
        name: grafana-storage
```

## 通过配置的方式进行datasource设置

- 对应的volume配置

```yaml
        volumeMounts:
        - mountPath: /etc/grafana/provisioning/datasources
          name: grafana-datasources
          readOnly: false
      - name: grafana-datasources
      volumes:
        secret:
          secretName: grafana-datasources
```

### [grafana provisioning](http://docs.grafana.org/administration/provisioning/#provisioning-grafana)

- 是grafana 5.0后引入的功能，用以支持通过配置的方式进行datasource和dashboard的配置。
- 首先要在grafana的配置中增加provisioning的选项

```shell
[paths]
# folder that contains provisioning config files that grafana will apply on startup and while running.
;provisioning = /etc/grafana/provisioning
```

- 而后在/etc/grafana/provisioning中增加dashboards和datasources文件夹

```shell
[root@local provisioning]# ll
total 0
drwxr-xr-x 2 root grafana 25 Nov 28 03:09 dashboards
drwxr-xr-x 2 root grafana 25 Nov 28 03:09 datasources
```

- datasource只支持静态配置，即，在datasources中配置好后，grafana启动时候将会进行加载。在grafana启动后在加入该文件夹，需要重启才能生效。
- datasoures文件夹下需要放置对应的datasource的yaml文件，进到grafana容器内部查看内容

```shell
/etc/grafana/provisioning $ cat /etc/grafana/provisioning/datasources/datasources.yaml 
{
    "apiVersion": 1,
    "datasources": [
        {
            "access": "proxy",
            "editable": false,
            "name": "prometheus",
            "orgId": 1,
            "type": "prometheus",
            "url": "http://prometheus-k8s.monitoring.svc:9090",
            "version": 1
        }
    ]
}
```

### 对应的secret内容

- 将manifests\grafana-dashboardDatasources.yaml 中的data做base64解码可以得到 datasources.yaml 的内容

```yaml

apiVersion: v1
data:
  datasources.yaml: ewogICAgImFwaVZlcnNpb24iOiAxLAogICAgImRhdGFzb3VyY2VzIjogWwogICAgICAgIHsKICAgICAgICAgICAgImFjY2VzcyI6ICJwcm94eSIsCiAgICAgICAgICAgICJlZGl0YWJsZSI6IGZhbHNlLAogICAgICAgICAgICAibmFtZSI6ICJwcm9tZXRoZXVzIiwKICAgICAgICAgICAgIm9yZ0lkIjogMSwKICAgICAgICAgICAgInR5cGUiOiAicHJvbWV0aGV1cyIsCiAgICAgICAgICAgICJ1cmwiOiAiaHR0cDovL3Byb21ldGhldXMtazhzLm1vbml0b3Jpbmcuc3ZjOjkwOTAiLAogICAgICAgICAgICAidmVyc2lvbiI6IDEKICAgICAgICB9CiAgICBdCn0=
kind: Secret
metadata:
  labels:
    app.kubernetes.io/component: grafana
    app.kubernetes.io/name: grafana
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 7.5.4
  name: grafana-datasources
  namespace: monitoring
type: Opaque

```

- base64解码结果

```shell
[root@k8s-master01 kube-prometheus]# echo "ewogICAgImFwaVZlcnNpb24iOiAxLAogICAgImRhdGFzb3VyY2VzIjogWwogICAgICAgIHsKICAgICAgICAgICAgImFjY2VzcyI6ICJwcm94eSIsCiAgICAgICAgICAgICJlZGl0YWJsZSI6IGZhbHNlLAogICAgICAgICAgICAibmFtZSI6ICJwcm9tZXRoZXVzIiwKICAgICAgICAgICAgIm9yZ0lkIjogMSwKICAgICAgICAgICAgInR5cGUiOiAicHJvbWV0aGV1cyIsCiAgICAgICAgICAgICJ1cmwiOiAiaHR0cDovL3Byb21ldGhldXMtazhzLm1vbml0b3Jpbmcuc3ZjOjkwOTAiLAogICAgICAgICAgICAidmVyc2lvbiI6IDEKICAgICAgICB9CiAgICBdCn0" |base64   --decode  
{
    "apiVersion": 1,
    "datasources": [
        {
            "access": "proxy",
            "editable": false,
            "name": "prometheus",
            "orgId": 1,
            "type": "prometheus",
            "url": "http://prometheus-k8s.monitoring.svc:9090",
            "version": 1
        }
    ]
}
```

## 动态加载dashboards

- 不同于datasource，dashboards是支持动态加载的
- 在grafana容器内部看到的dashboards

```shell
cat /etc/grafana/provisioning/dashboards/dashboards.yaml 
{
    "apiVersion": 1,
    "providers": [
        {
            "folder": "Default",
            "name": "0",
            "options": {
                "path": "/grafana-dashboard-definitions/0"
            },
            "orgId": 1,
            "type": "file"
        }
    ]
}
```

- path  /grafana-dashboard-definitions/0 代表加载这个目录下的json文件
- folder Default代表加载后的dashboard放在 Default folder下
- 查看dashboards加载目录

```shell
/grafana-dashboard-definitions/0 $ ls -lrt /grafana-dashboard-definitions/0
total 0
drwxrwsrwx    3 root     nobody          81 Sep  6 04:36 scheduler
drwxrwsrwx    3 root     nobody          93 Sep  6 04:36 node-cluster-rsrc-use
drwxrwsrwx    3 root     nobody          93 Sep  6 04:36 namespace-by-workload
drwxrwsrwx    3 root     nobody          94 Sep  6 04:36 k8s-resources-workload
drwxrwsrwx    3 root     nobody          90 Sep  6 04:36 k8s-resources-node
drwxrwsrwx    3 root     nobody          85 Sep  6 04:36 cluster-total
drwxrwsrwx    3 root     nobody          81 Sep  6 04:36 apiserver
drwxrwsrwx    3 root     nobody          95 Sep  6 04:36 prometheus-remote-write
drwxrwsrwx    3 root     nobody          82 Sep  6 04:36 prometheus
drwxrwsrwx    3 root     nobody          85 Sep  6 04:36 node-rsrc-use
drwxrwsrwx    3 root     nobody         105 Sep  6 04:36 k8s-resources-workloads-namespace
drwxrwsrwx    3 root     nobody          90 Sep  6 04:36 controller-manager
drwxrwsrwx    3 root     nobody          77 Sep  6 04:36 proxy
drwxrwsrwx    3 root     nobody          88 Sep  6 04:36 namespace-by-pod
drwxrwsrwx    3 root     nobody          95 Sep  6 04:36 k8s-resources-namespace
drwxrwsrwx    3 root     nobody          86 Sep  6 04:36 workload-total
drwxrwsrwx    3 root     nobody          94 Sep  6 04:36 persistentvolumesusage
drwxrwsrwx    3 root     nobody          77 Sep  6 04:36 nodes
drwxrwsrwx    3 root     nobody          79 Sep  6 04:36 kubelet
drwxrwsrwx    3 root     nobody          89 Sep  6 04:36 k8s-resources-pod
drwxrwsrwx    3 root     nobody          93 Sep  6 04:36 k8s-resources-cluster
drwxrwsrwx    3 root     nobody          83 Sep  6 04:36 statefulset
drwxrwsrwx    3 root     nobody          81 Sep  6 04:36 pod-total
```

### 以node-exporter大盘为例

- 目录 定义

```yaml
        - mountPath: /grafana-dashboard-definitions/0/nodes
          name: grafana-dashboard-nodes
      - configMap:
          name: grafana-dashboard-nodes
        name: grafana-dashboard-nodes
```

- 对应的configmap grafana-dashboard-nodes，位置 manifests\grafana-dashboardDefinitions.yaml

```yaml
  kind: ConfigMap
  metadata:
    labels:
      app.kubernetes.io/component: grafana
      app.kubernetes.io/name: grafana
      app.kubernetes.io/part-of: kube-prometheus
      app.kubernetes.io/version: 7.5.4
    name: grafana-dashboard-nodes
    namespace: monitoring
```

### dashboard是不能修改的

- Cannot save provisioned dashboard

## 数据源地址dns解析

- 地址 http://prometheus-k8s.monitoring.svc:9090

### grafana 容器内部访问prometheus

```shell
[root@k8s-master01 kube-prometheus]# kubectl get pod -n monitoring  -o wide                                       
NAME                                   READY   STATUS    RESTARTS   AGE     IP              NODE           NOMINATED NODE   READINESS GATES
alertmanager-main-0                    2/2     Running   0          6h32m   10.100.85.235   k8s-node01     <none>           <none>
alertmanager-main-1                    2/2     Running   0          6h32m   10.100.85.233   k8s-node01     <none>           <none>
alertmanager-main-2                    2/2     Running   0          6h32m   10.100.85.234   k8s-node01     <none>           <none>
blackbox-exporter-55c457d5fb-rzn7l     3/3     Running   0          6h32m   10.100.85.236   k8s-node01     <none>           <none>
grafana-9df57cdc4-tf6qj                1/1     Running   0          6h32m   10.100.85.237   k8s-node01     <none>           <none>
kube-state-metrics-76f6cb7996-27dc2    3/3     Running   0          6h32m   10.100.85.238   k8s-node01     <none>           <none>
node-exporter-7rqfg                    2/2     Running   0          6h32m   172.20.70.215   k8s-node01     <none>           <none>
node-exporter-b5pnx                    2/2     Running   0          6h32m   172.20.70.205   k8s-master01   <none>           <none>
prometheus-adapter-59df95d9f5-28n4c    1/1     Running   0          6h32m   10.100.85.241   k8s-node01     <none>           <none>
prometheus-adapter-59df95d9f5-glwk7    1/1     Running   0          6h32m   10.100.85.242   k8s-node01     <none>           <none>
prometheus-k8s-0                       2/2     Running   1          6h32m   10.100.85.240   k8s-node01     <none>           <none>
prometheus-k8s-1                       2/2     Running   1          6h32m   10.100.85.239   k8s-node01     <none>           <none>
prometheus-operator-7775c66ccf-hkmpr   2/2     Running   0          7h16m   10.100.85.232   k8s-node01     <none>           <none>
[root@k8s-master01 kube-prometheus]# 
[root@k8s-master01 kube-prometheus]# kubectl -n monitoring exec  grafana-9df57cdc4-tf6qj  -ti -- /bin/sh          
/usr/share/grafana $ cat /etc/resolv.conf 
search monitoring.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
/usr/share/grafana $ ping prometheus-k8s.monitoring.svc
PING prometheus-k8s.monitoring.svc (10.96.200.87): 56 data bytes
ping: permission denied (are you root?)
/usr/share/grafana $ 
```

### k8s 会为service创建[cordns解析](https://kubernetes.io/zh/docs/concepts/services-networking/dns-pod-service/)

- 解析域名为`${service_name}.${namespace}.svc.cluster.local`
- 其中 cluster.local代表集群的后缀
- 那么prometheus-k8s的域名为`prometheus-k8s.monitoring.svc.cluster.local`

### pod中dns的配置

- 同时pod中的dns配置为search 3个域，我们可以exec进入grafana 容器中查看，如下面的实例所示。

```shell
[root@k8s-master01 kube-prometheus]# kubectl get pod -n monitoring  -o wide                                       
NAME                                   READY   STATUS    RESTARTS   AGE     IP              NODE           NOMINATED NODE   READINESS GATES
alertmanager-main-0                    2/2     Running   0          6h32m   10.100.85.235   k8s-node01     <none>           <none>
alertmanager-main-1                    2/2     Running   0          6h32m   10.100.85.233   k8s-node01     <none>           <none>
alertmanager-main-2                    2/2     Running   0          6h32m   10.100.85.234   k8s-node01     <none>           <none>
blackbox-exporter-55c457d5fb-rzn7l     3/3     Running   0          6h32m   10.100.85.236   k8s-node01     <none>           <none>
grafana-9df57cdc4-tf6qj                1/1     Running   0          6h32m   10.100.85.237   k8s-node01     <none>           <none>
kube-state-metrics-76f6cb7996-27dc2    3/3     Running   0          6h32m   10.100.85.238   k8s-node01     <none>           <none>
node-exporter-7rqfg                    2/2     Running   0          6h32m   172.20.70.215   k8s-node01     <none>           <none>
node-exporter-b5pnx                    2/2     Running   0          6h32m   172.20.70.205   k8s-master01   <none>           <none>
prometheus-adapter-59df95d9f5-28n4c    1/1     Running   0          6h32m   10.100.85.241   k8s-node01     <none>           <none>
prometheus-adapter-59df95d9f5-glwk7    1/1     Running   0          6h32m   10.100.85.242   k8s-node01     <none>           <none>
prometheus-k8s-0                       2/2     Running   1          6h32m   10.100.85.240   k8s-node01     <none>           <none>
prometheus-k8s-1                       2/2     Running   1          6h32m   10.100.85.239   k8s-node01     <none>           <none>
prometheus-operator-7775c66ccf-hkmpr   2/2     Running   0          7h16m   10.100.85.232   k8s-node01     <none>           <none>
[root@k8s-master01 kube-prometheus]# 
[root@k8s-master01 kube-prometheus]# kubectl -n monitoring exec  grafana-9df57cdc4-tf6qj  -ti -- /bin/sh          
/usr/share/grafana $ cat /etc/resolv.conf 
search monitoring.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5

```

- 所以在容器中可以ping一下 kube-state-metrics，可以看到解析的ip地址

```shell
/usr/share/grafana $ ping prometheus-k8s.monitoring.svc
PING prometheus-k8s.monitoring.svc (10.96.200.87): 56 data bytes
ping: permission denied (are you root?)
/usr/share/grafana $ 
```

- 在node上用这个ip访问以下 prometheus页面

```shell
[root@k8s-master01 kube-prometheus]# curl 10.96.200.87:9090/api/v1/status/buildinfo
{"status":"success","data":{"version":"2.26.0","revision":"3cafc58827d1ebd1a67749f88be4218f0bab3d8d","branch":"HEAD","buildUser":"root@a67cafebe6d0","buildDate":"20210331-11:56:23","goVersion":"go1.16.2"}}
 
```

# kube-prometheus中的grafana总结

- db使用 sqlit，volume类型为emptydir 无法持久化，pod扩缩就重新创建
- 通过configMap设置的prometheus DataSource
  - 通过 prometheus-k8s svc对应的 域名访问
  - 下面对应两个prometheus容器，有HA
- 各个dashboard通过 configMap挂载，grafana动态加载，不能修改
- 内置了22张大盘图，包含预聚合指标，很全面

