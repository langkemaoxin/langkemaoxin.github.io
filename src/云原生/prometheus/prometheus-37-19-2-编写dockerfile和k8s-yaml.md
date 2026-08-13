---
title: "19.2 编写dockerfile和k8s yaml"
sidebarGroup: "Prometheus"
shortTitle: "37 19.2 编写dockerfile和k8s ..."
order: 37
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 编写Dockerfile - 编写k8s需要的yaml 编写Dockerfile 1. FROM 指定基础镜像 - 必须有的指令，并且必须是第一条指令 - Alpine 操作系统..."
---

> **Prometheus · 第 37 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : 
- 编写Dockerfile
- 编写k8s需要的yaml

# 编写Dockerfile

## 1. FROM 指定基础镜像
- 必须有的指令，并且必须是第一条指令
- Alpine 操作系统是一个面向安全的轻型 Linux 发行版。它不同于通常 Linux 发行版，Alpine 采用了 musl libc 和 busybox 以减小系统的体积和运行时资源消耗，但功能上比 busybox 又完善的多，因此得到开源社区越来越多的青睐。
```shell script
FROM golang:1.16-alpine as builder
```

## 2. WORKDIR 指定工作目录
- 使用 WORKDIR 指令可以来指定工作目录（或者称为当前目录），以后各层的当前目录就被改为指定的目录
- 如果目录不存在，WORKDIR 会帮你建立目录
```shell script
WORKDIR /usr/src/app
```

## 3. COPY 复制
- COPY 指令将从构建上下文目录中 <源路径> 的文件/目录复制到新的一层的镜像内的 <目标路径> 位置
- 格式
```shell script
COPY <源路径>... <目标路径>
COPY ["<源路径1>",... "<目标路径>"]
```
- 将go.mod 和 go.sum文件拷贝过来
```shell script
COPY ./go.mod ./
COPY ./go.sum ./
```

## 4. RUN 用于执行命令行命令
- 把镜像替换成阿里云，并且安装upx  ca-certificates tzdata包
```shell script
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
  apk add --no-cache upx ca-certificates tzdata
```

- 下载这个go项目中的依赖包
```shell script
RUN go mod download
```

- 执行编译命令
```shell script
RUN  CGO_ENABLED=0 go build -o ink8s-pod-metrics
```

## 5. ENTRYPOINT 带参数的执行
- 示例
```shell script
ENTRYPOINT [ "curl", "-s", "http://ip.cn" ]
```

## 完整的Dockerfile
```shell script
FROM golang:1.16-alpine as builder
WORKDIR /usr/src/app
ENV GOPROXY=https://goproxy.cn
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
  apk add --no-cache upx ca-certificates tzdata
COPY ./go.mod ./
COPY ./go.sum ./
RUN go mod download
COPY . .
RUN  CGO_ENABLED=0 go build -o ink8s-pod-metrics

FROM yauritux/busybox-curl  as runner
COPY --from=builder /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/src/app/ink8s-pod-metrics /opt/app/ink8s-pod-metrics
ENTRYPOINT [ "/opt/app/ink8s-pod-metrics" ]

```

# 编写k8s的yaml

## 编写rbac.yaml

### ServiceAccount
- default namespace
```shell script
--- 
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ink8s-pod-metrics
  namespace: default
```

### ClusterRole
- 需要获取pod和node
- 动作就是list
```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ink8s-pod-metrics
rules:
  - apiGroups:
      - ""
    resources:
      - nodes
      - pods
    verbs:
      - list
```

### ClusterRoleBinding
```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ink8s-pod-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ink8s-pod-metrics
subjects:
  - kind: ServiceAccount
    name: ink8s-pod-metrics
    namespace: default
```

### 完整的rbac.yaml
```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ink8s-pod-metrics
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ink8s-pod-metrics
rules:
  - apiGroups:
      - ""
    resources:
      - nodes
      - nodes/metrics
      - services
      - endpoints
      - pods
    verbs:
      - get
      - list
      - watch
  - nonResourceURLs:
      - "/metrics"
    verbs:
      - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ink8s-pod-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ink8s-pod-metrics
subjects:
  - kind: ServiceAccount
    name: ink8s-pod-metrics
    namespace: default
```

## 编写deployment的yaml

### metadata段
- 部署在 default namespace下
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ink8s-pod-metrics-deployment
  namespace: default
  labels:
    app: ink8s-pod-metrics-deployment
```

### prometheus 采集的相关配置
- 我们在使用pod自定义指标时在pod yaml 的spec.template.metadata.annotations中需要定义三个以`prometheus.io`开头的配置
- 释义
    - `prometheus.io/scrape ` 是否需要prometheus采集
    - `prometheus.io/port` metrics暴露的端口
    - `prometheus.io/path` metrics的http path信息
详细配置如下：

```yaml
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ink8s-pod-metrics
  template:
    metadata:
      labels:
        app: ink8s-pod-metrics
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8080'
        prometheus.io/path: 'metrics'
```

### 容器配置
- 端口是8080，和go代码中的一致
- 使用的镜像名字和dockerfile中 一致 ink8s-pod-metrics
```yaml
    spec:
      containers:
        - name: ink8s-pod-metrics
          image:  ink8s-pod-metrics:v1
          command:
            - /opt/app/ink8s-pod-metrics
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
            limits:
              cpu: 200m
              memory: 800Mi
      serviceAccountName: ink8s-pod-metrics
```

### 完整的
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ink8s-pod-metrics-deployment
  namespace: default
  labels:
    app: ink8s-pod-metrics-deployment

spec:
  replicas: 1
  selector:
    matchLabels:
      app: ink8s-pod-metrics
  template:
    metadata:
      labels:
        app: ink8s-pod-metrics
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8080'
        prometheus.io/path: 'metrics'
    spec:
      containers:
        - name: ink8s-pod-metrics
          image:  ink8s-pod-metrics:v1
          command:
            - /opt/app/ink8s-pod-metrics
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
            limits:
              cpu: 200m
              memory: 800Mi
      serviceAccountName: ink8s-pod-metrics
```

# 本节重点总结 : 
- 编写Dockerfile
- 编写k8s需要的yaml

