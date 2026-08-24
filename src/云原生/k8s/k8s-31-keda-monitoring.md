---
title: 事件驱动伸缩与集群监控——KEDA 与监控 UI
sidebarGroup: Kubernetes
shortTitle: 31 KEDA 伸缩
order: 31
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 超越 CPU/内存的伸缩：KEDA 按队列长度等外部指标驱动扩缩；集群 UI 与主机资源监控。
---

> **Kubernetes 系列 · 第 31/35 篇**  
> 上一篇：[《Service Mesh 与 Istio——Sidecar 架构与 Bookinfo》](/云原生/k8s/k8s-30-service-mesh-istio)

---

## 开头：HPA 只看 CPU/QPS，队列积压了怎么办

[第 08 篇](/云原生/k8s/k8s-08-hpa-cri-crd)我们用 HPA 按 CPU/内存扩缩容，[第 18 篇](/云原生/k8s/k8s-16-prometheus-hpa)接上 Prometheus 后按 QPS 扩，[第 19 篇](/云原生/k8s/k8s-17-custom-metrics)又打通了自定义指标。但生产里还有一类场景它们都不擅长：

1. **消息队列积压**——Kafka/RabbitMQ 里堆了 10 万条消息，消费者 Pod 的 CPU 却几乎不动（都在等 IO），HPA 毫无反应；
2. **定时伸缩**——后台批处理只在每天 02:00 跑，白天完全不需要副本，却得常驻跑着烧资源；
3. **缩到 0**——HPA 的最小副本数是 1，而低峰期我们希望一个副本都不留（0 → N → 0）。

这些「**事件**」驱动的伸缩，需要一个专门的组件：**KEDA**。本篇先讲清 HPA 的边界，再实操 KEDA 的 Cron 与 HTTP 两种 scaler，最后补上集群 UI（Dashboard）与主机资源监控（metrics-server / node-exporter + Prometheus + Grafana）——伸缩与监控是一体两面：**扩没扩、为什么扩，得靠监控看见**。作为系列收官篇，文末用一张表串起 01–30 篇的完整路线。

---

## 一、HPA 的边界

回顾本系列已经覆盖的三代伸缩方案：

| 方案 | 篇目 | 指标来源 | 局限 |
|------|------|----------|------|
| 原生 HPA | [08 篇](/云原生/k8s/k8s-08-hpa-cri-crd) | metrics-server（CPU/内存） | 对 IO 密集型、消费者型负载不敏感 |
| Prometheus + HPA | [18 篇](/云原生/k8s/k8s-16-prometheus-hpa) | Prometheus 采集的 QPS 等标准指标 | 指标仍以「应用自身」为中心 |
| 自定义指标 HPA | [19 篇](/云原生/k8s/k8s-17-custom-metrics) | custom-metrics API（任意 PromQL） | 配置链路长；仍难直接表达「队列长度→副本数」 |

核心缺口有两个：

- **外部指标场景**：真正的扩容信号在集群外——队列未消费条数、Cron 时间表、云厂商 SQS 深度。用 19 篇的 custom-metrics 固然能做，但要自己写 adapter 规则、自己管 `0 副本`的边界，工程量不小；
- **缩容到 0**：HPA 的 `minReplicas` 最小为 1。对于「没消息就完全空闲」的消费者，这 1 个副本是纯浪费。

> 💡 **一句话总结**：HPA 回答「负载高了加几个 Pod」，KEDA 回答「有没有事件需要这个 workload 存在」——它把「0 与 1 之间」的切换和外部事件源标准化了。

---

## 二、KEDA 事件驱动伸缩

### 2.1 KEDA 是什么：Operator + Scaler 架构

KEDA（Kubernetes Event-driven Autoscaling）是一个**轻量级、开源的事件驱动自动伸缩器**，专门用来补上 HPA 的上述缺口：

![KEDA 架构概览](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231211191222307.png)

它的工作方式：

1. KEDA 以 **Operator** 形态运行在集群内，通过 CRD（`ScaledObject`）接收伸缩配置；
2. 每个 `ScaledObject` 里声明若干 **Scaler**（触发器），Scaler 负责盯着外部事件源（Kafka、RabbitMQ、Cron、Prometheus……）；
3. 事件达到阈值时，KEDA 先把 Deployment 从 **0 副本拉到 1**（激活），然后**创建并托管一个原生 HPA**，由 HPA 按 scaler 提供的指标完成 1 → N 的伸缩；
4. 事件平息后，HPA 缩回 1，KEDA 再把 Deployment 缩到 **0**（去激活）。

所以 KEDA 不是替代 HPA，而是「**站在 HPA 肩膀上**」：它管理 HPA 的整个生命周期，我们只需要声明 `ScaledObject`。KEDA 内置 60+ 个 scaler（截稿时 62 个内置 + 4 个外部），即插即用。

常用 scaler 一览：

| Scaler | 触发信号 | 典型场景 |
|--------|----------|----------|
| `kafka` | topic 未消费的 lag | 消费者按积压量扩容 |
| `rabbitmq` | 队列 ready 消息数 | 异步任务 worker |
| `cron` | 时间表（start/end） | 工作时间才运行的系统 |
| `prometheus` | 任意 PromQL 查询值 | 与 18/19 篇监控栈无缝衔接 |
| `http`（add-on） | 拦截器中挂起请求数 | Web 应用按并发伸缩（本篇实操） |
| `redis` / `aws-sqs-queue` / `azure-servicebus` | list 长度 / 队列深度 | 云上消息服务 |

### 2.2 ScaledObject：唯一的配置入口

KEDA 的使用面收敛到一个 CRD。最小示例：

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-worker
spec:
  scaleTargetRef:
    name: my-worker        # 目标 Deployment 名（kind 默认 Deployment）
  minReplicaCount: 0       # 支持 0，这是 HPA 做不到的
  maxReplicaCount: 50
  triggers:
    - type: rabbitmq
      metadata:
        queueName: tasks
        mode: QueueLength   # 队列内消息条数
        value: "20"         # 每 20 条消息扩 1 个副本
```

关键字段：

- `spec.scaleTargetRef`：要伸缩的目标，`name` 必填，`kind` 可选（默认 `Deployment`，也支持 StatefulSet 等自定义资源）；
- `spec.triggers`：触发器列表，`type` 是 scaler 名称，`metadata` 是该 scaler 需要的参数；多个 trigger 之间取「需要副本数最多」的那个；
- ⚠️ **`ScaledObject` 必须与目标应用在同一个命名空间**。

### 2.3 部署 KEDA（Helm）

![KEDA 官网部署文档](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209201802706.png)

![Helm 安装说明](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209201827273.png)

![KEDA 安装参数说明](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231209202020123.png)

先准备 Helm 客户端（本实操环境使用 v3.13.2）：

```bash
# wget https://get.helm.sh/helm-v3.13.2-linux-amd64.tar.gz
# tar xf helm-v3.13.2-linux-amd64.tar.gz
# mv linux-amd64/helm /usr/bin/
# helm version
version.BuildInfo{Version:"v3.13.2", GitCommit:"2a2fb3b98829f1e0be6fb18af2f6599e0f4e8243", GitTreeState:"clean", GoVersion:"go1.20.10"}
```

添加 KEDA 官方仓库并安装：

```bash
# helm repo add kedacore https://kedacore.github.io/charts
# helm repo list
NAME            URL
kedacore        https://kedacore.github.io/charts
```

```bash
# helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "kedacore" chart repository
Update Complete. ⎈Happy Helming!⎈
```

```bash
# helm install keda kedacore/keda --namespace keda --create-namespace
```

安装成功后 NOTES 提示（节选）：

```text
NAME: keda
NAMESPACE: keda
STATUS: deployed

.Kubernetes Event-driven Autoscaling (KEDA) - Application autoscaling made simple.

Get information about the deployed ScaledObjects:
  kubectl get scaledobject [--namespace <namespace>]
Get details about a deployed ScaledObject:
  kubectl describe scaledobject <scaled-object-name> [--namespace <namespace>]
Get an overview of the Horizontal Pod Autoscalers (HPA) that KEDA is using behind the scenes:
  kubectl get hpa [--all-namespaces] [--namespace <namespace>]
```

### 2.4 前置：MetalLB 与 Ingress-Nginx（压测流量入口）

后续实操需要一个 Web 流量入口。裸金属集群没有云厂商 LoadBalancer，先用 **MetalLB** 补上，再装 **Ingress-Nginx**。

**① kube-proxy 开启 IPVS 与 strictARP**（MetalLB 要求）：

```bash
# kubectl edit configmap kube-proxy -n kube-system
```

```yaml
   ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: true      # 由 false 改为 true
      syncPeriod: 0s
      ...
    mode: "ipvs"           # 默认为空，添加 ipvs
```

```bash
# kubectl rollout restart daemonset kube-proxy -n kube-system
```

**② 部署 MetalLB** 并配置 IP 地址池 + 二层通告：

![MetalLB 官网](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013093528604.png)

![MetalLB 部署说明](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013093709673.png)

```bash
# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
```

```yaml
# IP 地址池 ippool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.240-192.168.10.250
---
# 二层通告 l2.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
```

```bash
# kubectl apply -f ippool.yaml
# kubectl apply -f l2.yaml
```

**③ 部署 Ingress-Nginx**，Service 类型改为 `LoadBalancer`（由 MetalLB 分配地址）、`externalTrafficPolicy` 保持 `Cluster`：

![Ingress-Nginx 部署文档 1](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094055365.png)

![Ingress-Nginx 部署文档 2](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094123408.png)

![Ingress-Nginx 部署文档 3](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094243973.png)

![Ingress-Nginx deploy.yaml 修改点 1](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094322906.png)

![Ingress-Nginx deploy.yaml 修改点 2](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231013094402166.png)

```yaml
# deploy.yaml 中 Service 段的关键修改
spec:
  externalTrafficPolicy: Cluster   # 由 Local 修改为 Cluster
  ...
  type: LoadBalancer               # 此处为 LoadBalancer
```

```bash
# kubectl apply -f deploy.yaml
# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.111.3.227     192.168.10.240   80:32757/TCP,443:31886/TCP   10h
ingress-nginx-controller-admission   ClusterIP      10.106.142.161   <none>           443/TCP                      10h
```

Ingress-Nginx 拿到了 MetalLB 分配的 `192.168.10.240`，后面压测就打这个入口。

### 2.5 实操一：Cron Scaler——工作时间才运行

部署一个测试用的 Golang Web 应用（Deployment + Service + Ingress）：

```yaml
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
```

```bash
# kubectl apply -f go-helloworld.yaml
deployment.apps/go-helloworld created
service/go-helloworld created
ingress.networking.k8s.io/go-helloworld created

# curl http://helloworld.kubemsb.com   # /etc/hosts 中把域名指向 192.168.10.240
Hello, world!
```

场景：开发/测试环境不需要 7x24 常驻——**只在周一到周五 08:00–18:00 运行**，其余时间 0 副本省资源（云上就是省真金白银）。用 KEDA 原生 Cron scaler，一个 `ScaledObject` 搞定：

```yaml
# cron-scaledobject.yaml
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
      start: 00 08 * * 1-5   # 周一至周五 08:00 激活
      end: 00 18 * * 1-5     # 周一至周五 18:00 去激活
      desiredReplicas: "2"   # 激活期间保持 2 副本
```

```bash
# kubectl apply -f cron-scaledobject.yaml
scaledobject.keda.sh/go-helloworld created

# kubectl get scaledobject
NAME                 SCALETARGETKIND      SCALETARGETNAME   MIN   MAX   TRIGGERS   AUTHENTICATION   READY   ACTIVE   FALLBACK   PAUSED    AGE
go-helloworld        apps/v1.Deployment   go-helloworld                 cron                          True    False    Unknown   Unknown   97s

# kubectl get deployment
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
go-helloworld         0/0     0            0           15m     # 非工作时间，副本为 0

# kubectl get hpa
NAME                          REFERENCE                        TARGETS             MINPODS   MAXPODS   REPLICAS   AGE
keda-hpa-go-helloworld        Deployment/go-helloworld         <unknown>/1 (avg)   1         100       0          2m29s
```

注意最后一条：KEDA 已经**自动创建并托管了一个 HPA**（`keda-hpa-go-helloworld`）——这就是「Operator 替你管理 HPA 生命周期」的直观体现。

把系统时间调到工作时段验证：

```bash
# date -s "2023-12-11 09:00:00"

# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
go-helloworld-dc588544c-gvvtw   1/1     Running   0          4s

# curl http://helloworld.kubemsb.com
Hello, world!
```

> 💡 Cron scaler 用的是 Linux crontab 格式，`timezone` 必须显式声明（默认 UTC），否则「工作时间」会整体偏移 8 小时。

### 2.6 实操二：HTTP Scaler——按挂起请求数伸缩

Cron 管「什么时候存在」，HTTP add-on 管「流量来了扩几个」。KEDA HTTP 附加组件构建在 KEDA 核心之上，自带三件套：**operator、external-scaler、interceptor（拦截器）**——拦截器先接住所有请求，队列里挂起的请求数就是伸缩信号：

![KEDA HTTP scaler 工作原理](/云原生/k8s-ops/k8s-ops-14-如何基于事件驱动扩展k8s应用的深度实践/image-20231211191753782.png)

**① 安装 add-on**（非内置 scaler，需单独装）：

```bash
# helm search repo keda-add-ons-http
NAME                            CHART VERSION   APP VERSION     DESCRIPTION
kedacore/keda-add-ons-http      0.6.0           0.6.0           Event-based autoscaler for HTTP workloads on Ku...

# helm install http-add-on kedacore/keda-add-ons-http -n keda

# kubectl get pods -n keda
NAME                                                    READY   STATUS    RESTARTS        AGE
keda-add-ons-http-controller-manager-6b584f75b9-6x5rd   2/2     Running   7 (4m31s ago)   10m
keda-add-ons-http-external-scaler-58b465cff7-7vvcq      1/1     Running   6 (5m32s ago)   10m
keda-add-ons-http-interceptor-59554f894f-nmk7w          1/1     Running   0              10m
keda-add-ons-http-interceptor-59554f894f-vgzl9          1/1     Running   0              10m
keda-add-ons-http-interceptor-59554f894f-whtxm          1/1     Running   0              10m
keda-admission-webhooks-68b4cfbb48-sq5cl                1/1     Running   3 (8h ago)      25h
keda-operator-647b44c8bb-t5fz6                          1/1     Running   0              36s
keda-operator-metrics-apiserver-5f945dc9f8-jwq8s        1/1     Running   3 (8h ago)      25h
```

**② 创建 `HTTPScaledObject`**（先删掉前面的 Cron 版，避免两个伸缩器打架）：

```bash
# kubectl delete -f cron-scaledobject.yaml
```

```yaml
# http-scaledobject.yaml
kind: HTTPScaledObject
apiVersion: http.keda.sh/v1alpha1
metadata:
    name: go-helloworld
spec:
    host: "helloworld.kubemsb.com"
    targetPendingRequests: 10    # 拦截器队列挂起 10 个请求，扩 1 个 Pod
    scaledownPeriod: 300         # 空闲 300s 后才缩容，防止抖动
    scaleTargetRef:
        deployment: go-helloworld
        service: go-helloworld
        port: 8080
    replicas:
        min: 0                   # 支持 0 副本冷启动
        max: 10
```

> ⚠️ `HTTPScaledObject` 同样必须与 Web 应用在**同一命名空间**创建。

**③ 流量改道**：对照架构图，Ingress 不能再直连应用 Service，而要指向 `keda` 命名空间的拦截器代理。Ingress 无法跨命名空间引用 Service，所以在应用所在命名空间建一个 `ExternalName` 类型 Service 做跳板：

```yaml
# 追加到 go-helloworld.yaml
kind: Service
apiVersion: v1
metadata:
  name: keda-add-ons-http-interceptor-proxy
spec:
  type: ExternalName
  externalName: keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local
---
# Ingress 的 backend 改为拦截器（注意端口也换成拦截器的 8080）
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
```

```bash
# kubectl apply -f go-helloworld.yaml
deployment.apps/go-helloworld unchanged
service/go-helloworld unchanged
service/keda-add-ons-http-interceptor-proxy created
ingress.networking.k8s.io/go-helloworld configured

# kubectl apply -f http-scaledobject.yaml
httpscaledobject.http.keda.sh/go-helloworld created

# curl http://helloworld.kubemsb.com
Hello, world!     # 首次访问是 0→1 的冷启动
```

**④ 压测验证**。用 `ab` 快速打一波：

```bash
# yum -y install httpd-tools
# ab -c 1000 -n 100000000 http://helloworld.kubemsb.com/

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
```

高并发下直接拉满到 `maxReplicaCount` 附近。更精细的验证用 **k6**（可精确控制 RPS）：

```bash
# yum -y install https://dl.k6.io/rpm/repo.rpm
# vim /etc/yum.repos.d/k6-io.repo   # 将 gpgcheck 由 1 改为 0
# yum -y install k6
```

```javascript
// script.js：恒定 100 RPS 打 30 秒
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 100,              // 100 iterations per second, i.e. 100 RPS
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,    // 初始虚拟用户池
      maxVUs: 50,             // 不够时可再初始化
    },
  },
};

export function test(url) {
  const res = http.get(url);
  check(res, { 'is status 200': (r) => r.status === 200 });
}

export default function () {
  test('http://helloworld.kubemsb.com');
}
```

同时开一个终端实时观察拦截器队列深度：

```bash
# 终端二
# kubectl proxy
# 终端三
# watch -n '1' curl --silent localhost:8001/api/v1/namespaces/keda/services/keda-add-ons-http-interceptor-admin:9090/proxy/queue
{"default/go-helloworld":0}
```

100 RPS 下队列几乎不积压（挂起数不超过 1），应用稳在 1 个 Pod——**没到阈值就不扩，这是正确行为**。把 `rate` 提到 1000 再跑：

```bash
# watch 输出（数值动态变化）
{"default/go-helloworld":17}
```

```bash
# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
go-helloworld-dc588544c-4qdms   1/1     Running   0          84s
go-helloworld-dc588544c-74h5b   1/1     Running   0          69s
go-helloworld-dc588544c-dg2zn   1/1     Running   0          84s
go-helloworld-dc588544c-jf9w2   1/1     Running   0          96s
go-helloworld-dc588544c-vjn7d   1/1     Running   0          84s
```

挂起请求数冲破 10，KEDA 立即扩容：**0 → 5 副本，直到挂起数回落到阈值以下**。压测结束后，Deployment 又按 `scaledownPeriod` 缩回 0——完整的 0 → N → 0 闭环。

> 💡 **选型建议**：HTTP add-on 适合无现成指标可用的通用 Web 流量；如果集群已有 Prometheus（[18 篇](/云原生/k8s/k8s-16-prometheus-hpa)的栈），用 `prometheus` scaler 直接写 PromQL 更轻，无需额外组件；消息消费类 workload 则首选 `kafka`/`rabbitmq` scaler。

---

## 三、集群 UI 与主机资源监控

伸缩交给 KEDA 后，还得「看得见」——副本为什么扩、节点还剩多少资源。这一节补齐两块：**集群管理 UI** 与 **主机资源监控**。

### 3.1 集群 UI 选型

先明确 Dashboard 的价值：

- 通过 UI **直观了解**集群中运行的资源对象（Pod、Deployment、Service……）；
- 直接在 UI 上**管理**资源对象（创建、删除、重启、编辑 YAML）。

常见选择对比：

| 方案 | 定位 | 特点 |
|------|------|------|
| **Kubernetes Dashboard** | 官方 Web UI | 轻量、零依赖；只有「看 + 改」，无监控大盘，生产多用 ReadOnly 模式 |
| **KubeSphere** | 容器平台 | DevOps、监控、日志、多租户一站式，功能重、资源占用高 |
| **Rancher** | 多集群管理 | 多集群纳管、RBAC 完善，适合跨团队 |
| **Lens / k9s** | 桌面/终端客户端 | 个人效率工具，不部署在集群内 |

本篇实操以官方 Dashboard 为例——它是理解「K8s 资源可视化」的最小集合。

### 3.2 部署 Kubernetes Dashboard

![Dashboard 获取说明 1](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220324233108575.png)

![Dashboard 获取说明 2](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220324233134810.png)

![Dashboard 获取说明 3](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220324233255036.png)

```bash
wget https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.1/aio/deploy/recommended.yaml
```

对清单做三处修改：

```yaml
# ① Service 改为 NodePort，方便在容器主机上访问
kind: Service
apiVersion: v1
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
spec:
  type: NodePort
  ports:
    - port: 443
      targetPort: 8443
      nodePort: 30000
  selector:
    k8s-app: kubernetes-dashboard
```

```yaml
# ② 修改登录用户的身份绑定，否则进入 UI 后看不到资源
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubernetes-dashboard
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin    # 一定要把原来的 kubernetes-dashboard 改为 cluster-admin
subjects:
  - kind: ServiceAccount
    name: kubernetes-dashboard
    namespace: kubernetes-dashboard
```

```bash
kubectl apply -f recommended.yaml
```

> ⚠️ 这里把 Dashboard 的 ServiceAccount 绑到 `cluster-admin` 只是为了实验环境演示方便。**生产环境请务必按最小权限原则授予只读 Role**——Dashboard 一旦被攻破，cluster-admin 等于交出整个集群。

浏览器访问 `https://192.168.10.12:30000`，选择 Token 登录：

![Dashboard 登录页](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220324233800297.png)

Token 从 dashboard 命名空间的 ServiceAccount Secret 中获取：

```bash
kubectl get secret -n kubernetes-dashboard
NAME                               TYPE                                  DATA   AGE
default-token-dzr9f                kubernetes.io/service-account-token   3      3m59s
kubernetes-dashboard-certs         Opaque                                0      3m59s
kubernetes-dashboard-csrf          Opaque                                1      3m59s
kubernetes-dashboard-key-holder    Opaque                                2      3m59s
kubernetes-dashboard-token-g6pq7   kubernetes.io/service-account-token   3      3m59s   # 用此 token

# kubectl describe secret kubernetes-dashboard-token-g6pq7 -n kubernetes-dashboard
# 复制输出中 token: 后的全部内容，粘贴到登录页
```

登录后即可浏览集群资源：

![Dashboard 主界面 1](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220324234042124.png)

![Dashboard 主界面 2](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220324234116954.png)

### 3.3 metrics-server：`kubectl top` 与 Dashboard 的数据源

Dashboard 里节点/Pod 的 CPU、内存曲线来自 metrics-server。没有它时：

```bash
# kubectl top nodes
error: Metrics API not available
```

![metrics-server 获取说明 1](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220325021720671.png)

![metrics-server 获取说明 2](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220325021757986.png)

![metrics-server 获取说明 3](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220325021838791.png)

![metrics-server 获取说明 4](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220325021932343.png)

```bash
wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.1/components.yaml
```

自签证书环境需在容器 args 中添加一行：

```yaml
spec:
      containers:
      - args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP,InternalDNS,ExternalDNS,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        - --kubelet-insecure-tls     # 添加此行内容（实验环境跳过 kubelet 证书校验）
```

```bash
kubectl apply -f components.yaml
```

部署后验证（此时可能出现 ServiceUnavailable，对 `system:anonymous` 授权后即可正常）：

```bash
# kubectl top nodes
Error from server (ServiceUnavailable): the server is currently unable to handle the request (get nodes.metrics.k8s.io)

kubectl create clusterrolebinding system:anonymous --clusterrole=cluster-admin --user=system:anonymous

# kubectl top nodes
NAME          CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
k8s-master1   97m          4%     2497Mi          65%
k8s-master2   133m         6%     2290Mi          60%
k8s-master3   95m          4%     2215Mi          58%
k8s-worker1   45m          2%     1062Mi          27%

# kubectl top pods
NAME              CPU(cores)   MEMORY(bytes)
nginx-web-bbh48   0m           1Mi
nginx-web-x85nl   0m           1Mi
```

> ⚠️ 给匿名用户绑 `cluster-admin` 仅限隔离的实验环境，生产严禁如此授权；正确做法是为 metrics-server 配置正确的 kubelet 证书或 CA。

![Dashboard 中的资源监控图表](/云原生/k8s-ops/k8s-ops-22-kubernetes集群ui及主机资源监控/image-20220325022749621.png)

### 3.4 node-exporter + Prometheus + Grafana：主机监控进阶

metrics-server 只保留**近实时瞬时值**（默认 15s 采样、内存中短暂留存），没有历史——回答不了「这台节点上周 CPU 是多少」。生产级主机监控是本系列 [18 篇](/云原生/k8s/k8s-16-prometheus-hpa)已部署的 **node-exporter + Prometheus + Grafana** 组合：

| 层 | 组件 | 采集/展示内容 |
|----|------|---------------|
| 采集 | **node-exporter**（DaemonSet，每节点一个） | 节点 CPU/内存/磁盘/网络/文件系统原始指标 |
| 存储 | **Prometheus**（18 篇的 Operator 部署） | 时序存储，PromQL 查询历史 |
| 展示 | **Grafana** | Node Exporter Dashboard 大盘、告警面板 |

在 18 篇环境里，node-exporter 已随 kube-prometheus-stack 以 DaemonSet 形式跑在每个节点，Grafana 导入社区 `Node Exporter Full` 大盘即可看到节点级历史曲线——这正是本篇 KEDA 压测时观察「扩容是否把节点打满」的最佳工具。指标链路的更多玩法（ServiceMonitor、自定义指标）见 [18 篇](/云原生/k8s/k8s-16-prometheus-hpa)与 [19 篇](/云原生/k8s/k8s-17-custom-metrics)。

> 💡 三层监控各司其职：**metrics-server** 喂 HPA 和 `kubectl top`（瞬时）、**node-exporter + Prometheus** 记历史（趋势）、**日志（ELK/EFK，见[24 篇](/云原生/k8s/k8s-18-logging-elk-efk)）** 查根因。别指望一个工具包打天下。

---

## 四、系列收官总结

30 篇到这里全部完成。呼应 [20 篇](/云原生/k8s/k8s-19-jvm-in-container)末尾的学习路径，把整个系列串成一张总表——**01–20 是概念主线（学「是什么」），21–30 是实践篇（学「怎么落地」）**：

| 阶段 | 篇目 | 主题 | 关键产出 |
|------|------|------|----------|
| 概念与入门 | [01 云原生](/云原生/k8s/k8s-01-cloud-native/) / [02 宏观架构](/云原生/k8s/k8s-02-macro-architecture/) / [03 minikube](/云原生/k8s/k8s-03-minikube-runtime/) / [04 对象与 kubectl](/云原生/k8s/k8s-04-objects-kubectl/) | CNCF、Master/Worker、本地集群、对象模型 | 能搭集群、读懂 YAML |
| 工作负载 | [05 Pod](/云原生/k8s/k8s-05-pod-workload/) / [06 Deployment](/云原生/k8s/k8s-06-deployment-rs/) / [07 有状态与守护](/云原生/k8s/k8s-07-daemon-stateful-job/) / [08 HPA/CRD](/云原生/k8s/k8s-08-hpa-cri-crd/) | 探针、扩缩、CRD 扩展 | 掌握全部核心工作负载 |
| 网络与存储 | [09 Service](/云原生/k8s/k8s-09-service-l4/) / [10 网络与 DNS](/云原生/k8s/k8s-10-network-dns/) / [11 PV/PVC](/云原生/k8s/k8s-11-pv-pvc/) / [12 Ingress](/云原生/k8s/k8s-13-ingress-l7/) | 四层/七层、CNI、存储卷 | 流量入口与持久化 |
| 发布与网格 | [13 发布策略](/云原生/k8s/k8s-15-release-strategies/) / [14 Istio](/云原生/k8s/k8s-30-service-mesh-istio/) | 滚动/金丝雀/蓝绿、灰度治理 | 应用安全上线 |
| 镜像与配置 | [15 Harbor 与 SpringCloud](/云原生/k8s/k8s-25-harbor-springcloud/) / [16 Secret/ConfigMap](/云原生/k8s/k8s-12-secret-configmap/) | 私有仓库、配置注入 | 交付物与配置管理 |
| 自动化与可观测 | [17 Jenkins 金丝雀](/云原生/k8s/k8s-26-jenkins-canary/) / [18 Prometheus+HPA](/云原生/k8s/k8s-16-prometheus-hpa/) / [19 自定义指标](/云原生/k8s/k8s-17-custom-metrics/) / [20 JVM 容器化](/云原生/k8s/k8s-19-jvm-in-container/) | CI/CD、监控、QPS 弹性、运行时调优 | 从部署到观测闭环 |
| 实践篇 21–30 | 21–23 实操进阶 · [24 日志 ELK/EFK](/云原生/k8s/k8s-18-logging-elk-efk) · 25–28 生产专题 · [29 项目上云](/云原生/k8s/k8s-28-app-onboarding) · **30 本篇** | 把主线概念逐一落到生产 | 真正的落地能力 |

推荐完整实践顺序（20 篇尾部路线的延伸）：**概念（01–04）→ 工作负载与网络存储（05–12）→ 发布与网格（13–14）→ 镜像配置与自动化（15–17）→ 可观测与弹性（18–19）→ 运行时调优（20）→ 日志/上云/伸缩监控（24、29、30）**。每一步都建议在自己的集群里真实跑一遍——K8s 的手感只能在 `kubectl` 里长出来。

---

## 小结

- **HPA 的边界**：只认集群内指标、缩不到 0；队列积压、定时任务这类「事件」需要专门的答案；
- **KEDA**：Operator + Scaler 架构，`ScaledObject`/`HTTPScaledObject` 一个 CRD 声明触发器，自动托管 HPA，实现 **0 → N → 0** 伸缩；Cron scaler 管时间表，HTTP add-on 按挂起请求数扩容，Kafka/RabbitMQ/Prometheus scaler 覆盖其余场景；
- **集群 UI 与监控**：Dashboard 提供可视化管理（注意 RBAC 最小权限），metrics-server 喂 `kubectl top` 与 HPA，node-exporter + Prometheus + Grafana 承担历史趋势与大盘。

从第 1 篇的「什么是云原生」到今天用 KEDA 让副本数随事件起落、在 Grafana 上看着曲线平稳落地——30 篇走完，这个系列就到这里。**愿你的集群永远弹性有余，告警永远静默无声。** 🚀
