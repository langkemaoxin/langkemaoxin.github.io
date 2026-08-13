---
title: "15.8 在k8s部署prometheus statefulset"
sidebarGroup: "Prometheus"
shortTitle: "27 15.8 在k8s部署prometheus ..."
order: 27
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 准备好这些yaml文件 - 部署ksm - 部署prometheus 准备好这些yaml文件 | yaml文件名 | 作用 | | -----------------------..."
---

> **Prometheus · 第 27 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 准备好这些yaml文件
- 部署ksm
- 部署prometheus

# 准备好这些yaml文件

| yaml文件名                   | 作用                       |
| ---------------------------- | -------------------------- |
| pv.yaml                      | prometheus数据目录使用的pv |
| rbac.yaml                    | prometheus使用的权限相关   |
| control_plane_service.yaml   | 服务组件暴露指标的service  |
| prometheus_config.yaml       | 配置文件configmap          |
| prometheus_storageclass.yaml | storageclass               |
| statsfulset.yaml             | pod主yaml                  |

# 部署工作

## 1.监控etcd需要创建 secret

```shell
#  在master上创建
kubectl create secret generic etcd-certs --from-file=/etc/kubernetes/pki/etcd/healthcheck-client.crt --from-file=/etc/kubernetes/pki/etcd/healthcheck-client.key --from-file=/etc/kubernetes/pki/etcd/ca.crt -n kube-system

# 查看
[root@prome-master01 prometheus]# kubectl get secret etcd-certs  -n kube-system
NAME         TYPE     DATA   AGE
etcd-certs   Opaque   3      18s
[root@prome-master01 prometheus]# kubectl describe secret etcd-certs  -n kube-system
Name:         etcd-certs
Namespace:    kube-system
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
ca.crt:                  1058 bytes
healthcheck-client.crt:  1159 bytes
healthcheck-client.key:  1675 bytes

```

## 2. 创建数据目录

```shell
# 在节点上创建数据目录
mkdir -pv /data/prometheus
chown -R nfsnobody:nfsnobody /data/prometheus/
```

## 3. 修改pv.yaml中的节点选择器标签 k8s-node01改为你自己的节点名字

## 4. 部署kube-stats-metrics

```shell
# 第一种方式，使用课程提供的yaml zip包 
kubectl apply -f kube-stats-metrics
# 第二种方式 ，去github上下载最新的yaml 部署  ，位置在 https://github.com/kubernetes/kube-state-metrics/tree/master/examples/standard

# 检查部署结果
[root@prome-master01 prometheus]# kubectl get pod -n kube-system
NAME                                     READY   STATUS    RESTARTS   AGE
coredns-7d75679df-7f7tx                  1/1     Running   0          86m
coredns-7d75679df-qmzbg                  1/1     Running   0          86m
etcd-prome-master01                      1/1     Running   0          86m
kube-apiserver-prome-master01            1/1     Running   0          86m
kube-controller-manager-prome-master01   1/1     Running   0          86m
kube-proxy-48dwz                         1/1     Running   0          84m
kube-proxy-gmvvn                         1/1     Running   0          86m
kube-scheduler-prome-master01            1/1     Running   0          86m
kube-state-metrics-647444dd74-h4tfk      1/1     Running   0          16s
[root@prome-master01 prometheus]# kubectl   -n kube-system logs kube-state-metrics-647444dd74-h4tfk -f 
[root@prome-master01 prometheus]# kubectl   -n kube-system logs kube-state-metrics-647444dd74-h4tfk -f 
I0822 08:43:44.211403       1 main.go:86] Using default collectors
I0822 08:43:44.211479       1 main.go:98] Using all namespace
I0822 08:43:44.211488       1 main.go:139] metric white-blacklisting: blacklisting the following items: 
W0822 08:43:44.211505       1 client_config.go:543] Neither --kubeconfig nor --master was specified.  Using the inClusterConfig.  This might not work.
I0822 08:43:44.213107       1 main.go:184] Testing communication with server
I0822 08:43:44.222378       1 main.go:189] Running with Kubernetes cluster version: v1.21. git version: v1.21.4. git tree state: clean. commit: 3cce4a82b44f032d0cd1a1790e6d2f5a55d20aae. platform: linux/amd64
I0822 08:43:44.222401       1 main.go:191] Communication with server successful
I0822 08:43:44.222515       1 main.go:225] Starting metrics server: 0.0.0.0:8080
I0822 08:43:44.222779       1 metrics_handler.go:96] Autosharding disabled
I0822 08:43:44.223338       1 builder.go:146] Active collectors: certificatesigningrequests,configmaps,cronjobs,daemonsets,deployments,endpoints,horizontalpodautoscalers,ingresses,jobs,limitranges,mutatingwebhookconfigurations,namespaces,networkpolicies,nodes,persistentvolumeclaims,persistentvolumes,poddisruptionbudgets,pods,replicasets,replicationcontrollers,resourcequotas,secrets,services,statefulsets,storageclasses,validatingwebhookconfigurations,volumeattachments
I0822 08:43:44.223913       1 main.go:200] Starting kube-state-metrics self metrics server: 0.0.0.0:8081

```

## 5 部署prometheus服务

```shell
# 部署，到prometheus yaml目录下 apply即可
kubectl apply -f /opt/app/prome_in_k8s_install/prometheus

# 检查，kube-system ns
[root@prome-master01 prometheus]# kubectl get pod -n kube-system
NAME                                     READY   STATUS    RESTARTS   AGE
coredns-7d75679df-7f7tx                  1/1     Running   0          88m
coredns-7d75679df-qmzbg                  1/1     Running   0          88m
etcd-prome-master01                      1/1     Running   0          88m
kube-apiserver-prome-master01            1/1     Running   0          88m
kube-controller-manager-prome-master01   1/1     Running   0          88m
kube-proxy-48dwz                         1/1     Running   0          87m
kube-proxy-gmvvn                         1/1     Running   0          88m
kube-scheduler-prome-master01            1/1     Running   0          88m
kube-state-metrics-647444dd74-h4tfk      1/1     Running   0          3m6s
prometheus-0                             2/2     Running   0          87s

```

## 6. 使用node的ip:8091即可访问prometheus服务

```shell
curl localhost:8091
```

# 7. 排查问题

- 容器基础资源和node kubelet metrics采集报403错误，现象如下
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/ad1b4fae387c405bbd312c14023311fb.png)
- 解决方案 rbac.yaml resource添加 node/metrics即可
- kube-scheduler和kube-controller-manager 采集报错，如下
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/b74b416f2fc74b0fb0fcb087f92a9d91.png)
- 原因是因为 上述两个服务bind的地址是127.0.0.1 ,修改成0.0.0.0即可
- ```
  vim /etc/kubernetes/manifests/kube-scheduler.yaml
  vim /etc/kubernetes/manifests/kube-controller-manager.yaml 
  -bind-address=0.0.0.0 

  ```

# 最终的效果图![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/6535e5abdbb745fe8d0e212586e54571.png)

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/fe9bfe0b4a914444a41d9edd5bfa2f74.png)

# 本节重点总结 :

- 准备好这些yaml文件
- 部署ksm
- 部署prometheus

