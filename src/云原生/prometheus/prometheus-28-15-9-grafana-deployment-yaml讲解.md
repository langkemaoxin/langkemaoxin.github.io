---
title: 15.9 grafana-deployment-yaml讲解
sidebarGroup: Prometheus
shortTitle: 28 15.9 grafana-deploymen...
order: 28
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - grafana yaml讲解 grafana 需要的pv - 对应的路径为 /var/lib/grafana，主要存放的内容有 - 本地sqlit db存放 grafana.db...'
---

> **Prometheus · 第 28 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- grafana yaml讲解

## grafana 需要的pv

- 对应的路径为 /var/lib/grafana，主要存放的内容有
  - 本地sqlit db存放 grafana.db
  - 本地插件
  - 本地告警截图
- yaml如下

```yaml
---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: grafana-pv
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: grafana-storageclass
  local:
    path: /data/grafana
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-node01
```

## grafana-storageclass

- WaitForFirstConsumer 延迟挂载

```yaml
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: grafana-storageclass
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer

```

## pvc

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: grafana-storageclass
  resources:
    requests:
      storage: 1Gi
```

## 对外暴露服务的nodeport

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-node-port
  labels:
    name: grafana-node-port
spec:
  type: NodePort      #这里代表是NodePort类型的
  ports:
  - port: 80          #这里的端口和clusterIP 对应，即80,供内部访问。
    targetPort: 3000  #端口一定要和container暴露出来的端口对应，nodejs暴露出来的端口是8081，所以这里也应是8081
    protocol: TCP
    nodePort: 30000   # 所有的节点都会开放此端口，此端口供外部调用。
  selector:
    app: grafana           #这里选择器一定要选择容器的标签，之前写name:kube-node是错的。
```

## grafana deployment

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: grafana
  name: grafana
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472
        supplementalGroups:
        - 0
      containers:
        - name: grafana
          image: grafana/grafana:7.5.2
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http-grafana
              protocol: TCP
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /robots.txt
              port: 3000
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 30
            successThreshold: 1
            timeoutSeconds: 2
          livenessProbe:
            failureThreshold: 3
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: 3000
            timeoutSeconds: 1
          resources:
            requests:
              cpu: 250m
              memory: 750Mi
          volumeMounts:
            - mountPath: /var/lib/grafana
              name: grafana-pv
      volumes:
        - name: grafana-pv
          persistentVolumeClaim:
            claimName: grafana-pvc
```

- 就绪探针使用 /robots.txt
- 存活探针使用 tcp 3000端口的检测
- securityContext.fsGroup= 472 表示允许id=472的 用户组使用卷
- supplementalGroups:0 控制容器可以添加的组 ID

# 完整的grafana deployment yaml如下

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: grafana-storageclass
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: grafana
  name: grafana
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472
        supplementalGroups:
        - 0
      containers:
        - name: grafana
          image: grafana/grafana:7.5.2
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http-grafana
              protocol: TCP
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /robots.txt
              port: 3000
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 30
            successThreshold: 1
            timeoutSeconds: 2
          livenessProbe:
            failureThreshold: 3
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: 3000
            timeoutSeconds: 1
          resources:
            requests:
              cpu: 250m
              memory: 750Mi
          volumeMounts:
            - mountPath: /var/lib/grafana
              name: grafana-pv
      volumes:
        - name: grafana-pv
          persistentVolumeClaim:
            claimName: grafana-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-node-port
  labels:
    name: grafana-node-port
spec:
  type: NodePort      #这里代表是NodePort类型的
  ports:
  - port: 80          #这里的端口和clusterIP 对应，即80,供内部访问。
    targetPort: 3000  #端口一定要和container暴露出来的端口对应，nodejs暴露出来的端口是8081，所以这里也应是8081
    protocol: TCP
    nodePort: 30000   # 所有的节点都会开放此端口，此端口供外部调用。
  selector:
    app: grafana           #这里选择器一定要选择容器的标签，之前写name:kube-node是错的。
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: grafana-storageclass
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: grafana-pv
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: grafana-storageclass
  local:
    path: /data/grafana
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-node01

```

# 本节重点总结 :

- grafana yaml讲解

