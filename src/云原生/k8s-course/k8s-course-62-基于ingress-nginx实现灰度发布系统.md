---
title: 基于Ingress Nginx实现灰度发布系统
sidebarGroup: K8s 课程笔记
shortTitle: 62 基于Ingress Nginx实现灰度发布系...
order: 62
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 基于Ingress Nginx实现灰度发布系统 工作中，我们会经常对应用进行升级发版，在互联网公司尤为频繁，主要是为了满足业务的快速发展。我们经常用到的发布方式有滚动更新、蓝绿发布、灰度发布。 - 滚...
---

> **K8s 课程笔记 · 第 62 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 基于Ingress Nginx实现灰度发布系统

工作中，我们会经常对应用进行升级发版，在互联网公司尤为频繁，主要是为了满足业务的快速发展。我们经常用到的发布方式有滚动更新、蓝绿发布、灰度发布。

- 滚动更新：依次进行新旧替换，直到旧的全部被替换为止。
- 蓝绿发布：两套独立的系统，对外提供服务的称为绿系统，待上线的服务称为蓝系统，当蓝系统里面的应用测试完成后，用户流量接入蓝系统，蓝系统将称为绿系统，以前的绿系统就可以销毁。
- 灰度发布：在一套集群中存在稳定和灰度两个版本，灰度版本可以限制只针对部分人员可用，待灰度版本测试完成后，可以将灰度版本升级为稳定版本，旧的稳定版本就可以下线了，我们也称之为金丝雀发布。
  本次分享如何通过ingress-nginx controller实现灰度发布。

# 一、通过ingress-nginx实现灰度发布原理

ingress-nginx是Kubernetes官方推荐的ingress controller，它是基于nginx实现的，增加了一组用于实现额外功能的Lua插件。
为了实现灰度发布，ingress-nginx通过定义annotation来实现不同场景的灰度发布，其支持的规则如下：

- nginx.ingress.kubernetes.io/canary-by-header：基于 Request Header 的流量切分，适用于灰度发布以及 A/B 测试。当 Request Header 设置为 always时，请求将会被一直发送到 Canary 版本；当 Request Header 设置为 never时，请求不会被发送到 Canary 入口；对于任何其他 Header 值，将忽略 Header，并通过优先级将请求与其他金丝雀规则进行优先级的比较。
- nginx.ingress.kubernetes.io/canary-by-header-value：要匹配的 Request Header 的值，用于通知 Ingress 将请求路由到 Canary Ingress 中指定的服务。当 Request Header 设置为此值时，它将被路由到 Canary 入口。该规则允许用户自定义 Request Header 的值，必须与上一个 annotation (即：canary-by-header）一起使用。
- nginx.ingress.kubernetes.io/canary-weight：基于服务权重的流量切分，适用于蓝绿部署，权重范围 0 - 100 按百分比将请求路由到 Canary Ingress 中指定的服务。权重为 0 意味着该金丝雀规则不会向 Canary 入口的服务发送任何请求。权重为 100 意味着所有请求都将被发送到 Canary 入口。
- nginx.ingress.kubernetes.io/canary-by-cookie：基于 Cookie 的流量切分，适用于灰度发布与 A/B 测试。用于通知 Ingress 将请求路由到 Canary Ingress 中指定的服务的cookie。当 cookie 值设置为 always时，它将被路由到 Canary 入口；当 cookie 值设置为 never时，请求不会被发送到 Canary 入口；对于任何其他值，将忽略 cookie 并将请求与其他金丝雀规则进行优先级的比较。

>以上规则优先顺序为： `canary-by-header -> canary-by-cookie -> canary-weight`

# 二、通过ingress-nginx实现灰度发布场景

## 2.1 基于服务权重的流量切分

假如在生产上已经运行了A应用对外提供服务，此时开发修复了一些Bug，需要发布A1版本将其上线，但是我们又不希望直接的将所有流量接入到新的A1版本，而是希望将10%的流量进入到A1中，待A1稳定后，才会将所有流量接入进来，再下线原来的A版本。

![image-20231013083429600](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013083429600.png)

**实现方法：**

> 在canary ingress中添加如下annotation

~~~powershell
nginx.ingress.kubernetes.io/canary: "true"
nginx.ingress.kubernetes.io/canary-weight: "10"
~~~

其中：

nginx.ingress.kubernetes.io/canary: "true"  表示开启canary
nginx.ingress.kubernetes.io/canary-weight: "10"  表示设置的权重百分比，10为10%的流量

## 2.2 基于用户请求头Header的流量切分

由于基于权重的发布场景比较粗糙，它是所有用户中的10%流量，无法限制具体的用户访问行为。
我们有时候会有这样的需求，比如我们有北京、上海、深圳这三个地区的用户，并且已经有A版本的应用为这三个地区提供服务，由于更新了需求，我们需要发布A1应用，但是我们不想所有地区都访问A1应用，而是希望只有深圳的用户可以访问，待深圳地区反馈没问题后，才开放其他地区。

![image-20231013084523997](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013084523997.png)

**实现方法：**

>在canary ingress中添加如下annotation

~~~powershell
nginx.ingress.kubernetes.io/canary: "true"
nginx.ingress.kubernetes.io/canary-by-header: "Region"
nginx.ingress.kubernetes.io/canary-by-header-value: "shenzhen"
~~~

其中：

nginx.ingress.kubernetes.io/canary: "true" 开启canary
nginx.ingress.kubernetes.io/canary-by-header: "Region" 指定header关键字
nginx.ingress.kubernetes.io/canary-by-header-value: "shenzhen" 指定header关键字对应的value

# 三、通过ingress-nginx实现灰度发布实现思路

1、在K8S集群中运行2个应用版本，一个是stable版本，一个是canary版本

2、定义stable版本ingress，提供运行的应用正常访问；定义canary版本，在metadata中添加annotation实现类度发布，例如根据流量百分比或用户请求header

3、经过一定时间的运行，canary版本可正常提供服务后，将其切换为stable版本，并将原stable版本下线即可 

# 四、通过ingress-nginx实现灰度发布系统

## 4.1 负载均衡器metallb部署

### 4.1.1 kube-proxy代理模式修改

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

### 4.1.2 metallb部署

#### 4.1.2.1 metallb部署

![image-20231013093528604](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013093528604.png)

![image-20231013093709673](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013093709673.png)

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

#### 4.1.2.2 IP地址池准备

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

#### 4.1.2.3 开启二层通告

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

## 4.2 ingress nginx部署

### 4.2.1 获取ingress nginx部署文件

![image-20231013094055365](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013094055365.png)

![image-20231013094123408](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013094123408.png)

![image-20231013094243973](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013094243973.png)

![image-20231013094322906](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013094322906.png)

![image-20231013094402166](/云原生/k8s-course/k8s-course-62-基于ingress-nginx实现灰度发布系统/image-20231013094402166.png)

~~~powershell
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

### 4.2.2 修改ingress nginx部署文件

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

### 4.2.3 部署ingress nginx

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

> 有必要修改configmap,操作如下：

~~~powershell
[root@k8s-master01 ~]# kubectl get configmap -n ingress-nginx
NAME                       DATA   AGE
ingress-nginx-controller   2      12h
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl edit configmap ingress-nginx-controller -n ingress-nginx
apiVersion: v1
data:
  allow-snippet-annotations: "true"
  enable-canary: "true"
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get deployment -n ingress-nginx
NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
ingress-nginx-controller   1/1     1            1           12h
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl rollout restart deployment ingress-nginx-controller -n ingress-nginx
~~~

## 4.3 应用服务部署

### 4.3.1 v1版本部署

~~~powershell
[root@k8s-master01 ~]# vim 01-deploy-nginx-v1.yaml
[root@k8s-master01 ~]# cat 01-deploy-nginx-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
      version: v1
  template:
    metadata:
      labels:
        app: nginx
        version: v1
    spec:
      containers:
      - name: nginx
        image: "openresty/openresty:centos"
        ports:
        - name: http
          protocol: TCP
          containerPort: 80
        volumeMounts:
        - mountPath: /usr/local/openresty/nginx/conf/nginx.conf
          name: config
          subPath: nginx.conf
      volumes:
      - name: config
        configMap:
          name: nginx-v1

---

apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    app: nginx
    version: v1
  name: nginx-v1
data:
  nginx.conf: |-
    worker_processes  1;

    events {
        accept_mutex on;
        multi_accept on;
        use epoll;
        worker_connections  1024;
    }

    http {
        ignore_invalid_headers off;
        server {
            listen 80;
            location / {
                access_by_lua '
                    local header_str = ngx.say("nginx-v1")
                ';
            }
        }
    }

---

apiVersion: v1
kind: Service
metadata:
  name: nginx-v1
spec:
  type: ClusterIP
  ports:
  - port: 80
    protocol: TCP
    name: http
  selector:
    app: nginx
    version: v1
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f 01-deploy-nginx-v1.yaml
deployment.apps/nginx-v1 created
configmap/nginx-v1 created
service/nginx-v1 created
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME                      READY   STATUS    RESTARTS   AGE
nginx-v1-b94d7c84-vt62f   1/1     Running   0          2m19s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP   36h
nginx-v1     ClusterIP   10.101.173.87   <none>        80/TCP    2m48s
~~~

~~~powershell
[root@k8s-master01 ~]# curl http://10.101.173.87
nginx-v1
~~~

### 4.3.2 v2版本部署

~~~powershell
[root@k8s-master01 ~]# vim 02-deploy-nginx-v2.yaml
[root@k8s-master01 ~]# cat 02-deploy-nginx-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
      version: v2
  template:
    metadata:
      labels:
        app: nginx
        version: v2
    spec:
      containers:
      - name: nginx
        image: "openresty/openresty:centos"
        ports:
        - name: http
          protocol: TCP
          containerPort: 80
        volumeMounts:
        - mountPath: /usr/local/openresty/nginx/conf/nginx.conf
          name: config
          subPath: nginx.conf
      volumes:
      - name: config
        configMap:
          name: nginx-v2
---

apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    app: nginx
    version: v2
  name: nginx-v2
data:
  nginx.conf: |-
    worker_processes  1;

    events {
        accept_mutex on;
        multi_accept on;
        use epoll;
        worker_connections  1024;
    }

    http {
        ignore_invalid_headers off;
        server {
            listen 80;
            location / {
                access_by_lua '
                    local header_str = ngx.say("nginx-v2")
                ';
            }
        }
    }

---

apiVersion: v1
kind: Service
metadata:
  name: nginx-v2
spec:
  type: ClusterIP
  ports:
  - port: 80
    protocol: TCP
    name: http
  selector:
    app: nginx
    version: v2
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f 02-deploy-nginx-v2.yaml
deployment.apps/nginx-v2 created
configmap/nginx-v2 created
service/nginx-v2 created
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME                       READY   STATUS    RESTARTS   AGE
......
nginx-v2-567b457d6-f6d5r   1/1     Running   0          36s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP   36h
nginx-v1     ClusterIP   10.101.173.87   <none>        80/TCP    7m10s
nginx-v2     ClusterIP   10.106.237.15   <none>        80/TCP    70s
~~~

~~~powershell
[root@k8s-master01 ~]# curl http://10.106.237.15
nginx-v2
~~~

## 4.4 创建stable版本ingress资源对象

~~~powershell
[root@k8s-master01 ~]# vim 03-stable-ingress.yaml
[root@k8s-master01 ~]# cat 03-stable-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-v1                    #自定义ingress名称
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com                   # 自定义域名
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: nginx-v1    # 对应上面创建的service名称
            port:
              number: 80
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f 03-stable-ingress.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get ingress
NAME       CLASS   HOSTS             ADDRESS          PORTS   AGE
nginx-v1   nginx   www.kubemsb.com   192.168.10.240   80      58s
~~~

~~~powershell
[root@k8s-master01 ~]# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.140 k8s-master01
192.168.10.141 k8s-worker01
192.168.10.142 k8s-worker02
192.168.10.240 www.kubemsb.com
~~~

~~~powershell
[root@k8s-master01 ~]# curl http://www.kubemsb.com
nginx-v1
~~~

## 4.5 流量切分

### 4.5.1 基于服务权重的流量切分

~~~powershell
[root@k8s-master01 ~]# vim 04-canary-ingress-weight.yaml

[root@k8s-master01 ~]# cat 04-canary-ingress-weight.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-v2                    #自定义ingress名称
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com                   # 自定义域名
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: nginx-v2    # 对应上面创建的service名称
            port:
              number: 80
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f 04-canary-ingress-weight.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get ingress
NAME       CLASS   HOSTS             ADDRESS          PORTS   AGE
nginx-v1   nginx   www.kubemsb.com   192.168.10.240   80      15m
nginx-v2   nginx   www.kubemsb.com                    80      5s
~~~

~~~powershell
[root@k8s-master01 ~]# for i in {1..10};do curl http://www.kubemsb.com;done
nginx-v1
nginx-v1
nginx-v1
nginx-v1
nginx-v1
nginx-v1
nginx-v1
nginx-v1
nginx-v1
nginx-v2
~~~

### 4.5.2 基于用户请求头Header的流量切分

~~~powershell
[root@k8s-master01 ~]# vim 05-canary-ingress-header.yaml
[root@k8s-master01 ~]# cat 05-canary-ingress-header.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-v2                    #自定义ingress名称
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "Region"
    nginx.ingress.kubernetes.io/canary-by-header-pattern: "shenzhen"
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com                   # 自定义域名
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: nginx-v2    # 对应上面创建的service名称
            port:
              number: 80
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f 05-canary-ingress-header.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get ingress
NAME       CLASS   HOSTS             ADDRESS          PORTS   AGE
nginx-v1   nginx   www.kubemsb.com   192.168.10.240   80      83m
nginx-v2   nginx   www.kubemsb.com                    80      7s
~~~

~~~powershell
[root@k8s-master01 ~]# curl http://www.kubemsb.com
nginx-v1
~~~

~~~powershell
[root@k8s-master01 ~]# curl -H "Region: beijing"  http://www.kubemsb.com
nginx-v1

~~~

~~~powershell
[root@k8s-master01 ~]# curl -H "Region: shanghai"  http://www.kubemsb.com
nginx-v1
~~~

~~~powershell
[root@k8s-master01 ~]# curl -H "Region: shenzhen"  http://www.kubemsb.com
nginx-v2
~~~

### 4.5.3 基于Cookie的流量切分

> 使用 Cookie 则无法自定义 value，以模拟灰度shenzhen地域用户为例，仅将带有名为 `user_from_shenzhen` 的 Cookie 的请求转发给当前 Canary Ingress

~~~powershell
[root@k8s-master01 ~]# vim 06-canary-ingress-cookie.yaml
[root@k8s-master01 ~]# cat 06-canary-ingress-cookie.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-v2                    #自定义ingress名称
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: "user_from_shenzhen"
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com                   # 自定义域名
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: nginx-v2    # 对应上面创建的service名称
            port:
              number: 80
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f 06-canary-ingress-cookie.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get ingress
NAME       CLASS   HOSTS             ADDRESS          PORTS   AGE
nginx-v1   nginx   www.kubemsb.com   192.168.10.240   80      98m
nginx-v2   nginx   www.kubemsb.com                    80      4s
~~~

~~~powershell
[root@k8s-master01 ~]# curl --cookie "user_from_beijing" http://www.kubemsb.com
nginx-v1
~~~

~~~powershell
[root@k8s-master01 ~]# curl --cookie "user_from_shenzhen" http://www.kubemsb.com
nginx-v1
~~~

~~~powershell
[root@k8s-master01 ~]# curl --cookie "user_from_shenzhen=always" http://www.kubemsb.com
nginx-v2
~~~

> 可查看当仅有 cookie `user_from_shenzhen` 为 `always` 的请求才由 v2 版本的服务响应。

