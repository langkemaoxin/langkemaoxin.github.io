---
title: kubernetes 2024-03 更新 Kubernetes面试题
sidebarGroup: 扩展专题
shortTitle: 10 kubernetes 2024-03 更新 Ku
order: 10
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 面试
  - 云原生
  - 课程笔记
description: '2024-03 更新 Kubernetes面试题 1、在一台 Ubuntu 服务器上安装并设置一个基本的单节点 Kubernetes 集群(使用minikube 或kubeadm)。 a.更新系统包:...'
---

> **面试 · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 2024-03 更新 Kubernetes面试题

## 1、在一台 Ubuntu 服务器上安装并设置一个基本的单节点 Kubernetes 集群(使用minikube 或kubeadm)。

a.更新系统包:使用 apt命令更新系统包，以确保您的系统拥有最新的安全和软件更新。

b.安装和设置 Docker:Kubernetes将使用 Docker作为其容器运行时环境，所以需要在系统上安装 Docker。

c.安装 Kubernetes:这一步可以根据您选择的方式有所不同。如果使用kubeadm，你需要安装 kubelet、kubeadm 和 kubectl。如果使用 minikube，你只需要安装 minikube。

d.初始化 Kubernetes Master 节点:如果你使用的是 kubeadm，那么需要使用 kubeadm init 命令初始化 Master 节点。

e.配置 kubectl:在初始化 Master 节点后，需要配置 kubectl 以便可以从任何用户在任何位置都可以正确访问 Kubernetes 集群。

f.安装网络插件:例如Calico、Flannel等。如果你使用的是 minikube，它会自动处理这个步骤。

g.验证安装:使用 kubectl get nodes 或 kubectl cluster-info 命令验证安装是否成功。

## 2、编写一个 Kubernetes Deployment YAML 文件，用于部署一个 Nginx 应用，副本数量设置为3

~~~powershell
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
~~~

~~~powershell
这个文件定义了一个名为nginx-deployment的部署，它将确保运行三个副本的Nginx容器。每个副本都使用nginx:latest镜像，暴露端口80。

要使用此YAML文件部署Nginx应用，你需要将此内容保存到一个文件中，例如nginx-deployment.yaml，然后使用kubectl apply -f nginx-deployment.yaml命令应用到你的Kubernetes集群中。
~~~

## 3、编写一个 Kubernetes Service YAML 文件，以暴露这个 Nginx 应用在 30080端口

~~~powershell
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort
  ports:
    - port: 80
      nodePort: 30080
      protocol: TCP
  selector:
    app: nginx
~~~

~~~powershell
在这个文件中，我们定义了一个名为nginx-service的服务，它将会选择标签为app: nginx的Pods（即之前创建的Nginx Pods）。这个服务配置为NodePort类型，这意味着你可以通过集群中任何节点的IP地址以及指定的nodePort（在这个案例中是30080）来访问Nginx应用。

请注意，由于NodePort类型服务会占用节点上的端口，因此确保30080端口在集群的所有节点上都是可用的。

要应用这个YAML文件，你需要保存到一个文件中，例如命名为nginx-service.yaml，然后使用kubectl apply -f nginx-service.yaml命令将其部署到你的Kubernetes集群。这将允许你通过访问任一节点的30080端口来访问Nginx服务。
~~~

## 4、修改之前创建的 Nginx Deployment 的 YAML 文件，使得 Nginx 容器可以读取这个 ConfigMap 的值，并将其作为环境变量

### Step 1: 创建 ConfigMap YAML 文件

首先创建一个名为 `nginx-configmap.yaml` 的文件，内容如下：

~~~powershell
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  MY_VAR: "Hello World"
~~~

>这个 ConfigMap 命名为 `nginx-config`，并且包含一个键值对 `MY_VAR: "Hello World"`。

### Step 2: 应用 ConfigMap

~~~powershell
使用 kubectl apply -f nginx-configmap.yaml 命令来创建 ConfigMap
~~~

### Step 3: 修改 Nginx Deployment

接下来，修改 Nginx Deployment 的 YAML 文件，以使 Nginx 容器可以读取这个 ConfigMap 的值，并将其作为环境变量。修改后的 Deployment 文件如下所示：

~~~powershell
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        env:
        - name: MY_VAR
          valueFrom:
            configMapKeyRef:
              name: nginx-config  # ConfigMap 的名称
              key: MY_VAR         # 要获取的键
~~~

>在这个修改后的 Deployment 文件中，我们在 Nginx 容器的定义下添加了 `env` 部分，该部分指定了环境变量 `MY_VAR` 应该从名为 `nginx-config` 的 ConfigMap 中获取其值。

### Step 4: 应用修改后的 Deployment

保存修改后的 Deployment 文件，并使用 `kubectl apply -f <your-deployment-file.yaml>` 命令来更新你的 Deployment。这样做将重新部署 Nginx 容器，此时容器内将可以访问名为 `MY_VAR` 的环境变量，其值为 "Hello World"。

## 5、使用 kubectl apply 命令创建这个 Service，并通过 minikube service 或者其他方式测试服务是否可以正常访问。

### 步骤 1: 创建 Service

首先，确保你已经根据之前的指示创建了 Service 的 YAML 文件（例如`nginx-service.yaml`）。然后，打开终端或命令行界面，运行以下命令来创建 Service：

~~~powershell
kubectl apply -f nginx-service.yaml
~~~

>这个命令将根据你的 YAML 文件定义来创建 Service。

### 步骤2: 验证服务

如果一切顺利，你的浏览器应该会打开一个页面，显示 Nginx 的默认欢迎页面。这表明你的 Nginx 应用已经成功通过 Kubernetes Service 暴露，并且可以正常访问。

## 6、编写一个 Kubernetes Horizontal Pod Autoscaler(HPA)的 YAML 文件，根据CPU 使用率自动扩展 Nginx应用的副本数量。CPU使用率阈值设定为50%，最小副本数为 1，最大副本数为 10。然后使用 kubectl apply 命令创建这个 HPA。

要创建一个 Kubernetes Horizontal Pod Autoscaler (HPA) 来根据 CPU 使用率自动扩展你的 Nginx 应用的副本数量，你需要确保你的 Nginx Deployment 已经设置了资源请求。这是因为 HPA 需要基于资源（如 CPU 和内存）的使用率来进行扩展决策，而这些使用率是相对于 Pod 的资源请求来计算的。

首先，确保你的 Nginx Deployment 包括 CPU 请求量的定义。如果还未定义，你需要更新你的 Deployment，为 Nginx 容器添加资源请求。以下是更新后的 Nginx Deployment 示例，包括 CPU 请求设置：

~~~powershell
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          requests:
            cpu: "100m" # 请求 100 millicpu
        ports:
        - containerPort: 80
~~~

接下来，创建 HPA 的 YAML 文件。这个文件将定义 HPA 的参数，包括最小和最大副本数，以及 CPU 使用率的阈值。

### HPA YAML 文件示例

保存下面的内容到一个文件中，例如 `nginx-hpa.yaml`：

~~~powershell
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
~~~

这个定义创建了一个名为 `nginx-hpa` 的 HPA，它针对名为 `nginx-deployment` 的 Deployment。它将在 CPU 使用率达到 50% 时自动扩展副本数。最小副本数为 1，最大副本数为 10。

### 应用 HPA

在你定义了 HPA 文件之后，使用 `kubectl apply` 命令来创建 HPA：

~~~powershell
kubectl apply -f nginx-hpa.yaml
~~~

这条命令会在你的 Kubernetes 集群中创建 HPA，根据定义的规则自动调整 Nginx 应用的副本数量。

### 验证 HPA

创建 HPA 之后，你可以使用以下命令来查看 HPA 的状态和活动：

~~~powershell
kubectl get hpa
~~~

这将列出所有的 HPA，包括 `nginx-hpa`，并显示其当前状态，例如当前的副本数、目标 CPU 使用率以及当前的 CPU 使用率。这有助于你监控自动扩展是如何根据负载变化进行工作的。

