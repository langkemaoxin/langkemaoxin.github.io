---
title: Deployment 与副本控制——灰度更新、RC 与 ReplicaSet
sidebarGroup: Kubernetes
shortTitle: 06 Deployment/RS
order: 6
date: 2026-08-28T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
  - Deployment
  - ReplicaSet
description: Deployment 与 ReplicaSet/RC 关系、滚动更新与灰度发布操作要点。
---

> **Kubernetes 系列 · 第 6/35 篇**  
> 上一篇：[《工作负载核心：Pod 生命周期、Pause、Init 与探针》](/云原生/k8s/k8s-05-pod-workload) · 下一篇：[《DaemonSet、StatefulSet、Job 与 CronJob》](/云原生/k8s/k8s-07-daemon-stateful-job)

---

## 开头：3 个副本够吗？镜像升级怎么不中断？

高并发场景下，Spring Cloud、nginx 等微服务需要**动态扩缩容**——流量高峰加副本，低谷缩副本。业界主流方案是基于 Kubernetes 的 HPA；而扩缩容的底层，是 **Deployment** 对 **ReplicaSet** 对 **Pod** 的层层控制。

本篇从 Deployment 入手，讲清副本管理、滚动更新与灰度发布实操，并回顾 RC / RS 的演进关系。

---

## 一、Deployment 资源对象

Kubernetes v1.2 起引入 **Deployment**，**不直接管理 Pod**，而是通过 **ReplicaSet** 间接管理。

```
Deployment → ReplicaSet → Pod
```

![Deployment 控制链](/云原生/k8s/p192-01.png)

**主要能力：**

- 支持 ReplicaSet 的全部功能
- 发布暂停 / 继续
- **滚动更新**与版本回滚
- 扩容 / 缩容

**使用场景：** 无状态服务（Web API、网关等）。有状态服务用 StatefulSet（下一篇）。

---

## 二、Deployment 创建与查看

规范参考：[Writing a Deployment spec](https://kubernetes.io/zh/docs/concepts/workloads/controllers/deployment/#writing-a-deployment-spec)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-deployment
  namespace: default
  labels:
    controller: deploy
spec:
  replicas: 3
  revisionHistoryLimit: 5
  paused: false
  progressDeadlineSeconds: 600
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: nginx-gateway
    matchExpressions:
      - {key: app, operator: In, values: [nginx-gateway]}
  template:
    metadata:
      labels:
        app: nginx-gateway
    spec:
      containers:
        - name: nginx-gateway
          image: harbor.example.io/demo/nginx-gateway:1.0-SNAPSHOT
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f deployment-demo.yml
kubectl get deployments
kubectl get replicaset
kubectl get pods -l app=nginx-gateway
```

### kubectl get deployments 字段

| 字段 | 含义 |
|------|------|
| NAME | Deployment 名称 |
| READY | 就绪副本 / 期望副本 |
| UP-TO-DATE | 已更新到新版本的副本数 |
| AVAILABLE | 可供用户使用的副本数 |
| AGE | 运行时长 |

![Deployment 列表](/云原生/k8s/p194-01.png)

### ReplicaSet 字段

| 字段 | 含义 |
|------|------|
| DESIRED | 期望副本数 |
| CURRENT | 当前副本数 |
| READY | 可服务副本数 |

RS 名称格式：`[Deployment名]-[pod-template-hash随机串]`。

![ReplicaSet 列表](/云原生/k8s/p194-02.png)

---

## 三、Deployment、RS、Pod 三者关系

一个 Deployment 产生：

- 1 个 Deployment 资源
- 1 个（滚动更新时可能多个历史）ReplicaSet
- N 个 Pod

Deployment 控制 RS，RS 控制 Pod 副本数。每次部署新版本会**新建 RS** 记录该版本状态，旧 RS 保留（受 `revisionHistoryLimit` 限制）供回滚。

![三者关系](/云原生/k8s/p195-01.png)

---

## 四、基本操作：扩缩容

```bash
# 3 → 10
kubectl scale deployment demo-deployment --replicas 10

# 10 → 2
kubectl scale deployment demo-deployment --replicas 2
```

![扩缩容效果](/云原生/k8s/p196-01.png)

---

## 五、滚动更新机制

**仅当 `.spec.template` 变更**（镜像、标签等）才触发滚动更新；单纯改 `replicas` 不会。

**原理：** 创建新 RS → 新 RS 就绪后逐步替换旧 RS → 旧 RS 缩容（保留历史版本供回滚）。

### 升级镜像

```bash
kubectl set image deployment/demo-deployment \
  nginx-gateway=harbor.example.io/demo/nginx-gateway:2.0
```

或在线编辑：

```bash
kubectl edit deployment/demo-deployment
```

![镜像升级](/云原生/k8s/p196-02.png)

### 滚动相关命令

```bash
kubectl rollout history deployment demo-deployment
kubectl rollout status deployments demo-deployment
kubectl get deployments demo-deployment --watch
kubectl rollout undo deployment/demo-deployment
```

![滚动状态](/云原生/k8s/p197-01.png)

### 暂停与恢复

暂停状态下多次改 spec，**只触发一次** rolling 记录：

```bash
kubectl rollout pause deployment/demo-deployment
# ... 多次修改 ...
kubectl rollout resume deployment/demo-deployment
```

![暂停恢复](/云原生/k8s/p198-01.png)

### 策略字段

```yaml
spec:
  revisionHistoryLimit: 2    # 保留旧 RS 数量，默认 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1            # 超出期望副本的最大额外 Pod 数（可百分比）
      maxUnavailable: 1      # 更新期间最大不可用 Pod 数
```

---

## 六、Deployment 灰度发布步骤

基于 Deployment 的**金丝雀 / 灰度**核心思路：先让少量 Pod 跑新版本，验证后再全量。

**典型步骤：**

1. **准备新版本镜像**并推送到仓库
2. **暂停滚动**（可选，便于批量改 spec）：
   ```bash
   kubectl rollout pause deployment/demo-deployment
   ```
3. **调整副本或策略**，例如总副本 10，先让 1 个 Pod 使用新镜像（通过改 template 或创建第二个 Deployment 分流）
4. **观察指标**：错误率、延迟、业务日志
5. **逐步放大新版本比例**（改 `maxUnavailable` / 副本分配，或使用多个 Deployment + Service 权重）
6. **确认无误后恢复滚动**或 `kubectl set image` 全量更新：
   ```bash
   kubectl set image deployment/demo-deployment \
     nginx-gateway=harbor.example.io/demo/nginx-gateway:2.0
   kubectl rollout resume deployment/demo-deployment
   ```
7. **失败则回滚**：
   ```bash
   kubectl rollout undo deployment/demo-deployment
   kubectl rollout undo deployment/demo-deployment --to-revision=2
   ```

蓝绿发布、A/B 测试、Ingress 权重等进阶策略见系列第 13 篇《发布策略实战》。

![灰度发布示意](/云原生/k8s/p199-01.png)

---

## 七、RC 与 ReplicaSet

### ReplicationController（RC）

RC 保证任意时刻 Pod 副本数符合期望：多了就删，少了就建。Node 挂了会在其他 Node 重建 Pod。

```yaml
apiVersion: v1
kind: ReplicationController
metadata:
  name: nginx-gateway-rc
spec:
  replicas: 3
  selector:
    app: nginx-gateway
  template:
    metadata:
      labels:
        app: nginx-gateway
    spec:
      containers:
        - name: nginx-gateway
          image: nginx:1.21
          ports:
            - containerPort: 80
```

**注意：** `spec.selector` 必须与 `spec.template.metadata.labels` 一致（或不写 selector，默认与 template labels 相同）。

```bash
kubectl apply -f demo-rc.yaml
kubectl get rc
kubectl describe rc nginx-gateway-rc
kubectl scale rc nginx-gateway-rc --replicas=4
```

![RC 结构](/云原生/k8s/p200-01.png)

### ReplicaSet（RS）

RS 与 RC 功能基本一致，区别是 **RS 支持基于集合的 selector**（如 `version in (v1.0, v2.0)`），RC 仅支持等式 selector。

**实践建议：** 不要直接写 RS，用 **Deployment**（自动管理 RS）。除非不需要滚动升级。

RS 的 `.spec` 三部分：

1. **replicas** — 期望副本数，默认 1
2. **selector** — 标签选择算符，必须与 template.labels 匹配
3. **template** — Pod 模板；`restartPolicy` 仅允许 `Always`

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-gateway-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-gateway
  template:
    metadata:
      labels:
        app: nginx-gateway
    spec:
      containers:
        - name: nginx-gateway
          image: nginx:1.21
```

```bash
kubectl scale replicaset nginx-gateway-rs --replicas 5
kubectl scale replicaset nginx-gateway-rs --replicas 1
```

![RS 三部分](/云原生/k8s/p201-01.png)

---

## 小结

- **Deployment → RS → Pod** 是无状态应用的标准部署链。
- **滚动更新** 由 template 变更触发；`maxSurge` / `maxUnavailable` 控制更新节奏。
- **灰度发布** 可结合 pause、分阶段改镜像、rollout undo 实现。
- **RC** 已过时；**RS** 增强 selector；生产直接用 **Deployment**。

> ➡️ 下一篇：[《DaemonSet、StatefulSet、Job 与 CronJob》](/云原生/k8s/k8s-07-daemon-stateful-job)
