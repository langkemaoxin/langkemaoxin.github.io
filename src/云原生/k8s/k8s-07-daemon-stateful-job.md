---
title: DaemonSet、StatefulSet、Job 与 CronJob
sidebarGroup: Kubernetes
shortTitle: 07 守护集与有状态
order: 7
date: 2026-08-28T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
  - DaemonSet
  - StatefulSet
  - Job
description: DaemonSet、StatefulSet、Job/CronJob 的适用场景、DNS 与调度容忍配置。
---

> **Kubernetes 系列 · 第 7/35 篇**  
> 上一篇：[《Deployment 与副本控制——灰度更新、RC 与 ReplicaSet》](/云原生/k8s/k8s-06-deployment-rs) · 下一篇：[《HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点》](/云原生/k8s/k8s-08-hpa-cri-crd)

---

## 开头：日志 Agent 要跑在每个 Node 上

Deployment 适合无状态 Web 服务，但有些 workload 规则不同：

- **每个节点恰好一个**日志/监控 Agent → DaemonSet
- **MySQL 主从**需要稳定网络标识和有序启停 → StatefulSet
- **跑完就退出的备份脚本** → Job / CronJob

本篇按这四类控制器展开，重点讲 DaemonSet 调度与 Toleration、StatefulSet DNS，以及 Job/CronJob 示例。

---

## 一、DaemonSet 守护集

### 用途

DaemonSet 确保**每个 Node**（或指定 Node 子集）运行**一个** Pod 副本。Node 加入集群自动创建 Pod，Node 移除则 Pod 被删除。

- 默认**不调度到 master**（有 Taint）
- **无需**指定 replicas（按 Node 数自动决定）

**典型场景：**

- 存储守护进程（glusterd、ceph）
- 日志收集（fluentd、logstash）
- 监控（Prometheus Node Exporter）
- 网络插件 Agent（如 Weave）

### YAML 结构

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      containers:
        - name: fluentd-elasticsearch
          image: k8s.gcr.io/fluentd-elasticsearch:1.20
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

![DaemonSet 结构](/云原生/k8s/p203-01.png)

---

## 二、DaemonSet 节点调度

三种方式选择调度节点：

### 方式一：nodeSelector

```bash
kubectl label nodes node-01 important=very
kubectl get nodes --show-labels
```

```yaml
spec:
  nodeSelector:
    important: very
```

### 方式二：nodeAffinity

**硬策略**（必须满足，否则 Pending）：

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: metadata.name
                operator: In
                values:
                  - demo-node
```

**软策略**（优先满足，不满足则正常调度）：

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: key1
                operator: In
                values: [aaa, bbb]
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 1
          preference:
            matchExpressions:
              - key: key2
                operator: In
                values: [ccc]
```

operator 支持：`In`、`NotIn`、`Exists`、`DoesNotExist`、`Gt`、`Lt`。

![nodeAffinity 示例](/云原生/k8s/p197-01.png)

### 方式三：podAffinity / podAntiAffinity

Pod 与 Pod 之间的亲和/反亲和，按 hostname 或 zone 等 topologyKey 划分「位置」。

```yaml
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: security
                operator: In
                values: [S1]
          topologyKey: failure-domain.beta.kubernetes.io/zone
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: security
                  operator: In
                  values: [S2]
            topologyKey: kubernetes.io/hostname
```

---

## 三、Toleration 与 Taint

DaemonSet 会自动为 Pod 添加 **Toleration**，使其能调度到带 **Taint** 的 Node 上。

示例：Node 有 `unschedulable` 污点（`effect: NoSchedule`），普通 Pod 无法调度；DaemonSet Pod 因 Toleration 可忽略限制，保证每节点一个 Agent——这也是**先部署 K8s 再部署网络插件**（Weave 等 YAML 即 DaemonSet）的原因。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-toleration
spec:
  tolerations:
    - key: node.kubernetes.io/unschedulable
      operator: Exists
      effect: NoSchedule
  containers:
    - name: pause
      image: gcr.io/google_containers/pause:2.0
```

![Toleration 示意](/云原生/k8s/p200-01.png)

---

## 四、StatefulSet 有状态集

### 无状态 vs 有状态

| 类型 | 网络 | 存储 | 启动顺序 | 典型用途 |
|------|------|------|----------|----------|
| 无状态（Deployment） | 可变 | 可变 | 可变 | 业务代码 |
| 有状态（StatefulSet） | 稳定 DNS | 稳定 PVC | 有序 | MySQL、Redis、MQ |

StatefulSet 保证指定个数 Pod 运行，且每个 Pod 有**稳定、唯一的网络标识**和**持久存储绑定**，Pod 不可互换。

**适用条件：**

- 稳定唯一网络标识（需 Headless Service）
- 稳定持久存储（PVC 模板）
- 有序部署、扩缩、滚动更新

**限制：**

- 存储须由 StorageClass / 管理员预建 PVC 提供
- 缩容或删除 StatefulSet **不会**自动删 PVC（数据安全）
- 删除前建议先 `scale` 到 0
- 默认 `podManagementPolicy: OrderedReady`，滚动升级可能需手工介入

---

## 五、StatefulSet 实操与 DNS

### Headless Service + StatefulSet

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stateful-nginx
  labels:
    app: stateful-nginx
spec:
  ports:
    - port: 8008
      name: web
      targetPort: 8080
  clusterIP: None          # Headless：不分配 ClusterIP
  selector:
    app: stateful-nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: stateful-nginx
spec:
  serviceName: "stateful-nginx"   # 必须与 Headless Service 同名
  replicas: 3
  selector:
    matchLabels:
      app: stateful-nginx
  template:
    metadata:
      labels:
        app: stateful-nginx
    spec:
      terminationGracePeriodSeconds: 10
      containers:
        - name: nginx-gateway
          image: harbor.example.io/demo/nginx-gateway:1.0-SNAPSHOT
          ports:
            - containerPort: 8008
              name: http
```

```bash
kubectl apply -f demo-stateful.yml
kubectl get pods -l app=stateful-nginx
kubectl get svc stateful-nginx
```

![StatefulSet 与 Service](/云原生/k8s/p210-01.png)

### DNS 解析

Pod 稳定 DNS 格式：

```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

同命名空间可简写：

```bash
kubectl run -it --tty --image busybox:latest dns-test --restart=Never --rm /bin/sh

# 同命名空间
ping stateful-nginx-0.stateful-nginx

# 跨命名空间 FQDN
ping stateful-nginx-0.stateful-nginx.default.svc.cluster.local
```

- `curl http://stateful-nginx:8008/` — 经 Service 负载均衡到任一 Pod
- 直连指定 Pod：`curl http://stateful-nginx-0.stateful-nginx:8008/`

![DNS 测试](/云原生/k8s/p212-02.png)

### StatefulSet 特有属性

**（1）podManagementPolicy**

| 值 | 行为 |
|----|------|
| OrderedReady（默认） | 按序创建/销毁 pod-0 → pod-1 → … |
| Parallel | 并行扩缩（更新仍有序） |

**（2）updateStrategy**

| 类型 | 行为 |
|------|------|
| RollingUpdate（默认） | 从 pod n-1 到 pod-0 逐个删除重建 |
| OnDelete | 不自动更新，需手工删 Pod |
| partition | 仅更新序号 ≥ partition 的 Pod（金丝雀） |

**（3）必须配置 Headless Service**

`serviceName` 与 Headless Service 绑定，提供稳定 DNS。

![StatefulSet 更新策略](/云原生/k8s/p214-01.png)

---

## 六、Job 任务

Job 负责**批处理**——仅执行一次（或有限次重试），确保指定数量 Pod **成功结束**。

`.spec` 核心字段：

| 字段 | 说明 | 默认 |
|------|------|------|
| template | 同 Pod 模板 | — |
| completions | 成功完成的 Pod 数 | 1 |
| parallelism | 并行 Pod 数 | 1 |
| activeDeadlineSeconds | 失败重试最大时长 | — |

### 单个 Pod Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
        - name: pi
          image: perl:5.34
          command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      restartPolicy: Never
  backoffLimit: 4
```

```bash
kubectl apply -f job-pi.yaml
kubectl get job
kubectl logs job/pi
```

### 并行 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-job
spec:
  completions: 8
  parallelism: 2
  template:
    spec:
      containers:
        - name: worker
          image: busybox
          command: ['sh', '-c', 'echo Processing && sleep 10']
      restartPolicy: OnFailure
```

![Job 示例](/云原生/k8s/p216-01.png)

---

## 七、CronJob 定时任务

CronJob 按 **Cron 表达式**周期性创建 Job，类似 crontab。

- 调度时间基于 **master 所在时区**
- 每次执行**大约**创建一个 Job（极少数情况 0 或 2 个）
- Job **必须幂等**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello
spec:
  schedule: "*/1 * * * *"
  concurrencyPolicy: Allow
  # Forbid：前一个未完成则跳过本次
  # Replace：终止前一个，启动新的
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: hello
              image: busybox:latest
              args:
                - /bin/sh
                - -c
                - date; echo Hello from the Kubernetes cluster
          restartPolicy: OnFailure
```

Cron 格式：

```
# 分 时 日 月 周
# *  *  *  *  *
```

```bash
kubectl apply -f cronjob-hello.yaml
kubectl get cronjob
kubectl get jobs
```

![CronJob 示例](/云原生/k8s/p218-02.png)

---

## 八、调度进阶：拓扑分布、优先级与驱逐

前文讲过的 nodeSelector / nodeAffinity / Taint 解决「**能不能调度到这个节点**」；再往上还有三层问题：**散得均不均、抢不得过别人、节点出事了谁先走**（官方 [Scheduling 概念](https://kubernetes.io/docs/concepts/scheduling-eviction/)）。

### 8.1 拓扑分布约束（topologySpreadConstraints）：把副本摊开

3 副本全调度到同一节点/同一可用区，节点一挂全灭。`topologySpreadConstraints` 让调度器把副本**均匀摊到拓扑域**上：

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1                     # 各拓扑域之间副本数差最多 1
      topologyKey: kubernetes.io/az  # 按什么标签划分拓扑域（节点= topologyKey: kubernetes.io/hostname）
      whenUnsatisfiable: DoNotSchedule  # 摊不开就不调度（ScheduleAnyway=尽量）
      labelSelector:
        matchLabels:
          app: myapp
```

| 对比 | 已学机制 | 它解决什么 |
|------|----------|-----------|
| nodeAffinity | 「固定去某些节点」 | 不保证**分布均匀** |
| podAntiAffinity | 「别和别人挤」 | 是「排斥」语义，不是「均匀」语义 |
| topologySpread | **均匀摊布** | 跨节点/跨 AZ 的高可用标准姿势 |

### 8.2 Pod 优先级与抢占（PriorityClass / Preemption）

集群资源吃紧时，重要的工作负载要有「插队权」——**PriorityClass** 定义优先级整数（越大越重要），Pod 引用后获得两个能力：

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical
value: 1000000
globalDefault: false
---
# Pod 里引用
spec:
  priorityClassName: critical
```

- **调度排序**：调度队列里高优先级 Pod 先出队；
- **抢占（Preemption）**：高优先级 Pod 调度不进任何节点时，调度器会**驱逐**节点上低优先级 Pod 给它腾位（被抢占者进入 `Terminating`，由各自控制器重建）。

> ⚠️ 系统 PriorityClass 有保留区间：`system-cluster-critical`（2000000000，如 Calico/CSI）和 `system-node-critical`（2000001000，如 kube-proxy）。**自定义值别超过 1000000000**，且给业务设抢占前先想清楚——被抢占的低优先级任务是会重跑（Job）还是直接丢（无状态请求）。

### 8.3 驱逐的两种来源与 PDB

「Pod 被赶走」有两个完全不同的发起方，排查时要先分清：

| 类型 | 发起方 | 触发条件 | 特点 |
|------|--------|----------|------|
| **节点压力驱逐** | **kubelet**（节点级） | 内存/磁盘不足 | 按 [QoS 等级](/云原生/k8s/k8s-05-pod-workload)从 BestEffort 开始赶，**不理会 PDB**——先救节点 |
| **API 发起驱逐** | **人类/控制器**（`kubectl drain`、 autoscaler、抢占） | 主动腾空节点等 | 尊重 **PDB**，预算不够就等待 |

**PDB（PodDisruptionBudget，中断预算）**：声明「这类 Pod 至少要保持 N 个可用」，drain 等自愿中断必须遵守：

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2        # 或 maxUnavailable: 1，二选一
  selector:
    matchLabels:
      app: myapp
```

有了它，`kubectl drain` 一次只会赶掉预算允许的数量，等副本补齐再继续——**滚动运维（升级节点、缩容）前先给有状态/核心服务配 PDB**，这是[发布策略篇](/云原生/k8s/k8s-15-release-strategies)之外另一条「不把可用性交给运气」的保险。

---

## 小结

- **DaemonSet**：每 Node 一个 Pod；配合 **Toleration** 调度到污点节点；nodeSelector / Affinity 精细节点。
- **StatefulSet**：稳定身份 + Headless DNS + 有序生命周期；中间件首选。
- **Job**：跑完即停；**CronJob**：定时批处理，注意幂等与 concurrencyPolicy。

> ➡️ 下一篇：[《Secret、ConfigMap 与常见部署排障》](/云原生/k8s/k8s-12-secret-configmap)
