---
title: 发布进阶——Argo Rollouts 金丝雀与 OpenKruise 原地升级
sidebarGroup: Kubernetes
shortTitle: 27 发布进阶
order: 27
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 原生 Deployment 滚动发布的不足与两个进阶方案：Argo Rollouts 金丝雀分析、OpenKruise 原地升级与全链路灰度。
---

> **Kubernetes 系列 · 第 27/35 篇**  
> 上一篇：[《Jenkins + Ingress 自动化灰度发布流水线》](/云原生/k8s/k8s-26-jenkins-canary)  
> 下一篇：[《项目上云实战——Java/Python/Golang 与中间件部署》](/云原生/k8s/k8s-28-app-onboarding)

---

## 开头：滚动更新够用吗？

[第 13 篇](/云原生/k8s/k8s-15-release-strategies)里我们用原生 Deployment 跑过蓝绿、金丝雀、滚动与 A/B 测试，[第 17 篇](/云原生/k8s/k8s-26-jenkins-canary)又用 Jenkins + Ingress 注解把灰度做成了流水线。但原生方案有三个绕不过去的坎：

- **无法按比例金丝雀**：Deployment 的 `RollingUpdate` 只能靠 `maxSurge`/`maxUnavailable` 控制节奏，新版本上线多少副本、接多少流量，全靠「猜」；
- **无法依据指标自动推进**：就绪探针只能回答「容器活没活着」，回答不了「错误率有没有涨、延迟有没有飙」，中途出问题要靠人盯监控手动 `kubectl rollout undo`；
- **重建 Pod 太慢**：每次升级都是删旧 Pod、建新 Pod，调度、分配 IP、挂载卷、拉镜像全来一遍，大规格应用发布窗口被拉得很长。

本文介绍两个进阶方案：**Argo Rollouts** 用 Rollout CRD + AnalysisRun 指标分析，把金丝雀发布变成可编排、可验证、可自动回滚的流程；**OpenKruise** 用 CloneSet + 原地升级（in-place update），让「只换镜像」的发布不再重建整个 Pod，再配合 Kruise Rollouts 实现全链路灰度。

---

## 一、原生方案的边界

原生 `Deployment` 的 `RollingUpdate` 提供了一组基础的安全保证（就绪探针、滚动节奏），但面对大规模生产环境，它的限制很明确：

| 能力 | 原生 Deployment | 期望 |
|------|----------------|------|
| 发布速度控制 | 只有 `maxSurge`/`maxUnavailable` | 分阶段：20% → 40% → 80%，每步可暂停 |
| 新版本流量控制 | 无，按副本比例「顺带」分流量 | 按权重精确切流，甚至按 Header 切 |
| 深度检查 | 就绪探针，浅层存活检查 | 查询外部指标（错误率、延迟）验证发布 |
| 自动中止回滚 | 只能暂停进度，不能自动回滚 | 指标异常自动 abort 并回退稳定版 |

一句话总结：滚动更新**无法控制问题的影响范围**，可能过于激进地把坏版本推到全量，失败时也不提供自动回滚。所以在大规模生产环境中，需要一个专门的「渐进式交付（Progressive Delivery）」层——**以受控、渐进的方式发布更新，用自动化与指标分析驱动升级或回滚**。

业界有两个代表性方案：Argo Rollouts（替换工作负载）和 OpenKruise / Kruise Rollouts（旁路增强工作负载）。下面逐一展开。

---

## 二、Argo Rollouts

### 2.1 Rollout CRD 与工作原理

Argo Rollouts 是一个 Kubernetes Controller 加一组 CRD，用来提供比 Deployment 更强的发布能力：灰度发布、蓝绿部署、更新测试（experimentation）、渐进式交付等。

它与 Deployment 一样，底层管理的还是 ReplicaSet：控制器根据 Rollout 资源中 `spec.template`（与 Deployment 完全相同的 Pod 模板）创建、扩缩、删除 ReplicaSet。当 `spec.template` 变更时，控制器按 `spec.strategy` 里定义的策略，从旧 ReplicaSet 渐进切换到新 ReplicaSet，切完后把新 ReplicaSet 标记为 `stable`。发布中途再次变更镜像，则放弃当前金丝雀，直接发布更新的版本。

![Argo Rollouts 渐进式交付](/云原生/k8s-ops/k8s-ops-16-如何使用argo-rollouts实现金丝雀发布/57937c299eb9e36a75a128bcdb4ac47722d568.jpg)

架构上各组件分工如下：

![Argo Rollouts Architecture](/云原生/k8s-ops/k8s-ops-16-如何使用argo-rollouts实现金丝雀发布/argo-rollout-architecture.png)

| 组件 | 职责 |
|------|------|
| Rollout Controller | 主控制器，监听 Rollout 资源变化并调和集群状态；**不碰原生 Deployment** |
| Rollout 资源 | 自定义资源，与 Deployment 基本兼容，额外字段控制金丝雀/蓝绿等高级策略 |
| AnalysisTemplate / AnalysisRun | 把 Rollout 连到指标提供方，定义阈值，决定发布继续、回滚还是暂停 |
| Metric Providers | Prometheus、Wavefront、Kayenta、Web、Kubernetes Jobs 等指标源 |

> 💡 Argo Rollouts 只响应 Rollout 资源，不会篡改集群里已有的 Deployment。想在已有集群试点，直接装就行；但要用它管理某个应用，必须把该应用的 Deployment **迁移**成 Rollout。

支持的部署策略：

- **RollingUpdate**：与 Deployment 默认行为一致的滚动更新；
- **Recreate**：先删旧版本再启新版本，两版本不会共存，但期间停机；
- **Blue-Green**：新旧两套并存，流量先全在旧版，验证后一次性切到新版；
- **Canary**：把一部分用户/流量暴露给新版本，验证正确后逐步取代旧版本。配合 NGINX Ingress、Istio 等可以实现非常细粒度的流量分割（如按 HTTP Header）。

![金丝雀两阶段切流](/云原生/k8s-ops/k8s-ops-16-如何使用argo-rollouts实现金丝雀发布/f2b26c646d5c7537d4e798a59af1ea7cbfbcb0.jpg)

### 2.2 部署 Argo Rollouts

创建独立命名空间并安装控制器：

~~~powershell
# kubectl create namespace argo-rollouts
namespace/argo-rollouts created
~~~

~~~powershell
# kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
customresourcedefinition.apiextensions.k8s.io/analysisruns.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/analysistemplates.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/clusteranalysistemplates.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/experiments.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/rollouts.argoproj.io created
serviceaccount/argo-rollouts created
clusterrole.rbac.authorization.k8s.io/argo-rollouts created
clusterrole.rbac.authorization.k8s.io/argo-rollouts-aggregate-to-admin created
clusterrole.rbac.authorization.k8s.io/argo-rollouts-aggregate-to-edit created
clusterrole.rbac.authorization.k8s.io/argo-rollouts-aggregate-to-view created
clusterrolebinding.rbac.authorization.k8s.io/argo-rollouts created
configmap/argo-rollouts-config created
secret/argo-rollouts-notification-secret created
service/argo-rollouts-metrics created
deployment.apps/argo-rollouts created
~~~

CRD 里的 `rollouts.argoproj.io`、`analysisruns.argoproj.io` 等，就是后面所有操作的基础。

再装一个 kubectl 插件，命令行管理和可视化发布都靠它：

```powershell
# curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
# chmod +x kubectl-argo-rollouts-linux-amd64
# mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
# kubectl argo rollouts version
```

插件还能拉起一个本地 Dashboard，可视化所有 Rollout：

~~~powershell
# kubectl argo rollouts dashboard

INFO[0000] Argo Rollouts Dashboard is now available at http://localhost:3100/rollouts
~~~

![Argo Rollouts Dashboard](/云原生/k8s-ops/k8s-ops-16-如何使用argo-rollouts实现金丝雀发布/image-20231213160527100.png)

点击 Rollout 进入详情页，可以看到配置信息，并直接在 UI 上执行重启、中断等操作：

![Rollout 详情页](/云原生/k8s-ops/k8s-ops-16-如何使用argo-rollouts实现金丝雀发布/image-20231213161346355.png)

### 2.3 Replica Shifting：按副本比例的金丝雀

金丝雀发布包含两个过程：

- **Replica Shifting**：版本替换，控制新旧副本数量比例；
- **Traffic Shifting**：流量接入，控制流量真正切多少到新版本。

先看只做 Replica Shifting 的版本替换。核心是下面这个 Rollout：

~~~powershell
# cat rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
spec:
  replicas: 5 # 定义5个副本
  strategy:   # 定义升级策略
    canary:   # 金丝雀发布
      steps:  # 发布的节奏
      - setWeight: 20
      - pause: {}  # 会一直暂停
      - setWeight: 40
      - pause: {duration: 10} # 暂停10s
      - setWeight: 60
      - pause: {duration: 10}
      - setWeight: 80
      - pause: {duration: 10}
  revisionHistoryLimit: 2 # 历史版本为2个
  selector:
    matchLabels:
      app: rollouts-demo
  template:
    metadata:
      labels:
        app: rollouts-demo
    spec:
      containers:
      - name: rollouts-demo
        image: argoproj/rollouts-demo:blue
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        resources:
          requests:
            memory: 32Mi
            cpu: 5m
~~~

除了 `apiVersion`、`kind` 和 `strategy`，其余与 Deployment 无异。`strategy` 两个字段是关键：

- `setWeight`：设置流量/副本权重；
- `pause`：暂停。不带 `duration` 表示**一直暂停、需手动推进**；带 `duration: 10` 表示等 10 秒后自动继续。

配一个普通 Service（无需特殊配置）：

~~~powershell
# cat service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rollouts-demo
spec:
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: rollouts-demo
~~~

部署后，任何 Rollout 的**初始创建**都会立即扩到 100%（跳过金丝雀步骤），因为还不存在「升级」：

~~~powershell
# kubectl apply -f rollout.yaml
rollout.argoproj.io/rollouts-demo created
~~~

~~~powershell
# kubectl-argo-rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ✔ Healthy
Strategy:        Canary
  Step:          8/8
  SetWeight:     100
  ActualWeight:  100
Images:          argoproj/rollouts-demo:blue (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       5
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS     AGE   INFO
⟳ rollouts-demo                            Rollout     ✔ Healthy  2m8s
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy  2m8s  stable
      ├──□ rollouts-demo-687d76d795-2fwv6  Pod         ✔ Running  2m8s  ready:1/1
      ├──□ rollouts-demo-687d76d795-2z7hn  Pod         ✔ Running  2m8s  ready:1/1
      ├──□ rollouts-demo-687d76d795-8bgxd  Pod         ✔ Running  2m8s  ready:1/1
      ├──□ rollouts-demo-687d76d795-lrg5z  Pod         ✔ Running  2m8s  ready:1/1
      └──□ rollouts-demo-687d76d795-vbqzj  Pod         ✔ Running  2m8s  ready:1/1
~~~

加 `--watch` 可以实时监控状态变化。

#### 更新与手动推进

用 `set image` 触发金丝雀：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:yellow
rollout "rollouts-demo" image updated
~~~

控制器按 steps 推进，第一步 `setWeight: 20` + 无限暂停。此时 5 个副本里 1 个跑新版本、4 个跑旧版本，对应 20% 权重：

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ॥ Paused
Message:         CanaryPauseStep
Strategy:        Canary
  Step:          1/8
  SetWeight:     20
  ActualWeight:  20
Images:          argoproj/rollouts-demo:blue (stable)
                 argoproj/rollouts-demo:yellow (canary)
Replicas:
  Desired:       5
  Current:       5
  Updated:       1
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS     AGE  INFO
⟳ rollouts-demo                            Rollout     ॥ Paused   14m
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy  37s  canary
│     └──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running  37s  ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy  14m  stable
      ├──□ rollouts-demo-687d76d795-2z7hn  Pod         ✔ Running  14m  ready:1/1
      ├──□ rollouts-demo-687d76d795-8bgxd  Pod         ✔ Running  14m  ready:1/1
      ├──□ rollouts-demo-687d76d795-lrg5z  Pod         ✔ Running  14m  ready:1/1
      └──□ rollouts-demo-687d76d795-vbqzj  Pod         ✔ Running  14m  ready:1/1
~~~

可以看到多了一个 `revision:2` 被标记为 `canary`，状态 `Paused`。手动确认用 `promote`：

~~~powershell
# kubectl argo rollouts promote rollouts-demo
rollout 'rollouts-demo' promoted
~~~

后续步骤的 pause 都只停 10 秒，会自动依次走完。结束后新版本被标记为 `stable`，旧 ReplicaSet 缩到 0：

~~~powershell
NAME                                       KIND        STATUS        AGE  INFO
⟳ rollouts-demo                            Rollout     ✔ Healthy     19m
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy     6m   stable
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running     6m   ready:1/1
│     ├──□ ...（其余 4 个新版本 Pod）
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  • ScaledDown  19m
~~~

#### 终止与回退

新版本有问题时用 `abort` 终止：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:red
rollout "rollouts-demo" image updated
# kubectl argo rollouts abort rollouts-demo
rollout 'rollouts-demo' aborted
~~~

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ✖ Degraded
Message:         RolloutAborted: Rollout aborted update to revision 3
Strategy:        Canary
  Step:          0/8
  SetWeight:     0
  ActualWeight:  0
Images:          argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       0
  Ready:         5
  Available:     5
~~~

无论是金丝雀分析失败自动中止，还是用户手动中止，Rollout 都会退回 `stable` 版本。但注意中止后状态是 `Degraded` 而非 `Healthy`——最简单的恢复办法是把稳定版镜像重新 `set image` 一遍，控制器检测到这是**回滚而非更新**，会跳过分析和步骤直接恢复：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:yellow
rollout "rollouts-demo" image updated
~~~

如果问题在上线一段时间后才暴露，用 `undo` 回退到历史版本：

~~~powershell
# kubectl-argo-rollouts undo rollouts-demo --to-revision=1
INFO[0000] unknown field "spec.template.metadata.creationTimestamp"
rollout 'rollouts-demo' undo
~~~

回退同样走金丝雀流程（先 20% 暂停，`promote` 推进），从 `Images` 可以确认回到了最初的 `blue` 镜像。

### 2.4 与 Ingress/Service 配合：Traffic Shifting

上一节的权重只是副本比例——Service 依然按 Endpoints 均衡，`20%` 权重是「5 个副本里 1 个新版本」。要真正按流量百分比切分，需要接入流量管理层。Argo Rollouts 主要集成两类：**Ingress 控制器**（NGINX、ALB）和**服务网格**（Istio、Linkerd、SMI），底层依赖[第 12 篇](/云原生/k8s/k8s-13-ingress-l7)讲的 Ingress 能力。

> ⚠️ NGINX Ingress 走 LoadBalancer 暴露时，裸集群需要先部署 MetalLB 提供 `LoadBalancer` IP。核心动作：kube-proxy 开启 `strictARP: true` 并设 `mode: "ipvs"`，然后 `kubectl apply -f metallb-native.yaml`，再建 `IPAddressPool`（如 `192.168.10.240-192.168.10.250`）和 `L2Advertisement`。这套准备在[第 17 篇](/云原生/k8s/k8s-26-jenkins-canary)的灰度环境里也用过。

Traffic Shifting 案例包含 **1 个 Rollout + 2 个 Service + 1 个 Ingress**：

~~~powershell
# cat rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
spec:
  replicas: 1
  strategy:
    canary:
      # 引用一个 Service，控制器将更新该服务以指向金丝雀 ReplicaSet
      canaryService: rollouts-demo-canary

      # 引用一个 Service，控制器将更新该服务以指向稳定的 ReplicaSet
      stableService: rollouts-demo-stable
      trafficRouting:
        nginx:
          # 指向稳定 Service 的规则所引用的 Ingress
          # 该 Ingress 将被克隆并赋予一个新的名称，以实现 NGINX 流量分割
          stableIngress: rollouts-demo-stable
      steps:
      - setWeight: 50
      - pause: {}
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: rollouts-demo
  template:
    metadata:
      labels:
        app: rollouts-demo
    spec:
      containers:
      - name: rollouts-demo
        image: argoproj/rollouts-demo:blue
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
~~~

两个 Service 内容一样，selector 里的 `pod-template-hash` 先不填，控制器会根据实际 ReplicaSet 的 hash 自动注入：

~~~powershell
# cat services.yaml
apiVersion: v1
kind: Service
metadata:
  name: rollouts-demo-canary
spec:
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: rollouts-demo
    # 该 selector 将使用金丝雀 ReplicaSet 的 pod-template-hash 进行更新

---
apiVersion: v1
kind: Service
metadata:
  name: rollouts-demo-stable
spec:
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: rollouts-demo
    # 该 selector 将使用稳定版 ReplicaSet 的 pod-template-hash 进行更新
~~~

Ingress 的 host 规则后端必须指向 `stableService` 引用的 Service：

~~~powershell
# cat ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rollouts-demo-stable
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            # 引用服务名称，也在 Rollout spec.strategy.canary.stableService 字段中指定
            name: rollouts-demo-stable
            port:
              number: 80
~~~

部署后发现集群里**多了一个 Ingress**：

~~~powershell
# kubectl get ingress
NAME                                        CLASS   HOSTS             ADDRESS   PORTS   AGE
rollouts-demo-rollouts-demo-stable-canary   nginx   www.kubemsb.com             80      2m18s
rollouts-demo-stable                        nginx   www.kubemsb.com             80      2m18s
~~~

这个 `rollouts-demo-rollouts-demo-stable-canary` 是 `stableIngress` 引用的 Ingress 的克隆，命名规则为 `<ROLLOUT-NAME>-<INGRESS-NAME>-canary`，专供 NGINX 做金丝雀流量分割：

~~~powershell
# kubectl get ingress rollouts-demo-rollouts-demo-stable-canary -o yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "0"
  ...
  name: rollouts-demo-rollouts-demo-stable-canary
  namespace: default
  ...
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com
    http:
      paths:
      - backend:
          service:
            name: rollouts-demo-canary
            port:
              number: 80
        path: /
        pathType: Prefix
~~~

与原始 Ingress 相比有两处变化：注解多了 `nginx.ingress.kubernetes.io/canary` 和 `canary-weight`；后端指向金丝雀 Service。

触发更新后，`canary-weight` 注解会随步骤的 `setWeight` 同步调整：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:yellow
~~~

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ॥ Paused
Message:         CanaryPauseStep
Strategy:        Canary
  Step:          1/2
  SetWeight:     50
  ActualWeight:  50
Images:          argoproj/rollouts-demo:blue (stable)
                 argoproj/rollouts-demo:yellow (canary)
Replicas:
  Desired:       1
  Current:       2
  Updated:       1
  Ready:         2
  Available:     2

NAME                                       KIND        STATUS     AGE  INFO
⟳ rollouts-demo                            Rollout     ॥ Paused   13m
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy  12s  canary
│     └──□ rollouts-demo-6cf78c66c5-55tgf  Pod         ✔ Running  12s  ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy  12m  stable
      └──□ rollouts-demo-687d76d795-tc2tb  Pod         ✔ Running  12m  ready:1/1
~~~

此时克隆 Ingress 的注解变为 `canary-weight: "50"`——NGINX Ingress 控制器检查原始 Ingress、金丝雀 Ingress 和权重注解，把 50% 的请求分给金丝雀。

![金丝雀 50% 流量效果](/云原生/k8s-ops/k8s-ops-16-如何使用argo-rollouts实现金丝雀发布/image-20231213122013400.png)

注意此时 `replicas: 1` 但 `Current: 2`：旧 Pod 还在跑，新 Pod 也有一个，可副本只有 1 个新版本却接 50% 流量——**流量比例与副本比例解耦了**，这正是 Traffic Shifting 的价值。

验证通过后 `promote` 推进完成；有问题则 `undo`/`abort` 回退，与上一节相同。

### 2.5 AnalysisRun：让指标驱动发布

前面 pause 之后靠人确认，Argo Rollouts 还能更进一步：**用指标分析的结果自动决定推进或回滚**。这依赖两个自定义资源：

- **AnalysisTemplate**：定义查什么指标、阈值是什么。可以定义在 Rollout 所在命名空间，也可以做成集群级的 **ClusterAnalysisTemplate** 供多个 Rollout 共享；
- **AnalysisRun**：一次具体的分析执行实例，作用于特定 Rollout。

判定逻辑：

| 分析结果 | Rollout 行为 |
|----------|--------------|
| 指标查询正常（满足成功条件） | 继续发布 |
| 指标显示失败 | 自动回滚 |
| 指标无法给出成功/失败结论 | 暂停发布，等待处理 |

Metric Providers 原生集成 Prometheus、Wavefront、Kayenta、Web、Kubernetes Jobs 等。接 Prometheus 后，典型玩法是：金丝雀暂停期间跑 AnalysisRun，查询新版本的错误率/延迟（查询能力可参考[第 18 篇](/云原生/k8s/k8s-16-prometheus-hpa)的监控体系），达标自动 `promote`、超标自动 `abort`。

> 💡 分析是**完全可选**的。可以在一个 Rollout 里混用自动步骤（基于分析）和手动步骤（`pause: {}` 后人工确认），也可以用 Kubernetes Job 跑冒烟测试、或调 Webhook 来判定成败。

---

## 三、OpenKruise

### 3.1 OpenKruise 是什么

OpenKruise 是一个基于 Kubernetes 的扩展套件，聚焦云原生应用的自动化：**部署、发布、运维与可用性防护**。绝大部分能力基于 CRD 扩展实现，没有外部依赖，可运行在任意纯净 Kubernetes 集群（要求 K8s >= 1.16）。

核心能力四块：

| 能力 | 代表组件 | 说明 |
|------|----------|------|
| 增强版 Workloads | CloneSet、Advanced StatefulSet、Advanced DaemonSet、BroadcastJob | 支持原地升级、可配置的扩缩容/发布策略、并发操作 |
| 应用旁路管理 | SidecarSet、WorkloadSpread | 不改工作负载即可注入/升级 sidecar、约束多区域分布 |
| 高可用防护 | PodUnavailableBudget、删除保护 | 比 PDB 覆盖更多自愿中断场景（删除、驱逐、更新） |
| 高级运维 | ImagePullJob、容器原地重启 | 任意范围节点预拉镜像、指定容器重启 |

其中**原地升级**是杀手锏：只重建 Pod 中特定容器，整个 Pod 及其他容器不受影响。

![OpenKruise 架构](/云原生/k8s-ops/k8s-ops-17-原地升级及全链路灰度发布解决方案-openkruise/architecture-08f2cb3a5b19c102412f9df77b365eef.png)

组件分两层：

- **kruise-manager**：中心组件（Deployment 部署在 `kruise-system`），打包了所有 controller 和 admission webhook，通过 `kruise-webhook-service` 供 kube-apiserver 调用；
- **kruise-daemon**：DaemonSet 部署到每个节点，提供镜像预热、容器重启等节点侧能力——原地升级靠它落地。

安装用 Helm：

~~~powershell
# helm repo add openkruise https://openkruise.github.io/charts/
# helm repo update
# helm install kruise openkruise/kruise --version 1.5.0
~~~

> ⚠️ 如果集群用 cri-dockerd 等非标准 CRI，需要手动指定 socket，例如：`--set daemon.socketLocation=/var/run --set daemon.socketFile=cri-dockerd.sock`。要用「env from metadata」原地升级，还得开 feature-gate：`--set featureGates="InPlaceUpdateEnvFromMetadata=true\,PreDownloadImageForInPlaceUpdate=true"`。

### 3.2 CloneSet：直接管理 Pod 的工作负载

CloneSet 是增强版 Deployment，最大的结构差异：**它直接创建 Pod，中间没有 ReplicaSet 一层**。

~~~powershell
# cat > 01-ok.yaml <<EOF
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: nginxweb1
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginxweb1
  template:
    metadata:
      labels:
        app: nginxweb1
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
EOF
~~~

~~~powershell
# kubectl apply -f 01-ok.yaml
cloneset.apps.kruise.io/nginxweb1 created
~~~

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginxweb1-8djjn   1/1     Running   0          37s
nginxweb1-cld9m   1/1     Running   0          37s
nginxweb1-skhfw   1/1     Running   0          37s
~~~

`describe` 看 Events，创建者是 `cloneset-controller` 直接建 Pod；原生 Deployment 则是 ReplicaSet 建 Pod。每个 Pod 额外带 `apps.kruise.io/cloneset-instance-id` 标签和 `InPlaceUpdateReady`、`KruisePodReady` 两个 Readiness Gates——后者正是原地升级的状态钩子。

扩缩容也比原生精细：`scaleStrategy.maxUnavailable` 限制**扩容速度**（Events 里能看到 `ScaleUpLimited` 警告）；缩容时 `podsToDelete` 可以**指定删除哪些 Pod**——StatefulSet 只能按序号删、Deployment 只能按控制器排序删，都做不到。

> 💡 `minReadySeconds: 30` 表示一个 Pod 就绪 30 秒后才会创建/更新下一个，配合扩缩容策略可以把变更节奏压得更稳。

### 3.3 原地升级：原理与收益

升级一个存量 Pod 的镜像时，**重建升级**与**原地升级**的区别：

![原地升级对比](/云原生/k8s-ops/k8s-ops-17-原地升级及全链路灰度发布解决方案-openkruise/inplace-update-comparation-fc948df195e332f578d4967c34b0c3d3.png)

**重建升级**要删旧 Pod、建新 Pod：Pod 名字/uid 变、大概率换 Node、大概率换 IP。而**原地升级**复用同一个 Pod 对象、只改里面的字段：

| 维度 | 重建升级 | 原地升级 |
|------|----------|----------|
| Pod 名字 / uid | 变化 | 不变 |
| Pod IP / 所在 Node | 大概率变化 | 不变 |
| 调度、分配 IP、挂载卷 | 全部重来 | 无额外开销 |
| 镜像拉取 | 全量 | 复用旧镜像大部分 layer，只拉变化的层 |
| 多容器 Pod | 整个 Pod 重建 | 只重建目标容器，其他容器继续运行 |

CloneSet 的升级策略 `type: InPlaceIfPossible` 表示「能原地就原地，不能就退化重建」。允许原地升级的改动仅限：

1. `spec.template.metadata.*`（labels/annotations）——只把 metadata 改动更新到存量 Pod；
2. `spec.template.spec.containers[x].image`——原地升级对应容器镜像；
3. （Kruise v1.0+）metadata 的 label/annotation 变化，且容器有 env 从这些 label/annotation 取值——可原地升级容器以生效新 env。

改 `env` 的 value、改 `resources` 等其他字段，都会回退成重建升级。

实操一把。升级前确认版本：

~~~powershell
# kubectl exec -it nginxweb1-8djjn -- nginx -v
nginx version: nginx/1.25.3
~~~

修改 CloneSet：加 `updateStrategy.type: InPlaceIfPossible`，镜像换为 `nginx:1.24.0`：

~~~powershell
# kubectl apply -f 04-ok.yaml
cloneset.apps.kruise.io/nginxweb1 configured
~~~

更新过程中 Pod 名字、AGE 都没变，只有 RESTARTS 加了 1——容器在原 Pod 里被重启了：

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS        AGE
nginxweb1-8djjn   1/1     Running   1 (2m31s ago)   39m
nginxweb1-lgbl6   1/1     Running   1 (4m39s ago)   26m
nginxweb1-skhfw   1/1     Running   1 (3m2s ago)    39m
nginxweb1-sxgbr   1/1     Running   1 (3m53s ago)   26m
~~~

对比 `describe pod` 升级前后：Pod IP、Node 不变，镜像从 `nginx:alpine` 换成 `nginx:1.24.0`，Events 里多了一条关键记录：

~~~text
Normal  Killing    3m39s  kubelet  Container nginx definition changed, will be restarted
Normal  Pulled     3m39s  kubelet  Container image "nginx:1.24.0" already present on machine
~~~

并且 Pod 上多了 `apps.kruise.io/inplace-update-state` 注解，记录本次原地升级的 revision、时间戳和分批情况：

~~~powershell
# kubectl get pod nginxweb1-8djjn -oyaml|grep image
apps.kruise.io/inplace-update-state: '{"revision":"nginxweb1-674cdcdbd4","updateTimestamp":"2023-12-15T07:35:51Z","lastContainerStatuses":{"nginx":{ imageID":"docker-pullable://nginx@sha256:3923f8de8d2214b9490e68fd6ae63ea604deddd166df2755b788bef04848b9bc"}},"containerBatchesRecord":[{"timestamp":"2023-12-15T07:35:51Z","containers":["nginx"]}]}'
  - image: nginx:1.24.0
    imagePullPolicy: IfNotPresent
    image: nginx:1.24.0
    imageID: docker-pullable://nginx@sha256:9700d098d545f9d2ee0660dfb155fe64f4447720a0a763a93f2cf08997227279
~~~

~~~powershell
# kubectl exec -it nginxweb1-8djjn -- nginx -v
nginx version: nginx/1.24.0
~~~

多容器场景还有**升级顺序控制**（Kruise v1.1+）：配合容器启动优先级（`KRUISE_CONTAINER_PRIORITY`），sidecar 和 main 容器都要原地升级时，Kruise 会按优先级先升 sidecar、等它 ready 再升 main，分批记录同样写在 `inplace-update-state` 注解的 `containerBatchesRecord` 里。

CloneSet 还自带**灰度**能力：`updateStrategy.partition` 保留旧版本 Pod 数量——

~~~powershell
# cat > 05-ok.yaml <<EOF
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: nginxweb1
  namespace: default
spec:
  minReadySeconds: 30
  updateStrategy:
    type: InPlaceIfPossible
    partition: 2 # 保留旧版本pod数量
  ...
      containers:
      - name: nginx
        image: nginx:1.23.0 # 更换镜像版本
EOF
~~~

~~~powershell
# kubectl apply -f 05-ok.yaml
cloneset.apps.kruise.io/nginxweb1 configured
~~~

4 个副本里只更新了 2 个（RESTARTS 变 2 的那两个），另外 2 个留在旧版本——靠 partition 就能实现「先灰一半」。

### 3.4 Kruise Rollouts：全链路灰度

原地升级解决「单工作负载怎么升得快」，**Kruise Rollouts** 解决「多个工作负载怎么协同灰度」——它是一个 **Bypass（旁路）组件**，提供金丝雀、多批次、A/B 测试等渐进式交付能力，兼容 Gateway API 与各类 Ingress。

![Kruise Rollouts](/云原生/k8s-ops/k8s-ops-17-原地升级及全链路灰度发布解决方案-openkruise/intro-b644231356f16367db5486c77bb99a02.png)

与 Argo Rollouts 最大的不同：**Kruise Rollouts 不替换你的工作负载**。它通过 `workloadRef` 引用现有 Deployment/CloneSet/StatefulSet，发布时临时接管控速、发完即放手；卸载组件后一切照旧，工作负载和 Pod 无需迁移。

安装（要求 K8s >= 1.19）：

~~~powershell
# helm repo add openkruise https://openkruise.github.io/charts/
# helm install kruise-rollout openkruise/kruise-rollout --version 0.4.0
~~~

~~~powershell
# kubectl get pods -n kruise-rollout
NAME                                                 READY   STATUS    RESTARTS   AGE
kruise-rollout-controller-manager-5bf696cf95-fhkw5   1/1     Running   0          31s
kruise-rollout-controller-manager-5bf696cf95-sf8cg   1/1     Running   0          31s
~~~

#### 多批次发布

Rollout 对象通过 `workloadRef` 挂到 Deployment 上，`partition` 风格按批次推进：

~~~powershell
# cat > 02-rollout.yaml <<EOF
apiVersion: rollouts.kruise.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
  namespace: default
  annotations:
    rollouts.kruise.io/rolling-style: partition # 指示 Rollout 使用分区方式进行滚动更新
spec:
  objectRef:
    workloadRef:
      apiVersion: apps/v1
      kind: Deployment
      name: workload-demo
  strategy:
    canary:
      steps:
      - replicas: 1
      - replicas: 50%
      - replicas: 100%
EOF
~~~

给 Deployment 打上新版本（`kubectl patch` 改 env 为 `version-2`）后，Kruise Rollout 接管发布：第一批只放 1 个新 Pod，停在 `StepPaused` 等人工确认：

~~~powershell
# kubectl get rollouts
NAME            STATUS        CANARY_STEP   CANARY_STATE   MESSAGE                                                                         AGE
rollouts-demo   Progressing   1             StepPaused     Rollout is in step(1/3), and you need manually confirm to enter the next step   31m
~~~

每批用 `kubectl-kruise rollout approve` 放行（kubectl 插件装法与上文 Argo 插件类似，从 kruise-tools release 下载二进制即可）：

~~~powershell
# kubectl-kruise rollout approve rollouts/rollouts-demo
rollout.rollouts.kruise.io/rollouts-demo approved
~~~

三批走完（1 → 50% → 100%），旧 ReplicaSet 缩到 0。多批次策略**不创建额外部署**，只是接管原工作负载的滚动节奏，适合「按副本灰度」的场景。

#### 金丝雀发布（Deployment 专属）

金丝雀风格会**创建独立的金丝雀 Deployment**，并把流量按权重切过去（需配合 Service + Ingress，Ingress 前置的 MetalLB/NGINX 环境与 2.4 节相同）：

~~~powershell
# cat > 02-rollout.yaml << EOF
apiVersion: rollouts.kruise.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo-echoserver
  namespace: default
  annotations:
    rollouts.kruise.io/rolling-style: canary
spec:
  objectRef:
    workloadRef:
      apiVersion: apps/v1
      kind: Deployment
      name: echoserver
  strategy:
    canary:
      steps:
        - weight: 5          # 路由 5% 流量到新版本
          pause: {}          # 手动确认后发布剩余 Pod
          replicas: 20%      # 第一步发布的副本比例，不设则默认取 weight
      trafficRoutings:
        - service: echoserver
          ingress:
            classType: nginx
            name: echoserver
EOF
~~~

> ⚠️ 官方文档示例里 `ingress` 下没有 `classType: nginx`，实际创建会报错，需要自行补上。

应用新版本后，控制器把原 Deployment `paused=true`，生成金丝雀资源：5 副本 × 20% = 1 个新 Pod，5% 流量进金丝雀——注意流量比例与副本比例是**两个独立数字**：

~~~powershell
# kubectl get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
echoserver         5/5     0            5           41m
echoserver-8s69m   1/1     1            1           30s
~~~

同时多出一个金丝雀 Ingress `echoserver-canary`：

~~~powershell
# kubectl get ingress
NAME                CLASS   HOSTS             ADDRESS          PORTS   AGE
echoserver          nginx   www.kubemsb.com   192.168.10.240   80      42m
echoserver-canary   nginx   www.kubemsb.com   192.168.10.240   80      64s
~~~

Rollout 停在 `StepPaused`，开发者用 Prometheus 指标等手段确认符合预期后放行：

~~~powershell
# kubectl-kruise rollout approve rollout/rollouts-demo-echoserver -n default
rollout.rollouts.kruise.io/rollouts-demo-echoserver approved
~~~

之后原 Deployment 用原生滚动策略升到新版本、流量恢复原始负载均衡、金丝雀 Deployment 与 Pod 删除。

A/B 测试则是在金丝雀/多批次的 steps 里加 `matches`，按 HTTP Header/Cookie 把特定流量（如 `user-agent=pc`）引到新版本，第一批验证后取消匹配规则恢复正常分流——能力上与 Argo Rollouts 的 Header 切流对齐。

---

## 四、对比与组合

### 4.1 三套方案怎么选

| 维度 | 原生 Deployment | Argo Rollouts | OpenKruise + Kruise Rollouts |
|------|----------------|---------------|------------------------------|
| 核心思路 | 滚动更新 | **替换**工作负载（Rollout CRD） | **旁路增强**工作负载（CloneSet/引用现有负载） |
| 金丝雀按比例 | ❌ | ✅ 副本/流量权重 | ✅ 副本/流量权重 |
| 指标自动分析回滚 | ❌ | ✅ AnalysisRun 生态成熟 | ⚠️ 依赖 approve 人工确认（可对接外部自动化） |
| 原地升级 | ❌ | ❌（仍重建 Pod） | ✅ InPlaceIfPossible |
| 迁移成本 | — | 必须迁移工作负载和 Pod | 无需迁移 |
| 流量协议 | Service 转发 | Ingress、Gateway API、APISIX、Traefik、SMI 等 | Ingress、Gateway API、CRD（Lua 脚本扩展） |

选型建议：

- **对外服务、需要按指标自动灰度** → Argo Rollouts：AnalysisTemplate/AnalysisRun 是三者中唯一内置「查指标 → 自动 promote/abort」闭环的，配合 Prometheus 能做到无人值守发布；
- **大规格应用、发布要快、要省资源** → OpenKruise：原地升级不换 IP、不重新调度、增量拉镜像，还能顺带解决 sidecar 升级、镜像预热、多区域分布这些周边问题；
- **存量 Deployment 不想动** → Kruise Rollouts：旁路接管的架构让渐进式交付可以随时插上、随时拔掉；
- **Argo Rollouts 也能管 CloneSet 吗？** 不能直接管，它的 Rollout 是另一种工作负载类型——想同时要「原地升级 + 流量灰度」，Kruise 体系内 CloneSet + Kruise Rollouts 是现成组合。

### 4.2 与 Jenkins 流水线组合

[第 17 篇](/云原生/k8s/k8s-26-jenkins-canary)的流水线里，灰度的「改权重 → 观察 → 再改权重」是 Jenkins Stage 里的 `kubectl` 命令，权重计算与推进逻辑全写在 Pipeline 里。两套方案都能替换掉这部分手工逻辑：

- **Argo Rollouts**：Jenkins 只负责构建镜像并 `kubectl argo rollouts set image`，后续分批、暂停、切流、回滚全部交给控制器；需要人工卡点的 Stage 改为调用 `promote`，指标验收交给 AnalysisRun，Pipeline 反而变短了；
- **Kruise Rollouts**：Jenkins 正常 `kubectl apply` 新版 Deployment，Kruise Rollout 自动拦截并接管发布节奏，验收 Stage 调 `kubectl-kruise rollout approve` 放行。

> 💡 本质区别在于**灰度状态放哪**：Jenkins 方案的状态在流水线变量里（流水线断了灰度就断了）；控制器方案的状态在集群 CR 对象里（流水线挂了，金丝雀依旧停在暂停点等人决策）。生产上推荐后者，Jenkins 退化为「构建 + 触发 + 验收放行」三步。

---

## 小结

- 原生 Deployment 滚动更新**不能按比例金丝雀、不能依据指标自动推进、每次升级都重建 Pod**，大规模生产环境需要专门的渐进式交付层；
- **Argo Rollouts** 用 Rollout CRD 定义金丝雀步骤（`setWeight`/`pause`），靠两个 Service + 克隆的 canary Ingress 实现流量按权重切分，AnalysisRun 接 Prometheus 等指标源做到自动 promote/abort；`promote`/`abort`/`undo` 是日常三个动作；
- **OpenKruise** 的 CloneSet 直接管理 Pod，`InPlaceIfPossible` 原地升级只重建目标容器——Pod 名、IP、Node 都不变，镜像增量拉取，`partition` 还能顺带做副本灰度；
- **Kruise Rollouts** 旁路接管现有 Deployment，多批次/金丝雀/A/B 三种策略，不用迁移工作负载，适合存量集群渐进落地；
- 与 [第 17 篇](/云原生/k8s/k8s-26-jenkins-canary)的 Jenkins 流水线组合时，把灰度状态从流水线变量移到集群 CR，Jenkins 只留「构建 + 触发 + 验收放行」。

> ➡️ 下一篇：[《Service Mesh 与 Istio——Sidecar 架构与 Bookinfo》](/云原生/k8s/k8s-30-service-mesh-istio)
