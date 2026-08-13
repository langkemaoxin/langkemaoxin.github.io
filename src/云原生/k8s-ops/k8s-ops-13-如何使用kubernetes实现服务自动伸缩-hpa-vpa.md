---
title: 如何使用kubernetes实现服务自动伸缩？HPA、VPA
sidebarGroup: K8s 运维笔记
shortTitle: 13 如何使用kubernetes实现服务自动伸缩？H
order: 13
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: '如何使用kubernetes实现服务自动伸缩？HPA、VPA 一、Kubernetes Pod水平自动伸缩 HPA 官方网址：http[path]'
---

> **K8s 课程笔记 · 第 13 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何使用kubernetes实现服务自动伸缩？HPA、VPA

# 一、Kubernetes Pod水平自动伸缩 HPA

> 官方网址：https://kubernetes.io/zh/docs/tasks/run-application/horizontal-pod-autoscale/

## 1.1 HPA简介

HAP，全称 Horizontal Pod Autoscaler， 可以基于 CPU 利用率自动扩缩 ReplicationController、Deployment 和 ReplicaSet 中的 Pod 数量。 除了 CPU 利用率，也可以基于其他应程序提供的自定义度量指标来执行自动扩缩。 

Pod 自动扩缩不适用于无法扩缩的对象，比如 DaemonSet。

Pod 水平自动扩缩特性由 Kubernetes API 资源和控制器实现。资源决定了控制器的行为。 控制器会周期性的调整副本控制器或 Deployment 中的副本数量，以使得 Pod 的平均 CPU 利用率与用户所设定的目标值匹配。

HPA 定期检查内存和 CPU 等指标，自动调整 Deployment 中的副本数；

实际生产中，广泛使用这四类指标：
1、Resource metrics - CPU核内存利用率指标
2、Pod metrics - 例如网络利用率和流量
3、Object metrics - 特定对象的指标，比如Ingress, 可以按每秒使用请求数来扩展容器
4、Custom metrics - 自定义监控，比如通过定义服务响应时间，当响应时间达到一定指标时自动扩容

## 1.2 metircs-server部署

![image-20231204150905238](/云原生/k8s-ops/k8s-ops-13-如何使用kubernetes实现服务自动伸缩-hpa-vpa/image-20231204150905238.png)

![image-20231204150922832](/云原生/k8s-ops/k8s-ops-13-如何使用kubernetes实现服务自动伸缩-hpa-vpa/image-20231204150922832.png)

![image-20231204151106877](/云原生/k8s-ops/k8s-ops-13-如何使用kubernetes实现服务自动伸缩-hpa-vpa/image-20231204151106877.png)

~~~powershell
[root@k8s-master01 ~]# wget https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/high-availability-1.21+.yaml
~~~

>kubelet 证书需要由集群证书颁发机构签名(或者通过向 Metrics Server 传递参数 --kubelet-insecure-tls 来禁用证书验证)。

~~~powershell
[root@k8s-master01 ~]# vim high-availability-1.21+.yaml
......
143       containers:
144       - args:
145         - --cert-dir=/tmp
146         - --secure-port=4443
147         - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
148         - --kubelet-use-node-status-port
149         - --metric-resolution=15s
150         - --kubelet-insecure-tls 添加此行内容
151         image: registry.k8s.io/metrics-server/metrics-server:v0.6.4
......
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f high-availability-1.21+.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods -n kube-system
NAME                                       READY   STATUS    RESTARTS      AGE
......
metrics-server-6bc5bbd65c-c8llz            1/1     Running   0             7m45s
metrics-server-6bc5bbd65c-pz6mc            1/1     Running   0             7m45s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl top nodes
NAME           CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
k8s-master01   203m         2%     1902Mi          24%
k8s-master02   156m         1%     1690Mi          21%
k8s-master03   222m         2%     2477Mi          31%
k8s-worker01   100m         1%     1466Mi          18%
k8s-worker02   99m          1%     1413Mi          18%
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl top pods -n kube-system
NAME                                       CPU(cores)   MEMORY(bytes)
coredns-5dd5756b68-47b6z                   3m           43Mi
coredns-5dd5756b68-75d89                   1m           55Mi
kube-apiserver-k8s-master01                40m          447Mi
kube-apiserver-k8s-master02                32m          396Mi
kube-apiserver-k8s-master03                52m          531Mi
kube-controller-manager-k8s-master01       2m           139Mi
kube-controller-manager-k8s-master02       1m           141Mi
kube-controller-manager-k8s-master03       15m          67Mi
kube-proxy-9x9g8                           6m           35Mi
kube-proxy-k9vmv                           5m           34Mi
kube-proxy-m94cz                           9m           33Mi
kube-proxy-ttnnp                           9m           98Mi
kube-proxy-wql98                           6m           91Mi
kube-scheduler-k8s-master01                3m           80Mi
kube-scheduler-k8s-master02                2m           79Mi
kube-scheduler-k8s-master03                3m           29Mi
kube-vip-cloud-provider-65f5dd4865-pvxsg   2m           21Mi
kube-vip-k8s-master01                      1m           58Mi
kube-vip-k8s-master02                      1m           58Mi
kube-vip-k8s-master03                      5m           19Mi
metrics-server-669c5c9b99-g5rct            3m           22Mi
metrics-server-669c5c9b99-hsvf4            3m           28Mi
~~~

## 1.3 HPA演示示例

### 1.3.1 部署一个服务

~~~powershell
[root@k8s-master01 ~]# mkdir hpa
[root@k8s-master01 ~]# cd hpa
~~~

~~~powershell
[root@k8s-master01 hpa]# vim 01-nginx.yaml
[root@k8s-master01 hpa]# cat 01-nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          requests:
            cpu: 200m
            memory: 100Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: default
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: nginx
~~~

~~~powershell
[root@k8s-master01 hpa]# kubectl apply -f 01-nginx.yaml
deployment.apps/nginx created
service/nginx created
~~~

~~~powershell
[root@k8s-master01 hpa]# kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
nginx-f9f76bb6f-zcnx9   1/1     Running   0          52s
nginx-f9f76bb6f-zpsdd   1/1     Running   0          52s
~~~

### 1.3.2 创建HAP对象

这是一个 HorizontalPodAutoscaler (HPA) 对象的配置，它将控制 Deployment "nginx" 的副本数量。当 CPU 使用率超过 50% 时，HPA 将自动增加 Pod 的副本数量，最高不超过 10 个。

~~~powershell
[root@k8s-master01 hpa]# vim 02-nginx-hpa.yaml
[root@k8s-master01 hpa]# cat 02-nginx-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
~~~

~~~powershell
关于每行命令行解释：
当然，以下是对您提供的 YAML 文件中每一行的解释：

apiVersion: autoscaling/v2

- `apiVersion` 表示所使用的 API 版本。在这个例子中，我们使用的是 `autoscaling/v2beta2` 版本，这是 Kubernetes 的 HorizontalPodAutoscaler 资源对象的版本。

kind: HorizontalPodAutoscaler

- `kind` 定义了这个资源对象的类型。在这里，它是 `HorizontalPodAutoscaler`。

metadata:
  name: nginx
  namespace: hpa

- `metadata` 包含与资源对象相关的元数据。在这个例子中，`name` 是资源对象的名字（这里是 "nginx"），而 `namespace` 指定了此资源所在的命名空间（这里是 "hpa"）。

spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx

- `spec` 描述了要配置的具体细节。在这个部分，`scaleTargetRef` 指向我们要自动伸缩的目标资源。
  - `apiVersion`: 目标资源的 API 版本，这里是 `apps/v1`。
  - `kind`: 目标资源的类型，这里是 `Deployment`。
  - `name`: 目标资源的名字，这里是 "nginx"。

  minReplicas: 1
  maxReplicas: 10

- `minReplicas` 和 `maxReplicas` 定义了 Pod 的最小和最大副本数。在此例中，HPA 将确保至少有一个副本在运行，并且最多不会超过 10 个副本。

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50

- `metrics` 部分定义了用于触发自动伸缩操作的指标。在这个例子中，我们只有一个指标。
  - `- type: Resource`: 这里指定度量类型为资源度量。
  - `resource`: 定义了资源度量的详细信息。
    - `name: cpu`: 我们正在度量 CPU 使用率。
    - `target`: 设置目标值以触发自动伸缩。
      - `type: Utilization`: 目标类型是利用率。
      - `averageUtilization: 50`: 当平均 CPU 利用率达到或超过 50% 时，将触发自动伸缩操作。
~~~

~~~powershell
[root@k8s-master01 hpa]# kubectl apply -f 02-nginx-hpa.yaml
horizontalpodautoscaler.autoscaling/nginx-hpa created
~~~

~~~powershell
[root@k8s-master01 hpa]# kubectl get hpa
NAME        REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-hpa   Deployment/nginx   0%/50%    1         10        2          63s
~~~

### 1.3.3 执行压测

~~~powershell
[root@k8s-master01 hpa]# yum -y install httpd-tools
~~~

~~~powershell
[root@k8s-master01 hpa]# kubectl get svc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP        6h47m
nginx        NodePort    10.100.32.126   <none>        80:30770/TCP   20m
~~~

~~~powershell
[root@k8s-master01 hpa]# ab -c 1000 -n 1000000000 http://192.168.10.160:30770/
This is ApacheBench, Version 2.3 <$Revision: 1430300 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking 192.168.10.160 (be patient)
apr_socket_recv: Connection reset by peer (104)
Total of 29377 requests completed
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
nginx-f9f76bb6f-8fhr5   1/1     Running   0          76s
nginx-f9f76bb6f-dzv7k   1/1     Running   0          91s
nginx-f9f76bb6f-gr55m   1/1     Running   0          91s
nginx-f9f76bb6f-mnhdv   1/1     Running   0          106s
nginx-f9f76bb6f-nm49b   1/1     Running   0          76s
nginx-f9f76bb6f-pmpwr   1/1     Running   0          106s
nginx-f9f76bb6f-qp8hd   1/1     Running   0          91s
nginx-f9f76bb6f-qwjpt   1/1     Running   0          106s
nginx-f9f76bb6f-wj5xj   1/1     Running   0          91s
nginx-f9f76bb6f-zpsdd   1/1     Running   0          26m
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get hpa
NAME        REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-hpa   Deployment/nginx   0%/50%    1         10        10         14m
~~~

~~~powershell
[root@k8s-master01 hpa]# kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
nginx-f9f76bb6f-zpsdd   1/1     Running   0          48m
~~~

>CPU 利用率已经降到 0，所以 HPA 将自动缩减副本数量至 1。
>为什么会将副本数降为1，而不是我们部署时指定的replicas: 2呢？
>因为在创建HPA时，指定了副本数范围，这里是minReplicas: 1，maxReplicas: 10。所以HPA在缩减副本数时减到了1。

# 二、Kubernetes Pod垂直自动伸缩 VPA

> 官方链接：https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler

## 2.1 VPA简介

VPA,全称 Vertical Pod Autoscaler，即垂直 Pod 自动扩缩容，它根据容器资源使用率自动设置 CPU 和 内存 的requests，从而允许在节点上进行适当的调度，以便为每个 Pod 提供适当的资源。
它既可以缩小过度请求资源的容器，也可以根据其使用情况随时提升资源不足的容量。有些时候无法通过增加 Pod 数来扩容，比如数据库。这时候可以通过 VPA 增加 Pod 使用资源的大小，比如调整 Pod 的 CPU 和内存，进而调整Pod资源使用。

**使用VPA的优缺点：**

**优点**
Pod 资源用其所需，所以集群节点使用效率高；
Pod 会被安排到具有适当可用资源的节点上；
不必运行基准测试任务来确定 CPU 和内存请求的合适值；
VPA 可以随时调整 CPU 和内存请求，无需人为操作，因此可以减少维护时间；

**缺点**

不能与HPA（Horizontal Pod Autoscaler ）一起使用；

## 2.2 部署metrics-server及VPA

### 2.2.1部署metrics-server

> 由于在hpa中已经部署，本次就不再部署了。

### 2.2.2 升级openssl

~~~powershell
[root@k8s-master01 ~]# curl -o /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
~~~

~~~powershell
[root@k8s-master01 ~]# yum install -y openssl-devel openssl11 openssl11-devel
~~~

~~~powershell
[root@k8s-master01 ~]# openssl11 version
OpenSSL 1.1.1k  FIPS 25 Mar 2021
~~~

~~~powershell
[root@k8s-XXX ~]# which openssl
/usr/bin/openssl
[root@k8s-XXX ~]# which openssl11
/usr/bin/openssl11
~~~

~~~powershell
[root@k8s-XXX ~]# rm -rf `which openssl`
[root@k8s-XXX ~]# ln -s /usr/bin/openssl11 /usr/bin/openssl
[root@k8s-XXX ~]# ls -l /usr/bin/openssl
lrwxrwxrwx 1 root root 18 12月  8 17:13 /usr/bin/openssl -> /usr/bin/openssl11
~~~

~~~powershell
[root@k8s-XXX ~]# openssl version
OpenSSL 1.1.1k  FIPS 25 Mar 2021
~~~

### 2.2.3 部署VPA

![image-20231208160844735](/云原生/k8s-ops/k8s-ops-13-如何使用kubernetes实现服务自动伸缩-hpa-vpa/image-20231208160844735.png)

![image-20231208160910923](/云原生/k8s-ops/k8s-ops-13-如何使用kubernetes实现服务自动伸缩-hpa-vpa/image-20231208160910923.png)

![image-20231208161010465](/云原生/k8s-ops/k8s-ops-13-如何使用kubernetes实现服务自动伸缩-hpa-vpa/image-20231208161010465.png)

~~~powershell
[root@k8s-master01 ~]# mkdir vpa
[root@k8s-master01 ~]# cd vpa
~~~

~~~powershell
[root@k8s-master01 vpa]# git clone https://github.com/kubernetes/autoscaler.git
~~~

~~~powershell
[root@k8s-master01 vpa]# cd autoscaler/vertical-pod-autoscaler/
[root@k8s-master01 vertical-pod-autoscaler]# ls
builder  common  deploy  e2e  enhancements  examples  FAQ.md  go.mod  go.sum  hack  MIGRATE.md  OWNERS  pkg  README.md  RELEASE.md  vendor
[root@k8s-master01 vertical-pod-autoscaler]# ls hack/
boilerplate.go.txt         emit-metrics.py       run-e2e-tests.sh                  vpa-apply-upgrade.sh  warn-obsolete-vpa-objects.sh
convert-alpha-objects.sh   generate-crd-yaml.sh  update-codegen.sh                 vpa-down.sh
deploy-for-e2e-locally.sh  local-cluster.md      update-kubernetes-deps-in-e2e.sh  vpa-process-yaml.sh
deploy-for-e2e.sh          run-e2e-locally.sh    update-kubernetes-deps.sh         vpa-process-yamls.sh
e2e                        run-e2e.sh            verify-codegen.sh                 vpa-up.sh
[root@k8s-master01 vertical-pod-autoscaler]# bash ./hack/vpa-up.sh
......
deployment.apps/vpa-admission-controller created
service/vpa-webhook created
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl get pods -n kube-system
NAME                                       READY   STATUS    RESTARTS       AGE
......
vpa-admission-controller-7467db745-6d9hm   1/1     Running   0              21s
vpa-recommender-597b7c765d-d9rd2           1/1     Running   0              21s
vpa-updater-884d4d7d9-8z4cn                1/1     Running   0              21s
~~~

### 2.2.4 VPA应用案例 updateMode: "Off"

在VPA中，`updateMode` 是一个重要的配置选项，它决定了VPA如何应用其提供的资源建议。根据不同的设置，VPA可以采取不同的策略来更新Pod的资源配置：

1. Off：
   - VPA不会应用任何资源推荐，只是收集和显示数据。
2. Initial：
   - VPA只会在Pod创建时应用资源推荐。一旦Pod启动，即使后续有新的资源推荐，也不会再进行调整。
3. Recreate：
   - 当VPA生成新的资源推荐时，它会终止当前的Pod并重新创建一个新的Pod，新Pod将采用最新的资源推荐。这种方式会导致服务短暂中断，但能确保立即应用新的资源设置。
4. Auto：
   - 这是默认模式。在这种模式下，VPA会尝试在线调整运行中的Pod的资源请求和限制，而无需重启Pod。如果无法在线调整（例如，由于内核或Kubernetes版本的限制），则会选择重新创建Pod。

#### 2.2.4.1 创建应用实例

>此模式仅获取资源推荐不更新Pod

~~~powershell
[root@k8s-master01 vpa]# vim 01-nginx.yaml
[root@k8s-master01 vpa]# cat 01-nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          requests:
            cpu: 100m
            memory: 250Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: default
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: nginx
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl apply -f 01-nginx.yaml
deployment.apps/nginx created
service/nginx created
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
nginx-f9f76bb6f-fcsh5   1/1     Running   0          24s
nginx-f9f76bb6f-lspmv   1/1     Running   0          24s

[root@k8s-master01 vpa]# kubectl get svc
NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1      <none>        443/TCP        8h
nginx        NodePort    10.110.33.44   <none>        80:30166/TCP   28s
~~~

#### 2.2.4.2 创建vpa

>使用updateMode: "Off"模式，这种模式仅获取资源推荐，不更新Pod

~~~powershell
[root@k8s-master01 vpa]# vim nginx-vpa.yaml
[root@k8s-master01 vpa]# cat nginx-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: nginx-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: nginx
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: "nginx"
      minAllowed:
        cpu: "250m"
        memory: "100Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "2048Mi"
~~~

~~~powershell
解释如下：
apiVersion: autoscaling.k8s.io/v1：定义了该资源配置所使用的API版本。在这个例子中，使用的是autoscaling.k8s.io组下的v1版本。
kind: VerticalPodAutoscaler：定义了这个资源配置的类型是VerticalPodAutoscaler。
3-4. metadata:：开始元数据部分，包含了对象的基本信息。

name: nginx-vpa：为VPA对象命名，这个名称在命名空间内必须是唯一的。
namespace: vpa：指定了VPA对象所在的命名空间。
spec:：开始规范部分，定义了VPA的行为和配置。
6-9. targetRef:：定义了VPA应该应用到的目标资源引用。
- apiVersion: "apps/v1"：目标资源的API版本。
- kind: Deployment：目标资源的类型。
- name: nginx：目标资源的名字。

10-11. updatePolicy:：定义了VPA更新策略。
- updateMode: "Off"：设置VPA的更新模式为“关闭”。这意味着VPA将不会自动更新Pod的资源请求和限制。

12-17. resourcePolicy:：定义了容器级别的资源策略。
- containerPolicies:：开始容器策略列表。
- - containerName: "nginx"：定义了要应用此策略的容器名称。
- minAllowed:：定义了容器可以请求的最小资源量。
- cpu: "250m"：最小CPU资源为250毫核。
- memory: "100Mi"：最小内存资源为100兆字节。
- maxAllowed:：定义了容器可以请求的最大资源量。
- cpu: "2000m"：最大CPU资源为2000毫核。
- memory: "2048Mi"：最大内存资源为2048兆字节。
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl apply -f nginx-vpa.yaml
verticalpodautoscaler.autoscaling.k8s.io/nginx-vpa created
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl get vpa
NAME        MODE   CPU    MEM       PROVIDED   AGE
nginx-vpa   Off    250m   262144k   True       24s
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl describe vpa nginx-vpa
Name:         nginx-vpa
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  autoscaling.k8s.io/v1
Kind:         VerticalPodAutoscaler
Metadata:
  Creation Timestamp:  2023-12-08T09:35:53Z
  Generation:          1
  Resource Version:    163337
  UID:                 bccb77de-13fa-4815-b24e-3a7d61783bc5
Spec:
  Resource Policy:
    Container Policies:
      Container Name:  nginx
      Max Allowed:
        Cpu:     2000m
        Memory:  2048Mi
      Min Allowed:
        Cpu:     250m
        Memory:  100Mi
  Target Ref:
    API Version:  apps/v1
    Kind:         Deployment
    Name:         nginx
  Update Policy:
    Update Mode:  Off
Status:
  Conditions:
    Last Transition Time:  2023-12-08T09:36:09Z
    Status:                True
    Type:                  RecommendationProvided
  Recommendation:
    Container Recommendations:
      Container Name:  nginx
      Lower Bound:
        Cpu:     250m
        Memory:  262144k
      Target:
        Cpu:     250m
        Memory:  262144k
      Uncapped Target:
        Cpu:     25m
        Memory:  262144k
      Upper Bound:
        Cpu:     1331m
        Memory:  2Gi
Events:          <none>
~~~

~~~powershell
解释如下：
Name: nginx-vpa：定义了VPA对象的名称，这里是"nginx-vpa"。
Namespace: default：定义了VPA对象所在的命名空间，这里是"default"。
Labels和Annotations：这两个字段目前没有设置任何标签或注解。
API Version: autoscaling.k8s.io/v1：定义了该资源配置所使用的API版本，这里是autoscaling.k8s.io组下的v1版本。
Kind: VerticalPodAutoscaler：定义了这个资源配置的类型是VerticalPodAutoscaler。
6-7. Metadata:：包含了对象的基本信息。

Creation Timestamp: 该VPA创建的时间戳。
Generation: VPA配置的版本号，每次更新VPA时都会递增。
Resource Version: 资源的版本号，用于内部缓存同步。
UID: 对象的唯一标识符。
8-22. Spec:：定义了VPA的行为和配置。
- Resource Policy:：定义了容器级别的资源策略。
- Container Policies:：开始容器策略列表。
- Container Name: nginx：定义了要应用此策略的容器名称。
- Max Allowed:：定义了容器可以请求的最大资源量。
- Cpu: 2000m：最大CPU资源为2000毫核。
- Memory: 2048Mi：最大内存资源为2048兆字节。
- Min Allowed:：定义了容器可以请求的最小资源量。
- Cpu: 250m：最小CPU资源为250毫核。
- Memory: 100Mi：最小内存资源为100兆字节。
- Target Ref:：定义了VPA应该应用到的目标资源引用。
- API Version: apps/v1：目标资源的API版本。
- Kind: Deployment：目标资源的类型。
- Name: nginx：目标资源的名字。
- Update Policy:：定义了VPA更新策略。
- Update Mode: Off：设置VPA的更新模式为“关闭”。这意味着VPA将不会自动更新Pod的资源请求和限制。

23-44. Status:：显示VPA当前的状态和建议。
- Conditions:：表示VPA的条件状态。
- Last Transition Time:：最后一次状态变化的时间。
- Status:：当前条件的状态（True、False或Unknown）。
- Type:：条件的类型。
- Recommendation:：包含对Pod资源需求的推荐值。
- Container Recommendations:：针对特定容器的推荐值。
- Container Name:：容器名称。
- Lower Bound:：推荐的下限资源量。
- Target:：推荐的最优资源量。
- Uncapped Target:：如果没有上限约束，则为目标资源量。
- Upper Bound:：推荐的上限资源量。
~~~

#### 2.2.4.3 执行压测

~~~powershell
[root@k8s-master01 vpa]# kubectl get svc
NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1      <none>        443/TCP        9h
nginx        NodePort    10.110.33.44   <none>        80:30166/TCP   19m
[root@k8s-master01 vpa]# ab -c 1000 -n 1000000000 http://192.168.10.160:30166/
This is ApacheBench, Version 2.3 <$Revision: 1430300 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking 192.168.10.160 (be patient)
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl describe vpa nginx-vpa
Name:         nginx-vpa
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  autoscaling.k8s.io/v1
Kind:         VerticalPodAutoscaler
Metadata:
  Creation Timestamp:  2023-12-08T09:35:53Z
  Generation:          1
  Resource Version:    166392
  UID:                 bccb77de-13fa-4815-b24e-3a7d61783bc5
Spec:
  Resource Policy:
    Container Policies:
      Container Name:  nginx
      Max Allowed:
        Cpu:     2000m
        Memory:  2048Mi
      Min Allowed:
        Cpu:     250m
        Memory:  100Mi
  Target Ref:
    API Version:  apps/v1
    Kind:         Deployment
    Name:         nginx
  Update Policy:
    Update Mode:  Off
Status:
  Conditions:
    Last Transition Time:  2023-12-08T09:36:09Z
    Status:                True
    Type:                  RecommendationProvided
  Recommendation:
    Container Recommendations:
      Container Name:  nginx
      Lower Bound:
        Cpu:     250m
        Memory:  262144k
      Target:
        Cpu:     250m
        Memory:  262144k
      Uncapped Target:
        Cpu:     25m
        Memory:  262144k
      Upper Bound:
        Cpu:     731m
        Memory:  1566665776
Events:          <none>
~~~

> 由于使用updateMode: "Off"，所以没有更新pod

### 2.2.5 VPA应用案例  updateMode: "Auto"

>此模式当目前运行的pod的资源达不到VPA的推荐值，就会执行pod驱逐，重新部署新的足够资源的服务

#### 2.2.5.1 创建应用

~~~powershell
[root@k8s-master01 vpa]# vim 02-nginx.yaml
[root@k8s-master01 vpa]# cat 02-nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          requests:
            cpu: 100m
            memory: 50Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: default
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: nginx
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl apply -f 02-nginx.yaml
deployment.apps/nginx created
service/nginx created
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl get pods
NAME                     READY   STATUS    RESTARTS   AGE
nginx-74cb8569c9-69zmr   1/1     Running   0          34s
nginx-74cb8569c9-q4cds   1/1     Running   0          34s
~~~

#### 2.2.5.2 创建vpa

~~~powershell
[root@k8s-master01 vpa]# vim nginx-vpa.yaml
[root@k8s-master01 vpa]# cat nginx-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: nginx-vpa-auto
  namespace: default
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: nginx
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: "nginx"
      minAllowed:
        cpu: "250m"
        memory: "100Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "2048Mi"
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl apply -f nginx-vpa.yaml
verticalpodautoscaler.autoscaling.k8s.io/nginx-vpa-auto created
[root@k8s-master01 vpa]# kubectl get vpa
NAME             MODE   CPU   MEM   PROVIDED   AGE
nginx-vpa-auto   Auto                          5s

[root@k8s-master01 vpa]# kubectl get vpa
NAME             MODE   CPU    MEM       PROVIDED   AGE
nginx-vpa-auto   Auto   250m   262144k   True       59s
~~~

#### 2.2.5.3 执行压测

~~~powershell
[root@k8s-master01 vpa]# kubectl get svc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP        9h
nginx        NodePort    10.101.42.161   <none>        80:32557/TCP   4m41s
[root@k8s-master01 vpa]# ab -c 1000 -n 1000000000 http://192.168.10.160:32557/
This is ApacheBench, Version 2.3 <$Revision: 1430300 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl describe vpa nginx-vpa-auto
Name:         nginx-vpa-auto
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  autoscaling.k8s.io/v1
Kind:         VerticalPodAutoscaler
Metadata:
  Creation Timestamp:  2023-12-08T10:31:32Z
  Generation:          1
  Resource Version:    181179
  UID:                 c7098ee6-d05d-45d8-9dc7-8a60e48f7ff4
Spec:
  Resource Policy:
    Container Policies:
      Container Name:  nginx
      Max Allowed:
        Cpu:     2000m
        Memory:  2048Mi
      Min Allowed:
        Cpu:     250m
        Memory:  100Mi
  Target Ref:
    API Version:  apps/v1
    Kind:         Deployment
    Name:         nginx
  Update Policy:
    Update Mode:  Auto
Status:
  Conditions:
    Last Transition Time:  2023-12-08T10:32:09Z
    Status:                True
    Type:                  RecommendationProvided
  Recommendation:
    Container Recommendations:
      Container Name:  nginx
      Lower Bound:
        Cpu:     250m
        Memory:  262144k
      Target:
        Cpu:     250m
        Memory:  262144k
      Uncapped Target:
        Cpu:     25m
        Memory:  262144k
      Upper Bound:
        Cpu:     250m
        Memory:  515574956
Events:          <none>
~~~

~~~powershell
[root@k8s-master01 vpa]# kubectl get event
LAST SEEN   TYPE     REASON                    OBJECT                        MESSAGE
83s         Normal   NodeHasSufficientMemory   node/k8s-master01             Node k8s-master01 status is now: NodeHasSufficientMemory
83s         Normal   NodeHasNoDiskPressure     node/k8s-master01             Node k8s-master01 status is now: NodeHasNoDiskPressure
83s         Normal   NodeHasSufficientPID      node/k8s-master01             Node k8s-master01 status is now: NodeHasSufficientPID
83s         Normal   NodeReady                 node/k8s-master01             Node k8s-master01 status is now: NodeReady
50m         Normal   NodeNotReady              node/k8s-master01             Node k8s-master01 status is now: NodeNotReady
49m         Normal   RegisteredNode            node/k8s-master01             Node k8s-master01 event: Registered Node k8s-master01 in Controller
94s         Normal   NodeNotReady              node/k8s-master01             Node k8s-master01 status is now: NodeNotReady
49m         Normal   RegisteredNode            node/k8s-master02             Node k8s-master02 event: Registered Node k8s-master02 in Controller
49m         Normal   RegisteredNode            node/k8s-master03             Node k8s-master03 event: Registered Node k8s-master03 in Controller
49m         Normal   RegisteredNode            node/k8s-worker01             Node k8s-worker01 event: Registered Node k8s-worker01 in Controller
49m         Normal   RegisteredNode            node/k8s-worker02             Node k8s-worker02 event: Registered Node k8s-worker02 in Controller
7m48s       Normal   Scheduled                 pod/nginx-74cb8569c9-69zmr    Successfully assigned default/nginx-74cb8569c9-69zmr to k8s-worker02
7m48s       Normal   Pulling                   pod/nginx-74cb8569c9-69zmr    Pulling image "nginx:latest"
7m44s       Normal   Pulled                    pod/nginx-74cb8569c9-69zmr    Successfully pulled image "nginx:latest" in 3.452s (3.452s including waiting)
7m44s       Normal   Created                   pod/nginx-74cb8569c9-69zmr    Created container nginx
7m44s       Normal   Started                   pod/nginx-74cb8569c9-69zmr    Started container nginx
3m51s       Normal   Killing                   pod/nginx-74cb8569c9-69zmr    Stopping container nginx
3m51s       Normal   EvictedByVPA              pod/nginx-74cb8569c9-69zmr    Pod was evicted by VPA Updater to apply resource recommendation.
2m50s       Normal   Scheduled                 pod/nginx-74cb8569c9-fv9cj    Successfully assigned default/nginx-74cb8569c9-fv9cj to k8s-worker01
2m50s       Normal   Pulling                   pod/nginx-74cb8569c9-fv9cj    Pulling image "nginx:latest"
2m46s       Normal   Pulled                    pod/nginx-74cb8569c9-fv9cj    Successfully pulled image "nginx:latest" in 3.312s (3.312s including waiting)
2m46s       Normal   Created                   pod/nginx-74cb8569c9-fv9cj    Created container nginx
2m46s       Normal   Started                   pod/nginx-74cb8569c9-fv9cj    Started container nginx
7m48s       Normal   Scheduled                 pod/nginx-74cb8569c9-q4cds    Successfully assigned default/nginx-74cb8569c9-q4cds to k8s-worker01
7m48s       Normal   Pulling                   pod/nginx-74cb8569c9-q4cds    Pulling image "nginx:latest"
7m45s       Normal   Pulled                    pod/nginx-74cb8569c9-q4cds    Successfully pulled image "nginx:latest" in 3.25s (3.25s including waiting)
7m45s       Normal   Created                   pod/nginx-74cb8569c9-q4cds    Created container nginx
7m45s       Normal   Started                   pod/nginx-74cb8569c9-q4cds    Started container nginx
2m51s       Normal   EvictedByVPA              pod/nginx-74cb8569c9-q4cds    Pod was evicted by VPA Updater to apply resource recommendation.
2m51s       Normal   Killing                   pod/nginx-74cb8569c9-q4cds    Stopping container nginx
3m50s       Normal   Scheduled                 pod/nginx-74cb8569c9-z6xl4    Successfully assigned default/nginx-74cb8569c9-z6xl4 to k8s-worker02
3m49s       Normal   Pulling                   pod/nginx-74cb8569c9-z6xl4    Pulling image "nginx:latest"
3m46s       Normal   Pulled                    pod/nginx-74cb8569c9-z6xl4    Successfully pulled image "nginx:latest" in 3.396s (3.396s including waiting)
3m46s       Normal   Created                   pod/nginx-74cb8569c9-z6xl4    Created container nginx
3m46s       Normal   Started                   pod/nginx-74cb8569c9-z6xl4    Started container nginx
7m49s       Normal   SuccessfulCreate          replicaset/nginx-74cb8569c9   Created pod: nginx-74cb8569c9-q4cds
7m48s       Normal   SuccessfulCreate          replicaset/nginx-74cb8569c9   Created pod: nginx-74cb8569c9-69zmr
3m50s       Normal   SuccessfulCreate          replicaset/nginx-74cb8569c9   Created pod: nginx-74cb8569c9-z6xl4
2m50s       Normal   SuccessfulCreate          replicaset/nginx-74cb8569c9   Created pod: nginx-74cb8569c9-fv9cj
9m12s       Normal   Killing                   pod/nginx-f9f76bb6f-fcsh5     Stopping container nginx
9m12s       Normal   Killing                   pod/nginx-f9f76bb6f-lspmv     Stopping container nginx
7m49s       Normal   ScalingReplicaSet         deployment/nginx              Scaled up replica set nginx-74cb8569c9 to 2
~~~

从输出信息可以了解到，vpa执行了EvictedByVPA，自动停掉了nginx，然后使用 VPA推荐的资源启动了新的nginx，我们查看下nginx的pod可以得到确认

~~~powershell
[root@k8s-master01 vpa]# kubectl describe pods nginx-74cb8569c9-fv9cj
Name:             nginx-74cb8569c9-fv9cj
Namespace:        default
Priority:         0
Service Account:  default
Node:             k8s-worker01/192.168.10.163
Start Time:       Fri, 08 Dec 2023 18:33:15 +0800
Labels:           app=nginx
                  pod-template-hash=74cb8569c9
Annotations:      cni.projectcalico.org/containerID: 1afb3c2cb4a5e948d3c37891bade58d41a7e095666d619fc2ae4a18387196d83
                  cni.projectcalico.org/podIP: 10.244.79.80/32
                  cni.projectcalico.org/podIPs: 10.244.79.80/32
                  vpaObservedContainers: nginx
                  vpaUpdates: Pod resources updated by nginx-vpa-auto: container 0: cpu request, memory request
Status:           Running
IP:               10.244.79.80
IPs:
  IP:           10.244.79.80
Controlled By:  ReplicaSet/nginx-74cb8569c9
Containers:
  nginx:
    Container ID:   docker://c9cd7b896d9e463c41218417cb80182ca7bf05f63949a85aca4e61cee4c0b5c4
    Image:          nginx:latest
    Image ID:       docker-pullable://nginx@sha256:10d1f5b58f74683ad34eb29287e07dab1e90f10af243f151bb50aa5dbb4d62ee
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Fri, 08 Dec 2023 18:33:19 +0800
    Ready:          True
    Restart Count:  0
    Requests:  重点在这里
      cpu:        250m
      memory:     262144k
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-rdnwr (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-rdnwr:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  5m32s  default-scheduler  Successfully assigned default/nginx-74cb8569c9-fv9cj to k8s-worker01
  Normal  Pulling    5m32s  kubelet            Pulling image "nginx:latest"
  Normal  Pulled     5m28s  kubelet            Successfully pulled image "nginx:latest" in 3.312s (3.312s including waiting)
  Normal  Created    5m28s  kubelet            Created container nginx
  Normal  Started    5m28s  kubelet            Started container nginx
~~~

随着服务的负载的变化，VPA的推荐值也会不断变化。当目前运行的pod的资源达不到VPA的推荐值，就会执行pod驱逐，重新部署新的足够资源的服务。

