---
title: "如何使用argo-rollouts实现金丝雀发布？"
sidebarGroup: "K8s 课程笔记"
shortTitle: "16 如何使用argo-rollouts实现金丝雀..."
order: 16
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 课程笔记"
  - "云原生"
  - "课程笔记"
description: "如何使用argo-rollouts实现金丝雀发布？ 一、什么是Argo rollouts？ 1.1 什么是Argo Rollouts? Argo-Rollout是一个Kubernetes Contro..."
---

> **K8s 课程笔记 · 第 16 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何使用argo-rollouts实现金丝雀发布？

#  一、什么是Argo rollouts？

## 1.1 什么是Argo Rollouts?

Argo-Rollout是一个Kubernetes Controller和对应一系列的CRD，提供更强大的Deployment能力。包括灰度发布、蓝绿部署、更新测试(experimentation)、渐进式交付(progressive delivery)等特性。

**渐进式交付是以受控和渐进的方式发布产品更新的过程，从而降低发布的风险，通常将自动化和指标分析结合起来以驱动更新的自动升级或回滚。**

![img](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/57937c299eb9e36a75a128bcdb4ac47722d568.jpg)

渐进式交付通常被描述为持续交付的演变，将 CI/CD 中的速度优势扩展到部署过程。通过将新版本限制在一部分用户，观察和分析正确的行为，然后逐渐增加更多的流量，同时不断验证其正确性。

Argo Rollouts（可选）与[入口控制器](https://kubernetes.io/docs/concepts/services-networking/ingress/)和服务网格集成，利用其流量整形功能在更新期间逐渐将流量转移到新版本。此外，可以查询和解释来自各个提供商的指标，以验证关键 KPI 并在更新期间推动自动升级或回滚。

## 1.2 为什么要使用Argo Rollouts？

原生的Kubernetes Deployment Object支持`RollingUpdate`在更新期间提供一组基本安全保证（就绪探针）的策略。然而滚动更新策略面临着许多限制：

- 对发布速度的控制很少
- 无法控制新版本的流量
- 就绪探针不适合进行更深入、压力或一次性检查
- 无法查询外部指标来验证更新
- 可以停止进度，但无法自动中止和回滚更新

由于这些原因，在大规模大批量生产环境中，滚动更新通常被认为是更新过程风险太大，因为它无法控制出现问题的范围，可能会过于激进地发布，并且在失败时不提供自动回滚。

## 1.3 Argo Rollouts特性有哪些？

支持特性如下：

- 蓝绿色更新策略
- 金丝雀更新策略
- 细粒度，加权流量转移
- 自动回rollback和promotion
- 手动判断
- 可定制的指标查询和业务KPI分析
- 入口控制器集成：NGINX，ALB
- 服务网格集成：Istio，Linkerd，SMI
- Metric provider集成：Prometheus，Wavefront，Kayenta，Web，Kubernetes Jobs

## 1.4 Argo Rollouts是如何工作的？

与 Deployment 对象类似，Argo Rollouts 控制器将管理 ReplicaSets 的创建、缩放和删除，这些 ReplicaSet 由 Rollout 资源中的 spec.template 定义，使用与 Deployment 对象相同的 pod 模板。

当 spec.template 变更时，这会向 Argo Rollouts 控制器发出信号，表示将引入新的 ReplicaSet，控制器将使用 spec.strategy 字段内的策略来确定从旧 ReplicaSet 到新 ReplicaSet 的 rollout 将如何进行，一旦这个新的 ReplicaSet 被放大（可以选择通过一个 Analysis），控制器会将其标记为稳定。

如果在 spec.template 从稳定的 ReplicaSet 过渡到新的 ReplicaSet 的过程中发生了另一次变更（即在发布过程中更改了应用程序版本），那么之前的新 ReplicaSet 将缩小，并且控制器将尝试发布反映更新 spec.template 字段的 ReplicasSet。

## 1.5 Argo Rollouts部署策略

为了明确 Argo Rollouts 的行为方式，以下是 Argo Rollouts 提供的各种部署策略实施的描述。

- **RollingUpdate(滚动更新)** ：慢慢地用新版本替换旧版本，随着新版本的出现，旧版本会慢慢缩减，以保持应用程序的总数量。这是 Deployment 对象的默认策略。
- **Recreate(重新创建)** ：Recreate 会在启动新版本之前删除旧版本的应用程序，这可确保应用程序的两个版本永远不会同时运行，但在部署期间会出现停机时间。
- **Blue-Green(蓝绿)** ：蓝绿发布指同时部署了新旧两个版本的应用程序，在此期间，只有旧版本的应用程序会收到生产流量，这允许开发人员在将实时流量切换到新版本之前针对新版本进行测试。

![img](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/e9cf4e268aa738e860f10559e8ce96944a85f3.jpg)

- **Canary(金丝雀)** ：金丝雀发布指将一部分用户暴露在新版本的应用程序中，而将其余流量提供给旧版本，一旦新版本被验证是正确的，新版本可以逐渐取代旧版本。Ingress 控制器和服务网格，如 NGINX Ingress 和 Istio，可以使金丝雀的流量拆分模式比原生的更复杂（例如，实现非常细粒度的流量分割，或基于 HTTP 头的分割）。

![img](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/f2b26c646d5c7537d4e798a59af1ea7cbfbcb0.jpg)

上图显示了一个有两个阶段的金丝雀（10%和 33%的流量进入新版本），通过使用 Argo Rollouts，我们可以根据实际的使用情况定义确切的阶段数和流量百分比。

## 1.6 Argo Rollouts架构图

> 官网网址：https://argoproj.github.io/argo-rollouts/

下面展示了由 Argo Rollouts 管理的 Deployment 的所有组件。

![Argo Rollouts Architecture](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/argo-rollout-architecture.png)

### Rollout Controller

这是主控制器，用于监视集群的事件并在 Rollout 类型的资源发生更改时做出反应。控制器将读取 rollout 的所有详细信息，并使集群处于 rollout 定义中描述的相同状态。

请注意，Argo Rollouts 不会篡改或响应正常 Deployment 资源上发生的任何变更，这意味着你可以在一个使用其他方法部署应用的集群中安装 Argo Rollouts。

### Rollout 资源

Rollout 资源是 Argo Rollouts 引入和管理的一种自定义 Kubernetes 资源，它与原生的 Kubernetes Deployment 资源基本兼容，但有额外的字段来控制更加高级的部署方法，如金丝雀和蓝/绿部署。

Argo Rollouts 控制器将只对 Rollout 资源中的变化做出反应，不会对正常的 Deployment 资源做任何事情，所以如果你想用 Argo Rollouts 管理你的 Deployment，你需要将你的 Deployment 迁移到 Rollouts。

### AnalysisTemplate 与 AnalysisRun

Analysis 是一种自定义 Kubernetes 资源，它将 Rollout 连接到指标提供程序，并为某些指标定义特定阈值，这些阈值将决定 Rollout 是否成功。对于每个 Analysis，你可以定义一个或多个指标查询及其预期结果，如果指标查询正常，则 Rollout 将继续发布；如果指标显示失败，则自动回滚；如果指标无法提供成功/失败的结果，则暂停发布。

为了执行分析，Argo Rollouts 提供了两个自定义的 Kubernetes 资源：AnalysisTemplate 和 AnalysisRun。

AnalysisTemplate 包含有关要查询哪些指标的说明。附加到 Rollout 的实际结果是 AnalysisRun 自定义资源，可以在特定 的 Rollout 上定义 AnalysisTemplate，也可以在集群上定义全局的 AnalysisTemplate，以供多个 Rollout 共享作为 ClusterAnalysisTemplate，而 AnalysisRun 资源的范围仅限于特定的 rollout。

请注意，在 Rollout 中使用分析和指标是完全可选的，你可以通过 API 或 CLI 手动暂停和继续发布，也可以使用其他外部方法（例如冒烟测试）。你不需要仅使用 Argo Rollouts 的指标解决方案，你还可以在 Rollout 中混合自动（即基于分析）和手动步骤。

除了指标之外，你还可以通过运行 Kubernetes Job 或运行 webhook 来决定发布的成功与否。

### Metric Providers

Argo Rollouts 包括多个流行指标提供程序的本机集成，你可以在分析资源中使用这些提供程序来自动升级或回滚部署。有关特定设置选项，请参阅每个提供商的文档。

Argo Rollouts 包括几个流行的指标提供者的集成，你可以在分析资源中使用，来自动升级或回滚发布。

# 二、Argo rollouts安装

## 2.1 在Kubernetes集群中安装argo rollouts

![image-20231213100932820](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213100932820.png)

![image-20231213100955045](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213100955045.png)

![image-20231213101045674](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213101045674.png)

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

## 2.2 安装argo rollouts的kubectl plugin

还可以安装一个 kubectl 插件，对于命令行管理和可视化发布非常方便。使用 curl 安装 Argo Rollouts kubectl 插件

![image-20231213101512199](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213101512199.png)

![image-20231213101603479](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213101603479.png)

~~~powershell
# curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
~~~

~~~powershell
# ls
kubectl-argo-rollouts-linux-amd64
~~~

~~~powershell
# chmod +x kubectl-argo-rollouts-linux-amd64
~~~

~~~powershell
# mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
~~~

执行下面的命令来验证插件是否安装成功

~~~powershell
# kubectl argo rollouts version
~~~

## 2.3 Argo-Rollouts Dashboard

Argo Rollouts Kubectl 插件可以提供一个本地 Dashboard，来可视化你的 Rollouts。

要启动这个 Dashboard，需要在包含 Rollouts 资源对象的命名空间中运行 kubectl argo rollouts dashboard 命令，然后访问localhost:3100 即可。

~~~powershell
# kubectl argo rollouts dashboard

INFO[0000] Argo Rollouts Dashboard is now available at http://localhost:3100/rollouts
~~~

~~~powershell
# firefox http://localhost:3100/rollouts &
~~~

![image-20231213160527100](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213160527100.png)

![image-20231213160916599](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213160916599.png)

点击 Rollout 可以进行详细页面，在详细页面可以看到 Rollout 的配置信息，还可以直接在 UI 界面上执行一些常用的操作，比如重启、重启、中断等。

![image-20231213161346355](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213161346355.png)

# 三、负载均衡器metallb部署

## 3.1 修改kube-proxy代理模式

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

## 3.2 metallb部署 

### 3.2.1 metallb部署

![image-20231013093528604](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013093528604.png)

![image-20231013093709673](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013093709673.png)

~~~powershell
# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

### 3.2.2 IP地址池准备

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

### 3.2.3 开启二层通告

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

# 四、通过argo-rollouts实现金丝雀发布

## 4.1 金丝雀发布过程分类

金丝雀发布包含Replica Shifting和Traffic Shifting两个过程。

- Replica Shifting：版本替换
- Traffic Shifting：流量接入

## 4.2 Replica Shifting 版本替换

### 4.2.1 部署应用

#### 4.2.1.1 获取YAML文件

~~~powershell
# mkdir rsdir
# cd rsdir
~~~

~~~powershell
# wget https://raw.githubusercontent.com/argoproj/argo-rollouts/master/docs/getting-started/basic/rollout.yaml
~~~

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

~~~powershell
说明：
可以看到除了apiVersion，kind以及strategy之外，其他和Deployment无异。

strategy字段定义的是发布策略，其中：

setWeight：设置流量的权重
pause：暂停，如果里面没有跟duration: 10则表示需要手动更新，如果跟了表示等待多长时间会自动更新。
~~~

~~~powershell
# wget https://raw.githubusercontent.com/argoproj/argo-rollouts/master/docs/getting-started/basic/service.yaml
~~~

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

或，下面的方式可以访问到service服务可视化。

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
  type: LoadBalancer
  selector:
    app: rollouts-demo
~~~

~~~powershell
说明：
service.yaml文件定义的就是普通的service
~~~

#### 4.2.1.2 部署YAML文件

~~~powershell
# kubectl apply -f rollout.yaml
rollout.argoproj.io/rollouts-demo created
~~~

任何 Rollout 的初始创建都会立即将副本扩展到 100%（跳过任何金丝雀升级步骤、分析等...），因为还没有发生升级。

~~~powershell
# kubectl get pods
NAME                             READY   STATUS    RESTARTS   AGE
rollouts-demo-687d76d795-2fwv6   1/1     Running   0          25s
rollouts-demo-687d76d795-2z7hn   1/1     Running   0          25s
rollouts-demo-687d76d795-8bgxd   1/1     Running   0          25s
rollouts-demo-687d76d795-lrg5z   1/1     Running   0          25s
rollouts-demo-687d76d795-vbqzj   1/1     Running   0          25s
~~~

Argo Rollouts 的 kubectl 插件允许我们可视化 Rollout 以及相关资源对象，并展示实时状态变化。

~~~powershell
使用kubectl-argo-rollouts get rollout rollouts-demo命令来查看部署状态
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

~~~powershell
可以看到该版本被标记为stable，而且STATUS为healthy。还可以在命令后面加一个--watch来实时监控服务状态，完整命令为kubectl argo rollouts get rollout rollouts-demo --watch,默认为1秒间隔。
~~~

~~~powershell
# kubectl apply -f service.yaml
service/rollouts-demo created
~~~

~~~powershell
# kubectl get svc
NAME            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
kubernetes      ClusterIP   10.96.0.1        <none>        443/TCP   4d13h
rollouts-demo   ClusterIP   10.109.198.110   <none>        80/TCP    5s
~~~

~~~powershell
# curl http://10.109.198.110
<!DOCTYPE html>
<html>
  <head>
    <title>Rollouts Demo</title>
    <link rel="stylesheet" href="style.css" type="text/css" />
  </head>
  <body>
    <div class="header spread">
        <img src="logo.png" class="logo" />
        <h1>ARGO ROLLOUTS <span class="orange">DEMO</span></h1>
        <div class="flex">
          <div class="button button--resize" id="resize">FIT</div>
        </div>
    </div>
    <div class="controls">
      <div class="control spread">
        <div>COLOR</div>
        <div class="colors" id="colors"></div>
      </div>
      <div class="control spread">
        <div class="button button--start">START</div>
        <div class="button button--stop">STOP</div>
      </div>
      <div class="control">
        <div class="control spread">
          <div>LATENCY</div>
          <div class="white" id="latency-label">0.0s</div>
        </div>
        <input type="range" min="0" max="5" value="0" class="slider" id="latency" step="0.1">
      </div>
      <div class="control">
        <div class="control spread">
          <div>ERROR</div>
          <div class="white" id="error-label">0.0s</div>
        </div>
        <input type="range" min="0" max="100" value="0" class="slider" id="error" step="1">
      </div>
    </div>
    <div id="grid" class="grid"></div>
    <div id="graph" class="graph"></div>
  </body>
  <script src="main.js"></script>
</html>
~~~

![image-20231213161519155](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213161519155.png)

### 4.2.2 更新应用

上面已经部署完成，接下来就需要执行更新了，和 Deployment 类似，对 Pod 模板字段的任何变更都会导致新的版本（即 ReplicaSet）被部署，更新 Rollout 通常是修改容器镜像的版本，然后执行 kubectl apply ，为了方便，rollouts 插件还单独提供了一个 set image 的命令，比如这里我们运行以下所示命令，用 yellow 版本的容器更新上面的 Rollout：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:yellow
rollout "rollouts-demo" image updated
~~~

在 rollout 更新期间，控制器将通过 Rollout 更新策略中定义的步骤进行。这个示例的 rollout 为金丝雀设置了 20% 的流量权重，并一直暂停 rollout，直到用户取消或促进发布。在更新镜像后，再次观察 rollout，直到它达到暂停状态。

当 demo rollout 到达第二步时，我们可以从插件中看到，Rollout 处于暂停状态，现在有 5 个副本中的 1 个运行新版本的 pod，其余 4 个仍然运行旧版本，这相当于 setWeight: 20 步骤所定义的 20%的金丝雀权重。

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

~~~powershell
说明：
可以看到多了一个revision:2，而且该版本被标记为canary，而且状态是Status: Paused，canary接入流量为20%。
~~~

**手动持续更新**

部署之所以处于`Paused`阶段，是因为我们在rollout.yaml中定义了发布第一个版本后会暂停，这时候需要手动接入接下来的更新。

argo rollouts提供了`promote`来进行后续的更新，命令如下：

~~~powershell
# kubectl argo rollouts promote rollouts-demo
rollout 'rollouts-demo' promoted
~~~

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ॥ Paused
Message:         CanaryPauseStep
Strategy:        Canary
  Step:          3/8
  SetWeight:     40
  ActualWeight:  40
Images:          argoproj/rollouts-demo:blue (stable)
                 argoproj/rollouts-demo:yellow (canary)
Replicas:
  Desired:       5
  Current:       5
  Updated:       2
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS     AGE    INFO
⟳ rollouts-demo                            Rollout     ॥ Paused   18m
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy  4m48s  canary
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running  4m48s  ready:1/1
│     └──□ rollouts-demo-6cf78c66c5-47b88  Pod         ✔ Running  16s    ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy  18m    stable
      ├──□ rollouts-demo-687d76d795-8bgxd  Pod         ✔ Running  18m    ready:1/1
      ├──□ rollouts-demo-687d76d795-lrg5z  Pod         ✔ Running  18m    ready:1/1
      └──□ rollouts-demo-687d76d795-vbqzj  Pod         ✔ Running  18m    ready:1/1
~~~

因为后续的更新在pause阶段只暂停10s，所以会依次自动更新完，不需要手动介入，待更新完后整体的状态如下：

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ✔ Healthy
Strategy:        Canary
  Step:          8/8
  SetWeight:     100
  ActualWeight:  100
Images:          argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       5
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS        AGE  INFO
⟳ rollouts-demo                            Rollout     ✔ Healthy     19m
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy     6m   stable
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running     6m   ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-47b88  Pod         ✔ Running     88s  ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qnlrt  Pod         ✔ Running     71s  ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qmdc9  Pod         ✔ Running     60s  ready:1/1
│     └──□ rollouts-demo-6cf78c66c5-kbcf7  Pod         ✔ Running     49s  ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  • ScaledDown  19m
~~~

可以看到第一个版本已经下线，第二个版本的状态为`Healthy`，而且镜像被标记为`stable`。

### 4.2.3 终止更新应用

如果在更新应用的过程中，最新的应用有问题，需要终止更新需要怎么做呢？

我们先使用下面命令发布新版本应用，如下：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:red
rollout "rollouts-demo" image updated
~~~

然后更新动作会在第一次更新的时候处于`Paused`状态，现在我们可以用`abort`来终止发布，如下：

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
Images:          argoproj/rollouts-demo:red (canary)
                 argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       1
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS        AGE    INFO
⟳ rollouts-demo                            Rollout     ॥ Paused      24m
├──# revision:3
│  └──⧉ rollouts-demo-5747959bdb           ReplicaSet  ✔ Healthy     42s    canary
│     └──□ rollouts-demo-5747959bdb-8nrqk  Pod         ✔ Running     42s    ready:1/1
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy     10m    stable
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running     10m    ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-47b88  Pod         ✔ Running     5m54s  ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qnlrt  Pod         ✔ Running     5m37s  ready:1/1
│     └──□ rollouts-demo-6cf78c66c5-qmdc9  Pod         ✔ Running     5m26s  ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  • ScaledDown  24m
~~~

~~~powershell
# kubectl argo rollouts abort rollouts-demo
rollout 'rollouts-demo' aborted
~~~

待执行完命令后，看到如下信息：

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

NAME                                       KIND        STATUS        AGE    INFO
⟳ rollouts-demo                            Rollout     ✖ Degraded    25m
├──# revision:3
│  └──⧉ rollouts-demo-5747959bdb           ReplicaSet  • ScaledDown  117s   canary
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy     11m    stable
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running     11m    ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-47b88  Pod         ✔ Running     7m9s   ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qnlrt  Pod         ✔ Running     6m52s  ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qmdc9  Pod         ✔ Running     6m41s  ready:1/1
│     └──□ rollouts-demo-6cf78c66c5-kfsvv  Pod         ✔ Running     19s    ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  • ScaledDown  25m
~~~

可以看到 stable 版本已经切换到 revision:2 这个 ReplicaSet 了。在更新过程中，无论何时，无论是通过失败的金丝雀分析自动中止，还是由用户手动中止，Rollout 都会退回到 stable 版本，最终应用会回退到稳定版本。

但是我们可以看到Status是`Degraded`状态而并非`Healthy`状态，我们有必须要将其变成`Healthy`状态。最简单的办法就是执行如下命令重新发布一下版本：

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:yellow
rollout "rollouts-demo" image updated
~~~

执行过后，可以看到其状态立即变成Healthy，并且没有创建新的副本、新的版本，如下：

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ✔ Healthy
Strategy:        Canary
  Step:          8/8
  SetWeight:     100
  ActualWeight:  100
Images:          argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       5
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS        AGE    INFO
⟳ rollouts-demo                            Rollout     ✔ Healthy     32m
├──# revision:4
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy     18m    stable
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running     18m    ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-47b88  Pod         ✔ Running     13m    ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qnlrt  Pod         ✔ Running     13m    ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qmdc9  Pod         ✔ Running     13m    ready:1/1
│     └──□ rollouts-demo-6cf78c66c5-kfsvv  Pod         ✔ Running     6m53s  ready:1/1
├──# revision:3
│  └──⧉ rollouts-demo-5747959bdb           ReplicaSet  • ScaledDown  8m31s
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  • ScaledDown  32m
~~~

当 Rollout 还没有达到预期状态（例如它被中止了，或者正在更新中），而稳定版本的资源清单被重新应用，Rollout 检测到这是一个回滚，而不是一个更新，并将通过跳过分析和步骤快速部署稳定的 ReplicaSet。

### 4.2.4 应用回退

有时候在应用上线过后，有些BUG并没有发现，这时候要回退怎么办呢？argo rollouts有一个`undo`命令，可以进行回退。

比如我们要将版本回退到第一个版本，则执行一下命令：

~~~powershell
# kubectl-argo-rollouts undo rollouts-demo --to-revision=1
INFO[0000] unknown field "spec.template.metadata.creationTimestamp"
rollout 'rollouts-demo' undo
~~~

然后通过命令可以看到如下信息：

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
Images:          argoproj/rollouts-demo:blue (canary)
                 argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       1
  Ready:         5
  Available:     5

NAME                                       KIND        STATUS        AGE  INFO
⟳ rollouts-demo                            Rollout     ॥ Paused      38m
├──# revision:5
│  └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy     38m  canary
│     └──□ rollouts-demo-687d76d795-r2z9d  Pod         ✔ Running     54s  ready:1/1
├──# revision:4
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy     24m  stable
│     ├──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ✔ Running     24m  ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-47b88  Pod         ✔ Running     19m  ready:1/1
│     ├──□ rollouts-demo-6cf78c66c5-qnlrt  Pod         ✔ Running     19m  ready:1/1
│     └──□ rollouts-demo-6cf78c66c5-qmdc9  Pod         ✔ Running     19m  ready:1/1
└──# revision:3
   └──⧉ rollouts-demo-5747959bdb           ReplicaSet  • ScaledDown  14m
~~~

首先revision为1的版本标记没有，重新创建了一个为5的标记，而且第一步处于暂停状态，然后我们执行`promote`命令继续后续的更新，如下：

~~~powershell
# kubectl argo rollouts promote rollouts-demo
rollout 'rollouts-demo' promoted
~~~

然后我们可以看到如下信息：

~~~powershell
# kubectl argo rollouts get rollout rollouts-demo
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

NAME                                       KIND        STATUS         AGE    INFO
⟳ rollouts-demo                            Rollout     ✔ Healthy      39m
├──# revision:5
│  └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy      39m    stable
│     ├──□ rollouts-demo-687d76d795-r2z9d  Pod         ✔ Running      2m45s  ready:1/1
│     ├──□ rollouts-demo-687d76d795-5r7zg  Pod         ✔ Running      38s    ready:1/1
│     ├──□ rollouts-demo-687d76d795-9m964  Pod         ✔ Running      26s    ready:1/1
│     ├──□ rollouts-demo-687d76d795-j4wqv  Pod         ✔ Running      15s    ready:1/1
│     └──□ rollouts-demo-687d76d795-kszvk  Pod         ✔ Running      4s     ready:1/1
├──# revision:4
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  • ScaledDown   26m
│     └──□ rollouts-demo-6cf78c66c5-4bznd  Pod         ◌ Terminating  26m    ready:1/1
└──# revision:3
   └──⧉ rollouts-demo-5747959bdb           ReplicaSet  • ScaledDown   16m
~~~

从`Images`可以看到回退到我们最初版本为`blue`的镜像了。

## 4.3 Traffic Shifting 流量接入

上面我们并没有接入外部流量，仅仅是在内部使用展示了金丝雀部署过程，下面我们接入外部流量进行测试。

Argo-Rollout主要集成了Ingress和ServiceMesh两种流量控制方法。

目前Ingress支持ALB和NGINX ingress。这里使用的是nginx ingress。

### 4.3.1 服务代理ingress nginx部署

#### 4.3.1.1  获取ingress nginx部署文件

![image-20231013094055365](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013094055365.png)

![image-20231013094123408](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013094123408.png)

![image-20231013094243973](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013094243973.png)

![image-20231013094322906](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013094322906.png)

![image-20231013094402166](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231013094402166.png)

~~~powershell
# mkdir tsdir
# cd tsdir/
~~~

~~~powershell
# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

#### 4.3.1.2 修改ingress nginx部署文件

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

#### 4.3.1.3 部署ingress nginx

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

### 4.3.2 获取应用YAML部署描述文件

>这个案例中包含1个rollout，2个service，1个ingress。

~~~powershell
# wget https://raw.githubusercontent.com/argoproj/argo-rollouts/master/docs/getting-started/nginx/rollout.yaml
~~~

~~~powershell
为了方便测试把setWeight: 5修改为setWeight: 50
# vim rollout.yaml
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
          # 该 Ingress 将被克隆并赋予一个新的名称，以实现NGINX流量分割。
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
        resources:
          requests:
            memory: 32Mi
            cpu: 5m
~~~

上面的资源清单中，我们定义了一个 rollouts-demo 的 Rollout 资源，它的 canaryService 和 stableService 分别引用了两个 Service 资源， stableIngress 引用了一个 Ingress 资源，steps 定义了金丝雀发布的步骤，这里我们定义了两个步骤，第一个步骤将权重设置为 50%，第二个步骤是暂停，这样就可以在第一个步骤中将 50% 的流量发送到金丝雀上，然后手动发布，最后在升级的剩余时间内逐渐自动增大流量。

其中 canary.trafficRouting.nginx.stableIngress 中引用的 Ingress 需要有一个 host 规则，该规则具有针对 canary.stableService 下引用的服务的后端。

对应的 Service 资源对象如下所示：

~~~powershell
# wget https://raw.githubusercontent.com/argoproj/argo-rollouts/master/docs/getting-started/nginx/services.yaml
~~~

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
    # This selector will be updated with the pod-template-hash of the canary ReplicaSet. e.g.:
    # rollouts-pod-template-hash: 7bf84f9696
    # 该 selector 将使用金丝雀 ReplicaSet 的 pod-template-hash 进行更新，例如： rollouts-pod-template-hash: 7bf84f9696

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
    # This selector will be updated with the pod-template-hash of the stable ReplicaSet. e.g.:
    # rollouts-pod-template-hash: 789746c88d
    # 该 selector 将使用稳定版的 ReplicaSet 的 pod-template-hash 进行更新，比如 rollouts-pod-template-hash: 789746c88d

~~~

从配置文件可以看出Rollout里分别用canaryService和stableService分别定义了该应用灰度的Service Name(rollouts-demo-canary)和当前版本的Service Name(rollouts-demo-stable)。而且rollouts-demo-canary 和 rollouts-demo-stable的service的内容是一样的。selector中暂时没有填上pod-template-hash，Argo-Rollout Controller会根据实际的ReplicaSet hash来修改该值。

最后还需要定义一个 Ingress 对象：

~~~powershell
# wget https://raw.githubusercontent.com/argoproj/argo-rollouts/master/docs/getting-started/nginx/ingress.yaml
~~~

~~~powershell
# vim ingress.yaml
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
            # Reference to a Service name, also specified in the Rollout spec.strategy.canary.stableService field
             # 引用服务名称，也在 Rollout spec.strategy.canary.stableService 字段中指定
            name: rollouts-demo-stable
            port:
              number: 80
~~~

### 4.3.3 部署应用

~~~powershell
# kubectl apply -f rollout.yaml
rollout.argoproj.io/rollouts-demo created
~~~

~~~powershell
# kubectl get rollout
NAME            DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
rollouts-demo   1         1         1            1           66s

# kubectl get pods
NAME                             READY   STATUS    RESTARTS   AGE
rollouts-demo-687d76d795-tc2tb   1/1     Running   0          42s
~~~

~~~powershell
# kubectl apply -f services.yaml
service/rollouts-demo-canary created
service/rollouts-demo-stable created
~~~

~~~powershell
# kubectl get service
NAME                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
kubernetes             ClusterIP   10.96.0.1        <none>        443/TCP   4d15h
rollouts-demo-canary   ClusterIP   10.97.224.171    <none>        80/TCP    94s
rollouts-demo-stable   ClusterIP   10.104.168.105   <none>        80/TCP    94s
~~~

~~~powershell
# kubectl apply -f ingress.yaml
ingress.networking.k8s.io/rollouts-demo-stable created
~~~

~~~powershell
# kubectl get ingress
NAME                                        CLASS   HOSTS             ADDRESS   PORTS   AGE
rollouts-demo-rollouts-demo-stable-canary   nginx   www.kubemsb.com             80      2m18s
rollouts-demo-stable                        nginx   www.kubemsb.com             80      2m18s
~~~

我们可以注意到新增了一个名为 rollouts-demo-rollouts-demo-stable-canary 的 Ingress 对象。这个对象是 canary ingress，它是 nginx.stableIngress 下引用的用户管理 Ingress 的克隆。 nginx ingress 控制器使用它来实现金丝雀流量分割。生成的入口的名称是使用 <ROLLOUT-NAME>-<INGRESS-NAME>-canary 制定的。

观察rollouts-demo-rollouts-demo-stable-canary的内容如下：

~~~powershell
# kubectl get ingress rollouts-demo-rollouts-demo-stable-canary -o yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "0"
  creationTimestamp: "2023-12-13T04:06:07Z"
  generation: 1
  name: rollouts-demo-rollouts-demo-stable-canary
  namespace: default
  ownerReferences:
  - apiVersion: argoproj.io/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Rollout
    name: rollouts-demo
    uid: 83f1e654-9a49-44a0-8997-3cc0232d60b9
  resourceVersion: "162283"
  uid: 8e46bd8c-7125-45c3-b463-f7e46e66ea64
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
status:
  loadBalancer:
    ingress:
    - ip: 192.168.10.240
~~~

### 4.3.4 访问应用

![image-20231213121005824](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213121005824.png)

通过域名访问，可以看到如下界面。

![image-20231213121328821](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213121328821.png)

### 4.3.5 更新应用

现在通过以下命令来进行应用更新操作。

~~~powershell
# kubectl argo rollouts set image rollouts-demo rollouts-demo=argoproj/rollouts-demo:yellow
~~~

然后通过状态窗口可以看到如下信息

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

然后可以看到rollouts-demo-rollouts-demo-stable-canary的ingress的annotations中新增了两个参数，如下：

~~~powershell
# kubectl get ingress rollouts-demo-rollouts-demo-stable-canary -o yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "50"
  creationTimestamp: "2023-12-13T04:06:07Z"
  generation: 1
  name: rollouts-demo-rollouts-demo-stable-canary
  namespace: default
  ownerReferences:
  - apiVersion: argoproj.io/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Rollout
    name: rollouts-demo
    uid: 83f1e654-9a49-44a0-8997-3cc0232d60b9
  resourceVersion: "164235"
  uid: 8e46bd8c-7125-45c3-b463-f7e46e66ea64
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
status:
  loadBalancer:
    ingress:
    - ip: 192.168.10.240
~~~

我们发现它比原始 Ingress 有以下变化：

- 注解中添加了两个额外的 NGINX 特定金丝雀注解。
- Ingress 规则将有一条将后端指向金丝雀服务的规则。

随着 Rollout 逐步进行，canary-weight 注解将调整以匹配步骤的当前 setWeight。NGINX Ingress 控制器检查原始 Ingress、金丝雀 Ingress 和金丝雀权重注解，以确定在两个入口之间分配的流量百分比。

然后通过网页，可以看到如下的输出展示:

![image-20231213122013400](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213122013400.png)

然后可以通过验证结果来判断是否继续还是终止。

如果继续使用如下命令，可以执行 promote 命令来将 Rollout 推进到下一个步骤，这样就完成了金丝雀发布：

~~~powershell
# kubectl argo rollouts promote rollouts-demo
rollout 'rollouts-demo' promoted
~~~

~~~powershell
#  kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ✔ Healthy
Strategy:        Canary
  Step:          2/2
  SetWeight:     100
  ActualWeight:  100
Images:          argoproj/rollouts-demo:blue
                 argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       1
  Current:       2
  Updated:       1
  Ready:         2
  Available:     2

NAME                                       KIND        STATUS     AGE    INFO
⟳ rollouts-demo                            Rollout     ✔ Healthy  16m
├──# revision:2
│  └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy  3m43s  stable
│     └──□ rollouts-demo-6cf78c66c5-55tgf  Pod         ✔ Running  3m43s  ready:1/1
└──# revision:1
   └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy  16m    delay:9s
      └──□ rollouts-demo-687d76d795-tc2tb  Pod         ✔ Running  16m    ready:1/1
~~~

![image-20231213122254495](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213122254495.png)

如果终止使用如下命令：

~~~powershell
# kubectl-argo-rollouts undo rollouts-demo --to-revision=1
INFO[0000] unknown field "spec.template.metadata.creationTimestamp"
rollout 'rollouts-demo' undo
~~~

~~~powershell
#  kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ॥ Paused
Message:         CanaryPauseStep
Strategy:        Canary
  Step:          1/2
  SetWeight:     50
  ActualWeight:  50
Images:          argoproj/rollouts-demo:blue (canary)
                 argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       1
  Current:       2
  Updated:       1
  Ready:         2
  Available:     2

NAME                                       KIND        STATUS     AGE   INFO
⟳ rollouts-demo                            Rollout     ॥ Paused   18m
├──# revision:3
│  └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy  17m   canary
│     └──□ rollouts-demo-687d76d795-v6fwb  Pod         ✔ Running  13s   ready:1/1
└──# revision:2
   └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy  5m1s  stable
      └──□ rollouts-demo-6cf78c66c5-55tgf  Pod         ✔ Running  5m1s  ready:1/1
~~~

![image-20231213122645853](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213122645853.png)

~~~powershell
# kubectl argo rollouts abort rollouts-demo
~~~

~~~powershell
#  kubectl argo rollouts get rollout rollouts-demo
Name:            rollouts-demo
Namespace:       default
Status:          ✖ Degraded
Message:         RolloutAborted: Rollout aborted update to revision 3
Strategy:        Canary
  Step:          0/2
  SetWeight:     0
  ActualWeight:  0
Images:          argoproj/rollouts-demo:blue (canary)
                 argoproj/rollouts-demo:yellow (stable)
Replicas:
  Desired:       1
  Current:       2
  Updated:       1
  Ready:         2
  Available:     2

NAME                                       KIND        STATUS      AGE    INFO
⟳ rollouts-demo                            Rollout     ✖ Degraded  22m
├──# revision:3
│  └──⧉ rollouts-demo-687d76d795           ReplicaSet  ✔ Healthy   21m    canary,delay:24s
│     └──□ rollouts-demo-687d76d795-v6fwb  Pod         ✔ Running   4m34s  ready:1/1
└──# revision:2
   └──⧉ rollouts-demo-6cf78c66c5           ReplicaSet  ✔ Healthy   9m22s  stable
      └──□ rollouts-demo-6cf78c66c5-55tgf  Pod         ✔ Running   9m22s  ready:1/1
~~~

![image-20231213122902403](/云原生/k8s-course/k8s-course-16-如何使用argo-rollouts实现金丝雀发布/image-20231213122902403.png)

