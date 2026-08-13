---
title: 22.2 k8s中ksm采集的使用的dns解析
sidebarGroup: Prometheus
shortTitle: 44 22.2 k8s中ksm采集的使用的dns解...
order: 44
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - k8s 会为service创建cordns解析 - pod中dns的搜索域 - 模拟prometheus进行dns解析后访问数据 k8s对象资源指标 [kube-stats-me...'
---

> **Prometheus · 第 44 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- k8s 会为service创建cordns解析
- pod中dns的搜索域
- 模拟prometheus进行dns解析后访问数据

# k8s对象资源指标 [kube-stats-metrics项目](https://github.com/kubernetes/kube-state-metrics)

- prometheus 采集kube-state-metrics通过下面的配置段，

```yaml
- job_name: kube-state-metrics
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /metrics
  scheme: http
  static_configs:
  - targets:
    - kube-state-metrics:8080
```

## 采集配置解读

- target这里配置的是`kube-state-metrics:8080`。

```yaml
  - targets:
    - kube-state-metrics:8080
```

- 因为kube-state-metrics部署好之后有个service。它的配置如下。

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: v1.9.7
  name: kube-state-metrics
  namespace: kube-system
spec:
  clusterIP: None
  ports:
  - name: http-metrics
    port: 8080
    targetPort: http-metrics
  - name: telemetry
    port: 8081
    targetPort: telemetry
  selector:
    app.kubernetes.io/name: kube-state-metrics

```

### k8s 会为service创建[cordns解析](https://kubernetes.io/zh/docs/concepts/services-networking/dns-pod-service/)

- 解析域名为`${service_name}.${namespace}.svc.cluster.local`
- 其中 cluster.local代表集群的后缀
- 那么kube-state-metrics的域名为`kube-state-metrics.kube-system.svc.cluster.local`

### pod中dns的配置

- 同时pod中的dns配置为search 3个域，我们可以exec进入prometheus容器中查看，如下面的实例所示。

```shell
search kube-system.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5

```

- 所以在容器中可以ping一下 kube-state-metrics，可以看到解析的ip地址

```shell
/prometheus $ ping kube-state-metrics
PING kube-state-metrics (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $
```

所以采集kube-state-metrics的target配置成 `kube-state-metrics:8080`是可以的，当然也可以配置成 `kube-state-metrics.kube-system.svc:8080` 和 `kube-state-metrics.kube-system.svc.cluster.local:8080`。

- 下面演示了不同搜索域的结果

```shell
/prometheus $ cat /etc/resolv.conf 
search kube-system.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
/prometheus $ ping kube-state-metrics
PING kube-state-metrics (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $ ping kube-state-metrics.kube-system
PING kube-state-metrics.kube-system (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $ ping kube-state-metrics.kube-system.svc
PING kube-state-metrics.kube-system.svc (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $ ping kube-state-metrics.kube-system.svc.cluster.local
PING kube-state-metrics.kube-system.svc.cluster.local (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)

```

### 在节点上模拟prometheus访问 ksm

- prometheus通过访问coredns，解析kube-state-metrics的域名，拿到相关ip，在访问kube-state-metrics 指标。
- 我们可以在node上模拟这一过程
- 在master上拿到coredns service 的ip

```shell
kubectl get svc  -n kube-system |grep dns
  kube-dns             ClusterIP   10.96.0.10     <none>        53/UDP,53/TCP,9153/TCP   73d

```

- 在node上请求 coredns 解析 kube-stats-metrics 域名，以为node上的 /etc/resolv.conf配置配置相关的解析域，所以要写全域名FQDN

```shell

[root@k8s-master01 ~]#  dig  kube-state-metrics.kube-system.svc.cluster.local @10.96.0.10  

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.5 <<>> kube-state-metrics.kube-system.svc.cluster.local @10.96.0.10
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 26378
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;kube-state-metrics.kube-system.svc.cluster.local. IN A

;; ANSWER SECTION:
kube-state-metrics.kube-system.svc.cluster.local. 30 IN A 10.100.85.200

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: Tue Aug 24 16:38:18 CST 2021
;; MSG SIZE  rcvd: 141
```

- 访问这个ip的8080/metrics接口可以看到相关的数据

```shell
[root@k8s-master01 ~]# curl -s 10.100.85.200:8080/metrics |head
# HELP kube_certificatesigningrequest_labels Kubernetes labels converted to Prometheus labels.
# TYPE kube_certificatesigningrequest_labels gauge
# HELP kube_certificatesigningrequest_created Unix creation timestamp
# TYPE kube_certificatesigningrequest_created gauge
# HELP kube_certificatesigningrequest_condition The number of each certificatesigningrequest condition
# TYPE kube_certificatesigningrequest_condition gauge
# HELP kube_certificatesigningrequest_cert_length Length of the issued cert
# TYPE kube_certificatesigningrequest_cert_length gauge
# HELP kube_configmap_info Information about configmap.
# TYPE kube_configmap_info gauge
```

# 本节重点总结 :

- k8s 会为service创建cordns解析
- pod中dns的搜索域
- 模拟prometheus进行dns解析后访问数据

