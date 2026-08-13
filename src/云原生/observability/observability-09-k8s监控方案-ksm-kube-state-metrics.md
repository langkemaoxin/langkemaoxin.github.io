---
title: k8s监控方案 KSM （kube-state-metrics）
sidebarGroup: 可观测性
shortTitle: 09 k8s监控方案 KSM （kube-stat...
order: 9
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 可观测性
  - 云原生
  - 课程笔记
description: k8s监控方案 KSM （kube-state-metrics） 一、kube-state-metrics（KSM）是什么？ 如需监控k8s比较全面的资源指标，需要在集群内安装相应的exports，例...
---

> **可观测性 · 第 9 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# k8s监控方案 KSM （kube-state-metrics）

# 一、kube-state-metrics（KSM）是什么？

如需监控k8s比较全面的资源指标，需要在集群内安装相应的exports，例如：CAdvisor，kube-state-metrics

- CAdvisor: 已集成在kubelet内，不需要单独安装,它可以收集集群内容器的cpu,内存等指标；

- kube-state-metrics： kube-state-metrics可以轮询api-server，可以监听 add、delete、update等事件,如仅有CAdvisor这些基本指标去监控,维度还是不够的，例如：对Deployment，Pod，Daemonset，Cronjob等k8s资源对象并没有监控，例如：replace是多少？Pod当前状态（pending or running?），CAdvisor并没有对具体的资源对象就行监控，因此就需引用新的exports来暴漏监控指标，这个exports就是kube-state-metrics；

- kube-state-metrics关注于获取k8s各种资源的最新状态，如deployment或者daemonset，之所以没有把kube-state-metrics纳入到metric-server的能力中，是因为它们的关注点本质上是不一样的。metric-server仅仅是获取、格式化现有数据，写入特定的存储，实质上是一个监控系统；而kube-state-metrics是将k8s的运行状况在内存中做了个快照，并且获取新的指标，但它没有能力导出这些指标。

# 二、KSM可以监控K8S哪些资源？

- 容器资源指标
- 微服务容器指标

# 三、Prometheus监控及K8S集群准备

## 3.1 重新运行Prometheus监控系统

> 由于早期使用docker部署Prometheus系统仅挂载了配置文件prometheus.yaml，后续需要添加kube.token到/etc/prometheus中。

~~~powershell
docker run -d \
--privileged=true \
-u root \
--restart=always \
-p 9090:9090 \
-v /opt/prometheus/config/:/etc/prometheus \
-v /opt/prometheus/data:/prometheus \
-v /opt/prometheus/rules:/usr/local/prometheus/rules \
prom/prometheus:latest \
--storage.tsdb.retention.time=100d \
--config.file=/etc/prometheus/prometheus.yml
~~~

## 3.2 K8S集群准备

> 本次监控的K8S集群版本为1.26.3，已使用kubespray部署。

> 需要注意后续kubelet配置修改，不能的部署方式，修改kubelet文件可能不同。

# 四、kube-state-metrics部署

## 4.1 获取kube-state-metrics部署文件

![image-20230710214457805](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710214457805.png)

![image-20230710214518914](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710214518914.png)

![image-20230710214955316](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710214955316.png)

~~~powershell
在k8s集群master节点上clone
# git clone https://github.com/kubernetes/kube-state-metrics.git
~~~

~~~powershell
切换clone下载目录
# cd kube-state-metrics/
~~~

~~~powershell
切换对应tag
# git checkout v2.9.2
~~~

~~~powershell
切换到标准部署目录
# cd examples/standard/
~~~

~~~powershell
查看目录中部署描述文件
# ls
cluster-role-binding.yaml  cluster-role.yaml  deployment.yaml  service-account.yaml  service.yaml
~~~

## 4.2 部署前修改部署描述文件

~~~powershell
[root@node1 standard]# vim cluster-role.yaml
[root@node1 standard]# cat cluster-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: 2.9.2
  name: kube-state-metrics
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  - secrets
  - nodes
  - pods
  - services
  - serviceaccounts
  - resourcequotas
  - replicationcontrollers
  - limitranges
  - persistentvolumeclaims
  - persistentvolumes
  - namespaces
  - endpoints
  verbs:
  - list
  - watch
- apiGroups:
  - apps
  resources:
  - statefulsets
  - daemonsets
  - deployments
  - replicasets
  verbs:
  - list
  - watch
- apiGroups:
  - batch
  resources:
  - cronjobs
  - jobs
  verbs:
  - list
  - watch
- apiGroups:
  - autoscaling
  resources:
  - horizontalpodautoscalers
  verbs:
  - list
  - watch
- apiGroups:
  - authentication.k8s.io
  resources:
  - tokenreviews
  verbs:
  - create
- apiGroups:
  - authorization.k8s.io
  resources:
  - subjectaccessreviews
  verbs:
  - create
- apiGroups:
  - policy
  resources:
  - poddisruptionbudgets
  verbs:
  - list
  - watch
- apiGroups:
  - certificates.k8s.io
  resources:
  - certificatesigningrequests
  verbs:
  - list
  - watch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - list
  - watch
- apiGroups:
  - storage.k8s.io
  resources:
  - storageclasses
  - volumeattachments
  verbs:
  - list
  - watch
- apiGroups:
  - admissionregistration.k8s.io
  resources:
  - mutatingwebhookconfigurations
  - validatingwebhookconfigurations
  verbs:
  - list
  - watch
- apiGroups:
  - networking.k8s.io
  resources:
  - networkpolicies
  - ingressclasses
  - ingresses
  verbs:
  - list
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - list
  - watch
- apiGroups:
  - rbac.authorization.k8s.io
  resources:
  - clusterrolebindings
  - clusterroles
  - rolebindings
  - roles
  verbs:
  - list
  - watch
~~~

~~~powershell
[root@node1 standard]# vim cluster-role-binding.yaml
[root@node1 standard]# cat cluster-role-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: 2.9.2
  name: kube-state-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-state-metrics
subjects:
- kind: ServiceAccount
  name: kube-state-metrics
  namespace: ops-monit  添加了一个命名空间
~~~

~~~powershell
[root@node1 standard]# vim deployment.yaml
[root@node1 standard]# cat deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: 2.9.2
  name: kube-state-metrics
  namespace: ops-monit 修改命名空间
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: kube-state-metrics
  template:
    metadata:
      labels:
        app.kubernetes.io/component: exporter
        app.kubernetes.io/name: kube-state-metrics
        app.kubernetes.io/version: 2.9.2
    spec:
      automountServiceAccountToken: true 在大于1.24版本的K8S集群中，此行不生效
      containers:
      - image: registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.9.2
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          timeoutSeconds: 5
        name: kube-state-metrics
        ports:
        - containerPort: 8080
          name: http-metrics
        - containerPort: 8081
          name: telemetry
        readinessProbe:
          httpGet:
            path: /
            port: 8081
          initialDelaySeconds: 5
          timeoutSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 65534
          seccompProfile:
            type: RuntimeDefault
      nodeSelector:
        kubernetes.io/os: linux
      serviceAccountName: kube-state-metrics
~~~

~~~powershell
service类型为NodePort，并分别添加nodePort端口

[root@node1 standard]# vim service.yaml
[root@node1 standard]# cat service.yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: 2.9.2
  name: kube-state-metrics
  namespace: ops-monit
spec:
  type: NodePort
  ports:
  - name: http-metrics
    port: 8080
    targetPort: http-metrics
    nodePort: 30866
  - name: telemetry
    port: 8081
    targetPort: telemetry
    nodePort: 30867
  selector:
    app.kubernetes.io/name: kube-state-metrics
~~~

>8080 端口返回的内容就是各类 Kubernetes 对象信息，比如 node 相关的信息
>
>8081 端口，暴露的是 KSM 自身的指标，KSM 要调用 APIServer 的接口，watch 相关数据，需要度量这些动作的健康状况

~~~powershell
[root@node1 standard]# vim service-account.yaml
[root@node1 standard]# cat service-account.yaml
apiVersion: v1
automountServiceAccountToken: false
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: 2.9.2
  name: kube-state-metrics
  namespace: ops-monit 修改命名空间
~~~

~~~powershell
由于K8S集群为1.26版本，需要用户自己行创建secret
[root@node1 standard]# vim kube-state-metrics-token.yaml
[root@node1 standard]# cat kube-state-metrics-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: kube-state-metrics
  namespace: ops-monit
  annotations:
    kubernetes.io/service-account.name: kube-state-metrics
type: kubernetes.io/service-account-token
~~~

## 4.3 执行部署描述文件

~~~powershell
[root@node1 standard]# kubectl apply -f .
~~~

~~~powershell
[root@node1 standard]# kubectl get all -n ops-monit
NAME                                      READY   STATUS    RESTARTS   AGE
pod/kube-state-metrics-7bc9d484b6-j46bk   1/1     Running   0          18m

NAME                         TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)                         AGE
service/kube-state-metrics   NodePort   10.233.23.145   <none>        8080:30866/TCP,8081:30867/TCP   18m

NAME                                 READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/kube-state-metrics   1/1     1            1           18m

NAME                                            DESIRED   CURRENT   READY   AGE
replicaset.apps/kube-state-metrics-7bc9d484b6   1         1         1      18m
~~~

~~~powershell
[root@node1 standard]# kubectl get secret -n ops-monit
NAME                 TYPE                                  DATA   AGE
kube-state-metrics   kubernetes.io/service-account-token   3      5h19m
~~~

## 4.4 验证service是否可访问

~~~powershell
# curl http://192.168.10.160:30866/healthz
OK
~~~

~~~powershell
# curl http://192.168.10.160:30867/healthz
OK
~~~

# 五、修改promethues.yml文件添加监控配置

## 5.1 添加监控配置

> 以下为添加内容

~~~powershell
  - job_name: 'k8s-cadvisor'
    scrape_interval: 60s
    scrape_timeout: 60s
    metrics_path: /metrics/cadvisor
    kubernetes_sd_configs:  # kubernetes 自动发现
    - api_server: https://192.168.10.160:6443  # apiserver 地址
      role: node  # node 类型的自动发现
      namespaces:
        names:
        - ops-monit
      bearer_token_file: k8s.token
      tls_config:
        insecure_skip_verify: true
    bearer_token_file: k8s.token
    tls_config:
      insecure_skip_verify: true
    relabel_configs:
    - source_labels: [__address__]
      regex: '(.*):10250'
      replacement: '${1}:10255'
      target_label: __address__
      action: replace
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)

    metric_relabel_configs:
    - source_labels: [instance]
      separator: ;
      regex: (.+)
      target_label: node
      replacement: $1
      action: replace

    - source_labels: [pod_name]
      separator: ;
      regex: (.+)
      target_label: pod
      replacement: $1
      action: replace
    - source_labels: [container_name]
      separator: ;
      regex: (.+)
      target_label: container
      replacement: $1
      action: replace

  - job_name: kube-state-metrics-1
    kubernetes_sd_configs:
    - api_server: https://192.168.10.160:6443  # apiserver 地址
      role: endpoints  # 端点类型的自动发现
      namespaces:
        names:
        - ops-monit      
      bearer_token_file: k8s.token
      tls_config:
        insecure_skip_verify: true
    bearer_token_file: k8s.token
    tls_config:
      insecure_skip_verify: true
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - separator: ;
      regex: (.*)
      target_label: __address__
      replacement: 192.168.10.160:30866
    - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
      regex: kube-state-metrics
      replacement: $1
      action: keep
    - action: labelmap
      regex: __meta_kubernetes_service_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: k8s_namespace
    - source_labels: [__meta_kubernetes_service_name]
      action: replace
      target_label: k8s_sname
      
  - job_name: kube-state-metrics-2
    kubernetes_sd_configs:
    - api_server: https://192.168.10.160:6443  # apiserver 地址
      role: endpoints  # 端点类型的自动发现
      namespaces:
        names:
        - ops-monit
      bearer_token_file: k8s.token
      tls_config:
        insecure_skip_verify: true
    bearer_token_file: k8s.token
    tls_config:
      insecure_skip_verify: true
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - separator: ;
      regex: (.*)
      target_label: __address__
      replacement: 192.168.10.160:30867
    - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
      regex: kube-state-metrics
      replacement: $1
      action: keep
    - action: labelmap
      regex: __meta_kubernetes_service_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: k8s_namespace
    - source_labels: [__meta_kubernetes_service_name]
      action: replace
      target_label: k8s_sname
~~~

~~~powershell
[root@monitorhost ~]# vim /opt/prometheus/config/prometheus.yml
[root@monitorhost ~]# cat  /opt/prometheus/config/prometheus.yml
# my global config
global:
  scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  # scrape_timeout is set to the global default (10s).

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['192.168.10.174:9093']
          # - alertmanager:9093

# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"
  - "/usr/local/prometheus/rules/*.yml"

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: "prometheus"

    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.

    static_configs:
      - targets: ["192.168.10.174:9090"]

  - job_name: "node_exporter_otherhost"
    static_configs:
      - targets: ["192.168.10.175:9100"]
  - job_name: "container-host-1"
    static_configs:
      - targets: ["192.168.10.176:8080"]

  - job_name: 'k8s-cadvisor'
    scrape_interval: 60s
    scrape_timeout: 60s
    metrics_path: /metrics/cadvisor
    kubernetes_sd_configs:  # kubernetes 自动发现
    - api_server: https://192.168.10.160:6443  # apiserver 地址
      role: node  # node 类型的自动发现
      namespaces:
        names:
        - ops-monit
      bearer_token_file: k8s.token
      tls_config:
        insecure_skip_verify: true
    bearer_token_file: k8s.token
    tls_config:
      insecure_skip_verify: true
    relabel_configs:
    - source_labels: [__address__]
      regex: '(.*):10250'
      replacement: '${1}:10255'
      target_label: __address__
      action: replace
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)

    metric_relabel_configs:
    - source_labels: [instance]
      separator: ;
      regex: (.+)
      target_label: node
      replacement: $1
      action: replace

    - source_labels: [pod_name]
      separator: ;
      regex: (.+)
      target_label: pod
      replacement: $1
      action: replace
    - source_labels: [container_name]
      separator: ;
      regex: (.+)
      target_label: container
      replacement: $1
      action: replace

  - job_name: kube-state-metrics-1
    kubernetes_sd_configs:
    - api_server: https://192.168.10.160:6443  # apiserver 地址
      role: endpoints  # 端点类型的自动发现
      namespaces:
        names:
        - ops-monit
      bearer_token_file: k8s.token
      tls_config:
        insecure_skip_verify: true
    bearer_token_file: k8s.token
    tls_config:
      insecure_skip_verify: true
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - separator: ;
      regex: (.*)
      target_label: __address__
      replacement: 192.168.10.160:30866
    - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
      regex: kube-state-metrics
      replacement: $1
      action: keep
    - action: labelmap
      regex: __meta_kubernetes_service_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: k8s_namespace
    - source_labels: [__meta_kubernetes_service_name]
      action: replace
      target_label: k8s_sname

  - job_name: kube-state-metrics-2
    kubernetes_sd_configs:
    - api_server: https://192.168.10.160:6443  # apiserver 地址
      role: endpoints  # 端点类型的自动发现
      namespaces:
        names:
        - ops-monit
      bearer_token_file: k8s.token
      tls_config:
        insecure_skip_verify: true
    bearer_token_file: k8s.token
    tls_config:
      insecure_skip_verify: true
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)
    - separator: ;
      regex: (.*)
      target_label: __address__
      replacement: 192.168.10.160:30867
    - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
      regex: kube-state-metrics
      replacement: $1
      action: keep
    - action: labelmap
      regex: __meta_kubernetes_service_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: k8s_namespace
    - source_labels: [__meta_kubernetes_service_name]
      action: replace
      target_label: k8s_sname
~~~

~~~powershell
关于监控项目解释说明：
job1：
job_name: 'k8s-cadvisor'：作业的名称为 'k8s-cadvisor'，用于识别该作业的唯一标识符。

scrape_interval: 60s：采集数据的时间间隔为 60 秒，即每隔 60 秒从目标获取一次指标数据。

scrape_timeout: 60s：在 60 秒内完成单次采集操作，超时后将终止该次采集。

metrics_path: /metrics/cadvisor：目标提供指标数据的路径为 '/metrics/cadvisor'。

kubernetes_sd_configs：Kubernetes 服务发现配置，用于指定要监控的 Kubernetes 节点。

api_server: https://192.168.10.160:6443：Kubernetes API 服务器的地址。
role: node：指定要监控的角色为节点。
namespaces：指定要监控的命名空间。
names: ['ops-monit']：指定要监控的命名空间为 'ops-monit'。
bearer_token_file: k8s.token：指定用于身份验证的令牌文件的路径。
tls_config：配置用于与 Kubernetes API 服务器建立安全连接的 TLS 设置。
insecure_skip_verify: true：忽略对服务器证书的验证。
bearer_token_file: k8s.token：指定用于身份验证的令牌文件的路径。

tls_config：配置用于与目标建立安全连接的 TLS 设置。

insecure_skip_verify: true：忽略对服务器证书的验证。
relabel_configs：标签重写配置，用于更改指标数据的标签值。

第一个 relabel 配置：
source_labels: [__address__]：指定源标签为 'address'，即原始地址标签。
regex: '(.*):10250'：使用正则表达式匹配地址，并捕获匹配组。
replacement: '${1}:10255'：将匹配组替换为新的地址。
target_label: __address__：指定目标标签为 'address'，即目标地址标签。
action: replace：替换操作，将新的地址值应用到目标地址标签上。
第二个 relabel 配置：
action: labelmap：标签映射操作，用于从源标签中提取标签键值对。
regex: __meta_kubernetes_node_label_(.+)：使用正则表达式匹配源标签。
metric_relabel_configs：指标标签重写配置，用于更改指标数据的标签值。

第一个 metric_relabel 配置：
source_labels: [instance]：指定源标签为 'instance'。
separator: ;：标签值之间的分隔符为 ';'。
regex: (.+)：使用正则表达式匹配源标签的值，并捕获匹配组。
target_label: node：指定目标标签为 'node'。
replacement: $1：将匹配组替换为新的标签值。
action: replace：替换操作，将新的标签值应用到目标标签上。
第二个 metric_relabel 配置：
source_labels: [pod_name]：指定源标签为 'pod_name'。
separator: ;：标签值之间的分隔符为 ';'。
regex: (.+)：使用正则表达式匹配源标签的值，并捕获匹配组。
target_label: pod：指定目标标签为 'pod'。
replacement: $1：将匹配组替换为新的标签值。
action: replace：替换操作，将新的标签值应用到目标标签上。
第三个 metric_relabel 配置：
source_labels: [container_name]：指定源标签为 'container_name'。
separator: ;：标签值之间的分隔符为 ';'。
regex: (.+)：使用正则表达式匹配源标签的值，并捕获匹配组。
target_label: container：指定目标标签为 'container'。
replacement: $1：将匹配组替换为新的标签值。
action: replace：替换操作，将新的标签值应用到目标标签上。

~~~

~~~powershell
job2:
job_name: kube-state-metrics-1：定义了作业的名称为 'kube-state-metrics-1'，作为作业的唯一标识符。

kubernetes_sd_configs：Kubernetes 服务发现配置，用于指定要监控的 Kubernetes 资源。

api_server: https://192.168.10.160:6443：指定 Kubernetes API 服务器的地址。
role: endpoints：指定要监控的资源角色为端点（Endpoints）。
namespaces：指定要监控的命名空间。
names: ['ops-monit']：指定要监控的命名空间为 'ops-monit'。
bearer_token_file: k8s.token：指定用于身份验证的令牌文件的路径。
tls_config：配置用于与 Kubernetes API 服务器建立安全连接的 TLS 设置。
insecure_skip_verify: true：忽略对服务器证书的验证。
bearer_token_file: k8s.token：指定用于身份验证的令牌文件的路径。

tls_config：配置用于与目标建立安全连接的 TLS 设置。

insecure_skip_verify: true：忽略对服务器证书的验证。
relabel_configs：标签重写配置，用于更改指标数据的标签值。

第一个 relabel 配置：
action: labelmap：标签映射操作，用于从源标签中提取标签键值对。
regex: __meta_kubernetes_node_label_(.+)：使用正则表达式匹配源标签。
第二个 relabel 配置：
separator: ;：标签值之间的分隔符为 ';'。
regex: (.*)：使用正则表达式匹配所有内容。
target_label: __address__：指定目标标签为 'address'，即目标地址标签。
replacement: 192.168.10.160:30866：将目标地址标签的值替换为 '192.168.10.160:30866'。
第三个 relabel 配置：
source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]：指定源标签为 'app.kubernetes.io/name'。
regex: kube-state-metrics：使用正则表达式匹配源标签的值。
replacement: $1：将匹配的值作为替换结果。
action: keep：保留操作，保持该标签不变。
第四个 relabel 配置：
action: labelmap：标签映射操作，用于从源标签中提取标签键值对。
regex: __meta_kubernetes_service_label_(.+)：使用正则表达式匹配源标签。
第五个 relabel 配置：
source_labels: [__meta_kubernetes_namespace]：指定源标签为 '__meta_kubernetes_namespace'。
action: replace：替换操作，将源标签的值替换到目标标签上。
target_label: k8s_namespace：指定目标标签为 'k8s_namespace'。
第六个 relabel 配置：
source_labels: [__meta_kubernetes_service_name]：指定源标签为 '__meta_kubernetes_service_name'。
action: replace：替换操作，将源标签的值替换到目标标签上。
target_label: k8s_sname：指定目标标签为 'k8s_sname'。
这个配置文件定义了一个 Prometheus 作业，用于从 Kubernetes 的端点中收集指标数据。它通过标签重写和重标记来修改指标数据的标签，以便更好地组织和标识数据。其中的 relabel 配置用于提取和修改特定的标签值，以满足监控需求。
~~~

~~~powershell
job3:
job_name: kube-state-metrics-2：定义了作业的名称为 'kube-state-metrics-2'，作为作业的唯一标识符。

kubernetes_sd_configs：Kubernetes 服务发现配置，用于指定要监控的 Kubernetes 资源。

api_server: https://192.168.10.160:6443：指定 Kubernetes API 服务器的地址。
role: endpoints：指定要监控的资源角色为端点（Endpoints）。
namespaces：指定要监控的命名空间。
names: ['ops-monit']：指定要监控的命名空间为 'ops-monit'。
bearer_token_file: k8s.token：指定用于身份验证的令牌文件的路径。
tls_config：配置用于与 Kubernetes API 服务器建立安全连接的 TLS 设置。
insecure_skip_verify: true：忽略对服务器证书的验证。
bearer_token_file: k8s.token：指定用于身份验证的令牌文件的路径。

tls_config：配置用于与目标建立安全连接的 TLS 设置。

insecure_skip_verify: true：忽略对服务器证书的验证。
relabel_configs：标签重写配置，用于更改指标数据的标签值。

第一个 relabel 配置：
action: labelmap：标签映射操作，用于从源标签中提取标签键值对。
regex: __meta_kubernetes_node_label_(.+)：使用正则表达式匹配源标签。
第二个 relabel 配置：
separator: ;：标签值之间的分隔符为 ';'。
regex: (.*)：使用正则表达式匹配所有内容。
target_label: __address__：指定目标标签为 'address'，即目标地址标签。
replacement: 192.168.10.160:30867：将目标地址标签的值替换为 '192.168.10.160:30867'。
第三个 relabel 配置：
source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]：指定源标签为 'app.kubernetes.io/name'。
regex: kube-state-metrics：使用正则表达式匹配源标签的值。
replacement: $1：将匹配的值作为替换结果。
action: keep：保留操作，保持该标签不变。
第四个 relabel 配置：
action: labelmap：标签映射操作，用于从源标签中提取标签键值对。
regex: __meta_kubernetes_service_label_(.+)：使用正则表达式匹配源标签。
第五个 relabel 配置：
source_labels: [__meta_kubernetes_namespace]：指定源标签为 '__meta_kubernetes_namespace'。
action: replace：替换操作，将源标签的值替换到目标标签上。
target_label: k8s_namespace：指定目标标签为 'k8s_namespace'。
第六个 relabel 配置：
source_labels: [__meta_kubernetes_service_name]：指定源标签为 '__meta_kubernetes_service_name'。
action: replace：替换操作，将源标签的值替换到目标标签上。
target_label: k8s_sname：指定目标标签为 'k8s_sname'。
这个配置文件定义了另一个 Prometheus 作业，用于从 Kubernetes 的端点中收集指标数据。它与前一个配置文件的区别在于作业的名称、目标地址以及可能的标签映射。该作业配置用于特定的监控需求，可能对应不同的服务或命名空间。
~~~

## 5.2 创建k8s.token文件

~~~powershell
[root@node1 standard]# kubectl get secret -n ops-monit
NAME                 TYPE                                  DATA   AGE
kube-state-metrics   kubernetes.io/service-account-token   3      5h22m
~~~

~~~powershell
[root@node1 standard]# kubectl describe secret kube-state-metrics -n ops-monit
Name:         kube-state-metrics
Namespace:    ops-monit
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: kube-state-metrics
              kubernetes.io/service-account.uid: a753b1e3-ae99-4aad-b28c-41e73f05ef81

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1099 bytes
namespace:  9 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6ImFKV0lpdVJtamZzQ0hfQTJoTzE0eG1UV3ZXR0FtMUZXa3JMQ3hkVE13eEEifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJvcHMtbW9uaXQiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlY3JldC5uYW1lIjoia3ViZS1zdGF0ZS1tZXRyaWNzIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6Imt1YmUtc3RhdGUtbWV0cmljcyIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImE3NTNiMWUzLWFlOTktNGFhZC1iMjhjLTQxZTczZjA1ZWY4MSIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpvcHMtbW9uaXQ6a3ViZS1zdGF0ZS1tZXRyaWNzIn0.VFkluxzewLb7nIcIkl0K38WN8YqDSzCwPgET9rpNusasU5-y0ov2xIqCZvsjj13aZGE-MT8rBN-lFcUNPb9VlVIZWUPn4Vj71yFOqs5XlRCmu2BJ38jnPbjwu_wmYG4_SghlmY_ZLr3lS68N-YRVys8r_5OkTLN0qf0tXClVLgtHShktob7cdbOj_wVpYc5CLZK9DL291u3zl_NNf9VE7Os9GoN2-3QUlM6z-clk5dfqoDLfxRxb0nB13TIUyDQ-WDQ3pNZcjDO4DsgXC0UXFRXI2USBqyLyWnyPL8CdC_FwSRqLHk3NITH9SJ1GImh03j4GOtSdo_cTf8zmetzY-A
~~~

~~~powershell
以下命令亦可直接获取token值

[root@node1 standard]# kubectl describe secret kube-state-metrics -n ops-monit | grep token: | awk {'print $2'}
eyJhbGciOiJSUzI1NiIsImtpZCI6ImFKV0lpdVJtamZzQ0hfQTJoTzE0eG1UV3ZXR0FtMUZXa3JMQ3hkVE13eEEifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJvcHMtbW9uaXQiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlY3JldC5uYW1lIjoia3ViZS1zdGF0ZS1tZXRyaWNzIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6Imt1YmUtc3RhdGUtbWV0cmljcyIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImE3NTNiMWUzLWFlOTktNGFhZC1iMjhjLTQxZTczZjA1ZWY4MSIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpvcHMtbW9uaXQ6a3ViZS1zdGF0ZS1tZXRyaWNzIn0.VFkluxzewLb7nIcIkl0K38WN8YqDSzCwPgET9rpNusasU5-y0ov2xIqCZvsjj13aZGE-MT8rBN-lFcUNPb9VlVIZWUPn4Vj71yFOqs5XlRCmu2BJ38jnPbjwu_wmYG4_SghlmY_ZLr3lS68N-YRVys8r_5OkTLN0qf0tXClVLgtHShktob7cdbOj_wVpYc5CLZK9DL291u3zl_NNf9VE7Os9GoN2-3QUlM6z-clk5dfqoDLfxRxb0nB13TIUyDQ-WDQ3pNZcjDO4DsgXC0UXFRXI2USBqyLyWnyPL8CdC_FwSRqLHk3NITH9SJ1GImh03j4GOtSdo_cTf8zmetzY-A
~~~

~~~powershell
[root@monitorhost ~]# vim /opt/prometheus/config/k8s.token
[root@monitorhost ~]# cat /opt/prometheus/config/k8s.token
eyJhbGciOiJSUzI1NiIsImtpZCI6ImFKV0lpdVJtamZzQ0hfQTJoTzE0eG1UV3ZXR0FtMUZXa3JMQ3hkVE13eEEifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJvcHMtbW9uaXQiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlY3JldC5uYW1lIjoia3ViZS1zdGF0ZS1tZXRyaWNzIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6Imt1YmUtc3RhdGUtbWV0cmljcyIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImE3NTNiMWUzLWFlOTktNGFhZC1iMjhjLTQxZTczZjA1ZWY4MSIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpvcHMtbW9uaXQ6a3ViZS1zdGF0ZS1tZXRyaWNzIn0.VFkluxzewLb7nIcIkl0K38WN8YqDSzCwPgET9rpNusasU5-y0ov2xIqCZvsjj13aZGE-MT8rBN-lFcUNPb9VlVIZWUPn4Vj71yFOqs5XlRCmu2BJ38jnPbjwu_wmYG4_SghlmY_ZLr3lS68N-YRVys8r_5OkTLN0qf0tXClVLgtHShktob7cdbOj_wVpYc5CLZK9DL291u3zl_NNf9VE7Os9GoN2-3QUlM6z-clk5dfqoDLfxRxb0nB13TIUyDQ-WDQ3pNZcjDO4DsgXC0UXFRXI2USBqyLyWnyPL8CdC_FwSRqLHk3NITH9SJ1GImh03j4GOtSdo_cTf8zmetzY-A
~~~

## 5.3  重启Prometheus容器

~~~powershell
[root@monitorhost ~]# docker ps
CONTAINER ID   IMAGE                      COMMAND                   CREATED       STATUS       PORTS                                       NAMES
f3dd5576d750   prom/prometheus:latest     "/bin/prometheus --s…"   4 hours ago   Up 4 hours   0.0.0.0:9090->9090/tcp, :::9090->9090/tcp   amazing_boyd
adb646dc42c3   prom/alertmanager:latest   "/bin/alertmanager -…"   4 days ago    Up 2 days    0.0.0.0:9093->9093/tcp, :::9093->9093/tcp   alertmanager
1b3b4b73d822   grafana/grafana:latest     "/run.sh"                 4 days ago    Up 2 days    0.0.0.0:3000->3000/tcp, :::3000->3000/tcp   grafana
~~~

~~~powershell
[root@monitorhost ~]# docker restart f3dd5576d750
~~~

# 六、修改kubelet配置开启10255端口

>10250(kubelet API)：是kubelet与 API Server通信的端口，定期请求 API Server获取自己所应当处理的任务，通过该端口可以访问获取node资源以及状态。如果kubelet的10250端口对外暴露，攻击者可创建恶意pod或控制已有pod，后续可尝试逃逸至宿主机。
>
>10255(readonly API)：提供了pod和node的信息。如果对外开放，攻击者利用公开api可以获取敏感信息。

![image-20230710231357138](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710231357138.png)

~~~powershell
[root@nodeX ~]# vim /etc/kubernetes/kubelet.env
[root@nodeX ~]# cat /etc/kubernetes/kubelet.env
KUBE_LOG_LEVEL="--v=2"
KUBELET_ADDRESS="--node-ip=192.168.10.16X"
KUBELET_HOSTNAME="--hostname-override=nodeX"

KUBELET_ARGS="--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf \
--config=/etc/kubernetes/kubelet-config.yaml \
--kubeconfig=/etc/kubernetes/kubelet.conf \
--container-runtime=remote \
--container-runtime-endpoint=unix:///var/run/containerd/containerd.sock \
--runtime-cgroups=/system.slice/containerd.service \
--read-only-port=10255 \ 添加此行内容
  "
KUBELET_CLOUDPROVIDER=""

PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
~~~

~~~powershell
[root@nodeX ~]# systemctl restart kubelet
~~~

~~~powershell
[root@nodeX ~]# ss -anput | grep ":10255"
tcp    LISTEN     0      4096   192.168.10.16X:10255                 *:*                   users:(("kubelet",pid=61365,fd=24))
~~~

![image-20230710213039116](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213039116.png)

# 七、添加Grafana仪表盘实现监控可视化

![image-20230710213542986](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213542986.png)

![image-20230710213624671](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213624671.png)

![image-20230710213651742](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213651742.png)

![image-20230710213732307](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213732307.png)

![image-20230710213811597](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213811597.png)

![image-20230710213840760](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213840760.png)

![image-20230710213920166](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213920166.png)

![image-20230710213959608](/云原生/observability/observability-09-k8s监控方案-ksm-kube-state-metrics/image-20230710213959608.png)

# 八、PromQL语句(扩展可选)

Node节点数量监控

~~~powershell
kube_node_info{instance="192.168.10.160:30866"}
~~~

集群节点状态错误

> 监控集群节点状态是否错误，如果值为1就是有错误，可以告警。

~~~powershell
kube_node_status_condition{condition="Ready",status!="true"}==1
~~~

集群节点状态是否准备好

~~~powershell
kube_node_status_condition{condition='Ready',status='true'}
~~~

集群节点内存或硬盘资源是否短缺

~~~powershell
kube_node_status_condition{condition=~"OutOfDisk|MemoryPressure|DiskPressure",status!="false"}
~~~

集群中存在失败的PVC监控

~~~powershell
kube_persistentvolumeclaim_status_phase{phase="Failed"}
~~~

集群中存在启动失败的Pod监控

~~~powershell
kube_pod_status_phase{phase=~"Failed|Unknown"}
~~~

集群中已运行的容器

~~~powershell
kube_pod_container_status_running{namespace=~".*"}==1
~~~

集群中已停止的容器

~~~powershell
kube_pod_container_status_terminated{namespace=~".*"}==1
~~~

集群磁盘使用率

~~~powershell
(sum (node_filesystem_size_bytes{nodename=~".*"}) - sum (node_filesystem_free_bytes{nodename=~".*"})) / sum (node_filesystem_size_bytes{nodename=~".*"})
~~~

