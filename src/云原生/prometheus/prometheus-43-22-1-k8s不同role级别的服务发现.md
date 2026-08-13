---
title: "22.1 k8s不同role级别的服务发现"
sidebarGroup: "Prometheus"
shortTitle: "43 22.1 k8s不同role级别的服务发现"
order: 43
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 服务发现的应用 - 3种采集的k8s服务发现role - 容器基础资源指标 role :node - k8s服务组件指标 role :endpoint - 部署在pod中业务埋点..."
---

> **Prometheus · 第 43 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 服务发现的应用
- 3种采集的k8s服务发现role
  - 容器基础资源指标  role :node
  - k8s服务组件指标  role :endpoint
  - 部署在pod中业务埋点指标  role :pod

# 服务发现的应用

- 所有组件将自身指标暴露在各自的服务端口上，prometheus通过pull过来拉取指标
- 但是prometheus需要知道各个目标的地址是多少，而且需要及时感知他们的变化
- 所以采用服务发现是最好的解决方式

## 容器基础资源指标

- 我们可以看到prometheus采用k8s服务发现，其中`role :node` 代表发现所有的node。

```yaml
- job_name: kubernetes-nodes-cadvisor
  kubernetes_sd_configs:
  - role: node
```

- 其中的原理是通过监听k8s node，一旦node加入(扩容)，node离开(缩容)，prometheus可以及时收到node的信息
- 通过访问节点的cadvisor指标path如`node_ip:10250/metrics/cadvisor`获取到相关指标
- 通过prometheus的target展示页面(`/targets`)可以看到`cadvisor` node发现的结果，
- target结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/0e6978f1c03a4798a9608feb9120d746.png)
- discovery 结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/00e27c3fadd44d62a528ea222e1d3af5.png)

## k8s服务组件指标

### kube-scheduler

- 采集配置如下

```yaml
- job_name: kube-scheduler
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :endpoints` 代表发现所有的endpoints
- [endpoint](https://image-static.segmentfault.com/261/604/2616041299-5f0817faf31d9) 可以理解为service向其发送流量的对象的IP地址
- 在之前我们创建的控制平面暴露的service中，kube-scheduler的配置如下

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-scheduler
  labels:
    k8s-app: kube-scheduler
spec:
  selector:
    component: kube-scheduler
  ports:
  - name: http-metrics
    port: 10259
    targetPort: 10259
    protocol: TCP

```

- 那么对应的endpoint可以describe到，就是下面所示的172.20.70.205:10259

```shell
[root@k8s-master01 ~]# kubectl describe svc kube-scheduler -n kube-system  
Name:              kube-scheduler
Namespace:         kube-system
Labels:            k8s-app=kube-scheduler
Annotations:       <none>
Selector:          component=kube-scheduler
Type:              ClusterIP
IP Families:       <none>
IP:                10.96.208.114
IPs:               10.96.208.114
Port:              http-metrics  10259/TCP
TargetPort:        10259/TCP
Endpoints:         172.20.70.205:10259
Session Affinity:  None
Events:            <none>
```

- 这个和prometheus kube-scheduler target页面是一致的
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/c7a32bf0e868417c83d50b186d93f902.png)

### kube-controller-manager

- 采集配置如下

```yaml
- job_name: kube-controller-manager
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :endpoints` 代表发现所有的endpoints
- 在之前我们创建的控制平面暴露的service中，kube-controller-manager的配置如下

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-controller-manager
  labels:
    k8s-app: kube-controller-manager
spec:
  selector:
    component: kube-controller-manager
  ports:
  - name: http-metrics
    port: 10257
    targetPort: 10257
    protocol: TCP

```

- 那么对应的endpoint可以describe到，就是下面所示的172.20.70.205:10257

```shell
[root@k8s-master01 ~]# kubectl describe svc kube-controller-manager -n kube-system                              
Name:              kube-controller-manager
Namespace:         kube-system
Labels:            k8s-app=kube-controller-manager
Annotations:       <none>
Selector:          component=kube-controller-manager
Type:              ClusterIP
IP Families:       <none>
IP:                10.96.35.204
IPs:               10.96.35.204
Port:              http-metrics  10257/TCP
TargetPort:        10257/TCP
Endpoints:         172.20.70.205:10257
Session Affinity:  None
Events:            <none>
```

- 这个和prometheus kube-controller-manager target页面是一致的

### kube-etcd

- 采集配置如下

```yaml
- job_name: kube-etcd
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :endpoints` 代表发现所有的endpoints
- 在之前我们创建的控制平面暴露的service中，kube-etcd的配置如下

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-etcd
  labels:
    k8s-app: kube-etcd
spec:
  selector:
    component: etcd
    tier: control-plane
  ports:
  - name: http-metrics
    port: 2379
    targetPort: 2379
    protocol: TCP

```

- 那么对应的endpoint可以describe到，就是下面所示的172.20.70.205:2379

```shell
[root@prome-master01 ~]# kubectl describe  svc kube-etcd -n kube-system
Name:              kube-etcd
Namespace:         kube-system
Labels:            k8s-app=kube-etcd
Annotations:       <none>
Selector:          component=etcd,tier=control-plane
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.96.136.217
IPs:               10.96.136.217
Port:              http-metrics  2379/TCP
TargetPort:        2379/TCP
Endpoints:         192.168.3.200:2379
Session Affinity:  None
Events:            <none>

```

- 这个和prometheus kube-etcd target页面是一致的
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/245c3de4b44746ae94ccb305d10ccf38.png)

## 部署在pod中业务埋点指标

- 采集配置如下

```yaml
- job_name: kubernetes-pods
  kubernetes_sd_configs:
  - role: pod
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :pods` 代表发现所有的pods，相当于执行`kubectl get pod -A`

```shell
[root@k8s-master01 ~]# kubectl get pod -A
NAMESPACE         NAME                                           READY   STATUS    RESTARTS   AGE
calico-system     calico-kube-controllers-854b9dcf89-gct84       1/1     Running   5          139d
calico-system     calico-node-58m74                              1/1     Running   7          139d
calico-system     calico-node-8pwz5                              1/1     Running   1          42d
calico-system     calico-typha-56958ddd97-9zpd2                  1/1     Running   2          42d
calico-system     calico-typha-56958ddd97-gnt8k                  1/1     Running   8          139d
default           grafana-d5d85bcd6-f74ch                        1/1     Running   0          4d5h
default           grafana-d5d85bcd6-l44mx                        1/1     Running   0          4d5h
default           ink8s-pod-metrics-deployment-85d9795d6-95lsp   1/1     Running   0          20h
ingress-nginx     ingress-nginx-controller-6cb6fdd64b-p4s65      1/1     Running   0          4d5h
kube-admin        k8s-mon-daemonset-z6sfw                        1/1     Running   1          42d
kube-admin        k8s-mon-deployment-6d7d58bdc8-rxj42            1/1     Running   0          4d5h
kube-system       coredns-68b9d7b887-ckwgh                       1/1     Running   2          139d
kube-system       coredns-68b9d7b887-vfmft                       1/1     Running   2          139d
kube-system       etcd-k8s-master01                              1/1     Running   7          125d
kube-system       kube-apiserver-k8s-master01                    1/1     Running   2          74d
kube-system       kube-controller-manager-k8s-master01           1/1     Running   66         136d
kube-system       kube-proxy-kc258                               1/1     Running   1          42d
kube-system       kube-proxy-zx87g                               1/1     Running   2          139d
kube-system       kube-scheduler-k8s-master01                    1/1     Running   64         83d
kube-system       kube-state-metrics-564668c858-dnmnh            1/1     Running   0          4d3h
kube-system       metrics-server-7dbf6c4558-zwp5m                1/1     Running   0          4d5h
kube-system       prometheus-0                                   2/2     Running   0          4d3h
tigera-operator   tigera-operator-cf6b69777-mlgk9                1/1     Running   85         139d
```

- 然后访问的时候pod的ip，因为在k8s中是pod之间网络是扁平的，所以prometheus的pod可以访问到其他的pod
- target结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/84ab9859b5d641b793085c99c96c2eac.png)
- discovery结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/97a066508ebb46d991c73ffda13932de.png)

# 本节重点总结 :

- 服务发现的应用
- 3种采集的k8s服务发现role
  - 容器基础资源指标  role :node
  - k8s服务组件指标  role :endpoint
  - 部署在pod中业务埋点指标  role :pod

