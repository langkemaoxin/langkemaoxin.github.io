---
title: "工作负载核心：Pod 生命周期、Pause、Init 与探针"
sidebarGroup: "Kubernetes"
shortTitle: "05 Pod 工作负载"
order: 5
date: 2026-08-28
category: "云原生"
tag:
  - "Kubernetes"
  - "云原生"
  - "K8s系列"
  - "Pod"
  - "探针"
description: "Pod 生命周期、Pause/Init/临时容器、探针与静态 Pod，打好工作负载基础。"
---

> **Kubernetes 系列 · 第 5/20 篇**  
> 上一篇：[《Kubernetes 基本概念与 kubectl——对象模型与常用命令》](/云原生/k8s/k8s-04-objects-kubectl) · 下一篇：[《Deployment 与副本控制——灰度更新、RC 与 ReplicaSet》](/云原生/k8s/k8s-06-deployment-rs)

---

## 开头：Pod 挂了，谁来补？

上一篇我们学会了用 `kubectl` 操作对象。真正跑业务时，第一个要搞清楚的往往是：**Workload 和 Pod 到底是什么关系？**

Deploy 一个 3 副本的 nginx，每个 Pod 里跑一个 nginx 容器——但 Pod 意外被删了，谁会再建一个？单独的 Pod 做不到高可用。Kubernetes 用 **控制器**（Deployment、StatefulSet 等）管理 Pod，让期望状态和实际状态保持一致。

本篇从 **Workloads → Pod → 容器** 这条链入手，讲清 Pause 根容器、Init 初始化、生命周期钩子，以及 liveness / readiness / startup 三类探针；最后补充临时容器排错、静态 Pod 和资源限制。

---

## 一、Workloads 与 Pod 的关系

**工作负载（Workloads）** 是运行在 Kubernetes 上的应用程序。一个应用可能由单个或多个组件组成，通常用 **一组 Pod** 来表示。

层级关系：

```
Workloads（Deployment 等） → 控制一组 Pod → Pod 包含一个或多个 Container
```

常用控制器：

| 控制器 | 典型场景 |
|--------|----------|
| Deployment | 无状态 Web 服务 |
| StatefulSet | MySQL、Redis 等有状态中间件 |
| DaemonSet | 每节点一个日志/监控 Agent |
| Job / CronJob | 一次性或定时批处理 |

Pod 日志常用命令：

```bash
kubectl logs --since=1h nginx
kubectl logs <pod_name>
kubectl logs -f <pod_name>
kubectl logs <pod_name> -c <container_name>
kubectl logs pod_name -c container_name -n namespace
kubectl logs -f <pod_name> -n namespace
```

![Workloads 与 Pod 关系](/云原生/k8s/p149-01.png)

---

## 二、Pod 是什么

Pod 是 Kubernetes **最小的调度与管理单元**，是一组容器的抽象，共享：

- **存储卷（Volumes）**
- **网络**：Pod 在集群内有唯一 IP，内容器共享该 IP；同一 Pod 内可用 `localhost` + 端口互访（端口不能冲突）
- **元数据**：镜像版本、暴露端口等

Pod 与 Node 绑定，Node 故障时会在其他 Node 上用相同镜像和配置重建 Pod（IP 和名字会变）。

![Pod 抽象结构](/云原生/k8s/p150-01.png)

**形式：**

- **单容器 Pod**：最常见
- **多容器协同 Pod**：Sidecar 为应用赋能（如日志采集、代理）

我们一般**不直接创建 Pod**，而是通过 Deployment 等工作负载来创建。

### 直接创建 Pod 示例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
    - name: hello
      image: busybox
      command: ['sh', '-c', 'echo "Hello, Kubernetes!" && sleep 3600']
  restartPolicy: OnFailure
```

```bash
kubectl apply -f ./hello1.yml
kubectl logs -f my-pod
kubectl delete -f ./hello1.yml
```

![Node 上的多个 Pod](/云原生/k8s/p152-01.png)

---

## 三、Pause 根容器（Infra Container）

每个 Pod 都有一个 Kubernetes 自动创建的 **Pause** 容器，是 Pod 的**根容器 / Infra 容器**。在节点上执行 `docker ps` 会看到大量 `pause` 进程：

```bash
$ docker ps
CONTAINER ID   IMAGE                                      COMMAND
3b45e983c859   gcr.io/google_containers/pause-amd64:3.0   "/pause"
```

**存在原因：**

1. **统一状态判断**：以 Pause 代表整组容器状态，避免「部分容器挂了算不算 Pod 挂」的歧义
2. **共享网络与存储**：业务容器 Join Pause 的 Network Namespace 和 Volume，简化通信与文件共享

Pause 镜像约 700KB，C 语言编写，永远处于「暂停」状态；kubelet 启动 Pod 时先起 Pause，再启动应用容器和 Init 容器。

![Pause 与 Pod 网络](/云原生/k8s/p151-01.png)

**Pod 内容器分类：**

| 类型 | 说明 |
|------|------|
| Pause（Infra） | 根容器，共享 NS 基础 |
| Application Container | 业务容器 |
| Init Container | 初始化，串行执行 |
| Sidecar Container | 辅助容器 |
| Ephemeral Container | 临时调试容器 |

---

## 四、Pod 生命周期

![Pod 生命周期概览](/云原生/k8s/p153-01.png)

![Pod 生命周期流程](/云原生/k8s/p153-02.png)

### 两大阶段

**阶段一：Init Container** — 串行执行，全部成功后才进入主容器阶段；任一失败则 Pod 不能启动。

**阶段二：Main Container** — 三个子阶段：

1. **postStart** hook：主容器启动后立即执行
2. **正常运行**：可配置 liveness / readiness / startup 探针
3. **preStop** hook：终止前执行，阻塞删除直到完成

**启动要点：**

- Init 有一个失败 → Pod 不启动
- 应用容器必须能持续运行；NotReady 时 Pod 不对外服务
- 慢启动应用（如 Java）应设置 `initialDelaySeconds`，避免探针过早判定失败导致重启循环

---

## 五、Init Container 示例

典型用途：等数据库就绪再启应用、在 Init 中生成配置文件。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  initContainers:
    - name: init-myservice
      image: busybox
      command: ['sh', '-c', 'echo Init done && sleep 5']
  containers:
    - name: main
      image: nginx
      ports:
        - containerPort: 80
```

创建后 Pod 先处于 **Init** 状态，Init 成功后才 Running：

```bash
kubectl apply -f init-demo.yaml
kubectl get pod my-pod -w
kubectl logs -f my-pod --container=init-myservice
```

---

## 六、生命周期钩子（Hook）

| 钩子 | 时机 | 失败行为 |
|------|------|----------|
| **postStart** | 容器创建后立即执行（异步，不保证在 ENTRYPOINT 之前） | 容器被杀死，按 restartPolicy 重启 |
| **preStop** | 终止前调用，**阻塞**直到完成 | 失败则容器被杀死 |

支持三种动作：**exec**、**httpGet**、**tcpSocket**。

```yaml
lifecycle:
  postStart:
    exec:
      command: ['cat', '/tmp/healthy']
```

```yaml
lifecycle:
  postStart:
    httpGet:
      path: /login
      port: 80
      host: 192.168.126.100
      scheme: HTTP
```

```yaml
lifecycle:
  preStop:
    exec:
      command: ['/bin/sh', '-c', 'sleep 10']
```

---

## 七、探针机制概览

Kubernetes 提供三种探针（1.16+ 起支持 startupProbe）：

| 探针 | 作用 | 失败处置 |
|------|------|----------|
| **startupProbe** | 慢启动应用，启动完成前屏蔽其他探针 | 重启容器 |
| **livenessProbe** | 容器是否存活 | 杀死并重启 |
| **readinessProbe** | 是否就绪接收流量 | 从 Service EndPoint 摘除，不重启 |

探测方式：**exec**、**httpGet**、**tcpSocket**。

### exec 存活探针 Demo

Pod 启动时创建 `/tmp/healthy`，30 秒后删除；每 5 秒 `cat /tmp/healthy`，失败则重启：

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    test: liveness
  name: liveness-exec
spec:
  containers:
    - name: liveness
      image: busybox
      args:
        - /bin/sh
        - -c
        - touch /tmp/healthy; sleep 30; rm -f /tmp/healthy; sleep 600
      livenessProbe:
        exec:
          command:
            - cat
            - /tmp/healthy
        initialDelaySeconds: 5
        periodSeconds: 5
```

```bash
kubectl get pod liveness-exec   # 观察 RESTARTS 递增
```

![探针 exec 示例效果](/云原生/k8s/p162-01.png)

---

## 八、Pod 状态与重启策略

### 常见状态

| 状态 | 含义 |
|------|------|
| **Pending** | 已创建但未调度成功，或拉镜像、建网络中 |
| **Running** | 至少一个容器在运行/启动/重启中 |
| **Succeeded** | 所有容器成功退出且未重启 |
| **Failed** | 至少一个容器失败退出 |
| **Unknown** | 无法与节点 kubelet 通信 |

### restartPolicy

| 策略 | 说明 |
|------|------|
| **Always** | 终止即重启（默认） |
| **OnFailure** | 仅错误时重启 |
| **Never** | 从不重启 |

重启仅在**同一 Node** 上尝试；除第一次外，延迟依次为 10s、20s、40s、80s、160s、300s（最大 300s）。

![Pod 状态转换](/云原生/k8s/p155-01.png)

---

## 九、临时容器（Ephemeral Containers）

distroless 等镜像没有 shell，`kubectl exec` 无法排错。**kubectl debug**（v1.23+ Beta，默认开启）可注入临时容器共享目标 Pod 的 namespace。

```bash
kubectl debug -it ${pod_name} --image=busybox:1.28 --target=${container_name}
```

v1.23 以下需开启特性门控：

```bash
minikube start --kubernetes-version=v1.23.1 --force --driver=docker \
  --cpus 4 --memory 5120 --feature-gates=EphemeralContainers=true
```

共享进程命名空间查看 Java 进程：

```bash
kubectl debug -it pods/demo-provider-deployment-54445d6849-ccc5k \
  --image=busybox:latest --share-processes --copy-to=debug-pod
```

在临时容器内可通过 `/proc/<pid>/root` 访问目标容器文件系统。Java 堆 dump 建议用 **jattach**（避免容器内 jmap 导致 OOM）：

```bash
kubectl debug -it pods/demo-provider-deployment-74c6f9997f-9djvn \
  --image=nien/jattach:v1.0.1 --target=demo-provider --share-processes=true

jattach 18 dumpheap /proc/18/root/work/dumpheap.hprof
```

临时容器限制：不重启、不定义 resources/ports、不支持探针。

---

## 十、静态 Pod

**静态 Pod** 由节点 **kubelet** 直接管理，不经过 Deployment/DaemonSet；manifest 放在 `/etc/kubernetes/manifests/`，kubelet 会自动创建并在 apiserver 注册（可查不可通过 apiserver 删除）。

```bash
cat /var/lib/kubelet/config.yaml
systemctl status kubelet
# 将 pod yaml scp 到 /etc/kubernetes/manifests/
systemctl restart kubelet
kubectl get pods -n kube-system   # 可见对应 Pod
# 删除：移除 manifests 下的 yaml 并重启 kubelet
```

---

## 十一、资源 requests 与 limits

Pod 级别限制 = 所有容器资源之和：

- **requests**：调度依据，节点上所有 Pod 的 requests 之和不能超过节点容量
- **limits**：运行时上限；**不影响调度**

CPU 可压缩（紧张时 throttle）；内存不可压缩（超限 OOM Kill）。

注意：容器内 `top` 看到的往往是**节点级**总量，不是 limits。

---

## 十二、三种探针详解

### liveness vs readiness

| 对比项 | livenessProbe | readinessProbe |
|--------|---------------|----------------|
| 目的 | 进程是否健康 | 是否可接流量 |
| 失败 | 重启容器 | 从 EndPoint 摘除 |
| 未配置时 | 默认 Success | 默认 Success |

### httpGet 示例

HTTP 状态码 **≥200 且 <400** 为成功：

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
    httpHeaders:
      - name: Custom-Header
        value: Awesome
  initialDelaySeconds: 3
  periodSeconds: 3
```

### TCP 示例

```yaml
readinessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
livenessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 20
```

### 探针通用字段

| 字段 | 说明 | 默认 |
|------|------|------|
| initialDelaySeconds | 首次探测延迟 | 0 |
| periodSeconds | 探测间隔 | 10 |
| timeoutSeconds | 超时 | 1 |
| successThreshold | 连续成功次数（liveness/startup 必须为 1） | 1 |
| failureThreshold | 连续失败次数 | 3 |

### Spring Boot 配合示例

就绪探针探测 `/actuator/health`；存活探针配合 `terminationGracePeriodSeconds` 做优雅停机：

```yaml
readinessProbe:
  httpGet:
    scheme: HTTP
    port: 8081
    path: /actuator/health
  failureThreshold: 5
  initialDelaySeconds: 20
  periodSeconds: 10
  timeoutSeconds: 5
  successThreshold: 2
livenessProbe:
  httpGet:
    scheme: HTTP
    port: 8081
    path: /actuator/health
  failureThreshold: 5
  initialDelaySeconds: 120
  periodSeconds: 60
  timeoutSeconds: 60
  successThreshold: 2
terminationGracePeriodSeconds: 30
```

![Readiness + Liveness 配合](/云原生/k8s/p187-01.png)

### startupProbe

**慢启动应用**应单独配置 startupProbe，将「启动探测」从 liveness 解耦：

- 三探针并存时，startup 成功前 liveness/readiness **暂停**
- startup 是一次性的；liveness 贯穿 Pod 生命周期

若仅用 liveness 拉长 `initialDelaySeconds`，启动阶段易陷入重启死循环；启动成功后故障发现又会变慢。典型配置：

```yaml
startupProbe:
  httpGet:
    path: /test
    port: 80
  failureThreshold: 60
  periodSeconds: 5
livenessProbe:
  httpGet:
    path: /test
    port: 80
  failureThreshold: 3
  periodSeconds: 5
```

给应用最多 60×5=300s 启动窗口；startup 成功后 liveness 在约 15s 内可发现运行期故障。

![startupProbe 原理](/云原生/k8s/p182-01.png)

---

## 小结

- **Workload → Pod → Container** 是 K8s 工作负载的基本层级；Pod 是最小调度单元。
- **Pause** 提供共享网络/存储 NS，是 Pod 设计的关键。
- 生命周期分 **Init → Main（postStart / 探针 / preStop）**；Init 串行、Hook 与探针决定可用性与重启。
- **liveness** 保活重启，**readiness** 控流量，**startup** 解耦慢启动。
- **临时容器** 用于生产排错；**静态 Pod** 由 kubelet 本地 manifest 驱动。

下一篇进入 **Deployment 与 ReplicaSet**，看副本控制与滚动/灰度发布。
