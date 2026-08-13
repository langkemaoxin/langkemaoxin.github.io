---
title: "15.7 创建prometheus的statsfulset配置"
sidebarGroup: "Prometheus"
shortTitle: "26 15.7 创建prometheus的stat..."
order: 26
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : prometheus statsfulset yaml配置 - 设置statsfulset副本反亲和性 - 设置pod运行优先级 - 设置volumeClaimTemplates -..."
---

> **Prometheus · 第 26 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : prometheus statsfulset yaml配置

- 设置statsfulset副本反亲和性
- 设置pod运行优先级
- 设置volumeClaimTemplates
- 设置配置文件热更新容器 configmap-reload
- 设置prometheus主容器

# statsfulset

## 设置元信息

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: kube-system
  labels:
    k8s-app: prometheus
    kubernetes.io/cluster-service: "true"
```

## 设置定义标签和标签选择器

```yaml
spec:
  serviceName: "prometheus"
  podManagementPolicy: "Parallel"
  replicas: 1
  selector:
    matchLabels:
      k8s-app: prometheus
  template:
    metadata:
      labels:
        k8s-app: prometheus
    
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
```

## 设置副本反亲和性

- spec.template.spec.affinity
- 多个statsfulset副本不要调度到同一个节点上
-

```yaml
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: k8s-app
                operator: In
                values:
                - prometheus
            topologyKey: "kubernetes.io/hostname"
```

## 设置为 Pod 提供的卷 volumes

- spec.template.spec.volumes
- 挂载etcd证书和配置文件

```yaml
      volumes:
        - name: config-volume
          configMap:
            name: prometheus-config
        - name: secret-volume
          secret:
            secretName: etcd-certs   
```

## 关键插件 Pod 的调度保证 priorityClassName

- 设置如下

```yaml
      priorityClassName: system-cluster-critical
```

- priorityClassName设置pod 的优先级
- system-cluster-critical代表将 pod 标记为关键性（critical）
- 这样设置可以 使当Pod 无法被调度，调度程序会尝试抢占（驱逐）较低优先级的 Pod， 以使悬决 Pod 可以被调度。.

## 为了访问prometheus更方便，设置主机网络

```yaml
hostNetwork: true
dnsPolicy: ClusterFirstWithHostNet
```

- 代表prometheus可以使用和主机一样的网络
- 同时设置 dns策略为 hostNetwork

## 设置serviceAccountName

```yaml
serviceAccountName: prometheus
```

## 设置volumeClaimTemplates

```yaml
  volumeClaimTemplates:
    - metadata:
        name: prometheus-data
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "prometheus-lpv"
        resources:
          requests:
            storage: 5Gi
```

## 设置第一个容器 prometheus-server-configmap-reload

- configmap-reload[项目地址](https://github.com/jimmidyson/configmap-reload)
- 它监视已安装的卷目录并通知目标进程配置的configmap已更改，然后发送http请求
- 我们使用它来做prometheus热更新配置

```yaml
      containers:
      - name: prometheus-server-configmap-reload
        image: "jimmidyson/configmap-reload:v0.4.0"
        imagePullPolicy: "IfNotPresent"
        args:
          - --volume-dir=/etc/config
          - --webhook-url=http://localhost:8091/-/reload
        volumeMounts:
          - name: config-volume
            mountPath: /etc/config
            readOnly: true
        resources:
          limits:
            cpu: 10m
            memory: 10Mi
          requests:
            cpu: 10m
            memory: 10Mi
```

- imagePullPolicy=IfNotPresent代表 镜像不存在时再拉取
- args代表启动的命令行参数
- volumeMounts代表 声明卷在容器中的挂载位置
- resources代表cpu内存资源情况
  - requests请求量
  - limits限制量

## 设置第二个容器 prometheus

```yaml
      - image: prom/prometheus:v2.29.1
        imagePullPolicy: IfNotPresent
        name: prometheus
        command:
          - "/bin/prometheus"
        args:
          - "--config.file=/etc/prometheus/prometheus.yml"
          - "--storage.tsdb.path=/prometheus"
          - "--storage.tsdb.retention=24h"
          - "--web.console.libraries=/etc/prometheus/console_libraries"
          - "--web.console.templates=/etc/prometheus/consoles"
          - "--web.enable-lifecycle"
          - "--web.listen-address=0.0.0.0:8091"
        ports:
          - containerPort: 8091
            protocol: TCP
        volumeMounts:
          - mountPath: "/prometheus"
            name: prometheus-data
          - mountPath: "/etc/prometheus"
            name: config-volume
          - name: secret-volume
            mountPath: "/etc/prometheus/secrets/etcd-certs"
            #readOnly: true
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 1000m
            memory: 2500Mi
        securityContext:
            runAsUser: 65534
            privileged: true
```

### readinessProbe 就绪探针

- kubelet 使用就绪探测器可以知道容器什么时候准备好了并可以开始接受请求流量
- 当一个 Pod 内的所有容器都准备好了，才能把这个 Pod 看作就绪了
- 这种信号的一个用途就是控制哪个 Pod 作为 Service 的后端
- 在 Pod 还没有准备好的时候，会从 Service 的负载均衡器中被剔除的。

### livenessProbe 存活探针

- kubelet 使用存活探测器来知道什么时候要重启容器
- 例如，存活探测器可以捕捉到死锁（应用程序在运行，但是无法继续执行后面的步骤）
- 这样的情况下重启容器有助于让应用程序在有问题的情况下更可用。

### securityContext 为 Pod 或容器配置安全性上下文

- runAsUser 以特定user运行容器
- privileged	运行特权容器

# 全部的配置 写入 statsfulset.yaml

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: kube-system
  labels:
    k8s-app: prometheus
    kubernetes.io/cluster-service: "true"
spec:
  serviceName: "prometheus"
  podManagementPolicy: "Parallel"
  replicas: 1
  selector:
    matchLabels:
      k8s-app: prometheus
  template:
    metadata:
      labels:
        k8s-app: prometheus
      
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: k8s-app
                operator: In
                values:
                - prometheus
            topologyKey: "kubernetes.io/hostname"
      priorityClassName: system-cluster-critical
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: prometheus-server-configmap-reload
        image: "jimmidyson/configmap-reload:v0.4.0"
        imagePullPolicy: "IfNotPresent"
        args:
          - --volume-dir=/etc/config
          - --webhook-url=http://localhost:8091/-/reload
        volumeMounts:
          - name: config-volume
            mountPath: /etc/config
            readOnly: true
        resources:
          limits:
            cpu: 10m
            memory: 10Mi
          requests:
            cpu: 10m
            memory: 10Mi
      - image: prom/prometheus:v2.29.1
        imagePullPolicy: IfNotPresent
        name: prometheus
        command:
          - "/bin/prometheus"
        args:
          - "--config.file=/etc/prometheus/prometheus.yml"
          - "--storage.tsdb.path=/prometheus"
          - "--storage.tsdb.retention=24h"
          - "--web.console.libraries=/etc/prometheus/console_libraries"
          - "--web.console.templates=/etc/prometheus/consoles"
          - "--web.enable-lifecycle"
          - "--web.listen-address=0.0.0.0:8091"
        ports:
          - containerPort: 8091
            protocol: TCP
        volumeMounts:
          - mountPath: "/prometheus"
            name: prometheus-data
          - mountPath: "/etc/prometheus"
            name: config-volume
          - name: secret-volume
            mountPath: "/etc/prometheus/secrets/etcd-certs"
            #readOnly: true
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 1000m
            memory: 2500Mi
        securityContext:
            runAsUser: 65534
            privileged: true
      serviceAccountName: prometheus
      volumes:
        - name: config-volume
          configMap:
            name: prometheus-config
        - name: secret-volume
          secret:
            secretName: etcd-certs   
  volumeClaimTemplates:
    - metadata:
        name: prometheus-data
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "prometheus-lpv"
        resources:
          requests:
            storage: 5Gi

```

# 本节重点总结 : prometheus statsfulset yaml配置

- 设置statsfulset副本反亲和性
- 设置pod运行优先级
- 设置volumeClaimTemplates
- 设置配置文件热更新容器 configmap-reload
- 设置prometheus主容器

