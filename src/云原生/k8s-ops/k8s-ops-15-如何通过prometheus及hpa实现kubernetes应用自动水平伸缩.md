---
title: 如何通过Prometheus及HPA实现Kubernetes应用自动水平伸缩？
sidebarGroup: K8s 运维笔记
shortTitle: 15 如何通过Prometheus及HPA实现Kube
order: 15
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: '如何通过Prometheus及HPA实现Kubernetes应用水平自动伸缩？ 一、metircs-server部署 ~~~powershell [root@k8s-master01 ~] wget ...'
---

> **K8s 课程笔记 · 第 15 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何通过Prometheus及HPA实现Kubernetes应用水平自动伸缩？

# 一、metircs-server部署

![image-20231204150905238](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231204150905238.png)

![image-20231204150922832](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231204150922832.png)

![image-20231204151106877](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231204151106877.png)

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

# 二、负载均衡器metallb部署

## 2.1 修改kube-proxy代理模式

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

## 2.2 metallb部署 

### 2.2.1 metallb部署

![image-20231013093528604](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013093528604.png)

![image-20231013093709673](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013093709673.png)

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

### 2.2.2 IP地址池准备

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

### 2.2.3 开启二层通告

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

# 三、服务代理ingress nginx部署

## 3.1 获取ingress nginx部署文件

![image-20231013094055365](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013094055365.png)

![image-20231013094123408](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013094123408.png)

![image-20231013094243973](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013094243973.png)

![image-20231013094322906](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013094322906.png)

![image-20231013094402166](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231013094402166.png)

~~~powershell
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

## 3.2 修改ingress nginx部署文件

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

## 3.3 部署ingress nginx

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

# 四、部署Prometheus监控系统

## 4.1 helm添加prometheus仓库

>  先安装helm

~~~powershell
# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
~~~

~~~powershell
# helm repo list
NAME                    URL
kedacore                https://kedacore.github.io/charts
prometheus-community    https://prometheus-community.github.io/helm-charts
~~~

~~~powershell
# helm repo update
~~~

~~~powershell
# helm search repo prometheus
NAME                                                    CHART VERSION   APP VERSION     DESCRIPTION
prometheus-community/kube-prometheus-stack              55.1.0          v0.70.0         kube-prometheus-stack collects Kubernetes manif...
~~~

## 4.2 使用helm安装prometheus全家桶

~~~powershell
# helm show values prometheus-community/kube-prometheus-stack --version 55.7.0 > kube-prometheus-stack.yaml
~~~

~~~powershell
# vim kube-prometheus-stack.yaml
     serviceMonitorSelectorNilUsesHelmValues: false
由true修改为false
~~~

~~~powershell
# helm install kps prometheus-community/kube-prometheus-stack --version 55.7.0 -f ./kube-prometheus-stack.yaml -n monitoring --create-namespace --debug
~~~

~~~powershell
#  kubectl --namespace monitoring get pods -l "release=kps"
NAME                                                  READY   STATUS    RESTARTS   AGE
kps-kube-prometheus-stack-operator-645c798856-mbf5m   1/1     Running   0          2m8s
kps-kube-state-metrics-78849db795-wg449               1/1     Running   0          2m8s
kps-prometheus-node-exporter-8srsj                    1/1     Running   0          2m8s
kps-prometheus-node-exporter-dh4t6                    1/1     Running   0          2m8s
kps-prometheus-node-exporter-dvb5n                    1/1     Running   0          2m8s
kps-prometheus-node-exporter-pqnvl                    1/1     Running   0          2m8s
kps-prometheus-node-exporter-sktr8                    1/1     Running   0          2m8s
~~~

~~~powershell
#  kubectl --namespace monitoring get svc
NAME                                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
alertmanager-operated                    ClusterIP   None             <none>        9093/TCP,9094/TCP,9094/UDP   2m59s
kps-grafana                              ClusterIP   10.102.76.185    <none>        80/TCP                       3m27s
kps-kube-prometheus-stack-alertmanager   ClusterIP   10.105.193.57    <none>        9093/TCP,8080/TCP            3m27s
kps-kube-prometheus-stack-operator       ClusterIP   10.99.154.67     <none>        443/TCP                      3m27s
kps-kube-prometheus-stack-prometheus     ClusterIP   10.101.100.144   <none>        9090/TCP,8080/TCP            3m27s
kps-kube-state-metrics                   ClusterIP   10.102.96.230    <none>        8080/TCP                     3m27s
kps-prometheus-node-exporter             ClusterIP   10.102.99.153    <none>        9100/TCP                     3m27s
prometheus-operated                      ClusterIP   None             <none>        9090/TCP                     2m59s
~~~

## 4.3 配置prometheus及grafana通过ingress访问

### 4.3.1 配置prometheus访问

~~~powershell
# vim prometheus-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-prometheus                    #自定义ingress名称
  namespace: monitoring
spec:
  ingressClassName: nginx
  rules:
  - host: prometheus.kubemsb.com                   # 自定义域名
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: kps-kube-prometheus-stack-prometheus     # 对应上面创建的service名称
            port:
              number: 9090
~~~

~~~powershell
# kubectl apply -f prometheus-ingress.yaml
ingress.networking.k8s.io/ingress-prometheus created
~~~

~~~powershell
# kubectl get ingress -n monitoring
NAME                 CLASS   HOSTS                    ADDRESS          PORTS   AGE
ingress-prometheus   nginx   prometheus.kubemsb.com   192.168.10.240   80      34s
~~~

![image-20231209220300330](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209220300330.png)

![image-20231209220349322](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209220349322.png)

### 4.3.2 配置grafana访问

~~~powershell
# vim grafana-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-grafana                    #自定义ingress名称
  namespace: monitoring
spec:
  ingressClassName: nginx
  rules:
  - host: grafana.kubemsb.com                   # 自定义域名
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: kps-grafana     # 对应上面创建的service名称
            port:
              number: 80
~~~

~~~powershell
# kubectl apply -f grafana-ingress.yaml
ingress.networking.k8s.io/ingress-grafana created
~~~

~~~powershell
# kubectl get ingress -n monitoring
NAME                 CLASS   HOSTS                    ADDRESS          PORTS   AGE
ingress-grafana      nginx   grafana.kubemsb.com                       80      35s
~~~

![image-20231209220902281](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209220902281.png)

~~~powershell
# kubectl get secret -n monitoring
NAME                                                               TYPE                 DATA   AGE
kps-grafana                                                        Opaque               3      17m
~~~

~~~powershell
# kubectl get  secret kps-grafana -n monitoring -o yaml
apiVersion: v1
data:
  admin-password: cHJvbS1vcGVyYXRvcg==
  admin-user: YWRtaW4=
  ldap-toml: ""
kind: Secret
metadata:
  annotations:
    meta.helm.sh/release-name: kps
    meta.helm.sh/release-namespace: monitoring
  creationTimestamp: "2023-12-09T13:51:41Z"
  labels:
    app.kubernetes.io/instance: kps
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: grafana
    app.kubernetes.io/version: 10.2.2
    helm.sh/chart: grafana-7.0.11
  name: kps-grafana
  namespace: monitoring
  resourceVersion: "95771"
  uid: b99db224-852a-4337-aa60-2a3d7d477518
type: Opaque
~~~

~~~powershell
# echo -n "YWRtaW4=" | base64 --decode
admin
~~~

~~~powershell
# echo -n "cHJvbS1vcGVyYXRvcg==" | base64 --decode
prom-operator
~~~

![image-20231209221309803](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209221309803.png)

![image-20231209221358058](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209221358058.png)

![image-20231209221516578](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209221516578.png)

# 五、部署Web类应用 Nginx

## 5.1 部署Nginx应用

~~~powershell
# vim nginx.conf

# cat nginx.conf
events {}
http {
    server {
        listen 80;

        location / {
            root /usr/share/nginx/html;
            index index.html;
        }

        location /basic_status {
            stub_status;
            allow 127.0.0.1;
            deny all;
        }
    }
}
~~~

~~~powershell
# kubectl create configmap nginx-config --from-file=nginx.conf
~~~

~~~powershell
# vim nginx.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-with-exporter
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
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config-volume
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
      - name: nginx-prometheus-exporter
        image: nginx/nginx-prometheus-exporter:latest
        args: ["-nginx.scrape-uri=http://localhost/basic_status"]
        ports:
        - name: exporter-port
          containerPort: 9113
        resources:
          requests:
            cpu: 50m
            memory: 100Mi
      volumes:
      - name: nginx-config-volume
        configMap:
          name: nginx-config
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
# kubectl apply -f nginx.yaml
deployment.apps/nginx-with-exporter created
service/nginx created
~~~

~~~powershell
# kubectl get pods
NAME                                   READY   STATUS    RESTARTS   AGE
nginx-with-exporter-6459874777-294qk   2/2     Running   0          36s
nginx-with-exporter-6459874777-s76td   2/2     Running   0          36s

# kubectl get svc
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP        25h
nginx        NodePort    10.109.183.119   <none>        80:31484/TCP   40s
~~~

## 5.2 添加prometheus监控nginx

~~~powershell
# vim kube-prometheus-stack.yaml

     additionalScrapeConfigs:
       - job_name: 'nginx'
         kubernetes_sd_configs:
           - role: pod
         relabel_configs:
           - source_labels: [__meta_kubernetes_pod_container_port_name]
             action: keep
             regex: exporter-port
           - source_labels: [__meta_kubernetes_namespace]
             target_label: namespace
           - source_labels: [__meta_kubernetes_pod_name]
             target_label: pod
~~~

~~~powershell
第一个 relabel_config 保留了原有的配置，确保只抓取名为 exporter-port 的容器端口。
新添加的两个 relabel_config 配置将 Kubernetes 的 Pod 名称和命名空间作为标签添加到抓取的指标中。
这样，nginx_http_requests_total 指标就会包含 namespace 和 pod 标签。
~~~

~~~powershell
这段内容是 Prometheus 的配置，用于定义如何从 Kubernetes 集群中收集指标。具体来说，它配置了一个名为 `nginx` 的作业（job），用于从满足特定条件的 Pods 中抓取指标。下面是各部分的详细解释：

- `job_name: 'nginx'`: 这定义了一个 Prometheus 作业，名为 `nginx`。Prometheus 中的每个作业都是独立的指标收集配置。

- `kubernetes_sd_configs`: 这部分配置了 Kubernetes 服务发现，它告诉 Prometheus 如何发现并抓取来自 Kubernetes 集群的指标。
  - `- role: pod`: 这指定 Prometheus 将使用 Pod 角色的服务发现机制，意味着 Prometheus 将发现并抓取 Kubernetes Pods 的指标。

- `relabel_configs`: 重标记（relabeling）是 Prometheus 中用于在抓取指标之前转换或过滤标签的一种机制。
  - 第一条规则：
    - `source_labels: [__meta_kubernetes_pod_container_port_name]`: 选择源标签为 Kubernetes Pod 容器端口名称的标签。
    - `action: keep`: 这个动作意味着只保留符合后面 `regex` 的目标。
    - `regex: exporter-port`: 只保留那些容器端口名称匹配 `exporter-port` 的 Pods。这通常用于定位具有特定端口名称（如指标导出器端口）的 Pod。
  - 第二条规则：
    - `source_labels: [__meta_kubernetes_namespace]`: 选择源标签为 Kubernetes 命名空间的标签。
    - `target_label: namespace`: 将这个值映射到一个新标签 `namespace` 上，用于识别 Pod 所属的命名空间。
  - 第三条规则：
    - `source_labels: [__meta_kubernetes_pod_name]`: 选择源标签为 Kubernetes Pod 名称的标签。
    - `target_label: pod`: 将这个值映射到一个新标签 `pod` 上，用于识别 Pod 的名称。

总结来说，这段配置指示 Prometheus 仅从名称为 `exporter-port` 的端口上的 Kubernetes Pods 收集指标，并将这些 Pods 的命名空间和名称分别映射到 `namespace` 和 `pod` 标签上。这样做可以帮助 Prometheus 更精确地定位和标识抓取到的指标数据的来源。
~~~

~~~powershell
# helm upgrade kps prometheus-community/kube-prometheus-stack --version 55.7.0 -f ./kube-prometheus-stack.yaml -n monitoring 
~~~

~~~powershell
输出内容：
Release "kps" has been upgraded. Happy Helming!
NAME: kps
LAST DEPLOYED: Sat Dec  9 22:50:45 2023
NAMESPACE: monitoring
STATUS: deployed
REVISION: 2
NOTES:
kube-prometheus-stack has been installed. Check its status by running:
  kubectl --namespace monitoring get pods -l "release=kps"

Visit https://github.com/prometheus-operator/kube-prometheus for instructions on how to create & configure Alertmanager and Prometheus instances using the Operator.
~~~

![image-20231209225506719](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209225506719.png)

![image-20231209231523521](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209231523521.png)

![image-20231209231641407](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231209231641407.png)

![image-20231210001957090](/云原生/k8s-ops/k8s-ops-15-如何通过prometheus及hpa实现kubernetes应用自动水平伸缩/image-20231210001957090.png)

# 六、安装Prometheus-Adapter

如果你的目标是使用 HPA根据 `nginx_http_requests_total` 指标进行自动扩缩容，那么安装和配置 Prometheus-Adapter 是必要的。这是因为 HPA需要使用 Kubernetes 自定义指标 API 来访问这些指标，而 Prometheus-Adapter 正是用来提供这个桥接功能的。

Prometheus-Adapter 作为一个自定义指标 API 服务器，允许你的 Kubernetes 集群使用 Prometheus 作为后端来获取指标数据。这些数据可以用于 Kubernetes 中的水平自动扩缩容（HPA）或者 KEDA。

~~~powershell
在 Kubernetes 生态系统中，Prometheus Adapter 是一个重要的组件，用于集成 Prometheus 和 Kubernetes 的自动伸缩功能。"Adapter" 在这里可以翻译为“适配器”。

### Prometheus Adapter 的中文解释

1. 适配器的角色：
   Prometheus Adapter 充当了 Prometheus 和 Kubernetes 之间的桥梁或适配器。它使 Kubernetes 能够使用 Prometheus 中收集的指标来做出自动伸缩（如水平 Pod 自动伸缩）的决策。

2. 工作原理：
   - Prometheus 本身收集和存储了大量的指标数据，但 Kubernetes 的 HPA（Horizontal Pod Autoscaler）或 VPA（Vertical Pod Autoscaler）无法直接使用这些数据。
   - Prometheus Adapter 的作用是将 Prometheus 中的指标转换为 Kubernetes 可以理解的格式，并通过 Kubernetes 自定义指标 API 提供这些数据。
   - 这样，当 HPA 或 VPA 需要根据特定指标（如每秒 HTTP 请求的数量或特定队列的长度）来自动调整 Pod 的数量时，它们可以查询这些由 Prometheus Adapter 提供的指标。

3. 配置和使用：
   - 在 Prometheus Adapter 中，用户需要定义如何从 Prometheus 查询特定指标，以及如何将这些指标映射到 Kubernetes 可理解的资源上（如 Pod、服务等）。
   - 一旦配置完成并且 Prometheus Adapter 正在运行，用户可以在 Kubernetes HPA 或 VPA 配置中引用这些自定义指标，以实现基于更丰富指标集的自动伸缩策略。

4. 实际应用：
   - Prometheus Adapter 广泛应用于需要动态伸缩资源以适应不断变化工作负载的 Kubernetes 集群中。
   - 例如，如果某个服务在流量高峰期间需要更多的 Pod 来处理请求，Prometheus Adapter 可以提供相应的流量指标给 HPA，HPA 再根据这些指标来增加 Pod 的数量。

结论:
简而言之，Prometheus Adapter 是 Kubernetes 集群中的一个重要组件，它使得基于 Prometheus 收集的复杂和丰富的指标数据来自动伸缩 Pod 成为可能。通过 Prometheus Adapter，Kubernetes 能够更智能地响应监控到的系统状态变化。
~~~

~~~powershell
# helm search repo prometheus-adapter
NAME                                    CHART VERSION   APP VERSION     DESCRIPTION
prometheus-community/prometheus-adapter 4.9.0           v0.11.2         A Helm chart for k8s prometheus adapter
~~~

~~~powershell
# helm show values prometheus-community/prometheus-adapter --version 4.9.0 > prometheus-adapter.yaml
~~~

~~~powershell
# vim prometheus-adapter.yaml
......
33 prometheus:
34   # Value is templated
35   url: http://kps-kube-prometheus-stack-prometheus.monitoring.svc.cluster.local.
36   port: 9090
37   path: ""

......

124
125  # Configure startup probe
126  # Use if prometheus-adapter takes a long time to finish startup e.g. polling a lot of API versions in cluster
127  startupProbe: {}
128
129  rules:
130    default: false
131
132    custom:
133      - seriesQuery: 'nginx_http_requests_total{namespace!="",pod!=""}'
134        resources:
135          overrides:
136            namespace: {resource: "namespace"}
137            pod: {resource: "pod"}
138        name:
139          #matches: "^(.*)_total"
140          as: "nginx_http_requests"
141        metricsQuery: 'sum(rate(nginx_http_requests_total{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
142      # - seriesQuery: '{__name__=~"^some_metric_count$"}'
143      #   resources:
144      #     template: <<.Resource>>
~~~

~~~powershell
说明：
要在 Prometheus-Adapter 的配置文件中添加 nginx_http_requests_total 指标，你需要在 values.yaml 文件的 rules 部分进行配置。具体来说，这通常是在 custom 或 external 规则数组中添加新规则。以下是一个示例，展示了如何添加针对 nginx_http_requests_total 的自定义规则：

找到 values.yaml 文件中的 rules 部分。

在 custom 数组中添加一条新规则。如果 custom 数组不存在，则创建它。

为 nginx_http_requests_total 指标定义一个 seriesQuery 和 metricsQuery。这里的关键是正确定义这两个查询，以便 Prometheus-Adapter 可以从 Prometheus 中正确地提取并转换这个指标。
~~~

~~~powershell
seriesQuery 定义了 Prometheus Adapter 如何查找相关的 Prometheus 时间序列。它匹配所有的 nginx_http_requests_total 时间序列，并且确保包括命名空间和 Pod 名称。
resources 部分定义了如何将 Prometheus 标签映射到 Kubernetes 资源。
name 部分定义了如何转换指标名称。在这个示例中，它将 xxx_total 转换为 xxx。
metricsQuery 定义了实际的 Prometheus 查询，rate 函数用于计算每秒的速率。
请注意，这只是一个基本示例，具体配置可能需要根据你的具体情况进行调整。特别是 seriesQuery 和 metricsQuery 需要根据你的 Prometheus 设置和所需的监控指标进行精确配置。
~~~

~~~powershell
# helm install prometheus-adapter prometheus-community/prometheus-adapter --namespace monitoring --version 4.9.0 -f ./prometheus-adapter.yaml
~~~

~~~powershell
NAME: prometheus-adapter
LAST DEPLOYED: Sat Dec  9 23:31:59 2023
NAMESPACE: monitoring
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
prometheus-adapter has been deployed.
In a few minutes you should be able to list metrics using the following command(s):

  kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1

~~~

~~~powershell
# wget -O /etc/yum.repos.d/epel.repo https://mirrors.aliyun.com/repo/epel-7.repo
~~~

~~~powershell
# yum -y install jq
~~~

~~~powershell
# kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .
{
输出的内容非常多
}

~~~

~~~powershell
# kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/nginx_http_requests" | jq .
{
  "kind": "MetricValueList",
  "apiVersion": "custom.metrics.k8s.io/v1beta1",
  "metadata": {},
  "items": [
    {
      "describedObject": {
        "kind": "Pod",
        "namespace": "default",
        "name": "nginx-with-exporter-78596bfc95-2zmk4",
        "apiVersion": "/v1"
      },
      "metricName": "nginx_http_requests",
      "timestamp": "2024-01-05T15:50:05Z",
      "value": "33m",
      "selector": null
    }
  ]
}
~~~

# 七、创建HPA对象及测试结果

~~~powershell
# vim hpa.yaml

# cat hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-with-exporter
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 150Mi
  - type: Pods
    pods:
      metric:
        name: nginx_http_requests
      target:
        type: AverageValue
        averageValue: 50
~~~

~~~powershell
说明：
这个文件是一个 Kubernetes 的 Horizontal Pod Autoscaler (HPA) 配置文件。HPA 自动调整在 Kubernetes 集群中运行的 Pod 的数量，以应对不同的负载情况。下面是该文件内容的具体解释：

- `apiVersion: autoscaling/v2`: 指定了 Kubernetes API 的版本，这里是自动伸缩相关的 API 的第二版。

- `kind: HorizontalPodAutoscaler`: 指明这是一个 Horizontal Pod Autoscaler 的配置。

- `metadata`:
  - `name: nginx-hpa`: HPA 的名称设为 `nginx-hpa`。
  - `namespace: default`: HPA 被创建在 `default` 命名空间。

- `spec`: 指定了 HPA 的具体配置。
  - `scaleTargetRef`: 定义了这个 HPA 控制的目标对象。
    - `apiVersion: apps/v1`: 目标对象所使用的 Kubernetes API 版本。
    - `kind: Deployment`: 目标对象是一个 Deployment。
    - `name: nginx-with-exporter`: 目标 Deployment 的名称。
  - `minReplicas: 1`: 最小副本数设为 1，即 HPA 不会将 Pod 数量缩减到小于 1。
  - `maxReplicas: 5`: 最大副本数设为 5，即 HPA 不会将 Pod 数量增加到超过 5。

- `metrics`: 定义 HPA 根据哪些指标来自动调整 Pod 的数量。
  - 第一个指标（类型为 `Resource`）:
    - `name: cpu`: 指标是 CPU 使用率。
    - `target`:
      - `type: Utilization`: 使用率类型的目标。
      - `averageUtilization: 70`: 平均 CPU 使用率目标是 70%。
  - 第二个指标（也是 `Resource` 类型）:
    - `name: memory`: 指标是内存使用量。
    - `target`:
      - `type: AverageValue`: 平均值类型的目标。
      - `averageValue: 150Mi`: 平均内存使用量目标是 150Mi（Mi 是 Mebibytes 的缩写）。
  - 第三个指标（类型为 `Pods`）:
    - `metric`:
      - `name: nginx_http_requests`: 指标是 Pod 级别的 `nginx_http_requests`。
    - `target`:
      - `type: AverageValue`: 平均值类型的目标。
      - `averageValue: 50`: 平均每个 Pod 的 `nginx_http_requests` 指标目标值是 50。

总结来说，这个 HPA 配置是为了自动调整名为 `nginx-with-exporter` 的 Deployment 的 Pod 数量，基于三个指标：CPU 使用率、内存使用量和每个 Pod 的 `nginx_http_requests` 指标。当这些指标超出或低于设定的目标时，HPA 会自动增加或减少 Pod 的数量，但总是保持在 1 到 5 个 Pod 之间。

这部分配置是 Kubernetes Horizontal Pod Autoscaler (HPA) 中的一个指标定义，专门用于基于 Pod 级别的自定义指标来自动调整 Pod 的数量。具体含义如下：

- `type: Pods`：这表明这个指标是基于每个 Pod 的性能指标来衡量的。在 HPA 中，可以基于资源（如 CPU 和内存）或自定义指标（Pods 或 Object）来进行自动伸缩。

- `pods`：这个字段指定了关于 Pod 指标的详细信息。
  
  - `metric`：
    - `name: nginx_http_requests`：这是要监控的具体指标的名称。在这个例子中，指标名称是 `nginx_http_requests`。这意味着 HPA 将使用名为 `nginx_http_requests` 的指标来评估是否需要扩展或缩减 Pod 的数量。

  - `target`：
    - `type: AverageValue`：这表示 HPA 将根据 Pod 指标的平均值来决定是否需要进行伸缩。这与单个 Pod 的绝对值或总和相对。
    - `averageValue: 50`：这是 Pod 指标的目标平均值。在这个例子中，如果所有 Pod 的 `nginx_http_requests` 指标的平均值超过 50，HPA 就会触发扩展操作（增加 Pod 的数量）。如果平均值低于 50，HPA 则可能触发缩减操作（减少 Pod 的数量），前提是 Pod 的数量大于最小副本数。

综上所述，这部分配置的含义是：HPA 将监控名为 `nginx_http_requests` 的自定义 Pod 指标，当这个指标的平均值超过或低于 50 时，将根据配置的规则自动调整 Pod 的数量。

在您提供的输出中，Pod 指标 `nginx_http_requests` 的目标平均值是通过 Kubernetes HPA (Horizontal Pod Autoscaler) 配置设定的。这个值用于确定何时扩展或缩减 Pod 的数量。在您的 `hpa.yaml` 配置文件中，这个值被设置为 `50`。

### 解释您的 `kubectl` 命令输出

您的命令 `kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/nginx_http_requests"` 用于查询名为 `nginx_http_requests` 的自定义指标，该指标应用于 `default` 命名空间中的所有 Pods。

输出的解释如下：

- `"kind": "MetricValueList"`: 指示返回的数据是一个指标值列表。
- `"apiVersion": "custom.metrics.k8s.io/v1beta1"`: 表示使用的是 Kubernetes 自定义指标 API 的特定版本。
- `"items"`: 包含了获取到的指标数据列表，每个元素代表一个 Pod 的指标数据。
  - 在提供的数据中，有一个 Pod（名为 `nginx-with-exporter-78596bfc95-2zmk4`）的指标数据被列出。
  - `"metricName": "nginx_http_requests"` 表示查询的指标名称。
  - `"value": "33m"` 表示这个 Pod 的 `nginx_http_requests` 指标值。这里的 `33m` 是一个以毫为单位的数值（m 表示 milli，即千分之一）。因此，`33m` 表示 0.033。

### 关于目标平均值

在 HPA 配置中，`averageValue: 50` 表示 HPA 将会根据 `nginx_http_requests` 指标的平均值来决定是否对 Pod 进行伸缩。如果所有 Pods 的 `nginx_http_requests` 指标的平均值超过 50，HPA 将触发增加 Pods 的数量。如果平均值低于 50，且 Pod 的数量大于最小副本数，则可能触发减少 Pods 的数量。

在您的例子中，单个 Pod 的指标值是 `0.033`，如果所有 Pods 的平均值低于 50，HPA 将不会触发增加 Pods 的操作。如果有多个 Pods，它们的平均值会被计算并与 HPA 配置中的阈值 50 进行比较。

averageValue: 50 表示您希望每个 Nginx Pod 平均处理的 HTTP 请求数量维持在 50。

在您的 `kubectl get --raw` 命令输出中，`"value": "33m"` 表示在某一时刻，特定 Nginx Pod（`nginx-with-exporter-78596bfc95-2zmk4`）的 `nginx_http_requests` 指标的值。这个值与 HPA 配置中的 `averageValue: 50` 有直接关系。下面解释这两者之间的关系：

1. **单个 Pod 的指标值 (`"value": "33m"`)**：
   - 这个值表示在给定的时间戳（`"timestamp": "2024-01-05T15:50:05Z"`）时，Pod `nginx-with-exporter-78596bfc95-2zmk4` 的 `nginx_http_requests` 指标值为 `33m`（即 0.033）。这个数值可能代表了该 Pod 在一个特定时间窗口内处理的 HTTP 请求的速率或总数。

2. **HPA 中的目标平均值 (`averageValue: 50`)**：
   - 在 HPA 配置中，`averageValue: 50` 表示 Kubernetes 将尝试保持所有 Nginx Pods 的 `nginx_http_requests` 指标的平均值接近 50。这个值是一个目标或阈值，用于引导 HPA 的扩缩容决策。

3. **二者之间的关系**：
   - HPA 将计算所有 Nginx Pods 的 `nginx_http_requests` 指标的当前平均值，并将这个平均值与 HPA 配置中设置的目标平均值（50）进行比较。
   - 如果实际的平均值超过 50，则 HPA 可能会增加 Pods 的数量以降低每个 Pod 的平均负载。
   - 如果实际的平均值低于 50，并且当前 Pods 的数量大于最小副本数，HPA 可能会减少 Pods 的数量。

### 结论

`"value": "33m"` 是一个特定时间点上，一个特定 Pod 的 `nginx_http_requests` 指标的实际值。这个值是 HPA 计算所有 Pods 的 `nginx_http_requests` 指标平均值的一部分。HPA 会将这个平均值与其配置中的 `averageValue: 50` 进行比较，以决定是否需要调整 Pod 的数量以应对当前的负载情况。
~~~

~~~powershell
# kubectl apply  -f hpa.yaml
~~~

~~~powershell
# kubectl get hpa
NAME        REFERENCE                        TARGETS                              MINPODS   MAXPODS   REPLICAS   AGE
nginx-hpa   Deployment/nginx-with-exporter   13252608/150Mi, 20m/50 + 1 more...   1         5         2          15s
~~~

~~~powershell
# kubectl describe hpa nginx-hpa
Name:                     nginx-hpa
Namespace:                default
Labels:                   <none>
Annotations:              autoscaling.alpha.kubernetes.io/conditions:
                            [{"type":"AbleToScale","status":"True","lastTransitionTime":"2024-01-05T15:21:13Z","reason":"ScaleDownStabilized","message":"recent recomm...
                          autoscaling.alpha.kubernetes.io/current-metrics:
                            [{"type":"Resource","resource":{"name":"memory","currentAverageValue":"13252608"}},{"type":"Pods","pods":{"metricName":"nginx_http_request...
                          autoscaling.alpha.kubernetes.io/metrics:
                            [{"type":"Resource","resource":{"name":"memory","targetAverageValue":"150Mi"}},{"type":"Pods","pods":{"metricName":"nginx_http_requests","...
CreationTimestamp:        Fri, 05 Jan 2024 23:20:58 +0800
Reference:                Deployment/nginx-with-exporter
Target CPU utilization:   70%
Current CPU utilization:  0%
Min replicas:             1
Max replicas:             5
Deployment pods:          2 current / 2 desired
Events:                   <none>
[root@k8s-master01 hpadir]# kubectl describe hpa nginx-hpa
Name:                     nginx-hpa
Namespace:                default
Labels:                   <none>
Annotations:              autoscaling.alpha.kubernetes.io/conditions:
                            [{"type":"AbleToScale","status":"True","lastTransitionTime":"2024-01-05T15:21:13Z","reason":"ScaleDownStabilized","message":"recent recomm...
                          autoscaling.alpha.kubernetes.io/current-metrics:
                            [{"type":"Resource","resource":{"name":"memory","currentAverageValue":"13252608"}},{"type":"Pods","pods":{"metricName":"nginx_http_request...
                          autoscaling.alpha.kubernetes.io/metrics:
                            [{"type":"Resource","resource":{"name":"memory","targetAverageValue":"150Mi"}},{"type":"Pods","pods":{"metricName":"nginx_http_requests","...
CreationTimestamp:        Fri, 05 Jan 2024 23:20:58 +0800
Reference:                Deployment/nginx-with-exporter
Target CPU utilization:   70%
Current CPU utilization:  0%
Min replicas:             1
Max replicas:             5
Deployment pods:          2 current / 2 desired
Events:                   <none>
~~~

~~~powershell
# yum -y install httpd-tools
~~~

~~~powershell
# ab -c 1000 -n 1000000 http://10.109.183.119/
~~~

~~~powershell
命令说明：
-n 1000000 总共发送1000000个请求
-c 1000 并发量为1000
~~~

~~~powershell
输出：
This is ApacheBench, Version 2.3 <$Revision: 1430300 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking 10.109.183.119 (be patient)
Completed 100000 requests
Completed 200000 requests
Completed 300000 requests
Completed 400000 requests
Completed 500000 requests
Completed 600000 requests
apr_socket_recv: Connection reset by peer (104)
Total of 682489 requests completed
~~~

~~~powershell
# kubectl describe hpa nginx-hpa
Name:                     nginx-hpa
Namespace:                default
Labels:                   <none>
Annotations:              autoscaling.alpha.kubernetes.io/conditions:
                            [{"type":"AbleToScale","status":"True","lastTransitionTime":"2024-01-05T15:21:13Z","reason":"ScaleDownStabilized","message":"recent recomm...
                          autoscaling.alpha.kubernetes.io/current-metrics:
                            [{"type":"Resource","resource":{"name":"memory","currentAverageValue":"18857984"}},{"type":"Pods","pods":{"metricName":"nginx_http_request...
                          autoscaling.alpha.kubernetes.io/metrics:
                            [{"type":"Resource","resource":{"name":"memory","targetAverageValue":"150Mi"}},{"type":"Pods","pods":{"metricName":"nginx_http_requests","...
CreationTimestamp:        Fri, 05 Jan 2024 23:20:58 +0800
Reference:                Deployment/nginx-with-exporter
Target CPU utilization:   70%
Current CPU utilization:  0%
Min replicas:             1
Max replicas:             5
Deployment pods:          5 current / 5 desired
Events:
  Type    Reason             Age    From                       Message
  ----    ------             ----   ----                       -------
  Normal  SuccessfulRescale  2m30s  horizontal-pod-autoscaler  New size: 4; reason: pods metric nginx_http_requests above target
  Normal  SuccessfulRescale  2m15s  horizontal-pod-autoscaler  New size: 5; reason: pods metric nginx_http_requests above target
~~~

~~~powershell
# kubectl get pods
NAME                                   READY   STATUS    RESTARTS   AGE
nginx-with-exporter-78596bfc95-2zmk4   2/2     Running   0          38m
nginx-with-exporter-78596bfc95-8jpxp   2/2     Running   0          38m
nginx-with-exporter-78596bfc95-9uacd   2/2     Running   0          38m
nginx-with-exporter-78596bfc95-4abcd   2/2     Running   0          38m
nginx-with-exporter-78596bfc95-14ced   2/2     Running   0          38m
~~~

~~~powershell
等待进入冷却期：
# kubectl describe hpa nginx-hpa
Name:                     nginx-hpa
Namespace:                default
Labels:                   <none>
Annotations:              autoscaling.alpha.kubernetes.io/conditions:
                            [{"type":"AbleToScale","status":"True","lastTransitionTime":"2024-01-05T15:21:13Z","reason":"SucceededRescale","message":"the HPA controll...
                          autoscaling.alpha.kubernetes.io/current-metrics:
                            [{"type":"Resource","resource":{"name":"memory","currentAverageValue":"21565440"}},{"type":"Pods","pods":{"metricName":"nginx_http_request...
                          autoscaling.alpha.kubernetes.io/metrics:
                            [{"type":"Resource","resource":{"name":"memory","targetAverageValue":"150Mi"}},{"type":"Pods","pods":{"metricName":"nginx_http_requests","...
CreationTimestamp:        Fri, 05 Jan 2024 23:20:58 +0800
Reference:                Deployment/nginx-with-exporter
Target CPU utilization:   70%
Current CPU utilization:  0%
Min replicas:             1
Max replicas:             5
Deployment pods:          5 current / 1 desired
Events:
  Type    Reason             Age    From                       Message
  ----    ------             ----   ----                       -------
  Normal  SuccessfulRescale  8m10s  horizontal-pod-autoscaler  New size: 4; reason: pods metric nginx_http_requests above target
  Normal  SuccessfulRescale  7m55s  horizontal-pod-autoscaler  New size: 5; reason: pods metric nginx_http_requests above target
  Normal  SuccessfulRescale  9s     horizontal-pod-autoscaler  New size: 1; reason: All metrics below target
~~~

~~~powershell
# kubectl get pods
NAME                                   READY   STATUS    RESTARTS   AGE
nginx-with-exporter-78596bfc95-2zmk4   2/2     Running   0          40m
~~~

