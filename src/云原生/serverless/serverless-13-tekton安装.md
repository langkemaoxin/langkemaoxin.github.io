---
title: Tekton安装
sidebarGroup: Serverless
shortTitle: 13 Tekton安装
order: 13
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Tekton安装 一、Tekton简介 1.1 Tekton是什么？ Tekton 是用于构建 CI/CD 管道的云原生解决方案。 Tekton 在 Kubernetes 集群上作为扩展安装和运行，并...
---

> **Serverless · 第 13 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Tekton安装

# 一、Tekton简介

## 1.1 Tekton是什么？

Tekton 是用于构建 CI/CD 管道的云原生解决方案。

Tekton 在 Kubernetes 集群上作为扩展安装和运行，并包含一组 Kubernetes 自定义资源，安装后，Tekton Pipelines 可通过 Kubernetes CLI (kubectl) 和 API 调用使用，就像 Pod 和其他资源一样。

## 1.2 谁使用Tekton

- 平台运维工程师
- 开发人员

## 1.3 使用Tekton好处

Tekton 为 CI/CD 系统的构建者和用户提供以下好处：

- 可定制
- 可重复使用的
- 可扩展
- 标准化

## 1.4 Tekton 的组成部分

Tekton 由以下组件组成：

- **[Tekton Pipelines](https://github.com/tektoncd/pipeline/blob/main/docs/README.md)**是**[Tekton](https://github.com/tektoncd/pipeline/blob/main/docs/README.md)**的基础。它定义了一组 Kubernetes[自定义资源](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) ，用作构建块，您可以从中组装 CI/CD 管道。
- **[Tekton Triggers](https://github.com/tektoncd/triggers/blob/main/README.md)**允许您根据事件实例化管道。例如，您可以在每次将 PR 合并到 GitHub 存储库时触发管道的实例化和执行。您还可以构建启动特定 Tekton 触发器的用户界面。
- **[Tekton CLI](https://github.com/tektoncd/cli/blob/main/README.md)**提供了一个名为 的命令行界面`tkn`，它构建在 Kubernetes CLI 之上，允许您与 Tekton 进行交互。
- **[Tekton Dashboard](https://github.com/tektoncd/dashboard/blob/main/README.md)**是 Tekton Pipelines 的基于 Web 的图形界面，可显示有关管道执行的信息。目前这是一项正在进行的工作。
- **[Tekton Catalog](https://github.com/tektoncd/catalog/blob/v1beta1/README.md)**是一个由社区贡献的高质量 Tekton 构建块的存储库 -`Tasks`、`Pipelines`，等等 - 可以在您自己的管道中使用。
- **[Tekton Hub](https://github.com/tektoncd/hub/blob/main/README.md)**是一个基于 Web 的图形界面，用于访问 Tekton Catalog。
- **[Tekton Operator](https://github.com/tektoncd/operator/blob/main/README.md)**是一种 Kubernetes[ Operator 模式](https://operatorhub.io/what-is-an-operator) ，允许您在 Kubernetes 集群上安装、更新和删除 Tekton 项目。

## 1.5 Tekton配合哪些工具使用

要安装 Tekton，您需要一个 Kubernetes 集群，安装后，您可以使用以下方法之一与 Tekton 交互：

- **[tkn CLI](https://github.com/tektoncd/cli/blob/main/README.md)**，也称为 Tekton CLI，是与 Tekton 交互的首选命令行方法。`tkn`提供快速和简化的体验，包括高级命令和颜色编码。要使用它，您只需要熟悉Tekton。
- **[kubectl CLI](https://kubernetes.io/docs/reference/kubectl/overview/)**，也称为 Kubernetes CLI，以更高的复杂性为代价，为控制 Tekton 提供了更多的粒度。通过 kubectl 与 Tekton 交互通常保留用于调试管道和排除构建故障。
- **[Tekton API](https://kubernetes.io/docs/tasks/access-kubernetes-api/custom-resources/custom-resource-definitions/)**目前可用于[Pipelines](https://pkg.go.dev/github.com/tektoncd/pipeline/pkg/apis/pipeline/v1beta1?tab=doc)和 [Triggers](https://pkg.go.dev/github.com/tektoncd/triggers@v0.5.0/pkg/apis/triggers/v1alpha1?tab=doc)，允许您以编程方式与 Tekton 组件进行交互。这通常是为高度定制的 CI/CD 系统保留的。在大多数情况下，`tkn`和`kubectl`有控制的Tekton的优选的方法。

>请注意，从 Tekton 0.30 版本开始，您需要拥有**Kubernetes 版本 1.20 或更高版本**的集群。

## 1.6 Tekton核心概念

Tekton 主要由如下五个核心概念组成：

- Task
- TaskRun
- Pipeline
- PipelineRun
- PipelineResource
  这五个概念每一个都是以 CRD 的形式提供服务的，

### 1.6.1 Task

Task 就是一个任务执行模板，之所以说 Task 是一个模板是因为 Task 定义中可以包含变量，Task 在真正执行的时候需要给定变量的具体值。

Tekton 的 Task 很类似于一个函数的定义，Task 通过 inputs.params 定义需要哪些入参，并且每一个入参还可以指定默认值。

Task 的 steps 字段表示当前 Task 是有哪些子步骤组成的。每一个步骤具体就是一个镜像的执行，镜像的启动参数可以通过 Task 的入参使用模板语法进行配置。

**举例：**

~~~powershell
apiVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: task-with-parameters
spec:
  inputs:
    params:
      - name: flags
        type: array
      - name: someURL
        type: string
  steps:
    - name: build
      image: registry.cn-hangzhou.aliyuncs.com/knative-sample/alpine:3.9
      command: ["sh", "-c"]
      args: [ "echo ${inputs.params.flags} ; echo ${someURL}"]
~~~

### 1.6.2 TaskRun

Task 定义好以后是不能执行的，就像一个函数定义好以后需要调用才能执行一样。所以需要再定义一个 TaskRun 去执行 Task。TaskRun 主要是负责设置 Task 需要的参数，并通过 taskRef 字段引用要执行的 Task。

**举例：**

~~~powershell
apiVersion: tekton.dev/v1alpha1
kind: TaskRun
metadata:
  name: run-with-parameters
spec:
  taskRef:
    name: task-with-parameters
  inputs:
    params:
      - name: flags
        value: "--set"
      - name: someURL
        value: "https://github.com/knative-sample"
~~~

### 1.6.3 Pipeline

一个 TaskRun 只能执行一个 Task，当需要编排多个 Task 的时候就需要 Pipeline 出马了。Pipeline 是一个编排 Task 的模板。Pipeline 的 params 声明了执行时需要的入参。 Pipeline 的 spec.tasks 定义了需要编排的 Task。Tasks 是一个数组，数组中的 task 并不是通过数组声明的顺序去执行的，而是通过 runAfter 来声明 task 执行的顺序。Tekton controller 在解析 CRD 的时候会解析 Task 的顺序，然后依据设定的顺序依次去执行。Pipeline 在编排 Task 的时候需要给每一个 Task 传入必须的参数，这些参数的值可以来自 Pipeline 自身的 params。

**举例：**

~~~powershell
apiVersion: tekton.dev/v1alpha1
kind: Pipeline
metadata:
  name: pipeline-with-parameters
spec:
  params:
    - name: context
      type: string
      description: Path to context
      default: /some/where/or/other
  tasks:
    - name: task-1
      taskRef:
        name: build
      params:
        - name: pathToDockerFile
          value: Dockerfile
        - name: pathToContext
          value: "${params.context}"
    - name: task-2
      taskRef:
        name: build-push
      runAfter:
        - source-to-image
      params:
        - name: pathToDockerFile
          value: Dockerfile
        - name: pathToContext
          value: "${params.context}"
~~~

### 1.6.4 PipelineRun

和 Task 一样 Pipeline 定义完成以后也是不能直接执行的，需要 PipelineRun 才能执行 Pipeline。PipelineRun 的主要作用是给 Pipeline 设定必要的入参，并执行 Pipeline。

**举例：**

~~~powershell
apiVersion: tekton.dev/v1alpha1
kind: PipelineRun
metadata:
  name: pipelinerun-with-parameters
spec:
  pipelineRef:
    name: pipeline-with-parameters
  params:
    - name: "context"
      value: "/workspace/examples/microservices/leeroy-web"
~~~

### 1.6.5 PipelineResource

前面已经介绍了 Tekton 的四个核心概念。现在我们已经知道怎么定义 task、执行 task 以及编排 task 了。但可能你还想在 Task 之间共享资源，这就是 PipelineResource 的作用。比如我们可以把 git 仓库信息放在 PipelineResource 中。这样所有 Pipeline 就可以共享这份数据了。

**举例：**

~~~powershell
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: kubemsb-git
  namespace: default
spec:
  type: git
  params:
    - name: url
      value: https://github.com/kubemsb/kubemsb.git
    - name: revision
      value: master
~~~

## 1.7 授权信息

git 仓库、镜像仓库这些都是需要鉴权才能使用的。所以还需要一种设定鉴权信息的机制。Tekton 本身是 Kubernetes 原生的编排系统。所以可以直接使用 Kubernetes 的 ServiceAccount 机制实现鉴权。
案例：

- 定义一个保存镜像仓库鉴权信息的 secret

**举例：**

~~~powershell
apiVersion: v1
kind: Secret
metadata:
  name: ack-cr-push-secret
  annotations:
    tekton.dev/docker-0: https://registry.cn-hangzhou.aliyuncs.com
type: kubernetes.io/basic-auth
stringData:
  username: <cleartext non-encoded>
  password: <cleartext non-encoded>
~~~

- 定义 ServiceAccount ，并且使用上面的 secret

**举例：**

~~~powershell
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pipeline-account
secrets:
- name: ack-cr-push-secret
~~~

- PipelineRun 中引用 ServiceAccount

**举例：**

~~~powershell
apiVersion: tekton.dev/v1alpha1
kind: PipelineRun
metadata:
  generateName: tekton-kn-sample-
spec:
  pipelineRef:
    name: build-and-deploy-pipeline
... ...
  serviceAccount: pipeline-account
~~~

# 二、Tekton安装

## 2.1 安装参考链接

网址：https://tekton.dev/docs/pipelines/install/#installing-tekton-pipelines-on-kubernetes

## 2.2 在K8S集群中安装Tekton

~~~powershell
# pwd
/root/tekton
# wget https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
~~~

~~~powershell
# kubectl apply -f release.yaml
~~~

~~~powershell
输出
namespace/tekton-pipelines created
Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
podsecuritypolicy.policy/tekton-pipelines created
clusterrole.rbac.authorization.k8s.io/tekton-pipelines-controller-cluster-access created
clusterrole.rbac.authorization.k8s.io/tekton-pipelines-controller-tenant-access created
clusterrole.rbac.authorization.k8s.io/tekton-pipelines-webhook-cluster-access created
role.rbac.authorization.k8s.io/tekton-pipelines-controller created
role.rbac.authorization.k8s.io/tekton-pipelines-webhook created
role.rbac.authorization.k8s.io/tekton-pipelines-leader-election created
role.rbac.authorization.k8s.io/tekton-pipelines-info created
serviceaccount/tekton-pipelines-controller created
serviceaccount/tekton-pipelines-webhook created
clusterrolebinding.rbac.authorization.k8s.io/tekton-pipelines-controller-cluster-access created
clusterrolebinding.rbac.authorization.k8s.io/tekton-pipelines-controller-tenant-access created
clusterrolebinding.rbac.authorization.k8s.io/tekton-pipelines-webhook-cluster-access created
rolebinding.rbac.authorization.k8s.io/tekton-pipelines-controller created
rolebinding.rbac.authorization.k8s.io/tekton-pipelines-webhook created
rolebinding.rbac.authorization.k8s.io/tekton-pipelines-controller-leaderelection created
rolebinding.rbac.authorization.k8s.io/tekton-pipelines-webhook-leaderelection created
rolebinding.rbac.authorization.k8s.io/tekton-pipelines-info created
customresourcedefinition.apiextensions.k8s.io/clustertasks.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/conditions.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/pipelines.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/pipelineruns.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/pipelineresources.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/runs.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/tasks.tekton.dev created
customresourcedefinition.apiextensions.k8s.io/taskruns.tekton.dev created
secret/webhook-certs created
validatingwebhookconfiguration.admissionregistration.k8s.io/validation.webhook.pipeline.tekton.dev created
mutatingwebhookconfiguration.admissionregistration.k8s.io/webhook.pipeline.tekton.dev created
validatingwebhookconfiguration.admissionregistration.k8s.io/config.webhook.pipeline.tekton.dev created
clusterrole.rbac.authorization.k8s.io/tekton-aggregate-edit created
clusterrole.rbac.authorization.k8s.io/tekton-aggregate-view created
configmap/config-artifact-bucket created
configmap/config-artifact-pvc created
configmap/config-defaults created
configmap/feature-flags created
configmap/pipelines-info created
configmap/config-leader-election created
configmap/config-logging created
configmap/config-observability created
configmap/config-registry-cert created
deployment.apps/tekton-pipelines-controller created
service/tekton-pipelines-controller created
Warning: autoscaling/v2beta1 HorizontalPodAutoscaler is deprecated in v1.22+, unavailable in v1.25+; use autoscaling/v2beta2 HorizontalPodAutoscaler
horizontalpodautoscaler.autoscaling/tekton-pipelines-webhook created
deployment.apps/tekton-pipelines-webhook created
service/tekton-pipelines-webhook created
~~~

~~~powershell
#  kubectl get pods  -n tekton-pipelines
NAME                                          READY   STATUS    RESTARTS   AGE
tekton-pipelines-controller-8bbf64474-qm4fj   1/1     Running   0          109s
tekton-pipelines-webhook-594bb5fc88-6n4wf     1/1     Running   0          109s
~~~

