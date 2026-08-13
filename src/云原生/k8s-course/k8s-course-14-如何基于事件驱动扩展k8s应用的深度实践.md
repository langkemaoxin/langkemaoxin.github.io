---
title: "如何基于事件驱动扩展K8S应用的深度实践？"
sidebarGroup: "K8s 课程笔记"
shortTitle: "14 如何基于事件驱动扩展K8S应用的深度实践？"
order: 14
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 课程笔记"
  - "云原生"
  - "课程笔记"
description: "如何基于事件驱动扩展K8S应用的深度实践？ 一、为什么我们需要自动扩展应用程序？ 作为 SRE运维工程师或DevOps工程师或机器学习工程师等等，需要保证应用的弹性和高可用性。因此，自动缩放是我们需要..."
---

> **K8s 课程笔记 · 第 14 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何基于事件驱动扩展K8S应用的深度实践？

# 一、为什么我们需要自动扩展应用程序？

作为 SRE运维工程师或DevOps工程师或机器学习工程师等等，需要保证应用的弹性和高可用性。因此，自动缩放是我们需要的必须功能。通过自动缩放，我们能确保工作负载能够高效的地处理业务流量。

# 二、KEDA是什么？

![image-20231211191222307](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231211191222307.png)

KEDA 是一个轻量级的开源 Kubernetes 事件驱动的自动缩放器，DevOps、SRE 和 Ops 团队使用它来根据外部事件或触发器水平扩展 Pod。KEDA 有助于扩展本机 Kubernetes 自动缩放解决方案的功能，这些解决方案依赖于标准资源指标，如 CPU 或内存。我们可以将 KEDA 部署到 Kubernetes 集群中，并使用自定义资源定义 （CRD） 管理 Pod 的扩展。

KEDA 基于 Kubernetes HPA 构建，根据来自 AWS SQS、Kafka、RabbitMQ 等事件源的信息扩展 Pod。这些事件源使用缩放程序进行监视，缩放程序根据为其设置的规则激活或停用部署。KEDA 缩放器还可以为特定事件源提供自定义指标，帮助 DevOps 团队观察与其相关的指标

我们唯一要做的就是通过选择要用于自动扩展应用程序的缩放器以及一些参数来配置 `ScaledObject` （KEDA CRD），KEDA 将完成剩下的工作：

- 监视事件源
- 创建和管理 `HPA` 生命周期

截至目前，有 62 个内置缩放器和 4 个外部缩放器可用。 KEDA 之所以好，是因为使用轻量级组件以及原生 Kubernetes 组件，例如 `HorizontalPodAutoscaler` ，更重要的是“即插即用”。

# 三、KEDA部署

![image-20231209201802706](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209201802706.png)

![image-20231209201827273](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209201827273.png)

![image-20231209202020123](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209202020123.png)

![image-20231209202124361](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209202124361.png)

~~~powershell
# wget https://get.helm.sh/helm-v3.13.2-linux-amd64.tar.gz
~~~

~~~powershell
# tar xf helm-v3.13.2-linux-amd64.tar.gz
~~~

~~~powershell
# mv linux-amd64/helm /usr/bin/
# helm version
version.BuildInfo{Version:"v3.13.2", GitCommit:"2a2fb3b98829f1e0be6fb18af2f6599e0f4e8243", GitTreeState:"clean", GoVersion:"go1.20.10"}
~~~

~~~powershell
# helm repo add kedacore https://kedacore.github.io/charts
~~~

~~~powershell
# helm repo list
NAME            URL
kedacore        https://kedacore.github.io/charts
~~~

~~~powershell
# helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "kedacore" chart repository
Update Complete. ⎈Happy Helming!⎈
~~~

~~~powershell
# helm install keda kedacore/keda --namespace keda --create-namespace
~~~

~~~powershell
输出内容：
NAME: keda
LAST DEPLOYED: Sat Dec  9 20:25:56 2023
NAMESPACE: keda
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
:::^.     .::::^:     :::::::::::::::    .:::::::::.                   .^.
7???~   .^7????~.     7??????????????.   :?????????77!^.              .7?7.
7???~  ^7???7~.       ~!!!!!!!!!!!!!!.   :????!!!!7????7~.           .7???7.
7???~^7????~.                            :????:    :~7???7.         :7?????7.
7???7????!.           ::::::::::::.      :????:      .7???!        :7??77???7.
7????????7:           7???????????~      :????:       :????:      :???7?5????7.
7????!~????^          !77777777777^      :????:       :????:     ^???7?#P7????7.
7???~  ^????~                            :????:      :7???!     ^???7J#@J7?????7.
7???~   :7???!.                          :????:   .:~7???!.    ~???7Y&@#7777????7.
7???~    .7???7:      !!!!!!!!!!!!!!!    :????7!!77????7^     ~??775@@@GJJYJ?????7.
7???~     .!????^     7?????????????7.   :?????????7!~:      !????G@@@@@@@@5??????7:
::::.       :::::     :::::::::::::::    .::::::::..        .::::JGGGB@@@&7:::::::::
                                                                      ?@@#~
                                                                      P@B^
                                                                    :&G:
                                                                    !5.
                                                                    .Kubernetes Event-driven Autoscaling (KEDA) - Application autoscaling made simple.

Get started by deploying Scaled Objects to your cluster:
    - Information about Scaled Objects : https://keda.sh/docs/latest/concepts/
    - Samples: https://github.com/kedacore/samples

Get information about the deployed ScaledObjects:
  kubectl get scaledobject [--namespace <namespace>]

Get details about a deployed ScaledObject:
  kubectl describe scaledobject <scaled-object-name> [--namespace <namespace>]

Get information about the deployed ScaledObjects:
  kubectl get triggerauthentication [--namespace <namespace>]

Get details about a deployed ScaledObject:
  kubectl describe triggerauthentication <trigger-authentication-name> [--namespace <namespace>]

Get an overview of the Horizontal Pod Autoscalers (HPA) that KEDA is using behind the scenes:
  kubectl get hpa [--all-namespaces] [--namespace <namespace>]

Learn more about KEDA:
- Documentation: https://keda.sh/
- Support: https://keda.sh/support/
- File an issue: https://github.com/kedacore/keda/issues/new/choose
~~~

# 四、负载均衡器metallb部署

## 4.1 修改kube-proxy代理模式

~~~powershell
[root@k8s-master01 ~]# kubectl get configmap -n kube-system
NAME                                                   DATA   AGE
......
kube-proxy                                             2      35h
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl edit configmap kube-proxy -n kube-system
   ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: true 由原来的flase修改为true
      syncPeriod: 0s
      tcpFinTimeout: 0s
      tcpTimeout: 0s
      udpTimeout: 0s
    kind: KubeProxyConfiguration
    logging:
      flushFrequency: 0
      options:
        json:
          infoBufferSize: "0"
      verbosity: 0
    metricsBindAddress: ""
    mode: "ipvs" 默认为空，添加ipvs
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl rollout restart daemonset kube-proxy -n kube-system
~~~

## 4.2 metallb部署 

### 4.2.1 metallb部署

![image-20231013093528604](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013093528604.png)

![image-20231013093709673](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013093709673.png)

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

### 4.2.2 IP地址池准备

~~~powershell
[root@k8s-master01 ~]# vim ippool.yaml
[root@k8s-master01 ~]# cat ippool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.240-192.168.10.250
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f ippool.yaml
~~~

### 4.2.3 开启二层通告

~~~powershell
[root@k8s-master01 ~]# vim l2.yaml
[root@k8s-master01 ~]# cat l2.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f l2.yaml
~~~

# 五、服务代理ingress nginx部署

## 5.1 获取ingress nginx部署文件

![image-20231013094055365](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094055365.png)

![image-20231013094123408](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094123408.png)

![image-20231013094243973](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094243973.png)

![image-20231013094322906](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094322906.png)

![image-20231013094402166](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094402166.png)

~~~powershell
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

## 5.2 修改ingress nginx部署文件

~~~powershell
[root@k8s-master01 ~]# vim deploy.yaml
[root@k8s-master01 ~]# cat deploy.yaml
......
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.8.2
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  externalTrafficPolicy: Cluster 由Local修改为Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: http
    name: http
    port: 80
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  type: LoadBalancer 此处为LoadBalancer
......
~~~

## 5.3 部署ingress nginx

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f deploy.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get ns
NAME               STATUS   AGE
......
ingress-nginx      Active   10h
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.111.3.227     192.168.10.240   80:32757/TCP,443:31886/TCP   10h
ingress-nginx-controller-admission   ClusterIP      10.106.142.161   <none>           443/TCP                      10h
~~~

# 六、KEDA深度实践

## 6.1 基于Cron Scaler自动缩放Web应用

### 6.1.1 部署web应用

> 创建一个Golang Web应用程序

~~~powershell
# vim go-helloworld.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: go-helloworld
  name: go-helloworld
spec:
  selector:
    matchLabels:
      app: go-helloworld
  template:
    metadata:
      labels:
        app: go-helloworld
    spec:
      containers:
        - image: rg.fr-par.scw.cloud/novigrad/go-helloworld:0.1.0
          name: go-helloworld
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              memory: "128Mi"
              cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: go-helloworld
spec:
  selector:
    app: go-helloworld
  ports:
    - protocol: TCP
      port: 8080
      name: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: go-helloworld
spec:
  ingressClassName: nginx
  rules:
  - host: helloworld.kubemsb.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: go-helloworld
            port:
              number: 8080
~~~

~~~powershell
# kubectl apply -f go-helloworld.yaml
deployment.apps/go-helloworld created
service/go-helloworld created
ingress.networking.k8s.io/go-helloworld created
~~~

~~~powershell
# kubectl get pods
NAME                                  READY   STATUS    RESTARTS   AGE
go-helloworld-dc588544c-bdnlj         1/1     Running   0          5m16s
~~~

~~~powershell
# kubectl get svc
NAME            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
go-helloworld   ClusterIP   10.101.86.56    <none>        8080/TCP       5m46s
~~~

~~~powershell
# curl http://10.101.86.56:8080
Hello, world!
~~~

~~~powershell
# kubectl get ingress
NAME            CLASS   HOSTS                    ADDRESS          PORTS   AGE
go-helloworld   nginx   helloworld.kubemsb.com   192.168.10.240   80      6m53s
~~~

~~~powershell
# vim /etc/hosts

127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
......
192.168.10.240 hellworld.kubemsb.com
~~~

~~~powershell
# curl http://helloworld.kubemsb.com
Hello, world!
~~~

### 6.1.2 将KEDA配置为仅在工作时间自动扩展Web应用

如果，我们希望我们的应用程序仅在工作时间可用。至于为何有如此要求，下面是一些场景：

例如，在开发环境中，不一定需要保持应用程序24小时启动和运行。在云环境中，它可以为你节省大量成本，具体取决于用户实际环境的应用程序/计算实例的数量。 为了实现这一点，我们将使用KEDA的原生Cron scaler。由于 Cron scaler 支持 Linux 格式的 cron，它甚至允许我们在工作日扩展我们的应用程序 要配置 Cron scaler，我们将按如下方式使用 `[ScaledObject]` CRD：

~~~powershell
# vim cron-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: go-helloworld
spec:
  scaleTargetRef:
    name: go-helloworld
  triggers:
  - type: cron
    metadata:
      timezone: Asia/Shanghai
      start: 00 08 * * 1-5
      end: 00 18 * * 1-5
      desiredReplicas: "2"
~~~

`ScaledObject` 必须与应用程序位于同一命名空间中！让我们深入了解一下这个配置：

- `spec.scaleTargetRef` 是 Kubernetes Deployment/StatefulSet 或其他自定义资源的引用

- - `name` （必填）： Kubernetes 资源的名称
  - `kind` （可选）：Kubernetes 资源的种类，默认值为 `Deployment`

- `spec.triggers` 是用于激活目标资源缩放的触发器列表

- - `type` （必填）：缩放器名称
  - `metadata` （必需）：Cron 缩放器所需的配置参数，使用此配置，我的应用程序将在周一到周五的一周中每天的 08：00 到 18：00 之间启动并运行两个副本。

~~~powershell
# kubectl apply -f cron-scaledobject.yaml
scaledobject.keda.sh/go-helloworld created
~~~

~~~powershell
# kubectl get scaledobject
NAME                 SCALETARGETKIND      SCALETARGETNAME       MIN   MAX   TRIGGERS     AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED    AGE
go-helloworld        apps/v1.Deployment   go-helloworld                     cron                          True    False    Unknown    Unknown   97s
~~~

~~~powershell
# kubectl get deployment
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
go-helloworld         0/0     0            0           15m
nginx-with-exporter   1/1     1            1           5h13m

# kubectl get hpa
NAME                          REFERENCE                        TARGETS             MINPODS   MAXPODS   REPLICAS   AGE
keda-hpa-go-helloworld        Deployment/go-helloworld         <unknown>/1 (avg)   1         100       0          2m29s
~~~

~~~powershell
# curl http://helloworld.kubemsb.com
<html>
<head><title>503 Service Temporarily Unavailable</title></head>
<body>
<center><h1>503 Service Temporarily Unavailable</h1></center>
<hr><center>nginx</center>
</body>
</html>
~~~

~~~powershell
# date -s "2023-12-11 09:00:00"
~~~

~~~powershell
# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
go-helloworld-dc588544c-gvvtw   1/1     Running   0          4s
~~~

~~~powershell
# curl http://helloworld.kubemsb.com
Hello, world!
~~~

~~~powershell
# kubectl get hpa
NAME                          REFERENCE                        TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
keda-hpa-go-helloworld        Deployment/go-helloworld         500m/1 (avg)    1         100       2          12m
~~~

## 6.2 HTTP事件自动缩放Web应用

>使用 KEDA HTTP 外部缩放器

### 6.2.1 介绍

借助所有 KEDA 的缩放器，我们可以通过多种方式自动扩展 Web 应用程序，例如，基于 Redis、AMQP、kafka 队列中的消息进行缩放应用。

目前，我们了解了 KEDA 的工作原理。我下面们将探讨 KEDA 如何通过基于 HTTP 事件自动扩展应用程序来帮助我们处理流量高峰。为此，我们有两个选择：

- 使用Prometheus scaler
- 使用 KEDA HTTP 外部缩放器，它的工作方式类似于附加组件，本次我们将使用 KEDA HTTP 外部缩放器。

KEDA HTTP插件目前处于测试阶段。它主要由KEDA团队维护。

**KEDA HTTP scaler原理介绍**

KEDA HTTP scaler是构建在 KEDA 核心之上的附加组件，它拥有自己的组件：operator, scaler和 interceptor。下图可以帮助大家更好地理解它的工作原理：

![image-20231211191753782](/云原生/k8s-course/k8s-course-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231211191753782.png)

### 6.2.2 安装KEDA HTTP附加组件

由于这个缩放器不是内置的，我们必须手工安装。根据官方文档的说明，我们可以使用 Helm 来进行安装：

~~~powershell
# helm search repo keda-add-ons-http
NAME                            CHART VERSION   APP VERSION     DESCRIPTION
kedacore/keda-add-ons-http      0.6.0           0.6.0           Event-based autoscaler for HTTP workloads on Ku...
~~~

~~~powershell
# helm install http-add-on kedacore/keda-add-ons-http -n keda
~~~

~~~powershell
# helm list -n keda
NAME            NAMESPACE       REVISION        UPDATED                                 STATUS          CHART                   APP VERSION
http-add-on     keda            1               2023-12-10 21:58:17.904851753 +0800 CST deployed        keda-add-ons-http-0.6.0 0.6.0
~~~

~~~powershell
# kubectl get pods -n keda
NAME                                                    READY   STATUS    RESTARTS        AGE
keda-add-ons-http-controller-manager-6b584f75b9-6x5rd   2/2     Running   7 (4m31s ago)   10m
keda-add-ons-http-external-scaler-58b465cff7-7vvcq      1/1     Running   6 (5m32s ago)   10m
keda-add-ons-http-interceptor-59554f894f-nmk7w          1/1     Running   0               10m
keda-add-ons-http-interceptor-59554f894f-vgzl9          1/1     Running   0               10m
keda-add-ons-http-interceptor-59554f894f-whtxm          1/1     Running   0               10m
keda-admission-webhooks-68b4cfbb48-sq5cl                1/1     Running   3 (8h ago)      25h
keda-operator-647b44c8bb-t5fz6                          1/1     Running   0               36s
keda-operator-metrics-apiserver-5f945dc9f8-jwq8s        1/1     Running   3 (8h ago)      25h
~~~

~~~powershell
# kubectl get svc -n keda
NAME                                                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)             AGE
keda-add-ons-http-controller-manager-metrics-service   ClusterIP   10.102.27.184    <none>        8443/TCP            10m
keda-add-ons-http-external-scaler                      ClusterIP   10.106.244.204   <none>        9090/TCP,9091/TCP   10m
keda-add-ons-http-interceptor-admin                    ClusterIP   10.106.66.102    <none>        9090/TCP            10m
keda-add-ons-http-interceptor-proxy                    ClusterIP   10.108.88.122    <none>        8080/TCP            10m
keda-admission-webhooks                                ClusterIP   10.96.59.31      <none>        443/TCP             25h
keda-operator                                          ClusterIP   10.108.26.63     <none>        9666/TCP            25h
keda-operator-metrics-apiserver                        ClusterIP   10.110.71.211    <none>        443/TCP,8080/TCP    25h
~~~

### 6.2.3 创建Web应用配置 HTTPScaledObject

正如之前所说，KEDA HTTP 附加组件自带组件，包括操作符，这也意味着它自带 CRD。HTTPScaledObject 是由 KEDA HTTP 附加组件管理的 CRD。这就是我们在这里需要配置的。让我们为 Web 应用程序创建 HTTPScaledObject 资源： 

> ⚠️ `HTTPScaleObject` 必须在与 Web 应用相同的命名空间中创建资源！

~~~powershell
# kubectl delete -f cron-scaledobject.yaml
~~~

~~~powershell
# vim http-scaledobject.yaml
# cat http-scaledobject.yaml
kind: HTTPScaledObject
apiVersion: http.keda.sh/v1alpha1
metadata:
    name: go-helloworld
spec:
    host: "helloworld.kubemsb.com"
    targetPendingRequests: 10
    scaledownPeriod: 300
    scaleTargetRef:
        deployment: go-helloworld
        service: go-helloworld
        port: 8080
    replicas:
        min: 0
        max: 10
~~~

在这里，我们已经配置了我们的 `HTTPScaledObject` 应用程序，以便将我们的应用程序 `Deployment` 从 0 个副本扩展到 10 个副本。因为，如果拦截器上有 10 个请求处于挂起状态（应用程序尚未接收的请求），则 KEDA 将添加一个 pod。

### 6.2.4 修改Web应用程序的service和ingress

仔细观察一下上面的图，可以看到我们的 Web 应用程序 ingress 需要引用 KEDA HTTP 附加组件的拦截器服务，而不是 Web 应用程序的拦截器服务。由于 ingress 无法引用另一个命名空间中的服务，因此我们将在与 Web 应用相同的命名空间 `external` 中创建类型服务，该服务引用来自 keda 命名空间的拦截器服务：

~~~powershell
# vim go-helloworld.yaml
# cat go-helloworld.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: go-helloworld
  name: go-helloworld
spec:
  selector:
    matchLabels:
      app: go-helloworld
  template:
    metadata:
      labels:
        app: go-helloworld
    spec:
      containers:
        - image: rg.fr-par.scw.cloud/novigrad/go-helloworld:0.1.0
          name: go-helloworld
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              memory: "128Mi"
              cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: go-helloworld
spec:
  selector:
    app: go-helloworld
  ports:
    - protocol: TCP
      port: 8080
      name: http
---
kind: Service
apiVersion: v1
metadata:
  name: keda-add-ons-http-interceptor-proxy
spec:
  type: ExternalName
  externalName: keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: go-helloworld
spec:
  ingressClassName: nginx
  rules:
  - host: helloworld.kubemsb.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: keda-add-ons-http-interceptor-proxy
            port:
              number: 8080
~~~

>需要输入新服务的名称，但请注意端口，该端口也被拦截器的服务所取代

~~~powershell
# kubectl apply -f go-helloworld.yaml
deployment.apps/go-helloworld unchanged
service/go-helloworld unchanged
service/keda-add-ons-http-interceptor-proxy created
ingress.networking.k8s.io/go-helloworld configured
~~~

~~~powershell
# kubectl get svc
NAME                                  TYPE           CLUSTER-IP      EXTERNAL-IP                                                  PORT(S)        AGE
go-helloworld                         ClusterIP      10.101.86.56    <none>                                                       8080/TCP       59m
keda-add-ons-http-interceptor-proxy   ExternalName   <none>          keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local   <none>         26s
kubernetes                            ClusterIP      10.96.0.1       <none>                                                       443/TCP        2d1h
nginx                                 NodePort       10.111.233.35   <none>                                                       80:31839/TCP   5h57m

~~~

~~~powershell
# kubectl get ingress
NAME            CLASS   HOSTS                    ADDRESS          PORTS   AGE
go-helloworld   nginx   helloworld.kubemsb.com   192.168.10.240   80      59m
~~~

~~~powershell
# kubectl describe ingress go-helloworld
Name:             go-helloworld
Labels:           <none>
Namespace:        default
Address:          192.168.10.240
Ingress Class:    nginx
Default backend:  <default>
Rules:
  Host                    Path  Backends
  ----                    ----  --------
  helloworld.kubemsb.com
                          /   keda-add-ons-http-interceptor-proxy:8080 (<error: endpoints "keda-add-ons-http-interceptor-proxy" not found>)
Annotations:              <none>
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    92s (x3 over 60m)  nginx-ingress-controller  Scheduled for sync
~~~

~~~powershell
# curl http://helloworld.kubemsb.com/
Hello, world!
~~~

~~~powershell
# kubectl apply -f http-scaledobject.yaml
httpscaledobject.http.keda.sh/go-helloworld created
~~~

~~~powershell
# kubectl get httpscaledobject
NAME            SCALETARGETDEPLOYMENTNAME   SCALETARGETSERVICENAME                                                 SCALETARGETPORT   MINREPLICAS   MAXREPLICAS   AGE     ACTIVE
go-helloworld                               {"deployment":"go-helloworld","port":8080,"service":"go-helloworld"}                     0             10            5m47s
~~~

~~~powershell
# kubectl get hpa
NAME                                     REFERENCE                                  TARGETS       MINPODS   MAXPODS   REPLICAS   AGE
keda-hpa-keda-add-ons-http-interceptor   Deployment/keda-add-ons-http-interceptor   0/200 (avg)   3         50        3          10h
~~~

~~~powershell
访问时属于冷启动
# curl http://helloworld.kubemsb.com
Hello, world!
~~~

~~~powershell
# yum -y install httpd-tools
~~~

~~~powershell
# ab -c 1000 -n 100000000 http://helloworld.kubemsb.com/
~~~

~~~powershell
# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
go-helloworld-dc588544c-5wnxw   1/1     Running   0          50s
go-helloworld-dc588544c-8xpgp   1/1     Running   0          50s
go-helloworld-dc588544c-db6qt   1/1     Running   0          35s
go-helloworld-dc588544c-frqgz   1/1     Running   0          5m11s
go-helloworld-dc588544c-gwll9   1/1     Running   0          65s
go-helloworld-dc588544c-m55j4   1/1     Running   0          35s
go-helloworld-dc588544c-qcmmc   1/1     Running   0          65s
go-helloworld-dc588544c-r2dsr   1/1     Running   0          65s
go-helloworld-dc588544c-xcg9w   1/1     Running   0          50s
go-helloworld-dc588544c-zdngm   1/1     Running   0          50s
~~~

# 七、使用k6实现压力测试

## 7.1 k6安装

>https://k6.io/docs/get-started/installation/

~~~powershell
# yum -y install  https://dl.k6.io/rpm/repo.rpm
~~~

~~~powershell
# vim /etc/yum.repos.d/k6-io.repo
# cat /etc/yum.repos.d/k6-io.repo
[k6]
name=k6
baseurl=https://dl.k6.io/rpm/$basearch
enabled=1
gpgcheck=0 由1修改为0
repo_gpgcheck=0
metadata_expire=1d
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-k6-io
~~~

~~~powershell
# yum -y install k6
~~~

~~~powershell
# k6 --help

          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

Usage:
  k6 [command]

Available Commands:
  archive     Create an archive
  cloud       Run a test on the cloud
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command
  inspect     Inspect a script or archive
  login       Authenticate with a service
  new         Create and initialize a new k6 script
  pause       Pause a running test
  resume      Resume a paused test
  run         Start a test
  scale       Scale a running test
  stats       Show test metrics
  status      Show test status
  version     Show application version
~~~

## 7.2 编写k6测试脚本

~~~powershell
# mkdir k6
# cd k6
~~~

~~~powershell
# vim script.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s', // 100 iterations per second, i.e. 100 RPS
      duration: '30s',
      preAllocatedVUs: 50, // how large the initial pool of VUs would be
      maxVUs: 50, // if the preAllocatedVUs are not enough, we can initialize more
    },
  },
};

export function test(url) {
  const res = http.get(url);
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
}

export default function () {
  test('http://helloworld.kubemsb.com');
}
~~~

~~~powershell
说明：
这段脚本是使用 K6 编写的。K6 是一个开源的负载测试工具，用于测试 Web 应用程序、API 和微服务的性能和稳定性。该脚本使用了 JavaScript 语言，并利用了 K6 提供的 http 和 check 函数来进行 HTTP 请求和响应检查。

在这个脚本中：

导入了 check 和 http 模块。
定义了一个名为 options 的常量，其中包含了关于场景（scenarios）的信息，如执行器（executor）、速率（rate）、时间单位（timeUnit）、持续时间（duration）、预分配的虚拟用户（preAllocatedVUs）和最大虚拟用户数（maxVUs）。
定义了一个名为 test 的函数，它发送一个 GET 请求并检查响应状态是否为 200。
在默认导出的函数中调用了 test 函数。

这个脚本的主要目的是模拟一定的请求率（RPS），向指定的 URL 发送 GET 请求，并确保服务器返回的状态码为 200。
现在，当运行这个脚本时，K6 将向 http://helloworld.kubemsb.com 发送 GET 请求，并检查响应状态码是否为 200。如果你想测试不同的 URL，请直接在 test() 函数调用中更改地址即可。
~~~

~~~powershell
# k6 run script.js

          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: script.js
     output: -

  scenarios: (100.00%) 1 scenario, 50 max VUs, 1m0s max duration (incl. graceful stop):
           * constant_request_rate: 100.00 iterations/s for 30s (maxVUs: 50, gracefulStop: 30s)

WARN[0000] Insufficient VUs, reached 50 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=constant_request_rate

     ✓ is status 200

     checks.........................: 100.00% ✓ 2735      ✗ 0
     data_received..................: 506 kB  17 kB/s
     data_sent......................: 241 kB  8.0 kB/s
     dropped_iterations.............: 266     8.866083/s
     http_req_blocked...............: avg=12.24µs min=993ns    med=3.4µs   max=1.31ms  p(90)=5.3µs   p(95)=7.24µs
     http_req_connecting............: avg=7.32µs  min=0s       med=0s      max=1.23ms  p(90)=0s      p(95)=0s
     http_req_duration..............: avg=57.43ms min=910.53µs med=1.44ms  max=3.21s   p(90)=2.57ms  p(95)=7.59ms
       { expected_response:true }...: avg=57.43ms min=910.53µs med=1.44ms  max=3.21s   p(90)=2.57ms  p(95)=7.59ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 2735
     http_req_receiving.............: avg=79.72µs min=9.31µs   med=60.79µs max=31.53ms p(90)=97.23µs p(95)=118.08µs
     http_req_sending...............: avg=27.89µs min=3.93µs   med=24.65µs max=2.12ms  p(90)=38.71µs p(95)=45.95µs
     http_req_tls_handshaking.......: avg=0s      min=0s       med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=57.32ms min=843.21µs med=1.35ms  max=3.21s   p(90)=2.43ms  p(95)=7.38ms
     http_reqs......................: 2735    91.160664/s
     iteration_duration.............: avg=57.59ms min=1ms      med=1.58ms  max=3.21s   p(90)=2.74ms  p(95)=8.16ms
     iterations.....................: 2735    91.160664/s
     vus............................: 0       min=0       max=50
     vus_max........................: 50      min=50      max=50

running (0m30.0s), 00/50 VUs, 2735 complete and 0 interrupted iterations
constant_request_rate ✓ [======================================] 00/50 VUs  30s  100.00 iters/s
~~~

~~~powershell
说明：
下面是对输出的逐行解释：

1. `scenarios: (100.00%) 1 scenario, 50 max VUs, 1m0s max duration (incl. graceful stop):` 这一行显示了测试中定义的场景数量、最大虚拟用户（VUs）数和最长持续时间（包括优雅停止）。你需要注意场景的数量、最大 VUs 数以及最大持续时间是否符合你的测试需求。
2. `WARN[0000] Insufficient VUs, reached 50 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=constant_request_rate` 这是一个警告，表示已经达到了最大 VUs 数量，并且不能再初始化更多。你需要关注是否有足够的 VUs 来模拟实际的负载情况。
3. `     ✓ is status 200` 这一行表明所有请求都返回了 HTTP 状态码 200，这是一个成功的响应。
4. 接下来的几行显示了各种指标的统计信息，如数据接收和发送、迭代次数、丢弃的迭代次数等。这些指标可以帮助你了解系统在负载测试中的表现。
5. `http_req_blocked`, `http_req_connecting`, `http_req_duration`, `http_req_receiving`, `http_req_sending`, `http_req_tls_handshaking`, 和 `http_req_waiting` 是 HTTP 请求相关的指标，它们分别表示请求阻塞、连接建立、请求总耗时、接收响应、发送请求、TLS 握手和等待服务器响应的时间。你应该关注这些指标的平均值、中位数、最大值和分位数，以确保系统的性能在可接受范围内。
6. `http_req_failed` 表示失败的 HTTP 请求百分比。如果这个值不为零，说明有一些请求没有成功完成。
7. `http_reqs` 和 `iterations` 显示了已完成的 HTTP 请求和迭代次数。你可以通过这些数字来判断测试是否按照预期进行。
8. `vus` 和 `vus_max` 显示当前活动的虚拟用户数和最大虚拟用户数。如果你看到 `vus` 的值总是低于 `vus_max`，可能意味着系统无法处理更高的负载。

总结来说，你应该重点关注以下几点：
* 警告和错误消息
* 各种指标的平均值、中位数、最大值和分位数
* 失败的 HTTP 请求百分比
* 完成的 HTTP 请求和迭代次数
* 活动的虚拟用户数与最大虚拟用户数
~~~

~~~powershell
关于HTTP 请求的等待时间（http_req_waiting）的相关统计信息。下面是对各个指标的解释：

avg：平均值，表示所有请求的等待时间的平均值为 57.32 毫秒。
min：最小值，表示最短的请求等待时间为 843.21 微秒（0.843 毫秒）。
med：中位数，表示有一半的请求等待时间低于 1.35 毫秒，另一半高于这个值。
max：最大值，表示最长的请求等待时间为 3.21 秒。
p(90)：第 90 个百分位数，表示有 90% 的请求等待时间低于 2.43 毫秒。
p(95)：第 95 个百分位数，表示有 95% 的请求等待时间低于 7.38 毫秒。
~~~

**实时查看拦截器队列中有多少请求**

~~~powershell
打开第二个终端，执行以下命令：
#  kubectl proxy
~~~

~~~powershell
打开第三个终端，执行以下命令：
# watch -n '1' curl --silent localhost:8001/api/v1/namespaces/keda/services/keda-add-ons-http-interceptor-admin:9090/proxy/queue
{"default/go-helloworld":0}
~~~

**上面的脚本在执行后，我们发现并没有实现更多的自动水平伸缩，只有一个pod在运行。原因是在 100 RPS 测试中，因为拦截器队列中的挂起请求数不超过 1。**

**下面我们修改script.js脚本中rate值为1000，我们在HTTPScaledObject中targetPendingRequests值配置为 10，所以我们再来看看会发生什么**

~~~powershell
# vim script.js
# cat script.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s', // 100 iterations per second, i.e. 100 RPS
      duration: '30s',
      preAllocatedVUs: 50, // how large the initial pool of VUs would be
      maxVUs: 50, // if the preAllocatedVUs are not enough, we can initialize more
    },
  },
};

export function test(url) {
  const res = http.get(url);
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
}

export default function () {
  test('http://helloworld.kubemsb.com');
}
~~~

> 修改rate值为1000

~~~powershell
# k6 run script.js

          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: script.js
     output: -

  scenarios: (100.00%) 1 scenario, 50 max VUs, 1m0s max duration (incl. graceful stop):
           * constant_request_rate: 1000.00 iterations/s for 30s (maxVUs: 50, gracefulStop: 30s)

WARN[0000] Insufficient VUs, reached 50 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=constant_request_rate

     ✗ is status 200
      ↳  99% — ✓ 19483 / ✗ 186

     checks.........................: 99.05% ✓ 19483      ✗ 186
     data_received..................: 3.6 MB 121 kB/s
     data_sent......................: 1.7 MB 58 kB/s
     dropped_iterations.............: 10332  344.318643/s
     http_req_blocked...............: avg=5.72µs  min=625ns    med=2.78µs  max=4.24ms  p(90)=4.91µs  p(95)=6.21µs
     http_req_connecting............: avg=1.52µs  min=0s       med=0s      max=4.21ms  p(90)=0s      p(95)=0s
     http_req_duration..............: avg=41.43ms min=595.35µs med=3.2ms   max=3.14s   p(90)=95.21ms p(95)=163.95ms
       { expected_response:true }...: avg=36.76ms min=595.35µs med=3.17ms  max=3.14s   p(90)=92.42ms p(95)=139.49ms
     http_req_failed................: 0.94%  ✓ 186        ✗ 19483
     http_req_receiving.............: avg=62.95µs min=7.22µs   med=35.75µs max=31.92ms p(90)=91.4µs  p(95)=141.93µs
     http_req_sending...............: avg=28.28µs min=2.64µs   med=10.82µs max=28.54ms p(90)=31.52µs p(95)=53.44µs
     http_req_tls_handshaking.......: avg=0s      min=0s       med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=41.34ms min=547.41µs med=3.13ms  max=3.14s   p(90)=95.05ms p(95)=163.88ms
     http_reqs......................: 19669  655.478454/s
     iteration_duration.............: avg=41.55ms min=648.14µs med=3.31ms  max=3.14s   p(90)=95.39ms p(95)=164ms
     iterations.....................: 19669  655.478454/s
     vus............................: 5      min=2        max=50
     vus_max........................: 50     min=50       max=50

running (0m30.0s), 00/50 VUs, 19669 complete and 0 interrupted iterations
constant_request_rate ✓ [======================================] 00/50 VUs  30s  1000.00 iters/s
~~~

~~~powershell
在第三个终端，执行以下命令：
# watch -n '1' curl --silent localhost:8001/api/v1/namespaces/keda/services/keda-add-ons-http-interceptor-admin:9090/proxy/queue
{"default/go-helloworld":17}
这里面的数值是一个动态数值，一直在变化。
~~~

**可以看到应用进行了水平伸缩，创建了更多的pod，用于响应用户的请求**

~~~powershell
# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
go-helloworld-dc588544c-4qdms   1/1     Running   0          84s
go-helloworld-dc588544c-74h5b   1/1     Running   0          69s
go-helloworld-dc588544c-dg2zn   1/1     Running   0          84s
go-helloworld-dc588544c-jf9w2   1/1     Running   0          96s
go-helloworld-dc588544c-vjn7d   1/1     Running   0          84s
~~~

**应用程序从 0 个副本扩展到 5 个副本;直到 Web 应用程序的挂起请求数少于 10。**

~~~powershell
# kubectl get deployment.apps -w
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
go-helloworld   0/0     0            0           175m
go-helloworld   0/1     0            0           175m
go-helloworld   0/1     0            0           175m
go-helloworld   0/1     0            0           175m
go-helloworld   0/1     1            0           175m
go-helloworld   0/4     1            0           175m
go-helloworld   0/4     1            0           175m
go-helloworld   0/4     1            0           175m
go-helloworld   0/4     4            0           175m
go-helloworld   1/4     4            1           175m
go-helloworld   2/4     4            2           175m
go-helloworld   3/4     4            3           175m
go-helloworld   4/4     4            4           175m
go-helloworld   4/5     4            4           176m
go-helloworld   4/5     4            4           176m
go-helloworld   4/5     4            4           176m
go-helloworld   4/5     5            4           176m
go-helloworld   5/5     5            5           176m
~~~

~~~powershell
# kubectl get deployment.apps -w
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
go-helloworld   0/0     0            0           175m
go-helloworld   0/1     0            0           175m
go-helloworld   0/1     0            0           175m
go-helloworld   0/1     0            0           175m
go-helloworld   0/1     1            0           175m
go-helloworld   0/4     1            0           175m
go-helloworld   0/4     1            0           175m
go-helloworld   0/4     1            0           175m
go-helloworld   0/4     4            0           175m
go-helloworld   1/4     4            1           175m
go-helloworld   2/4     4            2           175m
go-helloworld   3/4     4            3           175m
go-helloworld   4/4     4            4           175m
go-helloworld   4/5     4            4           176m
go-helloworld   4/5     4            4           176m
go-helloworld   4/5     4            4           176m
go-helloworld   4/5     5            4           176m
go-helloworld   5/5     5            5           176m
go-helloworld   5/1     5            5           3h
go-helloworld   5/1     5            5           3h
go-helloworld   1/1     1            1           3h
go-helloworld   1/0     1            1           3h1m
go-helloworld   1/0     1            1           3h1m
go-helloworld   0/0     0            0           3h1m
~~~

