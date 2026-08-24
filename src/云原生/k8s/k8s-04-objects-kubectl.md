---
title: Kubernetes 基本概念与 kubectl——对象模型与常用命令
sidebarGroup: Kubernetes
shortTitle: 04 对象与 kubectl
order: 4
date: 2026-08-27T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: Kubernetes 对象模型、YAML 结构、Namespace/Label，以及 kubectl 常用命令速查。
---

> **Kubernetes 系列 · 第 4/35 篇**  
> 上一篇：[《K8s 运行时实操——Minikube 安装、排障与 Helm》](/云原生/k8s/k8s-03-minikube-runtime)  
> 下一篇：[《工作负载核心：Pod 生命周期、Pause、Init 与探针》](/云原生/k8s/k8s-05-pod-workload)

---

## 开头：YAML 里的 apiVersion 和 kind，到底在描述什么？

[Minikube 篇](/云原生/k8s/k8s-03-minikube-runtime) 已经能跑起集群；本文系统梳理 **K8s 集群是什么、有哪些核心对象、YAML 怎么写、kubectl 怎么用**——后续 Pod、Deployment、Service 各篇都建立在这套**对象模型**上。

---

## 一、K8S 基础概念

**K8s 集群**是一组节点（物理机或虚拟机），安装了 Kubernetes 平台。K8s 是围绕容器打造的分布式系统，宏观上与 RocketMQ、Kafka、Elasticsearch 类似（见 [宏观架构篇](/云原生/k8s/k8s-02-macro-architecture)）。

**etcd** 是 K8s 默认存储，保存**全部集群数据**；生产环境必须规划 **etcd 备份**。

### 1.1 集群 Node 两大角色

| 角色 | 职责 | 主要组件 |
|------|------|----------|
| **Master（控制节点）** | Worker 管理 + 元数据管理 | **kube-apiserver** + 控制器 |
| **Worker（Node）** | 容器生命周期管理 | **kubelet** + **kube-proxy** |

### 1.2 Node 核心组件

**kubelet**：运行在每个节点上的代理，确保 Pod 内容器按 **PodSpec** 运行；从 APIServer 或本地文件获取 Pod 定义。

**kube-proxy**：网络代理，实现 **Service** 概念；维护节点 iptables/IPVS 规则，使集群内外能正确访问 Pod。

**容器引擎**：运行容器，支持 Docker、containerd、CRI-O、rkt 等实现 **CRI** 的引擎。

### 1.3 Pod

K8s 应用以 **Pod** 为基本部署单位。Pod 调度到 Node 上，包含一个或多个容器及 Volume。同 Pod 内容器**共享网络命名空间**，可用 `localhost` 通信。Pod **是短暂的**，不是持久实体。

### 1.4 Label

许多资源可打 **Label**（键值对），用于组织与选择——例如标记前端 Pod、后端 Pod，再用 **selector** 选中特定 Label 的 Pod。

### 1.5 Deployment 与 Service

| 对象 | 作用 |
|------|------|
| **Deployment** | 声明式部署应用，最终产生并管理 Pod |
| **Service** | 负载均衡与稳定访问入口；kube-proxy 维护转发规则 |

**kubelet**：节点上 Pod 启停、探针、资源上报。**kube-proxy**：节点网络规则。**每个 Node 都有 kubelet 与 kube-proxy**。

### 1.6 Addons

**Addons** 用 DaemonSet、Deployment 等资源实现**集群级**功能，资源多在 **kube-system** 命名空间：

| Addon | 说明 |
|-------|------|
| **DNS（CoreDNS）** | 集群内 DNS |
| **Dashboard** | Web UI |
| **resource-usage-monitoring** | 资源监控 |
| **Cluster-level Logging** | 集群日志 |

除 DNS 外其他 Addon 非必须；**每个集群都应有 Cluster DNS**。

**Cluster DNS**：补充现有 DNS，存放 Service 的 DNS 记录；容器启动时自动加入 DNS 搜索列表。

**Dashboard**：Web 管理界面（[Minikube 篇](/云原生/k8s/k8s-03-minikube-runtime) 已演示启用方式）。

---

## 二、K8s 对象（Kubernetes Objects）

K8s 中操作的资源实体就是**对象**，通常用 **YAML** 声明。

### 2.1 对象的 YAML 结构

![YAML 对象结构](/云原生/k8s/p116-01.png)

**必填字段：**

| 字段 | 说明 |
|------|------|
| **apiVersion** | 创建对象使用的 API 版本 |
| **kind** | 对象类型（Pod、Deployment、Service…） |
| **metadata** | 元数据：`name`、`namespace`（空则 `default`）等 |
| **spec** | 期望状态 |

不同类型对象的 **spec** 格式不同，查阅 [Kubernetes API 参考](https://kubernetes.io/docs/reference/kubernetes-api/)。

![YAML 多文档分隔](/云原生/k8s/p117-01.png)

**多资源同一文件**：用 **`---`**（三个短横线）分隔多个文档。

### 2.2 简单示例：nginx Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.8
          ports:
            - containerPort: 80
```

保存为 `nginx.yml`，执行：

```bash
kubectl apply -f nginx.yml
```

字段说明：

| 字段 | 含义 |
|------|------|
| **apiVersion** | API 版本 |
| **metadata** | 对象元数据，用于查找与标识 |
| **kind** | 类型为 Deployment |
| **spec** | 详细期望状态 |
| **selector** | 按 template 上的 labels 筛选 |
| **replicas** | 副本数 |
| **template** | Pod 模板 |
| **containers** | 容器定义 |

K8s 对象是**持久化实体**，描述集群状态：运行哪些应用、可用资源、重启/升级策略等。创建对象即声明**期望状态（Desired State）**，控制器持续 reconcile **实际状态**。

官方介绍：[Kubernetes 对象](https://kubernetes.io/zh/docs/concepts/overview/working-with-objects/kubernetes-objects/)

### 2.3 操作对象的方式

```bash
kubectl apply -f demo-provider.yml
kubectl create -f ...
kubectl run ...
kubectl expose ...
```

要点：

1. 创建/修改/删除对象都通过 **Kubernetes API**；`kubectl` 是 CLI 封装。
2. 对象由 **APIServer 持久化到 etcd**。

---

## 三、kubernetes API 版本（apiVersion）

K8s 各组件通过 **REST HTTP** 通信，统称 **K8s API**。API **分组**，各组有**版本**。

大版本形如 **v1、v2**；每组内分三级：

| 等级 | 含义 | 示例 |
|------|------|------|
| **Alpha** | 调试中，可能随时删除 | `v1alpha2` |
| **Beta** | 基本可用，功能可能更多 | `v1beta2` |
| **Stable** | 稳定，长期支持 | `v1` |

### 3.1 查看可用版本

```bash
kubectl api-versions
```

![api-versions 输出](/云原生/k8s/p120-01.png)

### 3.2 常见 apiVersion 含义

| apiVersion | 说明 |
|------------|------|
| **v1** | 稳定核心对象：Pod、Service 等 |
| **apps/v1beta2** | 1.8 起 Deployment 等迁入；支持集合 selector |
| **apps/v1** | 1.9 起 Deployment/RS 等稳定迁入 |
| **batch/v1** | Job、CronJob |
| **autoscaling/v1** | HPA（后续版本支持自定义指标） |
| **extensions/v1beta1** | 旧版 Ingress 等（已逐步迁移） |
| **certificates.k8s.io/v1beta1** | 证书 |
| **authentication.k8s.io/v1** | 认证 |

低版本 beta 资源在高版本可能变为 stable——写 YAML 时以 **`kubectl api-versions`** 与 **`kubectl explain`** 为准。

### 3.3 查看字段含义

**方式 1：kubectl explain**

```bash
kubectl explain pod
kubectl explain deployment
kubectl explain deployment.spec
kubectl explain deployment.spec.template
```

**方式 2：[官方 API 文档](https://kubernetes.io/docs/reference/kubernetes-api/)**

例如 PodSpec → `core/v1 PodSpec`；DeploymentSpec → `apps/v1 DeploymentSpec`。

![explain 与 API 文档](/云原生/k8s/p113-01.png)

**写 YAML 三板斧：**

```bash
kubectl get xxx -oyaml          # 看现有对象
kubectl create deploy xxx --dry-run=client -oyaml   # 生成模板
kubectl explain pod.spec.xx     # 查字段
# 写完 → kubectl apply -f
```

---

## 四、管理 K8s 对象的三种方式

| 方式 | 操作对象 | 推荐环境 | 学习曲线 |
|------|----------|----------|----------|
| **指令性命令行** | `kubectl run/create/delete` | 开发 | 最低 |
| **指令性对象配置** | 单 YAML + create/replace/apply | 生产 | 适中 |
| **声明式对象配置** | 多文件/目录 + apply | 生产 | 较高 |

**同一对象应只用一种方式管理**，否则状态不可预期。

### 4.1 命令式（Imperative Commands）

```bash
kubectl run nginx --image nginx
kubectl create deployment nginx --image nginx
```

优点：命令简单、一步变更。缺点：无 review、无审计模板、难版本化。

### 4.2 指令性对象配置

```bash
kubectl create -f nginx.yaml
kubectl delete -f nginx.yaml -f redis.yaml
kubectl replace -f nginx.yaml
kubectl apply -f nginx.yaml   # 无则创建，有则更新
```

优点：可进 Git、可审计、可模板化。缺点：需懂 YAML 格式。

### 4.3 声明式对象配置

```bash
kubectl diff -f configs/
kubectl apply -f configs/
kubectl diff -R -f configs/
kubectl apply -R -f configs/
kubectl delete -f configs/
```

优点：保留集群上已有修改（merge）；支持目录批量 diff/apply。缺点：复杂度高，merge 调试难。

---

## 五、对象名称、UID、Spec 与 Status

### 5.1 Names

REST 路径：`/api/v1/namespaces/{namespace}/pods/{name}`

同 namespace 同类型对象 **name 唯一**；删除后可重建同名对象。

命名规则：最长 253 字符；小写字母、数字、`-`、`.` 组成。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
spec:
  containers:
    - name: nginx
      image: nginx:1.7.9
      ports:
        - containerPort: 80
```

### 5.2 UID

**UID** 是全局唯一 UUID；同名对象删除再创建，**name 相同、UID 不同**。K8s 内部以 UID 唯一标识对象。

### 5.3 Spec 与 Status

| 字段 | 谁写 | 含义 |
|------|------|------|
| **spec** | 用户（YAML） | **期望状态** |
| **status** | K8s 系统 | **当前状态** |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.7.9
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f deployment.yaml
kubectl get pods <pod名> -o yaml    # 查看 status
kubectl delete -f deployment.yaml
```

**集群所有资源状态最终存在 etcd**（经 APIServer）。Deployment 设 `replicas: 3`，控制器会不断创建/删除 Pod 使实际副本数等于 3。

---

## 六、命名空间（Namespace）

K8s 通过 **Namespace** 在同一物理集群上提供多个**虚拟集群**。

### 6.1 默认命名空间

| 名称空间 | 用途 |
|----------|------|
| **default** | 未指定 namespace 的对象 |
| **kube-system** | 系统组件 |
| **kube-public** | 对所有用户可读（含未登录） |

```bash
kubectl get namespaces
kubectl describe namespaces <name>
```

创建：

```bash
kubectl create namespace my-namespace

# 或 YAML
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
```

```bash
kubectl create -f ./my-namespace.yaml
kubectl delete namespaces my-namespace
```

### 6.2 使用命名空间

```bash
kubectl run nginx --image=nginx --namespace=<ns>
kubectl get pods --namespace=<ns>
```

YAML 中：

```yaml
metadata:
  name: nginx-demo
  namespace: default   # 省略则为 default
```

设置当前上下文默认 namespace：

```bash
kubectl config set-context --current --namespace=<ns>
kubectl config view --minify | grep namespace:
```

### 6.3 用途

1. **环境隔离**：prod / test / staging。
2. **产品线**：商城、backend、mobile。
3. **团队隔离**：不同团队不同 namespace + RBAC + ResourceQuota。

**原则：namespace 隔离配置与对象，网络默认不隔离**——可访问其他 namespace 的 Service DNS（FQDN：`<svc>.<ns>.svc.cluster.local`）。

同 namespace 内 Service 短名 `<svc>` 即可解析；跨 namespace 需 FQDN。

### 6.4 不在命名空间中的资源

```bash
kubectl api-resources --namespaced=true
kubectl api-resources --namespaced=false
```

Node、PersistentVolume、StorageClass 等**不在** namespace 中。

### 6.1 命名空间级资源治理：ResourceQuota 与 LimitRange

多团队共用集群时，namespace 除了隔离资源，还能「限额」。两个互补对象（官方 [docs](https://kubernetes.io/docs/concepts/policy/)）：

| 对象 | 管什么 | 典型规则 |
|------|--------|----------|
| **ResourceQuota** | 整个 namespace 的**总量**：CPU/内存的 requests/limits 之和、Pod/Service/PVC 等**对象数量** | `requests.cpu: "10"`、`count/pods: "50"` |
| **LimitRange** | namespace 内**单个 Pod/容器**的默认值与上下限：default request/limit、min/max | 没写 requests 的容器自动补默认值；超出 max 直接拒绝创建 |

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    pods: "50"
```

> 💡 两者配合的逻辑：**Quota 是总量红线，LimitRange 是个体默认值**。只设 Quota 不设 LimitRange 时，不写 requests 的 Pod 会「绕过」配额统计，所以生产上通常成对出现。配额不足时新 Pod 创建直接失败（`exceeded quota`）。

---

## 七、标签（Label）与选择器（Selector）

**Label** 是附加在对象上的键值对，用于**组织与选择**，不改变 K8s 核心逻辑。

```yaml
metadata:
  labels:
    key1: value1
    key2: value2
```

常见 label 约定：

- `release: stable` / `canary`
- `environment: dev` / `qa` / `production`
- `tier: frontend` / `backend` / `cache`

### 7.1 语法

- **Key**：可选前缀 `prefix/name`，前缀为 DNS 子域名；Kubernetes 组件使用 `kubernetes.io/`、`k8s.io/` 前缀。
- **Value**：最长 63 字符；字母数字开头结尾，可含 `-` `_` `.`

### 7.2 选择器

**基于等式：**

```bash
kubectl get pods -l environment=production,tier=frontend
# environment=production
# tier!=frontend
```

**基于集合：**

```text
environment in (production, qa)
tier notin (frontend, backend)
partition          # 存在 key partition
!partition
```

Deployment selector 示例：

```yaml
selector:
  matchLabels:
    component: redis
  matchExpressions:
    - {key: tier, operator: In, values: [cache]}
    - {key: environment, operator: NotIn, values: [dev]}
```

修改 label：

```bash
kubectl label pods foo unhealthy=true
kubectl label --overwrite pods foo status=unhealthy
kubectl label pods --all status=unhealthy
kubectl label pods foo bar-    # 删除 label bar
```

---

## 八、注解（Annotation）与字段选择器

**Annotation** 向 `metadata.annotations` 添加任意元数据，供工具或自动化读取，不用于选择。

```yaml
metadata:
  annotations:
    key1: value1
    key2: value2
```

**Field selectors** 按资源字段值筛选（非 label）：

```bash
kubectl get pods --field-selector status.phase=Running
# metadata.name=my-service
# metadata.namespace!=default
# status.phase=Pending
```

---

## 九、认识 kubectl

| 工具 | 作用 |
|------|------|
| **Minikube** | 本地搭建单节点 K8s |
| **kubectl** | 操作集群的 CLI（检查资源、创建/删除/更新） |
| **kubelet** | 节点代理，调用容器运行时 |
| **kubeadm** | 集群初始化：`init` / `join` / `reset` |

**Minikube** 只管环境；**kubectl** 管资源——类似 Docker CLI 与 daemon 的关系。

Minikube 可下载匹配版本的 kubectl：

```bash
minikube kubectl -- get nodes
alias kubectl="minikube kubectl --"
```

![kubectl 与 minikube 关系](/云原生/k8s/p136-01.png)

完整命令参考：[kubectl commands](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands)

### 9.1 命令分类（掌握要求）

**Basic（Beginner）：** `create`、`expose`、`run`、`set`

**Basic（Intermediate）：** `explain`、`get`、`edit`、`delete`

**Deploy：** `rollout`、`scale`、`autoscale`

**Cluster：** `cluster-info`、`top`、`cordon`、`uncordon`、`drain`、`taint`

**Debug：** `describe`、`logs`、`attach`、`exec`、`port-forward`、`proxy`、`cp`、`debug`

**Advanced：** `diff`、`apply`、`patch`、`replace`、`wait`、`kustomize`

**Settings：** `label`、`annotate`、`completion`

**Other：** `api-resources`、`api-versions`、`config`、`version`

### 9.2 资源类型简写

| 简写 | 资源 |
|------|------|
| po | pods |
| deploy | deployments |
| svc | services |
| ns | namespaces |
| cm | configmaps |
| ds | daemonsets |
| rs | replicasets |
| ing | ingresses |
| pvc | persistentvolumeclaims |
| pv | persistentvolumes |
| hpa | horizontalpodautoscalers |
| no | nodes |

### 9.3 kubectl logs

```bash
kubectl logs [-f] [-p] POD [-c CONTAINER]

kubectl logs nginx
kubectl logs -p -c java web-m      # 已停止容器
kubectl logs -f -c java web-m      # 持续输出
kubectl logs --tail=20 nginx
```

等价于 Docker `docker logs -f -t --tail 10 <容器>`。

### 9.4 Bash 自动补全

```bash
yum install bash-completion
echo 'source <(kubectl completion bash)' >> ~/.bashrc
kubectl completion bash >/etc/bash_completion.d/kubectl
source /usr/share/bash-completion/bash_completion
```

---

## 十、IDE 编写 YAML（可选）

IntelliJ IDEA **Kubernetes 插件**可提供 YAML 模板与字段提示：

1. **Settings → Plugins → Kubernetes** 安装。
2. **File and Code Templates** 创建 `.yml` 模板。
3. 在 YAML 中输入 **`k`** 触发：`kdep`（Deployment）、`kpod`（Pod）、`kser`（Service）、`kcm`（ConfigMap）等。

![IDEA Kubernetes 插件](/云原生/k8s/p138-01.png)

![YAML 模板](/云原生/k8s/p138-02.png)

![k 命令提示](/云原生/k8s/p139-01.png)

输入资源名后自动填充 metadata；**image** 字段有镜像与版本提示；鼠标悬停属性（如 `restartPolicy`）显示 API 文档。

![Deployment 模板生成](/云原生/k8s/p140-01.png)

![image 版本提示](/云原生/k8s/p141-01.png)

![Pod spec 字段提示](/云原生/k8s/p142-01.png)

![restartPolicy API 文档](/云原生/k8s/p143-01.png)

---

## 十一、K8s 常用命令速查

与 [Minikube 篇](/云原生/k8s/k8s-03-minikube-runtime) 附录互补，日常排障高频：

```bash
kubectl get node
kubectl get pods -A
kubectl describe node
kubectl describe node <name> | grep Taints

kubectl -n <ns> logs -f --tail 200 <pod>
kubectl exec -it -n <ns> <pod> -- sh
kubectl exec -it <pod> -c <container> -- /bin/bash

kubectl get services,pods -o wide
kubectl describe pod <pod> -n <ns>
kubectl describe deployment <name> -n <ns>

kubectl get pod <pod> -n <ns> -oyaml | kubectl replace --force -f -

kubectl delete pod <pod> -n <ns>
kubectl delete deployment <name> -n <ns>
kubectl delete ds <name> -n <ns>
kubectl delete job <name> -n <ns>

# 未删控制器直接删 Pod 会一直被重建
kubectl delete pod <pod> -n <ns> --force --grace-period=0
```

![常用命令清单](/云原生/k8s/p144-01.png)

---

## 十二、Helm 与对象模型衔接

[Minikube 篇](/云原生/k8s/k8s-03-minikube-runtime) 已安装 Helm。Helm Chart 本质是多份 K8s 对象的模板化打包：

```bash
helm search repo mysql
helm install my-mysql bitnami/mysql
kubectl get svc
helm list
helm uninstall my-mysql
```

对象模型不变：**Release** 就是一组已 apply 的 Deployment/Service/ConfigMap 等。

---

## 十三、对象的生与死：Owner 引用、级联删除与 Finalizers

对象模型不只管「长什么样」，还管「谁创建的、怎么删」——这决定了删除一个 Deployment 时，它的 ReplicaSet 和 Pod 为什么会跟着消失。

**Owner 引用（ownerReferences）**：每个从属对象都记录自己的属主。Deployment → ReplicaSet → Pod 就是一条属主链。kubectl 删除对象时按链**级联删除（Cascading Deletion）**，三种模式：

| 模式 | 行为 | 用法 |
|------|------|------|
| **background**（默认） | 立刻删属主，后台回收从属对象 | 日常删除 |
| **foreground** | 先删从属对象、属主进入 `Terminating` 等清理完才消失 | 需要确认「删干净」的场景 |
| **orphan** | 只删属主，从属对象被「孤儿化」保留 | RS 保留、Pod 留着排查时 |

```bash
kubectl delete deployment myapp --cascade=orphan   # 改变级联行为
```

**Finalizers** 是删除的「闸门」：`metadata.finalizers` 非空的对象，收到删除请求后**不会真删**，而是先进入 `Terminating` 状态，等控制器（或 CSI、PVC 保护等内置逻辑）做完清理、把 finalizer 逐个移除后，对象才真正消失。

```bash
# 常见「卡在 Terminating」排查：看 finalizers 是谁加的
kubectl get pvc my-pvc -o jsonpath='{.metadata.finalizers}'
# 常见值如 kubernetes.io/pvc-protection——等 PV 保护逻辑完成会自动移除
```

> ⚠️ 对象**卡在 Terminating 不消失**，99% 是 finalizer 没被移除（对应控制器已不在/异常）。应急可手动删掉 finalizer 字段，但要先确认没有底层资源（云盘、LB）真的需要清理，否则会泄露外部资源。官方文档：[Owners and Dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)、[Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)。

---

## 小结

| 主题 | 要点 |
|------|------|
| 集群 | Master（apiserver+控制器+etcd）+ Worker（kubelet+kube-proxy） |
| 工作负载 | Pod → Deployment 管理 → Service 暴露 |
| 对象 YAML | apiVersion / kind / metadata / spec |
| apiVersion | `kubectl api-versions`、`kubectl explain` |
| 管理方式 | 命令式 vs 单文件 apply vs 目录声明式 |
| 隔离 | Namespace 隔离对象；Label/Selector 筛选 |
| 工具 | kubectl 操作集群；Minikube 仅提供环境 |

> ➡️ 下一篇：[《工作负载核心：Pod 生命周期、Pause、Init 与探针》](/云原生/k8s/k8s-05-pod-workload)
