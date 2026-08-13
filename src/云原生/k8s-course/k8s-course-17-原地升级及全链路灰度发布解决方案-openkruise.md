---
title: 原地升级及全链路灰度发布解决方案 OpenKruise
sidebarGroup: K8s 课程笔记
shortTitle: 17 原地升级及全链路灰度发布解决方案 OpenK...
order: 17
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 原地升级及全链路灰度发布方案 OpenKruise 一、OpenKruise是什么？ OpenKruise 是一个基于 Kubernetes 的扩展套件，主要聚焦于云原生应用的自动化，比如 部署、发布...
---

> **K8s 课程笔记 · 第 17 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 原地升级及全链路灰度发布方案 OpenKruise

# 一、OpenKruise是什么？

OpenKruise 是一个基于 Kubernetes 的扩展套件，主要聚焦于云原生应用的自动化，比如*部署、发布、运维以及可用性防护*。

OpenKruise 提供的绝大部分能力都是基于 CRD 扩展来定义，它们不存在于任何外部依赖，可以运行在任意纯净的 Kubernetes 集群中。

## 1.1 核心能力

- **增强版本的 Workloads**

  OpenKruise 包含了一系列增强版本的 Workloads（工作负载），比如 CloneSet、Advanced StatefulSet、Advanced DaemonSet、BroadcastJob 等。

  它们不仅支持类似于 Kubernetes 原生 Workloads 的基础功能，还提供了如原地升级、可配置的扩缩容/发布策略、并发操作等。

  其中，原地升级是一种升级应用容器镜像甚至环境变量的全新方式。它只会用新的镜像重建 Pod 中的特定容器，整个 Pod 以及其中的其他容器都不会被影响。因此它带来了更快的发布速度，以及避免了对其他 Scheduler、CNI、CSI 等组件的负面影响。

- **应用的旁路管理**

  OpenKruise 提供了多种通过旁路管理应用 sidecar 容器、多区域部署的方式，“旁路” 意味着你可以不需要修改应用的 Workloads 来实现它们。

  比如，SidecarSet 能帮助你在所有匹配的 Pod 创建的时候都注入特定的 sidecar 容器，甚至可以原地升级已经注入的 sidecar 容器镜像、并且对 Pod 中其他容器不造成影响。

  而 WorkloadSpread 可以约束无状态 Workload 扩容出来 Pod 的区域分布，赋予单一 workload 的多区域和弹性部署的能力。

- **高可用性防护**

  OpenKruise 在为应用的高可用性防护方面也做出了很多努力。

  目前它可以保护你的 Kubernetes 资源不受级联删除机制的干扰，包括 CRD、Namespace、以及几乎全部的 Workloads 类型资源。

  相比于 Kubernetes 原生的 PDB 只提供针对 Pod Eviction 的防护，PodUnavailableBudget 能够防护 Pod Deletion、Eviction、Update 等许多种 voluntary disruption 场景。

- **高级的应用运维能力**

  OpenKruise 也提供了很多高级的运维能力来帮助你更好地管理应用。

  你可以通过 ImagePullJob 来在任意范围的节点上预先拉取某些镜像，或者指定某个 Pod 中的一个或多个容器被原地重启。

## 1.2 关系对比

### 1.2.1 OpenKruise vs. Kubernetes

简单来说，OpenKruise 对于 Kubernetes 是一个辅助扩展角色。

Kubernetes 自身已经提供了一些应用部署管理的功能，比如一些[基础工作负载](https://kubernetes.io/docs/concepts/workloads/)。 但对于大规模应用与集群的场景，这些基础功能是远远不够的。

OpenKruise 可以被很容易地安装到任意 Kubernetes 集群中，它弥补了 Kubernetes 在应用部署、升级、防护、运维 等领域的不足。

### 1.2.2 OpenKruise vs. Platform-as-a-Service (PaaS)

OpenKruise **不是**一个 PaaS 平台，并且也**不会**提供任何 PaaS 层的能力。

它是一个 Kubernetes 的标准扩展套件，目前包括 `kruise-manager` 和 `kruise-daemon` 两个组件。 PaaS 平台可以通过使用 OpenKruise 提供的这些扩展功能，来使得应用部署、管理流程更加强大与高效。

# 二、OpenKruise部署

从 v1.0.0 (alpha/beta) 开始，OpenKruise 要求在 **Kubernetes >= 1.16** 以上版本的集群中安装和使用。

## 2.1 helm安装

![image-20231209201802706](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231209201802706.png)

![image-20231209201827273](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231209201827273.png)

![image-20231209202020123](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231209202020123.png)

![image-20231209202124361](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231209202124361.png)

~~~powershell
# wget https://get.helm.sh/helm-v3.13.2-linux-amd64.tar.gz
~~~

~~~powershell
# tar xf helm-v3.13.2-linux-amd64.tar.gz
~~~

~~~powershell
# mv linux-amd64/helm /usr/bin/
# helm version
version.BuildInfo{Version:"v3.13.2", GitCommit:"2a2fb3b98829f1e0be6fb18af2f6599e0f4e8243", GitTreeState:"clean", GoVersion:"go1.20.10"}
~~~

## 2.2 通过 helm 安装

建议采用 helm v3.5+ 来安装 Kruise，helm 是一个简单的命令行工具可以从 [这里](https://github.com/helm/helm/releases) 获取。

> 安装指导过程如链接：https://openkruise.io/zh/docs/installation

~~~powershell
Firstly add openkruise charts repository if you haven't do this.
# helm repo add openkruise https://openkruise.github.io/charts/
~~~

~~~powershell
[Optional]
# helm repo update
~~~

~~~powershell
Install the latest version.
# helm install kruise openkruise/kruise --version 1.5.0
~~~

~~~powershell
由于本次部署在K8S 1.28版本集群，并使用cri-dockerd，所以手动指定CRI。
# helm install kruise openkruise/kruise --version 1.5.0 --set daemon.socketLocation=/var/run --set daemon.socketFile=cri-dockerd.sock
~~~

## 2.3 通过 helm 升级

>1. 在升级之前，**必须** 先阅读 [Change Log](https://github.com/openkruise/kruise/blob/master/CHANGELOG.md) ，确保你已经了解新版本的不兼容变化。
>2. 如果你要重置之前旧版本上用的参数或者配置一些新参数，建议在 `helm upgrade` 命令里加上 `--reset-values`。
>3. 如果你在**将 Kruise 从 0.x 升级到 1.x 版本**，你需要为 upgrade 命令添加 `--force` 参数，其他情况下这个参数是可选的。

~~~powershell
Firstly add openkruise charts repository if you haven't do this.
#  helm repo add openkruise https://openkruise.github.io/charts/
~~~

~~~powershell
[Optional]
# helm repo update
~~~

~~~powershell
Upgrade to the latest version.
# helm upgrade kruise openkruise/kruise --version 1.5.0 [--force]
~~~

# 三、OpenKruise核心概念

## 3.1 系统架构

OpenKruise 的整体架构如下:

![alt](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/architecture-08f2cb3a5b19c102412f9df77b365eef.png)

### 3.1.1 API

所有 OpenKruise 的功能都是通过 **Kubernetes API** 来提供, 比如：

~~~powershell
新的 CRD 定义
# kubectl get crd | grep kruise.io
advancedcronjobs.apps.kruise.io                       2023-12-15T03:31:01Z
broadcastjobs.apps.kruise.io                          2023-12-15T03:31:01Z
clonesets.apps.kruise.io                              2023-12-15T03:31:01Z
containerrecreaterequests.apps.kruise.io              2023-12-15T03:31:01Z
daemonsets.apps.kruise.io                             2023-12-15T03:31:01Z
imagelistpulljobs.apps.kruise.io                      2023-12-15T03:31:01Z
imagepulljobs.apps.kruise.io                          2023-12-15T03:31:01Z
nodeimages.apps.kruise.io                             2023-12-15T03:31:01Z
nodepodprobes.apps.kruise.io                          2023-12-15T03:31:01Z
persistentpodstates.apps.kruise.io                    2023-12-15T03:31:01Z
podprobemarkers.apps.kruise.io                        2023-12-15T03:31:01Z
podunavailablebudgets.policy.kruise.io                2023-12-15T03:31:01Z
resourcedistributions.apps.kruise.io                  2023-12-15T03:31:01Z
sidecarsets.apps.kruise.io                            2023-12-15T03:31:01Z
statefulsets.apps.kruise.io                           2023-12-15T03:31:02Z
uniteddeployments.apps.kruise.io                      2023-12-15T03:31:02Z
workloadspreads.apps.kruise.io                        2023-12-15T03:31:01Z
~~~

~~~powershell
资源对象中的特定标识（labels, annotations, envs 等），比如
apiVersion: v1
kind: Namespace
metadata:
  labels:
    # 保护这个 namespace 下的 Pod 不被整个 ns 级联删除
    policy.kruise.io/delete-protection: Cascading
~~~

### 3.1.2 Manager

Kruise-manager 是一个运行 controller 和 webhook 中心组件，它通过 Deployment 部署在 `kruise-system` 命名空间中。

~~~powershell
# kubectl get deployment -n kruise-system
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
kruise-controller-manager   2/2     2            2           18m

# kubectl get pod -n kruise-system -l control-plane=controller-manager
NAME                                        READY   STATUS    RESTARTS   AGE
kruise-controller-manager-688644f7d-kvgdj   1/1     Running   0          19m
kruise-controller-manager-688644f7d-lt27c   1/1     Running   0          19m
~~~

逻辑上来说，如 cloneset-controller/sidecarset-controller 这些的 controller 都是独立运行的。不过为了减少复杂度，它们都被打包在一个独立的二进制文件、并运行在 `kruise-controller-manager-xxx` 这个 Pod 中。

除了 controller 之外，`kruise-controller-manager-xxx` 中还包含了针对 Kruise CRD 以及 Pod 资源的 admission webhook。Kruise-manager 会创建一些 webhook configurations 来配置哪些资源需要感知处理、以及提供一个 Service 来给 kube-apiserver 调用。

~~~powershell
# kubectl get svc -n kruise-system
NAME                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
kruise-webhook-service   ClusterIP   10.106.193.115   <none>        443/TCP   20m
~~~

上述的 `kruise-webhook-service` 非常重要，是提供给 kube-apiserver 调用的。

### 3.1.3 Daemon

这是从 Kruise v0.8.0 版本开始提供的一个新的 daemon 组件。

它通过 DaemonSet 部署到每个 Node 节点上，提供镜像预热、容器重启等功能。

~~~powershell
# kubectl get pod -n kruise-system -l control-plane=daemon
NAME                  READY   STATUS    RESTARTS   AGE
kruise-daemon-4tlks   1/1     Running   0          21m
kruise-daemon-gck2f   1/1     Running   0          21m
kruise-daemon-hc4pp   1/1     Running   0          21m
kruise-daemon-hjv77   1/1     Running   0          21m
kruise-daemon-pbn4k   1/1     Running   0          21m
~~~

## 3.2 原地升级

原地升级是 OpenKruise 提供的核心功能之一。

目前支持原地升级的 Workload：

- [CloneSet](https://openkruise.io/zh/docs/user-manuals/cloneset)
- [Advanced StatefulSet](https://openkruise.io/zh/docs/user-manuals/advancedstatefulset)
- [Advanced DaemonSet](https://openkruise.io/zh/docs/user-manuals/advanceddaemonset)
- [SidecarSet](https://openkruise.io/zh/docs/user-manuals/sidecarset)

目前 `CloneSet`、`Advanced StatefulSet`、`Advanced DaemonSet` 是复用的同一个代码包 [`./pkg/util/inplaceupdate`](https://github.com/openkruise/kruise/tree/master/pkg/util/inplaceupdate) 并且有类似的原地升级行为。在本文中，我们会介绍它的用法和工作流程。

注意，`SidecarSet` 的原地升级流程和其他 workloads 不太一样，比如它在升级 Pod 之前并不会把 Pod 设置为 not-ready 状态。因此，下文中讨论的内容并不完全适用于 `SidecarSet`。

### 3.2.1 什么是原地升级？

当我们要升级一个存量 Pod 中的镜像时，这是 *重建升级* 和 *原地升级* 的区别：

![alt](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/inplace-update-comparation-fc948df195e332f578d4967c34b0c3d3.png)

**重建升级**时我们要删除旧 Pod、创建新 Pod：

- Pod 名字和 uid 发生变化，因为它们是完全不同的两个 Pod 对象（比如 Deployment 升级）
- Pod 名字可能不变、但 uid 变化，因为它们是不同的 Pod 对象，只是复用了同一个名字（比如 StatefulSet 升级）
- Pod 所在 Node 名字发生变化，因为新 Pod 很大可能性是不会调度到之前所在的 Node 节点的
- Pod IP 发生变化，因为新 Pod 很大可能性是不会被分配到之前的 IP 地址的

但是对于**原地升级**，我们仍然复用同一个 Pod 对象，只是修改它里面的字段。因此：

- 可以避免如 *调度*、*分配 IP*、*分配、挂载盘* 等额外的操作和代价
- 更快的镜像拉取，因为开源复用已有旧镜像的大部分 layer 层，只需要拉取新镜像变化的一些 layer
- 当一个容器在原地升级时，Pod 中的其他容器不会受到影响，仍然维持运行

### 3.2.2 理解 InPlaceIfPossible

这种 Kruise workload 的升级类型名为 `InPlaceIfPossible`，它意味着 Kruise 会尽量对 Pod 采取原地升级，如果不能则退化到重建升级。

以下的改动会被允许执行原地升级：

1. 更新 workload 中的 `spec.template.metadata.*`，比如 labels/annotations，Kruise 只会将 metadata 中的改动更新到存量 Pod 上。
2. 更新 workload 中的 `spec.template.spec.containers[x].image`，Kruise 会原地升级 Pod 中这些容器的镜像，而不会重建整个 Pod。
3. **从 Kruise v1.0 版本开始（包括 v1.0 alpha/beta）**，更新 `spec.template.metadata.labels/annotations` 并且 container 中有配置 env from 这些改动的 labels/anntations，Kruise 会原地升级这些容器来生效新的 env 值。

否则，其他字段的改动，比如 `spec.template.spec.containers[x].env` 或 `spec.template.spec.containers[x].resources`，都是会回退为重建升级。

例如对下述 CloneSet YAML：

1. 修改 `app-image:v1` 镜像，会触发原地升级。
2. 修改 annotations 中 `app-config` 的 value 内容，会触发原地升级（参考下文[使用要求](https://openkruise.io/zh/docs/core-concepts/inplace-update#使用要求)）。
3. 同时修改上述两个字段，会在原地升级中同时更新镜像和环境变量。
4. 直接修改 env 中 `APP_NAME` 的 value 内容或者新增 env 等其他操作，会触发 Pod 重建升级。

~~~powershell
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  ...
spec:
  replicas: 1
  template:
    metadata:
      annotations:
        app-config: "... the real env value ..."
    spec:
      containers:
      - name: app
        image: app-image:v1
        env:
        - name: APP_CONFIG
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['app-config']
        - name: APP_NAME
          value: xxx
  updateStrategy:
    type: InPlaceIfPossible
~~~

### 3.2.3 工作流程总览

可以在下图中看到原地升级的整体工作流程

![alt](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/inplace-update-workflow-7b4d4bb7cfb4e72882f2a6bb76f422f1.png)

### 3.2.4 原地升级 - 多容器升级顺序控制

**FEATURE STATE:** Kruise v1.1.0

当你同时原地升级多个具有不同[启动顺序](https://openkruise.io/zh/docs/user-manuals/containerlaunchpriority)的容器时，Kruise 会按照相同的权重顺序来逐个升级这些容器。

- 对于不存在容器启动顺序的 Pod，在多容器原地升级时没有顺序保证。
- 对于存在容器启动顺序的 Pod：
  - 如果本次原地升级的多个容器具有不同的启动顺序，会按启动顺序来控制原地升级的先后顺序。
  - 如果本地原地升级的多个容器的启动顺序相同，则原地升级时没有顺序保证。

例如，一个包含两个不同启动顺序容器的 CloneSet 如下：

~~~powershell
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  ...
spec:
  replicas: 1
  template:
    metadata:
      annotations:
        app-config: "... config v1 ..."
    spec:
      containers:
      - name: sidecar
        env:
        - name: KRUISE_CONTAINER_PRIORITY
          value: "10"
        - name: APP_CONFIG
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['app-config']
      - name: main
        image: main-image:v1
  updateStrategy:
    type: InPlaceIfPossible
~~~

当我们更新 CloneSet，将其中 `app-config` annotation 和 main 容器的镜像修改后，意味着 sidecar 与 main 容器都需要被更新，Kruise 会先原地升级 Pod 来将其中 sidecar 容器重建来生效新的 env from annotation。

此时，我们可以在已升级的 Pod 中看到 `apps.kruise.io/inplace-update-state` annotation 和它的值：

~~~powershell
{
  "revision": "{CLONESET_NAME}-{HASH}",         // 本次原地升级的目标 revision 名字
  "updateTimestamp": "2022-03-22T09:06:55Z",    // 整个原地升级的初次开始时间
  "nextContainerImages": {"main": "main-image:v2"},                // 后续批次中还需要升级的容器镜像
  // "nextContainerRefMetadata": {...},                            // 后续批次中还需要升级的容器 env from labels/annotations
  "preCheckBeforeNext": {"containersRequiredReady": ["sidecar"]},  // pre-check 检查项，符合要求后才能原地升级后续批次的容器
  "containerBatchesRecord":[
    {"timestamp":"2022-03-22T09:06:55Z","containers":["sidecar"]}  // 已更新的首个批次容器（它仅仅表明容器的 spec 已经被更新，例如 pod.spec.containers 中的 image 或是 labels/annotations，但并不代表 node 上真实的容器已经升级完成了）
  ]
}
~~~

当 sidecar 容器升级成功之后，Kruise 会接着再升级 main 容器。最终你会在 Pod 中看到如下的 `apps.kruise.io/inplace-update-state` annotation：

~~~powershell
{
  "revision": "{CLONESET_NAME}-{HASH}",
  "updateTimestamp": "2022-03-22T09:06:55Z",
  "lastContainerStatuses":{"main":{"imageID":"THE IMAGE ID OF OLD MAIN CONTAINER"}},
  "containerBatchesRecord":[
    {"timestamp":"2022-03-22T09:06:55Z","containers":["sidecar"]},
    {"timestamp":"2022-03-22T09:07:20Z","containers":["main"]}
  ]
}
~~~

通常来说，用户只需要关注其中 `containerBatchesRecord` 来确保容器是被分为多批升级的。如果这个 Pod 在原地升级的过程中卡住了，你可以检查 `nextContainerImages/nextContainerRefMetadata` 字段，以及 `preCheckBeforeNext` 中前一次升级的容器是否已经升级成功并 ready 了。

### 3.2.5 使用要求

如果要使用 env from metadata 原地升级能力，你需要在安装或升级 Kruise chart 的时候打开 `kruise-daemon`（默认打开）和 `InPlaceUpdateEnvFromMetadata` 两个 feature-gate。

~~~powershell
# helm install kruise openkruise/kruise --version 1.5.0 --set daemon.socketLocation=/var/run --set daemon.socketFile=cri-dockerd.sock --set featureGates="InPlaceUpdateEnvFromMetadata=true\,PreDownloadImageForInPlaceUpdate=true"
~~~

# 四、OpenKruise使用案例

## 4.1 部署应用

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

~~~powershell
# kubectl describe pods nginxweb1-8djjn
Name:             nginxweb1-8djjn
Namespace:        default
Priority:         0
Service Account:  default
Node:             k8s-worker01/192.168.10.163
Start Time:       Fri, 15 Dec 2023 14:59:17 +0800
Labels:           app=nginxweb1
                  apps.kruise.io/cloneset-instance-id=8djjn
                  controller-revision-hash=nginxweb1-66b6965b88
                  lifecycle.apps.kruise.io/state=Normal
                  pod-template-hash=66b6965b88
Annotations:      apps.kruise.io/runtime-containers-meta:
                    {"containers":[{"name":"nginx","containerID":"docker://c69bac89419d19928e408568efb7da33051740a54dc60a8f0641cf92cf797a95","restartCount":0,...
                  cni.projectcalico.org/containerID: 6be64421ee8c276ac10cdb26993d4192b6f50316fed1296854711c25050d50de
                  cni.projectcalico.org/podIP: 10.244.79.74/32
                  cni.projectcalico.org/podIPs: 10.244.79.74/32
                  lifecycle.apps.kruise.io/timestamp: 2023-12-15T06:59:17Z
Status:           Running
IP:               10.244.79.74
IPs:
  IP:           10.244.79.74
Controlled By:  CloneSet/nginxweb1
Containers:
  nginx:
    Container ID:   docker://c69bac89419d19928e408568efb7da33051740a54dc60a8f0641cf92cf797a95
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:3923f8de8d2214b9490e68fd6ae63ea604deddd166df2755b788bef04848b9bc
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Fri, 15 Dec 2023 14:59:40 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-rmg9h (ro)
Readiness Gates:
  Type                 Status
  InPlaceUpdateReady   True
  KruisePodReady       True
Conditions:
  Type                 Status
  InPlaceUpdateReady   True
  KruisePodReady       True
  Initialized          True
  Ready                True
  ContainersReady      True
  PodScheduled         True
Volumes:
  kube-api-access-rmg9h:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  117s  default-scheduler  Successfully assigned default/nginxweb1-8djjn to k8s-worker01
  Normal  Pulling    117s  kubelet            Pulling image "nginx:alpine"
  Normal  Pulled     95s   kubelet            Successfully pulled image "nginx:alpine" in 21.838s (21.838s including waiting)
  Normal  Created    95s   kubelet            Created container nginx
  Normal  Started    95s   kubelet            Started container nginx
~~~

~~~powershell
# kubectl get cloneset
NAME        DESIRED   UPDATED   UPDATED_READY   READY   TOTAL   AGE
nginxweb1   3         3         3               3       3       65s
~~~

~~~powershell
# kubectl describe cloneset nginxweb1
Name:         nginxweb1
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  apps.kruise.io/v1alpha1
Kind:         CloneSet
Metadata:
  Creation Timestamp:  2023-12-15T06:59:16Z
  Generation:          1
  Resource Version:    94090
  UID:                 7b062c36-1668-4b2b-a187-36afe4cb5293
Spec:
  Replicas:                3
  Revision History Limit:  10
  Scale Strategy:
  Selector:
    Match Labels:
      App:  nginxweb1
  Template:
    Metadata:
      Creation Timestamp:  <nil>
      Labels:
        App:  nginxweb1
    Spec:
      Containers:
        Image:              nginx:alpine
        Image Pull Policy:  IfNotPresent
        Name:               nginx
        Ports:
          Container Port:  80
          Protocol:        TCP
        Resources:
        Termination Message Path:    /dev/termination-log
        Termination Message Policy:  File
      Dns Policy:                    ClusterFirst
      Restart Policy:                Always
      Scheduler Name:                default-scheduler
      Security Context:
      Termination Grace Period Seconds:  30
  Update Strategy:
    Max Surge:        0
    Max Unavailable:  20%
    Partition:        0
    Type:             ReCreate
Status:
  Available Replicas:          3
  Collision Count:             0
  Current Revision:            nginxweb1-66b6965b88
  Expected Updated Replicas:   3
  Label Selector:              app=nginxweb1
  Observed Generation:         1
  Ready Replicas:              3
  Replicas:                    3
  Update Revision:             nginxweb1-66b6965b88
  Updated Available Replicas:  3
  Updated Ready Replicas:      3
  Updated Replicas:            3
Events:
  Type    Reason            Age    From                 Message
  ----    ------            ----   ----                 -------
  Normal  SuccessfulCreate  3m27s  cloneset-controller  succeed to create pod nginxweb1-8djjn
  Normal  SuccessfulCreate  3m27s  cloneset-controller  succeed to create pod nginxweb1-cld9m
  Normal  SuccessfulCreate  3m27s  cloneset-controller  succeed to create pod nginxweb1-skhfw
~~~

创建成功之后通过 `kubectl describe`命令查看对应的 Events 信息，可以发现 `cloneset-controller` 是直接创建的 Pod，而原生的Deployment 是通过 ReplicaSet 去创建的 Pod

## 4.2 应用扩容

~~~powershell
# cat > 02-ok.yaml <<EOF
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: nginxweb1
  namespace: default
spec:
  minReadySeconds: 30
  scaleStrategy:
    maxUnavailable: 1
  replicas: 5
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

> minReadySeconds: 30 创建了一个pod之后30s才会创建第二个

~~~powershell
# kubectl apply -f 02-ok.yaml
cloneset.apps.kruise.io/nginxweb1 configured
~~~

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginxweb1-8djjn   1/1     Running   0          12m
nginxweb1-cld9m   1/1     Running   0          12m
nginxweb1-skhfw   1/1     Running   0          12m
nginxweb1-sxgbr   1/1     Running   0          23s
~~~

~~~powershell
# kubectl get cloneset
NAME        DESIRED   UPDATED   UPDATED_READY   READY   TOTAL   AGE
nginxweb1   5         5         5               5       5       12m
~~~

~~~powershell
# kubectl describe cloneset nginxweb1
Name:         nginxweb1
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  apps.kruise.io/v1alpha1
Kind:         CloneSet
Metadata:
  Creation Timestamp:  2023-12-15T06:59:16Z
  Generation:          2
  Resource Version:    98270
  UID:                 7b062c36-1668-4b2b-a187-36afe4cb5293
Spec:
  Min Ready Seconds:       30
  Replicas:                5
  Revision History Limit:  10
  Scale Strategy:
    Max Unavailable:  1
  Selector:
    Match Labels:
      App:  nginxweb1
  Template:
    Metadata:
      Creation Timestamp:  <nil>
      Labels:
        App:  nginxweb1
    Spec:
      Containers:
        Image:              nginx:alpine
        Image Pull Policy:  IfNotPresent
        Name:               nginx
        Ports:
          Container Port:  80
          Protocol:        TCP
        Resources:
        Termination Message Path:    /dev/termination-log
        Termination Message Policy:  File
      Dns Policy:                    ClusterFirst
      Restart Policy:                Always
      Scheduler Name:                default-scheduler
      Security Context:
      Termination Grace Period Seconds:  30
  Update Strategy:
    Max Surge:        0
    Max Unavailable:  20%
    Partition:        0
    Type:             ReCreate
Status:
  Available Replicas:          4
  Collision Count:             0
  Current Revision:            nginxweb1-66b6965b88
  Expected Updated Replicas:   5
  Label Selector:              app=nginxweb1
  Observed Generation:         2
  Ready Replicas:              5
  Replicas:                    5
  Update Revision:             nginxweb1-66b6965b88
  Updated Available Replicas:  4
  Updated Ready Replicas:      5
  Updated Replicas:            5
Events:
  Type     Reason            Age                From                 Message
  ----     ------            ----               ----                 -------
  Normal   SuccessfulCreate  13m                cloneset-controller  succeed to create pod nginxweb1-8djjn
  Normal   SuccessfulCreate  13m                cloneset-controller  succeed to create pod nginxweb1-cld9m
  Normal   SuccessfulCreate  13m                cloneset-controller  succeed to create pod nginxweb1-skhfw
  Warning  ScaleUpLimited    52s                cloneset-controller  scaleUp is limited because of scaleStrategy.maxUnavailable, limit: 1
  Normal   SuccessfulCreate  52s                cloneset-controller  succeed to create pod nginxweb1-sxgbr
  Warning  ScaleUpLimited    50s (x7 over 52s)  cloneset-controller  scaleUp is limited because of scaleStrategy.maxUnavailable, limit: 0
  Normal   SuccessfulCreate  21s                cloneset-controller  succeed to create pod nginxweb1-lgbl6
~~~

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginxweb1-8djjn   1/1     Running   0          14m
nginxweb1-cld9m   1/1     Running   0          14m
nginxweb1-lgbl6   1/1     Running   0          83s
nginxweb1-skhfw   1/1     Running   0          14m
nginxweb1-sxgbr   1/1     Running   0          114s
~~~

## 4.3 应用缩容

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginxweb1-8djjn   1/1     Running   0          19m
nginxweb1-cld9m   1/1     Running   0          19m
nginxweb1-lgbl6   1/1     Running   0          6m24s
nginxweb1-skhfw   1/1     Running   0          19m
nginxweb1-sxgbr   1/1     Running   0          6m55s
~~~

~~~powershell
# cat > 03-ok.yaml <<EOF
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: nginxweb1
  namespace: default
spec:
  minReadySeconds: 30
  scaleStrategy:
    maxUnavailable: 1
    podsToDelete:
    - nginxweb1-cld9m
  replicas: 4
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

>- 缩容时，CloneSet可以指定一些pod删除，而 StatefulSet 或者 Deployment 做不到:
>
>- - **StatefulSet 是根据序号来删除 Pod**，而 **Deployment/ReplicaSet 目前只能根据控制器里定义的排序来删除**。而 CloneSet 允许用户在缩小 replicas 数量的同时，指定想要删除的 Pod 名字
>  - 如果只是把name加入podsToDelete，而没有修改replicas的话，删完之后会再扩一个pod

~~~powershell
# kubectl apply -f 03-ok.yaml
cloneset.apps.kruise.io/nginxweb1 configured
~~~

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginxweb1-8djjn   1/1     Running   0          23m
nginxweb1-lgbl6   1/1     Running   0          10m
nginxweb1-skhfw   1/1     Running   0          23m
nginxweb1-sxgbr   1/1     Running   0          11m
~~~

## 4.4 原地升级

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginxweb1-8djjn   1/1     Running   0          23m
nginxweb1-lgbl6   1/1     Running   0          10m
nginxweb1-skhfw   1/1     Running   0          23m
nginxweb1-sxgbr   1/1     Running   0          11m

# kubectl exec -it nginxweb1-8djjn -- nginx -v
nginx version: nginx/1.25.3
~~~

~~~powershell
# cat > 04-ok.yaml <<EOF
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: nginxweb1
  namespace: default
spec:
  minReadySeconds: 30
  updateStrategy: # 添加更新策略
    type: InPlaceIfPossible
  scaleStrategy:
    maxUnavailable: 1
  replicas: 4
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
        image: nginx:1.24.0 # 更换镜像版本
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
EOF
~~~

~~~powershell
# kubectl apply -f 04-ok.yaml
cloneset.apps.kruise.io/nginxweb1 configured
~~~

~~~powershell
更新过程
# kubectl get pods
NAME              READY   STATUS    RESTARTS        AGE
nginxweb1-8djjn   1/1     Running   1 (2m31s ago)   39m
nginxweb1-lgbl6   1/1     Running   1 (4m39s ago)   26m
nginxweb1-skhfw   1/1     Running   1 (3m2s ago)    39m
nginxweb1-sxgbr   1/1     Running   1 (3m53s ago)   26m
~~~

~~~powershell
未升级前
# kubectl describe pods nginxweb1-8djjn
Name:             nginxweb1-8djjn
Namespace:        default
Priority:         0
Service Account:  default
Node:             k8s-worker01/192.168.10.163
Start Time:       Fri, 15 Dec 2023 14:59:17 +0800
Labels:           app=nginxweb1
                  apps.kruise.io/cloneset-instance-id=8djjn
                  controller-revision-hash=nginxweb1-66b6965b88
                  lifecycle.apps.kruise.io/state=Normal
                  pod-template-hash=66b6965b88
Annotations:      apps.kruise.io/runtime-containers-meta:
                    {"containers":[{"name":"nginx","containerID":"docker://c69bac89419d19928e408568efb7da33051740a54dc60a8f0641cf92cf797a95","restartCount":0,...
                  cni.projectcalico.org/containerID: 6be64421ee8c276ac10cdb26993d4192b6f50316fed1296854711c25050d50de
                  cni.projectcalico.org/podIP: 10.244.79.74/32
                  cni.projectcalico.org/podIPs: 10.244.79.74/32
                  lifecycle.apps.kruise.io/timestamp: 2023-12-15T06:59:17Z
Status:           Running
IP:               10.244.79.74
IPs:
  IP:           10.244.79.74
Controlled By:  CloneSet/nginxweb1
Containers:
  nginx:
    Container ID:   docker://c69bac89419d19928e408568efb7da33051740a54dc60a8f0641cf92cf797a95
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:3923f8de8d2214b9490e68fd6ae63ea604deddd166df2755b788bef04848b9bc
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Fri, 15 Dec 2023 14:59:40 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-rmg9h (ro)
Readiness Gates:
  Type                 Status
  InPlaceUpdateReady   True
  KruisePodReady       True
Conditions:
  Type                 Status
  InPlaceUpdateReady   True
  KruisePodReady       True
  Initialized          True
  Ready                True
  ContainersReady      True
  PodScheduled         True
Volumes:
  kube-api-access-rmg9h:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  35m   default-scheduler  Successfully assigned default/nginxweb1-8djjn to k8s-worker01
  Normal  Pulling    35m   kubelet            Pulling image "nginx:alpine"
  Normal  Pulled     34m   kubelet            Successfully pulled image "nginx:alpine" in 21.838s (21.838s including waiting)
  Normal  Created    34m   kubelet            Created container nginx
  Normal  Started    34m   kubelet            Started container nginx
~~~

~~~powershell
升级后
# kubectl describe pods nginxweb1-8djjn
Name:             nginxweb1-8djjn
Namespace:        default
Priority:         0
Service Account:  default
Node:             k8s-worker01/192.168.10.163
Start Time:       Fri, 15 Dec 2023 14:59:17 +0800
Labels:           app=nginxweb1
                  apps.kruise.io/cloneset-instance-id=8djjn
                  controller-revision-hash=nginxweb1-674cdcdbd4
                  lifecycle.apps.kruise.io/state=Normal
                  pod-template-hash=674cdcdbd4
Annotations:      apps.kruise.io/inplace-update-state:
                    {"revision":"nginxweb1-674cdcdbd4","updateTimestamp":"2023-12-15T07:35:51Z","lastContainerStatuses":{"nginx":{"imageID":"docker-pullable:/...
                  apps.kruise.io/runtime-containers-meta:
                    {"containers":[{"name":"nginx","containerID":"docker://c8638ea779c9aca8e972c65c4818012381907a99a2902eeeed15d3c6e2570c62","restartCount":1,...
                  cni.projectcalico.org/containerID: 6be64421ee8c276ac10cdb26993d4192b6f50316fed1296854711c25050d50de
                  cni.projectcalico.org/podIP: 10.244.79.74/32
                  cni.projectcalico.org/podIPs: 10.244.79.74/32
                  lifecycle.apps.kruise.io/timestamp: 2023-12-15T07:35:51Z
Status:           Running
IP:               10.244.79.74
IPs:
  IP:           10.244.79.74
Controlled By:  CloneSet/nginxweb1
Containers:
  nginx:
    Container ID:   docker://c8638ea779c9aca8e972c65c4818012381907a99a2902eeeed15d3c6e2570c62
    Image:          nginx:1.24.0
    Image ID:       docker-pullable://nginx@sha256:9700d098d545f9d2ee0660dfb155fe64f4447720a0a763a93f2cf08997227279
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Fri, 15 Dec 2023 15:35:51 +0800
    Last State:     Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Fri, 15 Dec 2023 14:59:40 +0800
      Finished:     Fri, 15 Dec 2023 15:35:51 +0800
    Ready:          True
    Restart Count:  1
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-rmg9h (ro)
Readiness Gates:
  Type                 Status
  InPlaceUpdateReady   True
  KruisePodReady       True
Conditions:
  Type                 Status
  InPlaceUpdateReady   True
  KruisePodReady       True
  Initialized          True
  Ready                True
  ContainersReady      True
  PodScheduled         True
Volumes:
  kube-api-access-rmg9h:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age                  From               Message
  ----    ------     ----                 ----               -------
  Normal  Scheduled  40m                  default-scheduler  Successfully assigned default/nginxweb1-8djjn to k8s-worker01
  Normal  Pulling    40m                  kubelet            Pulling image "nginx:alpine"
  Normal  Pulled     39m                  kubelet            Successfully pulled image "nginx:alpine" in 21.838s (21.838s including waiting)
  Normal  Created    3m39s (x2 over 39m)  kubelet            Created container nginx
  Normal  Started    3m39s (x2 over 39m)  kubelet            Started container nginx
  Normal  Killing    3m39s                kubelet            Container nginx definition changed, will be restarted
  Normal  Pulled     3m39s                kubelet            Container image "nginx:1.24.0" already present on machine
~~~

~~~powershell
# kubectl exec -it nginxweb1-8djjn -- nginx -v
nginx version: nginx/1.24.0
~~~

~~~powershell
# kubectl get pod nginxweb1-8djjn -oyaml|grep image
apps.kruise.io/inplace-update-state: '{"revision":"nginxweb1-674cdcdbd4","updateTimestamp":"2023-12-15T07:35:51Z","lastContainerStatuses":{"nginx":{ imageID":"docker-pullable://nginx@sha256:3923f8de8d2214b9490e68fd6ae63ea604deddd166df2755b788bef04848b9bc"}},"containerBatchesRecord":[{"timestamp":"2023-12-15T07:35:51Z","containers":["nginx"]}]}'
  - image: nginx:1.24.0
    imagePullPolicy: IfNotPresent
    image: nginx:1.24.0
    imageID: docker-pullable://nginx@sha256:9700d098d545f9d2ee0660dfb155fe64f4447720a0a763a93f2cf08997227279
~~~

## 4.5 灰度更新

> 通过灰度更新可以更新部分pod

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS      AGE
nginxweb1-8djjn   1/1     Running   1 (35m ago)   72m
nginxweb1-lgbl6   1/1     Running   1 (37m ago)   59m
nginxweb1-skhfw   1/1     Running   1 (36m ago)   72m
nginxweb1-sxgbr   1/1     Running   1 (37m ago)   60m
~~~

~~~powershell
# cat > 05-ok.yaml <<EOF
apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: nginxweb1
  namespace: default
spec:
  minReadySeconds: 30
  updateStrategy: # 添加更新策略
    type: InPlaceIfPossible
    partition: 2 # 保留旧版本pod数量
  scaleStrategy:
    maxUnavailable: 1
  replicas: 4
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
        image: nginx:1.23.0 # 更换镜像版本
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
EOF
~~~

~~~powershell
# kubectl apply -f 05-ok.yaml
cloneset.apps.kruise.io/nginxweb1 configured
~~~

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS      AGE
nginxweb1-8djjn   1/1     Running   2 (17m ago)   93m
nginxweb1-lgbl6   1/1     Running   1 (58m ago)   80m
nginxweb1-skhfw   1/1     Running   2 (16m ago)   93m
nginxweb1-sxgbr   1/1     Running   1 (57m ago)   80m
~~~

我们会发现只更新了2个pod，还有2个pod没有更新。

# 五、Kruise Rollouts

## 5.1 什么是 Kruise Rollouts？

Kruise Rollouts 是一个 **Bypass(旁路)** 组件，提供 **高级渐进式交付功能** 。它的支持可以帮助您实现对应用程序的更平稳和受控的更改部署，支持金丝雀、多批次和A/B测试交付模式，同时它兼容 Gateway API 和各种 Ingress 实现，使其更容易集成到您的现有基础设施中。总的来说，对于希望优化其部署流程的 Kubernetes 用户来说，Kruise Rollouts 是一个有价值的工具！

![img](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/intro-b644231356f16367db5486c77bb99a02.png)

## 5.2  Kruise Rollouts主要特点

- **更多的发布策略**
  - 用于 Deployment、CloneSet、StatefulSet、Advanced StatefulSet 的多批次更新策略。
  - 用于 Deployment 的金丝雀(Canary)更新策略。
- **更多的流量路由管理策略**
  - 在更新工作负载时进行流量细粒度、加权流量转移。
  - 流量A/B测试，基于HTTP头和Cookie进行流量转移。
- **更多的流量协议支持**
  - Ingress 控制器集成：NGINX、ALB、Higress。
  - 通过 GatewayAPI 进行服务网格集成。
  - 可插拔的 Lua 脚本，以便轻松扩展到其他 Kubernetes 流量协议（甚至CRD）。

## 5.3 Kruise Rollouts 与其它组件对比

Kruise Rollouts 与 [Argo Rollout](https://argoproj.github.io/rollouts/) 和 [Flux Flagger](https://fluxcd.io/flagger/) 的对比。

| 组件         | **Kruise Rollouts**                                          | Argo Rollouts                                  | Flux Flagger                                   |
| ------------ | ------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| 核心概念     | 增强现有的工作负载                                           | 替换您的工作负载                               | 管理您的工作负载                               |
| 架构         | Bypass                                                       | 新的工作负载类型                               | Bypass                                         |
| 插拔和热切换 | 是                                                           | 否                                             | 否                                             |
| 发布类型     | 多批次、金丝雀、A/B测试                                      | 多批次、金丝雀、蓝绿、A/B测试                  | 金丝雀、蓝绿、A/B测试                          |
| 工作负载类型 | Deployment、StatefulSet、CloneSet、Advanced StatefulSet、DaemonSet（进行中） | Agro-Rollout                                   | Deployment、DaemonSet                          |
| 流量类型     | Ingress、GatewayAPI、CRD（需要 Lua 脚本）                    | Ingress、GatewayAPI、APISIX、Traefik、SMI 等等 | Ingress、GatewayAPI、APISIX、Traefik、SMI 等等 |
| 迁移成本     | 无需迁移工作负载和Pods                                       | 必须迁移工作负载和Pods                         | 必须迁移Pods                                   |
| HPA 兼容性   | 是                                                           | 是                                             | 否                                             |

## 5.4 Kruise Rollouts 安装

### 5.4.1 要求

- 安装 Kubernetes 集群，需要 **Kubernetes 版本 >= 1.19**。
- (可选，如果使用 CloneSet) Helm 安装 OpenKruise，**自 v1.1.0 起** ，参考[安装 OpenKruise](https://openkruise.io/docs/installation)。

### 5.4.2 使用Helm安装

Kruise Rollout 可以简单地通过 Helm v3.1+ 安装，Helm 是一个简单的命令行工具，您可以从[这里](https://github.com/helm/helm/releases)获取。

~~~powershell
首先，如果您还没有添加 openkruise Charts库，请执行以下命令。
# helm repo add openkruise https://openkruise.github.io/charts/

[可选]
$ helm repo update
~~~

~~~powershell
# helm search repo kruise-rollout
NAME                            CHART VERSION   APP VERSION     DESCRIPTION
openkruise/kruise-rollout       0.4.0           0.4.0           Helm chart for kruise-rollout components
~~~

~~~powershell
安装最新版本。
$ helm install kruise-rollout openkruise/kruise-rollout --version 0.4.0
~~~

~~~powershell
# kubectl get ns
NAME               STATUS   AGE
......
kruise-rollout     Active   15s
~~~

~~~powershell
# kubectl get pods -n kruise-rollout
NAME                                                 READY   STATUS    RESTARTS   AGE
kruise-rollout-controller-manager-5bf696cf95-fhkw5   1/1     Running   0          31s
kruise-rollout-controller-manager-5bf696cf95-sf8cg   1/1     Running   0          31s
~~~

### 5.4.3 使用Helm升级

~~~powershell
首先，如果您还没有添加 openkruise Charts库，请执行以下命令。
$ helm repo add openkruise https://openkruise.github.io/charts/

[可选]
$ helm repo update

升级到最新版本。
$ helm upgrade kruise-rollout openkruise/kruise-rollout --version 0.4.0 [--force]
~~~

### 5.4.4 kubectl plugin安装

>https://github.com/openkruise/kruise-tools

![image-20231215174853150](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231215174853150.png)

![image-20231215174932901](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231215174932901.png)

~~~powershell
# wget https://github.com/openkruise/kruise-tools/releases/download/v1.0.5/kubectl-kruise-linux-amd64.tar.gz
~~~

~~~powershell
# ls
kubectl-kruise-linux-amd64.tar.gz
# tar xf kubectl-kruise-linux-amd64.tar.gz
# ls
linux-amd64

# ls linux-amd64/
kubectl-kruise  LICENSE  README.md

# mv linux-amd64/kubectl-kruise /usr/bin/
~~~

~~~powershell
# kubectl-kruise version
Client Version: version.Info{Major:"1", Minor:"0", GitVersion:"v1.0.5", GitCommit:"a27ae8ca65b365a38f797f19f0b8821925389290", GitTreeState:"clean", BuildDate:"2022-10-13T06:45:07Z", GoVersion:"go1.16.15", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"28", GitVersion:"v1.28.2", GitCommit:"89a4ea3e1e4ddd7f7572286090359983e0387b2f", GitTreeState:"clean", BuildDate:"2023-09-13T09:29:07Z", GoVersion:"go1.20.8", Compiler:"gc", Platform:"linux/amd64"}
WARNING: version difference between client (1.0) and server (1.28) exceeds the supported minor version skew of +/-1
~~~

## 5.5 Kruise Rollouts 基本使用(多批次发布)

### 5.5.1 使用Deployment部署应用

~~~powershell
# cat > 01-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workload-demo
  namespace: default
spec:
  replicas: 10
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: busybox
          image: busybox:latest
          command: [ "/bin/sh", "-c", "sleep 100d" ]
          env:
            - name: VERSION
              value: "version-1"
EOF
~~~

~~~powershell
# kubectl apply -f 01-deployment.yaml
deployment.apps/workload-demo created
~~~

~~~powershell
# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
workload-demo-947f474c6-55bzp   1/1     Running   0          38s
workload-demo-947f474c6-6c4z8   1/1     Running   0          38s
workload-demo-947f474c6-9xz66   1/1     Running   0          38s
workload-demo-947f474c6-jt28q   1/1     Running   0          38s
workload-demo-947f474c6-mcntk   1/1     Running   0          38s
workload-demo-947f474c6-n5nht   1/1     Running   0          38s
workload-demo-947f474c6-p9p47   1/1     Running   0          38s
workload-demo-947f474c6-x7k49   1/1     Running   0          38s
workload-demo-947f474c6-xhxp2   1/1     Running   0          38s
workload-demo-947f474c6-zbr7r   1/1     Running   0          38s
~~~

### 5.5.2 准备Rollout对象

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

~~~powershell
# kubectl apply -f 02-rollout.yaml
rollout.rollouts.kruise.io/rollouts-demo created
~~~

~~~powershell
# kubectl get rollout
NAME            STATUS    CANARY_STEP   CANARY_STATE   MESSAGE                            AGE
rollouts-demo   Healthy   3             Completed      workload deployment is completed   22s
~~~

### 5.5.3 将部署升级到“version-2” 并发布第一批次

~~~powershell
# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
workload-demo-947f474c6-55bzp   1/1     Running   0          16m
workload-demo-947f474c6-6c4z8   1/1     Running   0          16m 被更新
workload-demo-947f474c6-9xz66   1/1     Running   0          16m
workload-demo-947f474c6-jt28q   1/1     Running   0          16m
workload-demo-947f474c6-mcntk   1/1     Running   0          16m
workload-demo-947f474c6-n5nht   1/1     Running   0          16m
workload-demo-947f474c6-p9p47   1/1     Running   0          16m
workload-demo-947f474c6-x7k49   1/1     Running   0          16m
workload-demo-947f474c6-xhxp2   1/1     Running   0          16m
workload-demo-947f474c6-zbr7r   1/1     Running   0          16m
~~~

~~~powershell
# kubectl get deployment
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
workload-demo   10/10   10           10          16m
~~~

~~~powershell
# kubectl patch deployment workload-demo -p '{"spec":{"template":{"spec":{"containers":[{"name":"busybox", "env":[{"name":"VERSION", "value":"version-2"}]}]}}}}'

deployment.apps/workload-demo patched
~~~

~~~powershell
# kubectl get pods
NAME                             READY   STATUS    RESTARTS   AGE
workload-demo-76fd76f75b-l29dd   1/1     Running   0          112s 替换了
workload-demo-947f474c6-55bzp    1/1     Running   0          19m
workload-demo-947f474c6-9xz66    1/1     Running   0          19m
workload-demo-947f474c6-jt28q    1/1     Running   0          19m
workload-demo-947f474c6-mcntk    1/1     Running   0          19m
workload-demo-947f474c6-n5nht    1/1     Running   0          19m
workload-demo-947f474c6-p9p47    1/1     Running   0          19m
workload-demo-947f474c6-x7k49    1/1     Running   0          19m
workload-demo-947f474c6-xhxp2    1/1     Running   0          19m
workload-demo-947f474c6-zbr7r    1/1     Running   0          19m

~~~

~~~powershell
# kubectl get deployment
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
workload-demo   10/10   1            10          38m
~~~

~~~powershell
# kubectl get replicaset -L pod-template-hash
NAME                       DESIRED   CURRENT   READY   AGE   POD-TEMPLATE-HASH
workload-demo-76fd76f75b   1         1         1       23m   76fd76f75b
workload-demo-947f474c6    9         9         9       40m   947f474c6
~~~

~~~powershell
# kubectl get rollouts
NAME            STATUS        CANARY_STEP   CANARY_STATE   MESSAGE                                                                         AGE
rollouts-demo   Progressing   1             StepPaused     Rollout is in step(1/3), and you need manually confirm to enter the next step   31m
~~~

### 5.5.4 发布第二批次

~~~powershell
# kubectl-kruise rollout approve rollouts/rollouts-demo
rollout.rollouts.kruise.io/rollouts-demo approved
~~~

~~~powershell
# kubectl get rollouts
NAME            STATUS        CANARY_STEP   CANARY_STATE   MESSAGE                                                                         AGE
rollouts-demo   Progressing   2             StepPaused     Rollout is in step(2/3), and you need manually confirm to enter the next step   36m
~~~

~~~powershell
# kubectl get deployment
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
workload-demo   10/10   5            10          50m
~~~

~~~powershell
# kubectl get replicaset
NAME                       DESIRED   CURRENT   READY   AGE
workload-demo-76fd76f75b   5         5         5       33m
workload-demo-947f474c6    5         5         5       50m
~~~

~~~powershell
# kubectl get pods
NAME                             READY   STATUS    RESTARTS   AGE
workload-demo-76fd76f75b-5ltsz   1/1     Running   0          67s
workload-demo-76fd76f75b-fh6j6   1/1     Running   0          66s
workload-demo-76fd76f75b-l29dd   1/1     Running   0          33m
workload-demo-76fd76f75b-v6dqk   1/1     Running   0          66s
workload-demo-76fd76f75b-xzvx7   1/1     Running   0          67s
workload-demo-947f474c6-55bzp    1/1     Running   0          50m
workload-demo-947f474c6-9xz66    1/1     Running   0          50m
workload-demo-947f474c6-mcntk    1/1     Running   0          50m
workload-demo-947f474c6-p9p47    1/1     Running   0          50m
workload-demo-947f474c6-xhxp2    1/1     Running   0          50m
~~~

### 5.5.5 发布第三批次

~~~powershell
# kubectl-kruise rollout approve rollouts/rollouts-demo
rollout.rollouts.kruise.io/rollouts-demo approved
~~~

~~~powershell
# kubectl get rollouts
NAME            STATUS        CANARY_STEP   CANARY_STATE   MESSAGE                                                        AGE
rollouts-demo   Progressing   3             StepUpgrade    Rollout is in step(3/3), and upgrade workload to new version   39m
~~~

~~~powershell
# kubectl get replicasets
NAME                       DESIRED   CURRENT   READY   AGE
workload-demo-76fd76f75b   10        10        10      36m
workload-demo-947f474c6    0         0         0       53m
~~~

## 5.6 Kruise Rollouts发布策略

### 5.6.1 金丝雀发布

> 需要负载均衡器metallb及ingress nginx配合。

#### 5.6.1.1 发布流程

![img](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/canary-cd02349ab581eac50c75ad0a3a1edc35.jpg)

#### 5.6.1.2 推荐配置

>金丝雀策略仅适用于Deployment。

~~~powershell
apiVersion: rollouts.kruise.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
  annotations:
    rollouts.kruise.io/rolling-style: canary
spec:
  objectRef:
    workloadRef:
      apiVersion: apps/v1
      kind: Deployment
      name: workload-demo
  strategy:
    canary:
      steps:
        - weight: 20
  trafficRoutings:
    - service: service-demo
      ingress:
        classType: nginx
        name: ingress-demo
~~~

当你为`workload-demo`应用新修订版本时：

- `workload-demo`工作负载将被暂停，不会更新任何Pod；
- 将创建一个新的金丝雀Deployment，其副本数为`workload-demo`的“20%”（总计将有`120%`的Pods）；
- `20%`的流量将被引导到新的金丝雀Deployment的Pods。

当你认为金丝雀验证已经通过并确认进行下一步时：

- `workload-demo`工作负载将使用本机滚动更新策略进行升级；
- 流量将恢复到原始的负载均衡策略；
- 金丝雀Deployment和Pods将被删除。

#### 5.6.1.3 金丝雀部署案例

##### 5.6.1.3.0 负载均衡器metallb部署

###### 5.6.1.3.0.1 修改kube-proxy代理模式

~~~powershell
# kubectl get configmap -n kube-system
NAME                                                   DATA   AGE
......
kube-proxy                                             2      35h
~~~

~~~powershell
# kubectl edit configmap kube-proxy -n kube-system
   ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: true 由原来的flase修改为true
      syncPeriod: 0s
      tcpFinTimeout: 0s
      tcpTimeout: 0s
      udpTimeout: 0s
    kind: KubeProxyConfiguration
    logging:
      flushFrequency: 0
      options:
        json:
          infoBufferSize: "0"
      verbosity: 0
    metricsBindAddress: ""
    mode: "ipvs" 默认为空，添加ipvs
~~~

~~~powershell
# kubectl rollout restart daemonset kube-proxy -n kube-system
~~~

###### 5.6.1.3.0.2 metallb部署 

![image-20231013093528604](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013093528604.png)

![image-20231013093709673](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013093709673.png)

~~~powershell
# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

###### 5.6.1.3.0.3 IP地址池准备

~~~powershell
# vim ippool.yaml
# cat ippool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.240-192.168.10.250
~~~

~~~powershell
# kubectl apply -f ippool.yaml
~~~

###### 5.6.1.3.0.4 开启二层通告

~~~powershell
# vim l2.yaml
# cat l2.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
~~~

~~~powershell
# kubectl apply -f l2.yaml
~~~

##### 5.6.1.3.1 服务代理ingress nginx部署

###### 5.6.1.3.1.1  获取ingress nginx部署文件

![image-20231013094055365](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013094055365.png)

![image-20231013094123408](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013094123408.png)

![image-20231013094243973](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013094243973.png)

![image-20231013094322906](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013094322906.png)

![image-20231013094402166](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/image-20231013094402166.png)

~~~powershell
# mkdir tsdir
# cd tsdir/
~~~

~~~powershell
# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

###### 5.6.1.3.1.2 修改ingress nginx部署文件

~~~powershell
# vim deploy.yaml
# cat deploy.yaml
......
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.8.2
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  externalTrafficPolicy: Cluster 由Local修改为Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: http
    name: http
    port: 80
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  type: LoadBalancer 此处为LoadBalancer
......
~~~

###### 5.6.1.3.1.3 部署ingress nginx

~~~powershell
# kubectl apply -f deploy.yaml
~~~

~~~powershell
# kubectl get ns
NAME               STATUS   AGE
......
ingress-nginx      Active   10h
~~~

~~~powershell
# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.111.3.227     192.168.10.240   80:32757/TCP,443:31886/TCP   10h
ingress-nginx-controller-admission   ClusterIP      10.106.142.161   <none>           443/TCP                      10h
~~~

##### 5.6.1.3.2 部署应用

>这是 echoserver 应用程序的示例，其中包含 ingress, service, 和 deployment crd 资源

~~~powershell
# cat > 01-deploy.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echoserver
  labels:
    app: echoserver
spec:
  replicas: 5
  selector:
    matchLabels:
      app: echoserver
  template:
    metadata:
      labels:
        app: echoserver
    spec:
      containers:
      - name: echoserver
        image: cilium/echoserver:1.10.2
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: '8080'
---
apiVersion: v1
kind: Service
metadata:
  name: echoserver
  labels:
    app: echoserver
spec:
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: echoserver
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: echoserver
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com
    http:
      paths:
      - backend:
          service:
            name: echoserver
            port:
              number: 80
        path: /apis/echo
        pathType: Exact
EOF
~~~

~~~powershell
# kubectl apply -f 01-deploy.yaml

deployment.apps/echoserver created
service/echoserver created
ingress.networking.k8s.io/echoserver created
~~~

~~~powershell
# kubectl get pods
NAME                             READY   STATUS        RESTARTS   AGE
echoserver-6dc57b8467-4vfgs      1/1     Running       0          35s
echoserver-6dc57b8467-5mdfj      1/1     Running       0          35s
echoserver-6dc57b8467-7b2mm      1/1     Running       0          35s
echoserver-6dc57b8467-9bz9t      1/1     Running       0          35s
echoserver-6dc57b8467-sc9k4      1/1     Running       0          35s
echoserver-6dc57b8467-ttjkq      1/1     Terminating   0          88s
~~~

~~~powershell
# kubectl get deployment
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
echoserver      5/5     5            5           42s
~~~

~~~powershell
# kubectl get ingress
NAME         CLASS   HOSTS             ADDRESS          PORTS   AGE
echoserver   nginx   www.kubemsb.com   192.168.10.240   80      51s
~~~

~~~powershell
# cat /etc/hosts
......
192.168.10.240 www.kubemsb.com

~~~

~~~powershell
#  curl http://www.kubemsb.com/apis/echo

Hostname: echoserver-6dc57b8467-7b2mm

Pod Information:
        -no pod information available-

Server values:
        server_version=nginx: 1.13.3 - lua: 10008

Request Information:
        client_address=::ffff:10.244.79.90
        method=GET
        real path=/apis/echo
        query=
        request_version=1.1
        request_scheme=http
        request_uri=http://www.kubemsb.com:8080/apis/echo

Request Headers:
        accept=*/*
        host=www.kubemsb.com
        user-agent=curl/7.29.0
        x-forwarded-for=192.168.10.160
        x-forwarded-host=www.kubemsb.com
        x-forwarded-port=80
        x-forwarded-proto=http
        x-forwarded-scheme=http
        x-real-ip=192.168.10.160
        x-request-id=1eae20e590a9ea14af50e2d5af173c2d
        x-scheme=http

Request Body:
        -no body in request-
~~~

##### 5.6.1.3.3 创建rollout

Kruise Rollout CRD 定义了 deployment rollout 发布过程，如下是一个金丝雀发布的例子，第一步是 20% 的 pod，以及路由 5% 的 traffics 到新版本

~~~powershell
# cat > 02-rollout.yaml << EOF
apiVersion: rollouts.kruise.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo-echoserver
  # The rollout resource needs to be in the same namespace as the corresponding workload(deployment, cloneSet)
  namespace: default
  annotations:
    rollouts.kruise.io/rolling-style: canary
spec:
  objectRef:
    # rollout of published workloads, currently only supports Deployment, CloneSet
    workloadRef:
      apiVersion: apps/v1
      kind: Deployment
      name: echoserver
  strategy:
    canary:
      # canary published, e.g. 20%, 40%, 60% ...
      steps:
      # routing 5% traffics to the new version
        - weight: 5
      # Manual confirmation of the release of the remaining pods
          pause: {}
      # optional, The first step of released replicas. If not set, the default is to use 'weight', as shown above is 5%.
          replicas: 20%
      trafficRoutings:
    # echoserver service name
        - service: echoserver
      # nginx ingress
      # type: nginx
        # echoserver ingress name, current only nginx ingress
          ingress:
            classType: nginx
            name: echoserver
EOF
~~~

>**字段 type: nginx 上 github 项目没有，需要自行添加，否则创建资源报错！**

~~~powershell
# kubectl apply -f 02-rollout.yaml
rollout.rollouts.kruise.io/rollouts-demo-echoserver created
~~~

~~~powershell
# kubectl get rollout
NAME                       STATUS    CANARY_STEP   CANARY_STATE   MESSAGE                                  AGE
rollouts-demo-echoserver   Healthy   1             Completed      workload deployment is completed         72s
~~~

##### 5.6.1.3.4 更新版本发布

将部署中的镜像版本从 1.10.2 改为 1.10.3，然后 kubectl apply -f deployment.yaml 到 k8s 集群，如下所示。

Kruise Rollout Controller 会监听上述行为并在 webhook 中设置部署 paused=true，然后根据用户定义的部署、服务和入口配置生成相应的 canary 资源。

如下所示，replicas(5)*replicas(20%)=1 新版本的 Pod 被发布，5% 的流量被路由到新版本

~~~powershell
# vim 01-deploy.yaml
# cat 01-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echoserver
  labels:
    app: echoserver
spec:
  replicas: 5
  selector:
    matchLabels:
      app: echoserver
  template:
    metadata:
      labels:
        app: echoserver
    spec:
      containers:
      - name: echoserver
        image: cilium/echoserver:1.10.3 由原来的1.10.2修改为1.10.3
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: '8080'
---
......
~~~

~~~powershell
# kubectl apply -f 01-deploy.yaml
deployment.apps/echoserver configured
service/echoserver unchanged
ingress.networking.k8s.io/echoserver unchanged
~~~

~~~powershell
# kubectl get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
echoserver         5/5     0            5           41m
echoserver-8s69m   1/1     1            1           30s
~~~

~~~powershell
# kubectl describe deployment echoserver-8s69m
Name:                   echoserver-8s69m
Namespace:              default
CreationTimestamp:      Fri, 15 Dec 2023 20:23:55 +0800
Labels:                 rollouts.kruise.io/canary-deployment=echoserver
Annotations:            batchrelease.rollouts.kruise.io/control-info:
                          {"apiVersion":"rollouts.kruise.io/v1alpha1","kind":"BatchRelease","name":"rollouts-demo-echoserver","uid":"f7c815df-ac73-4f8e-8ce3-cc57ea5...
                        deployment.kubernetes.io/revision: 1
Selector:               app=echoserver
Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=echoserver
  Containers:
   echoserver:
    Image:      cilium/echoserver:1.10.3
    Port:       8080/TCP
    Host Port:  0/TCP
    Environment:
      PORT:  8080
    Mounts:  <none>
  Volumes:   <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Progressing    True    NewReplicaSetAvailable
  Available      True    MinimumReplicasAvailable
OldReplicaSets:  <none>
NewReplicaSet:   echoserver-8s69m-57569db688 (1/1 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  2m17s  deployment-controller  Scaled up replica set echoserver-8s69m-57569db688 to 1 from 0
~~~

~~~powershell
# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
echoserver-6dc57b8467-4vfgs         1/1     Running   0          42m
echoserver-6dc57b8467-5mdfj         1/1     Running   0          42m
echoserver-6dc57b8467-7b2mm         1/1     Running   0          42m
echoserver-6dc57b8467-9bz9t         1/1     Running   0          42m
echoserver-6dc57b8467-sc9k4         1/1     Running   0          42m
echoserver-8s69m-57569db688-kq984   1/1     Running   0          59s
~~~

~~~powershell
# kubectl get ingress
NAME                CLASS   HOSTS             ADDRESS          PORTS   AGE
echoserver          nginx   www.kubemsb.com   192.168.10.240   80      42m
echoserver-canary   nginx   www.kubemsb.com   192.168.10.240   80      64s
~~~

~~~powershell
# kubectl get rollout
NAME                       STATUS        CANARY_STEP   CANARY_STATE   MESSAGE                                                                         AGE
rollouts-demo-echoserver   Progressing   1             StepPaused     Rollout is in step(1/1), and you need manually confirm to enter the next step   13m
~~~

##### 5.6.1.3.5 批准发布

Rollout 状态显示，当前的 rollout 状态是 StepPaused，这意味着前 20% 的 Pod 被发布成功，5%的流量被路由到新版本上

之后，开发人员可以使用一些其他方法，如 Prometheus metrics 业务指标，确定发布符合预期，然后通过 kubectl-kruise rollout approve rollout/rollouts-demo-echoserver -n default 和等待部署发布完成

~~~powershell
# kubectl-kruise rollout approve rollout/rollouts-demo-echoserver -n default
rollout.rollouts.kruise.io/rollouts-demo-echoserver approved
~~~

~~~powershell
# kubectl get rollout
NAME                       STATUS        CANARY_STEP   CANARY_STATE   MESSAGE                                                          AGE
rollouts-demo-echoserver   Progressing   1             Completed      Rollout has been completed and some closing work is being done   16m
~~~

~~~powershell
# kubectl get deployment
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
echoserver      5/5     5            5           52m
~~~

~~~powershell
# kubectl get pods
NAME                             READY   STATUS    RESTARTS   AGE
echoserver-57569db688-dlh5s      1/1     Running   0          92s
echoserver-57569db688-h5z5x      1/1     Running   0          92s
echoserver-57569db688-rfg8r      1/1     Running   0          92s
echoserver-57569db688-tc2n5      1/1     Running   0          68s
echoserver-57569db688-x4wwb      1/1     Running   0          90s
~~~

### 5.6.2 多批次发布

#### 5.6.2.1 多批次策略流程

![img](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/multi-batch-9ab654fa21d93c2b4fcfe318e5f66e28.jpg)

#### 5.6.2.2 推荐配置

> 目前，多批次策略可用于CloneSet、StatefulSet、Advanced StatefulSet和Deployment。

~~~powershell
apiVersion: rollouts.kruise.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
  annotations:
    rollouts.kruise.io/rolling-style: partition
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
~~~

当你为`workload-demo`应用新修订版本时：

- 在第一批中，将更新`1`个Pod，而`replicas-1`个Pod仍然保持在稳定版本，需要手动确认到下一批。
- 在第二批中，将更新`50%`的Pod，而`50%`的Pod仍然保持在稳定版本，需要手动确认到下一批。
- 在第三批中，将更新`100%`的Pod，而`0`个Pod仍然保持在稳定版本。

与[金丝雀发布策略](https://openkruise.io/zh/rollouts/user-manuals/strategy-canary-update)不同，**在发布过程中不会创建额外的部署**。

### 5.6.3 A/B测试

#### 5.6.3.1 A/B 测试流程

A/B测试流程结合了**金丝雀发布**：

![img](/云原生/k8s-course/k8s-course-17-原地升级及全链路灰度发布解决方案-openkruise/ab-testing-e537fc007e1e4a9500eeb07d38faa639.jpg)

#### 5.6.3.2 配置示例

>**目前，A/B测试策略可用于CloneSet、StatefulSet、Advanced StatefulSet和Deployment。**

实际上，A/B测试需要与金丝雀或多批次发布策略结合使用，如上图所示。

接下来，我们将提供一个关于**A/B测试与多批次发布策略**的示例：

~~~powershell
apiVersion: rollouts.kruise.io/v1alpha1
kind: Rollout
metadata:
  name: rollouts-demo
  annotations:
    rollouts.kruise.io/rolling-style: partition
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
          matches:
            - headers:
                - name: user-agent
                  type: Exact
                  value: pc
        - replicas: 50%
        - replicas: 100%
    trafficRoutings:
      - service: service-demo
        ingress:
          classType: nginx
          name: ingress-demo
~~~

当你为 `workload-demo` 应用新修订版本时：

- 在第一批中将更新`1`个Pod，具有HTTP头`user-agent=pc`的流量将被引导到新版本Pod，其他流量将被引导到稳定版本Pod。需要手动确认到下一批。
- 在第二批中将更新`50%`的Pod，Header匹配规则将被取消，所有流量将遵循原始负载均衡规则。需要手动确认到下一批。
- 在第三批中将更新`100%`的Pod，Header匹配规则将被取消，所有流量将遵循原始负载均衡规则。

