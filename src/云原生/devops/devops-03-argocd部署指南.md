---
title: argocd部署指南
sidebarGroup: DevOps / GitOps
shortTitle: 03 argocd部署指南
order: 3
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - 课程笔记
description: 'Argo CD部署指南 一、负载均衡器Metallb部署 1.1 修改kube-proxy代理模式 ~~~powershell [root@k8s-master01 ~] kubectl get co...'
---

> **DevOps / GitOps · 第 3 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Argo CD部署指南

# 一、负载均衡器Metallb部署

## 1.1 修改kube-proxy代理模式

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

## 1.2 metallb部署 

### 1.2.1 metallb部署

![image-20231013093528604](/云原生/devops/devops-03-argocd部署指南/image-20231013093528604.png)

![image-20231013093709673](/云原生/devops/devops-03-argocd部署指南/image-20231013093709673.png)

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

### 1.2.2 IP地址池准备

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

### 1.2.3 开启二层通告

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

# 二、服务代理Ingress nginx部署

## 2.1 获取ingress nginx部署文件

![image-20231013094055365](/云原生/devops/devops-03-argocd部署指南/image-20231013094055365.png)

![image-20231013094123408](/云原生/devops/devops-03-argocd部署指南/image-20231013094123408.png)

![image-20231013094243973](/云原生/devops/devops-03-argocd部署指南/image-20231013094243973.png)

![image-20231013094322906](/云原生/devops/devops-03-argocd部署指南/image-20231013094322906.png)

![image-20231013094402166](/云原生/devops/devops-03-argocd部署指南/image-20231013094402166.png)

~~~powershell
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

## 2.2 修改ingress nginx部署文件

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

## 2.3 部署ingress nginx

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

# 三、argocd部署

Argo(https://argoproj.github.io/projects/argo) 项目是一组 Kubernetes 原生工具集合，用于运行和管理 Kubernetes 上的作业和应用程序。Argo 提供了一种在 Kubernetes 上创建工作和应用程序的三种计算模式 – 服务模式、工作流模式和基于事件的模式 。所有的 Argo 工具都实现为控制器和自定义资源。

Argo CD 是一个为 Kubernetes 而生的，遵循声明式 GitOps 理念的持续部署工具。Argo CD 可在 Git 存储库更改时自动同步和部署应用程序。

Argo CD 遵循 GitOps 模式，使用 Git 仓库作为定义所需应用程序状态的真实来源，Argo CD 支持多种 Kubernetes 清单：

- kustomize
- helm charts
- ksonnet applications
- jsonnet files
- Plain directory of YAML/json manifests
- Any custom config management tool configured as a config management plugin
  Argo CD 可在指定的目标环境中自动部署所需的应用程序状态，应用程序部署可以在 Git 提交时跟踪对分支、标签的更新，或固定到清单的指定版本。

![img](/云原生/devops/devops-03-argocd部署指南/e2eaa6844067ca1a12c2385932dd17cb9d85c6.jpg)

Argo CD 是通过 Kubernetes 控制器来实现的，它持续 watch 正在运行的应用程序并将当前的实时状态与所需的目标状态（ Git 存储库中指定的）进行比较。已经部署的应用程序的实际状态与目标状态有差异，则被认为是 OutOfSync 状态，Argo CD 会报告显示这些差异，同时提供工具来自动或手动将状态同步到期望的目标状态。在 Git 仓库中对期望目标状态所做的任何修改都可以自动应用反馈到指定的目标环境中去。

**下面简单介绍下 Argo CD 中的几个主要组件：**

API 服务：API 服务是一个 gRPC/REST 服务，它暴露了 Web UI、CLI 和 CI/CD 系统使用的接口，主要有以下几个功能：

- 应用程序管理和状态报告
- 执行应用程序操作（例如同步、回滚、用户定义的操作）
- 存储仓库和集群凭据管理（存储为 K8s Secrets 对象）
- 认证和授权给外部身份提供者
- RBAC
- Git webhook 事件的侦听器/转发器

**仓库服务：**存储仓库服务是一个内部服务，负责维护保存应用程序清单 Git 仓库的本地缓存。当提供以下输入时，它负责生成并返回 Kubernetes 清单：

- 存储 URL

- revision 版本（commit、tag、branch）

- 应用路径

- 模板配置：参数、ksonnet 环境、helm values.yaml 等

**应用控制器：**应用控制器是一个 Kubernetes 控制器，它持续 watch 正在运行的应用程序并将当前的实时状态与所期望的目标状态（repo 中指定的）进行比较。它检测应用程序的 OutOfSync 状态，并采取一些措施来同步状态，它负责调用任何用户定义的生命周期事件的钩子（PreSync、Sync、PostSync）。

## 3.1 部署文件获取及部署

![image-20231116200757732](/云原生/devops/devops-03-argocd部署指南/image-20231116200757732.png)

![image-20231116200825447](/云原生/devops/devops-03-argocd部署指南/image-20231116200825447.png)

![image-20231116200921901](/云原生/devops/devops-03-argocd部署指南/image-20231116200921901.png)

![image-20231116201025231](/云原生/devops/devops-03-argocd部署指南/image-20231116201025231.png)

~~~powershell
[root@k8s-master01 ~]# kubectl create namespace argocd
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f  https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.1/manifests/install.yaml
~~~

或

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.1/manifests/ha/install.yaml -n argocd
~~~

## 3.2 验证部署情况

### 3.2.1 非高可用

~~~powershell
[root@k8s-master01 ~]# # kubectl get pods -n argocd
NAME                                               READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                    1/1     Running   0          33m
argocd-applicationset-controller-557c5d657-vctpc   1/1     Running   0          33m
argocd-dex-server-7c949db6c-d7mfs                  1/1     Running   0          33m
argocd-notifications-controller-6f89f56766-kcffm   1/1     Running   0          33m
argocd-redis-7d8d46cc7f-9f7rv                      1/1     Running   0          33m
argocd-repo-server-75dc4d6bdc-fmq9g                1/1     Running   0          33m
argocd-server-54cbdc6479-srjpk                     1/1     Running   0          33m
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get service -n argocd
NAME                                      TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                      AGE
argocd-applicationset-controller          ClusterIP      10.233.8.224    <none>           7000/TCP,8080/TCP            165m
argocd-dex-server                         ClusterIP      10.233.41.197   <none>           5556/TCP,5557/TCP,5558/TCP   165m
argocd-metrics                            ClusterIP      10.233.52.244   <none>           8082/TCP                     165m
argocd-notifications-controller-metrics   ClusterIP      10.233.46.0     <none>           9001/TCP                     165m
argocd-redis                              ClusterIP      10.233.44.202   <none>           6379/TCP                     165m
argocd-repo-server                        ClusterIP      10.233.15.73    <none>           8081/TCP,8084/TCP            165m
argocd-server                             LoadBalancer   10.233.1.213    <none>   80:30712/TCP,443:30564/TCP   165m
argocd-server-metrics                     ClusterIP      10.233.12.147   <none>           8083/TCP                     165m
~~~

### 3.2.2 高可用

~~~powershell
[root@k8s-master01 ~]# kubectl get pod -n argocd
NAME                                               READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                    1/1     Running   0          77s
argocd-applicationset-controller-557c5d657-szttl   1/1     Running   0          80s
argocd-dex-server-7c949db6c-lqq7v                  1/1     Running   0          80s
argocd-notifications-controller-6f89f56766-295kd   1/1     Running   0          79s
argocd-redis-ha-haproxy-9cc45446d-crxwf            1/1     Running   0          79s
argocd-redis-ha-haproxy-9cc45446d-g89j8            1/1     Running   0          79s
argocd-redis-ha-haproxy-9cc45446d-gpdrw            0/1     Pending   0          79s
argocd-redis-ha-server-0                           1/3     Running   0          76s
argocd-repo-server-5789b867c7-5v52d                0/1     Running   0          78s
argocd-repo-server-5789b867c7-l2wx8                1/1     Running   0          78s
argocd-server-5c75fb4dd8-fwv55                     1/1     Running   0          77s
argocd-server-5c75fb4dd8-mbxv5                     1/1     Running   0          77s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl taint nodes --all node-role.kubernetes.io/control-plane-
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc -n argocd
NAME                                      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
argocd-applicationset-controller          ClusterIP   10.233.63.135   <none>        7000/TCP,8080/TCP            119s
argocd-dex-server                         ClusterIP   10.233.17.104   <none>        5556/TCP,5557/TCP,5558/TCP   118s
argocd-metrics                            ClusterIP   10.233.42.104   <none>        8082/TCP                     118s
argocd-notifications-controller-metrics   ClusterIP   10.233.32.11    <none>        9001/TCP                     118s
argocd-redis-ha                           ClusterIP   None            <none>        6379/TCP,26379/TCP           118s
argocd-redis-ha-announce-0                ClusterIP   10.233.49.211   <none>        6379/TCP,26379/TCP           117s
argocd-redis-ha-announce-1                ClusterIP   10.233.22.24    <none>        6379/TCP,26379/TCP           116s
argocd-redis-ha-announce-2                ClusterIP   10.233.36.213   <none>        6379/TCP,26379/TCP           115s
argocd-redis-ha-haproxy                   ClusterIP   10.233.34.207   <none>        6379/TCP,9101/TCP            114s
argocd-repo-server                        ClusterIP   10.233.25.99    <none>        8081/TCP,8084/TCP            113s
argocd-server                             ClusterIP   10.233.4.80     <none>        80/TCP,443/TCP               113s
argocd-server-metrics                     ClusterIP   10.233.3.152    <none>        8083/TCP                     112s
~~~

# 四、argocd访问

Argo CD 会运行一个 gRPC 服务（由 CLI 使用）和 HTTP/HTTPS 服务（由 UI 使用），这两种协议都由 argocd-server 服务在以下端口进行暴露：

- 443 - gRPC/HTTPS
- 80 - HTTP（重定向到 HTTPS）

我们可以通过配置 Ingress 的方式来对外暴露服务，其他 Ingress 控制器的配置可以参考官方文档 https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/ 进行配置。

Argo CD 在同一端口 (443) 上提供多个协议 (gRPC/HTTPS)，所以当我们为 argocd 服务定义单个 ingress nginx  对象和规则的时候有点麻烦，因为 nginx.ingress.kubernetes.io/backend-protocol 这个 annotation 只能接受一个后端协议（例如 HTTP、HTTPS、GRPC、GRPCS）。

为了使用单个 ingress 规则和主机名来暴露 Argo CD APIServer，必须使用 nginx.ingress.kubernetes.io/ssl-passthrough 这个 annotation 来传递 TLS 连接并校验 Argo CD APIServer 上的 TLS。

## 4.1 使用负载均衡器分配IP地址访问

~~~powershell
[root@k8s-master01 ~]# kubectl get service -n argocd
NAME                                      TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                      AGE
argocd-applicationset-controller          ClusterIP      10.233.8.224    <none>           7000/TCP,8080/TCP            169m
argocd-dex-server                         ClusterIP      10.233.41.197   <none>           5556/TCP,5557/TCP,5558/TCP   169m
argocd-metrics                            ClusterIP      10.233.52.244   <none>           8082/TCP                     169m
argocd-notifications-controller-metrics   ClusterIP      10.233.46.0     <none>           9001/TCP                     169m
argocd-redis                              ClusterIP      10.233.44.202   <none>           6379/TCP                     169m
argocd-repo-server                        ClusterIP      10.233.15.73    <none>           8081/TCP,8084/TCP            169m
argocd-server                             LoadBalancer   10.233.1.213    <none>   80:30712/TCP,443:30564/TCP   169m
argocd-server-metrics                     ClusterIP      10.233.12.147   <none>           8083/TCP                     169m
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl edit service argocd-server -n argocd
......
spec:
  allocateLoadBalancerNodePorts: true
  clusterIP: 10.233.1.213
  clusterIPs:
  - 10.233.1.213
  externalTrafficPolicy: Cluster
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - name: http
    nodePort: 30712
    port: 80
    protocol: TCP
    targetPort: 8080
  - name: https
    nodePort: 30564
    port: 443
    protocol: TCP
    targetPort: 8080
  selector:
    app.kubernetes.io/name: argocd-server
  sessionAffinity: None
  type: LoadBalancer 由ClusterIP修改为LoadBalancer
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get service -n argocd
NAME                                      TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                      AGE
argocd-applicationset-controller          ClusterIP      10.233.8.224    <none>           7000/TCP,8080/TCP            169m
argocd-dex-server                         ClusterIP      10.233.41.197   <none>           5556/TCP,5557/TCP,5558/TCP   169m
argocd-metrics                            ClusterIP      10.233.52.244   <none>           8082/TCP                     169m
argocd-notifications-controller-metrics   ClusterIP      10.233.46.0     <none>           9001/TCP                     169m
argocd-redis                              ClusterIP      10.233.44.202   <none>           6379/TCP                     169m
argocd-repo-server                        ClusterIP      10.233.15.73    <none>           8081/TCP,8084/TCP            169m
argocd-server                             LoadBalancer   10.233.1.213    192.168.10.242   80:30712/TCP,443:30564/TCP   169m
argocd-server-metrics                     ClusterIP      10.233.12.147   <none>           8083/TCP                     169m
~~~

## 4.2 使用ingress访问

>由于 ingress-nginx 的每个 Ingress 对象仅支持一个协议，因此另一种方法是定义两个 Ingress 对象。一个用于 HTTP/HTTPS，另一个用于 gRPC。

### 4.2.1 创建http协议ingress

~~~powershell
[root@k8s-master01 ~]# vim argocd/http.yaml
[root@k8s-master01 ~]# cat argocd/http.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: http-ingress-argocd
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"

spec:
  ingressClassName: nginx
  rules:
  - host: http.argocd.kubemsb.com
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: argocd-server
            port:
              number: 80
  tls:
  - hosts:
    - http.argocd.kubemsb.com
    secretName: argocd-secret
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f http.yaml
~~~

### 4.2.2 创建grpc协议ingress

~~~powershell
[root@k8s-master01 ~]# vim argocd/grpc.yaml
[root@k8s-master01 ~]# cat argocd/grpc.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grpc-ingress-argocd
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"

spec:
  ingressClassName: nginx
  rules:
  - host: grpc.argocd.kubemsb.com
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: argocd-server
            port:
              number: 443
  tls:
  - hosts:
    - grpc.argocd.kubemsb.com
    secretName: argocd-secret
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f grpc.yaml
~~~

### 4.2.3 配置非常安全访问

>如果需要在禁用 TLS 的情况下运行 APIServer：
>
>方法一：编辑 argocd-server 这个 Deployment 以将 --insecure 标志添加到 argocd-server 命令；
>
>方法二：在 argocd-cmd-params-cm ConfigMap 中设置 server.insecure: "true" 即可。

~~~powershell
# kubectl get cm -n argocd
NAME                        DATA   AGE
argocd-cm                   0      27m
argocd-cmd-params-cm        0      27m
argocd-gpg-keys-cm          0      27m
argocd-notifications-cm     0      27m
argocd-rbac-cm              0      27m
argocd-ssh-known-hosts-cm   1      27m
argocd-tls-certs-cm         0      27m
istio-ca-root-cert          1      154m
kube-root-ca.crt            1      154m
~~~

~~~powershell
# kubectl edit cm argocd-cmd-params-cm -n argocd
apiVersion: v1
kind: ConfigMap
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"ConfigMap","metadata":{"annotations":{},"labels":{"app.kubernetes.io/name":"argocd-cmd-params-cm","app.kubernetes.io/part-of":"argocd"},"name":"argocd-cmd-params-cm","namespace":"argocd"}}
  creationTimestamp: "2023-11-16T09:39:49Z"
  labels:
    app.kubernetes.io/name: argocd-cmd-params-cm
    app.kubernetes.io/part-of: argocd
  name: argocd-cmd-params-cm
  namespace: argocd
  resourceVersion: "411794"

data:
  server.insecure: "true"
~~~

~~~powershell
# kubectl rollout restart deployment argocd-server -n argocd
deployment.apps/argocd-server restarted
~~~

### 4.2.4 访问argocd

![image-20231116201756943](/云原生/devops/devops-03-argocd部署指南/image-20231116201756943.png)

![image-20231116201909806](/云原生/devops/devops-03-argocd部署指南/image-20231116201909806.png)

# 五、argocd管理

## 5.1 获取访问密码

~~~powershell
[root@k8s-master01 ~]# kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath="{.data.password}"
d1pLRUlraGw1UkJEdlFDaA==
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
wZKEIkhl5RBDvQCh
~~~

## 5.2 安装argocd CLI工具

![image-20231116212303570](/云原生/devops/devops-03-argocd部署指南/image-20231116212303570.png)

![image-20231116213725818](/云原生/devops/devops-03-argocd部署指南/image-20231116213725818.png)

~~~powershell
[root@k8s-master01 ~]# wget https://github.com/argoproj/argo-cd/releases/download/v2.9.1/argocd-linux-amd64
~~~

~~~powershell
[root@k8s-master01 ~]# chmod +x argocd-linux-amd64
[root@k8s-master01 ~]# mv argocd-linux-amd64 /usr/bin/argocd
~~~

## 5.3 使用argo CLI命令行工具登录

~~~powershell
[root@k8s-master01 ~]# vim /etc/hosts
[root@k8s-master01 ~]# cat /etc/hosts
......
192.168.10.243 grpc.argocd.kubemsb.com
~~~

~~~powershell
[root@k8s-master01 ~]# argocd login grpc.argocd.kubemsb.com
WARNING: server certificate had error: tls: failed to verify certificate: x509: certificate is valid for ingress.local, not grpc.argocd.kubemsb.com. Proceed insecurely (y/n)? y
Username: admin
Password:         # wZKEIkhl5RBDvQCh
'admin:login' logged in successfully
Context 'grpc.argocd.kubemsb.com' updated
~~~

## 5.4 修改admin密码

~~~powershell
[root@k8s-master01 ~]# argocd account update-password
*** Enter password of currently logged in user (admin):
*** Enter new password for user admin:
*** Confirm new password for user admin:
Password updated
Context 'grpc.argocd.kubemsb.com' updated
~~~

## 5.5 查看版本

~~~powershell
[root@k8s-master01 ~]# argocd version
argocd: v2.9.1+58b04e5
  BuildDate: 2023-11-14T15:40:46Z
  GitCommit: 58b04e5e11d007b0518853029ff7612c24a2eb35
  GitTreeState: clean
  GoVersion: go1.21.3
  Compiler: gc
  Platform: linux/amd64
argocd-server: v2.9.1+58b04e5
  BuildDate: 2023-11-14T15:08:20Z
  GitCommit: 58b04e5e11d007b0518853029ff7612c24a2eb35
  GitTreeState: clean
  GoVersion: go1.21.3
  Compiler: gc
  Platform: linux/amd64
  Kustomize Version: v5.2.1 2023-10-19T20:13:51Z
  Helm Version: v3.12.1+gf32a527
  Kubectl Version: v0.24.2
  Jsonnet Version: v0.20.0
~~~

